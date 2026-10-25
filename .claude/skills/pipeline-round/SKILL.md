---
name: pipeline-round
description: Use with /loop (for example `/loop 30m /pipeline-round`) to run one round of keeping graphty-monorepo's pipeline moving without the owner routing work -- react to a red master build, master-guard revert pull requests, priority:critical issues, held releases and red release or deploy runs, own red pull requests whose session is gone, open pull requests for finished branches that have none, revive stranded branches, check that finished worktrees are removed, and escalate only what only the owner can do. It never starts new issue work (that is issue-round). Also use when changing this routine.
---

# One round of the pipeline

Every change reaches master through its own pull request, opened by `tools/pr-open.sh` as graphty-agent with
auto-merge on (CLAUDE.md, "Shipping a change"; design `design/ci/channels-pipeline.md`, issue #3418). There is no
golden branch: `land.mjs land`, `cut`, `cut-fix`, `ship`, `auto-ship` and `sync` refuse. Nobody routes work: a session
runs this skill under `/loop`, and each round looks at the repository, takes the few actions that are due, and ends.

**Interim rules, until the rest of the channels pipeline is built** (plan: `design/ci/channels-pipeline-plan.md`):

- **Production moves only on the owner's go.** Every green master build deploys to canary.graphty.app; graphty.app
  moves only by `promote.yml`, which the owner dispatches and approves. Scheduled release trains run in shadow and
  publish nothing. Never dispatch a release or a promotion.
- **Screenshots still gate pull requests.** A pull request held only by its visual gate waits for the owner: one
  `ACTION NEEDED` line per pull request, once (step 4).
- **A `master-guard` revert pull request whose capture changes a screenshot** gets its own immediate `ACTION NEEDED`
  line: the visual gate holds it like any other pull request.

**First read `.claude/skills/pipeline-round/shared.md`**: the hard rules, how to read the state (run its commands at
the start of every round), the markers, the subagent rules, escalation and the failure classes. Both skills follow it.

## The round, in priority order

Work down the steps. A step that acts may end the round; otherwise continue. "End the round" ends only this skill's
part: in the one-client normal mode, issue-round still runs after it in the same `/loop` prompt.

### 1. Red master, guard reverts, critical issues

- **Check:** master's newest completed build, the newest deploy run, and the `alarms` list (master-guard files
  `Red master: CI failed on <sha7>` and `<run name> lane red on master` issues and opens revert pull requests on
  branches `revert/<sha7>`).
- **Action:** classify the failure from the failed job's log (`gh run view <id> --log-failed`) and
  `git log <last green sha>..<red sha> --first-parent`. Outside cause: re-run the failed jobs once (see "Re-runs" in
  the shared file). Code: mark the alarm issue (`in-progress` plus a `taken` marker naming this session) and start one
  background subagent with the fix prompt below and `Fixes #<issue>`; skip it while a live `taken` marker holds it
  and its job is not stale. The master-guard revert pull request is the fast way back to green: when the culprit is
  confirmed and no fix is ready, first close and reopen it as graphty-agent (`gh pr close <n> && gh pr reopen <n>`:
  master-guard opens it with the workflow token, and such a pull request starts no CI, so its required checks never
  report), then turn on its auto-merge (`gh pr merge <n> --auto --merge`); when master is green again without it,
  close it with a one-line reason. After three failed fix attempts on one problem, keep master green by reverting the
  culprit and start the next attempt from a different approach, with the earlier attempts' evidence in its prompt.
- **While master's build is red:** no other pull request is opened (steps 5 and 6 wait), and issue-round starts
  nothing.
- **A critical issue that is not a red master** is still this skill's alarm (issue-round skips every
  `priority:critical` issue): mark it and start a fix subagent the same way, ahead of everything below.

**Fix prompt** (alarms, holds, red pull requests), filled in, followed by the "Subagent rules" paragraph from the
shared file:

> Fix <what: the issue #N and its title | the red pull request #P on branch B>. Work in <a new worktree: from
> /home/apowers/Projects/graphty-monorepo run `./tools/worktree-new.sh <branch> origin/master <name> --issue <N>` |
> the branch's existing worktree <path>, or a new one of the existing branch>. Read the evidence first and confirm it
> still reproduces. Find the root cause and fix it there; follow CLAUDE.md and the package's CLAUDE.md; run the
> affected package's lint, build and tests. Commit with <`Fixes #N` | `Refs #N`>, then open or update the pull
> request with `tools/pr-open.sh --proof <file>` and stop.

### 2. Held release, red release or deploy run

- **Shadow runs** (every scheduled `release.yml` run) open no hold: a red one comments once on #3418. Read the newest
  such comment: a code failure gets a fix subagent like step 1 with `Refs #3418`; an outside one gets one re-run.
- **A "Release held" issue** (a publish hold, or one left open from an earlier release, such as #3318): read the run it names and classify
  it. Code: a fix subagent with `Refs #<hold>` (never `Fixes`: the owner closes it with his next release). Paid
  capacity, a credential or npm's trusted publisher: owner item (CLAUDE.md "A new package's first npm publish").
- **Red deploy run:** the newest `deploy-pages.yml` run failed and no open issue names its run id: open one,
  `Red run: deploy-pages.yml <run id> on <sha7>` (`bug`, `priority:high`, `effort:medium`), with the failed job and
  the end of its log, then classify it as above.
- Never start a release yourself, and never release the grouped major (#676, #702, #843, #1370 stay held).

### 3. Red pull requests

From the broker file (`tmp/pr-status/status.json`): every open pull request into master opened by graphty-agent
(its `author`) whose `All Checks Pass` concluded `failure` on its head. A pull request anyone else opened -- the
owner's (among them the held grouped major #1677, with #676, #702, #843 and #1370), a master-guard revert (step 1),
dependabot's (step 5) -- is not this step's: skip it.

- Its branch's issue has a live `taken` marker (its session is alive, see "Alive"): that session owns it. Skip.
- Otherwise classify the failure from the failed job (see "Failure classes"): outside, re-run the failed jobs once;
  code, mark the issue and start a fix subagent on the existing branch (fix prompt above). Already on master: wait.
- Red for 24 hours with no new commit and a fix attempt already made: list it in the round's last line as stranded.

### 4. Pull requests waiting on the owner

An open pull request whose only failing step is "Check visual changes were accepted" (its screenshots changed), or
whose auto-merge `tools/pr-open.sh` left off: a breaking change (the owner gives the go with the label
`breaking-go`, which `Lint PR Title` requires), or a change to what judges a pull request or guards the owner
(`.github/`, `.claude/`, the CI and test-selection inputs, visual-review, the release files; the owner merges it). One
`ACTION NEEDED` line naming it and what to do, once per head commit, recorded with an `asked owner` marker on its
issue. Batch them into one line when there are several.

### 5. Finished branches with no pull request

A branch on GitHub with commits master lacks, whose issue's newest marker is `ready <branch> <sha>` at its tip, and
no open pull request (a branch that was finished while golden was being flushed, or a subagent whose `pr-open.sh`
failed): open it, oldest first, at most 10 open at once, so master is not buried in conflicts. Run, from the branch's
worktree (or a new worktree of the branch), `tools/pr-open.sh --proof tmp/pipeline-round/<branch>-proof.md` with a
Proof that cites the `ready` marker and the tests the branch ran. Exit 2 (a conflict with master) goes to a fix
subagent.

**Dependabot pull requests** (author `dependabot[bot]`): one into master with auto-merge off gets it turned on as
graphty-agent (`gh pr merge <n> --auto --merge`); CI gates it like any other, and a red one is classified like step 3.
One into golden (from before golden was retired) is closed with a one-line reason: dependabot now opens against
master.

```bash
git for-each-ref --no-merged=origin/master --sort=committerdate --format='%(refname:short) %(committerdate:unix)' \
  refs/remotes/origin | grep -vE '^origin/(HEAD|master|golden[^ ]*|revert/[^ ]*|dependabot/[^ ]*) '
```

### 6. Stale issues and stranded branches

- An `in-progress` issue that is stale (see "Stale" in the shared file) with no commits on its branch: write
  `released -- <reason>` and remove the label, so issue-round can pick it again.
- A stranded branch (at most one per round, only when nothing above acted): a branch from the list above with no
  `ready` marker, no pull request, no commit for a day, whose owner (its progress note, else its `taken` marker) is
  provably gone and whose worktree is clean with no process inside. Its issue still open and the work still wanted:
  mark the issue and hand the branch to a fix subagent to merge `origin/master`, finish, and open its pull request.
  Not wanted: a `stranded branch` marker with the reason; never delete the branch. A branch with no issue gets one
  first (`node tools/branch-note.mjs new-issue --title "<what it does>" --branch <b>`).

### 7. Finished worktrees

`tools/worktree-cleanup.mjs` removes finished worktrees on its own (the servherd server `worktree-cleanup`, every 15
minutes, from `.worktrees/worktree-cleanup-live`). Check only that `servherd_list` shows it online, else start it:
`servherd_start({ name: "worktree-cleanup", cwd: "/home/apowers/Projects/graphty-monorepo/.worktrees/worktree-cleanup-live", command: "node tools/worktree-cleanup.mjs --apply --every 15" })`.

### 8. Nothing to do

End with one line, for example `pipeline-round: nothing due (3 pull requests open, 1 waiting on screenshots).` No
ACTION NEEDED line unless something in "Escalation" is newly due.

## Known situations

Each: signal, meaning, action. Add to this list (see the next section).

- **`land.mjs` says a command is retired.** Golden is gone; use `tools/pr-open.sh`. `land.mjs revert` and `status`
  still run for what golden held.
- **The retired Mergify checks** (`Queue Checks Pass`) on a pull request are not required; ignore them.
- **`land.mjs revert <branch>`** reverts a land commit on the frozen golden branch only, which no longer reaches
  master. To take a change back out of master, revert its merge on a branch (`git revert -m 1 <merge sha>`) and open
  that branch's pull request with `tools/pr-open.sh`.
- **npm `previously staged version` (409).** The publish succeeded and is propagating (minutes). Not a failure.
- **The baseline seed pull request** from `visual-seed.yml` merges into master directly; it is not a stray.
- **Worktrees git refuses to remove** because of untracked build output: leave them; a fix belongs in
  `tools/worktree-cleanup.mjs`, not a forced removal.
- **Not work:** issues labelled `tracking`, `release-status`, `dead-links`, `githerd-heartbeat`, and the
  Release status issue.

## How this skill improves

When a round meets something this file or `shared.md` does not cover, or a step here turns out wrong: handle it, then
fix the file -- a new "Known situations" entry or a corrected step -- on a branch
(`./tools/worktree-new.sh docs/pipeline-round-<topic> --issue <N>`), and open its pull request like any change.
Resolved failure modes go in `lessons.md` beside this file. A rule both skills need goes in `shared.md`, never in
both. Never work around the skill in the session or in memory only. A situation that needs the same manual work every
time becomes an issue for a tool fix. Keep this file a checklist: no daemons, no state files, no scripts of its own.

## Running it

One session runs each skill at a time; other sessions may still work by hand and are coordinated only through the
`in-progress` label and markers. A /loop expires after seven days; start it again then. To pause, stop the loop.

- **Normal:** both skills. Two clients, `/loop 30m /pipeline-round` in one and `/loop 30m /issue-round` in the other;
  or one client, `/loop 30m run /pipeline-round, then /issue-round` (issue-round always after pipeline-round).
- **Drain:** only `/loop 30m /pipeline-round`. Open pull requests merge; nothing new starts.
