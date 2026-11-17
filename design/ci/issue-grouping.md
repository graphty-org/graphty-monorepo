# Grouping issues into pull requests

Two automated Claude sessions keep this repository's work moving. **issue-round**
(`.claude/skills/issue-round/SKILL.md`) picks open issues and starts one background job per branch; each job fixes,
commits and opens one pull request with `tools/pr-open.sh`, which arms auto-merge. **pipeline-round**
(`.claude/skills/pipeline-round/SKILL.md`) handles alarms, red pull requests and finished branches that never opened.
Both write one-line issue comments that start `pipeline-round:` (**markers**: `taken`, `ready`, `opened`,
`released` and others, listed in `.claude/skills/pipeline-round/shared.md`) to record who is working on what.

This document says when several issues are fixed together on one branch (a **group**), how the rounds keep track of
the groups (the **ledger**), how a group lives and ends, why groups never stack pull requests on each other, and how
we measure whether grouping helps.

## Why group at all

Over the 14 days to 2026-11-16, pull requests that touched a file another open pull request also touched took 3.5
times longer to merge and were abandoned 14 times as often. Issues on one topic collided again and again: nine style
fidelity issues (the yEd, Cytoscape, vis-network, Graphviz and Pajek comparisons, which all rewrite the same record
files under `graphty-element/test/fidelity/`) collided in CI on 2026-11-15, and on 2026-11-16 most queued issues sat
blocked because an open pull request touched their files. Meanwhile 70 of 73 jobs on 2026-11-15 were single issues.

The aim is throughput: more issues per pull request and per CI run (owner, 2026-11-16: grouping is a throughput
multiplier, not a safety check), with fewer concurrent edits to the same lines as a side effect. Risk sets how far
that goes: a group of documentation changes can be large, a group of source changes stays small (the size cap
below). Most collisions are on a handful of **hub files** (`Graph.ts`, `doors.ts` and similar); splitting those
files is a separate piece of work with its own measure.

## 1. The rubric: when issues are fixed together

### Terms

- **Group:** a set of issues fixed on one branch, opened as one pull request and reviewed as one change.
- **Lead:** the group's highest-priority member (the oldest when priorities tie). The branch is named for it. The
  lead is fixed when the job starts and never changes after that.
- **Record file:** a file each fix rewrites as its proof. The **fidelity records** are the three files
  `npm run fidelity:ratchet` writes: `graphty-element/test/fidelity/oracle-known-failures.json`, `oracle-floors.json`
  and `baseline-scores.json`. `no-styles-baseline.json` is a separate record file.
- **Lane:** the branches whose diffs touch one set of record files. A lane limits how many pull requests are open at
  once, not how many branches are being coded (section 5).
- **Hub file:** a file many unrelated fixes touch; the list lives in the tooling and is refreshed from collision
  data, never judged at pick time.
- **Triage issue:** an issue that lists many per-sample or per-item failures and is closed piece by piece. A job
  names it with `Refs`, not `Fixes`. A **tracker** is an umbrella issue that is never a member of any group.
- **Joinable group:** a finished branch with no pull request that the join rule in the issue-round skill allows to
  take one more issue. A running job is never joinable (its members are fixed when it starts, and a running
  subagent cannot be messaged safely), and neither is a branch whose pull request is open.

### Precondition: every member is reviewed

A group of two or more issues may be opened only when `tools/pr-open.sh` writes `Fixes #N` for every member and
`tools/pr-review.sh` reviews the diff against every member's issue text. Until both hold, groups take only T1 folds
(below), and `issue-groups.mjs jobs` enforces it. Both scripts are owner-guarded, so this change is the owner's to
merge (section 8).

### Risk classes

What a change touches sets its class:

- **docs:** only Markdown, `design/` files, READMEs, doc comments and code comments;
- **tests:** only test files, fixtures and test helpers (with or without docs);
- **source:** anything else.

`issue-groups.mjs` reads the class from file paths (a path under `test/`, `tests/` or `fixtures/`, a `*.test.*` or
`*.spec.*` file, a test helper); a change to comments inside a source file looks like source from its path, so the
scan declares it (`class` on the member). A group's class is its riskiest member's class.

### Inclusion: an issue joins a group when one test holds against any member

Tests are tried in order; the first that holds is written in the ledger with the member it holds against (`with`;
the lead when none is named). Each member records its own reason -- its test, that member and its own words -- never
the group's summary: a scan member without a reason of its own starts a group of its own.

- **T1 Subset.** One issue's failures are contained in the other's, and the same diff fixes both. If the smaller
  issue needs code of its own, it is not T1. A T1 member is a **fold**.
- **T2 Same mechanism.** One defect explains both: the issue text or a `diagnosis` marker names the same commit,
  function or setting as the cause, and that cause is already on `origin/master`.
- **T3 Same fix.** Both fixes change the same function, block, rule or reader, in a file that is not a hub file or a
  registry file.
- **T4 Same proof.** Both fixes must change the same test cases, fixture or record entries (the same oracle program
  and the same sample and property rows). The same test file alone is not enough.
- **T5 Same document.** Both change only documentation (`design/`, docs, READMEs), in the same file or the same
  `design/` subdirectory.
- **T6 Same package, low risk.** Both are docs or tests changes (above) to the same package, the same `design/`
  subfolder or the same `tools/` subfolder. T6 never holds in a source group, so a source issue cannot join a group
  that holds by T6.

A triage issue's list never satisfies T1 or T4. A member from a different package is allowed only through T1 or T2.

**Never enough on their own** for source changes: the same topic, outcome, package, label or oracle program ("both
are fidelity");
a shared hub or registry file (the collision check handles those); the same record file with different entries
(that is a lane, not a group).

### Exclusions: any one keeps an issue out

- **X1 Red master.** A group that fixes a red master holds only the issues causing the red.
- **X2 Priority.** A critical issue joins a group, or takes members, only through T1 or T2, and only a group that is
  not waiting. A high lead may carry medium and low members through T1 to T4. A medium or low group starts only when
  strict priority lets its lead start. A higher-priority issue joins only before the job starts.
- **X3 Owner-only.** Labels `needs-decision`, `hold`, `blocked` or `ux-owner`, an `asked owner` marker, or a fix
  that needs the owner's credit, approval or decision.
- **X4 Guarded paths.** Its fix touches the owner-guarded files (`GUARD_PATHS` in `tools/pr-open.sh`) and the
  others' do not: joining would turn auto-merge off for all of them.
- **X5 Breaking.** A breaking change groups only with breaking changes to the same package.
- **X6 Staged or waiting.** It must wait for a pull request, branch, dry run or migration the others do not.
- **X7 Tracker.** Named with `Refs`, never a member, never counted.
- **X8 Opened.** An issue never joins a group whose pull request is open; it waits for the merge (section 3).
- **X9 Unmerged cause.** If the commit named as the cause is not on `origin/master`, the issue is in no group: it is
  a note to that pull request's fix attempt and stays open until that pull request merges or closes.

A regression from any member reverts the whole group, which is why the size is capped.

### Size cap

| Class  | Issues | Effort points |
| ------ | ------ | ------------- |
| docs   | 10     | no cap        |
| tests  | 8      | 12            |
| source | 4      | 6             |

Points: `effort:low` 1, `medium` 2, `high` 3, unlabelled 2. A triage lead counts as one issue with its full points. A
T1 fold counts 0 points but still counts as an issue. The source cap is the long-standing job limit: at the 75th
percentile groups of 2 to 4 took 3.2 hours to merge against 1.5 hours for one issue, and six points is about what one
subagent context and one review hold. The docs and tests caps are **provisional**: no measurement of how often a
first CI run fails on its own change, per class, existed when they were set (2026-11-16); they are revised from that
measurement and from the per-class guardrails (section 9). Never wait to fill a group: the median time from opening
to master is 26 minutes.

### Ties and doubt

An issue that fits several groups joins the one where the earliest test holds, then the higher-priority lead, then a
group not yet started, then the older group. **When unsure, do not group**: a wrong group costs a split or a revert
of every member, a missed one costs one more pull request.

### Why locality

For source changes, code-locality tests won over "same outcome plus same reviewer context" because collisions, not
topics, slow pull requests down, and because locality can be checked in under a minute. Documentation and test-only
changes (T5, T6) rarely conflict in meaning and rarely break master, so for them the same package or folder is
enough.

### Worked examples (queue of 2026-11-16)

- **#8189 and #8190** (yEd edges; yEd labels and nodes): two groups. Different code (`gml/styles.ts` against
  `graphml/styles-yed.ts`), both triage issues, so T4 cannot hold. Both are in the fidelity-records lane.
- **#8382 and #8192** (Cytoscape.js): separate. They share rows of #8192's triage list, which never satisfies T4,
  and no common cause is named.
- **#8344 and #8346** (two critical flaky stories): no group. Both diagnoses name a commit of pull request #7953
  that is not on master (X9); both wait on #7953.
- **#729 and #8114** (the one weight rule): T2 holds, but #729 is breaking and on the owner's held branch (X5, X3).
- **#3607 and #3608** (Cloudflare services to AWS): two groups. They share an outcome only.
- **#6903, #6904 and #6915**: one group. All three edit `design/ui/framework/element-needs.md` and nothing else (T5).

## 2. The ledger

The ledger lists every live group: its members and the rubric test that admitted each, its reason, its state, its
branch and pull request, and its history. It lives in `tmp/issue-round/groups.json` in the main checkout
(`ISSUE_GROUPS_LEDGER` overrides the path) and is changed only through `tools/issue-groups.mjs`.

### Where the truth lives

| Option                                                          | Verdict                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A committed file (`design/issue-groups.json`)                   | rejected: every update is a pull request through CI, and two sessions conflict on one file |
| One pinned "ledger" issue whose body is edited                  | rejected: the two rounds race on read-modify-write                                         |
| A `group:<n>` label or milestone per group                      | rejected: hundreds of labels to clean up, no room for reasons                              |
| **Markers on each issue for started work, plus a local ledger** | **chosen**                                                                                 |

Started work is already recorded in markers on the issues, written by the jobs: `taken` (with the branch and the
`group #a #b` list), `ready <branch> <sha>`, `opened <branch> <url>`, `released -- <reason>`. Those markers stay the
record of truth. The ledger adds what markers do not hold: proposed groups (nobody working on them yet), the rubric
test of each member, waits and follow-up groups. `issue-groups.mjs check --fix` brings the ledger back in line with
the markers and with each pull request's state, so a lost or stale ledger costs one check, not the state of work in
flight.

### How it is written

Every change takes an exclusive lock file next to the ledger (created with `O_EXCL`; a lock left by a dead process is
broken; a live holder is retried for about two seconds, then the command exits 3, "busy, run again"), reads the
ledger, changes it and writes it to a temporary file that is then renamed over the ledger. A ledger that does not
parse is an error, never "no groups". Issue facts (labels, state, markers) are read in batches of 40 per GraphQL
query; markers are taken only from trusted authors and ordered by comment `databaseId`, never by time, so every
reader picks the same newest marker.

### Commands

| Command                                                                                     | What it does                                                                                                |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `seed <file> [--force]`                                                                     | loads a ledger file (the first ledger, or a rebuilt one); refuses one that puts an issue in two live groups |
| `show [<group>\|<issue>] [--json]`                                                          | one group, the group holding an issue with its waits, or the summary line                                   |
| `create <lead> [<n>:<test>[:<with>]...] --why <reason> [--files <path>...] [--class <c>]`   | a proposed group                                                                                            |
| `add <group> <n> --test <T#> [--with <n>] [--class <c>] [--why <reason>]`                   | a member for a proposed group, or a join to a ready branch                                                  |
| `route <n> [--to <group> --test <T#> [--with <n>] [--join]] [--class <c>] [--why <reason>]` | puts a new issue where the target's state says (section 3)                                                  |
| `import-scan [<free-queue.json>]`                                                           | replaces the proposed groups with the free-queue scan's jobs, and keeps the scan's blocked list             |
| `start <group> <branch> <n>...`                                                             | the job took these issues of the group; the other members stay proposed under the group's id                |
| `ready`, `freeze`, `close --merged\|--unmerged`, `release`, `wait`                          | the state changes of section 4                                                                              |
| `archive`, `compact`                                                                        | bounded growth (section 6)                                                                                  |
| `check [--fix] [--json]`                                                                    | drift against GitHub (section 4)                                                                            |
| `jobs [--json]`                                                                             | the jobs issue-round may start, from the ledger                                                             |
| `combine-plan [--link <a>:<b>:<T#>...] [--json]`                                            | families of finished, unopened branches to combine (section 4)                                              |
| `metrics [--append] [--json]`                                                               | throughput and guardrails (section 9)                                                                       |

`jobs` prints one line per job, `job #a #b <priority> <group> tests a:<test> b:<test>[@<with>] -- <why>; files
<path>...`, in strict priority order. Members of started, ready, frozen and held groups, members recorded under an
exclusion, issues with a live wait and follow-up groups whose base is still open are not offered. A top-10 queue issue
in no group is offered alone as `unscanned` and named on a `rescan:` line, unless the last scan listed it as blocked
(owner-only, waiting on a decision, colliding with an open pull request); a ledger whose last scan is over 2 hours old
also asks for a rescan. While the ledger is empty, `jobs` runs `tools/issue-queue.mjs jobs` instead, so the round works
as before.

## 3. Routing a new issue

Each round, the free-queue scan (a read-only subagent of issue-round) judges the queue against the rubric and writes
`tmp/issue-round/free-queue.json`; `issue-groups.mjs import-scan` makes its jobs the proposed groups. Between scans,
a new issue is routed one at a time:

1. **Exclusions first.** An owner-only or tracker issue is refused. An X6 or X9 issue gets
   `wait <n> --on <branch or #pr> [--x9 <sha>]` and no group.
2. **Find the best candidate** by the rubric's tests against any member and the tie order, skipping a group the
   issue was released from or whose wait on it expired; `--with` names the member the test holds against.
3. **The candidate's state decides** (`route <n> --to <group> --test <T#>`):
    - **proposed:** the issue joins it, within the cap.
    - **ready:** the issue waits, like a started one. It joins the branch only through `route --join`, which the
      round runs only after checking the join rule of the issue-round skill (master red, no pull request on the
      branch, its `ready` marker at the branch's tip, no other joiner, no critical or owner-guarded member); a join
      stays within the cap and at most 2 joins over the branch's life, and makes the group started again until its
      joiner writes `ready`.
    - **started:** the issue waits; when the branch reaches `ready`, the wait ends and the issue is routed again
      (and joins). If the pull request opens first, the issue moves to the follow-up group.
    - **frozen (pull request open):** the issue goes into that group's single **follow-up group**, which starts when
      the pull request merges.
    - **closed or dissolved:** as if absent.
4. **No candidate, or the candidate is full:** the issue starts a group of its own. A full follow-up group is
   refused (`follow-up full`), and the round reports it.

## 4. The lifecycle

| State     | Entered when                                                   | Members can be added?                        |
| --------- | -------------------------------------------------------------- | -------------------------------------------- |
| proposed  | the scan or `create` proposes it                               | yes, within the cap                          |
| started   | a job took it (`taken` marker)                                 | no: a running job cannot be told             |
| ready     | the job finished (`ready` marker)                              | yes, through the join rule (at most 2 joins) |
| frozen    | its pull request opened (`opened` marker)                      | **never**                                    |
| closed    | its pull request merged                                        | no                                           |
| dissolved | its pull request closed unmerged, or every member was released | no                                           |
| archived  | closed or dissolved over 7 days ago                            | moved to `groups-archive.jsonl`              |

**The freeze point is the pull request opening**, not the branch's creation. Finished branches wait a long time
before they open (1,840 branch-hours in the week to 2026-11-16, against 267 hours of fixing), and absorbing an issue
during that wait costs nothing. After opening, auto-merge is armed, the median pull request merges 26 minutes later,
and pull requests that took a commit after opening merged 3.5 times slower; so an opened pull request never takes
another issue.

- **Split.** A job first checks its group against the code and releases any member the rubric does not hold for
  (`released -- not part of <branch>`). The issue is never routed back to that group. The share released is the
  measure of the rubric's precision.
- **Merge.** Groups merge before they start (the scan proposes them as one), when finished branches are combined
  (below) and in a lane batch (section 5). When one job took the issues of several groups on one branch (its `taken`
  marker named them all), `check --fix` folds them into the branch's group.
- **A merge** ends every wait on the group and makes its follow-up group startable.
- **Closing unmerged** dissolves the group and its follow-up group and expires their waits; every issue is routed
  again in the next scan.
- **Wait limits.** A wait for a frozen group to merge expires when the pull request is red or conflicting with no
  new commit for 6 hours (and is not held by the owner), or when the owner has held it for over 24 hours. After
  that the issue starts on its own (T3 to T5), or, for T1 and T2 (same mechanism), it becomes a note to that pull
  request's fix attempt. An X9 wait ends only when its commit reaches `origin/master`. An X6 wait is a dependency
  and never expires by these rules.

### Combining finished branches

Finished branches that have not opened (`ready`, no pull request) are combined into one pull request: one CI run instead
of several. It is a standing step of both rounds, run whenever such branches exist, whatever master's state: while
master is red they wait anyway, and combined they open as one pull request when it turns green:

1. `node tools/issue-groups.mjs check --fix`, `git fetch origin`, then `node tools/issue-groups.mjs combine-plan`. It
   lists **families**: ready branches linked because they came from one ledger group, because T6 holds (both docs or
   tests, same package or folder, read from each branch's diff against master), or by a test the round judged and
   passed back with `--link <a>:<b>:<T#>` (its `judge` lines name source branches that change the same file). A
   family stays within its class's cap and never mixes a branch touching `GUARD_PATHS` of `tools/pr-open.sh` with
   one that does not. It refuses a branch with an open pull request, a red-master fix (its `taken` marker says it
   fixes the red), a branch whose job is still running (an issue's newest marker is not its `ready`) and a branch
   whose tip moved past its `ready` commit.
2. For each family: `./tools/worktree-new.sh <type>/<lead>-batch origin/master <name> --issue <lead>`, then
   `git merge --no-ff origin/<branch>` for each branch; settle a conflict as the job that wrote it would, or leave
   that branch out. Run lint and the tests the merged changes touch.
3. Mark it: `issue-queue.mjs taken <new branch> <worktree> <every issue> --files ... --why "combines <branches>"`,
   one Proof listing every issue with each old branch's `ready` marker and the new runs, then
   `pipeline-round: ready <new branch> <sha>` on every issue, and on each old branch's issues
   `pipeline-round: superseded <old branch> by <new branch>`. Old branches are kept, never deleted (owner standing
   rule 7); their commits reach master through the merge.
4. Open it like any ready branch (pipeline-round step 9). The next `check --fix` **folds**: a group whose issues'
   newest marker names another branch moves its members to that branch's group (made on the first fold), whose
   aliases keep the old branch names and which takes over waits on them; the old groups are dissolved with
   `supersededBy` and their history kept.

**Following the markers.** `check` compares the ledger with GitHub and lists each difference; `check --fix` applies the
ones it can: a `taken` marker starts a proposed group, `ready` readies it, `opened` freezes it, a merged or closed pull
request closes or dissolves it, a `released` member leaves, a newer marker naming another branch folds a started or
ready group into that branch's group (combining, above), a closed issue leaves a proposed group, an X9 commit that
landed ends its wait, and an idle red or long-held pull request expires its follow-up waits. A proposed member's markers
count only while it is labelled `in-progress`, so an old job's markers are history. In a proposed group only the members
whose own marker names the job's branch move (a `taken` marker is written on every issue of its job); the others stay
proposed, so a join by one member never drags the rest of its group along. A group over the cap, an issue in two groups,
an unreadable issue and a branch that differs from the ledger are reported only.

## 5. Lanes for record files

A clean text merge of two branches that both rewrote the fidelity records can still be wrong in meaning, so record
files get **lanes**: a branch is in a lane when its diff against `origin/master` touches that lane's record files
(74 of the 89 pull requests that rewrote the fidelity records in 14 days were not titled as fidelity work, so the
topic is no guide). There are two lanes today: the fidelity records and `no-styles-baseline.json`.

- Branches in a lane are coded in parallel; each lane has **at most one open pull request** at a time. Every branch
  targets master and nothing stacks.
- **Ratchet procedure.** Each branch records its exact `fidelity:ratchet` invocations in its `ready` marker. Before
  opening, it merges `origin/master`, takes master's copy of each record file, reruns the fidelity run, replays
  the recorded invocations and commits the regenerated records. Conflict markers are never hand-edited.
- **Order:** priority, then the group whose lead least recently held the lane, then age. When two or more lane
  branches are ready as the slot frees, they are merged into one new batch branch from master (within the cap) and
  opened as one pull request; a lane branch that has waited 24 hours forces a batch.
- A red-master fix or a critical lead may preempt the slot: the open lane pull request turns auto-merge off, and is
  re-armed after the fix lands and it follows the ratchet procedure. A lane pull request that stays red, conflicting
  or stuck behind a red master is parked (auto-merge off) and the lane advances. The lane never advances past a pull
  request the owner holds.

Lanes need the owner-guarded changes to `pr-open.sh` and `pr-review.sh` (section 8) and are not built yet; until
then the collision check of the issue-round skill keeps lane branches apart.

## 6. Bounded growth

- **Size:** the class caps of section 1 (source 4 issues and 6 points); trackers never count. A combined branch
  stays within its family's class cap.
- **Joins:** a ready branch takes at most 2 joins over its life.
- **Follow-ups:** a frozen group has at most one follow-up group, which itself grows only to the cap; it gets its
  own follow-up only once it is frozen.
- **Age:** the scan rebuilds proposed groups whenever it runs (at least every 2 hours while issue-round runs);
  `compact` drops a proposal no scan has confirmed in 24 hours, drops waits settled over 7 days ago and keeps each
  group's last 30 history events. Started groups follow the skill's existing stale and idle rules.
- **Archive:** closed and dissolved groups leave the ledger 7 days after they end, into
  `tmp/issue-round/groups-archive.jsonl`. The markers stay on the issues.

## 7. Stacking pull requests against the alternatives

| Approach                                                            | For                                                        | Against, from our history                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stacked pull requests** (a child branch based on a parent branch) | the child can be reviewed early and use the parent's code  | #696 and #752 auto-merged into an unprotected base branch and skipped CI; one frame fix multiplied into 11 screenshot re-approvals; children waited 2 to 6 days on #2242 and #1682; conflicts recurred at every level; approval records are per pull request (#942); an early child carries the parent's unreviewed commits with auto-merge armed |
| **Adding an issue to an opened pull request**                       | no new branch                                              | races auto-merge (median 26 minutes); needs disarming, a new review and a new CI run; a commit after opening already means slower merges (37.7% against 8.7% slow)                                                                                                                                                                                |
| **Adding an issue to a ready, unopened branch** (the join)          | the branch is waiting anyway; nothing is armed; one review | needs re-verification; limited to 2 joins                                                                                                                                                                                                                                                                                                         |
| **A follow-up group after the merge**                               | no shared base; the wait is short                          | starts later                                                                                                                                                                                                                                                                                                                                      |
| **Starting in parallel and letting the collision check decide**     | no waiting                                                 | collided pull requests took 3.5 times longer and were abandoned 14 times as often                                                                                                                                                                                                                                                                 |

Fan-out, waiting on the base and repeated conflicts are inherent to stacking; the Mergify-era auto-merge problems
were tooling. Neither flaky tests nor race conditions explain the stacking incidents, so nothing here depends on
flakiness improving.

**Decision:** no stacking. Every branch is cut from master and every pull request targets master. Issues are added
only to unopened branches, through the join. An issue that matches an opened pull request goes to its follow-up
group. Combining finished branches (section 4) and the lane batch are the only multi-branch merges, and each produces
a new branch from master.

## 8. What is built and what comes next

Built (`tools/issue-groups.mjs`, tests in `tools/issue-groups.test.mjs`): the ledger, its lock, every state change,
routing against any member, risk classes and their caps, follow-up groups and waits, `check --fix` against markers
and pull requests (folding combined branches), `jobs`, `import-scan`, `combine-plan`, archive and compact, and
`metrics` per class. The issue-round and pipeline-round skills call it.

Still to build, in this order:

1. **Owner-guarded:** `tools/pr-open.sh` writes `Fixes #N` for every live member (job commits use `Refs #N`) and
   refuses a branch whose newest state marker is not this opener's `ready`; `tools/pr-review.sh` reviews the diff
   against every member's issue text. Until this merges, `jobs` keeps only a group's lead and its T1 folds together
   and offers every other member as a job of its own; the change that lands the two scripts sets
   `EVERY_MEMBER_REVIEWED` in `tools/issue-groups.mjs` to true.
2. **Lanes:** the git-based lane check in `pr-open.sh`, the `opening`, `parked` and `withdrawn` markers, the
   `lane-open` ratchet-and-batch command, and pipeline-round's lane opener.
3. **Waits as markers:** `waits on <branch>` markers and a `waiting` label on each waiting issue, so another machine
   sees waits that today live only in the ledger.

## 9. Monitoring

`node tools/issue-groups.mjs metrics` combines the ledger with one GraphQL search of the pull requests closed or
merged in the last 7 days. A pull request counts as **grouped** when it closes two or more issues (GitHub's closing
references) or its ledger group has two or more members. issue-round's last line carries `show`'s summary
(`groups: S started, R ready, W waiting, F frozen, P parked, G grouped PRs open; N proposed`), and the first round
after 00:00 Pacific appends `metrics --append` to `tmp/issue-round/grouping-metrics.jsonl`.

**Throughput, which should rise** (baselines from 2026-11-02 to 11-16):

| Measure                                 | Baseline        | Target in 14 days                    |
| --------------------------------------- | --------------- | ------------------------------------ |
| Issues closed per merged pull request   | 0.9             | 1.3 or more                          |
| Pull requests closing 2 or more issues  | 1.9%            | 15% or more                          |
| Collision pairs on the fidelity records | 106 per 14 days | fewer than 15 (once lanes are built) |

**Guardrails** (each applies once its window holds at least 20 grouped pull requests):

| Guardrail                               | Limit                                               |
| --------------------------------------- | --------------------------------------------------- |
| Closed-unmerged rate, grouped           | 3% or less, and at most twice the single-issue rate |
| Commit after opening, grouped           | 30% or less (baseline 38%)                          |
| 75th percentile hours to merge, grouped | 4 or less (baseline 3.2)                            |
| Members released as `not part of`       | 15% or less of members                              |
| Waits older than 24 hours (X9 excluded) | 0                                                   |

The first three apply per class (`metrics` groups each pull request by its ledger group's class; one outside the ledger
counts as source), each once that class has 20 grouped pull requests. `metrics` lists any breach, named with its class.
**One breach:** issue-round files a `priority:high` issue naming it; its fix lowers that class's cap by about a quarter
(source 4 issues and 6 points to 3 and 4). **Two breaches in a week:** that issue becomes `priority:critical` and the
rounds group that class only by T1 folds until it closes. Reverts caused by a member's fix and members reopened within 7
days are counted by hand at the day-7 and day-14 reviews, which compare against the baseline; changing a threshold is
decided and recorded in the day-14 issue.
