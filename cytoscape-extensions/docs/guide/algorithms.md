# Algorithms

After `cytoscape.use(graphtyCytoscape)`, every Cytoscape collection and the core have 63 algorithm methods named `graphty` plus the algorithm's name: `graphtyPageRank`, `graphtyLouvain`, `graphtyDijkstra`. Each one runs a graphty algorithm on the collection and returns a result keyed by element.

This Node script (save it as `rank.mjs`) prints one node's PageRank:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
// directed is false: the karate club's edges have no direction
const { directed } = await cy.graphtyDataset("karate");

const r = cy.graphtyPageRank({ directed, field: "rank" });
console.log(r.rank("#1")); // 0.05287...
console.log(cy.$("#1").data("rank")); // the same number, written by field
```

`cy.graphtyDataset("karate")` adds Zachary's karate club, 34 nodes with ids `"0"` to `"33"`, and resolves to `{ elements, directed }`. Every method reads edges as undirected unless you pass `directed: true`, so passing on the `directed` that `cy.graphtyDataset()` or `cy.graphtyGenerate()` gives you keeps a directed graph directed. `field: "rank"` writes each node's PageRank into `data("rank")`, where a stylesheet can map it to a size. In a browser, pass a `container` instead of `headless: true`, and call `cy.graphtyDataset()` from an `async` function rather than awaiting it at the top level of your entry module ([why](./troubleshooting#a-top-level-await-never-finishes)).

## Choosing an algorithm

| You want to                      | Call                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Find the important nodes         | `graphtyPageRank`, `graphtyDegreeCentrality`, `graphtyBetweennessCentrality` |
| Find groups of linked nodes      | `graphtyLouvain`, `graphtyLeiden`, `graphtyConnectedComponents`              |
| Find a route between two nodes   | `graphtyDijkstra`, `graphtyAStar`                                            |
| Connect every node at least cost | `graphtyKruskalMST`, `graphtyPrimMST`                                        |
| Find a bottleneck or weakest cut | `graphtyMaxFlow`, `graphtyMinSTCut`, `graphtyStoerWagner`                    |
| Guess which links are missing    | `graphtyTopAdamicAdarCandidatesForNode` ([below](#predicting-links))         |

Three recipes walk through the first three rows: [color by PageRank](./recipes/color-by-pagerank), [find communities](./recipes/find-communities) and [highlight a shortest path](./recipes/highlight-shortest-path). The [algorithm reference](../reference/algorithms) says what each method computes.

## Calling an algorithm

Like Cytoscape's built-ins, each method is synchronous, takes one options object and returns its result. `cy.graphtyX(options)` is the same call as `cy.elements().graphtyX(options)`.

The graph is the calling collection: its nodes, and those of its edges whose two ends are both in it. To run on part of a graph, include the edges: `part.union(part.connectedEdges()).graphtyDegreeCentrality()`.

The exported `ALGORITHM_NAMES` lists the 63 methods. Importing the package adds their types to Cytoscape's `Core` and `Collection`.

## Results

You read a result one element at a time, through accessors such as `score(node)`, `cluster(node)` and `distanceTo(node)`. The accessors take a node or edge, or a selector whose first match they use. For an element outside the collection they return `undefined`, except the path accessors, which treat it as unreachable.

Most methods return one of three shapes. This script shows one of each, a score, a partition and paths from a root:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

const ranks = cy.graphtyPageRank();
console.log(ranks.score("#33").toFixed(3)); // "0.101"

// An array of node collections, one per community, like cy.elements().components()
const groups = cy.graphtyLouvain();
console.log(groups.length, groups.cluster("#0"), groups.modularity.toFixed(2)); // 4 0 "0.42"

const routes = cy.graphtyDijkstra({ root: "#0" });
console.log(routes.distanceTo("#33")); // 2
const path = routes.pathTo("#33"); // node, edge, node, edge, node
console.log(path.nodes().map((n) => n.id())); // ["0", "31", "33"]
```

Every `...Centrality` method except `graphtyNodeClosenessCentrality` returns a score result like PageRank's, with `score(ele)` and an accessor named after Cytoscape's built-in where there is one, such as `rank(node)` here or `betweenness(node)`. Every `...Components` method and every community method except `graphtyHierarchicalClustering` returns a partition like Louvain's. `graphtyBellmanFord` returns paths like Dijkstra's, plus `hasNegativeWeightCycle`; when it is `true` the distances and paths are meaningless, so read it first. Undirected, a single negative edge is a negative cycle.

The other shapes also follow Cytoscape's built-ins. `graphtyAStar` and `graphtyBidirectionalDijkstra` return `{ found, distance, path }` like `aStar()`. The searches return `{ path, found }` like `bfs()`, plus `depth(node)` and `parent(node)`. The spanning trees return one collection like `kruskal()`, with `totalWeight`. The cuts return `{ value, cut, partitionFirst, partitionSecond }`: the cut's total weight, the edges that cross it, and the nodes on each side, with the source on `partitionFirst` for a flow or s-t cut. Each method in the [algorithm reference](../reference/algorithms) names its return type, and the result types are defined at the end of that page.

A path from `pathTo()`, `path(from, to)` or the `path` of `graphtyAStar` is one collection that alternates node, edge, node. A search's `path` is different: it lists the visited nodes in visit order, each after the tree edge that reached it.

### Predicting links

`graphtyTopAdamicAdarCandidatesForNode` ranks the nodes not linked to `root` by their shared neighbors, a rare shared neighbor counting more:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

const top = cy.graphtyTopAdamicAdarCandidatesForNode({ root: "#33", topK: 3 });
console.log(top.map((link) => `${link.target.id()} ${link.score.toFixed(2)}`));
// ["2 4.72", "0 2.71", "1 2.25"]
```

The `...Prediction` methods, such as `graphtyCommonNeighborsPrediction`, list every unlinked pair. On an undirected graph each pair appears twice, once in each order with the same score. With `directed: true` each pair appears in one order only, with the node that comes first in the collection as `source`; to score both orders, use the `...ForPairs` or `...CandidatesForNode` methods.

To measure how well a score predicts links on your graph, see `graphtyEvaluateAdamicAdar` in [the reference](../reference/algorithms#graphtyevaluateadamicadar).

## Writing results onto elements

`field` writes the value each element gets from the result into its data, so a stylesheet can map it with `mapData()` or match it with a selector like `node[community = 2]`. What is written depends on the [shape of the result](#results):

| Shape                                     | Value written to each node                               |
| ----------------------------------------- | -------------------------------------------------------- |
| Scores (PageRank, centralities)           | What `score(node)` returns                               |
| Partition (Louvain, components)           | The cluster number, the node's position in the array     |
| Paths from a root (Dijkstra, BellmanFord) | Distance from `root`; `Infinity` when unreachable        |
| Search (BFS, DFS)                         | Depth in hops from `root`; `NaN` when not visited        |
| Cut (MinSTCut, MaxFlow, StoerWagner)      | `0` for `partitionFirst`, `1` for `partitionSecond`      |
| `IsBipartite`                             | The same as Cut; nothing when the graph is not bipartite |

`graphtyEdgeBetweennessCentrality` writes its score onto each edge instead.

The values are written in one `cy.batch()`, so the style updates once, but each write fires its own `data` event.

## Common options

Four options are shared, but not every method takes all of them:

- `directed` (default `false`) reads each edge as going from source to target. Every method takes it, but the four directed-only methods (`graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`, `graphtyCondensation`, `graphtyDeltaPageRank`) default to `true` and throw on `directed: false`, and the undirected-only ones, such as `graphtyLouvain`, `graphtyLeiden`, `graphtyPrimMST` and `graphtyConnectedComponents`, throw on `directed: true`.
- `weight` works on the methods that read edge weights, such as Dijkstra and Louvain. It names the edge data field that holds the weight, or is a function of the edge; without it every edge weighs 1. A method that reads no weights, such as breadth-first search, throws when you pass it.
- `field` works on the methods with one value per element: scores, partitions, distances, search depths and cuts. It writes that value into `data(field)` ([above](#writing-results-onto-elements)). The other methods throw when you pass it.
- `gpu` works only on the [`...Async` methods](#async-methods-and-the-gpu).

The [algorithm reference](../reference/algorithms) lists each method's own options, such as `dampingFactor` or `resolution`, with their defaults. An option the method does not take throws: `graphtyLouvain({ resoluton: 2 })` throws an error that names `resoluton` and lists the options Louvain takes.

With `weight` as a field name, an edge whose field is missing, not a number, `NaN` or infinite weighs 1.

## Naming nodes

Options that name nodes take a selector or a collection, as Cytoscape's built-ins do. An option that takes one node uses the first match. The option name says the node's role:

| Option                       | Role                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `root`, `goal`               | Where a search or path starts, and where it should end                                                             |
| `source`, `sink`             | The two ends of a maximum flow or minimum s-t cut                                                                  |
| `source`, `target`           | The node pair a link-prediction score is for                                                                       |
| `left`, `right`              | The two sides of a bipartite matching (inferred when absent)                                                       |
| `candidates`                 | The nodes to consider linking to `root`                                                                            |
| `sources`                    | Closeness and betweenness sample from these nodes only                                                             |
| `personalization`            | Personalized PageRank's teleport set, or a function `node => number`                                               |
| `clusters`, `seeds`          | Clusters for modularity and semi-supervised label propagation                                                      |
| `pairs`, `edges`, `nonEdges` | Arrays of `[a, b]` node pairs for link prediction                                                                  |
| `other`                      | The graph an isomorphism test compares with: a collection, an array of elements, or a selector over the whole core |

A required option that is missing or matches nothing throws. So does `personalization` when it selects no node or its function gives no node a positive weight. `clusters` and `seeds` throw only when they match no node at all; a selection in the list that matches nothing is skipped.

`clusters` and `seeds` take a list of selections, one per cluster; a partition result, which is such a list; or the name of a node data field holding each node's cluster. So `cy.graphtyModularity({ clusters: cy.graphtyLouvain() })` works. A Louvain or Leiden result's `modularity` is measured at the run's `resolution` (default 1); pass the same `resolution` to `graphtyModularity` to get the same number.

## Errors

An error thrown by a method call has a message that starts with the method's name, such as `graphtyDijkstra: the root option is required`. The algorithm's own errors keep their `code` and get the same prefix. A graph of the wrong direction names the fix: `graphtyConnectedComponents({ directed: true })` throws `graphtyConnectedComponents: needs an undirected graph; leave out directed: true, or call graphtyWeaklyConnectedComponents`.

## Async methods and the GPU

The synchronous methods always run on the CPU. The 17 algorithms in the exported `ASYNC_ALGORITHM_NAMES` also have an `...Async` twin, such as `graphtyPageRankAsync`. It takes the same options and resolves to the same result plus `backend`: `backend.ran` is `"gpu"` or `"cpu"`, and `backend.reason` says why the CPU ran. Its `gpu` option is `"auto"` (the GPU when there is one), `"off"` or `"require"` (throw when there is none). [WebGPU](./webgpu) explains how the package finds a device.

## Try it

- [Centrality](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--centrality)
- [Communities](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--communities)
- [Paths and trees](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--paths-and-trees)
- [Structure](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--structure)
- [Flows and cuts](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--flows-and-cuts)
- [Link prediction](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--link-prediction)

## See also

- [Algorithm reference](../reference/algorithms): every method, option and default.
- [Migrating from Cytoscape's built-ins](./migrating-from-cytoscape): where results differ from Cytoscape's own algorithms.
- [Calling graphty functions directly](./snapshot): the @graphty/algorithms functions this package does not wrap.
