/**
 * @file The derived-input cache (design/sets/sets-design.md sections 10.3 and 10.4): the compact
 * snapshots a scoped run computes over, kept so a repeated scoped run hands an accelerator the
 * SAME snapshot object and hits its upload cache instead of uploading the graph again.
 *
 * An entry is keyed by (store, snapshot serial, resolution signature, orientation,
 * simplification). The resolution signature is a hash of the node and edge bitmaps, and a hit is
 * confirmed word for word against the bitmaps the entry was derived for, so two scopes spelled
 * differently that cover the same elements share one input, and a hash collision can never hand a
 * run somebody else's graph.
 *
 * ENTRIES ARE REFERENCE-COUNTED. A run holds every entry it derived or looked up from the moment
 * it asks until its result is published or it is aborted. GPU memory is not garbage collected and
 * an accelerator's `release` destroys device buffers at once, so an entry is only ever MARKED
 * while held -- by byte pressure, a freeze or dispose -- and the release runs when the last holder
 * lets go. Nothing runs on memory that has gone, the guarantee `Graph.ts` gives a layout.
 *
 * BYTES are the typed arrays reachable from the live entries, each counted once however many
 * entries reach it: the derived snapshots with their columns, id maps and whatever views an
 * algorithm built on them since, the composed maps, and the bitmaps a hit is checked against. The
 * bound is max(256 MB, 1.5 x the full snapshot's bytes), so one ordinary scoped run always fits.
 * Held entries count against it and are never evicted; a run that cannot fit waits for a DIFFERENT
 * run to let go, or is refused `E_TOO_LARGE` when no other run holds anything. A run never waits
 * on itself: once it holds an input, whatever else it derives is admitted over the bound.
 *
 * Device bytes are the accelerator's to count; they are not in this bound.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot, U32 } from "@graphty/graph-format";

import { GraphtyError } from "../../errors";

/** How a run wants its input's parallel edges merged. OPEN UNION (design 10.2). */
export type SimplifyPolicy = "sum" | "min" | "max" | "none";

/** Which orientation a run reads. */
export type InputOrientation = "declared" | "undirected";

/** The floor of the byte bound. */
const MIN_BOUND_BYTES = 256 * 1024 * 1024;

/** The bound as a multiple of the full snapshot's bytes. */
const FULL_SNAPSHOT_FACTOR = 1.5;

/** Counts the cache tests read. */
export const derivedInputCounters = { hits: 0, misses: 0, released: 0 };

/** One derived input: the snapshot a run computes over and the maps back to the declared graph. */
export interface DerivedInput {
    /** The compact snapshot, in the asked orientation and simplified by the asked policy. */
    readonly snapshot: GraphSnapshot;
    /** Declared edge index -> edge index in {@link snapshot}, INVALID_INDEX when dropped; null when unchanged. */
    readonly edgeRemap: U32 | null;
    /** Node index in {@link snapshot} -> declared node index; null when unchanged. */
    readonly nodeOrigin: U32 | null;
}

/** The membership an input is derived for: a resolution's bitmaps, over one snapshot of one store. */
export interface InputMembership {
    readonly nodes: U32;
    readonly edges: U32;
    readonly serial: number;
    readonly store: object | null;
}

/** One cached input. */
interface Entry extends DerivedInput {
    readonly key: string;
    readonly serial: number;
    readonly store: object | null;
    /** The bitmaps it was derived for, which a hit is confirmed against. */
    readonly nodes: U32;
    readonly edges: U32;
    /** The runs holding it. */
    readonly holders: Set<object>;
    /** Evicted, frozen out or disposed while held: released when the last holder lets go. */
    marked: boolean;
}

/** A read-only view of one entry, for the accounting test. */
interface DerivedInputEntry extends DerivedInput {
    readonly key: string;
    readonly held: boolean;
    readonly marked: boolean;
    /** The bitmaps the entry was derived for. */
    readonly nodes: U32;
    readonly edges: U32;
}

const storeIds = new WeakMap<object, number>();
let nextStoreId = 1;

/**
 * A number standing for a store instance.
 * @param store - The store, or null.
 * @returns Its number; 0 for null.
 */
function storeId(store: object | null): number {
    if (store === null) {
        return 0;
    }

    let id = storeIds.get(store);
    if (id === undefined) {
        id = nextStoreId++;
        storeIds.set(store, id);
    }

    return id;
}

/**
 * A two-lane FNV-1a hash of two bitmaps, as hex. Only a key: every hit is confirmed word for word.
 * @param nodes - The node bitmap.
 * @param edges - The edge bitmap.
 * @returns The signature.
 */
function bitmapSignature(nodes: U32, edges: U32): string {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ nodes.length;
    for (const words of [nodes, edges]) {
        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            a = Math.imul(a ^ word, 0x01000193);
            b = Math.imul(b ^ ((word >>> 16) | (word << 16)), 0x01000193) ^ index;
        }

        a = Math.imul(a ^ words.length, 0x01000193);
    }

    return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}

/**
 * Whether two bitmaps hold the same words.
 * @param left - One.
 * @param right - The other.
 * @returns True when equal.
 */
function sameWords(left: U32, right: U32): boolean {
    if (left === right) {
        return true;
    }

    if (left.length !== right.length) {
        return false;
    }

    for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) {
            return false;
        }
    }

    return true;
}

/**
 * The bytes of every typed array reachable from some roots, each counted once. Walks own data
 * properties, maps and sets; a getter is never called, so walking builds nothing.
 * @param roots - Where to start.
 * @returns The byte count.
 */
function reachableBytes(roots: readonly unknown[]): number {
    const seen = new Set<unknown>();
    const stack = [...roots];
    let bytes = 0;
    while (stack.length > 0) {
        const value = stack.pop();
        if (value === null || typeof value !== "object" || seen.has(value)) {
            continue;
        }

        seen.add(value);
        if (ArrayBuffer.isView(value)) {
            bytes += value.byteLength;
            continue;
        }

        if (value instanceof ArrayBuffer) {
            continue;
        }

        if (value instanceof Map) {
            for (const [key, item] of value) {
                stack.push(key, item);
            }
        } else if (value instanceof Set) {
            for (const item of value) {
                stack.push(item);
            }
        }

        for (const key of Reflect.ownKeys(value)) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (descriptor !== undefined && "value" in descriptor) {
                stack.push(descriptor.value);
            }
        }
    }

    return bytes;
}

/**
 * A snapshot's bytes as the bound reads them: the core, its columns and its id map.
 * @param snapshot - The snapshot.
 * @returns The byte count.
 */
function snapshotBytes(snapshot: GraphSnapshot): number {
    return snapshot.byteLength({ columns: true, ids: true });
}

/** One session graph's derived inputs. */
export class DerivedInputs {
    /** Entries, least recently used first. */
    private readonly entries = new Map<string, Entry>();
    /** Entries kept only until their holders let go: marked, and no longer reachable by key. */
    private readonly draining = new Set<Entry>();
    /** Bytes each waiting-or-running run reserved before deriving. */
    private readonly reservations = new Map<object, number>();
    /** Runs waiting for another run to let go. */
    private waiters: (() => void)[] = [];
    /** The full snapshot's bytes, as last seen. */
    private fullBytes = 0;
    private disposed = false;

    /**
     * An empty cache.
     * @param options - The release hook and, for tests, the byte bound.
     * @param options.release - Frees an accelerator's device buffers for a snapshot nothing uses.
     * @param options.limit - A fixed byte bound instead of max(256 MB, 1.5 x the full snapshot).
     */
    constructor(
        private readonly options: {
            readonly release?: (snapshot: GraphSnapshot) => void;
            readonly limit?: number;
        } = {},
    ) {}

    /**
     * The byte bound now.
     * @returns The bound.
     */
    get bound(): number {
        return this.options.limit ?? Math.max(MIN_BOUND_BYTES, Math.ceil(FULL_SNAPSHOT_FACTOR * this.fullBytes));
    }

    /**
     * The bytes the live entries hold, draining ones included.
     * @returns The byte count.
     */
    get bytes(): number {
        return reachableBytes([...this.live()].map(rootsOf));
    }

    /**
     * Every live entry, draining ones included, least recently used first. For the accounting test.
     * @returns The entries.
     */
    list(): DerivedInputEntry[] {
        return [...this.live()].map((entry) => ({
            key: entry.key,
            snapshot: entry.snapshot,
            edgeRemap: entry.edgeRemap,
            nodeOrigin: entry.nodeOrigin,
            nodes: entry.nodes,
            edges: entry.edges,
            held: entry.holders.size > 0,
            marked: entry.marked,
        }));
    }

    /**
     * A cached input, held for a run on a hit.
     * @param holder - The run.
     * @param membership - What it is derived for.
     * @param orientation - The orientation.
     * @param simplify - The merge policy.
     * @returns The input, or undefined on a miss.
     */
    get(
        holder: object,
        membership: InputMembership,
        orientation: InputOrientation,
        simplify: SimplifyPolicy,
    ): DerivedInput | undefined {
        this.sync(membership);
        const key = keyOf(membership, orientation, simplify);
        const entry = this.entries.get(key);
        if (
            entry === undefined ||
            !sameWords(entry.nodes, membership.nodes) ||
            !sameWords(entry.edges, membership.edges)
        ) {
            derivedInputCounters.misses++;
            return undefined;
        }

        derivedInputCounters.hits++;
        this.entries.delete(key);
        this.entries.set(key, entry);
        entry.holders.add(holder);

        return entry;
    }

    /**
     * Cache an input a run derived, held for it, then evict unheld entries past the bound.
     * @param holder - The run.
     * @param membership - What it was derived for.
     * @param orientation - The orientation.
     * @param simplify - The merge policy.
     * @param input - The derived input.
     * @param full - The full snapshot it was derived from, whose bytes set the bound.
     * @returns The input.
     */
    put(
        holder: object,
        membership: InputMembership,
        orientation: InputOrientation,
        simplify: SimplifyPolicy,
        input: DerivedInput,
        full: GraphSnapshot,
    ): DerivedInput {
        this.sync(membership);
        this.fullBytes = snapshotBytes(full);
        const key = keyOf(membership, orientation, simplify);
        const replaced = this.entries.get(key);
        if (replaced !== undefined) {
            this.entries.delete(key);
            this.evictEntry(replaced);
        }

        const entry: Entry = {
            ...input,
            key,
            serial: membership.serial,
            store: membership.store,
            nodes: membership.nodes,
            edges: membership.edges,
            holders: new Set([holder]),
            marked: this.disposed,
        };
        if (this.disposed) {
            this.draining.add(entry);
        } else {
            this.entries.set(key, entry);
            this.shrink();
        }

        return entry;
    }

    /**
     * Reserve room for a run's derivation before it starts. Evicts unheld entries to make room;
     * waits while a DIFFERENT run holds or reserves what would free it; refuses `E_TOO_LARGE`
     * when nothing else holds anything and it still does not fit. A run that already holds an
     * input is admitted at once: it never waits on itself.
     * @param holder - The run.
     * @param estimate - The bytes its derivation is expected to take.
     * @param full - The full snapshot, whose bytes set the bound.
     * @param signal - Aborts the wait.
     * @returns Resolves once the run may derive.
     */
    async reserve(holder: object, estimate: number, full: GraphSnapshot, signal?: AbortSignal): Promise<void> {
        this.fullBytes = snapshotBytes(full);
        for (;;) {
            signal?.throwIfAborted();
            if (this.holds(holder)) {
                return;
            }

            const room = this.bound - this.pending(holder) - estimate;
            this.shrink(room);
            if (this.bytes <= room) {
                this.reservations.set(holder, estimate);
                return;
            }

            if (!this.othersHold(holder)) {
                throw new GraphtyError({
                    code: "E_TOO_LARGE",
                    message:
                        `A scoped run needs about ${String(estimate)} bytes for its input, and the derived-input cache holds at most ` +
                        `${String(this.bound)}.`,
                    source: "run",
                    details: { reason: "derived-input", estimate, bound: this.bound, limit: this.bound },
                });
            }

            await this.nextRelease(signal);
        }
    }

    /**
     * A run published or aborted: it lets go of every input it held and its reservation. A marked
     * input with no holder left is released; waiting runs try again.
     * @param holder - The run.
     */
    releaseHolder(holder: object): void {
        this.reservations.delete(holder);
        for (const entry of [...this.live()]) {
            if (entry.holders.delete(holder) && entry.holders.size === 0 && entry.marked) {
                this.free(entry);
            }
        }

        this.shrink();
        this.wake();
    }

    /** The graph froze: every entry is over a snapshot that has gone. */
    freeze(): void {
        for (const entry of [...this.entries.values()]) {
            this.entries.delete(entry.key);
            this.evictEntry(entry);
        }

        this.wake();
    }

    /** The graph is being torn down: release what nothing holds, mark the rest, cache nothing more. */
    dispose(): void {
        this.disposed = true;
        this.freeze();
    }

    /**
     * Mark every entry over another snapshot or store than this membership's.
     * @param membership - The membership now being asked for.
     */
    private sync(membership: InputMembership): void {
        for (const entry of [...this.entries.values()]) {
            if (entry.serial !== membership.serial || entry.store !== membership.store) {
                this.entries.delete(entry.key);
                this.evictEntry(entry);
            }
        }
    }

    /**
     * Evict unheld entries, least recently used first, until the bytes fit.
     * @param budget - The bytes to fit in; the bound by default.
     */
    private shrink(budget = this.bound): void {
        for (const entry of [...this.entries.values()]) {
            if (this.bytes <= budget) {
                return;
            }

            if (entry.holders.size === 0) {
                this.entries.delete(entry.key);
                this.evictEntry(entry);
            }
        }
    }

    /**
     * Take an entry out of the cache: released at once when unheld, else marked and drained.
     * @param entry - It.
     */
    private evictEntry(entry: Entry): void {
        entry.marked = true;
        if (entry.holders.size === 0) {
            this.free(entry);
        } else {
            this.draining.add(entry);
        }
    }

    /**
     * Release an entry's snapshot, unless another live entry still reaches the same one.
     * @param entry - It.
     */
    private free(entry: Entry): void {
        this.draining.delete(entry);
        for (const other of this.live()) {
            if (other !== entry && other.snapshot === entry.snapshot) {
                return;
            }
        }

        derivedInputCounters.released++;
        this.options.release?.(entry.snapshot);
    }

    /**
     * Every live entry: cached and draining.
     * @yields Each entry.
     */
    private *live(): Generator<Entry> {
        yield* this.entries.values();
        yield* this.draining;
    }

    /**
     * Whether a run holds anything.
     * @param holder - The run.
     * @returns True when it does.
     */
    private holds(holder: object): boolean {
        for (const entry of this.live()) {
            if (entry.holders.has(holder)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Whether a run other than this one holds an input or a reservation.
     * @param holder - The run asking.
     * @returns True when another does.
     */
    private othersHold(holder: object): boolean {
        for (const other of this.reservations.keys()) {
            if (other !== holder) {
                return true;
            }
        }

        for (const entry of this.live()) {
            for (const other of entry.holders) {
                if (other !== holder) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * The bytes other runs reserved and have not yet derived.
     * @param holder - The run asking, left out.
     * @returns The byte count.
     */
    private pending(holder: object): number {
        let bytes = 0;
        for (const [other, reserved] of this.reservations) {
            if (other === holder) {
                continue;
            }

            const held = reachableBytes([...this.live()].filter((entry) => entry.holders.has(other)).map(rootsOf));
            bytes += Math.max(0, reserved - held);
        }

        return bytes;
    }

    /**
     * Resolves the next time a run lets go or the graph freezes.
     * @param signal - Rejects the wait when aborted.
     * @returns The wait.
     */
    private nextRelease(signal?: AbortSignal): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const onAbort = (): void => {
                this.waiters = this.waiters.filter((waiter) => waiter !== done);
                reject(
                    signal?.reason instanceof Error
                        ? signal.reason
                        : new DOMException("The run was cancelled.", "AbortError"),
                );
            };
            const done = (): void => {
                signal?.removeEventListener("abort", onAbort);
                resolve();
            };
            this.waiters.push(done);
            signal?.addEventListener("abort", onAbort, { once: true });
        });
    }

    /** Let every waiting run try again. */
    private wake(): void {
        const waiting = this.waiters;
        this.waiters = [];
        for (const waiter of waiting) {
            waiter();
        }
    }
}

/**
 * An entry's key.
 * @param membership - What it is derived for.
 * @param orientation - The orientation.
 * @param simplify - The merge policy.
 * @returns The key.
 */
function keyOf(membership: InputMembership, orientation: InputOrientation, simplify: SimplifyPolicy): string {
    return `${String(storeId(membership.store))}:${String(membership.serial)}:${bitmapSignature(membership.nodes, membership.edges)}:${orientation}:${simplify}`;
}

/**
 * What an entry keeps alive, for the byte walk.
 * @param entry - It.
 * @returns Its roots.
 */
function rootsOf(entry: Entry): unknown[] {
    return [entry.snapshot, entry.edgeRemap, entry.nodeOrigin, entry.nodes, entry.edges];
}
