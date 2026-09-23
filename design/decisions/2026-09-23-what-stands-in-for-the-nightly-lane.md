# What stands in for the nightly lane: a gate clause and the million-node comparison

Date: 2026-09-23
Decided by: the owner, who delegated both calls after being shown them
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 13, the gate cell of row P12
(the G12 clause "nightly GPU lane green for a week"); target T-12 and risk row R-5 of
section 14.1 and the Review log's row PERF-10, all of which send the 1M exact-versus-grid
comparison to the nightly benchmark job. Those passages are NOT edited; this record
supersedes them. It closes the two questions
`design/webgpu/superseded-parts-of-the-design.md` opened.

## Why there were two questions

`2026-09-19-no-nightly-gpu-lane.md` removed the cron for good reasons, and its own amendment
of today lists everything that leaned on it. Two of those things were not bookkeeping: they
asked for work to happen somewhere, and that somewhere stopped existing. A gate could not be
met by anyone, and a measurement the plan requires ran nowhere.

**The nightly is not coming back.** It was removed deliberately and the owner has said again
that it stays removed. Neither decision below reintroduces a schedule trigger, and neither
should be read as a step toward one.

## Decision 1: gate G12 asks for three consecutive green master runs

The clause "nightly GPU lane green for a week" becomes:

> the GPU lane green on three consecutive runs on master, the benchmark comparison included
> in each.

The clause was never about the night. It asked for evidence that the lane is stable over
time rather than lucky once, and a week of nightlies was how that was spelled when a nightly
existed. Consecutive master runs are the only repeated evidence the surviving lane produces,
and there is a reason to prefer them to what they replace: a nightly re-ran one commit, so a
week of them was one commit judged seven times, while three master runs are three different
commits. The evidence is broader, not merely differently spelled.

Three rather than five or ten because the lane is the release gate: a fourth run is not free,
it is a merge somebody has to make, and a clause that takes a fortnight of ordinary work to
satisfy will be waived rather than met.

"The benchmark comparison included" is doing real work and is not a flourish. A bare pass or
fail would have let the PageRank regression of 2026-09-22 through -- the suites stayed green
while the number doubled. The comparison against the pinned baseline is what catches drift of
that kind, so the clause names it.

## Decision 2: the million-node comparison runs on a deliberate dispatch, and gates the tier

The 1M-node, 200-iteration comparison of exact against grid (section 11.4) runs as a
`workflow_dispatch` of `gpu.yml` that runs the comparison INSTEAD of the suites, not beside
them. It is required by the gate of any phase that changes the grid tier, the exact tier or
the crossover between them, and its numbers are recorded in that phase's gate record.

It cannot go in the ordinary lane. That lane already runs 33 to 40 minutes and this would add
to the longest step it has; the runner has been terminated mid-benchmark before, and the
comparison is the one measurement in the plan most likely to be the thing cut off. Running it
alone, on purpose, fits in a fraction of the budget and reports a number nobody has to hunt
for in a 40-minute log.

Tying it to the phase gate rather than to a calendar is the point. The comparison answers
"does the grid tier still beat the exact tier at the size it exists for", and that answer can
only change when the tiers or their crossover change. A nightly would have re-answered it
every morning on code nobody touched; a phase gate answers it exactly when it can have moved.
The existing precedent is already this shape: the comparison's only run to date was made
deliberately on the development box and its numbers were written into the gate record.

## What we are giving up

Between one phase and the next, nothing measures the largest size the grid tier is designed
for. If a change elsewhere -- a primitive, a scan, a memory layout -- quietly costs the grid
tier its advantage at a million nodes, we learn at the next phase gate rather than at the
commit. That window was previously a night; it is now a phase.

This is accepted rather than overlooked. The size below it is measured on every lane run, so
a large regression will show there first; what escapes is a regression that appears only at
the top of the range, and the phase gate is the place it will be caught.
