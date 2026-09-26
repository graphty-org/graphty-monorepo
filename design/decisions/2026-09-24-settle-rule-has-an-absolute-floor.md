# The shared settle rule has an absolute floor

Date: 2026-09-24
Decided by: the owner (scope: all three force layouts, issue #97); the floor values by measurement
Supersedes: `2026-09-20-spring-electrical-settles-by-the-shared-rule.md`, in its statement of the
rule. Its reasons for ONE rule shared by every model, keyed by nothing, still stand.

## The decision

An iteration counts toward `settled` when its mean displacement is at most
`min(settleThreshold x rmsRadius, settleFloor)`. The relative half is design 7.17 as before. The
new absolute half, `settleFloor`, is in layout units. For the two spring models it is a fraction of
the model's own length unit; ForceAtlas2 writes a floor that never binds:

| Model | Length unit | Fraction | Constant |
| --- | --- | --- | --- |
| spring-electrical | `springLength` | 0.002 | `SETTLE_FLOOR_FRACTION.springElectrical` |
| Fruchterman-Reingold | `k` (default `1 / sqrt(n)`) | 0.002 | `SETTLE_FLOOR_FRACTION.fruchtermanReingold` |
| ForceAtlas2 | none | -- | `SETTLE_FLOOR_UNBOUNDED` (the largest finite f32) |

The model writes it into `Fa2Params.settleFloor` (the uniform grows from 128 to 144 bytes); K1
applies both halves. It is not an option: `settleThreshold: 0` still means "never settle by
movement", and no consumer-facing name was added.

## Why

The relative rule alone reported a spring layout settled while it was still expanding. Measured on
the RTX 4070 SUPER with `settleThreshold: 0` and the rule evaluated on the trace
(`tmp/settle-floor-candidates.ts`, a spanning tree plus n random edges, seed 42):

| Graph | Relative rule alone: settles at, rms growth over the next 1,000 | With the floor (0.002 x springLength) |
| --- | --- | --- |
| spring, story graph (150) | 489, 2.20 % | 494, 2.20 % |
| spring, 2,000 nodes | 941, 1.63 % | 2,019, 0.40 % |
| spring, 10,000 nodes | 890, 5.96 % | 3,602, 0.24 % |

0.001 x springLength moved the story graph's stop to 1,262 iterations, past the G5 gate's 1,000
(`test/layouts/se-settle.test.ts`), so 0.002 is the smallest fraction that keeps the gate.

ForceAtlas2 does not drift after the relative rule fires, and its leftover per-iteration jitter grows
with n, so every fixed floor only delays its stop, and past some size blocks it. Measured on the
same RTX 4070 SUPER and generator (settles at, rms growth over the next 1,000 iterations; the jitter
is the mean displacement over the last 200 of 3,000 iterations, in units of `sqrt(scalingRatio)`):

| Graph | Jitter | Relative rule alone | With a floor of 1 x `sqrt(scalingRatio)` |
| --- | --- | --- | --- |
| ForceAtlas2, 150 / 2,000 / 10,000 nodes | up to 0.15 | 0.00 % to 0.30 % | unchanged |
| ForceAtlas2, 100,000 nodes | 0.31 | 1,001, 0.17 % | 1,499, 0.07 % |
| ForceAtlas2, 300,000 nodes | 0.70 | 866, 0.17 % | 2,700, 0.01 % |

Every no-floor growth is far below the 1 % drift that justifies the spring floor, so a ForceAtlas2
floor buys nothing measurable and costs up to 3x the iterations (at 0.5 x `sqrt(scalingRatio)` the
300,000-node layout never settles; near 1M nodes the jitter should pass 1 unit, by the trend, so
even a floor of one unit would run those layouts to `maxIterations`). ForceAtlas2 therefore keeps
the same rule shape with `settleFloor` set to the largest finite f32, and settles by the relative
rule alone, as before this record.
Fruchterman-Reingold cools to zero displacement and stops
at its budget (50 iterations by default), so its floor, at the spring fraction, binds only a run
given a long budget; the adaptive schedule reached zero displacement by 540 iterations on every
measured graph.

## What would reverse this

A graph on which ForceAtlas2 visibly drifts after `settled` (rms growth above 1 % over 1,000
iterations) gives it a real floor; a consumer who needs a different floor per call makes it an
option, which is a public API change and its own decision.

## Iteration counts that moved

The G5 story graph under the spring preset (`test/layouts/se-settle.test.ts`): 496 iterations on the
RTX 4070 SUPER as before, 488 on lavapipe (480 before). `docs/decisions/G5.md` row 4 records the old
counts.

## Amendment (2026-09-25): the spring floor scales with node count

The fixed floor of 0.002 x `springLength` also bound the 150-node story graph, where the relative
rule had been deciding alone, and nearly doubled the grid tier's settle there: 832 iterations on the
RTX 4070 SUPER and on Apple Metal (the relative rule alone on the same kernels: 648 on the RTX 4070
SUPER), and the 1,000-iteration cap on Dawn over D3D12 WARP. The grid tier's jitter on that graph
sits right at the relative threshold, so any floor below it adds hundreds of iterations. A
reader waits for that stop on every small graph, and small graphs are not where the drift is.

The spring-electrical floor is now `0.003 x springLength x (2000 / n)^(1/4)`
(`SETTLE_FLOOR_FRACTION.springElectrical`, `SETTLE_FLOOR_REFERENCE_NODES`). A spring layout's rms radius
grows about as n^(1/4) in spring lengths (3.4 at 150 nodes, 6.4 at 2,000, 10.4 at 10,000), so the
relative half loosens with size exactly where this floor tightens: at 150 nodes the floor is 0.0057
spring lengths, above the relative threshold of about 0.0034, and the relative rule decides alone as
it did before this record; at 2,000 and more the floor binds. Fruchterman-Reingold keeps 0.002 x `k`,
whose `k` already falls as 1 / sqrt(n).

Measured (settles at, rms growth over the next 1,000 iterations; the story graph from the tests, the
larger graphs from the recorded traces of `tmp/settle-trace.ts` evaluated per rule):

| Graph | Adapter | Before this record (relative rule) | Fixed floor 0.002 | This amendment |
| --- | --- | --- | --- | --- |
| spring grid, story graph (grid-law.test.ts) | RTX 4070 SUPER | 560 (old kernels) | 832 | 648 (= relative rule alone on these kernels) |
| spring grid, story graph (grid-law.test.ts) | lavapipe | 568 (old kernels) | 648 | 576 (= relative rule alone) |
| spring exact, story graph (se-settle.test.ts) | RTX 4070 SUPER / lavapipe | 496 / 480 | 496 / 488 | 496 / 480 |
| spring exact, 2,000 nodes (issue #97, se-settle.test.ts) | RTX 4070 SUPER | 941, 1.63 % | 2,019, 0.40 % | 1,624, 0.60 % |
| spring exact, 2,000 nodes (issue #97, se-settle.test.ts) | lavapipe | 955, 1.81 % | 2,254, 0.26 % | 1,536, 0.72 % |
| spring exact, 10,000 nodes (trace) | RTX 4070 SUPER | 890, 5.96 % | 3,602, 0.24 % | 3,521, 0.29 % |
| spring exact, 10,000 nodes (trace) | lavapipe | 895, 5.91 % | 3,854, 0.09 % | 3,848, 0.10 % |

Every graph that grew more than 1 % under the relative rule alone grows less than 1 % after the
amended stop. The rest of the gap on the grid story graph (648 against 560 on the RTX 4070 SUPER) is
the grid kernels' own change in this pull request (the far-field distance floor and the per-orthant
outside cells), not the settle rule.
