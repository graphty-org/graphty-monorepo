# Finishing the graph-format consumer migration

This plan finishes the consumer migration that `graph-format-design.md` section 14 describes: moving
`@graphty/algorithms`, `@graphty/layout`, `@graphty/graphty-element` and `@graphty/graph-io`'s
consumers off the legacy object graph and onto the frozen `GraphSnapshot`. It was checked against
`origin/master` at `b109fac2` on 2026-09-27. `STATUS.md` in this directory records the state it
starts from; this file says what is left, in what order, and how "finished" is proven.

All work lands on the integration branch `feat/graph-format-migration`. Each work item below is
sized for one agent in its own worktree branched from that integration branch, and merges back into
it. The integration branch reaches master through ordinary pull requests.

## 1. Where the migration stands

Package versions on master: graph-format 1.1.0, graph-io 0.3.7, algorithms 2.1.0, layout 1.10.3,
graphty-element 2.6.0, webgpu-graph-algorithms 0.6.10, graph-samples 0.1.5, graphty 0.8.16.

| Design phase (14.6)            | State on master                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1, F2 (graph-format)          | Done. 1.0.0 cut 2026-09-18, now 1.1.0.                                                                                                                                                                                                                                                                                                                            |
| A1 (algorithms `toSnapshot`)   | Done, inside the accelerator seam work (algorithms 1.8.0). `algorithms/src/indexed/to-snapshot.ts`, `Graph.mutationCount` in `algorithms/src/core/graph.ts`, differential harness in `algorithms/test/helpers/snapshot-differential.ts`.                                                                                                                          |
| A2 (algorithms ports, facades) | About one eighth done. 11 `indexed.*` functions in `algorithms/src/indexed/` (bfs, commonNeighborsScore, connectedComponents, weaklyConnectedComponents, dijkstra, hits, kCoreDecomposition, katzCentrality, louvain, kruskalMST, pageRank). Two more on local branches (section 4). No legacy function delegates to a port and none accepts a snapshot.          |
| L1 (layout)                    | The simulation half is done (`layout/src/simulation/`, `toLayoutSnapshot`, ForceAtlas2 and Fruchterman-Reingold simulations). No `indexed` namespace, no position helpers, 15 of 16 positional layouts on legacy internals.                                                                                                                                       |
| E1 (graphty-element)           | Data layer done (`graphty-element/src/data/GraphStore.ts` owns the builder; positions are an element-owned column). 5 of 25 algorithm adapters use the dispatcher; 20 still build a legacy `Graph` through `algorithmGraph()`. 13 static layout engines call positional layout functions. `EdgeMap` survives. On-load algorithms still start once per data chunk. |
| W1 (webgpu-graph-algorithms)   | Done.                                                                                                                                                                                                                                                                                                                                                             |
| IO1 (graph-io + element)       | graph-io half done (eight formats, corpus, benchmark). The element half has not started: the seven element `DataSource` classes still parse files themselves, and the element has no exporter.                                                                                                                                                                    |
| D1 (deprecations)              | Not started.                                                                                                                                                                                                                                                                                                                                                      |
| "2.0" (removal of legacy APIs) | Not started. The version numbers are now algorithms 3.0.0 and layout 2.0.0 (section 2).                                                                                                                                                                                                                                                                           |

## 2. Design statements that later decisions or facts have superseded

Each row names the design text, what replaced it, and the evidence. The design document carries a
matching note at each place (decision log entry 17.9); the original text is kept.

| Design text                                                                                                                        | Superseded by                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 14.6: A1 on its own branch, gating F2, then merged                                                                                 | A1 landed inside the WebGPU seam work after F2 was cut without it.                                                                                                                                                                                                                                                                                                                              | `design/decisions/2026-09-19-a1-lands-inside-m8a.md`; algorithms CHANGELOG 1.8.0; 17.7 D-F2-GATE                               |
| 14.6 row "2.0" and every "at 2.0" in 14.1-14.3 and section 18                                                                      | algorithms already published 2.0.0 (2026-09-24) for an unrelated break (eigenvector throws `ConvergenceError`). The removal release is algorithms 3.0.0 and layout 2.0.0. It also retires 14.1 rule 1's "no result type changes during the window", which 2.0.0 already broke once.                                                                                                             | `algorithms/package.json` 2.1.0; algorithms CHANGELOG 2.0.0                                                                    |
| 14.1 rule 1 and 14.6 A2: every legacy function becomes a facade whose results equal legacy within 1e-9                             | A legacy function delegates to its port only when the port's results equal legacy (the differential test is exact, or within 1e-9 for f64 scores). A port that differs on purpose leaves its legacy function on legacy code until the removal release, unless the owner approves the change. The owner approved it for `labelPropagation` and the three Floyd-Warshall functions (section 4.3). | `algorithms/src/indexed/louvain.ts` lines 290-293 ("not move-for-move identical"); both port designs (section 4)               |
| 14.6 A2: "all 95+ functions ported"                                                                                                | The package barrel exports 90 legacy algorithm functions plus 3 algorithm classes (DeltaPageRank, PriorityDeltaPageRank, DirectionOptimizedBFS). Section 5 covers every one.                                                                                                                                                                                                                    | `algorithms/src/index.ts`                                                                                                      |
| 14.2: the Map-of-Maps overloads of astar, edmondsKarp, stoerWagner, kargerMinCut kept behind `fromAdjacencyMap`                    | `astar` and `astarWithDetails` have no Graph overload: they take only a Map-of-Maps. `fromAdjacencyMap` does not exist. The work adds a snapshot input to astar and writes the helper.                                                                                                                                                                                                          | `algorithms/src/pathfinding/astar.ts`                                                                                          |
| 14.1 rule 2, 14.5: the element and the GPU package call `indexed.*`; the element injects `runAlgorithm(snapshot, { accelerator })` | Element adapters call `this.accelerated(capability, mode)`, which uses the `accelerated(acc)` dispatcher of `@graphty/algorithms`; the element owns WebGPU detection through its `./webgpu` subpath.                                                                                                                                                                                            | 17.8 D-INJECT; `design/decisions/2026-09-19-graphty-element-owns-webgpu.md`; `graphty-element/src/algorithms/Algorithm.ts`     |
| 14.3: 14 positional layouts; generators stay in layout behind a `LayoutGraph`; `bipartiteGraph` adds a partition column            | There are 16 positional layouts (grid and radial added by PR #396). The 8 generators are deprecated aliases of `@graphty/graph-samples/generators`; no `LayoutGraph` exists or is planned.                                                                                                                                                                                                      | commit 080fa1f9; `design/graph-samples/graph-samples-design.md` section 9; `layout/src/layouts/geometric/grid.ts`, `radial.ts` |
| 14.3 and 14.1 rule 4: legacy layout input memoised per mutation                                                                    | Layout's input type has no `mutationCount`, and `toLayoutSnapshot` caches a duck-typed graph by object identity alone, so a mutated input returns a stale snapshot. The fix is to walk duck inputs on every call (work item `layout-position-helpers`).                                                                                                                                         | `layout/src/simulation/snapshot.ts` (walkCache); `layout/test/simulation/snapshot.test.ts`                                     |
| 14.3: Kamada-Kawai `dist` comes from `@graphty/algorithms` or the GPU package                                                      | Both now exist or are in flight (`indexed.allPairsShortestPath`, PR #549). The design never said how `+Infinity` maps onto Kamada-Kawai's unreachable fill: non-finite entries become the existing `1e6` fill.                                                                                                                                                                                  | `layout/src/algorithms/optimization/kamada-kawai-solver.ts`                                                                    |
| 14.4: DataManager holds the builder, snapshot cache and positions directly                                                         | A separate `GraphStore` class does, with identity columns and a pinned column; the element API redesign respecified the rest.                                                                                                                                                                                                                                                                   | `design/decisions/2026-09-19-land-element-graph-store.md`; `graphty-element/src/data/GraphStore.ts`                            |
| 14.4: `toAlgorithmGraph` is replaced by a two-line selector                                                                        | `toAlgorithmGraph` became a published plugin seam: `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type from `@graphty/graphty-element/extend`. Removing it changes the element's public API (work item `element-plugin-seam`).                                                                                                                                                       | `graphty-element/src/extend.ts`; `graphty-element/docs/guide/extending/custom-algorithms.md`                                   |
| 14.4: analyse-visible-only through a `visible(s)` cache                                                                            | Replaced by run scopes.                                                                                                                                                                                                                                                                                                                                                                         | `graphty-element/src/algorithms/input/ScopedInput.ts`                                                                          |
| 14.4, 14.6 IO1: a DataSource streams into the io importer with the element's builder as the sink                                   | The element's builder carries no attribute columns; every attribute lives in per-node and per-edge data bags that styles, id paths and schemas read. The wrapper imports into a scratch builder and turns its columns back into records with today's keys.                                                                                                                                      | `graphty-element/src/data/GraphStore.ts`; `graphty-element/src/data/DataManager.ts`                                            |
| 8.2, C16, section 18 decision 2: graph-io takes fast-xml-parser and papaparse from the element                                     | graph-io uses hand-written tokenisers and has no runtime parser dependency. The element keeps both until its wrappers land.                                                                                                                                                                                                                                                                     | `graph-io/package.json`; `graphty-element/package.json`                                                                        |
| 8.2, 14.4: `format-detection.ts` becomes graph-io's sniff table                                                                    | Detection is the element's public, plugin-extensible API. Only its built-in sniffers delegate to graph-io.                                                                                                                                                                                                                                                                                      | `graphty-element/src/catalog/detect.ts`                                                                                        |
| 14.4: the snapshot cache is keyed on `builder.mutationCount`, which counts column writes                                           | False until commit f7db019c made every change a freeze would show count; true now. Issue #100 is still open.                                                                                                                                                                                                                                                                                    | commit f7db019c                                                                                                                |
| 14.6 E1, L1 gates: "Chromatic re-baseline"                                                                                         | Chromatic is switched off. Visual changes go through the `visual-review` package and the owner's review.                                                                                                                                                                                                                                                                                        | PR #541; PR #557                                                                                                               |
| 14.6 D1: tag deprecations "after E1 removed the last internal callers"                                                             | The gate is "no src file outside the legacy directories references a legacy entry point". Because legacy algorithms call each other, the lint rule exempts only the legacy directories scheduled for deletion.                                                                                                                                                                                  | `eslint.config.js` (no-deprecated is an error in every src tree)                                                               |
| 16.2: differential tests against legacy for every port                                                                             | Not for Floyd-Warshall: raising coverage of the legacy `floydWarshall` hangs vitest. Its oracle is repeated `indexed.dijkstra` plus hand-computed fixtures.                                                                                                                                                                                                                                     | `algorithms/CLAUDE.md`                                                                                                         |
| 13.5 rule 1: a breaking change "requires a `feat!:` commit"                                                                        | An unscoped `feat!:` bumps every dependent a major under this repository's nx release setup. A breaking commit is scoped, e.g. `feat(algorithms)!:`.                                                                                                                                                                                                                                            | issue #102                                                                                                                     |
| 17.7: "A1 has not started"                                                                                                         | A1 shipped in algorithms 1.8.0.                                                                                                                                                                                                                                                                                                                                                                 | as above                                                                                                                       |

## 3. Decisions this plan makes

These are reversible, so they are made here rather than asked.

- **Facade parity.** A legacy function delegates only when its differential test passes (exact for
  discrete results, 1e-9 relative for f64 scores). Otherwise it stays on legacy code until the
  removal release, which deletes it anyway. Exceptions need the owner; the two approved ones are in
  section 4.3. Why: 14.1 rule 1 is still the published promise of the 2.x and 1.x lines.
- **Export naming.** New ports follow the existing pattern without separate sign-off: the function
  under `indexed.*`, its option and result types flat with an `Indexed` prefix when the flat name
  is taken, results per the 14.2 table, and a dispatcher method only where `AlgorithmAccelerator`
  already declares the member.
- **Kamada-Kawai weights are distances**, as in the legacy function and NetworkX. graphty-element,
  which reads weights as strengths, passes a derived `1 / w` column. Why: the wrappers must keep
  legacy results, and the NetworkX fixtures assert it.
- **Element data bags keep their 2.x keys** after the parsers move into graph-io (14.4 already
  says "data bag exactly as today"). A per-format compatibility mapping in the element rebuilds
  them. DOT ports stop being glued onto node ids (a bug fix, noted in the changelog). DOT cluster
  containers are not drawn as nodes; members carry `parent`.
- **Neo4j stays a CSV variant** in the element, not a new `FormatId`. Adding an id is easy;
  removing one is a break.
- **Label propagation's `randomSeed`** stays meaningful: the port takes it. An explicit
  `randomSeed` keeps the run on the CPU port, since the GPU kernel has none.
- **Floyd-Warshall in the element** declares `static parallelEdges = "min"` (the sum policy it
  inherits today turns two parallel weight-1 edges into one of weight 2) and refuses graphs above
  the port's node bound with a coded error before the run starts.

## 4. The two new ports and their integration

### 4.1 The branches

| Branch                                      | Adds                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | State (2026-09-27)                                                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/algorithms-indexed-floyd-warshall`    | `indexed.allPairsShortestPath(s, { weights, weighted, method: "auto" \| "floyd-warshall" \| "per-source", paths, maxNodes })` returning `{ dist: Float64Array(n*n), n, hasNegativeCycle, method, predArc, pathTo(i, j), pathEdges(i, j) }`; `APSP_DEFAULT_MAX_NODES = 5792`; flat types `IndexedApspOptions`, `IndexedApspResult`; seam type `ApspCycleResultLike`; dispatcher method `allPairsShortestPath`. Design: `design/algorithms/floyd-warshall-indexed-port-design.md`. | 14 commits, contains master, local only, no pull request.                                                                                                                    |
| `feat/algorithms-indexed-label-propagation` | `indexed.labelPropagation(s, { maxIterations, randomSeed, weighted })`, a seeded fast label propagation (FLPA) returning `{ labels, count, groups(), iterations, converged }`; flat types `IndexedLabelPropagationOptions`, `IndexedLabelPropagationResult`; dispatcher method `labelPropagation`. Design: `design/algorithms/label-propagation-indexed-port-design.md`.                                                                                                         | 11 commits, behind master, local only, no pull request, and uncommitted edits from another session (2026-09-27). Do not touch its worktree; wait for that session to commit. |

Both edit `algorithms/src/index.ts`, `indexed/index.ts`, `indexed/accelerator.ts`,
`test/unit/indexed/accelerated.test.ts`, `algorithms/CLAUDE.md` and `algorithms/README.md`, so the
second merge resolves conflicts there.

### 4.2 Integration, in three steps

1. **Merge** (work item `merge-new-ports`). Each branch gets a green pull request, then merges into
   `feat/graph-format-migration`. The owner-approval questions in both designs (the new exports,
   and rerouting) are answered: the exports follow the naming rule of section 3, and rerouting is
   approved (4.3).
2. **During the dual-API window** (work items `delegate-floyd-and-label-propagation` and
   `element-floyd-and-label-propagation-adapters`):
    - `floydWarshall`, `floydWarshallPath` and `transitiveClosure` accept `Graph | GraphSnapshot`
      and delegate to `indexed.allPairsShortestPath` through `toSnapshot`, passing the exact f64
      weights (`expandEdges` of the weight shadow column), `paths: true` where predecessors are
      returned, and no node bound (the legacy functions had none). The facade rebuilds the
      `distances` and `predecessors` Map-of-Maps; a predecessor is `arcSource(predArc[i * n + j])`.
      `transitiveClosure` reads reachability as `dist < Infinity` on BFS rows (`weighted: false`).
    - `labelPropagation` accepts `Graph | GraphSnapshot` and delegates to
      `indexed.labelPropagation`, converting `labels` to the `Map<string, number>` of
      `communities` with `ids.toStringMap`. `labelPropagationAsync` and
      `labelPropagationSemiSupervised` are not covered by this port; the community family item
      ports them.
    - graphty-element's `FloydWarshallAlgorithm` and `LabelPropagationAlgorithm` stop calling the
      legacy functions and run `this.accelerated("allPairsShortestPath", ...)` and
      `this.accelerated("labelPropagation", "undirected")`. Floyd-Warshall computes eccentricity,
      diameter and radius from the row-major matrix and publishes `hasNegativeCycle`. Routing either
      one to the GPU waits for PRs #549 and #550 and is outside this plan (issue #558).
3. **At the removal release** (work item `algorithms-3-0-removal`): the legacy functions and their
   result types are deleted, and `allPairsShortestPath` and `labelPropagation` are promoted to the
   top level with their indexed signatures and results unchanged. The `indexed` namespace stays one
   major as a deprecated alias.

### 4.3 Result changes the owner approved, for the changelog

`floydWarshall`, `floydWarshallPath`, `transitiveClosure` (algorithms minor, `feat(algorithms):`):

- Parallel edges: the cheapest edge sets the distance. Before, the last edge added won.
- A positive self-loop no longer overwrites the diagonal: distance from a node to itself is 0, and
  `floydWarshallPath(g, a, a)` has distance 0.
- A negative cycle: `hasNegativeCycle` is true as before, but every distance is now `NaN` and
  `floydWarshallPath` returns null. Before, the matrix and the paths held meaningless values that
  disagreed with each other.
- A negative undirected edge counts as a negative cycle, with the same result.
- On graphs with none of these, distances are bit-identical (same k-i-j sweep in node order, exact
  f64 weights). Tied paths of equal length may be a different one of the ties when the port picks
  the per-source strategy.

`labelPropagation` (same release):

- For the same `randomSeed`, communities differ from before on any graph with more than one valid
  partition: the port uses a work queue instead of full sweeps, a uniform tie draw (the old draw
  counted the current label twice), and a different random generator.
- It now stops when every label is dominant, so tie-rich graphs converge instead of running to
  `maxIterations`; `iterations` and `converged` change accordingly.
- Directed graphs: in-neighbours now vote as well as out-neighbours.
- Self-loops no longer vote. Negative, NaN or infinite weights throw a `RangeError`.
- Disjoint cliques, complete graphs and isolated nodes give the same partition as before.

graphty-element (element minor): Label Propagation communities change for existing seeds; Floyd-
Warshall eccentricity, diameter and radius change on graphs with parallel edges (the minimum is
used, not the sum) and on graphs with self-loops.

## 5. Work items, in dependency order

Every item: lint, build, knip and the touched packages' test projects green; plain ASCII; commits as
the repository's CLAUDE.md files require. "Differential test" means a test that runs the legacy
function and the port on the same fixtures (every fixture of `algorithms/test/unit/indexed/`, plus
multigraph and self-loop cases) and compares results, then calls `validate({ checksum: true })` on
the snapshot. Items with a visual change finish with the diffs explained and waiting for the owner
in `visual-review`.

### Phase 0 -- the new ports

**merge-new-ports.** Get a green pull request for each of `feat/algorithms-indexed-floyd-warshall`
and `feat/algorithms-indexed-label-propagation` (the second only after its owning session has
committed its pending edits), then merge both into `feat/graph-format-migration`, resolving the
shared-file conflicts in the second merge. File the six legacy label-propagation defects of the
label-propagation design section 6 and the two legacy Floyd-Warshall initialisation defects as
issues with type, priority and effort labels. No test may raise coverage of the legacy Floyd-
Warshall. Done when: both branches are merged into the integration branch, `indexed.allPairsShortestPath`
and `indexed.labelPropagation` are reachable from the package barrel, `package-wiring.test.ts` and
`accelerated.test.ts` pass there, and the issues exist.

### Phase 1 -- foundation and the approved delegations

**facade-toolkit.** Add `RingQueue`, `BitSet` and `IndexedMaxHeap` to
`algorithms/src/indexed/structures/`; `fromAdjacencyMap` (Map-of-Maps to snapshot); one internal
facade module with node-argument resolution (`ids.indexOf`, then `ids.stringIndex()`, so `"5"`
finds numeric id 5) and the 14.2 converters (labels to `NodeId[][]`, mask to `Set<string>`,
`SsspResult` to `Map<NodeId, ShortestPathResult>`, edge indices to `Edge[]`, edge scores to `"v-w"`
maps); a test helper that runs a legacy function and its facade over the fixtures. Fix the legacy
betweenness guard message, which points at the missing `accelerated().betweennessCentrality`.
Done when: each structure and converter has unit tests including the empty graph, isolated nodes
and numeric ids passed as strings.

**delegate-floyd-and-label-propagation.** Section 4.2 step 2, algorithms half: the four functions
widen to `Graph | GraphSnapshot` and delegate. Tests assert the port-side results on new fixtures
and do not add tests that exercise the legacy Floyd-Warshall code (it is deleted by this change);
existing legacy tests change only where section 4.3 says results change, each change named in the
commit. Changelog text from section 4.3. Done when: the four functions contain no algorithm of
their own, the updated tests pass for Graph and snapshot input, and the changelog notes are in the
commit body.

**element-floyd-and-label-propagation-adapters.** Section 4.2 step 2, element half, with the
section 3 decisions for `randomSeed`, `parallelEdges` and the node bound. Done when: adapter tests
assert published values with no accelerator and with a fake accelerator, a negative-cycle fixture
sets `hasNegativeCycle`, an over-bound graph is refused with a coded error before the run, and
neither adapter calls `algorithmGraph()`.

**element-adapters-on-shipped-ports.** Move `HITSAlgorithm`, `KatzCentralityAlgorithm`,
`KCoreAlgorithm`, `LouvainAlgorithm` and `DegreeAlgorithm` off `algorithmGraph()`: the first four
through `this.accelerated(...)` with every schema option mapped (an option the port lacks is
implemented or refused, never dropped); Degree from the input snapshot's degree views. Forward the
`hits` and `katzCentrality` accelerator members in `graphty-element/src/acceleration/narrow.ts`
(both earn the GPU per `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`); leave k-core
and Louvain on the CPU port. Done when: none of the five calls `algorithmGraph()`, and adapter tests
match the legacy route on the existing fixtures (scores within 1e-9, identical coreness and degree,
Louvain modularity within tolerance).

### Phase 2 -- algorithm ports by family

Each port adds `indexed.*` functions, their flat types, dispatcher methods where the seam declares
the member, fixture tests and a differential test against legacy.

**port-traversal-family.** `depthFirstSearch`, `hasCycle`, `topologicalSort`, `isBipartite` (with
the two sides as a mask), `stronglyConnectedComponents` (iterative Tarjan, labels in completion
order, also serving `findStronglyConnectedComponents` and `isStronglyConnected`), condensation via
`contract(labels)` with legacy numbering, `directionOptimizedBfs` over `reverse()`, and an
early-stop `target` option on `indexed.breadthFirstSearch`. Done when: labels, visit order and
`componentMap` equal legacy on every fixture.

**port-paths-and-trees-family.** `bellmanFord` (SSSP result plus `hasNegativeCycle`, undirected
edges relaxed both ways), `bidirectionalDijkstra` (serving `dijkstraPath`), `astar` (heuristic over
node indices), `primMST` (discovery arc as `predArc`). Each takes the per-arc f64 `weights`
override. Done when: results equal legacy exactly through the override, parallel edges resolve to
the exact edge, and negative cycles and unreachable targets are covered.

**port-path-centrality-family.** `degreeCentrality`, `closenessCentrality` (unweighted and
weighted, one node or all), `betweennessCentrality` (Brandes, simple-graph sigma counting,
endpoints, normalised, sampled sources in index space, keeping the node-id-0 fix of #555) and
`edgeBetweennessCentrality`; dispatcher methods for betweenness, edge betweenness and closeness.
Done when: scores equal legacy within 1e-9 on undirected, directed, weighted and multigraph
fixtures, sampled betweenness with explicit sources is deterministic, and dispatcher tests cover
both paths.

**port-spectral-centrality-family.** `eigenvectorCentrality` (throws `ConvergenceError` as legacy
does), `personalizedPageRank`, initial ranks on `indexed.pageRank`, and the delta PageRank engines
(the `useDelta` path with legacy's n > 100 rule, `DeltaPageRank`, `PriorityDeltaPageRank`);
dispatcher methods for eigenvector and personalized PageRank. Done when: scores, iterations and
converged flags equal legacy within 1e-9 and the `ConvergenceError` cases reproduce.

**port-community-family.** `leiden` (`contract()` per level, `weightedDegree()` modularity, seeded
generator), `girvanNewman` (alive bitmap over logical edges, masked edge betweenness, dendrogram
`{ levels, modularity }`), `labelPropagationSemiSupervised` on the FLPA kernel (seeds fixed, empty
and 100k seed maps handled, labels renumbered), and a synchronous counterpart of
`labelPropagationAsync` with a swap guard under a name that says it is synchronous. Depends on the
path-centrality family (edge betweenness). Done when: Leiden and Girvan-Newman modularity is at
least legacy's on the fixtures, every seed keeps its label, and `validate({ checksum: true })`
passes after every call.

**port-flow-and-cut-family.** `maxFlow` (Edmonds-Karp and Ford-Fulkerson over a residual graph
from `fromEdgeArrays`, twin rule `e + E` directed and `e < 2E ? e + 2E : e - 2E` undirected,
returning `{ maxFlow, flow, sourceSide, cutEdges }`), `minSTCut`, `stoerWagner` (representative
array and `IndexedMaxHeap`, no `contract()`), `kargerMinCut` (`IntUnionFind`, seeded edge order).
Done when: flow values, per-edge flows, cut values and partitions equal legacy on directed,
undirected and weighted fixtures, including numeric ids passed as strings, and a seeded Karger run
is deterministic.

**port-matching-and-isomorphism-family.** `maximumBipartiteMatching`, `greedyBipartiteMatching`
(matching as `Uint32Array` with `INVALID_INDEX`), `isGraphIsomorphic` and `findAllIsomorphisms`
(VF2 over two snapshots, simple-graph neighbourhoods, index-based match callbacks). Depends on the
traversal family (bipartite sides). Done when: matching sizes equal legacy and every returned
mapping is verified as an isomorphism, with counts equal to legacy including callbacks.

**port-link-prediction-family.** `adamicAdarScore`, common-neighbours and Adamic-Adar prediction,
for-pairs and top-candidates, and the evaluation helpers, over sorted-row merges with simple-graph
semantics. Done when: scores, orderings and metrics equal legacy on directed, undirected and
multigraph fixtures.

**port-clustering-family.** `hierarchicalClustering`, `markovClustering` with its modularity,
`spectralClustering`, `syncClustering`, `teraHAC` (index-based, which removes its id/index defect)
and `grsbm`. Done when: each equals legacy on the fixtures, or matches or beats it on its own
quality metric where legacy is randomised, and the teraHAC defect has a regression test.

### Phase 3 -- facades

Each item widens the named legacy functions to `Graph | GraphSnapshot` and delegates through
`toSnapshot` wherever the differential test passes (section 3). Functions whose ports differ stay on
legacy code and are listed in the commit body.

**facades-traversal-paths-trees.** BFS family, DFS, cycle, topological sort, bipartite, Dijkstra
family, Bellman-Ford family, astar (adds a snapshot input beside the Map input), the eleven
component functions, Kruskal, `minimumSpanningTree`, Prim. Delete the >10000-node dual dispatch and
the `WeakMap<Graph, CSRGraph>` cache in `bfs-unified.ts`. Done when: existing tests pass unchanged
and every widened function has a snapshot-input test.

**facades-centrality.** PageRank family (keeping `topPageRankNodes`' `String(id)` type for the
window), personalized PageRank, HITS, Katz, eigenvector, degree, closeness, betweenness. Done when:
existing tests pass unchanged and each widened function has a snapshot-input test.

**facades-community-flow-matching.** Louvain (expected to stay legacy: the port is not move-for-
move identical), Leiden, Girvan-Newman, the two remaining label propagation variants, k-core, the
flow and cut functions (Map inputs through `fromAdjacencyMap`), matching, isomorphism. Done when:
as above.

**facades-link-prediction-clustering.** The ten link-prediction functions and the seven clustering
and research functions. Done when: as above.

### Phase 4 -- graphty-element adapters on the new ports

**element-adapters-traversal-and-paths.** BFS (target through the port; delete `legacyWalk`),
DFS, Bellman-Ford (the GPU already has `bellmanFord`), Prim, strongly connected components, and
PageRank's remaining legacy route (personalisation, initial ranks, undirected; delete
`legacyPageRankReason`). Edge results through `edgeRemap`, not `edgePairKey`. Done when: none calls
`algorithmGraph()`, results equal the legacy route, and both edges of a collapsed reciprocal pair
and every member of a parallel group carry the tree or path flag.

**element-adapters-centrality-and-community.** Betweenness, closeness (the GPU already has
closeness), eigenvector, Leiden, Girvan-Newman. Done when: none calls `algorithmGraph()` and results
equal the legacy route within the documented tolerances.

**element-adapters-flow-matching-link.** Max flow and min cut with capacity written to a store edge
column and passed as `expandEdges` of it (delete `Algorithm.edgeRecord`), bipartite matching, link
prediction. Done when: none builds a legacy `Graph`, flow values and cut sets equal the legacy
route, and `Algorithm.edgeRecord` is gone.

**element-data-layer-cleanup.** Delete `EdgeMap` (`graphty-element/src/Edge.ts`) and answer
`getEdgesBetween`, the parallel-edge index and count, and the stats edge count from the store;
start on-load algorithms once per load (`data-loading-complete`, and once per operation-queue
drain for API pushes) instead of once per chunk. Done when: no `EdgeMap` symbol remains, parallel-
edge curve offsets are unchanged on the multigraph stories, the stats edge count equals
`statistics().edgeCount`, and a chunked load starts each configured algorithm exactly once.

### Phase 5 -- layout

**layout-position-helpers.** `layout/src/positions.ts`: `LayoutResult`, `toPositionMap`,
`fromPositionMap`, `toPositionColumn`, `fromPositionColumn`, `rescaleInPlace` per 14.3; use them in
`forceatlas2Layout`. Remove the identity cache for duck-typed inputs in `toLayoutSnapshot` (keep
the directed-snapshot cache) and replace the test that asserts it with a mutation regression test.
Done when: round-trip tests pass for 2D and 3D, `rescaleInPlace` matches `rescaleLayout` within
1e-6, and a mutated input gives a result containing the new node.

**layout-indexed-geometric.** `layout/src/indexed/` exported as `indexed`; ports of circular,
shell (the node list may also name a node column), spiral, grid, random and radial; each legacy
function becomes `toPositionMap(indexed.x(toLayoutSnapshot(G), ...), s.ids)`. Done when: every
existing test for the six layouts passes unchanged and indexed tests cover dim 2 and 3, scale,
centre, n = 0 and n = 1.

**layout-indexed-structural.** BFS, bipartite (a mask or bool column), multipartite (a node column
name replaces the console warning fallback), planar and spectral over the CSR. Done when: existing
tests pass or change only where CSR neighbour order changes, with the reason in the commit, and a
string `subsetKey` reads a node column with no console output.

**layout-indexed-force-and-kamada-kawai.** `indexed.kamadaKawai` (all-pairs from the CSR, weights
as distances, zero weights honoured, parallel arcs by minimum, an injectable `Float32Array(n*n)`
`dist` with non-finite entries as the 1e6 fill), `indexed.forceAtlas2` and
`indexed.fruchtermanReingold` as one-shots over the simulations, `fruchtermanReingoldLayout` and
`springLayout` as wrappers, and `indexed.arf`. Done when: the NetworkX Kamada-Kawai fixtures pass
through both entry points, an injected `dist` equal to the computed one gives identical positions,
and a fixed node does not move under Fruchterman-Reingold.

**layout-close-l1.** Layout docs (README, VitePress, `layout/CLAUDE.md`) describe `indexed.*`, a
type-level test asserts every indexed layout takes `(GraphSnapshot, options?)` and returns
`LayoutResult`, and the layout visual baselines are re-captured with the reasons listed. Done when:
the suite, the bundle build and the docs build are green and the visual diffs wait for the owner.

**element-static-layout-engines.** `SimpleLayoutEngine` loads the undirected snapshot and the
position array, calls `indexed.*`, writes with `toPositionColumn`, reseeds with
`fromPositionColumn` and the pinned mask, and reloads on snapshot replacement. Delete
`LayoutEngine.pairWeights`, `pairWeightKey` and the per-call `{ nodes, edges }` objects; Kamada-Kawai
gets a derived `1 / w` column. `FixedLayout` reads the position array. Done when: no engine imports
a positional layout function, `weighted-layouts.test.ts` passes without `pairWeights`, and a reload
after adding nodes keeps existing coordinates.

### Phase 6 -- parsing through graph-io

**graph-io-csv-and-json-gaps.** CSV: an adjacency table mode (`node:weight` suffixes) and an opt-in
row-number id for node tables without an id column. JSON: `nodesPath` and `edgesPath` as dotted
paths. Done when: corpus fixtures for each import with the expected counts and weights, an exported
adjacency file round-trips, and an unknown path is a recoverable issue.

**graph-io-graphml-and-gml-gaps.** GraphML: map yFiles `ShapeNode` and `PolyLineEdge` graphics to
position, size, colours, label, shape, arrows and per-edge direction, beside the existing JSON tree;
accept a key's `name` and `type` when `attr.*` is absent. GML: a string node id under `nodeIdFrom:
"id"` becomes that id with one warning instead of an error (amend design 8.4's GML line). Done when:
a yEd fixture imports with values equal to today's element parser output, a string-id GML imports
with one warning, and the truncated-file fixture still aborts.

**element-import-through-graph-io.** Add `@graphty/graph-io` to graphty-element (package.json,
tsconfig references, build order, bundle). One helper in `src/data` runs an importer into a scratch
builder, freezes it and yields the records the DataManager consumes today, maps the import report
onto `ErrorAggregator`, maps direction onto `declareDirection`, and applies the per-format
compatibility mapping that keeps 2.x keys. Done when: a unit test with a recording importer asserts
record counts, aggregated errors and direction, and the element builds with graph-io in its bundle.

**element-csv-and-json-sources.** `CSVDataSource` (variants mapped to graph-io tables or its Neo4j
importer; papaparse and `csv-variant-detection.ts` deleted) and `JsonDataSource` (paths mapped, a
non-plain JMESPath evaluated in the element first, schemas kept) over the helper. Done when: every
existing CSV, Neo4j and JSON element test passes unchanged and papaparse is gone.

**element-gexf-and-graphml-sources.** Both over the helper with mappings that rebuild today's keys;
`addMissingNodes: true` for GEXF; fast-xml-parser deleted; the 16.5 check (lesmiserables.gexf under
`directed: "auto"` is undirected with 254 edges). Done when: existing tests pass unchanged, the
16.5 check passes and fast-xml-parser is gone.

**element-gml-dot-pajek-sources.** The three over the helper; a test that a truncated GML file
emits `data-loading-error` with the open bracket's line and keeps the current graph (closes #503).
Done when: that test and the existing GML, DOT and Pajek tests pass.

**element-detection-and-corpus-cleanup.** Built-in detectors in `src/catalog/detect.ts` delegate to
graph-io's sniffing (the `./catalog` entry stays free of Babylon.js, Lit and the DOM); delete the
duplicated parser corpus under `graphty-element/test/helpers/corpus` except fixtures element tests
use; update the element data-source docs. Done when: detection tests and the Node-safety test pass
and knip reports nothing unused.

**element-export-api.** Needs the owner (below). Export the graph in every graph-io format from a
snapshot with attribute columns built from the data bags and current positions, returning graph-
io's loss notes; `canExport: true` in the catalog. Done when: for each of the eight formats a
corpus file loads, exports and reloads with equal counts, ids and the fidelity matrix's keys.

### Phase 7 -- deprecation, removal and proof

**housekeeping-issues.** #85 (declare graph-format once in graphty-element, as a peer), #101 (no
published graph-format file writes producer `dev`), close #100 with commit f7db019c, and correct the
root `CLAUDE.md` package table and add graph-samples. Done when: the three issues are closed with
evidence and the table matches the package.json files.

**element-plugin-seam.** Needs the owner (below). Replace `Algorithm.algorithmGraph()` and the
`AlgorithmGraphView` export with a documented snapshot accessor, rewrite
`custom-algorithms.md` around it, delete `toAlgorithmGraph` and `utils/snapshotGraph.ts` (and its
use in `session/cost/estimate.ts`). Done when: a test plugin written only against the documented
extend API computes a result without importing `@graphty/algorithms`, and nothing in
`graphty-element/src` constructs a legacy `Graph`.

**deprecate-legacy-entry-points.** Tag `@deprecated`, with the replacement named: the legacy
`Graph` class and its input paths, `graphToMap`, `CSRGraph` and `optimized/*`, every legacy
algorithm function, the Map-of-Maps signatures, the 16 positional layouts and PositionMap
utilities. An eslint override exempts only the legacy directories scheduled for deletion. Ships as
an algorithms minor and a layout minor. Done when: lint is green everywhere with no-deprecated at
error outside those directories, and a test fails if graphty-element, webgpu-graph-algorithms or
graphty src imports a deprecated name.

**algorithms-3-0-removal.** Delete the legacy `Graph`, every legacy implementation, `optimized/*`,
`graphToMap`, `CSRGraph`, the Map-of-Maps signatures and the `PageRankOptions` of
`types/index.ts`; promote `indexed.*` (including `allPairsShortestPath` and `labelPropagation` with
their indexed signatures) to the top level, keeping `indexed` as a deprecated alias for one major.
Migrate algorithms stories, docs, examples and benchmarks, and the webgpu tests' legacy oracles;
widen webgpu-graph-algorithms' peer to `^3.0.0` in the same change. Scoped breaking commit
`feat(algorithms)!:` with a BREAKING CHANGE footer. Done when: an export-list test asserts the
removals, every workspace build, lint, knip and test project is green including the webgpu lanes,
and `nx release --dry-run` bumps algorithms to 3.0.0 without aborting.

**layout-2-0-removal.** Delete the 16 positional signatures and the 8 generator aliases; promote
`indexed.*`; migrate layout stories and README; widen webgpu-graph-algorithms' layout peer to
`^2.0.0`. `feat(layout)!:` with a BREAKING CHANGE footer. Done when: an export-list test asserts the
removals and `nx release --dry-run` bumps layout to 2.0.0 without aborting.

**conventions-and-docs-rewrite.** The algorithm pattern in the root `CLAUDE.md` and
`algorithms/CLAUDE.md` becomes `algorithmName(snapshot: GraphSnapshot, options?): Result`, the
layout interface to match; algorithms and layout READMEs and getting-started guides build a
snapshot; the Floyd-Warshall hang note goes with the legacy code. Done when: no doc shows
`ReadonlyGraph<TNodeId>` or a positional layout call and the guides' code samples run as checks.

**verify-migration-complete.** Section 7. Done when: the check is in CI and green, every CI shard
and GPU lane is green, visual diffs are approved by the owner, and `STATUS.md` records the finished
state.

## 6. Decisions only the owner can make

Both change a published contract that the design never specified.

1. **The element's plugin seam** (blocks `element-plugin-seam`, and through it the removal
   release). `@graphty/graphty-element/extend` exports `AlgorithmGraphView`, an alias of the legacy
   `Graph` of `@graphty/algorithms`, and documents `Algorithm.algorithmGraph()` for plugin authors.
   Deleting the legacy class at algorithms 3.0.0 forces one of: (a) graphty-element 3.0.0 with a
   snapshot accessor replacing it (recommended, released in the same window); (b) keep the legacy
   class alive in algorithms 3.x as an unsupported compatibility type; (c) move a copy of the class
   into graphty-element.
2. **The element's export API** (blocks `element-export-api`). The method name and signature (for
   example `exportGraph(format, options) -> Promise<{ text, lossNotes }>`), what an export contains
   (data bags and laid-out positions only, or also styles and algorithm results), and whether third
   parties can register writers.

## 7. How completion is verified

1. **A workspace check under `tools/`, run in CI**, fails when any package's src imports a removed
   legacy name, calls `toAlgorithmGraph` or `algorithmGraph`, constructs a legacy `Graph`, calls a
   positional layout function, or when graphty-element src parses a graph file itself (imports
   papaparse or fast-xml-parser).
2. **Export-list tests** in algorithms and layout assert that nothing on the removal list is
   exported and that every former legacy capability has an exported replacement (a table in the
   test maps each of the 90 functions and 3 classes, and each of the 16 layouts, to its
   replacement).
3. **Differential and fixture suites** of phases 2-5 stay in the repository as the permanent
   record that each replacement computes what the legacy function did, or differs only as the
   changelog says.
4. **The full CI-parity gate**: `tools/prepush.sh`, every graphty-element browser, storybook and xr
   shard, the webgpu node and browser lanes, `gpu.yml` and `hosts.yml`, and `nx release --dry-run`.
5. **Visual review**: every changed story or visual test is explained and approved by the owner.
6. **`STATUS.md`** gets a final section with the counts: indexed functions, legacy functions left
   (zero), element adapters on the dispatcher (all), static layout engines on `indexed.*` (all),
   element parsers (zero).

## 8. Outside this plan

- Routing betweenness, all-pairs, triangle counting and label propagation to the GPU (issue #558),
  after PRs #549, #550 and #552 merge. That work also narrows the seam's option types for
  `allPairsShortestPath` and `labelPropagation`, which today take `SsspOptions` and
  `HitsOptionsLike`.
- A neighbour query on the element session so the graphty app stops scanning edges in
  `AppShell.tsx` (issue #314).
- Per-edge direction in the element (issue #309), Neo4j APOC formats (#303, #304), SIF and CX2
  (#306, #307).
