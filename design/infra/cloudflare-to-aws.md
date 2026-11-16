# Moving the Cloudflare services to AWS

Issue #4488. Owner decision of 2026-10-25: AWS is this repository's single backend, so the services that run
on Cloudflare today move to the AWS project that already runs the pipeline health dashboard (account
494945606241, Region us-east-2).

What runs on Cloudflare today (all in one account, deployed by `.github/workflows/results-service.yml`):

- **Results store `graphty-results`**: `tools/results-service/`. Back: D1 database, 12 tables.
- **Release scheduler**: `tools/release-scheduler/`. Back: none (3 secrets).
- **nx remote cache `graphty-nx-cache`**: `tools/nx-cache-worker/`. Back: R2 bucket, objects expire after 14 days.

DNS (Zonomi) and every graphty.app site (GitHub Pages) are not on Cloudflare and do not move.

## Summary

- **This build moves the release scheduler and the results store.** The nx remote cache is NOT in it: its
  AWS cost at 3x today's load depends on download volume nobody has measured correctly yet, and the review
  showed it can pass CloudFront's free 1 TB a month (section 4.5). It stays on Cloudflare until a corrected
  measurement and a conversation with the owner decide it.
- **Release scheduler**: EventBridge Scheduler invoking a Lambda that calls the Worker's own `run()` and
  `checkDeployKeys()`. The dispatcher (shared by both backends) skips a slot that already has a train, so the
  Cloudflare cron stays on as a backup 10 minutes later and neither a duplicate nor a missed slot can happen.
- **Results store**: one Lambda behind a Lambda Function URL, two DynamoDB tables, one S3 bucket. The
  Worker's `service.js` and `queries.js` run unchanged on node:sqlite; per request, a route-specific loader
  fills an in-memory database with exactly the rows that route's SQL can read, through keys and indexes
  windowed the way the SQL windows them. Nothing is loaded whole, so read cost does not grow as the tables do.
- **Cost of this build** (section 4): today's load 0.55 to 1.40 USD a month; 3x today's load 1.51 to
  4.23 USD a month; one-time 0.70 to 1.10 USD. All under the 5 USD limit. Load figures are measured where the
  health table mirrors them (invocation and duration posts) and estimated elsewhere; Gate 1 (section 5.0)
  recomputes both columns from D1's own counts before anything is deployed.
- **Order**: measure, then the scheduler, then the results store. Each runs beside Cloudflare, is verified,
  and is cut over by configuration, with Cloudflare kept current so going back is one change. Cloudflare is
  deleted only when the owner says so.

## 1. Target architecture

Everything lives in a new CDK stack, `graphty-ci`, in the existing CDK app
(`tools/pipeline-health/infra/bin/app.ts`), in us-east-2, with the health stack's patterns: Node 22 on arm64
`NodejsFunction`s with minified bundles, two-week log retention, SSM parameters under one prefix, alarms on
the existing SNS topic `graphty-health-alarms`. Nothing is created outside us-east-2. No CloudFront, no
Lambda@Edge, no StackSets, nothing cross-Region.

It is a separate stack from `graphty-health` on purpose: the health stack's Budget action attaches a deny-all
policy to the health Lambdas at 100% of its budget, and nothing the release train depends on may sit behind
that switch. `graphty-ci`'s roles are never on that deny list.

### 1.1 Results store

```
CI job / release.yml --HTTPS--> Lambda Function URL (auth NONE; the code authenticates first)
                                   |
                       Lambda graphty-ci-results (1,769 MB = one vCPU, 25 s, reserved concurrency 20)
                         1. authenticate: service.js's own GitHub OIDC check (JWKS fetched, cached)
                         2. load: the rows this route's SQL can read (table below)
                         3. run: service.js handle() on node:sqlite with every migration applied
                         4. persist: the rows the handler inserted, changed or deleted
                                   |
     DynamoDB graphty-ci-history (on demand)   DynamoDB graphty-ci-durations (provisioned 10/10)
     DynamoDB graphty-ci-release (on demand, PITR)   S3 graphty-ci-results-<account> (versioned prefix)
```

**Why the same code.** `queries.js` is 550 lines of joins, window functions and correlated `NOT EXISTS` that
decide quarantines, bisect inputs and the release train's pick. Rewriting them as key lookups is where this
migration would break something. The tests already run this code on node:sqlite
(`tools/results-service/test/d1-shim.mjs`), so the Lambda adapter is that shim plus loaders and a persister.

**The loader rule.** A loader must insert, for every statement its route runs, a superset of the rows that
statement can read in D1, with complete rows (every column; never a placeholder value). Then the unchanged SQL
gives D1's answer. This is checked per route and per row, not per table: the parity suite runs every route
against a production-size fixture (a paged copy of D1, section 2.2) twice, once on the full fixture in
node:sqlite and once through the adapter over a DynamoDB fake filled from the same fixture, and asserts equal
answers. The one deliberate exception is listed under "Plan" below.

**Function URL, not HTTP API.** The code authenticates every call before any DynamoDB read, so an
unauthenticated flood costs Lambda requests only. An HTTP API stage throttle limits the rate, not the cost (a
20 requests a second throttle still admits 52 million requests a month, 52 USD), and would add 0.30 to 1.35
USD a month at today's to 3x load. Flood protection is: reserved concurrency 20, an alarm on more than 20,000
requests in an hour (today's peak hour is about 1,000), the account Budget, and the "project paused" fallback
to Cloudflare (section 5.3). Since late 2025 a public Function URL needs both `lambda:InvokeFunctionUrl` and
`lambda:InvokeFunction` (with `lambda:InvokedViaFunctionUrl`) for principal `*`; a CDK assertion test checks
both. The adapter translates payload format 2.0 (lowercase headers, `rawQueryString`, `isBase64Encoded`) and
gzips responses when the request accepts it (Node's `fetch` decodes it), because a Function URL does not
compress and the 1.9 MB shard histories would otherwise use most of the free 100 GB a month of egress.

**Tables.** Three, by access pattern:

- `graphty-ci-history` (on demand, deletion protection, `RETAIN`, no PITR): invocations, file runs, failures.
  It is CI history: losing it costs flaky-detection history and test reuse, not release state, and PITR on a
  table growing 1.5 to 5 GB a year would cost 0.30 to 1 USD a month by itself. PITR can be turned on later with one CDK change.
- `graphty-ci-release` (on demand, deletion protection, `RETAIN`, PITR on; a few MB): `site`, `verdict`,
  `channel_move`, `candidate`, `quarantine`, `tracked_issue`, `base_check`.
- `graphty-ci-durations` (provisioned 10 WCU and 10 RCU, inside DynamoDB's always-free 25 WCU and 25 RCU,
  no autoscaling, TTL): job and step durations. It is write-heavy (149,000 rows a day measured), read lightly,
  and never on a critical path; DynamoDB keeps 300 seconds of unused capacity as burst, and a throttled write
  is retried by the SDK, then by the client.

**History table layout** (generic GSIs `g1`, `g2`, `g3`, every one KEYS_ONLY plus INCLUDE `started_at`,
`kind`, `outcome`; a CDK test asserts the projections):

- Invocation with its file runs: pk `SV#<sha>`, sk `<variant>#<inputs>#<id>`. The file runs are gzip-packed
  into one attribute (measured: 2 to 22 KB of JSON before compression, about 1.5 KB after). g1
  `VAR#<variant>` by `started_at`; g2 `VI#<variant>#<inputs>` by `started_at`; g3 `FAM#<family>` by
  `started_at`, only for kinds full, bisect and base.
- Failure: pk `INV#<id>`, sk `F#<file>#<name>`, with the invocation's `started_at`, `kind`, `variant` copied
  in. Replaceable (`INSERT OR REPLACE` in service.js, and the live `POST /v1/failures` stores rows before the
  invocation exists), so written unconditionally. g1 `VARF#<variant>` by `started_at`; g2 `FT#<file>` by
  `started_at`; g3 `RUN#<run id>` by invocation id.
- `INV#<id>` / `HEAD`: the invocation's key (`SV#<sha>`, sk), so a failure post or a repeat post finds it.

**Release table layout:**

- `site`: pk `SITE`, sk `<built_at>#<sha>` (newest first, windowed), plus `SITESHA#<sha>` (GetItem by sha).
- `verdict`: pk `VERDICT`, sk `<at>#<run_id>#<attempt>#<sha>#<state>`, plus pk `VSHA#<sha>` with the same
  sk (the newest verdict of one sha).
- `channel_move`: pk `CM#<channel>`, sk `<at>`; plus `CMK#<channel>#<sha>#<run_id>` (the natural key that
  `postChannelMove` checks).
- `candidate`: one item.
- `quarantine`: pk `Q#<family>`, sk `<file>#<name>#<since>` (every row); plus `QA#<family>` / `<file>#<name>`,
  a copy of the row while `left_at IS NULL`, written with a condition on its version. The `QA` item is the
  single active entry per test, so two Lambdas cannot both create one (D1 serialized this); plus `QI#<issue>`
  pointers for `closeIssue`.
- `tracked_issue`: pk `TI#<signature>`; plus `TIN#<number>`.
- `base_check`: pk `BC#<base>#<file>#<variant>` (GetItem).

**Durations table layout:** one item per posted job per run: pk `DJ#<kind>#<workflow>#<job>`, sk
`<started_at>#<run>#<attempt>`, the job's rows gzip-packed (one write unit instead of about ten), TTL 35 days
(every duration query reads 30 days at most). Plus `DJOBS#<kind>#<workflow>` / `<job>`, touched at most once a
day per job, TTL 35 days: the job list `GET /v1/durations/medians` walks. `test_durations` bodies (up to 1.9
MB, over DynamoDB's 400 KB item limit) are S3 objects `test-durations/<name>.json`, versioning on, keeping the
3 newest noncurrent versions for 1 day.

**Loaders**, per route (eventually consistent reads unless marked "consistent"; release routes are all
consistent):

- `POST /v1/invocations`: the whole `INV#<id>` partition and the `SV#<sha>` group `<variant>#<inputs>#`
  (consistent: try 2 must see try 1, which a GSI cannot promise), with the siblings' failures; the family's
  `QA` items (consistent); the tracked issues of the posted failures' signatures; for a master-evidence post
  in a family with active entries, that family's g3 invocations since the oldest active entry's `since`
  (14 days at most) and their failures.
- `POST /v1/failures`: the invocation's `HEAD` and failures; `/v1/issues`: `TI#`, `TIN#`, `QI#` pointers and
  the rows they name; `/v1/base-checks`: one GetItem.
- `POST /v1/durations`: per posted job, its `DJ#` items newest first until every posted key has 15 rows or 30
  days are read (at most 400 items).
- `GET /v1/plan`: per asked variant, g1 newest first until every file in the newest run has 9 runs (whole-
  shard variants: about 9 to 12 invocations), at most 60 invocations; only the 9 newest file-run rows per
  file are inserted. g1 `VARF#` failures of 7 days; g2 `VI#` newest passed run, and failed master-evidence
  runs with the same inputs; base `SV#<base>` for the asked variants; `QA#` of the families and their g3
  history as above. Files with no variants: the g2 `FT#` failures of 7 days and every variant's newest runs
  holding the file.
- `GET /v1/candidate`: the newest 200 `SITE` rows, 30 days of `VERDICT`, the candidate. `/v1/release-state`:
  the newest `CM#nightly`, the nightly's `SITESHA#`, `SITE` rows after it, 30 days of `VERDICT`.
  `POST /v1/verdicts`, `/v1/sites`, `/v1/hold`, `/v1/channel-moves`: the keys they write and check.
- `GET /v1/failures`: g3 `RUN#<run>` failures with their invocations, the `good` site by `SITESHA#`, and 7
  days of g2 `FT#` failures of each named test.
- `GET /v1/durations/medians`: `DJOBS#` of each asked workflow, then each job's newest items (a pool of 50
  parallel queries).

The deliberate difference: a file-selected plan variant (where each run holds only some files) looks at most
60 runs back for a file's 9 runs, where D1 looked over all history. The read comparison reports it as its own
category; a file that has not run in that variant's last 60 runs gets a median from fewer runs.

**Persisting.** Child items first (failures, file runs, pointers), the invocation item last, each
idempotent; a persist that times out is re-done by the client's retry instead of answering "stored: false".
No DynamoDB transactions (100 items at most; a badly failing shard has more failures). Mutable rows carry a
version; a write is conditional on the loaded version; a conflict reruns the whole request, up to 3 times,
then 503 (clients retry).

**Auth.** Unchanged code and rules: GitHub Actions OIDC with audience `graphty-results` (one token works
against both backends), per-workflow kind rules, local tokens by SHA-256. `LOCAL_TOKEN_HASHES` comes from an
SSM String parameter; `wrangler.toml`'s `[vars]` are read by the CDK code, with a test that they agree.

**Extra route outside `service.js`**: `POST/GET /v1/shadow-diffs` (the read comparison's records, kept 30
days) goes through the same `authenticate()`: writes from CI kinds only, reads by any valid credential.

### 1.2 Release scheduler

- EventBridge Scheduler: `cron(0 0,6,12,18 * * ? *)` and `cron(17 3 * * ? *)`, UTC, flexible window off,
  retry attempts 0. Input `{"cron":"0 0,6,12,18 * * *","scheduledTime":"<aws.scheduler.scheduled-time>"}`: the
  cron in Cloudflare's format (the key check compares with `KEY_CHECK_CRON`, `"17 3 * * *"`).
- Lambda `graphty-ci-scheduler` (256 MB, 120 s, reserved concurrency 1). Its asynchronous invoke config is
  retry attempts 0 and maximum event age 600 s, because Lambda's own default of 2 retries is separate from the
  schedule's. The wrapper calls `run(env, { fetch, slot })` or `checkDeployKeys(env, { fetch })` directly
  (not `scheduled()`, which passes no `fetch` and hands the work to `waitUntil()`), awaits it, catches
  everything and never throws. `slot` comes from `scheduledTime`; when that is missing it is the current time
  rounded down to the 6-hour slot.
- **One train per slot, from either backend.** `run()` (shared code, deployed to both) first lists
  `release.yml`'s `workflow_dispatch` runs created since the slot started by the App
  graphty-release-scheduler; if one exists it logs "slot already started" and dispatches nothing. After a 204
  it waits up to 30 s until the new run is listed, so a duplicate invocation (EventBridge Scheduler is
  at-least-once; reserved concurrency 1 queues it behind the first) always sees it. If the list call fails it
  dispatches anyway, as today. No `release.yml` change is needed: only the App dispatches at slot times, and a
  restart from `release-due` is started by another actor.
- Cloudflare's cron moves to `10 0,6,12,18 * * *`: a backup 10 minutes after AWS. With the dedupe it
  dispatches only when AWS did not, so both stay on through the dual run and after it, until the owner deletes
  Cloudflare. Going back needs no change.
- SSM `/graphty-ci/scheduler/app-id`, `/installation-id` (String), `/private-key` (SecureString, PKCS#8, the
  AWS-managed key). Cloudflare secrets cannot be read back, so the owner generates a second private key for
  the App; both stay valid until Cloudflare is deleted. The role may `ssm:GetParameter` only
  `/graphty-ci/scheduler/*`, and `kms:Decrypt` only with `kms:ViaService = ssm.us-east-2.amazonaws.com`.
- `DRY_RUN=1` first: the wrapper passes a `fetch` that answers 204 to the dispatch and refuses every other
  write, so it mints the token, reads master and the deploy keys, and logs what it would do.
- Alarms: Lambda errors; "no successful invocation in 7 hours" (dead man).

### 1.3 nx remote cache: not in this build

See section 4.5. The CloudFront design and the review's corrections to it (the probe path, OAC signing
"always", the function's path allow-list, `x-amz-content-sha256` on PUT, us-east-1 metrics without alarms)
are kept in `tmp/cf-to-aws/` for that decision.

### 1.4 How callers find the new endpoints

- **Results store**: `RESULTS_URL` and `RESULTS_SHADOW_URL`, repository variables in graphty-monorepo,
  graphty-site and graphty-nightly, plus the owner's local `.env` (`tools/channel/candidates.mjs`,
  `tools/results/cli.mjs`). Back: swap the two.
- **Scheduler**: AWS at :00, Cloudflare backup at :10. Back: nothing to change; to make Cloudflare the only
  one, disable the AWS schedules (one CDK value).

## 2. Data migration

### 2.1 What moves

Only the results store has data, live since 2026-10-25. Measured from the health table's mirror of every
results POST: 2,272 (2026-10-27) and 5,790 (2026-10-28) invocation records a day, 108 to 227 failures a day,
148,579 duration rows a day (2026-10-28). D1's own row counts and size come from the first pull request.

D1 keeps everything forever and its database limit is 10 GB; at about 15 MB a day of duration rows alone it
reaches that within a year. The AWS duration rows expire after 35 days, which every duration query allows.

### 2.2 Export, import, verify

`tools/results-service/aws/migrate.mjs`, run by `workflow_dispatch` jobs in `results-service.yml` (which
holds the Cloudflare token), in the GitHub environment `aws-migrate` (deployments from master only), in their
own concurrency group so a push-triggered deploy never cancels them. AWS credentials come from GitHub OIDC
for role `graphty-ci-migrate`, trusted only for `sub = repo:graphty-org/graphty-monorepo:environment:aws-migrate`
and `aud = sts.amazonaws.com`, allowed to read and write the three tables and the bucket. The account has no
GitHub OIDC provider today (health uses an API Gateway JWT authorizer); the stack creates one, or imports it
if the owner's preflight finds one.

1. `export`: per table, keyset-paged `SELECT ... WHERE pk > ? ORDER BY pk LIMIT 5000` through
   `wrangler d1 execute --remote --json`, never `wrangler d1 export`, which blocks every other D1 query while
   it runs. Each page is a short query. Runs only outside 23:45-00:30, 05:45-06:30, 11:45-12:30 and 17:45-18:30 UTC
   and only when no `release.yml`, `release-rerun.yml` or `promote.yml` run is in progress (checked before
   each table).
2. `import`: every row through the same row-to-item mapping the persister uses. Duration rows only for 30
   days, with their TTL from `started_at`.
3. `verify`: per table, row count and a SHA-256 over the rows in natural-key order, both sides through the
   item-to-row mapping, ignoring the server-clock columns below; history tables over a window (the last 2
   days, or everything with `--full`), small tables whole, `test_durations` by the S3 body's SHA-256.
4. `repair`: makes the target equal to the source: copies source rows, and deletes target-only rows older
   than the export's start (newer ones may be in flight).

Server-clock columns, which each backend sets from its own clock: `failure.seen_at`, `site.built_at`,
`verdict.at`, `channel_move.at`, `candidate.at`, `quarantine.since`, `quarantine.expires`,
`quarantine.left_at`, `tracked_issue.opened_at`, `tracked_issue.last_seen`, `base_check.asked_at`,
`test_durations.updated_at`. Two of them are in a primary key, so those tables match on their natural key
instead: `channel_move` on (channel, sha, run_id); `quarantine` on (family, file, name) for the active entry
and (family, file, name, issue) for the rest.

The mapping both ways is one module, tested with a round trip of every table.

### 2.3 Writes during the move

- **Dual write first.** `tools/results/client.mjs` `call()` sends a fire-and-forget copy of every non-GET
  request (POST and PUT) to `RESULTS_SHADOW_URL`, like the existing copy to the health API. The spool re-post
  (`tools/results/cli.mjs import`) posts to both. `deploy-pages.yml`'s curl gets a second curl.
  `tools/channel/site-deploy.yml` gets the same, and the owner recommits it as `deploy.yml` in graphty-site
  and graphty-nightly with both variables set there.
- **Then the import**, which fills everything before the dual write started.
- **Then `verify --repair` daily** (outside the slots, as above) until two runs in a row find nothing. D1 is
  the source of truth until cutover.
- **AWS computes its own derived rows during the dual run** (quarantine entries, tracked issues), which is
  what the read comparison tests. At cutover they are replaced wholesale from D1, so no AWS-only decision made
  before the import survives.
- **Cutover**, between release runs, when no `release.yml`, `release-rerun.yml` or `promote.yml` run is in
  progress: `verify --full --repair`, then copy `quarantine`, `tracked_issue`, `candidate`, `channel_move`,
  `verdict` and `site` wholesale from D1, then swap `RESULTS_URL` and `RESULTS_SHADOW_URL` everywhere listed
  in 1.4. Test results arriving during the swap reach both stores either way.
- **After cutover Cloudflare is the shadow**: it receives every write, `verify` runs in the other direction
  daily until the owner deletes Cloudflare, and the same wholesale copy runs the other way on a rollback.

### 2.4 Read comparison

While AWS is the shadow, `client.mjs` sends every GET to both and compares the answers, ignoring the
server-clock columns and fields derived from them (`ageNightlyMs`, a candidate's `builtAt`, a verdict's or
hold's `at`, a quarantine entry's `expires`) and the order of equal-time rows. A difference is posted to the
shadow's `/v1/shadow-diffs` with the route, query, both answers and both backends' deployed commits (the two
deploy from master separately and can run different code for up to an hour). Cutover needs 7 days in which
every difference is explained, `GET /v1/plan` p95 under 2 s on AWS, and two clean verifies in a row.

## 3. Performance

- **Results writes from a GitHub runner** (mostly Azure US): Cloudflare edge plus D1 in Eastern North
  America; AWS 15-60 ms network to Ohio, warm Lambda 30-100 ms, cold start 400-900 ms. Clients allow 5 s per
  attempt, two retries.
- **`GET /v1/plan`**, on every CI run's critical path (fails open to "run everything"): a typical pull
  request asks about 20 variants, about 300 KB loaded; a root change asks up to 74, at most about 74 x 60
  invocations but typically 74 x 12, with only 9 file-run rows per file inserted (about 70,000 rows at the
  very worst). Target warm 150-600 ms, cold under 1.5 s. A test seeds a production-size table and requires a
  74-variant plan under 2 s; the cutover criterion is p95 under 2 s measured in the dual run.
- **Release reads**: bounded windows (200 sites, 30 days of verdicts), 50-150 ms; they do not grow with the
  tables' age.
- **Durations**: a post reads one or two pages per posted job; medians fan out about 60 queries through a pool
  of 50, 200-500 ms against a 10 s client limit; a test with 300 jobs bounds it.
- **Scheduler**: minutes do not matter; one train per slot does (1.2).

Throughput: 76 merges and about 174 CI runs a day, 4 full runs; about 10,000 to 15,000 results calls a day,
bursts when a full run's 25 test jobs end together. Lambda's account limit is 400 concurrent executions
(measured 2026-10-25, `tmp/health-dashboard/v2-research-aws.md`); health reserves 27, this stack 21, leaving
352 unreserved (Lambda requires 100). The preflight re-reads it (section 6).

## 4. Costs

Free-tier state: the project is on the PAID plan with 120 USD of credits (2026-10-25); the always-free offers
below apply on the paid plan (https://aws.amazon.com/free/). The agent cannot read the plan state, Cost
Explorer or Budgets, so the owner's preflight does. Costs below are before credits, as the health Budget
counts them.

### 4.1 Load (1x measured where marked, 3x = three times 1x)

- Invocation records: 2,300-5,800 a day, measured. Each: one item of about 2 KB (2 write units) and three
  KEYS_ONLY index entries (1 each, the third only for full, bisect and base): about 4.3 write units.
- Duration rows: 149,000 a day measured, posted per run (`tools/ci-budgets.mjs`); packed per job, at most
  15,400 items a day (jobs a day, measured): provisioned table, inside the free 25 WCU / 25 RCU.
- Failures 110-230 a day measured; sites 51, verdicts about 10, other release writes a few.
- Plans: about 180 a day; 150-450 read units each (20 variants at 3-31 units; a root change about 1,400).
- Requests: 10,000-15,000 a day, 0.3-0.45 million a month; the health Lambdas add about 0.2 million.
- Shard histories: about 400 S3 PUTs a day (master-evidence runs only) and about 5,000 GETs (every test
  shard job), 0.2-1.9 MB each before gzip.

### 4.2 Monthly cost, USD

| Item                                     | Price (us-east-2)                               | 1x            | 3x            |
| ---------------------------------------- | ----------------------------------------------- | ------------- | ------------- |
| DynamoDB writes, history and release     | 0.625 per million write units [1]               | 0.21-0.50     | 0.62-1.50     |
| DynamoDB reads, history and release      | 0.125 per million read units [1]                | 0.16-0.47     | 0.47-1.41     |
| DynamoDB durations table (10 WCU/10 RCU) | 25 WCU and 25 RCU provisioned free [1][12]      | 0             | 0             |
| DynamoDB storage at 12 months            | 25 GB free, then 0.25 per GB-month [1]          | 0             | 0-0.25        |
| PITR, release table only (a few MB)      | 0.20 per GB-month [1]                           | 0.01          | 0.01          |
| Lambda (results, scheduler)              | 1M requests, 400k GB-s free [2]                 | 0             | 0-0.40        |
| Function URL                             | no charge beyond Lambda [2]                     | 0             | 0             |
| S3 shard histories (PUT, GET, storage)   | 0.005 / 0.0004 per 1,000; 0.023 per GB [3]      | 0.12          | 0.36          |
| Data out (gzip responses, 12-37 GB)      | 100 GB a month free [13]                        | 0             | 0             |
| EventBridge Scheduler                    | 14M invocations free [4]                        | 0             | 0             |
| SSM standard, AWS-managed key            | free [5]                                        | 0             | 0             |
| CloudWatch logs, 6 alarms, 3 metrics     | 5 GB, 10 alarms, 10 metrics free [6]            | 0-0.10        | 0-0.10        |
| CodeBuild deploys of graphty-ci          | 10-15 a month x 3-4 min, at most 0.005/min [10] | 0.05-0.20     | 0.05-0.20     |
| Budget without an action                 | free [8]                                        | 0             | 0             |
| **Total**                                |                                                 | **0.55-1.40** | **1.51-4.23** |

The read figure does not grow with the tables' age: no route loads a table whole, release routes read fixed
windows, and history routes read by key. Storage grows 1.5 to 5 GB a year (1x), 4.4 to 15 GB (3x), inside the
free 25 GB with the health table for about a year at 3x.

### 4.3 One-time cost

| Item                                                               | USD           |
| ------------------------------------------------------------------ | ------------- |
| D1 import: about 50,000-120,000 invocations, 30 days of durations  | 0.40-0.70     |
| CodeBuild deploys while building (about 10 x 5 min)                | 0.25          |
| Verification reads, windowed daily plus one full verify at cutover | 0.05-0.15     |
| **Total**                                                          | **0.70-1.10** |

D1-side reads during export and verify fall inside Workers Paid's included 25 billion rows a month.

### 4.4 Against the 5 USD limit

- **Today's load: 0.55 to 1.40 USD a month. 3x today's load: 1.51 to 4.23 USD a month. One-time: 0.70 to
  1.10 USD. All under the limit.**
- What would break it, so Gate 1 checks it with D1's own counts: plans averaging over about 1,000 read units,
  more than 9,000 invocation records a day, or the Function URL refused by the project's policies (an HTTP API
  adds 0.30-1.35 USD; at 3x the top would then be 5.58: stop and talk).
- Cloudflare today: Workers Paid, 5 USD a month flat. It stays while the nx cache stays there; with only the
  cache left, Workers Free (100,000 requests a day; the cache makes about 15,000) and R2's free 10 GB would do,
  plus up to about 0.23 USD for R2 storage above 10 GB.
- **Budgets.** The account cannot filter Budgets by tag, and the services overlap with health's, so
  `graphty-ci` gets a whole-account cost Budget with email at 80% forecast and 100% actual and no action, set
  at the health limit plus 5 USD. The health Budget (10 USD, deny-all on the health Lambdas, counting before
  credits) also counts this spend; it goes to 15 USD in the stack pull request. Risk found while measuring:
  the health table writes about 240,000 items a day (149,000 duration rows, 58,000 collector steps, 15,000
  jobs, ...), each with a time copy, which suggests health alone may spend several USD a month before
  credits; the dashboard's 0 USD is after credits. The owner's preflight reads the Budget's actual and
  forecast before the stack pull request.
- **Spend limit.** The managed spend-limit SCP denies `lambda:InvokeFunction`, `InvokeFunctionUrl` and
  `CreateFunction` as the project nears its limit, which would stop the results store, the AWS scheduler and
  the health dashboard at once. The preflight records whether a spend limit is set; it must sit above both
  Budgets. If it trips: the Cloudflare scheduler backup keeps starting trains, and the results variables
  swap back to Cloudflare, which as the shadow has every write (5.3).

### 4.5 The nx cache, for the owner

Corrected demand: the CI probe fails in most jobs today (3 of 4 sampled jobs got no answer in 2 s), so the
cache's served bytes undercount what an answering cache would serve. With the probe answering, every Build,
Storybooks and cache job downloads about 50-100 MB, across about 174 runs a day: about 0.25-0.5 TB a month at
1x, 0.75-1.5 TB at 3x. On CloudFront that is free at 1x and 0 to about 42 USD at 3x (0.085 per GB past 1 TB
[7]), plus about 0.6-3 USD of S3 storage and requests. That cannot be shown under 5 USD at 3x, so it is not
built. Choices for the owner: keep the cache on Cloudflare (Workers Free plus R2), measure demand properly
first (count bytes per cache-capable job whenever either backend answers, scaled by cache-capable jobs a day),
cache fewer tasks on pull requests, or accept a cost ceiling such as CloudFront's flat-rate plan (15 USD a
month [11]). Separately, the probe failing in most jobs is its own defect, to be filed.

[1] https://aws.amazon.com/dynamodb/pricing/on-demand/
[2] https://aws.amazon.com/lambda/pricing/
[3] https://aws.amazon.com/s3/pricing/
[4] https://aws.amazon.com/eventbridge/pricing/
[5] https://aws.amazon.com/systems-manager/pricing/
[6] https://aws.amazon.com/cloudwatch/pricing/
[7] https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/
[8] https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/
[10] https://aws.amazon.com/codebuild/pricing/
[11] https://aws.amazon.com/cloudfront/pricing/
[12] https://aws.amazon.com/dynamodb/pricing/provisioned/
[13] https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer

## 5. Migration plan

### 5.0 Measure (Gate 1)

D1 row counts per table, rows added per day, database size (paged SELECTs, never `d1 export`); the owner's
preflight (section 6). Then the 1x and 3x columns are recomputed from those numbers. **Gate 1: if today's load
or 3x today's load costs over 5 USD a month, or a one-time cost over 5 USD, stop and talk.**

### 5.1 Release scheduler

- First the shared change, deployed to Cloudflare only: the dedupe in `run()` and the cron moved to :10.
- Build the AWS side with `DRY_RUN`; the owner puts the second App key in SSM. Run 2 days (8 slots, 2 key
  checks); each dry run must log a minted token and the dispatch it would make.
- Go live inside one 6-hour gap: `DRY_RUN` off, and the key-check cron removed from Cloudflare (only AWS
  checks keys from then on). The next slot is started by AWS at :00; Cloudflare's :10 run must log "slot
  already started". Nothing is let to run twice on purpose.
- Back: none needed (the backup runs whenever AWS did not); to stop AWS, disable its schedules.

### 5.2 nx cache

Not in this build (4.5).

### 5.3 Results store

- Build: tables, bucket, Lambda, Function URL; migration tool and role.
- Run beside: dual write, import, daily windowed `verify --repair`, read comparison.
- Verify: 7 days with every difference explained, plan p95 under 2 s, two clean verifies in a row.
- Cut over: as in 2.3.
- Back: swap the variables again (everywhere in 1.4) and copy the derived tables the other way. If AWS
  itself is down or the project is paused, swap without verifying first: Cloudflare received every write as
  the shadow, so nothing is missing there.

### 5.4 Deleting Cloudflare (owner decision)

After the scheduler and results store have run on AWS for 14 days with nothing rolled back, the owner
decides. Then: a final paged D1 copy kept in the results bucket, the results Worker and D1 database deleted,
the scheduler Worker deleted (the AWS dead-man alarm is then the only guard), the shadow mirrors removed.
The nx cache Worker and R2 stay until its own decision; Workers Paid can move to Workers Free then.

## 6. Implementation plan

Every AWS change deploys through the existing CodeBuild project `graphty-health-deploy`, which the health
collector starts when master's tracked paths change. The buildspec deploys only the stack whose paths
changed (two path sets, passed by the collector), and before deploying `graphty-ci` it installs and runs the
tests of `tools/results-service` and `tools/release-scheduler` on Node 22. The `graphty-ci` functions bundle
with `projectRoot` and `depsLockFilePath` at the repository root; a CDK test asserts `node:sqlite` stays
external. The tracked paths are only the files the bundles import (not `tools/results`, the clients). If the
health Budget's deny action ever stops the collector, the owner's `deploy-ci.sh` starts the build by hand.
Every Cloudflare change deploys through `results-service.yml`. Each pull request: its own worktree, tests that
fail first, `pnpm run test:ci-workflows` for workflow changes, `node tools/sonar-gate.mjs`, `tools/pr-open.sh`.

1. **Measure**: a `measure` dispatch job in `results-service.yml` (paged counts per table, rows per day,
   `wrangler d1 info`), output in the job summary. Tests: ci-workflows test.
2. **Stack and deploy path**: `graphty-ci` with its Budget and alarms, buildspec stack selection and tests,
   collector trigger paths, health Budget 10 to 15 USD. Tests: CDK assertions (Region us-east-2, no deny
   action on CI roles, budget values, reserved concurrency total, GSI projections, bucket settings: block
   public access, enforce SSL, SSE-S3, RETAIN, versioning).
3. **Scheduler dedupe, Cloudflare at :10** (`worker.js`, `wrangler.toml`). Tests: a slot with a run already
   listed dispatches nothing; a list failure still dispatches; the post-dispatch wait.
4. **Scheduler on AWS, dry run**. Tests: wrapper with and without `scheduledTime` never throws; dry fetch
   refuses writes; the async invoke config (retries 0, max age 600 s); schedule crons equal a constant shared
   with `wrangler.toml`'s slot cron.
5. **Scheduler live on AWS**, key-check cron off Cloudflare. Tests: CDK and Worker tests.
6. **Results Lambda**: adapter, loaders, persister, tables, bucket, Function URL (both permissions), shadow
   diffs. Tests: the whole existing `index.test.mjs` suite against the adapter over a DynamoDB fake; the
   per-route parity suite on a production-size fixture; try 2 right after try 1 finds it; two concurrent
   flaky conclusions make one quarantine entry; a failure posted before its invocation; the 74-variant plan
   under 2 s; PUT and GET of a 1.9 MB history; payload 2.0 and gzip.
7. **Dual write and read comparison**: `client.mjs` (every non-GET, GET comparison), `cli.mjs import`,
   `deploy-pages.yml`, `site-deploy.yml`. Tests: the shadow never changes the primary's result or adds more
   than 2 s.
8. **Migration tool** and its dispatch jobs and role. Tests: round trip of every table; verify ignores clock
   columns, matches natural keys, finds a removed and a changed row; repair deletes a target-only row;
   ci-workflows test.
9. **Delete Cloudflare's results store and scheduler** (after the owner decides).

Owner steps, each a script in `tmp/cf-to-aws/` run with profile `graphty`:

- `aws-preflight.sh` (before 1): free-tier plan state; `aws lambda get-account-settings`; every Budget's
  limit, actual and forecast (`aws budgets describe-budgets`); GitHub OIDC providers; and a reminder to read
  the spend limit in AWS Settings > Billing. Its output goes into this design.
- `agent-read-access.sh` (before 1): lets graphty-deploy read `lambda:GetAccountSettings`,
  `budgets:ViewBudget`, `scheduler:GetSchedule`, CloudWatch metrics and logs of `graphty-ci-*`, the
  free-tier plan state, and Cost Explorer (each call costs 0.01 USD; never in a loop).
- `deploy-stack-update.sh` (after 2 merges): deploys the changed `graphty-health-deploy` stack once.
- `deploy-ci.sh` (when needed): starts the CodeBuild deploy by hand.
- `scheduler-key.sh <pem file>` (after 4 is deployed): converts the new App key to PKCS#8 under
  `tmp/cf-to-aws/` with mode 600, passes it to `aws ssm put-parameter --value file://...` (never on the
  command line), then `shred`s it.
- `local-token-hash.sh` (after 6 is deployed): writes the local token's hash to SSM.
- Site repositories (after 7): recommit `deploy.yml` from `tools/channel/site-deploy.yml` in graphty-site and
  graphty-nightly and set `RESULTS_SHADOW_URL` there; at cutover, swap both variables there and in `.env`.

## 7. Risks

- **A loader misses rows a query needs**: a wrong plan, quarantine or release answer. Guard: queries
  unchanged; the per-route parity suite on a production-size fixture; 7 days of read comparison.
- **Cost above the estimate**: Gate 1 on D1's counts at 1x and 3x; the `graphty-ci` Budget; the hourly
  request alarm.
- **The health Budget trips** (it counts the whole account, before credits, and health may already be near
  it): the health Lambdas are denied, including the collector that starts deploys. The release train is
  unaffected (its roles are not on the deny list, and rollbacks are variable swaps); a forward fix deploys by
  `deploy-ci.sh`. Guard: preflight reads the actual spend; limit to 15 USD.
- **Spend limit reached**: every Lambda in the project denied. Guard: preflight; Cloudflare scheduler backup;
  results variables swap back.
- **Public Function URL refused by the project's policies**: HTTP API instead, and the 3x cost recomputed
  (it would pass 5 USD at the top of the range: stop and talk).
- **Two writers change the same row**: conditional writes on versions, the one-active-entry marker for
  quarantine, the request retried 3 times, then 503.
- **Durations table throttled in a burst**: slower duration posts, never a critical path; SDK and client
  retries; switch it to on demand (about 0.30 to 0.85 USD a month) if throttling is seen.
- **`node:sqlite` in Lambda's Node 22**: the buildspec runs the adapter tests on Node 22 before deploying.
- **us-east-2 outage**: results calls fail open as today; the Cloudflare scheduler backup starts the train.
- **Two backends running different code for up to an hour after a merge**: shadow-diff records carry both
  deployed commits.
- **One deploy build for both stacks**: path-based stack selection; a failing `graphty-ci` deploy does not
  block a health-only change.

## 8. Review answers

Each blocking finding of the adversarial review, and where it is answered:

- **Cost over 5 USD at 3x**: the nx cache is out of this build (4.5); loaders are windowed and route-specific
  (1.1); durations are packed per job into a provisioned free-tier table; PITR only on the small release
  table. Recomputed with measured invocation and duration volumes: 1.51-4.23 USD at 3x (4.2). Gate 1 checks
  both columns again with D1's counts.
- **Plan load size and latency**: whole-shard variants load about 9-12 runs, file-selected ones at most 60,
  only 9 rows per file inserted, one vCPU, a 2 s test and a p95 cutover criterion (1.1, 3).
- **Small tables loaded whole and growing**: no table is loaded whole; site and verdict are keyed by time and
  windowed as the SQL windows them, the rest by key (1.1).
- **CodeBuild recurring cost missing**: a monthly line, deploys only of the changed stack, narrow trigger
  paths (4.2, 6).
- **Scheduler wrapper**: `scheduledTime` passed, `run()`/`checkDeployKeys()` awaited with an explicit
  `fetch`, never throws, async retries 0 (1.2).
- **A doubled train is not safe**: the shared dispatcher skips a slot that already has a train; Cloudflare
  stays on as a backup at :10; nothing is let to run twice (1.2, 5.1).
- **Verify and repair with server-clock columns**: clock columns ignored, natural keys for `channel_move` and
  `quarantine`, repair deletes target-only rows, derived tables copied wholesale at cutover (2.2, 2.3).
- **GSI lag in flaky detection**: siblings with the same sha, variant and inputs are one base-table
  partition read consistently (1.1).
- **`d1 export` blocks D1**: paged SELECTs outside the slots and outside release runs (2.2).
- **Reserved concurrency**: measured account limit 400; 21 reserved here leaves 352; the preflight re-reads it
  (3, 6).
- **Writes that were not dual-written**: every non-GET mirrored, spool re-posts to both, graphty-nightly and
  `site-deploy.yml` added, verify covers S3 histories (2.3, 6).
- **Failure rows are replaceable**: unconditional writes, the whole `INV#` partition loaded, children
  persisted first, no transactions (1.1).
- **Queries by (variant, inputs) across shas**: index `VI#<variant>#<inputs>` by time (1.1).
- **nx cache demand undercounted**: the corrected demand is in 4.5, which is why the cache is not built.
- **Spend limit and public endpoints**: preflight records the spend limit; auth before any read, reserved
  concurrency, request alarm, whole-account Budget, and a Cloudflare fallback for a paused project (1.1, 4.4,
  5.3). The suggested HTTP API is not used: a throttle limits rate, not cost, and it would add up to 1.35 USD
  at 3x.

Notes also taken in: payload 2.0 and both Function URL permissions (1.1), migrate role through a GitHub
environment and a created or imported OIDC provider (2.2), own concurrency group for migrate jobs (2.2),
egress gzip (1.1), deploy-time differences recorded (2.4), secrets handling in `scheduler-key.sh` and KMS
scoping (1.2, 6), bucket settings asserted (6), AWS outage rollback without verify (5.3). Found while
checking, filed separately: `tools/channel/promote.mjs` calls `GET /v1/site?sha=`, a route `service.js` does
not have.
