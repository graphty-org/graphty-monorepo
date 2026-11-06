# Stage 10 (node ID target) -- proof so far, NOT finished

## Fixed in this pass (commit cc4a0d78ea)
- Empty target: RenderTargetTexture.isReadyForRendering() notifies onBeforeBind, onBeforeRender, onAfterRender and
  onAfterUnbind while drawing nothing, so each read's readiness check marked the target fresh and empty. A subclass
  (IdTexture) now overrides render() to report real drawings.
- In-frame drawing was always discarded: Babylon draws customRenderTargets before the active-mesh evaluation, and
  collect() reset drawnIn on every evaluation. It now resets only when the list changed.
- Object marker 0xFFFFFF through an interpolated varying rounded to 0x1000000 and decoded as row 16711679
  (GraphFormatError in flat-shape-click under forced-batched). Now a constant color under #ifndef ROW_PULL.

## Commands and results
- tools/low-priority.sh pnpm exec vitest run --project browser test/browser/node-id-target.test.ts: 8 passed.
  Differences from shapeRayHit occur only at pixel centers within 1/8 px of a triangle edge (scan flips within 0.1 px
  at every one seen); the test lists them and bounds them at 2% of points.
- tools/low-priority.sh pnpm exec vitest run --project forced-batched test/interactions/selection
  test/interactions/hover-ends-on-leave.test.ts test/interactions/union-hover.test.ts
  test/interactions/flat-shape-click.test.ts test/browser/node-id-target.test.ts: 8 files, 47 tests passed.
- eslint on touched files: clean. tsc --noEmit: clean. nx build graphty-element: ok. npm run api:report: one
  @internal line (getNodeIdTarget), committed.

## Target: hover flat from 10k to 100k within 3 ms -- NOT MET
benchmarks/compare, label stage-10, sha 745e723e57, BENCH_RENDER_PATH=batched, run.mjs graphty lean on N 10N 1
skip-layout no-still, under the gpu-bench lock:
- 10k nodes / 100k edges (load avg 12.50 before): hover latMs [17.1,0.9,1.6,1,1.3,1.5,1.2,1.3,1.6,1.1], median 1.3 ms.
- 100k nodes / 1M edges (load avg 5.67 before): hover latMs [">180000"] -- no hover event within 180 s. Edges are still
  object meshes (objectEdges 1000000, orbit median 144 ms). Baseline (objects path) hovered at ~3.6 ms. Not diagnosed.

## Not run
- node tools/sonar-gate.mjs; row-scan-parity.test.ts and other tests pinning PickService/NodeBehavior/Graph.
