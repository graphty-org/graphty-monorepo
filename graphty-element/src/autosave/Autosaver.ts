/**
 * The autosave writer: it keeps one entry per session in an `AutosaveStore`, written from the
 * session's committed changes.
 *
 * - **Parts.** A change marks the parts it touched unwritten (`parts.ts`); a write carries only
 *   those. A part a write carried is written only once the store's commit completed: a write that
 *   fails puts every part it carried back.
 * - **Schedule.** While visible, a 500 ms trailing debounce, at most 2000 ms after the first
 *   unwritten change. A write that carries the `data` part waits for an idle moment, at most
 *   `dataMaxWaitMs`; other changes join it. A finished run is written at once, and so is
 *   everything when `flush()` is called. One write at a time.
 * - **Boundaries.** When the project is about to be replaced, what this entry has not committed is
 *   built at once and written, and the entry is marked `ended: "replaced"` in the same commit as
 *   the new entry's first write, so a kill in between leaves the old entry restorable.
 * - **Fencing.** Every write states the generation it expects. A write the store rejects because
 *   another writer committed to the entry moves this session to a new entry holding all of it.
 * - **Failures** become `status.problem` codes; the work stays in memory and the next change
 *   tries again.
 * @module autosave
 */

import type { RunId } from "../catalog/types";
import { isGraphtyError } from "../errors/GraphtyError";
import { dispatcherOf } from "../session/GraphSession";
import { onProjectBoundary } from "../session/project/boundary";
import { ENGINE_VERSIONS } from "../session/runs";
import type { CodedFact } from "../session/shared";
import type { GraphSession, ProjectSlice } from "../session/types";
import { buildParts, EVERY_PART, type PartTag, PartTooLarge } from "./parts";
import {
    type AutosaveCode,
    type AutosaveEntryMeta,
    type AutosaveStatus,
    type AutosaveStore,
    type AutosaveWrite,
    isAutosaveConflict,
} from "./types";

/** The entry format this code writes. */
export const AUTOSAVE_FORMAT_VERSION = 1;

/** How long a write may go without completing or failing before it is aborted. */
export const WATCHDOG_MS = 10_000;

/** Time, timers and idle callbacks: the real ones, or a test's. */
export interface AutosaveClock {
    /** Milliseconds since the epoch. */
    now(): number;
    /**
     * Call `fn` once after `ms`.
     * @returns Cancels it.
     */
    setTimer(fn: () => void, ms: number): () => void;
    /**
     * Call `fn` once when the page is idle, or after `timeoutMs` at the latest.
     * @returns Cancels it.
     */
    idle(fn: () => void, timeoutMs: number): () => void;
}

/** The locks that make one tab the only writer of an entry: Web Locks, or a test's. */
export interface AutosaveLocks {
    /**
     * Take a lock now, if nobody holds it.
     * @returns Releases it, or null when it is held elsewhere.
     */
    claim(name: string): Promise<(() => void) | null>;
    /** The names of every lock held now, by anyone. */
    held(): Promise<ReadonlySet<string>>;
}

/** Real timers; `requestIdleCallback` where the browser has it (Safari does not). */
export const realClock: AutosaveClock = {
    now: () => Date.now(),
    setTimer(fn, ms) {
        const handle = setTimeout(fn, ms);
        return () => {
            clearTimeout(handle);
        };
    },
    idle(fn, timeoutMs) {
        if (typeof requestIdleCallback === "function") {
            const handle = requestIdleCallback(fn, { timeout: timeoutMs });
            return () => {
                cancelIdleCallback(handle);
            };
        }

        // ponytail: no idle callback, so a second of quiet stands in for idle.
        return realClock.setTimer(fn, Math.min(timeoutMs, 1000));
    },
};

/** No locks (very old browsers): every claim succeeds and nothing counts as held. */
export const noLocks: AutosaveLocks = {
    claim: () =>
        Promise.resolve(() => {
            // Nothing to release.
        }),
    held: () => Promise.resolve(new Set<string>()),
};

/** What the writer is built from. */
export interface AutosaverOptions {
    readonly session: GraphSession;
    readonly store: AutosaveStore;
    /** The autosave key the entries belong to. */
    readonly key: string;
    /** The trailing debounce while visible; 500. */
    readonly delayMs?: number;
    /** The most a change waits for its write; 2000. */
    readonly maxWaitMs?: number;
    /** The most a change to the graph's data waits for its write; 10000. */
    readonly dataMaxWaitMs?: number;
    /** Clean entries kept per key; 10. */
    readonly keep?: number;
    readonly clock?: AutosaveClock;
    readonly locks?: AutosaveLocks;
}

/** One entry this writer writes, or wrote before a boundary. */
interface EntryState {
    readonly id: string;
    /** Commits the store holds for it, as far as this writer knows. */
    gen: number;
    readonly createdAt: string;
    /** Whether a change has been made to it; a fresh entry writes nothing. */
    started: boolean;
    unwritten: Set<PartTag>;
    /** The run entries in the store, by id. */
    readonly runs: Map<RunId, unknown>;
    release: (() => void) | null;
}

/** An entry left behind at a boundary: what it had not committed, and its meta, waiting to be ended. */
interface Ending {
    readonly entry: EntryState;
    readonly meta: AutosaveEntryMeta;
    parts: Record<string, string | null>;
}

/** One commit, and what it does to this writer's books once it completes or fails. */
interface Job {
    readonly writes: AutosaveWrite[];
    readonly claim: EntryState[];
    readonly done: (() => void)[];
    readonly undo: (() => void)[];
}

/**
 * The lock name of an entry.
 * @param key - The autosave key.
 * @param id - The entry.
 * @returns The name.
 */
export function lockName(key: string, id: string): string {
    return `graphty-autosave:${key}:${id}`;
}

/**
 * A random entry id; `randomUUID` exists only in secure contexts.
 * @returns The id.
 */
function newId(): string {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
    );
}

/**
 * The storage the browser says this origin uses, where it says.
 * @returns Usage and quota in bytes, or nulls.
 */
async function estimate(): Promise<{ usage: number | null; quota: number | null }> {
    try {
        const { usage, quota } = await navigator.storage.estimate();
        return { usage: usage ?? null, quota: quota ?? null };
    } catch {
        return { usage: null, quota: null };
    }
}

/**
 * The parts a set of changed slices leaves unwritten.
 * @param slices - What changed.
 * @returns The parts.
 */
function tagsOf(slices: readonly ProjectSlice[]): PartTag[] {
    const tags: PartTag[] = [];
    for (const slice of slices) {
        switch (slice) {
            case "runs":
                tags.push("runs");
                break;
            case "arrangement":
            case "pins":
                tags.push("arrangement");
                break;
            case "config":
            case "layout":
            case "styles":
            case "visibility":
            case "sets":
            case "views":
            case "notes":
            case "attributes":
                tags.push("rest");
                break;
            default:
                // The graph, and any slice added later: everything refers to node ids.
                tags.push(...EVERY_PART);
        }
    }

    return tags;
}

/** Writes one session's work to an autosave store as it changes. */
export class Autosaver {
    readonly #session: GraphSession;
    readonly #store: AutosaveStore;
    readonly #key: string;
    readonly #delayMs: number;
    readonly #maxWaitMs: number;
    readonly #dataMaxWaitMs: number;
    readonly #keep: number;
    readonly #clock: AutosaveClock;
    readonly #locks: AutosaveLocks;
    readonly #stash = new Map<string, unknown>();
    readonly #listeners = new Set<(status: AutosaveStatus) => void>();
    readonly #stops: (() => void)[] = [];

    #entry: EntryState;
    #endings: Ending[] = [];
    /** Committed project changes seen so far: the revision a write built now contains. */
    #changes = 0;
    #saved: { at: string; revision: number } | null = null;
    #problem: CodedFact<AutosaveCode> | null = null;
    /** What the write in flight carries, so a boundary rewrites it too. */
    #carrying: { entry: EntryState; tags: ReadonlySet<PartTag> } | null = null;
    #pump: Promise<void> | null = null;
    #again = false;
    #stopped = false;
    #debounce: (() => void) | null = null;
    #maxWait: (() => void) | null = null;
    #idle: (() => void) | null = null;
    #told = "";

    /**
     * Start writing a session's work. Nothing is written until the first change.
     * @param options - The session, the store, the key and the schedule.
     */
    constructor(options: AutosaverOptions) {
        this.#session = options.session;
        this.#store = options.store;
        this.#key = options.key;
        this.#delayMs = options.delayMs ?? 500;
        this.#maxWaitMs = options.maxWaitMs ?? 2000;
        this.#dataMaxWaitMs = options.dataMaxWaitMs ?? 10_000;
        this.#keep = options.keep ?? 10;
        this.#clock = options.clock ?? realClock;
        this.#locks = options.locks ?? noLocks;
        this.#entry = this.#newEntry();

        const { session } = this;
        const { arrangement } = dispatcherOf(session);
        const sealed = (): void => {
            this.#mark(["arrangement"], false, false);
        };
        arrangement.sealed.add(sealed);
        this.#stops.push(
            session.on("project:changed", ({ slices }) => {
                this.#mark(tagsOf(slices), slices.includes("runs"), true);
            }),
            session.on("project:status", () => {
                this.#tell();
            }),
            onProjectBoundary(session, () => {
                this.#boundary();
            }),
            () => arrangement.sealed.delete(sealed),
        );
        this.#told = JSON.stringify(this.status);
    }

    /**
     * The session this writer saves.
     * @returns The session.
     */
    get session(): GraphSession {
        return this.#session;
    }

    /**
     * Where autosave stands now.
     * @returns The status.
     */
    get status(): AutosaveStatus {
        return {
            state: this.#state(),
            savedAt: this.#saved?.at ?? null,
            revision: this.#saved?.revision ?? 0,
            entry: this.#entry.gen > 0 ? this.#entry.id : null,
            unexported: this.#stopped ? false : this.#session.project.dirty,
            persisted: null,
            storage: null,
            ephemeral: "unknown",
            problem: this.#problem,
        };
    }

    /**
     * The state the status reports.
     * @returns The state.
     */
    #state(): AutosaveStatus["state"] {
        if (this.#stopped) {
            return "off";
        }

        if (this.#problem !== null) {
            return "failing";
        }

        return this.#pump !== null || this.#hasWork() ? "pending" : "saved";
    }

    /**
     * Hear every change of {@link status}.
     * @param listener - Called with the new status.
     * @returns Stops listening.
     */
    onStatus(listener: (status: AutosaveStatus) => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /**
     * Save a small JSON value with the work, under a reverse-domain name; `undefined` removes it.
     * @param name - The name.
     * @param value - The value.
     */
    stash(name: string, value: unknown): void {
        if (value === undefined) {
            this.#stash.delete(name);
        } else {
            this.#stash.set(name, JSON.parse(JSON.stringify(value)) as unknown);
        }

        this.#mark(["stash"], false, false);
    }

    /**
     * A value saved with {@link stash}.
     * @param name - The name.
     * @returns A copy of the value, or undefined.
     */
    stashed(name: string): unknown {
        const value = this.#stash.get(name);
        return value === undefined ? undefined : structuredClone(value);
    }

    /**
     * Write everything unwritten now, with no debounce: the page is being hidden or closed, or the
     * element removed.
     * @param capture - Also write the positions and the selection, which change without a commit.
     * @returns Settles once nothing is outstanding, or the write failed (read `status`).
     */
    async flush(capture = false): Promise<void> {
        if (capture && this.#entry.started) {
            this.#entry.unwritten.add("arrangement").add("rest");
        }

        this.#cancelTimers();
        if (this.#pump !== null) {
            this.#again = true;
            await this.#pump;
        } else if (this.#hasWork()) {
            await this.#start();
        }
    }

    /**
     * Write to an existing entry from here on, from the generation it was read at. The session
     * must already hold the entry's state (it was restored from it); only what changes after this
     * is written.
     * @param meta - The entry's meta, as read from the store.
     */
    adopt(meta: AutosaveEntryMeta): void {
        this.#entry = {
            ...this.#newEntry(),
            id: meta.id,
            gen: meta.gen,
            createdAt: String(meta.createdAt),
            started: true,
        };
        this.#tell();
    }

    /**
     * Settles once no write is running. For tests and for shutdown.
     * @returns The running write's promise, or a settled one.
     */
    settled(): Promise<void> {
        return this.#pump ?? Promise.resolve();
    }

    /** Stop writing: no timer fires and no change is heard. A write in flight still finishes. */
    stop(): void {
        if (this.#stopped) {
            return;
        }

        this.#stopped = true;
        this.#cancelTimers();
        for (const stop of this.#stops) {
            stop();
        }

        void this.settled().then(() => {
            for (const entry of [this.#entry, ...this.#endings.map((ending) => ending.entry)]) {
                entry.release?.();
                entry.release = null;
            }
        });
        this.#tell();
    }

    /**
     * A new entry, unwritten and unchanged.
     * @returns The entry.
     */
    #newEntry(): EntryState {
        return {
            id: newId(),
            gen: 0,
            createdAt: new Date(this.#clock.now()).toISOString(),
            started: false,
            unwritten: new Set(),
            runs: new Map(),
            release: null,
        };
    }

    /**
     * Whether anything is waiting to be committed.
     * @returns True when a write would carry something now.
     */
    #hasWork(): boolean {
        const entry = this.#entry;
        if (entry.started && entry.unwritten.size > 0) {
            return true;
        }

        const endNow = entry.started || entry.gen > 0;
        return this.#endings.some((ending) => endNow || Object.keys(ending.parts).length > 0);
    }

    /**
     * Mark parts unwritten and schedule their write.
     * @param tags - The parts.
     * @param now - Write at once (a run finished).
     * @param counted - A committed project change, which the revision counts.
     */
    #mark(tags: readonly PartTag[], now: boolean, counted: boolean): void {
        if (this.#stopped) {
            return;
        }

        if (counted) {
            this.#changes += 1;
        }

        const entry = this.#entry;
        if (!entry.started) {
            // A new entry holds nothing yet, so its first write carries everything.
            entry.started = true;
            EVERY_PART.forEach((tag) => entry.unwritten.add(tag));
        }

        tags.forEach((tag) => entry.unwritten.add(tag));
        if (now) {
            this.#kick();
        } else {
            this.#schedule();
        }

        this.#tell();
    }

    /** Arm the timers for what is unwritten: idle for the data, the debounce for the rest. */
    #schedule(): void {
        const fire = (): void => {
            this.#kick();
        };
        if (this.#entry.unwritten.has("data")) {
            this.#debounce?.();
            this.#maxWait?.();
            this.#debounce = null;
            this.#maxWait = null;
            this.#idle ??= this.#clock.idle(fire, this.#dataMaxWaitMs);
            return;
        }

        if (this.#idle !== null) {
            // The data write is waiting for idle; this change joins it.
            return;
        }

        this.#debounce?.();
        this.#debounce = this.#clock.setTimer(fire, this.#delayMs);
        this.#maxWait ??= this.#clock.setTimer(fire, this.#maxWaitMs);
    }

    #cancelTimers(): void {
        this.#debounce?.();
        this.#maxWait?.();
        this.#idle?.();
        this.#debounce = null;
        this.#maxWait = null;
        this.#idle = null;
    }

    /** Write now, or right after the write in flight. */
    #kick(): void {
        this.#cancelTimers();
        if (this.#pump !== null) {
            this.#again = true;
        } else if (this.#hasWork()) {
            void this.#start();
        }
    }

    #start(): Promise<void> {
        const pump = this.#run().finally(() => {
            this.#pump = null;
            this.#tell();
        });
        this.#pump = pump;
        this.#tell();
        return pump;
    }

    /** The project is about to be replaced: keep what this entry has not committed, then move on. */
    #boundary(): void {
        const entry = this.#entry;
        if (this.#stopped || !entry.started) {
            return;
        }

        // Everything not known to be committed: what is unwritten, and what the write in flight
        // carries (it may yet fail). Built now, before the replacing change runs.
        const tags = new Set(entry.unwritten);
        if (this.#carrying?.entry === entry) {
            this.#carrying.tags.forEach((tag) => tags.add(tag));
        }

        let parts: Record<string, string | null> = {};
        try {
            ({ parts } = buildParts(this.#session, tags, entry.runs, this.#stash));
        } catch (error) {
            this.#failed(error);
        }

        entry.unwritten.clear();
        this.#endings.push({ entry, meta: this.#metaOf(entry), parts });
        this.#entry = this.#newEntry();
        this.#kick();
    }

    /**
     * The meta of an entry as the session stands now.
     * @param entry - The entry.
     * @returns The meta; the store sets `gen` and `seq`.
     */
    #metaOf(entry: EntryState): AutosaveEntryMeta {
        const session = this.#session;
        const snapshot = session.data.snapshot();
        return {
            id: entry.id,
            key: this.#key,
            gen: entry.gen,
            seq: 0,
            revision: this.#changes,
            dirty: session.project.dirty,
            createdAt: entry.createdAt,
            savedAt: new Date(this.#clock.now()).toISOString(),
            name: session.project.name ?? "",
            nodes: snapshot.nodeCount,
            edges: snapshot.edgeCount,
            runs: [...dispatcherOf(session).state.runs.keys()],
            formatVersion: AUTOSAVE_FORMAT_VERSION,
            elementVersion: ENGINE_VERSIONS.element,
        };
    }

    /**
     * Build the next commit from what is unwritten, moving it out of the books until the commit
     * completes (`done`) or fails (`undo`).
     * @returns The job, or null when nothing is waiting.
     * @throws {PartTooLarge} when a part cannot be built; nothing is moved.
     */
    #build(): Job | null {
        const job: Job = { writes: [], claim: [], done: [], undo: [] };
        const entry = this.#entry;
        const writesEntry = entry.started && entry.unwritten.size > 0;
        if (writesEntry) {
            const carried = entry.unwritten;
            const built = buildParts(this.#session, carried, entry.runs, this.#stash);
            const meta = this.#metaOf(entry);
            entry.unwritten = new Set();
            this.#carrying = { entry, tags: carried };
            job.writes.push({ id: entry.id, expectedGen: entry.gen, meta, parts: built.parts });
            if (entry.release === null) {
                job.claim.push(entry);
            }

            job.done.push(() => {
                entry.gen += 1;
                for (const [id, run] of built.runs) {
                    if (run === undefined) {
                        entry.runs.delete(id);
                    } else {
                        entry.runs.set(id, run);
                    }
                }

                if (entry === this.#entry) {
                    this.#saved = { at: meta.savedAt as string, revision: meta.revision as number };
                }
            });
            job.undo.push(() => {
                carried.forEach((tag) => entry.unwritten.add(tag));
            });
        }

        // An entry left at a boundary is ended in the new entry's first commit; until then, what it
        // had not committed is written to it as it is.
        const endNow = writesEntry || entry.gen > 0;
        for (const ending of this.#endings) {
            if (!endNow && Object.keys(ending.parts).length === 0) {
                continue;
            }

            job.writes.unshift({
                id: ending.entry.id,
                expectedGen: ending.entry.gen,
                meta: endNow ? { ...ending.meta, ended: "replaced" } : ending.meta,
                parts: ending.parts,
            });
            job.done.push(() => {
                ending.entry.gen += 1;
                ending.parts = {};
                if (endNow) {
                    this.#endings = this.#endings.filter((each) => each !== ending);
                    ending.entry.release?.();
                    ending.entry.release = null;
                }
            });
        }

        return job.writes.length === 0 ? null : job;
    }

    /** Write until nothing that was asked for is waiting; retries and failures are handled here. */
    async #run(): Promise<void> {
        const retries = { stall: 1, quota: 1, lost: 1 };
        do {
            this.#again = false;
            await this.#writeOnce(retries);
        } while (this.#again && !this.#stopped && this.#problem === null);
    }

    /**
     * One write, retried after a conflict and (once each) after a stall, a full quota or a lost
     * connection.
     * @param retries - The retries left in this run.
     * @param retries.stall - After the watchdog aborted a stuck write.
     * @param retries.quota - After a full quota, once old clean entries are removed.
     * @param retries.lost - After the connection to the database was lost.
     */
    async #writeOnce(retries: { stall: number; quota: number; lost: number }): Promise<void> {
        for (;;) {
            let job: Job | null;
            try {
                job = this.#build();
            } catch (error) {
                this.#failed(error);
                return;
            }

            if (job === null) {
                return;
            }

            const controller = new AbortController();
            let stalled = false;
            const cancelWatchdog = this.#clock.setTimer(() => {
                stalled = true;
                controller.abort();
            }, WATCHDOG_MS);
            try {
                for (const entry of job.claim) {
                    entry.release = await this.#locks.claim(lockName(this.#key, entry.id));
                    // ponytail: a fresh random id is never held elsewhere; a refused claim is not retried.
                }

                await this.#store.commit(job.writes, { signal: controller.signal });
            } catch (error) {
                cancelWatchdog();
                this.#carrying = null;
                job.undo.forEach((undo) => {
                    undo();
                });
                if (isAutosaveConflict(error)) {
                    this.#conflict(error.id);
                    continue;
                }

                if (stalled) {
                    this.#setProblem({ code: "E_AUTOSAVE_STALLED", params: { afterMs: WATCHDOG_MS, step: "write" } });
                    if (retries.stall-- > 0) {
                        await this.#store.close?.();
                        continue;
                    }

                    return;
                }

                const name = error instanceof Error || error instanceof DOMException ? error.name : "Error";
                if (name === "QuotaExceededError") {
                    if (retries.quota-- > 0) {
                        await this.#retain(true);
                        continue;
                    }

                    this.#setProblem({ code: "E_AUTOSAVE_QUOTA", params: await estimate() });
                    return;
                }

                if (name === "UnknownError") {
                    if (retries.lost-- > 0) {
                        await this.#store.close?.();
                        continue;
                    }

                    this.#setProblem({ code: "E_AUTOSAVE_CONNECTION_LOST", params: {} });
                    return;
                }

                this.#setProblem({ code: "E_AUTOSAVE_FAILED", params: { name } });
                return;
            }

            cancelWatchdog();
            this.#carrying = null;
            job.done.forEach((done) => {
                done();
            });
            this.#setProblem(null);
            if (job.writes.some((write) => write.expectedGen === 0)) {
                await this.#retain(false);
            }

            return;
        }
    }

    /**
     * Another writer committed to an entry first. This session's entry: move to a new one, which
     * gets all of the work. An entry left at a boundary: it is no longer ours to end.
     * @param id - The entry the store rejected.
     */
    #conflict(id: string): void {
        const lost = this.#endings.find((ending) => ending.entry.id === id);
        if (lost !== undefined) {
            this.#endings = this.#endings.filter((each) => each !== lost);
            return;
        }

        const old = this.#entry;
        old.release?.();
        old.release = null;
        const entry = this.#newEntry();
        entry.started = true;
        EVERY_PART.forEach((tag) => entry.unwritten.add(tag));
        this.#entry = entry;
    }

    /**
     * Remove clean entries of this key beyond `keep` (or every one, to make room), ended ones and
     * the oldest first. Never a dirty entry, one held by any tab, this writer's own, the newest,
     * or one written by newer code. Best effort.
     * @param room - Remove every entry that may go, not only those beyond `keep`.
     */
    async #retain(room: boolean): Promise<void> {
        try {
            const metas = await this.#store.list(this.#key);
            if (!room && metas.length <= this.#keep) {
                return;
            }

            const held = await this.#locks.held();
            const own = new Set([this.#entry.id, ...this.#endings.map((ending) => ending.entry.id)]);
            const newest = metas.at(-1)?.id;
            const doomed = metas
                .filter(
                    (meta) =>
                        meta.id !== newest &&
                        !own.has(meta.id) &&
                        !held.has(lockName(this.#key, meta.id)) &&
                        meta.dirty === false &&
                        Number(meta.formatVersion) <= AUTOSAVE_FORMAT_VERSION,
                )
                .sort((a, b) => Number(b.ended === "replaced") - Number(a.ended === "replaced") || a.seq - b.seq);
            let count = metas.length;
            for (const meta of doomed) {
                if (!room && count <= this.#keep) {
                    break;
                }

                await this.#store.remove(meta.id);
                count -= 1;
            }
        } catch {
            // ponytail: retention is housekeeping; a failure here leaves entries, never loses work.
        }
    }

    /**
     * A part could not be built, or the session is gone.
     * @param error - What building threw.
     */
    #failed(error: unknown): void {
        if (isGraphtyError(error) && error.code === "E_DISPOSED") {
            // The session was disposed under a pending write: what it committed stays as it is.
            this.stop();
            return;
        }

        if (error instanceof PartTooLarge) {
            this.#setProblem({ code: "E_AUTOSAVE_TOO_LARGE", params: { part: error.part } });
            return;
        }

        this.#setProblem({
            code: "E_AUTOSAVE_FAILED",
            params: { name: error instanceof Error ? error.name : "Error" },
        });
    }

    #setProblem(problem: CodedFact<AutosaveCode> | null): void {
        this.#problem = problem;
        this.#tell();
    }

    /** Tell the listeners when the status changed. */
    #tell(): void {
        const { status } = this;
        const told = JSON.stringify(status);
        if (told !== this.#told) {
            this.#told = told;
            for (const listener of this.#listeners) {
                listener(status);
            }
        }
    }
}
