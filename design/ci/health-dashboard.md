# Pipeline health dashboard

A web page that answers in a few seconds "is any part of graphty-monorepo's pipeline unhealthy, and
which part?", and leads the reader to the cause in one or two clicks. The pipeline is everything
between a pull request and a published release: pull requests, CI, tests, master, the release
train, the deploy channels, and what it all costs. Readers are the repository owner and the agent
sessions that keep the pipeline moving; agents read the same data through an MCP server.

The page is static, on GitHub Pages at `health.graphty.app`. Its data comes from a small AWS
backend that collects from GitHub, CI and the billing sources, keeps rollups in DynamoDB and
serves them through a public read API.

The mockup is `design/ci/health-dashboard/mockup.html`: open it in a browser. It needs no network
and no script, its pages are reached from the left navigation, and its sample data is the
pipeline's real incidents of 2026-10-25 as the page would have shown them at 23:30 UTC (numbers
rounded, some filled in). This is version 2; version 1 is in git history.

## Changes from version 1

The owner's review of version 1 asked for a calm page with color instead of icons; the category
status line first and largest; an SLA for every measurement; 1 h and 6 h steps, not 90 days or 12
months; obvious drill-down; costs per process; flake hotspots by test and test group; median shard
and test-segment times; an MCP for agents; AWS as the one backend behind a GitHub Pages page, with
issues to move the Cloudflare services; and no agent vs human tracking. Sections 2 to 14 answer each.

## 1. What it must catch

A blind spot is a part of the pipeline whose failure leaves every panel calm. Each incident below
is real; the member (section 4) that now flags it is named after it.

October 2026:

- Local test records fell from 1,153 a day to 44 while their age looked fresh. Data sources:
  volume for its activity.
- A flaky story held one merge for five days. Flaky tests: blocked by a flake.
- Most intermittent failures appeared only under local load. Local runs: local vs CI
  disagreement (informational while no local gate runs).

2026-10-25, each on the front page within one collector cycle (5 minutes), and each drawn in the
mockup down to the page where it is acted on:

- **Runners saturated.** From about 19:20 UTC jobs queued while running jobs climbed to the
  Team plan's limit: at 23:27, 56 Linux jobs and 1 macOS job were running against a limit of 60,
  235 jobs were queued, and five master builds had waited as queued runs since 22:22. CI: runner
  wait, longest queued now, saturated time. The Runners page names who held the runners.
- **Two hours of cancelled master builds.** Every master build from 19:47 to 21:50 ended
  `cancelled` when the Build job hung in the Sentry source-map upload (six of them at its 12-minute
  timeout), and master-guard raised nothing because it acted only on `failure` (#3558, #3560).
  Master: red now, green time; CI: hangs. Earlier, ten builds created 18:02 to 18:47 were cancelled
  by hand at 18:54 to free runners; GitHub names who cancelled them, so they are drawn gray as
  "cancelled by hand", listed and not red.
- **A master bug turned every pull request red on one check.** `Test (graphty-*)` failed in five
  open pull requests from 18:03 (#3572); earlier the Figma lock in `Checks` refused every branch
  that merged master (#3556). Master: red on the same check, with the suspect merges.
- **`All Checks Pass` crashed** with "Argument list too long" in pull requests whose test plan was
  large (#3552), while every check it summarizes passed. Master: red on the same check, which now
  counts an aggregator failing alone.
- **Flaky stories and tests held merges.** Two stories drew differently by timing (#3521, #3553)
  and held three pull requests. Flaky tests: blocked by a flake (red at 3 pull requests), with
  screenshot captures as their own families.
- **The CPU-restricted stress run filed nothing.** It failed in its filing step (27 failures over a
  cap of 25), after two weeks of finding nothing (#3539). Data sources: stress run, read from
  GitHub's job results, not from the run's own post.
- **Release lanes red in shadow mode.** The newest candidate a full train tested (a870943ef) has
  failed its audit and T4 GPU lanes since 2026-10-24 19:25, shadow mode opens no "Release held"
  issue, and `promote.yml` failed on all 131 master pushes from 18:03. Releases: lanes red on the
  candidate, release workflows failing, which also says that the fix (#3577) waits on the owner.

So a source that is late, thin for its activity or has lost its token is never drawn as zero or
as a calm chart: the members that read it show NO DATA (3.1). A source that does not exist yet by
design is "not set up", gray and out of the status, so a category can be green on day one.

## 2. Layout

### 2.1 Front page

It fits 1440 x 900 without scrolling, and every page works down to 1024 wide with no sideways
scroll (the mockup's overview). From the top: the title, the range picker and "updated 2 min ago,
23:30 UTC"; a muted caption, "under each block: its headline measure now, and the last 24 h
hourly"; the seven category blocks, each with its headline measure under it; then "Last 24
hours", the list of episodes. The order follows Few ("a single screen read at a glance") and Google
SRE ("symptoms first, causes second"): the blocks say whether anything is wrong and where, the
measures give each category's number, and the episodes say what happened and link to where to act.

### 2.2 The category status line

Seven blocks in pipeline order: **Master, Pull requests, CI, Flaky tests, Releases, Costs, Data
sources**. Each block is filled with its state's color and holds the category name; the state word
(OK, WARNING, FAILING, NO DATA); when not OK, the member that set it in a few words ("runner wait
p90 31 min"; the threshold is on the detail page); the others not OK, named when there is one
("+ promote.yml failing") and counted when there are more ("+ 3 more"); and a chevron. The whole block links
to the category's page. Below 1280 px the blocks wrap into rows of four.

The blocks always show now: each member is judged over its own window (section 4), whatever range
the picker shows. This is the one place where healthy has a color, because the owner asked for
green, yellow and red per category and a row of green is itself the answer.

### 2.3 Headline measures

Under each block, in its column, sits the category's headline measure (name, value, target, 24 h
sparkline), a symptom someone would act on (DORA; the SRE golden signals): Master green time
(errors), time to merge (latency), runner wait p90 (saturation, 2026's largest delay), flake rate
per 1,000 test-file runs (normalized), lanes red on the release candidate (a hold from any lane),
spend this month projected (the one thing that cannot be rerun), and sources not OK.

A sparkline is 24 hourly points with the target as a thin gray band. A breach that lasts colors the
line itself (vermillion, or yellow with a dark edge); a single point past a threshold is a dot; the
current, partial hour is a hollow dot. Before a source has history the line gives way to a hatched
"no history" area. There are no end labels: the value is beside it.

### 2.4 Last 24 hours

A list of episodes: each time a member went past its target. Ongoing episodes first, then cleared
ones. Each row: a 4 px bar in the worst state the episode reached, its span ("20:01 - now",
"19:48 - 20:20"), the category, one sentence naming the member, its value and the cause when the
collector knows it, "ongoing" or "cleared 2.3 h ago", and a chevron to the section where it is
acted on. Cleared rows are muted. This is how an incident that ended before the reader looked is
still seen, and how a 24 h member that is still red after its cause ended says so.

### 2.5 Navigation and drill-down

- **Left navigation**, 200 px, always visible (NN/g: vertical lists scan faster than tabs and grow
  better). Overview, then the seven categories, each with a 4 px bar of its state color, so every
  page repeats the status line; the state word is in the link's accessible name. Sub-items open
  under the current category: CI has Runners and Local runs (pages) and Shard times (a section);
  Flaky tests has Hotspots and Quarantine (sections).
- **Clickable things look clickable at rest** (NN/g: weak signifiers cost 22% more time). Every
  linked row has a chevron, a pointer cursor and a hover background, and the whole row is the
  target. Tree rows turn their chevron down when open.
- **Breadcrumbs** on every page below the front ("Overview > CI > Runners"), ending at the page,
  unlinked. A section reached from the navigation scrolls into view on its page.
- Page, section and range live in the URL (`#/ci/runners?range=7d`), so a link reproduces the view.

### 2.6 Views

Ten views: the overview, the seven category pages, and **Runners** and **Local runs** under CI.
Shard times and Hotspots are sections of their category pages, so the member that judges them sits
right above its evidence.

Every category page has a breadcrumb, its title and range picker, its state word with one sentence
naming the member that set it and the others not OK, one row per member (name and one-line
definition, value, SLA, sparkline, state, chevron; OK members carry no word), then its sections:

- **Master**: a 24 h strip by minute (green, red, gray for cancels that are not failures:
  superseded, or cancelled by hand); red spans with builds, cause and fix; shared failures with the
  pull requests failing, start, suspect merges and issue.
- **Pull requests**: where the time goes for pull requests merged in the range (median minutes per
  stage: waiting for runners, checks running, red and being fixed, merging); "Waiting on the owner"
  (auto-merge off by rule: breaking, code-owner paths, screenshots), left out of the time members,
  each naming the red member its merge would fix.
- **CI**: why first attempts failed (shared, an aggregator alone, the change, flaky,
  infrastructure); Shard times (section 6). Hangs link to the red span they caused.
- **Runners**: running and queued jobs over 24 h on one count axis, with the plan's limit from
  config as a reference line and the observed peak as a label beside it; who holds the runners,
  now and during saturated spans, by repository, workflow and event, as sorted bars; runs still
  queued with no job created; superseded runs still running. Every GitHub-hosted job counts against
  the limit of 60 and a macOS job also against its own 5; machine.dev T4 jobs are not counted.
- **Local runs**: "no local gate since 2026-10-25"; the page state is a gray IDLE, and its members
  are idle with hatched "no history" sparklines (3.1).
- **Flaky tests**: Hotspots (section 5); Quarantine, which states that no entries exist.
- **Releases**: the lanes of the newest tested candidate; train attempts, including those that
  skipped every lane; release workflows; the channels once they exist.
- **Costs**: section 7. **Data sources**: the stress run's history; one row per source (last
  write, limit, volume for its activity, last error, state); then "Not set up", the one list of
  members with no writer or token yet, each with what unblocks it.

## 3. Status, SLAs and color

### 3.1 How a state is set

- Green is at or better than the target; yellow is past the target but not past the red threshold;
  red is past the red threshold.
- **A category is the worst of its members** (Statuspage's rule for a component with several
  incidents). Its block names the member that set it; of two at the same state, the one furthest
  past its threshold.
- **Every member names the sources it reads.** When one of them is past its age limit, thin for its
  activity (section 9), or has a token that stopped working, the member shows NO DATA, gray and
  hatched, with the reason ("token rejected since 10-24"), in its own category. NO DATA counts as
  yellow: a category whose worst member is NO DATA shows a gray NO DATA block, and one with any
  yellow or red member shows that instead.
- **Not set up.** A member whose source has no writer yet by design (the release channels, a feed
  of CI's flaky detections) or waits on an owner decision (a read-only billing token) is drawn gray
  as "not set up" and left out of the rollup, like idle. It is listed once, on the Data sources
  page, with the issue or owner decision that unblocks it, and its row elsewhere links there. So
  Costs, Releases and Data sources can be green on day one, and gray keeps meaning "something we
  rely on stopped".
- **Low sample.** A member with fewer events than its minimum (5 unless stated) is drawn gray with
  "n=3" and left out of the rollup: one failure in two runs is not a trend. So is a member whose
  source covers less than its window ("partial window, 2.8 h of 24").
- **Idle.** A member whose activity stopped by design (the local gate, retired on 2026-10-25) is
  drawn gray as "n=0" and left out of the rollup, and its page says why with a gray IDLE state.
- **A fix waiting on the owner.** When the pull request that fixes a red member waits on the owner
  (auto-merge off by rule), the member's row, its episode and the Pull requests page say "fix #N
  waits on the owner", so a red member is not read as unattended.
- **Clearing.** A windowed member ("hangs in 24 h") stays past its threshold until the window
  passes, but its row and its episode say "cleared 2.3 h ago" once the current value has recovered,
  and the alert's clear message fires then.
- Thresholds live in `tools/pipeline-health/config/slas.json`.

### 3.2 Colors

The Okabe-Ito colors, chosen to stay apart under color-vision deficiency, each with black text and
its word: OK `#009E73` bluish green (6.1:1), WARNING `#F0E442` yellow (15.9:1), FAILING `#D55E00`
vermillion (5.4:1), NO DATA `#D9D9D6` gray, hatched (14:1). Under simulated deuteranopia the closest
pair, yellow and vermillion, is 34 apart in CIELAB and differs in lightness (L 90 against 58). The
fills are the same in dark mode. A small yellow mark gets a dark edge (yellow alone is 1.3:1 on
white), and on a hatched fill every label sits on a solid gray panel. Check the real screenshots in
a deuteranopia simulation before release, not only the swatches.

The words OK, WARNING, FAILING and NO DATA mean only an SLA state, and only they are filled chips;
a page whose members are all out of the rollup says IDLE, in gray. A shard over budget, a failed
lane or an untested candidate is plain words with a 4 px mark in its color before them, as in the
episode list ("failed", "untested"). "n=3", "idle", "partial window" and "not set up" are muted
text. A NO DATA chip in a table is a solid gray label in a hatched frame.

Away from the status line and the navigation bars, color marks exceptions only: a not-OK state word,
a breached sparkline, a bar over budget, a failed lane. Data is gray with the current item in ink.

### 3.3 What is not drawn

Few's test, "would the data lose meaning if this was removed?", and Tufte's "avoid all data frames":
no status icons, logos, card borders or backgrounds, shadows, gridlines (a baseline and a target band
only), legends where a direct label fits, pies, donuts, gauges or stacked areas; no chips unless they
carry data; no change arrows. Three type sizes, 12, 14 and 22 px, and space instead of separators.
Thresholds read one way everywhere, target first: "target <= 5 min, red > 15"; the front page shows
only the target.

## 4. Metrics and SLAs

Shared definitions:

- **Master state** comes from the newest completed `ci.yml` push run on master. `failure` and
  `timed_out` are red. A `cancelled` run is classified from GitHub's own record, never from timing:
    - **superseded**, gray, not counted: its check-run annotation reads "Canceling since a higher
      priority waiting request for '<group>' exists". `ci.yml`'s push concurrency group is
      `ci-<sha>`, so no master build is ever superseded by another; the rule is kept for other
      workflows and for a later change of the group.
    - **cancelled by hand**, gray, listed but not red: the run's cancel actor (from the run's
      timeline, or an annotation naming a user, "The run was canceled by @<user>") is a person or a
      session acting as one. The ten builds created 18:02 to 18:47 on 2026-10-25 and cancelled at
      18:54 to free runners were this.
    - **every other cancel is red**, including a job that ended at its own `timeout-minutes` (also a
      hang) and the Sentry cancels of 19:47 to 21:50.

    The master state keeps the last red or green verdict through a gray run. The newest build that is
    queued or running, and for how long, is shown beside "Red now", so a stale green is not read as
    current.

- **Excluded checks**, which restate other checks or judge metadata: `All Checks Pass`, `Queue
Checks Pass`, `Lint PR Title`, `Link PR Issue`, `Visual report`, `Draft state`. They are left out
  while a check they summarize also failed. **One that fails while every check it depends on passed
  is a failure of its own, with cause shared**, and counts in "Red on the same check".
- **The visual gate.** An attempt whose only failure is the gate waiting for the owner's screenshot
  review is owner wait, not a failure. A capture error is a failure.
- **Failure cause**, in order: infrastructure (startup failure, lost runner, outside 5xx, a timeout
  in 3 or more pull requests); conflict; flaky (below); shared (an aggregator failing alone, or a
  check or family failing without passing on rerun in 3 or more pull requests within 24 h, or on the
  next full run); change (the rest). Reclassified as evidence arrives. A "flaky" test that fails in 3
  or more pull requests at once is raised as shared: it may be a real break.
- **Flaky**: a test that failed and passed on the same inputs key -- in the shard's own retry, a job
  rerun, another pull request or a full run. A rerun that also failed says "failed rerun".
- **Check families.** Pull request runs pack test files into bins per pull request (`Test
(<family>-<bin>)`), so a check is grouped by family, never by bin.
- Medians and p90 come from raw events, never averages of buckets; rates are ratios of sums.

Thresholds below give the target (green) and red; yellow lies between. The window is what the status
uses. (H) marks a category's headline.

### 4.1 Master

| Member                | Measure, window                                            | Target | Red                   |
| --------------------- | ---------------------------------------------------------- | ------ | --------------------- |
| Red now               | length of the current red span; newest build queued, age   | 0      | >= 15 min or 2 builds |
| Green time (H)        | share of wall time master's newest commit was green, 24 h  | >= 95% | < 90%                 |
| Red on the same check | most open pull requests failing one check or family        | <= 1   | >= 3                  |
| Last full-run verdict | ci lane of the newest judged candidate; names failing jobs | passed | failed                |
| Untested master age   | age of the oldest master commit no full run has judged     | <= 7 h | > 13 h                |
| Reverts               | reverted merges / merges, 7 d (min 10)                     | < 5%   | > 10%                 |

A red Master alerts at once (section 13). Untested master age replaces both "full-run verdict age"
and "since the last passing train": a quiet night on which the train skips an unchanged master
does not grow it, and a train that skips a new commit (the 18:00 attempt on 2026-10-25) does; the
row names that attempt and commit at once, and Releases turns yellow (4.5).

### 4.2 Pull requests

Times leave out pull requests waiting on the owner (auto-merge off by rule).

| Member             | Measure, window                                  | Target    | Red    |
| ------------------ | ------------------------------------------------ | --------- | ------ |
| Time to merge (H)  | median of merged minus ready, 24 h               | <= 60 min | > 180  |
| Open pull requests | open, not draft                                  | <= 15     | > 25   |
| Oldest open        | age of the oldest open, not waiting on the owner | < 24 h    | > 72 h |
| Merge ratio        | merged / created, 24 h (min 5 created)           | >= 0.9    | < 0.7  |
| Auto-merge stuck   | armed, green and unmerged 2 h, or armed 6 h      | 0         | >= 3   |
| Screenshot backlog | oldest pictures waiting for the owner            | < 24 h    | > 72 h |

### 4.3 CI

| Member                       | Measure, window                                                   | Target   | Red               |
| ---------------------------- | ----------------------------------------------------------------- | -------- | ----------------- |
| Runner wait (H)              | p90 of job start minus created, organization, 24 h                | <= 5 min | > 15              |
| Longest queued now           | oldest queued job, or queued run with no job yet, right now       | <= 5 min | > 15              |
| Saturated time               | jobs queued > 2 min while running >= limit - 3, 24 h              | 0        | >= 1 h            |
| Runners not being assigned   | jobs queued > 2 min while running < 75% of the limit, now         | 0 min    | >= 15 min         |
| First-attempt pass rate      | pull request check suites passing attempt 1, 24 h                 | >= 85%   | < 70%             |
| Hangs                        | jobs ended at their own timeout, or past 2x budget                | 0 in 7 d | any in 24 h       |
| PR check duration            | median run / its kind's budget (`run:ci.yml:pr` 20, `pr-wide` 35) | <= 1x    | > 2x              |
| Full-run shards over budget  | shards whose median passes their budget, 7 d (section 6)          | 0        | >= 3, or one > 2x |
| Pull request bins over 8 min | share of bins past the 8 min packing target, 24 h                 | <= 10%   | > 25%             |
| Reruns                       | run attempts above 1 / runs, 24 h                                 | < 5%     | > 15%             |
| Superseded runs running      | see below; informational until it has fired on real data          | --       | --                |

**Runner use is counted in jobs**, from the jobs API (`filter=latest`) of every unfinished run,
never from run status: a run reports `queued` while some of its jobs run (run 40240348348 had 9 jobs
running and 19 queued). The limit comes from config (`slas.json`: `linux_windows: 60`, `macos: 5`,
the Team plan); every GitHub-hosted job counts against the 60, and a macOS job also against its 5.
The observed peak is a label beside the limit line, never a threshold, so a miscount or a GitHub
problem is never learned as "the limit". "Runners not being assigned" is the other cause of a
queue: jobs wait while there is room, so the cause is outside the repository; its row links
githubstatus.com, so nobody cancels full runs for a GitHub problem. The cost is one jobs call per
unfinished run each cycle, about 40 calls every 5 minutes on 2026-10-25, well inside the App's
hourly budget.

"Superseded runs running" counts only what nothing else cancels: runs of workflows without
`cancel-in-progress` on `pull_request` (PR Integrity, CodeQL) whose pull request has a newer
commit, and jobs with `if: always()` still running after their run was cancelled. `ci.yml` and
`hosts.yml` cancel their own superseded pull request runs. It gets a state once it has fired on
real data.

### 4.4 Flaky tests

| Member                         | Measure, window                                                        | Target | Red                  |
| ------------------------------ | ---------------------------------------------------------------------- | ------ | -------------------- |
| Flake rate (H)                 | flaky test-file runs per 1,000 test-file runs, CI, 24 h                | < 2    | > 10                 |
| Blocked by a flake             | open pull requests whose newest failure is flaky, or an unstable story | 0      | >= 3, or any >= 24 h |
| Flaky in CI with no open issue | distinct tests flaky in CI, 7 d, with no open issue                    | 0      | >= 3                 |
| Net new flaky                  | newly flaky minus resolved (10 clean runs or issue fixed), 7 d         | <= 0   | > 3                  |
| Detected to fixed              | median days from flaky issue opened to fixed, 28 d (min 5)             | <= 3 d | > 7 d                |

"Flaky in CI with no open issue" replaces the quarantine members of version 2: CI keeps no
quarantine state and files no issues (`tools/test-quarantine.mjs`), and the committed list is
empty, so those members would have been wrong forever. The drill-down drafts the missing issue. A
feed of CI's flaky detections is tracked in its own issue (section 14).

### 4.5 Releases

Read from `release.yml`'s job conclusions, so a shadow run, which opens no "Release held" issue, is
judged like a legacy one; hold issues are read too. Lanes: `ci`, `t4`, `hosts`, `autosave_macos`,
`audit`, `llm`, `version`, `land`, `publish`.

| Member                         | Measure, window                                                        | Target | Red          |
| ------------------------------ | ---------------------------------------------------------------------- | ------ | ------------ |
| Lanes red on the candidate (H) | lanes red on the newest candidate a train tested (a hold)              | 0      | open >= 6 h  |
| Release workflows failing      | failed runs of `release.yml`, `promote.yml`, `release-watch.yml`, 24 h | 0      | >= 3         |
| Train skipped a new commit     | the newest attempt skipped every lane on an untested master commit     | no     | --           |
| Tagged, not on npm             | versions tagged but not listed by `npm view <pkg> time`                | 0      | after 30 min |
| Train first-attempt pass       | attempts that tested and passed first time, 7 d (min 5)                | >= 90% | < 75%        |

"Train skipped a new commit" is yellow at once, so a skipped candidate is seen hours before
untested master age passes its target. The channel members (canary, nightly and production age,
merge to canary and nightly, change failure rate) follow the channels pipeline design once the
channels exist; until then they are not set up ("channel not built yet, #3418").

### 4.6 Costs

Month to date, projected to month end. Only money sets the state; list-price values and per-run
figures are for comparison (section 7). Budgets are configured; these are sample values. The two
usage members are not set up until their read-only tokens exist (section 16).

| Member               | Measure                                          | Target     | Red    |
| -------------------- | ------------------------------------------------ | ---------- | ------ |
| Spend this month (H) | projected sum of every money line                | <= 300 USD | > 360  |
| T4 GPU               | projected, machine.dev                           | <= 200 USD | > 240  |
| LLM regression       | projected, Gemini (the owner's ceiling)          | <= 60 USD  | > 75   |
| AWS                  | month to date, Cost Explorer (the 10 USD Budget) | <= 8 USD   | > 10   |
| Cloudflare usage     | usage / the plan's allowance                     | < 50%      | > 90%  |
| Sentry usage         | events / the plan's quota                        | < 80%      | > 100% |

### 4.7 Data sources

| Member                          | Measure                                            | Target           | Red                              |
| ------------------------------- | -------------------------------------------------- | ---------------- | -------------------------------- |
| Stress run                      | the weekly run, from GitHub's job and step results | passed and filed | filing failed, or not run in 8 d |
| Sources past their age limit    | sources past their limit (section 9)               | 0                | any past 2x                      |
| Sources thin for their activity | rows per unit of activity / the 7 d median         | 0 below 50%      | any below 20%                    |
| Collector                       | since its last run                                 | <= 10 min        | > 20 min                         |
| GitHub App rate limit           | requests left in the collector App's hour          | > 50%            | < 20%                            |
| Daily write budget              | rows written today / the daily limit               | < 50%            | > 90%                            |

The stress run is yellow when it found nothing three weeks running, and red when its filing step
failed or it had failing tests and filed fewer issues. It is read from GitHub, because a run that
crashes before posting posts nothing. Sources that are not set up are not a member: they are
listed under "Not set up" on this page, each with what unblocks it, out of the status.

## 5. Flake hotspots

The question is where flaky tests cluster, so the unit is a distinct flaky test, not a failure: one
broken change can fail 140 tests in one family and bury the real hotspots. The Hotspots section of
the Flaky tests page is one tree table, in the order CI organizes tests:

1. **Job group or shard family**: `small-node` and `small-browser` (`GROUPS` in
   `tools/ci-test-matrix.mjs`), or a family (`graphty-element-browser` holds `-1` to `-5`).
   **Screenshot captures are a family per Storybook project** ("graphty screenshots"), fed by the
   capture statuses and `tools/visual-flaky-report.mjs`; a story marked `unstable` blocks a merge
   until the owner excludes it, and counts in "Blocked by a flake".
2. **Shard**, for full runs only: a pull request's bins hold different files in every pull request.
3. **Test file**, or story file.
4. **Test**, or story.

Each row: name (only a job group says "job group, 6 shards"; GPU families say "GPU: never
quarantined"); distinct flaky tests as a gray bar; events; flake rate per 1,000 runs at that level;
quarantined, as a count; pull requests held. A row opens its children in place; a test row links to
its history (commit, pull request or full run, attempt, signature, issue). CI and local results are
never mixed.

## 6. Shard and test-file times

The Shard times section of the CI page has one row per shard of the **full runs** (the release
train's `ci` lane), worst against budget first: runs (n; shadow trains run at most four a day and
skip an unchanged master, so expect 5 to 15 in 7 days, and a shard under 5 runs is drawn gray as
"n=4" and left out of "full-run shards over budget"), median and p90 of the test step (attempt 1,
successful runs, from the results store's `invocation.secs`), and a bar: median dark, p90 a light
extension, the `ci-budgets.json` budget a vertical line. The median is vermillion past the budget;
the p90 extension is yellow with a dark edge when only it passes; a plain note says which. A shard
opens its top 20 test files with median, p90 and share of the shard, so a regression points at the
file. Pull request bins are a second view: one row per family against the 8-minute packing target.

## 7. Costs

The Costs page answers what running the pipeline costs and which process costs it:

- **T4 GPU on machine.dev (money).** Each `machine/gpu=t4` job (`gpu.yml`, `gpu-weekly-paired.yml`,
  `gpu-rerun-on-runner-loss.yml`, dispatches): minutes rounded up, plus one for boot, times the rate
  for the label's tenancy (on demand 0.018 USD/min, spot 0.0045); reconciled monthly with
  machine.dev's Cost Explorer.
- **LLM regression (money).** One paid run per UTC day (`tools/llm-due.mjs`); until token counts are
  recorded, paid test steps (as `llm-due.mjs` counts them) times 0.94 USD, about 29 USD a month.
  Local runs are on the owner's own Gemini bill and not in it.
- **AWS (money).** Cost Explorer, daily by service; credits left.
- **Cloudflare and Sentry (money).** Their plans (5 USD; the Sentry plan), plus usage against the
  allowance or quota from their APIs, which need read-only tokens.
- **GitHub (money).** Team, 2 seats, 8 USD. Actions minutes are free for this public repository;
  their list-price value (Linux 0.006, Windows 0.010, macOS 0.062 USD/min) is value, never money.

The page shows the money lines (projected, so far against budget, 28 d projection, state) and their
total, which equals the headline; the usage members; "unit costs" for comparison only (money per
release train, list-price value per merged pull request); money and list-price value by workflow as
two sorted-bar lists, never summed. Ranges 7 d and 28 d. Rates live in
`tools/pipeline-health/config/rates.json` with the date each was checked; a missing rate or a
rejected token shows NO DATA, never zero, and a token not yet created is not set up.

## 8. Time ranges and buckets

- **24 h in 1 h steps** and **7 d in 6 h steps**.
- **28 d in 1 d steps** only for slow measures: Flaky tests (hotspots, resolved, detected to fixed),
  Releases (change failure rate) and Costs. Each page's picker offers only its own ranges: Overview,
  Master, Pull requests, CI, Runners, Local runs and Data sources 24 h (default) and 7 d; Flaky tests
  24 h, 7 d (default) and 28 d; Releases 24 h (default), 7 d and 28 d; Costs 7 d and 28 d (default).

The picker changes charts and tables, never the status line or the members' state. Counts are
summed per bucket, rates are ratios of sums, durations come from the bucket's histogram, stocks show
the end-of-bucket value and peaks the bucket maximum. **Times are in UTC**, named once in the header
("updated 2 min ago, 23:30 UTC"), because the runs, issues and the release schedule all speak UTC.
The current bucket is partial and drawn hollow. On 28 d views the golden-local week (2026-10-18 to
10-24, no pull requests) is shaded, so a change of process is not read as a change of health.

## 9. Data age, volume and missing data

| Source                                              | Expected             | Yellow at           |
| --------------------------------------------------- | -------------------- | ------------------- |
| Collector: GitHub runs, jobs, pull requests, issues | every 5 min          | 15 min              |
| CI test results and timings                         | every CI run         | 2 h of runs without |
| Release records (from `release.yml` jobs)           | each train attempt   | 7 h                 |
| npm publishes                                       | hourly               | 3 h                 |
| Weekly stress run (from GitHub)                     | Sundays              | 8 d                 |
| Host matrix                                         | nightly              | 30 h                |
| Billing (Cost Explorer, Cloudflare, Sentry)         | daily                | 36 h                |
| Feed of CI's flaky detections                       | each new flaky entry | not set up          |
| Local writer (test ledger, push log)                | each local run       | idle, not judged    |

Red at twice the yellow age. **Volume is judged per unit of activity**: rows per CI run for CI
results, rows per local run that happened for the local writer, so a quiet week or a retired local
gate is not a false alarm, while a writer that posts 31% of its usual rows per run is. An
unreachable source is NO DATA, hatched, never 0; a chart before its source's history is hatched "no
history"; an empty table names what is absent ("no quarantine entries").

## 10. Backend on AWS

### 10.1 Shape

```
GitHub Actions  --OIDC JWT-->  API Gateway HTTP API  -->  ingest Lambda  --+
                               (JWT authorizer)                            v
EventBridge Scheduler --5 min-->  collector Lambda  ----------------->  DynamoDB
  (GitHub App, npm, billing)        rollups, status, alerts                |
health.graphty.app, MCP server  --GET-->  HTTP API  -->  read Lambda  <----+
CloudWatch alarm on the collector  --SNS-->  owner's email
```

The account (494945606241) is on AWS's paid plan with 120 USD of credits and runs everything in
us-east-2. Its managed policies rule out Lambda@Edge, cross-Region and cross-account access, and
deny creating IAM identity providers, so **GitHub OIDC to an IAM role is impossible**. Lifting that
("activate advanced features") is irreversible and removes the spend limit, so the design needs no
AWS credential in GitHub at all.

### 10.2 Authentication

- **CI writes.** The job (`permissions: id-token: write`) sends a GitHub OIDC token with audience
  `graphty-health`. The HTTP API's JWT authorizer checks signature, issuer, audience and expiry
  before any Lambda runs; the ingest Lambda checks the claims (`repository_id`, `job_workflow_ref`,
  `ref`) against the record kinds each workflow may write, as `tools/results-service/` does today.
- **Reads are public.** Everything stored is already public on GitHub (runs, pull requests, test
  names, truncated failure messages); no tokens, logs or host names are stored.
- **The collector** signs in as a GitHub App, with the App's own rate limit, never the budget the
  sessions share. Every secret is an SSM SecureString under `/graphty-health/`.
- CORS allows `GET` from `https://health.graphty.app` and the servherd dev origin only. A local
  writer, if a local gate runs again, gets its own token route accepting only kind `local`.

### 10.3 Storage

One on-demand DynamoDB table, `graphty-health`: runs and jobs (90 days by TTL); shard runs with
per-file results and a row per failed or retried test (90 days; passing tests per file, which cuts
writes 20 to 50 times); pull requests, issues, npm versions and cost lines (kept); rollup buckets
`ROLL#<metric>#<dims>#<step>` (1 h kept 14 days, 6 h 60 days, 1 d 400 days); one precomputed item
per page and range.

**Rollups are recomputed, never incremented**, so a retried post cannot double-count. Ingest writes
raw items idempotently and marks each hour it touches dirty; every 5 minutes the collector
recomputes those buckets, their parents and the page items. A bucket holds counts, sums and a
32-bin log-scale duration histogram, so medians and p90 come from merged histograms.

### 10.4 Collection

- **Collector Lambda**, every 5 minutes (EventBridge Scheduler, reserved concurrency 1): runs and
  jobs created or finished since its cursor, plus every queued and in-progress job, across every
  organization repository with Actions activity (runner demand is organization-wide); one GraphQL
  query each for pull requests and issues; one jobs call (`filter=latest`) per unfinished run, about
  40 calls a cycle at the 2026-10-25 peak; `release.yml` and `restricted-cpu-stress.yml` job and
  step conclusions; npm hourly; billing daily. Then rollups, status and alerts (section 13). The
  collector alone covers runners, master, shared failures, release lanes and the stress run.
- **CI posts** (results wiring, #3429): each shard run with per-file results and every failed or
  retried test, from the JUnit each shard writes; run, job and step timings; LLM token counts once
  recorded. A failed post never fails a job.
- **Backfill**: the last 28 days of runs and jobs, throttled. Check first on a known run whether a
  job behind `needs:` gets its `created_at` at run creation; if so, its wait starts when its last
  dependency finished.

### 10.5 Spend protection

1. **In code (seconds).** Reserved concurrency: ingest 20, read 5, collector 1. Throttles: reads 20
   requests/s (burst 40), CI writes 50 (100). Bodies up to 1 MB and 5,000 rows. A **daily write
   budget**: each ingest adds its rows to a `QUOTA#<day>` item under a condition (300,000 rows,
   about 5 times normal); past it writes get 429 and Data sources turns red. Reads are answered from
   the precomputed page items with `Cache-Control: max-age=60` (an HTTP API has no gateway cache).
   Timeouts 10 s (collector 60 s); logs kept 14 days.
2. **An AWS Budget (hours).** 10 USD a month, email at 50% actual and 100% forecast, and an action
   at 100% actual that attaches a deny-all policy to the Lambda roles.
3. **The project spend limit (days).** Set by the owner: 20 USD (the minimum), "stop new resource
   creation" on, "pause top cost drivers" off. Reaching it pauses the whole project.

The last two can silence the collector, and with it the dashboard and its alerts, so section 13
adds an alarm outside the collector.

### 10.6 Code and deploy

CDK in TypeScript in `tools/pipeline-health/` (`infra/`, `src/`, `web/`, `mcp/`, `test/`), deployed
by CodeBuild through a CodeConnections connection on master pushes that touch it; by hand until the
owner approves the connection.

### 10.7 Cost

About 4 USD a month at 200 CI runs a day: HTTP API 0.50, Lambda 1.10, DynamoDB 1.65, CloudWatch
Logs 0.50, Cost Explorer 0.30; storage, SSM, Scheduler, the alarm and SNS email free. The credits
cover years, and the backend's own cost is a line on the Costs page.

## 11. The page

**Hosting: a new public repository, `graphty-org/pipeline-health`, at `health.graphty.app`.**
graphty.app is the production channel and moves only on the owner's go, but a health page must keep
updating when the pipeline is broken. The source stays in `tools/pipeline-health/web/`; a workflow
on master builds it and pushes it to the pages repository with a deploy key. The page holds no data:
it reads the API on load and every 60 seconds, and says so in red when the data is over 15 minutes
old.

**Technology: Vite and TypeScript, no UI framework**: ten views, hash routing, `fetch`, and five
small SVG drawing functions (sparkline, budget bar, sorted bars, minute strip, tree rows). A chart
library would bring back what 3.3 removes. Light and dark follow the system; every chart has its
values as a visually hidden table, and every row is a keyboard-reachable link.

## 12. MCP server for agents

`tools/pipeline-health/mcp/server.mjs`, a stdio server on `@modelcontextprotocol/sdk`, registered in
the root `.mcp.json` as `pipeline-health`. It reads the public API, so agents need no credentials.
Results are small JSON, capped at 50 rows with `truncated`, and carry each source's age with
`stale: true` past its limit, so an agent reports a stale dashboard instead of trusting a calm one.
Tools: `health_status()` (each category's state, the member that set it, and the last 24 h of
episodes); `category(name)`; `master()` (red spans, full-run verdict, untested age, shared failures
with suspects); `runners()` (running and queued jobs against the limit, holders, saturated or not being assigned); `release_lanes()`; `pull_requests(number?,
state?)`; `owner_queue()` (screenshots, owner merges, `breaking-go`); `flaky_hotspots(range, level,
under?)`; `test_history(file, test?, range)`; `shard_times(range, kind, shard?)`; `ci_runs(...)` and
`run(runId)`; `costs(month?)`; `sources()` (each source's age and state, and the not-set-up list).

The pipeline-round and issue-round skills call `health_status` first instead of sweeping GitHub.
They say the data is up to 5 minutes old, and that an agent confirms on GitHub or in the pull
request status broker before reverting, rerunning or closing anything.

## 13. Alerts

A dashboard nobody has open is a blind spot of its own. The collector sends Pushover notifications
(the application the release train uses, its keys in SSM) naming the category, member, value,
threshold and page link, once per episode and once when it clears:

- **Master red: at once.** master-guard is the first alarm; this is the independent backstop for
  when master-guard is wrong, as it was on 2026-10-25.
- **Any other category red for 30 minutes.**

**A dead-man's switch.** The collector both computes the status and sends the alerts, so a paused
AWS project, the Budget action's deny-all policy or a crashing collector would silence both. A
CloudWatch alarm on the collector's errors or missing invocations (no successful run in 20
minutes) emails the owner through SNS, which needs neither the collector nor Pushover.

## 14. Rollout

1. **First AWS service, with its alarms.** Bootstrap CDK; deploy the stack (table, API, Lambdas,
   schedule, parameters, Budget, CloudWatch alarm and SNS email) by hand; create the collector's
   GitHub App; collect and backfill; turn on the Pushover alerts.
2. **The same day, open the issues:**
    - **Results service** (Worker and D1) becomes routes of the health API with the same claim rules.
      `/v1/plan` is on CI's path, so it fails open on a 5xx, a 429 or a paused project. CI posts
      through the one URL variable of the #3429 wiring, so it never posts to two stores longer than
      the comparison week.
    - **Release scheduler** (Worker crons): EventBridge Scheduler and one Lambda. It is the release
      train's only clock, so keep the Worker until the AWS one has fired every slot for two weeks in
      dry run.
    - **nx remote cache** (Worker and R2): measure first. R2 egress is free and S3 egress is not;
      move only if monthly egress is well under 100 GB and nx follows presigned S3 redirects.
    - **A feed of CI's flaky detections**, since CI keeps no quarantine state.
3. **The page from collector data alone**: front page, Master, CI, Runners, Releases, Data sources.
4. **CI writers** (per-file results through #3429, timings, LLM tokens); then Flaky tests, Shard
   times and Costs.
5. **The MCP server**; the round skills switch to `health_status`.
6. **CodeBuild deploys**, once the connection is approved.

## 15. Decisions

Decided here and easy to change:

- **Headline measure under its block** (one column per category) rather than a separate list of
  rows: the eye goes straight from a yellow block to its number, and the front page loses a list.
- **"Not caused by the change" is not a member.** Its incidents are already judged where they are
  acted on (shared failures in Master, flakes in Flaky tests, infrastructure in CI); counting them
  again in Pull requests turned one incident red in three places. Its breakdown stays as a CI
  section.
- **The navigation shows the state as its bar only**; the word is in the accessible name and on
  every page header. "Data sources WARNING" filled the 200 px column.
- **Times in UTC**, named once in the header, rather than the reader's zone.
- **Not set up is not NO DATA.** A member that cannot have data yet by design is gray and out of
  the status, listed once on Data sources; NO DATA is kept for a source that broke. A block that is
  gray every day teaches readers to ignore gray.
- **"Train skipped a new commit" as its own Releases member**, rather than only a note on untested
  master age: it is yellow the moment it happens.
- **Thresholds**, budgets and which measure heads each category: tune after two weeks of data.

Where the two reviews of version 2 disagreed:

- **Thin local data.** The design review asked that "Local vs CI disagreement" show NO DATA in Flaky
  tests because the local writer was thin; the engineering review said the local gate is retired, so
  thin local data is now permanent and would alarm every day. Decided: every member names its
  sources and shows NO DATA when one is stale or thin (the design review's rule, 3.1), and volume is
  judged per unit of activity (the engineering review's rule, section 9), so a retired writer is
  idle, not thin. Local vs CI disagreement moves to Local runs and out of the rollup until local
  shard runs exist again. Reason: the rule catches October's blind spot without turning a process
  change into a permanent false alarm.
- **Shard rows and state words.** The design review offered either dropping state words from shard
  rows or giving each shard its own SLA; the engineering review moved shard timing to full runs and
  pull request bins to their own target. Decided: no state words on shard or tree rows, a plain note
  instead, and full runs by default. Reason: a per-shard SLA would add 36 members for one rollup that
  "full-run shards over budget" already gives.
- **Flaky members.** The design review drew "Flaky, no quarantine entry" as a NO ENTRY chip; the
  engineering review showed the quarantine mechanism no longer writes. Decided: "Flaky in CI with no
  open issue", and the Quarantine section only states that no entries exist. Reason: a member must
  read a mechanism that still runs.

## 16. Owner decisions

One-way doors, for the owner:

1. The URL `health.graphty.app` and the repository name `graphty-org/pipeline-health` (public
   names; the default above).
2. The AWS project spend limit (20 USD recommended), which only the owner can set.
3. The CodeConnections approval, and the collector's read-only GitHub App (actions, checks, pull
   requests, issues, metadata).
4. Read-only tokens for the cost lines: Cloudflare (Account Analytics: Read, Billing: Read) and
   Sentry (org:read). Until they exist, those members are not set up, out of the status.
5. The email address the CloudWatch alarm sends to.
