/**
 * Every numeric constant the package and the WGSL prelude share (spec 3.1, 3.5, 5.2, 7.8, 7.14, 7.17;
 * contract 3.2). The prelude (src/kernel/prelude.ts, P1-T3) interpolates these values and never retypes them
 * as literals (the literal grep of spec 3.5 enforces it); the planners read them; test/device/constants.test.ts
 * pins them. graph-format's INVALID_INDEX is imported by the prelude directly and is deliberately not copied.
 */

/** Workgroup size of every 1D kernel; `WG = min(WORKGROUP_SIZE, caps.limits.maxComputeInvocationsPerWorkgroup)` at runtime (spec 5.1). */
export const WORKGROUP_SIZE = 256;
/** The spec minimum of maxComputeWorkgroupsPerDimension; asserted equal to the device limit at create() (spec 2.2, 5.2). */
export const MAX_WORKGROUPS_PER_DIM = 65535;
/** Items a 1D dispatch of WORKGROUP_SIZE covers: 65535 x 256 = 16,776,960, NOT 2^24 (design 10.6). */
export const MAX_1D_ITEMS = MAX_WORKGROUPS_PER_DIM * WORKGROUP_SIZE;
/** The largest u32 (the `min` identity of the u32 reduce); interpolated into the prelude as `U32_MAX` so no body types the literal (contract 4.1). */
export const U32_MAX = 0xffffffff;
/** The bins of one radix-sort pass, 2^8 (spec 6 row 6; P4 PD-5: 8 bits per pass); interpolated into the prelude as `RADIX_BINS` and `RADIX_DIGIT_MASK` (= bins - 1) so no body types the literal. */
export const RADIX_BINS = 256;
/** Arc-window boundaries are multiples of 64 arcs = 256 bytes (design 10.6). */
export const ARC_WINDOW_ALIGN = 64;
/** Storage-binding offset alignment the package always honours (spec 2.6): the graph-format arena is 256-aligned. */
export const STORAGE_ALIGN = 256;
/** Stride of one UniformRing slot: minUniformBufferOffsetAlignment is 256 on every runtime the package targets (spec 5.3). */
export const UNIFORM_SLOT_BYTES = 256;
/**
 * Exact-tier crossover default, re-fixed at G4 by the spec 7.8 rule in full (spec Q-6; docs/decisions/G3.md section 3
 * for the budget clause, docs/decisions/G4.md section 7 for the re-check): the largest rung of the T-4 ladder (1k / 4k /
 * 8k / 16k / 32k / 65k, E = 10n, 2D) with <= 4 ms per iteration AND not slower than the grid tier at the same n (the
 * `layout-grid` 2D rows: the shared rungs 32k / 65k and the re-check rungs 1k / 4k / 8k / 16k the group runs so every
 * exact rung has a grid row), rounded down to a power of two. Measured on the RTX 4070 SUPER under Dawn-node:
 * benchmarks/results/nvidia-lovelace-driver580.json, session 2026-09-21T06:15:17.027Z, the "ms/iteration (profiler)"
 * rows of layout-exact and the "grid ms/iteration (profiler) ... 2D" rows of layout-grid (the GPU time of the
 * iteration's passes at the card's working clock), exact / grid ms per iteration: 1k 0.102 / 0.290, 4k 0.262 / 0.188,
 * 8k 0.484 / 0.211, 16k 1.064 / 0.225, 32k 2.579 / 0.298, 65k 8.450 / 0.409. The grid tier's cost is a near-constant
 * ~0.19-0.3 ms floor (its sort, scan and pyramid passes) up to 32k, so the exact tier wins only at 1k and the rule's
 * answer is 1024 (32768 under the budget clause alone, the G3 value; 16384 was the P4-T14 draft's value, which only
 * evaluated the grid clause at 32k / 65k and was not a measurement). calibrateLayout's finer probe on the same card
 * (tmp/p4/t14-review/calibrate-defaults.log: exact 0.150 vs grid 0.190 ms at 2048) puts the true crossover between
 * 2k and 4k; the ladder has no 2k rung, and the design's basis (cosmos switches at 4,096) is within 0.07 ms per
 * iteration of the rule's value, so the choice among 1k / 2k / 4k is an accuracy preference (the exact tier is the
 * oracle), not a speed one. OWNER DECISION G4-D1 (docs/decisions/G4.md section 7, rows G4-D1 / G4-F9): the constant
 * KEEPS the G3 value 32768 while the accuracy work G4-F1 leaves is open -- G4-F1 (the grid tier's exact-vs-grid RMS
 * on the clumpy and degenerate fixtures) closed on 2026-09-21 by the owner's asserted / printed split, G4-F2 (the
 * unbiasedness item) the same day by its re-scope to the whole-field ratio, and the far field's accuracy on those
 * fixtures is the follow-up -- because "auto" is the default every consumer sees and the exact tier is the accurate
 * one; the rule's answer on the dev box (1024) is recorded, not shipped, until that work closes and the value is
 * re-fixed. A
 * consumer whose GPU differs (integrated, Apple, T4) passes its own value through
 * createAccelerator(ctx, { layout: { exactMaxNodes } }); calibrateLayout(ctx) measures it.
 */
export const EXACT_MAX_NODES = 32768;
/** Default number of MAP_READ staging buffers in the Readback ring (spec 4.4). */
export const DEFAULT_STAGING_SLOTS = 3;
/** Timestamp query-set size of the Profiler (spec 5.5: "a query set of 256 slots"; 2 slots per pass). */
export const PROFILER_QUERY_SLOTS = 256;
/** Byte size above which createBuffer runs inside an "out-of-memory" error scope (spec 5.7). */
export const OOM_SCOPE_THRESHOLD_BYTES = 16 * 1024 * 1024;
/** Idle buffers kept per (size class, usage) by the BufferPool (spec 4.4). */
export const POOL_MAX_IDLE_PER_CLASS = 4;
/** Smallest power-of-two pool class (spec 4.4). */
export const POOL_MIN_CLASS_BYTES = 4 * 1024;
/** Largest power-of-two pool class; above it the classes grow linearly (spec 4.4). */
export const POOL_MAX_POW2_CLASS_BYTES = 64 * 1024 * 1024;
/** The linear step of the pool classes above the largest power of two (spec 4.4). */
export const POOL_LINEAR_STEP_BYTES = 16 * 1024 * 1024;
/** Default `warnUnreleasedSnapshots` (spec 2.2, 4.1). */
export const DEFAULT_WARN_UNRELEASED_SNAPSHOTS = 2;
/** CONTRACT DECISION: the largest `iterations` a single step() records (the trace region and the uniform ring are sized by it); larger values are E_INVALID_ARGUMENT. */
export const MAX_ITERATIONS_PER_STEP = 256;
/** Bytes of one Fa2Trace record (spec 7.3: 32-byte records). */
export const TRACE_RECORD_BYTES = 32;
/** CONTRACT DECISION: the state header is padded to 256 bytes so the trace region that follows it in the same buffer starts at a legal 256-aligned binding offset (spec 7.3 says "128 + k x 32"; 128 is not a legal storage offset). */
export const STATE_HEADER_BYTES = 256;
/** Bytes of one per-workgroup partials record (spec 7.3: exactly 64 B). */
export const PARTIAL_BYTES = 64;
/** ForceAtlas2 defaults (spec 7.14, 7.17, 7.19). */
export const FA2_DEFAULTS: Readonly<{
    maxIter: 100;
    jitterTolerance: 1;
    scalingRatio: 2;
    gravity: 1;
    strongGravity: false;
    distributedAction: false;
    linlog: false;
    dissuadeHubs: false;
    dim: 2;
    scale: 1;
    settleThreshold: 0.001;
    settleWindow: 10;
    iterationsPerStep: 1;
    maxInFlight: 2;
}> = Object.freeze({
    maxIter: 100,
    jitterTolerance: 1,
    scalingRatio: 2,
    gravity: 1,
    strongGravity: false,
    distributedAction: false,
    linlog: false,
    dissuadeHubs: false,
    dim: 2,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
/** GPU-only layout tuning defaults (spec 7.14): repulsion "auto", exactMaxNodes EXACT_MAX_NODES, nearMax 64, deterministic true, gridMax2D 512, gridMax3D 128, extentFactor 6, compat "paper". */
export const LAYOUT_TUNING_DEFAULTS: Readonly<{
    repulsion: "auto";
    exactMaxNodes: number;
    nearMax: 64;
    deterministic: true;
    gridMax2D: 512;
    gridMax3D: 128;
    extentFactor: 6;
    compat: "paper";
}> = Object.freeze({
    repulsion: "auto",
    exactMaxNodes: EXACT_MAX_NODES,
    nearMax: 64,
    deterministic: true,
    gridMax2D: 512,
    gridMax3D: 128,
    extentFactor: 6,
    compat: "paper",
});
/** The distance floor `max(d, 0.01)` of spec 7.2; interpolated into the prelude (contract 4.1). */
export const FA2_DISTANCE_FLOOR = 0.01;
/** The square of FA2_DISTANCE_FLOOR. */
export const FA2_DISTANCE_FLOOR_SQ = 0.0001;
/** The coincident threshold `d^2 < 1e-8` of spec 7.2. */
export const FA2_COINCIDENT_SQ = 1e-8;
/** Bits of Fa2Params.flags (contract 4.4). */
export const FA2_FLAG_FIRST = 1;
/** Fa2Params.flags bit: the Fruchterman-Reingold temperature is the adaptive one in the state block, not the uniform's (the `cooling: "adaptive"` option). */
export const FA2_FLAG_ADAPTIVE = 2;
/** The Fruchterman-Reingold loop's starting temperature (spec 7.20; `layout/src/simulation/fruchterman-reingold.ts:30`). */
export const FR_START_TEMPERATURE = 0.1;
/** The reheat point of spec 7.20: the temperature index a reheat restarts at, as a fraction of `iterations`. */
export const FR_REHEAT_FRACTION = 0.7;
/** Adaptive cooling (Yifan Hu 2005, section 3.2): the temperature is multiplied by this when the force energy rose, divided by it after FR_COOLING_PATIENCE consecutive falls. */
export const FR_COOLING_STEP = 0.9;
/** Adaptive cooling: consecutive iterations of falling energy before the temperature grows. */
export const FR_COOLING_PATIENCE = 5;
/** Adaptive cooling: the iteration budget when `iterations` is not given (the schedule no longer needs one; this is the cap on a run that never settles). */
export const FR_ADAPTIVE_MAX_ITERATIONS = 10_000;
/** Fruchterman-Reingold defaults (spec 7.20, 9.3; the CPU simulation's, `layout/src/simulation/fruchterman-reingold.ts:32`): `k` null = `1 / sqrt(n)`. */
export const FR_DEFAULTS: Readonly<{
    k: null;
    iterations: 50;
    fixed: null;
    dim: 2;
    scale: 1;
    settleThreshold: 0.001;
    settleWindow: 10;
    iterationsPerStep: 1;
    maxInFlight: 2;
    cooling: "linear";
}> = Object.freeze({
    k: null,
    iterations: 50,
    fixed: null,
    dim: 2,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
    cooling: "linear",
});
/**
 * Spring-electrical size scaling: when `gravity` or `springCoefficient` is left to its default, ngraph's constant is
 * multiplied by min(1, SE_SCALE_REFERENCE_NODES / n). ngraph's values were tuned for graphs of a few hundred nodes;
 * on tens of thousands the per-node forces are so large that every node moves at the unit speed clamp and the layout
 * never comes to rest (measured on the 58k-node Brightkite graph: 3,350 iterations to the settle rule with the
 * kinetic energy still at the clamp; a uniform 1/1000 factor settled in 1,000 with the energy decayed 25x).
 */
export const SE_SCALE_REFERENCE_NODES = 300;
/** Spring-electrical defaults: ngraph.forcelayout 3.3.1's (`lib/createPhysicsSimulator.js:29,34,40,54,59`; spec 7.20), plus the shared simulation defaults. `gravity` is ngraph's Coulomb constant: negative repels. */
export const SE_DEFAULTS: Readonly<{
    springLength: 10;
    springCoefficient: 0.8;
    gravity: -12;
    dragCoefficient: 0.9;
    timeStep: 0.5;
    dim: 2;
    scale: 1;
    settleThreshold: 0.001;
    settleWindow: 10;
    iterationsPerStep: 1;
    maxInFlight: 2;
}> = Object.freeze({
    springLength: 10,
    springCoefficient: 0.8,
    gravity: -12,
    dragCoefficient: 0.9,
    timeStep: 0.5,
    dim: 2,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
/** The smallest finest grid side `G` (spec 7.7 geometry table: `clamp(nextPow2(2 n^(1/dim)), 8, gridMax)`; P4 PD-9). */
export const GRID_MIN_SIDE = 8;
/** The coarsest pyramid level's side (spec 7.7: "levels (coarsest 4 per axis)", `levels = log2(G / 4) + 1`). */
export const GRID_COARSEST_SIDE = 4;
/** A cell with more than this many entries is summed by a workgroup (G4b) instead of the thread-per-cell loop of G4 (spec 7.7 G4: `count > 1024`). */
export const GRID_HUB_CELL = 1024;
/** The extent floor of spec 7.7: `cellSize = max(extent, 1e-6) / G`, so an all-coincident load never divides by zero. */
export const GRID_EXTENT_FLOOR = 1e-6;
/** The bbox margin of spec 7.7: `bboxExtent` is the largest axis of `state.min / max` "with a 1% margin". */
export const GRID_BBOX_MARGIN = 1.01;
/** The key width the grid always sorts with (P4 PD-5): three 8-bit passes cover the 19-bit 2D keys at G = 512 and the 22-bit 3D keys at G = 128, and an odd pass count leaves `sortedIdx` in the scratch pair. */
export const GRID_SORT_BITS = 24;
/** Design 8.4 (P8 PD-7): traversal levels recorded per submit -- one four-byte readback per 32 BFS levels, SSSP rounds or closeness levels. */
export const MAX_LEVELS_PER_SUBMIT = 32;
/** Design 8.4 and 6 row 8 (P8): a frontier at most this long runs the fused expand-contract kernel (Merrill's "fleeting iterations"); the default of the `fusedMax` uniform, which a test may set to 0 or `U32_MAX`. */
export const FUSED_FRONTIER_MAX = 4096;
/** P8-T4: the indirect dispatch slots `frontier-finalize` writes per level (expand, contract, fused, fill-bits, bitset-build, bottom-up, fused-retry); the args buffer is `MAX_LEVELS_PER_SUBMIT x FRONTIER_CANDIDATES x 16` bytes. */
export const FRONTIER_CANDIDATES = 7;
/** Design 8.4 (P8 PD-21): Beamer's beta -- switch back to top-down when `frontierCount * BEAMER_BETA < unvisitedCount` and the frontier is shrinking; alpha is derived from the graph, so it has no constant. */
export const BEAMER_BETA = 24;
/** Design 8.4 (P8 PD-22): the near-far split `delta = SSSP_DELTA_FACTOR * avgWeight / avgDegree`, computed on the host from the weight vector the run uses. */
export const SSSP_DELTA_FACTOR = 32;
/** The bit pattern of +Infinity, the unreached sentinel of `dist` (P8 PD-9); interpolated into the prelude as `F32_INF_BITS` so no body types the literal. */
export const F32_INF_BITS = 0x7f800000;
