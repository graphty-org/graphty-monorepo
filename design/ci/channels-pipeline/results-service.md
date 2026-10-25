# The test results service

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

Status: proposed, 2026-10-24. Issue #3418. Part of the channels pipeline design (canary, nightly and
graphty.app; every branch reaches master through its own pull request; the full run every 6 hours).

The results service is a Cloudflare Worker with a D1 database (Cloudflare's hosted SQLite). Every CI
test job writes what it ran to it, sends each failure the moment it happens, and reads it once at the
start of a run. It holds test-group runs, failures, durations and the quarantine. It replaces the local
test ledger (`tools/test-ledger.mjs` and its SQLite index in the main checkout's `tmp/test-ledger/`), the
committed quarantine list (`tools/test-quarantine.json`) and the local quarantine state
(`tmp/test-quarantine/state.json`).

Words used below:

- **test group**: one run of one shard's command from `tools/ci-test-matrix.mjs`, or of selected test
  files within one shard. A CI test job runs one or more.
- **invocation**: the stored record of one test group run.
- **variant**: shard family (shard name without its slice number) + feature-flag configuration
  (`flags=off` or `flags=on`) + run shape (`whole` or `selected`). A test has one history per variant.
- **inputs key**: a content hash of everything a test group's result can depend on (section 3).
- **full run**: the every-6-hours run on master's tip, or one the owner starts out of schedule.
- **kind**: what produced an invocation: `pr`, `full`, `bisect`, `base` (a re-run on a pull request's
  base, 6.3) or `local`. All but `local` are **evidence**.

## 1. What in the record each choice answers

- **The ledger lived on one desktop** and learned CI's results only by downloading artifacts afterwards.
  Now CI writes directly; the desktop is one more writer, of kind `local`, never evidence.
- **On 2026-10-22 golden sat nine hours** while 10 land checks failed tests golden itself failed, and
  nothing could prove it. Now a failing pull request re-runs the failing files on its base in the same
  job; a matching failure there excuses it, loudly, and is stored so the next pull request on that base
  needs no re-run (6.3).
- **Flaky tests were blamed on the wrong landing.** Flaky now means passed and failed on the same commit
  and inputs key, nothing else (6.1). Timing is never evidence.
- **Killed runners and whole-shard timeouts were read as test failures.** Outcome `infra` never counts
  against a test (4.3), and failures sent instantly survive a job that dies later.
- **The pipeline's own machinery caused most gate failures.** Every call fails open with a fast timeout;
  a missing answer can only make a run longer or stricter (section 8).
- **The shared GitHub account ran out of API requests on 2026-10-04.** The Worker files issues and
  dispatches workflows as a GitHub App installation, which has its own budget.
- **A CI Build regression went unnoticed for four days.** Job, step and nx task durations land in the
  same store, so the time-budget alarms have a history (section 10).
- **Local and CI screenshots differed and were worked around.** A clean local failure where CI passed
  on the same tree is filed as a parity bug (6.4).

## 2. Where it lives, who owns it, how it ships

- **Code:** `tools/results-service/`, beside `tools/release-scheduler/` and laid out the same way:
  `wrangler.toml`, `src/worker.js`, `src/signature.js`, `migrations/0001_init.sql`, `test/`, `README.md`.
  The CI and local client is `tools/results/` (`client.mjs`, `run-group.mjs`, `reporter.mjs`,
  `inputs.mjs`, `cli.mjs`).
- **Names:** Worker `graphty-results`, D1 database `graphty-results` with location hint `enam` (eastern
  North America, next to GitHub's hosted runners), on the Cloudflare account that runs
  `graphty-release-scheduler`. URL `https://graphty-results.<account>.workers.dev`, in the repository
  variable `RESULTS_URL` and in `.env`. No custom domain.
- **Deployment:** new workflow `.github/workflows/results-service.yml`, on a push to master touching
  `tools/results-service/**` or `tools/release-scheduler/**`, and on dispatch: `node --test` on the
  Worker's tests, `npx wrangler@4 d1 migrations apply graphty-results --remote`, `npx wrangler@4 deploy`
  for both Workers. Secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts edit and D1 edit only) and
  `CLOUDFLARE_ACCOUNT_ID`.
- **Ownership:** both directories are CODEOWNERS paths owned by the owner, like every pipeline path.
  Agents propose; the owner's review merges. The pipeline round operates the service (reads `status`,
  works its issues) and never changes its rules in the same pull request as a product fix.
- **GitHub identity:** the existing App `graphty-release-scheduler` already has exactly the permissions
  needed (Actions read and write: dispatch the bisect, read run timings; Issues read and write). It gets a
  second private key so the two Workers share none. Secrets on `graphty-results`: `APP_ID`,
  `INSTALLATION_ID`, `PRIVATE_KEY`, `LOCAL_TOKEN_HASHES`. `buildJwt()` from
  `tools/release-scheduler/src/worker.js` is reused.
- **Tests:** D1 speaks SQLite, so the Worker's tests run the real migrations and queries on
  `node:sqlite` through a 20-line adapter (`test/d1-shim.mjs`: `prepare().bind().all()/first()/run()`,
  `batch()`), with GitHub and the OIDC key set injected as in `tools/release-scheduler/test/`. No new
  dependency.
- **Schema changes are additive only.** The client sends `X-Results-Schema: <n>`; the Worker ignores
  fields it does not know. A client and a Worker that went live at different times never break each
  other.

## 3. The inputs key

```
inputs = sha256( shard input key   inputKey() from tools/prepush-inputs.mjs: the package, the packages
                                   it depends on or reads by path, their build outputs, root files, lockfile
               + selected files    sorted, for run shape "selected"
               + env               runner image (ImageOS + ImageVersion), Node version, browser revision
               + flags             "off" or "on"
               + baselines         for a story test: the git blob id of its baseline PNG ) [first 16 hex]
```

`inputKey()` and `shardKeys()` move to `tools/results/inputs.mjs`; the gate-only parts of
`tools/prepush-inputs.mjs` (`gateKey`, `passStore`, the `PREPUSH_*` lane variables) are deleted. The
baseline blob makes approving a new picture start a new history, as the owner decided. The runner image
makes a GitHub image update start new histories instead of looking like flakiness.

## 4. Data model

`migrations/0001_init.sql`:

```sql
CREATE TABLE invocation (
  id TEXT PRIMARY KEY,      -- "<run_id>.<run_attempt>.<job>.<group>.<try>" or "local.<ms>.<host>.<pid>.<group>"
  kind TEXT NOT NULL,       -- set by the Worker from the credential, never from the body
  sha TEXT NOT NULL, tree TEXT NOT NULL, base_sha TEXT, pr INTEGER, ref TEXT,
  variant TEXT NOT NULL, inputs TEXT NOT NULL, env TEXT NOT NULL,
  try INTEGER NOT NULL,     -- 1 = the run, 2 = the retry of its failed files in the same job
  outcome TEXT NOT NULL,    -- passed | failed | error | infra | cancelled
  reused_from TEXT, dirty INTEGER NOT NULL DEFAULT 0, note TEXT, run_url TEXT,
  started_at INTEGER NOT NULL, secs REAL NOT NULL);
CREATE INDEX inv_variant_inputs ON invocation(variant, inputs, outcome);
CREATE INDEX inv_sha ON invocation(sha);
CREATE TABLE file_run (invocation TEXT NOT NULL, file TEXT NOT NULL,
  passed INTEGER, failed INTEGER, skipped INTEGER, ms INTEGER, PRIMARY KEY (invocation, file)) WITHOUT ROWID;
CREATE TABLE failure (invocation TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  status TEXT NOT NULL, signature TEXT NOT NULL, key TEXT NOT NULL, first_line TEXT,
  message TEXT,             -- first 2,000 characters
  seen_at INTEGER NOT NULL, PRIMARY KEY (invocation, file, name)) WITHOUT ROWID;
CREATE INDEX failure_test ON failure(file, name, key);
CREATE TABLE quarantine (family TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  issue INTEGER, reason TEXT, proof TEXT, since INTEGER NOT NULL, expires INTEGER NOT NULL,
  passes INTEGER NOT NULL DEFAULT 0, left_at INTEGER, left_why TEXT, PRIMARY KEY (family, file, name, since));
CREATE TABLE tracked_issue (signature TEXT PRIMARY KEY, kind TEXT NOT NULL,  -- flaky | failing-on-master | parity
  number INTEGER, state TEXT, opened_at INTEGER, last_seen INTEGER);
CREATE TABLE outbox (id INTEGER PRIMARY KEY, action TEXT NOT NULL, payload TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0, done_at INTEGER);
CREATE TABLE duration (run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, workflow TEXT NOT NULL,
  job TEXT NOT NULL, step TEXT NOT NULL DEFAULT '', task TEXT NOT NULL DEFAULT '', sha TEXT, kind TEXT,
  started_at INTEGER, ms INTEGER, conclusion TEXT, PRIMARY KEY (run_id, attempt, job, step, task)) WITHOUT ROWID;
```

- **Passes per file, failures per test,** as in today's ledger: a test passed when its file ran with no
  failure row for it and its usual skip count. A full run is about 2,800 file rows, not 50,000 test rows.
- **Signature and key:** `failureHashes()` from `tools/test-ledger.mjs` moves unchanged to
  `tools/results-service/src/signature.js`, imported by Worker and client alike, so they never hash
  differently. The key (first two informative lines, numbers kept) decides whether two failures are the
  same; the signature (first line with numbers masked plus two project stack frames; for an expired wait,
  `timeout` plus the test file) groups failures into one issue.
- **Outcomes** (4.3): `outcomeOf()` from `tools/test-ledger.mjs`, reused: `passed`; `failed` (the
  failing tests alone explain exit 1); `error` (an unhandled error, a coverage threshold); `infra` (a
  signal, exit 124, 137 or 143, no Vitest summary, unparseable JUnit, or failure events with no record);
  `cancelled`. Only `passed` and `failed` count as evidence or toward any rate.

## 5. The API

JSON bodies; every call carries a credential (5.4).

### 5.1 Write a test group's record

`POST /v1/invocations`, one per test group, the last thing the group's wrapper does before it exits with
the job's verdict:

```text
{ id: "40109261957.1.graphty-element-browser-3.0.1", sha, tree, baseSha,
  variant: "graphty-element-browser|flags=off|whole", inputs: "9f2c...",
  env: "ubuntu24/20261019.1|node22.23.2|chromium-1187", try: 1, outcome: "failed",
  startedAt, secs: 612.4, dirty: false,
  files: [["graphty-element/test/browser/x.test.ts", 41, 1, 0, 3120]],      // passed failed skipped ms
  failures: [{ file, name: "camera > zooms", status: "fail", message }] }
```

The Worker hashes `message` itself, sets `kind` from the credential, and writes invocation, file rows
and failures in one `batch()` (one transaction). The id is the idempotency key (`INSERT OR IGNORE`).
The answer lists what the rules of section 6 concluded (`flaky: camera > zooms, quarantined, issue
pending`), which the wrapper prints.

### 5.2 Send a failure the moment it happens

`POST /v1/failures` with `{ invocation, file, name, status, message }`, from the Vitest reporter
`tools/results/reporter.mjs` in `onTestCaseResult` (Vitest 4.1). Not awaited; the reporter settles its
promises in `onTestRunEnd`. The record later completes the row. Two things depend on it:

- **The full run's bisect starts before the run ends.** A failure from a `full` invocation with `try = 2`
  (the retry failed it too: broken on that commit and inputs) makes the Worker send `repository_dispatch`
  type `test-broken` with `{ runId, sha, tests: [{ file, name, key, variant }] }`, once per run and
  variant, and the bisect workflow starts on only those files. In the record a failing job finished a
  median of 24 to 63 minutes into its run (`tmp/failure-position/ci-out.txt`); the bisect no longer
  waits for the slowest of 25 jobs.
- **A job that dies keeps its evidence.** Failures with no record 6 hours after their run completed are
  closed by the Worker's cron as outcome `infra`: shown, never counted.

### 5.3 Read once at the start of a run

`GET /v1/plan?sha=&base=&variants=&inputs=&files=<changed files>`, one call per job, answers:

- `quarantine`: active entries for the job's families (file, name, issue, expires).
- `passedWithInputs`: per variant, a `passed` evidence invocation with exactly this inputs key (7.1).
- `failingOnBase`: failures (file, name, key, invocation, issue) recorded on exactly `base` by kinds
  `full`, `bisect` or `base` (6.3).
- `order`: files of the variant that failed in evidence runs in the last 7 days, newest first (7.2).
- `fileMs`: each file's median milliseconds over its last 9 evidence runs, for slicing shards.

Also `GET /v1/test?file=&name=` (for `cli.mjs why`), `/v1/status`, and `/v1/health` (no credential).

### 5.4 Credentials

- **CI: GitHub Actions OIDC.** Test jobs get `permissions: id-token: write`; the client requests a token
  with audience `graphty-results` and sends it as a bearer token, reusing it until 60 seconds before its
  `exp`. The Worker checks the RS256 signature against GitHub's JWKS (cached by `kid`), `iss`, `aud`,
  `exp` and `repository_id` (numeric, survives a rename), then takes kind and commit from the claims:
  `pull_request` is `pr` (the `sha` claim is the merge commit and must equal the body's); the full-run
  workflow on `refs/heads/master` is `full`; the bisect workflow is `bisect`; a `base` record needs a `pr`
  credential and a `baseSha` that is a master commit (one cached GitHub call).
- **Local: a scoped token** `GRAPHTY_RESULTS_TOKEN` in the root `.env`, read the way other tools read it
  (agents cannot `Read` `.env`). The Worker holds only SHA-256 hashes (`LOCAL_TOKEN_HASHES`,
  comma-separated, so rotation adds the new one before removing the old). It reads everything and writes
  only kind `local`.
- **Reads need a credential.** Failure messages can quote paths and data; an open endpoint invites
  scraping.

What a pull request can do: its CI runs its own copy of the client, so it can post false results for its
own merge commit. It cannot write `full`, `bisect` or `local`, touch another commit, or remove a
quarantine. The worst is a fabricated pass-and-fail pair that quarantines a test, and that is never
silent: a `priority:critical` issue names both invocations, and every let-through failure is printed.

## 6. The rules

An excused failure is still a failure: every rate counts it.

### 6.1 Flaky

A test is **flaky** when two evidence invocations of one variant with the same commit and the same
inputs key disagree: one failed it, the other ran its file without failing it and with its usual skip
count. The usual pair is a job's run and its retry: the wrapper re-runs failed files once in the same
job (`runShard()` and `decide()` from `tools/test-quarantine.mjs`, unchanged, at most 5 files; more is a
breakage, not retried). A re-run of a workflow attempt counts too, because the inputs key says whether
anything changed. Timing, load and other commits are never evidence.

A flaky test is quarantined at once (6.5) with a `bug`, `priority:critical`, `effort:medium` issue (the
owner's rule of 2026-10-22). The job is green only because the test is now quarantined, and its summary
says so.

### 6.2 Broken

**Broken on a commit:** failed in the run and in the retry on the same commit and inputs (or in a run
with more than 5 failing files). On a `full` run it dispatches the bisect (5.2); on a pull request it
fails the check unless 6.3 excuses it. A test with 4 or more full-run verdicts in a variant, 80% or more
failing, is reported as broken and never quarantined (Trunk's split, kept from the ledger design: Meta
found a deterministically broken test can score near zero flakiness).

### 6.3 A failure master already has

A pull request must not stay red for a test master already fails, and the failure must not be hidden.
When a pull request's group fails test T in file F, the wrapper:

1. Leaves T failing if the pull request changes F.
2. Excuses T if the plan's `failingOnBase` has T with the same key on exactly the base commit.
3. Otherwise re-runs F on the base in the same job (`git worktree add` at `baseSha`, build the package
   from nx's cache, run F once, post as kind `base`), and excuses T if it fails there with the same key
   (for an expired wait: fails there at all). This is the land check's re-run in `exonerate()` of
   `tools/test-ledger.mjs`, moved into CI. It costs one file's run, only when a pull request fails.

An excused failure prints `[KNOWN] <test> fails the same way on master <sha>, issue #N`, and the Worker
files or updates one `Failing on master: <first line>` issue per signature (`bug`, `priority:high`,
`effort:medium`). Full runs and bisects never excuse anything.

### 6.4 Local and CI disagree

A clean (not dirty) `local` invocation that failed T, on a tree where an evidence invocation of the same
variant passed T, is a **parity mismatch**: one `Local and CI results differ: <test>` issue per
signature (`bug`, `priority:high`) naming both environments. Story tests, whose screenshot comparison is
part of the test, are covered the same way; CI is the reference until parity is proven. Local results
feed nothing else.

### 6.5 Quarantine

The Worker owns it.

- **Enters** only through 6.1: never by hand, never through an API call naming a test.
- **Applies** to every pull request and full run through the plan. A quarantined test still runs; its
  failure prints `[QUARANTINED] ... issue #N` with a warning annotation and does not fail the job. Never
  for `webgpu-graph-algorithms*` families or the screenshot gate (the rules of `checkQuarantine()` in
  `tools/test-ledger.mjs`, now enforced by the Worker).
- **Leaves** when its issue closes (an hourly cron, one GraphQL query for all open quarantine issues),
  after 20 consecutive passing evidence verdicts, or after 14 days (the owner's rules of 2026-10-22).
- **With no plan nothing is quarantined,** so the failure fails the job: stricter, never looser.

### 6.6 Issue filing

A decision that files or comments writes an `outbox` row in the record's batch, then calls GitHub at
once (`ctx.waitUntil`); the cron retries what failed every 5 minutes until it succeeds. One issue per
signature (`tracked_issue`), carrying `<!-- results signature=<sig> -->` so a lost row is found again.
Issue text is `fileIssue()` from `tools/test-quarantine.mjs` plus invocation links.

## 7. Test selection by history

The import-graph selector (`tools/test-select.mjs`) decides what a pull request runs. History never
removes a test it picked and never predicts:

- **Skip only on identical inputs.** A group whose variant and inputs key already have a `passed`
  evidence invocation is skipped and recorded with `reused_from`, exactly like the nx cache: one byte
  different and it runs. This is the local gate's pass reuse, moved to CI. Full runs never reuse.
- **Recent failures run first** within a shard (the plan's `order`), so a failing pull request fails
  sooner. The set of files is unchanged.
- **Rejected: history adds and drops.** The replay in `design/ci/history-selection.md` found added tests
  would have caught 0 of 9 recorded misses for 219 extra minutes, and no drop rule was safe.
  `pnpm run test:changed --budget` keeps its ranking as a developer aid, reading `/v1/plan`.

## 8. Fail open, and every other failure

`tools/results/client.mjs` uses `AbortSignal.timeout`: 5 seconds for the plan and the record, 2 for a
failure event, one try. Unknown means run.

- **Plan unavailable** (Worker or D1 down, slow, erroring): empty plan, so no reuse, no quarantine, no
  excuse. The job summary says `results service unreachable: ran everything, applied no quarantine`.
- **Record unavailable:** written to `test-results/results-spool/<id>.json` and uploaded as artifact
  `results-spool-<job>`. A `Results backfill` job at the end of `ci.yml` (`if: always()`, not required,
  about 20 seconds) re-posts them. Still down: that history is lost, so later runs only reuse less.
- **Failure event lost:** the record carries it; only the early bisect start is lost.
- **Job killed before its record:** its events are stored; the cron marks it `infra` (5.2).
- **Duplicate post** (a retried step, a backfill): `INSERT OR IGNORE` on the id.
- **No OIDC token** (a fork, a missing permission): nothing written, empty plan, reason in the summary.
- **GitHub down for issues or dispatch:** outbox and cron. A missed `test-broken` dispatch also shows in
  `GET /v1/status`, which the pipeline round reads.
- **Lost or damaged database:** D1 Time Travel restores any minute of the last 30 days. Nothing is
  decided from the store that a re-run cannot re-establish.

The service never turns a failure into a pass by itself: only a quarantine (two runs on the same inputs)
or a base re-run (6.3) excuses one, and both print it.

## 9. Volume and cost

Measured from the local ledger, 2026-10-08 to 2026-10-25: 14,203 invocations, 80,250 file rows, 612
failures, 3,124 test files, a 20 MB database (about 250 bytes a row with indexes). Projected:

Rows written a day: full runs (4 x about 2,800 files x 2 flag configurations) about 22,000; pull
requests (about 30 x about 800 selected files) about 24,000; retries, failures, invocations and
durations about 10,000; about 110,000 with index writes (about 2 per row).

Storage about 14 MB a day. Invocations and file rows are kept 120 days, failures 365 days (a daily cron
deletes in 5,000-row transactions), so the database stays under 2 GB. About 2,000 requests a day.

D1's free plan allows 100,000 rows written a day, which this exceeds. The **Workers Paid plan, 5 US
dollars a month,** includes 50 million rows written, 25 billion read, 5 GB of D1 storage and 10 million
requests a month; this uses under a tenth of each. Expected cost: 5 dollars a month, flat.

## 10. Durations

The time-limit alarms (another section of this design) read the `duration` table:

- **Jobs and steps:** every 15 minutes the Worker lists completed runs of `ci.yml`, the full-run workflow
  and `release.yml` and reads each run's jobs with steps (one REST call per run, about 40 runs a day, on
  the App's budget). This also records jobs that were killed, which a step inside them could not.
- **nx tasks:** the Build job runs nx with `NX_PROFILE=tmp/nx-profile.json` and posts the task spans to
  `POST /v1/durations`. The Sentry plugin regression would have shown as one task growing.
- **Test files:** `file_run.ms`.

Durations never judge a test result.

## 11. In CI and locally

- Every test job in `ci.yml`, the full-run and the bisect workflows gets `permissions: id-token: write`
  and runs `node tools/results/run-group.mjs <shard>` instead of `matrix.test-command`. The wrapper
  computes the inputs key, reads the plan, skips or runs, adds `--reporter=./tools/results/reporter.mjs`
  beside the JUnit reporter `ciReporters()` adds (`vitest.ci-junit.mjs`), retries failed files once,
  applies 6.3 and 6.5, posts the record and exits with the verdict. It is `tools/test-quarantine.mjs`
  without its local state, issue filing and list file.
- Where feature flags apply, a shard runs as both variants, `flags=off` and `flags=on`.
- A story test takes and compares its screenshot at its end, so its result is an ordinary test result
  whose inputs key carries its baseline blob.
- The JUnit artifact upload stays (7 days, for people reading a run). The upload to Mergify Test
  Insights is deleted: it duplicated this store.
- Locally, `pnpm run test:changed` posts `local` records when `GRAPHTY_RESULTS_TOKEN` is set
  (`GRAPHTY_RESULTS=0` turns it off). `node tools/results/cli.mjs why <file> [> <test>]` and `status`
  (open quarantines, failing-on-master tests, the last full run's failures, outbox depth, last write)
  replace `tools/test-ledger.mjs status` and `tools/test-quarantine.mjs status` in the pipeline round.

## 12. Rollout, and what happens to the local ledger

Each step is its own pull request:

1. The Worker, its migration and `results-service.yml`.
2. CI writes records and events and reads nothing, for one week of full runs and pull requests; every
   stored run is compared with its JUnit artifact to prove nothing is lost.
3. CI reads the plan; quarantine and 6.3 go live; `tools/test-quarantine.json` is deleted. The local
   ledger runs until this step, so there is never a day without a quarantine.
4. `node tools/results/cli.mjs import` posts the 14,203 desktop records as kind `local`, original kind
   in `note`: browsable, never evidence. Then deleted: `tools/test-ledger.mjs` and its tests; the state,
   issue and list code of `tools/test-quarantine.mjs` (the rest became `run-group.mjs`); the gate parts of
   `tools/prepush-inputs.mjs`; the ledger reader in `tools/test-history.mjs`; `TEST_LEDGER_RUN` and
   `TEST_LEDGER_KIND` in `vitest.ci-junit.mjs` and `tools/ci-test-matrix.mjs`; their CLAUDE.md rows; and
   `tmp/test-ledger/` and `tmp/test-quarantine/` in the main checkout. About 2,500 lines go; about 1,100
   (Worker with tests, client) arrive.

## 13. What the owner does

- Turn on Workers Paid (5 dollars a month) on the Cloudflare account that runs the release scheduler.
- Create a Cloudflare API token with only Workers Scripts edit and D1 edit; store it and the account id
  as repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Generate a second private key for the `graphty-release-scheduler` App, convert it to PKCS#8 as in
  `tools/release-scheduler/README.md`, and `npx wrangler@4 secret put` it with `APP_ID` and
  `INSTALLATION_ID` on the `graphty-results` Worker.
- Create a local token (`openssl rand -hex 32`), put it in `.env` as `GRAPHTY_RESULTS_TOKEN`, and its
  SHA-256 in the Worker secret `LOCAL_TOKEN_HASHES`.
