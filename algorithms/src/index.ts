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
export { ConvergenceError } from "./errors.js";

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
} from "./indexed/accelerator.js";
export { accelerated } from "./indexed/accelerator.js";
export type { BfsOptions, BfsResult } from "./indexed/bfs.js";
export type { CommonNeighborsOptions } from "./indexed/common-neighbors.js";
export type { LabelResult } from "./indexed/components.js";
export type { SsspOptions, SsspResult } from "./indexed/dijkstra.js";
export type { MstOptions, MstResult } from "./indexed/mst.js";
// Aliased: the flat names are taken twice over (types/index.ts:96 and centrality/pagerank.ts:15).
export type {
    PageRankOptions as IndexedPageRankOptions,
    PageRankResult as IndexedPageRankResult,
} from "./indexed/pagerank.js";

// Note: Configuration exports have been removed.
// The library now automatically optimizes based on graph size.
