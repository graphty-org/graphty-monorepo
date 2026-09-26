/**
 * THE kernel registry (spec 3.5; contract 3.10): every WGSL module the package compiles, keyed by id, with the
 * binding table, the override declarations, the generated uniform / storage blocks and the feature needs from
 * which src/kernel/wgsl.ts emits the bind declarations and src/kernel/pipeline-cache.ts derives the explicit
 * bind-group layouts. A variant cannot exist without an entry here: the compile tests, the bind-group-budget
 * test and PipelineCache.warm() iterate this table. P1-T4 lands degree, reduce, fill, fa2-repulsion-exact (K3)
 * and fa2-speed-finalize (K4) together with every generated block of contract 3.10.2; P2-T2 lands
 * segmented-reduce; P3-T2 adds fa2-stats-finalize (K1), fa2-attraction (K2), fa2-integrate (K5) and
 * fa2-to-scene; M8b-T3 adds the seven P7 entries: spmv-pull, pr-scale, pr-finalize, wcc-link-sample,
 * wcc-link-edges, wcc-compress and wcc-sample. P4-T1 adds indirect-finalize; the other P4 entries follow, one task
 * each (the P4 plan, PD-1). P8-T3 opens the P8 run of nine appends (the P8 plan, PD-2) with compact-scatter,
 * dedupe-claim and dedupe-filter; P8-T4 adds frontier-finalize with the FrontierCounters and FrontierParams blocks;
 * P8-T5 adds advance-expand; P8-T6 adds bfs-contract and sssp-pred; P8-T7 adds bfs-fused; P8-T8 adds bfs-bottom-up,
 * bfs-bitset-build and bfs-unvisited-flags; P8-T9 adds sssp-relax; P8-T10 adds bf-relax with the BfParams and BfFlags
 * blocks; P8-T11 adds closeness-sweep and closeness-reduce. This file is the only importer of src/wgsl/** (spec 3.2;
 * test/layers.test.ts).
 */

import { STATE_HEADER_BYTES } from "./constants.js";
import { WebGpuGraphError } from "./errors.js";
import { UniformBlock } from "./kernel/struct-block.js";
import { type BindingDecl, type OverrideDecl, type WgslModuleSpec } from "./kernel/wgsl.js";
import { type CoreBinding } from "./memory/residency.js";
import { type Binding } from "./types/memory.js";
import { advanceExpandWgsl } from "./wgsl/advance-expand.wgsl.js";
import { bfRelaxWgsl } from "./wgsl/bf-relax.wgsl.js";
import { bfsBitsetBuildWgsl } from "./wgsl/bfs-bitset-build.wgsl.js";
import { bfsBottomUpWgsl } from "./wgsl/bfs-bottom-up.wgsl.js";
import { bfsContractWgsl } from "./wgsl/bfs-contract.wgsl.js";
import { bfsFusedWgsl } from "./wgsl/bfs-fused.wgsl.js";
import { bfsNextDegreeWgsl } from "./wgsl/bfs-next-degree.wgsl.js";
import { bfsUnvisitedFlagsWgsl } from "./wgsl/bfs-unvisited-flags.wgsl.js";
import { closenessReduceWgsl } from "./wgsl/closeness-reduce.wgsl.js";
import { closenessSweepWgsl } from "./wgsl/closeness-sweep.wgsl.js";
import { compactScatterWgsl } from "./wgsl/compact-scatter.wgsl.js";
import { countingScatterWgsl } from "./wgsl/counting-scatter.wgsl.js";
import { dedupeClaimWgsl } from "./wgsl/dedupe-claim.wgsl.js";
import { dedupeFilterWgsl } from "./wgsl/dedupe-filter.wgsl.js";
import { degreeWgsl } from "./wgsl/degree.wgsl.js";
import { fa2AttractionWgsl } from "./wgsl/fa2-attraction.wgsl.js";
import { fa2IntegrateWgsl } from "./wgsl/fa2-integrate.wgsl.js";
import { fa2RepulsionExactWgsl } from "./wgsl/fa2-repulsion-exact.wgsl.js";
import { fa2SpeedFinalizeWgsl } from "./wgsl/fa2-speed-finalize.wgsl.js";
import { fa2StatsFinalizeWgsl } from "./wgsl/fa2-stats-finalize.wgsl.js";
import { fa2ToSceneWgsl } from "./wgsl/fa2-to-scene.wgsl.js";
import { fillWgsl } from "./wgsl/fill.wgsl.js";
import { frontierFinalizeWgsl } from "./wgsl/frontier-finalize.wgsl.js";
import { gridCellKeyWgsl } from "./wgsl/grid-cell-key.wgsl.js";
import { gridCentroidWgsl } from "./wgsl/grid-centroid.wgsl.js";
import { gridCentroidHubWgsl } from "./wgsl/grid-centroid-hub.wgsl.js";
import { gridDownsampleWgsl } from "./wgsl/grid-downsample.wgsl.js";
import { gridFarFieldWgsl } from "./wgsl/grid-far-field.wgsl.js";
import { gridNearFieldWgsl } from "./wgsl/grid-near-field.wgsl.js";
import { histogramWgsl } from "./wgsl/histogram.wgsl.js";
import { indirectFinalizeWgsl } from "./wgsl/indirect-finalize.wgsl.js";
import { prFinalizeWgsl } from "./wgsl/pr-finalize.wgsl.js";
import { prScaleWgsl } from "./wgsl/pr-scale.wgsl.js";
import { radixHistWgsl } from "./wgsl/radix-hist.wgsl.js";
import { radixScatterWgsl } from "./wgsl/radix-scatter.wgsl.js";
import { reduceWgsl } from "./wgsl/reduce.wgsl.js";
import { scanAddWgsl } from "./wgsl/scan-add.wgsl.js";
import { scanBlockWgsl } from "./wgsl/scan-block.wgsl.js";
import { segmentedReduceWgsl } from "./wgsl/segmented-reduce.wgsl.js";
import { spmvPullWgsl } from "./wgsl/spmv-pull.wgsl.js";
import { ssspPredWgsl } from "./wgsl/sssp-pred.wgsl.js";
import { ssspRelaxWgsl } from "./wgsl/sssp-relax.wgsl.js";
import { wccCompressWgsl } from "./wgsl/wcc-compress.wgsl.js";
import { wccLinkEdgesWgsl } from "./wgsl/wcc-link-edges.wgsl.js";
import { wccLinkSampleWgsl } from "./wgsl/wcc-link-sample.wgsl.js";
import { wccSampleWgsl } from "./wgsl/wcc-sample.wgsl.js";

/** Every module id of P1-P4, P7 and P8 (later ids are appended, never renamed). */
export type KernelId =
    | "degree"
    | "reduce"
    | "fill"
    | "segmented-reduce"
    | "fa2-stats-finalize"
    | "fa2-attraction"
    | "fa2-repulsion-exact"
    | "fa2-speed-finalize"
    | "fa2-integrate"
    | "fa2-to-scene"
    | "spmv-pull"
    | "pr-scale"
    | "pr-finalize"
    | "wcc-link-sample"
    | "wcc-link-edges"
    | "wcc-compress"
    | "wcc-sample"
    | "indirect-finalize"
    | "scan-block"
    | "scan-add"
    | "histogram"
    | "counting-scatter"
    | "radix-hist"
    | "radix-scatter"
    | "grid-cell-key"
    | "grid-centroid"
    | "grid-centroid-hub"
    | "grid-downsample"
    | "grid-far-field"
    | "grid-near-field"
    | "compact-scatter"
    | "dedupe-claim"
    | "dedupe-filter"
    | "frontier-finalize"
    | "advance-expand"
    | "bfs-contract"
    | "sssp-pred"
    | "bfs-fused"
    | "bfs-bottom-up"
    | "bfs-bitset-build"
    | "bfs-unvisited-flags"
    | "bfs-next-degree"
    | "sssp-relax"
    | "bf-relax"
    | "closeness-sweep"
    | "closeness-reduce";

/** One registry entry: everything of a WgslModuleSpec except the per-variant overrides and snippets. */
export interface KernelEntry {
    readonly id: KernelId;
    readonly body: string;
    readonly entryPoint: string;
    readonly bindings: readonly BindingDecl[];
    readonly overrideDecls: readonly OverrideDecl[];
    readonly uniforms: readonly UniformBlock[];
    /** ["subgroups"] when the body calls a reduction helper (the twin axis), else []. */
    readonly needs: readonly "subgroups"[];
    /** The snippet marker names the body carries (segmented-reduce: ["VALUE"]). */
    readonly snippetSlots: readonly string[];
    /** The phase the entry landed in (documentation and the compile-matrix filter). */
    readonly phase: "P1" | "P2" | "P3" | "P4" | "P7" | "P8";
}

// ---- the generated blocks (spec 5.3; contract 3.10.2): field order = byte order, offsets in the JSDoc

/** `RangeParams` (uniform, 32 B): rows `[start, end)` @0 / @4 of the dispatch, the bound arc window `[arcBase, arcEnd)` @8 / @12 (0 and arcCount when not windowed), `accumulate` @16 (1 combines into `out[i]` instead of overwriting: the P4 windowed loop), `n` @20 (the node count that bounds neighbour indices), `pad0` @24, `pad1` @28. */
export const RANGE_PARAMS: UniformBlock = UniformBlock.define("RangeParams", [
    ["start", "u32"],
    ["end", "u32"],
    ["arcBase", "u32"],
    ["arcEnd", "u32"],
    ["accumulate", "u32"],
    ["n", "u32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
]);

/** `ReduceParams` (uniform, 16 B): `count` @0 elements of the level, `outOffset` @4 (the element index the level writes at), `level` @8, `pad0` @12. */
export const REDUCE_PARAMS: UniformBlock = UniformBlock.define("ReduceParams", [
    ["count", "u32"],
    ["outOffset", "u32"],
    ["level", "u32"],
    ["pad0", "u32"],
]);

/** `FillParams` (uniform, 16 B): `count` @0 words, `value` @4, `mode` @8 (0 = the constant `value`, 1 = iota `i + value`), `pad0` @12. */
export const FILL_PARAMS: UniformBlock = UniformBlock.define("FillParams", [
    ["count", "u32"],
    ["value", "u32"],
    ["mode", "u32"],
    ["pad0", "u32"],
]);

/** `Fa2Params` (uniform, 128 B; spec 7.3): the per-iteration ForceAtlas2 parameters -- `n` @0, `dim` @4, `flags` @8 (bit 0 = FA2_FLAG_FIRST), `tierStart` @12, `tierEnd` @16, `iterationIndex` @20, `seed` @24, `nearMax` @28, `scalingRatio` @32, `gravity` @36, `jitterTolerance` @40, `scale` @44, `center` @48 (xyz, w 0), `settleThreshold` @64, `extentFactor` @68, `gridMax` @72, `levels` @76, `arcBase` @80 / `arcEnd` @84 (the bound arc window of K2, 0 and arcCount in the layout), `accumulate` @88 (1 combines into `force`: the windowed pattern), `hiEnd` @92 / `midEnd` @124 (the degreeOrder tier boundaries, PD-7; both 0 without a permutation); the P5 model fields (PD-3): `frK` @96 (the FR optimal distance), `temperature` @100 (the FR temperature of this iteration), `springLength` @104, `springCoefficient` @108, `coulomb` @112 (ngraph's `gravity`, negative repels), `dragCoefficient` @116, `timeStep` @120; 128 B. */
export const FA2_PARAMS: UniformBlock = UniformBlock.define("Fa2Params", [
    ["n", "u32"],
    ["dim", "u32"],
    ["flags", "u32"],
    ["tierStart", "u32"],
    ["tierEnd", "u32"],
    ["iterationIndex", "u32"],
    ["seed", "u32"],
    ["nearMax", "u32"],
    ["scalingRatio", "f32"],
    ["gravity", "f32"],
    ["jitterTolerance", "f32"],
    ["scale", "f32"],
    ["center", "vec4f"],
    ["settleThreshold", "f32"],
    ["extentFactor", "f32"],
    ["gridMax", "u32"],
    ["levels", "u32"],
    ["arcBase", "u32"],
    ["arcEnd", "u32"],
    ["accumulate", "u32"],
    ["hiEnd", "u32"],
    ["frK", "f32"],
    ["temperature", "f32"],
    ["springLength", "f32"],
    ["springCoefficient", "f32"],
    ["coulomb", "f32"],
    ["dragCoefficient", "f32"],
    ["timeStep", "f32"],
    ["midEnd", "u32"],
]);

/** `Fa2State` (storage, padded to STATE_HEADER_BYTES = 256; spec 7.3): the device-resident controller state the finalize kernels write and the host reads back for stats -- `speed` @0, `speedEfficiency` @4, `swing` @8, `traction` @12, `centroid` @16, `rmsRadius` @32, `radius` @36, `meanDisplacement` @40, `iteration` @44, `min` @48, `max` @64, `gridMin` @80 (P4), `eps` @96 (P4), `settledCount` @100, `outsideGrid` @104 (P4), `maxCellOccupancy` @108 (P4), `temperature` @112 (FR, written by K1 under STATS_MODE 1), `kineticEnergy` @116 (the preset, K1 under STATS_MODE 2), `frEnergy` @120 / `frProgress` @124 (the FR adaptive cooling), `invCellSize` @128 (P4, PD-10: `1 / cellSize`, written by K1 beside `cellSize` in `gridMin.w`; G1 multiplies by it so every key is bitwise reproducible), `reserved0` @132 (f32), `reserved1` @136 (vec2f), `reserved2` .. `reserved8` @144 .. @240. */
export const FA2_STATE: UniformBlock = UniformBlock.define(
    "Fa2State",
    [
        ["speed", "f32"],
        ["speedEfficiency", "f32"],
        ["swing", "f32"],
        ["traction", "f32"],
        ["centroid", "vec4f"],
        ["rmsRadius", "f32"],
        ["radius", "f32"],
        ["meanDisplacement", "f32"],
        ["iteration", "u32"],
        ["min", "vec4f"],
        ["max", "vec4f"],
        ["gridMin", "vec4f"],
        ["eps", "f32"],
        ["settledCount", "u32"],
        ["outsideGrid", "u32"],
        ["maxCellOccupancy", "u32"],
        ["temperature", "f32"],
        ["kineticEnergy", "f32"],
        ["frEnergy", "f32"],
        ["frProgress", "u32"],
        ["invCellSize", "f32"],
        ["reserved0", "f32"],
        ["reserved1", "vec2f"],
        ["reserved2", "vec4f"],
        ["reserved3", "vec4f"],
        ["reserved4", "vec4f"],
        ["reserved5", "vec4f"],
        ["reserved6", "vec4f"],
        ["reserved7", "vec4f"],
        ["reserved8", "vec4f"],
    ],
    { layout: "storage", padTo: STATE_HEADER_BYTES },
);

/** `Fa2Trace` (storage record, 32 B; spec 7.3): one per-iteration trace record -- `swing` @0, `traction` @4, `speed` @8, `speedEfficiency` @12 (written by K4), `meanDisplacement` @16, `settledCount` @20, `iteration` @24 (written by K1), `modelScalar` @28 (K1: the temperature under STATS_MODE 1, the kinetic energy under 2, 0 under 0); the trace region is `array<Fa2Trace>` at byte offset STATE_HEADER_BYTES of the state buffer. */
export const FA2_TRACE: UniformBlock = UniformBlock.define(
    "Fa2Trace",
    [
        ["swing", "f32"],
        ["traction", "f32"],
        ["speed", "f32"],
        ["speedEfficiency", "f32"],
        ["meanDisplacement", "f32"],
        ["settledCount", "u32"],
        ["iteration", "u32"],
        ["modelScalar", "f32"],
    ],
    { layout: "storage" },
);

/** `Fa2Partial` (storage record, 64 B; spec 7.3): one per-workgroup partial -- `sum` @0 (xyz = sum of positions, w = sum of |p - centroid|^2), `min` @16, `max` @32 (w = max of |p - centroid|^2, the exact layoutRadius source), written by K5; `swingTraction` @48 (written by K3's epilogue); `dispFree` @56 (x = sum |dp| over free rows, y = the free count as an f32 <= 256, written by K5). */
export const FA2_PARTIAL: UniformBlock = UniformBlock.define(
    "Fa2Partial",
    [
        ["sum", "vec4f"],
        ["min", "vec4f"],
        ["max", "vec4f"],
        ["swingTraction", "vec2f"],
        ["dispFree", "vec2f"],
    ],
    { layout: "storage" },
);

/** `SpmvParams` (uniform, 32 B; spec 8.2): `n` @0 rows of the pull, the bound arc window `[arcBase, arcEnd)` @4 / @8 (0 and arcCount when not windowed), the grid-stride step `stride` @12, `alpha` @16, `beta` @20 (the `1 - alpha` term), `uniformP` @24 (the uniform personalization mass `1 / n`, 0 for a pure SpMV), `start` @28 (the first row of the dispatch; TIER 0 strides from it, the tiers index from it). */
export const SPMV_PARAMS: UniformBlock = UniformBlock.define("SpmvParams", [
    ["n", "u32"],
    ["arcBase", "u32"],
    ["arcEnd", "u32"],
    ["stride", "u32"],
    ["alpha", "f32"],
    ["beta", "f32"],
    ["uniformP", "f32"],
    ["start", "u32"],
]);

/** `PrParams` (uniform, 32 B; spec 8.2): `n` @0, `groups` @4 (the per-workgroup partial count the finalize folds), `iteration` @8 (1-based), `trackConvergence` @12 (1 records firstConverged), `convergeThreshold` @16 (`tolerance * n`, the design's `delta < tol * n`), `pad0` @20, `pad1` @24, `pad2` @28. */
export const PR_PARAMS: UniformBlock = UniformBlock.define("PrParams", [
    ["n", "u32"],
    ["groups", "u32"],
    ["iteration", "u32"],
    ["trackConvergence", "u32"],
    ["convergeThreshold", "f32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
    ["pad2", "u32"],
]);

/**
 * `PrPartial` (storage record, 32 B; spec 8.2). Element 0 is the HEADER, whose first 16 bytes are exactly the four
 * fields the design names -- `danglingMass` @0, `delta` @4, `firstConvergedIteration` @8, `iteration` @12 -- plus
 * `norm` @16, which M8b adds so HITS / eigenvector / Katz keep their normaliser on the device (PD-10). Element
 * `1 + g` is workgroup g's partial: it uses `danglingMass`, `delta` and `norm` as three sums and leaves the two u32
 * fields zero.
 */
export const PR_PARTIAL: UniformBlock = UniformBlock.define(
    "PrPartial",
    [
        ["danglingMass", "f32"],
        ["delta", "f32"],
        ["firstConverged", "u32"],
        ["iteration", "u32"],
        ["norm", "f32"],
        ["pad0", "f32"],
        ["pad1", "f32"],
        ["pad2", "f32"],
    ],
    { layout: "storage" },
);

/** `WccParams` (uniform, 32 B; spec 8.3): `n` @0, `items` @4 (rows for a sample round, edges for an edge round, 1024 for the sampler), `stride` @8, `r` @12 (the neighbour index of the sampled round, and the sampler's seed), `flagIndex` @16 (the changed word inside `comp`, PD-4), `giant` @20 (`U32_MAX` before the sample), `maxSteps` @24, `pad0` @28. */
export const WCC_PARAMS: UniformBlock = UniformBlock.define("WccParams", [
    ["n", "u32"],
    ["items", "u32"],
    ["stride", "u32"],
    ["r", "u32"],
    ["flagIndex", "u32"],
    ["giant", "u32"],
    ["maxSteps", "u32"],
    ["pad0", "u32"],
]);

/** `IndirectParams` (uniform, 16 B; spec 5.4): `countIndex` @0 (the word of `counters` holding the count), `wg` @4 (the consumer's workgroup size), `slot` @8 (the 16-byte args slot to write), `pad0` @12. */
export const INDIRECT_PARAMS: UniformBlock = UniformBlock.define("IndirectParams", [
    ["countIndex", "u32"],
    ["wg", "u32"],
    ["slot", "u32"],
    ["pad0", "u32"],
]);

/** `ScanParams` (uniform, 16 B; spec 6 row 2): `count` @0 (the u32 words of the level), `pad0` @4, `pad1` @8, `pad2` @12. */
export const SCAN_PARAMS: UniformBlock = UniformBlock.define("ScanParams", [
    ["count", "u32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
    ["pad2", "u32"],
]);

/** `GridLevelParams` (uniform, 32 B; spec 7.7 G5, P4-T9): `childBase` @0 and `parentBase` @4 (the first cell of the child / parent level inside the pyramid), `parentSide` @8, `parentCells` @12 (`parentSide^dim`), `depth` @16 (1 in 2D, 2 in 3D), `pad0` @20, `pad1` @24, `pad2` @28. */
export const GRID_LEVEL_PARAMS: UniformBlock = UniformBlock.define("GridLevelParams", [
    ["childBase", "u32"],
    ["parentBase", "u32"],
    ["parentSide", "u32"],
    ["parentCells", "u32"],
    ["depth", "u32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
    ["pad2", "u32"],
]);

/** `HistParams` (uniform, 16 B; spec 6 row 5): `count` @0 (the keys), `bins` @4 (a key >= bins is not counted), `pad0` @8, `pad1` @12. */
export const HIST_PARAMS: UniformBlock = UniformBlock.define("HistParams", [
    ["count", "u32"],
    ["bins", "u32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
]);

/** `RadixParams` (uniform, 16 B; spec 6 row 6): `count` @0 (the pairs), `shift` @4 (the pass's digit shift, 8 x pass), `groups` @8 (ceil(count / WG), the stride of the digit-major table), `pad0` @12. */
export const RADIX_PARAMS: UniformBlock = UniformBlock.define("RadixParams", [
    ["count", "u32"],
    ["shift", "u32"],
    ["groups", "u32"],
    ["pad0", "u32"],
]);

/** `CompactParams` (uniform, 16 B; spec 6 row 4, P8-T3): `count` @0 (the entries, or the capacity a device count is clamped to), `outIndex` @4 (the word of `outCount` that receives the output count: the block is bound whole because a four-byte word is never 256-aligned), `countIndex` @8 (the word of the counters block holding the entry count, or `U32_MAX` for a host-known count; `compact-scatter` ignores it), `pad0` @12. */
export const COMPACT_PARAMS: UniformBlock = UniformBlock.define("CompactParams", [
    ["count", "u32"],
    ["outIndex", "u32"],
    ["countIndex", "u32"],
    ["stride", "u32"],
]);

/**
 * `FrontierCounters` (storage, 112 B; design 6 row 7, P8-T4, PD-8): EVERY counter of the frontier family is a word of
 * this one block, byte offset 4 x index, because a four-byte word is never a legal storage-binding offset and the
 * device-side selector must reach every count it acts on through one binding; every kernel binds it as
 * `array<atomic<u32>>` and indexes by the `W` record of src/primitives/frontier.ts, and the host decodes the result
 * copy with `FRONTIER_COUNTERS.read`. `frontierCount` @0 (role 0 rotates it in from word 1; never seeded),
 * `nextFrontierCount` @4 (the claim kernels' append span; the BFS seed is 1), `frontierDegreeSum` @8,
 * `prevFrontierCount` @12, `prevDegreeSum` @16, `unvisitedCount` @20, `unvisitedDegreeSum` @24,
 * `unvisitedListLen` @28 (P8-T8), `edgeCount` @32 (clamped by role 1), `edgeCountUnclamped` @36 (the overflow
 * detector, PD-23), `overflowLevels` @40, `level` @44 (the current level; the seed is U32_MAX so the first boundary
 * lands on 0), `visitedCount` @48, `switches` @52, `direction` @56, `done` @60 (the four bytes the host reads per
 * submit), `arcsScanned` @64, `fusedLevels` @68, `twoPhaseLevels` @72, `bottomUpLevels` @76, `farCount` @80,
 * `nextFarCount` @84, `thresholdBits` @88, `deltaBits` @92 (P8-T9), `path` @96 (what the level's kernels run, written
 * by the selector: 0 nothing, 1 two-phase, 2 fused, 3 bottom-up, 4 the fused retry, 5 a near SSSP round, 6 a far
 * one; every level kernel is a direct dispatch that reads it first -- G8-F5), `nextDegreeSum` @100 (issue #391: the
 * out-degree sum of the vertices the level claimed, accumulated by `bfs-next-degree` at the end of every level and
 * read, subtracted and zeroed by the next boundary -- Beamer's m_f measured on the frontier the boundary decides
 * for, not on the one it has just expanded). The words nothing writes before P8-T8 / P8-T9 are declared now because
 * the byte layout is what the single result copy decodes.
 */
export const FRONTIER_COUNTERS: UniformBlock = UniformBlock.define(
    "FrontierCounters",
    [
        ["frontierCount", "u32"],
        ["nextFrontierCount", "u32"],
        ["frontierDegreeSum", "u32"],
        ["prevFrontierCount", "u32"],
        ["prevDegreeSum", "u32"],
        ["unvisitedCount", "u32"],
        ["unvisitedDegreeSum", "u32"],
        ["unvisitedListLen", "u32"],
        ["edgeCount", "u32"],
        ["edgeCountUnclamped", "u32"],
        ["overflowLevels", "u32"],
        ["level", "u32"],
        ["visitedCount", "u32"],
        ["switches", "u32"],
        ["direction", "u32"],
        ["done", "u32"],
        ["arcsScanned", "u32"],
        ["fusedLevels", "u32"],
        ["twoPhaseLevels", "u32"],
        ["bottomUpLevels", "u32"],
        ["farCount", "u32"],
        ["nextFarCount", "u32"],
        ["thresholdBits", "u32"],
        ["deltaBits", "u32"],
        ["path", "u32"],
        ["nextDegreeSum", "u32"],
    ],
    { layout: "storage" },
);

/**
 * `FrontierParams` (uniform, 80 B; P8-T4): the params block every P8 kernel except the three compact / dedupe
 * primitives and `bf-relax` binds -- `role` @0 (the finalize role), `slotBase` @4 (`level x FRONTIER_CANDIDATES`),
 * `wg` @8 (the consumers' workgroup size), `alpha` @12, `beta` @16 (Beamer's thresholds, P8-T8), `fusedMax` @20,
 * `edgeCapacity` @24, `maxDepth` @28, `n` @32, `mode` @36 (BFS: 0 auto, 1 top-down only; `sssp-pred`: the PD-27 key
 * rule), `cutoffBits` @40, `arcBase` @44, `arcEnd` @48 (the bound arc window), `predKind` @52 (0 arc, 1 node),
 * `bitsBase` @56, `source` @60, `stride` @64 (a grid-stride plan's stride), `firstOfSubmit` @68 (the boundary's index
 * inside its submit, clamped to 2: the unvisited-count subtraction runs at >= 1, the degree-sum one at >= 2),
 * `iteration` @72 (an `sssp-pred` hop pass, P8-T9), `pad1` @76.
 */
export const FRONTIER_PARAMS: UniformBlock = UniformBlock.define("FrontierParams", [
    ["role", "u32"],
    ["slotBase", "u32"],
    ["wg", "u32"],
    ["alpha", "u32"],
    ["beta", "u32"],
    ["fusedMax", "u32"],
    ["edgeCapacity", "u32"],
    ["maxDepth", "u32"],
    ["n", "u32"],
    ["mode", "u32"],
    ["cutoffBits", "u32"],
    ["arcBase", "u32"],
    ["arcEnd", "u32"],
    ["predKind", "u32"],
    ["bitsBase", "u32"],
    ["source", "u32"],
    ["stride", "u32"],
    ["firstOfSubmit", "u32"],
    ["iteration", "u32"],
    ["pad1", "u32"],
]);

/** `BfParams` (uniform, 16 B; P8-T10): `edgeCount` @0 (the logical edges of the `edgeList` view), `stride` @4 (the grid-stride plan's stride), `maxRetries` @8 (PD-12's compare-exchange bound), `cutoffBits` @12 (the f32 bit pattern of the CPU port's `cutoff`, `+Inf` when absent). */
export const BF_PARAMS: UniformBlock = UniformBlock.define("BfParams", [
    ["edgeCount", "u32"],
    ["stride", "u32"],
    ["maxRetries", "u32"],
    ["cutoffBits", "u32"],
]);

/** `BfFlags` (storage, 16 B; P8-T10): the two words `bf-relax` raises and the host reads back after every batch of rounds -- `changed` @0 (some exchange succeeded), `retryExhausted` @4 (some lane hit `maxRetries`, PD-12), `pad0` @8, `pad1` @12. Bound by the kernel as `array<atomic<u32>>`; the block is the host's decoder. */
export const BF_FLAGS: UniformBlock = UniformBlock.define(
    "BfFlags",
    [
        ["changed", "u32"],
        ["retryExhausted", "u32"],
        ["pad0", "u32"],
        ["pad1", "u32"],
    ],
    { layout: "storage" },
);

// ---- the entries (contract 3.10.1; group 0 = graph, 1 = state, 2 = params, 3 = cold)

/**
 * One binding declaration of contract 3.9, so the tables below read like the rows of 3.10.1.
 * @param group - the bind group (0 graph, 1 state, 2 params, 3 cold)
 * @param binding - the slot inside the group
 * @param name - the WGSL variable name (also the KernelBindings key)
 * @param kind - "storage" (read_write), "storage-ro" (read) or "uniform"
 * @param wgslType - the element / struct type text
 * @returns the declaration
 */
function decl(
    group: 0 | 1 | 2 | 3,
    binding: number,
    name: string,
    kind: BindingDecl["kind"],
    wgslType: string,
): BindingDecl {
    return { group, binding, name, kind, wgslType };
}

/** The four group-0 graph slots of every row-walking kernel (spec 3.5): rowPtr, colIdx, weights | dummy, perm | dummy -- all read-only, so the dummies never alias a writable slot (3.10.1). */
const GRAPH_SLOTS: readonly BindingDecl[] = [
    decl(0, 0, "rowPtr", "storage-ro", "array<u32>"),
    decl(0, 1, "colIdx", "storage-ro", "array<u32>"),
    decl(0, 2, "weights", "storage-ro", "array<f32>"),
    decl(0, 3, "perm", "storage-ro", "array<u32>"),
];

/** `degree` (3.10.1): 5 storage bindings; only the standard USE_PERM / HAS_WEIGHTS overrides. */
const DEGREE: KernelEntry = {
    id: "degree",
    body: degreeWgsl,
    entryPoint: "degree",
    bindings: GRAPH_SLOTS.concat(decl(1, 0, "out", "storage", "array<u32>"), decl(2, 0, "P", "uniform", "RangeParams")),
    overrideDecls: [],
    uniforms: [RANGE_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P1",
};

/** `reduce` (3.10.1): the multi-level reduction; OP 0 sum / 1 min / 2 max, DTYPE 0 f32 / 1 u32 / 2 vec4f, FINAL for the one-workgroup level; 2 storage bindings; calls the reduction helpers. */
const REDUCE: KernelEntry = {
    id: "reduce",
    body: reduceWgsl,
    entryPoint: "reduce",
    bindings: [
        decl(1, 0, "src", "storage-ro", "array<u32>"),
        decl(1, 1, "out", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "ReduceParams"),
    ],
    overrideDecls: [
        { name: "OP", type: "u32", default: 0 },
        { name: "DTYPE", type: "u32", default: 0 },
        { name: "FINAL", type: "bool", default: false },
    ],
    uniforms: [REDUCE_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P1",
};

/** `fill` (3.10.1): dst[i] = value (mode 0) or i + value (mode 1) over `count` words; 1 storage binding. */
const FILL: KernelEntry = {
    id: "fill",
    body: fillWgsl,
    entryPoint: "fill",
    bindings: [decl(1, 0, "dst", "storage", "array<u32>"), decl(2, 0, "P", "uniform", "FillParams")],
    overrideDecls: [],
    uniforms: [FILL_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P1",
};

/** `segmented-reduce` (3.10.1): the per-row fold of the VALUE snippet over the CSR rows; OP 0 sum / 1 min / 2 max, TIER 0 thread-per-row / 1 32-lanes-per-row / 2 workgroup-per-row (the degreeOrder tiers, P4 PD-6) plus the standard USE_PERM / HAS_WEIGHTS; 5 storage bindings; one snippet slot; calls the reduction helpers (TIER 2). */
const SEGMENTED_REDUCE: KernelEntry = {
    id: "segmented-reduce",
    body: segmentedReduceWgsl,
    entryPoint: "segmented_reduce",
    bindings: GRAPH_SLOTS.concat(decl(1, 0, "out", "storage", "array<f32>"), decl(2, 0, "P", "uniform", "RangeParams")),
    overrideDecls: [
        { name: "OP", type: "u32", default: 0 },
        { name: "TIER", type: "u32", default: 0 },
    ],
    uniforms: [RANGE_PARAMS],
    needs: ["subgroups"],
    snippetSlots: ["VALUE"],
    phase: "P2",
};

/** `fa2-stats-finalize` (K1, 3.10.1): the one-workgroup fold of the previous integrate's partials into the state block and the K1 half of the trace record; STATS_MODE 0 FA2 / 1 FR temperature / 2 kinetic energy (P5); the grid frame, counts and hub-counter reset under `P.gridMax > 0` (P4-T10, PD-14: `cellHist` and `hubCounters` are bound to dummies on the exact tier); 5 storage bindings; calls the reduction helpers. */
const FA2_STATS_FINALIZE: KernelEntry = {
    id: "fa2-stats-finalize",
    body: fa2StatsFinalizeWgsl,
    entryPoint: "stats_finalize",
    bindings: [
        decl(1, 0, "partials", "storage-ro", "array<Fa2Partial>"),
        decl(1, 1, "S", "storage", "Fa2State"),
        decl(1, 2, "T", "storage", "array<Fa2Trace>"),
        decl(1, 3, "cellHist", "storage-ro", "array<u32>"),
        decl(1, 4, "hubCounters", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [{ name: "STATS_MODE", type: "u32", default: 0 }],
    uniforms: [FA2_PARAMS, FA2_STATE, FA2_TRACE, FA2_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P3",
};

/** `fa2-attraction` (K2, 3.10.1): the attraction gather over the CSR rows (the first writer of `force` each iteration); LINLOG / DISTRIBUTED / TIER 0 thread-per-row / 1 32-lanes-per-row / 2 workgroup-per-row (P4 PD-6) plus the standard USE_PERM / HAS_WEIGHTS; LAW 0 FA2 / 1 FR / 2 spring (P5); 6 storage bindings; calls the reduction helpers (TIER 2). */
const FA2_ATTRACTION: KernelEntry = {
    id: "fa2-attraction",
    body: fa2AttractionWgsl,
    entryPoint: "attraction",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "force", "storage", "array<f32>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ),
    overrideDecls: [
        { name: "LINLOG", type: "bool", default: false },
        { name: "DISTRIBUTED", type: "bool", default: false },
        { name: "TIER", type: "u32", default: 0 },
        { name: "LAW", type: "u32", default: 0 },
    ],
    uniforms: [FA2_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P3",
};

/** `fa2-repulsion-exact` (K3, 3.10.1): the tiled all-pairs repulsion with the gravity and swing / traction epilogue; LAW 0 FA2 / 1 FR / 2 coulomb (P5); 6 storage bindings (`oldForce` read-only: it only calls load_old); calls the reduction helpers. */
const FA2_REPULSION_EXACT: KernelEntry = {
    id: "fa2-repulsion-exact",
    body: fa2RepulsionExactWgsl,
    entryPoint: "repulsion",
    bindings: [
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "S", "storage", "Fa2State"),
        decl(1, 2, "force", "storage", "array<f32>"),
        decl(1, 3, "oldForce", "storage-ro", "array<f32>"),
        decl(1, 4, "fixedMask", "storage-ro", "array<u32>"),
        decl(1, 5, "partials", "storage", "array<Fa2Partial>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [
        { name: "SWING_MODE", type: "u32", default: 0 },
        { name: "STRONG_GRAVITY", type: "bool", default: false },
        { name: "GRAVITY_CENTER", type: "u32", default: 0 },
        { name: "LAW", type: "u32", default: 0 },
    ],
    uniforms: [FA2_PARAMS, FA2_STATE, FA2_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P1",
};

/** `fa2-speed-finalize` (K4, 3.10.1): the one-workgroup partials fold and estimateFactor; 3 storage bindings; calls the reduction helpers. */
const FA2_SPEED_FINALIZE: KernelEntry = {
    id: "fa2-speed-finalize",
    body: fa2SpeedFinalizeWgsl,
    entryPoint: "speed_finalize",
    bindings: [
        decl(1, 0, "partials", "storage-ro", "array<Fa2Partial>"),
        decl(1, 1, "S", "storage", "Fa2State"),
        decl(1, 2, "T", "storage", "array<Fa2Trace>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [{ name: "SWING_MODE", type: "u32", default: 0 }],
    uniforms: [FA2_PARAMS, FA2_STATE, FA2_TRACE, FA2_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P1",
};

/** `fa2-integrate` (K5, 3.10.1): the per-node speed factor and position update (no clamp, D25), `oldForce` stored in SWING_MODE 0, and the partials A / C of the next K1; APPLY 0 FA2 / 1 FR temperature cap / 2 ngraph Euler (P5); 6 storage bindings; calls the reduction helpers. */
const FA2_INTEGRATE: KernelEntry = {
    id: "fa2-integrate",
    body: fa2IntegrateWgsl,
    entryPoint: "integrate",
    bindings: [
        decl(1, 0, "force", "storage-ro", "array<f32>"),
        decl(1, 1, "oldForce", "storage", "array<f32>"),
        decl(1, 2, "fixedMask", "storage-ro", "array<u32>"),
        decl(1, 3, "S", "storage", "Fa2State"),
        decl(1, 4, "pos", "storage", "array<vec4f>"),
        decl(1, 5, "partials", "storage", "array<Fa2Partial>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [
        { name: "SWING_MODE", type: "u32", default: 0 },
        { name: "APPLY", type: "u32", default: 0 },
    ],
    uniforms: [FA2_PARAMS, FA2_STATE, FA2_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P3",
};

/** `fa2-to-scene` (3.10.1): the per-batch unpack of the vec4f layout positions into the stride-3 scene array with `scale` / `center` applied (z = center.z in 2D); 2 storage bindings. */
const FA2_TO_SCENE: KernelEntry = {
    id: "fa2-to-scene",
    body: fa2ToSceneWgsl,
    entryPoint: "to_scene",
    bindings: [
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "scene", "storage", "array<f32>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [],
    uniforms: [FA2_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P3",
};

/** `spmv-pull` (spec 8.10): the pull SpMV over the reverse adjacency; HAS_PERSONALIZATION / USE_DANGLING / TIER 0 grid-stride / 1 32-lanes-per-row / 2 workgroup-per-row (the reverseDegreeOrder tiers, P4 PD-6) plus the standard USE_PERM / HAS_WEIGHTS; 8 storage bindings (the design's count); calls the reduction helpers (TIER 2). */
const SPMV_PULL: KernelEntry = {
    id: "spmv-pull",
    body: spmvPullWgsl,
    entryPoint: "spmv_pull",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "xNorm", "storage-ro", "array<f32>"),
        decl(1, 1, "rankOut", "storage", "array<f32>"),
        decl(1, 2, "personalization", "storage-ro", "array<f32>"),
        decl(1, 3, "partials", "storage-ro", "array<PrPartial>"),
        decl(2, 0, "P", "uniform", "SpmvParams"),
    ),
    overrideDecls: [
        { name: "HAS_PERSONALIZATION", type: "bool", default: false },
        { name: "USE_DANGLING", type: "bool", default: false },
        { name: "TIER", type: "u32", default: 0 },
    ],
    uniforms: [SPMV_PARAMS, PR_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P7",
};

/** `pr-scale` (spec 8.2 dispatch (a), 8.10): the per-node normaliser and the per-workgroup partials; NORM_MODE 0 PageRank / 1 L1 pass / 2 L2 pass / 3 scale / 4 identity; 5 storage bindings; calls the reduction helpers. */
const PR_SCALE: KernelEntry = {
    id: "pr-scale",
    body: prScaleWgsl,
    entryPoint: "pr_scale",
    bindings: [
        decl(1, 0, "rankIn", "storage-ro", "array<f32>"),
        decl(1, 1, "rankPrev", "storage-ro", "array<f32>"),
        decl(1, 2, "outWeightSum", "storage-ro", "array<f32>"),
        decl(1, 3, "xNorm", "storage", "array<f32>"),
        decl(1, 4, "partials", "storage", "array<PrPartial>"),
        decl(2, 0, "P", "uniform", "PrParams"),
    ],
    overrideDecls: [{ name: "NORM_MODE", type: "u32", default: 0 }],
    uniforms: [PR_PARAMS, PR_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P7",
};

/** `pr-finalize` (spec 8.2 dispatch (b), 8.10): the one-workgroup fold of the partials into the header at partials[0] and the firstConverged record; NORM_MODE 2 takes the square root; 1 storage binding; calls the reduction helpers. */
const PR_FINALIZE: KernelEntry = {
    id: "pr-finalize",
    body: prFinalizeWgsl,
    entryPoint: "pr_finalize",
    bindings: [decl(1, 0, "partials", "storage", "array<PrPartial>"), decl(2, 0, "P", "uniform", "PrParams")],
    overrideDecls: [{ name: "NORM_MODE", type: "u32", default: 0 }],
    uniforms: [PR_PARAMS, PR_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P7",
};

/** `wcc-link-sample` (spec 8.3): Afforest's sampled link round over the CSR rows (every vertex links its r-th neighbour); the standard USE_PERM / HAS_WEIGHTS only; 5 storage bindings (the four graph slots and the atomic `comp`, whose word at P.flagIndex is the changed flag, PD-4). */
const WCC_LINK_SAMPLE: KernelEntry = {
    id: "wcc-link-sample",
    body: wccLinkSampleWgsl,
    entryPoint: "wcc_link_sample",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "comp", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "WccParams"),
    ),
    overrideDecls: [],
    uniforms: [WCC_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P7",
};

/** `wcc-link-edges` (spec 8.3, 8.10): Afforest's each-edge-once link round over the edge list; no overrides; 3 storage bindings (the design's count: edgeSrc, edgeDst and the atomic `comp` carrying the changed flag). */
const WCC_LINK_EDGES: KernelEntry = {
    id: "wcc-link-edges",
    body: wccLinkEdgesWgsl,
    entryPoint: "wcc_link_edges",
    bindings: [
        decl(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
        decl(1, 1, "edgeDst", "storage-ro", "array<u32>"),
        decl(1, 2, "comp", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "WccParams"),
    ],
    overrideDecls: [],
    uniforms: [WCC_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P7",
};

/** `wcc-compress` (spec 8.3, 8.10): Afforest's bounded pointer-jumping compress; no overrides; 1 storage binding. */
const WCC_COMPRESS: KernelEntry = {
    id: "wcc-compress",
    body: wccCompressWgsl,
    entryPoint: "wcc_compress",
    bindings: [decl(1, 0, "comp", "storage", "array<atomic<u32>>"), decl(2, 0, "P", "uniform", "WccParams")],
    overrideDecls: [],
    uniforms: [WCC_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P7",
};

/** `wcc-sample` (spec 8.3, 8.10): the component-label sample of P.items pseudo-random vertices the host takes the mode of (PD-12); no overrides; 2 storage bindings. */
const WCC_SAMPLE: KernelEntry = {
    id: "wcc-sample",
    body: wccSampleWgsl,
    entryPoint: "wcc_sample",
    bindings: [
        decl(1, 0, "comp", "storage", "array<atomic<u32>>"),
        decl(1, 1, "hist", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "WccParams"),
    ],
    overrideDecls: [],
    uniforms: [WCC_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P7",
};

/** `indirect-finalize` (spec 5.4; P4-T1): the one-lane count -> (x, y, 1, count) finalize; 2 storage bindings. */
const INDIRECT_FINALIZE: KernelEntry = {
    id: "indirect-finalize",
    body: indirectFinalizeWgsl,
    entryPoint: "indirect_finalize",
    bindings: [
        decl(1, 0, "counters", "storage-ro", "array<u32>"),
        decl(1, 1, "args", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "IndirectParams"),
    ],
    overrideDecls: [],
    uniforms: [INDIRECT_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `scan-block` (spec 6 row 2 steps (a) / (b); P4-T2, PD-3): the Hillis-Steele exclusive scan of one WG-wide block into `out` and its total into `blockSums[group]`; 3 storage bindings; no subgroup variant. */
const SCAN_BLOCK: KernelEntry = {
    id: "scan-block",
    body: scanBlockWgsl,
    entryPoint: "scan_block",
    bindings: [
        decl(1, 0, "src", "storage-ro", "array<u32>"),
        decl(1, 1, "out", "storage", "array<u32>"),
        decl(1, 2, "blockSums", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "ScanParams"),
    ],
    overrideDecls: [],
    uniforms: [SCAN_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `scan-add` (spec 6 row 2 step (c); P4-T2): adds `blockOffsets[group]` to every element of the block; 2 storage bindings. */
const SCAN_ADD: KernelEntry = {
    id: "scan-add",
    body: scanAddWgsl,
    entryPoint: "scan_add",
    bindings: [
        decl(1, 0, "out", "storage", "array<u32>"),
        decl(1, 1, "blockOffsets", "storage-ro", "array<u32>"),
        decl(2, 0, "P", "uniform", "ScanParams"),
    ],
    overrideDecls: [],
    uniforms: [SCAN_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `histogram` (spec 6 row 5; P4-T3, PD-4): one global atomicAdd per key into `hist` (zeroed by a `fill` dispatch earlier in the pass); 2 storage bindings; one path, no PRIVATE override. */
const HISTOGRAM: KernelEntry = {
    id: "histogram",
    body: histogramWgsl,
    entryPoint: "histogram",
    bindings: [
        decl(1, 0, "keys", "storage-ro", "array<u32>"),
        decl(1, 1, "hist", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "HistParams"),
    ],
    overrideDecls: [],
    uniforms: [HIST_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `counting-scatter` (spec 6 row 5; P4-T3): the scatter of a counting sort, `outIndex[start[k] + atomicAdd(&cursor[k], 1u)] = i`; 4 storage bindings; set-deterministic (the order inside a bin follows the schedule). */
const COUNTING_SCATTER: KernelEntry = {
    id: "counting-scatter",
    body: countingScatterWgsl,
    entryPoint: "counting_scatter",
    bindings: [
        decl(1, 0, "keys", "storage-ro", "array<u32>"),
        decl(1, 1, "start", "storage-ro", "array<u32>"),
        decl(1, 2, "cursor", "storage", "array<atomic<u32>>"),
        decl(1, 3, "outIndex", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "HistParams"),
    ],
    overrideDecls: [],
    uniforms: [HIST_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `radix-hist` (spec 6 row 6; P4-T4, PD-5): the per-workgroup 256-bin digit histogram, privatised in workgroup memory and stored digit-major `hist[digit * groups + group]`; 2 storage bindings. */
const RADIX_HIST: KernelEntry = {
    id: "radix-hist",
    body: radixHistWgsl,
    entryPoint: "radix_hist",
    bindings: [
        decl(1, 0, "keys", "storage-ro", "array<u32>"),
        decl(1, 1, "hist", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "RadixParams"),
    ],
    overrideDecls: [],
    uniforms: [RADIX_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `radix-scatter` (spec 6 row 6; P4-T4, PD-5): the stable scatter of one LSD pass, ranked serially by lane 0, written at `offsets[digit * groups + group] + rank`; 5 storage bindings. */
const RADIX_SCATTER: KernelEntry = {
    id: "radix-scatter",
    body: radixScatterWgsl,
    entryPoint: "radix_scatter",
    bindings: [
        decl(1, 0, "keys", "storage-ro", "array<u32>"),
        decl(1, 1, "vals", "storage-ro", "array<u32>"),
        decl(1, 2, "offsets", "storage-ro", "array<u32>"),
        decl(1, 3, "keysOut", "storage", "array<u32>"),
        decl(1, 4, "valsOut", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "RadixParams"),
    ],
    overrideDecls: [],
    uniforms: [RADIX_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-cell-key` (G1, spec 7.7; P4-T8, PD-10): the finest cell key of every node, `floor((p - gridMin) * invCellSize)` linearised, or the outside pseudo-cell `G^dim`; `cellVal[i] = i`; 4 storage bindings (the state read-only: K1 writes it). */
const GRID_CELL_KEY: KernelEntry = {
    id: "grid-cell-key",
    body: gridCellKeyWgsl,
    entryPoint: "grid_cell_key",
    bindings: [
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "S", "storage-ro", "Fa2State"),
        decl(1, 2, "cellKey", "storage", "array<u32>"),
        decl(1, 3, "cellVal", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [],
    uniforms: [FA2_PARAMS, FA2_STATE],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-centroid` (G4, spec 7.7; P4-T9, PD-13): thread per finest cell (the pseudo-cell included), the serial mass-weighted sum in sorted order into level 0, the occupancy max into `hubCounters[1]`, hub cells (> GRID_HUB_CELL) appended to `hubList`; 6 storage bindings. */
const GRID_CENTROID: KernelEntry = {
    id: "grid-centroid",
    body: gridCentroidWgsl,
    entryPoint: "grid_centroid",
    bindings: [
        decl(1, 0, "sortedIdx", "storage-ro", "array<u32>"),
        decl(1, 1, "cellStart", "storage-ro", "array<u32>"),
        decl(1, 2, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 3, "pyramid", "storage", "array<vec4f>"),
        decl(1, 4, "hubList", "storage", "array<u32>"),
        decl(1, 5, "hubCounters", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [],
    uniforms: [FA2_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-centroid-hub` (G4b, spec 7.7; P4-T9, PD-13, DEP-P4-L): one workgroup per hub cell, dispatched indirectly, a WG-strided sum through `wg_reduce_vec4` guarded by `h < hubCount[0]`; 6 storage bindings (`hubCount` is a read-only view of `hubCounters`). */
const GRID_CENTROID_HUB: KernelEntry = {
    id: "grid-centroid-hub",
    body: gridCentroidHubWgsl,
    entryPoint: "grid_centroid_hub",
    bindings: [
        decl(1, 0, "sortedIdx", "storage-ro", "array<u32>"),
        decl(1, 1, "cellStart", "storage-ro", "array<u32>"),
        decl(1, 2, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 3, "pyramid", "storage", "array<vec4f>"),
        decl(1, 4, "hubList", "storage-ro", "array<u32>"),
        decl(1, 5, "hubCount", "storage-ro", "array<u32>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [],
    uniforms: [FA2_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-downsample` (G5, spec 7.7; P4-T9): one dispatch per coarser level, every parent the sum of its 4 / 8 children at `P.childBase`, written at `P.parentBase`; 1 storage binding. */
const GRID_DOWNSAMPLE: KernelEntry = {
    id: "grid-downsample",
    body: gridDownsampleWgsl,
    entryPoint: "grid_downsample",
    bindings: [decl(1, 0, "pyramid", "storage", "array<vec4f>"), decl(2, 0, "P", "uniform", "GridLevelParams")],
    overrideDecls: [],
    uniforms: [GRID_LEVEL_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-far-field` (G6, spec 7.7; P4-T10, PD-16, DEP-P4-G): per node in sorted order, the coarsest level minus its 3x3 (3x3x3) and, per finer level, the parent's 3x3 refined minus the level's own 3x3, plus the pseudo-cell; the loop bounds are `P.levels` / `P.gridMax`; LAW 0 FA2 / 1 FR / 2 coulomb per cell (P4-T13, PD-22); 5 storage bindings. */
const GRID_FAR_FIELD: KernelEntry = {
    id: "grid-far-field",
    body: gridFarFieldWgsl,
    entryPoint: "grid_far_field",
    bindings: [
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "sortedIdx", "storage-ro", "array<u32>"),
        decl(1, 2, "pyramid", "storage-ro", "array<vec4f>"),
        decl(1, 3, "S", "storage-ro", "Fa2State"),
        decl(1, 4, "force", "storage", "array<f32>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [{ name: "LAW", type: "u32", default: 0 }],
    uniforms: [FA2_PARAMS, FA2_STATE],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};

/** `grid-near-field` (G7, spec 7.7; P4-T10, PD-15): per node in sorted order, K3's exact pair law over the 9 (27) finest cells, a cell above `nearMax` sampled through the hashed window and scaled by `others / sampled`, then K3's fused epilogue (gravity, `force +=`, the swing / traction reduction); SWING_MODE / STRONG_GRAVITY / GRAVITY_CENTER / LAW as K3 (LAW 0 FA2 / 1 FR / 2 coulomb, P4-T13, PD-22); 8 storage bindings; calls the reduction helpers. */
const GRID_NEAR_FIELD: KernelEntry = {
    id: "grid-near-field",
    body: gridNearFieldWgsl,
    entryPoint: "grid_near_field",
    bindings: [
        decl(1, 0, "pos", "storage-ro", "array<vec4f>"),
        decl(1, 1, "sortedIdx", "storage-ro", "array<u32>"),
        decl(1, 2, "cellStart", "storage-ro", "array<u32>"),
        decl(1, 3, "S", "storage", "Fa2State"),
        decl(1, 4, "force", "storage", "array<f32>"),
        decl(1, 5, "oldForce", "storage-ro", "array<f32>"),
        decl(1, 6, "fixedMask", "storage-ro", "array<u32>"),
        decl(1, 7, "partials", "storage", "array<Fa2Partial>"),
        decl(2, 0, "P", "uniform", "Fa2Params"),
    ],
    overrideDecls: [
        { name: "SWING_MODE", type: "u32", default: 0 },
        { name: "STRONG_GRAVITY", type: "bool", default: false },
        { name: "GRAVITY_CENTER", type: "u32", default: 0 },
        { name: "LAW", type: "u32", default: 0 },
    ],
    uniforms: [FA2_PARAMS, FA2_STATE, FA2_PARTIAL],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P4",
};

/** `compact-scatter` (spec 6 row 4; P8-T3): the scatter of `compact` after the flags' exclusive scan, plus the total into `outCount[P.outIndex]`; 5 storage bindings; order-preserving, so bitwise reproducible. */
const COMPACT_SCATTER: KernelEntry = {
    id: "compact-scatter",
    body: compactScatterWgsl,
    entryPoint: "compact_scatter",
    bindings: [
        decl(1, 0, "queue", "storage-ro", "array<u32>"),
        decl(1, 1, "flags", "storage-ro", "array<u32>"),
        decl(1, 2, "offsets", "storage-ro", "array<u32>"),
        decl(1, 3, "out", "storage", "array<u32>"),
        decl(1, 4, "outCount", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "CompactParams"),
    ],
    overrideDecls: [],
    uniforms: [COMPACT_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `dedupe-claim` (spec 6 row 4; P8-T3): `atomicStore(&owner[queue[i]], i)` for every entry, the count from `P.count` or the device word `counters[P.countIndex]`; 3 storage bindings (`counters` is `array<atomic<u32>>` and therefore read-write, although only loaded: WGSL admits an atomic only in a read-write storage buffer). */
const DEDUPE_CLAIM: KernelEntry = {
    id: "dedupe-claim",
    body: dedupeClaimWgsl,
    entryPoint: "dedupe_claim",
    bindings: [
        decl(1, 0, "queue", "storage-ro", "array<u32>"),
        decl(1, 1, "owner", "storage", "array<atomic<u32>>"),
        decl(1, 2, "counters", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "CompactParams"),
    ],
    overrideDecls: [],
    uniforms: [COMPACT_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `dedupe-filter` (spec 6 row 4; P8-T3): a separate dispatch keeping the entries that still own their vertex, packed by a workgroup scan and one `atomicAdd` per workgroup on `outCount[P.outIndex]`, which is also the block the count word `P.countIndex` is read from; 4 storage bindings; set-deterministic. */
const DEDUPE_FILTER: KernelEntry = {
    id: "dedupe-filter",
    body: dedupeFilterWgsl,
    entryPoint: "dedupe_filter",
    bindings: [
        decl(1, 0, "queue", "storage-ro", "array<u32>"),
        decl(1, 1, "owner", "storage", "array<atomic<u32>>"),
        decl(1, 2, "out", "storage", "array<u32>"),
        decl(1, 3, "outCount", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "CompactParams"),
    ],
    overrideDecls: [],
    uniforms: [COMPACT_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `frontier-finalize` (design 5.4, 8.10 "BFS finalizeArgs"; P8-T4, PD-3): the one-lane level-boundary selector that rotates the counters block and writes the level's seven indirect slots (role 0), then clamps the edge count and sizes the contract or the fused-retry slot (role 1); 2 storage bindings (the block as `array<atomic<u32>>`, the args). */
const FRONTIER_FINALIZE: KernelEntry = {
    id: "frontier-finalize",
    body: frontierFinalizeWgsl,
    entryPoint: "frontier_finalize",
    bindings: [
        decl(1, 0, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 1, "args", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `advance-expand` (design 6 row 8, 8.10 "BFS expand"; P8-T5): the block-mapped expansion of the frontier into the edge queue -- each workgroup scans its entries' degrees with the prelude's `wg_scan_u32` (the twin axis: `needs: ["subgroups"]` is what makes the subgroup compilation differ) and strips the aggregate by binary search, one `atomicAdd` per workgroup reserving its span; 7 storage bindings (the four graph slots, `frontierIn`, the counters block as `array<atomic<u32>>`, `edgeQueue`); no `TIER` override (the workgroup-per-row structure is `bfs-fused`). */
const ADVANCE_EXPAND: KernelEntry = {
    id: "advance-expand",
    body: advanceExpandWgsl,
    entryPoint: "advance_expand",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "frontierIn", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "edgeQueue", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-contract` (design 8.4, 8.10 "BFS contract"; P8-T6, PD-6): the contraction of the edge queue -- `atomicMin(&depth[v], level + 1)` with the invocation that observes `INVALID_INDEX` the unique winner, packed into the output vertex queue by a workgroup scan and one `atomicAdd` per workgroup on `nextFrontierCount`; 4 storage bindings (no `owner`: the claim already dedupes, DEP-P8-B; no `parent`: the post-pass writes it, PD-24; both counts are words of `counters`). */
const BFS_CONTRACT: KernelEntry = {
    id: "bfs-contract",
    body: bfsContractWgsl,
    entryPoint: "bfs_contract",
    bindings: [
        decl(1, 0, "edgeQueue", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "depth", "storage", "array<atomic<u32>>"),
        decl(1, 3, "frontierOut", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `sssp-pred` (design 8.10 "SSSP predecessor pass"; P8-T6 / P8-T9, PD-24 / PD-27): the one post-pass over the settled distances, grid-striding every row -- `MODE 1` reads u32 depths and writes BFS `parent`, `MODE 0` reads f32 bit patterns and writes `predArc` under PD-27's key, `P.predKind` choosing the node or the arc index; 6 storage bindings (the four graph slots, `dist` bound plain across dispatches, `pred` as `array<atomic<u32>>`, which in `MODE 0` also carries the hop counts and the two flag words in its upper regions). */
const SSSP_PRED: KernelEntry = {
    id: "sssp-pred",
    body: ssspPredWgsl,
    entryPoint: "sssp_pred",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "dist", "storage-ro", "array<u32>"),
        decl(1, 1, "pred", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [{ name: "MODE", type: "u32", default: 0 }],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-fused` (design 8.4 "the fused variant", 6 row 8 "the workgroup-per-row tier", 8.10 "BFS fused expand-contract"; P8-T7, PD-23): one level's expansion and contraction in one dispatch, one WORKGROUP per frontier entry, every lane stripping the entry's row with `bfs-contract`'s claim inline and no edge queue traffic; dispatched from `SLOT.fused` (a frontier below `P.fusedMax`) and from `SLOT.fusedRetry` (an overflowed level); 8 storage bindings (the four graph slots, `frontierIn`, the counters block as `array<atomic<u32>>`, `depth` as `array<atomic<u32>>`, `frontierOut`) -- exactly at the budget, which is why no `parent` lives here (PD-24). */
const BFS_FUSED: KernelEntry = {
    id: "bfs-fused",
    body: bfsFusedWgsl,
    entryPoint: "bfs_fused",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "frontierIn", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "depth", "storage", "array<atomic<u32>>"),
        decl(1, 3, "frontierOut", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-bottom-up` (design 8.4 "the bottom-up sweep", 8.10 "BFS bottom-up"; P8-T8, PD-18 / PD-21): one invocation per entry of the unvisited list, walking its in-neighbours through the REVERSE core bound in group 0 until the first one whose bit is set in the frontier bitset (the early exit `arcsScanned` witnesses), claiming with a plain `atomicStore` and packing the winners into the output vertex queue by `bfs-contract`'s scan; 8 storage bindings (the four graph slots of the reverse core, `sweepIn` read-only -- the unvisited list at word 0 and the bitset at `P.bitsBase`, one buffer -- the counters block, `depth` and `frontierOut` as `array<atomic<u32>>` / `array<u32>`); `needs: ["subgroups"]` for the `wg_reduce_u32` call (a twin kernel). */
const BFS_BOTTOM_UP: KernelEntry = {
    id: "bfs-bottom-up",
    body: bfsBottomUpWgsl,
    entryPoint: "bfs_bottom_up",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "sweepIn", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "depth", "storage", "array<atomic<u32>>"),
        decl(1, 3, "frontierOut", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-bitset-build` (design 8.4 "the bitset frontier"; P8-T8): the vertex-list-to-bitset hand-off of a bottom-up level -- one `atomicOr` per entry of the input frontier into the `ceil(n / 32)`-word bitset at `P.bitsBase` of the `sweepIn` buffer (bound whole as `bits`, read-write); 3 storage bindings. */
const BFS_BITSET_BUILD: KernelEntry = {
    id: "bfs-bitset-build",
    body: bfsBitsetBuildWgsl,
    entryPoint: "bfs_bitset_build",
    bindings: [
        decl(1, 0, "frontierIn", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "bits", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-unvisited-flags` (design 8.4; P8-T8, PD-18): the unvisited set's producer, once per submit -- grid-striding over the vertices, counting the unclaimed ones and their OUT-degree sum into words 5 and 6 and flagging those with a non-zero IN-degree (word 7, what the sweep iterates) for `compact`; 5 storage bindings (the `outDegree` and `inDegree` VIEWS rather than the graph group, `depth` read-only, `flags`, the counters block); `needs: ["subgroups"]` for the three `wg_reduce_u32` calls (a twin kernel). */
const BFS_UNVISITED_FLAGS: KernelEntry = {
    id: "bfs-unvisited-flags",
    body: bfsUnvisitedFlagsWgsl,
    entryPoint: "bfs_unvisited_flags",
    bindings: [
        decl(1, 0, "outDegree", "storage-ro", "array<u32>"),
        decl(1, 1, "inDegree", "storage-ro", "array<u32>"),
        decl(1, 2, "depth", "storage-ro", "array<u32>"),
        decl(1, 3, "flags", "storage", "array<u32>"),
        decl(1, 4, "counters", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P8",
};

/** `bfs-next-degree` (design 8.4; issue #391): Beamer's m_f measured exactly -- once per level, after the claim kernels, grid-striding over the output vertex queue and summing the `outDegree` view over the vertices the level claimed into word 25, one `atomicAdd` per workgroup; 3 storage bindings (`frontier` read-only, the `outDegree` VIEW, the counters block); `needs: ["subgroups"]` for the `wg_reduce_u32` call (a twin kernel). */
const BFS_NEXT_DEGREE: KernelEntry = {
    id: "bfs-next-degree",
    body: bfsNextDegreeWgsl,
    entryPoint: "bfs_next_degree",
    bindings: [
        decl(1, 0, "frontier", "storage-ro", "array<u32>"),
        decl(1, 1, "outDegree", "storage-ro", "array<u32>"),
        decl(1, 2, "counters", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: ["subgroups"],
    snippetSlots: [],
    phase: "P8",
};

/** `sssp-relax` (design 8.4 "Davidson's near-far", 8.10 "SSSP near-far relax"; P8-T9, PD-9 / PD-20 / DEP-P8-E): one round of the near-far loop -- role 0 relaxes the deduped near pile's whole rows with `atomicMin` on the f32 bit patterns of `dist` and appends each improved vertex to the raw near or far half of `queueOut` (the two halves of ONE buffer at word 0 and word `P.edgeCapacity`), role 1 re-buckets the deduped far pile; 8 storage bindings (the four graph slots with the run's weights bound in the weights slot, `dist` and the counters block as `array<atomic<u32>>`, `queueIn` read-only, `queueOut`) -- exactly at the budget, which is why no `pred` lives here (PD-11) and why the piles' counts, the threshold and the delta are words of the block. */
const SSSP_RELAX: KernelEntry = {
    id: "sssp-relax",
    body: ssspRelaxWgsl,
    entryPoint: "sssp_relax",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "dist", "storage", "array<atomic<u32>>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "queueIn", "storage-ro", "array<u32>"),
        decl(1, 3, "queueOut", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `bf-relax` (design 8.4 "Bellman-Ford"; P8-T10, PD-12 / DEP-P8-E): one edge-parallel relaxation round over the `edgeList` view with a bounded compare-exchange on the f32 bit patterns of `dist` (negative distances reverse the bit-pattern order, so no `atomicMin`); `UNDIRECTED` relaxes the other direction of every edge too; 6 storage bindings (`edgeSrc`, `edgeDst`, `edgeToArc` -- the core's segment, or an iota scratch on a directed identity snapshot --, the run's arc-indexed `weights`, `dist` and the `BfFlags` block as `array<atomic<u32>>`); no graph group. */
const BF_RELAX: KernelEntry = {
    id: "bf-relax",
    body: bfRelaxWgsl,
    entryPoint: "bf_relax",
    bindings: [
        decl(1, 0, "edgeSrc", "storage-ro", "array<u32>"),
        decl(1, 1, "edgeDst", "storage-ro", "array<u32>"),
        decl(1, 2, "edgeToArc", "storage-ro", "array<u32>"),
        decl(1, 3, "weights", "storage-ro", "array<f32>"),
        decl(1, 4, "dist", "storage", "array<atomic<u32>>"),
        decl(1, 5, "flags", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "BfParams"),
    ],
    overrideDecls: [{ name: "UNDIRECTED", type: "bool", default: false }],
    uniforms: [BF_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `closeness-sweep` (design 8.4 "32 sources per u32 word"; P8-T11, PD-13 / DEP-P8-E): one level of the bit-parallel multi-source BFS -- `advance-expand`'s block-mapped strip over the compacted frontier list with the claim inline (`atomicOr` on the visited word of the four-region `bits` buffer, the won bits into the level's next region and the flags region, one workgroup-memory tally per source flushed by one `atomicAdd` per source per workgroup into `perSource`); 8 storage bindings (the four graph slots, `frontierList` read-only, `counters`, `bits` and `perSource` as `array<atomic<u32>>`) -- exactly at the budget; the inlined Hillis-Steele scan, so `needs: []`. */
const CLOSENESS_SWEEP: KernelEntry = {
    id: "closeness-sweep",
    body: closenessSweepWgsl,
    entryPoint: "closeness_sweep",
    bindings: GRAPH_SLOTS.concat(
        decl(1, 0, "frontierList", "storage-ro", "array<u32>"),
        decl(1, 1, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 2, "bits", "storage", "array<atomic<u32>>"),
        decl(1, 3, "perSource", "storage", "array<atomic<u32>>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ),
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/** `closeness-reduce` (design 8.4, 9.7; P8-T11, PD-13): the one-lane bookkeeping of the sweep -- role 0 the level boundary (`done` from the previous level's compacted count, `newCount` folded into `reached` and the 64-bit `sum` at `level + 1` with the 16-bit split product and the carry, `level` advanced), role 1 the seed of a batch (the sources' bits into `visited` and the level-0 frontier region, their flags, `counters[0] = k`, `level = U32_MAX`); 3 storage bindings (`counters` and `perSource` as `array<atomic<u32>>`, `bits` plain: one lane writes the seed). */
const CLOSENESS_REDUCE: KernelEntry = {
    id: "closeness-reduce",
    body: closenessReduceWgsl,
    entryPoint: "closeness_reduce",
    bindings: [
        decl(1, 0, "counters", "storage", "array<atomic<u32>>"),
        decl(1, 1, "perSource", "storage", "array<atomic<u32>>"),
        decl(1, 2, "bits", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "FrontierParams"),
    ],
    overrideDecls: [],
    uniforms: [FRONTIER_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P8",
};

/**
 * The entries by id, in dispatch order. PLAN DECISION: `KernelId` is declared in full (contract 3.10) while the
 * entries landed phase by phase, so the table is built as a Partial record and exported below through the
 * contract's `Readonly<Record<KernelId, KernelEntry>>` type by one assertion; the runtime membership check of
 * `entryOf` is the E_INVALID_ARGUMENT the contract documents for a JS caller's unknown id. P1-T4 landed the five
 * P1 entries, P2-T2 `"segmented-reduce"`, and P3-T2 `"fa2-stats-finalize"`, `"fa2-attraction"`, `"fa2-integrate"`
 * and `"fa2-to-scene"`; M8b-T3 landed the seven P7 entries and P4 its thirteen; P8-T3 landed the three compact /
 * dedupe entries, P8-T4 `"frontier-finalize"`, P8-T5 `"advance-expand"`, P8-T6 `"bfs-contract"` and `"sssp-pred"` and
 * P8-T7 `"bfs-fused"`, P8-T8 `"bfs-bottom-up"`, `"bfs-bitset-build"` and `"bfs-unvisited-flags"`, P8-T9
 * `"sssp-relax"`, P8-T10 `"bf-relax"` and P8-T11 `"closeness-sweep"` and `"closeness-reduce"`, so every member of
 * `KernelId` is present and the assertion is exact.
 */
const REGISTRY: Readonly<Partial<Record<KernelId, KernelEntry>>> = Object.freeze({
    degree: DEGREE,
    reduce: REDUCE,
    fill: FILL,
    "segmented-reduce": SEGMENTED_REDUCE,
    "fa2-stats-finalize": FA2_STATS_FINALIZE,
    "fa2-attraction": FA2_ATTRACTION,
    "fa2-repulsion-exact": FA2_REPULSION_EXACT,
    "fa2-speed-finalize": FA2_SPEED_FINALIZE,
    "fa2-integrate": FA2_INTEGRATE,
    "fa2-to-scene": FA2_TO_SCENE,
    "spmv-pull": SPMV_PULL,
    "pr-scale": PR_SCALE,
    "pr-finalize": PR_FINALIZE,
    "wcc-link-sample": WCC_LINK_SAMPLE,
    "wcc-link-edges": WCC_LINK_EDGES,
    "wcc-compress": WCC_COMPRESS,
    "wcc-sample": WCC_SAMPLE,
    "indirect-finalize": INDIRECT_FINALIZE,
    "scan-block": SCAN_BLOCK,
    "scan-add": SCAN_ADD,
    histogram: HISTOGRAM,
    "counting-scatter": COUNTING_SCATTER,
    "radix-hist": RADIX_HIST,
    "radix-scatter": RADIX_SCATTER,
    "grid-cell-key": GRID_CELL_KEY,
    "grid-centroid": GRID_CENTROID,
    "grid-centroid-hub": GRID_CENTROID_HUB,
    "grid-downsample": GRID_DOWNSAMPLE,
    "grid-far-field": GRID_FAR_FIELD,
    "grid-near-field": GRID_NEAR_FIELD,
    "compact-scatter": COMPACT_SCATTER,
    "dedupe-claim": DEDUPE_CLAIM,
    "dedupe-filter": DEDUPE_FILTER,
    "frontier-finalize": FRONTIER_FINALIZE,
    "advance-expand": ADVANCE_EXPAND,
    "bfs-contract": BFS_CONTRACT,
    "sssp-pred": SSSP_PRED,
    "bfs-fused": BFS_FUSED,
    "bfs-bottom-up": BFS_BOTTOM_UP,
    "bfs-bitset-build": BFS_BITSET_BUILD,
    "bfs-unvisited-flags": BFS_UNVISITED_FLAGS,
    "bfs-next-degree": BFS_NEXT_DEGREE,
    "sssp-relax": SSSP_RELAX,
    "bf-relax": BF_RELAX,
    "closeness-sweep": CLOSENESS_SWEEP,
    "closeness-reduce": CLOSENESS_REDUCE,
});

/** THE registry (spec 3.5): every entry, keyed by id. */
export const KERNELS: Readonly<Record<KernelId, KernelEntry>> = REGISTRY as Readonly<Record<KernelId, KernelEntry>>;

/** The bodies installed by setKernelBodyOverride (the sabotage seam of spec 11.9 item 1), by id. */
const bodyOverrides = new Map<KernelId, string>();

/**
 * The entry of an id, or E_INVALID_ARGUMENT for an id that is not (yet) registered.
 * @param id - the module id
 * @returns the entry
 */
function entryOf(id: KernelId): KernelEntry {
    const entry = REGISTRY[id];
    if (entry === undefined) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `unknown kernel id "${id}"`, {
            argument: "id",
            value: id,
            expected: Object.keys(REGISTRY),
        });
    }
    return entry;
}

/**
 * A WgslModuleSpec for a variant: the entry plus the overrides / snippets given; unknown override names are
 * rejected at compose time. A body override installed by setKernelBodyOverride is used instead of the entry's
 * body.
 * @param id - the module id
 * @param overrides - the override values of this variant (the five standard names and the entry's overrideDecls)
 * @param snippets - the texts substituted at the body's `//@@NAME@@` markers
 * @returns the spec the PipelineCache compiles
 */
export function kernelSpec(
    id: KernelId,
    overrides?: Readonly<Record<string, number | boolean>>,
    snippets?: Readonly<Record<string, string>>,
): WgslModuleSpec {
    const entry = entryOf(id);
    return {
        id: entry.id,
        body: bodyOverrides.get(id) ?? entry.body,
        bindings: entry.bindings,
        overrideDecls: entry.overrideDecls,
        overrides: overrides ?? {},
        needs: entry.needs,
        uniforms: entry.uniforms,
        snippets,
    };
}

/**
 * The sabotage seam (spec 11.9 item 1): replaces an entry's body for specs created afterwards (null restores).
 * Tests use a FRESH context per mutation because the pipeline key does not include the body.
 * @internal
 * @param id - the module id
 * @param body - the replacement body, or null to restore the normative one
 */
export function setKernelBodyOverride(id: KernelId, body: string | null): void {
    entryOf(id);
    if (body === null) {
        bodyOverrides.delete(id);
    } else {
        bodyOverrides.set(id, body);
    }
}

/**
 * The group-0 graph bindings of a core with the dummy rules applied (spec 3.5, 4.1): colIdx <- rowPtr when null,
 * weights <- colIdx ?? rowPtr when null, perm <- rowPtr when null. `weights` is the binding to use in the weights
 * slot: omitted -> core.weights (degree, segmented-reduce); a layout passes its RESOLVED weights
 * (ModelResources.weights, 3.13), null meaning "attract with 1.0" even on a weighted snapshot.
 * @param core - the resident core arrays of a snapshot
 * @param perm - the degreeOrder row permutation, or null (rowPtr is bound as the dummy)
 * @param weights - the weights binding to use; undefined takes the core's, null binds the colIdx dummy
 * @returns the four bindings in slot order
 */
export function graphBindings(
    core: CoreBinding,
    perm: Binding | null,
    weights?: Binding | null,
): Readonly<Record<"rowPtr" | "colIdx" | "weights" | "perm", Binding>> {
    const colIdx = core.colIdx ?? core.rowPtr;
    const resolved = weights === undefined ? core.weights : weights;
    return {
        rowPtr: core.rowPtr,
        colIdx,
        weights: resolved ?? colIdx,
        perm: perm ?? core.rowPtr,
    };
}

/**
 * The override values graphBindings implies: USE_PERM = perm !== null, HAS_WEIGHTS = (weights === undefined ?
 * core.weights : weights) !== null.
 * @param core - the resident core arrays of a snapshot
 * @param perm - the row permutation binding, or null
 * @param weights - the weights binding to use; undefined takes the core's, null means "unweighted"
 * @returns the two standard override values of the variant
 */
export function graphOverrides(
    core: CoreBinding,
    perm: Binding | null,
    weights?: Binding | null,
): Readonly<{ USE_PERM: boolean; HAS_WEIGHTS: boolean }> {
    const resolved = weights === undefined ? core.weights : weights;
    return { USE_PERM: perm !== null, HAS_WEIGHTS: resolved !== null };
}
