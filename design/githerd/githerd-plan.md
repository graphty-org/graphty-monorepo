# githerd implementation plan

This plan builds `githerd-design.md` (section numbers below refer to it). It has two parts:

1. **Spikes**: every platform or GitHub behavior the design leans on that has not been verified on
   this machine. Each is a short experiment with a pass condition and a fallback that the design
   already names. A spike runs before the first task that depends on it, and its result is written
   into `evidence/platform-facts.md` or `evidence/repo-facts.md`, so the design's citation moves from
   `[S n]` to a verified fact.
2. **Milestones**: independently testable tasks, in order. Each task lands as its own signed
   conventional commit with scope `githerd`.

The code on branch feat/githerd predates the design. Section 13 of the design says what each module
keeps and loses; tasks below name the module they rework.

## Rules for every task

- Plain `.mjs` with JSDoc types, Node standard library only, modeled on `visual-review/`. Tests are
  vitest in node (`githerd/test/*.test.mjs`). Coverage 80 percent lines, functions and statements,
  75 percent branches; `pnpm exec nx run githerd:coverage`, `githerd:lint` and
  `./tools/run-knip.sh --workspace githerd` pass at the end of every task.
- Tests that create git repositories isolate git config through `GIT_CONFIG_GLOBAL`
  (`visual-review/test/helpers.mjs`). Tests that spawn processes kill what they started and assert
  nothing is left. Timing is asserted by what was called, never by wall-clock thresholds.
- Never run git stash, reset, checkout of a file, clean or rebase. Scratch files go in
  `tmp/githerd/<task>/`. Servers only through servherd, stopped afterwards.
- No test touches the real GitHub, servherd or `claude` unless the task says it is a spike or a
  smoke test. Nothing writes to GitHub until its write group is `acting` (milestone 8).
- Plain ASCII everywhere.

---

## Part 1. Spikes

Each spike: the question, the experiment, the pass condition, the fallback if it fails, and the
tasks that wait for it. Results of the spikes run so far, with commands and output, are in
`evidence/platform-facts.md` sections 7, 8, 9 and 10; two more ran in section 7 that have no row: the tmux driving
probe (7.3) and the MCP call-length probe (7.4). Spikes that write to GitHub run in a private scratch repository under the owner's
account, named for the spike and the date, never on graphty-org; the token cannot delete
repositories, so the owner deletes it afterwards. Group A's is
apowers313/githerd-spike-2026-10-03 (`evidence/platform-facts.md` section 9).

### Group A: GitHub (run before milestone 3)

| Spike | Question and experiment | Pass | Fallback | Blocks |
|---|---|---|---|---|
| S1 | Dropped 2026-10-03: githerd never merges (Mergify does, design 4.6), and a commit status belongs to one sha, so a moved head simply has no `githerd/merge`. Replaced by coordination task C1's verification | - | - | - |
| S2 | Does `PUT /pulls/{n}/update-branch` with `expected_head_sha` work while the repository's `allow_update_branch` is false [R1]? Call it on a test pull request | Branch updated; a stale `expected_head_sha` is refused | Always use the local merge path through the push queue | 3.4 |
| | **Ran 2026-10-03 [PF 9.1]: passes. With `allow_update_branch` false the call answers 202 and GitHub makes a signed merge commit that starts CI; a stale `expected_head_sha` gets 422. No design change** | | | |
| S3 | Does `PATCH /pulls/{n}` with `base=master` retarget a stacked pull request and trigger CI? Stack a test pull request on another, merge the base, retarget | Base changes; CI runs on the child | None: deleting the merged base branch through the API closes the child (see the result) | 3.4 |
| | **Ran 2026-10-03 [PF 9.2]: the base changes, CI does not run (a base change is the `edited` action, which no workflow listens to), and the child keeps checks from its old base. Mergify's update of a behind pull request runs CI on the new base, and a retargeted child is always behind. The old fallback, deleting the base branch, CLOSED the child and is struck. Design 3.3, 3.10 and 4.6 changed** | | | |
| S4 | Does a conditional GET at zero remaining return 304 or 403? Observe when another session drains the budget, or with a throwaway token | Recorded either way | If 403: the reserve of 300 calls is kept for polls too | 1.2 |
| | **Ran 2026-10-03 [PF 9.3] on the unauthenticated bucket (draining the owner's would blind every session): 403, so the fallback applies. With the owner's token a 304 costs nothing. Design 3.2, 4.2 and 4.11 changed** | | | |
| S5 | Does `GET /advisories` honor `If-None-Match`? Does `sort=updated` show the braces advisory of 10-02 with its update time? | 304 on the second request; the advisory present | Activity-triggered check at most every 15 minutes | 1.4 |
| | **Ran 2026-10-03 [PF 9.4]: passes; 304 on the second request, the braces advisory 15th on page 1 with `updated_at` 2026-10-02T22:36:34Z. The fallback is dropped; design 3.2 and 4.2 changed** | | | |
| S6 | Do check runs carry `annotations_count`, and do annotations carry the balance text, runner loss, deprecation warnings and the release gate's `::notice::` text? Read annotations of recorded release skips and GPU failures | Counts present; texts found where expected | Read the job log only; the classifier loses the annotation-only cases (recorded as residual risk) | 1.4, 3.3 |
| | **Ran 2026-10-03 [PF 9.5]: counts present; annotations carry deprecations, the release `::notice::`, step timeouts and "lost communication". But the balance text is only in a step name and a runner shutdown only in the log, and both runner-loss jobs conclude `failure`. The classifier reads step names, annotations and the log; design 3.1, 3.2, 4.2 and 4.4 and the catalog changed** | | | |
| S7 | Does a GPU job rejected for balance fail fast and cost nothing? Where does the text appear? Read the recorded balance failures' timings and the machine.dev billing page | Fails within minutes, no charge | No backoff re-dispatch; the item ends only on the owner's answer or a later green run | 3.3 |
| | **Ran 2026-10-03 [PF 9.6]: passes. Rejected about 5 s after the job is created; four rejections on 10-03 over three hours left the balance at $-0.8250, so none was charged (the billing page was not read). Backoff re-dispatch is on; design 3.2 and 10.3 changed** | | | |
| S8 | Does `gh run rerun --job <job id>` on an old run re-test that run's commit, and how are attempts numbered? Re-run one job of an old green CI run | Same head sha; `run_attempt` incremented | Dispatch the workflow on the old commit (`workflow_dispatch` where the workflow allows it) | 3.3 |
| | **Ran 2026-10-03 [PF 9.7] in the scratch repository: passes; same run id and head sha after master moved, `run_attempt` 2, a new job id. `gh` refuses a run id together with `--job`, so the command was `gh run rerun <run> --job <id>` and is corrected here and in design 4.5** | | | |
| S9 | Do queued jobs on the rented label expose `created_at` and a null `started_at` while queued? What is the worst pickup time recorded? Read the jobs list during a GPU run and the recorded month | Fields present; a pickup bound computed | A fixed 20-minute bound | 1.3 |
| | **Ran 2026-10-03 [PF 9.8]: fields present, but `started_at` is NOT null while queued (it equals `created_at`), so queued means status `queued` and no `runner_name`. Worst pickup on the rented label over 227 jobs since 09-18: 926 s (median 65 s), the seed for its bound. Design 3.10 and 4.3 changed** | | | |
| S10 | Dropped 2026-10-03: the owner decided no separate GitHub App for now (design 12.3, decision 2) | - | - | - |
| S11 | Does the current token return `github-authentication-token-expiration`? Read one response's headers | Recorded either way | Absent: nothing to watch until the token type changes | 1.2 |
| | **Ran 2026-10-03 [PF 9.9]: absent (an OAuth token with scopes gist, read:org, repo, workflow). The header check stays as a guard; design 3.2 and 4.11 note it** | | | |

### Group B: Claude Code (run before milestone 5, on a private tmux socket, with the configured model)

| Spike | Question and experiment | Pass | Fallback | Blocks |
|---|---|---|---|---|
| S12 | Does a generated `--settings` file merge with the owner's user settings so that its deny rules win over his allow-all, `mcp__githerd__*` and `Bash(gh pr create:*)` run without a prompt in `--permission-mode default`, `AskUserQuestion` and `Workflow` are denied, and `enabledPlugins` turns a plugin off? | Every item holds | Ask for the rules in the committed project settings by pull request; deny through the guard instead | 5.3 |
| | **Ran 2026-10-03 [PF 10.1]: passes, every item, against a control without the file. Path denies must be `Edit(...)` rules (`Write(...)` rules are ignored), and the main checkout's local settings apply in worktrees [PF 10]. Design 7.2 changed; it also turns prompt suggestions off** | | | |
| S13 | Does Opus 5.5 (and Fable) obey a Stop-hook block reason? (Measured on Haiku only [PF 3.1]) | The reply carries a token from the reason | The same text goes into the doorbell after the stop | 5.6 |
| | **Ran 2026-10-03 on Opus 5.5 [PF 7.1]: passes when the reason agrees with the user; refused openly when it contradicts an explicit user instruction. Design 7.1 and 7.3 changed. Fable not run (the configured model is Opus 5.5 [PF 10])** | | | |
| S14 | Does `claude --resume <id>` in a new tmux window restore the conversation and fire SessionStart with source `resume`? | Both | Fresh sessions with recorded findings | 5.9 |
| | **Ran 2026-10-03 [PF 10.2]: passes; the conversation is back, SessionStart says `resume`, same session id and name, new pid. Design: no change** | | | |
| S15 | Does StopFailure fire with `rate_limit`, `overloaded`, `billing_error`, `authentication_failed`? Does UserPromptSubmit fire for tmux-typed text with the text in its input? | Both | Read the transcript's last record for errors; read user records for the nonce | 5.6 |
| | **Ran 2026-10-03 [PF 10.3] against a local fake API: StopFailure fires instead of Stop with `rate_limit`, `authentication_failed`, `billing_error`; a 529 arrives as `server_error`, not `overloaded`. UserPromptSubmit carries typed text, but also the launch prompt and every background `<task-notification>`. Design 4.10, 7.6, 8.3 and the steering row changed** | | | |
| S16 | Does SessionStart with source `compact` fire and does its output reach the model? `/compact` in a probe | Model quotes the re-injected record | Re-inject on the next Stop | 5.6 |
| | **Ran 2026-10-03 on Opus 5.5 [PF 10.4]: passes; Opus quoted the re-injected record token. Design: no change** | | | |
| S17 | Does a PostToolUse hook's `additionalContext` reach the model? | Model quotes it | News reaches the worker only through tool results and the push refusal | 5.6 |
| | **Ran 2026-10-03 on Opus 5.5 [PF 10.5]: passes; Opus relayed the news with its token and did not treat it as an injection. Design: no change** | | | |
| S18 | With `env -i`, can a hook or the Bash tool see the Pushover variables (does the Bash tool re-source `~/.bashrc`)? Probe worker runs `env \| grep -c PUSHOVER` in Bash and in a hook | 0 in both | Banner "worker paging not isolated"; offer the owner the one-line `GITHERD_JOB` check | 5.3 |
| | **Ran 2026-10-03 [PF 7.2]: passes, 0 in both; Claude Code sets its own `CLAUDE*` variables, now an allow-list in the self-test** | | | |
| S19 | (2026-10-03 [PF 7.6]: not testable without spending; binary strings recorded) What does the usage-limit screen look like (text, menu options, extra-usage state, reset time), how is a session's account identified, and is "used N% of your weekly limit" readable from a pane? Record the first real occurrence; capture with a nearly spent probe if one is available | Markers and fields recorded | Treat any unknown screen as "do not type"; the worker-hours cap stays | 5.7 |
| S20 | Does the registry show a permission prompt raised inside a subagent? | `waiting` with `permission prompt` | Pane matching only | 5.7 |
| | **Ran 2026-10-03 [PF 10.6]: passes; registry `waiting` / `permission prompt`, pane headed "from the general-purpose agent", PermissionRequest carries `agent_id`. Design 7.5 cites it** | | | |
| S21 | Does CPU time of the session's process tree separate a long gate run from a hung command? | Grows for the gate, flat for `sleep` | Per-command bounds from the push queue plus `githerd_expect` | 5.7 |
| | **Ran 2026-10-03 [PF 10.7]: passes for the descendant processes only (0 ticks in a hang, 100 ticks per second spinning); the claude process itself burns CPU while its command hangs. Design 7.5 and the stall row changed** | | | |
| S22 | Does `tmux list-clients` show which window an attached client views, on the `-L githerd` socket? | Yes | Ring only when no client is attached | 5.7 |
| | **Ran 2026-10-03 [PF 10.8]: passes; `list-clients` names the viewed window, and `list-windows` gives `#{window_active_clients}` directly. Design 7.5 changed** | | | |
| S30 | What do the known dialogs look like in a pane (permission, plan approval, pickers, update notice, MCP authentication banner)? Capture each (2026-10-03 [PF 7.1, 7.3]: permission, picker and the idle prompt box captured; the rest remain) | A marker list with a test per capture | Any unknown screen blocks typing | 5.7 |
| | **Ran 2026-10-03 [PF 10.9]: plan approval captured (registry also says `permission prompt`); prompt suggestions found as dim ghost text in the input box, turned off by `promptSuggestionEnabled: false`; an MCP server needing authentication shows no screen; update notices are footer text (from the binary, not captured). Design 7.2 and 7.5 changed** | | | |
| S32 | What does `background_tasks` in the Stop input hold (ids, output paths)? | Output paths present | Use the session's task directory listing | 5.6 |
| | **Ran 2026-10-03 [PF 10.10]: entries carry id, type, status, description and command, but no output path; the fallback holds, the path is derived from the id. Design 7.3 changed** | | | |
| S33 | Does a PreToolUse matcher on the Agent tool receive enough to count concurrent subagents and refuse a third? | Refusal shown to the model | Deny the Agent tool for workers entirely | 5.4 |
| | **Ran 2026-10-03 [PF 10.11]: passes; the third concurrent Agent call was refused and the model reported it. Hidden agents fire SubagentStop without a start, so the guard counts by agent id. Design 10.1 changed** | | | |

### Group C: This machine and the repository (run before milestone 2 or 4)

| Spike | Question and experiment | Pass | Fallback | Blocks |
|---|---|---|---|---|
| S23 | Does a shared `NX_CACHE_DIRECTORY` work across worktrees (hits on the second worktree, no corruption under two concurrent builds)? | Hits and clean builds | Per-worktree cache; the push bound is raised to the cold-build time | 4.2 |
| | **Ran 2026-10-03 [PF 8.1]: passes without the variable. Nx 22.7 already shares the main checkout's cache with every worktree; two concurrent cold builds were clean and identical. With `NX_CACHE_DIRECTORY` set, Nx reported a hit and restored nothing, so it is never set. Design 4.8 and 7.1 changed** | | | |
| S24 | With `flock` added to `tools/prepush.sh`, are waiters visible in `/proc/locks` and is the lock released when the holder is SIGKILLed? | Both | Count `prepush.sh` processes | 4.1 |
| | **Ran 2026-10-03 [PF 8.2]: release passes when the holder's whole process group dies (a shell step inherits the descriptor). `/proc/locks` fails: it hides a lock taken by `exec 9>file; flock 9` and its waiters. Holder and waiters come from `/proc/<pid>/fdinfo` instead. Design 4.8 changed** | | | |
| S25 | On a container restart, does PID 1's start time change while `boot_id` stays? Observe at the next restart | As expected | Treat any unexplained pid mismatch as a restart | 1.9 |
| | **Ran 2026-10-03 [PF 8.3], at a real container restart: passes, `boot_id` unchanged and PID 1's start time changed** | | | |
| S26 | With servherd passing `autorestart` and `exp_backoff_restart_delay` to pm2, does a killed daemon come back? (No supervisord entry: the owner's decision 3 in design 12.3) | Yes | The MCP-server, launcher and `githerd ensure` restarters only | 2.1 |
| | **Ran 2026-10-03 [PF 8.4]: passes. pm2 with both options restarted a SIGKILLed process in 155 to 254 ms; through today's servherd it stays dead. A container restart kills pm2 itself, which the session launchers and `githerd ensure` already cover** | | | |
| S27 | Is githubstatus.com's components JSON readable without auth, and does it name Actions? | Yes | The two-heads symptom alone | 1.4 |
| | **Ran 2026-10-03 [PF 8.5]: passes; HTTP 200 without auth, Actions has id `br0l2tvcx85d`, `If-None-Match` gets 304** | | | |
| S28 | Does `git commit-tree -S` in a scratch repository succeed non-interactively with the owner's gpg-agent from a process started like a worker? | Signed object created in under a second | Probe by a signed commit in the job's worktree on a throwaway branch | 5.2 |
| | **Ran 2026-10-03 [PF 8.6]: passes in 6 ms with the owner's SSH signing variables (`GIT_CONFIG_*` from his user settings); without them git uses his gpg key and fails (pinentry needs a terminal). Design 7.1 changed: the variables go on the worker line and on the daemon's own git commands; no `GPG_TTY`** | | | |
| S29 | Does a real rejects-only Finish comment match the parser? Is `visual-review update <pr>` safe to run unattended (no prompt, exits non-zero on a non-baseline conflict)? | A fixture from a real comment parses; update behaves | Owner item with the exact command for baseline-only conflicts | 3.4 |
| | **Ran 2026-10-03 [PF 8.7]: passes. Real comments (a rejects-only one on 641, a mixed one on 409) match the marker and their blocks parse; copies are fixtures in `evidence/spikes-2026-10-03/`. `visual-review update` prompts for nothing and exits 1 with nothing changed on a refusal, but pushes with `--no-verify`, so the daemon runs it inside its push queue (design 3.3 changed)** | | | |
| S31 | Does `nx release --dry-run` in the reference worktree say whether anything would publish (version plans present or not)? | Clear yes or no | Release pending only from npm against tags and version commits | 1.6 |
| | **Ran 2026-10-03 [PF 8.8]: passes; 7 s, "No files would be changed" or one "New version <v> written to manifest" line per bumped project. nx ignores `release-hold.json`, so the dry-run runs after `tools/release-hold.mjs apply` (design 4.3 and 4.9 changed)** | | | |

---

## Part 2. Milestones

### Milestone 1: facts, classification and decisions, as pure code over recorded data

Outcome: every rule that turns GitHub facts into decisions is a pure function, and the replay suite
proves it against the recorded month. Nothing runs against GitHub.

| Task | Build | Test | Done when |
|---|---|---|---|
| 1.1 Replay harness | Copy the recorded month (`tmp/githerd-v2/incidents/`, about 2 MB) into `githerd/test/replay/data/`; a fixture builder that turns it (`runs-master.jsonl`, `runs-pr.jsonl`, `failed-jobs.jsonl`, `prs.json`, `issues.json`, the logs) into a minute-by-minute sequence of poll answers, including the two backwards answers of 10-02 | The builder's own tests; a sequence for one known day matches the record | `test/replay/` runs a scenario end to end in under a minute |
| 1.2 Polls and sightings (`github.mjs`, `master.mjs`) | Persisted ETags; sighting keyed on (run id, run attempt, `updated_at`); `since` overlap and dedupe; rate tiers and reserve | Replay: backwards answers are no sighting; re-run attempts are seen | Idle replay days cost only 304s |
| 1.3 Lane facts | Lane verdict for every workflow, red-since, green and CI-green commits, queue age | Replay: the 11.5-hour stretch of 10-01 gives four keys with the true red-since | Facts match the record |
| 1.4 Classifier | The ordered classes of design 4.4 with one pattern table and a fixture per pattern from the recorded logs; drift diff of `Set up job` | One test per pattern; replay: the 10 Build and 7 Chromatic bursts become shared incidents at the second pull request; audit failures on dependency-free pull requests are master-side at the first | Every recorded failure gets a class a person agrees with (printed list reviewed in the commit) |
| 1.5 `githerd/merge` decision and stacks (`prs.mjs`) | Lines 1 to 8 of design 4.6 and the status each yields (`success`, `failure` with the first failing line, `pending` only while evaluating); stack chains; patch id excluding `visual-baselines/**` | Unit tests per line; replay: every merge that landed while a gating lane that can affect it was red would have had `failure`, and every other `failure` is printed for review | The printed list is reviewed |
| 1.6 Release truth | Tags against npm against version commits; release pending with the dry-run answer (its per-project "New version" lines, after `tools/release-hold.mjs apply`; S31); gate notice reading | Fixtures for each half-state, a 409, an expired-artifact skip | Each case gives the right incident or none |
| 1.7 Incident procedure | The outcome table of design 4.5 as a pure function of re-run results and suspects | Unit tests per row | The flaky-benchmark scenario reverts nothing |
| 1.8 Queue and records (`queue.mjs`, `board.mjs`) | Job kinds, states, deadlines with pauses, budgets, queue order, claims with snapshot versions and cycle refusal, the invariant check | Unit tests per transition and per pause; invariant violations produce faults | Every state has a tested exit |
| 1.9 State, liveness and fatal mode (`store.mjs`, `daemon.mjs`, `proc.mjs`) | `~/.githerd/` layout, `alive` and `progress`, start counter, lock with fixed cwd, spool, ledger replay, container restart by PID 1 start time, fatal mode on uncaught exceptions | Crash tests: kill mid-write; three starts in 10 minutes enter fatal mode; a stale lock is taken | No test leaves a process |
| 1.10 Board and CLI read verbs (`cli.mjs`) | `status`, `board`, `why`, `mode`, reading `state.json` when the daemon is down | Snapshot tests of board text from replay states | `githerd status` answers with the daemon stopped |

### Milestone 2: the read-only daemon on the real repository

Outcome: githerd runs forever on this machine in dry-run, and its would-dos are compared with what
actually happened.

| Task | Build | Test | Done when |
|---|---|---|---|
| 2.1 servherd restart | In the servherd repository: an `autorestart` option (with `exp_backoff_restart_delay`) on its start command and MCP tool; through its own pull request and tests (needs S26) | servherd's tests; S26's kill test | A killed process returns |
| 2.2 Install, launcher and `ensure` (`launcher.mjs`) | `githerd install` (servherd command with fixed cwd and `env -i`); `githerd ensure`; the MCP server's and the session launcher's `alive` check and restart lock; the pm2 re-creation workaround removed | Launcher tests with a fake servherd | One daemon after concurrent starts from three cwds and from `githerd ensure` |
| 2.3 Two busy days in dry-run | Run the daemon; review the ledger's would-dos against the record: red-master detection, classification, holds, merge decisions, release truth | A written comparison in the pull request description | No would-do a person judges wrong remains unexplained |

#### How to run 2.3

The shared daemon runs only master's copy of `githerd/`, and this branch is not on master, so the
two days run this worktree's code as the development daemon (`githerd dev`: its own servherd name
`githerd-dev`, its state in `<worktree>/.githerd-dev/`, never above dry-run, pages to the ledger
only). Nothing in it writes to GitHub; every write is a `would-do` ledger line. It starts the way
the shared daemon does (servherd's `--autorestart`, `env -i`, its environment from
`.githerd-dev/daemon-env.json`, written from the shell that first starts it), so the two days also
test that start path: start it from a Claude session of the owner's, which has the `GIT_CONFIG_*`
signing variables and the Pushover keys.

The development daemon starts runs, code-editing kinds (master-red, pr-fix, pr-conflict, backlog)
included, within the dry-run budget. Two facts decide which kinds may run in the soak:

- The Bash sandbox does not run on this machine (`githerd/CLAUDE.md`). Unsandboxed code-editing
  runs are accepted for the soak: the boundary is owner-only input and the actor's checks before a
  push, and in dry-run nothing is pushed.
- Manual check 4 of `githerd/CLAUDE.md` (a signed commit from a run spawned under servherd) must
  pass before any code-editing run. Run on 2026-10-03, it failed: the run's git config has no
  `gpg.format=ssh` and a run's environment drops the owner's `GIT_CONFIG_*` variables, so the
  commit goes to gpg, which has no such key. Until it passes, the soak keeps code-editing kinds
  off (step 0).

0. **Check signing, and keep code-editing runs off until it passes.** Run check 4 the way
   `githerd/scripts/sign-check.mjs` describes (a one-shot servherd server under `env -i` with the
   development state directory), record its `sign-check.json` in `githerd/CLAUDE.md` under check
   4, and remove the servherd entry. While it fails, copy `githerd.config.json` to
   `tmp/githerd/two-days/githerd.config.json`, set `runs.caps` `budgetUsd` to 999 for
   `master-red`, `pr-fix`, `pr-conflict`, `backlog` and `backlog-high` (a run whose budget exceeds
   the day's never starts; read-only kinds still run), and use that file as `GITHERD_CONFIG` in
   step 2. The ledger then shows those kinds as "never fits the day", which is expected.
1. **Pick the days.** Two weekdays the owner expects to be busy (at least 40 master commits a day,
   R17). Before starting: `uptime` (load below 16), `gh auth status` logged in as the owner, and
   `gh api rate_limit` with more than 3,000 core calls left.
2. **Start it** from the worktree:
   `GITHERD_CONFIG=$PWD/githerd.config.json node githerd/bin/githerd.mjs dev`. Check with
   `GITHERD_STATE_DIR=.githerd-dev node githerd/bin/githerd.mjs mode` that every write group is
   dry-run, and with `... status` that the first poll completed and the trust login is the
   owner's.
3. **Watch it twice a day** (`GITHERD_STATE_DIR=.githerd-dev` on each command): `githerd status`;
   the ages of `.githerd-dev/alive` (under 20 s) and `.githerd-dev/progress`; no `FATAL` file;
   `githerd ledger --since 12h --kind fault` empty or explained. A daemon that died is a finding:
   record its log (`servherd logs githerd-dev`) before starting it again.
4. **After 48 hours, collect both sides** into `tmp/githerd/two-days/`:
   - githerd's view: `githerd ledger --since 2d > ledger.jsonl`, and `state.json`.
   - the record: master's runs of every workflow in the window
     (`gh api "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&created=>=<start>" --paginate`),
     the failed jobs' names, steps and annotations, the pull requests merged in the window
     (`gh pr list --state merged --search "merged:>=<start>" --json number,mergedAt,headRefOid`),
     the tags and npm versions published (`git tag --contains <start commit>`,
     `npm view <package> time --json`), and the issues opened.
5. **Compare, category by category**, one table each:
   - red-master detection: every red stretch of a gating lane, its true first red run and green
     end against githerd's red-since and green, and how many polls late githerd was;
   - classification: every failed job, githerd's class against the class a person gives it after
     reading the log;
   - holds: every would-hold and would-release against what was merged meanwhile;
   - merge decisions: every `githerd/merge` would-do status per pull request head, and every merge
     that landed while githerd's status for that head would have been `failure`;
   - release truth: every release run, tag and npm version against githerd's release state, and
     any half-state it raised.
6. **Judge.** Every row a person judges wrong is fixed in a commit on this branch with a replay
   test from the recorded answers, or explained in the table with the reason it is acceptable.
   Paste the tables into pull request #739's description.
7. **Stop it**: `servherd stop githerd-dev`, then `servherd remove githerd-dev`; check that no
   `githerd-daemon.mjs` process is left (`pgrep -f githerd-daemon.mjs`).

### Milestone 3: the daemon's own actions on GitHub

Each task adds its write group in dry-run first; it acts only in milestone 8.

| Task | Build | Test | Done when |
|---|---|---|---|
| 3.1 Write function | One write function with mode gate, ledger, read-back and next-poll confirmation, on the owner's `gh` token with the reserve | Dry-run makes zero writes; a write that does not stick is retried once and shown | Write function ready |
| 3.2 `githerd/merge` poster | Post the status of 1.5 on every open pull request head into master within one reconcile of a new head (Mergify's update merges included), and otherwise only on a change; native auto-merge disarming; the invariant check that master's `.mergify.yml` requires `githerd/merge` (banner until C1 lands) | Fake GitHub tests: a new head gets a status in one reconcile; a red lane turns every affected pull request to `failure` and back to `success` with one write each; no `pending` outlives one reconcile | Group `statuses` ready |
| 3.3 Incident actions | Red-head re-run, parent re-test, revert pull request, intermittent issue, backoff re-dispatch for paid capacity, CI re-run for expired artifacts, lane-not-progressing (after S6 to S9) | Replay plus fake GitHub; the paid-lane budget is never exceeded | Group `incidents` ready |
| 3.4 Updates and stacks | Update paths in order (review tool, update-branch, local merge through the push queue), child updates and retargets (after S2, S3, S29) | Fake repositories with stacks and baseline-only conflicts | Group `upkeep` ready |
| 3.5 Owner items, paging and presence (`notify.mjs`) | Items on GitHub or the board, batching, change-only repeats, presence, the daily digest, "phone alerts broken" | Unit tests; replay of an absent week sends at most one digest a day | Group `owner-items` ready |
| 3.6 Proposals | Duplicate, obsolete, already-merged and not-needed closes with confirmation and grace counted in owner-present days; vetoes | Unit tests | Group `proposals` ready |

### Milestone 4: repository changes

| Task | Build | Test | Done when |
|---|---|---|---|
| 4.1 The machine's push queue | Dropped as first planned (a `flock` in `tools/prepush.sh` would make the owner's three push slots one gate at a time). githerd's pushes and the reference worktree's gate go through `tools/push-queue.sh`, an incident's fix as `critical`; the board reads its tickets | A githerd push and a session's push share the three slots; a critical push goes first; time waiting in the queue is not charged to the gate's bound | Merged to master |
| 4.2 Shared Nx cache | Nothing to configure: Nx 22.7 shares the main checkout's cache with every worktree (S23). `NX_CACHE_DIRECTORY` is left out of every environment githerd starts, and a job worktree's preparation fails when a built package has no `dist` | A fresh worktree's build hits the cache and has its outputs; the environment builder never passes the variable | Documented in `githerd/CLAUDE.md` |
| 4.3 Project settings | Register githerd's hooks in `.claude/settings.json` and its MCP server in `.mcp.json` (Claude Code reads a project's MCP servers only from `.mcp.json`; settings files have no key for them), both pointing at `~/.githerd/graphty-monorepo/current/` and silent until that exists | Owner session start prints the status line | Merged to master |
| 4.4 Config | `githerd.config.json` with bounds for every number and the model allow list | Config tests | Merged to master |

### Milestone 5: the worker platform

| Task | Build | Test | Done when |
|---|---|---|---|
| 5.1 Reference worktree (`worktrees.mjs`) | Locked detached worktree at the green commit, refreshed on moves; audit exactly as `ci.yml` runs it; commitlint; release dry-run; gate on the green commit; failures are platform faults | Fake repository tests; the 10-02 advisory fixture fails the audit | Facts from it feed milestone 1's functions |
| 5.2 Job worktrees | Detached worktrees, lock, install, Nx build, smoke test, holder detection, salvage branches, removal without `--force`, signing probe with the SSH signing variables (S28) | Fake repository tests | A failed preparation is `faulted`, never a session |
| 5.3 Generated settings and environment | `settings.json`, `mcp.json`, `env -i` allow-list (with the owner's `GIT_CONFIG_*` signing variables, S28), runtime allow overlay (after S12, S18) | Snapshot tests of generated files | S12 and S18 pass with them |
| 5.4 The guard (`bin/githerd-guard.mjs`, `shellwords.mjs`) | Every refusal of design 10.1, the write log, Edit and Write path checks, the Agent and browser caps (after S33) | One test per refusal and per allowed alternative | Guard tests pass |
| 5.5 MCP tools (`mcp.mjs`, `schema.mjs`) | The eleven tools with schemas, protocol version, session identification | Schema tests; refused calls have no effect | Tools answer against a fake daemon |
| 5.6 Hooks | SessionStart, UserPromptSubmit, Stop gate, StopFailure, Notification, PostToolUse news, spool and fail-open counting (after S13 to S17, S32) | Hook tests with recorded inputs from `platform/exp3*/hook-input.log` | Hooks never make a network call |
| 5.7 tmux launcher, watchdog and doorbell | Dedicated socket, window start, registry wait, pane capture and screen matching (fixtures from the captures of PF 7.3, 10.6 and 10.9), doorbell with verification, progress signals, recycling, steering (after S19 to S22, S30) | Tests against a fake `claude` that prints recorded screens | A doorbell is never typed into a dialog capture |
| 5.8 Push queue (`actor/push.mjs`) | Priority queue, pushes as tracked children with hooks, gate output classification, wait state, results as news | Fake remote with a fake gate | Pushes survive a worker's death |
| 5.9 Death and recovery | `/proc` cwd sweep, `index.lock` removal, GitHub re-read, death counting, resume or fresh (after S14) | Kill a fake worker mid-push | The job continues with correct news |
| 5.10 Platform self-test | The checks of design 11.4 with the real command line, on its own socket | Run on this machine | Passes on Claude Code 2.1.288 |
| | **Ran 2026-10-04 (`githerd selftest`, `lib/selftest.mjs`) on Claude Code 2.1.289, the version installed by then, with Opus 5.5, on socket `githerd-selftest`: passes, every check including resume and the weekly limit ("77% used, resets Oct 8, 3pm (UTC)" from `/usage`). The socket, the worktree and the sessions were gone afterwards. The first run failed two checks, both fixed: Claude Code 2.1.289 sets `CLAUDE_EFFORT` itself (added to the allow list), and a failing `gh pr create` fires no PostToolUse (the check reads the guard's write log). It also found the installed guard never ran: through the `current/` symlink it did not recognize itself as the entry point, so every call was allowed; fixed in `bin/githerd-guard.mjs`. The `gh pr create` names a repository that does not exist, so gh stops at a read and nothing is written. Design 11.4 changed** | | | |

### Milestone 6: job kinds

| Task | Build | Test | Done when |
|---|---|---|---|
| 6.1 Job texts | One text per kind: target, done-condition in words, findings, rules, review rubric | Snapshot tests | Reviewed for plain language |
| 6.2 Done verification | Each kind's done-condition against GitHub, the ancestor rule, defects check | Unit tests per kind | `githerd_done` refuses every false claim in the fixtures |
| 6.3 Owner layer | `githerd_ask_owner`, `githerd_record`, orders and policies, re-park without a page | Unit tests | Items behave as design 5.6 |
| 6.4 Smoke test with one real worker | One `issue` job on a low-priority issue, end to end, with `githerd/merge` still advisory | Manual, watched | The job ends `done` with a pull request and no owner page |

### Milestone 7: self-update and configuration safety

| Task | Build | Test | Done when |
|---|---|---|---|
| 7.1 Self-update | `versions/<sha>/`, replay gate, protocol test, self-test, rollback | A deliberately broken version rolls back | Rollback is loud |
| 7.2 Version skew | Protocol versions; previous protocol served while old sessions live | Old client against new daemon | No attempt charged for a mismatch |
| 7.3 Config adoption | Last-good file, replay gate, revert pull request on refusal | A harmful config (a write group to `acting` without coverage) is refused | Fatal mode only with no good config ever |

### Milestone 8: rollout

Write groups: `statuses`, `upkeep`, `incidents`, `owner-items`, `proposals`, `workers`. There is
no `merges` group: githerd never merges.
A group moves to `acting` by a config change on master only after its ledger covered at least one
real occurrence of each situation it acts on, with would-dos matching what should have happened
(`githerd mode` shows the coverage).

1. `statuses`, posting on every open pull request for one busy day while Mergify still ignores
   them; the would-be holds are compared with what Mergify merged.
2. Coordination task C1 lands (Mergify requires `githerd/merge`), and its verification passes.
3. `incidents` and `upkeep`.
4. `owner-items`.
5. `workers` with one slot and the self-test passing; then three.
6. `proposals` last, because closes are the least reversible.

### Dependencies at a glance

Spikes in group A gate milestone 3; group B gates milestone 5; group C gates milestones 2 and 4.
Milestone 1 starts at once: its tasks stub the answers of S4, S5, S6, S9 and S11 and are finished
when those spikes report (all of them, and S25, S27 and S31, reported on 2026-10-03). Milestone 6 needs 5. Milestone 8 needs everything before
it, and each of its steps needs only the groups before it.

---

## Part 3. Coordination tasks

Changes githerd needs in files another session owns. githerd's sessions never edit these files;
each task is handed to the owning session with the exact change.

### C1. Mergify requires `githerd/merge`

Owner of the file: the session that owns `.mergify.yml` (Mergify adoption, pull request #777).
When: after milestone 8 step 1 (githerd has posted `githerd/merge` on every open pull request for
a busy day). Before that, the change would stall every pull request, because a head with no status
cannot merge.

The change, against `.mergify.yml` on master as of 2026-10-04, after queueing moved to
`merge_protections_settings` and the queue lost its `merge_conditions` to stay single-step
(three added lines, nothing else; a `failure` is treated exactly as the `hold` label is, in both
places the file names it):

```diff
       queue_conditions:
           - label!=hold
           - "-title~=^[a-z]+(\\([^)]*\\))?!:"
+          - -check-failure=githerd/merge
+          - check-success=githerd/merge
 ...
 merge_protections_settings:
     auto_merge_conditions:
         - base=master
         - -draft
         - -conflict
         - label!=hold
         - "-title~=^[a-z]+(\\([^)]*\\))?!:"
+        - -check-failure=githerd/merge
```

The header comment of the file gains one line: "githerd posts `githerd/merge` on every head; a
`failure` is a hold (a red lane or an owner item) and drops the pull request from the queue until
githerd posts `success`." The pull request description says how to undo it: delete the three lines.

Verification after it lands, with a docs-only pull request and no version plan: the
`needs-decision` label on it makes githerd post `failure` (decision line 5), which removes it from
Mergify's queue; removing the label brings `success`, which re-queues it; a head Mergify updated is
neither merged nor dropped from the queue until githerd posts on it.
Record the three observations in `evidence/repo-facts.md`.

Why (design 4.6): the queue has no `merge_conditions`, because Mergify checks a pull request in
place on its own branch only while the queue is single-step, and the visual-review gate needs the
pull request's own number. So `check-success` goes in `queue_conditions`, where Mergify already
adds the ruleset's two required checks and waits on a status that is pending or not reported yet,
as it does for them: "no status yet" and `pending` wait instead of merging. `-check-failure` in both
places makes a hold (`failure`) drop the pull request from the queue, exactly as the `hold` label
does, and in `auto_merge_conditions` it lets a pull request with no status yet be queued. Never add
`merge_conditions` for this: master's file says that makes Mergify test a draft pull request, which
fails `Lint PR Title` and the visual-review gate. The diff is based on master's file with its
`priority_rules` (a red master's `priority:critical` fix first), which it leaves as they are.
