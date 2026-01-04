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

### Creating a Graph

```typescript
import { Graph } from "@graphty/algorithms";

// Create a directed graph (default)
const graph = new Graph();

// Or create an undirected graph
const undirected = new Graph({ directed: false });

// Add nodes
graph.addNode("a");
graph.addNode("b");
graph.addNode("c");

// Add edges with optional weights
graph.addEdge("a", "b", { weight: 1 });
graph.addEdge("b", "c", { weight: 2 });
graph.addEdge("a", "c", { weight: 4 });
```

### Running Algorithms

```typescript
import { Graph, bfs, dijkstra, pageRank } from "@graphty/algorithms";

const graph = new Graph();
// ... add nodes and edges

// Breadth-First Search
const bfsResult = bfs(graph, "a");
console.log(bfsResult.order); // Visit order
console.log(bfsResult.distances); // Distance from start

// Shortest paths with Dijkstra
const paths = dijkstra(graph, "a");
console.log(paths.get("c")); // { distance: 3, path: ["a", "b", "c"] }

// PageRank centrality
const ranks = pageRank(graph);
console.log(ranks); // Map of node -> rank value
```

## Algorithm Categories

### Traversal Algorithms
- BFS (Breadth-First Search)
- DFS (Depth-First Search)
- Iterative Deepening DFS
- Bidirectional Search

### Shortest Path Algorithms
- Dijkstra's Algorithm
- Bellman-Ford Algorithm
- Floyd-Warshall Algorithm
- A* Search

### Centrality Algorithms
- Degree Centrality
- Betweenness Centrality
- Closeness Centrality
- Eigenvector Centrality
- PageRank
- HITS (Hubs & Authorities)

### Community Detection
- Louvain Algorithm
- Girvan-Newman Algorithm
- Label Propagation
- K-Clique Communities

### Other Algorithms
- Minimum Spanning Tree (Kruskal, Prim)
- Connected Components
- Cycle Detection
- Topological Sort
- Maximum Flow (Ford-Fulkerson)
- Bipartite Matching
- Link Prediction

## Next Steps

- [Installation Guide](./installation.md) - Detailed setup instructions
- [Graph Data Structure](./graph.md) - Learn about the Graph API
- [API Reference](/api/) - Complete API documentation
