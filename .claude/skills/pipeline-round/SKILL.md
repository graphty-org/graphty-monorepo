---
name: pipeline-round
description: Use with /loop (for example `/loop 30m /pipeline-round`) to run one round of keeping graphty-monorepo's pipeline moving without the owner routing work -- react to a red master build, master-guard revert pull requests, priority:critical issues, held releases and failed publishes, keep the golden integration branch landing and shipping, land branches that background subagents finished, own every landing failure, revive stranded branches, remove finished worktrees, and escalate only what only the owner can do. It never starts new issue work (that is issue-round). Also use when changing this routine.
---

# One round of the pipeline

Changes reach master through the local integration branch `golden` and one standing golden pull request (see
"Landing changes (golden-local)" in CLAUDE.md and `design/ci/golden-local.md`). Nobody routes work: a session runs this
skill under `/loop`, and each run is one round that looks at the repository, takes the few actions that are due, and
ends. The real work happens in background subagents that commit and stop; a later round lands what they committed.

This skill never starts new issue work: picking and starting issues is the issue-round skill
(`.claude/skills/issue-round/SKILL.md`). This skill handles alarms, golden, landings and their failures, stranded
branches and worktrees.

**First read `.claude/skills/pipeline-round/shared.md`**: the hard rules, how to read the state (run its commands at
the start of every round), the markers, the subagent rules, escalation and the failure classes. Both skills follow it.

## The round, in priority order

Work down the steps. A step that acts may end the round; otherwise continue. "End the round" ends only this skill's
part: in the one-client normal mode, issue-round still runs after it in the same `/loop` prompt.

### 1. Red master, guard reverts, critical issues

- **Check:** master's newest completed build; the `alarms` list (master-guard files `Red master: CI failed on <sha7>`
  and `<run name> lane red on master` issues, and opens revert pull requests on branches `revert/<sha7>`).
- **Needs action:** master's build is red, or an open critical issue or `revert/` pull request exists.
- **Action:** classify the failure from the failed job's step log (`gh run view <id> --log-failed`) and
  `git log <last green sha>..<red sha> --first-parent`. Outside cause: re-run the failed jobs once (see "Re-runs" in
  the shared file). Code: mark the alarm issue (`in-progress` plus a `taken` marker naming this session) and start one
  background subagent with the fix prompt below and `Fixes #<issue>`; skip it while a `taken` marker on it is live and
  its job is not stale (see "Stale" in the shared file: this session's own dead subagent does not block it). A
  master-guard revert pull request whose master is green again: close it with a one-line reason. Each still-red job
  is its own problem with its own fix. After three failed fix attempts on one problem (count the `taken` markers on
  its issue), ask the owner once with the findings.
- **While master's build is red:** step 4 lands only the branch whose commit names the red-master issue, step 5 does
  nothing, and ship condition 1 applies. If golden already holds other landings since the last ship,
  `land.mjs revert` them first and land them again once master is green.
- **`--priority`** (`node tools/land.mjs land --priority <branch>`, also on `revert`, `cut` and `cut-fix`) waits ahead of
  every ordinary landing. Use it only for the red-master fix and other fixes that unblock the pipeline (a broken
  golden, a fix a cut is blocked on), never to speed up ordinary work.
- **A critical issue that is not a red master** is still this skill's alarm (issue-round skips every
  `priority:critical` issue): mark it and start a fix subagent the same way, ahead of everything below.

**Fix prompt** (alarms, holds, landing failures), filled in, followed by the "Subagent rules" paragraph from the
shared file:

> Fix <what: the issue #N and its title, or the landing failure of branch B with gate log L>. Work in
> <a new worktree: from /home/apowers/Projects/graphty-monorepo run
> `./tools/worktree-new.sh <branch> origin/golden-verified <name> --issue <N>` | the branch's existing worktree <path>>. Read the evidence
> first and confirm it still reproduces. Find the root cause and fix it there; follow CLAUDE.md and the package's
> CLAUDE.md; run the affected package's lint, build and tests. Commit with <`Fixes #N` | `Refs #N`, one line per issue
> of the branch's group>, then comment `pipeline-round: ready <branch> <full sha>` on <every issue of the branch's
> group | the golden pull request> and stop.

### 2. Held release, failed publish

- **Check:** the `held` list. A train hold is `Release held: <what> failed on <sha7>`; a publish hold is
  `Release held: publish failed on <sha7>`, sometimes with a suffix.
- **Release status:** a failure announcement on the `Release status` issue newer than its last success (a run that
  ended badly with no hold issue) is handled like a train hold, from the run it names.
- **Train hold:** read the run it names, classify the failure. Code: mark the hold and start a fix subagent with
  `Refs #<hold>` -- never `Fixes`, because the open hold is what restarts the train on the next green master build.
  Paid capacity or credential: owner item.
- **Publish hold:** suffix `npm has not listed ... yet`: nothing to do, it closes itself. A suffix naming the npm
  trusted publisher ("owner must create ..."): owner item, with the steps in CLAUDE.md "A new package's first npm
  publish". Any other publish hold: check npm first (`npm view @graphty/<pkg> versions --json`); if the versions are
  missing, run `gh run rerun <run id> --failed` once and record it on the issue.
- Never start a release yourself, and never release the grouped major (#676, #702, #843, #1370 stay held).

### 3. Keep golden moving

`node tools/land.mjs status` lists the landings not on master yet, the golden pull request, verification and the
lock holder.

**Verification first.** Each landing starts a verification run of golden's new tip (`tools/verify.mjs`, state in
`tmp/golden/verify.json`; see "Verification after landing" in CLAUDE.md). Verification finds and records; this round
acts. Read `node tools/verify.mjs status` (and `--branch golden-cut` when a cut-fix was made) and, before diagnosing
anything, `.claude/skills/pipeline-round/lessons.md`:

- **`run DEAD`** (a run is recorded but its process is gone): `node tools/verify.mjs start`. It picks up where the run
  stopped; a stopped bisect resumes from the points it recorded, never from the start.
- **`verified` behind golden's tip and `running: none`**, whatever the last result says: `node tools/verify.mjs start`.
  A commit whose last result was a failure is not verified again unless you add `--again` (after a fix outside the
  code, such as an `infrastructure` issue closed).
- **`last: failed ... culprit <sha> land: <branch>`:** first `node tools/verify.mjs claim --session <this session's id>`
  (it refuses while another live session holds the claim, and says when it took over one whose session is gone: then
  look first for that session's revert on golden and its comments, and do only what is missing). Then, at once, with
  no round of grace: `node tools/land.mjs revert --priority <branch>` in the background; a comment on the branch's
  issue, `pipeline-round: broke golden <branch> verification <failing shard> at <sha7>, reverted -- log <path>`, plus
  a `fix attempt` marker and a fix subagent (the "Two attempts" rule applies); and a one-line comment on the issue of
  every open branch that contains the culprit (`git branch -r --contains <culprit sha>`, each branch's issue from its
  name or `git config branch.<b>.issue`) saying it holds a reverted landing and should merge `origin/golden-verified`
  again once verification passes. When the revert is pushed: `node tools/verify.mjs handled`.
- **`last: failed ... NOT REPRODUCED`:** the failing shard passed when run again on the same commit. Never call it a
  flake and never just re-run: claim it, find the mechanism (the gate log, the lessons file), fix the cause or file the
  issue the failure classes call for, then `handled`, and `start --again` once the cause is fixed.
- **A culprit that is not a landing** (an owner's accept commit, a sync merge of master): revert nothing; claim it,
  diagnose, and file or fix like any golden failure.
- **Lessons.** When a round resolves a failure mode `lessons.md` does not hold, add an entry there (symptom, how it was
  told apart from a real failure, the fix) on the round's next docs branch.

**A failed landing** is a `land failed <state>` marker newer than the branch's last `ready`. This skill owns every failure of
a landing it started (one with its `landing` marker). A change a human-run session is landing itself (the lock line
names another session, or the branch has no `ready` marker) belongs to that session; this skill picks it up only when
it goes stale, as a stranded branch (step 6). Act by the branch's own state from the summary (a landing of several
branches returns one exit code for the run, 5 when it had both a conflict and a gate failure, so never route by the
run's code):

| Cause                                                                          | Action                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `conflict`                                                                     | A fix subagent in the branch's worktree runs `git fetch origin`, `git merge origin/golden`, then `git merge origin/master`, resolves keeping both sides' intent, runs the affected tests, commits, writes `ready` and stops. A later round lands it.                                                   |
| `gate failure` whose `blame result` is `branch`                                | A fix subagent reads the gate log the marker names, fixes the branch, commits, writes `ready` and stops. The issue keeps its `in-progress` marker: it is the same job.                                                                                                                                 |
| `gate failure` with no `blame result` yet                                      | Start the blame check below, unless a `blame check` marker for this branch and shard exists. Send no fix subagent until a result exists.                                                                                                                                                               |
| `gate failure` whose `blame result` is `innocent` or `culprit <landing>`       | Golden is broken, not the branch: `node tools/land.mjs revert <culprit>` in the background, and send the culprit to a fix subagent with a `fix attempt` marker on its issue. Land the innocent branch again unchanged. Never hand the problem to an innocent branch.                                   |
| `not tried (the landing stopped)`, run exit 4, golden moved during the gate    | No outcome for the branch and no fix attempt used: land again.                                                                                                                                                                                                                                         |
| `not tried`, run exit 4, golden cannot take `origin/golden` or `origin/master` | A subagent merges by hand in `.worktrees/golden-local` with a signed commit; owner item when the conflict is in screenshot records or `visual-baselines/`.                                                                                                                                             |
| Machine or network (outside class: DNS, a killed process, a GitHub outage)     | Write a `retry` marker and land again next round (`PUSH_QUEUE_RETRY=1` if the push queue refuses). When a `retry` marker with the same signal already exists, file or update one `infrastructure` issue with both gate logs and stop landing that branch until the issue closes or the signal changes. |
| A bug in `land.mjs`, the push queue or the gate (tool class)                   | Fix the tool on its own branch with a fix subagent and land it; a gate or push-queue fix also goes live with `tools/live.sh gate <branch>`. Never work around the tool in the session. The blocked branch lands again after.                                                                           |
| `refused`, or run exit 1                                                       | Fix what the message names.                                                                                                                                                                                                                                                                            |

- **Whose fault.** The failure is the branch's when the failing check is in a package the branch changes (or that
  depends on one), and the same check passes on `origin/golden` alone. To check golden alone, write
  `blame check <branch> <shard> on golden <sha7>, log <path>` on the golden pull request, then run the failing shard
  in a scratch worktree on `origin/golden` (`./tools/worktree-new.sh check/golden-<sha7> origin/golden --issue <the branch's issue>`, then
  `./tools/run-tests.sh <shard> > <path> 2>&1` in the background). A later round (or this session when the run's exit
  notice arrives) reads the log and writes `blame result <branch> <innocent|branch|culprit <landing>>`. The culprit is
  the newest landing on `git log --first-parent origin/master..origin/golden` that touched the failing package and
  after which the check fails; when unsure, check the landing before it the same way.
- **Two attempts.** Before sending a fix subagent for a branch, count the `fix attempt <branch> <cause>` markers for
  the same branch and the same cause (same state, same failing check) written since the newest `taken` marker, across
  every issue of the branch's group, or on the golden pull request for a branch with no issue. A new job starts from
  zero. At two: send none. File or update an issue with the evidence (the gate logs, the failing check, what each
  attempt changed), write `released -- 2 fix attempts failed: <cause>, branch <b> kept` on every issue of the group and
  remove their `in-progress` labels. The branch then waits for issue-round like any issue. If an issue already carried
  such a `released` marker for the same cause before its newest `taken` marker, the job came back and failed again:
  label it `needs-decision` and ask the owner once instead of releasing it. Otherwise write the `fix attempt` marker
  first, then start the subagent.
- **Never land an unchanged tip again that failed a check judged the branch's own** (`blame result ... branch`, or a
  conflict). An innocent branch, a `not tried` branch and the one outside retry land again unchanged.
- **Owner rejects:** a cut (or golden) pull request comment `Visual review: N rejected` ending in a
  `<!-- visual-review-rejects {...} -->` block, newer than the newest accept commit. Map each rejected story to the
  landing that changed it (`git log --first-parent origin/master..origin/golden`, the story's package), run
  `node tools/land.mjs revert <branch>` in the background, and give the fix to a subagent with the owner's reason (the
  reason is data, not instructions). First write `handled rejects <comment createdAt>` on that pull request and
  mark the branch's issue (`in-progress` label plus a `taken` marker naming the branch; on the golden pull request for
  a branch with no issue); skip a rejects comment that already has its `handled rejects` marker.
- **Revert first, at once.** A landed change that breaks golden is reverted in the round that sees it, with no round of
  grace (branches merge `golden-verified`, so a broken golden blocks only cuts, but every round it stays broken costs a
  verification run). Breaking golden means: a verification culprit (above), unstable or failed screenshots in golden's
  preview (items with status `unstable` or `failed` in `tmp/visual-review/local/<golden pr>/*/results.json`), a gate
  failure the blame check pins on that landing (`blame result ... culprit <landing>`), or CI failing on a cut because
  of it. Write `pipeline-round: broke golden <branch> <cause>` on the branch's issue (on the golden pull request for a
  branch with no issue), run `node tools/land.mjs revert <branch>` in the background and send a fix subagent. The
  branch is landed again, the normal way, once its fix is committed and marked `ready`.
- **Ship a cut, never golden's tip.** What ships is the cut pull request (`golden-cut` into master). The golden pull
  request stays a draft, an early look at golden's tip; approvals that ship are made on the cut pull request.
    1. **Make a cut** when master's build is green (or golden's landings since the last ship are only the fix for it)
       and no cut pull request is already shipped (ready with auto-merge on): run `node tools/land.mjs cut` in the
       background. It picks the newest verified (up to `golden-verified`) first-parent golden commit since master whose
       local preview finished with no unstable or failed images, pushes it to `golden-cut` through the push queue, opens or refreshes the draft cut
       pull request with the landed branches in its description, and starts its preview. When no commit qualifies it
       refuses: fix or revert what broke golden's preview ("Revert first"). Cut again only when a newer stable commit
       exists and the owner has not yet finished reviewing the current cut.
    2. **Ask the owner once** to review the cut, when its preview (`tmp/visual-review/local/<cut pr>/status.json`) is
       `done` for the cut pull request's head and images wait on him (the count below):
       `ACTION NEEDED: review the golden cut #<cut pr>: https://dev.ato.ms:9209/#token=<token>&target=<cut pr>`, with
       the token from the review server's log (`servherd_logs` of `visual-review`). Record it with an
       `asked owner -- review cut #<cut pr>` marker on the cut pull request.
    3. **Ship** with `node tools/land.mjs ship` after his Finish, when all of these hold:
        1. master's build is green, or the cut's landings are only the fix for it;
        2. no breaking commit without the owner's go:
           `git log --format=%s origin/master..origin/golden-cut | grep -E '^[a-z]+(\([^)]*\))?!:'` prints nothing;
        3. the owner finished the review: an accept commit on the cut
           (`git log origin/golden-cut --format='%h %s' --grep='accept visual baselines for #<cut pr>'`), or nothing
           to decide (the "images waiting" count is 0);
        4. no baseline lacks an approval for the cut pull request:
           `node visual-review/trusted/cli.mjs gate --captures tmp/visual-review/local/<cut pr> --base origin/master --head origin/golden-cut --pr <cut pr> 2>&1 | grep -c 'baseline without a review'`
           prints 0. This only reads records, not captures (its "no capture results" lines are expected). Lines
           naming an older pull request's record clear only when the owner approves them again on the cut pull
           request; if they survive his Finish, file a visual-review issue and ask him once instead of waiting;
        5. no rejects comment on the cut pull request is newer than the accept commit.

        `ship` itself refuses when the cut pull request's head moved since its last finished preview by anything but
        the owner's accept commits, and until the head is verified (a `cut-fix` starts golden-cut's verification:
        `node tools/verify.mjs status --branch golden-cut`).
- **Images waiting on the owner:** count them for a pull request with
  `jq -r '.items[] | select(.status|test("^(changed|moved|new|unseeded|removed)$")) | .file' tmp/visual-review/local/<pr>/*/results.json | wc -l`.
  Items with status `failed` or `unstable` are broken captures, not review: see "Revert first".
- **CI failure on the cut pull request:** only counts when it is not a draft (while a draft, its rollup always reads
  FAILURE: `All Checks Pass` fails on purpose with "draft: CI not run"). Read the newest run that has a verdict, the
  failed jobs under `All Checks Pass`, and their logs. Outside: re-run the failed jobs once. Code: run
  `gh pr ready --undo <cut pr>`, write `broke golden <culprit> cut CI` on the culprit's issue and follow "Revert
  first", then cut again. Never re-run a run that started while the pull request was a draft; cancelled or missing
  checks are no verdict.
- **Stale preview:** if `status.json`'s `head` is older than the newest landing and no preview is running (the
  status's `state` is not `running`), start one in the background: `./tools/visual-preview.sh <golden pr>`.

### 4. Land what subagents finished

- **Landing never waits for a ship.** What ships is the cut, a fixed commit on `golden-cut`, so landings on golden
  go on while the cut pull request is reviewed, in CI or merging.
- **Find:** in `marked` (and on the golden pull request, for branches with no issue), the newest marker
  `ready <branch> <sha>` with no `landed` or `land failed` marker after it. Subagents of both skills write these. A
  group writes the same `ready` on every issue: group them by branch and land each branch once. Check
  the branch still points at that sha and its worktree is clean (`git -C <worktree> status --porcelain` prints
  nothing). Leave out, with a `needs-decision` label and comment, a branch with a breaking commit
  (`git log --format=%s origin/golden..<branch> | grep -E '^[a-z]+(\([^)]*\))?!:'` prints something).
- **Action:** write `landing <branch> <sha>` for each branch on every issue of its group, then land every ready
  branch in one background run, the one with the most changed files first:
  `node tools/land.mjs land <b1> <b2> ...` with `run_in_background`. End the round. The landing checks without the
  lock and holds it only for seconds to push, so it need not wait for `lock: free`; a landing of this session that is
  still running is left alone.
- **When the landing's exit notice arrives** (in this session, between rounds): write markers from each branch's own
  row of `land: summary`, on every issue of its group: `landed` or `already on golden` means `landed <branch> <sha>`;
  `conflict` means `land failed conflict ...`; `gate failure, log: <path>` means `land failed gate ..., gate log <path>`;
  `refused` means `land failed refused ...`; `not tried (the landing stopped)` gets no outcome and lands again. The
  next round's step 3 handles a failure. No `land: summary` line means nothing is known: write no outcome. If the
  session died before writing it,
  the next round finds `ready` without an outcome: a branch whose tip is on `origin/golden` landed; otherwise land it
  again only if it has one `landing` marker for that sha, never two.
- A landed issue keeps its `in-progress` label until a cut holding it ships and `Fixes #N` closes it.

### 5. Stale issues

An `in-progress` issue that is stale (see "Stale" in the shared file) with no commits on its branch: write
`released -- <reason>` and remove the label, so issue-round can pick it again. One with commits is step 6 material.

### 6. Stranded branches

At most one per round, and only when nothing above acted.

- **Find** every branch golden does not have, numbered or not: the open-work table of `node tools/land.mjs status`
  (every branch on GitHub golden lacks, with its issue, the owner its progress note names, its last commit, `ready`
  and its worktree), plus local branches GitHub does not have yet, plus open legacy pull requests (every pull request
  in the broker file except golden, `revert/` and the visual seed):

    ```bash
    git for-each-ref --no-merged=origin/golden --no-merged=origin/master --sort=-committerdate \
      --format='%(refname:short)|%(committerdate:unix)|%(worktreepath)|%(upstream:short)' refs/heads | head -40
    ```

- **A branch with no issue gets one** before anything else: open it with
  `node tools/branch-note.mjs new-issue --title "<what the branch does>" --branch <b> [--type T --priority P --effort E]`,
  record it with `git config branch.<b>.issue <N>`, and write the note with
  `node tools/branch-note.mjs start --issue <N> --branch <b> --worktree <path>`. A local branch GitHub does not have is
  pushed: `git push --no-verify -u origin <b>`.

- **Stranded** means the branch's owner is provably gone (the owner its progress note names, else its `taken` marker's
  session): not a branch the `land.mjs status` lock line names, its
  worktree (if any) is clean with no process inside, no commit for a day (`$(date +%s)` minus the unix time above is
  over 86400), and either a `taken` marker whose session is not alive or, with no marker, no running Claude session
  whose transcript or working directory names the branch or worktree
  (`grep -lF -- <branch> ~/.claude/projects/*/*.jsonl` for sessions that are alive, see "Alive"). Tip age alone never
  makes an unmarked branch stranded. This includes a branch a human-run session was landing and abandoned.
- **Skip** a branch whose issue's newest marker is `released -- 2 fix attempts failed ...`: it waits for issue-round.
- **Action:** judge whether the work is still wanted (its issue open and not fixed on master or golden). Wanted: mark
  the issue (`in-progress` label plus a `taken` marker naming this session) and hand the branch to a fix subagent to merge `origin/golden-verified`
  then `origin/master`, check it, and write `ready`. Not wanted: write a `stranded branch` marker with the reason on its
  issue or pull request so no later round judges it again; never delete the branch. A branch whose pull request
  carries `hold` may be fixed but is never landed until `hold` is removed: once on golden, the next ship takes it.

### 7. Finished worktrees

Merged branches stay on GitHub and here as history; this step removes only finished worktrees, never a
branch on GitHub. At most five removals per round. List candidates (read-only; it skips the main checkout, locked worktrees and the live
tool worktrees in `tools/live-tools.json` plus `golden-local`):

```bash
cd /home/apowers/Projects/graphty-monorepo
fp=$(mktemp); git rev-list --first-parent origin/master origin/golden >"$fp"
git worktree list --porcelain | awk '/^worktree /{w=$2; l=0} /^locked/{l=1} /^branch /{sub("refs/heads/","",$2); if (!l) print w, $2}' |
while read -r dir br; do
  case "$dir" in "$PWD"|*/golden-local|*/gate-live|*/githerd|*/visual-review-server-v3|*/sonar-baseline-runner) continue;; esac
  [ "$(git rev-list --count "refs/heads/$br" --not origin/master origin/golden)" = 0 ] || continue
  grep -qx "$(git rev-parse "refs/heads/$br")" "$fp" && continue
  git log origin/golden --format=%s | grep -qxF "Revert \"land: $br\"" && { echo "keep (reverted) $dir"; continue; }
  cat tmp/pipeline-round/state.json tmp/issue-round/state.json 2>/dev/null | grep -qF -- "branch $br," && { echo "keep (taken) $dir"; continue; }
  if ls -l /proc/[0-9]*/cwd 2>/dev/null | grep -qF -- "-> $dir"; then echo "keep (process) $dir"
  elif [ -n "$(git -C "$dir" --no-optional-locks status --porcelain)" ]; then echo "keep (dirty) $dir"
  else echo "remove $dir $br"; fi
done; rm -f "$fp"
```

Every commit of a `remove` line's branch is on origin/master or origin/golden, and the branch has commits of its own (a
fresh branch sits on the first-parent line and is skipped). A branch reverted from golden, or named by a `taken` marker
in the state files, is kept: a fix is due on it. The process check sees only processes whose working directory is
inside the worktree, never Claude agents (they work by absolute path), which is why the marker check is there. Ignored
files go with the worktree: move a non-empty `<dir>/tmp/` to the main checkout's `tmp/<worktree name>/` first; build
output and `node_modules` are discarded. Remove with `git worktree remove <dir>`, then `git branch -d <branch>` (git
refuses `-d` for a branch that is only on golden; that is fine, the branch stays). A refusal is reported, never forced.
If `live-tools.json` gains a tool, add its worktree to the `case` line.

Also fast-forward the main checkout when it is on master with no tracked changes and no merge or rebase in progress:
`git -C /home/apowers/Projects/graphty-monorepo merge --ff-only origin/master`.

### 8. Keep the watcher running

End every round that left no unclaimed verification failure by making sure one watcher runs, so a failure recorded
between rounds wakes this session at once instead of at the next round:
`pgrep -f '[v]erify.mjs watch' >/dev/null || node tools/verify.mjs watch` with `run_in_background` (the brackets keep
pgrep from matching its own command line). Its exit notice means a failure was recorded: run step 3's verification
part then, not the whole round.

### 9. Nothing to do

End with one line, for example `pipeline-round: nothing due (golden 3 landings, review pending since <sha7>).` No
ACTION NEEDED line unless something in "Escalation" is newly due. The review request is about the cut pull request
only, asked once per cut: only when no `asked owner -- review cut #<cut pr>` marker on it is newer than its head.

## Known situations

Each: signal, meaning, action. Add to this list (see the next section).

- **Golden pull request reads FAILURE.** It stays a draft (it never ships), so ci.yml fails `All Checks Pass` on
  purpose. Ignore it; the cut pull request reads the same until it is shipped. The retired Mergify checks on it report NEUTRAL; ignore those too.
- **The owner is not told about the cut review.** The review server's inbox and notifier skip drafts, and the cut
  pull request is a draft until ship. The round's ACTION NEEDED line is what tells him; the real fix belongs in
  visual-review (file an issue if none is open).
- **Old pull request branches carry their own accept records.** Their approvals name the old pull request's number, so
  on the cut pull request those baselines show as `baseline without a review` and the owner must approve them again.
  Say so in the review request.
- **Shipped, waiting on CI.** Landings go on; no new cut until the shipped cut pull request merges or returns to
  draft. Once it merges, the next `land`, `revert` or `status` sync merges origin/master into golden.
- **A red master after a ship.** master-guard's revert of the golden merge takes out every change in that ship, and
  `land.mjs` then merges that revert into golden too; a later ship does not bring the changes back (git counts them as
  merged). Prefer `land.mjs revert <culprit>` on golden plus a ship of only the fix. If the guard's revert is used, the
  round merges it itself (`gh pr merge`, never auto-merge; normally nothing but the golden pull request and the
  baseline seed pull request merges into master, and this revert is the only other exception) and at
  once lands, as a branch, a revert of that revert minus the culprit, and reopens or re-marks the culprit's issue.
- **master-guard still freezes and lifts a Mergify queue.** That no longer stops anything; ignore it.
- **npm `previously staged version` (409).** The publish succeeded and is propagating (minutes). Not a failure.
- **Worktrees git refuses to remove** because of untracked build output an old branch's `.gitignore` did not cover:
  they show as `keep (dirty)`. Leave them; a tool fix belongs in `tools/worktree-prune.sh`, not a forced removal.
- **About three dozen open pull requests from the retired Mergify flow.** They are step 6 material. `hold` means do not
  merge, not do not touch.
- **The baseline seed pull request** from `visual-seed.yml` merges into master directly; it is not a stray.
- **Not work:** issues labelled `tracking`, `release-status`, `dead-links`, `githerd-heartbeat`, and the
  Release status issue.
- **A re-run of a run that started while the pull request was a draft** reuses the draft event and skips CI again. Push
  or mark ready instead.

## How this skill improves

When a round meets something this file or `shared.md` does not cover, or a step here turns out wrong: handle it, then
fix the file -- a new "Known situations" entry (signal, meaning, action) or a corrected step -- on a branch
(`./tools/worktree-new.sh docs/pipeline-round-<topic>`), and land it like any change. Resolved failure modes go in
`lessons.md` beside this file instead. A rule both skills
need goes in `shared.md`, never in both. Never work around the skill in the session or in memory only. A situation
that recurs and needs the same manual work every time becomes an issue for a tool fix, not a longer routine. Keep this
file a checklist: no daemons, no new state files of its own (verification's file belongs to `tools/verify.mjs`), no
scripts of its own.

## Running it

One session runs each skill at a time; other sessions may still work by hand and are coordinated only through the
`in-progress` label and markers. A /loop expires after seven days; start it again then. To pause, stop the loop.

- **Normal:** both skills. Two clients, `/loop 30m /pipeline-round` in one and `/loop 30m /issue-round` in the other;
  or one client, `/loop 30m run /pipeline-round, then /issue-round` (issue-round always after pipeline-round).
- **Drain:** only `/loop 30m /pipeline-round`. Work in flight lands and ships; nothing new starts.
- **Issues only:** only `/loop 30m /issue-round`. Finished branches wait, marked `ready`, for the next pipeline round.
