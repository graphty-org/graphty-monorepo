# Pipeline health dashboard

A page served on this machine that shows, on one screen, whether graphty-monorepo's tests, CI,
merges and releases are healthy, and lets the reader drill into any area to find the cause. It is
read by the repository owner and by the agent sessions that keep the pipeline moving.

The mockup is `design/ci/health-dashboard/mockup.html` (open it in a browser; it has no network
dependencies and its numbers are sample data).

## 1. Goal and the blind spots it closes

The goal is one place that answers "is anything in the pipeline unhealthy, and where?" for any
period from the last hour to the last year, with no area that can fail silently.

The pipeline it watches (issue #3418, `design/ci/channels-pipeline.md`):

- Every change is a pull request into master, opened by the agent account `graphty-agent` with
  auto-merge on. A light pull-request check (target 5 to 10 minutes) gates the merge.
- Master is the canary channel (canary.graphty.app). A commit is promoted to nightly
  (nightly.graphty.app, npm tag `next`) when its screenshots are unchanged or the owner approves
  them, and to production (graphty.app, npm tag `latest`) only on the owner's go.
- A full run every 6 hours tests master in full, bisects a failure and reverts the culprit.
- CI time budgets live in `ci-budgets.json`. Intermittent tests are detected and quarantined
  automatically (`tools/test-quarantine.mjs`, `tools/test-quarantine.json`).
- A Cloudflare Worker with a D1 database (the results service, `tools/results-service/`) records
  CI test groups and failures. The local test ledger (`tools/test-ledger.mjs`) records local shard
  runs. The status broker (`tools/pr-status-broker.mjs`) writes every open pull request's state to
  `tmp/pr-status/status.json` once a minute.

Problems seen in October 2026 that nothing showed until a person went looking. Each now has a
panel that turns it into a visible number:

| Problem seen                                                                                                    | What exposes it                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GitHub's 60 concurrent Linux runners were saturated by full-suite runs; queue time, not run time, was the delay | Runner saturation tile (jobs against the 60 limit, longest wait); queue vs run time chart                    |
| A bug on master turned every open pull request red                                                              | Master green time; "open pull requests red on the same check" tile; failure cause "already broken on master" |
| Flaky stories and tests held one merge for five days                                                            | Pull requests blocked by a flake; longest-open pull request; time-in-phase "waiting for a fix"               |
| Most intermittent failures appear only under local machine load, rarely in CI                                   | CI vs local flake rate on one chart; local vs CI disagreement                                                |
| The weekly CPU-restricted stress run failed and filed nothing                                                   | Source strip: every source shows its last write and rows produced; "ran, produced 0" is a warning            |
| Release holds came mostly from outside lanes (LLM regression, T4 GPU, npm listing lag)                          | Release holds tile; hold causes by lane                                                                      |

A blind spot is any part of the pipeline whose failure would leave every panel calm. The design
rule that follows from this: a source that is missing, late or empty is shown as an alarm, never as
zero or as a quiet empty chart (section 6).

## 2. Information architecture

### 2.1 Overview first, then drill down

The structure follows Shneiderman's "overview first, zoom and filter, then details on demand"
(1996), Stephen Few's rule that a dashboard is a single screen read at a glance ("Information
Dashboard Design", 2006), and Grafana's practice of an overview dashboard linking to detail
dashboards.

- **The front page fits one 1440 x 900 screen and never scrolls.** Everything the owner needs to
  decide "fine" or "look closer" is on it. A long scroll hides the bottom of the page, and the
  bottom is where a forgotten problem sits.
- **Six area pages**, one per area of the metric list: Pull requests, CI, Flaky tests, Releases,
  Local, plus Sources (the data health page). Area pages scroll, and run top to bottom in
  pipeline order: pull request, CI, merge, master, canary, nightly, production.
- Every front-page tile and chart is a link to the section of its area page that explains it, with
  the time range carried over. Every table row links out to the pull request, run, issue or test.
- Navigation: a tab bar under the header (Overview, Pull requests, CI, Flaky tests, Releases,
  Local, Sources). Each tab shows a status symbol for the worst tile in its area, so a problem on
  a page nobody opened is still visible from the overview.

Drill-down, not long-scroll, because the six areas have different readers' questions (a merge
delay is a different investigation from a release hold) and because each area page holds tables
and histograms that would push the front page far past one screen.

### 2.2 Front page layout

Tableau's eye-tracking study found first looks land top left and that large numbers draw the eye
about a second sooner, so the urgent, current-state numbers go top left and the trends below.

```
+--------------------------------------------------------------------------------------------+
| Pipeline health   [24h 7d 28d 90d custom] [bucket: auto]  UTC   worst data age 3 min  ...  |
| Overview | Pull requests | CI | Flaky tests | Releases | Local | Sources                    |
+--------------------------------------------------------------------------------------------+
| BAND 1  NOW / HEALTH (status tiles)                                                        |
| [Master green 28d] [Canary] [Nightly] [Production] [Runners now] [Release holds]           |
| [Screenshot backlog] [Open PRs / longest] [Red on same check] [Quarantined]                |
+--------------------------------------------------------------------------------------------+
| BAND 2  TRENDS (small multiples, one shared x-axis, shared event markers)                  |
| master status strip (red spans, reverts, releases)                     | PR time by phase  |
| PRs created vs merged per day                                         | (100% bar)         |
| runner peak (jobs) with 60 line  | queue vs run time p50/p95           | failure by cause  |
| first-attempt pass rate                                               | (100% bar)         |
+--------------------------------------------------------------------------------------------+
| BAND 3  NEEDS A PERSON (table, sorted by age)        | SOURCES (strip of every source)     |
| holds, stuck auto-merge, owner reviews, quarantine >7d| age, last write, rows in range      |
+--------------------------------------------------------------------------------------------+
```

- **Band 1, health tiles (10 tiles in two rows).** The research recommends 5 to 9 headline
  tiles; the owner's "health at a glance" list alone is 5 metrics, the three channels make it 7,
  and three tiles were added because each closes a blind spot from section 1. To keep 10 tiles
  scannable they are grouped: the first row is master and the release channels (state), the
  second row is load and backlog (queues). Healthy tiles are neutral gray; only exceptions get
  color, so a single red tile stands out wherever it sits.
- **Band 2, trends.** Four time charts stacked on one shared x-axis (small multiples), so one
  event (a red master, a saturation episode) lines up vertically across all of them. Two 100%
  stacked bars on the right answer "where does the time go" and "why do pull requests fail" for
  the whole selected range.
- **Band 3, needs a person.** One table of items only a person can resolve, oldest first: open
  release holds, auto-merge armed but stuck, screenshot reviews waiting, quarantined tests past 7
  days, pull requests open past 24 hours. Beside it the source strip.

Everything else (histograms, the flake matrix, per-job budget bullets, DORA metrics, size vs
failure, local vs CI, cost) is on the area pages.

### 2.3 Area pages

Each area page has the same skeleton: a row of the area's KPI tiles (the same component as the
front page), then its time charts on the shared axis, then distributions, then tables sorted by
impact. Pages may scroll. Sections have anchors (`#queue-vs-run`), so a front-page link lands on
the right chart.

| Page          | Top to bottom                                                                                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull requests | KPIs (created, merged, backlog, longest open, median to merge, first-attempt pass, reverts, stuck auto-merge); created vs merged; backlog line; time by phase per day; failure cause per day; time-to-merge histogram; size vs failure rate; agent vs human share; tables: open pull requests, most failed attempts, reverts |
| CI            | KPIs (queue p50/p95, run p50/p95, first-attempt pass, reruns, budget violations, minutes); runner concurrency with the 60 line; queue vs run time; reruns per day; budget bullets per job and per run; queue-time histogram; minutes by workflow and paid GPU/LLM cost; table: slowest jobs against budget                   |
| Flaky tests   | KPIs (new flaky, flake rate CI and local, quarantined and oldest, median detected-to-fixed, resolved, pull requests blocked); newly flaky vs resolved; CI vs local flake rate; flake matrix (tests by day); tables: quarantine with progress to 20 clean runs, tests by pull requests blocked                                |
| Releases      | Channel tiles with the last 14 outcomes; lead time to each channel; release attempts by outcome; hold causes by lane; trigger to success; DORA panel (deployment frequency, lead time, change failure rate, time to restore, rework rate); table: holds                                                                      |
| Local         | KPIs (median local shard time, disagreement rate, gate runs, slot waits); local vs CI time per shard; disagreement split (local fail/CI pass, local pass/CI fail); slot wait time; table: disagreeing shards                                                                                                                 |
| Sources       | Every source with expected interval, last write, rows in range, history start, error; collector status; GitHub REST budget remaining                                                                                                                                                                                         |

## 3. Metrics

Notation. Times are UTC instants. "In range" means the event's time lies in the selected range.
p50 and p95 are computed from raw events in each bucket (never averaged across buckets). Rates
are ratios of sums. Sources: GH-runs and GH-jobs (Actions REST), GH-PR and GH-issue (GraphQL),
broker (`tmp/pr-status/status.json` snapshots), D1 (results service), ledger (test ledger), git,
npm, quarantine (`tools/test-quarantine.json` and `tmp/test-quarantine/state.json`), push log
(`tmp/push-log.jsonl`), waits (`tmp/waits.jsonl`), review records (screenshot review).

Encoding names used below: **tile** (number, sparkline, change against the previous equal range,
status symbol), **bullet** (bar against a limit tick with ok/warn/bad bands), **channel tile**
(state word, version, age, last 14 outcomes as dots), **line** (time series; p50 solid, p95
dashed), **multi-line** (2 to 4 lines, one axis, same unit, labels at the line ends), **stacked**
(stacked bar per bucket), **100% bar** (one bar split into shares), **strip** (state band over
time), **diverging** (inflow up, outflow down), **histogram** (log-spaced bins), **matrix**
(rows = items, columns = time buckets, shade = count), **dot** (p50 dot, p95 whisker, log axis),
**table** (sorted, with a mini-bar column).

### 3.1 Health at a glance

| Metric                              | Definition (formula; unit; source)                                                                                                                                                                                                                                                                                                                                                           | Encoding                                                                                                   | Paired with                                     | Target                                                                                                                             | Drill-down                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Master green time                   | Wall time in the bucket during which master's newest commit was green, divided by wall time in the bucket. Master is red from the completion of a failed required run on a master commit until the completion of a passing one on a later commit. "Required run": the light check on push and the 6-hourly full run. %; GH-runs, git                                                         | Tile with sparkline; strip on band 2 (ranges up to 7 days at minute resolution, beyond that a daily share) | Revert markers and release markers on the strip | 95% (config)                                                                                                                       | Releases page, master strip with each red span linked to its failing run |
| Release status and age, per channel | Per channel (canary, nightly, production): state of the last deploy attempt (ok, failed, held, deploying), the version or commit it serves, its age (now minus deploy time), and commits on master not yet in it. Canary: `deploy-pages.yml` on master. Nightly: D1 `channel_move` and `site`, npm `next`. Production: D1 `site`, npm `latest`, `graphty-site` deploys. h under 72 h, else d | Channel tile x 3                                                                                           | Hold badge on a held channel                    | Canary warn 6 h, bad 24 h; nightly warn 2 d, bad 4 d; production shows commits waiting, no color (promotion is the owner's choice) | Releases page                                                            |
| Runner saturation (now)             | Linux jobs in progress plus queued, against the 60-job concurrency limit; and the longest current wait (now minus `created_at` of the oldest queued job). Jobs; min; GH-runs (queued and in-progress runs), GH-jobs                                                                                                                                                                          | Bullet (bar with a tick at 60) plus "longest wait" number. Never a round gauge (Few)                       | Runner peak chart on band 2                     | Limit 60; wait warn 5 min, bad 15 min                                                                                              | CI page, runner concurrency                                              |
| Runner peak (history)               | Maximum concurrent Linux jobs in the bucket, replayed from every job's `started_at` to `completed_at`; also minutes with 60 running and at least one queued ("saturated minutes"). Jobs; min; GH-jobs                                                                                                                                                                                        | Line of bucket maximum with a fixed line at 60; saturated spans shaded                                     | Queue time chart directly under it              | 60                                                                                                                                 | CI page                                                                  |
| Release holds open                  | Open issues titled "Release held: ..." (count) and the age of the oldest. Count; h/d; GH-issue                                                                                                                                                                                                                                                                                               | Tile; gray at 0, bad when 1 or more                                                                        | Hold table in band 3; hold causes on Releases   | 0                                                                                                                                  | Releases page, holds table                                               |
| Screenshot review backlog           | Changed pictures awaiting the owner's decision in open reviews, and the oldest one's age (now minus when it became reviewable). Count; h/d; review records                                                                                                                                                                                                                                   | Tile: count and oldest age                                                                                 | Owner-wait phase of pull request time           | Oldest warn 24 h, bad 72 h                                                                                                         | Releases page (nightly promotion waits on it)                            |
| Open pull requests and longest open | Open non-draft pull requests (count) and the age of the oldest unmerged one. Count; h/d; broker                                                                                                                                                                                                                                                                                              | Tile: count plus "longest"                                                                                 | Created vs merged chart                         | Soft limit 15; longest warn 24 h, bad 72 h                                                                                         | Pull requests page, open table                                           |
| (added) Red on the same check       | Largest number of open pull requests whose newest run fails the same check name. A shared failure means master or infrastructure, not the changes. Count; broker                                                                                                                                                                                                                             | Tile                                                                                                       | Master strip                                    | Warn 2, bad 3 or more                                                                                                              | CI page, failing checks table                                            |
| (added) Quarantined tests           | Tests on the quarantine list now, and the oldest entry's age. Count; d; quarantine                                                                                                                                                                                                                                                                                                           | Tile                                                                                                       | Flake chart                                     | Oldest warn 7 d, bad 14 d (entries expire at 14)                                                                                   | Flaky tests page                                                         |
| (added) Data sources                | Per source: age of its last write, rows written in range. Section 6                                                                                                                                                                                                                                                                                                                          | Strip in band 3                                                                                            | Header "worst data age"                         | Section 6                                                                                                                          | Sources page                                                             |

### 3.2 Pull request flow

| Metric                             | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Encoding                                                                                                                                  | Paired with                                     | Target                                       | Drill-down                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Created and merged                 | Pull requests into master created in the bucket; merged in the bucket. Count per hour on 24 h, per day beyond; GH-PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Multi-line, 2 lines on one axis                                                                                                           | Each other: a widening gap is a growing backlog | --                                           | PR page                                                           |
| Backlog depth                      | Open non-draft pull requests at the end of the bucket (stock), with the bucket maximum as a light band. Count; GH-PR events replayed (history), broker (now)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Line, its own chart under created vs merged (a stock, not a flow)                                                                         | --                                              | Soft limit 15                                | PR page                                                           |
| Longest-open non-draft             | Max over open non-draft pull requests of (now or bucket end) minus (ready-for-review time, or created time if never a draft). h/d; GH-PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Tile; first row of the open table                                                                                                         | Open table                                      | Warn 24 h, bad 72 h                          | PR page                                                           |
| Time to merge                      | merged_at minus ready time, for pull requests merged in the bucket; p50 and p95. min/h; GH-PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Tile (p50); line p50 and p95; histogram on the PR page                                                                                    | --                                              | p50 60 min                                   | PR page; buckets with n under 5 drawn hollow                      |
| Where the time goes                | For each merged pull request, its open time split into four phases, summed over pull requests merged in range: **runner wait** (jobs queued, none running: union of job queue intervals with no job of that pull request running), **CI running** (at least one job running), **fix wait** (newest check failed and no new commit yet), **owner wait** (green, waiting for a screenshot decision, an approval or a label). Time in none of them (green, auto-merge pending) counts as **merge wait**. h and %; GH-jobs, GH-PR timeline, review records                                                                                                                                                           | 100% bar for the range (front page); stacked bar per day (PR page); a 100% bar per pull request in the open table                         | The four phases keep the same colors everywhere | Warn when runner wait is over 25%            | PR page                                                           |
| Failure rate by cause              | Failed pull-request check attempts in the bucket, each given exactly one cause, in this order: **infrastructure** (job conclusion `startup_failure`, runner lost, timeout cancel, or an annotation naming an outside 5xx); **conflict** (auto-merge disabled with reason merge conflict, or broker `mergeable` = CONFLICTING); **already broken on master** (the same failing tests, or before test-level data the same job, failed on master's run of the base commit); **flaky** (owner's rule: every failing test passed on a rerun of the same commit, or was already flaky or quarantined); **caused by the change** (the rest). Count and % of attempts; GH-jobs, D1 `failure`, GH-PR timeline, quarantine | Stacked bar per day, "caused by the change" at the bottom; 100% bar for the range on the front page; tile: share not caused by the change | Flake-blocked count                             | Non-change causes under 20% of failures      | PR page; before 2026-10-25 classified at job level and labeled so |
| Most failed attempts               | Pull requests ranked by failed check attempts in range, with hours lost (sum of fix-wait time) and a mini bar of causes. Count; h                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Table, top 10                                                                                                                             | --                                              | --                                           | Each row links to the pull request                                |
| Reverts after merge                | Master commits in range whose message starts `Revert "` or that a master-guard or bisect revert made; also as % of merges. Count, %; git                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Tile; triangle markers on every time chart; table                                                                                         | Change failure rate, rework rate                | --                                           | Releases page                                                     |
| (added) Auto-merge armed but stuck | Open pull requests with auto-merge enabled for longer than the limit and not merged. Count; h; broker (needs `autoMergeRequest.enabledAt`, section 7.6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Rows in the needs-a-person table; tile on PR page                                                                                         | Open table                                      | 2 h when every check is green, 6 h otherwise | PR page                                                           |
| (added) Agent vs human             | Author is `graphty-agent` (agent) or anyone else (human). A page-wide filter (All, Agent, Human), never a ranking; the created line can split into two                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Filter; 2-part donut on the PR page (the one pie: two parts only)                                                                         | Every PR chart                                  | --                                           | --                                                                |
| (added) Size vs failure rate       | Merged and closed pull requests in range binned by lines changed (1-10, 11-100, 101-1,000, over 1,000): share whose first attempt failed for "caused by the change". %; n on each bar; GH-PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Bars by bin; bins with n under 10 hollow                                                                                                  | --                                              | --                                           | PR page                                                           |

### 3.3 CI

| Metric                           | Definition                                                                                                                                                                                                                                                                                                        | Encoding                                                                                                | Paired with                             | Target                                                                                          | Drill-down                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Queue time vs run time           | Per job: queue = `started_at` minus `created_at`; run = `completed_at` minus `started_at`. Per run: queue = first job start minus run created; run = last job completion minus first job start. p50 and p95 per bucket, split by run kind (pr, full, release). min; GH-jobs                                       | Multi-line: queue (orange) and run (blue), p50 solid, p95 dashed, one minute axis; histogram on CI page | Runner peak directly above, same x-axis | Run: `run:ci.yml:pr` 20 min; queue p95 5 min                                                    | CI page. GitHub reports only means, so these are computed from job timestamps |
| First-attempt pass rate          | Pull-request check suites whose attempt 1 concluded success, divided by all attempt-1 suites in the bucket. %; GH-runs (`run_attempt`)                                                                                                                                                                            | Tile; line                                                                                              | Reruns per day on the same x-axis       | 85%                                                                                             | CI page                                                                       |
| Budget violations                | For each completed job, run and step with a budget in `ci-budgets.json`: warn when duration is over minutes x `warnRatio`, hang when over minutes x `hangRatio` (and at least `minHangMinutes`). Counts per bucket, per job and per whole run; p95 per job against its budget. Count; min; GH-jobs, D1 `duration` | Stacked bar of warn vs hang; bullet per job (p95 against the budget tick, hang band), sorted by overrun | --                                      | Per entry in `ci-budgets.json`; past jobs are judged against today's file, and the page says so | CI page                                                                       |
| Reruns                           | Run attempts with `run_attempt` over 1 started in the bucket. Count per day; GH-runs                                                                                                                                                                                                                              | Bars                                                                                                    | First-attempt pass rate                 | --                                                                                              | CI page                                                                       |
| (added) CI minutes and paid cost | Sum of job run time per runner label (Linux, macOS, Windows, T4) per workflow; T4 minutes x the configured rate; LLM regression spend from the provider's usage, month to date. min; USD; GH-jobs, config                                                                                                         | Stacked bar of minutes by workflow (top 5 + other); bullet of month-to-date spend                       | --                                      | LLM calls about 60 USD a month; T4 budget from config                                           | CI page                                                                       |

### 3.4 Flaky tests

| Metric                           | Definition                                                                                                                                                                                                                                                                                                                                                          | Encoding                                                                                 | Paired with                               | Target                    | Drill-down                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------- | ----------------------------------------- |
| Newly flaky and resolved         | Newly flaky: tests that entered the flaky state in the bucket (first failure that passed on a rerun of the same inputs, after at least 10 clean runs or none recorded). Resolved: flaky tests that reached 10 consecutive passing runs, or whose issue closed with a fix, in the bucket. Count; D1 `failure`, `quarantine`, ledger, GH-issue (label `intermittent`) | Diverging bars: newly flaky up (orange), resolved down (blue), net line                  | Each other (changes of state, not totals) | Net at or below 0         | Flaky page                                |
| Flake rate, CI and local         | Test runs that failed then passed on the same inputs, per 1,000 test-file runs, separately for CI (D1) and local (ledger). Per 1,000 runs                                                                                                                                                                                                                           | Multi-line, CI and local on one axis; the gap is the signal (load-sensitive tests)       | --                                        | Under 1 per 1,000         | Flaky page                                |
| Flake matrix                     | Top 30 tests by flaky failures in range; columns are buckets; shade is failure count; a quarantine dot on rows quarantined now. Count                                                                                                                                                                                                                               | Matrix (CSS grid)                                                                        | --                                        | --                        | Flaky page; rows link to the test's issue |
| Quarantined now                  | Count, oldest age, and per entry the progress toward 20 consecutive passing gate runs. Count; d; quarantine                                                                                                                                                                                                                                                         | Tile; table with a progress bar                                                          | --                                        | Oldest warn 7 d, bad 14 d | Flaky page                                |
| Detected to fixed                | For flaky issues closed as fixed in the bucket: closed_at minus created_at; p50. Still-open flaky issues counted beside it, not dropped. d; GH-issue                                                                                                                                                                                                                | Tile; weekly line                                                                        | Open count                                | p50 3 d                   | Flaky page                                |
| Pull requests blocked by a flake | Pull requests with at least one failed attempt whose cause is "flaky" (section 3.2), and the hours from that failure to the next green attempt. Count; %; h                                                                                                                                                                                                         | Tile; table of tests sorted by pull requests blocked; the "flaky" share of the cause bar | Failure cause chart                       | 0                         | Flaky page                                |

### 3.5 Releases

| Metric                                        | Definition                                                                                                                                                                                                                                                              | Encoding                                                                  | Paired with                    | Target                                                   | Drill-down    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- | ------------- |
| Last release status                           | The channel tiles of section 3.1, with the last 14 attempt outcomes as dots                                                                                                                                                                                             | Channel tile                                                              | --                             | --                                                       | Releases page |
| Release attempts by outcome                   | `release.yml` attempts that did work, per bucket: passed first time, passed after a retry or rerun, held. Count; %; GH-runs, GH-issue                                                                                                                                   | Stacked bar; tile of first-attempt share                                  | Hold causes                    | 90% first attempt                                        | Releases page |
| Hold causes                                   | "Release held" issues opened in range, by lane in the title: LLM regression, T4 GPU, npm listing, Hosts, suite, version or publish, macOS work protection. Count                                                                                                        | Sorted horizontal bars                                                    | --                             | --                                                       | Hold table    |
| Trigger to success                            | Release run created_at to the success of its last job, for successful attempts; p50 and p95. min/h; GH-runs                                                                                                                                                             | Line                                                                      | --                             | `run:release.yml:full` 75 min                            | Releases page |
| Lead time to each channel                     | For each commit merged to master: time until it is served by canary (deploy completed), nightly (`channel_move` to nightly or npm `next` publish), production (npm `latest` publish or `graphty-site` deploy). p50 and p95 per channel. min to d; git, GH-runs, D1, npm | Dot plot, one row per channel, log axis; small-multiple lines for history | The three channels together    | Canary 30 min; nightly 1 d; production none (owner's go) | Releases page |
| Change failure rate                           | Promotions to a channel in the bucket that were followed by a revert or a fix pull request referencing a master-guard or "Failing on" issue within 7 days, divided by promotions. %; git, GH-issue                                                                      | Weekly line                                                               | Rework rate on the same chart  | Under 15%                                                | Releases page |
| (added) Rework rate (DORA 2024)               | Merges in the bucket that revert or fix a change merged in the previous 7 days (revert commits, and fix commits whose `Fixes`/`Refs` names an issue opened by master-guard, verification or quarantine), divided by merges. %; git                                      | Line on the change failure chart                                          | Change failure rate            | --                                                       | Releases page |
| (added) Deployment frequency, time to restore | Promotions per day per channel; master red span length (p50). DORA's remaining two metrics, read as trends, not targets (dora.dev)                                                                                                                                      | Lines in the DORA panel                                                   | Throughput beside failure rate | --                                                       | Releases page |

### 3.6 Local development

| Metric                  | Definition                                                                                                                                                                                                                                                          | Encoding                                      | Paired with           | Target   | Drill-down                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------- | -------- | --------------------------------------------------------------------------- |
| Local test time         | Per shard: ledger `secs` for local gate and verification runs; p50 per bucket, and whole-gate time from the push log. min; ledger, push log                                                                                                                         | Tile; line; dot plot of local vs CI per shard | CI run time per shard | --       | Local page; per-shard times only from 2026-10-23, whole-gate before         |
| Local disagrees with CI | Pairs of a local and a CI invocation with the same shard variant and inputs key; disagreement = outcomes differ. Split: local fail / CI pass (usually load) and local pass / CI fail (usually environment). %; count; D1 `invocation` kinds `local` and `pr`/`full` | Tile; diverging bars                          | Local flake rate      | Under 2% | Local page; shows "n=x pairs" because pairs are scarce until the gate posts |
| (added) Slot waits      | Time local runs waited for test, browser and GPU slots and the landing lock; p95. min; waits                                                                                                                                                                        | Line                                          | Local test time       | --       | Local page                                                                  |

## 4. Time range and granularity

**One picker drives every panel** (Datadog's global time, Grafana's time picker). Choices: 24 h,
7 d, 28 d (default), 90 d, 12 months, custom. The range and the bucket are kept in the page URL
(`?range=28d&bucket=auto&author=all`), so a link reproduces the view.

| Range     | Default bucket                       | Allowed overrides  |
| --------- | ------------------------------------ | ------------------ |
| 24 h      | 1 hour (strips at minute resolution) | hour               |
| 7 d       | 6 hours (created/merged: 1 hour)     | hour, day          |
| 28 d      | 1 day                                | 6 hours, day, week |
| 90 d      | 1 week                               | day, week          |
| 12 months | 1 month                              | week, month        |

An hour/day/week/month override sits beside the picker; choices finer than a source records are
disabled (daily-only sources cannot show hours).

Rebucketing rules, the same for every chart:

- **Counts** are summed; the axis title names the bucket ("per day").
- **Rates** are ratios of sums over the bucket, never averages of percentages.
- **Durations** are p50 and p95 recomputed from raw events in the bucket. A bucket with fewer
  than 5 events is drawn hollow and its tooltip says n.
- **Stocks** (backlog, quarantine count) show the end-of-bucket value. Where the peak matters
  (runner concurrency, red on the same check) they show the bucket maximum.
- **Time shares** (master green time) are time-weighted: minutes green over minutes in bucket.
- **Tile changes** compare with the previous range of the same length ("vs prior 28 d").
- **"Now" tiles** (runners now, holds open, backlog now) say "now" in their header and ignore the
  picker except for their sparkline.
- Data is stored in UTC. The display time zone is shown in the header (UTC by default, local as an
  option); bucket edges follow the display zone.

**Shared event markers** (Grafana annotations) appear on every time chart: releases per channel
(small diamonds), reverts (triangles), quarantine added or removed (ticks), runner saturation
episodes and master-red spans (shaded vertical bands, so their length shows). Each kind can be
switched off in a marker menu, and each marker links to its run, pull request or issue.

**Pipeline eras.** The four weeks of history span three pipelines. Charts shade them so the
reader does not read a change of process as a change of health:

- to 2026-10-17: one pull request per change, merged by the Mergify queue. Complete history.
- 2026-10-18 to 2026-10-24: golden-local. Changes landed locally into `golden`; no pull requests,
  and master runs only built. Pull request charts show this week as a hatched band labeled
  "golden-local: no pull requests"; master green time shows golden verification instead.
- from 2026-10-25: the channels pipeline. Full history from here.

## 5. Units

- Durations: one unit per axis, chosen from the largest value shown: seconds under 2 minutes,
  minutes under 120, hours under 72, days beyond. The unit is in the axis title, never on every
  tick.
- Rates: "per hour" on the 24 h range, "per day" beyond, "per week" on 90 d, "per month" on
  12 months. Flake rate is always "per 1,000 runs".
- Percentages: whole numbers, one decimal under 10%. The tooltip gives the numerator and
  denominator ("412 of 487").
- Counts of jobs, pull requests, tests: plain integers with thousands separators.
- Money: USD, whole dollars, month to date.
- Sampled values (where a source covers part of the range) show "n=x of y".

## 6. Data age, empty and partial states

The dashboard's main defense against blind spots is that missing data is loud.

- **Every panel shows its source and data age** in its footer ("broker, 1 min").
- **The header shows the worst data age** across all sources, with its status symbol.
- **Per-source limits** (warn at the limit, bad at twice it):

| Source                          | Expected        | Warn   |
| ------------------------------- | --------------- | ------ |
| Status broker                   | every minute    | 5 min  |
| Collector, GitHub runs and jobs | every 5 min     | 15 min |
| Results service (D1)            | every 5 min     | 30 min |
| Test ledger                     | each local run  | 24 h   |
| Quarantine state                | each gate run   | 24 h   |
| npm                             | every 15 min    | 1 h    |
| Weekly stress run               | weekly (Sunday) | 8 d    |
| Host matrix                     | nightly         | 30 h   |
| Release train                   | every 6 h       | 7 h    |

- **A source that cannot be reached shows "no data"** (dash symbol, hatched panel), never 0.
- **A source that ran and produced nothing is a warning**, not calm: the source strip shows rows
  in range, and a run with failing tests that filed no issue (the stress run) shows "ran, 0 filed"
  in warn.
- **The current bucket is unfinished**: drawn dashed and labeled "partial".
- **Before a source's history begins**, the chart is shaded "no history" (for example the
  results service before 2026-10-25, local shard times before 2026-10-23).
- **Golden-local week** is a hatched "no pull requests" band (section 4), not a gap and not zero.
- An empty table says what it is empty of in two or three words ("no open holds").

## 7. Status colors

Status is never shown by color alone (WCAG 2.1 success criterion 1.4.1). Four states, each a
color, a symbol and a word:

| State   | Symbol   | Word    | Color (light and dark)                          |
| ------- | -------- | ------- | ----------------------------------------------- |
| ok      | check    | ok      | neutral gray text, green check only (`#0ca30c`) |
| warn    | triangle | warn    | `#fab219` symbol, dark text                     |
| bad     | X        | bad     | `#d03b3b`                                       |
| no data | dash     | no data | gray, hatched panel                             |

- Healthy tiles stay neutral (gray border, primary ink); a warn or bad tile gets a colored
  left border, symbol and word. Exceptions stand out because nothing else is colored.
- Red is reserved for "bad". Chart series use the categorical palette in fixed order, blue then
  orange then aqua (validated for color-blind separation as a set of three): blue = run time,
  merged, resolved, CI; orange = queue time, created, newly flaky, local. A series keeps its color
  on every chart and page.
- Every threshold that colors a tile is printed on the tile ("target 95%") or in its tooltip.
- Lines are 2 px, p95 dashed; light and dark mode each have their own steps of the same hues
  (dark mode follows the system and compact-mantine's color scheme).
- A tooltip gives exact values; every chart has a "table" toggle that shows its data as rows, which
  is also the screen-reader path (the image role plus hidden table pattern of compact-mantine's
  `ChartRow`).

## 8. Chart library

**Choice: a React + Vite page using compact-mantine for layout, tables and controls, and
`@mantine/charts` (MIT, built on Recharts) for charts.**

- Pin `@mantine/charts` to 8.3.18, the `@mantine/core` version the repository already installs.
  Its peer requirement is `recharts >=2.13.3`; use Recharts 2.15.x. Mantine 9 requires
  Recharts 3.2.1 or newer, so both move together later. The first build step is a one-chart trial
  render that confirms 8.3.18 with Recharts 2.15.
- **Already in the stack.** The repository uses React 19 and Mantine 8.3.18; no chart library is
  installed anywhere, so any choice adds a dependency, and this adds the fewest pieces.
- **Theming is free.** Colors, density and dark mode come from compact-mantine; every other
  library needs its colors mapped by hand for light and dark.
- **Building blocks exist.** `compact-mantine/src/components/rows/ChartRow.tsx` has sparkline,
  histogram and metric rows with an accessible pattern; `compact-mantine/src/components/DataTable/`
  covers the tables; `@mantine/core` has `Progress` (bullet bars) and `SegmentedControl` (the
  time picker).
- **Coverage.** Line and multi-line series, stacked and 100% bars, stacked areas, sparklines,
  donuts. The data is small: 28 days of hourly points is 672 per series, easy for SVG.
- **Gaps and how they are covered:** the flake matrix (tests by day) is a CSS grid of cells
  (Mantine's `Heatmap` only draws a date calendar); the runner bullet is a `Progress` bar with a
  marker at 60; p50 and p95 are two lines. Status strips are a row of absolutely positioned
  divs. All are plain components in the page, no new library.
- **One y-axis per chart.** Recharts supports a second axis; the dashboard never uses it. Two
  measures of different scale are two charts on the shared x-axis.

Runners-up:

1. **Apache ECharts 6** (Apache-2.0): the escape hatch, added for one chart if one ever outgrows
   Recharts (a zoomable matrix, series over 10,000 points, linked zoom). Not the main library:
   its configuration sits outside JSX, it needs a hand-mapped theme, and its canvas is opaque to
   screen readers and to screenshot review.
2. **Grafana** (AGPL-3.0, fed from SQLite): gives a time picker and alerting for free, but is a
   second server with its own look, so the compact UI rules cannot apply, and it cannot read D1
   directly. Worth reconsidering only if alerting becomes the main need.

Rejected: Chart.js and uPlot (canvas, weak React support; uPlot draws only time series and has one
maintainer); Observable Plot and Vega-Lite (render outside React, own theming; Vega-Lite is the
heaviest); Tremor (Tailwind, clashes with Mantine; npm package not updated since January 2025);
Evidence.dev and Metabase (business-intelligence tools with their own server or build step).

## 9. Data design

### 9.1 Two raw stores, one read model

- **D1 (cloud, the results service)** holds what CI writes about itself: test groups
  (`invocation`), per-file runs (`file_run`), failures with retries (`failure`), `quarantine`,
  `tracked_issue`, `duration`, `site`, `verdict`, `channel_move`. Its tables exist; what is missing
  is the writers (section 9.6) and a read endpoint.
- **Local SQLite, `tmp/health-dashboard/health.db`** (`node:sqlite`), is the dashboard's only
  read model. It holds GitHub runs, jobs and steps, pull requests with their timeline events,
  issues, npm publish times, git events (master first-parent commits, reverts, tags), broker
  change snapshots, local file imports (push log, waits, quarantine, review records), and mirrors
  of the D1 rows. The test ledger's SQLite index is attached read-only. Every GitHub row can be
  rebuilt from GitHub, so the file is a cache; the broker snapshots and local imports are the only
  data that exists nowhere else, and they are also exported daily as JSON lines under
  `tmp/health-dashboard/archive/`.

Main tables (all times as UTC milliseconds):

| Table              | Key              | Columns                                                                                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `run`              | run id, attempt  | workflow, event, branch, sha, pr, created, started, updated, conclusion, kind (pr, pr-wide, full, release, deploy, other) |
| `job`              | job id           | run id, attempt, name, labels, runner class (linux, macos, windows, t4), created, started, completed, conclusion          |
| `step`             | job id, number   | name, started, completed, conclusion                                                                                      |
| `pr`               | number           | author, agent (bool), created, ready, merged, closed, additions, deletions, base                                          |
| `pr_event`         | pr, time, kind   | ready, auto-merge enabled/disabled (reason), labeled, head pushed, review requested                                       |
| `issue`            | number           | kind (hold, intermittent, critical, master-guard, failing-on), lane, created, closed, close reason                        |
| `git_event`        | sha              | time, kind (merge, revert, tag, fix), pr, reverted sha                                                                    |
| `npm_publish`      | package, version | time, dist-tag                                                                                                            |
| `broker_change`    | time, pr         | changed fields only (mergeable, rollup, auto-merge, labels, draft)                                                        |
| `source_heartbeat` | source, time     | rows written, error                                                                                                       |
| `d1_<table>`       | as in D1         | mirrored rows                                                                                                             |

### 9.2 The collector

One servherd process, `health-collector` (`tools/health-dashboard/collector.mjs`), cursors in
`health.db`:

- Every minute: diff the broker file into `broker_change`; tail the push log, waits, quarantine
  state and review records.
- Every 5 minutes: queued and in-progress runs (2 REST calls, which feed "runners now"); new
  runs since the cursor and the jobs of runs completed since, with ETags (an unchanged answer
  costs no budget); one GraphQL query for pull requests and issues `updated:>=` the cursor; D1
  rows since its cursor.
- Every 15 minutes: `npm view <pkg> time dist-tags` for the 13 packages (no GitHub budget).
- It never polls per pull request, and it stops REST calls while the shared budget is under 1,500
  remaining (`gh api rate_limit` costs nothing), so it can never starve landing or CI tools.
  Steady state is about 40 REST calls an hour.

### 9.3 The four-week backfill

`tools/health-dashboard/backfill.mjs --since 2026-09-27`, resumable from a cursor:

- Run lists: about 250 REST calls (a filtered list caps at 1,000 runs, and the repository makes
  550 to 1,300 a day, so it slices by day or hour).
- Jobs: about 8,000 to 9,000 calls (`jobs?filter=all`, every attempt), only for multi-job
  workflows; skipped runs and single-job bookkeeping workflows (release watch, master guard)
  keep only their run row.
- Pull requests and issues: about 80 GraphQL queries, under 1,000 points (1,926 pull requests
  created since 2026-09-27, 116 intermittent issues, 20 release holds).
- Git and npm locally and without budget.
- Throttled to 1,200 REST calls an hour, so it finishes in about 8 hours, overnight, leaving the
  rest of the 5,000 hourly budget to everything else.
- JUnit artifacts are not downloaded (one call per artifact plus bandwidth, and they expire at
  90 days); test-level history before 2026-10-25 comes only from the ledger and from issues.

What the four weeks can and cannot recover:

| Recoverable for all four weeks                                                                                                                                                                                               | Gaps                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Holds, runner saturation, queue vs run time, first-attempt pass rate, reruns, budgets (judged against today's file), pull request flow, reverts, release first attempt, lead time to canary and npm, flaky detected-to-fixed | Master green time in golden-local week (golden verification shown instead); nightly and production status and lead time to nightly (nothing until `channel_move`, `verdict`, `site` are written); failure cause and flake rate at test level (job level before 2026-10-25); conflicts over time (only broker snapshots from now); local vs CI disagreement (almost no pairs); local per-shard time (from 2026-10-23); GPU cost (needs a configured rate) |

### 9.4 Rollups

Computed on read: `GET /api/metric/<name>?from=&to=&bucket=&dims=` runs one SQL query over raw
rows, buckets by time, and computes p50 and p95 in JavaScript. 13 months of raw rows is small
enough (about 40 MB a month) that a materialized rollup table is added only if month views prove
slow. Responses are cached for 60 s. Each answer carries `{ series, n, partialFrom, noHistoryBefore,
sourceAge }`, so every panel can draw its partial bucket, history start and data age without
knowing the source.

### 9.5 Retention

- Local raw tables: 13 months (a year plus the comparison month).
- D1 `failure` and `invocation`: 13 months; `file_run` (the largest): 90 days; release tables
  (`site`, `verdict`, `channel_move`): kept for good.
- The ledger's prune must keep 13 months (today it may keep less; change its default).

### 9.6 Additive changes needed elsewhere, and what must start recording now

Non-breaking additions (decided here; no consumer breaks):

- Results service: `GET /v1/export?table=<t>&since=<ms>` (paged, read token). Without it the
  dashboard cannot read test failures, quarantine, verdicts or channel moves.
- Status broker: add `createdAt`, `autoMergeRequest.enabledAt`, `additions`, `deletions` to each
  pull request.

Start recording now, because each day not recorded is history lost for good:

- Broker change snapshots (the collector's first job; conflicts have no other history).
- Every CI test group and its retry, posted to D1 (`ci/3429-results-wiring`).
- Local gate shards posted to D1 as kind `local`, with the same variant and inputs keys as CI.
- `site`, `verdict` and `channel_move` from `release.yml` and `deploy-pages.yml`.
- Screenshot review events: became reviewable, decided.
- The weekly stress run as kind `stress`, with the issues it filed.
- A config value for the T4 rate (USD per minute) and the monthly LLM budget, in
  `tools/health-dashboard/config.json`.

## 10. Serving it locally

The page and its API are one Node server, `tools/health-dashboard/server.mjs`: it serves the
built page and the `/api/metric/*` endpoints from `health.db`. Both processes run under servherd,
which assigns the port:

```jsonc
servherd_start({ name: "health-collector", cwd: "<repo>",
  command: "node tools/health-dashboard/collector.mjs" })
servherd_start({ name: "health-dashboard", cwd: "<repo>", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} node tools/health-dashboard/server.mjs",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

During development the page runs from Vite (`npm run dev` with `PORT={{port}}`), proxying `/api` to
the server. Both are local tools, so a change goes live with `tools/live.sh health-dashboard
<branch>` (an entry in `tools/live-tools.json`) as soon as it is committed. The page never needs a
GitHub token: only the collector reads GitHub, from `.env`, and it never prints the token.

## 11. Adding a panel later

1. Add a metric: one file `tools/health-dashboard/metrics/<name>.mjs` exporting
   `{ name, unit, kind: "count" | "rate" | "duration" | "stock" | "share", sources, query(from,
to, bucket, dims) }`. The `kind` picks the rebucketing rule of section 4, so a new metric cannot
   average percentages by mistake.
2. If it needs a new source, add a collector task and a `source_heartbeat` entry with its
   expected interval; the source strip and the age rules then cover it with no extra code.
3. Add the panel: place one of the existing panel components (Tile, Bullet, ChannelTile,
   TimeChart, Strip, ShareBar, Matrix, Table) on an area page with the metric's name. Time range,
   markers, partial buckets, data age and status come from the frame.
4. Thresholds go in `tools/health-dashboard/config.json`, never in the component, and are
   printed on the tile.
5. A new front-page tile must replace one or prove it closes a blind spot no tile covers; the front
   page stays one screen.

## 12. Open questions

1. **Where the page's code lives.** A new workspace package would be versioned and published by
   the release train (the repository keeps no private packages), and its name is a public
   contract, so that is the owner's call. Default if nobody decides: code under
   `tools/health-dashboard/`, with its React and Mantine dependencies added to the root
   `devDependencies`, not a package.
2. **Alerting.** The dashboard shows problems but notifies nobody. A later collector task could
   push a phone notification when a tile turns bad for longer than a set time.
3. **T4 rate and LLM spend.** Neither is in any source; the config values need a figure.
4. **Master green definition in golden-local week.** Shown as golden verification; acceptable as
   history, or hide master green time for that week?
5. **Owner wait split.** Should "owner wait" separate screenshot review from the production go,
   or are both one phase?
