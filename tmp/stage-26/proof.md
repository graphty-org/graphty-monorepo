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
