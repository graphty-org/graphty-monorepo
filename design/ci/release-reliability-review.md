# Release reliability review: why releases fail and what to change

A review of every release run from 2026-10-23 17:00 to 2026-10-29 12:00 PT, and what to change so
more of them succeed without slowing merges or using more CI capacity. Times are Pacific.

"Release" here means the release train in `.github/workflows/release.yml`: the full run every 6 hours
(the whole test suite, the paid T4 GPU lane, Hosts, macOS work protection, the LLM regression tests
and every screenshot) on master's newest commit, the held nightly candidate when that run is not
clean, and promotion of a clean or approved candidate to nightly.graphty.app. Production
(graphty.app) moves only by `promote.yml` and is out of scope.

See design/ci/channels-pipeline.md for how the channels fit together.

## 1. The short answer

- **Releases fail mostly because of the release pipeline, not the product.** Of 30 runs that went
  red or were cancelled, 24 failed on the pipeline itself: release-tool bugs (11), gates that waited
  on the owner (7) and duplicate or superseded dispatches (6). Only 2 failed on a real regression and
  2 on a flaky test; 2 more on outside services.
- **The count is falling, and the mix is improving.** 18 of the 30 were on 10-26 and 10-27. Each
  tool bug was fixed within hours and none has repeated. Since 10-28 the reds are mostly real
  regressions, which is the full run doing its job.
- **One tool-bug shape keeps coming back: version skew**, where a workflow from one commit runs
  against a tree from another (5 issues in 4 days; it is why the candidate held at 10:41 today is
  held).
- **The bigger cost is not failure at all: it is screenshot approval.** No full run has ever ended
  green-clean. All 15 green runs had changed screenshots, so every promotion waited on the owner.
  Owner review plus the approval pull request's own CI were 75% of the time from a candidate to
  nightly (24.3 of 32.2 hours over the two promotions so far). The full run itself was 8%.
- **The biggest wins cost no runner time**: take screenshot approval off the nightly critical path,
  close the version-skew hole with one rule and one rehearsal scenario, make every release-tool bug
  fixed in production a rehearsal scenario in the same pull request, and stop duplicate dispatches.

## 2. What failed, by cause

Window: 10-23 17:00 to 10-29 12:00 PT. 30 release.yml runs failed, were cancelled, or went red on
some attempt; each counts once, under the cause that decided it. Separately, 15 runs reached a green
verdict, all of them "green-images" (every lane green, screenshots changed).

| Cause                                      | Runs                           | Share | Time lost                                                                                   | Still happening?                                                         |
| ------------------------------------------ | ------------------------------ | ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Release-tool bug (the pipeline's own code) | 11 (+4 as a second cause)      | 37%   | about 30 h of nightly frozen or delayed; about 11 runner-hours                              | Yes, as version skew (#4522, #4421 open)                                 |
| Gate waiting on the owner                  | 7                              | 23%   | 17.6 h nightly frozen on one candidate; 4 runs held by one package's first-publish approval | Gates fixed (#4014, #4027, #4058); today's hold waits on an owner script |
| Cancelled on purpose / duplicate dispatch  | 6                              | 20%   | 3 to 5 runner-hours; up to 40 min queueing for others                                       | Partly: 21 of 37 full runs were extra dispatches                         |
| Real regression found by the full run      | 2 (+1)                         | 7%    | 2 to 3 runner-hours                                                                         | Yes, and that is wanted                                                  |
| Flaky or load-sensitive test               | 2 (+3 in bisects and attempts) | 7%    | about 4 h to the next green verdict                                                         | Quiet since #4315 (10-28)                                                |
| Outside service                            | 2 (+2)                         | 7%    | 1 to 2 h, plus 18 failed canary deploys                                                     | GitHub API limit fixed 10-29 08:34 (#4453)                               |
| Changed screenshots awaiting review        | 15 green runs (100% of them)   | --    | 19 h of owner review, 5.3 h of approval-PR CI                                               | Yes, every run                                                           |

By day (primary cause of the 30 runs):

| Day             | Runs | Mix                                             |
| --------------- | ---- | ----------------------------------------------- |
| 10-23/24        | 2    | tool, tool                                      |
| 10-25           | 3    | outside, tool, duplicate                        |
| 10-26           | 8    | flaky, flaky, tool x3, duplicate, owner gate x2 |
| 10-27           | 10   | owner gate x4, duplicate x4, tool x2            |
| 10-28           | 4    | tool, outside, regression x2                    |
| 10-29 (to noon) | 2    | tool (version skew), tool (+ a regression)      |

### Release-tool bugs: new code meeting its first real case

Every sub-cause below was fixed within hours. The next run usually met a different one.

- **Version skew** (the only recurring one). The workflow comes from one tree and the tested tree from
  another: a re-capture that loaded a module a stale candidate lacked (10-26 19:03, #3952); master's
  ci.yml calling `check:dry-run-checks`, a script the held candidate does not have (10-29 11:00,
  #4522). Related: #4024, #4025, #4404, #4421, and three fix-forwards refused because they were
  branched from master instead of the candidate (#4174, #4232, #4390). #4519 (merged 10-29 12:29)
  makes the full run test a candidate with the candidate's own workflow files; #4527 does the same for
  bisect.
- **Screenshot capture volume against job time limits**: two runs (10-26, 10-27). Not seen since
  10-28 01:26.
- **Paths used once a day**: nx release on new projects (#3318), the T4 lane's nx graph, a version dry
  run timeout (#3630), a workflow file refused on push, an immutable GitHub release (HTTP 422).
- **The results store** (our own AWS service) timing out or answering 500: two runs; fixed by retry
  (#4433). Not seen since 10-29 06:25.
- **Every promotion hit a tool bug**: promote-nightly skipped every job (#4130); release-due missed an
  approval whose master build was cancelled as superseded (#4129); "approval is not candidate plus
  accept-only commits" refused an approval pull request that carried master merges (#4457); the
  approval pull request's Stories job ran over its 20-minute limit (#4432).

The release rehearsal (`.github/workflows/release-rehearsal.yml`, 11 scenarios against scratch state)
landed on 10-27 at 14:21. Four of the bugs above came after it: none of its scenarios covered a
cancelled master build, an approval pull request with master merges in it, or a workflow from a newer
tree than the candidate.

### Gates waiting on the owner

- babylonjs-map's first-publish approval turned the version dry run red on 4 runs in a row (10-26
  22:48 to 10-27 02:50): one unapproved package held every package. Fixed by #4014, #4021, #4027.
- An `abandon` run waited 6.7 h for production approval while holding the release-train concurrency
  group, and 3 runs were cancelled behind it (10-27 05:51 to 06:17). Fixed by #4058.
- Now: the candidate held at 10:41 today (#4513) waits on an owner-run script
  (`tmp/full-run-handoff-envs.sh`) that #4519 needs before it does anything.

### Duplicates

21 of 37 full runs since 10-26 were hand or automatic dispatches beyond the 4 scheduled slots. Each is
harmless alone, but they share one concurrency group with promotions and re-runs: promote-nightly
waited 36 min behind one on 10-29.

### Screenshot approval decides nightly

- About 1.5 picture-changing merges land per 6-hour slot (75 to 106 merges a day, 20 to 25 per slot).
  Approval happens only on a held candidate, so unapproved pictures pile up: the last five green runs
  each reported the same 722 pictures, 560 of them graph-io-fidelity scorecards that #4096 changed on
  purpose.
- Even if every picture were approved the moment it merged, a slot has no new picture change only
  about 22% of the time (Poisson, 1.5 per slot). So with nightly gated on pictures, automatic
  promotion stays rare however fast the owner reviews.
- The two promotions so far: candidate to nightly took 4 h 12 m (owner asked in his evening, 0.3 h
  review) and 28 h 00 m (asked in his morning, 18.7 h review). While a candidate waits, nightly cannot
  move: on 10-28 and 10-29 three newer slots were green-images and nightly stayed put.

Where the 32.2 hours of the two promotions went:

| Bucket                                             | Hours | Share |
| -------------------------------------------------- | ----- | ----- |
| Owner screenshot review                            | 19.0  | 59%   |
| Approval pull request's own CI                     | 5.3   | 16%   |
| Full runs, including re-runs                       | 2.6   | 8%    |
| Promotion tool bugs and the queue behind full runs | 2.3   | 7%    |
| Waiting for a slot or dispatch                     | 1.0   | 3%    |
| Promotion runs, hold filing, triage                | 2.0   | 6%    |

The full run is steady at about an hour (median 59 min from first job to verdict; the critical path
is CI then the screenshot re-capture; the T4 lane, at about 50 min, finishes just before). Making it
faster saves minutes; everything around it costs hours.

## 3. What to change, in order

Ordered by the share of failures or delay each removes. None needs more runners. Costs are estimates.

### 3.1 Take screenshot approval off the nightly critical path

- **Addresses:** changed screenshots (100% of green runs; 59% + 16% of promotion time).
- **Change:** let a green-images run promote to nightly, and require the owner's approval of changed
  pictures before production (`promote.yml`) instead. Broken or unstable stories keep failing pull
  requests and the full run, as now. The owner reviews pictures once a day, in one batch, against
  master's newest green run (`serve --candidate next` already shows them), and his approval carries
  forward to every later candidate.
- **Effect:** both promotions would have taken about 1.5 to 2 h (run plus promotion) instead of 4 h
  and 28 h. Nightly would follow master every 6 hours instead of being 95 merges behind. Removes the
  approval pull request from the nightly path too (5.3 h).
- **Cost:** no runner minutes; owner time the same or lower (one review a day, not one per candidate,
  and never a re-review of the same 722 pictures). Build effort: small, a verdict rule in
  `tools/full-run.mjs` and the nightly promotion; the signed approval already exists.
- **Others:** Percy auto-approves builds on main and makes them the new baseline; review happens on
  pull requests (https://www.browserstack.com/docs/percy/baseline-management/git). Chromatic
  auto-accept on main is opt-in (https://www.chromatic.com/docs/branching-and-baselines). Claude
  Code's `latest` channel gets every release and `stable` lags about a week, "skipping releases with
  major regressions" (https://code.claude.com/docs/en/setup): the fast channel may be imperfect, the
  slow one is the filter.
- **Already have:** the channel shape, the signed approval, the review page, and production gated on
  the owner. This needs the owner's decision: it changes his rule that changed pictures hold nightly
  (design/ci/channels-pipeline.md, "Approval gates nightly").
- **If the owner keeps pictures on nightly:** at least decouple review from holds. Review master's
  newest pictures daily, so the backlog never builds to 722, and let an approval of a newer tree
  promote an older held candidate whose pictures it covers. Expect automatic promotion in at most
  about 1 slot in 4.

### 3.2 Close the version-skew hole for good

- **Addresses:** the only recurring release-tool bug (5 issues in 4 days; today's hold).
- **Change:** one written rule and two checks.
    1. Rule: a run that judges commit X runs X's own workflows and tools, never master's (#4519 and
       #4527 now do this for the full run and bisect). Apply it to every remaining path that
       dispatches against a different commit: re-capture, fix-forward into `channel/candidate`,
       promote-nightly.
    2. A rehearsal scenario that runs master's release.yml against an older candidate tree, so a
       workflow that calls a script the candidate lacks fails in the pull request, not in the 6-hour
       run.
    3. A static check in ci.yml's Checks job: every `pnpm run <script>` or `node tools/<file>` a
       release workflow calls on the tested tree either exists in that tree or is guarded.
- **Effect:** removes the recurring third of tool-bug reds (2 of the 11, and the 3 refused
  fix-forwards).
- **Cost:** none in runners beyond the rehearsal that already runs on release-path changes; about a
  day of build effort. Owner: one script now (`tmp/full-run-handoff-envs.sh`, which turns #4519 on).
- **Others:** Kubernetes' release tool runs in mock mode by default and needs `--nomock` for a real
  release (https://pkg.go.dev/k8s.io/release@v0.5.0); Google SRE asks for "reproducible, automated,
  hermetic" releases (https://sre.google/sre-book/release-engineering/).
- **Already have:** #4519, #4527, the rehearsal.

### 3.3 Every release-tool bug becomes a rehearsal scenario, and the rehearsal blocks

- **Addresses:** release-tool bugs on the once-a-day paths (every promotion so far hit one).
- **Change:**
    - A fix for a release-path bug carries the rehearsal scenario that reproduces it, in the same pull
      request. Start with the four that escaped: a cancelled superseded master build (#4129),
      promote-nightly skipping its jobs (#4130), an approval pull request carrying master merges
      (#4457), and the skew above.
    - Add a replay scenario that feeds the rehearsal the real events of the last few promotions
      (dispatch inputs, run conclusions, the approval commit's shape), recorded from the results store.
    - Make the rehearsal block merges for the paths it watches: it is its own workflow today, and only
      `All Checks Pass` and `Lint PR Title` are required, so a red rehearsal does not stop a merge.
      Either call it from ci.yml when those paths change, or have `All Checks Pass` require it.
- **Effect:** most of the 11 tool-bug runs and the 2.3 h of promotion tool bugs were first
  occurrences on a path no test covered; this turns each one into a pull-request failure the next
  time. Estimate: halves the tool-bug class within a week.
- **Cost:** no extra runner minutes on ordinary pull requests (only release-path changes run it);
  adds the rehearsal's few minutes to those. Build effort: a scenario per fix.
- **Others:** Rust publishes every release to a staging host first, through the same promote path
  production uses (https://forge.rust-lang.org/release/process.html). Boris Cherny on the Claude Code
  team: "Anytime we see Claude do something incorrectly we add it to the CLAUDE.md"
  (https://threadreaderapp.com/thread/2007179832300581177.html); Anthropic's docs add that a
  must-always rule belongs in a hook or check, not prose (https://code.claude.com/docs/en/best-practices).
- **Already have:** the rehearsal (11 scenarios, scratch store, scratch Verdaccio, a donor run's lanes).

### 3.4 One run per commit: make dispatches idempotent

- **Addresses:** duplicate and superseded runs (20% of reds; 21 of 37 full runs were extra).
- **Change:** the pick step no-ops a dispatch for a commit that already has a run in flight or a
  verdict, unless it names a new fix (the restart case); promotions get their own concurrency group,
  so they never queue behind a full run.
- **Effect:** about half the full runs disappear (estimate 10 to 15 a week), each roughly 60 jobs for
  about an hour including the paid T4 lane; promotions start at once (36 min saved on 10-29).
- **Cost:** saves runner time; small build effort in `tools/full-run.mjs` and release.yml.
- **Others:** Google SRE canarying: run "only one canary deployment at a time"
  (https://sre.google/workbook/canarying-releases/).
- **Already have:** pick skips a commit already judged; the iterate-until-green practice still
  needs one dispatch per fix, which this keeps.

### 3.5 Owner gates hold only their own item, and owner steps come first

- **Addresses:** gates waiting on the owner (23%).
- **Change:** two rules for every new gate. A gate holds only the item it is about (one package's
  first publish holds that package, as #4027 now does), and never holds a shared concurrency group.
  A change that needs an owner step (an environment, a ruleset, a trusted publisher) asks for it
  before or with its pull request, and the change detects the missing step and runs the old way
  until it is done (#4519 does this; the step itself is still outstanding).
- **Effect:** removes the 4-run and 3-run cascades seen on 10-26 and 10-27 if they recur; turns a
  frozen nightly into one held package.
- **Cost:** none.
- **Others:** Kubernetes splits release-blocking from release-informing jobs and requires each
  blocking job to have an owning team (https://github.com/kubernetes/sig-release/blob/master/release-blocking-jobs.md).
- **Already have:** #4014, #4027, #4058 for the two gates that fired.

### 3.6 Blocking and informing lanes

- **Addresses:** outside services and flakes (14% together).
- **Change:** mark the LLM regression lane informing: it calls a paid outside provider, runs once a
  day, and its one red (HTTP 400, #4220) cost a re-run and 1 h. A red informing lane files its issue
  but does not hold nightly. Every other lane stays blocking; the T4 lane stays blocking and runs on
  every release (owner's rule).
- **Effect:** small (one of the 30 runs); listed because it is nearly free.
- **Cost:** none.
- **Others:** Kubernetes release-informing jobs may be "slow, flaky, infrequent" and need not be
  green (https://github.com/kubernetes/sig-release/blob/master/release-blocking-jobs.md).
- **Already have:** the same-commit re-run, which already absorbs one-off outside failures.

### 3.7 Keep fixing flakes at the mechanism, and revert culprits first

- **Addresses:** flaky tests and real regressions (14% together).
- **Change:** keep the quarantine and the weekly CPU-restricted run. Two small additions: any test
  red in the last full run is selected on every pull request until it is green (Stripe:
  "previously failing tests always rerun",
  https://stripe.dev/blog/selective-test-execution-at-stripe-fast-ci-for-a-50m-line-ruby-monorepo);
  and when bisect names one merge with a clean signal, open its revert pull request with auto-merge
  armed instead of waiting for a fix forward (Chromium sheriffs revert a suspected culprit without
  the author, https://chromium.googlesource.com/chromium/src/+/refs/tags/112.0.5598.1/docs/sheriff.md;
  Mozilla backs out at once, https://blog.mozilla.org/tomcat/2017/04/03/sheriffing-and-backouts/).
- **Effect:** shortens a regression's hold from "until a fix lands" to one revert pull request
  (about 1 h); the selection rule costs a few test files per pull request.
- **Cost:** a few minutes of pull-request test time while a full run is red; small build effort.
- **Already have:** the quarantine, the ledger, bisect, and the pipeline round reverting culprits by
  hand.

## 4. What Anthropic says publicly

Anthropic has published nothing about its internal CI or release pipeline: no merge-queue choice,
failure rates, flaky-test handling or screenshot review. What it has published, with sources:

- **Two channels, and the slow one skips bad releases.** Claude Code's `latest` channel gets every
  release at once; `stable` is "typically about one week old, skipping releases with major
  regressions." (https://code.claude.com/docs/en/setup). This is recommendation 3.1's shape.
- **Soak and gradual rollout.** After the April 2026 Claude Code quality incident Anthropic committed
  to "soak periods, a broader eval suite, and gradual rollouts", to "a broad suite of per-model evals
  for every system prompt change", and to having "a larger share of internal staff use the exact public
  build" (https://www.anthropic.com/engineering/april-23-postmortem).
- **Deterministic enforcement over prose.** "If something has to happen every time, make it a hook, a
  deny rule, or a managed setting. CLAUDE.md is for guidelines." (https://code.claude.com/docs/en/best-practices).
  Recommendations 3.2 and 3.3 follow it: a check and a rehearsal scenario, not another paragraph.
- **Strict gating when parallel agents break each other.** In the C compiler written by 16 parallel
  Claude agents, agents began breaking existing features with each new one; the fix was a CI pipeline
  with stricter enforcement so "new commits can't break existing code"
  (https://www.anthropic.com/engineering/building-c-compiler).
- **Regression suites near 100%.** Regression evals "should have a nearly 100% pass rate"; new ones
  graduate into the suite once reliable (https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
- **A reviewer that did not write the code.** (Here, `pr-open.sh` already runs one.) Code Review is "the system we run on nearly every PR at
  Anthropic"; it does not approve pull requests (https://claude.com/blog/code-review).
- **Reported, not Anthropic's own text:** about 60 to 100 internal Claude Code releases a day and one
  external release a day (https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built).

## 5. What other high-velocity projects do that is worth borrowing

- **Channels with a lagging filter** (Chrome, Rust, VS Code, Claude Code): trunk ships to a fast
  channel; slower channels take builds that survived. VS Code ships Stable after "24 hours with no
  changes to the pre-release" (https://github.com/microsoft/vscode/wiki/Development-Process). We
  already have canary, nightly and production; 3.1 makes nightly behave like a channel, not a gate.
- **Rehearse the release with the real tools** (Rust's staging host, Kubernetes' mock mode): 3.2 and
  3.3.
- **Narrow, owned blockers** (Kubernetes blocking and informing jobs, Chrome's ReleaseBlock labels,
  https://chromium.googlesource.com/chromium/src/+/900d25159ac083fda1702706cfc8da4c09087411/docs/process/release_cycle.md):
  3.5 and 3.6.
- **Revert first** (Chromium, Mozilla, Google's Build Cop, https://abseil.io/resources/swe-book/html/ch23.html):
  3.7.
- **Track flakes with deadlines** (Google, Uber's Testopedia, https://www.uber.com/en-US/blog/flaky-tests-overhaul/;
  Mozilla disables a test failing 30% or more and backs out a test changed in the last 7 days,
  https://wiki.mozilla.org/Sheriffing/Test_Disabling_Policy): we already match most of this.

## 6. What not to do

- **Do not make the full run faster or more frequent for release reliability.** It is 8% of the time
  to nightly and steady at an hour. More runs mean more duplicates in the same concurrency group.
- **Do not add a merge queue to fix release failures.** GitHub's own queue and bors keep trunk green
  (https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/),
  but only 2 or 3 of these 30 failures were changes that broke master together. A queue would add a
  CI run per group of merges and latency to every merge for about 7% of release reds. Revisit it only
  if the runner-minutes-per-merge measurement and the selection replay say it pays for itself.
- **Do not add owner approvals or freezes.** Owner gates already cost 23% of reds and most of the
  promotion time. A tree closure for a red full run would stop 75 to 106 merges a day for a cause that
  is usually the pipeline's.
- **Do not let retries turn red into green silently.** Kubernetes removed automatic retries from its
  release-blocking jobs because retries let flakes hide
  (https://groups.google.com/g/kubernetes-dev/c/NNmEGUsJObg/m/dmI2mVc_AAAJ). Keep the one recorded
  re-run and the quarantine.
- **Do not raise timeouts or add waits** to get a lane green. The two capture-volume reds were fixed
  by splitting work across jobs, not by longer limits.
- **Do not skip or reuse the T4 lane, and do not buy paid runners** to speed the train: neither
  addresses a cause in the data.
- **Do not ask the owner to review screenshots per candidate or per pull request.** That is the
  current bottleneck; 3.1 moves review to one batch a day.

## 7. Data

Run lists, issue pulls and per-run classifications are in `tmp/release-failure-review/` in the main
checkout (not committed): `classes.md` (causes), `time.md` (time and throughput),
`runs-summary.md` (one row per run), and three research notes with every source.
