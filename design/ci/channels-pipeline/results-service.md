# The test results service

Status: proposed, 2026-10-24. Issue #3418. Part of the channels pipeline design (canary, nightly and
graphty.app; every branch reaches master through its own pull request; the full run every 6 hours).

The results service is a small Cloudflare Worker with a D1 database (Cloudflare's hosted SQLite). Every
CI test job writes what it ran to it, sends each failure the moment it happens, and reads it once at the
start of a run. It holds four things: test-group runs (invocations), failures, durations and the
quarantine. It replaces the local test ledger (`tools/test-ledger.mjs`, the SQLite index in the main
checkout's `tmp/test-ledger/`), the committed quarantine list (`tools/test-quarantine.json`) and the
gate's local quarantine state (`tmp/test-quarantine/state.json`).

Words used below:

- **test group**: one run of one shard's test command from `tools/ci-test-matrix.mjs`, or of a list of
  selected test files within one shard. One CI test job runs one or more test groups.
- **variant**: the shard family (the shard name without its slice number), the feature-flag
  configuration (`flags=off` or `flags=on`) and the run shape (`whole` or `selected`). One test has one
  history per variant.
- **inputs key**: a content hash of everything a test group's result can depend on (section 3).
- **full run**: the every-6-hours run on master's tip (or one the owner starts out of schedule).
- **kind**: what produced an invocation: `pr`, `full`, `bisect`, `base` (a re-run on a pull request's
  base, section 6.3) or `local`.

## 1. Why it exists, and what in the record it answers

| What went wrong                                                                                                                                                                                                             | What the service does about it                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The ledger lived on one desktop. CI's results reached it only by downloading JUnit artifacts after the fact, so the place that runs the tests (CI) and the place that remembers them (the desktop) disagreed about history. | CI writes directly. The desktop is one more writer, of kind `local`, never evidence.                                                                                                                                                           |
| On 2026-10-22 golden sat for nine hours while 10 land checks failed tests that golden itself failed, and nothing could prove it.                                                                                            | A pull request that fails a test re-runs the failing files on its base in the same job; a matching failure there is recorded and excuses the pull request (6.3). The next pull request on the same base reads that record and needs no re-run. |
| Flaky tests were blamed on the wrong landing and innocent landings reverted.                                                                                                                                                | Flaky means passed and failed on the same commit and inputs key, nothing else (6.1). Timing is never evidence.                                                                                                                                 |
| A whole-shard timeout or a killed runner was read as a test failure.                                                                                                                                                        | Outcome `infra` never counts against a test (4.3). Failures sent instantly survive a job that dies later.                                                                                                                                      |
| The pipeline's own machinery (gate slots, the ledger lock, pass reuse) caused most gate failures.                                                                                                                           | Every call fails open and has a fast timeout. A missing or wrong answer can only make a run longer or stricter, never let a failure through (section 8).                                                                                       |
| The shared GitHub account ran out of API requests on 2026-10-04.                                                                                                                                                            | The Worker files issues and dispatches workflows as a GitHub App installation, which has its own request budget.                                                                                                                               |
| A CI Build regression (the Sentry plugin re-mapping 24 chunks) went unnoticed for four days.                                                                                                                                | Job, step and nx task durations land in the same store, so the time-budget alarms (described in the time-limits section of this design) have a history to compare against.                                                                     |
| Local and CI screenshots differed, and the difference was worked around instead of fixed.                                                                                                                                   | A clean local run that fails where CI passed on the same tree is recorded as a parity mismatch, and the Worker files it (6.4).                                                                                                                 |

## 2. Where it lives, who owns it, how it ships

- **Code:** `tools/results-service/`, beside `tools/release-scheduler/`, laid out the same way:
  `wrangler.toml`, `src/worker.js`, `src/signature.js`, `migrations/0001_init.sql`, `test/`, `README.md`.
- **Worker name** `graphty-results`, **D1 database** `graphty-results` with location hint `enam` (eastern
  North America, next to GitHub's hosted runners), on the owner's existing Cloudflare account, the one
  that runs `graphty-release-scheduler`. URL: `https://graphty-results.<account>.workers.dev`, in the
  repository variable `RESULTS_URL` and in `.env` for local use. No custom domain is needed.
- **Deployment:** a new workflow `.github/workflows/results-service.yml`, on a push to master that touches
  `tools/results-service/**` and on dispatch. One job: `node --test tools/results-service/test/`, then
  `npx wrangler@4 d1 migrations apply graphty-results --remote`, then `npx wrangler@4 deploy`. Secrets
  `CLOUDFLARE_API_TOKEN` (permissions: Workers Scripts edit, D1 edit, nothing else) and
  `CLOUDFLARE_ACCOUNT_ID`. The release scheduler is deployed by the same workflow from then on, so
  neither Worker depends on someone's laptop.
- **Ownership:** `tools/results-service/` and `tools/results/` are listed in CODEOWNERS with the owner,
  like every pipeline path. Agents propose changes; the owner's review merges them. The pipeline round
  operates the service (reads its status, acts on its issues) but never changes its rules in the same
  pull request as a product fix.
- **GitHub identity:** the Worker reuses the existing GitHub App `graphty-release-scheduler`, which already
  has exactly the two permissions needed (Actions read and write, to dispatch the bisect workflow and read
  run timings; Issues read and write). A second private key is generated for it, so the two Workers never
  share a key. Secrets on `graphty-results`: `APP_ID`, `INSTALLATION_ID`, `PRIVATE_KEY`, `LOCAL_TOKEN_HASHES`.
- **Tests:** D1 speaks SQLite, so the Worker's tests run the real migrations and queries against
  `node:sqlite` through a 20-line adapter (`test/d1-shim.mjs`: `prepare().bind().all()/first()/run()` and
  `batch()`), with GitHub's API and the OIDC key set injected as in `tools/release-scheduler/test/`. No new
  dependency.
- **Schema changes are additive only** (new tables, new nullable columns). The client sends
  `X-Results-Schema: <n>`; the Worker ignores fields it does not know and answers older clients as before.
  A client and a Worker that went live at different times never break each other.

## 3. Identity: commit, inputs and variant

An invocation names its commit (`sha`, `tree`) and its **inputs key**:

```
inputs = sha256(
  shard input key      -- inputKey() from tools/prepush-inputs.mjs: the package, the packages it depends
                       --   on or reads by relative path, their build outputs, the root files, the lockfile
  + selected files     -- sorted, when the run shape is "selected"
  + env                -- runner image (ImageOS + ImageVersion), Node version, Playwright browser revision
  + flags              -- "off" or "on"
  + baselines          -- for a story test: the git blob id of each story's baseline PNG
)[:16 hex]
```

`tools/prepush-inputs.mjs` already computes the shard key for the local gate's pass reuse; it moves to
`tools/results/inputs.mjs` and loses the gate-only parts (`gateKey`, `passStore`, `laneEnv`'s
`PREPUSH_*` variables). Including the baseline blob means approving a new picture starts a new history
for that story, as the owner decided: a story that differed from the old baseline is not flaky against
the new one. Including the runner image means a GitHub image update starts new histories instead of
making a changed environment look like flakiness.

## 4. Data model

`migrations/0001_init.sql`:

```sql
CREATE TABLE invocation (
  id TEXT PRIMARY KEY,         -- "<run_id>.<run_attempt>.<job>.<group>.<try>" | "local.<ms>.<host>.<pid>.<group>"
  kind TEXT NOT NULL,          -- pr | full | bisect | base | local  (set by the Worker from the credential)
  sha TEXT NOT NULL, tree TEXT NOT NULL, base_sha TEXT, pr INTEGER, ref TEXT,
  variant TEXT NOT NULL,       -- "graphty-element-browser|flags=on|whole"
  inputs TEXT NOT NULL, env TEXT NOT NULL,
  try INTEGER NOT NULL,        -- 1 = the run, 2 = the retry of its failed files in the same job
  outcome TEXT NOT NULL,       -- passed | failed | error | infra | cancelled
  reused_from TEXT,            -- set when the group was skipped on an identical-inputs pass (7.1)
  dirty INTEGER NOT NULL DEFAULT 0, run_url TEXT,
  started_at INTEGER NOT NULL, secs REAL NOT NULL);
CREATE INDEX inv_variant_inputs ON invocation(variant, inputs, outcome);
CREATE INDEX inv_sha ON invocation(sha);
CREATE TABLE file_run (invocation TEXT NOT NULL, file TEXT NOT NULL,
  passed INTEGER, failed INTEGER, skipped INTEGER, ms INTEGER,
  PRIMARY KEY (invocation, file)) WITHOUT ROWID;
CREATE TABLE failure (invocation TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  status TEXT NOT NULL,        -- fail | timeout
  signature TEXT NOT NULL, key TEXT NOT NULL, first_line TEXT, message TEXT,  -- message: first 2,000 chars
  seen_at INTEGER NOT NULL,    -- when the instant event arrived
  PRIMARY KEY (invocation, file, name)) WITHOUT ROWID;
CREATE INDEX failure_test ON failure(file, name, key);
CREATE TABLE quarantine (family TEXT NOT NULL, file TEXT NOT NULL, name TEXT NOT NULL,
  issue INTEGER, reason TEXT, proof TEXT,  -- the two invocation ids that disagreed
  since INTEGER NOT NULL, expires INTEGER NOT NULL, passes INTEGER NOT NULL DEFAULT 0,
  left_at INTEGER, left_why TEXT,          -- issue-closed | passes | expired
  PRIMARY KEY (family, file, name, since));
CREATE TABLE tracked_issue (signature TEXT PRIMARY KEY, kind TEXT NOT NULL, -- flaky | failing-on-master | parity
  number INTEGER, state TEXT, opened_at INTEGER, last_seen INTEGER);
CREATE TABLE outbox (id INTEGER PRIMARY KEY, action TEXT NOT NULL, payload TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0, done_at INTEGER);
CREATE TABLE duration (run_id INTEGER NOT NULL, attempt INTEGER NOT NULL, workflow TEXT NOT NULL,
  job TEXT NOT NULL, step TEXT NOT NULL DEFAULT '', task TEXT NOT NULL DEFAULT '',
  sha TEXT, kind TEXT, started_at INTEGER, ms INTEGER, conclusion TEXT,
  PRIMARY KEY (run_id, attempt, job, step, task)) WITHOUT ROWID;
```

### 4.1 Passes per file, failures per test

As in today's ledger: a pass is stored per file (counts and milliseconds), a failure per test. A test
passed in an invocation when its file ran with no failure row for it and its usual skip count. This
keeps a full run at about 2,800 file rows instead of about 50,000 test rows.

### 4.2 Signature and key

`failureHashes()` from `tools/test-ledger.mjs` moves unchanged to `tools/results-service/src/signature.js`
and is imported by both the Worker and the client, so the two can never hash differently. The **key**
(first two informative lines, numbers kept) decides whether two failures are the same; the
**signature** (first line with numbers masked, plus two project stack frames; for an expired wait,
`timeout` plus the test file) groups failures into one issue.

### 4.3 Outcomes

`outcomeOf()` from `tools/test-ledger.mjs` is reused: `passed`; `failed` (exit 1 and the failing tests
explain it alone); `error` (an unhandled error, a coverage threshold, failing tests plus anything else);
`infra` (a signal, exit 124, 137 or 143, a missing Vitest summary, unparseable JUnit, or a job that sent
failure events but never its record); `cancelled`. Only `passed` and `failed` count as evidence or
toward any rate.

## 5. The API

All bodies are JSON. Every call carries a credential (section 5.4).

### 5.1 Write a test group's record

`POST /v1/invocations` with one record per test group, as the last thing the group's wrapper does
before it exits with the job's verdict:

```json
{
    "id": "40109261957.1.graphty-element-browser-3.0.1",
    "sha": "...",
    "tree": "...",
    "baseSha": "...",
    "variant": "graphty-element-browser|flags=off|whole",
    "inputs": "9f2c...",
    "env": "ubuntu24/20261019.1|node22.23.2|chromium-1187",
    "try": 1,
    "outcome": "failed",
    "startedAt": 1761300000000,
    "secs": 612.4,
    "dirty": false,
    "files": [["graphty-element/test/browser/x.test.ts", 41, 1, 0, 3120]],
    "failures": [
        {
            "file": "graphty-element/test/browser/x.test.ts",
            "name": "camera > zooms",
            "status": "fail",
            "message": "AssertionError: ..."
        }
    ]
}
```

The Worker computes signature and key itself from `message`, sets `kind` from the credential (never
from the body), and writes the invocation, its file rows and its failures in one `batch()` (one D1
transaction). The id is the idempotency key: a repeated post is `INSERT OR IGNORE`. Answer:
`{ "stored": true, "decisions": [...] }`, where decisions are what the rules of section 6 concluded
(for example `flaky: camera > zooms, quarantined, issue pending`), which the wrapper prints.

### 5.2 Send a failure the moment it happens

`POST /v1/failures` with `{ invocation, file, name, status, message }`, sent by the Vitest reporter
`tools/results/reporter.mjs` from `onTestCaseResult` when a test fails (Vitest 4.1 reporter API). The
post is not awaited; the reporter keeps the promises and settles them in `onTestRunEnd`. The row goes
into `failure` with no invocation yet; the record later completes it.

Two consumers depend on it:

- **The full run's bisect starts before the run ends.** When a failure arrives from a `full` invocation
  with `try = 2` (the retry in the same job failed it too, so it is broken on that commit and inputs),
  the Worker dispatches `repository_dispatch` type `test-broken` with
  `{ runId, sha, tests: [{ file, name, key, variant }] }`, at most once per run per variant, and the
  bisect workflow (the bisect section of this design) starts running only those files over master's
  first-parent merges. In the CI record, a failing job finished a median of 24 to 63 minutes after the
  run started (`tmp/failure-position/ci-out.txt`); the bisect no longer waits for the slowest of 25 jobs.
- **A job that dies keeps its evidence.** A runner lost at minute 40 leaves its failures in the store.
  An invocation id with failures but no record 6 hours after its run completed is closed by the
  Worker's cron as outcome `infra`: the failures are shown, never counted.

### 5.3 Read once at the start of a run

`GET /v1/plan?sha=&base=&variants=<v1,v2>&inputs=<k1,k2>&files=<changed files>` from the wrapper, one
call per job. Answer:

```json
{
    "quarantine": [
        { "family": "graphty", "file": "graphty/src/a.test.tsx", "name": "t", "issue": 3401, "expires": "2026-11-05" }
    ],
    "passedWithInputs": { "graphty-element-browser|flags=off|whole": "40100000001.1.graphty-element-browser-3.0.1" },
    "failingOnBase": [{ "file": "...", "name": "...", "key": "...", "invocation": "...", "issue": 3402 }],
    "order": { "graphty-element-browser": ["graphty-element/test/browser/x.test.ts"] },
    "fileMs": { "graphty-element/test/browser/x.test.ts": 3120 }
}
```

- `quarantine`: active entries for the job's families.
- `passedWithInputs`: a `passed` invocation of `full`, `pr`, `bisect` or `base` kind with exactly this
  variant and inputs key (7.1).
- `failingOnBase`: failures recorded on exactly `base` (kinds `full`, `bisect`, `base`) (6.3).
- `order`: files of the variant that failed in an evidence run in the last 7 days, most recent first, so
  they run first (7.2). `fileMs`: median milliseconds over the last 9 evidence runs, for slicing.

### 5.4 Credentials

- **CI: GitHub Actions OIDC.** Test jobs get `permissions: id-token: write`. The client asks
  `ACTIONS_ID_TOKEN_REQUEST_URL` for a token with audience `graphty-results` and sends it as
  `Authorization: Bearer`. The Worker verifies the RS256 signature against
  `https://token.actions.githubusercontent.com/.well-known/jwks` (cached by `kid` until a `kid` it does not
  know appears), `iss`, `aud`, `exp`, and `repository_id` (the numeric id, which survives a rename). It
  then derives the kind and the commit from the claims, never from the body: `event_name` `pull_request`
  is `pr` (the `sha` claim is the pull request's merge commit; the body's `sha` must equal it);
  `workflow_dispatch` or `repository_dispatch` of the full-run workflow on `refs/heads/master` is `full`;
  the bisect workflow is `bisect`; a `base` record must come from a `pr` credential and is stored only for
  a `baseSha` that is a master commit (the Worker checks with one GitHub API call, cached). The client
  reuses a token until 60 seconds before its `exp` claim.
- **Local: a scoped token.** `GRAPHTY_RESULTS_TOKEN` in the root `.env` (gitignored; agents cannot read
  `.env` under `.claude/settings.json`, and the client reads it the way other tools read `.env`). The Worker
  stores only SHA-256 hashes of valid tokens (`LOCAL_TOKEN_HASHES`, comma-separated, so rotation adds the
  new one before removing the old). It may read everything and write only kind `local`.
- **Reads need a credential too**, except `GET /v1/health`. The repository is public, but failure
  messages can quote environment paths and data, and an open read endpoint invites scraping.

What a pull request can do, and why that is acceptable: a pull request's CI runs the pull request's own
copy of the client, so it can post false results for its own merge commit. It cannot write `full`,
`bisect` or `local` records, cannot touch another commit, and cannot remove a quarantine. The worst it
can do is quarantine a test with a fabricated pass-and-fail pair, and a quarantine is never silent: it
files a `priority:critical` issue naming both invocations, and every run that lets the test's failure
through prints it. Changes to `tools/results/**` themselves need the owner's review.

## 6. The rules

Every rule counts failure rows whatever was excused: an excused failure is still a failure.

### 6.1 Flaky

A test is **flaky** when, in one variant, two evidence invocations (kinds `pr`, `full`, `bisect`, `base`)
with the same commit and the same inputs key disagree: one recorded it failing and the other ran its file
without failing it and with its usual skip count. The usual pair is a job's run and its retry: the
wrapper re-runs the failed test files once in the same job (`runShard()` and `decide()` from
`tools/test-quarantine.mjs`, unchanged, at most 5 files; more than 5 failing files is a breakage and is
not retried). A re-run of a whole workflow attempt on the same commit counts too, because the inputs key
says whether anything changed. Timing, load, and failures on other commits are never evidence.

A flaky test is quarantined at once (6.5) with a `priority:critical`, `effort:medium`, `bug` issue: the
owner's rule of 2026-10-22, a load- or timing-sensitive test is a critical defect. The retry's pass never
makes the job green on its own: the job is green only because the test is now quarantined, and the
summary says so.

### 6.2 Broken

A test is **broken on a commit** when it failed in the run and in the retry on the same commit and inputs
key (or failed in a run with more than 5 failing files, which is not retried). On a `full` run that
dispatches the bisect (5.2). On a pull request it fails the check, unless 6.3 shows the base fails it the
same way. A test with 4 or more full-run verdicts in its variant and 80% or more of them failing is
reported as **broken**, never as flaky, and is never quarantined (Trunk's split, kept from today's ledger
design; Meta found a deterministically broken test can score near zero flakiness).

### 6.3 A failure master already has

A pull request must not stay red for a test master already fails, and the failure must not be hidden.
When a pull request's test group fails test T in file F, its wrapper:

1. Leaves T failing if the pull request changes F (the client sends the changed files; the Worker does
   not trust them for anything but this narrowing, which can only make the check stricter).
2. Looks in the plan's `failingOnBase` for T with the same key on exactly the base commit. Found: excused.
3. Otherwise re-runs F on the base commit in the same job: `git worktree add` at `baseSha`, build the
   package (nx cache), run F once, post it as kind `base`. T is excused when it fails there with the same
   key, or, for an expired wait, fails there at all. This is the land check's re-run from
   `exonerate()` in `tools/test-ledger.mjs`, moved into CI. It costs one test file's run, only when a
   pull request fails.

An excused failure prints `[KNOWN] <test> fails the same way on master <sha> (<invocation>), issue #N`,
the Worker files or updates one `Failing on master: <first line>` issue per signature (labels `bug`,
`priority:high`, `effort:medium`), and the next pull request on the same base reads the record instead
of re-running. Full runs and bisects never excuse anything.

### 6.4 Local and CI disagree

A `local` invocation that is not dirty and failed T, on a tree for which an evidence invocation of the
same variant passed T (only the `env` part of the inputs differs), is a **parity mismatch**. The Worker
files one `Local and CI results differ: <test>` issue per signature (labels `bug`, `priority:high`),
listing both environments. The same holds for story tests, whose screenshot comparison is part of the
test: a picture that differs locally and not in CI is a bug to fix, and CI is the reference until parity
is proven. Local results feed nothing else: no quarantine, no excuse, no order, no reuse.

### 6.5 Quarantine

The Worker owns the quarantine; `tools/test-quarantine.json` and the local state file are deleted.

- **Enters** only through 6.1, never by hand and never through an API call that names a test.
- **Applies** in every pull request run and every full run: the wrapper reads the list from the plan, a
  quarantined test still runs, and its failure is printed as `[QUARANTINED] ... issue #N` and as a
  warning annotation, and does not fail the job. Never for `webgpu-graph-algorithms*` families or the
  screenshot gate (kept from `checkQuarantine()` in `tools/test-ledger.mjs`, enforced by the Worker).
- **Leaves** when its issue closes (an hourly cron asks GitHub about every open quarantine issue in one
  GraphQL query), after 20 consecutive passing evidence verdicts, or 14 days after it entered (the owner's
  rules of 2026-10-22, unchanged).
- **Fail-open direction:** with no plan, nothing is quarantined, so a quarantined test's failure fails the
  job. Stricter, never looser.

### 6.6 Issue filing

Each decision that files or comments on an issue writes an `outbox` row in the same batch as the record,
then tries GitHub at once (`ctx.waitUntil`). A failed call stays in the outbox; the Worker's cron (every
5 minutes) retries it until it succeeds. One issue per signature (`tracked_issue`), with a
`<!-- results signature=<sig> -->` marker so a lost row is found again by search. The issue text is
today's (`fileIssue()` in `tools/test-quarantine.mjs`) with the invocation links added.

## 7. Test selection by history

The import-graph selector (`tools/test-select.mjs`) decides what a pull request runs. History never
removes a test the selector picked and never predicts. It does two things:

### 7.1 Skip only on identical inputs

A test group whose variant and inputs key already have a `passed` evidence invocation is skipped and
recorded with `reused_from` (this is the local gate's pass reuse, moved to CI with the same key). It is
exact, like the nx cache: if one input byte differs, the group runs. Full runs never reuse; they run
everything.

### 7.2 Run recent failures first

Within a shard, files in the plan's `order` run first, so a failing pull request fails minutes sooner.
The set of files is unchanged.

**Rejected: history adds and drops.** `design/ci/history-selection.md` replayed the ledger: tests added
from history would have caught 0 of 9 recorded misses for 219 extra minutes, and no drop rule was safe.
Both stay out. `pnpm run test:changed --budget` keeps its ranking as a developer aid, now reading
`/v1/plan`.

## 8. Fail open, and every other failure

The client (`tools/results/client.mjs`) uses `AbortSignal.timeout`: 5 seconds for the plan and the
record, 2 seconds for a failure event. One try, no retry loop. "Unknown means run": every missing answer
makes the run longer or stricter.

| Failure                                                        | Handling                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Worker or D1 down, slow or erroring on the plan                | Empty plan: no reuse, no quarantine, no excuse, default order. The job summary says `results service unreachable: ran everything, applied no quarantine`.                                                                                                                                                                                   |
| Same on the record                                             | The wrapper writes the record to `test-results/results-spool/<id>.json`, uploaded as artifact `results-spool-<job>`. A `Results backfill` job at the end of `ci.yml` (`if: always()`, not a required check, about 20 seconds) re-posts every spooled record. Still down: the run's history is lost, which only means later runs reuse less. |
| Failure event lost                                             | The record carries the same failure; only the early bisect start is lost.                                                                                                                                                                                                                                                                   |
| Job killed before its record                                   | Failure events already stored; the cron marks the invocation `infra` (5.2). Never counted against a test.                                                                                                                                                                                                                                   |
| Duplicate post (a retried step, a backfill of a stored record) | `INSERT OR IGNORE` on the invocation id.                                                                                                                                                                                                                                                                                                    |
| OIDC token unavailable (a fork, a missing permission)          | Nothing is written; the plan is empty. The summary names the reason.                                                                                                                                                                                                                                                                        |
| GitHub API down for issue filing or dispatch                   | Outbox, retried by the cron until done. A missed `test-broken` dispatch is also visible to the pipeline round, which reads `GET /v1/status`.                                                                                                                                                                                                |
| D1 over its daily limits                                       | Paid plan (section 9); writes failing anyway are the "down" row above.                                                                                                                                                                                                                                                                      |
| Schema mismatch between client and Worker                      | Additive only; unknown fields ignored (section 2).                                                                                                                                                                                                                                                                                          |
| Lost database                                                  | D1 Time Travel restores any minute of the last 30 days (`wrangler d1 time-travel restore`). Nothing decides from the store alone that a re-run cannot re-establish.                                                                                                                                                                         |

The service can never turn a failure into a pass by itself. Only a quarantine (proven by two runs on the
same inputs) or a base re-run (6.3) excuses a failure, and both print it.

## 9. Volume and cost

Measured from the local ledger (2026-10-08 to 2026-10-25): 14,203 invocations, 80,250 file rows, 612
failures, 3,124 test files, a 20 MB database (about 250 bytes a row with indexes). Projected for the new
pipeline:

| Source                                                                       | Rows written a day |
| ---------------------------------------------------------------------------- | ------------------ |
| Full runs: 4 a day x about 2,800 files x 2 flag configurations               | about 22,000       |
| Pull requests: about 30 a day x about 800 selected files                     | about 24,000       |
| Retries, failures, invocations, durations (about 25 jobs x 20 steps per run) | about 10,000       |
| Total, counting index writes (about 2 per row)                               | about 110,000      |

Storage: about 14 MB a day; file rows and invocations are kept 120 days and failures 365 days (a daily
cron deletes in 5,000-row transactions), so the database stays under 2 GB. Requests: about 2,000 a day.

D1's free plan allows 100,000 rows written a day, which this exceeds. The **Workers Paid plan, 5 US
dollars a month**, includes 50 million rows written and 25 billion rows read a month, 5 GB of D1 storage
and 10 million Worker requests: this pipeline uses under a tenth of each. Expected cost: 5 dollars a month,
flat. Decided here (reversible: downgrading only loses the headroom).

## 10. Durations

The time-limit alarms (another section of this design) read durations from the `duration` table:

- **Jobs and steps:** the Worker's cron (every 15 minutes) lists completed runs of `ci.yml`, the full-run
  workflow and `release.yml` since its last pass, and reads each run's jobs with steps (one REST call per
  run, about 40 runs a day, on the App's own budget). This also catches jobs that were killed, which a
  step inside the job could not report.
- **nx tasks:** the Build job runs nx with `NX_PROFILE=tmp/nx-profile.json` and posts the task spans with
  `POST /v1/durations` (same credential). The Sentry plugin regression shows up here as one task.
- **Test files:** `file_run.ms`, already written by every record.

Durations are never used to judge a test's result.

## 11. In CI, concretely

- Each test job in `ci.yml` (and the full-run and bisect workflows) gets `permissions: id-token: write`
  and runs its shard through `node tools/results/run-group.mjs <shard>` instead of `matrix.test-command`
  directly. The wrapper: computes the inputs key; reads the plan; skips or runs; adds the reporter
  (`--reporter=./tools/results/reporter.mjs` alongside the JUnit reporter `ciReporters()` already adds,
  in `vitest.ci-junit.mjs`); retries failed files once; applies quarantine and 6.3; posts the record;
  exits with the verdict. It is `tools/test-quarantine.mjs` minus its local state, issue filing and list
  file, plus the client calls.
- Feature flags: each shard runs twice where the flags apply, as variants `flags=off` and `flags=on`.
- Stories: the story test takes and compares its screenshot at the end of the test, so a story's result
  is an ordinary test result in the `storybook` variants, and its inputs key carries its baseline blob.
- The JUnit artifact upload stays (7-day retention, for people reading a run). The upload to Mergify
  Test Insights (`ci.yml`, the step after the JUnit upload) is deleted: it duplicated this store.
- The `Results backfill` job (section 8) is added at the end of `ci.yml`.

Locally, `pnpm run test:changed` posts kind `local` records when `GRAPHTY_RESULTS_TOKEN` is set
(`GRAPHTY_RESULTS=0` turns it off), and `node tools/results/cli.mjs why <file> [> <test>]` and
`status` read the service (status: open quarantines, failing-on-master tests, the last full run's
failures, outbox depth, last write time). The pipeline round reads `status` instead of
`tools/test-ledger.mjs status` and `tools/test-quarantine.mjs status`.

## 12. What happens to the local ledger

1. **Import.** `node tools/results/cli.mjs import` posts every record file in `tmp/test-ledger/records/`
   (14,203 invocations, 58 MB compressed) as kind `local` with its original kind kept in a note column,
   so the history is browsable but never evidence. Old kinds were desktop runs, which the new rules do
   not trust. About 10 minutes, once.
2. **Delete,** in the pull request that switches the wrapper on: `tools/test-ledger.mjs` and its tests,
   the local-state and issue code of `tools/test-quarantine.mjs` (the rest becomes `run-group.mjs`),
   `tools/test-quarantine.json`, `tools/prepush-inputs.mjs`'s gate parts, `tools/test-history.mjs`'s
   ledger reader (it reads the plan instead), `TEST_LEDGER_RUN` and `TEST_LEDGER_KIND` handling in
   `vitest.ci-junit.mjs` and `tools/ci-test-matrix.mjs`, and the CLAUDE.md rows for `test-ledger.mjs`,
   `test-quarantine.mjs` and `test-quarantine.json`. `tmp/test-ledger/` and `tmp/test-quarantine/` are
   removed from the main checkout after the import.
3. **Order of rollout,** each a pull request of its own: (a) the Worker, its migration and its deploy
   workflow; (b) CI writes records and events, reads nothing (shadow; one week of full runs and pull
   requests compared against JUnit to prove nothing is lost); (c) CI reads the plan, quarantine and 6.3 go
   live, the committed list is deleted; (d) the import and the deletions. The local ledger keeps running
   until (c) and is ignored after, so there is never a day with no quarantine.

## 13. Files

New: `tools/results-service/` (Worker, about 600 lines with tests), `tools/results/client.mjs`,
`run-group.mjs`, `reporter.mjs`, `inputs.mjs`, `cli.mjs` (about 500 lines together),
`.github/workflows/results-service.yml`. Reused: `failureHashes()`, `outcomeOf()`, `parseJunit()` and
`exonerate()`'s base re-run from `tools/test-ledger.mjs`; `runShard()`, `decide()` and `fileIssue()` text
from `tools/test-quarantine.mjs`; `inputKey()` and `shardKeys()` from `tools/prepush-inputs.mjs`;
`buildJwt()` from `tools/release-scheduler/src/worker.js`. Deleted: section 12, about 2,500 lines.

## 14. What the owner does

- Turn on the Workers Paid plan (5 dollars a month) on the Cloudflare account that runs the release
  scheduler.
- Create a Cloudflare API token with only Workers Scripts edit and D1 edit, and store it with the account
  id as repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Generate a second private key for the `graphty-release-scheduler` GitHub App, convert it to PKCS#8 as in
  `tools/release-scheduler/README.md`, and run `npx wrangler@4 secret put PRIVATE_KEY` (plus `APP_ID` and
  `INSTALLATION_ID`) for the `graphty-results` Worker.
- Create one local token (`openssl rand -hex 32`), put it in `.env` as `GRAPHTY_RESULTS_TOKEN`, and put its
  SHA-256 in the Worker secret `LOCAL_TOKEN_HASHES`.

## 15. Decided here (two-way doors)

D1 and a Worker rather than a hosted vendor (the owner chose Cloudflare; Trunk's upload view lags up to an
hour); reusing the release scheduler's GitHub App with a second key; deploying both Workers from a
workflow; reads requiring a credential; the 5-second and 2-second client timeouts; 120-day and 365-day
retention; Workers Paid; importing the desktop history as non-evidence; no history-based adds or drops;
pull requests excusing a master failure only on a same-key failure at their exact base.
