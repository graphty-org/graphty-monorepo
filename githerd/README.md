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
worker's direct reads of comments and reviews through `gh api`. The GitHub watchdog's alarm comments
(those carrying `<!-- watchdog:` or `<!-- master-clock:`) are never the owner's word, whichever
account posted them: they answer no owner item, veto nothing and reach no worker. `githerd status` shows those counts on its TRUST line, so
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
merges count); one issue job for the front of the backlog; a re-land job after a revert; and one
promotion job per advisory CI check that is due (below). A queued job whose target closed or no
longer needs work is cancelled.

The queue order is design section 5.4, and every job carries a one-line reason. Three tiers,
highest first, each finishing work in flight before starting new work:

1. Keep things running: incidents (master and release, then shared ones), reviews, broken pull
   requests oldest first (held breaking ones get fix-only jobs), titles, issues master already
   names (verify the fix), re-lands, advisory check promotions, then triage of new issues and
   approved majors.
2. Bugs (type label `bug`): by priority (critical, high, medium, low, none last), then effort low
   before high, then oldest.
3. Infrastructure (type label `infrastructure`: CI, tooling, build, test infrastructure, githerd,
   repository maintenance), ordered the same way.

Refresh passes and low-priority incidents come last. The issue tiers are `backlog.issueTypes` in
the config, default `["bug", "infrastructure"]`: an issue of any other type (enhancements for now)
gets no new job, and a queued one nobody holds is withdrawn ("enhancements are not offered for
now"). Add `"enhancement"` to the list to offer them again. The type label is set by a triage
session's judgment, never inferred from paths. The owner steers with two labels: `githerd:next` puts an
issue or pull request first in its kind, even an enhancement, `githerd:skip` takes it out. Both count only when the
owner's account added them.

An issue labelled `blocked`, `research`, `in-progress`, `tracking` or any `needs-*` label (among
others) gets no job. `tracking` is for an issue that only tracks other issues and stays open, such
as a checklist of stages each filed as its own issue: githerd never makes a job of it, whatever its
type. An issue a session reported `deferred` is not offered again until it changes (a comment, an
edit or a label).

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

Every session gets the fourteen tools of design section 6 from the MCP server in `.mcp.json`:
`githerd_status`, `githerd_next`, `githerd_claim`, `githerd_wait`, `githerd_expect`, `githerd_push`,
`githerd_rerun`, `githerd_read`, `githerd_done`, `githerd_ask_owner`, `githerd_record`,
`githerd_mine`, `githerd_offers` and `githerd_verdict`. A master failure that matches none of the classifier's
unambiguous patterns (a credential, paid capacity, a lost runner, a package mirror or DNS outage)
is unclassified: githerd holds merges, re-runs the job once and queues an urgent verdict job, and
the session that takes it calls `githerd_verdict` with code or environment. Only a code verdict
allows a revert; an environment verdict lifts the hold. When a job waits in the queue with no
free worker slot, githerd messages the sessions in this repository with room once per job, inviting
them to call `githerd_next` and claim it. A session the owner adds to `workers.sessions` first gets one
onboarding message, before any invitation: the owner made it a githerd worker; take jobs with
`githerd_next` and `githerd_claim`, do each job's work in background subagents, answer the status
questions with `githerd_expect` and report with `githerd_done`; start now unless the owner says
otherwise. It is sent once per membership (taking the session out of `workers.sessions` and back in
sends it again). A session the owner has busy with other work calls `githerd_offers` with `pause`
true, or runs `githerd pause-offers` from its shell: githerd invites it to nothing, and the board
says so, until `pause` false or `githerd resume-offers`. It stays in `workers.sessions`. A session has room while it is idle, or while the
`capacity` it last gave in `githerd_expect` (how many more jobs it can work in parallel) is above
the jobs it claimed since. No fixed allowance limits a session; the shared resources do: while
pushes wait in the push queue, the repository's Actions runs wait for a runner, or every test slot
is taken with runs waiting, githerd invites no session to new work and its status question says to
take none; the board names the constraint. `workers.maxActive` (working, starting, or waiting on its
own task; blocked, parked and verifying jobs do not count) is only a runaway guard: a session at it
is not invited, and `githerd_claim` refuses it another until it finishes or reports one. The number
of queued issue jobs follows the room the sessions reported (at least one, at most twice
`workers.maxActive`, per session). The queue
finishes before it starts: within one owner priority, a broken pull request's job, a review or a
fix to verify comes before a fresh issue. A session calls `githerd_next` for its job (a worker) or the queued jobs it could
take (an owner session), and `githerd_claim` with its overlap judgment before any edit. A pull
request another session works on is never offered (design section 8.2): one whose job a live session
claimed; one whose CI is running on a head someone other than githerd pushed; and one whose CI
failed on such a head while githerd waits for an answer. For that last case githerd asks every live
Claude session working in this repository once per failed head, through Claude Code's session
messaging ("githerd: CI failed on #710 ... call the githerd_mine tool with pr 710 ..."). A session
that is working on it calls `githerd_mine` (or claims the job), which keeps the pull request for it
until the session ends or the pull request closes, across new pushes; a session without githerd's
tools answers from its shell instead (below), or the owner names it from his terminal with
`githerd mine <pr> <session-name>`; with no answer within `workers.askMinutes` (default 10) githerd offers it as a job. In dry-run the question is a `would-do` line, and since nobody heard it the pull request stays in use rather than being offered. A head that conflicts with master is asked about the same way. `githerd_next` lists
in-use jobs with the reason, and `githerd status` shows it on the pull request's line. A held (`hold`)
pull request that is broken is still offered; the label only keeps it from merging. Pushes go through
`githerd_push`, which runs the push and its pre-push gate through the machine's push queue
(`tools/push-queue.sh`). `githerd_wait` declares a wait the daemon watches and ends with a
doorbell; `githerd_done` is checked against GitHub before the job counts as done.

githerd also infers whose a pull request is, from the push log, the sessions' transcripts and who
works in its worktree, and asks the owner of a broken one "are you fixing it?" every
`workers.statusMinutes`. An owner that neither answers nor shows activity (a process in the
branch's worktree, a push) loses it to the queue until its next push. A session without githerd's
MCP tools (one started before githerd was set up) is asked the same way and answers from its own
shell, with the command line the question prints:

```bash
node <githerd>/bin/githerd.mjs mine 710     # this session is working on #710: keep it
node <githerd>/bin/githerd.mjs disown 710   # this session gives #710 up now
```

`<githerd>` is the directory the running daemon's code is in (a checkout's `githerd/` for the
development daemon, the installed copy otherwise), and the development daemon's question prefixes
`GITHERD_STATE_DIR=<its state directory>` so the command finds it. Both act only for the session
the command runs under: the CLI walks its own parent processes to the first one with an entry in
Claude Code's session registry (`~/.claude/sessions/<pid>.json`, its `procStart` matching), the
lookup `tools/push-queue.sh` makes for the push log, so no session can answer for another. `mine`
is the `githerd_mine` answer. `disown` ends the session's owner record and inferred ownership at
once, and githerd never infers it back from that session's earlier pushes or its worktree; only a
new push, a claim of the pull request's job or `mine` by that session makes it its own again. The
board shows "disowned by <session>" on the pull request's line.

## Flaky tests

githerd tracks flaky tests from the runs that happen anyway; it never starts a run to look for
flakiness, except one master re-run (below). From every failed test job log it reads (a red master
job, a failed `Test (...)` job on a pull request or a merge-queue batch, each read once) it records
the failing Vitest tests: run, attempt, job, commit, where it ran, and whether the change touched
the test's package or a package it depends on.

A test is proven flaky when the same job passes on the same commit (anyone's re-run), when a merge
batch holding the failing pull request head passes the job, when master passes at the next commit
and nothing between touched the package, or when it failed on two or more pull requests that do not
touch its package. Each proven test gets one issue, `Flaky test: <test> (<package>)`, labelled
`bug`, `intermittent`, `effort:medium` and a priority, filed with the owner's account through the
`owner-items` write group, so the issue queue offers it like any other. Later failures are appended
to it, and a closed one is reopened rather than filed again. Its priority only goes up: critical
once it failed on master or in a merge batch, high once on two or more pull requests, medium after
one.

While its issue is open, a known flaky test failing on a pull request is not that pull request's
failure: the pull request's job says so and names the issue. On master, a red job whose failing
tests are all known flakes, or all in packages the red changes did not touch, is re-run once (that
job only, through `worker-writes`) before anything moves toward a revert, and the incident points at
the issue. The GPU lane is never re-run for this; its failures are only recorded. There are no
retries, skips or quarantines in the test runners. `githerd board flakes` lists every tracked test
with its failures, proof and issue. Design section 4.12 has the details.

## CI's own signals

**Advisory checks.** `tools/ci-advisory-checks.json` on the default branch lists new CI checks
under `advisory`, each with the date it becomes required (`enforce`, UTC). githerd reads it, and
`.github/workflows/ci.yml` to know each job's check run names, after every fetch of the default
branch. Before the enforce date a failing advisory check is a warning: it makes no pull request
broken, no `pr` job, no ownership question and no merge hold, it is never an incident key on
master, and the board shows `advisory: <check> (enforced from <date>)` on the pull request's line
or under MASTER. From the enforce date, and for every check under `required`, a failure counts as
usual.

**Promotion.** The CI workflow tests ask for an entry's promotion from three days before its
enforce date (`tools/ci-workflows.test.mjs`). From then githerd makes one job for it,
`issue-promote-<check>`, in the keep-things-running tier: open one pull request that moves the
entry into `required` and removes its `continue-on-error` and warning step from ci.yml, fixing the
check first if it still fails. The job edits `.github/workflows/`, which a worker may not, so it is
offered to the owner's sessions only. It is made once per entry, never again after it was done,
and cancelled once the entry leaves the advisory list.

**Merge batches.** A Mergify merge-batch commit on master ("Merged #42, #43, #44") names every pull
request in it as a suspect of a red master, so no one of them is reverted alone; the batch
branch's inner "Merge of #42" commits are not landings. The verdict job of a red batch commit
tells its session that the batch's tree is exactly what "Queue Checks Pass" passed, so it checks
master-only jobs (benchmarks, push-only steps) and the known flaky tests before blaming any one
pull request.

**Heartbeat.** githerd's first write opens one issue labelled `githerd-heartbeat` and pins it;
after that it rewrites the issue's body, never a comment, every 15 minutes and at once when a line
changes. Line 1 is `alive: <ISO time>`, then `mode:`, `paused:` while paused, one `stuck:` per job
githerd could not start, `stopped:` on a clean stop, `fatal:` in fatal mode, and `version:`. An
open labelled issue is reused; a second is never opened. The writes are the `owner-items` write
group, so in dry-run each change is one `would-do` line and GitHub is asked nothing, and only the
live daemon writes (a development daemon only with `GITHERD_DEV_ACT=1`). The issue is no work:
githerd makes no job or triage of it. `.github/workflows/githerd-watchdog.yml` reads it to alarm the
owner when githerd stops while the dev machine is off.

**Statistics.** At its first poll of each new UTC day the daemon appends yesterday's record to
`stats-history.jsonl` in the state directory: open issues by type and priority, issues opened (by
source: the owner by hand, a Claude session, githerd, a CI bot, anyone else) and closed (by a merged
pull request's closing keyword, as not planned or duplicate, by githerd, or otherwise), pull
requests opened, merged and closed unmerged, the heads whose required lanes failed, merge-queue
dequeues and release trains. It is rebuilt from GitHub's list endpoints, so a day the daemon missed
is filled in the next day. `githerd stats` reports it, and then the pre-push gate: pushes and
failures per day, the median queue wait and gate time, and the failing tests and steps ranked by
the queue hours they cost, each split into failures where the push changed the test's package and
failures where it did not (a flaky or load-sensitive test). It reads the push log the push queue
writes in the main checkout's `tmp/`; the daemon reads it every poll too, so a test that fails the
gates of two branches that do not touch its package gets a flaky-test issue.

## Commands

`node githerd/bin/githerd.mjs <command>`, or `pnpm exec githerd <command>`:

```bash
githerd status [--json]          # the daemon's status, as githerd_status shows it
githerd ledger --since 1d --kind job-created --target pr:704
githerd stats [--json]           # issues and pull requests per week, where issues come from, what is stalled
githerd stats --backfill         # first rebuild the missing days of the last 8 weeks from GitHub (reads only)
githerd stats --backfill-gate    # first recover older pushes' pre-push gate output from transcripts and shard logs
githerd mode paused              # lower the mode locally (also dry-run); mode clear removes it
githerd pause | resume           # stop / restart every worker start and doorbell
githerd workers <n> | --stop     # working sessions (0 keeps only the urgent slot); --stop ends all
githerd keep <window> [--with-job]  # hand a worker's window to you
githerd release <job>            # give back a job you stopped or kept
githerd attach                   # this repository's githerd tmux server, one window per worker
githerd ack <key>                # clear an escalation
githerd veto <proposal id>       # stop a pending close or revert
githerd mine <pr> <session-name> # that live session owns the pull request: never offered or asked about
githerd mine --list | --drop <pr> # the owner records, or remove one
githerd mine <pr> | disown <pr>   # from inside a Claude session: for that session only
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

Claude Code starts `node ~/.githerd/graphty-org_graphty-monorepo/current/bin/githerd-mcp.mjs` (the
launcher), the installed copy of the default branch's githerd, never a worktree's. It lists the
session tools at once, then finds or starts the repository's one daemon through servherd under the
name `githerd-<owner>_<name>`, running the default branch's copy of this package from
`~/.githerd/<owner>_<name>/current/`, and forwards tool calls to it. Its errors go to
`~/.githerd/<owner>_<name>/launcher.log`.

## Several repositories on one machine

Each repository's githerd keeps to itself, so githerd can run in several repositories at once:

- **State directory** `~/.githerd/<owner>_<name>/`, from `repo` in the main checkout's
  `githerd.config.json`, lower-cased (`graphty-org/graphty-monorepo` is
  `~/.githerd/graphty-org_graphty-monorepo/`). Two repositories whose folders share a name no
  longer share state, and the name does not depend on where the checkout lives, so the committed
  `.mcp.json` and hook settings can name it. The directory records its checkout in a `root` file;
  a second clone of the same repository on the machine gets `~/.githerd/<owner>_<name>-<hash>/`
  instead (a hash of its path), with its own daemon. Two daemons then act on one GitHub
  repository, which is rarely what you want; the committed settings only reach the first clone's
  installed copy. A repository with no readable `repo` gets `<folder>-<hash>`.
- **tmux server**: the socket `tmux` in the state directory (`githerd attach` runs
  `tmux -S ~/.githerd/<owner>_<name>/tmux attach -t githerd`). Two repositories with a job of the
  same id (`issue-12`) never meet, and one daemon's watchdog never lists, interrupts or ends
  another's workers. The self-test has its own, `selftest.tmux` beside it.
- **servherd name** `githerd-<owner>_<name>`. servherd looks a server up by name alone for
  `restart`, `stop` and `remove` and names its pm2 process after it, so two daemons named `githerd`
  would restart each other. The launcher also checks that a daemon's `/health` names this
  checkout before using it, a `GITHERD_URL` development daemon included.
- **Locks, archived versions, `current`, the ledger and every job file** are inside the state
  directory, so they are per repository too. The push queue's tickets and the push log are in the
  main checkout's `tmp/`, and githerd reads the transcripts only of sessions working in this
  repository (in its main checkout or one of its worktrees).

Before 2026-10 the state directory was `~/.githerd/<folder of the main checkout>/`. githerd renames
it to the new name the first time it resolves the directory, but only when its `daemon.json` names
this checkout (another repository's directory of the same folder name is never taken over) and
nothing runs from it: no live daemon, restart lock, gate lock or worker. Until then it keeps using
the old directory and the old servherd name `githerd`, so a running install keeps working; once
that daemon has stopped, the next start moves the directory and registers the new name. The old
servherd entry then points at a directory that is gone; remove it with `servherd remove githerd`
when no other repository's daemon still uses that name. Workers started before the change
recorded the machine-wide tmux server `tmux -L githerd`, and githerd keeps reaching them there
until they end. The development daemon is the exception: it is `githerd-dev` on every machine, so
run `githerd dev` in one repository at a time.

### Adopting githerd in another repository

githerd runs the copy of this package that the repository's default branch holds, so a repository
adopting it needs:

- this package in its tree (`githerd/`, with its dependencies installed in the main checkout:
  an archived copy links to the main checkout's `githerd/node_modules`);
- `githerd.config.json` on its default branch, with its own `repo` (which also names its state
  directory, as above) and its own `notify` prefix;
- `.mcp.json` and the `.claude/settings.json` hooks of this repository, with
  `graphty-org_graphty-monorepo` replaced by its own `<owner>_<name>`;
- `tools/push-queue.sh`, the push queue every session pushes through (this repository's own
  tool; githerd also uses the main checkout's `tmp/push-queue.sh` when the checked-out branch has
  no `tools/` copy). Without either, githerd's pushes and its reference gate run unqueued: it still
  pushes, and the board's `PUSH QUEUE: none` line says so until a script exists. A copy of
  this repository's script works as it is: it keeps its tickets and its push log in its own main
  checkout's `tmp/`, so each repository has its own queue;
- `tools/prepush.sh`, the gate the reference worktree runs, printing `Pre-push validation failed`
  and one `[FAIL] <step>` line per failed step.

The job worktree preparation is still this repository's: `pnpm install --frozen-lockfile`, the Nx
build, and graph-io's tests as the smoke test (`JOB_STEPS` in `lib/worktrees.mjs`), and the config
gate's replay of a red stretch reads this repository's recorded month. Another repository's
workers need those made configurable first.

## What the committed project settings turn on

Two files register githerd for every Claude Code session opened in a checkout that has them. Both
point at `~/.githerd/graphty-org_graphty-monorepo/current/`, which `githerd install` (or the first
daemon start) creates, so a branch's own edits never change its hooks or its MCP server:

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
   into `~/.githerd/<owner>_<name>/daemon-env.json`, owner-only; with no signing variables in its
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
