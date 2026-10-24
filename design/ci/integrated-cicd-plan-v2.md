# graphty CI/CD: the integrated plan, version 2 (as of 2026-10-24)

Status: proposed, 2026-10-24. Issue #3316. It joins every CI/CD and testing change proposed or
built between 2026-10-13 and 2026-10-24 into one process. It supersedes most of
`design/ci/integrated-cicd-plan.md` (version 1, written before full testing moved to CI); that file
marks which of its sections still stand. It builds on `design/ci/ci-full-testing.md` (the light
local gate with the full suite in CI, built and not yet switched on) and keeps the parts of
`design/ci/fast-pipeline.md` and `design/ci/golden-local.md` it does not replace.

Words used throughout:

- **golden** is the local integration branch every change lands in (`tools/land.mjs`), pushed to
  `golden` on GitHub.
- **the gate** is `tools/prepush.sh`, run by `tools/push-queue.sh` for every push and landing.
- **the light gate** is the gate with its test stage and screenshot capture switched off
  (`PREPUSH_LIGHT=1`): checks, build, lint, SonarQube and the NVIDIA GPU tests only.
- **verification** is `tools/verify.mjs`: it tests golden's newest commit after landings and moves
  the ref `golden-verified` when it passes, then bisects a failure to the landing that caused it.
- **the cut** is the verified golden commit chosen for master (`golden-cut`), opened as a pull
  request whose screenshots the owner approves.
- **the release train** is `.github/workflows/release.yml`: full suite, paid T4 GPU, Hosts, macOS
  autosave, security audit and LLM tests on master's tip, then version, push the tags, publish to npm.

Figures marked "measured" come from `tmp/push-log.jsonl` (main checkout), `tmp/golden/verify.json`,
the gate logs, GitHub run times or git history. Figures marked "estimate" are not measured yet; each
has a check in section 6 that measures it.

## Short answers

- **The end state is short.** Land with a light local gate (about 10 to 15 minutes, estimate). The
  full suite runs once per batch in GitHub Actions on golden's tip (31 minutes, measured). The
  newest verified commit is cut, its screenshots are approved, and its CI runs once more (31
  minutes, measured). The release train runs everything, including the GPU, on what reached master.
  Failures found after landing are bisected in CI and the culprit is reverted.
- **Most of the machinery built this week becomes unneeded.** Once no test runs in the local gate,
  test selection in the gate, deferring downstream tests, per-shard pass reuse, the "known failing
  on golden" excuse, the test ledger's SQLite index, mid-run switching of verification, nx 24's
  task-level affected, the nightly flake hunt and the gate's own screenshot capture all lose their
  purpose. Section 2 drops or shrinks 22 of 66 mechanisms, and that includes things already built.
  What is left is about 15 pieces, most of which existed before this week.
- **Will it release faster?** Yes. Today nothing has reached npm since 2026-10-21 04:46 UTC, and
  golden is 427 commits ahead of master. For a typical change, the end state takes about 1.7 hours
  from landing to master plus the owner's review, and about 3.3 hours to npm (section 4).
- **Under six hours?** For a typical change, yes, provided the owner reviews the cut within about
  two hours. Overnight it will not happen, because only the owner approves screenshots. A
  tier-3-sized branch cannot land in six hours under any design here. Its branch preparation alone
  took 9.2 hours. Only landing it in pieces gets there.
- **Tier 3's largest single cause was not product slowness or the machine.** It was a test-harness
  logging defect. React "not wrapped in act(...)" warnings rose from about 37,000 to 435,000 per run
  (85 to 110 MB of log per shard), which roughly doubled real-element test time. It kept golden red
  for about 20 hours, so the fixes for it could not land. No proposed mechanism detected it. This
  plan adds a per-shard log budget that would have caught it on the first run (section 3).
- **Two things this plan corrects in the earlier analysis.** "Six times slower" was mostly five
  times more real-element test files, not slower code. The release block (#3318) did not come with
  tier 3; it came from `feat/style-specimens`, landed on golden on 2026-10-21.

## 1. The end state

### 1.1 From a developer's commit to npm and graphty.app

| #   | Step                      | Where                           | What runs                                                                                                                                                                                                                                                                                                                                                                                                                                             | Time                                                                                                                                                 | What it guarantees                                                                                                                                  |
| --- | ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Commit on a branch        | This machine, own worktree      | Pre-commit: secret scan, prettier. Post-commit: background push of the branch to GitHub. Before landing, the author runs the tests the change touches (`pnpm run test:changed`, or `./tools/run-tests.sh <shard>`). That is advice, not a gate.                                                                                                                                                                                                       | seconds; the author's test run is the author's choice                                                                                                | Nothing beyond "no secret, formatted". The branch is on GitHub, so a crash loses nothing.                                                           |
| 1   | Landing check             | This machine, gate slot         | `land.mjs land <branch>` merges golden into the branch's tree. It runs the light gate: source checks (formatting, links, workflow tests, SonarQube on changed lines measured against `origin/golden`, secret scan, large-file check), affected build, lint with type-check, knip, API report, bundle sizes, docs site when docs are affected, a fatal `nx release --dry-run` (new), and the NVIDIA GPU tests when webgpu-graph-algorithms is affected | estimate 10 to 15 min; the land check today, which runs selected tests, has a median of 32.3 min (7.7 waiting plus 24.6 running) and a p90 of 99 min | The change builds, lints, type-checks and passes every deterministic check, merged with golden as it was a moment ago. No test of behavior has run. |
| 2   | Golden push               | This machine, seconds of lock   | Merge, then a fingerprint lookup that step 1 passed on this exact tree. If golden moved, step 1 runs again on the new merge                                                                                                                                                                                                                                                                                                                           | seconds (measured: 0 min gate on 2026-10-24 00:52)                                                                                                   | golden's tip builds and passes the light gate.                                                                                                      |
| 3   | Verification              | GitHub Actions                  | `verify.mjs` pushes golden's newest tip to `golden-candidate`; `golden-verify.yml` calls `ci.yml` as a full run: every shard with coverage, quarantine retry, Lint, Checks, Docs, Links, cost accuracy, all 7 screenshot captures. One run at a time; it waits for a running cut CI or release train first                                                                                                                                            | 31.4 min (measured, run 40001752903, the same workflow); a start waits on average half a run when another is in progress                             | Every landing up to that commit passes the whole suite on a clean machine. `golden-verified` moves.                                                 |
| 3b  | Confirm, bisect, revert   | GitHub Actions, then local      | A failed job is already retried once inside the job by the quarantine wrapper. A failure that survives is bisected by one matrix dispatch: only the failed shards, at every `land:` merge since the last verified commit, in parallel. The pipeline round reverts the culprit with `land.mjs revert`                                                                                                                                                  | estimate 25 to 35 min per bisect (one build plus one shard run; the measured local bisects took 50 min, 2.5 h and 3 h)                               | golden returns to green without a person routing it.                                                                                                |
| 4   | Cut and screenshot review | This machine, then the owner    | `land.mjs cut` points `golden-cut` at the newest verified commit whose preview has no unstable image. One preview capture per cut (not per landing). The owner presses Finish. The cut is frozen while the owner reviews it                                                                                                                                                                                                                           | preview 5 to 10 min (measured); owner time varies (first Finish on #3246 took 27 min)                                                                | Every changed image is signed by the owner.                                                                                                         |
| 5   | Ship                      | GitHub Actions                  | `land.mjs ship` marks the cut pull request ready with auto-merge. `ci.yml` runs its full suite once on the merge with master, with the owner's screenshot gate. This is master's required check                                                                                                                                                                                                                                                       | 31.4 min (measured, run 40001752903)                                                                                                                 | master holds only commits that passed the full suite twice in CI and the owner's screenshot gate.                                                   |
| 6   | Release train             | GitHub Actions (plus T4, macOS) | Starts on a green CI run of a cut merge, and at 00:00, 06:00, 12:00 and 18:00 UTC. Runs the full suite, T4 GPU, Hosts, macOS autosave, audit and LLM tests on master's tip. All green: version, push tags, deploy graphty.app from the run's own artifacts, then publish to npm                                                                                                                                                                       | measured 61 to 66 min per attempt before tier 3; re-measure (section 6, step 7)                                                                      | npm and graphty.app receive only what passed every lane, GPU included.                                                                              |
| 6b  | Release bisect-and-remove | GitHub Actions, then local      | A failure in the CI part: the same matrix bisect as 3b over the release batch's `land:` merges. A T4, Hosts or macOS failure: at most 3 serial probes, otherwise revert the batch's suspect landings. Revert on golden, then a pipeline-only cut and ship                                                                                                                                                                                             | estimate 1.5 to 3 h until the next attempt                                                                                                           | A failing commit is removed and everything else still ships.                                                                                        |

Notes on the table:

- Step 1 runs no test. That is the owner's order of 2026-10-23: "replace our local full-test gate
  with a lighter test that is lint, build, sonarqube, and gpu and put our full testing in CI". It
  supersedes the earlier stage-1 target, "fast, smallest tests ... that only test the exact
  changes". Section 1.3 says why no test lane is added back before landing.
- Steps 3 and 5 both run the full suite on nearly the same tree. That is deliberate. A run on a
  public repository's standard runners costs nothing, and the wall time of step 5 is set by the
  screenshot capture (about 20 minutes for the graph-io fidelity Storybook), not by the tests. Taking
  the tests out of step 5 would save runner minutes but not time. Step 5 is our version of the
  merge-queue re-run ("re-runs every check against main with the change applied").
- Step 6 reruns the suite once more because the owner keeps the T4 on every release ("no, I'd rather
  run the T4 to be sure our release works", 2026-10-13), and because master moves between a cut and a
  train (version commits, other cuts).

### 1.2 Where it follows Anthropic's process, and where it does not

Anthropic publishes two processes. Its large monorepo drops the merge queue for "post-merge and
pre-deploy automated testing" with automated bisect-and-revert, and lets main be briefly broken. Its
Claude Code repositories check before the pull request, require CI and re-run every check in a merge
queue against main. Our design uses the monorepo shape up to master and the Claude Code shape at
master and at release.

| Anthropic                                                                               | Ours                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent tests and reviews its own work before the pull request exists                     | Step 0: `test:changed`, plus the fresh-context review CLAUDE.md requires                                                                                                                                                 |
| Pull request runs selected tests ("listener" and "selector")                            | Different: the landing runs no tests (owner's order). Selection would add a CI round trip and API calls to each landing for a signal verification gives 31 min later                                                     |
| No global merge lock; post-merge testing                                                | A lock of seconds (one machine, a few dozen landings a day); verification after landing                                                                                                                                  |
| Automated bisect and revert                                                             | Steps 3b and 6b                                                                                                                                                                                                          |
| Main may be broken briefly                                                              | golden may be broken briefly; master may not be broken by anything CI can see                                                                                                                                            |
| Merge queue re-runs every check against main                                            | Step 5, the cut's CI on the merge with master                                                                                                                                                                            |
| Pre-deploy testing, flags, employees first, latest then stable channels, canaries, soak | Step 6. No flags on graphty-element options (they are published API) and no staged npm channel (a published version cannot be pulled back). beta.graphty.app is the only staged exposure, and it is optional (section 2) |
| Listener lag let regressions through; flaky dependencies blocked merges                 | One quarantine list, read by CI, with an issue per flaky test; GPU tests never quarantined                                                                                                                               |
| Release on the same green CI run (their public repositories)                            | The train starts on a green cut-merge CI run, but runs its own full suite because of the T4 and macOS lanes                                                                                                              |
| Trunk-based, refs discouraged except main and release branches                          | Branches live hours, not weeks. A branch older than 3 days is flagged (section 2, new check)                                                                                                                             |
| Risk-tiered human review                                                                | Not copied: the owner approves every image                                                                                                                                                                               |

"Eventually consistent" is the owner's phrase and appears in neither Anthropic post. The nearest
statement is "post-merge and pre-deploy automated testing" that repairs main before deploy. Section 5
defines what it means here.

### 1.3 Why no test lane before landing

There are three ways to put tests back before a change reaches golden:

- selected tests locally, the minimal-tests design;
- selected tests in CI per landing;
- history-based selection, issue #3324.

None is worth it now:

- **Running tests locally is what failed.** The machine runs 25 shards serially, under the load of
  3 to 8 gates at once. About 19 of 22 local test failures during tier 3 work never appeared in CI.
  Selection still picked 376 of graphty-element's 416 browser tests for one source change.
- **A CI lane per landing means a push, a run and a poll for every landing.** That is about 20 to
  40 more runs a day against the shared 60-job and 5,000-request limits. It would catch a failure
  about 20 minutes sooner than verification does.
- **A culprit that slips through costs one bisect.** Verification plus a parallel bisect in CI finds
  it in about an hour (estimate). The light gate already catches the 20 of 52 tier-3 gate failures
  that were not tests.

Revisit this if section 6's check shows more than one golden revert a day for two weeks running.
The first thing to add then is history-based selection in CI, using the result records kept for
quarantine.

## 2. Every mechanism: keep, simplify, merge, drop

Built means the code exists on golden, a branch or a live copy. The light gate is assumed on
(section 6, step 3). A row marked "drop" that is already built is removed in rollout step 12. Each
removal is a deletion, not new code.

### Landing (this machine)

| #   | Mechanism                                                     | State                  | Verdict                   | Reason                                                                                                                                                                |
| --- | ------------------------------------------------------------- | ---------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Golden-local landing, `land.mjs`, golden branch               | live                   | Keep                      | The trunk.                                                                                                                                                            |
| 2   | Short landing lock, check outside the lock                    | golden                 | Keep                      | What lets several landings proceed at once.                                                                                                                           |
| 3   | Light gate (`PREPUSH_LIGHT`)                                  | live copies, off       | Keep, make it the default | The owner's order. One switch.                                                                                                                                        |
| 4   | Push queue, 4 slots, fast lane                                | master                 | Keep                      | Light gates are short, so 4 slots are enough.                                                                                                                         |
| 5   | Whole-gate fingerprint reuse (golden push after a land check) | golden                 | Keep                      | Makes the lock last seconds.                                                                                                                                          |
| 6   | Per-shard pass reuse by input key (#3266, #3306)              | golden, fix unverified | Drop                      | No shard runs in the gate. CI has its own concurrency and is free.                                                                                                    |
| 7   | File-level test selection in the gate (#3276)                 | golden, on             | Simplify                  | Off in the gate. `tools/test-select.mjs` stays as the engine of `pnpm run test:changed` and to narrow bisect candidates.                                              |
| 8   | Selection replay and mutation tools (#3265)                   | golden                 | Drop                      | They proved selection safe for gating; nothing gates on it now.                                                                                                       |
| 9   | Defer downstream tests to verification (#3307)                | golden, on             | Drop                      | Nothing to defer.                                                                                                                                                     |
| 10  | "Known failing on golden" excuse (test ledger)                | golden                 | Drop                      | The gate runs no tests, so a red golden cannot block a fix. That was its only job.                                                                                    |
| 11  | SonarQube on changed lines, measured against `origin/golden`  | golden                 | Keep                      | Server is on the owner's network; caught 6 of tier 3's gate failures. Batching (324c5909c4) keeps it under the argument limit.                                        |
| 12  | Docs site build in the gate                                   | golden                 | Keep                      | Doc errors only CI caught stopped a merge twice.                                                                                                                      |
| 13  | Large-file check (20 images on golden)                        | golden                 | Keep                      | Tier 3 carried 83,005 PNGs.                                                                                                                                           |
| 14  | Refuse committed walk screenshots                             | golden                 | Merge into 13             | One check for binaries outside `visual-baselines/`.                                                                                                                   |
| 15  | `nx release --dry-run` as a fatal check                       | not built              | Add                       | Would have stopped the #3318 release block at landing, 3 days earlier. A few lines in `prepush-source-checks.sh`.                                                     |
| 16  | Priority lane (`--priority`)                                  | master                 | Simplify                  | 4 of 5 queued jobs used it on 2026-10-24, so it ordered nothing. Accept it only for a branch whose issue is labeled `priority:critical`; `land.mjs` checks the label. |
| 17  | `cut-fix`                                                     | master                 | Simplify                  | Only for fixes to a red master, a failed deploy or a release hold (owner rule), branched from `golden-cut`. Fix its refusal (#3286). Every other fix lands on golden. |
| 18  | Gate priority for test slots and CPU                          | golden                 | Drop for the gate         | The light gate holds no test slot. `tools/test-slots.mjs` stays for ad hoc runs.                                                                                      |
| 19  | Per-shard 30-minute shard timeout in the gate                 | master                 | Drop                      | A fixed deadline. Moot once the gate runs no shards; #3284's global hang guard covers ad hoc runs.                                                                    |
| 20  | Gate warm-up per project (#3319)                              | unlanded               | Drop                      | It exists for gate shards. The part that matters, a private Vite cache, is #3288.                                                                                     |
| 21  | Gate's background screenshot capture                          | master                 | Drop                      | The light gate already drops it. One preview per cut replaces it (row 41).                                                                                            |
| 22  | nx 24 with declared test inputs                               | unlanded               | Drop for now              | Its value was test selection by task in the gate. Upgrade nx later as an ordinary dependency bump.                                                                    |
| 23  | Nightly branch sync (`land.mjs sync`)                         | golden                 | Simplify                  | Cheap under the light gate. Run it only for branches with no golden merge in 24 hours, and report conflicts on the branch's issue. It is the only drift detector.     |
| 24  | Branch age and size warning                                   | not built              | Add                       | `land.mjs status` and issue-round flag a branch older than 3 days or over 300 changed files outside `visual-baselines/`, on day 3, not day 17.                        |
| 25  | Worktree slimming, automatic cleanup (#3305, #3309)           | golden                 | Keep                      | Disk was at 93%.                                                                                                                                                      |
| 26  | Live copies (`tools/live.sh`) for the gate and land tool      | live                   | Keep, with an alarm       | Pipeline round alarms when `git rev-list --no-merges origin/golden..<live copy>` is non-empty after one round. Today gate-live has 13 and land-live 11 such commits.  |
| 27  | Dependabot via golden (#3303)                                 | unlanded               | Keep                      | Security updates still target master and arrive as ordinary pull requests; that is GitHub's limit.                                                                    |
| 28  | Pipeline-round and issue-round skills                         | master                 | Keep                      | They are the first responder.                                                                                                                                         |

### Verification and tests (GitHub)

| #   | Mechanism                                                          | State                      | Verdict                 | Reason                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------ | -------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 29  | Verification after landing (`verify.mjs`), CI backend              | live copies, off           | Keep, switch on         | 31 min against 67 to 120 min locally, and the clean machine is the one master and npm care about.                                                                                                                                 |
| 30  | Local verification backend                                         | golden, on                 | Simplify                | Only a manual fallback for a GitHub outage (`verify.mjs backend local`). Never automatic: no silent fallback.                                                                                                                     |
| 31  | Confirm 5 times locally before bisect                              | golden                     | Simplify                | The quarantine wrapper already retries a failed file once inside the CI job, under the same load. A failure that survives that is real enough to bisect.                                                                          |
| 32  | Bisect (local serial, CI with 2 refs)                              | golden, branch             | Simplify                | One matrix dispatch: only the failed shards, at every `land:` merge of the batch, in parallel, capped at 20 jobs. One round instead of log2(n) rounds. Needs `golden-verify.yml` on master to dispatch.                           |
| 33  | Superseded-run switching mid-run (#3314)                           | golden, live               | Drop the mid-run switch | A CI run takes 31 minutes. Let it finish, then verify the newest tip. Keep "a newer land check of the same branch stops the older one".                                                                                           |
| 34  | `golden-good` tag                                                  | golden                     | Drop                    | Duplicates `golden-verified` and lags it.                                                                                                                                                                                         |
| 35  | Re-gate of a verified cut locally (`golden-cut` full gate, #3273)  | master                     | Drop                    | Cost about 10 hours in tier 3 on a commit already known good.                                                                                                                                                                     |
| 36  | Quarantine (#3323)                                                 | golden, broken for graphty | Keep, fix first         | Under CI testing it is the only flake handling. Fix the report lookup for graphty's vitest projects. One list, one `priority:critical` issue per test (the owner's rule of 2026-10-22), GPU never, leaves after its issue closes. |
| 37  | Test ledger result records                                         | golden                     | Simplify                | One JSON line per CI verification and release run (failed tests, retried, passed on retry). Drop the SQLite index.                                                                                                                |
| 38  | History-based selection (#3324)                                    | ordered, not started       | Simplify                | Build only its "listener" half: classify a test as flaky from the result records (failed, then passed on the same commit). That feeds row 36. The selector half has no consumer (section 1.3).                                    |
| 39  | Per-shard log-size and console-warning budget                      | not built                  | Add                     | Fails a shard whose log grows over 3 times its last verified size, naming the top repeated warning. Catches the act() flood on day one.                                                                                           |
| 40  | No timed waits, lint rule, one global hang guard (#3284)           | unlanded, critical         | Keep, land first, alone | Removes the racing-deadline class (tooltip 1 s against a 1 s find, twice in tier 3).                                                                                                                                              |
| 41  | Screenshot preview per landing (`land.mjs` after each landing)     | master                     | Simplify                | One preview, of the cut only, and a newer cut cancels a stale one. Five previews ran at once on 2026-10-24.                                                                                                                       |
| 42  | Time-budget reporter (warn at 25%, fail a changed test over 50%)   | master                     | Simplify                | Keep the warning. Drop the 50% failure: #3284 raises limits to the hang guard's size, so it no longer measures anything. Counted-work assertions plus row 39 replace it.                                                          |
| 43  | Nightly flake hunt, push duration check (`infra/flake-prevention`) | unlanded                   | Drop                    | The owner rejected re-running tests under CPU load (2026-10-14). Quarantine finds flakes where they happen.                                                                                                                       |
| 44  | Throwaway flake-hunt CI runs (`ci/flake-hunt-1..3`)                | branches                   | Drop                    | Three clean runs did not predict the fourth run's failure.                                                                                                                                                                        |
| 45  | Weekly restricted-CPU stress run                                   | master                     | Keep                    | Gates nothing; the standing check that tests are not load-sensitive, now that tests rarely run under local load.                                                                                                                  |
| 46  | Private Vite cache per run (#3288)                                 | golden and master          | Keep                    | Needed for ad hoc local runs and the manual fallback. Rule: anything a test run writes is private to it.                                                                                                                          |
| 47  | CI test split (graphty and graph-io get their own jobs)            | master                     | Keep                    | Took a full run from 77 to 31 min.                                                                                                                                                                                                |
| 48  | Hosts on pull requests                                             | master                     | Drop from pull requests | Nightly and the release train only. Move the nightly off release hours.                                                                                                                                                           |
| 49  | Mergify leftovers in `ci.yml` and master-guard                     | master                     | Drop                    | Dead code; 19 mentions in `ci.yml`.                                                                                                                                                                                               |
| 50  | CodeQL on draft pull requests                                      | master                     | Drop on drafts          | It runs on both draft pull requests (golden and the cut), on nearly identical trees.                                                                                                                                              |

### Master, release, site, screenshots

| #   | Mechanism                                                   | State              | Verdict                  | Reason                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------- | ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 51  | Cut of the newest verified, stable commit; ship             | master             | Keep                     | Freeze the cut while the owner reviews it.                                                                                                                                                                          |
| 52  | Full suite on the cut pull request                          | master             | Keep                     | Free, and it does not lengthen the run (the capture is the tail). It is master's required check. Version 1's "one small test lane" is dropped, because it needed choosing and maintaining a list and saved no time. |
| 53  | Composed screenshot approvals (#3264)                       | unlanded           | Keep, the owner reviews  | Otherwise every revert and every combined batch needs a new Finish. Trusted code, so the owner reviews the diff.                                                                                                    |
| 54  | Capture and sign screenshots on the branch                  | not built          | Defer                    | Build it when cut review waits a median of over 1 hour for two weeks. In tier 3 the owner's waits were 2.5 to 3 h of 49.6 h.                                                                                        |
| 55  | Split the screenshot capture (#3293)                        | package side built | Keep, the owner wires it | The capture sets the 31-minute floor of verification, cut CI and the release. The `ci.yml` visual job may only be changed by the owner.                                                                             |
| 56  | Release train starts on a cut merge's green CI              | not built          | Add                      | Today a cut merge waits up to 6 hours for the next scheduled train.                                                                                                                                                 |
| 57  | Release bisect-and-remove                                   | not built          | Add                      | Reuses row 32's matrix bisect. The owner's order: "bisect and remove failing commits".                                                                                                                              |
| 58  | Release quarantine rule                                     | partly             | Keep                     | A test whose file changed since the last release tag is never excused at release. GPU tests never.                                                                                                                  |
| 59  | Release holds, restarts, publish holds, status issue        | master             | Keep                     | They work.                                                                                                                                                                                                          |
| 60  | Fix for #3318, public packages (#3322)                      | branch, issue      | Keep, first              | The release is held now. Owner rule: never private packages, never exclude projects.                                                                                                                                |
| 61  | Datasets off the deploy path (#3302)                        | in progress        | Keep, before row 62      | A third-party host was down, and the deploy failed (run 40009798098).                                                                                                                                               |
| 62  | Deploy graphty.app from the release run                     | not built          | Add                      | The owner expected the site to change only on release. Deploy, then publish, from the run's own artifacts.                                                                                                          |
| 63  | beta.graphty.app and the site flip (#3267)                  | built, unlanded    | Owner decision           | Row 62 already makes graphty.app change only on release. A beta site adds a repository, DNS and a manual promotion. Recommended: drop it unless the owner wants to look at master builds before each release.       |
| 64  | Master guard                                                | master             | Keep                     | Remove its Mergify freeze.                                                                                                                                                                                          |
| 65  | Dry-run script (#3268), AI-checked acceptance tests (#3272) | built, designed    | Defer                    | Tools for long branches, not pipeline stages. Land the script as a tool; it gates nothing.                                                                                                                          |
| 66  | Step times and load average in the push log                 | not built          | Add                      | Section 6's checks need it.                                                                                                                                                                                         |

The minimum set, after rollout:

1. light gate plus the fatal release dry run;
2. short lock and fingerprint reuse;
3. verification in CI;
4. matrix bisect and revert;
5. quarantine with a flaky-test listener;
6. log budget;
7. condition waits with one hang guard (#3284);
8. frozen cut, no local re-gate;
9. full CI on the cut;
10. composed approvals;
11. release train started by a cut merge, with bisect-and-remove;
12. deploy from release;
13. branch age warning;
14. live-copy alarm;
15. the two loop skills.

Items 1, 3, 4, 8 and 9 replace about ten pieces built for running the suite on this machine.

## 3. Tier 3: what happened and why

### 3.1 Timeline (UTC)

Tier 3 was the branch `design/studio-tier3`:

- 1,386 commits from 2026-10-06;
- 100,528 changed paths, 83,005 of them PNGs;
- about 120,000 changed lines in graphty, graphty-element and compact-mantine;
- graphty's real-element test files grew from 20 to 100.

Its only gate runs before the landing were two on 2026-10-13, and both failed (formatting,
SonarQube). The owner asked to land it at 2026-10-21 17:08. It reached master at 2026-10-23 18:47
(#3246, 77154dddc3): 49.6 hours.

| Span                       | Hours | What happened                                                                                                                                                                                                                                                                             |
| -------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10-21 17:08 to 10-22 02:21 | 9.2   | Branch preparation: two breaking API changes reverted, 173 SonarQube findings, bundle budgets, API report, knip; the internet dropped; graphty's shard exceeded the 30-minute shard limit and was split in three (7fd040f7b6); story races                                                |
| to 06:14                   | 3.9   | Landing: refused for cherry-picked copies; 7 conflicts after 8 other landings reached golden; a real merge bug (6 graphty-element failures); SonarQube crashed on 100k paths (E2BIG); a full re-gate of an identical tree; the owner pushed with `--no-verify`                            |
| to 12:56                   | 6.7   | Four unstable screenshots fixed overnight (the owner was asleep; little critical-path cost)                                                                                                                                                                                               |
| to 23:34                   | 10.6  | The cut of a commit golden passed 34 minutes earlier was re-gated locally and failed 3 times on test defects (College football at 15 s, a tooltip opening after 1 s against a 1 s find, a leftover tooltip swallowing Escape); fixes stuck behind a red golden; pushed with `--no-verify` |
| to 10-23 01:22             | 1.8   | Preview and owner review; the first Finish signed nothing because 5 unstable images were undecided                                                                                                                                                                                        |
| to 04:58                   | 3.6   | Four CI runs: three cancelled by pushes to the cut (a docs fix, two screenshot accept commits), one failed (College football, BulkPilot at 15 s)                                                                                                                                          |
| to 12:00                   | 7.0   | `cut-fix` refused the fix because it was built on golden; the fix went through a golden landing; the cut gate failed on a shared Vite cache race; retried                                                                                                                                 |
| to 16:29                   | 4.5   | CI failed on a test assuming a freed port stays free (#3292); fix's gate hit the cache race again; three throwaway CI runs; owner OK; `--no-verify`                                                                                                                                       |
| to 17:35                   | 1.0   | CI failed on a tooltip test; fixed with a longer wait (owner objected); `--no-verify`                                                                                                                                                                                                     |
| to 18:47                   | 1.2   | CI's screenshot gate wanted a Finish for an unstable spring-layout story whose fix was dropped and tracked nowhere; Finish; final CI green                                                                                                                                                |

Over those 49.6 hours, golden and the cut ran 82 gate runs (63.9 gate-hours). 52 of them failed:
31 on tests and 20 on steps that are not tests:

- SonarQube 6;
- API report 5;
- bundle size 4;
- docs 2;
- workflow tests, Sonar script tests and graph-io 1 each.

The same commits were gated again and again: aed6fe9dd9 six times, f3402561e5 four times.

The cut's CI ran 8 times: 3 were cancelled, 4 failed and 1 passed. The gate was bypassed 5 times,
all with the owner's consent and all followed by full CI. Nothing was admin-merged.

After the merge:

- The deploy failed because a third-party dataset host was down (#3302).
- The release train failed at candidate pick, because the private nx project `fidelity-web-oracles`
  has no version (#3318). That project came from `feat/style-specimens` (golden 2026-10-21 03:14), not
  from tier 3. It reached master with #3246 only because no cut had merged since 10-21.

### 3.2 Causes by class, and whether the end state prevents them

Hours are critical-path hours estimated by counterfactual, so they overlap and do not add up to
49.6.

| Class             | Cause                                                                                                                                                                               | Hours lost                             | End state prevents it?                                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Process           | A 17-day branch, never gated, never merged with golden; every check fired at the end                                                                                                | about 9                                | Partly. The day-3 age warning (row 24) and the nightly sync (row 23) surface it early; only small landings remove it. Light gate makes each check round about 15 min instead of 30 to 130.              |
| Process           | Golden not frozen during the landing: 8 landings, 7 conflicts                                                                                                                       | about 2.3                              | Partly. A short lock does not stop conflicts. Small branches do. For a big landing, CLAUDE.md's freeze rule stays.                                                                                      |
| Test harness      | React act() warning flood, 37k to 435k warnings a run, about 2x real-element test time; kept golden red so its own fix (fab203f0b5, 10-22 21:12) reached golden only at 10-23 09:02 | about 11 to 13                         | Yes, with row 39 (log budget). Moving tests to CI alone would not: CI's 4-core runners failed the same tests (run 39896390282). With no tests in the landing gate, a red golden no longer blocks fixes. |
| Test defects      | Waits racing a product delay (tooltip 1 s, twice), a leftover tooltip, tests near the 15 s limit (College football, BulkPilot, LegendCard), focus after a dialog                    | about 3 to 4                           | Yes, with #3284 (condition waits, one hang guard). Quarantine absorbs what is left, with an issue each.                                                                                                 |
| Test defects      | A freed port assumed to stay free (CI only)                                                                                                                                         | about 3 to 4                           | Partly. Verification in CI finds a CI-only defect before the cut instead of at ship. A working quarantine absorbs the intermittent case.                                                                |
| Tool              | Passes keyed per branch, so the cut re-gated a commit golden had passed                                                                                                             | about 10                               | Yes. The verified cut is never re-gated (row 35); there is no local test gate to re-run.                                                                                                                |
| Tool              | Shared Vite cache raced between the three graphty shards (#3288)                                                                                                                    | about 3.5                              | Yes. No local shards in the gate; #3288 makes ad hoc runs private.                                                                                                                                      |
| Tool              | `cut-fix` refused a fix built on golden (#3286)                                                                                                                                     | about 3                                | Yes. Fixes land on golden and the cut moves; `cut-fix` only for a red master or deploy, branched from the cut.                                                                                          |
| Tool              | Pushes to the cut (docs fix, accept commits) cancelled running CI                                                                                                                   | about 2.3                              | Mostly. Docs build in the gate removes the docs push. Composed approvals let accept commits reach the cut before ship. A frozen cut stops the rest.                                                     |
| Tool              | SonarQube E2BIG on 100k paths; 30-minute shard limit                                                                                                                                | under 1                                | Yes. Batching is built; the shard limit is gone with the light gate.                                                                                                                                    |
| Tool              | Finish signed nothing with unstable images undecided                                                                                                                                | about 0.75                             | No change proposed; the preview rule "cut only commits with no unstable image" avoids it.                                                                                                               |
| Tool              | Quarantine never retried graphty failures (#3323)                                                                                                                                   | part of the CI rounds                  | Yes, once #3323 is fixed. Rollout step 2 checks it.                                                                                                                                                     |
| Product           | Two breaking API changes, a semantic merge conflict, the Find box space, dash rounding, style events per layer, glide counting frames, seeded spring layout depending on arrival    | about 0.5 to 1 each                    | Not a pipeline problem. They were found, which is the pipeline's job. Counted-work assertions catch the per-layer events class.                                                                         |
| Environment       | Internet drop; load average 31 to 65 with up to 6 gates; dataset host down after merge                                                                                              | 1 to 2, plus the deploy                | Load: yes (no local test shards). Dataset host: yes, with #3302. The internet drop: no.                                                                                                                 |
| People and agents | An agent cherry-picked fixes; agents kept landing during the freeze; ETAs assumed reuse; the spring fix was dropped untracked; two cut runs and two dead-port fixes duplicated      | 2 to 3                                 | Partly. The no-copy hook already refuses copies. Every dropped fix gets an issue (pipeline-round rule). One landing session per big landing.                                                            |
| Owner             | Waits for review, Finish, consent                                                                                                                                                   | 2.5 to 3                               | Composed approvals make re-Finish rare. Not the bottleneck.                                                                                                                                             |
| Release readiness | An nx project with no version reached master                                                                                                                                        | the whole release, 3 days and counting | Yes, with row 15 (fatal release dry run at landing).                                                                                                                                                    |

### 3.3 Where this analysis could be wrong

- **The act() flood is the largest cause on the strength of one reproduction.** Starving vitest's
  Node process reproduced the gate's failure signatures: 19 of 41 tests failed with the warnings,
  10 of 41 without them. The flood's fix also arrived together with test splits, so part of the
  measured speed-up (graphty-2 from 660 to 492 s) may belong to the splits. Even at half its
  estimated weight, it is still the largest single cause.
- **"Moving tests to CI removes the local failures" is only half true.** CI also failed College
  football and BulkPilot at 15 seconds. CI removes the load amplification, not the defects. A test
  that does 14 seconds of real work under a 15-second limit fails anywhere. That is why #3284 and
  the log budget come before the switch, and why the switch alone is not the fix.
- **The light gate trades local failures for golden reverts.** Nothing measured says how often a
  landing that passes the light gate fails the full suite. Tier 3's 31 test failures were mostly
  defects that would have reached golden. The end state assumes such breaks are found within one
  verification and reverted within about an hour. If golden instead needs more than one revert a
  day, section 1.3 says what to add.
- **The counterfactual hours overlap**, especially the act flood, the red golden and the cut
  re-gate on 10-22. Read them as a ranking, not a sum.
- **The CI figure of 31 minutes is one run of a cut.** A verification run with every shard
  affected is the same workflow, but that has been measured only once. The trial run 40051811635
  was still in progress after 27 minutes at the time of writing. Rollout step 3 measures it over
  10 runs.

## 4. Will changes reach release faster, and in under six hours?

Today, measured: no release since 2026-10-21 04:46 UTC. Master moved 3 times in 5 days. The #3316
design measured a median of 213.5 minutes from desktop to master, before owner review and when
everything passed:

- land check 32.3 min;
- local verification 80.9 min;
- cut gate 68.9 min;
- ship CI 31.4 min.

Only 9 of 39 land checks have passed since 2026-10-22.

### Typical change (one package, passes everything)

| Step                                                             | Minutes                    |
| ---------------------------------------------------------------- | -------------------------- |
| Land check, light gate, with queue wait                          | 15 (estimate)              |
| Golden push                                                      | under 1 (measured)         |
| Wait for the running verification to end (on average half a run) | 16 (estimate)              |
| Verification in CI                                               | 31 (measured once)         |
| Wait for the next cut (pipeline round every 30 min)              | 15 (estimate)              |
| Preview capture of the cut                                       | 10 (measured 5 to 10)      |
| Owner review                                                     | R                          |
| Ship CI                                                          | 31 (measured)              |
| **Desktop to master**                                            | **about 120 + R**          |
| Release train started by the cut merge                           | 65 to 105 (measured range) |
| **Desktop to npm and graphty.app**                               | **about 3.1 to 3.8 h + R** |

That is under six hours if the owner reviews within about two hours. Without the owner, steps
before the review still finish in about an hour, so a change is verified and waiting for the owner
well inside six hours.

### A large branch like tier 3, landed in one piece

| Step                                                                                                                         | Hours             |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Deterministic checks found at landing (API, SonarQube, budgets), light gate rounds of about 15 min each instead of 30 to 130 | 3 to 5 (estimate) |
| Conflicts with golden if not frozen                                                                                          | 1 to 2            |
| Verification finds the test defects: about 4 serial fix rounds, each land 15 + verify 31 + fix time                          | 4 to 6 (estimate) |
| Owner review of about 1,261 images                                                                                           | 1 to 3            |
| Ship CI                                                                                                                      | 0.5               |
| **Total**                                                                                                                    | **10 to 16**      |

That is about a third of 49.6 hours, but not six. Split into about ten pieces of a day's work each,
every piece is a typical change, and the whole of tier 3 lands within a few hours of the last piece
being written.

### A bad day

| Event                                   | Added time                                                                 | Why                                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A flaky test in verification            | about 2 min                                                                | The quarantine wrapper retries it in the same job. Its issue is filed.                                                        |
| A flaky test while quarantine is broken | 31 per round, plus a false bisect                                          | Today's situation. That is why rollout step 2 comes before step 3.                                                            |
| A real failure in verification          | 30 to 60 (bisect and revert), then the batch's innocent landings re-verify | Matrix bisect, revert, re-verify.                                                                                             |
| A flaky cut CI run                      | 31                                                                         | One more run; quarantine should absorb it.                                                                                    |
| A dataset host down at deploy           | 0 with #3302; otherwise the release holds until the host returns           | Why #3302 must come before deploy-from-release.                                                                               |
| GitHub Actions down                     | landings continue; nothing is verified or shipped                          | No silent fallback. The pipeline round alarms and the owner may switch verification to local (67 to 120 min per run) by hand. |
| A T4 or macOS failure at release        | 1.5 to 3 h until a release goes out                                        | Serial probes or revert the batch's suspects; the next attempt runs at once on the fix's cut merge.                           |

A bad day with one real failure and one flaky cut run gives about 120 + 60 + 31 + R minutes from
desktop to master, which is about 3.5 hours plus review. That is still under six.

## 5. Eventually consistent at release time

| Layer               | May be broken?                                                                                                                                          | For how long                                                                           | What repairs it                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A branch            | Yes                                                                                                                                                     | The author's problem; flagged at 3 days                                                | Light gate at landing                                                      |
| golden              | Yes: anything the light gate cannot see (tests, coverage, screenshots, CI-only behavior)                                                                | From a landing until one verification run plus one bisect, about 1 to 1.5 h (estimate) | Matrix bisect, then `land.mjs revert` of the culprit by the pipeline round |
| `golden-verified`   | No for anything CI on Linux can see                                                                                                                     | Not applicable                                                                         | Moves only on a green full run                                             |
| master              | Only for what Linux CI cannot see: the T4 GPU, Hosts (macOS Metal, Windows), macOS and iOS autosave, the LLM tests, the security audit's new advisories | Until the next release attempt, and it is never shipped                                | Release bisect-and-remove, a pipeline-only cut                             |
| npm and graphty.app | No                                                                                                                                                      | Not applicable                                                                         | Nothing ships unless every release lane is green on the exact commit       |

How a failing commit is removed before release:

1. **Verification fails.** The quarantine wrapper has already retried each failed file once in its
   job. A file that passed on the retry is flaky: its issue is filed and the run counts as green. A
   failure that stayed red goes on.
2. **Bisect.** `verify.mjs` dispatches one `golden-verify.yml` matrix run of only the failed
   shards, at every `land:` merge (first parent) since `golden-verified`, capped at 20 jobs. With
   more than 20 merges, it bisects in two rounds. The culprit is the first merge that fails, provided
   its parent passes.
3. **Remove.** The pipeline round runs `land.mjs revert <branch>` and opens the fix work on the
   branch's issue. Verification of the new tip follows. Landings never stop for a red golden,
   because the light gate does not run tests.
4. **At release**, the same steps run over the land merges since the last release tag. The batch is
   revert on golden, then cut, then ship as a pipeline-only cut. A pipeline-only cut changes no
   images, so with composed approvals it needs no new Finish. A failure in the T4, Hosts or macOS
   lane cannot be bisected in parallel (one T4, 5 macOS runners). It gets at most 3 serial probes,
   then the batch's suspect landings are reverted and the innocent ones land again.
5. **A test changed since the last release tag is never quarantined at release.** A new
   intermittent bug from this batch is treated as a real failure. GPU tests are never quarantined.

## 6. Rollout

Each step lands or switches on its own and has a check read from a file or a run. Steps 1 to 3 are
the order that matters. After them, any order works.

| #   | Step                                                                                                                                                                                                        | Owner action                                                                            | Check that it delivered (target)                                                                                                                                                                                                                | Roll back                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 0   | Unblock the release: `fix/3318-release-new-private-projects` through `cut-fix`, alone; then #3322 (graphty and githerd public); add the fatal `nx release --dry-run` to `prepush-source-checks.sh` (row 15) | None (or the first npm publish of a new package, per CLAUDE.md, when its publish fails) | The next train run publishes; `gh run list --workflow release.yml` green. A test branch adding a versionless project fails the gate.                                                                                                            | Revert the check's commit                                         |
| 1   | Land `design/3316-full-tests-in-ci` (in progress) and this plan. Add the live-copy alarm to pipeline-round                                                                                                  | None                                                                                    | `git rev-list --no-merges origin/golden..<gate-live and land-live>` is empty after one round (target 0; today 13 and 11)                                                                                                                        | `land.mjs revert`                                                 |
| 2   | Fix quarantine for graphty (#3323) in the CI wrapper; land #3284 (condition waits, one hang guard) alone                                                                                                    | None                                                                                    | In a CI run with a failed graphty test, its `.quarantine.json` artifact says `"retried": true` (target: every failed file). No `Test timed out in 15000ms` in the next 10 CI runs                                                               | `GRAPHTY_TEST_QUARANTINE=0`; revert #3284's land commit           |
| 3   | Switch on: `node tools/verify.mjs backend ci` (this turns the light gate on too)                                                                                                                            | None                                                                                    | Over 10 verification runs in `tmp/golden/verify.json`: median under 40 min, at least 80% green. Land checks in `tmp/push-log.jsonl` (`branch: golden`, cwd `land-check-*`): median under 15 min, at least 70% pass on the first try (today 23%) | `node tools/verify.mjs backend local` (the gate turns full again) |
| 4   | Matrix bisect in CI over `land:` merges; drop the 5-times local confirm; one preview per cut only                                                                                                           | None (`golden-verify.yml` must be on master for dispatch, so after the next cut)        | Each bisect in `verify.json` under 35 min to a named culprit; at most one preview process running (`pgrep -f visual-preview.sh`)                                                                                                                | Revert; the 2-ref bisect remains                                  |
| 5   | Log budget per shard (row 39); counted-work assertions on the hot paths named in section 3                                                                                                                  | None                                                                                    | Replaying `IS_REACT_ACT_ENVIRONMENT=true` on a branch fails the budget naming the act() warning                                                                                                                                                 | Revert                                                            |
| 6   | Cut and ship from `golden-verified` with no local re-gate; frozen cut; `--priority` only for `priority:critical`; `cut-fix` narrowed                                                                        | Reviews and Finish, as today                                                            | At least 2 master merges a day on working days; cut CI green on the first run at least 80% (CI run list of the cut pull request)                                                                                                                | Revert                                                            |
| 7   | Release train starts on a cut merge's green CI; release bisect-and-remove                                                                                                                                   | None                                                                                    | Master merge to npm median under 2 h over a week (release run times against merge times); a held release removes its culprit within one attempt                                                                                                 | Revert the `release.yml` change                                   |
| 8   | #3302 (datasets off the deploy path), then deploy graphty.app from the release run                                                                                                                          | Decide on beta.graphty.app (#3267); recommended: drop it                                | The site's build id equals the latest release tag's commit; a master push starts no deploy                                                                                                                                                      | Restore the push trigger in `deploy-pages.yml`                    |
| 9   | Composed approvals (#3264)                                                                                                                                                                                  | Review the trusted diff; it is the owner's to approve                                   | A revert after a Finish ships with no new Finish; the gate refuses a composed tree holding an unsigned image (its test)                                                                                                                         | Revert; the signed-tree gate remains                              |
| 10  | Capture split (#3293)                                                                                                                                                                                       | Wire `--shard` and `--merge` into the `ci.yml` visual job (owner-only file part)        | Verification and cut CI under 20 min                                                                                                                                                                                                            | Owner reverts the visual job                                      |
| 11  | History listener (#3324, narrowed): flaky classification from CI result records                                                                                                                             | None                                                                                    | Every test that failed then passed on the same commit has an open `priority:critical` issue within one pipeline round                                                                                                                           | Revert                                                            |
| 12  | Deletions: rows 6, 8, 9, 10, 18, 19, 20, 21, 22, 33 (mid-run switch), 34, 37 (SQLite), 42 (50% rule), 43, 44, 48, 49, 50; delete the abandoned branches                                                     | None                                                                                    | `tools/` line count falls; nothing in `tmp/push-log.jsonl` changes for the worse over a week                                                                                                                                                    | Revert per deletion                                               |
| 13  | Branch age warning and the narrowed nightly sync; design-studio skill merges `golden-verified` and lands after every pass                                                                                   | None                                                                                    | No open branch over 3 days without a note on its issue (`land.mjs status`)                                                                                                                                                                      | Revert                                                            |
| 14  | Deferred, with triggers: branch screenshot signing (cut review wait median over 1 h for 2 weeks); selection before landing (more than one golden revert a day for 2 weeks); nx 24 as a dependency bump      | None                                                                                    | The trigger metric itself                                                                                                                                                                                                                       | Not applicable                                                    |

The in-flight items map onto these steps:

- the CI verification switch is step 3;
- history selection is step 11, narrowed;
- the quarantine fix is step 2;
- public packages are step 0;
- the site flip is step 8 (owner decision);
- the capture split is step 10;
- nx 24 is step 14;
- #3284 is step 2.

## 7. Risks and corners

| Risk                                                        | What happens                                                                          | Handling                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions outage or a push that creates no run         | No verification, no ship, no release                                                  | `verify.mjs` records `noRun`, re-pushes once by deleting and recreating the ref, then alarms. Landings continue. The owner may switch to the local backend by hand. Never automatic.                                             |
| The 60-job limit, shared with the release train             | A full run peaks at 31 jobs; verification plus a cut plus a release would ask for 93  | Verification yields to a running cut CI or release (built in #3316). The bisect matrix is capped at 20 jobs. The release train never waits on verification.                                                                      |
| GitHub API budget (5,000 an hour, shared)                   | Polling every verification and bisect                                                 | Polls every 300 s, read the broker file first, one dispatch per bisect (not per commit). Estimate under 100 calls an hour in total.                                                                                              |
| Flaky CI                                                    | A red verification or cut run with no culprit                                         | Quarantine retry in the job, one issue per test, never for GPU tests or tests changed since the last release. A flaky test is a `priority:critical` defect (owner rule), and its issue names the mechanism, never "it was load". |
| Golden broken for a long time                               | Verification red twice in a row on different culprits, or a bisect that names nothing | The pipeline round reverts every landing since `golden-verified` that touches a failing package, and re-lands the innocent ones. Landings continue meanwhile; cuts keep using `golden-verified`, which stays good.               |
| Tests never run before landing                              | Authors land broken tests more often                                                  | `test:changed` stays one command away. The revert rate is measured (step 14's trigger). The weekly restricted-CPU run stays the check for load sensitivity.                                                                      |
| Screenshot approvals on a moving target                     | A new cut or accept commit restarts the review or cancels CI                          | The cut is frozen during review. With composed approvals, an approval covers an image wherever it reappears. Previews only of the cut, and a stale preview is cancelled.                                                         |
| Multiple sessions landing at once                           | Conflicts and queue contention                                                        | The lock lasts seconds, and light gates run 4 at a time in about 15 min. A big landing still uses the freeze rule. `--priority` only for `priority:critical`.                                                                    |
| Disk                                                        | 10 GB worktrees, 93% full                                                             | Slimming and automatic cleanup (rows 25). Light gates need no test outputs.                                                                                                                                                      |
| Live-copy drift                                             | The gate and land tool run code no landing recorded (today 13 and 11 commits)         | The alarm in step 1. A gate or land change goes live and lands the same day.                                                                                                                                                     |
| CLAUDE.md on master lags golden by hundreds of commits      | Sessions follow instructions for a pipeline that no longer exists                     | Ship a cut as soon as step 1 lands. Pipeline-round reads the golden copy of the skills until then.                                                                                                                               |
| Both CI runs on near-identical trees disagree               | Verification green, cut CI red (or the reverse)                                       | The difference is master's newer commits or a flaky test. The cut's red is handled like a verification failure: quarantine, else bisect over the merge with master.                                                              |
| The release train runs while verification needs the runners | Slower verification                                                                   | Accepted. The release is the priority.                                                                                                                                                                                           |
| A public-repository workflow pushed from this machine       | `golden-candidate` runs with `secrets: inherit`                                       | Only the owner's token on this machine pushes those refs. Checks are named `Verify / ...`, so they can never satisfy master's required check.                                                                                    |
| No self-hosted runner                                       | No way to add capacity cheaply                                                        | Not needed: the 60 standard jobs run a full suite in 31 min. Paid overflow runners (RunsOn about $140 to $180 for September's usage) only if the yield rule starts costing more than an hour a day.                              |
