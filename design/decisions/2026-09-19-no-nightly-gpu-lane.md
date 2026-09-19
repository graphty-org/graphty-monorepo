# The GPU lane has no nightly cron

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 12.6 (the nightly row, the drift
paragraph), T-13 (the tracking-issue policy), the trigger row of 12.1 and the cost model.
Those sections are NOT edited; this record supersedes them.

## The decision

`gpu.yml` runs on a push to master, on `workflow_dispatch`, and on a same-repo pull request
labelled `gpu`. There is no `schedule` trigger. Removed with it: the `changed` job, which
existed only to skip the cron when master had not moved, and `gpu-nightly-report`, which
opened a "GPU lane nightly" tracking issue after two consecutive nightly failures. The
workflow went from three jobs to one, 147 lines to 94.

## Why

The nightly re-ran a commit the lane had already judged. Since the release gate of
2026-09-18, `release.yml` waits for this workflow's run on the released commit and refuses
to publish unless it succeeded -- so every commit that reaches master already runs the lane,
and a failure already blocks the thing that matters, the publish. The nightly's remaining
job was to run the same tests on the same commit again the next morning, on a rented T4 at
roughly $0.22 a run, about $32 a month.

## What we are giving up, and why it is acceptable

This is the part a reader needs, because 12.6 argues the other way and the argument is not
wrong.

12.6 justifies the nightly as drift detection: "the partner image's driver updates are
diagnosable because every job prints the adapter description first; Playwright bumps change
the bundled Chromium (139 today) -- the nightly GPU lane catches a broken flag set". That is
a real category the release gate does NOT cover. The gate runs on commits. Environment drift
-- a T4 image driver update, a Mesa bump, a Chromium change arriving under code nobody
touched -- happens without a commit, so nothing runs and nothing reports.

So the trade is: with a nightly you learn about drift the next morning; without one you learn
at your next push, which on a quiet week could be days later, and it will look like that push
broke something it did not.

That is acceptable because the failure is contained rather than shipped. The gate blocks the
release, so drift cannot reach the registry; it costs a confusing hour, not a bad publish.
Every job still prints its adapter description first, so when it does surface the diagnosis
is one line of log. And the repository is not quiet -- master moved most days through
September 2026, so the window is usually hours.

## What would reverse this

Two things, and if either holds, re-add the cron rather than re-deriving this:

- master goes quiet for stretches of a week or more, so drift has somewhere to hide; or
- drift actually bites, and the "it looks like my push broke it" confusion costs more than
  $32 a month. One occurrence is not evidence; a second is.

A cheaper middle option, if it comes to that: a weekly `schedule` rather than a nightly, with
no tracking-issue job. Most of the detection at a seventh of the cost.

## What still exists

The whole lane, on master pushes, dispatch and `gpu`-labelled PRs, with the release gate
requiring it green. `bench:compare` keeps its rule of SKIPPING rather than failing when
`nvidia-smi` shows the GPU is busy. The `fast-check` `numRuns` of 1,000 that 14.x calls
"nightly" was never wired to the cron and is unaffected.

The P0 plan documents under `design/webgpu/plans/` still describe the three-job lane. They
are historical records of what was built in September 2026 and are deliberately left alone.
