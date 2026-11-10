# cosmos-gap G6, pull request 2: uniform mesh-key fill and the scene-object guard

Commit be7a0ac541 (Refs #6389).

Change: when every mesh-keying channel is absent or one value over a repaint's dirty set, `internDirty`
(`src/session/styles/repaint.ts`) interns one sequence and only moves each row's retain count, instead of hashing
every row. Switch: `RepaintSources.uniformFill` (absent = off), which `GraphSession` takes from
`SessionInternals.batched` and `Graph` sets to `renderPath === "batched"`. Under "objects" nothing sets it, so the
pass is the per-row path as on master. Rollback: drop the `batched` line in `Graph.ts`. No public API change
(`npm run api:report` left api/ unchanged).

Correction (recorded in design/rendering/row-renderer.md 4.6): the switch comes from the session, not from the
ingest host's `batched` flag as cosmos-gap.md 3.3 item 3 says -- the repaint is built by the session, which never
sees the ingest host.

## Proving tests (written first)
- `test/session/styles/repaint.test.ts`, "a uniform mesh-key fill (cosmos-gap G6)": 40 rows, one shape:
  interner comparisons off = 39, on <= 1 (failed before the code: `expected 39 to be at most 1`); keys, mesh
  styles and meshCount equal on and off; a data-driven shape keeps 3 meshes and per-row keys; removing the
  layer moves every row back to key 0.
- `test/browser/node-batch.test.ts`, scene-object guard: under "batched", 1k and 10k rows, real hover, click and
  drag (the drag is asserted to move the row), `scene.transformNodes` grows by at most 20, in 3D and 2D. Passes.
  FINDING: written first with the view switched AFTER the load, it failed `expected 9000 to be at most 20`:
  `Graph.enterDimension` reads `getNodes()`, which builds a Node for every lean row. A defect of the batched
  path from stage 26, not of this change; the test enters the view before the load, and the defect is recorded
  in row-renderer.md 4.6, not fixed here.

## Checks (through tools/low-priority.sh)
- npm run lint (eslint, tsc, strict-consumer): exit 0. nx build graphty-element: success.
- Unit: test/session/styles/, mesh-detail, style-painter, style-painter-removed-color: 56 files, 969 passed.
- Browser: node-batch, channel-paints: 628 passed.
- render-parity, full (load 11.4 -> 8.7): 383 passed, 12 skipped, 1 failed: Gexf, 1488 px on the batched path,
  the same failure and count as on master and in pull request 1.
- node tools/sonar-gate.mjs: no new issue or hotspot on the changed lines.

## Measurement (benchmarks/compare, lean-m-few = 100k nodes + 1k edges, batched, RTX 4070 SUPER, GPU lock)
| run | load avg before | first frame | JS heap used |
|-----|-----------------|-------------|--------------|
| 1   | 4.95            | 1029 ms     | 136 MB       |
| 2   | 5.83            | 1010 ms     | 136 MB       |
| 3   | 5.77            | 976 ms      | 136 MB       |
Target: first frame at most 2.0 s -- met. Pull request 1 measured about 1.4 s on its tree in another session;
that is not an interleaved A/B, so no gain is claimed for this change from it. rowCounts: batchedNodes 100000,
objectNodes 0.

## Not built
- Writing the color straight from the color column into the batch buffer (one small Rgba per row remains):
  the target is met without it.
