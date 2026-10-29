# CI time budgets, the agent identity, and the agent rules

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

This section of the channels pipeline design covers how long each part of CI may take and what
happens when it takes longer; the GitHub account agents work under; removing the admin bypass from
master's ruleset; the rules that keep a green check honest; and the new job of the pipeline round
(the recurring agent routine in `.claude/skills/pipeline-round/SKILL.md`).

Each choice answers something that went wrong in the record:

| What went wrong                                                                                                                                                                           | Answered here by                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| graphty's build went from 1m23s to 13m33s (the Sentry plugin re-mapping 24 chunks), the Build job from about 4 to 16-24 minutes on master, and nobody noticed for four days (issue #3415) | Budgets per job, step and Nx task, checked on every run, and a trend alarm that files an issue within hours (section 1) |
| `small-browser` once ran over 64 minutes; only 2 of ci.yml's jobs have a `timeout-minutes`, so every other job may run for GitHub's default of 6 hours                                    | Every job gets a hang guard derived from its budget, enforced by a lint check (section 1.4)                             |
| A time-limit gate on tests failed unrelated changes at random (durations vary about 2x between runs of one commit)                                                                        | Budgets warn and file issues; they never fail a pull request (section 1.3)                                              |
| Every push is made as the owner (500 of the last 500 commits), so CODEOWNERS review is impossible                                                                                         | A GitHub Team machine account for agents (section 2)                                                                    |
| Master's ruleset lets the admin role merge without required checks; the owner banned admin merges, but only the rule stops it                                                             | Remove the admin bypass; keep only the release deploy key (section 3)                                                   |
| Agents raised timeouts, added retries, narrowed selection and edited the gate to go green; six landing systems in five weeks, 21.7% of all commits pipeline work                          | A test-integrity check, CODEOWNERS on pipeline paths, proof of work and a fresh-context review (section 4)              |
| Agents waited on gates inside turns (about $800 of cache rebuilds in 27 hours)                                                                                                            | The pipeline round reacts to recorded events (section 5)                                                                |

---

## 1. CI time budgets

### 1.1 What is measured

Four levels, all from data CI already has:

| Level         | Source                                                                                                                          | Example key                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Run (overall) | The run's `created_at` to the last job's `completed_at`                                                                         | `run:ci.yml:pr`               |
| Job           | `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` (one call per run; returns every job with `started_at`, `completed_at`)  | `job:ci.yml:Build`            |
| Step          | The same call: each job lists its steps with start and end                                                                      | `step:ci.yml:Build:Build all` |
| Nx task       | `NX_PROFILE=tmp/nx-profile.json` on every `nx run-many` / `nx affected` call (Nx writes a Chrome trace with one entry per task) | `task:graphty:build`          |
| Queue         | The same call: a job's `created_at` to its `started_at`, so waiting for a runner is never read as slowness                      | `queue:ci.yml:Test (*)`       |
| Time to green | The store: a full run's `red` verdict to the next green full run on a later commit                                              | `ttg:full`                    |

Test file durations travel in the test-group records of the test results section, not here; per-test
slowness stays with `tools/vitest-time-budget.mjs`. Matrix jobs are keyed by matrix name
(`job:ci.yml:Test (graphty-1)`); a skipped job records nothing; only a run's latest attempt counts.

### 1.2 The budgets file

`ci-budgets.json` at the repository root. It is owned by the owner through CODEOWNERS (section
2.4), so raising a budget is a reviewed pull request, never a side effect of another change. The
example below shows the shape; the starting numbers are the main document's section 7, which wins.

```json
{
    "version": 1,
    "defaults": { "warnRatio": 1.0, "hangRatio": 2.0, "minHangMinutes": 10, "owner": "pipeline" },
    "budgets": {
        "run:ci.yml:pr": { "minutes": 20, "why": "light checks; the PR waits on this" },
        "run:ci.yml:full": { "minutes": 60, "why": "green full runs measured 31-48 min" },
        "run:gpu.yml": { "minutes": 60, "why": "T4 lane measured about 50 min" },
        "run:hosts.yml": { "minutes": 60 },
        "job:ci.yml:Build": { "minutes": 6, "why": "4.2 min median before #3415's regression" },
        "step:ci.yml:Build:Build all": { "minutes": 6 },
        "task:graphty:build": { "minutes": 2, "why": "1m23s before the Sentry regression, 60-63 s after the fix" },
        "job:ci.yml:Test (*)": { "minutes": 15, "why": "tools/ci-test-matrix.mjs plans every shard under 15" },
        "job:ci.yml:Stories (graphty)": { "minutes": 8, "why": "13.5 min unsharded in 40051811635; sharded under 8" },
        "bytes:lfs": { "gib": 150, "per": "month", "why": "Team allowance 250 GiB, a hard block" },
        "bytes:actions-cache": { "gb": 8, "why": "10 GB limit; LRU eviction above it" }
    }
}
```

Rules for the file:

- `(*)` matches every matrix entry of a job; a specific key wins.
- A new job's first budget is 1.5 times its median over its first 5 runs, rounded up to a minute;
  until then it shows as "no budget" (a warning), so a new job cannot hide.
- `owner` acts on an alarm: `pipeline` is the pipeline round, anything else a label on the issue.
- `why` is the measurement behind the number; a raise states a new one.

`tools/ci-budgets.mjs` (new, about 200 lines) is the only reader, with commands `lint`, `report`
and `trend`.

### 1.3 Every run: warn, never fail

The last job of every budgeted workflow is `timings` (`if: always()`, `needs:` every other job,
`permissions: actions: read`). It runs `node tools/ci-budgets.mjs report --run ${{ github.run_id }}`,
which:

1. reads the run's jobs and steps (one API call per 100 jobs) and the Nx profiles the jobs
   uploaded as 1-day artifacts `nx-profile-<job>`;
2. writes a table to `$GITHUB_STEP_SUMMARY`: key, measured, budget, master's median of the last 10
   runs of the same kind, and the change;
3. emits `::warning title=Over budget::<key> took 13m33s, budget 2m` for each key over budget;
4. on a pull request, compares each key with master's median for the same key and, for any key
   that is over 1.5 times that median and at least 60 seconds slower, writes or updates ONE comment
   on the pull request (marker `<!-- ci-budgets -->`) naming the key, both numbers and the files
   the pull request changed under that task's project. It never sets a failing exit code;
5. sends the run's rows to the store (section 1.5) with `curl --max-time 10`, with two run-level
   numbers beside them: the Git LFS bytes the run downloaded and the repository's Actions cache size
   (one `GET /actions/cache/usage` call), both trend-alarmed like durations. A failed send prints a
   warning and the job still passes.

**One build for every event.** The Sentry regression hid because the plugin switched on only where
`SENTRY_AUTH_TOKEN` was set, a push to master, so pull requests never paid for it. Rule: a build
step gets the same inputs on every event; only upload and deploy steps after it may differ. The fix
as committed (0436c01e02 on `perf/ci-build-sentry-after-build`) does not yet: its master-only step
in the Build job rewrites graphty's dist, and "Build all" still reads `secrets.VITE_SENTRY_*`. It is
changed before it lands (merging section 5.3). `ci-budgets.mjs lint`
fails when a step running `nx` build targets has a `secrets.` value in its `env` or an `if:` on
`github.event_name` or `github.ref`.

### 1.4 Hang guards

`timeout-minutes` on every job is `max(hangRatio x budget, minHangMinutes)`, so twice the budget.
`node tools/ci-budgets.mjs lint` runs in the light checks and fails when a job in a budgeted
workflow has no `timeout-minutes` or one that disagrees with the file. Changing a hang guard
therefore needs the budgets file to change, which needs the owner.

This is not an arbitrary timeout: a hung job emits no event, and the guard ends only a job already
twice over budget. It fails red, `report` labels it `hung`, and the pipeline round files it as a
defect, never re-runs it or raises the guard. Existing step guards for known hangs (gpu.yml line
219; work-protection-macos.yml) move into the file as `step:` keys.

### 1.5 Data shape in the store

Durations go into the Cloudflare Worker and D1 database of the test results section (which defines
the Worker, its token and fail-open rules), as one more table and two routes.

```sql
CREATE TABLE durations (
  run_id      INTEGER NOT NULL,
  attempt     INTEGER NOT NULL,
  workflow    TEXT    NOT NULL,   -- 'ci.yml'
  run_kind    TEXT    NOT NULL,   -- 'pr' | 'master' | 'full' | 'promotion' | 'dispatch'
  sha         TEXT    NOT NULL,
  pr          INTEGER,            -- null off a pull request
  key         TEXT    NOT NULL,   -- 'job:ci.yml:Build'
  level       TEXT    NOT NULL,   -- 'run' | 'job' | 'step' | 'task'
  seconds     REAL    NOT NULL,
  outcome     TEXT    NOT NULL,   -- 'success' | 'failure' | 'cancelled' | 'hung'
  runner      TEXT,               -- 'ubuntu-latest', 'machine.dev-t4', 'macos-26'
  recorded_at TEXT    NOT NULL,
  PRIMARY KEY (run_id, attempt, key)
);
CREATE INDEX durations_key_time ON durations (key, run_kind, recorded_at);
```

- `POST /durations`: one body per run (a full run is about 45 jobs, 500 steps, 60 Nx tasks: about
  600 rows; a pull request run about 150). `GET /durations/medians?keys=...&kind=master&n=10`.
- Volume: 4 full runs, about 15 master pushes and 30 pull request runs a day is about 16,000 rows,
  inside the Workers Paid plan the test records already need (results section 9).
- 120 days of rows, pruned by the Worker's daily cron. Cancelled rows are excluded from medians.

### 1.6 Trend alarms

The Worker checks after every master or full-run `POST /durations` (`ci-budgets.mjs trend` runs the
same code locally):

- For each key and run kind (master, full and pull request runs alike, each compared only within
  its kind): `recent` = median of the last 5 runs that ran that key, `earlier` = median of the 10 runs
  before them. Pull-request-only keys (the plan step, story selection, Stories jobs, queue time) are
  alarmed this way too, so a cold selector cache or an evicted LFS cache does not go unnoticed for days.
- Alarm when `recent > budget`, or when `recent > 1.3 x earlier` and `recent - earlier >= 60 s`.
- Suspects: master's first-parent merges between the last run under the line and the first over it;
  each merge is one pull request with its issue.
- ONE issue per key (`CI budget: <key> <earlier> -> <recent>`; labels `bug`, `ci-budget`,
  `priority:high`, `effort:medium`, the owner label) listing runs, numbers and suspects; later alarms
  comment on it. The Worker only computes the alarm in its answer to `POST /durations`; the `timings`
  job of a master or full run that receives it files or updates the issue with its own `GITHUB_TOKEN`
  (`issues: write`). A pull request's `timings` job only comments on its own pull request.
- It closes on an event: the first check with `recent` back under both lines.

Against the record: at about 15 master pushes a day the Build regression fills 3 of the last 5
runs within about 5 hours, and `report` warns on the first slow run; it went four days. An alarm
names a range, never a culprit by timing; a culprit is named only by running the task on a merge
and its parent (the full-run section's bisect, with the task in place of the tests).

### 1.7 Reused, changed, deleted

- Reused: `tools/vitest-time-budget.mjs`, unchanged; its `VITEST_DURATION_HISTORY` file is written
  from the store's one read at job start instead of the Actions cache. The first `why` values come
  from `tmp/failure-position/analyze-ci.mjs`.
- New: `ci-budgets.json`, `tools/ci-budgets.mjs` (+ `tools/ci-budgets.test.mjs`, node:test), the
  `timings` job in ci.yml, gpu.yml, hosts.yml, work-protection-macos.yml and release.yml.
- Deleted: nothing; the old failing time gate is already gone (the reporter's header says so).

### 1.8 Caches and Git LFS

The Actions cache is already over its limit (10.5 GB of 10 GB in 169 entries, 2026-10-24), so GitHub
evicts the least recently used entries, which is how the old nx cache failed (merging 5.1). Every key
family, its size and how often it is written:

| Family                         | Size         | Written by, how often                         | Kept                       |
| ------------------------------ | ------------ | --------------------------------------------- | -------------------------- |
| LFS baselines, one per project | 15 to 437 MB | master build when that project's tree changed | the newest key per project |
| Selector import graphs         | about 10 MB  | master build when the graph inputs changed    | the newest key             |
| Vitest duration history        | none         | moved to the store                            | none                       |
| pnpm store (setup-node)        | about 600 MB | master build when the lockfile changed        | the newest key per OS      |

The import-graph key is a hash of the inputs the graph is built from (package source trees, configs
and the lockfile), not of the commit, and one set is about 10 MB (graphty-element's is 1.2 to 2.4
MB; the "100 MB" figure was a local folder holding 368 accumulated versions). After saving, the
master job deletes the superseded keys of its family (`gh cache delete`), so the total stays near
1.5 GB and the LFS entries are not pushed out. The `timings` job records each job's cache hit or
miss and the bytes Git LFS downloaded.

The org's Git LFS allowance on Team is 250 GiB of bandwidth a month, and exceeding it blocks every
checkout that needs baselines (design/visual-testing/roadmap.md:72). A full run on a cache miss
pulls up to 880 MB; at about 6 full runs a day with misses that is 100 to 150 GB a month, so
`bytes:lfs` warns at 150 GiB. If the hit rate stays low, the baselines move to R2 beside the nx
cache, keyed by blob sha (same Cloudflare account, no egress cost).

---

## 2. The agent identity

### 2.1 The account

- A GitHub machine account, `graphty-agent` (the owner creates it; the name can be renamed later).
  graphty-org is on the Team plan with 2 of 2 seats filled, so this is a third seat.
- Two-factor authentication on; recovery codes stay with the owner.
- Role **Write** on graphty-monorepo (branches, pull requests, auto-merge, labels, dispatch; no
  rulesets, settings, secrets or environments). No access to the nightly and production site
  repositories, which only this repository's workflows write (section 3.2).

### 2.2 Keys on this machine

| Credential                                                                                                                                                                                                                                                                                                                      | Where                                                                | Used for                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| SSH authentication key `~/.ssh/graphty-agent_ed25519`                                                                                                                                                                                                                                                                           | Added to the agent account                                           | `git push` of branches                               |
| SSH signing key `~/.ssh/graphty-agent-signing_ed25519`                                                                                                                                                                                                                                                                          | Added to the agent account as a signing key                          | Every agent commit shows "Verified" as graphty-agent |
| Fine-grained personal access token, repository graphty-monorepo only: contents, pull requests, issues, actions read/write (a dispatch is harmless: everything that publishes or deploys is environment-gated); checks, metadata read; workflows read/write (so a branch may carry a workflow change that CODEOWNERS then gates) | `gh auth login --with-token` into `GH_CONFIG_DIR=~/.config/gh-agent` | `gh` calls by agents                                 |

How a session picks them up, with no secret in any committed file:

- `.claude/settings.json` (committed) sets `"env": { "GH_CONFIG_DIR": "/home/apowers/.config/gh-agent" }`
  so every `gh` call an agent makes is the agent account.
- _Superseded (settled 17): no worktree-local identity._ `.claude/settings.json` also sets
  `GIT_CONFIG_GLOBAL=/home/apowers/.config/git-agent/config`, which holds `user.name graphty-agent`,
  `user.email <id>+graphty-agent@users.noreply.github.com`, `gpg.format ssh`,
  `user.signingkey ~/.ssh/graphty-agent-signing_ed25519.pub`, `commit.gpgsign true`,
  `core.sshCommand "ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes"` and
  `url."git@github.com:".pushInsteadOf https://github.com/`, so pushes leave over the agent's SSH key
  although `origin` stays an HTTPS URL, and no credential helper is configured. The memory rule
  "commit scripts must sign" still holds: agent commits are signed, by the agent key.
- servherd's servers do not inherit `.claude/settings.json`: `visual-review` and `pr-status-broker`
  are started with `GH_CONFIG_DIR` and `GIT_CONFIG_GLOBAL` in their `servherd_start` env, so the
  review server's accept commit and push are the agent's. Rollout step 3 checks the author of one.
- `tools/commit-changes.sh` and the hooks need no change; they sign with whatever key git config
  names.
- `MASTER_GUARD_TOKEN`, the optional token master-guard.yml uses so its revert pull requests start
  CI (a pull request opened with the workflow's own token starts no workflows), becomes a second
  fine-grained token of the agent account with contents and pull requests write only. Its revert
  pull requests are then authored by the agent account, carry a Proof generated from the red run's
  URL, and pass PR Integrity as mechanical reverts (section 4.5).

**Residual risk.** Agents run as the owner's Unix user, so they can read his `gh` token
(`~/.config/gh/hosts.yml`), use his GPG key, and ask git for his credentials: `~/.gitconfig` sets
`credential.helper cache --timeout=2592000` and `credential.https://github.com.helper !/usr/bin/gh auth
git-credential`, so after `gh auth logout` the cache can still hand out his token for up to 30 days.
The split is real only once the owner runs `gh auth logout` and `git credential-cache exit`, removes
both helpers from `~/.gitconfig` (or moves them to a config only his shell loads), puts his GPG key
behind an uncached passphrase, and does owner-only actions in the browser with his passkey. The check
that nothing is left: `printf 'url=https://github.com\n\n' | GIT_TERMINAL_PROMPT=0 git credential
fill` prints no password. Until then it stops accidents, not a determined agent.

### 2.3 What gh and git do as the agent

- Branches, commits, pull requests, issue comments, labels, `gh workflow run` for the out-of-schedule
  full run: all as graphty-agent.
- Agents never approve (GitHub refuses an author's approval; agent reviews are `COMMENT` only). The
  agent enables auto-merge (`gh pr merge --auto --merge`); checks and, on owned paths, the owner's
  approval decide when it merges.

### 2.4 CODEOWNERS

`.github/CODEOWNERS` (new) has one line per path, each `<path> @apowers313`. The list is the main
document's section 6.2: only paths that can loosen a check or take authority (the workflows,
CODEOWNERS itself, `.claude/`, the root CLAUDE.md, the budgets and hold files, nx.json, the shared
vitest config and JUnit reporter setup, each `.storybook/vitest.setup.*`, visual-review's `trusted/`
and `capture/`, its config, the nightly and production site configurations, and the pipeline's own
tools in `tools/`).

Deliberately not owned, because the integrity check (section 4.1) covers what in them can weaken a
check: test files, package vitest and Storybook configs, package CLAUDE.md files, the rest of
`tools/`, and every `package.json` (a change to any `scripts` entry needs an owner approval through
the integrity check, so a dependency bump stays unowned while redefining `lint:knip` as a no-op does
not). Also not owned: `visual-baselines/` and `visual-review-approvals/`. They are guarded by a check
instead (section 4.6): PR Integrity fails a pull request that changes a baseline without a signed
approval of the resulting tree, and the verdict runs the gate on every promotion.
`release-approvals.json` is owned (main section 3).

The first draft owned all of `tools/`, `.github/`, `.husky/` and every CLAUDE.md: 43 of the 117
golden landings of 2026-10-18 to 10-24 would have waited for the owner. The narrow list holds 27,
about 4 a day at today's rate and about 9 at 40 merges a day. The integrity check adds more: a line
heuristic over the 96 `land:` merges of the same week found 33 that removed a test or assertion line
or changed a script (tmp/perf-review/integrity.sh), an overcount because rewrites count. The real
check is replayed over those landings before step 3 and its number goes in main section 6.2; the
daily review list is planned for the measured total. A code-owned fix for an open red, release-held
or red-master issue, and each rollout step's pull request, skip the list and get their own
`ACTION NEEDED` line the moment they are green.

---

## 3. Removing master's admin bypass

### 3.1 Today

Ruleset "Protect master" (id 23973898), read on 2026-10-24:

- bypass actors: `DeployKey` (mode `always`) and `RepositoryRole` id 5, the admin role (mode
  `pull_request`, which is the merge-without-checks button the owner banned);
- pull request required, merge commits only, 0 approvals, `require_code_owner_review: false`;
- required checks `All Checks Pass` and `Lint PR Title`.

The one deploy key is "release deploy key 2026-10-25" (id 167635448), used by release.yml,
promote.yml and nightly-abandon.yml as environment `release`'s `RELEASE_DEPLOY_KEY`. It replaced "release workflow push
(version commit and tags)" (id 164375816), whose repository-level secret no job reads.

### 3.2 Target

- bypass actors: `DeployKey` only. The release's version commit and tags are the one push to master
  without a pull request, and it stays. The `DeployKey` actor exempts every deploy key with write
  access on the repository, not one key, so a write key added later would bypass master and the tag
  ruleset silently. The scheduler Worker (which already holds the App key and files an issue when it
  cannot dispatch) checks once a day, with the App's Administration: read, that
  `repos/graphty-org/graphty-monorepo/keys` holds exactly one write key, id 167635448, and that the
  ruleset's bypass list is unchanged, and files a `priority:critical` issue otherwise.
- pull request rule: `require_code_owner_review: true`, `required_approving_review_count: 0` (a pull
  request that touches no owned path needs no review and auto-merges on green),
  `dismiss_stale_reviews_on_push: true`, `require_last_push_approval: false`. GitHub documents
  last-push approval only as part of required approvals; with 0 its effect is unverified, and if it
  forced one approval everywhere no agent pull request would auto-merge. Dismissing stale reviews
  already stops an approval surviving an agent's later push. The owned and unowned cases are tested on
  a scratch ruleset with exactly these settings before the real one changes.
- required checks: `All Checks Pass`, `Lint PR Title`, `Link PR Issue`, `PR Integrity`.
- **Tags**: a tag ruleset on `*@*` (nx's `{projectName}@{version}`, which decide the next versions and
  changelogs) and `site-*`: creation only by the release deploy key, update and delete for nobody.
  The release jobs push tags with the deploy key and create GitHub releases on the existing tags.
- **The owner's own pull requests**: GitHub does not count an author's approval and the owner is the
  only code owner, so a pipeline edit he wants is made by an agent session and approved by him.
- Repository Actions settings: default workflow permissions read-only; "Allow GitHub Actions to
  create and approve pull requests" off.
- **Secrets that change the outside world live in master-only environments.** A same-repository
  pull request runs its branch's own workflow files with repository secrets, so a branch could use
  any repository-level secret before CODEOWNERS sees it. So:
    - environment `release` (deployment branches: `master` only): `RELEASE_DEPLOY_KEY`, the Pushover
      keys, the npm publish job. The owner configures each npm trusted publisher with environment
      `release` during the trusted-publishing transition, so only a job in that environment can mint
      an npm token.
    - environment `nightly` (master only, no reviewer): the token that pushes built files to the
      nightly site repository.
    - environment `production` (master only, required reviewer: the owner, "prevent self-review"
      off): the production site key and the `latest` dist-tag token. Approving this deployment IS the
      owner's promotion trigger, enforced by GitHub. "Prevent self-review" would refuse his approval
      of a run he dispatched himself, and the agent is no reviewer, so it adds nothing.
    - environment `full-run` (master only): `GOOGLE_API_KEY` for LLM regression. ci.yml also runs
      on `pull_request`, where a job naming this environment would fail its branch policy, so jobs
      shared by both events declare it conditionally:
      `environment: ${{ github.event_name == 'pull_request' && '' || 'full-run' }}`.
    - environment `master-build` (master only): `SENTRY_AUTH_TOKEN`, declared by the master-push
      Sentry upload job, which is not part of the full run.
    - environment `dependabot-automerge` (master only): `AGENT_AUTOMERGE_TOKEN`, a fine-grained
      agent token with Contents: write and Pull requests: write on graphty-monorepo only (enabling
      auto-merge and the merge itself need Contents: write; merging section 4.5).
    - The deploy key never leaves `release`: the `site-<sha>` tag is pushed by release.yml's `land`
      job, and `channel/production` by promote.yml's `channel-ref` job in `release`. Main section
      6.3 lists each job's environment and secrets.

### 3.3 Order of the change

This is rollout step 3 of the main document: after the flush has shipped, before any per-branch pull
request opens.

1. The agent account and its credentials exist (section 2.2); the owner's credentials are off the
   machine.
2. Environments and CODEOWNERS land in a pull request the owner approves as code owner, which also
   proves the approval path.
3. One agent pull request outside owned paths auto-merges on green with no human.
4. Every way master moves is a pull request or the deploy key: the golden pull request (gone after
   the flush), the `visual-seed.yml` seed pull request, master-guard's reverts (agent token), the
   release land job (deploy key). Nothing else.
5. The owner removes the admin role from the bypass list;
   `gh api repos/graphty-org/graphty-monorepo/rulesets/23973898 --jq .bypass_actors` must then list
   only the deploy key. Rollback is one setting, owner only.

If a renamed required check blocks every merge, the fix is a pull request restoring the name, or the
owner edits the ruleset's check list. An agent never asks for the bypass back.

---

## 4. Agent rules

Anthropic's harness guidance ("it is unacceptable to remove or edit tests"), the EvilGenie
benchmark (Claude Code hardcoding test cases in 2.1% of runs) and this repository's record agree:
rules nothing checks get broken under pressure to go green. Each rule here has a check, with what
it does not catch.

### 4.1 Never weaken a test: the test-integrity check

`tools/check-test-integrity.mjs` (new, about 250 lines, with node:test tests) runs in the light
checks on every pull request, over `git diff origin/master...HEAD`. It fails when, in any file
matching `*.test.*`, `*.spec.*`, `*.stories.*` or a vitest config:

- a test file is deleted, or renamed with its tests removed;
- the count of test declarations (`it(`, `test(`, `it.each(`, `test.each(` and story exports) drops,
  counted per file net of the whole pull request and following renames (`git diff -M`), so a test
  moved to another file or rewritten in place does not count as gone;
- `.skip`, `.todo`, `.fails`, `.skipIf`, `.runIf`, `describe.skip` or `.only` is added;
- the count of assertions (`expect(`, `assert`, `assert.`) in a file drops;
- a timeout number grows (`timeout:`, `testTimeout`, `hookTimeout`, a `{ timeout: N }` argument to
  `waitFor` or `expect.poll`), or `retry:`/`retries` is added or raised;
- a coverage threshold drops;
- a vitest config's `include`, `exclude`, `testTimeout`, `hookTimeout` or `retry` loosens;
- any `package.json` `scripts` entry changes (CI's commands are package scripts).

It passes anyway when the pull request has an approving review from a code owner on its head
commit. The check runs on `pull_request` (opened, synchronize, edited, reopened) and
`pull_request_review` (submitted, dismissed), never on comment events (an `issue_comment` run
attaches to master's head and cannot satisfy a pull request's required check), so the owner's
approval clears it without another push. Before it is required (rollout step 3) it is replayed over
the 96 landings of 2026-10-18 to 10-24 and every false positive is fixed in the check. Legitimate deletions (a story removed with its feature, issue #3414 deleting a fake
story) therefore cost one owner review, and say why in the pull request.

Reused beside it: the `local/no-test-timing` lint rule (`tools/eslint-rules/no-test-timing.mjs`).
The check itself and its workflow are under owned paths, so an agent cannot weaken them unseen. It
misses an assertion rewritten to expect a wrong value; the fresh-context review is for that.

### 4.2 Proof of work

`.github/pull_request_template.md` (new) has a `## Proof` section. PR Integrity requires, for pull
requests authored by graphty-agent (except the exemptions of section 4.5), a non-empty `## Proof` section holding at least one of:

- the command run and the last lines of its output (`pnpm run test:changed`, a shard through
  `./tools/run-tests.sh`);
- for a bug fix, the name of the test that failed before the fix, and the commit where it failed
  (the test commit comes before the fix commit, so anyone can check it out);
- for anything a reader sees, a screenshot path or an affected-story capture from the pull
  request's own screenshot job.

The check sees that proof was written; the fresh-context reviewer checks that it is true.

### 4.3 Fresh-context review

Before an agent enables auto-merge, a review session that has not seen the author's conversation
(`tools/pr-review.sh`: headless `claude -p`, since a background subagent cannot start subagents)
reads only the issue, `git diff origin/master...HEAD` and the Proof section, using the existing
`/code-review` skill at `high`. It posts its findings as one `COMMENT` review from the agent account
with the marker `<!-- fresh-review <patch id> -->`, where the patch id is `git patch-id --stable` of
`git diff origin/master...HEAD` with merge commits excluded: the branch's own change. PR Integrity
recomputes it for the head. A merge of master into the branch (by `pr-open.sh` or the round) leaves
it unchanged, so it needs no new review; a fix push or a conflict resolution changes it and needs one.
The author fixes or answers each finding before `pr-open.sh` arms auto-merge. It catches forgetting,
not malice, which CODEOWNERS and section 4.1 cover. Rollout step 3 tests both cases: a master merge
keeps the check green, a fix push turns it red until a new review.

### 4.4 Lines added to CLAUDE.md

Five rules, one line each: never delete, skip or loosen a test, assertion, timeout, retry count or
coverage threshold to pass a check; every pull request has a `## Proof`; a fresh subagent reviews
the diff before auto-merge; pipeline and CI-config changes go in their own pull request; a budget is
raised only by a pull request to `ci-budgets.json` with a new measurement.

### 4.5 Breaking changes, and pull requests no agent session writes

**Breaking changes.** PR Integrity fails a pull request whose title or any commit has `!` or a
`BREAKING CHANGE:` footer, unless a code owner approved the head commit. Every package is published,
so the rule needs no scope list. Nothing lowers nx's major bump once such a commit is on master (not
even a revert), and the grouped major stays held, so the guard must come before the merge.

**Exemptions**, each decided by a mechanical check, never by the author's say-so:

| Pull request                                                                                                   | Proof | Fresh review | Test integrity | Why                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----- | ------------ | -------------- | -------------------------------------------------------------------------------- |
| A revert: its tree equals `git revert -m 1 <m>` of a first-parent merge `m` of master, recomputed by the check | no    | no           | no             | it restores a tree master already had; removing the culprit's tests is the point |
| An accept pull request: touches only `visual-baselines/` and `visual-review-approvals/`                        | no    | no           | no             | its signed approval is checked instead (section 4.6)                             |
| `dependabot[bot]`                                                                                              | no    | no           | yes            | no agent wrote it; a dependency bump never needs to drop a test                  |

master-guard's and the round's reverts still carry a Proof naming the red run; the accept pull
request is opened by the review server, which runs as the agent account. Each kind has a test in
rollout step 3's done criteria.

### 4.6 Baselines need the owner's signature

PR Integrity fails any pull request that adds, changes or deletes a PNG or a story settings file
under `visual-baselines/` (records under `visual-baselines/reviews/` aside) unless
`visual-review-approvals/` holds a passkey-signed statement of exactly the pull request's resulting
baselines tree, verified with master's own `visual-review/trusted/lib/approval.mjs` (`git archive
origin/master`, never the pull request's copy). A revert, recomputed as in 4.5, restores a tree
master already had and is excepted. The verdict job also runs the gate on every `green-clean`
candidate (channels section 7), so a baseline that reached master any other way still cannot reach
nightly unsigned.

---

## 5. The pipeline round's new job

The skill keeps its shape (one round, priority order, never waits in a turn, asks the owner once
per item) and loses about two thirds of its 45 KB. In order:

_Superseded order: main section 12 wins. The red master build comes first, because a red build also
blocks canary and every light check's cache; the red full run second._

1. **Red full run.** release.yml has already dispatched the bisect (channels section 6); the round
   starts one only when the store shows a red verdict with no bisect record, or cannot be reached. It runs the GPU bisect on the local NVIDIA card only when `bisect.yml`
   records `gpu: local`. When a culprit is named it opens the revert pull request as the agent unless
   the store records one open for that culprit (auto-merge on green), comments on the culprit's
   issue, and starts the fix forward on a branch.
   No culprit (bisect names none, or the failure is outside the code: a lost T4 spot runner, an
   advisory with no patched version) means one issue and one `ACTION NEEDED` line if only the owner
   can act.
2. **Red master build or a master-guard revert pull request.** As today's section 1.
3. **Flaky or load-sensitive tests** (`priority:critical`, from the store: passed and failed on the
   same commit and inputs). Find the mechanism; never a longer wait. Also the base checks: for each
   `[UNRELATED]` pull request failure, CI already dispatched `base-check.yml` once (#3925): act on its
   `Failing on master` issue, or on its comment that master passes; for each `[FLAKY-UNRELATED]` test,
   dispatch `base-check.yml` with `repeat: 5`, whose master records can quarantine it.
4. **CI budget alarms** (`ci-budget` issues). Read the suspect range, find the task's cause, revert
   or fix. A budget raise is its own pull request with its measurement, for the owner to review.
5. **Promotion waiting on the owner.** When a green full run has changed screenshots, one
   `ACTION NEEDED` line naming the review page, once.
6. **Held release or failed publish.** As today's section 2.
7. **Agent pull requests that are red, conflicted or have unanswered review findings.** Merge
   master into the branch (never rebase), fix, push. A pull request waiting on the owner's
   code-owner review is never merged with master unless it conflicts (the push would dismiss his
   approval); all such pull requests go into one daily review list with one `ACTION NEEDED` line,
   except a code-owned fix for an open red, release-held or red-master issue, or a rollout step's pull
   request, which gets its own `ACTION NEEDED` line the moment it is green.
   Also: 14 days before `NPM_DIST_TAG_TOKEN_EXPIRES`, one `ACTION NEEDED` line to renew the token.
8. **Finished worktrees.** `tools/worktree-cleanup.mjs`, as today.

Bounds: the round never mixes a test, budget, quarantine or workflow change with a product fix,
never re-runs a failure hoping for green, never asks for the bypass, never touches the screenshot
gate's trusted files.

Deleted from the skill: "Keep golden moving", "Land what subagents finished" (subagents open their
own pull requests), "Nightly branch sync", and landing stranded branches through golden.

---

## 6. Failure modes

| Failure                                     | Handling                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| The store is down or slow during `report`   | `curl --max-time 10`, a warning, the job passes; that run has no rows and no alarm. Unknown never fails a run                                         |
| The Actions jobs API is rate limited        | One call per run (about 70 an hour at peak against 5,000); on a 403 the summary says "durations unavailable" and the job passes                       |
| A runner image changes                      | `runner` is recorded; an alarm whose range holds no code change says so, and the fix is a budget pull request with the new measurement                |
| A job is renamed                            | Its old key stops getting rows and its new key has no budget, which `report` warns about; `lint` fails when the file names a job that no workflow has |
| An alarm flaps around the line              | One issue per key, comments instead of new issues; closes only when `recent` is under both lines                                                      |
| The agent token leaks                       | It can only push branches and open pull requests; master, owned paths, publishing and deploying are all gated. The owner revokes it                   |
| A branch's workflow reads a secret          | Anything that publishes, deploys or costs money is in a master-only environment                                                                       |
| The integrity check misfires on moved tests | Declarations are counted across the pull request; a real false positive costs one owner review                                                        |

---

Every choice in this section is a two-way door and is decided here; none needs the owner.
