/**
 * graphty/algorithms - Graph algorithms library for browser environments
 *
 * A comprehensive TypeScript library implementing fundamental graph algorithms
 * optimized for browser environments and visualization applications.
 * @module
 */

// Core exports
export { Graph } from "./core/graph.js";

// Type exports
export type {
    BellmanFordResult,
    CentralityOptions,
    CentralityResult,
    CommunityResult,
    ComponentResult,
    DijkstraOptions,
    Edge,
    FloydWarshallResult,
    GirvanNewmanOptions,
    GraphConfig,
    LouvainOptions,
    MSTResult,
    Node,
    NodeId,
    // NOTE: this explicit re-export SHADOWS the `PageRankOptions` that `export * from
    // "./algorithms/index.js"` below re-exports from centrality/pagerank.ts, which is the one
    // pageRank() actually takes. The two differ (`alpha` here, `dampingFactor` there), so
    // `const o: PageRankOptions = { alpha: 0.9 }` compiles and is silently ignored. Neither is
    // changed during the dual-API window (graph-format design 14.1 rule 1); this one is removed at
    // 2.0. See design/decisions/2026-09-19-pagerank-options-shadowing.md.
    PageRankOptions,
    ShortestPathResult,
    TraversalOptions,
    TraversalResult,
} from "./types/index.js";

// Error exports
export { ConvergenceError, PathWalkError } from "./errors.js";

// Algorithm exports
export * from "./algorithms/index.js";

// Research algorithms exports (Priority 4)
export * from "./research/index.js";

// Data structure exports
export * from "./data-structures/index.js";

// Optimized algorithm exports
export * from "./optimized/index.js";

// Index-based implementations over @graphty/graph-format snapshots (graph-format design 14.1 rule 2).
// A NAMESPACE, not a flat re-export: indexed.pageRank, indexed.dijkstra, indexed.breadthFirstSearch,
// indexed.connectedComponents and indexed.kruskalMST all collide by name with the legacy functions above.
export * as indexed from "./indexed/index.js";

// The graph-format bridge (graph-format design 14.6 row A1).
export { toSnapshot } from "./indexed/to-snapshot.js";

// The accelerator seam (design/webgpu/webgpu-acceleration-plan.md section 9.2). Flat, NOT through the
// namespace: the GPU package writes `import type { AlgorithmAccelerator } from "@graphty/algorithms"`.
export type {
    AcceleratedAlgorithms,
    AlgorithmAccelerator,
    ApspCycleResultLike,
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
    PageRankOptionsLike,
    PageRankResultLike,
    ScoresResultLike,
    SsspResultLike,
} from "./indexed/accelerator.js";
export { accelerated } from "./indexed/accelerator.js";
// `Indexed` prefix: @graphty/webgpu-graph-algorithms publishes a different ApspOptions.
export type { ApspOptions as IndexedApspOptions, ApspResult as IndexedApspResult } from "./indexed/all-pairs.js";
// `Indexed` prefix: the flat BellmanFordResult is the legacy function's.
export type { BellmanFordResult as IndexedBellmanFordResult } from "./indexed/bellman-ford.js";
export type {
    BetweennessOptions,
    EdgeBetweennessOptions,
    EdgeScoresResult,
    ScoresResult,
} from "./indexed/betweenness.js";
export type { ArcOrderOption, BfsOptions, BfsResult, DirectionOptimizedBfsOptions } from "./indexed/bfs.js";
export type { BipartiteOptions, BipartiteResult } from "./indexed/bipartite.js";
export type { ClosenessOptions } from "./indexed/closeness.js";
export type { CommonNeighborsOptions } from "./indexed/common-neighbors.js";
export type { LabelResult } from "./indexed/components.js";
export type { DegreeCentralityOptions } from "./indexed/degree.js";
export type { DfsOptions, DfsResult } from "./indexed/dfs.js";
export type { SsspOptions, SsspResult } from "./indexed/dijkstra.js";
// The `Indexed` prefix, as on the PageRank pair below: the flat names HITSOptions / HITSResult,
// KatzCentralityOptions and LouvainOptions already belong to the legacy functions above, and two
// option types one capital letter apart in the same barrel is a trap, not a convenience.
export type {
    EigenvectorOptions as IndexedEigenvectorOptions,
    EigenvectorResult as IndexedEigenvectorResult,
} from "./indexed/eigenvector.js";
export type { HitsOptions as IndexedHitsOptions, HitsResult as IndexedHitsResult } from "./indexed/hits.js";
export type { CorenessResult } from "./indexed/k-core.js";
export type { KatzOptions as IndexedKatzOptions, KatzResult as IndexedKatzResult } from "./indexed/katz.js";
// Aliased: the flat LabelPropagationOptions / LabelPropagationResult name the legacy function's types.
export type {
    LabelPropagationOptions as IndexedLabelPropagationOptions,
    LabelPropagationResult as IndexedLabelPropagationResult,
} from "./indexed/label-propagation.js";
export type {
    LouvainOptions as IndexedLouvainOptions,
    LouvainResult as IndexedLouvainResult,
} from "./indexed/louvain.js";
export type { MstOptions, MstResult, PrimOptions, PrimResult } from "./indexed/mst.js";
export type { CondensationResult } from "./indexed/scc.js";
// Aliased: the flat names are taken twice over (types/index.ts:96 and centrality/pagerank.ts:15).
export type {
    PageRankOptions as IndexedPageRankOptions,
    PageRankResult as IndexedPageRankResult,
} from "./indexed/pagerank.js";
export type { AstarResult, PathOptions, PathResult } from "./indexed/point-to-point.js";

// Note: Configuration exports have been removed.
// The library now automatically optimizes based on graph size.
