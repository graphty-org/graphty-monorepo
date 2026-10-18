# Local-first landing: testing and merging on the development machine

Status: proposal for the owner's review. Nothing here is built yet.

This document proposes moving the decision "may this change land on master?" from GitHub Actions
and Mergify to a program on the development machine, while master stays a protected branch that
only takes pull requests with required checks. GitHub Actions stays, as the proof that the code
also works on machines other than this one.

It builds on the current CI/CD plan (`design/ci/ci-cd-plan.md`), the push queue and pre-push gate
(`tools/push-queue.sh`, `tools/prepush.sh`), the screenshot gate (`visual-review/trusted/gate.mjs`)
and githerd, the pipeline daemon that hands work to Claude sessions
(`design/githerd/githerd-design.md`).

Decisions only the owner can make are marked **Owner decision** where they come up, and collected
in the last section.

## 1. The problem

Work stalls before it reaches master, and nothing notices.

- **Invisible branches.** 574 product commits sat on 70 branches that never merged. Most of those
  branches never had a pull request, so no tool, session or report knew they existed.
- **Screenshot approval loops.** A branding change (pull request #3139, then #2987 stacked on top
  of it) took more than 24 hours, almost all of it waiting. The owner's screenshot approvals are
  tied to one pull request: the gate accepts a signed review record only for the pull request it
  names. Each merge of master into the branch made the baseline PNGs conflict, which forced a new
  capture, a fresh owner review and another CI run, about 30 to 60 minutes per loop.
- **Landing depends on someone noticing.** A pull request moves forward only when a Claude session
  (through githerd) notices it is ready, red or conflicted.

The merge queue is not the problem. Over the last 7 days, 418 pull requests entered the Mergify
queue and 371 merged, 343 of them on the first try. The median time from entering the queue to
merging was 23 minutes and the 90th percentile 62 minutes. The waiting happens before the queue.

Each change is also tested three times:

1. the local pre-push gate (`tools/prepush.sh`, run for every push through `tools/push-queue.sh`):
   build, lint, SonarQube, the CI test shards of the affected packages, a screenshot capture, and
   the WebGPU tests on the machine's NVIDIA card;
2. the pull request's CI run on GitHub Actions (the affected suite plus screenshots);
3. the merge queue's run on GitHub Actions (the full suite on the batch).

The first of these already runs on hardware the hosted runners do not have (a real GPU), with the
same commands CI runs.

## 2. Constraints

- One human developer, many Claude agents, one powerful machine (Intel i9 14900, 90+ GB of RAM,
  an NVIDIA GPU).
- The owner wants testing and merging done locally. CI/CD stays, to prove the code runs on other
  machines.
- **Master stays protected.** Today the repository ruleset "Protect master" allows no deletion and
  no force push, requires a pull request with a merge commit, and requires the checks
  `All Checks Pass` and `Lint PR Title`. Deploy keys may push directly (the release train uses
  one), and repository admins may bypass the rules when merging a pull request. This design keeps
  "pull requests only, required checks" and works inside it.
- Releases keep the release train (`release.yml`): the full CI suite, the paid T4 GPU lane, the
  macOS and Windows host matrix ("Hosts") and the security audit all run on the candidate commit
  before anything reaches npm. Nothing here changes that.

## 3. The design in one page

```
 agent commits in its worktree
     |
     v
 tools/push-queue.sh --> local pre-push gate (unchanged) --> push
     |                                                        |
     |                     first push of a branch: a DRAFT pull request is opened
     v
 agent marks the pull request ready
     |
     v
 LANDER (a program on this machine, not a Claude session)
   - takes ready pull requests oldest first, up to 4 per batch
   - merges the batch onto master's tip in a scratch worktree
   - runs the full local gate once on that merged tree
       fail --> bisect --> hand the culprit and its log to an agent (githerd job)
       pass --> lands the batch through a pull request whose required check
                is the lander's own, bound to that exact commit
     |
     v
 master --> GitHub Actions: the full suite on every landed batch
              green: graphty.app deploys
              red:   an environment difference; master-guard reverts the batch
     |
     v
 release train every 6 hours (unchanged): full CI, T4, Hosts, audit, then npm

 Screenshots: an owner approval covers an exact image (its SHA-256) for a story,
 wherever it appears, so a merge from master never forces a second review.

 Stuck report: every unlanded change has an age and one named blocker;
 over 24 hours, the owner is paged once.
```

The pieces, in order: every branch visible (section 4), the lander (section 5), how it lands
inside master's protection (section 6), what CI still does (section 7), screenshot approvals by
image (section 8), stuck detection (section 9), small slices (section 10), and the migration
(section 11).

## 4. Every branch is a pull request from its first push

**Rule:** no committed work exists only on a local branch or an unreviewed remote branch.

- **The push queue opens the pull request.** After a push through `tools/push-queue.sh` succeeds,
  the queue checks the pull request status file the local broker already writes
  (`tmp/pr-status/status.json`, refreshed once a minute by `tools/pr-status-broker.mjs`). If the
  branch has no open pull request, it opens one as a draft with `gh pr create --draft`:
    - title from the first commit's subject;
    - base from `tools/push-base.mjs`, so a branch stacked on another pull request's branch gets
      that branch as its base;
    - body naming the issue from the commits (`Refs #N`), else the line `No issue`.
- **API cost.** One `gh` call per new branch, never per push.
- **Drafts cost no CI.** ci.yml already skips drafts and reports them as not run.
- **Ready means "land this".** An agent marks the pull request ready (`gh pr ready`) when the
  work is done. Draft means "still being worked on", and the stuck report (section 9) still
  counts its age.
- **A worktree is deleted only when its work is accounted for.** Either every commit on its
  branch is on master, or its pull request was closed with an abandonment reason. The reason is a
  closing comment that starts with `Abandoned:`. This extends githerd's existing
  finished-worktree cleanup (its design, section 4.14), which today also deletes a worktree whose
  branch was deleted on origin. A branch deleted without a recorded reason is reported as a
  blocker, not cleaned up.

What this retires: nothing. It only makes existing work visible.

## 5. The lander

The lander is a long-running Node program on this machine, under servherd like the pull request
status broker. It is a local tool in the sense of CLAUDE.md "Where a change takes effect": it runs
from its own live worktree, listed in `tools/live-tools.json`, and changes reach it with
`tools/live.sh`. It is deliberately not a Claude session. Landing is mechanical, and a mechanical
step should not depend on a session noticing.

### 5.1 What it takes

A pull request is a candidate when all of these hold:

- base is master, it is not a draft, it has no `hold` label, and its title has no breaking `!`
  (the same rules `.mergify.yml` applies today);
- its title passes the conventional-commit title lint and its description names an issue or says
  `No issue` (today's `Lint PR Title` and `Link PR Issue` checks, run by the lander locally);
- the pre-push gate passed on its head commit (the push log, `tmp/push-log.jsonl`, records it);
- every screenshot its head produces is approved (section 8);
- while githerd still posts it, githerd's `githerd/merge` status is `success` (githerd's design,
  section 4.6: owner items, release risk, a red lane that would affect it).

Candidates are taken oldest first, by the time the pull request was marked ready. The labels
`priority:critical` (a fix for a red master) and `queue:next` keep their current meaning: they go
first, and never interrupt a batch already being tested.

### 5.2 One batch

1. Take up to 4 candidates.
2. In a scratch worktree, start from origin/master's tip and merge each pull request's head in
   order, each with a merge commit whose message is GitHub's own form
   (`Merge pull request #N from graphty-org/<branch>`). The release train's changelogs read the
   branch commits underneath, as today. A candidate that conflicts is dropped from the batch and
   reported to its agent as a conflict.
3. Run the full local gate on the result: `tools/prepush.sh` with every test shard
   (`PREPUSH_ALL=1`), not only the affected ones, plus a full screenshot capture. It runs at the
   push queue's critical priority so agents' pushes do not starve it.
4. Pass: land the batch (section 6). Fail: bisect (5.3).

How long a full local run takes on the merged tree, with agents pushing beside it, is not known
yet. The dry-run step of the migration (section 11) measures it. If it is much over 45 minutes,
the fallback is the affected selection per batch plus one full local run per hour on master's
tip; that is a two-way door.

Throughput: one batch of 4 at a time, at about 45 minutes each, is about 128 pull requests a day.
The last 7 days averaged 53 merges a day. Testing a second batch on top of the first, as Mergify
does today, is a later tuning step and not part of this design.

### 5.3 Failure, bisection and hand-off

- **Bisect.** Split the batch in halves and test each half on master's tip, until a single pull
  request fails on its own. The others go back to the front of the queue.
- **An interaction.** If every pull request passes alone but two fail together, the one marked
  ready later is the culprit, and the hand-off names both.
- **Not reproduced.** If the failure does not reproduce on the culprit alone or on any half, it
  is a non-deterministic failure and follows the existing flaky-test policy
  (`design/ci/ci-cd-plan.md`, section 9): no retry, an issue with the log, the batch members and
  the commit, and the cause must be found. "Timing" is not a cause.
- **Hand-off.** The culprit gets a comment with the failing step and its log, and githerd gets
  one job: "make the lander's gate pass on this pull request". The job is done when the lander's
  gate passes on a new head of that pull request.

githerd's role shrinks to "fix this specific failure". It no longer discovers pull requests,
decides whether one is safe to merge, or watches CI on pull requests.

### 5.4 What the lander does not do

- It never approves screenshots, never writes baselines and never signs anything with the
  owner's passkey.
- It never pushes to master directly (section 6 explains how it lands instead).
- It never edits a pull request's branch. Its merges live only in its own batch branch.
- It never starts a release.

## 6. Landing inside master's protection

The question in this section is what turns a batch the local gate passed into a commit on master,
without weakening master's protection. Three options follow, then a recommendation.

### 6.1 The binding every option needs

A passing result is worth something only for the exact tree it tested. A result can go wrong in
two ways:

- **Stale:** it was true for one tree, and a different tree lands: master moved after the test,
  or a commit was added to the branch afterwards.
- **Forged:** something other than the gate posts a passing result.

A required check on GitHub is attached to one commit SHA, the pull request's head. GitHub does
not, by default, check that the head contains master's current tip; the ruleset setting "require
branches to be up to date before merging" (today off) makes it do so. With that setting on, the
head commit already contains master, so the merge commit GitHub creates has exactly the head's
tree. A check bound to the head SHA is then bound to the tree that lands.

The ruleset can also say which source must report a required check: a specific GitHub App. Today
it does not, so any token that may write commit statuses can post `All Checks Pass`. That is a gap
regardless of this design.

### 6.2 Option (a): the lander's check is the required check

How it works:

1. The lander pushes the tested batch commit to a branch `lander/batch-<n>` and opens a pull
   request from it. The pull request's description lists the pull requests it lands and carries
   their `Fixes #N` lines, so issues close as they do today.
2. A dedicated GitHub App ("graphty lander", installed only on this repository) posts a check run
   named `Local gate` on that exact head SHA. Its output records: the base SHA it was merged onto,
   the tree SHA, the head SHA of each landed pull request, the gate's own commit (the live gate
   copy, `.worktrees/gate-live`), the lockfile hash and the log location.
3. The ruleset requires `Local gate` from that App only, and requires branches to be up to date.
4. The lander merges the batch pull request with a merge commit. GitHub marks each landed pull
   request as merged once its head commit is reachable from master. Whether it does so for a
   head landed through another pull request must be confirmed on one run during the dry run; the
   fallback is that the lander closes each one with a comment linking the batch.

How master stays protected:

- Still pull requests only, merge commits only, no force push, no deletion.
- **Stale results.** A new commit on the batch branch has a new SHA with no check. If master
  moved, the up-to-date rule refuses the merge. The lander then merges master into the batch
  branch and runs the gate again. The release train's version pushes move master about four
  times a day, and with the nx cache that rerun is short.
- **Forged results.** No other account, token or workflow can post a check run as the App.
- **What remains.** The App's private key is on this machine, readable by the same user the
  agents run as. The project's threat model is mistakes, not a hostile agent. Keep the key
  outside the repository, under a path the checked-in `.claude/settings.json` denies agents
  `Read` on, as it already does for `.env` and `*.pem`. A hostile process on the machine could
  still forge the check. So could the admin bypass, which exists today and is a separate owner
  question (section 12).

What CI does:

- Pull request CI becomes advisory: it stops being required. It can stay switched on for ready
  pull requests while it earns trust, then be reduced to on-demand runs (section 11).
- The full suite runs on master for every landed batch (section 7).

Cost and benefit:

- Removes two of the three test runs per change, and every dependency on GitHub-side queue state.
- The lander needs its own bisection, priority handling and freeze switch. Mergify provides these
  today.
- The development machine becomes the place where "may this land?" is decided. That reverses a
  rule written down in `design/visual-testing/local-previews.md` ("the development machine never
  becomes a CI runner; nothing CI or the gate reads is produced there"). **Owner decision.**

### 6.3 Option (b): keep Mergify, check its batches locally

How it works:

- Mergify keeps the queue: it builds each batch as a draft pull request on a `mergify/merge-queue/*`
  branch, bisects, applies priorities, and supports the freeze that `master-guard.yml` uses.
- The lander watches those drafts, runs the full local gate on each draft's head, and posts
  `Local gate` from the App. `.mergify.yml`'s `merge_conditions` requires `Local gate` instead of
  CI's `Queue Checks Pass`.
- Mergify merges each pull request of a passed batch on its own, so each pull request head still
  needs the ruleset's required check. To drop pull request CI, the push queue posts a second App
  check, `Pre-push gate`, on each pushed head once its gate passed. The ruleset requires that
  check instead of `All Checks Pass`.

How master stays protected:

- The per-pull-request check is bound to the pushed head, the commit the pre-push gate tested,
  but not to the merge tree.
- The merge tree is bound by Mergify's batch: the batch's draft head is what the lander tested,
  and Mergify merges only that.
- Forgery is prevented by the App, as in (a).

What CI does: as in (a).

Cost and benefit:

- Reuses Mergify's tested batching, bisection and freeze.
- Keeps two systems that must agree.
- Every batch still makes a round trip through GitHub (draft pull request, polling) before local
  testing can start.
- Mergify's own timeouts and states become the lander's problem to read.
- It does not remove a dependency, only a test run.

### 6.4 Option (c): keep pull request CI, add the lander only for conflicts and stuck work

How it works:

- Nothing about required checks changes.
- The lander only notices conflicted and stuck pull requests, merges master into them in a
  scratch worktree, and hands each to an agent.

How master stays protected: exactly as today.

What CI does: what it does today: every pull request, every queue batch, and the release train.

Cost and benefit:

- The smallest change, and no new trust in the local machine.
- Still three test runs per change, still a pull request CI run per push, and still a queue run.
- With sections 4, 8 and 9 in place it fixes most of the measured stalls, because they were
  invisible branches and screenshot loops, not queue time. It does not meet the owner's goal of
  testing and merging locally.

### 6.5 Recommendation

Adopt **(a)**, and reach it through steps that each stand on their own (section 11).

- Steps 1 to 3 of the migration are option (c) plus the screenshot and stuck fixes. They are
  worth doing even if the owner stops there.
- The dry run measures whether the local gate's verdicts agree with CI's on the same trees.
- Only then does the ruleset change.

Prefer (a) over (b):

- (b) keeps every GitHub-side wait in front of the local test and keeps two queue
  implementations.
- The parts of Mergify that (a) must rebuild are small and already understood: bisection, two
  priority labels and a pause switch.

Independent of the option: bind the ruleset's required checks to their source app now, and in
(c) bind `All Checks Pass` to GitHub Actions. That closes the forged-status gap at no cost.
**Owner decision** (it is a ruleset change).

## 7. CI becomes the check that it runs on other machines

### 7.1 What runs where

| When                      | Today                                     | Proposed                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| Each push of a branch     | pre-push gate, then pull request CI       | pre-push gate only (pull request CI advisory, then on demand)             |
| Landing a batch           | Mergify queue: full CI on GitHub          | lander: full local gate on the merged tree                                |
| Each push to master       | build only                                | the full suite, the full screenshot capture against the approved manifest |
| Release train (every 6 h) | full CI, T4, Hosts, audit, LLM regression | unchanged                                                                 |
| Nightly and weekly        | Hosts nightly, link check and GPU weekly  | unchanged                                                                 |

Each landed batch is one push to master. One CI run per batch replaces today's pull request runs
plus the queue run. Hosted runner minutes cost nothing for this public repository.

### 7.2 A red master is an environment difference

Every landed tree passed the full gate here. If master's CI then fails, the cause is something
that differs between this machine and a hosted runner. Typical causes:

- fonts, CPU count or CPU speed;
- lavapipe instead of an NVIDIA card;
- a clean install instead of warm caches, including a stale nx cache entry that let the local
  gate pass;
- a test that depends on the network.

The existing master guard (`master-guard.yml`) handles it as it does today, with three changes:

- **Freezing pauses the lander.** The lander reads master's CI state and lands nothing while it
  is red. This replaces the Mergify freeze.
- **Revert the batch.** The revert is `git revert -m 1` of the batch's merge commit, which
  undoes the whole batch at once.
- **The revert lands through the lander, at critical priority.** When the revert's tree equals
  a tree the gate already passed, such as the batch's parent, the lander posts its check without
  running the gate again, because the tree is identical. Otherwise it runs the gate.

The batch's pull requests are reopened as new pull requests by their agents, which must find the
environment difference before landing again. Usually the fix is in the test or in the gate:
making the local gate reproduce the difference is the real repair.

### 7.3 The risk window, stated plainly

Between a batch landing and master's CI finishing (estimate: 40 to 60 minutes), master holds code
that only this machine has tested. During that window:

- **Agents build on it.** They merge master into their branches. Their pre-push gates run on the
  same machine, so they will not notice an environment-only break.
- **Batches stack on it.** More batches may land on top. If an earlier one is then reverted,
  later ones may conflict with the revert or depend on it.
- **graphty.app does not deploy it.** The deploy already waits for a green master CI run.
- **npm does not get it.** The release train runs the full suite, T4, Hosts and the audit on
  its own candidate.

Bound the window: the lander lands at most **2 batches** whose master CI has not finished, and
pauses until one finishes. At 45-minute batches this rarely binds; it limits how much a revert
has to unwind. The number is a two-way door.

How often this happens is unknown. The dry run (section 11) answers it, by comparing the lander's
verdict with CI's verdict on identical trees for every batch.

## 8. Screenshot approvals belong to the image

### 8.1 Today

- Baselines are PNG files at fixed paths, such as
  `visual-baselines/graphty-element/<story id>.png`, stored in Git LFS.
- The owner reviews captures on the local review page and presses Finish, which Face ID signs
  with a passkey.
- The signed review record (`visual-baselines/reviews/*.json`) lists each baseline path with the
  SHA-256 of its PNG before (`from`) and after (`to`), and names one pull request.
- The gate accepts a record only for the pull request it names, or for a merge-queue batch that
  contains that pull request. One exception exists: an item marked "approved before" may point
  at an identical image the owner approved for the same story on another pull request.
- Two branches that change the same PNG cannot be merged: git cannot merge binary files. After
  such a conflict, the branch is recaptured, and the owner reviews again, even when the pixels he
  sees are the ones he already approved.

### 8.2 The change

- **An approval covers exact pixels for one story, wherever they appear.** A signed approval
  says: "the owner saw this PNG, identified by its SHA-256, for story S of project P, captured in
  capture environment E, and accepts it". The capture environment is the pinned font set, the
  browser version, the capture code version and the device scale. Any branch, pull request or
  batch whose capture of S produces that hash in that environment needs no new review.
- **Stored by content.** Approved PNGs are stored by their hash, for example
  `visual-baselines/images/<sha256>.png`, still in Git LFS. Two different images never share a
  path, so two branches never conflict on a binary file.
- **The baseline is a generated manifest.** Each project has a manifest, one line per story,
  mapping the story to the hash master's capture produces. It is generated from a capture and
  checked against the signed records. It is never trusted by itself.
    - A conflict in the manifest is resolved by recapturing the merged tree and regenerating it.
    - If every regenerated hash is approved, no review is needed.
- **A pull request declares the stories it intends to change.** Its description carries lines
  such as `Visual-change: graphty-element/styles-label--*`. When the batch tree is captured:
    - a story whose hash equals master's manifest passes;
    - a declared story with an approved hash passes;
    - a declared story with an unapproved hash waits for the owner's review;
    - an undeclared story whose hash changed is a regression. It goes back to the agent, and the
      owner is not asked, even if that hash was approved for the story at some earlier time.
      This catches a change that brings back an old approved look by accident.
- **Local captures count.** Approvals are made on local captures. Local captures with the
  repository's pinned fonts were measured byte-identical to CI's (all 1,432 items in one
  measurement, and CI's own captures were byte-identical across three runner CPU models;
  `design/visual-testing/local-previews.md`, section 2). CI's master
  capture remains the cross-check: an image CI draws differently is an environment difference
  (section 7.2).

This removes the loop that held the branding change for more than a day. A merge from master
makes no binary conflicts. A recapture that reproduces approved pixels needs no review. A stacked
pull request inherits its base's approvals by hash.

### 8.3 What must stay true for Face ID to keep its meaning

Today a Face ID approval means "the owner looked at these images and accepts them for this pull
request". After the change it means "the owner looked at these images and accepts each one for
its story". To keep that meaning, the gate must hold all of the following. **Owner decision:**
this changes the trust rule of the gate.

1. **Only the owner's passkey creates an approval.**
    - Keys are read from master's `visual-review/passkeys.json`, never from the branch under
      test.
    - The gate code that judges a branch is master's copy, never the branch's.
    - Both are true today and do not change.
2. **The signature covers the image bytes and the story.** Each signed item names the project,
   the story id, the PNG's SHA-256 and the capture environment. The review page shows exactly
   those bytes. An approval of a hash for one story never approves it for another. A blank or
   broken canvas approved once for a story that is meant to be empty must not approve every
   story that breaks the same way.
3. **Rejections are signed too, and win.** A record may reject a hash for a story. A later
   reject removes an earlier approval of that hash for that story, because approvals no longer
   expire with their pull request.
4. **Records are append-only and verified once.**
    - A record is verified when it is first added, as today.
    - A copy of an existing record adds nothing.
    - The record's former pull request binding stays in the record, for the history, but the gate
      no longer requires it to match.
5. **The manifest and the stored PNGs are derived data.**
    - The gate recomputes "approved for S" from the signed records.
    - It checks that each stored image's bytes hash to its name.
    - A hand-edited manifest, or a PNG copied in by hand, approves nothing. That prevention exists
      today and must survive the new layout.
6. **A new capture environment means new hashes.** A browser or font update changes every hash
   at once. That is a reseed reviewed by the owner, as today, never a silent carry-over.

### 8.4 Where the change lands

- **The trusted code.** The change touches `visual-review/trusted/gate.mjs`, the record format
  (a version 3 record), and the review server's Finish. The signature check in
  `visual-review/trusted/lib/approval.mjs` signs the record's canonical hash and does not need to
  change.
- **Who may edit it.** CLAUDE.md forbids agents to edit these files or the ci.yml gate step
  unless the owner asked. This step needs that request, in writing, scoped as the batch-gate
  change was on 2026-10-04.
- **The package stays generic.** `@graphty/visual-review` is a publishable package. Where it
  reads the declared stories (the pull request description, or a file) is a setting in
  `visual-review.config.json`, not graphty code in the package.
- **Existing records keep working.** Version 2 records on master stay valid as history. The
  conversion writes each current baseline into the new store and the manifest, and is checked
  by recomputing the manifest from the records.

## 9. Stuck detection as a service level

- **Every unlanded change is visible.** A branch with commits that are not on master, or an open
  pull request, has:
    - an **age**: the time since its oldest commit that is not on master;
    - exactly **one blocker**, the first that applies in a fixed order: no pull request; draft;
      pre-push gate failing; conflict with master; waiting for the owner's screenshot review;
      lander gate failing; held (label or breaking title); waiting in the lander's queue;
      branch deleted without an abandonment reason.
- **The service level: 24 hours from the first push to master.** A change older than 24 hours
  pages the owner once, through the same phone notification the release announcements use. The
  page names the change, its age and its blocker. The owner is not paged again for the same
  change.
- **A report, not a dashboard.** A separate session is building `tools/stuck-report.mjs`, which
  computes this list. The lander and githerd read its output rather than computing their own.
- **Blockers become jobs.** A blocker an agent can clear (no pull request, a failing gate, a
  conflict) becomes a githerd job before the 24 hours run out. Only blockers that need the owner
  should ever reach the page: a screenshot review, a hold, an owner decision.

## 10. Big changes land in small slices behind a switch

- **The target lifetime of a branch is about 2 days.** Work that needs longer lands in slices,
  each a complete pull request that passes the gate, with the new behavior behind a switch that
  is off by default.
- **The switch is internal until the feature is finished.** In a published package, an exported
  option is a public API and so a contract with consumers; an off-by-default switch that is
  exported cannot be removed later without a breaking change. A slice's switch is therefore
  internal: not exported, not documented, and read only by tests and stories. The finished
  feature becomes a public option in its last slice, following the project's rules for additive
  API changes.
- **The release train publishes dormant code.** It publishes whatever merged, so slices ship to
  npm switched off. That is the point: each slice is tested on master, on other machines and in
  a release long before the feature is switched on.
- **The stuck report enforces it.** A branch older than 2 days is listed as too large, which
  prompts a split. It does not page the owner; only the 24-hour landing limit does.

## 11. Migration, in order

Each step is useful alone and can be rolled back. A step starts only after the previous one is in
use.

### Step 1: the stuck report and visible branches

- **Adds:**
    - `tools/stuck-report.mjs` (being built now), with the once-only page after 24 hours;
    - the draft pull request opened on a branch's first push (section 4);
    - the worktree deletion rule.
- **Retires:** nothing.
- **Rollback:** stop the report's service; revert the push queue change with `tools/live.sh gate`.
- **Done when:** every branch with unmerged commits appears in the report with a blocker. The 70
  existing branches are triaged once: landed, or closed with an abandonment reason.

### Step 2: the lander in dry run, beside Mergify

- **Adds:**
    - the lander under servherd, taking the same ready pull requests Mergify takes;
    - it batches them, runs the full local gate on the merged tree and bisects;
    - it posts an advisory check, `Local gate (dry run)`, on each pull request head;
    - it records its verdict and timing next to Mergify's for the same pull requests;
    - it creates no batch pull requests and merges nothing.
- **Also checked once:** whether GitHub marks a pull request merged when its head lands through
  another pull request (section 6.2).
- **Retires:** nothing. Mergify still merges.
- **Rollback:** stop the service.
- **Done when:** the comparison covers at least two weeks, or about 100 batches. It reports how
  often the local gate and CI disagree on identical trees, split by direction, and how long the
  local gate takes.
- **Owner decision:** the disagreement rate at which step 4 may proceed (proposed: no more than
  2% of batches where the local gate passed and CI failed, each with its cause found).

### Step 3: screenshot approvals by image

- **Adds:** content-addressed approved images, the generated manifest, version 3 review records,
  declared stories (section 8).
- **Retires:**
    - the pull request binding of review records;
    - the "approved before" lookup, which the new rule subsumes;
    - most uses of `visual-review update <pr>`, the command that resolves baseline conflicts.
- **Rollback:**
    - CI runs master's copy of the gate, so reverting the gate change restores the old rule at
      once;
    - a converter writes the path-based baselines back from the manifest;
    - records made in the meantime are signed, so converting them back loses nothing.
- **Owner decision:** the approval model, and the written request that lets an agent edit
  `visual-review/trusted/`.

### Step 4: the required-check switch (option (a))

- **Adds:**
    - the "graphty lander" GitHub App (the owner creates and installs it);
    - the ruleset change: required check `Local gate` from that App only, branches up to date.
      `All Checks Pass` is no longer required;
    - the lander's batch pull requests and merges;
    - the full suite on every push to master in ci.yml;
    - the master guard pausing the lander instead of freezing Mergify;
    - the limit of 2 unconfirmed batches.
- **Retires, but keeps in place:**
    - Mergify's auto-merge (its `auto_merge_conditions` and `queue_conditions` stop matching).
      Mergify stays installed and its config stays in git;
    - pull request CI as a requirement. It still runs, advisory, on ready pull requests.
- **Rollback, in about 10 minutes:**
    - restore the saved ruleset JSON (the current one is in section 2);
    - revert the `.mergify.yml` change;
    - stop the lander;
    - master CI's full run can stay or go back to build only.
- **Owner decision:** the ruleset change, and moving the landing decision to the development
  machine.

### Step 5: retire what is no longer needed

Only after step 4 has run without a rollback for a period the owner chooses (proposed: four
weeks).

- **Retires:**
    - **Mergify:** delete `.mergify.yml` and uninstall the app. `Queue Checks Pass` and the
      queue-only paths in ci.yml go with it: the merge-queue run, and the visual gate's
      `--queue-event` mode.
    - **Pull request CI on every push:** the `pull_request` trigger's test, screenshot and link
      jobs go. `workflow_dispatch` stays, so an agent or the owner can still run the full CI on
      any branch on demand, to check other machines before landing.
    - **githerd's parts that only served Mergify and pull request CI:** the `githerd/merge`
      status (its checks move into the lander's candidate rules in section 5.1), pull request
      jobs made from pull request CI failures, the title-fix job, and pull request shepherding.
      githerd keeps master and release incidents, the issue backlog, worker sessions, and the
      lander's "fix this failure" jobs.
- **Rollback:**
    - Pull request CI and githerd's parts come back with a git revert.
    - Mergify needs a reinstall and its config restored from git. That is still reversible, but
      it is the most expensive step to undo, so it comes last.
- **Owner decision:** retiring Mergify.

## 12. Risks

- **Environment-only failures reach master.** Bounded by the 2-batch limit and the automatic
  revert (section 7). Measured before the switch, by the dry run.
- **The local gate becomes a single point of failure.** If the machine is off, nothing lands.
  Fallback: the lander's absence is visible in the stuck report. The owner can temporarily
  restore the old ruleset (step 4's rollback) to land through Mergify and CI.
- **Cache poisoning.** The local gate uses the nx cache shared by every worktree. A bad cache
  entry can make a batch pass here. CI's clean run on master catches it, and the lander can run
  the build with `--skip-nx-cache` once a day on master's tip.
- **Contention.** The lander's full runs compete with agents' pre-push gates for the machine's
  test slots and browser slots. It runs at critical priority. Landing therefore delays agents'
  feedback, not the reverse, which is the intended order.
- **The App key on the development machine.** It guards against accidents and outside accounts,
  not against a hostile local process (section 6.2).
- **Admin bypass.** The ruleset lets repository admins bypass required checks when merging a pull
  request. The agents act as the owner's account, which is an admin, so an agent could merge
  past any required check with `gh pr merge --admin`. This is true today and stays true in every
  option.
- **Screenshot approvals outlive their pull request.** That is the purpose, and the signed
  reject, the declared stories and the per-story binding (section 8.3) limit it. An approval of
  a wrong image now keeps counting until it is rejected, instead of expiring when its pull
  request closes.

## 13. Decisions for the owner

These are one-way doors or changes to a trust boundary. Everything else in this document is a
two-way door, and agents decide it.

1. **Landing option:** (a), (b) or (c) (section 6). Recommended: (a), reached through steps 1 to 3
   first.
2. **The ruleset:**
    - require `Local gate` from the lander App, with branches up to date, and stop requiring
      `All Checks Pass` (step 4);
    - independently and now: bind every required check to its source app.
3. **The development machine decides landing.** This reverses the rule in
   `design/visual-testing/local-previews.md` that nothing CI or the gate reads is produced on
   this machine.
4. **The approval model** (section 8.3):
    - an approval covers an image's hash for one story, not for one pull request;
    - is it per story, as proposed, or for the hash anywhere?
    - and the written request letting an agent change `visual-review/trusted/`.
5. **The dry run's pass mark** before step 4 (proposed: at most 2% of batches where the local
   gate passed and CI failed, each with its cause found).
6. **Retiring Mergify** (step 5), and how long step 4 must run cleanly first (proposed: four
   weeks).
7. **Creating the "graphty lander" GitHub App**, which only the owner can do, and where its key
   lives.
8. **The admin bypass on master:** keep it as the emergency path, or remove it so no account can
   merge past the required check.
