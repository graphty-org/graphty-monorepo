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

## Amendment 2026-09-23: the rest of the places the nightly is written into the design

The Changes line at the top of this record names design 12.6, T-13, the trigger row of 12.1 and
the cost model. Indexing the design's superseded passages on 2026-09-23
(`design/webgpu/superseded-parts-of-the-design.md`) turned up seven more places in the same
document that still rest on a nightly run. Nothing below is a new decision; it completes the list
this record should have carried, and none of these passages is edited either.

The line numbers below are the design as it stands on 2026-09-23. A note added at the top of that
file the same day pushed its body down by eight lines, so these numbers are eight higher than the
ones in the Changes line above.

- **12.3, the `gpu.yml` listing (lines 3949-4027).** The workflow is printed in full and still
  contains `schedule: [{ cron: "17 6 * * *" }]`, the `changed` cost-guard job and the
  `gpu-nightly-report` job -- the three things this record removed. It is the one place in the
  design a reader could copy the dead lane verbatim.
- **12.2 (lines 3840-3844).** Two of the cost and security controls listed there are the nightly
  skip on a quiet master and the separate `ubuntu-latest` job with `issues: write` that opens the
  tracking issue. Neither exists. Every other control in that paragraph -- the same-repo clause,
  the `gpu` label, the $50 spending limit, `concurrency: gpu-lane`, the 45-minute timeout,
  read-only workflow permissions, no secrets in the GPU job -- is unchanged.
- **14.1, risk row R-6 (line 4273)** offers "nightly skipped on quiet days" as one of its
  mitigations for the lane becoming unavailable or expensive. Its other mitigations -- the lane in
  its own workflow, the label and same-repo gating, the spending limit, fork PRs never reaching it
  -- stand.
- **14.1, risk row R-25 (line 4292)** offers "an issue only after two consecutive nightly
  failures" as one of its mitigations for shared-tenant benchmark noise. Its others -- medians of
  5 runs, the 3x threshold against the T4's own baseline, `gpu-report.js` recording clocks and
  utilisation, the T-table targets measured by hand on the dev box -- stand.
- **The Review log's applied-findings table, row VERIFY-14 (line 4615)** records the
  `gpu-nightly-report` job with `issues: write` as the change that closed the finding, and **row
  VERIFY-20 (line 4621)** records "two nightly failures before an issue" as part of its. Neither
  is buildable now. VERIFY-20's other two items, the utilisation sample and the skip on a busy
  GPU, stand.

### The 1M comparison now has nowhere to run

This part is not bookkeeping, and it is why the amendment was worth writing.

Target T-12 (line 3425) keeps the default CI lane inside its 15-minute budget by excluding the
1M-node, 200-iteration exact-versus-grid comparison of 11.4 from it, and sends that run to "the
nightly benchmark job". Risk row R-5 (line 4272) gives the same exclusion as its mitigation for
lavapipe being slow, and the Review log's applied-findings table records the split at row PERF-10
(line 4516) as "nightly for 1M". With no nightly there is no such job. The measurement is required
by the plan, is deliberately excluded from the lane that still runs, and currently executes
nowhere -- so the largest size the grid tier is designed for goes unmeasured, and nothing anywhere
fails or reports to say so.

Where that run should happen instead is a decision, and this amendment does not make it. It is
recorded as open in `design/webgpu/superseded-parts-of-the-design.md`, beside the other thing this
decision left open: what replaces "nightly GPU lane green for a week" in gate G12 of the phase
table (line 4227), which for the same reason cannot be satisfied by anyone as written.
