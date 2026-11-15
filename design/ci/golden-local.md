# Golden-local landing

> Status: Deprecated 2026-10-21 by design/ci/fast-pipeline.md (issue #3262). Its landing model is replaced (the full-gate row of 3.1, sections 4.2, 4.3, 4.7 and 4.8, the landing-failure rows of 4.13, and 4.14's cut selection and one-round grace before a revert); the rest remains in force, and the tools follow this document until the fast pipeline is built.

> Status: Partly superseded again on 2026-10-23 by design/ci/ci-full-testing.md (issue #3316): every push and landing runs a light local gate (lint, build, SonarQube on changed lines, the GPU tests when affected) and the full test suite runs in GitHub CI on golden before a cut. Sections 3.1 (the full-gate row), 3.2 (the first row), 4.2 step 4, 4.5, 4.7, 4.9 (the CI-failure row), 5.2 and 6.1 are marked below.

Status: adopted by the owner on 2026-10-18. Decision record:
`design/decisions/2026-10-18-golden-local-adopted.md`. This document replaces the merge half of
`design/ci/ci-cd-plan.md` and the whole of the githerd design (see "Superseded documents" at the
end). The release train is unchanged.

## 1. What it is

Golden-local is how a change reaches master in graphty-org/graphty-monorepo. Every change is
merged ("landed") on this machine into one integration branch called `golden`, after the full
local pre-push gate has passed on the merged result. `golden` is pushed to GitHub at every landing.
One standing pull request carries `golden` into master. The owner reviews the screenshots of that
one pull request on the local review page, whenever convenient, and then the pull request is
shipped: CI runs the affected suite on it once, as a double check on a clean machine, and GitHub
merges it. There are
no per-change pull requests, no merge queue and no daemon driving sessions.

The flow in one line:

```
change branch -> land into golden (full local gate) -> golden pushed to GitHub
  -> standing draft PR golden->master -> owner reviews screenshots locally
  -> ship (ready + auto-merge) -> CI double check on the golden PR -> merged to master
```

Releases are cut from master by the release train, exactly as before.

## 2. History of problems that led here

### 2.1 Work stranded before it ever reached a queue

A census on 2026-10-17 found **574 product commits on 70 branches** that never reached master.
**139** of them were fixes to code that is still on master, so real defects stayed fixed only on
side branches.

A stuck-work report the same day found **237 unlanded items**:

| State                                    | Count |
| ---------------------------------------- | ----- |
| Branch with no pull request at all       | 203   |
| Waiting on the owner's screenshot review | 14    |
| Pull request with a merge conflict       | 10    |
| Draft pull request                       | 6     |
| Held (`hold` label)                      | 3     |
| Queued in Mergify                        | 1     |

**154** of the 237 touched product code and were more than 24 hours old.

The cause: the path to master had too many hand-offs (open a pull request, wait for CI, wait for a
screenshot review, wait for the queue), and each hand-off was a place work could be dropped. The
largest group, 203 branches with no pull request, had fallen out before the first hand-off.

### 2.2 The branding change: a day of waiting

The brand-colors change (#3139) and the app-logo change (#2987) took over 24 hours to land, and
almost all of that time was waiting, not work:

- #2987 had #3139's commits folded into it. Screenshot approvals are recorded per pull request, so
  the gate rejected #2987's images even though the owner had approved the same images on #3139.
- Every move of master made the baseline images conflict. Each conflict forced a recapture, a new
  owner review and another CI run, at 30 to 60 minutes per loop.

The cause: approval keyed to a pull request, combined with many pull requests touching the same
images, turns every master move into another review.

### 2.3 The merge queue was healthy; the stalls were before it

Mergify's own numbers for the seven days to 2026-10-18:

| Measure                              | Value  |
| ------------------------------------ | ------ |
| Pull requests that entered the queue | 418    |
| Merged                               | 371    |
| Merged on the first try              | 343    |
| Median time from entering to merged  | 23 min |
| 90th percentile                      | 62 min |
| Stuck in the queue                   | 0      |
| Left the queue for a conflict        | 20     |
| Left the queue for a failed check    | 21     |

The queue was not the bottleneck. Everything that stalled, stalled before a pull request entered
it: no pull request, a conflict, a draft, a pending screenshot review.

### 2.4 Every change was tested three or four times

A change ran:

1. the heavy local pre-push gate (build, lint, knip, SonarQube, affected tests, the local NVIDIA
   GPU lane),
2. the pull request's CI,
3. Mergify's full-suite run on the combined batch,
4. the release train's full run.

GitHub-hosted runners are limited and became a bottleneck. In the past, a full CI run on master
after every merge was a bottleneck too, which is why master runs no tests today. The owner will
not pay for GPU tests except at release, so GPU testing has to happen on this machine before a
push.

### 2.5 githerd

githerd was a daemon that dispatched interactive Claude sessions through tmux: claims on jobs,
status questions every 15 minutes, inference of who owned a pull request, invitations to idle
sessions, pauses, and 13 MCP tools, specified by a 2,197-line design. It broke its own rules:

- The design said every wait is bounded. A pause stalled all workers for about 30 hours.
- The design said the owner's own sessions are never interrupted. They were messaged every 15
  minutes.
- Its non-goals excluded timers and new workflows. It gained both (a twice-hourly watchdog
  workflow and several internal timers).
- It could not see work that had no pull request -- the 203 branches in section 2.1.

About half of its design existed only to drive sessions. Much of the rest duplicated Mergify,
`master-guard.yml`, the release workflows and `tools/push-queue.sh`. It created a new failure
family (stale claims, wrong ownership guesses, sessions released while working) without removing
an old one.

### 2.6 Token waste from waiting

A Claude Code hook refuses foreground waits, because a turn that waits more than about five minutes
loses the prompt cache. Agents dodged it by waiting on logs with `tail` or `grep` under a 590-second
timeout. About **120** such waits cost about **$800** of prompt-cache rebuilds in 27 hours.
Subagents woken by their own background pushes cost about **$126** more (103 wakes in one day).
Every extra hand-off in the pipeline was another thing to wait on.

### 2.7 What the research said

githerd's prior-art research (`design/githerd/evidence/prior-art.md`) found:

- A solo repository needs only auto-merge plus branch protection. Merge queues pay off only at
  several merges an hour; this repository merges about 2.
- Keep the system small and prefer platform features over custom machinery.
- Review attention, not code, is the scarce resource. In one study, 38% of rejected agent pull
  requests died unreviewed.
- Lanes that run only at release go red while every pull request is green.
- Gates that depend on credentials are single points of failure.

The CI/CD plan adopted Mergify batching on the strength of how large companies run merge queues.
The three research reports it drew on were never saved in the repository.

### 2.8 The incident log, by cause

From the incident catalog (`design/githerd/evidence/incidents.md`, to 2026-10-03):

| Cause                                   | Incidents                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Checks that ran only after a merge      | about 6 red masters                                                                  |
| The world changed (security advisories) | 4                                                                                    |
| Intermittent tests                      | about 10 on master, 14 tests                                                         |
| Paid CI capacity                        | 5 account events, 4 GPU overruns                                                     |
| Visual approval                         | 24                                                                                   |
| The push path and the gate              | 16, including 5 misread pushes, 60-120 minute lock waits, two `--no-verify` bypasses |
| Stacked pull requests                   | 2 auto-merges into an unprotected base, 6 merge-order incidents                      |
| Release mechanics                       | 13 push races, 12 nx config errors, 4 first publishes, 4 npm propagation delays      |
| Parallel sessions colliding             | 12 collisions, 30+ agent failures                                                    |

### 2.9 What each earlier mechanism did

Several responses moved a failure instead of removing it:

| Mechanism                                                          | Effect                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| GPU, Hosts and audit moved to release-only                         | Moved: "red master" became "release held"                                 |
| Self-hosted screenshot tool replacing Chromatic (after a $3k bill) | Fixed the bill; created approvals that break on every master move         |
| The push lock                                                      | Fixed gate contention; created 60-120 minute waits                        |
| Mergify batching                                                   | Worked as designed; did not touch the stalls, which were before the queue |
| githerd                                                            | Created a new failure family (claims, pauses, interruptions)              |
| Master runs no tests                                               | Fixed the master-run bottleneck; kept                                     |
| The release train                                                  | Fixed version noise and push races; kept                                  |

The owner, 2026-10-18: "we have created a huge mess of complex mechanisms that are creating
problems for us and now we are just adding more mechanisms on top."

### 2.10 Security notes

Master's ruleset requires `All Checks Pass` and `Lint PR Title`, but binds no source app to them,
and lets repository admins bypass required checks when merging a pull request. Agents act as the
owner's admin account. Golden-local does not change this; it lowers the exposure by making one
pull request, not hundreds, the only merge path.

## 3. Requirements

### 3.1 Hard constraints

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): "one full test run before master" is now the full suite in GitHub CI on golden's verified commit (plus the cut pull request's own run), not the full local gate on every landing. The NVIDIA GPU lane stays in the local gate, when webgpu-graph-algorithms is affected.

| Constraint                                                                  | Source and date                         | What it forces                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nothing merges with known errors: one full test run before master           | owner                                   | The full local gate on every landing; CI's affected suite once on the golden PR (section 4.7) |
| The owner approves every visual change; only the owner; agents never accept | owner, 2026-09-27                       | Review of the golden PR on the review page with the owner's passkey                           |
| Master changes only through pull requests; protected master stays           | owner, 2026-10-18 (declined to drop it) | The standing golden->master pull request                                                      |
| No step waits on the owner answering; the pipeline moves while review waits | owner                                   | Landing never waits for review; review and shipping are decoupled                             |
| Breaking changes grouped into one major per package                         | owner                                   | Unchanged; a breaking change lands only when its major is ready                               |
| Signed commits                                                              | owner                                   | Land commits and reverts are signed                                                           |
| Act only on the owner's own account's issues and pull requests              | owner                                   | Unchanged                                                                                     |
| Never comment on Cytoscape's repositories                                   | owner                                   | Unchanged                                                                                     |
| No silent fallbacks                                                         | owner                                   | A failed gate or conflict stops the landing loudly; nothing half-lands                        |
| Never blame timing without finding the mechanism                            | owner                                   | A CI failure on the golden PR is diagnosed, not re-run until green                            |
| No paid GPU testing except at release                                       | owner, 2026-10-18                       | The NVIDIA GPU lane runs in the local gate at landing                                         |

### 3.2 Preferences

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the landing gate no longer runs CI's shard commands; it is a light gate with no tests. CI is the one environment the full suite runs in; `./tools/run-tests.sh <shard>` still runs CI's command here by hand.

| Preference                                        | What it shapes                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Local testing as close to CI as possible          | The landing gate is the existing pre-push gate, which runs CI's shard commands |
| Open work promptly                                | Every landing pushes `golden`; nothing landed is only on this machine          |
| Interactive sessions rather than headless workers | Sessions run `land` and the round skills; no dispatcher                        |
| Claude judges overlap and relatedness             | A conflict sends the session back to merge and judge, not a script             |
| No fixed-interval jobs when idle                  | No daemon or timer; a session's `/loop` runs short rounds (section 4.13)       |

### 3.3 The owner's statements of 2026-10-18

- Review must happen locally before pushing, to avoid push, review, re-push churn.
- GitHub runners are limited.
- A full master run after each merge was a bottleneck before.

## 4. The design

### 4.1 Branches and places

- **`golden`** is the local integration branch. It lives in the worktree
  `<main checkout>/.worktrees/golden-local` and is pushed to the branch `golden` on GitHub. Every
  landing pushes, so nothing landed exists only on this machine.
- **The standing pull request** is one pull request from `golden` into master. It is a draft while
  work accumulates and screenshots are reviewed; drafts run no CI in `ci.yml`. After it merges, the
  next landing opens a new one.
- **master** stays protected exactly as now: its ruleset allows pull requests only, merge commits,
  and requires `All Checks Pass` and `Lint PR Title`. Nothing pushes to master except the golden
  pull request's merge and the release train's deploy key.
- **One exception: baseline seed pull requests.** When a story has no baseline on master, the owner
  can seed it from master's own capture: `visual-seed.yml` opens a seed pull request, the owner
  reviews it with `serve --master-run` and presses Finish, and that pull request merges into master
  directly. It holds only baseline images and the owner's record, so it has nothing for the local
  gate to test; the next landing merges it into `golden`.

### 4.2 Landing

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): step 4's gate is the light gate: build, lint, knip, SonarQube, the deterministic docs and API checks, the NVIDIA GPU lane when affected, and the LFS upload. It runs no test shards.

```
node tools/land.mjs land <branch>
```

1. **Lock.** Takes an exclusive local lock: one landing at a time. A second landing waits and is
   told who holds the lock.
2. **Sync.** Fetches, then merges `origin/golden` (where the owner's screenshot accept commits
   land) and `origin/master` (release version merges and the merged golden pull request) into
   local `golden`. It then fast-forwards the main checkout's master to `origin/master` (so new
   sessions read the current CLAUDE.md), unless the main checkout is on another branch, has
   uncommitted changes or has commits master lacks, in which case it only warns; `revert`, `ship`
   and `status` do the same after their fetch.
3. **Merge.** Merges the change branch with `--no-ff` and the message `land: <branch>`. A conflict
   aborts the merge, leaves `golden` unchanged, and tells the session to merge `golden` into its
   own branch, resolve the conflict and land again (exit code 2).
4. **Gate and push.** Pushes through the existing push queue:
   `tools/push-queue.sh git push origin golden:golden`. That runs the full pre-push gate: build,
   lint, knip, SonarQube, the affected test shards, the NVIDIA GPU lane when affected, and the LFS
   upload. Never `--no-verify`. A failed gate resets local `golden` to where it was before this landing, including the sync merges
   (the merge was never pushed) and reports the gate log (exit code 3).
5. **Pull request and preview.** On success, makes sure the standing draft pull request exists and
   rewrites its body: the landed branches, and the issue references found in their commit messages
   (`Fixes`, `Closes`, `Resolves`, `Refs` or `Part of #N`, in any tense, such as `Fixed #N`), or
   the line `No issue` when there are none -- the
   `Link PR Issue` check needs one or the other. Then starts `tools/visual-preview.sh` for the
   golden pull request in the background, so the review page shows a local capture.

`--dry-run` merges locally, reports, and undoes the merge. It never pushes and never calls GitHub.

```
node tools/land.mjs land <branch> <branch> ... [--dry-run]
```

Several branches land in one gate run, under the one lock and one sync. Each is merged in the order
given, with its own `land: <branch>` merge commit. A branch that conflicts is skipped (that merge
attempt is undone, the others stay) and so is one already on `golden`. Golden is then pushed once.
When that push's gate fails and more than one branch was merged, the tool finds the culprit by
halving: it resets `golden` to before the merges, merges the first half again and pushes, then the
second half, and splits again whichever half fails. A half that passes stays landed. Each split runs
the gate again. The pull request body and the preview are refreshed once, after the last successful
push. A summary lists every branch with its outcome: landed, conflict, gate failure with its log, or
already on `golden`. Exit 0 when every branch landed (or was already there), 2 when only conflicts
kept some out, 3 when only gate failures did, 5 when both did; 1 and 4 as for one branch. One branch
behaves exactly as above.

### 4.3 Screenshot review

Review happens before anything is offered to master.

- The review page shows the golden pull request's local preview: the images that changed against
  master. The owner reviews whenever convenient and presses Finish.
- Finish commits the accept record to the `golden` branch on GitHub (existing visual-review
  behavior). The next `land` or `ship` merges it into local `golden` during its sync.
- Since 2026-10-19 the owner's approval is a signed statement about the git tree of
  `visual-baselines/`, committed outside it as `visual-review-approvals/<tree>.json`, and the gate
  accepts it on any commit that has the approved commit in its history and the same tree, so an
  approval made on golden holds on a cut of it. The review page compares the cut with master's
  baselines, so it shows every image the cut ships. See `design/visual-testing/design.md`,
  "Signed tree approvals".

Because the owner approves one pull request rather than one per change, folding changes together
no longer invalidates approvals (section 2.2).

### 4.4 Reverting a rejected change

```
node tools/land.mjs revert <branch>
```

Reverts that change's land commit on `golden` (`git revert -m 1`), pushes through the push queue,
and refreshes the pull request body and the preview. The change's session fixes it on its own
branch and lands again.

### 4.5 Shipping

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): ship is unchanged, but the cut pull request's CI run is no longer the only clean-machine test: the full suite already ran in CI on the verified commit (`golden-verify.yml`).

```
node tools/land.mjs ship
```

Since 2026-10-19 this ships the cut pull request, not the golden one (section 4.14). Run after the
owner says the review is finished. It marks the pull request ready and turns on GitHub auto-merge
with a merge commit. Then:

- `ci.yml` runs the affected suite once on the golden pull request, as the double check that the
  code works on a clean machine (section 4.7). The visual gate checks CI's captures against the
  owner's approvals.
- Green: GitHub merges it into master.
- Issues referenced by `Fixes #N` in landed commits close when those commits reach master.
- Any individual pull request whose commits landed is marked merged by GitHub automatically.

### 4.6 Releases

Unchanged. The release train (`release.yml`) attempts a release from master's newest commit at
00:00, 06:00, 12:00 and 18:00 UTC, running the full suite, the T4 GPU lane, Hosts, the security
audit and the LLM regression tests, and publishes only when all pass. Its version merge is pushed
straight to master with the release deploy key; the next `land` merges it into `golden`.

### 4.7 What CI is for now

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): CI is no longer a double check. It runs the full suite on golden's newest commit after landings (verification) and on the cut pull request; the local gate runs no tests.

- **On the golden pull request:** one run of the affected suite, as a clean-machine double check,
  plus the visual gate against the owner's approvals. `ci.yml` treats it like any ready pull
  request. Because the golden pull request's diff against master is every change landed since the
  last ship, "affected" means every package any of those changes touched, and every package when a
  shared file (root configs, `.github/workflows/`) changed. A package no landed change touched is
  exactly what master already has.
  Together with the local gate on every landing, this is the "one full test run before master": no
  changed code reaches master without its tests running on a clean machine.
- **On master pushes:** builds only, as before, so graphty.app deploys.
- **On the release train:** the full suite plus the release-only lanes (T4 GPU, Hosts, audit, LLM).
- **Not** on every change. The local gate is the per-change test.

### 4.8 Concurrency and the lock

Landing is serial. One lock guards local `golden`; the push queue already serializes gate runs on
this machine. Sessions work in parallel on their own branches and worktrees, and only the landing
step is one at a time. A session that finds the lock held is told who holds it and waits in the
background, not in a model turn.

Waiters queue first come, first served, except `--priority` (on `land`, `revert` and `cut`): a priority
waiter goes ahead of every ordinary one, behind earlier priority waiters, and never interrupts the
landing that holds the lock. It is only for fixes that unblock the pipeline: a red master, a broken
golden, a fix a cut is blocked on.

Every run executes the same version of `land.mjs`: whichever checkout's copy a session calls, it re-runs
the live copy in `.worktrees/land-live` (as `push-queue.sh` does with `.worktrees/gate-live`) and passes its
exit code through. A session on an older copy once skipped the queue this way. A new version goes live
with `tools/live.sh land <branch>`, after land's tests pass; without a live copy the called copy runs
itself and says so.

### 4.9 Failure handling

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the "CI failure on the golden pull request" row; a test failure is now found by CI verification and handled as in that document's section 3.5.

| Failure                                               | What happens                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge conflict at landing                             | `golden` unchanged; the session merges `origin/golden` and then `origin/master` into its branch, resolves, lands again (exit 2)                                                                                                                   |
| Gate failure at landing                               | Local `golden` reset to where it was before this landing (the sync merges too); never pushed; the gate log is reported (exit 3)                                                                                                                   |
| Golden cannot take `origin/golden` or `origin/master` | `golden` unchanged (exit 4). The two conflict with each other, not with the change. The session that hit it merges by hand in the golden worktree (signed commit) and lands again; a conflict in the owner's screenshot records goes to the owner |
| Golden on GitHub moves during the gate                | Usually the owner's screenshot approvals. The tool merges `origin/golden` and pushes again, up to 3 tries; if that fails, `golden` is unchanged and it exits 4: land again                                                                        |
| Several branches: some kept out (exit 2, 3 or 5)      | The rest landed and were pushed; the summary names each branch kept out and why. 2: conflicts only, 3: gate failures only, 5: both. Each such branch's session fixes it as above and lands again                                                  |
| Refused (exit 1)                                      | Nothing changed. The message names the cause: an unknown branch, uncommitted changes in the golden worktree, no landing to revert, no golden pull request to ship, or local `golden` differing from `origin/golden` at ship                       |
| Rejected screenshot                                   | `land.mjs revert <branch>`; the session fixes and lands again                                                                                                                                                                                     |
| CI failure on the golden pull request                 | A difference between this machine and a clean one, or something the local gate skipped. The culprit is found from the failure; its change is reverted from `golden` or fixed; the pull request goes back to draft until then                      |
| This machine is down                                  | Nothing is lost: everything landed is on `golden` on GitHub. Landing resumes when the machine does                                                                                                                                                |
| Red master (release merge or outside cause)           | `master-guard.yml` as before                                                                                                                                                                                                                      |

### 4.10 Status

```
node tools/land.mjs status
```

Shows local `golden` against `origin/golden` and master, the landed changes not yet on master, the
golden pull request's state, the lock holder, and the newest preview log.

### 4.11 How issues get closed

A change's commits carry `Fixes #N` (or `Closes`, `Resolves`) for an issue the change finishes,
and `Refs #N` or `Part of #N` for one that must stay open. The golden pull request's body lists
both kinds. When the golden pull request merges, GitHub closes each issue whose fixing commit
reached master; a `Refs` or `Part of` issue stays open. Nothing closes an issue on landing alone.

### 4.12 How agents work

- Work on a branch in your own worktree (`tools/worktree-new.sh <branch>`), commit, then run
  `node tools/land.mjs land <branch>` in the background.
- No per-change pull requests, no pushing branches for review, no stacked pull requests.
- A large change lands in small pieces, ideally behind a switch that is off by default.
- Subagents commit and stop. The session that started them runs `land`, or, for subagents the round skills started,
  pipeline-round does (section 4.13).
- A session that lands a branch itself owns its failures: a conflict (exit 2) is its to resolve, a
  gate failure (exit 3) its to fix. Exit 4 (golden cannot take `origin/golden` or `origin/master`)
  is not caused by the branch: merge by hand in the golden worktree and land again, or ask the
  owner when the conflict is in the owner's screenshot records. Exit 1 is a refusal whose message
  names the cause. Failures of landings the pipeline-round skill started are its own (section 4.13).

### 4.13 Keeping work moving without a router

**Why.** The owner will not route work: he does not want to tell sessions which issue to take,
which branch to land or which failure to fix. githerd tried to do that routing with a program that
directed sessions, and it became its own source of failures (section 2.5). The lesson is to invert
it: a written routine, run by an ordinary interactive session under Claude Code's `/loop`, that
reads the repository, takes the few actions due, and ends. No daemon, no new program, no new state
file; `tools/land.mjs` stays as it is.

**Two skills.** The routine is two project skills, so the two kinds of work can run in separate
clients and neither blocks the other:

| Skill            | Does                                                                                                                                                                                                                                                                           | Never                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `pipeline-round` | Alarms (a red master build, master-guard revert pull requests, `priority:critical` issues, a held release, a failed publish); keeps golden landing and shipping; lands branches that background subagents finished; owns landing failures; stranded branches; worktree cleanup | Starts new issue work                                                      |
| `issue-round`    | Picks the next issue or group of related issues, marks it in progress, starts a background subagent that fixes, commits and stops, within a cap of three jobs per session                                                                                                      | Lands, ships, reverts or touches golden; takes a `priority:critical` issue |

The skills live in `.claude/skills/pipeline-round/SKILL.md` and `.claude/skills/issue-round/SKILL.md`.
Every rule both need -- the hard rules, reading the state, the markers, the rules every subagent
prompt carries, escalation and the failure classes -- is in one shared file,
`.claude/skills/pipeline-round/shared.md`, which both read at the start of each round.

**Modes.** Normal: both skills, either in two clients (`/loop 30m /pipeline-round` and
`/loop 30m /issue-round`) or both in one `/loop` prompt with issue-round second. Drain: only
pipeline-round, so work in flight lands and ships and nothing new starts. Issues only: only
issue-round; finished branches wait, marked ready, for the next pipeline round. One session runs
each skill at a time; other sessions still work by hand.

**Grouping.** issue-round takes the top issue by priority, then effort, then age, and judges which
other open issues belong with it: the same file or component, the same root cause, the same
symptom, or touched by the same fix. That is the session's judgment, not keyword matching. Up to
four issues form one job: all get the same in-progress marker and one branch, the commits carry one
`Fixes #N` line per issue, and the subagent first verifies the group and releases any issue that
turns out unrelated. A group counts as one job against the cap.

**Who owns a landing failure.** pipeline-round owns every failure of a landing it started. A change
a human-run session is landing itself belongs to that session; pipeline-round picks it up only when
it goes stale, as a stranded branch.

| Failure                                                                                    | What pipeline-round does                                                                                                                                                   |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conflict (exit 2)                                                                          | A subagent merges `origin/golden`, then `origin/master` into the branch, resolves keeping both intents, runs the affected tests, commits and stops; a later round lands it |
| Gate failure caused by the branch (exit 3)                                                 | A subagent reads the gate log, fixes the branch, commits and stops; the issue keeps its in-progress marker (same job)                                                      |
| Not the branch's fault (exit 4 with golden broken, or the same failure without the branch) | Find the landed change that broke golden, `land.mjs revert` it, send it to a fix subagent; never hand the problem to an innocent branch                                    |
| Machine or network (DNS, a killed process, a GitHub outage)                                | Retry next round; open an issue only when the same failure repeats                                                                                                         |
| A bug in `land.mjs`, the push queue or the gate                                            | Fix the tool on a branch and land it; never work around it in the session                                                                                                  |
| Two failed fix attempts on one branch for the same cause                                   | Stop retrying; file or update an issue with the evidence and release the in-progress marker; the branch waits for issue-round like any issue                               |

Attempts are counted by `fix attempt` markers on the branch's issue (or on the golden pull request
for a branch with no issue).

**State in GitHub only.** Everything the routine knows between rounds is in GitHub and git: the
`in-progress` label, one-line issue comments that start with `pipeline-round:` (taken, ready,
landing, landed, land failed, fix attempt, retry, released, asked owner), branches and golden. A
round in a brand-new session behaves exactly like one in a long-running session, and a session that
dies loses nothing. The in-progress marker names the session, branch and worktree; other sessions
skip the issue while that session is alive, and a stale marker (dead session, no finished branch)
is released so the issue can be picked again.

**Escalation.** The owner is asked only for what only he can do -- screenshot review, a breaking
change or major release, money, credentials, a new package's first npm publish, sudo or permission
changes, `design/brand`, a one-way decision, and a red master still failing after three fix
attempts -- once each, with a final `ACTION NEEDED:` line and an `asked owner` marker so no later
round asks again. Everything else the round decides and records.

**How the skills improve.** When a round meets a situation its skill does not cover, or a step
proves wrong, the session handles it and then corrects the skill -- a new "Known situations" entry
or a fixed step -- on a branch that lands like any change. A rule both skills need goes in the
shared file. A situation that keeps needing the same manual work becomes an issue for a tool fix,
not a longer routine.

### 4.14 Cuts: what ships

The owner's decision of 2026-10-19: golden must never block shipping. `node tools/land.mjs cut`
points the branch `golden-cut` at the newest first-parent golden commit whose local screenshot
preview finished with no unstable or failed images (or a commit given when none qualifies), opens
or refreshes one draft pull request `golden-cut` into master and starts its preview; the owner's
approvals that ship are made on that pull request, and `ship` marks it ready with auto-merge (it
refuses when the pull request's head moved since its preview by anything but accept commits). The
golden pull request stays open as an early look at golden's tip, and landings go on while a cut is
reviewed or in CI.

**Revert first.** A landed change that breaks golden -- unstable or failed screenshots in golden's
preview, a gate failure it caused, or CI failing on a cut because of it -- gets one pipeline round
to be fixed; then the round runs `node tools/land.mjs revert <branch>`, and the branch lands again
once its fix is committed. The round records when it first saw the break in a `broke golden` marker
on GitHub, so the grace is measured from GitHub state, not a session's memory.

## 5. Retired and kept

### 5.1 Retired

| Mechanism                                    | What happens to it                                                                                                                                                          | Why                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| githerd                                      | The daemon is not run; its MCP server is removed from `.mcp.json`; its code stays in `githerd/` for now. Its two Claude Code hooks are removed from `.claude/settings.json` | It drove sessions, duplicated other mechanisms, and created its own failures (section 2.5) |
| The githerd watchdog                         | `.github/workflows/githerd-watchdog.yml` is deleted                                                                                                                         | It watched a daemon that no longer runs                                                    |
| Mergify                                      | `.mergify.yml` is deleted, so Mergify does nothing. `ci.yml`'s merge-queue handling stays in the file, unused                                                               | One pull request at a time needs no queue; GitHub auto-merge does the merge                |
| Per-change pull request CI as the merge path | Changes land through `golden`                                                                                                                                               | It tested each change a second and third time on limited runners (section 2.4)             |
| Stacked pull requests                        | Not used                                                                                                                                                                    | Auto-merges into an unprotected base and merge-order incidents (section 2.8)               |
| The `queue:next` label                       | Not used                                                                                                                                                                    | There is no queue to jump                                                                  |

### 5.2 Kept

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the pre-push gate is kept as the light gate; its test stage and the test slots are no longer used by pushes.

- Protected master and its ruleset.
- The pre-push gate and `tools/push-queue.sh`, now run by `land`.
- visual-review with the owner's passkey approvals.
- The release train: `release.yml`, the T4 GPU lane at release only, Hosts, the security audit.
- `master-guard.yml`.
- `tools/pr-status-broker.mjs`.
- The machine-wide test slots (`tools/test-slots.mjs`).

## 6. Risks, trade-offs and follow-ups

### 6.1 Risks and trade-offs

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): landing is no longer 20 to 40 minutes of gate (the light gate is about 10), and the local gate no longer has to stay close to CI's tests, because CI runs them.

- **Landing is serial.** Each landing runs about 20 to 40 minutes of gate. When landings back up,
  several branches land in one gate run (section 4.2), and pipeline-round lands every ready branch
  that way.
- **A CI failure on the golden pull request has several suspects.** Every change landed since the
  last ship is a candidate. Keep golden pull requests small by shipping often.
- **This machine is the integration point.** If it is down, nothing lands. `golden` on GitHub holds
  everything landed, so nothing is lost.
- **The local gate must stay close to CI.** A check the gate skips surfaces only on the golden pull
  request, where it is harder to attribute.
- **The admin bypass on master's ruleset remains** (section 2.10).

### 6.2 Open follow-ups

- Screenshot approvals keyed by image content, so an image the owner already approved is never
  reviewed again.
- Simplify the push queue now that `land` is its main caller.
- Delete githerd's code and `ci.yml`'s Mergify merge-queue logic.
- Decide whether the release-only checks (GPU, Hosts, LLM regression) should stay release gates.

## 7. Superseded documents

These describe the earlier merge path. They stay in the repository as history and are not to be
followed:

- `design/ci/ci-cd-plan.md` -- its merge half: per-pull-request CI as the merge path, Mergify
  batching, the batch-aware visual gate and the queue labels. Its release-train sections still
  describe how releases work.
- `design/decisions/2026-10-04-ci-cd-plan-adopted.md` -- the merge-queue parts of that decision.
- `design/githerd/githerd-design.md` -- the whole design.
- `design/githerd/githerd-plan.md` -- the whole plan.
- `githerd/README.md` and `githerd/CLAUDE.md` -- the githerd package's own guides.

These carry a note that the merge queue was retired, and their merge-queue parts are history:

- `design/visual-testing/design.md` and `design/visual-testing/local-previews.md` -- where they
  describe the merge queue, the `hold` label or per-change pull requests.
- `design/sonarqube/design.md` -- its handling of branches stacked on other pull requests.
- `design/graph-io/network-sources-design.md` -- its mentions of the merge queue.

The root `CLAUDE.md` no longer has its "Merging" and "githerd" sections: they were removed, not
kept as history, and its "Landing changes (golden-local)" section describes the current path.

The evidence files in `design/githerd/evidence/` (incidents, prior art, platform and repository
facts) are not superseded: they are the record this design was built from. Each carries a note
that the pipeline it describes was replaced.
