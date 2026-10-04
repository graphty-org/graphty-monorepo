# githerd

The repository pipeline daemon, launcher and CLI. Design: `design/githerd/githerd-design.md`.
Build order and per-task done-criteria: `design/githerd/githerd-plan.md`.

## Rules

- **No runtime dependencies.** Node's standard library only. devDependencies are for tests, lint
  and type checking.
- Plain `.mjs` with JSDoc types, checked by `tsc` (`npm run typecheck`). Plain ASCII in every
  file.
- **Dry-run is the default and the invariant.** In dry-run (and paused) mode no code path may
  perform a GitHub write or a push; it records a `would-do` ledger line instead. Every scenario a
  test covers in acting mode is also covered in dry-run, asserting zero writes.
- **Tests never touch the real GitHub, servherd or `claude`.** They use the fakes in
  `test/helpers/` (`fake-gh`, `fake-servherd`, `fake-claude`). Only the manual scripts in
  `scripts/` use the real ones, in dry-run and with a dollar cap.
- Tests that create git repositories isolate git config through `GIT_CONFIG_GLOBAL` (see
  `visual-review/test/helpers.mjs`), so the owner's `commit.gpgsign=true` never applies.
- Tests that spawn processes kill every process group they started in `afterEach` and assert that
  none is left. Assert timing by what was or was not called, never by wall-clock thresholds.
- Never run git stash, reset, checkout of a file, clean or rebase, in code or in tests.
- **Owner-only input.** The only trusted author is the account gh is logged in as, asked every
  poll with `gh api user` (`state.trust.login`, null at every start). There is no `trustedAuthors`
  setting; the config rejects it. Every run kind acts only on that account's issues and PRs, and
  every path into a run (the run tools, the re-triage export, the owner gate's reject marker)
  drops text by any other account, bots included, and counts what it dropped. Check new code that
  reads GitHub content for a run with `byOwner` from `lib/board.mjs`. While the login is
  unresolved, no run starts.
- **One work queue.** What githerd and the sessions work on next comes from `lib/queue.mjs`
  (design section 5.4): deterministic rules, no weighted score, and a one-line reason on every
  item. The dispatcher and `githerd_next` follow it; a new kind of work gets a place in it, not a
  separate order. Effort never gates work or reaches the owner: effort:high gets the
  `backlog-high` model and caps, and a run may split the issue with `githerd_split_issue`.
- Supervision is pm2 autorestart plus the launcher's heartbeat restart. The container has no cron
  and no systemd; `githerd ensure` is a command the owner runs by hand.

## Verified against the real claude (Claude Code 2.1.287, 2026-10-02)

Found by `scripts/smoke-runs.sh` (dry-run, real repository, $3 cap):

- `--json-schema` takes the schema's JSON text, not a file path; the runner passes it inline and
  still writes `result.schema.json` for the record.
- `--json-schema` adds a `StructuredOutput` tool to the init line; the init check allows it.
- A run's MCP launcher must forward `tools/list` to the daemon: the run tools depend on the run's
  kind and token, so a static list would hide them.
- **The Bash sandbox does not run in this container.** bubblewrap (`bwrap`) and `socat` are not
  installed, and with them missing claude prints "Sandbox disabled" and runs Bash unsandboxed,
  even with `allowUnsandboxedCommands: false`. The sandbox is defense in depth, not the boundary:
  the defense against malicious code is owner-only input plus githerd-checked pushes. So
  code-editing kinds (master-red, pr-fix, pr-conflict, backlog) run without it; the runner logs
  "Sandbox disabled" as a `sandbox-disabled` event and lets the run go on. The settings still ask
  for the sandbox, so it turns on wherever both commands are installed. The sandbox checks
  (reading `~/.config/gh/hosts.yml`, `git credential fill`, reaching `api.github.com`) are
  unverified until then.
- Read-only runs (triage, retriage-candidates) start with the expected tools and the githerd
  server connected, end with a structured result, have no permission denials, and record only
  `would-do` writes.

Plan task 2.1's manual checks, run with a scratch `claude -p` (Claude Code 2.1.287, sonnet, the
runner's `settings.json` and `--setting-sources project,local`, a scratch repository; $0.34 total;
`tmp/githerd/blocking-fixes/manual-checks.mjs`):

1. **`--settings` with `--setting-sources project,local` loads the guard, and it fires.** A Write
   to a protected `CLAUDE.md` and the Bash command `gh --version` were both denied by the guard,
   recorded in `denials.jsonl` and reported in the result's `permission_denials`.
2. **The repository's CLAUDE.md loads into a run, and so does the owner's global
   `~/.claude/CLAUDE.md`.** `--setting-sources` limits settings files, not memory files: the run
   quoted a codeword from the scratch repository's CLAUDE.md and knew text that exists only in the
   owner's global CLAUDE.md. Both tell sessions to end with "ACTION NEEDED"; the preamble's ban on
   that line is what keeps runs from doing it, and a run's reply is never shown to the owner.
3. **Pending:** the sandbox checks need bubblewrap and socat (see above).
4. **Pending:** whether `timeout 30 git commit -S` finishes within 10 seconds from a run spawned by
   the servherd-managed daemon. It matters only for code-editing kinds; run it before the first
   code-editing soak.
5. **No Co-Authored-By line in a run's commit.** Asked to commit with a message of its own, the run
   wrote `docs: add line two to notes.txt` and no trailer. The owner's global CLAUDE.md, which also
   forbids the trailer, was loaded, so this does not isolate the attribution setting; the actor's
   push check refuses any such line either way.
