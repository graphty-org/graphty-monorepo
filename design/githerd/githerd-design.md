# githerd: design

githerd keeps the graphty-org/graphty-monorepo pipeline moving. It notices a red master and gets
it fixed, keeps releases flowing, tells Mergify which pull requests are safe to merge, keeps the issue
backlog triaged and current, and hands every piece of work that needs judgment to an interactive
Claude Code session the owner can attach to, watch, steer and stop.

This document is the whole design. The plan that builds it is `githerd-plan.md` beside it. Every
claim about GitHub, Claude Code, the repository or this machine cites the evidence file that
verified it; anything not yet verified is marked as a spike and is tested first in the plan.

**Evidence tags** used throughout. All files are in `evidence/` beside this document.

| Tag | File | What it holds |
|---|---|---|
| `[OD n]` | `owner-decisions.md`, section n | Everything the owner decided, required or rejected, with quotes |
| `[PF n]` | `platform-facts.md`, section n | Claude Code, tmux, hooks, MCP and GitHub polling, measured on this machine |
| `[R n]` | `repo-facts.md`, fact Rn | Repository settings, workflows, tools and machine facts read on 2026-10-03 |
| `[INC1 n]`, `[INC2 n]` | `incidents.md`, part 1 or 2, section n | 30 days of GitHub data; the incidents of the long session |
| `[PA n]` | `prior-art.md`, section n | What other agent-driven pipelines learned |
| `[CAT]` | `catalog.md` | The situation catalog this design is judged against |
| `[S n]` | `githerd-plan.md`, spike Sn | Not verified yet; the plan tests it before anything is built on it |

---

## 1. Purpose and non-goals

### 1.1 What githerd is for

The owner's own statement of the problem [OD 1]: "I have a large number of pending issues, some
of which may be out dated ... I also have pending PRs that need shepherding through the process.
Yesterday my master branch turned red and I didn't realize, which stopped all my pending
releases." githerd has five jobs:

1. notice a red master, and anything else that blocks every pull request, within minutes, and get
   it fixed;
2. unblock releases;
3. shepherd pull requests to merge, and tell Mergify, which does the merging, when each is safe to
   merge (section 4.6);
4. triage, refresh and re-triage the issue backlog, and fix issues in priority order;
5. keep the Claude sessions doing that work fed, unblocked, out of each other's way, and visible.

### 1.2 Non-goals

| githerd does not | Because |
|---|---|
| Run Claude headless (`claude -p`) or in any session the owner cannot attach to | Rejected: "having githerd run on its own makes it impossible to interact, monitor, and control" [OD 2] |
| Wait for the owner before urgent work starts | Rejected: "there's no guarantee that I will respond" [OD 2] |
| Approve visual changes, press Finish, or write baselines | Only the owner approves [OD 6] |
| Run CI, audits or anything else on a timer while the system is idle | Rejected: "I don't think we want to run master every 12 hours if the entire system is idle" [OD 7] |
| Add GitHub Actions workflows, cron jobs or systemd units | "can we do it without the github action?"; the container has no cron [OD 2] |
| Use webhooks or a relay | Ports are not reachable from outside, a relay can be forged, and polling with ETags is free [PF 1] |
| Guess file footprints, overlap or duplicates with heuristics | Rejected: "sounds like magic"; "just use claude" [OD 3]. Facts that are not guesses (the files a pushed diff actually changes) are used |
| Act on text from any account but the owner's | "filter to only address issues from the currently authenticated github account" [OD 9] |
| Sandbox workers against a hostile agent | The owner's threat model is mistakes, not malice [OD 9]; guards prevent mistakes, server-side gates enforce |
| Write to any Cytoscape.js repository | "do not, under any conditions, comment in that issue or any cytoscapejs issue" [OD 9] |
| Edit `~/.claude` settings or hooks, run sudo | Owner's standing rules [OD 9] |
| Ask the owner anything reversible, or ask him to split work | [OD 4], [OD 8] |
| Use Sonnet or Haiku | "everything should run on Opus 5.5 or Fable" [OD 10] |

### 1.3 Principles

Every mechanism below follows these. A mechanism that breaks one is a defect in this design.

1. **Facts, not claims.** State comes from GitHub, npm, git and `/proc`. No agent's word closes a
   job, merges a pull request or ends an incident [PA 2.1].
2. **Classify before acting.** Every failure goes through one ordered classifier (section 4.4)
   before anything is reverted, re-run, held or handed to a worker. A payment problem, an
   expired credential or an outage is never handed to a worker as a code problem.
3. **Every unit of work is a record with a state, a holder and a deadline**, and an invariant
   check turns a record without one into a visible fault (section 9.5).
4. **Every wait is bounded, and every bound names its next state.** Bounds pause for causes the
   owner already knows about (usage limit, GitHub unknown, machine load, steering), and only then.
5. **Unknown is a state.** A failed, stale or backwards read gives "unknown since <time>", never
   "green", and nothing acts on unknown data.
6. **Only the daemon does the irreversible steps on GitHub** that githerd does at all: reverts,
   re-runs, closes, statuses, retargets. Merging is Mergify's; githerd never merges. Workers edit
   code, commit, open pull requests and ask for pushes.
7. **Hard rules are enforced by code**: master's ruleset, Mergify's conditions with
   `githerd/merge`, the worker guard and deny rules. Prompts explain the rules; they are never the only control [PA 2.14].
8. **Fail loudly, never loop.** A broken part is a banner on every surface and one page, and
   githerd stays up to say why [OD 7].
9. **Owner input never gates the pipeline.** Only owner-only steps wait for the owner, and only
   the job that needs that step waits.
10. **Nothing runs when nothing changed.** On an idle day githerd costs a few conditional GETs a
    minute, which do not spend the GitHub budget [PF 1.5].

### 1.4 Words used throughout

- **Daemon**: githerd's one long-lived process on this machine (section 4.1).
- **Worker**: an interactive `claude` session the daemon started in tmux for one job.
- **Owner session**: any other Claude session in the repository; githerd never assigns it work.
- **Gating lanes**: the workflows the release waits on: CI, GPU and Hosts (Hosts only when it ran
  for that commit) [R7], [R9].
- **Green commit**: the newest master commit on which every gating lane's newest run is green.
  Worktrees are cut from it.
- **CI-green commit**: the newest master commit whose CI run is green and on which no gating lane
  is red. Pull request updates use it, because GPU and Hosts never run on ordinary pull requests
  [R8], [R9] and master's tip "is almost never green" while master moves [R7].
- **Failure key**: workflow + job name + failed step name, with shard numbers (one or two digits,
  so `windows-2025` stays) and commit hashes replaced by `*`. A red
  master is a set of keys, each handled on its own [INC1 1].
- **Sighting**: one poll answer about a workflow run whose (run attempt, `updated_at`) is newer
  than the last answer seen for that same run. A run never seen before is stale, not a sighting,
  when its id is below every run the previous poll remembered for that workflow and branch;
  the newest 100 runs are remembered per workflow and branch. Older answers are discarded; two
  backwards answers were seen on 10-02 [INC2 2]. The rule is per run, not per workflow: in the
  record, 50 of 275 master CI runs (123 of 256 GPU runs) finished after a newer run of the same
  workflow, and a re-run of the last green commit's older run (4.5, step 3) must be seen.
- **Merge hold**: `githerd/merge` is `failure` on the pull requests a code-red gating lane can
  affect, so Mergify does not queue them (section 4.6). Pull requests the lane cannot affect keep
  merging.
- **Owner item**: something only the owner can do (section 5.6).
- **Doorbell**: one fixed line githerd types into an idle worker's prompt (section 7.5).
- **Reference worktree**: a worktree the daemon owns, at the green commit, installed and built,
  used for the audit, commitlint, the release dry-run and conflict checks (section 4.9).
- **Push queue**: the daemon's queue of worker pushes; it runs each push, pre-push gate included
  (section 4.8).

---

## 2. The owner's decisions this design implements

Every row quotes the owner [OD n] and names where the design keeps the rule and the test that
fails if it stops being kept. "Replay" is the replay suite over the recorded month; "guard test"
the worker guard's unit tests; "self-test" the platform self-test (section 11.4).

| The owner said | Where it is kept | Checked by |
|---|---|---|
| "the idea was for githerd to dish out work to agents through the MCP, having githerd run on its own makes it impossible to interact, monitor, and control" [OD 2] | Workers are ordinary interactive `claude` sessions in tmux, named after their job; their job, waits, questions and completion go through MCP tools (sections 6, 7). `githerd attach` shows them all; typing into one steers it | self-test |
| "there's no guarantee that I will respond. come up with a better mechanism that only relies on claude" [OD 2] | The daemon starts workers itself; urgent work gets a reserved slot at once; owner items park only the job that needs the owner (sections 7.1, 8.1) | replay |
| "how do you ensure that the agents keep pulling work from githerd?" [OD 2] | The daemon fills free slots; the Stop gate blocks an unfinished stop; declared waits are watched by the daemon, which rings the session when they end (sections 7.3 to 7.5) | self-test, replay |
| "I just want the skill to poll, including polling master ... it should run forever after I start it" [OD 2] | 60-second conditional polls; restart by servherd, by every live session's MCP server and by `githerd ensure`; fatal mode instead of exit (sections 4.2, 9.6) | replay |
| "MCPs start automatically when I start claude, that might be a better mechanism" [OD 2] | The MCP server starts the daemon when it is not running (section 9.6) | self-test |
| "just use claude to determine if there is potential overlap or potential conflict, don't try to do it programmatically" [OD 3] | Overlap, grouping, duplicates, obsolescence and "does this pull request address the issue" are judged by workers; code validates and enforces (sections 5, 8.2) | schema tests |
| "the problem with conflicts happening is then you can't group things together" [OD 3] | A worker judges overlap before its first edit; a push without a claim is refused (section 8.2) | guard test |
| "PRs should be the oldest PR first; github issues need some consideration of fixing bugs / highest priority / age" [OD 4] | Queue order (section 5.4) | queue tests |
| "no thanks, I don't want to make all those decisions ... Opus 5.5 seems to be doing great with large tasks" [OD 4] | No "split this?" question exists; a worker splits work itself (`githerd_done` outcome `split`) | schema tests |
| "don't wait for me to merge ... merge what you think is ready, as long as it is passing our quality bar" [OD 5] | Mergify merges every ready pull request (the owner's choice, 10-03); githerd posts `githerd/merge` and Mergify requires it (section 4.6) | replay |
| "as a policy breaking PRs shouldn't auto-merge" and "hold the major version bumps and group them together" [OD 5] | Mergify never queues a `!` title; `githerd/merge` fails a breaking commit under a title without `!` (section 4.6, line 3); the owner merges a major group by hand | replay |
| "why would we want to merge something that we know has errors?" [OD 5] | `githerd/merge` is `failure` while a code-red gating lane can affect the pull request; Mergify tests each pull request on current master before merging it (section 4.6) | replay |
| Never auto-merge a stacked pull request (memory) [OD 5] | Mergify queues only pull requests based on master; githerd disarms any native auto-merge it finds (section 4.6) | replay |
| "we MUST NOT merge a PR until ALL the stories have been confirmed accurate and approved" [OD 6] | The visual gate stays inside the required `All Checks Pass`; githerd only lists reviews and never approves; a missing baseline on master is a master incident | guard test, replay |
| "running my own server doesn't protect us from anything anyway" [OD 6] | The daemon keeps the review server up through servherd and checks it before sending a link (catalog row "Review tool or review server unusable") | self-test |
| "open the issue(s) to fix this in the visual review tool" [OD 6] | A recurring manual step becomes a tool fix, filed as an issue; the daemon uses the tool's own `update` command for baseline-only conflicts [R13] | replay |
| "would githerd have caught that problem?" (an advisory failing every PR while master was green) [OD 7] | The advisory feed is matched against master's lockfile on activity; the same key on a second PR is a shared incident; an audit failure on a PR that does not touch dependencies is master-side at the first PR (section 4.4) | replay of the 10-02 advisory |
| "daily local audit check is still a weak mechanism ... and expensive" [OD 7] | Checks run when something changed, never on a clock (section 4.2) | replay: idle days cost only 304s |
| "Don't bring back nightly builds." [OD 7] | githerd starts no scheduled CI | code review |
| Never blame timing (memory) [OD 7] | A re-run is evidence, never a fix: a pass on re-run files an `intermittent` issue for a root cause (section 4.5) | replay |
| Watchers must fail loudly (memory) [OD 7] | Fatal mode, banners, heartbeat split into liveness and progress (sections 9.6, 11) | crash tests |
| "don't tell me 'ACTION NEEDED' until it is actually needed" [OD 8] | githerd pages once per owner item when he can act on it, again only when its text changes; workers cannot page (sections 5.6, 10.1) | self-test |
| "never ask me if you should continue, just keep going" [OD 8] | Workers decide reversible things themselves and record why; the Stop gate pushes back on a question that is not a one-way door (section 7.3) | self-test |
| "is anything waiting on me?" and "how's it going?" (asked dozens of times) [OD 8] | `githerd status`, the board window, the start line of every session, the `needs-decision` label (section 11) | replay of board snapshots |
| "is there anything that was only partially delivered or silently dropped?" [OD 8] | The invariant check (section 9.5) and orders with tracked issue lists (section 5.7) | replay |
| "just asking, don't implement anything yet" and three more like it [OD 8] | A steered worker is never pushed to continue; the job text says a question is answered, not executed (section 7.6) | self-test |
| "let's filter to only address issues from the currently authenticated github account" [OD 9] | The daemon's reads filter by author; workers read GitHub text only through `githerd_read`, and the guard refuses the other ways to read comments (section 10.1) | guard test, replay |
| "signing is just a simple mechanism to ensure mistakes aren't made" [OD 9] | Guards against mistakes plus server-side gates; no sandbox (section 10) | guard test |
| "what do I need to do to work around the autoclassifier?" [OD 9] | Workers run in the default permission mode with explicit allow rules; pushes are run by the daemon, outside the classifier's reach (sections 4.8, 7.2) | self-test |
| "do not, under any conditions, comment in that issue or any cytoscapejs issue" [OD 9] | The guard refuses `gh` and `git` writes to any repository outside graphty-org | guard test |
| "everything should run on Opus 5.5 or Fable" [OD 10] | `--model` from config, which accepts only those two; the SessionStart hook checks the model | config tests |
| "We should be frugal without risking quality or the outcomes" [OD 10] | No idle turns, no runs without a change behind them; review jobs keyed by patch id so a merge from master needs no second review | replay |
| "we hit our claude usage limit, make sure we have recovered all our workflows" [OD 10] | A usage stop is a global pause that freezes every clock; recovery is a canary worker, then the rest (section 8.3) | self-test |
| "I'm not going to approve anything on chromatic until that is resolved" (overage) [OD 6], [OD 10] | A `park-gate` policy; other work continues | replay |
| "don't make any changes to this repo -- there is another session working in it right now" [OD 11] | One job, one worktree; owner sessions' changed files are shown to every worker at claim time; job worktrees are locked against removal (sections 7.1, 8.2) | self-test |
| "whoops. wrong window" (three times) [OD 11] | Windows and sessions named after their job; the job text says to answer "this is the worker for <job>" and do nothing else (section 7.6) | self-test |
| Browser-driving agents share a cap of 4 [OD 11] | Chromium processes in each worker's tree count against a machine cap; the guard refuses a launch at the cap (section 8.1) | guard test |
| Run servers through servherd [OD 11] | Workers start servers only through servherd; the daemon stops them at job end (section 7.8) | self-test |
| No git stash, reset, checkout of a file, clean (memory) [OD 11] | The guard refuses them; githerd's code never runs them | guard test |
| "solve the problem for our customers, don't just solve it in ci/cd" (never loosen thresholds) [OD 12] | Review jobs flag loosened tests and limits; the rubric says when a benchmark floor change is calibration (section 5.1) | replay of review verdicts |
| "you're just guessing and throwing darts ... look around corners" [OD 1] | The situation table (section 3) covers every catalog situation plus every adversarial scenario; Appendix A records each one | this document |

---

## 3. Every situation, and what githerd does

One row per situation in the catalog [CAT], keyed by the catalog's name, plus the situations the
adversarial review added (section 3.10). Columns:

- **Signal**: what reveals it, its cost, and the evidence that verified it ([S n] when it is not
  verified yet).
- **Action** and **Actor**: D is the daemon (code, no Claude); W is a worker, with its job kind
  (section 5.1); O is the owner, only for one-way doors, visual approval, money, credentials,
  logins, system changes and permission rules.
- **Done**: the checkable fact that closes it. Never an agent's word.

"Classifier" means section 4.4; "merge decision" the `githerd/merge` decision of section 4.6; "incident procedure" section 4.5.
"Free poll" is a conditional GET that returns 304 and spends no budget [PF 1.5].

### 3.1 Master and release health

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| Master red from merged code on a lane pull requests also run | Newest run per gating workflow on master, free poll; a sighting as defined in 1.4; failed jobs, steps and (when `annotations_count` > 0) annotations, 1 to 2 calls [PF 1.5], [PF 9.5] | Classifier first. Code-red: merge hold (`githerd/merge` failure) on the pull requests that lane can affect at the first sighting; incident procedure (daemon re-run on the red head, parent re-test, then revert or fix forward) | D; W `incident` | The failing workflow's newest master run is green at a commit containing the recorded fix |
| Master red on a lane only master runs | Same, for GPU and Hosts [R8], [R9] | Same. The merge hold covers only pull requests the lane can affect: for GPU, those `scripts/bench-groups.js` maps to at least one group, or that touch the lane's own scripts [R8]; for Hosts, those touching its trigger paths [R9]. The release waits regardless | D; W `incident` | That lane's newest master run is green at a commit containing the fix |
| Several causes stacked on one red master | The set of failing keys changes while master is red [INC1 1] | Each new key is its own incident with its own worker; red-since is the first red run of the stretch | D; W `incident` per key | Every gating workflow's newest master run is green |
| Intermittent failure on master | The daemon's own re-run of the failing job on the red head passes (section 4.5); or a run with `run_attempt` above 1 whose earlier attempt failed [INC1 7] | The daemon files or finds one issue labelled `intermittent` with the key and log excerpt (critical on a second occurrence on another commit). The incident ends as "intermittent"; the issue is queued for a root-cause fix. A re-run is never recorded as a fix | D; W `issue` | Issue closed by a merged root-cause fix and the key has no first-attempt failure in the next 20 master runs (reopened otherwise) |
| Release blocked because a gating lane is red | Release gate notice or run naming a lane [R7]; annotations [PF 9.5] | Folded into that lane's incident | D | The lane's incident is done and npm shows the versions |
| Release push race: version commit rejected | Release log "non-fast-forward" or "rejected"; after each release run, tags (`git ls-remote`, local) against npm (npm GET per package) [INC1 2] | Prevention: pull requests that change release inputs are not merged while the release job (not the gate job) is running. A tag without a published version, or a version without its commit, is a release incident | D; W `incident` | npm shows the tagged versions and master has the version commit |
| Release published the wrong contents | After each release, a new major on npm not tied to an approved group [INC1 2] | Prevention: Mergify never queues a `!` title, and `githerd/merge` line 3 fails a breaking commit under a plain title. Detection: owner item at once, because a published version cannot be unpublished | D; O | Every published version is one the rules allowed |
| Unintended version bump | Decision line 7: the daemon's release dry-run on the reference worktree merged with the pull request [S31] | `githerd/merge` failure with the unexpected bumps; a `pr` job fixes the config | D; W `pr` | Dry-run shows only allowed bumps |
| First publish of a new package | A pull request adds a publishable `package.json` whose name npm answers 404 (1 npm GET) [INC1 2] | `githerd/merge` failure "needs first npm publish of <name>"; one owner item with the two steps | D; O | npm returns the package |
| npm propagation delay read as failure | Publish log "previously staged version" (409) [INC2 12] | npm GET once a minute for up to 10 minutes; never paged | D | npm shows the version; still missing after 10 minutes is a release incident |
| Release reported failed when it landed | Not needed: release truth is npm against master's tags and version commits, never a run's conclusion [R7] | The board's release line reads npm | D | n/a |
| Release starved by a steady stream of merges | Hours since the green commit above 6 while merges continue and every gating lane is progressing (section 4.7) | `githerd/merge` fails "starvation hold" on every pull request until the slowest lane completes on master's head. Never applied while a lane is not progressing (outage, balance), because waiting would not help | D | A green commit newer than the limit, or a release |
| Master looks green but has not run against today's world | Never inferred from master; the advisory feed and the shared-failure classes catch it (3.2, 3.3) [OD 7] | Master is shown as "green as of <commit>" | D | See those rows |
| Red spreads into pull requests through update-from-master | Prevention | Held pull requests leave Mergify's queue, so Mergify does not update them onto a red master; githerd's own updates use the CI-green commit (section 4.6) | D | No held pull request is updated onto a red commit |
| Gating lane gets cancelled, never finishes | Newest run of a gating lane is `cancelled`, or its job says the runner was lost: "lost communication" is only in an annotation (the job has no steps and no log), "received a shutdown signal" only in the log, and both jobs conclude `failure`, not `cancelled` [PF 9.5] | Classifier: on a rented label, runner loss is "possible balance" until the next start proves otherwise (3.2). Otherwise one re-dispatch on master's head; a second loss on the same head is an incident | D | The lane completes on master's head |

### 3.2 External drift

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| Security advisory fails the dependency audit | The advisory feed sorted by update time, a free poll (it answers `If-None-Match` with 304, and the braces advisory of 10-02 is on its first page with its update time) [PF 9.4]. Names matched against master's lockfile; a match runs the audit exactly as `ci.yml`'s `Security audit` step does (`pnpm audit --audit-level=high --json`, honoring `ignoreGhsas`) in the reference worktree [R5]. A matched advisory that passes locally stays on a recheck list until a CI audit has run after its update time | A failure is a shared incident before any pull request fails; per-PR audit failures on pull requests that do not touch dependencies are master-side (classifier) and create no `pr` job. The worker upgrades, overrides, or records an ignore with a reason and a dated review (allowed by the review rubric) | D; W `incident` | The audit passes on master's lockfile and on one canary pull request updated and green; the other pull requests are updated only when each comes up to merge |
| Audit exception expires or a patch appears | The advisory feed shows an update to a GHSA listed in `ignoreGhsas` [R5] | A job to remove the ignore and upgrade | D; W `issue` | The ignore is gone and the audit passes |
| Dependabot alerts disagree with reality | Not read | Dependabot alerts never create work [CAT] | - | n/a |
| Runner image moves under the project | On every red gating key: a diff of the `Set up job` runner-image block and the tool-version lines (node, pnpm, Chrome, Mesa, driver) between the last green and the first red run of that job, 2 log fetches; deprecation annotations on completed master runs [PF 9.5] | A non-empty diff makes the incident "environment drift": no revert, the worker starts from the diff. An issue is filed only when a version the gate records changes, not when the image string changes | D; W `incident` | The lane is green on the new image |
| Rented GPU runner out of balance | Balance text in a step name ("Machine: Insufficient balance to run job. Current balance: ..."); the rejected job has no annotation and no log. Runner loss on the rented label counts as possible balance [INC1 2], [PF 9.5], [PF 9.6] | Classifier class "paid capacity": no incident, no worker. One owner item. The GPU lane is parked for merges (merges continue; release waits, enforced by `release.yml` itself [R7]). The daemon re-dispatches the GPU lane on master's head at 30 minutes, 2 hours, then every 6 hours while the item is open: a balance-rejected job fails about 5 seconds after it is created and is not charged [PF 9.6] | D; O | The lane completes on master's head (a silent top-up ends the item by itself) |
| Rented runner plan limits | Log or annotation "limited to 30 minutes" or "Concurrent runner limit reached" [INC2 4] | Same class; owner item for the plan; an `infrastructure` issue if the workflow must be restructured | D; O | The job completes within the plan |
| Job or step time budget overrun | Step durations from the jobs API for completed runs of workflows with timeouts, 1 call [INC2 4] | One issue per workflow and step, while there is still margin | D; W `issue` | Worst recent duration under 80 percent of its limit |
| Benchmark noise on rented hardware | A red `bench-compare.js` row [R8] inside an incident | Incident procedure: the parent re-test separates noise from regression. Review rubric: a floor change backed by 10 or more recorded samples of that row on the same runner class is calibration, not loosening; anything else is an owner item, and the daemon's re-run unblocks master meanwhile | D; W `incident` | The row passes, or the floor matches its measured noise band |
| Paid service overage | None readable [CAT 9]; the owner says so | `githerd policy park-gate <service>` or `githerd_record`; that gate's failures stop being incidents | O to say it; D | The owner ends the policy |
| External service outage fails a check | Failed step's log names a remote host with a 5xx, ETIMEDOUT or ECONNRESET [INC2 5] | Classifier class "outside": the daemon re-runs the failed job once after 15 minutes; a 403 or 429 caused by our own burst becomes an `infrastructure` issue. Never a fix job | D | Passes on re-run, or the issue exists |
| DNS or network stall on this machine | githerd's calls fail with resolve or connect errors and a second host (registry.npmjs.org) also fails | "Unknown since <time>": no decision, no write, no new incident; every deadline and attempt clock paused | D | A full reconcile succeeds |
| Credential or account state blocks everything | One credential-pattern table, applied first by the classifier to every failure text (PR and master steps, release runs, worker-start probes, push results, worker findings): 401, "Bad credentials", 403 with "auth" or "permission", "Permission denied (publickey)", OIDC 403, npm E401, gpg or ssh signing errors; `gh` login change on `GET /user`; StopFailure `authentication_failed`, `billing_error`, `oauth_org_not_allowed`, `account_on_hold`, `verification_required` or `cloud_credential_error` [PF 10.3]; the token-expiration header, absent on the owner's OAuth token today [PF 9.9] | One owner item per credential; no attempts charged; only what needs that credential stops. A changed `gh` login freezes all dispatch and writes. A signing probe runs before every worker start [S28] | D; O | The next call that needed it succeeds |
| Shared GitHub rate budget runs low | `X-RateLimit-Remaining` on every response, never `GET /rate_limit` [PF 1.5] | Under 1500 only master runs and the pull request list are polled; under 500 the daemon posts no new `success` and keeps the last 300 calls for its own holds and polls, because at zero even a conditional request is refused with 403 [PF 9.3] | D | Remaining above 1500 |
| Claude Code update changes the platform under githerd | `claude --version` before each worker start differs from the last verified version | Platform self-test before any start; failure stops starts, banner, one page; resume used only if the self-test verified it | D | Self-test passes |
| Repository settings change under githerd | Rulesets and repository settings read with ETag when master moves [R1], [R2] | A required check that has not reported on any pull request head in 24 hours is an incident; a change to `delete_branch_on_merge`, the merge methods or the required checks is a banner and re-checked assumptions | D | Every required check reports |

### 3.3 Pull request lifecycle

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| Own check failure | Check runs on a changed head, failing keys from the jobs API, 1 call | Classifier; class "own" makes a `pr` job that resumes the session that made the pull request when there is one | D; W `pr` | Required checks green on the current head |
| Shared failure across pull requests while master is green | The same key on 1 or more other open pull requests within 6 hours (the second pull request) [INC1 3], [OD 7] | One shared incident; `pr` jobs on that key are not created (an existing one is held). Done-condition is the canary rule, not every pull request | D; W `incident` | The key passes on master's fix and on one canary pull request |
| A pull request that changes nothing fails | Its file list cannot affect the failing key: no package source for a build key, no `pnpm-lock.yaml` or `package.json` for an audit key | Master-side shared incident at the first such pull request; no `pr` job | D; W `incident` | As above |
| Intermittent failure on a pull request | Key named by an open `intermittent` issue | One daemon re-run per head; workers cannot re-run (guard) | D | Green head |
| Textual merge conflict | `mergeable == false` on the single pull request GET, re-read when master moves; `null` is no data; two sightings. Conflicts are classified with `git merge-tree` against `origin/master`, the tip GitHub judges against | A `pr` job merges the CI-green commit and resolves. A path in conflict on 3 or more pull requests in 7 days gets an issue to remove the hot spot | D; W `pr` | `mergeable == true` and checks running on the new head |
| Conflict only in visual baseline images | `merge-tree` against `origin/master` whose conflicting paths are all under `visual-baselines/` | The daemon runs `visual-review update <pr>` [R13], which accepts nothing and approves nothing; it pushes with `--no-verify`, so it runs as an entry of the push queue (4.8) with the signing variables (7.1) [S29]; if the tool refuses because another file conflicts (exit 1, nothing changed), a `pr` job | D; W `pr` | Mergeable |
| Semantic conflict between pull requests | No signal before a merge [CAT 9] | Mergify merges master into each pull request and waits for its checks on that head, so the second of two related pull requests is always tested on a base containing the first. Master's lanes are the backstop | Mergify; D | The second pull request is green on a base containing the first |
| Branch far behind master | `behind_by` from compare, read only when a reason below applies | Mergify updates it when it reaches the front of its queue. githerd updates it only when its failing key is fixed on master, its stack base moved, or it is unparked | D | The base contains what it needs |
| Visual captures out of date | The review record names the master commit it compared against; master's baselines changed since | Not updated speculatively by githerd: Mergify updates it when it reaches the front of the queue, so the owner re-reviews once | D | Visual gate green on the head |
| Waiting on the owner's visual review | The visual step of `All Checks Pass` pending with "awaiting approval" [INC2 8] | Listed on the board with direct links, fewest diffs first [OD 6]; paged when the list gains an item and the owner is present (section 11.3), otherwise a daily digest. Stacked children are listed only after their base's gate is green. Never a job | D; O | Approved; gate green |
| Owner rejects visual changes | An owner comment on the pull request carrying the review tool's machine-readable reject block [R14], [S29] | A `pr` job that resumes the session that made the pull request, with the rejects | D; W `pr` | New captures approved |
| Visual gate passes when it should not | On each master move, a local read of master's `visual-baselines/` and story lists: every package with a Storybook has baselines [INC2 8] | A master incident with merge hold on every pull request | D; W `incident` | Every package's stories have approved baselines |
| Review tool or review server unusable | Before any link is sent: servherd status, the health route, the served version against master, and the certificate's `notAfter` [PF 1.2] | `servherd restart` by the daemon; still broken, an incident for the tool; certificate under 14 days with no renewal, an owner item | D; W `incident` | The link works on current code |
| Stacked pull request | `base.ref != "master"` | Never queued by Mergify (its rule needs `base=master`); stray native auto-merge disarmed. The daemon models the chain (section 4.6): when a base's head changes, children are updated in order; when a base merges, the daemon retargets each child to master itself, because `delete_branch_on_merge` is false and GitHub will not [R1], [PF 9.2]. The retarget starts no CI; Mergify's own update does (4.6) | D | Merged into master with its own checks |
| Pull request already merged through another | Every commit reachable from master (1 compare call) | Comment naming the merging pull request; close after 3 days unless the owner objects | D | Closed with a pointer |
| Breaking pull request held for a grouped major | `!` in the title (Mergify's rule); a breaking commit under a title without `!` fails `githerd/merge` line 3 | Mergify never queues it. githerd groups them per package on the board, with one owner item per group: cut the major now (the owner merges it by hand) or wait | Mergify; D; O; W `major` | One major per group is on npm |
| Breaking change nobody marked | No mechanical signal [CAT 9]; review job | `breaking-unmarked` holds it; a `pr` job marks it | W `review`, `pr` | No minor release changes an export |
| Two sessions planning majors for the same package | The group comes from open pull requests, not from sessions | A second breaking pull request joins the group | D | One major per package per group |
| Title or commit message fails commitlint | The daemon runs the repository's commitlint on the title in the reference worktree when a pull request opens or its title changes; commit messages are checked locally by `.husky/commit-msg` [INC2 6] | Lowercase-first-letter fix by the daemon. Otherwise: if the session that made the pull request is open, it is rung with the output; else a `title` job, which needs no worktree. `pr-title.yml` re-runs on `edited` [R10] | D; W `title` | `Lint PR Title` green |
| Pre-push gate failure or a push misread as success | Pushes are run by the daemon (section 4.8), so the result is known; `githerd_done` compares the reported head with `git ls-remote` | A gate failure is classified like a CI failure, with a local failure key; a key that fails in two jobs or on the green commit is a shared local incident, and does not count as an attempt for a job that did not touch the failing file | D | GitHub's head equals the pushed commit |
| Push queue backs up | The daemon's own queue and the shared push lock's waiters [S24] | Priority (incident fixes, then finished work, then the rest); sessions waiting to push count as waiting, not working; while the queue is deep, only work that needs no push is dispatched | D | Queue under its limit |
| Commits pushed but checks never start | No check suite on a head 10 minutes after it appeared, 1 call; unless "Actions degraded" holds (3.10) | A workflow that did not trigger is an incident; conflicts go to the conflict row | D; W `incident` | Checks running |
| Green but not merging | Required checks green, mergeable, `githerd/merge` success, not merged after Mergify's queue ahead of it drained | The board shows the first failing decision line, or Mergify's queue position from its check run; a pull request stuck with `success` at the front of an empty queue for an hour is an incident for the Mergify configuration | D | Merged, or the reason is an owner item |
| Native auto-merge armed | `auto_merge` in the pull request list | Disarmed everywhere: it would merge on the ruleset's checks alone and bypass `githerd/merge`; Mergify is the merger | D | No native auto-merge armed |
| Head changed after githerd checked it | Native: a commit status belongs to one sha, so a moved head has no `githerd/merge` until githerd posts on it | Evaluated on the next reconcile; Mergify cannot merge it meanwhile | D | n/a |
| Pull request waiting on an owner decision or owner-only step | `needs-decision` label, or a job parked through `githerd_ask_owner` | One owner item on that pull request; the pull request is not updated while parked; on the answer, one update from the CI-green commit, then the session resumes | D; O | The answer is recorded and the job resumes |
| Duplicate pull requests | Claims; two open pull requests referencing the same issue | The older is kept; the newer is commented and closed after 3 days unless the owner objects | D | One pull request per piece of work |
| Abandoned pull request | A pull request githerd's job made, whose job ended, with no new head and no comment for 48 hours, not merge-ready, with no open owner item and no `needs-decision` label | A `pr` job, oldest first. The owner's own pull requests are listed, never taken | D; W `pr` | Merged, or closed with a reason |
| Fix pull requests pile up for one incident | Attempts per incident | One attempt at a time; 3 attempts; findings carried; then one owner item | D | Fixed, or escalated once |
| Review comments from a bot account | Comment author is not the owner | Ignored and counted; workers cannot read them (`githerd_read`, guard) | D | Count shown |
| Pull request from another account | `user.login` differs from the owner | Ignored and counted; never merged | D | n/a |
| Pull request backlog grows | Open count and the histogram of merge-decision reasons | One reason covering 40 percent or more of 8 or more open pull requests is the board's headline | D | The dominant reason is handled |

### 3.4 Issue lifecycle

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| New issue | `issues?since=` free poll, with the high-water mark minus 10 minutes and dedupe on (id, `updated_at`) | Queued for triage (20 per job, one triage job at a time); labels only from the existing set | D; W `triage` | One type, priority and effort label each |
| Issue from another account | Author is not the owner | Ignored and counted | D | n/a |
| Duplicate issue | Triage judgment [CAT 9] | Confirmed by the next triage job in a fresh session; then a proposal comment and a close after 7 days of owner presence unless he objects | W `triage`; D | Closed with a link, or kept with a reason |
| Obsolete issue | Refresh triage after every 20 merges, with cited evidence from current master | Same propose, confirm and grace path | W `triage`; D | Closed with evidence, or refreshed |
| Fixed elsewhere but still open | A merged pull request mentions `#n` without a closing keyword | Into the next refresh batch | D; W `triage` | Closed naming the pull request |
| Issue needs splitting | The worker's judgment | The worker files the children and reports `split`; the daemon tracks the parent | W `issue`; D | Every child closed, then the parent |
| Overlap or grouping with work in flight | The worker's judgment at claim against a versioned snapshot that includes owner sessions' changed files (section 8.2) | independent, join or wait, validated and enforced | W; D | No two in-flight jobs overlap without a recorded decision |
| Stale needs-decision and blocked labels | Each full triage pass (after every 100 merges) | Reversible ones decided with a comment and the label removed; real one-way doors become owner items | W `triage` | Every remaining `needs-decision` is an owner item |
| Issue needing a one-way-door decision | `githerd_ask_owner` kind `one-way-door` | Owner item with options and undo cost; job parked; slot freed | W; D; O | Answer recorded; job resumes |
| Owner answers on an issue | An owner comment on an issue with an open owner item: each reconcile, a conditional GET of the comments of every such issue (few, 304 free) | Resume the session with the comment. If the worker reports "no answer yet", the job re-parks on the same item with no new page | D | Job working again |
| Owner edits an issue after work started | The claim stores the issue body hash, labels and state; a change is news | News is written to the job's news file, delivered by the next tool result or the PostToolUse hook [PF 10.5]; `githerd_push` refuses while news is unacknowledged; closed by the owner cancels the job (unpushed work salvaged); `blocked`, `needs-decision` or `githerd:skip` parks it. A pull request from an issue job gets `githerd/merge` success only once its job acknowledged the current revision (decision line 8) | D; W | The worker acknowledged the current revision |
| Critical issue in nobody's hands | Queue order; lapsed claims | First in the `issue` part of the queue | D | Claimed and progressing |
| Owner batch order by label | `githerd_record` kind `order`, or `githerd order` [CAT 9] | Issue list fixed when recorded; progress and dropped items on the board | D | Every listed issue closed or labelled `blocked` with a reason |
| Bulk filing | Many new issues in one poll [INC1 4] | Triage at its bounded rate; unlabelled issues never become `issue` jobs | D; W `triage` | All labelled |
| Issue that touches Cytoscape.js | Standing guard | The guard refuses writes outside graphty-org; the job text repeats the rule | D | n/a |
| Issue that needs an owner-only system change | `githerd_ask_owner` kind `system` | Owner item with the exact command | W; O | The next call that needed it succeeds |
| Agent closed an issue the owner reopens | A `reopened` event by the owner that matches no worker write (section 10.1) | Recorded as a veto: never proposed or closed again | D | n/a |
| Defects found but never filed | `githerd_done` requires every defect found, each with an issue or a commit | A missing one refuses the report | D | Each listed defect has an issue or commit |
| Issues from automated stages | A burst of new issues | Triage groups them | W `triage` | Labelled and grouped |

### 3.5 Agents

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| Session died | Registry pid gone (`kill -0` with recorded start time), or absent from `claude agents --json` [PF 2.2] | Kill every process whose `/proc/<pid>/cwd` is inside the job's worktree (orphans lose their parent link), remove a stale `index.lock`, re-read GitHub for the job's branch and pull requests, then continue: resume if verified [PF 10.2], else fresh with findings. Second death within 30 minutes: fresh; third: `faulted` with the pane capture | D | Live session again, or the job is complete on GitHub |
| Session stopped on an API error | StopFailure reason [PF 10.3]; fallback the transcript's last record | By reason (section 8.3) | D | Every interrupted job is live or complete |
| Usage limit approaching | The weekly-limit text in pane captures [PF, closing notes], readability [S19] | Once verified: above 80 percent 2 slots, above 90 one, above 95 urgent only. Until then a worker-hours-per-day cap from config | D | n/a |
| Waiting on a permission prompt | Registry `waiting` with `permission prompt` [PF 2.2]; a pane capture matching the dialog text | Never answered by githerd. The job parks at once on one owner item naming the exact allow rule; the slot is freed; the window stays open so the owner can press 1 from tmux; deadlines pause. `githerd answer <item> allow` adds the rule to the runtime allow overlay used by every later worker | D; O | The session runs again |
| Permission classifier refusal | Refusal text in the transcript tail, read by the Stop hook | Workers run in the default permission mode, not auto (section 7.2), so the classifier is not consulted; pushes run in the daemon. A refusal that still happens is a blocker recorded with the exact action, never retried by rewording | D | Allowed by rule, or not needed |
| Claimed but idle | Registry `idle` while the job is `working` and no wait declared | Stop gate blocks once per turn; then the doorbell; delivery counts only with progress (a worktree change, a declared wait or push, or a `githerd_done` or `githerd_ask_owner` call) within 15 minutes; two rings without progress recycle the session fresh | D | Progress, or a new session |
| Busy but making no progress | No transcript growth (subagent transcripts included), no CPU time in the session's descendant processes [PF 10.7], no background task output growth, for 20 minutes, outside a `githerd_expect` window | Pane captured and matched against dialog text first: a dialog takes the permission-prompt path and no Escape is sent. Otherwise Escape and a status request; 10 minutes later recycle fresh | D | Progress again, or a new session |
| Stuck repeating a wrong theory | Attempts on one key with no change in outcome | After two, a fresh evidence-first attempt with the old theories; after three, one owner item | D | Fixed, or escalated once |
| Agent claims done when it is not | `githerd_done` checked against GitHub: base master, not draft, head equals `git ls-remote`, required checks green or waiting only on the owner | A failed check returns what is missing; three in a row end the attempt | D | Done-condition holds |
| Two sessions on the same work | Claims; for sessions that never claimed, the branch of every live session's cwd and every dirty worktree (`git worktree list`) | The second is told who holds it | D | One holder per item |
| Session githerd did not start, working on the pipeline | `claude agents --json`: every live session and its cwd [PF 6]; changed files from its branch and worktree | On the board; its changed files are in every worker's claim snapshot; never assigned work, rung or ended | D | Every live session is on the board |
| Owner takes over a worker | UserPromptSubmit without githerd's nonce that is neither the launch prompt nor a `<task-notification>` [PF 10.3], or such a user record in the transcript | Job steered (section 7.6); `githerd keep <window>` hands it over for good | D; O | The session calls githerd again, or is ended |
| Owner types into the wrong worker | No signal [CAT 9] | Job-named windows; the job text's rule | W | n/a |
| Owner asks a question and the worker acts on it | No signal [CAT 9] | While steered the Stop gate never pushes; the job text's rule | W | n/a |
| Worker asks the owner something | A stop whose last message asks a question or has `ACTION NEEDED` and no `githerd_ask_owner` call [PF 3.1] | Block once: decide it, or ask through `githerd_ask_owner` if it is owner-only. `AskUserQuestion` is denied | D | Continues, or one owner item |
| Doorbell not acted on | No progress within 15 minutes of a ring | Second ring; then recycle | D | Progress |
| Session start blocked on a dialog | No registry entry 30 s after start [PF 2.2]; pane capture | Captured, window killed, start failure. After a self-test pass, two more real start failures stop starts for good and raise one owner item with the capture (no self-test loop) | D; O | The registry entry exists |
| Job ends but the session lingers | Done-condition holds while the process lives | `/exit` when idle, SIGTERM after 30 s [PF 2.3]; processes in the worktree killed | D | Registry entry gone |
| Rules lost to compaction | SessionStart source `compact` [PF 10.4] | The hook prints the job record again; 3 compactions recycle fresh. Hard rules are in the guard and the merge decision | D | n/a |
| Worker in a shared or stale tree | At job start | One job, one worktree at the green commit (detached for `pr` jobs), installed, built with Nx and smoke-tested before the session starts; `git worktree lock` so no session can remove it | D | Checks pass before the session gets the job |
| Commands that hang or harm shared state | Prevention | The guard refuses stash, reset, checkout of a file, clean, rebase, `--no-verify`, bare `git push`, `gh run rerun`, `gh workflow run`, `gh issue close`, git writes whose `-C` or `cd` leaves the worktree; the daemon reads `core.bare` of the main checkout on each master move | D | n/a |
| Agent loosens a test or threshold to get green | No mechanical signal [CAT 9]; review job | `loosened` holds the pull request; the rubric defines calibration | W `review` | n/a |
| Agent tries something only githerd or the owner may do | Prevention: ruleset [R2], merge decision, guard, deny rules | Refused: push to master, force-push, merges, auto-merge, statuses, re-runs, closes, retargets, `visual-baselines/` writes, the review tool's accept and finish, writes outside graphty-org, edits under `githerd/`, `.claude/`, `.github/workflows/`, `.husky/`, `tools/prepush.sh` | D | n/a |
| Session budget exhausted mid-job | Tool error text in the transcript's last records | Recycled fresh with the job record | D | Job continues |
| Spending without progress | Working time on one attempt past its budget with no GitHub change | The attempt ends with findings | D | n/a |
| Machine overload | `/proc/loadavg`, `/proc/meminfo`, Chromium count in each worker's tree, gate processes; read before each start [OD 11] | No new worker above the limits; start and preparation deadlines pause and faults are not counted while above them; "starts held: load N" on the board, never a page; the load is given to workers ("timing failures in this window are not evidence") | D | Below the limits |
| Orphan processes and servers | Job end: servherd entries whose cwd is inside the worktree; processes whose cwd is inside it | Stopped; anything githerd did not start is listed, never touched | D | Nothing githerd started outlives its job |

### 3.6 githerd itself

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| githerd crashed | The `alive` file (written every 10 s) is older than 60 s and the lock's pid is dead or has another start time | Restarted by pm2 once servherd passes `autorestart` [R18], [S26]; by the MCP server of every live session and the first session's launcher (a local stat once a minute); by `githerd ensure` (no supervisord entry, owner's decision 3 in 12.3). Each restarter takes a restart lock. Uncaught exceptions enter fatal mode instead of exiting | D | `alive` fresh |
| githerd alive but stuck | `alive` fresh but `progress` names one step for longer than that step's bound | Shown on the board; a reconcile step past its bound is cancelled and logged; long work runs as tracked child processes with their own deadlines | D | Reconciles completing |
| More than one githerd | The lock (pid, start time); every start path uses one fixed cwd and name [R18] | A second daemon exits; stray servherd entries named githerd with another cwd are removed | D | One daemon |
| Stale or backwards API answers | (run attempt, `updated_at`) monotonic per run, and a new run older than every remembered run is stale (1.4); `since` polls overlap by 10 minutes; heads confirmed with `git ls-remote` before a refusal [INC2 2] | Discarded or re-read | D | n/a |
| GitHub API outage or errors | 5xx, timeouts | "Unknown since <time>"; the Stop gate allows every stop with "GitHub unreachable; githerd will ring you; do not work around it" and records an implicit wait; never paged | D | Calls succeed |
| Container restart | PID 1's start time changed [R21], [S25] | Every recorded pid and pane void; release check first; rebuild; `tmux -L githerd` session recreated; working jobs continued one at a time, incidents first; waiting jobs stay waiting without a session | D | Every job live or complete |
| Events missed while down | Not needed: no webhooks; the poll is the truth [PF 1.4] | Full reconcile at start | D | n/a |
| Forged or replayed relay events | Not applicable: no relay | n/a | - | n/a |
| Bad configuration | Strict validation with bounds; replay gate before adoption (section 9.7) | Last good config kept on disk and used with a banner; a refused config commit gets a daemon revert pull request; fatal mode only when no good config was ever loaded | D | A valid config is in use |
| githerd's own code changes | A master move touching `githerd/` | Self-update with replay suite, protocol test and self-test; rollback on failure; old sessions keep their pinned client copy (section 9.8) | D | Running master's githerd |
| Writes that silently do nothing | Every write read back, and confirmed by the next poll | Mismatch on the board; retried once | D | n/a |
| Owner notifications broken | The notify command's exit status | "Phone alerts broken" first on every surface | D | A notification succeeds |
| githerd's own Claude judgment fails | Validation errors; failed triage or review | Retry in the same session; a version-mismatch validation error is not an attempt; failed triage batches are requeued | D | A valid judgment is recorded |
| githerd spends what the sessions need | Rate headers; worker hours | The owner's `gh` token with tiers and a reserve (no GitHub App, owner's decision 2 in 12.3); worker-hours cap | D | n/a |

### 3.7 The owner

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| Owner away for hours or days | Presence: the owner's typing in a non-worker session (a user record in its transcript [PF 6]), CLI use, or an owner-account action on GitHub that matches no worker write | While absent over 2 hours: at most one review digest a day; grace periods count only days with presence; pull requests waiting only on review are not updated; incidents still move | D | Everything that did not need him moved |
| Visual review queue grows | Count and age of reviews waiting | At 6, no new `issue` jobs that touch a package with a Storybook (judged at claim, checked against the pushed files); pull requests already approved once do not count; reviews presented as a train (approve, merge, update the next, re-capture, show) | D | Under the limit |
| One-way door waiting | Owner items | One each, with options and undo cost; nothing else waits | D; O | Answered |
| Money, credentials, logins, system changes | The rows above | One page per item when actionable | D; O | The next call succeeds |
| Owner asks for status | `githerd status` (from `state.json` when the daemon is down), `githerd_status`, the board window, each session's start line, the `needs-decision` label | Always current; "nothing is waiting on you" when empty; `githerd why <item>` | D | Answered in one call |
| Alert fatigue | githerd's alert log | One page per item when actionable, again only on change; workers cannot page | D | n/a |
| Owner policy given in one session | `githerd_record` kind `policy`, or `githerd policy` [CAT 9] | Kept in state, ledger and every start line; switches enforced at once | D | Ended by the owner |
| Work the owner asked for is silently dropped | Invariant check (section 9.5) | Fault at the top of every surface; paged once after 24 hours | D | Nothing lacks a holder, state and deadline |
| Owner approves in chat but the agent cannot act | Not needed | Mergify merges by rule | Mergify | n/a |

### 3.8 Combinations

| Situation | What happens |
|---|---|
| Red master while the usage limit is spent | The incident is first in the queue; the board says "master red since <t>, waiting for the usage limit (reset <t>)"; the daemon's re-run and parent re-test still run, because they need no Claude; one page, because switching accounts is the owner's action |
| Red master whose fix needs the owner | The incident job must look for a reversible way back to green first (an audit ignore with a dated review qualifies; loosening a gate does not); only then `githerd_ask_owner`, once |
| Shared failure inside a held breaking pull request | The breaking fix joins its package's group and stays held; one owner item lays out ship-now or keep the reversible workaround; the workaround keeps others moving |
| Container restart during a release | The release check (tags, npm, version commits) is the first step of every start |
| Owner steers a worker into another worker's job | Claim comparison on every tool call and Stop; `githerd_done` and `githerd_push` refuse targets the session does not hold |

### 3.9 Situations with no reliable signal

| Situation | How it is handled without one |
|---|---|
| Semantic conflict | Mergify tests each pull request on current master before merging it; master lanes and the parent re-test are the backstop |
| Breaking change nobody marked | Review job on every githerd pull request |
| Duplicate issue, obsolete issue | Triage judgment, a second confirmation, a grace period counted in owner-present days, veto |
| Defect found but never filed | `githerd_done` requires the list; the daemon checks each entry |
| Batch order or policy typed into a session | `githerd_record`; every start line says orders and policies go there |
| Wrong window; question taken as an order | Job-named windows; steering silences the Stop gate and the doorbell |
| Agent loosens a test | Review job with a rubric |
| Usage limit approaching | Weekly-limit text once verified [S19]; worker-hours cap until then |
| Paid service overage | `park-gate` policy |
| GPU balance before zero | Not predicted; classified on the first failure and re-dispatched on backoff |
| Hung tool versus long tool | CPU time, transcript and subagent transcript growth, background output growth, `githerd_expect` |
| Permission prompt inside a subagent | Registry `waiting` with `permission prompt` and the pane's "from the <type> agent" header [PF 10.6]; pane matched before any Escape |
| githerd down while no session runs | A head without `githerd/merge` cannot merge, and Mergify's own updates create such heads; a pull request already carrying `success` and up to date can still merge (section 10.3). Restart by pm2, by the next session's MCP server, or `githerd ensure` |

### 3.10 Situations added by the adversarial review

| Situation | Signal | Action | Actor | Done |
|---|---|---|---|---|
| A flaky benchmark turns master's GPU lane red after an innocent merge | Classifier, then the incident procedure | Daemon re-run of the failing job on the red head and parent re-test on the last green commit before any revert; a red-head pass is "intermittent" (issue filed by the daemon); merge hold only for pull requests the lane can affect | D | As 3.1 |
| GPU provider outage: the job sits queued | Queue age per gating job (status `queued` and no `runner_name`; now minus `created_at`, because GitHub fills `started_at` with `created_at` while a job waits) above the worst pickup time seen on that label, 926 s on the rented label from 09-18 to 10-03 [PF 9.8] | "Lane not progressing": one owner item (provider or account), release waits, merges continue, no re-dispatch while no runner picks up | D; O | The lane starts |
| GitHub Actions degraded (API fine, runs not starting) | Two or more heads pushed in 15 minutes with no check suite, or githubstatus.com reports Actions degraded [S27] | One "Actions degraded" state: CI-wait deadlines paused, not-started and slow-check rules and doorbells suppressed, lane re-dispatch held | D | A run starts on a recent head |
| A scheduled GitHub deprecation brownout | Annotations on completed master runs (`annotations_count` > 0) [PF 9.5]; step text "automatically failed because it uses a deprecated version" | One `infrastructure` issue per deprecation with its date; a failure in the brownout window is environment drift (no revert, no intermittent issue) | D; W `issue` | The workflow no longer uses the deprecated item |
| A non-gating master workflow fails (`deploy-pages.yml`, `coverage.yml`) | The same free runs poll returns every workflow [R4] | Low-priority incident, no merge hold | D; W `incident` | Its newest master run is green |
| Release stuck green because CI artifacts expired | Release gate notice "no longer holds" its builds, read from annotations after each release run [R6], [R7], [PF 9.5] | The daemon re-runs CI on that commit, which recreates the artifacts and triggers the release on completion; no worker | D | npm shows the versions |
| Release pending is real, not a quiet day | The daemon's `nx release --dry-run` on the green commit says whether anything would publish [S31] | Only a commit that would publish and is not on npm 2 hours after its lanes went green opens a release incident | D; W `incident` | npm shows the versions |
| Registry or toolchain outage (npm 5xx, corepack or pnpm key rotation) | Install, audit or gate error text and exit code | Platform fault: worker starts pause with a banner, no attempts charged; retried on the next master move or after 15 minutes; a tool error in the audit is "unknown", never an advisory | D | Install succeeds |
| Signing key missing or expired | Signing probe before each worker start [S28]; gpg errors in worker findings | Credential class: one owner item, starts stop, nothing charged | D; O | The probe passes |
| Stacked pull request whose base was merged | The base pull request merged, child's base is the old branch [R1] | Daemon retargets the child (`PATCH` base to master) [PF 9.2], because neither GitHub nor Mergify does; Mergify then queues it like any other and updates it, which runs CI on the new base. Never by deleting the base branch: that closes the child | D | Child based on master |
| A worker's target pull request changes under it (owner merges, closes or pushes; the review tool updates it) | Head or state change on a held target | Unpushed commits salvaged to `githerd/<job>-salvage` and listed; a foreign head change is news ("branch moved by <who>: merge it before pushing"); attempts counted per job | D | Job continues or is cancelled with a pointer |
| Malicious comment from a stranger on the owner's issue | The repository is public [R1] | Workers read GitHub text only through `githerd_read`; the guard refuses comment-reading `gh` forms; pull requests touching workflows, hooks, the gate, `.npmrc`, `.claude/` or adding a dependency get a security review before merge | D; W `review` | n/a |
| A worker writes to GitHub as the owner and it looks like owner input | Workers share the owner's login | The guard refuses comments on items with open owner items, githerd labels, reopen; the guard's local log of worker writes lets the daemon attribute matching events to the worker | D | n/a |
| githerd's own clients and daemon run different versions | Protocol version in every request | Daemon serves the previous protocol while any older session lives; validation errors from a mismatch are not attempts | D | All sessions on the current protocol |
| Two hooks start two daemons from different worktrees | servherd entries named githerd [R18] | One fixed cwd for every start; strays removed | D | One entry |
| Crash loop on one odd payload | Start counter: 3 starts in 10 minutes | Boot into fatal mode with the last exception; ETags persisted so a restart costs 304s; statuses written only when they differ | D | A fixed version runs |
| The daemon inherits a stale Claude environment from pm2 | [R19] | Daemon and workers started with `env -i` and an allow-list; the self-test fails if a Pushover variable, or a `CLAUDE*` variable other than the ones Claude Code sets itself (listed by S18 in the plan), reaches a hook or the Bash tool | D | Self-test passes |
| A doorbell lands in a dialog (usage menu, plan approval, picker) | Pane capture | Ring only on a positive match of the empty prompt box with no dialog markers; text verified in the box before Enter, else cleared and recorded | D | n/a |
| A worker fans out subagents or browsers | Subagent transcripts; Chromium count in its process tree | Subagent growth is progress; Workflow tool denied; at most 2 concurrent subagents per worker (guard); browser launches refused at the machine cap | D | n/a |
| The owner's tmux server is killed | Workers live on their own socket `tmux -L githerd` [PF 2.2] | Unaffected; if the githerd socket dies, working jobs recover one at a time | D | n/a |
| Jobs waiting on each other in a cycle | The wait graph | A wait that closes a cycle is refused; any wait on a job is capped at 4 hours, then re-judged | D | n/a |
| An incident fix waits for a review slot | Review of an incident fix | Uses the urgent slot | D | n/a |
| Worker plugins that demand user interaction | A turn that ends with a question to the user | Generated worker settings disable such plugins [PF 10.1]; the job text says skills that ask the user are answered by the worker itself | D | n/a |
| Usage limit with no reset time while the owner is away | StopFailure `rate_limit` without a parseable time | Probe after 1 h, 3 h, 6 h with one canary incident worker; nothing else rung until it succeeds | D | A canary turn completes |

---

## 4. Architecture

### 4.1 The parts

| Part | What it is | Why it exists |
|---|---|---|
| **Daemon** | One Node process (standard library only) per machine, started through servherd with a fixed name and cwd. It polls GitHub and npm, classifies failures, keeps the job queue and every record, starts and ends workers in tmux, runs the push queue, and posts one status, `githerd/merge`, on every open pull request head into master. It never merges: Mergify does State lives in `~/.githerd/graphty-monorepo/`, outside the repository | Something has to watch when no session is looking, and something has to do the irreversible steps under one set of rules |
| **MCP server** | A stdio server registered for every session githerd starts and, through the repository's project settings, for owner sessions. Eleven tools (section 6). It forwards calls to the daemon over localhost HTTP, checks the daemon's `alive` file once a minute, and restarts the daemon when it is stale | Work is handed out through it, as the owner asked [OD 2], and every live session becomes a restarter |
| **Hooks** | One script, `githerd-hook`, run from the daemon-installed copy under `~/.githerd/graphty-monorepo/versions/<sha>/` (never from a worktree): SessionStart, UserPromptSubmit, Stop, StopFailure, Notification, PostToolUse (local file read only) and the PreToolUse guard for workers | Liveness, the Stop gate and hard rules come from the platform, not from the agent's memory [PA 2.14] |
| **CLI** | `githerd` in any terminal (section 11.2) | The owner controls githerd without a Claude session, and can read its state with the daemon down |
| **tmux server `githerd`** | A dedicated tmux socket (`tmux -L githerd`) holding one window per worker plus the board window. `githerd attach` attaches to it | Workers survive the owner killing his own tmux server, and the owner sees all of them in one place |
| **Reference worktree** | `.worktrees/githerd-ref`, detached at the green commit, installed and built, locked (section 4.9) | Local checks that must match CI need a real, installed tree |
| **GitHub** | The ruleset (pull requests only, merge commits, two required checks) [R2]; Mergify, which merges (4.6); `githerd/merge` status; `needs-decision` label; `intermittent` and `infrastructure` issues | Server-side gates catch what local guards miss |

How work flows:

1. The daemon polls (section 4.2). Changes become facts (4.3), failures go through the
   classifier (4.4), and facts become incidents, jobs and owner items (section 5).
2. While a slot is free and the machine is under its limits, the daemon prepares a worktree,
   opens a tmux window and starts `claude` with only "call githerd_next" as its prompt (7.1).
3. The worker calls `githerd_next`, gets its job and a snapshot of all work in flight (owner
   sessions' changed files included), judges overlap, and calls `githerd_claim` (8.2).
4. The worker edits, commits and calls `githerd_push`. The daemon runs the push with the pre-push
   gate, in priority order, and reports the result (4.8).
5. While CI runs, the worker calls `githerd_wait` and goes idle. The daemon watches the condition
   and rings the session when it changes (7.4, 7.5).
6. When the done-condition holds on GitHub, the daemon ends the session and removes the worktree.
7. The daemon posts `githerd/merge` on every open pull request head; Mergify merges the ones that
   carry `success` (4.6).

### 4.2 Polls

| Endpoint | When | Cost |
|---|---|---|
| `GET /repos/{r}/actions/runs?branch=master` (every workflow) | every 60 s, `If-None-Match` | 304 free [PF 1.5]; 1 call on change |
| `GET /repos/{r}/actions/runs?event=pull_request` | every 60 s, `If-None-Match` | same |
| `GET /repos/{r}/pulls?state=open` | every 60 s, `If-None-Match` | same |
| `GET /repos/{r}/issues?since=<high water - 10 min>&state=all` | every 60 s, `If-None-Match` | same |
| `GET /repos/{r}/issues/comments?since=<high water - 10 min>` | every 60 s, `If-None-Match` | same |
| Comments of each issue or pull request with an open owner item | every 60 s, `If-None-Match` | usually 304 |
| `GET /user` | every reconcile, `If-None-Match` | free when unchanged |
| `GET /advisories?ecosystem=npm&sort=updated` | every 60 s, `If-None-Match` [PF 9.4] | 304 free |
| Jobs and steps (step names carry the balance text) of a failed, cancelled or re-attempted run; `annotations_count` from its check runs; annotations only when the count is above 0 [PF 9.5] | once per such run | 1 to 3 calls |
| Job log | only when a failed step needs its text (classifier) | 1 call |
| Two `Set up job` logs (last green and first red) | once per new red key | 2 calls |
| Jobs list of an in-progress gating run (queue age) | while a gating job is queued past its pickup bound | 1 call per bound |
| A pull request's commits, files and single GET (`mergeable`) | when its head changes; the single GET again when master moves | 1 to 3 calls |
| Rulesets, repository settings | when master moves, `If-None-Match` | usually free |
| npm registry | after release runs, for new package names, during a 409, while a release is pending | not GitHub budget |
| githubstatus.com components | only while a platform-wide symptom is suspected [S27] | not GitHub budget |

ETags persist in `etags.json`, so a restart costs 304s, not a full re-read. It keeps the 200
most recently answered paths, because `since` paths change every poll. Every response's
`X-RateLimit-Remaining` is read; `GET /rate_limit` is never trusted [PF 1.5]. At zero remaining a
conditional request is refused with 403 like any other, so githerd is blind until
`X-RateLimit-Reset`; the reserve in 3.2 covers polls as well as holds [PF 9.3].

### 4.3 Facts the daemon computes

- **Lane verdict**: per workflow, the newest completed run on master by run id. A late sighting of
  an older run (1.4) is recorded but does not change the verdict.
- **Red since**: the first red run of the current red stretch.
- **Green commit** and **CI-green commit** (1.4).
- **Release truth**: npm's versions against master's tags and version commits [INC1 2].
- **Release pending**: a green commit that `nx release --dry-run` in the reference worktree says
  would publish [S31], not on npm 2 hours after its lanes went green. The dry-run runs after
  `node tools/release-hold.mjs apply`, as `release.yml` does, because nx itself ignores
  `release-hold.json`, and puts `nx.json` back afterwards; the answer is its per-project "New version <v> written to manifest" lines,
  none meaning nothing would publish (about 7 s on a warm machine).
- **Queue age**: per queued gating job (status `queued`, no `runner_name`; `started_at` is not null
  while queued), now minus `created_at`, against the worst pickup time ever seen on that runner
  label, seeded with 926 s for the rented label [PF 9.8].
- **Pull request facts**: author, base, draft, head, `mergeable`, files, commits (breaking marks),
  required check state, visual gate state, review record, stack chain (from `base.ref`), related
  pull requests (claim relations plus diff-file intersection).
- **Owner presence** (section 11.3).
- **Machine**: load, memory, Chromium processes per worker tree, gate processes.

### 4.4 The failure classifier

Every failure githerd sees goes through one ordered list, and the first class that matches wins:
failed jobs on master and on pull requests, release runs, cancelled lanes, worker-start probes,
the push queue's gate runs, install and audit runs in the reference worktree, and the findings
text of a worker's failed attempt. The inputs are the failed step name, the job log, the steps
list, the annotations, the exit code, the runner label and the pull request's file list.

| Order | Class | Matches | What follows |
|---|---|---|---|
| 1 | **Credential** | 401; "Bad credentials"; 403 with "auth" or "permission"; "Permission denied (publickey)"; OIDC 403; npm E401; gpg or ssh-keygen signing errors; StopFailure `authentication_failed` | One owner item per credential; no attempts charged; stop only what needs it |
| 2 | **Paid capacity** | "Insufficient balance"; "limited to 30 minutes"; "Concurrent runner limit reached"; runner loss ("received a shutdown signal" in the log, "lost communication" in an annotation, a failed job with no steps) on a rented label; StopFailure `billing_error` | One owner item; that lane parked for merges; the release waits; backoff re-dispatch (3.2) |
| 3 | **Outside or platform** | Third-party 5xx, ETIMEDOUT, ECONNRESET naming a remote host; registry or corepack errors; "Actions degraded"; queued past the pickup bound | One daemon re-run after 15 minutes, or a pause with a banner; never a fix job; no attempts charged |
| 4 | **Environment drift** | The `Set up job` and tool-version diff between the last green and first red run is non-empty; "automatically failed because it uses a deprecated version" | Incident with the diff attached; never a revert; never an intermittent issue |
| 5 | **Inherited** | The same key is red on master | Wait on the master incident |
| 6 | **Shared or master-side** | The same key on 1 or more other open pull requests within 6 hours (the second pull request); or the pull request's diff cannot affect the key (an audit key with no dependency file changed, the dependency files being `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `.npmrc`; a build key with no package source changed); or a local gate key that also fails on the green commit | One shared incident at the first such pull request; no `pr` job (and no "join" escape) |
| 7 | **Known intermittent** | An open `intermittent` issue names the key | One daemon re-run of that head |
| 8 | **Own** | Anything else | A `pr` job |

The patterns live in one table in code, with a fixture per pattern taken from the recorded logs
(`incidents/logs*` in the evidence set, and the jobs read in [PF 9.5] and [PF 9.6]). The classifier
reads each failed job's step names first, then its annotations, then its log, because each of
those texts appears in only one of the three; a job with no log answers the log endpoint with a
storage `BlobNotFound` document, which is "no log", not an error.

### 4.5 The master incident procedure

On the first sighting of a red gating run on master, classified "code" (classes 5 to 8 do not
apply on master; anything not in classes 1 to 4 is code):

1. **Merge hold** on the pull requests that lane can affect (4.6, line 2): `githerd/merge` turns
   `failure` on each, so Mergify drops them from its queue.
2. Fetch steps, annotations and the `Set up job` diff (4.2). A non-empty diff reclassifies the
   key as environment drift.
3. On the second sighting the incident record exists and is urgent. An `incident` worker starts
   in the urgent slot at once. In parallel, needing no Claude, the daemon:
   - re-runs the failing job on the red head, once per (head, key) [PF 9.7];
   - re-runs the same job of the last green commit's run (`gh run rerun --job <job id>`; `gh`
     refuses a run id together with `--job`), which tests the old commit in today's world: the run
     keeps its head sha and its `run_attempt` goes up by one [PF 9.7].
4. Outcomes:

| Red head re-run | Parent re-run | Merges between green and red | Meaning | The daemon does |
|---|---|---|---|---|
| passes | (any) | (any) | Intermittent | Files or updates the `intermittent` issue; the incident ends "intermittent" with that issue as its pointer; merges resume |
| fails | fails | (any) | The world changed under unchanged code | Incident fixes forward; no revert; the worker is told |
| fails | passes | exactly one | That merge broke it | Opens a revert pull request (GraphQL `revertPullRequest`) as the incident's fix, and a re-land job for the reverted change |
| fails | passes | none, or more than one | One of these broke it (with none, only commits that merged no pull request, such as release commits, lie between green and red, so a revert has nothing safe to name) | Incident fixes forward with the suspect list |

5. **Done**: the failing workflow's newest master run is green at a commit containing the
   recorded fix (the revert's or fix pull request's merge commit). An intermittent incident is done
   when the re-run is green; its issue continues as ordinary work.

Workers cannot re-run or dispatch workflows (guard); they ask with `githerd_rerun`, which the
daemon grants once per (head, key) and refuses for paid lanes beyond that.

### 4.6 The merge gate and stacks

**Mergify merges; githerd never does.** The owner chose Mergify to merge pull requests
(`.mergify.yml` on master since pull request #777 merged on 2026-10-03 [R3]). Mergify queues every
non-draft pull request into master that has no conflict, no `hold` label and no `!` in its title,
updates it from master by merge, and merges it once `All Checks Pass` and `Lint PR Title` succeed,
one pull request at a time, checked in place on its own branch. githerd adds only what Mergify
cannot know: whether a red lane, an owner item, a missing review or a release risk makes this pull
request unsafe right now. It says so with one commit status, `githerd/merge`, on the head of every
open pull request into master, and the coordination change below makes Mergify require it.

**The status.**

| State | When | What Mergify does with it (after the coordination change) |
|---|---|---|
| `success` | Every line of the decision below holds | Queues it (if its other conditions hold) and may merge it |
| `failure`, description = the first failing line ("held: GPU lane red since 14:02 and this pull request touches a benchmark group") | A line fails | The queue rule stops matching, so the pull request leaves the queue instead of blocking the one-at-a-time queue; when githerd posts `success`, the rule matches again and Mergify queues it again |
| `pending` "githerd is evaluating" | No line fails, but a fact about this head is not read yet: its commits, its files, npm's answer for an added package, the patch id or the release dry-run (at most one reconcile). A failing line wins over `pending` | Stays queued but cannot merge. Never used for a hold, because a pending pull request at the front of the queue blocks every one behind it |
| no status | A head githerd has not seen yet: Mergify just merged master into it, or githerd is down | Stays queued but cannot merge until githerd posts |

githerd posts on every new head within one reconcile (the merge commits Mergify's updates create
included), and otherwise only when the state or the description changes. A red lane therefore
costs one write per affected open pull request when it turns red and one when it turns green; with
the usual 10 to 30 open pull requests that is well inside the budget.

**The decision.** Every line must hold:

1. The author is the owner (the `gh` login). Mergify does not look at the author.
2. **No hold applies**: no code-red gating lane that can affect it (every pull request for CI; for
   GPU those touching `webgpu-graph-algorithms/src/`, since `scripts/bench-groups.js` maps every
   file there to at least one group [R8], or the lane's scripts: `webgpu-graph-algorithms/scripts/`,
   `webgpu-graph-algorithms/benchmarks/` and `.github/workflows/gpu.yml`; for Hosts those
   matching the `paths` filter of `hosts.yml` [R9]), except the pull request recorded as that incident's fix
   or revert; not "release job running" if it changes release inputs; no `freeze-merges` policy;
   no starvation hold (4.7).
3. If any commit on the head is breaking (`!` or a `BREAKING CHANGE` footer; unreadable counts as
   breaking), the title carries `!` too, so Mergify's title rule holds it. Mergify's rule is the
   hold; this line only closes the gap of a breaking commit under a non-breaking title.
4. No package it adds is unknown to npm.
5. No `needs-decision` label, and no open owner item on it.
6. If a githerd job made it: a review passed on its current patch id, computed against the merge
   base and excluding `visual-baselines/**`, so neither a merge from master nor the owner's Finish
   commit needs a second review. If it touches `.github/workflows/`, `.husky/`,
   `tools/prepush.sh`, `.npmrc`, `.claude/`, `githerd/` or adds a dependency: a security review
   passed. If a worker pushed changes under `githerd/` or `.claude/`: "needs owner session".
7. If it changes release inputs: the daemon's release dry-run on the reference worktree merged
   with the head shows no major outside an approved group and no 0.x package going to 1.0.0.
8. If it came from an `issue` job: the job acknowledged the issue's current revision.

"Release inputs" (lines 2 and 7) are what `nx release` reads: the directory of every published
package, `nx.json`, `release-hold.json`, `tools/release-hold.mjs`, `tools/changelog-renderer.cjs`
and `.github/workflows/release.yml`.

Not in the decision, because Mergify already does it: the required checks and `mergeable` (its
merge conditions and `-conflict`), the `hold` label, the `!` title, queue order, updating from
master, and the combined test of two related pull requests (Mergify merges master into each pull
request and waits for its checks on that head, so whatever merged first is in the tested base).

**Native auto-merge** is disarmed wherever githerd finds it: GitHub's own auto-merge merges on the
ruleset's two checks alone and would bypass `githerd/merge`. Mergify does not use it.

**When githerd is down**, statuses already posted stay. A head Mergify updates while githerd is
down has no status and waits. A pull request that already carries `success` and is already up to
date with master can still merge onto a master that turned red meanwhile (section 10.3). The owner
can always merge by hand, because `githerd/merge` is not in the ruleset.

**Coordination change to `.mergify.yml`** (owned by another session; githerd's plan carries it as
a coordination task and never edits the file). Add one merge condition and one queue condition:

```yaml
queue_rules:
    - name: default
      batch_size: 1
      update_method: merge
      merge_method: merge
      merge_conditions:
          - check-success=All Checks Pass
          - check-success=Lint PR Title
          - check-success=githerd/merge          # new: githerd says it is safe on this head

pull_request_rules:
    - name: queue ready, non-breaking pull requests into master
      conditions:
          - base=master
          - -draft
          - -conflict
          - label!=hold
          - "-title~=^[a-z]+(\\([^)]*\\))?!:"
          - -check-failure=githerd/merge         # new: a held pull request leaves the queue
      actions:
          queue:
              name: default
```

Why both: `check-success` in the merge conditions makes "no status yet" and `pending` wait instead
of merging; `-check-failure` in the queue rule (rather than `check-success`) lets a freshly updated
head with no status stay queued, so Mergify's own update does not dequeue it, while a hold removes
it from the queue. The change lands only after githerd's `statuses` write group has posted on
every open pull request for a day (milestone 8), and its pull request description says how to
undo it: delete the two lines. Verify after it lands, with a docs-only pull request: a `failure`
removes it from Mergify's queue, a later `success` re-queues it, and a head with no status is not
merged. Until it lands, the invariant check shows the banner "Mergify does not wait for
githerd/merge".

**Updates** githerd still makes, each with the expected head, in order of preference:

- baseline-only conflict with master: `visual-review update <pr>` [R13], run only while master's
  tip is the CI-green commit, because the tool always merges master's tip; otherwise the update
  waits for the next reconcile. The tool merges only master, so a stacked child's baseline-only
  conflict with its base pull request is a `pr` job's, like any other conflict;
- master's tip is the CI-green commit: `PUT /pulls/{n}/update-branch` with `expected_head_sha`, which works while
  `allow_update_branch` is false and answers 422 on a stale head [PF 9.1];
- otherwise: the daemon merges the CI-green commit into the pull request in a daemon worktree and
  pushes through the push queue, gate included.

Only for a reason Mergify does not cover: its failing key was fixed on master (so CI re-runs on a
base with the fix), its stack base moved, or it was unparked. Mergify updates a pull request
when it reaches the front of its queue, so githerd never updates one just to merge it.

**Stacks.** Mergify queues only pull requests based on master, so a stacked child is never queued
until its base merged and it was retargeted, and nothing retargets it for us. The daemon builds each
chain from `base.ref`. A base whose head changed queues an update of each child in order. A merged
base makes the daemon retarget each child with `PATCH /pulls/{n}` `base=master` [PF 9.2], because
`delete_branch_on_merge` is false and GitHub will not [R1]; from then on Mergify treats the child
like any other pull request. A retarget starts no CI (it is the `edited` action, which no workflow
listens to), so the child keeps green checks computed against its old base. That is safe only
because Mergify updates a pull request that is behind master before it checks it, and a retargeted
child is always behind (master gained its base's merge commit), so the update runs CI on the new
base. githerd never deletes a base branch to make GitHub retarget: deleting it through the API
closes every pull request based on it [PF 9.2]. A stacked job blocks until its base pull request is merged (a GitHub
fact, not the base job's state). Children are left off the owner's review list until their base's
gate is green.

### 4.7 Release truth and starvation

After every release run and on every start: tags on master (`git ls-remote`, local), npm versions
(npm GETs), and master's version commits. A tag without a version, or a version without its
commit, is a release incident. After each release run its gate notices are read [PF 9.5]; "no longer
holds" its builds makes the daemon re-run CI on that commit [R6], [R7]. Release pending (4.3) opens
a release incident only for a commit that would publish.

Starvation: if the green commit is older than 6 hours while merges continue and every gating lane
is progressing, merges pause until the slowest lane completes on master's head. A lane that is not
progressing (queued past its bound, balance, outage) never causes a starvation hold.

### 4.8 The push queue

Workers never run `git push` (the guard refuses it). They call `githerd_push`. The daemon:

1. checks the claim, the branch, that news is acknowledged, and the credential state;
2. puts the push in its queue: incident fixes first, then pushes that finish a job, then the rest;
3. runs `git -C <worktree> push origin HEAD:refs/heads/<branch>` as its own tracked child
   process, with the normal hooks (never `--no-verify`), so the pre-push gate runs exactly as for
   a person. Pushing an explicit refspec from a detached worktree means no branch is ever checked
   out twice;
4. records the gate's output; a failure is classified (4.4) with a local failure key;
5. sets the job's wait to `push` while queued and running, so the worker is idle, not working;
6. rings the worker with the result.

The pre-push gate takes a machine-wide `flock` itself (a plan task changes `tools/prepush.sh`,
because today it takes none [R11], [R12]); owner sessions wait on the same lock. The kernel
releases it only when every process holding its descriptor is gone, and every step a shell starts
inherits it, so the gate runs its background SonarQube step (its own process group) with the
descriptor closed, and the daemon starts each push in its own process group and kills the group
[S24]. Holder and waiters are read from `/proc/<pid>/fdinfo` of the processes that have the lock
file open (the holder's has a `lock:` line, a waiter's none), with the holder's sidecar file for
its name; `/proc/locks` is not used, because it hides a lock whose `flock` process has exited,
which is how a script takes it [S24]. Every worktree already shares the main checkout's Nx cache:
Nx 22.7 resolves the cache directory to the main worktree's `.nx/cache` on its own, so a fresh
worktree's first gate is not a cold build [S23]. `NX_CACHE_DIRECTORY` is never set: with it, Nx
reported cache hits and restored no output [S23]. A push is bounded at twice the gate's measured
duration.

Because the daemon runs the push, the permission classifier never judges it, a worker's death does
not kill it, and its queue position is real.

### 4.9 The reference worktree

`.worktrees/githerd-ref`, locked with `git worktree lock`. When the green commit moves, the daemon
switches it detached to the new commit, runs `pnpm install --frozen-lockfile` and the Nx build. It
is used for: the audit exactly as `ci.yml` runs it [R5]; commitlint on titles; the release
dry-run (for a pull request: a local, signed merge commit that is never pushed, then the
dry-run); running the gate once on the green commit to tell a shared local failure from a job's own.
Any failure in it is a platform fault (class 3), never a verdict on a pull request.

### 4.10 Hooks

The committed project settings register the MCP server and the hooks for owner sessions; workers
get them through their generated `--settings` file, so they never depend on which branch committed
what [R15]. Every hook command points at `~/.githerd/graphty-monorepo/current/bin/githerd-hook`,
the daemon-installed copy of master's githerd, so a worktree's edits cannot change its own gate.

Hooks answer from the daemon's cache only and never make a network call. The daemon gets 2 s; on
no answer the hook spools the event to `spool/`, checks `alive` (restart only if it is stale and
the lock's pid is dead, under the restart lock), prints one line, and exits 0. A hook never
blocks an owner session because githerd is broken; a Stop gate that fails open is counted and
shown ("Stop gate unreachable: N stops allowed unchecked").

| Event | Daemon does | Prints |
|---|---|---|
| SessionStart startup | Registers the session; links a worker to its job; checks the model | One status line with banners and faults first |
| SessionStart resume | Relinks | The job's news |
| SessionStart compact | Counts the compaction | The job record again [PF 10.4] |
| UserPromptSubmit | In a worker: nonce, doorbell delivered; the launch prompt or a prompt starting `<task-notification>` (a background task's completion notice, which arrives here too [PF 10.3]), nothing; anything else, steered | Nothing |
| Stop | The Stop gate (7.3); claim comparison for any session | Block with reason, or a one-line note |
| StopFailure | Section 8.3 | Nothing |
| Notification `permission_prompt` | Records it; the watchdog confirms with a pane capture | Nothing |
| PostToolUse (workers) | No daemon call: reads `jobs/<id>/news` and returns it as `additionalContext` if unacknowledged [PF 10.5] | The news |
| PreToolUse guard (workers) | Fixed refusals locally (section 10.1); claim checks fail closed | Refusal with the allowed alternative |

### 4.11 githerd's GitHub identity

The daemon uses the owner's `gh` token (owner's decision 2 in 12.3: no separate GitHub App for
now), with the tiers in 3.2, and keeps its last 300 calls for its own holds and polls (at zero even a 304 poll is refused [PF 9.3]). Its statuses show as
the owner. `gh`'s login stays the definition of "the owner" and is checked every reconcile. The token-expiration header is read on every response; an item is raised 7 days ahead.
The owner's token is an OAuth token and sends no such header today [PF 9.9].

---

## 5. Job model and lifecycle

### 5.1 Kinds

A kind exists only if GitHub or the machine can check its done-condition.

| Kind | Made when | Target | Done-condition, checked by the daemon |
|---|---|---|---|
| `incident` | A code-red key on master (4.5); a shared or master-side key (4.4); a release half-state or a real pending release; a visual coverage gap on master; a required check that never reports; a matched advisory failing the audit; a red non-gating master workflow (low priority); a shared local gate key | one key or one named condition | Master: the failing workflow's newest master run is green at a commit containing the recorded fix. Shared: the key passes on master's fix and on one canary pull request updated and green. Release: npm has the tagged versions and master the version commit. Local: the gate passes on the green commit |
| `pr` | An own failure; a conflict the tools cannot resolve; an owner's visual reject [R14]; an abandoned githerd pull request | one pull request | Required checks green on the current head (base master, not draft), or waiting only on the owner (visual review, owner item) |
| `issue` | A labelled, unclaimed issue at the front of the queue; a re-land after a revert; an `intermittent` issue; an audit ignore to remove | one issue or a triage group | A pull request referencing the issue, base master, not draft, whose head equals `git ls-remote` of its branch, required checks green or waiting only on the owner, and `githerd/merge` not pending for a reason the worker can fix. Or closed through the propose, confirm and grace path, or split into filed children. Every listed defect has an issue or commit |
| `triage` | New or changed issues (20 per job); a refresh after 20 merges; a full pass after 100 merges | a batch | Each issue has one type, priority and effort label from the existing set and a recorded verdict |
| `review` | A githerd pull request has a new patch id; a sensitive-path pull request (4.6 line 6) | one diff | A verdict for that patch id |
| `title` | A title commitlint rejects for length or scope, when the session that made the pull request is not open | one pull request title | `Lint PR Title` green. No worktree |
| `major` | The owner answers "ship" on a major group | one package's held breaking pull requests | One pull request with the group merged and npm shows the new major |

A pull request that changes githerd's own config, hooks or worker instructions is never a worker's
`pr` job; it is listed for the owner's sessions.

**The review rubric** (in the review job's text, enforced by the verdict schema):

- `pass`; `loosened` (a test, limit or threshold weakened); `breaking-unmarked`;
  `does-not-address` (the diff does not do what the issue or job asked); `security` (a network
  fetch, secret use or new external host in a sensitive path, or a new dependency without reason);
  `other` (hold with notes for the owner's sessions).
- Allowed and not loosening: an audit ignore with a reason and a dated review; a benchmark floor
  changed to the measured noise band of 10 or more recorded samples of that row on the same runner
  class.

### 5.2 The job record

```
{ id: "incident-ci-build-security-audit" | "pr-412" | "issue-737" | ...,
  kind, target, priority, reason,                 // reason: one line, why it is where it is
  state, stateSince, deadline, deadlineAction,
  holder: { session, pid, startTime, window, socket: "githerd", startedBy } | null,
  attempts: [{ session, startedAt, endedAt, outcome, findings, theory }],
  deaths: [{ at, capture }],                      // session deaths, counted per job (3.5)
  claim: { session, plan, overlap: { decision, with, reason }, related: [jobId], at,
           issueRevision: { bodyHash, labels, state } },
  news: [{ at, text, acked }],
  sessions: [sessionId...],
  worktree, branch, pr, pushedHead, salvage: [branch...],
  waitingFor: null | { checks: sha } | { lane: name } | { release: sha } | { job: id, until }
            | { push: queueId } | { owner: item } | { local: taskId } | { github: since },
  expect: null | { until, reason },
  steeredAt, kept, order, budget: { workingMinutes, attempts },
  clock: null | { budgetMs, usedMs, at }, pausedBy: [pause...],  // a paused deadline keeps its
                                                  // used time; `deadline` is null while paused
  faults, verifyFailures, verifyPolls,            // counted faults; failed verifications in a
                                                  // row; polls in `verifying` with no answer
  joined: [target...], cancelledBy, fresh, evidenceFirst,
  facts: { since, scope, bug, order, labels, next, skip, storybook } }  // what 5.4 orders by
```

### 5.3 States, deadlines and pauses

Every deadline pauses while any of these holds, and the pause is on the board: githerd's view is
unknown; a usage stop (8.3); "Actions degraded" (CI waits only); machine load above the start limit
(starting and preparation deadlines only); the job is steered or parked; `githerd pause`.

| State | Meaning | Leaves when | Deadline and what follows |
|---|---|---|---|
| `queued` | Waiting for a slot | Admitted -> `starting`; an owner session claims it -> `starting`, then on as for any claim; target closed -> `cancelled` | None; age and the gate holding it are on the board |
| `blocked` | Waiting on another job, an incident, or a stack base to merge | Blocker ends -> `queued`; third session death -> `faulted` | Capped at 4 hours, then re-judged by its worker or requeued with the news; a wait that would close a cycle is refused |
| `starting` | Worktree prepared, window open, waiting for `githerd_next` and `githerd_claim` | Claim -> `working`; join -> `cancelled`; wait -> `blocked` | Worktree 20 min -> `faulted`. Registry 30 s -> start failure. First call 3 min -> start failure, `queued` |
| `working` | Doing the job | `githerd_wait` or `githerd_push` -> `waiting`; `githerd_ask_owner` or a permission prompt -> `parked`; `githerd_done` -> `verifying` | 4 h working time with no GitHub change (2 h for incidents) -> attempt ends with findings |
| `waiting` | A declared condition: checks on a head, a lane, a release, a job, a push, a local background task, or GitHub itself. The session is idle and open; a waiting job whose session died stays waiting with none | Condition changes -> doorbell -> `working`; done holds -> `done`; third session death -> `faulted` | Checks not started in 10 min -> doorbell. Running past twice their median -> doorbell. Local task output not growing for 20 min -> doorbell. Push bounded at twice the gate's duration |
| `parked` | Waiting on an owner item; session ended unless a permission prompt keeps the window open for the owner | Owner answers -> `working` (resumed or fresh); answer was "not yet" -> `parked` on the same item, no page; third session death -> `faulted` | None for the job; the invariant check requires the item to be open |
| `verifying` | `githerd_done` received | Holds -> `done`; does not -> `working` with what is missing; only CI pending -> `waiting`; third session death -> `faulted` | Two polls |
| `done` | Verified | Terminal | Session ended, servers stopped, worktree unlocked and removed once its pull request closes |
| `failed` | Attempt or time budget spent | Terminal | Urgent: one owner item with findings. Others: board |
| `cancelled` | Superseded, joined, duplicate, target closed or merged by someone else | Terminal, with a pointer; unpushed commits salvaged first | n/a |
| `faulted` | githerd could not start it (worktree, platform, three session deaths) | Fault clears -> `queued` | 3 faults -> `failed`. Faults during a platform fault or above the load limit are not counted |

Budgets: 3 attempts per job, counted per job, never reset by a head change. An attempt ends when
its session is recycled fresh, the worker reports `failed`, or a claimed done fails to verify three
times in a row. After two failed attempts on the same key the next is a fresh, evidence-first
attempt given the old theories. Session deaths are not attempts, but a third death makes the job
`faulted`.

### 5.4 Queue order

Finish before starting:

1. `incident` on master or release, then shared incidents; oldest red first.
2. `review` (an incident fix's review uses the urgent slot).
3. `pr`, oldest pull request first; a stacked one blocks until its base merges.
4. `title`.
5. `triage` of new issues.
6. `major` jobs the owner approved.
7. `issue`: issues in an open order first; then priority (critical, high, medium, low), bug before
   other types, oldest first [OD 4]. Skipped: `blocked`, `needs-decision`, `research`, an open
   owner item; and, while the review queue is at its limit, issues whose claimed packages have a
   Storybook.
8. `triage` refresh and full passes; low-priority incidents on non-gating workflows.

`githerd:next` and `githerd:skip` move an item, honored only when the owner's account added the
label and no worker write matches the event (10.1). Each item carries its one-line reason.

### 5.5 Recycling and continuation

A session is recycled when: it died; it made no progress past the bound (7.5); two doorbells
brought no progress; its transcript's last record ends the session (budget, context); it compacted
3 times in this job; or it lived 12 hours. A cause outside the conversation (death, API overload)
resumes when the self-test [PF 10.2] verified resume on the running Claude Code version; a cause in the conversation
(stall, wrong theory, budget, compactions) starts fresh with the findings. Any resume failure
starts fresh. A session is ended only while idle or waiting, except for a stall.

### 5.6 Owner items

Created only by `githerd_ask_owner` (kinds: one-way door, visual, money, credential, login, system
change, permission rule) or by the daemon for fixed causes: credential, paid capacity, lane not
progressing, first npm publish, changed `gh` login, a published version outside the plan, a major
group, a failed urgent job, a certificate or token about to expire, a worker spending extra usage.
Each item states the question, the options and what each costs to undo. It lives on the issue or
pull request it concerns (a comment plus `needs-decision`), otherwise on the board. It is paged
once when actionable (several within 10 minutes are one page), again only when its text changes,
and folded into the daily digest while the owner is absent unless it blocks every worker start or
the release. It ends when the owner comments, runs `githerd answer`, answers in a session through
`githerd_record`, removes the label, or the condition clears by itself.

### 5.7 Orders and policies

Recorded through `githerd_record` or `githerd order` / `githerd policy`; kept in state and the
ledger; on the board and every start line. An order fixes its issue list when recorded. Policy
switches the daemon enforces: `freeze-merges`, `park-gate <lane or service>`, `hold-package <name>`.
Free-text policy is added to every worker's job text and re-added after compaction.

---

## 6. MCP tools

The MCP server identifies its session from the SessionStart hook's `session_id`, then from the
registry file named by its parent pid, accepted only if the file's pid matches and that process
started before the file's `startedAt` [PF 2.2]. Workers also carry `GITHERD_JOB`. Every call
carries a protocol version (9.8). Arguments are validated against these schemas; a refused call
has no partial effect and says why. Every result starts with active banners and faults.

Every tool answers within seconds and none blocks. Claude Code moves an MCP call still running
after 120 s to the background and ends the turn; `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=0` lets one
call hold the turn for at least 7 minutes with no progress messages (the MCP spike in the plan), but
a held turn also queues whatever the owner types, so waits stay declared with `githerd_wait` and
end with the doorbell.

```jsonc
// 1. The board. Any session.
githerd_status: { section?: "all"|"owner"|"master"|"release"|"prs"|"jobs"|"sessions"|"health",
                  pr?: integer }

// 2. My job (workers), or what could be taken (owner sessions).
githerd_next: {}
// -> { job: JobRecord|null, offered?: JobRecord[],
//      snapshot: { version: integer,
//                  inFlight: [{ job, target, plan, holderWindow, pr, changedFiles: string[] }],
//                  ownerSessions: [{ name, cwd, branch, changedFiles: string[] }] },
//      news?: string[], load: { loadavg, cores }, instructions: string }

// 3. Claim, with the overlap judgment. Before any edit.
githerd_claim: { job: string, snapshotVersion: integer,
                 overlap: { decision: "independent"|"join"|"wait", with?: string, reason: string /*<=500*/ },
                 related?: string[], plan: string /*<=1000*/ }
// -> { ok: true, job } | { ok: false, reason, snapshot }   // stale snapshot or a wait cycle

// 4. Declare a wait. The daemon watches it and rings the session when it changes.
githerd_wait: { job: string, for: "checks"|"lane"|"release"|"job"|"local",
                target: string, reason: string /*<=300*/ }
// "local" names a background task the session started; its output file growth is progress.
// -> { ok: true, until } | { ok: false, reason }            // refused if already settled

// 5. Declare a long step (up to 3 hours) so the watchdog does not recycle it.
githerd_expect: { job: string, minutes: integer /*1..180*/, reason: string /*<=300*/ }

// 6. Push the job's branch through the daemon's queue and the pre-push gate.
githerd_push: { job: string, branch: string, expectHead: string /*40 hex, the local HEAD*/ }
// -> { queued: true, position, estimateMinutes } | { ok: false, reason }
//    reason: no claim, unacknowledged news, wrong branch, credential blocked.
//    The result arrives as news and a doorbell: pushed <sha> | gate failed <key> (classified).

// 7. Ask for one re-run of a failed job. Granted once per (head, key); never for paid lanes beyond that.
githerd_rerun: { job: string, run: integer, jobId: integer, reason: string /*<=300*/ }

// 8. Read GitHub text, filtered to the owner's account.
githerd_read: { issue?: integer, pr?: integer, include?: ("body"|"comments"|"reviews"|"files")[] }
// -> the body and only comments and reviews written by the gh login; edits by other accounts
//    stripped; other-account items counted, not shown.

// 9. Report the end of an attempt. Verified before it is accepted.
githerd_done: { job: string, outcome: "done"|"split"|"not-needed"|"failed",
                pr?: integer, pushedHead?: string /*40 hex*/,
                findings: string /*<=4000*/, theory?: string,
                defects: [{ summary: string, issue?: integer, commit?: string }],
                children?: integer[], evidence?: string,
                result?: TriageResult | ReviewResult }
// TriageResult: [{ issue, labels: { type, priority, effort }, verdict: "keep"|"duplicate"|"obsolete"|"fixed",
//                  of?, evidence?, group? }]
// ReviewResult: { verdict: "pass"|"loosened"|"breaking-unmarked"|"does-not-address"|"security"|"other",
//                 patchId, notes }
// "not-needed" goes through the same propose, confirm and grace path as an obsolete issue.
// A pushedHead that is an ancestor of GitHub's head is accepted when every later commit is a
// merge from master made by the daemon or the review tool.
// -> { verified: true } | { verified: false, missing: string[] }

// 10. Ask the owner. Only for what only the owner can do.
githerd_ask_owner: { job: string,
                     kind: "one-way-door"|"visual"|"money"|"credential"|"login"|"system"|"permission-rule",
                     question: string, options: [{ choice: string, undoCost: string }], target?: integer }
// -> { item: string, parked: true }
// A second call on a job parked on an open item returns that item: no new item, no page.

// 11. Record what the owner said in this session.
githerd_record: { kind: "order"|"policy"|"answer", text: string, issues?: integer[],
                  switch?: "freeze-merges"|"park-gate"|"hold-package", value?: string, item?: string }
// Refused from a worker unless the owner steered it in the last 30 minutes.
```

There is no tool to merge, close, revert, retarget, post a status, or touch githerd's labels.

---

## 7. Worker sessions

### 7.1 Starting one

Workers are prepared in parallel and started one at a time; only the span from `githerd_next` to
`githerd_claim` is serialized, and an incident skips that line.

1. **Preconditions**: a free slot (8.1); load and memory under the limits; no usage stop; the
   signing probe passes (`git commit-tree -S` in a scratch repository with the worker's exact
   environment, 6 ms [S28]);
   `claude --version` equals the self-tested version.
2. **Worktree**: `.worktrees/githerd-<job>`, detached at the green commit for new work or at the
   pull request's head for `pr` and `review` jobs; never a branch checkout, so a branch the owner
   has checked out elsewhere is never a conflict. `git worktree lock --reason "githerd job <id>"`.
   `pnpm install --frozen-lockfile`, `pnpm exec nx run-many -t build` with the shared Nx cache, a
   check that every built package's `dist` exists (with `NX_CACHE_DIRECTORY` inherited from
   anywhere, a cache hit reported success with no output [S23]), and one package's smoke test. A failure is `faulted`, never a session. A `pr` job whose pull request
   branch is checked out in any worktree with uncommitted changes or unpushed commits, live session
   or not, does not start; the board names that worktree.
3. **Generated files** under `~/.githerd/graphty-monorepo/jobs/<id>/`: `settings.json`,
   `mcp.json`, `news`. Nothing in `~/.claude` is written.
4. **Window**, on the githerd tmux server, created if missing (`tmux -L githerd has-session -t
   githerd || tmux -L githerd new-session -d -s githerd`):

   ```
   tmux -L githerd new-window -d -t githerd -n <job> -c <worktree> \
     env -i HOME=$HOME USER=$USER LANG=$LANG TERM=xterm-256color PATH=<login shell PATH> \
            SSH_AUTH_SOCK=$SSH_AUTH_SOCK <the GIT_CONFIG_* signing variables> \
            GITHERD_JOB=<id> GITHERD_NONCE=<nonce> \
     claude --model <opus-5.5 or fable> -n githerd-<job> --permission-mode default \
            --settings <jobs/id>/settings.json --mcp-config <jobs/id>/mcp.json \
            "You are a githerd worker. Call githerd_next for your job. Decide reversible
             questions yourself and say why; ask the owner only through githerd_ask_owner."
   ```

   `env -i` keeps the stale Claude variables and the Pushover keys that servherd's pm2 carries
   [R19] out of the worker. Verified (S18 in the plan): under `env -i`, neither a hook nor the Bash
   tool sees a Pushover variable (the Bash tool's shell snapshot does not bring `~/.bashrc`'s
   exports back), so the owner's own Stop and Notification hooks, which still run in a worker,
   cannot page from it. Claude Code sets about ten `CLAUDE*` variables of its own in every hook and
   Bash process; the self-test allows exactly those.

   Commits are signed with the owner's SSH signing key, which his user settings select for every
   Claude session through `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_n` and `GIT_CONFIG_VALUE_n`
   (`gpg.format=ssh`, `user.signingkey`). The daemon reads those variables from his user settings
   and puts them on this line and on its own git commands (the signing probe, `visual-review
   update`, the reference worktree's merges). Without them git falls back to his gpg key, whose
   pinentry cannot run without a terminal: verified, the probe fails with "Inappropriate ioctl for
   device" and leaves a `gpg-agent` behind (S28 in the plan). No `GPG_TTY` is passed.

   The rule "decide reversible questions yourself" is in the launch prompt, because the launch
   prompt counts as the user's words: Opus 5.5 obeys a Stop-hook reason that agrees with the user,
   but refuses one that contradicts an explicit instruction from the user (S13 in the plan).
5. **Registry** entry within 30 s [PF 2.2]; otherwise the pane is captured and it is a start
   failure. The SessionStart hook links the session and checks the model.
6. **First call**: `githerd_next` returns the job: target, done-condition in plain words, earlier
   findings, policies, news, the machine load, and the standing rules: answer questions without
   acting on them; a message about another job gets "this is the worker for <job>"; decide
   reversible things and record why; never write `ACTION NEEDED`; ask the owner only through
   `githerd_ask_owner`; push only through `githerd_push`; wait through `githerd_wait`; skills that
   ask the user a question are answered by you.

### 7.2 Worker settings

The generated `settings.json` merges with the owner's user settings, and its denies win over his
allow-all [PF 10.1]. The main checkout's `.claude/settings.local.json` applies in every worktree too
[PF 10], so everything that matters is set here or on the command line:

- **Permission mode** `default`, explicitly, never auto: the owner's settings allow all of Bash,
  Edit and Write [PF 2.2], so routine actions are deterministic and the auto-mode classifier,
  which carries another repository's environment text [R22], is not consulted.
- **Allow**: `mcp__githerd__*`, `Bash(gh pr create:*)`, `Bash(gh pr edit:*)`, plus the runtime
  allow overlay the owner grows with `githerd answer <item> allow`.
- **Deny**: tools `AskUserQuestion` and `Workflow`; `Edit(...)` rules (which cover Write too;
  `Write(...)` rules are ignored [PF 10]) for `visual-baselines/`, `githerd/`, `.claude/`,
  `.github/workflows/`, `.husky/`, `tools/prepush.sh` and `~/.githerd/`.
- **Plugins** that demand interaction with the user are turned off through `enabledPlugins` [PF 10.1].
- **Prompt suggestions** off (`promptSuggestionEnabled: false`): a suggestion is ghost text in the
  input box that a plain pane capture cannot tell from the owner's unsent text [PF 10.9].
- **Hooks**: every hook of 4.10, including the PreToolUse guard on Bash, Edit, Write and Agent.

### 7.3 The Stop gate

Every time a worker's turn ends, the Stop hook asks the daemon, which answers from its cache:

| At the stop | Answer |
|---|---|
| Steered by the owner | Allow, silently |
| Done-condition holds | Allow; the daemon ends the session |
| `waiting`, or `parked`, or claim "wait" | Allow |
| GitHub unknown | Allow, with "GitHub unreachable since <t>; githerd will ring you; do not retry or work around it"; an implicit wait on GitHub |
| `background_tasks` in the Stop input is not empty [PF 3.1], [PF 10.10] | Allow; the job waits on a local task; its output growth is progress (each entry has an id but no path; the output is `/tmp/claude-<uid>/<cwd slug>/<sessionId>/tasks/<id>.output`) |
| `stop_hook_active` is true | Allow; the watchdog takes over [PF 3.1] |
| The last message asks the owner something or has `ACTION NEEDED`, and no `githerd_ask_owner` call was made | Block once: "decide this yourself and record why, or call githerd_ask_owner if it is owner-only" |
| Anything else | Block once with what GitHub still shows missing, and the four ways forward: continue, `githerd_wait`, `githerd_ask_owner`, `githerd_done` with `failed` |

One block per turn keeps far below the platform's cap of 9 [PF 3.2]. Opus 5.5 obeys a block
reason when nothing the user said contradicts it, and refuses one that contradicts an explicit user
instruction, saying so in its reply (S13 in the plan). So the gate's reasons only restate rules
the launch prompt already gave as the user's (7.1), and a steered session, where the owner's words
may say otherwise, is never blocked. A refusal is visible in `last_assistant_message` at the next
stop; the gate does not block twice, and the watchdog takes over. A turn the user interrupts with
Escape ends without any Stop hook call (observed in S13), so an Escape sent by the watchdog is
always followed by a doorbell, never by an expected Stop.

### 7.4 Waiting

A worker that pushed or waits on CI declares it and ends its turn. The session stays open and
idle, costs nothing and keeps its context. At most 6 sessions wait at once; past that the oldest
waiting session is ended and its job continues later by resume [PF 10.2] or fresh with findings.
`parked` jobs end their session, except a permission prompt, whose window stays for the owner.

### 7.5 Watchdog and doorbell

While at least one worker exists, one local check runs every 60 s (local files, `/proc` and tmux
only; it stops when the last worker ends).

- **Alive**: pid with its recorded start time, or listed by `claude agents --json` [PF 2.2].
- **Progress**: transcript growth, including the session's subagent transcripts; CPU time of the
  session's descendant processes, never of the claude process itself, which spends CPU redrawing
  while its command hangs [PF 10.7]; output growth of a declared local task; a push in the queue; a `githerd_expect`
  window.
- **Before any key is sent**, the pane is captured and matched against known screens: the empty
  prompt box; the permission dialog ("Do you want to proceed?", numbered options; from a subagent it is
  headed "from the <type> agent") [PF 2.2, 10.6]; the plan approval dialog ("Ready to code?", "Would
  you like to proceed?"; the registry says `permission prompt` for it too) [PF 10.9]; pickers ("Enter to select",
  registry `waiting` with `input needed`); the usage-limit screen [S19]. Only the empty prompt box
  with no dialog marker allows typing: a rule line ending in the session's name, then a line that
  is exactly the prompt character with nothing after it, then a rule line (the tmux spike in the
  plan). The registry alone is not enough: a half-typed owner message leaves it `idle`.
- **No progress for 20 minutes while busy**: a dialog takes the permission path (3.5); otherwise
  Escape and a status-request doorbell; 10 minutes later recycle fresh.
- **Permission prompt**: never answered; the job parks on one owner item (3.5).
- **Idle while working**: doorbell; delivery counts only with progress within 15 minutes; two rings
  without progress recycle fresh.
- **The doorbell** is `[githerd <nonce>] job <id> has news. Call githerd_next.` It carries no
  GitHub text. It is typed with `send-keys -l`, the pane is captured again, and Enter is sent only
  if the text sits in the input box; otherwise the line is cleared with `C-u` and "doorbell blocked
  by dialog" is recorded with the capture. No doorbell while a client views that window
  (`#{window_active_clients}` from `tmux list-windows` [PF 10.8]) or the input box holds the owner's unsent text; if that lasts 30
  minutes the board says so and the job continues in a new window, leaving the old one to the owner.

### 7.6 The owner and workers

- **Watching**: `githerd attach` (`tmux -L githerd attach -t githerd`); the board window redraws
  when the state file changes.
- **Steering**: any prompt without the nonce, other than the launch prompt and a background task's
  `<task-notification>` [PF 10.3], marks the job steered: no doorbell, no stall
  recycling, deadlines paused, the Stop gate allows every stop. It ends when the session calls a
  githerd tool again, after 2 hours idle, or when the owner ends the session.
- **Keeping**: `githerd keep <window> [--with-job]` hands a window to the owner for good.
- **Stopping**: `/exit` or closing the window; a steered session the owner ended parks its job
  "stopped by owner" until `githerd release <job>`. `githerd pause` stops every start and doorbell;
  `githerd workers 0` keeps only the urgent slot; `githerd workers --stop` ends every worker
  without charging attempts.
- **Owner sessions** appear on the board through the registry [PF 6]; they may take work with
  `githerd_next` and `githerd_claim`, and are never assigned work, rung or ended. Their claims lapse
  24 hours after their last githerd call or commit on the claimed branch.

### 7.7 Session death

On any death: kill every process whose `/proc/<pid>/cwd` is in the worktree (SIGTERM, then
SIGKILL), remove a stale `index.lock` once nothing uses the worktree, re-read the job's branch and
the pull requests whose head is that branch, put "PR #n exists, remote head X" into the news, then
continue (5.5). Pushes are not lost: the daemon runs them.

### 7.8 Ending

End the session if open (`/exit` when idle, SIGTERM after 30 s [PF 2.3]); kill processes whose cwd
is in the worktree; stop servherd servers whose cwd is inside it; push unpushed commits to a
salvage branch if the job was cancelled; unlock and remove the worktree with `git worktree remove`
(never `--force`) once its pull request is closed; write the outcome to the ledger.

---

## 8. Concurrency

### 8.1 Limits

| Limit | Start value | What it limits |
|---|---|---|
| Working sessions | 3 | non-urgent jobs in `starting` or `working` |
| Urgent overflow | +1 | incidents and reviews of incident fixes |
| Waiting sessions | 6 | idle sessions in `waiting`, outside the working count |
| Owner review queue | 6 pull requests not yet approved once | no new `issue` jobs on packages with a Storybook at or above it |
| Push queue | 2 waiting | above it, only work that needs no push is dispatched |
| Machine | load under 0.75 x 32 cores [R23], MemAvailable over 15 percent | no new worker; one urgent may start if none runs |
| Browsers | 4 Chromium trees machine-wide [OD 11] | the guard refuses a launch at the cap |
| Subagents | 2 concurrent per worker | the guard on the Agent tool [PF 10.11] |
| Triage | 1 job, 20 issues | bulk filing rate |
| Worker hours per day | config, until the usage reading is verified | routine starts; urgent work is exempt |

Every number is config, changed at runtime with `githerd workers <n>` or a config change; the board
shows each limit with the measurement that applied at the last start.

### 8.2 Claims and overlap

- `githerd_next` returns a versioned snapshot of every job in flight and every owner session, each
  with the files it is actually changing: its branch's diff from the merge base plus uncommitted
  paths, for every worktree in `git worktree list` with changes, live session or not.
- Before any edit the worker decides `independent`, `join` (its target is added to that job; its
  session ends; the holder gets news) or `wait`. It names related jobs.
- `githerd_claim` succeeds only on the current snapshot version and refuses a wait that would close
  a cycle.
- At every push the daemon intersects the pushed diff's files with every other in-flight
  worktree's and every owner session's changed files. A non-empty intersection records the two as
  related and tells both holders. This is a fact about the diffs, not a
  guess about the work.
- Every tool call and Stop compares the session's branch and pull request with the claims;
  `githerd_push` and `githerd_done` refuse targets the session does not hold.

### 8.3 Usage limits and API errors

- **Usage stop** (StopFailure `rate_limit` [PF 10.3], or the limit screen [S19]): a global pause that
  freezes every deadline, the watchdog's recycle rules and every attempt clock; the reset time is
  on the board. After the reset (or, with no time, a probe at 1 h, 3 h, 6 h), one canary worker
  starts, and the rest only after it completes a turn. Nothing is typed into a pane showing the
  limit screen, so its menu is never answered by a doorbell. The daemon's own non-Claude work
  (re-runs, parent re-tests, statuses) continues, and so does Mergify.
- **Extra usage**: never (owner's decision 1 in 12.3). githerd pauses at the limit and resumes at
  the reset. If the limit screen shows extra usage in use anyway, starts stop and one owner item
  is raised. The screen's menu offers paid options and an automatic resume, so githerd never types
  into it (S19 in the plan).
- **Weekly-limit text**: once [S19] verifies it can be read, above 80 percent routine slots drop to
  2, above 90 percent to 1, above 95 percent urgent only.
- `overloaded` or `server_error` (a 529 arrives as `server_error` [PF 10.3]): resume after 2 minutes, then 5; a third counts as an attempt.
- `authentication_failed`, `billing_error`, `oauth_org_not_allowed`, `account_on_hold`,
  `verification_required`, `cloud_credential_error`, the Consumer Terms text: credential class; starts stop;
  one owner item; a canary start after the owner acts or the next normal Stop from a session using
  the same account (only a session on the same account lifts the pause; how a session's account is read is part of
  [S19]).

---

## 9. State and recovery

### 9.1 Where state lives

Everything is under `~/.githerd/graphty-monorepo/`, outside the repository:

| State | File | Rebuilt from on loss |
|---|---|---|
| GitHub and npm facts | memory | the first poll |
| ETags | `etags.json` | a full read |
| Jobs, claims, attempts, sessions, steering, orders, policies, vetoes, settings, owner items without a GitHub target, the allow overlay | `state.json`, written whole to a temp file, fsynced and renamed after every change; previous copy `state.json.bak` | `.bak`; then ledger replay; then GitHub (branches `githerd/*`, pull request bodies carrying `githerd-job: <id>`, githerd's `needs-decision` comments) |
| Every decision, write, would-do, doorbell and session start or end | `ledger.jsonl`, append only, rotated monthly | it is the history |
| Config in use, and the last good one | memory, `config.last-good.json` | master |
| Liveness | `alive` (every 10 s: pid, start time, version, PID 1 start time) | n/a |
| Progress | `progress` (current reconcile step and when it began) | n/a |
| Starts | `starts` (the last 10 start times, for the crash-loop rule) | n/a |
| Hook events while the daemon was down | `spool/` | n/a |
| Per job | `jobs/<id>/`: settings, MCP config, news, pane captures, findings | n/a |
| githerd code | `versions/<sha>/`, `current` -> the running version | master |
| Fatal reason | `FATAL` | n/a |

### 9.2 Start sequence

1. Take the lock (pid, process start time). A live holder: exit. Remove servherd entries named
   `githerd` whose cwd is not the fixed cwd. The lock comes first so a second daemon refused by a
   live holder is not counted as a start: three near-simultaneous starts from hooks would
   otherwise trip the crash-loop rule.
2. If the lock taken in step 1 was stale (the previous daemon exited uncleanly), record the start
   in `starts`. Three starts after an unclean exit within 10 minutes: boot straight into fatal
   mode with the last exception as the reason. A clean stop releases the lock, so planned
   restarts (a master move under `githerd/`, servherd, the launcher) never count.
3. Load config: master's if valid, else `config.last-good.json` with a banner, else fatal mode.
4. Load state (`state.json`, `.bak`, rebuild).
5. If PID 1's start time differs from the one recorded in `alive`, the container restarted [R21]:
   every recorded pid and pane is void.
6. Check the `gh` login. Changed: dispatch and writes frozen, owner item.
7. **Release check first**: tags, npm and version commits; a half-state is an incident.
8. Reconcile with the persisted ETags. Every open head's verdict is compared with its posted
   status and written only where it differs.
9. Drain the spool.
10. Re-adopt live worker panes whose identity matches. Working jobs whose session is gone are
    continued one at a time, incidents first, under the machine limits. Waiting jobs stay waiting.
11. Platform self-test if the Claude Code version changed since the last pass.
12. Begin polling.

### 9.3 The reconcile

At most every 60 s: read network and rate state (unknown -> skip to step 7); conditional GETs;
details for what changed; classify; derive facts, decisions and holds; read the registry,
transcripts, `/proc`, tmux and the push lock; advance every record by its deadline; run the
invariant check; start workers; run writes through the single write function (mode gate, ledger
line, read-back); merge at most one pull request; persist; update `progress`. Each step has a
bound; long work (install, build, audit, dry-run, gate) runs as tracked child processes outside
the reconcile, with their own deadlines.

### 9.4 Liveness, restart and the crash loop

`alive` is written by a 10-second timer in the event loop, independent of reconcile progress, so
slow work never looks like death. A restart is allowed only when `alive` is older than 60 s and the
lock's pid is dead or has another start time, and only by a restarter holding `restart.lock`.
Restarters: pm2 (once servherd passes `autorestart` [R18], [S26]); every MCP server, which stats
`alive` once a minute while its session lives (idle waiting workers included); every hook and CLI
call; the launcher of the first Claude session after a container restart; and `githerd ensure`
from any terminal. There is no supervisord entry (owner's decision 3 in 12.3). Every start path
gives servherd the same name, `githerd`, the same working directory and the same command line
[R18], so servherd always finds its one entry; a changed command would restart it. The working
directory is the state directory `~/.githerd/graphty-monorepo`, not `current`: servherd records the
directory as the process reports it, and a process started in a symbolic link reports the link's
target, so every new version would be a second server. The command is
`env -i GITHERD_ROOT=<repository> GITHERD_STATE_DIR=<state directory> PORT={{port}} node
<state directory>/current/bin/githerd-daemon.mjs` with servherd's `--autorestart`, and it is what
`githerd install` prints. `env -i` keeps out the stale `CLAUDE*` variables pm2 carries [R19]; the
daemon takes the rest of its environment from `daemon-env.json` in the state directory, an
allow-list (`HOME`, `USER`, `LANG`, `PATH`, `SSH_AUTH_SOCK`, the `GIT_CONFIG_*` signing variables
and the notify command's Pushover keys) written owner-only by `githerd install`, or by the first
start when it is missing. The daemon keeps the Pushover keys because it pages (11.3); workers never
get them (7.1). They are in a file, not on the command line, because every process on the machine
can read a command line. `githerd install` run from a shell without the Pushover keys, or without
the `GIT_CONFIG_*` group (it comes from the owner's Claude settings, not his terminal), keeps the
old file's group and names it, so the daemon never silently loses its pages or its signing. The
command line never carries `GITHERD_CONFIG`, whatever the caller's environment: the shared daemon
always reads the default branch's config, and the command, and so servherd's entry, does not
depend on which shell restarted it. The development daemon (`githerd dev`) starts the same way,
with its own name, its state directory in the worktree and `GITHERD_CONFIG` and `GITHERD_DEV=1`
added. Since the daemon's environment no longer holds the repository's `.env`, the outgoing-text
check (`text.mjs`) compares against the secret-named values (TOKEN, KEY, SECRET, COOKIE,
PASSWORD) of the daemon's environment and of the repository's `.env`, read at start and never
exported: a run can read `.env` through Bash. Runs never call `githerd install`, `ensure`,
`restart` or `dev`: the CLI refuses them when `GITHERD_RUN_ID` or `GITHERD_URL` is set, and the
guard denies them. An uncaught exception enters fatal mode with its stack instead of exiting.

### 9.5 The invariant check

At the end of every reconcile: every job, incident, owner item, proposal and order has a state, a
holder (a session, the queue, the owner or a named blocker) and a deadline or a terminal state;
every `waiting` job's condition is still pending; every `parked` job's item is open; every working
job's session is alive or being recovered; every open owner pull request has a current
`githerd/merge`; every order's issues each have a job, a terminal state or a reason; master's
`.mergify.yml` requires `githerd/merge` (section 4.6) and no native auto-merge is armed; the githerd tmux socket exists while jobs need it. A violation is a
fault: first on every surface, with `githerd why` pointing at the record; paged once after 24 hours.

### 9.6 Fatal mode

For what githerd cannot fix itself (no valid config ever loaded, state directory not writable,
`gh` not authenticated, a crash loop, a new version failing its gates with no previous copy): write
`FATAL`, stop reconciling, dispatching and writing, keep the HTTP endpoint up so every hook, tool
and CLI call says "githerd is DOWN: <reason>", page once. Leave fatal mode when the cause changes.

### 9.7 Config adoption

Config comes only from master. A new config is adopted only after: schema validation with a
minimum and maximum for every number; a replay of the recorded month with it, refused if any
verdict moves toward more merges, fewer incidents during red stretches, or a write group going to
`acting` without ledger coverage. A refused config keeps the last good one, says so on the board,
and the daemon opens a revert pull request of the config commit. A code change and a config change
in one commit go through the self-update gate together (9.8).

### 9.8 Self-update and version skew

The daemon runs master's copy of `githerd/`, never a worktree's. On a master move that touches
`githerd/`, it finishes the reconcile, materializes `versions/<sha>/`, runs the replay suite, a
protocol test (the previous client against the new daemon) and the platform self-test, then points
`current` at it and restarts. Failure: back to the previous version, loudly. Each session's MCP
server and hooks run from the version that was current when the session started; the daemon serves
the previous protocol version while any such session lives, and a validation error caused by a
version mismatch is never an attempt.

---

## 10. Safety and residual risks

The owner's threat model is mistakes [OD 9]. Each irreversible step has a server-side gate or is
done only by the daemon under one set of rules; each local rule is a guard, not a sentence.

### 10.1 What a worker can and cannot do

Workers run as the owner (his `gh` login and signing key), because they are his sessions.
Generated settings (7.2) add, and the PreToolUse guard (built on the existing shell tokenizer)
enforces:

- **Refused in Bash**: `git stash`, `git reset`, `git checkout -- <path>`, `git clean`,
  `git rebase`, `--no-verify`, any `git push` (use `githerd_push`), `git remote` changes, `gh pr
  merge`, auto-merge toggles, any write to `.../statuses/`, `.../merge` or `.../update-branch`,
  `gh run rerun`, `gh workflow run` (use `githerd_rerun`), `gh issue close`, `gh issue reopen`,
  adding or removing `needs-decision`, `hold`, `githerd:*` or `intermittent`, comments on an issue
  or pull request with an open owner item, any `gh` or `git` write naming a repository outside
  graphty-org, the review tool's accept and finish, any git write whose `-C` or leading `cd`
  resolves outside the job's worktree, and the comment-reading forms of `gh` (`--comments`,
  `/comments`, `/reviews`, `--json comments` or `reviews`, `api graphql` asking for comments):
  use `githerd_read`.
- **Refused in Edit and Write**: paths outside the job's worktree and `./tmp`; the denied paths of
  7.2.
- **Agent tool**: at most 2 concurrent subagents, counted by id: in at PostToolUse (`agentId`) or
  SubagentStart, out at SubagentStop with the same id; a stop with no recorded start (Claude Code's
  hidden agents) is ignored [PF 10.11]; **browsers**: no launch at the machine cap.
- Every refusal names the allowed alternative. Fixed refusals need no daemon; claim checks fail
  closed.
- The guard logs every allowed `gh` write a worker makes (verb, item) to a local file the daemon
  reads. An owner-account event on GitHub that matches a worker write within 2 minutes is the
  worker's, not owner input: it never answers an owner item, vetoes a close or moves the queue.

Server-side, whatever the guard misses: the ruleset (pull requests only, required checks, no force
push, no deletion) [R2]; Mergify as the only merger, gated by `githerd/merge`.

### 10.2 What only the daemon writes

Through one write function with a mode gate, a ledger line and a read-back: `githerd/merge`
statuses, auto-merge disarming, updates and retargets, title case fixes, revert pull requests,
re-runs and re-dispatches, issues it files, owner-item comments and labels, proposal comments,
closes after grace, and pushes from the push queue. It never approves visual changes, never edits
rulesets, and never acts on input from an account other than the `gh` login.

### 10.3 Residual risks

| Risk | Why it remains | What limits it |
|---|---|---|
| A semantic conflict between unrelated-looking pull requests reaches master | No signal before a merge [CAT 9] | Claim relations and diff-file intersection force combined tests; master lanes; the parent re-test and revert |
| The container is down | Nothing local survives it; no outside watcher was approved [OD 15] | A head without `githerd/merge` cannot merge; githerd returns with the first Claude session's launcher or `githerd ensure` (no supervisord entry, owner's decision 3 in 12.3) |
| githerd is down after posting `success` | A commit status cannot expire | A pull request up to date with master and carrying `success` can merge onto a master that turned red meanwhile. Mergify's update gives every pull request that is behind a new head with no status, which waits; the parent re-test and revert repair the rest |
| The guard is a tokenizer, not a shell | Text built at run time can hide a command | The ruleset, the daemon-only merge and push paths catch what matters |
| Workers hold the owner's credentials | They are his sessions | Guard, server-side gates, owner-only input through `githerd_read` |
| Claude judgments are wrong (overlap, duplicates, review) | No mechanical signal | Second confirmations, grace periods with veto, required checks, master lanes |
| A paid lane costs money on every parent re-test and re-dispatch | The parent re-test is the only way to separate noise from regression | Once per incident; balance re-dispatch is free, a rejected job is not charged [PF 9.6] |
| The weekly usage limit is not readable until verified | On-screen text only | Worker-hours cap; global pause on the limit itself |
| Typing into a window | tmux keys go to whatever is on screen | Positive match of the prompt box, text verified before Enter |
| Resume across Claude Code versions | Internal format | Used only when verified on the running version |
| An advisory is matched late because npm's audit data lags GitHub's | Two databases | Recheck list until a CI audit has run after the advisory's update |

---

## 11. Observability

### 11.1 Surfaces

- **The board** (`githerd status`, the `githerd-board` window, `githerd_status`): banners and
  faults; master per lane with red-since and the green commit; the release line from npm; open
  incidents with their classification and procedure step; owner items ("nothing is waiting on
  you" when empty); why each pull request is not merging (the first failing decision line or
  hold); the push queue; jobs with state, age, deadline and holder; sessions; limits with the
  measurement that applied; githerd's health.
- **Start line**: every session's SessionStart prints one line: "master red on Build for 2 h; 2
  items wait on you; 3 workers; githerd OK".
- **`githerd why <item>`**: the facts, rules and ledger lines that put a job, pull request, issue or
  owner item in its state.
- **GitHub**: `githerd/merge` on each owner pull request; `needs-decision` for owner items there.
- **The ledger**: every decision, write and would-do, for replay and for `why`.

### 11.2 The CLI

| Command | What it does |
|---|---|
| `githerd status [section]` | The board; reads `state.json` directly when the daemon is down, and says so |
| `githerd board` | The board, redrawn when the state file changes |
| `githerd attach` | Attach to the githerd tmux server |
| `githerd why <item>` | Explain a state from the ledger |
| `githerd pause` / `resume` | Stop / restart every start and doorbell |
| `githerd workers <n>` / `--stop` | Set working sessions; end every worker without charging attempts |
| `githerd keep <window> [--with-job]` / `release <job>` | Hand a window to the owner / unpark a job he stopped |
| `githerd veto <item>` | Never close or propose closing it again |
| `githerd answer <item> <words>` / `answer <item> allow` | Answer an owner item / add the item's allow rule to the overlay |
| `githerd order ...` / `policy ...` / `policy end <id>` | Record orders and policies |
| `githerd install` | Archive master's copy into `versions/`, point `current` at it, write `daemon-env.json` from this shell's environment, and print the servherd start command (9.4) |
| `githerd ensure` | Start the daemon if it is not running, with the same `alive` and lock checks the MCP server makes; for after a container restart when no session has opened yet |
| `githerd selftest` | Run the platform self-test |
| `githerd mode` | Each write group's mode and its ledger coverage |

### 11.3 Paging and presence

githerd pages through the owner's notify command, from the daemon's own environment. One page per
owner item when it becomes actionable, again only when its text changes; several within 10
minutes are one page. Never for GitHub or Actions outages, work in progress, or anything githerd is
handling. **Presence**: the owner is present when, in the last 2 hours, he typed into a non-worker
session (a user record in its transcript [PF 6]), used the CLI, or acted on GitHub in a way that
matches no worker write. While absent: review lists and non-blocking items go into one digest a
day; an item that blocks every worker start or the release still pages once.

### 11.4 Health and the platform self-test

Health on the board: `alive` and `progress` ages; rate budget and githerd's own calls this hour;
worker hours today; phone alerts working or broken; each write group's mode; faults; hidden
other-account items; Stop gates that failed open.

The platform self-test runs on its own tmux socket before the first worker start, after a Claude
Code version change, after a githerd version change, and on `githerd selftest`. It uses the real
worker command line (the same `env -i`, `--settings`, `--mcp-config` and a cwd under `.worktrees/`)
and the configured model, and checks: the registry entry appears; SessionStart reaches the daemon
with the model and no dialog blocks a fresh worktree; no "Do you want to proceed" appears through
`githerd_next`, `githerd_claim` and a `gh pr create` for a branch that does not exist (GitHub
refuses it, so nothing is created); no Pushover variable, and no `CLAUDE*`
variable beyond the ones Claude Code sets itself (S18), is visible to a hook or the Bash tool; the doorbell starts a turn and UserPromptSubmit sees
the nonce; a Stop block is obeyed; `githerd_wait` idles and the doorbell wakes; `/exit` removes the
registry entry; resume works (else resume is marked unverified); the weekly-limit text is readable
(else display-only). Failure stops starts, is a banner everywhere, and pages once.

---

## 12. What the owner does

### 12.1 Setup, once

1. Start githerd: `servherd start` with the name `githerd` and the fixed cwd (the command is printed
   by `githerd install`). After that it runs forever [OD 2].
2. After a container restart: nothing, if a Claude session opens (its launcher starts githerd);
   otherwise `githerd ensure`.

No supervisord entry, no GitHub App and no notify-script change: workers started under `env -i`
cannot see the Pushover keys, in their hooks or their Bash tool (S18 in the plan).

Everything else (the review server, the `githerd/merge` status, tmux, worktrees, config values)
githerd and its workers handle. The `.mergify.yml` change of 4.6 is a coordination task with the
session that owns that file.

### 12.2 Recurring owner-only steps

Visual approvals; answers to one-way doors; payments (GPU balance, plan changes, Chromatic); first
npm publishes; credentials, logins and account switches; permission rules (press 1 in the window,
or `githerd answer <item> allow`); cutting a held major.

### 12.3 The one-way-door questions

All three are decided by the owner (2026-10-03):

1. **May workers spend paid extra usage beyond the plan when the limit is reached?** Decided: no
   paid extra usage at the usage limit: githerd pauses and resumes at the reset.
2. **Create a GitHub App for githerd?** Decided: no separate GitHub App for now: use the owner's gh
   token with a reserved call budget.
3. **Add the supervisord stanza?** Decided: no supervisord entry for now: after a container
   restart, githerd comes back when the first Claude session's launcher runs, or by
   `githerd ensure`.

Everything else in this design is reversible with an edit or a config change, and githerd decides
it.

---

## 13. The code on branch feat/githerd

The branch (`githerd/lib/*.mjs`, about 11,400 lines) was written for the rejected headless design.
It predates this design and is reworked by the plan. Most of its fact-finding and safety code fits.

| Module | Keep | Change |
|---|---|---|
| `github.mjs` | `gh api -i` client, per-path ETags, rate headers, the single write gate with dry-run and `would-do` lines | persisted ETags; read-back and next-poll confirmation; per-group modes |
| `master.mjs` | lanes with monotonic run ids, the master verdict, suspects between green and red, release state | sighting keyed on (run id, attempt, updated_at); every workflow; green and CI-green commits; queue age |
| `prs.mjs` | `decideBreaking` from the full commit list, `whyStuck`, `touches` | becomes the `githerd/merge` decision of 4.6; stacks |
| `queue.mjs` | deterministic queue with a reason per item, owner-only override labels | order of 5.4; orders; worker-write attribution |
| `issues.mjs` | `issues?since=` with a high-water mark | 10-minute overlap and dedupe |
| `store.mjs` | atomic `state.json`, `.bak`, append-only ledger | move to `~/.githerd/`; ledger replay; spool |
| `proc.mjs` | process identity by pid and start time | container restart by PID 1 start time instead of boot id [R21] |
| `config.mjs` | strict validation from the default branch, widening keys rejected | bounds; last-good file; replay gate |
| `version.mjs` | running master's code, never a worktree's | `versions/<sha>/`, protocol versions |
| `mcp.mjs`, `schema.mjs` | JSON-RPC core and schema validator | the eleven tools of section 6 |
| `launcher.mjs` | find or start the one daemon, forward calls | fixed cwd; `alive` check; restart lock; drop the pm2 re-creation workaround once servherd passes `autorestart` |
| `notify.mjs` | once per key; "phone alerts broken" | owner items only; batching; presence and digest |
| `text.mjs` | ASCII and credential checks on outgoing text | none |
| `shellwords.mjs` | the tokenizer | none |
| `bin/githerd-guard.mjs` | the PreToolUse hook frame | the worker refusals of 10.1 |
| `worktrees.mjs` | worktrees from the green commit, removal without `--force` | detached heads, `git worktree lock`, build and smoke test, the reference worktree |
| `actor/push.mjs` | pushing a branch after checks, `would-do` in dry-run | becomes the push queue (4.8) |
| `board.mjs` | atomic claims, owner-only filtering | snapshot versions with changed files, overlap decisions, related jobs, lapse |
| `merged.mjs` | the merged-pull-request GraphQL query | feeds refresh triage and the related rule |
| `retriage.mjs` | the export query | full passes become triage jobs |
| `cli.mjs` | the command frame and state-file fallback | the commands of 11.2 |
| `daemon.mjs` | the poll loop, HTTP endpoint and tool dispatch | the reconcile of 9.3, fatal mode, `alive` and `progress` |
| `tools.mjs` | tool plumbing | replaced by the eleven tools |
| `runner.mjs`, `run-tools.mjs`, `dispatch.mjs`, `paging.mjs`, `prompts.mjs`, the playbooks | nothing | removed: they exist for headless runs, run tokens and dollar budgets |

New code: the classifier; the incident procedure; the `githerd/merge` status and stacks; the push queue;
the reference worktree; the tmux worker start, Stop gate, doorbell, watchdog and death handling;
owner items, presence and paging; the self-test; the replay suite.

---

## Appendix A. The adversarial review, finding by finding

Four adversarial reviews walked the previous draft through concrete scenarios minute by minute.
Each finding below is resolved in this design, or the reason it is not adopted is given.

### A.1 Master, release and outside drift

| Finding | Resolution |
|---|---|
| An innocent merge is reverted when a flaky benchmark turns the GPU lane red | Parent re-test and red-head re-run before any revert (4.5) |
| The intermittent path was circular (no re-run before an issue, no issue before a re-run) | The daemon re-runs once per (head, key) and files the issue itself on a pass (4.5) |
| Workers could re-run the paid GPU lane at will | Guard refuses `gh run rerun` and `gh workflow run`; `githerd_rerun` grants once (6, 10.1) |
| The fix for benchmark noise reads as loosening | Review rubric defines calibration (5.1) |
| "Reopens after two green sightings" could never happen on a frozen tree | No global closed tree; holds end when the lane is green at a commit containing the fix, and a sighting is defined (1.4, 4.5) |
| A whole-repository freeze for a master-only lane | Holds scoped by the lane's own selection logic and paths (4.6 line 3) |
| A balance stop mid-run reads as a lost runner and costs a wasted dispatch | Runner loss on a rented label is "possible balance" (4.4) |
| Balance text may be only in annotations | It is only in a step name; the classifier reads step names, annotations and the log (4.2, 4.4, [PF 9.5]) |
| Balance kept every merge waiting on the owner's payment | Paid capacity parks the lane for merges; the release waits (4.4) |
| A silent top-up never ends the item | Backoff re-dispatch ends it [PF 9.6] |
| A labelled pull request failing on balance became a code job | Classifier runs before "own" on pull requests too (4.4) |
| Usage stop did not freeze the job clocks | Global pause freezes deadlines, recycling and attempts (8.3) |
| A doorbell could select a paid option in the limit menu | Positive prompt match; no typing into the limit screen (7.5) |
| Extra usage could spend money unseen | Owner's decision 1: never; githerd pauses and resumes at the reset (8.3, 12.3) |
| Resume on a Stop from another account | Only a session on the same account lifts the pause (8.3) |
| Other sessions drain the shared rate budget while auto-merge keeps merging | Mergify needs `githerd/merge` on each new head, so heads githerd cannot see do not merge; the reserve keeps githerd's last 300 calls for holds (4.6, 4.11) |
| Local audit may diverge from CI | Exactly the CI command and ignore list; recheck list (3.2) |
| Several workers fix one advisory inside unrelated pull requests | Master-side at the first pull request; no `pr` job (4.4) |
| `strict` is off, so an old green pull request merges and master fails the audit | Mergify merges master into each pull request and re-runs its checks first; the parent re-test prevents an innocent revert (4.5, 4.6) |
| The advisory incident never ended because some pull requests are never updated | Done is master plus one canary (5.1) |
| A mass update of every pull request at once | No mass update; Mergify updates one pull request at a time as it reaches the front of its queue (3.2, 4.6) |
| An audit ignore read as loosening; review dates had no trigger | Rubric allows it; expiry driven by the advisory feed (3.2, 5.1) |
| Runner image change seen a week late; weekly noise issues | Drift diff on every red key; issues only for gate-recorded versions (3.2) |
| GPU driver change not seen as drift | Tool-version lines include the driver (4.4) |
| Annotations not budgeted | `annotations_count` first, then one call (4.2) |
| npm outage burns job faults | Platform fault, no charge (3.10) |
| A tool error in the audit read as an advisory | `--json`; a tool error is unknown (3.10) |
| No checked-out tree for local checks | The reference worktree (4.9) |
| A release skipped for expired artifacts is never retried | Gate notice read; the daemon re-runs CI (4.7) |
| Release pending fired on every quiet day | Dry-run says whether anything would publish (4.3) |
| The tree flapped three times per master commit | Holds are not written to pull requests; release hold only during the release job and only for release-input pull requests (4.6) |
| Credential failures each burned attempts and paged per worker | One credential table first in the classifier; signing probe (4.4, 7.1) |
| Token expiry and certificate expiry unseen | Expiration header; `notAfter` in the review-server check (4.11, 3.3) |
| GPU provider outage froze merges for a day | Queue age; lane not progressing; merges continue (3.10, 4.7) |
| Deprecation brownouts read as intermittent | Annotations; drift class (3.10) |
| deploy-pages and coverage red unseen | Every master workflow watched (3.10) |

### A.2 Pull request lifecycle

| Finding | Resolution |
|---|---|
| A rejects-only Finish leaves no record | The reject block in the owner's comment is the signal [R14], with a fixture [S29] |
| Stack children go stale; GitHub never retargets them | Chain model; daemon updates and retargets [R1], [PF 9.2] (4.6) |
| A stacked job started once its base job was terminal | Blocks until the base pull request is merged (4.6) |
| A pr job stalls forever when the owner has the branch checked out | Detached worktrees and explicit refspec pushes (7.1, 4.8) |
| Baseline-only conflicts paged the owner although the tool can fix them | The daemon runs `visual-review update` [R13] |
| Conflicts judged against the wrong commit | `merge-tree` against `origin/master` (3.3) |
| Untagged semantic conflicts merged under native auto-merge | Native auto-merge is disarmed; Mergify merges one at a time, each tested on current master (4.6) |
| Updates waited for a fully green tip | githerd's own updates use the CI-green commit; Mergify's use master's tip only for pull requests no red lane affects (4.6) |
| Mergify updates and status interplay untested | Mergify is adopted; the coordination change and its verification steps are in 4.6 |
| `githerd_done` refused a head Mergify or the review tool extended | Ancestor rule (6) |
| Mergify merges without consulting githerd | The `githerd/merge` conditions of the coordination change; until they land, a banner (4.6, 9.5) |
| The push lock was a convention, not a component | The push queue plus a flock inside `tools/prepush.sh` [R11], [R12] (4.8) |
| Queued pushes die at the tool timeout and livelock with recycling | The daemon runs pushes; jobs wait on `push` (4.8) |
| Urgent fixes queued behind routine pushes | Priority in the push queue (4.8) |
| A local gate failure looped every job | Local failure keys, shared local incidents, gate on the green commit (4.4, 4.9) |
| Cold Nx cache in fresh worktrees | Nx 22.7 shares the main checkout's cache with every worktree on its own; `NX_CACHE_DIRECTORY` is never set, because it made Nx report hits and restore nothing [S23]. Gate results cached by tree id: not adopted, the shared Nx cache covers it |
| A full job for a title fix; commitlint without node_modules | Ring the open session or a `title` job; commitlint in the reference worktree (3.3) |
| The owner's Finish commit forced a second review | Patch id excludes `visual-baselines/**` (4.6) |
| The abandoned rule took pull requests waiting on the owner | Excluded; only githerd pull requests are taken (3.3) |
| "Kept current" while parked was undefined | Not updated while parked; one update on unpark (3.3) |
| Jobs waiting behind a parked job waited a week | Waits capped at 4 hours and re-judged (5.3) |
| Any owner comment unparked a job and re-paged | Re-park on the same item, no page (5.3, 6) |
| Unpushed work lost when a target changed | Salvage branches; foreign heads as news; attempts per job (3.10) |
| Approval churn from speculative updates | No speculative update after a finished review; approved-once pull requests do not count against the limit (3.3, 8.1) |
| The executor experiment merged a real pull request | githerd never merges; the spikes write nothing to the real repository (plan) |

### A.3 Agents

| Finding | Resolution |
|---|---|
| Every githerd tool call prompted; the self-test passed anyway | Allow `mcp__githerd__*`; the self-test runs the real command line and fails on any prompt; no self-test loop (7.2, 11.4) |
| A prompt held a slot all night and failed the job | Parks at once on an item; window kept for the owner; runtime allow overlay (3.5) |
| Escape answered "No" to a subagent's prompt | Pane matched before any Escape (7.5) |
| The auto-mode classifier with another repository's environment | Default permission mode; pushes run by the daemon [R22] (7.2) |
| A worker answering doorbells without working | Delivery counted by progress (7.5) |
| Plugins that ask the user | Turned off; job text (7.2) |
| A worker waiting on its own background gate | Background tasks allow the stop and count as progress (7.3) |
| Owner sessions invisible to overlap | Registry and `git worktree list` changed files in every snapshot (8.2) |
| Overlap judged once from a plan | Diff-file intersection at every push (8.2) |
| The judging mutex blocked urgent starts | Parallel preparation; incidents skip the line (7.1) |
| A pr job pushed under the owner's unpushed work | Any dirty or ahead worktree is a holder; worktree lock (7.1) |
| Wrong base or draft passed as done; review had no "does not address" | Done requires base master and not draft; new verdicts; `not-needed` through grace; `gh issue close` refused (5.1, 6, 10.1) |
| Edits outside the worktree | Guard on Edit, Write and git `-C` (10.1) |
| Unbuilt worktrees fooled workers | Nx build and smoke test before start (7.1) |
| Hooks restarted a slow daemon in a storm | Liveness split from progress; restart lock (9.4) |
| Load caused false start failures and a false page | Deadlines and fault counts pause above the load limit (5.3) |
| Three gates at once; the browser lock was a design-kit script | The push queue and flock; Chromium counted per worker (4.8, 8.1) |
| Orphans after a crash mid-push | `/proc/<pid>/cwd` sweep; the daemon owns pushes; death count (7.7) |
| Doorbells into dialogs; suppressed doorbells stalled jobs | Positive match and verification; 30-minute fallback (7.5) |
| Subagent and browser fan-out | Subagent transcripts as progress; Workflow denied; Agent and browser caps (7.2, 10.1) |
| The owner's tmux server killed every worker | Dedicated socket (4.1) |
| Wait cycles; an incident fix waiting for a review slot | Cycle refusal and caps; urgent slot for incident reviews (5.3, 5.4) |
| Paging isolation relied on an unverified path | `env -i`, verified: no Pushover variable reaches a worker's hooks or Bash tool [PF 7.2] (7.1) |

### A.4 githerd itself and the owner

| Finding | Resolution |
|---|---|
| servherd never restarts githerd [R18] | servherd change, MCP-server and launcher restarters, `githerd ensure` (9.4). The suggested per-window sleep loop is not adopted: the MCP servers of live sessions already do it without a new timer |
| A crash loop drained the budget | Start counter; persisted ETags; write-on-difference (9.2) |
| Slow work looked like death | `alive` and `progress` split (9.4) |
| Two daemons from two cwds | One fixed cwd (9.4) |
| pm2's stale environment leaked into workers [R19] | `env -i` (7.1, 9.4) |
| Container restart not detected by boot id | PID 1 start time [R21]; tmux session recreated; registry check (9.2, 6) |
| Merges continued during a long outage | Each new head needs `githerd/merge`; residual risk in 10.3 (4.6) |
| Bad config stopped everything after a restart | Last-good file; replay gate; revert pull request (9.7) |
| Workers could edit their own hooks | Hooks run from `~/.githerd`; deny rules; owner-session line (4.10, 7.2, 4.6) |
| Workers were never told about a GitHub outage | The Stop gate answer and implicit wait (7.3) |
| An Actions-only outage fired every rule | "Actions degraded" state (3.10) |
| Re-runs reuse run ids; `since` replicas lag; stale heads | Keys and overlaps (1.4, 4.2); `git ls-remote` (6) |
| An owner edit mid-job reached a busy worker too late | News file, PostToolUse hook, push refusal, `githerd/merge` line 8 (3.4) |
| A stranger's comment reached workers | `githerd_read` and the guard (10.1) |
| A five-day absence: page floods, stalls, churn, lapses | Presence, digest, Storybook-only review hold, no updates while absent, grace counted in present days, only githerd pull requests taken, worker-hours cap (3.7, 11.3) |
| Worker writes looked like owner input | Guard refusals and write attribution (10.1) |
| Version skew between daemon and sessions | Protocol versions and pinned client copies (9.8) |
| A dead push-lock holder blocked every push | Kernel `flock` (4.8) |
| A usage stop with no reset time never ended | Probe backoff (8.3) |
