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
