/**
 * The layout half of spec 9.3 and the algorithms half of spec 9.2, plus the package's own accelerator surface
 * (spec 3.3). D27's mirrors are gone: both halves are now `import type` of the real packages, re-exported here so
 * this package's public surface is unchanged; `test/types/conformance.test-d.ts` is the cross-compile that holds
 * them honest. Types only.
 */

import type {
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
} from "@graphty/algorithms";
import type { F32, F64, GraphSnapshot } from "@graphty/graph-format";
import type { LayoutAccelerator, LayoutSimulation } from "@graphty/layout";

import type { GpuContext } from "../context.js";
import type {
    ComponentsOptions,
    EigenvectorOptions,
    GpuHitsResult,
    GpuLabelResult,
    GpuPageRankResult,
    GpuScoresResult,
    HitsOptions,
    KatzOptions,
    PageRankOptions,
} from "./algorithms.js";
import type {
    ForceAtlas2Stats,
    FruchtermanReingoldStats,
    GpuLayoutSimulation,
    GpuLayoutTuning,
    SpringElectricalStats,
} from "./layout.js";
import type { ForceAtlas2Options, FruchtermanReingoldOptions, SpringElectricalOptions } from "./options.js";

// ---- the real @graphty/layout interfaces (spec 9.3, D27): imported at W1b, re-exported so the package's public
// surface is unchanged and src/types/layout.ts keeps resolving them from here. `export type`, never a bare
// `export { ... }`: isolatedModules makes the bare form TS1205.

export type { LayoutAccelerator, LayoutSimulation };

// ---- the real @graphty/algorithms interfaces (spec 9.2, D27): imported at W1b now that A2's first
// commit exists, re-exported so this package's public surface is unchanged. `export type`, never a
// bare `export { ... }`: isolatedModules makes the bare form TS1205.

export type {
    AlgorithmAccelerator,
    ApspResultLike,
    BellmanFordResultLike,
    BetweennessAcceleratorOptions,
    BfsResultLike,
    CommunityResultLike,
    CorenessResultLike,
    EdgeScoresResultLike,
    HitsOptionsLike,
    HitsResultLike,
    LabelResultLike,
    MstResultLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
};

// ---- the package's own accelerator surface (spec 3.3); grows one method per shipped algorithm from P7

/**
 * Spec 3.3 AcceleratorOptions, verbatim.
 * Exported: consumed by src/accelerator.ts (P3-T3); re-exported from src/index.ts at P3-T3.
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
 * The injectable object (spec 3.3): P3's forceAtlas2, release and dispose, P5's fruchtermanReingold and
 * springElectrical (the two other optional members of the real LayoutAccelerator, spec 9.3; the CPU option types in,
 * the GPU simulations out), plus P7's seven algorithm members
 * (spec 8.2, 8.3; M8b-T8), non-optional here and returning the `Gpu*Result` shapes, which satisfy the `*ResultLike`
 * mirrors (spec 9.7: `precision` is an extra field, `F32` is a `NumericVector`). `connectedComponents` and
 * `weaklyConnectedComponents` are the same algorithm (spec 3.3: WCC semantics on directed input) under both names
 * the mirror declares; their options parameter stays OPTIONAL, because the mirror declares none and an extra
 * REQUIRED parameter would stop the member satisfying it. Later phases add one member per shipped algorithm.
 * Exported: implemented by src/accelerator.ts (P3-T3); re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface GpuAccelerator extends AlgorithmAccelerator, LayoutAccelerator {
    readonly kind: "webgpu";
    readonly ctx: GpuContext;
    readonly options: Readonly<AcceleratorOptions>;
    forceAtlas2(options?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
    fruchtermanReingold(
        options?: FruchtermanReingoldOptions,
    ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
    springElectrical(options?: SpringElectricalOptions): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;
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
    release(s: GraphSnapshot): void;
    dispose(): void;
}
