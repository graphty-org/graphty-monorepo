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

- [Graph API Reference](./generated/core/graph/classes/Graph.md) - Complete Graph class documentation

### Types

TypeScript type definitions for algorithm inputs and outputs.

- [Types Reference](./generated/types/) - All type definitions

## Algorithm Categories

### Traversal

Visit nodes in a systematic order.

- `bfs()` - Breadth-First Search
- `dfs()` - Depth-First Search
- `iterativeDeepeningDfs()` - Iterative Deepening DFS
- `bidirectionalSearch()` - Bidirectional BFS
- `topologicalSort()` - Topological ordering (DAG)
- `indexed.breadthFirstSearch()` - BFS over a snapshot; `target` stops early, `arcOrder` sets the neighbour order
- `indexed.directionOptimizedBfs()` - Direction-optimising BFS over a snapshot, switching to bottom-up steps over `reverse()`
- `indexed.depthFirstSearch()` - DFS over a snapshot in pre- or post-order; takes `target` and `arcOrder`
- `indexed.hasCycle()` - Whether a snapshot has a cycle
- `indexed.topologicalSort()` - Topological order of a snapshot as node indices, or null on a cycle
- `indexed.isBipartite()` - Bipartiteness and the two sides as a node mask; `arcs: "out"` follows out-arcs only on a directed snapshot

[Traversal functions in the generated TypeDoc](./generated/index/)

### Shortest Path

Find optimal paths between nodes.

- `dijkstra()` - Weighted non-negative edges
- `bellmanFord()` - Handles negative weights
- `indexed.bellmanFord()` - Bellman-Ford over a snapshot, with the negative-cycle flag
- `indexed.bidirectionalDijkstra()` - One shortest path over a snapshot, naming the exact edges taken
- `indexed.astar()` - A* over a snapshot, the heuristic taking node indices
- `floydWarshall()` - All pairs shortest paths
- `indexed.allPairsShortestPath()` - All pairs shortest paths over a snapshot, as a typed-array matrix
- `aStar()` - Heuristic-guided search

[Shortest Path functions in the generated TypeDoc](./generated/index/)

### Centrality

Measure node importance.

- `degreeCentrality()` - Connection count
- `betweennessCentrality()` - Bridge position
- `closenessCentrality()` - Proximity to all nodes
- `eigenvectorCentrality()` - Influential connections
- `pageRank()` - Link analysis
- `hits()` - Hub/Authority scores
- `katzCentrality()` - Influence with base score

[Centrality functions in the generated TypeDoc](./generated/index/)

### Connected Components

Find connected subgraphs.

- `connectedComponents()` - Undirected components
- `stronglyConnectedComponents()` - Directed components
- `weaklyConnectedComponents()` - Directed (ignoring direction)
- `isConnected()` - Check connectivity
- `isStronglyConnected()` - Check strong connectivity
- `indexed.stronglyConnectedComponents()` - Tarjan over a snapshot, components labelled in completion order
- `indexed.condensation()` - Strongly connected components and the condensed DAG built by `contract()`

[Components functions in the generated TypeDoc](./generated/index/)

### Minimum Spanning Tree

Find minimum-weight spanning trees.

- `kruskal()` - Kruskal's algorithm
- `prim()` - Prim's algorithm
- `indexed.primMST()` - Prim over a snapshot, optionally spanning every component
- `minimumSpanningTree()` - Auto-selects best algorithm

[MST functions in the generated TypeDoc](./generated/index/)

### Community Detection

Identify node communities.

- `louvain()` - Fast modularity optimization
- `girvanNewman()` - Edge betweenness removal
- `labelPropagation()` - Near-linear time detection
- `indexed.labelPropagation()` - Seeded fast label propagation over a snapshot, as a typed-array partition
- `kCliqueCommunities()` - Overlapping communities
- `modularity()` - Partition quality measure

[Community functions in the generated TypeDoc](./generated/index/)

### Clustering

Analyze local graph structure.

- `clusteringCoefficient()` - Local clustering
- `averageClusteringCoefficient()` - Global average
- `transitivity()` - Global clustering
- `triangles()` - Triangle count per node
- `kCore()` - K-core subgraph
- `coreNumber()` - Core decomposition

[Clustering functions in the generated TypeDoc](./generated/index/)

### Flow Algorithms

Network flow and cuts.

- `maxFlow()` - Maximum flow
- `fordFulkerson()` - Augmenting path method
- `edmondsKarp()` - BFS-based flow
- `minCut()` - Minimum cut

[Flow functions in the generated TypeDoc](./generated/index/)

### Matching

Bipartite matching algorithms.

- `maxBipartiteMatching()` - Maximum matching
- `hungarianAlgorithm()` - Weighted matching
- `hopcroftKarp()` - Fast bipartite matching

[Matching functions in the generated TypeDoc](./generated/index/)

### Link Prediction

Predict missing or future edges.

- `commonNeighbors()` - Shared neighbors
- `jaccardCoefficient()` - Relative overlap
- `adamicAdar()` - Weighted common neighbors
- `preferentialAttachment()` - Degree-based
- `resourceAllocation()` - Resource distribution

[Link Prediction functions in the generated TypeDoc](./generated/index/)

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
