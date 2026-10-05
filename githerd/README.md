# githerd

githerd keeps a GitHub repository's pipeline moving when most of the work is done by Claude Code
sessions and GitHub Actions. One daemon per repository watches the default branch, the open pull
requests and the issue backlog, turns what needs doing into jobs, and hands each job to an
interactive Claude Code worker session it starts in its own tmux server (`githerd attach` shows
them). It never merges: Mergify merges, gated by the `githerd/merge` status githerd posts. It pages
the owner only for what only the owner can do. Every GitHub write and every push goes through
deterministic code in the daemon, and in dry-run mode (the default) each write, push and worker
start is recorded instead of performed.

The package is private, plain `.mjs` with JSDoc types. It talks to GitHub through Octokit with the
token of the owner's gh login (`gh auth token`, read at start and again after a 401), and needs
`pnpm install` in the main checkout, whose `githerd/node_modules` every installed copy links to. A
repository turns it on with a `githerd.config.json` at its root on the default branch.

The design is `design/githerd/githerd-design.md`; the build order is
`design/githerd/githerd-plan.md`.

## Whose input githerd acts on

Only the repository owner's: the account `gh` is logged in as, which the daemon asks GitHub for
every poll (the user endpoint). It is not configured anywhere, and `githerd.config.json` rejects a
`trustedAuthors` key. Jobs are made only from that account's issues and pull requests; issues and
pull requests by anyone else, Dependabot and other bots included, get no job. Even on the owner's
own items, comments, reviews and review comments by other accounts never reach a worker:
`githerd_read` returns only the owner's text plus a count of what it hid, and the guard refuses a
worker's direct reads of comments and reviews through `gh api`. `githerd status` shows those counts on its TRUST line, so
nothing disappears silently. If the login cannot be resolved, githerd makes no job, starts no
worker and raises a `login-unresolved` escalation.

Workers run as the owner (his `gh` login and signing key), under `env -i` with an allow-listed
environment, a generated settings file whose denies win over his allow-all, and a PreToolUse guard
that refuses what only the owner or the daemon does: merging, closing, retargeting, the owner's
labels, `git push` (workers push through `githerd_push`), and every `githerd` command that starts or
changes githerd itself.

## What gets worked on next

Each reconcile turns the facts into jobs (`lib/jobs.mjs`): an incident for each code-red key on
master and each failed or stalled release; a `pr` job for each of the owner's pull requests with
its own failing check, a second conflict sighting or a visual reject; a `title` job when only
`Lint PR Title` fails; a `review` of each new patch a job pushed; a triage job of at most 20
unlabeled issues, and a refresh after every 20 merges and a full pass after every 100 (no clock:
merges count); one issue job for the front of the backlog; and a re-land job after a revert. A
queued job whose target closed or no longer needs work is cancelled.

The queue order is design section 5.4, and every job carries a one-line reason: incidents first
(master and release, then shared ones), reviews, pull requests oldest first, titles, triage of new
issues, approved majors, then issues (an open order first, then priority, bugs first, oldest), then
refresh passes and low-priority incidents. The owner steers with two labels: `githerd:next` puts an
issue or pull request first in its kind, `githerd:skip` takes it out. Both count only when the
owner's account added them.

Workers start while a slot is free: 3 working sessions, one more for urgent work, at most 6 idle
sessions waiting on checks, under the machine's load and memory limits and the configured worker
hours a day (`workers` in the config; `githerd workers <n>` changes the slots at runtime). A worker
starts only while the `workers` write group acts, the platform self-test passed on the installed
Claude Code, and the signing probe passes. What a worker sends to GitHub is a separate group,
`worker-writes` (`actions.workerWrites`): its `githerd_push`, its `githerd_rerun` and its own `gh`
writes. While that group does not act, pushes and re-runs are `would-do` lines and the guard refuses
the worker's `gh pr create`, comments, issue creation and every other `gh` write, so a worker can
run for real and write nothing to GitHub. Its worktree (`.worktrees/githerd-<job>`) is installed
and built in the background first; sessions open one at a time, urgent ones first.

Every session gets the thirteen tools of design section 6 from the MCP server in `.mcp.json`:
`githerd_status`, `githerd_next`, `githerd_claim`, `githerd_wait`, `githerd_expect`, `githerd_push`,
`githerd_rerun`, `githerd_read`, `githerd_done`, `githerd_ask_owner`, `githerd_record`,
`githerd_mine` and `githerd_verdict`. A master failure that matches none of the classifier's
unambiguous patterns (a credential, paid capacity, a lost runner, a package mirror or DNS outage)
is unclassified: githerd holds merges, re-runs the job once and queues an urgent verdict job, and
the session that takes it calls `githerd_verdict` with code or environment. Only a code verdict
allows a revert; an environment verdict lifts the hold. When a job waits in the queue with no
free worker slot, githerd messages the idle sessions in this repository once per job, inviting them
to call `githerd_next` and claim it. A session calls `githerd_next` for its job (a worker) or the queued jobs it could
take (an owner session), and `githerd_claim` with its overlap judgment before any edit. A pull
request another session works on is never offered (design section 8.2): one whose job a live session
claimed; one whose CI is running on a head someone other than githerd pushed; and one whose CI
failed on such a head while githerd waits for an answer. For that last case githerd asks every live
Claude session working in this repository once per failed head, through Claude Code's session
messaging ("githerd: CI failed on #710 ... call the githerd_mine tool with pr 710 ..."). A session
that is working on it calls `githerd_mine` (or claims the job), which keeps the pull request for it
until the session ends or a new push arrives; with no answer within `workers.askMinutes` (default 10) githerd offers it as a job. In dry-run the question is a `would-do` line. `githerd_next` lists
in-use jobs with the reason, and `githerd status` shows it on the pull request's line. A held (`hold`)
pull request that is broken is still offered; the label only keeps it from merging. Pushes go through
`githerd_push`, which runs the push and its pre-push gate through the machine's push queue
(`tools/push-queue.sh`). `githerd_wait` declares a wait the daemon watches and ends with a
doorbell; `githerd_done` is checked against GitHub before the job counts as done.

## Commands

`node githerd/bin/githerd.mjs <command>`, or `pnpm exec githerd <command>`:

```bash
githerd status [--json]          # the daemon's status, as githerd_status shows it
githerd ledger --since 1d --kind job-created --target pr:704
githerd mode paused              # lower the mode locally (also dry-run); mode clear removes it
githerd pause | resume           # stop / restart every worker start and doorbell
githerd workers <n> | --stop     # working sessions (0 keeps only the urgent slot); --stop ends all
githerd keep <window> [--with-job]  # hand a worker's window to you
githerd release <job>            # give back a job you stopped or kept
githerd attach                   # githerd's tmux server, one window per worker
githerd ack <key>                # clear an escalation
githerd veto <proposal id>       # stop a pending close or revert
githerd install                  # prepare the daemon and print the servherd command that starts it
githerd ensure                   # find or start the daemon, e.g. after a container restart
githerd restart                  # servherd restart githerd
githerd dev                      # this working tree as the githerd-dev daemon, dry-run only
githerd dev --stop               # stop githerd-dev and remove it from servherd (no prompt)
githerd doctor [--send-test]     # gh, servherd, daemon code, pm2 autorestart, notify, signing
githerd selftest                 # one worker on its own tmux server through every platform check
```

The `API:` line of `githerd status` is what githerd's own GitHub calls cost: the last poll, the
current UTC hour so far and the hour before, as core calls, free 304s (an unchanged answer to a
request sent with its ETag) and GraphQL calls. The ledger has the same per poll
(`--kind api-use`) and per hour (`--kind api-hour`).

The container has no cron and no systemd: pm2 restarts a crashed daemon (servherd's
`--autorestart`), an open session's launcher restarts one whose `alive` file is over a minute old
and whose process is gone, and after a container restart `githerd ensure` brings it back before any
session opens. `mode acting` is refused; the mode is raised only by a
`githerd.config.json` change merged to the default branch. `githerd dev` needs `GITHERD_CONFIG`
and keeps its state in `<worktree>/.githerd-dev/`; point the other commands at it with
`GITHERD_STATE_DIR=.githerd-dev`. Exit codes: 0 done, 1 failed, 2 usage or refused.

## The MCP server

Claude Code starts `node ~/.githerd/graphty-monorepo/current/bin/githerd-mcp.mjs` (the launcher),
the installed copy of the default branch's githerd, never a worktree's. It lists the session tools at
once, then finds or starts the repository's one daemon through servherd under the name `githerd`,
running the default branch's copy of this package from `~/.githerd/<checkout>/current/`, and
forwards tool calls to it. Its errors go to `~/.githerd/<checkout>/launcher.log`.

## What the committed project settings turn on

Two files register githerd for every Claude Code session opened in a checkout that has them. Both
point at `~/.githerd/graphty-monorepo/current/`, which `githerd install` (or the first daemon
start) creates, so a branch's own edits never change its hooks or its MCP server:

- `.mcp.json` registers the MCP server above. Claude Code asks once per project to approve a
  project's MCP servers. Once approved, every session's launcher finds the one daemon **and starts
  it through servherd when it is not running**: landing this file on the default branch is what
  makes githerd run whenever a session is open. Before githerd is installed, `node` finds no file
  and Claude Code lists the server as failed; nothing else happens.
- `.claude/settings.json` registers a `SessionStart` hook for new sessions (`startup` only):
  `bin/githerd-hook.mjs SessionStart` asks the daemon for its status and prints one line, banners
  first (`githerd: master green; 0 waiting on the owner; 3 open pull requests; mode dry-run`), to
  the person and into the session's context. It waits 2 s for the daemon and then prints why there
  is no answer; it always exits 0, so a broken githerd never blocks a session. Before githerd is
  installed, the command finds no file and prints nothing. Workers get every hook of design
  section 4.10 (the Stop gate, steering, API failures, the guard) from their generated settings.
  It also registers a `PreToolUse` hook on Bash: a shell check skips every command without
  `gh `, and for the rest `bin/githerd-hook.mjs PreToolUse` logs each `gh` write to an issue or a
  pull request in `session-writes.jsonl` in the state directory, so the daemon never reads a
  comment, reopen or label removal a Claude session made with the owner's account as his own
  input. It prints nothing and always exits 0.

On a branch that is not merged, both files act only in sessions started in that branch's own
worktree.

`githerd/scripts/smoke-launcher.sh` checks the launcher against the real servherd: five launchers
at once in a scratch repository, under the name `githerd-smoke`, must share one daemon; it removes
its entry at the end.

## Prerequisites

The owner does these once (design section 12.1), in this order: soak the branch's code as the
development daemon, merge it, then install the shared daemon. `install` and `ensure` archive
githerd from the default branch, so they fail until the merge.

1. **Soak before the merge.** From the githerd worktree, in one of the owner's own Claude sessions
   (it has the signing variables and the Pushover keys), run
   `GITHERD_CONFIG=$PWD/githerd.config.json node githerd/bin/githerd.mjs dev`. The development
   daemon runs this worktree's code, keeps its state in `.githerd-dev/` (point the other commands
   at it with `GITHERD_STATE_DIR=.githerd-dev`) and never rises above dry-run.
   `design/githerd/githerd-plan.md` ("How to run 2.3") has the procedure; stop it with
   `githerd dev --stop`.
2. **Merge.** Once the soak's findings are fixed or explained, merge the pull request.
3. **Start githerd once.** From the main checkout on the default branch, in one of the owner's own
   Claude sessions, or a shell that exports the `GIT_CONFIG_*` signing variables (a plain terminal
   does not: they live in the `env` of `~/.claude/settings.json`), run
   `node githerd/bin/githerd.mjs install` and then the servherd command it prints (or
   `githerd ensure`). `install` copies `HOME`, `PATH`, the signing variables and the Pushover keys
   into `~/.githerd/<checkout>/daemon-env.json`, owner-only; with no signing variables in its
   environment it takes them from `~/.claude/settings.json`, and it warns when it finds none
   anywhere, because the daemon's git would then sign with the gpg key, whose pinentry cannot run
   without a terminal. The command starts the daemon under `env -i` from the state directory with
   servherd's `--autorestart`, so pm2 brings back a crashed daemon. The config runs the published
   servherd through `npx -y servherd@^1.2.0`, the first release with `--autorestart`. After a container restart the daemon comes back when the first session
   opens, or with `node githerd/bin/githerd.mjs ensure`.

    githerd finds the default branch through `refs/remotes/origin/HEAD`. A checkout whose remote
    was added by hand lacks it; githerd then asks the remote (`git ls-remote`, no GitHub API) once
    per process, and `githerd doctor` warns. Set it once with `git remote set-head origin -a`.

4. **Notify credentials.** The daemon pages with the Pushover keys from `daemon-env.json`, never
   from pm2's environment. Check it with `githerd doctor --send-test`; after changing the keys, run
   `githerd install` again and restart the daemon.
5. **MCP approval.** The server is registered in the repository's `.mcp.json`. Claude Code may ask
   to approve it once in each new worktree.

    Outside a git repository the launcher exits quietly, and in a repository without githerd
    `githerd_status` answers that githerd is not configured, with the reason.

The platform self-test needs nothing from the owner: the daemon runs it before the first worker
start and again after each Claude Code version change, and pages once if it fails.
`node githerd/bin/githerd.mjs selftest` runs it by hand.

## Trying one worker with nothing on GitHub

Once the shared daemon runs (after the merge; the development daemon never starts a worker), one
real worker can work a real issue while every GitHub write stays dry-run. Starting workers is the
`workers` write group; the worker's pushes, re-runs and own `gh` writes are the separate
`worker-writes` group, which stays off. The worker edits and commits in its own worktree,
`githerd_push` records the push it would make instead of pushing, and the guard refuses its
`gh pr create`, comments and issue creation.

1. Give one low-priority issue the `githerd:next` label and run `githerd workers 1`.
2. Wait until `githerd mode` shows ledger lines for `workers` (each start githerd would have made).
   The config check refuses an acting group with none.
3. Merge a pull request that changes `githerd.config.json` to `"mode": "acting"` with only
   `"workers": true` under `actions`. Every other switch, `workerWrites` included, stays `false`.
4. Watch with `githerd attach`. The trial passes when the worker claims the issue, commits its fix
   in `.worktrees/githerd-<job>`, and `githerd_push` answers `would push ... (dry-run)`;
   `githerd ledger --since 2h --kind would-do` then shows the push under `worker-writes`, and
   GitHub shows no new branch, pull request or comment. Its `githerd_done` cannot pass, because
   nothing was pushed.
5. Stop with `githerd workers --stop`, then a pull request that sets `actions.workers` back to
   `false` (or `githerd mode dry-run`, which lowers every group on this machine at once).

Every write group is turned on the same way, one pull request per switch under `actions`, and only
the owner approves each one.

## Development

```bash
pnpm exec nx run githerd:test        # unit tests (vitest, node)
pnpm exec nx run githerd:coverage    # with the 80/75 coverage thresholds
pnpm exec nx run githerd:lint        # eslint and tsc over the JSDoc types
./tools/run-knip.sh --workspace githerd
```
