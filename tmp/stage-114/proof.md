# Stage 114: zoom-to-fit without a row walk under renderPath "batched"

Refs #6389. Branch feat/6389-stage-114-gap-fit-without-row-walk.

## What changed

- `LayoutEngine.publishColumn` measures the box of the rows it writes (a kept pinned or held row counts where it is
  kept) inside its existing loop; `publishedBounds()` (@internal) returns it from ngraph and the simulation engines
  (the GPU spring-electrical driver included), null from others or from an engine holding rows outside its publish.
- `RowTable` keeps `hiddenRows` (counted as rows hide, show, drop; recounted at a freeze) and `widestHalf`.
- `UpdateManager.measure` first tries `envelopeFraming`: only under renderPath "batched", with a layout running and not
  settled, no forced framing, no node drawn as an object, no hidden row, no layout transition. Otherwise the old walk.
- renderPath "objects" is untouched: `envelopeFraming` returns undefined unless `renderLimits.batched()` is true.
- Design note added to design/rendering/row-renderer.md section 4.5: the stage text asked for a GPU reduction for the
  GPU layout; none is needed, because every frame-stepped engine publishes through `publishColumn`.

## Test first

`test/browser/batched-fit-envelope.test.ts` counts `Node.framingBounds` and `RowTable.isHidden` calls per moving
framing (200-node chain, ngraph running). Before the change: `expected [ 200, 200, 200 ] to deeply equal [ 0, 0, 0 ]`.
After: passes (0 rows per framing under batched; the framed box holds every node; objects still walks >= 200).

## Checks run (all through tools/low-priority.sh)

- `npx tsc --noEmit -p tsconfig.json` (graphty-element): clean.
- `npx eslint` on the 5 changed source files and the new test: clean.
- `nx run graphty-element:build --skip-nx-cache`: success. `npm run api:report`: two @internal LayoutEngine members
  added to api/extend.api.md and api/index.api.md (additive), committed.
- vitest: batched-fit-envelope, node-batch, row-table-shadow, UpdateManager.zoomToFit, object-roster,
  simulation-layout-engine (browser) 134/134; UpdateManager, simulation-envelope, ngraph-parallel-edges,
  ngraph-settle-budget 31/31; cost-coverage and jsx-types 11/11; re-run after the last refactor 221/221.
- `node tools/sonar-gate.mjs`: no new issue on changed lines (publishColumn cognitive complexity brought back to 15).

## Target against measurement

Harness: benchmarks/compare (RUNBOOK.md sections 1-3), `BENCH_RENDERER=webgpu BENCH_RENDER_PATH=batched`, paced layout
frame (`layoutFps` median), RTX 4070 SUPER, every run under `flock tmp/cosmos-impl/gpu-bench.lock`. Base is this
branch's merge base 2d89fc3c4c (master), built in a detached worktree; both pages built from the same compare package
and served through servherd. Runs interleaved base/branch in one session. Driver: tmp/stage-114/bench.sh. 100k + 1k
has no matrix key, so it ran as `run.mjs graphty lean on 100000 1000 1 no-still`.

| Configuration              | master 2d89fc3c4c (3 runs)  | this branch (3 runs)       | Target    | Met |
| -------------------------- | --------------------------- | -------------------------- | --------- | --- |
| 100k + 1M (lean-m-tail)    | 384.2, 374.7, 375.1 ms      | 119.6, 104.6, 106.0 ms     | <= 90 ms  | no  |
| 100k + 1k                  | 207.5, 217.8, 209.8 ms      | 30.9, 33.6, 31.6 ms        | <= 20 ms  | no  |
| 10k + 100k (lean-s)        | 42.7, 41.7, 59.1 ms         | 20.1, 20.3, 19.6 ms        | (before/after only) | -   |
| framing per layout frame   | (walk: ~200 ms at 100k)     | 0.016-0.022 ms (profiled)  | < 2 ms    | yes |

One-minute load average across the runs: 2.1 to 18.4 (each run's before/after load is in the bench output; the
heaviest, 18.4, was after a branch lean-s run; base lean-s run 3, 59.1 ms, started at 9.4).

On master the 100k + 1M layout frame was so slow that the 30 s stage fit only 73-80 frames (n=200 on the branch).
The base numbers here are higher than the 239 ms in tmp/cosmos-profile-3/comparison.md; they are compared only with
the branch numbers taken in this same session.

Framing time comes from one more branch run of each with `BENCH_PROFILE_TIMED` (own results file), summed with
tmp/stage-114/prof.mjs over the 200 timed layout frames: `envelopeFraming` 4.3 ms total at 100k + 1k and 3.2 ms at
100k + 1M, i.e. about 0.02 ms per frame, with no per-row work. `framingBounds` still shows 173-201 ms in each profile;
averaged that is about 1 ms per frame, which is the size of one full 100k walk, consistent with the single framing
walk that still runs outside a moving layout (the framing the layout settles on, or a forced one).

Why the millisecond targets are missed: at 100k + 1M the profiled CPU is about 28 ms per frame against a 105-120 ms
frame, so that frame is GPU-bound and the rest is drawing and the layout step, not framing. At 100k + 1k the CPU is
about 27 ms per frame and now dominated by the publish path (`publishColumn` 3.0 ms/frame, `nodesMoved`, `noteMoved`,
`repackRow`, row index lookups), not framing. Both are outside this stage. Parity on the objects path is unchanged
(the walk still runs there; see the counted test).
