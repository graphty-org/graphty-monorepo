# Test ledger: record every test result and use the history

Status: Proposed, 2026-10-22, revised after two adversarial reviews (the second replaced golden's
recorded word with a direct re-run on golden's tip, 5.1). Issue #3282, part of the fast
pipeline (#3262, `design/ci/fast-pipeline.md`). Background research: `reports/Test result history
tools.md`.

> Changed 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316), while verification runs in CI
> (`node tools/verify.mjs backend ci`; with the `local` backend this document applies as written): the
> backstop of principle 4 is the CI run of `golden-verify.yml`, and its evidence is that run's JUnit
> (each failed test job's `junit-<shard>` artifact), recorded as kind `verify` on the commit (3.2). The local
> kinds stay for what still runs here: the confirming runs and bisect points of a failure (`verify`,
> `bisect`), the nightly sync and hand runs. Land checks run the light gate, with no test shard, so the
> land-check excusing of 5.1 and the `land-check` and `base` kinds are dormant: nothing reaches them.

graphty-monorepo runs tens of thousands of tests a day on one machine and remembers none of them. A
failing landing cannot ask whether the same test already fails on golden, verification cannot ask
whether a test has failed that way before. The **test ledger** is a directory of small record files written by every gate, verification
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

**What the record alone could not fix.** On 2026-10-22 golden sat at one commit for nine hours while 10
land checks from 8 branches failed the graphty shards, most on load-dependent waits and on a different test
nearly every time. Golden's recorded word on each file was always a pass: a commit reaches golden only when
its own land check passed, and verification reuses those passes. So no rule over recorded results could
excuse them. 5.1 therefore asks golden's tip directly, by running the failing files there, and accepts an
expired wait when golden's tip fails the same test.

## 2. Principles

1. **The listener cannot lag.** No service: the process that ran a shard writes its record before it
   prints the verdict, and every reader first ingests any record it has not seen.
2. **One write path.** Every fact is a record file. The database is an index that can be deleted and
   rebuilt with nothing lost. Human decisions (a quarantine) live in git.
3. **The ledger never blocks a push.** Missing, incomplete or broken, every tool behaves as today and
   prints one line saying so.
4. **Verification is the backstop.** It runs every shard to the end and excuses nothing; the release
   train runs again before npm. With the CI backend the backstop is the CI run, its evidence the run's
   JUnit.
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

Kinds: `land-check` (set by `land.mjs`), `base` (a land check's re-run on golden's tip, 5.1), `verify`
and `bisect` (`verify.mjs`), `cut` (`land.mjs cut`, `cut-fix`), `sync` (`branch-sync.mjs`, with the
synced branch), `ci` (the release train's JUnit, phase 5), and `push` when nothing is set. A failed CI
verification run's JUnit artifacts are recorded as `verify` on the failing commit, one record per failed
shard; a test that failed in one report of a shard and passed in another (the quarantine's retry) is not
a failure there. A tool sets
the kind only in its gate child's environment, never in its own `process.env`, so nothing inherits it.
Only `land-check`, `base`, `verify`, `bisect` and `cut` run in worktrees the tools own; only they count
as evidence (5.1) or toward flaky proofs (4.2). A land commit's record names the landed branch (from its
`land: <branch>` subject), not `golden`.

Each invocation records the commit, tree, first parent, whether the worktree was **dirty**
(`git status --porcelain` non-empty when the gate started; the gate asks git once, not per shard),
whether only selected files ran, start time, duration and log path.

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
  exclusive flag (`wx`) and the claimant's pid, so two processes cannot both file one; a claim older than
  10 minutes, or whose process is gone or whose filing failed, is taken over.
- `misses/<id>.json`: a test file a landing's selection missed (5.4).
- `CURRENT`: one line naming the database file, `ledger-<timestamp>.db`.

**Reading.** `open()` opens the database `CURRENT` names (WAL, `busy_timeout` 10 s,
`foreign_keys = ON`) and ingests every record it lacks: it reads the day directories from
`meta.ingested_through` on, plus `issues/` and `misses/`, with `INSERT OR IGNORE`. Every reader
ingests first, so none sees stale data and no record can fall outside a window. A reader takes the
write lock (one `BEGIN IMMEDIATE` transaction) only when there is something new to write, so readers of
an up-to-date index never wait on each other.

**Rebuilding.** `rebuild` writes a new `ledger-<timestamp>.db` from every file, marks it `complete`,
and atomically replaces `CURRENT`. It never renames or deletes a database another process may hold
open: old connections finish on the old file, and their records reach the new one at the next ingest.
A database without `complete` is unavailable for decisions, so no gate ingests months of files inside
a shard. Verification runs `rebuild` at its start when `CURRENT` is missing, incomplete or reports
`SQLITE_CORRUPT`, never because it was busy. `prune` deletes database files that are not `CURRENT` and
older than a day, and temporary record files a killed writer left.

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
| `exoneration`  | invocation and test                 | reason (`fails-on-golden`), the evidence invocation on golden's tip, issue                                                                          |
| `golden_issue` | signature                           | issue, culprit, opened_at                                                                                                                           |
| `miss`         | culprit, test file and changed file | dropped, found_at                                                                                                                                   |

Child rows cascade on delete. Every table is filled from files, so `rebuild` replays all of it.
Schema changes are additive only. Older code reads a newer database and ignores unknown columns; it
refuses only when `min_reader_version` exceeds its own, which only a non-additive change would raise.
So the gate, land and verify live copies, which go live at different times, never disable each other.

### 4.2 "Flaky" without retries

LUCI calls a verdict flaky when one invocation holds a pass and a fail, which needs retries. Here
**a test is proven flaky on a tree when two invocations of that tree in the same variant disagree:
one recorded it failing, the other ran its file with no failure and its usual number of skips.** Both
must be `passed` or `failed`, not dirty, of the tool-owned kinds, and real runs (a reused pass is a copy,
not a run). The same run shape keeps an order-dependence bug (passes in the whole shard, fails among
selected files) from looking like noise; the usual skip count keeps a conditional skip from counting as a
pass while a file with a permanent `it.skip` still counts. Datadog, Mergify, Trunk and Meta use this rule.

### 4.3 Signature and key

1. Strip ANSI codes and empty lines. The **informative lines** are the rest, without stack frames, a bare
   error name (`AssertionError:`, `Error:`), Storybook's "Click to debug" link, Testing Library's
   "Ignored nodes:" and DOM dump lines.
2. Clean them: remove the checkout root (main checkout or `.worktrees/<name>/`), and replace `/tmp/...`
   paths with `<tmp>`, UUIDs with `<uuid>`, hex runs of 7 or more with `<hex>`.
3. **Key**: the first two informative lines with numbers kept, hashed. "43 shapes, 42 drawn" and "51
   shapes, 50 drawn" from one story differ, where their shared first line `AssertionError:` did not.
4. **Signature**: the first informative line with `:line:col` dropped and other numbers as `<n>`, plus
   up to two stack frames outside `node_modules` masked the same way; for an **expired wait**, `timeout`
   plus the test file. An expired wait is a Vitest "timed out", a Playwright `TimeoutError` / "Timeout
   <n>ms exceeded", Testing Library's "Unable to find" and `expect.poll`: all are load-dependent and carry
   no cause. Hashed.

Hashes are the first 16 hex of sha256. Signatures group failures for issues; exoneration and
`failed-known` require the same test and key (an expired wait: the same test).

### 4.4 Quarantine

Owner's decision, 2026-10-22: the quarantine is automatic and on by default (`tools/test-quarantine.mjs`,
off only with `GRAPHTY_TEST_QUARANTINE=0`). The gate and CI retry a shard's failed test files once; a test that
failed and then passed on the same inputs is quarantined with its own `priority:high` issue, and its failures are
let through, loudly, in every gate and CI run. An entry leaves when its issue closes, after 20 consecutive passing
gate runs, or after 14 days. The gate holds a new entry locally at once; the pipeline round commits it into
`tools/test-quarantine.json` with `node tools/test-quarantine.mjs write`, alone. Entries come only from the gate's
own detection, never by hand.

The ledger does not excuse quarantined tests, and `land` does not police the list: both were cut while the
quarantine waited for the owner, and are not back yet. When they return, these rules hold (`ci-cd-plan.md` 9.3): an
issue, 14 days at most, never a GPU correctness test (`webgpu-graph-algorithms*`), the visual gate or a test
guarding against silent CPU-for-GPU substitution; the list read from golden's tip, never from the tree under test;
verification and the cut never excuse a quarantined failure. `checkQuarantine()` in `tools/test-ledger.mjs` checks
an entry's shape against them.

## 5. Decisions

Every rate, flaky, broken and drop statistic counts **failure rows whatever their exoneration**: an
excused failure is still a failure.

### 5.1 Excuse a failure golden's tip has too

**When.** Only in a land check, for a shard whose outcome is `failed`. Dormant while verification runs
in CI: the light gate runs no shard, so no land check fails one. The gate refuses whenever
`PREPUSH_ALL=1`, `PREPUSH_EXONERATE=0`, or the push goes to `golden-cut` or `master`. Branch pushes are
never excused.

**Ask golden directly.** Golden's tip is the first commit below the land commit, on the first-parent
line, that GitHub's golden already has or that is not itself a landing (a group lands as several
`land: <branch>` commits in a row, so an earlier branch of the group is never mistaken for golden). For
each failing test T in file F:

1. The landing must not change F, and T's name must be unique in F (`dup_names` 0). Otherwise the shard
   fails as it would without the ledger.
2. A run of exactly golden's tip that failed T (kinds `land-check`, `base`, `verify`, `bisect`, `cut`;
   not dirty) is the answer, with no re-run.
3. Otherwise the gate runs the failing files on golden's tip: a scratch worktree beside the check
   (`.worktrees/land-check-<n>-base`, the landing tool's `prepareScratch`), the shard's package built (nx's
   cache makes it cheap), `run-tests.sh --command` with only those files (the whole shard when its command
   is not a plain vitest run), no pass reuse, recorded as kind `base` on that commit. Up to two tries, so a
   wait that expires under load gets a second chance; a run killed or broken by the machine gives no answer.
4. T is excused when golden's tip failed T with the same key, or T's failure in the land check was an
   expired wait and golden's tip failed T at all. A shard is excused only when every failing test is.

The gate then files the signature's `Failing on golden` issue (the claim in 3.5), or finds it, and prints:

```
  [KNOWN] graphty-2: graphty/src/a.test.tsx > t fails the same way on golden's tip 1a2b3c4d5e (<record id>), issue #3290; coverage not checked
```

A failure golden's tip does not reproduce blocks the landing as before.

**What the gate does with it.** An excused shard does not stop the others, gets no shard pass, and the
stage exits 3. `prepush.sh` then records the gate's pass as `gate-known` instead of `gate`, which only a
push with `TEST_LEDGER_KIND=land-check` accepts (`prepush.sh` and `push-queue.sh`): the landing's own push
of the same files fast-forwards in seconds, and no other push reuses it. `PREPUSH_EXONERATE` joins the
gate key (`laneEnv()` in `tools/prepush-inputs.mjs`), so `PREPUSH_EXONERATE=0` really runs a strict gate.
`golden-verified` does not move past the failure, and cuts wait for the fix.

**Issues.** One per signature, titled `Failing on golden: <first line>`, labelled `bug`,
`priority:high`, `effort:medium`, listing tests, keys, commit and log, with a `<!-- test-ledger
signature=<sig> -->` marker. Filed by a land check whose re-run reproduced the failure, and by
verification for a failure that is not reproduced or that comes back in the next verification. Never for a
failure the bisect pins on a landing: the pipeline round reverts it, and `verify.mjs handled` closes the
issues land checks filed for it with a comment. A mapped issue closed while its signature still fails on
golden is reopened.

**A known failure again.** Under `PREPUSH_ALL=1`, `prepush-tests.mjs` does not stop other shards on a
failure (a failed family counts as warmed, so the rest of its package still starts), so one known failure
cannot hide a new one elsewhere; land checks still fail fast. Verify records `failed-known` instead of
bisecting only when every shard finished, none with `error`; the failing (test, key) pairs equal the
previous verification's; and no tool-owned invocation that really ran on a commit between the two recorded
any of those tests passing. A live claim on the previous failure stays a claim (`known: true` beside it).

### 5.2 Flaky and broken

Computed on demand from the family's last 100 real verdicts (tool-owned kinds), with no stored state.

- **Flaky:** 2 or more proofs (4.2).
- **Broken** (Trunk's monitor): 4 or more golden verdicts, 80% or more failing. Kept apart because
  Meta found a deterministically broken test can score near zero flakiness. A broken test is never
  bisected as flaky.
- **Rate:** the failure rate over golden's own verdicts (chain commits, imports left out), so a branch's
  land checks failing a test it broke do not raise it.

Flaky is a fact about history, not a diagnosis: the issue still goes to an agent to find the mechanism.

### 5.3 History-aware bisect

- Every bisect run is a `bisect` invocation.
- A point is bad only when one of the failures verification saw fails there (the same test and key; for
  an expired wait, the same test). A run that fails otherwise (another test, a killed run, a coverage
  error) is run once more and never counted as bad, so load-dependent failures of unrelated tests do not
  name an innocent landing.
- For a flaky failing test, one re-run proves nothing, so verification never records "not reproduced"
  from a single run. Each bisect point runs only the failing files, up to 10 times, and is bad when
  failures reach the smallest count whose probability under Binomial(10, the test's golden rate before the
  range) is 2% or less (at a 2% rate, 2; capped at 10). It stops as soon as the answer is settled.
- When the culprit's land check did not run the failing file, verify writes a miss file pairing that
  file with each file the culprit changed (`dropped` 1 when history dropped it, 5.4).

### 5.4 History adds and drops tests

Superseded by `design/ci/history-selection.md` (phase 2, issue #3324), which redoes adds and drops for the
light gate of `design/ci/ci-full-testing.md`. The text below is the earlier plan, kept for its reasoning.

**Adds (phase 3).** For a land check with selection on, the gate adds every test file with a miss in
90 days from a file this change touches, and every test file in an affected package that failed on
golden in 7 days and passed since (flaky ones excluded). Only shards where the selector allows file
lists (`fileLevel`, `fileLevelBrowser`, a plain vitest command) take them; elsewhere they are logged as
`would-add`. At most 20 per landing, printed as `[HISTORY] +N files`, and logged with reasons into the
existing `tmp/test-select/advisory.jsonl` with `ingested_through`, so a replay reproduces the answer.

**Drops (off by default).** `PREPUSH_HISTORY_DROP=shadow` (default from phase 4) logs the drop; `=1`
applies it to land checks only. In a shard run whole, a test file is dropped when it has 20 or more
golden verdicts in 30 days and no failure, no miss in 90 days, no exoneration in 30 days, no change in 14 days, is not touched by this change, and is not in a GPU family. The rest runs as
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
- `tools/prepush-tests.mjs`: run ids and one git call per gate; records every shard, `[SKIP]` and
  `cancelled` included; the re-run on golden's tip and `exonerate()`; no stop on failure under
  `PREPUSH_ALL=1`; exit 3. About 150 lines.
- `tools/prepush.sh` and `tools/push-queue.sh` (`gate-known`), `tools/prepush-inputs.mjs`
  (`PREPUSH_EXONERATE` in the key). 10 lines.
- `tools/verify.mjs`: kinds, `record()` at bisect points, point verdicts, issue files, reopening and
  closing, the flaky bisect, `failed-known`, `rebuild`, `prune`. About 150 lines.
- `tools/land.mjs`: kinds and the `[KNOWN]` lines. `tools/branch-sync.mjs`: kind `sync`. 10 lines.
- **Issues, not pipeline-round steps.** The pipeline round only reverts the culprit verification names and
  runs `handled`. `Failing on golden` issues close through their fix's `Fixes #N`.

The code runs from the live copies and goes live with `tools/live.sh gate` and `tools/live.sh land`,
in either order (4.1).

## 7. Failure modes

- **`node:sqlite` missing, locked 10 s, or database not `complete`**: one line, `ledger: unavailable
(<why>); deciding as before`. A land check still re-runs its failures on golden's tip and decides from
  that run alone; verification bisects as before. The record is still written.
- **Database corrupt**: the opener reports unavailable and changes nothing; the next verification
  rebuilds and switches `CURRENT`.
- **The re-run on golden's tip cannot run** (no worktree, the build fails, the machine kills it): no
  answer, and the failure blocks, as without the ledger.
- **Issue filing fails**: the claim file stays at issue 0 and is taken over by the next filer; the land
  check still excuses the failure (`issue not filed yet`), because golden's tip reproduced it and
  verification, which never excuses, files it.
- **A record cannot be written**: one warning; that run is missing.

Recording never fails a gate and never passes one. Only `exonerate()` can turn a failure into a pass,
and only when golden's tip fails the same way (5.1).

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
| `tools/test-ledger.mjs`      | open, ingest, rebuild, prune, parsing, hashes, record, queries, CLI | 950 lines |
| `tools/test-ledger.test.mjs` | `node:test` tests in `pnpm run test:ci-workflows`                   | 550 lines |
| edits elsewhere              | section 6                                                           | 330 lines |

The first budget (600 lines) was missed; the second review cut the quarantine file, the shard order and
"flake rate rose", none of which a decision used, and the budget above is what remains, about a third of it
JSDoc.

**CLI** (`node tools/test-ledger.mjs`): `status` (golden failures, issues, exoneration counts, flaky and
broken tests, unattributed counts); `why <test or file>` (the rows behind a decision); `sql "<select>"`
(read-only); `rebuild`; `prune`.

**Tests** use JUnit fixtures from real files: parsing, cleaning and keys (the AllNodeShapes pair must
differ); each exoneration condition with a real land-check layout and a fake re-run (golden's tip fails the
same way, another way, not at all twice; an expired wait on the second try; a group landing; a changed
file; a duplicated name; golden's own failing run used with no re-run); the gate itself in a throwaway
repository (an excused shard exits 3 and files its issue with no database at all; a failure golden's tip
lacks blocks; same-package shards under `PREPUSH_ALL=1`); point verdicts; reused passes and permanent
skips in rates; the threshold cap; the 2026-10-22 replay; claims; two processes recording 200 invocations
each with nothing lost; deleting the database and rebuilding; and an empty stderr.

**For a future agent.** Record files are the truth; the database is an index, and `rebuild` loses
nothing. Never delete `tmp/test-ledger/records/` or `issues/`. The ledger never decides alone what
reaches master. Each decision has an off switch (`PREPUSH_EXONERATE=0`, `PREPUSH_HISTORY_DROP=0`), and
`why` shows the rows it used. An excuse is always a run on golden's tip: `why <file>` lists the `base`
invocation behind every `[KNOWN]`.

## 9. Import of old results, never as evidence

The history already on disk was imported once (`node tools/test-ledger-import.mjs`, 2026-10-23, a one-time script to delete once its records age out): every gate in
`tmp/push-log.jsonl` (its `[PASS]` lines, and each failed shard's kept log in `tmp/push-gate-logs/`), and every
shard pass in `tmp/prepush-passes/shard/`. Nothing is matched by time: each record comes from one log line that
names its shard and commit. They carry kinds `import-<kind>` (the kind read from the worktree the gate ran in;
`.worktrees/golden-cut` is `import-cut`), which count in flaky proofs and `status` but never in rates (most
imported passes have no per-file rows) and are never exoneration evidence. A pass learns its file list from a failed run of the same shard on the same tree,
which ran the same files. The import is idempotent (record ids are hashes), and `prune` ages it out with the rest.

## 10. Build order

Each phase lands alone and is useful alone.

1. **Recording and exoneration**: JUnit name and cleanup; the module with records, ingest, rebuild,
   prune, hashes, `status`, `why`, `sql`; recording in the gate (reused passes included) and at bisect
   points; kinds; verification running every shard; issue files; the re-run on golden's tip with
   `[KNOWN]`; `gate-known` and the gate-key change; the 2026-10-22 replay.
2. **Flaky and broken**: classification, point verdicts, the flaky bisect, `failed-known`.
3. **History-based selection** (`design/ci/history-selection.md`): miss files after a bisect, relative
   test paths, retry-passes never let through unseen, and a ranking in `test:changed` only; no gate step,
   no adds, no drops (the replay found nothing worth either).
4. **More sources**: the release train's JUnit as kind `ci`, and the ledger's excuse of quarantined tests (the
   quarantine itself is on since 2026-10-22, 4.4).

## 11. Decisions for the owner, and what this changes

- **`flaky-on-golden` exoneration waits for the owner's yes.** LUCI excuses failures of tests flaky
  on the branch; doing that automatically is a quarantine in all but name, which `ci-cd-plan.md` 9.3
  reserves for the owner.
- **Expired waits are excused only when golden's tip fails the same test.** A wait carries no cause, so a
  new hang in such a test would be excused while golden's tip also fails it; verification, which never
  excuses, still sees it. Group-wide excuses (by signature within a family) are not made.
- **No quarantine file.** A quarantine is the owner's decision (`ci-cd-plan.md` 9.3); the file, its check
  and the landing refusal come back when the owner asks for one.
- **`design/ci/fast-pipeline.md` 5.1 changes.** It rejects past results because history is short and
  "a second service that can fall behind" let Anthropic's regressions through. Here the run records
  itself, and history only adds tests until drops are measured in shadow, with verification behind.
  That section gets a pointer here when phase 3 lands.
- **Unchanged:** the release train is the full run; a failure is explained before it is called flaky;
  master gets nothing with a known error. (Since 2026-10-22 the gate and CI retry failed test files once
  and quarantine flaky tests automatically, by the owner's decision; see 4.4.)
