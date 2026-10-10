# Prior art for githerd: what keeps an agent-driven pipeline moving

githerd is a tool for one repository, graphty-org/graphty-monorepo, whose work is done almost
entirely by Claude Code sessions and GitHub Actions. Its job is to keep that pipeline moving: notice
a red master and get it fixed, unblock releases, shepherd pull requests to merge, keep the issue
backlog triaged and current, and stop parallel Claude sessions from colliding or getting stuck. The
owner wants the work done by interactive Claude sessions they can watch and steer, with githerd
deciding what each one works on.

This document collects what other teams and tools have learned about that problem, what this
repository's own history adds, and which parts of the two earlier githerd designs rest on evidence
and which were guesses. It ends with the design rules that follow.

Sources: the research report `tmp/research/reports/Keeping an AI driven pipeline moving.md` and its
notes in `tmp/research/research_notes/Keeping an AI driven pipeline moving/` (every external claim
below comes from there; the links are in those files), the owner's recorded lessons in the Claude
memory directory for this project, the package notes on branch `feat/githerd`
(`githerd/CLAUDE.md`, "Verified against the real claude"), and the two earlier designs:

- `tmp/githerd-v2/branch-headless-design.md` -- githerd starts headless `claude -p` runs itself.
  Rejected: the owner cannot watch, interrupt or steer a headless run.
- `tmp/githerd-v2/abandoned-dispatcher-draft.md` -- githerd hands jobs to interactive sessions in
  tmux windows through MCP tools. The direction the owner wants, but it grew by patching.

---

## 1. The one-paragraph summary

Every setup that works keeps the agents narrow and puts the irreversible steps (merge, close,
revert, release) behind deterministic code and required checks. Every setup that failed let an
agent's own claim decide something: a fixer that "fixed" CI into a red master for five months, an
orchestrator that merged failing tests, a bot that rebased every PR onto a broken base, a green
status that only meant "the process exited". The scarce resource is not code generation but review
attention and coordination: in a study of 600 rejected agent PRs, 38% died unreviewed and 23% were
duplicates, against 3% that were simply wrong. So the design questions that matter are: how githerd
knows the true state of the repository without trusting any agent, how every loop ends, how a stuck
session is noticed, and how work is limited to what the owner can absorb.

---

## 2. Patterns that worked elsewhere

Each pattern says what it is, where it comes from, the failure it prevents, and what it means for a
dispatcher that hands work to interactive sessions.

### 2.1 State is a fact githerd reads, never a claim an agent makes

- **What.** The gate is always an external, machine-checked fact: a required check, a CI run's
  conclusion, a merged commit reachable from master. Never an agent saying "done".
- **Where.** Anthropic's long-running harness work names "declaring victory early" as the top
  failure and fixes it with an external feature list and end-to-end verification. Steinberger
  reports Claude Code saying "100% production ready" while tests fail. A Gas Town coordinator
  reported all bugs fixed when two PRs existed. Anthropic's Routines docs: a green run status "does
  not mean the task in your prompt succeeded".
- **For githerd.** A job is never closed on the agent's word. `done` is a hypothesis githerd checks
  against GitHub: the PR exists, targets master, its head is the one reported, its required checks
  are green or pending, the issue is linked. A claim that does not verify is a failed attempt, not a
  success.

### 2.2 Make red master loud, and make it block

- **What.** One notifier on master for every workflow the release depends on, alerting on the
  green-to-red and red-to-green transitions only, plus a mechanical "closed tree": nothing merges
  while master is red.
- **Where.** GitHub notifies only the user who triggered a run, so a red run caused by auto-merge, a
  bot or a release push reaches nobody (GitHub community discussion 55379). Chromium's tree sheriffs
  keep the tree "green and open" and close it to block commits while red. Aspect Build's "BuildCop"
  and "Latest Known Green" ref. Uber's mainline was green only 52% of the time before its
  SubmitQueue.
- **Five ways master goes red with every PR green:** two green PRs that do not compose (a rename and
  a new call to the old name); a PR merged long after it was tested; Nx affected skipping a project
  on the PR that master's run builds; jobs that run only on push, schedule or release (this repo's
  GPU and Hosts lanes); and outside drift (a new advisory, an npm release, a runner image).
- **Nx-specific hole.** `nrwl/nx-set-shas` falls back to `HEAD~1` with only a warning when it
  cannot find the last successful run, silently narrowing the tested set.
  `error-on-no-successful-workflow: true` makes it fail instead.
- **For githerd.** Master's state across every gating lane, and the newest commit verified green on
  all of them, is the first fact githerd computes and the first thing every action consults. A
  commit status on every open PR is the closed tree. The red page goes to the owner when no one has
  the incident, not on every red run.

### 2.3 Master green is not enough: detect a shared cause on the PRs

- **What.** When several PRs start failing the same check at the same step, the cause is shared
  (outside drift, a new advisory, a registry change) even if master is green, because master may
  not have run CI since the cause appeared.
- **Where.** This repository, twice. 2026-10-02: a node-forge advisory failed master's audit at
  00:18; both sessions fixed PRs one at a time, and the open PR count went from 14 to 22 before the
  fix merged at 02:26. 2026-10-03: the braces advisory failed every PR's audit while master stayed
  green, because master had not run CI since the advisory; 23 PRs backed up. The owner: "the problem
  wasn't the security update, it was not recognizing that master was failing and allowing PRs to
  back up."
- **For githerd.** Key failures by check plus failed step. Two or more PRs failing on the same key
  in a short window become one urgent shared job, and the per-PR fix jobs are held. The abandoned
  dispatcher draft got this right, and it is grounded in a real incident.

### 2.4 Revert first when it is clean; otherwise fix forward through a PR, once

- **What.** If one commit clearly broke master and master has not moved since, revert it.
  Otherwise one agent attempt per red commit, always as a PR, never a push to master.
- **Where.** Chromium: "revert first and ask questions later". Its hazard: master moves past the
  culprit before the revert lands; one agent-run repo halts its bot with "AUTO-REVERT HALT: main
  moved after the red commit". Anthropic's `ci-failure-auto-fix.yml` example creates a fix branch
  and guards against fixing its own fix branches by prefix, but as written covers only PR failures,
  not pushes to master. Nx Self-Healing CI verifies a fix by rerunning the failed tasks before a
  human approves, and auto-applies only mechanical classes (format, lint, sync) because "AI agents
  still make things up to get that test case to pass". No vendor publishes a fix success rate.
- **For githerd.** A revert needs a fresh check that master's head is still the culprit and still
  red. A fixer that touches tests or loosens a check is the classic silent harm; the playbook forbids
  it and review catches it. One attempt per red SHA, then a page.

### 2.5 Every fixer needs an escalation that a human actually reads

- **What.** A bounded loop that ends in "fixed" or in exactly one escalation the owner sees.
- **Where.** The magus CI bot opened 18 or more fix PRs and left 30-plus orphaned branches while main
  stayed red for about five months: its fix PRs did not target main and its "human review required"
  step was never satisfied. The community PR babysitters converge on explicit terminal states
  (merged, closed, reliably green, needs human) and a retry budget of three. Solberg's `/babysit-pr`
  sorts every finding into Fix, Dismiss or Escalate and caps at three iterations.
- **For githerd.** Retrying forever on a slow schedule while the item sits on an unread list is the
  magus pattern, however polite. Exhausted work must reach the owner by the channel they read (the
  phone, or a session's `ACTION NEEDED:` line), once, with the attempts' findings.

### 2.6 Never spread a red base: guard updates, then refire

- **What.** Update a PR's branch only from a verified-green master. After master is fixed, update
  only the PRs whose failure predates the fix, and record each refire by (PR, master SHA) so it
  never repeats.
- **Where.** AutoBot-AI's updater rebased every open PR whenever main moved, without checking main
  was green, so one red main would have reddened all five in-flight PRs ("An instruction a human can
  follow and an automation can override is not a control"). remudero's "fixed-main refire" proves a
  failure is gone by merging locally and rerunning the failing check, with a PR-plus-SHA ledger.
  This repository's own rule: fix master first, then update every waiting PR with the update-branch
  API.
- **For githerd.** Every move toward master uses the verified-green SHA, never the branch tip.

### 2.7 Merge through native auto-merge and required checks; keep the human gate narrow

- **What.** For a solo repository, native auto-merge plus branch protection is enough; a merge queue
  pays only when several PRs land per hour. Auto-merge only the low-risk class; let a required
  check carrying the human's narrow decision (visual approval) be the real gate.
- **Where.** Mergify's own guidance; Chromatic's `exitZeroOnChanges: false` turns auto-merge into
  "merge as soon as the owner approves the snapshots". A merge queue adds up to 50% CI load (Aspect)
  and once hung on an external required check (chromatic-cli 871). Gas Town auto-merged PRs with
  failing integration tests and a colleague had to hard-reset master.
- **This repository's policy (owner, 2026-10-01):** auto-merge on for non-breaking PRs; breaking PRs
  never auto-merge and are grouped into as few majors as possible; stacked PRs get auto-merge only
  after the PR beneath merges; nothing merges with an unapproved image.
- **For githerd.** githerd turns auto-merge on by rule, with the head it checked
  (`expectedHeadOid`). It never merges directly, and agents in jobs never touch auto-merge.

### 2.8 Polling is the truth; events are hints

- **What.** Some state changes emit no event at all, so a reliable watcher reconciles by polling and
  treats events only as a reason to poll sooner.
- **Where.** GitHub sends no event when an advancing base creates a merge conflict, so Claude Code's
  own `/autofix-pr` cannot react to conflicts. Renovate re-checks on its own schedule ("give Renovate
  about two hours"). Kodiak's update-on-label "only works once". On 2026-10-02 two of three
  auto-merge PRs in this repository could never merge because of conflicts nobody saw.
- **For githerd.** A level-triggered loop: each tick reads the current state, derives what should be
  true, and acts on the difference. A missed event costs one tick, never a lost item. Debounce
  transient states: `UNKNOWN` mergeability is no data; a conflict and a red run each need two
  sightings.

### 2.9 Agents label and propose; plain scripts do the irreversible step after a grace period

- **What.** The model's write surface is tiny and reversible (labels from an existing set, one
  comment). Closing is done later by a script with no model, after a grace period, with any human
  signal as a veto.
- **Where.** Anthropic's own claude-code repository: a triage agent that may only add or remove
  existing labels ("Never invent new labels", "false positives are worse than missing labels",
  label script capped at two calls), a dedupe agent capped at one comment, and timer scripts with no
  LLM that close after 3 to 14 days unless a human commented or the author reacted thumbs-down.
  Timer-only stale bots are widely rejected for closing valid issues "without any context".
- **For githerd.** Close and revert are proposals; githerd's own code executes them after grace,
  re-checking veto and evidence right before acting. This was sound in both earlier designs.

### 2.10 "Already fixed" needs evidence, not age

- **What.** Refreshing an outdated issue means checking it against current master, with a cited
  commit, path or reproduction for every conclusion.
- **Where.** A 214-issue backlog cleared with Claude Code: of 58 issues that looked "likely fixed",
  reproducing them on main confirmed 44 fixed and found 5 still live. Every reply was human-reviewed
  in batches of about 20. Dosu's better-stale-bot detects issues "fixed by an unlinked PR". No
  packaged tool re-checks issues touched by a merged PR; it has to be assembled. Agent pipelines also
  leave issues open with a stale `status:ready` after the work merged; a close-out step that reads
  back the final state closes that gap.
- **For githerd.** A proposed close carries evidence githerd can verify (a merged PR, a commit on
  master), and a second, independent pass confirms it before the proposal is made.

### 2.11 Choose agent-ready work, claim it before starting, and cap WIP by review capacity

- **What.** Grade issues for agent-readiness at triage; take a claim before work starts; limit
  concurrent work to what the reviewer can land.
- **Where.** High-quality issues merged 77% of the time versus 46% for low-quality ones (3,180
  Copilot PRs); well scoped and self-contained each add about 16 points; mentions of external
  configuration or APIs lower the odds. Docs PRs merge at 84%, CI at 79%, fixes at 64%, performance
  at 55%. Agent PRs conflict textually in 28% of simulated merges. Practitioners lose track at four
  or five concurrent streams (an opinion, not a measurement). Willison: "I can only focus on
  reviewing and landing one significant change at a time."
- **For githerd.** Claims are atomic and live in one place. The number of open agent PRs and
  in-flight jobs is capped, and the cap shrinks when PRs pile up waiting on the owner.

### 2.12 Unattended runs fail silently unless the wrapper parses the result

- **What.** Exit code 0 and a green status prove nothing. The wrapper must read what actually
  happened.
- **Where.** In `claude -p`, auto-mode blocks and `--permission-prompts none` denials do not fail the
  run; the action simply does not happen and Claude keeps working. Anthropic recommends parsing
  `permission_denials`, `plugin_errors` and `mcp_server_errors`. Commits made with the default
  `GITHUB_TOKEN` trigger no workflows, a classic PR that sits forever with no checks. This
  repository: the stuck-PR watcher crashed silently for a day on a Python syntax error and nobody
  knew.
- **For githerd.** A watcher that cannot run must fail loudly, and githerd must be watched from
  outside itself (an hourly "alive" status on master plus a scheduled workflow that fails without
  it; both earlier designs had this). Every job outcome is checked against GitHub (2.1).

### 2.13 Bound every loop in time, retries and money

- **What.** Hard caps on every unattended activity, chosen by the platform, not the agent.
- **Where.** Anthropic builds a bound into every surface: `/loop` tasks expire after 7 days "to bound
  how long a forgotten loop can run"; a `-p` run stops waiting on idle background agents after 10
  minutes; a Stop hook is overridden after blocking eight times in a row without progress; auto mode
  pauses and resumes prompting after 3 consecutive or 20 total classifier blocks; `--max-turns` and
  `--max-budget-usd`. Gas Town cost about $100 an hour at peak. One Gas Town user found 141 orphaned
  Claude Code processes.
- **For githerd.** Every job has a lease, an attempt budget and a terminal state; every process
  githerd starts is recorded by identity and reaped; nothing githerd starts outlives its purpose
  unrecorded.

### 2.14 Hard rules belong in hooks and deny rules, not in prompts

- **What.** A rule stated in conversation can be lost; a hook or deny rule cannot.
- **Where.** Claude Code's docs: a stated boundary such as "don't push" "can be lost if context
  compaction removes the message that stated it. For a hard guarantee, add a deny rule instead."
  A PreToolUse `deny` blocks a tool even under `--dangerously-skip-permissions`. Auto mode by default
  allows "pushing to any branch of the repository you're working in, including the default branch".
  Anthropic's claude-code repository runs a CI lint that fails any Claude-calling workflow missing
  its hardening settings.
- **For githerd.** Anything that must never happen in a job (push to master, merge, force-push,
  stash, reset, close) is enforced by a hook or deny rule in the worker's settings and by branch
  protection, with the prompt only explaining why. Long-lived interactive sessions compact, so this
  matters more for them than for short runs.

### 2.15 Supervise by limiting, by durable state, and by periodic check-ins

- **What.** Practitioners who run many sessions do not watch them; they limit what runs, keep state
  outside the session, and check in at breaks.
- **Where.** Durable external state everywhere: Anthropic's progress file plus git log at session
  start, Huntley's `fix_plan.md`, Yegge's Beads ledger, Hashimoto's AGENTS.md. Ronacher: keep failed
  attempts in context, or models "try the same mistakes again". Hashimoto turns agent notifications
  off and checks at natural breaks; others page only when a human is needed (ntfy approve and deny
  buttons). Gas Town's patrol roles (Witness, Deacon) nudge stalled agents, but users report agents
  needing "constant manual prodding" and an unclear picture of why work stalled.
- **For githerd.** A fresh session per job, with the job record carrying the previous attempts'
  findings. Routine completion never interrupts the owner; only a decision, a credential, a visual
  review, or an incident nobody has does.

### 2.16 Release only from the tested commit, and watch every lane the release waits on

- **What.** Start a release only from a successful CI run on master, and check out that run's
  `head_sha` so the tagged commit is the tested one.
- **Where.** semantic-release requires running only after all tests pass; several repos moved to the
  `workflow_run` gate after releases raced CI. A red master stops every release; the only cure is
  short red time. Each extra lane the release waits on (here GPU and Hosts) is another way to block a
  release without a PR ever going red. Commit-driven release tools have no native way to batch
  breaking changes; holding breaking PRs unmerged until a planned major is the usual answer.
- **This repository:** npm "previously staged version" (409) means the publish succeeded and is
  propagating for 1 to 7.5 minutes; a first publish of a new package is manual. In 2026-09 two
  sessions planned the same major without knowing about each other, and one published 3.0.0 while
  the other was assembling the grouped breaking release.
- **For githerd.** A stuck or failed release is urgent work with known causes checked first, and the
  breaking-change hold spans all sessions, because only githerd sees all of them.

---

## 3. Failures elsewhere, and the lesson each one teaches

| Failure | What happened | Mechanism | Lesson for githerd |
|---|---|---|---|
| Fixer with no escalation (magus) | 18+ fix PRs, 30+ orphan branches, main red about 5 months | Fix PRs never targeted main; the human step was never satisfied; nobody read the output | Every loop ends in a page or a fix; count open fix PRs per incident |
| Updater spreading red (AutoBot-AI) | All in-flight PRs would inherit a broken base | Rebase on every main move with no green check | Update only from the verified-green SHA |
| Orchestrator merging failing tests (Gas Town, DoltHub) | Failing integration tests on master; hard reset; "None of the PRs were good" | Agents controlled the merge; checks were not the gate | githerd and agents never merge; required checks do |
| Orphans and prodding (Gas Town user) | 141 orphaned processes; agents need constant nudging; unclear why work stalled | No reaping; no process identity; no stall reason recorded | Record every process githerd starts; reap; record why each job ended |
| False completion (Anthropic, Steinberger, Gas Town) | "Done" while tests fail | The agent's claim was the signal | Verify outcomes on GitHub |
| Silent success (claude -p, Routines) | Exit 0 / green status with the action not done | Denials do not fail the run | Parse outcomes; never trust a status alone |
| Silent watcher (this repo, 2026-10-03) | Stuck-PR watcher dead a day, 23 PRs backed up | Script crashed in a loop with no alert | Watch githerd from outside; fail loudly |
| Red master unnoticed (this repo, 2026-10-02) | 2 hours red; PR count 14 to 22 | GitHub notifies only the triggering user; sessions worked PR by PR | Master first; closed tree; page when nobody has it |
| Green master, red PRs (this repo, 2026-10-03) | Every PR failed audit; master green | Master had not run CI since the advisory | Shared-cause detection on PRs |
| Hung subagents (this repo, 2026-09-18) | Review agents sat 80+ minutes on `git stash list` | A permission prompt nobody answered looks like a slow agent | Detect "waiting for permission" by hook, not by elapsed time alone |
| Chained waits that never finish (this repo, 2026-09-25) | Gate queues idle for hours | `pgrep -f` matched the waiting shell itself | Wait on explicit completion records, not process names |
| Runaway browsers (this repo, 2026-10-01) | 23 headless Chromium, 49 GB, swap full | Each agent's parallelism looked fine; nothing capped the total | Shared resources need a machine-wide cap, not per-agent restraint |
| Colliding releases (this repo, 2026-09-29) | A 3.0.0 published while another session built the grouped major | Sessions could not see each other's plans | One shared board of what every session is doing |
| Duplicate agent on one failure (this repo, 2026-09-30) | Two agents on the College football failure | No claim checked before starting | Atomic claims, checked before any work |
| Reviewer abandonment (study of 600 rejected PRs) | 38% of rejected agent PRs never reviewed | Generation outran review | WIP cap set by review capacity |
| Duplicate PRs (same study) | 23% of rejections | No claim step | Claims |
| Required AI review as a single point of failure | An expired OAuth token broke review on every PR | A required check depended on a credential | Keep AI review advisory, or fail open on infrastructure errors |
| Stale bots | Valid issues closed "without any context" | Timer-only rule | Evidence-gated proposals with grace and veto |

---

## 4. The two earlier designs: what is sound and what was a guess

### 4.1 Sound, and worth keeping in some form

These rest on the research, on GitHub's documented behavior, or on this repository's incidents, and
several were exercised by code on `feat/githerd`.

- **The master verdict.** Per-lane newest completed run, never going backwards by run id, red only
  after two sightings, re-runs replacing earlier attempts, a verified-green SHA used for anything
  that moves toward master, every lane the release waits on counted. Directly from 2.2 and 2.6.
- **"Why stuck" per PR**, with a fixed reason order, `UNKNOWN` mergeability treated as no data, and
  conflicts needing two sightings. Answers the polling lesson (2.8).
- **Breaking detection from the full commit list of the exact head**, unchecked counting as breaking.
  Matches the owner's auto-merge policy.
- **One write function with a dry-run gate**, every write recorded in an append-only ledger, and a
  test that asserts no write happens in dry-run. Cheap and it makes rollout safe.
- **Propose, grace, veto, then re-check before acting**, for closes and reverts, including the
  revert precondition that master's head is still the culprit and still red. Directly from 2.4 and
  2.9.
- **Owner-only input.** The trusted author is whatever account gh is logged in as, asked every poll,
  with no configurable list, and other accounts' text is filtered out of everything handed to an
  agent with a count of what was hidden. The repository is public; this is the main defense against
  prompt injection.
- **Attempt limits a fix loop cannot reset** (heads githerd's own work pushed do not reset a PR's
  counters). Prevents an agent from refreshing its own budget.
- **Config and instructions read from the default branch**, never a working tree, so a branch cannot
  loosen the rules that judge it.
- **Process identity by pid plus start time plus boot id**, and touching only processes githerd
  started. Answers the orphan and pid-reuse failures.
- **An outside watchdog**: an hourly `githerd/alive` status on master and a scheduled workflow that
  fails without it. Answers "who watches the watcher" (2.12).
- **The deterministic work queue** with a one-line reason per item and no weighted score. Explainable
  ordering is what makes the owner trust it.
- **Shared-failure detection** (dispatcher draft). Grounded in the 2026-10-03 incident.
- **The PHONE ALERTS BROKEN banner** when the notify command keeps failing. A notifier that fails
  silently is the same failure as a watcher that fails silently.

### 4.2 Guesses, or choices that went against the evidence

- **Headless runs as the workers** (headless design). Rejected by the owner, and the research agrees
  on the risk: headless runs fail silently and cannot be steered. Much of that design's size
  (credential-free environments, a shell tokenizer guard, sandbox handling, dollar accounting,
  checked pushes from the main checkout) existed only to make headless runs safe, and the sandbox it
  relied on turned out not to run in this container at all.
- **The tmux supervisor and its liveness signals** (dispatcher draft). Its own plan listed five
  spikes that had not been run: the Stop hook's real block limit and what counts as progress, the
  longest an MCP tool call may block (the on-call worker's 600-second long-poll depends on it),
  whether `respawn-pane -k` ends a session cleanly, whether a session is woken when a background
  command ends, and how a prompt typed into a tmux window behaves. The design was built on top of
  answers it did not have.
- **The progress heartbeat depends on the agent remembering to report** every 20 minutes and to
  "park" before long waits, in a design whose stated principle was "never rely on an agent
  remembering to loop". A session running a 25-minute pre-push gate without parking gets replaced
  mid-push. The liveness signal has to come from the session's own activity (hooks fire on every
  tool use) rather than from a voluntary call.
- **The on-call worker** idles in an interactive session that ends a turn every 10 minutes for days.
  Its context grows without bound and it will compact repeatedly, which is exactly when stated rules
  are lost (2.14). Starting a fresh session when urgent work appears is simpler and loses nothing.
- **Coordination by the agent's own judgment** (`independent`, `join`, `wait`) with code validation.
  Novel, untested anywhere in the research, and every job pays for it. The evidence (28% textual
  conflicts, 23% duplicates) argues for preventing overlap with claims and path-level checks first,
  and asking for judgment only when files actually overlap.
- **Invented constants.** Capacity `4 - floor(prsWaitingOnOwner / 3)`, a load-average pause, model
  escalation to a named model after two failures, slow retries every 2 or 24 hours. The research has
  one number on WIP (four or five streams, an opinion). These should be stated as starting values to
  tune, with the measurement that would tune them.
- **"Exhausted" work retried forever on a slow schedule and listed, not paged.** That is the magus
  shape (2.5): a loop whose escalation lands where nobody reads it.
- **The master-red page demoted to an informational line** once a worker took the incident. The
  research's first priority is a red-master signal the human actually receives; demoting it is safe
  only if githerd also pages when the worker's attempt fails or the incident outlives a deadline.
  The headless design's rule (page when nothing else will handle it, and again at 2 hours) is the
  better-grounded one.
- **Rules carried as prompt text for sessions holding the owner's credential.** The dispatcher draft
  gave workers the owner's gh token and relied on job "constraints" plus a few deny rules. The deny
  rules are the real control (2.14); the draft itself admitted the deny rules match command prefixes
  and do not cover the owner's own sessions running a job.
- **Working around servherd.** Both designs delete servherd's pm2 process and recreate it with
  autorestart on, because servherd lacks the option. That is a workaround of a tool defect in the
  wrong place; the fix belongs in servherd (the same principle this repository applies to
  graphty-element).
- **Dependabot alert polling as a separate urgent job kind** (dispatcher draft). Reasonable, but
  reactive to one incident; shared-failure detection already catches the effect, and an advisory
  with no patched version needs a decision, not a job.
- **Size.** Each design is about 114 KB and 1,600 lines, with a dozen job kinds and a dozen MCP
  tools. The research's working systems are small: one notifier, one required check, a label-only
  agent, a timer script. Size is itself a failure risk, because every unverified mechanism is a new
  way to get stuck.

### 4.3 Claude Code features neither design used, to check before building anything

The research notes list these without having read their pages. Any of them may replace custom
machinery, and building a supervisor before checking them repeats the "guessing" problem.

- **Agent view and background sessions** (`claude --bg`, `claude agents`, `claude respawn`,
  `claude daemon`). Possibly a built-in way to start, list and resume interactive sessions the owner
  can attach to, replacing the tmux supervisor.
- **Cloud sessions with queued follow-ups** (`claude -p "msg" --cloud <session-id>` queues a message
  into an existing cloud session from a script). A documented way to hand work to a session the
  owner can watch from the web or phone. Cloud sessions use a fresh clone and share rate limits.
- **Channels** ("CI can push a failure into the session"). Possibly the push path both designs
  dropped as unverified.
- **`/goal`** (a separate evaluator re-checks a condition after every turn) and **command-type Stop
  hooks** as the deterministic "do not stop until the job is done" gate.
- **Notification hook matchers** `permission_prompt` (about 6 seconds after a prompt appears),
  `idle_prompt` (about 60 seconds after finishing), `agent_needs_input`, `agent_completed`, and the
  **StopFailure** event (`rate_limit`, `overloaded`, `billing_error`, `authentication_failed`).
  Together these are a liveness signal that needs no cooperation from the agent.
- **Session-to-session messaging** (the ListAgents and SendMessage tools available in this
  environment). A native channel for one session to tell another "I hold this" or "master is red".
- **`/loop` with `.claude/loop.md`.** A bare `/loop` already tends the branch's PR (review comments,
  failed CI, conflicts) and expires after 7 days.

---

## 5. Corners the earlier designs did not cover

Things that will happen to a dispatcher of interactive sessions, from the incidents and the docs.

- **Auto mode falls back to prompting.** After 3 consecutive or 20 total classifier blocks, an
  interactive session in auto mode resumes asking for permission, and then waits forever if nobody
  is watching. The `permission_prompt` notification is the signal.
- **Rate limits and billing.** A session that hits a usage limit stops mid-job; StopFailure reports
  it. All sessions share one account's limits, so starting more sessions during a limit makes it
  worse. githerd must stop handing out work, not replace the "stalled" session.
- **Compaction drops rules.** A long job compacts; a `SessionStart` hook with matcher `compact` can
  re-inject the job's constraints.
- **The owner types into a worker.** A steered session may legitimately go off-plan. githerd must
  treat owner input as taking the session over, not as a stall.
- **Two sessions on one worktree.** Agents sharing a worktree read each other's new files as history
  (owner's recorded lesson). One job, one worktree, created from the green SHA.
- **Machine-wide shared resources.** Browsers (cap 4), the pre-push gate (a lock), Storybook and
  review servers (through servherd only). Per-agent restraint does not cap the total.
- **Commits that trigger no CI.** A push made with a token that does not trigger workflows leaves a
  PR with no checks forever; "checks never started" is its own why-stuck reason.
- **External checks that never report.** A required check waiting on an external service (visual
  review) is "waiting on owner", not "pending", and must never trigger a fix job.
- **Release sequencing across sessions.** Breaking changes from different sessions for the same
  package must be grouped; only githerd sees all open PRs.
- **Owner absent for days.** Nothing irreversible may skip its grace window, and urgent work must
  still move without the owner answering.
- **githerd itself is broken or out of date.** The daemon must run the default branch's code, fail
  loudly, and be checked from outside (the alive status and watchdog workflow).

---

## 6. Design rules that follow

These are the rules a new githerd design should satisfy. Each traces to a pattern or failure above.

1. **githerd reads facts and verifies outcomes.** No agent's claim closes a job, merges, or clears
   an incident; GitHub's state does (2.1, 2.12).
2. **Master first, then shared causes, then everything else.** Red master or a shared cause holds all
   other merges and all new work, and is the first thing any session hears about (2.2, 2.3).
3. **Only githerd's code and GitHub's required checks do irreversible things,** and only after a
   grace period with a veto when the step cannot be undone by a merge (2.7, 2.9).
4. **Every loop is bounded and ends in "done" or one page the owner receives,** never in a list
   nobody reads, never in silent retries (2.5, 2.13).
5. **Level-triggered reconciliation.** Poll and diff every tick; events only shorten the wait;
   debounce transient states (2.8).
6. **Liveness comes from the platform, not from the agent's discipline.** Hooks on tool use,
   Notification and StopFailure tell githerd a session is working, waiting for permission, idle, or
   out of quota; voluntary heartbeats are a bonus (4.2, 5).
7. **Hard rules are hooks, deny rules and branch protection;** prompts explain them (2.14).
8. **Work in flight is capped by the owner's review capacity,** and the cap is visible with its reason
   (2.11).
9. **One job, one fresh session, one worktree, one claim,** with the previous attempts' findings
   carried in the job record (2.15).
10. **Only the owner's text reaches an agent** in anything githerd hands out (4.1).
11. **githerd is watched from outside itself** and says so loudly when it, its notifier or its
    GitHub access is broken (2.12).
12. **Prefer a Claude Code or GitHub feature over custom machinery,** and verify any mechanism the
    design depends on before designing on top of it (4.3).
13. **Small.** Every mechanism is a way to get stuck; each must earn its place against a named
    failure.

---

## 7. Gaps in the evidence

- No vendor publishes a fix success rate for any CI-fixing agent, and nobody has measured how often
  agent fixes weaken tests.
- No source measures AI-assigned priority against a human's, or the precision of AI "already fixed"
  detection at scale.
- The WIP figure of four or five concurrent streams is practitioner opinion.
- No first-hand report quantifies sessions stuck overnight on a permission prompt, though tools exist
  for exactly that case.
- Agent view, background sessions, Channels, `/goal`, Projects and desktop scheduled tasks were named
  but not read; their limits are unknown (section 4.3).
- No authoritative source covers Nx release behavior when master is red, or releasing an older green
  SHA while master is red.
