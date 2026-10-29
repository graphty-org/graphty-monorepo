# Pipeline health

The pipeline health dashboard shows how the graphty-monorepo build and release pipeline is doing right
now: whether master builds, how long pull requests take, how CI and its runners behave, which tests are
flaky, whether releases go out, what it all costs, what the maintainers' own machine is running, and
whether every data source is still reporting.

- **The page:** https://health.graphty.app
- **The data:** a public, read-only HTTP API (see "The read API").
- **For agents:** a read-only MCP server over the same API (see "The MCP server").

Everything here is read-only and public: the page and the API need no login, and nothing they show is
secret (runs, pull requests, test names and truncated failure messages are already public on GitHub).

## Reading the page

### Pages

A left navigation lists the overview and seven categories. Each category link carries a colored bar
with that category's state, so every page repeats the status line.

| Page          | What it shows                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview      | Each category's state, the member that set it, the headline measures with sparklines, and the incidents of the last 24 hours.                                                                                                                                                                                                                         |
| Master        | A minute-by-minute strip of master's builds, red spans with their cause and fix, and failures shared by several pull requests with suspect merges.                                                                                                                                                                                                    |
| Pull requests | Where the time to merge goes (waiting for runners, checks, red and fixing, merging), and "Waiting on the owner".                                                                                                                                                                                                                                      |
| CI            | Why first attempts failed (shared, the change, flaky, infrastructure), hangs, reruns; **Runner-minutes per merge** by run kind; **Shard times**: median and p90 per shard against budget; **Chronically failing jobs**, gating or not; **Allowed to fail, and failing**: each non-gating job's pass rate; and **Benchmarks**: each benchmark's trend. |
| Runners       | Running and queued jobs against the runner limit, who holds the runners, runs queued with no job, superseded runs still running. Under CI.                                                                                                                                                                                                            |
| Local runs    | Test runs on the maintainers' machine: gate runs, local shard times, test-slot waits, local vs CI disagreement. Never judged. Under CI.                                                                                                                                                                                                               |
| Flaky tests   | **Hotspots**: where flaky failures cluster (group, family, shard, file, test, per 1,000 runs); **Quarantine**: the quarantine entries, if any.                                                                                                                                                                                                        |
| Releases      | The lanes of the newest tested release candidate, every train attempt (including skipped ones), and the release workflows.                                                                                                                                                                                                                            |
| Costs         | Money spent this month against budget, the projection to month-end, unit costs and spend by workflow. The LLM regression line is an estimate of CI's Gemini spend only (see "The LLM regression line").                                                                                                                                               |
| Data sources  | Each source's last write, its age limit, volume and last error; then "Not set up": what has no writer or token yet, and what unblocks it.                                                                                                                                                                                                             |

Every row with a chevron drills down: to the run with its jobs, the pull request, or a test's history
(its flaky and failed results, newest first). The page, section and range are in the URL
(`#/ci/runners?range=6h`), so a link reproduces the view. The page reloads its data every 60 seconds
and says so in red when the data is over 15 minutes old. Times are UTC.

### Time picker

The picker on the overview and every category page is **1 h, 6 h or 24 h, default 1 h**. It sets the
window of the values, tables and counts on the page. It never changes a color: states are always judged
on the **last hour** (5-minute buckets), with the 6 h value (15-minute buckets) beside each one as the
trend. For noisy rates, red also needs the 6 h value past the threshold. 24 h is only the backdrop: the
faint part of each sparkline and the incident list.

Costs, Shard times and Hotspots are slow measures with their own **7 d / 28 d** choice; they never set a
category's color.

### Colors and gray states

Green is on target, yellow between target and threshold, red past the threshold. Gray always means "the
dashboard cannot judge this", never "all is well":

| Label             | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| NO DATA           | The source stopped writing or failed; drawn hatched, never as 0.                       |
| not set up        | The member has no writer or token yet; Data sources says what unblocks it.             |
| too few, n=X of Y | Fewer samples in the hour than the member's minimum; its 6 h value is shown beside it. |
| partial window    | The source's history covers only part of the window.                                   |
| IDLE              | Nothing happened that the member measures (for example, no local runs).                |
| slow measure      | A 7 d or 28 d value, shown but never judged.                                           |

Add `?fixtures` to the page URL (before the `#`) to draw the bundled sample data in `web/fixtures/`
instead of the live API; `?fixtures=gray` and `?fixtures=stale` show the gray and stale scenarios. A
FIXTURE DATA banner says when sample data is on screen. Fixtures work in the dev server and in a build made
with `VITE_HEALTH_FIXTURES=1`; the published page has none and ignores `?fixtures`.

## The read API

Base URL: the `ApiUrl` output of the `graphty-health` stack, today
https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com. Every route is a public `GET`, cached for 60
seconds and throttled (20 requests/s, burst 40). CORS allows https://health.graphty.app.

| Route                                                 | Returns                                                |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `/v1/health`                                          | Whether the API is up                                  |
| `/v1/status`                                          | Each category's state and the last 24 h of episodes    |
| `/v1/page/overview?range=1h\|6h\|24h`                 | The status, with each headline's value and sparkline   |
| `/v1/page/<page>?range=1h\|6h\|24h`                   | One page: its members (value, SLA, state) and sections |
| `/v1/page/costs?range=7d\|28d`                        | The Costs page                                         |
| `/v1/page/ci/shards?range=7d\|28d&kind=full\|pr-bins` | Shard times, for full runs or pull request runs        |
| `/v1/page/flaky/hotspots?range=7d\|28d`               | Flake hotspots                                         |
| `/v1/test-history?file=<f>[&test=<t>]&range=7d\|28d`  | One test file's (or test's) flaky and failed results   |
| `/v1/run/<run id>`                                    | One workflow run with its jobs                         |

`<page>` is `master`, `pull-requests`, `ci`, `runners`, `flaky`, `releases`, `data-sources` or
`local-runs`. The range defaults to `1h` (`7d` for Costs and the slow sections). A view with nothing
computed yet answers 503 `{"code": "no_data"}`.

Values are neutral facts: numbers with units, ids, ISO times in UTC, and `{ code, params }` statements
that the page turns into words. A missing number is `null`, never 0. The TypeScript types of every
response are in [`web/src/contract.ts`](web/src/contract.ts), whose `apiPath()` builds every path.

```bash
curl -s https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/status
```

## The MCP server

[`mcp/server.mjs`](mcp/server.mjs) is a stdio MCP server that reads only the public routes above, so it
needs no credentials. The repository's root [`.mcp.json`](../../.mcp.json) registers it as
`pipeline-health` through [`mcp/start.mjs`](mcp/start.mjs):

```json
{ "mcpServers": { "pipeline-health": { "command": "node", "args": ["tools/pipeline-health/mcp/start.mjs"] } } }
```

It needs Node 22.18 or later and this package's dependencies, which `start.mjs` installs
(`pnpm install --frozen-lockfile` in this directory, output on stderr) the first time a checkout runs it. `HEALTH_API_URL` points it at another API (only its origin is used).

| Tool                                     | Returns                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `health_status()`                        | Each category's state, the member that set it, the others not OK, and the last 24 h    |
| `category(name, range?)`                 | One page: its state, members and sections                                              |
| `master(range?)`                         | Red spans, the full-run verdict, untested age, shared failures with suspects           |
| `runners(range?)`                        | Running and queued jobs against the limit, who holds the runners, saturation           |
| `release_lanes()`                        | The lanes of the newest tested candidate, train attempts and release workflows         |
| `pull_requests(number?, state?, range?)` | Pull request members and rows, filtered to one pull request or one member state        |
| `owner_queue()`                          | Pull requests waiting on the owner (screenshots, owner merges, `breaking-go`), and why |
| `flaky_hotspots(range?, level?, under?)` | Flake hotspots at one level (group, family, shard, file, test), worst first            |
| `test_history(file, test?, range?)`      | One test's (or file's) flaky and failed results, newest first                          |
| `shard_times(range?, kind?, shard?)`     | Shard median and p90 against budget, with top files, for `full` runs or `pr-bins`      |
| `ci_runs(range?)`                        | The CI page: runner wait, first-attempt failures and causes, hangs, reruns             |
| `run(runId)`                             | One workflow run with its jobs                                                         |
| `costs(month?)`                          | The Costs page; only the current month is served                                       |
| `sources()`                              | Each data source's last write, limit and state, and what is not set up                 |

Every result is small JSON: arrays are cut at 50 rows with `truncated: true`, sparklines are dropped,
and each result carries `freshness` (the age of the payload and of every source, with `stale: true` past
its limit). A route that does not answer becomes an error result naming the route. The data is up to 5
minutes old: confirm a fact on GitHub before acting on it.

## Where the data comes from

Three writers fill the backend; the page and the MCP server only read.

### The collector on AWS

A Lambda runs every 5 minutes. It signs in to GitHub as the read-only GitHub App
`graphty-pipeline-health` and reads workflow runs, jobs and steps, the jobs of every unfinished run,
pull requests, issues, master's state and the release lanes (from `release.yml`'s job results). Hourly
it reads the weekly stress run, the host matrix, npm and Coveralls; daily the money lines (AWS Cost
Explorer plus the rates in `config/rates.json`). Then it recomputes the 5-minute, 15-minute, hourly and
daily rollups and the page items the API serves, and sends the Pushover alerts.

Until the App's parameters are in SSM (below), the GitHub sources show "not set up" on Data sources.

### CI

CI posts test results through [`tools/results/client.mjs`](../results/client.mjs): when the repository
variable `HEALTH_API_URL` is set, every record it sends to the results service is also sent to the
health API, fire and forget (2 seconds at most; a failed post never fails a job). The routes are
`POST /v1/invocations`, `/v1/failures`, `/v1/durations` and `/v1/verdicts`, with the results service's
own bodies. The benchmark jobs (ci.yml's Performance Benchmarks, gpu.yml's T4 lane) post their numbers to
`POST /v1/benchmarks` through [`tools/results/post-benchmarks.mjs`](../results/post-benchmarks.mjs), which the
API takes only from master's workflows.

Each post carries a GitHub OIDC token with audience `graphty-health`, so the job needs
`permissions: id-token: write`. The API's JWT authorizer checks the token's signature, issuer
(`https://token.actions.githubusercontent.com`), audience and expiry; the ingest Lambda then checks
the `repository`, `repository_id`, `job_workflow_ref` and `ref` claims against what that workflow may
write (pull request runs, or the listed workflows on master). A body is at most 1 MB.

### The local collector

[`local/collector.mjs`](local/collector.mjs) posts this machine's test runs, each record once:

| Source in the main checkout                | Route                        |
| ------------------------------------------ | ---------------------------- |
| `tmp/test-ledger/records/<date>/*.json.gz` | `POST /v1/local/invocations` |
| `tmp/push-log.jsonl` (push gate runs)      | `POST /v1/local/push-runs`   |
| `tmp/waits.jsonl` (test and GPU slots)     | `POST /v1/local/waits`       |

Host paths, gate logs, working directories and session ids are never posted. Every row has an id from
its content, so a retried post is harmless.

**The local token.** The `/v1/local/*` routes take a bearer token that the API knows only by its
SHA-256, kept in SSM as `/graphty-health/local-token-sha256`; any other token gets 401. Generate a
token, keep it in the main checkout's `.env` as `HEALTH_LOCAL_TOKEN` (or in the environment), and store
only its hash:

```bash
aws ssm put-parameter --profile graphty --region us-east-2 --type SecureString --overwrite \
  --name /graphty-health/local-token-sha256 --value "$(printf %s "$HEALTH_LOCAL_TOKEN" | sha256sum | cut -d' ' -f1)"
```

It also needs `HEALTH_API_URL` (the API's base URL), from the environment or `.env`.

```bash
node tools/pipeline-health/local/collector.mjs --dry-run   # counts and one example per kind, posts nothing
node tools/pipeline-health/local/collector.mjs --once      # post what is new, then exit
node tools/pipeline-health/local/collector.mjs --watch     # post what is new every 60 s
```

It runs under servherd from its live copy, the worktree `.worktrees/pipeline-health-local-live`, reading the
main checkout's `tmp/` (`--root`). `tools/live.sh pipeline-health-local <branch-or-commit>` merges a change into
that copy, runs `local/collector.test.mjs` and restarts the server (`tools/live-tools.json`):

```jsonc
servherd_start({ name: "pipeline-health-local", cwd: "<repo>/.worktrees/pipeline-health-local-live",
  command: "node tools/pipeline-health/local/collector.mjs --watch --root <repo>",
  env: { HEALTH_API_URL: "https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com" } })
```

The token is `HEALTH_LOCAL_TOKEN`, from the server's environment or else the main checkout's `.env` (never printed).

Its cursor is `tmp/pipeline-health-local/cursor.json` in the main checkout. A failed post logs one line
and keeps the cursor, so the next pass sends the same rows; delete the cursor to post everything again.

## Configuration

- [`config/slas.json`](config/slas.json): every member's target (`ok`) and red threshold (`fail`), its
  window, its minimum samples (`minN`), each data source's age limit, the runner limits, the pull
  request budgets and the daily write budget. Change a threshold here, not in code.
- [`config/rates.json`](config/rates.json): the money rates for Costs (T4 minutes, paid LLM runs, fixed
  monthly plans, Actions list prices), each with the date it was checked. A `null` rate shows NO DATA.
- SSM SecureStrings under `/graphty-health/`, read by the Lambdas. A member whose parameter is missing
  shows "not set up":

| Parameter                                                             | Used for                                       |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| `/graphty-health/github-app/app-id`, `installation-id`, `private-key` | The collector's GitHub App                     |
| `/graphty-health/local-token-sha256`                                  | The local collector's token (its SHA-256, hex) |
| `/graphty-health/pushover/app-token`, `user-key`                      | Alerts                                         |
| `/graphty-health/cloudflare/token`, `account-id`                      | The Cloudflare line on Costs (optional)        |
| `/graphty-health/sentry/token`                                        | The Sentry line on Costs (optional)            |

**When everything goes dark.** The backend stops itself before it costs money: a daily write budget
(past it, writes get 429 and Data sources turns red), a 10 USD monthly AWS Budget whose action denies
the Lambdas at 100%, and the AWS project's own spend limit. Any of them silences the collector; the
CloudWatch alarm `graphty-health-collector-dead-man` (no successful collector run in 20 minutes) emails
the SNS topic `graphty-health-alarms` when that happens.

## The LLM regression line

The Costs page's LLM regression line (`costs.llm`) estimates what CI spends on Gemini; it is not the Google bill. It
counts every paid step -- release.yml's `LLM regression tests` step, and the `Run the failing files` step of each
point of a bisect of the llm lane (bisect.yml's run name `Bisect (llm lane)`) -- with a passed, failed or cancelled
conclusion, at a flat 0.94 USD each (`config/rates.json`, measured 2026-10-12 at about 194 calls of 0.00485 USD).
Local runs with the same key and any other use of the Google project are not counted. The member's value is the
projection to month-end; the money table shows the spend so far beside it.

## Backfill

To load the last 28 days of flaky tests, runs, jobs, pull requests and issues (it needs the GitHub App's
parameters):

```bash
aws lambda invoke --profile graphty --region us-east-2 --function-name graphty-health-backfill \
    --cli-binary-format raw-in-base64-out --payload '{"mode":"backfill","days":28}' /dev/stdout
```

The backfill also records each job's run kind, which "Runner-minutes per merge" needs: jobs stored before it was
recorded are left out of that measure until a backfill rewrites them.

Each call works for up to 15 minutes and answers `{"done": false, ...}` until the range is loaded;
invoke it again and it continues from its cursor. `AWS_PROFILE=graphty AWS_REGION=us-east-2 pnpm run
backfill -- --days 28` runs the same from a workstation. `-- --repair-days 2026-10-09,2026-10-11
--repair-workflows release.yml,bisect.yml` re-reads only those days' runs of those workflows, whatever the cursors
say: a backfill made before days were read an hour at a time kept only the newest 1,000 runs of a busier day. The
Lambda takes the same as `"repair": {"days": [...], "workflows": [...]}` in its payload.

It loads newest first, so a call that stops early has loaded the most recent days. Flaky tests come first:
each warning annotation `[FLAKY]`, `[FLAKY-UNRELATED]` or `[QUARANTINED] ... failed and passed` that the test
shards leave on their check runs (the `Test`, `Story tests` and `Restricted CPU` jobs) becomes the same row the
live feed writes for that test, and a row already there is left alone. CI prints those annotations since
2026-10-22, when the quarantine began, so the flaky history starts then. Then runs and jobs from yesterday back,
then pull requests and issues.

## Running the tests and the page

```bash
cd tools/pipeline-health
pnpm install --frozen-lockfile
npx tsc --noEmit                         # infra/, src/ and test/
npx tsc --noEmit -p web                  # the page
npx vitest run                           # stack, handlers, model, SLA engine, views
node --test mcp/server.test.mjs          # the MCP server against a local fake of the API
node --test local/collector.test.mjs     # the local collector
pnpm run synth                           # the CloudFormation template builds, no credentials needed
```

The repository's `Pipeline health` workflow runs the type-check, the vitest suite and the synth on every
change to this directory.

To run the page locally, start a Vite dev server through servherd:

```jsonc
servherd_start({ name: "pipeline-health-web", cwd: "<repo>",
  command: "pnpm exec vite --config tools/pipeline-health/web/vite.config.ts",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

`VITE_HEALTH_API_URL` sets the API it reads (unset: the live API). The live API allows CORS only from
health.graphty.app and `http://localhost:5173`, so on any other origin use `?fixtures`.

## Deployment

Two CDK stacks in AWS account 494945606241, Region us-east-2: `graphty-health` (the table, API, Lambdas,
schedule, alarms and Budget) and `graphty-health-deploy` (a CodeBuild project that deploys
`graphty-health` on every master push touching this directory; the build deploys only `graphty-health`, so a
change to `infra/deploy-stack.ts` itself takes effect after `npx cdk deploy graphty-health-deploy --profile
graphty`). The page is published to
https://health.graphty.app by `.github/workflows/pipeline-health-pages.yml`.
