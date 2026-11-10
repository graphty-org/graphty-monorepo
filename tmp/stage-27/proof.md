# Proof: stage 27, fourth pull request (cached full edge walk on the batched path)

Refs #3249. Branch feat/3249-stage-27-lazy-edge-pr4, cut from origin/master 4081ce3d86.

## Change

On a batched graph whose rows all have a `Node`, a moving layout walked every edge of the engine on every
frame and asked each `followsRows`. `UpdateManager.placedEdges` now keeps the list of edges to place, rebuilt only
when the engine, `edgeVersion`, the engine's array length, `pulledLines.version`, the view (`is2D`) or the engine's
`geoFrame` changes. The full walk uses it under `"batched"` only; under `"objects"` the walk is the same code as
master (`UpdateManager.placeEdges(this.layoutManager.edges)`). `placedEdgesAtRows` (batched only) reads the same list,
so a pulled curve at a row with no Node is now placed when its rows move; before it was skipped. No API change.

## Test first

New test in `test/browser/pulled-edges-on-graph.test.ts`: "are not asked about by the frame's full walk while a
layout moves every node" (2D view, so every row has a Node, asserted with `dataManagerInternals.nodesBuilt`).
Before the change: `AssertionError: each pulled line was asked a fixed number of times: expected 340 to be at most 20`.
After: passes.

## Checks (all through tools/low-priority.sh)

- `npx vitest run --project=browser test/browser/pulled-edges-on-graph.test.ts test/browser/frame-loop-scaling.test.ts test/browser/location-map-layout.test.ts`: 3 files, 40 passed.
- `npx vitest run --project=browser test/browser/pulled-curves-batched.test.ts test/browser/pulled-edges-batched.test.ts`: 2 files, 18 passed.
- `npx eslint src/managers/UpdateManager.ts test/browser/pulled-edges-on-graph.test.ts`: clean.
- `npx tsc --noEmit -p .` (graphty-element): clean.
- `pnpm exec nx run graphty-element:build` (and --skip-nx-cache in tmp/stage-27/build-pages.sh): built.
- `node tools/sonar-gate.mjs`: no new issue or hotspot on the changed lines.
- No API change, so no api:report.

## Measurement (benchmarks/compare, lean-m: 100k nodes + 1M edges, WebGPU, batched, ngraph)

Before = origin/master 4081ce3d86, after = cf3bf70194. Each run under the shared GPU lock, interleaved, servers
via servherd (stopped). Rows: `benchmarks/results/stage-27-pr4-{before,after}{,-profiled}/results.jsonl`.

| Run      | Load avg (1 min) | First frame | Layout frame median | p95      | Frames |
| -------- | ---------------- | ----------- | ------------------- | -------- | ------ |
| before 1 | 7.1 -> 6.3       | 21,484 ms   | 425.3 ms            | 524.0 ms | 70     |
| after 1  | 6.3 -> 13.5      | 21,233 ms   | 441.9 ms            | 688.2 ms | 62     |
| before 2 | 15.0 -> 5.2      | 25,983 ms   | 435.7 ms            | 508.9 ms | 67     |
| after 2  | 5.2 -> 10.3      | 21,485 ms   | 462.2 ms            | 632.9 ms | 62     |
| before 3 | 10.3 -> 9.7      | 28,953 ms   | 446.4 ms            | 567.6 ms | 64     |
| after 3  | 9.7 -> 4.7       | 21,119 ms   | 405.6 ms            | 490.7 ms | 72     |

Profiled pair (BENCH_PROFILE_TIMED, `node tmp/stage-27/prof.mjs timed`, `node tmp/stage-27/under.mjs ... updateEdges`):

| Layout stage (30 s)           | Before (load 12.8 -> 12.9) | After (load 12.9 -> 14.5) |
| ----------------------------- | -------------------------- | ------------------------- |
| Frames                        | 51                         | 59                        |
| Garbage collector             | 2,034 ms                   | 1,388 ms                  |
| updateEdges inclusive         | 4,441 ms (87 ms/frame)     | 2,634 ms (45 ms/frame)    |
| placeEdges / placedEdges      | 2,159 ms                   | 28 ms                     |
| get followsRows self          | 1,090 ms                   | 17 ms                     |
| Load: garbage collector       | 1,064 ms                   | 1,156 ms                  |

## Target against measurement

- Stage layout-frame target (median at most half the stage's merge base) was met by the first pull request
  (472 ms against 1,554 ms) and still holds (436 ms before, 442 ms after, medians of three).
- This pull request's own effect: the frame's edge walk halves in the profile (87 to 45 ms per frame) and layout GC
  falls 2.0 s to 1.4 s, but the layout-frame median does not move beyond run-to-run spread on this loaded machine
  (load 4.7-15); not claimed as a frame gain. The rest of the frame is node work (computeWorldMatrix about 5.8 s
  self, followRow 7.6 s inclusive) and `supportPoints.update` asking every edge `supportEdge` (about 1.1 s).
- First-frame and heap targets belong to the lazy-Edge pull request still to come; first frame unchanged here.
