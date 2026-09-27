/**
 * @file The resolution cache, the summary cache and the cached resolver of kept sets
 * (design/sets/sets-design.md section 6.2).
 *
 * RESOLUTIONS are pulled, never pushed: nothing is recomputed until something reads it. An entry
 * is keyed by what was resolved -- a kept set's frozen definition, or an inline scope's canonical
 * key -- and holds the one resolution of the latest input signature (`./signature`) it was asked
 * under. A read under another signature misses and replaces it, so an entry of an older serial is
 * never served. Keying a kept set by its definition rather than its record is what lets a rename
 * hit, and an undo that restores the identical record hit again.
 *
 * The cache is bounded in BYTES, not entries: 64 MB by default, counted as the byte length of each
 * entry's two bitmaps (no two entries share one). Entries whose key is pinned (a style layer or the
 * visibility filter names it) are counted separately and never evicted, and may exceed the bound;
 * unpinned entries may use whatever the pins leave, and never less than 16 MB, so runs and counts
 * do not thrash. Eviction is least recently used first.
 *
 * SUMMARIES hold one entry per kept set id: the latest signature and its counts, so a panel
 * counting 200 sets never needs 200 resolutions resident and nothing grows under streaming data.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { makeMask } from "@graphty/graph-format";

import type { SetDefinition, SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { resolvePath } from "./path";
import { opaqueName } from "./prepare";
import { deriveEdges, type Resolution, resolutionOf, type ResolveContext, resolveFixed, resolveNodeHalf } from "./resolve";
import { createSignatureMemo, definitionSignature, type SignatureMemo } from "./signature";

/** The default byte bound on resolutions. */
const RESOLUTION_BYTES = 64 * 1024 * 1024;
/** The bytes always left to unpinned resolutions, however much the pins hold. */
const UNPINNED_RESERVE_BYTES = 16 * 1024 * 1024;

/** Counts the cache tests read. */
export const cacheCounters = { hits: 0, misses: 0, evictions: 0 };

/** One cached resolution. */
interface Entry {
    readonly signature: string;
    readonly resolution: Resolution;
    readonly bytes: number;
}

/** A kept set's counts under one signature. */
interface SetSummary {
    readonly signature: string;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly missingNodes: number;
    readonly missingEdges: number;
}

/**
 * The bytes one resolution holds.
 * @param resolution - The resolution.
 * @returns Its bitmaps' byte lengths.
 */
function bytesOf(resolution: Resolution): number {
    return resolution.nodes.byteLength + resolution.edges.byteLength;
}

/** One session's resolution cache, its summaries and its signature memo. */
export class SetsCache {
    /** The signature memo every resolution through this cache shares. */
    readonly memo: SignatureMemo = createSignatureMemo();
    /** Summaries by set id. */
    readonly summaries = new Map<SetId, SetSummary>();
    /** Entries, least recently used first. */
    private readonly entries = new Map<unknown, Entry>();
    /** How many holders pin each key. */
    private readonly pins = new Map<unknown, number>();
    private unpinned = 0;
    private pinned = 0;

    /**
     * An empty cache.
     * @param options - The bounds.
     * @param options.limit - The byte bound; {@link RESOLUTION_BYTES} by default.
     * @param options.reserve - The bytes always left to unpinned entries; {@link UNPINNED_RESERVE_BYTES}.
     */
    constructor(private readonly options: { readonly limit?: number; readonly reserve?: number } = {}) {}

    /**
     * The bytes cached, pinned and unpinned.
     * @returns The byte count.
     */
    get bytes(): number {
        return this.unpinned + this.pinned;
    }

    /**
     * The bytes pinned entries hold.
     * @returns The byte count.
     */
    get pinnedBytes(): number {
        return this.pinned;
    }

    /**
     * How many entries are cached.
     * @returns The count.
     */
    get size(): number {
        return this.entries.size;
    }

    /**
     * Every cached resolution with its key, least recently used first. For the accounting test.
     * @returns The entries.
     */
    cached(): [unknown, Resolution][] {
        return [...this.entries].map(([key, entry]) => [key, entry.resolution]);
    }

    /**
     * The resolution cached for a key under a signature.
     * @param key - What was resolved.
     * @param signature - Its input signature now.
     * @returns The resolution, or undefined on a miss.
     */
    lookup(key: unknown, signature: string): Resolution | undefined {
        const entry = this.entries.get(key);
        if (entry?.signature !== signature) {
            cacheCounters.misses++;
            return undefined;
        }

        cacheCounters.hits++;
        // Most recently used goes last.
        this.entries.delete(key);
        this.entries.set(key, entry);

        return entry.resolution;
    }

    /**
     * Cache a resolution, replacing the key's entry, then evict past the bound.
     * @param key - What was resolved.
     * @param signature - The signature it was resolved under.
     * @param resolution - The resolution.
     */
    store(key: unknown, signature: string, resolution: Resolution): void {
        this.drop(key);
        const entry = { signature, resolution, bytes: bytesOf(resolution) };
        this.entries.set(key, entry);
        this.account(key, entry.bytes);
        this.evict();
    }

    /**
     * Pin a key: its entry is never evicted while any pin holds.
     * @param key - The key.
     * @returns A function that releases this pin.
     */
    pin(key: unknown): () => void {
        const entry = this.entries.get(key);
        const count = this.pins.get(key) ?? 0;
        if (count === 0 && entry !== undefined) {
            this.unpinned -= entry.bytes;
            this.pinned += entry.bytes;
        }

        this.pins.set(key, count + 1);
        let released = false;

        return () => {
            if (released) {
                return;
            }

            released = true;
            const left = (this.pins.get(key) ?? 1) - 1;
            if (left > 0) {
                this.pins.set(key, left);
                return;
            }

            this.pins.delete(key);
            const held = this.entries.get(key);
            if (held !== undefined) {
                this.pinned -= held.bytes;
                this.unpinned += held.bytes;
                this.evict();
            }
        };
    }

    /**
     * Count an entry's bytes in its bucket.
     * @param key - Its key.
     * @param bytes - Its bytes; negative to uncount.
     */
    private account(key: unknown, bytes: number): void {
        if (this.pins.has(key)) {
            this.pinned += bytes;
        } else {
            this.unpinned += bytes;
        }
    }

    /**
     * Remove a key's entry.
     * @param key - The key.
     */
    private drop(key: unknown): void {
        const entry = this.entries.get(key);
        if (entry !== undefined) {
            this.entries.delete(key);
            this.account(key, -entry.bytes);
        }
    }

    /** Evict unpinned entries, least recently used first, while they are over their budget. */
    private evict(): void {
        const limit = this.options.limit ?? RESOLUTION_BYTES;
        const budget = Math.max(limit - this.pinned, this.options.reserve ?? UNPINNED_RESERVE_BYTES);
        for (const [key, entry] of this.entries) {
            if (this.unpinned <= budget) {
                return;
            }

            if (!this.pins.has(key)) {
                this.entries.delete(key);
                this.unpinned -= entry.bytes;
                cacheCounters.evictions++;
            }
        }
    }
}

/**
 * Resolve a kept definition, uncached.
 * @param id - The set, whose seeds its edge members bind through.
 * @param definition - Its frozen definition.
 * @param context - What the resolution reads.
 * @returns The resolution.
 * @throws A `GraphtyError` for a rule over a rule tree, which this element cannot resolve yet.
 */
function resolveDefinition(id: SetId, definition: SetDefinition, context: ResolveContext): Resolution {
    const { snapshot } = context;
    const empty = (): Resolution =>
        resolutionOf({ nodes: makeMask(snapshot.nodeCount), constraint: null, all: false, missingNodes: 0 }, makeMask(snapshot.edgeCount), context, 0);
    if (opaqueName(definition) !== null) {
        // Opaque content resolves to nothing (design 12.5).
        return empty();
    }

    switch (definition.kind) {
        case "fixed":
            return resolveFixed(definition, context, context.sets?.seedsOf(id));
        case "path":
            return resolvePath(definition, context, context.sets?.seedsOf(id));
        case "rule": {
            if (typeof definition.where !== "string") {
                throw new GraphtyError({
                    code: "E_UNSUPPORTED",
                    message: "A rule over a rule tree cannot be resolved by this graphty-element yet.",
                    source: "run",
                    details: { set: id },
                });
            }

            const half = resolveNodeHalf({ where: definition.where }, context);
            // A query speaks only about nodes: its edge half is silent, which `listed` reads as none.
            const edges = definition.reading === "listed" ? makeMask(snapshot.edgeCount) : deriveEdges(half, snapshot);

            return resolutionOf(half, edges, context, 0);
        }

        default:
            return empty();
    }
}

/**
 * What a kept set covers, through the context's cache when it has one. Also records the set's
 * summary.
 * @param record - The set: its id and frozen definition.
 * @param record.id - Its id.
 * @param record.definition - Its definition.
 * @param context - What the resolution reads; `context.cache` is consulted when present.
 * @returns The resolution.
 */
export function resolveSet(record: { readonly id: SetId; readonly definition: SetDefinition }, context: ResolveContext): Resolution {
    const { cache } = context;
    const signature = cache === undefined ? null : definitionSignature(record.id, record.definition, context, cache.memo);
    if (cache === undefined || signature === null) {
        return resolveDefinition(record.id, record.definition, context);
    }

    let resolution = cache.lookup(record.definition, signature);
    if (resolution === undefined) {
        resolution = resolveDefinition(record.id, record.definition, context);
        cache.store(record.definition, signature, resolution);
    }

    summarise(cache, record.id, signature, resolution, context);

    return resolution;
}

/**
 * Record a set's summary, one per id. Summaries of ids no longer live are dropped once they
 * outnumber the live sets, so churn cannot grow the map.
 * @param cache - The cache.
 * @param id - The set.
 * @param signature - The signature.
 * @param resolution - Its resolution.
 * @param context - What was resolved against.
 */
function summarise(cache: SetsCache, id: SetId, signature: string, resolution: Resolution, context: ResolveContext): void {
    if (cache.summaries.get(id)?.signature !== signature) {
        cache.summaries.set(
            id,
            Object.freeze({
                signature,
                nodeCount: resolution.nodeCount,
                edgeCount: resolution.edgeCount,
                missingNodes: resolution.missingNodes,
                missingEdges: resolution.missingEdges,
            }),
        );
    }

    const { sets } = context;
    if (sets !== undefined && cache.summaries.size > 2 * sets.list().length + 16) {
        for (const key of cache.summaries.keys()) {
            if (sets.get(key) === undefined) {
                cache.summaries.delete(key);
            }
        }
    }
}

/**
 * A kept set's counts: from its summary while the signature holds, else resolved.
 * @param record - The set.
 * @param record.id - Its id.
 * @param record.definition - Its definition.
 * @param context - What the resolution reads; needs `context.cache`.
 * @returns The counts.
 */
export function countsOf(record: { readonly id: SetId; readonly definition: SetDefinition }, context: ResolveContext): Omit<SetSummary, "signature"> {
    const { cache } = context;
    const signature = cache === undefined ? null : definitionSignature(record.id, record.definition, context, cache.memo);
    const known = signature === null ? undefined : cache?.summaries.get(record.id);
    if (known?.signature === signature && known !== undefined) {
        return known;
    }

    const { nodeCount, edgeCount, missingNodes, missingEdges } = resolveSet(record, context);

    return { nodeCount, edgeCount, missingNodes, missingEdges };
}
