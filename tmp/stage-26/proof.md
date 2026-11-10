# Stage 26, pull request 11

Summary at cfbe862cab (load average 5-6, 2026-11-10):
- Load-peak gate (target: live heap after a forced GC during a 200k-node batched load under 1,500 B per node):
  measured 250.1 MB peak = 1,250 B per node (session 7 measured 1,245 B). transformNodes 2, objectNodes 0.
- Full render-parity project: 381 passed, 12 skipped, 1 failed: Gexf 1488 px on the batched path, which fails
  without this branch too (see earlier sessions). Objects path clean.
- npm run lint 0, npm run build 0, tsc clean, sonar gate clean, pinned browser and manager tests pass.
- Both-path fix in this pull request: UpdateManager.repaintNodes re-places the edges of nodes a sprite shader
  resizes (eighteenth session); the Sticker and Mandala objects images change (edges now reach the sticker).


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

## Pull request 11, fourteenth session (2026-11-10): Bidirectional fixed; Graphviz found failing on this branch

Code change (graphty-element/src/Edge.ts, batched only -- `columnEnd` is undefined on "objects", so objects is
unchanged): an arrow-capped edge whose two ends are rows drawn with no Node now places its caps from the row table
and builds no Node.
- `getInterceptPoints` first tries `interceptPointsFromColumns`: both ends column rows and both round (row
  table `extentOf(row).round` non-null) -> `trimEnds` over the table's centres and extents, as the pulled cap's
  shader reads them (FilledArrowRenderer `capEnd`). Any other case falls back to the Node path as before.
- `placeArrowFromCentres` (taken while the ends overlap, e.g. before the first layout step) reads
  `endPosition` and a new `boxReachAt` (row table half extents) instead of `srcNode`/`dstNode`.
- `Edge.capScale(node)` became `capScaleAt(end)`, reading the row table's scale for a column end (a batched
  Node reads the same table, `Node.drawnScale`).
Probe (removed) showed the late Node builds were from `placeArrowFromCentres` and `getInterceptPoints` during
the update pass; after the change, the only Nodes built in BidirectionalArrows are the story's own
`graph.getNodes()` in its play function. No material pre-creation was needed: with no late Node, Bidirectional
matches.

Render parity (load 2.4-4.1):
- BidirectionalArrows: 1 passed (parity29.log; was 1 px).
- BidirectionalArrows|FilePositions|Layout.stories|Community/Community: 3 failed, 25 passed -- CytoscapeSession,
  ForceAtlas2Weighted, LouvainMoreCommunitiesThanColours still 1 px each (not yet probed; may be a different cause).
- NEW FINDING, LayoutGraphviz and LayoutLocationMap: on this branch at a223df103b (change backed out) 10 fail --
  Circo 41661, Dot 37871, Fdp 123787, Neato 107904, Osage 93116, Patchwork 119510, Sfdp 136246, Twopi 54507,
  FlatMapIn3DView 139557, GlobeIn3DView 1043 (parity25-base.log). The pr10 worktree passes all 14
  (parity27-pr10.log). So pull request 11's Node-less store breaks them; earlier narrowed runs did not include them.
- With this session's change, DotFileRecommended joins them (34724 px). Bisect: disabling only
  `interceptPointsFromColumns` makes it pass. Probes: on objects, 80 intercept calls, ending at the Graphviz
  positions (e.g. x = -5, -3 for rankdir LR); on batched, 7 calls at pre-Graphviz positions and none after. A
  change making UpdateManager walk every edge when the row table moved (rows with no Node are not in
  `nodesMoved`'s walk) changed no pixel, so the rows themselves are most likely never moved by the Graphviz layout
  when they have no Node (at HEAD the intercept's late Node builds were what got DotFileRecommended placed).
  Reverted. Next: check `GraphvizLayoutEngine` (a `SnapshotLayoutEngine`; `layoutStructure` walks `this._nodes`,
  built Nodes only) and how a snapshot layout's positions reach rows with no Node; commit 57ac80c19a fixed the
  same for defineLayout and a051523d91 for the location map.

Checks this session: tsc --noEmit clean; eslint src/Edge.ts clean. Not run: npm run build, full lint,
sonar gate, load-peak gate, pinned default-project tests. Still open: ThreePaths 68 px, Gexf 1488 px.

## Pull request 11, fifteenth session (2026-11-10): Graphviz and location-map parity restored by row-table sizes

Cause (probed, probe30/31.log): on the batched load no row has a Node when the Graphviz run starts, and
`SnapshotLayoutEngine`'s `nodeSizes()` / `nodeExtents()` read sizes from Nodes only, so every row went to Graphviz
as NaN and the answer differed (first row 0.501,-0.236 against 0.708,-0.713 on objects). On the pr10 branch the
2D `putOnPlane` built every Node first (`dataManager.nodes.values()`), which is also why it was Node-free nowhere.

Code change (batched only in effect; on objects every row has a Node, so both paths read what they read before):
- `SnapshotLayoutEngine`: a row with no Node takes its size and extents from a new internal host hook
  `rowHalfExtents(row)` (the row table's `extentOf(row).half`, null before the row is measured).
- `LayoutManager.putOnPlane` walks rows of the position lane and builds a Node only for a row whose Z must drop.
- Test first: node-batch.test.ts "hand a snapshot layout the sizes of rows with no Node, and lay it out in 2D
  building no Node" -- red without the change (red38.log: 12 Nodes built), green with it (green37.log).

Render parity, LayoutGraphviz|LayoutLocationMap (parity39.log, load 4.3): 12 passed, 2 failed.
- Now pass: Circo, DotFileRecommended, Fdp, Neato, Osage, Patchwork, Sfdp, Twopi, FlatMapIn3DView, GlobeIn3DView.
- Still fail: Dot 41602 px (only engine with spline routes; likely the edges' Graphviz bends, read per Edge in
  `getEdgePosition`, are not re-read for edges whose ends have no Node). PeerMissing 32796 / 36025 px in two runs
  (the count moved between runs; it passed before only because putOnPlane built every Node; its seeded force
  layout on Node-less rows is the next lead).
- Found, not fixed: `Graph.enterDimension` (a 2D/3D view switch) builds every Node via `getNodes()`.

Checks this session: tsc --noEmit clean; eslint on the three changed files clean. Not run: npm run build, full lint,
sonar gate, load-peak gate, pinned default-project tests, full render parity.

## Pull request 11, sixteenth session (2026-11-10): edges at rows with no Node follow a row-table move

Cause of Dot and PeerMissing (probe40.log): on batched with no Node built, `UpdateManager.nodesMoved` walks the
layout engine's nodes, which are built Nodes only, so when a layout moved the rows no edge at a row with no Node was
re-placed. Each Dot edge kept its first `_lastSrcPos` (pre-Graphviz place) while `getEdgePosition` already
answered the Graphviz place; PeerMissing (a force layout over arrow-capped edges) is the same.

Code change (UpdateManager only; gated: `getRowTable()` is null on "objects", so `rowsMoved` is false there):
- `movedWalk` also says whether the row table moved a row since the last walk.
- `nodesMoved` sets `unbuiltRowsMoved` when the table moved and the walk saw fewer Nodes than the graph has rows.
- The edge pass then updates every placed (not pulled) edge (`placedEdgesAtRows`); one whose ends stayed exits on
  its dirty check. Pulled lines follow their rows in the shader and are skipped. Marked `ponytail:` -- a whole
  walk of placed edges on each table move; a list of moved rows if a running layout at the ceiling needs it.
- A first form (return true = walk every edge, through `noteEveryNode`) broke Sticker alone; a second (return true
  without it) broke Mandala/Sticker in the shaders run (parity50/52.log): DIFFPROBE showed only gray edge pixels
  displaced. The pulled-edge skip fixed the shaders run (parity53.log: 54 passed, only ThreePaths 68 px).
- Test first: node-batch.test.ts "move the arrow-capped edges of rows with no Node when a layout moves the rows":
  red without the change (red41.log: 924 px against objects), green with it (green41.log).

Results:
- node-batch.test.ts (render-parity project): 57 passed (nb54.log).
- LayoutGraphviz|LayoutLocationMap: 14 passed (parity42.log) -- Dot and PeerMissing now pass.
- Full render parity, baseline WITHOUT the change (parity49-base.log, load ~4): 7 failed -- Louvain 1, Cytoscape
  Session 1, Gexf 1488, Dot 41602, PeerMissing 36025, ForceAtlas2Weighted 1, ThreePaths 68.
- Full render parity WITH the change (parity55.log, load 17): 6 failed -- Louvain 1, CytoscapeSession 1, Gexf
  1488, ForceAtlas2Weighted 1, ThreePaths 325, Sticker 7717. REGRESSION, NOT FIXED: Sticker 7717 px (and ThreePaths
  68 -> 325) appear only in the full run, never with PatternsAndSprites or shaders/ alone with this form, so they
  depend on what ran before. Probe in the full run (parity56.log): all 12 Sticker edges are placed (lineBatch, not
  pulled) and their recorded ends equal their current ends in both the failing Sticker and the passing Mandala; all
  12 Nodes are built by the read (the story's play reads `scene.nodes`). So the ends are right and the line batch
  is not: the next lead is a placed edge first drawn from column ends by `placedEdgesAtRows` during the load and
  then switched to a late-built Node's ends -- what that leaves in its LineBatch slots (a route run vs a straight
  slot, or a slot left behind).

Checks this session: tsc --noEmit clean; eslint on the two changed files clean. Not run: npm run build, full lint,
sonar gate, load-peak gate, pinned default-project tests.

## Pull request 11, seventeenth session (2026-11-10): what the Sticker and ThreePaths regression is

Five more full render-parity runs on 2b9ec347e0 with probes (parity57-62.log, load 5-12; probe patch kept, not
committed, in tmp/stage-26/radius-probe.patch):
- The failures move between runs: Sticker failed in 57, 60 and 62, passed in 58 and 59; Mandala failed in 61 and 62;
  ThreePaths failed in 57, 59, 60, 61 and 62, passed in 58. RefusedHttp failed once (62) on an unhandled
  "ResizeObserver loop completed with undelivered notifications" error -- not yet looked at. So this is a race in
  the element, not something a story ran before leaves behind.
- Line slots read after the picture (LINEPROBE): on objects every Sticker/Mandala edge is trimmed at the sticker's
  reach (n0-n1 line -4.20 > -4.30, node reach 1.8); on a failing batched load at the bare sphere (n0-n1 -4.80 >
  -3.70, reach 1.2 = node.size/2). Only gray edge pixels differ.
- Every load places each edge exactly once (REACHPROBE on getInterceptPoints), from a built Node's mesh
  (fromCols=false, inBatch=false). Passing batched load: placed with roundRadius 1.8. Failing batched load: the
  late-built Node reads 1.8 in UpdateManager.adoptBuiltNode, but by the next update pass (frame 2) the same Node,
  now drawn by mesh "node-style-s1|shader:replace:icon-sticker-3d", reads roundRadius 1.2, and the edge is placed
  then. No remeasure (UpdateManager.remeasureEdgesOf) follows for n0 on batched; on objects one does, before the
  only placement.
- So: under batched, a Node built late for a row drawn with a replace shader answers the bare shape's radius
  (1.2) for at least one frame after it is built, and its edges are placed in that frame and never measured again.
  Node.roundRadius is memoised on the anchor and its scale (Node.ts ~879), and the shader's reach is not in the
  mesh's bounds; where the 1.8 comes from on objects (the row table's extent, written by RowTable.measure from
  ColumnRow, or the mesh bounds after some later step) is the next question. The change in 2b9ec347e0 makes this
  visible because placedEdgesAtRows is no longer the only path, not because it places the wrong ends: it moves the
  first placement earlier relative to the shader landing.
- Next step: log Node.roundRadius, batchSource, the anchor's bounds and the row table's extent for n0 on every
  frame from build to settle, under batched, to find which read answers 1.2 and what later makes objects answer 1.8;
  then re-measure the edges of a late-built Node whenever its measured reach changes (or make roundRadius answer the
  drawn reach from the first frame). ThreePaths (NodeDrawing) is probably the same race; check it with the same probe.

Checks this session: no source change kept. Not run: npm run build, full lint, sonar gate, load-peak gate, pinned
default-project tests.

## Pull request 11, eighteenth session (2026-11-10): Sticker, Mandala and ThreePaths fixed (a defect on both paths)

What it was. A sprite shader ("replace" path, e.g. icon-sticker) keeps the node's mesh only as a pick proxy, a
sphere of the node's radius. When the sprite becomes drawable after the first paint, NodeShaderDrawing hands the
nodes to UpdateManager.repaintNodes, which repainted them but threw away the set of resized nodes, so their edges
were never placed again. Probed per frame (tmp/stage-26/radius-probe2.patch, not committed): on objects the edge
was placed against the plain icosphere (reach 1.8 at size 2.4), then the node became the sprite's sphere (1.2) and
nothing re-placed the edge; on batched, whether the first placement came before or after the sprite landed decided
1.8 or 1.2 -- that was the "race". Master (objects) has the same defect: its Sticker and Mandala edges stop 0.6
short of the sticker. The fix is on both paths, allowed as a both-path defect: repaintNodes now calls
remeasureEdgesOf on the resized nodes, as the style pass does. This changes the objects picture of the Sticker,
Mandala (and any sprite story whose shader lands after the first placement): edges now reach the drawn sticker.
Expect those visual-review images to change.

Proving test, test first: test/browser/shaders/sprite-edge-trim.test.ts (two nodes 8 apart, size 2.4, a sticker layer
added after the first stable frame; asserts the line starts at 1.8 before and 1.2 after, on objects and batched).
Without the fix: objects failed "expected 1.7999999523162842 to be close to 1.2", batched passed by timing. With
it: 2 passed.

Also: SonarQube S3358 (nested ternary) in Edge.capScaleAt, from an earlier commit on this branch, fixed by a small
helper rowOrNodeScale that still reads the end's Node only when the row cannot answer (reading it builds one).

Commands and results (load average 5-12):
- `tools/low-priority.sh npx vitest run --project render-parity test/render-parity/stories.test.ts -t PatternsAndSprites`
  before the fix: Sticker failed in isolation (parity63.log). After: PatternsAndSprites and NodeDrawing 7 passed.
- Full render-parity (parity66.log): 321 passed, 12 skipped, 4 failed: CytoscapeSession 1 px, ForceAtlas2Weighted
  1 px, LouvainMoreCommunitiesThanColours 1 px, Gexf 1488 px (fails without this branch too). Sticker, Mandala and
  ThreePaths pass. RefusedHttp passed this run.
- `npm run lint` (graphty-element): exit 0. `tsc --noEmit`: clean. `npm run build`: exit 0.
- browser: sprite-edge-trim, shaders/node-drawing, pattern-sprite-presets, shader-places: 32 passed; edge-arrow-stack,
  edge-trim-mirror, node-batch, location-map-layout, sprite-edge-trim: 82 passed.
- default: managers/UpdateManager, pending-work-inventory (plus view-masks files): 13 passed.
- `node tools/sonar-gate.mjs`: S3358 found, fixed; rerun "no new issue or hotspot on the changed lines" (it reported
  the two then-uncommitted files as checked on the next push).
- Load-peak gate: not re-measured this session; last measured at 47c199dbb3 (session 7): 1,245 B per node against
  1,500. This change touches no storage.

Still open: the three 1 px stories (draw order by material creation, thirteenth session) and Gexf (both paths);
2D/3D switch building every Node; edges with non-round ends building Nodes; placedEdgesAtRows walking every
placed edge on each row-table move.

## Pull request 11, nineteenth session (2026-11-10): the three 1 px stories fixed (draw order)

Cause, probed (parity71-83.log): Babylon sorts opaque meshes by material uniqueId. On objects every node's
`Node` is built at store time with the bootstrap look, making its source material (10) before the edges' (62, 65),
and later paints keep that mesh (`Node.keepsMeshFor`: same key, or a deep-equal style and color). On batched the
node batch's source was made at the first paint, from the final key (`s1`), after the edges (154 vs 148/151), so
nodes drew after edges. In Louvain a Node built late (`DataManager.buildRow` -> `paintBuiltRow`) also rebuilt onto
a new `s1` source, since it skipped the bootstrap-to-default step its row went through.

Change (batched only: `NodeBatches` exists only on "batched", and no row is stored without a Node on objects):
- `NodeBatches.prepareSource`, called where the store keeps a row with no Node (both store paths in DataManager):
  makes the bootstrap look's source then.
- `NodeBatches.paintRow` keeps a row's source across paints by the same rule as `Node.keepsMeshFor`; each
  `ColumnRow` carries the paint its source was made for.
- `buildRow` hands the row's look to the late Node: built from the row's source paint, then
  `Node.takeDrawnPaint` (internal) takes the row's current paint.
- `shaderPartOf` moved from Node.ts to StylePainter.ts (shared).

Proving tests: the render-parity stories themselves. Before: CytoscapeSession, ForceAtlas2Weighted,
LouvainMoreCommunitiesThanColours failed 1 px each (parity70.log). After: those plus BidirectionalArrows, Sticker,
Mandala, ThreePaths 10 passed (parity84.log). No separate count test was added: the material order is what the
picture comparison already pins.

Commands (all through tools/low-priority.sh, in graphty-element):
- `npx vitest run --project render-parity` (parity85.log): 381 passed, 12 skipped, 1 failed (Gexf 1488 px, batched,
  pre-existing).
- `npm run lint`: exit 0. `npm run build`: exit 0. `npx tsc --noEmit`: clean.
- `npx vitest run --project browser` drawn-program-styles, every-element-leaves-the-bootstrap-paint,
  shaders/sprite-edge-trim, edge-arrow-stack: 34 passed.
- `npx vitest run` managers/UpdateManager, managers/DataManager, logging/DataManagerLogging: 55 passed.
- `node tools/sonar-gate.mjs`: no new issue or hotspot on the changed lines.
- Load-peak gate: bench build `stage26-pr11-d` from this worktree, served by servherd (stopped after), sampler
  tmp/cosmos-impl/stages/stage26/poll-safe.mjs under the GPU lock, BENCH_RENDER_PATH=batched,
  BENCH_LIMITS={"renderCeiling":2000000,"edgesDrawn":2000000}, lean, 200k nodes, 2k edges, POLL_MS=100, load
  average 4.98: peak 250.1 MB, 1,250 B per node (log tmp/cosmos-impl/stages/stage26/poll-pr11-d.log).

Still open (not regressions of this pull request): Gexf 1488 px on batched; `Graph.enterDimension` builds every
Node; edges with non-round ends, or one end with no Node, build Nodes; `placedEdgesAtRows` walks every placed edge
on each row-table move (marked ponytail); the one-off RefusedHttp ResizeObserver error (passed in parity85).

## Review fixes: undo, redo and removal of rows with no Node (commit 620cd33a5e)

Commands (from graphty-element, all through tools/low-priority.sh):

- `npx vitest run --project forced-batched` on the seven review files (data-path-scaling,
  history-arrangement-engines, element-clear-data, history-graph-add, history-readded-node,
  history-random, history-engines): before, 19 failed / 129 passed; after, 148 passed.
- Same seven under `--project browser` (objects): 148 passed.
- Every browser test file that drives undo, restoreTo, clearData, removeNodes,
  removeNodeAndIncidentEdges, positions.set or loadArrangement (82 files, list in
  tmp/stage-26/pinned82.txt):
  - `--project browser` (objects): 76 files, 900 passed, 2 skipped, 0 failed.
  - `--project forced-batched`: 74 files, 838 passed, 7 failed, 1 skipped. The same 7 fail at
    15b9df159c without this commit, and pass at the merge base (feat-6389 worktree, 77 passed),
    so they are earlier regressions on this branch, still open:
    - edges-end-on-nodes-2d: "a position with a Z placed while the view is 2D" (edge drawn 9.75
      long between nodes 4.56 apart)
    - static-layout-teardown: replacing import and undo, `{ nodes: 0, edges: 100 }` drawn,
      expected 200 nodes
    - time-changed-rows (3): frame 1 writes 1500 rows (limit 62); edge 43 off its nodes on
      reveal; 100 revealed edges placed again (expected 0)
    - layout-extension: SimpleLayoutEngine scaling factor, column 0 at -2.96 (expected 0)
    - define-layout-defaults: simple twin positions all 0 versus the advanced twin
- `npm run build`, `npm run api:report`, `node tools/api-report.mjs graphty-element --check`:
  "API report matches the build" (adoptBuiltNode, Node.takeDrawnPaint, both internal).
- eslint on the changed files, `tsc --noEmit`: clean. `node tools/sonar-gate.mjs`: no new issue.

element-clear-data's "lays the next load out from scratch" now builds the Nodes (reading the data
manager's keys) before reading LayoutManager.nodes, which lists only Nodes: under batched the
rows have none until asked. On objects the read builds nothing.

No design-doc correction was needed.

## The seven forced-batched regressions are fixed (commits 8567dc257b, 53bc32a79d, 52657ba328)

Mechanisms found, each under renderPath "batched" only:

1. A third party's SimpleLayoutEngine arranges `this.nodes`, the Nodes it holds. It was attached to
   the rows and treated as placing rows it was never handed, so it was handed no Node for a row
   stored with none and left that row where the last layout put it (layout-extension scaling factor,
   define-layout-defaults advanced twin). LayoutManager now lays out by row only for a
   SnapshotLayoutEngine or a defineLayout engine (`isDefinedLayout`, internal); a third party's
   engine gets a Node for every row, as design/rendering/row-renderer.md already says.
2. static-layout-teardown asserted the engine holds 200 Nodes. Under batched the random layout
   arranges by row and holds no Node, which is the stage's point; the test now compares with the
   Nodes the data manager built (all of them on objects, so that path asserts what it did before).
   The leak it guards (edges held after a replacing import) is still asserted exactly.
3. A positions.set on a resting layout moved a row with no Node, but the row table caught up with the
   lane only after the edge walk, and no later frame ran: the edge stayed 9.75 long between nodes
   4.56 apart (edges-end-on-nodes-2d). The node walk now flushes the row table before the edges, as
   the roster walk already did.
4. Building the Node of a row already drawn bumped nodeVersion, so the next pass forgot the applied
   view masks and walked every edge: 1,500 writes on a time step that moved 62 (time-changed-rows,
   all three). adoptBuiltNode already puts a new Node in line with the masks, so such builds are
   counted apart (`dataManagerInternals.lateNodeVersions`) and no longer invalidate them. On objects
   the count stays 0.

Commands (from graphty-element, all through tools/low-priority.sh):

- The 5 files of the 7 failures, `--project forced-batched`: before, 7 failed / 70 passed; after,
  all pass (layout pair 58 passed; time-changed-rows + edges-end-on-nodes-2d 18 passed; teardown 1).
- The 82-file set (tmp/stage-26/pinned82.txt):
  - `--project forced-batched`: 74 files, 845 passed, 1 skipped, 0 failed (was 838 passed, 7 failed).
  - `--project browser` (objects): 76 files, 900 passed, 2 skipped, 0 failed.
- Final code, the touched and pinning files (node-batch, define-layout, define-layout-defaults,
  layout-extension, time-changed-rows, edges-end-on-nodes-2d, static-layout-teardown): forced-batched
  94 passed, browser 151 passed; default project test/simple and the Layout/Update/DataManager tests
  164 passed.
- `npx vitest run --project render-parity` (parity86.log): 381 passed, 12 skipped, 1 failed: Gexf
  1488 px on the batched path, the same known difference as before. Objects path clean.
- eslint on the changed files clean, `tsc --noEmit` clean, `npm run build` 0,
  `node tools/api-report.mjs graphty-element --check`: "API report matches the build" (no API change).
- `node tools/sonar-gate.mjs`: no new issue or hotspot on the changed lines.

Load-peak gate: not re-measured after these commits. Last measured at cfbe862cab: 1,250 B per node
against the 1,500 B target. These commits add one counter and change no load path.

## Review fix: defined layout on an empty graph (renderPath objects)

Defect: `simpleLayoutInternals.hostGraph` fell back to the graph attached with the rows for every
defined layout on both paths, so `setLayout` of a defineLayout layout on an empty graph ran
`place()` over no nodes (master skips it) and rejected when `place()` threw. Fix in
graphty-element/src/layout/LayoutEngine.ts: the attached graph is returned only while `#rowSource()`
is non-null (renderPath "batched" and at least one row), so objects and an empty graph answer as
on master.

- New test, test/browser/simple/define-layout.test.ts "defineLayout set on an empty graph": without
  the fix it failed with `GraphtyError: acme-needs-a-node: place() threw (Error: needs a node)`;
  with the fix it passes.
- browser project, node-batch + simple/define-layout + simple/define-layout-defaults: 82 passed.
- forced-batched project, same files: 25 passed (2 files run there).
- default project, test/simple: 164 passed.
- eslint on the two changed files clean, tsc --noEmit clean, npm run build clean, no API change.
- node tools/sonar-gate.mjs: no new issue or hotspot on the changed lines.
