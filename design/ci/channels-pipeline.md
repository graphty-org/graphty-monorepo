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
- [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md): time budgets, agent account, bypass, agent rules, pipeline round
- [migration.md](channels-pipeline/migration.md): rollout steps in detail, deletions

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
2. **Review and quick check, locally (2 to 6 min).** A review subagent that has not seen the
   author's conversation reads the issue and `git diff origin/master...HEAD`; the author fixes what
   it finds. `tools/pr-open.sh` runs the quick check, merges `origin/master` if behind, pushes, opens
   the pull request as the agent account, posts the review, arms auto-merge and exits.
3. **Light check in CI (p50 10 to 22 min).** Format, lint, typecheck, affected build from a remote
   cache, affected test files, affected stories as screenshot tests, tool tests only when tools
   changed. A changed screenshot is reported, never a failure. Green merges into master.
4. **Canary.** The master push builds everything (about 8 min once the Sentry fix is in) and deploys
   canary.graphty.app.
5. **Full run, every 6 hours** on the commit canary serves: every shard in both feature-flag
   configurations, every story's screenshot, T4 GPU, Hosts, macOS work protection, the audit, LLM
   regression when AI code changed. Measured 65 to 93 min today; target 60 to 75 (section 3). Red:
   bisect master's merges with only the failing tests, revert by pull request, fix forward.
6. **Nightly.** Green with no changed screenshot: version, publish npm `next`, deploy
   nightly.graphty.app. Changed screenshots: wait for the owner's Finish, then the same, no re-test.
7. **Production.** The owner dispatches `promote.yml` and approves the `production` deployment:
   `latest` moves to the nightly's versions and graphty.app gets its tarball.

**Hotfix** (also every security fix): the fix merges as usual. If canary is red for another reason,
the pipeline round reverts that culprit first; the owner decides canary's pending screenshots, then
dispatches `release.yml -f mode=full` and promotes straight through (about 2 hours). A hotfix ships
everything canary holds, all of which passed that full run; there is no hotfix branch, so nx's tags
stay on master's history. **Rollback:** `promote.yml` with the previous nightly, refused across an
autosave format change (section 3).

### 1.3 What runs where

- **Agent's machine (`pr-open.sh`):** review subagent, quick check (2 to 6 min; CI decides)
- **`.husky/pre-push`:** LFS upload, secret scan, committed-images limit (seconds)
- **Pull request (`ci.yml`):** light check (p50 10 min for one package, 22 for global inputs)
- **Master push (`ci.yml`, `deploy-pages.yml`):** build, Storybooks, docs, canary deploy (about 8 min build)
- **Every 6 h (`release.yml`):** full run, verdict, nightly promotion (60 to 75 min target)
- **Red full run (`bisect.yml`):** confirm, then every bisect point at once (about 10 min a phase)
- **Owner trigger (`promote.yml`):** dist-tag move, production deploy (minutes)
- **Cloudflare:** results and durations (Worker + D1), build cache (R2), scheduler (calls under 5 s, fail open)

## 2. Merging

Detail: [merging.md](channels-pipeline/merging.md).

- **One path:** every branch, its own pull request, merge commits only (squash off), opened only
  when finished, never as a draft. A subagent opens its own pull request and stops.
- **Required checks:** `All Checks Pass`, `Lint PR Title`, `Link PR Issue`, `PR Integrity`
  (section 6.4). Not strict: nothing re-runs when master moves.
- **The light check:** a plan step (nx affected from the merge base, `tools/test-select.mjs` with
  its import graphs restored from a master-written cache, the story selector, the one store read of
  the run); Build with the cache; **Checks**: every step today's ci.yml Checks job runs (format, ESLint
  root config, knip and knip production, published dependencies, both bundle sizes, the API report,
  declared tools, the release-hold list, data sources on graph-io, the migration count script, legacy
  API use, committed images, the compact-mantine Figma lock), plus `nx affected -t lint typecheck`,
  offline links, the signing-bypass check moved out of `prepush-source-checks.sh`, `ci-budgets.mjs
lint` and `check-features.mjs`; **tool tests** (CI workflow tests, release dry run, the SonarQube
  gate script tests, `tools/*.test.mjs`) only when `.github/`, `tools/`, `nx.json` or a root config
  changed; each selected shard's files once without coverage; selected stories (no Storybook build);
  Docs when docs inputs changed. Coverage thresholds, the network link check,
  `graphty-element-lifecycle`, Cost Estimate Accuracy and whole-shard passes move to the full run.
- **Selection must exist before the switch:** file-level selection covers graph-format,
  remote-logger, compact-mantine, graphty and graphty-element today. Each other package joins
  `fileLevel` after a clean `tools/test-select-mutate.mjs` run, or its longest shard is sliced under
  8 min; until then its pull requests run whole shards under their own budget key (section 7).
- **Input fixes:** `.github/workflows/**` leaves `sharedGlobals`, and `^\.github/` and
  `^pnpm-lock\.yaml$` leave `everything.patterns` in `tools/test-select-rules.json` (a workflow or
  matrix change runs the tool tests plus one smoke shard of each kind);
  `projectsAffectedByDependencyUpdates: "auto"` replaces "the lockfile runs everything". Deliberate
  exception: a lockfile change that moves Playwright, Chromium, Storybook, Vitest or a font package
  runs every story.
- **Build cache:** nx's self-hosted remote cache on a Worker over R2 (`tools/nx-cache-worker/`,
  14-day lifecycle). Writes only from master (environment `nx-cache-write`). A 2-second probe; no
  answer means build without it. Each nightly's version merge changes every `package.json`, so for
  the roughly 10 minutes until that master build writes new entries, light checks miss the cache.
- **Sentry fix** (#3415, branch `perf/ci-build-sentry-after-build`) lands first: `graphty:build`
  13m33s to about 60 s.
- **Real GPU:** the quick check runs the local NVIDIA tests under `test-slots --gpu` when
  webgpu-graph-algorithms is affected (advisory). `hosts.yml` keeps its advisory pull request trigger.
- **Dependabot** targets master. `dependabot-automerge.yml` (`pull_request_target`, only
  `dependabot/fetch-metadata` and `gh pr merge --auto` with the agent's token) arms auto-merge; Link PR
  Issue and PR Integrity accept `dependabot[bot]` without an issue line, Proof or review; test
  integrity still applies. Its runs get no Actions secrets and no OIDC token: no cache, no store
  record (both fail open). Actions updates touch `.github/` and wait for the owner by design.
  Security advisories ship through the hotfix path.
- **No merge queue at first.** The bisect records skew breaks. Two in 7 days, or one that kept canary
  red over 6 hours: the pipeline round proposes Mergify (`merge_group` is the alternative).
- **Red master build:** `master-guard.yml` opens a revert pull request as the agent account.

## 3. Channels and promotion

Detail: [channels.md](channels-pipeline/channels.md).

- **One tarball.** `tools/assemble-pages-site.sh` assembles the site once per master build (about
  373 MB), uploaded as artifact `site-<sha>` (14 days). The full run and the bisect reuse each master
  build (ci.yml input `reuse_build_run`), so the full run tests the bytes canary serves.
- **Where built files live.** A promotion attaches the tarball and `channel.json` to a public
  prerelease `site-<sha>` in graphty-monorepo, then pushes a small `deployed.json` to the site
  repository with its deploy key; the site's `deploy.yml` downloads the asset, checks the sha256,
  writes `site.json` and deploys. `channel.json` lists the version of every released project at the
  version commit; `promote.yml` diffs that against npm's `latest`, so skipping nightlies moves every
  package that changed in between.
- **The full run** (`release.yml`, dispatched at 00, 06, 12, 18 UTC with `mode: full`) takes canary's
  commit and skips it when already judged, or when its diff from the last judged commit is only
  release-version merges (`tools/release-diff.mjs`). The version and major-bump dry run is its own job
  beside the lanes, not in `pick` (it took 29 min in run 40119894804); every project gets a starting
  tag so no history scan is unbounded. Lanes in parallel: ci.yml (test matrix `max-parallel: 40`, so
  about 20 of Team's 60 runners stay free for pull requests and bisects; On shards after Off ones),
  `gpu.yml`, `hosts.yml`, `work-protection-macos.yml`, the audit, and LLM regression only when the diff
  since the last LLM-green candidate touches graphty-element's AI code, prompts, schemas or the
  lockfile (the green commit it inherits is recorded; the store warns at $50 in a month). Performance
  Benchmarks becomes `needs: build`, outside the verdict, filing its own issue. A `verdict` job ends in
  `green-clean`, `green-images`, `red` or `owner-item`. A candidate whose dry run plans a major is an
  `owner-item` naming the merge that carried it (section 6.4).
- **Concurrency:** release.yml loses its `workflow_run` trigger. `release-router.yml` (no
  concurrency group) reads the store and the red issue and dispatches release.yml only when a restart
  or a resume is due. Every release.yml run first catches up: it resumes any approved awaiting
  candidate and runs the slot if canary's commit is unjudged, so a run the `release-train` group
  replaces loses nothing.
- **Red:** issue "Full run red: <lane> on <sha>" (`priority:critical`). The store dispatches
  `bisect.yml` once per full run (`workflow_dispatch`, concurrency `bisect-<sha>`); tests broken later
  are appended and picked up by its next phase. It confirms (5 runs), then runs every first-parent
  merge since the last green full run as one matrix, each point's 5 runs in parallel processes,
  reusing each merge's build, under `tools/bisect-core.mjs` (rules from `tools/verify.mjs`): a culprit
  only when its parent passes all 5 (20 for a newly intermittent test); flaky before the range is
  quarantined, never bisected. Failures that name no test bisect by their own job: coverage by the
  shard with coverage, links, cost, docs, build and budget lint by that job, evidence "judged by 1
  run"; `infra`, `owner-item` and a red last-green commit (environment) go to the round unbisected.
  GPU failures bisect first on the local NVIDIA card, run by the round when the bisect records it. The
  round opens the revert unless the store has one open for that culprit. A restart runs only on a
  merge referencing the red issue, failing tests first. Budget `ttg:full` (red verdict to green
  restart), starting at 3 hours.
- **Nightly promotion** reuses today's `version`, `land` (deploy key, version merge and tags,
  `channel/nightly`) and `publish` (`--tag next`, then `gh release edit --prerelease --latest=false`)
  jobs, then `site`. While a publish hold is open, slots still run; promoting a new version set waits
  for the hold to clear.
- **Production promotion** (`promote.yml`, environment `production`: the owner as required reviewer,
  "prevent self-review" off because the agent is no reviewer, master only) refuses a nightly that was
  not clean or approved, has a publish hold, misses a version on npm, or would roll back across an
  autosave or project format change; checks the token's scope and every package's dist-tags before
  moving any; moves `latest` with `NPM_DIST_TAG_TOKEN`; appends production's dataset overlay; deploys
  graphty-site with `graphty/sites/production.json` read from master's tip (its blob id in
  `channel.json`); clears the prerelease marks; fast-forwards `channel/production`. Idempotent. A
  `config_only` input redeploys the current tarball with a new `site.json`.
- **Autosave across sites:** each site is its own origin, so saved work and AI keys do not follow a
  reader between them; that is intended, and the app shows the site name from `site.json`. A change to
  the autosave or project format must stay readable by the previous production build, or refuse
  without touching the data; a full-run test opens a database the candidate wrote with production's
  build.
- **Links:** `https://graphty.app` links resolve against canary; `links-weekly.yml` reports a 404 on
  graphty.app for a path the newest nightly serves as "pending promotion", not dead.

## 4. Test results and durations in Cloudflare

Detail: [results-service.md](channels-pipeline/results-service.md).

- **What:** Worker `graphty-results` with D1 (`tools/results-service/`, client `tools/results/`),
  deployed by `results-service.yml` from master. Replaces the local ledger and the quarantine files.
- **One read per run:** the plan step reads the plan once (one retry with backoff on a full run) and
  hands it to every job as an artifact.
- **Writes:** every CI test job runs `node tools/results/run-group.mjs <shard>`: compute the inputs
  key, run, retry failed files once, post one record per test group as its last step (file rows in
  16-row statements, inside D1's 100-parameter limit). A Vitest reporter posts the first 20 failures
  as they happen, then one summary event.
- **Inputs key:** today's shard input key, the selected files, runner image, Node and browser
  versions, flag configuration, and for a story test its baseline blob.
- **Rules:** flaky = passed and failed on the same commit and inputs key, quarantined with a
  `priority:critical` issue, but on a pull request it fails the check (`[NEW-FLAKY]`) when the pull
  request changed the test's file or import closure or master has no earlier flaky evidence for it.
  Broken = failed run and retry: starts the bisect on a full run; fails a pull request unless master
  fails it the same way. Quarantine leaves on issue close, 20 passes or 14 days; never GPU tests or the
  screenshot gate. Full runs and bisects excuse nothing.
- **Evidence only from master's code:** kinds `full`, `bisect` and `base` are accepted only when the
  OIDC `ref` is `refs/heads/master` and `job_workflow_ref` names master's workflow file. A pull
  request's failure is excused only by such records; when none exists, the Worker dispatches
  `base-check.yml` on master for that file at the base, and re-runs the pull request's failed job if
  the base fails the same way. A pull request's own client can never excuse or quarantine.
- **Fail open:** 5 s for plan and record, 2 s for a failure event. No plan means no reuse, no
  quarantine, no excuse: longer and stricter, never looser. An unsent record is spooled and re-posted.
- **Credentials:** CI uses the job's OIDC token; local runs write only kind `local`. Issues and
  dispatches use the `graphty-release-scheduler` App, which gains Contents: read for the ancestry check.
- **Cost:** about 110,000 rows a day: Workers Paid ($5 a month).

## 5. Stories become tests

Detail: [stories-as-tests.md](channels-pipeline/stories-as-tests.md).

- **One render per story.** An `afterEach` in each project's `.storybook/vitest.setup.ts` shoots the
  story at the end of its test with today's capture settings and compares it with the baseline using
  unchanged `compare.mjs`. A page taller than 900 px is shot by resizing the outer page and the tester
  iframe, then clipping the page screenshot to the iframe. New entry point `@graphty/visual-review/vitest`.
- **Outcomes:** `unchanged` passes; `changed` and `new` pass and are written for review; `unstable`
  follows the flaky rule of section 4; a render error fails.
- **Selection:** a story file runs when its import closure holds a changed file; every story of a
  project runs when its global inputs change (`.storybook/`, vitest config,
  `visual-review.config.json`, fonts, capture code, the lockfile exception of section 2, the shared
  theme); graphty-element's `src/` counts as global for a dependent project only where the graph
  cannot follow the stories' imports; unknown means run. graph-io-fidelity's stories run in shards of
  at most 8 min. The LFS cache is one per project, keyed by its baselines tree, saved only from master
  and the full run; pull requests restore it and `git lfs pull --include` the selected files.
- **compact-mantine** is on Storybook 8.6 with one hand-written glob test, so the import graph selects
  all 1,004 stories for any compact-mantine change. Until it moves to Storybook 9 and `storybookTest`
  (a Figma-Approved change if any picture moves), every compact-mantine pull request pays its full
  story run (about 11 min).
- **Approval gates nightly.** Changed images make a pending status `promotion/screenshots`; the page
  offers the newest candidate C and carries decisions by image hash. Finish (the review server, as the
  agent account) commits accept commit A on C and opens a pull request touching only
  `visual-baselines/` and `visual-review-approvals/`; the signed approval is its proof (section 6.4).
  The resume step runs the gate unchanged, from `channel/nightly`, on C's own capture against A's
  baselines: A's PNGs are byte copies of C's captures, so they match by `capture_sha == baseline_sha`
  without re-rendering on master's newer code.
- **Parity is a bug class:** different bytes in two environments are filed and fixed, never absorbed;
  CI is the reference until local captures match it on two days.
- **Migration:** first a spike measures byte parity on 50 graphty and graphty-element stories. Either
  parity holds, or each project gets one owner-reviewed re-baseline with no product change, signed in
  one Finish. Then per project both captures run in each full run and it switches after two clean runs.

## 6. Agent identity, review and the admin bypass

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) sections 2 to 4.

### 6.1 The agent account

A GitHub Team machine account (the owner creates it; suggested `graphty-agent`; a third seat), 2FA,
**Write** on graphty-monorepo only. `.claude/settings.json` sets `GH_CONFIG_DIR=~/.config/gh-agent`
and `GIT_CONFIG_GLOBAL=~/.config/git-agent/config` (name, noreply email, SSH push and signing keys),
so every agent session, worktree, hook and the review server act as the agent. `MASTER_GUARD_TOKEN`
becomes an agent token. Agents never approve; they arm auto-merge. The owner's own pipeline edits
are made by an agent session and approved by him, since GitHub never counts an author's approval.

Agents run as the owner's Unix user: the split is enforced only once his `gh` token and GPG key are
out of their reach (section 13 item 3).

### 6.2 CODEOWNERS

Owned are only the paths that can loosen a check or take authority: `/.github/workflows/`,
`/.github/CODEOWNERS`, `/.claude/`, `/CLAUDE.md`, `/ci-budgets.json`, `/release-hold.json`, `/nx.json`,
`/vitest.shared.config.ts`, `/vitest.ci-junit.mjs`, `**/.storybook/vitest.setup.*`,
`/visual-review/trusted/`, `/visual-review/capture/`, `/visual-review.config.json`,
`/graphty/sites/nightly.json`, `/graphty/sites/production.json`, and in `tools/` the results, cache,
scheduler and channel directories, `bisect-core`, the release tools, `ci-test-matrix`, `run-tests`,
the selector and its rules, and the integrity, features, budgets, `pr-open` and quick-check scripts.
Package CLAUDE.md files, package vitest and Storybook configs and the rest of `tools/` are left to
the integrity check. Of the 117 golden landings of 2026-10-18 to 10-24, 27 touched this list (43
touched the longer first draft): about 4 owner reviews a day today, which the pipeline round batches
into one review list a day.

### 6.3 Rulesets and secrets

- Ruleset 23973898: bypass = the release deploy key only; code-owner review required with 0
  approvals; stale reviews dismissed; last-push approval off (with 0 approvals its effect is
  unverified, and dismissal already stops an approval surviving a push). A pull request waiting for
  the owner is never merged with master unless it conflicts, because the push would dismiss him.
- Tag ruleset on `*@*` and `site-*`: created only by the deploy key, never updated or deleted; the
  release jobs push tags with it and create releases on existing tags.
- `channel/nightly` and `channel/production`: updated only by the deploy key, never deleted.
- Actions: default permissions read-only; Actions may not approve pull requests.
- **Outside-world secrets live in master-only environments**: `release` (deploy key, Pushover, npm
  publish), `nightly` (nightly site key), `production` (owner reviews: graphty-site key,
  `NPM_DIST_TAG_TOKEN`), `full-run` (`GOOGLE_API_KEY`), `master-build` (`SENTRY_AUTH_TOKEN`, declared
  by the master-push upload job), `nx-cache-write`. ci.yml jobs that also run on pull requests
  declare them conditionally (`environment: ${{ github.event_name == 'pull_request' && '' || 'full-run' }}`).

### 6.4 Rules with checks (`pr-integrity.yml`, check `PR Integrity`)

- **Test integrity** (`tools/check-test-integrity.mjs`): fails when a test file, declaration or
  assertion disappears, a `.skip`, `.only` or `.todo` appears, a timeout or retry grows, a coverage
  threshold drops, a vitest config's include, exclude, timeout or retry loosens, or any package.json
  `scripts` entry changes. A code-owner approval on the head commit clears it.
- **No unapproved breaking change:** fails when the title or any commit carries `!` or a
  `BREAKING CHANGE:` footer, unless a code owner approved the head commit. One that reaches master
  anyway (a commit message edited after review) is caught by the full run's dry run: an `owner-item`
  naming the merge, recovered with a `release-hold.json` entry or a version plan, as for
  graphty-element 3.1.0, never by waiting.
- **Proof:** agent pull requests carry `## Proof` (command and output, the test that failed before
  the fix, or a capture).
- **Fresh review:** the review subagent's report, posted by `pr-open.sh`, marked with the head commit.
- **Exempt from Proof, fresh review and test integrity**, each checked mechanically: a pull request
  whose tree equals `git revert -m 1` of a named master first-parent merge (master-guard's reverts
  carry a Proof naming the red run); one touching only `visual-baselines/` and
  `visual-review-approvals/` (the passkey-signed gate judges it). Dependabot is exempt from Proof and
  review only.
- It re-runs on review and comment events without re-running ci.yml. Pipeline and CI-config changes
  go in their own pull request, never with a product fix.

## 7. CI time budgets

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) section 1.

- **Levels:** run, job, step, nx task (`NX_PROFILE`), and queue (job created to started), so an alarm
  tells queueing from slowness. Per-test slowness stays with `tools/vitest-time-budget.mjs`.
- **`ci-budgets.json`** (code-owned; a raise is a reviewed pull request with a new measurement). The
  budget is the warn line. Starting values (minutes): `run:ci.yml:pr` 20, `run:ci.yml:pr-global` 30,
  one `run:ci.yml:pr-<package>` per package still on whole shards (from its measured whole-shard
  time), `run:release.yml:full` 75, `run:ci.yml:full` 60, `run:gpu.yml` 60, `run:hosts.yml` 60,
  `job:ci.yml:Build` 6, `step:ci.yml:Build:Plan` 2, `step:release.yml:version-dry-run` 5,
  `task:graphty:build` 2, `job:ci.yml:Test (*)` 15, `job:ci.yml:Stories (*)` 10, `ttg:full` 180. A new
  job gets 1.5 times its median over its first 5 runs.
- **Every run warns, never fails.** A last `timings` job (`if: always()`) reads jobs and steps and
  the nx profiles, warns per key over budget, comments once on a pull request over 1.5 times master's
  median and 60 s slower on a key, and posts rows, Git LFS bytes and the Actions cache size to the
  store (10 s, fail open).
- **Hang guards:** `timeout-minutes` = twice the budget (at least 10), checked by `lint`. A hung job
  is a defect, never re-run or raised.
- **One build for every event:** `lint` fails a build step whose env holds a secret or whose `if:`
  depends on event or ref, which is how the Sentry regression hid from pull requests.
- **Trend alarms** (the Worker): the median of the last 5 runs over budget, or over 1.3 times the 10
  before and 60 s slower. One issue per key naming the merge range; closes when the median recovers.
  The Sentry regression would have alarmed in about 5 hours.

## 8. Feature flags

Detail: [features.md](channels-pipeline/features.md).

- **Rules:** an experiment only adds (off = today's behavior); a change to existing behavior is an
  option with today's default, and changing a default is breaking. The element never reads the host
  page's URL, storage or environment; no `GRAPHTY_FEATURES` exists anywhere. One build for every
  site. Removing a flag is an ordinary pull request.
- **graphty-element** (`src/features/`), all additive: attribute and property `features` (ids, or
  `all`), read-only `enabledFeatures`, event `graphty-features`, `createSession({ features })`,
  `featuresFromUrl(url)` in `./catalog`, `setDefaultFeatures(ids)` in `./extend`, descriptors
  `FEATURES` and `GRADUATED_FEATURES`, error `E_FEATURE_OFF { feature, key }`. Experimental catalog
  entries are always registered with a `feature` field and filtered per session. Saved projects
  record `requires`. Unknown ids never throw.
- **No experimental public types until the owner decides** what `@experimental` promises (section 13
  item 1): experiments are reached only through catalog keys and attributes gated at run time, and
  `check-features.mjs` fails on any `@experimental` export. A piece that needs typed API (the
  timeline's commands) waits for the answer.
- **The app** fetches `site.json` (`cache: "no-cache"`) before loading the element (missing or
  invalid = every experiment off), adds `featuresFromUrl(location.href)` and sets the `features`
  attribute. Sources: `graphty/sites/{canary,nightly,production}.json`.
- **Two configurations.** On = `setDefaultFeatures(["all"])` in a setup file for graphty-element's and
  graphty's projects: affected files on a pull request, every shard in the full run, element stories
  compared against the Off baselines. Nightly needs both green. No On shard while `FEATURES` is empty.
- **Candidates:** `location-map`, `timeline`, `data-management`. Each starts with a pull request that
  declares the flag and gates and no behavior; the Stories job fails it on any changed existing story.

## 9. Owner decisions this design implements

Binding decisions of 2026-10-24 and 25: three channels and domains (1, 3); no golden, per-branch pull
requests with auto-merge, Mergify only on evidence (2); the 6-hour full run, bisect and revert,
automatic clean promotion, screenshot approval gating nightly, `next` at nightly (3, 5); production
by the owner's judgment, same versions and build (3); the hotfix path (1.2); flush through #3318,
then delete golden's machinery (12); results in a Worker and D1, fail open, evidence only (4);
stories as tests (5); feature flags with per-site runtime configuration (8); time budgets with trend
alarms (7); no admin bypass, a machine account, code-owned pipeline (6); the pipeline-round skill and
every CLAUDE.md updated (12). Owner rules applied throughout: no admin merge; nothing unapproved
reaches production (12 step 3 freezes it first); holds, never exclusions; breaking changes and the
held grouped major need the owner (6.4); states end on events; nothing weakened to pass; flaky tests
are critical; graphty-element self-sufficient and neutral; only the owner approves screenshots.

## 10. What we learned and where it shows up

- Tier 3 took about 60 hours and froze every other landing: No integration branch or landing lock; big work lands in small flagged pieces (2, 8)
- Six landing systems in five weeks: One ordered rollout with a measured "done" per step; pipeline paths code-owned from before the switch (6.2, 12)
- The pipeline's own checks caused most gate failures (32 of 35 on 10-24): Tool tests only when tools change; the gate tooling is deleted (2, 12)
- Screenshots were the only red job in 29 of 53 runs; 3 to 6 Finish rounds per cut: A changed image never fails a pull request; one approval per nightly, decisions carried by hash (5)
- Local and CI screenshots differed and were worked around: CI is the reference; each mismatch filed; parity measured before the migration (4, 5)
- Agents waited on gates inside turns (103 wakes in a day): `pr-open.sh` arms auto-merge and exits; the round reacts to recorded events (2, 12)
- Gate settings leaked into its own tests: Clean CI environment; the quick check strips `GRAPHTY_*` and `PREPUSH_*`; no feature state from the environment (2, 8)
- A Build regression went unnoticed for four days: Per-task budgets, a pull request warning, trend alarms; one build for every event (7)
- Golden sat nine hours on failures it already had: A failing pull request is excused by master's own evidence, loudly (4)
- Flaky tests were blamed on the wrong landing; killed runners read as failures: Flaky only by same commit and inputs; culprit only when its parent passes; `infra` never counts (3, 4)
- 78% of flaky tests are flaky when written: `[NEW-FLAKY]` fails the pull request that wrote or touched one (4)
- Tier 3's retries tested new code each time (49.6 hours): A restart runs failing tests first, only on a merge referencing the red issue (3)
- graphty.app ran code no full run had passed: graphty.app and `latest` move together, by promoting the same tarball and versions a nightly passed, and are frozen during the rollout (3, 12)
- 12 empty release attempts; one red lane stopped releases for days; a lost pending run went unnoticed: Judged commits are skipped; every release run catches up; the switch does not wait on the held release (3, 12)
- Agents held the owner's authority; "no admin merge" was a rule, not a control: Write-only machine account, no bypass, code-owned pipeline, protected tags, master-only secrets (6)
- Agents raised timeouts and narrowed checks to go green: Test integrity, proof of work, fresh-context review, a breaking-change guard (6.4)

## 11. Costs

| Item                                | Amount                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Agent account                       | one more GitHub Team seat ($4 a month at today's list price)                                       |
| Cloudflare                          | Workers Paid $5 a month (results); R2 for the nx cache, a few GB at $0.015 per GB-month, no egress |
| T4 lane                             | about 4 x 45 min = 3 machine.dev T4 hours a day, plus GPU bisects the local card cannot reproduce  |
| LLM regression                      | about $0.94 a run, only when AI code changed; the store warns at $50 a month (ceiling about $60)   |
| GitHub-hosted Linux, macOS, Windows | free on this public repository; limited by concurrency (60 Linux, 5 macOS jobs), not money         |
| Git LFS bandwidth                   | up to 880 MB per full run on a cache miss; recorded per run (section 7)                            |

The T4 rate is the owner's machine.dev bill; this repository does not record it.

## 12. Rollout and deletion

Detail: [migration.md](channels-pipeline/migration.md). Each step: starts after; done when.

0. **Flush:** no new landings; verify the tip; `cut origin/golden-verified`; Finish; ship; #3318 releases. After: now. Done: golden is an ancestor of master; #3318 closed; each `latest` equals its newest tag.
1. **Owner setup** (section 13). After: parallel. Done: each item's check passes.
2. **Results store write-only;** durations recorded. After: parallel. Done: every job has a record for 3 days; none slowed over 5 s.
3. **Freeze production and switch identity**, one owner-reviewed pull request and the owner's settings: `deploy-pages.yml` stops deploying graphty.app, release.yml publishes nothing (shadow), CODEOWNERS, environments, the tag ruleset, the agent account in `.claude/settings.json`, admin bypass removed, PR Integrity required. After: 0, 1. Done: graphty.app's build stamp is the commit #3318 released; on a scratch ruleset first, then the real one: an owned-path pull request waits, an unowned one auto-merges, `--admin` is refused, a mechanical revert, an accept-only and a Dependabot pull request each pass PR Integrity, and a `!` title fails it.
4. **Selection readiness:** the remaining packages join `fileLevel` or get slices; the story parity spike. After: parallel. Done: every package's light-check shards are under 8 min or budgeted; the spike's outcome recorded.
5. **Pull requests into master:** light check, `pr-open.sh`, cache, Dependabot, store reads live, CLAUDE.md "Shipping a change", skills rewritten. The old `visual` job runs report-only, outside All Checks Pass, until step 9. After: 3, 4. Done: of 20 pull requests: All Checks Pass median under 20 min, 18 untouched, master green after each.
6. **Full run** with bisect and revert, publishing nothing. After: 5. Done: 8 slots green, or red with a culprit whose revert made the next green.
7. **Nightly and npm `next`:** the publish job declares `environment: release` first, then the owner binds the trusted publishers. After: 6. Done: one automatic and one approved promotion served and tagged.
8. **Production:** `promote.yml`; graphty.app to graphty-site; canary.graphty.app. After: 7. Done: site check passes on all three; every dataset path answers 200; a dry run waited for the owner.
9. **Stories as tests**, per project. After: 6. Done: two clean parity runs, then its old capture job goes.
10. **Deletion.** After: 5 to 8, 7 days without undo, #3318 closed. Done: lint, knip and a full run green; no reference outside `design/`.

**Deleted** (step 10 unless noted): `tools/land.mjs` and its live copy; `tools/verify.mjs` (rules to
`bisect-core.mjs`); `branch-sync.mjs`; `push-queue.sh`, `queued-push-guard.mjs`, `prepush.sh`,
`prepush-source-checks.sh` (after each of its checks is in ci.yml), `prepush-tests.mjs`, the gate parts
of `prepush-inputs.mjs` (the shard key moves to `tools/results/inputs.mjs`), `shard-verdict.mjs`,
`gate-snapshot.sh`, `push-base.mjs`, `wait-log.mjs`, `ship-risks.mjs` (about 11,000 lines);
`golden-verify.yml`, `visual-seed.yml`, release.yml's `workflow_run` trigger and skip-while-held; in
ci.yml the Mergify handling, draft jobs, the `golden-cut` exception, the `verify` input, the old
"Reuse" step, and (step 9) the `visual` job, the gate step and `tools/visual-capture-plan.mjs`;
`tools/visual-preview.sh`; the test ledger, `test-quarantine.json` and its local state, `TEST_LEDGER_*`,
the Mergify Test Insights upload; branches `golden`, `golden-cut`, `golden-verified`,
`golden-candidate`, `golden-cut-candidate`, `golden-bisect-1`, `golden-bisect-2`, tag `golden-good`;
worktrees `gate-live`, `land-live`, `golden-local`, `land-check-*`, `golden-bisect-*`, the githerd
worktrees and server (source stays); `live-tools.json` entries `gate` and `land`; `tmp/golden/`,
`tmp/push-gate-logs/`, `tmp/prepush-passes/`, `tmp/test-ledger/`, `tmp/test-quarantine/`; branches
`ci/3267-site-flip`, `ci/3267-beta-site` and pull request #1942 as superseded; CLAUDE.md's landing,
verification and gate sections, and golden references in package CLAUDE.md files.

**Kept:** `worktree-new.sh` (from master), `branch-push.sh`, `branch-note.mjs`, `no-copy.sh`, the
selector with its rules and mutation check, `test-changed.mjs`, `ci-test-matrix.mjs`, `run-tests.sh`,
`test-slots.mjs`, `with-browser.sh`, `low-priority.sh`, `sonar-gate.mjs`, `sonar-baseline.mjs`,
`pr-status-broker.mjs`, `worktree-cleanup.mjs`, `master-guard.yml`, `pr-title.yml`,
`pr-issue-link.yml`, the release tools and holds, `release-watch.yml`, `gpu-rerun-on-runner-loss.yml`,
the scheduler, visual-review's page, Finish, passkeys and gate.

**Instructions** (owner-reviewed): root CLAUDE.md's landing sections become "Shipping a change" (at
most 600 words, including that the owner's own pipeline edits go through an agent pull request) in
step 5. The pipeline-round skill, rewritten in step 5, works in this order: red master build and its
reverts; red full run (GPU bisects on the local card when recorded, reverts, fix forward); flaky
tests; budget alarms; held release or failed publish; owner items once each, and one daily list of
pull requests waiting for his review; red or conflicted agent pull requests (merge master, never
rebase); finished worktrees. It never starts a bisect the store already dispatched, never mixes a
test, budget, quarantine or workflow change with a product fix, and never re-runs hoping for green.
issue-round and design-studio end with `pr-open.sh`. Memory entries about golden, freezes and the
push queue are marked superseded.

## 13. What the owner does

In order; each ends with how to tell it worked.

1. **Decide what `@experimental` promises** (a published contract). The recommendation: tagged API
   may change or disappear in a minor release, as the docs will say. Until you decide, experiments
   ship no public types. _Check:_ your answer on #3418.
2. **Flush:** Finish the cut's screenshots; the ship merges; #3318 releases (its T4 nx-graph failure
   and advisories #3393 are fixed on golden first). _Check:_ #3318 closed.
3. **Agent account and your own credentials.** Create the Team account (2FA, Write on
   graphty-monorepo); `GH_CONFIG_DIR=~/.config/gh-agent gh auth login` as it here; add the SSH push and
   signing keys the session generates. Then `gh auth logout` for yourself here, put your GPG key behind
   an uncached passphrase, and do approvals and settings in the browser. _Check:_
   `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login`; plain `gh auth status` shows no login.
4. **Cloudflare** (the scheduler's account): Workers Paid and R2; an API token with Workers Scripts, D1
   and R2 edit as `CLOUDFLARE_API_TOKEN` with `CLOUDFLARE_ACCOUNT_ID`; on the `graphty-release-scheduler`
   App add **Contents: read**, and put its second private key on the `graphty-results` Worker;
   `GRAPHTY_RESULTS_TOKEN` in `.env` and its hash on the Worker. _Check:_ `/v1/health` answers.
5. **Environments:** `release`, `nightly`, `full-run`, `master-build`, `nx-cache-write` (master only)
   and `production` (master only, you as required reviewer, "prevent self-review" off); the session
   lists the secrets for each. _Check:_ a `promote.yml` dry run waits for you.
6. **Ruleset and settings** (step 3): review the CODEOWNERS pull request; on ruleset 23973898 remove
   the admin bypass, keep the deploy key, require code-owner review, leave last-push approval off, set
   the four checks; add the tag ruleset; switch off squash; Actions permissions read-only and no Actions
   approvals. _Check:_ step 3's tests.
7. **Domain verification** of `graphty.app` for graphty-org (TXT
   `_github-pages-challenge-graphty-org.graphty.app`) and **DNS:** CNAME `canary` and `nightly` to
   `graphty-org.github.io`. _Check:_ "Verified"; `dig +short canary.graphty.app`.
8. **Site repositories:** create public graphty-org/graphty-nightly; on it and graphty-site add the
   deploy keys the session generates and set Pages to GitHub Actions. _Check:_ the first nightly deploy.
9. **npm**, when the session says the publish job declares `environment: release` (not earlier): set
   environment `release` on each trusted publisher (workflow `release.yml` unchanged). Create a
   granular token with write on `@graphty` and "bypass 2FA", leave each package's publishing access
   at allowing tokens, store it as `NPM_DIST_TAG_TOKEN` in `production`, and its expiry date as the
   repository variable `NPM_DIST_TAG_TOKEN_EXPIRES`; the round reminds you 14 days before. _Check:_ the
   first `next` publish and a no-op `dist-tag add` succeed.
10. **Domain swap** in one sitting when told: `graphty.app` from graphty-monorepo's Pages to
    graphty-site; `canary.graphty.app` on graphty-monorepo, `nightly.graphty.app` on graphty-nightly;
    enforce HTTPS once certificates exist. _Check:_ the site check passes.
11. **Review owner-owned pull requests** from the round's daily list, including the one moving the
    gate step from ci.yml to the promotion.
12. **Approve changed screenshots** for nightly candidates and **promote** whenever you judge nightly
    good.

ACTION NEEDED: decide what @experimental promises (recommended: may change in a minor release) on #3418

## Review notes

- The last problem of the review list arrived cut off ("stories-as-tests.md 3 table ('unstable ...
  Fails'), 4 (unstable"). It is read as: an `unstable` story fails every pull request whatever its
  cause. Section 5 now applies the flaky rule of section 4 to `unstable`, so an image made unstable by
  the pull request fails it as `[NEW-FLAKY]` and one already unstable on master is quarantined.
- Two reviewers disagreed on the bypass removal: one wanted it before the switch, one after the
  flush. Step 3 satisfies both: it starts after the flush ships and before any per-branch pull request.
- "Runners are free on this public repository" in two problems is kept: graphty-monorepo is public,
  so the bisect matrix and the On shards cost concurrency, not money (section 11).
