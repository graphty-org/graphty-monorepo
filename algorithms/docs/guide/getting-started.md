# Getting Started

`@graphty/algorithms` is a comprehensive TypeScript library implementing 98+ graph algorithms optimized for browser environments and visualization applications.

## Features

- **98+ algorithms** covering traversal, shortest path, centrality, community detection, and more
- **TypeScript-first** with full type safety and IntelliSense support
- **Browser-optimized** with no Node.js dependencies
- **Automatic optimization** based on graph size
- **Zero configuration** - just import and use

## Installation

::: code-group

```bash [npm]
npm install @graphty/algorithms
```

```bash [pnpm]
pnpm add @graphty/algorithms
```

```bash [yarn]
yarn add @graphty/algorithms
```

:::

## Basic Usage

Algorithms run over a frozen graph snapshot from [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format):
compact typed arrays in compressed sparse row form. They are reached through the `indexed` namespace, take the
snapshot first and an options object last, and return typed arrays indexed by node.

### Creating a Graph

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";

// `directed` is required: true for a directed graph, false for an undirected one
const builder = new GraphBuilder({ directed: true });

// Nodes are added on first mention; an edge may carry a weight
builder.addEdge("a", "b", 1);
builder.addEdge("b", "c", 2);
builder.addEdge("a", "c", 4);

// Freeze into a read-only snapshot. The builder stays usable and can be frozen again.
const graph = builder.freeze();
console.log(graph.nodeCount, graph.edgeCount); // 3 3
```

Node indices follow the order in which ids first appeared, so `"a"` is index 0, `"b"` is 1 and `"c"` is 2. Map between
the two with `graph.ids.requireIndex(id)` and `graph.ids.idOf(index)`.

### Running Algorithms

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { indexed } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 1);
builder.addEdge("b", "c", 2);
builder.addEdge("a", "c", 4);
const graph = builder.freeze();
const a = graph.ids.requireIndex("a");
const c = graph.ids.requireIndex("c");

// Breadth-First Search
const bfs = indexed.breadthFirstSearch(graph, a);
console.log(Array.from(bfs.order.subarray(0, bfs.visitedCount), (i) => graph.ids.idOf(i))); // ["a", "b", "c"]
console.log(bfs.depth[c]); // 1: one hop from "a"

// Shortest paths with Dijkstra
const paths = indexed.dijkstra(graph, a);
console.log(paths.dist[c]); // 3
console.log(Array.from(paths.pathTo(c), (i) => graph.ids.idOf(i))); // ["a", "b", "c"]

// PageRank centrality
const ranks = indexed.pageRank(graph);
const byId = graph.ids.toMap(ranks.scores); // a Map of node id -> rank
console.log(byId.get("c")?.toFixed(3)); // 0.521
```

### Graphs You Already Have

A graph built with the id-keyed `Graph` class of this package converts with `toSnapshot`:

<!-- doc-check -->

```typescript
import { Graph, indexed, toSnapshot } from "@graphty/algorithms";

const legacy = new Graph({ directed: false });
legacy.addEdge("x", "y");
legacy.addEdge("y", "z");

const snapshot = toSnapshot(legacy);
const components = indexed.connectedComponents(snapshot);
console.log(components.count); // 1
```

## Algorithm Categories

Every function below is reached as `indexed.<name>`.

### Traversal Algorithms

- BFS (`breadthFirstSearch`, `directionOptimizedBfs`)
- DFS (`depthFirstSearch`)
- Topological sort, cycle detection, bipartite test
- Connected, weakly connected and strongly connected components

### Shortest Path Algorithms

- Dijkstra's algorithm and bidirectional Dijkstra
- Bellman-Ford algorithm
- All-pairs shortest paths (`allPairsShortestPath`, Floyd-Warshall among its strategies)
- A\* search (`astar`)

### Centrality Algorithms

- Degree, betweenness (node and edge) and closeness centrality
- Eigenvector and Katz centrality
- PageRank and personalized PageRank
- HITS (hubs and authorities)

### Community Detection and Clustering

- Louvain and Leiden
- Girvan-Newman
- Label propagation (asynchronous, synchronous and semi-supervised)
- K-core decomposition, hierarchical, spectral and Markov clustering

### Other Algorithms

- Minimum spanning tree (`kruskalMST`, `primMST`)
- Maximum flow and minimum cuts (`maxFlow`, `minSTCut`, `stoerWagner`, `kargerMinCut`)
- Bipartite matching through `bipartiteFlowNetwork`
- Link prediction (common neighbours, Adamic-Adar)

## Next Steps

- [Installation Guide](./installation.md) - Detailed setup instructions
- [Graph Data Structure](./graph.md) - Building snapshots, node ids and node indices
- [API Reference](../api/) - Complete API documentation
