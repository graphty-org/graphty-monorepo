# githerd

The repository pipeline daemon, launcher and CLI. Design: `design/githerd/githerd-design.md`.
Build order and per-task done-criteria: `design/githerd/githerd-plan.md`.

## Rules

- **Two runtime dependencies, no more without the owner's approval:** `@octokit/core` (the daemon's
  only path to GitHub, `lib/github.mjs`, with the token of the owner's gh login) and `tar`.
  Everything else is Node's standard library; devDependencies are for tests, lint and type
  checking. An archived copy under `~/.githerd/` has no install of its own: its `node_modules`
  links to the main checkout's `githerd/node_modules`, so run `pnpm install` there after a
  dependency changes. Workers keep using `gh` themselves.
- Plain `.mjs` with JSDoc types, checked by `tsc` (`npm run typecheck`). Plain ASCII in every
  file.
- **Dry-run is the default and the invariant.** In dry-run (and paused) mode no code path may
  perform a GitHub write or a push; it records a `would-do` ledger line instead. Every scenario a
  test covers in acting mode is also covered in dry-run, asserting zero writes.
- **Tests never touch the real GitHub, servherd or `claude`.** They use the fakes in
  `test/helpers/` (`fake-gh`, `fake-servherd`, `fake-screen-claude`, `fake-worker`) and the
  injected platform of `lib/start.mjs`. Only `scripts/smoke-launcher.sh` and `githerd selftest`
  use the real ones.
- Tests that create git repositories isolate git config through `GIT_CONFIG_GLOBAL` (see
  `visual-review/test/helpers.mjs`), so the owner's `commit.gpgsign=true` never applies.
- Tests that spawn processes kill every process group they started in `afterEach` and assert that
  none is left. Assert timing by what was or was not called, never by wall-clock thresholds.
- Never run git stash, reset, checkout of a file, clean or rebase, in code or in tests.
- **Owner-only input.** The only trusted author is the account gh is logged in as, asked every
  poll through the user endpoint (`state.trust.login`, null at every start). There is no `trustedAuthors`
  setting; the config rejects it. Jobs are made only from that account's issues and pull requests,
  and every path that hands GitHub text to a worker (`githerd_read`, the owner gate's reject
  marker, the owner's override labels) drops text by any other account, bots included, and counts
  what it dropped. Check new code that reads GitHub content for a worker with `byOwner` from
  `lib/board.mjs`. While the login is unresolved, no job is made and no worker starts.
- **One job queue.** What workers and owner sessions work on comes from the job records
  (`lib/jobs.mjs` makes them from the facts) in the order of `jobOrder` in `lib/queue.mjs`
  (design section 5.4): deterministic rules, no weighted score, and a one-line reason on every job.
  A new kind of work gets a job kind and a place in that order, not a separate queue. Claude makes
  the judgment calls (overlap, grouping, relatedness) through `githerd_claim`; code only validates
  and enforces them.
- **Interactive workers only.** githerd hands work to interactive Claude Code sessions in tmux
  (`lib/start.mjs`, design section 7.1), never to headless `claude -p` runs, and never merges:
  Mergify does. A worker starts only while the `workers` write group acts; in dry-run each start is
  a `would-do` line. Its pushes, re-runs and own `gh` writes are the separate `worker-writes` group:
  while that group does not act they are `would-do` lines, and the guard refuses the worker's `gh`
  writes.
- Supervision is servherd's `--autorestart` (pm2) plus the restarters of design section 9.4: every
  session's MCP server looks at `alive` once a minute, and `githerd ensure` is a command the owner
  runs by hand (the container has no cron and no systemd). A restarter starts the daemon only when
  `alive` is older than 60 s and the daemon's lock names a process that is gone, holding
  `restart.lock`. Every start uses the command `githerd install` prints, from the state directory.
- **The Nx cache needs no setup, and `NX_CACHE_DIRECTORY` is never set.** Nx 22.7 resolves
  `.nx/cache` to the main checkout's from every git worktree, so a fresh job worktree's build hits
  what any other worktree built and restores its outputs (measured 2026-10-03,
  `design/githerd/evidence/platform-facts.md` section 8.1). With `NX_CACHE_DIRECTORY` set, Nx
  reported cache hits and restored no output. So no environment githerd starts carries it: the
  daemon's and a worker's environments are allow-lists without it, and a worktree's install and
  build run with it removed. A worktree's preparation (install and the Nx build) fails when a
  package with a `build` script has no `dist` afterwards, whatever the exit code said. Never
  delete or move the main checkout's `.nx`: it is every worktree's cache.
- **githerd pushes through the machine's push queue.** Every session pushes through
  `tools/push-queue.sh` (three gates at once, `PUSH_QUEUE_PRIORITY=critical` first, a dead
  waiter's ticket dropped), and so does githerd: each `githerd_push` runs the queue script with the
  `git push` as its command, an incident's fix as critical, and the reference worktree's gate runs
  through it too. `tools/prepush.sh` takes no lock of its own; adding one would make the three
  slots one gate at a time for every session. The board reads the queue's tickets in the main
  checkout's `tmp/push-queue/` (`pushQueueTickets` in `lib/proc.mjs`). The script also appends one line per push
  to the main checkout's `tmp/push-log.jsonl` naming the Claude session that launched it, from
  which `lib/owners.mjs` infers each pull request's owner every poll (with worktree presence).
