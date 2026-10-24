# History-based test selection

Status: Built, 2026-10-23, small. Issue #3324. Phase 2 of the test ledger (`design/ci/test-ledger.md`):
the ledger's first phase records every test result; this phase uses those results to rank the tests a
developer runs by hand, fixes the data defects that split its history, and closes the quarantine's gap
where a change that makes a test intermittent got through unseen. It replaces the "history adds" and
"history drops" parts of that document (its sections 5.4 and 10, items 3 and 4), which were written for a
gate that ran test shards.

Words used throughout:

- **the light gate**: `tools/prepush.sh` with its test stage off (`PREPUSH_LIGHT=1`), the gate every
  landing runs once `design/ci/ci-full-testing.md` is switched on. It builds, lints, runs SonarQube and the
  NVIDIA GPU tests, and no test shard.
- **CI verification**: the full `ci.yml` run on golden's newest commit (`golden-verify.yml`, started by
  `tools/verify.mjs`). It runs every test, and a failure is bisected to the landing that caused it.
- **import selection**: `tools/test-select.mjs`, which maps changed files to the test files that
  import them (`design/ci/minimal-tests.md`).
- **a retry-pass**: a test that failed and then passed when the quarantine wrapper
  (`tools/test-quarantine.mjs`) ran its file once more.
- **a change-caused failure**: a test file that failed because of a change, not because it is flaky or
  was already failing on golden. Only a bisect that names the landing proves one.

## 1. What the history says

Measured from the ledger on 2026-10-23 (13,586 invocations from 2026-10-08 to 2026-10-24, imported
history included). One "failure" is one test file failing on one commit.

| Measure                                                                                                   | Count       |
| --------------------------------------------------------------------------------------------------------- | ----------- |
| Failures                                                                                                  | 219         |
| Commits and test files involved                                                                           | 156 and 108 |
| Failure in a test file the change itself edited                                                           | 14 (6%)     |
| Predicted by history from other branches: the file failed in 7 days, in a touched package                 | 35          |
| Predicted by co-failure: the file failed in 90 days on another branch's change that shared a changed file | 19          |
| Predicted by either                                                                                       | 40 (18%)    |

The import selector's replay (`design/ci/test-selection-replay.md`) found 11 misses in 1,185 gate runs.
All 9 that name a test file were the change's fault in none of the cases: 6 were flaky tests that had
failed on another branch in the 7 days before, and 3 were tests already failing on golden. So **import
selection has no change-caused miss on record**, and history does not find tests that import selection
misses. Section 5 replays the ledger again with the inputs that survive the new regime, and confirms it.

## 2. Review: what changed in this design, and why

The first draft (2026-10-23, commit e6b33107a8) put a budgeted "likely tests" step into the light gate,
added co-failure tests outside import selection, and added a drop switch in shadow. Its review raised
nine problems. Each is settled here.

| #   | Problem                                                                                                                                           | Settled                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | (blocker) The gate step puts tests back into the light gate, which the owner asked to be lint, build, SonarQube and GPU only                      | **Fixed: the step is deleted.** No gate runs history ranking. Tests in landings would be a change to `design/decisions/2026-10-23-full-tests-in-ci-adopted.md`, for the owner, not for this design.                                                                                                                                |
| 2   | (blocker) Tests beside lint on this machine would block landings on load failures, and spread quarantine decisions across every landing           | **Fixed with 1.** Confirmation, quarantine and revert stay in `verify.mjs`.                                                                                                                                                                                                                                                        |
| 3   | (major) The step would run inside verification's bisect gates (`localGate`, `PREPUSH_LIGHT=1`, `PREPUSH_ALL=1`) and could blame the wrong landing | **Fixed with 1:** with no step there is nothing to run at a bisect point. No `PREPUSH_LIKELY` switch exists to set; `localGate` is unchanged.                                                                                                                                                                                      |
| 4   | (major) A change that makes a test fail some of the time got through: a retry-pass was quarantined, CI counted it as passed, no miss, no bisect   | **Fixed, section 6**, for both places a retry-pass happens: a land check (`PREPUSH_LIGHT=0`) fails on one with no failure before the change and names the landing as suspect for the rest; CI verification keeps retry-passes as failures, and reads a green run's `[FLAKY]` warnings.                                             |
| 5   | (major) The numbers argue against co-failure adds: no change-caused miss on record, history predicted 18%                                         | **Fixed: co-failure adds are cut.** Ranking stays only in `pnpm run test:changed --dry-run` and `--budget`, as an aid for the developer. The replay (section 5) measures what adds would have cost and caught: 219 minutes, 0 of 9 misses.                                                                                         |
| 6   | (major) Most inputs stop arriving once tests leave branches: co-failure and "recent" were measured from branch-side runs                          | **Fixed: the inputs are re-derived** from what the new regime produces: CI verification (kinds `verify`, `bisect`, `cut`, `base`) and bisect culprits (miss files). Every branch-side measure is dropped.                                                                                                                          |
| 7   | (major) The drop switch has almost nowhere to run, and its bar counts CI runs that CI never makes                                                 | **Fixed: the drop switch is deleted.** Would-drops are computed offline, in `node tools/test-history.mjs replay`, from the ledger. Section 5 has the numbers: the rule drops nothing on golden-side history, and a looser one saves 23 of 440 minutes with 5 misses.                                                               |
| 8   | (major) Over-built: a 250-line tool, a four-term score, a budget, exclusions, shadow mode and two bars, to rank tests CI runs 37 minutes later    | **Fixed: shrunk** to the data fixes (relative paths, misses with `ran`), the quarantine fix, a three-term ranking in `test:changed`, and an offline replay. The `changed` column is **rejected**: its only reader was co-failure, which is cut; a miss carries its culprit's changed files, and the replay takes changes from git. |
| 9   | (major) The 30-day bar may never decide, and a `[LIKELY]` failure is not proven change-caused                                                     | **Fixed: the default is deletion** (section 7). Only bisect-proven change-caused failures (miss files) count.                                                                                                                                                                                                                      |

## 3. What runs where

| Place                                      | What history does                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| The light gate, land checks, bisect points | Nothing. No history step exists.                                                             |
| `pnpm run test:changed`                    | Ranks the import-selected files and prints why; `--budget <s>` runs the top ones that fit    |
| CI verification                            | Nothing is ranked or ordered: the 25 test jobs run at once and each runs to the end          |
| After a bisect names a culprit             | `verify.mjs` writes a miss file, the only proof of a change-caused failure the ranking reads |
| A retry-pass (gate or CI)                  | Section 6: it is never silently let through as someone else's flake                          |

History never adds a test import selection did not pick and never drops one, except where a developer
asks `test:changed --budget` to cut.

## 4. The ranking

`tools/test-history.mjs`, for candidate test file `t` and a change `C` (its changed files):

```
score(t) = 3 x culprits(t, C)   // a miss file names t, and its culprit changed a file in C (90 days)
         + 2 x edited(t)        // C edits t itself
         + 1 x golden(t)        // t failed in a golden-side run (verify, bisect, cut, base) in 7 days
```

Ties go to the shorter file, then the name. A file's time is the median of its last 5 recorded runs, or
30 s. Every term is printed beside the file: `layout/test/a.test.ts  score 3, 4 s (failed after landing
fix/1-x, which also changed layout/src/x.ts)`. `--budget <s>` takes files in rank order until their
times reach `s` seconds (the first always), and a whole-shard run is never cut.

- **Cold start** (an empty ledger): every score is `edited` only, so edited files come first, then by name.
- **Ledger unavailable** (missing, locked, incomplete, `node:sqlite` absent) or `TEST_HISTORY=0`: one line,
  `history: unavailable (<why>); ranking by import selection only`, and the cold-start order. Nothing waits
  more than the ledger's 10 s lock, and nothing is blocked.

**Misses.** When a bisect names a culprit, `verify.mjs` writes `misses/<culprit>-<time>.json` in the
ledger directory: the culprit, its landed branch, the files it changed, and each failing test file with
`ran`, whether the culprit's own land check ran it (`false` is a miss of the selection). Under the light
gate every miss has `ran: false`. The ranking reads the files directly; there is no new table.

**Relative paths.** A `classnameTemplate` of `{filepath}` (webgpu-graph-algorithms' no-subgroups pass)
wrote `<pkg>/no-subgroups//home/.../.worktrees/<n>/<pkg>/test/x.test.ts`, so one test had one history per
worktree (249 such file names). `relFile()` in `tools/test-ledger.mjs` makes them
`<pkg>/no-subgroups/test/x.test.ts`, in the JUnit parser and when the index ingests a record, so a
`rebuild` fixes the existing rows too.

## 5. The replay

`node tools/test-history.mjs replay [--since <date>] [--misses <file.json>]` reads the ledger only. For every
gate run (kinds `land-check`, `push` and their imports) with recorded files, it uses only the rows before
that run. Run on 2026-10-23 over the whole ledger (2026-10-08 to 2026-10-24, before the relative-path rebuild), with the 9 file-named misses
of `design/ci/test-selection-replay.md`:

| Question                                                                                   | Answer                                                                                               |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Gate runs with recorded files, and the test time they ran                                  | 384 runs, 440 minutes                                                                                |
| Failures the import selector missed that history catches (score above 0 before the miss)   | **0 of 9**                                                                                           |
| Minutes history adds to landing checks                                                     | **0**: no gate step                                                                                  |
| If adds had run: files with a golden failure in 7 days, in a touched package, not run      | 516 file runs, 219 minutes (34 s a gate run), catching none of the 9                                 |
| Drop rule (20 passing golden runs in 30 days, no failure in 90, not edited): drops, misses | **0 file runs dropped, 0 minutes saved, 0 misses**: no file has more than 6 passing golden-side runs |
| Looser drop rule (20 passing runs of any kind): drops, minutes saved, misses               | 8,823 file runs, **23 minutes saved, 5 misses**                                                      |

The 5 misses of the looser rule are graphty tests that failed in a land check after 20 passes
(`SidebarCompactIntegration.test.tsx`, `StyleTab.real-element.test.tsx`, `StartScreen.real-element.test.tsx`,
`PaintTreeStyle.real-element.test.tsx`, `GraphPlace.test.tsx`). Dropping saves 5% of the test time and loses 5
failures: there is no drop worth building. Adds cost 219 minutes and would have caught nothing the import
selector missed. What is left of history is the ranking, which costs nothing because nothing runs it unasked.

## 6. The quarantine retry gap

Before this change, a test a landing made intermittent passed every check: the wrapper's one retry passed it,
the gate quarantined it with an issue that blamed the test, CI let it through the same way, and `verify.mjs`
dropped a failed-then-passed test from its JUnit as passed. No bisect ran, no miss was written.

- **A land check** (`TEST_LEDGER_KIND=land-check`, so only with `PREPUSH_LIGHT=0`): `blameChange()` in
  `tools/test-quarantine.mjs` asks the ledger, for each retry-pass, whether the test failed anywhere before
  this land commit (`failuresBefore`). None: the change made it intermittent, the shard fails with
  `[NEW-FLAKY]`, and nothing is quarantined. The rest are quarantined as before, with the landing (commit and
  branch) as suspect in the issue. Without a ledger it quarantines as before, with the suspect named.
- **CI verification, a failed run**: a retry-pass in the failed job's JUnit is kept as a failure
  (`retry_passed` in the record), so verification confirms it here and, newly intermittent, bisects it.
- **CI verification, a green run**: one GraphQL call reads the run's `[FLAKY]` warnings. Each test the
  quarantine does not list yet is recorded in the ledger (kind `verify`, outcome `passed`, the failure kept)
  and quarantined with the range's landings as suspects; its issue says `newly intermittent` when the ledger
  has no failure of it before the range. The run stays green, as CI judged it. A CI-only intermittent test
  is reported, not bisected (a `ponytail` note in `verify.mjs` says when to add that).

## 7. When the ranking is deleted

The ranking stays only if it earns its place: after 30 days, at least 10 miss files (bisect-proven
change-caused failures), and in at least 7 of them the failing file ranked in the top 10 of
`test:changed`'s order for the culprit's change (the replay computes this from the miss files). Fewer
than 10 miss files in 30 days, or fewer than 7 ranked, and `tools/test-history.mjs` and the `test:changed`
ranking are deleted; the data fixes and the quarantine fix stay. Both outcomes are two-way doors.

## 8. Code

| File                                       | Holds                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `tools/test-history.mjs` (new, ~270 lines) | the score, rank, budget, miss files, `replay`                                      |
| `tools/test-history.test.mjs`              | `node:test`: scores on a fixture ledger, cold start, no ledger, the switch, replay |
| `tools/test-ledger.mjs`                    | `relFile()` (+16 lines)                                                            |
| `tools/test-quarantine.mjs`                | `blameChange()`, `[NEW-FLAKY]`, suspects for a land check                          |
| `tools/verify.mjs`                         | retry-passes kept, a green run's flakes, miss files after a bisect                 |
| `tools/test-changed.mjs`                   | the ranking, `--budget`                                                            |
