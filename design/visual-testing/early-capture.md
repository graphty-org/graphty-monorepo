# Early screenshot capture: rolling slices and idle-time capture

Date: 2026-10-29. Issue #4540. Status: design and plan; nothing built yet.

Every story's picture is rendered fresh, from master, many times a day, in small slices that cost a
fixed few runner-minutes after green master builds and more while GitHub's runners are idle. A
changed picture reaches the owner's review page within about an hour of its merge. His approvals
land as baselines on master, so when the 6-hourly full run renders the candidate, the pictures
already match, the verdict is green-clean, and nightly promotes on its own. The full run's complete
capture stays the release gate.

## 1. Problem and goal

The release reliability review of 2026-10-29 (PR #4531; its working files are in
`tmp/release-failure-review/`, mainly `time.md`) found:

- **No full run has ever ended green-clean.** Every full run that passed its lanes held nightly as
  green-images, waiting for changed screenshots to be approved.
- **Only two nightly promotions in five days** (3ddf13da after 4 h 12 m, 42992d9 after 28 h).
- **The owner's screenshot review took 59% of candidate-to-nightly time** (19.0 of 32.2 hours over
  the two promotions). The full run itself took 8%. The approval pull request's own CI took
  another 16% (5.3 h).
- **About 1.5 picture-changing merges land per 6-hour slot** (75 to 106 merges a day, 20 to 25 per
  slot). So almost every slot carries an unapproved picture, and green-clean is close to impossible
  while approval happens only on a held candidate.

**Goal.** Changed pictures are reviewed before the full run judges the commit that holds them, so
that a candidate whose pictures the owner already approved promotes the moment its full run passes.
Without growing pull request or full-run test time, and without ever deciding anything on a picture
that was not freshly rendered from the commit it claims to show.

## 2. Decision record and rejected options

From the owner's conversation of 2026-10-29. Start any revisit here.

**Rejected:**

- **(a) Promote to nightly when the only problem is changed screenshots, and review before
  production.** Owner: "screenshots are the only way we know if our product looks right to users."
  Nightly is for users; pictures are reviewed before it. The goal is to review them earlier and
  have the approval already on record, so a candidate promotes cleanly when its run passes.
- **(b) Approving pictures by image hash** (a capture that equals an image approved before counts
  as approved). Owner: "if we add a feature, but it doesn't show up in the screenshot, that should
  be a failure not a previously good image." This design adds no hash-based approval; the gate
  always compares a fresh render with the one current baseline. (Open question 2 asks about the
  review page's existing "Approved before" filter.)
- **(c) Capturing and reviewing every changed picture at pull-request time.** It would choke CI
  with test time; pull request runs are already the bulk of runner load (section 3).
- **(d) Skipping stories whose inputs did not change** (source and import graph, assets, fonts,
  browser) and reusing earlier captures. Owner: "a non-starter: if the inputs didn't change the
  outputs might change because of a bug, that's exactly what we are trying to detect." **Every
  picture used for a decision is freshly rendered from the commit it claims to show.** This design
  uses reachability only to choose which stories to render first, never to skip one: the rotation
  renders every story regardless.

**Already exists:** grouping identical changes so one decision covers a family (the review page's
"Group similar" clusters and "Review together" for pull requests that change the same baselines).
Rolling items are shown on the same page and grouped the same way.

**Not decided (recorded, not built):**

- Each pull request declaring which stories it expects to change visually, failing both ways
  (declared but unchanged, changed but undeclared).
- An agent pre-screening the review queue that ranks items but never approves.
- Faster capture mechanics: one browser and page per worker with stories switched in-page,
  Storybook builds from the nx cache, a double render only for changed pictures (capture already
  re-shoots only changed and new items). Welcome if they never reuse a render.

**Chosen (owner: "let's implement 6"):** keep a full, current set of master's screenshots without
expanding CI test time, by

1. capturing a small rotating slice of all stories after green master builds, so the whole set is
   refreshed several times a day at a small fixed cost per build (the owner also asked whether every
   pull request could take a few; section 4a answers why master builds do it instead); and
2. detecting when CI is idle and capturing more slices then, stopping as soon as other work queues.

Changed pictures from these captures reach the owner's review queue early, grouped as today; his
Finish lands them as baselines; the full run then finds them matching.

**Constraints that bind every step:** GitHub-hosted runners only, no paid runners; runners are
already saturated at about 76 merges a day (design/ci/channels-pipeline.md section 7.1), so the
added runner-minutes are measured, capped, and yield to real work. Capture rules are unchanged:
the whole canvas, device scale factor 2, 1200 x 900 or the full scroll size, pinned fonts. Only the
owner approves pictures (Finish, signed with his passkey). Agents never touch `visual-baselines/`
or `visual-review-approvals/`, never edit `visual-review/trusted/gate.mjs`,
`visual-review/trusted/lib/approval.mjs`, `visual-review/passkeys.json` or the gate step in
ci.yml; this design needs none of them changed. CI runs the capture and gate as master has them,
so a change to `visual-review/trusted/` or `visual-review/capture/` is exercised only after it
merges. The full run's complete capture stays the release gate.

## 3. Measurements

Taken 2026-10-29 from the repository, the health dashboard
(`https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/page/ci?range=24h` and
`.../v1/page/runners?range=24h`) and 83 full-run job lists collected for the review. Raw pulls are in
`tmp/early-screenshots/`.

**Stories.** Baseline images per project (a story times its modes), 2,521 in all:

| Project              | Images | Capture rate per story (STORY_MS, all modes)            |
| -------------------- | ------ | ------------------------------------------------------- |
| compact-mantine      | 1,020  | 1.0 s                                                   |
| graph-io-fidelity    | 575    | 2.8 s; Samples 6.2 to 12 s; some Specimens 4.1 to 7.7 s |
| graphty              | 401    | 3.0 s; StartScreen 52 s, Frame and StylePanel 11.5 s    |
| graphty-element      | 299    | 2.8 s                                                   |
| cytoscape-extensions | 182    | 1.3 s                                                   |
| algorithms           | 27     | 1.2 s                                                   |
| layout               | 17     | 0.9 s                                                   |

**Capture cost of a full set.** The pull request Stories jobs pack stories into bins of 3 minutes
of capture (`STORY_BIN_LIMIT_MS` in `tools/test-select.mjs`, rates measured from PR runs of
2026-10-26 to 10-29). A change that reaches every story makes 33 bins. Each job adds about 1.5
minutes of setup (checkout, LFS baselines, install, Chromium, Storybook download) and real bins run
up to 1.23 times their plan. **A full set is about 33 jobs, 100 capture-minutes, about 150
runner-minutes.** The full run's story tests, which also run the play functions, take 129
runner-minutes over 11 jobs (medians: graph-io-fidelity 4 legs 16.6 to 18.6 m, graphty-element
15.6, graphty 6.6 + 13.9, compact-mantine 10.5, cytoscape-extensions 8.0, algorithms 3.5, layout
1.9).

**Runner load.** Limit 60 concurrent Linux jobs, which is 86,400 runner-minutes a day. Used, by
kind:

| Kind                                               | Last 24 h                    | Last 7 days, per day |
| -------------------------------------------------- | ---------------------------- | -------------------- |
| Pull request runs                                  | 30,863                       | 16,372               |
| Master builds (76 a day, about 18 runner-min each) | 1,370                        | 658                  |
| Full runs                                          | 5,459                        | 2,888                |
| Other                                              | 1,903                        | 1,627                |
| **Total**                                          | **39,596 (46% of capacity)** | **21,545 (25%)**     |

**Idle windows.** The runners page samples running and queued jobs once an hour (it answers only
`range=24h`). From 10-28 14:00 to 10-29 13:00 PDT, running jobs were 52, 28, 0, 9, 0, 0, 5, 0, 0, 1,
0, 2, 58, 5, 36, 1, 58, 60, 54, 24, 29, 25, 37, 24. Jobs queued in only 3 of 24 samples (79, 110,
120 jobs). **12 of 24 hours had 10 or fewer jobs running and nothing queued; 17 of 24 had 30 or
fewer.** The pool was saturated (a job waiting with 57 or more running) 325 minutes in the 24 hours,
in bursts. Runner wait for a job was under 5 minutes in 17 of 24 hours. One day of hourly samples is
thin: plan step 1 records a 7-day series before the budgets are tuned.

**What this means.** A full set (150 runner-min) is 0.4% of a busy day's use. The pool has about
45,000 idle runner-minutes on a busy day and spends half of most days nearly empty. The cost is
not capacity in total; it is not adding to the bursts. So: a small fixed slice that skips while the
pool is saturated, and the bulk of the rendering in the idle hours.

## 4. Design

### 4a. The rotating slice

**Where it runs: after green master builds, not in pull request runs.** A pull request run renders
its merge tree, a commit that never exists on master (master moves on before and after it merges),
so its pictures cannot make up a current set of master without breaking the freshness rule.
Pull request runs are also the merge critical path and 78% of runner load, and many are cancelled
by a newer push (99 of 244 on 2026-10-26); a fixed slice in each would add to every merge's wait
and be thrown away with every cancelled run. A master build is one per merge, off the critical
path, and its Storybooks are already built.

**How it is started.** Not as a job inside ci.yml's master build: a failing slice must never make
master red (master-guard would open a revert), and a superseded master build may be cancelled. A
separate workflow, `story-slices.yml`, `workflow_dispatch` only, takes `sha` (a commit whose master
build is green), `mode` (`base` or `idle`) and `bins`. One dispatcher (section 4b) starts it.

**What a slice holds** (`tools/channel/story-slices.mjs plan`, reusing `storyBins()` and the
`STORY_MS` rates):

1. **Reached first.** The stories the merges since the last sliced master commit can reach,
   selected by `test-select.mjs` exactly as the light check selects them. This only orders the
   work: a change shows up in review within the hour.
2. **Then oldest first.** Every other story, ordered by the time of its newest capture (never
   captured first). This is the rotation; it renders every story whatever changed.
3. Packed into bins of 3 capture-minutes; a `base` slice takes the first 2 bins, an `idle` slice
   the first 6. What does not fit is simply next in line.

Because the order comes from the store's record of what was captured (section 4c), a slice that
was cancelled, skipped or failed leaves its stories oldest, so the next one takes them. Nothing
depends on every master build getting its slice.

**Capture.** Each bin runs the built-Storybook capture with `--stories`, as the Stories jobs and
the full run's re-capture already do (the two capture paths showed zero parity differences on two
full runs). It runs on the slice commit's checkout with that commit's baselines (Git LFS) and the
pinned fonts, with master's capture code (the workflow is master's), downloading the Storybook
artifacts of that commit's master build. A changed or new item is shot twice in the job, as
today; only an item that draws the same picture twice is offered for review.

**Budget.** About 9 runner-minutes per `base` slice (2 bins of about 4.5 minutes each). Expected
50 to 76 a day, about 450 to 700 runner-minutes, 1 to 2% of a busy day. On its own this
refreshes the full set about every 8 to 11 hours; the idle slices (4b) do the rest.

### 4b. Idle-time capture and the dispatcher

**Idleness, cheaply.** The health collector (tools/pipeline-health, every 5 minutes) already
counts running and queued jobs of every unfinished run for the Runners page. It exposes
`ci.longest_queued` "now" but not the job counts; step 1 adds `ci.jobs_running` and
`ci.jobs_queued` as "now" members. Reading them is one HTTP GET of the public health API and
costs nothing from the GitHub API budget.

- **Saturated** (any job queued, or 57 or more running): start nothing.
- **Busy** (nothing queued, 31 to 56 running): a `base` slice, if master's newest green build moved
  since the last slice.
- **Idle** (nothing queued, 30 or fewer running): an `idle` slice, while some story has no capture
  of master's newest green commit; else a `base` slice if master moved; else nothing.

**The dispatcher** is the release-scheduler Worker (`tools/release-scheduler/`), which already
dispatches release.yml as a GitHub App with Actions write. A third cron, every 10 minutes: read the
health "now" members and the store's slice summary (section 4c), decide as above, and dispatch
`story-slices.yml` with one App API call, or do nothing. The App has its own rate limit, separate
from graphty-agent's 5,000 an hour; a tick that dispatches nothing makes no GitHub call. The
store and health reads that fail mean "do nothing this tick".

**Stop condition and yield.** A running job cannot be paused, so the unit of yielding is one slice
run: at most 6 jobs of about 4.5 minutes each. Idle slices never start unless 30 runners are free,
so real work is delayed only if more than 24 new jobs arrive within one slice's few minutes, and
then by at most one bin's length. An idle slice does not chain itself: the next tick decides again,
so work that queues stops idle capture within 10 minutes plus the collector's 5. Idle capture
also stops when every story has a capture of master's newest green commit: re-rendering the same
commit again would show nothing new.

**Concurrency.** `story-slices.yml` uses one concurrency group, `story-slices`, without
`cancel-in-progress`: one slice runs and at most one waits, and a newer dispatch replaces the
waiting one (a newer commit is better). A slice never cancels anything else, and nothing in the
pipeline waits for a slice.

**Daily cap.** The dispatcher stops for the UTC day once slices have used 1,500 runner-minutes
(about 4% of a busy day), summed from the durations the slice jobs post to the store. The cap and
the thresholds are repository variables (`SLICE_DAILY_MINUTES`, `SLICE_IDLE_RUNNING`,
`SLICE_BUSY_RUNNING`), so tuning them is not a code change.

### 4c. Where captures live and how the newest is found

- **Artifacts.** Each bin uploads `visual-slice-<project>-<bin>-<attempt>` (results.json, the PNGs
  capture keeps for changed, new and unstable items, and the baseline each was compared with), kept
  7 days. The rotation renders every story within about a day, so nothing reviewable is older.
- **Index.** The results store (`tools/results-service`) gets a table `story_capture`: project,
  story id and mode, commit, run id, attempt, artifact name, status (unchanged, changed, new,
  unseeded, unstable, failed), the hash of the picture, the hash of the baseline it was compared
  with, and the time. `POST /v1/story-captures` is written only by `story-slices.yml` on master
  (OIDC kind `master`). `GET /v1/story-captures` answers the newest capture of each story, and a
  summary: the last sliced commit, how many stories have a capture of a given commit, the oldest
  newest-capture, and the runner-minutes used today.
- **Freshness rules.** A picture is always shown with the commit and run it was rendered from.
  For a story, only its newest capture counts; an older one is never shown once a newer one
  exists. A rolling capture is never used to gate anything: it only decides what the owner
  reviews early. The full run renders the candidate again and gates on that render.

### 4d. From a slice to the owner's approval

- **The review page lists "master rolling"** (a new target, through a new `rolling` command in
  `visual-review.config.json`, as `candidates` is today): for each story, its newest rolling
  capture, when that capture is changed, new or unseeded against the baseline master's tip holds
  now. An item compared with a baseline that is no longer master's (an approval merged since) is
  left out until a newer slice renders it again. Each image reads "rendered from <commit>,
  <age>". Unstable and failed items go to "Not ready" and are filed as flaky, as on pull requests.
  Grouping, clusters, Accept N and the one quiet notification work as today.
- **Finish** commits the accepted pictures and the review record on master's current tip, on a
  branch `visual/approve-rolling-<date>`, signs the baselines tree in the second commit, and opens
  an accept-only pull request into master, as a candidate's Finish does. While that pull request is
  open, the next rolling Finish adds its commits to the same branch and signs the new tree, so
  approvals never fork the baselines tree. Rejects open one issue with the machine-readable block,
  as for a candidate.
- **While a held candidate waits for approval**, the page offers it first, as today, and a rolling
  Finish waits until the candidate's approval pull request has merged (mixing the two would make
  the candidate's promotion compare its pictures with baselines it never rendered). Decisions on
  rolling items are kept meanwhile.
- **Merging.** The approval pull request changes only baselines and approvals; it runs the Stories
  capture of the stories whose baselines it changes and merges as candidate approval pull requests
  do today. Smaller and more frequent approvals keep that capture short.
- **The full run** then picks a master commit that holds the approved baselines. A verdict is
  never inherited across a baselines change (`tools/full-run.mjs`), so that commit is tested. Its
  capture matches, so the verdict is green-clean, and `tools/channel/screenshot-gate.sh` finds the
  owner's signed approval of exactly that baselines tree and lets it promote. Nothing in release.yml,
  the gate or the approvals changes.

The timeline for one change: merge; master build (median 14 minutes when runners are free, 35 when
busy); next dispatcher tick (up to 10 minutes) and slice (about 6); the review page shows it. About
30 minutes quiet, about an hour busy. A change merged shortly before a slot still meets that slot
as green-images; the next slot after the owner's Finish goes green-clean.

### 4e. What stays the gate

Unchanged: the full run's complete capture (ci.yml's story tests and release.yml's re-capture) of
the exact candidate commit, its verdict, the screenshot gate against nightly with the owner's
signed approval, and the held-candidate review when a full run is still green-images. Rolling
captures add an earlier chance to approve; they never approve, gate or promote anything.

### 4f. Failure modes

| Failure                                            | What happens                                                                                                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A flaky render                                     | The in-job second shot makes it `unstable`: "Not ready", filed flaky, never offered for approval. A one-off is replaced by the next slice.                                                          |
| A slice job fails or is cancelled                  | Its stories stay oldest; the next slice takes them. Three consecutive failed slices file one issue (bug, priority:high).                                                                            |
| Runners saturated                                  | Nothing starts. Freshness drops and shows on the dashboard; the full run still gates.                                                                                                               |
| A burst arrives during an idle slice               | At most 6 jobs finish their few minutes; no new slice starts while anything queues.                                                                                                                 |
| The store or health API is down                    | The dispatcher does nothing. Slices that ran keep their artifacts; the index is written again on the job's re-run.                                                                                  |
| GitHub API budget                                  | The dispatcher uses the App's own limit, one call per dispatch. The review page reads the store, not GitHub, to find captures, and downloads only the artifacts of items it shows.                  |
| Two approval pull requests fork the baselines tree | Prevented: one rolling approval branch at a time, and none while a candidate's is open. If it happens anyway, the screenshot gate refuses the unsigned merged tree and the full run holds as today. |
| A story changes again after its rolling approval   | The full run sees it changed and holds as green-images, as today. Never worse than today.                                                                                                           |
| Artifact storage                                   | About 150 to 300 MB a full set (only changed items keep PNGs) times a few sets a day, 7 days; free on a public repository. Measured in the trial.                                                   |

**Dashboard metrics** (the CI page, step 6): freshness of the full set (the oldest newest-capture
of any story, target under 12 hours); coverage of master's newest green commit; slice
runner-minutes a day against the cap; review lag (first rolling capture of a changed picture to
its approval merging); and the full runs' green-clean rate, the measure of success.

## 5. Plan

Each step is one pull request with its tests written first. Workflow changes run
`pnpm run test:ci-workflows`; every step runs `node tools/sonar-gate.mjs`. Where `tools/pr-open.sh`
leaves auto-merge off for a guarded path (`visual-review/`, `visual-review.config.json`), a
session merges it once green. No step touches the gate, the approval code, the passkeys, the
baselines, or ci.yml's gate step and story-test jobs.

1. **Runner "now" members and a 7-day series.** tools/pipeline-health: `ci.jobs_running` and
   `ci.jobs_queued` as "now" members; the runners page answers `range=7d`. Tests: views and
   collector unit tests. Then record a week of hourly idle windows into this document.
2. **Story capture index.** tools/results-service: migration `0007_story_capture.sql`,
   `POST /v1/story-captures` (OIDC, `story-slices.yml` on master only), `GET /v1/story-captures`
   (newest per story, summary). Tests: the service's tests, including refusing other workflows.
3. **Slice planner and workflow.** `tools/channel/story-slices.mjs` (`plan`: reached first, then
   oldest first, packed with `storyBins()`; `post`: the index rows and durations) with unit tests;
   `.github/workflows/story-slices.yml` (dispatch only; plan job, a matrix of capture jobs on the
   built-Storybook capture, upload, post; concurrency group `story-slices`), with a test in
   `tools/tool-tests.txt` that checks its triggers, permissions, concurrency and that it never
   touches `visual-baselines/`. Nothing dispatches it yet.
4. **Review page: the rolling target.** `tools/channel/rolling.mjs` (the `rolling` command,
   reading the store) and serve.mjs's "master rolling" target, Finish on master's tip onto one
   approval branch, waiting on an open candidate approval. visual-review's own tests (a fake store
   and fake artifacts); put into the live review server with `tools/live.sh visual-review` once
   committed.
5. **Dispatcher.** tools/release-scheduler: the 10-minute cron, the three-state decision, the daily
   cap and the repository variables; unit tests for the decision table. `results-service.yml` deploys
   it from master when the pull request merges.
6. **Dashboard metrics** of section 4f, with SLA targets.

**Trial on real CI** (in step order, each recorded in `tmp/early-screenshots/journal.md`):

1. After step 3 merges: dispatch `story-slices.yml` by hand on master's newest green commit,
   `mode=base bins=2`. Check: two capture jobs, artifacts present, index rows in the store, job
   durations near 4.5 minutes, nothing else in the pipeline affected.
2. In a quiet hour: dispatch `mode=idle` repeatedly by hand until the summary says every story has
   a capture of that commit. Check the full-set cost against the 150 runner-minute estimate and
   the artifact sizes.
3. After step 4: start the review server (servherd) with the rolling target; it lists the changed
   pictures with their commits and groups them. The owner reviews and Finishes; the approval pull
   request merges.
4. After step 5: the dispatcher runs for 3 days. Pass when the next full run after an approval is
   green-clean and promotes on its own, slices stay under the daily cap, and the dashboard's runner
   wait and saturated minutes are no worse than the 7 days before.

## 6. Open questions for the owner

1. **Approving a picture rendered from an earlier commit onto master's tip.** A rolling picture is
   rendered from commit X and shown as X. If you accept it, the baseline lands on master's newest
   commit Y, which may be a few merges later. Nothing promotes on X's render: the full run renders
   its candidate fresh and gates on that, and an item whose baseline changed since X is not offered.
   Is that within "every picture used for a decision is freshly rendered from the commit it claims
   to show"? If not, the alternative is to offer only items rendered from master's newest green
   commit, which delays review until a slice reaches the tip.
2. **The review page's existing "Approved before" filter.** It accepts, on a pull request, a capture
   byte for byte equal to an image you accepted earlier for the same story (you still Finish). That
   is close to option (b) you rejected. Should it be switched off for the rolling and candidate
   targets (or everywhere)?
3. **Which commit the full run judges.** Today a slot takes master's newest commit with a kept site.
   It could prefer the newest commit whose rolling captures show nothing you have not approved,
   trading a slightly older nightly for more green-clean promotions. Not built; worth deciding
   after the trial shows how often a slot meets an unreviewed change.
