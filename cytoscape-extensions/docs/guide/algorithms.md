# Algorithms

After `cytoscape.use(graphtyCytoscape)`, every Cytoscape collection and the core have 63 algorithm methods named `graphty` plus the algorithm's name: `graphtyPageRank`, `graphtyLouvain`, `graphtyDijkstra`. Each one runs a graphty algorithm on the collection and returns a result keyed by element.

This Node script (save it as `rank.mjs`) prints one node's PageRank:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

const r = cy.graphtyPageRank({ field: "rank" });
console.log(r.rank("#1")); // 0.05287...
console.log(cy.$("#1").data("rank")); // the same number, written by field
```

`cy.graphtyDataset("karate")` adds Zachary's karate club, 34 nodes with ids `"0"` to `"33"`. `field: "rank"` writes each node's PageRank into `data("rank")`, where a stylesheet can map it to a size. In a browser, pass a `container` instead of `headless: true`, and await `cy.graphtyDataset()` inside an `async` function, not at the top level of your entry module ([why](./getting-started#what-each-step-does)).

## Choosing an algorithm

| You want to                      | Call                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Find the important nodes         | `graphtyPageRank`, `graphtyDegreeCentrality`, `graphtyBetweennessCentrality` ([recipe](./recipes/color-by-pagerank)) |
| Find groups of linked nodes      | `graphtyLouvain`, `graphtyLeiden` ([recipe](./recipes/find-communities)), `graphtyConnectedComponents`               |
| Find a route between two nodes   | `graphtyDijkstra`, `graphtyAStar` ([recipe](./recipes/highlight-shortest-path))                                      |
| Connect every node at least cost | `graphtyKruskalMST`, `graphtyPrimMST`                                                                                |
| Find a bottleneck or weakest cut | `graphtyMaxFlow`, `graphtyMinSTCut`, `graphtyStoerWagner`                                                            |
| Guess which links are missing    | `graphtyTopAdamicAdarCandidatesForNode`, `graphtyAdamicAdarPrediction` ([below](#predicting-links))                  |

The [algorithm reference](../reference/algorithms) says what each method computes.

## Calling an algorithm

Like Cytoscape's built-ins, each method is synchronous, takes one options object and returns its result. `cy.graphtyX(options)` is the same call as `cy.elements().graphtyX(options)`.

The graph is the calling collection: its nodes, and those of its edges whose two ends are both in it. To run on part of a graph, include the edges: `part.union(part.connectedEdges()).graphtyDegreeCentrality()`.

The exported `ALGORITHM_NAMES` lists the 63 methods. Importing the package adds their types to Cytoscape's `Core` and `Collection`.

## Common options

Every method takes four common options. `directed` (default `false`) reads each edge as going from source to target. `weight` names the edge data field that holds the weight, or is a function of the edge; without it every edge weighs 1. `field` writes each element's value into `data(field)` ([below](#writing-results-onto-elements)). `gpu` applies only to the [`...Async` methods](#async-methods-and-the-gpu).

`directed` defaults to `true` for the four algorithms defined only on directed graphs: `graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`, `graphtyCondensation` and `graphtyDeltaPageRank`. `cy.graphtyDataset()` and `cy.graphtyGenerate()` resolve to `{ elements, directed }` for the graph they added; pass it on. The karate club is undirected.

With `weight` as a field name, an edge whose field is missing, not a number, `NaN` or infinite weighs 1. An algorithm that reads no weights, such as breadth-first search or betweenness, throws when you pass `weight`.

Each method's own options, such as `dampingFactor` or `resolution`, go to the @graphty/algorithms function unchanged; the reference lists them, and an option the method does not take throws. This package pins these defaults; every other default comes from @graphty/algorithms: `maxIterations: 100` for PageRank, personalized and delta PageRank, eigenvector, Katz, HITS and the three label propagations; `tolerance: 1e-6` for all of those but the label propagations; `dampingFactor: 0.85` for the three PageRanks; `alpha: 0.1` and `beta: 1` for Katz. With `priority: true`, `graphtyDeltaPageRank` counts `maxIterations` in single node updates, not rounds, so it has no limit unless you pass one.

## Naming nodes

Options that name nodes take a selector or a collection, as Cytoscape's built-ins do. An option that takes one node uses the first match. The option name says the node's role:

| Option                       | Role                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| `root`, `goal`               | Where a walk or path starts, and where it should end                 |
| `source`, `sink`             | The two ends of a maximum flow or minimum s-t cut                    |
| `source`, `target`           | The node pair a link-prediction score is for                         |
| `left`, `right`              | The two sides of a bipartite matching (inferred when absent)         |
| `candidates`                 | The nodes to consider linking to `root`                              |
| `sources`                    | Closeness and betweenness sample from these nodes only               |
| `personalization`            | Personalized PageRank's teleport set, or a function `node => number` |
| `clusters`, `seeds`          | Clusters for modularity and semi-supervised label propagation        |
| `pairs`, `edges`, `nonEdges` | Arrays of `[a, b]` node pairs for link prediction                    |
| `other`                      | The collection an isomorphism test compares with                     |

A required option that is missing or matches nothing throws. So does `personalization` when it selects no node or its function gives no node a positive weight. The optional ones do not throw on an empty match, so check a misspelled selector yourself: `candidates` gives an empty list, `sources` gives every closeness or betweenness score 0, `left` or `right` leaves that side empty, so nothing is matched, and `clusters` and `seeds` skip a selection that matches no node or a field no node holds.

`clusters` and `seeds` take a list of selections, one per cluster; a partition result, which is such a list; or the name of a node data field holding each node's cluster. So `cy.graphtyModularity({ clusters: cy.graphtyLouvain() })` and, after `graphtyLouvain({ field: "community" })`, `cy.graphtyModularity({ clusters: "community" })` give the same number. The `modularity` of a Louvain or Leiden result is measured at the run's `resolution` (default 1): after `graphtyLouvain({ resolution: 1.2 })`, pass `resolution: 1.2` to `graphtyModularity` too, or the numbers differ.

## Results

Results are keyed by element. Accessors take a node or edge, or a selector whose first match they use, and return `undefined` for an element outside the collection. The path accessors are the exception: `distanceTo()` and `distance()` return `Infinity` and `pathTo()` an empty collection, the same as for an unreachable node.

Each result has one of these shapes. Method names are given without their `graphty` prefix: `PageRank` is `graphtyPageRank`.

- **Scores** (the three PageRanks, every `...Centrality` but `NodeClosenessCentrality`, `Hits`, `KCoreDecomposition`, `TriangleCount`): `score(ele)`, plus the accessor Cytoscape's built-in uses: `rank`, `degree`, `hub` and `authority`, `closeness`, `betweenness` and `betweennessNormalized`. K-core adds `core(k)`, the nodes of the k-core; triangle count adds `coefficient(node)`. PageRank, eigenvector, Katz and HITS add `iterations` and `converged`.
- **Partition** (every `...Components` method, `Condensation`, `Louvain`, `Leiden`, the three `LabelPropagation...` methods, and every `...Clustering` method but `HierarchicalClustering`, plus `GirvanNewman`, `TeraHAC`, `Grsbm`): an array of node collections, one per cluster, like Cytoscape's `components()`, so `communities.forEach((nodes, i) => ...)` visits each cluster. Plus `cluster(node)` and, where the algorithm reports them, `modularity`, `iterations`, `converged`.
- **Paths from a root** (`Dijkstra`, `BellmanFord`): `distanceTo(node)` (`Infinity` when unreachable) and `pathTo(node)`, like Cytoscape's `dijkstra()`. Bellman-Ford adds `hasNegativeWeightCycle`.
- **One path** (`AStar`, `BidirectionalDijkstra`): `{ found, distance, path }`, like Cytoscape's `aStar()`.
- **All pairs** (`AllPairsShortestPath`): `distance(from, to)`, `path(from, to)` and `hasNegativeWeightCycle`, like Cytoscape's `floydWarshall()`.
- **Walk** (`BreadthFirstSearch`, `DepthFirstSearch`, `DirectionOptimizedBfs`): `{ path, found }` like Cytoscape's `bfs()`, plus `depth(node)` and `parent(node)`.
- **Tree** (`KruskalMST`, `PrimMST`): one collection of the tree's nodes and edges, like Cytoscape's `kruskal()`, with `totalWeight`.
- **Cut** (`MaxFlow`, `MinSTCut`, `StoerWagner`, `KargerMinCut`): `{ value, cut, partitionFirst, partitionSecond }`. That is Cytoscape's `kargerStein()` result with `partition1` and `partition2` renamed, plus `value`. `MaxFlow` adds `flow(edge)`; its `value` is the maximum flow.
- **Link prediction**: the `...Prediction` and `...CandidatesForNode` methods return an array of `{ source, target, score }`, best first. The `...Score` methods return one number for the `source`, `target` pair, and the `...ForPairs` methods one number per entry of `pairs`. `EvaluateCommonNeighbors`, `EvaluateAdamicAdar` and `CompareAdamicAdarWithCommonNeighbors` return quality metrics ([below](#predicting-links)).
- **Other** (`HasCycle`, `TopologicalSort`, `IsBipartite`, `IsGraphIsomorphic`, `FindAllIsomorphisms`, `Modularity`, `HierarchicalClustering`, `MaximumBipartiteMatching`, `GreedyBipartiteMatching`, `Degrees`, `NodeClosenessCentrality`): a boolean, a number, a node collection (`null` from a topological sort of a cyclic graph), or accessors such as `mapping(node)`, `mate(node)`, `cut(height)`, `indegree(node)`.

A path from `pathTo()`, `path(from, to)` or the `path` of a one-path result is one collection that alternates node, edge, node. A walk's `path` is different: it lists the visited nodes in visit order, each after the tree edge that reached it. With `order: "post"` it starts with an edge and ends with the root.

### Direction changes the answer

`directed: false`, the default, reads each edge both ways. Pass `directed: true` for the textbook answer on a directed graph:

- Bellman-Ford and all-pairs shortest paths: undirected, a negative edge is a negative cycle. When `hasNegativeWeightCycle` is `true` the distances are meaningless, and `pathTo()` on a node the cycle reaches throws an error with code `E_BAD_PATH`. Check the flag before you walk a path.
- `graphtyMaxFlow` and `graphtyMinSTCut`: undirected, each edge carries its capacity both ways. Arcs `s -> t` (capacity 3) and `t -> s` (capacity 2) give a maximum flow of 5, and 3 with `directed: true`.
- Link prediction: directed, a common neighbor of `(u, v)` is a node `w` with arcs `u -> w` and `w -> v`, so `(u, v)` and `(v, u)` score differently.

On an undirected graph, `graphtyCommonNeighborsPrediction` and `graphtyAdamicAdarPrediction` list each pair both ways (`2-33` and `33-2`), and `topK` counts both. The `...CandidatesForNode` methods list each candidate once, with `root` as the source.

### Predicting links

To check how well link prediction works on your graph, hold out some edges: remove them from the graph and pass their two ends as `edges`. Pass node pairs that never had an edge as `nonEdges`. A pair is `[a, b]`, each a node or a selector.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

// Pairs with no edge, collected before any edge is removed
const nodes = cy.nodes();
const nonEdges = [];
for (let i = 0; i < nodes.length && nonEdges.length < 8; i++) {
    for (let j = i + 1; j < nodes.length && nonEdges.length < 8; j++) {
        if (nodes[i].edgesWith(nodes[j]).empty()) nonEdges.push([nodes[i], nodes[j]]);
    }
}

// Hold out every tenth edge
const heldOut = cy.edges().filter((edge, i) => i % 10 === 0);
const edges = heldOut.map((edge) => [edge.source(), edge.target()]);
heldOut.remove();

const { adamicAdar, commonNeighbors } = cy.graphtyCompareAdamicAdarWithCommonNeighbors({ edges, nonEdges });
console.log(adamicAdar); // { precision: 0.8, recall: 1, f1Score: 0.888..., auc: 0.875 }
console.log(commonNeighbors.auc); // 0.9375

const top = cy.graphtyTopAdamicAdarCandidatesForNode({ root: "#0", topK: 3 });
console.log(top.map((link) => link.target.id())); // ["1", "33", "32"]
```

Node 1 comes first: its edge to node 0 was held out. `auc` is the chance that a held-out edge scores at least as high as a non-edge, and `precision`, `recall` and `f1Score` are taken at the cut through the ranked pairs with the best F1. A tie counts in the held-out edge's favor, so a score that ties often reads too high: if every pair scores 0, every metric is 1. Common neighbors ties more often than Adamic-Adar, which is why it wins above; counting a tie as half, the two are about even, 0.781 for common neighbors and 0.773 for Adamic-Adar.

## Writing results onto elements

`field` writes the value each element gets from the result into its data, so a stylesheet can map it with `mapData()` or match it with a selector like `node[community = 2]`. What is written depends on the shape:

| Shape             | Value written to each node                               |
| ----------------- | -------------------------------------------------------- |
| Scores            | What `score(node)` returns                               |
| Partition         | The cluster number, the node's position in the array     |
| Paths from a root | Distance from `root`; `Infinity` when unreachable        |
| Walk              | Depth in hops from `root`; `NaN` when not visited        |
| Cut               | `0` for `partitionFirst`, `1` for `partitionSecond`      |
| `IsBipartite`     | The same as Cut; nothing when the graph is not bipartite |

`graphtyEdgeBetweennessCentrality` writes its score onto each edge instead. Every other method has no value per element and throws when you pass `field`; [the reference](../reference/algorithms) marks each one "Takes no `field`".

The values are written in one `cy.batch()`, so the style updates once, but each write fires its own `data` event.

## Errors

An error thrown by a method call has a message that starts with the method's name, such as `graphtyDijkstra: the root option is required`. The algorithm's own errors keep their `code` and get the same prefix. A graph of the wrong direction names the fix: `graphtyConnectedComponents({ directed: true })` throws `graphtyConnectedComponents: needs an undirected graph; leave out directed: true, or call graphtyWeaklyConnectedComponents`.

An accessor of a result throws without that prefix: `path()` after `graphtyAllPairsShortestPath({ paths: false })` throws `allPairsShortestPath: pass paths: true to walk shortest paths`.

## Async methods and the GPU

The synchronous methods always run on the CPU. The 17 algorithms in the exported `ASYNC_ALGORITHM_NAMES` also have an `...Async` twin, such as `graphtyPageRankAsync`. It takes the same options and resolves to the same result plus `backend`: `backend.ran` is `"gpu"` or `"cpu"`, and `backend.reason` says why the CPU ran. Its `gpu` option is `"auto"` (the GPU when there is one), `"off"` or `"require"` (throw when there is none). [WebGPU](./webgpu) explains how the package finds a device.

## Where the numbers differ from Cytoscape's built-ins

PageRank, betweenness, closeness, degree and depth-first order follow different conventions from Cytoscape's built-ins. [Migrating from Cytoscape's built-ins](./migrating-from-cytoscape) lists each difference and the options that give Cytoscape's numbers. To call an @graphty/algorithms function this package does not wrap, see [Calling graphty functions directly](./snapshot).

## Try it

These demos run the methods on a live Cytoscape graph: [Centrality](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--centrality), [Communities](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--communities), [Paths and trees](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--paths-and-trees), [Structure](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--structure), [Flows and cuts](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--flows-and-cuts) and [Link prediction](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--link-prediction).

## See also

- [Algorithm reference](../reference/algorithms): every method, option and default.
