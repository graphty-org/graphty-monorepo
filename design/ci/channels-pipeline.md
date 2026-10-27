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
2. **Review, then open.** `tools/pr-review.sh` starts the review as a separate headless session
   (`claude -p` with `/code-review` at `high`, no inherited conversation), so a background subagent,
   which cannot start subagents of its own, still gets one. It reads only the issue, the
   diff `git diff origin/master...HEAD` and the Proof; the author fixes what it finds. `tools/pr-open.sh`
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
   regression once a UTC day. Measured 65 to 93 min today; target 60 to 75 (section 3). Red:
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

- **Agent's machine:** review session (`pr-review.sh`); `pr-open.sh` (seconds); quick check on request
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
  EGL path set explicitly; it unsets only the old gate's variables, by a list, and runs tests with
  `GIT_CONFIG_GLOBAL=/dev/null` as on a runner, so the agent's signing config never reaches a test's
  temporary repository. A real-GPU look on a pull request is opt-in: `pr-open.sh` prints a reminder
  when webgpu-graph-algorithms is affected, and the full run's T4 catches what it misses within 6 h. `hosts.yml` keeps its
  advisory pull request trigger and loses its nightly cron at step 6.
- **Dependabot** targets master; `dependabot-automerge.yml` arms auto-merge with an agent token
  scoped to Contents and Pull requests write. Link PR Issue and PR Integrity accept `dependabot[bot]`
  without an issue line, Proof or review; test integrity still applies.
  Actions updates wait for the owner by design.
- **No merge queue at first.** The bisect records skew breaks. Two in 7 days, or one that kept canary
  red over 6 hours: the pipeline round proposes Mergify (`merge_group` is the alternative).
- **Red master build:** `master-guard.yml` opens a revert pull request as the agent account.
- **Branch ceiling:** the round's daily list names every branch with no pull request whose first
  commit is over 3 days old, and every pull request over 1,500 changed lines (tests and baselines not
  counted); each is split into flagged pieces (section 8) or its owner says why not. A warning, not a
  check: `tools/branch-note.mjs` records the answer.

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
  also turns on immutable releases (section 13 item 4).
- **The full run** (`release.yml`, dispatched at 00, 06, 12, 18 UTC with `mode: full`) takes the
  newest master first-parent commit whose push build is green and whose `site-<sha>` exists, from
  the store (canary's build stamp is a cross-check after step 8). It skips a commit already judged,
  or one whose diff from the last judged commit is only release-version merges and accept merges
  (`tools/release-diff.mjs`). The version and major-bump dry run is its own lane, and the `version`
  job reuses its plan. Lanes: ci.yml (each On shard starts when its Off twin ends), `gpu.yml`,
  `hosts.yml`, `work-protection-macos.yml`, the audit, and LLM regression once per UTC day (the first full run
  of the day whose ci.yml lane is green, and an owner `mode=full` run), started when the ci.yml lane
  is green (off the critical path). Performance Benchmarks becomes `needs:
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
  release.yml run first catches up (promotes an approved candidate, re-tests a fixed candidate head,
  runs an unjudged slot), so a run
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
- **Nightly fixes the run it has.** Master moves every 6 hours with new fixes and new problems, so
  waiting for a clean newest full run may never publish. A full run that is not green-clean is
  checked once more on its own commit, then held and fixed in place, never replaced by newer master.
- **Same-commit re-run, once.** A release.yml `recapture` job (needs ci; ci.yml's visual job and
  gate step are untouched) re-shoots on a fresh runner only the stories attempt 1 found changed or
  new (`capture --stories`). A story is changed only when both shots differ from its baseline and
  equal each other; two different shots are nondeterministic rendering, filed as flaky and never
  approvable, so they hold the candidate until fixed. The run's one gated capture is
  `visual-final-<project>` (attempt 1's shots with the re-shot ones replaced); the verdict, the page
  and `promote-nightly` all read it. `release-rerun.yml` (`workflow_run` on Release; it absorbs
  `gpu-rerun-on-runner-loss.yml`, so one workflow re-runs a run) runs `gh run rerun --failed` once,
  on attempt 1 of a `full`, `restart` or `candidate` run whose failed jobs are all lanes or the
  verdict, never `version`, `land`, `publish` or `promote-nightly`. The attempt rejoins the
  `release-train` group like any run (every run catches up first, so a pending run it replaces
  loses nothing). Attempt 1 files no red issue and dispatches no bisect; the deciding attempt does.
  `release-rerun.yml` is the one decider (`tools/release-rerun.mjs`, which `release-watch.yml` asks
  too, so the two never race): when it does not re-run an attempt that deferred, it files that
  attempt's red issue and bisect itself, and holds its commit when nothing is held (a failed job it
  does not re-run, or a `gh run rerun` that did not start). A re-shot story with no second shot, or
  whose second shot failed, is `failed`, never `changed`: only two matching shots make a change. A
  test, lane or story that failed and then passed is filed "Flaky in full run: <name>" (bug,
  priority:critical, effort:medium; a comment when it recurs) and does not block. It is a
  confirmation, not a quarantine: nothing joins a quarantine list, so the screenshot gate and GPU
  tests keep their rule. Today's flaky drop-target story ends here, not in a hold.
- **Held candidate.** A run still not green-clean after its re-run holds its commit C: release.yml
  pushes branch `channel/candidate` at C (deploy key, environment `release`, ruleset like
  `channel/nightly`), writes the store's one-row `candidate` table (`base` C, `head`), and opens
  "Nightly held on <sha12>" (priority:high) listing the red lanes, changed images and owner items,
  announced on the Release status issue and Pushover. Master keeps merging; master slots still run
  and file red issues, but never promote or replace C. Catch-up order: a due promotion, an untested
  candidate head, the master slot. A hold ends only when C promotes (land deletes the branch and
  closes the issue) or the owner abandons it (`gh workflow run release.yml -f mode=abandon`, owner
  only); newer master supersedes it only through that abandon, which records `rejected` on the held
  head, so an approval of it that merges later promotes nothing.
- **Fix forward into the candidate.** A fix never brings master into the candidate. Its branch
  starts from the candidate head (`./tools/worktree-new.sh fix/<n>-<topic> origin/channel/candidate
--issue <n>`), a commit says `Refs #<hold issue>` (or the branch is named for the hold issue,
  `fix/<hold issue>-<topic>`), and it opens and merges into master as usual (`tools/pr-open.sh`,
  unchanged: the merge of origin/master it adds on top is simply never taken). A further fix commit
  for the same pull request goes on a branch from its last fix commit, merged into the pull
  request's branch. Before every full, restart and candidate pick, release.yml's `candidate_fix` job
  (deploy key, nothing installed; `tools/channel/candidate-fix.mjs advance`) walks master's merges
  since C: for each one that references the hold issue and holds no accept commit, F is the newest
  of its pull request's commits (the merge's second-parent side) whose history past the candidate
  head holds only that pull request's own commits. F is merged into the head (a fast-forward when
  it starts from the head; never a cherry-pick), `channel/candidate` is pushed and the store's hold
  moves to the new head H. It refuses, once, with a marked comment on the hold issue, when no
  commit qualifies (the branch holds master commits the candidate lacks: a defect already fixed on
  master from a newer base cannot enter without a copy, so the owner abandons the hold or the fix is
  made again from the head), when a non-merge commit of the pull request is not in F (a fix commit
  made after the master merge), and on a conflict. Every run does this, so the `mode: candidate`
  run `release-due` dispatches on such a merge loses nothing when another dispatch replaces it
  while pending. The pick then tests H first (it is unjudged) and plans the re-test from C..H
  (`candidate-fix.mjs plan`): ci.yml with `shards` (the shards of the projects nx calls affected,
  as a light run without screenshots), T4, the audit, Hosts when webgpu-graph-algorithms,
  graph-format or the lockfile changed, macOS work protection when graphty-element or the lockfile
  changed, and any lane the head's previous verdict found red; LLM regression keeps its daily rule.
  A red CI lane or screenshot capture before, or no earlier run to carry captures from, re-runs
  everything. The `recapture` job shoots every story of an affected Storybook and carries the
  other projects' `visual-final-*` over from the run that judged the head before, shooting their
  changed and new stories again; ci.yml's visual job and gate are untouched and ci.yml gets no new
  input. H has no master build, so the run's CI call builds it and `candidate_site` assembles
  `site-<H>` with `deploy-pages.yml` (called: it assembles and keeps the artifact, records and
  deploys nothing); a site that fails to assemble counts against the CI lane. A red re-test is
  reported on the hold issue only: no "Full run red" issue, no early red issue, no bisect.
- **Nightly promotion** reuses today's `version`, `land` (deploy key, version merge and tags, the
  site tag, `channel/nightly`) and `publish` (`--tag next`) jobs, then `site`. A held candidate's
  merge brings candidate merge commits into master, so `land` first runs `release-diff.mjs` over
  origin/master..(its merge result) and refuses unless that adds only version fields and
  changelogs: candidate code reaches master only through master's own pull requests. While a publish hold
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
- **Approval gates nightly.** Images still changed after the re-capture hold the candidate and set
  the pending status `promotion/screenshots`. The page offers only the held candidate's tested head
  H (`channel/candidate`, read from the store), and only once the store's latest verdict for
  exactly H is `green-images` (every lane green, no owner item), never an older or newer run;
  `visual-review notify` tells the owner once. Finish commits accept commit A parented on H, on
  branch `visual/approve-<sha12>`, writing every accept carried by hash from an earlier head into
  A's tree, then commits his signed approval of that tree on A, and opens a pull request touching
  only `visual-baselines/` and `visual-review-approvals/`; its head P is the approval. When it
  merges, `release-due` matches A's subject ("approve visual baselines at <sha12>") to H and
  dispatches release.yml `mode: promote-nightly` (inputs `candidate` H, `accept` P, the merge's
  second parent); an approval for a head no longer current dispatches nothing and comments on the
  hold issue. `promote-nightly` refuses unless P is H plus accept-only commits (no merge, nothing
  outside those two directories) and H's latest verdict is `green-images`; then the gate runs
  unchanged on H's `visual-final-*` (30 days) against P's baselines and P's signed approval, after
  `tools/channel/recapture.mjs accepted` marks each story whose captured PNG is P's baseline byte for
  byte (its LFS oid equals the capture's SHA-256, as the accept commit writes it) unchanged, as a
  capture of P would find it, and drops a removed story whose baseline P deleted, with `--base channel/nightly --head P`; then version,
  land, publish and site on P; the store records `approved`, the branch is deleted and
  the hold issue closed. A rejection keeps the hold: rejected images are fixed forward. Every `full`
  slot first catches up on such an approval (a held head whose approval is on master, with no
  publish hold open), so a slot that replaced a pending `promote-nightly` run loses nothing. The run
  that holds a green-images head keeps its builds as `release-builds-<H>` (30 days), which the
  promotion ships, and the site deployed is H's own `site-<H>`, which master built; P changes only
  baselines and approvals. A gate refusal records `rejected` on H and comments on the hold issue, so
  no later slot retries that approval; an open publish hold only delays it. The gate and
  capture code come from master's tip at the run's start (code-owned paths), recorded in
  `channel.json`.
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
helpers and cache, his SSH keys and ssh-agent, his npm token and his GPG key are out of their reach (section 13 item 2).

### 6.2 CODEOWNERS

Owned are only the paths that can loosen a check or take authority: `/.github/workflows/`,
`/.github/CODEOWNERS`, `/.claude/`, `/CLAUDE.md`, `/ci-budgets.json`, `/release-hold.json`,
`/release-approvals.json`, `/nx.json`, `/vitest.shared.config.ts`, `/vitest.ci-junit.mjs`,
`**/.storybook/vitest.setup.*`, `/visual-review/trusted/`, `/visual-review/capture/`,
`/visual-review/passkeys.json`, `/visual-review.config.json`, `/graphty/sites/nightly.json`, `/graphty/sites/production.json`, and in
`tools/` the results, cache, scheduler and channel directories, `bisect-core`, the release tools,
`ci-test-matrix`, `run-tests`, the selector and its rules, and the integrity, features, budgets,
`pr-open`, `pr-review` and quick-check scripts. `visual-baselines/` is guarded by the signature
(section 5). **Owned closure:** PR Integrity fails when an owned script's or workflow's static import
closure (the selector's import graph) holds an unowned file, so a helper an owned tool imports is
owned too; the list grows by the files that check names, in its own pull request. Of
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
  loosened; any package.json `scripts` entry changed; the root package.json's `pnpm` field changed
  (`auditConfig.ignoreGhsas`, `overrides`); a story's or preview's `parameters.chromatic` capture
  setting (`disableSnapshot`, `diffThreshold`, `diffIncludeAntiAliasing`, `delay`, `modes`) added or
  changed. A code-owner approval on the head clears it.
  Its false-positive rate is replayed over the 96 landings of 10-18 to 10-24 before step 3.
- **No unapproved breaking change:** fails when the title or any commit carries `!` or a
  `BREAKING CHANGE:` footer, unless a code owner approved the head. One that reaches master anyway is
  held by the dry run (section 3) until a `release-approvals.json` entry exists.
- **Baselines signed:** section 5.
- **Proof:** agent pull requests carry `## Proof` (command and output, the test that failed before
  the fix, or a capture).
- **Fresh review:** the review session's report (`pr-review.sh`), posted by `pr-open.sh` as a pull request review,
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
- **Stall alarm:** every release.yml run's `timings` job checks `age:nightly`, the time since
  `channel/nightly` last moved while canary holds an unpromoted commit. Over 24 hours it files or
  updates one `priority:critical` issue "Nightly stalled since <date>" naming the blocking state (red
  with or without a culprit, waiting for screenshots, an owner item, a hold); the pipeline round owns
  a red with no culprit and fixes forward. Over 48 hours, the issue gets an `ACTION NEEDED` line.

### 7.1 Load and runner capacity (owner, 2026-10-26)

**The load.** On 2026-10-26 master took about 76 pull requests in one day (Mergify averaged about 54
a day from 2026-10-04 to 10-17, with a median of 32 minutes from queue entry to merge); the owner
says this is the new normal. Merging keeps up. GitHub runners do not: the plan allows 60 concurrent
jobs, and that afternoon runners were saturated for 55 of 60 minutes in an hour, jobs waited about
14 minutes for a runner, pull request runs took 30 to 45 minutes against their 10-minute budget, and
a master push build took a median 35 minutes of wall time (14 when runners were free) for about 30
runner-minutes of work.

**Capacity cannot be bought.** The owner found no way to raise runner concurrency substantially for
under about $1,000 a month. So the plan cuts work instead, in this order (plan step 5a), and the full
run stays first in line for runners, as today:

1. **Stop work nobody uses.** (a) A newer master push build cancels an unfinished older one: only
   the newest build's site matters for canary, and the full run picks the newest commit with a kept
   site, so a cancelled build only means it picks a newer commit. This replaces "a push to master
   never cancels" for superseded master builds only; nothing else on master is cancelled, and
   master-guard and the restart trigger learn to expect it in the same change. (b) A pull
   request's screenshot capture jobs that `All Checks Pass` does not need stop once its verdict is
   in (today they run 15 to 25 minutes past it). (c) The old screenshot capture goes once story-test
   parity holds (section 5, step 9): the largest single saving. (d) Fewer pushes per pull request:
   on 2026-10-26, 99 of 244 pull request runs were cancelled by a newer push to the same branch, a
   median 6 minutes later, because every commit was pushed and `pr-open.sh` merged master into a branch
   that was only behind; a branch with an open pull request is now pushed only on purpose.
2. **Make each run smaller.** File-level test selection for the packages that still run whole
   shards on a pull request; measure the nx remote build cache's hit rate and raise it; a real fast
   path for a change to tools only or docs only.
3. **Measure.** The health dashboard shows runner-minutes per merged pull request, split by kind
   (pull request run, master build, full run, other), so each change shows its real saving.
4. **Only then, if runners are still saturated,** decide on batching: replay a day of merges through
   GitHub's native merge queue with merge groups and measure tests per batch, batch failure rate and
   bisect cost. Mergify's record argues for measuring first: 809 CI runs for 761 merges (it barely
   batched), 197 of them wasted.

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
- **`@experimental` promises no compatibility** (owner, 2026-10-25; section 14): an experimental API may
  change or disappear in a minor release, so experiments may add public types.
- **The app** fetches `site.json` before loading the element (missing or invalid = every experiment
  off), adds `featuresFromUrl(location.href)` and sets the `features` attribute.
- **Two configurations.** On = `setDefaultFeatures(["all"])` in a setup file: affected files on a pull
  request, every shard in the full run, element stories compared against the Off baselines. Nightly
  needs both green. No On shard while `FEATURES` is empty.
- **Candidates:** `location-map`, `timeline`, `data-management`.

## 9. Owner decisions this design implements

Every binding decision of 2026-10-24 and 25 is implemented in sections 1 to 8 and 12. One meets
an older guideline: "LLM regression once per candidate" at up to 4 candidates a day is up to $113 a
month against the 2026-10-12 guideline of about $60. The implementation plan (#3418, item
`llm-once-a-day`) lowered it to once per UTC day: the first full run of the day whose ci.yml lane is
green, and an owner `mode=full` run, about $29 a month. Budget key `spend:llm` warns at $60 in a
calendar month with the month's runs counted. Going back to once per candidate is a one-line change
to the lane's condition (`tools/llm-due.mjs`). Owner rules
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
| LLM regression                      | about $0.94 a run, once a UTC day plus owner runs (about $29 a month); bisects capped at the ceiling (section 9)                               |
| GitHub-hosted Linux, macOS, Windows | free on this public repository; limited by concurrency (60 Linux, 5 macOS jobs; table in channels 5); saturated at 76 merges a day (7.1)       |
| Git LFS bandwidth                   | up to 880 MB per full run on a cache miss, 100 to 150 GB a month at worst, of 250 GiB; alarm at 150                                            |

## 12. Rollout and deletion

Detail: [migration.md](channels-pipeline/migration.md). Each step: starts after; done when. Each
step's code-owned edits go in one pull request per step, listed in migration section 3.

0. **Flush:** the last golden landing makes `deploy-pages.yml` stop deploying graphty.app; then
   `land.mjs land` refuses while `tmp/golden/flush` exists (three lines, put live with
   `tools/live.sh land`), so no landing slips in; verify the tip; `cut origin/golden-verified`; Finish; ship; #3318 releases. After: now.
   Done: golden is an ancestor of master; #3318 closed; each `latest` equals its newest tag.
1. **Owner setup** (section 13). After: parallel. Done: each item's check passes.
2. **Results store write-only;** durations recorded. After: parallel. Done: every job has a record
   for 3 days; none slowed over 5 s.
3. **Switch identity and freeze npm**, one owner-reviewed pull request and the owner's settings:
   release.yml publishes nothing except the owner-approved interim mode (section 13 item 9),
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
   5a. **Runner load** (section 7.1): stop unused work, shrink runs, measure runner-minutes per merge,
   then decide on batching. After: 5. Done: runners no longer saturated at the day's merge rate, or
   the batching replay decided.
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

**Instructions** (owner-reviewed): migration section 6 marks every root CLAUDE.md section keep,
rewrite or delete, with its step, plus compact-mantine's and graph-samples' files. The pipeline-round
skill, rewritten in step 5, works in this order: red master build and its reverts; red full run
(GPU bisects on the local card when recorded, reverts, fix forward); flaky tests and base checks;
budget alarms; held release or failed publish; owner items once each, code-owned fixes for a red
pipeline at once, and one daily review list; red or conflicted agent pull requests (merge master,
never rebase); finished worktrees. It never mixes a test, budget, quarantine or workflow change with
a product fix, and never re-runs hoping for green.

## Review notes

Answers to review findings that the sections above do not settle by themselves.

- **Rejected candidate.** A rejected image is a defect of the held candidate, fixed forward into
  `channel/candidate` (section 3); the candidate is not dropped and no other run is offered
  meanwhile. Decisions carry by image hash, so a rejected image stays rejected until a fix changes
  it. Only the owner ends a hold without a promotion (`mode: abandon`).
- **Test integrity is replayed, not trialled.** It is replayed over past landings before it is
  required, rather than warning for a week first: the replay gives the false-positive rate without
  letting a week of real pull requests through unchecked.
- **`base-check.yml` is kept**, dispatched by the round: without it a pull request would stay red,
  with no recourse, on a test master breaks between full runs.
- **Unreviewed code and the release key.** Off owned paths, master accepts agent code no human read;
  that is the design's premise, and nightly is where it ships. The `land` and `publish` jobs, which
  hold the deploy key and npm's OIDC, run only owned code: code-owned release tools and `nx.json`,
  `pnpm install --frozen-lockfile --ignore-scripts`, and the tarballs CI built without secrets.
  Package lifecycle scripts (`prepack`, `prepublishOnly`) change only with an owner approval (test
  integrity). Step 7 checks the `--ignore-scripts` install works for nx release before binding the
  publishers. Production needs the owner.
- **The review page is served by an agent-started server.** Agents run as the owner's Unix user, so
  they could alter the page he signs on; this is the same residual risk as section 6.1, not a new
  one. When he wants a signature independent of agents, he starts the server from his own shell in a
  fresh clone at master (the page prints the command). The gate still checks the signed tree byte
  for byte.
- **Real GPU on pull requests** is opt-in by design (section 2): a GPU regression costs at most one
  6-hour slot, and the bisect runs its points on the local card first.
- **Rebinding 13 trusted publishers at once.** The 2-day expiry is documented for new
  configurations; whether editing an existing one restarts it is unknown. So item 8 binds them on
  the day a nightly is due to publish, and a failed publish is today's publish hold, cleared by
  re-running the publish job.
- **Owned scripts that import unowned code** are closed by the owned-closure rule (section 6.2).
- **Nightly stalling silently** and **a red with no culprit** have the stall alarm (section 7).
- **Huge or old branches** have the branch ceiling (section 2).

## 13. What the owner does

In rollout order. Each item says when it is needed, the exact steps, and how to tell it worked.

1. **Finish the flush.** _When:_ step 0, as soon as the cut's preview is ready (the round says so).
   Steps: open the review page, decide the cut's changed screenshots, Finish with Face ID. The round
   ships the cut; release #3318 follows. _Check:_ #3318 closed.
2. **Agent account and your own credentials.** _When:_ step 1, before step 3.
   Steps: create the GitHub Team machine account (suggested `graphty-agent`, 2FA on), give it Write on
   graphty-monorepo only; here, run `GH_CONFIG_DIR=~/.config/gh-agent gh auth login` as it; add the
   SSH authentication and signing keys the session generates to that account. Then for yourself on
   this machine: `gh auth logout`; `git credential-cache exit`; remove both `credential.helper` lines
   from `~/.gitconfig` (or move them to a config only your shell loads); remove your own SSH keys
   from `~/.ssh` (or give them a passphrase and stop any ssh-agent that holds them); remove the npm
   token from `~/.npmrc` (`npm logout`); put your GPG key behind an uncached passphrase; from then on
   approve and promote in the browser. _Check:_ this prints the agent:
   `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login`; plain `gh auth status` shows no
   login; this prints no password:
   `printf 'url=https://github.com\n\n' | GIT_TERMINAL_PROMPT=0 git credential fill`;
   `ssh -T git@github.com` does not greet `apowers313`; `npm whoami` fails.
3. **Cloudflare.** _When:_ step 1, before step 2. In the scheduler's account: turn on Workers Paid
   and R2; create an API token with Workers Scripts, D1 and R2 edit and store it as repository secret
   `CLOUDFLARE_API_TOKEN` with `CLOUDFLARE_ACCOUNT_ID`; on the `graphty-release-scheduler` App add
   **Contents: read** and **Administration: read**, create a second private key and put it on the
   `graphty-results` Worker; put `GRAPHTY_RESULTS_TOKEN` in `.env` and its hash on the Worker (the
   session gives the commands). _Check:_ `/v1/health` answers.
4. **Environments.** _When:_ step 1; used from step 3. Create `release`, `nightly`, `full-run`,
   `master-build`, `nx-cache-write`, `dependabot-automerge` (each: deployment branches `master` only)
   and `production` (master only, you as required reviewer, "prevent self-review" off); enter each
   one's secrets from the list the session gives. At step 7, turn on immutable releases once the
   session reports that `gh release edit --prerelease` and `--latest` still work on one. _Check:_ a
   `promote.yml` dry run waits for you.
5. **Ruleset and settings.** _When:_ step 3, after the session's scratch-ruleset tests pass. Approve
   the CODEOWNERS pull request; on ruleset 23973898 remove the admin role from the bypass list, keep
   deploy keys, turn on code-owner review (0 approvals), dismiss stale reviews, leave last-push
   approval off, require `All Checks Pass`, `Lint PR Title`, `Link PR Issue` and `PR Integrity`; add
   the tag ruleset on `*@*` and `site-*` (create: deploy key only; update and delete: nobody) and the
   `channel/*` branch rule; switch off squash merging; set Actions' default permissions to read-only
   and turn off "Allow GitHub Actions to create and approve pull requests". _Check:_ step 3's tests
   (an owned-path pull request waits, `--admin` is refused).
6. **Domain and DNS.** _When:_ any time in step 1; needed by step 7. In graphty-org's settings, verify
   `graphty.app` for Pages (TXT record `_github-pages-challenge-graphty-org.graphty.app` with the
   value GitHub shows); at the DNS host add CNAME `canary` and CNAME `nightly`, both to
   `graphty-org.github.io`. _Check:_ "Verified" in the settings; `dig +short nightly.graphty.app`
   answers.
7. **Site repositories.** _When:_ step 1; the custom domain at step 7. Create public
   graphty-org/graphty-nightly; on it and on graphty-site add the deploy keys the session generates
   (write) and set Pages' source to GitHub Actions. At step 7, set the custom domain
   nightly.graphty.app on graphty-nightly and enforce HTTPS. _Check:_ the first nightly deploy serves.
8. **npm.** _When:_ step 7, only after the session says the publish job declares
   `environment: release`, on a day a nightly is due. On npmjs.com, for each @graphty package's trusted publisher
   (workflow `release.yml`), set environment `release`. Create a granular token with write on
   `@graphty` and "bypass 2FA"; store it as `NPM_DIST_TAG_TOKEN` in environment `production` and its
   expiry date as repository variable `NPM_DIST_TAG_TOKEN_EXPIRES` (the round reminds you 14 days
   before it expires). For a new package, still only after its first publish fails: create its
   trusted publisher with environment `release`, never without one. _Check:_ the first `next` publish
   and a no-op `npm dist-tag add` succeed.
9. **Interim urgent release.** _When:_ steps 3 to 8, only if something must ship. Dispatch
   `release.yml -f mode=legacy` and approve its publish and graphty.app deploy in `production`.
   _Check:_ none unless used.
10. **Domain swap.** _When:_ step 8, in one sitting when the session asks. Move the custom domain
    `graphty.app` from graphty-monorepo's Pages to graphty-site; set `canary.graphty.app` on
    graphty-monorepo; enforce HTTPS on both once certificates exist. _Check:_ the site check passes
    on all three.
11. **Review owned pull requests.** _When:_ from step 3 on. A red pipeline's fix or a rollout step
    when its own `ACTION NEEDED` line asks; the rest from the round's daily list. Approve a
    `release-approvals.json` entry for a major or a new package you want published.
12. **Approve screenshots and promote.** _When:_ from step 7 (screenshots) and step 8 (promotion).
    Decide the offered nightly candidate's changed images and Finish; dispatch `promote.yml` (GitHub
    app or `gh workflow run promote.yml`) and approve the `production` deployment whenever you judge
    nightly good.

## 14. Owner decisions remaining

None. The last one is decided:

- **What `@experimental` promises** (owner, 2026-10-25 on #3418, repeated 2026-10-26): no contract.
  An API tagged `@experimental` may change or disappear in any minor release; consumers opt in
  knowingly, and changing it is not a breaking change. `check-features.mjs` therefore allows
  experimental items in the API report.

Everything else is decided in this document and reversible by a pull request.

## 15. Deletion list

Deleted in step 10 (one owner-reviewed pull request, after steps 5 to 8 pass and 7 days without an
undo), unless noted. Detail and line counts: migration sections 4 and 5.

- **Tools:** `tools/land.mjs`, `verify.mjs`, `branch-sync.mjs`, `push-queue.sh`,
  `queued-push-guard.mjs`, `prepush.sh`, `prepush-source-checks.sh`, `prepush-tests.mjs`,
  `prepush-inputs.mjs`, `shard-verdict.mjs`, `gate-snapshot.sh`, `push-base.mjs`, `wait-log.mjs`,
  `visual-preview.sh`, `ship-risks.mjs`, `test-ledger.mjs`, `test-quarantine.mjs` and
  `test-quarantine.json` (after their logic moves to the results store), with their tests.
- **Workflows and ci.yml parts:** `golden-verify.yml`, `visual-seed.yml`; ci.yml's Mergify handling,
  `Queue Checks Pass`, `Draft state` job and draft cases, `golden-cut` concurrency exception,
  `verify` input and "Reuse" step; release.yml's `workflow_run` trigger; hosts.yml's nightly cron
  (step 6); the Mergify freeze calls in `tools/master-guard.mjs`; the old `visual` capture job per
  project (step 9).
- **Branches, tags, worktrees:** `golden`, `golden-cut`, `golden-verified`, `golden-candidate`,
  `golden-cut-candidate`, `golden-bisect-1`, `golden-bisect-2`, tag `golden-good`; worktrees
  `gate-live`, `land-live`, `golden-local`, `golden-cut`, `golden-bisect-*`, `land-check-*`,
  `check-golden-*`; `live-tools.json` entries `gate` and `land`; githerd's 7 worktrees, its
  `live-tools.json` entry, `githerd-dev` server and MCP registration (its source stays).
- **Local state:** `tmp/golden/`, `tmp/push-gate-logs/`, `tmp/prepush-passes/`, `tmp/test-ledger/`
  (after import).
- **Instructions:** CLAUDE.md's "Landing changes (golden-local)", "Verification after landing", the
  gate and land parts of "Where a change takes effect" and their tools-table rows (about 9,000 words),
  replaced by "Shipping a change"; the golden, freeze-golden, push-queue and deploy-blocker memory
  entries marked superseded.
- **Net:** about 12,300 pipeline lines deleted against at most 6,450 added, moves counted on both
  sides; a component over its cap is cut before it lands.

Kept: the selector, quarantine rules (in the store), visual-review, the release scheduler, release
holds and announcements, `worktree-new.sh`, `branch-note.mjs`, `branch-push.sh`, `no-copy.sh`, the
secret scan, the slot tools for local runs, the status broker, SonarQube and `worktree-cleanup.mjs`.
