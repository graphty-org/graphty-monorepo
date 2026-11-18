/// <reference types="@webgpu/types" preserve="true" />
/**
 * The public barrel of @graphty/webgpu-graph-algorithms: explicit named exports only, values and `export type`, no
 * star re-exports, no default export, nothing from src/browser/** or src/node/** (their own entries; imported by
 * nothing else in src/) and nothing of the internal surface (GraphResidency, BufferPool, Readback, Lease,
 * PipelineCache, Kernel, CommandBatch, UniformRing, UniformBlock, composeWgsl, KERNELS, ForceSimulation,
 * ForceAtlas2Model: tests import them from their files). test/index.test.ts pins the value list and
 * test/types/public-api.test-d.ts the type list. This comment must never spell the internal
 * JSDoc tag: it is the leading comment of the first export statement, and stripInternal would drop that statement
 * from the emitted declarations.
 */

// ==================== constants and errors
export {
    ARC_WINDOW_ALIGN,
    EXACT_MAX_NODES,
    FA2_DEFAULTS,
    FR_DEFAULTS,
    LAYOUT_TUNING_DEFAULTS,
    MAX_1D_ITEMS,
    MAX_WORKGROUPS_PER_DIM,
    SE_DEFAULTS,
    STORAGE_ALIGN,
    WORKGROUP_SIZE,
} from "./constants.js";
export {
    hasErrorCode,
    isWebGpuGraphError,
    PASSTHROUGH_FORMAT_CODES,
    WebGpuGraphError,
    type WebGpuGraphErrorCode,
} from "./errors.js";

// ==================== context, adapter classifier, profiler
export { GpuContext } from "./context.js";
export { isSoftwareAdapter } from "./device/acquire.js";
export type { GpuTrace } from "./kernel/batch.js";
export type { PassTiming, Profiler } from "./kernel/profiler.js";

// ==================== the device self-check: what this device computed when it was asked an answer we already
// know. Every compute entry point awaits it and refuses a device that got it wrong (E_DEVICE_INCORRECT); a
// caller may await it first to ask before committing.
export { verifyDevice } from "./primitives/verify.js";

// ==================== algorithms (the walking-skeleton diagnostic)
export { degree } from "./algorithms/degree.js";

// ==================== algorithms (the SpMV family and WCC)
export { connectedComponents } from "./algorithms/components.js";
export { pageRank, personalizedPageRank } from "./algorithms/pagerank.js";
export { eigenvectorCentrality, hits, katzCentrality } from "./algorithms/spectral.js";

// ==================== algorithms (the frontier family; the seam's option types in)
export { bellmanFord } from "./algorithms/bellman-ford.js";
export { betweennessCentrality, edgeBetweennessCentrality } from "./algorithms/betweenness.js";
export { breadthFirstSearch } from "./algorithms/bfs.js";
export { closenessCentrality } from "./algorithms/closeness.js";
export { sssp } from "./algorithms/sssp.js";

// ==================== algorithms (all-pairs shortest paths)
export { allPairsShortestPath } from "./algorithms/all-pairs.js";
// ==================== algorithms (structure and community)
export { labelPropagation } from "./algorithms/label-propagation.js";
export { minimumSpanningTree } from "./algorithms/mst.js";
export { triangleCount } from "./algorithms/triangles.js";

// ==================== layouts, the accelerator and calibrateLayout
export { createAccelerator } from "./accelerator.js";
export { calibrateLayout } from "./layouts/calibrate.js";
export { createForceAtlas2 } from "./layouts/forceatlas2.js";
export { createFruchtermanReingold } from "./layouts/fruchterman-reingold.js";
export { seedPositions } from "./layouts/seed.js";
export { createSpringElectrical } from "./layouts/spring-electrical.js";

// ==================== types: the accelerator surface and the re-exported declarations of @graphty/layout
// and @graphty/algorithms, both `import type`
export type {
    AcceleratorOptions,
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsOptions,
    BfsResultLike,
    ClosenessAcceleratorOptions,
    ClosenessResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    GpuAccelerator,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    LayoutAccelerator,
    LayoutSimulation,
    MstOptions,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspOptions,
    SsspResultLike,
} from "./types/accelerator.js";

// ==================== types: the traversal results; the option types are the seam's
// BfsOptions / SsspOptions / HitsOptionsLike above
export type { LabelPropagationOptions } from "./types/community.js";
export type { GpuMstResult, GpuTriangleResult } from "./types/structure.js";
export type { GpuBellmanFordResult, GpuBfsResult, GpuSsspResult } from "./types/traversal.js";

// ==================== types: the betweenness results; the option type is the seam's
// BetweennessAcceleratorOptions above
export type { GpuBetweennessResult, GpuEdgeScoresResult } from "./types/betweenness.js";
// ==================== types: all-pairs shortest paths
export type { ApspOptions, GpuApspResult } from "./types/all-pairs.js";

// ==================== types: the SpMV-family and WCC results and option records
export type {
    ComponentsOptions,
    EigenvectorOptions,
    GpuClosenessResult,
    GpuHitsResult,
    GpuLabelResult,
    GpuPageRankResult,
    GpuScoresResult,
    HitsOptions,
    KatzOptions,
    PageRankOptions,
} from "./types/algorithms.js";

// ==================== types: context and capabilities
export type {
    AdapterInfoLike,
    AdapterSummary,
    DeviceCheck,
    DeviceCheckMismatch,
    FromOptions,
    GpuCaps,
    GpuContextOptions,
    LimitPolicy,
    PlanCaps,
    PlanLimits,
    ProbeOptions,
    ProbeResult,
    RaisableLimit,
} from "./types/context.js";

// ==================== types: layouts (the stats and trace records; the calibration records)
export type {
    CalibrateOptions,
    DrawnOutput,
    DrawnTransform,
    ForceAtlas2Stats,
    ForceAtlas2TraceRecord,
    FruchtermanReingoldStats,
    FruchtermanReingoldTraceRecord,
    GpuCalibration,
    GpuLayoutSimulation,
    GpuLayoutTuning,
    LayoutStatsBase,
    RunOptions,
    SpringElectricalStats,
    SpringElectricalTraceRecord,
} from "./types/layout.js";
export type {
    ClusterOptions,
    CollisionOptions,
    CommonLayoutOptions,
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationOptions,
    SpringElectricalOptions,
} from "./types/options.js";

// ==================== types: run options
export type { GpuRunOptions } from "./types/run.js";
