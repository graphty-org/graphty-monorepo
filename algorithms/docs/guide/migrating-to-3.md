# Migrating to 3.0

algorithms 3.0.0 has one API: every algorithm takes a frozen `GraphSnapshot` from
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) and returns typed arrays indexed by node
(or edge) index. The id-keyed API of 2.x -- the `Graph` class, the functions that took it and returned Maps and records
keyed by node id, and the `CSRGraph` helpers -- is gone. The snapshot functions that 2.x offered as `indexed.<name>` are
now top-level exports; `indexed` still works in 3.x as a deprecated alias of them and goes in 4.0.

## Build a snapshot instead of a `Graph`

`GraphBuilder` takes the same `addNode(id)` and `addEdge(source, target, weight)` calls as the `Graph` class did.
`freeze()` turns it into the snapshot every algorithm takes. Node index `i` is the `i`-th id the builder saw.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { dijkstra, pageRank } from "@graphty/algorithms";

// 2.x: const graph = new Graph({ directed: true }); graph.addEdge("a", "b", 1); ...
const builder = new GraphBuilder({ directed: true });
builder.addEdge("a", "b", 1);
builder.addEdge("b", "c", 2);
builder.addEdge("a", "c", 4);
const s = builder.freeze();

// 2.x: dijkstra(graph, "a").get("c")?.distance
const paths = dijkstra(s, s.ids.requireIndex("a"));
console.log(paths.dist[s.ids.requireIndex("c")]); // 3

// 2.x: pageRank(graph).ranks -- now one score per node index; toMap keys it by id again
const ranks = s.ids.toMap(pageRank(s).scores);
console.log(ranks.get("c")?.toFixed(3)); // 0.521
```

## Read a result by node id

A result holds one entry per node index. Three reads cover almost every 2.x shape:

- a score per node (2.x `Record<string, number>` or `Map`): `s.ids.toMap(result.scores)`
- a list of node indices (a path, a traversal order, a cut side): `Array.from(indices, (i) => s.ids.idOf(i))`
- a partition (2.x `NodeId[][]` or `Map<string, number>`): `result.labels[i]` is node `i`'s group and
  `result.groups()` lists each group's node indices

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { breadthFirstSearch, connectedComponents } from "@graphty/algorithms";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
builder.addEdge("x", "y");
const s = builder.freeze();

// 2.x: breadthFirstSearch(graph, "a").order
const bfs = breadthFirstSearch(s, s.ids.requireIndex("a"));
console.log(Array.from(bfs.order.subarray(0, bfs.visitedCount), (i) => s.ids.idOf(i))); // ["a", "b", "c"]

// 2.x: connectedComponents(graph) -- one array of ids per component
const components = connectedComponents(s);
console.log(components.groups().map((members) => Array.from(members, (i) => s.ids.idOf(i)))); // [["a", "b", "c"], ["x", "y"]]
```

## Every 2.x function and class

In the right-hand column `s` is the snapshot, `a` and `b` are node indices (`s.ids.requireIndex(id)`), and `r` is the
result of the call on the same row. Where the name is unchanged, the arguments and the result changed as above.

| 2.x                                              | 3.0                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `adamicAdarForPairs(graph, pairs)`               | `adamicAdarForPairs(s, { sources, targets })`: one score per pair                                                   |
| `adamicAdarPrediction(graph, options)`           | `adamicAdarPrediction(s, options)`: `r.sources`, `r.targets`, `r.scores`, best first                                |
| `adamicAdarScore(graph, u, v)`                   | `adamicAdarScore(s, a, b)`                                                                                          |
| `allPairsShortestPath(graph)`                    | `allPairsShortestPath(s)`: `r.dist[a * r.n + b]`                                                                    |
| `astar(map, start, goal, heuristic)`             | `astar(s, a, b, (i, target) => estimate)`: `r.path`, `r.distance`; a Map-of-Maps becomes a snapshot first           |
| `astarWithDetails(map, start, goal, heuristic)`  | `astar(s, a, b, heuristic)`: `r.gScore`, `r.fScore`, `r.visited` as well                                            |
| `bellmanFord(graph, source)`                     | `bellmanFord(s, a)`: `r.dist`, `r.hasNegativeCycle`, `r.pathTo(b)`                                                  |
| `bellmanFordPath(graph, source, target)`         | `bellmanFord(s, a)`, then `r.pathTo(b)` and `r.dist[b]`                                                             |
| `betweennessCentrality(graph, options)`          | `betweennessCentrality(s, options)`: `r.scores`                                                                     |
| `bipartitePartition(graph)`                      | `isBipartite(s)`: `r.sides` is a node mask, the nodes of one side                                                   |
| `breadthFirstSearch(graph, start, options)`      | `breadthFirstSearch(s, a, { target, maxDepth, arcOrder })`: `r.order`, `r.depth`, `r.parent`                        |
| `calculateMCLModularity(graph, communities)`     | `modularity(s, labels)`: Newman's modularity over weighted degrees (see below)                                      |
| `closenessCentrality(graph, options)`            | `closenessCentrality(s, options)`: `r.scores`                                                                       |
| `commonNeighborsForPairs(graph, pairs)`          | `commonNeighborsForPairs(s, { sources, targets })`                                                                  |
| `commonNeighborsPrediction(graph, options)`      | `commonNeighborsPrediction(s, options)`                                                                             |
| `commonNeighborsScore(graph, u, v)`              | `commonNeighborsScore(s, a, b)`                                                                                     |
| `compareAdamicAdarWithCommonNeighbors(...)`      | `compareAdamicAdarWithCommonNeighbors(s, edges, nonEdges)`, pairs as `{ sources, targets }`                         |
| `condensationGraph(graph)`                       | `condensation(s)`: `r.components` and the condensed graph `r.condensed`                                             |
| `connectedComponents(graph)`                     | `connectedComponents(s)`: `r.labels`, `r.count`, `r.groups()`                                                       |
| `connectedComponentsDFS(graph)`                  | `connectedComponents(s)` (members come in node order, not depth-first order)                                        |
| `createBipartiteFlowNetwork(left, right, edges)` | `bipartiteFlowNetwork(left, right, edges)`: `r.snapshot`, `r.source`, `r.sink`                                      |
| `degreeCentrality(graph, options)`               | `degreeCentrality(s, options)`: one value per node                                                                  |
| `depthFirstSearch(graph, start, options)`        | `depthFirstSearch(s, a, { target, order: "pre" \| "post", arcOrder })`                                              |
| `dijkstra(graph, source)`                        | `dijkstra(s, a)`: `r.dist`, `r.pathTo(b)`                                                                           |
| `dijkstraPath(graph, source, target)`            | `dijkstra(s, a)`, then `r.pathTo(b)`; or `bidirectionalDijkstra(s, a, b)`                                           |
| `edgeBetweennessCentrality(graph, options)`      | `edgeBetweennessCentrality(s, options)`: one score per edge index (undirected: twice 2.x, see below)                |
| `edmondsKarp(graph, source, sink)`               | `maxFlow(s, a, b, { algorithm: "edmonds-karp" })`: `r.maxFlow`, `r.flow` per edge                                   |
| `eigenvectorCentrality(graph, options)`          | `eigenvectorCentrality(s, options)`: `r.scores`                                                                     |
| `evaluateAdamicAdar(graph, edges, nonEdges)`     | `evaluateAdamicAdar(s, edges, nonEdges)`, pairs as `{ sources, targets }`                                           |
| `evaluateCommonNeighbors(...)`                   | `evaluateCommonNeighbors(s, edges, nonEdges)`                                                                       |
| `findAllIsomorphisms(graph1, graph2)`            | `findAllIsomorphisms(s1, s2)`: each mapping is the image in `s2` of every node of `s1`                              |
| `findStronglyConnectedComponents(graph)`         | `stronglyConnectedComponents(s)` (Tarjan's order, not Kosaraju's)                                                   |
| `floydWarshall(graph)`                           | `allPairsShortestPath(s, { method: "floyd-warshall", paths: true })`                                                |
| `floydWarshallPath(graph, source, target)`       | `allPairsShortestPath(s, { paths: true })`, then `r.pathTo(a, b)` and `r.dist[a * r.n + b]`                         |
| `fordFulkerson(graph, source, sink)`             | `maxFlow(s, a, b, { algorithm: "ford-fulkerson" })`                                                                 |
| `getConnectedComponent(graph, node)`             | `connectedComponents(s)`: the nodes whose `r.labels` equal `r.labels[a]`                                            |
| `getKCore(graph, k)`                             | `kCoreDecomposition(s)`: the nodes with `r.coreness[i] >= k`                                                        |
| `getTopAdamicAdarCandidatesForNode(graph, node)` | `getTopAdamicAdarCandidatesForNode(s, a, options)`                                                                  |
| `getTopCandidatesForNode(graph, node)`           | `getTopCandidatesForNode(s, a, options)`                                                                            |
| `girvanNewman(graph, options)`                   | `girvanNewman(s, options)`: one label vector per level in `r.levels`, and `r.modularity`                            |
| `greedyBipartiteMatching(graph)`                 | `greedyBipartiteMatching(s)`: `r.matching[left]` is its partner, `r.size`                                           |
| `grsbm(graph, config)`                           | `grsbm(s, options)`                                                                                                 |
| `hasCycleDFS(graph)`                             | `hasCycle(s)`                                                                                                       |
| `hasNegativeCycle(graph)`                        | `bellmanFord(s, a).hasNegativeCycle` from every node not yet reached, or `allPairsShortestPath(s).hasNegativeCycle` |
| `hierarchicalClustering(graph, linkage)`         | `hierarchicalClustering(s, { linkage })`: merges in `r.left`, `r.right`; `r.cut(height)` lists clusters             |
| `hits(graph, options)`                           | `hits(s, options)`: `r.hubs`, `r.authorities`                                                                       |
| `isBipartite(graph)`                             | `isBipartite(s).bipartite`                                                                                          |
| `isConnected(graph)`                             | `connectedComponents(s).count === 1`                                                                                |
| `isGraphIsomorphic(graph1, graph2)`              | `isGraphIsomorphic(s1, s2)`: `r.isomorphic`, `r.mapping`                                                            |
| `isStronglyConnected(graph)`                     | `stronglyConnectedComponents(s).count === 1`                                                                        |
| `isWeaklyConnected(graph)`                       | `weaklyConnectedComponents(s).count === 1`                                                                          |
| `kCoreDecomposition(graph)`                      | `kCoreDecomposition(s)`: `r.coreness`, `r.maxCore`, `r.cores()`                                                     |
| `kargerMinCut(graph, iterations)`                | `kargerMinCut(s, { iterations, randomSeed })`: `r.cutValue`, `r.side`, `r.cutEdges`                                 |
| `katzCentrality(graph, options)`                 | `katzCentrality(s, options)`: `r.scores`                                                                            |
| `kruskalMST(graph)`                              | `kruskalMST(s)`: `r.edges` (edge indices), `r.totalWeight`                                                          |
| `labelPropagation(graph, options)`               | `labelPropagation(s, options)`: `r.labels`, `r.count`                                                               |
| `labelPropagationAsync(graph, options)`          | `labelPropagation(s, options)`; `labelPropagationSynchronous(s, options)` updates every node at once                |
| `labelPropagationSemiSupervised(graph, seeds)`   | `labelPropagationSemiSupervised(s, seeds, options)`, one seed label per node index                                  |
| `largestConnectedComponent(graph)`               | `connectedComponents(s).groups()`, the longest one                                                                  |
| `leiden(graph, options)`                         | `leiden(s, options)`: `r.labels`, `r.modularity`                                                                    |
| `louvain(graph, options)`                        | `louvain(s, options)`: `r.labels`, `r.modularity`                                                                   |
| `markovClustering(graph, options)`               | `markovClustering(s, options)`: `r.labels`, `r.attractors`                                                          |
| `maximumBipartiteMatching(graph, options)`       | `maximumBipartiteMatching(s, { left, right })`, sides as node masks                                                 |
| `minSTCut(graph, source, sink)`                  | `minSTCut(s, a, b)`: `r.cutValue`, `r.side`, `r.cutEdges`                                                           |
| `minimumSpanningTree(graph)`                     | `kruskalMST(s)`                                                                                                     |
| `nodeBetweennessCentrality(graph, node)`         | `betweennessCentrality(s).scores[a]`                                                                                |
| `nodeClosenessCentrality(graph, node)`           | `nodeClosenessCentrality(s, a, options)`                                                                            |
| `nodeDegreeCentrality(graph, node)`              | `degreeCentrality(s)[a]`, or `s.degree()[a]` for one node                                                           |
| `nodeEigenvectorCentrality(graph, node)`         | `eigenvectorCentrality(s).scores[a]`                                                                                |
| `nodeHITS(graph, node)`                          | `hits(s)`, then `r.hubs[a]` and `r.authorities[a]`                                                                  |
| `nodeKatzCentrality(graph, node)`                | `katzCentrality(s).scores[a]`                                                                                       |
| `nodeWeightedClosenessCentrality(graph, node)`   | `nodeClosenessCentrality(s, a, { weighted: true })`                                                                 |
| `numberOfConnectedComponents(graph)`             | `connectedComponents(s).count`                                                                                      |
| `pageRank(graph, options)`                       | `pageRank(s, options)`: `r.scores`, `r.iterations`, `r.converged`                                                   |
| `pageRankCentrality(graph, options)`             | `pageRank(s, options).scores`                                                                                       |
| `personalizedPageRank(graph, nodes)`             | `personalizedPageRank(s, weights)`, one restart weight per node index                                               |
| `primMST(graph, start)`                          | `primMST(s, { start, forest })`: `r.edges`, `r.totalWeight`                                                         |
| `shortestPathBFS(graph, source, target)`         | `breadthFirstSearch(s, a, { target: b })`, then follow `r.parent` from `b`                                          |
| `singleSourceShortestPath(graph, source)`        | `dijkstra(s, a, { cutoff })`: `r.dist`                                                                              |
| `singleSourceShortestPathBFS(graph, source)`     | `breadthFirstSearch(s, a)`: `r.depth` and `r.parent`                                                                |
| `spectralClustering(graph, options)`             | `spectralClustering(s, options)`: `r.labels`, `r.eigenvalues`                                                       |
| `stoerWagner(graph)`                             | `stoerWagner(s)`                                                                                                    |
| `stronglyConnectedComponents(graph)`             | `stronglyConnectedComponents(s)`: `r.labels`, `r.groups()`                                                          |
| `syncClustering(graph, config)`                  | `syncClustering(s, options)`                                                                                        |
| `teraHAC(graph, config)`                         | `teraHAC(s, options)`                                                                                               |
| `topPageRankNodes(graph, k)`                     | `pageRank(s).scores`, then the `k` node indices with the highest score                                              |
| `topologicalSort(graph)`                         | `topologicalSort(s)`: node indices, or null when the graph has a cycle                                              |
| `transitiveClosure(graph)`                       | `allPairsShortestPath(s, { weighted: false })`: `b` is reachable from `a` when `r.dist[a * r.n + b]` is finite      |
| `weaklyConnectedComponents(graph)`               | `weaklyConnectedComponents(s)`                                                                                      |
| `weightedClosenessCentrality(graph, options)`    | `closenessCentrality(s, { weighted: true })`                                                                        |
| `DeltaPageRank` (class)                          | `new DeltaPageRank(s)`, over a snapshot; to follow a changed graph, freeze it again                                 |
| `PriorityDeltaPageRank` (class)                  | `new PriorityDeltaPageRank(s)`, as `DeltaPageRank`                                                                  |
| `DirectionOptimizedBFS` (class)                  | `directionOptimizedBfs(s, a)`, one source per call                                                                  |

The rest of the 2.x surface went with the `Graph` class: `Graph` (use `GraphBuilder` and `fromEdgeArrays` from
graph-format), `toSnapshot` (build the snapshot directly), `CSRGraph`, `toCSRGraph`, `isCSRGraph`, `createOptimizedGraph`,
`configureOptimizations`, `getOptimizationConfig`, `GraphBitSet`, `VisitedBitArray` and `CompactDistanceArray` (a snapshot
is already compressed sparse rows), `heuristics` and `pathfindingUtils` (a heuristic is now a function of two node
indices), and the id-keyed result and option types. The `Indexed`-prefixed type names of 2.x (`IndexedPageRankOptions`,
`IndexedMinCutResult` and the rest) are now the plain names (`PageRankOptions`, `MinCutResult`). `PriorityQueue`,
`UnionFind`, `ConvergenceError`, `PathWalkError` and `accelerated` are unchanged, except for the closeness member of
the accelerator seam (see "Sampled closeness" below).

## Results that differ from 2.x

Most 3.0 functions return what the 2.x function of the same algorithm returned, in a new shape. These do not, on the
graphs named:

- **Ties.** `dijkstra`, `bellmanFord` and `astar` may take another of two equally short paths, and `primMST` another of
  two equally light trees: they break ties by row order where 2.x used insertion order. Distances and total weights
  are the same.
- **Order.** `stronglyConnectedComponents` lists components in Tarjan's order, where `findStronglyConnectedComponents`
  used Kosaraju's; `connectedComponents` lists members in node order, where `connectedComponentsDFS` used depth-first
  order; `isBipartite` returns an unordered side mask where `bipartitePartition` listed the sides in search order. Pass
  `arcOrder` to a traversal to try neighbours in insertion order.
- **Edge betweenness.** On an undirected graph `edgeBetweennessCentrality` gives each edge twice the value 2.x gave it:
  2.x stored every undirected edge under both `"u-v"` and `"v-u"` and put half the edge's score on each key, where 3.0
  returns one score per edge, the whole sum (on the edges `1-2, 2-3, 3-1, 3-4, 4-5`, 2.x gave `0.5, 1.5, 1.5, 3, 2`
  per key and 3.0 gives `1, 3, 3, 6, 4`). Add the two keys of 2.x to compare. Directed graphs are unchanged.
- **Centrality.** `pageRank` is a power iteration where 2.x ran the delta engine, so `iterations` can be one more or one
  fewer and scores differ in the seventh decimal place. `pageRank` on an undirected graph returns scores (each edge
  carries rank both ways), where 2.x threw "PageRank requires a directed graph". `eigenvectorCentrality` converges and
  returns scores on some graphs where 2.x threw a `ConvergenceError` (mostly directed graphs with self-loops); where both
  converge, scores agree within 1e-4. `katzCentrality` with a negative `beta` gives other scores (2.x rescaled from 0,
  not from the largest score).
- **Louvain and Leiden** visit nodes in another seeded order and stop at other partitions (on the karate club, Louvain
  now reaches modularity 0.4188 against 0.3404).
- **Label propagation.** For the same `randomSeed`, communities differ on any graph with more than one valid partition
  (a work queue, a uniform tie draw and another random generator); it stops when every label is dominant, so tie-rich
  graphs converge; in-neighbours vote on a directed graph; self-loops do not vote; a negative, NaN or infinite weight
  throws a `RangeError`. `labelPropagationSemiSupervised` draws from another random stream and renumbers the labels.
  `labelPropagationSynchronous` adds a swap guard, so a single edge settles in two passes.
- **All-pairs shortest paths** (`floydWarshall`, `floydWarshallPath`, `transitiveClosure`): the cheapest of parallel
  edges sets the distance; a node's distance to itself is 0 even with a positive self-loop; under a negative cycle every
  distance is NaN and no path is returned; a negative undirected edge is a negative cycle; a NaN or infinite weight
  throws. `allPairsShortestPath` refuses more than 5,792 nodes unless `maxNodes` is raised.
- **Link prediction.** Adamic-Adar scores agree with 2.x within 1e-9, but tied pairs rank in another order, so a `topK`
  cut can keep other pairs and the evaluation metrics can differ where a held-out edge ties a non-edge.
- **Clustering.** `modularity` is Newman's modularity over weighted degrees, where `calculateMCLModularity` ignored
  weights and summed the null model over the edges only. `spectralClustering` solves the Laplacian to a tolerance and
  gives other clusters on most graphs. `teraHAC` indexes its distances by node, where 2.x looked them up by
  `parseInt(nodeId)` and merged arbitrarily after the first merge on most graphs. `markovClustering` throws a
  `RangeError` on options and weights 2.x ran with: an `expansion` that is not a whole number of at least 1, an
  `inflation` that is not finite and above 0, a `maxIterations` that is not a whole number, and a negative, NaN or
  infinite edge weight.
- **Self-loops in community detection.** On an undirected graph with a self-loop, `girvanNewman` counts the loop twice
  in its node's degree where 2.x counted it once, so each level's modularity differs and the best level can be another
  one; `grsbm` gives another root modularity (on one small graph with a loop, 0 where 2.x gave 0.0586).
- **Flow and cuts.** `maxFlow` reports the net flow of two opposite edges on the edge it runs along, each within its
  capacity; `minSTCut` reports cut edges on graphs with numeric ids (2.x reported none); `stoerWagner` adds the weights
  of two opposite directed edges; `kargerMinCut` is seeded, so one graph gives one result, and on a graph of three or
  more components it puts every node on a side (2.x dropped the components after the first two); a source equal to the
  sink throws a `RangeError`, and a NaN weight throws. A node that is only the target of an edge is a node: flow reaches
  such a sink (2.x `edmondsKarp` on a Map-of-Maps returned no flow when the source or the sink was not a key). Cut sides
  list nodes in node order and cut edges by their source-side node, where 2.x followed the order its search met them.
- **Matching and isomorphism.** The matchings join a left node to a right one whichever way the arc points. The greedy
  matching visits left nodes in node order, so it can differ in size. The maximum matching keeps the 2.x tie order --
  left nodes in the order a breadth-first walk reaches them, neighbours in the order their edges were added -- so it
  picks the same pairs as 2.x on a graph whose edges were added in the same order; an isomorphism `edgeMatch` is offered every pair of corresponding edges, self-loops included, and directed
  graphs are checked on in-arcs too. An isomorphism's mapping and a matching's pairs come as arrays indexed by node, so
  code that walks them meets the pairs in node order; 2.x returned a Map filled in the order its search found them.
  The 2.x `findAllMappings` option is gone; with it set, 2.x `isGraphIsomorphic` answered false for every pair.
- **k-core** does not count a self-loop toward its node's core number, and refuses a directed graph.
- **Delta PageRank.** `DeltaPageRank` and `PriorityDeltaPageRank` run over a frozen snapshot: `update()` no longer reads
  a graph changed after construction.

## Sampled closeness

`closenessCentrality` takes the two sampling options `betweennessCentrality` has: `sources`, a list of node indices to
run from (a duplicate runs twice), or `k`, how many distinct sources to draw. The draw is the one betweenness makes, so
the same `(n, k)` draws the same sources every time; with both, `k` must equal `sources.length`, and a bad value throws a
`RangeError`. The result carries `sourcesUsed`, the number of sources run (`nodeCount` for the exact score).

A sampled score is each node's closeness from its distances TO the sampled sources (over in-arcs on a directed graph),
with the same formula as the exact score and no extrapolation: `1 / score` is the summed distance to the sources the
node reaches. Multiply a plain score by `k / n` for the Eppstein-Wang estimate of the exact score; a `harmonic` score needs `n / k`
instead, and a `normalized` one needs no factor. A sample of every node gives the
exact scores. `nodeClosenessCentrality` takes no sampling options.

On the accelerator seam, `AlgorithmAccelerator.closenessCentrality` takes `ClosenessAcceleratorOptions` (`weighted`,
and `sources` for a sampled run) and resolves to a `ClosenessResultLike`, which adds `sourcesUsed`. The dispatcher hands a
sampled call to the accelerator only on an undirected graph, with the sources already drawn.
