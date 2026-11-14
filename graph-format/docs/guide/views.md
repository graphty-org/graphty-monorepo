# Views and derived graphs

## Views

A **view** is something computed from the graph that many algorithms need: degrees, the reversed
edges, a flat edge list. Each is computed the first time you ask, then kept and shared, so the
second call is free. Because a view is shared, never write into one; call `.slice()` first if you
need a copy to change.

<<< ../examples/views.ts

| Method                                                            | Returns                      | Notes                                                      |
| ----------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `outDegree()` / `inDegree()` / `degree()`                         | `Uint32Array(n)`             | `degree()` counts an undirected self-loop twice            |
| `weightedOutDegree()` / `weightedInDegree()` / `weightedDegree()` | `Float64Array(n)`            |                                                            |
| `reverse()`                                                       | `ReverseView`                | incoming arcs; for an undirected graph, the forward arrays |
| `coo()`                                                           | `CooView`                    | the source of every arc, beside `colIdx`                   |
| `edgeList()`                                                      | `EdgeListView`               | each edge once, in the direction it was declared           |
| `selfLoopWeight()` / `totalWeight()`                              | `Float64Array(n)` / `number` |                                                            |
| `selfLoopArcs()` / `selfLoopsPerNode()` / `selfLoopsAt(u)`        | `Uint32Array`                |                                                            |
| `mate()`                                                          | `Uint32Array`                | undirected only: the arc stored at the other end           |
| `degreeOrder()`                                                   | `DegreeOrderView`            | nodes ordered by degree, for load balancing on a GPU       |
| `isSymmetric()`                                                   | `boolean`                    | whether every arc has a reverse arc                        |

`prepare(names)` computes a list of views ahead of time, `dropCaches()` frees them and
`cachedViews()` lists the ones in memory.

## Derived graphs

A **derived graph** is a new snapshot made from an existing one. Each method returns a
`DerivedGraph`: the new `snapshot`, and maps between the two index spaces, each `null` when the
indices did not change:

- `nodeOrigin[newIndex]` and `edgeOrigin[newIndex]`: where each node or edge came from;
- `nodeRemap[oldIndex]` and `edgeRemap[oldIndex]`: where each one went, or `INVALID_INDEX` when it
  was dropped.

| Method                                 | Nodes         | Edges | What it does                                                              |
| -------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------- |
| `toUndirected(options?)`               | same          | new   | merges `a -> b` with `b -> a`; `reciprocal: true` keeps only mutual pairs |
| `transpose()`                          | same          | same  | reverses every edge, without copying                                      |
| `simplified(options?)`                 | same          | new   | one edge per pair of nodes                                                |
| `withoutSelfLoops()`                   | same          | new   |                                                                           |
| `filterEdges(mask)`                    | same          | new   | keeps the edges whose bit is set                                          |
| `inducedSubgraph(indices \| { mask })` | new           | new   | the chosen nodes and the edges between them                               |
| `contract(partition, options?)`        | one per group | new   | merges each group of nodes into one node (as Louvain and Leiden do)       |
| `relabel(perm)`                        | reordered     | same  | `perm[newIndex] = oldIndex`                                               |
| `withColumns(nodes?, edges?)`          | same          | same  | shares the graph, with a separate set of columns                          |

A **mask** is a packed bit set, one bit per node or edge. `makeMask(n)`, `maskSet()`,
`maskTest()`, `maskAnd()`, `maskOr()`, `maskNot()`, `maskCount()` and `maskToIndices()` build and
combine them.

## Pointing at nodes

Functions in algorithms and layout that take a node accept a `NodeRef`: an index, or `{ id }` for
one of your own ids. Those that take a set of nodes accept a `NodeSet`: an array of indices,
`{ mask }` or `{ ids }`. `resolveNode()`, `resolveNodeSet()` and `resolveNodeMask()` turn them into
indices, so a function of your own can accept them the same way.
