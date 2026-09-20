# G6 (algorithms slice) -- the first A2 commit (spec 13 row P6; plan 2026-09-19-webgpu-m8a-algorithms-seam)

Recorded by: the owner, 2026-09-20. Commits: the nine of phase M8a (<short hashes once committed>), in the order of
appendix 7.1's command sheet.
Environment: Node 22.22.1, pnpm 10.0.0, vitest 3.2.4, TypeScript 5.9.3, `@graphty/graph-format` 1.0.0,
`@graphty/algorithms` 1.7.2 in the tree (<version after release>), `@graphty/webgpu-graph-algorithms` 0.3.0 in the
tree. Every command ran from the repository root or from `algorithms/`, on the dev box in the
`feat/algorithms-indexed-seam` worktree at HEAD 90f1a520, before any of the phase's commits were made.

GATE STATUS: GREEN on the dev box, pending the owner's signature, the commit hashes and section 5. Every item of
sections 1-4 passes, every command of the plan's final check exits 0, and `tools/prepush.sh` (the gate
`.husky/pre-push` runs) passes every step but one case of one file: the frame-loop wall-clock race recorded in the
row above, which passes alone and which this phase does not touch. Section 6 carries the findings; the two that needed a decision are closed
(G6-F2 is recorded in the A1 decision record, G6-F5 was a false positive with a root cause and a fix in the tree).

## 1. The 9.2 deliverables, each mapped to its evidence

| # | Deliverable (design 9.2 / plan line) | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | `algorithms/src/indexed/accelerator.ts` exists and contains no WebGPU type | `grep -c "webgpu\|GPUDevice\|GPUBuffer" algorithms/src/indexed/accelerator.ts` | 0 (the header comment cites the design by section number; finding G6-F1) | pass |
| 2 | the twelve `*ResultLike` shapes, scores as `NumericVector` | `pnpm exec nx run algorithms:lint` (its third pass is `tsc -p tsconfig.typecheck.json`) | clean, exit 0 | pass |
| 3 | `AlgorithmAccelerator`, every method optional, `GraphSnapshot` in | `test/types/accelerator.test-d.ts`, compiled by that same third pass | clean | pass |
| 4 | `accelerated(acc)` with the design's dispatcher body | `test/unit/indexed/accelerated.test.ts` | 7 passed (7) | pass |
| 5 | `pathTo` / `pathEdges` decoration for SSSP | the decoration case of the same file (`decorates an accelerator's bare SSSP result with pathTo and pathEdges`) | 1 passed | pass |
| 6 | `sources` / `k` on `BetweennessCentralityOptions` | `test/unit/indexed/betweenness-options.test.ts` | 3 passed (3) | pass |
| 7 | fake-accelerator tests: delegation, CPU path, throw propagates | `accelerated.test.ts`, the three cases `delegates to a method the accelerator has`, `runs the CPU port for a method the accelerator does NOT have`, `lets a throwing accelerator method propagate unchanged -- there is no fallback` | 3 passed | pass |
| 8 | W1b: `AlgorithmAccelerator` by `import type`, mirrors deleted | `grep -c "interface AlgorithmAccelerator" webgpu-graph-algorithms/src/types/accelerator.ts` | 0 | pass |
| 9 | `CpuAlgorithmOptions` retired | `grep -rc CpuAlgorithmOptions webgpu-graph-algorithms/src webgpu-graph-algorithms/test` | 0 in every file | pass |
| 10 | `implicitDependencies` negation removed | `nx show project webgpu-graph-algorithms --json` | `[]` -- nx normalises an absent key to an empty array; `grep -c implicitDependencies webgpu-graph-algorithms/project.json` reads 0 (finding G6-F3) | pass |
| 11 | the G10 reverse compile | `pnpm exec nx run webgpu-graph-algorithms:lint` (its third pass is `tsc -p tsconfig.strict-consumer.json`; that target already delegates to the npm script, `webgpu-graph-algorithms/project.json:46`) | clean, exit 0 | pass |

## 2. The A1 gate of graph-format design 14.6, discharged here (plan departure DEP-8A-B)

| Item | Evidence | Result | Status |
| --- | --- | --- | --- |
| every fixture graph converts with `equalsTopology` / neighbour-set parity | `test/unit/indexed/to-snapshot-differential.test.ts` | 11 passed (11) | pass |
| `mutationCount` memoisation, no stale hit | `test/unit/indexed/to-snapshot.test.ts` | 9 passed (9): the plan's eight plus the regression case for `Graph.edges()` on mixed-type ids (finding G6-F2) | pass |
| `weightDtype: "f64"` keeps a non-f32-exact weight exactly | the shadow-column case of the same file (`keeps f64 weights exactly through the shadow column`) | pass | pass |
| public signatures UNCHANGED | `git diff --stat origin/master -- algorithms/src/algorithms algorithms/src/types` (`origin/master` = 442bc98b; the same command against the stale local `master`, dad72f06, 126 files behind, gives the same result) | only `src/algorithms/centrality/betweenness.ts` (36 insertions, 11 deletions: the `sources` / `k` members, the `readonly ... \| undefined` restyle and the `rejectIndexOptions` guard of Task M8a-T9). Outside the two directories the command names, `src/core/graph.ts` (37+/2-: `mutationCount` and the `isMirror` mirror skip, finding G6-F2) and `src/index.ts` (46+/0-: the `indexed` namespace export) also differ; neither changes a signature | pass |

HEAD 90f1a520 is one commit behind `origin/master` 442bc98b (`fix(webgpu-graph-algorithms): widen the layout peer
range until 1.7.0 is published`); appendix 7.1's `git fetch origin && git merge origin/master` before the push is the
owner's and is still pending. Nothing in that commit touches a file this phase edits.

## 3. The six ports, against their legacy counterparts

`cd algorithms && pnpm exec vitest run --project=default test/unit/indexed`: 12 files, 78 passed (78).

| Port | Design line | Cross-check | Tolerance | Result |
| --- | --- | --- | --- | --- |
| breadthFirstSearch | 3823 | visited set vs `bfs-unified.ts:46` | exact | pass (`visits the same SET as the legacy breadthFirstSearch`; 4 cases in `bfs.test.ts`) |
| dijkstra | 3856 | finite distances vs `dijkstra.ts:21` | 1e-12 | pass (`agrees with the legacy dijkstra on every finite distance`; 7 cases in `dijkstra.test.ts`) |
| pageRank | 3889 | scores vs `pagerank.ts:83`, both sides pinned at `maxIterations: 200`, `tolerance: 1e-12`, legacy additionally `useDelta: false` | 1e-9 absolute | pass (`agrees with the legacy pageRank to 1e-9 when both are pinned`; 7 cases in `pagerank.test.ts`) |
| connectedComponents | 3924 | partition vs `connected.ts:17` | exact | pass (`agrees with the legacy connectedComponents as a set of id sets`; 6 cases in `components.test.ts`) |
| kruskalMST | 3930 | `totalWeight` vs the legacy MST | 1e-12 | pass (`agrees with the legacy kruskalMST on totalWeight`; 5 cases in `mst.test.ts`). The 1e-12 agreement is measured through the f64 shadow column handed in as the per-arc `weights` override; the default f32 arc path agrees to 1e-6 and selects the same edge set (finding G6-F4) |
| commonNeighborsScore | 3940 | counts on the star and the multigraph | exact | pass (6 cases in `common-neighbors.test.ts`) |

## 4. Coverage (algorithms, `--project=default --coverage`)

64 files, 1333 passed, 10 skipped (1343). `src/indexed` alone: 97.75 statements / 92.85 branches / 100 functions / 97.75 lines.

| lines | functions | branches | statements | threshold | wall time |
| --- | --- | --- | --- | --- | --- |
| 87.33 | 95.46 | 85.3 | 87.33 | 80 / 80 / 75 / 80 | 32 s (vitest reports 31.38 s) |

The two appendix 7.2 bundle rows, measured by `bash tmp/t14/bundle-probe.sh` (`npm run build:bundle`, exit 0, then
the plain tsc emit is rebuilt with `pnpm exec nx run algorithms:build`, exit 0):

| 7.2 row | Probe | Expected | Measured |
| --- | --- | --- | --- |
| the published bundle stays thin | `grep -c "SNAPSHOT_BRAND" algorithms/dist/algorithms.js` | 0 | 0 |
| the published bundle stays thin | `grep -c 'from "@graphty/graph-format"' algorithms/dist/algorithms.js` | >= 1 | 1 |
| the examples' bundle is self-contained | `grep -c "SNAPSHOT_BRAND" algorithms/dist/algorithms.standalone.js` | >= 1 | 2 |
| the examples' bundle is self-contained | `grep -rl 'from "@graphty/' algorithms/gh-pages/` | empty | empty (0 files); the standalone itself has 0 bare `@graphty/` specifiers |

## 5. Lanes

Pending: nothing of this phase has been committed or pushed at the time of this record. The owner fills the three
rows from the PR's checks after the push of appendix 7.1's last row.

| Lane | Run | Result |
| --- | --- | --- |
| `ci.yml` (20 shards) | <run id> | <...> |
| `hosts.yml` (triggered by `pnpm-lock.yaml`) | <run id> | <...> |
| `gpu.yml` on the merge commit (the release gate) | <run id> | <...> |

## 6. Findings, owner decisions, re-fixed numbers

Step 2 of Task M8a-T14, in the plan's order, all from the worktree root, after the fixes of G6-F1, G6-F2 and G6-F5
below:

| Command | Result |
| --- | --- |
| `LC_ALL=C grep -rnP '[^\x00-\x7F]' algorithms/src/indexed algorithms/test/unit/indexed algorithms/test/types design/decisions` | prints nothing |
| `pnpm exec nx run-many -t build --parallel=3` | exit 0 |
| `pnpm -r run lint` | exit 0 |
| `pnpm run lint:knip` | exit 0; one configuration hint, not an error (`./dist/index.d.cts compact-mantine/package.json Package entry file not found`, a `compact-mantine/package.json` entry this phase does not touch that knip only inspects now that it no longer skips gitignored `dist/` directories; finding G6-F5) |
| `./tools/prepush.sh` | run once more in full on 2026-09-20 (`tmp/prepush-m8a.log`): Build PASS, Bundle webgpu-graph-algorithms PASS, Lint PASS, Knip (dead code detection) PASS, graphty tests PASS (128 files, 2552); the fast-test step reported `[FAIL] Some tests failed` on exactly one case, `webgpu-graph-algorithms/test/layouts/frame-loop.test.ts` "pause: exactly the in-flight batches land" (expected `[]`, got one batch), the documented wall-clock race of that file under the gate's parallel suites (the same family failed the hosts lane's WARP job on PR #13 and passed on re-run); the file passes alone on lavapipe (12 / 12, twice) and this phase changes nothing under `src/layouts` or `test/layouts`. Every other suite in the step passed (graph-format, graph-io, webgpu-graph-algorithms 1586 + 1 skipped apart from that case, algorithms 1333 + 10 skipped, layout, graphty-element, remote-logger, compact-mantine 2161). `prepush exit=1`, attributable to that race alone |

- G6-F1 (row 1): the plan's grep `webgpu\|GPUDevice\|GPUBuffer` matched the design document's own file name,
  `webgpu-acceleration-plan.md`, twice in the header comment of `accelerator.ts`. The two citations now name the
  design by section number (9.1, 9.2) instead of by file name and line range; the grep reads 0 and the file's
  imports are unchanged (`@graphty/graph-format` and `./bfs.js`, `./dijkstra.js`, `./index.js`, `./mst.js`,
  `./pagerank.js`). The comment-only edit rides in the `feat(algorithms)` (the seam) commit.
- G6-F2 (section 2, `algorithms/src/core/graph.ts`): `to-snapshot.test.ts` reports 9, not the plan's 8. The A1
  commit fixes a pre-existing `Graph.edges()` defect (the `isMirror` helper) and adds one regression case for it: for
  an undirected graph with mixed string / number ids, an edge between `123` and `"string"` used to be yielded from
  both endpoints and is now yielded once. That is a change to the observable output of a public method with no
  signature change -- a SECOND behaviour change beyond the one the plan's Global Constraints allow (the `sources` /
  `k` guard of Task M8a-T9) -- and the section 2 evidence command does not look at `src/core`, which is why the row
  above names the file separately. Decision: the fix is KEPT and recorded in
  `design/decisions/2026-09-19-a1-lands-inside-m8a.md` (section "A second change to a public method"). `toSnapshot`
  builds on `edges()` yielding each undirected edge once, and deduplicating inside the bridge instead would have hidden
  a public method's defect. The record names the reversal (revert the helper and the regression case together) should
  the owner want the constraint kept literal.
- G6-F3 (row 10): `nx show project --json` prints `"implicitDependencies": []`, not `undefined`; nx normalises a
  missing key. The key is absent from `project.json` and the project graph lists `algorithms` as a dependency
  (Task M8a-T13 Step 4). Pass.
- G6-F4 (kruskalMST): the port's default path sums the f32 arc weights, the legacy sums f64, so on non-f32-exact
  weights they differ by about 6e-8. The 1e-12 row is measured through the f64 shadow column handed in as the
  per-arc `weights` override, the route Task M8a-T7 Step 3 names; the f32 default path is additionally asserted to
  1e-6 with the same edge set. A stricter default-path bound needs the f32 arc column to become f64, which is a
  graph-format decision, not this phase's.
- G6-F5 (knip): the first run of the final check had `pnpm run lint:knip` exit 1 with 15 unused files, 27 unused
  exports and 42 unused exported types across 26 paths (algorithms' `src/benchmark-all-algorithms.ts` and
  `test/helpers/run-performance-regression.ts`, the `benchmarks/` trees of graph-format, graph-io and
  webgpu-graph-algorithms, `remote-logger/src` and `bin`, `tools/copy-docs-content.js`, `tools/sanitize-api-docs.js`),
  every one byte-identical to `origin/master`. They were not dead code. Every one is an entry knip derives from a
  package.json (`scripts` such as `tsx benchmarks/run.ts` and `node tools/sanitize-api-docs.js`, the `bin` field,
  the `exports` map), and knip was dropping those entries: it reads every ancestor `.gitignore` of the directory it
  runs in and stops only at a `.git` DIRECTORY (`node_modules/knip/dist/util/glob-core.js`,
  `findAncestorGitignoreFiles`), a worktree's `.git` is a file, so from `.worktrees/algorithms-indexed/` it also read
  the main checkout's `.gitignore`, whose unanchored `.worktrees/` line converts to `**/.worktrees/**` and matches every
  absolute path inside the worktree. Confirmed three ways: `knip --debug` lists the two files as
  `deferResolveEntry:tools/copy-docs-content.js (package.json)` and then analyses 6 root files without them; `knip
  --no-gitignore` reports none of the 84 findings; and `tmp/t14fix/gitignore-probe.mjs` shows knip's own converter
  turning an ancestor `.worktrees/` into `**/.worktrees/**` (and discarding an anchored `/.worktrees/`). The same tree
  in the main checkout, where no ancestor `.gitignore` exists, is clean. Fix, in the tree: the root `lint:knip`
  script is `knip --no-gitignore` and the global `ignore` of `knip.config.ts` lists the scratch directories the root
  `.gitignore` used to hide for it (`**/tmp/**`, `**/.tmp/**`), with the reason in a comment beside the list. Every
  per-package `lint:knip` delegates to the root script and `tools/prepush.sh` runs it, so the pre-push gate is green
  from a nested worktree as well as from the main checkout. The phase's earlier `knip.config.ts` edit (Task M8a-T10:
  `test/types/**/*.test-d.ts` as an algorithms entry, `@graphty/algorithms` in the GPU package's
  `ignoreDependencies`) removes exactly the one finding the phase's `webgpu-graph-algorithms/package.json` edit would
  otherwise introduce (`Referenced optional peerDependencies: @graphty/algorithms`), and adds none. The
  `compact-mantine` configuration hint in the table above is the one visible side effect of `--no-gitignore`: knip no
  longer skips `dist/` when checking that a package's entry files exist, and `compact-mantine/package.json` names a
  `./dist/index.d.cts` its build does not produce. A hint is not an error and does not affect the exit code; the
  package.json is not this phase's.
- G6-F6 (prepush): the first run of this record was written while the gate was still running and the log stopped
  mid graph-format tests with no process alive, so it recorded no verdict. Every later run went to completion
  detached (`tmp/t14fix/run-prepush.sh`); the row above carries the finished result.
- G6-F7 (7.2 bundle rows): measured on the real dist by `tmp/t14/bundle-probe.sh`; the four numbers are in the
  table at the end of section 4 and all sit inside the appendix's expectations. Task M8a-T10's earlier throwaway
  rollup run agreed.
- G6-F8 (stale comments, from Task M8a-T13): `webgpu-graph-algorithms/src/accelerator.ts:4-5` and
  `src/types/algorithms.ts:8` still say the algorithms half is satisfied structurally "until M8a". One-line comment
  fixes for a later commit; T13 was told not to touch `src/accelerator.ts`.
- Commit hashes and section 5 are filled by the owner after `tools/commit-changes.sh` and the push. The knip fix
  (root `package.json`, `knip.config.ts`) touches no package source and needs a commit of its own or a ride in the
  `fix(tools)` commit at the head of appendix 7.1's sheet; the owner picks.

Signed off: <owner>, <date>.
