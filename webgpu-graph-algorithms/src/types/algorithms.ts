/**
 * The result and option records of the GPU scoring and component algorithms. The option records are this
 * package's own, spelled MEMBER FOR MEMBER as the CPU seam spells them so one object literal satisfies both sides.
 * Types only: this file imports nothing at runtime.
 *
 * The CPU counterparts, in `@graphty/algorithms`' `indexed/accelerator.ts` since the seam landed:
 * `PageRankOptions` here is `PageRankOptionsLike` there (`{ dampingFactor?, maxIterations?, tolerance?,
 * weighted? }`); `HitsOptions`, `EigenvectorOptions` and `KatzOptions` here all correspond to the ONE
 * `HitsOptionsLike` there (`{ maxIterations?, tolerance?, weighted? }`), which is why every one of them carries
 * those three members and `KatzOptions` adds `alpha` / `beta` on top; `ComponentsOptions` has no CPU counterpart at
 * all, because `AlgorithmAccelerator.connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>` declares no
 * options parameter. `weighted`, never `weight`: that is the member name `@graphty/algorithms` uses.
 */

import type { F32, U32 } from "@graphty/graph-format";

/** Every score result carries `precision` so a consumer can label GPU scores. */
export interface GpuScoresResult {
    /** One score per node, in node-index order. */
    readonly scores: F32;
    /** The first iteration whose change fell below the tolerance, or `maxIterations` when none did. */
    readonly iterations: number;
    /** True when the run met the tolerance before `maxIterations`. */
    readonly converged: boolean;
    /** The scores' precision: always `"f32"`. */
    readonly precision: "f32";
}

/** Closeness scores with the number of sources run: `n` for the exact score, the sample's length for a sampled one. */
export interface GpuClosenessResult extends GpuScoresResult {
    /** How many sources the scores come from: `nodeCount` for the exact score, the sample's length for a sampled one. */
    readonly sourcesUsed: number;
}

/** `iterations` is the first iteration whose L1 delta fell below the tolerance, not the batch boundary. */
export interface GpuPageRankResult extends GpuScoresResult {
    /** The rank mass the last iteration found on nodes with no positive out-weight and spread over the teleport vector. */
    readonly danglingMass: number;
}

/** HITS hub and authority scores. */
export interface GpuHitsResult {
    /** One hub score per node, in node-index order, summing to 1. */
    readonly hubs: F32;
    /** One authority score per node, in node-index order, summing to 1. */
    readonly authorities: F32;
    /** The larger of the two chains' iteration counts. */
    readonly iterations: number;
    /** True when both chains met the tolerance. */
    readonly converged: boolean;
    /** The scores' precision: always `"f32"`. */
    readonly precision: "f32";
}

/** Component labels, dense 0..count-1 in first-seen order (renumberPartition); groups() is index-aligned. */
export interface GpuLabelResult {
    /** One component label per node, in node-index order; dense `0 .. count - 1` in first-seen order unless `renumber: false`. */
    readonly labels: U32;
    /** The number of components. */
    readonly count: number;
    /**
     * The member node indices of each component, in label order; built on the first call and cached.
     * @returns one array of node indices per component
     */
    groups(): U32[];
}

/** The CPU seam's PageRankOptionsLike, member for member. */
export interface PageRankOptions {
    /** The probability of following an arc; the rest teleports. Default 0.85. */
    readonly dampingFactor?: number | undefined;
    /** The most iterations to run; an integer >= 1. Default 100. */
    readonly maxIterations?: number | undefined;
    /** Converged when the L1 change of the whole vector falls below `tolerance * nodeCount`. Default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Read the snapshot's arc weights; false weighs every arc 1. Default true. */
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike, member for member. */
export interface HitsOptions {
    /** The most iterations to run; an integer >= 1. Default 100. */
    readonly maxIterations?: number | undefined;
    /** Converged when the L1 change of the whole vector falls below `tolerance * nodeCount`. Default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Read the snapshot's arc weights; false weighs every arc 1. Default true. */
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike again: `eigenvectorCentrality` takes that same shape on the CPU side. */
export interface EigenvectorOptions {
    /** The most iterations to run; an integer >= 1. Default 100. */
    readonly maxIterations?: number | undefined;
    /** Converged when the L1 change of the whole vector falls below `tolerance * nodeCount`. Default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Read the snapshot's arc weights; false weighs every arc 1. Default true. */
    readonly weighted?: boolean | undefined;
}

/** HitsOptionsLike plus Katz's own two: `alpha` is the attenuation and `beta` the constant term. */
export interface KatzOptions {
    /** The attenuation per step of a walk; must be finite. Converges only below the reciprocal of the largest eigenvalue. Default 0.1. */
    readonly alpha?: number | undefined;
    /** The constant every node receives each iteration; must be finite. Default 1. */
    readonly beta?: number | undefined;
    /** The most iterations to run; an integer >= 1. Default 100. */
    readonly maxIterations?: number | undefined;
    /** Converged when the L1 change of the whole vector falls below `tolerance * nodeCount`. Default 1e-6. */
    readonly tolerance?: number | undefined;
    /** Read the snapshot's arc weights; false weighs every arc 1. Default true. */
    readonly weighted?: boolean | undefined;
}

/** GPU-only (`renumber: true` by default: labels dense 0..count-1); the CPU seam's connectedComponents takes none. */
export interface ComponentsOptions {
    /** Renumber the labels dense `0 .. count - 1` in first-seen order; false returns the raw root indices. Default true. */
    readonly renumber?: boolean | undefined;
}
