/**
 * A fault-injecting wrapper around any `AutosaveStore`, for tests. It stands in for the
 * environment (a full disk, a wedged database, a lost connection, a newer deploy), never for the
 * code under test: every call that is not faulted goes to the real store underneath.
 * @module testing
 */

import {
    autosaveAbortError,
    type AutosaveCommitOptions,
    type AutosaveEntryMeta,
    type AutosaveParts,
    type AutosaveStore,
    type AutosaveWrite,
} from "../autosave/types";

/** A commit stopped by {@link FaultAutosaveStore.hold} until the test releases it. */
export interface HeldCommit {
    /** Resolves once a commit has arrived and is waiting. */
    readonly reached: Promise<readonly AutosaveWrite[]>;
    /** Lets the waiting commit go on to the real store, which judges its fence then. */
    release(): void;
}

/** An `AutosaveStore` whose faults a test switches on. */
export interface FaultAutosaveStore extends AutosaveStore {
    /** The next `times` commits reject with `QuotaExceededError` and write nothing. */
    quota(times?: number): void;
    /** Every call rejects with `UnknownError` (the storage process died) until {@link heal}. */
    loseConnection(): void;
    /** Ends {@link loseConnection} and {@link stall}. */
    heal(): void;
    /** Commits never settle until their signal aborts them; nothing is written. */
    stall(): void;
    /** A commit carrying a non-null `data` part aborts with `AbortError` and writes nothing. */
    abortDataWrites(on?: boolean): void;
    /** `read()` returns this part of this entry cut in half. */
    corruptPart(id: string, part: string): void;
    /** `list()` and `read()` report this entry's `formatVersion` as given. */
    newerFormat(id: string, formatVersion: number): void;
    /** The next commit waits until released. */
    hold(): HeldCommit;
    /** Closes the real store's connection, if it has one. */
    close(): Promise<void>;
    /** Commits the real store accepted. */
    readonly commits: number;
    /** Every commit call, faulted or not. */
    readonly commitCalls: number;
}

function unknownError(): DOMException {
    return new DOMException(
        "Connection to Indexed Database server lost. Refresh the page to try again",
        "UnknownError",
    );
}

/**
 * Wraps a store with switchable faults.
 * @param inner - the real store every unfaulted call reaches
 * @returns the wrapper
 */
export function faultAutosaveStore(inner: AutosaveStore): FaultAutosaveStore {
    let quotaLeft = 0;
    let connectionLost = false;
    let stalled = false;
    let abortData = false;
    const corrupt = new Set<string>();
    const formats = new Map<string, number>();
    let held: { arrived: (w: readonly AutosaveWrite[]) => void; gate: Promise<void> } | null = null;
    let commits = 0;
    let commitCalls = 0;

    const withFormat = (meta: AutosaveEntryMeta): AutosaveEntryMeta => {
        const formatVersion = formats.get(meta.id);
        return formatVersion === undefined ? meta : { ...meta, formatVersion };
    };

    const live = (): Promise<void> => (connectionLost ? Promise.reject(unknownError()) : Promise.resolve());

    async function commit(writes: readonly AutosaveWrite[], options?: AutosaveCommitOptions): Promise<void> {
        commitCalls += 1;
        if (held !== null) {
            const { arrived, gate } = held;
            held = null;
            arrived(writes);
            await gate;
        }
        await live();
        if (quotaLeft > 0) {
            quotaLeft -= 1;
            throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        }
        if (abortData && writes.some((w) => typeof w.parts.data === "string" || w.parts.data instanceof Uint8Array)) {
            throw autosaveAbortError();
        }
        if (stalled) {
            await new Promise<never>((_, reject) => {
                const signal = options?.signal;
                if (signal?.aborted === true) {
                    reject(autosaveAbortError());
                }
                signal?.addEventListener("abort", () => {
                    reject(autosaveAbortError());
                });
            });
        }
        await inner.commit(writes, options);
        commits += 1;
    }

    return {
        async list(key: string): Promise<readonly AutosaveEntryMeta[]> {
            await live();
            return (await inner.list(key)).map(withFormat);
        },
        async read(id: string): Promise<{ meta: AutosaveEntryMeta; parts: AutosaveParts } | undefined> {
            await live();
            const entry = await inner.read(id);
            if (entry === undefined) {
                return undefined;
            }
            const parts: Record<string, string | Uint8Array> = { ...entry.parts };
            for (const [name, value] of Object.entries(parts)) {
                if (corrupt.has(`${id}\u0000${name}`)) {
                    parts[name] = value.slice(0, Math.floor(value.length / 2));
                }
            }
            return { meta: withFormat(entry.meta), parts };
        },
        commit,
        async remove(id: string): Promise<void> {
            await live();
            await inner.remove(id);
        },
        async close(): Promise<void> {
            await inner.close?.();
        },
        quota(times = 1): void {
            quotaLeft = times;
        },
        loseConnection(): void {
            connectionLost = true;
        },
        heal(): void {
            connectionLost = false;
            stalled = false;
        },
        stall(): void {
            stalled = true;
        },
        abortDataWrites(on = true): void {
            abortData = on;
        },
        corruptPart(id: string, part: string): void {
            corrupt.add(`${id}\u0000${part}`);
        },
        newerFormat(id: string, formatVersion: number): void {
            formats.set(id, formatVersion);
        },
        hold(): HeldCommit {
            let release!: () => void;
            let arrived!: (w: readonly AutosaveWrite[]) => void;
            const gate = new Promise<void>((resolve) => {
                release = resolve;
            });
            const reached = new Promise<readonly AutosaveWrite[]>((resolve) => {
                arrived = resolve;
            });
            held = { arrived, gate };
            return { reached, release };
        },
        get commits(): number {
            return commits;
        },
        get commitCalls(): number {
            return commitCalls;
        },
    };
}
