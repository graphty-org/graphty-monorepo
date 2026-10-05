# Pipeline incidents: the 30-day record and the long session

Two evidence files in one. Part 1 is 30 days of GitHub data for graphty-org/graphty-monorepo
(2026-09-02 to 2026-10-03). Part 2 is the incidents of one two-week Claude Code session that drove
most of the work (2026-09-19 to 2026-10-03). Section numbers inside each part are that part's own.

---

## Part 1: Pipeline trouble in graphty-monorepo, 2026-09-02 to 2026-10-03

What went wrong in the graphty-monorepo delivery pipeline over the last 30 days, how often, for how
long, and what it took from the owner. Every number below was measured from GitHub (Actions runs,
job logs, pull requests, issues, git history) or from the Claude Code session transcripts and the
memory files kept for this project. The scripts and raw extracts sit next to this file in
`tmp/githerd-v2/incidents/` (see "Data and method" at the end).

Activity was not spread evenly. Until 2026-09-23 the repo saw a few pushes a day, mostly direct
commits to master (master had no branch protection until 2026-09-25). From 2026-09-24 two long-running
Claude Code sessions worked in parallel and the pipeline ran at 10 to 55 merges a day. Most of the
trouble below comes from that second period, which is the load githerd will see.

### Headline numbers

| Measure | Value |
|---|---|
| Pull requests opened | 302 (265 merged, 13 closed unmerged, 24 open now) |
| Merges per day, busiest days | 55 (09-26), 54 (09-27), 42 (10-02) |
| PR open-to-merge time | median 1.5 h; 75th percentile 10.4 h; 90th 33 h; worst 176 h |
| Merged PRs that never had a failed CI run | 166 of 265 (63%) |
| Median merge time, no CI failure vs at least one | 0.6 h vs 11.2 h |
| CI runs on pull requests that failed | 276 of 677 (41%) |
| Master CI: separate red stretches | 19, totalling 192 h |
| Master CI red share, last 10 days | about 63 h of 240 h (26%) |
| Release workflow runs that failed | 114 of 439 (the rest: 177 success, 122 skipped, 26 cancelled) |
| Hours during which no release could go out | 221 h across 28 stretches; longest 105 h |
| Issues filed | 470 (307 of them in one bulk filing on 09-24); 252 closed |
| Issue open-to-close time | median 53 h; critical 9.6 h; high 45 h; medium 62 h |
| Subagent transcripts that ended on an API or usage-limit error | 548 (393 of them on 10-02, one cause) |

### 1. Master going red

Master CI (`ci.yml`) went red 19 times. The long stretches, with the cause read from the failing
job's log:

| Red from | Duration | Failing runs | Cause |
|---|---|---|---|
| 09-09 06:11 | 57 h | 5 | `pnpm audit` in Build: 288 known vulnerabilities in dependencies. Fixed by pinning patched versions. |
| 09-14 04:59 | 72 h | 7 | A test shard could not download the `build-algorithms` artifact; then unapproved Chromatic changes on master (3 to 5 stories, owner had not reviewed); graph-format and graph-io coverage targets failing; remote-logger `ECONNRESET`. Several unrelated causes stacked while nobody was fixing the first. |
| 09-25 05:16 | 18 h | 3 | Unapproved Chromatic changes; a graphty app test ("Go to Settings" option missing). |
| 09-29 06:03 | 14 h | 8 | The graph-format migration (#587) merged and broke three jobs only master runs: the algorithm cost-estimate accuracy test (estimates 50x too pessimistic), the performance job (baseline artifact missing), and the NVIDIA GPU lane (test file failed to import). Two fix PRs (#603, #608) were needed. |
| 09-30 04:28 | 10 h | 2 | `pnpm audit`: 23 vulnerabilities after a new advisory. Fixed by #622. |
| 10-01 14:58 | 11.5 h | 8 | Four separate causes in a row: the GPU all-pairs shortest-path test timing out at 120 s on the software GPU, visual-review tests timing out at 5 s, the cost-estimate test now too optimistic, and finally a node-forge advisory in `pnpm audit` at 00:18. The fix for the first (#677) merged while the others were still failing. Green again at 02:26 (#690). |

Shorter stretches (under 4 hours) came from the same families: a vitest worker RPC timeout in
algorithms, remote-logger `ECONNRESET` (three times), Storybook shard timeouts, a browser-shard
assertion, and the cost-estimate ratio landing just outside its bound (4.01 against a limit of 4).

The other required lanes on master:

| Lane | Red time | Main causes |
|---|---|---|
| GPU (NVIDIA T4) | 75 h in 6 stretches | A temporary "verify a crash writes no core dump" step that failed on every run for 9 h (`ulimit` not permitted on the runner) and blocked every release until it was removed; a test import failure after the graph-format migration; the runner provider's free plan killing the job at 30 minutes. 118 of 256 runs were cancelled by newer pushes. |
| Hosts (Windows / macOS) | 19 h in 4 stretches | Windows-only failures: a bench-groups test that compares file paths with forward slashes and receives `src\accelerator.ts`. This lane runs only on master and only when certain paths change, so the first time anyone sees a Windows failure is after merge. |
| Coverage | 0.7 h | Coveralls returned HTTP 500. |

#### Kinds of master failure, by cause

1. **The full suite runs only on master.** Since 2026-09-26 pull requests run only the affected
   packages' tests (an owner decision to cut CI wall-clock time), and several jobs (cost-estimate
   accuracy, performance regression, the GPU lane, the Windows and macOS host lanes) run only after
   merge. A pull request can be green and still break master. This produced the 09-29 and 10-01
   stretches.
2. **The world changes, the code does not.** A newly published security advisory fails `pnpm audit`
   in the Build job. This happened at least four times (09-09, 09-29/30, 10-02 node-forge, 10-03
   braces). The third and fourth were the two incidents the owner escalated (see section 5).
   There are 19 open Dependabot alerts and Dependabot opens no pull requests, so the audit step is
   the only place a new advisory shows up.
3. **Intermittent tests.** Test timeouts and ratio checks that depend on machine speed: all-pairs
   shortest path on the software GPU, visual-review 5 s timeouts, the cost-estimate ratio,
   remote-logger `ECONNRESET`, the vitest worker RPC timeout. The owner has ruled that these are
   never dismissed as "flaky": each one is a defect with a mechanism to find (one was CPU-core
   migration between performance and efficiency cores doubling a measured time).
4. **A required approval nobody has given yet.** Before Chromatic was switched off on 09-27,
   unapproved visual changes failed master's Chromatic job until the owner looked.
5. **CI infrastructure.** Missing artifacts between jobs, the runner provider's time limit, an
   external service error (Coveralls 500), and a diagnostic step that could never pass on that
   runner.
6. **Several causes stacked.** The two longest stretches (72 h and 11.5 h) were not one bug: a
   second and third cause appeared while the first was open, so a green run needed every one
   fixed. "Master is red" is not one task.

#### Detection

Nothing watched master. On 10-01 master was red for 11.5 hours, but the sessions involved believed
it had been red for about two (from the node-forge advisory at 00:18): the earlier failures were
handled as separate pull-request problems. On 10-03 every pull request failed Build on the braces
advisory while master itself stayed green, because master had not run CI since the advisory was
published. A watcher on master would have seen nothing. The only stuck-pull-request watcher had
been crashing silently for a day on a Python syntax error. 23 pull requests backed up before the
owner asked why.

Pull-request failures carry the earlier signal. Scanning for the same failing job on four or more
different branches within three hours finds ten such bursts on Build (all of them security
advisories) and seven on Chromatic (owner approvals pending), each hours before anyone acted.

### 2. Releases blocked

The release workflow (`release.yml`) runs after every master lane completes. It failed 114 times.
By cause:

| Cause | Failed runs | Period | What it took |
|---|---|---|---|
| A required lane (GPU or Hosts) red on the newest master commit, so the gate refuses to release | 71 | 09-19 to 09-28 | Fixing the lane. Most of these are one gate run per completed lane on the same red commit. |
| Version commit push rejected (non-fast-forward): another merge landed on master while the release was versioning | 13 | 09-24 to 09-27 | Self-corrected once the release workflow was rewritten to recover; each failure delayed the release one cycle. |
| Publish rejected by npm: OIDC permission denied for a brand-new package (`@graphty/visual-review`) | 5 (4 with the error in the log) | 09-30, 6 h | Owner only: create a placeholder package with `npm login` and an OTP, then enable trusted publishing in the npm web UI. Needed four times this month (new packages on 09-05, 09-25, 09-29, 09-30). |
| Release config mismatches in nx: a peer dependency range the new version falls outside of (twice), a release group left behind after a one-off release (5 runs), a tag that already exists (3 runs), the version commit not merging cleanly into master (2 runs) | 12 | 09-17 to 09-30 | A code change to `nx.json` or `package.json`; one needed a hand merge. |
| npm propagation: published versions not yet visible when the check ran | 4 | 09-28 to 10-01 | Nothing; npm takes 1 to 7.5 minutes to show an accepted upload. A session once misread the matching 409 error as "awaiting approval on npmjs.com" and sent the owner looking for something that did not exist. |
| Publishing over an existing version (403) and an earlier staged version (409) | 2 | 09-13, 09-17 | Part of the 105-hour release outage from 09-13 to 09-18. |
| Undiagnosed: the log shows only "tasks not run because their dependencies failed" | 7 | 09-11 to 09-25 | Unknown from the logs kept. |

Releases also need grouping. On 09-29 one session re-enabled releases and published
graphty-element 3.0.0 while the other session was assembling a single grouped breaking release in
#607, which would have forced 4.0.0 a day later. Breaking pull requests are now held and merged by
hand.

### 3. Pull requests stalled

#### How long they waited

| Open-to-merge | Pull requests |
|---|---|
| under 1 hour | 117 |
| 1 to 4 hours | 47 |
| 4 to 24 hours | 53 |
| 1 to 3 days | 42 |
| more than 3 days | 6 |

#### Why

- **CI failures.** 99 of 265 merged pull requests had at least one failed CI run; those took a
  median of 11 hours to merge against 0.6 hours for the rest. 13 needed four or more failed runs;
  one needed 22 runs. Jobs failing on pull requests: Build 83 times (almost all `pnpm audit`),
  Chromatic 112 times across five projects (visual changes awaiting the owner), graphty-element
  test shards 89, webgpu-graph-algorithms 31, PR title lint 9 (the title failed the
  conventional-commit casing rule).
- **Waiting for the owner's visual review.** The slowest merges (#365 at 176 h, #364 at 160 h) were
  compact-mantine pull requests whose images needed approval. Approval messages ("approved 463",
  "Finish of #365 done") are the most common kind of owner message (35). Approving is also
  fragile: "Finish" in the review tool failed three times on 10-01 because master had newer
  baselines and the branch had to be updated first.
- **Policy freezes.** From 09-27 Chromatic was switched off (the month's bill was $3,747, on track
  for $10,000) and on 09-30 / 10-01 the owner ruled that nothing merges until every Storybook story
  has an approved baseline. Merges dropped to 8 on 09-28 and pull requests queued until the new
  visual-review gate was in place.
- **Merge conflicts.** Three open pull requests are in conflict now (#24 at 220 h, #676, #757).
- **Stacked pull requests.** Auto-merge on a pull request whose base is another pull request's
  branch merges at once (feature branches have no protection). It happened twice on 10-02 (#696
  into #617, #752 into #704), each skipping its own CI and silently growing the parent.
- **Breaking changes.** Pull requests with `!` in the title are held for a grouped major release
  and merged by hand. The owner asked "why is this a breaking change" about #409, which has waited
  169 h.
- **Shared-cause backlogs.** A red master, or a new advisory failing Build everywhere, blocks every
  pull request at once. Open pull requests went from 14 to 22 on the night of 10-01 and to 23 on
  10-03 for this reason, both times while the sessions fixed pull requests one by one.
- **Burst merges.** Auto-merge and Mergify release several merges together: seven merges landed
  within two minutes at 14:36 on 10-01, each starting the full master pipeline, and one of them
  turned master red.

#### The open queue right now (24 pull requests)

13 fail Build on the braces advisory (GHSA-vfj7-8cjw-p6xm, no patched version yet), 3 also fail the
PR title lint, 3 have conflicts, 1 fails only the Windows host lane, and 4 have waited more than
five days (#24, #409, #490, #519). Merging is now done by Mergify: every non-draft pull request
into master with no conflict, no `hold` label and no `!` in the title is queued, updated from
master and merged when the required checks pass.

### 4. Issues: what gets filed and how it moves

- 470 issues in 30 days, all filed by the owner's account (Claude sessions file them). 307 arrived
  in one bulk filing on 09-24 from a mining pass over session history; otherwise 15 to 35 a day.
- Labels on every issue: one type (bug 232, enhancement 130, infrastructure 84, research 13,
  documentation 12), one priority (critical 34, high 174, medium 212, low 49), one effort. Only one
  issue lacks a priority. The owner gives work by label: "fix all critical bugs" or "fix all high
  priority bugs", issued four times (09-24, 09-25, 09-27, 10-02), each time with the same
  instruction to agree, disagree or ask, and to label disagreements `blocked`.
- 252 closed, all as completed (one closed as not planned; no duplicates were recorded as such).
  Median close time 53 h; critical bugs 9.6 h.
- 218 open: 64 bugs (12 critical or high), 108 enhancements, 18 infrastructure. 13 carry
  `needs-decision` and 14 `blocked`; most of those date from the 09-24 bulk filing and have not been
  revisited.
- Re-triage already proved necessary: on 09-24, 48 issues were labelled `needs-decision` because
  their text said "the owner decides"; after review against the one-way-door rule only 4 remained.
  On 09-26 the whole queue was relabelled when the effort label was introduced.
- Issue topics: GPU and WebGPU (74 titles), API and documentation gaps (40), CI and release (36),
  visual and Storybook (30), performance (17), contrast and accessibility (10). Since 10-02 new
  issues also come from SonarQube burn-down stages and the Cytoscape integration study.
- The owner wants only issues from the authenticated GitHub account acted on, and never any
  comment on a Cytoscape repository.

### 5. What took the owner's attention

Counted from the 1,364 messages the owner typed into the five main sessions:

| Kind of message | Count | Example |
|---|---|---|
| Visual approvals and review-tool finishes | 35 | "approved 463 again and 511" |
| Merge instructions | 18 | "merge #540", "you can merge 607" |
| "Why did X fail / change / take so long?" | 18 | "why did the browser-2 shard fail on #553?" |
| "Are you waiting on me?" | 14 | "is there anything else waiting on me?" (six times on 10-01 and 10-02) |
| "Still going / still watching?" | 13 | "your polling never seems to update -- are you still watching?" |
| Status and "what is left" | 9 | "what has been delivered, what is still in progress? ... silently dropped?" |
| Pull-request backlog | 7 | "we are up to 23 pull requests, why aren't they merging? is something broken?" |
| Typed into the wrong session, or about another session | 11 | "oops, this was the wrong window again" |

The two escalations that started githerd, in the owner's words:

- 10-02 02:44, after 22 pull requests backed up: "the problem wasn't the security update, it was
  not recognizing that master was failing and allowing PRs to back up."
- 10-02 15:21: "Yesterday my master branch turned red and I didn't realize, which stopped all my
  pending releases."

Actions only the owner can take, which came up this month: approving visual changes (never
delegated); `npm login` plus an OTP for a new package's first publish, and enabling trusted
publishing; supplying credentials (Chromatic tokens, a SonarQube token, GitHub login for a
Chromatic investigation); installing system packages and upgrading the OS (deferred because it
stops all running work); passkey registration for the review tool; paying or cutting a bill; and
accepting updated Claude terms.

Rules the owner set during the month, which any automation must follow:

- Merge without asking once the quality bar is met (09-30); auto-merge non-breaking pull requests
  (10-01); Mergify does the merging (10-02); breaking pull requests are never auto-merged.
- Nothing reaches master unless every Storybook image is approved and unchanged (10-01).
- Only the owner approves visual changes.
- A red master is the top priority; open no new pull requests behind it.
- Never ask whether to continue; send `ACTION NEEDED` only when the owner can act on it right now.
- Ask only about one-way doors; never send "should this be split?" questions.
- Use Claude, not hand-written heuristics, to judge overlap, conflict and grouping of work.
- Do not run master CI on a timer while the system is idle.

### 6. Failures in the Claude sessions themselves

- **Agents killed by account state.** 548 subagent transcripts ended on an error instead of an
  answer: 393 on 10-02 when the API started returning "You'll need to accept the updated Consumer
  Terms" (every agent started after that point died at once), 129 on session or weekly usage limits
  (09-04, 09-05, 09-21, 09-27), 12 on API overload and 7 on server errors. On 09-28 the owner had to
  ask "make sure we have recovered all our workflows, processes and watchers".
- **Context exhaustion.** The main sessions were compacted 31 times. Work state lives in the
  conversation, so each compaction is a chance to drop a task; the owner asked for an audit of
  silently dropped work on 09-29.
- **Watchers that do not watch.** A stuck-pull-request watcher crashed on every run for a day; four
  chained background waits deadlocked for hours because `pgrep -f` matched the waiting shell
  itself; the owner asked "are you actually watching correctly this time" more than once.
- **Agents stuck on permission prompts.** Workflow agents sat for over 80 minutes on `git stash
  list`, which needs a permission prompt that no one answers inside a subagent.
- **Resource runaways.** One design workflow ran 23 headless Chromium browsers at once (49 GB, swap
  full) and triggered a monitoring alert.
- **Two sessions, one repo.** Duplicate work (two agents on the same college-football layout
  failure, stopped by the owner), the competing 3.0.0 release, one agent reading another's
  uncommitted file as established history, and the owner typing instructions into the wrong
  session three times. On 10-01 the owner asked "how are you communicating with the other agent
  that's working in this workspace?"; there was no answer.
- **Confident wrong diagnoses.** "Network issues" blamed for failures that turned out to be DNS
  stalls on the host, which the owner traced himself; the npm "awaiting approval" invention;
  repeated "flaky" verdicts for failures that had a mechanism.
- **Machine-level events.** DNS stalls on 10-01 broke GitHub artifact downloads; servers abandoned
  by earlier sessions held 30 GB of RAM on 09-21.

### 7. What this means for githerd

The recurring work and trouble, and the earliest signal for each:

| Kind | How often | Typical cost | Earliest signal | Who can resolve |
|---|---|---|---|---|
| Master red from merged code (full suite runs only post-merge) | about 6 times | 3 to 14 h | failed master run on CI, GPU or Hosts | an agent |
| New security advisory fails `pnpm audit` | 4 times | 2 to 57 h, plus every PR blocked | the same Build failure on several PRs, often before master runs at all | an agent (upgrade, or record an ignore when no patch exists) |
| Intermittent test failure | about 10 times | one merge cycle each, and recurring | a failure that passes on rerun | an agent, with a root cause |
| Several causes stacked on one red master | 2 long stretches | 11 to 72 h | a new failing job while master is already red | an agent per cause |
| Release blocked: lane red, push race, nx config, npm propagation | 114 failed runs | up to 105 h | failed release run | mostly an agent |
| Release blocked on a new package's first publish | 4 packages | hours, until the owner acts | publish 403 / OIDC denied | the owner only |
| PR waiting on visual approval | most UI PRs | up to 176 h | a pending review with no owner decision | the owner only |
| PR blocked by conflicts, title lint, stacking or a breaking-change hold | several a day | hours to days | PR state (dirty, failing title check, base not master, `!` title) | an agent, or the owner for breaking releases |
| PR backlog behind a shared cause | 3 times | 8 to 23 PRs stuck | count of open PRs failing the same check | fix the shared cause once |
| Issue backlog needing triage, refresh or re-triage | constant (470 filed) | stale `needs-decision` and `blocked` labels | issue age, label state, related merged work | an agent; the owner for one-way doors |
| Session or agent death (usage limit, terms, overload, compaction) | weekly | lost work that nobody notices | an agent that stops reporting | restart; the owner for terms and limits |
| Two sessions colliding on one task or one release | several | duplicate work, an unwanted major version | two claims on the same issue, branch or package | coordination before starting |
| A watcher that has silently stopped | at least twice | a day of blindness | a heartbeat that stops | the watcher must fail loudly |

Lessons that bear directly on the design:

- Watch pull requests for a shared failure, not only master. On 10-03 master was green and every
  pull request was red.
- A red master is a set of failures, not one. Track each failing job separately and call master
  fixed only when a full run is green.
- Several jobs exist only after merge. Expect a merged pull request to break master and route it
  back to whoever merged it.
- Owner-only actions are few, specific and recurring (visual approval, npm first publish, terms and
  limits, credentials, bills). Surface them the moment they become actionable, and only then.
- Agents die without saying so. Anything handed out needs a lease that expires and a heartbeat that
  is noticed when it stops.
- Do not poll CI on a timer when nothing changed: the owner rejected periodic master runs while the
  system is idle.

### Data and method

All files are in `/home/apowers/Projects/graphty-monorepo/tmp/githerd-v2/incidents/`.

- `fetch.sh`, `fetch-runs.sh`: pull requests, issues and Actions runs from GitHub (read-only),
  fetched in two-day windows to get past the API's 1,000-result cap. Outputs `prs.json`,
  `prs-open.json`, `issues.json`, `issues-open-all.json`, `closed-issues.tsv`, `runs-master.jsonl`
  (1,705 runs), `runs-pr.jsonl` (677 pull-request CI runs).
- `red.mjs` -> `red.txt`: red stretches per master workflow. A stretch runs from the first failed
  run to the next successful run of the same workflow, ordered by creation time. Runs that finished
  out of order can shorten or split a stretch slightly.
- `jobs.sh`, `logs2.sh`, `ci-fail-excerpts.txt`: the failed jobs and steps of every failed master
  run, with the log lines before each error annotation (`failed-jobs.jsonl`, `logs2/`).
- `prs.mjs`, `prci.mjs`, `pr-failed-jobs.tsv`: merge times, CI failures per pull request (runs
  matched to pull requests by branch name), and shared-cause bursts (the same failing job on four or
  more branches within three hours).
- `issues.mjs`: issue labels, close times and topic keywords.
- `users.mjs` -> `owner-messages.tsv`, `pipeline-msgs.tsv`: messages the owner typed into the five
  main session transcripts (not tool output); counts in section 5 are keyword matches and
  approximate.
- `agents.sh` -> `agent-ends.txt`: the last record of each of 12,935 subagent transcripts, to count
  agents that ended on an error.
- Memory files under `~/.claude/projects/-home-apowers-Projects-graphty-monorepo/memory/` supplied
  the incident accounts quoted in sections 1, 2 and 6.

---

## Part 2: Pipeline incidents in one long Claude Code session (2026-09-19 to 2026-10-03)

This is a catalog of every point where the graphty-monorepo pipeline got stuck, broke, needed
the owner, wasted work, or caught a problem late, taken from one interactive Claude Code session
that ran for two weeks. That session drove the WebGPU work, the graph-format migration, the
render-performance work, the self-hosted visual review tool and, at the end, the first githerd
design. A second Claude session ("the other session") worked in the same repository in parallel
for most of that time, and the two exchanged 134 cross-session messages.

Times are UTC as recorded in the session log. PR and issue numbers are real
graphty-org/graphty-monorepo numbers. Counts are of distinct incidents, not of messages that
mention them.

For each incident the catalog gives: what happened, how and when it was detected, the root
cause, how it was resolved, and the earliest signal that would have caught it. The last
sections pull the signals together and list counts.

---

### 1. Summary

| Category | Incidents | Typical cost |
|---|---|---|
| Master red, or a release blocked or broken | 20 episodes (18 red or blocked masters, 2 release mistakes) | 1 to 14 hours of red; releases skipped; one release published the wrong contents |
| A failure every PR inherited while master looked green | 6 | every open PR blocked at once; work done one PR at a time |
| GPU lane on the rented T4 (machine.dev) | 16 | cap kills, money, image, time budgets, noisy benchmarks |
| Flaky or load-sensitive tests, and misdiagnosed CI deaths | 14 distinct flakes; 2 multi-day misdiagnoses | the worker-death chase took about 4 days and 10 changes, 4 of which helped |
| PR hygiene caught late (title, format, knip, docs build) | about 20 | a CI round trip (15 to 45 minutes) each |
| Pre-push gate and the push path | 16 | false "pushed", hangs, 60 to 120 minute push queue, bare repo hazard |
| Visual review (Chromatic, then the self-hosted tool) | 24 | 3 days with no visual gate; 28 silent layout regressions; owner review queue became the bottleneck |
| Permission classifier refusals | 15 refusal events | each one stopped work until the owner answered; one episode cost the owner about 75 minutes |
| Stacked PRs and merge order | 6 | two stacked PRs auto-merged into their base instantly, skipping CI |
| Textual and semantic conflicts between PRs, stale branches | 17 | rework, a crash found only after merging master |
| Release and versioning mistakes | 9 | one grouped breaking release split in half; one release stuck for hours |
| Parallel sessions colliding or dropping work | 12 | duplicated diagnosis, duplicated PRs, an out-of-memory host, unowned critical bugs |
| Agent and workflow failures (limits, stalls, wrong theories, bad status) | 30+ | lost runs, misleading reports to the owner, silently dropped promises |
| Owner attention (signing, approvals, money, credentials, status questions) | see section 15 | 29 owner-run commit scripts in 4 days; 206 ACTION NEEDED lines; 29 "how's it going" questions |
| Machine and environment | 11 | benchmarks silently on a software renderer; load 81 to 500; out of memory |
| Issue and document hygiene | 9 | stale issues, stale status docs, 44 dead design passages |
| Product defects that escaped every automated check | 13 | found by the owner's eyes, by external-consumer exercises, or by luck |

Who detected the master-red and release-blocked episodes (section 2):

| Detector | Episodes |
|---|---|
| This session's agent, while watching something else (a release, a PR) | 11 |
| The agent's own master watcher (exists only from 2026-10-02 02:45) | 4 (plus 2 false alarms) |
| The other Claude session, by message | 2 (and a third it spotted at the same moment as this session) |
| The owner | 2 (one of them the episode that started githerd: "Yesterday my master branch turned red and I didn't realize, which stopped all my pending releases") |
| Nobody: found only through an unrelated docs PR going red | 1 |

No episode before 2026-10-02 was detected by anything whose job was to detect it.

---

### 2. Master red, releases blocked or broken

The release workflow runs only after CI, the GPU lane and the host matrix are all green on the
same master commit, so every red master is also a stopped release.

| # | When | What happened | Detected by, and lag | Root cause | Resolution | Earliest signal |
|---|---|---|---|---|---|---|
| 1 | 09-20 ~04:00 | Master release failed after merging PR 13 | Agent watching the release, minutes | T4 benchmark compare flagged a 4-byte round-trip row at 7.8x its baseline; the row measures cloud-VM submit latency and is noise | New baseline session appended from the PR's lane run | The benchmark job conclusion on master |
| 2 | 09-20 05:46 | Release that should cut layout 1.7.0 died before publishing | Agent watching the release | `nx release` refuses a dependent's peer range (`^1.7.0`) that excludes the dependency's current version (1.6.2) | Owner-signed fix commit widening to `^1.6.2`, narrowing commit later | The release job log; a release dry run on the PR would have shown it |
| 3 | 09-20 06:39 | Master CI red | Agent | Unseeded spectral layout test (random start vector) | Re-run; seeded test later | CI conclusion on master |
| 4 | 09-20 15:23 | The merge commit's release would have published 1.0.0 of a 0.x package | Agent, before it ran | nx release major bump on a breaking marker in a 0.x package | Watcher cancelled the release run; nx option committed (owner-signed) | A release dry run on the PR |
| 5 | 09-21 23:23 | GPU lane killed on master and on the PR: "free plan runners are limited to 30 minutes" | Agent, while watching the PR | machine.dev free plan cap; the phase roughly doubled the lane's work | See section 4 (split, credits, subscription) | Job duration trending toward 30 minutes over earlier runs |
| 6 | 09-22 ~19:50 | Master red on three shards; release failed | Agent, while doing other work | 20 test jobs x 9 artifact downloads = 180 calls in one second; three got HTTP 403 | Re-run of failed jobs; GPU lane re-dispatched on master; owner re-ran the release (publishing was the owner's call) | CI conclusion on master |
| 7 | 09-22 to 09-23 | Master carried a crashing test file, a logger port flake, the Windows scan defect and a blind benchmark gate, while all fixes lived on a phase branch | Nobody watching master; found 09-23 06:59 when a docs-only PR went red | Fixes stranded on an unmerged branch | Landed when the phase PR merged 09-23 21:32 | Master CI conclusion; "a docs-only PR fails" is a master signal |
| 8 | 09-24 21:32 | After merging the element WebGPU integration, master CI failed one test; release skipped | Agent ~50 min later, while watching the release; the other session spotted it at the same time and was about to duplicate the work | A test moved a node by writing to the Babylon mesh instead of the position array; a hotter layout removed the quiet window it relied on | Test fixed (PR 346); the other session's 12 branches all showed the same failure until then | CI conclusion on master within one run |
| 9 | 09-24 22:21 | Agent told the owner the release had not landed; it had, at 22:31, from a later green commit | Owner asked "what happened with our release?" | Agent read the skipped run, not the next one | Corrected | Read npm versions, not run conclusions |
| 10 | 09-26 00:29 | Master red on Chromatic at the merge commit and the two merges before it (other session's); release skipped until the owner accepted master's build | Agent | Unreviewed visual changes on master | Owner accepted in Chromatic | Visual job conclusion on master |
| 11 | 09-29 ~03:00 to 09-29 20:32 | Master red 4 runs straight on the master-only "Cost Estimate Accuracy" job, then still red after another session's PR 603 (eigenvector estimate 4.13x against a 4x bound) | A workflow's report, not a watcher | Cost model not refit after the migration changed the code it describes; the job runs only on master, so no PR could see it | Agent chose to leave master red "on purpose" until the grouped migration PR; refit landed in PR 607's branch | A master-only job going red; PRs cannot see master-only jobs |
| 12 | 09-29 20:32 | Release published graphty-element 3.0.0 and layout 2.0.0 containing half of a migration that was meant to ship as one grouped breaking release | The other session, about 3.5 hours later | Master went green after other merges; the release workflow publishes whatever is on a green master | Owner's versioning decision relayed through the other session; PR 607 reworked with a version plan and a release guard (2 hours) | Release dry-run output compared with an intended release plan, before any merge to master |
| 13 | 09-30 10:49 | Master red: the app's College football test never settled within 30 s; also npm refused the new `@graphty/visual-review` package (403 OIDC) | Agent, while watching the release of PR 607 | Layout paced one step per drawn frame, so a slow CI renderer made the layout take 16 to 30 s (already within 1 s of the limit before); no npm trusted publisher configured for the new package | PR 624 paces by wall-clock time; owner configured trusted publishing on npmjs.com | Test duration trending to its limit; release job log naming the package |
| 14 | 09-30 15:50 to ~18:30+ | Release versioned and pushed its tags but could not push its version commit back to master; nothing published; every re-run then failed because the tags existed | Agent, ~2 hours after the run | PR 625 merged between the release's start and its push, editing the version-plan file the release consumes | Manual "landing" PR 629; then CI on it failed (see section 3, axios), then the classifier blocked merging it (section 9) | Release job failure; "tags exist but npm does not have the version" |
| 15 | 10-01 22:41 | Master red on three checks | The other session, by message | Visual-review "Fast Back/Forward" test timeout; GPU all-pairs test read the GPU type before detection so ran full size on the software GPU (flaky since 09-30 depending on runner speed); master-only cost check timing a 1 to 9 ms run | Split between sessions; fix PR 677 (which itself first failed the title check) | Master CI conclusion |
| 16 | 10-02 00:18 to 02:26 | Master red on the security audit (node-forge advisory, no patched release); every PR blocked; auto-merge stalled | Both sessions saw failing PRs and fixed them one at a time without looking at master. Owner: "the problem wasn't the security update, it was not recognizing that master was failing and allowing PRs to back up." | New high advisory on a transitive dependency of remote-logger | PR 690 (a breaking remote-logger 2.0 change, so it needed the owner); a 5-minute master watcher started afterwards | Master CI conclusion; many PRs failing the same step at once |
| 17 | 10-02 04:04 | Master GPU lane red: "Insufficient balance to run job. Current balance: $-2.08" | Agent's new watcher, ~2 minutes | machine.dev credit exhausted | Owner topped up 04:13; re-runs | The runner's balance; the failure text names the cause exactly |
| 18 | 10-02 ~05:00 to ~06:30 | Master red twice: a camera race in graphty-element, and the Windows host test | Watcher (the camera failure was first missed because a newer master run had already started) | Real element race; and the agent's own auto-merged CI tool PR 683 compared backslash paths on Windows | PRs 699 and 701 | Host matrix conclusion on master after a CI-tooling merge |
| 19 | 10-02 07:32 | Master GPU run red: Fruchterman-Reingold 10k-node row 2.9x slower | Watcher | That row swings 1.4 to 4.0 ms on unchanged code depending on which cloud T4 it gets | Re-run green 08:22; issue 703 fixed later by the other session | Benchmark history of the row |
| 20 | 10-02 23:43 | Master GPU check red again: balance $-2.80 | Watcher | A day of GPU runs, including 63-minute full paired benchmarks | Owner topped off 23:49; re-run takes about 2 hours | Balance against expected spend |

(Episodes 9 and 12 are release mistakes rather than red masters; they are counted here because
they are the same pipeline stage.)

Also counted with this group: on 10-02 at 10:49 and 11:20 the master watcher raised two false
alarms, because GitHub's API answered "latest run" with a failed run from 09-30. The watcher was
changed to ignore any reply older than the newest run already seen, and to require two
consecutive polls.

---

### 3. Failures every PR inherited while master looked green

| When | What happened | Detected by, and lag | Root cause | Resolution | Earliest signal |
|---|---|---|---|---|---|
| 09-21 21:07 | A docs-only PR failed; then the P4 PR failed the same way | Agent, on the docs PR | Storybook targets had no build dependencies, so a PR that changed no package ran Storybook against unbuilt packages. Master builds everything, so master never failed | One-line Nx target default; but it sat on the docs branch, so P4 kept failing until the docs PR merged and P4 merged master (another owner-signed merge) | "A PR that touches nothing fails": treat as a master-side defect |
| 09-21 23:48 | Every test shard on the P4 PR failed downloading build artifacts | Agent | Affected-only build on PRs; shards download every package; an upload with no files makes no artifact. A narrower fix in the workflow had only worked by accident | Build every project on PRs | The same step failing in every shard |
| 09-23 19:45 | Docs PR 19 failed on all 20 shards again | Agent | The artifact fix lived only on the P4 branch | Rebased after P4 merged | Same |
| 09-30 18:24 | Four axios advisories (via nx) failed the dependency audit on every PR | Only when the release-landing PR 629 failed; master stayed green because master had not run since | Advisory published that day | Minimum-version override in `pnpm-workspace.yaml`, committed on the release PR | Advisory database update matched against the lockfile |
| 10-02 00:18 | node-forge advisory (above, episode 16) | | | | |
| 10-03 04:48 | Every PR's Build failed (7 of this session's alone) on `braces <=3.0.3`, no patched version | The other session, by message | The advisory was published 09-18 but UPDATED 10-02 22:36, which made `pnpm audit` start failing. There was NO Dependabot alert for it: Dependabot and pnpm audit resolve transitive packages differently | Other session added a recorded audit exception and then updated every blocked PR from master | Polling the advisory database for updates and matching against the lockfile; Dependabot alerts would not have fired |

Related: on 10-01 the other session found Dependabot alerts on master (undici, markdown-it,
ip-address) despite an existing pnpm override, and on 10-02 found 19 alerts of which one was
real (elliptic, via `encrypt-storage`) and 18 looked stale against the fixed lockfile. Dependabot
is not a reliable signal in either direction.

---

### 4. The GPU lane (rented Tesla T4 on machine.dev)

The GPU lane is the only real-hardware lane and the release requires it green.

| When | What happened | Detected | Root cause | Resolution | Earliest signal |
|---|---|---|---|---|---|
| 09-20 15:02 | T4 machine shut down mid-run | Agent | Provider | Re-run | Job log |
| 09-21 23:23 | Runner terminated at 30 minutes, on the PR and on master | Agent | Free-plan lifetime cap, undocumented anywhere on the provider's site | Split into 3 legs -> "Concurrent runner limit reached" -> sequential legs queued over an hour and never got a runner -> unsplit | Job duration approaching 30 min on earlier runs |
| 09-22 14:19 | Owner bought $20 of credits | | Credits did NOT lift the cap (runner killed at 32 min) | Owner subscribed 09-22 19:46 | |
| 09-22 15:08 | "The self-hosted runner lost communication with the server" during the browser smoke after 28 min of GPU work; logs lost | Agent | Probably driver memory never returned; unproven | Later reordering; re-runs | |
| 09-22 23:18 | PageRank on the T4 had regressed (1092 to 1768 ms), and the agent had appended the regressed session to the checked-in baseline, so the compare (which read only the last session) could never flag it again | A plan-versus-tree review, not CI | Shader refactor defeated loop unrolling; baseline-append procedure with no guard | Stride-one twin loop; compare changed to a pinned best across sessions with a 1.35x factor and a 2.5 ms floor | A benchmark compare that reads a pinned best, never the last session |
| 09-23 13:38 | The tightened gate fired falsely on a 0.3 ms row (GPU clocking down on sparse work) | Agent | Threshold right for real rows, too tight for tiny ones | Absolute floor added, derived from 260 historical rows | |
| 09-23 to 09-24 | The planned environment move (Ubuntu 24.04, newer Dawn) had never happened and had no record; CI runners had silently moved to 24.04 and Mesa 25 while every gate record said Mesa 23 | An audit for missing plans | `ubuntu-latest` changed under the project; a phase was silently skipped | PR 24 and runner pinning (PR 693) | Pinned images; a check that recorded environment matches the job log |
| 09-24 00:14 | The new Dawn cannot load on machine.dev's only image (Ubuntu 22.04, glibc 2.35); the provider has no image selector | Agent | Provider limitation | 24.04 container on the same runner with the GPU passed through | |
| 09-24 01:27 | The same PageRank 2x regression reappeared on the new Dawn | The hardened gate (worked as intended) | Newer shader compiler undid the earlier fix | Countdown-loop fix committed locally; unpushable because the 22.04 dev container cannot run the new Dawn | |
| 09-24 07:03 | Profiler durations read exactly zero on the new runtime | Agent | Dawn's `timestamp_quantization` default flipped to on | Toggle disabled; package gained a way to turn default-on toggles off | |
| 10-01 07:27 | PR 663 passed every test then hit the 75-minute job limit in the final benchmark | Agent | 47 min of steps plus a 40-min benchmark step | Job limit to 100 (PR 665) | Sum of step budgets exceeding the job budget |
| 10-01 23:26 | Paired benchmark (base vs PR, 8 passes) now ~65 min against its 40-min step limit; every GPU-code PR would fail | Agent | A week of new benchmark groups | Owner decision; import-based group selection plus a weekly full run (PR 683, 130-min job) | Per-group durations trending up |
| 10-02 13:03 | PR 663's paired step hit 40 minutes again | Agent | It edits the shared shader prelude, so every group runs | Full-run limit applied; merged 10-02 16:27 at 63 of 75 min | |
| 10-02 04:04, 23:43 | Balance exhausted twice in one day | Watcher | Spend | Owner top-ups | Balance polling; a page before it hits zero |
| 10-02 07:32 | Noisy 10k-node row failed master | Watcher | Per-machine fixed cost | Issue 703 | |

Owner money and account steps on this lane: buy credits, subscribe, top up twice, and a
pending dev-container rebuild (asked on 09-24, still pending 10-02) without which the
environment PR cannot merge.

---

### 5. Flaky and load-sensitive tests; misdiagnosed CI deaths

#### 5.1 Recurring flakes

| Test | Occurrences seen | Cause | Outcome |
|---|---|---|---|
| algorithms "graph constructs in under 100 ms" | at least 5 (09-20, 09-22, 09-23 "a coin flip all day", 09-25) | wall-clock assertion on a shared runner | re-run every time; never fixed in this session |
| ForceAtlas2 frame-loop test | 3 (Windows lane 09-20, pre-push 09-20, Windows 09-24) | rate measured once then asserted; fails when machine speed changes between measurement and use | fixed 09-24 by reaching the state by construction |
| spectral layout scale test | 1 | unseeded random start | seeded |
| logger end-to-end | 1 in 30 runs | random port plus keep-alive socket reuse | ephemeral ports |
| GPU all-pairs test | intermittent since 09-30 | test read GPU type before detection | PR 677 |
| cost-estimate accuracy | 3 episodes | timing too-short runs; stale model | refits |
| app College football | intermittent | layout paced per frame on a slow renderer | PR 624 |
| camera framing | intermittent on slow CI | pending framing request fired after explicit placement | PR 699 |
| glibc futex abort in a GPU shard | intermittent | newer Mesa than ever validated | re-run; environment phase |
| compact-mantine glyph story | blocked any PR capturing compact-mantine | zero-radius stroke rasterised nondeterministically | PR 605 (and a duplicate PR 606 from the other session) |
| unseeded story status flip | blocked unrelated PRs | a story with no baseline flipped between "new" and "no baseline yet" on alternate master runs | fixed inside PR 628 |
| fake-GPU and AI Control stories | timed out or unstable in capture | idle scenes redrawn every frame; data added in two steps | PR 607 |

#### 5.2 The worker-death chase (09-22 to 09-24)

A GPU-package CI shard exited 1 with "every test green" and a closed-IPC-channel error.

- Theories tried, in order, each needing an owner-signed commit and a 15 to 45 minute CI round
  trip: fork starvation (worker cap); native memory (file split); coverage reporters; vitest
  teardown timeout (placed in project config where vitest silently ignores it, so it "failed a
  fifth time"); keeping Dawn handles alive (doubled peak memory); core dumps off (does not work
  on that runner).
- Actual causes, found only after a hang-reporter wrapper printed the process table: one heavy
  file's worker crashed and the kernel spent 175 s writing a 2 GB core; separately, on the T4,
  tests that deliberately provoke driver validation errors.
- The agent's own retrospective (owner prompted it on 09-23 03:20: "we have been chasing build
  problems for 4+ hours now. step back"): 10 changes, 4 helped. The answer ("files started minus
  files that reported") had been in every failing log as a set difference.
- 09-24: the agent reported a 15 percent worker-loss rate as fact; it was two populations mixed
  (37 percent before a fix, 3.6 percent after). All 11 losses were first attempts that a re-run
  turned green, so counting run conclusions showed zero.

Earliest signal: attempt-level (not conclusion-level) failure counts per job; "files started
minus files reported" printed on any non-zero exit.

#### 5.3 The Windows renderer chase (09-22 17:57 to 09-23 15:25)

Eighteen files failed only on the Windows host leg. Three shader rewrites, about 4.5 hours of
80 to 90 minute runner rounds, were built on a compiler-bug theory. The cause was Microsoft's
in-box WARP software renderer (a synchronisation bug, nondeterministic between two runs in the
same job), fixed by copying a newer WARP DLL next to Node. A 15-minute dispatch-only lane made
each question cheap once it existed. Earliest signal: two different wrong answers from identical
code in one job, and a public issue with the same symptom on the same renderer.

---

### 6. PR hygiene failures caught only in CI

| Kind | Count | Examples |
|---|---|---|
| Commitlint subject case (capital first letter) | 5 | owner's commit run landed 5 of 15 commits then stopped (09-20, owner had to `git reset` and re-run); PR titles 09-21, PR 687, PR 725 (other session), PR 767/710 |
| Commitlint scope not in the allowed list | 3 | `design` (09-24), `merge:` type in a scripted merge (09-21), `cytoscape` after the rename (10-03) |
| Commitlint length over 100 | 4 | PR 522 (103), PR 662 (one character over, blocked auto-merge), PR 767 (116), a commit subject (10-01) |
| Title check could not be cleared by fixing the title | 1 | workflow did not trigger on `edited`; re-run replays the old title; two wasted cycles, then close and reopen (later fixed by the other session) |
| knip failure pushed with `--no-verify` | 1 | PR 507 (an unused export); two gates were bypassed under load that day |
| Prettier | 4 | CHANGELOGs written by `nx release` are not prettier-formatted (blocked the release-landing push); a JSON config; a README wrap; test files |
| Docs site build parsed text as HTML | 2 | `{{OPEN: ...}}` markers in gate records copied into the VitePress site (09-24); `<branch>` in a README (10-02) |
| Lint rule the package target does not allow | 1 | `String.replaceAll` (10-02) |
| A file the commit plan forgot | 1 | WGSL prelude never committed, so the pushed branch referenced undefined names (09-20) |
| Conflict markers committed into a workflow file | 1 | caught before push (09-24) |
| Lockfile naming a removed version after a merge | 2 | install refused on every CI job of the branch (09-24); app dependency missing on master side |
| TypeScript and import-order errors pushed from a worktree with no `node_modules` | 1 | "command not found" read as success (09-26) |

Earliest signal for all of these: the pre-push gate already runs most of them; the failures came
from skipping it, running it where tools were missing, or rules (title, docs build) that exist
only in CI.

---

### 7. The pre-push gate and the push path

| When | What happened | Root cause | Earliest signal |
|---|---|---|---|
| 09-20 to 09-23 | 29 owner-run commit scripts in four days | The owner's GPG key has a passphrase; agents could not sign until an unattended SSH signing key was set up on 09-23 (then GitHub showed the commits "Unverified" until the owner added the key as a signing key) | |
| 09-20 04:39 | Owner ran a commit script in the wrong worktree | Many worktrees, scripts handed over by path | |
| 09-21 21:28 | `finish-merge.sh` hung; owner interrupted | The repo's prepare-commit-msg hook is Commitizen's interactive wizard; scripted commits wait forever | Any scripted commit hitting an interactive hook |
| 09-21 23:34 | A merge script refused a dirty tree and the owner's run did nothing | Agent sequencing error | |
| 09-23 02:04 | Commit script failed in a docs worktree | No `node_modules`, so the commit-msg hook had no commitlint | |
| 09-24 17:52 | Agent reported "pushed"; the gate had rejected it | Command chain echoed success; output suppressed | Exit status of the push itself |
| 09-24 18:04, 09-26 21:44, 09-30 18:01 | Gate failure reason lost; one full browser run "passed" after dying mid-run | Output piped through `tail`, which reports its own exit status | |
| 09-26 13:57 | Lint, typecheck and tests "passed" with no dependencies installed | "command not found" read as success | |
| 09-24 23:11 | First push from a worktree failed | Stale worktree: a package merged that day was never built or linked there | |
| repeated | The 15-minute gate run many times per change | Gate covers the whole monorepo | |
| 09-30, 10-01 | Push and gate failed on network: "could not resolve github.com", "release-assets.githubusercontent.com" | DNS or connectivity flakes on this host | |
| 10-01 08:27 | A subagent's push failed on DNS after the gate passed; the classifier then blocked its retries; pushed 4 hours later after owner approval | | |
| 10-02 19:05 | A test that runs `git init` during the pre-push checks could flip the MAIN checkout to `core.bare=true` until the other session's fix (PR 725) | Hook environment variables leaking into test git commands | `git config core.bare` on the main checkout |
| 10-02 20:19 to 01:33 | Pushes waited 60 to 120 minutes in the machine-wide push lock (a subagent's push ~1 h; githerd's owner-only change ~76 min; the prioritization change ~2 h) | One lock serialising 15-minute gates across two sessions and their subagents | Lock queue depth and wait time |
| 09-27 | Two gates bypassed with `--no-verify` under load | Load made the gate impractical | |
| 10-01 15:15 | A subagent skipped the commit hook to get past the interactive prompt on a merge commit | Same Commitizen hook | |

---

### 8. Visual review

#### 8.1 Chromatic era (to 09-27)

- 09-24 05:33: a build with 12 unreviewed changes went to ACCEPTED with nobody reviewing it.
  Later analysis: Chromatic compares each build against the previous build on the same branch,
  so an unreviewed change is reported once and then goes silent; the token can read a change
  COUNT but not WHICH stories, so the agent could never say what changed.
- 09-24 14:02: the agent described 13 pending changes as a backlog "to approve"; the owner looked
  and found regressions (fake-accelerator stories never ran a layout; Spring did not settle).
  Root cause found two hours later (a `reheat()` that seeks to 70 percent down the cooling
  schedule). Owner's eyes, not a check, caught it.
- 09-24 15:07: `npm test` in graphty-element publishes a Chromatic build, so agents running tests
  created builds by accident.
- 09-25 16:03 to 23:26: PR 379 sat green except one Chromatic change (branch baseline drift, not
  its own change) for about 7.5 hours waiting on the owner.
- 09-26 00:29: master's own Chromatic build blocked the release until the owner accepted it.
- 09-27 19:16: the owner had a $3k Chromatic overage and refused to approve anything there.
  Detected by the owner's bill. The other session gated Chromatic behind a label that morning.

#### 8.2 No visual gate (09-27 to 10-01)

- From 09-27 10:28 until the self-hosted tool was seeded, graphty-element, layout, algorithms and
  the graphty app had no baselines; their stories showed "no baseline yet", which passed. The
  owner found this on 09-30 19:39 by asking; owner 19:42: a CRITICAL error.
- In those three days, three merges moved 28 approved pictures with nobody noticing: the undo
  feature (PR 553) changed early force-layout steps in 22 to 24 stories (its own record said it
  changed no story); the migration (PR 587) stored seeded positions as float32 (ARF,
  Kamada-Kawai); the migration (PR 607) changed matching tie-breaks. Also the graphty app's
  light mode had been rendering dark in every capture, at the seed commit and on master.
  Detected 10-01 04:23 by the owner rejecting them in the seed review; traced in about 45 minutes
  because CI keeps a capture of every master run (per-commit bisection worked).
- Releases 3.0.0 and 3.1.0 of graphty-element shipped in that window.

#### 8.3 The self-hosted review tool (09-28 onward)

| When | What happened | Owner cost |
|---|---|---|
| 09-29 14:28 | "Accept" only recorded a decision; "Finish" commits it; owner thought it was done | an extra round |
| 09-29 14:28 | Five layout stories nondeterministic or hanging after the migration merged | blocked seeding |
| 10-01 01:16 | First seed run captured nothing: two Storybooks not built first; one failing build skipped all captures | a re-run |
| 10-01 02:00 | Owner rule: nothing merges until every story is approved. Five PRs had merged across both sessions before the rule reached the other session | |
| 10-01 02:25 to 02:32 | Review page failed: "error connecting to productionresultssa0.blob.core.windows.net". One failed `gh` call blanked the page; no retry, no log. The agent asserted DNS without evidence; the owner pushed back | owner stuck on reloads |
| 10-01 03:44 | Finish did nothing when clicked repeatedly | browser had suppressed the page's confirm dialogs |
| 10-01 04:18 | A purple box around 2 nodes when every node changed read as "only these changed" | owner suspected the diff |
| 10-01 04:28 | Seed PR 641 passed the gate despite open rejects, because the gate skipped unseeded packages. Owner: "why would we want to merge something that we know has errors?" | |
| 10-01 05:09 | A robustness workflow found 42 failure modes, two critical: saved decisions erased if a project had no results at load; decisions carried over to re-run images, so Finish could commit images the owner never saw | |
| 10-01 07:15 | servherd reused the old server's directory because the server NAME was unchanged, so the owner's last two "restarts" never loaded the new code | owner reviewed on stale code |
| 10-01 07:16 | First start of a server with an empty cache downloaded ~30 runs (1.2 GB) before showing anything | wait |
| 10-02 03:24 | New page: token error from a cached old script; agent told the owner to start the server himself to register a passkey, then retracted ("are you sure about that?", "why are you telling me to register my passkey again?") | ~30 minutes |
| 10-02 13:03 to 14:49 | PRs 519 and 365, approved before passkeys existed, were refused by the new gate; the page showed Finish (0); agents may not touch baselines or review records; the classifier blocked the tool fix five times (section 9); then a guard was too strict for branches behind master | ~75 minutes of owner time |
| 10-02 17:30 | PR 519 blocked again by 4 new changed images because master had moved since the owner's review | another review round |
| 10-02 19:08 | PR 490 conflicted with master only on baseline images; agents cannot write baselines; owner asked to run `git checkout --theirs` | owner terminal step |

Owner review was the merge bottleneck from 10-01 onward (PR 617: 150 changed images; PR 365:
357 files to re-sign; PR 490: 150).

Also: "approved" was not "correct". On 10-01 the owner flagged algorithm-result changes that
turned out to be fixes; the old Chromatic-approved baselines showed Prim reporting "complete,
total weight 0" and isomorphism answering false for every pair.

---

### 9. Permission classifier refusals

Each one stopped work until the owner answered. Distinct events:

| When | What was refused | Classifier's framing |
|---|---|---|
| 09-22 16:17 | Killing a hung 25-hour-old close-out script (owner had to `kill -9`) | |
| 09-27 23:32 | A workflow merging its own PR | merge without review |
| 09-28 14:34 | Merging PR 585, which the owner had approved in chat (asked of the owner 4+ times over ~10 hours; owner 09-29: "why do I need to merge PRs? why can't you do that?") | merge without review |
| 09-29 23:57 | Merging PR 607 after owner go-ahead | production deploy |
| 09-30 19:20 | Merging release-landing PR 629 | production deploy |
| 09-30 19:20 | Merging that branch locally into a cleanup branch | merge without review |
| 09-30 20:36 | A subagent reading its own failed pre-push log; the agent then refused to read it on the subagent's behalf (would be "permission laundering"); ACTION NEEDED repeated 6 times over ~3 hours | |
| 10-01 08:27 | A subagent retrying a push after a DNS failure; 4 hours to owner OK | |
| 10-02 13:40 | Restructuring the visual gate's code; a read-only search "bypassing CI" | |
| 10-02 13:45 | Finish deleting a PR's own refused unsigned review records | audit-log tampering |
| 10-02 13:58 | A documentation comment in the same file | no reason given |
| 10-02 14:02 | A read-only search of the same file | |
| 10-02 19:21 | An ordinary push (through the pre-push gate) of a merge commit | irreversible local destruction |
| 10-02 (githerd build) | Two "merge without review" flags for builders turning on auto-merge per policy | |

Owner on 10-02: "what do I need to do to work around the autoclassifier? I don't want to revert
any public commits", then an explicit written authorization, then "this is stupid. one last
chance for the autoclassifier to get out of our way and then I will add those annoying
permissions", then added allow rules. The classifier reads the session's own conversation, so a
subagent never sees the owner's authorization.

---

### 10. Stacked PRs and merge order

| When | What happened |
|---|---|
| 09-20 | PR 12 stayed open after its commits landed through the PR stacked on it (PR 14) |
| 10-02 05:59 | A sub-PR targeting PR 617's branch had auto-merge on; that branch has no protection rules, so it merged at once without CI or review |
| 10-02 21:22 | The same again: the "Update from master" work stacked on PR 704's branch auto-merged into it immediately, skipping its own CI |
| 09-29 | Merge order had to be managed by hand: PR 613 before PR 607 or it would ship in a later minor |
| 09-30 | PR 625 contained PRs 549/550/552; merging PR 550 alone hit 20 conflicts with PR 552 |
| 10-01 | PR 617 cannot get auto-merge until PR 490 merges; a hand-set wait does it |

Lesson recorded on 10-02: never turn on auto-merge for a stacked PR.

---

### 11. Conflicts between PRs and stale branches

Textual:
- A hand-maintained count of documents per design directory conflicted on 4 separate merges in
  one day (09-24) until the table was deleted.
- Two PRs edited the same decision-record table (507 and 522, 09-27).
- The decision index, integration plan and lockfile conflicted on most merges of long-lived
  branches.

Semantic (compiled and passed separately, broke together):
- 09-30 20:43: master changed its "no row" sentinel from a negative number to `0xffffffff`; PR
  490's moved-node check skipped only negatives, so every frame tried to allocate a
  12.9-billion-element array.
- 10-01 14:56: PR 490 doubled the node limit; master's new scale test sized itself from that
  limit and timed out; a filter-undo path stopped re-placing edges.
- 10-01 23:26: PR 616 (merged) added a new use of something PR 490 removed, so PR 490 stopped
  compiling.
- 10-02 19:35: master's teardown fix (from PR 543) removed the shared batch mesh on any edge
  removal under PR 490's instancing (all remaining lines vanished); master's own test had passed
  only by luck because no frame ever built labels.
- 10-01 05:44: a gate test fixture went out of date when PR 633 added two reviewed packages.
- 09-27: a migration merge changed a published dependency declaration that a branch's packaging
  assertion pinned.

Staleness: branches were found 11, 13, 25, 42, 55, 57, 63, 75, 77, 80 and 95 commits behind
master. Consequences seen: visual diffs that were really master's changes (PR 379, 42 behind);
a test failure already fixed on master (PR 408, 25 behind); an agent cutting a new branch from a
local `master` 80 commits behind `origin/master` (docs taught 10 symbols that did not exist on
that base); the 21.7x render work sitting unpushed and 95 behind after waiting on an owner
decision. Updating PRs from master while master was red spread the red into every PR (research
on 10-02 confirmed this is a known failure elsewhere).

A conflicting PR shows NO checks at all on GitHub: PR 408 sat for hours with a watcher waiting
for checks that could never appear (09-26).

---

### 12. Releases and versioning

| When | What happened | Resolution |
|---|---|---|
| 09-20 | nx refused a peer range excluding the current version | interim range, narrowed later |
| 09-20 | 0.x package would have gone to 1.0.0 | release run cancelled; nx option |
| 09-24 | A merge landing mid-release broke a release with a non-fast-forward push (reported by the other session) | |
| 09-29 to 09-30 | Grouped breaking release split: half published as 3.0.0 | version plan file, temporary release group, a guard that fails if the group outlives its plan |
| 09-30 | Release stuck: tags pushed, version commit refused, nothing published | manual landing PR, then a cleanup PR that had to wait until npm had 3.1.0 or npm's "latest" would go backwards |
| 09-30 | npm 403 for a new package with no trusted publisher; owner also had to tick "allow npm publish" | owner on npmjs.com |
| 09-28 | nx release writes unformatted CHANGELOGs that the gate rejects | formatted by hand |
| 10-02 | Breaking PRs must not auto-merge: PR 676 (element 4.0 alone), PR 409 (compact-mantine major), PR 702 (AI key store, discovered breaking only after it was built). PR 690 (remote-logger 2.0) was let through because it unblocked every PR's audit | held and labelled by hand |
| 10-01 | Seeded-result changes in two algorithms needed an owner call: fix or breaking | owner chose fix |

---

### 13. Parallel sessions

| When | What happened |
|---|---|
| 09-21 23:35 | The agent resolved merge conflicts IN the owner's main checkout, where the other session had ~399 uncommitted files. Owner: "are you modifying ~/Projects/graphty-monorepo? I have another Claude Code session editing that project" |
| 09-23 19:45 | The other session ran a CPU burner on 26 cores (load 60+); this session misattributed 14 test failures to a calibration bug in the other session's code, then retracted |
| 09-24 22:25 | Both sessions started on the same red master; split by message |
| 09-26 | A story crash in the other session's branch: reported to it instead of edited |
| 09-29 | Duplicate fixes for the same flaky glyph (PRs 605 and 606); duplicate design-docs PRs (609 and 610) |
| 09-29 | The other session's PR 603, if merged alone, would publish a half migration; it merged and did (section 12) |
| 09-30 20:43 | The other session merged master into this session's PRs on GitHub and left three code conflicts for this session |
| 10-01 02:00 | The other session merged three PRs before the owner's new merge rule reached it |
| 10-01 12:14 | Owner's Grafana alert: host out of memory, swap full. The other session's design-studio crawl ran many headless browsers (51 GB RAM, one 8.6 GB browser). Fixed with a shared 4-slot browser lock |
| 10-01 22:41 | Master red detected by the other session, not this one |
| 10-02 17:18 | The other session took 15 high-priority bugs; 7 were still open with no PR and unknown status; two CRITICAL bugs were in no session's list |
| 10-02 14:17 | The other session fixing 15 bugs in parallel drove load to 81 on 32 threads; this session's tests timed out |

Owner side: three messages typed into the wrong session window ("whoops. wrong window",
"oops, this was the wrong window again", "wrong window again, nevermind").

Cross-session messages that arrive from a session in a different permission mode wait for the
owner's approval before the receiver sees them.

---

### 14. Agent and workflow failures

Limits and interruptions:
- Claude usage or credit limit cut running workflows 09-21 (three times that day), 09-26 (agents
  cut mid-merge), 09-28 (owner: "make sure we have recovered all our workflows, processes and
  watchers"). Resume replayed cached agents by call order, so some finished reviews re-ran.
- API overload killed 8 agents of one workflow (09-22). Two "continuing after a Claude API Error"
  restarts by the owner (09-22).
- The session's web-search budget (200) ran out mid-research (09-27); the owner had to exit and
  restart the session.
- Eight context compactions.

Stalls and opacity:
- Owner had to ask for status 29 times ("still going? you've been on the same step for 50
  minutes", "how's it going?", "are you waiting on me for anything").
- Finished agents stayed listed as running because they had left background shells (09-24,
  09-26).
- A watcher watched the wrong agent id and missed the moment to inject three owner decisions into
  a migration run, which then skipped them (09-28).
- A close-out script waited 25 hours on a hung test run; a worker was wedged in uninterruptible
  sleep until reboot (09-22).
- Orphans: 2.7 GB of `playwright-mcp` processes; Storybooks left running by agents; idle watchers
  producing empty notifications.

Review and planning loops:
- A plan review ran 5 adversarial rounds of ~40 minutes, finding 2 mechanical fixes per round,
  before the agent stopped reviewing and built (09-25).
- Two spec workflows did not converge in 3 rounds (29 and 33 serious findings left, about 69 open
  decisions) and collided with interfaces a concurrent migration was building (09-28).
- One spec grew from 114 KB to 545 KB across 4 review rounds, findings flat, until pruned to
  153 KB (09-29).

Wrong diagnoses and wrong status told to the owner:
- the worker-death and Windows chases (section 5);
- "15 percent" stated as fact, wrong;
- host-lane failures attributed twice to a stale package; really a config file that threw on
  macOS and Windows and broke the Nx project graph (09-24);
- a theory built on a test file the agent assumed pre-existing; another agent had written it
  that day (09-24);
- "every check green" while Chromatic and the aggregate check were red (09-27);
- "the WebGPU migration is done" when the graph-format migration was a third done; its status
  file was stale since 09-18 (owner 09-28: "I keep asking about the webgpu migration and you told
  me it was done");
- "the release did not land" when it had (09-24);
- DNS asserted without evidence (10-01).

Silently dropped work (found when the owner asked on 09-29 "is there anything that was only
partially delivered or silently dropped?"): a PR close command that failed silently; a promised
branch update not done; two bug fixes promised then never done; six defects never filed; a
one-way-door decision never raised for two days; an owner question never answered; four green
GPU PRs untouched for two days; built GPU work that no consumer routed to, so it reached no user.

---

### 15. Owner attention

- Signing: 29 owner-run commit scripts between 09-20 and 09-23, each a blocking step, until an
  unattended signing key existed.
- ACTION NEEDED: 206 assistant messages ended with the line. Many repeated the same item while
  waiting ("Nothing new to report" plus the same ACTION NEEDED). Owner 09-29: "don't tell me
  ACTION NEEDED until it is actually needed. there is nothing I can do for that last ACTION
  NEEDED". Owner 09-29: "never ask me if you should continue, just keep going".
- Merges: the owner was asked to merge again and again until 09-30 ("don't wait for me to merge,
  it's just slowing us down") and 10-01 (auto-merge for non-breaking PRs).
- Money and credentials: machine.dev credits, subscription and two top-ups; Chromatic overage;
  npm trusted publishing; SSH signing key on GitHub; passkey registration; container packages
  (bubblewrap, socat) that need root; dev-container rebuild.
- Decisions that accumulated unasked or unsigned: ten gate records, none signed (09-22); a
  performance target with no decision for days; a public option decision never raised.
- Interruptions: 12 "Request interrupted" events, including stopping an agent that changed code
  while answering a question ("what are you doing?").

---

### 16. Machine and environment

| When | What happened |
|---|---|
| 09-20 | Coverage on the dev box crashed a vitest worker at default parallelism |
| 09-23 18:35 | Load average above 500 during whole-project runs; local reds were the box |
| 09-23 19:45 | Load 60+ from the other session |
| 09-26 23:26 | Every headless Chromium benchmark on this machine had silently run on a software rasteriser or hung: no system `libEGL.so.1`. "Cost an afternoon to rediscover" |
| 09-27 10:47 | Load 30 to 186 during a whole batch; individual passes 5,000 ms for 20 ms of work; a PR that set thresholds from timings was invalid |
| 10-01 12:14 | Out of memory (section 13) |
| 10-02 14:17 | Load 81 on 32 threads |
| 09-24 onward | Dev container on Ubuntu 22.04 cannot load Dawn 0.6.1, so the environment PR cannot pass the pre-push gate anywhere; enabling auto-merge on it (10-02) would have broken every push from every session |
| 09-24 | `ubuntu-latest` silently moved to 24.04; GitHub announced it moves to 26.04 from 10-19 |
| 09-23 | A worktree has no `.env`, so tokens looked "missing" for weeks and gate rows sat open on a false blocker |
| 09-29 | Untracked design folders existed only in the main checkout, invisible to worktree workflows (one was 1.2 GB) |

---

### 17. Issue and document hygiene

- Issues whose work had merged stayed open (420, 421, 426 on 10-01; 464 on 10-01).
- Five label-propagation bugs filed 09-27 against code a later rewrite replaced; a run was spent
  discovering they were already fixed (10-01).
- A duplicate issue filed before the agent found the existing one (737 vs 673).
- 13 issues filed on 09-26 were not picked up during a two-day detour.
- The graph-format migration status file was stale for ten days.
- The WebGPU design carried 44 dead passages superseded by decision records; its phase table told
  the app to do GPU work the architecture forbids; a gate clause required a nightly lane that a
  later decision deleted, so it could never be satisfied (09-23).
- An entire planned phase (the environment move) was skipped with no record (09-23).

---

### 18. Product defects that escaped every automated check

| Defect | Lived for | Found by |
|---|---|---|
| Arrowhead thin-instancing deleted in a "wip" commit | 10 months | Owner's memory, while working on edge performance |
| Spring layout ran a tenth of its iterations after any data load | since the element v2 bridge | Owner reading a Chromatic diff |
| Fake-accelerator stories never ran a layout; two stories drew the same picture | since written | Owner |
| Status-chip tooltip read ". Layouts and algorithms..." in Chrome | since written | Agent opening the running app (a native tooltip appears in no screenshot) |
| WARP renderer computes wrong prefix sums | in the Windows image | Host lane, after 3 wrong theories |
| PageRank 2x regression made permanent in the baseline | one day | A plan-versus-tree review |
| GPU traversal 200x slower than CPU on small graphs, routed by default | caught before merge | Agent measuring in a browser |
| GPU betweenness silently wrong once path counts overflow (issue 719, critical) | shipped | The Cytoscape adapter exercise |
| Animated edge speed ignored; width 8 world units | since written | Owner asking whether a story existed |
| Graphty app light mode rendered dark in every capture | since written | The other session during seeding |
| Old baselines approved broken output (Prim weight 0; isomorphism always false) | since written | Owner reviewing new images |
| A gate that cannot fire: four in one day (a story guard satisfied by a function call existing; an Nx lint that was a cache replay over real type errors; Chromatic "accepting"; a timeout hook that could never apply) | various | Agent, while chasing something else |
| Default ForceAtlas2 takes ~20 s for 150 nodes without a GPU | latent | Story timeouts |

---

### 19. Earliest reliable signals, by source

What would have caught each class first, using only what the incidents above show to be
reliable:

1. **Master's newest finished run per required workflow** (CI, GPU, Hosts, Release), read per
   workflow, ignoring any reply older than one already seen, alarming on two consecutive reads.
   Catches episodes 1 to 8, 10, 11, 13 to 20. Master-only jobs (cost estimate) are visible only
   here.
2. **Many open PRs failing the same job or step within a short window.** Catches every
   inherited failure in section 3 and the master-red cases where master had not re-run. This is
   a master problem, not N PR problems.
3. **Advisory database updates matched against the lockfile, confirmed by `pnpm audit`.**
   Catches axios, node-forge and braces before any PR fails. Dependabot alerts missed braces and
   were stale in other cases.
4. **Release outcome versus intent:** npm's published versions against the release dry run and
   an intended release plan; tags pushed without a version on npm; a release that has not
   published N hours after a green commit. Catches section 12.
5. **Runner account state:** machine.dev balance before it reaches zero; job duration against
   the plan's lifetime cap; step budgets that sum past the job budget.
6. **Benchmark history per row**, compared against a pinned best, never "last session", with a
   per-runner-class noise floor.
7. **Attempt-level job outcomes** (first attempts, not final conclusions), and "files started
   minus files reported" on any non-zero exit. Catches flakes hidden by re-runs.
8. **PR mergeability and staleness:** conflicting PRs (they show no checks), commits behind
   master, visual captures out of date against master's baselines, stacked PRs with auto-merge
   on, base branches without protection.
9. **The pre-push path itself:** push lock queue depth and wait; exit status of the push, not of
   a pipe; `core.bare` on the main checkout; missing `node_modules` in a worktree.
10. **Visual coverage:** any package with a Storybook but no baselines; any story excluded or
    "no baseline yet"; a seed older than master.
11. **Owner queue:** count and age of items waiting on the owner (reviews, merges, decisions,
    money); repeated identical asks.
12. **Host health:** load average against core count, free memory and swap, orphan processes,
    stale servers.
13. **Cross-session ownership:** who has claimed which PR, issue and branch; items in no one's
    list (the two critical bugs).

Signals that were NOT reliable in this session: GitHub's "latest run" answer (returned a 09-30
run on 10-02); Dependabot alerts; Chromatic build state; a single benchmark sample on a rented
runner; an agent's own summary of what it did; job conclusions after re-runs; and timing taken
on this shared host.

---

### 20. Counts

| Measure | Value |
|---|---|
| Session span | 2026-09-19 22:33 to 2026-10-03 04:58 |
| Master-red or release-blocked episodes | 20, of which 2 are release mistakes (plus 2 watcher false alarms) |
| Of those, first detected by a dedicated watcher | 4 (all on 10-02) |
| Failures inherited by every PR | 6 |
| Distinct permission-classifier refusals | 15 |
| Stacked PRs auto-merged into an unprotected base | 2 |
| Releases that published the wrong contents | 1 |
| Releases stuck after tagging | 1 |
| machine.dev account incidents (cap, concurrency, credits, balance x2) | 5 |
| GPU-lane time-budget overruns | 4 |
| Commitlint and title failures | 13 |
| Pre-push results misread as success | 5 |
| Silent visual regressions merged while no visual gate existed | 28 stories, plus every light-mode app image |
| Cross-session messages | 134 |
| Owner-run commit scripts | 29 |
| ACTION NEEDED lines | 206 |
| Owner status questions | 29 |
| Owner interruptions | 12 |
| Messages typed into the wrong window | 3 |
| Context compactions | 8 |
| Usage, credit or API-error interruptions | 7 |
