# History-based test selection

Status: Proposed, 2026-10-23. Issue #3324. Phase 2 of the test ledger (`design/ci/test-ledger.md`):
the ledger's first phase records every test result; this phase uses those results to choose and
rank tests. It replaces the "history adds" and "history drops" parts of that document (its sections
5.4 and 10, items 3 and 4), which were written for a gate that ran test shards.

Words used throughout:

- **the light gate**: `tools/prepush.sh` with its test stage off (`PREPUSH_LIGHT=1`), the gate every
  push and landing runs once `design/ci/ci-full-testing.md` is switched on. It builds, lints, runs
  SonarQube and the NVIDIA GPU tests, and no test shard.
- **CI verification**: the full `ci.yml` run on golden's newest commit (`golden-verify.yml`, started by
  `tools/verify.mjs`). It runs every test, and a failure is bisected to the landing that caused it.
- **import selection**: `tools/test-select.mjs`, which maps changed files to the test files that
  import them (`design/ci/minimal-tests.md`).
- **a change-caused failure**: a test file that failed because of a change, not because it is flaky
  or was already failing on golden. The evidence is a bisect that names the landing, or a land check
  that failed a test that golden's tip passed.

## 1. What the history says

Measured from the ledger on 2026-10-23 (`node tools/test-ledger.mjs sql`; 13,586 invocations from
2026-10-08 to 2026-10-24, imported history included; the script is
`tmp/history-selection-3324/measure.mjs` in the main checkout). One "failure" below is one test file
failing on one commit.

| Measure                                                                                                   | Count       |
| --------------------------------------------------------------------------------------------------------- | ----------- |
| Failures                                                                                                  | 219         |
| Commits and test files involved                                                                           | 156 and 108 |
| Failure in a test file the change itself edited                                                           | 14 (6%)     |
| Predicted by history from other branches: the file failed in 7 days, in a touched package                 | 35          |
| Predicted by co-failure: the file failed in 90 days on another branch's change that shared a changed file | 19          |
| Predicted by either                                                                                       | 40 (18%)    |
| No change computable (commit no longer exists)                                                            | 19          |

The import selector's replay (`design/ci/test-selection-replay.md`) found 11 misses in 1,185 gate
runs. History explains all of the 9 that name a test file, and none of them was the change's fault:

- 6 were flaky tests that had failed on another branch in the 7 days before
  (`coverage-frees-removed-pages.test.ts` three times, `render-budget.test.ts`, `page.test.mjs`,
  `PaintTreeStyle.real-element.test.tsx`).
- 3 were tests already failing on golden, 14 to 17 minutes earlier (the start-page tests on
  2026-10-20 and 2026-10-21).
- The other 2 name no test file, so no history can point at them.

So the import selector has no change-caused misses on record. History does not find tests that import
selection misses; it tells us **which of the selected tests are most likely to fail**, and which are
flaky or already broken. That decides the design: history ranks within a budget, it is not a second
selector.

Unbudgeted, history would add a median of 13 and a 90th percentile of 62 test files per change, most
of them flaky tests in a big package. Adds are therefore capped and ranked, never run wholesale.

Two data defects must be fixed first, because each splits or empties a history:

- Some webgpu-graph-algorithms file names hold an absolute worktree path
  (`webgpu-graph-algorithms/no-subgroups//home/.../.worktrees/land-check-2/.../bfs.test.ts`), so the
  same test has one history per worktree. The JUnit parser must make paths relative to the package.
- 589 invocations this week are `unattributed` (no JUnit carries their run id), and the `miss` table of
  the ledger's section 4.1 does not exist yet, so no miss has ever been recorded.

## 2. What others do

- **Anthropic** picks each pull request's tests with a "deterministic test selection service" from
  package relevance and past results. A listener records every CI result; when it lagged, flaky tests
  blocked merges and bad merges spread failures. Misses are caught after merge by automated bisect and
  revert. Our match: import selection is finer than package relevance, the ledger is the listener (it
  cannot lag: the run writes its own record), and CI verification with bisect is the backstop.
- **Google TAP** selects by the build graph, runs the affected targets after submit in batches, and
  finds culprits. Its published analysis found that tests far from the change in the dependency graph
  and with no failure history rarely fail, which is the rule behind our drop switch (section 4.3).
- **Meta's predictive test selection** trains a model on changed files, test history and graph
  distance, and catches over 95% of individual failures and over 99.9% of faulty changes while running
  a fraction of the tests. It needs years of data and a training pipeline; we have weeks, so we use
  counts.
- **Launchable (CloudBees)** ranks tests by predicted failure for the change and runs a subset with a
  time target ("the most likely to fail in 10 minutes") before merge and the full suite later. Our
  budget is that idea without the model.

## 3. Where selection runs

| Place                                   | What history does                                                     | Default                     |
| --------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| The light gate (every landing and push) | Runs the highest-ranked test files for the change, in a fixed budget  | On, 180 s budget            |
| `pnpm run test:changed`                 | `--budget <s>` runs exactly what the gate would; `--dry-run` explains | Unbudgeted, as today        |
| CI verification                         | Nothing: it runs every test to the end                                | -                           |
| The drop switch                         | Leaves out import-selected files history says never fail              | Off (`shadow` logging only) |

### 3.1 The light gate: likely tests in a budget

The owner asked for landing checks under 10 minutes that test the exact change, and later for a
light gate of lint, build, SonarQube and GPU with the full tests in CI. A small budgeted test step
serves both: it tests the exact change, and it cannot grow past its budget.

**The step, "Likely tests".** After the build (the tests read other packages' `dist/`), beside lint
and knip, as the NVIDIA step already runs beside other steps:

1. The change is the push's files since its push base (`tools/push-base.mjs`); for a land check,
   the branch against golden's tip.
2. The candidates are import selection's file-level answer for that change, plus at most 20
   co-failure adds (section 4.1), only in shards whose command is a plain vitest run
   (`selectedCommand()` in `tools/test-select.mjs`). A shard whose selection is "all" contributes its
   files, not the whole shard.
3. Left out, each printed once: tests in `tools/test-quarantine.json` or the gate's local quarantine
   state, tests failing on golden right now (the open `Failing on golden` signatures and the last CI
   verification's failures), and the lifecycle and GPU families (the NVIDIA step owns the GPU tests).
   A test already failing on golden would block every unrelated landing, which the owner's rule forbids;
   verification and its issue own it.
4. The candidates are ranked (section 4.1) and taken in order until their recorded durations add up to
   `PREPUSH_LIKELY` seconds (default 180; `0` turns the step off). A file with no recorded duration
   counts 30 s. One file is always taken, even past the budget.
5. They run as one `vitest run` per shard (`selectedCommand()`), no coverage, under one test slot,
   through `tools/test-quarantine.mjs`, so a failing file gets the quarantine's one retry and a test
   that then passes is quarantined with its issue, as in every other gate run. A failure that the retry
   confirms fails the gate. The step records its runs in the ledger as kind `land-check` or `push`.
6. It prints one line per file run: `[LIKELY] graphty/src/a.test.tsx score 7 (co-failed 2x with
src/a.tsx, edited)`, and one summary: `[LIKELY] 9 of 41 selected files, 172 s of 180 s`.

`PREPUSH_LIKELY` joins `laneEnv()` in `tools/prepush-inputs.mjs`, so a pass with one budget never
stands in for another. Wall time is about the budget divided by the vitest workers, mostly hidden
behind lint.

**What the budget leaves out is not lost.** CI verification runs every test about 37 minutes later. A
change-caused failure the step did not run is bisected to its landing and reverted, and verify writes a
miss (section 4.2), which raises that test's score for the next change to the same files.

### 3.2 `pnpm run test:changed`

Unchanged by default: it runs every import-selected file. `--budget <s>` runs exactly the gate's
likely-tests set, so passing it means the gate's step passes. `--dry-run` prints every candidate with
its score, the reasons and the budget line. It reads the ledger, never writes it.

### 3.3 CI verification: no ordering

Ordering shards or files by failure likelihood in CI buys nothing: the 25 test jobs run at once, each
runs to the end with no bail, and `verify.mjs` already fails fast on the first failed job. So CI is not
touched. Its results do feed the history: section 5.

## 4. The scoring

### 4.1 Score

For candidate test file `t` and a change `C` (its changed files minus the lockfile, root configs,
`.github/`, `design/`, `reports/` and `visual-baselines/`, which change for everything):

```
score(t) = 3 x causes(t, C)    // bisect named a landing that changed a file in C and t failed
         + 1 x cofail(t, C)    // t failed on another change that shared a file with C, capped at 5
         + 2 x edited(t)       // C edits t itself
         + 1 x recent(t)       // t failed anywhere in the last 7 days
```

- `causes`: miss and cause records (section 4.2) from 90 days, distinct landings.
- `cofail`: distinct changes in 90 days, on another branch, of at most 30 files (a bigger change
  pairs everything with everything), in which `t` failed with outcome `failed`, not on golden at the
  time, and not proven flaky (the ledger's section 4.2).
- `recent`: any failure, flaky included; it ranks the test up, and the quarantine retry absorbs a
  flake.

Ties go to the shorter file (more tests in the budget), then the name. Every term is a count anyone can
check with `node tools/test-ledger.mjs why <file>`. No weights are learned and no library is added; if
the replay (section 5) shows a weight is wrong, it is changed by hand.

**Co-failure adds.** A test file outside import selection with `causes + cofail >= 2` is a candidate
too, at most 20 per change, in shards that allow file lists. Elsewhere it is logged as `would-add`.

### 4.2 The data it reads

From the ledger, in one query per gate:

- `failure` joined to `invocation` and `test`: failures by file, time, branch and commit.
- `file_run`: the median `ms` of a file's last 5 real runs, for the budget.
- the change of each failing invocation: a new column `changed` (the change's files, at most 200
  paths, as JSON), written by `record()` from the gate's own change list. Older rows get it from one
  `git diff --name-only` against their base, or their merge base with golden. Only failing invocations
  need it (156 commits so far).
- `miss` files (the ledger's section 3.5), written by `verify.mjs` after a bisect for every failing
  file of the culprit, with each file the culprit changed and a new field `ran` (whether the culprit's
  gate ran that file; `0` is a miss). `causes` counts all of them.
- the `Failing on golden` signatures and `tools/test-quarantine.json`, for the exclusions.

Imported records count toward scores: a score is a hint, not evidence, and the ledger's rule that
imported records never excuse a failure is unchanged.

### 4.3 The drop switch

`PREPUSH_HISTORY_DROP`: `0` (off), `shadow` (default once CI results are ingested, section 5) or `1`.
It applies only where import-selected files run in full: `test:changed` without `--budget`, and a gate
with `PREPUSH_LIGHT=0` (the explicit local fallback). It never touches CI.

A file is a would-drop when it has 20 or more passing CI-verification runs in 30 days and no failure,
no miss in 90 days, no change in 14 days, is not edited by this change, has `cofail` 0, and is not in a
GPU family. In `shadow` it runs and is logged as `would-drop`; `1` leaves it out and prints `[DROP] N
files`.

### 4.4 Cold start and a missing ledger

- **No history**: every score is `edited` only, so the step runs the test files the change edits, then
  import-selected files shortest first, at 30 s each until measured: about 6 files in the budget.
  Ranking improves as CI results arrive; nothing waits for it.
- **Ledger missing, locked, incomplete or broken**: one line, `history: unavailable (<why>); ranking
by import selection only`, and the cold-start order. The gate never blocks on the ledger and never
  waits more than the ledger's 10 s lock.
- **Import selection fails** (no graph): the step prints why and runs nothing; CI covers it.

## 5. Feeding it: CI results

Once verification runs in CI, this machine runs few tests, so the history must come from CI. After
every completed CI verification run, `verify.mjs` downloads the `junit-<shard>` artifacts (one list
call and one download per shard, about 37 REST calls a run, about 15 an hour) and records each shard as
kind `ci`, with the run's commit. This is the ledger's phase 5 item "the release train's JUnit as kind
`ci`", brought forward and applied to verification. `ci` records count toward scores and the drop rule's
passing runs; they are evidence only where the ledger already says so.

## 6. How it is measured

`node tools/test-history.mjs replay [--since <date>]` replays every change with a change-caused
failure (bisect culprits, and land-check failures of tests golden's tip passed), and a sample of 200
changes without one. For each it ranks with only the rows recorded before the change, applies the
budget, and reports:

- **recall at budget**: the share of change-caused failing files the budgeted set held;
- **minutes**: the budgeted set's recorded time against all import-selected files;
- **misses**: each change-caused failure outside the set, with its score and rank.

`node tools/test-ledger.mjs status` adds the live figures: the step's recall over 30 days (from miss
records with `ran` 0 and `[LIKELY]` failures), its median wall time, and the drop switch's would-drop
file runs and would-misses.

**Bars, all two-way doors:**

- **The likely-tests step stays** when, after 30 days with at least 20 change-caused failures, its
  recall is 70% or more and its median wall time is under 4 minutes. Below 50% recall, or over 4
  minutes, the step is deleted: CI catches the rest, and a step that rarely catches anything is
  machinery for nothing.
- **The drop switch goes to `1`** after 2,000 would-drop file runs in CI over 100 or more landings with
  no would-miss on a non-flaky test. Two live misses in 30 days return it to `shadow`, and a missed file
  is never dropped again for 90 days.

## 7. Code and size budget

| File                                                                     | Holds                                                                  | Budget    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------- |
| `tools/test-history.mjs` (new)                                           | the score query, ranking, budget, exclusions, `replay`                 | 250 lines |
| `tools/test-history.test.mjs`                                            | `node:test`: scores, budget, exclusions, cold start, no ledger, replay | 200 lines |
| `tools/test-ledger.mjs`                                                  | the `changed` column, `ran` on misses, kind `ci`, relative paths       | +30 lines |
| `tools/verify.mjs`                                                       | download and record CI JUnit, write misses after a bisect              | +50 lines |
| `tools/prepush.sh`, `tools/prepush-inputs.mjs`, `tools/test-changed.mjs` | the step, the key, `--budget`                                          | +40 lines |

`tools/test-ledger.mjs` is already at 967 lines against its 950-line budget, so it gets only the data
changes and must shed 47 lines first; everything about selection goes in the new file. The new code
keeps SonarQube's limits (cognitive complexity 15 per function).

## 8. Build order

Each step lands alone; the gate step is useful from the first day because of cold start.

1. Data fixes: relative test paths, the `changed` column, misses with `ran`.
2. CI results recorded as kind `ci` after each verification run.
3. `tools/test-history.mjs` with `replay`; `test:changed --budget` and `--dry-run`.
4. The light gate's likely-tests step, at 180 s, live through `tools/live.sh gate`.
5. The drop switch in `shadow`; `status` figures.
6. After 30 days: the bars in section 6 decide whether the step stays and whether drops go to `1`.
