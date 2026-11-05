# Channels and promotion: canary, nightly, production

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

Status: design, 2026-10-24. Issue #3418. Part of the channels pipeline design
(`design/ci/channels-pipeline/`); the pull request checks, the Cloudflare test store, stories as tests,
feature flags and CI time budgets are their own sections and are only referenced here.

## 1. The shape in one table

graphty ships through three channels. Each is one public site and one npm dist-tag, and each holds
exactly the bytes the channel before it held.

| Channel    | Site (GitHub Pages) | Site repository                                     | Git ref              | npm dist-tag | Moves when                                                                                                                   |
| ---------- | ------------------- | --------------------------------------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| canary     | canary.graphty.app  | graphty-org/graphty-monorepo (its own Pages)        | `master`             | none         | every green master build, minutes after a pull request merges                                                                |
| nightly    | nightly.graphty.app | graphty-org/graphty-nightly (new, built files only) | `channel/nightly`    | `next`       | a green 6-hour full run: automatically when no screenshot changed, after the owner's signed screenshot approval when one did |
| production | graphty.app         | graphty-org/graphty-site (exists, built files only) | `channel/production` | `latest`     | only when the owner triggers it and approves the deployment                                                                  |

Code lives only in graphty-monorepo. The two site repositories hold a small deploy workflow and a
`deployed.json` log, nothing else. A version number is created once, at nightly, and the same
number moves to `latest` at production; nothing is rebuilt after canary.

Why this shape, against the record:

| What went wrong                                                                                                                                                                                                                                                        | What this design does instead                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| graphty.app deployed every green master build while master ran no tests, so the live site and docs described code the T4, Hosts, macOS and LLM lanes had not passed (issue #3318: graphty.app on master `a870943` while npm `latest` stayed on graphty-element 3.30.0) | graphty.app and npm `latest` move only together, by one promotion of a nightly that passed every lane                     |
| A landed change was visible nowhere until its cut reached master; the last four cuts took 14.6 h, 11.6 h, 2.2 days and 16.3 h                                                                                                                                          | canary shows a merged change within one master build (about 25 minutes today, about 8 once the Build regression is fixed) |
| The release train ran 12 empty attempts in a row (2026-10-21 to 10-23) because master did not move                                                                                                                                                                     | the full run tests master's tip; a slot with nothing new, or only release commits, does nothing                           |
| Each cut needed 3 to 6 screenshot Finish rounds; in 29 of 53 CI runs the only red job was "waiting for the owner"                                                                                                                                                      | screenshots are decided once per nightly candidate, and "waiting for the owner" is a state, never a red run               |
| Rebuilding for release ships code nobody tested (Mozilla's release-promotion lesson)                                                                                                                                                                                   | canary's assembled site and the full run's builds are the same artifacts nightly and production serve                     |
| One account for owner and agents, so "only the owner may promote" was a rule, not a control                                                                                                                                                                            | production promotion waits on a GitHub environment the owner alone can approve; agents act as a separate machine account  |

## 2. What each deploy contains

Every site is assembled once, by `tools/assemble-pages-site.sh` in `deploy-pages.yml`, from one
master commit's push build, and the tarball is identical on all three sites: the graphty app, the
VitePress docs with the API pages, the seven Storybooks, the algorithms and layout demos, the hosted
datasets under `/data/graph-samples/v1/` (`graph-samples/scripts/build-hosted.mjs`), and the build
stamp `<meta name="graphty-build" content="commit=<sha> release=<tag>">`. The last deployed
github-pages artifact measured 373 MB (2026-10-24); the hosted datasets are under 1 MB.

What differs per site is runtime configuration, never the build: `/site.json`, copied by each
site's deploy step from `graphty/sites/<site>.json` in this repository (features section 5.1 gives
its fields). Promotion and `config_only` redeploys read the file from master's tip at dispatch, so a
change is an ordinary pull request (nightly's and production's are code-owned); the blob id used is
recorded in `channel.json`.

**Datasets and the npm package.** A published graph-samples defaults to
`https://graphty.app/data/graph-samples/v1/` (`DEFAULT_DATASET_BASE_URL` in
`graph-samples/src/datasets/remote.ts`). Because `next` and `latest` carry the same version, that
default cannot point anywhere else. So production's `/data/` is append-only and a superset: each
production promotion overlays every dataset file of the promoted tarball onto the data production
already serves, by file type (`tools/dataset-overlay.mjs`, with a test over two real
`build-hosted.mjs` outputs, one of which adds a dataset):

- `index.json` is merged: the union of entries by name; for a name in both, the promoted entry wins
  only when it points at a path that is new to production.
- Thumbnails (`*.webp`) may be replaced.
- A `.gsnp.gz` whose gunzipped bytes equal production's counts as unchanged (a zlib or level change
  alone moves nothing); production's file is kept.
- A real content change to an existing dataset needs a new path (a new name or a `v2` directory),
  never an overwrite; a `.gsnp.gz` with different gunzipped bytes at an existing path fails the step
  and names the dataset, which is a bug in that change, fixed forward.

The cost: a `next` consumer on the default URL gets a 404 for a dataset newer than production until
the next promotion.

## 3. Where the built files live

A 373 MB site committed to git four times a day would pass GitHub's 1 GB repository guidance
within days, so sites are kept as release assets, not in git:

- The `land` job (environment `release`) pushes the `site-<sha>` tag in the same atomic push as the
  version tags, with the release deploy key (tags are protected; main section 6.3). The `site` job
  then creates a public prerelease on that existing tag with `GITHUB_TOKEN` (`contents: write`),
  attaches `site.tar.zst` (the canary tarball of that commit, byte for byte) and `channel.json`, and
  writes both files' sha256 to the store with its OIDC token (master only, so a trusted record).
- It then pushes one small `deployed.json` (tag, sha256, time, approver) to the site repository with
  that repository's deploy key (secret `NIGHTLY_SITE_DEPLOY_KEY` in environment `nightly`,
  `PRODUCTION_SITE_DEPLOY_KEY` in `production`). That push starts the site's `deploy.yml`, which
  downloads the asset, refuses it unless its sha256 equals `deployed.json`'s, unpacks it, overlays
  `data/` (graphty-site only), writes `site.json`, runs `actions/upload-pages-artifact` and
  `actions/deploy-pages`, and posts its outcome to the store (kind `deploy`, the site repository's OIDC
  token, fail open). The job that pushed `deployed.json` ends on that report, or on the public build
  stamp naming the commit, never on a timer (its `timeout-minutes` is only a hang guard); a failed or
  missing deploy fails the job, which `release-watch.yml` announces with a `priority:critical` issue and
  Pushover. `deployed.json`'s history is the audit log. No GitHub App is involved.
- **Assets are not trusted by themselves.** A Write collaborator can replace a release asset, so
  `promote.yml` and every `deploy.yml` compare the asset with the sha256 the nightly job wrote to the
  store (promote.yml) or into `deployed.json` (deploy.yml, which agents cannot write) and refuse on a
  mismatch. The owner also turns on immutable releases once a test release shows that
  `gh release edit --prerelease`/`--latest` still work on one.

Retention: assets that reached production are kept for good; other nightlies are pruned to the
newest 40 (about ten days) by the nightly job.

`channel.json`, the record of one promotion (also a row in the Cloudflare store):

```json
{ "channel": "nightly", "commit": "<candidate sha>", "versionCommit": "<chore(release) sha>",
  "versions": { "<every released project at the version commit>": "<its version>" },
  "fullRun": "<release.yml run id>", "screenshots": "unchanged" | "approved:<baselines tree>",
  "siteConfigBlob": "<blob id of graphty/sites/<site>.json>", "autosaveFormat": 1,
  "siteSha256": "<hex>", "promotedAt": "<iso>", "promotedBy": "auto" | "<github login>" }
```

`versions` lists every released project, changed or not, so `promote.yml` can diff it against npm's
current `latest`: promoting a later nightly after skipping earlier ones moves every package whose
newest version came from a skipped one. `autosaveFormat` is graphty-element's autosave and project
format version at that commit (section 10).

## 4. Canary

`deploy-pages.yml` keeps its trigger (CI completed on a master push) and its assembly steps. It
changes in three ways:

1. Its custom domain becomes canary.graphty.app, at the domain swap (rollout step 8). From rollout
   step 3 until then it assembles but does not deploy, so graphty.app stays on the commit release
   #3318 shipped and no unapproved build reaches production during the rollout.
2. It always uploads the assembled tarball as an artifact `site-<sha>` with `retention-days: 14`,
   even when it skips the deploy because a newer commit is live already.
3. It writes canary's `site.json`, and records in the store that commit's green build and its
   `site-<sha>` artifact (the full run's candidate list).

**Links.** `tools/check-links.sh` resolves `https://graphty.app` links against canary's next
deploy, built from the same tree production will get. Because graphty.app lags canary,
`links-weekly.yml` treats a 404 on graphty.app for a path the newest nightly serves as "pending
promotion", listed in its issue, not as dead.

## 5. The 6-hour full run

`release.yml` keeps its name and its trusted-publishing entries. It becomes the full run plus the
nightly promotion.

**Schedule.** The Cloudflare Worker in `tools/release-scheduler/` keeps its cron
(`0 0,6,12,18 * * *`) and its dispatch; only the input gains `mode: "full"`.

**Which commit.** The pick job takes the newest master first-parent commit whose push run of
ci.yml is green and whose `site-<sha>` artifact exists, as `deploy-pages.yml` recorded them in the
store, and freezes it for the attempt. This needs no live site, so it works from rollout step 6,
before canary.graphty.app exists; after step 8 canary's build stamp is only a cross-check (the Pages
CDN may serve a stamp up to 10 minutes old). The slot does nothing when the store says a full run
already judged that commit, or when every merge since the last judged commit is a release-version
merge, or an accept merge (only `visual-baselines/` and `visual-review-approvals/`) on top of a judged
commit, that `tools/release-diff.mjs` proves changes nothing else; the store records the commit as
judged by inheritance. Up to four promotions a day each push such a merge, and none of them is worth
a T4 hour.

**What it runs, in parallel, on that commit:**

| Lane                                                      | Workflow                                            | Measured                                         |
| --------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Every test shard and the full screenshot capture          | `ci.yml` (called, reusing the master build)         | 38 to 48 min today with a 21 to 24 min Build     |
| NVIDIA T4 GPU tests and benchmarks                        | `gpu.yml`                                           | 38.8 to 50.7 min, the longest                    |
| Hosts: Dawn on Metal and WebKit, D3D12 WARP and Chromium  | `hosts.yml` (full scope)                            | 42.4 to 42.6 min on Windows                      |
| macOS work protection: WebKit, Safari, Safari on iOS      | `work-protection-macos.yml`                         | under 40 min                                     |
| Production dependency audit                               | `audit` job, `pnpm audit --prod --audit-level=high` | 1 min                                            |
| LLM regression (about 190 paid Gemini calls, about $0.94) | `llm` job                                           | about 10 min                                     |
| Version and major-bump dry run                            | `version-dry-run` job                               | 29 s to 29 min today; budget 5 min after the fix |

**Measured time.** The two real train runs took 64.7 min (39540908824) and 92.8 min (40119894804).
In the second, `pick`'s "Skip when nothing releasable changed" step (`tools/release-version.sh`, nx
release over every project) took 29 minutes, in front of every lane: affected-project resolution
plus projects with no tag (fidelity-web-oracles and graph-io-fidelity fell back to 0.0.0 and scanned
the whole history). So that check leaves `pick` and becomes the `version-dry-run` lane, which also
plans the major-bump check; every project gets a starting tag, so no scan is unbounded; and the step
has its own budget key. "CI / Performance Benchmarks" (19.5 to 23.6 min, `needs: test`, red in both
runs, last to finish at 91.3 min) becomes `needs: build`, outside the verdict, and files its own
issue on a regression. The honest critical path is then the T4 or Windows Hosts plus pick: 60 to 75
minutes, and `run:release.yml:full` (75) warns past it.

**Build reuse.** `ci.yml` gains the input `reuse_build_run`: the full run passes the master push run
that built the candidate, and Build downloads those `build-*` artifacts instead of building when they
exist ("unknown means run"). The master push build's `retention-days` goes from 1 to 14.

**Runners.** `max-parallel` limits only one matrix, so the plan counts every workflow against
Team's 60 Linux and the organization's 5 macOS jobs (today's full CI already peaks at 30 of 42 jobs,
run 40051811635):

| Load                                                                                         | Linux jobs at peak                  | macOS |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ----- |
| Full run: test matrix (`max-parallel: 28`)                                                   | 28                                  | 0     |
| Full run: Stories shards, Checks, Lint, Docs, Links, Storybooks, Performance, lifecycle, LLM | about 12                            | 0     |
| Full run: old visual jobs (stories migration only)                                           | 7                                   | 0     |
| Hosts (Windows on its own runner class) and macOS work protection                            | 0 Linux                             | 4     |
| Bisect (`max-parallel: 8`, starts when the ci lane ends)                                     | 8                                   | 1     |
| Pull requests (40 a day, about 3 open light checks at once, up to 6 jobs each)               | 18                                  | 0     |
| Total at the worst moment                                                                    | about 73 in the migration, 66 after | 5     |

So the worst moment queues a few jobs for minutes, and only during the stories migration.
Each On shard starts when its Off twin ends (`needs` per pair, not after all of them), so runners are
released continuously; the two-wave ci lane is measured in step 6 before `run:ci.yml:full` is set.
Every job's queue time is recorded and pull-request queue time in a full-run window has its own
trend key (`queue:pr:full-window`), so queueing shows as queueing. A restart is a full run too: with
8 of 17 recent verifications red, plan for about 6 full runs a day.

**LLM regression** runs in every release test of a candidate (owner, 2026-10-29, #4469): modes
full (each of the four slots), restart and candidate, and the owner's shadow and legacy runs; never
promote-nightly, which tests nothing, a pull request or a master push. The `llm` job `needs` the
ci.yml lane and runs when it is green (off the critical path, since the T4 lane is longer), in the
Off configuration only. A restart's failing-tests phase and a slot skipped as judged run none. At
about $0.94 a run and 4 to 6 full runs a day, about $113 to $170 a month, over the owner's
standing ceiling of about $60 until he sets a new one; `tools/llm-spend.mjs` counts the month's paid
runs before each one, and `spend:llm` warns at $60
(main section 9). A red LLM lane: at most 2 confirm runs; a model answer that differs between them is an
`owner-item` (or flaky, by the usual rule), never bisected blind; a consistent failure bisects only
over merges that touched graphty-element's AI code, prompts, schemas or the lockfile, with one paid
run per point, each dispatch checked against the month's spend first and refused at the ceiling.

Each lane records its results in the Cloudflare store; Coveralls stays advisory.

**Verdict.** One job, `verdict`, reads every lane's result and the capture and ends in one of four
states, written to the store and announced by `tools/release-status.mjs` on the `Release status`
issue and through Pushover:

- `green-clean`: every lane passed and no screenshot differs. Promote to nightly now (section 7).
- `green-images`: every lane passed, some screenshots differ. Wait for the owner (section 7).
- `red`: a lane failed. Section 6.
- `owner-item`: a lane failed for a reason no code change fixes (section 6's table), or the dry run
  plans a major bump. Announced once; not bisected.

**A planned major or a first publish.** The dry run lists every project that would publish a major
(a `!` commit or a `BREAKING CHANGE:` footer reached master; PR Integrity should have stopped it) or
its first version (npm sets `latest` on a package's first publish even under `--tag next`). Each
needs an entry in `release-approvals.json` (code-owned, so its pull request is the owner's approval):

```json
{
    "approve": [
        {
            "project": "graphty-element",
            "kind": "major",
            "merge": "<sha>",
            "approval": "<url of the owner's approving review>",
            "since": "2026-11-02"
        }
    ]
}
```

Without one, the `version` job holds that project alone for this nightly (`release-hold.mjs apply`
with the dry run's list; a hold, never an exclusion), the verdict reports it as an owner item, and
every other project promotes. An entry is used once: the publish that consumes it removes it in the
version commit. Nothing lowers nx's bump once the commit is on master, so the other recovery stays a
version plan, as graphty-element 3.1.0 used. The grouped major (#676, #702, #843, #1370) has no entry
and stays held.

**Restart on fix.** While a `red` state is open (issue "Full run red: <lane> on <sha>"), a green
master build whose merge references that issue (`Refs #N`, `Fixes #N`) or is the round's revert for it
makes ci.yml's `release-due` job dispatch release.yml with `mode: restart`. A restart first runs only the
previously failing tests on the new tip; only when they pass does it run the full run there. Other
merges wait for the next slot.

**Concurrency.** release.yml keeps `concurrency: release-train` (no cancelling), which holds one
running and one pending run; a newer pending run replaces the older, silently. So release.yml loses
its `workflow_run` trigger: the last job of ci.yml's master push run, `release-due` (no concurrency
group), reads the store and the open red issue and dispatches release.yml only when a restart or a
resume is due. And every release.yml run starts by catching up, whatever triggered it: it resumes an
approved awaiting candidate (section 7), then runs the slot if canary's commit is unjudged. A
scheduled slot, a hotfix dispatch or a resume that the group replaces is therefore done by the run
that replaced it. A test of the router queues two runs behind a running one and checks the survivor
does the work of both.

**Holds.** A publish hold does not stop the slots (they test canary); promoting a new version set to
nightly waits until the hold is cleared, and the verdict says so.

## 6. Red: bisect, revert, fix forward

The pipeline round owns every red full run; release.yml starts the bisect. The Worker decides
nothing (results section 2.1).

1. **Dispatch.** release.yml dispatches `bisect.yml` (`workflow_dispatch` on master, with
   `GITHUB_TOKEN`'s `actions: write`) once per full run, with `good`, `bad` and the run id;
   `concurrency: bisect-<bad sha>`. A `bisect-ci` job (`needs: ci`, `if: failure()`) does it when the
   ci.yml lane ends red, about 45 minutes in; the verdict job does it for a red GPU, Hosts, macOS or
   LLM lane. The same job files "Full run red: <lane> on <sha>". Tests broken later are appended in
   the store, and each bisect phase reads the current list. The round dispatches a bisect only when
   the store shows a red verdict with no bisect record, or cannot be reached.
2. **Confirm.** Re-run only the failing test files on the red commit, 5 times, on the lane's own
   runner class and under the full run's own load, under the rules moved from `tools/verify.mjs`
   into `tools/bisect-core.mjs`. A browser or Storybook file's repetitions run one after another in
   one job (those projects set `fileParallelism: false` because parallel mounts made waits run out);
   Node files run in parallel processes capped at `workerShare()`. The parallelism and the runner's CPU
   count are in the inputs key, so a bisect run is never "the same inputs" as a run under other load:
    - fails 5 of 5: a consistent failure, bisect it;
    - passed and failed on this commit with the same inputs: flaky. If the store has a failure of the
      same test before the range, it was flaky before: quarantine it and file a `priority:critical`
      issue naming the range's merges as suspects, never bisected or reverted. If not, it is newly
      intermittent, a regression: bisect it, a point being bad when it fails at least 1 of 5.
3. **Bisect** over master's first-parent merges between the last green full-run commit and the red
   one (`git rev-list --first-parent <good>..<bad>`). With 16 points or fewer (about 4 per slot today,
   10 at 40 merges a day), every point is one matrix job (`max-parallel: 8`), its repetitions under
   the confirm phase's conditions, reusing that merge's master build (14 days). A point costs about 4
   minutes of setup plus 5 runs of the failing files (20 for the parent of a newly intermittent
   test), so a 16-point bisect takes about two waves, 20 to 30 minutes. More than 16 points: halving
   rounds of 16.
   The culprit is the first bad point whose parent passes all 5 runs; for a newly intermittent test
   the parent needs 20 passes (5 passes clear a bad parent with probability 0.33 at a 20% failure
   rate). Otherwise no merge is named and the issue says why. A failure that needs two merges names
   the later.
4. **Revert.** The round opens `git revert -m 1 <culprit merge>` as a pull request from the machine
   account, body `Refs #<red issue>` and a Proof naming the red run, unless the store already records
   an open revert for that culprit. It is exempt from Proof, fresh review and test integrity as a
   mechanical revert (main section 6.4) and auto-merges on the light check. Its merge starts the
   restart (section 5).
5. **Fix forward** on an ordinary branch when a revert conflicts or the fix is smaller. The fix never
   changes a test expectation, a timeout, a quarantine entry, a threshold, a budget or a workflow in
   the same pull request.

**Failures that name no test** are bisected by the job that failed, at each point:

| Failure                                                     | Judged at each point by                                   |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| A test (outcome `failed`)                                   | the failing test files, 5 runs (above)                    |
| An unhandled error (outcome `error`)                        | the whole shard once, evidence "judged by 1 run"          |
| A coverage threshold                                        | the shard with coverage, once                             |
| Network links, Cost Estimate Accuracy, Docs, Build, budgets | that job, once, evidence "judged by 1 run"                |
| GPU (T4)                                                    | the local NVIDIA card first, then `gpu.yml` with a filter |
| Hosts, macOS                                                | their own runners, through the same filter input          |
| LLM regression                                              | the LLM rule of section 5                                 |

**Lane bisects.** `gpu.yml`, `hosts.yml` and `work-protection-macos.yml` gain the inputs `files`
and `tests` (a filter on what runs) and `bisect_point`; a run with `bisect_point` set uses
`concurrency: bisect-<sha>-<point>` instead of the lane's own group, so it neither waits behind nor
cancels the full run's lane. The T4 is one machine: its points run one after another, after the
full run's own T4 job, at most 4 paid T4 hours per bisect (stopped and reported past that). Hosts and
macOS points run up to the free macOS slot (one at a time during a full run). Each of these
workflows, and the lifecycle and LLM jobs, runs its tests through `tools/results/run-group.mjs` with an
inputs key that names the runner class, the GPU adapter (from the adapter info the tests already
print) and the OS image, so their records are the evidence the flaky-before-the-range rule reads.

The GPU bisect on the local card is the one bisect the pipeline round runs, and only when
`bisect.yml` records `gpu: local` (the T4 failure reproduces on no hosted runner). These go to the
round with no bisect: outcome `infra` (a killed runner), an `owner-item`, and a red that the last
green commit also fails (the environment changed: a runner image, an outside service, the date).

**Time to green** (red verdict to the green restart) is the budget key `ttg:full`, starting at 3
hours; time a fix's pull request waited for the owner's code-owner review is recorded as
`ttg:owner-wait`, so the alarm tells waiting for the owner from slowness. Such a fix gets its own
`ACTION NEEDED` line the moment it is green (main section 6.2). The rest: bisect about 10 to 20 minutes, the revert's light check 10 to 20, the master build about 10,
the restart's failing tests and full run 60 to 75.

Reds no code fixes, handled as `owner-item` or by existing tools:

| Cause                                                                 | Handling (existing file)                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| T4 spot runner lost                                                   | `gpu-rerun-on-runner-loss.yml` re-runs the lane on the same run                                     |
| npm slow to list an accepted version                                  | `tools/publish-hold.mjs settle` closes the hold on the next run                                     |
| High advisory with no patched version (#3393)                         | owner item; release past it only by a reviewed `pnpm.auditConfig.ignoreGhsas` entry with the reason |
| Google refused the key or balance                                     | the `llm` job's `owner_item` output, as today                                                       |
| A pipeline tool failure (#3318: nx could not build its project graph) | `red` on the tool, fixed forward; the lane's own tests are not blamed                               |

## 7. Promotion to nightly

**green-clean** runs at once in the same release.yml run, after the verdict job has run the gate
`gate --base channel/nightly --head C` on C's capture: C's `visual-baselines/` tree must equal
nightly's or carry a passkey-signed statement of exactly that tree, so a baseline committed without
the owner never reaches nightly as "unchanged". **green-images** waits: the review page offers the
oldest unpromoted green-images candidate C and freezes it. A newer candidate that reaches
`green-images` queues behind C and is offered only once C is promoted or rejected; decisions carry
over by image hash, so the owner never decides the same bytes twice. A newer `green-clean` candidate
still promotes at once and does not unfreeze C. The owner reviews and presses Finish; the review
server (running as the agent account) commits accept commit A, parented on C, on branch
`visual/approve-<C short sha>`, and opens a pull request to master touching only `visual-baselines/`
and `visual-review-approvals/`. PR Integrity exempts it from Proof, fresh review and test integrity,
because the passkey-signed approval is its proof and the gate judges it. Its merge makes the router
dispatch release.yml, whose catch-up step finds the approved candidate and resumes it with no
re-test. A Finish on C promotes C when C is newer than `channel/nightly`, whatever arrived after it;
an older C is recorded as approved, promotes nothing, and the next queued candidate is offered. A
rejection drops C and offers the next queued candidate, with every rejected image still rejected by
hash.

**The resume step proves the approval** by running the owner's gate unchanged on C's own full-run
capture against A's baselines: A's PNGs are byte copies of C's captures, so the gate sees every
approved image as `unchanged` (`capture_sha == baseline_sha`), and passes only with a passkey-signed
statement of exactly A's baselines tree. The gate and capture code come from master's tip at the
full run's start (`git archive <tip> visual-review/trusted visual-review/capture`), whose blob ids go
into `channel.json`; both paths are code-owned, so master's copy is no less trusted than nightly's,
and a fix to them takes effect at the next run instead of waiting for a promotion it may itself be
blocking. The first full run takes them from the flushed master. Nothing is
re-rendered: the accept pull request's own story run renders master's newer code, which may differ
for reasons unrelated to C, and is reported, not used. The step is new code beside the gate, not an
edit of it, and is code-owned.

**The promotion steps** (reused from today's release.yml jobs, in this order):

1. `version` job: `tools/release-hold.mjs apply` (with the dry run's held list), then the version
   commit from the `version-dry-run` lane's plan (its output commit, so the 29-minute nx scan does not
   run twice), then `tools/release-diff.mjs` to prove the commit changes only version fields and
   changelogs. Budget 5 min.
2. `land` job (environment `release`): merge the version commit into master's current tip and push
   it with one `{project}@{version}` tag per package and the `site-<sha>` tag, atomically, with
   `RELEASE_DEPLOY_KEY`, plus a fast-forward of `channel/nightly` to the version commit.
3. `publish` job (environment `release`): `nx release publish --tag next`, trusted publishing, the
   existing check that every version is on npm, then `gh release edit <tag> --prerelease --latest=false`
   for each new GitHub release, because nx marks a release as prerelease only for a semver prerelease
   and would make a plain `next` version "Latest".
4. `site` job (environment `nightly`): the prerelease on the existing `site-<sha>` tag and the
   `deployed.json` push of section 3, ending on the site's deploy report. Budget 10 min; the whole
   promotion `run:release.yml:promote` 20 min.

A failure before step 2 leaves nothing behind and the state goes to `red` on the release machinery.
A failure in step 3 after the push is today's publish hold, cleared by `gh run rerun <id> --failed`.
A failure in step 4 re-runs alone; the job's issue says npm `next` and the nightly site differ meanwhile.

**Plain versions under `next`.** npm (npm-pick-manifest) and pnpm prefer the `latest` dist-tag's
version whenever it satisfies the range, so a caret-range consumer stays on production versions on a
fresh install. Yarn classic and other resolvers may pick the highest version instead; the
installation docs say so and recommend an exact version on those clients. At most four versions a
day per changed package.

## 8. Promotion to production

**Trigger.** `promote.yml` (workflow_dispatch; input `nightly`, default the newest; inputs
`channel` (`production`, the default, or `nightly` for a nightly rollback), `dry_run` and
`config_only`). Its job runs in environment `production`: required reviewer the owner,
"prevent self-review" off, deployments only from `master`. "Prevent self-review" would refuse the
owner's approval of a run he dispatched himself, and the agent account is not a reviewer, so the
owner's approval is already the control. Anyone may dispatch it (the owner from the GitHub mobile
app, or an agent when he asks); it does nothing until he approves the pending deployment, signed in
as himself. No passkey is needed: every nightly's images were approved or unchanged, and the
promotion moves nothing new.

**Steps**, each idempotent, so a re-run finishes a partial promotion:

1. Read `channel.json` and the store's record; refuse when the release asset's sha256 differs from
   the store's (an asset replaced after the nightly), and unless the full run was `green-clean`, or
   `green-images` with an approval, no publish hold is open, and every listed version is on npm.
   Refuse a rollback (a nightly older than production's) whose `autosaveFormat` differs from
   production's (section 10).
2. Before moving anything (a dry run too): for every package the plan moves, exchange the job's OIDC
   token with npm and re-set the tag to the version it already has (`promote.mjs trust`), a write that
   moves nothing, so a missing `promote.yml` trusted publisher or an unticked "Allow npm dist-tag" fails
   before the first tag moves.
3. For each package whose `latest` differs from `channel.json`, `npm dist-tag add <name>@<version>
latest` with npm trusted publishing (OIDC, npm 11.21.0 or later): no stored npm token. Each package has a
   second trusted publisher, workflow `promote.yml`, environment `production`, "Allow npm dist-tag" on and
   direct `npm publish` off (npm matches the workflow that starts the run, so release.yml's publisher
   cannot serve it). A failure part way leaves some moved; the re-run moves the rest.
4. Overlay production's datasets (section 2), push `deployed.json` to graphty-site with
   `graphty/sites/production.json` read from master's tip (its blob id into `channel.json`), and wait
   for its deploy report (section 3). npm moves first, so the docs describe a version `latest` does not install for at
   most the minutes the deploy takes.
5. Clear the prerelease mark on those packages' GitHub releases and mark the newest "Latest", append
   "Changes since <previous latest>" from the version commit's changelogs, write `channel.json` with
   `promotedBy` the approver.
6. `channel-ref` job (environment `release`, `needs:` the approved job): fast-forward
   `channel/production` with `RELEASE_DEPLOY_KEY`. The deploy key never leaves `release`.

`config_only` skips steps 3 and 5 and redeploys production's current tarball with the current
`production.json`: a feature switched on or off for production readers with no new code.

## 9. Hotfix and rollback

**Hotfix** (decided here; reversible), also the path for a security advisory: the fix merges
through its own pull request like any change. If canary is red for another reason, the round
reverts that culprit first (section 6), so the hotfix run tests master after those reverts. The
owner decides canary's pending screenshots on the review page (he is the one promoting), then
dispatches `gh workflow run release.yml --ref master -f mode=full`; green promotes to nightly, and he
dispatches `promote.yml`. It ships everything canary holds, every bit of which that full run passed.
There is no hotfix branch: versions come from master's history as always, so nx's tags stay
reachable from master. End to end about 2 hours: light check 10 to 20 minutes, the master build, the
60 to 75 minute full run, two approvals.

**Rollback of production**: dispatch `promote.yml` with the previous nightly. It moves `latest` back
and redeploys that tarball; the dataset overlay keeps every dataset. The bad versions are also
deprecated (`npm deprecate <name>@<version> "<reason>"`, by the owner from his own npm login: trusted
publishing does not cover deprecate), because npm skips a deprecated
version when it picks a range's best match, so a consumer resolving past `latest` (another client, an
explicit range) does not land on it. The real fix ships as the next patch through the hotfix path.

**Rollback of nightly**: usually unnecessary, because the revert and the next green run supersede
it. Otherwise `promote.yml` with `channel: nightly` moves `next` back behind the same approval (only a job in
environment `production` matches the packages' `promote.yml` trusted publishers), and a following job in environment `nightly`
redeploys the earlier nightly tarball; `channel-ref` moves `channel/nightly`.

**Rollback of canary**: revert on master.

## 10. Autosave and saved work across sites

graphty-element's autosave keeps a reader's work in IndexedDB (`graphty-element/src/autosave/indexedDbStore.ts`,
`DB_VERSION = 1`), and AI credentials (`graphty-element/src/credentials/`) live in the same origin's storage. canary.graphty.app,
nightly.graphty.app and graphty.app are three origins.

- **Isolation is intended.** A reader's saved work and keys stay on the site they used; trying
  nightly does not touch production work. The app shows the site name from `site.json` in its header,
  so a reader can tell where they are. A reader who wants work on another site exports a project
  file and opens it there, the existing path.
- **Forward compatibility.** A change to the autosave records or the project format must leave data
  the previous production build can still read, or that build must refuse it without changing it
  (graphty-element's own rule, since a third-party consumer meets the same rollback). A raised
  `DB_VERSION` makes an older build's `open()` fail with `VersionError`, so the element handles that
  error as "saved by a newer version": it reports `{ code, params }` and leaves the database alone.
- **Tested.** A full-run test in the lifecycle shard opens a database written by the candidate with
  the current production build (its tarball from `channel/production`) and checks it reads it or
  refuses without writing.
- **Rollback.** `promote.yml` refuses to roll production back across a change of `autosaveFormat`
  (section 8); such a rollback is a fix forward instead.

## 11. Holds

- **`release-hold.json`** stays. Applied in the nightly `version` job; a held package gets no nightly
  version, so production never moves its `latest`.
- **Publish hold** stays (`tools/publish-hold.mjs`, `release-watch.yml`). Slots still run while it is
  open; nightly promotion of a new version set and `promote.yml` wait for it to clear.
- **Train hold** becomes the `red` state's issue, "Full run red: <lane> on <sha>", labels `bug`,
  `priority:critical`. Slots no longer skip while it is open: canary's new commit may hold the fix.

## 12. Access and identities

Superseded by main sections 6.1 to 6.3 (the agent account, the narrow CODEOWNERS list, rulesets,
protected tags, master-only environments, trusted publishers bound to environment `release`).

## 13. What release.yml becomes, and what is deleted

release.yml keeps `pick`, `ci`, `t4`, `hosts`, `autosave_macos`, `audit`, `llm`, `coverage`,
`version`, `land` and `publish`. It gains `mode` (`full`, `restart`, `promote-nightly`; `scheduled`
stays), the catch-up step, `version-dry-run`, `verdict`, `site` and `--tag next`, and loses its
`workflow_run` trigger. `held` becomes the `red` and `owner-item` reporter.

New files: `.github/workflows/promote.yml`, `bisect.yml`, `base-check.yml` (results section),
`tools/bisect-core.mjs`, `tools/dataset-overlay.mjs`, `release-approvals.json`,
`graphty/sites/*.json`, and in each site repository `deploy.yml`. `release-router.yml` is not built:
ci.yml's `release-due` job does its work.

Deleted or retired in this area: `golden-verify.yml` and `tools/verify.mjs` (rules to
`bisect-core.mjs`); release.yml's restart-on-any-push and skip-while-held; `deploy-pages.yml`'s role
as graphty.app's deploy; `promote-pages.yml`, `tools/pages-builds.sh` and the `site_data` job on
branch `ci/3267-site-flip` (commit 0701dead02), and branch `ci/3267-beta-site`, closed as
superseded (the dataset-overlay idea is kept); pull request #1942 (`NIGHTLY_ENABLED`), closed as
superseded; `land.mjs cut`, `cut-fix` and `ship`, with the rest of the golden machinery.

Kept unchanged: `release-watch.yml`, `gpu-rerun-on-runner-loss.yml`, `master-guard.yml`, the release
tools named above, the scheduler. Changed: `hosts.yml` loses its 05:41 UTC cron at rollout step 6
(the full run's Hosts lane replaces it, and it took macOS slots just before the 06:00 slot);
`restricted-cpu-stress.yml` writes kind `stress` to the store and files through its rules, never as
evidence; `gpu-weekly-paired.yml` compares master's tip with the production (`latest`) version.

Migration order and the owner's actions: main sections 12 and 13.
