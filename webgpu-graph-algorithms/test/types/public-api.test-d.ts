import { type IndexedPageRankOptions } from "@graphty/algorithms";
import { type F32, type F64, type GraphSnapshot, type NumericVector, type U32 } from "@graphty/graph-format";
import {
    type AcceleratorOptions,
    type AdapterInfoLike,
    type AdapterSummary,
    type AlgorithmAccelerator,
    type ApspResultLike,
    ARC_WINDOW_ALIGN,
    type BellmanFordResultLike,
    type BetweennessAcceleratorOptions,
    type BfsResultLike,
    calibrateLayout,
    type CalibrateOptions,
    type CommonLayoutOptions,
    type CommunityResultLike,
    type ComponentsOptions,
    connectedComponents,
    type CorenessResultLike,
    createAccelerator,
    createForceAtlas2,
    createFruchtermanReingold,
    createSpringElectrical,
    degree,
    type EdgeScoresResultLike,
    eigenvectorCentrality,
    type EigenvectorOptions,
    EXACT_MAX_NODES,
    FA2_DEFAULTS,
    type ForceAtlas2Options,
    type ForceAtlas2Stats,
    type ForceAtlas2TraceRecord,
    FR_DEFAULTS,
    type FruchtermanReingoldOptions,
    type FruchtermanReingoldStats,
    type FruchtermanReingoldTraceRecord,
    type GpuAccelerator,
    type GpuCalibration,
    type GpuCaps,
    GpuContext,
    type GpuContextOptions,
    type GpuHitsResult,
    type GpuLabelResult,
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type GpuPageRankResult,
    type GpuRunOptions,
    type GpuScoresResult,
    hasErrorCode,
    hits,
    type HitsOptions,
    type HitsOptionsLike,
    type HitsResultLike,
    isSoftwareAdapter,
    isWebGpuGraphError,
    katzCentrality,
    type KatzOptions,
    type LabelResultLike,
    LAYOUT_TUNING_DEFAULTS,
    type LayoutAccelerator,
    type LayoutSimulation,
    type LayoutStatsBase,
    type LimitPolicy,
    MAX_1D_ITEMS,
    MAX_WORKGROUPS_PER_DIM,
    type MstResultLike,
    pageRank,
    type PageRankOptions,
    type PageRankResultLike,
    PASSTHROUGH_FORMAT_CODES,
    type PassTiming,
    personalizedPageRank,
    type PlanCaps,
    type PlanLimits,
    type ProbeOptions,
    type ProbeResult,
    type Profiler,
    type RaisableLimit,
    type RunOptions,
    type ScoresResultLike,
    SE_DEFAULTS,
    seedPositions,
    type SimulationOptions,
    type SpringElectricalOptions,
    type SpringElectricalStats,
    type SpringElectricalTraceRecord,
    type SsspResultLike,
    STORAGE_ALIGN,
    WebGpuGraphError,
    type WebGpuGraphErrorCode,
    WORKGROUP_SIZE,
} from "@graphty/webgpu-graph-algorithms";
import {
    type BrowserGpuOptions,
    probeBrowserWebGpu,
    requestGpuContext,
} from "@graphty/webgpu-graph-algorithms/browser";
import {
    createNodeGpu,
    createNodeGpuContext,
    dawnFlags,
    type NodeGpuHandle,
    type NodeGpuOptions,
    probeNodeWebGpu,
} from "@graphty/webgpu-graph-algorithms/node";
import { expectTypeOf } from "vitest";

// The strict-consumer sample of spec 11.3 / design 16.6. Compiled by `tsc -p tsconfig.strict-consumer.json` against
// dist/webgpu-graph-algorithms.d.ts, dist/browser.d.ts and dist/node.d.ts with noUncheckedIndexedAccess and
// exactOptionalPropertyTypes ON (after `pnpm run build:all`), and by `tsc --noEmit -p tsconfig.json` against src/;
// never executed. The import list above IS the pinned type list of contract 3.15: noUnusedLocals fails the compile
// for a name the barrel dropped, and every imported name is used below.

declare const ctx: GpuContext;
declare const snapshot: GraphSnapshot;
declare const positions: F32;
declare const info: GPUAdapterInfo;
type Fa2Sim = GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
type FrSim = GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
type SeSim = GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;

// ---- errors (contract 3.1): construct, brand-check, narrow a code
const err = new WebGpuGraphError("E_TOO_LARGE", "needs 3 GiB", {
    needed: 3,
    limit: 2,
    path: "colIdx",
    algorithm: null,
});
expectTypeOf(WebGpuGraphError).toBeConstructibleWith("E_NO_ADAPTER", "no adapter");
expectTypeOf(WebGpuGraphError).toBeConstructibleWith("E_NO_ADAPTER", "no adapter", { reason: "none" });
type CtorParams = ConstructorParameters<typeof WebGpuGraphError>;
expectTypeOf<CtorParams[0]>().toEqualTypeOf<WebGpuGraphErrorCode>();
expectTypeOf<CtorParams[1]>().toBeString();
expectTypeOf<CtorParams[2]>().toEqualTypeOf<Record<string, unknown> | undefined>();
expectTypeOf(err).toMatchTypeOf<Error>();
expectTypeOf(err.code).toEqualTypeOf<WebGpuGraphErrorCode>();
expectTypeOf(err.details).toEqualTypeOf<Readonly<Record<string, unknown>>>();
expectTypeOf(err.details.needed).toBeUnknown();
expectTypeOf(err.name).toEqualTypeOf<"WebGpuGraphError">();
if (err.code === "E_DEVICE_LOST") {
    expectTypeOf(err.code).toEqualTypeOf<"E_DEVICE_LOST">();
}
declare const maybe: unknown;
if (isWebGpuGraphError(maybe)) {
    expectTypeOf(maybe).toEqualTypeOf<WebGpuGraphError>();
}
expectTypeOf(hasErrorCode).parameter(1).toEqualTypeOf<WebGpuGraphErrorCode>();
expectTypeOf(hasErrorCode(maybe, "E_ABORTED")).toBeBoolean();
expectTypeOf<WebGpuGraphErrorCode>().toEqualTypeOf<
    | "E_NO_WEBGPU"
    | "E_NO_ADAPTER"
    | "E_NO_DEVICE"
    | "E_SOFTWARE_ONLY"
    | "E_DEVICE_LOST"
    | "E_DISPOSED"
    | "E_VALIDATION"
    | "E_SHADER_COMPILE"
    | "E_OUT_OF_MEMORY"
    | "E_TOO_LARGE"
    | "E_UNSUPPORTED"
    | "E_INVALID_ARGUMENT"
    | "E_SNAPSHOT"
    | "E_RELEASED"
    | "E_NOT_LOADED"
    | "E_ABORTED"
>();
expectTypeOf<"E_IN_FLIGHT">().not.toMatchTypeOf<WebGpuGraphErrorCode>(); // spec 3.3: a saturated step() coalesces
expectTypeOf<typeof PASSTHROUGH_FORMAT_CODES>().toEqualTypeOf<
    readonly ["E_GPU_INELIGIBLE", "E_UNKNOWN_NODE", "E_UNKNOWN_COLUMN", "E_COLUMN_LENGTH"]
>();

// ---- constants (contract 3.2): literal types where the value is fixed for good; EXACT_MAX_NODES is re-fixed at G3
expectTypeOf<typeof WORKGROUP_SIZE>().toEqualTypeOf<256>();
expectTypeOf<typeof MAX_WORKGROUPS_PER_DIM>().toEqualTypeOf<65535>();
expectTypeOf<typeof MAX_1D_ITEMS>().toBeNumber();
expectTypeOf<typeof ARC_WINDOW_ALIGN>().toEqualTypeOf<64>();
expectTypeOf<typeof STORAGE_ALIGN>().toEqualTypeOf<256>();
expectTypeOf<typeof EXACT_MAX_NODES>().toBeNumber();
expectTypeOf(FA2_DEFAULTS.maxIter).toEqualTypeOf<100>();
expectTypeOf(FA2_DEFAULTS.dim).toEqualTypeOf<2>();
expectTypeOf(FA2_DEFAULTS.settleThreshold).toEqualTypeOf<0.001>();
expectTypeOf(FA2_DEFAULTS.maxInFlight).toEqualTypeOf<2>();
expectTypeOf(FA2_DEFAULTS.strongGravity).toEqualTypeOf<false>();
expectTypeOf(LAYOUT_TUNING_DEFAULTS.repulsion).toEqualTypeOf<"auto">();
expectTypeOf(LAYOUT_TUNING_DEFAULTS.compat).toEqualTypeOf<"paper">();
expectTypeOf(LAYOUT_TUNING_DEFAULTS.exactMaxNodes).toBeNumber();
expectTypeOf(LAYOUT_TUNING_DEFAULTS.deterministic).toEqualTypeOf<true>();
// P5: the two model default tables (spec 7.20)
expectTypeOf(FR_DEFAULTS.k).toEqualTypeOf<null>();
expectTypeOf(FR_DEFAULTS.iterations).toEqualTypeOf<50>();
expectTypeOf(FR_DEFAULTS.fixed).toEqualTypeOf<null>();
expectTypeOf(SE_DEFAULTS.springLength).toEqualTypeOf<10>();
expectTypeOf(SE_DEFAULTS.springCoefficient).toEqualTypeOf<0.8>();
expectTypeOf(SE_DEFAULTS.gravity).toEqualTypeOf<-12>();
expectTypeOf(SE_DEFAULTS.dragCoefficient).toEqualTypeOf<0.9>();
expectTypeOf(SE_DEFAULTS.timeStep).toEqualTypeOf<0.5>();

// ---- context and capabilities (contract 3.3, 3.5)
expectTypeOf(GpuContext.probe).parameter(0).toEqualTypeOf<ProbeOptions>();
expectTypeOf(GpuContext.probe).returns.resolves.toEqualTypeOf<ProbeResult>();
expectTypeOf(GpuContext.create).parameter(0).toEqualTypeOf<GpuContextOptions>();
expectTypeOf(GpuContext.create).returns.resolves.toEqualTypeOf<GpuContext>();
expectTypeOf(GpuContext.from).parameter(0).toEqualTypeOf<GPUDevice>();
expectTypeOf(GpuContext.from).parameter(1).toEqualTypeOf<Partial<GpuCaps> | undefined>();
expectTypeOf(ctx.device).toEqualTypeOf<GPUDevice>();
expectTypeOf(ctx.caps).toEqualTypeOf<GpuCaps>();
expectTypeOf(ctx.state).toEqualTypeOf<"ready" | "lost" | "disposed">();
expectTypeOf(ctx.lost).resolves.toEqualTypeOf<GPUDeviceLostInfo>();
expectTypeOf(ctx.profiler).toEqualTypeOf<Profiler | null>();
expectTypeOf(ctx.release).parameter(0).toEqualTypeOf<GraphSnapshot>();
expectTypeOf(ctx.release).returns.toBeVoid();
expectTypeOf(ctx.dispose).returns.toBeVoid();
expectTypeOf<GpuCaps["limits"]>().toEqualTypeOf<GPUSupportedLimits>();
expectTypeOf<GpuCaps["runtime"]>().toEqualTypeOf<"browser" | "node" | "unknown">();
expectTypeOf<GpuCaps["features"]>().toEqualTypeOf<ReadonlySet<string>>();
expectTypeOf<GpuCaps>().toMatchTypeOf<PlanCaps>(); // "a GpuCaps IS a PlanCaps" (contract 3.3)
expectTypeOf<GPUSupportedLimits>().toMatchTypeOf<PlanLimits>(); // the branded limits are structurally a PlanLimits
expectTypeOf<keyof PlanLimits>().toEqualTypeOf<
    | "maxBufferSize"
    | "maxStorageBufferBindingSize"
    | "maxStorageBuffersPerShaderStage"
    | "minStorageBufferOffsetAlignment"
    | "minUniformBufferOffsetAlignment"
    | "maxComputeWorkgroupsPerDimension"
    | "maxComputeInvocationsPerWorkgroup"
    | "maxComputeWorkgroupSizeX"
    | "maxComputeWorkgroupStorageSize"
    | "maxUniformBufferBindingSize"
>();
expectTypeOf<RaisableLimit>().toEqualTypeOf<
    | "maxBufferSize"
    | "maxStorageBufferBindingSize"
    | "maxStorageBuffersPerShaderStage"
    | "maxComputeWorkgroupStorageSize"
    | "maxComputeInvocationsPerWorkgroup"
    | "maxComputeWorkgroupSizeX"
>();
expectTypeOf<LimitPolicy>().toEqualTypeOf<"default" | "raise" | Readonly<Partial<Record<RaisableLimit, number>>>>();
expectTypeOf<GpuContextOptions["limits"]>().toEqualTypeOf<LimitPolicy | undefined>();
expectTypeOf<GpuContextOptions["onError"]>().toEqualTypeOf<((error: WebGpuGraphError) => void) | undefined>();
expectTypeOf<ProbeOptions["gpu"]>().toEqualTypeOf<GPU | undefined>();
expectTypeOf<ProbeResult["code"]>().toEqualTypeOf<"OK" | "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY">();
expectTypeOf<ProbeResult["adapter"]>().toEqualTypeOf<GPUAdapter | null>();
expectTypeOf<ProbeResult["summary"]>().toEqualTypeOf<AdapterSummary | null>();
expectTypeOf<ProbeResult["reason"]>().toEqualTypeOf<string | null>();
expectTypeOf<AdapterSummary["limits"]>().toEqualTypeOf<Readonly<Record<string, number>>>();
expectTypeOf<AdapterSummary["software"]>().toBeBoolean();
expectTypeOf(isSoftwareAdapter).parameter(0).toEqualTypeOf<AdapterInfoLike>();
expectTypeOf(isSoftwareAdapter).returns.toBeBoolean();
expectTypeOf(info).toMatchTypeOf<AdapterInfoLike>(); // the branded GPUAdapterInfo passes without a cast
expectTypeOf<PassTiming>().toEqualTypeOf<{ readonly label: string; readonly ns: number }>();
expectTypeOf<Profiler["enabled"]>().toBeBoolean();
expectTypeOf<Profiler["quantised"]>().toBeBoolean();
expectTypeOf<Profiler["beginPass"]>().returns.toEqualTypeOf<GPUComputePassTimestampWrites | undefined>();

// ---- the algorithm surface (P1: degree; contract 3.12) and its run options
expectTypeOf(degree).parameter(1).toEqualTypeOf<GraphSnapshot>();
expectTypeOf(degree).parameter(2).toEqualTypeOf<GpuRunOptions | undefined>();
expectTypeOf(degree).returns.resolves.toEqualTypeOf<U32>();
expectTypeOf<GpuRunOptions["dest"]>().toEqualTypeOf<Float32Array | Uint32Array | undefined>();
expectTypeOf<GpuRunOptions["onProgress"]>().toEqualTypeOf<((done: number, total: number) => void) | undefined>();

// ---- the P7 algorithms (spec 3.3 lines 815-828, 8.2, 8.3; contract 3.12): the six functions and their records
expectTypeOf(pageRank).parameter(1).toEqualTypeOf<GraphSnapshot>();
expectTypeOf(pageRank).parameter(2).toEqualTypeOf<(PageRankOptions & GpuRunOptions) | undefined>();
expectTypeOf(pageRank).returns.resolves.toEqualTypeOf<GpuPageRankResult>();
expectTypeOf(personalizedPageRank).parameter(2).toEqualTypeOf<F32>();
expectTypeOf(personalizedPageRank).parameter(3).toEqualTypeOf<(PageRankOptions & GpuRunOptions) | undefined>();
expectTypeOf(personalizedPageRank).returns.resolves.toEqualTypeOf<GpuPageRankResult>();
expectTypeOf(hits).parameter(2).toEqualTypeOf<(HitsOptions & GpuRunOptions) | undefined>();
expectTypeOf(hits).returns.resolves.toEqualTypeOf<GpuHitsResult>();
expectTypeOf(eigenvectorCentrality).parameter(2).toEqualTypeOf<(EigenvectorOptions & GpuRunOptions) | undefined>();
expectTypeOf(eigenvectorCentrality).returns.resolves.toEqualTypeOf<GpuScoresResult>();
expectTypeOf(katzCentrality).parameter(2).toEqualTypeOf<(KatzOptions & GpuRunOptions) | undefined>();
expectTypeOf(katzCentrality).returns.resolves.toEqualTypeOf<GpuScoresResult>();
expectTypeOf(connectedComponents).parameter(2).toEqualTypeOf<(ComponentsOptions & GpuRunOptions) | undefined>();
expectTypeOf(connectedComponents).returns.resolves.toEqualTypeOf<GpuLabelResult>();
expectTypeOf<GpuScoresResult["scores"]>().toEqualTypeOf<F32>();
expectTypeOf<GpuScoresResult["precision"]>().toEqualTypeOf<"f32">();
expectTypeOf<GpuPageRankResult>().toMatchTypeOf<GpuScoresResult>();
expectTypeOf<GpuPageRankResult["danglingMass"]>().toBeNumber();
expectTypeOf<GpuHitsResult["hubs"]>().toEqualTypeOf<F32>();
expectTypeOf<GpuHitsResult["authorities"]>().toEqualTypeOf<F32>();
expectTypeOf<GpuLabelResult["labels"]>().toEqualTypeOf<U32>();
expectTypeOf<GpuLabelResult["count"]>().toBeNumber();
expectTypeOf<GpuLabelResult["groups"]>().returns.toEqualTypeOf<U32[]>();
expectTypeOf<PageRankOptions["dampingFactor"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<PageRankOptions["weighted"]>().toEqualTypeOf<boolean | undefined>();
expectTypeOf<HitsOptions>().toEqualTypeOf<EigenvectorOptions>(); // both are the CPU seam's HitsOptionsLike
expectTypeOf<KatzOptions>().toMatchTypeOf<HitsOptions>();
expectTypeOf<KatzOptions["alpha"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<KatzOptions["beta"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<ComponentsOptions["renumber"]>().toEqualTypeOf<boolean | undefined>();
// spec 9.7: every GPU result satisfies the CPU mirror it is handed back through
expectTypeOf<GpuPageRankResult>().toMatchTypeOf<PageRankResultLike>();
expectTypeOf<GpuScoresResult>().toMatchTypeOf<ScoresResultLike>();
expectTypeOf<GpuHitsResult>().toMatchTypeOf<HitsResultLike>();
expectTypeOf<GpuLabelResult>().toMatchTypeOf<LabelResultLike>();

// ---- layouts (P3; contract 3.3, 3.13)
expectTypeOf(seedPositions).parameter(2).toEqualTypeOf<number | null>();
expectTypeOf(seedPositions).parameter(3).toEqualTypeOf<2 | 3>();
expectTypeOf(seedPositions).parameter(5).toEqualTypeOf<ArrayLike<number> | null>();
expectTypeOf(seedPositions).parameter(6).toEqualTypeOf<"fa2" | "fr">();
expectTypeOf(seedPositions).returns.toBeVoid();
expectTypeOf(createForceAtlas2).parameter(1).toEqualTypeOf<(ForceAtlas2Options & GpuLayoutTuning) | undefined>();
expectTypeOf(createForceAtlas2).returns.toEqualTypeOf<Fa2Sim>();
expectTypeOf<Fa2Sim>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf<ForceAtlas2Options>().toMatchTypeOf<CommonLayoutOptions & SimulationOptions>();
expectTypeOf<FruchtermanReingoldOptions>().toMatchTypeOf<CommonLayoutOptions & SimulationOptions>();
expectTypeOf<SpringElectricalOptions>().toMatchTypeOf<CommonLayoutOptions & SimulationOptions>();
expectTypeOf<ForceAtlas2Stats>().toMatchTypeOf<LayoutStatsBase>();
expectTypeOf<ForceAtlas2Stats["trace"]>().toEqualTypeOf<ReadonlyArray<ForceAtlas2TraceRecord>>();
expectTypeOf<keyof ForceAtlas2TraceRecord>().toEqualTypeOf<
    "swing" | "traction" | "speed" | "speedEfficiency" | "meanDisplacement" | "settledCount"
>();
// P5 (spec 3.3 lines 846-847, 873-874): the two factories, their simulations and stats records
expectTypeOf(createFruchtermanReingold).parameter(0).toEqualTypeOf<GpuContext>();
expectTypeOf(createFruchtermanReingold)
    .parameter(1)
    .toEqualTypeOf<(FruchtermanReingoldOptions & GpuLayoutTuning) | undefined>();
expectTypeOf(createFruchtermanReingold).returns.toEqualTypeOf<FrSim>();
expectTypeOf<FrSim>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf(createSpringElectrical).parameter(0).toEqualTypeOf<GpuContext>();
expectTypeOf(createSpringElectrical).parameter(1).toEqualTypeOf<(SpringElectricalOptions & GpuLayoutTuning) | undefined>();
expectTypeOf(createSpringElectrical).returns.toEqualTypeOf<SeSim>();
expectTypeOf<SeSim>().toMatchTypeOf<LayoutSimulation>();
expectTypeOf<FruchtermanReingoldStats>().toMatchTypeOf<LayoutStatsBase>();
expectTypeOf<FruchtermanReingoldStats["temperature"]>().toBeNumber();
expectTypeOf<FruchtermanReingoldStats["trace"]>().toEqualTypeOf<ReadonlyArray<FruchtermanReingoldTraceRecord>>();
expectTypeOf<keyof FruchtermanReingoldTraceRecord>().toEqualTypeOf<"temperature" | "meanDisplacement" | "settledCount">();
expectTypeOf<SpringElectricalStats>().toMatchTypeOf<LayoutStatsBase>();
expectTypeOf<SpringElectricalStats["kineticEnergy"]>().toBeNumber();
expectTypeOf<SpringElectricalStats["trace"]>().toEqualTypeOf<ReadonlyArray<SpringElectricalTraceRecord>>();
expectTypeOf<keyof SpringElectricalTraceRecord>().toEqualTypeOf<"kineticEnergy" | "meanDisplacement" | "settledCount">();
expectTypeOf<FrSim["stats"]>().toEqualTypeOf<FruchtermanReingoldStats>();
expectTypeOf<FrSim["setParams"]>().parameter(0).toEqualTypeOf<Partial<FruchtermanReingoldOptions>>();
expectTypeOf<SeSim["stats"]>().toEqualTypeOf<SpringElectricalStats>();
expectTypeOf<SeSim["setParams"]>().parameter(0).toEqualTypeOf<Partial<SpringElectricalOptions>>();
expectTypeOf<LayoutStatsBase["centroid"]>().toEqualTypeOf<readonly [number, number, number]>();
expectTypeOf<LayoutStatsBase["repulsionTier"]>().toEqualTypeOf<"exact" | "grid">();
expectTypeOf<LayoutStatsBase["maxCellOccupancy"]>().toEqualTypeOf<number | null>();
expectTypeOf<LayoutStatsBase["outsideGrid"]>().toEqualTypeOf<number | null>();
expectTypeOf<LayoutStatsBase["msPerIteration"]>().toEqualTypeOf<number | null>();
expectTypeOf<RunOptions["signal"]>().toEqualTypeOf<AbortSignal | undefined>();
expectTypeOf<GpuLayoutTuning["exactMaxNodes"]>().toEqualTypeOf<number | undefined>();
// P4 (spec 2.2, 3.3 line 776): the calibration function and its two records
expectTypeOf(calibrateLayout).parameter(0).toEqualTypeOf<GpuContext>();
expectTypeOf(calibrateLayout).parameter(1).toEqualTypeOf<CalibrateOptions | undefined>();
expectTypeOf(calibrateLayout).returns.toEqualTypeOf<Promise<GpuCalibration>>();
expectTypeOf<CalibrateOptions["sizes"]>().toEqualTypeOf<readonly number[] | undefined>();
expectTypeOf<keyof GpuCalibration>().toEqualTypeOf<
    "pairsPerSecond" | "exactMsPerIter" | "gridMsPerIter" | "suggestedExactMaxNodes" | "firstCallMs"
>();
expectTypeOf<GpuCalibration["exactMsPerIter"]>().toEqualTypeOf<Readonly<Record<number, number>>>();
expectTypeOf<GpuCalibration["suggestedExactMaxNodes"]>().toBeNumber();

// ---- the accelerator (P3; contract 3.14) and the CPU packages' re-exported declarations (spec 9.2, 9.3; W1b)
expectTypeOf(createAccelerator).parameter(0).toEqualTypeOf<GpuContext>();
expectTypeOf(createAccelerator).parameter(1).toEqualTypeOf<AcceleratorOptions | undefined>();
expectTypeOf(createAccelerator).returns.toEqualTypeOf<GpuAccelerator>();
expectTypeOf<GpuAccelerator>().toMatchTypeOf<AlgorithmAccelerator & LayoutAccelerator>();
// the seven P7 members (spec 9.2; M8b-T8 PD-14 / PD-19): non-optional on the GPU side, Gpu* results, the CPU records
expectTypeOf<GpuAccelerator["pageRank"]>().parameter(1).toEqualTypeOf<PageRankOptions | undefined>();
expectTypeOf<GpuAccelerator["pageRank"]>().returns.resolves.toEqualTypeOf<GpuPageRankResult>();
expectTypeOf<GpuAccelerator["personalizedPageRank"]>().parameter(1).toEqualTypeOf<F32 | F64>();
expectTypeOf<GpuAccelerator["personalizedPageRank"]>().returns.resolves.toEqualTypeOf<GpuPageRankResult>();
expectTypeOf<GpuAccelerator["hits"]>().parameter(1).toEqualTypeOf<HitsOptions | undefined>();
expectTypeOf<GpuAccelerator["hits"]>().returns.resolves.toEqualTypeOf<GpuHitsResult>();
expectTypeOf<GpuAccelerator["eigenvectorCentrality"]>().parameter(1).toEqualTypeOf<EigenvectorOptions | undefined>();
expectTypeOf<GpuAccelerator["eigenvectorCentrality"]>().returns.resolves.toEqualTypeOf<GpuScoresResult>();
expectTypeOf<GpuAccelerator["katzCentrality"]>().parameter(1).toEqualTypeOf<KatzOptions | undefined>();
expectTypeOf<GpuAccelerator["katzCentrality"]>().returns.resolves.toEqualTypeOf<GpuScoresResult>();
expectTypeOf<GpuAccelerator["connectedComponents"]>().parameter(1).toEqualTypeOf<ComponentsOptions | undefined>();
expectTypeOf<GpuAccelerator["connectedComponents"]>().returns.resolves.toEqualTypeOf<GpuLabelResult>();
expectTypeOf<GpuAccelerator["weaklyConnectedComponents"]>().parameter(1).toEqualTypeOf<ComponentsOptions | undefined>();
expectTypeOf<GpuAccelerator["weaklyConnectedComponents"]>().returns.resolves.toEqualTypeOf<GpuLabelResult>();
// the two P5 layout members (spec 3.3 lines 892-893; PD-19): the CPU option type in, the GPU simulation out
expectTypeOf<GpuAccelerator["fruchtermanReingold"]>().parameter(0).toEqualTypeOf<FruchtermanReingoldOptions | undefined>();
expectTypeOf<GpuAccelerator["fruchtermanReingold"]>().returns.toEqualTypeOf<FrSim>();
expectTypeOf<GpuAccelerator["springElectrical"]>().parameter(0).toEqualTypeOf<SpringElectricalOptions | undefined>();
expectTypeOf<GpuAccelerator["springElectrical"]>().returns.toEqualTypeOf<SeSim>();
expectTypeOf<AcceleratorOptions["layout"]>().toEqualTypeOf<GpuLayoutTuning | undefined>();
expectTypeOf<ScoresResultLike["scores"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<PageRankResultLike>().toMatchTypeOf<ScoresResultLike>();
expectTypeOf<PageRankResultLike["danglingMass"]>().toEqualTypeOf<number | undefined>();
expectTypeOf<HitsResultLike["hubs"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<HitsResultLike["authorities"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<LabelResultLike["labels"]>().toEqualTypeOf<U32>();
expectTypeOf<LabelResultLike["groups"]>().returns.toEqualTypeOf<U32[]>();
expectTypeOf<BfsResultLike["depth"]>().toEqualTypeOf<U32>();
expectTypeOf<BfsResultLike["visitedCount"]>().toBeNumber();
expectTypeOf<SsspResultLike["dist"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<SsspResultLike["predArc"]>().toEqualTypeOf<U32>();
expectTypeOf<BellmanFordResultLike>().toMatchTypeOf<SsspResultLike>();
expectTypeOf<BellmanFordResultLike["hasNegativeCycle"]>().toBeBoolean();
expectTypeOf<EdgeScoresResultLike["scores"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<ApspResultLike["dist"]>().toEqualTypeOf<NumericVector>();
expectTypeOf<ApspResultLike["n"]>().toBeNumber();
expectTypeOf<CorenessResultLike["coreness"]>().toEqualTypeOf<U32>();
expectTypeOf<MstResultLike["edges"]>().toEqualTypeOf<U32>();
expectTypeOf<MstResultLike["totalWeight"]>().toBeNumber();
expectTypeOf<CommunityResultLike>().toMatchTypeOf<LabelResultLike>();
expectTypeOf<CommunityResultLike["modularity"]>().toBeNumber();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().parameter(0).toEqualTypeOf<GraphSnapshot>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>()
    .parameter(1)
    .toEqualTypeOf<IndexedPageRankOptions | undefined>();
expectTypeOf<HitsOptions>().toEqualTypeOf<HitsOptionsLike>(); // M8b's record IS the CPU seam's shape
expectTypeOf<BetweennessAcceleratorOptions["sources"]>().toEqualTypeOf<readonly number[] | undefined>();
expectTypeOf<NonNullable<AlgorithmAccelerator["pageRank"]>>().returns.resolves.toEqualTypeOf<PageRankResultLike>();
expectTypeOf<NonNullable<AlgorithmAccelerator["triangleCount"]>>().returns.resolves.toEqualTypeOf<{
    readonly perNode: U32;
    readonly total: number;
}>();
expectTypeOf<NonNullable<LayoutAccelerator["forceAtlas2"]>>().returns.toEqualTypeOf<LayoutSimulation>();
expectTypeOf<NonNullable<LayoutAccelerator["fruchtermanReingold"]>>().returns.toEqualTypeOf<LayoutSimulation>();
expectTypeOf<NonNullable<LayoutAccelerator["springElectrical"]>>().returns.toEqualTypeOf<LayoutSimulation>();

// ---- the two entries by their package names (contract 3.6, 3.7; the dist d.ts shims of 2.6)
expectTypeOf(probeBrowserWebGpu).parameter(0).toEqualTypeOf<BrowserGpuOptions | undefined>();
expectTypeOf(probeBrowserWebGpu).returns.resolves.toEqualTypeOf<ProbeResult>();
expectTypeOf(requestGpuContext).parameter(0).toEqualTypeOf<BrowserGpuOptions | undefined>();
expectTypeOf(requestGpuContext).returns.resolves.toEqualTypeOf<GpuContext>();
expectTypeOf<BrowserGpuOptions>().not.toHaveProperty("gpu");
expectTypeOf<BrowserGpuOptions>().not.toHaveProperty("device");
expectTypeOf<BrowserGpuOptions>().not.toHaveProperty("runtime");
expectTypeOf<BrowserGpuOptions>().toHaveProperty("adapter");
expectTypeOf(createNodeGpu).parameter(0).toEqualTypeOf<NodeGpuOptions | undefined>();
expectTypeOf(createNodeGpu).returns.resolves.toEqualTypeOf<NodeGpuHandle>();
expectTypeOf(createNodeGpuContext).returns.resolves.toEqualTypeOf<GpuContext>();
expectTypeOf(probeNodeWebGpu).returns.resolves.toEqualTypeOf<ProbeResult>();
expectTypeOf(dawnFlags).parameter(0).toEqualTypeOf<NodeGpuOptions | undefined>();
expectTypeOf(dawnFlags).returns.toEqualTypeOf<string[]>();
expectTypeOf<NodeGpuHandle["gpu"]>().toEqualTypeOf<GPU>();
expectTypeOf<NodeGpuHandle["dispose"]>().returns.toBeVoid();
expectTypeOf<NodeGpuOptions["backend"]>().toEqualTypeOf<
    "vulkan" | "d3d12" | "d3d11" | "metal" | "opengl" | "opengles" | "null" | undefined
>();
expectTypeOf<NodeGpuOptions>().not.toHaveProperty("gpu");
expectTypeOf<NodeGpuOptions>().not.toHaveProperty("device");
expectTypeOf<NodeGpuOptions>().not.toHaveProperty("runtime");
// NodeGpuOptions.adapter is the Dawn adapter NAME (contract 3.7), not GpuContextOptions.adapter
const nodeOptions: NodeGpuOptions = { adapter: "llvmpipe", backend: undefined, software: undefined, label: "sample" };
expectTypeOf(nodeOptions.adapter).toEqualTypeOf<string | undefined>();

/**
 * A consumer's start-up and one layout run in the shape spec 2.4 / 9.4 prescribe: probe, create, inject, lay out,
 * read the stats, release. Type-checked only, never executed: the strict flags are the point. Every option record
 * carries explicit `undefined` members (exactOptionalPropertyTypes) and every index read is guarded
 * (noUncheckedIndexedAccess: `trace[i]` and `degrees[0]` are `T | undefined`).
 * @param gpu - navigator.gpu or a Dawn handle's gpu (undefined -> E_NO_WEBGPU at probe time)
 * @returns the last traced swing plus node 0's out-degree
 */
async function consumerSample(gpu: GPU | undefined): Promise<number> {
    const probe: ProbeResult = await GpuContext.probe({ gpu, rejectSoftware: true, powerPreference: undefined });
    if (!probe.ok || probe.adapter === null) {
        throw new WebGpuGraphError("E_NO_ADAPTER", probe.reason ?? "no adapter", { code: probe.code });
    }
    const context: GpuContext = await GpuContext.create({ adapter: probe.adapter, limits: "raise", label: "sample" });
    const tuning: GpuLayoutTuning = {
        compat: "networkx",
        exactMaxNodes: 4096,
        deterministic: true,
        nearMax: undefined,
    };
    const accelerator: GpuAccelerator = createAccelerator(context, { layout: tuning, algorithms: undefined });
    const injected: AlgorithmAccelerator & LayoutAccelerator = accelerator; // what the element stores (spec 9.4)
    const sim: Fa2Sim = accelerator.forceAtlas2({
        maxIter: 50,
        seed: 7,
        iterationsPerStep: 4,
        weight: true,
        nodeMass: null,
    });
    sim.load(snapshot, positions);
    const stats: ForceAtlas2Stats = await sim.run({ batch: 8, signal: undefined, maxIter: undefined });
    const last: ForceAtlas2TraceRecord | undefined = stats.trace[stats.trace.length - 1];
    const swing: number = last === undefined ? stats.swing : last.swing;
    const degrees: U32 = await degree(context, snapshot, { signal: undefined });
    const first: number | undefined = degrees[0];
    // the P7 members through the CPU-shaped seam (spec 9.2): optional on the mirror, so guarded
    const ranks: PageRankResultLike | undefined = await injected.pageRank?.(snapshot, { dampingFactor: 0.9 });
    const top: number | undefined = ranks?.scores[0];
    const parts: LabelResultLike | undefined = await injected.weaklyConnectedComponents?.(snapshot);
    const count: number = parts?.count ?? 0;
    sim.dispose();
    injected.release?.(snapshot);
    accelerator.dispose();
    return swing + (first ?? 0) + (top ?? 0) + count;
}
expectTypeOf(consumerSample).returns.resolves.toBeNumber();
