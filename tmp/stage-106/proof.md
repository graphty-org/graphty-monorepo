# cosmos-gap G6, pull request 1: paint a row with no Node from one style per mesh key

Change: `StylePainter.rowPaint(index)` caches one `NodePaint` per node look (mesh key, opacity, visible flag,
color alpha, gradient start, checked against the interned mesh style as the edge cache is) and returns the
shared style with the row's own color. `UpdateManager.unbuiltPainted`, the only path that paints a row stored with
no `Node` (such rows exist only under renderPath "batched"), uses it. `nodePaint` is unchanged, so every `Node` and
the whole objects path build a style per node as on master. Rollback: one line in `unbuiltPainted`
(`rowPaint` back to `nodePaint`). No public API change.

## Proving tests (written first)
- `test/managers/style-painter.test.ts`, new "row paints, one look per mesh key": rowPaint deep-equals nodePaint for
  every row; four rows of one shape under a color ramp share 1 style and keep 4 colors; a data-driven size gives a
  style per row; a label is never shared; nodePaint still builds a style per node. 66 passed.
- `test/browser/node-batch.test.ts` "load a batched graph with no Node...": distinct paint styles across the 12
  batched rows = 2 (two sizes). With the call site reverted to nodePaint it fails `expected 12 to equal 2`; with
  the change 57 passed. `nodesBuilt` 0 after load holds.

## Checks (all through tools/low-priority.sh)
- render-parity project, full, run 1 (load 4.5): 380 passed, 12 skipped, 2 failed: Gexf 1488 px on batched (fails
  on master too, known since stage 26) and NodeModels StlTurnedUpright 14919 px on batched.
  StlTurnedUpright then passed alone with and without the change (NodeModels file: 5 passed both ways), in a
  `Node|Model` subset (34 passed), and in full run 2 (load 5.8-6.8): 381 passed, 1 failed (Gexf only).
  Its mechanism is NOT found: it is intermittent in a full run only, and the change does not reach it as far as I
  can trace (a model row is not drawable by a batch, so it gets a `Node` painted by `nodePaint` exactly as before).
  Recorded as open, not dismissed.
- Browser: channel-paints, node-id-target, element-clear-data, edge-ends-cached, limits-option, time-changed-rows,
  pulled-edges-batched: 614 passed, 1 skipped. Default: UpdateManager, pending-work-inventory: 3 passed.
- npm run lint (eslint + tsc + strict-consumer typecheck): clean. nx build graphty-element: success.
- node tools/sonar-gate.mjs: no new issue or hotspot on the changed lines.

## Measurement (benchmarks/compare, lean-m-few = 100k nodes + 1k edges, records, batched, RTX 4070 SUPER, GPU lock)
Interleaved 3 rounds; g6-off is the same tree with the call site reverted (rows marked dirty).

| round | load avg | g6-on first frame | g6-off first frame | g6-on JS heap used | g6-off JS heap used |
|-------|----------|-------------------|--------------------|--------------------|---------------------|
| 1     | 6.3      | 1623 ms           | 1420 ms            | 137 MB             | 195 MB              |
| 2     | 5.0/4.2  | 1390 ms           | 1402 ms            | 137 MB             | 195 MB              |
| 3     | 4.0/3.7  | 1442 ms           | 1433 ms            | 137 MB             | 195 MB              |

Target: first frame at most 2.0 s -- met on both (about 1.4 s); stage 26 had already met it, and this change does not
move the first frame. It removes about 58 MB of heap at 100k rows. rowCounts: batchedNodes 100000, objectNodes 0.
Correction recorded in design/rendering/row-renderer.md section 4.6.

## Not in this pull request (pull request 2 of the stage)
- `repaint.ts` uniform mesh-key fill under the ingest host's batched flag (with "a data-driven size still interns
  per row" and the objects mesh-key / retain-release equality tests).
- The scene-object guard (`scene.transformNodes` at 1k and 10k rows equal within a constant after hover, select, drag).
- Writing the color straight from the color column into the batch buffer (one small Rgba per row remains).
