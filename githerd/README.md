# githerd

githerd keeps a GitHub repository's pipeline moving when most of the work is done by Claude Code
sessions and GitHub Actions. One daemon per repository watches the default branch, the open pull
requests and the issue backlog; it pages the owner when the default branch breaks and stays
broken, gives every Claude session one shared picture of who is doing what through MCP tools, and
starts short, bounded Claude runs for what a script cannot fix. Every GitHub write goes through
deterministic code in the daemon, and in dry-run mode (the default) each write is recorded instead
of performed.

The package is private, plain `.mjs` with JSDoc types, and has no runtime dependencies. A
repository turns it on with a `githerd.config.json` at its root on the default branch.

The design is `design/githerd/githerd-design.md`; the build order is
`design/githerd/githerd-plan.md`.

## Commands

`node githerd/bin/githerd.mjs <command>`, or `pnpm exec githerd <command>`:

```bash
githerd status [--json]          # the daemon's status, as githerd_status shows it
githerd ledger --since 1d --kind run-end --target pr:704
githerd runs --last 10           # recent judgment runs; githerd run <id> shows one
githerd mode paused              # lower the mode locally (also dry-run); mode clear removes it
githerd ack <key>                # clear an escalation
githerd veto <proposal id>       # stop a pending close or revert
githerd ensure                   # find or start the daemon, e.g. after a container restart
githerd restart                  # servherd restart githerd
githerd dev                      # this working tree as the githerd-dev daemon, dry-run only
githerd doctor [--send-test]     # gh, servherd, daemon code, pm2 autorestart, notify, signing
```

The container has no cron and no systemd: pm2 restarts a crashed daemon, an open session's
launcher restarts a missing one, and after a container restart `githerd ensure` brings it back
before any session opens. `mode acting` is refused; the mode is raised only by a
`githerd.config.json` change merged to the default branch. `githerd dev` needs `GITHERD_CONFIG`
and keeps its state in `<worktree>/.githerd-dev/`; point the other commands at it with
`GITHERD_STATE_DIR=.githerd-dev`. Exit codes: 0 done, 1 failed, 2 usage or refused.

## The MCP server

Claude Code starts `node githerd/bin/githerd-mcp.mjs` (the launcher). It lists the session tools at
once, then finds or starts the repository's one daemon through servherd under the name `githerd`,
running the default branch's copy of this package from `.githerd/versions/`, and forwards tool
calls to it. Its errors go to `.githerd/launcher.log`.

`githerd/scripts/smoke-launcher.sh` checks the launcher against the real servherd: five launchers
at once in a scratch repository, under the name `githerd-smoke`, must share one daemon; it removes
its entry at the end.

## Development

```bash
pnpm exec nx run githerd:test        # unit tests (vitest, node)
pnpm exec nx run githerd:coverage    # with the 80/75 coverage thresholds
pnpm exec nx run githerd:lint        # eslint and tsc over the JSDoc types
./tools/run-knip.sh --workspace githerd
```
