# graphty CI/CD: the integrated plan (as of 2026-10-23)

Status: superseded in most parts by `integrated-cicd-plan-v2.md` beside this file (2026-10-24),
which was written after full testing moved to CI (#3316). What still stands and what does not:

- Sections 1.1, 1.2, 1.3 and the short answers: superseded by version 2, sections 1 and 5. The
  landing runs the light gate, not selected tests. Verification runs in CI. The cut's CI keeps the
  full suite instead of one small test lane. The "known on golden" list is dropped.
- Section 1.4 (not copied from Anthropic): still stands; version 2, section 1.2 repeats it.
- Section 2 (mechanism audit): superseded by version 2, section 2. Nightly branch sync is kept
  (narrowed) instead of dropped, history selection is narrowed to a flaky-test listener, and selection,
  downstream deferral and pass reuse are dropped from the gate.
- Section 3 (rollout): superseded by version 2, section 6.
- Section 4 (speed): superseded by version 2, section 4.
- Section 5 (tier 3): superseded by version 2, section 3, which corrects it. The act() warning flood
  was the largest cause, "six times slower" was mostly more tests, the Escape fix reached golden at
  09:02 UTC on 10-23, there were 5 gate bypasses, and #3318 did not come from tier 3.
- Sections 6 and 7 (risks, owner decisions): superseded by version 2, section 7, and the owner
  decisions recorded since.

Original status: proposed. This plan joins every CI/CD change proposed or built in the week of
2026-10-16 to 2026-10-23 into one process: where it should end up, how to get there, what it
buys, and what it does not fix. It is written for a reader who did not follow the sessions that
produced the pieces. Every figure marked "measured" comes from the push log
(`tmp/push-log.jsonl` in the main checkout), the gate logs, CI run times or git history.

How changes land today is described in `golden-local.md` beside this file.

## Short answers

- **Does every proposed mechanism matter?** No. About 37 mechanisms were proposed or built. 14
  form the minimum set (section 2). Several duplicate each other: five ways of handling flaky
  tests, three full test runs of the same tree at every cut, two beta-site variants, three test
  selectors. Some fight each other: a duration check that measures against per-test limits
  another change raises to 180 seconds; a quarantine that retries locally while CI never retries.
- **Can it be simpler?** It can have fewer gates, not fewer pieces. The end state has five stages
  and one flaky-test list, but it also adds a bisect, a release re-run and a deploy change. The
  honest summary is "more pieces, fewer gates, each gate run once per environment".
- **Will it release changes faster?** Yes, but not to six hours yet.
    - **Measured today:** about 6.5 to 9.5 hours from commit to npm for a small change before any
      owner time, often a day or more; tier 3 has taken over 48 hours and is not on master.
    - **End state, if three conditions hold:** about 4 to 5 hours plus owner review time. The
      conditions, each with a check in section 4: the landing check takes under 25 minutes, at least
      80% of landings pass it on the first try, and a release attempt takes under 70 minutes.
- **Under six hours?** Only once rollout steps 1, 3, 4, 6 and 8 work and the three conditions
  above are measured true, and only when the owner reviews a cut within about 90 minutes in one
  round. Overnight, it will not. Nothing measured today supports it: the landing check that is
  already live passed 4 of 25 runs, in 106 to 133 minutes each.
- **Tier 3 root cause, in one sentence:** a 17-day, 1,386-commit branch was tested for the first
  time at landing, on a machine where its own new parallel shards, product slowness and timed
  waits made tests fail under load, through two blocking environments (local and GitHub) that
  failed differently, while golden stayed red so the fixes themselves could not land.

## 1. The end state

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

### 1.1 The stages

| Stage                                         | Where                                                           | What runs                                                                                                                                                                                                                   | Target                                                                   | Blocks?                                         |
| --------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| 1. Landing check (branch to golden)           | Local gate slot, outside the landing lock                       | Source checks; build and lint of affected packages; every deterministic check the change affects (API report, bundle size, knip, docs build when docs or exported types changed); only the test files the change can affect | owner target 10 min; measured today 106 to 133 min for a pass            | Yes                                             |
| 2. Verification (golden to `golden-verified`) | Local, one run at a time, over every landing since the last run | Full suite with coverage, local NVIDIA GPU, docs, screenshot preview                                                                                                                                                        | 90 min                                                                   | Not landings; cuts take only verified commits   |
| 2b. Confirm, bisect, revert                   | Local                                                           | Re-run the failure to confirm it reproduces, then bisect the batch's landing merges, then `land.mjs revert`                                                                                                                 | 30 min (measured today 50 min to 3 h)                                    | Reverts automatically, only a confirmed culprit |
| 3. Cut CI (cut to master)                     | GitHub                                                          | Build, lint, checks (API report, bundle size, Cost Estimate Accuracy), docs and links, security, screenshot capture and gate, and one small test lane of CI-only-failure-prone tests                                        | owner target 10 min; floor today about 45 min                            | Yes                                             |
| 4. Release train                              | GitHub                                                          | Full suite, T4 GPU, Hosts, macOS autosave, audit, LLM tests; one re-run of failed files under the same concurrency; quarantine for confirmed flakes                                                                         | measured 61 to 66 min before tier 3; full CI runs now take 88 to 106 min | Yes, for npm and the site                       |
| 5. Deploy                                     | GitHub Pages, from the release run                              | The candidate's own build artifacts, then the npm publish                                                                                                                                                                   | 3 min                                                                    | A failed deploy holds the publish               |

What changes from today:

- **The full suite moves out of the landing.** Today a golden push runs it under a
  machine-wide lock. In the end state it runs once per batch, after landing.
- **CI before master runs one small test lane, not 18 test jobs.** The owner asked for "minimal
  tests in ci/cd before merging to master", not none.
- **graphty.app deploys from the release run**, not from every green master build.
- **The release train also starts on CI success of a cut merge.**
- **A red release re-runs once, then the pipeline round finds and reverts the cause.**

### 1.2 Each stage in more detail

**Stage 1: the landing check.**

- `land.mjs land <branch>` runs the check in a gate slot without the landing lock. File-level
  selection (`tools/test-select.mjs`) and the short lock are already live since about 21:56 UTC
  on 2026-10-22, in `.worktrees/land-check-1` to `-3`. What is new is listed below.
- **Downstream packages' tests go to verification.** A graph-io change no longer drags in every
  dependent package's suite. Decided here; it is reversible.
- **Every deterministic check the change affects runs here.** 20 of the 52 failed golden and cut
  gates since 2026-10-21 failed a step that is not a test: SonarQube 7, the API report 5, bundle
  size 4, docs 2, workflow tests 1, a refused push 1. These are cheap and deterministic, so
  finding them at verification would waste a bisect each.
- **Raising a budget or allowlisting a check is reviewed like lengthening a wait.** Two bundle
  budgets were raised and an API report allowlist added during tier 3 to get past failures.
- **Source checks measure the landing against `origin/golden`, not `origin/master`.** Today
  `land.mjs` sets `PUSH_BASE_REF=origin/master`, so SonarQube and the secret scan cover
  everything golden holds that master lacks, and that cost grows with every landing between
  cuts. Three golden landing failures on 2026-10-23 were SonarQube findings on code that was not
  the landing's own.
- **Passes are stored by an input hash**, so identical content is never tested twice (once
  rollout step 3 makes the hash work).
- **The golden push itself** runs the source checks plus a lookup that this landing's check
  passed on this exact merge base. If golden moved in between, the selected check runs again on
  the new merge. It is never skipped. This is what makes the lock last seconds.
- **A landing whose only failures are tests already failing on golden's tip passes**, printed
  `[KNOWN]`. Without this, a red golden blocks the very fixes that would turn it green (section
  5). This excuse is honored only here; never in verification, the cut or the release.
- Coverage thresholds are checked at verification, not here.

**Stage 2: verification.**

- After each landing, `verify.mjs` starts a full run on golden's tip, or queues one.
- One verification run at a time. Load is capped in **test slots**, not in "full suites": a
  graphty-element landing already selects about 376 of its 416 browser tests, which is a full
  suite in all but name.
- Verification runs under a fixed CPU share or with its shards pinned to cores, so its result
  does not depend on whether a phase landed on a performance or an efficiency core (the Pajek
  scaling test swings about 2x between them).
- The screenshot preview runs alongside the suite in a browser slot and is the preview the cut
  reuses. Its time counts in the 90 minutes; measure both before stage 3 relies on them.
- **A run whose only failures are quarantined tests counts as verified.**
- **Acceptance bar before cuts depend on it:** at least 90% of verification runs green (with
  quarantine on) over one week. Measured since 2026-10-21: golden passed 20 of 65 gates (31%).

**Stage 2b: confirm, then bisect, then revert.**

Neither failure that verification found on 2026-10-23 came back when the bisect re-ran the same
commit (fb0c1af6, InspectorAndTable; c792fdd6, a camera test). Both were timing races, and
re-running only the failing files puts less load on the machine than the full run did. So:

1. **Confirm.** Re-run the failing files five times at the failing commit under the same
   concurrency as the full run (the other shards running beside them). Not failing every time
   means intermittent: it goes to quarantine (section 1.3), not to bisect.
2. **Bisect** only a failure that reproduces every time. Probes are golden's first-parent
   `land:` merges only, never the sync merges of origin/master. A culprit must fail every time and
   its parent pass every time.
3. **Non-test failures** (coverage thresholds, docs, TypeDoc, downstream type errors, build,
   lint) re-run the failing step at each probe, not test files.
4. A bisect stops itself when golden moves past it or its failure is already reverted.
5. The pipeline round reverts the confirmed culprit straight away.

The 30-minute target is a goal. Measured bisects took 50 minutes, 2.5 hours and 3 hours, and
the stuck one held two slots for 5 hours. The target is met only when rollout step 4's check
says so.

**Stage 3: the cut.**

- `land.mjs cut` points `golden-cut` at the newest verified, screenshot-stable commit. A
  verified commit is not gated again (closes #3273).
- **The cut is frozen while the owner reviews it.** Moving it mid-review restarts the review;
  #3234 took six accept rounds over about 10 hours, #3238 three, #3246 five on two days.
- **A fix for a cut lands on golden, and the cut moves to the next verified commit.** `cut-fix`
  is retired: a cut carrying commits golden lacks is a second trunk, and it refused the fix twice
  in tier 3 (#3286).
- **At most three CI fix rounds per cut.** After the third, the cut is dropped and the cause is
  fixed as a class on golden.
- **The one CI test lane** holds tests with a record of failing only on GitHub (for example the
  graphty-element browser smoke tests). It is chosen from the ledger, kept under 10 minutes and
  runs beside the visual job, so it does not lengthen the critical path.
- **Measured critical path with no tests:** Build 18 min, then Storybooks 5, then the visual job
  (the graph-io fidelity capture alone takes 20), with Links after Storybooks and Docs: about
  43 to 45 minutes. Cut CI runs on 2026-10-23 took 25 to 77 minutes. The owner's 10-minute target
  needs the 18-minute Build to fall first: restore from the nx cache, or upload verification's
  build. Splitting the capture shortens only the last link (owner decision, section 7).

**Stage 4: the release train.**

- Starts at 00:00, 06:00, 12:00 and 18:00 UTC, and on CI success of a cut merge. While a hold is
  open, a cut merge is the existing "restart a held train" path; a fix for a release hold ships
  as a pipeline-only cut with no image changes so it needs no new screenshot review.
- **A failed test file is re-run once, under the same concurrency.** If it passes, it is a flake:
  the train records the verdict in its run and in the test's issue, and goes ahead. The pipeline
  round lands the list entry on golden (CI cannot push to golden). Until it lands, the train
  honors an allow list read from the open quarantine issues.
- **No quarantine at release for a test whose file, or the files it selects, changed since the
  last release tag.** A new intermittent bug from this batch must not be quarantined and shipped.
  It is treated as a deterministic failure.
- **GPU tests are never quarantined** (as `tools/test-quarantine.mjs` already says).
- **A deterministic failure holds the train**, as today. The pipeline round then:
    - reproduces it locally and uses the stage 2b bisect when it can (one bisect implementation);
    - when it fails only on GitHub, dispatches one matrix run of the failing files at the batch's
      `land:` merges (one dispatch, not one call per commit, for the GitHub API budget). Each probe
      needs its own 18-minute build unless it restores verification's build: allow 30 to 45 min;
    - for T4, Hosts or macOS failures, does not bisect in parallel (one paid T4, 5 macOS runners,
      4 used by Hosts): at most 3 serial probes, otherwise revert the release batch's suspect
      landings and re-land the innocent ones;
    - reverts on golden, cuts, and ships. **The owner is needed for that cut's Finish** whenever
      the revert changes images, until composed approvals (step 9) are live.

**Stage 5: deploy.**

- The release run deploys the candidate's own build artifacts (it already has them; today's
  `deploy-pages.yml` reads artifacts by the master push run's id, which a call from the release
  does not have). The push-to-master trigger is removed, so the release's version merge never
  deploys an untested master tip.
- Order: deploy, then publish. graph-samples downloads its datasets from graphty.app, so a
  package version must never exist before its data. A failed deploy is a deploy hold that stops
  the publish; this couples npm to GitHub Pages, which is accepted.
- If the owner keeps the beta-site request (section 7), the release deploys beta.graphty.app
  and the owner promotes it to graphty.app by hand; the hosted datasets then deploy with the
  release on their own path so packages never wait for a promotion.

### 1.3 Eventual consistency at release time

Each layer may hold a defect briefly; something automatic removes it before a user sees it.

| Layer               | May be broken?                                                                    | For how long                                 | What repairs it                                  |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| A branch            | Yes                                                                               | the author's problem                         | the landing check                                |
| golden              | Yes: a landing whose selected checks passed but whose full suite fails            | one verification run plus a confirmed bisect | revert of the confirmed culprit                  |
| master              | Only with defects local verification cannot see (GitHub-only, T4, macOS, Windows) | until the next release attempt               | re-run, quarantine, bisect and revert            |
| npm and graphty.app | No                                                                                | n/a                                          | nothing ships unless every release lane is green |

**Two lists, with different reach:**

- **Quarantined (flaky):** a test failed and then passed on a re-run of the same inputs under the
  same concurrency. Read by every stage through `tools/ci-test-matrix.mjs`, including CI. Each
  entry has one `priority:high` issue asking for the mechanism (never "it was load"),
  deduplicated by test id. It leaves the list when its issue closes or after 20 passes in a row,
  never after a number of days. GPU tests are never quarantined. Only the owner adds a test by
  hand. Quarantine never hides a whole shard, a build or a lint error.
- **Known on golden:** a test failing on golden's own tip. Honored only by the stage 1 landing
  check, never by verification, the cut or the release. This matches today's
  `tools/test-ledger.mjs`, which excuses failures "never under PREPUSH_ALL=1 (verification),
  PREPUSH_EXONERATE=0, or a push to the cut or master".

**Quarantine is not working today and must be fixed first.** Every quarantine result file for a
failed shard in the landing-check worktrees (graphty-1, -2, -3, graphty-element-browser-2) reads
`"retried": false, "ran": [], "failed": []`: the wrapper found no test reports for graphty's
vitest projects, so it never re-ran anything, and no gate log since 2026-10-22 has a
`[QUARANTINED]` line. It also skips the retry when more than five files fail
(`MAX_RETRY_FILES = 5`), which is the likely reason the 07:52 Undo failure was not re-run, and
its retry runs the failed files alone, where a load-sensitive test passes and is wrongly called
flaky. Fixes: find the reports where graphty writes them, retry under the same concurrency, and
keep the five-file limit only as "this is a breakage" for the landing check.

### 1.4 Deliberately not copied from Anthropic's process

- **Dropping the lock entirely.** One machine and a few dozen landings a day; a lock held for
  seconds is the right size.
- **Server-side source control.** Not needed at this scale.
- **Risk-tiered screenshot approval.** The owner approves every image; that is the owner's rule.
  Branch-signed and composed approvals make it cheaper without tiering it.
- **Feature flags on graphty-element options.** Its options are published API, so switches are
  limited to the app, internal code and options marked `@internal`.

## 2. Mechanism audit

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

Keep: stays. Merge: folded into another. Drop: removed. Defer: built only on a measured need.

### Landing and integration

| #   | Mechanism                                    | Verdict                  | Reason                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Golden-local landing (`land.mjs`)            | Keep                     | The trunk.                                                                                                                                                                                                                                                   |
| 2   | Push queue and the gate's live copy          | Keep, with an alert      | The live copy may hold code not on golden for one pipeline round. Alert on `git rev-list --no-merges origin/golden..<live> ^origin/master` being non-empty (release version commits on master must not trip it, as `push-queue.sh` line 66 already handles). |
| 3   | The land tool's live copy, the priority lane | Keep                     | Cheap and working.                                                                                                                                                                                                                                           |
| 4   | Gate input keys and pass reuse (#3266)       | Keep, fix first          | Reused 2 of about 30 shards on an identical tree; cause unknown. Step 3.                                                                                                                                                                                     |
| 5   | Test selection, advisory mode                | Merge into 6             | Its replay found no misses caused by a change; the mode it prepared is live.                                                                                                                                                                                 |
| 6   | File-level selection in the gate             | Keep                     | Stage 1, plus the downstream rule and the deterministic checks.                                                                                                                                                                                              |
| 7   | nx 24, affected by task                      | Keep, later (step 11)    | The owner asked on 2026-10-22 for a design including it. It is a second selector and ignores implicit dependencies, so it lands only after selection's miss rate is measured, and only if a test shows it honors `implicitDependencies`.                     |
| 8   | Test ledger                                  | Merge, smaller           | Keep the per-shard result record (quarantine, bisect and the CI lane choice read it) and the "known on golden" list. Drop history-based classification and selection. Correct its document's "no quarantine file".                                           |
| 9a  | Quarantine                                   | Keep, fix first, then CI | Broken today (section 1.3). Reaches CI through `ci-test-matrix.mjs`.                                                                                                                                                                                         |
| 9b  | Gate priority for test slots and CPU         | Keep                     | The cheapest load control.                                                                                                                                                                                                                                   |
| 10  | Verification, short lock, bisect             | Keep, fix                | Stages 2 and 2b: confirm before bisect, probes on `land:` merges, self-stopping, cap in test slots.                                                                                                                                                          |
| 11  | Pipeline-round and issue-round skills        | Keep, update             | The branch versions (watchdog, `lessons.md`, quarantine lines) must land; sessions run master's copy.                                                                                                                                                        |
| 12  | Nightly branch sync                          | Drop                     | About 16 gate runs a night. `land.mjs` already merges golden at landing; long branches are handled by the size and age warning (item 34).                                                                                                                    |
| 12b | The `golden-good` tag                        | Drop                     | Duplicates `golden-verified` and lags it.                                                                                                                                                                                                                    |
| 13a | Cut                                          | Keep, simplify           | No re-gate of a verified commit; frozen during review.                                                                                                                                                                                                       |
| 13b | `cut-fix`                                    | Drop                     | Fixes land on golden; the cut moves.                                                                                                                                                                                                                         |
| 13c | `ship` refuses an unverified cut             | Keep                     | Keeps "verified" meaningful. Tier 3 went around it.                                                                                                                                                                                                          |
| 13d | Release reuses the cut's CI result           | Drop                     | The cut's CI no longer runs the suite.                                                                                                                                                                                                                       |
| 14  | Golden may be briefly broken                 | Keep                     | The eventual-consistency model.                                                                                                                                                                                                                              |

### CI and release

| #   | Mechanism                                                | Verdict                 | Reason                                                                                                                                                                     |
| --- | -------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | CI test split                                            | Keep, re-measure        | Meant to cut the longest test path from 71 to about 17 min, but a dispatch on 2026-10-23 spent 44 min in one group job after an 18-minute Build. Measured again in step 5. |
| 16  | Short CI before master                                   | Keep                    | Stage 3, with one small test lane.                                                                                                                                         |
| 17  | Release holds and restarts                               | Keep, extend            | Re-run once, quarantine with the changed-file rule, start on cut merge.                                                                                                    |
| 18  | Master guard                                             | Keep                    | Remove its Mergify freeze.                                                                                                                                                 |
| 19  | Mergify leftovers in `ci.yml`                            | Drop                    | Dead code and an unread fourth flaky-test channel.                                                                                                                         |
| 20  | Hosts on pull requests                                   | Drop from pull requests | Nightly and release only; move the nightly off release hours.                                                                                                              |
| 21a | Weekly restricted-CPU stress run                         | Keep                    | The check that "not load sensitive" holds. Gates nothing.                                                                                                                  |
| 21b | Nightly and hand-run flake hunts                         | Drop                    | Quarantine's re-run finds flakes where they happen.                                                                                                                        |
| 22  | Time-budget reporter and duration guard                  | Replace both            | Both measure against a test's own limit, which #3284 raises to 180 s; they go blind. Replaced by the two report-only checks below.                                         |
| 23  | Waits with no racing deadlines (#3284) and its lint rule | Keep, reconcile         | See the note below.                                                                                                                                                        |
| 24  | Private Vite cache per shard                             | Keep, generalize        | Rule: anything a test run writes is private to that run. Step 4 audits every package for shared writable state.                                                            |
| 25  | Docs build in the gate                                   | Merge into 6 and 10     | Landing check when docs or exported types change; always at verification and CI.                                                                                           |
| 26  | CodeQL finding in `ci.yml` (#3261)                       | Keep                    | Part of stage 3's security checks.                                                                                                                                         |
| 33  | SonarQube on changed lines                               | Keep                    | Base moves to `origin/golden` for landings; time measured in step 1.                                                                                                       |

**#3284 and the owner's "never lengthen wait deadlines".** #3284 replaces per-wait deadlines
(1 s) and per-test limits (15 s) with hang guards (60 s per wait, 180 s per test). A wait no
longer races the product's own delays, which is the point, but the numbers are larger. This plan
reads a hang guard as "the test is stuck", not as a deadline the test is expected to meet, and
asks the owner to confirm (section 7). Its cost: a broken wait now takes 60 s to fail, which
lengthens failing runs and bisects, and the 15-second limit was the signal that found
VaryByLayer spending 11 of its 15 s in style events. That signal is replaced, not lost:

- **Counted-work assertions** on hot paths: `style:changed` events per edit, repaints per
  action, frames per glide. Deterministic and load-insensitive; they would have caught the
  per-layer style events directly.
- **Report-only timing in verification:** an issue when a test's median time doubles and rises
  by over 5 s against the previous verification, and an issue for any new test whose median
  exceeds 10 s. Load spreads shard times up to 7x, so timing never blocks.

React act() warnings are not turned into errors: graphty's test setup deliberately sets
`IS_REACT_ACT_ENVIRONMENT` to false, because the real-input tests CLAUDE.md requires update state
outside act() by design.

### Screenshots, the site and long branches

| #   | Mechanism                                   | Verdict                    | Reason                                                                                                                                                                                                                                         |
| --- | ------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27  | Composed screenshot approvals (#3264)       | Keep, owner reviews        | Without it every revert and every combined batch needs the owner again. It is trusted code: the owner reviews the diff, and a test proves the gate refuses a composed tree holding an image nobody signed.                                     |
| 28  | Capture and sign screenshots on the branch  | Keep (owner's request)     | The owner asked on 2026-10-22 for screenshots "in branches ... signed based on the branch commit". It takes the owner's review off the cut, which is the bottleneck left (section 4). Step 10. Trusted code, owner reviews.                    |
| 29  | Visual preview, single-passkey Finish       | Keep                       | #3279 stays a normal issue.                                                                                                                                                                                                                    |
| 30  | beta.graphty.app                            | Owner's request, open      | The owner asked for a new repository with delegated DNS and manual promotion. Its costs are in section 7. If kept, the second (automatic promotion) variant is dropped.                                                                        |
| 31  | Dry-run script (#3268)                      | Merge into 32              | Lands as a tool agents may run; not in the gate.                                                                                                                                                                                               |
| 32  | AI-checked acceptance tests (#3272)         | Defer                      | A superset of 31; design lands marked "Proposed".                                                                                                                                                                                              |
| 34  | "Big landings" CLAUDE.md section            | Keep, trimmed              | Pieces behind a switch; merge `golden-verified` daily; `land.mjs` warns above 3 days or 300 non-baseline files and refuses without `--big`. Drop "hunt before cutting" and "use cut-fix".                                                      |
| 35  | "Quarantined tests" CLAUDE.md section       | Keep                       | The owner asked for it.                                                                                                                                                                                                                        |
| 36  | No admin merge, no bypass                   | Keep, write into CLAUDE.md | Today only in memory and chat.                                                                                                                                                                                                                 |
| 37  | Fast-pipeline design (#3262)                | Revise                     | Adopt this plan's decisions and the owner's five targets.                                                                                                                                                                                      |
| 38  | Design-studio skill                         | Change                     | It merges origin/master, not golden, and commits session screenshots to the branch. It should merge `golden-verified`, land after every pass (its existing rule, which tier 3 did not follow), and keep screenshots in Git LFS or outside git. |
| 39  | Large-file check                            | Add                        | A source check refuses more than 200 new binary files in a push outside `visual-baselines/` and Git LFS. Tier 3 carried 82,908 PNGs.                                                                                                           |
| 40  | Step times and load average in the push log | Add                        | Nothing in section 4 can be checked without them.                                                                                                                                                                                              |

**The minimum set (14):**

1. landing with the short lock and the stage 1 checks;
2. file-level selection, downstream tests left to verification;
3. pass reuse by input hash, once fixed;
4. one verification run at a time, capped in test slots;
5. confirm, bisect and revert;
6. one quarantine list shared with CI, plus the landing-only "known on golden" list;
7. gate priority;
8. waits that do not race (#3284) with counted-work assertions;
9. a frozen cut with no re-gate and no `cut-fix`;
10. short CI before master with one small test lane;
11. a release train with one re-run and a start on cut merge;
12. deploy from the release run;
13. composed and branch-signed approvals;
14. the pipeline round as first responder, with `lessons.md`.

## 3. Rollout

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

Order matters because the live copies run code no landing has recorded, and sessions read
CLAUDE.md and the skills from master, so a rule reaches them only after a cut merges. Tier 3 is
**not** a prerequisite: steps 1 to 4 start on golden now.

**Step 0. Tier 3 (#3246) as an ordinary cut.** Cut CI failed twice more on 2026-10-23 (16:29 and
17:35 UTC). It gets at most three more CI rounds; after that, the cut is dropped and its
remaining failures are fixed on golden like any other. The 3-second tooltip wait it carries is
removed in step 2. Undo: master guard's revert.

**Step 1. Land what is running, in pieces.** The gate's live copy (`4964e5082f`) is 381 commits
ahead of golden (61 files, 14,311 lines, about 25 merged branches); the land tool's copy is 370
ahead. Landing that as one branch would be a second big-bang landing judged by its own code.
Instead:

1. Record each live copy's commit as its restore point for `tools/live.sh`.
2. Land in groups split by tool (push queue and gate; land tool and verification; quarantine and
   ledger; test selection), each with `land.mjs land --dry-run` first, each through the
   **current** live copy.
3. Land the instructions separately: CLAUDE.md (quarantine, Big landings, no bypass, the hang
   guard rule), the two round skills, this plan and the ledger correction.
4. Mark or close the source branches so issue-round does not pick them up again.
5. Add step times, load average and the CPU-core type to `push-log.jsonl`.
6. **Blocking check before step 6 or 8 relies on it:** quarantine re-runs a failed graphty
   shard, verified by a planted flaky test in the graphty project on a branch.

- **Check:** `git rev-list --no-merges origin/golden..<live> ^origin/master` is empty for both
  copies; the next landing's push log has step times; the planted flaky test is quarantined.
- **Undo:** `land.mjs revert <group>`, then `tools/live.sh gate <restore point>`.
- **Then:** ship it in the next pipeline-only cut (no image changes).

**Step 2. The no-timed-wait lint rule, alone.** Land only the rule from #3284, applied to changed
lines, before the 939 rewrites. Replace the 3-second tooltip wait with a wait on the tooltip.
This answers the owner's question "why didn't our mechanism prevent this?": the rule had not
landed, so nothing enforced it. Then land the rest of #3284, merged with golden, once the owner
confirms the hang guards (section 7). Add counted-work assertions to the paths tier 3 found slow.

- **Check:** lint clean; the starved-process reproduction from commit fab203f0b5 (vitest's Node
  process starved of CPU, 41 tests) run again after #3284 shows zero failures; the next weekly
  stress run files no new load-sensitive issue in the graphty or graphty-element shards.
- **Undo:** revert; the rule and its rewrites revert together.

**Step 3. Diagnose and fix pass reuse.** Replay the 03:02 UTC cut gate's input keys against the
landing check's records for the same tree (git tree `4bab9058`) and find which part differed
(suspects: build outputs that differ between worktrees, passes never recorded). Fix the key, or
record passes from verification too. Move landing source checks to `origin/golden`.

- **Check:** a re-land of the same tree skips every shard; a cut of a verified commit skips at
  least 90%.
- **Undo:** `PREPUSH_RERUN_ALL=1`.

**Step 4. Make verification and bisect safe on one machine.** Confirm before bisect; probes on
`land:` merges; non-test failures re-run their step; self-stopping bisects; the cap in test
slots; verification pinned or under a fixed CPU share; the two report-only timing checks; an
audit of every package for writable state shared between parallel runs (the class the Vite cache
race belongs to); a "known on golden" pass rule in the landing check; the golden-push gate mode
(section 1.2).

- **Check, over one week:** no bisect older than 45 minutes; median verification 90 minutes or
  less; at least 90% of verification runs green; no revert of a landing that a later run showed
  innocent.
- **Undo:** revert; verification runs unbounded as today.

**Step 5. Clean up CI.** Remove Mergify's queue logic, upload step and freeze; take Hosts off
pull requests and move its nightly time; fix #3261; wire quarantine into `ci-test-matrix.mjs`;
re-measure the CI test split on post-tier-3 code.

- **Check:** `grep -ri mergify .github/workflows` is empty; a quarantined test fails in a
  dispatch run without failing its job; a full dispatch's longest test job is recorded.
- **Undo:** revert.

**Step 6. Change the release train.** One re-run under the same concurrency; the changed-file
rule; quarantine verdicts recorded in the run and issue, and an allow list read from open issues;
the GitHub-only bisect dispatch; a start on CI success of a cut merge. Workflows take effect only
on master, so dispatch it on its branch first.

- **Check:** a dispatch with a planted failing test on a branch names the right landing within
  45 minutes; the next cut merge starts a train within 15 minutes; one post-tier-3 release
  attempt time is recorded.
- **Undo:** revert; the train returns to its schedule.

**Step 7. Deploy from the release run.** Remove the push trigger; deploy the candidate's
artifacts; deploy, then publish; a deploy hold.

- **Check:** after a release, graphty.app's build id is the released commit; a master merge with
  no release leaves it unchanged.
- **Undo:** restore the trigger.

**Step 8. Short CI before master.** The cut's CI drops its 18 test jobs and runs the one small
lane. Depends on steps 1 (quarantine works), 6 and 7: without them this ships untested code to
graphty.app or leaves the release unable to recover.

- **Check:** `All Checks Pass` on the next cut within 50 minutes of the push (20 with the
  capture split and a cached Build).
- **Watch:** two trains in a row held on GitHub-only test failures means the lane is too small;
  widen it.
- **Undo:** revert the `ci.yml` change.

**Step 9. Composed approvals (#3264).** Owner reviews the trusted diff. A test proves the gate
refuses a composed tree containing an unsigned image.

- **Check:** a revert cut whose images all match earlier signed images passes with no new
  Finish (from the second pull request after it reaches master).

**Step 10. Branch-signed screenshots, small-branch rules, the design-studio skill, the large-file
check.**

- **Check:** a branch whose images were signed on its own commit lands and cuts with no further
  Finish when nothing it signed changed; no landing in two weeks over 300 non-baseline files
  without `--big`.

**Step 11. nx 24**, only after selection's miss rate is measured (risk 4) and a test shows
implicit dependencies are honored.

Every step lands through the normal path. None uses `--no-verify` or an admin merge. The pipeline
round watches each step's check and records what it learned in `lessons.md`.

## 4. Speed

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

All figures are minutes unless marked. "Measured" means the push log, gate logs or CI runs since
2026-10-15; everything else is an estimate.

### Commit to golden

|                   | Measured today (short lock and selection live)                   | After steps 1 to 4, if the conditions hold |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| Source checks     | 9                                                                | under 5 (base moves to golden)             |
| Queue             | about 8                                                          | under 5                                    |
| Landing check     | 106 to 133 for a pass; 4 of 25 passed since 2026-10-22 21:56 UTC | 15 to 25                                   |
| Attempts          | about 2 even at the pre-tier-3 47% pass rate                     | 1 for at least 80% of landings             |
| **Typical total** | **about 3 to 4 h**                                               | **30 to 45 min**                           |

The owner's 10-minute target is not met by anything planned here. Build and lint take about 11
minutes and graphty-element's selection picks 376 of its 416 browser tests. Reaching 10 minutes
needs a build restored from the nx cache, SonarQube under a minute, and finer selection in
graphty-element. Step 1's step times say which to attack first.

### Golden to master

|                                         | Measured today                                        | End state                                                             |
| --------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| Wait for the next cut                   | depends on cadence: 2 cuts reached master in 5.5 days | 0 to the time until the next cut                                      |
| Wait for verification                   | none (not landed)                                     | 0 to 90 for the run in progress, then 67 to 120 measured; typical 120 |
| Cut gate                                | 81 (p90 143)                                          | 0                                                                     |
| Screenshot preview                      | 65 median                                             | 0 (verification's preview is reused)                                  |
| Owner review                            | 3 to 6 rounds per cut, hours each                     | 1 round once the cut is frozen; less with branch signing              |
| CI                                      | 25 to 77                                              | about 45; about 20 with the capture split and a cached Build          |
| **Typical total, apart from the owner** | **a day or more**                                     | **about 3 h**                                                         |

### Master to npm and graphty.app

|             | Measured today                                              | End state                                                                                   |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| npm         | 0 to 6 h wait, then 61 to 66 min (pre-tier-3)               | one attempt, started on merge; 70 min if the condition holds, about 100 at today's CI times |
| graphty.app | 13 to 14 min after merge, never tested by the release lanes | with the release                                                                            |

### End to end

- **Measured today, recomputed from the stages:** landing about 3 to 4 h, verification 1.1 to
  3.3 h, cut CI about 0.75 h, release about 1.75 h: **about 6.5 to 9.5 hours before any owner
  time.**
- **End state:** about 4 to 5 hours plus the owner's review, **if** the landing check takes
  under 25 minutes (step 1 step times), at least 80% of landings pass first try (push log, one
  week), and a release attempt takes under 70 minutes (step 6). Each is measured before the
  claim is made.
- **Not under six hours when:** the cut waits for the owner overnight (the main cause); the
  change lands just after a cut and waits for the next; a batch fails verification (a confirmed
  bisect plus revert plus re-verification adds about 2 hours for the innocent changes); a release
  lane fails deterministically (2 to 4 hours, and an owner Finish if images change); the change
  is a large branch; the machine is saturated beyond the slot cap.

### Throughput

- **Today:** 69 passing golden gate runs out of 174 in 7 days, about 10 passes a day (one pass
  can carry several batched branches).
- **Landing ceiling:** verification and bisect take one or two of the three gate slots, leaving
  one or two for landings. At today's 110 minutes a slot, that is 20 to 30 landings a day at best;
  at 20 minutes, 70 to 140, bounded first by the four machine-wide test slots.
- **The owner's review cadence bounds cuts,** and so releases. Branch signing (step 10) is the
  change that moves most of that review off the critical path.

## 5. Tier 3: root causes, and whether the end state prevents them

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

### 5.1 What happened, in numbers

- The owner asked for the landing at 10:08 on 2026-10-21. Tier 3 reached golden 12.9 hours later
  and the cut 17.5 hours after that. It was not on master 48.8 hours after the request.
- 82 gate runs on golden, the cut and verification; 64 gate-hours in 48.8 hours; up to 6 gates
  at once. One identical tree was fully gated five times (about 7.3 gate-hours).
- 52 golden and cut gates failed; 20 of them on a step that is not a test.
- CI on the cut: 7 runs (3 cancelled, 4 failed) by 2026-10-23 morning, two more failed later.
- About 22 distinct local test failures and 6 CI test failures plus a docs failure; about 19 of
  the local ones never appeared in CI and 2 CI ones never appeared locally (a small CI sample).
- From 12:56 UTC on 2026-10-22 to 06:49 UTC on 2026-10-23, about 1 golden landing in 22 passed.
- `--no-verify` was used four times, each with the owner's consent.

### 5.2 Root causes

| Root cause                                                                                              | Evidence                                                                                                                                                                                                                                                                                                                                               | Prevented by the end state?                                                                                                                | Still open                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A 17-day, 1,386-commit branch tested first at landing                                                   | Proven. The design-studio skill already said "land after every pass"; tier 3's only branch push (2026-10-13) failed formatting and SonarQube and was not retried until 2026-10-21; the skill merges origin/master, so the branch drifted from golden by design                                                                                         | Mostly: size and age refusal, the skill change, daily merge of `golden-verified`                                                           | An agent passes `--big`; published graphty-element API cannot hide behind a switch. Why the studio stopped landing after each pass is not yet known |
| **Golden stayed red, and the fixes could not land**                                                     | Proven. KeyboardStopsEscape failed 8 times; its fix (1687cd5ce0) was committed 17:16 UTC 2026-10-22 and reached golden about 05:05 UTC 2026-10-23; gates at 18:50 and 03:18 failed on it on commits without the fix                                                                                                                                    | Yes, by the landing-only "known on golden" pass rule                                                                                       | Only once step 4 lands it. The short lock alone did not help: the worst stretch (4 passes in 31) came after it went live                            |
| Deterministic non-test failures found late (SonarQube, API report, bundle size, docs, workflow tests)   | Proven: 20 of 52 failed gates. Two bundle budgets were raised (4bb97c0d96, 89c78a689e) and an API report allowlist added (d0b1a36692) to pass                                                                                                                                                                                                          | Yes: stage 1 runs them for what the change affects; raised budgets reviewed                                                                | A check that only fails on the combined tree, caught at verification                                                                                |
| Machine load from parallel shards and agents                                                            | **Proven contributor.** Starving vitest's Node process of CPU (fab203f0b5) reproduced the gate's signatures: 19 of 41 tests failed with the warning flood, 10 of 41 still failed without it. Hybrid performance and efficiency cores swing one test about 2x                                                                                           | Partly: waits that do not race (#3284), verification pinned or under a fixed CPU share, a slot cap                                         | Verified only after step 2's re-run of the starved check. Agents' Storybooks and browsers are outside the cap                                       |
| The pipeline's own new concurrency                                                                      | Proven. The shared Vite cache race exists only because graphty-1, -2 and -3 run side by side in one checkout; that three-way split (7fd040f7b6) arrived with tier 3                                                                                                                                                                                    | Yes for the Vite cache (private per shard, 241558a862); the class by step 4's shared-state audit                                           | Any new concurrency (three landing slots, verification, bisect) is checked for shared state before it is added                                      |
| Waits racing deliberate product delays (tooltip 1000 ms open delay against a 1000 ms find, Undo, focus) | Tooltip proven; others plausible                                                                                                                                                                                                                                                                                                                       | Yes once #3284's lint rule lands (step 2)                                                                                                  | Helpers that build their own deadline (`waitForStableFrame`'s 30 s, #3287) and scratch scripts                                                      |
| UI state leaking between tests (an open tooltip, focus, a pointer resting on a control)                 | Proven (fixed for one test in 1687cd5ce0)                                                                                                                                                                                                                                                                                                              | Not yet                                                                                                                                    | A harness reset of hover, focus and open popovers after each test; its own issue                                                                    |
| Product slowness making tests borderline                                                                | Proven and fixed: the act() warning flood (fab203f0b5: the Sections test 77 s to 34 s, the graphty-2 shard 660 s to 492 s); one `style:changed` per edit instead of per layer (1255dd9f10: the 40-color case 8.0 s to 2.0 s); a glide timed by the clock, not frames (f12e7f79b4). Plausible, unfixed: `readPixels`, menus at 10 to 20 frames a second | Partly: counted-work assertions catch the per-layer class                                                                                  | `readPixels` and slow menus                                                                                                                         |
| Tests near the old 15 s limit                                                                           | Proven: split in a087ff5c86, 57508f82a0 and the College football test                                                                                                                                                                                                                                                                                  | Partly: hang guards replace the limit, report-only timing flags new slow tests                                                             | Owner confirms the hang guards (section 7)                                                                                                          |
| Two blocking environments failing differently                                                           | Proven that local passes did not predict CI, on a small CI sample                                                                                                                                                                                                                                                                                      | Yes for merging: each environment's full suite gates once (local at verification, GitHub at release), with one small CI lane before master | GitHub-only failures now hold the release; steps 6 and 8's watch rule cover it                                                                      |
| The dead-port test freed its port before using it                                                       | Proven                                                                                                                                                                                                                                                                                                                                                 | Fixed in the cut; reaches golden with it                                                                                                   | Similar races on a shared runner                                                                                                                    |
| Golden moved during long gates (8 landings, 7 conflicts)                                                | Proven                                                                                                                                                                                                                                                                                                                                                 | Partly: short lock, short checks                                                                                                           | A big branch against a fast golden                                                                                                                  |
| Identical trees re-gated                                                                                | Proven; why reuse failed unknown                                                                                                                                                                                                                                                                                                                       | After step 3                                                                                                                               | If the key cannot be made stable, #3273's "never re-gate a verified commit" is the fallback                                                         |
| `cut-fix` refused the fix                                                                               | Proven                                                                                                                                                                                                                                                                                                                                                 | Yes, retired                                                                                                                               |                                                                                                                                                     |
| Review-page Finish commits cancelled running CI                                                         | Proven                                                                                                                                                                                                                                                                                                                                                 | Partly: a frozen cut and a shorter CI                                                                                                      | Having Finish push somewhere other than the cut is trusted code; worth its own issue                                                                |
| Gate tools broken live; live copies ahead of golden                                                     | Proven                                                                                                                                                                                                                                                                                                                                                 | Yes: step 1 plus the alert                                                                                                                 | Emergency `live.sh` changes that never land                                                                                                         |
| SonarQube crashed on the PNG-heavy branch                                                               | Proven: E2BIG from 100,528 changed paths in one git call, fixed by batching (324c5909c4). The PNGs were the volume, not the cause                                                                                                                                                                                                                      | Yes: batching; the large-file check removes the volume                                                                                     |                                                                                                                                                     |
| Serial discovery of intermittent failures                                                               | Proven                                                                                                                                                                                                                                                                                                                                                 | Partly: a working quarantine absorbs flakes in one run                                                                                     | Deterministic failures in a big branch are still found one at a time                                                                                |
| Owner on the critical path                                                                              | Proven: 3 to 6 accept rounds per cut                                                                                                                                                                                                                                                                                                                   | Partly: frozen cut, composed and branch-signed approvals                                                                                   | Owner availability remains the bottleneck                                                                                                           |

### 5.3 Where this analysis may still be wrong

- **Which fixes got tier 3 through.** Tier 3 passed verification at aed6fe9d (13:12 UTC
  2026-10-23) without #3284; the credit belongs to the product, harness and test-design fixes in
  the table. #3284 is a prevention for the future, not the fix that worked.
- **The CI sample is small** (about 8 runs). The plan does not depend on "different populations":
  it gates each environment's full suite once.
- **The verification acceptance bar may not be reachable** at today's 31% golden pass rate. If
  one week with a working quarantine stays under 90%, cuts cannot depend on full verification,
  and the next move is to find which shards fail, not to lower the bar.
- **Pass reuse's failure is unexplained.** Every speed figure assuming reuse depends on step 3.

## 6. Risks and problems ahead

Superseded by `integrated-cicd-plan-v2.md`; see the status note at the top.

1. **Verification is the safety net.** If it stops, golden fills with unverified landings and no
   cut can be taken: safe but slow. The pipeline round restarts it when `golden-verified` is more
   than two hours behind; with no session running nothing restarts it, which CLAUDE.md should
   state.
2. **GitHub-only failures surface at release.** If common, every train holds. Watch rule in step 8.
3. **Quarantine hides real intermittent bugs.** Each entry has a `priority:high` issue; alert the
   owner when more than 10 are quarantined at once or one test twice in 30 days; never quarantine
   a test the change touched, and at release, never one changed since the last release tag.
4. **Selection or reuse misses an input.** Track the share of verification failures whose
   culprit passed its landing check; above 20%, widen selection.
5. **Automatic reverts and screenshots.** Before composed approvals every image-changing revert
   needs the owner; prefer reverting before the change is cut.
6. **A wrong revert.** A bisect on an unconfirmed failure reverts an innocent landing. The
   confirm step and the "fails every time, parent passes every time" rule guard it.
7. **The deploy couples npm to GitHub Pages**, and graphty.app's docs and Storybook lag master
   until the next release. Confirm that freshness is acceptable.
8. **Starting a release on every cut merge** costs one paid T4 run per cut (accepted: every
   release runs T4) and 4 of 5 macOS runners; move Hosts' nightly off those hours.
9. **The pipeline's own load:** landing checks, verification, bisect, agents' Storybooks and
   studio workflows. The cap covers gate work only. Record load (step 1) before blaming anything.
10. **Instructions lag** until a cut merges. Ship pipeline-only cuts promptly.
11. **Landing the gate through the gate.** Each group in step 1 is judged by the current live
    copy, with a restore point for `live.sh`.
12. **Hang guards slow failing runs** (60 s per stuck wait), lengthening bisects.
13. **Time zones.** A change landed late Pacific time reaches npm next morning at the earliest,
    unless branch signing has already covered its images.
14. **GitHub API budget** (5,000 requests an hour, shared). The release bisect uses one matrix
    dispatch; status comes from the local pull-request status broker's file.

## 7. Owner decisions

Decided here as reversible: downstream tests go to verification; the cut's CI keeps one small
test lane instead of 18 jobs; graphty.app deploys from the release run; the train starts on cut
merges; `cut-fix`, the nightly sync and the nightly flake hunt are dropped.

These need the owner:

1. **Split the screenshot capture in CI's visual job** into parallel parts. Agents may not edit
   the visual job. It shortens the cut's CI by about 15 minutes; Build stays the larger cost.
2. **Confirm #3284's hang guards** (60 s per wait, 180 s per test, replacing 1 s and 15 s) as
   "stuck" detectors that do not conflict with "never lengthen wait deadlines", given that waits
   no longer race the product's delays.
3. **Review the trusted-code diffs** for composed approvals (#3264) and branch-signed screenshots
   before they land; both change what one Face ID signature approves.
4. **beta.graphty.app.** You asked for it on 2026-10-22 (a new repository, delegated DNS, manual
   promotion). Its cost: a new public address, a repository and an App with write access, and
   hosted datasets that must deploy apart from the promotion. Deploying graphty.app from the
   release run already keeps untested code off the site. Say whether you still want it.

## Appendix: review findings not taken

- **"When a release fails, publish the newest earlier candidate whose lanes passed."** With one
  candidate per cut there is no newer candidate that passed every lane; the last one that did is
  the last release. The release instead holds, and the pipeline round reverts on golden and ships
  a pipeline-only cut. Revisit if trains run on more candidates than cuts.
- **"Have Finish push to golden instead of the cut."** Finish and the gate are trusted code
  agents may not change; it is listed as its own issue in section 5.2, not as a rollout step.
- **"Make the per-push branch merge of `golden-verified` a hook."** Dropped in favor of the merge
  `land.mjs` already makes and the size and age warning, which adds no gate runs.
- **"Run every deterministic check including knip in stage 1."** Taken, except knip runs only
  when the change touches a package's exports or dependencies; it is whole-package and slow
  otherwise.
- **"Per-shard log-volume budget"** as an act() replacement. Counted-work assertions catch the
  same class deterministically; a log budget would be load-sensitive in volume of retries. Not
  added.
