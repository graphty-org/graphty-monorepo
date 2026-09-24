# @graphty/webgpu-graph-algorithms P9 -- betweenness centrality and all-pairs shortest paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P9 inside `webgpu-graph-algorithms/`: an all-pairs shortest-path sweep as a blocked Floyd-Warshall over 32 x 32 tiles with the ceiling the device's storage-binding limit imposes and an explicit refusal above it; betweenness centrality as a McLaughlin-Bader forward pass counting shortest paths in `u32` with overflow REPORTED rather than wrapped, a backward pass in which every vertex pulls from its successors so no float is ever written twice, and a per-batch gather that turns the per-source dependencies into scores; edge betweenness from the same dependencies; sampling and batching over sources planned from the device limits; the online choice between the frontier-driven and the edge-parallel forward pass; the independent Brandes and Floyd-Warshall references these are judged against; and the `apsp` and `betweenness` benchmark groups with T-11 recorded on both runner classes (gate G9).

**Architecture:** This phase has two halves that share a document and almost no code. The all-pairs half is a dense matrix kernel: `n x n` f32 distances in one storage buffer, swept `ceil(n / 32)` times in three tile phases, with the whole sweep recorded into one compute pass because WebGPU orders dispatches within a pass and makes each one's writes visible to the next. It needs no queue, no frontier and nothing from the traversal phase, so it can be built today. The betweenness half is the traversal phase's frontier run k sources at a time: a frontier entry is a `(vertex, source)` pair, the claim writes a depth and adds into a path count, every claim is appended to one growing array that IS Brandes' stack, and the backward sweep walks that array's per-level ranges from the deepest. Nothing accumulates a float through an atomic anywhere in the phase: the backward pass writes each `(vertex, source)` dependency exactly once, and the scores are summed afterwards by a kernel that reads k values per vertex. Every kernel is a body in `src/wgsl/<id>.wgsl.ts` registered in `src/kernels.ts`; every driver is a file under `src/algorithms/` that may import `src/context.ts`, `src/memory/**`, `src/kernel/**`, `src/kernels.ts` and `src/primitives/**` and nothing above it (`webgpu-graph-algorithms/eslint.config.js`, `webgpu-graph-algorithms/test/layers.test.ts`). The dependency direction is unchanged: the GPU package imports `@graphty/graph-format` at runtime and `@graphty/algorithms` / `@graphty/layout` as types only.

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu` (Dawn) in Node 22 and Chromium (Playwright) in the browser, `@graphty/graph-format` snapshots, vitest 3.2 (node / node-limits / browser projects, v8 coverage), pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; `gpu-linux-t4` lane).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 3.3 lines 802-804 (the three public signatures) and lines 824-826 (`GpuBetweennessResult`, `GpuEdgeScoresResult`, `GpuApspResult`), 4.7 line 1317 (the per-source byte count this phase corrects), 5.4 lines 1464-1487 (indirect dispatch and the finalize kernel as the device-side selector), 8.1 line 2570 (the dense family row), 8.4 lines 2691-2723 (betweenness in full: the forward pass, the successor pull, the gather, the batching, the sampling, the edge-parallel switch, edge betweenness, the cost model), 8.7 lines 2773-2784 (blocked Floyd-Warshall, the binding-size bound and its three values), 8.8 rows 7 and 8 (priority order and what each pulls in), 8.10 lines 2846 and 2849-2851 (the `finalizeArgs` row and the BC forward / backward / gather binding budgets), 9.7 lines 3271-3274 (result-shape parity and the `1e-4` betweenness tolerance of DEPARTURE-6), 10.1 (the betweenness memory column), 10.3 (the betweenness time column), 10.4 line 3416 (T-11), 11.3 lines 3489-3501 (test kinds and the oracle rule), 11.9 lines 3699-3764 (the four sensitivity mechanisms), 13 row P9 line 4216 (the deliverables and gate G9), 16.1 lines 4939-4951 (the visited pre-check, which this phase's forward pass is named in). The design is normative; every departure is in section 0.5.

**Plans of record for the earlier phases:** `design/webgpu/plans/2026-09-15-webgpu-p0.md` through `-p3.md`, `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md`, `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` (design phase P7, whose residency, scope and driver shape this phase copies), `design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md` (design phase P4, unmerged) and `design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md` (design phase P8, unbuilt; the betweenness half consumes its `Frontier`, its counters block and its device-side selector).

**Gate:** G9 (design 13 row P9, line 4216). The record is `webgpu-graph-algorithms/docs/decisions/G9.md`, written by the last task beside the existing G0-G3, G5, G6 and G7.

**Tasks in this document:** P9-T1 .. P9-T16, in two groups. **P9-T1 through P9-T5 are the all-pairs half: they depend on NOTHING that is not already on master and can start today.** P9-T6 through P9-T16 are the betweenness half and cannot start before design phase P8 is merged. Within the all-pairs half, P9-T1 and P9-T2 are independent of each other and may run in parallel; then P9-T3 -> P9-T4 -> P9-T5. P9-T3 splits across that parallelism: its first five steps need only P9-T1, while its differential suite and its sabotage scoring (Steps 6 and 7) are written against the Floyd-Warshall reference P9-T2 creates and cannot close until P9-T2 is done. Within the betweenness half the chain is P9-T6 -> P9-T7 -> P9-T8 (the first working betweenness) -> P9-T9 -> P9-T10 -> P9-T11 -> P9-T12, then P9-T13 and P9-T14 in parallel, P9-T15 any time after P9-T6, P9-T16 last. Two tasks may never execute at once if both append to `src/kernels.ts`, which is P9-T3, P9-T7, P9-T8, P9-T9, P9-T10 and P9-T11 (PD-16).

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the touched files is a step of P9-T16.
- Never run `sudo`; nothing here needs it. Servers only on ports 9000-9999 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them.
- Project rule (root `CLAUDE.md`): never create a fallback when WebGPU is absent. `src/` contains no CPU path and no software-adapter acceptance; the package throws.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts`).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md`): device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator. `src/wgsl/**` is imported only by `src/kernels.ts`. Enforced by `webgpu-graph-algorithms/eslint.config.js` and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md`, "WGSL Conventions"): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and every subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, and never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`).
- Bind-group rule: group 0 = the graph (`rowPtr`, `colIdx`, `weights` or a dummy, `perm` or a dummy), group 1 = algorithm state, group 2 = the params uniform through the `UniformRing`, group 3 = cold arrays; never more than 8 storage buffers per stage. A kernel that needs a ninth is SPLIT, never given a raised limit as a requirement.
- Workgroup width is `ctx.workgroupSize` = `min(WORKGROUP_SIZE, caps.limits.maxComputeInvocationsPerWorkgroup)` (`src/device/caps.ts`), interpolated into every body as `WG`. A kernel may never assume 256 invocations; the tile kernels of this phase are written against `WG` and loop `TILE * TILE / WG` times.
- Test placement: the `node` project's include glob names its directories literally (`test/{device,node,memory,kernel,primitives,algorithms,layouts,oracle,sabotage,types}/**/*.test.ts`, plus `test/*.test.ts`). A new directory is invisible to the runner. Every test file this plan creates goes in one of those directories or in `test/limits/` (the `node-limits` project) or `test/browser/`.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is in section 0.5 with its reason and, where it changes a design statement, a `design/decisions/2026-09-23-<slug>.md` record written by P9-T15.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-23)

| Fact | Evidence |
| --- | --- |
| Master carries design phases P0-P3, P5 and P7: the device, context, memory and kernel layers, `reduce`, `segmentedReduce` in its thread-per-row tier, `spmvPull`, ForceAtlas2 on the exact tier, Fruchterman-Reingold and the spring-electrical preset, PageRank / HITS / eigenvector / Katz, and Afforest connected components. | `ls webgpu-graph-algorithms/src/algorithms/ webgpu-graph-algorithms/src/layouts/ webgpu-graph-algorithms/src/primitives/` |
| `src/primitives/` on master holds FOUR files: `core-shape.ts`, `reduce.ts`, `segmented-reduce.ts`, `spmv.ts`. There is no `scan`, `histogram`, `radix-sort`, `compact`, `frontier` or `advance` on master. | `ls webgpu-graph-algorithms/src/primitives/` |
| The exclusive scan, the histogram with counting sort, the stable radix sort, `planIndirect`, the `indirect-finalize` kernel, the grid pyramid and the upper `segmentedReduce` degree tiers exist, complete and tested, on branch `feat/gpu-p4` (design phase P4). They are NOT on master. | `git ls-tree -r --name-only feat/gpu-p4 -- webgpu-graph-algorithms/src/primitives webgpu-graph-algorithms/src/wgsl` |
| `GraphResidency.view()` accepts `reverse`, `edgeList`, `outDegree`, `inDegree`, `degreeOrder` and `reverseDegreeOrder`, and throws `E_UNSUPPORTED` for `coo` and `mate` with the message "the ... view is not uploaded before P11". | `webgpu-graph-algorithms/src/memory/residency.ts`, the `view()` switch |
| `algorithmScope(ctx, label, slots)` gives a driver one `Lease` for its scratch and one `UniformRing` for its parameter blocks, and is what every P7 driver is built on. | `webgpu-graph-algorithms/src/algorithms/scope.ts`; `webgpu-graph-algorithms/src/algorithms/pagerank.ts` |
| `KernelId` is a closed union of seventeen ids, `KERNELS` is frozen, the registry is append-only, and every entry carries `phase: "P1" \| "P2" \| "P3" \| "P7"`. | `webgpu-graph-algorithms/src/kernels.ts` |
| The WGSL prelude interpolates `INVALID_INDEX`, `U32_MAX`, `MAX_WORKGROUPS_PER_DIM` and `WG`, and provides `linear_id` and `group_id`. | `webgpu-graph-algorithms/src/kernel/prelude.ts` |
| `test/helpers/graphs.ts` provides `KARATE_EDGES`, `gridEdges`, `pathEdges`, `starEdges`, `cycleEdges`, `completeEdges`, `randomEdges`, `randomEdgesLoose`, `rmatEdges` and `snapshotOf`. It has NO generator that produces a shortest-path count above `2^32`; P9-T7 adds one. | `grep -n '^export ' webgpu-graph-algorithms/test/helpers/graphs.ts` |
| `test/helpers/sabotage.ts` holds the `Mutation` record, the `SABOTAGE` registry keyed by `KernelId`, and `test/sabotage/coverage.test.ts` asserts every `find` string occurs exactly once in the live body. | `webgpu-graph-algorithms/test/helpers/sabotage.ts` |
| `benchmarks/run.ts` registers six groups: `upload`, `roundtrip`, `layout-exact`, `pagerank`, `wcc`, `layout-fr`. The checked-in baselines are `gpu-linux-t4.json`, `nvidia-lovelace-driver580.json` and `noise-floor.json`. | `webgpu-graph-algorithms/benchmarks/run.ts`; `ls webgpu-graph-algorithms/benchmarks/results/` |
| `@graphty/algorithms` is an OPTIONAL peer and is imported by this package for TYPES only. Its `AlgorithmAccelerator` already declares `betweennessCentrality?`, `edgeBetweennessCentrality?` and `allPairsShortestPath?` as optional members, and `BetweennessAcceleratorOptions` already carries `normalized`, `endpoints`, `sources` and `k`. | `algorithms/src/indexed/accelerator.ts` lines 113-151; `webgpu-graph-algorithms/package.json` `peerDependenciesMeta` |
| The CPU package has NO index-space betweenness implementation. `algorithms/src/indexed/` holds `bfs`, `dijkstra`, `components`, `mst`, `pagerank` and `common-neighbors`; the `Graph`-taking `betweennessCentrality` carries `sources` / `k` on its option type and THROWS when either is set. | `ls algorithms/src/indexed/`; `algorithms/src/algorithms/centrality/betweenness.ts` lines 43-48 |
| The CPU betweenness convention that this phase must match: sum over all sources, then divide by 2 on an undirected graph, then, when `normalized` is set, divide by `(n-1)(n-2)` directed or `(n-1)(n-2)/2` undirected. The search is unweighted (`brandesSingleSource` is a breadth-first search), so weights are ignored on both paths. | `algorithms/src/algorithms/centrality/betweenness.ts` lines 206-262 |
| `webgpu-graph-algorithms/docs/decisions/` holds G0, G1, G2, G3, G5, G6-algorithms and G7. There is no G8 and no G9. | `ls webgpu-graph-algorithms/docs/decisions/` |

### 0.2 Entry criteria -- one half can start today, the other cannot

| Criterion | Status | Consequence |
| --- | --- | --- |
| Design phase P7 merged (`spmvPull`, the `reverse()` / `edgeList()` residency, grid-stride dispatch, `src/primitives/core-shape.ts`, `src/algorithms/scope.ts`) | **MET** on master | the all-pairs half uses `algorithmScope`, `coreOfView` and `assertNotWindowed` and needs nothing else |
| Design phase P4 merged (`exclusiveScan`, `histogram`, `radixSort`, `planIndirect`, the `indirect-finalize` kernel, the `node-limits` project's upper tiers) | **NOT MET** -- branch `feat/gpu-p4`, worktree `.worktrees/gpu-p4` | P9 never calls any of it directly; it matters only because P8 does |
| Design phase P8 merged (`Frontier`, the `FrontierCounters` block, `advance`, `compact` / `dedupe`, the device-side `frontier-finalize` selector, breadth-first search) | **NOT MET** -- planned in `design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`, no code written | P9-T6 through P9-T14 consume the `Frontier` class, the counters block, the selector's dispatch arithmetic and the `MAX_LEVELS_PER_SUBMIT` host loop. None of them compiles before P8 lands |
| Design's phase order admits P9 after P8 | **MET** | design 13 line 4224: `P7 (SpMV + WCC) -> P8 (frontier) -> P9 (BC + APSP)` |

**P9-T1 through P9-T5 -- the whole all-pairs half -- can be written, tested and merged against master today.** Blocked Floyd-Warshall is a dense matrix kernel: it reads `rowPtr`, `colIdx` and `weights` once to fill a matrix and then sweeps that matrix. It has no queue, no frontier, no indirect dispatch and no scan, so none of P4's or P8's work is on its path. Starting it now is the whole reason this plan is ordered the way it is: it delivers `allPairsShortestPath`, the first of the phase's three public functions, without waiting for two other phases to merge.

**Do not start P9-T6 or later before P8 is on master.** Every one of those tasks names a file or a class that P8 creates.

### 0.3 Execution order

```
today, on master:  P9-T1 -> P9-T3 -> P9-T4 -> P9-T5
                   [P9-T2 runs alongside P9-T1 and alongside P9-T3 Steps 1-5,
                    and must be finished before P9-T3 Step 6, whose suite is
                    written against P9-T2's Floyd-Warshall reference]
                   = allPairsShortestPath, shippable as its own pull request

merge feat/gpu-p4 (P4) and P8 (the frontier family)
                -> P9-T6 -> P9-T7 -> P9-T8 -> P9-T9 -> P9-T10 -> P9-T11 -> P9-T12
                   -> P9-T13 and P9-T14 in parallel -> P9-T16
                   = betweennessCentrality and edgeBetweennessCentrality
```

P11 (structure and community) consumes nothing from this phase. Girvan-Newman, which the design's section 17 table places nowhere, dispatches each of its steps through this phase's edge betweenness and gets no phase of its own.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | The phase is TWO shippable halves. The all-pairs half depends on nothing unlanded and goes first; the betweenness half waits for the frontier phase | section 0.3 |
| PD-2 | Blocked Floyd-Warshall ships as ONE WGSL body with a `PHASE` override giving three pipelines, binding the matrix once as read-write storage, with the tile in workgroup memory and `TILE * TILE / WG` cells per invocation | P9-T3 |
| PD-3 | The matrix is exactly `n * n` -- never padded to a multiple of the tile -- and the edge tiles guard their loads with `+Inf` and their stores with `i < n && j < n`, so the ceiling is exactly the design's `floor(sqrt(maxStorageBufferBindingSize / 4))` | P9-T3 |
| PD-4 | The whole sweep -- `3 * ceil(n / 32)` dispatches -- is recorded into ONE compute pass, because WebGPU orders dispatches within a pass and makes each one's writes visible to the next; there is no readback until the matrix is done | P9-T3 |
| PD-5 | The all-pairs ceiling is computed from `ctx.caps.limits.maxStorageBufferBindingSize` at call time and `E_TOO_LARGE` is raised above it with both numbers in the message. The windowed form of design 8.7 is NOT built in this phase | P9-T3, DEP-P9-A |
| PD-6 | A betweenness frontier entry is a `(vertex, source)` pair and every claim is appended to ONE growing array `S` with a per-level `ends` table. `S` is Brandes' stack, which the backward pass needs anyway, so the forward pass needs no second queue and no ping-pong | P9-T6 |
| PD-7 | `ends` is read back ONCE per source batch, after the forward phase, and the backward dispatches are host-planned from it. One readback per batch, never per level | P9-T6 |
| PD-8 | Two words, `stackTop` and `sigmaOverflow`, are APPENDED to the end of P8's `FrontierCounters` block; appending at the end leaves every existing decode offset untouched | P9-T6 |
| PD-9 | The source batch size k is planned from the device limits at 20 bytes per (node, source) -- the design's 12 counts the three `n x k` arrays and forgets the claim log -- and a faked limit must shrink k without changing a single score | P9-T6 |
| PD-10 | The forward pass is the FUSED form: it expands and claims in one dispatch and never materialises an edge queue, which is what design 8.10's own binding row for it describes | P9-T7 |
| PD-11 | `sigma` overflow is detected from the `atomicAdd` return value by the `u32` wrap test `old + add < old`, recorded in a counters word, and surfaced as `sigmaOverflow` in the result. It is never silent and never clamped | P9-T7 |
| PD-12 | The backward pass writes `delta[s][w]` exactly ONCE per `(vertex, source)` and no float is ever accumulated through an atomic anywhere in this phase. Consequence: every P9 result is bitwise reproducible, and the run-twice check is bitwise on the scores themselves | P9-T8 |
| PD-13 | Normalisation, the undirected halving and the endpoints rule are applied on the HOST over the readback, not in a kernel. The halving is the VERTEX path's alone; the edge path's fold does it already (DEP-P9-F) | P9-T8 |
| PD-14 | Sampled betweenness returns the UNSCALED sum over the sources actually run, with `sourcesUsed` beside it; it is never extrapolated by `n / k`. This is a published result semantic and needs the owner's sign-off in the pull request | P9-T8, DEP-P9-C |
| PD-15 | `endpoints: true` raises `E_UNSUPPORTED`, because the CPU branch it would have to match is inert and there is nothing to be in parity with | P9-T8, DEP-P9-D |
| PD-16 | Six tasks append to `src/kernels.ts` (P9-T3, P9-T7, P9-T8, P9-T9, P9-T10, P9-T11); they are therefore sequential, and each adds its ids to `KernelId` and, once, `"P9"` to the `phase` union | P9-T3 |
| PD-17 | The edge-parallel forward pass iterates `edgeList()`, both directions on an undirected snapshot, exactly as design 8.4's Bellman-Ford does -- NOT `coo()`, which the residency refuses before P11 | P9-T10 |
| PD-18 | The choice between the frontier-driven and the edge-parallel forward pass is a per-BATCH host choice made from the previous batch's level count, which is the only depth number the host already has | P9-T10 |
| PD-19 | Unweighted all-pairs routes to the tagged forward pass once the betweenness half exists; weighted input keeps the blocked sweep. Routing by `flags.allWeightsOne` is a better algorithm for the input, not a fallback | P9-T11 |
| PD-20 | Every new test file goes in a directory the `node` include glob already names | P9-T2 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-P9-A | Design 8.7 line 2780 says that above the binding bound "the rows are windowed through the 4.2 planner". This phase does not window the distance matrix; it raises `E_TOO_LARGE` at the bound. | Design 13 row P9's own gate asks for exactly that -- "APSP exact unweighted / 1e-5 weighted in `node-limits`, `E_TOO_LARGE` above the 8.7 bound" -- and says nothing about windows. A windowed blocked sweep is a different kernel: phase 3 of every round reads a tile of the pivot row and a tile of the pivot column, which a row window does not contain, so windowing is not a loop around the same body. The refusal is honest, the message names both numbers and the limit that would raise the ceiling, and a caller above 5,792 nodes at default limits has `GpuContextOptions.limits` to raise. Recorded by P9-T15 as `design/decisions/2026-09-23-all-pairs-refuses-above-the-binding-bound.md`. |
| DEP-P9-B | Design 4.7 line 1317 budgets betweenness at "(4 sigma + 4 depth + 4 delta) x k per node" = 12 bytes per (node, source), and design 10.1's betweenness column is computed from it (77 MB at 100k / 1M with k = 64). This phase budgets 20 bytes per (node, source). | The claim log of PD-6 holds one `(vertex, source)` pair per claim, and a vertex is claimed at most once per source, so its capacity is `n * k` entries of 8 bytes. It is as much a per-(node, source) array as the other three, and a planner that forgets it plans a k that does not fit. 20 B is 12 B plus the log; the design's arithmetic is right about the three arrays it lists and incomplete about the set. Design 13 rule (c) makes the real number a G9 measurement, and P9-T14 records it. Recorded by P9-T15 as `design/decisions/2026-09-23-betweenness-batch-counts-the-claim-log.md`. |
| DEP-P9-C | Design 9.7 line 3271 asks that sampled betweenness "is compared against sampled CPU BC with the same `sources` list, which A2 adds to the shared option type", and design 13 row P9's gate repeats it. The option type exists; the CPU implementation does not (section 0.1). The gate item is therefore met against this plan's own Brandes reference with the same `sources` list, and the `indexed.*` cross-check is added when the CPU port lands. | Writing an index-space Brandes inside the CPU package is that package's work and is not in this phase's scope; waiting for it would block a phase on another package's backlog. The independent reference is the oracle design 11.3 requires ANYWAY -- "a GPU tested only against the CPU package shares its design and its bugs" -- so the check that runs is the stronger of the two, not a substitute for it. This departure also fixes what "the same normalisation convention as `indexed`" means while `indexed` has no betweenness: the convention is the `Graph`-taking CPU function's, quoted in section 0.1, and P9-T8 matches it term for term. No separate decision record; the fact, the evidence and the missing port are named in G9. |
| DEP-P9-D | Design 3.3 and 9.7 pass `endpoints` through to the GPU. This phase accepts `endpoints: false` (the default) and raises `E_UNSUPPORTED` for `true`. | The CPU's `endpoints` branch zeroes a contribution when `predecessors.length === 0 && w !== source` (`betweenness.ts` lines 120-127), a condition no vertex on the Brandes stack can satisfy: a stack vertex other than the source was reached, and a reached vertex has at least one predecessor. So the CPU's `true` and `false` produce the same numbers, and "parity with the CPU" cannot distinguish an implementation of NetworkX's endpoints rule from an implementation of nothing. Refusing is the only answer that does not invent a convention and then call it parity. The refusal names the CPU line in its hint, so the first caller who wants it files the bug this departure is. Recorded by P9-T15 as `design/decisions/2026-09-23-betweenness-endpoints-is-refused.md`. |
| DEP-P9-E | Design 5.4 and design 8.10 describe ONE `finalizeArgs` kernel. This phase adds `bc-finalize` beside P8's `frontier-finalize`, with a third binding. | The betweenness level boundary does everything P8's does AND writes the level's end offset into `ends` (PD-6), which is a third storage binding on a kernel design 8.10 gives two. This is the same split, for the same reason, that P8 made when it added `frontier-finalize` beside P4's `indirect-finalize`, and it carries the same guard: P9-T6 extends P8's anti-drift test so all THREE kernels must write identical `(x, y)` pairs for the same count, and all three must agree with the host's `planIndirect`. |
| DEP-P9-F | Design 8.4 line 2714 says edge betweenness "folds with `foldArcs(s, vec, "first")` ..., halved on undirected snapshots as both papers do". This phase folds with `"first"` and does NOT halve. | The two halves of that sentence cannot both hold. `foldArcs(..., "first")` keeps the value of ONE of an undirected edge's two arcs and discards the other (`graph-format/src/snapshot/views.ts` lines 872-876: `result[e] = perArc[edgeToArc[e]]`, and the `"first"` case breaks without combining anything). Summed over every source the two arcs already carry the SAME value, and that value is the edge's betweenness over unordered pairs: every ordered pair whose shortest paths cross the edge in one direction has a reversed twin crossing it in the other, so each arc collects exactly half of the ordered-pair total and the fold that throws one away has already done the halving. Worked on `pathEdges(3)` (the path 0-1-2): arc `0->1` collects 2 from source 0; arc `1->0` collects 1 from source 1 and 1 from source 2; both read 2, and the betweenness of edge `{0, 1}` is 2 -- the pairs `(0, 1)` and `(0, 2)` both cross it. Dividing by two would publish 1. The VERTEX path halves and is untouched by this: its gather sums `delta` over every source with nothing discarded, so it really does count each unordered pair twice. Folding with `"sum"` and then halving is the same answer and is not what this phase does, because `foldArcs` returns `perArc` itself when `arcToEdgeIsIdentity` and the `"first"` path is therefore free on a directed snapshot. This matches the CPU package, which sums both traversal directions into one edge key and then halves (`algorithms/src/algorithms/centrality/betweenness.ts` lines 305-316). Recorded by P9-T15 as `design/decisions/2026-09-23-edge-betweenness-is-not-halved.md`. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| P9 all-pairs half | `webgpu-graph-algorithms/` | none beyond master (section 0.2) -- MET TODAY | `allPairsShortestPath` on the blocked sweep with the binding-limit ceiling, the Floyd-Warshall reference, the `apsp` benchmarks | part of G9 | 6.0 ed |
| P9 betweenness half | `webgpu-graph-algorithms/` | design phase P8 merged -- NOT MET | `betweennessCentrality` and `edgeBetweennessCentrality` exact and sampled, the source batching, the edge-parallel switch, the unweighted all-pairs route, the Brandes reference, the `betweenness` benchmarks and T-11 | the rest of G9 | 14.75 ed |

Critical path of the all-pairs half: P9-T1 -> P9-T3 -> P9-T4 -> P9-T5, joined by P9-T2 before P9-T3 Step 6. P9-T2 is off the critical path only for as long as it finishes inside P9-T3's first five steps, and it is on the path the moment it does not -- P9-T3 cannot be called done without it.
Critical path of the betweenness half: P9-T6 -> P9-T7 -> P9-T8 -> P9-T9 -> P9-T10 -> P9-T11 -> P9-T12 -> P9-T16.

**Something works early, twice.** P9-T4 ends with `allPairsShortestPath` exported, on the accelerator, and correct on every fixture up to the device's ceiling -- with P8 still unwritten. P9-T8 ends with `betweennessCentrality` exact and sampled, correct on every fixture; everything after it adds edge betweenness (P9-T9), makes the forward pass faster on shallow graphs (P9-T10), or makes unweighted all-pairs cheaper (P9-T11).

| Task | What it is | ed |
| --- | --- | --- |
| P9-T1 | the all-pairs result and option types, two constants | 0.5 |
| P9-T2 | the Floyd-Warshall and Brandes references in two precisions, and the check helpers | 1.5 |
| P9-T3 | `apsp-init` and the blocked `apsp-fw` body in three phases, the driver, the ceiling and its refusal, the differential suite | 2.5 |
| P9-T4 | `allPairsShortestPath` on the accelerator and in the barrel | 0.5 |
| P9-T5 | the `apsp` benchmark group, the `node-limits` test at the real ceiling, the Floyd-Warshall sabotage rows | 1.0 |
| P9-T6 | the source-batch planner, the `n x k` arrays, the claim log and its `ends`, `bc-finalize`, the two counter words | 2.0 |
| P9-T7 | the tagged forward pass, the path counts, the overflow report, the visited pre-check | 2.5 |
| P9-T8 | the successor-pull backward pass, the gather, sampling, normalisation -- **first working betweenness** | 3.0 |
| P9-T9 | edge betweenness: the per-arc gather, the fold, and why the undirected halving does NOT repeat here | 1.0 |
| P9-T10 | the edge-parallel forward pass and the per-batch choice | 1.5 |
| P9-T11 | unweighted all-pairs over the tagged forward pass | 0.75 |
| P9-T12 | `betweennessCentrality` and `edgeBetweennessCentrality` on the accelerator and in the barrel | 0.5 |
| P9-T13 | the `betweenness` benchmark group and T-11 on both runner classes | 1.0 |
| P9-T14 | the sabotage matrix, the stage comparisons, the browser smoke, the `node-limits` tests, the noise-floor rows | 1.5 |
| P9-T15 | three decision records and the design index | 0.5 |
| P9-T16 | the G9 gate record and the phase close | 0.5 |
| | **total** | **20.75** |

20.75 ed against the design's 5-7. The gap is worth knowing before scheduling rather than after, and it is the same gap the P8 plan found: the design cell was written before anyone enumerated nine WGSL bodies, two independent references each in two precisions, a batch planner that has to be right on a faked device, roughly fifty test cases across six suites, twenty-seven sabotage mutations, and two benchmark groups re-baselined on two runner classes. The owner's call, in the pull request: accept the number, or ship the all-pairs half (6.0 ed, no blockers) and schedule the betweenness half behind P8 as its own piece of work. The tasks and their order are the same either way, which is why the plan splits at P9-T5.

### 0.7 What P9 does NOT do

- No weighted betweenness. Both the CPU's `betweennessCentrality` and the design's are breadth-first, so weights are ignored on both paths and the parity statement is exact. A Dijkstra-based betweenness is a different algorithm and is not in the design.
- No windowed distance matrix (DEP-P9-A), and no Kamada-Kawai. Design 7.20 schedules Kamada-Kawai's dense cost and gradient kernels AFTER all-pairs exists; this phase gives it the `dist` input it waits for and stops there.
- No k-core, no triangle counting, no k-truss, no label propagation, no Louvain, no `cooToCsr`: all of that is design phase P11 (design 13 row P11), and design 13 rule (b) forbids a phase absorbing a later phase's work.
- No new primitive in `src/primitives/`. This phase consumes P8's `Frontier` and `advance` and adds nothing beside them (design 13 rule (b)).
- No change to `algorithms/`, `layout/`, `graphty-element/` or `graphty/`. The optional peer's `AlgorithmAccelerator` already declares all three members this phase implements (section 0.1), so nothing outside this package has to move.

---

## Phase P9: betweenness and all-pairs

**Entry criteria:** for P9-T1..T5, none beyond master. For P9-T6..T16, design phase P8 merged. Work on branch `feat/webgpu-betweenness` in a worktree (`git worktree add .worktrees/webgpu-betweenness -b feat/webgpu-betweenness master`, run by the owner -- a subagent must never run `git worktree`); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms`; the phase lands with the `gpu` label so `gpu.yml` runs on it.

**Step 0 of the phase** (a fresh worktree has no `node_modules` and no `dist/`, both gitignored). Export the two path variables FIRST -- every Run line below begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-betweenness
    export PKG=$WT/webgpu-graph-algorithms

then `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build`. Every later command reads `graph-format/dist/`.

**The local run environments** (`webgpu-graph-algorithms/CLAUDE.md`, used verbatim in every Run line):

    # NVIDIA (the hardware lane the parity and timing numbers come from)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task P9-T1: The all-pairs result and option types, and two constants

**Independent. Runs today against master, in parallel with P9-T2.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 3.3 line 804 (the signature) and line 826 (`GpuApspResult`); design 8.7 (what the options have to express); design 9.7 line 3274 (exact unweighted, `1e-5` weighted).

**Files:**
- Create: `$PKG/src/types/all-pairs.ts`
- Modify: `$PKG/src/constants.ts` (append; never reorder the file)
- Modify: `$PKG/test/device/constants.test.ts` (pin the two new values)
- NOT touched: `src/index.ts` and `test/index.test.ts` (P9-T4 owns the barrel), `src/kernels.ts` (P9-T3)

**Interfaces produced:** `GpuApspResult` and `ApspOptions` from `src/types/all-pairs.js`.

- [ ] **Step 1: The result type, spelled from design 3.3 line 826 without change**

`GpuApspResult` is `{ readonly dist: F32; readonly n: number; }`, row-major `n * n`, and the JSDoc says three things a caller cannot guess: the entry for an unreachable pair is `+Infinity`, the diagonal is `0` even when a self-loop carries a weight, and `dist[i * n + j]` is the i-to-j direction on a directed snapshot. A consumer who reads a `0` off the diagonal and guesses is the failure this prevents.

- [ ] **Step 2: The option record**

`ApspOptions` carries `weighted?: boolean | undefined` (default: true when the snapshot has weights, and the JSDoc says that setting it `false` on a weighted snapshot computes hop counts rather than distances). Nothing else: a cutoff would change the meaning of `+Infinity`, and the design asks for none. Every member is `readonly` and spelled `?: T | undefined`, because `tsconfig.strict-consumer.json` compiles with `exactOptionalPropertyTypes`.

- [ ] **Step 3: The two constants**

Append to `$PKG/src/constants.ts`, each with a JSDoc naming its design line:

| Constant | Value | Why |
| --- | --- | --- |
| `APSP_TILE` | 32 | design 8.7: "blocked Floyd-Warshall with 32 x 32 tiles". One tile of f32 is 4 KiB in workgroup memory and the two phases that stage a second tile need 8 KiB -- phase 1 stages its own tile and the pivot block, phase 2 stages the pivot-column and pivot-row blocks it reads and keeps its own cells in registers -- inside the 16 KiB `maxComputeWorkgroupStorageSize` every device in the matrix reports |
| `APSP_MAX_DISPATCHES_PER_SUBMIT` | 4096 | the sweep is `3 * ceil(n / 32)` dispatches; at the default ceiling of 5,792 nodes that is 543, and at a raised 23,170 it is 2,172. The constant is the cap at which the driver splits into a second submit, so a raised-limit run cannot build one unbounded command buffer |

Do not add a constant for `+Infinity`'s bit pattern here: `0x7F800000` belongs in the prelude beside `INVALID_INDEX`, and P9-T3 puts it there if design phase P8 has not already (P8-T9 adds `F32_INF_BITS`; when P8 is merged first, use it and add nothing).

Run: `cd $PKG && pnpm exec vitest run --project=node test/device/constants.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS and clean. knip reports the two exports of `src/types/all-pairs.ts` as unused; that is expected until P9-T4 exports them through the barrel, and `knip.config.ts` must NOT be edited to silence it.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the all-pairs result and option types`.

---

### Task P9-T2: The two CPU references and the check helpers

**Independent. Needs NO GPU and no device. Runs today against master, in parallel with P9-T1 and with P9-T3 Steps 1-5. P9-T3 Steps 6 and 7 cannot close without this task: they are scored by the Floyd-Warshall reference it creates.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 11.3 row "Algorithm differential" lines 3489-3490 (the oracle rule: independent, index-based, never derived from the kernel, and kept even after `indexed.*` exists as a second oracle, because a GPU tested only against the CPU package shares its design and its bugs); design 11.9 item 3 (tolerances are derived, not chosen); design 13 row P9 ("Brandes oracle").

**Files:**
- Create: `$PKG/test/oracle/all-pairs.ts` (Floyd-Warshall and the breadth-first row sweep, in f64 and f32)
- Create: `$PKG/test/oracle/betweenness.ts` (Brandes for vertices and edges, in f64 and f32, taking a source list)
- Create: `$PKG/test/helpers/centrality-check.ts` (the invariant and correlation checkers every differential test calls)
- Create: `$PKG/test/oracle/centrality.test.ts` (the references check THEMSELVES against answers computable by hand)
- NOT touched: anything under `src/`

**Interfaces produced:** `floydWarshallOracle(csr, { weighted, precision })`, `apspRowsOracle(csr)`, `brandesOracle(csr, { sources, precision, directed })` returning `{ vertex, edgePerArc }`, and from the check helper `expectTriangleInequality(dist, csr, n)`, `expectSymmetric(dist, n)`, `spearman(a, b)`, `expectTopKOrder(a, b, k)`, `expectArcPairsEqual(perArc, csr)`.

- [ ] **Step 1: The references, written from the algorithm, never from a kernel**

Each takes the CSR arrays as plain typed arrays (`rowPtr`, `colIdx`, `weights`) and returns plain arrays. Tens of lines each; do not import anything from `src/`.

- Floyd-Warshall: the textbook triple loop over `n`, in JavaScript numbers for the f64 run and through `Math.fround` at every `min(d[i][j], d[i][k] + d[k][j])` for the f32 run. `Infinity` for unreached, `0` on the diagonal, the minimum weight when a pair carries parallel arcs.
- The row sweep: one breadth-first search per source, filling one row of the matrix. This is the unweighted reference and it must be written independently of the Floyd-Warshall one, because P9-T11 replaces the kernel for unweighted input and a shared reference would move with it.
- Brandes: the standard two-phase algorithm -- a breadth-first search recording `sigma`, `depth` and the predecessor lists, then the reverse-order accumulation. It takes the source list explicitly (`sources: readonly number[]`), which is what makes the sampled comparison of design 9.7 possible at all, and returns BOTH the per-vertex dependencies and the per-ARC edge contributions, because the edge reference must not be a second implementation of the same sum. It does NOT halve, and it does NOT normalise: those are the host-side steps P9-T8 owns and the test composes them so that a wrong halving cannot hide inside the reference. The f32 variant rounds each `sigma[v] / sigma[w] * (1 + delta[w])` through `Math.fround`, which is exactly what one f32 multiply-add in the kernel does.

- [ ] **Step 2: The check helpers, which are what makes a tolerance argument possible**

- `expectTriangleInequality`: over every arc `(u, v, w)` and every source `i`, `dist[i][v] <= dist[i][u] + w` within one unit in the last place. This catches a dropped relaxation without any reference at all.
- `expectSymmetric`: on an undirected snapshot `dist[i * n + j] === dist[j * n + i]` bitwise. The blocked sweep touches the two halves in different tile phases, so an asymmetry is a real defect this catches and an end-to-end comparison would average away.
- `spearman(a, b)`: the rank correlation of two score vectors, ties averaged. Design 13 row P9's gate asks for `>= 0.9` between a sampled run and an exact one, and nothing in the package computes it today.
- `expectTopKOrder(a, b, k)`: the top k indices agree as a SET and the first entry agrees exactly. Design 9.7 asks for top-k order on every score result.
- `expectArcPairsEqual(perArc, csr)`: on an undirected snapshot the two arcs of one edge carry equal per-arc scores BEFORE folding. This is the gate's own edge-betweenness item and it is an assertion, not a description.

- [ ] **Step 3: The references check themselves**

`test/oracle/centrality.test.ts` runs each reference against answers computable by hand, so a bug in a reference is caught before it is trusted to judge a kernel:

- on `pathEdges(n)` the unnormalised, undirected betweenness of the vertex at index `i` is `i * (n - 1 - i)`, and the two ends are `0`;
- on `starEdges(L)` the hub is `L * (L - 1) / 2` and every leaf is `0`;
- on `completeEdges(n)` every vertex is `0`, because every pair is adjacent;
- on `cycleEdges(n)` every vertex carries the same score, whatever it is -- an asymmetry means the reference has a tie-breaking bug;
- on `gridEdges(w, h)` the all-pairs distance of `(x1, y1)` to `(x2, y2)` is `|x1 - x2| + |y1 - y2|`, which pins the whole matrix without a second implementation;
- on a disconnected fixture the matrix entry across components is `Infinity` and the betweenness of every vertex in a two-node component is `0`.

Also assert what the tolerance argument rests on: on `randomEdges(2000, 8000, 7)` the f32 and f64 Brandes results differ, and RECORD the relative spread. That number is the noise floor from which P9-T8 derives its tolerance and P9-T14 writes into `benchmarks/results/noise-floor.json`; design 9.7's `1e-4` for betweenness (DEPARTURE-6) is a claim about exactly this quantity and this is the first time anything measures it.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/centrality.test.ts`
Expected: PASS, with no device acquired (the file imports nothing from `test/setup/gpu.ts`). If the run prints the `[gpu] adapter` line, something imported a device helper and the task's independence is gone.

- [ ] **Step 4: Commit (owner)** -- `test(webgpu-graph-algorithms): the Brandes and Floyd-Warshall references and the centrality checks`.

---

### Task P9-T3: Blocked Floyd-Warshall -- the matrix, the three tile phases, the ceiling

**Depends on P9-T1 for Steps 1-5 and on P9-T2 for Steps 6-7 -- the differential suite is written against `floydWarshallOracle` and the sabotage rows are scored by it, so the kernel can be built alongside P9-T2 but cannot be proven without it. Runs today against master.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.7 lines 2773-2784 (the blocked form, the 32 x 32 tiles, the single-binding result and the three ceiling values, the `E_TOO_LARGE` above it); design 8.1 line 2570 (the dense family: one submit per block sweep); design 3.3 line 804; design 9.7 line 3274.

**Files:**
- Create: `$PKG/src/wgsl/apsp-init.wgsl.ts`, `$PKG/src/wgsl/apsp-fw.wgsl.ts`
- Create: `$PKG/src/algorithms/all-pairs.ts`
- Modify: `$PKG/src/kernels.ts` (**PD-16 lives here**), `$PKG/src/kernel/prelude.ts` (add `F32_INF_BITS = 0x7F800000u` beside `INVALID_INDEX`, unless P8 already did)
- Create: `$PKG/test/algorithms/all-pairs.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts`, `$PKG/test/helpers/sabotage.ts`

- [ ] **Step 1: PD-16 -- how six tasks share one registry file**

`src/kernels.ts` declares `KernelId` as a closed union and freezes `REGISTRY`. Six tasks of this phase append to it -- P9-T3, P9-T7, P9-T8, P9-T9, P9-T10 and P9-T11 -- and that is why no two of them may execute at once. The rule for each: add the new ids to the END of the `KernelId` union, add the entries to the END of `REGISTRY`, add `"P9"` to the `phase` union of `KernelEntry` ONCE (this task does it), and never renumber or rename an existing id. `test/kernel/bind-group-budget.test.ts` and the compile matrix pick the entries up from the registry with no further edit.

The nine P9 kernel ids and their storage-binding counts, stated once here so every later task has one place to check against design 8.10 and the descriptor test has a per-kernel expectation rather than a promise:

| Id | Task | Storage bindings | Design 8.10 row |
| --- | --- | --- | --- |
| `apsp-init` | P9-T3 | rowPtr, colIdx, weights \| dummy, dist (4) | -- (8.7 gives the tiles, not a binding row) |
| `apsp-fw` | P9-T3 | dist (1) | -- ; three pipelines from one body by the `PHASE` override |
| `apsp-from-depth` | P9-T11 | depthK, dist (2) | -- |
| `bc-finalize` | P9-T6 | counters, args, ends (3) | "BFS `finalizeArgs`", 2 -- the third is `ends` (DEP-P9-E) |
| `bc-forward` | P9-T7 | rowPtr, colIdx, S, counters, depthK, sigmaK (6) | "BC forward (tagged)", 8 -- `S` is ONE read-write buffer holding both the level being read and the appends (PD-6), and both counts are words of the counters block |
| `bc-forward-edge` | P9-T10 | edgeSrc, edgeDst, S, counters, depthK, sigmaK (6) | -- (design 8.4's edge-parallel form) |
| `bc-backward` | P9-T8 | rowPtr, colIdx, S, depthK, sigmaK, deltaK (6) | "BC backward (successor pull)", 6 |
| `bc-gather` | P9-T8 | deltaK, bc (2) | "BC gather", 2 |
| `bc-edge-gather` | P9-T9 | rowPtr, colIdx, depthK, sigmaK, deltaK, arcScores (6) | -- ; the per-arc twin of the gather |

A count BELOW the design's is inside the budget and is not a departure needing a record; the last column names the design's number so every difference is visible in one place. The descriptor test asserts the third column.

- [ ] **Step 2: The matrix and `apsp-init`**

One storage buffer of `n * n` f32, taken from the driver's `Lease`. `apsp-init` grid-strides over `n * n` entries and writes `0` on the diagonal, `+Infinity` elsewhere; a second dispatch of the same kernel (a `MODE` override) grid-strides over the arcs and writes `min(existing, weight)` per arc, so parallel arcs collapse to the cheapest and a self-loop never displaces the diagonal zero. Unweighted means every arc contributes `1`. Directed snapshots write one direction; undirected snapshots have both arcs and write both.

The per-arc write is a plain store and two parallel arcs of the same pair can race. Do not reach for an atomic: write the arcs with an `atomicMin` on the f32 BIT PATTERN, which is exact for non-negative floats exactly as design 8.4's shortest-path relax is, and say so in the JSDoc. Negative weights are refused by the driver before the first dispatch (Step 5).

- [ ] **Step 3: PD-2, PD-3 and PD-4 -- one body, three pipelines, one pass**

Blocked Floyd-Warshall runs `B = ceil(n / 32)` rounds. Round `k` updates, in order: the pivot tile `(k, k)`; then every tile of block row `k` and block column `k`; then every remaining tile. The three differ only in which tiles they load into workgroup memory, so they are ONE body with a `PHASE` override (0, 1, 2) and three pipelines, the shape `segmented-reduce` already uses for its tiers.

The invocation mapping is 1D, against `WG`, never a 2D workgroup: a workgroup owns one 32 x 32 tile and stages into workgroup memory exactly the operands its own phase reads, each stage being one `var<workgroup> array<f32, 1024>` of 4 KiB.

| Phase | Blocks it updates | What it stages | Why |
| --- | --- | --- | --- |
| 0 | the pivot block `(k, k)` | its own tile (4 KiB) | `d[i][j] = min(d[i][j], d[i][k'] + d[k'][j])` for `i`, `j` and `k'` all inside `(k, k)`, so both operands are in the tile being updated |
| 1 | every block of block row `k` and block column `k` | its own tile and the pivot block `(k, k)` (8 KiB) | a block `(k, j)` reads `d[k][k']` from the pivot and `d[k'][j]` from itself; a block `(i, k)` reads `d[i][k']` from itself and `d[k'][k]` from the pivot |
| 2 | every remaining block `(i, j)` | the pivot-COLUMN block `(i, k)` and the pivot-ROW block `(k, j)` (8 KiB) | its two operands are `d[i][k']` and `d[k'][j]`, which live in those two blocks. Its own cells are only written, never read by another lane, so they stay in registers, `1024 / WG` per invocation |

The pivot block `(k, k)` is an operand of phases 0 and 1 and of neither of phase 2's. Staging it in phase 2 is the mistake this table exists to prevent: it leaves block row `k` and block column `k` correct and every other block wrong, which looks like a broken sweep rather than a wrong load, so Step 7 carries a sabotage row for exactly it.

Each phase places a barrier after its staging, then runs 32 iterations of `k'` in which each invocation updates `1024 / WG` cells. Phases 0 and 1 barrier between iterations as well, because the tile they update is also a tile they read; phase 2 needs no inner barrier, because it writes nothing either staged tile is read from. Every barrier is reached in uniform control flow: the guarded loads write `+Infinity` into the tile through `select`, and the loop runs for every lane (WGSL conventions rule 1, and the single most likely reason this body does not compile on the first try).

The matrix is EXACTLY `n * n` and is never padded (PD-3). A tile at the right or bottom edge loads out-of-range cells as `+Infinity` and stores nothing for `i >= n || j >= n`. Padding to `B * 32` would be simpler in the kernel and would move the ceiling below the design's number, because the allocation, not `n * n`, is what the binding limit measures.

All `3 * B` dispatches are recorded into ONE compute pass (PD-4). WebGPU executes dispatches within a pass in order and makes each one's writes visible to the next, which is what makes a blocked sweep legal without a pass per round; the package already depends on this in the PageRank batch. The driver splits into a second submit only when `3 * B` exceeds `APSP_MAX_DISPATCHES_PER_SUBMIT`, and checks `options.signal` between submits.

- [ ] **Step 4: PD-5 -- the ceiling and the refusal**

The result is ONE storage binding, so the bound is `maxStorageBufferBindingSize`, not `maxBufferSize`: `nMax = floor(sqrt(ctx.caps.limits.maxStorageBufferBindingSize / 4))`. That is 5,792 at the 128 MiB spec default, 23,170 at Dawn-node's 2 GiB - 4 and 32,767 at Chromium's 4 GiB - 4 -- the three numbers design 8.7 states, reproduced by the formula rather than hard-coded, because a device reports its own limit and a constant would be wrong on two of the three. Above `nMax` the driver throws `E_TOO_LARGE` with `n`, `nMax`, the limit it read and the hint that `GpuContextOptions.limits` can raise it. A test asserts the message carries all four.

- [ ] **Step 5: The routings and refusals, checked before any device work**

`flags.nonNegativeWeights === false` throws `E_UNSUPPORTED { feature: "allPairs.negativeWeights" }`: Floyd-Warshall itself tolerates negative arcs without negative cycles, but the `atomicMin` of Step 2 does not order negative bit patterns, and a silent wrong answer is the one outcome this phase never ships. `options.weighted === false` on a weighted snapshot runs the hop-count sweep. `nodeCount === 0` returns `{ dist: new Float32Array(0), n: 0 }` without a dispatch (design 5.6: there is no work, and that is not a fallback). `options.dest` is validated for exact length `n * n` and `E_INVALID_ARGUMENT` otherwise, the same validator PageRank uses.

- [ ] **Step 6: The differential suite (needs P9-T2)**

Against `floydWarshallOracle` from P9-T2, on the fixture list design 11.3 names, sized so `n * n` stays small: the empty graph, one node, one self-loop, `KARATE_EDGES`, `gridEdges(30, 30)`, `pathEdges(500)`, `starEdges(1000)`, `completeEdges(64)`, `cycleEdges(101)`, `randomEdges` and `randomEdgesLoose` with self-loops and parallels, directed and undirected, weighted and not, and a disconnected fixture. For each: unweighted `dist` EXACT (integers in f32 are exact to 2^24, so this is `toEqual`, not a tolerance); weighted `dist` bitwise equal to the f32 reference and within the derived tolerance of the f64 one; `expectTriangleInequality`; `expectSymmetric` on undirected; the run-twice bitwise check; `validate({ checksum: true })` on the snapshot afterwards, which proves no kernel wrote into a view.

Then the two cases the blocking itself can get wrong and an end-to-end comparison on a round `n` would not: `n = 33` and `n = 1057` (`32 * 33 + 1`), where exactly one tile of each kind is a partial edge tile.

- [ ] **Step 7: The sabotage rows (at least three per kernel, design 13 rule (f))**

Add to `test/helpers/sabotage.ts`: for `apsp-init`, the diagonal not zeroed, and the per-arc `atomicMin` replaced by a plain store (two parallel arcs then race and the cheaper one can be lost -- the row's check is the parallel-arc fixture, so name it); for `apsp-fw`, the pivot tile loaded from `(k, k+1)`, the 32-step inner loop cut to 31, the barrier after the tile load removed, the edge guard `i < n` dropped (correct in the interior and wrong on the last tile, which is why the `n = 33` fixture exists), and phase 2 staging the pivot block `(k, k)` in place of the pivot-column block `(i, k)` (block row `k` and block column `k` stay correct and every other block is wrong, so the row's check needs a fixture with more than one block per side -- name `gridEdges(30, 30)`, where `n = 900` gives `B = 29`). Each must fail `test/algorithms/all-pairs.test.ts` by at least 10x, and `test/sabotage/coverage.test.ts` asserts each `find` string occurs exactly once in the live body.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/all-pairs.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; unweighted `dist` bitwise identical between the two adapters.

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): blocked Floyd-Warshall all-pairs shortest paths`.

---

### Task P9-T4: `allPairsShortestPath` on the accelerator and in the barrel

**Depends on P9-T3. Runs today against master.**

**Spec:** design 3.3 line 804 and the accelerator block at lines 880-900; `algorithms/src/indexed/accelerator.ts` line 118, which already declares the member as `allPairsShortestPath?(s, options?: SsspOptions): Promise<ApspResultLike>`.

**Files:** Modify `$PKG/src/accelerator.ts`, `$PKG/src/index.ts`, `$PKG/test/index.test.ts`, `$PKG/test/types/public-api.test-d.ts`, `$PKG/test/accelerator.test.ts`.

- [ ] **Step 1: The member, no stub.** `allPairsShortestPath` goes on the object `createAccelerator` returns, calling `ctx.assertReady()` first, exactly as `pageRank` does. The accelerator never carries a member that throws `E_UNSUPPORTED`: a member exists when its algorithm ships, and a consumer's feature detection is `typeof accel.allPairsShortestPath === "function"`.
- [ ] **Step 2: The two option types are not the same type, and that is not a bug.** The package's own function takes `ApspOptions & GpuRunOptions`; the peer's interface passes `SsspOptions`, which carries `cutoff` and `weights`. The accelerator member takes the peer's type, ignores `cutoff` (no all-pairs cutoff exists -- and `E_UNSUPPORTED` when it is set, so it is never silently dropped) and refuses a `weights` override the same way, because a per-arc override is a different matrix and the residency has the snapshot's. Say both refusals in the JSDoc; `test/types/conformance.test-d.ts` is what proves the member still satisfies the real interface.
- [ ] **Step 3: The barrel and its two tests.** `src/index.ts` exports `allPairsShortestPath` and the types from `src/types/all-pairs.ts`. `test/index.test.ts` asserts the exact value list, so the name moves from the never-exported list to the value list in the SAME commit -- a split commit leaves the suite red. P9-T1's unused type exports become used here and knip goes clean.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip) && eval $GPU_NV pnpm run test:node`
Expected: all clean; knip reports nothing for this package.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): expose allPairsShortestPath on the accelerator`.

---

### Task P9-T5: The `apsp` benchmark group, the real-ceiling test and the close of the all-pairs half

**Depends on P9-T4. Runs today against master. This task ends a shippable pull request.**

**Spec:** design 11.7 (the baseline files and `bench:compare`); design 10.4 (T-13's 3x regression rule, which a new group's baseline arms); design 13 row P9's gate item "APSP exact unweighted / 1e-5 weighted in `node-limits`, `E_TOO_LARGE` above the 8.7 bound".

**Files:** Create `$PKG/benchmarks/apsp.bench.ts`, `$PKG/test/limits/apsp-ceiling.test.ts`, `$PKG/test/sabotage/all-pairs.test.ts`; modify `$PKG/benchmarks/run.ts` (one line in `GROUPS`), `$PKG/benchmarks/results/nvidia-lovelace-driver580.json`, `$PKG/benchmarks/results/gpu-linux-t4.json`, `$PKG/test/benchmarks.test.ts`.

- [ ] **Step 1: The rows.** The weighted sweep at `n` = 512, 1,024, 2,048, 4,096 and 5,760 (the largest multiple of the tile under the default ceiling), each reporting the wall time around the whole call INCLUDING the upload and the `4 n^2` readback, and the profiler time per pass when `timestamp-query` was granted. Report the readback separately: at the default ceiling it is 134 MB and it is most of the number, which is the kind of fact a benchmark exists to make visible rather than to hide in a total.
- [ ] **Step 2: Both runner classes before the commit.** Capture on the RTX 4070 SUPER locally and on the T4 lane through a labelled pull request, and land both baseline files in the same commit as the benchmark file. A baseline captured on one class and merged makes `bench:compare` fail on the other for a week. The design sets no T-target for all-pairs, so there is no target to miss; what this group does is arm T-13's 3x rule for a kernel that did not exist before, and the G9 record says so in one line rather than implying a target that was never written.
- [ ] **Step 3: The real ceiling, in `node-limits`.** On the NVIDIA lane with raised limits, run `n = 8192` (which the default limit refuses and a 2 GiB binding allows) and assert it matches the row-sweep reference; then run `n = nMax + 1` and assert `E_TOO_LARGE` with all four numbers in the message. Both are `node-limits` tests: the default lane must not attempt a 268 MB matrix.
- [ ] **Step 4: The sabotage suite runs.** `test/sabotage/all-pairs.test.ts` executes the P9-T3 rows and closes whatever `test/sabotage/coverage.test.ts` reports. A mutation that SURVIVES is a bug in the test suite and blocks the gate exactly as a failing test does -- the fix is a better test, never a weaker mutation.

Run: `cd $PKG && eval $GPU_NV pnpm run bench apsp && pnpm run bench:compare && eval $GPU_NV pnpm exec vitest run --project=node-limits test/limits/apsp-ceiling.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/sabotage/all-pairs.test.ts`
Expected: the table prints; `bench:compare` finds no tracked median above 3x its baseline; limits green; every mutation caught.

- [ ] **Step 5: Commit (owner)** -- `perf(webgpu-graph-algorithms): the all-pairs benchmarks and the binding-ceiling tests`.

---

### Task P9-T6: The source batch, the claim log and the level boundary

**Depends on design phase P8 being merged. Blocks everything from P9-T7 on.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.4 lines 2691-2715 (the `n x k` arrays, the `S` / `ends` ranges, the batching from `maxBufferSize` and a 25% budget); design 5.4 (the finalize kernel and its `(x, y, 1)` arithmetic); design 8.10 line 2846; design 4.7 line 1317 (the byte count this task corrects); design 13 row P9's gate item "batch planning honours a faked `maxBufferSize` (k shrinks; results equal)".

**Files:**
- Create: `$PKG/src/types/betweenness.ts` (`GpuBetweennessResult`, `GpuEdgeScoresResult`, `BetweennessOptions`)
- Create: `$PKG/src/algorithms/betweenness-batch.ts` (the planner and the batch's device state)
- Create: `$PKG/src/wgsl/bc-finalize.wgsl.ts`
- Modify: `$PKG/src/kernels.ts` (the `FrontierCounters` block gains two words; one new kernel id), `$PKG/src/constants.ts` (three constants)
- Create: `$PKG/test/algorithms/betweenness-batch.test.ts`
- Modify: `$PKG/test/device/constants.test.ts`, `$PKG/test/helpers/override-matrix.ts`

- [ ] **Step 1: The result and option types, spelled from design 3.3 lines 824-825**

`GpuBetweennessResult extends GpuScoresResult` with `sourcesUsed: number` and `sigmaOverflow: boolean`; `GpuEdgeScoresResult` is `{ scores: F32; precision: "f32" }` of length `edgeCount`. `GpuScoresResult` comes from `src/types/algorithms.ts` and is NOT redeclared. `BetweennessOptions` carries `normalized?`, `endpoints?`, `sources?: readonly number[]` and `k?: number`, the same four fields the peer's `BetweennessAcceleratorOptions` already declares (section 0.1), each `readonly` and spelled `?: T | undefined`. The JSDoc of `sigmaOverflow` says what a `true` means for the caller: at least one pair of vertices is joined by more than `2^32` shortest paths, the counts wrapped, and the scores are wrong -- not approximate.

- [ ] **Step 2: PD-6 and PD-7 -- the claim log instead of a ping-pong**

P8's `Frontier` ping-pongs two vertex queues because a breadth-first search only ever needs the current level. Betweenness needs EVERY level again, in reverse, which is what Brandes' stack is. So this phase keeps one array:

```ts
interface BcBatch {
    readonly S: Binding;         // n * k entries of two u32 words: (vertex, source), append-only
    readonly ends: Binding;      // level boundaries into S; ends[0] = 0, ends[L + 1] = stackTop after level L
    readonly depthK: Binding;    // n * k u32, INVALID_INDEX = unreached
    readonly sigmaK: Binding;    // n * k atomic<u32>, the shortest-path counts
    readonly deltaK: Binding;    // n * k f32, the dependencies
    readonly k: number;          // the sources in this batch
    readonly sources: Uint32Array;
}
```

A `(vertex, source)` pair is appended exactly once -- a vertex is claimed once per source -- so `S` at capacity `n * k` can never overflow, and this phase needs neither P8's chunked edge queue nor its overflow rule. A level's frontier is the range `[ends[level], ends[level + 1])` of `S`: the forward kernel reads that range and appends past `stackTop`, which is why `S` is bound ONCE, read-write (the P7 finding that `Kernel.bind` rejects one buffer bound `storage-ro` and `storage` in one dispatch is exactly why it must be one binding and not two ranges of two).

`ends` is `levels + 2` words and is read back ONCE per batch, after the forward phase ends, in the same copy as the counters block (PD-7). The backward dispatches are then host-planned with exact sizes, so the backward half needs no indirect dispatch at all. This is not the per-level `mapAsync` design 8.4 disqualifies: it is one readback per BATCH of k sources -- four of them for a 256-source sampled run at k = 64 -- and the forward phase still records `MAX_LEVELS_PER_SUBMIT` levels per submit with one four-byte `done` read, exactly as P8's loop does.

- [ ] **Step 3: PD-8 -- the two counter words**

P8's `FrontierCounters` block is defined in `src/kernels.ts` with sixteen `u32` words. This task APPENDS two: `stackTop` (the append cursor into `S`, which is also the running total the level boundary writes into `ends`) and `sigmaOverflow` (P9-T7's wrap flag). Appending at the END leaves every existing word at its existing byte offset, so P8's readback decode is untouched and only the copy length grows. Never insert a word, and never reorder: the block is what the host decodes a readback with, and re-cutting the offsets would silently re-interpret every P8 counter.

- [ ] **Step 4: PD-9 -- the batch planner, and the twenty bytes**

Per (node, source) the batch holds: `depthK` 4 B, `sigmaK` 4 B, `deltaK` 4 B, and one `S` entry of 8 B. Twenty bytes, not the twelve design 4.7 line 1317 counts (DEP-P9-B). k is then

```
kByBinding = floor(maxStorageBufferBindingSize / (8 * n))     // S is the widest array
kByBudget  = floor(BC_BATCH_BUDGET_FRACTION * maxBufferSize / (20 * n))
k          = max(1, min(kByBinding, kByBudget, BC_MAX_BATCH, sourcesRemaining))
```

with `BC_BATCH_BUDGET_FRACTION = 0.25` (design 8.4's "25% budget") and `BC_MAX_BATCH = 64` (design 10.1's column). Worked example, so the number is checkable rather than asserted: at `n = 100,000` on a Dawn default device (`maxBufferSize` 256 MiB, `maxStorageBufferBindingSize` 128 MiB), `kByBinding = 167`, `kByBudget = 33`, so `k = 33` and a 256-source run takes eight batches. WebGPU exposes no device memory size, so these two limits are the only device-derived numbers a planner has; that is a fact about the API, and the JSDoc says it rather than implying the fraction is a memory measurement.

When `k` computes to less than 1 -- a graph so large that one source's arrays exceed the binding limit -- the driver throws `E_TOO_LARGE` naming `n`, the limit and the smallest limit that would admit one source.

- [ ] **Step 5: `bc-finalize`, and why it is a third finalize kernel (DEP-P9-E)**

One workgroup, one lane, no barrier after the early return. At each level boundary it: writes `ends[level + 1] = stackTop`, computes the next level's frontier size as `stackTop - ends[level]`, writes that level's dispatch args, increments `level`, and sets `done` when the size is zero. The `(x, y)` arithmetic is P4's `indirect-finalize` arithmetic verbatim -- `groups = count / wg + select(0u, 1u, count % wg != 0u)`, never `(count + wg - 1) / wg`, which wraps above `2^32 - wg` -- then the 2D split at `MAX_WORKGROUPS_PER_DIM`.

**The anti-drift check, extended to three:** the test asserts that for 2,000 counts spanning 0 to `2^32 - 1`, `bc-finalize`, P8's `frontier-finalize` and P4's `indirect-finalize` write identical `(x, y)` pairs, and that all three agree with the host's `planIndirect`. Three bodies, one rule.

- [ ] **Step 6: The tests, which need no traversal**

`test/algorithms/betweenness-batch.test.ts` drives the machinery with a synthetic counters buffer and no graph: the planner's k against a table of faked limits and node counts, including the faked `maxBufferSize` the gate names, asserting k SHRINKS and the batch count grows; `ends` written correctly for a hand-seeded sequence of `stackTop` values; the three-way `(x, y)` agreement of Step 5; the `E_TOO_LARGE` when k would be zero; the two new counter words readable at their appended offsets while every P8 word still decodes to its own value (the regression that PD-8 exists to prevent).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/algorithms/betweenness-batch.test.ts` then the same with `$GPU_NV`.
Expected: PASS on both.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): the betweenness source batch and its level boundary`.

---

### Task P9-T7: The tagged forward pass, the path counts and the overflow report

**Depends on P9-T6, and on P8's `Frontier` host loop and `bfs-fused` body.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.4 lines 2691-2700 (the forward pass as a breadth-first search with `sigma` under `atomicAdd`, exact until `2^32` paths, with `sigmaOverflow` reported and never silent; the per-level `S` / `ends` ranges); design 8.10 "BC forward (tagged)"; design 16.1 lines 4939-4951 (the visited pre-check, which names the betweenness forward pass explicitly); design 6 row 8 (the block-mapped expansion this body reuses).

**Files:** Create `$PKG/src/wgsl/bc-forward.wgsl.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/algorithms/betweenness-batch.ts` (the forward driver), `$PKG/test/helpers/graphs.ts` (one new generator), `$PKG/test/helpers/sabotage.ts`; create `$PKG/test/algorithms/betweenness-forward.test.ts`.

- [ ] **Step 1: PD-10 -- the fused form, and why there is no edge queue**

Design 8.10's own binding row for the forward pass lists `rowPtr`, `colIdx`, `frontierIn`, `frontierCount`, `depthK`, `sigmaK`, `frontierOut`, `frontierCount2` -- no edge queue. The forward pass is therefore P8's FUSED kernel with a tag: one dispatch per level that expands the frontier and claims in the same body. Reuse P8's block-mapped structure exactly -- each workgroup loads up to `WG` frontier entries, scans their degrees in workgroup memory, and every invocation strips `[local, aggregate)` with an `upper_bound` binary search to find its source vertex -- and keep the shared arithmetic textually identical to `bfs-fused` so a reader can diff the two bodies. The one difference is the entry: two words, `(vertex, source)`, so the degree of entry `i` is the degree of its vertex and the claim writes into `depthK[s * n + v]`.

Not materialising an edge queue also removes the question P8 had to answer about capacity: with k sources the arcs of one level are k times as many, and a queue for them would be the largest array in the phase. The fused form never allocates it.

- [ ] **Step 2: The claim, the count, and the pre-check design 16.1 requires**

For each arc `(u, v)` of a frontier entry `(u, s)`:

```
let idx = s * n + v;
if (atomicLoad(&depthK[idx]) != INVALID_INDEX) { /* claimed in an earlier level or this one */ }
else { let old = atomicMin(&depthK[idx], level); if (old == INVALID_INDEX) { append (v, s) to S } }
if (depthK[idx] == level) { sigma_add(idx, sigma[s * n + u]) }
```

Two rules the body must honour and the JSDoc must state. First, the pre-check: the relaxed `atomicLoad` before the `atomicMin` is design 16.1's rule, and it is safe for the reason that section gives -- a stale "unclaimed" costs one redundant atomic, and a stale "claimed" cannot happen, because a claim is never revoked. Second, the path count is added by EVERY arc that reaches `v` at this level, not only by the winner: that is what makes it a count of shortest paths rather than a count of claims. The claim and the count are therefore two separate conditions on the same arc, and a body that folds them into one is the most natural way to get betweenness wrong -- the sabotage row for it is in Step 5.

`atomicMin` is the claim for the reason design 8.4 gives for the whole family: WGSL 17.8.5 permits `atomicCompareExchangeWeak` to fail spuriously, so a compare-exchange claim needs a retry loop and a bounded loop can leave a vertex unclaimed for its level. `atomicMin` has no such failure mode.

- [ ] **Step 3: PD-11 -- the overflow, detected rather than assumed**

`sigma` is `array<atomic<u32>>` and the count is added with `atomicAdd`, which returns the value before the add. Unsigned addition wraps silently, and a wrapped count produces scores that are not approximately wrong but arbitrarily wrong, so:

```
let old = atomicAdd(&sigmaK[idx], add);
if (old + add < old) { atomicOr(&counters[SIGMA_OVERFLOW_WORD], 1u); }
```

The wrap test is exact for `u32` and costs one comparison per add. The word rides back with the counters block and becomes `sigmaOverflow` in the result. The count is never clamped and never saturated: a clamped count is a wrong answer that no flag can describe.

- [ ] **Step 4: The fixture that makes the flag testable**

Nothing in `test/helpers/graphs.ts` produces more than `2^32` shortest paths. Add `layeredEdges(width, layers)`: `layers` groups of `width` vertices, every vertex of group `i` joined to every vertex of group `i + 1`. The number of shortest paths from a vertex of the first group to a vertex of the last is `width^(layers - 2)`, so `layeredEdges(4, 18)` overflows `u32` by a factor of four on a graph of 72 vertices, and `layeredEdges(4, 16)` -- `4^14`, about `2.7e8` -- does not. Both are in the suite: the flag must be `true` on the first and `false` on the second, because a flag that is always on is as useless as one that is always off. This is design 13 row P9's gate item "the overflow flag fires on a constructed small-world graph", constructed and named.

- [ ] **Step 5: Proof, before any backward pass exists**

The forward pass is testable on its own and must be tested on its own, because a wrong `sigma` that a wrong `delta` happens to cancel is exactly what design 11.9 item 2 is about. `test/algorithms/betweenness-forward.test.ts` reads `depthK` and `sigmaK` back (through the `inspect()` seam, `GRAPHTY_GPU_INSPECT=1`) and compares them per source against the Brandes reference's own `depth` and `sigma`: `depthK` exact, `sigmaK` exact as integers. Fixtures: `KARATE_EDGES`, `pathEdges(500)`, `starEdges(1000)`, `gridEdges(30, 30)`, `cycleEdges(101)`, `completeEdges(64)`, `randomEdges(2000, 8000, 7)`, `rmatEdges(14, 10, 7)`, directed and undirected, with self-loops and parallel arcs, at k = 1, k = 2 and the planner's k; the two layered fixtures for the flag; the run-twice bitwise check on `depthK`, `sigmaK` and the counters (integer addition is associative, so the counts are bitwise reproducible whatever order the atomics land in -- assert it, because that is what makes every later comparison exact rather than approximate).

- [ ] **Step 6: Three sabotage rows and more.** The pre-check's `atomicLoad` compared against `level` instead of `INVALID_INDEX` (a vertex is then re-claimed at every later level); the count added only by the winning arc (the most natural wrong version of Step 2, and it must fail on any graph with two shortest paths -- name `completeEdges(64)` as the row's fixture); the wrap test dropped (the layered fixture stops reporting overflow); the tag ignored so `depthK` is indexed by `v` instead of `s * n + v` (correct at k = 1 and wrong at k = 2, which is why k = 2 is in the fixture list); the workgroup scan made inclusive.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/betweenness-forward.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; `depthK` and `sigmaK` bitwise identical between the two adapters.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): the tagged betweenness forward pass with a reported path-count overflow`.

---

### Task P9-T8: The backward pass, the gather, sampling -- the first working betweenness

**Depends on P9-T7. This is the task that makes the betweenness half deliver something.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.4 lines 2700-2712 (the successor pull, why `bc` is NOT accumulated inside the backward pass, the gather after the batch's last level, sampling through `sources` / `k`); design 8.10 "BC backward" and "BC gather"; design 9.7 line 3271 (the parity rule and the `1e-4` tolerance); design 3.3 line 802; design 13 row P9's gate items on exact betweenness, the analytic sums, and the sampled comparison.

**Files:** Create `$PKG/src/wgsl/bc-backward.wgsl.ts`, `$PKG/src/wgsl/bc-gather.wgsl.ts`, `$PKG/src/algorithms/betweenness.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`; create `$PKG/test/algorithms/betweenness.test.ts`.

- [ ] **Step 1: PD-12 -- the pull, and why no float is ever written twice**

Per level from the deepest, one invocation per entry `(w, s)` of `S[ends[L] .. ends[L + 1])`:

```
var acc = 0.0;
for (arc in rowPtr[w] .. rowPtr[w + 1]) {
    let v = colIdx[arc];
    if (depthK[s * n + v] == depthK[s * n + w] + 1u) {
        acc += (f32(sigmaK[s * n + w]) / f32(sigmaK[s * n + v])) * (1.0 + deltaK[s * n + v]);
    }
}
deltaK[s * n + w] = acc;
```

Each `(w, s)` is in `S` exactly once, so each `deltaK` entry is written by exactly one invocation and read only by the level above. That is design 8.4's "eliminate the use of atomics by checking successors", and the reason it matters here is stated in the design too: with k tagged sources in one dispatch, `(w, s1)` and `(w, s2)` at the same level would otherwise race on a float, and WGSL has no float atomic to make that safe.

The successors of `w` are its OUT-neighbours in the forward adjacency -- the forward pass expanded the same rows -- so the backward pass binds `rowPtr` and `colIdx` and never needs `reverse()`. On a directed snapshot that is the correct direction; on an undirected one the two are the same array.

Then, after the batch's last backward level, `bc-gather`: one invocation per vertex `w`, `bc[w] += sum over s of deltaK[s * n + w]`, skipping `s` whose source IS `w`. k reads per vertex, one write, no atomics, a fixed summation order.

**The consequence, which is what makes this phase's tests exact (PD-12):** nothing in the phase accumulates a float through an atomic. The forward counts are integers, the dependencies are written once, the gather sums in index order, and the batches are applied in a fixed order. So `bc` is bitwise reproducible run to run and bitwise identical across adapters, and the run-twice check asserts it on the scores themselves rather than on some upstream integer. A later cross-adapter difference in `bc` is then a finding, not a surprise.

- [ ] **Step 2: The host loop**

```
for each batch of k sources:
    plan k (P9-T6), allocate S / ends / depthK / sigmaK / deltaK from the batch lease
    fill: depthK = INVALID_INDEX, sigmaK = 0, deltaK = 0; seed depthK[s][src] = 0, sigmaK[s][src] = 1, S = the k seeds
    forward: submits of MAX_LEVELS_PER_SUBMIT levels (bc-finalize, bc-forward), one 4-byte `done` read per submit
    read back `ends` and the counters block (one copy)
    backward: for L = levels - 1 down to 1, one bc-backward dispatch over ends[L] .. ends[L + 1]
    bc-gather
    check options.signal; fire onProgress(sourcesDone, sourcesTotal)
read back bc (one F32(n)); apply the host-side convention of Step 4
```

`signal` is checked between batches and between submits, never inside one, and `onProgress` reports sources rather than levels, because sources are what a caller asked for. `E_ABORTED` uses the same helper PageRank does.

- [ ] **Step 3: Sampling, and PD-14**

`options.sources` gives the source indices explicitly; each is validated against `nodeCount` with `E_INVALID_ARGUMENT` naming the offending value. `options.k` without `sources` draws k distinct indices with the package's existing LCG (`src/layouts/seed.ts`), seeded deterministically so two runs of the same call draw the same sources -- and the drawn list is returned to the caller through... nothing in design 3.3's result, which is why `sourcesUsed` carries the COUNT and the JSDoc says the list itself is only reproducible, not reported. Neither option: every vertex is a source (exact betweenness).

**PD-14, and it needs the owner's decision in the pull request:** a sampled result is the UNSCALED sum over the sources actually run. It is not multiplied by `n / k`. The reason to prefer it: extrapolation changes what the number means without changing its name, so a reader comparing a sampled score with an exact one sees two numbers on different scales with no way to tell from the result which is which -- while `sourcesUsed` beside an unscaled sum says exactly what was summed, and a caller who wants the estimator multiplies by `n / sourcesUsed` in one line. The reason someone might overrule it: NetworkX's sampled betweenness rescales, and a consumer porting from it will see smaller numbers. This is a published result semantic, so the decision is recorded in the pull request, the JSDoc states it in the first line, and P9-T15 writes the record.

- [ ] **Step 4: PD-13 and PD-15 -- the convention, on the host**

After the readback, over `F32(n)`: divide by 2 when the snapshot is undirected; then, when `normalized` is set, divide by `(n-1)(n-2)` directed or `(n-1)(n-2)/2` undirected, and by nothing at all when that factor is zero (`n < 3`). That is the CPU's rule term for term (section 0.1), and it costs one pass over `n` on the host over an array that was just read back -- a kernel for it would need a second dispatch and a second readback to save nothing.

`endpoints: true` throws `E_UNSUPPORTED { feature: "betweenness.endpoints" }` with a hint naming `algorithms/src/algorithms/centrality/betweenness.ts` lines 120-127, for the reason DEP-P9-D gives: the CPU's branch cannot fire, so there is no behaviour to match. `endpoints: false` and the default are accepted and change nothing.

- [ ] **Step 5: The differential suite**

Against `brandesOracle` from P9-T2, composing the same halving and normalisation the driver applies so a wrong convention cannot hide on either side. Fixtures, which are design 13 row P9's gate list in full: `KARATE_EDGES`, `pathEdges(500)`, `starEdges(1000)`, `cycleEdges(101)`, `gridEdges(30, 30)`, `randomEdges(2000, 8000, 7)`, plus `completeEdges(64)`, a disconnected fixture, a directed fixture, self-loops and parallel arcs, and the empty and single-vertex graphs. For each: relative error `<= 1e-4` against the f64 reference (design 9.7, DEPARTURE-6) with the tolerance traced to the noise floor P9-T2 measured, and bitwise equality against the f32 reference where the fixture's summation order matches; `expectTopKOrder`; `normalized` both ways; the run-twice bitwise check on `bc`; `validate({ checksum: true })` afterwards.

Then the two analytic checks the gate names, asserted as closed forms and not against any reference: on `pathEdges(n)` the score at index `i` is `i * (n - 1 - i)`, and on `starEdges(L)` the hub is `L * (L - 1) / 2` with every leaf `0`.

Then the sampled checks: on `rmatEdges(17, 10, 3)` (about 131k vertices) a 256-source sampled run has Spearman `>= 0.9` with an exact run on a 10k-vertex subgraph, and a sampled run with an explicit `sources` list equals the Brandes reference run on the SAME list within `1e-4` -- which is the gate's "equals the CPU's sampled result on the same `sources` list" met against the independent reference, for the reason DEP-P9-C gives.

Then the planner check the gate names: the same fixture run with `maxStorageBufferBindingSize` faked down so k shrinks, asserting identical scores and a larger batch count.

- [ ] **Step 6: Four sabotage rows.** The successor test `depth[v] == depth[w] + 1` relaxed to `>=` (extra terms, wrong dependencies); `(1 + delta[v])` written as `delta[v]` (every score falls by the count of its successors, which is a uniform-looking error an end-to-end tolerance can swallow -- so this row's check is the analytic path fixture, name it); the gather including `s == w` (the source's own dependency is added to its score); `deltaK` read from level `L` instead of `L + 1` (the recursion collapses and only the deepest level survives).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/betweenness.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; `bc` bitwise identical between the two adapters (PD-12).

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): betweenness centrality, exact and sampled`.

---

### Task P9-T9: Edge betweenness

**Depends on P9-T8.**

**Spec:** design 8.4 lines 2712-2715 ("edge BC writes per arc and folds with `foldArcs(s, vec, "first")`, halved on undirected snapshots as both papers do" -- this task keeps the fold and drops the halving, DEP-P9-F); design 3.3 line 803 and line 825; design 9.7 line 3272; design 13 row P9's gate item "edge BC folded correctly (both arcs equal before folding, asserted)".

**Files:** Create `$PKG/src/wgsl/bc-edge-gather.wgsl.ts`, `$PKG/src/algorithms/edge-betweenness.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/algorithms/betweenness.test.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: The per-arc gather, which reuses the batch untouched.** Edge betweenness is the same recursion read one level lower: the contribution of arc `(w, v)` for source `s` is `sigma[s][w] / sigma[s][v] * (1 + delta[s][v])` whenever `depth[s][v] == depth[s][w] + 1` -- the exact term the backward pass already summed over successors. So `bc-edge-gather` runs ONCE per batch after the backward sweep, one invocation per arc, looping the batch's k sources and adding into `arcScores[arc]`. Arc-parallel means each arc is written by one invocation, so again no atomic and no race, and the phase's bitwise reproducibility holds for edge scores too.
- [ ] **Step 2: The fold, on the host, and the halving that must NOT happen here (DEP-P9-F).** The device produces `F32(arcCount)`; the result is `F32(edgeCount)`. `foldArcs(snapshot, perArc, "first")` from `@graphty/graph-format` does it, returning `perArc` itself when `arcToEdgeIsIdentity`. Undirected snapshots are then published AS FOLDED, with no division by two. The reason is the fold itself: `"first"` keeps one of the edge's two arcs and drops the other, the two arcs carry the same value once every source has been summed, and that shared value is already the edge's score over unordered pairs. Halving it publishes half the right number, and section 0.5 DEP-P9-F carries the worked example. The vertex path DOES halve and is unaffected, because its gather discards nothing and genuinely counts each pair twice; the driver's JSDoc says that in one sentence, because "why does the edge path not halve when the vertex path does" is the first question a reader of the two files side by side will ask. `normalized` divides by the same factor the vertex path uses, which is also what the CPU package's `edgeBetweennessCentrality` divides by.
- [ ] **Step 3: Proof.** `expectArcPairsEqual` on every undirected fixture BEFORE the fold -- the gate's own item, and the check that catches a per-arc kernel that wrote one direction only, which `"first"` would then happily hide. Then the folded scores against the reference's per-arc output folded the same way, within `1e-4` -- the reference neither halves nor normalises (P9-T2 Step 1), so this comparison is on the published scale and a stray division by two fails it. Then the two invariants that need no reference, which are what pin the SCALE rather than the shape (`expectArcPairsEqual` compares the two arcs with each other and would pass just as happily on numbers that are uniformly half or double the truth): on any undirected fixture the sum of edge scores over the edges incident to a vertex relates to that vertex's score by Brandes' own identity (`sum of incident edge scores = 2 * vertex score + (n - 1)` for a connected graph, asserted on `pathEdges` and `cycleEdges` where both sides are known), and on `pathEdges(n)` the edge between index `i` and `i + 1` has score `(i + 1) * (n - 1 - i)`, another closed form. Both are stated on `pathEdges(3)` in the test as the smallest case anyone can check by hand: each edge scores 2, the identity at vertex 1 reads `2 + 2 = 2 * 1 + 2`, and a halved implementation produces 1 and 2 and fails both.
- [ ] **Step 4: Four sabotage rows** (the depth test dropped so every arc contributes; the contribution written to `arc` instead of accumulated, so only the last source survives; the fold called with `"sum"`, which doubles every undirected edge; and a division by two applied after the fold, which halves every undirected edge -- the last two are host-side rows and both are scored by the closed-form path fixture of Step 3, which is the only check in the suite that knows the right scale).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/betweenness.test.ts` then `$GPU_LLVM`.
Expected: PASS on both.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): edge betweenness from the same dependencies`.

---

### Task P9-T10: The edge-parallel forward pass and the per-batch choice

**Depends on P9-T8. May run in parallel with P9-T9 provided its `src/kernels.ts` append is applied after it.**

**Spec:** design 8.4 line 2711 ("the McLaughlin-Bader online switch to the edge-parallel form (median BFS depth `< gamma log2 n`) is implemented as a per-batch choice"); design 8.8 row 7 (`edgeList()` in edge-parallel mode).

**Files:** Create `$PKG/src/wgsl/bc-forward-edge.wgsl.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/constants.ts` (one constant), `$PKG/src/algorithms/betweenness-batch.ts`, `$PKG/src/types/betweenness.ts` (one option), `$PKG/test/algorithms/betweenness.test.ts`, `$PKG/test/helpers/sabotage.ts`, `$PKG/test/device/constants.test.ts`.

- [ ] **Step 1: PD-17 -- the edge-parallel body over `edgeList()`.** One invocation per logical edge, for each of the batch's k sources: if `depthK[s][src] == level` relax `dst`, and on an undirected snapshot relax in both directions -- the same "each edge once, both directions" shape design 8.4 gives Bellman-Ford. It claims and counts with exactly the rules of P9-T7 Step 2 and appends to the same `S`, so the two forward bodies are interchangeable level by level and the backward pass cannot tell which ran. It does NOT use `coo()`: the residency refuses that view before P11 (section 0.1), and `edgeList()` carries the same information for this kernel.
- [ ] **Step 2: PD-18 -- the choice, per batch, from a number the host already has.** The design's rule is "median BFS depth `< gamma log2 n`". A tagged batch does not produce per-source depths on the host, and computing a median would cost a reduction whose only consumer is this decision. The host DOES have the previous batch's level count, which is the maximum depth over its k sources, so that is the estimate: after the first batch (always frontier-driven), a batch runs edge-parallel when `levels < BC_EDGE_PARALLEL_GAMMA * log2(n)`. Using the maximum instead of the median is conservative in one direction -- it over-estimates depth and so prefers the frontier-driven form -- and that is stated in the JSDoc with this sentence, not left for a reader to infer. `BC_EDGE_PARALLEL_GAMMA` defaults to 2 and is re-fixed by P9-T13's measurement; the design names the rule and no value, so the default is the plan's and the benchmark is what justifies it.
- [ ] **Step 3: The option that makes it testable.** `BetweennessOptions.forward?: "frontier" | "edge" | "auto"` (default `"auto"`). `"frontier"` and `"edge"` pin the body, which is how the test compares them, and `"auto"` is the rule of Step 2.
- [ ] **Step 4: Proof.** The whole P9-T8 suite three times -- pinned frontier, pinned edge, and auto -- asserting IDENTICAL `bc` in all three (not within a tolerance: the two bodies do the same integer and float operations in a different order per level, and the claim of PD-12 is that the result does not depend on order; if this check fails, PD-12 is wrong and that is a finding for G9, not a tolerance to widen). Then, on a low-diameter fixture (`rmatEdges(16, 10, 3)`) and a high-diameter one (`gridEdges(300, 300)`), assert `"auto"` chose the edge-parallel body on the first and the frontier body on the second, read from the driver's own counter.
- [ ] **Step 5: Three sabotage rows** (the undirected second direction dropped, which is invisible on a directed fixture -- so the row's check runs on an undirected one; the level test `== level` replaced by `<= level`; the switch comparison inverted, which is correct but slow, so that row's check is the benchmark's dispatch count and the row says so).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/betweenness.test.ts` then `$GPU_LLVM`.
Expected: PASS; identical scores in all three modes; each body chosen at least once across the two fixtures.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): the edge-parallel betweenness forward pass and its per-batch choice`.

---

### Task P9-T11: Unweighted all-pairs over the tagged forward pass

**Depends on P9-T7 (the forward pass) and P9-T3 (the driver it extends).**

**Spec:** design 8.7 line 2775 ("`n` batched BFS rows for unweighted"); design 9.7 line 3274 (exact unweighted).

**Files:** Create `$PKG/src/wgsl/apsp-from-depth.wgsl.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/algorithms/all-pairs.ts`, `$PKG/test/algorithms/all-pairs.test.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: PD-19 -- the route, which is a better algorithm and not a fallback.** An unweighted snapshot (`flags.allWeightsOne`, or `options.weighted === false`) runs the batched forward pass of P9-T7 with `sigma` disabled by an override, k rows at a time, and `apsp-from-depth` converts each batch's `depthK` block into `dist` rows (`INVALID_INDEX` becomes `+Infinity`, everything else becomes `f32(depth)`). The cost falls from `O(n^3)` to `O(n * A)`, which at `n = 5,760` and ten arcs per vertex is two orders of magnitude. This is the same kind of routing design 8.4 gives SSSP when `flags.allWeightsOne` sends it to the breadth-first search: a better algorithm for the input, chosen from a flag the snapshot carries, never a recovery from a failure.
- [ ] **Step 2: The ceiling does not move.** The result is still one `n * n` binding, so P9-T3's `nMax` and its `E_TOO_LARGE` apply unchanged, and the test asserts the refusal fires identically on both routes. What DOES change is the working set: the batch holds one `S` entry and one `depthK` word per (node, source), so the driver reuses P9-T6's planner at TWELVE bytes per (node, source) -- `S` at 8 and `depthK` at 4, with no `sigmaK` and no `deltaK` -- and the same `kByBinding`, since `S` is still the widest single array. Twelve, not eight: eight is the `S` entry alone, and forgetting `depthK` is the same omission DEP-P9-B records against the design's own figure. The `n * n * 4` bytes of the distance matrix are resident for the whole run and are subtracted from the byte budget before k is planned, because a matrix sized at the binding ceiling is not free space for a batch to sit on top of. The `max(1, ...)` of P9-T6's formula still applies and is what keeps this route from refusing an input the blocked sweep accepts: k of one source is always admitted, and the `E_TOO_LARGE` a caller sees above `nMax` is Step 2's, never the planner's.
- [ ] **Step 3: Proof.** The unweighted half of P9-T3's suite runs on BOTH routes -- pinned to the blocked sweep and pinned to the rows -- and asserts bitwise-identical matrices. `gridEdges(30, 30)` against the closed form of P9-T2 Step 3. The run-twice check on both. A directed fixture, where the rows are the out-direction and the matrix must not be symmetric.
- [ ] **Step 4: Three sabotage rows** on `apsp-from-depth` (the unreached sentinel converted to `0` instead of `+Infinity`; the row stride taken as `k` instead of `n`; the batch's row offset ignored, so batch 2 overwrites batch 1).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/all-pairs.test.ts` then `$GPU_LLVM`.
Expected: PASS; the two routes bitwise identical.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): unweighted all-pairs over batched breadth-first rows`.

---

### Task P9-T12: The betweenness accelerator members and the barrel

**Depends on P9-T8, P9-T9, P9-T10 and P9-T11 -- every driver green.**

**Spec:** design 3.3 lines 802-803 and the accelerator block; `algorithms/src/indexed/accelerator.ts` lines 113-117, which already declare both members with `BetweennessAcceleratorOptions`.

**Files:** Modify `$PKG/src/accelerator.ts`, `$PKG/src/index.ts`, `$PKG/test/index.test.ts`, `$PKG/test/types/public-api.test-d.ts`, `$PKG/test/accelerator.test.ts`.

- [ ] **Step 1: Two members, no stubs.** `betweennessCentrality` and `edgeBetweennessCentrality` go on the accelerator object, each calling `ctx.assertReady()` first. `AcceleratorOptions.algorithms.betweenness` (design 3.3 line 779) supplies the `k` and `sources` defaults when the call gives none; a call's own options win. The `endpoints: true` refusal of PD-15 surfaces here too, and the accelerator test asserts it, because a member that silently ignores an option is the failure the refusal exists to prevent.
- [ ] **Step 2: The barrel and its two tests.** `src/index.ts` exports `betweennessCentrality`, `edgeBetweennessCentrality` and the types from `src/types/betweenness.ts`; the names move from the never-exported list to the value list of `test/index.test.ts` in the SAME commit.
- [ ] **Step 3: knip clean, and the conformance compile.** `test/types/conformance.test-d.ts` asserts mutual assignability with the real `AlgorithmAccelerator`; both new members must satisfy it without a cast.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip) && eval $GPU_NV pnpm run test:node`
Expected: all clean.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): expose betweenness and edge betweenness on the accelerator`.

---

### Task P9-T13: The `betweenness` benchmark group and T-11 on both runner classes

**Depends on P9-T12. Parallel with P9-T14.**

**Spec:** design 10.4 line 3416 (T-11: betweenness at 100k / 1M with 256 sampled sources in 5 s or less; karate exact in 20 ms or less); design 10.3's betweenness column (0.5-2 s at 100k / 1M and 2-20 s at 1M / 10M, both marked [X] and therefore replaced by a measurement here, design 13 rule (c)); design 10.1's betweenness memory column (marked [D], corrected by DEP-P9-B); design 11.7.

**Files:** Create `$PKG/benchmarks/betweenness.bench.ts`; modify `$PKG/benchmarks/run.ts`, `$PKG/benchmarks/results/nvidia-lovelace-driver580.json`, `$PKG/benchmarks/results/gpu-linux-t4.json`, `$PKG/test/benchmarks.test.ts`.

- [ ] **Step 1: The rows.** Exact betweenness on karate and on a 2,000-vertex random graph; sampled betweenness with 256 sources on the RMAT ladder at 100k / 1M and 1M / 10M, both forward bodies pinned and once on `"auto"`; edge betweenness on the 100k tier; and, beside each, the planned k, the batch count and the resident bytes the batch actually held. The last three are what turn DEP-P9-B from an assertion into a measurement, and design 13 rule (c) requires design 10.1's [D] column to be replaced by them.
- [ ] **Step 2: Report the per-source cost, because that is the model the design gives.** Design 8.4's cost model is per source: one forward pass plus one backward sweep, each streaming the arcs once at about 16 bytes per arc, with the dispatch overhead divided by k. Print the measured milliseconds per source beside the total so the model can be checked rather than believed, and record whether batching amortised the overhead as the model says it should.
- [ ] **Step 3: Both runner classes before the commit.** Capture on the RTX 4070 SUPER locally and on the T4 lane through a labelled pull request, and land both baseline files in the same commit as the benchmark file.
- [ ] **Step 4: T-11, and what happens if it is missed.** If 256 sampled sources at 100k / 1M exceed 5 s, or karate exact exceeds 20 ms, do NOT relax the target: design 10.4's rule is that the owner either re-fixes it in a recorded decision in the pull request or the phase continues with the miss recorded. Write the number either way. The same run fixes `BC_EDGE_PARALLEL_GAMMA` (P9-T10 Step 2): if the measured crossover disagrees with the default of 2, the constant changes here, with the measurement cited in its JSDoc.

Run: `cd $PKG && eval $GPU_NV pnpm run bench betweenness && pnpm run bench:compare`
Expected: the table prints; `bench:compare` finds no tracked median above 3x its baseline.

- [ ] **Step 5: Commit (owner)** -- `perf(webgpu-graph-algorithms): the betweenness benchmarks and the T-11 baselines`.

---

### Task P9-T14: The sabotage matrix, the stage comparisons, the browser smoke and the limits tests

**Depends on P9-T12. Parallel with P9-T13.**

**Spec:** design 11.9 items 1, 2 and 4 (sabotage, per-kernel inspection, run twice); design 11.6 item 4 (the browser smoke); design 12.3 (`GRAPHTY_GPU_NO_SUBGROUPS=1`).

**Files:** Create `$PKG/test/sabotage/betweenness.test.ts`, `$PKG/test/limits/betweenness-1m.test.ts`; modify `$PKG/test/browser/` (add the karate betweenness smoke), `$PKG/test/noise-floor.test.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: Run every mutation.** The rows were written by the tasks that wrote the kernels, each beside the test it must break; this task runs them all and closes the gaps `test/sabotage/coverage.test.ts` reports. At least three per kernel across nine kernels is 27 mutations, and the P9-T3 and P9-T7 rows push it above 30. A mutation that survives is a bug in the test suite and blocks the gate exactly as a failing test does.
- [ ] **Step 2: The stage comparisons.** Behind `GRAPHTY_GPU_INSPECT=1`, expose per batch: `depthK`, `sigmaK`, `ends`, the per-level `S` range, `deltaK` after each backward level, and `arcScores` before the fold. Compare them level by level against the Brandes reference's own per-level state. This is what catches a wrong `sigma` that a wrong `delta` cancels -- the exact failure design 11.9 item 2 describes, and the one betweenness is most prone to, because the backward pass divides by the forward pass's output.
- [ ] **Step 3: No subgroup twin, and why that is a statement rather than an omission.** Design 6's subgroup list is `reduce`, `scan`, `segmentedReduce`, `advance` and the FA2 epilogues. None of this phase's nine kernels is on it: the forward pass reuses P8's block-mapped scan through the same body, and the tile kernels use workgroup memory with no cross-lane primitive. So P9 adds no `needs: ["subgroups"]` entry, and the CI twin pass runs this phase's suites unchanged. Say it in the G9 record so a later reader does not go looking for the missing twin.
- [ ] **Step 4: The browser smoke.** Add exact betweenness on karate against the reference to the browser project, beside the PageRank, BFS and components smokes design 11.6 item 4 names. Betweenness is the most expensive thing a graphty user runs (design 8.8 row 7), so the browser path having a smoke is not optional.
- [ ] **Step 5: The `node-limits` tests.** Sampled betweenness with 64 sources on the 1M / 10M RMAT (the tier where the planner's k falls to single digits and the batch count is what the test asserts), and the unweighted all-pairs route at a raised binding limit.
- [ ] **Step 6: The noise-floor rows.** Append to `benchmarks/results/noise-floor.json`: the f32-versus-f64 Brandes spread per fixture from P9-T2 (which is what justifies design 9.7's `1e-4`, measured here for the first time); the f32-versus-f64 Floyd-Warshall spread on the weighted fixtures (which justifies the `1e-5`); and the cross-adapter spread of `bc` and of `dist`, both expected to be exactly zero by PD-12 -- record the zero, because a later non-zero is then a finding rather than a surprise.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/sabotage && eval $GPU_NV pnpm exec vitest run --project=node-limits && pnpm run test:browser:ci`
Expected: every mutation caught; limits green; browser green (exit 124 with `numFailedTests === 0` counts as green, design 11.6).

- [ ] **Step 7: Commit (owner)** -- `test(webgpu-graph-algorithms): the betweenness sabotage matrix, the stage comparisons and the browser smoke`.

---

### Task P9-T15: The decision records and the design index

**May run any time after P9-T8.**

**Files:** Create `$WT/design/decisions/2026-09-23-all-pairs-refuses-above-the-binding-bound.md`, `$WT/design/decisions/2026-09-23-betweenness-batch-counts-the-claim-log.md`, `$WT/design/decisions/2026-09-23-betweenness-endpoints-is-refused.md`, `$WT/design/decisions/2026-09-23-edge-betweenness-is-not-halved.md`, `$WT/design/decisions/2026-09-23-sampled-betweenness-is-not-rescaled.md`; modify `$WT/design/decisions/README.md`.

- [ ] **Step 1.** One file per departure of section 0.5 that changes a design statement (A, B, D and F), plus one for PD-14, which changes no design statement but fixes a published result semantic the design left open. Each states what the design says, what the package does, the evidence, and what would have to change to go back. Follow the shape of the records already in the directory.
- [ ] **Step 2.** Add the five to the README index.

Run: `cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-23-*.md`
Expected: no output.

- [ ] **Step 3: Commit (owner)** -- `docs: record the betweenness and all-pairs departures`.

---

### Task P9-T16: The G9 gate record and the phase close

**Last.**

**Files:** Create `$PKG/docs/decisions/G9.md`; modify `$PKG/CLAUDE.md` (the "Verified Platform Facts" section gains whatever this phase measured that a later phase would otherwise rediscover -- at least the real `maxStorageBufferBindingSize` values the all-pairs ceiling came out to on each adapter, and whether the one-pass blocked sweep held on all three).

- [ ] **Step 1: The full green check, both adapters plus the browser.**

```
cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip)
eval $GPU_LLVM pnpm run test:node && eval $GPU_LLVM pnpm run coverage
eval $GPU_NV   pnpm run test:node && eval $GPU_NV pnpm exec vitest run --project=node-limits
pnpm run test:browser:ci
eval $GPU_LLVM GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/algorithms
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs
```

Expected: green throughout; coverage at or above 80 / 80 / 75 / 80; no non-ASCII; the default-lane wall time inside T-12's 15 minutes (record it -- this phase adds roughly fifty test cases and a dense kernel whose fixtures are quadratic in `n`, and T-12 is the budget that says when that stops being free).

- [ ] **Step 2: Write G9.md** against design 13 row P9's gate list, item by item with its evidence, in the shape of the existing G0-G7 records:

| G9 item (design 13 row P9, line 4216) | Evidence |
| --- | --- |
| Exact betweenness on karate, path, star, cycle, grid and random 2k within `1e-4` relative, and top-k order | `test/algorithms/betweenness.test.ts` (P9-T8 Step 5) |
| Analytic sums on path and star | `test/algorithms/betweenness.test.ts`, asserted as closed forms |
| Edge betweenness folded correctly, both arcs equal before folding, asserted | `test/algorithms/betweenness.test.ts` through `expectArcPairsEqual` (P9-T9 Step 3) for the pairing, AND the `pathEdges` closed form `(i + 1) * (n - 1 - i)` plus Brandes' incident-edge identity for the SCALE -- `expectArcPairsEqual` compares the arcs only with each other and passes on a uniformly halved or doubled result, which is what DEP-P9-F is about |
| Sampled betweenness with 256 sources on a 100k RMAT has Spearman `>= 0.9` with exact betweenness on a 10k subgraph, and equals the reference's sampled result on the same `sources` list | `test/algorithms/betweenness.test.ts` (P9-T8 Step 5); the comparison is against this package's independent Brandes reference, because `indexed.betweennessCentrality` does not exist -- DEP-P9-C, and the missing port is named here |
| The overflow flag fires on a constructed graph | `test/algorithms/betweenness-forward.test.ts` on `layeredEdges(4, 18)`, with `layeredEdges(4, 16)` as the negative control |
| Batch planning honours a faked `maxBufferSize`: k shrinks, results equal | `test/algorithms/betweenness-batch.test.ts` and `test/algorithms/betweenness.test.ts` |
| All-pairs exact unweighted and `1e-5` weighted in `node-limits`; `E_TOO_LARGE` above the 8.7 bound | `test/algorithms/all-pairs.test.ts`, `test/limits/apsp-ceiling.test.ts` |
| T-11 recorded | `benchmarks/results/*.json`, the session named in the record |

Also record, as the design's own gate rules require: the sabotage matrix run and its count; the `inspect()` stage comparisons; every tolerance traced to its noise-floor row, including the first measurement of the f32 Brandes spread that design 9.7's `1e-4` has rested on since DEPARTURE-6 was written; the measured bytes per (node, source) against design 10.1 (DEP-P9-B); the measured betweenness times against design 10.3's [X] column; the fact that this phase adds no subgroup variant and why; and any target that was missed together with the owner's decision about it.

- [ ] **Step 3: Commit (owner)** -- `docs(webgpu-graph-algorithms): the G9 gate record for betweenness and all-pairs`.

---

## 7. Appendices

### 7.1 The owner's command sheet, in order

```
# once, before anything
git worktree add .worktrees/webgpu-betweenness -b feat/webgpu-betweenness master
export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-betweenness
export PKG=$WT/webgpu-graph-algorithms
cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build

# the two environments every Run line uses
export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

# the per-task commit, sixteen times, with the subject the task names
cd $WT && ./tools/commit-changes.sh --dry-run
cd $WT && ./tools/commit-changes.sh
```

Every commit is scoped `webgpu-graph-algorithms` except P9-T15's, which is scoped `docs`. If the all-pairs half ships as its own pull request, it is P9-T1 through P9-T5 and it needs no branch of its own beyond this one.

### 7.2 Verification matrix

| Kernel or driver | Independent reference | Differential fixtures | Run-twice | Sabotage rows | Noise-floor row |
| --- | --- | --- | --- | --- | --- |
| `apsp-init` | the reference's initial matrix | parallel arcs, self-loops, directed, unweighted | bitwise | 2 | none (exact) |
| `apsp-fw` | Floyd-Warshall in f64 and f32 | karate, grid, path, star, cycle, complete, random, disconnected, `n` = 33 and 1057 | bitwise | 5 | f32-vs-f64 spread, weighted |
| `apsp-from-depth` | the breadth-first row sweep | the unweighted half of the list, both routes | bitwise | 3 | none |
| `bc-finalize` | `planIndirect`, `frontier-finalize`, `indirect-finalize` | 2,000 counts to `2^32 - 1`; hand-seeded `ends` | bitwise | 2 | none |
| `bc-forward` | Brandes `depth` and `sigma` per source | the full list at k = 1, 2 and the planner's k; layered overflow and its control | bitwise on `depthK`, `sigmaK`, counters | 5 | none (integers) |
| `bc-forward-edge` | the frontier-driven body | the full list, pinned; undirected and directed | bitwise, identical to the other body | 3 | none |
| `bc-backward` | Brandes `delta` per level | the full list; per-level stage comparison | bitwise | 4 | f32-vs-f64 Brandes spread |
| `bc-gather` | the reference's vertex sums | the full list, `normalized` both ways, sampled | bitwise on `bc` | 3 | shares the backward row |
| `bc-edge-gather` | the reference's per-arc sums | undirected pairs equal before folding; path and cycle closed forms | bitwise | 3 | shares the backward row |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| RP-1 | The betweenness half cannot start until the frontier phase merges, and that phase cannot start until two others do. | Section 0.2 states it first, and the all-pairs half -- a third of the phase and one of its three public functions -- is ordered to need none of it. |
| RP-2 | PD-12's bitwise reproducibility is wrong, which would make the whole test strategy approximate instead of exact. | The argument is written out in P9-T8 Step 1 and rests on one claim: no float is accumulated through an atomic anywhere in the phase. P9-T10 Step 4 tests it the hardest way available, by running two different forward bodies and requiring identical scores. If it fails, the comparison drops to the derived tolerance, the finding goes in G9, and nothing else in the phase changes. |
| RP-3 | The one-pass blocked sweep depends on dispatches within a compute pass seeing each other's writes. If a driver in the matrix disagrees, the sweep is silently wrong. | P9-T3 Step 6's `n = 33` and `n = 1057` fixtures and the symmetry check fail loudly rather than silently on any such disagreement, and the suite runs on lavapipe, NVIDIA and (through P9-T14) SwiftShader before the gate. The fallback if one disagrees is one pass per round, which costs dispatch latency and nothing else. |
| RP-4 | Design 9.7's `1e-4` for betweenness has never been measured; the f32 accumulation over many sources might be worse. | P9-T2 Step 3 measures the f32-versus-f64 spread before any kernel exists, so the number is known at the START of the phase rather than discovered by a red test at the end. Re-fixing is an owner decision in the pull request, never a quiet edit to a test file. |
| RP-5 | The planned k comes out far below the design's 64 on a default device, so the sampled run makes many more batches than design 10.1 assumed. | P9-T6 Step 4 states the formula and a worked example, P9-T13 Step 1 measures the batch count and the resident bytes, and DEP-P9-B says the design's own arithmetic omitted the claim log. Nothing about correctness depends on k; the gate's faked-limit test exists to prove exactly that. |
| RP-6 | The `endpoints` refusal (PD-15) surprises a caller who set it on the CPU and saw no error. | The refusal's message names the CPU file and lines, so the surprise arrives with its own explanation, and DEP-P9-D is a filed bug report rather than a comment in a driver. |
| RP-7 | Six tasks append to `src/kernels.ts`, so nothing in the middle of the betweenness half can run in parallel. | PD-16 states the rule; the parallel opportunities are at the ends (P9-T1 with P9-T2 at the start, P9-T13 with P9-T14 at the finish) and are marked. |

## 8. Self-review

### 8.1 Spec coverage -- every deliverable of design 13 row P9 has a task

| Design 13 row P9 deliverable | Task |
| --- | --- |
| McLaughlin-Bader forward pass (`u32` sigma with `sigmaOverflow`, `S` / `ends`) | P9-T6 (the log and its ends), P9-T7 (the pass, the counts, the overflow) |
| Successor-pull backward pass writing `n x k` deltas | P9-T8 |
| The per-batch `bc` gather (no float races) | P9-T8 |
| Tagged multi-source batching planned from `maxBufferSize` | P9-T6 |
| The online work-efficient / edge-parallel switch | P9-T10 |
| Sampling (`sources` / `k`) | P9-T8 |
| Edge betweenness via `foldArcs(..., "first")` (folded, not halved -- DEP-P9-F) | P9-T9 |
| Normalisation identical to the CPU | P9-T8 Step 4 |
| `onProgress` / `signal` | P9-T8 Step 2 |
| Blocked Floyd-Warshall with the binding-size bound of 8.7 | P9-T3 |
| BFS-based all-pairs | P9-T11 |
| Brandes oracle | P9-T2 |
| Gate G9 | P9-T16 |

The Floyd-Warshall reference is not in the design's deliverable list and is in P9-T2 anyway: design 11.3's oracle rule applies to every algorithm, and an all-pairs kernel judged only against its own breadth-first route would share that route's bugs.

### 8.2 Placeholder scan

No task says "TBD", "as appropriate" or "etc.". Every Run line names a real script from `webgpu-graph-algorithms/package.json` (`build:all`, `lint`, `test:node`, `test:browser:ci`, `bench`, `bench:compare`, `coverage`) or a real vitest project (`node`, `node-limits`, `browser`). Every helper named in a task exists today on master (`algorithmScope`, `coreOfView`, `assertNotWindowed`, `foldArcs`, `snapshotOf`, the fixture generators, `setKernelBodyOverride`), comes from design phase P8 and is named as such (`Frontier`, `FrontierCounters`, `frontier-finalize`, `MAX_LEVELS_PER_SUBMIT`, `bfs-fused`), or is created by a task of this plan (`layeredEdges`, `spearman`, `expectArcPairsEqual`).

### 8.3 Type consistency across the tasks

`GpuApspResult` and `ApspOptions` are declared once, in P9-T1, in `src/types/all-pairs.ts`; P9-T3, P9-T4 and P9-T11 consume them and none redeclares. `GpuBetweennessResult`, `GpuEdgeScoresResult` and `BetweennessOptions` are declared once, in P9-T6, in `src/types/betweenness.ts`; P9-T8, P9-T9, P9-T10 and P9-T12 consume them. `GpuScoresResult` comes from `src/types/algorithms.ts` and is never redeclared. The two type files are created by the task that first needs them rather than both up front, so each half of the phase is knip-clean at its own last commit rather than carrying the other half's unused exports across a pull-request boundary. `BcBatch` is declared once, in `src/algorithms/betweenness-batch.ts`, and imported by the three drivers that use it. The counters block is P8's, extended by exactly two appended words in P9-T6 and read by every kernel that touches a count.
