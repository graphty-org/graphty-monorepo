/**
 * The result records of the P8 frontier family (design 3.3 lines 830-832, 9.7), verbatim. The OPTION types are the
 * seam's own -- `BfsOptions` and `SsspOptions` from `@graphty/algorithms`, re-exported through
 * `src/types/accelerator.ts` beside `HitsOptionsLike` -- and are deliberately NOT redeclared here (P8 PD-19): a
 * member the CPU dispatcher forwards options into must read exactly the keys the CPU port reads. Every sentinel is
 * spelled on its field, because a consumer who reads `parent[root] === 4294967295` and guesses is the failure this
 * file prevents. Types only: this file imports nothing at runtime.
 */

import type { F32, U32 } from "@graphty/graph-format";

/**
 * Design 3.3 line 830: what `breadthFirstSearch` returns. Satisfies the seam's `BfsResultLike` (`depth`, `parent`,
 * `order`, `visitedCount`) with `levels` and `switches` on top. Every array is bitwise reproducible (PD-14).
 */
export interface GpuBfsResult {
    /** Per node: its hop count from the source; `INVALID_INDEX` (4294967295) = unreached. */
    readonly depth: U32;
    /**
     * Per node: the SMALLEST node index `u` with `depth[u] + 1 == depth[v]` and an arc `u -> v` (PD-24: a post-pass over
     * the settled depths, so the chain to the source strictly decreases `depth`); `INVALID_INDEX` for the source and
     * for an unreached node.
     */
    readonly parent: U32;
    /** Length `visitedCount`: the reached nodes grouped by depth, ascending by node index within a depth (PD-14). */
    readonly order: U32;
    /** How many nodes were reached, the source included. */
    readonly visitedCount: number;
    /** `max depth + 1`; 1 for a source with no out-arcs. */
    readonly levels: number;
    /** Direction changes of the direction-optimizing search (a device counter, design 8.4); 0 on a top-down-only run. */
    readonly switches: number;
}

/**
 * Design 3.3 line 831: what `sssp` returns. Satisfies the seam's `SsspResultLike` (`dist: NumericVector` admits `F32`;
 * `predArc: U32`). `dist` is bitwise reproducible (PD-9) and `predArc` is a function of it alone (PD-27).
 */
export interface GpuSsspResult {
    /** Per node: its shortest distance from the source in f32; `+Infinity` = unreached, which includes beyond `cutoff`. */
    readonly dist: F32;
    /**
     * Per node `v`: a TIGHT arc `a` into `v` (`fround(dist[src(a)] + w(a)) == dist[v]`) whose source sits one PD-27 key
     * step below `v`, the smallest such arc index; the chain `v -> src(a) -> ...` always ends at the source.
     * `INVALID_INDEX` (4294967295) for the source and for an unreached node.
     */
    readonly predArc: U32;
    /** How many nodes have a finite `dist`, the source included. */
    readonly reachedCount: number;
}

/** Design 3.3 line 832: what `bellmanFord` returns. Satisfies the seam's `BellmanFordResultLike`. */
export interface GpuBellmanFordResult extends GpuSsspResult {
    /** When true, `dist` and `predArc` are the values of the last round, not shortest paths. */
    readonly hasNegativeCycle: boolean;
}
