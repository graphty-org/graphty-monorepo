# Stage 26, pull request 11 (work in progress, not ready)

Proving test: test/browser/node-batch.test.ts, "load a graph under batched building no Node, drawing the picture its Nodes drew".

- Before the change: failed at "no Node built at load: expected 12 to equal +0" (the picture assertion before it passed).
- After the first half of the change: same failure, traced to DataManager.reconcileNode and a walk of
  dataManager.nodes.values() in Graph.ts; both fixed.
- After switching Graph's internal walks to built nodes: the run did not finish in 600 s. Not yet diagnosed.
  First suspect: DataManager.drawHeld (unpainted keys for rows stored with no Node may never be cleared by
  notePainted, so waitForStableFrame never resolves). Not verified.

Checks run: tsc --noEmit clean; eslint clean on the touched files. Nothing else run yet.
