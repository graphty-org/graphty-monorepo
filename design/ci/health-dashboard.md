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
rounded, some filled in). This is version 2, revised so that every state is judged on the last
hour (section 8); version 1 is in git history.

## Changes from version 1

The owner's review of version 1 asked for a calm page with color instead of icons; the category
status line first and largest; an SLA for every measurement; 1 h and 6 h windows, not days or
months; obvious drill-down; costs per process; flake hotspots by test and test group; median shard
and test-segment times; an MCP for agents; AWS as the one backend behind a GitHub Pages page, with
issues to move the Cloudflare services; and no agent vs human tracking. Sections 2 to 14 answer each.

His review of version 2 added: windows measured in days hide a problem or a trend for days, when it
should be noticed within hours. So every state is judged on the last 1 h, the 6 h is the trend, and
24 h is only backdrop (section 8, and the decision in section 15).

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
scroll (the mockup's overview). From the top: the title, the range picker (1 h, 6 h, 24 h; 1 h by
default) and "updated 2 min ago, 23:30 UTC"; a muted caption saying that rates are judged on the
last 1 h and states now, and what the sparkline shows; the seven category blocks, each with its
headline measure under it; then "Last 24 hours", the list of episodes. The order follows Few ("a single screen read at a glance") and Google
SRE ("symptoms first, causes second"): the blocks say whether anything is wrong and where, the
measures give each category's number, and the episodes say what happened and link to where to act.

### 2.2 The category status line

Seven blocks in pipeline order: **Master, Pull requests, CI, Flaky tests, Releases, Costs, Data
sources**. Each block is filled with its state's color and holds the category name; the state word
(OK, WARNING, FAILING, NO DATA); when not OK, the member that set it in a few words ("runner wait
p90 31 min"; the threshold is on the detail page); the others not OK, named when there is one
("+ promote.yml failing") and counted when there are more ("+ 3 more"); and a chevron. The whole block links
to the category's page. Below 1280 px the blocks wrap into rows of four.

The blocks always show the status: each member is judged on the last 1 h or, for a state, now
(section 4), whatever range the picker shows, so a problem reaches its block within one collector
cycle (5 minutes) of crossing its threshold. This is the one place where healthy has a color, because the owner asked for
green, yellow and red per category and a row of green is itself the answer.

### 2.3 Headline measures

Under each block, in its column, sits the category's headline measure (name with its window, "last
1 h" or "now"; value; its 6 h value and the target; sparkline), a symptom someone would act on
(DORA; the SRE golden signals): Master green time (errors), time to merge (latency), runner wait p90
(saturation, 2026's largest delay), flake rate per 1,000 test-file runs (normalized), lanes red on
the release candidate (a hold from any lane), spend this month projected (the one thing that cannot
be rerun), and sources not OK. A headline with too few samples in the last hour says "too few, n=2
of 5" in gray in place of its value, with its 6 h value beside it.

A sparkline is the last 6 h in 15-minute buckets, with the last hour (the window that sets the
state) shaded and the target as a thin gray band. To its left, in a faint line, the rest of the last
24 h by hour: backdrop only, never colored. A breach that lasts colors the 6 h line itself
(vermillion, or yellow with a dark edge); a single bucket past a threshold is a dot; the current,
partial bucket is a hollow dot. Before a source has history the line gives way to a hatched "no
history" area. There are no end labels: the value is beside it.

### 2.4 Last 24 hours

A list of episodes: each time a member went past its target. Ongoing episodes first, then cleared
ones. Each row: a 4 px bar in the worst state the episode reached, its span ("20:01 - now",
"19:48 - 20:20"), the category, one sentence naming the member, its value and the cause when the
collector knows it, "ongoing" or "cleared 2.3 h ago", and a chevron to the section where it is
acted on. Cleared rows are muted. This is how an incident that ended before the reader looked is
still seen, and how a 1 h member that stays red for up to an hour after its cause ended says so.
The list always covers 24 h, whatever the picker shows.

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
- Page, section and range live in the URL (`#/ci/runners?range=6h`), so a link reproduces the view.

### 2.6 Views

Ten views: the overview, the seven category pages, and **Runners** and **Local runs** under CI.
Shard times and Hotspots are sections of their category pages, so the member that judges them sits
right above its evidence.

Every category page has a breadcrumb, its title and range picker, its state word with one sentence
naming the member that set it and the others not OK, one row per member (name and one-line
definition with n for a rate; value with its window under it, "1 h; 6 h 24 min", "now" or "7 d";
SLA; sparkline; state; chevron; OK members carry no word), then its sections. Sections follow the
picker: a table or count covers the picked window, a chart covers 6 h at 1 h and 6 h and 24 h at
24 h. A section whose window holds too few events to say anything widens to 6 h and says so ("only
2 merged in the last 1 h, so the last 6 h").

- **Master**: a strip by minute, 6 h at the default (green, red, gray for cancels that are not failures:
  superseded, or cancelled by hand); red spans with builds, cause and fix; shared failures with the
  pull requests failing, start, suspect merges and issue.
- **Pull requests**: where the time goes for pull requests merged in the range (median minutes per
  stage: waiting for runners, checks running, red and being fixed, merging); "Waiting on the owner"
  (auto-merge off by rule: breaking, code-owner paths, screenshots), left out of the time members,
  each naming the red member its merge would fix.
- **CI**: why first attempts failed (shared, an aggregator alone, the change, flaky,
  infrastructure); Shard times (section 6); chronically failing jobs; "Allowed to fail, and
  failing" (the non-gating jobs and their pass rates); benchmark trends (section 4.3). Hangs link to
  the red span they caused.
- **Runners**: running and queued jobs over the range on one count axis, with the plan's limit from
  config as a reference line and the observed peak as a label beside it; who holds the runners,
  now and during saturated spans, by repository, workflow and event, as sorted bars; runs still
  queued with no job created; superseded runs still running. Every GitHub-hosted job counts against
  the limit of 60 and a macOS job also against its own 5; machine.dev T4 jobs are not counted.
- **Local runs**: local vs CI disagreement, local shard time and test-slot waits, and the local
  runs themselves. Since the pre-push gate retired (no push runs it), a local run is any test run
  on this machine -- `check:quick`, `test:changed`, an agent's `tools/low-priority.sh` run -- seen
  as the machine-wide test slot it holds (`tools/test-slots.mjs` logs each hold, with its package
  or shard family and exit code, to the wait log): runs and failures by what ran, and time by what
  ran. Gate runs from the push log and shard times from the test ledger still count when the gate
  is run by hand. Its members are informational, never
  judged, so they have no SLA entry: the page builder reads them from the local writer's rollups.
  The page state follows the local writer: OK while it reports, a gray IDLE when no local runs
  happen (members idle with hatched "no history" sparklines, 3.1), NO DATA when the writer is stale
  or failing. Values are shown only while the writer reports.
- **Flaky tests**: Hotspots (section 5, a slow measure with its own 7 d / 28 d choice); Quarantine,
  which states that no entries exist.
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
- **Too few samples.** A rate whose last hour holds fewer events than its minimum n (the "Min n"
  column of section 4) is drawn gray as "too few, n=2 of 5", with its 6 h value beside it, and left
  out of the rollup: it is never red on one event. So is a member whose source covers less than its
  window ("partial window, 0.4 h of 1").
- **Idle.** A member whose activity stopped by design (the local gate, retired on 2026-10-25) is
  drawn gray as "n=0" and left out of the rollup, and its page says why with a gray IDLE state.
- **A fix waiting on the owner.** When the pull request that fixes a red member waits on the owner
  (auto-merge off by rule), the member's row, its episode and the Pull requests page say "fix #N
  waits on the owner", so a red member is not read as unattended.
- **Clearing.** A 1 h member ("hangs in the last 1 h") stays past its threshold until its events
  leave the hour, but its row and its episode say "cleared 12 min ago" once the newest 5-minute
  bucket has recovered, and the alert's clear message fires then.
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
  is a failure of its own, with cause shared**, and counts in "Red on the same check". `Queue Checks
Pass` belonged to the retired Mergify queue and never counts.
- **Stale pull requests.** A pull request whose newest check started more than 2 days ago is left out
  of "Red on the same check" and the shared failures: its red (on 2026-10-27, nine pull requests last
  run on 2026-10-16) says nothing about master now.
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

**Windows.** Every member is one of four kinds, named in the Window column:

- **1 h**: a rate, share, median or count over the last hour, recomputed every 5 minutes from
  twelve 5-minute buckets. It decides the state.
- **1 h, 6 h agrees**: a noisy rate (a few events an hour, a mix of run kinds). The 1 h value alone
  makes it yellow; it turns red only when the 6 h value is past the red threshold too, and stays
  yellow otherwise. This is the SRE workbook's multiwindow alerting turned to a dashboard: the short
  window makes a state fast to set and fast to clear, the long one keeps a burst of two bad runs
  from turning a category red. Rates with many events an hour (runner wait) and shares of wall
  time (green time, saturated time) need no agreement.
- **now**: a state -- a count, an age, a verdict, a month-to-date projection -- read at the newest
  cycle. It has no window and no n. Untested master age, the release lanes, the costs and the
  budgets are states: a 24 h target for them does not become a 1 h target, it is simply read now.
- **slow**: a measure over weeks (reverts, net new flaky, detected to fixed, train first-attempt
  pass, full-run shard medians). It is drawn on its detail section with its own 7 d / 28 d choice,
  labeled "slow measure", and never sets a state: at hour scale it would either never move or move
  on one event.

The 6 h value is the trend: shown beside every 1 h value and as the sparkline. 24 h never decides a
color.

**Min n** is the fewest events the last hour must hold before a rate is judged; below it the member is
gray "too few" (3.1). It is set so that one event moves the rate by no more than the gap between its
target and its red threshold (first-attempt pass: a 15-point gap, so 8 suites), and at least 5 for a
median. Every row states its n.

Thresholds below give the target (green) and red; yellow lies between. All are for the window named
and were re-derived for one hour, not copied from the 24 h version. (H) marks a category's headline.

### 4.1 Master

| Member                | Measure                                                    | Window | Min n | Target                | Red                      |
| --------------------- | ---------------------------------------------------------- | ------ | ----- | --------------------- | ------------------------ |
| Red now               | length of the current red span; newest build queued, age   | now    | --    | 0                     | >= 15 min or 2 builds    |
| Green time (H)        | share of the hour master's newest commit was green         | 1 h    | --    | >= 92% (<= 5 min red) | < 75% (> 15 min red)     |
| Red on the same check | most open pull requests failing one check or family        | now    | --    | <= 1                  | >= 3                     |
| Last full-run verdict | ci lane of the newest judged candidate; names failing jobs | now    | --    | passed                | failed                   |
| Untested master age   | age of the oldest master commit no full run has judged     | now    | --    | <= 8 h                | > 13 h                   |
| Reverts               | reverted merges / merges                                   | slow   | 10    | < 5%                  | > 10% (never sets state) |

Green time's 24 h target of 95% allowed 72 minutes of red a day; over one hour the same 95% would be
yellow after 3 minutes, so the hour allows 5 minutes (one slow build) and is red past 15, the same
15 minutes as Red now. A red Master alerts at once (section 13). Untested master age replaces both "full-run verdict age"
and "since the last passing train": a quiet night on which the train skips an unchanged master
does not grow it, and a train that skips a new commit (the 18:00 attempt on 2026-10-25) does; the
row names that attempt and commit at once, and Releases turns yellow (4.5).

### 4.2 Pull requests

Times, the open count and the oldest open leave out pull requests waiting on the owner: auto-merge off
by rule (a hold or needs-decision label, a breaking title, a required review), or the owner's own pull
request with auto-merge off, which `tools/pr-open.sh` leaves for him to merge. They are listed under
"Waiting on the owner".

| Member                      | Measure                                                  | Window          | Min n     | Target    | Red    |
| --------------------------- | -------------------------------------------------------- | --------------- | --------- | --------- | ------ |
| Time to merge (H)           | median of merged minus ready, pull requests merged       | 1 h, 6 h agrees | 5 merged  | <= 60 min | > 180  |
| Open pull requests          | open, not draft, not waiting on the owner                | now             | --        | <= 20     | > 30   |
| Oldest open                 | age of the oldest open, not waiting on the owner         | now             | --        | < 24 h    | > 72 h |
| Merge ratio                 | merged / created                                         | 1 h, 6 h agrees | 5 created | >= 0.9    | < 0.7  |
| Runs failed by their change | first runs red on a test the change touched / first runs | 7 d             | 20 runs   | < 5 %     | --     |
| Green but not merging       | auto-merge armed, green and unmerged 2 h                 | now             | --        | 0         | >= 2   |
| Armed too long              | auto-merge armed 24 h                                    | now             | --        | <= 1      | >= 4   |
| Screenshot backlog          | oldest pictures waiting for the owner                    | now             | --        | < 24 h    | > 72 h |

The open count's target assumed the quieter repository of early October; at 107 merges on 2026-10-26,
the agents' open pull requests sat at a median of 12 and a 90th percentile of 22 (31 at most) while
merging well, so the target is 20 and red past 30.

On a quiet hour (2026-10-25, 22:30 to 23:30: 2 merged, 3 created) both rates are gray "too few"
with their 6 h values (74 min, 0.64) beside them; runner saturation, the cause, is red in CI.

### 4.3 CI

| Member                       | Measure                                                           | Window          | Min n    | Target   | Red                      |
| ---------------------------- | ----------------------------------------------------------------- | --------------- | -------- | -------- | ------------------------ |
| Runner wait (H)              | p90 of job start minus created, organization, jobs started        | 1 h             | 20 jobs  | <= 5 min | > 15                     |
| Longest queued now           | oldest queued job, or queued run with no job yet                  | now             | --       | <= 5 min | > 15                     |
| Saturated time               | minutes with jobs queued > 2 min while running >= limit - 3       | 1 h             | --       | 0        | >= 15 min                |
| Runners not being assigned   | jobs queued > 2 min while running < 75% of the limit              | now             | --       | 0 min    | >= 15 min                |
| First-attempt pass rate      | pull request check suites passing attempt 1, suites finished      | 1 h, 6 h agrees | 8 suites | >= 85%   | < 70%                    |
| Hangs                        | jobs ended at their own timeout, or past 2x budget                | 1 h             | --       | 0        | >= 2 (1 is yellow)       |
| PR check duration            | median run / its kind's budget (`run:ci.yml:pr` 20, `pr-wide` 35) | 1 h, 6 h agrees | 5 runs   | <= 1x    | > 2x                     |
| Pull request bins over 8 min | share of bins past the 8 min packing target                       | 1 h, 6 h agrees | 10 bins  | <= 10%   | > 25%                    |
| Reruns                       | run attempts above 1 / runs finished                              | 1 h, 6 h agrees | 10 runs  | < 5%     | > 15%                    |
| Full-run shards over budget  | shards whose median passes their own budget (section 6)           | slow, 7 d       | 5 runs   | 0        | >= 3 (never sets state)  |
| Runner-minutes per merge     | job minutes of every run kind / pull requests merged into master  | slow, 7 d       | 10       | <= 400   | > 600 (never sets state) |
| Superseded runs running      | see below; informational until it has fired on real data          | now             | --       | --       | --                       |
| Chronically failing jobs     | jobs, gating or not, failing in their own record (below)          | now             | --       | 0        | any with no open issue   |
| Benchmark regressions        | benchmarks whose last 3 results regressed (below)                 | now             | --       | 0        | >= 3                     |

Saturated time was "1 h in 24 h"; over one hour a quarter of it saturated is red. Hangs were "any in
24 h"; over one hour one hang is yellow and two are red, and an earlier hang stays in the episode
list. Full-run shard medians move only when a full run lands (at most four a day), so they are a slow
measure; a shard that times out on a run is a hang, judged at once.

**Runner use is counted in jobs**, from the jobs API (`filter=latest`) of every unfinished run,
never from run status: a run reports `queued` while some of its jobs run (run 40240348348 had 9 jobs
running and 19 queued). The limit comes from config (`slas.json`: `linux_windows: 60`, `macos: 5`,
the Team plan); every GitHub-hosted job counts against the 60, and a macOS job also against its 5.
The observed peak is a label beside the limit line, never a threshold, so a miscount or a GitHub
problem is never learned as "the limit". "Runners not being assigned" is the other cause of a
queue: jobs wait while there is room, so the cause is outside the repository; its row links
githubstatus.com, so nobody cancels full runs for a GitHub problem. The cost is one jobs call per
unfinished run each cycle, about 40 calls every 5 minutes on 2026-10-25, well inside the App's
hourly budget. A `pull_request` run whose pull request is no longer open (merged or closed) is left
out of runner use and longest queued: GitHub can leave one queued for hours holding no runner (run
40441556963, `Lint PR Title`, still queued 17 h after #3940 merged). GitHub empties a merged pull
request's runs' `pull_requests`, so a run is matched to an open pull request by number or head
branch; with a full page of open pull requests (50) nothing is left out.

"Runner-minutes per merge" adds up every job's minutes (completed minus started, unrounded) by the kind of
run that spent them -- pull request runs (every attempt, including pull requests that never merged), master
push builds (cancelled ones too), full runs (`release.yml` and the workflows it calls) and other (bisect,
stress, hosts, dependabot, dispatches) -- and divides by the pull requests merged into master in the same
window. The CI page shows each kind over 24 h and 7 d, so every change to the CI load shows its saving. The
thresholds come from 2026-10-26: 387 over 7 d (511 in the Pacific day so far), so today's value is the edge of
the target and 1.5 times it is red; as a slow measure it never sets CI's state.

"Superseded runs running" counts only what nothing else cancels: runs of workflows without
`cancel-in-progress` on `pull_request` (PR Integrity, CodeQL) whose pull request has a newer
commit, and jobs with `if: always()` still running after their run was cancelled. `ci.yml` and
`hosts.yml` cancel their own superseded pull request runs. It gets a state once it has fired on
real data.

**Jobs judged by their own record.** Every other member reads a job's result through its run, its
lane or its check suite, and a non-gating job (job-level `continue-on-error: true`) cannot fail any
of those: that is what non-gating means, and the release lanes rightly leave its failure out
(`parse.ts` `releaseAttempt`). So from 2026-10-21 to 2026-10-27 CI / Performance Benchmarks failed
on the first attempt of 14 of the 20 full runs that ran it (issue #3413) and the dashboard, which stored every one of
those job results, showed nothing. Three things now read the jobs themselves; the lane and verdict
logic is unchanged, so a non-gating job still never fails a lane.

- **Chronically failing jobs** (`ci.chronic_jobs`). Any job of a master push, a full run or another
  non-pull-request run, gating or not, bins and shards folded into their family, that failed in at
  least half of its newest 10 finished runs (4 at least), or has failed in every run for 3 days
  (however few). Cancelled and skipped jobs say nothing about a job and are not runs. A job with no
  run in 2 days, or in twice its usual gap between runs when that is longer (a weekly job), has
  stopped -- removed or renamed -- and is not judged. A ci.yml job (run on its own, or called as
  `CI / ...` by release.yml) that ci.yml on master no longer defines is not judged from the hour the
  collector reads that ci.yml (Story tests parity, removed on 2026-10-27, stayed red and unfiled for two
  days before this). Pull
  request runs are left out, CodeQL's scans of a pull request included (its `All Checks Pass` and
  `Queue Checks Pass` jobs fail on every pull request scan): their failures may be their own
  change's, which "Red on the same check" and the failure causes judge. Jobs stored before that
  rule count CodeQL's pull request scans as other runs until a backfill rewrites their run kind
  (README, "Backfill"). Each job is listed
  with its failures, its last pass and the open issue naming it (one GitHub search per job for its
  name, confirmed in the title or body, as "Flaky in CI with no open issue" matches tests). Yellow
  while every chronic job has an open issue, red while one has none. Read from the rollup
  `ci.job_history` (each job's pass and fail times, 14 days), so it needs no new source.
- **Allowed to fail, and failing** (a CI section, never judged). Every job ci.yml lets fail --
  job-level `continue-on-error: true`, or an expression for a job `tools/ci-advisory-checks.json`
  lists in its warning period, read hourly from master's ci.yml -- with its runs, failures and pass
  rate over 7 days in every run kind, pull requests included (`ci.job_outcome`), worst first, marked
  red at half or more failed. It makes the class visible; the chronic member is what judges it.
- **Benchmark regressions** (`ci.bench_regressions`). The Performance Benchmarks job (algorithms)
  and the T4 lane (webgpu-graph-algorithms) post each benchmark's result after the benchmark passed
  (`tools/results/post-benchmarks.mjs`, `POST /v1/benchmarks`, OIDC like the flaky feed, fire and
  forget), only from master's workflows. Each result names the machine that measured it (the
  runner's CPU model): GitHub's hosted runners land on CPU models about 2x apart, so a result is
  compared only with results of the same machine. Each benchmark keeps its newest 20 results per
  machine, one per run, 100 in all (source `benchmarks`). A benchmark regressed when the median of
  its last 3 results on the newest result's machine is over 1.2 times the median of the 10 before
  them on that machine, so it is judged only with 13 such results and one slow run never counts.
  The Benchmarks section lists every benchmark with its newest result, that ratio and that
  machine's results as a line, regressions first. A benchmark job that fails before it produces numbers
  posts nothing: that is the chronic member's to catch. graphty-element's timing benchmarks print
  rows of differing shapes and are not posted; the weekly paired T4 benchmark compares against a
  release and files its own issue.

### 4.4 Flaky tests

| Member                         | Measure                                                                | Window          | Min n              | Target | Red                      |
| ------------------------------ | ---------------------------------------------------------------------- | --------------- | ------------------ | ------ | ------------------------ |
| Flake rate (H)                 | flaky test-file runs per 1,000 test-file runs, CI                      | 1 h, 6 h agrees | 125 test-file runs | < 2    | > 10                     |
| Blocked by a flake             | open pull requests whose newest failure is flaky, or an unstable story | now             | --                 | 0      | >= 3, or any >= 24 h     |
| Flaky in CI with no open issue | distinct tests seen flaky in CI in 7 d that have no open issue         | now             | --                 | 0      | >= 3                     |
| Net new flaky                  | newly flaky minus resolved (10 clean runs or issue fixed)              | slow, 7 d       | --                 | <= 0   | > 3 (never sets state)   |
| Detected to fixed              | median days from flaky issue opened to fixed                           | slow, 28 d      | 5                  | <= 3 d | > 7 d (never sets state) |

"Flaky in CI with no open issue" is a backlog read now: the 7 d says how long a test stays on it
without an issue, not a window it is judged over. The flake rate is judged as soon as per-test
results cover the last hour; on 2026-10-25 they began at 20:42, so from 21:42 it was judged while
its 6 h value still said "partial, 2.8 h of 6".

"Flaky in CI with no open issue" replaces the quarantine members of version 2: CI keeps no
quarantine state and files no issues (`tools/test-quarantine.mjs`), and the committed list is
empty, so those members would have been wrong forever. The drill-down drafts the missing issue. A
feed of CI's flaky detections is tracked in its own issue (section 14).

### 4.5 Releases

Read from `release.yml`'s job conclusions, so a shadow run, which opens no "Release held" issue, is
judged like a legacy one; hold issues are read too. Lanes: `ci`, `t4`, `hosts`, `autosave_macos`,
`audit`, `llm`, `version`, `land`, `publish`.

| Member                         | Measure                                                                   | Window    | Min n | Target | Red                        |
| ------------------------------ | ------------------------------------------------------------------------- | --------- | ----- | ------ | -------------------------- |
| Lanes red on the candidate (H) | lanes red on the newest candidate a train tested (a hold)                 | now       | --    | 0      | open >= 6 h                |
| Release workflows failing      | `release.yml`, `promote.yml`, `release-watch.yml` whose newest run failed | now       | --    | 0      | one failed 3 runs in a row |
| Train skipped a new commit     | the newest attempt skipped every lane on an untested master commit        | now       | --    | no     | --                         |
| Tagged, not on npm             | versions tagged but not listed by `npm view <pkg> time`                   | now       | --    | 0      | after 30 min               |
| Train first-attempt pass       | attempts that tested and passed first time                                | slow, 7 d | 5     | >= 90% | < 75% (never sets state)   |

"Release workflows failing" was a count of failed runs in 24 h. `release.yml` runs four times a day,
so a 1 h count would drop a failure an hour after it; a workflow whose newest run failed is a state
that lasts until a run passes. Only runs of the events a workflow declares in its `on:` count: GitHub
also records a failed run for a push to any branch whose copy of the file it cannot use, which is how
`promote.yml` (dispatch only) showed "10 failures in a row" on 2026-10-25.

"Train skipped a new commit" is yellow at once, so a skipped candidate is seen hours before
untested master age passes its target. The channel members (canary, nightly and production age,
merge to canary and nightly, change failure rate) follow the channels pipeline design once the
channels exist; until then they are not set up ("channel not built yet, #3418").

### 4.6 Costs

Month to date, projected to month end, read now (billing data arrives daily, so an hour window would
change nothing). The projection is what a line cost through yesterday plus, for each day left, its
average day over the trailing 7 days (today at least what it has cost so far): the month-to-date average carried October's first week, when
the T4 lane still ran on pull requests and pushes, to the month's end. Only money sets the state; list-price values and per-run
figures are for comparison (section 7). Budgets are configured; these are sample values. The two
usage members are not set up until their read-only tokens exist (section 16).

| Member               | Measure                                          | Target     | Red    |
| -------------------- | ------------------------------------------------ | ---------- | ------ |
| Spend this month (H) | projected sum of every money line                | <= 300 USD | > 360  |
| T4 GPU               | projected, machine.dev (the 200 USD budget)      | <= 180 USD | > 200  |
| LLM regression       | projected, Gemini (the owner's ceiling)          | <= 60 USD  | > 75   |
| AWS                  | month to date, Cost Explorer (the 10 USD Budget) | <= 8 USD   | > 10   |
| Cloudflare usage     | usage / the plan's allowance                     | < 50%      | > 90%  |
| Sentry usage         | events / the plan's quota                        | < 80%      | > 100% |

### 4.7 Data sources

| Member                          | Measure                                                | Window          | Min n              | Target           | Red                              |
| ------------------------------- | ------------------------------------------------------ | --------------- | ------------------ | ---------------- | -------------------------------- |
| Stress run                      | the weekly run, from GitHub's job and step results     | now             | --                 | passed and filed | filing failed, or not run in 8 d |
| Sources past their age limit    | sources past their limit (section 9)                   | now             | --                 | 0                | any past 2x                      |
| Sources thin for their activity | rows per unit of activity in the hour / the 7 d median | 1 h, 6 h agrees | 3 runs of activity | 0 below 50%      | any below 20%                    |
| Collector                       | since its last run                                     | now             | --                 | <= 10 min        | > 20 min                         |
| GitHub App rate limit           | requests left in the collector App's hour              | now             | --                 | > 50%            | < 20%                            |
| Daily write budget              | rows written today / the daily limit                   | now             | --                 | < 50%            | > 90%                            |

The stress run is yellow when it found nothing three weeks running: a run in each of the last three
7-day slots and no run in them that found a failure (the last three runs can fall in one week after a
re-run or a dispatch), and red when its filing step
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

The Shard times section of the CI page is a slow measure, with its own 7 d / 28 d choice (7 d by
default) and the label "slow measure". It has one row per shard of the **full runs** (the release
train's `ci` lane), worst against budget first: runs (n; shadow trains run at most four a day and
skip an unchanged master, so expect 5 to 15 in 7 days, and a shard under 5 runs is drawn gray as
"n=4" and left out of "full-run shards over budget"), median and p90 of the test step (attempt 1,
successful runs, from the results store's `invocation.secs`; the times themselves are kept in the
rollups, so these are the events' median and p90, not a histogram bin's middle, which read a shard of
about 880 s as 932 s against its 900 s budget), and a bar: median dark, p90 a light
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
- **LLM regression (money).** One paid run per full, restart and candidate run (`release.yml`'s `llm`
  job); until token counts are recorded, paid test steps (as `tools/llm-spend.mjs` counts them) times
  0.94 USD, about 113 to 170 USD a month at 4 to 6 runs a day.
  Local runs are on the owner's own Gemini bill and not in it.
- **AWS (money).** Cost Explorer, daily by service; credits left.
- **Cloudflare and Sentry (money).** Their plans (Cloudflare Workers Paid, 5 USD; the Sentry plan,
  whose price is not recorded yet, so its money line shows NO DATA), plus usage against the
  allowance or quota from their APIs, which need read-only tokens (section 16).
- **GitHub (money).** Team, 2 seats, 8 USD. Actions minutes are free for this public repository;
  their list-price value (Linux 0.006, Windows 0.010, macOS 0.062 USD/min) is value, never money.

The page shows the money lines (projected, so far against budget, 28 d projection, state) and their
total, which equals the headline; the usage members; "unit costs" for comparison only (money per
release train, list-price value per merged pull request); money and list-price value by workflow as
two sorted-bar lists, never summed. Every Costs value is month to date, so this page alone has no
1 h / 6 h / 24 h picker: its header offers 7 d and 28 d (default), labeled "slow measure", for the
projection-by-day lines and the unit costs. Rates live in
`tools/pipeline-health/config/rates.json` with the date each was checked; a missing rate or a
rejected token shows NO DATA, never zero, and a token not yet created is not set up.

## 8. Time ranges and buckets

A problem must show within hours, not days, so the windows are measured in hours:

| Window | Buckets      | What it is for                                                                                 |
| ------ | ------------ | ---------------------------------------------------------------------------------------------- |
| 1 h    | 5 minutes    | decides every state: a member past its threshold shows within one collector cycle (5 minutes)  |
| 6 h    | 15 minutes   | the trend: the value beside every 1 h value, the sparkline, and the agreement noisy rates need |
| 24 h   | 1 hour       | backdrop only: the faint part of the sparkline and the "Last 24 hours" list; never a color     |
| 7 d    | 1 day or raw | slow measures, on their detail sections only, labeled "slow measure"                           |
| 28 d   | 1 day        | slow measures, likewise: costs, full-run shard medians, flake hotspots over weeks              |

The picker on the overview and on every category page except Costs (section 7) is **1 h, 6 h and 24
h, 1 h by default**. It sets the window of every value, table and count on the page; charts cover 6
h at 1 h and 6 h, and 24 h at 24 h. It never changes the status line or a member's state, which are
always judged as section 4 says. Slow sections carry their own 7 d / 28 d choice beside their heading.

A 1 h value is judged against its threshold every cycle; the 6 h value only holds back RED for the
noisy rates section 4 marks "6 h agrees" (Google SRE workbook, "Alerting on SLOs": a short window
for speed and reset, a long one for precision). A rate below its minimum n in the hour is gray "too
few" with its 6 h value beside it.

Counts are
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
| Feed of CI's flaky detections (issue #3610)         | each new flaky entry | not set up          |
| Benchmark results (CI's benchmark jobs)             | each full run        | 2 d; idle until set |
| Local writer (slot holds and waits, test ledger)    | each local run       | idle, not judged    |

Red at twice the yellow age. **Volume is judged per unit of activity**: rows per CI run for CI
results, rows per local run that happened for the local writer, so a quiet week or a retired local
gate is not a false alarm, while a writer that posts 31% of its usual rows per run is. A
source that fails while its last good write is within its yellow age keeps its members' values,
marked stale with that write's time; past the yellow age an unreachable source is NO DATA, hatched,
never 0. One GitHub request that fails (a 5xx, a timeout, a rate limit) is retried twice with
backoff and then skipped alone (that run's jobs, read again next cycle), never failing the cycle; a chart before its source's history is hatched "no
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
  Benchmark results (`POST /v1/benchmarks`) are taken only from master's workflows, never a pull
  request's, so a branch cannot move master's trend.
- **Reads are public.** Everything stored is already public on GitHub (runs, pull requests, test
  names, truncated failure messages); no tokens, logs or host names are stored.
- **The collector** signs in as the read-only GitHub App `graphty-pipeline-health` (actions,
  checks, contents, issues, metadata and pull requests, all read; contents lets it read tags,
  commits and workflow files), with the App's own rate limit, never the budget the sessions share.
  Every secret is an SSM SecureString under `/graphty-health/`: the App's id, private key and
  installation id under `github-app/`, the Pushover keys under `pushover/`, the optional Cloudflare
  and Sentry tokens under `cloudflare/` and `sentry/`.
- CORS allows `GET` from `https://health.graphty.app` and one dev origin (the page's Vite default,
  or the one passed as the `devOrigin` context at deploy) only.
- **The local writer** posts to its own routes, `POST /v1/local/{invocations,push-runs,waits}`,
  with a bearer token whose SHA-256 alone is stored (SSM `local-token-sha256`); those routes accept
  only kind `local` and answer 401 to any other token. The writer is a plain Node script,
  `tools/pipeline-health/local/collector.mjs`, run under servherd from the main checkout: it reads
  the test ledger, the push log and the slot-wait log, and posts each record once.

### 10.3 Storage

One on-demand DynamoDB table, `graphty-health`: runs and jobs (90 days by TTL); shard runs with
per-file results and a row per failed or retried test (90 days; passing tests per file, which cuts
writes 20 to 50 times); pull requests, issues, npm versions and cost lines (kept); rollup buckets
`ROLL#<metric>#<step>`, one item per metric and bucket holding every dimension of that metric
(5 min kept 2 days, 15 min 8 days, 1 h 14 days, 1 d 400 days; the 6 h step of the first version is
gone, because no view is 7 d in 6 h steps any more); one precomputed item per page and range (the
ten views at 1 h, 6 h and 24 h, plus the slow sections at 7 d and 28 d, about 40 items), stored
gzipped.

**Rollups are recomputed, never incremented**, so a retried post cannot double-count. Ingest writes
raw items idempotently and marks each 5-minute bucket it touches dirty; every 5 minutes the collector
recomputes those buckets, their 15-minute, hourly and daily parents, the 1 h, 6 h and 24 h values of
each metric, and the page items whose inputs changed. A bucket holds counts, sums and a 32-bin
log-scale duration histogram, so medians and p90 come from merged histograms. Its bins are about 44 %
wide, too coarse to judge a time against a budget, so a metric of few events (full-run shard times, a
few a day per shard) also keeps the times themselves and takes its medians from them.

**Reads stay small.** A page or an MCP call reads one precomputed item for its view and range (about
6 KB gzipped, 2 read units), never buckets. The collector reads, per metric and cycle, three
single-partition queries: twelve 5-minute buckets (1 h), twenty-four 15-minute buckets (6 h) and
twenty-four hourly ones (24 h). A slow section reads its own item, built from daily buckets.

### 10.4 Collection

- **Collector Lambda**, every 5 minutes (EventBridge Scheduler, reserved concurrency 1): runs and
  jobs created or finished since its cursor, plus every queued and in-progress job, across every
  organization repository with Actions activity in 28 days that the App can see (runner demand is
  organization-wide; the App is installed org-wide on graphty-org, all repositories, read-only,
  so every repository's jobs are counted, section 16); one GraphQL
  query each for pull requests and issues; one jobs call (`filter=latest`) per unfinished run, about
  40 calls a cycle at the 2026-10-25 peak; `release.yml` and `restricted-cpu-stress.yml` job and
  step conclusions; npm hourly; billing daily. Then rollups, status and alerts (section 13). The
  collector alone covers runners, master, shared failures, release lanes and the stress run.
- **CI posts** (results wiring, #3429): each shard run with per-file results and every failed or
  retried test, from the JUnit each shard writes; run, job and step timings; LLM token counts once
  recorded. A failed post never fails a job.
- **Backfill**: the last 28 days of runs and jobs, pull requests and issues, as a collector mode
  run by hand (`pnpm run backfill`, default 28 days), throttled under the App's hourly budget and
  resumable from a cursor; the scheduled recompute rebuilds the rollups. GitHub lists at most 1,000
  runs for one query, so a day with more (1,945 on 2026-10-12) is read an hour at a time; read whole,
  such a day lost its oldest runs and their T4 jobs (about 50 USD of early October). A job behind `needs:` gets
  its `created_at` when it becomes ready (its last dependency's `completed_at`, to the second,
  checked on runs 40239928447 and 40238975833), not at run creation, so a job's queue wait is
  `started_at - created_at` for every job, skipped jobs left out.

### 10.5 Spend protection

1. **In code (seconds).** Reserved concurrency: ingest 20, read 5, collector 1. Throttles: reads 20
   requests/s (burst 40), CI writes 50 (100). Bodies up to 1 MB and 5,000 rows. A **daily write
   budget**: each ingest adds its rows to a `QUOTA#<day>` item under a condition (300,000 rows,
   about 5 times normal); past it writes get 429 and Data sources turns red. Reads are answered from
   the precomputed page items with `Cache-Control: max-age=60` (an HTTP API has no gateway cache).
   Timeouts: read 10 s; ingest 28 s at 1,024 MB (under the HTTP API's 30 s; at 256 MB a 200-row
   post took longer than 10 s); collector 60 s at 512 MB, which recomputes at most the newest 200
   dirty 5-minute buckets a cycle, so the live hour is right first and a backlog (a backfill)
   drains over later cycles. Logs kept 14 days.
2. **An AWS Budget (hours).** 10 USD a month, email at 50% actual and 100% forecast, and an action
   at 100% actual that attaches a deny-all policy to the Lambda roles.
3. **The project spend limit (days).** Set by the owner: 20 USD (the minimum), "stop new resource
   creation" on, "pause top cost drivers" off. Reaching it pauses the whole project.

The last two can silence the collector, and with it the dashboard and its alerts, so section 13
adds an alarm outside the collector.

### 10.6 Code and deploy

CDK in TypeScript in `tools/pipeline-health/` (`infra/`, `src/`, `config/`, `web/`, `mcp/`,
`local/`, `test/`), a standalone package with its own lockfile, outside the repository's pnpm
workspace and ignored by nx, so it is never released to npm. Its own workflow
(`.github/workflows/pipeline-health.yml`) type-checks, tests and synthesizes it on pull requests and
master pushes that touch it.

Two stacks. `graphty-health` holds the service (table, API, Lambdas, schedule, Budget, alarm,
topic) and is deployed by hand with the `graphty` profile until CodeBuild takes over.
`graphty-health-deploy` holds a CodeBuild project with no source and a build role that may assume
only the CDK bootstrap roles. It needs no GitHub connection: when the collector sees that master's
`tools/pipeline-health/` changed since the last deployed commit, it starts the project (with
`codebuild:StartBuild`), which fetches that commit from the public repository, type-checks, tests and runs
`cdk deploy graphty-health` (no CodePipeline, no webhook).

### 10.7 Cost

About 6.50 USD a month at 200 CI runs a day: HTTP API 0.50, Lambda 1.40, DynamoDB 3.80,
CloudWatch Logs 0.50, Cost Explorer 0.30; storage, SSM, Scheduler, the alarm and SNS email free.
DynamoDB on demand (0.625 USD per million write units, 0.125 per million read units) breaks down as
raw ingest 1.00; rollups 0.90 (about 80 metrics, four 1 KB bucket items each per cycle, only the
dirty ones written, about half); page items 0.70 (about 40 items of 6 KB, the changed ones, every 5
minutes); collector reads 1.20 (80 metrics x 3 queries of 3 to 6 read units, 8,640 cycles a month);
page and MCP reads under 0.05. The 5- and 15-minute buckets roughly double the first version's 4
USD. The 120 USD of credits cover about 18 months, the 10 USD Budget still holds with room, and the
backend's own cost is a line on the Costs page.

## 11. The page

**Hosting: a new public repository, `graphty-org/pipeline-health`, at `health.graphty.app`.**
graphty.app is the production channel and moves only on the owner's go, but a health page must keep
updating when the pipeline is broken. The source stays in `tools/pipeline-health/web/`; a workflow
on master (`.github/workflows/pipeline-health-pages.yml`, on pushes that touch the page) builds it
against the API URL in the repository variable `HEALTH_API_URL` and pushes it, with a `CNAME` and
`.nojekyll`, to the pages repository's `gh-pages` branch with a deploy key (secret
`HEALTH_PAGES_DEPLOY_KEY`). The pages repository holds only the site, its README and a small check
that `gh-pages` holds `index.html` and the right `CNAME`. The page holds no data:
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

An episode starts at a member's first red and ends only when the member is judged OK again: a gap
of NO DATA or a stale source in between neither ends it nor starts another, so a flapping source
cannot repeat the alert. A member alerts at most once in 6 hours, even when an episode truly ends
and a new one starts: a new episode's alert waits until 6 hours have passed since the last one and
is sent then if the member is still red; one that ends before its alert was sent sends no "cleared".

**A dead-man's switch.** The collector both computes the status and sends the alerts, so a paused
AWS project, the Budget action's deny-all policy or a crashing collector would silence both. A
CloudWatch alarm on the collector's errors or missing invocations (no successful run in 20
minutes) emails the owner through SNS, which needs neither the collector nor Pushover.

## 14. Rollout

1. **First AWS service, with its alarms.** Bootstrap CDK; deploy the stack (table, API, Lambdas,
   schedule, parameters, Budget, CloudWatch alarm and SNS email) by hand; create the collector's
   GitHub App; collect and backfill; turn on the Pushover alerts.
2. **The same day, open the issues** (opened: #3607, #3608, #3609, #3610 in this order):
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
- **Thresholds**, budgets, minimum n, which rates need the 6 h to agree, and which measure heads each
  category: tune after two weeks of data.
- **Status on the last 1 h; 6 h is the trend; 24 h is backdrop** (owner, 2026-10-25, on version 2:
  "picking time ranges in terms of days means that I can't identify and react to problems or trends
  for days, as opposed to noticing them within hours"). Version 2 judged most rates over 24 h and
  offered 24 h and 7 d pickers, so a rate that went bad took hours to move its 24 h value past a
  threshold and an hour to clear after it recovered. Now every rate is judged on the last hour in
  5-minute buckets, a state is read now, the noisy rates need the 6 h value to agree before red,
  rates below a minimum n are gray rather than red on one event, the picker is 1 h / 6 h / 24 h with
  1 h by default, and 7 d and 28 d survive only on slow detail sections. Reason: the dashboard exists
  to be acted on within one collector cycle; weeks-long measures that cannot move in an hour are kept
  as context, out of the status, instead of being forced into an hour window where one event would
  swing them.
- **Costs has no hour picker**, only its slow 7 d / 28 d choice: every Costs value is month to date
  and billing arrives daily, so 1 h, 6 h and 24 h would show the same page.
- **The sparkline is split rather than overlaid**: the 6 h trend in 15-minute buckets fills most of
  it and the rest of the 24 h sits faint at its left, because drawing a 24 h line behind a 6 h line
  would put two time scales on one axis.

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

These choices belonged to the owner because they publish a name, spend money or need the owner's
own accounts. What was decided, and what is still the owner's to do:

1. **Address and repository: decided.** The page is at `https://health.graphty.app`, published from
   the public repository `graphty-org/pipeline-health` by GitHub Pages from its `gh-pages` branch,
   with HTTPS enforced. The DNS record (`health` CNAME `graphty-org.github.io`) is in place and the
   site is live.
2. **AWS project spend limit: set** at 20 USD, the minimum, by the owner in the AWS console (only
   the account owner can set it). If it is ever raised or removed, the AWS Budget of section 10.5
   is the only cap left.
3. **GitHub access for the collector: done.**
   The owner created the read-only GitHub App `graphty-pipeline-health` on 2026-10-26 with actions,
   checks, contents, issues, metadata and pull requests, all read (contents was added beyond the
   first list so the collector can read tags, commits and workflow files), no webhook, installed
   org-wide on graphty-org (all repositories, read-only), so every repository's jobs count in
   Runners. Its keys are in SSM (section 10.2). Deploys need no GitHub connection: the collector
   starts the `graphty-health-deploy` build itself (section 10.6), once that stack is deployed in its
   connection-free form.
4. **Cloudflare and Sentry tokens: optional, not given.** A Cloudflare token with Account Analytics:
   Read and Billing: Read, and a Sentry token with org:read, stored as the SSM parameters
   `/graphty-health/cloudflare/token` and `/graphty-health/sentry/token`, turn on the two usage
   members of Costs. Until they exist those members are not set up and out of the status. The
   Sentry money line also needs the plan's monthly price in `config/rates.json`, which only the
   owner knows; until then it shows NO DATA.
5. **Alarm email: subscribed and confirmed.** The address is the owner's choice and is kept out of
   the repository: the owner subscribed it to the SNS topic `graphty-health-alarms` with
   `tmp/health-alarm-email.sh <address>`, and the subscription was confirmed on 2026-10-26 at
   01:11Z, so the dead-man alarm and the Budget notifications reach the owner.
