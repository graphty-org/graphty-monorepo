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
     * True when some pair of vertices is joined by more than 2^32 shortest paths: the u32 path counts wrapped and the
     * scores are WRONG, not approximate. Never clamped, never silent.
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
