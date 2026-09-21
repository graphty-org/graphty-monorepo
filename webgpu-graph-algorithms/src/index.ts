/// <reference types="@webgpu/types" preserve="true" />
/**
 * The public barrel of @graphty/webgpu-graph-algorithms (spec 2.5, 3.3; contract 3.15): explicit named exports only,
 * values and `export type`, no star re-exports, no default export, nothing from src/browser/** or src/node/** (their
 * own entries; imported by nothing else in src/, 2.4) and nothing of the internal surface (GraphResidency,
 * BufferPool, Readback, Lease, PipelineCache, Kernel, CommandBatch, UniformRing, UniformBlock, composeWgsl, KERNELS,
 * ForceSimulation, ForceAtlas2Model: tests import them from their files). P0: the error class, the constants and
 * isSoftwareAdapter. P1 adds GpuContext and degree (values) and the context / run / profiler types. P2 adds nothing
 * (Lease, CommandBatch, UniformRing are internal). P3 adds the layout factory, the accelerator, the two default
 * tables, the seeder and the layout / accelerator types. P5 adds the two factories, the two default tables and the
 * two stats records. P4 adds calibrateLayout and its two records. test/index.test.ts pins the value list and
 * test/types/public-api.test-d.ts the type list. This comment must never spell the internal
 * JSDoc tag: it is the leading comment of the first export statement, and stripInternal would drop that statement
 * from the emitted declarations.
 */

// ==================== constants and errors (P0; FA2_DEFAULTS / LAYOUT_TUNING_DEFAULTS public from P3, FR_DEFAULTS /
// SE_DEFAULTS from P5)
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

// ==================== context, adapter classifier, profiler (P0 / P1)
export { GpuContext } from "./context.js";
export { isSoftwareAdapter } from "./device/acquire.js";
export type { PassTiming, Profiler } from "./kernel/profiler.js";

// ==================== algorithms (P1: the walking-skeleton diagnostic, spec 3.3)
export { degree } from "./algorithms/degree.js";

// ==================== algorithms (P7: the SpMV family and WCC, spec 8.2, 8.3)
export { connectedComponents } from "./algorithms/components.js";
export { pageRank, personalizedPageRank } from "./algorithms/pagerank.js";
export { eigenvectorCentrality, hits, katzCentrality } from "./algorithms/spectral.js";

// ==================== layouts and the accelerator (P3; the two P5 factories; P4's calibrateLayout, spec 2.2)
export { createAccelerator } from "./accelerator.js";
export { calibrateLayout } from "./layouts/calibrate.js";
export { createForceAtlas2 } from "./layouts/forceatlas2.js";
export { createFruchtermanReingold } from "./layouts/fruchterman-reingold.js";
export { seedPositions } from "./layouts/seed.js";
export { createSpringElectrical } from "./layouts/spring-electrical.js";

// ==================== types: the accelerator surface and the re-exported declarations of @graphty/layout (spec 9.3)
// and @graphty/algorithms (spec 9.2), both `import type` since W1b (D27)
export type {
    AcceleratorOptions,
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    GpuAccelerator,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    LayoutAccelerator,
    LayoutSimulation,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
} from "./types/accelerator.js";

// ==================== types: the P7 algorithm results and option records (spec 3.3 lines 815-828, 9.7)
export type {
    ComponentsOptions,
    EigenvectorOptions,
    GpuHitsResult,
    GpuLabelResult,
    GpuPageRankResult,
    GpuScoresResult,
    HitsOptions,
    KatzOptions,
    PageRankOptions,
} from "./types/algorithms.js";

// ==================== types: context and capabilities (P0 / P1)
export type {
    AdapterInfoLike,
    AdapterSummary,
    GpuCaps,
    GpuContextOptions,
    LimitPolicy,
    PlanCaps,
    PlanLimits,
    ProbeOptions,
    ProbeResult,
    RaisableLimit,
} from "./types/context.js";

// ==================== types: layouts (P3; the P5 stats and trace records; the P4 calibration records)
export type {
    CalibrateOptions,
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
    CommonLayoutOptions,
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationOptions,
    SpringElectricalOptions,
} from "./types/options.js";

// ==================== types: run options (P1)
export type { GpuRunOptions } from "./types/run.js";
