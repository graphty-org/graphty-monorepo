# Merging and fast pull-request checks

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

Part of the channels pipeline design. How a change gets from a branch to master: the pull request,
the light check, CI's build and test selection, the build cache, the local habit that replaces the
pre-push gate, when a merge queue comes back, and the GitHub API cost.

Words used below: **master** is the default branch, what canary.graphty.app deploys; there is no
golden branch. **The light check** is the one CI run a pull request gets (minutes); the full suite runs
every 6 hours on master's tip. **The machine account** is the GitHub user agents act as, a member of
the graphty-org organization (already on the GitHub Team plan) created by the owner. **Affected** is
what nx says a change can reach: the changed packages and everything that depends on them.

## 1. What went wrong, and what this section answers

- Six landing systems in five weeks; the pipeline's own checks caused most gate failures (32 of 35 landing-check failures on 2026-10-24 were "Release dry run" and "CI workflow tests", not product code) -> One path: a pull request, one required check, GitHub's own auto-merge. Tool self-tests run only when tools change (section 4.3).
- Agents waited on gates (103 background-push wakes in one day, 2026-10-18) -> An agent opens the pull request with auto-merge on and stops. Nothing waits (section 2).
- Full testing as the merge gate on one desktop (golden-local's gate: median 34 minutes) did not scale -> The merge gate runs in CI on GitHub's runners; the local check is a habit of minutes (section 6).
- Settings leaked from the gate into its own tests (`GRAPHTY_*`, `PREPUSH_*` variables) -> CI runs every command from `tools/ci-test-matrix.mjs` in a clean environment; the local check runs the same commands with those variables removed (section 6).
- Local and CI screenshots differed -> Screenshots that judge a pull request are taken in CI only.
- Per-change pull requests broke whenever master moved (screenshot approvals were per pull request) -> A pull request is never blocked by a changed picture; approval gates nightly, once per candidate (screenshots section). Required checks are not "strict" (section 7).
- The GitHub API budget ran out twice in one hour (2026-10-04) -> Agents use their own account's budget; status comes from one broker query a minute; nobody polls (section 9).
- A CI Build regression (Sentry plugin) went unnoticed for four days -> It is fixed (section 5.3) and the Build job gets a budget that warns the pull request that crosses it.
- The admin role can merge past required checks -> The bypass is removed; agents get write, not admin (section 3).

## 2. The pull request flow for agents

### 2.1 Branch, issue and title

Unchanged from today, because they work:

- A branch is `<type>/<issue>-<topic>` (for example `fix/3415-sentry-build`), started by
  `./tools/worktree-new.sh <branch> [--issue N | --new-issue "<title>"]`, which already refuses a
  branch without an issue number of three or more digits and labels the issue `in-progress`.
  Change: it starts the branch from `origin/master`, not `origin/golden-verified`.
- The pull request title is a conventional commit header of at most 100 characters with an allowed
  scope (`.github/workflows/pr-title.yml`, check "Lint PR Title", already required by the ruleset).
- The description names its issue (`Fixes #N`, `Refs #N`, ...) or says `No issue`
  (`.github/workflows/pr-issue-link.yml`, check "Link PR Issue").
- Merge method: merge commit only (already the only method master's ruleset allows), so each
  conventional commit stays visible to `nx release`. Squash merging is switched off in the repository
  settings to match (it is allowed today, though the ruleset refuses it).

### 2.2 Opening the pull request: `tools/pr-open.sh`

One new script, about 40 lines, replaces `node tools/land.mjs land <branch>`:

```
tools/pr-open.sh [--no-check "<reason>"]
```

It runs in the worktree, in the foreground, and returns in minutes:

1. Refuses if the worktree has uncommitted changes, or if the branch has no issue number.
2. Runs the quick local check (section 6) unless `--no-check "<reason>"` is given; the reason goes
   into the pull request description, so a skipped check is visible.
3. `git merge origin/master` when the branch is behind (never rebase; `tools/no-copy.sh` still refuses
   rebases and cherry-picks), then `git push origin HEAD`.
4. `gh pr create --base master --head <branch> --title "<first commit header>" --body "<summary>
Fixes #N"` as the machine account. A pull request that already exists is reused.
5. `gh pr merge <number> --auto --merge`: GitHub merges it the moment every required check passes.
6. Prints the pull request URL and exits. It never waits for CI.

Rules that follow from it:

- **A pull request is opened only when the work is finished.** Commits before that are pushed to the
  branch (`.husky/post-commit` runs `tools/branch-push.sh`, as today) but trigger no CI, because
  ci.yml runs on `pull_request` and on master pushes only. With auto-merge on, opening a pull request
  early would let a half-done commit merge the moment it passed.
- **Pull requests are opened ready, never as drafts.** ci.yml's draft machinery (the `Draft state`
  job, the "draft: CI not run" failures, the race of #2991 and #3068) is deleted.
- **A subagent opens its own pull request and stops.** Today a subagent commits and its parent lands,
  because landing waited 14 minutes or more. `pr-open.sh` does not wait, so the hand-off is gone.
- **Fixes to an open pull request** are ordinary commits on its branch; each push re-runs the light
  check, and the newer run cancels the older (ci.yml's `concurrency` group, kept).
- **A red pull request** stays open with auto-merge armed. The session that owns the branch (named in
  the issue's `in-progress` comment) fixes it; if that session is gone, the pipeline round picks it up
  from the broker's file (section 9) and starts a fix subagent. A pull request red for 24 hours with
  no new commit is listed by the pipeline round as stranded.

GitHub's auto-merge merges once "All Checks Pass", "Lint PR Title" and, where CODEOWNERS applies,
the owner's review are in. No agent presses merge or can merge past a check (section 3).

## 3. Identity, review and the admin bypass

Today master's ruleset ("Protect master", id 23973898) has two bypass actors: deploy keys (always;
the release push) and the repository admin role (`bypass_mode: pull_request`, which is the
admin-merge button the owner banned). Every agent acts through the owner's admin account, so GitHub
cannot tell the two apart and no review means anything.

The change:

1. **The machine account** (owner creates it; suggested login `graphty-agent`) is an organization
   member with the **write** role on graphty-monorepo, never admin or maintain. Its fine-grained token
   (repository graphty-monorepo; contents, pull requests, issues, checks read, actions read/write for
   `gh workflow run` of the hotfix run and bisects) lives in the root `.env` as `AGENT_GITHUB_TOKEN`.
   The SSH signing key agents already use (`~/.ssh/git_signing_claude.pub`, set as
   `user.signingkey`) is registered on the machine account, so agent commits show as verified for
   that account instead of the owner. `tools/worktree-new.sh` writes `user.name`, `user.email` (the
   account's noreply address) and a credential helper that reads `AGENT_GITHUB_TOKEN` into each new
   worktree's local git config, and exports `GH_TOKEN` for the `gh` calls the tools make.
2. **CODEOWNERS** (new file `.github/CODEOWNERS`, owner `@apowers313`) covers the pipeline:
   `.github/**`, `tools/**`, `.husky/**`, `nx.json`, `vitest.*.mjs`, `vitest.shared.config.ts`,
   `vite.shared.config.ts`, `eslint.config.js`, the CI budgets file, `visual-review/trusted/**`,
   `visual-review/passkeys.json`, `visual-review-approvals/**`, `CLAUDE.md`, `**/CLAUDE.md`,
   `.claude/**` and `CODEOWNERS` itself.
3. **The ruleset** keeps "require a pull request" with 0 required approvals, turns on
   `require_code_owner_review`, keeps the required checks ("All Checks Pass", "Lint PR Title"), and
   drops the admin role from the bypass list. The deploy key stays (release pushes). With 0 approvals
   and code-owner review on, only pull requests that touch an owned path wait for the owner; the
   first pull request after the switch is a deliberate test of exactly that (one owned path, one
   unowned) before agents rely on it.

Failure modes:

- **Pipeline pull requests wait for the owner.** That is the point (21.7% of commits since
  2026-09-24 were pipeline work). The pipeline round lists them in one `ACTION NEEDED` line per batch;
  pipeline and product changes go in separate pull requests so neither holds up the other.
- **The token expires or is revoked.** `pr-open.sh` and the broker fail loudly with the HTTP status;
  the pipeline round files one `priority:critical` issue. Nothing falls back to the owner's account.
- **The owner's own token is still on this machine.** `gh auth status` shows `apowers313` logged in
  with `repo` and `workflow` scopes in `~/.config/gh/hosts.yml`, readable by every agent session on
  this Unix account. Rulesets cannot stop an admin token from editing the ruleset itself. This is an
  open question for the owner (section 11).

## 4. The light check

### 4.1 What runs

ci.yml keeps its name and its one required summary, "All Checks Pass", so the ruleset needs no new
check names. On a pull request it runs:

- **Plan (first step of `Build`)** (always): `nx show projects --affected --base=<merge base with origin/master>`; `node tools/test-select.mjs --base origin/master --head HEAD --json` for the test files of each shard; the story selector for affected stories; one read of test history from the Cloudflare store (fails open).
- **Build** (something is affected): `nx affected -t build` with the remote cache (section 5); uploads the dist folders, as today.
- **Checks** (always (each is seconds to a minute)): `prettier --check` on changed files; `nx affected -t lint typecheck`; the public API report when graphty-element is affected; `tools/check-links.sh --offline`; `check-committed-images.mjs`, `check-data-source-migration.mjs`, `check-legacy-use.mjs`; knip on affected packages.
- **Tool tests** (only when `.github/**`, `tools/**`, `nx.json` or a root config changed): `tools/ci-workflows.test.mjs`, `tools/*.test.mjs`, "Release dry run".
- **`Test (<shard>)`** (the selector chose files for it): each selected shard runs its selected files once, with the shard's own command from `tools/ci-test-matrix.mjs`, without coverage and without slicing, through `tools/test-quarantine.mjs` (now backed by the store).
- **`Stories (<project>)`** (a story was selected): build the affected Storybook (cached), run the selected stories as tests; a changed picture is reported, not a failure.
- **Docs** (`docs/`, a package `docs/`, or a package with a `docs:api:*` script changed): `vitepress build docs`.
- **All Checks Pass** (always): the summary; skipped jobs count as passed.

Moved to the 6-hour full run: coverage thresholds (they need whole shards),
the network half of the link check, `graphty-element-lifecycle`, `Cost Estimate Accuracy` when its
files did not change, the whole-shard `webgpu-graph-algorithms-node*` passes (their selected files
still run), and every story the selector did not pick.

### 4.2 Target time and budgets

Measured on the golden pull request's 53 real runs (tmp/failure-position/ci-out.txt): the run median
was 21.5 minutes, Build took 4.2, the Storybook build 3.6 (finished at 7.8), and the long poles were
whole shards: `webgpu-graph-algorithms-node` (finished at 20.9), `graph-io` (20.4), `compact-mantine`'s
capture (18.8) and the two grouped small shards (16.5). The light check removes the long poles by
running selected files instead of whole shards, and the build by caching.

Critical path for a change inside one package: checkout and `pnpm install` 1.5 min, Build 3 min
(most packages cache hits), selected tests 3 min, or Storybook build 3.6 plus selected stories 2 min.

Budgets (in the CI budgets file, owned by the time-limits section):

- Light check, change in one package: target p50 10 min, warn above 15 min.
- Light check, change in graphty-element (most dependents): target p50 14 min, warn above 20 min.
- Light check, global inputs changed (runs every shard's selected tests): target p50 22 min, warn above 30 min.
- Build job: target p50 3 min, warn above 6 min.
- `graphty:build` task: target p50 1.5 min (measured 60 to 63 s after the Sentry fix), warn above 3 min.

A budget crossed warns on the pull request that crossed it and feeds the trend alarm; it never fails
the check. Raising a budget is a reviewed change to the budgets file (CODEOWNERS).

### 4.3 What "affected" means, and two input fixes

The replay of 1,185 gate runs (design/ci/test-selection-replay.md) found 350 that ran everything.
The two biggest causes are configuration, not code:

- **`.github/workflows/**` is in nx.json's `sharedGlobals`** (129 of the 350). A workflow change
  cannot change what a test computes. It comes out of `sharedGlobals`. Instead, a change to
  `.github/workflows/ci.yml` or `tools/ci-test-matrix.mjs` runs the tool tests plus one smoke shard of
  each kind (a node shard: `graph-format`; a browser shard: `algorithms-browser`; one Storybook
  capture: `layout`), so a broken job command still fails the pull request that broke it.
- **`pnpm-lock.yaml` runs everything** (122 of the 350, a rule in `tools/test-select-rules.json`).
  nx already hashes each project's external dependencies; set
  `pluginsConfig["@nx/js"].projectsAffectedByDependencyUpdates: "auto"` in nx.json so a lockfile
  change affects only the projects whose resolved dependencies changed, and drop the rule. A bump of
  a tool every package uses (vitest, playwright) still affects every package, correctly.

Both changes also make the build cache hit (section 5), which is why it never hit before.

### 4.4 Reusing the selector

`tools/test-select.mjs` already does what the pull request needs: per shard "all", "none" or a file
list, from nx's graph plus Vite's import graph, with a fail-safe that runs a whole package for any
file it cannot explain. Changes:

- default `--base` becomes `origin/master` (today `origin/golden`), in `tools/test-changed.mjs` too;
- `tools/ci-test-matrix.mjs` gains a `files` field per matrix entry from the plan JSON, appended to the
  shard's command as `tools/run-tests.sh --command` already does;
- the file-level allow-list in `tools/test-select-rules.json` and the mutation check
  (`tools/test-select-mutate.mjs`) stay; a package not on the list runs its affected shards whole.

What a miss costs now: a test the selector skipped fails in the 6-hour run, the bisect names the merge,
the pipeline round reverts it, and the miss becomes a rule in `test-select-rules.json` in the same fix
(the process in design/ci/minimal-tests.md section 5). In the replay the selector missed 11 of 351
failing files, all of them failures not caused by the change.

## 5. Build caching

### 5.1 Why the last attempt failed

ci.yml lines 51 to 53: an `actions/cache` of `.nx/cache` never hit (release commits changed every
`package.json`; `sharedGlobals` held `.github/workflows/**`), and each run saved a 600 MB entry that
pushed the Git LFS baseline caches toward eviction from the 10 GB Actions cache.

### 5.2 The design: Nx's self-hosted remote cache on Cloudflare R2

- nx 22.7.12 (in use) supports a self-hosted remote cache through its published HTTP API: set
  `NX_SELF_HOSTED_REMOTE_CACHE_SERVER` and `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN`, and nx sends
  `GET` and `PUT /v1/cache/{hash}` for each task. Entries are per task, not one 600 MB blob, and live
  outside the Actions cache, so the LFS caches are untouched.
- A Cloudflare Worker, `tools/nx-cache-worker/` (about 80 lines, in the same Cloudflare account as
  the test-results Worker), stores each task's tarball in an R2 bucket `graphty-nx-cache`, with an
  R2 lifecycle rule deleting objects 14 days old. Expected size: the 13 packages' build outputs
  plus 6 Storybooks, a few GB at most; R2 storage costs $0.015 per GB-month and nothing for egress.
- **Writes only from master.** The write token is a secret of a GitHub environment `nx-cache-write`
  whose deployment branch policy allows only `master`; the master-push build and the 6-hour run use it.
  Pull request runs get only a read token (a repository secret). A pull request can change its own
  workflow file, so a write token visible to pull requests would let any branch plant a build
  artifact that master later trusts (CVE-2025-36852); GitHub does not hand an
  environment's secrets to a run on a branch its policy excludes.
- **Fail open.** The Build step probes the Worker with a 2-second timeout first; when it does not
  answer, the step unsets both variables and builds without the cache (slower, never wrong). The
  probe result goes into the job summary.
- The existing "Reuse" step (download the builds of an earlier run of the same branch, which needs
  `actions: read` and a REST listing of runs) is deleted; the cache covers it.

### 5.3 The Sentry Build fix

Commit 0436c01e02 on branch `perf/ci-build-sentry-after-build` (Fixes #3415): the `@sentry/vite-plugin`
injected debug ids and regenerated the source map of every one of graphty's 24 chunks during the
build, which took `graphty:build` from 1m23s to 13m33s and the master Build job to 16 to 24 minutes.
The fix removes the plugin and, on master pushes only, runs `sentry-cli` after "Build all"
(`sourcemaps inject`, 1 s; then the release upload, named `github.sha`). Measured: graphty's build 60 to
63 s. It lands through the current release path before the switch, because the
master-push build is what canary deploys from. The `graphty:build` budget (section 4.2) is set so that
the next regression of this kind warns within one run instead of four days.

## 6. What replaces the local gate: the quick check

`pnpm run check:quick` (new `tools/check-quick.sh`, about 40 lines), run by `pr-open.sh` and by hand
whenever an agent wants an answer before CI:

1. `prettier --check` on the files changed since the merge base with `origin/master`;
2. `nx affected -t lint typecheck --base=origin/master` (local nx cache);
3. `node tools/test-changed.mjs --base origin/master`: the same selection CI makes, run with the
   shard commands from `tools/ci-test-matrix.mjs`, without coverage;
4. `node tools/sonar-gate.mjs` (SonarQube on changed lines, about a minute; the server is reachable
   only on the owner's network, so this is the only place it runs; off that network it passes with a
   warning, as today).

It runs with every `GRAPHTY_*`, `PREPUSH_*` and `VK_*` variable removed (`env -u`), so no setting of
the old gate can change what a test sees. It runs no tool self-tests and no screenshots: those caused
the old gate's failures and its local-versus-CI disagreements. Expected time 2 to 6 minutes, under
`tools/low-priority.sh`. It is a habit, not a gate: CI decides, and a failure here only means "you
would have found out in CI".

`.husky/pre-push` shrinks to the parts that take seconds and protect the repository rather than judge
the code: the Git LFS upload (`tools/lfs-pre-push.sh`), the secret scan (`tools/scan-secrets.sh`) and
the committed-images limit (`tools/check-committed-images.mjs`).

## 7. No merge queue at first, and the trigger for Mergify

Required checks stay non-strict (`strict_required_status_checks_policy: false`): a pull request does
not have to be rebuilt on the newest master before merging. Making them strict would re-run every open
pull request each time master moves, at about 15 merges a day the same churn that broke per-pull-request
review before.

The cost is skew: two pull requests, each green against an older master, can break master together.
It is caught within hours: the master-push build (which builds every package) fails
at once, or the 6-hour run fails and its bisect names the merge.

**The trigger.** The bisect records, per culprit merge, whether that pull request's light check passed
and whether master gained, between its check and its merge, another merge touching an affected package.
Such a culprit is a **skew break**. The pipeline round counts them from the store. When there are
**2 skew breaks in any 7 days, or one that kept canary red for more than 6 hours**, the pipeline round opens
a pull request adding `.mergify.yml` (owner-reviewed, as a pipeline path), with the evidence. Mergify (its record here was healthy: 418
queued, 371 merged, median 23 minutes, none stuck) queues pull requests and runs **the light check
only** on each batch, never the full suite or the screenshot verdict; ci.yml regains a merge-queue
trigger for that. GitHub's built-in merge queue (`merge_group`) does the same with no third party and
is the alternative if Mergify's terms or limits have changed by then.

## 8. Master pushes

A merge to master runs ci.yml's build path as today (no tests): build every package with the cache
(write token), the Storybooks and docs, the Sentry step, then the canary deploy (canary section).
A red master build opens a revert through `master-guard.yml`, kept and simplified: it reverts by pull
request as the machine account, the revert gets the light check and auto-merges.

## 9. The GitHub API budget with many pull requests

Limits: each user, including the machine account, has 5,000 REST requests and 5,000 GraphQL points an
hour; each repository's `GITHUB_TOKEN` in Actions has 1,000 requests an hour; secondary limits cap
content creation (about 80 requests a minute, 500 an hour) and bursts.

Volume: about 15 merges a day today (93 landings from 2026-10-18 to 2026-10-24), plan for 40.

- `pr-open.sh`: create, auto-merge (one GraphQL mutation), an existing-pull-request lookup: about 120
  calls a day at 40 pull requests;
- `tools/pr-status-broker.mjs`: one GraphQL query a minute, about 3 points, paginated past 100 open
  pull requests: 180 points an hour;
- ci.yml per run (`GITHUB_TOKEN`): Link PR Issue, Lint PR Title, early verdicts, artifacts, about 10
  calls: about 800 a day at two runs per pull request;
- the pipeline round: reads `tmp/pr-status/status.json` (no call), plus a few calls per revert or issue.

So the machine account uses about 5% of its hourly REST budget and 4% of its GraphQL points, and the
owner's account none. The rules that keep it there:

nobody polls a pull request (status comes from the broker's file, written as the machine
account); auto-merge replaces every "wait until green" loop; bulk writes go a second apart; on a 403,
wait for the reset.

## 10. What is deleted, kept and added

Deleted (after golden is flushed through release #3318):

- `tools/land.mjs` and its live copy `.worktrees/land-live`; `tools/verify.mjs`; `tools/branch-sync.mjs`;
  `tools/push-queue.sh`, `tools/prepush.sh`, `tools/prepush-source-checks.sh`, `tools/prepush-tests.mjs`,
  `tools/prepush-inputs.mjs`'s pass records, `.worktrees/gate-live`; `tools/branch-note.mjs` (the pull
  request is the record of where work stands); `golden-verify.yml`;
- in ci.yml: the Mergify handling (`MERGE_QUEUE`, "Queue Checks Pass", lines 44 to 86 and 126), the
  `Draft state` job and draft special cases, the `golden-cut` concurrency exception, the `verify`
  input, the "Reuse" step; the `VITEST_BUDGET_BASE` expression simplified to the pull request's base.

Kept: `tools/worktree-new.sh` (base changed), `tools/branch-push.sh`, `tools/no-copy.sh`,
`tools/test-select.mjs` and its rules and mutation check, `tools/test-changed.mjs`,
`tools/ci-test-matrix.mjs`, `tools/run-tests.sh`, `tools/test-quarantine.mjs` (on the Cloudflare
store), `tools/test-slots.mjs` and `tools/with-browser.sh` (local concurrency), `tools/sonar-gate.mjs`,
`tools/pr-status-broker.mjs`, `master-guard.yml`, `pr-title.yml`, `pr-issue-link.yml`, the Mergify Test
Insights upload (live, cannot fail a job).

Added: `tools/pr-open.sh`, `tools/check-quick.sh`, `tools/nx-cache-worker/`, `.github/CODEOWNERS`, the
`nx-cache-write` environment.

Rollout order: the Sentry fix and section 4.3's input fixes first (through the current path), then
the machine account, CODEOWNERS and the bypass removal, then the cache, then the light check and
`pr-open.sh`; the deletions come last, after golden is flushed.

## 11. Decisions made here, and open questions for the owner

Decided (two-way doors, each an edit to undo): pull requests opened only when finished and never as
drafts; subagents open their own pull requests; non-strict required checks; the skew-break trigger of
2 in 7 days; R2 for the build cache with master-only writes; workflows out of `sharedGlobals`;
SonarQube only in the local quick check; the budget numbers in section 4.2; `branch-note.mjs` deleted.

Open, the owner's own:

1. **Your GitHub token on this machine.** `~/.config/gh/hosts.yml` holds `apowers313`'s token with
   `repo` and `workflow` scopes, readable by every agent on this Unix account. While it is there, an
   agent can still act as an admin (edit the ruleset, merge, dispatch a promotion), so "agents never
   act as the owner" holds by convention, not by enforcement. The enforcing option: log `gh` on this
   machine in as the machine account and do your admin work in the browser with your passkey (or from
   a separate `GH_CONFIG_DIR` only your shell uses, which still leaves the file readable). This is
   your credential and your convenience, so it is yours to choose.
2. **The machine account's name.** It appears in every commit, pull request and the changelog for as
   long as the repository exists; `graphty-agent` is suggested.
