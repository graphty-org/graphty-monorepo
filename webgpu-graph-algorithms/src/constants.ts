/**
 * Every numeric constant the package and the WGSL prelude share. The prelude (src/kernel/prelude.ts) interpolates
 * these values and never retypes them as literals (a literal grep in the tests enforces it); the planners read them; test/device/constants.test.ts
 * pins them. graph-format's INVALID_INDEX is imported by the prelude directly and is deliberately not copied.
 */

/** Workgroup size of every 1D kernel; `WG = min(WORKGROUP_SIZE, caps.limits.maxComputeInvocationsPerWorkgroup)` at runtime. */
export const WORKGROUP_SIZE = 256;
/** The spec minimum of maxComputeWorkgroupsPerDimension; asserted equal to the device limit at create(). */
export const MAX_WORKGROUPS_PER_DIM = 65535;
/** Items a 1D dispatch of WORKGROUP_SIZE covers: 65535 x 256 = 16,776,960, NOT 2^24. */
export const MAX_1D_ITEMS = MAX_WORKGROUPS_PER_DIM * WORKGROUP_SIZE;
/** The largest u32 (the `min` identity of the u32 reduce); interpolated into the prelude as `U32_MAX` so no body types the literal. */
export const U32_MAX = 0xffffffff;
/** The bins of one radix-sort pass, 2^8 (8 bits per pass); interpolated into the prelude as `RADIX_BINS` and `RADIX_DIGIT_MASK` (= bins - 1) so no body types the literal. */
export const RADIX_BINS = 256;
/** Arc-window boundaries are multiples of 64 arcs = 256 bytes. */
export const ARC_WINDOW_ALIGN = 64;
/** Storage-binding offset alignment the package always honors: the graph-format arena is 256-aligned. */
export const STORAGE_ALIGN = 256;
/** Stride of one UniformRing slot: minUniformBufferOffsetAlignment is 256 on every runtime the package targets. */
export const UNIFORM_SLOT_BYTES = 256;
/**
 * The default `exactMaxNodes`: with `repulsion: "auto"`, a layout runs the exact repulsion tier up to this many nodes
 * and the grid tier above it. The speed crossover is much lower: on an RTX 4070 SUPER under Dawn-node, exact / grid ms
 * per iteration (2D, 10 edges per node, profiler GPU time) measured 1k 0.102 / 0.290, 4k 0.262 / 0.188, 8k 0.484 /
 * 0.211, 16k 1.064 / 0.225, 32k 2.579 / 0.298, 65k 8.450 / 0.409, so the grid tier's near-constant ~0.2-0.3 ms floor
 * beats the exact tier from somewhere between 2k and 4k nodes (re-measured 2026-10-02, issue #732: still 1024 by the
 * rule calibrateLayout applies). The default stays at 32768, the largest size the exact tier runs within 4 ms per
 * iteration, because "auto" is what every consumer gets, the exact tier is the accurate one, and the grid tier's
 * far-field accuracy on clumpy and degenerate graphs is still being improved. A consumer whose GPU differs
 * (integrated, Apple, T4) or who prefers speed passes its own value through
 * createAccelerator(ctx, { layout: { exactMaxNodes } }); calibrateLayout(ctx) measures one for the device.
 */
export const EXACT_MAX_NODES = 32768;
/** Default number of MAP_READ staging buffers in the Readback ring. */
export const DEFAULT_STAGING_SLOTS = 3;
/** Timestamp query-set size of the Profiler: 256 slots, 2 per pass. */
export const PROFILER_QUERY_SLOTS = 256;
/** Byte size above which createBuffer runs inside an "out-of-memory" error scope. */
export const OOM_SCOPE_THRESHOLD_BYTES = 16 * 1024 * 1024;
/** Idle buffers kept per (size class, usage) by the BufferPool. */
export const POOL_MAX_IDLE_PER_CLASS = 4;
/** Smallest power-of-two pool class. */
export const POOL_MIN_CLASS_BYTES = 4 * 1024;
/** Largest power-of-two pool class; above it the classes grow linearly. */
export const POOL_MAX_POW2_CLASS_BYTES = 64 * 1024 * 1024;
/** The linear step of the pool classes above the largest power of two. */
export const POOL_LINEAR_STEP_BYTES = 16 * 1024 * 1024;
/** Default `warnUnreleasedSnapshots`. */
export const DEFAULT_WARN_UNRELEASED_SNAPSHOTS = 2;
/** The largest `iterations` a single step() records (the trace region and the uniform ring are sized by it); larger values are E_INVALID_ARGUMENT. */
export const MAX_ITERATIONS_PER_STEP = 256;
/** Bytes of one Fa2Trace record. */
export const TRACE_RECORD_BYTES = 32;
/** The state header is padded to 256 bytes so the trace region that follows it in the same buffer starts at a legal 256-aligned binding offset (128, the header's own size, is not a legal storage offset). */
export const STATE_HEADER_BYTES = 256;
/** Bytes of one per-workgroup partials record. */
export const PARTIAL_BYTES = 64;
/** ForceAtlas2 defaults. */
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
/** GPU-only layout tuning defaults: repulsion "auto", exactMaxNodes EXACT_MAX_NODES, nearMax 64, deterministic true, gridMax2D 512, gridMax3D 128, extentFactor 6, compat "paper". */
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
/** The distance floor `max(d, 0.01)`; interpolated into the prelude. */
export const FA2_DISTANCE_FLOOR = 0.01;
/** The square of FA2_DISTANCE_FLOOR. */
export const FA2_DISTANCE_FLOOR_SQ = 0.0001;
/** The coincident threshold `d^2 < 1e-8`. */
export const FA2_COINCIDENT_SQ = 1e-8;
/**
 * The most WG-node tiles one K3 (`fa2-repulsion-exact`) dispatch sums per invocation (issue #87). llvmpipe runs at
 * most 65,535 loop iterations per shader invocation, counted over every loop together, and then quietly breaks
 * out of each loop; one tile costs WG + 2 of them (258 at WG 256), so a single pass lost every node past
 * j = 65,027. 128 tiles is 33,024 iterations, half the budget; a larger exact run records ceil(tiles / 128) passes.
 */
export const EXACT_TILES_PER_PASS = 128;
/** Bits of Fa2Params.flags. */
export const FA2_FLAG_FIRST = 1;
/** Fa2Params.flags bit: the Fruchterman-Reingold temperature is the adaptive one in the state block, not the uniform's (the `cooling: "adaptive"` option). */
export const FA2_FLAG_ADAPTIVE = 2;
/** The Fruchterman-Reingold loop's starting temperature (the CPU simulation's, in `@graphty/layout`). */
export const FR_START_TEMPERATURE = 0.1;
/** The reheat point: the temperature index a reheat restarts at, as a fraction of `iterations`. */
export const FR_REHEAT_FRACTION = 0.7;
/** Adaptive cooling (Yifan Hu 2005, section 3.2): the temperature is multiplied by this when the force energy rose, divided by it after FR_COOLING_PATIENCE consecutive falls. */
export const FR_COOLING_STEP = 0.9;
/** Adaptive cooling: consecutive iterations of falling energy before the temperature grows. */
export const FR_COOLING_PATIENCE = 5;
/** Adaptive cooling: the iteration budget when `iterations` is not given (the schedule no longer needs one; this is the cap on a run that never settles). */
export const FR_ADAPTIVE_MAX_ITERATIONS = 10_000;
/** Fruchterman-Reingold defaults (the CPU simulation's, in `@graphty/layout`): `k` null = `1 / sqrt(n)`. */
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
/** Spring-electrical defaults: ngraph.forcelayout 3.3.1's (`lib/createPhysicsSimulator.js`), plus the shared simulation defaults. `gravity` is ngraph's Coulomb constant: negative repels. */
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
/**
 * The absolute settle floor of the shared settle rule (issue #97): an iteration counts toward `settled` only
 * when its mean displacement is at most `settleThreshold x rmsRadius` AND at most this fraction of the model's length
 * unit -- `springLength` for spring-electrical (scaled by node count, see SETTLE_FLOOR_REFERENCE_NODES), `k` for
 * Fruchterman-Reingold. The relative rule alone reported a spring
 * layout settled while it still grew (6 % over 1,000 iterations at 10k nodes). ForceAtlas2 writes
 * `SETTLE_FLOOR_UNBOUNDED` instead: it does not drift after settling, and its per-iteration jitter grows with n, so any
 * fixed floor only delays or blocks its stop. The values are measured:
 * design/decisions/2026-09-24-settle-rule-has-an-absolute-floor.md.
 */
export const SETTLE_FLOOR_FRACTION: Readonly<{ springElectrical: number; fruchtermanReingold: number }> = Object.freeze(
    {
        springElectrical: 3e-3,
        fruchtermanReingold: 2e-3,
    },
);
/**
 * The node count at which the spring-electrical floor is exactly `SETTLE_FLOOR_FRACTION.springElectrical x
 * springLength`; at `n` nodes it is that times `(SETTLE_FLOOR_REFERENCE_NODES / n)^(1/4)`. A spring layout's rms radius
 * grows about as n^(1/4) in springLengths (3.4 at 150 nodes, 6.4 at 2,000, 10.4 at 10,000), so the relative half of the
 * rule loosens with size while the floor tightens with it: on a small graph the floor sits above the relative threshold
 * and the relative rule decides alone, as before issue #97; on a large one the floor binds, which is where the relative
 * rule let an expanding layout stop. A fixed floor bound the 150-node story graph too, where the grid tier's jitter sits
 * at the relative threshold, and nearly doubled its settle (427 -> 829 iterations on the RTX 4070 SUPER).
 */
export const SETTLE_FLOOR_REFERENCE_NODES = 2000;
/** The settle floor that never binds: the largest finite f32, 0x1.fffffep+127 (ForceAtlas2's `settleFloor`, issue #97). */
export const SETTLE_FLOOR_UNBOUNDED = 2 ** 128 - 2 ** 104;
/** The smallest finest grid side `G` (geometry table: `clamp(nextPow2(2 n^(1/dim)), 8, gridMax)`). */
export const GRID_MIN_SIDE = 8;
/** The coarsest pyramid level's side (coarsest 4 per axis, `levels = log2(G / 4) + 1`). */
export const GRID_COARSEST_SIDE = 4;
/** A cell with more than this many entries is summed by a whole workgroup instead of one thread per cell. */
export const GRID_HUB_CELL = 1024;
/** The extent floor: `cellSize = max(extent, 1e-6) / G`, so an all-coincident load never divides by zero. */
export const GRID_EXTENT_FLOOR = 1e-6;
/** The bbox margin: `bboxExtent` is the largest axis of `state.min / max` "with a 1% margin". */
export const GRID_BBOX_MARGIN = 1.01;
/** The key width the grid always sorts with: three 8-bit passes cover the 19-bit 2D keys at G = 512 and the 22-bit 3D keys at G = 128, and an odd pass count leaves `sortedIdx` in the scratch pair. */
export const GRID_SORT_BITS = 24;
/** The value of `ClusterOptions.communities` for a row in no community: the twin of layout's NO_CLUSTER. */
export const NO_CLUSTER = 0xffffffff;
/** The collision force reads this many entries of a hash bucket: a crowd costs a bounded amount per node while it spreads. */
export const COLLIDE_CELL_MAX = 256;
/** The most hash buckets of the collision force, under GRID_SORT_BITS. */
export const COLLIDE_MAX_BUCKETS = 2 ** 22;
/** The collision sweeps of a settling simulation's last batch: the GPU twin of layout's COLLISION_FINAL_SWEEPS. */
export const COLLIDE_FINAL_SWEEPS = 256;
/** Traversal levels recorded per submit -- one four-byte readback per 32 BFS levels, SSSP rounds or closeness levels. */
export const MAX_LEVELS_PER_SUBMIT = 32;
/** A frontier at most this long runs the fused expand-contract kernel (Merrill's "fleeting iterations"); the default of the `fusedMax` uniform, which a test may set to 0 or `U32_MAX`. */
export const FUSED_FRONTIER_MAX = 4096;
/**
 * Beamer's alpha for the GPU BFS (issue #1358; it replaced `max(1, floor(arcCount / n))`): switch to bottom-up
 * once the frontier's out-arcs exceed `max(unvisitedCount, unvisitedInArcs / BEAMER_ALPHA)`. Measured on 10,000-node
 * power-law and small-world graphs, a bottom-up sweep read 15-52 % of the unvisited in-arcs at the levels where it
 * paid (Beamer's 14 assumes about 7 %), so 2; the average degree it replaced (8 and 16 there) switched the small-world
 * graph a level early, reading 60,008 arcs where top-down read 36,338.
 */
export const BEAMER_ALPHA = 2;

/** Beamer's beta -- switch back to top-down when `frontierCount * BEAMER_BETA < unvisitedCount` and the frontier is shrinking. */
export const BEAMER_BETA = 24;
/** The near-far split `delta = SSSP_DELTA_FACTOR * avgWeight / avgDegree`, computed on the host from the weight vector the run uses. */
export const SSSP_DELTA_FACTOR = 32;
/** The bit pattern of +Infinity, the unreached sentinel of `dist`; interpolated into the prelude as `F32_INF_BITS` so no body types the literal. */
export const F32_INF_BITS = 0x7f800000;
/** The share of `maxBufferSize` one betweenness source batch may hold. WebGPU exposes no device memory size, so this is a fraction of the largest buffer, not a memory measurement. */
export const BC_BATCH_BUDGET_FRACTION = 0.25;
/**
 * The most sources one betweenness batch runs together. 256 rather than 64 (issue #733): a batch's
 * cost is dominated by its per-level submits and readbacks, not by its width, so a quarter of the batches runs an
 * exact call on random graphs of 1k / 2k / 4k nodes (4 edges per node, RTX 4070 SUPER) 2.8x / 2.5x / 1.8x faster
 * with the frontier forward form and 1.9x / 1.6x / 1.5x with the per-batch choice, with bit-identical vertex and
 * edge scores (the gathers add every source's dependency in source order whatever the batching). The memory budget
 * still decides k above about 16k nodes at default limits, so large graphs are unchanged. Forward levels per submit
 * stay at `MAX_LEVELS_PER_SUBMIT`: the parameter ring is sized for it.
 */
export const BC_MAX_BATCH = 256;
/**
 * McLaughlin-Bader: a betweenness batch runs the edge-parallel forward pass when the previous batch's
 * level count is below `BC_EDGE_PARALLEL_GAMMA * log2(n)` -- and only on a graph `BC_EDGE_PARALLEL_MIN_NODES` and
 * `BC_EDGE_PARALLEL_MAX_SKEW` admit (issue #776). Measured 2026-11-10 (768 sources in batches of 256, RTX 4070 SUPER,
 * median of 5, edge time / frontier time): the depth test alone separates nothing that matters -- every shallow
 * graph had levels / log2(n) between 0.42 and 0.8 and every deep one (grids, paths) 6 or more, where the edge form is
 * 5.6-12x slower, so any gamma between 1 and 6 is the same rule -- while size and degree skew decide the shallow ones:
 * G(n, 4n) 1k-24k 3.3x-1.5x slower, 32k-128k 0.6x-0.8x (faster); R-MAT x8 2^10-2^18 1.4x-2.3x slower at every size.
 */
export const BC_EDGE_PARALLEL_GAMMA = 2;
/** Issue #776: the edge-parallel forward form is never chosen below this many nodes (G(n, 4n): 24k nodes 1.48x slower than the frontier form, 32k 0.72x). See `BC_EDGE_PARALLEL_GAMMA`. */
export const BC_EDGE_PARALLEL_MIN_NODES = 28_000;
/** Issue #776: the edge-parallel forward form is never chosen when the largest degree exceeds this multiple of the mean (R-MAT x8 measured 65-1857 and lost at every size; G(n, m) 1.7-2.6 and won from 32k nodes). See `BC_EDGE_PARALLEL_GAMMA`. */
export const BC_EDGE_PARALLEL_MAX_SKEW = 32;
/**
 * Betweenness path counts that wrapped u32 are recounted as f32, rescaled per depth by a power of two (`bc-count`):
 * when the largest count at one depth has a binary exponent above this cap, the next depth's counts are scaled down so
 * that largest count lands at 2^cap. A count then never exceeds 2^cap x 2 x (in-degree), below f32's 2^128 for any
 * in-degree a binding can hold (2^25), and the counts at one depth may span 2^(cap + 126) before the smallest leaves
 * f32's normal range, which is when the overflow flag rises (measured: a corner of a 235 x 235 grid, not of a 230 x 230
 * one). Powers of two scale without rounding, so the scores do not depend on the cap.
 */
export const BC_SIGMA_EXPONENT_CAP = 100;
/** The most workgroups one `bc-count` dispatch launches (it grid-strides over the level): sized for the largest level, a dispatch of n x k lanes costs every level a mostly idle launch, which doubled a 100 x 100 grid's run on an RTX 4070 SUPER; 256 measured 1.3 s against 2.0 s there. */
export const BC_COUNT_MAX_GROUPS = 256;
/** Backward-pass levels recorded per submit: each level is one dispatch with its own parameter record, so this bounds the uniform ring. */
export const BC_BACKWARD_LEVELS_PER_SUBMIT = 64;
/**
 * All-pairs shortest paths is a blocked Floyd-Warshall over `APSP_TILE x APSP_TILE` tiles. One tile of
 * f32 is 4 KiB of workgroup memory and a workgroup stages at most two (8 KiB), inside the 16 KiB
 * `maxComputeWorkgroupStorageSize` every WebGPU device reports. Interpolated into the prelude as `APSP_TILE`.
 */
export const APSP_TILE = 32;
/**
 * The blocked sweep records `3 x ceil(n / APSP_TILE)` dispatches (543 at the 5,792-node ceiling of a 128 MiB binding,
 * 2,175 at a 2 GiB binding's 23,170, 3,072 at a 4 GiB binding's 32,767); above this many the driver splits the sweep
 * into further submits. No binding offered today reaches it, so every sweep is one submit; the cap only stops a
 * device with a binding above 4 GiB (`maxStorageBufferBindingSize` is a GPUSize64) from building one unbounded
 * command buffer.
 */
export const APSP_MAX_DISPATCHES_PER_SUBMIT = 4096;
/**
 * Label propagation: passes recorded per submit, with ONE readback of the per-pass changed counts at the
 * end of the submit. A readback costs about 2 ms in Chromium whatever it carries, so at one readback per pass a
 * 10,000-node call spends more on synchronization than the CPU spends on the whole algorithm
 * (design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md: 101 passes x 2 ms, 0.79x); eight passes per
 * submit is the floor that decision sets. Even, so every submit holds as many descending as ascending passes of the
 * alternating direction rule.
 */
export const LABEL_PROP_PASSES_PER_SUBMIT = 8;
/**
 * Boruvka's minimum spanning tree: rounds recorded per submit, with one readback of the counters block
 * per submit. Each readback is a device-to-host synchronization that costs about 2 ms in Chromium, and at one per
 * round the syncs are 61 % of the 100,000-node call; four rounds per submit amortize them over O(log n) rounds, moving
 * the Chromium crossover from 6,000 to 4,600 nodes (design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md).
 * `src/algorithms/mst.ts` reads it.
 */
export const BORUVKA_ROUNDS_PER_SUBMIT = 4;
/**
 * The sign bit of an f32 bit pattern; interpolated into the prelude as `F32_SIGN_BIT` for `order_key`, the
 * order-preserving u32 key of an f32 that Boruvka's `atomicMin` over edge weights runs on.
 */
export const F32_SIGN_BIT = 0x80000000;
/** The per-row group-by-key: a row of at most this many arcs is grouped by one thread in registers; a longer row by a workgroup over a global open-addressing region. */
export const GROUP_ROW_THREAD_MAX = 32;
/** The largest row the thread tier accepts when a caller forces the tier: its pairwise scan is about d^2 / 2 loop steps, and llvmpipe stops every loop of an invocation after 65,535 steps in total. */
export const GROUP_ROW_THREAD_LIMIT = 128;
/**
 * The most parallel arcs the simple symmetric graph build merges into one weighted arc. The merge sums each run of
 * parallel arcs in one invocation, and llvmpipe stops every loop of an invocation after 65,535 steps in total and
 * then quietly returns a short sum; a weighted build whose pair repeats more often is refused on every adapter.
 */
export const PARALLEL_MERGE_LIMIT = 65_000;
/** The per-row group-by-key: the global open-addressing region of a workgroup-tier row holds this many slots per arc. */
export const GROUP_HASH_LOAD_FACTOR = 2;
/** Triangle counting: intersect two oriented rows by merge, but binary-search each element of the shorter row into the longer when their lengths differ by more than this factor. */
export const TRIANGLE_BINARY_SEARCH_RATIO = 32;
