# @graphty/cytoscape

Every layout in [@graphty/layout](https://graphty.app/docs/layout/api/generated/) as a
[Cytoscape.js](https://js.cytoscape.org/) 3.x layout extension (thirteen static layouts and the
ForceAtlas2, Fruchterman-Reingold and spring-electrical force simulations), and every algorithm in
@graphty/algorithms as a Cytoscape collection and core method.

Not published yet (the package is private while its API settles).

## Example

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape";

cytoscape.use(graphtyCytoscape); // registers every "graphty-<name>" layout

const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "c" } },
        { data: { source: "a", target: "b", w: 2 } },
        { data: { source: "b", target: "c", w: 1 } },
    ],
});

cy.layout({ name: "graphty-forceatlas2", animate: true, weight: "w" }).run();

const pr = cy.elements().graphtyPageRank({ field: "rank" }); // also writes data("rank") for styles
pr.rank("#a");
cy.elements().graphtyDijkstra({ root: "#a", weight: "w" }).pathTo("#c"); // node, edge, node, ...
cy.graphtyLouvain(); // the core method runs over cy.elements(): an array of node collections
```

## Layouts

| Name                           | Kind       | Options of its own                                                                                                                                 |
| ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graphty-random`               | static     | `seed`                                                                                                                                             |
| `graphty-circular`             | static     |                                                                                                                                                    |
| `graphty-spiral`               | static     | `resolution`, `equidistant`                                                                                                                        |
| `graphty-grid`                 | static     | `columns`                                                                                                                                          |
| `graphty-shell`                | static     | `nlist`: the shells, innermost first, each a selector or a collection                                                                              |
| `graphty-bipartite`            | static     | `top`: selector or collection of the first line (default: every other node); `align`, `aspectRatio`                                                |
| `graphty-multipartite`         | static     | `subsets`: a node data field naming each node's layer (default `"subset"`), or the layers as selectors or collections; `align`                     |
| `graphty-bfs`                  | static     | `start`: selector or collection of the start node (default the first node); `align`. Throws on a disconnected graph                                |
| `graphty-radial`               | static     | `root`: selector or collection of the centre node (default the node with the most neighbours)                                                      |
| `graphty-planar`               | static     | Throws when the graph is not planar                                                                                                                |
| `graphty-spectral`             | static     | `seed`                                                                                                                                             |
| `graphty-kamada-kawai`         | static     | `weight`. Memory grows with the square of the node count                                                                                           |
| `graphty-arf`                  | static     | `seed`, `scaling`, `a`, `maxIter`                                                                                                                  |
| `graphty-forceatlas2`          | simulation | `weight`, `maxIter` (100), `scalingRatio`, `gravity`, `strongGravity`, `linlog`, `distributedAction`, `jitterTolerance`                            |
| `graphty-fruchterman-reingold` | simulation | `weight`, `iterations` (50), `k`                                                                                                                   |
| `graphty-spring-electrical`    | simulation | Needs a GPU (there is no CPU implementation; see [WebGPU](#webgpu)): `springLength`, `springCoefficient`, `gravity`, `dragCoefficient`, `timeStep` |

Any option not listed in the next section is passed to the @graphty/layout function of the same
name unchanged.

## Options every layout takes

| Option                                                                                | Default      | Meaning                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boundingBox`                                                                         | the viewport | `{ x1, y1, w, h }` or `{ x1, y1, x2, y2 }`. The result is scaled so the node farthest from the centre sits half the box's shorter side away. A headless core's viewport is 1 x 1, so pass a box there |
| `fit`, `padding`                                                                      | `true`, `30` | Fit the viewport to the result                                                                                                                                                                        |
| `animate`                                                                             | `false`      | Static layouts: any truthy value tweens to the result. Simulations: `true` draws every frame; `"end"` computes, then tweens                                                                           |
| `animationDuration`, `animationEasing`, `animateFilter`, `spacingFactor`, `transform` |              | As in Cytoscape's built-in layouts                                                                                                                                                                    |
| `ready`, `stop`                                                                       |              | Called on `layoutready` and `layoutstop`                                                                                                                                                              |
| `weight`                                                                              | none         | Edge data field holding the weight; a missing or non-numeric value counts as 1                                                                                                                        |
| `seed`                                                                                | random       | Seed of every random draw, for repeatable results                                                                                                                                                     |
| `dim`                                                                                 | `2`          | `3` runs the layout in 3D and projects the result onto the x-y plane                                                                                                                                  |
| `randomize`                                                                           | `true`       | Simulations: start from random positions in the box, or (`false`) from the current ones                                                                                                               |
| `refresh`                                                                             | `1`          | Simulations with `animate: true`: iterations per frame                                                                                                                                                |
| `gpu`                                                                                 | `"auto"`     | Simulations: `"auto"`, `"off"` or `"require"`; see [WebGPU](#webgpu)                                                                                                                                  |
| `accelerator`                                                                         | none         | Simulations: an accelerator you built and own (`createAccelerator` in @graphty/webgpu-graph-algorithms); overrides `gpu`; `null` forces the CPU                                                       |

Locked nodes never move. The simulations also treat them as fixed while computing, so the rest of
the graph arranges itself around them; with a locked node present the simulation keeps the
locked node's pixel frame instead of rescaling into the box. Static layouts compute as if every
node were free and then leave locked nodes where they are.

Compound parent nodes are not laid out; Cytoscape sizes them from their children.

## Events

`layoutstart`, `layoutready` and `layoutstop`, in that order, on the layout and on the core. An
asynchronous run (a simulation on a GPU) that fails emits `layouterror`, whose
handler receives the error as its second argument, followed by `layoutstop`. A synchronous
failure (a non-planar graph for `graphty-planar`, a selector that matches nothing) throws from
`run()`.

## Algorithms

`cytoscape.use(graphtyCytoscape)` adds 63 methods, each named `graphty` plus the @graphty/algorithms
function name (`graphtyPageRank`, `graphtyLouvain`, ...), to every collection and to the core. The
prefix keeps them apart from Cytoscape's built-ins of the same name. `ALGORITHM_NAMES` lists them,
and importing the package adds their types to Cytoscape's `Collection` and `Core`.

They follow Cytoscape's built-in algorithms:

- **Scope** is the calling collection: its nodes, and its edges whose two ends are in it.
  `cy.graphtyX(o)` is `cy.elements().graphtyX(o)`.
- **Synchronous**, one options object, the result returned.
- **`directed`** (default `false`) reads edges as source to target. Algorithms defined only for
  directed graphs (`graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`,
  `graphtyCondensation`, `graphtyDeltaPageRank`) default to `true`.
- **`weight`** is an edge data field or a function of the edge (`edge => number`), as the
  built-ins take it; a missing or non-numeric value counts as 1. Without it every edge weighs 1.
  An algorithm that reads no weights throws when given one, rather than ignoring it.
- **Nodes** are named by a selector or a collection: `root`, `goal`, `source`, `sink`, `target`,
  `left`, `right`, `candidates`, `sources`. Sets of nodes (`personalization`) take a selection or
  a function of the node; clusters (`clusters`, `seeds`) take a list of selections, a partition
  result, or a node data field.
- **Results are keyed by element**: accessors that take a node (or edge) or a selector, and
  collections. Nothing comes back as an index array.
- **`field`** writes each element's value (what `score` or `cluster` returns) into
  `data(field)`, in one batch, so a stylesheet can map it: `width: "mapData(rank, 0, 1, 10, 60)"`.
- **Other options** go to the @graphty/algorithms function unchanged (`dampingFactor`, `resolution`,
  `maxIterations`, `randomSeed`, ...).
- **Errors throw**: a required node option missing or matching nothing, a weight given to an
  algorithm that ignores weights, and the algorithm's own errors (an undirected-only algorithm on
  `directed: true`, a negative cycle).

### Result shapes

| Shape             | Methods                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | What it holds                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scores            | `graphtyPageRank`, `graphtyPersonalizedPageRank`, `graphtyDeltaPageRank` (`rank`), `graphtyDegreeCentrality` (`degree`), `graphtyEigenvectorCentrality`, `graphtyKatzCentrality`, `graphtyHits` (`hub`, `authority`), `graphtyClosenessCentrality` (`closeness`), `graphtyBetweennessCentrality` (`betweenness`, `betweennessNormalized`), `graphtyEdgeBetweennessCentrality` (per edge), `graphtyKCoreDecomposition` (`core(k)`), `graphtyTriangleCount` (`coefficient`)                                       | `score(ele)`, the Cytoscape-named accessor in brackets, and the run's `iterations` / `converged` where it has them                                                                       |
| Partition         | `graphtyConnectedComponents`, `graphtyWeaklyConnectedComponents`, `graphtyStronglyConnectedComponents`, `graphtyCondensation`, `graphtyLouvain`, `graphtyLeiden`, `graphtyLabelPropagation`, `graphtyLabelPropagationSynchronous`, `graphtyLabelPropagationSemiSupervised`, `graphtyGirvanNewman`, `graphtyMarkovClustering`, `graphtySpectralClustering`, `graphtyTeraHAC`, `graphtyGrsbm`, `graphtySyncClustering`                                                                                            | An array of node collections, one per cluster, as Cytoscape's `components()` and `markovClustering()` return, plus `cluster(node)` and the run's `modularity`, `iterations`, `converged` |
| Paths from a root | `graphtyDijkstra`, `graphtyBellmanFord`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `distanceTo(node)`, `pathTo(node)` (node, edge, node, ...), as Cytoscape's `dijkstra`                                                                                                    |
| One path          | `graphtyAStar`, `graphtyBidirectionalDijkstra`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `{ found, distance, path }`, as Cytoscape's `aStar`                                                                                                                                      |
| All pairs         | `graphtyAllPairsShortestPath`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `distance(from, to)`, `path(from, to)`, as Cytoscape's `floydWarshall`                                                                                                                   |
| Walk              | `graphtyBreadthFirstSearch`, `graphtyDepthFirstSearch`, `graphtyDirectionOptimizedBfs`                                                                                                                                                                                                                                                                                                                                                                                                                          | `{ path, found }` as Cytoscape's `bfs` / `dfs`, plus `depth(node)` and `parent(node)`                                                                                                    |
| Tree              | `graphtyKruskalMST`, `graphtyPrimMST`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | The tree's nodes and edges as one collection, as Cytoscape's `kruskal`, with `totalWeight`                                                                                               |
| Cut               | `graphtyMaxFlow` (`flow(edge)`), `graphtyMinSTCut`, `graphtyStoerWagner`, `graphtyKargerMinCut`                                                                                                                                                                                                                                                                                                                                                                                                                 | `{ value, cut, partitionFirst, partitionSecond }`, as Cytoscape's `kargerStein`                                                                                                          |
| Other             | `graphtyHasCycle` (boolean), `graphtyTopologicalSort` (node collection, or null when cyclic), `graphtyIsBipartite`, `graphtyIsGraphIsomorphic` / `graphtyFindAllIsomorphisms` (`other`: the collection to compare with; `mapping(node)`), `graphtyModularity` (number), `graphtyHierarchicalClustering` (`cut(height)`), `graphtyMaximumBipartiteMatching` / `graphtyGreedyBipartiteMatching` (`mate(node)`, `size`), `graphtyDegrees` (`indegree`, `outdegree`), `graphtyNodeClosenessCentrality` (number)     |                                                                                                                                                                                          |
| Link prediction   | `graphtyCommonNeighborsScore`, `graphtyAdamicAdarScore` (`source`, `target`: a number), `graphtyCommonNeighborsPrediction`, `graphtyAdamicAdarPrediction`, `graphtyTopCandidatesForNode`, `graphtyTopAdamicAdarCandidatesForNode` (`[{ source, target, score }]`), `graphtyCommonNeighborsForPairs`, `graphtyAdamicAdarForPairs` (`pairs: [[a, b], ...]`: numbers), `graphtyEvaluateCommonNeighbors`, `graphtyEvaluateAdamicAdar`, `graphtyCompareAdamicAdarWithCommonNeighbors` (`edges`, `nonEdges`: metrics) |                                                                                                                                                                                          |

### Where the numbers differ from Cytoscape's built-ins

- **PageRank:** Cytoscape's `pageRank` adds the teleport `(1 - d) / n` without scaling the links
  by `d`, so its `dampingFactor: d` is the standard damping `1 / (2 - d)`; `graphtyPageRank` uses
  the standard one (default 0.85, Cytoscape's default is 0.8). Pass `directed: true` to rank along
  edge direction as Cytoscape does; the default reads every edge both ways.
- **Betweenness:** `betweenness(node)` and `betweennessNormalized(node)` equal Cytoscape's
  (ordered pairs; normalized by the maximum). `score(node)` is the NetworkX convention, half of
  that on an undirected graph, and honours `normalized`.
- **Closeness** is `1 / sum(distance)`; `normalized: true` scales by the fraction of other nodes
  reached, not NetworkX's `(n - 1) / sum`. Cytoscape's `closenessCentralityNormalized` divides by
  the maximum.
- **Degree** is the plain degree unless `normalized: true` (divide by `n - 1`).
- **Depth-first order** tries neighbours in edge order; Cytoscape's tries the last one first, so
  the two visit orders differ when a node has more than one unvisited neighbour.
- **`graphtyDeltaPageRank({ priority: true })`** adds the teleport share once more after it has
  already propagated it, so its ranks are PageRank mixed with a small uniform share (a known
  defect in @graphty/algorithms' `PriorityDeltaPageRank`); without `priority` the ranks are
  PageRank's.
- **Link prediction** on an undirected graph lists each candidate pair twice, once per
  orientation (`topK` counts both).

Not exposed: `bipartiteFlowNetwork` (it builds a graph from id lists, not from a collection),
`walkPredArcs` / `walkPredEdges` (helpers over an index result; `pathTo` covers them), and the
`update()` of the incremental `DeltaPageRank` engines (a changed Cytoscape graph is a new
snapshot, so only the one-shot run is offered, as `graphtyDeltaPageRank`, with `priority: true`
for `PriorityDeltaPageRank`).

## WebGPU

WebGPU is optional. Install `@graphty/webgpu-graph-algorithms` (and, under Node, the `webgpu`
package, which is Dawn) and import one more module, once:

```ts
import "@graphty/cytoscape/webgpu";

const r = await cy.elements().graphtyPageRankAsync();
r.rank("#a");
r.backend; // { ran: "gpu", reason: null, device: "nvidia nvidia-geforce-rtx-4070-super" }
cy.layout({ name: "graphty-forceatlas2" }).run(); // now on the GPU; listen for layoutstop
```

That import is the whole integration. Each core acquires one device the first time it needs one,
reuses it for every later call, acquires a new one after the device is lost, and releases it on
`cy.destroy()`. The same import works in a browser and under Node (the package's `node` export
condition picks Dawn). Without it nothing imports the GPU package, so an application that never
uses WebGPU builds without it installed.

**Which methods.** Seventeen algorithms have an asynchronous twin, `graphty<Name>Async`
(`ASYNC_ALGORITHM_NAMES` lists them): breadth-first search, Dijkstra, Bellman-Ford, all-pairs
shortest paths, PageRank, personalized PageRank, eigenvector, Katz, HITS, closeness, betweenness
and edge betweenness centrality, connected and weakly connected components, triangle count, and
both label propagations. They take the same options and return the same result as the plain
method, plus `backend`. The plain methods stay synchronous and always run on the CPU. Of the
layouts, the three simulations use the GPU; the static layouts have no GPU implementation.

**Which ran, and why.** `backend` is `{ ran: "gpu" | "cpu", reason, device }` on an `...Async`
result, and on the layout object (`layout.backend`) once a simulation has started. `reason` says why
the CPU ran:

- WebGPU is not enabled (the module above was not imported), or `gpu: "off"` was passed.
- No usable device: no WebGPU in this runtime, no adapter, a software-only adapter (refused by
  default, being usually slower than the CPU; `enableWebGpu({ acceptSoftware: true })` accepts it),
  or a device that fails the GPU package's correctness check.
- The options or the graph need the CPU implementation. @graphty/algorithms' dispatcher decides this
  per call: for example PageRank with `initialRanks`, personalized PageRank on a graph with a node
  that has no out-edges, eigenvector centrality on a directed or bipartite graph, all-pairs shortest
  paths with `paths: true` (the default; pass `paths: false` to let the GPU answer, and `path()`
  then throws), breadth-first search with a `target`.

**Modes.** Every `...Async` method and every simulation takes `gpu`: `"auto"` (default) as above;
`"off"` for the CPU; `"require"` to throw (or emit `layouterror`) instead of running on the CPU
when no device is available. A plain method rejects `"require"`.

**Errors are never hidden.** The GPU-or-CPU decision is made before any work starts. A failure
after that, such as a device lost in the middle of a run, rejects the call (or emits
`layouterror`); it is never finished quietly on the CPU. The next call acquires a new device.

**Precision.** GPU results are single precision. Against the CPU they agree to the tolerances the
GPU package documents: about 1e-5 relative for PageRank (after the same number of iterations),
paths, closeness and weighted all-pairs distances; 1e-4 for betweenness; exactly for components,
breadth-first depths, triangle counts and unweighted distances. Label propagation breaks ties
differently on the two, so partitions can differ; the GPU result has no `iterations` or
`converged`. The power-iteration methods stop at their own convergence on each side, and the two
packages read `tolerance` differently for PageRank (the GPU stops at an L1 change below
`tolerance` times the node count, the CPU below `tolerance`), so at the same options the GPU
usually stops sooner.

`enableWebGpu(options)` and `disableWebGpu()` are exported from `@graphty/cytoscape/webgpu`.
`enableWebGpu` takes `acceptSoftware` and, under Node, `adapter` (a substring of the Dawn adapter
name, such as `"llvmpipe"`).

## Using the graph-format snapshot directly

`toSnapshot(eles, { directed, weight })` returns `{ snapshot, nodes, edges }`: a
[@graphty/graph-format](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-format) snapshot of a collection, where node index `i` is
`nodes[i]` and edge index `e` is `edges[e]`. It is cached per core and rebuilt after an element is
added, removed, moved or has its data changed. `writeData(nodes, values, field)` writes one value
per element into its data. Together they run any @graphty/algorithms function over a Cytoscape
graph:

```js
import { pageRank } from "@graphty/algorithms";
import { toSnapshot, writeData } from "@graphty/cytoscape";

const { snapshot, nodes } = toSnapshot(cy.elements());
writeData(nodes, pageRank(snapshot).scores, "rank");
```
