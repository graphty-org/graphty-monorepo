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
- **kind**: what produced an invocation: `pr`, `full`, `bisect`, `base` (a re-run of a file at a
  pull request's base by `base-check.yml` on master, 6.3) or `local`. All but `local` are
  **evidence**, but only `full`, `bisect` and `base`, which run master's own workflow code, can excuse
  a failure or let a quarantine pass a pull request.

## 1. What in the record each choice answers

- **The ledger lived on one desktop** and learned CI's results only by downloading artifacts afterwards.
  Now CI writes directly; the desktop is one more writer, of kind `local`, never evidence.
- **On 2026-10-22 golden sat nine hours** while 10 land checks failed tests golden itself failed, and
  nothing could prove it. Now a failing pull request is excused, loudly, when master's own evidence
  shows the same failure on its base, and a base re-run on master's code supplies that evidence when
  none exists yet (6.3).
- **Flaky tests were blamed on the wrong landing.** Flaky now means passed and failed on the same commit
  and inputs key, nothing else (6.1). Timing is never evidence.
- **Killed runners and whole-shard timeouts were read as test failures.** Outcome `infra` never counts
  against a test (4.3), and failures sent instantly survive a job that dies later.
- **The pipeline's own machinery caused most gate failures.** Every call fails open with a fast timeout;
  a missing answer can only make a run longer or stricter (section 8).
- **The shared GitHub account ran out of API requests on 2026-10-04.** Issues and dispatches come from
  the workflows that act on the store's answers, each with its own `GITHUB_TOKEN` budget (2.1).
- **githerd, a standing daemon with write power, added failure modes without removing any.** The
  Worker stores and answers; it decides nothing on GitHub (2.1).
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
- **GitHub identity:** the Worker reads GitHub only, for the ancestry check (is `baseSha` on master's
  history: `GET /compare/master...<sha>`), with the existing App `graphty-release-scheduler` and the
  **Contents: read** the owner adds; the App never gets Contents: write. It gets a second private key
  so the two Workers share none. Secrets on `graphty-results`: `APP_ID`, `INSTALLATION_ID`,
  `PRIVATE_KEY`, `LOCAL_TOKEN_HASHES`. `buildJwt()` from `tools/release-scheduler/src/worker.js` is
  reused.

### 2.1 The Worker decides nothing

Earlier drafts had the Worker dispatch every CI bisect, re-run pull requests' failed jobs, dispatch
base checks, file and close issues through an outbox cron and end quarantines on a cron: a standing
decision-maker with write power, the shape of githerd that the pipeline already removed once, and one
whose outage would fail the red loop closed. Superseded. The Worker computes and answers; the actor
is always a workflow on master or the pipeline round:

| Decision                                                          | Who acts on the store's answer                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Dispatch the bisect, file the red issue                           | release.yml (`bisect-ci` job, or the verdict), with `GITHUB_TOKEN` (channels 6)      |
| File or comment a quarantine issue                                | the full-run or bisect job's `run-group.mjs` that the answer names, `issues: write`  |
| A quarantine leaves on issue close                                | release.yml's `pick` posts the closed quarantine issues (one GraphQL query) each run |
| 20 passes, 14 days, `infra` for a job that died before its record | computed when the plan or status is read; no cron                                    |
| Base check of a pull request failure, re-run of its job           | the pipeline round (agent token, Actions: write)                                     |
| Budget trend alarm                                                | the `timings` job that received it (budgets 1.6)                                     |

If the Worker is down, release.yml still files the red issue and dispatches the bisect from the
lanes' own results, so the red loop fails open like everything else. There is no `outbox` table and
no cron except the daily retention delete.

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
               + env               runner image (ImageOS + ImageVersion) and class, CPU count, file
                                   parallelism, Node version, browser revision, GPU adapter (vendor,
                                   architecture, driver; T4, Hosts and local GPU runs)
               + flags             "off" or "on"
               + baselines         for a story test: the git blob id of its baseline PNG ) [first 16 hex]
```

`inputKey()` and `shardKeys()` move to `tools/results/inputs.mjs`; the gate-only parts of
`tools/prepush-inputs.mjs` (`gateKey`, `passStore`, the `PREPUSH_*` lane variables) are deleted. The
baseline blob makes approving a new picture start a new history, as the owner decided. The runner image
makes a GitHub image update start new histories instead of looking like flakiness, and the CPU count
and parallelism keep a bisect's repetitions from counting as the same inputs as a full-run shard
under other load. The GPU, Hosts, macOS work protection, lifecycle and LLM jobs run their tests
through `run-group.mjs` too, so each lane's records carry this key and serve as bisect evidence.

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
and failures in one `batch()` (one transaction). D1 binds at most 100 parameters per statement, so
file rows (6 columns) go in multi-row statements of 16 rows; a full-run job's record of about 3,000
files is about 190 statements in one batch. The d1-shim suite has a 3,000-file record test. The id is the idempotency key (`INSERT OR IGNORE`).
The answer lists what the rules of section 6 concluded (`flaky: camera > zooms, quarantined, issue
pending`), which the wrapper prints.

### 5.2 Send a failure the moment it happens

`POST /v1/failures` with `{ invocation, file, name, status, message }`, from the Vitest reporter
`tools/results/reporter.mjs` in `onTestCaseResult` (Vitest 4.1). Not awaited; the reporter settles its
promises in `onTestRunEnd`. The record later completes the row. Two things depend on it:

- **The bisect reads a live list.** _Superseded: the Worker dispatches nothing (2.1)._ release.yml
  dispatches `bisect.yml` when the ci.yml lane ends red (channels section 6); every broken test of the
  run (`try = 2` failed too) is appended to the run's broken list in the store as it happens, and each
  bisect phase reads the current list, so one red run has exactly one bisect.
- **Batching, never dropping.** The reporter sends each of an invocation's first 20 failures at once;
  after that it sends one event every 5 seconds holding every failure since the last, so a failure
  never waits for the last step and a broken setup failing thousands of tests sends a few events a
  minute, not thousands.
- **A job that dies keeps its evidence.** Failures whose run ended with no record of their invocation
  read as outcome `infra` when the store is queried: shown, never counted.

### 5.3 Read once at the start of a run

`GET /v1/plan?sha=&base=&variants=&inputs=&files=<changed files>`, **one call per run**: the plan step
(the first step of Build on a pull request, the `pick` job of a full run) asks for every variant the
run will execute and hands the answer to every job as the artifact `results-plan`. About 70 jobs
calling D1 in the same second would make a slow minute drop the quarantine for some jobs and not
others, and a known-quarantined test would then turn a full run red. On a full run the one call gets
one retry after a short backoff, because a false red costs a 6-hour slot. It answers:

- `quarantine`: active entries for the job's families (file, name, issue, expires).
- `passedWithInputs`: per variant, a `passed` evidence invocation with exactly this inputs key (7.1).
- `failingOnBase`: failures (file, name, key, invocation, issue) recorded on exactly `base`, or on a
  master commit after `base` up to master's tip with the same inputs key, by kinds `full`, `bisect` or
  `base` only, never `pr` (6.3).
- `order`: files of the variant that failed in evidence runs in the last 7 days, newest first (7.2).
- `fileMs`: each file's median milliseconds over its last 9 evidence runs, for slicing shards.

Also `GET /v1/test?file=&name=` (for `cli.mjs why`), `/v1/status`, and `/v1/health` (no credential).

### 5.4 Credentials

- **CI: GitHub Actions OIDC.** Test jobs get `permissions: id-token: write`; the client requests a token
  with audience `graphty-results` and sends it as a bearer token, reusing it until 60 seconds before its
  `exp`. The Worker checks the RS256 signature against GitHub's JWKS (cached by `kid`), `iss`, `aud`,
  `exp` and `repository_id` (numeric, survives a rename), then takes kind and commit from the claims:
  `event_name` `pull_request` is `pr` (the `sha` claim is the merge commit and must equal the body's).
  Kinds `full`, `bisect` and `base` are accepted only when `ref` is `refs/heads/master` and
  `job_workflow_ref` names master's own `release.yml`/`ci.yml`, `bisect.yml` or `base-check.yml` at
  `refs/heads/master`. The agent account has Actions write and could dispatch a modified copy of a
  workflow on its branch; that run's `ref` is the branch, so it can only ever write `pr` records.
- **Local: a scoped token** `GRAPHTY_RESULTS_TOKEN` in the root `.env`, read the way other tools read it
  (agents cannot `Read` `.env`). The Worker holds only SHA-256 hashes (`LOCAL_TOKEN_HASHES`,
  comma-separated, so rotation adds the new one before removing the old). It reads everything and writes
  only kind `local`.
- **Reads need a credential.** Failure messages can quote paths and data; an open endpoint invites
  scraping.

What a pull request can do: its CI runs its own copy of the client, so it can post false results for its
own merge commit. It cannot write `full`, `bisect`, `base` or `local`, touch another commit, or remove a
quarantine. Its records never excuse anything (6.3) and never let a pull request pass behind a
quarantine (6.1). The worst is a fabricated pass-and-fail pair that opens a quarantine issue for a
test, and that is never silent: the `priority:critical` issue names both invocations.

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
owner's rule of 2026-10-22). On a full run or a bisect the job is then green, and its summary says so.

**`[NEW-FLAKY]` on a pull request.** 78% of flaky tests are flaky from the day they were written, so a
pull request may not merge new flakiness. On kind `pr`, a test that failed and then passed fails the
check as `[NEW-FLAKY]` only when the pull request changed the test's file or its import closure.
Otherwise the pull request could not have caused it and cannot fix it (pipeline and test changes stay
separate), so it passes loudly as `[FLAKY-UNRELATED]` with a warning annotation, and the pipeline round
dispatches `base-check.yml` with `repeat: 5` for that file at the base. That run is master's code, so
its records are evidence: a pass and a fail there quarantine the test with its `priority:critical`
issue. A pull request's own records never quarantine. An `unstable` story (two shots disagree)
follows the same rule.

### 6.2 Broken

**Broken on a commit:** failed in the run and in the retry on the same commit and inputs (or in a run
with more than 5 failing files). On a `full` run it dispatches the bisect (5.2); on a pull request it
fails the check unless 6.3 excuses it. A test with 4 or more full-run verdicts in a variant, 80% or more
failing, is reported as broken and never quarantined (Trunk's split, kept from the ledger design: Meta
found a deterministically broken test can score near zero flakiness).

### 6.3 A failure master already has

A pull request must not stay red for a test master already fails, and the failure must not be hidden,
and the pull request's own client must not be able to grant the excuse. When a pull request's group
fails test T in file F:

1. T stays failing if the pull request changes F or its import closure.
2. T is excused if the plan's `failingOnBase` has T with the same key, from `full`, `bisect` or `base`
   records only.
3. Otherwise T passes anyway, loudly, as `[UNRELATED] <test> ... this pull request did not touch it`: a
   warning annotation and a line in the job summary (2026-10-27, #3925: a failure with another source must
   not block merges -- every open pull request was red on one master defect, and the old `[KNOWN?]` wait
   needed a base check nothing dispatched; the full run with bisect and revert is the net). In the background
   ci.yml's `base-checks` job dispatches `base-check.yml` on master (`workflow_dispatch`, inputs `base`,
   `file`, `variant`, `repeat`, `pr`) once per test file, variant and base: it asks the store first
   (`POST /v1/base-checks`, kind `pr`, which answers `dispatch: true` only the first time), so later pull
   requests and re-runs on the same base reuse the one check. The base check checks out the base, builds the
   package from nx's cache, runs F and posts kind `base`. If F fails there, it files or updates one
   priority:critical `Failing on master` issue per signature (the same failure on several pull requests
   lands on that one issue); if F passes there, it comments on the pull request so the round looks for a
   flaky test or a cause in it. This is `exonerate()` of `tools/test-ledger.mjs` moved onto master's code.
   It costs one file's run per test per base.
4. Still failing, whatever the store says: a test the pull request touched (rule 1), a crash, an unhandled
   error, a coverage or build failure (none is a test failure the judge sees), any GPU family
   (`webgpu-graph-algorithms*`), and the screenshot gate.

An excused failure prints `[KNOWN] <test> fails the same way on master <sha>, issue #N`; the base-check
run files or updates one `Failing on master: <first line>` issue per signature (`bug`, `priority:high`,
`effort:medium`). Full runs and bisects never excuse anything.

### 6.4 Local and CI disagree

A clean (not dirty) `local` invocation that failed T, on a tree where an evidence invocation of the same
variant passed T, is a **parity mismatch**: one `Local and CI results differ: <test>` issue per
signature (`bug`, `priority:high`) naming both environments. Story tests, whose screenshot comparison is
part of the test, are covered the same way; CI is the reference until parity is proven. Local results
feed nothing else.

### 6.5 Quarantine

The Worker holds the list and computes it; workflows file its issues (2.1).

- **Enters** only through 6.1: never by hand, never through an API call naming a test.
- **Applies** to every pull request and full run through the plan. A quarantined test still runs; its
  failure prints `[QUARANTINED] ... issue #N` with a warning annotation and does not fail the job. Never
  for `webgpu-graph-algorithms*` families or the screenshot gate (the rules of `checkQuarantine()` in
  `tools/test-ledger.mjs`, now enforced by the Worker).
- **Leaves** when its issue closes (release.yml's `pick` posts closed quarantine issues every run),
  after 20 consecutive passing evidence verdicts, or after 14 days (the owner's rules of 2026-10-22),
  each computed when the plan is read.
- **With no plan nothing is quarantined,** so the failure fails the job: stricter, never looser.

### 6.6 Issue filing

_Superseded (2.1): no outbox._ The Worker's answer to a record names the issues to file or comment;
the job that posted it does so with its `GITHUB_TOKEN` and posts the issue number back. One issue per
signature (`tracked_issue`), carrying `<!-- results signature=<sig> -->` so a lost post-back is found
again by a search. Issue text is `fileIssue()` from `tools/test-quarantine.mjs` plus invocation links.

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
failure event, one try (the full run's plan read gets one retry, 5.3). Unknown means run.

- **Plan unavailable** (Worker or D1 down, slow, erroring): empty plan, so no reuse, no quarantine, no
  excuse. The job summary says `results service unreachable: ran everything, applied no quarantine`.
- **Record unavailable:** written to `test-results/results-spool/<id>.json` and uploaded as artifact
  `results-spool-<job>`. A `Results backfill` job at the end of `ci.yml` (`if: always()`, not required,
  about 20 seconds) re-posts them. Still down: that history is lost, so later runs only reuse less.
- **Failure event lost:** the record carries it; only the early bisect start is lost.
- **Job killed before its record:** its events are stored and read as `infra` (5.2).
- **Duplicate post** (a retried step, a backfill): `INSERT OR IGNORE` on the id.
- **No OIDC token** (a fork, a missing permission, a run Dependabot triggered, which gets a read-only
  token and no `id-token: write`): nothing read, empty plan, the record spooled; the `Results backfill`
  job of a Dependabot run cannot post either, so `results-backfill.yml` (on `workflow_run`, master's
  ref) posts spooled records of such runs as kind `pr`. Reason in the summary.
- **GitHub down for issues or dispatch:** the acting job fails and says so; a red verdict with no
  bisect record shows in `GET /v1/status`, and the pipeline round dispatches it.
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

- **Jobs and steps:** _superseded (settled 3): no Worker poll._ Each run's last `timings` job
  (`if: always()`, so it sees killed jobs too) reads its own run's jobs and steps and posts them.
- **nx tasks:** the Build job runs nx with `NX_PROFILE=tmp/nx-profile.json` and posts the task spans to
  `POST /v1/durations`. The Sentry plugin regression would have shown as one task growing.
- **Test files:** `file_run.ms`.

Durations never judge a test result.

## 11. In CI and locally

- Every test job in `ci.yml`, the full-run and the bisect workflows gets `permissions: id-token: write`
  and runs `node tools/results/run-group.mjs <shard>` instead of `matrix.test-command`. The wrapper
  computes the inputs key, takes the run's plan from the `results-plan` artifact, skips or runs, adds `--reporter=./tools/results/reporter.mjs`
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
  (open quarantines, failing-on-master tests, the last full run's failures, red verdicts with no
  bisect, last write)
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
- Add **Contents: read** to the `graphty-release-scheduler` App's repository permissions (for the
  ancestry check; the installation then asks to accept the change).
- Generate a second private key for the `graphty-release-scheduler` App, convert it to PKCS#8 as in
  `tools/release-scheduler/README.md`, and `npx wrangler@4 secret put` it with `APP_ID` and
  `INSTALLATION_ID` on the `graphty-results` Worker.
- Create a local token (`openssl rand -hex 32`), put it in `.env` as `GRAPHTY_RESULTS_TOKEN`, and its
  SHA-256 in the Worker secret `LOCAL_TOKEN_HASHES`.
