# Pipeline health

A dashboard of how the graphty-monorepo pipeline is doing: master's build, pull requests, CI and its
runners, flaky tests, releases, costs, this machine's local test runs, and whether every data source
is reporting. Every color is judged against an SLA on the last hour; 6 hours is the trend, and 24 hours
the backdrop and the incident list.

- **The page:** https://health.graphty.app (a static site on GitHub Pages).
- **The data:** a public, read-only HTTP API on AWS (this directory's CDK stack).
- **For agents:** a read-only MCP server over the same API.

This directory is a standalone package with its own lockfile. It is not part of the repository's
pnpm workspace, so it is neither an nx project nor released to npm.

| Path      | What it is                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| `infra/`  | The CDK stack (TypeScript)                                                     |
| `src/`    | The Lambda handlers, the data model, the SLA engine and the collector          |
| `config/` | `slas.json`: every member's target and red threshold                           |
| `web/`    | The static dashboard; `web/src/contract.ts` is the shape of every API response |
| `mcp/`    | The stdio MCP server for agents                                                |
| `local/`  | The local collector, which posts this machine's test runs                      |
| `test/`   | The stack, handler, model and SLA tests                                        |

## The dashboard

The page has a left navigation with ten views: an overview, then Master, Pull requests, CI (with
Runners and Local runs under it, and shard times), Flaky tests (with hotspots), Releases, Costs and
Data sources. The range picker is 1 h, 6 h or 24 h (default 1 h); Costs, shard times and flake
hotspots use their own 7 d or 28 d window. A member the backend cannot judge says why instead of
showing a calm zero: NO DATA, not set up, too few samples, or idle. Every row drills down to the
run, pull request or test behind it.

Add `?fixtures` to the page's URL to draw the bundled sample data (`web/fixtures/`) instead of the
API.

## The read API

Base URL: the stack's `ApiUrl` output (today https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com).
Every route is a public `GET` that needs no credentials, answered from precomputed items with
`Cache-Control: max-age=60`, and throttled to 20 requests/s (burst 40). CORS allows
https://health.graphty.app.

| Route                                                | Returns                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `/v1/health`                                         | Whether the API is up                                                |
| `/v1/status`                                         | Each category's state and the last 24 h of episodes                  |
| `/v1/page/overview?range=1h\|6h\|24h`                | The status, with each headline's value and sparkline                 |
| `/v1/page/<page>?range=1h\|6h\|24h`                  | One page: its members (value, SLA, state) and sections               |
| `/v1/page/costs?range=7d\|28d`                       | The Costs page                                                       |
| `/v1/page/<page>/<section>?range=7d\|28d[&kind=...]` | A slow section: `ci/shards` (`kind=full\|pr-bins`), `flaky/hotspots` |
| `/v1/test-history?file=<f>[&test=<t>]&range=7d\|28d` | One test file's (or test's) flaky and failed results                 |
| `/v1/run/<run id>`                                   | One workflow run with its jobs                                       |

`<page>` is one of `master`, `pull-requests`, `ci`, `flaky`, `releases`, `costs`, `data-sources`,
`runners`, `local-runs`. Values are neutral facts (numbers with units, ids, ISO times in UTC, and
`{ code, params }` statements); a missing number is `null`, never 0. The TypeScript types for every
response are in `web/src/contract.ts`, and `apiPath()` there builds every path.

```bash
curl -s https://bsn9dvawxd.execute-api.us-east-2.amazonaws.com/v1/status
```

## The MCP server

`mcp/server.mjs` is a stdio MCP server that reads only the public routes above, so it needs no
credentials. It is registered in the repository's `.mcp.json` as `pipeline-health`:

```json
{ "mcpServers": { "pipeline-health": { "command": "node", "args": ["tools/pipeline-health/mcp/server.mjs"] } } }
```

It needs Node 22.18 or later (it imports `web/src/contract.ts` directly) and the package's
dependencies (`pnpm install --frozen-lockfile` in this directory). `HEALTH_API_URL` points it at
another API; only its origin is used, and the default is the deployed API.

| Tool                                   | Returns                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `health_status()`                      | Each category's state, the member that set it, the others not OK, last 24 h  |
| `category(name, range?)`               | One page: its state, members and sections                                    |
| `master()`                             | Red spans, the full-run verdict, untested age, shared failures with suspects |
| `runners()`                            | Running and queued jobs against the limit, and whether runners are saturated |
| `release_lanes()`                      | The lanes of the newest tested candidate, train attempts, release workflows  |
| `pull_requests(number?, state?)`       | Pull request members and rows, filtered by number or member state            |
| `owner_queue()`                        | Pull requests waiting on the owner (screenshots, owner merges, breaking-go)  |
| `flaky_hotspots(range, level, under?)` | Where flaky failures cluster: group, family, shard, file or test             |
| `test_history(file, test?, range)`     | One test's (or file's) flaky and failed results, newest first                |
| `shard_times(range, kind, shard?)`     | Shard and test-file durations for full runs or pull request bins             |
| `ci_runs(range?)`                      | The CI page: runner wait, first-attempt failures, hangs, reruns, slow shards |
| `run(runId)`                           | One workflow run with its jobs                                               |
| `costs(month?)`                        | The Costs page (the current month)                                           |
| `sources()`                            | Each data source's age and state, and what is not set up                     |

Every result is small JSON: arrays are cut at 50 rows with `truncated: true`, sparklines are dropped,
and each result carries `freshness`, the age of the payload and of every source, with `stale: true`
past its limit. A route that does not answer becomes an error result naming the route. The data is
up to 5 minutes old: treat it as a guide, and confirm a fact on GitHub before acting on it.

## Writing data

Reads are public; writes come from three places.

### CI

A GitHub Actions job posts to `POST /v1/ingest/<kind>` with a GitHub OIDC token as its bearer token.
The job needs `permissions: id-token: write`, and the token's audience must be `graphty-health`:

```bash
TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=graphty-health" | jq -r .value)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  --data @rows.json "$HEALTH_API_URL/v1/ingest/<kind>"
```

The API Gateway JWT authorizer checks the token's signature, issuer
(`https://token.actions.githubusercontent.com`), audience and expiry before any code runs. The ingest
Lambda then checks the `repository_id`, `job_workflow_ref` and `ref` claims against the record kinds
that workflow may write. A body is at most 1 MB (413 past it). Writes are throttled to 50 requests/s
(burst 100). A failed post must never fail the job.

### The collector on AWS

A Lambda runs every 5 minutes from EventBridge Scheduler. It signs in to GitHub as a GitHub App and
reads workflow runs, jobs and steps, pull requests, issues and the release lanes; npm hourly and
billing daily. Then it recomputes the rollups (5 min, 15 min, 1 h and 1 d buckets) and the page items
the read API serves.

### The local collector

`local/collector.mjs` posts this machine's test runs, each record once:

| Source in the main checkout                | Route                        |
| ------------------------------------------ | ---------------------------- |
| `tmp/test-ledger/records/<date>/*.json.gz` | `POST /v1/local/invocations` |
| `tmp/push-log.jsonl` (push gate runs)      | `POST /v1/local/push-runs`   |
| `tmp/waits.jsonl` (test and GPU slots)     | `POST /v1/local/waits`       |

Every body is `{ "rows": [...] }`, at most 500 rows and 1 MB; each row's id comes from its content, so
a retried post is harmless. Host paths, gate logs, working directories and session ids are never
posted. It needs two settings, from the environment or the main checkout's `.env`:

- `HEALTH_API_URL`: the API's base URL (the stack's `ApiUrl`).
- `HEALTH_LOCAL_TOKEN`: the local bearer token. The API keeps only its SHA-256, in the SSM parameter
  `/graphty-health/local-token-sha256`; the `/v1/local/*` routes answer 401 to any other token.

```bash
node tools/pipeline-health/local/collector.mjs --dry-run   # counts and one example per kind
node tools/pipeline-health/local/collector.mjs --once      # post what is new, then exit
node tools/pipeline-health/local/collector.mjs --watch     # post what is new every 60 s
```

Run it under servherd from the main checkout, so it keeps running when worktrees go:

```jsonc
servherd_start({ name: "pipeline-health-local", cwd: "<repo>",
  command: "node tools/pipeline-health/local/collector.mjs --watch" })
```

Its cursor is `tmp/pipeline-health-local/cursor.json` in the main checkout. A failed post logs one
line and leaves the cursor where it was, so the next pass sends the same rows again; delete the
cursor to post everything again.

## Deploying the stack

The stack is `graphty-health` in AWS account 494945606241, Region us-east-2, deployed with the AWS
CLI profile `graphty`:

```bash
cd tools/pipeline-health
pnpm install --frozen-lockfile
pnpm exec cdk bootstrap aws://494945606241/us-east-2 --profile graphty   # once per account
pnpm run deploy                                                          # cdk deploy --profile graphty
aws cloudformation describe-stacks --stack-name graphty-health --profile graphty --region us-east-2 \
  --query "Stacks[0].Outputs" --output table
```

`pnpm run synth` builds the CloudFormation template with no AWS credentials. A local dev server of the
page needs its origin allowed by CORS: `pnpm run deploy -c devOrigin=https://<host>:<port>`.

What it creates:

- DynamoDB table `graphty-health` (on demand, keys `pk`/`sk`, TTL attribute `ttl`, deletion
  protection, retained when the stack is deleted).
- An HTTP API with the read routes, `POST /v1/ingest/{kind}` behind the GitHub OIDC JWT authorizer,
  and `POST /v1/local/{kind}` checked by the local token.
- Lambdas `Ingest`, `Read` and `Collector` (Node 22, arm64), the collector on a 5-minute schedule.
- SNS topic `graphty-health-alarms`, the CloudWatch alarm `graphty-health-collector-dead-man` (no
  successful collector run in 20 minutes), and the AWS Budget `graphty-health`.
- Outputs `ApiUrl`, `TableName` and `TopicArn`.

Subscribe an email address to the topic to receive the alarms:
`aws sns subscribe --topic-arn <TopicArn> --protocol email --notification-endpoint <address> --profile graphty --region us-east-2`.

### SSM parameters

Every secret is an SSM SecureString under `/graphty-health/`; the Lambdas may read only that path.

| Parameter                                    | Used for                                         |
| -------------------------------------------- | ------------------------------------------------ |
| `/graphty-health/local-token-sha256`         | The SHA-256 (hex) of the local collector's token |
| `/graphty-health/github-app/app-id`          | The collector's GitHub App                       |
| `/graphty-health/github-app/installation-id` | The App's installation in graphty-org            |
| `/graphty-health/github-app/private-key`     | The App's private key (PEM)                      |
| `/graphty-health/pushover/app-token`         | Alerts                                           |
| `/graphty-health/pushover/user-key`          | Alerts                                           |
| `/graphty-health/cloudflare/token`           | The Cloudflare line on Costs (optional)          |
| `/graphty-health/cloudflare/account-id`      | The Cloudflare line on Costs (optional)          |
| `/graphty-health/sentry/token`               | The Sentry line on Costs (optional)              |

A member whose parameter is missing shows "not set up" instead of a state.

To set the local token, generate one, keep it in `.env` as `HEALTH_LOCAL_TOKEN`, and store only its
hash:

```bash
aws ssm put-parameter --profile graphty --region us-east-2 --type SecureString --overwrite \
  --name /graphty-health/local-token-sha256 --value "$(printf %s "$HEALTH_LOCAL_TOKEN" | sha256sum | cut -d' ' -f1)"
```

### Spend guards

1. **In code.** Reserved concurrency: `Ingest` 20, `Read` 5, `Collector` 1. API throttles: reads 20
   requests/s (burst 40), writes 50 (burst 100). Bodies up to 1 MB. A daily write budget of 300,000
   rows: each ingest adds its rows to that day's quota item under a condition, and past it writes get
   429 and Data sources turns red.
2. **The AWS Budget `graphty-health`.** 10 USD a month. It notifies the alarm topic at 50% of actual
   and 100% of forecast spend, and at 100% of actual spend its action attaches a deny-all policy to the three Lambda roles, which stops the
   backend until the policy is detached.
3. **The project spend limit,** set by the account owner in the AWS console (20 USD, "stop new
   resource creation" on). Reaching it pauses every resource in the project.

The last two can silence the collector, and with it the dashboard; the dead-man alarm, which runs
outside the collector, emails the topic when that happens.

## Running the tests

```bash
cd tools/pipeline-health
pnpm install --frozen-lockfile
pnpm run typecheck                          # tsc over infra/, src/ and test/
pnpm test                                   # vitest: stack, handlers, model, SLA engine
pnpm run synth                              # the template builds
node --test mcp/server.test.mjs             # the MCP server against a local fake of the API
node --test local/collector.test.mjs        # the local collector
```

The repository's `Pipeline health` workflow (`.github/workflows/pipeline-health.yml`) runs the
type-check, the vitest suite and the synth on every change to this directory.

To run the page locally, start a Vite dev server through servherd (it reads its port from `PORT`):

```jsonc
servherd_start({ name: "pipeline-health-web", cwd: "<repo>",
  command: "pnpm exec vite --config tools/pipeline-health/web/vite.config.ts",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" } })
```

`VITE_HEALTH_API` at build or dev time sets the API base; without it the page draws its fixtures.
