# Full testing in CI, a light gate on this machine

Status: Built, not yet switched on, 2026-10-23. Issue #3316; decision record
`design/decisions/2026-10-23-full-tests-in-ci-adopted.md`. It supersedes the parts of
`design/ci/golden-local.md`, `design/ci/fast-pipeline.md` and `design/ci/minimal-tests.md` that run the
full test suite on this machine; each of those documents marks the superseded sections. One switch turns
it all on: `node tools/verify.mjs backend ci`. Until then the backend is `local` and the tools follow
those documents. As built, `PREPUSH_LIGHT` defaults to `0` in `tools/prepush.sh`, and `tools/land.mjs`
sets it to `1` for its pushes only while the backend is `ci`, so the gate turns light exactly when CI
verification is on and never before it (section 9's order, enforced by one setting).

The owner's request (2026-10-23): "replace our local full-test gate with a lighter test that is
lint, build, sonarqube, and gpu and put our full testing in CI. make sure our plan ends up being
more efficient than our current plan."

Words used throughout:

- **golden** is the integration branch every change lands in before master (`tools/land.mjs`).
- **the gate** is `tools/prepush.sh`, run by `tools/push-queue.sh` for every push and landing.
- **the light gate** is the gate with its test stage and its own screenshot capture switched off.
- **verification** is `tools/verify.mjs`: it tests golden's newest commit after landings, moves
  the ref `golden-verified` when that commit passes, and bisects a failure to the landing that
  caused it.
- **the cut** is the golden commit chosen for master (`golden-cut`), opened as a pull request
  whose screenshots the owner approves; `land.mjs ship` marks it ready and GitHub merges it when
  its CI run passes.
- **a full CI run** is `ci.yml` with every package affected: Build, Lint, Checks, Docs, Links, cost
  accuracy, all 36 test shards (about 25 test jobs, with coverage thresholds) and the screenshot
  captures of 7 Storybooks.

## 1. The problem

Testing is the slowest part of getting a change to master, and the slowness is on this machine.
Measured from `tmp/push-log.jsonl` (7 days, 2026-10-16 to 2026-10-23) and the GitHub runs of the cut
pull request (data and scripts in `tmp/ci-full-testing/ci-vs-local/`):

| Stage                                    | Median today (wait + run) | Notes                                      |
| ---------------------------------------- | ------------------------- | ------------------------------------------ |
| Land check (gate on the merged branch)   | 32.3 min (7.7 + 24.6)     | p90 gate 99.2 min                          |
| Verification of golden (full local gate) | 80.9 min (8.9 + 72.0)     | p90 129 min; with a bisect, 143 min median |
| Cut gate (golden-cut push)               | 68.9 min (6.6 + 62.3)     | full gate, measured from master            |
| Ship: ci.yml on the cut pull request     | 31.4 min                  | run 40001752903                            |
| **Desktop to master**                    | **213.5 min**             | owner review time excluded                 |

- **The full suite is faster in CI than here.** CI finishes the full suite's tests in 23.1 min and
  All Checks Pass in 31.4 min (Build 6.0 min, about 25 test jobs in parallel, the slowest 16.9 min,
  the graph-io fidelity screenshots the tail). The same suite on this machine takes 34-58 min alone
  and 87-185 min when 3-8 gates overlap (load average 44 on 32 threads on 2026-10-23, 4 test slots,
  4 browser slots). One shard alone is 2-4x faster here for Node and about 1.5x for browser shards,
  but this machine cannot run 25 shards at once and GitHub can.
- **The machine is saturated.** Gates used 118.2 gate-hours in 7 days, 16.9 a day: golden pushes
  63.1 h, land checks 23.7, cut gates 13.4, verification 11.6, bisect 6.4. Verification and bisect
  take 1-2 of the queue's gate slots, which caps landings at 20-30 a day.
- **The full suite runs three times per shipped commit**, in two environments that fail
  differently: the land check, local verification, and ship's CI run. About 19 of 22 local failures
  in tier-3 work never appeared in CI. Only 43% of gates over 10 minutes passed.
- **GitHub is not the limit.** The organization is on GitHub Team: 60 concurrent Linux jobs and
  5 macOS jobs, shared by everything. Runner waits are seconds. Standard runners cost nothing on a
  public repository. A full CI run is 43 jobs and 313 runner-minutes with a peak of 31 jobs at once
  (run 40001752903).

## 2. The design in one paragraph

Every push and landing runs a light gate here: the source-only checks with SonarQube on changed
lines, the affected build, knip, lint with type-check, the cheap deterministic checks (published
dependencies, API docs, the docs site when docs change, bundle sizes, the API report), and the
NVIDIA GPU tests when webgpu-graph-algorithms is affected. No test shard and no screenshot capture
runs in the gate. Verification moves to CI: `tools/verify.mjs` points a scratch ref,
`golden-candidate`, at golden's newest commit; a small workflow triggered by that push calls
`ci.yml` as a full run, exactly as the release train does; `verify.mjs` reads the result and moves
`golden-verified` on green, as it does today. Cut and ship keep reading `golden-verified`, so they
do not change. A red run is confirmed, bisected to its landing and reverted by the pipeline round,
as today. Master stays exactly as protected: the cut pull request's own full `ci.yml` run, with the
owner's screenshot gate, is still the required check.

## 3. The flow, step by step

### 3.1 Landing: the light gate

`node tools/land.mjs land <branch>` is unchanged in shape: the check worktree, the dry-run push
through `tools/push-queue.sh`, the short lock, the reused pass on the real push, then `announce()`.
The gate it runs is light. `tools/prepush.sh` gets one switch, `PREPUSH_LIGHT`, default `1` for
every push on the machine (land checks, golden pushes, cut, cut-fix and ordinary branch pushes):

1. The source-only checks (`tools/prepush-source-checks.sh`, unchanged, about 2 min): formatting,
   the config and tool checks, offline links, the CI workflow tests, and SonarQube on changed lines
   (45-60 s). SonarQube stays here because its server is reachable only on the owner's network.
2. The lint-configuration drift check, the nx build of the affected packages (`--parallel=3`) and
   the webgpu-graph-algorithms bundle.
3. knip, and knip in production mode.
4. nx lint of the affected packages, which includes the type-check.
5. Published dependencies, API docs of the affected packages, the docs site when docs are affected
   (about 3 min), graphty-element's and cytoscape-extensions' bundle sizes and the public API report.
   They stay: they are deterministic, they caused 20 of 52 failed gates, and doc errors that only
   CI caught have twice stopped a merge.
6. The NVIDIA GPU tests (`npm run test:run` in webgpu-graph-algorithms, `GRAPHTY_GPU_REQUIRE=nvidia`,
   on the one GPU slot) when webgpu-graph-algorithms is affected. Only that package's tests use the
   card, and CI runs the software-GPU shards (Dawn on lavapipe, Chromium on SwiftShader) for every
   other change. The paid T4 still runs only on the release train.
7. The LFS upload of the pre-push hook, unchanged.

Not run: the test stage (`tools/prepush-tests.mjs`) and the gate's background screenshot capture
(`visual-preview.sh --head`). The gate holds no CPU test slot and no browser slot. `PREPUSH_LIGHT=0`
runs today's full gate, by hand or for the explicit local fallback (section 3.7). `PREPUSH_LIGHT` is
part of the gate key, so a light pass never stands in for a full one, or the other way round.

An author who wants test signal before landing runs `pnpm run test:changed` or
`./tools/run-tests.sh <shard>`; that is advice, not a gate. CI is the enforced test.

### 3.2 Verification: the full suite in CI

`announce()` still calls `requestVerification` after every landing, and `verify.mjs` keeps its
state machine (`tmp/golden/verify.json`, the `wanted` commit, one live run, failed-known, confirm,
bisect, the pipeline round as watchdog). Only its gate changes, from `defaultGate` (the full local
gate) to `ciGate`:

1. **Yield.** Before starting a run, `ciGate` reads `tmp/pr-status/status.json` (the status broker,
   free) for an in-progress run on the cut pull request, and makes one REST call
   (`gh run list --workflow release.yml --status in_progress -L 1`) for a release train. If either
   is running, it starts at the first 5-minute poll after it ends. This keeps verification from
   being the third full suite at once. It waits on an event, not a deadline.
2. **Push.** `git push --no-verify --force origin <sha>:refs/heads/golden-candidate` from the main
   checkout (`golden-cut-candidate` when verifying `golden-cut` after a cut-fix), the same pattern
   `verify.mjs` uses to move `golden-verified` today. The refs have no ruleset; golden's own gated
   push already uploaded the commit's LFS objects. The push uses the owner's token, so it starts
   workflows.
3. **Run.** The new workflow `.github/workflows/golden-verify.yml`:
    - `on: push: branches: [golden-candidate, golden-cut-candidate, golden-bisect-1, golden-bisect-2]`.
      A push-triggered workflow runs the pushed commit's own workflow file, so it works as soon as it
      is on golden, before any cut reaches master. The two `golden-bisect-*` refs carry CI bisect
      points (section 3.5) until the `workflow_dispatch` route works, which needs the file on master.
    - `concurrency: { group: golden-verify-${{ inputs.ref || github.sha }}, cancel-in-progress: false }`.
      The group is the commit, the same for a push and a dispatch (whose `ref` input is the commit),
      so two bisect points run side by side and a pushed and a dispatched run of one commit queue in
      one group. GitHub keeps one running and one pending run per group and a newer pending run
      replaces an older one. This only backs up `verify.mjs`, which starts a new run only when its
      current one ends.
    - One job, `verify`, named `Verify`, that `uses: ./.github/workflows/ci.yml` with
      `ref: ${{ github.sha }}` and `verify: true`, `secrets: inherit`, and permissions
      `contents: read, actions: read, checks: write` (release.yml's settings).
    - The called run is a full run (the Plan step change in section 8), so it runs every shard with
      coverage and quarantine, Lint, Checks, Docs, Links, cost accuracy, the lifecycle shard and the
      captures. The `verify` input skips the Performance benchmarks, which gate nothing.
    - Every check is named `Verify / <job>`, so its `Verify / All Checks Pass` can never satisfy
      master's required `All Checks Pass`, even though the cut pull request's head is often this
      same commit. This is the same reason the release train's call cannot.
    - The draft, early-verdict, visual-gate and master-reference steps run only on `pull_request`
      events, so none run. master-guard, deploy-pages and release filter on master pushes, so none
      react. The visual job and the gate step are not edited.
4. **Result.** The detached `verify.mjs run` process, never a model turn, checks every 300 s:
    - when the commit is golden's tip, from the broker file (the golden pull request's head is
      golden's tip, and its rollup includes every check on that commit), at no API cost. Never for a
      bisect point (the broker may show an older run of that commit), and never a green for a commit
      that already failed in CI: the broker cannot tell a full attempt from a re-run of the failed
      jobs, so that green is read from GitHub;
    - otherwise, or when the broker has no answer or is stale (`fetchedAt` old or `error` set), with
      one REST call: `actions/workflows/golden-verify.yml/runs?head_sha=<sha>`, taking only a run on
      the ref the commit was pushed to (`head_branch`; the same commit may be a point on another
      scratch branch), or, once dispatched, the run whose name carries the commit. While the run is
      in progress, a second call reads its jobs, for the fail-fast below.

    **No run for the commit** is a state of its own. GitHub sometimes accepts a push and creates no
    run: `ci.yml`'s comment records it twice on master (4ca5f8a and 756117b reached the remote with
    zero runs). The push and the lookup both succeed, so no CI-unavailable trigger fires. No event
    reports a run that was never created, so the poll is the signal: when a poll finds the ref at
    the commit and zero `golden-verify.yml` runs for it, `verify.mjs` records `noRun` (the commit,
    the ref, the attempt) in `verify.json`. Pushing the same commit again starts nothing, because
    an unchanged ref makes no push event. Recovery changes the ref: `verify.mjs` deletes it
    (`git push origin :refs/heads/<ref>`) and pushes it again, which GitHub sees as a new branch and
    a new push. Once `golden-verify.yml` is on master it dispatches instead
    (`gh workflow run golden-verify.yml -f ref=<sha>`, one call). A late run is matched by head
    commit like any other, and the newest counts. A second no-run for the same commit sets the
    CI-unavailable state (section 3.6). Until then `verify.mjs status` and `land.mjs status` print
    "no CI run created for <sha>, attempt N" and the pipeline round reports it, so
    `golden-verified` never stops moving without an alarm.

    It ends on the run's own completion:
    - **success** returns code 0; `publishRef` moves `golden-verified`, as today. The run is judged
      as it judges itself: a green `Verify / All Checks Pass` is a success even when the run reports
      failure for a `continue-on-error` job (the `visual (<project>)` captures, a job in its advisory
      period), and such a job's failure is never a `[FAIL]` line. Only a full attempt verifies: a
      green later attempt in which some jobs kept an earlier attempt (`gh run rerun --failed`) is no
      verdict, and `verify.mjs` starts a new full run of the commit instead;
    - **failure** fails fast: as soon as any `Verify / Test (...)`, Build, Lint, Checks or Docs job
      has failed, it fetches the run's jobs list (one call) and builds an output with one
      `[FAIL] <shard>` line per failed test job (a grouped `small-node` or `small-browser` job expands
      to the members it names as failed) and a `[FAIL] <job>` line for any other failed job, so
      `failingShards()` and the ledger facts work unchanged; section 3.5 follows;
    - **cancelled** by GitHub's concurrency returns `[SUPERSEDED]`, and the newer commit is verified.

    A green verdict takes the whole run (31.4 min), because All Checks Pass waits for the visual job
    and that job may not be edited. Reading the per-job checks for an early green at about 23 min is
    a later optimization, not in this plan.

After every landing, each golden tip still builds, lints, type-checks and passes SonarQube and the
GPU tests (the light gate). Its tests are checked about 37 min later on average, against 81 today.

### 3.3 Cut and ship

Unchanged in code:

- `land.mjs cut` picks the newest commit on `golden-verified` with a stable screenshot preview, and
  pushes `golden-cut` through the light gate (base master). That commit is already verified, so
  verification of `golden-cut` passes at once (`verify.mjs` already does this).
- `land.mjs cut-fix <branch>` merges the fix into `golden-cut`, pushes it through the light gate,
  and requests verification of the new `golden-cut` head, which runs on `golden-cut-candidate`.
- `land.mjs ship` refuses until the cut's head is verified, then marks the cut pull request ready
  with auto-merge. `ci.yml` runs its full affected suite on it with the visual gate; green merges.

So the full suite runs twice in CI per shipped commit (verification, then ship). Reusing the
verification run on the cut pull request would need the visual gate's capture download, an
owner-protected step, to read another run's artifacts. That is left to the owner (section 10).

### 3.4 Screenshots

Unchanged for the owner. `announce()` still starts the local preview of the golden pull request
after each landing, and the owner still reviews it and signs on the cut pull request, whose `ci.yml`
run is the only one that applies the visual gate. The light gate drops only its own background
capture, a second capture of the same commit that cost 7-55 min of browser slots per gate.
Verification runs also upload captures of all 7 Storybooks, ungated; they approve nothing. Nothing
under `visual-baselines/`, `visual-review-approvals/` or `visual-review/trusted/`, and neither the
visual job nor the gate step of `ci.yml`, changes.

### 3.5 Failure handling and bisect

| Failure                                                                            | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light gate fails on a land check                                                   | Exit 3 as today; golden unchanged; fix on the branch and land again. A retry costs minutes, not an hour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Verification red, same failure as the previous run                                 | failed-known, as today: no new bisect, the failure is commented on its issue, `golden-verified` stays, later tips are still verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Verification red, a test shard                                                     | `verify.mjs` downloads the failing shards' JUnit artifacts (2 calls) for the exact failing files, then runs only those files here at the failing commit, up to 5 times (`CONFIRM_RUNS`), in `.worktrees/golden-bisect-<n>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ... fails 5 of 5 here                                                              | The existing local bisect over the `land:` merges since `golden-verified` (2 points at a time, failing files only) names the culprit; the pipeline round reverts it at once with `land.mjs revert`, as the fast pipeline already decided                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ... fails some runs here, passes others                                            | Intermittent: the existing test-ledger rules decide. Already failing before the range: quarantined (`tools/test-quarantine.mjs`, a `priority:critical` issue, because a load-sensitive test is a critical defect), never reverted. Newly intermittent: bisected as a regression. Either way `golden-verified` does not move on this run; it moves only when a later verification passes, never by re-running until green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ... passes 5 of 5 here (a CI-only failure)                                         | `ciGate` re-runs the failed jobs once (`gh run rerun <id> --failed`). Fails again: confirmed; CI bisect (below). Passes: the same as flaky above, quarantine and a new verification; `golden-verified` does not move on this run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CI-only failure, bisect                                                            | Each bisect point is pushed to `golden-bisect-1` or `golden-bisect-2`, both push triggers of `golden-verify.yml` (section 3.2), and run in CI. Until `golden-verify.yml` is on master each point is a full run (31 min, one point at a time); once it is, points are dispatched with a `shards` input and run Build plus the failing shards only (about 23 min, 2-3 jobs, 2 points at a time). A push runs the pushed commit's own copy of the workflow, so until then a point whose tree lacks `golden-verify.yml` (and the last verified commit, when it does) gets no CI run: it is judged here instead, its failing shards' files through the local gate, never pushed (a missing run would read as CI being unavailable), and its evidence records `judgedLocally` with the reason. A CI-only failure passes here by definition, so such a point counts as good: the culprit can be no older than the first commit that has the workflow, and its evidence shows which points were judged here. When some failures reproduce here and others only in CI, the bisect runs in CI and follows both |
| The last verified commit fails too                                                 | An environment change, not a landing (runner image, outside service, date). Nothing is reverted; one `bug`, `priority:high` issue; cuts wait until it is fixed forward or quarantined, because nothing reaches master with known errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Verification red, a non-test job (Build, Lint, Checks, Docs, Links, cost accuracy) | Bisect points run the light gate with `PREPUSH_ALL=1` (every package's build, lint, knip, docs and API report, no tests), which reproduces those jobs here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Run lost: startup_failure, runner lost, 5xx, no failed job                         | Not a test verdict: one `gh run rerun`. A second loss sets the CI-unavailable state (section 3.6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Cut pull request's CI red                                                          | As today: a difference from the verified run (a newer master, or the merge tree). Fix or revert; the pull request goes back to draft                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Red master build                                                                   | `master-guard.yml`, unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

A failure is reproduced and explained before anything is called a flake, and no test is retried
until it passes.

### 3.6 When CI is down

`verify.mjs` sets `ciUnavailable` (with the time and the cause) in `tmp/golden/verify.json` when the
push or the run lookup fails for a reason other than a rate limit (a 403 rate limit only waits for
the reset that `gh api rate_limit` names), when a run is lost twice (`startup_failure`, or failed
with no failed job), or when a commit gets no run twice (the no-run state of section 3.2). Only then
is githubstatus.com's public components API (not part of the GitHub API budget) consulted: while it
reports Actions not operational, that look does not retry the run (an unreachable status page counts
as operational). While it is set:

- `land.mjs status` and `verify.mjs status` print "CI verification unavailable since <time>,
  N landings unverified"; the pipeline round raises one `priority:high` issue;
- landings continue through the light gate;
- `golden-verified` does not move, so no cut is offered; master cannot change anyway, because the
  cut pull request's required check cannot pass without CI.

It clears on its own event: a run that starts, tried at each landing, each pipeline round and each
5-minute poll while githubstatus.com reports Actions operational. There is no deadline.

### 3.7 The explicit local fallback

`node tools/verify.mjs backend local --reason "<text>"` switches the gate to `localGate` (today's
`defaultGate`: `PREPUSH_LIGHT=0 PREPUSH_ALL=1`). It records `verifiedBy: local` and the reason in
`verify.json`, and `land.mjs` writes it into the golden pull request's description.
`backend ci` switches back. It is never automatic: no silent fallback. A locally verified commit
still needs the cut pull request's CI run to reach master.

## 4. Efficiency against the current pipeline

Today's figures are 7-day medians from `tmp/push-log.jsonl` (2026-10-16 to 2026-10-23); CI figures
are from run 40001752903. Figures marked GUESS are estimates: the gate logs carry no per-step times,
so the light gate's duration is built from measured parts and will be measured in its first week.

| Measure                              | Today                                                            | New                                                                       | Change      |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------- |
| Desktop to golden (land check)       | 32.3 min (7.7 wait + 24.6 gate; p90 gate 99.2)                   | about 11 min (GUESS: 10 light gate + 1 slot wait)                         | 2.9x faster |
| Golden to verified                   | 80.9 min (8.9 + 72.0; p90 129)                                   | 37.4 min typical (31.4 + 2.5 + 3.5), 67.8 worst                           | 2.2x faster |
| Cut gate                             | 68.9 min (6.6 + 62.3)                                            | about 10 min (GUESS, light gate, nx cache warm)                           | 6.9x faster |
| Ship (cut pull request CI)           | 31.4 min                                                         | 31.4 min                                                                  | same        |
| **Desktop to master**                | **213.5 min** (32.3 + 80.9 + 68.9 + 31.4)                        | **89.8 min** (11 + 37.4 + 10 + 31.4)                                      | 2.4x faster |
| Gate time on this machine            | 16.9 gate-hours a day (118.2 h / 7)                              | about 5.2 (28.3 light gates a day x 10 min = 4.7 h, + 0.5 h bisect GUESS) | 69% less    |
| Full-suite runs on this machine      | land check + verification + cut gate (about 115 min vitest each) | none (failing files only, after a CI failure)                             | all gone    |
| Full-suite runs per shipped commit   | 3 (land check, local verification, ship CI), 2 environments      | 2 (CI verification, ship CI), 1 environment                               | one fewer   |
| Test and browser slots held by gates | up to 4 + 4                                                      | 0 (the GPU slot only when webgpu-graph-algorithms is affected)            | freed       |
| CI jobs a day                        | about 1.7 ship runs + up to 4 release trains                     | + at most 413 jobs, 3,005 runner-minutes (9.6 runs x 43 jobs, x 313 min)  | free        |
| GitHub REST calls an hour            | (broker unchanged)                                               | + under 1 typical, at most about 29                                       | 0.58% max   |

The arithmetic:

- **Golden to verified, typical**: 31.4 min (the full run) + 2.5 min (half of the 5-minute poll) +
  3.5 min of waiting behind an in-flight run. 9.6 runs a day x 31.4 min / 1,440 min = 21% of the
  day busy; an arrival waits on average half a run, 15.7 min, so 0.21 x 15.7 = 3.3, rounded to 3.5.
  Worst: a full run in flight plus its own run plus one poll, 2 x 31.4 + 5 = 67.8.
- **Runs a day**: 67 passed golden pushes in 7 days = 9.6 a day; coalescing makes it fewer.
- **Light gates a day**: (186 landing-related gates + 12 cut gates) / 7 = 28.3.
- **Light gate, about 10 min (GUESS)**: about 2 min of source checks (measured header estimate) +
  about 3 min of docs site when docs are affected (measured) + 4-6 min for the affected build, knip
  and lint (CI builds every package in 6.0 min and lints every package in 8.0 min; this machine is
  2-4x faster per job and builds only what is affected). The plan holds even if it is 30 min:
  32.3 -> 31 and 68.9 -> 30, and desktop to master is 30 + 37.4 + 30 + 31.4 = 128.8 < 213.5.
- **Slot wait, about 1 min (GUESS)**: 28.3 gates x 10 min = 283 gate-minutes a day across 4 slots
  and 1,440 minutes, about 5% use.

## 5. Budgets

**Concurrent jobs (60 Linux, shared by everything).** A full run peaks at 31 jobs at once.

- Only one verification run is ever in flight (one live `verify.mjs run`, plus the concurrency
  group).
- The yield rule (section 3.2) starts verification only when no cut run and no release train is
  running, so verification starts beside at most other work, not beside two full runs.
- A cut run or a release train that starts while verification runs gives 31 + 31 = 62 at the peaks,
  only if both peaks fall in the same 4-minute window (6.3-10.7 min into each run). Then 2 jobs
  queue for about the shortest test job, 1.4 min (GUESS).
- A cut run and a release train both starting during one verification gives up to 93: about 33 jobs
  queue for about one test job's length, about 10 min (GUESS; rare, 4 trains a day).
- A queued job is a slowdown, never a failure. Past 10 minutes of measured queue time,
  `ci-cd-plan.md` section 13 applies: larger runners for the heavy jobs only. This machine is never
  a runner.

**macOS (5 jobs).** Unchanged: verification runs no macOS job.

**GitHub REST API (5,000 an hour, shared).**

- While the commit is golden's tip, results come from the broker file: 0 calls.
- Otherwise 2 calls per 5-minute poll while the run is in progress (its runs and its jobs), 1 once
  it has ended: at most 24 an hour while a run is in flight.
- 1 release-train check per run started: about 10 a day.
- On a failure: 1 jobs list, 1 JUnit artifact download per failed test job, 1 annotations read per
  failed group job, at most 1 rerun. A green later attempt adds 1 jobs list.
- CI bisect: 1 dispatch or push per point and its polls; about 0.2 a day (GUESS).
- Worst hour about 29 calls, 0.58% of the budget. Pushes to `golden-candidate` are git, not API.
  The broker is unchanged (one GraphQL query a minute).

## 6. What stays local, and why

| Check                          | Why it cannot move to CI                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| SonarQube on changed lines     | Its server is reachable only on the owner's network                 |
| NVIDIA GPU tests               | This machine is never a CI runner; the paid T4 runs only at release |
| The owner's screenshot preview | The owner reviews before anything is offered to master              |
| Bisect of failing test files   | Minutes here, against a full CI run per point                       |

## 7. What becomes unused

With the test stage off, pushes stop using `tools/prepush-tests.mjs`'s test selection, downstream
deferral, pass reuse and known-failure excusing, and the gate-known pass. They stay for
`./tools/run-tests.sh`, `pnpm run test:changed`, bisect and `PREPUSH_LIGHT=0`. Deleting what is
then dead is a separate cleanup once the light gate has run for a week; it is not part of this plan.

## 8. Files to change

| File                                                            | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/prepush.sh`                                              | `PREPUSH_LIGHT=${PREPUSH_LIGHT:-1}`. When 1: skip the Tests step (`prepush-tests.mjs`), the screenshot start, wait and promote, and the gate-known record; print `[LIGHT] tests run in CI verification` in the summary. Everything else, the NVIDIA step included, is unchanged                                                                                                                                                                                                                 |
| `tools/prepush-inputs.mjs`                                      | Add `PREPUSH_LIGHT` to `laneEnv`, so it is part of `GATE_KEY`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| the gate's tests (run by `tools/live.sh gate`)                  | Light skips Tests and screenshots and keeps GPU; `PREPUSH_LIGHT` changes `GATE_KEY`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tools/land.mjs`                                                | `defaultPush` sets `PREPUSH_LIGHT=1` explicitly. `status` and the golden pull request description show the verify backend, the CI-unavailable state and the count of unverified landings. No change to cut, `newestStableCut`, `cutUnverified`, ship or `requestVerify`                                                                                                                                                                                                                         |
| `tools/verify.mjs`                                              | `ciGate` as the default gate (yield, push, broker-then-REST polling every 300 s, fail-fast, `[FAIL]` lines, `[SUPERSEDED]`); `defaultGate` renamed `localGate`; JUnit-driven local confirm; one CI rerun for a CI-only failure, never moving `golden-verified` on it; CI bisect points; `ciUnavailable`; `backend ci\|local --reason`; `MAX_SWITCHES` not applied to CI runs                                                                                                                    |
| `tools/verify.test.mjs`                                         | `ciGate` with an injected `gh`: success publishes; cancelled supersedes; failure yields the right `failingShards()`, a group job expands to its members; rerun-pass quarantines and does not publish; startup_failure twice sets CI-unavailable; ref at the commit with zero runs records `noRun`, deletes and re-pushes the ref (dispatches once the file is on master), and a second no-run sets CI-unavailable; 403 waits; yield to a running release train; stale broker falls back to REST |
| `.github/workflows/golden-verify.yml` (new)                     | Push on `golden-candidate`, `golden-cut-candidate`, `golden-bisect-1` and `golden-bisect-2`; `workflow_dispatch` with `ref` and `shards` inputs for CI bisect; concurrency per ref, no cancel; one job `verify` (name `Verify`) calling `ci.yml`                                                                                                                                                                                                                                                |
| `.github/workflows/ci.yml`                                      | workflow_call inputs `verify` (boolean, default false) and `shards` (optional JSON list). Plan step: a `push` is the build-only master run only when `inputs.ref` is empty; `shards` filters the matrix and sets light. Performance adds `&& !inputs.verify`. The test job uploads `test-results/junit-*.xml` as `junit-<shard>` (retention 7 days). No change to the visual job, the gate step, all-checks or the concurrency                                                                  |
| `tools/ci-test-matrix.mjs`                                      | `--only <json>` shard filter; refuses an unknown shard name                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tools/ci-workflows.test.mjs`                                   | Register golden-verify.yml; its push trigger lists exactly the four branches `golden-candidate`, `golden-cut-candidate`, `golden-bisect-1` and `golden-bisect-2`; a push with `inputs.ref` plans full; no verification run can post a bare `All Checks Pass` or `Queue Checks Pass` (the caller job's name is not empty); the visual job and gate step are byte-identical to master's; the shard filter                                                                                         |
| `tools/branch-sync.mjs`                                         | The nightly sync runs the light gate, not local test shards                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `.claude/skills/pipeline-round/SKILL.md`                        | `ciUnavailable` is an alarm (one `priority:high` issue); never switch the backend to local without a reason in the golden pull request                                                                                                                                                                                                                                                                                                                                                          |
| `design/ci/test-ledger.md`                                      | The verification backstop is the CI run; its evidence comes from the run's JUnit; local kinds stay for confirm, bisect and hand runs; land-check excusing is dormant                                                                                                                                                                                                                                                                                                                            |
| `design/ci/branch-sync.md`                                      | The nightly sync runs the light gate; `golden-good` still follows `golden-verified`                                                                                                                                                                                                                                                                                                                                                                                                             |
| `design/ci/ci-cd-plan.md`                                       | Section 7 unchanged for the T4; one line that the full suite also runs on golden through CI verification, governed by section 13's queue threshold                                                                                                                                                                                                                                                                                                                                              |
| `design/decisions/2026-10-23-full-tests-in-ci-adopted.md` (new) | The decision record, written when the owner adopts this document                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `CLAUDE.md`                                                     | See below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

CLAUDE.md changes the implementation must make, each in the step that makes it true:

- Tools table: `prepush.sh` is the light gate by default (`PREPUSH_LIGHT=0` for the full one);
  `verify.mjs` verifies golden in CI through `golden-verify.yml`, with `backend local --reason` as
  the explicit fallback; `push-queue.sh` has 4 gate slots, not three.
- Workflows table: add `golden-verify.yml` (push on `golden-candidate`, `golden-cut-candidate`,
  `golden-bisect-1` and `golden-bisect-2`,
  calls `ci.yml` as a full run, checks named `Verify / ...`, gates no merge).
- "CI/CD Pipeline", "Live today": the full suite runs in CI on golden's verified commits and on the
  cut; the local gate runs no tests.
- "Testing": "verification after landing always runs everything" now means in CI; how to run a CI
  shard by hand is unchanged.
- "Landing changes" step 2 and "Verification after landing": the land check is the light gate;
  `golden-verified` moves on a green `Verify / All Checks Pass`; failure handling as in section 3.5;
  the CI-unavailable state.
- The deferral and cut paragraphs: downstream deferral and the full cut gate no longer apply to
  pushes.
- The pre-push "Secret Scan" paragraph and the SonarQube section stay; the SonarQube step is part of
  the light gate.

## 9. Implementation plan

Each step lands on its own (`node tools/land.mjs land <branch>`) and is useful alone. The order
leaves no window in which nothing verifies golden: the local gate turns light only after CI
verification is live.

1. **CI side: a full run on request.** `ci.yml`'s workflow_call inputs `verify` and `shards`, the
   Plan step change, Performance skipped on `verify`, the JUnit upload; `tools/ci-test-matrix.mjs
--only`; the new `golden-verify.yml` with its four push branches. Test: `tools/ci-workflows.test.mjs` cases above; then, after
   landing, one push of golden's tip to `golden-candidate` by hand, and the run must be full (about
   25 test jobs), post only `Verify / ...` checks, and leave master-guard, deploy-pages and release
   untouched. Nothing reads its result yet, so it changes no behavior.
2. **`ciGate` in verify.mjs, off by default.** `ciGate`, `localGate`, the yield rule, broker-then-REST
   polling, fail-fast, `[FAIL]` and `[SUPERSEDED]` output, `ciUnavailable` and `backend ci|local`;
   the default stays `local`. Test: `tools/verify.test.mjs` cases above with an injected `gh` and
   broker file; `verify.mjs backend ci` on one golden tip by hand, which must publish
   `golden-verified` on green.
3. **Switch verification to CI.** `backend ci` the default; `tools/live.sh land <branch>`. Test:
   the next two landings are verified by `golden-verify.yml` runs and `golden-verified` moves; the
   push log shows no `verify` gate on this machine.
4. **Failure path in CI.** JUnit-driven local confirm, the one CI rerun for a CI-only failure (never
   publishing on it), quarantine, CI bisect with full runs on `golden-bisect-1`/`-2` (push triggers
   since step 1), the no-run state and its recovery. Test:
   `tools/verify.test.mjs` with recorded failing runs (reproducing here, flaky here, CI-only and
   confirmed, CI-only and passing on rerun, environment change); one seeded failing test landed on a
   throwaway branch and bisected end to end, then reverted.
5. **The light gate.** `PREPUSH_LIGHT` in `prepush.sh` and `prepush-inputs.mjs`, `land.mjs
defaultPush` setting it, `status` showing the backend. `tools/live.sh gate <branch>` then
   `tools/live.sh land <branch>`. Test: the gate's tests above; the next land check's log shows
   build, lint, knip, SonarQube and (for a webgpu-graph-algorithms change) the NVIDIA step, and no
   shard and no capture; its duration in the push log is the first measurement of section 4's GUESS.
6. **pipeline-round and branch sync.** The skill's CI-unavailable alarm; `tools/branch-sync.mjs` on
   the light gate. Test: the skill's dry run on a `verify.json` with `ciUnavailable` set raises one
   issue; one nightly sync run logs no shard.
7. **CI bisect by shard, once `golden-verify.yml` is on master.** CI bisect points dispatched with
   `shards`, 2 at a time. Test: a recorded CI-only failure bisected with two dispatches of 2-3 jobs
   each.
8. **Docs.** CLAUDE.md as listed in section 8; `test-ledger.md`, `branch-sync.md`, `ci-cd-plan.md`;
   this document's status to Built, and the decision record. Test: `prettier --check` and
   `tools/check-links.sh --offline`.

Steps 1-4 and 5 each go live at once through `tools/live.sh` (verify and the gate are local tools),
with the landing as the record. Steps 1 and 7 take effect in GitHub when they reach golden (the push
trigger) and master (the dispatch trigger) respectively.

## 10. Risks and how each is handled

| Risk                                                                                          | Handling                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test regressions reach golden more often, since landings run no tests                         | Golden may be briefly broken (decided 2026-10-21); exposure is about 37 min on average against 81 today; every tip still builds, lints and passes SonarQube; the culprit is bisected and reverted as today; `golden-verified` and so master never see it                                       |
| The light gate is slower than the 10-min GUESS                                                | The plan still wins at 30 min (section 4); the first week's push log measures it                                                                                                                                                                                                               |
| A verification run's green `All Checks Pass` on the cut's head could satisfy master's ruleset | Checks of a called workflow are named `Verify / ...`; a ci-workflows test fails if the caller job's name is empty or the summary could be posted bare                                                                                                                                          |
| Runner concurrency: verification beside a cut run and a release train                         | One verification at a time and the yield rule; worst case queues for about 10 min (GUESS); past 10 min of measured queue, larger runners for the heavy jobs (`ci-cd-plan.md` section 13)                                                                                                       |
| A CI-only failure is slow to bisect (full runs until step 7)                                  | Local confirm and bisect first; the rerun filters infrastructure faults; after step 7, shard-only points                                                                                                                                                                                       |
| A flaky failure retried into green                                                            | A passing rerun never moves `golden-verified`; the test is quarantined with a `priority:critical` issue and the next verification decides                                                                                                                                                      |
| GitHub accepts a push and creates no run                                                      | The no-run state (section 3.2): shown in both status commands and the pipeline round, recovered by deleting and re-pushing the ref or by a dispatch, CI-unavailable on the second                                                                                                              |
| GitHub is down                                                                                | The CI-unavailable state; no cut offered; local verification only by an explicit, recorded `backend local --reason`                                                                                                                                                                            |
| The full suite runs twice in CI per shipped commit                                            | Accepted: reusing verification on the cut pull request needs the owner-protected capture download to change, so it is an owner item; runner minutes are free and concurrency stays within budget                                                                                               |
| Verification captures are wasted work (7 jobs, the 20-min fidelity tail)                      | Accepted: the visual job may not be edited. Using them as the owner's preview instead of the local one is a separate owner decision                                                                                                                                                            |
| Local testing is less like CI                                                                 | The owner chose CI as the one test environment; `./tools/run-tests.sh <shard>` still runs CI's exact command here                                                                                                                                                                              |
| GPU coverage when webgpu-graph-algorithms is not affected                                     | Only its tests use the card; it depends on graph-format, so a graph-format change makes it affected; the T4 runs on every release                                                                                                                                                              |
| Unprotected scratch refs (`golden-candidate`, `golden-bisect-*`) moved by someone else        | `verify.mjs` matches runs by head commit; a run for another commit is ignored and its own commit is pushed again at the next poll, which moves the ref and so makes a push. A ref that already holds the commit with no run is the no-run state (section 3.2): delete and re-push, or dispatch |
| A rule documented but not enforced                                                            | Each step goes live through `tools/live.sh` when it lands, and its test runs in the live copy's checks                                                                                                                                                                                         |
