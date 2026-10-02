# githerd implementation plan

Builds the design in `design/githerd/githerd-design.md` (section numbers below refer to it). Each
task is sized for one agent, lands as its own conventional commit with scope `githerd`, and is
testable on its own. Tasks inside a milestone run in the listed order unless a task says it can run
in parallel.

Rules for every task:

- Plain `.mjs` with JSDoc types, Node standard library only (no runtime dependencies), modeled on
  `visual-review/`. Tests are vitest in node (`githerd/test/*.test.mjs`).
- The package's coverage thresholds are 80% lines, functions and statements and 75% branches;
  `pnpm exec nx run githerd:coverage`, `pnpm exec nx run githerd:lint` and
  `./tools/run-knip.sh --workspace githerd` must pass at the end of every task.
- Tests that create git repositories isolate git config through `GIT_CONFIG_GLOBAL`, reusing
  `visual-review/test/helpers.mjs`, so the owner's global `commit.gpgsign=true` never applies.
- Tests that spawn processes kill every process group they started in `afterEach` and assert that
  none is left. Timing is asserted by what was or was not called, not by wall-clock thresholds.
- Never run git stash, reset, checkout of a file, clean or rebase. Scratch files go in
  `tmp/githerd/<task>/`.
- No test touches the real GitHub, the real servherd or the real `claude` unless the task says it
  is a manual smoke test; those use dry-run and a dollar cap.
- Nothing posts to GitHub until the owner merges a config change that turns an `actions` group on.

## Milestone 1: daemon, launcher, status and paging, in dry-run

Outcome: every Claude session in the repository gets `githerd_status`, `githerd_claim`,
`githerd_release`, `githerd_report`, `githerd_escalate` and `githerd_resolve`; the owner's phone
hears about a red master once per incident and by the paging policy; nothing on GitHub changes.

### 1.1 Package scaffold

- Files: `githerd/package.json` (`"name": "@graphty/githerd"`, `"private": true`, `"type":
  "module"`, `bin: { "githerd": "bin/githerd.mjs" }`, scripts copied from visual-review,
  devDependencies at visual-review's versions), `githerd/project.json` (nx `test`, `coverage`,
  `lint`; no build), `githerd/tsconfig.json`, `githerd/vitest.config.mjs`, `githerd/README.md`,
  `githerd/CLAUDE.md` (no runtime dependencies, the dry-run invariant, never real gh writes in
  tests), `githerd/lib/version.mjs` (reads `version.json` next to `bin/` when present, else
  `package.json`).
- Root edits: `pnpm-workspace.yaml`, `eslint.config.js`, `knip.config.ts`,
  `tools/ci-test-matrix.mjs` (a `githerd` shard), `commitlint.config.js` (scope `githerd`),
  `.gitignore` (`/.githerd/`, `/.githerd-dev/`), root `package.json` devDependency, CLAUDE.md
  (Package Directory row, CI Test Shards list, Monorepo Structure line).
- Tests: `test/smoke.test.mjs` -- `version.mjs` prefers `version.json` over `package.json`.
- Done: `pnpm install` clean; `./tools/run-tests.sh githerd` and `tools/prepush.sh` pass.

### 1.2 Config

- Files: `githerd/lib/config.mjs`: `CONFIG_FILE`, `DEFAULTS`, `normalizeConfig` (strict, unknown
  and forbidden keys rejected, repository lists merged onto the default protected lists, `incidents`
  requirement of design section 13), `repoRoot()` (realpath of the git common dir's parent),
  `defaultBranch(root)` (from `git symbolic-ref refs/remotes/origin/HEAD`), `resolveConfig(root,
  env)` in the order of design section 3.4, `effectiveMode(config, override)` (only lowers).
  `githerd.config.json` at the repository root with graphty's values.
- Tests: `test/config.test.mjs` -- `GITHERD_CONFIG` wins; otherwise the default branch's file is
  read from a temporary repository with a bare remote; neither yields "not configured"; a working
  tree edit is ignored; defaults filled; unknown and forbidden keys rejected; a list cannot drop a
  default protected path; an override of `paused` lowers `acting` and `acting` is ignored;
  graphty's real file validates.
- Done: tests pass.

### 1.3 Schema validator, MCP core and outgoing-text check

- Files: `githerd/lib/schema.mjs` (the keywords of design section 3), `githerd/lib/mcp.mjs`
  (`initialize`, `tools/list`, `tools/call` with validation and `isError`, `ping`, -32601, no reply
  to notifications), `githerd/lib/text.mjs` (`assertAscii`, `checkOutgoing` with the secret and
  attribution patterns of design section 14).
- Tests: `test/schema.test.mjs`, `test/mcp.test.mjs`, `test/text.test.mjs` (each secret pattern,
  each attribution line, an environment value whose name contains TOKEN).
- Done: tests pass.

### 1.4 GitHub client with dry-run gate

- Files: `githerd/lib/github.mjs`: `createGitHub({repo, exec, mode, ledger, rate})` with `get(path,
  {fresh})` (in-memory ETag plus the body it validates; `fresh` sends no ETag), `graphql(query,
  vars)` (refuses mutations), `write()` and `mutate()` (dry-run or paused: `would-do`; acting:
  perform and log `action`; both run `checkOutgoing`), the rate rules of design section 6.3
  including the secondary-limit back-off and the credential classification, 60 second timeouts,
  `downSince` bookkeeping. `githerd/test/helpers/fake-gh.mjs` records every call and exposes
  `writes()`.
- Fixtures: trimmed copies of `tmp/githerd/spikes/github-work/*.out` in `githerd/test/fixtures/`.
- Tests: `test/github.test.mjs` -- ETag sent and its body returned on 304; a new client sends no
  ETag; `fresh` sends none; rate back-off at 1000 and 300; a secondary-limit 403 backs off and
  doubles; a 403 without rate headers is a credential failure; dry-run `write()` never calls
  `exec`; a body with `ghp_` is refused in acting mode.
- Done: tests pass.

### 1.5 State store, ledger and process identity

- Files: `githerd/lib/store.mjs`: `loadState` (state, then `.bak`, then empty with the recovery
  flags of design section 5.8; newer schema read-only; older migrated after a copy), `saveState`
  through one promise chain with unique temporary names, `appendLedger`, `readLedger` (torn last
  line skipped), monthly rotation. `githerd/lib/proc.mjs`: `identify(pid)` returning `{pid,
  startTime, bootId}` from `/proc`, `sameProcess(record, {cmdlineIncludes})`.
- Tests: `test/store.test.mjs` (round trip; torn file falls back; both corrupt start empty; two
  concurrent saves leave a valid file; newer schema refused), `test/proc.test.mjs` (a live child
  matches; a changed start time or boot id does not; cmdline check).
- Done: tests pass.

### 1.6 Master lanes and verdict

- Files: `githerd/lib/master.mjs`: `updateLane`, `masterVerdict` (with `greenSha` and `pending`),
  `stuckLaneRuns(lanes, config, now)`, `findSuspects`, `releaseState`.
- Tests: `test/master.test.mjs` from fixtures -- newest completed picked; older id ignored; red
  needs two sightings; green on first; re-run attempt replaces; cancelled GPU keeps the verdict;
  Hosts absent is fine; `greenSha` stays on the verified commit while newer ones are in flight; a
  run queued past `maxMinutes` is reported once; release failed, stalled, and stalled only by a
  stuck lane.
- Done: tests pass.

### 1.7 Pull requests and why-stuck

- Files: `githerd/lib/prs.mjs`: `updatePrs(saved, nodes, master, config)`, conflict sightings,
  required-context verdict, `decideBreaking(title, commits, truncated)`, files matched against
  `protectedPaths` and `noAutoMergePaths`, owner gate and reject marker, stacked detection,
  `whyStuck` in the order of design section 6.5.
- Tests: `test/prs.test.mjs` -- UNKNOWN never changes state; the #519 and #490 shapes are
  "conflicting"; breaking from a `feat(x)!:` title, a `fix(y)!:` commit subject under a plain
  title, `BREAKING CHANGE` and `BREAKING-CHANGE` footers, and a 250-commit list; a head not yet
  checked counts as breaking; a reject block newer than the head sets `ownerRejected`; every
  why-stuck reason has a case; a live session on the PR's branch shows "worked by session".
- Done: tests pass.

### 1.8 Issues and merged pull requests

- Files: `githerd/lib/issues.mjs` (high-water mark, PR items dropped, paging),
  `githerd/lib/merged.mjs` (merged search parse, changed paths accumulated, closing references,
  `rankForRefresh(issues, paths)` by mentions of changed paths or their leading directories).
- Tests: `test/issues.test.mjs`, `test/merged.test.mjs` -- high-water never moves back; the #365
  fixture (389 files, truncated to 100) still yields paths; closed-by references are excluded; an
  issue naming a changed file ranks above one naming only its top directory.
- Done: tests pass.

### 1.9 Claims, sessions and escalations

- Files: `githerd/lib/board.mjs`: `claim`, `release`, `expire(now, startedAt)`, `heartbeat`,
  `report`, `escalate`, `resolve`, `resolveDerived`; `fixPr` accepted from sessions only.
- Tests: `test/board.test.mjs` -- second holder refused with details; renew; expiry; dead session
  lapses; after a daemon restart a session gets one interval before lapsing; anyone may release a
  dead holder's claim; path prefix conflict; a run token cannot set `fixPr`; escalation dedupe;
  derived escalation clears.
- Done: tests pass.

### 1.10 Notifier and paging policy

- Files: `githerd/lib/notify.mjs`: runs `notify.command` off the caller's path with a 15 second
  timeout, `{status}` and `{message}` substituted, no shell, `~` expanded; per-key sent marks; up
  to 3 retries per key; `maxPerHour` folding with the bypass list; `brokenSince` after 3 failures in
  a row. `githerd/lib/paging.mjs`: `pagesFor(event, state, config)` implementing the table and rules
  of design section 5.5.
- Tests: `test/notify.test.mjs` with a fake command that appends its argv to a file (one alert per
  key; a hanging command is killed at 15 s and retried; the third failure sets `brokenSince`; the
  cap folds escalations but not master-red; a null command only logs), `test/paging.test.mjs`
  (master red pages `waiting` at once with runs off, and only after the run ends when a run will
  handle it; `error` at 2 hours; recovered is `info` and only after a page; session escalations
  never page; run-failed, denied, blocked and release kinds never page; visual-review is batched;
  digest and daily notices are `info`).
- Done: tests pass.

### 1.11 Session tools and status text

- Files: `githerd/lib/tools.mjs`: the six session tools of design section 7.1 as pure functions
  over a state object; the status text, with items by authors other than the owner shown by number and author
  only, run text prefixed `[run text]`, and the PHONE ALERTS BROKEN banner; `format: "json"`.
- Tests: `test/tools.test.mjs` -- each tool's happy path and refusals; the status example of design
  section 7.1 from a fixture state; another author's PR title is not shown; the banner leads every tool
  result while notifications are broken.
- Done: tests pass.

### 1.12 Daemon: HTTP server and poll loop

- Files: `githerd/bin/githerd-daemon.mjs`, `githerd/lib/daemon.mjs` (`startDaemon({root, port,
  exec, now, env})`: bind 127.0.0.1, write `daemon.json` with identity, the fence before every poll
  and write, `/health` with the fields of design section 3.2, `/rpc`, `/heartbeat`; the poll loop
  with skip-if-busy and `loopTickAt`; the calls of design section 6; config re-read with the
  last-valid fallback; git with `GIT_TERMINAL_PROMPT=0` and timeouts; events and paging through
  1.6-1.10; daily alive notice; startup notify check; SIGTERM handling of design section 3.2).
- Tests: `test/daemon.test.mjs` -- `/health` fields; `tools/list` has the six tools; a scripted
  timeline (green, red once, red twice, old run, recovered) pages exactly once and logs the right
  events; a restart in the middle of the timeline keeps the lane verdict on the first poll after
  it; an invalid config on master keeps the last valid one and escalates once; a daemon whose
  `daemon.json` names another live daemon exits without writing; SIGTERM leaves a valid state file;
  the dry-run fake gh records zero writes across the timeline.
- Done: tests pass; with `GITHERD_CONFIG` set, `node githerd/bin/githerd-daemon.mjs` runs one poll
  against the real repository in a scratch state directory (manual) and prints a sane status.

### 1.13 Launcher

- Files: `githerd/bin/githerd-mcp.mjs`, `githerd/lib/launcher.mjs`: immediate `initialize` and
  `tools/list`; `ensureDaemon()` in the background exactly as design section 3.1 (root, config,
  run mode, warm path on `codeHash` and `loopTickAt`, the upgrade wait on `runsInFlight`, `git
  archive` into `versions/<version>-<hash8>/` with `version.json`, `start` for a new hash and
  `restart` for a wedged loop, pm2 autorestart turned on after every `start`, the rename-based lock
  steal, the 15 minute restart limit, the timeout's log line and page); the stdio proxy with a 45
  second wait; heartbeats keyed on `process.ppid` that run `ensureDaemon()` on failure; quiet exit
  outside a git repository.
- Tests: `test/launcher.test.mjs` with `test/helpers/fake-servherd.mjs` (spawns the command
  detached, records pids, returns "existing" for an unchanged command, implements `restart`):
  `initialize` answers while the fake servherd sleeps 20 s; cold start; warm reuse without calling
  servherd; five launchers against a stale lock make exactly one servherd call; a lock without
  `owner.json` younger than 60 s is not stolen; after a `start` the daemon's pm2 process is
  re-created with autorestart on (a fake pm2 records it); a hung-but-online daemon gets `restart`, not
  `start`; a stale `lastPollOkAt` alone causes no restart; a new hash waits while a run is in
  flight; a worktree's local code never becomes the daemon; a killed daemon returns after a failed
  heartbeat; with `GITHERD_URL` set servherd is never called; stdout holds only JSON-RPC lines.
- Manual smoke (`githerd/scripts/smoke-launcher.sh`): five-at-once against the real servherd under
  a scratch name; removes its entry at the end.
- Done: tests pass; the smoke script prints one daemon pid and leaves no entry or process.

### 1.14 CLI

- Files: `githerd/bin/githerd.mjs`: `status`, `ledger`, `runs`, `run <id>`, `mode`, `ack`, `veto`,
  `ensure`, `restart`, `dev`, `doctor [--send-test]` with the checks of design section 12
  (including the signed `git commit-tree -S` with a 10 second timeout, the code hash, supervision
  as pm2 autorestart on the daemon's process, and the deploy-key fingerprint warning).
- Tests: `test/cli.test.mjs` against a daemon on port 0 -- each command's output and exit code;
  `mode acting` is refused; `doctor` reports a missing gh, a hanging signer and a missing notify
  command; `dev` uses the `githerd-dev` name and `.githerd-dev/`.
- Done: tests pass.

### 1.15 Registration and the coordination rule

- Files: `.mcp.json`; CLAUDE.md gains the paragraph of design section 19 and a short "githerd"
  subsection pointing at `githerd/README.md`; the README documents the prerequisites of design
  section 17.
- Verification (manual, in the PR description): in a new worktree from `./tools/worktree-new.sh`,
  record whether Claude Code asks to approve the githerd server, and that a session lists the
  tools before the daemon is up.
- Done: a session in the worktree lists the githerd tools and `githerd_status` answers.

### 1.16 Dry-run soak, part one

- Precondition: the owner's prerequisites of design section 17 (notify credentials, MCP approval).
- Run the daemon on the real repository with `GITHERD_CONFIG` set (until the config is on master)
  for at least 72 hours.
- Pass criteria: zero writes outside `would-do`; every master red and recovery in the window paged
  as the policy says, checked against the Actions history, and at least one red incident replayed
  from fixtures through the live daemon if none happened; no lane verdict moved backwards; rate use
  under 5%; no orphan processes; the daemon killed by hand once with a session open and once with
  none, with the recovery time recorded; after one container restart, the daemon came back when
  the first session opened (there is no cron or systemd to bring it back sooner).
- Retire `tmp/master-watch/watch.sh` and `stuck-prs.sh` once the soak passes.
- Done: the soak results are in the PR description.

## Milestone 2: judgment runs, run prompts and re-triage, in dry-run

Outcome: events that need judgment start bounded, credential-free headless runs; the first weekly
digest shows a full re-triage pass; every write is recorded, not performed.

### 2.1 Runner and isolation

- Files: `githerd/lib/runner.mjs`: the run directory (`mcp.json`, `settings.json` with the guard on
  Bash, Edit and Write, the sandbox request and deny rules, attribution off and auto-memory off;
  `run-gitconfig`; `result.schema.json`; `prompt.md`), the allowlisted environment, the argv of
  design section 9.3 with `--tools` per kind, detached spawn, `stream.jsonl`, the init check
  (mode, one server, tool list), immediate kill on backgrounding, timeout and process-group kill,
  outcome classification, spend (full budget without a result line), admission against spend plus
  running budgets with the master-red share, `interrupted` and `lost` handling with process
  identity, the servherd leftover check. `githerd/test/helpers/fake-claude.mjs`.
- Tests: `test/runner.test.mjs` -- the child environment is exactly the allowlist (no `PUSHOVER_*`,
  no `GH_TOKEN`); argv uses `--tools` and pre-approves only the read tools and `mcp__githerd`; a
  read-only kind whose init lists Bash is killed; init in `default` mode is killed; a denial with
  exit 0 escalates; `error_max_turns` fails; a backgrounded call is killed at once; a hang is
  killed at the timeout and charged its full budget; two runs admitted together cannot exceed the
  cap; one master-red run always fits; a shutdown marks runs `interrupted` and consumes no attempt.
- Manual verification, $0.50 cap, recorded in `githerd/CLAUDE.md`: (1) `--settings` works with
  `--setting-sources project,local` and the guard fires; (2) whether the repository CLAUDE.md loads;
  (3) a sandboxed Bash run cannot read `~/.config/gh/hosts.yml`, cannot run `git credential fill`
  successfully, and cannot reach `api.github.com`; (4) from a run spawned by the servherd-managed
  daemon, `timeout 30 git commit -S` in a scratch repository finishes within 10 seconds; (5) the
  attribution setting keeps Co-Authored-By out of a run's commit. (3) is checked only where
  bubblewrap and socat are installed: the sandbox is defense in depth, and code-editing kinds run
  without it (design section 9.3). If (4) fails, code-editing kinds stay off.
- Done: tests pass and the manual answers are recorded.

### 2.2 Guard hook

- Files: `githerd/bin/githerd-guard.mjs` (one try/catch that exits 2 on any error),
  `githerd/lib/shellwords.mjs`.
- Tests: `test/guard.test.mjs` -- a table of at least 60 commands: every `git push` spelling, `gh`,
  `curl api.github.com`, `ssh`, `git credential`, stash, reset, switch, restore, clean, rebase,
  checkout (denied), `git checkout MERGE_HEAD -- visual-baselines/x.png` during a merge in a
  pr-conflict run (allowed) and outside a merge (denied), unsigned commits, commit messages with
  each attribution line, `servherd`, `pm2`, `nohup`, `setsid`, a trailing `&`, `pnpm run dev`,
  `storybook`, publish commands; Edit and Write to each protected path; malformed JSON input and an
  unreadable run directory (denied); allowed commands (`git commit -S -m "fix: x"`, `pnpm exec nx
  run x:test`, `git merge <sha>`).
- Done: tests pass.

### 2.3 Run-only tools

- Files: `githerd/lib/run-tools.mjs`: the tools of design section 7.2 with per-kind visibility, the
  token check, the write cap, the marker, `checkOutgoing`, batch-only targets for label, comment
  and propose, label sets limited to types, priorities and efforts, `githerd_gh_get` path and named
  query rules, search qualifier stripping and pacing, every answer filtered to the owner's
  text with a count of what was hidden (task 2.10), ledger filtering of run-written fields, `githerd_finish_branch` handing
  off to the actor.
- Tests: `test/run-tools.test.mjs` -- hidden without a token, rejected with a wrong one; a
  code-editing kind does not see `githerd_gh_get` or search; `repos/other/x` and
  `repos/<repo>/actions/secrets` are refused; `repo:other/x` in a search is stripped; a label outside
  the three sets (`master-fix`, `gpu`, `blocked`) is refused; a target outside the batch is refused;
  another author's comment is absent from a backlog run's context; a code-editing run's ledger slice has
  no summaries; the eleventh write is refused; dry-run writes are `would-do`.
- Done: tests pass.

### 2.4 githerd-owned worktrees and checked pushes

- Files: `githerd/lib/worktrees.mjs` (create from the green SHA or a PR branch, run `worktreeSetup`,
  the `.claude`/`CLAUDE.md`/`.mcp.json` diff check before a PR run, record, remove only recorded
  ones without `--force`, log failures), `githerd/lib/actor/push.mjs` (the checks of design section
  8.3 and the push, recording `pushedByGitherd`).
- Tests: `test/worktrees.test.mjs` and `test/actor-push.test.mjs` on temporary repositories with a
  bare remote -- an unsigned commit is refused; an attribution line is refused; a change to
  `githerd.config.json` or `.claude/` is refused; a visual-baseline file reset to the green SHA's
  bytes passes; a merge whose parent is not the given green SHA is refused; a diff with `ghp_` is
  refused; a PR branch that changed `.claude/` gets no run; a source scan finds no stash, reset,
  checkout, clean or rebase; dry-run pushes nothing.
- Done: tests pass.

### 2.5 Run prompts

- Files: `githerd/prompts/preamble.md` and `githerd/prompts/playbooks/*.md` for the nine kinds of
  design section 18 (generic, plain ASCII); `.claude/githerd-rules.md` with graphty's rules.
- Tests: `test/prompts.test.mjs` -- every kind has a playbook; the files are ASCII; the preamble
  contains the ACTION NEEDED ban, the background ban, the never-push rule and the untrusted-input
  rule; the runner's `prompt.md` includes the rules file read from a given SHA, not the working
  tree.
- Done: tests pass.

### 2.6 Dispatcher

- Files: `githerd/lib/dispatch.mjs`: the table of design section 10, the limits of section 10.1,
  the priority queue, debounce, claim and session-branch ownership, the 30 minute recent-head skip,
  the 15 minute master-red hold, the agent-ready rubric by author only, batching.
- Tests: `test/dispatch.test.mjs` -- one test per row; a fake run that leaves a new head on every
  attempt stops at 3 pr-fix runs; a conflict that survives master moving stops at 2; a second
  master-red run starts only when the failing jobs change; 4 runs per PR per 24 hours; an
  outside push resets the PR limits and a githerd push does not; a PR whose head branch a live
  session reports gets no run; a master-red run is skipped when a session claims `master` during
  the hold; another author's issue that a run labeled is never agent-ready; `blocked` and
  `needs-*` are excluded.
- Done: tests pass.

### 2.7 Weekly re-triage

- Files: `githerd/lib/retriage.mjs`: GraphQL export, batches, `runsPerHour`, the weekly budget,
  resume after restart, the candidate-to-filter hand-off, at most 3 duplicate candidates per issue.
- Tests: `test/retriage.test.mjs` -- paging over a 202-issue fixture; batch boundaries; schedule;
  resume; a rejected candidate never becomes a proposal; a confirmed one does; a fourth duplicate
  candidate is dropped.
- Done: tests pass.

### 2.8 Real-run smoke

- `githerd/scripts/smoke-runs.sh`, dry-run, real repository, $3 total: one `triage` run on 3 recent
  issues, one `master-red` run replayed from a recorded red CI run, one `pr-conflict` run on a
  scratch PR fixture, and one re-triage batch of 10 issues.
- Done: each run ends `done` or `escalated` with a valid result; `permission_denials` is empty; the
  ledger shows only `would-do` writes; where bubblewrap and socat are installed, the sandbox
  check of 2.1 holds inside the master-red run;
  no `claude`, launcher or servherd leftover remains. A read-only run whose issues need nothing
  may end `nothing-to-do`, which is also a valid result.
- On this container the Bash sandbox cannot run (no `bwrap` or `socat`). The code-editing steps
  run anyway, unsandboxed, and the summary lists the missing commands; the sandbox check runs once
  both are installed. The triage step picks only the owner's issues.

### 2.9 Dry-run soak, part two

- One week in dry-run with runs on and `dryRunDailyBudgetUsd` 5, including one full re-triage pass
  on its weekly budget.
- Done: no run ended `init-mismatch` or `backgrounded`; spend stayed under the caps; no limit in
  section 10.1 was exceeded; the digest lists the re-triage results and every escalation.

### 2.10 Owner-only input

The defense against malicious code is trusted input plus githerd-checked pushes, not the Bash
sandbox (design sections 9.3 and 14).

- Files: `githerd/lib/github.mjs` (`login()`: `gh api user`); `githerd/lib/daemon.mjs` (the login
  asked every poll into `state.trust`, null at start, no runs and a `login-unresolved` escalation
  while unresolved, the owner gate's reject marker from the owner's comments only);
  `githerd/lib/board.mjs` (`byOwner`); `githerd/lib/dispatch.mjs`, `githerd/lib/prs.mjs` and
  `githerd/lib/retriage.mjs` (only the owner's issues and PRs, only the owner's comments);
  `githerd/lib/run-tools.mjs` (every answer filtered to the owner's text, with a `hidden` count);
  `githerd/lib/tools.mjs` (the TRUST status line); `githerd/lib/config.mjs` (`trustedAuthors`
  removed and rejected); `githerd/lib/runner.mjs` (no sandbox refusal; "Sandbox disabled" is a
  logged note).
- Tests: an issue and a PR by another author, a bot or a deleted account get no run of any kind;
  another author's comment on the owner's issue never appears in a run tool's output or the
  re-triage export; the login comes from the client, not the config, and `trustedAuthors` is
  rejected; an unresolved login blocks every run and escalates; code-editing runs start without
  bwrap or socat; the skipped and hidden counts appear in status.
- Done: tests pass. The weekly digest (task 3.6) lists the same counts.

## Milestone 3: the actor and acting

Outcome: githerd acts, one `actions` group at a time. Tasks 3.1 and 3.2 land before milestone 2 so
acting step 1 can follow the first soak; the rest follow milestone 2.

### 3.1 Gate and heartbeat statuses

- Files: `githerd/lib/actor/status.mjs`: `githerd/gate` per design section 8 (red master, breaking
  or unchecked head, the master-fix record ignoring githerd's own `master-fix` label), the hourly
  `githerd/alive` status; `.github/workflows/githerd-watchdog.yml` (every 30 minutes, fails when
  master's head has no `githerd/alive` newer than 90 minutes).
- Tests: `test/actor-status.test.mjs` -- no post while unknown; one post per change; failure text
  names the red SHA; a breaking head gets failure; the fix PR gets success while red; a `master-fix`
  label githerd added is ignored; alive at most hourly; dry-run records only.
- Done: tests pass.

### 3.2 Auto-merge, breaking hold, labels and branch updates

- Files: `githerd/lib/actor/merge.mjs`: auto-merge with `expectedHeadOid` under the rules of design
  section 8 (checked head, `noAutoMergePaths`, the owner's PR, stacked); breaking hold and the
  grouped `decision` escalation; `update-branch` only when master's head is `greenSha`, once per
  (head, green SHA), at most 3 per poll; label bootstrap.
- Tests: `test/actor-merge.test.mjs` -- each rule and exclusion; a PR touching `githerd/` never gets
  auto-merge; a head changed since the check is not enabled; update-branch is refused while
  `pending`; the refire is capped per poll; dry-run records only.
- Done: tests pass.

### 3.3 Visual review

- Files: `githerd/lib/actor/visual.mjs`: start or reuse `ownerGate.reviewServer` through servherd,
  read its URL, keep the batched `visual-review` escalation, start the pr-fix run on a reject.
- Tests: `test/actor-visual.test.mjs` with the fake servherd -- one server for many PRs; one page per
  new PR, folded per poll; the escalation clears when the gate passes.
- Done: tests pass.

### 3.4 Proposals, grace, vetoes and execution

- Files: `githerd/lib/actor/proposals.mjs`: label and comment, the 15 minute veto query, the two veto
  forms, `shownToOwnerAt` and `graceUntil`, the daily new-proposal notice, the fresh pre-close
  query, the evidence check, close with `closeAs`, the daily cap; the revert path of design section
  8.2 (immediate `waiting` page, fresh head read, worktree from the culprit SHA, signed revert, head
  re-read before the PR, escalate on any change, refuse a culprit touching protected paths); the
  post-restart rule for overdue proposals.
- Tests: `test/actor-proposals.test.mjs` -- label removed and an unmarked comment veto; a marked
  comment does not; grace extends to 3 days after first shown; a stale cached veto answer is not
  used for the close; a proposal citing an unmerged PR is voided; a revert where the head moved
  between check and PR escalates; a culprit that touched `visual-baselines/` is escalated; the
  revert happy path on a temporary repository; a proposal whose grace ended before a restart waits
  for a fresh query and 3 more days.
- Done: tests pass.

### 3.5 Incident issue

- Files: `githerd/lib/actor/incident.mjs`: open, update, close; carries the revert proposal and its
  veto instructions.
- Tests: `test/actor-incident.test.mjs` -- one issue per incident; comments only on change; closed on
  recovery; dry-run records only.
- Done: tests pass.

### 3.6 Weekly digest

- Files: `githerd/lib/digest.mjs`: the contents of design section 12.1 (including the skipped and
  hidden counts of `state.trust`, as status shows them), a seeded sample, the file, the `info`
  notice, `shownToOwnerAt` for listed proposals.
- Tests: `test/digest.test.mjs` -- a recorded week produces the expected sections; the sample is
  stable; the notice is under 200 characters and `info`.
- Done: tests pass.

### 3.7 Switching to acting

- Files: `githerd/README.md` gains "Turning githerd on": the prerequisites and steps of design
  section 17, with pass criteria for each step: step 1 after soak one passes; step 2 after soak two
  passes and a week of acting step 1 with no wrong status; step 3 after a week of step 2 with no
  `denied` push and no limit exceeded; step 4 after a week of step 3 with no vetoed proposal the
  evidence check should have caught. `lib/rollout.mjs` checks the measurable criteria and raises the
  `approval` escalation.
- Tests: `test/rollout.test.mjs` -- the criteria from ledger fixtures.
- Done: the README section exists; the step 1 config PR is ready for the owner to merge.

## Order and parallelism

- Milestone 1: 1.1 first; then 1.2, 1.3, 1.4, 1.5 in parallel; then 1.6 to 1.11 in parallel; then
  1.12, 1.13, 1.14; then 1.15 and 1.16. Tasks 3.1 and 3.2 can run in parallel with 1.16.
- Acting step 1 (statuses and PR upkeep) after 1.16 passes.
- Milestone 2: 2.1 to 2.5 in parallel; then 2.6 and 2.7; then 2.8 and 2.9.
- Milestone 3: 3.3 to 3.6 in parallel after 2.6; then 3.7.
