# Test selection: replay results

The test selector (`tools/test-select.mjs`) says, for a change, which tests each CI shard would need:
all of them, none, or a list of test files. It is advisory: nothing runs fewer tests because of it.
Before it may gate anything, the fast pipeline design (`design/ci/fast-pipeline.md`, section 5.2)
asks for zero misses on three checks. This page records what those checks found.

A **miss** is a test that failed in a real gate run or CI run, and that the selector would not have
run for that change.

## How the replay works

`node tools/test-select-replay.mjs --graphs <cache> --ci <file>` takes:

- every pre-push gate run in `tmp/push-log.jsonl` since 2026-09-30 that ran test shards, with its
  gate log and the whole logs of its failed shards (`tmp/push-gate-logs/`, kept 14 days);
- every failed `Test (...)` job of ci.yml on the golden and golden-cut pull requests, written by
  `node tools/test-select-replay.mjs --collect-ci <file>` from one GitHub GraphQL query;
- the gate's own advisory records (`tmp/test-select/advisory.jsonl`), once the gate writes them.

For each run it computes the change (a golden landing from the golden tip it replaced; a branch push
from the nearer of its merge bases with golden and master), asks the selector, and checks every
failing test file against the answer. Misses are judged on the file-level answer even in packages
where file-level selection is not allowed yet, so a package shows its misses before it is adopted.

Two limits of a replay, both removed by the advisory records as they accumulate:

- The import graphs are built from today's checkout, not from each pushed commit. A test file that
  no longer exists is judged by its package alone.
- Failing test files are read from gate logs, which are deleted after 14 days. The advisory record
  keeps the failing files of each failed shard.

## Results

Replay of 2026-10-22, window 2026-09-30 to 2026-10-22: 1,185 gate runs (73 golden landings, 1,112
branch pushes) and 3 failed CI runs on golden-cut pull requests. No advisory records existed yet.

|                 | Runs  | Ran everything | Shard time the gate spent | As allowed today        | File-level everywhere    |
| --------------- | ----- | -------------- | ------------------------- | ----------------------- | ------------------------ |
| All gate runs   | 1,185 | 350            | 4,816,407 s               | 4,482,286 s (6.9% less) | 4,329,288 s (10.1% less) |
| Golden landings | 73    | 19             | 553,413 s                 | 371,210 s (32.9% less)  | 362,854 s (34.4% less)   |
| Branch pushes   | 1,112 | 331            | 4,262,994 s               | 4,111,076 s (3.6% less) | 3,966,434 s (7.0% less)  |

The time figures count only the shards the gate actually ran, which nx had already narrowed to the
affected packages, so the savings are on top of nx's. "As allowed today" uses file lists only where
`tools/test-select-rules.json` allows them; "file-level everywhere" uses them in every package, which
is what the misses below are judged on.

The 350 runs that ran everything were triggered by `.github/workflows/` (129), `pnpm-lock.yaml` (122),
`eslint.config.js` (64), `patches/` (11), `nx.json` (9), the test-running tools (9), the root
`package.json` (5) and `vitest.browser-coverage-setup.ts` (1).

351 test files or shards failed in these runs. The selector would have run 340 of them and missed 11.

## The misses

Every miss below is a test that failed for a reason other than the change being tested. None of them
needs a new rule. The evidence for each is the change itself (what files it touched) and what
happened when the same commit, or the next commit of the same branch, ran the gate again.

| When (UTC)       | Branch                                  | Failing test                                                                               | Selector said                                 | Why it is not the change's fault                                                                                                                   |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-08 13:40 | fix/webgpu-writers-skip-and-t4-baseline | a webgpu-graph-algorithms-node shard failure that names no test file                       | 106 test files                                | The change was three test files, a benchmark result and a decision note. The shard failed without naming a test, and the branch's next push passed |
| 2026-10-10 05:52 | fix/glow-strength-flake-1847            | `graphty-element/test/browser/render-budget.test.ts`                                       | a file list                                   | The change touched only glow tests; the render-budget test measures frame cost, and the branch's next push passed                                  |
| 2026-10-14 15:31 | feat/node-flat-shapes-borders           | a graphty-element-browser-3 failure that names no test file (an unhandled `vi.mock` error) | a file list                                   | The same commit passed the gate on its next run                                                                                                    |
| 2026-10-15 10:08 | test/real-input-graphty-element-2814    | `graphty-element/test/browser/coverage-frees-removed-pages.test.ts`                        | a file list                                   | The same commit passed the gate on its next run                                                                                                    |
| 2026-10-15 16:34 | test/counted-work-lifecycle-2745        | `graphty-element/test/browser/coverage-frees-removed-pages.test.ts`                        | a file list                                   | The change was one lifecycle test and a counted-work helper; the branch's next push passed                                                         |
| 2026-10-16 08:00 | feat/node-flat-shapes-borders           | `graphty-element/test/browser/coverage-frees-removed-pages.test.ts`                        | a file list                                   | The same commit passed the gate on its next run                                                                                                    |
| 2026-10-19 02:55 | golden                                  | `visual-review/test/page.test.mjs`                                                         | none (no visual-review file changed)          | The landing changed graph-io, skills and docs; the next golden landings passed visual-review                                                       |
| 2026-10-20 05:31 | golden                                  | `graphty/src/workspace/start/__tests__/StartPage.real-element.test.tsx`                    | none                                          | The landing changed two design notes only; golden's graphty tests were already failing                                                             |
| 2026-10-20 05:31 | golden                                  | `graphty/src/workspace/start/__tests__/StartPageFrame.real-element.test.tsx`               | none                                          | Same landing as above                                                                                                                              |
| 2026-10-21 10:29 | golden                                  | `graphty/src/workspace/start/__tests__/StartPageFrame.real-element.test.tsx`               | none                                          | The landing changed one research note; golden was still broken until the fix that landed at 15:20                                                  |
| 2026-10-21 15:20 | golden                                  | `graphty/src/workspace/style/__tests__/PaintTreeStyle.real-element.test.tsx`               | 1 test file (the changed StartPageFrame test) | The change was that start-page test and a note; the next golden landings passed                                                                    |

Two patterns account for all of them:

- **Flaky tests.** `graphty-element/test/browser/coverage-frees-removed-pages.test.ts` failed on three
  unrelated branches and passed when the same commits ran again; `render-budget.test.ts`,
  `PaintTreeStyle.real-element.test.tsx` and a mocking error in a graphty-element browser shard did
  the same. A selector that skips a flaky test is not wrong to skip it. These tests need fixing on
  their own (the flaky-test tracker), not a selection rule.
- **Golden already broken.** On 2026-10-20 and 2026-10-21 golden's graphty start-page tests failed
  on landings that changed only design notes. The break was on golden before those landings, and the
  selector correctly said the landing itself needed no graphty tests. Under the fast pipeline,
  verification of the landing that broke golden catches this, and bisect finds it.

## Still open

- **The full-shard sample** (the design's third check: a sample of landings run in full, every shard
  continuing past the first failure) has not been run. Until it has, a failure hidden behind the
  first failed shard of a gate run is not counted, because the gate stops the other shards.
- **Advisory records.** The gate starts writing them once the gate's live copy has this code
  (`tools/live.sh gate <branch>`). Each record is computed from that commit's own import graphs and
  keeps the failing test files, so later replays prefer them to rebuilding selections from today's
  graphs.
- **Adoption.** File-level selection is allowed only in graph-format, remote-logger, compact-mantine
  and graphty (`tools/test-select-rules.json`, `fileLevel`), and never for a shard that runs a browser
  project. Today that leaves graph-format: the other three packages' shards all include a browser
  project, so they run whole. Other packages move into the list one at a time, once their misses
  stay at zero.

## When a miss is found

A miss caused by the change (a test that reads a file the import graph does not show, a new kind of
import) adds a rule to `tools/test-select-rules.json` in the same fix, and this page records it. A
rising count of such misses returns the package to whole-package selection.
