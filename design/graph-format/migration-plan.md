# Finishing the graph-format consumer migration

This plan finishes the consumer migration that `graph-format-design.md` section 14 describes: moving
`@graphty/algorithms`, `@graphty/layout` and `@graphty/graphty-element` off the legacy object graph
and onto the frozen `GraphSnapshot`, and moving graphty-element's file parsing into
`@graphty/graph-io`. It was checked against `origin/master` at `b109fac2` on 2026-09-27.
`STATUS.md` in this directory records the state it starts from; this file says what is left, in
what order, and how "finished" is proven.

## 0. How work flows

- All work lands on the integration branch `feat/graph-format-migration`
  (worktree `.worktrees/feat-graph-format-migration`).
- Each work item in section 5 is sized for one agent in its own worktree, branched from the
  integration branch. When the item's done-when holds, the agent merges its branch into the
  integration branch with `git merge` and pushes the integration branch. No agent merges a pull
  request and no agent pushes to master.
- The integration branch reaches master through ONE pull request per release window, opened by the
  items `ship-dual-api-window` and `verify-migration-complete`, and merged by the owner. That split
  is what gives consumers a published release with both APIs (section 4.4).
- Before starting, every item merges `origin/master` into its branch. Items that touch files an open
  pull request also touches wait until that pull request has merged and been absorbed (item
  `absorb-open-element-prs`, section 5 phase 0).
- Every item: lint, build, knip and the touched packages' test projects green; plain ASCII; commits
  as the repository's CLAUDE.md files require (message in a file, signed, conventional, scoped).

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

### 1.1 Open pull requests this plan has to wait for

| PR               | What it changes that this plan also changes                                                                                                                                                                                                                                                                                                                                             | Who waits                                                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #553             | Element undo, released as graphty-element 3.0.0. Rewrites `src/data/GraphStore.ts`, `ingest.ts`, `positions.ts`, `managers/DataManager.ts`, `AlgorithmManager.ts`, `UpdateManager.ts`, `LayoutManager.ts`, `layout/LayoutEngine.ts`, `Edge.ts`, `Graph.ts`, `catalog/detect.ts`, `docs/guide/extending/custom-algorithms.md`; reflows the design, `STATUS.md` and the root `CLAUDE.md`. | the element data layer, static layout engines, import through graph-io and plugin seam items. Not the algorithm adapters: #553 touches no file under `src/algorithms/` or `src/acceleration/`. |
| #490             | Instanced edges: `Edge.ts`, `Graph.ts`, `UpdateManager.ts`.                                                                                                                                                                                                                                                                                                                             | `element-data-layer-cleanup`                                                                                                                                                                   |
| #513             | Force layout on an accelerator: `SimulationLayoutEngine.ts`, `LayoutManager.ts`, `catalog/layouts.ts`.                                                                                                                                                                                                                                                                                  | `element-static-layout-engines`                                                                                                                                                                |
| #559             | Merged 2026-09-28: visual-review baselines in Git LFS and one-story seeding. No baseline is committed on master yet. layout's Storybook is a visual-review project on the integration branch.                                                                                                                                                                                           | every item with a visual change, through `visual-review-ready`                                                                                                                                 |
| #519             | Settles graphty-element's Storybook and pixel tests. `design/visual-testing/plan.md` lets master seed graphty-element's visual-review baselines only after it merges.                                                                                                                                                                                                                   | `visual-review-ready` (the graphty-element half of its done-when)                                                                                                                              |
| #549, #550, #552 | GPU all-pairs, label propagation plus triangles, betweenness. Only add GPU members that fit the existing seam.                                                                                                                                                                                                                                                                          | nothing here; routing them is issue #558 (section 8)                                                                                                                                           |

## 2. Design statements that later decisions or facts have superseded

Each row names the design text, what replaced it, and the evidence. The design document carries a
matching note at each place (decision log entry 17.9); the original text is kept.

| Design text                                                                                                                        | Superseded by                                                                                                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14.6: A1 on its own branch, gating F2, then merged                                                                                 | A1 landed inside the WebGPU seam work after F2 was cut without it.                                                                                                                                                                                                                                                                                                                                                                      | `design/decisions/2026-09-19-a1-lands-inside-m8a.md`; algorithms CHANGELOG 1.8.0; 17.7 D-F2-GATE                                                                                  |
| 14.6 row "2.0" and every "at 2.0" in 14.1-14.3 and section 18                                                                      | algorithms already published 2.0.0 (2026-09-24) for an unrelated break (eigenvector throws `ConvergenceError`). The removal release is algorithms 3.0.0 and layout 2.0.0. It also retires 14.1 rule 1's "no result type changes during the window", which 2.0.0 already broke once.                                                                                                                                                     | `algorithms/package.json` 2.1.0; algorithms CHANGELOG 2.0.0                                                                                                                       |
| 14.1 rule 1 and 14.6 A2: every legacy function becomes a facade whose results equal legacy within 1e-9                             | A legacy function delegates to its port only when the port's results equal legacy (the differential test is exact, or within 1e-9 for f64 scores). A port that differs on purpose leaves its legacy function on legacy code until the removal release, unless the owner approves the change. The owner approved it for `labelPropagation` and the three Floyd-Warshall functions (section 4.3).                                         | `algorithms/src/indexed/louvain.ts` lines 290-293 ("not move-for-move identical"); both port designs (section 4)                                                                  |
| 14.2 and 14.6 A2: "every public function's first parameter widens to `Graph \| GraphSnapshot`"                                     | Not done. Legacy functions keep their `Graph` signature and delegate internally; a caller holding a snapshot calls `indexed.*`. Widening would teach callers to write `pageRank(snapshot)` and get the legacy result, and the removal release breaks that call site a second time: `pageRank`, `dijkstra`, `hits` and ten more names are reused by the promoted `indexed.*` functions with different results, and the rest are deleted. | `algorithms/src/index.ts` lines 56-57 (the name collisions); section 4.4                                                                                                          |
| 14.6 A2: "all 95+ functions ported"                                                                                                | The package barrel exports 90 legacy algorithm functions plus 3 algorithm classes (DeltaPageRank, PriorityDeltaPageRank, DirectionOptimizedBFS). Section 5 assigns every one to a port or to a documented recipe (section 7.2).                                                                                                                                                                                                         | `algorithms/src/index.ts`                                                                                                                                                         |
| 14.2 Flow: residual capacity per arc, and a four-copy undirected layout with twin `e < 2E ? e + 2E : e - 2E`                       | `indexed.maxFlow` builds `[edges ++ reversed edges]` with twin `e + E` for directed and undirected input and keeps residual capacity per node pair, searched in the legacy row order. That is the legacy Map-of-Maps residual, so paths and per-edge flows equal legacy. An undirected edge's two directions are one pair each way, so no four-copy layout is needed.                                                                   | per-arc residuals with sorted rows gave per-edge flows different from legacy `edmondsKarp` on 334 of 600 seeded random graphs; `algorithms/src/indexed/flow.ts` (`buildResidual`) |
| 14.2: the Map-of-Maps overloads of astar, edmondsKarp, stoerWagner, kargerMinCut kept behind `fromAdjacencyMap`                    | `astar` and `astarWithDetails` have no Graph overload: they take only a Map-of-Maps. `fromAdjacencyMap` does not exist. It is written as an internal helper so the Map inputs can delegate; `indexed.astar` is the snapshot entry point.                                                                                                                                                                                                | `algorithms/src/pathfinding/astar.ts`                                                                                                                                             |
| 14.1 rule 2, 14.5: the element and the GPU package call `indexed.*`; the element injects `runAlgorithm(snapshot, { accelerator })` | Element adapters call `this.accelerated(capability, mode)`, which uses the `accelerated(acc)` dispatcher of `@graphty/algorithms`; the element owns WebGPU detection through its `./webgpu` subpath.                                                                                                                                                                                                                                    | 17.8 D-INJECT; `design/decisions/2026-09-19-graphty-element-owns-webgpu.md`; `graphty-element/src/algorithms/Algorithm.ts`                                                        |
| 14.3: 14 positional layouts; generators stay in layout behind a `LayoutGraph`; `bipartiteGraph` adds a partition column            | There are 16 positional layouts (grid and radial added by PR #396). The 8 generators are deprecated aliases of `@graphty/graph-samples/generators`; no `LayoutGraph` exists or is planned.                                                                                                                                                                                                                                              | commit 080fa1f9; `design/graph-samples/graph-samples-design.md` section 9; `layout/src/layouts/geometric/grid.ts`, `radial.ts`                                                    |
| 14.3 and 14.1 rule 4: legacy layout input memoised per mutation                                                                    | Layout's input type has no `mutationCount`, and `toLayoutSnapshot` caches a duck-typed graph by object identity alone, so a mutated input returns a stale snapshot. The fix is to walk duck inputs on every call (work item `layout-position-helpers`).                                                                                                                                                                                 | `layout/src/simulation/snapshot.ts` (walkCache); `layout/test/simulation/snapshot.test.ts`                                                                                        |
| 14.3: Kamada-Kawai `dist` comes from `@graphty/algorithms` or the GPU package                                                      | Both now exist or are in flight (`indexed.allPairsShortestPath`, PR #549). The design never said how `+Infinity` maps onto Kamada-Kawai's unreachable fill: non-finite entries become the existing `1e6` fill.                                                                                                                                                                                                                          | `layout/src/algorithms/optimization/kamada-kawai-solver.ts`                                                                                                                       |
| 14.4: DataManager holds the builder, snapshot cache and positions directly                                                         | A separate `GraphStore` class does, with identity columns and a pinned column; the element API redesign respecified the rest.                                                                                                                                                                                                                                                                                                           | `design/decisions/2026-09-19-land-element-graph-store.md`; `graphty-element/src/data/GraphStore.ts`                                                                               |
| 14.4: `toAlgorithmGraph` is replaced by a two-line selector                                                                        | `toAlgorithmGraph` became a published plugin seam: `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type exported from `@graphty/graphty-element/extend`. Removing it changes the element's public API (work item `element-plugin-seam`).                                                                                                                                                                                      | `graphty-element/extend.ts` line 220; `graphty-element/docs/guide/extending/custom-algorithms.md`                                                                                 |
| 14.4: analyse-visible-only through a `visible(s)` cache                                                                            | Replaced by run scopes.                                                                                                                                                                                                                                                                                                                                                                                                                 | `graphty-element/src/algorithms/input/ScopedInput.ts`                                                                                                                             |
| 14.4, 14.6 IO1: a DataSource streams into the io importer with the element's builder as the sink                                   | The element's builder carries no attribute columns; every attribute lives in per-node and per-edge data bags that styles, id paths and schemas read. The wrapper imports into a scratch builder and turns its columns back into records with today's keys.                                                                                                                                                                              | `graphty-element/src/data/GraphStore.ts`; `graphty-element/src/managers/DataManager.ts`                                                                                           |
| 8.2, C16, section 18 decision 2: graph-io takes fast-xml-parser and papaparse from the element                                     | graph-io uses hand-written tokenisers and has no runtime parser dependency. The element keeps both until its wrappers land.                                                                                                                                                                                                                                                                                                             | `graph-io/package.json`; `graphty-element/package.json`                                                                                                                           |
| 8.2, 14.4: `format-detection.ts` becomes graph-io's sniff table                                                                    | Detection is the element's public, plugin-extensible API. Only its built-in sniffers delegate to graph-io.                                                                                                                                                                                                                                                                                                                              | `graphty-element/src/catalog/detect.ts`                                                                                                                                           |
| 14.4: the snapshot cache is keyed on `builder.mutationCount`, which counts column writes                                           | False until commit f7db019c made every change a freeze would show count; true now. Issue #100 is still open.                                                                                                                                                                                                                                                                                                                            | commit f7db019c                                                                                                                                                                   |
| 14.6 E1, L1 gates: "Chromatic re-baseline"                                                                                         | Chromatic is switched off. Visual changes go through the `visual-review` package and the owner's review. Its baselines are not seeded yet; layout's Storybook is one of its projects on the integration branch (work item `visual-review-ready`).                                                                                                                                                                                       | PR #541; PR #557; PR #559; `visual-review/projects.json`                                                                                                                          |
| 14.6 D1: tag deprecations "after E1 removed the last internal callers"                                                             | The gate is "no src file outside the legacy directories references a legacy entry point". Because legacy algorithms call each other, the lint rule exempts only the legacy directories scheduled for deletion.                                                                                                                                                                                                                          | `eslint.config.js` (no-deprecated is an error in every src tree)                                                                                                                  |
| 14.6: the dual-API window ends at the removal release, with no release step between                                                | The deprecation release reaches npm (owner-merged pull request of the integration branch) before any removal commit lands; otherwise one release run would publish the deprecations and the removals together.                                                                                                                                                                                                                          | `nx.json` release (`conventionalCommits`, independent projects); `.github/workflows/release.yml`                                                                                  |
| 16.2: differential tests against legacy for every port                                                                             | Not for Floyd-Warshall: raising coverage of the legacy `floydWarshall` hangs vitest. Its oracle is repeated `indexed.dijkstra` plus hand-computed fixtures. At the removal release every differential test becomes a golden-fixture test (legacy outputs recorded to files), because the legacy code it runs is deleted.                                                                                                                | `algorithms/CLAUDE.md`                                                                                                                                                            |
| 13.5 rule 1: a breaking change "requires a `feat!:` commit"                                                                        | An unscoped `feat!:` bumps every dependent a major under this repository's nx release setup. A breaking commit is scoped, e.g. `feat(algorithms)!:`.                                                                                                                                                                                                                                                                                    | issue #102                                                                                                                                                                        |
| 17.7: "A1 has not started"                                                                                                         | A1 shipped in algorithms 1.8.0.                                                                                                                                                                                                                                                                                                                                                                                                         | as above                                                                                                                                                                          |

## 3. Decisions this plan makes

These are reversible, so they are made here rather than asked.

- **Facade parity.** A legacy function delegates only when its differential test passes (exact for
  discrete results, 1e-9 relative for f64 scores). Otherwise it stays on legacy code until the
  removal release, which deletes it anyway; its commit lists it with the reason, and the removal
  release's changelog says how the promoted replacement's results differ. Exceptions need the
  owner; the two approved ones are in section 4.3.
- **No widening.** Legacy functions keep their `Graph` (or Map) first parameter and delegate
  internally through `toSnapshot` (or the internal `fromAdjacencyMap`). Snapshot callers use
  `indexed.*`. Section 2 has the reason.
- **Export naming.** New ports follow the existing pattern without separate sign-off: the function
  under `indexed.*`, its option and result types flat with an `Indexed` prefix when the flat name
  is taken, results per the 14.2 table, and a dispatcher method only where `AlgorithmAccelerator`
  already declares the member.
- **Dispatcher routing rules live in `@graphty/algorithms`.** A dispatcher method sends a call to
  the accelerator only when the accelerator can give the same answer; otherwise it runs the CPU
  port. `allPairsShortestPath` already has such a rule (`acceleratorAnswersApsp`). The
  `labelPropagation` method gains one: a call with `randomSeed` set runs the CPU port, since the
  GPU kernel has no seed. The element never bypasses the dispatcher to get this behaviour.
- **GPU forwarding in the element.** This plan forwards only members whose cost record gives an
  unconditional crossover, each with its node floor from
  `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md` ("minimum of N" column): `hits`
  4,000; `katzCentrality` 6,600; `eigenvectorCentrality` 6,600. Bellman-Ford (earns only with
  negative weights), closeness (earns only sampled), betweenness, all-pairs, triangles and label
  propagation need conditional routing rules and belong to issue #558.
- **Kamada-Kawai weights are distances**, as in the legacy function and NetworkX. graphty-element,
  which reads weights as strengths, first SUMS parallel edges into one pair weight (as it does
  today, `weighted-layouts.test.ts` "sums two parallel edges") and then passes `1 / sum` as a
  derived edge column.
- **Element data bags keep their 2.x keys** after the parsers move into graph-io (14.4 already
  says "data bag exactly as today"). A per-format compatibility mapping in the element rebuilds
  them. DOT ports stop being glued onto node ids (a bug fix, noted in the changelog). DOT cluster
  containers are not drawn as nodes; members carry `parent`.
- **Neo4j stays a CSV variant** in the element, not a new `FormatId`. Adding an id is easy;
  removing one is a break.
- **Label propagation's `randomSeed`** stays meaningful: the port takes it, and the element's
  default of 42 keeps giving one partition per seed.
- **Floyd-Warshall in the element** declares `static parallelEdges = "min"` (the sum policy it
  inherits today turns two parallel weight-1 edges into one of weight 2) and refuses graphs above
  the port's node bound (`APSP_DEFAULT_MAX_NODES`, 5,792) with a coded error before the run starts.
- **Convenience functions are recipes, not ports.** `nodeBetweennessCentrality` and the other
  `node*` functions, `pageRankCentrality`, `topPageRankNodes`, `isConnected`, `isWeaklyConnected`,
  `getConnectedComponent`, `largestConnectedComponent`, `numberOfConnectedComponents`,
  `isStronglyConnected`, `hasNegativeCycle`, `connectedComponentsDFS`, `pathfindingUtils` and
  `heuristics` get a one-to-three-line recipe over the promoted function in the removal release's
  migration table, instead of an `indexed.*` twin. `topPageRankNodes`' `String(id)` type lie
  disappears with it.
- **Pull requests for the two port branches** are opened against master so their CI runs; once
  green, the branch is merged locally into the integration branch. If the owner merges a port pull
  request to master first, the integration branch absorbs it through `origin/master` and nothing
  lands twice.

## 4. The two new ports and their integration

### 4.1 The branches

| Branch                                      | Adds                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | State (2026-09-27)                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `feat/algorithms-indexed-floyd-warshall`    | `indexed.allPairsShortestPath(s, { weights, weighted, method: "auto" \| "floyd-warshall" \| "per-source", paths, maxNodes })` returning `{ dist: Float64Array(n*n), n, hasNegativeCycle, method, predArc, pathTo(i, j), pathEdges(i, j) }`; `APSP_DEFAULT_MAX_NODES = 5792`; flat types `IndexedApspOptions`, `IndexedApspResult`; seam type `ApspCycleResultLike`; dispatcher method `allPairsShortestPath`. Design: `design/algorithms/floyd-warshall-indexed-port-design.md`. | Pushed as PR #560 (CI green); merged into `feat/graph-format-migration`.                |
| `feat/algorithms-indexed-label-propagation` | `indexed.labelPropagation(s, { maxIterations, randomSeed, weighted })`, a seeded fast label propagation (FLPA) returning `{ labels, count, groups(), iterations, converged }`; flat types `IndexedLabelPropagationOptions`, `IndexedLabelPropagationResult`; dispatcher method `labelPropagation`. Design: `design/algorithms/label-propagation-indexed-port-design.md`.                                                                                                         | Pushed as PR #569 (CI green, head 6d93a9ec); merged into `feat/graph-format-migration`. |

Both edit `algorithms/src/index.ts`, `indexed/index.ts`, `indexed/accelerator.ts`,
`test/unit/indexed/accelerated.test.ts`, `algorithms/CLAUDE.md` and `algorithms/README.md`, so the
second merge resolves conflicts there.

### 4.2 Integration, in three steps

1. **Merge** (work item `merge-new-ports`). Each branch is pushed and gets a pull request with green
   CI, then merges into `feat/graph-format-migration`. The owner-approval questions in both designs
   (the new exports, and rerouting) are answered: the exports follow the naming rule of section 3,
   and rerouting is approved (4.3).
2. **During the dual-API window** (work items `delegate-floyd-and-label-propagation` and
   `element-floyd-and-label-propagation-adapters`):
    - `floydWarshall`, `floydWarshallPath` and `transitiveClosure` keep their signatures and
      delegate to `indexed.allPairsShortestPath` through `toSnapshot`, passing the exact f64
      weights (`expandEdges` of the weight shadow column), `paths: true` where predecessors are
      returned, and no node bound (the legacy functions had none). The facade rebuilds the
      `distances` and `predecessors` Map-of-Maps; a predecessor is `arcSource(predArc[i * n + j])`.
      `transitiveClosure` reads reachability as `dist < Infinity` on BFS rows (`weighted: false`).
    - The legacy Dijkstra-based `allPairsShortestPath` (`algorithms/src/algorithms/shortest-path/dijkstra.ts`,
      returning `Map<NodeId, Map<NodeId, number>>`) delegates too if its differential test is
      exact, under the ordinary facade rule. Its name is reused by the promoted port at the
      removal release (4.4).
    - `labelPropagation` keeps its signature and delegates to `indexed.labelPropagation`,
      converting `labels` to the `Map<string, number>` of `communities` with `ids.toStringMap`.
      `labelPropagationAsync` and `labelPropagationSemiSupervised` are not covered by this port;
      the community family item ports them.
    - The `labelPropagation` dispatcher method runs the CPU port whenever `randomSeed` is set
      (section 3).
    - graphty-element's `FloydWarshallAlgorithm` and `LabelPropagationAlgorithm` stop calling the
      legacy functions and run `this.accelerated("allPairsShortestPath", ...)` and
      `this.accelerated("labelPropagation", "undirected")`, then the dispatcher's methods.
      Floyd-Warshall computes eccentricity, diameter and radius from the row-major matrix and
      publishes `hasNegativeCycle`. Neither name is added to the element's `ALGORITHM_MEMBERS`
      here, so both run the CPU port; routing them to the GPU is issue #558.
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

graphty-element (element minor):

- Label Propagation communities change for existing seeds.
- Floyd-Warshall eccentricity, diameter and radius change on graphs with parallel edges (the
  minimum is used, not the sum) and on graphs with self-loops.
- Floyd-Warshall now refuses a graph above 5,792 nodes with a coded error before the run starts.
  Before, it had no bound and a large graph ran until the tab ran out of memory.

### 4.4 The release sequence

1. The facades, ports and element moves land on the integration branch, then the deprecation tags
   (`deprecate-legacy-entry-points`).
2. `ship-dual-api-window`: the owner merges the integration branch to master, and algorithms 2.x,
   layout 1.x and graphty-element minors reach npm with both APIs and the deprecations. This is
   the only release in which a consumer can move at their own pace.
3. The removal items land on the integration branch after that, and `verify-migration-complete`
   opens the second pull request to master: algorithms 3.0.0, layout 2.0.0, and a graphty-element
   major if the owner's plugin seam decision removes `AlgorithmGraphView` (section 6).

Names that survive the removal release with a new result: `pageRank`, `dijkstra`,
`breadthFirstSearch`, `connectedComponents`, `weaklyConnectedComponents`, `kruskalMST`, `hits`,
`katzCentrality`, `louvain`, `kCoreDecomposition`, `commonNeighborsScore`, `labelPropagation`,
`allPairsShortestPath`, and every later port that reuses a legacy name. The 3.0.0 BREAKING CHANGE
footer lists each with its old and new signature.

## 5. Work items, in dependency order

"Differential test" means a test that runs the legacy function and the port on the same fixtures
(every fixture of `algorithms/test/unit/indexed/`, plus multigraph and self-loop cases) and
compares results, then calls `validate({ checksum: true })` on the snapshot. "Visual change"
means the item finishes with visual-review captures, every diff explained and waiting for the
owner.

"On the dispatcher" for an element adapter means: the adapter imports no value from
`@graphty/algorithms` other than `accelerated`, `indexed` and `toSnapshot`, constructs no legacy
`Graph`, and calls neither `algorithmGraph()` nor `toAlgorithmGraph`.

### Phase 0 -- prerequisites

**merge-new-ports.** Push `feat/algorithms-indexed-floyd-warshall` and
`feat/algorithms-indexed-label-propagation`, open a pull request for each (against master, so CI
runs), and once each is green merge it into `feat/graph-format-migration`, resolving the
shared-file conflicts in the second merge. File the six legacy label-propagation defects of the
label-propagation design section 6 and the two legacy Floyd-Warshall initialisation defects as
issues with type, priority and effort labels. No test may raise coverage of the legacy Floyd-
Warshall. Done when: both branches are merged into the integration branch, `indexed.allPairsShortestPath`
and `indexed.labelPropagation` are reachable from the package barrel, `package-wiring.test.ts` and
`accelerated.test.ts` pass there, and the issues exist.

**visual-review-ready.** After PR #559 merges (it merged on 2026-09-28): add layout's Storybook to
`visual-review/projects.json` and the CI visual matrix, and have the owner seed baselines for
graphty-element and layout on master. Until a project has baselines, an item with a visual change
attaches before/after captures made with `tools/diff-stories.mjs` and `tools/pixel-diff.mjs` to its
commit instead. graphty-element cannot be seeded from master until PR #519 (which settles its
Storybook and pixel tests) merges: until then `visual-review/projects.json` keeps its
`seedFromMaster` false and the review page refuses master baselines for it
(`design/visual-testing/plan.md`). Done when: master has seeded baselines for both projects and a
pull request that changes a layout story shows the diff in visual-review.

**absorb-open-element-prs.** After #553, #490 and #513 have merged to master, merge `origin/master`
into the integration branch, resolving conflicts with this plan's edits to `STATUS.md`, the design
and the root `CLAUDE.md` (#553 reflows all three). Done when: the integration branch contains all
three and its element suites are green.

### Phase 1 -- foundation and the approved delegations

**facade-toolkit.** Add `RingQueue`, `BitSet` and `IndexedMaxHeap` to
`algorithms/src/indexed/structures/`; an internal `fromAdjacencyMap` (Map-of-Maps to snapshot); one
internal facade module with node-argument resolution (`ids.indexOf`, then `ids.stringIndex()`, so
`"5"` finds numeric id 5) and the 14.2 converters (labels to `NodeId[][]`, mask to `Set<string>`,
`SsspResult` to `Map<NodeId, ShortestPathResult>`, edge indices to `Edge[]`, edge scores to `"v-w"`
maps); a test helper that runs a legacy function and its facade over the fixtures. Fix the legacy
betweenness guard message, which points at the missing `accelerated().betweennessCentrality`.
Done when: each structure and converter has unit tests including the empty graph, isolated nodes
and numeric ids passed as strings.

**delegate-floyd-and-label-propagation.** Section 4.2 step 2, algorithms half: `floydWarshall`,
`floydWarshallPath`, `transitiveClosure` and `labelPropagation` delegate; the legacy
`allPairsShortestPath` delegates if exact; the `labelPropagation` dispatcher method gains the
`randomSeed` routing rule. Tests assert the port-side results on new fixtures and add no test that
exercises the legacy Floyd-Warshall code (it is deleted by this change); existing legacy tests
change only where section 4.3 says results change, each change named in the commit. Changelog text
from section 4.3. Done when: the four functions contain no algorithm of their own, a facade
differential test per function passes, a dispatcher test shows a seeded call reaching the CPU port
with a fake accelerator attached, and the changelog notes are in the commit body.

**element-floyd-and-label-propagation-adapters.** Section 4.2 step 2, element half, with the
section 3 decisions for `randomSeed`, `parallelEdges` and the node bound. Neither name goes into
`ALGORITHM_MEMBERS`. Done when: both adapters are on the dispatcher, adapter tests assert published
values with no accelerator and with a fake accelerator, a negative-cycle fixture sets
`hasNegativeCycle`, an over-bound graph is refused with a coded error before the run, and the
visual change is reviewed.

**element-adapters-on-shipped-ports.** Move `HITSAlgorithm`, `KatzCentralityAlgorithm`,
`KCoreAlgorithm`, `LouvainAlgorithm` and `DegreeAlgorithm` onto the dispatcher: the first four
through `this.accelerated(...)` with every schema option mapped (an option the port lacks is
implemented or refused, never dropped); Degree from the input snapshot's degree views. Forward
`hits` and `katzCentrality` in `graphty-element/src/acceleration/narrow.ts` with their floors in
`acceleration/types.ts` (section 3); k-core and Louvain stay on the CPU port. Done when: all five
are on the dispatcher, adapter tests match the legacy route on the existing fixtures (scores within
1e-9, identical coreness and degree, Louvain modularity within tolerance), routing tests cover both
sides of each floor, and the visual change is reviewed.

### Phase 2 -- algorithm ports by family

Each port adds `indexed.*` functions, their flat types, dispatcher methods where the seam declares
the member, fixture tests and a differential test against legacy.

**port-traversal-family.** `depthFirstSearch`, `hasCycle`, `topologicalSort`, `isBipartite`
(returning the two sides as a mask, which also serves `bipartitePartition`),
`stronglyConnectedComponents` (iterative Tarjan, labels in completion order, also serving
`findStronglyConnectedComponents`), condensation via `contract(labels)` with legacy numbering
(serving `condensationGraph`), `directionOptimizedBfs` over `reverse()`, and an early-stop `target`
option on `indexed.breadthFirstSearch`. Done when: labels, visit order, sides and `componentMap`
equal legacy on every fixture.

**port-paths-and-trees-family.** `bellmanFord` (SSSP result plus `hasNegativeCycle`, undirected
edges relaxed both ways) with a `bellmanFord` dispatcher method (the seam already declares the
member), `bidirectionalDijkstra` (serving `dijkstraPath`), `astar` (heuristic over node indices),
`primMST` (discovery arc as `predArc`) with a spanning-forest option that roots a tree in every
component. Each takes the per-arc f64 `weights` override. Done when: results equal legacy exactly
through the override, parallel edges resolve to the exact edge, negative cycles and unreachable
targets are covered, the forest equals legacy Prim run per component, and dispatcher tests cover
both paths.

**port-path-centrality-family.** `degreeCentrality`, `closenessCentrality` (unweighted and
weighted, one node or all), `betweennessCentrality` (Brandes, simple-graph sigma counting,
endpoints, normalised, sampled sources in index space, keeping the node-id-0 fix of #555) and
`edgeBetweennessCentrality` with an optional alive-edge mask (Girvan-Newman needs it); dispatcher
methods for betweenness, edge betweenness and closeness. Done when: scores equal legacy within 1e-9
on undirected, directed, weighted and multigraph fixtures, sampled betweenness with explicit sources
is deterministic, a masked edge betweenness equals the unmasked one on the graph with those edges
deleted, and dispatcher tests cover both paths.

**port-eigenvector-and-personalized-pagerank.** `eigenvectorCentrality` (throws
`ConvergenceError` as legacy does), `personalizedPageRank`, initial ranks on `indexed.pageRank`,
and undirected input to `indexed.pageRank` (each edge carries rank both ways; the element's
undirected route needs it, although legacy `pageRank` throws on an undirected `Graph`); dispatcher
methods for eigenvector and personalized PageRank. Done when: scores, iterations and converged
flags equal legacy within 1e-9, the `ConvergenceError` cases reproduce, and an undirected snapshot
gives the same scores as legacy `pageRank` on the directed graph with both arcs of every edge.

**port-delta-pagerank.** The delta PageRank engines: the `useDelta` path of `pageRank` (keeping
legacy's n > 100 rule), `DeltaPageRank` and `PriorityDeltaPageRank` over snapshots. Done when:
scores, iterations and converged flags equal legacy within 1e-9 on every fixture above and below
the threshold.

**port-community-family.** `leiden` (`contract()` per level, `weightedDegree()` modularity, seeded
generator), `girvanNewman` (alive bitmap over logical edges, masked edge betweenness, dendrogram
`{ levels, modularity }`), `labelPropagationSemiSupervised` on the FLPA kernel (seeds fixed, empty
and 100k seed maps handled, labels renumbered), and a synchronous counterpart of
`labelPropagationAsync` with a swap guard under a name that says it is synchronous. Done when:
Leiden and Girvan-Newman modularity is at least legacy's on the fixtures, every seed keeps its
label, and `validate({ checksum: true })` passes after every call.

**port-flow-and-cut-family.** `maxFlow` (Edmonds-Karp and Ford-Fulkerson over a residual graph
from `fromEdgeArrays`, twin rule `e + E`, capacity per node pair (section 2),
returning `{ maxFlow, flow, sourceSide, cutEdges }`), `minSTCut`, `stoerWagner` (representative
array and `IndexedMaxHeap`, no `contract()`), `kargerMinCut` (`IntUnionFind`, seeded edge order),
and `bipartiteFlowNetwork` (the snapshot-returning replacement of `createBipartiteFlowNetwork`,
which takes arrays and returns a Map-of-Maps; the legacy function needs no delegation). Done when:
flow values, per-edge flows, cut values and partitions equal legacy on directed, undirected and
weighted fixtures, including numeric ids passed as strings, a seeded Karger run is deterministic,
and `maxFlow` over `bipartiteFlowNetwork` equals legacy over `createBipartiteFlowNetwork`.

**port-matching-and-isomorphism-family.** `maximumBipartiteMatching`, `greedyBipartiteMatching`
(matching as `Uint32Array` with `INVALID_INDEX`, sides from `indexed.isBipartite`), `isGraphIsomorphic`
and `findAllIsomorphisms` (VF2 over two snapshots, simple-graph neighbourhoods, index-based match
callbacks). Done when: matching sizes equal legacy and every returned mapping is verified as an
isomorphism, with counts equal to legacy including callbacks.

**port-link-prediction-family.** The eleven link-prediction exports minus the ported
`commonNeighborsScore`: `commonNeighborsPrediction`, `commonNeighborsForPairs`,
`getTopCandidatesForNode`, `evaluateCommonNeighbors`, `adamicAdarScore`, `adamicAdarPrediction`,
`adamicAdarForPairs`, `getTopAdamicAdarCandidatesForNode`, `evaluateAdamicAdar` and
`compareAdamicAdarWithCommonNeighbors`, over sorted-row merges with simple-graph semantics. Done
when: scores, orderings and metrics equal legacy on directed, undirected and multigraph fixtures.

**port-hierarchical-markov-spectral-clustering.** `hierarchicalClustering` (all linkages, members
as index lists), `markovClustering`, `calculateMCLModularity` (`weightedDegree()`) and
`spectralClustering` (Laplacian over the CSR). Done when: each equals legacy on the fixtures, or
matches or beats it on its own quality metric where legacy is randomised.

**port-research-clustering.** `syncClustering`, `teraHAC` (index-based, which removes its id/index
defect) and `grsbm` (`weightedDegree()` modularity). Done when: each equals legacy on the
fixtures, or matches or beats it on its own quality metric where legacy is randomised, and the
teraHAC defect has a regression test.

### Phase 3 -- facades

Each item makes the named legacy functions delegate internally through `toSnapshot` (or
`fromAdjacencyMap` for Map inputs), keeping their signatures, wherever the differential test passes
(section 3). Done when, for every item: each delegating function has a differential test that runs
THROUGH the facade; existing legacy tests pass unchanged; the commit body lists every function
left on legacy code with the reason and how its port's results differ.

**facades-traversal-paths-trees.** BFS family (delete the >10000-node dual dispatch and the
`WeakMap<Graph, CSRGraph>` cache in `bfs-unified.ts`), DFS, cycle, topological sort,
`isBipartite`, `bipartitePartition`, Dijkstra family including `singleSourceShortestPath`,
`dijkstraPath` and the Map-returning `allPairsShortestPath` if not already delegated, Bellman-Ford
family, `astar` and `astarWithDetails` (Map input through `fromAdjacencyMap`), the component
functions, `condensationGraph`, Kruskal, `minimumSpanningTree`, Prim.

**facades-centrality.** PageRank family (`pageRank` including `useDelta`, `pageRankCentrality`,
`topPageRankNodes`, `DeltaPageRank`, `PriorityDeltaPageRank`), personalized PageRank, HITS, Katz,
eigenvector, degree, closeness, betweenness and edge betweenness, and their `node*` variants.

**facades-community-flow-matching.** Louvain (expected to stay legacy: the port is not move-for-
move identical), Leiden, Girvan-Newman, the two remaining label propagation variants, k-core, the
flow and cut functions (Map inputs through `fromAdjacencyMap`), matching, isomorphism.

**facades-link-prediction-clustering.** The ten link-prediction functions of the link family and
the seven clustering and research functions.

### Phase 4 -- graphty-element adapters on the new ports

**element-adapters-traversal-and-paths.** BFS (target through the port; delete `legacyWalk`),
DFS, Bellman-Ford, Prim (the port's spanning forest replaces the per-component legacy `Graph`s and
the legacy `connectedComponents` call in `PrimAlgorithm.ts`), strongly connected components, and
PageRank's remaining legacy route (personalisation, initial ranks, undirected; delete
`legacyPageRankReason`). Edge results through `edgeRemap`, not `edgePairKey`. Done when: all six
are on the dispatcher, results equal the legacy route, both edges of a collapsed reciprocal pair and
every member of a parallel group carry the tree or path flag, and the visual change is reviewed.

**element-adapters-centrality-and-community.** Betweenness, closeness, eigenvector (forwarded to
the GPU with its floor, section 3), Leiden, Girvan-Newman. Done when: all five are on the
dispatcher, results equal the legacy route within the documented tolerances, routing tests cover
both sides of the eigenvector floor, and the visual change is reviewed.

**element-adapters-flow-matching-link.** Max flow and min cut with capacity written to a store edge
column and passed as `expandEdges` of it (delete `Algorithm.edgeRecord`), bipartite matching
(`bipartitePartition` replaced by `indexed.isBipartite`), link prediction. Done when: all four are
on the dispatcher, flow values and cut sets equal the legacy route, `Algorithm.edgeRecord` is gone,
and the visual change is reviewed.

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
`dist` with non-finite entries as the 1e6 fill), `indexed.forceAtlas2` (with `nodeMass` and
`nodeSize` accepting a `Float32Array` or a node column name as well as the legacy record) and
`indexed.fruchtermanReingold` as one-shots over the simulations, `fruchtermanReingoldLayout` and
`springLayout` as wrappers, and `indexed.arf`. Done when: the NetworkX Kamada-Kawai fixtures pass
through both entry points, an injected `dist` equal to the computed one gives identical positions,
a mass column gives the same positions as the equivalent record, and a fixed node does not move
under Fruchterman-Reingold.

**layout-close-l1.** Layout docs (README, VitePress, `layout/CLAUDE.md`) describe `indexed.*`, and
a type-level test asserts every indexed layout takes `(GraphSnapshot, options?)` and returns
`LayoutResult`. Done when: the suite, the bundle build and the docs build are green and every
layout story change since the start of phase 5 is explained and waiting for the owner in
visual-review.

**element-static-layout-engines.** `SimpleLayoutEngine` loads the undirected snapshot and the
position array, calls `indexed.*`, writes with `toPositionColumn`, reseeds with
`fromPositionColumn` and the pinned mask, and reloads on snapshot replacement. Delete
`LayoutEngine.pairWeights`, `pairWeightKey` and the per-call `{ nodes, edges }` objects. Kamada-Kawai
gets the derived `1 / sum` column of section 3 (parallel weights summed first). `FixedLayout` reads
the position array. Done when: no engine imports a positional layout function,
`weighted-layouts.test.ts` passes without `pairWeights` (its "sums two parallel edges" case
included, its oracle moved from `kamadaKawaiLayout` to `indexed.kamadaKawai`), a reload after
adding nodes keeps existing coordinates, and the visual change is reviewed.

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

**element-import-through-graph-io.** Add `@graphty/graph-io` to graphty-element as a dependency,
declared the same way graph-format is (package.json, tsconfig references, build order, bundle).
One helper in `src/data` runs an importer into a scratch builder, freezes it and yields the records
the DataManager consumes today, maps the import report onto `ErrorAggregator`, maps direction onto
`declareDirection`, and applies the per-format compatibility mapping that keeps 2.x keys. Done
when: a unit test with a recording importer asserts record counts, aggregated errors and direction,
and the element builds with graph-io in its bundle.

**element-csv-and-json-sources.** `CSVDataSource` (variants mapped to graph-io tables or its Neo4j
importer; papaparse and `csv-variant-detection.ts` deleted) and `JsonDataSource` (paths mapped, a
non-plain JMESPath evaluated in the element first, schemas kept) over the helper. Done when: every
existing CSV, Neo4j and JSON element test passes unchanged, papaparse is gone, and the visual
change is reviewed.

**element-gexf-and-graphml-sources.** Both over the helper with mappings that rebuild today's keys;
`addMissingNodes: true` for GEXF; fast-xml-parser deleted; the 16.5 check (lesmiserables.gexf under
`directed: "auto"` is undirected with 254 edges). Done when: existing tests pass unchanged, the
16.5 check passes, fast-xml-parser is gone, and the visual change is reviewed.

**element-gml-dot-pajek-sources.** The three over the helper, deleting their hand-written parsers
(`parsePajek` and `tokenizeLine` in `PajekDataSource.ts`, the tokenisers in `DOTDataSource.ts` and
`GMLDataSource.ts`); a test that a truncated GML file emits `data-loading-error` with the open
bracket's line and keeps the current graph (closes #503). Done when: that test and the existing
GML, DOT and Pajek tests pass, and the visual change is reviewed.

**element-detection-and-corpus-cleanup.** Built-in detectors in `src/catalog/detect.ts` delegate to
graph-io's sniffing (the `./catalog` entry stays free of Babylon.js, Lit and the DOM); delete the
duplicated parser corpus under `graphty-element/test/helpers/corpus` except fixtures element tests
use; update the element data-source docs. Done when: detection tests and the Node-safety test pass,
every `*DataSource.ts` in `src/data` imports its importer from `@graphty/graph-io`, and knip reports
nothing unused.

**element-export-api.** Needs the owner (section 6). Export the graph in every graph-io format from a
snapshot with attribute columns built from the data bags and current positions, returning graph-
io's loss notes; `canExport: true` in the catalog. Done when: for each of the eight formats a
corpus file loads, exports and reloads with equal counts, ids and the fidelity matrix's keys.

### Phase 7 -- deprecation, removal and proof

**housekeeping-issues.** #101 (no published graph-format file writes producer `dev`), close #100
with commit f7db019c and its test as evidence, close #102 (the design now requires a scoped
breaking commit), and correct the version column of the root `CLAUDE.md` package table. Done when:
the three issues are closed with evidence and the table's versions match the package.json files.

**element-dependency-declarations.** Needs the owner (section 6). Issue #85: declare graph-format
once in graphty-element, and graph-io the same way, as the owner decides. Done when: `pnpm pack`
shows each package exactly once in the chosen field, an install of the packed tarball into a clean
project resolves with no ERESOLVE, and #85 is closed.

**element-plugin-seam.** Needs the owner (section 6). Add a documented snapshot accessor for plugin
algorithms (the scoped input's snapshot plus the edge remap), rewrite
`graphty-element/docs/guide/extending/custom-algorithms.md` around it, and deprecate or remove
`Algorithm.algorithmGraph()` and the `AlgorithmGraphView` export in `graphty-element/extend.ts` as
the owner decides. Move `mergedParallelEdges` out of `algorithms/utils/snapshotGraph.ts` (its other
importer is `managers/AlgorithmManager.ts`), then delete `toAlgorithmGraph` and the file when
nothing internal calls it. A removal is committed as `feat(graphty-element)!:` with a BREAKING
CHANGE footer. Done when: a test plugin written only against the documented extend API computes a
result without importing `@graphty/algorithms`, nothing in `graphty-element/src` constructs a
legacy `Graph`, and the docs example runs as a check.

**deprecate-legacy-entry-points.** Tag `@deprecated`, with the replacement named: the legacy
`Graph` class and its input paths, `graphToMap`, `CSRGraph` and `optimized/*`, every legacy
algorithm function, the Map-of-Maps signatures, the 16 positional layouts and PositionMap
utilities. An eslint override exempts only the legacy directories scheduled for deletion. Each
deprecation of a name the removal release reuses says the result type changes at 3.0.0. Ships as
an algorithms minor and a layout minor. Done when: lint is green everywhere with no-deprecated at
error outside those directories, and a test fails if graphty-element, webgpu-graph-algorithms or
graphty src imports a deprecated name.

**ship-dual-api-window.** Open the pull request from `feat/graph-format-migration` to master; the
owner merges it. Done when: the algorithms 2.x minor, the layout 1.x minor and the graphty-element
minor carrying the deprecations are published on npm.

**algorithms-3-0-removal.** First convert every differential test into a golden-fixture test
(legacy outputs recorded to files, the port checked against them), respecting the Floyd-Warshall
coverage rule. Then delete the legacy `Graph`, every legacy implementation, `optimized/*`,
`graphToMap`, `CSRGraph`, the Map-of-Maps signatures and the `PageRankOptions` of
`types/index.ts`; promote `indexed.*` (including `allPairsShortestPath` and `labelPropagation` with
their indexed signatures) to the top level, keeping `indexed` as a deprecated alias for one major.
Migrate algorithms stories, docs, examples and benchmarks; the webgpu tests' legacy oracles; and
graphty-element's test oracles (`test/algorithms/accelerated-adapters.test.ts`,
`test/session/cost/estimate-against-measured-runs.test.ts` and the others that import legacy
functions). Widen webgpu-graph-algorithms' peer to `^3.0.0` in the same change. Scoped breaking
commit `feat(algorithms)!:` whose BREAKING CHANGE footer lists every same-name replacement (4.4)
and every function that stayed on legacy code with how its replacement's results differ. Done
when: the number of converted golden suites equals the number of differential suites; a type-level
export test pins each promoted name's `GraphSnapshot` signature and asserts every removed name is
gone; the migration table maps each of the 90 functions and 3 classes to a replacement or a recipe;
every workspace build, lint, knip and test project is green including the webgpu lanes; and
`nx release --dry-run` bumps algorithms to 3.0.0, and graphty-element to a major exactly when the
plugin seam removal landed, without aborting.

**layout-2-0-removal.** Delete the 16 positional signatures and the 8 generator aliases; promote
`indexed.*`; migrate layout stories, README and `layout/examples-legacy/` (17 HTML files calling
positional layouts: migrate or delete), and graphty-element's `test/layout/weighted-layouts.test.ts`
if it still imports a positional layout; widen webgpu-graph-algorithms' layout peer to `^2.0.0`.
`feat(layout)!:` with a BREAKING CHANGE footer. Done when: a type-level export test asserts the
promoted signatures and the removals, and `nx release --dry-run` bumps layout to 2.0.0 without
aborting.

**conventions-and-docs-rewrite.** The algorithm pattern in the root `CLAUDE.md` and
`algorithms/CLAUDE.md` becomes `algorithmName(snapshot: GraphSnapshot, options?): Result`, the
layout interface to match; algorithms and layout READMEs and getting-started guides build a
snapshot; the Floyd-Warshall hang note goes with the legacy code. Done when: no doc shows
`ReadonlyGraph<TNodeId>` or a positional layout call and the guides' code samples run as checks.

**verify-migration-complete.** Section 7, then open the second pull request from the integration
branch to master. Done when: the check is in CI and green, every CI shard and GPU lane is green,
visual diffs are approved by the owner, and `STATUS.md` records the finished state.

## 6. Decisions only the owner can make

Each changes a published contract that the design never specified.

1. **The element's plugin seam** (blocks `element-plugin-seam`, and through it the removal
   release). `@graphty/graphty-element/extend` exports `AlgorithmGraphView`, an alias of the legacy
   `Graph` of `@graphty/algorithms`, and documents `Algorithm.algorithmGraph()` for plugin authors.
   PR #553 already takes graphty-element 3.0.0. Options: (a) add the snapshot accessor and
   deprecate `algorithmGraph` in a 3.x minor, remove it in graphty-element 4.0.0 together with
   algorithms 3.0.0 (recommended); (b) land the removal inside #553's 3.0.0 window, which needs
   every element adapter moved before #553 merges; (c) keep the legacy class alive in algorithms
   3.x as an unsupported compatibility type; (d) move a copy of the class into graphty-element.
2. **The element's export API** (blocks `element-export-api`). The method name and signature (for
   example `exportGraph(format, options) -> Promise<{ text, lossNotes }>`), what an export contains
   (data bags and laid-out positions only, or also styles and algorithm results), and whether third
   parties can register writers.
3. **How graphty-element declares graph-format and graph-io** (blocks
   `element-dependency-declarations`, issue #85). graph-format is today both a dependency and a
   required peer. Options: (a) peer only, with a caret range (a consumer shares one copy with
   their own code; npm 7+ and pnpm install it automatically); (b) dependency only (the element
   always brings its own copy; a consumer's snapshot type may then come from a second copy).
   graph-io follows the same choice.
4. **Whether the legacy flow and cut functions delegate to their ports** (blocks the flow and
   cut part of `facades-community-flow-matching`). The ports equal legacy on every graph except
   these four cases, where they differ on purpose:
    - Two opposite directed edges that both carry flow: legacy `edmondsKarp` and `fordFulkerson`
      book every push on the edge in the push's direction, so one edge can show more flow than its
      capacity. The port reports the pair's net flow on the edge in its direction, within capacity.
      The flow value and the cut are the same.
    - `minSTCut` on a graph with numeric ids: legacy looks each cut edge up by string id, misses,
      and reports no cut edges. The port reports them.
    - `stoerWagner` on a directed graph: legacy keeps one of two opposite edges' weights; the port
      adds both.
    - `kargerMinCut`: legacy draws from `Math.random` and only considers arcs whose source id sorts
      first; the port takes a `randomSeed`, picks every remaining edge with equal probability and
      reads a directed graph as undirected. Legacy is not reproducible, so no seed matches it.
      Options: (a) approve all four and delegate every flow and cut function, listing the changes in
      section 4.3 (recommended: each legacy result in those cases is wrong or unreproducible); (b)
      delegate only where results are equal today (`edmondsKarp` and `fordFulkerson` keep legacy code
      because of the opposite-edge case) and leave the rest on legacy code until the removal release.

## 7. How completion is verified

1. **A workspace check under `tools/`, run in CI**, fails when any package's src imports a removed
   legacy name, calls `toAlgorithmGraph` or `algorithmGraph`, constructs a legacy `Graph`, calls a
   positional layout function, or when a `*DataSource.ts` in `graphty-element/src/data` does not
   import its importer from `@graphty/graph-io`, or when graphty-element src imports papaparse or
   fast-xml-parser, or when `csv-variant-detection.ts` or a parser function (`parsePajek`,
   `tokenizeLine` and the DOT and GML tokenisers) exists in `graphty-element/src/data`.
2. **Export-list tests** in algorithms and layout pin every promoted name's snapshot signature at
   the type level and assert every removed name is gone. A migration table in the test maps each of
   the 90 legacy functions and 3 classes, and each of the 16 layouts, to its replacement or its
   documented recipe (section 3).
3. **Golden-fixture suites** (the differential suites of phases 2-5, converted at the removal
   release) stay in the repository as the record that each replacement computes what the legacy
   function did, or differs only as the changelog says.
4. **The full CI-parity gate**: `tools/prepush.sh`, every graphty-element browser, storybook and xr
   shard, the webgpu node and browser lanes, `gpu.yml` and `hosts.yml`, and `nx release --dry-run`.
5. **Visual review**: every changed story or visual test is explained and approved by the owner.
6. **`STATUS.md`** gets a final section with the counts: indexed functions, legacy functions left
   (zero), element adapters on the dispatcher (all 25), static layout engines on `indexed.*` (all
   13), element parsers (zero).

## 8. Outside this plan

- Routing betweenness, all-pairs, triangle counting, label propagation, closeness and Bellman-Ford
  to the GPU (issue #558), after PRs #549, #550 and #552 merge. That work also narrows the seam's
  option types for `allPairsShortestPath` and `labelPropagation`, which today take `SsspOptions`
  and `HitsOptionsLike`.
- A neighbour query on the element session so the graphty app stops scanning edges in
  `AppShell.tsx` (issue #314).
- Per-edge direction in the element (issue #309), Neo4j APOC formats (#303, #304), SIF and CX2
  (#306, #307).

## 9. Review findings on the first draft of this plan

Accepted findings are folded into the sections above. These were not taken, or were taken in a
different form:

- **"Make #553 a prerequisite of every element adapter item."** Not taken for the adapters: #553
  changes no file under `graphty-element/src/algorithms/` or `src/acceleration/`. It is a
  prerequisite (through `absorb-open-element-prs`) of the data layer, static layout engines,
  import through graph-io and plugin seam items, which share files with it.
- **"Forward bellmanFord, closenessCentrality and eigenvectorCentrality in the element."** Taken
  for eigenvector (unconditional crossover, 6,600 nodes) and for the `bellmanFord` dispatcher
  method, so any consumer can route it. Not taken for the element's Bellman-Ford and closeness
  forwarding: the cost record says Bellman-Ford earns the GPU only with negative weights and
  closeness only when sampled, so each needs a conditional rule; that is issue #558's work.
- **"Pin which result type each colliding name returns in each major."** Taken in a different
  form: legacy names are not widened to accept a snapshot at all (section 2), so no name has a
  snapshot overload whose result changes at 3.0.0. The 3.0.0 export test pins the promoted
  signatures.
- **"Split port-clustering-family into three."** Split into two (four and three functions), which
  keeps each item within one family and near the size of the Floyd-Warshall port per algorithm.
