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
  red or were cancelled, 23 failed on the pipeline itself: release-tool bugs (11), gates that waited
  on the owner (7) and duplicate or superseded dispatches (5). 3 failed on a flaky test or a job
  timeout that passed on re-run, 2 on a defect in the tested commit (one product regression, one
  test-configuration defect), and 2 on outside causes.
- **The count peaked and is falling.** 19 of the 30 were on 10-26 and 10-27. Of the 6 runs since
  10-28, 3 were tool bugs, 1 an outside failure, 1 a real regression and 1 a test-configuration
  defect (a Chromium-only timing test picked up by the WebKit project).
- **Most tool bugs were one-offs, fixed within hours. One shape keeps coming back: version skew**,
  where a workflow from one commit runs against a tree from another (5 issues in 4 days, two still
  open: #4421, #4522; it is why the candidate held at 10:41 today is held). The version dry run's
  timeout mechanism (#3631) is also still open.
- **The bigger cost is not failure at all: it is screenshot approval.** No full run has ever ended
  green-clean. All 15 green runs had changed screenshots, so every promotion waited on the owner.
  Owner review was 59% of the time from a candidate to nightly (19.0 of 32.2 hours over the two
  promotions so far). The full run itself was 8%.
- **The biggest wins cost no runner time**: decide whether changed screenshots should hold nightly
  (an owner decision), finish closing the version-skew hole, and keep turning every release-path
  bug into a row of the nightly scenario test, which already blocks pull requests.

## 2. What failed, by cause

Window: 10-23 17:00 to 10-29 12:00 PT. 30 release.yml runs failed, were cancelled, or went red on
some attempt; each counts once, under the cause that decided it. Separately, 15 runs reached a green
verdict, all of them "green-images" (every lane green, screenshots changed). The two groups overlap:
4 of the 30 (40555956340, 40658389708, 40684344927, 40869780524) still ended green-images after a
re-run or a failed side job. Two of those (40658389708, 40869780524) failed only the side job "Merge
fixes into the held candidate" with every lane green, so they cost no verdict.

| Cause                            | Runs                        | Share | Time lost                                                         | Still happening?                                   |
| -------------------------------- | --------------------------- | ----- | ----------------------------------------------------------------- | -------------------------------------------------- |
| Release-tool bug                 | 11 (+4 as second cause)     | 37%   | about 15 h of nightly delayed; about 11 runner-hours              | Yes, as version skew (#4421, #4522)                |
| Gate waiting on the owner        | 7 (2 also had a red T4)     | 23%   | 17.6 h before the first nightly; 4 runs held by one first publish | Gates fixed; today's hold waits on an owner script |
| Duplicate or superseded dispatch | 5                           | 17%   | near zero; most cancelled while pending                           | Last one 10-27 19:02                               |
| Flaky test or job timeout        | 3 (+3 in bisects, attempts) | 10%   | about 4 h to the next green verdict                               | Quiet since #4315 (10-28)                          |
| Defect in the tested commit      | 2 (+1)                      | 7%    | 2 to 3 runner-hours                                               | Yes, and that is the full run's job                |
| Outside cause                    | 2                           | 7%    | 1 to 2 h                                                          | One undiagnosed LLM 400                            |
| Changed screenshots              | 15 green runs (all)         | --    | 19 h of owner review                                              | Yes, every run                                     |

Notes (the time rows are exclusive):

- **Tool-bug time** is 10d2133's 6.5 h hold, a4c81c3's 1.3 h and counting, 2.3 h of promotion tool
  bugs and queueing, and 4.75 h of approval pull request CI that was a tool bug (a Stories bin over
  its 20-minute limit, #4432, and a stale-merge PR Integrity red). The 17.6 h e2145e4 hold counts only under
  the owner gate, though tool bugs also held it; it delayed the first nightly (10-27 22:19).
- **Owner gate**: 40457379258 and 40458556009 are mixed: their T4 lane was also red (#3990).
- **Flaky or timeout** includes 40555956340 (10-27 11:00): graphty-element-lifecycle hit its
  30-minute job timeout in attempt 1; the same-commit re-run ended green-images.
- **Defect in the tested commit**: 40767962409 was a real regression (a frame-hold test broken by
  #4281). 40741074255 was a test-configuration defect: the WebKit models project picked up
  `node-models.bench.test.ts`, a Chromium-only timing ratio test (#4302, #4308).
- **Outside cause**: 40684344927 got an HTTP 400 from the LLM provider call; the cause was not
  diagnosed, and the same-commit re-run passed. 40247287810 (libatomic missing in the T4 container)
  is filed here but came from our own Dependabot bump of `pnpm/action-setup`, never tested in the T4
  container before the full run: a pipeline change escaping pull-request testing. The GitHub API limit
  (fixed 10-29 08:34, #4453) failed none of these 30 runs; it hit deploy-pages and bisect.
- **The first two runs** (10-23/24) were the retired legacy train; leave them out of the trend.

By day (primary cause of the 30 runs):

| Day                     | Runs | Mix                                                  |
| ----------------------- | ---- | ---------------------------------------------------- |
| 10-23/24 (legacy train) | 2    | tool x2                                              |
| 10-25                   | 3    | outside, tool, duplicate                             |
| 10-26                   | 8    | flaky x2, tool x3, duplicate, owner gate x2          |
| 10-27                   | 11   | owner gate x5, duplicate x3, job timeout, tool x2    |
| 10-28                   | 4    | tool, outside, regression, test-configuration defect |
| 10-29 (to noon)         | 2    | tool (version skew), tool (+ a regression)           |

### Release-tool bugs: new code meeting its first real case

- **Version skew** (recurring): the workflow comes from one tree and the tested tree from another.
  5 issues in 4 days (#3952, #4024, #4404, #4421, #4522); it turned 2 of the 11 tool-bug runs red
  (18%) and refused three fix-forwards branched from master instead of the candidate (#4174, #4232,
  #4390). #4519 (merged 10-29 12:29) and #4527 make the full run and bisect use the candidate's own
  workflow files; open #4529 fixes #4522.
- **One-offs, fixed within hours**: screenshot capture volume against job time limits (two runs, not
  seen since 10-28 01:26); nx release on new projects (#3318); the T4 lane's nx graph; a version dry
  run timeout (#3630; its mechanism, #3631, is still open); a workflow file refused on push; an
  immutable GitHub release (HTTP 422); the results store timing out or answering 500 (two runs, fixed
  by retry, #4433).
- **Every promotion hit a tool bug**: promote-nightly skipped every job (#4130); release-due missed an
  approval whose master build was cancelled as superseded (#4129); an approval pull request carrying
  master merges was refused (#4457); its Stories job ran over its 20-minute limit (#4432).

Two tests already guard the release path and block every pull request (ci.yml's Checks job, through
`tools/tool-tests.txt`): `tools/nightly-scenarios.test.mjs` (landed 10-27 13:15) models release.yml,
ci.yml, gpu.yml, release-rerun.yml and release-watch.yml over the real YAML, one row per situation,
and each defect row fails when its fix is reverted (the #4130 fix added its row); and
`tools/channel/rehearse.test.mjs`. The rehearsal workflow (`release-rehearsal.yml`) merged 10-27 14:55
(#4070) with 3 scenarios, has 11 now, and has not gone red in 40 runs. #4129 and #4457 escaped all
of them.

### Gates waiting on the owner

- babylonjs-map's first-publish approval turned the version dry run red on 4 runs in a row (10-26
  22:48 to 10-27 02:50): one unapproved package held every package. Fixed by #4014, #4021, #4027.
- An `abandon` run waited 6.7 h for production approval while holding the release-train concurrency
  group, and 3 runs were cancelled behind it (10-27 05:51 to 06:17). Fixed by #4058.
- Now: the candidate held at 10:41 today (#4513) waits on an owner-run script
  (`tmp/full-run-handoff-envs.sh`) that #4519 needs before it does anything.

### Extra runs are mostly not waste

37 full and restart runs started between 10-25 17:00 and 10-29 noon: 16 scheduled slots and 21 more.
Of the 21, 6 were restarts by design (a merge that fixes a red run restarts it) and most of the rest
were dispatches on new commits, which is how the owner's practice of iterating a red run until it is
green works. The 37 runs covered 34 distinct commits. The three repeats (7b4c4de, c3a0dea, 70f1658)
were cancelled while still pending or skipped by the pick step, at close to no cost; pick already
skips a commit that has a verdict. The runner cost of the extra runs is the price of
iterate-until-green, which is the owner's call, not a defect.

### Screenshot approval decides nightly

- About 1.5 picture-changing merges land per 6-hour slot (a thin estimate: 4 in a sample of 41
  merges). So even with instant approval, a slot has no new picture change only about 22% of the
  time (Poisson), and automatic promotion stays rare however fast the owner reviews.
- Approval happens only on a held candidate, so pictures pile up: green runs reported 722 changed.
  The owner approved 560 of them (graph-io-fidelity scorecards) on 10-29 at 01:42; they kept
  appearing only in runs older than that approval's merge (#4401, 06:29). About 162 remain.
- The two promotions so far took 4 h 12 m (asked in his evening, 0.3 h review) and 28 h 00 m (asked
  in his morning, 18.7 h review). While a candidate waits, nightly cannot move: on 10-28 and 10-29
  three newer slots were green-images and nightly stayed put.

Where the 32.2 hours of the two promotions went:

| Bucket                                                             | Hours | Share |
| ------------------------------------------------------------------ | ----- | ----- |
| Owner screenshot review                                            | 19.0  | 59%   |
| Tool bugs: approval pull request CI (#4432), promotion bugs, queue | 7.0   | 22%   |
| Full runs, including re-runs                                       | 2.6   | 8%    |
| Promotion runs, hold filing, triage                                | 2.0   | 6%    |
| Waiting for a slot or dispatch                                     | 1.0   | 3%    |
| Approval pull request CI as designed (33 min)                      | 0.6   | 2%    |

The full run is about an hour (median 59 min from first job to verdict; the critical path is CI then
the screenshot re-capture; the T4 lane, at about 50 min, finishes just before). Work in flight will
make it longer: open #4455 adds the full style fidelity gate in four slices, and #4525 is a 703 s
graph-io test file that stalled a run.

## 3. What to change, in order

Ordered by the share of failures or delay each removes. None needs more runners.

### 3.1 Decide whether changed screenshots should hold nightly (owner decision)

- **Addresses:** changed screenshots (100% of green runs; 59% of promotion time).
- **Change:** let a green-images run promote to nightly, and require the owner's approval of changed
  pictures before production (`promote.yml`) instead. Broken or unstable stories keep failing pull
  requests and the full run, as now. The owner reviews pictures in one batch a day against master's
  newest green run (`serve --candidate next` already shows them).
- **The risk, stated plainly:** nightly would carry changed pictures that nobody has reviewed. This
  repository never reviews pictures on pull requests, so there is no earlier review to lean on. The
  analogue is Claude Code's two channels: `latest` gets every release at once and `stable` lags about
  a week, "skipping releases with major regressions" (https://code.claude.com/docs/en/setup). Nightly
  would become the unfiltered channel and production the filter. That is the price of the change.
- **Effect:** both promotions would have taken about 1.5 to 2 h instead of 4 h and 28 h. Nightly
  would follow master on every green slot (it still lags on red ones: 5 of the last 10 full runs were
  red on CI, #4530).
- **Cost:** no runner minutes. The approval pull request's CI moves to before production rather than
  disappearing. Build effort is not small: the signed approval covers one `visual-baselines/` tree
  and promote-nightly refuses anything but the candidate plus accept-only commits
  (design/ci/channels-pipeline.md, "Approval gates nightly"). Carrying an approval forward, or
  approving at production time, changes that statement and the gate in `visual-review/trusted/`,
  which only the owner may change.
- **Related open issues:** #3737 (review offers the oldest waiting run, so a stale image blocks
  newer runs) and #3463 (approving nightly candidates on the review page).
- **If the owner keeps pictures on nightly:** review master's newest pictures daily so the backlog
  never builds up, and fix #3737 so an approval of a newer tree can promote. Expect automatic
  promotion in at most about 1 slot in 4.

### 3.2 Finish closing the version-skew hole

- **Addresses:** the only recurring tool bug (5 issues in 4 days; 2 of 11 tool-bug runs, 18%, plus 3
  refused fix-forwards; today's hold).
- **Change:**
    1. Rule: a run that judges commit X runs X's own workflows and tools, never master's. #4519 and
       #4527 do this for the full run and bisect; apply it to the remaining paths that dispatch
       against a different commit: re-capture, fix-forward into `channel/candidate`, promote-nightly.
    2. Extend the existing overlay check in `nightly-scenarios.test.mjs` (a job that checks out
       another commit may run a `tools/` path only once the workflow's own copy is overlaid, or when
       the path is on `OWN_TOOLS`) to `pnpm run <script>` calls in called workflows: the #4522 shape.
- **Effect:** turns the next skew of the #4522 shape into a pull-request failure. Removes the 18% of
  tool-bug reds that skew caused, if the rule covers every path.
- **Cost:** no runners; a few hours of build effort. Owner: one script now
  (`tmp/full-run-handoff-envs.sh`, which turns #4519 on).
- **Already have:** #4519, #4527, open #4529 (tests the full run's own commit when the candidate's
  workflows differ, with scenario row 17), and the overlay check above.

### 3.3 Keep adding a scenario row for every release-path fix

- **Addresses:** release-tool bugs on the once-a-day paths (every promotion so far hit one).
- **Change:** a fix for a release-path bug adds the `nightly-scenarios.test.mjs` row that reproduces
  it, in the same pull request, as the #4130 fix did. The gap is the escapes: add rows for a cancelled
  superseded master build (#4129) and an approval pull request carrying master merges (#4457). A
  Dependabot bump of an action used in the T4 container (the libatomic red) is the same kind of
  escape. Making `release-rehearsal.yml` a required check adds little: it takes 1 to 8 minutes and has
  not gone red in 40 runs.
- **Effect:** each fixed bug stays fixed. No figure for how many of the 11 tool-bug runs this would
  have prevented; most were first occurrences no row could have anticipated.
- **Cost:** a row per fix; the test already runs on every pull request.
- **Others:** Anthropic's docs: a must-always rule belongs in a hook or check, not prose
  (https://code.claude.com/docs/en/best-practices). Rust releases go first to a `dev-static`
  pre-release environment (https://forge.rust-lang.org/release/process.html).
- **Already have:** the scenario matrix, the rehearsal, `tools/full-run.test.mjs`.

### 3.4 Owner gates hold only their own item, and owner steps come first

- **Addresses:** gates waiting on the owner (23%).
- **Change:** two rules for every new gate. A gate holds only the item it is about (one package's
  first publish holds that package, as #4027 now does), and never holds a shared concurrency group.
  A change that needs an owner step (an environment, a ruleset, a trusted publisher) asks for it
  before or with its pull request, and detects the missing step and runs the old way until it is
  done (#4519 does this; the step itself is still outstanding).
- **Effect:** removes the 4-run and 3-run cascades of 10-26 and 10-27 if they recur; turns a frozen
  nightly into one held package. **Cost:** none. **Already have:** #4014, #4027, #4058.

### 3.5 Revert first, with auto-merge armed

- **Addresses:** defects in the tested commit and the flakes behind them (17% together).
- **Change:** when bisect names one merge with a clean signal, open its revert pull request with
  auto-merge armed instead of waiting for a fix forward. Today the pipeline round opens the revert
  from bisect's answer and master-guard opens reverts for a red build; only arming auto-merge is new.
  Optionally, a test red in the last full run runs on pull requests that touch its import closure, as
  an informing result that never fails the pull request. Running it as blocking on every pull request
  would turn about 90 pull requests a day red while it stays red: a tree closure by another name.
- **Effect:** shortens a regression's hold from "until a fix lands" to one revert pull request (about
  1 h).
- **Cost:** small build effort; the informing runs add a few runner-minutes only where a browser or
  story test must start.
- **Others:** Chromium sheriffs revert a suspected culprit without the author
  (https://chromium.googlesource.com/chromium/src/+/refs/tags/112.0.5598.1/docs/sheriff.md); Mozilla
  backs out at once (https://blog.mozilla.org/tomcat/2017/04/03/sheriffing-and-backouts/). Stripe
  reruns only a change's own earlier failures
  (https://stripe.dev/blog/selective-test-execution-at-stripe-fast-ci-for-a-50m-line-ruby-monorepo).
- **Already have:** the quarantine, the results store, bisect, master-guard's reverts.

### 3.6 Write down which lanes may block (owner decision on the LLM lane)

- **Addresses:** outside causes and flakes (17% together).
- **Change:** adopt Kubernetes' bars for a release-blocking job as the rule for our lanes: owned,
  runs at least every 3 h, passes 75% of runs in a week, no more than 10 failures in a row, 75th
  percentile duration 120 min or less
  (https://github.com/kubernetes/sig-release/blob/master/release-blocking-jobs.md). A lane that fails
  them is informing: a red files its issue but does not hold nightly. The T4 lane stays blocking and
  runs on every release (owner's rule).
- **The LLM lane:** since commit 5c9c9dd5ec it runs in every full, restart and candidate run, on the
  owner's instruction of 10-29 ("should run for each of the 4 canary->nightly releases per day"), so
  it is paid on every run. Its one red in the window (an undiagnosed HTTP 400) cost a re-run and 1 h.
  Whether it blocks or informs is his decision; making it informing would reverse part of what he
  decided today. CLAUDE.md's text on this lane is out of date.
- **Effect and cost:** small in this window (one run), no runners; it matters as more
  outside-dependent lanes are added. The same-commit re-run already absorbs one-off failures.

### 3.7 Let promotions skip the full-run queue, serialized with candidate mode

Small: promote-nightly waited 36 min behind an extra full run once (10-29). Give promote-nightly and
candidate mode one concurrency group of their own, shared between the two so a promotion never acts
on a candidate head a fix merge is still moving (nightly-abandon already has its own group; open
#3633 covers the queueing side). Risk: it weakens release.yml's "one train at a time" invariant, so
it needs a scenario row proving promotion and candidate mode stay serialized.

## 4. What Anthropic says publicly

We found nothing public about Anthropic's internal CI or release pipeline as such: no merge-queue
choice, failure rates, flaky-test handling or screenshot review. What it has published nearby:

- **Two channels, and the slow one skips bad releases.** Claude Code's `latest` channel gets every
  release at once; `stable` is "typically about one week old, skipping releases with major
  regressions." (https://code.claude.com/docs/en/setup). This is the shape behind 3.1.
- **Soak and gradual rollout, for changes that can affect intelligence.** After the April 2026 Claude
  Code quality incident Anthropic committed, for any change that could trade off against
  intelligence, to "soak periods, a broader eval suite, and gradual rollouts", to "a broad suite of
  per-model evals for every system prompt change", and to having "a larger share of internal staff
  use the exact public build" (https://www.anthropic.com/engineering/april-23-postmortem).
- **Deterministic enforcement over prose.** "If something has to happen every time, make it a hook, a
  deny rule, or a managed setting. CLAUDE.md is for guidelines."
  (https://code.claude.com/docs/en/best-practices). 3.2 and 3.3 follow it: a check and a test row,
  not another paragraph.
- **Strict gating when parallel agents break each other** (one researcher's experiment, not
  Anthropic's CI practice). Nicholas Carlini's C compiler, written by 16 parallel Claude agents, had
  agents breaking existing features; the fix was "a continuous integration pipeline and stricter
  enforcement" so "new commits can't break existing code"
  (https://www.anthropic.com/engineering/building-c-compiler). This points toward testing the merge
  result; section 6 declines that for runner cost, because only 2 or 3 of these 30 reds were changes
  that broke master together.
- **A reviewer that did not write the code.** Code Review is "the system we run on nearly every PR at
  Anthropic"; it does not approve pull requests (https://claude.com/blog/code-review). Here,
  `pr-open.sh` already runs one (`tools/pr-review.sh`).
- **Reported, not Anthropic's own text:** about 60 to 100 internal Claude Code releases a day and one
  external release a day (https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built).

## 5. What other high-velocity projects do that is worth borrowing

- **Channels with a lagging filter** (Chrome, Rust, VS Code, Claude Code): VS Code ships Stable after
  "24 hours with no changes to the pre-release"
  (https://github.com/microsoft/vscode/wiki/Development-Process). 3.1.
- **Rehearse the release with the real tools** (Rust's pre-release environment; Kubernetes' release
  tool runs in mock mode unless given `--nomock`, https://pkg.go.dev/k8s.io/release@v0.5.0): 3.2, 3.3.
- **Narrow, owned blockers** (Kubernetes blocking and informing jobs; Chrome's ReleaseBlock labels,
  https://chromium.googlesource.com/chromium/src/+/900d25159ac083fda1702706cfc8da4c09087411/docs/process/release_cycle.md):
  3.4, 3.6.
- **Revert first** (Chromium, Mozilla, Google's Build Cop,
  https://abseil.io/resources/swe-book/html/ch23.html): 3.5.
- **Track flakes with deadlines** (Uber, https://www.uber.com/en-US/blog/flaky-tests-overhaul/;
  Mozilla disables a test failing 30% or more, https://wiki.mozilla.org/Sheriffing/Test_Disabling_Policy):
  we already match most of this.

Caveat: their sheriffs and owning teams are staffed human rotations. Here the sheriff is the
pipeline-round agent and the only human is the owner. Revert-first transfers well because it needs
no human; "an owning team" maps to an agent or an issue owner.

## 6. What not to do

- **Do not make the full run faster or more frequent for release reliability.** It is 8% of the time
  to nightly. Keep an eye on the work that makes it slower (#4455, #4525) instead.
- **Do not add a merge queue to fix release failures.** GitHub merges about 2,500 pull requests a
  month into one monorepo through its queue, about our 80 a day, and reports "average wait time to
  ship a change ... reduced by 33%"
  (https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/).
  But its baseline was deploy trains, not unqueued merges, and its runners are not billed per minute
  on GitHub-hosted machines. Here a queue would add a CI run per group of merges for the 2 or 3 of
  these 30 reds (about 7%) that were changes breaking master together. Revisit it only if the
  runner-minutes-per-merge measurement and the selection replay say it pays for itself.
- **Do not add owner approvals or freezes.** Owner gates already cost 23% of reds and most of the
  promotion time. A tree closure for a red full run would stop 75 to 106 merges a day for a cause that
  is usually the pipeline's.
- **Do not let retries turn red into green silently.** Kubernetes had already moved its
  release-blocking jobs off automatic retries, then removed them from all remaining jobs, because
  retries "allowed flakes to hide in some jobs, while causing merge-blocking or release-blocking pain
  in others" (https://groups.google.com/g/kubernetes-dev/c/NNmEGUsJObg/m/dmI2mVc_AAAJ). We keep a
  same-commit re-run and retry-then-quarantine, which is a deliberate difference: retries are fine
  here only because every one is recorded and every quarantined test gets a critical issue.
- **Do not raise timeouts or add waits** to get a lane green. The two capture-volume reds were fixed
  by splitting work across jobs, not by longer limits.
- **Do not skip or reuse the T4 lane, and do not buy paid runners** to speed the train: neither
  addresses a cause in the data.
- **Do not ask the owner to review screenshots per candidate or per pull request.** That is the
  current bottleneck; 3.1 moves review to one batch a day.

## 7. Data

Run lists, issue pulls and per-run classifications are in `tmp/release-failure-review/` in the main
checkout (not committed): `runs.jsonl` (one record per run), `classes.md` (causes), `time.md` (time
and throughput), `verdicts.txt`, and three research notes with every source.
