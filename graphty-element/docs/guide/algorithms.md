# Algorithms

Guide to running graph algorithms and using results for visualization.

## Overview

Graphty includes a comprehensive set of graph algorithms for analysis. Run algorithms to compute metrics like centrality, detect communities, find shortest paths, and more. Results can be visualized using the styling system.

## Running Algorithms

```typescript
// Run an algorithm
await graph.runAlgorithm("graphty", "degree");

// namespace: 'graphty' (built-in algorithms)
// type: algorithm name
```

## Algorithm Categories

### Centrality Algorithms

Measure node importance:

| Algorithm          | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `degree`           | Number of connections                                 |
| `betweenness`      | How often a node is on shortest paths                 |
| `edge-betweenness` | How often an edge is on shortest paths (scores edges) |
| `closeness`        | Average distance to all other nodes                   |
| `pagerank`         | Influence based on incoming links                     |
| `eigenvector`      | Influence from well-connected neighbors               |

```typescript
await graph.runAlgorithm("graphty", "degree");
await graph.runAlgorithm("graphty", "pagerank");
await graph.runAlgorithm("graphty", "betweenness");
```

`eigenvector` stops after `maxIterations` power-iteration passes (default 1000, at most 10000). If it
has not met `tolerance` by then the run fails with a `GraphtyError` whose code is
`E_NOT_CONVERGED`, rather than publishing scores that are not the answer. Long paths and large
grids need more passes; raise the param and run it again:

```typescript
await graph.runAlgorithm("graphty", "eigenvector", { algorithmOptions: { maxIterations: 5000 } });
```

`closeness` is exact by default: one breadth-first search from every node, which grows with the
square of the node count. On a big graph, sample it. `k` draws that many source nodes (the same
ones every time for the same graph), and each node is then scored from its distances to those
sources only. The result says so: `caveats.exact` is `false` and
`caveats.sampleSize` is the number of sources run. A sampled score is the reciprocal of the summed
distance to the sources, unscaled, so the ranking is the estimate; multiply by `k / n` for an
estimate of the exact score.

```typescript
await graph.runAlgorithm("graphty", "closeness", { algorithmOptions: { k: 100 } });
```

### Community Detection

Find clusters of related nodes:

| Algorithm                 | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `louvain`                 | Fast community detection                                             |
| `label-propagation`       | Iterative community assignment                                       |
| `markov-clustering`       | Clusters where flow gets trapped; `inflation` sets their size        |
| `spectral-clustering`     | A chosen number of `clusters`, from the graph's eigenvectors         |
| `hierarchical-clustering` | Merges the closest clusters, by steps apart, until `clusters` remain |

```typescript
await graph.runAlgorithm("graphty", "louvain");
```

#### Naming the groups

A community's group ids are whatever the algorithm assigned (`0`, `7`, `12`), and they mean
nothing to a reader. Each group also has a `rank`: its place by size, 1 for the largest, ties
ordered by id. The run's summary, the legend of a color encoding over the groups, and a table
column of the group field (`PageColumn.ranks`, see [Result Columns](./result-columns#naming-a-community-in-a-table))
all carry the same rank for the same group, so name a group from its rank and every surface agrees:

```typescript
const result = await element.run("louvain");
await element.session.styles.encode({ run: result, channel: "node.color" });

for (const { group, size, rank } of result.summary().groups ?? []) {
    console.log(`Group ${rank}`, group, size); // "Group 1" 2 6 -- the largest group first
}

const block = element.session.styles.legend().find((entry) => entry.runId === result.runId);
for (const swatch of block?.swatches ?? []) {
    console.log(swatch.rank, swatch.value, swatch.color); // 1 2 "#e69f00" -- value === group
}
```

`SummaryGroup.name` ("Group 1") is deprecated and will be removed in the next major; word the
group from `rank` in your own language instead.

#### Hiding one group

`styles.setValueHidden(layerId, channel, value, hidden)` takes one group out of a layer's paint
and puts it back. `channel` says which field the value belongs to: the value is hidden in that
channel and in any other channel of the layer that reads the same field, while a channel sized or
colored by a different field keeps painting. The group's nodes are drawn as the layers beneath paint them, every other group keeps its
color, and the legend keeps the group's row, marked `hidden: true`, with the color it comes back
in. Each call is one undoable step, and the hidden list is part of the layer, so a saved project
keeps it:

```typescript
const layer = await element.session.styles.encode({ run: result, channel: "node.color" });
const [largest] = result.summary().groups ?? [];

await element.session.styles.setValueHidden(layer.id, "node.color", largest.group, true); // hide it
await element.session.styles.setValueHidden(layer.id, "node.color", largest.group, false); // paint it again
```

It works on any layer that encodes from the data, not only a run's: pass the `value` of a legend
swatch together with its block's `channel`. The values are stored on each binding as `hidden`, which you can also write yourself in a
layer you add.

#### How big the groups are

`summary().groups` lists the largest groups; a run with hundreds of communities needs their
spread instead. `result.groupSizes()` bins the groups by size and counts GROUPS, so the counts add
up to the number of groups. It returns the same `Histogram` `result.histogram(field)` does, so one
chart draws both: one bar per size when there are few distinct sizes (`binning: "per-value"`),
bands otherwise (`"banded"`):

```typescript
const result = await element.run("louvain");
const { bins, binning } = result.groupSizes();

for (const bin of bins) {
    console.log(bin.from, bin.to, bin.count); // groups of size from..to, and how many there are
}
```

It takes the same `{ bins, scale }` options as `histogram()`, and refuses a result that publishes
no groups (a measurement, a path) with `E_BAD_COMMAND`.

#### Is the grouping meaningful?

A community run publishes its modularity, and the run says how to read it. `band("modularity")`
returns which band of the score's scale the value falls in, so a consumer never hard-codes the
thresholds:

```typescript
const result = await element.run("louvain");
const band = result.band("modularity");

console.log(band?.id); // "clear"
```

Word the band yourself from its `id`:

| Band id  | Modularity                |
| -------- | ------------------------- |
| `clear`  | above 0.3                 |
| `weak`   | 0.1 to 0.3, both included |
| `barely` | below 0.1                 |

The 0.3 line is Newman and Girvan's ("Finding and evaluating community structure in networks",
Phys. Rev. E 69, 026113, 2004); the 0.1 line is graphty-element's convention for a split barely
better than a random one. The same scale and the citation are on the modularity field of the
algorithm's catalogue entry (`fields[].interpretation`), so it can be shown before anything has
run. `band()` returns `undefined` for a field with no scale or no finite value. A band's
`plainName` and `description`, and the scale's `summary`, are English and deprecated; they are
removed in the next major.

The result's [reading fact](#what-a-result-says) carries the band's id too, as `params.band`.

### Component Analysis

Find connected subgraphs:

| Algorithm              | Description                           |
| ---------------------- | ------------------------------------- |
| `connected-components` | Find all connected components         |
| `strongly-connected`   | Strong connectivity (directed graphs) |

On an undirected graph every edge runs both ways, so `strongly-connected` finds the same pieces as
`connected-components`.

```typescript
await graph.runAlgorithm("graphty", "connected-components");
```

### Traversal Algorithms

Explore the graph systematically:

| Algorithm | Description          |
| --------- | -------------------- |
| `bfs`     | Breadth-first search |
| `dfs`     | Depth-first search   |

```typescript
await graph.runAlgorithm("graphty", "bfs", { startNode: "node1" });
```

### Shortest Path

Find optimal paths between nodes:

| Algorithm        | Description                               |
| ---------------- | ----------------------------------------- |
| `dijkstra`       | Shortest path (weighted)                  |
| `bellman-ford`   | Handles negative weights                  |
| `astar`          | A route, optionally steered by the layout |
| `floyd-warshall` | Distance between every pair               |

```typescript
await graph.runAlgorithm("graphty", "dijkstra", {
    source: "node1",
    target: "node5",
});
```

`astar` takes the same `source` and `target` as `dijkstra`, and a `heuristic`. The default,
`"none"`, estimates nothing, so the route is exactly the one `dijkstra` finds. `"layout-distance"`
steers the search by the straight-line distance between the nodes' current positions. That is
faster on a laid-out graph, but the route is the cheapest only when every edge weighs at least the
distance it spans; the result says so with `caveats.exact: false`.

```typescript
await element.run("astar", { source: "node1", target: "node5", heuristic: "layout-distance" });
```

`floyd-warshall` measures every pair of nodes, so it holds a matrix of n x n distances. It refuses
a run over more than 5,792 nodes with a `GraphtyError` whose code is `E_TOO_LARGE` (the details
carry `nodeCount` and `limit`) before any of the matrix is allocated; run it over a smaller scope.

When the graph has a negative cycle no distance between two nodes is defined, so `floyd-warshall`
publishes no node values and no `diameter` or `radius`: the result carries only
`hasNegativeCycle: true`. It treats every edge as undirected, so a single edge with a negative
weight is already a negative cycle -- cross it and come back.

### Spanning Tree

Find minimum spanning trees:

| Algorithm | Description         |
| --------- | ------------------- |
| `prim`    | Prim's algorithm    |
| `kruskal` | Kruskal's algorithm |

```typescript
await graph.runAlgorithm("graphty", "prim");
```

### Flow Algorithms

Network flow analysis:

| Algorithm  | Description                |
| ---------- | -------------------------- |
| `max-flow` | Maximum flow between nodes |
| `min-cut`  | Minimum edge cut           |

```typescript
await graph.runAlgorithm("graphty", "max-flow", {
    source: "source",
    sink: "sink",
});
```

## Accessing Results

A run hands back its own result. Nothing has to be found by walking the graph:

```typescript
const result = await element.run("degree");

// One element
console.log(result.node("node1")?.value);

// The shape of the whole thing, computed once
const summary = result.summary();
console.log(summary.max, summary.min, summary.top[0].id);
```

The same values are published as columns under the run's id, which is what a style layer and a
filter read: `results.<runId>.value`. A table reads them the same way, a page of records at a
time, sorted by the run's values -- see [Result Columns](./result-columns).

### A result that stopped early

A run that stopped before it finished still succeeds and publishes what it had. `run.partial` (and
`run.record.partial`) is `true`, and `run.caveats.partialCause` says why, as a code and its
values, whatever stopped it: a `timeBoxMs` box, a cancellation, a batch that did not finish, or an
algorithm reporting that it reached its own iteration cap (a
[custom algorithm](./extending/custom-algorithms) does that with `converged(false, iterations)`).
The two always agree, so a consumer that marks unfinished results reads `partial` alone:

```typescript
const run = element.run("betweenness", {}, { timeBoxMs: 200 });
await run;

if (run.partial) {
    console.log(run.caveats.partialCause); // { code: "partial.time-box", params: { ms: 200 } }
}
```

The codes are in the [table below](#why-a-run-stopped-early). `run.caveats.partialReason`, the
same cause as an English sentence, is deprecated and removed in the next major.

## What a result says

graphty-element does not write sentences for a reader. What a run has to say about its own numbers
comes as facts -- a `code` and the values it is about, in `params` -- and you word each one, in
your own language, or leave it out. Switch on `code`, and treat a code you do not know as something
to leave out: a minor release may add codes.

### What the result means

`result.readingFact()` is the one fact a result's figures add up to, one code per result shape:

```typescript
const result = await element.run("louvain");

console.log(result.readingFact());
// { code: "reading.groups", params: { groups: 4, largest: 12, measured: 34, modularity: 0.41, band: "clear" } }
```

| Code                   | Shape                                   | `params`                                                                                                  |
| ---------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `reading.metric`       | node or edge metric                     | `field`, `leader` (id), `leaderLabel`, `highest`, `median`, `lowest`, `tiedAtLowest`, `measured`, `count` |
| `reading.metric-empty` | a metric that measured nothing          | `field`                                                                                                   |
| `reading.groups`       | community, layered grouping, categories | `groups`, `largest`, `measured`, `modularity` (or null), `band` (a band id, or null)                      |
| `reading.groups-empty` | a partition that grouped nothing        | none                                                                                                      |
| `reading.path`         | a route                                 | `hops`, `cost` (each a number or null)                                                                    |
| `reading.path-none`    | a path result with neither              | none                                                                                                      |
| `reading.set`          | node or edge set                        | `count`, `element` (`"node"` or `"edge"`)                                                                 |
| `reading.pairs`        | pair list                               | `count`                                                                                                   |
| `reading.series`       | temporal series                         | `steps` (0 when empty)                                                                                    |
| `reading.coverage`     | any other shape                         | `measured`, `count`                                                                                       |

`result.reading()`, the element's English sentence for the same fact ("4 groups were found, the
largest holding 12 of 34. Modularity is 0.41 (clearly separated)."), its `ReadingOptions` and
`defaultReading` are deprecated and removed in the next major.

### What qualifies the numbers

`run.caveats.facts` holds one fact per remark about the numbers, in the order a reader reads them:

```typescript
const run = element.run("pagerank", { dampingFactor: 0.9 });
await run;

console.log(run.caveats.facts);
// [{ code: "pagerank.damping", params: { dampingFactor: 0.9 } },
//  { code: "pagerank.sums-to-one", params: {} }, { code: "weights.unread", params: {} }]
```

A node id in `params` is the data's own id, a string or a number. `run.caveats.notes`, the same
remarks as English sentences, is deprecated and removed in the next major; an algorithm registered
from outside the element that writes its own `notes` in words has no facts for them.

| Code                                 | What it says, and its `params`                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weights.unread`                     | edge weights were not read.                                                                                                                                                                     |
| `route.found`                        | the run measured the route between two nodes: `{ source, target }`.                                                                                                                             |
| `route.none`                         | no route runs between two nodes: `{ source, target }`.                                                                                                                                          |
| `iteration.stop-rule`                | iteration stops at a tolerance or a pass count, whichever comes first: `{ tolerance, maxIterations }`.                                                                                          |
| `iteration.cap-reached`              | it stopped at the pass cap without reaching the tolerance: `{ maxIterations }`.                                                                                                                 |
| `partition.unscored`                 | the algorithm does not score its own partition, so it reports no modularity: `{ algorithm }`, its catalog key.                                                                                  |
| `community.resolution`               | the resolution the partition was found at: `{ resolution }`.                                                                                                                                    |
| `paths.counted-exactly`              | every shortest path was counted exactly, over the graph read as undirected.                                                                                                                     |
| `paths.hop-lengths`                  | path lengths count edges, and edge weights were not read.                                                                                                                                       |
| `tree.edge-count`                    | the spanning tree's size: `{ edges }`.                                                                                                                                                          |
| `scope.whole-graph`                  | computed on the whole graph, values kept for the scope only.                                                                                                                                    |
| `scope.induced-subgraph`             | computed on the subgraph the scope's nodes induce: `{ nodes }`.                                                                                                                                 |
| `scope.subgraph`                     | computed on the scope's nodes and edges: `{ nodes, edges }`.                                                                                                                                    |
| `parallel-edges.merged`              | parallel edges were merged into one, every member of a group carrying the merged value: `{ count, policy }`, how many were merged and how their weights combined (`"sum"`, `"min"` or `"max"`). |
| `input.empty`                        | the graph held nothing for the algorithm to measure.                                                                                                                                            |
| `sampled.instead-of-exact`           | the run sampled rather than computed exactly: `{ method, name, sampleSize, nodes }`, the approximate method's id and catalog name, the sample, and the nodes it was drawn from.                 |
| `sampled.exact-past-cap`             | an exact run was estimated past the cost cap, so the approximate method ran: `{ seconds, cap }`.                                                                                                |
| `sampled.still-past-cap`             | the sampled run is itself estimated past the cap: `{ seconds, cap }`.                                                                                                                           |
| `astar.straight-line`                | A* was steered by straight-line distance, so its route is the cheapest only when every edge weighs at least the distance it spans.                                                              |
| `betweenness.sampled`                | betweenness was estimated from sampled sources, unscaled: `{ sources, nodes }`.                                                                                                                 |
| `betweenness.halved`                 | the raw counts were halved, because an undirected shortest path is reached from both ends.                                                                                                      |
| `edge-betweenness.sampled`           | edge betweenness was estimated from sampled sources, unscaled: `{ sources, nodes }`.                                                                                                            |
| `bfs.origin`                         | the walk went outwards from a node, which is level 0: `{ source }`.                                                                                                                             |
| `bfs.target-reached`                 | the walk stopped at its target: `{ target }`.                                                                                                                                                   |
| `bfs.target-unreached`               | the walk never reached its target, so it covered everything reachable: `{ target }`.                                                                                                            |
| `dfs.walk`                           | the walk's start and when it recorded a node: `{ source, order }`, `order` `"pre"` (as reached) or `"post"` (as left).                                                                          |
| `closeness.sampled`                  | closeness was estimated from sampled sources, unscaled: `{ sources, nodes }`.                                                                                                                   |
| `closeness.exact`                    | distances are exact, over the graph read as undirected.                                                                                                                                         |
| `closeness.hop-distances`            | distance counts edges, and edge weights were not read.                                                                                                                                          |
| `closeness.reciprocal`               | a score is the reciprocal of the summed distance, uncorrected for how many nodes are reachable.                                                                                                 |
| `clustering-coefficient.local`       | each value is the node's local clustering coefficient.                                                                                                                                          |
| `clustering-coefficient.simple`      | the graph was read as simple and undirected.                                                                                                                                                    |
| `components.weak`                    | weak components: an edge joins its two nodes whichever way it points.                                                                                                                           |
| `components.strong`                  | strong components: a directed path must run each way.                                                                                                                                           |
| `components.undirected-strong`       | the graph is undirected, so its strong components are its connected ones.                                                                                                                       |
| `degree.as-declared`                 | degree was counted as the records declared the edges.                                                                                                                                           |
| `eigenvector.converged`              | power iteration converged: `{ tolerance, maxIterations }`.                                                                                                                                      |
| `eigenvector.scored-by`              | which nodes score a node: `{ mode }`, `"in"` (the nodes pointing at it) or anything else (the nodes it points at).                                                                              |
| `floyd-warshall.eccentricity`        | every pair was measured, and a node's value is its eccentricity.                                                                                                                                |
| `flow.ends`                          | the flow measured: `{ source, sink }`.                                                                                                                                                          |
| `flow.ends-chosen`                   | the source or sink was chosen automatically.                                                                                                                                                    |
| `flow.no-path`                       | no directed path runs from source to sink: `{ source, sink }`.                                                                                                                                  |
| `girvan-newman.no-cut`               | no edge could be cut, so every node is its own community.                                                                                                                                       |
| `girvan-newman.best-of`              | the best of several successive cuts was kept: `{ cuts }`.                                                                                                                                       |
| `hierarchical.hop-distances`         | distances are hop counts, and edge weights were not read.                                                                                                                                       |
| `hierarchical.fewer-clusters`        | fewer clusters than asked for: `{ asked, allowed }`.                                                                                                                                            |
| `hits.published-score`               | which HITS score is the published value: `{ mode }`, `"in"` (authority), `"out"` (hub) or `"total"` (their average).                                                                            |
| `hits.unit-length`                   | the hub and authority vectors have unit length.                                                                                                                                                 |
| `hits.max-scaled`                    | the hub and authority vectors were divided by their own highest score.                                                                                                                          |
| `k-core.undirected`                  | counted over the graph read as undirected; edge weights not read.                                                                                                                               |
| `k-core.loops-and-parallels`         | a self-loop does not count, and parallel edges count once.                                                                                                                                      |
| `katz.attenuation`                   | every node's base influence and the per-step attenuation: `{ beta, alpha }`.                                                                                                                    |
| `katz.direction`                     | which way paths were counted: `{ mode }`, `"in"`, `"out"` or `"total"`.                                                                                                                         |
| `link-prediction.candidates`         | only unjoined pairs sharing a neighbor were scored.                                                                                                                                             |
| `matching.not-bipartite`             | the graph has no two sides, so nothing was paired.                                                                                                                                              |
| `matching.partnered`                 | how many nodes found a partner: `{ count }`.                                                                                                                                                    |
| `min-cut.karger`                     | Karger's method is randomized.                                                                                                                                                                  |
| `min-cut.sides`                      | the size of each side of the cut: `{ first, second }`.                                                                                                                                          |
| `min-cut.end-chosen`                 | only one end was set, so the other was chosen: `{ source, sink }`.                                                                                                                              |
| `negative-cycle.no-distance`         | a negative cycle leaves no distance defined, so none was published.                                                                                                                             |
| `negative-cycle.no-route`            | a negative cycle makes every distance past it meaningless, so no route is marked.                                                                                                               |
| `pagerank.damping`                   | the probability of following a link: `{ dampingFactor }`.                                                                                                                                       |
| `pagerank.sums-to-one`               | the ranks sum to 1.                                                                                                                                                                             |
| `pagerank.undirected`                | the graph is undirected, so every edge carries rank both ways.                                                                                                                                  |
| `pagerank.personalized`              | the random jump lands on the personalization vector's nodes.                                                                                                                                    |
| `pagerank.personalization-unmatched` | no personalization entry applies, so the jump lands anywhere.                                                                                                                                   |
| `pagerank.personalization-outside`   | personalization entries naming nodes outside the graph were left out: `{ count }`.                                                                                                              |

### Why a run stopped early

`run.caveats.partialCause` is present when `run.partial` is true and the element knows why:

| Code                       | What stopped it                                          | `params`                                                  |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `partial.iteration-cap`    | the algorithm stopped at an iteration cap the caller set | none                                                      |
| `partial.time-box`         | the run's `timeBoxMs` ran out                            | `ms`                                                      |
| `partial.canceled`         | the run was canceled and published what it had           | `reason` (the text given to `cancel()`, or null), `runId` |
| `partial.stopped`          | the work stopped early without saying why                | none                                                      |
| `partial.batch-incomplete` | a batch stopped before every member finished             | `completed`, `total`                                      |

## Running over part of the graph

The `scope` option runs an algorithm over part of the graph -- a kept [set](./sets), the
selection, or anything else a scope names -- and the run computes over that subgraph alone:

```typescript
const team = element.session.sets.create({ kind: "fixed", nodes: ["a", "b", "c", "d"], reading: "induced" });

const run = element.run("pagerank", {}, { scope: { set: team } });
await run;

console.log(run.caveats.facts); // [{ code: "scope.induced-subgraph", params: { nodes: 4 } }]
console.log(run.record.scope.set); // the set's id, and its revision when the run read it
```

- **Only the scope's elements get values.** A node outside the scope has no value from the run,
  so it is left out of the ranking, the summary and any layer painting the run.
- **The caveat says what was computed on**, so the number can be reproduced: the induced subgraph
  of N nodes, or the N nodes and M edges in scope when the scope lists its edges.
- **A node option must be inside the scope.** Dijkstra's `source` naming a node outside it is
  refused with `E_OPTION_RANGE`; with no `source` and `target`, a scoped run takes the scope's
  first and last nodes.
- **A registered algorithm that does not read scopes** runs over the whole graph, keeps only the
  scope's values, and says so: "Computed on the whole graph; values kept for the scope only."
  `session.catalog.algorithms()` publishes which is which as `scopeInput`.

With no `scope`, a run is over `"visible"`: the whole graph, or what the visibility filter shows.

### Options for this graph

`session.catalog.algorithms()` and `session.catalog.layouts()` describe every option as plain data,
but some of what a form needs depends on the graph: which node a "start node" picker should offer,
or how high a slider bounded by the node count should go. `session.catalog.optionsFor(key, scope)`
answers that for one algorithm or layout over a scope:

```typescript
const options = await element.session.catalog.optionsFor("bfs", { set: team });

for (const option of options) {
    if (option.type === "node-id") {
        console.log(option.values); // [{ value: "a", label: "a" }, ...]: the nodes in the scope
    }
}
```

- **Node options list real nodes.** A `node-id` or `node-set` option comes back with `values`: one
  choice per node in the scope, in graph order. Its `value` and `label` are the node id as a
  string, so a numeric id `7` is listed as `"7"`.
- **Bounds that depend on the data are measured.** An option whose `min` or `max` is a reference
  such as `{ from: "graph.nodeCount" }` comes back with the number measured over the scope. The
  references are listed in `OPTION_BOUND_SOURCES`: `graph.nodeCount`, `graph.edgeCount`,
  `graph.maxDegree`, `graph.maxCore` and `graph.componentCount`. A reference it does not know is
  left as written.
- **Everything else is the static descriptor's**, unchanged.
- `key` is an algorithm key or a layout id. With no `scope`, it measures the default run scope
  (`"visible"` unless the session was created with another). A key nothing registers is refused
  with `E_UNKNOWN_ALGORITHM`.

**A run's id names its result, in words.** A run you do not name with `as:` is named after its
algorithm -- `results.degree.value`, `results.pagerank.value`, `results.shortest_path.onPath` --
and an algorithm whose settings change what its result means adds the setting once it leaves its
default: `results.louvain_resolution_1_5.group`, or `results.pagerank_damping_0_9.value`. The
built-ins name PageRank's damping, Katz's alpha, the direction of eigenvector centrality and HITS,
the resolution of Louvain and Leiden, the strength of components, and the method of shortest path
and link prediction.

**What to call a run is yours to word.** A run (and its `record`, its entry in `results.roots`)
carries the facts a name is made from: its `algorithm`, whose catalog `plainName` is the
algorithm's default name; `distinguishedBy`, the one setting its id was named after, once it left
its default (`{ option: "resolution", value: 1.5 }`, or `null`); and `siblingsDifferBy`, what tells
it apart from the other listed runs of the same algorithm that would otherwise go by the same name:
the options whose values differ, sorted, an empty list when only the scope differs, or `null` while
no other run shares the name.

```typescript
const run = element.run("louvain", { resolution: 1.5 });
const name = element.session.catalog.algorithms().find((entry) => entry.key === run.algorithm)?.plainName;

console.log(name, run.distinguishedBy); // "Communities" { option: "resolution", value: 1.5 }
console.log(run.siblingsDifferBy); // null: no other Communities run yet
```

`run.label` ("Communities (resolution 1.5)") is the element's own English for the same facts. It is
deprecated, with the `label` of a run's record, of a `ResultRoot` and of an `EncodingRun`, and
removed in the next major.

Starting the same run again finds the same result: same algorithm, same name, and the same scope
-- with `"visible"` and `"selection"` frozen to the filter and the selection in force when the run
started -- whether it is exact or sampled. A setting the name does not carry (the iteration cap,
the seed) re-runs that result in place, and every layer bound to it repaints from the new values.
A different computation that would take a name already in use gets `_2`, `_3`, ...: degree over
the whole graph is `degree`, and degree over a set after it is `degree_2`. An id never changes
once given, and a name passed with `as:` always wins, so to keep two runs side by side under names
of your own, name them with `as:`.

**This changed in 3.6.** Before, an unnamed run's id was the algorithm and a hash of its result,
such as `degree_0bkzd1n0p2dnik`. Ids already saved in that form keep working; only new runs get
readable names.

**This changed in 2.5.** Before, a run recorded its scope but computed over the whole graph, so a
run scoped to less than the graph -- including a default run while a visibility filter was hiding
something -- reported values that contradicted its own record. It now computes over its scope, so
those values differ from 2.4's.

A finished result also offers sets -- one per community, one for a path -- that can be kept or
used as the next run's scope. See [Sets a result offers](./sets#sets-a-result-offers).

## Suggested Styles

A run paints itself on its first completion. For a run started with `{style: false}`, or to put a
picture back after a reader cleared it, ask for the suggestion again:

```typescript
await element.run("degree");

element.applySuggestedStyles("degree");

// Only when you need the finished picture, for a screenshot or an export:
await element.waitForStableFrame();
```

This automatically maps algorithm results to visual properties like color and size.
`applySuggestedStyles` returns `true` or `false` straight away and paints in the background;
`waitForStableFrame()` settles once the suggested layers are stacked and painted.

## Custom Styling with Algorithm Results

A run publishes its measurements under its own id, so a layer reads them the way it reads any
other column -- `results.<runId>.<field>`:

```typescript
const run = await element.run("degree");

// Highlight high-degree nodes
await element.session.styles.add({
    name: "Hubs",
    target: "node",
    selector: { match: "expression", where: `results.${run.id}.value > \`10\`` },
    set: { "node.color": "#E74C3C", "node.size": 2 },
});
```

**Select only the elements the run measured.** A layer that matched everything would run its
expression over nodes the algorithm has nothing to say about, and whatever the expression
returned for them would be painted onto them.

## Encoding a result onto a channel

For a ramp or a palette across everything a run measured, bind the channel to it rather than
writing out a rule per element. The scale, the palette and the extent all default to something
that suits the field:

```typescript
const run = await element.run("pagerank");

// Size every measured node by its rank, on one call
await element.session.styles.encode({ run, channel: "node.size" });

// And colour it, through a palette of your choosing
await element.session.styles.encode({ run, channel: "node.color", palette: "viridis" });
```

`encode()` replaces the layer already painting that channel from that run, so running the
algorithm again leaves one layer and one legend block rather than two.

On `node.size`, a measurement is drawn from 1 (the default size) to 3, and on `edge.width` from
the default edge width to twice it, unless you pass `range` -- the same defaults a column of
amounts gets -- and that range is written into the
layer, so `styles.get(layer.id)` and a saved project show it:

```typescript
await element.session.styles.encode({ run, channel: "node.size" }); // range [1, 3]
await element.session.styles.encode({ run, channel: "node.size", range: [1, 5] });
```

### Sizing by a measurement in one flag

A node measurement -- PageRank, degree, betweenness and the rest -- can size the nodes as well as
colour them, asked for when the run starts:

```typescript
// Colour AND size by PageRank. Sizes run from 1 (the default node size) to 3.
element.run("pagerank", {}, { style: { size: true } });

// Or pick the range
element.run("pagerank", {}, { style: { size: [1, 5] } });
```

`style: true` (the default) paints the colour alone and `style: false` paints nothing. For an
edge measurement, such as max flow or edge betweenness, `size` draws edge width instead: `size:
true` runs from the default edge width to twice it, and `[min, max]` is in edge width units.

```typescript
// Colour AND widen each edge by the flow it carries.
element.run("max-flow", { source: "a", sink: "z" }, { style: { size: true } });
```

`size` is ignored for a result that is not a measurement -- a community has no amount to size by.
The size layer paints only the elements the run measured and is removed with the run.

### Running algorithms when the data loads

`algorithmsOnLoad` lists algorithms to run once the data has loaded, and `runAlgorithmsOnLoad`
switches the list on. An entry is an algorithm name -- a catalogue key such as `"degree"` or a
1.x address such as `"graphty:degree"` -- or an object carrying the same run options
`element.run()` takes. The list is a property, set from script; the switch is also the
`run-algorithms-on-load` attribute:

```typescript
element.algorithmsOnLoad = ["degree", { algorithm: "pagerank", style: { size: [1, 5] } }];
element.runAlgorithmsOnLoad = true;
```

| Option      | Meaning                                                            |
| ----------- | ------------------------------------------------------------------ |
| `algorithm` | Required. The algorithm, as a name above                           |
| `params`    | Its parameters, as `run()` takes them                              |
| `style`     | What it paints: `true`, `false`, or `{ size: true \| [min, max] }` |
| `seed`      | The seed for a randomised method, so the load is reproducible      |
| `as`        | The run's id, for a saved document or a later `session.runs.get()` |

The other `run()` options are not accepted here, because each one answers a question nobody can
ask before the data arrives: `signal`, `onProgress` and `queue` steer a run someone is watching,
`scope` names a view of data that does not exist yet, and `timeBoxMs`, `exact` and `sample`
respond to a cost estimate. Start the run yourself when you need them. A misspelled or malformed
entry is refused with a `GraphtyError` coded `E_BAD_COMMAND` that names the entry and its position.

### More groups than colours

The default palette for groups, Okabe-Ito, has eight colours that stay apart for every kind of
colour vision. When a community run finds more groups than that, `encode()` decides with
`overflow`:

```typescript
// Default: the 8 largest groups keep their colours; the rest share one grey,
// and the legend lists that grey as its last row, with role: "other" and its count
await element.session.styles.encode({ run, channel: "node.color" });

// Cycle the colours and change node shape on each cycle: group 9 is orange again, as a box
await element.session.styles.encode({ run, channel: "node.color", overflow: "shape" });

// A colour per group, however many -- past eight they are not guaranteed to be told apart
await element.session.styles.encode({ run, channel: "node.color", overflow: "extend" });
```

`"shape"` is for nodes only; an edge encoding refuses it. If you name a `palette` and no
`overflow`, a palette too small for the groups is refused with `E_CAP_EXCEEDED` rather than
folded, because you asked for exactly those colours; name an `overflow` as well to apply it.

## Multiple Algorithms

Run several and let each paint a channel of its own:

```typescript
const degree = await element.run("degree");
const communities = await element.run("louvain");

await element.session.styles.encode({ run: communities, channel: "node.color" });
await element.session.styles.encode({ run: degree, channel: "node.size" });
```

Layers stack, so the two do not fight: one decides colour, the other decides size, and
`session.styles.legend()` describes both.

### What a run painted

A run's suggested style is not always painted: a layer you wrote that already colors every node
holds it back. `session.runs.painting(runId)` reports what happened to each suggestion. See
[What a Run Painted](./run-painting).

## Custom Algorithms

Create your own algorithms. See [Custom Algorithms](./extending/custom-algorithms) for details.

## Interactive Examples

- [Centrality Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-centrality--degree)
- [Community Detection](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-community--louvain)
- [Components](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-component--connected-components)
- [Shortest Path](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-shortest-path--dijkstra)
- [Traversal](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-traversal--bfs)
- [Spanning Tree](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-spanning-tree--prim)
- [Combined Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-combined--centrality-vs-community)
