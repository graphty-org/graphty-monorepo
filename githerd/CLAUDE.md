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
