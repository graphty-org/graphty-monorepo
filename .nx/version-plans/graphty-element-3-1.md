---
graphty-element: minor
---

Run the built-in algorithms on the graph snapshot, give plugin algorithms a snapshot accessor, and fix algorithm results

Features:

- A plugin algorithm reads its graph through `context.input(orientation)`: the snapshot, the scope's masks, `subgraph()`, `input.edgeId(row)` and `input.subgraphEdgeIds(row)` for edge ids, `input.column(option)` for declared attribute and partition options, and the `weight` input option. `./extend` also exports `edgeMetricFields`, `Column` and `WeightMeaning`.
- `closeness` takes `k` to sample that many source nodes on a big graph; the result says so in `caveats.exact` and `caveats.sampleSize`.
- `@graphty/graph-format` is a regular dependency only, no longer also a peer dependency, so a consumer does not install it alongside.
- With `@graphty/webgpu-graph-algorithms` installed, `betweenness` and `floyd-warshall` run on the GPU from a few hundred nodes. `clustering-coefficient` and `label-propagation` are routed too, but their measured floor, 100,000 nodes, is above the 50,000 the element draws, so today they reach the GPU only through `acceleration-min-nodes` or `acceleration="required"`. Each run says which path answered in `caveats.precision`. The floors of every accelerated algorithm were re-measured against the new CPU implementations: `pagerank` now goes to the GPU from 10,000 nodes and `closeness` from 4,000. The acceleration guide lists every floor.
- `betweenness` takes `k` to sample that many source nodes, as `closeness` does.
- `clustering-coefficient` runs: each node's local clustering coefficient and triangle count, and the graph's transitivity and triangle total. It is no longer in `DEPRECATED_ALGORITHMS`.
- `label-propagation` runs synchronous passes when no `randomSeed` is set, which is now the default. A GPU runs the same rule, so a large graph can go to the GPU. Set `randomSeed` for the previous seeded, one-node-at-a-time algorithm, which always runs on the CPU. The partition a run without a seed returns can differ from the old default's.

Deprecated (removed in 4.0):

- `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type keep working and return the same object graph as 3.0. In TypeScript, `AlgorithmGraphView` is no longer the `@graphty/algorithms` 2.x `Graph` type itself, so a plugin passing it to its own `@graphty/algorithms@2` functions needs a cast to compile; run time is unchanged. Move to `context.input(...).subgraph()`; the custom-algorithms guide maps each old call to its replacement.
- `SimpleLayoutEngine`: a one-pass layout is now registered with `registerSnapshotLayout`.

Fixes (the migration guide, "Algorithm results fixed in 3.x", lists every one):

- PageRank and strongly connected components on an undirected graph read every edge both ways.
- Prim and Bellman-Ford break equal-cost ties by edge order; Bellman-Ford marks no route through a negative cycle.
- A node option naming no node (a BFS target, a DFS source or target, a Bellman-Ford source or target, a Prim start node) is refused with `E_OPTION_RANGE` instead of being silently ignored; so are `source` equal to `sink` in max flow and min cut, and `endpoints: true` on HITS, Katz and eigenvector centrality.
- k-core, Louvain, label propagation, HITS and Katz modes, max flow, min cut, Karger, bipartite matching, Floyd-Warshall and Adamic-Adar results are corrected as the guide describes.
- DOT, GML and Pajek files load through `@graphty/graph-io`, as Graphviz, NetworkX and Pajek define them; the data-sources guide, "Changes in graphty-element 3.1", lists the edge cases that load differently.
