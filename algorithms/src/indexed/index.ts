/**
 * The algorithms over `@graphty/graph-format` snapshots: every function takes a `GraphSnapshot` or an
 * `AdjacencyView` first and an options object last, and returns typed arrays plus scalars. The package
 * barrel re-exports all of them at the top level, and as the deprecated `indexed` namespace of 2.x.
 *
 * `./accelerator.js` is not re-exported here: it imports this barrel, so re-exporting it would make a
 * cycle. The package barrel exports it.
 * @module
 */

export { allPairsShortestPath, APSP_DEFAULT_MAX_NODES, type ApspOptions, type ApspResult } from "./all-pairs.js";
export { bellmanFord, type BellmanFordResult } from "./bellman-ford.js";
export {
    betweennessCentrality,
    type BetweennessOptions,
    type BetweennessResult,
    edgeBetweennessCentrality,
    type EdgeBetweennessOptions,
    type EdgeScoresResult,
    type ScoresResult,
} from "./betweenness.js";
export {
    type ArcOrderOption,
    type BfsOptions,
    type BfsResult,
    breadthFirstSearch,
    directionOptimizedBfs,
    type DirectionOptimizedBfsOptions,
} from "./bfs.js";
export { type BipartiteOptions, type BipartiteResult, isBipartite } from "./bipartite.js";
export {
    closenessCentrality,
    type ClosenessOptions,
    type ClosenessResult,
    nodeClosenessCentrality,
} from "./closeness.js";
export { type CommonNeighborsOptions, commonNeighborsScore } from "./common-neighbors.js";
export { connectedComponents, type LabelResult, weaklyConnectedComponents } from "./components.js";
export { degreeCentrality, type DegreeCentralityOptions, degrees, type DegreesResult } from "./degree.js";
export {
    DeltaPageRank,
    type DeltaPageRankComputeOptions,
    type DeltaPageRankEngineOptions,
    PriorityDeltaPageRank,
} from "./delta-pagerank.js";
export { depthFirstSearch, type DfsOptions, type DfsResult, hasCycle, topologicalSort } from "./dfs.js";
export { dijkstra, type SsspOptions, type SsspResult, walkPredArcs, walkPredEdges } from "./dijkstra.js";
export { eigenvectorCentrality, type EigenvectorOptions, type EigenvectorResult } from "./eigenvector.js";
export {
    type BipartiteFlowNetwork,
    bipartiteFlowNetwork,
    maxFlow,
    type MaxFlowOptions,
    type MaxFlowResult,
    type MinCutResult,
    minSTCut,
} from "./flow.js";
export { girvanNewman, type GirvanNewmanOptions, type GirvanNewmanResult } from "./girvan-newman.js";
export { grsbm, type GrsbmCluster, type GrsbmOptions, type GrsbmResult, type GrsbmSplit } from "./grsbm.js";
export {
    hierarchicalClustering,
    type HierarchicalOptions,
    type HierarchicalResult,
    type Linkage,
} from "./hierarchical.js";
export { hits, type HitsOptions, type HitsResult } from "./hits.js";
export {
    findAllIsomorphisms,
    isGraphIsomorphic,
    type IsomorphismOptions,
    type IsomorphismResult,
} from "./isomorphism.js";
export { type CorenessResult, kCoreDecomposition } from "./k-core.js";
export { katzCentrality, type KatzOptions, type KatzResult } from "./katz.js";
export {
    labelPropagation,
    type LabelPropagationOptions,
    type LabelPropagationResult,
    labelPropagationSemiSupervised,
    labelPropagationSynchronous,
    type SynchronousLabelPropagationOptions,
} from "./label-propagation.js";
export { leiden, type LeidenOptions, type LeidenResult } from "./leiden.js";
export {
    adamicAdarForPairs,
    adamicAdarPrediction,
    adamicAdarScore,
    type CandidateOptions,
    commonNeighborsForPairs,
    commonNeighborsPrediction,
    compareAdamicAdarWithCommonNeighbors,
    evaluateAdamicAdar,
    evaluateCommonNeighbors,
    getTopAdamicAdarCandidatesForNode,
    getTopCandidatesForNode,
    type LinkPredictionMetrics,
    type LinkPredictionOptions,
    type LinkPredictionResult,
    type NodePairs,
} from "./link-prediction.js";
export { louvain, type LouvainOptions, type LouvainResult } from "./louvain.js";
export { markovClustering, type MarkovOptions, type MarkovResult } from "./markov.js";
export {
    type BipartiteMatchingOptions,
    type BipartiteMatchingResult,
    greedyBipartiteMatching,
    maximumBipartiteMatching,
} from "./matching.js";
export { kargerMinCut, type KargerOptions, stoerWagner, type StoerWagnerOptions } from "./min-cut.js";
export { modularity, type ModularityOptions } from "./modularity.js";
export { kruskalMST, type MstOptions, type MstResult, primMST, type PrimOptions, type PrimResult } from "./mst.js";
export { pageRank, type PageRankOptions, type PageRankResult, personalizedPageRank } from "./pagerank.js";
export { astar, type AstarResult, bidirectionalDijkstra, type PathOptions, type PathResult } from "./point-to-point.js";
export { condensation, type CondensationResult, stronglyConnectedComponents } from "./scc.js";
export { type LaplacianType, spectralClustering, type SpectralOptions, type SpectralResult } from "./spectral.js";
export { arcSourceIn, IndexedMinHeap, IntUnionFind } from "./structures/index.js";
export { syncClustering, type SyncClusteringOptions, type SyncClusteringResult } from "./sync.js";
export { teraHAC, type TeraHacOptions, type TeraHacResult } from "./terahac.js";
export { triangleCount, type TriangleCountResult } from "./triangles.js";
export type { WeightedOptions } from "./weights.js";
