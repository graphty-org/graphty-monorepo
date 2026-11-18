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
    readonly scores: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Closeness scores with the number of sources run: `n` for the exact score, the sample's length for a sampled one. */
export interface GpuClosenessResult extends GpuScoresResult {
    readonly sourcesUsed: number;
}

/** `iterations` is the first iteration whose L1 delta fell below the tolerance, not the batch boundary. */
export interface GpuPageRankResult extends GpuScoresResult {
    readonly danglingMass: number;
}

/** HITS hub and authority scores. */
export interface GpuHitsResult {
    readonly hubs: F32;
    readonly authorities: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Component labels, dense 0..count-1 in first-seen order (renumberPartition); groups() is index-aligned. */
export interface GpuLabelResult {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}

/** The CPU seam's PageRankOptionsLike, member for member. */
export interface PageRankOptions {
    readonly dampingFactor?: number | undefined;
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike, member for member. */
export interface HitsOptions {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike again: `eigenvectorCentrality` takes that same shape on the CPU side. */
export interface EigenvectorOptions {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** HitsOptionsLike plus Katz's own two: `alpha` is the attenuation and `beta` the constant term. */
export interface KatzOptions {
    readonly alpha?: number | undefined;
    readonly beta?: number | undefined;
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** GPU-only (`renumber: true` by default: labels dense 0..count-1); the CPU seam's connectedComponents takes none. */
export interface ComponentsOptions {
    readonly renumber?: boolean | undefined;
}
