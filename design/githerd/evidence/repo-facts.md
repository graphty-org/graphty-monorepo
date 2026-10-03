# Repository and machine facts read on 2026-10-03

Facts about the repository's settings, workflows, tools and this machine that the githerd design
depends on and that `platform-facts.md` does not cover. Each was read with a command; the scripts
are `repo-facts-check-1.sh`, `repo-facts-check-2.sh` and `ci-durations.mjs` beside this file. They
only read: GitHub through `gh api`, `origin/master` through `git show`, and local files.

Each fact has a short id (R1, R2, ...) that the design cites.

## Repository settings and rules

- **R1** `delete_branch_on_merge` is `false`, `allow_auto_merge` is `true`, `allow_update_branch`
  is `false`, and the repository is public (`private: false`).
  (`gh api repos/graphty-org/graphty-monorepo`). Consequence: when a base pull request merges, its
  branch stays, so GitHub does not retarget pull requests stacked on it.
- **R2** Master's rules: deletion and non-fast-forward blocked; pull requests required, merge
  method `merge` only, zero approvals required; required status checks `All Checks Pass` and
  `Lint PR Title` with `strict_required_status_checks_policy: false` (a branch need not be up to
  date with master to merge). (`gh api repos/.../rules/branches/master`)
- **R3** Mergify pull request #777 ("merge ready pull requests with Mergify") is open, not merged.

## Workflows on master

- **R4** Workflows: `ci.yml`, `coverage.yml`, `deploy-pages.yml`, `gpu-weekly-paired.yml`,
  `gpu.yml`, `hosts.yml`, `links-weekly.yml`, `pr-title.yml`, `release.yml`, `visual-seed.yml`.
- **R5** `ci.yml` runs the audit as a step named `Security audit` with
  `pnpm audit --audit-level=high`; `package.json` carries `pnpm.auditConfig.ignoreGhsas`
  (one entry today).
- **R6** `ci.yml` uploads its build artifacts with `retention-days: 1`.
- **R7** `release.yml`'s gate skips with `::notice::` and `release=false` (the run still concludes
  `success`) in several cases, including when the CI run that built the commit no longer holds
  unexpired artifacts (`artifacts_ok`). Its comment says master's tip "is almost never green" while
  master moves, so it releases the newest commit whose lanes are all green.
- **R8** `gpu.yml` triggers on push to master, on pull requests only when `labeled` or
  `synchronize` (the job runs only for the GPU label), and on `workflow_dispatch` with a `runner`
  input. The job's default `runs-on` is the rented label
  `machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand`. The step `node scripts/bench-compare.js` fails
  a row above 3x the checked-in baseline for the runner class. `scripts/bench-groups.js` maps
  changed files to the benchmark groups a change can move.
- **R9** `hosts.yml` runs on push to master only for listed paths (`webgpu-graph-algorithms/**`,
  `graph-format/**`, `layout/**`, `graphty-element/**`, ...).
- **R10** `pr-title.yml` runs on `pull_request` types `opened, edited, synchronize, reopened`, so
  an edited title is linted again.

## Tools in the repository

- **R11** The pre-push hook (`.husky/pre-push`) runs `tools/lfs-pre-push.sh`, a secret scan and
  `pnpm run prepush:fast` (`tools/prepush.sh`). Neither takes a lock. `tools/prepush.sh` refuses to
  run when `node_modules/.pnpm/lock.yaml` differs from `pnpm-lock.yaml`.
- **R12** `/tmp/graphty-push.lock` is a hand-made symlink to `tmp/prepush.lock` in the main
  checkout, used by convention (`flock ... git push`) in some prompts. It is not part of the gate.
- **R13** The review tool has `visual-review update <pull request>`: "merge the default branch into
  a pull request, taking its baselines" (`visual-review/trusted/cli.mjs`, `updateFromMaster` in
  `lib/accept.mjs`).
- **R14** A Finish in the review tool posts every reject and accept note as one pull request
  comment with a machine-readable block; "a rejects-only Finish commits nothing, so the comment's
  machine-readable block carries the" rejects (`visual-review/README.md`, lines 473 and 497-506).
- **R15** `.claude/settings.json` on master holds only deny rules for reading secret files. It
  registers no hooks and no MCP servers.
- **R16** `nx.json` sets `cacheDirectory: ".nx/cache"`, a path inside each checkout, so every new
  worktree starts with an empty Nx cache.

## Measured durations (runs from 2026-09-28 on, successful runs only; `ci-durations.mjs`)

- **R17** Pull request CI: median 33 min, 90th percentile 47 min. Master: CI median 53 min
  (p90 58), GPU median 52 min (p90 91, max 111), Hosts median 36 min (p90 53), Release median
  under 1 min (p90 12). Distinct master commits per day: 54 (09-27), 55 (09-26), 39 (10-02).

## This machine

- **R18** servherd hard-codes pm2's restart off: `autorestart: options.autorestart ?? false`
  (`~/Projects/servherd/src/services/process.service.ts` line 76), and neither its CLI nor its MCP
  tools pass the option. servherd identifies a server by working directory plus name
  (`registry.service.ts`, `findByCwdAndName`), so the same name started from two directories is
  two servers.
- **R19** The pm2 daemon that servherd uses (pid 188056 when read) carries `CLAUDECODE`,
  `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_PID` and both Pushover variables in its environment,
  inherited from the Claude session that first started it. Anything pm2 starts inherits them.
- **R20** `supervisord` runs in the container with `/usr/local/etc/supervisord.conf`, whose
  programs use `autorestart=unexpected`.
- **R21** `/proc/sys/kernel/random/boot_id` is the host's (a container restart does not change it;
  inferred from how Linux namespaces work, not tested by a restart). PID 1's start time
  (`/proc/1/stat` field 22) belongs to the container and changes when it restarts.
- **R22** The owner's `~/.claude/settings.json` sets no `permissions.defaultMode`, and its
  `autoMode.environment` describes a different repository (emergent-concepts-paper), which a
  session in auto mode would inherit.
- **R23** tmux 3.2a; Claude Code 2.1.288; 32 cores (`nproc`).
