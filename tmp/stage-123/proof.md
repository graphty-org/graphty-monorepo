# Stage 123: pulled lines drawn with no index buffer (Refs #6389)

## What changed

- `PulledLineBatch` (renderPath "batched" only; the objects path never makes one) sets `mesh.isUnIndexed` and
  draws `pieces * corners` vertices with `drawArrays`. No index list is built, uploaded or kept (it was 30
  indices, 120 B, a piece for the join program; 6 for the lean and animated ones).
- The join shader (`edgeJoinShader.ts`, join and lean programs) and the animated line shader
  (`pulledAnimatedLine.ts`) read the slot as `gl_VertexID / corners` and the corner from their own copy of the
  template's index list (`CORNER_OF`, generated from the same constants).
- Draw order across widths (#6392): a draw order table `edgeOrder` (a float a slot, RGBA float, 4 slots a
  texel), read only while `edgeOrdered` is 1, which is only once two widths interleave. One width: no table read,
  a one-line placeholder bound.
- The pulled meshes are made without an index list (`createJoinedLineMesh` with `pulled`, the animated mesh).
  Babylon still gives a geometry an empty index buffer object; it holds 0 indices.
- No six-vertex G12 program exists in the code; the lean program is the 6-corner one and is covered.
- Design correction: design/rendering/row-renderer.md section 4.3 said the 14-vertex form needs an index buffer
  (120 MB at 2^20); it now says the draw is unindexed and how order is kept.

## Tests (test first)

`test/mesh-testing/pulled-line-draw-order.test.ts` rewritten to read the draw order table, plus two new cases:
every pulled mesh kind (join, lean, animated) at 5000 pieces of two widths is unindexed with 0 total indices and
`pieces * corners` vertices drawn. Before the change: 5 of 5 failed (no `drawOrder`; index buffer present).

    npx vitest run --project=mesh test/mesh-testing/pulled-line-draw-order.test.ts test/mesh-testing/pulled-line-upload-runs.test.ts
      -> 8 passed
    npx vitest run --project=browser pulled-edge-lines pulled-animated-lines pulled-edges-batched pulled-edge-look
      -> 13 passed (pulled-edge-lines compares plain against pulled pixels, 0 differing, join and lean; its
         index-count assertion now asserts corners drawn and 0 indices)
    npx vitest run --project=browser context-loss million-edge-lines edge-row-lines pulled-curve-glsl
      pulled-arrow-caps sub-pixel-edges-draw-continuous  -> 54 passed
    npx vitest run --project=render-parity test/browser/node-batch.test.ts -> 63 passed

## render-parity (bar unchanged)

    npx vitest run --project=render-parity            (WebGL)       -> 381 passed, 14 failed, 12 skipped
    VITE_PARITY_ANTIALIAS=false ... test/render-parity (lean program) -> 316 passed, 16 failed, 12 skipped

No failure is from this change. The only "differs on the batched path" is AiControl Voice (222 px), and the same
story fails the same way on the parent commit (`VITE_PARITY_STORIES=AiControl`, src of HEAD~1: 6 failed, Voice
222 px, the other five "on objects: something is drawn over part of Send"). The rest are objects-against-objects
instability (PatternsAndSprites FoilShimmer/Frost/Hologram/Mandala/Patterns/Sticker, ScenePresets
Nebula/HullGoo/SoapBubble) and one `ResizeObserver loop` error in network-sources Errors RefusedHttp; none
compares a pulled line. Logs: tmp/stage-123/parity-webgl.log, parity-lean.log, parity-aicontrol-master.log.
The WebGPU parity run was not run locally.

## Measurement (target: line upload time at load cut by >= 0.15 s at 100k + 1M)

Bench pages `benchmarks/compare/builds/stage123-before` (parent commit's src) and `stage123-after`, served
through servherd (stopped after). `tmp/cosmos-profile-4/prof.mjs graphty cpu load 100000 1000000` (lean 2D,
batched, WebGL), interleaved before/after x3 under `flock tmp/cosmos-impl/gpu-bench.lock`. Load average
14.6-19.1 throughout (per run in tmp/stage-123/runs/log.txt). Self time from the CPU profiles
(`tmp/stage-123/sum-self.mjs`): the index loop (`index`, after: `sort`) plus `bufferData`.

| run | index/sort self | bufferData self | line upload | load (ready) | heap after load |
| --- | --- | --- | --- | --- | --- |
| before 1 | 127.6 ms | 151.3 ms | 278.9 ms | 7124 ms | 648 MB |
| after 1 | 24.3 ms | 3.3 ms | 27.6 ms | 6157 ms | 534 MB |
| before 2 | 63.3 ms | 164.6 ms | 227.9 ms | 5184 ms | 649 MB |
| after 2 | 18.2 ms | 2.8 ms | 21.0 ms | 5002 ms | 537 MB |
| before 3 | 75.1 ms | 150.2 ms | 225.3 ms | 5014 ms | 650 MB |
| after 3 | 24.5 ms | 4.0 ms | 28.5 ms | 4819 ms | 535 MB |

Median line upload 227.9 ms -> 27.6 ms: cut 0.20 s, target (>= 0.15 s) met. No index buffer allocated. JS heap
at the end of the load fell about 114 MB. Load numbers are under load average 15-19 and only compared within
these interleaved runs.

## Checks

    npm run lint (eslint, tsc --noEmit, strict-consumer typecheck) -> exit 0
    pnpm exec nx run graphty-element:build --skip-nx-cache -> ok
    node tools/sonar-gate.mjs -> no new issue or hotspot on the changed lines
No public API change (PulledLineBatch is internal), so no api report.

## Review finding: slots above the sorted range

The fresh-context review found that while two widths interleave, a piece handed out after a sort whose key equals
its own number asked for no new sort, so its slot kept 0 in the draw order table: piece 0 drew twice and the new
piece never drew. Fixed in PulledLineBatch.sort(): every slot from highWater to the end of the table names its own
piece, as the old index builder did. New test "draws a piece handed out after a sort even when no new sort follows"
in test/mesh-testing/pulled-line-draw-order.test.ts failed first (expected [0, 1, 0] to equal [0, 1, 2]) and passes
after. Batched path only; the objects path does not use PulledLineBatch.

    npx vitest run --project=mesh test/mesh-testing/pulled-line-draw-order.test.ts -> 6 passed
    npx vitest run --project=mesh test/mesh-testing/pulled-line-upload-runs.test.ts -> 3 passed
    npx vitest run --project=browser pulled-edge-lines, pulled-edges-on-graph, pulled-curves-batched, node-batch -> 89 passed
    npm run lint -> clean; npm run build -> ok; node tools/sonar-gate.mjs -> no new issue on changed lines
