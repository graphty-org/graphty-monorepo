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
 * OFFER COUNTS hold one entry per run: what `./offers` counted of the run's current execution
 * over one snapshot. They are keyed by the run and valid for exactly one (execution, store,
 * snapshot serial); anything else misses and replaces the entry.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunId, SetDefinition, SetId } from "../../catalog/types";
import { type Resolution, type ResolveContext, resolveDefinitionIn, resolveQuietly } from "./resolve";
import { createSignatureMemo, definitionSignature, type SignatureMemo } from "./signature";

/** The default byte bound on resolutions. */
const RESOLUTION_BYTES = 64 * 1024 * 1024;
/** The bytes always left to unpinned resolutions, however much the pins hold. */
const UNPINNED_RESERVE_BYTES = 16 * 1024 * 1024;

/** The summary signature of a definition whose inputs cannot be enumerated: never matches a lookup. */
const UNSIGNED = "";

/** Counts the cache tests read. */
export const cacheCounters = { hits: 0, misses: 0, evictions: 0 };

/** One cached resolution. */
interface Entry {
    readonly signature: string;
    readonly resolution: Resolution;
    readonly bytes: number;
}

/**
 * A kept set's counts under one signature, and the outcome of the pass that produced them, which
 * status reads without resolving.
 */
interface SetSummary {
    readonly signature: string;
    /** The definition the pass resolved, so an outcome is never read for a later definition. */
    readonly definition: SetDefinition;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly missingNodes: number;
    readonly missingEdges: number;
    readonly ambiguousEdges: number;
    /** Why the pass resolved nothing, when it could not evaluate the definition. */
    readonly problem?: Resolution["problem"];
}

/**
 * The bytes one resolution holds.
 * @param resolution - The resolution.
 * @returns Its bitmaps' byte lengths.
 */
function bytesOf(resolution: Resolution): number {
    return resolution.nodes.byteLength + resolution.edges.byteLength;
}

/**
 * What `./offers` counted of one run's execution over one snapshot: members per item key, and the
 * edge-count pass once it has run.
 */
export interface OfferCounts {
    readonly execution: string | undefined;
    /** Identity of the store the snapshot came from. */
    readonly store: number;
    readonly serial: number;
    /** Item key (`itemKeyOf`) to its value and the nodes whose values name it. */
    readonly nodes: ReadonlyMap<string, { readonly value: string | number | boolean; readonly count: number }>;
    /** The edge-count pass: item key to its edges and, read `listed`, its nodes with the edges' endpoints. */
    pass?: ReadonlyMap<string, { readonly edges: number; readonly nodes: number }>;
}

/** One session's resolution cache, its summaries and its signature memo. */
export class SetsCache {
    /** The signature memo every resolution through this cache shares. */
    readonly memo: SignatureMemo = createSignatureMemo();
    /** Summaries by set id. */
    readonly summaries = new Map<SetId, SetSummary>();
    /** Offer counts by run id. */
    readonly offers = new Map<RunId, OfferCounts>();
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
     * The resolution cached for a key under a signature, counting nothing and moving nothing: for
     * a reader that only uses a resolution when one happens to be there.
     * @param key - What was resolved.
     * @param signature - Its input signature now.
     * @returns The resolution, or undefined when none is cached under that signature.
     */
    peek(key: unknown, signature: string): Resolution | undefined {
        const entry = this.entries.get(key);

        return entry?.signature === signature ? entry.resolution : undefined;
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
 * Resolve a kept definition, uncached and quietly: a definition that cannot be evaluated (a cycle,
 * a missing referent) resolves to nothing, with its `problem`.
 * @param id - The set, whose seeds its edge members bind through.
 * @param definition - Its frozen definition.
 * @param context - What the resolution reads.
 * @returns The resolution.
 */
function resolveDefinition(id: SetId, definition: SetDefinition, context: ResolveContext): Resolution {
    return resolveQuietly(() => resolveDefinitionIn(definition, context, [id], id), context);
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
    if (cache === undefined) {
        return resolveDefinition(record.id, record.definition, context);
    }

    if (signature === null) {
        // Never cached, but its outcome is still what status reads of the last pass.
        const resolution = resolveDefinition(record.id, record.definition, context);
        summarise(cache, record.id, record.definition, UNSIGNED, resolution, context);

        return resolution;
    }

    let resolution = cache.lookup(record.definition, signature);
    if (resolution === undefined) {
        resolution = resolveDefinition(record.id, record.definition, context);
        if (resolution.problem === undefined) {
            cache.store(record.definition, signature, resolution);
        }
    }

    summarise(cache, record.id, record.definition, signature, resolution, context);

    return resolution;
}

/**
 * Record a set's summary, one per id. Summaries of ids no longer live are dropped once they
 * outnumber the live sets, so churn cannot grow the map.
 * @param cache - The cache.
 * @param id - The set.
 * @param definition - The definition resolved.
 * @param signature - The signature.
 * @param resolution - Its resolution.
 * @param context - What was resolved against.
 */
function summarise(cache: SetsCache, id: SetId, definition: SetDefinition, signature: string, resolution: Resolution, context: ResolveContext): void {
    const known = cache.summaries.get(id);
    if (known?.signature !== signature || known.definition !== definition) {
        cache.summaries.set(
            id,
            Object.freeze({
                signature,
                definition,
                nodeCount: resolution.nodeCount,
                edgeCount: resolution.edgeCount,
                missingNodes: resolution.missingNodes,
                missingEdges: resolution.missingEdges,
                ambiguousEdges: resolution.ambiguousEdges,
                ...(resolution.problem === undefined ? {} : { problem: resolution.problem }),
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
export function countsOf(
    record: { readonly id: SetId; readonly definition: SetDefinition },
    context: ResolveContext,
): Pick<SetSummary, "nodeCount" | "edgeCount" | "missingNodes" | "missingEdges"> {
    const { cache } = context;
    const signature = cache === undefined ? null : definitionSignature(record.id, record.definition, context, cache.memo);
    const known = signature === null ? undefined : cache?.summaries.get(record.id);
    if (known?.signature === signature && known.definition === record.definition) {
        return known;
    }

    const { nodeCount, edgeCount, missingNodes, missingEdges } = resolveSet(record, context);

    return { nodeCount, edgeCount, missingNodes, missingEdges };
}

/**
 * What the last pass over a kept set found, when that pass resolved its current definition: why it
 * resolved nothing, and how many edge members more than one edge carries. Never resolves.
 * @param cache - The cache.
 * @param record - The set.
 * @param record.id - Its id.
 * @param record.definition - Its definition.
 * @returns The outcome, or undefined when no pass has resolved this definition.
 */
export function outcomeOf(
    cache: SetsCache,
    record: { readonly id: SetId; readonly definition: SetDefinition },
): Pick<SetSummary, "problem" | "ambiguousEdges"> | undefined {
    const known = cache.summaries.get(record.id);

    return known?.definition === record.definition ? known : undefined;
}
