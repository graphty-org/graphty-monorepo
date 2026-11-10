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
