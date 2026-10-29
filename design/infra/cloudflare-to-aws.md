# Moving the Cloudflare services to AWS

Issue #4488. Owner decision of 2026-10-25: AWS is this repository's single backend, so the three services
that run on Cloudflare today move to the AWS project that already runs the pipeline health dashboard
(account 494945606241, Region us-east-2).

What runs on Cloudflare today (all in one account, deployed by `.github/workflows/results-service.yml`):

- **Results store `graphty-results`**: `tools/results-service/`. Back: D1 database, 12 tables.
- **Release scheduler**: `tools/release-scheduler/`. Back: none (3 secrets).
- **nx remote cache `graphty-nx-cache`**: `tools/nx-cache-worker/`. Back: R2 bucket, objects expire after 14 days.

DNS (Zonomi) and every graphty.app site (GitHub Pages) are not on Cloudflare and do not move.

## Summary

- **Results store**: one Lambda behind a Lambda Function URL, one DynamoDB table, one S3 bucket. The
  Worker's code (`service.js`, `queries.js`, `signature.js`) runs unchanged on Lambda: each request builds
  an in-memory SQLite database from the existing migrations, loads the rows that request needs from
  DynamoDB, runs the unchanged handler and SQL, and writes back the rows it inserted or changed. No query is
  rewritten.
- **Release scheduler**: two EventBridge Scheduler schedules invoking a Lambda that wraps the Worker's own
  `scheduled()` code. The GitHub App key moves to SSM Parameter Store.
- **nx remote cache**: an S3 bucket behind a CloudFront distribution, with a CloudFront Function checking
  the bearer token. Bytes never pass through Lambda or API Gateway.
- **Order**: measure first, then the scheduler, then the nx cache, then the results store. Each one runs
  beside Cloudflare (dry run or shadow), is verified, and is cut over by one configuration change, with
  Cloudflare kept current so going back is one change too. Cloudflare is deleted only when the owner says so.
- **Cost** (section 4): at today's load, 1.40 to 3.90 USD a month on AWS, against 5 USD a month Cloudflare
  costs now; one-time under 2 USD. **At 3x today's load the estimate is 3.80 USD to 42 USD a month: above the
  5 USD limit.** The excess is almost all the nx cache's download traffic once it passes CloudFront's free
  1 TB a month, plus DynamoDB writes at the top of the volume range. Every load figure is an estimate until
  the first step measures it, and the plan has a cost gate after that step and another before the nx cache
  moves.

## 1. Target architecture

Everything lives in a new CDK stack, `graphty-ci`, in the existing CDK app
(`tools/pipeline-health/infra/bin/app.ts`), in us-east-2, with the health stack's patterns: Node 22 on
arm64 `NodejsFunction`s with minified bundles, two-week log retention, DynamoDB on demand with
deletion protection and `RemovalPolicy.RETAIN`, EventBridge Scheduler with no retries, SSM parameters
under one prefix, and alarms on the existing SNS topic `graphty-health-alarms`.

It is a separate stack from `graphty-health` on purpose: the health stack's Budget action attaches a
deny-all policy to the health Lambdas at 100% of its budget, and nothing the release train depends on may
ever sit behind that switch. `graphty-ci` gets its own Budget with email alerts and no deny action
(section 4.4).

The only resources outside us-east-2 are the CloudFront distribution and its CloudFront Function, which
are global. Both are defined in the us-east-2 stack; no certificate or other us-east-1 resource is needed,
because the distribution keeps its `*.cloudfront.net` name. No Lambda@Edge.

### 1.1 Results store

```
CI job / release.yml --HTTPS--> Lambda Function URL (auth NONE; the code authenticates)
                                   |
                       Lambda graphty-ci-results (512 MB, 25 s, reserved concurrency 50)
                         1. authenticate: service.js's own GitHub OIDC check (JWKS fetched, cached)
                         2. load: the rows this route needs, from DynamoDB (and S3)
                         3. run: service.js handle() on node:sqlite with every migration applied
                         4. persist: the rows the handler inserted, changed or deleted
                                   |
              DynamoDB graphty-ci-results (pk, sk, 3 GSIs, TTL, PITR)    S3 graphty-ci-results-<account>
```

**Why the same code.** `queries.js` is 550 lines of joins, window functions and correlated `NOT EXISTS`
that decide quarantines, bisect inputs and the release train's pick. Rewriting them as DynamoDB key
lookups is where this migration would break something. The tests already run this code on node:sqlite
(`tools/results-service/test/d1-shim.mjs` implements D1's `prepare/bind/first/all/run/batch`), so the
Lambda adapter is that shim plus a loader and a persister. The Worker and the Lambda run the same source
during the dual run, so a fix lands on both, and going back runs the same code.

**Function URL rather than HTTP API.** The Worker authenticates every call itself (OIDC with per-workflow
kind rules, local token hashes), so API Gateway's JWT authorizer adds nothing; a Function URL costs
nothing per request and has no 30 s cap. Body limit 6 MB either way (the largest body today is a 1.9 MB
duration history). If the project's managed policies refuse a public Function URL, the fallback is an
HTTP API route with no authorizer, at 1 USD per million requests (section 4).

**Table layout** (one table, generic keys; GSIs `g1`, `g2`, `g3`), per D1 table:

- `invocation` + its `file_run` rows: `INV#<id>` / `INV`; the file runs gzip-packed into one attribute (a 300-file shard is about 5 KB); index g1 `VAR#<variant>` by start time; g2 `SVI#<sha>#<variant>#<inputs>`; g3 `FAM#<family>` by start time, only for kinds full, bisect, base.
- `failure`: `INV#<id>` / `F#<file>#<name>`, with the invocation's start time and kind copied in; index g1 `FF#<file>` by time; g2 `RUN#<run id>`.
- `duration`: `DK#<kind>#<key>` / `<startedAt>#<run>#<attempt>`, TTL 35 days; plus `DKEYS#<kind>#<workflow>`: one item holding the set of keys.
- `site`, `verdict`, `channel_move`, `candidate`, `quarantine`, `tracked_issue`, `base_check`: `T#<table>` / the row's primary key, no index: these are loaded whole.
- `test_durations`: S3 object `test-durations/<name>.json` (up to 1.9 MB, over DynamoDB's 400 KB item limit).

Rows of mutable tables carry a version number; every write of one is conditional on the version it was
loaded with, and a new row is conditional on not existing.

**Loaders.** Each route names what it loads before the handler runs:

- `POST /v1/invocations`: the invocation's own item (so "stored: false" on a repeat stays right); every invocation with the same sha, variant and inputs (g2) with their file runs and failures; the small tables; for a master-evidence post, the family's invocations and failures since the oldest active quarantine entry (g3, g1)
- `POST /v1/failures`, `/v1/issues`, `/v1/base-checks`: the touched invocation's failures; the small tables
- `POST /v1/durations`: per posted key, its newest 15 rows in 30 days (the trend)
- `GET /v1/plan`: per asked variant, its newest 60 invocations (g1) with file runs and 7 days of failures; master-evidence failures on `base` or the same variant and inputs (g2); the small tables; for the quarantine, the family since each entry's start (g3)
- `GET /v1/candidate`, `/v1/release-state`, `POST /v1/verdicts`, `/v1/sites`, `/v1/hold`, `/v1/channel-moves`: the small tables, whole, strongly consistent
- `GET /v1/failures`: the run's failures (g2 `RUN#`), and 7 days of failures of each named test (g1)
- `GET /v1/durations/medians`: `DKEYS` of each asked workflow, then the newest `n` rows of each key in 30 days

One difference is deliberate: `fileMs` (median of a file's last 9 runs) and the quarantine's pass count look
back over the loaded window (60 invocations of a variant; a family since the entry started, at most 14 days),
where D1 looked over all history. Both are bounded in D1's answers already in practice; the shadow
comparison (section 2.4) measures whether any answer differs.

**Completeness check.** The adapter records which tables each statement reads (table names from the SQL
text). In tests, a read of a table the route's loader did not fill fails the test; in production it is
logged and counted, and an alarm fires on any count.

**Auth.** Unchanged code, unchanged rules: GitHub Actions OIDC with audience `graphty-results` (the same
token works against both backends, so the dual run needs no client change beyond a second URL), the
per-workflow kind rules in `service.js`, and local tokens by SHA-256. `LOCAL_TOKEN_HASHES` and the
`[vars]` of `wrangler.toml` (`REPOSITORY_ID`, `DEPLOY_REPOSITORY_IDS`) reach the Lambda as environment
variables: the hashes from an SSM String parameter (a hash of a 256-bit token is not a secret), the vars
read from `wrangler.toml` by the CDK code, with a test that the two agree.

**Extra route, outside `service.js`.** `POST/GET /v1/shadow-diffs`: the read comparisons of the dual run
(section 2.4), kept 30 days.

### 1.2 Release scheduler

- EventBridge Scheduler: `cron(0 0,6,12,18 * * ? *)` and `cron(17 3 * * ? *)`, time zone UTC, flexible
  window off, retry attempts 0 (a retried dispatch is a second train), each passing its cron string as the
  input.
- Lambda `graphty-ci-scheduler` (256 MB, 60 s, reserved concurrency 1): calls the unchanged
  `tools/release-scheduler/src/worker.js` `scheduled()` export with `controller.cron` set from the input and
  `env` built from SSM. Node 22 has the Web Crypto and `fetch` the Worker uses.
- SSM: `/graphty-ci/scheduler/app-id`, `/installation-id` (String), `/private-key` (SecureString, PKCS#8,
  AWS-managed KMS key). Cloudflare secrets cannot be read back, so the owner generates a new private key for
  the GitHub App graphty-release-scheduler; both keys stay valid until Cloudflare's copy is deleted.
- Environment `DRY_RUN=1` for the shadow phase: the Lambda mints the installation token, reads master and
  the deploy keys, and logs what it would dispatch or file, without dispatching or filing.
- Alarms: Lambda errors, and "no invocation in 7 hours", to the SNS topic.

### 1.3 nx remote cache

```
nx --> tools/nx-cache-proxy.mjs (in the CI job) --> CloudFront dxxxx.cloudfront.net
           viewer request: CloudFront Function (checks Bearer token SHA-256, maps /v1/cache/<hash>)
           origin: S3 graphty-ci-nx-cache-<account> (us-east-2), Origin Access Control, lifecycle 14 days
```

- The CloudFront Function (JavaScript runtime 2.0, `crypto.createHash("sha256")`) refuses a request
  without a read hash (GET, HEAD) or a write hash (PUT) and rewrites `/v1/cache/<hash>` to the object key;
  `/v1/health` answers from the function. The hashes are compiled into the function from SSM String
  parameters at deploy; rotating a token is an SSM change plus a deploy.
- The bucket policy lets the distribution `s3:GetObject`, `s3:PutObject` and `s3:ListBucket` (so a missing
  object is a 404, which nx reads as a miss, not a 403).
- Cache behavior: GET/HEAD cached (the objects never change), PUT forwarded; the managed
  `CachingOptimized` policy and `AllViewerExceptHostHeader` origin request policy.
- "An entry is never replaced": the proxy adds `If-None-Match: *` to every PUT, and S3's conditional write
  answers 412, which the proxy turns into nx's 409. The proxy is ours and already sits between nx and the
  cache, so nx's client needs nothing.
- Lambda and API Gateway are ruled out for the bytes: single tarballs exceed 10 MB, over API Gateway's
  10 MB and Lambda's 6 MB payload limits.

### 1.4 How callers find the new endpoints

- **Results store**: `RESULTS_URL` = the Function URL, `RESULTS_SHADOW_URL` = the Worker (both repository variables; graphty-site's `RESULTS_URL` too). Back: swap the two variables back.
- **nx cache**: `NX_CACHE_URL` = the CloudFront URL. Back: set it back to the Worker.
- **Scheduler**: a pull request: AWS `DRY_RUN` off, then a second one emptying `crons` in `wrangler.toml`. Back: revert those pull requests.

## 2. Data migration

### 2.1 What moves

Only the results store has data. The scheduler has none; the nx cache is a cache with a 14-day life, so
an empty bucket costs one cold build per task (and the dual run warms it first, section 5.3).

D1 row counts and size are not measured yet (the Cloudflare token exists only as a GitHub secret and in
the owner's `.env`); the first pull request measures them (section 6). Estimate: under 1 GB, live since
2026-10-25.

### 2.2 Export, import, verify

`tools/results-service/aws/migrate.mjs`, run by a `workflow_dispatch` job in `results-service.yml`, which
already holds the Cloudflare token. The job gets AWS credentials through GitHub OIDC
(`aws-actions/configure-aws-credentials`) for a role `graphty-ci-migrate` that the `graphty-ci` stack
creates, trusted only for this repository's `results-service.yml` on master, allowed to write only the
results table and bucket.

1. `export`: `wrangler d1 export graphty-results --remote --output d1.sql`, loaded into node:sqlite (D1 is
   SQLite, so the dump loads as is).
2. `import`: every row through the same row-to-item mapping the Lambda's persister uses; immutable rows
   with "put if absent", mutable small-table rows written as D1 has them.
3. `verify`: per D1 table, the row count and a SHA-256 over the rows in primary-key order, computed once
   from the dump and once from DynamoDB read back through the item-to-row mapping; differences are listed
   by primary key. `--repair` copies the source side's row for each difference.

The mapping both ways is one module, tested with a round trip of every table (rows to items to rows,
byte for byte).

### 2.3 Writes during the move

- **Dual write first.** `tools/results/client.mjs` already sends a fire-and-forget copy of every POST to
  the health API. It gets a second target, `RESULTS_SHADOW_URL`, the same way (deploy-pages.yml's curl
  gets a second curl). From then on every write reaches both stores.
- **Then the import**, which fills everything written before the dual write started. Rows written in
  between are in both and are idempotent.
- **Then `verify --repair` daily** until two runs in a row find nothing: a shadow POST that failed shows
  up as a missing row and is copied from D1, which stays the source of truth.
- **Cutover between release runs.** The rows that change rather than accumulate (the hold, verdicts,
  channel moves, quarantine, tracked issues) are written by release.yml and the jobs it starts. The cutover
  runs when no release.yml, release-rerun.yml or promote.yml run is in progress: `verify --repair`, then
  swap `RESULTS_URL` and `RESULTS_SHADOW_URL`. Test results arriving during the swap reach both stores
  either way. Nothing is frozen for more than the minute the swap takes.
- **After cutover Cloudflare is the shadow**, so it stays current and going back loses nothing;
  `verify` runs in the other direction.

### 2.4 Read comparison

While AWS is the shadow, `client.mjs` sends every GET to both and compares the answers (ignoring
`ageNightlyMs` within 60 s and the order of equal-time rows); a difference is posted to the shadow's
`/v1/shadow-diffs` with the route, query and both answers. Cutover needs 7 days with every difference
explained. Release reads are few (about 200 a day), so a week covers every kind of release decision the
train makes in that week.

## 3. Performance

- **This machine to `/v1/health`**: Cloudflare 0.17-0.18 s measured; AWS 0.25-0.27 s measured (health API). One extra 80 ms; no effect on any decision.
- **GitHub runner (mostly Azure US) to a results write**: Cloudflare edge near the runner, D1 in Eastern North America; AWS 15-60 ms network to Ohio; warm Lambda 30-100 ms; cold start 400-900 ms. Clients allow 5 s per attempt, two retries.
- **`GET /v1/plan`**: Cloudflare one Worker with D1 queries; AWS warm 100-400 ms (parallel DynamoDB queries, about 1-3 MB loaded), cold up to 1.5 s. On every CI run's critical path but fails open ("run everything").
- **Release reads (`/v1/candidate`, `/v1/release-state`)**: Cloudflare D1; AWS small tables loaded whole, 50-150 ms. Grows with the tables; an alarm fires if a load passes 2 MB.
- **nx cache probe and GETs**: Cloudflare Worker then R2; AWS CloudFront edge, S3 origin in Ohio on a miss. Today 3 of 4 sampled jobs got no probe answer in 2 s; CloudFront serves the probe from the function, at the edge.
- **nx cache PUT (master builds)**: Cloudflare Worker into R2; AWS edge to S3 Ohio. 17 MB tarball about 1 s; proxy limit 20 s.
- **Scheduler**: Cloudflare cron in Cloudflare; AWS EventBridge Scheduler, Lambda starts in under 1 s. Minutes do not matter; firing once does.

Throughput: 76 merges and about 174 CI runs a day, 4 full runs, about 4,000 to 8,000 results calls a day
with bursts when a full run's 25 test jobs end together. Lambda reserved concurrency 50 for the results
function (the account has at least 127; the health stack reserves 27), DynamoDB on demand. Nothing waits
on a queue.

What gets slower: a cold Lambda start (under 1 s, a few times an hour), plan reads that load more history
than D1 scanned (bounded by the loaders' windows), and the extra Function URL hop from this machine.
Nothing on a CI job's critical path gets slower by more than a second, and every client already fails
open.

## 4. Costs

Free-tier state: the project is on the PAID plan with 120 USD of credits (2026-10-25); the agent user
cannot call `freetier:GetAccountPlanState`, so the first step's owner script re-checks it. The always-free
offers below apply on the paid plan (https://aws.amazon.com/free/). The health Budget counts cost before
credits, so this section does too: credits would hide spend, they do not remove it.

### 4.1 Load assumptions (to be replaced by measurements)

| Quantity                                                                                                      | Today (1x)            | 3x                     |
| ------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------- |
| Results requests                                                                                              | 120k-240k a month     | 360k-720k              |
| DynamoDB write units (invocations 1-3k a day at 5-9 units with indexes, failures, 10-30k duration rows a day) | 0.5M-1.8M a month     | 1.5M-5.4M              |
| DynamoDB read units                                                                                           | 3M-8M a month         | 9M-24M                 |
| nx cache downloads                                                                                            | 150-450 GB a month    | 450-1,350 GB           |
| nx cache stored                                                                                               | 5-25 GB               | 15-75 GB               |
| nx cache uploads (master builds)                                                                              | 3-15 GB, 15k-50k PUTs | 9-45 GB, 45k-150k PUTs |

### 4.2 Monthly cost, USD

| Item                                          | Price (us-east-2 unless noted)                                | 1x            | 3x             |
| --------------------------------------------- | ------------------------------------------------------------- | ------------- | -------------- |
| DynamoDB writes                               | 0.625 per million write units [1]                             | 0.31-1.13     | 0.94-3.38      |
| DynamoDB reads                                | 0.125 per million read units [1]                              | 0.38-1.00     | 1.13-3.00      |
| DynamoDB storage                              | first 25 GB free [1]                                          | 0             | 0              |
| DynamoDB point-in-time recovery               | 0.20 per GB-month [1]                                         | 0.20          | 0.60           |
| Lambda (results, scheduler)                   | 1M requests and 400k GB-s a month free, account-wide [2]      | 0             | 0-1.00         |
| Function URL                                  | no charge beyond Lambda [2]                                   | 0             | 0              |
| S3 for duration histories                     | PUT 0.005 per 1,000, GET 0.0004 per 1,000 [3]                 | 0.25          | 0.75           |
| EventBridge Scheduler                         | 14M invocations a month free [4]                              | 0             | 0              |
| SSM Parameter Store standard, AWS-managed key | free [5]                                                      | 0             | 0              |
| CloudWatch Logs and 4 alarms                  | 5 GB logs and 10 alarms free [6]                              | 0             | 0              |
| S3 nx cache storage                           | 0.023 per GB-month [3]                                        | 0.12-0.58     | 0.35-1.73      |
| S3 nx cache PUT and origin GET                | 0.005 / 0.0004 per 1,000 [3]                                  | 0.12-0.41     | 0.35-1.23      |
| CloudFront uploads to origin                  | 0.020 per GB, US [7]                                          | 0.06-0.30     | 0.18-0.90      |
| CloudFront downloads                          | first 1 TB a month free, then 0.085 per GB, North America [7] | 0             | 0-29.75        |
| CloudFront requests and Functions             | 10M requests and 2M Function invocations free [7]             | 0             | 0              |
| Budget for graphty-ci (no action)             | first two budgets free [8]                                    | 0             | 0              |
| **Total**                                     |                                                               | **1.44-3.87** | **3.80-42.34** |

At 3x the central case (downloads around 900 GB, the middle of the DynamoDB range) is about 6 USD; the top
of the range is the nx cache passing 1 TB. If the results store had to use an HTTP API instead of a
Function URL: plus 0.12-0.24 (1x) or 0.36-0.72 (3x) at 1.00 per million requests [9].

### 4.3 One-time cost

| Item                                                                             | USD           |
| -------------------------------------------------------------------------------- | ------------- |
| CodeBuild deploys (about 12 builds of 10 minutes, at most 0.005 per minute [10]) | 0.60          |
| D1 import (whole dump, up to 2M write units)                                     | 0.10-1.25     |
| Verification reads, daily for two weeks                                          | 0.05-0.20     |
| nx cache shadow download test (3 days, 15-45 GB, inside CloudFront's free 1 TB)  | 0             |
| **Total**                                                                        | **0.75-2.05** |

The dual-run weeks run the AWS side at full load while Cloudflare's flat 5 USD continues; that is the
monthly figure above, starting early, not an extra.

### 4.4 Against the 5 USD limit, and what Cloudflare costs

- **Today's load: 1.44 to 3.87 USD a month, under the limit. One-time: under 2.05 USD, under the limit.**
- **3x today's load: 3.80 to 42.34 USD a month; the central case, about 6 USD, is over the limit.**
  Per the owner's rule this is where the work stops and is talked over before anything is built.
- Cloudflare today: Workers Paid, 5 USD a month flat (https://developers.cloudflare.com/workers/platform/pricing/),
  usage inside its allowances, R2 downloads free. Deleting all three Workers and cancelling the plan saves
  5 USD a month, so at today's load the move saves 1.13 to 3.56 USD a month net.

Ways to keep 3x under 5 USD, for the owner to choose from:

1. **Move the scheduler and results store; decide the nx cache on measured downloads.** If measured
   downloads at 3x stay under 1 TB, the nx cache costs about 1-4 USD at 3x. If not, options are:
   CloudFront's flat-rate Pro plan, 15 USD a month for 50 TB and 10M requests [11] (a fixed ceiling, over the
   limit); keep the nx cache on Cloudflare's free Workers plan (100k requests a day, R2's free 10 GB and
   free downloads; the cache makes about 15k requests a day); or cache fewer tasks on pull requests.
2. **Shorten DynamoDB history** where writes dominate (duration rows): one item per posted job instead of
   per row cuts duration writes about 10x, at the price of more read units per medians call.

Budgets: the health Budget (10 USD, whole account, deny-all on the health Lambdas at 100%) also counts this
spend, because the account cannot filter Budgets by tag. At today's load the two together stay under it; at
3x they could trip it, which would stop the health dashboard (never the release train: the CI roles are not
on its deny list). The plan raises it to 15 USD in the same pull request that adds the `graphty-ci` Budget
(5 USD, email at 80% forecast and 100% actual, no action).

[1] https://aws.amazon.com/dynamodb/pricing/on-demand/
[2] https://aws.amazon.com/lambda/pricing/
[3] https://aws.amazon.com/s3/pricing/
[4] https://aws.amazon.com/eventbridge/pricing/
[5] https://aws.amazon.com/systems-manager/pricing/
[6] https://aws.amazon.com/cloudwatch/pricing/
[7] https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
[8] https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/
[9] https://aws.amazon.com/api-gateway/pricing/
[10] https://aws.amazon.com/codebuild/pricing/
[11] https://aws.amazon.com/cloudfront/pricing/

## 5. Migration plan

Least risky first. Each service: build, run beside Cloudflare, verify, cut over by configuration, keep the
old path one change away.

### 5.0 Measure

D1 row counts per table, rows added per day, database size; R2 stored size and object count; nx cache
bytes served per job (the proxy counts them). Then the cost table above is redone with real numbers. **Gate
1: if today's load costs over 5 USD, or a one-time cost over 5 USD, stop and talk.**

### 5.1 Release scheduler

- Build: the `graphty-ci` stack with the scheduler Lambda in `DRY_RUN`; the owner puts the new App key in SSM.
- Run beside: 2 days, 8 slots and 2 key checks. Verify each dry run minted a token and would have dispatched
  `release.yml` with `scheduled: true, mode: full` (Lambda logs).
- Cut over: turn `DRY_RUN` off, wait for one slot started by both (a doubled train is safe: release.yml's
  concurrency group serializes it and the full run's pick skips a commit already judged), then empty the
  Worker's `crons`. Cut over right after a slot, so both deploys land well before the next.
- Back: restore the crons (revert); `DRY_RUN` on.

### 5.2 nx cache

- Build: bucket, distribution, function; the owner rotates the read and write tokens into both backends.
- Run beside: the proxy copies every master PUT to AWS (fire and forget) and, for 3 days, fetches every GET
  from AWS too and discards it, which warms the bucket and measures downloads exactly (CloudFront's
  BytesDownloaded). Check: PUT then GET of the same key, a second PUT gives 409, a 100 MB object round trip,
  a missing key gives 404, a bad token gives 403.
- **Gate 2: measured downloads x 3 must stay under 1 TB a month (CloudFront's free tier), or stop and
  talk** (section 4.4 lists the options).
- Cut over: `NX_CACHE_URL` to CloudFront. Verify: the Build and Storybooks jobs' remote hit counts over the
  next day match the week before (taking today's probe timeouts into account).
- Back: `NX_CACHE_URL` to the Worker. The proxy keeps copying PUTs to R2 for 14 days so R2 stays warm.

### 5.3 Results store

- Build: table, bucket, Lambda, Function URL; `migrate.mjs` and its role.
- Run beside: dual write (`RESULTS_SHADOW_URL`), import, read comparison, daily `verify --repair`.
- Verify: 7 days with every read difference explained and two clean verifies in a row.
- Cut over: between release runs, swap `RESULTS_URL` and `RESULTS_SHADOW_URL` (graphty-site's too).
- Back: swap them again; Cloudflare has received every write as the shadow.

### 5.4 Deleting Cloudflare (owner decision)

When all three have run on AWS for 14 days with nothing rolled back, the owner decides. Then: a final D1
export kept in the results bucket, the Workers, D1 database and R2 bucket deleted, Workers Paid cancelled,
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` removed, the Worker deploy jobs and the shadow mirrors
removed. `service.js` and `queries.js` stay: the Lambda runs them.

## 6. Implementation plan

Every AWS change deploys through the existing CodeBuild project `graphty-health-deploy`, which the health
collector starts when master's tracked paths change; agents never deploy stacks. Every Cloudflare change
deploys through `results-service.yml`. Each pull request starts in its own worktree, with tests that fail
first, `pnpm run test:ci-workflows` for workflow changes, `node tools/sonar-gate.mjs`, and
`tools/pr-open.sh`.

1. **Measure**: a `measure` dispatch job in `results-service.yml` (per-table counts, rows per day for 3 days, `wrangler d1 info`, `wrangler r2 bucket info`) writing to the job summary; byte and request counts in `nx-cache-proxy.mjs`'s exit line. Tests: ci-workflows test for the job; proxy unit test for the counter.
2. **Stack and deploy path**: empty `graphty-ci` stack (its Budget, alarms to the health SNS topic), buildspec deploys `graphty-health graphty-ci`, collector trigger paths add `tools/results-service`, `tools/release-scheduler`, `tools/nx-cache-worker`, `tools/results`; health Budget 10 to 15 USD; the CI functions bundle from the repository root. Tests: CDK assertion tests (stack synthesizes, no deny action on CI roles, Region us-east-2, budget values).
3. **Scheduler on AWS, dry run**. Tests: Lambda wrapper calls `scheduled()` with the cron and SSM env; dry run dispatches nothing (fake fetch); schedule expressions match `wrangler.toml`.
4. **Scheduler live on AWS** (`DRY_RUN` off). Tests: CDK test.
5. **Scheduler off on Cloudflare** (empty `crons`). Tests: Worker tests.
6. **nx cache on AWS** plus proxy PUT copy, 3-day GET copy and `If-None-Match`/412-to-409 mapping. Tests: CloudFront Function unit tests (token checks, path map); proxy tests against a fake upstream; CDK tests.
7. **Results Lambda**: adapter (shim, loaders, persister, completeness check), table, bucket, Function URL, `/v1/shadow-diffs`. Tests: the whole existing `tools/results-service/test/index.test.mjs` suite run a second time against the adapter over an in-memory DynamoDB fake, unchanged; loader completeness for every route; conditional-write conflict and retry.
8. **Dual write and read comparison** in `client.mjs` and deploy-pages.yml. Tests: client tests: shadow never changes the primary's result or timing beyond 2 s.
9. **Migration tool** and `migrate` dispatch job, OIDC role. Tests: round trip of every table; verify finds a removed and a changed row; ci-workflows test.
10. **Remove the nx cache copies** (14 days after cutover). Tests: proxy tests.
11. **Delete Cloudflare** (after the owner decides). Tests: ci-workflows tests.

Cutovers between them are repository variable changes, not pull requests.

Owner steps, each a script in `tmp/cf-to-aws/` run with profile `graphty`:

- `agent-read-access.sh` (before 1): lets profile graphty-deploy read CloudWatch metrics and logs of `graphty-ci-*`, Cost Explorer and the free-tier plan state
- `deploy-stack-update.sh` (after 2 merges): deploys the changed `graphty-health-deploy` stack (its buildspec) once
- `scheduler-key.sh <pem file>` (after 3 is deployed): converts a new App private key to PKCS#8, writes it to SSM, deletes the file
- `nx-tokens.sh` (after 6 is deployed): makes new read and write tokens, puts their hashes in SSM and in the Worker, sets the GitHub secrets
- `local-token-hash.sh` (after 7 is deployed): writes the local token's hash from `.env` to SSM

## 7. Risks

- **A loader misses rows a query needs**: a wrong plan, quarantine or release answer. Guard: queries unchanged; completeness check in tests and an alarm in production; 7 days of read comparison before cutover; release reads load whole tables.
- **Cost at 3x**: over 5 USD a month. Guard: gates 1 and 2; the `graphty-ci` Budget alerts; the nx cache options in 4.4.
- **The health Budget trips**: health dashboard Lambdas denied. Guard: raised to 15 USD; CI roles never on its deny list.
- **Public Function URL refused by the project's managed policies**: the results Lambda has no endpoint. Guard: HTTP API fallback, +0.12-0.72 USD.
- **Two writers change the same row at once**: a lost update of a hold or quarantine entry. Guard: conditional writes on row versions, the whole request retried up to 3 times, then 503 (clients retry).
- **Lambda throttled in a burst**: slow or missing writes. Guard: reserved concurrency 50; clients retry and spool invocation records.
- **CloudFront does not pass `If-None-Match` on PUT, or limits PUT bodies**: a replaced entry, or failed uploads. Guard: checked on day one of 5.2; replacing a content-addressed entry is harmless, an upload failure is a cache miss.
- **The scheduler fires twice**: two trains for one slot. Guard: retries off; concurrency group and the pick's skip make the second cheap.
- **The scheduler fires on neither side during cutover**: one missed full run. Guard: cut over right after a slot; the dead-man alarm.
- **`node:sqlite` in Lambda's Node 22**: adapter fails to load. Guard: the CodeBuild deploy runs the adapter tests on Node 22 first; Node 24 runtime otherwise.
- **us-east-2 outage**: results calls fail, scheduler slots missed. Guard: same as a Cloudflare outage today: clients fail open, the next slot runs.
- **Small tables grow until whole loads are slow**: slower release reads. Guard: alarm at a 2 MB load; then add a time window for that table.
- **One deploy build for both stacks**: a failing `graphty-ci` deploy blocks health deploys. Guard: health deploys first in the build.
