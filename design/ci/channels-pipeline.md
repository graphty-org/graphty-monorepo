# The channels pipeline: canary, nightly, production

Status: design, 2026-10-24. Issue #3418. Replaces the golden-local pipeline
(`design/ci/golden-local.md`, `design/ci/fast-pipeline.md`). Each area's detailed design is an
appendix in `design/ci/channels-pipeline/`; where an appendix disagrees with this document, this
document wins. [settled.md](channels-pipeline/settled.md) lists the disagreements between the first
drafts and how each was settled.

- [channels.md](channels-pipeline/channels.md): sites, full run, bisect, promotion, rollback, autosave
- [merging.md](channels-pipeline/merging.md): pull requests, light check, build cache, quick check, Dependabot
- [results-service.md](channels-pipeline/results-service.md): the Cloudflare test results store
- [stories-as-tests.md](channels-pipeline/stories-as-tests.md): screenshots inside each story's test
- [features.md](channels-pipeline/features.md): feature flags
- [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md): time budgets, caches, agent account, bypass, agent rules, pipeline round
- [migration.md](channels-pipeline/migration.md): rollout steps in detail, deletions, CLAUDE.md rewrite table

## 1. Overview

### 1.1 Three channels

Each channel is a public GitHub Pages site hosting its own build and its own datasets, and each
holds exactly the bytes the channel before it held. Nothing is rebuilt after canary.

| Channel    | Site                | Built files live in                                 | npm dist-tag | Moves when                                                                                                  |
| ---------- | ------------------- | --------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| canary     | canary.graphty.app  | graphty-monorepo's own Pages                        | none         | every green master build, minutes after a pull request merges                                               |
| nightly    | nightly.graphty.app | graphty-org/graphty-nightly (new, built files only) | `next`       | a green 6-hour full run: at once when no screenshot changed, after the owner's signed approval when one did |
| production | graphty.app         | graphty-org/graphty-site (exists, built files only) | `latest`     | only when the owner triggers it and approves it in GitHub                                                   |

Code stays in graphty-org/graphty-monorepo. A version number is created once, at nightly;
production moves `latest` to the same versions and deploys the same site tarball.

### 1.2 One change, from branch to production

1. **Branch.** `./tools/worktree-new.sh fix/1234-topic` starts a worktree from `origin/master`.
   Commits are pushed to the branch; a branch push runs no CI.
2. **Review, then open.** A review subagent that has not seen the author's conversation reads the
   issue and `git diff origin/master...HEAD`; the author fixes what it finds. `tools/pr-open.sh`
   merges `origin/master` if behind, pushes, opens the pull request as the agent account, posts the
   review marked with the patch id of the branch's own diff (section 6.4), arms auto-merge and exits
   at once. The quick check is opt-in (`--check`, run in the background); CI is the only gate.
3. **Light check in CI.** Format, lint, typecheck, affected build from a remote cache, affected test
   files packed into the shard family's jobs, affected stories as screenshot tests, tool tests only
   when tools changed. A change inside one package: p50 10 to 15 min. A graphty-element `src/` change
   or a global input selects nearly every test file and costs about the full test matrix's wall time:
   about 15 min on 25 jobs plus Build, p50 about 25 min. A changed screenshot is reported, never a
   failure. Green merges into master.
4. **Canary.** The master push builds everything (about 8 min once the Sentry fix is in) and deploys
   canary.graphty.app. Merge to canary: about 20 to 35 min.
5. **Full run, every 6 hours** on the newest green master build: every shard in both feature-flag
   configurations, every story's screenshot, T4 GPU, Hosts, macOS work protection, the audit, LLM
   regression once per candidate. Measured 65 to 93 min today; target 60 to 75 (section 3). Red:
   bisect master's merges with only the failing tests, revert by pull request, fix forward.
6. **Nightly.** Green with no changed screenshot: version, publish npm `next`, deploy
   nightly.graphty.app (budget 20 min). Changed screenshots: wait for the owner's Finish, then the
   same, no re-test. Merge to nightly when clean: about 3 h of average slot wait plus 80 to 95 min,
   about 4.5 h on average, 7.5 h at worst.
7. **Production.** The owner dispatches `promote.yml` and approves the `production` deployment:
   `latest` moves to the nightly's versions and graphty.app gets its tarball.

**Hotfix** (also every security fix): the fix merges as usual. If canary is red for another reason,
the pipeline round reverts that culprit first; the owner decides canary's pending screenshots, then
dispatches `release.yml -f mode=full` and promotes straight through (about 2 hours). A hotfix ships
everything canary holds, all of which passed that full run; there is no hotfix branch, so nx's tags
stay on master's history. **Rollback:** `promote.yml` with the previous nightly, refused across an
autosave format change (section 3).

### 1.3 What runs where

- **Agent's machine:** review subagent; `pr-open.sh` (seconds); quick check on request
- **`.husky/pre-push`:** LFS upload, secret scan, committed-images limit (seconds)
- **Pull request (`ci.yml`, `pr-integrity.yml`):** light check and PR Integrity
- **Master push (`ci.yml`, `deploy-pages.yml`):** build, Storybooks, docs, canary deploy, and a last
  `release-due` job that dispatches release.yml only when a restart or resume is due
- **Every 6 h (`release.yml`):** full run, verdict, nightly promotion (60 to 75 min target)
- **Red full run (`bisect.yml`, dispatched by release.yml):** confirm, then the bisect points
- **Owner trigger (`promote.yml`):** dist-tag move, production deploy (minutes)
- **Cloudflare:** a results and durations store that answers queries and decides nothing (Worker +
  D1), the build cache (R2), the existing scheduler (calls under 5 s, fail open)

## 2. Merging

Detail: [merging.md](channels-pipeline/merging.md).

- **One path:** every branch, its own pull request, merge commits only (squash off), opened only
  when finished, never as a draft. A subagent opens its own pull request and stops.
- **Required checks:** `All Checks Pass`, `Lint PR Title`, `Link PR Issue`, `PR Integrity`
  (section 6.4). Not strict: nothing re-runs when master moves.
- **The light check:** a plan step (nx affected from the merge base, `tools/test-select.mjs`, the
  story selector, the one store read of the run); Build with the cache; **Checks**: every step
  today's ci.yml Checks job runs, plus `nx affected -t lint typecheck`, offline links, the
  signing-bypass check moved out of `prepush-source-checks.sh`, `ci-budgets.mjs lint` and
  `check-features.mjs`; **tool tests** only when `.github/`, `tools/`, `nx.json` or a root config
  changed; **tests**: a shard family's selected files are packed into bins of at most 8 min from the
  store's per-file durations (unknown files count as the shard's longest), the matrix sized from the
  selected seconds, no coverage; selected stories (no Storybook build); Docs when docs inputs changed.
  Coverage thresholds, the network link check, `graphty-element-lifecycle`, Cost Estimate Accuracy and
  whole-shard passes move to the full run.
- **Selection must exist before the switch:** file-level selection covers graph-format,
  remote-logger, compact-mantine, graphty and graphty-element today. Each other package joins
  `fileLevel` after a clean `tools/test-select-mutate.mjs` run, or its longest shard is sliced under
  8 min; until then its pull requests run whole shards under their own budget key (section 7). The
  light-check budgets are set from a replay of `tmp/test-select/advisory.jsonl` through this packing
  before rollout step 5.
- **Input fixes:** `.github/workflows/**` leaves `sharedGlobals`, and `^\.github/` and
  `^pnpm-lock\.yaml$` leave `everything.patterns` in `tools/test-select-rules.json` (a workflow or
  matrix change runs the tool tests plus one smoke shard of each kind);
  `projectsAffectedByDependencyUpdates: "auto"` replaces "the lockfile runs everything". Exception: a
  lockfile change that moves Playwright, Chromium, Storybook, Vitest or a font package runs every story.
- **Build cache:** nx's self-hosted remote cache on a Worker over R2, written only from master. A
  2-second probe; no answer means build without it. `graphty:build` hashes the commit, so it never
  hits and is budgeted as uncached.
- **Sentry fix** (#3415) lands first, corrected: the branch's master-only inject step makes canary's
  bytes differ from every pull request's build. A separate job after Build injects debug ids on every
  event (no secret) and re-uploads graphty's dist; only the upload is master-only. `VITE_SENTRY_*`
  become repository variables. `graphty:build` 13m33s to about 60 s.
- **Real GPU:** the quick check runs the local NVIDIA tests with `GRAPHTY_GPU_REQUIRE=nvidia` and the
  EGL path set explicitly; it unsets only the old gate's variables, by a list. `hosts.yml` keeps its
  advisory pull request trigger and loses its nightly cron at step 6.
- **Dependabot** targets master; `dependabot-automerge.yml` arms auto-merge with an agent token
  scoped to Contents and Pull requests write. Link PR Issue and PR Integrity accept `dependabot[bot]`
  without an issue line, Proof or review; test integrity still applies.
  Actions updates wait for the owner by design.
- **No merge queue at first.** The bisect records skew breaks. Two in 7 days, or one that kept canary
  red over 6 hours: the pipeline round proposes Mergify (`merge_group` is the alternative).
- **Red master build:** `master-guard.yml` opens a revert pull request as the agent account.

## 3. Channels and promotion

Detail: [channels.md](channels-pipeline/channels.md).

- **One tarball.** `tools/assemble-pages-site.sh` assembles the site once per master build (about
  373 MB) as artifact `site-<sha>` (14 days), and `deploy-pages.yml` records the commit in the store.
  The full run and the bisect reuse each master build (ci.yml input `reuse_build_run`).
- **Where built files live.** At nightly the `land` job (environment `release`) pushes the
  `site-<sha>` tag with the version tags; the `site` job creates the prerelease on it with
  `GITHUB_TOKEN`, attaches the tarball and `channel.json`, writes their sha256 to the store, and
  pushes `deployed.json` (holding the sha256) to the site repository. The site's `deploy.yml` checks
  the asset against it, deploys and posts its outcome to the store; the waiting job ends on that
  report and fails loudly on a failed deploy. Assets are trusted only by the store's hash; the owner
  also turns on immutable releases (section 13 item 6).
- **The full run** (`release.yml`, dispatched at 00, 06, 12, 18 UTC with `mode: full`) takes the
  newest master first-parent commit whose push build is green and whose `site-<sha>` exists, from
  the store (canary's build stamp is a cross-check after step 8). It skips a commit already judged,
  or one whose diff from the last judged commit is only release-version merges and accept merges
  (`tools/release-diff.mjs`). The version and major-bump dry run is its own lane, and the `version`
  job reuses its plan. Lanes: ci.yml (each On shard starts when its Off twin ends), `gpu.yml`,
  `hosts.yml`, `work-protection-macos.yml`, the audit, and LLM regression once per candidate, started
  when the ci.yml lane is green (off the critical path). Performance Benchmarks becomes `needs:
build`, outside the verdict. The `verdict` job ends in `green-clean`, `green-images`, `red` or
  `owner-item`, and also runs the screenshot gate on green-clean (section 5).
- **Owner go for a major or a first publish.** The dry run lists every project that would publish a
  major or its first version (npm sets `latest` on a first publish whatever the tag). Each needs an
  entry in code-owned `release-approvals.json` naming the project, the merge and the owner's approving
  review; without one, that project alone is held for this nightly and the verdict names it as an
  owner item, while every other project promotes. The grouped major (#676, #702, #843, #1370) has no
  entry and stays held.
- **Concurrency:** release.yml loses its `workflow_run` trigger. ci.yml's master-push `release-due`
  job reads the store and dispatches release.yml only when a restart or a resume is due. Every
  release.yml run first catches up (resumes an approved candidate, runs an unjudged slot), so a run
  the `release-train` group replaces loses nothing. `release-router.yml` is not built.
- **Red:** release.yml files "Full run red: <lane> on <sha>" (`priority:critical`) and dispatches
  `bisect.yml` once (concurrency `bisect-<sha>`): when the ci.yml lane ends red, or at the verdict
  for another lane. The matrix runs at most 8 points at once. Confirm and each point run under the
  full run's conditions: browser and Storybook files one repetition after another in one job, Node
  files under `workerShare()`; parallelism and CPU count are in the inputs key. A culprit only when
  its parent passes all 5 (20 for a newly intermittent test); flaky before the range is quarantined,
  never bisected. GPU, Hosts and macOS lanes bisect through a `files` input and a per-point
  concurrency group, the T4 one point at a time after the local card, with a cap of 4 paid T4 hours a
  bisect. LLM: at most 2 confirm runs, points only over merges touching AI code or the lockfile, one
  paid run each, spend checked against the ceiling first. The round opens the revert. A restart runs
  only on a merge referencing the red issue, failing tests first. Budget `ttg:full` 180 min, with
  owner-wait recorded as its own key.
- **Nightly promotion** reuses today's `version`, `land` (deploy key, version merge and tags, the
  site tag, `channel/nightly`) and `publish` (`--tag next`) jobs, then `site`. While a publish hold
  is open, slots still run; promoting a new version set waits for the hold to clear.
- **Production promotion** (`promote.yml`, environment `production`: the owner as required reviewer,
  "prevent self-review" off, master only) refuses a nightly that was not clean or approved, whose
  asset hash differs from the store's, has a publish hold, misses a version on npm, or would roll
  back across an autosave or project format change; checks the token and every package's dist-tags
  before moving any; moves `latest`; merges production's datasets (index merged, thumbnails replaced,
  datasets add-only by gunzipped bytes; channels section 2); deploys graphty-site with
  `graphty/sites/production.json` from master's tip; then a `needs:` job in environment `release`
  fast-forwards `channel/production` with the deploy key. Idempotent; `config_only` redeploys with a
  new `site.json`; input `channel: nightly` rolls `next` back.
- **Autosave across sites:** each site is its own origin, so saved work and AI keys do not follow a
  reader; the app shows the site name from `site.json`. A change to the autosave or project format
  must stay readable by the previous production build, or refuse without touching the data, tested
  in the full run against production's build.
- **Links:** `https://graphty.app` links resolve against canary; a graphty.app 404 for a path the
  newest nightly serves is "pending promotion".

## 4. Test results and durations in Cloudflare

Detail: [results-service.md](channels-pipeline/results-service.md).

- **What:** Worker `graphty-results` with D1 (`tools/results-service/`, client `tools/results/`),
  deployed by `results-service.yml` from master. Replaces the local ledger and the quarantine files.
  It stores and answers; it dispatches nothing, re-runs nothing and files no issue. The workflows
  that read its answers act on them: release.yml dispatches the bisect and files the red issue, the
  `timings` job files budget alarms, the round dispatches base checks.
- **One read per run:** the plan step reads the plan once (one retry with backoff on a full run) and
  hands it to every job as an artifact.
- **Writes:** every CI test job, and the GPU, Hosts, macOS, lifecycle and LLM jobs, runs `node
tools/results/run-group.mjs <group>`: compute the inputs key, run, retry failed files once, post one
  record per test group as its last step. A Vitest reporter posts each failure as it happens; past
  the 20th it batches, one event every 5 s with every new failure, so nothing waits for the record.
- **Inputs key:** today's shard input key, the selected files, runner image and class, CPU count and
  parallelism, Node and browser versions, GPU adapter, flag configuration, and for a story test its
  baseline blob.
- **Rules:** flaky = passed and failed on the same commit and inputs key, quarantined with a
  `priority:critical` issue (by full and bisect evidence only). On a pull request a test that failed
  then passed fails the check as `[NEW-FLAKY]` only when the pull request changed its file or import
  closure; otherwise it passes loudly as `[FLAKY-UNRELATED]` and the round runs a base check of it
  5 times on master, which can quarantine it. Broken = failed run and retry: fails a pull request
  unless master fails it the same way. Quarantine leaves on issue close, 20 passes or 14 days, all
  computed at read time; never GPU tests or the screenshot gate. Full runs and bisects excuse nothing.
- **Evidence only from master's code:** kinds `full`, `bisect` and `base` are accepted only when the
  OIDC `ref` is `refs/heads/master` and `job_workflow_ref` names master's workflow file. A pull
  request's failure is excused only by such records; when none exists the job says `[KNOWN?]` and the
  round dispatches `base-check.yml`, then re-runs the failed job if the base fails the same way.
  `restricted-cpu-stress.yml` writes kind `stress`, never evidence.
- **Fail open:** 5 s for plan and record, 2 s for a failure event. No plan means no reuse, no
  quarantine, no excuse: longer and stricter, never looser. An unsent record is spooled and re-posted.
- **Credentials:** CI uses the job's OIDC token; local runs write only kind `local`; each site
  repository's `deploy.yml` writes only kind `deploy`. The scheduler App gains Contents: read for the
  ancestry check.
- **Cost:** about 110,000 rows a day: Workers Paid ($5 a month).

## 5. Stories become tests

Detail: [stories-as-tests.md](channels-pipeline/stories-as-tests.md).

- **One render per story.** An `afterEach` in each project's `.storybook/vitest.setup.ts` shoots the
  story at the end of its test with today's capture settings and compares it with the baseline using
  unchanged `compare.mjs`. New entry point `@graphty/visual-review/vitest`. The story projects run
  with production semantics (`mode: "production"`, `NODE_ENV`, build-storybook's CSS handling), and
  the spike measures dev against production mode. If byte parity with the built Storybook cannot be
  reached, one built-Storybook capture stays in the full run as the shipped-bytes check gating nightly.
- **Outcomes:** `unchanged` passes; `changed` and `new` pass and are written for review; `unstable`
  follows the flaky rule of section 4; a render error fails.
- **Selection:** a story file runs when its import closure holds a changed file; every story of a
  project runs when its global inputs change; unknown means run. graphty's, compact-mantine's and
  graph-io-fidelity's stories run in shards of at most 8 min, merged by `merge-results`. An accept-only
  pull request's Stories job is report-only, outside All Checks Pass.
- **compact-mantine** is on Storybook 8.6 with one glob test, so any compact-mantine change runs all
  1,004 stories (sharded) until it moves to Storybook 9 (a Figma-Approved change if a picture moves).
- **The signature gates every promotion.** PR Integrity fails any pull request that changes a PNG or
  story settings file under `visual-baselines/` without a passkey-signed approval of the resulting
  tree (reverts excepted, recomputed), checked with master's own `approval.mjs`. The verdict runs the
  gate on green-clean too: C's baselines tree must equal nightly's or carry a signed statement of
  exactly that tree.
- **Approval gates nightly.** Changed images make a pending status `promotion/screenshots`. The
  page offers the oldest unpromoted green-images candidate C and freezes it: newer candidates queue
  behind it, and the next is offered only once C is promoted or rejected, with decisions carried by
  image hash. Finish commits accept commit A on C and opens a pull request touching only
  `visual-baselines/` and `visual-review-approvals/`; its merge resumes C, which promotes if newer than
  `channel/nightly`. The resume runs the gate unchanged on C's own capture against A's baselines (byte
  copies, so `capture_sha == baseline_sha`). The gate and capture code come from master's tip at the
  run's start (code-owned paths), recorded in `channel.json`.
- **Parity is a bug class:** different bytes in two environments are filed and fixed, never absorbed;
  CI is the reference until local captures match it on two days.
- **Migration:** a spike measures byte parity on 50 graphty and graphty-element stories. Either
  parity holds, or each project gets one owner-reviewed re-baseline with no product change. Then per
  project both captures run in each full run and it switches after two clean runs.

## 6. Agent identity, review and the admin bypass

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) sections 2 to 4.

### 6.1 The agent account

A GitHub Team machine account (the owner creates it; suggested `graphty-agent`; a third seat), 2FA,
**Write** on graphty-monorepo only. `.claude/settings.json` sets `GH_CONFIG_DIR=~/.config/gh-agent`
and `GIT_CONFIG_GLOBAL=~/.config/git-agent/config` (name, noreply email, signing key, and
`url."git@github.com:".pushInsteadOf https://github.com/` with the agent's SSH key). servherd does not
inherit that file, so the `visual-review` and `pr-status-broker` servers get both variables in their
`servherd_start` env. `MASTER_GUARD_TOKEN` becomes an agent token. Agents never approve; they arm
auto-merge. The owner's own pipeline edits are made by an agent session and approved by him.

Agents run as the owner's Unix user: the split holds only once his `gh` token, his git credential
helpers and cache, and his GPG key are out of their reach (section 13 item 4).

### 6.2 CODEOWNERS

Owned are only the paths that can loosen a check or take authority: `/.github/workflows/`,
`/.github/CODEOWNERS`, `/.claude/`, `/CLAUDE.md`, `/ci-budgets.json`, `/release-hold.json`,
`/release-approvals.json`, `/nx.json`, `/vitest.shared.config.ts`, `/vitest.ci-junit.mjs`,
`**/.storybook/vitest.setup.*`, `/visual-review/trusted/`, `/visual-review/capture/`,
`/visual-review.config.json`, `/graphty/sites/nightly.json`, `/graphty/sites/production.json`, and in
`tools/` the results, cache, scheduler and channel directories, `bisect-core`, the release tools,
`ci-test-matrix`, `run-tests`, the selector and its rules, and the integrity, features, budgets,
`pr-open` and quick-check scripts. `visual-baselines/` is guarded by the signature (section 5). Of
the 117 golden landings of 2026-10-18 to 10-24, 27 touched this list, about 4 a day; the integrity
check adds an unknown number, replayed over the same landings before step 3. A code-owned pull
request that references an open red, release-held or red-master issue, or a rollout step's pull
request, gets its own `ACTION NEEDED` line when green; the rest go in one daily review list.

### 6.3 Rulesets and secrets

- Ruleset 23973898: bypass = deploy keys (a ruleset cannot single out one key, so every write deploy
  key bypasses; the scheduler Worker checks daily that the repository has exactly one, id 164375816,
  and files a `priority:critical` issue otherwise); code-owner review required with 0 approvals;
  stale reviews dismissed; last-push approval off. A pull request waiting for the owner is never
  merged with master unless it conflicts.
- Tag ruleset on `*@*` and `site-*`: created only by the deploy key, never updated or deleted.
- `channel/nightly` and `channel/production`: updated only by the deploy key, never deleted.
- Actions: default permissions read-only; Actions may not approve pull requests.
- **Outside-world secrets live in master-only environments**, job by job: release.yml `land`
  (`release`: `RELEASE_DEPLOY_KEY`), `publish` (`release`: npm OIDC, Pushover), `site` (`nightly`:
  `NIGHTLY_SITE_DEPLOY_KEY`; `GITHUB_TOKEN` for the release), `llm` (`full-run`: `GOOGLE_API_KEY`);
  promote.yml `promote` (`production`: `NPM_DIST_TAG_TOKEN`, `PRODUCTION_SITE_DEPLOY_KEY`) then
  `channel-ref` (`release`: `RELEASE_DEPLOY_KEY`); ci.yml `sentry-upload` (`master-build`:
  `SENTRY_AUTH_TOKEN`), cache writes (`nx-cache-write`); `dependabot-automerge.yml`
  (`dependabot-automerge`: `AGENT_AUTOMERGE_TOKEN`). Jobs that also run on pull requests declare
  their environment conditionally.

### 6.4 Rules with checks (`pr-integrity.yml`, check `PR Integrity`)

Triggers: `pull_request` (opened, synchronize, edited, reopened) and `pull_request_review`
(submitted, dismissed); never comment events, whose runs attach to master's head.

- **Test integrity** (`tools/check-test-integrity.mjs`): fails on a net drop, per file and
  rename-aware, in tests or assertions; a `.skip`, `.only` or `.todo` added; a timeout or retry
  grown; a coverage threshold dropped; a vitest config's include, exclude, timeout or retry
  loosened; any package.json `scripts` entry changed. A code-owner approval on the head clears it.
  Its false-positive rate is replayed over the 96 landings of 10-18 to 10-24 before step 3.
- **No unapproved breaking change:** fails when the title or any commit carries `!` or a
  `BREAKING CHANGE:` footer, unless a code owner approved the head. One that reaches master anyway is
  held by the dry run (section 3) until a `release-approvals.json` entry exists.
- **Baselines signed:** section 5.
- **Proof:** agent pull requests carry `## Proof` (command and output, the test that failed before
  the fix, or a capture).
- **Fresh review:** the review subagent's report, posted by `pr-open.sh` as a pull request review,
  marked with `git patch-id --stable` of `git diff origin/master...HEAD` with merge commits excluded.
  PR Integrity recomputes it, so a merge of master keeps the review and only a change to the branch's
  own diff (a conflict resolution included) needs a new one.
- **Exempt from Proof, fresh review and test integrity**, each checked mechanically: a pull request
  whose tree equals `git revert -m 1` of a named master first-parent merge; an accept-only pull request
  (its signature is checked instead). Dependabot is exempt from Proof and review only.
- Pipeline and CI-config changes go in their own pull request, never with a product fix.

## 7. CI time budgets

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) section 1.

- **Levels:** run, job, step, nx task (`NX_PROFILE`), and queue (job created to started), so an alarm
  tells queueing from slowness. Per-test slowness stays with `tools/vitest-time-budget.mjs`.
- **`ci-budgets.json`** (code-owned; a raise is a reviewed pull request with a new measurement). The
  budget is the warn line. Starting values (minutes), checked against the advisory replay before
  step 5: `run:ci.yml:pr` 20, `run:ci.yml:pr-wide` 35 (graphty-element `src/` or global inputs), one
  `run:ci.yml:pr-<package>` per package still on whole shards, `run:release.yml:full` 75,
  `run:release.yml:promote` 20, `run:ci.yml:full` 60, `run:gpu.yml` 60, `run:hosts.yml` 60,
  `job:ci.yml:Build` 6, `step:ci.yml:Build:Plan` 2, `job:release.yml:version-dry-run` 5,
  `job:release.yml:version` 5, `job:release.yml:publish` 8, `job:release.yml:site` 10,
  `task:graphty:build` 2 (uncached), `job:ci.yml:Test (*)` 15, `job:ci.yml:Stories (<project>)` per
  project from its measured capture time, `ttg:full` 180, `ttg:owner-wait` (recorded, no line);
  monthly `bytes:lfs` warn at 150 GiB of the 250 GiB allowance and `bytes:actions-cache` at 8 GB. A
  new job gets 1.5 times its median over its first 5 runs.
- **Every run warns, never fails.** A last `timings` job (`if: always()`) warns per key over budget,
  comments once on a pull request over 1.5 times master's median and 60 s slower on a key, and posts
  rows, cache hit rates, LFS bytes and the Actions cache size to the store (10 s, fail open).
- **Caches:** every cache key family has a size and a write rate (budgets section 1.8); master
  deletes superseded keys after saving, keeping one LFS key per project and one import-graph key
  (about 10 MB, keyed only by graph inputs).
- **Hang guards:** `timeout-minutes` = twice the budget (at least 10), checked by `lint`. A hung job
  is a defect, never re-run or raised.
- **One build for every event:** `lint` fails a build step whose env holds a secret or whose `if:`
  depends on event or ref, which is how the Sentry regression hid from pull requests.
- **Trend alarms:** the median of the last 5 runs over budget, or over 1.3 times the 10 before and
  60 s slower, per key and within run kind (pull request kinds included). The Worker computes it; the
  `timings` job that sees it files or updates one issue per key naming the merge range. The Sentry
  regression would have alarmed in about 5 hours.

## 8. Feature flags

Detail: [features.md](channels-pipeline/features.md).

- **Rules:** an experiment only adds (off = today's behavior); a change to existing behavior is an
  option with today's default, and changing a default is breaking. The element never reads the host
  page's URL, storage or environment. One build for every site. Removing a flag is an ordinary pull
  request.
- **graphty-element** (`src/features/`), all additive: attribute and property `features` (ids, or
  `all`), read-only `enabledFeatures`, event `graphty-features`, `createSession({ features })`,
  `featuresFromUrl(url)` in `./catalog`, `setDefaultFeatures(ids)` in `./extend`, descriptors
  `FEATURES` and `GRADUATED_FEATURES`, error `E_FEATURE_OFF { feature, key }`. Experimental catalog
  entries carry a `feature` field and are filtered per session. Unknown ids never throw.
- **No experimental public types until the owner decides** what `@experimental` promises (section 13
  item 1); `check-features.mjs` fails on any `@experimental` export.
- **The app** fetches `site.json` before loading the element (missing or invalid = every experiment
  off), adds `featuresFromUrl(location.href)` and sets the `features` attribute.
- **Two configurations.** On = `setDefaultFeatures(["all"])` in a setup file: affected files on a pull
  request, every shard in the full run, element stories compared against the Off baselines. Nightly
  needs both green. No On shard while `FEATURES` is empty.
- **Candidates:** `location-map`, `timeline`, `data-management`.

## 9. Owner decisions this design implements

Every binding decision of 2026-10-24 and 25 is implemented in sections 1 to 8 and 12. One meets
another: "LLM regression once per candidate" at up to 4 candidates a day is up to $113 a month
against the standing ceiling of about $60. The design runs it once per candidate whose ci.yml lane
is green, records the spend, and asks the owner which gives (section 13 item 2). Owner rules
throughout: no admin merge; nothing unapproved reaches production (step 3 freezes it first, assets
are hash-checked, first publishes need his go); holds, never exclusions; breaking changes and the
held grouped major need the owner; states end on events; nothing weakened to pass; flaky tests are
critical; graphty-element self-sufficient and neutral; only the owner approves screenshots, now by a
signature checked on every path.

## 10. What we learned and where it shows up

- Tier 3 took 60 hours and froze every other landing: no integration branch; small flagged pieces (2, 8)
- Six landing systems in five weeks: one rollout, a measured "done" per step, net deletion (12)
- The pipeline's own checks caused 32 of 35 gate failures: tool tests only when tools change; new checks replayed before they are required (2, 6.4)
- Screenshots were the only red job in 29 of 53 runs; 3 to 6 Finish rounds per cut: a changed image never fails a pull request; the offered candidate is frozen (5)
- Local and CI screenshots differed: CI is the reference; mismatches filed; parity and dev-versus-production mode measured first (5)
- Agents waited on gates (103 wakes a day): `pr-open.sh` returns at once; the quick check is opt-in (1.2)
- Gate settings leaked into its tests: clean CI environment; the quick check unsets a listed set (2)
- A Build regression went unnoticed four days: per-task budgets, trend alarms on every run kind, one build for every event (7)
- Golden sat nine hours on failures it already had; flaky tests blocked unrelated work: master evidence excuses; an unrelated flake passes loudly (4)
- Flaky tests blamed on the wrong landing; load read as failure: same commit and inputs, bisect under the full run's own load (3, 4)
- githerd's standing daemon added failure modes: the store decides nothing; master's workflows and the round act (4)
- graphty.app ran code no full run passed: one tarball and version set per promotion, frozen during the rollout (3, 12)
- Agents held the owner's authority: Write-only machine account, credential helpers removed, signed baselines, protected tags, master-only secrets (6)
- Agents raised timeouts and narrowed checks: test integrity, proof, fresh review (6.4)
- Fixes waited days for the owner: code-owned fixes for a red pipeline get their own `ACTION NEEDED` (6.2)

## 11. Costs

| Item                                | Amount                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent account                       | one more GitHub Team seat ($4 a month at today's list price)                                                                                   |
| Cloudflare                          | Workers Paid $5 a month (results); R2 for the nx cache, a few GB at $0.015 per GB-month, no egress                                             |
| T4 lane                             | 4 x 45 min = 3 h a day as a floor; with restarts and hotfix runs (8 of 17 verifications red) 5 h; bisects up to 4 h each, after the local card |
| LLM regression                      | about $0.94 a run, up to 4 a day ($113 a month at worst); bisects capped at the ceiling (section 9)                                            |
| GitHub-hosted Linux, macOS, Windows | free on this public repository; limited by concurrency (60 Linux, 5 macOS jobs; table in channels 5)                                           |
| Git LFS bandwidth                   | up to 880 MB per full run on a cache miss, 100 to 150 GB a month at worst, of 250 GiB; alarm at 150                                            |

## 12. Rollout and deletion

Detail: [migration.md](channels-pipeline/migration.md). Each step: starts after; done when. Each
step's code-owned edits go in one pull request per step, listed in migration section 3.

0. **Flush:** the last golden landing makes `deploy-pages.yml` stop deploying graphty.app; no new
   landings; verify the tip; `cut origin/golden-verified`; Finish; ship; #3318 releases. After: now.
   Done: golden is an ancestor of master; #3318 closed; each `latest` equals its newest tag.
1. **Owner setup** (section 13). After: parallel. Done: each item's check passes.
2. **Results store write-only;** durations recorded. After: parallel. Done: every job has a record
   for 3 days; none slowed over 5 s.
3. **Switch identity and freeze npm**, one owner-reviewed pull request and the owner's settings:
   release.yml publishes nothing except the owner-approved interim mode (section 13 item 11),
   CODEOWNERS, environments, the tag ruleset, the agent account, bypass removed, PR Integrity
   required after its replay. After: 0, 1. Done: graphty.app's stamp unchanged since step 0; on a scratch
   ruleset first: an owned-path pull request waits, an unowned one auto-merges, `--admin` is refused,
   a revert, an accept-only and a Dependabot pull request pass PR Integrity, a `!` title and an
   unsigned PNG fail it, an accept commit from the review server is authored by the agent.
4. **Selection readiness:** remaining packages join `fileLevel` or get slices; the advisory replay;
   the story parity spike. After: parallel. Done: light-check budgets set from the replay; the
   spike's outcome recorded.
5. **Pull requests into master:** light check, `pr-open.sh`, cache, Dependabot, store reads live,
   CLAUDE.md and skills rewritten, gate lanes stripped from `test-slots.mjs` and the sync merge from
   `branch-push.sh`. The old `visual` job is report-only until step 9. After: 3, 4. Done: of 20 pull
   requests, All Checks Pass median within budget, 18 untouched, master green after each, one
   Dependabot pull request auto-merged and built.
6. **Full run** with bisect and revert, publishing nothing; `hosts.yml` loses its cron. After: 5.
   Done: 8 slots green, or red with a culprit whose revert made the next green.
7. **Nightly and npm `next`:** the publish job declares `environment: release`, then the owner binds
   the trusted publishers and sets nightly.graphty.app on graphty-nightly. After: 6. Done: one
   automatic and one approved promotion served, tagged and hash-checked.
8. **Production:** `promote.yml`; graphty.app to graphty-site; canary.graphty.app. After: 7. Done:
   site check passes on all three; every dataset path answers 200; the overlay test passes; a dry run
   waited for the owner; `channel/production` moved.
9. **Stories as tests**, per project. After: 6. Done: two clean parity runs, then its old capture job goes.
10. **Deletion.** After: 5 to 8, 7 days without undo, #3318 closed. Done: lint, knip and a full run
    green; no reference outside `design/` (grep terms in migration section 3); tools and workflows
    show the net deletion of migration section 4.

**Deleted and kept:** migration sections 4 and 5 (golden's tools, branches, worktrees and workflows;
the ledger and quarantine files; about 11,000 lines, against about 6,000 added).

**Instructions** (owner-reviewed): migration section 6 marks every root CLAUDE.md section keep,
rewrite or delete, with its step, plus compact-mantine's and graph-samples' files. The pipeline-round
skill, rewritten in step 5, works in this order: red master build and its reverts; red full run
(GPU bisects on the local card when recorded, reverts, fix forward); flaky tests and base checks;
budget alarms; held release or failed publish; owner items once each, code-owned fixes for a red
pipeline at once, and one daily review list; red or conflicted agent pull requests (merge master,
never rebase); finished worktrees. It never mixes a test, budget, quarantine or workflow change with
a product fix, and never re-runs hoping for green.

## 13. What the owner does

In order; each ends with how to tell it worked.

1. **Decide what `@experimental` promises** (a published contract). The recommendation: tagged API
   may change or disappear in a minor release. Until you decide, experiments ship no public types.
   _Check:_ your answer on #3418.
2. **Decide the LLM spend:** once per candidate (up to $113 a month) against the $60 ceiling: raise
   the ceiling, or allow at least one run a day instead. Until you answer, it runs once per candidate.
   _Check:_ your answer on #3418.
3. **Flush:** Finish the cut's screenshots; the ship merges; #3318 releases. _Check:_ #3318 closed.
4. **Agent account and your own credentials.** Create the Team account (2FA, Write on
   graphty-monorepo); `GH_CONFIG_DIR=~/.config/gh-agent gh auth login` as it here; add the SSH push and
   signing keys the session generates. Then for yourself here: `gh auth logout`, `git
credential-cache exit`, remove both `credential.helper` lines from `~/.gitconfig` (or move them to
   a config only your shell loads), put your GPG key behind an uncached passphrase, and do approvals in
   the browser. _Check:_ `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login`; plain `gh auth
status` shows no login; `printf 'url=https://github.com\n\n' | GIT_TERMINAL_PROMPT=0 git
credential fill` prints no password.
5. **Cloudflare** (the scheduler's account): Workers Paid and R2; an API token with Workers Scripts, D1
   and R2 edit as `CLOUDFLARE_API_TOKEN` with `CLOUDFLARE_ACCOUNT_ID`; on the `graphty-release-scheduler`
   App add **Contents: read** and **Administration: read**, and put its second private key on the
   `graphty-results` Worker; `GRAPHTY_RESULTS_TOKEN` in `.env` and its hash on the Worker. _Check:_
   `/v1/health` answers.
6. **Environments and releases:** `release`, `nightly`, `full-run`, `master-build`, `nx-cache-write`,
   `dependabot-automerge` (master only) and `production` (master only, you as required reviewer,
   "prevent self-review" off); the session lists each one's secrets. Turn on immutable releases once
   the session reports that `gh release edit --prerelease`/`--latest` still work on one. _Check:_ a
   `promote.yml` dry run waits for you.
7. **Ruleset and settings** (step 3): review the CODEOWNERS pull request; on ruleset 23973898 remove
   the admin bypass, keep deploy keys, require code-owner review, leave last-push approval off, set the
   four checks; add the tag ruleset; switch off squash; Actions read-only and no Actions approvals.
   _Check:_ step 3's tests.
8. **Domain verification** of `graphty.app` for graphty-org (TXT
   `_github-pages-challenge-graphty-org.graphty.app`) and **DNS:** CNAME `canary` and `nightly` to
   `graphty-org.github.io`. _Check:_ "Verified"; `dig +short nightly.graphty.app`.
9. **Site repositories:** create public graphty-org/graphty-nightly; on it and graphty-site add the
   deploy keys the session generates and set Pages to GitHub Actions; at step 7 set the custom domain
   nightly.graphty.app on graphty-nightly and enforce HTTPS. _Check:_ the first nightly deploy.
10. **npm**, when the session says the publish job declares `environment: release` (not earlier): set
    environment `release` on each trusted publisher (workflow `release.yml`). For a new package, still
    only after its first publish fails: create its trusted publisher with environment `release`, never
    without one. Create a granular token with write on `@graphty` and "bypass 2FA", store it as
    `NPM_DIST_TAG_TOKEN` in `production`, and its expiry as the repository variable
    `NPM_DIST_TAG_TOKEN_EXPIRES`; the round reminds you 14 days before. _Check:_ the first `next`
    publish and a no-op `dist-tag add` succeed.
11. **Interim hotfix path** (steps 3 to 8): an urgent release is `release.yml -f mode=legacy`, whose
    publish and graphty.app deploy wait for your approval in `production`. _Check:_ none needed
    unless used.
12. **Domain swap** in one sitting when told: `graphty.app` from graphty-monorepo's Pages to
    graphty-site; `canary.graphty.app` on graphty-monorepo; enforce HTTPS once certificates exist.
    _Check:_ the site check passes.
13. **Review owner-owned pull requests:** a red pipeline's fix when its own line asks; the rest from
    the round's daily list. Add a `release-approvals.json` entry (by approving its pull request) for a
    major or a new package you want published.
14. **Approve changed screenshots** for the offered nightly candidate and **promote** whenever you
    judge nightly good.

ACTION NEEDED: on #3418, decide what @experimental promises and whether LLM runs per candidate ($113/mo) or daily

## Review notes

- The last problem of the review list arrived cut off ("stories-as-tests.md 7 step 7 (rejected
  images: 'the next full run is the next cand"). It is read as: after a rejection nothing names which
  candidate is offered next. With the frozen candidate (section 5), a rejected C is dropped and the
  oldest queued green candidate is offered, carrying decisions by hash, so an image already rejected
  stays rejected until a pull request changes it.
- Test integrity is replayed over past landings before it is required, rather than warning for a
  week first: the replay gives the false-positive rate without letting a week of real pull requests
  through unchecked.
- `base-check.yml` is kept, dispatched by the round instead of the Worker: dropping it would leave a
  pull request red, with no recourse, on a test master breaks between full runs.
