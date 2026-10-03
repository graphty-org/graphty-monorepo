// Compiled by `tsc -p tsconfig.typecheck.json` inside `npm run lint`, never executed. It pins the public surface of
// algorithms 3.0.0: every algorithm takes a GraphSnapshot (or an AdjacencyView, for the traversals and paths) first
// and an options object last, the 2.x `indexed` namespace is a deprecated alias of the same functions, and none of
// the 2.x legacy names is exported any more.
import type { AdjacencyView, F32, F64, GraphSnapshot, NodeId, U32 } from "@graphty/graph-format";
import { expectTypeOf } from "vitest";

import type {
    ApspOptions,
    ApspResult,
    ArcOrderOption,
    AstarResult,
    BellmanFordResult,
    BetweennessOptions,
    BetweennessResult,
    BfsOptions,
    BfsResult,
    BipartiteFlowNetwork,
    BipartiteMatchingOptions,
    BipartiteMatchingResult,
    BipartiteOptions,
    BipartiteResult,
    CandidateOptions,
    ClosenessOptions,
    ClosenessResult,
    CommonNeighborsOptions,
    CondensationResult,
    CorenessResult,
    DegreeCentralityOptions,
    DfsOptions,
    DfsResult,
    DirectionOptimizedBfsOptions,
    EdgeBetweennessOptions,
    EdgeScoresResult,
    EigenvectorOptions,
    EigenvectorResult,
    GirvanNewmanOptions,
    GirvanNewmanResult,
    GrsbmOptions,
    GrsbmResult,
    HierarchicalOptions,
    HierarchicalResult,
    HitsOptions,
    HitsResult,
    IsomorphismOptions,
    IsomorphismResult,
    KargerOptions,
    KatzOptions,
    KatzResult,
    LabelPropagationOptions,
    LabelPropagationResult,
    LabelResult,
    LeidenOptions,
    LeidenResult,
    LinkPredictionMetrics,
    LinkPredictionOptions,
    LinkPredictionResult,
    LouvainOptions,
    LouvainResult,
    MarkovOptions,
    MarkovResult,
    MaxFlowOptions,
    MaxFlowResult,
    MinCutResult,
    ModularityOptions,
    MstOptions,
    MstResult,
    NodePairs,
    PageRankOptions,
    PageRankResult,
    PathOptions,
    PathResult,
    PrimOptions,
    PrimResult,
    ScoresResult,
    SpectralOptions,
    SpectralResult,
    SsspOptions,
    SsspResult,
    StoerWagnerOptions,
    SyncClusteringOptions,
    SyncClusteringResult,
    SynchronousLabelPropagationOptions,
    TeraHacOptions,
    TeraHacResult,
    TriangleCountResult,
} from "../../src/index.js";
import * as algorithms from "../../src/index.js";

// ---- every promoted function, with its exact signature: a changed parameter list or result type fails here
expectTypeOf(algorithms.allPairsShortestPath).toEqualTypeOf<(s: GraphSnapshot, options?: ApspOptions) => ApspResult>();
expectTypeOf(algorithms.bellmanFord).toEqualTypeOf<
    (g: AdjacencyView, source: number, options?: SsspOptions) => BellmanFordResult
>();
expectTypeOf(algorithms.betweennessCentrality).toEqualTypeOf<
    (s: GraphSnapshot, options?: BetweennessOptions) => BetweennessResult
>();
expectTypeOf(algorithms.edgeBetweennessCentrality).toEqualTypeOf<
    (s: GraphSnapshot, options?: EdgeBetweennessOptions) => EdgeScoresResult
>();
expectTypeOf(algorithms.breadthFirstSearch).toEqualTypeOf<
    (g: AdjacencyView, start: number, options?: BfsOptions) => BfsResult
>();
expectTypeOf(algorithms.directionOptimizedBfs).toEqualTypeOf<
    (s: GraphSnapshot, source: number, options?: DirectionOptimizedBfsOptions) => BfsResult
>();
expectTypeOf(algorithms.isBipartite).toEqualTypeOf<(s: GraphSnapshot, options?: BipartiteOptions) => BipartiteResult>();
expectTypeOf(algorithms.closenessCentrality).toEqualTypeOf<
    (s: GraphSnapshot, options?: ClosenessOptions) => ClosenessResult
>();
expectTypeOf(algorithms.nodeClosenessCentrality).toEqualTypeOf<
    (s: GraphSnapshot, node: number, options?: Omit<ClosenessOptions, "sources" | "k">) => number
>();
expectTypeOf(algorithms.commonNeighborsScore).toEqualTypeOf<
    (s: GraphSnapshot, u: number, v: number, o?: CommonNeighborsOptions) => number
>();
expectTypeOf(algorithms.connectedComponents).toEqualTypeOf<(s: GraphSnapshot) => LabelResult>();
expectTypeOf(algorithms.weaklyConnectedComponents).toEqualTypeOf<(s: GraphSnapshot) => LabelResult>();
expectTypeOf(algorithms.degreeCentrality).toEqualTypeOf<(s: GraphSnapshot, options?: DegreeCentralityOptions) => F64>();
expectTypeOf(algorithms.depthFirstSearch).toEqualTypeOf<
    (g: AdjacencyView, start: number, options?: DfsOptions) => DfsResult
>();
expectTypeOf(algorithms.hasCycle).toEqualTypeOf<(g: AdjacencyView) => boolean>();
expectTypeOf(algorithms.topologicalSort).toEqualTypeOf<(g: AdjacencyView, options?: ArcOrderOption) => U32 | null>();
expectTypeOf(algorithms.dijkstra).toEqualTypeOf<
    (g: AdjacencyView, source: number, options?: SsspOptions) => SsspResult
>();
expectTypeOf(algorithms.walkPredArcs).toEqualTypeOf<
    (g: AdjacencyView, predArc: U32, source: number, target: number) => U32
>();
expectTypeOf(algorithms.walkPredEdges).toEqualTypeOf<
    (g: AdjacencyView, predArc: U32, source: number, target: number) => U32
>();
expectTypeOf(algorithms.eigenvectorCentrality).toEqualTypeOf<
    (s: GraphSnapshot, o?: EigenvectorOptions) => EigenvectorResult
>();
expectTypeOf(algorithms.bipartiteFlowNetwork).toEqualTypeOf<
    (
        left: readonly NodeId[],
        right: readonly NodeId[],
        edges: readonly (readonly [NodeId, NodeId])[],
    ) => BipartiteFlowNetwork
>();
expectTypeOf(algorithms.maxFlow).toEqualTypeOf<
    (s: GraphSnapshot, source: number, sink: number, options?: MaxFlowOptions) => MaxFlowResult
>();
expectTypeOf(algorithms.minSTCut).toEqualTypeOf<
    (s: GraphSnapshot, source: number, sink: number, options?: MaxFlowOptions) => MinCutResult
>();
expectTypeOf(algorithms.girvanNewman).toEqualTypeOf<
    (s: GraphSnapshot, options?: GirvanNewmanOptions) => GirvanNewmanResult
>();
expectTypeOf(algorithms.grsbm).toEqualTypeOf<(s: GraphSnapshot, options?: GrsbmOptions) => GrsbmResult>();
expectTypeOf(algorithms.hierarchicalClustering).toEqualTypeOf<
    (s: AdjacencyView, options?: HierarchicalOptions) => HierarchicalResult
>();
expectTypeOf(algorithms.hits).toEqualTypeOf<(s: GraphSnapshot, o?: HitsOptions) => HitsResult>();
expectTypeOf(algorithms.findAllIsomorphisms).toEqualTypeOf<
    (s1: GraphSnapshot, s2: GraphSnapshot, options?: IsomorphismOptions) => U32[]
>();
expectTypeOf(algorithms.isGraphIsomorphic).toEqualTypeOf<
    (s1: GraphSnapshot, s2: GraphSnapshot, options?: IsomorphismOptions) => IsomorphismResult
>();
expectTypeOf(algorithms.kCoreDecomposition).toEqualTypeOf<(s: GraphSnapshot) => CorenessResult>();
expectTypeOf(algorithms.katzCentrality).toEqualTypeOf<(s: GraphSnapshot, o?: KatzOptions) => KatzResult>();
expectTypeOf(algorithms.labelPropagation).toEqualTypeOf<
    (s: GraphSnapshot, options?: LabelPropagationOptions) => LabelPropagationResult
>();
expectTypeOf(algorithms.labelPropagationSemiSupervised).toEqualTypeOf<
    (s: GraphSnapshot, seeds: U32, options?: LabelPropagationOptions) => LabelPropagationResult
>();
expectTypeOf(algorithms.labelPropagationSynchronous).toEqualTypeOf<
    (s: GraphSnapshot, options?: SynchronousLabelPropagationOptions) => LabelPropagationResult
>();
expectTypeOf(algorithms.leiden).toEqualTypeOf<(s: GraphSnapshot, options?: LeidenOptions) => LeidenResult>();
expectTypeOf(algorithms.adamicAdarForPairs).toEqualTypeOf<
    (s: GraphSnapshot, pairs: NodePairs, o?: CommonNeighborsOptions) => F64
>();
expectTypeOf(algorithms.adamicAdarPrediction).toEqualTypeOf<
    (s: GraphSnapshot, o?: LinkPredictionOptions) => LinkPredictionResult
>();
expectTypeOf(algorithms.adamicAdarScore).toEqualTypeOf<
    (s: GraphSnapshot, u: number, v: number, o?: CommonNeighborsOptions) => number
>();
expectTypeOf(algorithms.commonNeighborsForPairs).toEqualTypeOf<
    (s: GraphSnapshot, pairs: NodePairs, o?: CommonNeighborsOptions) => F64
>();
expectTypeOf(algorithms.commonNeighborsPrediction).toEqualTypeOf<
    (s: GraphSnapshot, o?: LinkPredictionOptions) => LinkPredictionResult
>();
expectTypeOf(algorithms.compareAdamicAdarWithCommonNeighbors).toEqualTypeOf<
    (
        s: GraphSnapshot,
        edges: NodePairs,
        nonEdges: NodePairs,
        o?: CommonNeighborsOptions,
    ) => { adamicAdar: LinkPredictionMetrics; commonNeighbors: LinkPredictionMetrics }
>();
expectTypeOf(algorithms.evaluateAdamicAdar).toEqualTypeOf<
    (s: GraphSnapshot, edges: NodePairs, nonEdges: NodePairs, o?: CommonNeighborsOptions) => LinkPredictionMetrics
>();
expectTypeOf(algorithms.evaluateCommonNeighbors).toEqualTypeOf<
    (s: GraphSnapshot, edges: NodePairs, nonEdges: NodePairs, o?: CommonNeighborsOptions) => LinkPredictionMetrics
>();
expectTypeOf(algorithms.getTopAdamicAdarCandidatesForNode).toEqualTypeOf<
    (s: GraphSnapshot, u: number, o?: CandidateOptions) => LinkPredictionResult
>();
expectTypeOf(algorithms.getTopCandidatesForNode).toEqualTypeOf<
    (s: GraphSnapshot, u: number, o?: CandidateOptions) => LinkPredictionResult
>();
expectTypeOf(algorithms.louvain).toEqualTypeOf<(s: GraphSnapshot, o?: LouvainOptions) => LouvainResult>();
expectTypeOf(algorithms.markovClustering).toEqualTypeOf<(s: AdjacencyView, options?: MarkovOptions) => MarkovResult>();
expectTypeOf(algorithms.greedyBipartiteMatching).toEqualTypeOf<
    (s: GraphSnapshot, options?: BipartiteMatchingOptions) => BipartiteMatchingResult
>();
expectTypeOf(algorithms.maximumBipartiteMatching).toEqualTypeOf<
    (s: GraphSnapshot, options?: BipartiteMatchingOptions) => BipartiteMatchingResult
>();
expectTypeOf(algorithms.kargerMinCut).toEqualTypeOf<(s: GraphSnapshot, options?: KargerOptions) => MinCutResult>();
expectTypeOf(algorithms.stoerWagner).toEqualTypeOf<(s: GraphSnapshot, options?: StoerWagnerOptions) => MinCutResult>();
expectTypeOf(algorithms.modularity).toEqualTypeOf<
    (s: AdjacencyView, labels: U32, options?: ModularityOptions) => number
>();
expectTypeOf(algorithms.kruskalMST).toEqualTypeOf<(s: GraphSnapshot, o?: MstOptions) => MstResult>();
expectTypeOf(algorithms.primMST).toEqualTypeOf<(s: GraphSnapshot, o?: PrimOptions) => PrimResult>();
expectTypeOf(algorithms.pageRank).toEqualTypeOf<(s: GraphSnapshot, o?: PageRankOptions) => PageRankResult>();
expectTypeOf(algorithms.personalizedPageRank).toEqualTypeOf<
    (s: GraphSnapshot, personalization: F32 | F64, o?: PageRankOptions) => PageRankResult
>();
expectTypeOf(algorithms.astar).toEqualTypeOf<
    (
        g: AdjacencyView,
        source: number,
        target: number,
        heuristic: (node: number, target: number) => number,
        options?: PathOptions,
    ) => AstarResult
>();
expectTypeOf(algorithms.bidirectionalDijkstra).toEqualTypeOf<
    (s: GraphSnapshot, source: number, target: number, options?: PathOptions) => PathResult
>();
expectTypeOf(algorithms.condensation).toEqualTypeOf<
    (s: GraphSnapshot, options?: ArcOrderOption) => CondensationResult
>();
expectTypeOf(algorithms.stronglyConnectedComponents).toEqualTypeOf<
    (g: AdjacencyView, options?: ArcOrderOption) => LabelResult
>();
expectTypeOf(algorithms.spectralClustering).toEqualTypeOf<
    (s: GraphSnapshot, options: SpectralOptions) => SpectralResult
>();
expectTypeOf(algorithms.arcSourceIn).toEqualTypeOf<(rowPtr: U32, arc: number) => number>();
expectTypeOf(algorithms.syncClustering).toEqualTypeOf<
    (s: GraphSnapshot, options: SyncClusteringOptions) => SyncClusteringResult
>();
expectTypeOf(algorithms.teraHAC).toEqualTypeOf<(s: GraphSnapshot, options?: TeraHacOptions) => TeraHacResult>();
expectTypeOf(algorithms.triangleCount).toEqualTypeOf<(s: GraphSnapshot) => TriangleCountResult>();

// ---- the promoted classes and the constant
expectTypeOf(new algorithms.DeltaPageRank(s)).toEqualTypeOf<InstanceType<typeof algorithms.DeltaPageRank>>();
expectTypeOf<ConstructorParameters<typeof algorithms.DeltaPageRank>[0]>().toEqualTypeOf<GraphSnapshot>();
expectTypeOf<ConstructorParameters<typeof algorithms.PriorityDeltaPageRank>[0]>().toEqualTypeOf<GraphSnapshot>();
expectTypeOf(algorithms.APSP_DEFAULT_MAX_NODES).toEqualTypeOf<number>();

declare const s: GraphSnapshot;

// ---- the deprecated `indexed` namespace holds exactly the promoted names, and each is the same function
type Promoted =
    | "adamicAdarForPairs"
    | "adamicAdarPrediction"
    | "adamicAdarScore"
    | "allPairsShortestPath"
    | "APSP_DEFAULT_MAX_NODES"
    | "arcSourceIn"
    | "astar"
    | "bellmanFord"
    | "betweennessCentrality"
    | "bidirectionalDijkstra"
    | "bipartiteFlowNetwork"
    | "breadthFirstSearch"
    | "closenessCentrality"
    | "commonNeighborsForPairs"
    | "commonNeighborsPrediction"
    | "commonNeighborsScore"
    | "compareAdamicAdarWithCommonNeighbors"
    | "condensation"
    | "connectedComponents"
    | "degreeCentrality"
    | "DeltaPageRank"
    | "degrees"
    | "depthFirstSearch"
    | "dijkstra"
    | "directionOptimizedBfs"
    | "edgeBetweennessCentrality"
    | "eigenvectorCentrality"
    | "evaluateAdamicAdar"
    | "evaluateCommonNeighbors"
    | "findAllIsomorphisms"
    | "getTopAdamicAdarCandidatesForNode"
    | "getTopCandidatesForNode"
    | "girvanNewman"
    | "greedyBipartiteMatching"
    | "grsbm"
    | "hasCycle"
    | "hierarchicalClustering"
    | "hits"
    | "IndexedMinHeap"
    | "IntUnionFind"
    | "isBipartite"
    | "isGraphIsomorphic"
    | "kargerMinCut"
    | "katzCentrality"
    | "kCoreDecomposition"
    | "kruskalMST"
    | "labelPropagation"
    | "labelPropagationSemiSupervised"
    | "labelPropagationSynchronous"
    | "leiden"
    | "louvain"
    | "markovClustering"
    | "maxFlow"
    | "maximumBipartiteMatching"
    | "minSTCut"
    | "modularity"
    | "nodeClosenessCentrality"
    | "pageRank"
    | "personalizedPageRank"
    | "primMST"
    | "PriorityDeltaPageRank"
    | "spectralClustering"
    | "stoerWagner"
    | "stronglyConnectedComponents"
    | "syncClustering"
    | "teraHAC"
    | "topologicalSort"
    | "triangleCount"
    | "walkPredArcs"
    | "walkPredEdges"
    | "weaklyConnectedComponents";
expectTypeOf<keyof typeof algorithms.indexed>().toEqualTypeOf<Promoted>();
expectTypeOf<Pick<typeof algorithms.indexed, Promoted>>().toEqualTypeOf<Pick<typeof algorithms, Promoted>>();
// 2.x code named the result and option types through the namespace too; they must still resolve.
expectTypeOf<algorithms.indexed.PageRankResult>().toEqualTypeOf<algorithms.PageRankResult>();
expectTypeOf<algorithms.indexed.PageRankOptions>().toEqualTypeOf<algorithms.PageRankOptions>();
expectTypeOf<algorithms.indexed.SsspResult>().toEqualTypeOf<algorithms.SsspResult>();

// ---- the 2.x legacy API is gone: the Graph class, the Map-of-Maps functions, CSRGraph and the optimized/*
// helpers, graphToMap and toSnapshot (a snapshot is built with @graphty/graph-format instead)
type Removed =
    | "astarWithDetails"
    | "bellmanFordPath"
    | "bipartitePartition"
    | "calculateMCLModularity"
    | "CompactDistanceArray"
    | "condensationGraph"
    | "configureOptimizations"
    | "connectedComponentsDFS"
    | "createBipartiteFlowNetwork"
    | "createOptimizedGraph"
    | "CSRGraph"
    | "dijkstraPath"
    | "DirectionOptimizedBFS"
    | "edmondsKarp"
    | "findStronglyConnectedComponents"
    | "floydWarshall"
    | "floydWarshallPath"
    | "fordFulkerson"
    | "getConnectedComponent"
    | "getKCore"
    | "getOptimizationConfig"
    | "Graph"
    | "GraphBitSet"
    | "graphToMap"
    | "hasCycleDFS"
    | "hasNegativeCycle"
    | "heuristics"
    | "isConnected"
    | "isCSRGraph"
    | "isStronglyConnected"
    | "isWeaklyConnected"
    | "labelPropagationAsync"
    | "largestConnectedComponent"
    | "minimumSpanningTree"
    | "nodeBetweennessCentrality"
    | "nodeDegreeCentrality"
    | "nodeEigenvectorCentrality"
    | "nodeHITS"
    | "nodeKatzCentrality"
    | "nodeWeightedClosenessCentrality"
    | "numberOfConnectedComponents"
    | "pageRankCentrality"
    | "pathfindingUtils"
    | "shortestPathBFS"
    | "singleSourceShortestPath"
    | "singleSourceShortestPathBFS"
    | "toCSRGraph"
    | "topPageRankNodes"
    | "toSnapshot"
    | "transitiveClosure"
    | "VisitedBitArray"
    | "weightedClosenessCentrality";
expectTypeOf<Extract<keyof typeof algorithms, Removed>>().toEqualTypeOf<never>();

// The 2.x PageRankOptions (`alpha`) that shadowed the one pageRank() took is gone: the flat name is the
// snapshot port's options.
expectTypeOf<PageRankOptions>().not.toHaveProperty("alpha");
expectTypeOf<Parameters<typeof algorithms.pageRank>[1]>().toEqualTypeOf<PageRankOptions | undefined>();

// The legacy result and graph types are gone with their functions.
// @ts-expect-error -- algorithms 3.0.0 exports no Graph type
export type NoGraph = algorithms.Graph;
// @ts-expect-error -- algorithms 3.0.0 exports no FloydWarshallResult type
export type NoFloydWarshallResult = algorithms.FloydWarshallResult;
// @ts-expect-error -- algorithms 3.0.0 exports no CentralityResult type
export type NoCentralityResult = algorithms.CentralityResult;
// @ts-expect-error -- algorithms 3.0.0 exports no ShortestPathResult type
export type NoShortestPathResult = algorithms.ShortestPathResult;
// @ts-expect-error -- algorithms 3.0.0 exports no TraversalResult type
export type NoTraversalResult = algorithms.TraversalResult;

// Betweenness results are score results that also state the divisor their scores carry.
expectTypeOf<BetweennessResult>().toMatchTypeOf<ScoresResult>();
