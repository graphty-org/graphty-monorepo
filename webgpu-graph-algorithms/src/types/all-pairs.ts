/**
 * The all-pairs shortest-path result and option records (design 3.3 lines 813 and 835, 8.7, 9.7). The result is the
 * design's shape verbatim; every sentinel is spelled on its field, because a consumer who reads a `0` off the diagonal
 * or an `Infinity` off the matrix and guesses what it means is the failure this file prevents. Types only: this file
 * imports nothing at runtime.
 */

import type { F32 } from "@graphty/graph-format";

/**
 * Design 3.3 line 835: what `allPairsShortestPath` returns. Satisfies the seam's `ApspResultLike` (`dist:
 * NumericVector` admits `F32`).
 * @public
 */
export interface GpuApspResult {
    /**
     * The `n * n` distances, row-major: `dist[i * n + j]` is the shortest distance FROM `i` TO `j` (the i-to-j
     * direction on a directed snapshot). `+Infinity` when `j` is unreachable from `i`. The diagonal is `0` even when
     * a self-loop carries a weight. f32 throughout; hop counts are exact integers.
     */
    readonly dist: F32;
    /** The node count; `dist.length === n * n`. */
    readonly n: number;
}

/**
 * The options of `allPairsShortestPath` beyond `GpuRunOptions`. Nothing else: a cutoff would change the meaning of
 * `+Infinity`, and the design asks for none.
 * @public
 */
export interface ApspOptions {
    /**
     * Use the snapshot's weight column. Default: true when the snapshot has weights. `false` on a weighted snapshot
     * computes HOP COUNTS (every arc costs 1), not distances.
     */
    readonly weighted?: boolean | undefined;
}
