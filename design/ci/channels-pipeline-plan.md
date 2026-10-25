# The channels pipeline: implementation plan

Status: plan, 2026-10-24. Issue #3418. Implements `design/ci/channels-pipeline.md` (the design;
"section N" below means its section) and its appendices in `design/ci/channels-pipeline/`. The
rollout steps are the design's section 12; this plan breaks each into work items and groups the
agent items into branches.

## 1. Changes to the design

Three session decisions, each reversible by an edit. Where the design says otherwise this plan wins,
and the item that implements each corrects the design's text.

1. **LLM regression runs once per UTC day**, on the first full run of the day whose ci.yml lane is
   green, and on an owner-dispatched hotfix run; not once per candidate. About $0.94 a run, so about
   $29 a month plus capped bisects, under the owner's ceiling of about $60 (2026-10-12). The
   `spend:llm` alarm at $60 a calendar month stays. Item `llm-once-a-day`.
2. **The owner keeps his own credentials.** Owner action 2 no longer asks him to log out of `gh`,
   delete SSH keys, `npm logout` or remove credential helpers. Agents run with `GH_CONFIG_DIR`,
   `GIT_CONFIG_GLOBAL` (which replaces `~/.gitconfig`, so its credential helpers are never read), an
   SSH command naming only the agent key with no ssh-agent, an empty npm user config and an empty
   `GNUPGHOME`; a PreToolUse hook refuses tool calls that read or use his credential paths. A
   passphrase on his keys is optional hardening. The hook stops accidents and casual reads, not a
   determined agent; the design's residual-risk note stays true. Items `agent-env-and-guard`,
   `owner-agent-account`, `owner-optional-hardening`.
3. **`@experimental` means "may change or disappear in a minor release"** until the owner says
   otherwise on #3418. `check-features.mjs` fails on an `@experimental` export that names no
   `FEATURES` row, not on every one; the API docs and README state the promise. Item
   `features-module`.

## 2. How to read an item

Each item: **who** (agent, owner, or the pipeline round), **size** (S under about 150 changed lines
or an hour of owner time, M under about 400, L more and split), what it changes, **needs** (items
first), **done** (a check anyone can run), **undo**, **parallel** (can run beside its siblings) and
its branch (section 5). **CP** marks the critical path.

- Before step 3 merges, nothing reaches master but the flush. Agent items of the parallel steps 2
  and 4 are built on branches and merge as pull requests once step 3 is in; today's ci.yml runs the
  affected suite on a ready pull request.
- Shared code-owned files (ci.yml, release.yml) change in one pull request per step, because a later
  push dismisses the owner's approval. New, disjoint files get pull requests of their own, so most
  branches stay under about 400 changed lines.
- Branches start with `./tools/worktree-new.sh <branch> --issue 3418`; commits are signed
  conventional commits with `Refs #3418`. Step 0's branches land through golden; from step 3 on,
  every branch is a pull request into master. Pipeline changes never share a pull request with
  product code.

## 3. Critical path

`sentry-build-fix`, `release-cause-fixes` -> `freeze-graphty-app` -> `flush-ship` ->
`release-shadow-and-legacy`, `pr-integrity-workflow`, `agent-env-and-guard` ->
`owner-ruleset-switch` -> `step-3-acceptance` -> `light-check-plan` (needs `light-check-replay`) ->
`light-check-workflow`, `store-reads-live`, `pr-open-and-review` -> `shipping-instructions-switch` ->
`step-5-acceptance` -> `bisect-workflow`, `full-run-release` -> `step-6-acceptance` ->
`nightly-publish-environment` -> `owner-npm-bind` -> `nightly-site-and-approval` ->
`step-7-acceptance` -> `promote-workflow` -> `owner-domain-swap` -> `step-8-acceptance` -> 7 days and
#3318 closed -> `deletion`.

Off it: step 2 (it only has to have run 3 days before `store-reads-live`), step 4's per-package
selection (a package not on `fileLevel` runs whole shards under its own budget key), step 9 and the
features track.

## 4. Work items

### Step 0: flush golden

**sentry-build-fix** -- agent, M, CP, parallel. Corrects branch `perf/ci-build-sentry-after-build`
(#3415) per merging section 5.3: a `sentry` job after Build on every event (inject debug ids,
re-upload graphty's dist), the upload alone master-only in environment `master-build`,
`VITE_SENTRY_*` as repository variables. Done: in its CI run `graphty:build` under 2 min and Build
under 6; no secret in the Build step's env; graphty's dist hashes equal on a pull request run and a
master run of one tree. Undo: revert the land commit.

**release-cause-fixes** -- agent, M, CP, parallel. The two causes holding #3318: nx could not build
its project graph in the T4 lane, and the audit flags zod and body-parser (#3393). Done: `gpu.yml`
dispatched on the branch passes its graph step; `pnpm audit --prod` reports neither. With no patched
version, steps 1 to 9 go on and only `deletion` waits for #3318. Undo: revert.

**flush-stop-landing** -- agent, S, parallel. A "Flush in progress: no `land`, no `sync`; `revert`
and `cut-fix` only" paragraph atop the pipeline-round skill; `land.mjs land` refuses while the main
checkout's `tmp/golden/flush` exists (about three lines, live via `tools/live.sh land`). Done: with
the file present, `node tools/land.mjs land <branch> --dry-run` exits 1 naming the flush. Undo:
delete the file.

**freeze-graphty-app** -- agent, S, CP, the last golden landing. `deploy-pages.yml` assembles and
uploads `site-<sha>` (14 days) but deploys graphty.app only for release.yml's later `mode: legacy`.
Needs: `sentry-build-fix`, `release-cause-fixes`. Done: after the next green master build
graphty.app's build stamp is unchanged and the run holds artifact `site-<sha>`. Undo: revert.

**flush-ship** -- pipeline round, S of work over 12 to 48 h, CP. `node tools/verify.mjs start` until
`golden-verified` equals `origin/golden`; `node tools/land.mjs cut origin/golden-verified`; the
owner's Finish; `node tools/land.mjs ship`; #3318 restarts on the master push. Needs:
`freeze-graphty-app`, `flush-stop-landing`. Done: `git merge-base --is-ancestor origin/golden
origin/master`; #3318 closed by a release; each package's `dist-tags.latest` equals its newest tag
(the last two waived for steps 1 to 9 if the audit has no patch).

**owner-finish-flush** -- owner, S, CP (section 13 item 1). When the round says the cut's preview is
ready: decide its changed screenshots, Finish with Face ID. Done: the cut's gate is green.

### Step 1: owner setup (parallel with steps 0, 2 and 4)

**agent-identity-files** -- agent, S, parallel, no commit. Generate `~/.ssh/graphty-agent_ed25519`
and `~/.ssh/graphty-agent-signing_ed25519`; write `~/.config/git-agent/config` (budgets section 2.2,
with `core.sshCommand "ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes -o
IdentityAgent=none"`), an empty `~/.config/npm-agent/npmrc` and `~/.config/gnupg-agent/`; generate the
two site deploy key pairs. Done: keys at mode 600, public halves posted on #3418. Undo: delete.

**owner-agent-account** -- owner, S, CP (item 2, revised). Create the machine account (suggested
`graphty-agent`, 2FA, recovery codes kept), Write on graphty-monorepo only; `GH_CONFIG_DIR=~/.config/gh-agent
gh auth login` with its fine-grained token (budgets section 2.2); add the two SSH public keys; create
its tokens for `MASTER_GUARD_TOKEN` and `AGENT_AUTOMERGE_TOKEN`. Nothing of his own is removed.
Needs: `agent-identity-files`. Done: `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login` prints
the agent; `ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes -T git@github.com` greets it.
Undo: delete the account.

**owner-optional-hardening** -- owner, S, optional, any time. A passphrase on his SSH keys with no
ssh-agent holding them; an uncached GPG passphrase; his `credential.helper` lines in a config only
his shell loads. No step waits for it.

**owner-cloudflare** -- owner, S, parallel (item 3; results section 13). Workers Paid and R2; the API
token and account id as secrets; the scheduler App's Contents: read and Administration: read and a
second key on the `graphty-results` Worker; `GRAPHTY_RESULTS_TOKEN` in `.env`, its hash on the
Worker. Done: `/v1/health` answers (after `results-worker` deploys).

**owner-environments** -- owner, S, parallel (item 4). The seven environments, master only,
`production` with him as required reviewer and prevent self-review off; each one's secrets from the
list the session posts. Done: `gh api repos/graphty-org/graphty-monorepo/environments --jq
'.environments[].name'` lists all seven. Undo: delete them.

**owner-dns-and-domain** -- owner, S, parallel (item 6), needed by step 7. Verify `graphty.app` for
Pages; CNAMEs `canary` and `nightly`. Done: "Verified"; `dig +short nightly.graphty.app` answers.

**owner-site-repositories** -- owner, S, parallel (item 7). Create graphty-org/graphty-nightly; on it
and graphty-site add the deploy keys (write), Pages source GitHub Actions, and commit the `deploy.yml`
from `site-deploy-workflow`. At step 7: domain nightly.graphty.app, HTTPS. Done: the first nightly
deploy serves.

### Step 2: results store, write-only

**results-worker** -- agent, M, parallel. `tools/results-service/` (Worker, D1 migration, OIDC with
audience `graphty-results`; `full`, `bisect`, `base` only from master's ref and workflow; `local` by
token hash; `deploy` from the site repositories) and `results-service.yml` deploying from master. It
stores and answers, nothing more. Needs: `owner-cloudflare`. Done: tests pass; `/v1/health` answers; a
`full` record from a branch ref is refused. Undo: delete the Worker.

**results-reporter** -- agent, M, parallel. `tools/results/` (client; `run-group.mjs`: inputs key,
run, retry failed files once, one record per test group, spool); a Vitest failure reporter (batched
past the 20th); the step-2 ci.yml edit plus the gpu, hosts, macOS, lifecycle and LLM jobs; 5 s and
2 s timeouts, fail open. Needs: `results-worker`. Done, over 3 days: one query shows records equal to
jobs; p95 write under 500 ms; no job slowed over 5 s by the store; stored runs match their JUnit.
Undo: remove the reporter step.

**durations-timings** -- agent, M, parallel. `ci-budgets.json` (section 7 values),
`tools/ci-budgets.mjs` (`report`, `trend`, `lint`), a last `timings` job (`if: always()`) in ci.yml,
release.yml, gpu.yml and hosts.yml posting job, step, `NX_PROFILE` task and queue rows. Warns only.
Needs: `results-worker`. Done: 3 days of rows for every run; a slow scratch run warns and stays green.
Undo: remove the job.

### Step 3: freeze npm, switch identity (merged right after the flush ships)

**release-shadow-and-legacy** -- agent, M, CP, merges first. release.yml's `land` and `publish` off;
`mode: legacy` (owner-dispatched full lanes, then `latest` and graphty.app, both jobs in
`production`); an empty `release-approvals.json`. Needs: `flush-ship`, `owner-environments`. Done: a
scheduled run publishes and pushes nothing; a `mode=legacy` dispatch waits in `production`. Undo:
revert.

**test-integrity-check** -- agent, M, parallel. `tools/check-test-integrity.mjs` with tests (budgets
section 4.1) and its replay over the 96 `land:` merges of 2026-10-18 to 10-24. Done: every false
positive fixed in the check; the real-hit count in section 6.2 and on #3418. Undo: delete.

**codeowners-and-closure** -- agent, S, parallel. `.github/CODEOWNERS` (section 6.2) and
`tools/check-owned-closure.mjs` over the selector's import graph. Done: the replay over the 117
landings counts the owned ones (about 27 expected); the closure check names no unowned file on master
once the list grows by what it named. Undo: delete CODEOWNERS.

**pr-integrity-workflow** -- agent, M, CP. `pr-integrity.yml` (section 6.4: integrity, owned closure,
Proof, fresh-review patch id, breaking guard, signed baselines via master's `approval.mjs`, the three
exemptions); `.github/pull_request_template.md`; `pr-issue-link.yml` accepts `dependabot[bot]`;
`dependabot-automerge.yml`. Needs: `test-integrity-check`, `codeowners-and-closure`. Done:
`step-3-acceptance`. Undo: drop it from the required checks.

**agent-env-and-guard** -- agent, M, CP. `.claude/settings.json` `env`: `GH_CONFIG_DIR`,
`GIT_CONFIG_GLOBAL`, `NPM_CONFIG_USERCONFIG`, `GNUPGHOME`, `SSH_AUTH_SOCK=""`. A PreToolUse hook
`tools/claude-owner-credential-guard.mjs` with tests, in the style of `claude-no-foreground-wait.mjs`:
refuses Bash, Read, Grep and Glob calls touching `~/.config/gh/`, `~/.gitconfig`, `~/.git-credentials`,
`~/.npmrc`, `~/.gnupg/`, non-agent keys in `~/.ssh/`, `git credential fill|approve`,
`git credential-cache`, `gh auth token|switch`, `ssh-add`, `-c credential.helper`, or an override of
any of the five variables. CLAUDE.md's "Starting Servers" and "The GitHub API budget" rewritten
(migration section 6); `visual-review` and `pr-status-broker` restarted with both variables. Needs:
`owner-agent-account`. Done: in an agent session `gh api user` is the agent, `git credential fill`
gives no password, `npm whoami` fails, a commit is "Verified" as the agent; the hook test refuses each
pattern and passes an ordinary call of each tool. Undo: remove the block and the hook.

**owner-scratch-ruleset** -- owner, S, CP. One `gh api` command the session posts on #3418 creates a
scratch ruleset with exactly the planned settings on `scratch/ruleset-trial`; the agent runs
`step-3-acceptance`'s cases against it. Undo: delete it.

**owner-ruleset-switch** -- owner, S, CP (item 5). Approve the step-3 pull requests; ruleset
23973898 per section 13 item 5; the tag ruleset; the `channel/*` rule; squash off; Actions
read-only. Undo: add the bypass actor back.

**step-3-acceptance** -- agent, S, CP. Migration section 3's step-3 cases, each on purpose and logged
on #3418: graphty.app unchanged; an owned-path pull request waits and a `graphty/src/` one
auto-merges; `--admin` refused; `bypass_actors` only `DeployKey`; an agent `*@*` tag push refused; a
revert, an accept-only and a Dependabot pull request pass PR Integrity, a `feat!:` title and an
unsigned PNG fail it; a master merge keeps the fresh review and a fix push loses it; the review
server's accept commit is the agent's.

### Step 4: selection readiness (parallel)

**file-level-selection** -- agent, S each, six parallel branches: graph-io, webgpu-graph-algorithms,
algorithms, layout, graph-samples, cytoscape-extensions. A clean `test-select-mutate.mjs <package>`
run adds the package to `fileLevel` (and `fileLevelBrowser`); otherwise its longest shard is sliced
under 8 min. Done: the clean run in the Proof, or every slice under 8 min in CI. Undo: remove the
entry.

**affected-input-fixes** -- agent, S, parallel. Merging section 4.3: `.github/workflows/**` out of
`sharedGlobals`, `projectsAffectedByDependencyUpdates: "auto"`, `^\.github/` and `^pnpm-lock\.yaml$`
out of `everything.patterns`, the smoke-shard rule. Done: a workflow-only commit selects only the
tool tests and smoke shards; a lockfile bump of one package's dependency affects only its
dependents. Undo: revert.

**light-check-replay** -- agent, M, CP. `packBins()` in `tools/test-select.mjs` (bins of at most
8 min from per-file durations, an unknown file counted as the family's longest) with tests; the
replay of `tmp/test-select/advisory.jsonl` through it sets each light-check key in
`ci-budgets.json`. Done: the replay's table (key, p50, p90) on #3418, cited in each `why`. Undo:
revert.

**story-parity-spike** -- agent, M, parallel. Stories section 9's spike: 50 stories each of graphty
and graphty-element, dev and production mode, measured by a new `visual-review parity` command (which
merges; the harness may not). Done: the outcome recorded on #3418. Undo: none needed.

### Step 5: pull requests into master

**nx-cache-worker** -- agent, S, parallel. `tools/nx-cache-worker/` over R2 (merging section 5.2),
deployed by one more job in `results-service.yml`; write token in `nx-cache-write`, read token a
repository secret. Needs: `owner-cloudflare`, `owner-environments`. Done: master writes entries; an
unaffected package is a remote hit on a pull request; a pull request write gets 403. Undo: unset the
two variables.

**light-check-plan** -- agent, M, CP. A per-entry `files` field in `ci-test-matrix.mjs`; the story
selector in `test-select.mjs` (import closure, global inputs, the lockfile exception); default base
`origin/master` there and in `test-changed.mjs`; the import-graph cache key. Needs:
`light-check-replay`, `affected-input-fixes`. Done: tests; a one-package plan's bins are all under
8 min. Undo: revert.

**light-check-workflow** -- agent, L (the one step-5 ci.yml pull request, about 400 lines), CP.
Merging section 4.1: Plan inside Build with one store read as `results-plan`; Build with the cache
probe; the added Checks (including the signing-bypass check out of `prepush-source-checks.sh`); tool
tests only on tool changes; `Test (<family>-<bin>)` through `run-group.mjs`; `Stories (<project>-<bin>)`;
old `visual` report-only outside All Checks Pass; Docs only on docs inputs; coverage, network links,
lifecycle and Cost Estimate Accuracy moved to the full run. Needs: `light-check-plan`,
`nx-cache-worker`, `results-reporter`, `step-3-acceptance`. Done: a one-package pull request within
`run:ci.yml:pr`, a graphty-element `src/` one within `run:ci.yml:pr-wide`; a changed image reports and
passes. Undo: revert the ci.yml commit.

**store-reads-live** -- agent, M, CP, once `results-reporter` has 3 days. Quarantine and the master
excuse from the plan (`[NEW-FLAKY]`, `[FLAKY-UNRELATED]`, `[KNOWN?]`); `base-check.yml` (input
`repeat`), moved here from the design's step 6 because `[KNOWN?]` needs it from the first pull
request; `tools/test-quarantine.json` deleted; `results/cli.mjs import` of the 14,203 ledger records
as kind `local`. Done: a seeded unrelated flaky test passes as `[FLAKY-UNRELATED]`; `base-check.yml
repeat: 5` quarantines it; 14,203 imported. Undo: revert.

**pr-open-and-review** -- agent, M, CP. `tools/pr-review.sh` (headless `claude -p`, `/code-review`
at `high`, issue plus diff plus Proof only, report with its patch id) and `tools/pr-open.sh` (merging
section 2.2). Done: on a scratch branch `pr-open.sh` returns in under 30 s with auto-merge armed and
PR Integrity green. Undo: revert.

**quick-check-and-prepush** -- agent, S, parallel. `tools/check-quick.sh` and `check:quick` (merging
section 6, with `GIT_CONFIG_GLOBAL=/dev/null` for tests); `.husky/pre-push` down to LFS, secret scan
and images. Done: `pnpm run check:quick` under 6 min on a one-package change; under 10 s of push-hook
time. Undo: restore the hook.

**kept-tools-strip** -- agent, M, parallel. The gate lane and marks out of `test-slots.mjs`, the sync
merge out of `branch-push.sh`, the gate-shard lane out of `with-browser.sh`, the sync fields out of
`branch-note.mjs`. Done: their tests pass; two local vitest runs still share slots. Undo: revert.

**shipping-instructions-switch** -- agent, L in words, CP, the last step-5 merge, so instructions and
flow change at one moment. Root CLAUDE.md per migration section 6's step-5 rows ("Shipping a change",
under 600 words, replaces the landing and verification sections; the five agent rules of budgets
section 4.4); `compact-mantine/CLAUDE.md`; the pipeline-round skill in section 12's order with
`tools/pipeline-round-skill.test.mjs`; issue-round (subagents end with `pr-open.sh`); design-studio (a
pass opens its pull request). Also the defaults: `worktree-new.sh` from `origin/master` with no
`land-live` hand-off, `MAIN_FOLLOWS = "master"`, `dependabot.yml` to master, `worktree-cleanup.mjs`
"merged into master", `VITEST_BUDGET_BASE`; and the golden-local, freeze-golden, push-queue and
deploy-blocker memory entries marked superseded. Needs: `light-check-workflow`, `pr-open-and-review`,
`store-reads-live`. Done: the skill test passes; `grep -c 'land.mjs land' CLAUDE.md
.claude/skills/*/SKILL.md` is 0; root CLAUDE.md under 12,000 words. Undo: restore the sections, `git
branch golden origin/master`.

**open-waiting-branches** -- pipeline round, S. Each branch that waited during the flush gets
`pr-open.sh`, oldest first, at most 10 open at once. Done: the broker's file shows no waiting branch
without a pull request.

**step-5-acceptance** -- agent, S, CP. Over the first 20 merged pull requests: median to All Checks
Pass within budget; 18 merged untouched; master green after each; one Dependabot pull request
auto-merged and built.

### Step 6: the full run every 6 hours, publishing nothing

**bisect-core** -- agent, M, parallel. `tools/bisect-core.mjs` with tests: `verify.mjs`'s rules
(channels section 6). Done: three recorded verifications (a culprit, a flaky-before, no culprit)
replay to `verify.mjs`'s answers. Undo: delete.

**bisect-workflow** -- agent, M, CP. `bisect.yml` (concurrency `bisect-<sha>`, the full run's load
conditions, at most 8 points); a `files` input and per-point concurrency on gpu, hosts and macOS; T4
capped at 4 paid hours after the local card; LLM limits of channels section 5. Needs: `bisect-core`.
Done: a broken scratch range names its culprit merge. Undo: revert.

**full-run-release** -- agent, L (the step-6 release.yml and ci.yml pull request), CP. Channels
sections 5 and 13: `mode`, the catch-up step, the store's candidate pick, `release-diff.mjs`,
`version-dry-run` against `release-approvals.json`, `verdict` with the gate on green-clean, the red
issue and one bisect dispatch, `workflow_run` removed; ci.yml `reuse_build_run`, On shards after their
Off twins (none while `FEATURES` is empty), Performance outside the verdict, and `release-due` (the
migration table puts it at step 5, but it does nothing before the full run); `deploy-pages.yml`
records `site-<sha>`; `hosts.yml` loses its cron. Needs: `step-5-acceptance`. Done: a dispatched run
posts a verdict; a second dispatch on the same commit skips as judged. Undo: stop the scheduler.

**llm-once-a-day** -- agent, S, in `full-run-release`'s branch. The `llm` job runs when the ci.yml
lane is green and the store has no LLM run that UTC day, or on an owner `mode=full`; `spend:llm`
warns at $60. Sections 3, 9 and 11, channels section 5 and CLAUDE.md's `llm-regression` line corrected.
Done: two days of slots, exactly one LLM run a day. Undo: one condition.

**autosave-compat-lane** -- agent, M, parallel. A lifecycle test opening production's autosave and
project files with the candidate, and the reverse refusing without touching data (channels section
10). Done: passes on master; a seeded format change fails it. Undo: remove it.

**step-6-acceptance** -- agent, S, CP. 8 consecutive slots passed, or failed with a culprit whose
revert made the next pass; none skipped but as judged.

### Step 7: nightly and npm `next`

**nightly-publish-environment** -- agent, S, CP, lands alone first. `publish` declares `environment:
release`, `--tag next`, `pnpm install --frozen-lockfile --ignore-scripts`; `land` pushes `site-<sha>`
and `channel/nightly`. Done: a release dry run under `--ignore-scripts` succeeds. Undo: revert.

**owner-npm-bind** -- owner, S, CP (item 8), on a day a nightly is due. Environment `release` on each
trusted publisher; `NPM_DIST_TAG_TOKEN` in `production` and `NPM_DIST_TAG_TOKEN_EXPIRES`. Done: the
first `next` publish and a no-op `npm dist-tag add` succeed.

**site-deploy-workflow** -- agent, S, parallel. `tools/channel/site-deploy.yml` (the site
repositories' `deploy.yml`: check the asset against `deployed.json`, deploy, report kind `deploy`)
and `graphty/sites/nightly.json`. Done: a wrong-hash dry run refuses. Undo: revert.

**nightly-site-and-approval** -- agent, L in two branches, CP. (a) release.yml's `site` job
(prerelease, tarball and `channel.json`, sha256 to the store, `deployed.json` to graphty-nightly,
wait for the report), `land` and `publish` on for `next`, the `age:nightly` stall alarm. (b) the
review page and server (not `trusted/`): offer the oldest unpromoted green-images candidate, frozen,
decisions by hash; Finish opens the accept-only pull request whose merge resumes it
(`promote-nightly`); live via `tools/live.sh visual-review`. Needs: `nightly-publish-environment`,
`owner-npm-bind`, `site-deploy-workflow`, `owner-site-repositories`. Undo: skip the promote job.

**owner-immutable-releases** -- owner, S, once the session reports `gh release edit --prerelease` and
`--latest` work on an immutable release.

**step-7-acceptance** -- agent, S, CP. Migration section 3's step-7 checks for one automatic and one
approved promotion; CLAUDE.md "Release versioning" and "A new package's first npm publish" rewritten.

### Step 8: production promotion and the domain move

**promote-workflow** -- agent, M, CP. `promote.yml` (channels section 8) and
`graphty/sites/production.json`. Done: a dry run waits for the owner and moves nothing. Undo: do not
dispatch it.

**dataset-overlay-and-site-check** -- agent, M, parallel. `tools/dataset-overlay.mjs` with its test
over two real `build-hosted.mjs` outputs, and `tools/check-site.mjs` (file list and hashes, every
page and dataset 200 over HTTPS, build stamp). Done: both tests pass. Undo: revert.

**owner-domain-swap** -- owner, S, CP (item 10), after the first promotion filled graphty-site and
`check-site.mjs` passed on it. Undo: swap back.

**step-8-acceptance** -- agent, S, CP. Migration section 3's step-8 checks; CLAUDE.md "GitHub Pages
URLs" and "Build System" and `graph-samples/CLAUDE.md`'s dataset paragraph rewritten.

### Step 9: stories as tests, per project (after step 6, off the critical path)

**story-test-harness** -- agent, M, after `story-parity-spike`. `@graphty/visual-review/vitest` and
`visual-review/capture/story-test.mjs`, `merge-results`, production semantics (stories sections 3
and 4). Done: one graphty story's PNG byte-equals the old capture's. Undo: revert.

**stories-switch-project** -- agent, S each, in order: graphty, graphty-element, compact-mantine
(Storybook 9 first, its own pull request, `Figma-Approved:` if a picture moves), algorithms and
layout, cytoscape-extensions, graph-io-fidelity. Its owned `.storybook/vitest.setup.*`, both captures
in each full run, `visual-review parity`. Done: two zero-difference runs (or the owner's re-baseline),
then its entry leaves the `visual` job. Undo: put the entry back.

**owner-rebaseline** -- owner, M, only on "no parity": one Finish per project; any change to
`gate.mjs` or `approval.mjs` is his or authorized on the issue.

**old-capture-removal** -- agent, M, after the last switch. Stories section 11's list. Done: a full
run green without it. Undo: revert.

### Features track (product work, beside steps 5 to 8)

**features-module** -- agent, M. Features section 3's module in graphty-element, the API report,
`tools/check-features.mjs` (an `@experimental` export must name a `FEATURES` row; the element reads no
host URL, storage or environment), docs and README stating the `@experimental` promise. Additive, so
no owner approval. Done: the API report only adds; unknown ids never throw; an orphan
`@experimental` export fails the check.

**app-site-config** -- agent, S, before step 7. The app fetches `site.json` first (missing or invalid
= every experiment off), applies `featuresFromUrl(location.href)`, shows the site name; the per-site
build branches in `sentry.ts` and `open.ts` go. Done: real-element tests with and without
`site.json`.

**on-configuration** -- agent, S, with the first `FEATURES` row. A setup file calling
`setDefaultFeatures(["all"])`, On shards, element stories against Off baselines. Done: the first
flag's pull request changes no screenshot and no test.

### Step 10: deletion

**deletion** -- agent, L of deletions (one pull request, so one revert undoes it), owner-reviewed.
Needs: steps 5 to 8 accepted, 7 days without undo, #3318 closed. Section 15's list, release.yml's
`mode: legacy`, the remaining CLAUDE.md rows, the package CLAUDE.md references (algorithms, layout,
graph-format, graph-samples, webgpu-graph-algorithms, githerd), the pipeline-round skill trimmed.
Done: lint, knip and a full run green; migration section 3's grep finds nothing outside `design/` and
`.claudehistory/`; about 12,300 lines deleted against at most 6,450 added. Undo: `git revert -m 1`.

**local-cleanup** -- pipeline round, S, after `deletion` merges. Each tip logged to
`tmp/pruned-branches.log`, then the golden branches, tag `golden-good`, the golden, gate, land and
githerd worktrees, `githerd-dev` and its MCP registration, and the four `tmp/` state folders removed.
Done: `git ls-remote origin 'golden*'` is empty; `git worktree list` names none. Undo: recreate the
branches from the log.

## 5. Branches

One pull request each; lines are estimated changed lines with tests; "owned" means the owner reviews.

- Step 0, through golden: `perf/ci-build-sentry-after-build` (sentry-build-fix, 120, owned);
  `fix/3393-audit-and-t4-graph` (release-cause-fixes, 150); `ci/3418-flush-guard`
  (flush-stop-landing, 30); `ci/3418-freeze-graphty-app` (freeze-graphty-app, 30).
- Step 2: `ci/3418-results-worker` (400); `ci/3418-results-reporter` (400, the step's ci.yml edit);
  `ci/3418-ci-budgets` (durations-timings, 350). All owned.
- Step 3, all owned: `ci/3418-release-shadow` (200, first); `ci/3418-test-integrity` (400);
  `ci/3418-codeowners` (150); `ci/3418-pr-integrity` (350); `ci/3418-agent-identity` (300).
- Step 4: `ci/3418-select-<package>` x6 (20 each, owned); `ci/3418-affected-inputs` (60, owned);
  `ci/3418-bin-packing` (250, owned); `ci/3418-story-parity-spike` (250).
- Step 5: `ci/3418-nx-cache` (150, owned); `ci/3418-light-check-plan` (350, owned);
  `ci/3418-light-check` (400, owned); `ci/3418-store-reads` (350, owned); `ci/3418-pr-open` (250,
  owned); `ci/3418-quick-check` (120, owned); `ci/3418-strip-gate-lanes` (250);
  `ci/3418-shipping-instructions` (docs, owned, last).
- Step 6: `ci/3418-bisect-core` (400, owned); `ci/3418-bisect-workflow` (350, owned);
  `ci/3418-full-run` (full-run-release and llm-once-a-day, 400, owned); `test/3418-autosave-compat`
  (250).
- Step 7: `ci/3418-publish-environment` (40, owned, first); `ci/3418-site-deploy` (120, owned);
  `ci/3418-nightly-site` (350, owned); `ci/3418-nightly-approval` (350).
- Step 8: `ci/3418-promote` (350, owned); `ci/3418-dataset-overlay` (250, owned).
- Step 9: `ci/3418-story-test-harness` (400, owned); `ci/3418-stories-<project>` x6 plus the
  compact-mantine Storybook 9 upgrade (50 each, owned); `ci/3418-old-capture-removal` (-250, owned).
- Features: `feat/3418-features-module` (400); `feat/3418-app-site-config` (150);
  `feat/3418-on-configuration` (100).
- Step 10: `ci/3418-delete-golden-pipeline` (about -12,000, owned).

The round gives each rollout step's owned pull request its own `ACTION NEEDED` line when green.
