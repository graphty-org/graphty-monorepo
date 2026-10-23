# Test ledger: record every test result and use the history

Status: Proposed, 2026-10-22. Issue #3282, part of the fast pipeline (#3262,
`design/ci/fast-pipeline.md`). Background research: `reports/Test result history tools.md`.

graphty-monorepo runs tens of thousands of tests a day on one machine and remembers none of them. A
failing landing cannot ask whether the same test already fails on golden. Verification cannot ask
whether the test it is about to blame on a landing has failed that way before. The gate cannot start
the shard most likely to fail first. This document describes the **test ledger**: a small local
store of every test result from every gate, verification and bisect run, and the few decisions that
read it.

Words used throughout:

- **golden**, **landing**, **the cut**, **the gate**, **verification**, **the pipeline round**: as in
  `design/ci/fast-pipeline.md`. The gate is `tools/prepush.sh`, and its test stage is
  `tools/prepush-tests.mjs`. Verification is `tools/verify.mjs`.
- **shard**: one entry of `tools/ci-test-matrix.mjs`. A **family** is a shard name without its slice
  number (`graphty-element-browser-3` is in family `graphty-element-browser`).
- **invocation**: one run of one shard's command, by the gate, verification, a bisect or a developer.
- **variant**: a family plus a **lane**, which is a hash of the lane environment variables (`GRAPHTY_*`
  and `VK_*`, as `laneEnv()` in `tools/prepush-inputs.mjs` lists them, without `PREPUSH_*`). One test
  in two variants has two separate histories, as in Chromium's LUCI.
- **verdict**: what one test did in one invocation. It is expected (passed), unexpected (failed) or
  exonerated (failed, but excused for a recorded reason).
- **signature**: a short hash that identifies "the same failure" across runs (section 4.3).

## 1. Why

- **A failure already on golden blocks unrelated landings.** On 2026-10-22 a flood of React act()
  warnings timed out graphty tests and failed every landing that selected them, for hours, though
  none of those landings caused it. The owner's rule is that such a failure must not block unrelated
  landings and must never be hidden.
- **Flaky tests get blamed on the wrong landing.** A test that fails one run in ten makes
  verification's bisect name an innocent landing, which the pipeline round then reverts.
- **History is a selection signal we do not use.** Anthropic picks each change's tests "from past
  results and package relevance", using a listener that records every CI result. Their published
  lesson is that "when selection lagged, bad merges spread failures" and flaky tests blocked merges.

## 2. Principles

1. **The listener cannot lag.** There is no service. The process that ran a shard records its
   results before it prints the shard's verdict, and every decision reads the same store.
2. **Observations and decisions are kept apart.** The ledger stores what tests did. Human decisions
   (a quarantine, the owner's yes) live in git. The ledger can be deleted and rebuilt from its own
   run files.
3. **The ledger never blocks a push.** If it is missing, locked or corrupt, every tool behaves as it
   does today and prints one line saying so.
4. **Verification is the backstop.** Whatever history lets a landing skip or excuse, verification
   still runs in full, and the release train runs again before npm.
5. **Small and boring.** One Node module, Node's built-in SQLite, no daemon, no timer, no new npm
   dependency, and a size budget (section 8).

## 3. Recording

### 3.1 From JUnit, not from a new reporter

Every shard already writes JUnit XML: `tools/run-tests.sh` sets `CI=true`, so `ciReporters()` in
`vitest.ci-junit.mjs` adds Vitest's JUnit reporter. Shard commands with their own `--reporter` flags
add `--reporter=junit` and take the same output file from the config. Each testcase carries the test
file, the suite path and name, the time, and on failure the message and stack.

The ledger reads these files. One parser then serves the live gate, the one-time import of the 8,500
JUnit files already on disk, and later the release train's JUnit from GitHub Actions. No ledger code
runs inside the checkout under test, as a reporter would: the parser runs from the gate's live copy.
JUnit omits the Vitest project, so the variant is the family rather than the project. Each project of
a family has its own test files, so nothing is lost in practice. JUnit also omits retries, and there
are none (3.4). The parser is about 30 lines of regular expressions over Vitest's machine-written
output, with no XML library.

One change makes each file attributable. `ciReporters()` puts `TEST_LEDGER_RUN` in the file name when
it is set (`junit-<package>-<run>-<pid>.xml`), and the gate sets it to the invocation id of each
shard it starts. So the gate finds exactly its own files, even when two shards of one package run at
once.

### 3.2 Which runs, and their kind

The caller sets the kind in `TEST_LEDGER_KIND`. The gate defaults it to `push`.

| Kind         | Set by                                          | Branch recorded          | Golden evidence |
| ------------ | ----------------------------------------------- | ------------------------ | --------------- |
| `push`       | the gate, for any branch push                   | the pushed branch        | no              |
| `land-check` | `tools/land.mjs`, for a landing's gate          | `golden`                 | no              |
| `verify`     | `tools/verify.mjs`, the full gate on a commit   | `golden` or `golden-cut` | yes             |
| `bisect`     | `tools/verify.mjs`, each bisect point           | `golden`                 | yes             |
| `cut`        | `land.mjs cut <commit>` and `cut-fix`           | `golden-cut`             | no              |
| `dev`        | `pnpm run test:changed`, `run-tests.sh` by hand | the worktree's branch    | no              |
| `ci`         | the release train's JUnit, imported (phase 5)   | `master`                 | no              |

Each invocation also records the commit, its tree, the gate's base commit (`tools/push-base.mjs`),
whether the worktree had uncommitted changes (only `dev` runs can), whether only selected files ran,
the start time, the duration and the shard log's path.

### 3.3 Outcomes: a test's failure or the machine's

A failure the machine caused must never count against a test, as Meta and the ASE 2024 study of
execution failures both warn. Each invocation gets one of five outcomes, from the exit code, the
verdict of `tools/shard-verdict.mjs` and the JUnit files:

- `passed`: exit 0, with every Vitest summary printed.
- `failed`: exit 1, every summary printed, and at least one failing testcase in the JUnit.
- `error`: exit 1 with every summary printed but no failing testcase: an unhandled error, a coverage
  threshold or a config error. It is a real failure, but no test is blamed.
- `infra`: a signal or the shard timeout (exit 124, 137 or 143), a missing summary, or JUnit that is
  missing or does not parse.
- `cancelled`: stopped by the gate after another shard failed.

Only `passed` and `failed` invocations count in rates or as evidence.

### 3.4 Retries

Vitest retries stay off (`design/ci/ci-cd-plan.md` 9.1: "no automatic retries anywhere"). A repeat is
always a separate invocation: verification's re-run of a failing commit, a bisect point, a push
retried with `PUSH_QUEUE_RETRY=1`, or a landing check and a verification of the same tree. The
ledger compares invocations of the same tree to see a test pass and fail on the same code (4.2). If
Vitest retries are ever turned on, JUnit hides the first attempt and the parser must be replaced by a
reporter; its comment says so.

### 3.5 Storage and concurrency

Several shards, gates and bisect points can finish at the same moment. Append-only JSONL alone is
the simplest to write, but every decision would then scan all history or wait on an ingest step that
can fall behind, the lag that hurt Anthropic. SQLite in WAL mode queues writers on its own lock for
milliseconds and answers "this test in this variant, newest first" from an index. The ledger uses
both:

1. When a shard finishes, the gate parses its JUnit into one compact record (the invocation, per-file
   counts, every failure with its signature). It writes the record to
   `tmp/test-ledger/runs/<yyyy-mm-dd>/<invocation id>.json.gz` as a temporary file renamed into place,
   so no reader sees half a file and no two writers share a file.
2. In the same step it inserts the record into `tmp/test-ledger/ledger.db` in one transaction
   (`BEGIN IMMEDIATE`, a 10-second `busy_timeout`, `INSERT OR IGNORE` on the invocation id).
3. Whoever opens the ledger first ingests any run file from the last two days that the database
   lacks, which covers a failed insert or a crash between the two steps.

The run files are the source of truth, and `node tools/test-ledger.mjs rebuild` recreates the
database from them. Both live in the main checkout's `tmp/test-ledger/`, beside
`tmp/push-log.jsonl`, found from any worktree with `mainCheckout()` from `tools/land.mjs`. Losing the
directory loses only history, which new runs regenerate within a week.

### 3.6 Size and retention

A full verification runs about 50,000 tests in about 3,000 files. A row per passing test would be a
million rows a day, so passes are stored per file (passed, failed and skipped counts and the
duration), and only failures are stored per test. A test's verdict is expected when its file ran and
it has no failure row. A full verification is then about 3,000 small rows, and a day about 100,000
rows: about 5 MB of database and 1 to 2 MB of compressed run files.

Retention is 120 days for per-file rows and run files, and 365 days for invocations, failures,
exonerations and selection records. `tools/verify.mjs` prunes at the end of a run, at most once a
day. The expected steady size is under 1 GB.

## 4. Data model

### 4.1 Schema

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 10000;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); -- schema_version, last_prune

CREATE TABLE IF NOT EXISTS invocation (
  id          TEXT PRIMARY KEY,     -- '<start ms>-<pid>-<shard>', also TEST_LEDGER_RUN
  kind        TEXT NOT NULL CHECK (kind IN ('push','land-check','verify','bisect','cut','dev','ci')),
  imported    INTEGER NOT NULL DEFAULT 0,
  branch      TEXT,
  commit_sha  TEXT NOT NULL,
  tree_sha    TEXT,                 -- NULL when dirty
  base_sha    TEXT,
  dirty       INTEGER NOT NULL DEFAULT 0,
  shard       TEXT NOT NULL,
  family      TEXT NOT NULL,
  lane        TEXT NOT NULL,        -- 12 hex of sha256 over the sorted lane variables
  selected    INTEGER NOT NULL DEFAULT 0,
  outcome     TEXT NOT NULL CHECK (outcome IN ('passed','failed','error','infra','cancelled')),
  cause       TEXT,
  started_at  INTEGER NOT NULL,     -- ms since epoch
  secs        INTEGER,
  log         TEXT
);
CREATE INDEX IF NOT EXISTS invocation_variant ON invocation (family, lane, started_at);
CREATE INDEX IF NOT EXISTS invocation_commit  ON invocation (commit_sha);
CREATE INDEX IF NOT EXISTS invocation_tree    ON invocation (tree_sha);

-- One row per test and one per test file (name = ''), so files and tests share ids.
CREATE TABLE IF NOT EXISTS test (
  id INTEGER PRIMARY KEY, file TEXT NOT NULL, name TEXT NOT NULL, UNIQUE (file, name)
);  -- file is '<package>/<path in package>', name is 'suite > test'

CREATE TABLE IF NOT EXISTS file_run (
  invocation_id TEXT NOT NULL REFERENCES invocation (id) ON DELETE CASCADE,
  file_id       INTEGER NOT NULL REFERENCES test (id),
  passed INTEGER NOT NULL, failed INTEGER NOT NULL, skipped INTEGER NOT NULL, ms INTEGER,
  PRIMARY KEY (invocation_id, file_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS file_run_file ON file_run (file_id);

CREATE TABLE IF NOT EXISTS failure (
  invocation_id TEXT NOT NULL REFERENCES invocation (id) ON DELETE CASCADE,
  test_id       INTEGER NOT NULL REFERENCES test (id),
  status        TEXT NOT NULL CHECK (status IN ('fail','timeout')),
  signature     TEXT NOT NULL,      -- 16 hex
  first_line    TEXT NOT NULL,      -- masked, for people and issue titles
  message       TEXT,               -- first 2,000 characters, unmasked
  PRIMARY KEY (invocation_id, test_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS failure_test ON failure (test_id);
CREATE INDEX IF NOT EXISTS failure_sig  ON failure (signature);

-- An excused failure. Never stored as a pass; always names an issue.
CREATE TABLE IF NOT EXISTS exoneration (
  invocation_id TEXT NOT NULL REFERENCES invocation (id) ON DELETE CASCADE,
  test_id       INTEGER NOT NULL,
  reason        TEXT NOT NULL CHECK (reason IN ('fails-on-golden','flaky-on-golden','quarantined')),
  evidence      TEXT,               -- the golden invocation id, or the quarantine entry
  issue         INTEGER NOT NULL,
  at            INTEGER NOT NULL,
  PRIMARY KEY (invocation_id, test_id)
) WITHOUT ROWID;

-- The issue tracking a failure signature seen on golden.
CREATE TABLE IF NOT EXISTS golden_issue (
  signature TEXT PRIMARY KEY, issue INTEGER NOT NULL, opened_at INTEGER NOT NULL, closed_at INTEGER
);

-- The over-exoneration alarm, so it comments once per activation.
CREATE TABLE IF NOT EXISTS alarm (signature TEXT PRIMARY KEY, raised_at INTEGER NOT NULL, retired_at INTEGER);

-- What history changed in a landing check's selection, and what verification found it missed.
CREATE TABLE IF NOT EXISTS selection (
  invocation_id TEXT NOT NULL, file_id INTEGER NOT NULL,
  how TEXT NOT NULL CHECK (how IN ('added','dropped','would-drop')), why TEXT,
  PRIMARY KEY (invocation_id, file_id, how)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS miss (
  culprit_sha TEXT NOT NULL, file_id INTEGER NOT NULL, changed_file TEXT NOT NULL,
  dropped INTEGER NOT NULL, found_at INTEGER NOT NULL,
  PRIMARY KEY (culprit_sha, file_id, changed_file)
) WITHOUT ROWID;

-- Non-passing verdicts; a pass is a file_run row with no failure row for the test.
CREATE VIEW IF NOT EXISTS verdict AS
SELECT f.invocation_id, f.test_id, f.signature,
       CASE WHEN e.reason IS NULL THEN 'unexpected' ELSE 'exonerated' END AS verdict, e.reason, e.issue
FROM failure f LEFT JOIN exoneration e USING (invocation_id, test_id);
```

Schema changes are additive only (`CREATE ... IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN`), and
`meta.schema_version` is one integer. Code that finds a newer version than its own treats the ledger
as unavailable (section 7), because the gate, land and verify live copies update at different times.

### 4.2 "Flaky" without retries

LUCI calls a verdict flaky when one invocation holds both a pass and a fail, which needs retries. Here
the proof comes from two invocations: **a test is proven flaky on a tree when, for the same variant,
one `passed` or `failed` invocation of that tree recorded it failing and another ran its file with no
failure for it.** Dirty `dev` runs never count. Datadog, Mergify, Trunk's pass-on-retry monitor and
Meta all use this rule: same code, both outcomes.

### 4.3 Failure signature

1. Strip ANSI codes and skip empty lines and Storybook's "Click to debug" banner. Take the first
   remaining line of the message.
2. Mask it: remove the checkout root (the main checkout or any `.worktrees/<name>/`); replace
   `/tmp/...` paths with `<tmp>`, UUIDs with `<uuid>`, hex runs of 7 or more with `<hex>`; drop
   `:line:col`; replace every other number with `<n>`.
3. Add up to two stack frames outside `node_modules` (Vitest's arrow-marked `file:line:col` lines or
   V8's `at fn (file:line:col)`), masked the same way, without line numbers.
4. For a timeout ("Test timed out in", "Hook timed out in") use `timeout` plus the test file instead,
   so two hangs in two files never share a signature, while every timeout in one file does.
5. The signature is the first 16 hex characters of sha256 over the result.

Exoneration matches the test and variant as well as the signature, so a signature that is too coarse
can only group failures for people. It can never excuse a different test.

### 4.4 Quarantine lives in git

Quarantine is a human decision, so it is a checked-in file, `tools/test-quarantine.json`, read from
the checkout being gated, like `vitest-time-budget-allowlist.json`:

```json
{
    "quarantine": [
        {
            "test": "graphty/src/x.test.tsx > suite > name",
            "family": "graphty",
            "issue": 3301,
            "expires": "2026-11-05",
            "approvedBy": "owner",
            "reason": "..."
        }
    ]
}
```

`ci-cd-plan.md` 9.3 governs it: only with the owner's yes, with an issue, for 14 days at most, and
never for GPU correctness tests (the `webgpu-graph-algorithms*` families), the visual gate, or a test
whose failure would allow a silent CPU-for-GPU substitution. The ledger's tests check the file's
shape, the 14-day limit and the forbidden families. An expired entry is ignored. A quarantined test
still runs and records, and its failures are exonerated with reason `quarantined`.

## 5. Decisions

| Decision                                   | Threshold                                                                                                                       | Source                                                            | Who acts            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| Exonerate a failure already on golden      | same test, variant and signature failing in golden's newest verification of that file at or before the base, with an open issue | LUCI failure criterion, simplified                                | the gate            |
| Over-exoneration alarm                     | 5 exonerations of one signature in 3 days; retired at 1 or fewer in 7 days                                                      | Chromium's 30 in 3 days and 1 in 7, scaled down by us             | the pipeline round  |
| Flaky                                      | 2 or more same-tree proofs, and proofs are 1% or more of the variant's last 100 verdicts                                        | LUCI flake criterion                                              | verify, `status`    |
| Failing often                              | 4 or more golden verdicts in 24 hours, 25% or more unexpected                                                                   | Trunk's example monitor                                           | `status`            |
| Broken                                     | the last 4 or more golden verdicts, 80% or more unexpected                                                                      | Trunk's "broken" monitor; Meta's warning                          | the pipeline round  |
| Quarantine                                 | the owner's yes, an issue, 14 days at most                                                                                      | ci-cd-plan 9.3, Datadog's expiry                                  | the owner, the gate |
| Bisect a known-flaky test                  | 3 runs per point; bad on 2 or more failures                                                                                     | our choice                                                        | verify              |
| Shard order                                | decayed count of unexpected verdicts, half-life 48 hours                                                                        | our choice; Meta and CloudBees order by failure likelihood        | the gate            |
| History adds a test file                   | a miss edge from a changed file (90 days), or a golden failure in 7 days since fixed                                            | Anthropic's "past results"; Meta                                  | the gate            |
| History drops a test file (off by default) | 20 or more clean golden verdicts in 30 days, no failure, no miss, not changed in 14 days                                        | Meta's predictive selection idea, our numbers, measured in shadow | the gate            |

### 5.1 Exonerate a failure already on golden

**When.** In the gate, for kinds `push` and `land-check`, when a shard's outcome is `failed` and the
number of failing testcases in its JUnit equals the failures Vitest's summaries report. Never for an
`error`, `infra` or `cancelled` outcome, never for verification, and never for a push to
`golden-cut` or `master` (kind `cut`), because nothing reaches master with a known error.

**Rule.** Take the base commit's first-parent history (`git rev-list --first-parent -n 200 <base>`,
once per gate). For each failing test, find the newest `verify` or `bisect` invocation that is not
imported, has outcome `passed` or `failed`, has the same family and lane, has its commit in that list
and ran the test's file. Order by position in the list, then by start time. The failure is excused,
with reason `fails-on-golden`, when that invocation recorded the same test failing with the same
signature, and `golden_issue` maps the signature to an issue that is still open. A test golden passed
there, or has no record for, is never excused. The issues' states come from one GraphQL query per
gate (CLAUDE.md's GitHub API budget). If GitHub cannot be reached, a recorded issue counts as open
and the line says so.

**What the gate does.** When every failing test of a shard is excused, the shard does not stop the
other shards, and the stage may pass. The gate prints a line that land.mjs copies into its summary:

```
  [KNOWN] graphty-2: 2 tests fail as they already do on golden at 1a2b3c4d5e (verification 1792...-graphty-1), issue #3290
```

The excused shard is not written to the pass store (`tmp/prepush-passes/`), so no later run can
reuse it as a pass. Golden stays marked failing: `golden-verified` does not move past the failure,
and cuts wait until it is fixed. The landing goes on, and the failure stays loud.
`PREPUSH_EXONERATE=0` turns this off for one push.

**Where the issue comes from.** When a verification records a failure whose signature has no open
issue, `tools/verify.mjs` files one before it bisects, so landings can be excused while the bisect
runs. One run's failures are grouped by masked first line, one issue per group, so an act() flood
across thirty tests is one issue. Each is titled `Failing on golden: <first line>`, labelled `bug`,
`priority:high` and `effort:medium`, and lists the tests, signatures, commit and log. Verify comments
on it once the bisect names a culprit. This is also the issue `ci-cd-plan.md` 9.2 asks for when a
failure does not reproduce.

**A known failure again.** When every failing test of a verification failed with the same signature
in the previous verification and has an open issue, verify records `failed-known` with the issue
numbers instead of bisecting the same range again.

### 5.2 The over-exoneration alarm

An exoneration that keeps happening is a golden breakage nobody is fixing. Chromium's configuration
raises a bug at 30 exonerations in 3 days and retires it at 1 in 7. For our volume, the alarm
activates at 5 per signature in 3 days and retires at 1 or fewer in 7; the 5 is our judgment, not a
published number. On activation the pipeline round comments on the issue once (the `alarm` row
prevents repeats) and starts a fix subagent ahead of ordinary work.

### 5.3 Flaky, failing often, broken

These are computed on demand from the variant's last 100 verdicts (every kind but `dev`, and only
invocations that ran the file), with no stored state: the rolling window gives the hysteresis.

- **Flaky:** 2 or more proofs (4.2) that are 1% or more of the verdicts. These are LUCI's numbers.
  LUCI notes that "even a 50%-flaky test would rarely exceed a 25% flake rate", which is why the bar
  is low.
- **Failing often** (Trunk's example monitor, shown by `status`): 4 or more golden verdicts in 24
  hours, 25% or more unexpected.
- **Broken** (Trunk's "broken" type): 4 or more golden verdicts, 80% or more unexpected. It is kept
  apart from flaky because Meta found that a test broken by a deterministic change can score near
  zero flakiness. A broken test is never quarantined; the pipeline round makes sure its issue is
  `priority:high`.

Flaky is a fact about history, not a diagnosis. The rule that no failure is called flaky until its
cause is found still stands, and the issue goes to an agent to find the mechanism.

### 5.4 Quarantine

`node tools/test-ledger.mjs status` lists flaky tests that have no quarantine and no fix. The
pipeline round asks the owner once per test, with an `ACTION NEEDED:` line. On a yes, it lands the
entry in `tools/test-quarantine.json`. The gate then excuses that test's failures with reason
`quarantined` and prints `[QUARANTINED]` lines for the landing summary. When the entry expires, the
pipeline round removes it.

### 5.5 History-aware bisect

Verification already re-runs a failing commit first and records a failure that does not come back
as not reproduced. With the ledger:

- Every bisect point is a `bisect` invocation, so its results join the history.
- For a failing test that is flaky (5.3), each point runs the failing shard up to 3 times and is bad
  only when 2 or more runs fail. A single failure is recorded as a proof, and the point counts as
  good. At a 10% flake rate, 2 failures in 3 runs happens 2.8% of the time. Other tests run once per
  point, as today.
- When the bisect names a culprit landing whose landing check did not run the failing file, verify
  records `miss` rows that pair the failing file with each file the culprit changed. `dropped` is 1
  when history dropped it (5.8). The pipeline round turns each miss into a selector rule
  (`design/ci/minimal-tests.md` section 5).

### 5.6 Shard order

The gate starts shards with the highest score first. The score sums 0.5 ^ (age in hours / 48) over
the family's unexpected, unexcused verdicts of the last 14 days. A tie goes to the longer median
duration. `startRule()`'s warm-up rule still decides what may start; the order only sorts the
waiting list, so it changes how soon a failure shows, never what runs. Test files within a shard are
not reordered, because Vitest's default sequencer already runs files that failed last time first.

### 5.7 History adds tests (phase 3)

For a landing check or push with selection on, the gate adds to each shard's selected files:

- every test file with a `miss` row, from the last 90 days, for a file this change touches, until a
  selector rule replaces it and the miss stops recurring;
- every test file in a package the change affects that failed unexpectedly on golden in the last 7
  days and passed on golden since, because a test just broken and just fixed is the likeliest to
  break again. Tests that are currently flaky are left out, so history never adds a known flake to an
  unrelated landing.

A shard the selector answered "none" becomes "files", and "all" is unchanged. Each addition is a
`selection` row. The gate writes the ledger's newest invocation time into
`tmp/test-select/advisory.jsonl`, so a replay reproduces the same answer. This is Anthropic's
design: past results plus package relevance, with the static selector as the package relevance.

### 5.8 History drops tests (off by default)

`PREPUSH_HISTORY_DROP=shadow` (the default from phase 4) computes the drop and only records it;
`PREPUSH_HISTORY_DROP=1` applies it. It applies only to landing checks and branch pushes, never to
verification, cuts or the release train. In a shard the selector runs whole, a test file is dropped
when it has 20 or more golden verdicts in the last 30 days and none unexpected, has no `miss` row in
90 days, was not added or changed in the last 14 days, is not touched by this change, and is not in
a GPU family. The rest of the shard runs as a selected-files run (minimal-tests 1.2), stored as
`shard-selected`, so it never stands in for the whole shard.

**Measuring misses.** In shadow mode the shard runs whole, so a miss is direct: a file marked
`would-drop` that failed unexpectedly in the same invocation. In live mode verification finds them,
as `miss` rows with `dropped` = 1. `status` prints both counts, the landing checks measured and the
shard minutes saved. Turning the drop on, after at least 200 landing checks in shadow mode with no
would-miss on a test not known to be flaky, is a two-way door. Two live misses in 30 days switch the
drop off by themselves, because the drop query returns nothing while two such rows exist, and a
missed file is never dropped again for 90 days.

Meta's predictive selection keeps over 95% of individual failures and 99.9% of faulty changes at
half the cost; ours is a deterministic rule rather than a trained model, because we have weeks of
history, not years.

## 6. Integration

Every change is small, and each one falls back to today's behavior if the ledger throws.

- **`vitest.ci-junit.mjs`**: the JUnit file name includes `TEST_LEDGER_RUN` when set. 2 lines.
- **`tools/prepush-tests.mjs`**: sorts the shards (5.6) and adds history files (5.7). It sets
  `TEST_LEDGER_RUN` and `TEST_LEDGER_KIND` per shard. In `settle()` it calls `ledger.record()` and,
  for a failed shard, `ledger.exonerate()`; a shard whose failures are all excused continues as a
  pass but skips the pass store. `stopAll()` records `cancelled`. About 60 lines.
- **`tools/test-changed.mjs`**: records with kind `dev`. About 10 lines.
- **`tools/verify.mjs`**: sets the kinds, files issues (5.1), asks which failing tests are flaky,
  skips the bisect of a known failure, records misses and prunes. About 60 lines.
- **`tools/land.mjs`**: sets `land-check` or `cut` on its gate and copies `[KNOWN]` and
  `[QUARANTINED]` lines into `land: summary`. About 15 lines.
- **The pipeline-round skill**: each round runs `node tools/test-ledger.mjs status` and acts on
  alarms, broken tests, quarantine requests, issues whose signature now passes on golden (closed with
  a comment), misses (selector rules) and an unavailable ledger (`rebuild`).

The code runs from the live copies (`.worktrees/gate-live`, `.worktrees/land-live`) and goes live with
`tools/live.sh gate <branch>` and `tools/live.sh land <branch>`.

## 7. Failure modes

| What goes wrong                                                                   | What happens                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node:sqlite` missing, database locked for 10 seconds, schema newer than the code | One line: `ledger: unavailable (<why>); deciding as before`. No exoneration (the failure blocks, as today), no ordering, no history selection. The run file is still written. |
| Database corrupt                                                                  | It is renamed to `ledger.db.corrupt-<time>` and treated as unavailable. `status` says so, and the pipeline round runs `rebuild` outside any gate.                             |
| GitHub unreachable during the issue check                                         | Recorded issues count as open, and the line says so.                                                                                                                          |
| Issue filing fails in verify                                                      | That signature is not excused until an issue exists. `status` lists it and the pipeline round files it (`file-issues`).                                                       |
| A run file cannot be written                                                      | One warning line; only history is lost.                                                                                                                                       |

Recording never fails a gate and never passes one. Only `exonerate()` can turn a failure into a
pass, and only on the evidence in 5.1.

## 8. Maintenance

**Dependencies.** None added. Storage is `node:sqlite`, built into Node since 22.5 and usable without
a flag since 22.13. This machine runs Node 22.23.2, where WAL mode works over SQLite 3.51.3. Node 22
still marks the module experimental and prints an `ExperimentalWarning`, which the module silences by
wrapping its dynamic import. The code uses only the small core API (`DatabaseSync`, `exec`,
`prepare`, `run`, `get`, `all`), unchanged since the module appeared. better-sqlite3 has the same
shape and is the fallback, but its native build script does not run here without `pnpm
approve-builds`. The JUnit parser uses regular expressions only.

**Files and size budget.** A change that pushes a file past its budget means the design is growing;
cut something first.

| File                           | Holds                                                                                 | Budget    |
| ------------------------------ | ------------------------------------------------------------------------------------- | --------- |
| `tools/test-ledger.mjs`        | open and ingest, JUnit parsing, signatures, recording, the section 5 queries, the CLI | 600 lines |
| `tools/test-ledger-import.mjs` | the one-time import (section 9)                                                       | 200 lines |
| `tools/test-ledger.test.mjs`   | `node:test` tests in `pnpm run test:ci-workflows`                                     | 500 lines |
| `tools/test-quarantine.json`   | the quarantine list, usually empty                                                    | -         |
| edits elsewhere                | section 6                                                                             | 150 lines |

**The CLI** (`node tools/test-ledger.mjs <command>`): `status` (golden failures and their issues,
exoneration counts, alarms, flaky and broken tests, quarantine, misses, health); `why <test or
file>` (recent verdicts with commits, kinds, signatures and exonerations); `sql "<select>"` (a
read-only query); `rebuild`; `import`; `prune`; `file-issues`.

**Tests** use JUnit fixtures copied from real files: parsing, masking, each exoneration rule and
refusal, the same-tree proof, broken versus flaky, the fallbacks, two processes recording 200
invocations each at once with nothing lost, and `rebuild` reproducing the same rows.

**For a future agent.** The ledger is history, not truth: if in doubt, `rebuild` it, or delete
`tmp/test-ledger/` and lose only history. It never decides alone what reaches master. Its decisions
are exoneration, ordering and history selection, each with an off switch (`PREPUSH_EXONERATE=0`,
removing the sort call, `PREPUSH_HISTORY_DROP=0`). When a decision looks wrong, `why` shows the rows
it used.

## 9. The one-time import

`node tools/test-ledger-import.mjs` loads what is already on disk, so rates, ordering and drop counts
have weeks of data on day one:

- **The push log** (`tmp/push-log.jsonl`, 2,235 entries since 2026-10-05) gives each gate run's
  branch, commit, worktree, times and gate log. The branch gives the kind: `golden` is `land-check`,
  `golden-verified` and `golden-cut-verified` are `verify`, `golden-cut` and `master` are `cut`, and
  anything else is `push`.
- **The gate logs** (`tmp/push-gate-logs/`, 14 days) give each shard's `[PASS]` or `[FAIL]` line and
  duration, so shard outcomes exist even where the JUnit is gone.
- **The JUnit files** in every worktree's `test-results/` (about 8,500) give the tests. Each is matched
  to the push-log entry of the same worktree whose run contains the file's modification time. The
  family comes from the selector's map of test files to shards (`--triggers` in
  `tools/prepush-tests.mjs`). Files from mutation worktrees (`select-mutate*`, which test deliberately
  broken trees), bisect worktrees, and files that match no push are skipped.

Imported invocations are marked `imported` and written as run files, so `rebuild` keeps them. They
count for proofs, rates, ordering and drop statistics. They are never exoneration evidence, because
their family and lane are inferred. Evidence starts with the first live verification after phase 1,
so the pipeline round starts one (`node tools/verify.mjs start --again`) as soon as phase 1 is live.

## 10. Build order

Each phase lands on its own and is useful alone.

1. **Recording, import and exoneration.** The JUnit file name; `tools/test-ledger.mjs` with recording,
   ingest, signatures, `status`, `why`, `sql`, `rebuild` and `prune`; the gate recording every shard;
   verify and land setting kinds; the import; issue filing in verify; `fails-on-golden` exoneration
   with `[KNOWN]` lines; the over-exoneration alarm; the pipeline round reading `status`. This stops a
   golden failure from blocking unrelated landings.
2. **Flaky and broken.** The classification, the history-aware bisect, `failed-known`, the quarantine
   file and its check, and the pipeline round's quarantine and broken steps.
3. **Ordering and history adds.** Shard order, miss rows and history-added test files.
4. **History drops in shadow mode,** with the counts in `status`; switched on once 5.8's bar is met.
5. **More sources:** the release train's JUnit as kind `ci` (one `gh run download` per release run),
   and, with the owner's yes, `flaky-on-golden` exoneration (section 11).

## 11. Decisions for the owner, and what this changes

- **`flaky-on-golden` exoneration waits for the owner's yes.** LUCI also excuses a failure of a test
  that is flaky on the branch (2 or more flaky verdicts, 1% or more). Excusing a flake automatically
  is a quarantine in all but name, and `ci-cd-plan.md` 9.3 requires the owner's yes for that. Until
  then a known flake still fails a landing, and the only automatic excuse is a failure golden already
  has with the same signature.
- **`design/ci/fast-pipeline.md` 5.1 changes.** It says selection does not use past results because
  "our history is short, and a second service that can fall behind is how Anthropic's let
  regressions through". The ledger answers both points: the run itself records history, so it cannot
  fall behind, and history only adds tests until the drop has been measured in shadow mode, with
  verification behind it. Section 5.1 gets a pointer here when phase 3 lands.
- **Unchanged:** no automatic retries; the release train is the full run; quarantine only with the
  owner's yes; a failure is reproduced and explained before it is called flaky; and master gets
  nothing with a known error, which is why cuts and verification are never excused.
