/**
 * The betweenness result records (spec 3.3 lines 833-834). Types only: this file imports nothing at runtime. The
 * options are the CPU seam's own `BetweennessAcceleratorOptions` (`normalized`, `endpoints`, `sources`, `k`), as the
 * traversals take the seam's option types.
 */

import type { F32 } from "@graphty/graph-format";

import type { GpuScoresResult } from "./algorithms.js";

/**
 * Vertex betweenness (spec 3.3 line 833). A SAMPLED run (`sources` or `k`) returns the UNSCALED sum over the sources
 * actually run -- never extrapolated by `n / k` -- and `sourcesUsed` says how many that was; a caller who wants the
 * estimator of the full sum multiplies by `n / sourcesUsed`.
 * @public
 */
export interface GpuBetweennessResult extends GpuScoresResult {
    /** How many sources the scores sum over: `n` for an exact run, the sample size for a sampled one. */
    readonly sourcesUsed: number;
    /**
     * True when the scores are WRONG, not approximate: the shortest-path counts at one depth from one batch of sources
     * spread wider than f32's exponent range (about 2^226 between the smallest and the largest), so even the rescaled
     * counts could not hold them. Counts past 2^32 alone do not raise it; they are recounted rescaled per depth (a 40 x
     * 40 grid's 2.6e22 paths are exact). Measured from a corner of a grid: 235 x 235 raises it, 230 x 230 does not.
     * Never clamped, never silent; the `@graphty/algorithms` dispatcher throws `PathCountOverflowError` on it.
     */
    readonly sigmaOverflow: boolean;
}

/**
 * Edge betweenness (spec 3.3 line 834): one score per logical edge (`edgeCount`), the per-arc scores folded with
 * `foldArcs(s, perArc, "sum")` and halved on an undirected snapshot (the two arcs carry the pairs crossing the edge
 * in each direction). `sourcesUsed` and `sigmaOverflow` mean what they mean on `GpuBetweennessResult`.
 * @public
 */
export interface GpuEdgeScoresResult {
    readonly scores: F32;
    readonly precision: "f32";
    readonly sourcesUsed: number;
    readonly sigmaOverflow: boolean;
}
