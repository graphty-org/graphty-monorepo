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
