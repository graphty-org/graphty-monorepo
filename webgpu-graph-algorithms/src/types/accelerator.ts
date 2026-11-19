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
    /** The GPU layout tuning every simulation of the accelerator inherits. */
    readonly layout?: GpuLayoutTuning | undefined;
    /** Defaults for the algorithms: today the betweenness sample (`k` sources, or the `sources` to run). */
    readonly algorithms?:
        | {
              /** The default sample of `betweennessCentrality` and `edgeBetweennessCentrality`. */
              readonly betweenness?:
                  | {
                        /** Run this many sources, sampled. */
                        readonly k?: number | undefined;
                        /** Run these source node indices. */
                        readonly sources?: readonly number[] | undefined;
                    }
                  | undefined;
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
 * (the seam's `HitsOptionsLike`: `maxIterations` and `weighted` honored, `tolerance` refused), and
 * `minimumSpanningTree` (Boruvka; the seam's `MstOptions`, whose per-arc `weights` override is refused).
 * @public
 */
export interface GpuAccelerator extends AlgorithmAccelerator, LayoutAccelerator {
    /** Always `"webgpu"`. */
    readonly kind: "webgpu";
    /** `closenessCentrality` honors `harmonic` on an exact run, so the CPU dispatcher sends harmonic closeness here. */
    readonly harmonicCloseness: true;
    /** The context the accelerator runs on. */
    readonly ctx: GpuContext;
    /** The options it was created with. */
    readonly options: Readonly<AcceleratorOptions>;
    /**
     * A ForceAtlas2 simulation, with the accelerator's layout tuning.
     * @param options - the ForceAtlas2 options
     * @returns the simulation, ready for `load()`
     */
    forceAtlas2(options?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>;
    /**
     * A Fruchterman-Reingold simulation, with the accelerator's layout tuning.
     * @param options - the Fruchterman-Reingold options
     * @returns the simulation, ready for `load()`
     */
    fruchtermanReingold(
        options?: FruchtermanReingoldOptions,
    ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
    /**
     * A spring-electrical simulation, with the accelerator's layout tuning.
     * @param options - the spring-electrical options
     * @returns the simulation, ready for `load()`
     */
    springElectrical(
        options?: SpringElectricalOptions,
    ): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;
    /**
     * PageRank; see the `pageRank` function.
     * @param s - the snapshot
     * @param options - the PageRank options
     * @returns the scores
     */
    pageRank(s: GraphSnapshot, options?: PageRankOptions): Promise<GpuPageRankResult>;
    /**
     * Personalized PageRank; see the `personalizedPageRank` function.
     * @param s - the snapshot
     * @param personalization - one non-negative weight per node, not all zero
     * @param options - the PageRank options
     * @returns the scores
     */
    personalizedPageRank(
        s: GraphSnapshot,
        personalization: F32 | F64,
        options?: PageRankOptions,
    ): Promise<GpuPageRankResult>;
    /**
     * HITS hub and authority scores; see the `hits` function.
     * @param s - the snapshot
     * @param options - the HITS options
     * @returns the hub and authority scores
     */
    hits(s: GraphSnapshot, options?: HitsOptions): Promise<GpuHitsResult>;
    /**
     * Eigenvector centrality; see the `eigenvectorCentrality` function.
     * @param s - the snapshot
     * @param options - the options
     * @returns the scores
     */
    eigenvectorCentrality(s: GraphSnapshot, options?: EigenvectorOptions): Promise<GpuScoresResult>;
    /**
     * Katz centrality; see the `katzCentrality` function.
     * @param s - the snapshot
     * @param options - the Katz options
     * @returns the scores
     */
    katzCentrality(s: GraphSnapshot, options?: KatzOptions): Promise<GpuScoresResult>;
    /**
     * Weakly connected components; see the `connectedComponents` function.
     * @param s - the snapshot
     * @param options - the options
     * @returns the component labels
     */
    connectedComponents(s: GraphSnapshot, options?: ComponentsOptions): Promise<GpuLabelResult>;
    /**
     * The same as `connectedComponents`, under the name `@graphty/algorithms` also calls it.
     * @param s - the snapshot
     * @param options - the options
     * @returns the component labels
     */
    weaklyConnectedComponents(s: GraphSnapshot, options?: ComponentsOptions): Promise<GpuLabelResult>;
    /**
     * Breadth-first search from one node.
     * @param s - the snapshot
     * @param source - the start node index
     * @param options - the search options
     * @returns each node's depth and parent
     */
    breadthFirstSearch(s: GraphSnapshot, source: number, options?: BfsOptions): Promise<GpuBfsResult>;
    /**
     * Single-source shortest paths over non-negative weights.
     * @param s - the snapshot
     * @param source - the start node index
     * @param options - the options
     * @returns each node's distance and predecessor
     */
    sssp(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<GpuSsspResult>;
    /**
     * Single-source shortest paths that allow negative weights, and detect a negative cycle.
     * @param s - the snapshot
     * @param source - the start node index
     * @param options - the options
     * @returns each node's distance and predecessor, and whether a negative cycle was reached
     */
    bellmanFord(s: GraphSnapshot, source: number, options?: SsspOptions): Promise<GpuBellmanFordResult>;
    /**
     * Closeness centrality, exact or sampled.
     * @param s - the snapshot
     * @param options - the options
     * @returns the scores
     */
    closenessCentrality(s: GraphSnapshot, options?: ClosenessAcceleratorOptions): Promise<GpuClosenessResult>;
    /**
     * Node betweenness centrality, exact or sampled.
     * @param s - the snapshot
     * @param options - the options
     * @returns the scores
     */
    betweennessCentrality(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<GpuBetweennessResult>;
    /**
     * Edge betweenness centrality, exact or sampled.
     * @param s - the snapshot
     * @param options - the options
     * @returns one score per edge
     */
    edgeBetweennessCentrality(s: GraphSnapshot, options?: BetweennessAcceleratorOptions): Promise<GpuEdgeScoresResult>;
    /**
     * Shortest-path distances between every pair of nodes.
     * @param s - the snapshot
     * @param options - the options
     * @returns the distance matrix
     */
    allPairsShortestPath(s: GraphSnapshot, options?: SsspOptions): Promise<GpuApspResult>;
    /**
     * Triangles per node and in total.
     * @param s - the snapshot
     * @returns the counts
     */
    triangleCount(s: GraphSnapshot): Promise<GpuTriangleResult>;
    /**
     * Communities by label propagation.
     * @param s - the snapshot
     * @param options - the options (`tolerance` is refused)
     * @returns one community label per node
     */
    labelPropagation(s: GraphSnapshot, options?: HitsOptionsLike): Promise<GpuLabelResult>;
    /**
     * A minimum spanning forest (Boruvka).
     * @param s - the snapshot
     * @param options - the options
     * @returns the forest's edges and total weight
     */
    minimumSpanningTree(s: GraphSnapshot, options?: MstOptions): Promise<GpuMstResult>;
    /**
     * Frees the buffers uploaded for a snapshot.
     * @param s - the snapshot
     */
    release(s: GraphSnapshot): void;
    /** Frees everything the accelerator holds and the device it opened. */
    dispose(): void;
}
