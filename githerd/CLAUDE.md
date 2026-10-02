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
  even with `allowUnsandboxedCommands: false`. So the runner refuses every code-editing kind
  (master-red, pr-fix, pr-conflict, backlog) while either command is missing from PATH, and kills
  one whose claude reports the sandbox disabled. Until the owner installs both, milestone 2 runs
  read-only kinds only, and the sandbox checks (reading `~/.config/gh/hosts.yml`, `git credential
  fill`, reaching `api.github.com`) are unverified.
- Read-only runs (triage, retriage-candidates) start with the expected tools and the githerd
  server connected, end with a structured result, have no permission denials, and record only
  `would-do` writes.
