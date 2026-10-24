# Branch sync

Status: adopted by the owner on 2026-10-22. Implemented in `tools/branch-sync.mjs` (run as
`node tools/land.mjs sync`), `tools/branch-note.mjs` and `tools/branch-push.sh`. It builds on
golden-local landing (`design/ci/golden-local.md`).

## 1. Why

Every change reaches master by being merged ("landed") into the integration branch `golden` through
the full local pre-push gate. A branch that is worked on for weeks without merging golden drifts: the
code it was written against keeps changing under it, and nobody finds out until it lands.

That happened to the design studio's tier 3 branch. On 2026-10-21 it took about 13 hours to land. In
the weeks it had been apart it had collected stale tests, 173 SonarQube findings, changes that broke
other code, and a test shard that had grown too long, and eight other branches landed while its gate
was running, each of them conflicting with it again. Every one of those problems would have been
small if it had been found the week it appeared.

The branch sync merges golden into every branch in progress once a night, so a long-running branch is
never more than a day behind, and when a landing on golden breaks a branch, the branch's owner hears
about it the next morning, with the name of the landing that did it.

## 2. What it does

### The `golden-good` tag

The sync never merges golden's tip. It merges from a tag on GitHub called `golden-good`: the newest
golden commit that verification after landing passed (up to `golden-verified`, whether the run was in CI
or on this machine) and
whose screenshot preview came back clean, with no unstable or failed images. That is the same test
`node tools/land.mjs cut` uses to choose what ships. The landing tool moves the tag forward after
every landing and at the start of every sync, and never moves it back.

So a branch is only ever synced to a golden that is known to be good, and a landing that broke
golden is not spread into every branch overnight.

### The nightly sync

`node tools/land.mjs sync` looks at every branch on GitHub that golden does not hold yet and that is
active: it has a commit in the last 7 days (`--active-days N` changes the window). Integration and
release branches, revert branches and Dependabot's are never touched. For each branch:

1. It lists the landings the branch could take, newest first: `golden-good` itself, then every
   landing (`land: <branch>` merge) on golden's first-parent line before it, down to the newest one
   the branch already holds. If there are none, the branch is up to date.
2. It finds the newest of them that merges into the branch without a conflict. The merge is done in
   memory with `git merge-tree`: no worktree, nothing checked out.
3. From there it finds the newest that also passes the branch's checks on the merged result: the
   build, lint and CI test shards of the packages the branch changes (what nx calls affected,
   measured from the landing). The checks run in a scratch worktree, `.worktrees/branch-sync`,
   through the same test stage the pre-push gate uses (`tools/prepush-tests.mjs`). While
   verification runs in CI (`node tools/verify.mjs backend ci`, `design/ci/ci-full-testing.md`) the
   checks are the light gate's: install, build and lint, with no test shard, because CI runs every
   shard on golden; with the `local` backend they include the shards as above.
4. Steps 2 and 3 try the newest landing first, which is usually the answer. When it fails, they step
   back by binary search over the landings, so a branch fifty landings behind costs about six tries,
   not fifty.
5. The chosen merge becomes a real merge commit (the branch's tip and the landing as its two
   parents; never a rebase), signed, and is pushed to the branch on GitHub. It is a fast-forward of
   the branch, so if the branch moved on GitHub in the meantime the push is refused and the branch
   is simply tried again the next night. The owner's worktree is never touched.
6. The result goes into the branch's progress note on its issue (`tools/branch-note.mjs`), as its
   `sync` line, which the open-work table of `node tools/land.mjs status` shows. It is one of:
    - `synced up to <landing>`;
    - `blocked at <landing> by a conflict in <files>`;
    - `blocked at <landing> by a failing check <shard: test>`;
    - both of the first and one of the others, when the branch took some landings and not the next.

    `<landing>` is always the exact landing, its commit and its `land: <branch>` subject.

7. When a branch is newly blocked, the sync also comments on its issue, so the session that owns the
   branch sees it. It does not repeat the comment while the branch stays blocked by the same landing for the same reason.

The sync never resolves a conflict and never changes a branch's own code. A blocked branch is for its
owner to fix, by merging golden up to the named landing and resolving it in the branch's worktree.

### Busy branches

Some branches must not move for a while, for example while a design study runs against them for a
day. Their owner marks them busy:

```bash
node tools/branch-note.mjs busy --until 24h --reason "tier 4 study"     # or --until 2026-10-23T09:00
node tools/branch-note.mjs busy --until clear
```

A busy branch gets only the in-memory conflict check: the sync still reports whether golden would
merge and which landing would block it, but runs no checks and pushes nothing. The marker is a `busy`
line in the branch's note and ends by itself at the time given.

### Picking the merge up in the owner's worktree

The branch on GitHub now has a commit the owner's local branch lacks. The post-commit hook
(`.husky/post-commit`, which runs `tools/branch-push.sh`) already pushes the branch after every
commit. Before that push it now fetches the branch and merges `origin/<branch>` into the local
branch, as a fast-forward or a merge commit, so the push goes through.

It does this only at commit time, when the owner has just finished a step and nothing else is
changing the worktree, and only when the worktree is clean with no merge in progress. Otherwise, and
when the merge would conflict, it leaves the worktree exactly as it was and logs why in
`tmp/branch-push.log` of the main checkout; the owner merges by hand.

### Load

The sync runs at the lowest priority and a landing or a study always goes first:

- every check command runs under `nice -n 19`;
- its test runs take a machine-wide test slot (`tools/test-slots.mjs`) in the low-priority lane,
  `GRAPHTY_SLOT_PRIORITY=low`: a low run queues behind every ordinary run, even ones that arrive
  later, and only a slot it already holds is never taken from it;
- its browser runs take a browser slot (`tools/with-browser.sh`) in the low-priority lane,
  `BROWSER_SLOT_PRIORITY=low`: slot 4 only, the one every other command tries last, so it never
  holds more than one of the four;
- before each branch's checks it waits while a landing holds the landing lock.

Only one sync runs at a time (a lock in `tmp/golden/sync-lock` of the main checkout).

### Schedule

The pipeline round (`.claude/skills/pipeline-round/SKILL.md`, step 8) starts
`node tools/land.mjs sync --if-due` detached in every round. `--if-due` does nothing unless no sync
has started today (local time) and it is 01:00 or later, so the sync runs once a night while the
round is running, and on the first round of the morning otherwise. No other scheduler is needed.

### Stale branches

A branch with no commit in 7 days or more is stale. The sync does not touch it. `land.mjs status`
lists the stale branches under the open-work table, asking for each to be landed, closed or parked,
and once a week the sync comments the same request on each stale branch's issue. Nothing is ever
deleted.

## 3. Failure cases

| What happens                                                            | What the sync does                                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| No golden commit has a stable preview yet, so there is no `golden-good` | Syncs nothing and says so                                                                                            |
| Every landing the branch lacks conflicts with it                        | Pushes nothing; reports blocked at the oldest one                                                                    |
| The newest landing passes the merge but fails a check                   | Steps back to the newest landing that passes, pushes that, and names the failing check and the landing               |
| The branch moved on GitHub during the sync                              | The push is refused as a non-fast-forward; the note says so; tried again the next night                              |
| A branch shares no history with golden                                  | Not synced, noted as such                                                                                            |
| A landing holds the landing lock                                        | Waits for it before running checks                                                                                   |
| The scratch worktree has uncommitted changes                            | Reports the check as failed with that reason; never cleans it                                                        |
| GitHub cannot be read                                                   | Busy markers cannot be seen, so every branch is treated as busy that night: conflict checks only, no checks, no push |
| The owner's worktree is dirty or mid-merge at commit time               | The post-commit hook does not merge; its push then fails and is logged                                               |
| The owner's merge of the synced branch conflicts                        | The hook aborts the merge at once, leaving the worktree as it was, and logs it                                       |

The binary search assumes that once a landing breaks a branch, every later landing does too. When
that is not so (a later landing reverts the breaking one), the sync may settle on an older landing
than it could have; the next night starts again from `golden-good`.

## 4. How to use it

```bash
node tools/land.mjs sync --dry-run                     # what it would do for every active branch; changes nothing
node tools/land.mjs sync --dry-run --branch <b>        # the same for one branch
node tools/land.mjs sync --branch <b>                  # sync one branch now (any age)
node tools/land.mjs sync                               # the nightly run, by hand
node tools/land.mjs status                             # the open-work table with each branch's sync line, and the stale list
node tools/branch-note.mjs busy --until 24h --reason "<why>"   # keep the sync from moving your branch
```

The checks' logs are in `tmp/branch-sync/<branch>.log` of the main checkout, and the nightly runs'
output in `tmp/branch-sync/sync.log`.
