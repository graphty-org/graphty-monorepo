---
name: issue-round
description: Use with /loop (for example `/loop 30m /issue-round`) to run one round of starting issue work in graphty-monorepo without the owner routing it -- pick the next open issue, or a group of up to four related issues, by priority, effort and age, mark them in-progress, and start one background subagent per job that fixes, commits and stops, within the work-in-progress cap. It never lands, ships, reverts or touches golden, and it skips priority:critical issues (those are pipeline-round's alarms). Also use when changing this routine.
---

# One round of issue work

Changes reach master through the local integration branch `golden` (see "Landing changes (golden-local)" in CLAUDE.md).
This skill only starts work: it picks issues, marks them and hands them to background subagents that commit and stop.
The pipeline-round skill (`.claude/skills/pipeline-round/SKILL.md`) lands what they commit, owns every landing failure
and handles alarms. This skill **never** lands, ships, reverts, pushes or touches golden or its worktree, and it never
takes a `priority:critical` issue.

**First read `.claude/skills/pipeline-round/shared.md`**: the hard rules, how to read the state (run its commands at
the start of every round with `ROUND=issue-round` set, so it writes `tmp/issue-round/state.json`), the markers, the subagent rules, escalation and the
failure classes.

## 1. Whether to start anything

Start nothing, and end the round with one line, when:

- master's build is red (pipeline-round is fixing it, and new work would land on a broken base);
- this session's own jobs are at the cap. A **job** is one branch: a single issue or a group. Count the distinct
  branches in this session's live `taken` markers (`marked` in the state file) that have no `landed` or `released`
  marker after them. The cap is **three jobs**. First release this session's own stale jobs (see "Stale" in the
  shared file), or restart a subagent on one whose branch has commits but no `ready` marker, writing a
  `restarted <branch>` marker on every issue of its group. A job that already has a `restarted` marker since its
  newest `taken` marker is not restarted again: release it with `released -- subagent died twice, branch <b> kept`.
  A job whose newest marker is `ready`, `landing` or `land failed` is pipeline-round's: never restart or release it.

## 2. Pick the top issue

Query by priority, `high`, then `medium`, then `low`, and stop at the first that yields a candidate:

```bash
gh api graphql -f query='query($q: String!) { search(type: ISSUE, first: 30, query: $q) { nodes { ... on Issue {
  number title createdAt body labels(first: 10) { nodes { name } } } } } }' \
  -f q='repo:graphty-org/graphty-monorepo is:open is:issue label:priority:high -label:priority:critical -label:in-progress -label:needs-decision -label:needs-info -label:blocked -label:hold -label:tracking -label:release-status -label:dead-links -label:research -label:enhancement -label:documentation sort:created-asc'
```

Within a priority: `bug` before `infrastructure`, `effort:low` before `medium` before `high`, oldest first. Never lower
a priority label. An issue the owner explicitly ordered (in this session, or a label he applied) comes first;
enhancements only on such an order.

**Skip** an issue whose fix is already in flight: its number with `Fixes`, `Closes`, `Resolves` or `Refs` in
`git log origin/master..origin/golden` (landed, not shipped -- it stays open until ship), or in a branch not yet on
golden (`git log --all --not origin/golden --grep='#<n>\b' --oneline | head`) whose issue has a live `taken` marker or
an open pull request. A hit on an abandoned branch is pipeline-round's stranded-branch material, not in flight. An
issue master or golden already names gets a verify-and-close subagent instead of a new fix. Skip breaking changes,
anything under `design/brand`, the held major (#676, #702, #843, #1370), `Release held:` issues and master-guard's
`lane red on master` issues (pipeline-round's, whatever their labels; check titles, since GitHub search cannot exclude a title phrase).

An issue whose last marker is `released -- 2 fix attempts failed ... branch <b> kept` is picked like any other; its job
continues on that branch, with the evidence on the issue. The new `taken` marker starts the fix-attempt count from
zero; if the job fails again for the same cause, pipeline-round labels it `needs-decision` and asks the owner, and this
skill skips it from then on.

## 3. Group related issues

Judge, from the issues' titles and bodies and the code they point at, which other open issues belong in the same job
as the top one. This is a judgment, not keyword matching. An issue belongs when it shares the top issue's file or
component, its root cause, its symptom, or would be touched by the same fix. Candidates are the same query's other
results plus one more search of open issues naming the same package or file (respect the same skips, and never add a
`priority:critical` issue). At most **four issues** per job. When unsure, leave it out: a wrong group costs a release,
a missed one costs only a later job. A group counts as one job against the cap.

## 4. Mark and start

Create the label if it is missing (see "Markers" in the shared file). For every issue in the job: `gh issue edit <n> --add-label in-progress` and the comment
`pipeline-round: taken by session $CLAUDE_CODE_SESSION_ID, branch <branch>, worktree .worktrees/<name>, group #a #b -- <one-line reason naming the rule that picked it and why each issue belongs>`
(leave out `group` for a single issue). Branch name: `fix/<top issue>-<short-topic>`.

Then start one background subagent with this prompt, filled in, followed by the "Subagent rules" paragraph from the
shared file verbatim:

> Fix GitHub issues <#a (title), #b (title), ...> in graphty-org/graphty-monorepo as one change. Work only in
> <a new worktree: from /home/apowers/Projects/graphty-monorepo run
> `./tools/worktree-new.sh <branch> origin/golden <name>` | the existing branch <b> in its worktree <path>, after
> `git merge origin/golden` there>. First verify the
> group: read every issue and confirm each still reproduces on origin/golden and shares the fix. For an issue that
> does not reproduce, comment the evidence, close it and remove its `in-progress` label. For one that turns out
> unrelated, comment `pipeline-round: released -- not part of <branch>: <reason>` and remove its `in-progress` label;
> it goes back to the queue. Then find the root cause and fix it there; look for sibling bugs with the same cause in
> the same package. Follow CLAUDE.md and the package's CLAUDE.md. Run the affected packages' lint, build and tests.
> Commit with one `Fixes #N` line per issue the change finishes (`Refs #N` for one that must stay open). Then comment
> `pipeline-round: ready <branch> <full sha>` on every issue still in the group, and stop.

End the round after starting one job; the next round starts the next while the cap allows.

## Known situations

Each: signal, meaning, action. Add to this list (see the next section).

- **An issue fixed on golden stays open until ship.** Do not pick it again; step 2's golden check catches it.
- **A finished job waits.** A `ready` marker with no `landed` after it is pipeline-round's to land; in issues-only mode
  it waits for the next pipeline round. Never land it here.
- **A subagent released every issue of its group** (none reproduced, or all unrelated). The job is over: it no longer
  counts against the cap.
- **Not work:** issues labelled `tracking`, `release-status`, `dead-links`, `githerd-heartbeat`, the Release status
  issue, `Release held:` issues and `lane red on master` issues.

## How this skill improves

When a round meets something this file or `shared.md` does not cover, or a step turns out wrong: handle it, then fix
the file -- a new "Known situations" entry or a corrected step -- on a branch
(`./tools/worktree-new.sh docs/issue-round-<topic> origin/golden`), commit with a `ready` marker on the golden pull
request, and let pipeline-round land it. A rule both skills need goes in `shared.md`. Never work around the skill in
the session or in memory only. Keep it a checklist: no daemons, no new state files, no scripts of its own.

## Running it

One session runs this skill at a time; a /loop expires after seven days, and stopping the loop pauses it.

- **Normal:** with pipeline-round. Two clients, `/loop 30m /issue-round` here and `/loop 30m /pipeline-round` in the
  other; or one client, `/loop 30m run /pipeline-round, then /issue-round` (this skill always second).
- **Issues only:** this skill alone. Finished branches wait, marked `ready`, for the next pipeline round.
- **Drain:** do not run this skill; only pipeline-round runs.
