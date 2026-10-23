# Test ledger: record every test result and use the history

Status: Proposed, 2026-10-22, revised after an adversarial review. Issue #3282, part of the fast
pipeline (#3262, `design/ci/fast-pipeline.md`). Background research: `reports/Test result history
tools.md`.

graphty-monorepo runs tens of thousands of tests a day on one machine and remembers none of them. A
failing landing cannot ask whether the same test already fails on golden, verification cannot ask
whether a test has failed that way before, and the gate cannot start the shard most likely to fail
first. The **test ledger** is a directory of small record files written by every gate, verification
and bisect run, a SQLite index built from them, and the few decisions that read it.

Words used throughout:

- **golden**, **landing**, **land check**, **the cut**, **the gate**, **verification**, **the
  pipeline round**: as in `design/ci/fast-pipeline.md`. The gate is `tools/prepush.sh`, its test
  stage `tools/prepush-tests.mjs`; verification is `tools/verify.mjs`.
- **shard**: one entry of `tools/ci-test-matrix.mjs`. A **family** is a shard name without its slice
  number (`graphty-element-browser-3` is in `graphty-element-browser`).
- **invocation**: one run of one shard's command.
- **variant**: a family plus the run shape (whole shard, or selected files). One test in two variants
  has two histories. Lane variables are not part of it: the shard command sets them, so the family
  already names the lane, and a session's stray `GRAPHTY_*` export cannot split histories.
- **verdict**: what one test did in one invocation: expected, unexpected, or exonerated (failed, but
  excused for a recorded reason).
- **signature** and **key**: two hashes of a failure (4.3). The signature groups failures for people
  and issues; the stricter key decides whether two failures are the same.
- **golden chain**: `git rev-list --first-parent -n 200` from a golden commit. A land check tests the
  commit golden then fast-forwards to, so its results are results of a golden commit.

## 1. Why

- **A failure already on golden blocks unrelated landings.** The owner's rule: it must not, and it
  must never be hidden.
- **Flaky tests get blamed on the wrong landing**, and the pipeline round reverts an innocent one.
- **History is a selection signal we do not use.** Anthropic picks tests "from past results and
  package relevance", from a listener that records every CI result; "when selection lagged, bad
  merges spread failures".

**What this would not have fixed.** On 2026-10-22 load-dependent timeouts and AbortErrors failed the
graphty shards for hours, on a different test file nearly every time (Labels, GraphPlace,
InspectorAndTable, Groups, StylePanel, KeyboardStopsEscape, VaryByLayer). Rule 5.1 excuses only the
same test failing the same way, and never a timeout, so it would have excused almost none of them.
That is deliberate: a timeout carries no cause, so excusing one excuses any new hang in that test.
That class is handled by verification naming the culprit and the pipeline round reverting it. Phase 1
replays that day's logs and JUnit through the rule as a test fixture, so this statement stays true.

## 2. Principles

1. **The listener cannot lag.** No service: the process that ran a shard writes its record before it
   prints the verdict, and every reader first ingests any record it has not seen.
2. **One write path.** Every fact is a record file. The database is an index that can be deleted and
   rebuilt with nothing lost. Human decisions (a quarantine) live in git.
3. **The ledger never blocks a push.** Missing, incomplete or broken, every tool behaves as today and
   prints one line saying so.
4. **Verification is the backstop.** It runs every shard to the end and excuses nothing; the release
   train runs again before npm.
5. **Small and boring.** One Node module, Node's built-in SQLite, no daemon, no new dependency, a
   size budget (section 8).

## 3. Recording

### 3.1 From JUnit

Every shard already writes JUnit XML (`run-tests.sh` sets `CI=true`, so `ciReporters()` in
`vitest.ci-junit.mjs` adds Vitest's JUnit reporter), with each testcase's file, suite path, name,
time, and on failure the message and stack. A parser of about 30 lines of regular expressions reads
it from the gate's live copy, so no ledger code runs inside the checkout under test. There are no
retries (3.4), so JUnit hides nothing.

`ciReporters()` puts `TEST_LEDGER_RUN` in the file name (`junit-<package>-<run>-<pid>.xml`), so a run
finds exactly its own files although five graphty-element shards run at once in one checkout. A
checkout that predates this writes the old name; its invocation is `unattributed` (3.3), never
guessed by package and time.

**JUnit is transient.** Once the record is in place, `record()` deletes the JUnit files carrying its
run id. `prune` deletes `test-results/junit-*.xml` older than 2 days in every worktree, clearing the
19 GB already there.

### 3.2 Who records, and the kind

One entry point, `record({ shard, code, log, root, kind, startedAt })`, called from `settle()` in
`tools/prepush-tests.mjs` and from `defaultCheck()` in `tools/verify.mjs` after each bisect point's
`run-tests.sh` (with `TEST_LEDGER_RUN` and `TEST_LEDGER_KIND=bisect` in that child's environment).
`test:changed` and `run-tests.sh` by hand do not record: nothing would read them, and a branch's copy
of the module must never write the shared ledger.

Kinds: `land-check` (set by `land.mjs`), `verify` and `bisect` (`verify.mjs`), `cut` (`land.mjs cut`,
`cut-fix`), `sync` (`branch-sync.mjs`, with the synced branch), `ci` (the release train's JUnit, phase
5), and `push` when nothing is set. A tool sets the kind only in its gate child's environment, never
in its own `process.env`, so nothing inherits it. Only `land-check`, `verify`, `bisect` and `cut` run
in worktrees the tools own; only they count as evidence (5.1) or toward flaky proofs (4.2).

Each invocation records the commit, tree, evidence base (5.1), whether the worktree was **dirty**
(`git status --porcelain` non-empty at the shard's start or end), whether only selected files ran,
start time, duration and log path.

**A shard skipped by pass reuse** (`[SKIP]`, same input key) is recorded as `passed`, with
`reused_from` naming the source invocation and a copy of its per-file rows. Otherwise verification,
which reuses passes, would leave gaps where golden passed a test the ledger never saw.

### 3.3 Outcomes

A failure the machine caused must never count against a test. Each invocation gets one outcome:

- `passed`: exit 0 with every Vitest summary printed.
- `failed`: exit 1, every summary printed, no unhandled errors (`Errors`) and no coverage or
  threshold error, and failing JUnit testcases equal the summaries' failed count: the failing tests
  explain the exit on their own.
- `error`: any other exit 1, including failing tests plus an unhandled error. Never excused.
- `infra`: a signal or the shard timeout (exit 124, 137, 143), a missing summary, unparseable JUnit.
- `unattributed`: no JUnit carries the run id. Not infra and not evidence; `status` counts it.
- `cancelled`: stopped by the gate after another shard failed.

Only `passed` and `failed` count in rates or as evidence. A failing coverage run checks no
thresholds (Vitest's `reportOnFailure` is off), so an excused line says "coverage not checked", and
verification checks coverage once the known failure is fixed.

### 3.4 Retries

Vitest retries stay off (`design/ci/ci-cd-plan.md` 9.1). A repeat is a separate invocation:
verification's re-run, a bisect point, a land check and a verification of one tree. If retries are
ever turned on, the parser must become a reporter; its comment says so.

### 3.5 Storage and concurrency

Everything lives in the main checkout's `tmp/test-ledger/` (`mainCheckout()` from `tools/land.mjs`),
or in `TEST_LEDGER_DIR`, which the tests set to a temporary directory before importing the module:

- `records/<yyyy-mm-dd>/<id>.json.gz`: one per invocation: the invocation, per-file counts, every
  failure, and the exonerations the gate granted. Written under a temporary name and renamed.
- `issues/<signature>.json`: the issue tracking a signature on golden (5.1), created with the
  exclusive flag (`wx`) so two verifications cannot both file one.
- `misses/<id>.json`: a test file a landing's selection missed (5.4).
- `CURRENT`: one line naming the database file, `ledger-<timestamp>.db`.

**Reading.** `open()` opens the database `CURRENT` names (WAL, `busy_timeout` 10 s,
`foreign_keys = ON`) and ingests every record it lacks: it reads the day directories from
`meta.ingested_through` on, plus `issues/` and `misses/`, with `INSERT OR IGNORE`. Every reader
ingests first, so none sees stale data and no record can fall outside a window. Every write is one
`BEGIN IMMEDIATE` transaction.

**Rebuilding.** `rebuild` writes a new `ledger-<timestamp>.db` from every file, marks it `complete`,
and atomically replaces `CURRENT`. It never renames or deletes a database another process may hold
open: old connections finish on the old file, and their records reach the new one at the next ingest.
A database without `complete` is unavailable for decisions, so no gate ingests months of files inside
a shard. Verification runs `rebuild` at its start when `CURRENT` is missing, incomplete or reports
`SQLITE_CORRUPT`. `prune` deletes database files that are not `CURRENT` and older than a day.

### 3.6 Size and retention

A full verification runs about 50,000 tests in about 3,000 files. Passes are stored per file (counts
and duration), failures per test; a test passed when its file ran with no skips and it has no failure
row. A day is about 100,000 rows: 5 MB of database, 1 to 2 MB of records. Records and their rows are
kept 120 days, so a rebuild reproduces exactly what the database held; issue and miss files are kept
until closed or expired. `prune` runs at the end of a verification, at most daily, deleting 5,000 rows
per transaction so no gate waits long. Steady size is under 1 GB.

## 4. Data model

### 4.1 Tables

All columns are plain SQL types; the module creates them with `CREATE ... IF NOT EXISTS`.

| Table          | One row per                         | Columns beyond the keys                                                                                                                             |
| -------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`         | setting                             | `schema_version`, `min_reader_version`, `complete`, `ingested_through`, `last_prune`                                                                |
| `invocation`   | invocation (`<ms>-<pid>-<shard>`)   | kind, branch, commit, tree, base, dirty, shard, family, selected, outcome, reused_from, started_at, secs, log; indexed by family+time, commit, tree |
| `test`         | test, or file (name `''`)           | file (`<package>/<path>`), name (`suite > test`)                                                                                                    |
| `file_run`     | invocation and file                 | passed, failed, skipped, ms, `dup_names` (testcases sharing a name)                                                                                 |
| `failure`      | invocation and test                 | status (fail, timeout), signature, key, masked first line, first 2,000 characters of the message                                                    |
| `exoneration`  | invocation and test                 | reason (`fails-on-golden`, `quarantined`), evidence invocation or quarantine entry, issue                                                           |
| `golden_issue` | signature                           | issue, culprit, opened_at                                                                                                                           |
| `miss`         | culprit, test file and changed file | dropped, found_at                                                                                                                                   |

Child rows cascade on delete. Every table is filled from files, so `rebuild` replays all of it.
Schema changes are additive only. Older code reads a newer database and ignores unknown columns; it
refuses only when `min_reader_version` exceeds its own, which only a non-additive change would raise.
So the gate, land and verify live copies, which go live at different times, never disable each other.

### 4.2 "Flaky" without retries

LUCI calls a verdict flaky when one invocation holds a pass and a fail, which needs retries. Here
**a test is proven flaky on a tree when two invocations of that tree in the same variant disagree:
one recorded it failing, the other ran its file with no failure and no skips.** Both must be `passed`
or `failed`, not dirty, and of the tool-owned kinds. The same run shape keeps an order-dependence bug
(passes in the whole shard, fails among selected files) from looking like noise; no skips keeps a
conditional skip from counting as a pass. Datadog, Mergify, Trunk and Meta use this rule.

### 4.3 Signature and key

1. Strip ANSI codes, empty lines and Storybook's "Click to debug" banner; take the first line.
2. Clean it: remove the checkout root (main checkout or `.worktrees/<name>/`), and replace `/tmp/...`
   paths with `<tmp>`, UUIDs with `<uuid>`, hex runs of 7 or more with `<hex>`.
3. **Key**: the cleaned line with numbers kept, hashed. "expected 3 to be 4" and "expected 0 to be 4"
   differ.
4. **Signature**: the cleaned line with `:line:col` dropped and other numbers as `<n>`, plus up to two
   stack frames outside `node_modules` masked the same way; for a timeout, `timeout` plus the test
   file. Hashed.

Hashes are the first 16 hex of sha256. Signatures group failures for issues; exoneration and
`failed-known` require the same test, variant and key.

### 4.4 Quarantine lives in git, read from the base

`tools/test-quarantine.json` holds entries of test, family, issue, expiry and reason. The gate reads
it **from the base, never from the tree under test** (`git show
<land commit>^1:tools/test-quarantine.json`), so a branch that breaks a test cannot quarantine it in the same landing, and
`land.mjs` refuses a branch that changes the file together with anything else. That the owner said
yes is a process rule (the pipeline round lands an entry only after the owner's answer); no code can
check it, and this design does not pretend to.

`ci-cd-plan.md` 9.3 governs it: an issue, 14 days at most, never for GPU correctness tests (the
`webgpu-graph-algorithms*` families), the visual gate, or a test guarding against silent CPU-for-GPU
substitution. Tests check the shape, the limit and the families; an expired entry is ignored. A
quarantined test still runs and records, and land checks excuse it as `quarantined`. **Verification
and the cut never excuse a quarantined failure**, so golden-verified and the cut do not move past it.
A quarantine ends by itself when its test turns broken (5.2).

## 5. Decisions

Every rate, flaky, broken and drop statistic counts **failure rows whatever their exoneration**: an
excused failure is still a failure.

### 5.1 Exonerate a failure already on golden

**When.** Only in a land check, for a shard whose outcome is `failed`. The gate refuses by
destination, not kind, whenever `PREPUSH_ALL=1` or the push goes to `golden-cut` or `master`. Branch
pushes are never excused: golden is only a second parent in their history, and a branch can merge
`golden-verified` instead.

**Evidence.** The chain is the golden chain from `<land commit>^1` (golden's tip), stored as
`base_sha`. For a failing test T in file F, the gate takes the newest invocation (by chain position,
then start time) of kind `land-check`, `verify` or `bisect`, reused passes included, not dirty,
`passed` or `failed`, in T's variant, on a chain commit, that ran F. That is golden's newest word on F,
including landings verification has not reached. T is excused (`fails-on-golden`) only when:

1. that invocation recorded T failing with the same key, and the signature has an issue file;
2. T is not a timeout;
3. the landing does not change F;
4. T's name is unique in F in both runs (`dup_names` 0);
5. no chain commit after the evidence mentions the issue number or reverts the culprit verify
   recorded for it (`git log --format=%B <evidence>..<base>`): after a fix or revert, a failure is
   suspect until a verification confirms it.

A test golden passed, or has no record for, is never excused.

**What the gate does.** When every failing test of a shard is excused, the shard does not stop the
others and the stage may pass. `land.mjs` copies the line into its summary:

```
  [KNOWN] graphty-2: 2 tests fail as on golden at 1a2b3c4d5e (land check 1792...-graphty-2), issue #3290; coverage not checked
```

The excused shard gets no shard pass, and `prepush-tests.mjs` exits with a distinct status so
`prepush.sh` records no whole-gate pass: the golden push that follows runs the gate again, every other
shard `[SKIP]`s, and the excused one is judged again. `PREPUSH_EXONERATE` joins the gate key
(`laneEnv()` in `tools/prepush-inputs.mjs`), so `PREPUSH_EXONERATE=0` really runs a strict gate.
`golden-verified` does not move past the failure, and cuts wait for the fix.

**Where the issue comes from.** When verification records a failure whose signature has no issue
file, `verify.mjs` claims `issues/<signature>.json` with `wx` and files only if the claim succeeded,
so verifications of golden and golden-cut at once file one issue. One issue per signature, titled
`Failing on golden: <first line>`, labelled `bug`, `priority:high`, `effort:medium`, listing tests,
keys, commit and log, with a `<!-- test-ledger signature=<sig> -->` marker. Verify adds the culprit
once the bisect names it. A mapped issue closed while its signature still fails on golden is reopened
with a comment: one GitHub call per verification, none per gate.

**A known failure again.** Under `PREPUSH_ALL=1`, `prepush-tests.mjs` no longer stops other shards on
a failure, so one known failure cannot hide a new one elsewhere; land checks still fail fast. Verify
records `failed-known` instead of bisecting only when every shard finished, none with `error`; the
failing (test, key) pairs equal the previous verification's, each with an issue; and no tool-owned
invocation on a commit between the two verifications recorded any of those tests passing. Otherwise
it bisects, from the newest commit where they passed.

### 5.2 Flaky, rate rose, broken

Computed on demand from the variant's last 100 verdicts (tool-owned kinds), with no stored state.

- **Flaky:** 2 or more proofs (4.2) that are 1% or more of the verdicts (LUCI's numbers).
- **Flake rate rose:** a flaky test failing at least 3 times as often over its last 30 golden verdicts
  as over the 30 days before. A race added to a flaky test shows up here instead of hiding behind the
  label. It is treated as failing, not flaky: verify bisects it (5.3) and `status` reports "flake rate
  rose since <commit>".
- **Broken** (Trunk's monitor): 4 or more golden verdicts, 80% or more failing. Kept apart because
  Meta found a deterministically broken test can score near zero flakiness. Never quarantined; an
  active quarantine ends at once and verify comments on the issue.

Flaky is a fact about history, not a diagnosis: the issue still goes to an agent to find the
mechanism. `status` lists flaky tests with no quarantine and no fix; the pipeline round asks the owner
once per test and, on a yes, lands the entry alone (4.4).

### 5.3 History-aware bisect

- Every bisect point is a `bisect` invocation.
- For a flaky failing test, one re-run proves nothing, so verification never records "not reproduced"
  from a single run. Each bisect point runs the shard 10 times and is bad when failures exceed the 99th
  percentile of Binomial(10, the test's rate over the 30 days before). At a 2% old rate that is 2 or
  more; a race raising it to 30% averages 3. Other tests run once per point.
- When the culprit's land check did not run the failing file, verify writes a miss file pairing that
  file with each file the culprit changed (`dropped` 1 when history dropped it, 5.5).

### 5.4 Shard order

The gate starts first the families whose newest unexpected, unexcused failure on golden is most recent,
ties to the longer median duration: one query, no constants, and `why` explains it in one row.
`startRule()` still decides what may start. Verification does not sort. Files within a shard are not
reordered; Vitest already runs last time's failures first.

### 5.5 History adds and drops tests

**Adds (phase 3).** For a land check with selection on, the gate adds every test file with a miss in
90 days from a file this change touches, and every test file in an affected package that failed on
golden in 7 days and passed since (flaky ones excluded). Only shards where the selector allows file
lists (`fileLevel`, `fileLevelBrowser`, a plain vitest command) take them; elsewhere they are logged as
`would-add`. At most 20 per landing, printed as `[HISTORY] +N files`, and logged with reasons into the
existing `tmp/test-select/advisory.jsonl` with `ingested_through`, so a replay reproduces the answer.

**Drops (off by default).** `PREPUSH_HISTORY_DROP=shadow` (default from phase 4) logs the drop; `=1`
applies it to land checks only. In a shard run whole, a test file is dropped when it has 20 or more
golden verdicts in 30 days and no failure, no miss in 90 days, no exoneration or quarantine in 30
days, no change in 14 days, is not touched by this change, and is not in a GPU family. The rest runs as
selected files, never stored as a whole-shard pass.

**Measuring misses.** In shadow the shard runs whole, so a would-miss is a would-drop file that failed
in the same run. `status` counts would-drop files that actually ran whole, and over how many changes,
not land checks, since most shards in a land check `[SKIP]`. The bar for turning drops on is 2,000 such
file runs over 100 or more changes with no would-miss on a non-flaky test: a two-way door. Two live
misses in 30 days switch the drop off, and a missed file is not dropped for 90 days. Meta's predictive
selection keeps over 95% of failures at half the cost with a trained model; ours is a deterministic
rule, because we have weeks of history, not years.

## 6. Integration

Each change falls back to today's behavior if the ledger throws.

- `vitest.ci-junit.mjs`: the run id in the JUnit name. 2 lines.
- `tools/prepush-tests.mjs`: run ids; records every shard, `[SKIP]` and `cancelled` included;
  `exonerate()`; no stop on failure under `PREPUSH_ALL=1`; the distinct exit status; sorting; history
  files. About 70 lines.
- `tools/prepush.sh` (no gate pass on that status) and `tools/prepush-inputs.mjs` (`PREPUSH_EXONERATE`
  in the key). 4 lines.
- `tools/verify.mjs`: kinds, `record()` at bisect points, issue files and reopening, the flaky bisect,
  `failed-known`, misses, `rebuild`, `prune`. About 80 lines.
- `tools/land.mjs`: kinds, `[KNOWN]` and `[QUARANTINED]` lines, the quarantine refusal. About 20 lines.
  `tools/branch-sync.mjs`: kind `sync`. 2 lines.
- **Issues, not pipeline-round steps.** Verify opens or refreshes one labelled issue per miss, broken
  test and expired quarantine, and issue-round picks them up. The pipeline round keeps only reverting
  the culprit verification names and asking the owner about quarantine. `Failing on golden` issues
  close through their fix's `Fixes #N`.

The code runs from the live copies and goes live with `tools/live.sh gate` and `tools/live.sh land`,
in either order (4.1).

## 7. Failure modes

- **`node:sqlite` missing, locked 10 s, or database not `complete`**: one line, `ledger: unavailable
(<why>); deciding as before`. No exoneration (the failure blocks, as today), no ordering, no history.
  The record is still written.
- **Database corrupt**: the opener reports unavailable and changes nothing; the next verification
  rebuilds and switches `CURRENT`.
- **Issue filing fails**: the claim file stays at issue 0, nothing is excused for it, and the next
  verification retries.
- **A record cannot be written**: one warning; that run is missing, and its exoneration does not apply.

Recording never fails a gate and never passes one. Only `exonerate()` can turn a failure into a pass,
and only on the evidence in 5.1.

## 8. Maintenance

**Dependencies.** None added. `node:sqlite` is built into Node since 22.5, flag-free since 22.13;
this machine runs Node 22.23.2 with SQLite 3.51.3, WAL works. Importing it prints `ExperimentalWarning:
SQLite is an experimental feature`, dynamic import or not, so the module first wraps
`process.emitWarning` to drop only an `ExperimentalWarning` starting with `SQLite`. The code uses only
`DatabaseSync`, `exec`, `prepare`, `run`, `get` and `all`; better-sqlite3 has the same shape and is the
fallback, but needs `pnpm approve-builds` here.

**Budget.** A file past its budget means the design is growing; cut something first.

| File                         | Holds                                                               | Budget    |
| ---------------------------- | ------------------------------------------------------------------- | --------- |
| `tools/test-ledger.mjs`      | open, ingest, rebuild, prune, parsing, hashes, record, queries, CLI | 600 lines |
| `tools/test-ledger.test.mjs` | `node:test` tests in `pnpm run test:ci-workflows`                   | 500 lines |
| `tools/test-quarantine.json` | the quarantine list, usually empty                                  | -         |
| edits elsewhere              | section 6                                                           | 180 lines |

**CLI** (`node tools/test-ledger.mjs`): `status` (golden failures, issues, exoneration counts, flaky,
rate-rose and broken tests, quarantine, misses, unattributed and shadow-drop counts, health); `why
<test or file>` (the rows behind a decision); `sql "<select>"` (read-only); `rebuild`; `prune`.

**Tests** use JUnit fixtures from real files: parsing, cleaning and keys; each exoneration condition
with a real land-check layout (land commit whose first parent holds the evidence); a fix landed after
the evidence; reused passes; duplicate names; an unhandled error beside a known failure; verification
with one known and one new failure in different shards, which must bisect; proofs by run shape; flaky,
rate rose and broken; quarantine read from the base; the 2026-10-22 replay; two processes recording
200 invocations each with nothing lost; deleting the database and rebuilding, after which the same
exoneration still succeeds; and an empty stderr.

**For a future agent.** Record files are the truth; the database is an index, and `rebuild` loses
nothing. Never delete `tmp/test-ledger/records/` or `issues/`. The ledger never decides alone what
reaches master. Each decision has an off switch (`PREPUSH_EXONERATE=0`, removing the sort call,
`PREPUSH_HISTORY_DROP=0`), and `why` shows the rows it used.

## 9. No import of old results

Old JUnit files and gate logs are not imported. Attributing them takes heuristics (matching files to
pushes by modification time) whose mistakes would persist for months, and nothing in phase 1 needs
them: exoneration uses live golden evidence only, and later phases set their bars on live counts,
which accumulate in days. Verification is started once (`node tools/verify.mjs start --again`) as soon
as phase 1 is live, so evidence exists at once.

## 10. Build order

Each phase lands alone and is useful alone.

1. **Recording and exoneration**: JUnit name and cleanup; the module with records, ingest, rebuild,
   prune, hashes, `status`, `why`, `sql`; recording in the gate (reused passes included) and at bisect
   points; kinds; verification running every shard; issue files; `fails-on-golden` with `[KNOWN]`;
   the gate-pass and gate-key changes; the 2026-10-22 replay.
2. **Flaky and broken**: classification, rate rose, the flaky bisect, `failed-known`, the quarantine
   file and `land.mjs`'s refusal, issues for broken tests.
3. **Ordering and history adds**, with misses.
4. **History drops in shadow**, switched on once 5.5's bar is met.
5. **More sources**: the release train's JUnit as kind `ci`, and, with the owner's yes,
   `flaky-on-golden` exoneration.

## 11. Decisions for the owner, and what this changes

- **`flaky-on-golden` exoneration waits for the owner's yes.** LUCI excuses failures of tests flaky
  on the branch; doing that automatically is a quarantine in all but name, which `ci-cd-plan.md` 9.3
  reserves for the owner.
- **Timeouts and group-wide failures are not excused.** Excusing by an issue's signature group within
  a family would have covered days like 2026-10-22, at the price of excusing any new break in any test
  of the group. The narrow rule is chosen; widening it later is a two-way door.
- **`design/ci/fast-pipeline.md` 5.1 changes.** It rejects past results because history is short and
  "a second service that can fall behind" let Anthropic's regressions through. Here the run records
  itself, and history only adds tests until drops are measured in shadow, with verification behind.
  That section gets a pointer here when phase 3 lands.
- **Unchanged:** no automatic retries; the release train is the full run; quarantine only with the
  owner's yes; a failure is explained before it is called flaky; master gets nothing with a known
  error.
