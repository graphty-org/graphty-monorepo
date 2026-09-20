/**
 * The result and option records of the P7 algorithms (spec 3.3 lines 815-828, 9.7). The `Gpu*Result` shapes are the
 * design's verbatim; the option records are this package's own, spelled MEMBER FOR MEMBER as the CPU seam spells
 * them so one object literal satisfies both sides (the same D27 mirror rule src/types/options.ts follows for the
 * layout options). Types only: this file imports nothing at runtime.
 *
 * The CPU counterparts, when phase M8a lands them (plan 2026-09-19-webgpu-m8a-algorithms-seam, Task M8a-T8):
 * `PageRankOptions` here is `IndexedPageRankOptions` there (`{ dampingFactor?, maxIterations?, tolerance?,
 * weighted? }`); `HitsOptions`, `EigenvectorOptions` and `KatzOptions` here all correspond to the ONE
 * `HitsOptionsLike` there (`{ maxIterations?, tolerance?, weighted? }`), which is why every one of them carries
 * those three members and `KatzOptions` adds `alpha` / `beta` on top; `ComponentsOptions` has no CPU counterpart at
 * all, because `AlgorithmAccelerator.connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>` declares no
 * options parameter. `weighted`, never `weight`: that is the member name graph-format design 14.2 fixes at
 * `design/graph-format/graph-format-design.md:3892` and the one M8a ports.
 */

import type { F32, U32 } from "@graphty/graph-format";

/** Spec 3.3 line 815: every score result carries `precision` so a consumer can label GPU scores (Q-24). */
export interface GpuScoresResult {
    readonly scores: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Spec 3.3 line 816: `iterations` is the first iteration whose L1 delta fell below the tolerance (8.2), not the batch boundary. */
export interface GpuPageRankResult extends GpuScoresResult {
    readonly danglingMass: number;
}

/** Spec 3.3 line 817. */
export interface GpuHitsResult {
    readonly hubs: F32;
    readonly authorities: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Spec 3.3 line 818: labels dense 0..count-1 in first-seen order (renumberPartition); groups() is index-aligned. */
export interface GpuLabelResult {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}

/** The CPU seam's IndexedPageRankOptions, member for member (M8a Task M8a-T8; graph-format design 14.2 :3892). */
export interface PageRankOptions {
    readonly dampingFactor?: number | undefined;
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike, member for member (M8a Task M8a-T8). */
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

/** GPU-only (spec 3.3 line 797: `renumber: true` by default, Q-12); the CPU seam's connectedComponents takes none. */
export interface ComponentsOptions {
    readonly renumber?: boolean | undefined;
}
