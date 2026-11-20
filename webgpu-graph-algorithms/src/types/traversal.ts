/**
 * The result records of the traversals (breadth-first search, shortest paths, Bellman-Ford). The OPTION types are the
 * seam's own -- `BfsOptions` and `SsspOptions` from `@graphty/algorithms`, re-exported through
 * `src/types/accelerator.ts` beside `HitsOptionsLike` -- and are deliberately NOT redeclared here: a
 * member the CPU dispatcher forwards options into must read exactly the keys the CPU port reads. Every sentinel is
 * spelled on its field, because a consumer who reads `parent[root] === 4294967295` and guesses is the failure this
 * file prevents. Types only: this file imports nothing at runtime.
 */

import type { F32, U32 } from "@graphty/graph-format";

/**
 * What `breadthFirstSearch` returns. Satisfies the seam's `BfsResultLike` (`depth`, `parent`,
 * `order`, `visitedCount`) with `levels` and `switches` on top. Every array is bitwise reproducible.
 */
export interface GpuBfsResult {
    /** Per node: its hop count from the source; `INVALID_INDEX` (4294967295) = unreached. */
    readonly depth: U32;
    /**
     * Per node: the SMALLEST node index `u` with `depth[u] + 1 == depth[v]` and an arc `u -> v` (a post-pass over
     * the settled depths, so the chain to the source strictly decreases `depth`); `INVALID_INDEX` for the source and
     * for an unreached node.
     */
    readonly parent: U32;
    /** Length `visitedCount`: the reached nodes grouped by depth, ascending by node index within a depth. */
    readonly order: U32;
    /** How many nodes were reached, the source included. */
    readonly visitedCount: number;
    /** `max depth + 1`; 1 for a source with no out-arcs. */
    readonly levels: number;
    /** Direction changes of the direction-optimizing search (a device counter); 0 on a top-down-only run. */
    readonly switches: number;
}

/**
 * What `sssp` returns. Satisfies the seam's `SsspResultLike` (`dist: NumericVector` admits `F32`;
 * `predArc: U32`). `dist` is bitwise reproducible and `predArc` is a function of it alone.
 */
export interface GpuSsspResult {
    /** Per node: its shortest distance from the source in f32; `+Infinity` = unreached, which includes beyond `cutoff`. */
    readonly dist: F32;
    /**
     * Per node `v`: a TIGHT arc `a` into `v` (`fround(dist[src(a)] + w(a)) == dist[v]`) whose source sits one step below `v` in the key
     * `(dist, hops)` (`hops` the depth from the source among equal distances), the smallest such arc index; the chain `v -> src(a) -> ...` always ends at the source.
     * `INVALID_INDEX` (4294967295) for the source and for an unreached node.
     */
    readonly predArc: U32;
    /** How many nodes have a finite `dist`, the source included. */
    readonly reachedCount: number;
}

/** What `bellmanFord` returns. Satisfies the seam's `BellmanFordResultLike`. */
export interface GpuBellmanFordResult extends GpuSsspResult {
    /** When true, `dist` and `predArc` are the values of the last round, not shortest paths. */
    readonly hasNegativeCycle: boolean;
}
