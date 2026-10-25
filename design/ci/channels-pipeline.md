# The channels pipeline: canary, nightly, production

Status: design, 2026-10-24. Issue #3418. Replaces the golden-local pipeline
(`design/ci/golden-local.md`, `design/ci/fast-pipeline.md`). Each area's detailed design is an
appendix in `design/ci/channels-pipeline/`; where an appendix disagrees with this document, this
document wins (section 11 lists each disagreement and how it was settled).

- [channels.md](channels-pipeline/channels.md): sites, full run, bisect, promotion, rollback
- [merging.md](channels-pipeline/merging.md): pull requests, light check, build cache, quick check, merge queue
- [results-service.md](channels-pipeline/results-service.md): the Cloudflare test results store
- [stories-as-tests.md](channels-pipeline/stories-as-tests.md): screenshots inside each story's test
- [features.md](channels-pipeline/features.md): feature flags
- [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md): time budgets, agent account, bypass, agent rules, pipeline round
- [migration.md](channels-pipeline/migration.md): rollout, deletions, owner actions

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
   it finds. `tools/pr-open.sh` runs the quick check (format, lint and typecheck of affected
   packages, affected tests, SonarQube on changed lines), merges `origin/master` if behind, pushes,
   opens the pull request as the agent account, posts the review, arms auto-merge and exits.
3. **Light check in CI (p50 10 to 22 min).** Format, lint, typecheck, affected build from a remote
   cache, affected test files, affected stories as screenshot tests, tool tests only when tools
   changed. A changed screenshot is reported, never a failure. Green merges into master.
4. **Canary.** The master push builds everything (about 8 min once the Sentry fix is in) and deploys
   canary.graphty.app.
5. **Full run, every 6 hours (about 50 min)** on the commit canary serves: every shard in both
   feature-flag configurations, every story's screenshot, T4 GPU, Hosts, macOS work protection, the
   audit, LLM regression. Red: bisect master's merges with only the failing tests, revert by pull
   request, fix forward.
6. **Nightly.** Green with no changed screenshot: version, publish npm `next`, deploy
   nightly.graphty.app. Changed screenshots: wait for the owner's Finish, then the same, no re-test.
7. **Production.** The owner dispatches `promote.yml` and approves the `production` deployment:
   `latest` moves to the nightly's versions and graphty.app gets its tarball.

**Hotfix:** merge as usual; the owner dispatches `release.yml` with `mode=full` and promotes straight
through (about 1.5 hours). **Rollback:** `promote.yml` with the previous nightly.

### 1.3 What runs where

- **Agent's machine (`pr-open.sh`):** review subagent, quick check (2 to 6 min; CI decides)
- **`.husky/pre-push`:** LFS upload, secret scan, committed-images limit (seconds)
- **Pull request (`ci.yml`):** light check (p50 10 min for one package, 22 for global inputs)
- **Master push (`ci.yml`, `deploy-pages.yml`):** build, Storybooks, docs, canary deploy (about 8 min build)
- **Every 6 h (`release.yml`):** full run, verdict, nightly promotion (about 50 min)
- **Red full run (`bisect.yml`):** confirm and bisect the failing tests (minutes per point)
- **Owner trigger (`promote.yml`):** dist-tag move, production deploy (minutes)
- **Cloudflare:** results and durations (Worker + D1), build cache (R2), scheduler (calls under 5 s, fail open)

## 2. Merging

Detail: [merging.md](channels-pipeline/merging.md).

- **One path:** every branch, its own pull request, merge commits only (squash off), opened only
  when finished, never as a draft. A subagent opens its own pull request and stops.
- **Required checks:** `All Checks Pass`, `Lint PR Title`, `Link PR Issue`, `PR Integrity`
  (section 6.4). Not strict: nothing re-runs when master moves.
- **The light check:** a plan step (nx affected from the merge base, `tools/test-select.mjs`, the
  story selector, one store read); Build with the cache; Checks (prettier on changed files, `nx
affected -t lint typecheck`, the API report, offline links, the committed-image, data-source and
  legacy checks, knip, `ci-budgets.mjs lint`, `check-features.mjs`); tool tests only when
  `.github/`, `tools/`, `nx.json` or a root config changed; each selected shard's files once without
  coverage; selected stories; Docs when docs inputs changed. Coverage thresholds, the network link
  check, `graphty-element-lifecycle` and whole-shard passes move to the full run.
- **Two input fixes:** `.github/workflows/**` leaves `sharedGlobals`, and
  `projectsAffectedByDependencyUpdates: "auto"` replaces "the lockfile runs everything".
- **Build cache:** nx's self-hosted remote cache on a Worker over R2 (`tools/nx-cache-worker/`,
  14-day lifecycle). Writes only from master (environment `nx-cache-write`), so a branch cannot plant
  an artifact master trusts. A 2-second probe; no answer means build without it.
- **Sentry fix** (#3415, branch `perf/ci-build-sentry-after-build`) lands first: `graphty:build`
  13m33s to about 60 s.
- **No merge queue at first.** The bisect records skew breaks (a culprit whose check passed while
  master gained an overlapping merge). Two in 7 days, or one that kept canary red over 6 hours: the
  pipeline round proposes Mergify (light check per batch; `merge_group` is the alternative).
- **Red master build:** `master-guard.yml` opens a revert pull request as the agent account.
- **API budget:** the agent's own account; status from `tools/pr-status-broker.mjs`; no wait loops.

## 3. Channels and promotion

Detail: [channels.md](channels-pipeline/channels.md).

- **One tarball.** `tools/assemble-pages-site.sh` assembles the site once per master build (app,
  docs, seven Storybooks, demos, `/data/graph-samples/v1/`, a build stamp; about 373 MB), uploaded
  as artifact `site-<sha>` (14 days). Master push builds are also kept 14 days; the full run and the
  bisect reuse them (ci.yml input `reuse_build_run`), so the full run tests the bytes canary serves.
- **Where built files live.** Not in git (373 MB four times a day). A promotion attaches the tarball
  and `channel.json` (versions, full-run id, screenshot state, sha256, approver) to a public
  prerelease `site-<sha>` in graphty-monorepo, then pushes a small `deployed.json` to the site
  repository with its deploy key; the site's `deploy.yml` downloads the asset, checks the sha256,
  writes `site.json` (section 8) and deploys. Production assets are kept; other nightlies are pruned
  to the newest 40.
- **The full run** (`release.yml`, dispatched by the existing Cloudflare scheduler at 00, 06, 12, 18
  UTC with `mode: full`) takes canary's commit, skips one the store says was already judged, and runs
  in parallel ci.yml (every shard, the full capture), `gpu.yml`, `hosts.yml`,
  `work-protection-macos.yml`, the audit and LLM regression (once per candidate; re-run on a restart
  only if it failed or AI code or the lockfile changed; inside the $60 a month ceiling). A `verdict`
  job ends in `green-clean`, `green-images`, `red` or `owner-item` (no code fixes it: a lost T4 spot
  runner, an unpatched advisory, a refused API key). A planned major bump waits like `green-images`.
- **Red:** issue "Full run red: <lane> on <sha>" (`priority:critical`: canary is master). The store
  dispatches `bisect.yml` as soon as a test failed its run and its retry. It confirms (5 runs), then
  bisects first-parent merges since the last green full run, reusing each merge's build, with the
  rules moved from `tools/verify.mjs` into `tools/bisect-core.mjs`: a culprit only when its parent
  passes all 5; a test flaky before the range is quarantined, never bisected; a newly intermittent
  one is bisected with "fails 1 of 5" as bad. GPU failures bisect first on the local NVIDIA card. The
  round opens the revert. A restart runs only on a merge referencing the red issue, failing tests
  first; other merges wait for the next slot.
- **Nightly promotion** reuses today's `version` (with `release-hold.mjs apply`), `land` (deploy
  key, atomic version merge and tags, fast-forward of `channel/nightly`) and `publish` (`--tag next`,
  trusted publishing) jobs, then `site`. A publish failure after the push is today's publish hold.
- **Production promotion** (`promote.yml`, environment `production`: the owner as reviewer,
  self-review prevented, master only) refuses a nightly that was not clean or approved, has a
  publish hold, or misses a version on npm; moves `latest` per package with `NPM_DIST_TAG_TOKEN`;
  appends production's dataset overlay (append-only: changed bytes at an existing path fail); deploys
  graphty-site; finalizes the GitHub releases; fast-forwards `channel/production`. Idempotent. A
  `config_only` input redeploys the current tarball with a new `site.json`.

## 4. Test results and durations in Cloudflare

Detail: [results-service.md](channels-pipeline/results-service.md).

- **What:** Worker `graphty-results` with D1 (`tools/results-service/`, client `tools/results/`),
  deployed by `results-service.yml` from master. Replaces the local ledger and the quarantine files.
- **Writes:** every CI test job runs `node tools/results/run-group.mjs <shard>`: compute the inputs
  key, read the plan once, run, retry failed files once, post one record per test group as its last
  step (file counts and milliseconds, failures). A Vitest reporter posts each failure as it happens,
  so a dead job keeps its evidence and the bisect starts early.
- **Inputs key:** today's shard input key, the selected files, runner image, Node and browser
  versions, flag configuration, and for a story test its baseline blob. A new picture or a new runner
  image starts a new history instead of looking flaky.
- **Rules:** flaky = passed and failed on the same commit and inputs key, quarantined at once with a
  `priority:critical` issue. Broken = failed run and retry: dispatches the bisect on a full run;
  fails a pull request unless master fails it the same way (the file is re-run at the base commit;
  `[KNOWN]` and a "Failing on master" issue). Quarantine leaves on issue close, 20 passes or 14 days;
  never GPU tests or the screenshot gate. Full runs and bisects excuse nothing. A clean local failure
  where CI passed the same tree files a parity issue.
- **History** only skips a group whose exact inputs key passed, and orders recent failures first.
- **Fail open:** 5 s for plan and record, 2 s for a failure event, one try. No plan means no reuse,
  no quarantine, no excuse: longer and stricter, never looser. An unsent record is spooled as an
  artifact and re-posted by a non-required backfill job.
- **Credentials:** CI uses the job's OIDC token (audience `graphty-results`); the Worker takes the
  kind (`pr`, `full`, `bisect`, `base`) from its claims. Local runs use `GRAPHTY_RESULTS_TOKEN` and
  write only kind `local`, never evidence. Issues and dispatches use the `graphty-release-scheduler`
  App (a second key).
- **Cost:** about 110,000 rows a day: Workers Paid ($5 a month).
- **Rollout:** a week write-only; then reads go live; then local records are imported and the ledger
  deleted.

## 5. Stories become tests

Detail: [stories-as-tests.md](channels-pipeline/stories-as-tests.md).

- **One render per story.** An `afterEach` in each project's `.storybook/vitest.setup.ts` shoots the
  story at the end of its test with today's capture settings (1200 x 900, scale 2, the same Chromium
  flags and pinned fonts, `navigator.gpu` removed, `chromatic=true`, the fixed clock, the same
  waits and stitching) and compares it with the baseline using unchanged `compare.mjs`. New module
  `visual-review/capture/story-test.mjs`, published as `@graphty/visual-review/vitest`.
- **Outcomes:** `unchanged` passes; `changed` and `new` pass and are written for review; `unstable`
  (two shots disagree) fails as flaky; a render error fails.
- **Same output:** today's `results.json` and artifacts, so the review page and gate are unchanged;
  `visual-review merge-results` combines shards.
- **Selection:** a story file runs when its import closure holds a changed file; every story of a
  project runs when a global input changed (`.storybook/`, vitest config, `visual-review.config.json`,
  fonts, capture code, lockfile, shared theme); a changed baseline runs its story; unknown means run.
  Only selected baselines are pulled from LFS. The full run shoots everything.
- **Approval gates nightly.** Changed images make a pending status `promotion/screenshots`, not a
  red check; one notification; the page offers the newest candidate and carries decisions by image
  hash. Finish commits an accept commit parented on the candidate and opens a pull request that
  merges on the light check (its stories now `unchanged`); the resume step overlays that re-check on
  the candidate's capture and runs the gate unchanged, with gate code from `channel/nightly`. The
  gate step leaves ci.yml. A pull request's capture code decides nothing; the full run uses the copy
  at the nightly commit.
- **Parity is a bug class:** different bytes in two environments are filed and fixed, never
  absorbed; CI is the reference until local captures match it on two days.
- **Migration** per project (graphty, graphty-element, compact-mantine, algorithms and layout,
  cytoscape-extensions, graph-io-fidelity): both captures run in each full run, `visual-review
parity` compares hashes, and a project switches after two consecutive clean runs. No re-baselining.

## 6. Agent identity, review and the admin bypass

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) sections 2 to 4.

### 6.1 The agent account

A GitHub Team machine account (the owner creates it; suggested `graphty-agent`; a third seat), 2FA,
**Write** on graphty-monorepo only. `.claude/settings.json` sets `GH_CONFIG_DIR=~/.config/gh-agent`
and `GIT_CONFIG_GLOBAL=~/.config/git-agent/config` (name, noreply email, SSH push and signing keys),
so every agent session, worktree and hook acts as the agent and its commits verify for it.
`MASTER_GUARD_TOKEN` becomes an agent token. Agents never approve; they arm auto-merge.

Agents run as the owner's Unix user: the split is enforced only once his `gh` token and GPG key are
out of their reach (section 13 item 3).

### 6.2 CODEOWNERS

The owner owns `/.github/`, `/tools/` (including the results service, cache Worker, bisect and
channel tools), `/.husky/`, `/.claude/`, every `CLAUDE.md`, `/ci-budgets.json`, `/nx.json`,
`/release-hold.json`, `/sonar-project.properties`, `/eslint.config.js`, `/vitest.shared.config.ts`,
`/vitest.ci-junit.mjs`, `**/vitest*.config.*`, `**/.storybook/`, `/visual-review/`,
`/visual-review.config.json`, `/lychee.toml`, `/.lycheeignore`, `/.secretlintignore`,
`/graphty/sites/nightly.json`, `/graphty/sites/production.json`. Not owned: test files (the
integrity check covers them), `visual-baselines/` and `visual-review-approvals/` (the passkey-signed
gate covers them).

### 6.3 Ruleset and secrets

- Ruleset 23973898: bypass = the release deploy key only; code-owner review required with 0
  approvals (an unowned pull request auto-merges), stale reviews dismissed, last push approved.
- `channel/nightly` and `channel/production`: updated only by the deploy key, never deleted.
- Actions: default permissions read-only; Actions may not approve pull requests.
- **Outside-world secrets live in master-only environments** (a same-repo branch runs its own
  workflow files with repository secrets and can dispatch them): `release` (deploy key, Pushover,
  npm publish; the 13 trusted publishers are bound to it), `nightly` (nightly site key), `production`
  (owner reviews: graphty-site key, `NPM_DIST_TAG_TOKEN`), `full-run` (`GOOGLE_API_KEY`,
  `SENTRY_AUTH_TOKEN`), `nx-cache-write`.

### 6.4 Rules with checks (`pr-integrity.yml`, check `PR Integrity`)

- **Test integrity** (`tools/check-test-integrity.mjs`): fails when a test file, declaration or
  assertion disappears, a `.skip`, `.only` or `.todo` appears, a timeout or retry grows, or a coverage
  threshold drops. A code-owner approval on the head commit clears it.
- **Proof:** agent pull requests carry `## Proof` (command and output, the test that failed before
  the fix, or a capture).
- **Fresh review:** the review subagent's report, posted by `pr-open.sh`, marked with the head
  commit; a new push needs a new review.
- It re-runs on review and comment events without re-running ci.yml. Pipeline and CI-config changes
  go in their own pull request, never with a product fix.

## 7. CI time budgets

Detail: [budgets-and-trust.md](channels-pipeline/budgets-and-trust.md) section 1.

- **Levels:** run, job, step, nx task (`NX_PROFILE`). Per-test slowness stays with
  `tools/vitest-time-budget.mjs`, its history now read from the store.
- **`ci-budgets.json`** (code-owned; a raise is a reviewed pull request with a new measurement). The
  budget is the warn line. Starting values (minutes): `run:ci.yml:pr` 20, `run:ci.yml:pr-global` 30,
  `run:release.yml:full` 75, `run:ci.yml:full` 60, `run:gpu.yml` 60, `run:hosts.yml` 60,
  `job:ci.yml:Build` 6, `step:ci.yml:Build:Build all` 5, `task:graphty:build` 2, `job:ci.yml:Test
(*)` 15, `job:ci.yml:Stories (*)` 15. A new job gets 1.5 times its median over its first 5 runs.
- **Every run warns, never fails.** A last `timings` job (`if: always()`) reads jobs and steps (one
  API call) and the nx profiles, writes a summary, warns per key over budget, comments once on a pull
  request over 1.5 times master's median and 60 s slower on a key (naming its changed files under
  that project), and posts rows to the store (10 s, fail open).
- **Hang guards:** `timeout-minutes` = twice the budget (at least 10), checked by `lint`. A hung job
  is a defect, never re-run or raised.
- **One build for every event:** `lint` fails a build step whose env holds a secret or whose `if:`
  depends on event or ref, which is how the Sentry regression hid from pull requests.
- **Trend alarms** (the Worker, after each master or full-run post): the median of the last 5 runs
  over budget, or over 1.3 times the 10 before and 60 s slower. One issue per key (`priority:high`)
  naming runs and the merge range; closes when the median recovers. A culprit only by running the
  task on a merge and its parent. The Sentry regression would have alarmed in about 5 hours.

## 8. Feature flags

Detail: [features.md](channels-pipeline/features.md).

- **Rules:** an experiment only adds (off = today's behavior); a change to existing behavior is an
  option with today's default, and changing a default is breaking. The element never reads the host
  page's URL, storage or environment; no `GRAPHTY_FEATURES` exists anywhere. One build for every
  site. Removing a flag is an ordinary pull request.
- **graphty-element** (`src/features/`), all additive: attribute and property `features` (ids, or
  `all`), read-only `enabledFeatures` (`{ enabled, unknown }`), event `graphty-features`,
  `createSession({ features })`, `featuresFromUrl(url)` in `./catalog`, `setDefaultFeatures(ids)` in
  `./extend`, descriptors `FEATURES` and `GRADUATED_FEATURES`, error `E_FEATURE_OFF { feature, key }`.
  Experimental catalog entries are always registered with a `feature` field and filtered per session
  (the composed catalog's cache key includes the feature set), so features off gives today's
  identical arrays and a key whose feature is off is refused in one place. Saved projects record
  `requires`. Unknown ids never throw.
- **The app** fetches `site.json` (`cache: "no-cache"`) before loading the element, validates it
  (missing or invalid = every experiment off), adds `featuresFromUrl(location.href)` and sets the
  `features` attribute. Its own experimental UI follows `enabledFeatures.enabled`. `site.json` also
  holds the site name, the dataset base (`/data/graph-samples/v1/`, same origin) and Sentry's
  environment, replacing build-time branches. Sources: `graphty/sites/{canary,nightly,production}.json`.
- **API report:** experimental API carries `@experimental <id>`; `tools/check-features.mjs` fails on
  undeclared or graduated ids, a missing issue or an untagged flagged API; `--list` shows flag age.
- **Two configurations.** On = `setDefaultFeatures(["all"])` in a setup file (public API, no
  environment) for graphty-element's and graphty's projects: affected files on a pull request, every
  shard in the full run, with graphty-element's stories compared against the Off baselines. App
  stories run On without comparison. No baseline is approved for On. Nightly needs both green. No On
  shard is planned while `FEATURES` is empty.
- **Candidates:** `location-map`, `timeline`, `data-management`. Each starts with a pull request that
  declares the flag and gates and no behavior; the Stories job fails it on any changed existing
  story. Its branch merges master, adds the gates and is split into pull requests (never rebased).

## 9. Owner decisions this design implements

Binding decisions of 2026-10-24 and 25:

1. Three channels and domains, each a Pages site with its own builds and datasets; one code
   repository; separate built-file repositories; the owner does DNS, domain verification and the npm
   trusted-publishing transition (sections 1, 3, 13).
2. No golden; one pull request per branch, light checks, auto-merge; Mergify only if combined pull
   requests keep breaking master (section 2).
3. The full run every 6 hours with LLM regression once per candidate; red means bisect, revert, fix
   forward by the pipeline round; clean promotes automatically; changed screenshots wait for the
   owner's approval; nightly publishes `next` (sections 3, 5).
4. Production is the owner's judgment and trigger, same versions, same build (section 3).
5. Hotfix: merge, out-of-schedule full run, promote straight through (section 1.2).
6. Flush golden through #3318, then delete its machinery (section 12).
7. Results and durations in a Worker and D1, written per test group, failures sent at once, one read
   per run, fail open, unknown means run, blame only by evidence (section 4).
8. Stories become tests, judged against the same baseline hash, selected by changed code, all every
   6 hours; environment differences are bugs; CI is the reference (section 5).
9. Feature flags with the element's URL helper, per-site runtime configuration, two test
   configurations (section 8).
10. Time limits per job, step, build task and overall, in a reviewed file, with trend alarms and a
    pull request warning (section 7).
11. No admin bypass; a Team machine account for agents; owner review of pipeline changes; the
    release deploy key stays (section 6).
12. Update the pipeline-round skill and every CLAUDE.md (section 12).

Owner rules still applied: no admin merge (no bypass); nothing unapproved reaches production; holds,
never release exclusions; a major never auto-promotes; states end on events (hang guards end only
silent jobs); nothing is weakened to pass (6.4); flaky tests are critical; graphty-element stays
self-sufficient and neutral; only the owner approves screenshots; agents never edit `gate.mjs`,
`approval.mjs` or `passkeys.json`.

## 10. What we learned and where it shows up

- Tier 3 took about 60 hours and froze every other landing: No integration branch or landing lock; big work lands in small flagged pieces (2, 8)
- Six landing systems in five weeks: One ordered rollout with a measured "done" per step; pipeline paths code-owned (6.2, 12)
- The pipeline's own checks caused most gate failures (32 of 35 on 10-24): Tool tests only when tools change; the gate tooling is deleted (2, 12)
- Screenshots were the only red job in 29 of 53 runs; 3 to 6 Finish rounds per cut: A changed image never fails a pull request; one approval per nightly, decisions carried by hash (5)
- Local and CI screenshots differed and were worked around: CI is the reference; each mismatch filed; parity proven before local results count (4, 5)
- Agents waited on gates inside turns (103 wakes in a day): `pr-open.sh` arms auto-merge and exits; the round reacts to recorded events (2, 12)
- Gate settings leaked into its own tests: Clean CI environment; the quick check strips `GRAPHTY_*` and `PREPUSH_*`; no feature state from the environment (2, 8)
- A Build regression went unnoticed for four days: Per-task budgets, a pull request warning, trend alarms; one build for every event (7)
- Golden sat nine hours on failures it already had: A failing pull request re-runs the file on its base and is excused loudly (4)
- Flaky tests were blamed on the wrong landing; killed runners read as failures: Flaky only by same commit and inputs; culprit only when its parent passes 5 of 5; `infra` never counts (3, 4)
- Tier 3's retries tested new code each time (49.6 hours): A restart runs failing tests first, only on a merge referencing the red issue (3)
- graphty.app ran code no full run had passed; rebuilding at release ships untested bytes: graphty.app and `latest` move together, by promoting the same tarball and versions a nightly passed (3)
- 12 empty release attempts while master did not move; one red lane stopped releases for days: The full run tests canary and skips judged commits; the switch does not wait on the held release (3, 12)
- The shared GitHub account ran out of API requests: Agents have their own account; the store and alarms use a GitHub App (2, 4)
- Agents held the owner's authority; "no admin merge" was a rule, not a control: Write-only machine account, no bypass, code-owned pipeline, master-only secrets (6)
- Agents raised timeouts and narrowed checks to go green: Test integrity, proof of work, fresh-context review (6.4)

## 11. Contradictions between the drafts, and how they were settled

1. Store names: `tools/test-store/`, `TEST_STORE_TOKEN` (migration) vs `tools/results-service/`,
   `graphty-results`, `GRAPHTY_RESULTS_TOKEN` (results-service). The latter.
2. D1 cost: free plan (migration, budgets) vs about 110,000 rows a day (results-service, counting
   file rows and index writes). Workers Paid, an owner action.
3. Durations: a Worker cron polling into `duration` (results-service) vs a `timings` job posting
   keyed rows (budgets). One table in the budgets shape, written by `timings` (`if: always()` sees
   killed jobs); no cron poll.
4. Production repository: `graphty-production` (features) vs graphty-site (others, exists).
   graphty-site.
5. Site delivery: release assets in the site repositories via a Pages App (channels) vs a git commit
   per promotion via deploy keys (migration). Git cannot carry 373 MB four times a day and deploy keys
   cannot create releases: the tarball is a prerelease asset in graphty-monorepo, and a deploy key
   pushes only `deployed.json`, which triggers the site's deploy. No App.
6. Dataset overlay: channels appended production's datasets at nightly time, which needs the
   production key outside the owner's approval. It moves to production promotion; cost: a `next`
   consumer on the default URL gets a 404 for a dataset newer than production.
7. Promotion: a job in release.yml to avoid new trusted publishers (migration) vs `promote.yml`
   (channels). `promote.yml`: it never runs `npm publish`. Trusted publishing: "no change" (channels,
   migration) vs bound to environment `release` (budgets). Bound, because a branch can edit and
   dispatch release.yml; editing the 13 entries is the owner's transition.
8. `NPM_DIST_TAG_TOKEN` (channels) over `NPM_PROMOTE_TOKEN` (migration).
9. Drafts kept (migration) vs deleted (merging). Deleted.
10. Pre-push with format, lint and typecheck (migration) vs seconds-only pre-push plus the quick check
    (merging). merging.
11. SonarQube only as the master watcher (migration) vs in the quick check (merging). Both.
12. `branch-note.mjs` deleted (merging) vs kept (migration). Kept without sync fields: unfinished
    branches have no pull request yet.
13. Mergify trigger: three master failures a week (migration) vs two skew breaks in 7 days or one red
    over 6 hours (merging). merging: it counts only breaks a queue would stop.
14. Required checks: two (merging) vs more (budgets). Four, with integrity, proof and review in
    `pr-integrity.yml` so review events do not re-run ci.yml.
15. Fresh review "before auto-merge" vs `pr-open.sh` arming auto-merge at once. The review runs
    before `pr-open.sh`, which posts it.
16. Four CODEOWNERS lists. The union plus `/visual-review/` and `**/.storybook/`, minus
    `visual-baselines/` and `visual-review-approvals/`.
17. Agent git identity per worktree with a token in `.env` (merging) vs `GH_CONFIG_DIR` and global
    config in `.claude/settings.json` (budgets, migration). The latter covers every checkout.
18. `site.json` in the site repositories with `channel`, `dataBaseUrl` (channels) vs
    `graphty/sites/` with `site`, `datasets` (features). features: one repository, reviewed there.
19. On-configuration stories without screenshots (stories) vs compared with Off baselines (features).
    features: stronger and adds no images.
20. Canary domain first (channels) vs at the domain swap (migration). A Pages site has one custom
    domain, so migration's order.
21. Shadow full run (channels) vs straight to red handling (migration). Step 4 bisects and reverts but
    publishes nothing; step 5 turns on nightly; `latest` stays put until the first promotion.
22. Stories shadow: 5 full runs overall (migration) vs two clean runs per project (stories). Per
    project, two.
23. Fail-open timeouts 3 s (migration) vs 5 and 2 s (results-service). The latter; 10 s for `timings`.
24. Build reuse: "Reuse" deleted for the cache (merging) vs `reuse_build_run` (channels). Both: the
    old step goes; the full run reuses the master build it tests.
25. Budget numbers differed between merging and budgets. One file; the budget is the warn line.
26. "Zero changed screenshots" for a flag's first pull request was not enforced, since changed images
    pass. The Stories job fails such a pull request on any changed existing story.
27. Red full-run priority `high` (old train hold) vs `critical` (channels). Critical: it is a red
    master.
28. master-guard's revert job: deleted (migration) vs kept (channels, merging). Kept, as the agent.
29. Mergify Test Insights: kept (merging) vs deleted (results-service). Deleted once reads are live.

## 12. Rollout and deletion

Detail: [migration.md](channels-pipeline/migration.md).

0. Flush: no new landings; verify the tip; `cut origin/golden-verified`; Finish; ship; #3318 releases. Starts after: now. Done when: golden is an ancestor of master; #3318 closed; each `latest` equals its newest tag.
1. Owner setup (section 13). Starts after: parallel. Done when: each item's check passes.
2. Results store write-only; durations recorded. Starts after: parallel. Done when: every job has a record for 3 days; none slowed over 5 s.
3. Pull requests into master: light check, `pr-open.sh`, cache, worktrees and Dependabot on master, CLAUDE.md "Shipping a change", skills rewritten. Starts after: flush shipped. Done when: of 20 pull requests: median under 20 min, 18 untouched, master green after each.
4. Full run with bisect and revert, publishing nothing. Starts after: 3. Done when: 8 slots green, or red with a culprit whose revert made the next green.
5. Nightly site and npm `next`. Starts after: 4, environments, trusted-publisher binding. Done when: one automatic and one approved promotion served and tagged.
6. `promote.yml`; graphty.app to graphty-site; canary.graphty.app. Starts after: 5. Done when: site check passes on all three; every dataset path answers 200.
7. Agent account, CODEOWNERS, bypass removed, store reads live. Starts after: 1, 3. Done when: an owned-path pull request waits, an unowned one auto-merges, `--admin` is refused.
8. Deletion. Starts after: 3 to 7, 7 days without undo, #3318 closed. Done when: lint, knip and a full run green; no reference outside `design/`.
9. Stories as tests, per project. Starts after: 4. Done when: two clean parity runs, then its old capture job goes.

**Deleted** (step 8 unless noted): `tools/land.mjs` (golden, golden-cut, `cut`, `cut-fix`, `ship`,
`sync`, landing checks) and its live copy; `tools/verify.mjs` (rules to `bisect-core.mjs`);
`branch-sync.mjs`; `push-queue.sh`, `queued-push-guard.mjs`, `prepush.sh`,
`prepush-source-checks.sh`, `prepush-tests.mjs`, the gate parts of `prepush-inputs.mjs` (the shard key
moves to `tools/results/inputs.mjs`), `shard-verdict.mjs`, `gate-snapshot.sh`, `push-base.mjs`,
`wait-log.mjs`, `ship-risks.mjs` (about 11,000 lines); `golden-verify.yml`, `visual-seed.yml`,
release.yml's restart-on-any-push and skip-while-held; in ci.yml the Mergify handling, draft jobs,
the `golden-cut` exception, the `verify` input, the old "Reuse" step, and (step 9) the `visual` job,
the gate step and `tools/visual-capture-plan.mjs`; `tools/visual-preview.sh`; the test ledger,
`test-quarantine.json` and the quarantine's local state, `TEST_LEDGER_*`, the Mergify Test Insights
upload; branches `golden`, `golden-cut`, `golden-verified`, `golden-candidate`,
`golden-cut-candidate`, `golden-bisect-1`, `golden-bisect-2`, tag `golden-good`; worktrees
`gate-live`, `land-live`, `golden-local`, `land-check-*`, `golden-bisect-*`, the githerd worktrees and
server (source stays); `live-tools.json` entries `gate` and `land`; `tmp/golden/`,
`tmp/push-gate-logs/`, `tmp/prepush-passes/`, `tmp/test-ledger/`, `tmp/test-quarantine/`; branches
`ci/3267-site-flip`, `ci/3267-beta-site` and pull request #1942 as superseded; CLAUDE.md's landing,
verification and gate sections and their tool rows, and golden references in package CLAUDE.md files.

**Kept:** `worktree-new.sh` (from master), `branch-push.sh`, `branch-note.mjs`, `no-copy.sh`, the
selector with its rules and mutation check, `test-changed.mjs`, `ci-test-matrix.mjs`,
`run-tests.sh`, `test-slots.mjs`, `with-browser.sh`, `low-priority.sh`, `sonar-gate.mjs`,
`sonar-baseline.mjs`, `pr-status-broker.mjs`, `worktree-cleanup.mjs`, `master-guard.yml`,
`pr-title.yml`, `pr-issue-link.yml`, the release tools and holds, `release-watch.yml`,
`gpu-rerun-on-runner-loss.yml`, the scheduler, visual-review's page, Finish, passkeys and gate.

**Instructions** (owner-reviewed): root CLAUDE.md's landing sections become "Shipping a change" (at
most 600 words) in step 3. The pipeline-round skill, rewritten in step 3, works in this order: red
master build and its reverts; red full run (bisect, revert, fix forward); flaky tests; budget alarms;
held release or failed publish; owner items (screenshots, promotion), once each; red or conflicted
agent pull requests (merge master, never rebase); finished worktrees. It never mixes a test, budget,
quarantine or workflow change with a product fix, and never re-runs hoping for green. issue-round and
design-studio end with `pr-open.sh`. Memory entries about golden, freezes and the push queue are
marked superseded.

## 13. What the owner does

In order; each ends with how to tell it worked.

1. **Flush:** Finish the cut's screenshots; the ship merges; #3318 releases (its T4 nx-graph failure
   and advisories #3393 are fixed on golden first). _Check:_ #3318 closed.
2. **Agent account** on the Team plan (a third seat), 2FA, Write on graphty-monorepo; `GH_CONFIG_DIR=
~/.config/gh-agent gh auth login` as it here; add the SSH push and signing keys the session
   generates. _Check:_ `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login`.
3. **Your own credentials** (makes the split enforced): `gh auth logout` here, GPG key behind an
   uncached passphrase, approvals and settings in the browser. _Check:_ plain `gh auth status` shows
   no login.
4. **Cloudflare** (the scheduler's account): Workers Paid ($5 a month) and R2; an API token with
   Workers Scripts, D1 and R2 edit as `CLOUDFLARE_API_TOKEN` with `CLOUDFLARE_ACCOUNT_ID`; a second
   private key of the `graphty-release-scheduler` App on the `graphty-results` Worker;
   `GRAPHTY_RESULTS_TOKEN` in `.env` and its hash on the Worker. _Check:_ `/v1/health` answers.
5. **Domain verification** of `graphty.app` for graphty-org (TXT
   `_github-pages-challenge-graphty-org.graphty.app`). _Check:_ "Verified".
6. **DNS:** CNAME `canary` and `nightly` to `graphty-org.github.io`. _Check:_ `dig +short
canary.graphty.app`.
7. **Site repositories:** create public graphty-org/graphty-nightly; on it and graphty-site add the
   deploy keys the session generates and set Pages to GitHub Actions. _Check:_ the first nightly
   deploy appears.
8. **Environments:** `release`, `nightly`, `full-run`, `nx-cache-write` (master only) and `production`
   (master only, you as reviewer, prevent self-review); the session lists the secrets for each.
   _Check:_ a `promote.yml` dry run waits for you.
9. **npm trusted-publishing transition**, when the session says the first nightly publish is ready
   (not earlier): set environment `release` on each of the 13 trusted publishers (workflow
   `release.yml` unchanged); create a granular token with write on `@graphty` as
   `NPM_DIST_TAG_TOKEN` in `production`, renewed before expiry. _Check:_ the first `next` publish and a
   no-op `dist-tag add` succeed.
10. **Domain swap** in one sitting when told: `graphty.app` from graphty-monorepo's Pages to
    graphty-site; `canary.graphty.app` on graphty-monorepo, `nightly.graphty.app` on graphty-nightly;
    enforce HTTPS once certificates exist. _Check:_ the site check passes.
11. **Ruleset and settings:** review the CODEOWNERS pull request; on ruleset 23973898 remove the admin
    bypass, keep the deploy key, require code-owner review, set the four checks; switch off squash;
    Actions permissions read-only and no Actions approvals. _Check:_ step 7's tests.
12. **Review owner-owned pull requests** during the rollout, including the one moving the gate step
    from ci.yml to the promotion.
13. **Approve changed screenshots** for nightly candidates and **promote** whenever you judge nightly
    good.

Decided here unless the owner overrules it (a published contract): an API tagged `@experimental`
may change or disappear in a minor release of graphty-element, as the docs will say.
