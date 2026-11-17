/**
 * The accelerator interfaces of `@graphty/layout` and `@graphty/algorithms`, re-exported, plus this package's own
 * accelerator surface. `test/types/conformance.test-d.ts` is the cross-compile that keeps the two sides in step.
 * Types only.
 */

import type {
    AlgorithmAccelerator,
    BetweennessAcceleratorOptions,
    BfsOptions,
    ClosenessAcceleratorOptions,
    HitsOptionsLike,
    MstOptions,
    SsspOptions,
} from "@graphty/algorithms";
import type { F32, F64, GraphSnapshot } from "@graphty/graph-format";
import type { LayoutAccelerator } from "@graphty/layout";

import type { GpuContext } from "../context.js";
import type {
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
} from "./algorithms.js";
import type { GpuApspResult } from "./all-pairs.js";
import type { GpuBetweennessResult, GpuEdgeScoresResult } from "./betweenness.js";
import type {
    ForceAtlas2Stats,
    FruchtermanReingoldStats,
    GpuLayoutSimulation,
    GpuLayoutTuning,
    SpringElectricalStats,
} from "./layout.js";
import type { ForceAtlas2Options, FruchtermanReingoldOptions, SpringElectricalOptions } from "./options.js";
import type { GpuMstResult, GpuTriangleResult } from "./structure.js";
import type { GpuBellmanFordResult, GpuBfsResult, GpuSsspResult } from "./traversal.js";

// ---- the real @graphty/layout interfaces, re-exported so src/types/layout.ts resolves them from here. `export type`, never a bare
// `export { ... }`: isolatedModules makes the bare form TS1205.

export type { LayoutAccelerator, LayoutSimulation } from "@graphty/layout";

// ---- the real @graphty/algorithms interfaces, re-exported as part of this package's public surface. `export type`, never a
// bare `export { ... }`: isolatedModules makes the bare form TS1205.

export type {
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
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstOptions,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspOptions,
    SsspResultLike,
} from "@graphty/algorithms";

// ---- the package's own accelerator surface; one method per GPU algorithm

/**
 * Options of createGpuAccelerator: the layout tuning knobs, and the betweenness sample (`k` random sources, or an
 * explicit `sources` list) used when a caller passes neither.
 * @public
 */
export interface AcceleratorOptions {
    readonly layout?: GpuLayoutTuning | undefined;
    readonly algorithms?:
        | {
              readonly betweenness?:
                  { readonly k?: number | undefined; readonly sources?: readonly number[] | undefined } | undefined;
          }
        | undefined;
}

/**
 * The injectable object: the three layouts (forceAtlas2, fruchtermanReingold and springElectrical: the CPU option
 * types in, the GPU simulations out), release and dispose, and one member per GPU algorithm, non-optional here and
 * returning the `Gpu*Result` shapes, which satisfy the `*ResultLike` interfaces of `@graphty/algorithms`
 * (`precision` is an extra field, `F32` is a `NumericVector`). `connectedComponents` and
 * `weaklyConnectedComponents` are the same algorithm (weakly connected components on directed input) under both names the mirror declares; their options parameter stays OPTIONAL, because
 * the mirror declares none and an extra REQUIRED parameter would stop the member satisfying it. The four traversals
 * take the seam's OWN option types (`BfsOptions`, `SsspOptions` for both `sssp` and `bellmanFord`,
 * `ClosenessAcceleratorOptions` for `closenessCentrality`), so a key the CPU dispatcher forwards is exactly a key the GPU reads;
 * `test/types/conformance.test-d.ts` holds each parameter EQUAL to the seam's, not merely assignable. The two
 * betweenness members take the seam's `BetweennessAcceleratorOptions`. `allPairsShortestPath` takes the
 * seam's `SsspOptions` too and refuses both of its keys. `triangleCount` (its result carries `coefficient`
 * and `transitivity` beyond the seam's `{ perNode, total }`, which a wider object satisfies) and `labelPropagation`
 * (the seam's `HitsOptionsLike`: `maxIterations` and `weighted` honoured, `tolerance` refused), and
 * `minimumSpanningTree` (Boruvka; the seam's `MstOptions`, whose per-arc `weights` override is refused).
 * @public
 */
export interface GpuAccelerator extends AlgorithmAccelerator, LayoutAccelerator {
    readonly kind: "webgpu";
    /** `closenessCentrality` honours `harmonic` on an exact run, so the CPU dispatcher sends harmonic closeness here. */
    readonly harmonicCloseness: true;
    readonly ctx: GpuContext;
    readonly options: Readonly<AcceleratorOptions>;
    forceAtlas2(options?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
    fruchtermanReingold(
        options?: FruchtermanReingoldOptions,
    ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
    springElectrical(
        options?: SpringElectricalOptions,
    ): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;
    pageRank(s: GraphSnapshot, options?: PageRankOptions): Promise<GpuPageRankResult>;
    personalizedPageRank(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptions,
    ): Promise<GpuPageRankResult>;
    hits(s: GraphSnapshot, options?: HitsOptions): Promise<GpuHitsResult>;
    eigenvectorCentrality(s: GraphSnapshot, options?: EigenvectorOptions): Promise<GpuScoresResult>;
    katzCentrality(s: GraphSnapshot, options?: KatzOptions): Promise<GpuScoresResult>;
    connectedComponents(s: GraphSnapshot, options?: ComponentsOptions): Promise<GpuLabelResult>;
    weaklyConnectedComponents(s: GraphSnapshot, options?: ComponentsOptions): Promise<GpuLabelResult>;
    breadthFirstSearch(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<GpuBfsResult>;
    sssp(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<GpuSsspResult>;
    bellmanFord(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<GpuBellmanFordResult>;
    closenessCentrality(s: GraphSnapshot, options?: ClosenessAcceleratorOptions): Promise<GpuClosenessResult>;
    betweennessCentrality(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<GpuBetweennessResult>;
    edgeBetweennessCentrality(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<GpuEdgeScoresResult>;
    allPairsShortestPath(s: GraphSnapshot, options?: SsspOptions): Promise<GpuApspResult>;
    triangleCount(s: GraphSnapshot): Promise<GpuTriangleResult>;
    labelPropagation(s: GraphSnapshot, options?: HitsOptionsLike): Promise<GpuLabelResult>;
    minimumSpanningTree(s: GraphSnapshot, options?: MstOptions): Promise<GpuMstResult>;
    release(s: GraphSnapshot): void;
    dispose(): void;
}
