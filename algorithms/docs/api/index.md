# API Reference

Complete API documentation for `@graphty/algorithms`. Every algorithm takes a frozen `GraphSnapshot` from
`@graphty/graph-format` first and an options object last, and returns typed arrays indexed by node (or edge) index.
See [Graph Data Structure](../guide/graph.md) for building a snapshot and mapping node ids to indices.

[Every function and type in the generated TypeDoc](./generated/index/)

## Traversal

- `breadthFirstSearch()` - BFS; `target` stops early, `maxDepth` bounds the depth, `arcOrder` sets the neighbour order
- `directionOptimizedBfs()` - BFS that switches to bottom-up steps over `reverse()` on large frontiers
- `depthFirstSearch()` - DFS in pre- or post-order; takes `target` and `arcOrder`
- `hasCycle()` - Whether the graph has a cycle
- `topologicalSort()` - Topological order as node indices, or null on a cycle
- `isBipartite()` - Bipartiteness and the two sides as a node mask

## Components

- `connectedComponents()` - Components of an undirected graph: a label per node, `count`, `groups()`
- `weaklyConnectedComponents()` - Components ignoring direction
- `stronglyConnectedComponents()` - Tarjan, components labelled in completion order
- `condensation()` - Strongly connected components and the condensed DAG

## Shortest Paths

- `dijkstra()` - Single-source shortest paths over non-negative weights; `pathTo(target)`
- `bellmanFord()` - Single-source shortest paths with negative weights, and the negative-cycle flag
- `bidirectionalDijkstra()` - One shortest path, naming the edges taken
- `astar()` - A\* search, the heuristic taking node indices
- `allPairsShortestPath()` - Every pair, as a row-major typed-array matrix (Floyd-Warshall or one search per source)
- `walkPredArcs()`, `walkPredEdges()` - The arcs or edges of a path from a predecessor array

## Spanning Trees

- `kruskalMST()` - Kruskal's minimum spanning tree
- `primMST()` - Prim's minimum spanning tree from a start node, optionally spanning every component

## Centrality

- `degrees()` - Each node's in- and out-degree as counted from the edge list, by the orientation each edge was declared with (on an undirected snapshot too, so in plus out is the degree counted once); also a member of the `accelerated()` dispatcher
- `degreeCentrality()` - In-, out- or total degree, optionally normalised
- `betweennessCentrality()`, `edgeBetweennessCentrality()` - Brandes betweenness, exact or sampled
- `closenessCentrality()`, `nodeClosenessCentrality()` - Closeness or harmonic closeness, by hops or by weight, exact or sampled
- `eigenvectorCentrality()` - Power iteration; throws `ConvergenceError` when it does not converge
- `katzCentrality()` - Attenuated walk counts
- `hits()` - Hub and authority scores
- `pageRank()`, `personalizedPageRank()` - PageRank, and with a restart vector
- `DeltaPageRank`, `PriorityDeltaPageRank` - Incremental PageRank engines over a snapshot

## Community Detection

- `louvain()`, `leiden()` - Modularity optimisation, seeded
- `girvanNewman()` - Divisive clustering by edge betweenness, one label vector per level
- `labelPropagation()`, `labelPropagationSynchronous()`, `labelPropagationSemiSupervised()` - Label propagation
- `modularity()` - Newman's modularity of a partition

## Clustering

- `kCoreDecomposition()` - Core number of every node
- `hierarchicalClustering()` - Agglomerative clustering by hop distance; `cut(height)` gives clusters
- `markovClustering()` - Markov clustering (MCL)
- `spectralClustering()` - Spectral clustering on the graph Laplacian
- `teraHAC()`, `syncClustering()`, `grsbm()` - Research clustering algorithms

## Flow and Cuts

- `maxFlow()` - Maximum flow (Edmonds-Karp or Ford-Fulkerson), flow per edge and the minimum cut
- `minSTCut()` - Minimum cut between two nodes
- `stoerWagner()`, `kargerMinCut()` - Global minimum cut, exact or seeded randomised
- `bipartiteFlowNetwork()` - The flow network of a bipartite matching problem

## Matching and Isomorphism

- `maximumBipartiteMatching()`, `greedyBipartiteMatching()` - Bipartite matchings
- `isGraphIsomorphic()`, `findAllIsomorphisms()` - Graph isomorphism, with node and edge match callbacks

## Link Prediction

- `commonNeighborsScore()`, `commonNeighborsForPairs()`, `commonNeighborsPrediction()`, `getTopCandidatesForNode()`,
  `evaluateCommonNeighbors()` - Common neighbours
- `adamicAdarScore()`, `adamicAdarForPairs()`, `adamicAdarPrediction()`, `getTopAdamicAdarCandidatesForNode()`,
  `evaluateAdamicAdar()`, `compareAdamicAdarWithCommonNeighbors()` - Adamic-Adar

## Acceleration

- `accelerated()` - Runs the algorithms through an accelerator such as `@graphty/webgpu-graph-algorithms` where it
  implements them, and on the CPU otherwise
- `AlgorithmAccelerator` and the `*Like` result types - The seam an accelerator implements

## Data Structures and Errors

- `PriorityQueue`, `UnionFind` - General-purpose structures
- `IndexedMinHeap`, `IntUnionFind`, `arcSourceIn()` - The index-based structures the algorithms share
- `ConvergenceError`, `PathWalkError` - What an algorithm throws when it cannot finish

## Deprecated

- `indexed` - The namespace algorithms 2.x offered these functions under; `indexed.pageRank` is `pageRank`. Removed in
  4.0. The [migration guide](../guide/migrating-to-3.md) lists the replacement for every other 2.x export.
