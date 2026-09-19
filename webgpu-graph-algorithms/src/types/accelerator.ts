/**
 * The layout half of spec 9.3 and the @graphty/algorithms AlgorithmAccelerator mirror (spec 9.2), plus the
 * package's own accelerator surface (spec 3.3). D27's two halves are now on different footings: at W1b the LAYOUT
 * mirrors became `import type` of the real `@graphty/layout` interfaces, re-exported here so this package's public
 * surface is unchanged; the ALGORITHMS mirrors stay structural until A2/M8a gives them something real to point at.
 * test/types/conformance.test-d.ts is the cross-compile that holds the layout half honest. Types only.
 */

import type { F32, F64, GraphSnapshot, NumericVector, U32 } from "@graphty/graph-format";
import type { LayoutAccelerator, LayoutSimulation } from "@graphty/layout";

import type { GpuContext } from "../context.js";
import type { ForceAtlas2Stats, GpuLayoutSimulation, GpuLayoutTuning } from "./layout.js";
import type { ForceAtlas2Options } from "./options.js";

// ---- the real @graphty/layout interfaces (spec 9.3, D27): imported at W1b, re-exported so the package's public
// surface is unchanged and src/types/layout.ts keeps resolving them from here. `export type`, never a bare
// `export { ... }`: isolatedModules makes the bare form TS1205.

export type { LayoutAccelerator, LayoutSimulation };

// ---- mirrors of @graphty/algorithms (spec 9.2); the option types named there do not exist before A2, so they are
// mirrored as empty-extensible records

/**
 * Placeholder for the CPU option types the AlgorithmAccelerator methods take before A2 lands (spec 9.2: "the
 * accelerator methods reuse the indexed.* option types").
 * Exported: published mirror (spec 9.2); re-exported from src/index.ts at P3-T3.
 * @public
 */
export type CpuAlgorithmOptions = Readonly<Record<string, unknown>>;

/**
 * Score-shaped result of the CPU package (spec 9.7).
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface ScoresResultLike {
    readonly scores: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}

/**
 * PageRank result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface PageRankResultLike extends ScoresResultLike {
    readonly danglingMass?: number | undefined;
}

/**
 * HITS result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface HitsResultLike {
    readonly hubs: NumericVector;
    readonly authorities: NumericVector;
    readonly iterations: number;
    readonly converged: boolean;
}

/**
 * Label result mirror (components, label propagation).
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface LabelResultLike {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}

/**
 * BFS result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface BfsResultLike {
    readonly depth: U32;
    readonly parent: U32;
    readonly order: U32;
    readonly visitedCount: number;
}

/**
 * SSSP result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface SsspResultLike {
    readonly dist: NumericVector;
    readonly predArc: U32;
}

/**
 * Bellman-Ford result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface BellmanFordResultLike extends SsspResultLike {
    readonly hasNegativeCycle: boolean;
}

/**
 * Edge-score result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface EdgeScoresResultLike {
    readonly scores: NumericVector;
}

/**
 * APSP result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface ApspResultLike {
    readonly dist: NumericVector;
    readonly n: number;
}

/**
 * k-core result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface CorenessResultLike {
    readonly coreness: U32;
}

/**
 * Minimum-spanning-tree result mirror.
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface MstResultLike {
    readonly edges: U32;
    readonly totalWeight: number;
}

/**
 * Community result mirror (Louvain).
 * Exported: published mirror; re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface CommunityResultLike extends LabelResultLike {
    readonly modularity: number;
}

/**
 * Spec 9.2 AlgorithmAccelerator, verbatim (every member optional; option types are CpuAlgorithmOptions until A2).
 * Exported: published mirror (spec 9.2, D27); re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface AlgorithmAccelerator {
    readonly kind: string;
    pageRank?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<PageRankResultLike>;
    personalizedPageRank?(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: CpuAlgorithmOptions,
    ): Promise<PageRankResultLike>;
    hits?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<HitsResultLike>;
    eigenvectorCentrality?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<ScoresResultLike>;
    katzCentrality?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<ScoresResultLike>;
    connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    weaklyConnectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>;
    breadthFirstSearch?(s: GraphSnapshot, source: number, options?: CpuAlgorithmOptions): Promise<BfsResultLike>;
    sssp?(s: GraphSnapshot, source: number, options?: CpuAlgorithmOptions): Promise<SsspResultLike>;
    bellmanFord?(s: GraphSnapshot, source: number, options?: CpuAlgorithmOptions): Promise<BellmanFordResultLike>;
    closenessCentrality?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<ScoresResultLike>;
    betweennessCentrality?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<ScoresResultLike>;
    edgeBetweennessCentrality?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<EdgeScoresResultLike>;
    allPairsShortestPath?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<ApspResultLike>;
    kCoreDecomposition?(s: GraphSnapshot): Promise<CorenessResultLike>;
    triangleCount?(s: GraphSnapshot): Promise<{ readonly perNode: U32; readonly total: number }>;
    labelPropagation?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<LabelResultLike>;
    minimumSpanningTree?(s: GraphSnapshot): Promise<MstResultLike>;
    louvain?(s: GraphSnapshot, options?: CpuAlgorithmOptions): Promise<CommunityResultLike>;
    release?(s: GraphSnapshot): void;
    dispose?(): void;
}

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
 * The injectable object (spec 3.3); at P3 it carries forceAtlas2, release and dispose -- the algorithm members
 * arrive with P7+.
 * Exported: implemented by src/accelerator.ts (P3-T3); re-exported from src/index.ts at P3-T3.
 * @public
 */
export interface GpuAccelerator extends AlgorithmAccelerator, LayoutAccelerator {
    readonly kind: "webgpu";
    readonly ctx: GpuContext;
    readonly options: Readonly<AcceleratorOptions>;
    forceAtlas2(options?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
    release(s: GraphSnapshot): void;
    dispose(): void;
}
