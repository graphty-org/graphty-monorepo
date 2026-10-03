## 3.5.4 (2026-10-03)

### 🩹 Fixes

- **graphty-element:** ship the MIT license text with the package ([f00e65d3](https://github.com/graphty-org/graphty-monorepo/commit/f00e65d3))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.25
- Updated algorithms to 3.1.8
- Updated graph-io to 0.3.18
- Updated layout to 2.0.8

### ❤️ Thank You

- Adam Powers @apowers313

## 3.5.3 (2026-10-02)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.24
- Updated algorithms to 3.1.7
- Updated layout to 2.0.7

## 3.5.2 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-io to 0.3.17

## 3.5.1 (2026-10-02)

### 🔥 Performance

- **graphty-element:** tear a whole graph down in linear time ([#543](https://github.com/graphty-org/graphty-monorepo/issues/543))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.23

### ❤️ Thank You

- Adam Powers @apowers313

## 3.5.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** route kruskal to the GPU above a measured floor ([252a19ed](https://github.com/graphty-org/graphty-monorepo/commit/252a19ed))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.22
- Updated algorithms to 3.1.6

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.2 (2026-10-02)

### 🩹 Fixes

- **graphty-element:** size a label from its first line of words, not a blank first line ([26eff59a](https://github.com/graphty-org/graphty-monorepo/commit/26eff59a))
- **graphty-element:** fade labels from the camera's world position; grow multi-line labels ([52fd3d7e](https://github.com/graphty-org/graphty-monorepo/commit/52fd3d7e))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.1 (2026-10-02)

### 🩹 Fixes

- **graphty-element:** classify the layout manager's graph-writes-waiting hook in the door list ([11171693](https://github.com/graphty-org/graphty-monorepo/commit/11171693))
- **graphty-element:** start a seeded layout over once per run of queued graph writes ([16cfdaa8](https://github.com/graphty-org/graphty-monorepo/commit/16cfdaa8))
- **graphty-element:** keep an explicitly placed camera instead of auto-framing over it ([7cda8df4](https://github.com/graphty-org/graphty-monorepo/commit/7cda8df4))
- **graphty-element:** restart a seeded layout when data arrives in a later write ([#650](https://github.com/graphty-org/graphty-monorepo/issues/650))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.21
- Updated algorithms to 3.1.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.4.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** name the modularity band in a community result's own reading ([d3ebb1ac](https://github.com/graphty-org/graphty-monorepo/commit/d3ebb1ac))
- **graphty-element:** route the triangle count to the GPU on an edge floor ([#678](https://github.com/graphty-org/graphty-monorepo/pull/678))
- **graphty-element:** publish an interpretation scale for modularity and RunResult.band() ([#546](https://github.com/graphty-org/graphty-monorepo/issues/546))
- **graphty-element:** read node and edge records a page at a time ([#575](https://github.com/graphty-org/graphty-monorepo/issues/575))
- **graphty-element:** ai key store restores itself and keeps the default provider ([#576](https://github.com/graphty-org/graphty-monorepo/issues/576), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))
- **graphty-element:** add zoomToNodes to frame a set of nodes in 2D and 3D ([eec1e9b5](https://github.com/graphty-org/graphty-monorepo/commit/eec1e9b5))
- **graphty-element:** give channel descriptors a short name, group, default and reason ([2680142b](https://github.com/graphty-org/graphty-monorepo/commit/2680142b))
- **graphty-element:** export notes as columns on request, and report the notes left out ([b39b2dd3](https://github.com/graphty-org/graphty-monorepo/commit/b39b2dd3))
- **graphty-element:** draw label and tooltip text bound to a note as plain text ([e97f6f36](https://github.com/graphty-org/graphty-monorepo/commit/e97f6f36))
- **graphty-element:** read note counts and newest text through graphty.notes.* style paths ([be1d65a8](https://github.com/graphty-org/graphty-monorepo/commit/be1d65a8))
- **graphty-element:** save and open notes with toDocument and mergeDocument ([e2ac4893](https://github.com/graphty-org/graphty-monorepo/commit/e2ac4893))
- **graphty-element:** add the document error codes and the warning code union ([7dacc3bb](https://github.com/graphty-org/graphty-monorepo/commit/7dacc3bb))
- **graphty-element:** select what a note is about, and list notes among a set's users ([db624628](https://github.com/graphty-org/graphty-monorepo/commit/db624628))
- **graphty-element:** mirror note:changed as the graphty-note-change DOM event ([9df281ea](https://github.com/graphty-org/graphty-monorepo/commit/9df281ea))
- **graphty-element:** add session.notes with undoable add, update and remove ([965b7a5c](https://github.com/graphty-org/graphty-monorepo/commit/965b7a5c))
- **graphty-element:** add the author project setting ([5a13ed97](https://github.com/graphty-org/graphty-monorepo/commit/5a13ed97))

### 🩹 Fixes

- **graphty-element:** set the triangle edge floor at the smallest measured all-win value ([#678](https://github.com/graphty-org/graphty-monorepo/issues/678))
- **graphty-element:** sort a page by a bigint value without throwing ([45ef70aa](https://github.com/graphty-org/graphty-monorepo/commit/45ef70aa))
- **graphty-element:** set the triangle edge floor from seven sweeps ([8199b7a1](https://github.com/graphty-org/graphty-monorepo/commit/8199b7a1))
- **graphty-element:** save a loaded edge's note by its position at save time ([7f009140](https://github.com/graphty-org/graphty-monorepo/commit/7f009140))
- **graphty-element:** ai key store clear() keeps remembering on and skips non-string entries ([b15f68e6](https://github.com/graphty-org/graphty-monorepo/commit/b15f68e6))
- **graphty-element:** zoomToNodes takes one id or several, and frames a lone node ([b3d539b9](https://github.com/graphty-org/graphty-monorepo/commit/b3d539b9))
- **graphty-element:** save a note about a session-added edge by its position ([b681820e](https://github.com/graphty-org/graphty-monorepo/commit/b681820e))
- **graphty-element:** keep the notes reader out of the extend entry point ([51567728](https://github.com/graphty-org/graphty-monorepo/commit/51567728))
- **graphty-element:** report a graphty. column an export leaves out ([73a7bbc0](https://github.com/graphty-org/graphty-monorepo/commit/73a7bbc0))
- **graphty-element:** read a notes file once, and bind its session edge ids to nothing ([06cd19a6](https://github.com/graphty-org/graphty-monorepo/commit/06cd19a6))

### 🔥 Performance

- **graphty-element:** build a WebGPU graph once, after the renderer opens ([#614](https://github.com/graphty-org/graphty-monorepo/issues/614))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.20
- Updated @graphty/remote-logger to 2.0.1
- Updated graph-samples to 0.1.14
- Updated graph-format to 1.2.6
- Updated algorithms to 3.1.4
- Updated graph-io to 0.3.16
- Updated layout to 2.0.6

### ❤️ Thank You

- Adam Powers @apowers313

## 3.3.0 (2026-10-02)

### 🚀 Features

- **graphty-element:** choose the renderer, webgl or webgpu ([#464](https://github.com/graphty-org/graphty-monorepo/issues/464))
- **graphty-element:** park a moving edge at the start of its gradient when the scene stops animating ([57ecd41b](https://github.com/graphty-org/graphty-monorepo/commit/57ecd41b))

### 🩹 Fixes

- **graphty-element:** time the degree cost row at sizes it can measure ([8a4bb182](https://github.com/graphty-org/graphty-monorepo/commit/8a4bb182))
- **graphty-element:** count a video's duration from the recorder's first data ([cd9754a6](https://github.com/graphty-org/graphty-monorepo/commit/cd9754a6))
- **deps:** patch the open uuid, vitest mocker, ip-address and low-severity advisories ([a5a5109c](https://github.com/graphty-org/graphty-monorepo/commit/a5a5109c))
- **graphty-element:** paint runs beneath a partial user layer instead of suppressing them ([#551](https://github.com/graphty-org/graphty-monorepo/issues/551))
- **graphty-element:** stop a renderer open that outlives shutdown, and refuse changes during it ([1951634d](https://github.com/graphty-org/graphty-monorepo/commit/1951634d))
- **graphty-element:** give each animated line its own empty colours texture ([0a897fc9](https://github.com/graphty-org/graphty-monorepo/commit/0a897fc9))
- **graphty-element:** draw animated edges under webgpu ([9d688714](https://github.com/graphty-org/graphty-monorepo/commit/9d688714))
- **graphty-element:** draw an animated edge at the width the style asked for ([3cc18575](https://github.com/graphty-org/graphty-monorepo/commit/3cc18575))
- **graphty-element:** make an edge's animation speed set its speed ([#459](https://github.com/graphty-org/graphty-monorepo/issues/459))
- **compact-mantine:** inputs follow the size scale and the password toggle has a name ([#7](https://github.com/graphty-org/graphty-monorepo/issues/7), [#137](https://github.com/graphty-org/graphty-monorepo/issues/137), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.19
- Updated @graphty/remote-logger to 2.0.0
- Updated graph-samples to 0.1.13
- Updated graph-format to 1.2.5
- Updated algorithms to 3.1.3
- Updated graph-io to 0.3.15
- Updated layout to 2.0.5

### ❤️ Thank You

- Adam Powers @apowers313

## 3.2.0 (2026-10-01)

### 🚀 Features

- **graphty-element:** draw the default force layout on an accelerator ([#439](https://github.com/graphty-org/graphty-monorepo/issues/439))

### ❤️ Thank You

- Adam Powers @apowers313

## 3.1.3 (2026-10-01)

### 🩹 Fixes

- **graphty-element:** stop color-control inference on the background property ([7919af6b](https://github.com/graphty-org/graphty-monorepo/commit/7919af6b))
- **graphty-element:** stop the color control matching the background object ([b97ece3b](https://github.com/graphty-org/graphty-monorepo/commit/b97ece3b))
- **graphty-element:** draw the GPU, log panel, AI and simple tier stories in the standard frame ([e7f59a2d](https://github.com/graphty-org/graphty-monorepo/commit/e7f59a2d))
- **graphty-element:** take no placement steps while a layout's pre-steps are owed ([#553](https://github.com/graphty-org/graphty-monorepo/issues/553))
- **graphty-element:** an element with no data reports a stable frame ([76f701df](https://github.com/graphty-org/graphty-monorepo/commit/76f701df))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.18
- Updated @graphty/remote-logger to 1.3.16
- Updated graph-samples to 0.1.12
- Updated graph-format to 1.2.4
- Updated algorithms to 3.1.2
- Updated graph-io to 0.3.14
- Updated layout to 2.0.4

### ❤️ Thank You

- Adam Powers @apowers313

## 3.1.2 (2026-10-01)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.17
- Updated @graphty/remote-logger to 1.3.15
- Updated graph-samples to 0.1.11
- Updated graph-format to 1.2.3
- Updated algorithms to 3.1.1
- Updated graph-io to 0.3.13
- Updated layout to 2.0.3

## 3.1.1 (2026-10-01)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.16
- Updated algorithms to 3.1.0

## 3.1.0 (2026-09-30)

### 🚀 Features

- Run the built-in algorithms on the graph snapshot, give plugin algorithms a snapshot accessor, and fix algorithm results ([4404517f](https://github.com/graphty-org/graphty-monorepo/commit/4404517f))

    Features:
    - A plugin algorithm reads its graph through `context.input(orientation)`: the snapshot, the scope's masks, `subgraph()`, `input.edgeId(row)` and `input.subgraphEdgeIds(row)` for edge ids, `input.column(option)` for declared attribute and partition options, and the `weight` input option. `./extend` also exports `edgeMetricFields`, `Column` and `WeightMeaning`.
    - `closeness` takes `k` to sample that many source nodes on a big graph; the result says so in `caveats.exact` and `caveats.sampleSize`.
    - `@graphty/graph-format` is a regular dependency only, no longer also a peer dependency, so a consumer does not install it alongside.

    Deprecated (removed in 4.0):
    - `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type keep working and return the same object graph as 3.0. In TypeScript, `AlgorithmGraphView` is no longer the `@graphty/algorithms` 2.x `Graph` type itself, so a plugin passing it to its own `@graphty/algorithms@2` functions needs a cast to compile; run time is unchanged. Move to `context.input(...).subgraph()`; the custom-algorithms guide maps each old call to its replacement.
    - `SimpleLayoutEngine`: a one-pass layout is now registered with `registerSnapshotLayout`.

    Fixes (the migration guide, "Algorithm results fixed in 3.x", lists every one):
    - PageRank and strongly connected components on an undirected graph read every edge both ways.
    - Prim and Bellman-Ford break equal-cost ties by edge order; Bellman-Ford marks no route through a negative cycle.
    - A node option naming no node (a BFS target, a DFS source or target, a Bellman-Ford source or target, a Prim start node) is refused with `E_OPTION_RANGE` instead of being silently ignored; so are `source` equal to `sink` in max flow and min cut, and `endpoints: true` on HITS, Katz and eigenvector centrality.
    - k-core, Louvain, label propagation, HITS and Katz modes, max flow, min cut, Karger, bipartite matching, Floyd-Warshall and Adamic-Adar results are corrected as the guide describes.
    - DOT, GML and Pajek files load through `@graphty/graph-io`, as Graphviz, NetworkX and Pajek define them; the data-sources guide, "Changes in graphty-element 3.1", lists the edge cases that load differently.

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.15
- Updated @graphty/remote-logger to 1.3.14
- Updated graph-samples to 0.1.10
- Updated graph-format to 1.2.2
- Updated algorithms to 3.0.0
- Updated graph-io to 0.3.12
- Updated layout to 2.0.2

### ❤️ Thank You

- Adam Powers @apowers313

## 3.0.1 (2026-09-30)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.14
- Updated @graphty/remote-logger to 1.3.13
- Updated graph-samples to 0.1.9
- Updated graph-format to 1.2.1
- Updated algorithms to 2.2.1
- Updated graph-io to 0.3.11
- Updated layout to 2.0.1

# 3.0.0 (2026-09-29)

### 🚀 Features

- **graphty-element:** build defineAlgorithm on an ordinary DeclaredAlgorithm registration ([25f89be1](https://github.com/graphty-org/graphty-monorepo/commit/25f89be1))
- **graphty-element:** build defineLayout, the simple tier's layout verb ([cd099f96](https://github.com/graphty-org/graphty-monorepo/commit/cd099f96))
- **graphty-element:** build defineLogDestination over registerLogSink ([46cf9cdb](https://github.com/graphty-org/graphty-monorepo/commit/46cf9cdb))
- **graphty-element:** build definePalette and setDefaultPalettes ([757d9e33](https://github.com/graphty-org/graphty-monorepo/commit/757d9e33))
- **graphty-element:** add the simple extension tier's graph view and define plumbing ([24d84233](https://github.com/graphty-org/graphty-monorepo/commit/24d84233))
- **graphty-element:** read json files through graph-io ([0d85280d](https://github.com/graphty-org/graphty-monorepo/commit/0d85280d))
- **graphty-element:** read csv and neo4j files through graph-io ([00745eec](https://github.com/graphty-org/graphty-monorepo/commit/00745eec))
- **graphty-element:** read gexf and graphml through graph-io ([97629983](https://github.com/graphty-org/graphty-monorepo/commit/97629983))
- **graphty-element:** run bfs, dfs, bellman-ford, prim, scc and pagerank on the index ports ([560d29f0](https://github.com/graphty-org/graphty-monorepo/commit/560d29f0))
- **graphty-element:** forward hits, katz and eigenvector centrality to the gpu ([ad98d559](https://github.com/graphty-org/graphty-monorepo/commit/ad98d559))
- **graphty-element:** read a file through a graph-io importer into today's records ([9fae5c16](https://github.com/graphty-org/graphty-monorepo/commit/9fae5c16))
- **graphty-element:** run the static layout engines on the indexed layouts ([d055587d](https://github.com/graphty-org/graphty-monorepo/commit/d055587d))
- **graphty-element:** run eigenvector, betweenness and closeness on the index-based ports ([#558](https://github.com/graphty-org/graphty-monorepo/issues/558))
- **graphty-element:** run floyd-warshall and label propagation on the dispatcher ([b492d3d8](https://github.com/graphty-org/graphty-monorepo/commit/b492d3d8))
- **graphty:** reach the element only through its session and public doors ([0372cc3a](https://github.com/graphty-org/graphty-monorepo/commit/0372cc3a))
- **graphty:** warn wherever the app changes the element outside session commands ([3b896764](https://github.com/graphty-org/graphty-monorepo/commit/3b896764))
- **graphty-element:** select what undo changed, and keep run results as columns ([8e0310f2](https://github.com/graphty-org/graphty-monorepo/commit/8e0310f2))
- **graphty-element:** add zoom step and zoom to selection as camera members ([ee4bd38d](https://github.com/graphty-org/graphty-monorepo/commit/ee4bd38d))
- **graphty-element:** make a drag, an assistant message and a batch one undoable step each ([383bbefa](https://github.com/graphty-org/graphty-monorepo/commit/383bbefa))
- **graphty-element:** close the public members that changed a graph without a step ([63920074](https://github.com/graphty-org/graphty-monorepo/commit/63920074))
- **graphty-element:** freeze records and seal the resident snapshot outside commands ([65193152](https://github.com/graphty-org/graphty-monorepo/commit/65193152))
- **graphty-element:** make a plugin algorithm without a descriptor one undoable step ([20f9e4fc](https://github.com/graphty-org/graphty-monorepo/commit/20f9e4fc))
- **graphty-element:** make the layout choice and 2d or 3d undoable steps ([b182121e](https://github.com/graphty-org/graphty-monorepo/commit/b182121e))
- **graphty-element:** keep coordinates right across datasets, cancelled loads and eviction ([0b75a106](https://github.com/graphty-org/graphty-monorepo/commit/0b75a106))
- **graphty-element:** restore node coordinates and pins on undo without reheating the layout ([f03521db](https://github.com/graphty-org/graphty-monorepo/commit/f03521db))
- **graphty-element:** make a run, its result and its layers one undoable step ([1cb8f222](https://github.com/graphty-org/graphty-monorepo/commit/1cb8f222))
- **graphty-element:** make imports, expansions and data batches undoable steps ([005156c5](https://github.com/graphty-org/graphty-monorepo/commit/005156c5))
- **graphty-element:** make node and edge removal and clearing undoable steps ([e220c4cd](https://github.com/graphty-org/graphty-monorepo/commit/e220c4cd))
- **graphty-element:** make graph additions and attribute edits undoable steps ([96866bc1](https://github.com/graphty-org/graphty-monorepo/commit/96866bc1))
- **graphty-element:** make project settings undoable steps behind a frozen configuration ([e5032312](https://github.com/graphty-org/graphty-monorepo/commit/e5032312))
- **graphty-element:** make saved scopes and saved camera views undoable steps ([5823f500](https://github.com/graphty-org/graphty-monorepo/commit/5823f500))
- **graphty-element:** make filter, time window and show-context undoable steps ([b12cbfac](https://github.com/graphty-org/graphty-monorepo/commit/b12cbfac))
- **graphty-element:** make every style edit one undoable step ([025a1e24](https://github.com/graphty-org/graphty-monorepo/commit/025a1e24))
- **graphty-element:** publish undo, redo, history, transaction and execute on the session ([e5eabc2e](https://github.com/graphty-org/graphty-monorepo/commit/e5eabc2e))
- **graphty-element:** derive every change on its own lane and publish events in one order ([f83f4bf3](https://github.com/graphty-org/graphty-monorepo/commit/f83f4bf3))
- **graphty-element:** queue commands, hold keys and cancel pending work on undo ([b5811c2d](https://github.com/graphty-org/graphty-monorepo/commit/b5811c2d))
- **graphty-element:** add the dispatcher with groups, rollback and transactions ([ec587c4e](https://github.com/graphty-org/graphty-monorepo/commit/ec587c4e))
- **graphty-element:** add the undo history with coalescing and a memory budget ([e633f890](https://github.com/graphty-org/graphty-monorepo/commit/e633f890))
- **graphty-element:** add project state, drafts and patches for undo ([948bc525](https://github.com/graphty-org/graphty-monorepo/commit/948bc525))

### 🩹 Fixes

- **graphty-element:** refit eigenvector centrality's cost to the snapshot kernel ([bcdc1df4](https://github.com/graphty-org/graphty-monorepo/commit/bcdc1df4))
- **graphty-element:** refit the cost model to the snapshot kernels ([8450f3b8](https://github.com/graphty-org/graphty-monorepo/commit/8450f3b8))
- **graphty-element:** keep the session dispatcher out of the extend entry point ([f57a3104](https://github.com/graphty-org/graphty-monorepo/commit/f57a3104))
- **graphty-element:** keep the layout engines out of the catalog entry point ([a30d96e0](https://github.com/graphty-org/graphty-monorepo/commit/a30d96e0))
- **graphty-element:** let a static layout chosen before any data wait for it ([52d25fba](https://github.com/graphty-org/graphty-monorepo/commit/52d25fba))
- **graphty-element:** keep 2D edges and nodes on the plane whatever Z arrives ([b94fa96f](https://github.com/graphty-org/graphty-monorepo/commit/b94fa96f))
- **graphty-element:** a click selects a node without pinning it ([32ab4309](https://github.com/graphty-org/graphty-monorepo/commit/32ab4309))
- **graphty-element:** put a pinned node on the plane when the layout switches to 2D ([58e4c7a8](https://github.com/graphty-org/graphty-monorepo/commit/58e4c7a8))
- **graphty-element:** do not report a setData cancelled by disposing the graph ([229a73a2](https://github.com/graphty-org/graphty-monorepo/commit/229a73a2))
- **graphty-element:** make simple-tier run records, warnings and guides tell the truth ([2933486f](https://github.com/graphty-org/graphty-monorepo/commit/2933486f))
- **graphty-element:** put nodes at their data positions when the layout switches to fixed ([e79e6040](https://github.com/graphty-org/graphty-monorepo/commit/e79e6040))
- **graphty-element:** keep csv and json records as the 2.x readers gave them ([f9e87950](https://github.com/graphty-org/graphty-monorepo/commit/f9e87950))
- **graphty-element:** refuse a personalized pagerank under required acceleration ([23f94701](https://github.com/graphty-org/graphty-monorepo/commit/23f94701))
- **graphty-element:** read an edge weight above the f32 range as no weight ([63196f28](https://github.com/graphty-org/graphty-monorepo/commit/63196f28))
- **graphty-element:** report an unreadable gexf or graphml file as E_PARSE_FAILED ([fad4dfbd](https://github.com/graphty-org/graphty-monorepo/commit/fad4dfbd))
- **graphty-element:** run unrouted floyd-warshall and label propagation on the cpu under required ([708f2959](https://github.com/graphty-org/graphty-monorepo/commit/708f2959))
- **graphty-element:** read csv headers, weights and ids as the 2.x readers did ([13c6c819](https://github.com/graphty-org/graphty-monorepo/commit/13c6c819))
- **graphty-element:** report a layout that cannot place newcomers instead of throwing ([241f2a87](https://github.com/graphty-org/graphty-monorepo/commit/241f2a87))
- **graphty-element:** place an import's newcomers once, not after every chunk ([2ff6caa9](https://github.com/graphty-org/graphty-monorepo/commit/2ff6caa9))
- **graphty-element:** a rollback with no arrangement to restore leaves the layout running ([7da90ba1](https://github.com/graphty-org/graphty-monorepo/commit/7da90ba1))
- **graphty-element:** undoing a placement puts a row nothing had placed back to unplaced ([0b581746](https://github.com/graphty-org/graphty-monorepo/commit/0b581746))
- **graphty-element:** repaint a run of queued graph writes once, and settle data doors on it ([045c8528](https://github.com/graphty-org/graphty-monorepo/commit/045c8528))
- **graphty-element:** place newcomers inside the derivation lane and check what is drawn ([5f3ae06e](https://github.com/graphty-org/graphty-monorepo/commit/5f3ae06e))
- **graphty-element:** keep a coalescing edit out of a step older than pending work ([ad855e4e](https://github.com/graphty-org/graphty-monorepo/commit/ad855e4e))
- **graphty-element:** give a redone import's edges back their load provenance ([527ee846](https://github.com/graphty-org/graphty-monorepo/commit/527ee846))
- ⚠️ **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
- ⚠️ **graphty-element:** start on-load algorithms after expansion, report store counts ([ea80b527](https://github.com/graphty-org/graphty-monorepo/commit/ea80b527))
- **graphty-element:** keep gexf key precedence and graphml node order ([cbcb798e](https://github.com/graphty-org/graphty-monorepo/commit/cbcb798e))
- **algorithms:** give accelerated hits and katz the cpu port's scale and weighting ([062aafb2](https://github.com/graphty-org/graphty-monorepo/commit/062aafb2))
- **graphty-element:** say what a pagerank personalization and a dfs target actually did ([a1a2e0b1](https://github.com/graphty-org/graphty-monorepo/commit/a1a2e0b1))
- **graphty-element:** keep weights, endpoint nodes and file decimals in graph-io records ([bf60cc9a](https://github.com/graphty-org/graphty-monorepo/commit/bf60cc9a))
- **graphty-element:** name the real reason when required acceleration refuses work ([2280de30](https://github.com/graphty-org/graphty-monorepo/commit/2280de30))
- **graphty-element:** never report a CPU run as accelerated for a member the element keeps ([9b2ab0e2](https://github.com/graphty-org/graphty-monorepo/commit/9b2ab0e2))
- **graphty-element:** place a fixed-layout node at its data position as it is added ([810e6e59](https://github.com/graphty-org/graphty-monorepo/commit/810e6e59))
- **graphty-element:** run leiden and girvan-newman on the index-based ports ([59b6e12f](https://github.com/graphty-org/graphty-monorepo/commit/59b6e12f))
- **graphty-element:** decide an unforwarded algorithm capability as unimplemented ([644e9a80](https://github.com/graphty-org/graphty-monorepo/commit/644e9a80))
- **graphty-element:** start on-load algorithms once per load, not once per chunk ([02fadde1](https://github.com/graphty-org/graphty-monorepo/commit/02fadde1))
- **graphty-element:** give every edge its own ngraph link ([b3c0aacf](https://github.com/graphty-org/graphty-monorepo/commit/b3c0aacf))
- **layout:** keep multipartiteLayout's one-layer fallback and count distinct planar edges ([0014a5d7](https://github.com/graphty-org/graphty-monorepo/commit/0014a5d7))
- **graphty-element:** rename the undo timing project to browser-bench ([e1484a38](https://github.com/graphty-org/graphty-monorepo/commit/e1484a38))
- **graphty-element:** keep strict state's per-dispatch check off the history ([8921b612](https://github.com/graphty-org/graphty-monorepo/commit/8921b612))
- **graphty-element:** carry load ids and supersede loads in the undo model, keep master's app fixes ([64401478](https://github.com/graphty-org/graphty-monorepo/commit/64401478))
- **graphty-element:** read settings back as assigned, keep layout membership and pins internal ([92777fae](https://github.com/graphty-org/graphty-monorepo/commit/92777fae))
- **graphty-element:** close the layout engine's writable lane, name algo.remove's run by runid ([#543](https://github.com/graphty-org/graphty-monorepo/issues/543))
- **graphty-element:** seal layout rest under the step that moved it, skip no-op steps ([1fcf183e](https://github.com/graphty-org/graphty-monorepo/commit/1fcf183e))
- **graphty-element:** close the remaining ways to change project state without a step ([#539](https://github.com/graphty-org/graphty-monorepo/issues/539))
- **graphty-element:** let session.data.import choose the recommended layout ([c96b2eac](https://github.com/graphty-org/graphty-monorepo/commit/c96b2eac))

### ⚠️ Breaking Changes

- **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
  toPositionMap leaves out a node whose row is all NaN, and
  the Embedding type is no longer exported.
- **graphty-element:** start on-load algorithms after expansion, report store counts ([ea80b527](https://github.com/graphty-org/graphty-monorepo/commit/ea80b527))
  DataManager.edgeCache is removed, together with the EdgeMap
  class it held. Use DataManager.getEdgesBetween(source, target), which answers
  from the graph store and lists every edge of that ordered pair, oldest first.
  DataManager.heldCounts() is now public.

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.13
- Updated @graphty/remote-logger to 1.3.12
- Updated graph-samples to 0.1.8
- Updated graph-format to 1.2.0
- Updated algorithms to 2.2.0
- Updated graph-io to 0.3.10
- Updated layout to 2.0.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.6.2 (2026-09-28)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.12
- Updated @graphty/remote-logger to 1.3.11
- Updated graph-samples to 0.1.7
- Updated graph-format to 1.1.2
- Updated algorithms to 2.1.2
- Updated layout to 1.10.5

## 2.6.1 (2026-09-28)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.11
- Updated @graphty/remote-logger to 1.3.10
- Updated graph-samples to 0.1.6
- Updated graph-format to 1.1.1
- Updated algorithms to 2.1.1
- Updated layout to 1.10.4

## 2.6.0 (2026-09-28)

### 🚀 Features

- **graphty-element:** apply the decided sets names, result ids and kept records ([91e0043d](https://github.com/graphty-org/graphty-monorepo/commit/91e0043d))
- **graphty-element:** hold sets within their memory budget at scale ([9eccdb20](https://github.com/graphty-org/graphty-monorepo/commit/9eccdb20))
- **graphty-element:** lay out one set while holding the rest of the graph still ([ce45487a](https://github.com/graphty-org/graphty-monorepo/commit/ce45487a))
- **graphty-element:** a plugin algorithm learns and computes over its run's scope ([83511019](https://github.com/graphty-org/graphty-monorepo/commit/83511019))
- **graphty-element:** eigenvector and link prediction compute over their run's scope ([c409ac7c](https://github.com/graphty-org/graphty-monorepo/commit/c409ac7c))
- **graphty-element:** path and flow algorithms compute over their run's scope ([59da5e49](https://github.com/graphty-org/graphty-monorepo/commit/59da5e49))
- **graphty-element:** community detection groups over its run's scope ([4e9642a7](https://github.com/graphty-org/graphty-monorepo/commit/4e9642a7))
- **graphty-element:** dijkstra routes within its run's scope ([a5d18eef](https://github.com/graphty-org/graphty-monorepo/commit/a5d18eef))
- **graphty-element:** breadth-first search walks its run's scope ([7d7dfc0a](https://github.com/graphty-org/graphty-monorepo/commit/7d7dfc0a))
- **graphty-element:** kruskal spans its run's scope ([ea6a749d](https://github.com/graphty-org/graphty-monorepo/commit/ea6a749d))
- **graphty-element:** connected components groups over its run's scope ([879b6296](https://github.com/graphty-org/graphty-monorepo/commit/879b6296))
- **graphty-element:** pagerank ranks over its run's scope ([7a2bdf87](https://github.com/graphty-org/graphty-monorepo/commit/7a2bdf87))
- **graphty-element:** betweenness counts paths within its run's scope ([874a5765](https://github.com/graphty-org/graphty-monorepo/commit/874a5765))
- **graphty-element:** closeness measures distances within its run's scope ([325aa6af](https://github.com/graphty-org/graphty-monorepo/commit/325aa6af))
- **graphty-element:** k-core peels its run's scope ([501035c0](https://github.com/graphty-org/graphty-monorepo/commit/501035c0))
- **graphty-element:** katz centrality scores over its run's scope ([ae0358d2](https://github.com/graphty-org/graphty-monorepo/commit/ae0358d2))
- **graphty-element:** hits scores over its run's scope ([f91100df](https://github.com/graphty-org/graphty-monorepo/commit/f91100df))
- **graphty-element:** degree counts over its run's scope ([596c08a3](https://github.com/graphty-org/graphty-monorepo/commit/596c08a3))
- **graphty-element:** the two base classes read their nodes and counts from the input ([fd583e44](https://github.com/graphty-org/graphty-monorepo/commit/fd583e44))
- **graphty-element:** the scoped input accessor and derived inputs ([a9bcb6e0](https://github.com/graphty-org/graphty-monorepo/commit/a9bcb6e0))
- **graphty-element:** the visibility filter follows the sets it names ([0b61e970](https://github.com/graphty-org/graphty-monorepo/commit/0b61e970))
- **graphty-element:** style layers name sets ([ea20d0b9](https://github.com/graphty-org/graphty-monorepo/commit/ea20d0b9))
- **graphty-element:** change notification and the re-resolution scheduler ([ea703640](https://github.com/graphty-org/graphty-monorepo/commit/ea703640))
- **graphty-element:** offered sets and memberships ([dd63f477](https://github.com/graphty-org/graphty-monorepo/commit/dd63f477))
- **graphty-element:** set algebra and the materialising doors ([35e00137](https://github.com/graphty-org/graphty-monorepo/commit/35e00137))
- **graphty-element:** set status, path kind, used by and held-item captures ([848fd50c](https://github.com/graphty-org/graphty-monorepo/commit/848fd50c))
- **graphty-element:** the item and threshold rule leaves ([c75ac48b](https://github.com/graphty-org/graphty-monorepo/commit/c75ac48b))
- **graphty-element:** publish session.sets and the set:changed event ([502ec3d0](https://github.com/graphty-org/graphty-monorepo/commit/502ec3d0))
- **graphty-element:** the scope leaf, inline set definitions and cycle refusal ([242511fa](https://github.com/graphty-org/graphty-monorepo/commit/242511fa))
- **graphty-element:** cache set resolutions by what they read, and round-trip stored sets ([d97d875a](https://github.com/graphty-org/graphty-monorepo/commit/d97d875a))
- **graphty-element:** bind listed edge members and paths across re-freezes ([a29e95b4](https://github.com/graphty-org/graphty-monorepo/commit/a29e95b4))
- **graphty-element:** resolve every scope form to node and edge bitmaps ([013ddcbb](https://github.com/graphty-org/graphty-monorepo/commit/013ddcbb))
- **graphty-element:** the kept-set store and its synchronous doors ([206167f6](https://github.com/graphty-org/graphty-monorepo/commit/206167f6))
- **graphty-element:** attribute revisions, the input tick and execution tokens ([5dc8facd](https://github.com/graphty-org/graphty-monorepo/commit/5dc8facd))
- **graphty-element:** stable edge identity and hash columns ([fa0bf98e](https://github.com/graphty-org/graphty-monorepo/commit/fa0bf98e))
- **graphty-element:** member hashes, the r1 revision and a benchmark runner ([694dc3bb](https://github.com/graphty-org/graphty-monorepo/commit/694dc3bb))
- **graphty-element:** set definition types, canonical form and validator ([cec68049](https://github.com/graphty-org/graphty-monorepo/commit/cec68049))

### 🩹 Fixes

- **graphty-element:** close the sets review's door gaps and repaint only moved rows ([8a2010f9](https://github.com/graphty-org/graphty-monorepo/commit/8a2010f9))
- **graphty-element:** canonical undirected edges at every door, status matching resolution ([1e56b36d](https://github.com/graphty-org/graphty-monorepo/commit/1e56b36d))
- **graphty-element:** cheaper load completion, and every scope door admits the same way ([70463668](https://github.com/graphty-org/graphty-monorepo/commit/70463668))
- **graphty-element:** stop charging module loads to test timeouts ([#491](https://github.com/graphty-org/graphty-monorepo/issues/491))
- **graphty-element:** set the acceleration routing floors from a measurement taken through the element ([#424](https://github.com/graphty-org/graphty-monorepo/issues/424))
- **graphty-element:** report the last frame's draw calls, not the frame count ([09a1cefd](https://github.com/graphty-org/graphty-monorepo/commit/09a1cefd))
- **graphty-element:** dijkstra uses the shortest of parallel edges ([1f4f7f38](https://github.com/graphty-org/graphty-monorepo/commit/1f4f7f38))
- **graphty-element:** scoped runs compute over their scope ([166fe1d2](https://github.com/graphty-org/graphty-monorepo/commit/166fe1d2))
- **graphty-element:** selection.promote keeps the selected edges ([5d62c8ac](https://github.com/graphty-org/graphty-monorepo/commit/5d62c8ac))
- **graphty-element:** scope.save never reissues a removed id ([ac35f705](https://github.com/graphty-org/graphty-monorepo/commit/ac35f705))
- **graphty-element:** scope.save keeps the current members of selection and visible ([a17c25bd](https://github.com/graphty-org/graphty-monorepo/commit/a17c25bd))
- **graphty-element:** version scope digests as d1 and sum them from hash columns ([0d7eb15f](https://github.com/graphty-org/graphty-monorepo/commit/0d7eb15f))
- **graphty-element:** never reissue an edge id after a clear or a replacing import ([37cda562](https://github.com/graphty-org/graphty-monorepo/commit/37cda562))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.10
- Updated @graphty/remote-logger to 1.3.9
- Updated graph-samples to 0.1.5
- Updated graph-format to 1.1.0
- Updated algorithms to 2.1.0
- Updated layout to 1.10.3

### ❤️ Thank You

- Adam Powers @apowers313

## 2.5.2 (2026-09-27)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.9
- Updated @graphty/remote-logger to 1.3.8
- Updated graph-format to 1.0.7
- Updated algorithms to 2.0.6
- Updated layout to 1.10.2

## 2.5.1 (2026-09-27)

### 🩹 Fixes

- **graph-format:** count every change the next freeze would show in mutationCount ([#100](https://github.com/graphty-org/graphty-monorepo/issues/100))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.8
- Updated graph-format to 1.0.6
- Updated algorithms to 2.0.5
- Updated layout to 1.10.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.5.0 (2026-09-27)

### 🚀 Features

- **graphty-element:** report an unknown style layer id as E_UNKNOWN_LAYER ([#111](https://github.com/graphty-org/graphty-monorepo/issues/111))

### 🩹 Fixes

- **graphty-element:** announce data-cleared, reset the layout, type style-changed ([#112](https://github.com/graphty-org/graphty-monorepo/issues/112), [#121](https://github.com/graphty-org/graphty-monorepo/issues/121))
- **graphty-element:** name partition groups the same in the summary and the legend ([63d79816](https://github.com/graphty-org/graphty-monorepo/commit/63d79816))
- **graphty-element:** explain why the sif and cx2 format names cannot load ([#306](https://github.com/graphty-org/graphty-monorepo/issues/306), [#307](https://github.com/graphty-org/graphty-monorepo/issues/307), [#57](https://github.com/graphty-org/graphty-monorepo/issues/57))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.4.1 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** do not apply style paint while a pass is painting ([#440](https://github.com/graphty-org/graphty-monorepo/issues/440))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.7

### ❤️ Thank You

- Adam Powers @apowers313

## 2.4.0 (2026-09-26)

### 🚀 Features

- **layout:** grid and radial layouts, available in graphty-element ([#58](https://github.com/graphty-org/graphty-monorepo/issues/58))
- **graphty-element:** k-core and link prediction, and deprecate unimplemented catalog entries ([#54](https://github.com/graphty-org/graphty-monorepo/issues/54), [#56](https://github.com/graphty-org/graphty-monorepo/issues/56), [#59](https://github.com/graphty-org/graphty-monorepo/issues/59))
- **graphty-element:** export the edge line and arrow types for pickers ([#46](https://github.com/graphty-org/graphty-monorepo/issues/46))

### 🩹 Fixes

- **graphty-element:** keep the batch material when an edge drops its caps ([bcde7d92](https://github.com/graphty-org/graphty-monorepo/commit/bcde7d92))
- **graphty-element:** sort the floor-table imports and narrow its partial reads ([75406966](https://github.com/graphty-org/graphty-monorepo/commit/75406966))
- **graphty-element:** type the per-capability floors against the seam's member names ([0bb5f5fb](https://github.com/graphty-org/graphty-monorepo/commit/0bb5f5fb))
- **graphty-element:** seeded ngraph starts where ngraph itself would ([8e6016e8](https://github.com/graphty-org/graphty-monorepo/commit/8e6016e8))
- **graphty-element:** decline the accelerator for an algorithm below a measured floor ([#386](https://github.com/graphty-org/graphty-monorepo/issues/386))
- **graphty-element:** import the rich text parser without a .ts extension ([df3be69c](https://github.com/graphty-org/graphty-monorepo/commit/df3be69c))
- **graphty-element:** load ids, replace only after a load succeeds, and nodeData replaces ([#49](https://github.com/graphty-org/graphty-monorepo/issues/49), [#50](https://github.com/graphty-org/graphty-monorepo/issues/50), [#110](https://github.com/graphty-org/graphty-monorepo/issues/110), [#198](https://github.com/graphty-org/graphty-monorepo/issues/198))
- **graphty-element:** seeded ngraph and random layouts are reproducible ([#114](https://github.com/graphty-org/graphty-monorepo/issues/114), [#115](https://github.com/graphty-org/graphty-monorepo/issues/115))
- **graphty-element:** size label panels from font metrics ([#128](https://github.com/graphty-org/graphty-monorepo/issues/128))
- **graphty-element:** acceleration policy changes detach, reach status and stop at dispose ([#150](https://github.com/graphty-org/graphty-monorepo/issues/150), [#151](https://github.com/graphty-org/graphty-monorepo/issues/151), [#152](https://github.com/graphty-org/graphty-monorepo/issues/152), [#155](https://github.com/graphty-org/graphty-monorepo/issues/155))
- **graphty-element:** share plugin registries, stop retrying 4xx, cost in work units ([#134](https://github.com/graphty-org/graphty-monorepo/issues/134), [#108](https://github.com/graphty-org/graphty-monorepo/issues/108), [#238](https://github.com/graphty-org/graphty-monorepo/issues/238))
- **graphty-element:** gexf import keeps start, end, spells and timed values ([#109](https://github.com/graphty-org/graphty-monorepo/issues/109))
- **graphty-element:** a paused layout stays paused, and setLayout accepts catalogue ids ([#119](https://github.com/graphty-org/graphty-monorepo/issues/119), [#120](https://github.com/graphty-org/graphty-monorepo/issues/120), [#153](https://github.com/graphty-org/graphty-monorepo/issues/153), [#80](https://github.com/graphty-org/graphty-monorepo/issues/80))
- **algorithms:** pagerank convergence, eigenvector direction, parallel edges, path walks ([#48](https://github.com/graphty-org/graphty-monorepo/issues/48), [#60](https://github.com/graphty-org/graphty-monorepo/issues/60), [#69](https://github.com/graphty-org/graphty-monorepo/issues/69), [#70](https://github.com/graphty-org/graphty-monorepo/issues/70))
- **graphty-element:** release unused style meshes and merge stacked label styles ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#71](https://github.com/graphty-org/graphty-monorepo/issues/71))
- **graphty-element:** dispose the glow layer when no node glows ([#29](https://github.com/graphty-org/graphty-monorepo/issues/29))
- **graphty-element:** batch repaints on load, and await suggested styles and teardown ([#27](https://github.com/graphty-org/graphty-monorepo/issues/27), [#72](https://github.com/graphty-org/graphty-monorepo/issues/72), [#73](https://github.com/graphty-org/graphty-monorepo/issues/73))

### 🔥 Performance

- **graphty-element:** draw arrowheads as instances and keep shader uniforms per scene ([#25](https://github.com/graphty-org/graphty-monorepo/issues/25), [#45](https://github.com/graphty-org/graphty-monorepo/issues/45))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.6
- Updated algorithms to 2.0.4
- Updated layout to 1.10.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.1 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** rasterise label textures on the cpu so every load draws the same pixels ([8c3f6b61](https://github.com/graphty-org/graphty-monorepo/commit/8c3f6b61))
- **graphty-element:** frame the camera after a style pass on its way, not before it ([11bae759](https://github.com/graphty-org/graphty-monorepo/commit/11bae759))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.0 (2026-09-26)

### 🚀 Features

- **graphty-element:** a top-n style selector, used by the app with the element's histogram ([#166](https://github.com/graphty-org/graphty-monorepo/issues/166), [#165](https://github.com/graphty-org/graphty-monorepo/issues/165))

### 🩹 Fixes

- **graphty-element:** yield to the host by time, not every 1,024 elements ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389))
- **graphty-element:** honour startingCameraDistance, camera modes, presets and a floor ([#52](https://github.com/graphty-org/graphty-monorepo/issues/52), [#130](https://github.com/graphty-org/graphty-monorepo/issues/130), [#131](https://github.com/graphty-org/graphty-monorepo/issues/131), [#132](https://github.com/graphty-org/graphty-monorepo/issues/132))
- **graphty-element:** ai runAlgorithm takes options and findNodes has a default limit ([#83](https://github.com/graphty-org/graphty-monorepo/issues/83), [#84](https://github.com/graphty-org/graphty-monorepo/issues/84))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.5 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** refuse a load past the ceiling before touching the graph ([24c37792](https://github.com/graphty-org/graphty-monorepo/commit/24c37792))
- **graphty-element:** decline a load past the render ceiling instead of freezing ([#405](https://github.com/graphty-org/graphty-monorepo/issues/405), [#394](https://github.com/graphty-org/graphty-monorepo/issues/394))
- **graphty-element:** hold the frames while an accelerated run is on the device ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389), [#390](https://github.com/graphty-org/graphty-monorepo/issues/390))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.5

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.4 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** keep the framing box type internal ([c815f158](https://github.com/graphty-org/graphty-monorepo/commit/c815f158))
- **graphty-element:** frame labels again on zoom-to-fit, never on a label edit ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** frame nodes by their size without an extra margin ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** keep the voice adapter's callback types internal ([82fb9dd5](https://github.com/graphty-org/graphty-monorepo/commit/82fb9dd5))
- **graphty-element:** repaint after node removal, frame nodes only, deliver AI events ([#74](https://github.com/graphty-org/graphty-monorepo/issues/74), [#76](https://github.com/graphty-org/graphty-monorepo/issues/76), [#81](https://github.com/graphty-org/graphty-monorepo/issues/81))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.3 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** load large graphs in linear time instead of quadratic ([#388](https://github.com/graphty-org/graphty-monorepo/issues/388))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.2 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** default to a 2:1 block that honours a height, with no minimum ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127))
- **graphty-element:** a default host size, and a warning for rich props set too early ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127), [#79](https://github.com/graphty-org/graphty-monorepo/issues/79))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.4
- Updated @graphty/remote-logger to 1.3.7
- Updated graph-format to 1.0.5
- Updated algorithms to 2.0.3
- Updated layout to 1.9.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.1 (2026-09-25)

### 🩹 Fixes

- **graphty-element:** a label's animation no longer undoes the declutter decision ([cca39906](https://github.com/graphty-org/graphty-monorepo/commit/cca39906))
- **graphty-element:** size the Combined Edge Flow story's arrowheads with edge strength ([e0969765](https://github.com/graphty-org/graphty-monorepo/commit/e0969765))
- **graphty-element:** glow strength per style, and labels no longer overlap ([#129](https://github.com/graphty-org/graphty-monorepo/issues/129), [#5](https://github.com/graphty-org/graphty-monorepo/issues/5))
- **graphty-element:** arrowheads follow the line, diagonals keep width, patterns fill edges ([#122](https://github.com/graphty-org/graphty-monorepo/issues/122), [#124](https://github.com/graphty-org/graphty-monorepo/issues/124), [#126](https://github.com/graphty-org/graphty-monorepo/issues/126))

### 🔥 Performance

- **graphty-element:** label declutter is an option, off by default, and runs only on change ([#5](https://github.com/graphty-org/graphty-monorepo/issues/5))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.0 (2026-09-25)

### 🚀 Features

- **graphty-element:** a query engine and text search behind Explore and edge endpoints ([#51](https://github.com/graphty-org/graphty-monorepo/issues/51), [#3](https://github.com/graphty-org/graphty-monorepo/issues/3))

### 🩹 Fixes

- **graphty-element:** csv import detects tab, semicolon and pipe delimiters, and reads .tsv ([#107](https://github.com/graphty-org/graphty-monorepo/issues/107))
- **graphty-element:** undo, redo and select-all accept Cmd on macOS; the canvas stops taking focus ([#77](https://github.com/graphty-org/graphty-monorepo/issues/77), [#78](https://github.com/graphty-org/graphty-monorepo/issues/78))
- **graphty-element:** the default highlight stands out from default nodes and edges ([#33](https://github.com/graphty-org/graphty-monorepo/issues/33), [#0072](https://github.com/graphty-org/graphty-monorepo/issues/0072))
- **graphty-element:** max flow and min cut check their source and sink ([#116](https://github.com/graphty-org/graphty-monorepo/issues/116))
- **graphty-element:** a node of size 0 draws as the smallest node ([#117](https://github.com/graphty-org/graphty-monorepo/issues/117))
- **graphty:** overlays close pop-outs, layer drags move one layer, runs keep their layers ([#184](https://github.com/graphty-org/graphty-monorepo/issues/184), [#164](https://github.com/graphty-org/graphty-monorepo/issues/164), [#163](https://github.com/graphty-org/graphty-monorepo/issues/163), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#4](https://github.com/graphty-org/graphty-monorepo/issues/4))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.1.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** the WebGPU accelerator proves the device before it is attached ([68d932a4](https://github.com/graphty-org/graphty-monorepo/commit/68d932a4))
- **graphty-element:** turn down an accelerator that computes the wrong answer ([f1d44234](https://github.com/graphty-org/graphty-monorepo/commit/f1d44234))
- **graphty-element:** a GPU can be unavailable because it computes wrong answers ([1f1fde12](https://github.com/graphty-org/graphty-monorepo/commit/1f1fde12))

### 🩹 Fixes

- **graphty-element:** stop reheating a simulation the bridge has just loaded ([6d5257ee](https://github.com/graphty-org/graphty-monorepo/commit/6d5257ee))
- **graphty-element:** let the fake accelerator compute the layout it was asked for ([1af02ff0](https://github.com/graphty-org/graphty-monorepo/commit/1af02ff0))
- **graphty-element:** settle the fake-accelerator stories in five frames, not thirty ([9c5c6a23](https://github.com/graphty-org/graphty-monorepo/commit/9c5c6a23))
- **graphty-element:** know every GPU flag value CI sets, so the config loads on macOS and Windows ([e646d599](https://github.com/graphty-org/graphty-monorepo/commit/e646d599))
- **graphty-element:** spend owed pre-steps a chunk at a time on a simulation ([1a32aa98](https://github.com/graphty-org/graphty-monorepo/commit/1a32aa98))
- **graphty-element:** publish only the device facts a backend actually named ([9d63d5dd](https://github.com/graphty-org/graphty-monorepo/commit/9d63d5dd))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.3
- Updated @graphty/remote-logger to 1.3.6
- Updated graph-format to 1.0.4
- Updated algorithms to 2.0.2
- Updated layout to 1.9.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.0.1 (2026-09-24)

### 🩹 Fixes

- **graphty-element:** install only the dependencies the published build imports ([ddebbcfb](https://github.com/graphty-org/graphty-monorepo/commit/ddebbcfb))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.2
- Updated @graphty/remote-logger to 1.3.5
- Updated graph-format to 1.0.3
- Updated algorithms to 2.0.1
- Updated layout to 1.8.2

### ❤️ Thank You

- Adam Powers @apowers313

# 2.0.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** load-time algorithms can carry run options ([f75d710f](https://github.com/graphty-org/graphty-monorepo/commit/f75d710f))
- **graphty-element:** an eigenvector run that does not converge fails with E_NOT_CONVERGED ([47b116ac](https://github.com/graphty-org/graphty-monorepo/commit/47b116ac))
- **graphty-element:** overflow policy for groups, and size by a run's metric ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050))
- **graphty-element:** research-backed default palettes for measurements and groups ([d1423a36](https://github.com/graphty-org/graphty-monorepo/commit/d1423a36))
- **graphty-element:** publish CHANNEL_DESCRIPTORS so the app stops copying it ([1ee1170d](https://github.com/graphty-org/graphty-monorepo/commit/1ee1170d))
- ⚠️ **graphty-element:** declarative style-channel api and self-sufficient rendering ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
- ⚠️ **graphty-element:** give every limit a name that carries its unit ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
- ⚠️ **graphty-element:** settle the custom element's attributes and events ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
- ⚠️ **graphty-element:** answer from the session what a consumer was computing itself ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
- ⚠️ **graphty-element:** give the layouts edge weights and keep a reader's pins ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
- ⚠️ **graphty-element:** let a file declare its own direction ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
- ⚠️ **graphty-element:** name edge endpoints source and target, and give every edge its own id ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
- ⚠️ **graphty-element:** scope what an algorithm's layer paints, and register palettes ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
- ⚠️ **graphty-element:** make a named camera view something a third party can add ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
- ⚠️ **graphty-element:** move the logger to its own entry point ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
- ⚠️ **graphty-element:** publish the algorithm base classes a plugin needs ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
- ⚠️ **graphty-element:** register palettes, formats, cameras, layouts and log sinks ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
- **graphty-element:** add the error codes the new refusals report ([05631c4f](https://github.com/graphty-org/graphty-monorepo/commit/05631c4f))
- ⚠️ **graphty-element:** delete the old style system ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
- ⚠️ **graphty-element:** derive an algorithm's styling from what its result declares ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
- ⚠️ **graphty-element:** replace evaluated style expressions with declarative layers ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
- ⚠️ **graphty-element:** give selection real sets and add a visibility model ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
- ⚠️ **graphty-element:** make a run an object with an identity, progress and a cost ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
- **graphty-element:** add a headless model that holds the graph ([554f791e](https://github.com/graphty-org/graphty-monorepo/commit/554f791e))
- ⚠️ **graphty-element:** move graph data off the render objects into a store ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
- ⚠️ **graphty-element:** publish a map of entry points, five of them free of a 3D engine ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
- **graphty-element:** own WebGPU detection, attachment and recovery ([6f3842ce](https://github.com/graphty-org/graphty-monorepo/commit/6f3842ce))
- ⚠️ **graphty-element:** publish the catalogue as plain JSON descriptors ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
- **graphty-element:** publish an error model with codes a consumer can switch on ([1416ab30](https://github.com/graphty-org/graphty-monorepo/commit/1416ab30))

### 🩹 Fixes

- **graphty-element:** the picture is not final while a mesh or glow shader is still arriving ([0e1b6304](https://github.com/graphty-org/graphty-monorepo/commit/0e1b6304))
- **graphty-element:** a second registration of the tag warns instead of throwing ([2150334d](https://github.com/graphty-org/graphty-monorepo/commit/2150334d))
- **graphty-element:** forget what a layer painted when the dataset is renumbered ([3f36833d](https://github.com/graphty-org/graphty-monorepo/commit/3f36833d))
- **graphty-element:** each module imports the Babylon augmentations it calls ([c4340504](https://github.com/graphty-org/graphty-monorepo/commit/c4340504))
- **graphty-element:** the picture is not final while a style edit waits to be drawn ([e3769c7f](https://github.com/graphty-org/graphty-monorepo/commit/e3769c7f))
- **graphty-element:** declare the source entry files as side effects ([f895ebda](https://github.com/graphty-org/graphty-monorepo/commit/f895ebda))
- **graphty-element:** only tooltips draw over the graph; labels sort by depth ([095195f8](https://github.com/graphty-org/graphty-monorepo/commit/095195f8))
- **graphty-element:** cost models for louvain and eigenvector, measured on twelve shapes ([41f1d05d](https://github.com/graphty-org/graphty-monorepo/commit/41f1d05d))
- **algorithms:** optimised louvain finds communities on graphs over 50 nodes ([7f66c545](https://github.com/graphty-org/graphty-monorepo/commit/7f66c545))
- **graphty-element:** give closeness its own cost model, and test cost across graph shapes ([4fa6c5b8](https://github.com/graphty-org/graphty-monorepo/commit/4fa6c5b8))
- **graphty-element:** a removed layer takes back everything it painted ([3cf9bdab](https://github.com/graphty-org/graphty-monorepo/commit/3cf9bdab))
- **graphty-element:** hold cost estimates to measured runs, and fix two rates ([dea31006](https://github.com/graphty-org/graphty-monorepo/commit/dea31006))
- **graphty-element:** honour handTracking false, and test real XR sessions ([617ad2aa](https://github.com/graphty-org/graphty-monorepo/commit/617ad2aa))
- **graphty-element:** refuse selectors that ignore the element ([391d1ef3](https://github.com/graphty-org/graphty-monorepo/commit/391d1ef3))
- **graphty-element:** colour the nodes of flow and matching runs, and size encodings ([0d21967b](https://github.com/graphty-org/graphty-monorepo/commit/0d21967b))
- **graphty-element:** build the opening layout in 2D when the graph opens in 2D ([76ca7037](https://github.com/graphty-org/graphty-monorepo/commit/76ca7037))
- **graphty-element:** apply smartOverflow to plain labels ([f8094ed8](https://github.com/graphty-org/graphty-monorepo/commit/f8094ed8))
- **graphty-element:** draw labels and tooltips over edges and nodes ([34bb20f9](https://github.com/graphty-org/graphty-monorepo/commit/34bb20f9))
- **graphty-element:** make the colour helpers total so a repaint cannot abort ([905c390b](https://github.com/graphty-org/graphty-monorepo/commit/905c390b))

### ⚠️ Breaking Changes

- **graphty-element:** declarative style-channel api and self-sufficient rendering ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
  the 1.x StyleManager, calculatedStyle, the StyleHelpers namespace,
  per-algorithm suggestedStyles, EdgeStyle.tooltip, NodeStyle.enabled, EdgeStyle.enabled,
  LabelStyle.maxWidth, LabelStyle.wrap and NodeStyle.effect.outline.width are removed.
  Node and edge appearance is set through style-layer channels.
- **graphty-element:** give every limit a name that carries its unit ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
  `Limits.exactComputationCap` is `Limits.approximateAboveNodes` and
  `Limits.memoryBudgetBytes` is `Limits.graphMemoryBudgetBytes`.
  `CostGateLimits.exactComputationCap` is `CostGateLimits.exactComputationSeconds` and
  `CostGateLimits.memoryBudgetBytes` is `CostGateLimits.runColumnBudgetBytes`.
- **graphty-element:** settle the custom element's attributes and events ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
  the graphty-element-logging, graphty-element-log-level and
  profiling URL parameters are ignored; call configureLogging instead.
  data-loading-progress.nodesLoaded and .edgesLoaded are renamed to
  nodeRecordsLoaded and edgeRecordsLoaded.
- **graphty-element:** answer from the session what a consumer was computing itself ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
  GraphStatistics gains directednessSource and meanDegree. A
  run's per-edge answers are keyed by the element's edge id. Every run, layout
  and export is scoped to what is visible by default, so a run under an active
  filter measures fewer elements than 1.x measured on the same dataset.
- **graphty-element:** give the layouts edge weights and keep a reader's pins ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
  every Kamada-Kawai and ForceAtlas2 arrangement of a graph with
  real weights moves. Node.isPinned() answers the element's own field, so code
  that branched on it and never took the pinned path now can.
- **graphty-element:** let a file declare its own direction ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
  an undirected file loads one edge per file edge rather than a
  mirrored pair, so edge counts halve and every degree, density and centrality
  moves with them.
- **graphty-element:** name edge endpoints source and target, and give every edge its own id ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
  edge records carry source and target, not src and dst. Edge
  ids are element-minted strings, so a selection or scope saved by 1.x matches
  nothing, and there is no translation because the old id was ambiguous. Edge
  counts rise on any multigraph and density, degree and every derived figure rise
  with them. Removing a node emits elements-removed naming the edges that went.
- **graphty-element:** scope what an algorithm's layer paints, and register palettes ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
  the 1.x style template is removed; a look is a StyleDocument
  applied through the style layer API. A layer or document naming an unknown
  palette reports E_UNKNOWN_PALETTE.
- **graphty-element:** make a named camera view something a third party can add ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
  BUILTIN_PRESETS is no longer exported; camera views are
  catalogue data reached through session.catalog. Three ScreenshotErrorCode
  members are removed -- CAMERA_PRESET_NOT_FOUND, CAMERA_PRESET_NOT_AVAILABLE_IN_2D
  and CANNOT_OVERWRITE_BUILTIN_PRESET -- because camera failures are now
  GraphtyErrors carrying E_UNKNOWN_CAMERA, E_UNSUPPORTED and E_PROTECTED.
- **graphty-element:** move the logger to its own entry point ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
  the root barrel no longer exports the 23 logging symbols;
  import them from @graphty/graphty-element/logging. The seven colour-vision
  helpers move to @graphty/graphty-element/schema, beside the palettes whose
  colorblindSafe flag is computed from them.
- **graphty-element:** publish the algorithm base classes a plugin needs ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
  edgeResultId is not published. An endpoint pair is a lookup
  key and not an identity -- it cannot name one of two parallel edges -- so a
  per-edge result row carries the id the element minted for that edge.
- **graphty-element:** register palettes, formats, cameras, layouts and log sinks ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
  session.catalog tables are composed rather than frozen
  built-in arrays, and the descriptor lookups search registrations as well as
  built-ins. OptionsSchema and resolveOptions are deprecated in favour of
  OptionDescriptor[] and resolveOptionValues.
- **graphty-element:** delete the old style system ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
  Styles, StyleManager and the style id types are no longer exported.
- **graphty-element:** derive an algorithm's styling from what its result declares ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
  the pictures seven algorithms draw change, and dimming what an algorithm did not
  select no longer ships with the algorithm. What to do with the elements a result says nothing
  about is a reader's decision, not the algorithm's.
- **graphty-element:** replace evaluated style expressions with declarative layers ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
  calculatedStyle and its expression string are removed, not sandboxed. Anything
  beyond the declared grammar is a registered scale, which is code shipped by a plugin: code stays
  code and layers stay data. Layers are addressed by a stable id rather than by array index, which
  forced the one consumer to write an index reconciliation module and delete highest-index-first;
  one off-by-one there once took the element's own base layer with it. A layer write now validates
  and repaints or rejects, where adding a layer used to be a push and a comment reading "TODO:
  recalculate".
- **graphty-element:** give selection real sets and add a visibility model ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
  the selection surface is two sets rather than a single node, and the element no
  longer writes a selected flag onto algorithm results.
- **graphty-element:** make a run an object with an identity, progress and a cost ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
  results move from a path keyed by namespace and type to one keyed by run id.
  The old path carried no parameters, so one algorithm at two settings wrote to the same place and
  a style layer could not say which it was drawing. Betweenness and closeness now publish the
  graph-level minimum and maximum they withheld, and a convergence flag reports null when it was
  never measured rather than asserting something untrue.
- **graphty-element:** move graph data off the render objects into a store ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
  betweenness centrality returns half what it used to, and the old number was
  wrong. The mesh-to-graph conversion built a directed graph carrying both arcs of every undirected
  edge, so the algorithm never took its undirected branch, where it halves its raw pair counts. On
  a three-node path the middle node scored two where the correct answer is one. Closeness,
  eigenvector and katz are unchanged to the last digit, and the percentage form of betweenness is
  unaffected because a uniform halving leaves a min-max normalisation identical.
- **graphty-element:** publish a map of entry points, five of them free of a 3D engine ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
  the exports map replaces the single entry, and the UMD build is gone. A page
  with a script tag and no installer loads ./bundle, one self-contained file. Sibling packages are
  externalised, so a consumer who installs one of them resolves a single copy rather than getting
  this package's private duplicate with types that do not assign to each other. Sourcemaps leave
  the tarball, which was forty-one megabytes unpacked with twenty-six of it maps.
- **graphty-element:** publish the catalogue as plain JSON descriptors ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
  option schemas cross the package boundary as plain JSON rather than as Zod
  objects. They crossed as Zod before, and the one consumer had to read Zod's private internals in
  two modules to recover a type, a default and a range -- carrying a branch for two Zod versions,
  because the element imported one major while depending on another. Shipping a validation library
  across a boundary made the consumer's version of it part of this package's API.
  Built-in algorithm keys are renamed, and five of twenty-three fold into two: dijkstra,
  bellman-ford and floyd-warshall become shortest-path with a method parameter, and scc becomes
  components with a strength parameter. Each descriptor names the keys it replaces, so a migration
  has one source of truth. Layout names become semantic -- force rather than the name of whichever
  library implements it -- so swapping an implementation stops being a rename a consumer can see.

### 🧱 Updated Dependencies

- Updated algorithms to 2.0.0
- Updated layout to 1.8.1

### ❤️ Thank You

- Adam Powers @apowers313

## 1.10.5 (2026-09-23)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.4

## 1.10.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.3
- Updated algorithms to 1.8.1
- Updated layout to 1.8.0

## 1.10.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated algorithms to 1.8.0

## 1.10.2 (2026-09-20)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.2
- Updated algorithms to 1.7.3
- Updated layout to 1.7.0

## 1.10.1 (2026-09-20)

### 🩹 Fixes

- **graphty-element:** stop rendering the scene twice on every frame ([a414f9dc](https://github.com/graphty-org/graphty-monorepo/commit/a414f9dc))
- **graphty-element:** publish caret ranges for the workspace siblings ([de93a6d2](https://github.com/graphty-org/graphty-monorepo/commit/de93a6d2))

### ❤️ Thank You

- Adam Powers @apowers313

## [1.4.7](https://github.com/graphty-org/graphty-element/compare/v1.4.6...v1.4.7) (2025-12-26)

### Bug Fixes

- fix xr node selection ([0e217d3](https://github.com/graphty-org/graphty-element/commit/0e217d3128db8913cf9cf1818243277e8e29b176))

## [1.4.6](https://github.com/graphty-org/graphty-element/compare/v1.4.5...v1.4.6) (2025-12-26)

### Bug Fixes

- fix api gaps, update documentation ([abbf39b](https://github.com/graphty-org/graphty-element/commit/abbf39b5c01773f66e9dee85e967ac22a1a2cd90))
- fix JS / Lit API parity, expand documentation ([6dd6599](https://github.com/graphty-org/graphty-element/commit/6dd6599f381a9a5f736999394f4e9ca8e436e9b3))

## [1.4.5](https://github.com/graphty-org/graphty-element/compare/v1.4.4...v1.4.5) (2025-12-25)

### Bug Fixes

- fix webllm dynamic import, change default server / port for dev ([323d568](https://github.com/graphty-org/graphty-element/commit/323d568c7e4a7ed9ec7365ff4717885f0939aafc))

## [1.4.4](https://github.com/graphty-org/graphty-element/compare/v1.4.3...v1.4.4) (2025-12-23)

### Bug Fixes

- better web-llm optional dependency handling ([755c7ee](https://github.com/graphty-org/graphty-element/commit/755c7eeade7783600f28090890b65e9ac733177d))
- correct zoom to fit calculations ([c9dc578](https://github.com/graphty-org/graphty-element/commit/c9dc578f9c9bc66e34e0f7d8032e0d4306632f4b))

## [1.4.3](https://github.com/graphty-org/graphty-element/compare/v1.4.2...v1.4.3) (2025-12-23)

### Bug Fixes

- export ai tools from index ([1400374](https://github.com/graphty-org/graphty-element/commit/1400374ac55b0267903ae49d4ff8bfc462ba2853))

## [1.4.2](https://github.com/graphty-org/graphty-element/compare/v1.4.1...v1.4.2) (2025-12-22)

### Bug Fixes

- ai key persistence api ([be2a808](https://github.com/graphty-org/graphty-element/commit/be2a8083e9479327261a2dc5b86c4493e81bb38d))

## [1.4.1](https://github.com/graphty-org/graphty-element/compare/v1.4.0...v1.4.1) (2025-12-21)

### Bug Fixes

- algorithms options export ([e7a7c05](https://github.com/graphty-org/graphty-element/commit/e7a7c05ec70af75df67ef9efd0b4032f69ce542d))

# [1.4.0](https://github.com/graphty-org/graphty-element/compare/v1.3.0...v1.4.0) (2025-12-20)

### Bug Fixes

- 2d, 3d, xr view mode api ([6e9299f](https://github.com/graphty-org/graphty-element/commit/6e9299f5d9823d0b0d0fa37dfe7fb04fa0fa5c13))
- add algorithm options and schemas ([7277f8a](https://github.com/graphty-org/graphty-element/commit/7277f8adbb9429f8da493b180c5c7cf9f99f36f3))

### Features

- add logging ([af4bc9f](https://github.com/graphty-org/graphty-element/commit/af4bc9f5671e71318dcd976432a46100126c8c09))
- add node selection, interaction testing ([4a50004](https://github.com/graphty-org/graphty-element/commit/4a50004e58935c1ad2e8480dcbedd191ece9ce1a))
- schema detection to support LLM interactions ([941e0c9](https://github.com/graphty-org/graphty-element/commit/941e0c95df02574923f4793670623707ea0c3d2c))
- working AI interface MVP ([9e6d228](https://github.com/graphty-org/graphty-element/commit/9e6d228c94951a1edb068fb035ac74ddc15c2eb2))

# [1.3.0](https://github.com/graphty-org/graphty-element/compare/v1.2.4...v1.3.0) (2025-12-15)

### Bug Fixes

- auto detect data format using url contents ([7ede111](https://github.com/graphty-org/graphty-element/commit/7ede111078184f7aa01265db9d771e0856276ef0))
- merge master, fix VR in stories to prevent chromatic errors ([8ef5062](https://github.com/graphty-org/graphty-element/commit/8ef5062545c1468eede826afe2af1bb973d1944c))

### Features

- working and integrated 3D and XR cameras and controls ([6a111fd](https://github.com/graphty-org/graphty-element/commit/6a111fd32625aae1b5b7e78630cdfca0f8271f01))

## [1.2.4](https://github.com/graphty-org/graphty-element/compare/v1.2.3...v1.2.4) (2025-12-13)

### Bug Fixes

- fix exports to support graphty development ([647e474](https://github.com/graphty-org/graphty-element/commit/647e47480309e09ff30299b8220501d1fb6a6048))

## [1.2.3](https://github.com/graphty-org/graphty-element/compare/v1.2.2...v1.2.3) (2025-12-12)

### Bug Fixes

- build and ship typescript types and export default styles ([0ec479c](https://github.com/graphty-org/graphty-element/commit/0ec479cf8f682a75728bf2d458757c591feb21a7))

## [1.2.2](https://github.com/graphty-org/graphty-element/compare/v1.2.1...v1.2.2) (2025-12-09)

### Bug Fixes

- event forwarding ([586b7af](https://github.com/graphty-org/graphty-element/commit/586b7afc2fe754c081aebdc9deda4253d3cbbb28))

## [1.2.1](https://github.com/graphty-org/graphty-element/compare/v1.2.0...v1.2.1) (2025-12-02)

### Bug Fixes

- prevent over enthusiastic tree shaking ([c1e926a](https://github.com/graphty-org/graphty-element/commit/c1e926ab6419968180c22444d13d7196eff7d2da))

# [1.2.0](https://github.com/graphty-org/graphty-element/compare/v1.1.1...v1.2.0) (2025-11-30)

### Bug Fixes

- deterministic outcomes from setting web component properties ([22f3459](https://github.com/graphty-org/graphty-element/commit/22f34595e9b03d8c154a089afc2111b78c629a60))
- finishing details on arrowheads ([6c257b8](https://github.com/graphty-org/graphty-element/commit/6c257b85453ba5f57b626ba5ef9936013c602678))
- fix deterministic rendering for cameras and algorithms, fix other rendering bugs ([b4a5c54](https://github.com/graphty-org/graphty-element/commit/b4a5c541329192180aadac648e9f680027cc3fb6))
- fix diamond pattern line offset ([ee4005d](https://github.com/graphty-org/graphty-element/commit/ee4005d38388e6070071632da3211dd199aa66ee))
- fix merge errors ([8e7168e](https://github.com/graphty-org/graphty-element/commit/8e7168e9c8edf638ab3dcfb42be64d5ea57c4708))
- fix testing includes for vitest ([ca26089](https://github.com/graphty-org/graphty-element/commit/ca2608986d91631bffad8ecff018b0851cb49fc1))
- implement phase 4 of dependency and batching, fix eslint TODOs, fix batching design ([a3dc4d9](https://github.com/graphty-org/graphty-element/commit/a3dc4d9cd86051e4c967a7c082549134c632fbb8))
- implement phase 5 of dependency and batching ([7343935](https://github.com/graphty-org/graphty-element/commit/7343935e6720cf955ae875358ff536dd62ee18a0))
- line rendering bug when switching stories ([b769690](https://github.com/graphty-org/graphty-element/commit/b76969088d33fb6ac599e1a691c48b3c09901016))
- merge resizing fix ([41f565c](https://github.com/graphty-org/graphty-element/commit/41f565c1e09b0c416cae03c63e046402ef14540c))
- working custom line renderer and custom arrowhead with shaders ([92e0709](https://github.com/graphty-org/graphty-element/commit/92e0709c6d9cb657de18176323c842cd604d8d0e))

### Features

- add dependency ordering and batching when setting web component properties ([fe17935](https://github.com/graphty-org/graphty-element/commit/fe17935b06816957cfa29e39112033c1861b7074))
- add name to style layers to support UI ([4d1ea0e](https://github.com/graphty-org/graphty-element/commit/4d1ea0e8012f09d5985c6e9a0ae83cce43fad79d))
- add performance profiling, edge performance enhancements, arrowheads are wip ([be33939](https://github.com/graphty-org/graphty-element/commit/be3393997dc33cc5dcd99910b2600df8f8b0a7ef))
- add various formats for loading data ([deed260](https://github.com/graphty-org/graphty-element/commit/deed260b7e5c13be86265d9b6c0d3f13dadac106))
- algorithm suggested styles and style helpers ([8f5f758](https://github.com/graphty-org/graphty-element/commit/8f5f7587a132215f6e548f766a8c22c021ddf49e))
- comprehensive set of data loaders ([9d489f5](https://github.com/graphty-org/graphty-element/commit/9d489f58b061a4e457c91d18554aae0a355e2ba1))
- new edge styles and arrowheads ([652d660](https://github.com/graphty-org/graphty-element/commit/652d6603eaed4a8fc4c41a50210b2a2a6889456e))
- patterned line styles ([55af883](https://github.com/graphty-org/graphty-element/commit/55af883367940130e2c67b28fa17b92f3d6cbd5a))
- screen capture and video capture ([1a0d5cf](https://github.com/graphty-org/graphty-element/commit/1a0d5cfca614fa2f8b55ee3e2502ffbd084e74f7))
- working data loaders ([b6dd9e9](https://github.com/graphty-org/graphty-element/commit/b6dd9e95799009dde377aa9bd5907863f9bc9570))
- working new arrowheads ([eac7fbf](https://github.com/graphty-org/graphty-element/commit/eac7fbf25326be7e1153bf4661f00eeae7fb1a3a))

## [1.1.1](https://github.com/graphty-org/graphty-element/compare/v1.1.0...v1.1.1) (2025-10-24)

### Bug Fixes

- implement phase 1 of dependency and batching to prevent race conditions ([443f18a](https://github.com/graphty-org/graphty-element/commit/443f18ae951f8db6fb6c0aaf3e082f614494a005))

# [1.1.0](https://github.com/graphty-org/graphty-element/compare/v1.0.5...v1.1.0) (2025-10-24)

### Features

- add fixed layout ([3208b22](https://github.com/graphty-org/graphty-element/commit/3208b222143513e8411f54a69a4dac03bf4f25cf))

## [1.0.5](https://github.com/graphty-org/graphty-element/compare/v1.0.4...v1.0.5) (2025-07-28)

### Bug Fixes

- 3d layout for circular ([c15a87a](https://github.com/graphty-org/graphty-element/commit/c15a87a57a90d4cb14c08255fd4f2638d636ac27))
- 3d layout for kamada kawai ([2b17c9b](https://github.com/graphty-org/graphty-element/commit/2b17c9b30a3fff8cc878ea0bd4c7653a83e2f34e))
- change shape names in config, fix build ([b3c2253](https://github.com/graphty-org/graphty-element/commit/b3c2253a73536439a85903cb0a208583a57c51ab))
- ensure center agrument to layouts supports 3d ([b14ea88](https://github.com/graphty-org/graphty-element/commit/b14ea88df7284fa5879f62aa2639fa0816ec04fc))
- fix build rollup, fix chromatic testing ([ba6a1db](https://github.com/graphty-org/graphty-element/commit/ba6a1dbbe6aa2141bf5f20f91bf738a5011370ae))
- fix camera zoom when layout settles ([ce7d6fc](https://github.com/graphty-org/graphty-element/commit/ce7d6fc8098f3b7828aa48995a128ef439bc17bd))
- fix orbit camera zoom while layout settles ([4d4d73f](https://github.com/graphty-org/graphty-element/commit/4d4d73f7c26b76bd0f338283326fcb3e4b063d85))

## [1.0.4](https://github.com/graphty-org/graphty-element/compare/v1.0.3...v1.0.4) (2025-07-15)

### Bug Fixes

- fix npm provenance ([922edf5](https://github.com/graphty-org/graphty-element/commit/922edf5a13a1108457adfa9a2b6d2dc225cb95ae))

## [1.0.3](https://github.com/graphty-org/graphty-element/compare/v1.0.2...v1.0.3) (2025-07-15)

### Bug Fixes

- provenance for semantic release ([0785f04](https://github.com/graphty-org/graphty-element/commit/0785f04c660a740682c7a420a658e01df25c0d07))

## [1.0.2](https://github.com/graphty-org/graphty-element/compare/v1.0.1...v1.0.2) (2025-07-15)

### Bug Fixes

- allow side-effects to that the web component automatically gets registered ([b8f1e90](https://github.com/graphty-org/graphty-element/commit/b8f1e9048475aa6dca3d967ce1a86e717a101e91))

## [1.0.1](https://github.com/graphty-org/graphty-element/compare/v1.0.0...v1.0.1) (2025-07-15)

### Bug Fixes

- semantic release (take 3) ([f603c55](https://github.com/graphty-org/graphty-element/commit/f603c55ee25bd5725baea63c0724784cf7187363))

# 1.0.0 (2025-07-15)

### Bug Fixes

- build and optional argument fixes ([26a1ef6](https://github.com/graphty-org/graphty-element/commit/26a1ef6323a8aadb280fe4f0d9c3b66217846dc7))
- **config:** fix default config parsing ([dbaa610](https://github.com/graphty-org/graphty-element/commit/dbaa610a9aab497f081899315bad540c9eaf9ecd))
- **config:** fix label default values ([3b4f3bb](https://github.com/graphty-org/graphty-element/commit/3b4f3bb0f5af6ddad4638dc471ef07a3e1b46b14))
- correct edge-node connection gaps and enable label animation ([1a82a09](https://github.com/graphty-org/graphty-element/commit/1a82a090c045f4353bf78296426abdeb621d79c5)), closes [#35](https://github.com/graphty-org/graphty-element/issues/35) [#27](https://github.com/graphty-org/graphty-element/issues/27)
- **edge:** fix edge styling and caching ([7749c50](https://github.com/graphty-org/graphty-element/commit/7749c506567222427b7fe8973211bd97db956935))
- **edge:** fix typo in color ([e9497f7](https://github.com/graphty-org/graphty-element/commit/e9497f7f66057a47bd17d49eb0fbeec19cba9a0c))
- **element:** fix async firstUpdate ([3d74616](https://github.com/graphty-org/graphty-element/commit/3d7461608e90ebb805164afdbb80938962a08b63)), closes [#24](https://github.com/graphty-org/graphty-element/issues/24) [#15](https://github.com/graphty-org/graphty-element/issues/15)
- fix arrows, fix storybook build, fix chromatic visual tests, fix spiral ([e12e82a](https://github.com/graphty-org/graphty-element/commit/e12e82a6e7fc2f8c7c8d478f89d073e5861bd732))
- fix bugs caused by delinting ([bf9a250](https://github.com/graphty-org/graphty-element/commit/bf9a25069ae1d2b08eb4867fdf796605d10fae22))
- fix calculated values ([b324b7e](https://github.com/graphty-org/graphty-element/commit/b324b7e483b61c1874c94ae4a7a145b052181e2b))
- fix claude code notifications, make them global across all projects ([250899e](https://github.com/graphty-org/graphty-element/commit/250899ed3147400a5258ee907c79cd368507ea98))
- fix flipping when starting two finger gesture ([ad7a525](https://github.com/graphty-org/graphty-element/commit/ad7a5258599c9a9135b7c6cfb797bc4c788c9083))
- fix initial camera zoom for 2D ([9155d6a](https://github.com/graphty-org/graphty-element/commit/9155d6ac58faa30c3cea3a6b53f71b70c17c90d3))
- fix label background gradient ([16a7dad](https://github.com/graphty-org/graphty-element/commit/16a7dadeb2bbd365d60823c34fddc0151196ba1b))
- fix package names for semantic release ([91e0adf](https://github.com/graphty-org/graphty-element/commit/91e0adf55ba42208b2f47a17e0bf7df14829fd4b))
- fix semantic release, refactor edge, node, and richtextlabel to use their config objects ([e6e22a7](https://github.com/graphty-org/graphty-element/commit/e6e22a76b774f24e20a605cfe7b7da9024cfb021))
- fix typescript errors for 'any' ([3b78721](https://github.com/graphty-org/graphty-element/commit/3b78721aa2a40707563a3d36b1deac0fe3f44264))
- **graph:** fix async handling ([f93266c](https://github.com/graphty-org/graphty-element/commit/f93266cb6e18751680e5fd5d4a5aca3d5f8c1489))
- **graphty:** fix hanging promise when handling propperties ([7c799ff](https://github.com/graphty-org/graphty-element/commit/7c799fffd9fb685a607147fd73e1b7e94a1e76fd))
- **layout:** fix 2D layouts and stories to only render in 2D ([d4927af](https://github.com/graphty-org/graphty-element/commit/d4927afc974f5a23cd8c65f0866ef9c28321e726)), closes [#17](https://github.com/graphty-org/graphty-element/issues/17)
- **layout:** fix 3d layouts ([e7a962e](https://github.com/graphty-org/graphty-element/commit/e7a962eeb65ba79c1ea598bf0283d86fcc5b579d))
- **node:** fix node labels and behavior, add storybook stories for labels and wireframes ([bbce06a](https://github.com/graphty-org/graphty-element/commit/bbce06a69d5a74911afc228c39c35ea88e602a48)), closes [#21](https://github.com/graphty-org/graphty-element/issues/21) [#22](https://github.com/graphty-org/graphty-element/issues/22)
- **node:** fix node style updates ([a947def](https://github.com/graphty-org/graphty-element/commit/a947def8b7b72daf23fc3befd46ddff1d9406e7c))
- prevent label crashes with large fontSize values and improve type safety ([b28b5e6](https://github.com/graphty-org/graphty-element/commit/b28b5e60b63dde957222eca2522192f63685356e))
- remove P0 memory leaks ([dacaf8b](https://github.com/graphty-org/graphty-element/commit/dacaf8b18f1d3cb5aea20f0125b8fdcb36a14ec5))
- rename graphty canvas element ([40e4d85](https://github.com/graphty-org/graphty-element/commit/40e4d85524b9e6890221ec8de0049c16ce444126))
- semantic release ([df9ed11](https://github.com/graphty-org/graphty-element/commit/df9ed11af4e55aa29e0f1c9b7723b67052a5020f))
- semantic release ([985a12e](https://github.com/graphty-org/graphty-element/commit/985a12e89a0567629239275f5fec7aa05d5f3464))
- semantic release should only run 'npm run test' for now ([d4e8dec](https://github.com/graphty-org/graphty-element/commit/d4e8dec0e25ac2b9f6310ba46465b0e199506fe2))
- **style:** fix graph skybox rotation. close [#37](https://github.com/graphty-org/graphty-element/issues/37) ([dc3ebbd](https://github.com/graphty-org/graphty-element/commit/dc3ebbdf272879eab00cab83fc54302d7b1252d9))
- **style:** fix style layering ([9a64041](https://github.com/graphty-org/graphty-element/commit/9a6404156ca85c602f41fd277a7be0e8a56b2d6a))

### Features

- add 2d node style ([6eddc59](https://github.com/graphty-org/graphty-element/commit/6eddc59f4bdcddad55fa931c986c56be42f6fb66))
- add calculated styles for nodes ([7acb622](https://github.com/graphty-org/graphty-element/commit/7acb62270d50db3ab41686d57e7e06b99dda8986))
- add calculated values ([a2daa05](https://github.com/graphty-org/graphty-element/commit/a2daa05459fd9c7ea3b44d91bda0e4e407760ae9))
- add layout support from styleTemplate and fix multipartite story rendering ([6704bda](https://github.com/graphty-org/graphty-element/commit/6704bda7ebcd1e0ab443ed044df9f17dba0e619a)), closes [#19](https://github.com/graphty-org/graphty-element/issues/19)
- add rich text label ([97baf9d](https://github.com/graphty-org/graphty-element/commit/97baf9db269b67647d943e2ccb307bf3c8508ca3))
- add rich text labels and associated stories (wip) ([4d374b6](https://github.com/graphty-org/graphty-element/commit/4d374b69f3d67bad658b018107bc312d7b711449))
- add schema parsing and conversion to calculated values ([3e6512c](https://github.com/graphty-org/graphty-element/commit/3e6512c570efb83df7f4f9f0834ff4824a7c11f0))
- add working 2D camera, camera manager ([d599847](https://github.com/graphty-org/graphty-element/commit/d599847440a3e0f11a8f59cceaed5ae0ffc47621))
- **algorithm:** add algorithm api, add node degree algorithm and corresponding test ([01f8b94](https://github.com/graphty-org/graphty-element/commit/01f8b9498ec75a216c3a6d0b37304c4dfc2e1681)), closes [#14](https://github.com/graphty-org/graphty-element/issues/14)
- **edge:** add edge id ([e7b7a30](https://github.com/graphty-org/graphty-element/commit/e7b7a30d822d830ccbeee3d0944400d35c204ede))
- **graph:** add background color, add skybox ([94a52f7](https://github.com/graphty-org/graphty-element/commit/94a52f77ed1e16bad89ec0bfa922459437f5f46d))
- **graph:** add orbit controller with mouse, touch, and keyboard inputs and without gimbal lock ([24f24f4](https://github.com/graphty-org/graphty-element/commit/24f24f4ecd755b7078ec1c663f6a26c9911aa6b0))
- **graph:** add zoom on initial layout ([16f59cd](https://github.com/graphty-org/graphty-element/commit/16f59cd5d30c3ac103a3c8fbea594634bfe3175e))
- **graph:** add zoom-to-fit for initial layouts ([27c7016](https://github.com/graphty-org/graphty-element/commit/27c701651dcfe8dd3172b13d6d5c33cc2d01e46b)), closes [#6](https://github.com/graphty-org/graphty-element/issues/6) [#3](https://github.com/graphty-org/graphty-element/issues/3)
- **graph:** remove initial graph config options ([1bc6c26](https://github.com/graphty-org/graphty-element/commit/1bc6c26ad78a72e9086b0859e95799df27e33318)), closes [#23](https://github.com/graphty-org/graphty-element/issues/23)
- **graph:** silence babylonjs logs ([b53e8be](https://github.com/graphty-org/graphty-element/commit/b53e8beb4cdc5bf7c2f3f3e9116c0620f4e623a0))
- implement flexible layout dimension configuratio ([f6a2bad](https://github.com/graphty-org/graphty-element/commit/f6a2bad3be1f8747d95d5bca4bd8027923c8fe6d))
- **layout:** add arf and spectral layouts ([b573e36](https://github.com/graphty-org/graphty-element/commit/b573e363e6145528bf86c0fa69a432ba6fdac4f2))
- **layout:** add bfs layout, fix layout options ([3b4af6f](https://github.com/graphty-org/graphty-element/commit/3b4af6f3707cfe8a0e783b3ca8518facb96fe2db))
- **layout:** add bipartite and multipartite layouts ([30feb74](https://github.com/graphty-org/graphty-element/commit/30feb74a417830df2032a5fad3291d34b29388cb))
- **layout:** add forceatlas2 layout ([8cd570b](https://github.com/graphty-org/graphty-element/commit/8cd570b2845add320ca9b8d91a699251183a50e4))
- **layout:** add more sensible layout defaults ([6fa6583](https://github.com/graphty-org/graphty-element/commit/6fa65838cc24dbb11141d5451ed6b077abb0bd87))
- **style:** add 2d node style ([9c19704](https://github.com/graphty-org/graphty-element/commit/9c197048802717e6a3404e7249a0d403752b1f77))
- **styles:** add edge inheritance, add styles to web component ([2f600bc](https://github.com/graphty-org/graphty-element/commit/2f600bc04d5da288f1398b8d2e7538400e187072))
- **styles:** add style inheritance, other refactoring ([f4d80e8](https://github.com/graphty-org/graphty-element/commit/f4d80e8b3b17f60680e1d9a19fa045af6ee18051)), closes [#1](https://github.com/graphty-org/graphty-element/issues/1)
- **style:** update default styles ([b44114b](https://github.com/graphty-org/graphty-element/commit/b44114b28c57f71577422074349af46d79a515c3))
