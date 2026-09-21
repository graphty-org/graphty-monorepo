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

export { type BfsOptions, type BfsResult, breadthFirstSearch } from "./bfs.js";
export { type CommonNeighborsOptions, commonNeighborsScore } from "./common-neighbors.js";
export { connectedComponents, type LabelResult, weaklyConnectedComponents } from "./components.js";
export {
    dijkstra,
    type SsspOptions,
    type SsspResult,
    walkPredArcs,
    walkPredEdges,
} from "./dijkstra.js";
export { kruskalMST, type MstOptions, type MstResult } from "./mst.js";
export { pageRank, type PageRankOptions, type PageRankResult } from "./pagerank.js";
export { arcSourceIn, IndexedMinHeap, IntUnionFind } from "./structures/index.js";
