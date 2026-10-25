# Pipeline health dashboard

A web page that answers in a few seconds "is any part of graphty-monorepo's pipeline unhealthy, and
which part?", and lets the reader click through to the cause. The pipeline is everything between a
pull request and a published release: pull requests, CI, tests, master, the release train, the
deploy channels, and what it all costs. Readers are the repository owner and the agent sessions
that keep the pipeline moving; agents read the same data through an MCP server.

The page is static, on GitHub Pages at `health.graphty.app`. Its data comes from a small AWS
backend that collects from GitHub, CI, the owner's machine and the billing sources, keeps rollups
in DynamoDB and serves them through a public read API.

The mockup is `design/ci/health-dashboard/mockup.html`: open it in a browser. It needs no network,
its pages are reached from the left navigation, and every number in it is sample data. This is
version 2; version 1 is in git history.

## Changes from v1

The owner's review of version 1, and the answer to each point:

- "the dashboard is very busy and dense ... this is not good dashboard design." -- The front page
  holds the category status line and seven KPI rows, nothing else (2.1). The KPIs were re-chosen:
  one headline symptom per category (2.3); every other metric is on a detail page.
- "colors are easier to quickly see and understand than icons, and using colors reduces visual
  clutter" -- No status icons. State is a color plus a word. No borders, boxes, gridlines or chips
  that carry no data (3.3).
- "the overview line is good (it took me about 5 minutes to notice it) -- I like the breakdown of
  each category and the green / yellow / red status for each." -- It is now first and largest: one
  green, yellow or red block per category (2.2).
- "each measurement should have a SLA" -- Every metric has green, yellow and red thresholds, the
  green one being its target (section 4). A category is the worst of its members and names the
  member that set it.
- "pipeline health needs to have 1 hour and 6 hour steps. it doesn't need 90 days or 12 months" --
  24 h in 1 h steps and 7 d in 6 h steps; 28 d in 1 d steps on a few detail pages only (section 8).
- "it's really not clear that clicking on graphs leads to a drill down" -- Left navigation,
  chevrons, hover state, whole-row targets, "Details" links and breadcrumbs (2.4).
- Track the costs of our processes -- A Costs category: T4 GPU, Cloudflare, AWS, GitHub Actions,
  LLM tests and Sentry, per workflow and per release run (section 7).
- "flake dashboard should show which test was flaky and which test group or shard it belonged to so
  that we can identify flake hotspots" -- A hotspot tree: CI job group or shard family, then shard,
  test file and test, ranked by distinct flaky tests (section 5).
- "we don't need to track agent vs human, the entire process will be agent driven" -- Removed, with
  the author filter.
- "add a MCP to the design so that our agents can see status too" -- A read-only stdio MCP server
  (section 12).
- "add median time tracking of shards / test segments" -- Median and p90 per shard against its
  budget, and per test file on drill-down (section 6).
- "use AWS as a single backend for collecting and storing data about the services and serving them
  to a dashboard hosted on GitHub pages" -- Sections 10 and 11. Version 1's local SQLite store and
  local server are gone.
- "when we implement our first AWS service, open up issues to move our Cloudflare services to AWS"
  -- Rollout step 2 (section 14).

## 1. What it must catch

A blind spot is a part of the pipeline whose failure leaves every panel calm. October 2026's
problems, and the member (section 4) that now flags each:

- GitHub's 60 concurrent runners, shared by the whole `graphty-org` organization, were saturated;
  queue time, not run time, was the delay. CI: runner wait, saturated time.
- A bug on master turned every open pull request red. Master: red on the same check.
- A flaky story held one merge for five days. Flaky tests: blocked by a flake.
- Most intermittent failures appeared only under local load. Flaky tests: local vs CI disagreement.
- The weekly CPU-restricted stress run failed and filed nothing. Data sources: stress run.
- Release holds came mostly from outside lanes (LLM, T4 GPU, npm lag). Releases: since last
  passing train, with the lane named.
- Local test records fell from 1,153 a day to 44 while their age looked fresh. Data sources: volume.

So a source that is missing, late or unusually thin is never drawn as zero or as a calm chart; it
makes its category yellow at least (section 9).

## 2. Layout

### 2.1 Front page

It fits 1440 x 900 without scrolling and works down to 1024 wide.

```
+---------------+-----------------------------------------------------------------------+
| Pipeline      | Pipeline health                       [24 h] 7 d    updated 2 min ago |
| health        |                                                                       |
|               | +-------+ +-------+ +-------+ +-------+ +-------+ +-------+ +-------+ |
| Overview      | |Master | |Pull   | |CI     | |Flaky  | |Release| |Costs  | |Data   | |
| | Master      | |OK     | |reqs OK| |FAILING| |WARNING| |OK     | |OK     | |WARNING| |
| | Pull reqs   | |     > | |     > | |runner | |no     | |     > | |     > | |local  | |
| | CI  FAILING | |       | |       | |wait 22| |entry 1| |       | |       | |31%  > | |
| | Flaky  WARN | +-------+ +-------+ +-------+ +-------+ +-------+ +-------+ +-------+ |
| | Releases    |                                                                       |
| | Costs       | Master green time        99%      target 95%    ~~~~~~~~~~        > |
| | Data   WARN | Time to merge, median    41 min   target 60     ~~~~~~~~~~        > |
|               | First-attempt pass rate  88%      target 85%    ~~~~~~~~~~        > |
|               | Runner wait, p90         22 min   target 5      ~~~~~~~~~~ FAILING> |
|               | Flake rate               1.6/1k   target 2      ~~~~~~~~~~        > |
|               | Since last good train    3.4 h    target 7 h    ~~~~~~~~~~        > |
|               | Spend this month         255 USD  target 300    ~~~~~~~~~~        > |
+---------------+-----------------------------------------------------------------------+
```

The order follows Few ("a single screen read at a glance") and Google SRE ("symptoms first, causes
second"): the status line says whether anything is wrong and where, the rows give each category's
headline number, and every cause is one click away.

### 2.2 The category status line

Seven blocks in one row, in pipeline order: **Master, Pull requests, CI, Flaky tests, Releases,
Costs, Data sources**. Each block, about 170 x 110 px, is filled with its state's color and holds
the category name; the state word, large and bold (OK, WARNING, FAILING, NO DATA); when not OK, the
member that set it with its value and threshold ("runner wait p90 22 min, red over 15"); and a
chevron. The whole block links to the category's page.

The blocks always show now: each member is judged over its own window (section 4), whatever range
the picker shows. This is the one place where healthy has a color, because the owner asked for
green, yellow and red per category and a row of green is itself the answer. Elsewhere healthy is
uncolored.

### 2.3 KPI rows

One headline KPI per category (two for CI), each a symptom someone would act on (DORA; Google's "if
it isn't actionable, it shouldn't be alerting"; the SRE golden signals of latency, errors and
saturation):

- **Master green time**, 24 h (Master): errors; is the main line usable.
- **Time to merge, median**, 24 h (Pull requests): latency; the end-to-end symptom of every delay.
- **First-attempt pass rate**, 24 h (CI): errors; checks failing for any reason.
- **Runner wait, p90**, 24 h (CI): saturation; October's largest delay.
- **Flake rate**, 24 h (Flaky tests): normalized, so it reads without context.
- **Since the last passing release train** (Releases): covers a hold from any lane.
- **Spend this month, projected** (Costs): the one thing that cannot be rerun.

Data sources has no row; its block is enough. Each row: name; value (large); "target" and its value
(muted); a 24-point sparkline with the target as a thin gray band, the end value labeled and only
points past the yellow threshold colored; the state word on its color when not OK, nothing when OK;
a chevron. The whole row links to the KPI's section on its page. Rows are separated by space only.

### 2.4 Navigation and drill-down

- **Left navigation**, 200 px, always visible on desktop (NN/g: vertical lists scan faster than
  tabs and grow better; never a hamburger on desktop). Overview, then the seven categories, each
  with a 4 px bar of its state color on its left edge and its state word when not OK, so every page
  repeats the status line. Sub-items open under the current category (CI: Runners, Shard times,
  Local runs; Flaky tests: Hotspots, Quarantine).
- **Clickable things look clickable at rest** (NN/g: weak signifiers cost 22% more time). Every
  linked row has a trailing chevron, a pointer cursor and a hover background, and the whole row is
  the target. A section that goes deeper has a "Details" link in link color in its heading.
- **Breadcrumbs** on every page below the front ("Overview > Flaky tests > Hotspots"), the current
  page last and unlinked.
- Page and range live in the URL (`#/flaky/hotspots?range=7d`), so a link reproduces the view.

### 2.5 Detail pages

Every category page starts with its state and the member that set it, then one row per member
(name, value, target, state, sparkline, chevron), then its sections:

- **Master**: green-time strip (24 h at minute level), red spans with cause and fix, reverts.
- **Pull requests**: open pull requests (age, phase, attempts); where pull request time goes (runner
  wait, CI running, fix wait, owner wait, merge wait); failure causes; created vs merged.
- **CI**: pass rate, reruns, check duration, budget violations. Sub-pages **Runners** (organization
  demand against the 60 line, queue vs run time), **Shard times** (section 6), **Local runs** (local
  shard times, local vs CI disagreement, slot waits).
- **Flaky tests**: flake rate in CI and locally, newly flaky vs resolved. Sub-pages **Hotspots**
  (section 5) and **Quarantine** (entries, age, progress toward release).
- **Releases**: one row per channel (canary, nightly, production: version, age, commits waiting),
  train attempts by outcome, hold causes by lane, lead time to each channel.
- **Costs**: section 7. **Data sources**: section 9, plus the collector's rate limit and the daily
  write budget.

## 3. Status, SLAs and color

### 3.1 How a state is set

- Green is at or better than the target; yellow is past it but not past the red threshold; red is
  past the red threshold.
- A member with fewer events than its minimum (5 unless stated) is gray with "n=3" and is left out
  of the rollup: one failure in two runs is not a trend.
- A member whose source is missing or late is NO DATA, which counts as yellow.
- **A category is the worst of its members** (Statuspage's rule for a component with several
  incidents). Its block names the member that set it; of two at the same state, the one furthest
  past its threshold, with "+1 more".
- Thresholds live in `tools/pipeline-health/config/slas.json` and are printed beside every value.

Burn-rate alerting on an error budget (SRE Workbook) is left out: the windows are short and the
thresholds plain. Add it to master green time and pass rate if plain thresholds prove noisy.

### 3.2 Colors

The Okabe-Ito colors, chosen to stay apart under color-vision deficiency, each with black text and
its word:

| State   | Fill                    | Black text on it |
| ------- | ----------------------- | ---------------- |
| OK      | `#009E73` bluish green  | 6.1:1            |
| WARNING | `#F0E442` yellow        | 15.9:1           |
| FAILING | `#D55E00` vermillion    | 5.4:1            |
| NO DATA | `#D9D9D6` gray, hatched | 14:1             |

Simulated for deuteranopia (Machado 2009, full severity), the closest pair is yellow and vermillion
at a CIELAB difference of 34, and they also differ in lightness (L 90 against 58). Green and
vermillion are 53 apart: green turns blue-gray and vermillion ochre, and the blue-yellow axis
survives deuteranopia. Protanopia's closest pair is 37, tritanopia's 60. Every fill passes 4.5:1 and
is paired with its word (WCAG 1.4.1). The fills are the same in dark mode. A small yellow mark (a
sparkline point, a bar) gets a dark outline, because yellow alone is 1.3:1 on white.

Away from the status line and the nav bars, color marks exceptions only: a not-OK state word,
sparkline points past a threshold, bars over budget. Data is gray with the current item in ink.

### 3.3 What is not drawn

Few's test, "would the data lose meaning if this was removed?", and Tufte's "avoid all data frames":
no status icons, logos, card borders or backgrounds, shadows, gridlines (a baseline and a target band
only), legends where a direct label fits, pies, donuts, gauges or stacked areas; no chips unless they
carry data; no change arrows on the front page (trends are the sparklines). Three type sizes
(values, labels, muted targets and units) and generous space instead of separators.

## 4. Metrics and SLAs

Shared definitions:

- **Excluded checks**, which restate other checks or judge metadata: `All Checks Pass`, `Queue
Checks Pass`, `Lint PR Title`, `Link PR Issue`, `Visual report`, `Draft state`.
- **The visual gate.** An attempt whose only failure is the visual gate waiting for the owner's
  screenshot review is owner wait, not a failure. A capture error is a failure.
- **Failure cause**, in order: infrastructure (startup failure, lost runner, outside 5xx, a timeout
  in 3 or more pull requests); conflict; flaky (every failing test passed on a rerun of the same
  commit, or was already flaky or quarantined); shared (fails without passing on rerun in 3 or more
  pull requests within 24 h, or on the next master full run); change (the rest). Reclassified as
  evidence arrives.
- **Flaky**, as `tools/test-quarantine.mjs` defines it: failed and passed on the same inputs, in one
  shard run (the retry passed) or in two runs with the same inputs key.
- Medians and p90 come from raw events, never averages of buckets; rates are ratios of sums.

The green threshold is the target. (KPI) marks a front-page row. The window is what the status uses.

### 4.1 Master

| Member                  | Measure, window                                           | Green  | Yellow | Red    |
| ----------------------- | --------------------------------------------------------- | ------ | ------ | ------ |
| Master green time (KPI) | share of wall time master's newest commit was green, 24 h | >= 95% | 90-95% | < 90%  |
| Red now                 | length of the current red span                            | green  | < 1 h  | >= 1 h |
| Full-run verdict age    | since the last 6-hourly full run finished                 | <= 7 h | 7-13 h | > 13 h |
| Red on the same check   | most open pull requests failing one check                 | 0-1    | 2      | >= 3   |
| Reverts                 | reverted merges / merges, 7 d (min 10)                    | < 5%   | 5-10%  | > 10%  |

### 4.2 Pull requests

| Member                   | Measure, window                                       | Green     | Yellow  | Red    |
| ------------------------ | ----------------------------------------------------- | --------- | ------- | ------ |
| Time to merge (KPI)      | median of merged minus ready, 24 h                    | <= 60 min | 60-180  | > 180  |
| Open pull requests       | open non-draft                                        | <= 15     | 16-25   | > 25   |
| Oldest open              | age of the oldest open non-draft                      | < 24 h    | 24-72 h | > 72 h |
| Merge ratio              | merged / created, 24 h (min 5 created)                | >= 0.9    | 0.7-0.9 | < 0.7  |
| Not caused by the change | failed attempts of any other cause / all failed, 24 h | < 20%     | 20-35%  | > 35%  |
| Auto-merge stuck         | armed, unmerged 2 h with green checks or 6 h          | 0         | 1-2     | >= 3   |
| Screenshot backlog       | oldest pictures waiting for the owner                 | < 24 h    | 24-72 h | > 72 h |

### 4.3 CI

| Member                        | Measure, window                                           | Green     | Yellow | Red                  |
| ----------------------------- | --------------------------------------------------------- | --------- | ------ | -------------------- |
| First-attempt pass rate (KPI) | pull request check suites passing attempt 1, 24 h         | >= 85%    | 70-85% | < 70%                |
| Runner wait (KPI)             | p90 of job start minus job created, organization, 24 h    | <= 5 min  | 5-15   | > 15                 |
| Saturated time                | time with 60 jobs running and one or more queued, 24 h    | 0         | < 1 h  | >= 1 h               |
| PR check duration             | median `ci.yml` pull request run vs `run:ci.yml:pr`, 24 h | <= 20 min | 20-40  | > 40                 |
| Shards over budget            | shards whose median passes their budget, 7 d (section 6)  | 0         | 1-2    | >= 3, or one over 2x |
| Hangs                         | jobs past 2x their budget (`hangRatio`)                   | none, 7 d | in 7 d | in 24 h              |
| Reruns                        | run attempts above 1 / runs, 24 h                         | < 5%      | 5-15%  | > 15%                |

### 4.4 Flaky tests

| Member                     | Measure, window                                                | Green  | Yellow     | Red         |
| -------------------------- | -------------------------------------------------------------- | ------ | ---------- | ----------- |
| Flake rate (KPI)           | flaky test-file runs per 1,000 test-file runs, CI, 24 h        | < 2    | 2-10       | > 10        |
| Flaky, no quarantine entry | tests flaky in CI in 7 d with no entry                         | 0      | 1-2        | >= 3        |
| Blocked by a flake         | open pull requests whose newest failure is flaky               | 0      | any < 24 h | any >= 24 h |
| Net new flaky              | newly flaky minus resolved (10 clean runs or issue fixed), 7 d | <= 0   | 1-3        | > 3         |
| Oldest quarantine entry    | age (entries expire at 14 d)                                   | < 7 d  | 7-14 d     | > 14 d      |
| Detected to fixed          | median days from flaky issue opened to fixed, 28 d             | <= 3 d | 3-7 d      | > 7 d       |
| Local vs CI disagreement   | same shard and inputs, different outcome / pairs, 7 d (min 20) | < 2%   | 2-5%       | > 5%        |

### 4.5 Releases

| Member                         | Measure, window                                                        | Green     | Yellow     | Red         |
| ------------------------------ | ---------------------------------------------------------------------- | --------- | ---------- | ----------- |
| Since last passing train (KPI) | since a `release.yml` attempt passed every lane                        | <= 7 h    | 7-13 h     | > 13 h      |
| Holds open                     | open release holds, lane named                                         | 0         | open < 6 h | open >= 6 h |
| Canary age                     | age of canary while master has commits it lacks                        | < 6 h     | 6-24 h     | > 24 h      |
| Nightly age                    | age of nightly while master has commits it lacks                       | < 2 d     | 2-4 d      | > 4 d       |
| Production age                 | age of production while nightly is ahead (promotion is the owner's go) | < 14 d    | 14-30 d    | > 30 d      |
| Train first-attempt pass       | attempts passing first time, 7 d                                       | >= 90%    | 75-90%     | < 75%       |
| Trigger to success             | median release run vs `run:release.yml:full`, 7 d                      | <= 75 min | 75-150     | > 150       |
| Merge to canary                | median, 24 h                                                           | <= 30 min | 30-60      | > 60        |
| Merge to nightly               | median, 7 d                                                            | <= 1 d    | 1-2 d      | > 2 d       |
| Change failure rate            | nightly promotions reverted or fixed within 7 d, 28 d (min 4)          | < 15%     | 15-30%     | > 30%       |

### 4.6 Costs

Month to date, projected to month end. Budgets are configured; these are sample values.

| Member                 | Measure                                          | Green      | Yellow  | Red    |
| ---------------------- | ------------------------------------------------ | ---------- | ------- | ------ |
| Spend this month (KPI) | projected sum of every line that is money        | <= 300 USD | 300-360 | > 360  |
| T4 GPU                 | projected, machine.dev                           | <= 200 USD | 200-240 | > 240  |
| LLM regression         | projected, Gemini (the owner's ceiling)          | <= 60 USD  | 60-75   | > 75   |
| AWS                    | month to date, Cost Explorer (the 10 USD Budget) | <= 8 USD   | 8-10    | > 10   |
| Cloudflare             | usage / the plan's included allowance            | < 50%      | 50-90%  | > 90%  |
| Sentry                 | events / the plan's quota                        | < 80%      | 80-100% | > 100% |
| GitHub Actions value   | list-price value per merged pull request, 7 d    | <= 3 USD   | 3-6     | > 6    |
| Cost per release run   | T4 + LLM of one `release.yml` run, median of 7 d | <= 3 USD   | 3-6     | > 6    |

### 4.7 Data sources

| Member             | Measure                                                    | Green    | Yellow | Red    |
| ------------------ | ---------------------------------------------------------- | -------- | ------ | ------ |
| Age, per source    | since the last write, against its limit (section 9)        | <= limit | to 2x  | > 2x   |
| Volume, per source | rows in 24 h / median of the previous 7 days               | >= 50%   | 20-50% | < 20%  |
| Stress run         | weekly run failed and filed 0 issues, or not run in 8 days | passed   | --     | either |
| GitHub rate limit  | requests left in the collector App's hour                  | > 50%    | 20-50% | < 20%  |
| Daily write budget | rows written today / the daily limit                       | < 50%    | 50-90% | > 90%  |

## 5. Flake hotspots

The question is where flaky tests cluster, so the unit is a distinct flaky test, not a failure: one
broken change can fail 140 tests in one family and bury the real hotspots.

The Hotspots page is one tree table, in the order CI organizes tests:

1. **CI job group or shard family**: the grouped jobs `small-node` and `small-browser` (`GROUPS` in
   `tools/ci-test-matrix.mjs`) each run several small shards; every other shard is its own job, and
   those are grouped by family (`graphty-element-browser` holds `-1` to `-5`: the shard name
   without its trailing number);
2. **shard** (`graphty-element-browser-3`);
3. **test file**;
4. **test**.

Each row: name; distinct flaky tests (a gray bar with the number at its end); flaky events; flake
rate per 1,000 runs at that level; quarantined now; pull requests blocked. Sorted by distinct flaky
tests, then events. A row's chevron opens its children in place; a test row links to its history:
each flaky event with commit, shard, attempt, failure signature, issue and quarantine state. GPU
families (`webgpu-graph-algorithms*`) are never quarantined and say so. Range 7 d by default, with
24 h and 28 d. CI and local results are never mixed; local ones are on Local runs.

## 6. Shard and test-file times

The Shard times page has one row per CI shard, worst against budget first: shard, runs (n), median
and p90 of the test step (attempt 1, successful runs, so setup and failures do not distort it), and
a bar: median dark, p90 as a light extension, the `ci-budgets.json` budget as a vertical line. The
bar is vermillion when the median passes the budget, yellow when only the p90 does. A sparkline
shows the median per bucket.

Pull request runs and full runs are kept apart (pull request by default): a pull request may run a
selected-files part of a shard, which is not comparable to the whole shard. A grouped job is split
into its members by step. A shard row opens its test files, top 20 by median, each with median, p90
and share of the shard's time, so a regression points at the file. Local shard times are on Local
runs beside the CI median.

## 7. Costs

The Costs page answers what running the pipeline costs and which process costs it. Each line says
whether it is money or a value computed for comparison:

- **T4 GPU on machine.dev (money).** Each job with a `machine/gpu=t4` runner label: its duration,
  rounded up to the minute, times the configured rate for the label's tenancy (on demand 0.018
  USD/min, spot 0.0045). machine.dev has no spend API, so this is reconciled with its dashboard
  monthly. Per job, per workflow (`gpu.yml`, `gpu-weekly-paired.yml`) and per release run.
- **LLM regression tests (money).** The suite records prompt, output and thinking tokens per run;
  times the configured Gemini rates (0.75 and 3.75 USD per million to 2026-12-31). Per release run.
- **AWS (money).** Cost Explorer, daily by service (one 0.01 USD call a day); credits remaining from
  the account plan state.
- **Cloudflare (money).** The plan (Workers Paid, 5 USD a month) plus usage from its GraphQL
  Analytics API against the plan's allowance, per Worker.
- **Sentry (money).** The configured plan; event volume from its stats API against the quota.
- **GitHub (plan only).** Team, 2 seats. Actions minutes are free for this public repository; their
  list-price value is job duration times the list rate (Linux 0.006, Windows 0.010, macOS 0.062
  USD/min), which matched GitHub's own gross figure within 0.3%. Per workflow, job and release run.

The page shows the spend KPI with its projection; one row per line (month to date, projected,
budget, state, 28 d sparkline); cost per workflow this month (sorted bars, money and list-price value
in separate columns, never summed); cost per release run for the last 20 runs; AWS credits left.
Costs default to 28 d in 1 d steps, because billing sources are daily. Rates live in
`tools/pipeline-health/config/rates.json` with the date each was checked; a missing rate shows "rate
not set" as NO DATA, never zero.

## 8. Time ranges and buckets

- **24 h in 1 h steps** (default) and **7 d in 6 h steps**, on every page.
- **28 d in 1 d steps** only for slow measures: resolved flakes, detected to fixed, change failure
  rate, shard trends, costs.

The picker changes charts and tables, never the status line. Counts are summed per bucket, rates are
ratios of sums, durations come from the bucket's histogram, stocks show the end-of-bucket value and
peaks the bucket maximum. Times are stored in UTC and shown in the reader's zone, named in the
header. The current bucket is partial: its point is hollow and labeled "so far". On 28 d views the
golden-local week (2026-10-18 to 10-24, no pull requests) is shaded, so a change of process is not
read as a change of health.

## 9. Data age, volume and missing data

| Source                                               | Expected               | Yellow at           |
| ---------------------------------------------------- | ---------------------- | ------------------- |
| Collector: GitHub runs, jobs, pull requests, issues  | every 5 min            | 15 min              |
| CI test results and timings                          | every CI run           | 2 h of runs without |
| Release, deploy and channel records                  | each release or deploy | 7 h                 |
| npm publishes                                        | hourly                 | 3 h                 |
| Local writer (test ledger, quarantine, push log)     | every 5 min            | 24 h                |
| Weekly stress run                                    | Sundays                | 8 d                 |
| Host matrix                                          | nightly                | 30 h                |
| Billing (Cost Explorer, credits, Cloudflare, Sentry) | daily                  | 36 h                |

Red at twice the yellow age. The volume rule (4.7) applies beside the age rule, because a fresh but
thin source is as blind as a stale one. An unreachable source is NO DATA, hatched, never 0; a chart
before its source's history is hatched "no history"; an empty table names what is absent ("no open
holds").

## 10. Backend on AWS

### 10.1 Shape

```
GitHub Actions  --OIDC JWT-->  API Gateway HTTP API  -->  ingest Lambda  --+
owner's machine --token----->  (JWT authorizer)                            v
EventBridge Scheduler --5 min-->  collector Lambda  ----------------->  DynamoDB
  (GitHub App, npm, billing)        recomputes rollups                     |
health.graphty.app, MCP server  --GET-->  HTTP API  -->  read Lambda  <----+
```

The account (494945606241) is on AWS's paid plan with 120 USD of credits and runs everything in
us-east-2 (CloudFront, if ever added, is global). Its managed policies rule out Lambda@Edge,
cross-Region and cross-account access, and deny creating IAM identity providers, so **GitHub OIDC
to an IAM role is impossible**. Lifting that ("activate advanced features") is irreversible and
removes the spend limit, so the design needs no AWS credential in GitHub at all.

### 10.2 Authentication

- **CI writes.** The job (`permissions: id-token: write`) requests a GitHub OIDC token with audience
  `graphty-health` and sends it as a bearer token. The HTTP API's JWT authorizer checks signature,
  issuer, audience and expiry before any Lambda runs, so junk costs only an API request. The ingest
  Lambda then checks the claims (`repository_id`, `job_workflow_ref`, `ref`) against the record
  kinds each workflow may write, the logic `tools/results-service/src/service.js` has today.
- **Local writes** use a random token in the root `.env` (`GRAPHTY_HEALTH_TOKEN`), stored only as a
  SHA-256 hash, on a separate, harder-throttled route that accepts only kind `local`. A servherd
  process, `pipeline-health-local`, posts new ledger, quarantine and push-log records every 5
  minutes.
- **Reads are public.** The repository is public and everything stored is already public on GitHub
  (runs, pull requests, test names, truncated failure messages); no tokens, `.env` contents, full
  logs or host names are stored. So the page and the MCP server need no credentials.
- **The collector** signs in to GitHub as a GitHub App, so it uses the App's own rate limit, never
  the 5,000-an-hour budget the sessions share. Its key, like every secret, is an SSM Parameter
  Store SecureString under `/graphty-health/` (standard tier, free).
- CORS allows `GET` from `https://health.graphty.app` and the servherd dev origin only.

### 10.3 Storage

One on-demand DynamoDB table, `graphty-health`:

- Runs and jobs (steps inline), kept 90 days by TTL.
- Shard runs, with per-file results and a row per failed or retried test, 90 days. Passing tests are
  stored per file, not per test: flaky detection needs only failed and retried tests, and this cuts
  writes 20 to 50 times.
- Pull requests, issues, npm versions and daily cost lines, kept.
- Rollup buckets, `ROLL#<metric>#<dims>#<step>` keyed by bucket start: 1 h kept 14 days, 6 h 60
  days, 1 d 400 days.
- One precomputed item per page and range, and a sparse index by kind and hour over runs, jobs and
  shard runs.

**Rollups are recomputed, never incremented**, so a retried post cannot double-count. Ingest writes
raw items idempotently and marks each hour it touches dirty; every 5 minutes the collector
recomputes the dirty 1 h buckets from the index, then their 6 h and 1 d parents from the children,
then the page items. A bucket holds counts, sums and a 32-bin log-scale duration histogram, so any
bucket's median and p90 come from merged histograms, and "mark all dirty" rebuilds history after a
fix. A page view or MCP call reads one precomputed item or at most 28 buckets.

### 10.4 Collection

- **Collector Lambda**, every 5 minutes (EventBridge Scheduler, reserved concurrency 1): runs and
  jobs created or finished since its cursor across every organization repository with Actions
  activity (runner demand is organization-wide); one GraphQL query each for pull requests and
  issues; npm hourly; billing daily. Then rollups, status and alerts (section 13).
- **CI posts**: each shard run with per-file results and every failed or retried test (from the
  JUnit the shard already writes); run, job and step timings (the existing `timings` job); release,
  deploy and channel records; the LLM suite's token counts; the stress run's failures and issues
  filed. A failed post never fails a job.
- **Backfill**: a one-off script loads the last 28 days of runs and jobs, throttled.

### 10.5 Spend protection

1. **In code (seconds).** Reserved concurrency: ingest 20, read 5, collector 1. Throttles: reads 20
   requests/s (burst 40), CI writes 50 (100), local writes 5 (10). Bodies up to 1 MB and 5,000
   rows. A **daily write budget**: each ingest adds its rows to a `QUOTA#<day>` item under a
   condition (300,000 rows, about 5 times normal); past it writes get 429 and Data sources turns
   red. Reads are cached 60 s. Timeouts 10 s (collector 60 s); logs kept 14 days.
2. **An AWS Budget (hours).** 10 USD a month, email at 50% actual and 100% forecast, and an action
   at 100% actual that attaches a deny-all policy to the Lambda roles.
3. **The project spend limit (days).** Set by the owner: 20 USD (the minimum), "stop new resource
   creation" on, "pause top cost drivers" off. It counts charges before credits, and reaching it
   pauses the whole project.

### 10.6 Code and deploy

CDK in TypeScript in `tools/pipeline-health/`: `infra/` (one stack), `src/` (the Lambdas), `web/`
(the page), `mcp/` (the MCP server), `test/` (vitest and CDK assertions); `aws-cdk-lib` pinned.
Bootstrapped once from the owner's machine (`cdk bootstrap aws://494945606241/us-east-2 --profile
graphty`). Deployed by **CodeBuild**, started through a CodeConnections GitHub connection on master
pushes that touch `tools/pipeline-health/**`: it runs the tests and `cdk deploy`. Until the owner
approves the connection, deploys are by hand.

### 10.7 Cost

About 4 USD a month at 200 CI runs a day: HTTP API 0.50, Lambda 1.10, DynamoDB 1.65, CloudWatch
Logs 0.50, Cost Explorer 0.30; storage, SSM and Scheduler free. The credits cover years, and the
backend's own cost is a line on the Costs page.

## 11. The page

**Hosting: a new public repository, `graphty-org/pipeline-health`, served at
`health.graphty.app`.** The monorepo's Pages site is graphty.app, the production channel: it moves
only on the owner's go and only after a green master build. A health page must keep updating when
the pipeline is broken, which is exactly when that deploy stops. The source stays in the monorepo
(`tools/pipeline-health/web/`); a workflow on master pushes that touch it builds the page and pushes
it to the pages repository with a deploy key (`HEALTH_PAGES_DEPLOY_KEY`). The page holds no data, so
a stale build is harmless: it reads the API on load and every 60 seconds.

**Technology: Vite and TypeScript, no UI framework.** Eight views, hash routing, `fetch` and five
small SVG drawing functions (sparkline, bar with a budget line, sorted bars, minute strip, tree
rows). A chart library would bring back the gridlines, legends and palette section 3.3 removes.
Light and dark themes follow the system. Every chart has its values as a visually hidden table,
every row link is a real keyboard-reachable link, and the status blocks are a list of links whose
state word is text.

## 12. MCP server for agents

`tools/pipeline-health/mcp/server.mjs`, a stdio server on `@modelcontextprotocol/sdk` (already a
root dependency), registered in the root `.mcp.json` as `pipeline-health`. Every tool reads the
public API, so agents need no credentials (`GRAPHTY_HEALTH_URL` overrides the base URL). Results are
small JSON, capped at 50 rows with `truncated`, and carry each source's age. Tools:

- `health_status()`: each category's state, the member that set it, its value and threshold.
- `category(name)`: every member of a category with value, target, thresholds, state and n.
- `flaky_hotspots(range, level, under?)`: one level (group, family, shard, file, test) of the
  hotspot tree.
- `test_history(file, test?, range)`: flaky and failed events with commit, shard, attempt,
  signature, issue and quarantine state.
- `shard_times(range, kind, shard?)`: median, p90, budget and n per shard (pr or full runs), or per
  file of one shard.
- `ci_runs(workflow?, branch?, conclusion?, since?)` and `run(runId)`: recent runs, and one run's
  jobs, steps, times and failed tests.
- `pull_requests(state?)`: open pull requests with age, phase, attempts, cause and auto-merge.
- `releases()`: each channel's version, age and commits waiting; open holds and their lanes.
- `costs(month?)`: each cost line, cost per workflow and per release run.
- `sources()`: each source's age, volume and last error.

The pipeline-round and issue-round skills call `health_status` first instead of sweeping GitHub,
which also spares the shared GitHub API budget.

## 13. Alerts

A dashboard nobody has open is a blind spot of its own. When a category has been red for 30
minutes, the collector sends one Pushover notification (the application the release train uses,
its keys in SSM) naming the category, member, value, threshold and page link; once per episode, and
once when it clears. Nothing else alerts.

## 14. Rollout

1. **First AWS service.** Bootstrap CDK; deploy the stack (table, API, Lambdas, schedule,
   parameters, Budget) by hand; create the collector's GitHub App; start collecting and backfill.
2. **The same day, open three issues to move the Cloudflare services to AWS:**
    - **Results service** (`tools/results-service/`, Worker and D1): becomes routes of the health
      API with the same claim rules. `/v1/plan` is on CI's path, so it must fail open on a 5xx, a 429
      or a paused project. Run both for a week, compare counts, then switch.
    - **Release scheduler** (`tools/release-scheduler/`, Worker crons at 00:00, 06:00, 12:00 and
      18:00 UTC and the 03:17 deploy-key check): two EventBridge Scheduler schedules, one Lambda,
      App secrets in SSM. It is the release train's only clock, and a paused AWS project would stop
      releases: keep the Worker until the AWS one has fired every slot for two weeks in dry run.
    - **nx remote cache** (`tools/nx-cache-worker/`, Worker and R2): **measure first.** R2 egress is
      free; S3 and CloudFront egress costs about 0.09 USD per GB past 100 GB a month, and every cache
      download by a CI runner is egress. Read the Worker's monthly egress from Cloudflare's analytics
      and move only if it is well under 100 GB; otherwise record the figure and keep R2. A move also
      needs presigned S3 redirects (a Lambda response is capped at 6 MB), so check that nx's client
      follows them.
3. **Writers.** CI posts shard runs, timings, release and deploy records and LLM token counts; the
   local writer starts under servherd.
4. **The page** in `graphty-org/pipeline-health`: front page and Data sources first.
5. **The MCP server**, then the round skills switch to `health_status`.
6. **CodeBuild deploys**, once the CodeConnections connection is approved.

## 15. Owner decisions

One-way doors, for the owner:

1. The URL `health.graphty.app` and the repository name `graphty-org/pipeline-health` (public
   names; the default above).
2. The AWS project spend limit (20 USD recommended), which only the owner can set.
3. The CodeConnections approval, and the collector's read-only GitHub App (actions, checks, pull
   requests, issues, metadata).
4. Read-only tokens for the cost lines: Cloudflare (Account Analytics: Read, Billing: Read) and
   Sentry (org:read).

Decided here and easy to change: every threshold and budget in section 4 (tune after two weeks of
data), and which KPI heads each category.
