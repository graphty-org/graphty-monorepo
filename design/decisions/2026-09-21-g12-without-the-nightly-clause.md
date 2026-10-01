# G12 is gated on the GPU lane green on master, not on a nightly week

Date: 2026-09-21 (the decision); written 2026-09-22 with the phase it gates.
Decided by: the owner
Cited as: the old M6, M7, M8a and M8b plans of 2026-09-19 all cite this record under the name
`2026-09-19-g12-without-the-nightly-clause.md`. No such file was ever created. This is that record,
under the date the decision was taken rather than the date it was first cited, because the
directory's rule is one file per decision dated when it lands and a 2026-09-19 name would claim a
landing that did not happen. A reader following any of those four citations wants this file.
Changes: `design/webgpu/webgpu-acceleration-plan.md` line 4219, the P12 / W2 row, whose gate cell
reads "G12: stories green; nightly GPU lane green for a week; README numbers regenerated from
`benchmarks/results/`". That row is a plan of record and is NOT edited; this record supersedes its
middle clause.

## The decision

G12's middle clause is now: the GPU lane green on the master commits of the phase that claims G12.
Concretely, `gpu.yml` runs on every push to master, on `workflow_dispatch` and on a same-repo pull
request labelled `gpu`, and `release.yml`'s `gate` job waits for its run on the released commit and
refuses to publish unless it succeeded. A phase claiming G12 records the run id of the lane on its
own merge commit, the way the G0-G3 records name their runs.

Nothing else moves: "stories green" and "README numbers regenerated from `benchmarks/results/`" are
unchanged, the baseline file is still `benchmarks/results/gpu-linux-t4.json`, and `bench:compare`
still needs BOTH the median and the minimum above threshold
(`2026-09-19-bench-compare-min-confirms-median.md`).

## Why

There is no nightly GPU lane. `2026-09-19-no-nightly-gpu-lane.md` removed the `schedule` trigger,
the `changed` job and `gpu-nightly-report`; `.github/workflows/gpu.yml` says so in its own header
("there is NO nightly cron") and the root `CLAUDE.md` workflow table reads "Push to master,
dispatch, labelled same-repo PRs (no nightly)". A gate clause that names a workflow which does not
exist cannot be satisfied, cannot be falsified, and would be quietly dropped by whoever tried -- the
worst of the three outcomes, because the drop leaves no record.

## What we are giving up, and why it is acceptable

The nightly clause was asking for a WEEK of evidence, not one run, and that is a real difference: a
week of green nights is evidence that the lane is stable under environment drift, and one green run
on one commit is not. The replacement buys less.

It is acceptable because the phase G12 gates is an APP phase. Its risk is not driver drift on a
rented T4; it is whether the app's stories render and whether a real GPU settles, drags and pins on
the dev box, both of which are checked directly. The drift question belongs to the lane itself, and
`2026-09-19-no-nightly-gpu-lane.md` already weighed it and named what would reverse it.

## What would reverse this

- the GPU lane starts failing on master for reasons that are not the commit under test. One
  occurrence is not evidence; a second is; or
- a nightly (or weekly) lane is re-added, in which case this clause should read whatever the new
  schedule actually provides.

## What still exists

Every other clause of G12. The restatement that now carries them, clause by clause, is Task M7-T7
of `design/webgpu/plans/2026-09-21-webgpu-m7-graphty-app-v2.md`, and the record that answers it is
`graphty/docs/decisions/G12.md`: the app's stories green on Chromatic and deterministic run to run,
the real element on the real GPU settling, dragging and pinning on the dev box (recorded in
`graphty-element/docs/decisions/G6.md`, because the story that does it is the element's), the app's
own chip checked on the running app, a measured `minNodes` default, and the app carrying no
acceleration code beyond the one activation import.

That restatement REPLACES the W2 cell at
`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260` as the operative list for this
phase: the cell asked the app to probe, construct and inject, which
`2026-09-19-graphty-element-owns-webgpu.md` moved into graphty-element. The cell itself is a plan of
record and is left alone.

The P0-P3 plan documents still describe the three-job lane and are deliberately left alone.
