# Stage 26, pull request 11 (work in progress, not ready)

Proving test: test/browser/node-batch.test.ts, "load a graph under batched building no Node, drawing the picture its Nodes drew".

- Before the change: failed at "no Node built at load: expected 12 to equal +0" (the picture assertion before it passed).
- After the first half of the change: same failure, traced to DataManager.reconcileNode and a walk of
  dataManager.nodes.values() in Graph.ts; both fixed.
- After switching Graph's internal walks to built nodes: the run did not finish in 600 s. Diagnosed with
  temporary logs: UpdateManager.applyNodeMasks walked dataManager.nodes.values(), which built all 12 Nodes after
  the load's paint pass; buildNode put each key back in DataManager.unpainted, and no pass came to clear it, so
  drawHeld stayed true and waitForStableFrame never resolved. Fixed: a Node built later for a stored row queues
  its row's paint and holds only until the next frame's update (paintUndrawn); applyNodeMasks and
  refreshScreenBorders walk built Nodes only.
- Then the test ran (394 ms) and failed at the picture: rows were at random places. Snapshot layouts (fixed)
  read data positions only from Nodes; they now read a Node-less row's record through a new host hook
  (rowData, positionScale). Rows now land where their data puts them.
- Still failing: "the same picture: expected 118334 to equal +0". The camera frames too close (z -3.09 vs
  -6.99) because RowTable.extentOf(row) is all zeros for a row never drawn by a Node: only Node calls
  RowTable.measure. Next: write the row table extent of a column row from its paint and source mesh when
  NodeBatches.paintRow draws it.

Checks run: tsc --noEmit clean; eslint clean on the touched files (DataManager, UpdateManager, LayoutManager,
SnapshotLayoutEngine). No other test file run yet.

## Session 2026-11-09 (later)

- NodeBatches.paintRow now writes the row table extent of a row drawn with no Node (RowTable.measure takes a
  RowMeasure; ColumnRow measures its source mesh). Proving test "load a graph under batched building no Node,
  drawing the picture its Nodes drew": PASSES (run12.log, 376 ms).
- node-batch.test.ts whole file (46 tests): all pass (parity4.log, render-parity project).
- render-parity, first run (parity1.log): 139 failed, every one on the batched path; no story was unstable
  between two objects loads. Two causes found and fixed:
  1. A Node built late for a batched row (graph.getNodes() in the stories' checks) kept the bootstrap paint and
     no place until the next frame: now painted at once from the row's resolved paint, after the layout engine
     has it (DataManager.paintBuiltRow).
  2. Such a Node got a second d3 / ngraph body at a fresh place ("Node not found in NGraphEngine" when painted
     first): it now takes over the row's body (D3GraphEngine.addNode, NGraphEngine.addNode).
- render-parity after the fixes (parity4.log): 65 failed, 306 passed, again all on the batched path and 0
  unstable objects loads. The failing stories are listed in parity-batched-failures.txt (algorithm style stories,
  Data/FileStyles Xgmml, network sources, Traversal BFS/DFS, ...). Not yet diagnosed.
- tsc --noEmit and eslint clean on every touched file. sonar-gate not run yet.

## Session 2026-11-09 (third)

Diagnosed the batched-path picture differences by dumping both canvases per story (a temporary dump in
the render-parity test, not committed) and tracing body creation in the layout engines. Causes found and
fixed (all under renderPath "batched" only):

1. Building an edge built both end Nodes: Edge.pullsLine -> endBehindEdges -> srcNode/dstNode. Every row
   of a data-source load got a Node, in edge order, so ngraph made its bodies in edge order and a seeded
   layout drew another picture (Traversal BFS, Data Json and the algorithm stories). An end stored with
   no Node is now read from its row (Edge.unbuiltEnd). DataManager.test.ts "builds an edge on the batched
   path reading each end's Node once" now counts 0 Node reads, not 2 (stricter: no end is built).
2. A new d3/ngraph engine got edges before Node-less rows (LayoutManager), and rows arriving with edges
   in the same ingest chunk reached the running engine after the edges (DataManager.edgeStored): bodies
   now come first in both.
3. A Node built late for a row ngraph already held reset the settled simulation (_stepCount 0), which
   stepped again and moved every node a little: a take-over now keeps it settled.
4. A Node built late (graph.getNodes() in story checks) sat at the hidden template (0,-10000,0) until the
   next frame: DataManager.paintBuiltRow now calls node.update() after painting it. This fixed the story
   play errors "nodes not where the file put them" and "nodes drawn on top of another node".
5. Zoom-to-fit framed column rows at last frame's RowTable place (the table takes the lane at draw time,
   after the update that frames): framing now reads the lane place unless the row is held.
6. A column row cannot draw a label (it has no Node to hang one from): ColumnRow.drawable now refuses a
   paint with a drawn label. This was hidden while edges built every Node; UpdateManager.zoomToFit
   "takes in every node label" failed under forced-batched until fixed.

Commands and results (graphty-element, through tools/low-priority.sh):
- npx vitest run --project render-parity test/render-parity/stories.test.ts: 11 failed, 314 passed,
  12 skipped (was 65 failed). No story unstable between two objects loads. Log: tmp/stage-26/parity7.log,
  list: tmp/stage-26/parity-batched-failures.txt.
- npx vitest run (DataManager, UpdateManager, UpdateManager.zoomToFit, node-batch, row-table-shadow,
  object-roster, snapshot-contract, ngraph-parallel-edges, ngraph-settle-budget): 12 files, 206 passed
  (browser, forced-batched, render-parity and default projects).
- tsc --noEmit clean; eslint clean on touched files; node tools/sonar-gate.mjs: no new issue (two findings
  from the first run fixed in a refactor commit).

Remaining 11 batched differences, not yet diagnosed: Layout D3 (33398 px) and Layout2D ClusterBy (53055;
d3 reheat on late build and clusterBy reading only Nodes are suspects), OpenAlexCiting (164224),
AuraOverTheCap (17865), Gexf (1488), ThreePaths (325), LouvainMoreCommunitiesThanColours, and four of
1 pixel (Bidirectional, CytoscapeSession -- an edge/node depth tie at one pixel --, ForceAtlas2Weighted,
AuraAndSatellites).

Target (load-peak heap under 1.5 KB/node at 200k) not measured this pull request: anchor removal and the
heap gate are not started.

## Pull request 11, second session (2026-11-10)

Changes (batched path; the id matching gives the same answer on both paths):
- D3GraphEngine.addNode: a Node built late for a row whose body is already stepped takes that body in place
  (nodeMapping), with no refresh and no reheat. Before, the body moved to the end of the node list and the
  simulation restarted at alpha 1, so the D3 story (whose play calls getNodes) drew another picture.
- DataManager.drawnBundle groups edges by end id, and Node.geometryChanged and UpdateManager's ring walk match
  edges by end id, so none of them builds an end Node.

Checks (graphty-element, through tools/low-priority.sh):
- render-parity, VITE_PARITY_STORIES=(LayoutLocationMap|Layout): 13 passed, 1 failed (ForceAtlas2Weighted, 1 px,
  open before). Layout D3 now passes (was 33398 px).
- tsc --noEmit clean; eslint clean on the four changed files; DataManager.test.ts 30 passed.
- The full render-parity run was NOT re-run on this exact commit. sonar-gate NOT run.

Parked, not committed: tmp/stage-26/edge-row-trim.patch makes Edge trimming (getInterceptPoints,
placeArrowFromCentres, capScale, boxReachOf) read a Node-less end from its ColumnRow, so arrow-capped edges build
no end Node. With it, a run of the nine failing story files went from 11 to 5 failures (Bidirectional,
OpenAlexCiting, ThreePaths, AuraOverTheCap, AuraAndSatellites passed), but stories/LayoutLocationMap
FlatMapIn2DView hangs with it (reproduced alone; passes at HEAD and with only interceptPointsOfRows disabled).
The hang mechanism is not found yet.

## Pull request 11, third session (2026-11-10)

Cause of the FlatMapIn2DView hang with the parked edge-trim patch: the location-map layout read node data only
from built Nodes (LocationMapLayout #dataColumns walked _nodes). On the batched path no row had a Node, so init()
refused with layout.needs-location and the basemap never reached "ready"; the story's mapReady waited forever. At
HEAD the same refusal happened, but edge trimming then built every end Node, and a later run found the locations.
The patch only removed that accidental Node building.

Change (batched path only in effect; on objects every row has a Node, so the records are the same):
- SnapshotLayoutEngine.rowRecords(n): each row's data from its Node, else from the host's rowData (the stored
  record of a row with no Node). LocationMapLayout #dataColumns now reads it.
- Proving test, test/browser/node-batch.test.ts "find a location map's locations in rows with no Node": failed
  before the change (GraphtyError layout.needs-location), passes after.

Checks (graphty-element, through tools/low-priority.sh):
- tsc --noEmit clean; eslint clean on the three changed files.
- node-batch.test.ts (browser): 47 passed. location-map-layout + the-basemap-is-in-the-stable-frame (browser):
  10 passed. location-map-drawing-options + place-names (default): 11 passed.
- render-parity VITE_PARITY_STORIES=LayoutLocationMap at this commit: 4 passed.
- Full render-parity WITH the parked patch applied (parity8.log): 11 failed, 314 passed. Fixed by the patch:
  Bidirectional, OpenAlexCiting, ThreePaths, AuraOverTheCap, AuraAndSatellites. Broken by the patch:
  ThreeDAllArrows (26951 px), TwoDAllArrows (28104), SelectedEdge (19292), Mandala (7717) -- the row trim or
  arrow-cap scale differs from the Node's -- and two more Node-only readers exposed: Sets FilterToASet (filter
  shows every node) and extending/SimpleLayout RowsByTier (defineLayout publishes only built Nodes' positions,
  b..i left at the origin). Still failing as before: ClusterBy, CytoscapeSession, ForceAtlas2Weighted, Gexf,
  LouvainMoreCommunitiesThanColours. The patch stays parked (tmp/stage-26/edge-row-trim.patch).
- Full render-parity at this exact commit (without the patch): NOT run. sonar-gate: NOT run.

## Pull request 11, fourth session (2026-11-10): two Node-only readers the parked edge-trim patch exposed

Both changes act only on the batched path: a static engine lays out by row only while `byRow` (renderPath
"batched") answers true, and a Node is built for a row with no Node only on that path.

1. defineLayout layouts placed only rows with a built Node (extending/SimpleLayout RowsByTier with the patch).
   An id-keyed static engine (one that fills `positions`, as every defineLayout engine does) never loaded the
   element's graph, so `#publishRows` fell back to walking `_nodes`; and `defineLayout`'s `place` found its graph
   only through `_nodes[0].parentGraph`, so with no Node at all it placed nothing.
   Change: `StaticLayoutEngine` publishes an id-keyed answer row by row from the element's snapshot ids
   (`#publishIdKeyedRows`); `attachRows` takes the element's graph as an optional fourth argument and
   `simpleLayoutInternals.hostGraph` answers it when no Node exists; defineLayout reads its graph from there.
   The graph is loaded for an id-keyed engine only once it has an answer: loading it on every publish (tried
   first) changed ThreePaths by 325 px with the patch applied. Mechanism of that side effect not traced.
   Proving test: node-batch.test.ts "place every row with no Node by a defineLayout layout" -- failed before
   ("row 0 is placed: expected false to be true"), passes after; asserts 0 Nodes built.
2. A Node built later for a filtered row came up visible (Sets FilterToASet with the patch): masks are applied as
   deltas, and a lazily built Node was never told. Change: `UpdateManager.adoptViewMasks(node)`, called from
   `DataManager.buildRow`, sets the new Node's render state and selection from the current masks.
   Proving test: node-batch.test.ts "keep a filtered row hidden when its Node is built later" -- failed with the
   call disabled ("the filtered row's new Node is hidden: expected true to be false"), passes with it; also
   asserts the same picture before and after the Nodes are built.

Checks (graphty-element, through tools/low-priority.sh):
- tsc --noEmit -p graphty-element: clean. eslint on the six changed files: clean (after --fix of import order).
- node-batch.test.ts, render-parity project: 49 passed. define-layout + define-layout-defaults (browser): 24 passed.
- node tools/sonar-gate.mjs: no new issue or hotspot on the changed lines.
- Full render-parity WITH the parked patch (parity11.log, before the load-deferral fix): 10 failed, 315 passed.
  RowsByTier and FilterToASet now pass. Still failing: ThreeDAllArrows, TwoDAllArrows, SelectedEdge, Mandala
  (the patch's arrow regressions), ClusterBy, CytoscapeSession, ForceAtlas2Weighted, Gexf,
  LouvainMoreCommunitiesThanColours, and ThreePaths (fixed by deferring the load: NodeDrawing|SimpleLayout with
  the patch then 2 passed).
- Full render-parity WITHOUT the patch at this change (parity12.log): 9 failed, 365 passed: Bidirectional,
  CytoscapeSession, Gexf, ForceAtlas2Weighted, ClusterBy, LouvainMoreCommunitiesThanColours, ThreePaths (68 px),
  Mandala (7717), Sticker (7717).
- ORDER-DEPENDENT RESULTS, mechanism not found: VITE_PARITY_STORIES="PatternsAndSprites|NodeDrawing" at HEAD
  (a051523d91, my source changes removed) fails ThreePaths (325), Mandala and Sticker (7717 each); with my
  changes the same pair fails only ThreePaths (325); NodeDrawing alone with the patch passes. So whether
  ThreePaths, Mandala and Sticker pass depends on which stories ran before them in the same page. That is a
  state leak between stories on the batched path, present at HEAD; it must be found before parity is clean.

## Pull request 11, fifth session (2026-11-10): ClusterBy on the batched path

Cause of ClusterBy (53055 px): `LayoutManager.startArrangement` decided "nothing to step yet" from the list of built
Nodes. Under renderPath "batched" a load builds no Node, so the list was empty and the 100 pre-steps were owed to a
later frame. Louvain's results then arrived first, `wakeForClusters` rebuilt the simulation, and the pre-steps ran
after the rebuild instead of before it. Traced with temporary logs of each simulation load: objects loaded, stepped,
then rebuilt for the communities; batched loaded, rebuilt, then stepped.

Changes (batched path only; on objects the checks and walks are the ones on master):
1. `startArrangement` counts rows (`dataManager.nodes.size`, which builds nothing) under batched.
   Proving test: node-batch.test.ts "spend a layout's pre-steps at its start when no row has a Node" -- failed before
   ("expected true to equal false"), passes after.
2. `clusterBy` is read by row under batched (`readRowCommunities` in clusterForce.ts), so reading communities no
   longer builds every Node. A row's record comes from its Node if built, else from the new internal
   `SimulationLayoutEngine.rowRecord` hook that LayoutManager sets (an import of DataManager from the engine made an
   import cycle). Proving test: node-batch.test.ts "pull communities together by clusterBy with no Node" -- failed
   before ("clustered with no Node: expected 12 to equal +0"), passes after; also asserts each row's community
   reaches the simulation. Change 2 alone did not fix the ClusterBy picture; change 1 did.

Checks (graphty-element, through tools/low-priority.sh):
- tsc --noEmit -p graphty-element: clean. eslint on the four changed files: clean.
- node-batch.test.ts (render-parity project): 51 passed.
- cluster-force + simulation-layout-engine (browser): 47 passed. test/layout/simulation-options.test.ts: 17 passed.
- render-parity VITE_PARITY_STORIES=Layout2D: 16 passed (ClusterBy now passes).
- Full render-parity, stories.test.ts, with change 1 and an earlier form of change 2 (parity13.log): 8 failed,
  317 passed, 12 skipped. Every failure is on the batched path; no story differs between two objects loads.
  Still failing: Bidirectional (1 px), CytoscapeSession (1), Gexf (1488), ForceAtlas2Weighted (1),
  LouvainMoreCommunitiesThanColours (1), ThreePaths (325), Mandala (7717), Sticker (7717).
  The final form of change 2 (hook instead of a direct DataManager import) was re-checked with Layout2D only.
- node tools/sonar-gate.mjs: no new issue or hotspot on the changed lines.

Load-peak target (live heap under 1.5 KB per node during a 200k-node batched load): not measured; the TransformNode
anchor and the transient object row are not removed yet.

## Session 6: bodies in row order; failures classified (commit 687d25d09a)

Fix: under renderPath "batched", LayoutManager handed a new d3 or ngraph engine every built Node first and the
rows with no Node after, so a load mixing the two made a seeded simulation's bodies in another order.
LayoutManager.addBodies now makes them in row order. Under "objects" columnRows() is empty and the engine is
handed its Nodes exactly as before.

- Proving test, node-batch "make an ngraph layout's bodies in row order when only some rows have a Node":
  failed before the fix (ro-red.log: body order [5, 0, 1, 2, 3, 4, 6, ...]), passes after. Whole node-batch.test.ts
  (render-parity project): 52 passed (ro-green.log).
- tsc --noEmit clean; eslint on the two changed files clean; sonar-gate: no new issue on the changed lines.
- Full render-parity (parity15.log): 7 failed, 318 passed, 12 skipped. Mandala and Sticker now pass.
  Still failing on the batched path: Bidirectional, CytoscapeSession, ForceAtlas2Weighted,
  LouvainMoreCommunitiesThanColours (1 px each), ThreePaths (68 px, was 325), Gexf (1488 px).
  MissingCredential failed with "ResizeObserver loop completed with undelivered notifications" caught by
  test/helpers/caught-errors.ts; its file run alone passes 4 of 4 (err1.log). Mechanism not found; not a picture
  difference.
- Gexf is NOT a lazy-Node defect: the ngraph simulation is identical on both paths (bodies, masses, pins and
  positions logged per step match exactly, dbg2.log), and the same 1488 px differ with VITE_PARITY_PULLED=1, which
  compares two object loads with only the edges pulled (dbg4.log). It is a pulled-edge difference for a file with
  many edge widths. The four 1 px stories pass with VITE_PARITY_PULLED=1 (dbg5.log), so they are batched-only:
  a single anti-aliased edge pixel each (dbg7.log), pointing at edge-end positions differing slightly in the
  position lane between a Node row and a row with no Node.

## Session 7: the load-peak gate is met

Target: live heap after a forced GC, sampled during a 200k-node batched load, under 1.5 KB per node.

Build: `tools/low-priority.sh pnpm exec nx run graphty-element:build --skip-nx-cache` in this worktree at 47c199dbb3, then
`BENCH_LABEL=stage26-pr11 BENCH_SOURCE=<this worktree> pnpm exec vite build` in benchmarks/compare. The master build is
`profile-master-1109b` (the 2026-11-09 profile's). Both served through servherd (stopped after). Sampler:
tmp/cosmos-impl/stages/stage26/poll-safe.mjs, a copy of tmp/cosmos-profile-2/memory-verify/poll.mjs whose end-of-run counts
no longer assume a built `Node` (the original hangs on this branch). It forces a GC, reads `Runtime.getHeapUsage` and the
row counts every 100 ms during `B.load()`. `BENCH_RENDER_PATH=batched`,
`BENCH_LIMITS={"renderCeiling":2000000,"edgesDrawn":2000000}`, lean, 2k edges, under the GPU lock.

Interleaved, same session (load average 2.4 before master, 3.5 before this branch):

| Build                  | Peak live heap during load | Per node    | Settled | TransformNodes after |
| ---------------------- | -------------------------- | ----------- | ------- | -------------------- |
| master (1109b), 200k   | 2,327.7 MB                 | 11,638 B    | 792 MB  | 200,002              |
| this branch, 200k      | 249.0 MB                   | **1,245 B** | 250 MB  | 2                    |
| this branch, 1M        | 1,104.5 MB                 | 1,105 B     | 1,105 MB| 2                    |

Gate met: 1,245 B per node, fixed ~53 MB included, against 1,500. A 1M-node load completes (first frame 15.6 s, load 2.6);
on master it died at about 450-500k rows. The anchor and the transient object row are gone with the `Node`: no separate change
was needed, so the "not started" items for them are closed. Logs: tmp/cosmos-impl/stages/stage26/poll-*.log.

Proving test (counts only), node-batch "load a batched graph with no Node, no anchor and no object row's instance for any
row": counts `InstancedMesh` and `TransformNode` added to the scene during a batched load of 12 rows, and `Node`s built.
Passes on this branch (0, 0, 0). With the path switched to "objects" as a sensitivity check it fails with
`expected 24 to equal +0` (instances counted), so the observers see object rows. Whole file: 53 passed.
`npx eslint graphty-element/test/browser/node-batch.test.ts`: clean.

Still open from earlier sessions: the render-parity differences on the batched path (four 1 px stories, ThreePaths 68 px,
Gexf 1488 px which is a pulled-edge defect on both paths), the one-off MissingCredential ResizeObserver error, the walks that
still build every `Node` (putOnPlane, AnnotationMeshes.nodes, SimulationLayoutEngine.nodes, UpdateManager.takeNodeBatch,
readCommunities), late-row body order, `nodeSizes` NaN for a row with no `Node`, and the parked edge-trim patch.

## Session 8: checks at d4154554c9

All run through tools/low-priority.sh, in graphty-element.

- npx tsc --noEmit -p tsconfig.json: exit 0.
- npm run lint (eslint, the two funnel rule tests, tsc, strict-consumer typecheck): exit 0.
- npm run build: exit 0.
- npm run api:report: the report gained `UpdateManager.adoptViewMasks`, added on this branch and called only
  by DataManager. It is now tagged `@internal` and the report shows it as an internal member. Additive, not
  breaking. Committed in d4154554c9.
- node tools/sonar-gate.mjs (repository root): "no new issue or hotspot on the changed lines" over 18 files.
- test/browser/node-batch.test.ts (render-parity project): 53 passed.
- test/managers/DataManager.test.ts (browser project): 30 passed.
- Full render-parity, test/render-parity/stories.test.ts (tmp/stage-26/parity16.log): 7 failed, 318 passed,
  12 skipped, 353 s. Every failure is on the batched path. No story differs on the objects path and none is
  unstable between two objects loads, so the objects path draws as on master.
  Batched failures: Bidirectional, CytoscapeSession, ForceAtlas2Weighted and LouvainMoreCommunitiesThanColours
  (1 px each), ThreePaths (325 px), Gexf (1488 px, the pulled-edge defect also seen on the objects path with
  edges pulled), Mandala (7717 px).
- Order-dependent difference, mechanism still not found: Mandala passed in the session 7 run and fails here
  with 7717 px. Run alone, PatternsAndSprites gives Sticker 7717 px and Mandala passing. The same pixel count
  moves between two stories of the same file depending on what loaded before, so some state outlives a story
  load on the batched path. ThreePaths gives 325 px both alone and in the full run (session 7 recorded 68 px).

Load-peak gate (from session 7, not re-measured): 1,245 B/node live heap after a forced GC during a 200k-node
batched load, against the 1.5 KB/node target. Met.

## Pull request 11, ninth session (2026-11-10): review fixes, and two open regressions

Fixed (commit cd9355f060), all through tools/low-priority.sh:
1. Removing a row with no `Node` under a d3 or ngraph layout left its body in the simulation. `D3GraphEngine` and
   `NGraphEngine` gain an internal `removeRows(ids)`; `DataManager.dropUnbuilt` calls it, which covers
   `dropRendered`, `dropRenderNodes` and `dropEverythingRendered`. Removal through `session.data.removeNodes` also
   built a `Node` for every removed row (`Graph.selectRemoval` and `DataManager.resolveId` called `getNode`, and
   `dropRenderNodes` called `nodes.get`); they now read ids through new internal `dataManagerInternals.storedIdOf`,
   `builtNode` and `incidentEdgeIds` hooks. Under "objects" every node is built, so these return what `getNode` did.
   Proving test: node-batch.test.ts "take a removed row with no Node out of a d3 or ngraph simulation". With the
   engine call disabled it fails ("d3: the removed rows' bodies left the simulation: expected [0..11] to deeply
   equal [0,1,2,3,6..11]"); it also failed before the id changes ("removing built no Node: expected 2 to equal 0").
   Passes with both.
2. `LayoutManager.updatePositions` guard: the graph-size check now applies under "batched" only; "objects" keeps
   master's `nodes.length === 0`.
3. Section 13 event case: node-batch.test.ts "hand a hover on a row with no Node the Node graph.getNode answers"
   hovers a row with no `Node` by real pointer input (after checking the point is over that row through the node
   ID target and that finding it built no `Node`) and asserts `evt.node === graph.getNode(id)`. Passes.

Checks: tsc --noEmit clean; eslint on the six changed files clean; npm run build exit 0; node-batch.test.ts
(render-parity project) 55 passed; LayoutManager.test.ts and DataManager.test.ts pass.

STILL OPEN, not fixed this session:
- Narrowed render-parity (parity17.log, load 2.6): 8 failed, 38 passed, unchanged by this session's fixes.
  Seven are new against the merge base (the reviewer's finding stands): Bidirectional, CytoscapeSession,
  ForceAtlas2Weighted, LouvainMoreCommunitiesThanColours (1 px each), ThreePaths (68 px), Mandala, Sticker (7717).
  Bidirectional fails alone too (not order-dependent). A probe of Bidirectional showed: every layout position equal
  on both paths, every edge's `trimInput` equal, all 20 Nodes built by the end of the batched load (built late), and
  one differing pixel at (537, 245), objects rgb(25,26,251) vs batched rgb(49,51,247): partial coverage of a blue
  arrow cap. Tried and reverted: updating a reused batch slot's draw key in `RowBatch.put` (no change).
  Next lead: draw order or anti-aliasing of the arrow caps against a late-built Node's batched instance.
- Five tests that pass at the merge base (pr10 worktree, 4f447d5f63: 154 passed) fail on this branch both with
  and without this session's change, so earlier commits of this pull request caused them:
  test/layout/pin-state.test.ts (default project) "returns every node to its data position after another layout
  has moved it, and keeps a later drag" -- `expected {x:0,y:2,z:0} to deeply equal {x:0,y:4,z:0}` at line 656;
  test/browser/layout-scaling.test.ts (forced-batched) three "no more than linear" cases; and
  test/browser/extensions/layout-extension.test.ts (forced-batched) "is told which rows are new after an add" --
  "the run was told it follows an add: expected null to not equal null". The pin-state one runs in the default
  project, so it may be an objects-path change; it must be traced before this pull request opens.

## Pull request 11, tenth session (2026-11-10): the five regressed tests fixed; render parity still open

Fixed (commit 2386c700ef), all run through tools/low-priority.sh:
1. pin-state.test.ts:656 (default project). The snapshot-layout host's `positionScale` answered 1 when the layout
   manager had no graph context (the unit harness never attaches one), which hid the node's own graph's scale. It
   now answers undefined then, so the node's graph is read as on master. In a real element the context is always
   attached, so the objects path draws as before. pin-state.test.ts: 18 passed.
2. layout-extension.test.ts "is told which rows are new after an add" (forced-batched). Under batched an add builds
   no `Node`, so nothing read the stale static layout in the add's pass, and the test (and a reader) saw the layout
   settled before it ran. `StaticLayoutEngine.updatePositions` now runs a stale layout first while it lays out by
   row (batched only; objects unchanged). 51 passed.
3. layout-scaling.test.ts, three linearity cases (forced-batched):
   - setLayoutScope: `LayoutManager.holdMaskOf` iterated `nodes.values()`, building a `Node` for every row while
     ngraph held none of them ("Node not found in NGraphEngine"). Under batched it now builds the mask by row from
     the snapshot.
   - SessionPositions.set: building a `Node` late for a row marked the static layout stale, so the next read re-ran
     `random` and moved the placed row (32.1 instead of 3). `StaticLayoutEngine.addNode` no longer marks the layout
     stale while it lays out by row: the row's freeze already did.
   - loadArrangement: the check counted `Node`s in the engine; it now counts ngraph bodies, which is the same number
     on objects and the right one on batched. 17 passed.
4. view-masks.test.ts (default project, 10 cases, regressed by an earlier commit of this pull request): the fake
   DataManager lacked the `nodeMap.built()` the mask walk now reads. Fake fixed. 10 passed.

Checks at 2386c700ef: tsc --noEmit clean; eslint on changed files clean; `npm run lint` exit 0; `npm run build`
exit 0; default project test/layout + test/managers 605 passed; browser + forced-batched layout-scaling,
layout-extension, define-layout 136 passed; node-batch.test.ts (render-parity) 55 passed; sonar gate: no new issue.
No API report change.

STILL OPEN: narrowed render parity (parity18.log, load 1.7; VITE_PARITY_STORIES="BidirectionalArrows|FilePositions|
FileStyles|Layout\.stories|Community\.stories|NodeDrawing|PatternsAndSprites"): 7 failed, 39 passed. Merge base
(pr10 worktree, same filter, parity18-base.log): 1 failed (Gexf 1488, known). New: Bidirectional, CytoscapeSession,
ForceAtlas2Weighted, LouvainMoreCommunitiesThanColours (1 px each), ThreePaths (68), Mandala (7717). Sticker passes
now, but the 7717 moves: running PatternsAndSprites alone, Sticker fails with 7717 and Mandala passes; running
Mandala alone, 0. Dumped frames show the cause: on the branch's batched path the edge LINES are drawn between the
nodes; on objects (and on both paths at the merge base) only the arrow heads are drawn, no line. Same samples
(gray 169 vs background 245) in ThreePaths. So the batched path draws edge lines that master never draws in these
stories (fixed layout, edges added after the nodes), and whether it does depends on which story ran before in the
file. Next: find what draws those lines on batched (an `Edge` built late with a fresh line, or the edge row table)
and why master leaves them out, and compare with the late-built `Node`s of the first story in the file.

## Pull request 11, eleventh session (2026-11-10): Mandala and Sticker fixed; ThreePaths has a lead

Cause of the 7717 px Mandala/Sticker difference (dumped each edge's line slot before the read): on objects a
pattern node's mesh reaches 1.8 along the edge (its plane), so the line runs from -4.2 to -4.3 and draws nothing
but the arrow head. On batched the edges were first placed while their end rows had no `Node`, against the row's
reach (1.2, so a visible line from -4.8 to -3.7). The row's `Node` was built later (for its paint, or by a reader
through `Edge.endNode`) on a frame where neither end moved, so the edge's position cache kept the row's ends.
Which story drew the line depended on whether the paint landed before or after the first edge walk.

Fix (UpdateManager, batched only: `adoptBuiltNode` is reached only from `DataManager.buildRow`):
- `adoptViewMasks` is now `adoptBuiltNode`: besides the masks, it invalidates the built `Node`'s edges' position
  caches and forces an edge walk (only when the load does not hold the draw; then the end-of-repaint walk places
  them, as a resize's edges wait).
- `edgesByNode` is keyed by node id instead of `Node`, so building it no longer builds a `Node` for every edge end
  (it read `edge.srcNode`/`dstNode`). On objects every row has a `Node` with that id, so the lookup finds the same
  edges.

Checks: tsc --noEmit clean; eslint on the two files clean. render-parity, PatternsAndSprites alone: 6 passed.
Narrowed render-parity + node-batch.test.ts (parity20.log, load 1.95): 6 failed, 95 passed. Mandala and Sticker
pass. Still failing: Gexf 1488 (fails at the merge base too), ThreePaths 68, and four 1 px differences
(Bidirectional, CytoscapeSession, ForceAtlas2Weighted, LouvainMoreCommunitiesThanColours).

ThreePaths lead (not fixed): every mesh's bounding box is the same on both paths at read time, and the `star`
node (shader:replace:demo/star-3d) has a box extent of 0.5. On objects its edges end 0.75 from it (box-star ends at
2.75, star-plain starts at 4.75), the reach of the impostor sphere it is drawn as before the replace shader lands.
On batched they end 0.5 from it (3.0 and 4.5), its final shape. So on objects (and on master) the edges are measured
before the star shape replaces the impostor and are never measured again; on batched the `Node` is built later,
after it. Matching objects means finding when the replace lands relative to the edge walk on each path. One run
with an id-keyed map but an unconditional edge walk gave 325 px instead of 68.
Build, npm run lint, sonar gate and the load-peak gate were not run this session.

## Pull request 11, twelfth session (2026-11-10): two leads closed, nothing fixed

No code change this session; the branch's code is as at 72039da50c.

1. ThreePaths: tried treating a change of shader path as a geometry change in `Node.paintFrom` (add
   `shaderPartOf(meshKey) !== shaderPartOf(this.meshKey)` to `geometryChanged`), so the star's edges measure
   again when its `replace` shader lands, on both paths. Narrowed render parity with it (parity21.log, load 4.9,
   filter adds NodeShapes|Shader|Edge): 8 failed, 72 passed -- ThreePaths 325 (was 68), Mandala and Sticker back
   to 7717, the four 1 px stories and Gexf unchanged. It also changes what the objects path draws compared with
   master. Rejected and reverted. So matching objects is not "measure again after the replace" on both paths;
   the 325 px picture is the one both this and an unconditional batched edge walk give, which suggests a third
   state (edges measured against the replace's pick-proxy sphere) rather than the final star.
2. Bidirectional (1 px): a probe in stories.test.ts (removed) dumped, after each load's canvas read, every row's
   row-table extent and every edge's cached end positions (`_lastSrcPos`, `_lastDstPos`). Objects has no row
   table; the 29 edges' cached ends are identical on both paths (dbg-ext1.log, compared with cmp-ext.py). So the
   differing pixel (a blue arrow cap's partial coverage at (537, 245)) is not a line-end difference. Remaining
   suspects: the arrow cap instance itself, or draw order / blending -- a late-built `Node` taking a different
   instance slot (order within the instanced draw) than at the merge base, where Bidirectional passes.
   Next: dump the arrow caps' instance matrices and the node batch's per-row slot order on both paths, and the
   same at the merge base (pr10 worktree).

Still to run before ready: npm run build, npm run lint, node tools/sonar-gate.mjs, the load-peak gate (met in
session 7, not re-measured since), and the pinned default-project tests.

## Pull request 11, thirteenth session (2026-11-10): the 1 px differences are draw order, found by material creation

No code change this session; the branch's code is as at 72039da50c. Probes in stories.test.ts (all removed) ran
BidirectionalArrows alone on this branch and on the pr10 worktree (where it passes), load average 2.4.

What is the same on both: the camera's view and projection matrices; every enabled mesh's world matrix, material
settings, submeshes and vertex data; every thin-instance buffer (arrow caps, node batch colors and `graphtyRow`);
the row table's `rowPosition` and `rowExtent`. The objects picture is bit-identical between the two worktrees;
only the batched picture differs (frame hash 863121169 on the branch, 804145100 at pr10 and on objects).

What differs: the order Babylon draws opaque meshes in. `RenderingGroup.PainterSortCompare` (Babylon's default
opaque sort) orders by material `uniqueId`, so meshes draw in the order their materials were made (the code
already says so in `drawOrder`, NodeBatch.ts). Material creation, traced with a stack on `Scene.addMaterial`:
- pr10, batched: `defaultMaterial` 96 is made first, by a `Node` built at store time (DataManager.buildNode from
  the ingest's nodeStored hook, bootstrap paint); the arrow caps (119, 125) and the line (122) come after. The node
  batch uses 96, so nodes draw before edges, as on objects (node material 10).
- branch, batched: arrow cap 96 and line 99 first (edges built during the ingest); then `defaultMaterial` 102 from
  `NodeBatches.paintRow` -> `sourceOf` in the update pass; arrow cap 105; then `defaultMaterial` 108 made by a
  `Node` built LATE by `Edge.getInterceptPoints` -> `srcNode` -> `NodeView.get` -> `DataManager.buildRow`
  (Edge.transformArrowCap, in UpdateManager.updateEdges). The node batch draws with 108, so it draws after every
  edge mesh, and one antialiased arrow-cap pixel at (537, 245) blends differently.
- Reordering `scene.meshes` before the read did not change the picture (consistent with a material-id sort).
- Tried (reverted): making the bootstrap look's source at the first Node-less row's store through
  `NodeMesh.source`. It made a material before the edges, but the batch still drew with a newer one (111): the
  Node-built source comes from `MeshCache.get` in `NodeMesh.create` with another cache key (the Node passes its own
  size; `sourceOf` passes `style.shape.size ?? 0`), and the batch took that one.

Two things for the next session, both batched-only:
1. Edge readers still build Nodes on batched: `Edge.getInterceptPoints` (Edge.ts, around line 5084) reads
   `srcNode`/`dstNode` (`drawnPickMesh`, `drawnInBatch`, `roundRadius`) for every arrow-capped edge. Read the row
   (`Edge.columnEnd` / the row table) instead, so no Node is built; this also matters for the load-peak gate on
   graphs with arrows.
2. Then make the node batch's material order match objects: the material a row's look draws with must be made
   before the first edge mesh, as a store-time Node made it. Either make the look's source at the first Node-less
   row's store with the same cache key a Node would use, or have `NodeBatches` pick, within a family, the source
   with the lowest `drawOrder`. Check CytoscapeSession, ForceAtlas2Weighted and LouvainMoreCommunitiesThanColours
   with the same probe: they are 1 px each and likely the same cause.

Still open and unchanged: ThreePaths 68 px, Gexf 1488 px (fails at the merge base too). Build, lint, sonar gate,
the load-peak gate and the pinned default-project tests were not run this session (no code change).
