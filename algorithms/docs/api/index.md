# API Reference

Complete API documentation for `@graphty/algorithms`.

## Core

### Graph

The primary data structure for all algorithms.

```typescript
import { Graph } from "@graphty/algorithms";

const graph = new Graph<string>();
const directed = new Graph<string>({ directed: true });
```

- [Graph API Reference](./graph.md) - Complete Graph class documentation

### Types

TypeScript type definitions for algorithm inputs and outputs.

- [Types Reference](./types.md) - All type definitions

## Algorithm Categories

### Traversal

Visit nodes in a systematic order.

- `bfs()` - Breadth-First Search
- `dfs()` - Depth-First Search
- `iterativeDeepeningDfs()` - Iterative Deepening DFS
- `bidirectionalSearch()` - Bidirectional BFS
- `topologicalSort()` - Topological ordering (DAG)

[Traversal API Reference](./traversal.md)

### Shortest Path

Find optimal paths between nodes.

- `dijkstra()` - Weighted non-negative edges
- `bellmanFord()` - Handles negative weights
- `floydWarshall()` - All pairs shortest paths
- `aStar()` - Heuristic-guided search

[Shortest Path API Reference](./shortest-path.md)

### Centrality

Measure node importance.

- `degreeCentrality()` - Connection count
- `betweennessCentrality()` - Bridge position
- `closenessCentrality()` - Proximity to all nodes
- `eigenvectorCentrality()` - Influential connections
- `pageRank()` - Link analysis
- `hits()` - Hub/Authority scores
- `katzCentrality()` - Influence with base score

[Centrality API Reference](./centrality.md)

### Connected Components

Find connected subgraphs.

- `connectedComponents()` - Undirected components
- `stronglyConnectedComponents()` - Directed components
- `weaklyConnectedComponents()` - Directed (ignoring direction)
- `isConnected()` - Check connectivity
- `isStronglyConnected()` - Check strong connectivity

[Components API Reference](./components.md)

### Minimum Spanning Tree

Find minimum-weight spanning trees.

- `kruskal()` - Kruskal's algorithm
- `prim()` - Prim's algorithm
- `minimumSpanningTree()` - Auto-selects best algorithm

[MST API Reference](./mst.md)

### Community Detection

Identify node communities.

- `louvain()` - Fast modularity optimization
- `girvanNewman()` - Edge betweenness removal
- `labelPropagation()` - Near-linear time detection
- `kCliqueCommunities()` - Overlapping communities
- `modularity()` - Partition quality measure

[Community API Reference](./community.md)

### Clustering

Analyze local graph structure.

- `clusteringCoefficient()` - Local clustering
- `averageClusteringCoefficient()` - Global average
- `transitivity()` - Global clustering
- `triangles()` - Triangle count per node
- `kCore()` - K-core subgraph
- `coreNumber()` - Core decomposition

[Clustering API Reference](./clustering.md)

### Flow Algorithms

Network flow and cuts.

- `maxFlow()` - Maximum flow
- `fordFulkerson()` - Augmenting path method
- `edmondsKarp()` - BFS-based flow
- `minCut()` - Minimum cut

[Flow API Reference](./flow.md)

### Matching

Bipartite matching algorithms.

- `maxBipartiteMatching()` - Maximum matching
- `hungarianAlgorithm()` - Weighted matching
- `hopcroftKarp()` - Fast bipartite matching

[Matching API Reference](./matching.md)

### Link Prediction

Predict missing or future edges.

- `commonNeighbors()` - Shared neighbors
- `jaccardCoefficient()` - Relative overlap
- `adamicAdar()` - Weighted common neighbors
- `preferentialAttachment()` - Degree-based
- `resourceAllocation()` - Resource distribution

[Link Prediction API Reference](./link-prediction.md)

## Data Structures

Internal data structures available for advanced use.

- `PriorityQueue` - Min/max heap
- `UnionFind` - Disjoint set union
- `BitSet` - Efficient boolean array

```typescript
import { PriorityQueue, UnionFind } from "@graphty/algorithms";
```

## Generated TypeDoc

For complete TypeScript API documentation including all interfaces, types, and function signatures, see the [Generated TypeDoc](#generated-typedoc) section in the sidebar.
