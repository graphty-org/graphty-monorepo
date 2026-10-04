# Algorithm reference

Every graphty algorithm is a method on a Cytoscape collection and on the core, named `graphty` plus the
algorithm name. `cy.graphtyPageRank()` runs on the whole graph, and `cy.$("node.team, edge.team").graphtyLouvain()`
on the elements the selector matches. Include the edges you want read: a collection of nodes alone has no edges.
Each method takes one optional options object and returns its result synchronously, on the CPU. 17 of them also
have an `...Async` twin, named under each method below, that takes the same options, returns a promise, and runs on
the GPU when the runtime has a usable WebGPU device.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyDataset("karate");

// The synchronous method runs on the CPU; `field` also writes each score into data("rank").
const pr = cy.graphtyPageRank({ dampingFactor: 0.9, field: "rank" });
console.log(pr.score("#0"), cy.$("#0").data("rank"));

// The Async twin waits for the GPU decision, then reports which backend ran.
const prAsync = await cy.graphtyPageRankAsync({ dampingFactor: 0.9 });
console.log(prAsync.backend.ran, prAsync.backend.reason);
```

On a machine with no WebGPU device the last line prints `cpu` and the reason, for example
`no usable WebGPU device: ...`.

## How to read this page

The first table lists the options every method takes. Each method then says what it finds, what it returns,
whether it reads edge weights, and which options it adds. A method throws on an option that neither its table nor
the common table lists. An empty Default cell means there is no fixed value: the Meaning cell says what happens
when you leave the option out. The result types are defined at the end of the page.

[Algorithms](../guide/algorithms) explains which nodes and edges a call reads, the options that name nodes, the result
shapes, `field` and the errors a method throws.

## Methods by task

The methods below are listed alphabetically. This table groups them by what you want to find, the usual first
choice first, and drops the `graphty` prefix from each name.

| Task                             | Methods                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Important nodes                  | [PageRank](#graphtypagerank), [Degree](#graphtydegreecentrality), [Betweenness](#graphtybetweennesscentrality), [Closeness](#graphtyclosenesscentrality), [Eigenvector](#graphtyeigenvectorcentrality), [Katz](#graphtykatzcentrality), [HITS](#graphtyhits), [PersonalizedPageRank](#graphtypersonalizedpagerank), [DeltaPageRank](#graphtydeltapagerank), [EdgeBetweenness](#graphtyedgebetweennesscentrality), [KCoreDecomposition](#graphtykcoredecomposition), [TriangleCount](#graphtytrianglecount) |
| Communities, any number          | [Louvain](#graphtylouvain), [Leiden](#graphtyleiden), [LabelPropagation](#graphtylabelpropagation), [MarkovClustering](#graphtymarkovclustering), [GirvanNewman](#graphtygirvannewman) (slow; keeps every level), [TeraHAC](#graphtyterahac), [Grsbm](#graphtygrsbm)                                                                                                                                                                                                                                       |
| Communities, a number you choose | [SpectralClustering](#graphtyspectralclustering), [HierarchicalClustering](#graphtyhierarchicalclustering) with `cut(height)`, [SyncClustering](#graphtysyncclustering)                                                                                                                                                                                                                                                                                                                                    |
| Spread known labels              | [LabelPropagationSemiSupervised](#graphtylabelpropagationsemisupervised)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Connected pieces                 | [ConnectedComponents](#graphtyconnectedcomponents), [StronglyConnectedComponents](#graphtystronglyconnectedcomponents), [WeaklyConnectedComponents](#graphtyweaklyconnectedcomponents), [Condensation](#graphtycondensation)                                                                                                                                                                                                                                                                               |
| Routes and walks                 | [Dijkstra](#graphtydijkstra), [AStar](#graphtyastar), [BidirectionalDijkstra](#graphtybidirectionaldijkstra), [BellmanFord](#graphtybellmanford) (negative weights), [AllPairsShortestPath](#graphtyallpairsshortestpath), [BreadthFirstSearch](#graphtybreadthfirstsearch), [DepthFirstSearch](#graphtydepthfirstsearch)                                                                                                                                                                                  |
| Trees                            | [KruskalMST](#graphtykruskalmst), [PrimMST](#graphtyprimmst), [TopologicalSort](#graphtytopologicalsort)                                                                                                                                                                                                                                                                                                                                                                                                   |
| Flow and cuts                    | [MaxFlow](#graphtymaxflow), [MinSTCut](#graphtyminstcut), [StoerWagner](#graphtystoerwagner), [KargerMinCut](#graphtykargermincut)                                                                                                                                                                                                                                                                                                                                                                         |
| Matching and structure           | [MaximumBipartiteMatching](#graphtymaximumbipartitematching), [IsBipartite](#graphtyisbipartite), [HasCycle](#graphtyhascycle), [IsGraphIsomorphic](#graphtyisgraphisomorphic), [Modularity](#graphtymodularity) (scores a partition)                                                                                                                                                                                                                                                                      |
| Missing links                    | [TopAdamicAdarCandidatesForNode](#graphtytopadamicadarcandidatesfornode), [AdamicAdarPrediction](#graphtyadamicadarprediction), [CommonNeighborsPrediction](#graphtycommonneighborsprediction), [EvaluateAdamicAdar](#graphtyevaluateadamicadar)                                                                                                                                                                                                                                                           |

The remaining methods are variants of these: the pair and score forms
of the link-prediction methods, `graphtyDegrees`, `graphtyDirectionOptimizedBfs`, `graphtyGreedyBipartiteMatching`,
`graphtyFindAllIsomorphisms`, `graphtyLabelPropagationSynchronous` and the comparison of the two link scores.

<!-- generated:algorithms:begin (by scripts/reference.ts; run npm run docs:reference) -->

## Options every algorithm takes

| Option     | Type                                         | Default             | Meaning                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `directed` | `boolean`                                    | `false`             | Read the edges as directed (source to target). Default false, except where an algorithm says otherwise.                                                                                                                                                                           |
| `weight`   | `string \| ((edge: EdgeSingular) => number)` | every edge weighs 1 | Edge data field holding the weight, or a function of the edge. Each method below says whether it reads weights; one that does not throws when you pass `weight`.                                                                                                                  |
| `field`    | `string`                                     |                     | Write each element's value into `data(field)`, so a stylesheet can map it: the score, the cluster number, the distance from `root` (`Infinity` when unreachable) or the search depth (`NaN` when not visited). A method marked "Takes no `field`" below throws when you pass it.  |
| `gpu`      | `"auto" \| "off" \| "require"`               | `"auto"`            | The `...Async` methods only: "auto" (default) runs on the GPU when the runtime has a usable WebGPU device, "off" runs on the CPU, "require" throws instead of running on the CPU when no device is available. The synchronous methods always run on the CPU and reject "require". |

The algorithms defined only for directed graphs (`graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`, `graphtyCondensation`, `graphtyDeltaPageRank`) default `directed` to `true`.

## Every algorithm

### `graphtyAStar`

The shortest path from `root` to `goal`, guided by an estimate of the distance left; a negative weight throws.

Returns `PointPathResult`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

| Option      | Type                             | Default  | Meaning                                                                               |
| ----------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `goal`      | `NodeSelection`                  | required | The node to reach.                                                                    |
| `root`      | `NodeSelection`                  | required | The start node: a selector or a collection (its first node).                          |
| `heuristic` | `(node: NodeSingular) => number` | `0`      | An estimate of the distance left from a node to `goal`, never more than the real one. |

### `graphtyAdamicAdarForPairs`

The Adamic-Adar score of each given node pair.

Returns `number[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option  | Type                  | Default  | Meaning                                                             |
| ------- | --------------------- | -------- | ------------------------------------------------------------------- |
| `pairs` | `readonly NodePair[]` | required | The node pairs to score, each `[a, b]` of selectors or collections. |

### `graphtyAdamicAdarPrediction`

The unlinked node pairs most likely to be linked, ranked by Adamic-Adar score.

Returns `PredictedLink[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option            | Type      | Default            | Meaning                                                                                                                                                                                                   |
| ----------------- | --------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeExisting` | `boolean` | `false`            | Also score pairs already joined by an arc u -> v.                                                                                                                                                         |
| `topK`            | `number`  | every pair above 0 | Keep only the best `topK` pairs; 0 or less keeps every pair. A pair that scores 0 is never listed, so the list can be shorter than `topK`. An undirected graph lists each pair twice, once in each order. |

### `graphtyAdamicAdarScore`

The Adamic-Adar score of one node pair: its shared neighbors, each counted as 1 / log(degree), so a rare shared neighbor counts more. With `directed: true` the degree is the out-degree, and a shared neighbor of out-degree 1 counts 1.

Returns `number`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option   | Type            | Default  | Meaning                     |
| -------- | --------------- | -------- | --------------------------- |
| `source` | `NodeSelection` | required | One node of the pair.       |
| `target` | `NodeSelection` | required | The other node of the pair. |

### `graphtyAllPairsShortestPath`

The shortest distance, and path, between every pair of nodes.

Returns `{ distance(from: ElementRef, to: ElementRef): number; path(from: ElementRef, to: ElementRef): CollectionReturnValue; readonly hasNegativeWeightCycle: boolean }`. Reads edge weights from `weight`. Takes no `field`. Async twin, which can run on the GPU: `graphtyAllPairsShortestPathAsync`.

| Option     | Type                                         | Default | Meaning                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`   | `"auto" \| "floyd-warshall" \| "per-source"` |         | Strategy override. `"auto"` (the default): BFS rows on unit weights, Floyd-Warshall on any negative weight, Dijkstra rows below arcCount n^2 / 3, Floyd-Warshall otherwise. `"floyd-warshall"` always sweeps; `"per-source"` runs BFS or Dijkstra rows and throws on a negative weight. |
| `paths`    | `boolean`                                    | `true`  | Keep the predecessor table so `path(from, to)` works; it takes 4 n^2 bytes. With `false` only `distance()` works and `path()` throws, and the Async twin can run on the GPU.                                                                                                            |
| `maxNodes` | `number`                                     | `5,792` | Refuse larger graphs before allocating.                                                                                                                                                                                                                                                 |

### `graphtyBellmanFord`

Shortest paths from one node when some edge weights are negative, and whether a negative cycle exists.

Returns `PathsResult & { readonly hasNegativeWeightCycle: boolean; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyBellmanFordAsync`.

| Option   | Type            | Default  | Meaning                                                                                              |
| -------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `root`   | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                         |
| `cutoff` | `number`        |          | Stop relaxing beyond this distance; a node farther away reads as unreachable. Unbounded when absent. |

### `graphtyBetweennessCentrality`

How often each node lies on the shortest paths between other nodes: the brokers and bridges.

Returns `ScoreResult & { betweenness(node: ElementRef): number | undefined; betweennessNormalized(node: ElementRef): number | undefined; }`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyBetweennessCentralityAsync`.

`score` is NetworkX's value (divided as `normalized` says). `betweenness` is always the raw count over ordered pairs, as Cytoscape's built-in gives it (twice `score` on an undirected graph), and `betweennessNormalized` is that divided by its largest value.

| Option       | Type            | Default    | Meaning                                                                                                                                                                                                                                                           |
| ------------ | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalized` | `boolean`       | `false`    | Divide by the number of ordered pairs a node can sit between: `(n - 1)(n - 2)` directed, half that undirected; with `endpoints`, `n (n - 1)` and half that.                                                                                                       |
| `k`          | `number`        |            | Draw this many source nodes instead of using every node; the same node count and `k` draw the same nodes every time. With `sources` it must equal the number of sources. The result is not rescaled (see `sources`).                                              |
| `endpoints`  | `boolean`       | `false`    | Count a path's two ends as lying on it, as NetworkX's `endpoints=True` does.                                                                                                                                                                                      |
| `sources`    | `NodeSelection` | every node | The nodes to run from, a selector or a collection. A sample is not rescaled: each value sums over these sources only (closeness is 1 / the sum of the distances from them), where NetworkX multiplies a k-source betweenness by n / k to estimate the full value. |

### `graphtyBidirectionalDijkstra`

The shortest path between two nodes, searched from both ends at once; a negative weight throws.

Returns `PointPathResult`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

| Option | Type            | Default  | Meaning                                                      |
| ------ | --------------- | -------- | ------------------------------------------------------------ |
| `goal` | `NodeSelection` | required | The node to reach.                                           |
| `root` | `NodeSelection` | required | The start node: a selector or a collection (its first node). |

### `graphtyBreadthFirstSearch`

Walks outward from `root` one hop at a time, recording each node's depth and parent.

Returns `SearchResult`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyBreadthFirstSearchAsync`.

| Option     | Type            | Default  | Meaning                                                                                                                                                                                                  |
| ---------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal`     | `NodeSelection` |          | Stop once this node is reached; it is then `found`. The node that discovered the goal is still fully expanded, so the goal's siblings are listed in `path` and given a depth; nothing deeper is visited. |
| `maxDepth` | `number`        |          | Stop expanding at this many hops from the root; unbounded when absent.                                                                                                                                   |
| `root`     | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                                                                                                                             |

### `graphtyClosenessCentrality`

How near each node is to all others: 1 / the sum of its shortest-path distances.

Returns `ScoreResult & { closeness(node: ElementRef): number | undefined; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyClosenessCentralityAsync`.

| Option       | Type            | Default              | Meaning                                                                                                                                                                                                                                                                                    |
| ------------ | --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `normalized` | `boolean`       | `false`              | Multiply by the share of the other nodes that are reached, reached / (n - 1), which changes nothing on a connected graph; with `harmonic`, divide by `n - 1` instead. For NetworkX's `closeness_centrality`, multiply the value without `normalized` by the number of other nodes reached. |
| `harmonic`   | `boolean`       | `false`              | Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs.                                                                                                                                                                                                   |
| `cutoff`     | `number`        | every reachable node | Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge reaches it from a node closer than the cutoff.                                                                                                                                    |
| `k`          | `number`        |                      | Draw this many source nodes instead of using every node; the same node count and `k` draw the same nodes every time. With `sources` it must equal the number of sources. The result is not rescaled (see `sources`).                                                                       |
| `sources`    | `NodeSelection` | every node           | The nodes to run from, a selector or a collection. A sample is not rescaled: each value sums over these sources only (closeness is 1 / the sum of the distances from them), where NetworkX multiplies a k-source betweenness by n / k to estimate the full value.                          |

### `graphtyCommonNeighborsForPairs`

The number of neighbors each given node pair shares.

Returns `number[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option  | Type                  | Default  | Meaning                                                             |
| ------- | --------------------- | -------- | ------------------------------------------------------------------- |
| `pairs` | `readonly NodePair[]` | required | The node pairs to score, each `[a, b]` of selectors or collections. |

### `graphtyCommonNeighborsPrediction`

The unlinked node pairs most likely to be linked, ranked by how many neighbors they share.

Returns `PredictedLink[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option            | Type      | Default            | Meaning                                                                                                                                                                                                   |
| ----------------- | --------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeExisting` | `boolean` | `false`            | Also score pairs already joined by an arc u -> v.                                                                                                                                                         |
| `topK`            | `number`  | every pair above 0 | Keep only the best `topK` pairs; 0 or less keeps every pair. A pair that scores 0 is never listed, so the list can be shorter than `topK`. An undirected graph lists each pair twice, once in each order. |

### `graphtyCommonNeighborsScore`

The number of neighbors two nodes share.

Returns `number`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option   | Type            | Default  | Meaning                     |
| -------- | --------------- | -------- | --------------------------- |
| `source` | `NodeSelection` | required | One node of the pair.       |
| `target` | `NodeSelection` | required | The other node of the pair. |

### `graphtyCompareAdamicAdarWithCommonNeighbors`

Both Evaluate methods on the same held-out edges, to compare the two scores.

Returns `{ adamicAdar: LinkPredictionMetrics; commonNeighbors: LinkPredictionMetrics; }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

A held-out edge and a non-edge with the same score count as the edge ranked higher, so a score with many ties reads better than it is: when every pair scores 0, every metric is 1. Common-neighbor counts tie often, which also favors them in the comparison.

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

### `graphtyCondensation`

The strongly connected components, plus the graph of components, which has no cycle.

Returns `Partition<{ condensed: DerivedGraph; }>`. Reads no edge weights. No Async twin: it runs on the CPU only.

`condensed.snapshot` is the graph of components as a @graphty/graph-format snapshot. Its node i stands for `result[i]`. Its edges run from e = 0 to `edgeCount - 1`, and the snapshot methods `edgeSource(e)` and `edgeTarget(e)` give the components at each end: `for (let e = 0; e < s.edgeCount; e++) console.log(result[s.edgeSource(e)].map((n) => n.id()), result[s.edgeTarget(e)].map((n) => n.id()))`, with `s = result.condensed.snapshot`. The other fields of `condensed` record how @graphty/graph-format derived the graph; you do not need them. [Snapshot](../guide/snapshot) explains snapshots.

No options of its own.

### `graphtyConnectedComponents`

The connected pieces of an undirected graph.

Returns `Partition<object>`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyConnectedComponentsAsync`.

No options of its own.

### `graphtyDegreeCentrality`

Each node's number of neighbors.

Returns `ScoreResult & { degree(node: ElementRef): number | undefined; }`. Reads no edge weights. No Async twin: it runs on the CPU only.

| Option       | Type                       | Default   | Meaning                                                                 |
| ------------ | -------------------------- | --------- | ----------------------------------------------------------------------- |
| `mode`       | `"in" \| "out" \| "total"` | `"total"` | On a directed graph, which neighbors to count; ignored when undirected. |
| `normalized` | `boolean`                  | `false`   | Divide by `n - 1`, the most neighbors a node can have.                  |

### `graphtyDegrees`

Each node's in-degree and out-degree. Without `directed: true` an edge counts both ways, so both are the node's degree.

Returns `{ indegree(node: ElementRef): number | undefined; outdegree(node: ElementRef): number | undefined; }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

No options of its own.

### `graphtyDeltaPageRank`

PageRank computed by passing on only the changes in rank; pass `priority: true` for ranks that match `graphtyPageRank`.

Returns `ScoreResult & { rank(node: ElementRef): number | undefined; }`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

| Option            | Type                                                | Default                         | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                                            | `0.85`                          | Probability of following a link.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `maxIterations`   | `number`                                            | `100`; no limit with `priority` | Rounds, or with `priority` the number of nodes processed. With `priority` and no `maxIterations`, the run goes on until no pending delta is left, so it always converges.                                                                                                                                                                                                                                                                                                                                                                             |
| `tolerance`       | `number`                                            | `0.000001`                      | Stop when every pending delta is below this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `deltaThreshold`  | `number`                                            | `tolerance / 10`                | A delta below this is dropped rather than propagated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `priority`        | `boolean`                                           |                                 | Process the largest pending delta first (`personalization` is then ignored). With no `maxIterations` of your own, the ranks match `graphtyPageRank({ directed: true })` to within 1e-7. A `maxIterations` you pass counts processed nodes, and a run it stops early is not reported: at 100 on a 200-node graph the ranks are off by a third. Without `priority` the ranks can differ from PageRank's (by up to 0.07 on the karate club), the run usually goes on until `maxIterations`, and a `maxIterations` in the thousands overflows and throws. |
| `personalization` | `NodeSelection \| ((node: NodeSingular) => number)` |                                 | The teleport set: a selection (uniform over it) or a weight per node.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### `graphtyDepthFirstSearch`

Walks from `root` as deep as it can before backtracking, recording each node's depth and parent.

Returns `SearchResult`. Reads no edge weights. No Async twin: it runs on the CPU only.

| Option  | Type              | Default  | Meaning                                                                                                                                                                                                                                              |
| ------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal`  | `NodeSelection`   |          | Stop when this node is reached; it is then `found`. With `order: "pre"` nothing after it is visited. With `order: "post"` the nodes below it are still visited and listed before it, and the nodes on the way from `root` to it are listed after it. |
| `root`  | `NodeSelection`   | required | The start node: a selector or a collection (its first node).                                                                                                                                                                                         |
| `order` | `"pre" \| "post"` | `"pre"`  | "pre" (default) lists a node when it is first reached, "post" when everything below it is finished.                                                                                                                                                  |

### `graphtyDijkstra`

Shortest paths from one node to every other, for weights of 0 or more; a negative weight throws (use `graphtyBellmanFord`).

Returns `PathsResult`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyDijkstraAsync`.

| Option   | Type            | Default  | Meaning                                                                                              |
| -------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `root`   | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                         |
| `cutoff` | `number`        |          | Stop relaxing beyond this distance; a node farther away reads as unreachable. Unbounded when absent. |

### `graphtyDirectionOptimizedBfs`

Breadth-first search that switches to a bottom-up search when the frontier is large: the same depths as `graphtyBreadthFirstSearch`, faster on large graphs with short paths.

Returns `SearchResult`. Reads no edge weights. No Async twin: it runs on the CPU only.

| Option  | Type            | Default  | Meaning                                                                                                                 |
| ------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `root`  | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                                            |
| `alpha` | `number`        | `15`     | Switch from top-down to bottom-up once the frontier's out-arcs exceed the unvisited nodes' out-arcs divided by `alpha`. |
| `beta`  | `number`        | `18`     | Switch back to top-down once the frontier shrinks below `nodeCount / beta` nodes.                                       |

### `graphtyEdgeBetweennessCentrality`

How often each edge lies on shortest paths: high values mark the bridges between groups.

Returns `ScoreResult`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyEdgeBetweennessCentralityAsync`.

| Option       | Type            | Default    | Meaning                                                                                                                                                                                                                                                           |
| ------------ | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`    | `NodeSelection` | every node | The nodes to run from, a selector or a collection. A sample is not rescaled: each value sums over these sources only (closeness is 1 / the sum of the distances from them), where NetworkX multiplies a k-source betweenness by n / k to estimate the full value. |
| `normalized` | `boolean`       | `false`    | Divide by `(n - 1)(n - 2)` on a directed graph, half that on an undirected one.                                                                                                                                                                                   |
| `k`          | `number`        |            | Draw this many source nodes instead of using every node; the same count draws the same nodes. Not rescaled (see `sources`).                                                                                                                                       |

### `graphtyEigenvectorCentrality`

Influence: a node scores high when its neighbors score high.

Returns `ScoreResult & { iterations: number; converged: boolean; }`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyEigenvectorCentralityAsync`.

When `maxIterations` passes do not meet `tolerance` it throws an error whose `code` is `"E_NOT_CONVERGED"`, where PageRank, Katz and HITS return `converged: false`. So `converged` is always `true`.

| Option          | Type                             | Default    | Meaning                                                                                                                                                                              |
| --------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxIterations` | `number`                         | `100`      | Iteration cap.                                                                                                                                                                       |
| `tolerance`     | `number`                         | `0.000001` | Per-node tolerance: the run stops when the L1 change is below `n * tolerance`.                                                                                                       |
| `normalized`    | `boolean`                        | `true`     | Rescale the unit-length vector to [0, 1] by min-max.                                                                                                                                 |
| `mode`          | `"in" \| "out" \| "total"`       | `"in"`     | On a directed graph, which arcs feed a node: `"in"` (default, as networkx) the nodes pointing at it, `"out"` the nodes it points at, `"total"` both. Ignored on an undirected graph. |
| `startVector`   | `(node: NodeSingular) => number` | uniform    | Starting value of each node.                                                                                                                                                         |

### `graphtyEvaluateAdamicAdar`

How well the Adamic-Adar score ranks held-out edges above non-edges.

Returns `LinkPredictionMetrics`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

A held-out edge and a non-edge with the same score count as the edge ranked higher, so a score with many ties reads better than it is: when every pair scores 0, every metric is 1. Common-neighbor counts tie often, which also favors them in the comparison.

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

### `graphtyEvaluateCommonNeighbors`

How well the common-neighbor count ranks held-out edges above non-edges.

Returns `LinkPredictionMetrics`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

A held-out edge and a non-edge with the same score count as the edge ranked higher, so a score with many ties reads better than it is: when every pair scores 0, every metric is 1. Common-neighbor counts tie often, which also favors them in the comparison.

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

### `graphtyFindAllIsomorphisms`

Every way to map this graph's nodes onto `other` so that the edges match.

Returns `((node: ElementRef) => NodeSingular | undefined)[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option      | Type                                            | Default     | Meaning                                                                      |
| ----------- | ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `other`     | `Collection`                                    | required    | The collection to compare with, read with the same `directed`.               |
| `nodeMatch` | `(a: NodeSingular, b: NodeSingular) => boolean` | any two may | Two nodes may be paired only when this returns true; by default any two may. |
| `edgeMatch` | `(a: EdgeSingular, b: EdgeSingular) => boolean` | any two may | Two edges may be paired only when this returns true; by default any two may. |

### `graphtyGirvanNewman`

Communities found by removing the edge with the highest betweenness, round after round.

Returns `Partition<{ modularity: number; levels: number; level(k: number): NodeCollection[]; modularities: number[]; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

`level(k)` is the partition after k rounds of edge removal, for k from 0 (no edge removed) to `levels - 1`; past the end it returns an empty array. `modularities[k]` is the modularity of `level(k)`. The result itself, with its `modularity`, is the level with the highest modularity.

| Option             | Type     | Default | Meaning                                                                                   |
| ------------------ | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `maxCommunities`   | `number` |         | Stop once a level has at least this many communities of `minCommunitySize` or more nodes. |
| `minCommunitySize` | `number` | `1`     | Communities smaller than this do not count towards `maxCommunities`.                      |
| `maxIterations`    | `number` | `100`   | Cap on rounds of edge removal.                                                            |

### `graphtyGreedyBipartiteMatching`

A set of edges with no node in common in a bipartite graph, found quickly; not always the largest.

Returns `{ readonly size: number; mate(node: ElementRef): NodeSingular | undefined }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option  | Type              | Default  | Meaning                                                                                                 |
| ------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `left`  | `NodeSelection`   |          | One side of the bipartite graph; inferred when absent.                                                  |
| `right` | `NodeSelection`   |          | The other side; inferred when absent.                                                                   |
| `arcs`  | `"out" \| "both"` | `"both"` | With `directed`: "both" (default) ignores direction; "out" joins a left node only to its out-neighbors. |

### `graphtyGrsbm`

Communities found by splitting groups in two along the graph's Fiedler vector, the eigenvector that best separates loosely joined parts. A split is kept unless it lowers modularity by more than 0.01.

Returns `Partition<object>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

Check the result with `graphtyModularity`: on the karate club it returns 2 clusters with modularity 0.04, where `graphtyLouvain` finds 4 with 0.42.

| Option           | Type     | Default | Meaning                                                               |
| ---------------- | -------- | ------- | --------------------------------------------------------------------- |
| `maxDepth`       | `number` | `10`    | Clusters at this depth are not split.                                 |
| `maxIterations`  | `number` | `100`   | Iteration cap of the Fiedler-vector iteration.                        |
| `tolerance`      | `number` | `1e-6`  | Convergence tolerance of the Fiedler-vector iteration.                |
| `seed`           | `number` | `42`    | Seed of the iteration's start vectors.                                |
| `minClusterSize` | `number` | `2`     | A cluster is split only when it has at least twice this many members. |

### `graphtyHasCycle`

Whether the graph has a cycle.

Returns `boolean`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

By default the edges are read as undirected, so any two routes between the same nodes form a cycle: a diamond-shaped DAG has one. With `directed: true` only a directed cycle counts, and the diamond has none.

No options of its own.

### `graphtyHierarchicalClustering`

A merge tree of clusters: every node starts alone, and the two closest clusters by hop distance merge until no pair can.

Returns `{ cut(height: number): NodeCollection[]; readonly merges: number; }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

Distances are hop counts: weights are not read, and nodes with no path between them never merge. `cut(height)` returns the clusters of the merge tree whose height is `height` or less, where a node has height 0 and a merge is one more than its taller part. So `cut(0)` gives every node alone, and a large height gives one cluster per connected component. `merges` is the number of merges made.

| Option    | Type                                            | Default    | Meaning                                                                                                                                                                                         |
| --------- | ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linkage` | `"single" \| "complete" \| "average" \| "ward"` | `"single"` | How the distance between two clusters is read from their members' hop distances: the minimum (`"single"`), the maximum (`"complete"`), the mean (`"average"`) or Ward's scaled mean (`"ward"`). |

### `graphtyHits`

Hubs and authorities: a good hub points to good authorities, and a good authority is pointed to by good hubs.

Returns `ScoreResult & { hub(node: ElementRef): number | undefined; authority(node: ElementRef): number | undefined; iterations: number; converged: boolean; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyHitsAsync`.

`score` is the authority value.

| Option          | Type      | Default    | Meaning                                                                                                                     |
| --------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| `maxIterations` | `number`  | `100`      | Iteration cap.                                                                                                              |
| `tolerance`     | `number`  | `0.000001` | Convergence tolerance on the largest single-node change.                                                                    |
| `normalized`    | `boolean` | `true`     | `true`: each vector has length 1 (L2 norm). `false`: each vector is divided by its largest entry, so its top node scores 1. |

### `graphtyIsBipartite`

Whether the nodes split into two sides with every edge between the sides, and the two sides.

Returns `{ bipartite: boolean; partitionFirst: NodeCollection; partitionSecond: NodeCollection; }`. Reads no edge weights. No Async twin: it runs on the CPU only.

| Option | Type              | Default  | Meaning                                                                                                                                                                                                                                                                                                                                             |
| ------ | ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arcs` | `"out" \| "both"` | `"both"` | Which arcs of a directed graph to color along. "both" (default) follows out- and in-arcs, which answers for the graph with direction ignored. "out" follows out-arcs only: roots are taken in index order and a node first reached through an in-arc is colored as a new root, so the answer depends on node order. Ignored on an undirected graph. |

### `graphtyIsGraphIsomorphic`

Whether this graph and `other` have the same shape, and a mapping between their nodes.

Returns `{ isomorphic: boolean; mapping(node: ElementRef): NodeSingular | undefined; }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option      | Type                                            | Default     | Meaning                                                                      |
| ----------- | ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `other`     | `Collection`                                    | required    | The collection to compare with, read with the same `directed`.               |
| `nodeMatch` | `(a: NodeSingular, b: NodeSingular) => boolean` | any two may | Two nodes may be paired only when this returns true; by default any two may. |
| `edgeMatch` | `(a: EdgeSingular, b: EdgeSingular) => boolean` | any two may | Two edges may be paired only when this returns true; by default any two may. |

### `graphtyKCoreDecomposition`

Each node's core number: the largest k for which the node belongs to a group whose members all have k or more neighbors in the group.

Returns `ScoreResult & { maxCore: number; core(k: number): NodeCollection; }`. Reads no edge weights. No Async twin: it runs on the CPU only.

`score` is the core number; `core(k)` returns the nodes whose core number is k or more.

No options of its own.

### `graphtyKargerMinCut`

A minimum cut found by random contraction over many trials: the lightest set of edges whose removal splits the graph.

Returns `CutResult`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

| Option       | Type     | Default | Meaning                                                          |
| ------------ | -------- | ------- | ---------------------------------------------------------------- |
| `randomSeed` | `number` | `42`    | Seed of the edge orders; one seed gives one result, bit for bit. |
| `iterations` | `number` | `100`   | Independent contraction trials; the lightest cut found wins.     |

### `graphtyKatzCentrality`

Influence counted over walks of every length, the shorter walks counting more.

Returns `ScoreResult & { iterations: number; converged: boolean; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyKatzCentralityAsync`.

| Option          | Type      | Default    | Meaning                                                  |
| --------------- | --------- | ---------- | -------------------------------------------------------- |
| `maxIterations` | `number`  | `100`      | Iteration cap.                                           |
| `tolerance`     | `number`  | `0.000001` | Convergence tolerance on the largest single-node change. |
| `normalized`    | `boolean` | `true`     | Rescale the scores to [0, 1] by min-max.                 |
| `alpha`         | `number`  | `0.1`      | Attenuation factor applied to a neighbor's score.        |
| `beta`          | `number`  | `1`        | Base score every node starts with and keeps.             |

### `graphtyKruskalMST`

The minimum spanning forest: the lightest edges that connect every node of each component.

Returns `CollectionReturnValue & { totalWeight: number; }`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

No options of its own.

### `graphtyLabelPropagation`

Communities found by letting each node take the most common label among its neighbors.

Returns `Partition<{ iterations: number | undefined; converged: boolean | undefined }>`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyLabelPropagationAsync`.

| Option          | Type     | Default | Meaning                                                     |
| --------------- | -------- | ------- | ----------------------------------------------------------- |
| `maxIterations` | `number` | `100`   | Work cap, in node visits per node (full-sweep equivalents). |
| `randomSeed`    | `number` | `42`    | Seed of the visit order and of the tie draws.               |

### `graphtyLabelPropagationSemiSupervised`

Spreads the labels of a few seed nodes to the rest of the graph.

Returns `Partition<{ iterations: number; converged: boolean; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

| Option          | Type                                 | Default  | Meaning                                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxIterations` | `number`                             | `100`    | Work cap, in node visits per node (full-sweep equivalents).                                                                                                                                                                                                                                      |
| `randomSeed`    | `number`                             | `42`     | Seed of the visit order and of the tie draws.                                                                                                                                                                                                                                                    |
| `seeds`         | `string \| readonly NodeSelection[]` | required | Seed labels: the node data field holding them (nodes without it are free), or one selection per label. Every free node starts with a label of its own, so a seed label spreads only where its seeds outvote their neighbors: a single seed in a dense group can end up alone in its own cluster. |

### `graphtyLabelPropagationSynchronous`

Label propagation in which every node updates at once, each round.

Returns `Partition<{ iterations: number | undefined; converged: boolean | undefined }>`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyLabelPropagationSynchronousAsync`.

| Option          | Type     | Default | Meaning        |
| --------------- | -------- | ------- | -------------- |
| `maxIterations` | `number` | `100`   | Iteration cap. |

### `graphtyLeiden`

Communities by modularity, as Louvain finds them, with every community connected.

Returns `Partition<{ modularity: number; iterations: number; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

`modularity` is measured at the `resolution` you passed: `graphtyModularity({ clusters: result, resolution })` with the same value gives the same number.

| Option          | Type     | Default | Meaning                                                                                                                        |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `resolution`    | `number` | `1`     | Resolution gamma: above 1 favors smaller communities.                                                                          |
| `randomSeed`    | `number` | `42`    | Seed of the visit orders.                                                                                                      |
| `maxIterations` | `number` | `100`   | Cap on whole passes over the original graph, each running as many levels as it needs. The result's `iterations` counts levels. |
| `threshold`     | `number` | `1e-7`  | Stop once a pass improves modularity by no more than this.                                                                     |

### `graphtyLouvain`

Communities by modularity: groups with more edges inside them than chance would give.

Returns `Partition<{ modularity: number; iterations: number; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

`modularity` is measured at the `resolution` you passed: `graphtyModularity({ clusters: result, resolution })` with the same value gives the same number.

| Option          | Type     | Default | Meaning                                                                |
| --------------- | -------- | ------- | ---------------------------------------------------------------------- |
| `resolution`    | `number` | `1`     | Resolution gamma: above 1 favors smaller communities.                  |
| `maxIterations` | `number` | `100`   | Cap on aggregation levels, and on node visits per node within a level. |
| `tolerance`     | `number` | `1e-6`  | Stop when a level improves modularity by less than this.               |

### `graphtyMarkovClustering`

Communities found by simulating random walks, which stay inside dense regions.

Returns `Partition<{ iterations: number; converged: boolean; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

| Option             | Type      | Default | Meaning                                                         |
| ------------------ | --------- | ------- | --------------------------------------------------------------- |
| `maxIterations`    | `number`  | `100`   | Cap on expansion-inflation rounds.                              |
| `tolerance`        | `number`  | `1e-6`  | Stop when no matrix entry moved by more than this in a round.   |
| `expansion`        | `number`  | `2`     | Matrix power of each expansion step, an integer of at least 1.  |
| `inflation`        | `number`  | `2`     | Element-wise power of each inflation step, above 0.             |
| `pruningThreshold` | `number`  | `1e-5`  | Entries below this are dropped after each inflation.            |
| `selfLoops`        | `boolean` | `true`  | Give every node a self-loop of weight 1 before the first round. |

### `graphtyMaxFlow`

The most flow that can move from `source` to `sink`, the flow on each edge, and a minimum cut.

Returns `CutResult & { flow(edge: ElementRef): number | undefined; }`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

Edge capacities come from `weight`; without it every edge has capacity 1. The edges are read as undirected unless you pass `directed: true`, which a flow network needs: `cy.graphtyMaxFlow({ source: "#s", sink: "#t", weight: "capacity", directed: true })`. `partitionFirst` is the source side of the cut. `flow(edge)` is measured from the edge's source to its target: read undirected, flow that runs the other way is negative; with `directed: true` it is between 0 and the capacity.

| Option      | Type                                 | Default          | Meaning                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`    | `NodeSelection`                      | required         | The node the flow leaves.                                                                                                                                                                                                                  |
| `sink`      | `NodeSelection`                      | required         | The node the flow arrives at.                                                                                                                                                                                                              |
| `algorithm` | `"edmonds-karp" \| "ford-fulkerson"` | `"edmonds-karp"` | How augmenting paths are found: `"edmonds-karp"` (breadth-first, O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Both give the same source side and flow value; the per-edge flows can differ where the maximum flow is not unique. |

### `graphtyMaximumBipartiteMatching`

The largest set of edges with no node in common in a bipartite graph.

Returns `{ readonly size: number; mate(node: ElementRef): NodeSingular | undefined }`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option  | Type              | Default  | Meaning                                                                                                 |
| ------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `left`  | `NodeSelection`   |          | One side of the bipartite graph; inferred when absent.                                                  |
| `right` | `NodeSelection`   |          | The other side; inferred when absent.                                                                   |
| `arcs`  | `"out" \| "both"` | `"both"` | With `directed`: "both" (default) ignores direction; "out" joins a left node only to its out-neighbors. |

### `graphtyMinSTCut`

The lightest set of edges whose removal separates `source` from `sink`.

Returns `CutResult`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

Edge capacities come from `weight`; without it every edge has capacity 1. The edges are read as undirected unless you pass `directed: true`. `partitionFirst` is the source side.

| Option      | Type                                 | Default            | Meaning                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`    | `NodeSelection`                      | required           | The node the flow leaves.                                                                                                                                                                                                                  |
| `sink`      | `NodeSelection`                      | required           | The node the flow arrives at.                                                                                                                                                                                                              |
| `algorithm` | `"edmonds-karp" \| "ford-fulkerson"` | `"ford-fulkerson"` | How augmenting paths are found: `"edmonds-karp"` (breadth-first, O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Both give the same source side and flow value; the per-edge flows can differ where the maximum flow is not unique. |

### `graphtyModularity`

Scores a given partition: how many more edges fall inside its clusters than chance would give.

Returns `number`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

| Option       | Type                                 | Default  | Meaning                                                                                               |
| ------------ | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `resolution` | `number`                             | `1`      | Resolution gamma: above 1 favors smaller communities.                                                 |
| `clusters`   | `string \| readonly NodeSelection[]` | required | The clusters (a partition result, or selections), or the node data field holding each node's cluster. |

### `graphtyNodeClosenessCentrality`

The closeness of one node, without computing every node's.

Returns `number`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

| Option       | Type            | Default              | Meaning                                                                                                                                                                                                                                                                                    |
| ------------ | --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `root`       | `NodeSelection` | required             | The start node: a selector or a collection (its first node).                                                                                                                                                                                                                               |
| `normalized` | `boolean`       | `false`              | Multiply by the share of the other nodes that are reached, reached / (n - 1), which changes nothing on a connected graph; with `harmonic`, divide by `n - 1` instead. For NetworkX's `closeness_centrality`, multiply the value without `normalized` by the number of other nodes reached. |
| `harmonic`   | `boolean`       | `false`              | Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs.                                                                                                                                                                                                   |
| `cutoff`     | `number`        | every reachable node | Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge reaches it from a node closer than the cutoff.                                                                                                                                    |

### `graphtyPageRank`

Importance from links: a node ranks high when high-ranking nodes link to it.

Returns `ScoreResult & { rank(node: ElementRef): number | undefined; iterations: number; converged: boolean; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyPageRankAsync`.

| Option            | Type                             | Default    | Meaning                                                                                                                                              |
| ----------------- | -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                         | `0.85`     | Probability of following a link.                                                                                                                     |
| `maxIterations`   | `number`                         | `100`      | Iteration cap.                                                                                                                                       |
| `tolerance`       | `number`                         | `0.000001` | Convergence tolerance on the per-iteration change.                                                                                                   |
| `convergenceNorm` | `"l1" \| "max"`                  | `"l1"`     | How the per-iteration change is measured against `tolerance`: `"l1"` (default) sums it over all nodes, `"max"` takes the largest single-node change. |
| `initialRanks`    | `(node: NodeSingular) => number` |            | Starting rank of each node.                                                                                                                          |

### `graphtyPersonalizedPageRank`

PageRank seen from a set of nodes: importance relative to `personalization`.

Returns `ScoreResult & { rank(node: ElementRef): number | undefined; iterations: number; converged: boolean; }`. Reads edge weights from `weight`. Async twin, which can run on the GPU: `graphtyPersonalizedPageRankAsync`.

| Option            | Type                                                | Default    | Meaning                                                                                                                                              |
| ----------------- | --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                                            | `0.85`     | Probability of following a link.                                                                                                                     |
| `maxIterations`   | `number`                                            | `100`      | Iteration cap.                                                                                                                                       |
| `tolerance`       | `number`                                            | `0.000001` | Convergence tolerance on the per-iteration change.                                                                                                   |
| `convergenceNorm` | `"l1" \| "max"`                                     | `"l1"`     | How the per-iteration change is measured against `tolerance`: `"l1"` (default) sums it over all nodes, `"max"` takes the largest single-node change. |
| `personalization` | `NodeSelection \| ((node: NodeSingular) => number)` | required   | The teleport set: a selection (uniform over it) or a weight per node.                                                                                |
| `initialRanks`    | `(node: NodeSingular) => number`                    |            | Starting rank of each node.                                                                                                                          |

### `graphtyPrimMST`

The minimum spanning tree, grown from `root`.

Returns `CollectionReturnValue & { totalWeight: number; }`. Reads edge weights from `weight`. Takes no `field`. No Async twin: it runs on the CPU only.

| Option   | Type            | Default        | Meaning                                                                     |
| -------- | --------------- | -------------- | --------------------------------------------------------------------------- |
| `root`   | `NodeSelection` | the first node | The node the tree grows from.                                               |
| `forest` | `boolean`       | `false`        | Grow a tree in every component instead of throwing on a disconnected graph. |

### `graphtySpectralClustering`

`k` clusters found by k-means on the eigenvectors of the graph's Laplacian.

Returns `Partition<{ converged: boolean; eigenvalues: Float64Array; }>`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

Every connected component, an isolated node included, takes a cluster of its own before any component is split. On an 80-node graph of 4 communities, `k: 4` finds the communities; add 3 isolated nodes and it returns the 80 nodes as one cluster plus 3 single nodes. Run it on the component you want to cluster, or raise `k` by the number of extra components.

| Option          | Type                                             | Default        | Meaning                                                                                                                                                        |
| --------------- | ------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxIterations` | `number`                                         | `100`          | Cap on k-means rounds.                                                                                                                                         |
| `tolerance`     | `number`                                         | `1e-4`         | k-means stops when no centroid moves further than this.                                                                                                        |
| `k`             | `number`                                         | required       | Number of clusters, a positive integer.                                                                                                                        |
| `laplacianType` | `"normalized" \| "unnormalized" \| "randomWalk"` | `"normalized"` | `"unnormalized"` is `D - A`, `"normalized"` is `I - D^-1/2 A D^-1/2` with each row of the embedding scaled to unit length, and `"randomWalk"` is `I - D^-1 A`. |
| `seed`          | `number`                                         | `42`           | Seed of the starting block and of the k-means seeding.                                                                                                         |

### `graphtyStoerWagner`

The global minimum cut: the lightest set of edges whose removal splits the graph in two.

Returns `CutResult`. Reads edge weights from `weight`. No Async twin: it runs on the CPU only.

No options of its own.

### `graphtyStronglyConnectedComponents`

Groups of nodes in a directed graph in which every node can reach every other.

Returns `Partition<object>`. Reads no edge weights. No Async twin: it runs on the CPU only.

No options of its own.

### `graphtySyncClustering`

`numClusters` clusters found by k-means on node embeddings learned from the edges.

Returns `Partition<{ loss: number; iterations: number; converged: boolean; }>`. Reads no edge weights. No Async twin: it runs on the CPU only.

On an 80-node graph the defaults (`maxIterations: 100`, `learningRate: 0.01`) end with `converged: false` and mixed clusters. Check `converged`; there, `maxIterations: 2000, learningRate: 0.05` converges in about 750 iterations.

| Option          | Type     | Default  | Meaning                                                          |
| --------------- | -------- | -------- | ---------------------------------------------------------------- |
| `numClusters`   | `number` | required | Number of cluster centers: an integer in `[1, nodeCount]`.       |
| `maxIterations` | `number` | `100`    | Iteration cap.                                                   |
| `tolerance`     | `number` | `1e-6`   | Stop when the loss changes by less than this between iterations. |
| `seed`          | `number` | `42`     | Seed of the embedding initialization and the center draws.       |
| `learningRate`  | `number` | `0.01`   | Gradient step.                                                   |
| `lambda`        | `number` | `0.1`    | Weight of the neighbor-reconstruction and regularization terms.  |

### `graphtyTeraHAC`

Hierarchical clustering by hop distance, stopped at `numClusters` clusters or at `distanceThreshold`, returned as a partition.

Returns `Partition<{ merges: number; }>`. Reads no edge weights. No Async twin: it runs on the CPU only.

With `numClusters`, the clusters returned are not the ones left when merging stopped: the run joins those into one tree and splits it again from the top. So a smaller `numClusters` is not always a coarsening of a larger one, and separate components can share a cluster while connected nodes are split. For clusters that keep separate components apart, use `graphtyHierarchicalClustering` and its `cut(height)`.

| Option              | Type                                            | Default                 | Meaning                                                                                                                                                          |
| ------------------- | ----------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linkage`           | `"single" \| "complete" \| "average" \| "ward"` | `"average"`             | How the distance between two clusters is read from their members' pairwise distances: the minimum, the maximum, the mean, or (`"ward"`) the mean of the squares. |
| `numClusters`       | `number`                                        | merge until one is left | Stop merging at this many clusters; a positive integer.                                                                                                          |
| `distanceThreshold` | `number`                                        | no threshold            | Stop at the first merge whose linkage distance is above this.                                                                                                    |
| `useGraphDistance`  | `boolean`                                       |                         | Pairwise distance: hop count along out-arcs (true, the default), or 1 for an arc from the lower to the higher node index and 2 for none (false).                 |

### `graphtyTopAdamicAdarCandidatesForNode`

The nodes `root` is most likely to link to next, ranked by Adamic-Adar score.

Returns `PredictedLink[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option            | Type            | Default    | Meaning                                                                                                                                                   |
| ----------------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`            | `NodeSelection` | required   | The start node: a selector or a collection (its first node).                                                                                              |
| `includeExisting` | `boolean`       | `false`    | Also score pairs already joined by an arc u -> v.                                                                                                         |
| `topK`            | `number`        | `10`       | Keep only the best `topK` candidates; 0 or less keeps every candidate. A candidate that scores 0 is never listed, so the list can be shorter than `topK`. |
| `candidates`      | `NodeSelection` | every node | The nodes to consider linking to `root`. Those that score 0 are left out of the result.                                                                   |

### `graphtyTopCandidatesForNode`

The nodes `root` is most likely to link to next, ranked by shared neighbors.

Returns `PredictedLink[]`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

| Option            | Type            | Default    | Meaning                                                                                                                                                   |
| ----------------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`            | `NodeSelection` | required   | The start node: a selector or a collection (its first node).                                                                                              |
| `includeExisting` | `boolean`       | `false`    | Also score pairs already joined by an arc u -> v.                                                                                                         |
| `topK`            | `number`        | `10`       | Keep only the best `topK` candidates; 0 or less keeps every candidate. A candidate that scores 0 is never listed, so the list can be shorter than `topK`. |
| `candidates`      | `NodeSelection` | every node | The nodes to consider linking to `root`. Those that score 0 are left out of the result.                                                                   |

### `graphtyTopologicalSort`

The nodes in an order in which every edge points forward; null when the graph has a cycle.

Returns `NodeCollection | null`. Reads no edge weights. Takes no `field`. No Async twin: it runs on the CPU only.

No options of its own.

### `graphtyTriangleCount`

Each node's number of triangles and clustering coefficient, and the graph's total and transitivity.

Returns `ScoreResult & { coefficient(node: ElementRef): number | undefined; total: number; transitivity: number; }`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyTriangleCountAsync`.

`score` is the node's number of triangles.

No options of its own.

### `graphtyWeaklyConnectedComponents`

The pieces of a directed graph that are connected when direction is ignored.

Returns `Partition<object>`. Reads no edge weights. Async twin, which can run on the GPU: `graphtyWeaklyConnectedComponentsAsync`.

No options of its own.

<!-- generated:algorithms:end -->

## Result types

A method that takes a node or edge, such as `score(ele)`, accepts an `ElementRef`: the element, a collection (its
first element is used) or a selector. A `Partition` is an array of node collections, one per cluster, with
`cluster(node)` giving a node's index in that array; some methods add fields to it, shown in their `Returns`
line. A `NodePair` is `[a, b]`, each a selector or a collection.

<!-- generated:resultTypes:begin (by scripts/reference.ts; run npm run docs:reference) -->

### `ScoreResult`

Per-element values, keyed by element.

| Member  | Type                                       | Meaning                                                                  |
| ------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| `score` | `(ele: ElementRef) => number \| undefined` | The value of an element of the collection; undefined for one outside it. |

### `PathsResult`

Paths from one root, in the shape of Cytoscape's `dijkstra`.

| Member       | Type                                          | Meaning                                                                       |
| ------------ | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `distanceTo` | `(node: ElementRef) => number`                | Distance from the root; Infinity when unreachable.                            |
| `pathTo`     | `(node: ElementRef) => CollectionReturnValue` | The path from the root, alternating node, edge, node; empty when unreachable. |

### `SearchResult`

A walk from one root, in the shape of Cytoscape's `bfs` / `dfs`.

| Member   | Type                                              | Meaning                                                                         |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `path`   | `CollectionReturnValue`                           | The visited nodes in visit order, each after the tree edge that reached it.     |
| `found`  | `CollectionReturnValue`                           | The `goal` node when it was reached, else empty.                                |
| `depth`  | `(node: ElementRef) => number \| undefined`       | Hops from the root; undefined when not visited.                                 |
| `parent` | `(node: ElementRef) => NodeSingular \| undefined` | The node this one was reached from; undefined for the root and unvisited nodes. |

### `PointPathResult`

One path between two nodes, in the shape of Cytoscape's `aStar`.

| Member     | Type                    | Meaning                                             |
| ---------- | ----------------------- | --------------------------------------------------- |
| `found`    | `boolean`               | Whether `goal` can be reached from `root`.          |
| `distance` | `number`                | The length of the path; Infinity when not found.    |
| `path`     | `CollectionReturnValue` | Alternating node, edge, node; empty when not found. |

### `CutResult`

A cut, in the shape of Cytoscape's `kargerStein`.

| Member            | Type             | Meaning                                                                                                                                                                                   |
| ----------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`           | `number`         | The total weight (capacity) of the cut edges.                                                                                                                                             |
| `cut`             | `EdgeCollection` | The edges that cross the cut. In `graphtyMaxFlow` and `graphtyMinSTCut` with `directed: true`, only the arcs from `partitionFirst` to `partitionSecond`, whose capacities sum to `value`. |
| `partitionFirst`  | `NodeCollection` | The nodes on one side: the source side for a flow or s-t cut.                                                                                                                             |
| `partitionSecond` | `NodeCollection` | The nodes on the other side.                                                                                                                                                              |

### `PredictedLink`

A predicted link.

| Member   | Type           | Meaning                                         |
| -------- | -------------- | ----------------------------------------------- |
| `source` | `NodeSingular` | One end of the proposed edge.                   |
| `target` | `NodeSingular` | The other end.                                  |
| `score`  | `number`       | The pair's score; higher is a more likely link. |

### `LinkPredictionMetrics`

The best-F1 threshold's precision and recall, that F1, and the ranking AUC.

| Member      | Type     | Meaning                                                                                                                                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `precision` | `number` | The precision at the score threshold with the best F1. Every metric ranks a held-out edge ahead of a non-edge with the same score, so a score that ties every pair reports 1 for all four. |
| `recall`    | `number` | The recall at that threshold.                                                                                                                                                              |
| `f1Score`   | `number` | The best F1 over every threshold.                                                                                                                                                          |
| `auc`       | `number` | The chance that a held-out edge scores above a non-edge, a tie counting as the edge scoring higher; 0.5 when either list is empty.                                                         |

<!-- generated:resultTypes:end -->

## Try it

- [Centrality gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--centrality)
- [Communities gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--communities)
- [Paths and trees gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--paths-and-trees)
- [Structure gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--structure)
- [Flows and cuts gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--flows-and-cuts)
- [Link prediction gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--link-prediction)
