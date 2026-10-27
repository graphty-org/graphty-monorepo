---
name: pipeline-round
description: Use with /loop (for example `/loop 30m /pipeline-round`) to run one round of keeping graphty-monorepo's pipeline moving without the owner routing work -- react to a red master build and its master-guard reverts, a red 6-hour full run (bisect, revert, fix forward), flaky tests and base checks, CI budget alarms, held releases and failed publishes, owner items, red or conflicted agent pull requests, finished branches with no pull request, and check that finished worktrees are removed; escalate only what only the owner can do. It never starts new issue work (that is issue-round). Also use when changing this routine.
---

# One round of the pipeline

Every change reaches master through its own pull request, opened by `tools/pr-open.sh` as graphty-agent with
auto-merge on; CI's light check is the gate (CLAUDE.md, "Shipping a change"; design `design/ci/channels-pipeline.md`,
issue #3418). A green master build deploys canary.graphty.app. Every 6 hours `release.yml` runs the full run on the
newest green master build; green promotes it to nightly (npm `next`, nightly.graphty.app) at once when no screenshot
changed, or after the owner's Finish when one did. Production (npm `latest`, graphty.app) moves only when the owner
dispatches and approves `promote.yml`. Nobody routes work: a session runs this skill under `/loop`, and each round
looks at the repository, takes the few actions that are due, and ends.

**First read `.claude/skills/pipeline-round/shared.md`**: the hard rules, how to read the state (run its commands at
the start of every round), the markers, the subagent rules, escalation and the failure classes. Both skills follow it.

**Then ask the health dashboard** (`design/ci/health-dashboard.md` section 12): call the `pipeline-health` MCP tools
`health_status` and `owner_queue`, and use them to choose which steps below to look at first; the drill-down tools
(`master`, `release_lanes`, `pull_requests`, `flaky_hotspots`, `runners`) narrow a step. The dashboard is a guide, up
to 5 minutes old: before acting on it (revert, rerun, comment, close, merge), confirm the fact on GitHub, in the pull
request status broker or in the local file it came from, never from the dashboard alone. A result with `stale: true`
in its `freshness`, or an error, means fall back to this round's own checks.

**Bounds, every step:** never mix a test, budget, quarantine or workflow change with a product fix in one pull
request; never re-run a failure hoping for green (a re-run is only for a classified outside cause); never ask for the
admin bypass; never touch the screenshot gate's trusted files.

## The round, in priority order

Work down the steps. A step that acts may end the round; otherwise continue. "End the round" ends only this skill's
part: in the one-client normal mode, issue-round still runs after it in the same `/loop` prompt.

### 1. Red master build and its reverts

A red master build comes first: it also blocks canary and the build cache every light check reads.

- **Check:** master's newest completed build, the newest deploy run, and the `alarms` list (master-guard files
  `Red master: CI failed on <sha7>` and `<run name> lane red on master` issues and opens revert pull requests on
  branches `revert/<sha7>`).
- **Action:** classify the failure from the failed job's log (`gh run view <id> --log-failed`) and
  `git log <last green sha>..<red sha> --first-parent`. Outside cause: re-run the failed jobs once (see "Re-runs" in
  the shared file). Code: mark the alarm issue (`in-progress` plus a `taken` marker naming this session) and start one
  background subagent with the fix prompt below and `Fixes #<issue>`; skip it while a live `taken` marker holds it
  and its job is not stale. The master-guard revert pull request is the fast way back to green: when the culprit is
  confirmed and no fix is ready, turn on its auto-merge (`gh pr merge <n> --auto --merge`). One opened with the
  workflow token (author `github-actions`, when `MASTER_GUARD_TOKEN` is missing) starts no CI, so first close and
  reopen it as graphty-agent (`gh pr close <n> && gh pr reopen <n>`). When master is green again without it, close
  it with a one-line reason. After three failed fix attempts on one problem, keep master green by reverting the
  culprit and start the next attempt from a different approach, with the earlier attempts' evidence in its prompt.
- **While master's build is red:** no other pull request is opened (steps 7 and 8 wait), and issue-round starts
  nothing.
- **A critical issue no later step owns** is still this skill's alarm (issue-round skips every `priority:critical`
  issue): mark it and start a fix subagent the same way.

**Fix prompt** (alarms, holds, red pull requests), filled in, followed by the "Subagent rules" paragraph from the
shared file:

> Fix <what: the issue #N and its title | the red pull request #P on branch B>. Work in <a new worktree: from
> /home/apowers/Projects/graphty-monorepo run `./tools/worktree-new.sh <branch> origin/master <name> --issue <N>` |
> the branch's existing worktree <path>, or a new one of the existing branch>. Read the evidence first and confirm it
> still reproduces. Find the root cause and fix it there; follow CLAUDE.md and the package's CLAUDE.md; run the
> affected package's lint, build and tests. Commit with <`Fixes #N` | `Refs #N`>, then open or update the pull
> request with `tools/pr-open.sh --proof <file>` and stop.

### 2. Red full run

`release.yml` files `Full run red: <lane> on <sha>` (`priority:critical`) and dispatches `bisect.yml` itself (once
per run, concurrency `bisect-<sha>`), which confirms the failing tests 5 times on the red commit and bisects master's
first-parent merges since the last green full run.

- **Dispatch a bisect** only when the results store shows a red verdict with no bisect record, or cannot be reached:
  `gh workflow run bisect.yml --ref master` with `good`, `bad` and the run id.
- **GPU on the local card:** when `bisect.yml` records `gpu: local` (the T4 failure reproduces on no hosted runner),
  this round runs that bisect on the local NVIDIA card, through `tools/test-slots.mjs --gpu`, in the background.
- **Culprit named:** open the revert as graphty-agent unless the store records one open for that culprit: a branch
  `revert/<sha7>` from origin/master, `git revert -m 1 <culprit merge>`, then `tools/pr-open.sh --proof <file>` with
  `Refs #<red issue>` and a Proof naming the red run (a mechanical revert auto-merges on the light check; its merge
  starts the restart). Comment on the culprit's issue, and start the fix forward on an ordinary branch with a fix
  subagent. Fix forward instead of reverting when the revert conflicts or the fix is smaller.
- **No culprit** (the bisect names none, a red the last green commit also fails, outcome `infra`, a lost T4 spot
  runner, an advisory with no patched version): one issue, and one `ACTION NEEDED` line only if only the owner can
  act. A red with no culprit that stalls nightly is still this round's to fix forward.
- **Skew breaks:** a culprit whose light check passed while master gained another merge touching an affected package
  is a skew break (the bisect records it). Two in 7 days, or one that kept canary red over 6 hours: open a pull
  request adding `.mergify.yml` (or GitHub's merge queue), with the evidence, for the owner's review.

### 3. Flaky tests and base checks

- **Flaky or load-sensitive tests** (`priority:critical`, filed from the store: passed and failed on the same commit
  and inputs key; quarantined from full-run and bisect evidence). A fix subagent finds the mechanism and fixes it,
  `Fixes #N` so the test leaves quarantine. Never a longer wait, a raised timeout or a deleted test. GPU tests and the
  screenshot gate are never quarantined.
- **`[UNRELATED]` on a pull request** (a test it did not touch failed every time, with no master evidence): the pull
  request passed anyway (#3925) and CI dispatched `base-check.yml` once for that test and base. When the base fails
  too, its priority:critical `Failing on master` issue is the work; when the base passes, it comments on the pull
  request: look for a flaky test or a cause in that pull request.
- **`[FLAKY-UNRELATED]`** on a pull request (failed then passed, in a file the pull request did not touch): dispatch
  `base-check.yml` with `repeat: 5` for that file; its master records can quarantine it.
- `Failing on master: <first line>` issues (filed by base checks) get a fix subagent like any code failure.

### 4. Budget alarms

- **`ci-budget` issues**, filed by a run's `timings` job (`tools/ci-budgets.mjs trend`, budgets in `ci-budgets.json`):
  read the suspect merge range in the issue, find the task or step that slowed, and revert or fix it. A budget
  raise is never the fix by itself: it is its own pull request with its new measurement, for the owner to review.
- A job killed at its `timeout-minutes` (labelled `hung`) is a defect: fix the hang, never re-run or raise it.
- **`Nightly stalled since <date>`** (`priority:critical`, from `age:nightly` over 24 hours): act on the blocking
  state it names (a red with no culprit is step 2's to fix forward). Over 48 hours, add its `ACTION NEEDED` line.

### 5. Held release or failed publish

- **A "Release held" issue** (a red lane or a version or land job that failed before its push): read the run it
  names and classify it. Code: a fix subagent with `Refs #<hold>` (never `Fixes`: the issue stays open until the
  fix's merge restarts the run). Paid capacity, a credential or npm's trusted publisher: owner item (CLAUDE.md "A new
  package's first npm publish").
- **A publish hold** (`Release held: publish failed on <sha>`): a version is missing from npm. npm `previously staged
version` (409) means it is propagating (minutes); otherwise re-run the failed publish job once
  (`gh run rerun <run id> --failed`), and an auth failure is an owner item.
- **Red deploy run:** the newest `deploy-pages.yml` run failed and no open issue names its run id: open one,
  `Red run: deploy-pages.yml <run id> on <sha7>` (`bug`, `priority:high`, `effort:medium`), with the failed job and
  the end of its log, then classify it as above.
- Never dispatch `release.yml` or `promote.yml`, and never release the grouped major (#676, #702, #843, #1370 have no
  entry in `release-approvals.json` and stay held).

### 6. Owner items

Each once per item (an `asked owner` marker on its issue), batched into one `ACTION NEEDED` line when there are
several:

- **Promotion waiting on screenshots:** a green full run whose screenshots changed waits for the owner's Finish on the
  review page before nightly; a broken story fails its own pull request instead.
- **Code-owner review:** a pull request `tools/pr-open.sh` left auto-merge off for (a breaking change, which needs the
  label `breaking-go`; or a code-owned path: `.github/`, `.claude/`, the CI and test-selection inputs, visual-review,
  the release files, `ci-budgets.json`). They go into one daily review list. A code-owned fix for an open red, held
  or red-master issue, or a rollout step's pull request, gets its own line the moment it is green. Never merge master
  into one waiting on the owner unless it conflicts: the push dismisses his approval.
- **A major or first publish** the verdict names as an owner item (no `release-approvals.json` entry).
- **The npm token:** 14 days before `NPM_DIST_TAG_TOKEN_EXPIRES`, one line to renew it.
- **The branch ceiling,** in the daily list: every branch with no pull request whose first commit is over 3 days
  old, and every pull request over 1,500 changed lines (tests and baselines not counted). Each is split into flagged
  pieces or its owner says why not, recorded with `tools/branch-note.mjs`. A warning, not a check.

### 7. Red or conflicted agent pull requests

From the broker file (`tmp/pr-status/status.json`): every open pull request into master opened by graphty-agent
(its `author`) whose `All Checks Pass` concluded `failure` on its head, that conflicts with master, or has unanswered
review findings. A pull request anyone else opened -- the owner's (among them the held grouped major #1677, with
#676, #702, #843 and #1370), a master-guard revert (step 1) -- is not this step's: skip it.

- Its branch's issue has a live `taken` marker (its session is alive, see "Alive"): that session owns it. Skip.
- Otherwise classify the failure from the failed job (see "Failure classes"): outside, re-run the failed jobs once;
  code or a conflict, mark the issue and start a fix subagent on the existing branch (fix prompt above), which merges
  `origin/master` (never rebase), fixes and pushes. Already on master: wait.
- Red for 24 hours with no new commit and a fix attempt already made: list it in the round's last line as stranded.

**Dependabot pull requests** (author `dependabot[bot]`): `dependabot-automerge.yml` arms their auto-merge; one with
auto-merge off gets it turned on as graphty-agent (`gh pr merge <n> --auto --merge`), except Actions updates, which
wait for the owner. A red one is classified like an agent pull request.

### 8. Finished branches with no pull request

A branch on GitHub with commits master lacks, whose issue's newest marker is `ready <branch> <sha>` at its tip, and
no open pull request (a subagent whose `pr-open.sh` failed): open it, oldest first, at most 10 open at once, so
master is not buried in conflicts. Run, from the branch's worktree (or a new worktree of the branch),
`tools/pr-open.sh --proof tmp/pipeline-round/<branch>-proof.md` with a Proof that cites the `ready` marker and the
tests the branch ran. Exit 2 (a conflict with master) goes to a fix subagent.

```bash
git for-each-ref --no-merged=origin/master --sort=committerdate --format='%(refname:short) %(committerdate:unix)' \
  refs/remotes/origin | grep -vE '^origin/(HEAD|master|revert/[^ ]*|dependabot/[^ ]*|channel/[^ ]*) '
```

### 9. Stale issues and stranded branches

- An `in-progress` issue that is stale (see "Stale" in the shared file) with no commits on its branch: write
  `released -- <reason>` and remove the label, so issue-round can pick it again.
- A stranded branch (at most one per round, only when nothing above acted): a branch from the list above with no
  `ready` marker, no pull request, no commit for a day, whose owner (its progress note, else its `taken` marker) is
  provably gone and whose worktree is clean with no process inside. Its issue still open and the work still wanted:
  mark the issue and hand the branch to a fix subagent to merge `origin/master`, finish, and open its pull request.
  Not wanted: a `stranded branch` marker with the reason; never delete the branch. A branch with no issue gets one
  first (`node tools/branch-note.mjs new-issue --title "<what it does>" --branch <b>`).

### 10. Finished worktrees

`tools/worktree-cleanup.mjs` removes finished worktrees on its own (the servherd server `worktree-cleanup`, every 15
minutes, from `.worktrees/worktree-cleanup-live`). Check only that `servherd_list` shows it online, else start it:
`servherd_start({ name: "worktree-cleanup", cwd: "/home/apowers/Projects/graphty-monorepo/.worktrees/worktree-cleanup-live", command: "node tools/worktree-cleanup.mjs --apply --every 15" })`.

### 11. Nothing to do

End with one line, for example `pipeline-round: nothing due (3 pull requests open, 1 waiting on the owner).` No
ACTION NEEDED line unless something in "Escalation" is newly due.

## Known situations

Each: signal, meaning, action. Add to this list (see the next section).

- **To take a change back out of master**, revert its merge on a branch (`git revert -m 1 <merge sha>`) and open that
  branch's pull request with `tools/pr-open.sh`.
- **The retired Mergify checks** (`Queue Checks Pass`) on a pull request are not required; ignore them.
- **npm `previously staged version` (409).** The publish succeeded and is propagating (minutes). Not a failure.
- **The baseline seed pull request** from `visual-seed.yml` merges into master directly; it is not a stray.
- **The results store is down:** every job fails open (longer and stricter, never looser). Read red issues and runs
  from GitHub instead, and dispatch the bisect yourself when a red full run has none.
- **Worktrees git refuses to remove** because of untracked build output: leave them; a fix belongs in
  `tools/worktree-cleanup.mjs`, not a forced removal.
- **Not work:** issues labelled `tracking`, `release-status`, `dead-links`, `githerd-heartbeat`, and the
  Release status issue.

## How this skill improves

When a round meets something this file or `shared.md` does not cover, or a step here turns out wrong: handle it, then
fix the file -- a new "Known situations" entry or a corrected step -- on a branch
(`./tools/worktree-new.sh docs/pipeline-round-<topic> origin/master --issue <N>`), and open its pull request like any
change. Resolved failure modes go in `lessons.md` beside this file. A rule both skills need goes in `shared.md`, never
in both. Never work around the skill in the session or in memory only. A situation that needs the same manual work
every time becomes an issue for a tool fix. Keep this file a checklist: no daemons, no state files, no scripts of its
own.

## Running it

One session runs each skill at a time; other sessions may still work by hand and are coordinated only through the
`in-progress` label and markers. A /loop expires after seven days; start it again then. To pause, stop the loop.

- **Normal:** both skills. Two clients, `/loop 30m /pipeline-round` in one and `/loop 30m /issue-round` in the other;
  or one client, `/loop 30m run /pipeline-round, then /issue-round` (issue-round always after pipeline-round).
- **Drain:** only `/loop 30m /pipeline-round`. Open pull requests merge; nothing new starts.
