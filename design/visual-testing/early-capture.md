# Early screenshot capture: rolling slices and idle-time capture

Date: 2026-10-29. Issue #4540. Status: design and plan, revised after three reviews (CI cost, owner rules,
owner flow); plan steps 1 to 3 built (step 3: the slice planner, the reach rows and `story-slices.yml`, which
nothing dispatches yet).

Every story's picture is rendered fresh from master many times a day, in small slices: a fixed small
slice after green master builds while runners are free, and more slices while GitHub's runners are
genuinely idle. A changed picture reaches the owner's review page within about an hour of its merge, and
his phone is told. His approvals land on master as signed baselines, so when the 6-hourly full run
renders a later candidate the pictures already match, the verdict is green-clean, and nightly promotes on
its own. The full run's complete capture stays the release gate; rolling captures never approve, gate or
promote anything.

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
  slot), one about every 4 hours. So almost every slot carries an unapproved picture, and green-clean
  is close to impossible while approval happens only on a held candidate.

**Goal.** Changed pictures are reviewed before the full run judges the commit that holds them, so that a
candidate whose pictures the owner already approved promotes the moment its full run passes. Without
growing pull request or full-run test time, and without ever deciding anything on a picture that was not
freshly rendered from the commit it claims to show.

## 2. Decision record and rejected options

From the owner's conversation of 2026-10-29. Start any revisit here.

**Rejected:**

- **(a) Promote to nightly when the only problem is changed screenshots, and review before
  production.** Owner: "screenshots are the only way we know if our product looks right to users."
  Nightly is for users; pictures are reviewed before it. The goal is to review them earlier and have the
  approval already on record, so a candidate promotes cleanly when its run passes.
- **(b) Approving pictures by image hash** (a capture that equals an image approved before counts as
  approved). Owner: "if we add a feature, but it doesn't show up in the screenshot, that should be a
  failure not a previously good image." This design adds no hash-based approval, and for the new
  rolling target it switches off the two hash carries the review page has today (section 4d). Open
  question 2 asks about them on the candidate target.
- **(c) Capturing and reviewing every changed picture at pull-request time.** It would choke CI with
  test time; pull request runs are already the bulk of runner load (section 3).
- **(d) Skipping stories whose inputs did not change** (source and import graph, assets, fonts,
  browser) and reusing earlier captures. Owner: "a non-starter: if the inputs didn't change the
  outputs might change because of a bug, that's exactly what we are trying to detect." **Every picture
  used for a decision is freshly rendered from the commit it claims to show.** This design uses
  reachability only to order the rendering (render reached stories first) and to hold back a stale item
  from review until it is rendered again, never to skip a render: the rotation renders every story
  regardless.

**Not solved by rejecting (b):** a pull request that adds a feature which never shows up in its story
leaves that story's picture equal to its baseline: no rolling item, and a green-clean full run. That is
the same as today; this design neither causes nor fixes it. Only the undecided idea of declaring expected
visual changes (below) addresses it.

**Already exists:** grouping identical changes so one decision covers a family (the review page's "Group
similar" clusters and "Review together" for pull requests that change the same baselines). Rolling items
are shown on the same page and grouped the same way.

**Not decided (recorded, not built):**

- Each pull request declaring which stories it expects to change visually, failing both ways (declared
  but unchanged, changed but undeclared). The only idea on record that catches the missing-feature case
  above.
- An agent pre-screening the review queue that ranks items but never approves.
- Faster capture mechanics: one browser and page per worker with stories switched in-page, Storybook
  builds from the nx cache, a double render only for changed pictures (capture already re-shoots only
  changed and new items). Welcome if they never reuse a render.

**Chosen (owner: "let's implement 6"):** keep a full, current set of master's screenshots without
expanding CI test time, by

1. capturing a small rotating slice of all stories after green master builds, so the whole set is
   refreshed several times a day at a small fixed cost per build (the owner also asked whether every
   pull request could take a few; section 4a answers why master builds do it instead); and
2. detecting when CI is idle and capturing more slices then, stopping as soon as other work queues.

Changed pictures from these captures reach the owner's review queue early, grouped as today; his Finish
lands them as baselines; the full run then finds them matching.

**Constraints that bind every step:** GitHub-hosted runners only, no paid runners; runners are already
saturated at about 76 merges a day (design/ci/channels-pipeline.md section 7.1), so the added
runner-minutes are measured, capped, and yield to real work. Capture rules are unchanged: the whole
canvas, device scale factor 2, 1200 x 900 or the full scroll size, pinned fonts. Only the owner approves
pictures (Finish, signed with his passkey). Agents never touch `visual-baselines/` or
`visual-review-approvals/`, never edit `visual-review/trusted/gate.mjs`,
`visual-review/trusted/lib/approval.mjs`, `visual-review/passkeys.json` or the gate step and story-test
jobs in ci.yml; this design needs none of them changed. CI runs the capture and gate as master has them,
so a change to `visual-review/trusted/` or `visual-review/capture/` is exercised only after it merges.
The full run's complete capture stays the release gate.

## 3. Measurements

Taken 2026-10-29 from the repository, the health dashboard
(`https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/page/ci?range=24h` and
`.../v1/page/runners?range=24h`), 83 full-run job lists, and two recent green pull request runs
(40948738889, 40940321333). Raw pulls are in `tmp/early-screenshots/`.

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

**Capture cost.** `storyBins()` in `tools/test-select.mjs` packs story files (or `#k/n` splits of a heavy
file) per project into bins of `STORY_BIN_LIMIT_MS` = 3 capture-minutes, but raises the limit in 30 s
steps up to `STORY_BIN_MAX_MS` = 12 minutes whenever packing would make more than `STORY_JOB_BUDGET` = 9
jobs. Recent pull request runs show the stretch: 13 Stories jobs whose captures took 7 to 10.7 minutes.
A Stories job's setup (checkout, LFS baselines, install, Chromium, Storybook download) measured 0.8 to
1.3 minutes, about 1.0; a real bin runs up to 1.23 times its plan. **At a fixed 3-minute limit a full set
is 33 bins, about 33 x (1.0 + 3 x 1.23) = 155 runner-minutes.** The full run's story tests, which also
run the play functions, take 129 runner-minutes over 11 jobs.

**Pull request runs already render much of the set.** The two green runs captured 64 to 70
capture-minutes each in 13 Stories jobs (81 to 85 runner-minutes), and one run fanned out 71 jobs and
391 runner-minutes. Their renders are of the pull request's merge tree, so they cannot be reused (rejected
option d and the freshness rule), but their per-pull-request cost dwarfs the slices.

**Runner load.** Limit 60 concurrent Linux jobs, which is 86,400 runner-minutes a day. Used, by kind:

| Kind                                               | Last 24 h                    | Last 7 days, per day |
| -------------------------------------------------- | ---------------------------- | -------------------- |
| Pull request runs                                  | 30,863                       | 16,372               |
| Master builds (76 a day, about 18 runner-min each) | 1,370                        | 658                  |
| Full runs                                          | 5,459                        | 2,888                |
| Other                                              | 1,903                        | 1,627                |
| **Total**                                          | **39,596 (46% of capacity)** | **21,545 (25%)**     |

**Idle windows.** The runners page samples running and queued jobs once an hour (it answers only
`range=24h`). From 10-28 14:00 to 10-29 13:00 PDT, running jobs were 52, 28, 0, 9, 0, 0, 5, 0, 0, 1, 0, 2,
58, 5, 36, 1, 58, 60, 54, 24, 29, 25, 37, 24. Jobs queued in only 3 of 24 samples (79, 110, 120 jobs).
**12 of 24 hours had 10 or fewer jobs running and nothing queued**, almost all of them overnight PDT. The
24 to 37 readings were the workday, while master was merging, and one snapshot hides queueing inside the
hour: the 13:28 PDT pull showed runner wait over the last hour at 9.99 minutes (SLA 5, red above 15) with
24 running and 0 queued in that hour's sample. The pool was saturated (a job waiting with 57 or more
running) 325 minutes in the 24 hours, in bursts. One day of hourly samples is thin: plan step 1 records
a 7-day series before the budgets are tuned.

**What this means.** A full set (155 runner-minutes) is under 0.5% of a busy day's use. The cost is not
capacity in total; it is not adding to the bursts. A single snapshot of "running jobs" does not say the
pool is idle; recent queueing does. So: decide on the last 30 to 60 minutes of queueing, keep idle slices
to the genuinely empty hours, and bound every slice to a few jobs of a few minutes.

## 4. Design

### 4a. The rotating slice

**Where it runs: after green master builds, not in pull request runs.** A pull request run renders its
merge tree, a commit that never exists on master (master moves on before and after it merges), so its
pictures cannot make up a current set of master without breaking the freshness rule. Pull request runs
are also the merge critical path, and many are cancelled by a newer push (99 of 244 on 2026-10-26); a
fixed slice in each would add to every merge's wait and be thrown away with every cancelled run. A master
build is one per merge, off the critical path, and its Storybooks are already built.

**How it is started.** Not as a job inside ci.yml's master build: a failing slice must never make master
red (master-guard would open a revert). A separate workflow, `story-slices.yml`, `workflow_dispatch` only,
takes `sha` (a master commit whose build is green), `mode` (`base` or `idle`), `bins`, and `post`
(`false` for a dry run that captures but writes nothing to the store). One dispatcher (section 4b) starts
it.

**The rotation unit** is what `storyBins()` packs: one story file of one project, or one `#k/n` split of a
heavy file. Its age is when a slice last rendered it whole (never rendered counts as oldest): each bin posts the
units it rendered, only when its capture finished, so a bin that broke part way leaves its units oldest. A
story's own newest capture is not used for this, because a story that was deleted keeps its last row and would
hold its unit's age down for ever.

**What a slice holds** (`tools/channel/story-slices.mjs plan`, run in the slice's first job):

1. **Reached first.** The units the merges since the last sliced commit can reach. Not computed in the
   slice: ci.yml's master-push `select-graphs` job already walks every import graph
   (`test-select.mjs --base HEAD^1 --head HEAD`); one added step there writes the story units that merge
   reaches and posts them to the store (`story_reach`, keyed by commit). The job is `continue-on-error`, so
   it can never make master red; a missing row only means that merge's stories are ordered by age alone.
   This only orders the work.
2. **Then oldest first.** Every other unit, by age. This is the rotation; it renders every story
   whatever changed.
3. **Packed at a fixed 3-minute limit, never stretched.** `storyBins()` gains an optional
   `{ jobBudget }` (default today's 9; the planner passes `Infinity`), so the limit stays at 3 minutes.
   The planner takes units in order while every project's chosen units still pack into `bins` bins in all
   (a bin never mixes projects), passing over a unit that would need one more bin and trying the next. A
   `base` slice is 2 bins, an `idle` slice 6.

Because the order comes from the store's record of what was captured (section 4c), a slice that was
cancelled, skipped or failed leaves its units oldest, so the next one takes them. Nothing depends on every
master build getting its slice.

**Capture.** Each bin runs the built-Storybook capture with `--stories`, as the Stories jobs and the full
run's re-capture already do (the two capture paths showed zero parity differences on two full runs). It
runs on commit X's checkout with X's baselines (Git LFS, restored with `actions/cache/restore` only, never
saved, so slices add no entries to the 10 GB Actions cache) and the pinned fonts, with master's capture
code (the workflow is master's), downloading the Storybook artifacts of **exactly X's** master build. If
that artifact has expired or is missing, the bin fails; it never falls back to another commit's build. A
changed or new item is shot twice in the job, as today; only an item that draws the same picture twice is
offered for review. Each bin posts its own index rows at its end, so there is no separate post job.

**Cost of one slice run** (every job, at the measured setup):

| Slice  | Jobs             | Runner-minutes                        |
| ------ | ---------------- | ------------------------------------- |
| `base` | plan + 2 capture | 0.7 + 2 x (1.0 + 3 x 1.23) = about 10 |
| `idle` | plan + 6 capture | 0.7 + 6 x 4.7 = about 29              |

The plan job checks out without LFS, installs nothing (the planner uses Node built-ins, git and the
store), and takes about 0.7 minutes. Wall time: about 6 minutes for any slice. The daily caps in 4b sum
every job of every slice run, from GitHub's own job durations.

### 4b. Idle-time capture and the dispatcher

**Where the decision runs: the pipeline-health collector on AWS**, at the end of its 5-minute cycle. It
already computes `ci.jobs_running`, `ci.jobs_queued`, `ci.longest_queued_ms` and `ci.saturated_ms` every
cycle (`tools/pipeline-health/src/collector/collect.ts`), from GitHub calls it already makes, and it
already lists unfinished runs, so it knows whether a slice is in flight. Deciding there uses data at most
one cycle old, adds no GitHub reads, and follows the owner's direction of AWS as the single backend (no
third Cloudflare cron). The dispatch call needs an App with Actions write: the release-scheduler App,
whose key moves to AWS with #3608 (owner item, see section 7). Step 5 lands after that move, or does the
key move as its first part.

**The decision** (a pure function, `decideSlice(history, store, now)`, with a unit-tested table):

- **Never** when a slice run is in flight (so no pending run is ever replaced and cancelled, which would
  pollute the health dashboard's cancel metrics), when any cap below is used up, or when the collector
  or the store did not answer.
- **Quiet** means: no job queued and `ci.saturated_ms` 0 in each of the last 6 cycles (30 minutes), and
  runner wait over the last hour 5 minutes or less.
- **Idle slice** when quiet, 10 or fewer jobs running now, and the freshness target is not met: some
  unit's newest capture is older than `freshHours` (3).
- **Base slice** when quiet, 30 or fewer running, and master's newest green build is newer than the last
  sliced commit. With 30 running, a base slice's 3 jobs still leave 27 free.
- Otherwise nothing. A skipped base slice is not lost: the next quiet cycle slices master's newest green
  commit, and its reach rows cover every merge since the last sliced commit.

**Budgets, each its own share, all repository-tunable** in `tools/pipeline-health/config/slices.json`
(`baseDailyMin`, `idleDailyMin`, `idleHourlyMin`, `freshHours`, `idleRunning`, `baseRunning`, `quietMinutes`,
`maxWaitMinutes`, the per-slice estimates, and `dispatch`, the kill switch; a pull request to that file
changes them, and the stack redeploys itself from master):

| Share                   | Cap per UTC day | Other limit      | What it buys                                           |
| ----------------------- | --------------- | ---------------- | ------------------------------------------------------ |
| Base slices             | 800 runner-min  | none             | about 80 base slices, more than one per merge          |
| Idle slices             | 700 runner-min  | 120 runner-min/h | about 24 idle slices, about 4 full sets                |
| **Expected daily cost** | **1,500**       |                  | **the cap, about 4% of a busy day, 7% of a quiet day** |

The base share is reserved: idle slices can never spend it, so the afternoon's merges still get their
slices after a busy idle night. The hourly idle limit spreads idle capture. With master merging about every
19 minutes, "every story captured at the newest commit" is never reached on a busy day, so idle capture is
stopped by the freshness target and the caps, not by catching up. Used minutes are summed from GitHub's
job durations of every `story-slices.yml` run (plan, bins, failed and cancelled ones), which the collector
reads once per finished slice run (1 to 3 job-list calls).

**As built (plan step 5).** `tools/pipeline-health/src/collector/slices.ts` holds `decideSlice()` and its unit-tested
table (`test/collector/slices.test.ts`); collect.ts's `slices` part runs it after the runners part every cycle.
Details the section above leaves open:

- **State.** One cursor, `slices`, keeps the last hour of runner samples (running, queued, saturated, longest
  wait, one per cycle), two days of finished slice runs with their runner-minutes, and the last dispatch.
  "Quiet" needs samples covering the whole 30 minutes with no missed cycle (a gap over 7.5 minutes), so a
  collector that failed a cycle, or just started, is never quiet.
- **Which share a run is charged to.** `story-slices.yml` names its runs `Story slices: <mode> <sha>`; the
  collector reads the mode from the run name. A hand dispatch is charged too.
- **In flight.** A queued or running `story-slices.yml` run, or a dispatch whose run has not shown up yet
  (for at most 15 minutes).
- **Base after a failed slice.** A base slice is not dispatched twice for the same commit: a slice that
  failed posts no rows, so "newer than the last sliced commit" alone would retry the same commit every cycle.
- **The store is read last**, only when nothing else stops a slice (one `GET /v1/story-captures` per such
  cycle), with a local token. Freshness is the oldest unit's newest whole capture (`units`), falling back to
  the oldest story capture. A unit never captured is not in the store, so until the first full rotation the
  freshness is that of the units captured so far; base slices take never-captured units first anyway.
- **Credentials, all in SSM (SecureString), all owner items:** the store's URL and token
  (`/graphty-health/results/url`, `/graphty-health/results/token`), and the release-scheduler App
  (`/graphty-health/release-scheduler/app-id`, `installation-id`, `private-key`, the names #3608 uses too).
  Without the store parameters it never dispatches; without the App, or with `dispatch` false, it decides and
  logs (a dry run: the cycle's log line carries `slice: { action, reason | mode, sha, dispatched }`).

**Replay of real runner data (2026-10-26 to 10-29, before dispatching anything).** The health API's runner
series (15-minute buckets, each taken as three 5-minute samples at the bucket's maxima) through `decideSlice`,
with a model store (33 bins, base renders the 2 oldest, idle the 6 oldest, a slice takes 10 minutes, a new
green build every 19 minutes): 53 slices in 3.9 days, 0 on 10-27 (no quiet half hour all day), at most 614
runner-minutes on a day (10-29), well under the caps; the oldest capture reached 25 to 46 hours, far from the
6-hour target. 9 of the 53 started in a bucket followed by queued jobs (the yield cost the trial measures).
The main reason for so few quiet windows: in 66 of 375 buckets 1 or 2 jobs sat queued while the pool was not
saturated, 53 of them for over 20 minutes -- jobs that are not waiting for a runner (an environment approval,
a macOS queue, a ghost the collector does not yet recognise). Both "no job queued" and "wait 5 minutes or
less" count them. Not changed here: the 7-day series of plan step 1 decides whether "queued" should leave out
jobs queued while the pool has free runners (recorded as an open question in section 7).

**Yield.** A running job cannot be paused, so the unit of yielding is one slice run: at most 7 jobs of
about 5 minutes. A pull request push can fan out 71 jobs, more than the whole pool, so a burst can arrive
during a slice; the damage is bounded at one bin's length, about 5 minutes, for at most 7 runners, and no
new slice starts until the pool has been quiet for 30 minutes again. The trial measures this directly
(section 6).

**Throughput.** One slice at a time, about 6 to 8 minutes each including the plan job, so at most about 8
idle slices an hour, one full set (33 bins) in about 45 to 60 minutes of true idle. The 8 to 10 empty
overnight hours fit the idle share several times over, so the strict threshold loses little freshness.

**Concurrency.** `story-slices.yml` also has one concurrency group, `story-slices`, without
`cancel-in-progress`, as a backstop; the dispatcher never dispatches while one is in flight. A slice never
cancels anything else, and nothing in the pipeline waits for a slice.

**GitHub API, and who pays:**

| Caller         | Calls                                                                | Token, limit                                               |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Dispatcher     | 2 per dispatch (installation token, dispatch); none when idle        | release-scheduler App, its own limit; 300 or fewer a day   |
| Collector      | 1 to 3 job-list calls per finished slice run (about 150 a day)       | the collector's App, its own limit                         |
| Slice bin jobs | about 2 per bin to download X's Storybook artifact (about 300 a day) | `GITHUB_TOKEN`, 1,000 an hour per repository, shared by CI |
| Review page    | about 2 per shown item's artifact download                           | the owner's gh login under servherd                        |

None of this touches graphty-agent's 5,000 an hour.

### 4c. Where captures live and how the newest is found

- **Artifacts.** Each bin uploads `visual-slice-<project>-<bin>-<attempt>` (results.json, the PNGs capture
  keeps for changed, new and unstable items, and the baseline each was compared with), kept 7 days.
- **Index.** The results store (`tools/results-service`) gets tables `story_capture` (project, story id
  and mode, commit, the commit's `visual-baselines` tree, run id, attempt, artifact name, status:
  unchanged, changed, new, unseeded, unstable, failed; the hash of the picture and of the baseline it was
  compared with; the time), `story_unit` (project, unit, commit, run id, attempt, time: when a bin rendered a
  rotation unit whole, migration 0008) and `story_reach` (commit, story unit). Index on (project, story, mode,
  run id, attempt).
  Pruning keeps the newest row per story plus 7 days, matching the artifact retention (about 25,000 rows a
  day at the cap, about 5 MB, within Workers Paid D1 limits). `POST /v1/story-captures` is written only by
  `story-slices.yml` on master and `POST /v1/story-reach` only by ci.yml on master (OIDC
  `job_workflow_ref`). `GET /v1/story-captures` answers the newest capture of each story, each unit's newest
  whole render, and a summary: the last sliced commit, the oldest newest-capture, and the rolling queue size.
  `GET /v1/story-reach?shas=` answers the units the listed commits (at most 100, D1's bound-parameter limit)
  reach.
- **Freshness rules.** A picture is always shown with the commit and run it was rendered from. For a
  story, only its newest capture counts (highest run id, then attempt; never the time it was written, so a late
  re-run of an older slice cannot hide a newer render); an older one is never shown once a newer one exists. A rolling
  capture is never used to gate, approve or promote anything. The only consumers of these rows are the
  review page's rolling target, the notifications (4d), the dispatcher's freshness check (4b), the dashboard and the full run's commit ordering
  (step 7, ordering only, never a verdict). A test fails if any other file under `tools/` reads
  `/v1/story-captures`.
- **Pull request Story references** (ci.yml's Story references job, #4318, which shows master's newest
  capture beside a pull request's) are unchanged: rolling captures do not become that reference in this
  design.

### 4d. From a slice to the owner's approval

**What the rolling target offers** (a new target "master rolling" on the review page, read through a new
`rolling` command in `visual-review.config.json`, as `candidates` is today). For each story, its newest
rolling capture, when all of these hold:

- it is changed, new or unseeded against the baselines of its own render commit X;
- X's `visual-baselines` tree equals master's tip tree (no approval has merged since X);
- no merge between X and master's tip reaches the story (from `story_reach`). An item that fails this is
  shown as "re-render pending, N merges since" and is not decidable; the reached-first order renders it
  again within the next slice or two. Reach here only holds back a stale item; it never skips a render.

Each image reads "rendered from <commit>, <age>". Unstable and failed items go to "Not ready" and are
filed as flaky, as on pull requests. Grouping and clusters work as today, within one render commit.

**Decisions are bound to one render.** A rolling decision records (story, mode, commit, run, picture
hash). A newer render of that story invalidates it, whatever its hash. For the rolling target the
"Approved before" filter is off, and decisions are never kept or carried by hash: not onto a newer render,
and not into a candidate's Finish. Open question 2 asks whether to switch the same carries off for the
candidate target.

**Finish.** One Finish covers the items of one render commit X (the page offers the newest X first).
It commits the accepted pictures and the review record **parented on X**, signs X's baselines tree plus
the accepts in the second commit, and opens an accept-only pull request into master on
`visual/approve-rolling-<sha12>`. So, as with a candidate today, the signed tree belongs to the commit
whose render was reviewed. Because X's tree equals master's tip tree and no other approval merges
meanwhile (below), the merge result's tree is exactly the signed tree. The accept commit's subject is
**`<prefix>: rolling approval of visual baselines rendered at <sha12>`**, which does not match
`ACCEPT_SUBJECT` in `tools/channel/resume.mjs`, so `acceptsIn`, `approvalsIn` and release-due never treat a
rolling approval merge as a candidate approval: it starts no promote-nightly, restart or candidate run.
Rolling approval pull requests never reference a hold issue or a red-run issue (such a reference would
start a candidate or restart full run). Rejects open one issue with the machine-readable block, as for a
candidate; a later render of a rejected story is a new item, marked "rejected in #N" when its hash equals
the rejected render's (shown, not decided), and it drops off once the fix renders the baseline.

**One approval in flight, in both directions.** Two approval pull requests open together, or one merging
while a full run judges a commit, can leave master with a baselines tree nobody signed. PR Integrity
checks the signature on the pull request head's tree, but `tools/channel/screenshot-gate.sh` needs the
candidate's exact tree to be signed or equal to nightly's; an unsigned tree on master would refuse every
later green-clean candidate, and `pick()` would mark each "a newer commit promotes" forever. So:

1. **The page refuses a rolling Finish** while a candidate is held or any approval pull request (rolling or
   candidate) is open.
2. **A candidate Finish closes an open rolling approval pull request**, naming it (the owner's own action;
   its decisions were bound to renders that the candidate supersedes). The candidate's pictures are
   rendered from H and reviewed there.
3. **A rolling approval pull request merges only in a window**: no candidate held and no full run between
   its pick and its verdict. The merging session uses `tools/channel/rolling-merge.mjs`, which checks the
   store and merges or says when to retry (these pull requests change `visual-baselines/`, so `pr-open.sh`
   leaves auto-merge off and a session merges them once green).
4. **A required check backs this up in code**: ci.yml's Checks job runs `tools/channel/baselines-tree.mjs`,
   which fails a pull request that changes `visual-baselines/` unless the merge result's baselines tree
   equals its head's tree. A stale approval pull request therefore fails its own CI and never reaches
   master. Recovery: `node visual-review/trusted/cli.mjs update <pr>` merges master, and the owner reviews
   and signs again.
5. **An alarm.** `tools/full-run.mjs pick` checks the picked commit's baselines tree: if it is neither
   nightly's nor signed, it files one "Master baselines tree unsigned" issue (`bug`, `priority:critical`)
   instead of silently marking the commit. Never expected with rules 1 to 4; it makes a gap visible.

A slot that picks before a rolling approval merges still ends green-images and holds; the owner then
Finishes the candidate as today (rule 2), and the rolling approval's content is re-reviewed there.

**The approval pull request's checks.** It changes only baselines and approvals. Its Stories capture of the
changed baselines is report-only for an accept-only pull request, and the pull request visual gate step is
`continue-on-error`, so the timeline does not count on that capture to catch anything. What protects the
release is the next full run: a verdict is never inherited across a baselines change
(`tools/full-run.mjs sameBaselines`), so the first commit holding the approval is rendered and judged
fresh.

**How the owner finds out.** The stopped `visual-review notify` stays stopped (the owner switched it off on
2026-10-26 because it pinged him about pull requests). Instead, the slice bin job that posts rows reads the
store's answer and sends a Pushover message (the repository's existing `PUSHOVER_APP_TOKEN` and
`PUSHOVER_USER_KEY` secrets) when:

- the rolling queue goes from empty to non-empty ("N pictures changed on master; review: <URL of the
  rolling target>"), at most once every 2 hours; and
- once per slot, about 60 to 75 minutes before each 00/06/12/18 UTC slot, if the queue is not empty
  ("slot at HH:00 PT will hold for N pictures").

The store keeps the last-notified times, so no review server has to be running. This changes the rule
in CLAUDE.md ("the owner reviews changed pictures only on the held nightly candidate") to "the owner
reviews changed pictures early on the master rolling target, and on a held candidate when one is held";
plan step 4 rewrites CLAUDE.md's Visual review section and `visual-review/README.md` to say so. Agents
still never ask him to review a pull request's screenshots.

**Timeline for one change:** merge; master build (median 14 minutes when runners are free, 35 when busy);
the next quiet collector cycle and slice (5 to 10 minutes when quiet; on a busy workday afternoon, until
the pool has been quiet for 30 minutes); Pushover; the owner's review; the approval pull request's CI;
the merge window. About 30 minutes to the page when quiet, an hour or more when busy.

### 4e. Will the slot be green-clean? An estimate, and the pick rule

Under today's pick (master's newest commit with a kept site), a slot is green-clean only if every
picture-changing merge before its pick has been rendered, reviewed, approved and merged. Picture changes
arrive about every 4 hours (rate 0.25 an hour). With W the time from a merge to its approval merging, the
chance that no picture change is still in that pipe at a slot is about exp(-0.25 W):

| Render | Owner lag   | Approval PR CI and merge | W      | Green-clean share of slots |
| ------ | ----------- | ------------------------ | ------ | -------------------------- |
| 1 h    | 19 h (past) | 5.3 h (past)             | 25 h   | about 0                    |
| 1 h    | 2 h         | 0.75 h                   | 3.75 h | about 39%                  |
| 0.5 h  | 1 h         | 0.5 h                    | 2 h    | about 61%                  |

So early review alone, with a 1 to 2 hour owner lag and an accept-only approval pull request under 45
minutes (it runs Build, Lint, Checks and a small Stories capture), gives roughly 40 to 60% green-clean
slots instead of 0. Targets used by the trial: owner lag under 2 hours in his waking hours, approval pull
request CI under 45 minutes.

**The pick rule (plan step 7, in scope).** A slot can do better by not judging a commit it already knows
has an unreviewed picture: prefer the newest kept-site commit that holds the newest approval merge and is
older than the first commit whose rolling captures show a picture not yet approved; else master's newest,
as today. This uses rolling captures only to choose which commit to render, never to decide a picture: the
full run still renders that commit completely and its verdict comes from its own captures. The cost is a
nightly a few hours older. It is flagged as ordering-only and measured in the trial against today's rule.

### 4f. What stays the gate

Unchanged: the full run's complete capture (ci.yml's story tests and release.yml's re-capture) of the exact
candidate commit, its verdict, the screenshot gate against nightly with the owner's signed approval, and
the held-candidate review when a full run is still green-images. Rolling captures add an earlier chance to
approve; they never approve, gate or promote anything.

### 4g. Failure modes

| Failure                                             | What happens                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A flaky render                                      | The in-job second shot makes it `unstable`: "Not ready", filed flaky, never offered. A one-off is replaced by the next slice.                     |
| A slice job fails or is cancelled                   | Its units stay oldest; the next slice takes them. Three consecutive failed slices file one issue (`bug`, `priority:high`).                        |
| X's Storybook artifact is gone                      | The bin fails; it never uses another commit's build.                                                                                              |
| Runners busy or saturated                           | Nothing starts until 30 quiet minutes. Freshness drops and shows on the dashboard; the full run still gates.                                      |
| A burst arrives during a slice                      | At most 7 jobs finish their few minutes; no new slice until quiet again. Measured as slice minutes held while saturated (section 6).              |
| The store or collector is down                      | The dispatcher does nothing. Slices that ran keep their artifacts; the index is written again on the job's re-run.                                |
| An approval merges while a full run judges a commit | Prevented by the merge window (4d rule 3) and the tree check (rule 4); the unsigned-tree alarm (rule 5) files an issue if anything slips through. |
| A stale approval pull request                       | Fails its own CI (tree check); `cli.mjs update <pr>`, and the owner signs again.                                                                  |
| A story changes again after its rolling approval    | The full run sees it changed and holds as green-images, as today. Never worse than today.                                                         |
| Actions cache pressure                              | Slices only restore the LFS cache, never save. The trial records cache size and evictions.                                                        |
| Artifact storage                                    | About 150 to 300 MB a full set (only changed items keep PNGs), a few sets a day, 7 days; free on a public repository. Measured in the trial.      |

## 5. Plan

Each step is one pull request with its tests written first. Workflow changes run
`pnpm run test:ci-workflows`; every step runs `node tools/sonar-gate.mjs`. No step touches the gate
(`gate.mjs`), the approval code (`approval.mjs`), the passkeys, the baselines or approvals, or ci.yml's
gate step and story-test jobs.

1. **Runner history on the read API.** tools/pipeline-health: `ci.jobs_running`, `ci.jobs_queued`,
   `ci.longest_queued_ms` and `ci.saturated_ms` (already collected every cycle) exposed as "now" members
   and as a series, and `range=7d` on the runners page (it answers `bad_range` today). Tests: views unit
   tests. Then record a week of 5-minute samples into this document and tune the thresholds.
2. **Story capture index.** tools/results-service: migration `0007_story_capture.sql` (both tables, the
   index), `POST /v1/story-captures` (`story-slices.yml` on master only), `POST /v1/story-reach` (ci.yml on
   master only), `GET /v1/story-captures` (newest per story, summary, queue size, last-notified times),
   pruning. Tests: the service's tests, including refusing other workflows; and the test that nothing else
   under `tools/` reads the endpoint.
3. **Slice planner, reach rows and workflow.** `storyBins()` gets `{ jobBudget }` with a unit test that pins
   the 3-minute limit when it is `Infinity`; `tools/channel/story-slices.mjs` (`plan`: reached first, then
   oldest first by unit, fixed 3-minute bins; `post`: the rows) with unit tests and a replay test on
   recorded store and index inputs; the `select-graphs` step in ci.yml that posts reach rows;
   `.github/workflows/story-slices.yml` (dispatch only; plan job and a matrix of capture jobs, each
   posting its rows; `post: false` dry run; LFS cache restore only; exact-commit Storybook artifacts),
   with a test in `tools/tool-tests.txt` that checks its triggers, permissions, concurrency, the restore-only
   cache, the exact-commit artifact download, and that it never touches `visual-baselines/`. Merges
   dormant: nothing dispatches it yet.

    **As built** (`tools/channel/story-slices.mjs`, its test, and `.github/workflows/story-slices.yml`):
    `storyBins()` was split into `storyUnitPlans()` (the units and their planned time) and `packStoryBins()`,
    which the planner reuses. The store gained `story_unit` (migration 0008), `units` on a slice's post and
    answer, and `GET /v1/story-reach`, because the planner needs a unit's age and a merge's reach and the step 2
    endpoints answered neither. The replay test runs the rotation over master's 280 recorded units (about 98
    capture-minutes): at 6 bins a slice the whole set is rendered in 7 slices, and again in the next 7. When the
    oldest units cannot fit, the planner fills a slice's remaining room with the next-oldest units, so a unit can
    be rendered twice before a big one is rendered once; the full set still completes each pass. **Reach is
    all-or-nothing today:** the story selector selects no project by file yet (`selectProjects` in
    `test-select-rules.json` is empty until `test-select-mutate.mjs --stories` proves one), so every merge's
    reach row is `<project>:*` for all seven projects and the order is by age alone. Reach starts to order work
    as projects join `selectProjects`; nothing in the slices has to change for that.

4. **Review page: the rolling target, and the rule change.** `tools/channel/rolling.mjs` (the `rolling`
   command, reading the store); in visual-review: `serve.mjs`'s "master rolling" target with
   render-bound decisions and no hash carry, `accept.mjs`'s rolling branch rule (accept parented on the
   render commit X, accept-only against X, branch `visual/approve-rolling-<sha12>`, the distinct subject),
   `config.mjs` accepting the `rolling` key; the one-approval-in-flight rules 1 and 2. Tools:
   `tools/channel/baselines-tree.mjs` in ci.yml's Checks job (rule 4), `tools/channel/rolling-merge.mjs`
   (rule 3), the unsigned-tree alarm in `tools/full-run.mjs pick` (rule 5), and tests that `acceptsIn`
   and `approvalsIn` ignore the rolling subject. Notifications: the bin job's Pushover messages, rate
   limited by the store. Docs: CLAUDE.md's Visual review section and `visual-review/README.md` for the new
   rule. visual-review's own tests (a fake store and fake artifacts); put into the live review server with
   `tools/live.sh visual-review` once committed. `pr-open.sh` leaves auto-merge off for the visual-review
   files; a session merges it once green.
5. **Dispatcher.** tools/pipeline-health: `decideSlice()` at the end of the collector cycle, the quiet
   rule, the separate base and idle budgets, the in-flight check, the slice runner-minutes from GitHub's
   job durations; unit tests for the decision table. Needs the release-scheduler App key in AWS (#3608,
   owner item).
6. **Dashboard metrics** with SLA targets, built as ten members of the health dashboard
   (`tools/pipeline-health`, `src/collector/slice-metrics.ts`, `config/slas.json`). Every one is a slow
   measure: shown with its target and color, never judged into a category's state and never a Pushover
   alert, so a trial week of busy runners does not page the owner. After the 7-day trial, the set's age
   may become a judged state.

    | Page     | Member                                 | Value                                                                                                    | Target, red      | Source       |
    | -------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------- | ------------ |
    | CI       | Screenshot set age                     | newest value: the oldest of every rotation unit's newest capture                                         | <= 6 h, > 12 h   | story-slices |
    | CI       | Base / idle slices, share of daily cap | today's (UTC) runner-minutes of the share / its cap in `config/slices.json`                              | <= 100%, > 125%  | collector    |
    | CI       | Idle slices, share of hourly cap       | idle runner-minutes in the last hour / the hourly cap                                                    | <= 100%, > 125%  | collector    |
    | CI       | Slice minutes held while contended     | 7-day sum of slice jobs running x cycle minutes, in cycles that were saturated or had another job queued | <= 35 min, > 105 | collector    |
    | CI       | Queue wait during slices               | 7-day sum of other jobs queued x cycle minutes, in cycles where a slice job ran                          | <= 35 min, > 105 | collector    |
    | Releases | Screenshot review lag                  | 7-day median, first rolling capture of a changed or new picture to the approval merge that took it in    | <= 6 h, > 24 h   | story-slices |
    | Releases | Slots meeting an unapproved picture    | green-images / (green-clean + green-images) full-run verdicts, 7 days                                    | <= 25%, > 75%    | release      |
    | Releases | Green-clean full runs                  | green-clean / every full-run verdict, 7 days (a same-commit re-run replaces)                             | >= 50%, < 25%    | release      |
    | Releases | Nightly promotions per day             | channel/nightly moving to a new commit, 7-day count / 7                                                  | >= 2, < 1        | collector    |

    How each is measured, and why:

    - **Contention from the collector's own 5-minute cycle**, not from `nextHolders`: each cycle already has
      every unfinished run's jobs, so it counts slice jobs `in_progress` and other jobs queued in the pool
      GitHub limits (machine.dev and self-hosted left out). 35 minutes a week is one burst meeting one full
      slice (7 jobs, 5 minutes), the bound section 4b accepts.
    - **The store is read every 15 minutes** for the dashboard (and whenever the dispatcher needs it), one
      `GET /v1/story-captures` (D1 rows on Workers Paid, no GitHub call). A read that succeeds marks the
      `story-slices` source, so its members stay "not set up" until the owner puts the store's token in SSM.
    - **Orphan units.** A unit not rendered for 7 days (the store's retention) is treated as gone, which fixes
      the step 5 review's finding that a renamed story file held the set's age, and so idle slices, forever.
      The count is written as the observation `slices.units_dropped` (not yet a dashboard row), so a unit that really stopped rendering can be found. The
      dispatcher's `storeSummary` uses the same rule.
    - **Review lag** follows each changed picture by its newest capture: it starts at the first newest
      capture seen as changed or new, and ends when the newest capture is unchanged against another
      baselines tree, at the newest `visual/approve-*` merge between the two (from the pull requests the
      collector already reads), or at the capture when none was seen. A picture whose change was reverted
      (unchanged under the same tree) counts nothing. It measures candidate approvals too, so it compares
      the two routes.
    - **Verdicts** come from the health API's `POST /v1/verdicts`, which release.yml's verdict step already
      sends: each now writes `release.green_clean` and, for a green run, `release.slot_unreviewed`, keyed by
      commit. A red run says nothing about pictures, so it is left out of the unreviewed share.

    Baseline for the trial comparison (the week before rolling capture, from the 2026-10-29 review in
    section 1): green-clean 0%, every green run green-images (100%), about 0.4 nightly promotions a day,
    and about 19 hours of owner review per promotion. Tried on fixtures in the dashboard's dev server (CI
    and Releases pages draw all ten rows with targets) and on a seeded store (`test/views/views.test.ts`).

7. **Pick rule** (section 4e) in `tools/full-run.mjs pick`, ordering-only, behind a repository variable so
   the trial can compare it with today's rule.

**Trial on real CI** (in step order, each recorded in `tmp/early-screenshots/journal.md`):

1. After step 3 merges: dispatch `story-slices.yml` by hand on master's newest green commit, `mode=base
bins=2 post=false`, then `post=true`. Check: 3 jobs, about 10 runner-minutes from GitHub's job
   durations, artifacts present, rows in the store, nothing else affected.
2. In a quiet overnight hour: dispatch `mode=idle` by hand until the freshness target is met. Check the
   full-set cost against 155 runner-minutes, the artifact sizes and the Actions cache size.
3. After step 4: start the review server (servherd) with the rolling target; it lists changed pictures
   with their commits, grouped. The owner reviews and Finishes; the approval pull request passes the tree
   check and merges in a window.
4. After steps 5 and 6: the dispatcher runs for 7 days. Pass when, from the dashboard: slice
   runner-minutes held while saturated are about 0 and non-slice queue wait caused by slice jobs is about
   0; slice runner-minutes stay under each cap every day; freshness stays under 6 hours; and against the
   7 days before, review lag, the share of slots meeting an unreviewed change, green-clean rate and
   promotions per day all improve. Then turn on the pick rule (step 7) for 7 more days and compare.

## 6. Review answers

Three reviews (CI cost and throughput, owner rules, owner flow and implementability) found these, each
answered above:

- **Budget omitted jobs and used per-bin cost.** Restated per run with every job (4a table); the post job
  is gone (bins post their own rows); reach comes from the existing master-push `select-graphs` job, not a
  plan job with an install; caps sum every job from GitHub's durations (4b).
- **`storyBins()` stretches bins to 12 minutes.** The planner passes `jobBudget: Infinity`, a unit test
  pins the 3-minute limit, and the rotation unit is the file or split that `storyBins()` packs (4a, step 3).
- **The idle threshold did not detect idleness.** The decision uses 30 minutes of no queueing and no
  saturation plus runner wait over the hour, idle slices only at 10 or fewer running, base slices at 30 or
  fewer and only when quiet, and it runs in the collector on data at most one cycle old (4b).
- **Idle demand was unbounded and the shared cap starved base slices.** Separate base and idle shares, an
  hourly idle limit, a freshness target as the idle stop, and the expected daily cost stated as the cap
  (4b).
- **The trial could not detect the harm.** Direct metrics: slice minutes held while saturated or queued,
  non-slice queue wait during slice jobs, and per-share minutes from GitHub's job durations (step 6,
  trial 4).
- **Rolling Finish on master's tip broke the render-to-signature link.** The accept commit is parented on
  the render commit X, as a candidate's is on H (4d); open question 1 is answered and removed.
- **An unsigned master baselines tree would stall nightly silently.** Rules 1 to 5 in 4d: one approval in
  flight in both directions, a merge window, a required tree check, and an unsigned-tree alarm.
- **The rolling accept subject could start a nightly promotion.** A distinct subject that `ACCEPT_SUBJECT`
  does not match, with tests on `acceptsIn` and `approvalsIn`, and no hold or red-run references (4d,
  step 4).
- **The rolling target inherited hash carries.** Decisions bound to one render, "Approved before" off, no
  carry by hash into a newer render or a candidate Finish; open question 2 widened (4d).
- **How the owner finds out was not designed.** Pushover from the bin job on empty-to-non-empty and before
  each slot, replacing (not reviving) the stopped notifier, and the CLAUDE.md and README rule change in
  step 4 (4d).
- **Green-clean was asserted, not shown.** An estimate with targets (4e), the pick rule moved into scope
  (step 7), and trial pass conditions on measured rates instead of the next run's luck.

## 7. Open questions and owner items

**Open questions for the owner:**

1. **Hash carries on the candidate target.** Today the review page keeps decisions by image hash (an
   image decided on one candidate arrives decided on the next), the "Approved before" filter accepts a
   byte-identical capture again, a candidate's Finish writes accepts carried by hash from an earlier head,
   and `recapture.mjs` counts an exact byte match with the head's baseline as unchanged. They are switched
   off for the rolling target. You still press Finish on a candidate, and the gate always compares a fresh
   render, but they are close to option (b). Switch them off for candidates too?
2. **Freshness target.** 3 hours for idle capture, 6 hours as the dashboard SLA: tighter means more idle
   minutes within the same caps.
3. **Stuck queued jobs and "quiet".** The replay in 4b found 1 or 2 jobs queued for over 20 minutes while
   the pool had free runners in 14% of all 15-minute buckets, and each blocks every slice. Leaving out of
   "queued" a job that waits while fewer than the limit run would roughly double the quiet time; it is a
   change to what "quiet" means, decided on step 1's 7-day series.

**Owner items (actions only the owner can take, none of them a file agents may not edit):**

- Put the release-scheduler App's private key into AWS for the collector's dispatch (the same move #3608
  needs), as `/graphty-health/release-scheduler/app-id`, `installation-id` and `private-key`. Step 5 cannot
  dispatch without it (it runs as a dry run until then).
- Put the results store's URL and a local token into AWS as `/graphty-health/results/url` and
  `/graphty-health/results/token` (the token's SHA-256 in the Worker's `LOCAL_TOKEN_HASHES`, beside the
  existing one). Step 5 decides nothing past "store-unavailable" without them.
- Step 4 changes files under `visual-review/` and `visual-review.config.json`, which `pr-open.sh` holds
  from auto-merge; by standing practice a session merges it once green. It does not touch `gate.mjs`,
  `approval.mjs` or `passkeys.json`.
