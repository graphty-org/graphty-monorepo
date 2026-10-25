# Pipeline health dashboard

A page served on this machine that shows, on one screen, whether graphty-monorepo's tests, CI,
merges and releases are healthy, and lets the reader drill into any area to find the cause. It is
read by the repository owner and by the agent sessions that keep the pipeline moving.

The mockup is `design/ci/health-dashboard/mockup.html`. Open it in a browser: it has no network
dependencies, every page is drawn, and its numbers are sample data.

## 1. Goal and the blind spots it closes

The goal is one place that answers "is anything in the pipeline unhealthy, and where?" for any
period from the last hour to the last year, with no area that can fail silently.

The pipeline it watches (issue #3418, `design/ci/channels-pipeline.md`):

- Every change is a pull request into master, opened by the agent account `graphty-agent` with
  auto-merge on. A light pull-request check (target 5 to 10 minutes) gates the merge.
- Master is the canary channel (canary.graphty.app). A commit is promoted to nightly
  (nightly.graphty.app, npm tag `next`) when its screenshots are unchanged or the owner approves
  them, and to production (graphty.app, npm tag `latest`) only on the owner's go.
- A full run every 6 hours tests master in full, bisects a failure and reverts the culprit. Until
  that is built, the release train runs in shadow mode: it runs every lane on master's newest
  commit, publishes nothing and opens no "Release held" issue.
- CI time budgets live in `ci-budgets.json`. Intermittent tests are detected and quarantined
  automatically (`tools/test-quarantine.mjs`, `tools/test-quarantine.json`).
- A Cloudflare Worker with a D1 database (the results service, `tools/results-service/`) records
  CI test groups and failures. The local test ledger (`tools/test-ledger.mjs`) records local shard
  runs. The status broker (`tools/pr-status-broker.mjs`) writes every open pull request's state to
  `tmp/pr-status/status.json` once a minute.

Problems seen in October 2026 that nothing showed until a person went looking, and what now
exposes each:

- **GitHub's 60 concurrent runners saturated by full-suite runs; queue time, not run time, was the
  delay.** The organization-wide runner tile (running plus queued against 60, longest wait), the
  runner demand chart and the run-level queue time.
- **A bug on master turned every open pull request red.** The "red on the same check" tile (summary
  checks excluded) and the "shared" failure cause, which a failure seen in 3 or more pull requests
  within 24 hours earns even though master itself runs no tests.
- **Flaky stories and tests held one merge for five days.** A needs-a-person row for any pull
  request blocked by a flake for over 24 hours, and pull requests blocked by a flake on the Flaky
  tests page.
- **Most intermittent failures appear only under local machine load.** CI and local flake rates on
  one chart, and local vs CI disagreement.
- **The weekly CPU-restricted stress run failed and filed nothing.** The stress run is "bad" when it
  failed or had failing tests and filed 0 issues.
- **Release holds came mostly from outside lanes (LLM regression, T4 GPU, npm listing lag).** Holds
  are computed from `release.yml` runs, so shadow-mode holds count, with the failing lane named.
- **Local test records nearly stopped (1,153 on 10-23, 731 on 10-24, 44 on 10-25) while their age
  looked fresh.** Every source has a volume rule beside its age rule.

A blind spot is any part of the pipeline whose failure would leave every panel calm. The rule that
follows: a source that is missing, late, empty or unusually thin is an alarm, never a zero or a
quiet chart (section 6).

## 2. Information architecture

### 2.1 Overview first, then drill down

The structure follows Shneiderman's "overview first, zoom and filter, then details on demand"
(1996), Stephen Few's rule that a dashboard is a single screen read at a glance ("Information
Dashboard Design", 2006), and Grafana's overview dashboards that link to detail dashboards.

- **The front page fits one 1440 x 900 screen and never scrolls.** A long scroll hides the bottom
  of the page, and the bottom is where a forgotten problem sits.
- **Six area pages**: Pull requests, CI, Flaky tests, Releases, Local, and Sources (the data health
  page). Area pages scroll, top to bottom in pipeline order: pull request, CI, merge, master,
  canary, nightly, production.
- Every front-page tile and chart links to its section on an area page, carrying the time range.
  Every table row links to its pull request, run, issue or test.
- A tab bar under the header lists the pages. Each tab shows the status symbol of the worst
  threshold on its page, not only of the front-page tiles, so a problem on a page nobody opened is
  still visible.

Drill-down beats long scroll here because the areas answer different questions (a merge delay is a
different investigation from a release hold) and each area page holds tables and histograms that
would push the front page far past one screen.

### 2.2 Front page layout

Tableau's eye-tracking study found that first looks land top left and that large numbers draw the
eye about a second sooner, so current state goes top left and trends below.

```
+--------------------------------------------------------------------------------------------+
| Pipeline health  [24h 7d 28d 90d 12mo custom] [bucket] [authors] [markers]  UTC  data age  |
| Overview | Pull requests | CI | Flaky tests | Releases | Local | Sources                    |
+--------------------------------------------------------------------------------------------+
| HEALTH  row 1: [Master green] [Canary] [Nightly] [Production] [Runners, org, now]          |
|         row 2: [Release holds] [Screenshot backlog] [Open PRs] [Red on same check] [Quar.] |
+--------------------------------------------------------------------------------------------+
| TRENDS (one shared x-axis, shared markers)            | Where PR time goes (100% bar)      |
|   master status strip                                 |                                    |
|   PRs created vs merged                               | Why PR checks fail (100% bar)      |
|   runner demand (running + queued, 60 line)           |                                    |
|   queue vs run time (p50, p95)                        |                                    |
|   first-attempt pass rate                             |                                    |
+--------------------------------------------------------------------------------------------+
| NEEDS A PERSON (severity, then age)                   | SOURCES (age, rows)                |
+--------------------------------------------------------------------------------------------+
```

- **Health tiles, 10 in two rows.** The research suggests 5 to 9; the owner's "health at a glance"
  list is 5 metrics, the three channels make 7, and three more each close a blind spot from
  section 1. Row 1 is state (master and the channels, plus runners), row 2 is backlog and queues.
  Healthy tiles are neutral; only exceptions get color, so one red tile stands out anywhere.
- **Trends.** Five time charts stacked as small multiples on one x-axis, so one event (a red span,
  a saturation episode) lines up across all of them. Two 100% bars on the right cover the whole
  range.
- **Needs a person.** Items only a person can resolve, sorted by severity, then age (oldest first):
  open release holds, runner saturation, screenshot reviews waiting, pull requests blocked by a
  flake over 24 hours, auto-merge armed but stuck, quarantine entries past 7 days, pull requests
  open past 24 hours (with their dominant phase and cause, "fix wait: flaky storybook-2"). Rows in
  "ok" never appear. Beside it, the source strip.

Histograms, the flake matrix, per-job budgets, DORA, size vs failure, local vs CI and cost are on
the area pages.

### 2.3 Area pages

Each area page has the same skeleton: a row of KPI tiles, time charts on the shared axis,
distributions, then tables sorted by impact. Sections have anchors (`#queue-vs-run`).

- **Pull requests.** Tiles: created, merged, backlog, oldest open, time to merge, first attempt,
  reverts, stuck auto-merge. Charts: created vs merged; backlog; time by phase per day; failure
  cause per day; time to merge p50/p95; time-to-merge histogram; failure rate by size; agent vs
  human. Tables: open pull requests (with a phase bar each), most failed attempts, reverts.
- **CI.** Tiles: queue p50/p95, run p50/p95 (per job and per run), first-attempt pass, reruns,
  budget violations, CI minutes. Charts: runner demand per hour over the picked range; queue vs
  run time; reruns; queue-time histogram. Table: budget bullets per job. Bar: minutes by workflow.
- **Flaky tests.** Tiles: newly flaky, flake rate CI, flake rate local, quarantined, detected to
  fixed, resolved, pull requests blocked. Charts: newly flaky vs resolved; CI vs local flake rate;
  flake matrix (tests by day). Tables: quarantine with progress, tests by pull requests blocked.
- **Releases.** Channel tiles, first attempt, trigger to success. Charts: train attempts by
  outcome; hold causes by lane; trigger to success; lead time to each channel. DORA band:
  throughput and stability (change failure rate with rework rate). Table: holds.
- **Local.** Tiles: median shard time, disagreement, ledger records, slot wait. Charts: ledger
  records per day with the volume line; disagreement split. Table: local vs CI time per shard.
- **Sources.** Every source with expected interval, last write, rows in 24 h, 7-day median,
  history start and error; collector tasks; GitHub REST budget.

## 3. Metrics

Notation. Times are UTC instants; "in range" means the event's time lies in the selected range.
p50 and p95 come from raw events in each bucket, never averaged across buckets. Rates are ratios of
sums. Each metric lists its definition, encoding, target and source.

Encodings: **tile** (number, sparkline, change against the previous equal range, status),
**bullet** (bar against a limit tick), **channel tile** (state, version, age, last 14 outcomes as
dots), **line** (p50 solid, p95 dashed), **multi-line** (2 to 4 lines, one axis, one unit),
**stacked** (bar per bucket), **100% bar** (one bar split into shares, labels on the segments),
**strip** (state band over time), **diverging** (inflow up, outflow down), **histogram** (log
bins), **matrix** (items by time bucket, shade = count), **dot** (p50 dot, p95 whisker, log axis),
**table** (sorted, with a mini-bar column).

Excluded checks. "Summary" checks only restate other checks or judge pull-request metadata, so
counting them would make every failure look shared: `All Checks Pass`, `Queue Checks Pass`,
`Lint PR Title`, `Link PR Issue`, `Visual report`, `Draft state` and any `Mergify` check. The list
is `excludedChecks` in `tools/health-dashboard/config.json`, and every panel that uses it prints
the names in its tooltip.

The visual gate. `visual-review/trusted/gate.mjs` fails `All Checks Pass` while changed pictures
wait for the owner. An attempt whose only failure is that gate, reporting unaccepted pictures and
no capture error, is **owner wait**: not a failed attempt, not in the failure causes, and judged
as passing in the first-attempt pass rate. A capture error is a failure like any other.

### 3.1 Health at a glance

- **Master green time.** Wall time in the bucket during which master's newest commit was green,
  divided by wall time. Master is red from the completion of a failed run on a master commit (the
  master build, or the full run: today the shadow release train's suite) until a passing one on a
  later commit. %; GH runs, git. Tile labeled "build + full run", printing the age of the last
  full-run verdict (warn past 8 h, because a 6-hour gap must not read as green); strip on the
  trends band. Target 95%.
- **Release status and age, per channel.** State of the last deploy attempt (ok, failed, held,
  deploying), the version or commit served, its age, and commits on master not yet in it. Canary:
  `deploy-pages.yml` on master. Nightly: D1 `channel_move` and `site`, npm `next`. Production:
  D1 `site`, npm `latest`, `graphty-site` deploys, and the last release train's result with its
  failing lane ("last train 2.1 h ago: held, T4 GPU"). A channel with no records shows "no data"
  and names its source; it never shows an internal table name. Canary warn 6 h, bad 24 h; nightly
  warn 2 d, bad 4 d; production shows commits waiting with no color (promotion is the owner's
  choice).
- **Runner saturation (now).** Jobs in progress plus queued across every repository of the
  `graphty-org` organization, against GitHub's 60-job concurrency limit, which is per
  organization; and the longest current wait (now minus the oldest queued job's `created_at`).
  Bullet with a tick at 60, never a round gauge. Wait warn 5 min, bad 15 min.
- **Runner demand (history).** Per bucket: the peak of running plus queued jobs, replayed from
  every job's `created_at`, `started_at` and `completed_at`, drawn as a stacked bar (running up to
  60, queued above it) with the 60 line; each saturated bucket is labeled with its **saturated
  hours** (time with 60 running and at least one queued). Bucket maximum, never an average.
- **Release holds open.** A hold opens when a `release.yml` attempt fails a lane before landing,
  and closes when an attempt on a later commit passes every lane or a release lands. The lane comes
  from the failing job's name (`releaseLanes` in config: T4 GPU, LLM regression, Hosts, macOS work
  protection, suite, version or publish, npm listing). "Release held" issues are the second source,
  joined by commit. Shadow-mode attempts count. Count and oldest age; bad when 1 or more.
- **Screenshot backlog.** Per open pull request, pictures waiting for the owner: the visual gate's
  state from the broker plus the picture count from the `Visual report` check run's summary
  (GraphQL `CheckRun.summary`); age from the first capture that left them pending. Review records
  are written only on Finish, so they measure decisions, not the backlog. Count and oldest age;
  oldest warn 24 h, bad 72 h.
- **Open pull requests and oldest open.** Open non-draft pull requests and the oldest one's age,
  with its dominant phase and cause. Soft limit 15; oldest warn 24 h, bad 72 h.
- **(added) Red on the same check.** The largest number of open pull requests whose newest run
  fails the same check, excluded checks left out. Warn 2, bad 3 or more.
- **(added) Quarantined tests.** Entries on the quarantine list and the oldest one's age. Oldest
  warn 7 d, bad 14 d (entries expire at 14).
- **(added) Data sources.** Per source: age of its last write and rows written (section 6).

### 3.2 Pull request flow

- **Created and merged.** Pull requests into master created in the bucket, and merged in the
  bucket. Two lines on one axis; a widening gap is a growing backlog. Per hour on 24 h, per day
  beyond.
- **Backlog depth.** Open non-draft pull requests at the end of the bucket, with the bucket maximum
  as a light band. Its own chart under created vs merged (a stock, not a flow). Soft limit 15.
- **Oldest open non-draft.** Max over open non-draft pull requests of now (or bucket end) minus
  ready time (or created time if never a draft). Warn 24 h, bad 72 h.
- **Time to merge.** merged_at minus ready time, for pull requests merged in the bucket; p50 and
  p95. Line plus histogram. p50 target 60 min; buckets with n under 5 drawn hollow.
- **Where the time goes.** Each merged pull request's open time split into phases, summed over the
  range: **runner wait** (at least one of its jobs queued and none running), **CI running** (at
  least one job running), **fix wait** (newest attempt failed, no new commit yet), **owner wait**
  (green except for the visual gate, or waiting for an approval or a label), **merge wait**
  (everything else: green with auto-merge pending). Totals, not medians, because phase medians do
  not add up. 100% bar on the front page, stacked bar per day and a bar per open pull request on
  the area page. Warn when runner wait is over 25%.
- **Failure rate by cause.** Each failed attempt (the visual gate excepted) gets one cause, checked
  in this order:
    1. **infrastructure**: job conclusion `startup_failure`, a lost runner, a timeout cancel, or an
       annotation naming an outside 5xx;
    2. **conflict**: auto-merge disabled for a merge conflict, or broker `mergeable` = CONFLICTING;
    3. **shared** (the owner's "already broken on master"): the same failing test, or before
       test-level data the same failing job, fails in 3 or more distinct pull requests within 24
       hours, or fails on the next master full run. Master's own push runs only the build, so
       master's result for the base commit rarely exists; this rule does not need it;
    4. **flaky** (the owner's rule): every failing test passed on a rerun of the same commit, or was
       already flaky or quarantined;
    5. **change**: everything else.

    Causes are re-classified when later evidence arrives (a third pull request, the next full run),
    so recent days can move. Stacked per day with "change" at the bottom in neutral gray; 100% bar
    for the range; tile of the share not caused by the change, target under 20%. Before 2026-10-25
    classified at job level, and labeled so.

- **Most failed attempts.** Pull requests ranked by failed attempts in range, with hours lost (fix
  wait) and a mini bar of causes. Top 10.
- **Reverts after merge.** Master commits in range starting `Revert "`, or made by master-guard or
  a bisect; also as % of merges. Tile, triangle markers on every time chart, table.
- **(added) Auto-merge armed but stuck.** Open pull requests with auto-merge enabled longer than
  2 h with every check green, or 6 h otherwise. Needs the broker's `autoMergeRequest.enabledAt`.
- **(added) Agent vs human.** Author `graphty-agent` or anyone else. A page-wide filter, never a
  ranking; a 2-part donut on the area page (the dashboard's only pie).
- **(added) Size vs failure rate.** Pull requests in range binned by lines changed (1-10, 11-100,
  101-1,000, over 1,000): share whose first attempt failed by "change". n on each bar; bins with
  n under 10 hollow.

### 3.3 CI

- **Queue time vs run time.** Per job: queue = `started_at` minus `created_at`; run =
  `completed_at` minus `started_at`. Per run: queue = time during which at least one of its jobs
  was queued and none was running (the same union rule as runner wait); run = last job completion
  minus first job start; also the longest single job queue in the run. p50 and p95 per bucket,
  split by run kind (pr, full, release). Multi-line: queue orange, run blue, p95 dashed. Reference:
  a thin dotted gray line at the queue p95 target, 5 min, labeled at its right end. The run budget
  (`run:ci.yml:pr`, 20 min) is for whole runs, so it appears only on the per-run tile, never on
  this per-job chart. GitHub reports only means, so all of this comes from job timestamps.
- **First-attempt pass rate.** Pull-request check suites whose attempt 1 passed (the visual gate
  excepted), divided by all attempt-1 suites. Target 85%.
- **Budget violations.** Each completed job, run and step with a budget in `ci-budgets.json`: warn
  over minutes x `warnRatio`, hang over minutes x `hangRatio` (and at least `minHangMinutes`).
  Counts per bucket; p95 per job against its budget as a bullet, sorted by overrun. Past jobs are
  judged by today's file, and the panel says so.
- **Reruns.** Run attempts with `run_attempt` over 1 started in the bucket. Bars.
- **(added) CI minutes and paid cost.** Job run time per runner class and workflow; T4 minutes x
  the configured rate; LLM regression spend month to date. A value missing its rate shows
  "partial" and what is unset ("T4 rate unset"), never "no data" beside a number.

### 3.4 Flaky tests

- **Newly flaky and resolved.** Newly flaky: tests entering the flaky state in the bucket (a
  failure that passed on a rerun of the same inputs, after at least 10 clean runs or none
  recorded). Resolved: flaky tests reaching 10 consecutive clean runs, or whose issue closed with
  a fix. Diverging bars, newly flaky up, resolved down. Net at or below 0.
- **Flake rate, CI and local.** Test-file runs that failed then passed on the same inputs, per
  1,000 test-file runs, separately for CI (D1) and local (ledger). One chart; the gap between the
  lines points at load-sensitive tests. Under 1 per 1,000. The local line shows "n=x of usual y"
  when the ledger's volume is low.
- **Flake matrix.** Top tests by flaky failures in range; columns are buckets; shade is failures;
  a dot on rows quarantined now; a column of pull requests blocked. A CSS grid.
- **Quarantined now.** Count, oldest age, and per entry its progress toward 20 consecutive clean
  runs, counted from CI runs (D1 `file_run`) as well as local gate runs, because gate runs have
  nearly stopped. Oldest warn 7 d, bad 14 d.
- **Detected to fixed.** For flaky issues closed as fixed in the bucket, closed minus created; p50,
  with still-open ones counted beside it. Target 3 d.
- **Pull requests blocked by a flake.** Pull requests with a failed attempt of cause "flaky", and
  the hours until the next green attempt. Target 0; any pull request blocked over 24 hours is a
  needs-a-person row.

### 3.5 Releases

- **Train attempts by outcome.** `release.yml` attempts that did work, per bucket: passed first
  time, passed after a retry, held. Stacked bars; tile of the first-attempt share, target 90%.
- **Hold causes.** Holds opened in range by lane (section 3.1). Sorted horizontal bars.
- **Trigger to success.** Release run `created_at` to the success of its last job; p50 and p95.
  Budget `run:release.yml:full`, 75 min.
- **Lead time to each channel.** For each commit merged to master, time until canary serves it
  (deploy completed), nightly (`channel_move` or npm `next`), production (npm `latest` or a
  `graphty-site` deploy). Dot plot per channel on a log axis with target ticks: canary 30 min,
  nightly 1 d, production none.
- **Change failure rate.** Promotions followed within 7 days by a revert or by a fix referencing a
  master-guard or "Failing on" issue, divided by promotions. Weekly line, under 15%.
- **(added) Rework rate (DORA 2024).** Merges that revert or fix a change merged in the previous 7
  days, divided by merges. Same chart as change failure rate.
- **(added) Deployment frequency and time to restore.** Promotions per day per channel; p50 length
  of a master red span. Read as trends, not targets (dora.dev).

### 3.6 Local development

- **Local test time.** Ledger `secs` per shard, p50, from local gate, `test:changed` and
  `run-tests.sh` runs; whole-gate time from the push log before 2026-10-23. Compared with CI per
  shard in a table.
- **Local disagrees with CI.** Pairs of a local and a CI invocation with the same shard variant
  and inputs key whose outcomes differ, split into local fail / CI pass (usually load) and local
  pass / CI fail (usually environment). Under 2%; shows "n=x pairs".
- **(added) Ledger records.** Records per day, against the source volume rule (section 6).
- **(added) Slot waits.** Time local runs waited for test, browser and GPU slots; p95.

The pre-push gate no longer runs (`tools/pr-open.sh` and the post-commit push skip it), so the
local page lives only if other local runs write records: `test:changed` and `run-tests.sh` write
ledger records and post them to D1 as kind `local` (section 10.6).

## 4. Time range and granularity

**One picker drives every panel** (Datadog's global time, Grafana's time picker): 24 h, 7 d,
28 d (default), 90 d, 12 months, custom. Range, bucket, author filter and markers live in the URL
(`?range=28d&bucket=auto&author=all`), so a link reproduces the view.

| Range     | Default bucket                   | Overrides          |
| --------- | -------------------------------- | ------------------ |
| 24 h      | 1 hour (strips at minute level)  | hour               |
| 7 d       | 6 hours (created/merged: 1 hour) | hour, day          |
| 28 d      | 1 day                            | 6 hours, day, week |
| 90 d      | 1 week                           | day, week          |
| 12 months | 1 month                          | week, month        |

A bucket override sits beside the picker; buckets finer than a source records are disabled. Every
chart follows the picker, including runner demand per hour on the CI page (672 points on 28 d).
"Now" tiles say "now" in their header and ignore the picker except for their sparkline.

Rebucketing rules, the same for every chart:

- **Counts** are summed; the axis title names the bucket ("per day").
- **Rates** are ratios of sums, never averages of percentages.
- **Durations** are p50 and p95 recomputed from raw events; a bucket with n under 5 is hollow.
- **Stocks** (backlog, quarantine) show the end-of-bucket value; where the peak matters (runner
  demand, red on the same check) the bucket maximum.
- **Time shares** (master green) are time-weighted.
- **Tile changes** compare with the previous range of the same length.
- Data is stored in UTC. The display zone is shown in the header; bucket edges follow it.

**Shared event markers** (Grafana annotations) on every time chart: releases (diamonds), reverts
(triangles), quarantine changes (ticks), master-red spans (shaded bands, so their length shows).
Each kind can be switched off; each marker links to its run, pull request or issue.

**Pipeline eras.** The four weeks of history span three pipelines, shaded so a change of process is
not read as a change of health:

- to 2026-10-17: one pull request per change, merged by the Mergify queue. Complete history.
- 2026-10-18 to 2026-10-24: golden-local. Changes landed locally into `golden`; no pull requests,
  and master runs only built. Pull request charts show a hatched band, "golden-local: no pull
  requests"; master green time shows golden verification, hatched.
- from 2026-10-25: the channels pipeline.

## 5. Units

- Durations: one unit per axis, chosen from the largest value: s under 2 min, min under 120, h
  under 72, d beyond. The unit is in the axis title, not on each tick.
- Rates: "per hour" on 24 h, "per day" beyond, "per week" on 90 d, "per month" on 12 months. Flake
  rate is always "per 1,000 runs".
- Percentages: whole numbers, one decimal under 10%; the tooltip gives "412 of 487".
- Counts: integers with thousands separators. Money: whole USD, month to date.
- Sampled values show "n=x of y".

## 6. Data age, volume, empty and partial states

Missing data is loud; that is the dashboard's main defense against blind spots.

- **Every panel shows its source and data age** in its header ("broker, 1 min"); the page header
  shows the worst age across sources.
- **Age rule.** Warn at the limit, bad at twice it:

| Source                          | Expected        | Warn age |
| ------------------------------- | --------------- | -------- |
| Status broker                   | every minute    | 5 min    |
| Collector, GitHub runs and jobs | every 5 min     | 15 min   |
| Results service (D1)            | every 5 min     | 30 min   |
| Test ledger                     | each local run  | 24 h     |
| Quarantine state                | each gate run   | 24 h     |
| npm                             | every 15 min    | 1 h      |
| Weekly stress run               | weekly (Sunday) | 8 d      |
| Host matrix                     | nightly         | 30 h     |
| Release train                   | every 6 h       | 7 h      |

- **Volume rule.** Warn when a source's rows in the last 24 hours fall under 20% of the median of
  the previous 7 days. A source can be fresh and nearly empty: the ledger wrote 44 records on
  2026-10-25 against about 1,000 a day before, and its age still looked fine.
- **Stress run.** Bad when the run failed or had failing tests and filed 0 issues; ok when it passed
  and filed 0; bad when it has not run in 8 days. Its record (kind `stress`) carries the count of
  failing tests and of issues filed.
- **Unreachable source:** "no data" (dash symbol, hatched panel), never 0.
- **Partial bucket.** The current bucket is unfinished. Bars are hollow with a dashed outline;
  lines end in a dashed segment; both are labeled "partial" on the axis. No other color or opacity
  marks it.
- **Before a source's history begins** the chart is hatched "no history" (results service before
  2026-10-25, local shard times before 2026-10-23).
- An empty table names what it lacks in two or three words ("no open holds").

## 7. Status and color

Status is never shown by color alone (WCAG 2.1 success criterion 1.4.1). Four states, each a
color, a symbol and a word:

| State   | Symbol   | Color                                                     |
| ------- | -------- | --------------------------------------------------------- |
| ok      | check    | neutral tile; green check only (`#0ca30c`)                |
| warn    | triangle | `#b8860b` for symbol and border; light amber only as fill |
| bad     | X        | `#d03b3b`                                                 |
| no data | dash     | gray, hatched panel                                       |

- The warn symbol and border use dark amber because the light amber (`#fab219`) is about 1.8:1 on
  white, under WCAG 1.4.11's 3:1 for graphical objects.
- Healthy tiles stay neutral; a warn or bad tile gets a colored left border, symbol and word.
- Red is only for "bad". Chart series use a categorical palette tested for color-blind separation.
  **The same measure keeps its color everywhere**: orange is waiting for a runner (queue time,
  queued jobs, runner wait), blue is running (run time, running jobs, CI running). Different
  measures may reuse a hue on different charts, so 100% bars carry their labels on the segments,
  with a legend only for segments too narrow to hold one.
- Failure causes have their own hues: "change" is neutral gray, and the four causes that are not
  the change (flaky, shared, infrastructure, conflict) get magenta, brown, slate and olive, used by
  no other chart.
- Every threshold that colors a tile is printed on the tile or in its tooltip.
- Lines are 2 px; dashes mean p95 and nothing else. Targets and limits are thin dotted gray rules
  labeled at their right end; the 60-runner limit is a solid rule because it is a hard limit.
- Each chart has a "table" toggle showing its data as rows, which is also the screen-reader path
  (the image role plus hidden table pattern of compact-mantine's `ChartRow`).

## 8. Alerts

A dashboard nobody has open is a blind spot of its own. The collector sends one push notification
when a front-page tile or a source has been "bad" for 30 minutes, once per episode, through the
notifier the owner already uses (`~/.claude/scripts/claude-notify.sh`; Pushover is the
alternative), with the tile's name, value and a link to the dashboard. Thresholds and the delay are
in config; there is no other alerting.

## 9. Chart library

**Choice: a React + Vite page using compact-mantine for layout, tables and controls, and
`@mantine/charts` (MIT, built on Recharts) for charts.**

- Pin `@mantine/charts` to 8.3.18, the `@mantine/core` version the repository already installs;
  its peer is `recharts >=2.13.3`, so use Recharts 2.15.x. Mantine 9 needs Recharts 3.2.1 or newer,
  so both move together later. The first build step renders one chart to confirm 8.3.18 with
  Recharts 2.15.
- **Already in the stack.** React 19 and Mantine 8.3.18 are installed and no chart library is, so
  any choice adds a dependency, and this adds the fewest pieces.
- **Theming is free.** Colors, density and dark mode come from compact-mantine; any other library
  needs its colors mapped by hand for light and dark.
- **Building blocks exist.** `compact-mantine/src/components/rows/ChartRow.tsx` (sparkline,
  histogram and metric rows with an accessible pattern), `compact-mantine/src/components/DataTable/`
  for tables, `Progress` for bullets, `SegmentedControl` for the time picker.
- **Coverage.** Lines, stacked and 100% bars, stacked areas, sparklines, donuts. 28 days of hourly
  points is 672 per series, easy for SVG.
- **Gaps:** the flake matrix is a CSS grid (Mantine's `Heatmap` draws only a date calendar); the
  runner bullet is a `Progress` with a marker at 60; p50 and p95 are two lines; status strips are
  positioned divs. No other library.
- **One y-axis per chart.** Two measures of different scale are two charts on the shared x-axis.

Runners-up: **Apache ECharts 6** (Apache-2.0), the escape hatch for one chart that outgrows
Recharts (a zoomable matrix, over 10,000 points, linked zoom); not the main library because its
configuration sits outside JSX, it needs a hand-mapped theme and its canvas is opaque to screen
readers and screenshot review. **Grafana** (AGPL-3.0, fed from SQLite) gives a time picker and
alerting free, but is a second server with its own look and cannot read D1 directly.

Rejected: Chart.js and uPlot (canvas, weak React support; uPlot draws only time series), Observable
Plot and Vega-Lite (render outside React, own theming), Tremor (Tailwind, clashes with Mantine; not
updated since January 2025), Evidence.dev and Metabase (business-intelligence tools with their own
server or build step).

## 10. Data design

### 10.1 Two raw stores, one read model

- **D1 (the results service)** holds what CI writes about itself: test groups (`invocation`),
  per-file runs (`file_run`), failures with retries (`failure`), `quarantine`, `tracked_issue`,
  `duration`, `site`, `verdict`, `channel_move`. The tables exist; missing are the writers
  (section 10.6) and a read endpoint.
- **Local SQLite, `tmp/health-dashboard/health.db`** (`node:sqlite`), is the dashboard's only read
  model: GitHub runs, jobs and steps, pull requests with timeline events and visual-report
  summaries, issues, npm publish times, git events, broker change snapshots, local file imports
  (push log, waits, quarantine, review records) and mirrors of D1 rows. The test ledger's index is
  attached read-only. GitHub rows can be rebuilt from GitHub, so the file is a cache; broker
  snapshots and local imports exist nowhere else and are exported daily as JSON lines under
  `tmp/health-dashboard/archive/`.

Main tables (times as UTC milliseconds):

- `run` (run id, attempt): workflow, repository, event, branch, sha, pr, created, started, updated,
  conclusion, kind (pr, full, release, deploy, other).
- `job` (job id): run id, attempt, name, labels, runner class (linux, macos, windows, t4),
  created, started, completed, conclusion, lane (release jobs).
- `step` (job id, number): name, started, completed, conclusion.
- `pr` (number): author, agent, created, ready, merged, closed, additions, deletions, base.
- `pr_event` (pr, time, kind): ready, auto-merge on or off (reason), labeled, head pushed, visual
  report (pictures pending).
- `issue` (number): kind (hold, intermittent, critical, master-guard, failing-on, stress), lane,
  created, closed, close reason.
- `git_event` (sha): time, kind (merge, revert, tag, fix), pr, reverted sha.
- `npm_publish` (package, version): time, dist-tag.
- `broker_change` (time, pr): changed fields only.
- `failure_cause` (run id, job id, test): cause, evidence, classified at; rewritten when evidence
  arrives.
- `source_heartbeat` (source, time): rows written, error.
- `d1_<table>`: mirrored rows.

### 10.2 The collector

One servherd process, `health-collector` (`tools/health-dashboard/collector.mjs`), with cursors in
`health.db`. Under servherd it uses the owner's gh login, not graphty-agent, so it shares the
owner's 5,000-an-hour REST budget with the status broker and the watchers.

- Every minute: diff the broker file into `broker_change`; tail the push log, waits, quarantine
  state and review records.
- Every 5 minutes: queued and in-progress runs for each organization repository with Actions
  activity (2 calls a repository; the list is refreshed hourly), and the jobs of each active run (1
  call a run), which feed "runners now"; jobs of runs completed since the cursor; one GraphQL query
  for pull requests and issues updated since the cursor, with the `Visual report` summary of open
  pull requests; D1 rows since its cursor.
- Every 15 minutes: `npm view <pkg> time dist-tags` for the 13 packages (no GitHub budget).
- Every 5 minutes: alert evaluation (section 8).

REST cost: about 4 repositories x 2 x 12 = 100 calls an hour for run lists, plus 1 call per active
run every 5 minutes (3 to 8 runs normally, 40 to 100 an hour; 10 to 30 during saturation, up to 360
an hour), plus about 50 an hour for completed runs' jobs. So about 200 an hour normally and 500 at
peak. Conditional requests with ETags that come back 304 do not count. Below 1,500 remaining
(`gh api rate_limit` costs nothing) it stops polling active runs' jobs first and shows the runner
tile as "n=x of y runs"; below 500 it stops all REST calls. It never polls per pull request.

### 10.3 The four-week backfill

`tools/health-dashboard/backfill.mjs --since 2026-09-27`, resumable from a cursor:

- **First, check one assumption.** On a run from the 2026-10-25 saturation, confirm that a job
  waiting on `needs` gets its `created_at` when it becomes queued, not when the run starts. If it is
  the run's start, every dependent job's queue time is wrong; queue then starts at the completion of
  the last job it needs, taken from the workflow's `needs` graph.
- Run lists: about 250 REST calls (a filtered list caps at 1,000 runs; the repository makes 550 to
  1,300 a day, so it slices by day or hour).
- Jobs: about 8,000 to 9,000 calls (`jobs?filter=all`, every attempt), for multi-job workflows
  only.
- Pull requests and issues: about 80 GraphQL queries, under 1,000 points.
- Git and npm locally, without budget.
- Throttled to 1,200 REST calls an hour: about 8 hours, overnight.
- JUnit artifacts are not downloaded; test-level history before 2026-10-25 comes from the ledger
  and issues.

Recoverable for all four weeks: holds (from `release.yml` runs), runner demand, queue vs run time,
first-attempt pass rate, reruns, budgets (judged by today's file), pull request flow, reverts,
release first attempt, lead time to canary and npm, flaky detected-to-fixed.

Gaps: master green time in golden-local week (golden verification shown instead); nightly and
production status and lead time to nightly (nothing until `channel_move`, `verdict` and `site` are
written); failure cause and flake rate at test level (job level before 2026-10-25); conflicts over
time (broker snapshots from now on); local vs CI disagreement (almost no pairs); local per-shard
time (from 2026-10-23); screenshot backlog history (from now on); GPU cost (needs a rate).

### 10.4 Rollups

Computed on read: `GET /api/metric/<name>?from=&to=&bucket=&dims=` runs one SQL query, buckets by
time and computes p50 and p95 in JavaScript. 13 months of raw rows is small (about 40 MB a month),
so a materialized rollup table comes only if month views prove slow. Answers are cached 60 s and
carry `{ series, n, partialFrom, noHistoryBefore, sourceAge, volume }`, so every panel draws its
partial bucket, history start, age and volume state without knowing the source.

### 10.5 Retention

- Local raw tables: 13 months (a year plus the comparison month).
- D1 `failure` and `invocation`: 13 months; `file_run`: 90 days; `site`, `verdict`,
  `channel_move`: kept for good.
- The ledger's prune keeps 13 months.

### 10.6 Changes needed elsewhere, and what must start recording now

Additive changes (non-breaking):

- Results service: `GET /v1/export?table=<t>&since=<ms>` (paged, read token). Without it the
  dashboard cannot read failures, quarantine, verdicts or channel moves.
- Status broker: `createdAt`, `autoMergeRequest.enabledAt`, `additions`, `deletions` per pull
  request.
- `test:changed` and `tools/run-tests.sh`: write ledger records like the gate does, and post them
  to D1 as kind `local` with the same variant and inputs keys as CI.
- `tools/test-quarantine.mjs`: count exit progress from clean CI runs too.

Start recording now, because each day not recorded is lost:

- Broker change snapshots (conflicts and the screenshot backlog have no other history).
- Every CI test group and its retry, posted to D1.
- `site`, `verdict` and `channel_move` from `release.yml` and `deploy-pages.yml`.
- The weekly stress run as kind `stress`, with failing tests and issues filed.
- Config values for the T4 rate (USD per minute) and the monthly LLM budget, in
  `tools/health-dashboard/config.json`.

## 11. Serving it locally

One Node server, `tools/health-dashboard/server.mjs`, serves the built page and `/api/metric/*`
from `health.db`. Both processes run under servherd, which assigns the port:

```jsonc
servherd_start({ name: "health-collector", cwd: "<repo>",
  command: "node tools/health-dashboard/collector.mjs" })
servherd_start({ name: "health-dashboard", cwd: "<repo>", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} node tools/health-dashboard/server.mjs",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

During development the page runs from Vite (`PORT={{port}}`), proxying `/api` to the server. Both
are local tools: a change goes live with `tools/live.sh health-dashboard <branch>` (an entry in
`tools/live-tools.json`). The page never needs a GitHub token; only the collector reads GitHub,
from `.env`, and it never prints the token.

## 12. Adding a panel later

1. Add a metric: `tools/health-dashboard/metrics/<name>.mjs` exporting `{ name, unit, kind:
"count" | "rate" | "duration" | "stock" | "share", sources, query(from, to, bucket, dims) }`. The
   `kind` picks the rebucketing rule, so a new metric cannot average percentages by mistake.
2. A new source adds a collector task and a `source_heartbeat` entry with its expected interval;
   the age and volume rules then cover it.
3. Place an existing panel component (Tile, Bullet, ChannelTile, TimeChart, Strip, ShareBar,
   Matrix, Table) on an area page. Range, markers, partial buckets, age and status come from the
   frame.
4. Thresholds go in `tools/health-dashboard/config.json`, are printed on the tile, and feed the
   tab status and alerts.
5. A new front-page tile must replace one or close a blind spot no tile covers.

## 13. Decisions

Recorded where the designer's and the engineer's reviews differed or left a choice open.

1. **Front-page runner chart: peak demand with saturated hours.** The designer asked for peak
   demand (running plus queued) against the 60 line; the engineer asked for minutes saturated or
   queued job-minutes per day. Chosen: stacked peak demand with the 60 line, each saturated day
   labeled with its saturated hours. The bar shows how far over the limit demand went; the label
   shows how long, so a one-minute spike and a six-hour episode no longer look alike.
2. **"Already broken on master" becomes the shared rule.** The engineer showed the base commit's
   master test result almost never exists. The owner's five causes stay; that cause is computed
   by the shared rule (3 or more pull requests in 24 hours, or the next full run) and labeled
   "shared". Infrastructure stays separate because its evidence is direct (a lost runner, a 5xx).
3. **Sample data is mostly healthy.** The designer needs the mockup to test whether exceptions
   stand out; the engineer's incidents must still show. The sample has one bad tile (today's
   runner saturation), one warn (the screenshot backlog) and one no-data (nightly), and the
   incidents appear as needs-a-person rows and on the area pages.
4. **One partial treatment.** Bars hollow with a dashed outline, lines a dashed final segment, both
   labeled "partial". A line cannot be hollow, so this is the nearest single rule.
5. **Colors narrowed, not multiplied.** Nine categories cannot each have a unique color-blind-safe
   hue. The claim is narrowed to "the same measure keeps its color", 100% bars carry labels on the
   segments, and only failure causes get hues of their own because they sit beside the phase bar.
6. **The Local page stays.** The engineer offered retiring it; it stays because local-only flakes
   were the largest October finding. `test:changed` and `run-tests.sh` write records, and the
   volume rule shows when they stop.
7. **Alerting is in the first version** (engineer's request): one push after 30 minutes bad, once
   per episode. Grafana remains rejected; this needs no second server.
8. **The visual gate is owner wait,** not a failure, in every metric (engineer). The designer's
   owner-wait phase already assumed it.
9. **The runner tile counts the whole organization,** because the 60-job limit is per
   organization; it is labeled "org".
10. **Every chart follows the picker** (both reviewers): runner demand on the CI page is 672 hourly
    points on 28 d, with no fixed 7-day exception.

## 14. Open questions

1. **Where the page's code lives.** A new workspace package would be versioned and published by
   the release train, and its name is a public contract, so that is the owner's call. Default if
   nobody decides: `tools/health-dashboard/`, with its React and Mantine dependencies in the root
   `devDependencies`.
2. **T4 rate and LLM spend.** Neither is in any source; the config values need figures.
3. **Owner wait split.** Should "owner wait" separate screenshot review from the production go?
