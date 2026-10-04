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

## Whose input githerd acts on

Only the repository owner's: the account `gh` is logged in as, which the daemon asks GitHub for
every poll (`gh api user`). It is not configured anywhere, and `githerd.config.json` rejects a
`trustedAuthors` key. Every judgment run, of every kind, considers only that account's issues and
pull requests; issues and PRs by anyone else, Dependabot and other bots included, get no run. Even
on the owner's own items, comments, reviews and review comments by other accounts never reach a
run: the run tools return only the owner's text plus a count of what they hid. `githerd status`
shows those counts on its TRUST line, so nothing disappears silently. If the login cannot be
resolved, githerd starts no runs and raises a `login-unresolved` escalation.

That, together with githerd's own code checking and pushing every branch a run produces, is the
defense against a run being steered into writing malicious code. Claude Code's Bash sandbox is
defense in depth: code-editing runs ask for it and get it wherever bubblewrap (`bwrap`) and `socat`
are installed, and run without it elsewhere, with a `sandbox-disabled` note in the ledger. Runs
never hold a GitHub credential either way.

## What gets worked on next

One deterministic work queue orders everything, and every item carries a one-line reason
("high-priority bug, 41 days old, effort:low"); `githerd status` shows the whole queue. Across
kinds, githerd finishes before it starts: a red master, then a stuck release, then the owner's
open PRs that need work, then issues, unlabeled ones first so they can be triaged. PRs go oldest
first, with quick unblockers (a branch update from green master, a rerun of a known flake) ahead;
a stacked PR waits for its base, and a PR waiting on the owner (visual review, a held major, a
decision) is listed on the owner's waiting list and not worked. Issues go by priority, then bugs
first, then age, then lower effort; an issue gains one priority level per 60 untouched days, never
above high. `blocked`, `needs-*`, breaking and other authors' issues are left out. New issue work
starts only while githerd has fewer than 3 PRs or backlog runs open (`backlog.wipCap`).

effort:high issues are worked like the rest, on opus with larger caps, and a run may split one
into smaller issues itself; size is never a question for the owner. The owner can steer with two
labels: `githerd:next` puts an issue or PR first in its kind, `githerd:skip` takes it out. Both
count only when the owner added them.

A session picks up work with `githerd_next`, which returns the top free item with its reason and
claims it in the same call, so two sessions never take the same item. The rules are in design
section 10.2.

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

## Prerequisites

The owner does these once, before the first soak (design section 17):

1. **Supervision: nothing to install.** The launcher turns on pm2's autorestart for the daemon
   after every start, so pm2 brings back a crashed daemon. The container has no cron and no
   systemd, so neither `pm2 startup` nor a crontab line is available: after a container restart
   the daemon comes back when the first session opens, or when the owner runs
   `node githerd/bin/githerd.mjs ensure`.
2. **Notify credentials.** The notify command loads its own credentials (the Pushover keys from a
   file), so paging works whatever environment pm2 started the daemon in. Check it with
   `githerd doctor --send-test`.
3. **MCP approval.** The server is registered in the repository's `.mcp.json`. Claude Code may ask
   to approve it once in each new worktree. Either approve it per worktree, or register it once at
   user scope with a relative path, which starts it in every project:

    ```bash
    claude mcp add -s user githerd -- node githerd/bin/githerd-mcp.mjs
    ```

    Outside a git repository the launcher exits quietly, and in a repository without githerd
    `githerd_status` answers that githerd is not configured, with the reason.

4. **Admin pull-request bypass.** Decide whether to keep the Admin bypass on ruleset 23973898
   (design section 14) and record the answer here. Not decided yet.

## Development

```bash
pnpm exec nx run githerd:test        # unit tests (vitest, node)
pnpm exec nx run githerd:coverage    # with the 80/75 coverage thresholds
pnpm exec nx run githerd:lint        # eslint and tsc over the JSDoc types
./tools/run-knip.sh --workspace githerd
```
