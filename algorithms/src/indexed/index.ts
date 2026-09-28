/**
 * Index-based implementations over `@graphty/graph-format` snapshots (graph-format design 14.1
 * rule 2): every function takes a `GraphSnapshot` or an `AdjacencyView` first and an options object
 * last, and returns typed arrays plus scalars. Reached as the `indexed` namespace of
 * `@graphty/algorithms`.
 *
 * NOT re-exported here, deliberately (plan decision PD-9):
 * - `./accelerator.js`, which imports this barrel -- re-exporting it would make a cycle, and its
 *   symbols are exported FLAT from the package barrel because the GPU package must write
 *   `import type { AlgorithmAccelerator } from "@graphty/algorithms"`.
 * - `./to-snapshot.js`, whose parameter is a legacy `Graph`, which is not what this namespace
 *   promises. It is exported flat too.
 * @module
 */

export { allPairsShortestPath, type ApspOptions, type ApspResult } from "./all-pairs.js";
export { bellmanFord, type BellmanFordResult } from "./bellman-ford.js";
export {
    betweennessCentrality,
    type BetweennessOptions,
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
export { closenessCentrality, type ClosenessOptions, nodeClosenessCentrality } from "./closeness.js";
export { type CommonNeighborsOptions, commonNeighborsScore } from "./common-neighbors.js";
export { connectedComponents, type LabelResult, weaklyConnectedComponents } from "./components.js";
export { degreeCentrality, type DegreeCentralityOptions } from "./degree.js";
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
export { hits, type HitsOptions, type HitsResult } from "./hits.js";
export { type CorenessResult, kCoreDecomposition } from "./k-core.js";
export { katzCentrality, type KatzOptions, type KatzResult } from "./katz.js";
export { labelPropagation, type LabelPropagationOptions, type LabelPropagationResult } from "./label-propagation.js";
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
export { kargerMinCut, type KargerOptions, stoerWagner, type StoerWagnerOptions } from "./min-cut.js";
export { kruskalMST, type MstOptions, type MstResult, primMST, type PrimOptions, type PrimResult } from "./mst.js";
export { pageRank, type PageRankOptions, type PageRankResult, personalizedPageRank } from "./pagerank.js";
export { astar, type AstarResult, bidirectionalDijkstra, type PathOptions, type PathResult } from "./point-to-point.js";
export { condensation, type CondensationResult, stronglyConnectedComponents } from "./scc.js";
export { arcSourceIn, IndexedMinHeap, IntUnionFind } from "./structures/index.js";
