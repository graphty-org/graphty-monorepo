# test/limits -- the node-limits project (P4+)

Tests that need limits or time above lavapipe's run here (spec 11.1), selected by
`pnpm exec vitest run --project=node-limits` on the GPU lane only; the default lane
never selects this project. The first file, `pagerank-1m.test.ts`, landed at G7
(the P7 phase; spec 13 rule (b) kept the directory empty until a phase needed it).
Files, planned and landed, and the gate that lands each:

- `pagerank-1m.test.ts` (G7, landed): PageRank over a 1M-node / 10M-arc random
  snapshot completes within 100 iterations, returns 1M finite scores summing to 1
  within `1e-3`, and reports a boolean `converged`.
- `binding-2gib.test.ts` (G4, landed): the raised `maxStorageBufferBindingSize` is above
  128 MiB (the RTX 4070 SUPER reports 2,147,483,644: the 2 GiB request clamped four bytes
  under 2^31) and a 1.5 GiB buffer is bound whole to `fill` and read back.
- `windowed-200mb.test.ts` (G4, landed): a 200 MB per-array upload is bound windowed at
  the default limits (two windows) and the windowed `degree` equals `outDegree()`; the
  `exclusiveScan` at 16,776,961 items (the `+ 1` case of spec 11.3).
- `dispatch-2d-100m.test.ts` (G4, landed): a real 2D dispatch on 100M items (above
  16,776,960) through `linear_id`.
- `oom-scope.test.ts` (G4, landed): the "out-of-memory" error scope on a deliberately
  oversized allocation (a buffer of exactly `maxBufferSize`: inside the validation limit,
  beyond what the adapter backs) yields `E_OUT_OF_MEMORY` with `requested` / `resident`,
  and the context stays usable.
- `vendor-features.test.ts` (G4, landed): the NVIDIA adapter's feature and limit
  assertions (`subgroups` 32 / 32, `timestamp-query`, the raised limits).
- `layout-1m.test.ts` (G4, landed): the 262k and 1M ForceAtlas2 fixtures of spec 11.4 --
  the one-iteration and unbiasedness checks at 1M, the exact-vs-grid and 200-iteration
  distributional comparison at 262,144, and the 1M grid run with its `msPerIteration`.
  The 1M 200-iteration comparison is the owner's `benchmarks/layout-run.ts` run, never a
  lane's.
- `apsp-bound.test.ts` (G9): APSP exact / weighted inside the binding-size bound
  of spec 8.7 and `E_TOO_LARGE` above it.

The six G4 files are the P4 phase's (`design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md`,
Task P4-T15); their measured numbers are in the G4 record, `docs/decisions/G4.md`.

Every file follows `test/setup/gpu.ts` (`requireGpu`, a fresh adapter per device)
with `GRAPHTY_GPU_REQUIRE=nvidia`; a wrong result is never a skip.
