# @graphty/webgpu-graph-algorithms P11 -- structure and community (k-core, triangles, k-truss, label propagation, minimum spanning tree, Louvain) Implementation Plan

> **What changed after this was written (2026-09-26).** A measured cost model -- two independent models reconciled against every GPU row this repository has recorded -- classified each of this phase's six algorithms as earning the GPU, marginal, or not earning it, and set the node count above which graphty-element should route each one to the device (`design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`). Three of the six go: the minimum spanning tree (P11-T4; crossover 6,000 nodes in Chromium on the reference card, 10.4x at 100k, 43x at 1M against indexed Kruskal), triangle counting with the clustering coefficient (P11-T8; 12.7x at 100k on the model, unverified until the sorted-merge step is timed on the card -- it earns only at or under 2.7 ns per step) and label propagation (P11-T6; 21x at 100k against a typed-array port, provided the changed-count readback is batched at least 8 passes per submit; at one readback per pass the 10k call loses). Two are demoted behind their CPU ports and a measurement of the per-row group-by primitive: k-core (P11-T7; 0.82x at 100k against an indexed port, and the port alone is 25-30x over the shipped code) and Louvain (P11-T10, P11-T11, P11-T13; 2.5x at 100k and 0.31x at 10k against a port on the optimistic model, a loss everywhere on the cuGraph-derived bound, and the port alone is 20x). One is dropped: k-truss with support recomputed each round (P11-T9; 4.8x at 10 rounds, 1.8x at 30, 1.1x at 50 at 100k, with the round count unbounded -- this plan's own risk RP-6). The demoted and dropped tasks sum to 10.5 of the 27.5 estimated days in section 0.6, leaving 17.0; the critical path no longer runs through Louvain and is P11-T3 -> P11-T5 -> P11-T6 and P11-T8 -> P11-T12 -> P11-T16. Two constants this plan never named are now required: `LABEL_PROP_PASSES_PER_SUBMIT` of at least 8 (P11-T1, P11-T6) and a rounds-per-submit constant for Boruvka (P11-T4; 4 rounds per submit moves the crossover from 6.0k to 4.6k and the 100k speedup from 10.4x to 17x). And the group-by primitive (P11-T5) is to be TIMED at 100k before P11-T6 is written: its per-arc rate (0.30 ns assumed, 1.3 ns pessimistic) is the constant that decides label propagation's margin and Louvain's fate. Each task heading below carries its own one-line verdict. This banner moved the body down by 2 lines, so a line number written before 2026-09-26 names text that now sits that many lines lower.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P11 inside `webgpu-graph-algorithms/`: building a graph on the device from an edge list (`cooToCsr`) and the simple symmetric graph every community and triangle kernel runs on; k-core by peeling; triangle counting with the per-node clustering coefficient and graph transitivity as its epilogue; the k-truss decomposition built on triangle support; label propagation over a new per-row group-by-key primitive; a minimum spanning tree by Boruvka's two-pass per-component minimum; and Louvain with its move pass and its contraction performed entirely on the device. With them: independent CPU references for each, the differential and sabotage suites, the `louvain` benchmark group, and gate G11.

**Architecture:** Two ideas carry this phase. The first is that a graph can be built on the device: given arrays of sources, targets and weights, a histogram, a scan and a cursor scatter produce compressed sparse rows without a host round trip. That build is what lets Louvain contract a level's communities into the next level's graph without ever handing the graph back to the CPU, and it is also how a directed or multi-edge snapshot becomes the simple symmetric graph that triangles, k-truss and Louvain are defined over. The second is the per-row group-by-key: for one vertex's row of arcs, group the arcs by a key attached to each neighbour (the neighbour's label, or the neighbour's community) and pick the best group. Label propagation and Louvain's move pass are the same kernel under two scoring snippets. Every kernel is a body in `src/wgsl/<id>.wgsl.ts` registered in `src/kernels.ts`; every driver is a file under `src/algorithms/` that may import `src/context.ts`, `src/memory/**`, `src/kernel/**`, `src/kernels.ts` and `src/primitives/**` and nothing above it (`webgpu-graph-algorithms/eslint.config.js`, `webgpu-graph-algorithms/test/layers.test.ts`). The dependency direction is unchanged: the GPU package imports `@graphty/graph-format`, and takes `@graphty/algorithms` and `@graphty/layout` as optional peers for type declarations only.

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu` (Dawn) in Node 22 and Chromium (Playwright) in the browser, `@graphty/graph-format` snapshots, vitest 3.2 (node / node-limits / browser projects, v8 coverage), fast-check, pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; `gpu-linux-t4` lane).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 3.3 lines 805-809 (the five public signatures) and lines 827-830 (`GpuCorenessResult`, `GpuTriangleResult`, `GpuMstResult`, `GpuCommunityResult`), 6 row 4 line 1571 (`compact`), row 5 line 1572 (`histogram` / counting sort), row 6 line 1573 (`radixSort`), row 10 line 1577 (`cooToCsr`), lines 1599-1604 (the determinism policy), 8.1 line 2569 (the sort / group-by family row), 8.5 lines 2725-2741 (k-core, triangle counting, k-truss, Boruvka), 8.6 lines 2743-2771 (label propagation and Louvain), 8.8 lines 2797-2798 (priority order 9 and 10), 8.10 lines 2852-2856 (the binding budgets), 9.7 lines 3273-3279 (result-shape parity), 10.4 line 3420 (T-15), 11.3 (test kinds), 11.6 (the browser smoke), 11.9 (the four sensitivity mechanisms), 13 row P11 line 4218 (the deliverables and gate G11), 16.3 lines 4977-4990 (the Louvain gain floor), 16.4 lines 4991-5054 (node and edge masks, whose machinery this phase consumes and whose differential the gate inherits), and 17 line 5067 (triangle counting carries the clustering coefficient the product is missing). The design is normative; every departure is in section 0.5.

**Plans of record for the earlier phases:** `design/webgpu/plans/2026-09-15-webgpu-p0.md` through `-p3.md`, `design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md` (the scan, histogram, counting sort and stable radix sort this phase builds on), `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` (the SpMV and connected-components phase, whose residency, scope helper and pointer-jumping compress kernel this phase reuses), and `design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md` (the traversal phase, whose `Frontier`, `advance`, `compact` and mask machinery three of this phase's algorithms consume).

**Gate:** G11 (design 13 row P11, line 4218). The record is `webgpu-graph-algorithms/docs/decisions/G11.md`, written by the last task beside the existing G0-G3, G5, G6 and G7.

**Tasks in this document:** P11-T1 .. P11-T16. **P11-T1 and P11-T2 are independent of everything and may run first, in parallel.** P11-T4 (the minimum spanning tree) needs neither upstream branch and can start against master today. P11-T3 (the device graph build) needs the grid phase and is the first task that does. P11-T5 (the group-by-key primitive) then unblocks P11-T6 and the Louvain pair P11-T10 / P11-T11. P11-T7, P11-T8 and P11-T9 wait for the traversal phase. P11-T12 gathers, P11-T13 and P11-T14 run in parallel after it, P11-T15 any time after P11-T3, P11-T16 last. Within the phase no two tasks own the same file, with one exception stated as PD-2: `src/kernels.ts` is appended to by nine tasks (P11-T3 through P11-T11), which is why their REGISTRY EDITS are serialised -- the rest of each of those tasks is not.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the touched files is a step of P11-T16.
- Never run `sudo`; nothing here needs it. Servers only on ports 9000-9999 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them.
- Project rule (root `CLAUDE.md`): never create a fallback when WebGPU is absent. `src/` contains no CPU path and no software-adapter acceptance; the package throws. This bites in one specific place here: design 8.6 says Louvain's later levels are small and lose parallelism, and the temptation is to finish them on the CPU. The package does not. It runs every level on the device and the caller chooses the CPU package when the graph is small.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts` line 195).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md`): device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator. `src/wgsl/**` is imported only by `src/kernels.ts`. Enforced by `webgpu-graph-algorithms/eslint.config.js` and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md` "WGSL Conventions"): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and every subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, and never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`).
- Bind-group rule: group 0 = the graph (`rowPtr`, `colIdx`, `weights` or a dummy, `perm` or a dummy), group 1 = algorithm state, group 2 = the params uniform through the `UniformRing`, group 3 = cold arrays and the arc mask of design 16.4; never more than 8 storage buffers per stage. A kernel that needs a ninth is SPLIT, never given a raised limit as a requirement.
- One WGSL rule matters more in this phase than in any before it, and the gate names it: a variable may not be accessed atomically in one place and plainly in another. Every count this phase decrements, every claim word and every cursor is declared `array<atomic<u32>>` and read with `atomicLoad`, including in the dispatch that only reads it. Design 13 row P11's gate item "no mixed atomic / non-atomic access (the compile matrix on both runtimes)" is the check.
- Test placement: the `node` project's include glob names its directories literally (`test/*.test.ts` plus `test/{device,node,memory,kernel,primitives,algorithms,layouts,oracle,sabotage,types}/**/*.test.ts`, `webgpu-graph-algorithms/vitest.config.ts` lines 207-210). A new directory is invisible to the runner. Every test file this plan creates goes in one of those directories or in `test/limits/` (the `node-limits` project) or `test/browser/`.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is in section 0.5 with its reason and, where it changes a design statement, a `design/decisions/2026-09-23-<slug>.md` record written by P11-T15.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-23)

| Fact | Evidence |
| --- | --- |
| Master carries design phases P0-P3, P5 and P7: the device, context, memory and kernel layers; `reduce` and `segmentedReduce`; ForceAtlas2 on the exact tier; Fruchterman-Reingold and the spring-electrical preset; `spmvPull` with PageRank, personalized PageRank, HITS, eigenvector and Katz; Afforest connected components; spectral. | `ls webgpu-graph-algorithms/src/algorithms/` returns `components.ts`, `degree.ts`, `pagerank.ts`, `power-iteration.ts`, `scope.ts`, `spectral.ts`; `ls webgpu-graph-algorithms/docs/decisions/` returns G0, G1, G2, G3, G5, G6-algorithms, G7 |
| `src/primitives/` on master holds FOUR files: `core-shape.ts`, `reduce.ts`, `segmented-reduce.ts`, `spmv.ts`. There is no `scan`, `histogram`, `radix-sort`, `compact`, `frontier` or `advance`. | `ls webgpu-graph-algorithms/src/primitives/` |
| The scan, the histogram with counting sort, the stable radix sort, `planIndirect` and the `indirect-finalize` kernel exist, complete and tested, on branch `feat/gpu-p4`. They are NOT on master. | `git ls-tree -r --name-only feat/gpu-p4 -- webgpu-graph-algorithms/src/primitives` lists `histogram.ts`, `radix-sort.ts`, `scan.ts`, `grid.ts`, `grid-pyramid.ts` |
| The traversal phase (`Frontier`, `advance`, `compact` / `dedupe`, breadth-first search, weighted shortest paths, the node and edge mask machinery of design 16.4) is PLANNED and not written. Its plan is `design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md` and its own entry criteria are not met either. | that file's section 0.2 |
| `KernelId` is a closed union of seventeen ids and `KERNELS` is frozen; the registry is append-only and every entry carries `phase: "P1" \| "P2" \| "P3" \| "P7"`. | `webgpu-graph-algorithms/src/kernels.ts`, the `KernelId` declaration at line 39 and `KernelEntry.phase` at line 71 |
| `GraphResidency.view()` accepts `outDegree`, `inDegree`, `degreeOrder` and `reverseDegreeOrder`, serves `reverse` and `edgeList` through the packed-view path, and rejects `coo` and `mate` by name with the message "the <name> view is not uploaded before P11". | `webgpu-graph-algorithms/src/memory/residency.ts`, the `view()` switch, the `case "coo": case "mate":` arm |
| `src/types/accelerator.ts` no longer mirrors the consumer interfaces: it imports the real `AlgorithmAccelerator` and `LayoutAccelerator` from `@graphty/algorithms` and `@graphty/layout` and re-exports them. `GpuAccelerator` declares the layout members plus PageRank, personalized PageRank, HITS, eigenvector, Katz and both spellings of connected components. It declares none of this phase's five. | `webgpu-graph-algorithms/src/types/accelerator.ts` lines 106-127 |
| The CPU seam already declares every member this phase implements, as optional: `kCoreDecomposition`, `triangleCount`, `labelPropagation`, `minimumSpanningTree`, `louvain`. | `algorithms/src/indexed/accelerator.ts` lines 119-123 |
| `@graphty/algorithms` has no triangle counting and no clustering coefficient anywhere. Its `clustering/` directory holds hierarchical clustering, k-core, Markov clustering and spectral clustering only. | `ls algorithms/src/clustering/` |
| graph-format guarantees invariant I4 -- within every row `colIdx` is non-decreasing, ties ordered by ascending `arcToEdge` -- which is what makes a merge intersection legal without a sort. | `graph-format/CLAUDE.md` line 144; `design/graph-format/graph-format-design.md` line 348 |
| graph-format exposes `renumberPartition` (first-seen dense relabelling), `foldArcs`, `fromCsr`, `fromEdgeArrays`, the `NodeMask` / `EdgeMask` packed bitmap types, and a `coo` view name this phase is the first to want. | `graph-format/src/snapshot/derived.ts:1155`, `src/snapshot/views.ts:852`, `src/populate/from-csr.ts:675`, `src/populate/from-edge-arrays.ts:216`, `src/types/columns.ts:722-727`, `src/types/snapshot.ts:226-242` |
| `test/helpers/graphs.ts` provides thirteen named fixtures (`FIXTURE_NAMES`) and the generators this phase needs, including `rmatEdges`, `gridEdges`, `completeEdges`, `starEdges` and `randomEdgesLoose`. It has NO planted-partition generator and no fixture with a known triangle count. | `webgpu-graph-algorithms/test/helpers/graphs.ts` lines 397-411 |
| `test/helpers/sabotage.ts` holds the `Mutation` record, the `SABOTAGE` registry keyed by `KernelId`, and `test/sabotage/coverage.test.ts` asserts every `find` string occurs exactly once in the live body. | `webgpu-graph-algorithms/test/helpers/sabotage.ts` lines 24-45 |
| `benchmarks/run.ts` registers the groups `upload`, `roundtrip`, `layout-exact`, `layout-fr`, `pagerank` and `wcc`. The checked-in baselines are `gpu-linux-t4.json`, `nvidia-lovelace-driver580.json` and `noise-floor.json`. | `webgpu-graph-algorithms/benchmarks/run.ts` line 36; `ls webgpu-graph-algorithms/benchmarks/results/` |

### 0.2 Entry criteria, and which tasks each one blocks

This phase is the last of the design's algorithm work and it has two upstream dependencies, not one. They block different tasks, and saying which is which is the difference between this phase waiting for everything and this phase starting in a week.

| Criterion | Status | What it is, and which tasks need it |
| --- | --- | --- |
| Design phase P4 merged (`exclusiveScan`, `histogram` / `countingSortByKey`, the stable `radixSort`, `planIndirect`, the `indirect-finalize` kernel, windowed upload execution and the `node-limits` project) | **NOT MET** -- branch `feat/gpu-p4` | Needed by P11-T3 (the device graph build is a histogram, a scan and a scatter), P11-T5 and P11-T10 / P11-T11 (Louvain's cluster weights and its contraction sort). It is NOT needed by P11-T1, P11-T2 or P11-T4. |
| Design phase P8 merged (`Frontier`, `advance`, `compact` / `dedupe`, the device-side dispatch selector, and the node / edge mask expansion of design 16.4) | **NOT MET** -- planned only | Needed by P11-T7 (k-core peeling is the same queue with a different claim), P11-T8 (the oriented arc list is a `compact` of the arcs) and P11-T9 (k-truss peels through an `EdgeMask`). It is NOT needed by P11-T3, P11-T4, P11-T5, P11-T6, P11-T10 or P11-T11. |
| Design phase P7 merged (`reverse()` and `edgeList()` residency with `packViews`, grid-stride dispatch, `src/primitives/core-shape.ts`, `src/algorithms/scope.ts`, the pointer-jumping `wcc-compress` kernel) | **MET** | Every task. P11-T4 reuses `wcc-compress` unchanged rather than writing a second pointer-jumping kernel. |
| Design's phase order admits P11 after P9 | **PARTLY** | Design 13 line 4225 draws `P7 (SpMV + WCC) -> P8 (frontier) -> P9 (BC + APSP) -> P11 (structure, community)`. Nothing in this phase consumes betweenness or all-pairs shortest paths, so P9 is an ordering convention, not a dependency. Stated as DEP-P11-A. |

**What can start now, against master, before either branch merges:** P11-T1 (types and constants -- no device), P11-T2 (the CPU references -- no device) and P11-T4 IN FULL (the minimum spanning tree: it reads `edgeList()` residency and the `wcc-compress` kernel, both of which are on master). **What can start the day the grid phase merges:** P11-T3, P11-T5, then P11-T6 and the Louvain pair. **What waits for the traversal phase:** P11-T7, P11-T8, P11-T9.

### 0.3 Execution order

```
master (today) ------------------------------> P11-T1, P11-T2, P11-T4   (all three in parallel)
merge feat/gpu-p4 (P4) ----------------------> P11-T3 -> P11-T5 -> P11-T6
                                                 \         \-> P11-T10 -> P11-T11
                                                  \-> (P11-T11 contraction)
merge the traversal phase (P8) --------------> P11-T7
                                               P11-T8 -> P11-T9
P11-T12 gathers; P11-T13 and P11-T14 run in parallel after it; P11-T15 any time after P11-T3; P11-T16 last.
The one coupling this diagram does not draw is the registry: whenever P11-T4 runs alongside P11-T3,
their `src/kernels.ts` edits are still taken one at a time, in the order PD-2 gives.
```

Read the fan-out this way. Building a graph on the device (P11-T3) needs only the histogram, the scan and the sort, every one of which is already written on the grid branch, and it unblocks the contraction Louvain needs, so it is the first task with a dependency and the one whose slip costs the most. Triangle counting (P11-T8) needs stream compaction, which the traversal phase introduces, and so does k-core's peeling queue (P11-T7) and k-truss's edge mask (P11-T9); those three cannot start before that phase lands whatever else happens. The minimum spanning tree (P11-T4) needs neither: it is an edge-parallel two-pass minimum plus a pointer-jumping compress the package already ships, so it is the earliest thing in this phase that produces a usable algorithm.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | The device graph build ships as `prepareCooToCsr(scope)`, a planner over a `ReduceScope` with a synchronous `record(pass, ...)`, the shape every existing primitive uses, not as the design's free function | P11-T3 |
| PD-2 | Nine tasks append to `src/kernels.ts` (P11-T3 through P11-T11); the file is a lock held by one task at a time, each adding its ids to `KernelId` and whichever arrives first adding the `phase: "P11"` member once. Holding the file is not blocking the task: P11-T4 writes its bodies, driver and tests against master in parallel with P11-T3 | P11-T3 |
| PD-3 | Fifteen P11 kernel ids, their binding counts at or below design 8.10's with every difference named in its row | P11-T3 |
| PD-4 | Triangles, k-truss, label propagation and Louvain all run on a SIMPLE SYMMETRIC device graph -- both arc directions present, parallel arcs merged by summing weight, self-loops dropped or split into a per-node self-weight array -- built once per snapshot by the same kernel chain Louvain's contraction uses. Level 0 of Louvain is that chain under the identity partition | P11-T3 |
| PD-5 | k-core removal is TWO dispatches per round: one marks the round's frontier removed and writes its coreness, one decrements surviving neighbours. The claim is the invocation whose `atomicSub` returns exactly `k + 1`, which is unique | P11-T7 |
| PD-6 | Every float minimum in this phase goes through an order-preserving u32 key, never a raw bit pattern: negative f32 bit patterns do not order correctly under unsigned comparison | P11-T4 |
| PD-7 | Boruvka's per-component minimum is two passes (minimum key, then minimum edge index among ties) and its pointer jumping REUSES the existing `wcc-compress` kernel rather than adding a second one | P11-T4 |
| PD-8 | The per-row group-by-key ships as one primitive with a SCORE snippet and two tiers (workgroup memory for rows of at most 256 arcs, a global open-addressing region of `2 x degree` above), and label propagation and Louvain's move pass are its two callers | P11-T5 |
| PD-9 | Label propagation breaks ties by the LOWEST label id, which makes the GPU result bitwise reproducible run to run even though parity with the CPU stays a partition-recovery score | P11-T6 |
| PD-10 | Triangle counting's result gains `coefficient: F32` and `transitivity: number` -- the clustering coefficient is the intersection kernel's epilogue, not a second algorithm | P11-T8 |
| PD-11 | k-truss RECOMPUTES support each peeling round over the surviving edge mask instead of maintaining it incrementally; the ceiling and the upgrade path are written into the driver | P11-T9 |
| PD-12 | Louvain's contraction sorts arc pairs with TWO stable radix passes -- by target community, then by source community -- because the sort primitive takes 32-bit keys and a community pair is 64 bits | P11-T11 |
| PD-13 | Louvain's move gain floor is `max(tolerance / n, 1e-12)`, a named constant interpolated into the kernel, never a literal (design 16.3) | P11-T10 |
| PD-14 | Louvain's partition is bitwise reproducible on one device although it is not the CPU's partition: no kernel in the level loop uses a float atomic or an order-dependent reduction | P11-T10, P11-T16 |
| PD-15 | The accelerator members and the barrel export land in ONE task, after every driver is green; never a throwing stub | P11-T12 |
| PD-16 | Every algorithm this phase ships carries the masked-equals-filtered differential of design 16.4 item 6, and the gate lists it per algorithm | every algorithm task, P11-T16 |
| PD-17 | Triangle support is indexed by ORIENTED ARC, one per undirected edge of the simple symmetric graph, so the intersection kernel needs no edge map at all; the map back to the snapshot's logical edges is a named output of the simple symmetric build and is used once, at k-truss's readback | P11-T3, P11-T8, P11-T9 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-P11-A | Design 13 line 4225 orders `P9 (BC + APSP) -> P11 (structure, community)`. This plan states that P9 is not a dependency and that P11 may be scheduled directly after P8. | Nothing in this phase reads a betweenness score or an all-pairs distance matrix, and no primitive P9 adds appears in any task here. The order in design 13 is a priority statement (design 8.8 scores betweenness above this family), not a technical one. No decision record: the design says nothing that this contradicts, and the owner may still schedule P9 first for the reason design 8.8 gives. |
| DEP-P11-B | Design 3.3 declares five public signatures for this phase and no `kTruss`, although design 8.5, design 13 row P11 and design 17 all name k-truss as a P11 deliverable and the gate asks for "k-truss support exact". | The function must exist for the deliverable to exist. This plan declares `kTruss(ctx, s, k, options?)` returning `{ edges: U32; support: U32; k: number }` -- surviving logical edge indices, their support in the k-truss, and the k it was run for -- and adds `GpuKTrussResult` to the result list of design 3.3. Recorded by P11-T15 as `design/decisions/2026-09-23-ktruss-has-a-public-signature.md`. |
| DEP-P11-C | Design 3.3 line 828 declares `GpuTriangleResult { perNode, total }`. This phase returns `{ perNode, total, coefficient, transitivity }`. | Design 17 line 5067 says the per-node clustering coefficient is the intersection kernel's epilogue and that it is the product's missing metric; computing it inside the kernel that already holds the counts and the degrees costs one dispatch over `n`, and returning only `perNode` would force every consumer to recompute it from a degree array the GPU package has and the consumer does not. Section 0.7 says where it surfaces. Recorded by P11-T15 as `design/decisions/2026-09-23-triangles-carry-the-clustering-coefficient.md`. |
| DEP-P11-D | Design 6 row 10 spells `cooToCsr` as a free function taking a `CommandBatch`, and says its output rows are NOT sorted by target. This phase ships it as a `prepareCooToCsr` planner (PD-1) and adds a second scatter mode so that its rows ARE sorted by target in every use here. | The planner shape is the same departure the traversal phase records for its primitives and has the same cause: pipeline creation is asynchronous and must happen once, not per level, and `src/primitives/**` may not import `src/context.ts`. The sortedness needs the second mode, and design 6 row 10 is loose about this: it says Louvain's contraction sorts the arcs first "so rows come out sorted", but the cursor scatter it describes reserves each slot with an `atomicAdd` on a per-row cursor, which hands slots out in race order and destroys the input order inside a row. Sorting the arcs is necessary and not sufficient. This phase therefore gives `coo-scatter` a `SORTED_INPUT` mode in which an arc's slot is its own global index minus its row's start (P11-T3 Step 3): no cursor, no atomic, input order preserved exactly. The rows are then sorted by target as a property of the caller that sorts AND selects that mode, never of the primitive. Recorded by P11-T15 as `design/decisions/2026-09-23-coo-to-csr-is-a-planner.md`, which also carries this correction to design 6 row 10's wording. |
| DEP-P11-E | Design 13 row P11 lists "Leiden refinement if time allows". This plan does not schedule Leiden. | Design 8.6 says Leiden follows "once Louvain is stable", and Louvain's own stability is this phase's largest risk (design 15 R-16). A refinement pass planned before the thing it refines has been measured is a guess. Leiden is named in section 0.8 as the first candidate for a phase of its own. No decision record: "if time allows" is not a commitment the design made. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| P11 structure and community | `webgpu-graph-algorithms/` | design phase P4 merged for most tasks and design phase P8 merged for three of them (section 0.2) -- NEITHER met today | the device graph build and the simple symmetric graph, k-core, triangle counting with the clustering coefficient, k-truss, label propagation, Boruvka's minimum spanning tree, Louvain with device contraction, the per-row group-by-key primitive, six CPU references, the accelerator members, the `louvain` benchmarks | design G11 | design 13 row P11 says 12-16 ed; this plan's sixteen tasks sum to 27.5 ed |

Critical path: P11-T3 -> P11-T5 -> P11-T10 -> P11-T11 -> P11-T12 -> P11-T16.

**Something works early.** P11-T4 is the first task that ends with a correct, usable, benchmarkable algorithm, and it is the only one that needs NEITHER unmerged branch -- it runs against master today, before the grid phase and before the traversal phase: after it, `minimumSpanningTree` returns an edge set identical to Kruskal's on every fixture with distinct weights. If the phase has to be split, P11-T1 to P11-T6 plus P11-T12 to P11-T16 is a shippable pull request holding the graph build, the minimum spanning tree and label propagation; P11-T7 to P11-T11 is the second, holding the triangle family and Louvain.

| Task | What it is | ed |
| --- | --- | --- |
| P11-T1 | the five result types, the k-truss result, four option records, seven constants | 0.5 |
| P11-T2 | six independent CPU references, the modularity and partition-agreement helpers, the planted-partition and known-triangle fixtures | 2.0 |
| P11-T3 | `cooToCsr` with its two scatter modes, the simple symmetric graph build and its map back to logical edges, three kernels, the registry opening | 2.5 |
| P11-T4 | Boruvka's minimum spanning tree: the order-preserving key, the two-pass minimum, the hook, the reused compress -- **first working algorithm** | 2.0 |
| P11-T5 | the per-row group-by-key primitive: the workgroup tier, the global hash tier, the score snippet | 2.5 |
| P11-T6 | label propagation | 1.5 |
| P11-T7 | k-core by peeling | 1.5 |
| P11-T8 | triangle counting, the clustering coefficient and transitivity | 2.5 |
| P11-T9 | the k-truss decomposition | 1.5 |
| P11-T10 | Louvain's move pass: the gain, the alternating direction, the gain floor, the recomputed cluster weights | 3.0 |
| P11-T11 | Louvain's on-device contraction and the level loop | 3.0 |
| P11-T12 | five accelerator members, the barrel, three test files | 0.5 |
| P11-T13 | the `louvain` benchmark group and two baselines, T-15 on both runner classes | 1.5 |
| P11-T14 | the sabotage matrix (52 mutations against a floor of 45), the twins, the browser smoke, the `node-limits` tests | 2.0 |
| P11-T15 | three decision records and the design index | 0.5 |
| P11-T16 | the full green check on two adapters plus the browser, and the G11 record | 0.5 |
| | **total** | **27.5** |

27.5 ed against the design's 12-16. The gap is the same kind the two plans before this one found, and it is worth knowing before scheduling rather than after: the design cell was written before anyone enumerated fifteen WGSL bodies of which nine carry atomics, six independent CPU references of which two (Louvain and the modularity function) are themselves non-trivial programs, a new primitive with two tiers, roughly eighty test cases across seven suites, fifty-two sabotage mutations, and a benchmark group re-baselined on two runner classes against a CPU comparison. Six of the sixteen tasks are on one sequential chain and each ends in a green check on both adapters, which design 13 rule (a) requires. The owner's call, in the pull request: accept 27.5 and let the design cell stand as the estimate it was, or split the phase as section 0.6 describes. The tasks and their order are the same either way.

### 0.7 The clustering coefficient: what this phase ships, and where it surfaces

Triangle counting is asked for by one consumer in particular, and not under that name. The application design's Analyze panel lists "Tight-knit neighborhoods (Clustering coefficient)" among the things a reader can run, marked as new work, and lists Clustering coefficient again among the per-node metrics a reader can rank, histogram and encode as a style (`design/ui/app-shell-progressive-disclosure-design.md` lines 1952, 2329 and 3983). Nothing in the monorepo computes it: `@graphty/algorithms` has no triangle counting at all and its clustering directory holds hierarchical clustering, k-core, Markov clustering and spectral clustering; graphty-element has no algorithm class for it; and the application, by the repository's architectural rules, may not compute it itself.

A triangle count is the whole of the computation. For an undirected simple graph, a node's local clustering coefficient is `2 * T(v) / (d(v) * (d(v) - 1))`, zero when the degree is below two, and the graph's transitivity is `3 * totalTriangles / sum over v of d(v) * (d(v) - 1) / 2`. Both are an epilogue over arrays the intersection kernel has already produced, which is why PD-10 makes them fields of the triangle result rather than a second algorithm with a second pass over the graph.

Four things are needed for a reader to see the number, and this phase owns exactly the first:

1. **This phase.** `triangleCount` returns `perNode`, `total`, `coefficient` (one f32 per node) and `transitivity`, and `GpuAccelerator.triangleCount` carries them. That is P11-T8 and P11-T12.
2. **`@graphty/algorithms`.** Two items, not one, and the second is a different kind of change from the first.

   The first is the CPU side the dispatcher falls back to: an `indexed.triangleCount` and an `indexed.clusteringCoefficient`, neither of which exists. Until they do, a consumer with no GPU gets nothing.

   The second is the seam's declared return type. The member is already there, optional -- but it is declared `triangleCount?(s): Promise<{ readonly perNode: U32; readonly total: number }>` (`algorithms/src/indexed/accelerator.ts` line 120), and `coefficient` and `transitivity` are not in that type. A dispatcher in the CPU package typed against the seam cannot surface two fields the type says do not exist, however faithfully the GPU package returns them. So the seam's return type has to widen to carry them, and that is an edit to a PUBLISHED interface of a third package -- a different proposition from porting two functions, needing its own reviewer and its own release note, and the reason this item is written out rather than folded into the one above it.

   Both are ports in the CPU package, not work this phase may do (design 13 rule (b), and the phase's own scope in section 0.8). P11-T16 records the state of each separately, so "the CPU functions landed" is never mistaken for "a reader can see the number".
3. **graphty-element.** An algorithm class beside the twenty-four already in `graphty-element/src/algorithms/`, writing the per-node coefficient as an algorithm result so a style layer can encode it -- and, per the repository's rule on algorithm styles, a suggested layer that writes only to nodes that carry a coefficient.
4. **The graphty app.** Nothing but the panel entry and the metric row the application design already specifies, reading what the element exposes.

The chain is written down here because the failure mode is that step 1 lands, nobody writes steps 2 to 4, and a capability the product asked for sits in a package no consumer calls. P11-T16 records the state of steps 2 to 4 in the gate record so the gap is visible rather than assumed -- step 2 as its two separate items, because the type widening is the one that silently drops the field even after everything else has been done.

### 0.8 What P11 does NOT do

- No Leiden and no ensemble Louvain (DEP-P11-E). Design 8.6 and design 17 both put them after Louvain is measured.
- No similarity family (Jaccard, overlap, Sorensen, cosine). Design 17 places it in a slice after triangles and says the CPU package needs the four scorers first so the seam has something to dispatch to.
- No strongly connected components, no Markov clustering, no random walks. Design 17 leaves all three unscheduled.
- No new primitive beyond `cooToCsr` and the per-row group-by-key (design 13 rule (b)). In particular this phase does not build `compact`, `Frontier` or `advance`; it consumes them from the traversal phase.
- It does not touch `algorithms/`, `layout/`, `graphty-element/` or `graphty/`. Section 0.7 names what those packages owe and why it is not this phase's to write.
- It does not change the layout slice. `src/layouts/**` is untouched.

---

## Phase P11: structure and community

**Entry criteria:** design phase P4 merged for P11-T3, P11-T5, P11-T6, P11-T10 and P11-T11, and design phase P8 merged for P11-T7, P11-T8 and P11-T9. P11-T1, P11-T2 and P11-T4 need neither (section 0.2). Work on branch `feat/webgpu-structure-community` in a worktree (`git worktree add .worktrees/webgpu-structure-community -b feat/webgpu-structure-community master`, run by the owner -- a subagent must never run `git worktree`); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms`; the phase lands with the `gpu` label so `gpu.yml` runs on it.

**Step 0 of the phase** (a fresh worktree has no `node_modules` and no `dist/`, both gitignored). Export the two path variables FIRST -- every Run line below begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-structure-community
    export PKG=$WT/webgpu-graph-algorithms

then `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build`. Every later command reads `graph-format/dist/`.

**The local run environments** (`webgpu-graph-algorithms/CLAUDE.md`, used verbatim in every Run line):

    # NVIDIA (the hardware lane the parity and timing numbers come from)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task P11-T1: The result types, the option records and the seven constants

> **2026-09-26:** go, with two additions the record requires: `LABEL_PROP_PASSES_PER_SUBMIT` (at least 8) and a Boruvka rounds-per-submit constant. The k-truss result type is not needed while P11-T9 is dropped (`design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`).

**Independent. May run first, in parallel with P11-T2, against master.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 3.3 lines 805-809 (the five public signatures) and lines 827-830 (the four result interfaces); design 8.5 and 8.6 (which option each algorithm carries); design 9.7 lines 3273-3279 (what the result must let a caller check); design 16.3 (the gain floor's value and the rule that it is a named constant).

**Files:**
- Create: `$PKG/src/types/structure.ts` (the coreness, triangle, k-truss and minimum-spanning-tree shapes plus their option records)
- Create: `$PKG/src/types/community.ts` (the community result and the label-propagation and Louvain option records)
- Modify: `$PKG/src/constants.ts` (append the seven P11 constants; never reorder the file)
- Modify: `$PKG/test/device/constants.test.ts` (pin the seven new values)
- NOT touched: `src/index.ts` and `test/index.test.ts` (P11-T12 owns the barrel), `src/kernels.ts` (P11-T3)

**Interfaces produced:** `GpuCorenessResult`, `GpuTriangleResult`, `GpuKTrussResult`, `GpuMstResult`, `GpuCommunityResult`, `KTrussOptions`, `LabelPropagationOptions`, `LouvainOptions`, `MstOptions`.

- [ ] **Step 1: The result types**

`GpuCorenessResult { coreness: U32; maxCore: number }` and `GpuMstResult { edges: U32; totalWeight: number }` are design 3.3's text verbatim; `edges` holds LOGICAL edge indices, which is what lets a consumer flag edges through the snapshot's own edge remapping. `GpuCommunityResult extends GpuLabelResult { modularity: number; levels: number }` likewise, where `GpuLabelResult` is the existing shape in `src/types/algorithms.ts` and is NOT redeclared.

Two differ from the design and each carries a JSDoc line saying so with its decision record's file name:
- `GpuTriangleResult { perNode: U32; total: number; coefficient: F32; transitivity: number }` (DEP-P11-C). `coefficient[v]` is zero for a node of degree below two, which is a defined value and not a missing one -- say that in the JSDoc, because a consumer who sees a field of zeros on a star graph and guesses is the failure this prevents.
- `GpuKTrussResult { edges: U32; support: U32; k: number }` (DEP-P11-B). `edges` holds the logical edge indices that survive, `support[i]` is the number of triangles the i-th surviving edge lies in within the truss, and `k` echoes the argument so a result carried away from its call still says what it is. The two arrays are parallel and both are per SURVIVING LOGICAL EDGE, so on a snapshot with parallel edges every edge of a surviving pair appears with the same support -- k-truss runs on a simple graph and parallel edges lie in the same triangles. Say that in the JSDoc; P11-T9 Step 3 is where it comes from.

- [ ] **Step 2: The option records, spelled to match the CPU package's**

The seam rule of design 9.2 is that an accelerator method reuses the CPU option type so an application cannot pass a GPU option the CPU does not understand. `@graphty/algorithms` declares `LouvainOptions { resolution?, maxIterations?, tolerance?, useOptimized? }` (`algorithms/src/types/index.ts` lines 103-108) and `LabelPropagationOptions { maxIterations?, randomSeed? }` (`algorithms/src/algorithms/community/label-propagation.ts` lines 16-19).

This package's records carry the members that mean something on the device: `LouvainOptions { resolution?, maxIterations?, tolerance?, maxLevels? }` -- `maxIterations` is passes per level, `tolerance` is the modularity gain below which a level stops and is also the numerator of the gain floor of design 16.3, and `useOptimized` is a CPU implementation switch that is deliberately absent. `LabelPropagationOptions { maxIterations? }`, with a JSDoc line saying that a `randomSeed` passed through the seam has no effect here because ties are broken by the lowest label id (PD-9), which is a stronger guarantee than a seeded shuffle and not a silent ignore. `KTrussOptions {}` is empty today and exists so the signature does not change when it gains one. `MstOptions` is imported from the CPU package if it exists there and declared here otherwise -- check `algorithms/src/indexed/mst.ts` first, because `indexed.mst` already ships and the seam already types `minimumSpanningTree?(s, options?: MstOptions)`.

Every member is `readonly` and spelled `?: T | undefined`, because `tsconfig.strict-consumer.json` compiles with `exactOptionalPropertyTypes`.

- [ ] **Step 3: The seven constants**

Append to `$PKG/src/constants.ts`, each with a JSDoc naming its design line:

| Constant | Value | Why |
| --- | --- | --- |
| `LOUVAIN_GAIN_FLOOR` | 1e-12 | design 16.3: `minGain = max(tolerance / n, 1e-12)`; below the floor a "gain" is f32 rounding of two nearly equal sums and a move made on it oscillates |
| `LOUVAIN_MAX_LEVELS` | 32 | the level loop's hard stop; a level that does not shrink the graph ends the run before this, so reaching it is a bug and the driver says so |
| `LOUVAIN_PASSES_PER_SUBMIT` | 4 | design 8.6: the host reads the modularity and the move count per pass, so the batch is small; four keeps the readback count proportional to passes, not to levels |
| `GROUP_ROW_WORKGROUP_MAX` | 256 | design 8.6: rows of at most 256 arcs group their keys in workgroup memory (256 keys + 256 f32 = 2 KiB per row) |
| `GROUP_HASH_LOAD_FACTOR` | 2 | design 8.6: the global open-addressing region is sized `2 x degree` |
| `TRIANGLE_BINARY_SEARCH_RATIO` | 32 | design 8.5: intersect by merge, but binary-search into the longer list when the two degrees differ by more than this factor |
| `KCORE_ROUNDS_PER_SUBMIT` | 32 | design 8.5: `O(max core)` host-visible rounds, batched 32 per submit |

Run: `cd $PKG && pnpm exec vitest run --project=node test/device/constants.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS and clean. knip reports the new type exports as unused; that is expected until P11-T12 exports them through the barrel, and `knip.config.ts` must NOT be edited to silence it.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the structure and community result types and constants`.

---

### Task P11-T2: The six CPU references, the agreement helpers and the two new fixtures

> **2026-09-26:** go for the MST, triangle and label-propagation references and both fixtures. The k-core and Louvain references stay (they are the oracles their CPU ports will need); the k-truss reference waits with P11-T9.

**Independent. Needs NO GPU and no device. May run first, in parallel with P11-T1, against master.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 11.3 row "Algorithm differential" (the reference rule: independent, index-based, never derived from the kernel, and kept even after the CPU package's own ports exist as a second reference, because a GPU tested only against the CPU package shares its design and its bugs); design 11.9 item 3 (tolerances are derived, not chosen); design 13 row P11's gate, which names what each reference must decide.

**Files:**
- Create: `$PKG/test/oracle/structure.ts` (k-core peeling, triangle counting with the coefficient, k-truss support, Kruskal)
- Create: `$PKG/test/oracle/community.ts` (modularity, label propagation, Louvain)
- Create: `$PKG/test/helpers/partitions.ts` (the agreement measures and the planted-partition generator)
- Create: `$PKG/test/oracle/structure.test.ts`, `$PKG/test/oracle/community.test.ts` (the references check THEMSELVES against analytic answers)
- Modify: `$PKG/test/helpers/graphs.ts` (two fixtures, Step 3)
- NOT touched: anything under `src/`

**Interfaces produced:** `kCoreOracle(csr)`, `triangleOracle(csr)`, `kTrussOracle(csr, k)`, `kruskalOracle(edges)`, `modularityOf(csr, labels, resolution)`, `louvainOracle(csr, options)`, `labelPropagationOracle(csr, options)`, and from the helper `adjustedRandIndex(a, b)`, `plantedPartition(blocks, size, pIn, pOut, seed)`.

- [ ] **Step 1: The references, written from the algorithm, never from a kernel**

Each takes the compressed sparse rows as plain typed arrays (`rowPtr`, `colIdx`, `weights`) and returns plain arrays. Tens of lines each; none imports anything from `src/`.

- k-core: repeatedly remove every vertex whose surviving degree is below the current k, raising k when nothing is left to remove; the coreness of a vertex is the k at which it went. A textbook bucket queue, not a peeling frontier -- writing it a different way from the kernel is the whole point of an independent reference.
- Triangles: for each pair of neighbours of each vertex, test adjacency with a `Set` per row. This is the slow and obviously correct form; the kernel is the sorted merge, so a bug shared by both is unlikely. It returns `perNode`, `total`, `coefficient` in f64 and `transitivity`.
- k-truss support: the number of triangles each edge lies in, then repeated removal of edges below `k - 2` with supports recomputed from scratch each round. The recomputation is what the kernel does too (PD-11), so this reference also pins the ROUND COUNT, which is the thing a maintained-support implementation would change.
- Kruskal: sort the logical edges by weight and union-find them. It returns the edge set and the total weight in f64. On a graph with tied weights the edge SET is not unique, which is why the gate asks for set equality only on distinct weights -- the reference reports whether its input had ties so the test can pick the right assertion instead of guessing.
- Modularity: `sum over communities of (intraWeight / m - resolution * (clusterWeight / (2m))^2)` in f64, with self-loops counted once in the intra sum and twice in the cluster weight. This one function decides the Louvain gate, so it gets the most self-tests in Step 2.
- Louvain: the move pass and the contraction in f64, with the same gain floor and the same alternating direction rule as the kernel. It exists to answer "is the GPU's modularity in the band" and to produce the f64 number the f32 noise floor is measured against, never to be compared partition to partition.
- Label propagation: synchronous updates with the lowest-label tie-break, which is the kernel's rule (PD-9).

- [ ] **Step 2: The agreement helpers, which are what makes a nondeterministic result testable**

A community label is meaningless on its own; only the partition it induces is. `adjustedRandIndex(a, b)` is the standard measure over the pair-counting contingency table and is what design 13 row P11's gate means by "recovers planted partitions (ARI >= 0.9)". `plantedPartition(blocks, size, pIn, pOut, seed)` generates a graph with a known community structure from a seeded generator so ten seeds are ten different graphs with the same expected answer.

- [ ] **Step 3: Two fixtures the helper file lacks**

`test/helpers/graphs.ts` has no graph with a known triangle count and no planted partition. Add two, and add them to `FIXTURE_NAMES` so the existing per-fixture loops pick them up: `"planted"` (four blocks, dense inside and sparse between, scaled by `gpuScale()`) and `"triangles"` (a disjoint union of complete graphs of known sizes, whose triangle count, clustering coefficient and transitivity are all computable by hand -- every node of a complete graph of size s has coefficient exactly 1 and the graph's transitivity is exactly 1).

- [ ] **Step 4: The references check themselves**

Each reference runs against answers computable by hand, so a bug in it is caught before it is trusted to judge a kernel: on a complete graph of size s every node's coreness is `s - 1`, its triangle count is `(s-1)(s-2)/2`, its coefficient is 1 and the graph is its own `(s-1)`-truss; on a cycle every coreness is 2, every triangle count is 0 and every coefficient is 0; on a star every coefficient is 0 and the transitivity is 0; on a path of unit weights Kruskal's total is `n - 1`; on the planted partition the reference Louvain's modularity exceeds the modularity of the planted labelling minus 0.05 and its adjusted Rand index against the planted labelling is at least 0.9. Also measure what PD-14's noise floor needs: modularity computed in f32 versus f64 over the SAME partition on each fixture, and record the spread -- that number is what P11-T10 derives its tolerance from and P11-T16 records.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/structure.test.ts test/oracle/community.test.ts`
Expected: PASS, with no device acquired (neither file imports anything from `test/setup/gpu.ts`). If the run prints the `[gpu] adapter` line, something imported a device helper and the task's independence is gone.

- [ ] **Step 5: Commit (owner)** -- `test(webgpu-graph-algorithms): the structure and community references and the partition agreement helpers`.

---

### Task P11-T3: Building a graph on the device, and the simple symmetric graph every later task runs on

> **2026-09-26:** go. No figure of its own: triangles and label propagation run on the simple symmetric graph it builds, and Louvain's contraction needs it whenever Louvain is built.

**Depends on P11-T1 and on design phase P4 (the histogram, the scan and the stable radix sort). Does NOT depend on the traversal phase. Blocks P11-T5, P11-T10 and P11-T11; P11-T8 and P11-T9 consume its output too.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 6 row 10 line 1577 (`cooToCsr`: histogram by source, scan, scatter with cursors, and the note that Louvain's contraction sorts the arcs first so the rows come out sorted); design 6 row 5 line 1572 (the histogram and its cursor scatter); design 6 row 6 line 1573 (the stable radix sort); design 8.6 (contraction on the device by sort, segmented reduce and this primitive); design 13 row P11's first gate item.

**Files:**
- Create: `$PKG/src/wgsl/coo-emit.wgsl.ts`, `$PKG/src/wgsl/run-flags.wgsl.ts`, `$PKG/src/wgsl/coo-scatter.wgsl.ts`
- Create: `$PKG/src/primitives/coo-to-csr.ts` (`prepareCooToCsr` and `prepareSimpleSymmetric`)
- Modify: `$PKG/src/kernels.ts` (**PD-2 and PD-3 live here**)
- Modify: `$PKG/src/memory/residency.ts` (the `coo` view stops throwing; `mate` keeps its refusal)
- Create: `$PKG/test/oracle/coo.ts`, `$PKG/test/primitives/coo-to-csr.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts`, `$PKG/test/helpers/sabotage.ts`

**Interfaces produced:** `prepareCooToCsr(scope: ReduceScope): Promise<CooToCsrPlanner>` with `record(pass, { src, dst, weights, count, n, out })`, and `prepareSimpleSymmetric(scope)` with `record(pass, { edgeList, partition, n, selfLoops, out })`. `out` carries the graph (`rowPtr`, `colIdx`, `weights`, the per-node self-weight when `selfLoops: "separate"`) AND the map back to what the arcs came from: `sourceStart` and `sourceOf`, described in Step 4 item 5.

- [ ] **Step 1: PD-2 -- how nine tasks share one registry file**

`src/kernels.ts` declares `KernelId` as a closed union of seventeen ids and freezes `REGISTRY`. Nine tasks of this phase append to it -- P11-T3, P11-T4, P11-T5, P11-T6, P11-T7, P11-T8, P11-T9, P11-T10 and P11-T11 -- and no two of them may hold that file at once. The rule for each: add the new ids to the END of the `KernelId` union, add the entries to the END of `REGISTRY`, add `"P11"` to the `phase` union of `KernelEntry` ONCE -- whichever task reaches the file first does it and the rest find it already there -- and never renumber or rename an existing id. `test/kernel/bind-group-budget.test.ts` and the compile matrix pick the entries up from the registry with no further edit.

What is serialised is the EDIT, not the task. P11-T4 needs neither upstream branch, runs against master and is written in parallel with this one (section 0.3), so in practice it reaches the registry BEFORE this task does and adds the `"P11"` member itself; this task then finds it already there. Whichever of the two arrives first adds it once and the other does not -- that is the only coordination the two need, and it is why the registry is described here as a lock rather than as an ordering.

- [ ] **Step 2: PD-3 -- the fifteen P11 kernel ids and their binding counts**

State the whole table here so every later task has one place to check its count against design 8.10, and so the descriptor test of design 11.3 has a per-kernel expectation rather than a promise.

| Id | Task | Storage bindings | Design 8.10 row |
| --- | --- | --- | --- |
| `coo-emit` | P11-T3 | edgeSrc, edgeDst, edgeWeight, map, outSrc, outDst, outWeight, counters (8) | -- (a primitive); `map` is the identity for the symmetric build and the community array for a contraction |
| `run-flags` | P11-T3 | keysA, keysB, flags (3) | -- ; marks the first element of each run of equal key pairs, and is also the dense community renumberer of P11-T11 |
| `coo-scatter` | P11-T3 | src, dst, weight, rowPtr, cursors, colIdx, outWeight (7) | -- ; design 6 row 10's cursor scatter. Under `SORTED_INPUT` the `cursors` binding is a dummy and the count is 6; the descriptor test asserts 7, the maximum over the override |
| `mst-best` | P11-T4 | edgeSrc, edgeDst, edgeWeight, comp, bestKey, bestEdge, counters (7) | -- ; one body, `PASS` override, recorded twice |
| `mst-link` | P11-T4 | bestEdge, edgeSrc, edgeDst, comp, counters (5) | -- |
| `group-by-key-row` | P11-T5 | rowPtr, colIdx, weights \| dummy, keyIn, hashRegion, bestKey, bestScore (7) | -- (a primitive); the row set and the counters are words of one counters block |
| `lpa-step` | P11-T6 | rowPtr, colIdx, weights \| dummy, labelsIn, labelsOut, hashRegion, counters (7) | "Label propagation", 7 |
| `kcore-mark` | P11-T7 | frontierIn, counters, coreness, removed (4) | -- (the first of PD-5's two dispatches) |
| `kcore-peel` | P11-T7 | rowPtr, colIdx, count (atomic), removed, frontierIn, counters, frontierOut (7) | "k-core peel", 7 |
| `orient-flags` | P11-T8 | rowPtr, colIdx, degree, flags (4) | -- (the oriented arc list's producer) |
| `tri-intersect` | P11-T8 | rowPtr, colIdx, orientedArcs, counts (atomic), partials, support (6) | "Triangle intersection", 6 -- `orientedCount` is a word of the counters block; `support` is present only under the `WITH_SUPPORT` override, is `orientedCount` entries long and is indexed by oriented arc, not by logical edge (PD-17) |
| `tri-coefficient` | P11-T8 | counts, degree, coefficient, partials (4) | -- (the epilogue of DEP-P11-C) |
| `truss-peel` | P11-T9 | support, edgeMask, counters (3) | -- |
| `louvain-move` | P11-T10 | rowPtr, colIdx, weights, community, vertexWeight, clusterWeight, bestMove, hashRegion (8) | "Louvain move", 8 |
| `louvain-modularity` | P11-T10 | rowPtr, colIdx, weights, community, partials (5) | -- (design 8.6's "modularity by an edge reduce") |

Two rules make this table an expectation the descriptor test can assert rather than a copy of design 8.10. First, every counter this phase keeps on the device -- the emitted arc count, the frontier counts, the move count, the changed flag, the oriented arc count, the peel round -- is a word of ONE `StructureCounters` block per driver, declared `array<atomic<u32>>`, so a kernel that touches any of them binds `counters` once. Storage counters cannot be split into per-word bindings even if that were wanted: `Kernel.bind` rejects a binding whose offset is not a multiple of 256 bytes (`src/kernel/kernel.ts`, `STORAGE_ALIGN`), and a four-byte word is not 256-aligned. Second, `louvain-move` sits at exactly 8 and stays there only because the alternating direction flag, the gain floor and the resolution are uniform fields, not buffers, which design 8.10 states and P11-T10 must honour. The descriptor test asserts the count in this table's third column.

Where design 16.4's arc mask applies (every kernel of the structural family), it is a ninth declaration only in the sense that it occupies a group 3 slot under a `HAS_MASK` override; the tri-intersect row is the tightest at 6 and has room.

- [ ] **Step 3: The primitive, which is a histogram, a scan and a scatter**

`prepareCooToCsr` records: `histogram(src, count, n) -> degrees`, `exclusiveScan(degrees, n) -> rowPtr`, then `coo-scatter`, which has TWO modes under a `SORTED_INPUT` override, and choosing between them is the whole of this step.

`SORTED_INPUT == false` is design 6 row 10's scatter verbatim: `rowPtr` is copied into `cursors`, and every invocation takes one arc, reserves its slot with `atomicAdd(&cursors[src], 1u)` and writes `colIdx` and the weight there. The atomic hands slots out in whatever order the invocations race, so the order inside a row is the order the cursors happened to run in. It is NOT deterministic, it does NOT preserve the order the arcs went in, and a row is therefore NOT sorted by target even when the input was -- which is exactly what design 6 row 10 warns about.

`SORTED_INPUT == true` is the mode every caller in this phase uses, and it exists because sorting the arcs first is not by itself enough to make the rows come out sorted. When the input arcs are already ordered by source, arc `i` belongs to source `src[i]` and every earlier arc of that source sits immediately before it, so the arc's output slot is `i - rowPtr[src[i]]` -- its own global index minus its row's start, computed from arrays the scatter already binds. No cursor is read, no atomic is taken (`coo-scatter` drops to six bindings in this mode), the write is a pure function of the input, and the order inside a row is exactly the input order. That is what makes the rows sorted by target: not the sort alone, and not the cursor, but the sort plus a scatter that preserves it.

The precondition is real and the kernel asserts it rather than trusting it: under `SORTED_INPUT` the body also checks `src[i] >= src[i - 1]` and sets a device flag when it does not, which the driver turns into `E_INTERNAL`. The primitive's JSDoc states both modes and says in one sentence that a caller who passes unsorted arcs, or who passes sorted arcs with `SORTED_INPUT` false, gets a graph whose rows are unsorted and whose triangle intersection is then silently wrong.

- [ ] **Step 4: PD-4 -- the simple symmetric graph, which is the contraction under the identity partition**

Triangles, k-truss, label propagation and Louvain are all defined over an undirected graph with no parallel arcs, and none of the fixtures guarantees one: the snapshot may be directed, it may carry parallel edges, and it may carry self-loops. `prepareSimpleSymmetric` builds that graph on the device, and it does it with the same four steps a Louvain contraction needs, which is why there is one chain and not two:

1. `coo-emit` reads the logical edge list (`edgeList()` through the residency, which P7 already uploads) and writes TWO arcs per edge -- `(map[u], map[v], w)` and `(map[v], map[u], w)` -- skipping an arc whose two mapped endpoints are equal when `selfLoops: "drop"`, or diverting its weight into a per-node self-weight array when `selfLoops: "separate"`. `map` is the identity for the level-0 build and the community array for a contraction; that one override is the whole difference between the two callers.
2. `radixSort` by target, then `radixSort` by source (both stable, 32-bit keys, arc index as the value): two passes order the arcs by the pair, and stability is what makes the second pass preserve the first (PD-12 states the same rule for the contraction because it is the same code).
3. `run-flags` marks the first arc of each run of equal pairs; `exclusiveScan` over the flags gives each run an index; `compact` -- from the traversal phase when it is present, and a local scatter over the same scan when it is not, which is the ONE place this task must not take a dependency it does not need -- yields the unique arc list, and a `segmentedReduce` over the run boundaries sums the merged weights.
4. `prepareCooToCsr` over the unique, pair-sorted arcs, with `SORTED_INPUT` true. The arcs went in ordered by (source, target) and Step 3's sorted-input scatter writes each one at its own index minus its row's start, so the input order survives into the row and the rows come out sorted by target. Both halves are needed -- the sort without the sorted-input scatter gives unsorted rows, because the cursor mode hands slots out in race order. Assert the result, do not assume it: Step 6's test checks sortedness directly, because the entire triangle family depends on it.

5. The map back, which costs nothing here and is unbuildable later. The merge in item 3 collapses a run of input arcs into one output arc, so every output arc already KNOWS the run it came from: the scan of the run flags gives each run its output index, and the radix sorts of item 2 are key-value and already carry each arc's input index as its value. Emit that as two arrays beside the graph -- `sourceStart`, the run boundaries in the sorted input order (one entry per output arc plus a terminator), and `sourceOf`, the input arc index at each position. For the level-0 build, where `coo-emit` read the logical edge list and wrote two arcs per logical edge, the logical edge of input arc `j` is `j / 2`, so a device arc expands to every logical edge that merged into it with one gather and no extra kernel.

This exists because of what it is NOT. The arcs of this graph are not the snapshot's arcs: `coo-emit` doubles each edge, the merge collapses parallel arcs, and `selfLoops` drops or diverts some. Design 8.5's "per-edge support written through `edgeToArc`" names the SNAPSHOT's permutation (`graph-format/src/types/snapshot.ts` line 472), which does not describe this graph at all, and k-truss's result is specified in logical edge indices (DEP-P11-B). Without these two arrays that result is not addressable, and after the merge has run the information is gone. P11-T9 Step 3 is the only consumer; P11-T8 needs nothing from it (PD-17).

The result, map included, is registered in the residency against the snapshot so a second triangle call on the same snapshot reuses it, on the path the personalization vector already uses.

- [ ] **Step 5: The `coo` view**

`residency.view(s, "coo")` throws today with "the coo view is not uploaded before P11". This is P11: make it upload, and leave `mate` refusing with a message that no longer names this phase.

- [ ] **Step 6: The reference and the differential suite**

`test/oracle/coo.ts` is graph-format's own `fromEdgeArrays`, which is the reference design 6 row 10 names. The suite: build a graph on the device from each fixture's edge arrays and compare `rowPtr`, `colIdx` and the weights against the snapshot graph-format builds from the same arrays, at sizes 0, 1, a single self-loop, a graph with an isolated vertex, a graph whose last vertices all have degree zero (the trailing-zeros case a scan gets wrong), `karate`, `grid10`, `parallel` and `rmatEdges(16, 10, 1)`. Then the gate's own item, verbatim: hand the device output to `fromCsr(...)` and call `validate({ level: "full" })`, which is a check nothing in this package can fake. Then the two scatter modes, tested apart, because they promise different things:

- `SORTED_INPUT` true, which is what every caller in this phase uses: rows sorted by target (the assertion of Step 4), and the run-twice bitwise check on `rowPtr` AND on `colIdx` and the weights directly. This mode is a pure function of its input, so anything less than bitwise equality on the raw arrays is a bug.
- `SORTED_INPUT` false: the run-twice bitwise check on `rowPtr` only (a histogram and a scan are deterministic), and on each row only after sorting it, since the cursor order is not. Also assert that this mode's rows are NOT sorted on a fixture whose arcs went in sorted -- a test that fails the day someone "fixes" the cursor mode into the sorted one and leaves two modes that do the same thing.
- One more, which is the trap the two modes exist for: run `SORTED_INPUT` true on deliberately UNSORTED arcs and assert the driver raises `E_INTERNAL` from the precondition flag of Step 3, rather than returning a graph with scrambled rows.

- [ ] **Step 7: The sabotage rows (at least three per kernel, design 13 rule (f))**

Three per kernel is not a target but a test: `test/sabotage/coverage.test.ts` asserts that every non-exempt kernel of a phase listed in `SABOTAGE_PHASES` has at least three rows, and the exempt list is itself pinned to exactly `fill`, `fa2-to-scene` and `wcc-sample`, so a P11 kernel cannot be excused. A row is a textual edit of the KERNEL BODY -- a unique `find` string replaced by a `replace` -- so a thing the driver does wrong is not expressible as a row and is a test of its own instead. Count body edits, not good ideas.

- `coo-emit` (3): only one direction emitted (an undirected result becomes directed and every triangle count halves); the self-loop guard inverted; the map applied to the source only. A fourth arrives with P11-T11.
- `run-flags` (3): the comparison uses one key of the pair instead of both (parallel arcs stop merging); the first element not marked (the first run is lost); the flag written for the LAST element of a run instead of the first (every run index is off by one and the merged weights land on the wrong arc).
- `coo-scatter` (4): the cursor increment made non-atomic (arcs overwrite each other, cursor mode); the cursor seeded from `rowPtr[src + 1]` instead of `rowPtr[src]` (every row writes into the next, cursor mode); under `SORTED_INPUT`, the slot computed as the raw index `i` rather than `i - rowPtr[src]` (every row but the first writes past its end); and the sorted-input precondition check inverted, so unsorted arcs are accepted silently and the rows come out scrambled -- the row that proves Step 3's flag is not decoration.

Each must fail `test/primitives/coo-to-csr.test.ts`, and `test/sabotage/coverage.test.ts` will assert each `find` string occurs exactly once in the live body.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/coo-to-csr.test.ts` then the same with `$GPU_NV`.
Expected: PASS on both; `rowPtr` bitwise identical between the two adapters (design 11.5).

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): build a graph on the device from an edge list`.

---

### Task P11-T4: The minimum spanning tree -- the first working algorithm of the phase

> **2026-09-26:** go, and the best-earning task in the phase: crossover 6.0k nodes in Chromium (11k on a Tesla T4), 1.8x / 10.4x / 43x at 10k / 100k / 1M against indexed Kruskal (1.7x / 8.0x / 18x if the two atomicMin passes run at the scatter rate rather than the gather rate). Syncs are 61% of the 100k call, so add a rounds-per-submit constant: 4 rounds per submit gives 2.8x / 17x / 54x and a 4.6k crossover.

**Depends on P11-T1 and P11-T2. Does NOT depend on design phase P4 or on the traversal phase: it runs against master and does not wait for either branch. The one file it shares with P11-T3 is `src/kernels.ts`, which PD-2 says is held by one task at a time. Because this task can start today and P11-T3 cannot start until the grid branch merges, this task normally reaches the registry first -- so IT adds `"P11"` to the `phase` union of `KernelEntry`, and P11-T3 finds it already there. If the order comes out the other way, the one that arrives first adds it; nothing else about either task changes.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.5's last paragraph (Boruvka: the per-component minimum by a TWO-PASS `atomicMin` -- weight bits first, then the minimum edge index among ties -- and union by Afforest's compress, because no 64-bit packed atomic exists in WGSL); design 8.3 (the Afforest compress this task reuses); design 9.7 line 3277 (`totalWeight` within 1e-5, identical edge set on distinct weights); design 3.3 line 808.

**Files:**
- Create: `$PKG/src/wgsl/mst-best.wgsl.ts`, `$PKG/src/wgsl/mst-link.wgsl.ts`
- Create: `$PKG/src/algorithms/mst.ts`
- Modify: `$PKG/src/kernels.ts`
- Create: `$PKG/test/algorithms/mst.test.ts`
- Modify: `$PKG/test/helpers/sabotage.ts`
- NOT touched: `$PKG/src/wgsl/wcc-compress.wgsl.ts` -- this task CALLS it and changes nothing in it

- [ ] **Step 1: PD-6 -- the order-preserving key, and why the raw bit pattern is wrong**

`atomicMin` exists for `u32` only, so a float minimum is a minimum over bit patterns. For non-negative f32 the bit pattern orders correctly, which is why the traversal phase's distances can use it directly. Edge weights are not guaranteed non-negative: the snapshot flag `nonNegativeWeights` exists precisely because a weight may be negative, and a minimum spanning tree over negative weights is perfectly well defined. The transform is the standard one and it belongs in the prelude beside `INVALID_INDEX`, not copied into two bodies:

```
key = bits ^ select(0x80000000u, 0xFFFFFFFFu, (bits >> 31u) == 1u)
```

For a non-negative float this flips the sign bit, putting it above every negative; for a negative float it inverts every bit, reversing the order of the magnitudes, which is what makes the more negative value the smaller key. The inverse is applied when the weight is read back. A test in `test/kernel/prelude.test.ts` asserts the transform is monotone over 10,000 sampled floats spanning both signs, zero and both infinities -- the cheapest possible check of the one line the whole algorithm's correctness rests on.

- [ ] **Step 2: PD-7 -- the two passes, and why there is only one of them in the file**

Each round, over `edgeList().src / .dst / .weights` (each logical edge once, which is correct for directed and undirected alike, design 10.1):

- Pass 1: for an edge whose endpoints are in different components, `atomicMin(&bestKey[comp(u)], key)` and the same for `comp(v)`.
- Pass 2: for the same edges, if `key == atomicLoad(&bestKey[comp(u)])` then `atomicMin(&bestEdge[comp(u)], edgeIndex)`, and the same for `comp(v)`.

Two passes because no atomic in WGSL can compare one 32-bit word and write another. The tie-break on the minimum edge index is what makes the result deterministic on a graph with tied weights, and it is also why the second pass reads `bestKey` with `atomicLoad` rather than as a plain array -- mixing atomic and plain access to one variable is the compile error the gate names.

Both passes are ONE body with a `PASS` override and two registry instantiations, the way `segmented-reduce` carries its tier override, because the two are the same loop with a different two-line tail and a reader should be able to see that.

- [ ] **Step 3: The hook, the cycle and the compress**

`mst-link` reads each component's `bestEdge`, appends it to the result edge list through one `atomicAdd` on the counters block, and points the component at the other endpoint's component. Two components that chose each other form a two-cycle and would both point away; the rule is that the component with the LOWER id keeps its own label, which breaks every two-cycle without a second pass and is why the edge is appended by the higher of the two only -- otherwise the same edge lands in the result twice. Then pointer jumping: `wcc-compress`, the kernel `src/algorithms/components.ts` already uses, recorded unchanged.

Eight rounds per submit with the counters block read back once per submit; a round in which no component found a best edge ends the loop. The round count is `O(log n)` -- twenty rounds covers a million vertices -- so the loop terminates long before any cap, and the cap exists only so a bug cannot hang the device.

- [ ] **Step 4: The differential suite**

Against `kruskalOracle` from P11-T2, on the fixture list of design 11.3: the empty graph, one node, one self-loop (a self-loop is never in a spanning tree, and the driver must skip it rather than count it), `karate`, `grid10`, `path1k`, `star200`, `complete6`, `random1k`, `parallel` (parallel edges with different weights -- the tree takes the cheaper), `isolated` (a forest, so the result spans components and has `n - componentCount` edges, not `n - 1`), and a fixture with deliberately negative weights. For each: `totalWeight` within the derived tolerance against the f64 reference and the EDGE SET identical when the fixture's weights are distinct; when they are not, assert only that the result is a spanning forest of the same total weight. Plus the run-twice bitwise check on the sorted edge list, `validate({ checksum: true })` on the snapshot afterwards, and the masked-equals-filtered differential of design 16.4 item 6 when the traversal phase's mask machinery is present (skip with a named reason when it is not, and P11-T14 turns the skip into a test).

- [ ] **Step 5: The sabotage rows -- four on `mst-best`, three on `mst-link`**

Both bodies are non-exempt kernels of a listed phase, so each needs three of its own; the split matters because the earlier draft of this task wrote five rows that were almost all on `mst-best`.

`mst-best` (4): the order-preserving key replaced by the raw bit pattern (passes on every non-negative fixture and fails only on the negative-weight one, which is why that fixture exists); the tie-break tail of `PASS == 1` dropped, so a graph with tied weights returns a non-tree; the different-component guard removed, so an edge inside a component competes to be its own minimum; `atomicLoad` on `bestKey` in the `PASS == 1` tail replaced by a plain read (a compile error on both runtimes, which is the gate's mixed-access item proving itself).

`mst-link` (3): the two-cycle rule inverted, so both components point away and the forest never merges; the self-loop guard removed; the append taken by the LOWER of the two components as well as the higher, so every merged edge lands in the result twice and `totalWeight` doubles -- the mutation that proves Step 3's "appended by the higher of the two only" is load-bearing.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/mst.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; the edge set bitwise identical between the two adapters.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): a minimum spanning tree by Boruvka's two-pass minimum`.

---

### Task P11-T5: The per-row group-by-key primitive

> **2026-09-26:** go, and MEASURE IT FIRST: time the primitive alone at 100k on the card before P11-T6 is written. Its per-arc rate is assumed at 0.30 ns and bracketed at 1.3 ns (the published nu-LPA rate discounted to this card); no WebGPU number exists, and it decides label propagation's margin (21x or 6.9x at 100k) and whether Louvain is ever worth building.

**Depends on P11-T1 and P11-T3. Blocks P11-T6 and P11-T10.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.6's first paragraph (rows of at most 256 arcs sort their keys in workgroup memory at 2 KiB per row; larger rows use a global open-addressing hash region sized `2 x degree`); design 6 row 3 (the tier mechanism and the value-snippet shape `segmentedReduce` already uses); design 8.10 rows "Label propagation" and "Louvain move".

**Files:**
- Create: `$PKG/src/wgsl/group-by-key-row.wgsl.ts`
- Create: `$PKG/src/primitives/group-by-key.ts`
- Modify: `$PKG/src/kernels.ts`
- Create: `$PKG/test/oracle/group-by-key.ts`, `$PKG/test/primitives/group-by-key.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts`, `$PKG/test/helpers/sabotage.ts`

**Interfaces produced:** `prepareGroupByKeyRow(scope, { score })` returning a planner whose `record(pass, { graph, keyIn, rows, out })` writes, for every row, the key with the best score and that score.

- [ ] **Step 1: What the primitive computes, stated once so two callers can read it**

For one vertex `v`, walk its arcs; each arc carries a key (`keyIn[neighbour]`) and a weight. Sum the weight per distinct key, then pick the key whose SCORE is highest, where the score is a caller-supplied snippet over `(key, summedWeight, row)`. Ties go to the LOWEST key. Label propagation's snippet is `summedWeight` itself, so the answer is the weighted mode of the neighbours' labels. Louvain's snippet is the modularity gain of moving `v` into that community, which needs two more arrays and is why that caller has its own kernel rather than a snippet on this one (P11-T10 Step 1 says why).

The lowest-key tie-break is not decoration. It is what makes the result independent of the order the arcs were visited in, which is what makes the whole family bitwise reproducible (PD-9, PD-14) on a device where nothing guarantees that order.

- [ ] **Step 2: The two tiers, and the trap in the small one**

`TIER` override: 0 = workgroup, for rows of at most `GROUP_ROW_WORKGROUP_MAX` arcs; 1 = global hash, above it. The row set for each tier comes from `degreeTiersOf(residency.view(s, "degreeOrder"))` whose `segmentOffsets` is `[0, hiEnd, midEnd, lowEnd, n]`, the same helper the attraction kernel's tiers use.

Tier 0 loads the row's keys and weights into workgroup memory (256 `u32` plus 256 `f32` = 2 KiB), sorts by key with a workgroup bitonic sort, sums adjacent equal keys and reduces to the best. The trap is the one that costs hours in this package every time: the guarded load (`if (i < degree)`) must write into a local, and the sort's barriers must run UNCONDITIONALLY afterwards, because `workgroupBarrier` inside a guard is rejected by Tint with "must only be called from uniform control flow". Write the load as `let k = select(INVALID_INDEX, keyIn[colIdx[base + i]], i < degree);` and sort all 256 lanes, with the sentinel sorting last.

Tier 1 hashes into a region of `2 x degree` slots taken from the pool, with linear probing and a fully parenthesised hash expression (the WGSL convention, and a real bug in a package where an unparenthesised shift once changed a hash's meaning). The slot's key is claimed with `atomicCompareExchangeWeak` in a BOUNDED loop -- WGSL 17.8.5 permits a spurious failure, so the loop retries a fixed number of times and sets a device flag if it exhausts, which the driver turns into `E_INTERNAL` rather than a silently wrong answer. Weights accumulate as `u32` fixed point at a scale the driver computes from the row's total weight, because there is no float atomic; the fixed point is exact for the integer weights every unweighted fixture produces and its error on weighted fixtures is a noise-floor row, not a guess.

- [ ] **Step 3: The reference and the differential suite**

`test/oracle/group-by-key.ts` is a `Map` per row. The suite runs both tiers over: a row of length 0, 1, 255, 256, 257 and 10,000; all keys distinct; all keys equal; two keys tied on weight (the lowest must win, asserted explicitly and on both tiers); a row whose weights span six decades. Then the agreement assertion that matters: force TIER 0 and TIER 1 on the same fixture through the override matrix and assert the outputs are bitwise identical, which is the only way the two tiers can be trusted not to disagree on a graph that straddles the threshold.

- [ ] **Step 4: The sabotage rows**

The tie-break reversed (highest key wins -- the result stays plausible and the run-twice check still passes, so the test that catches it is the explicit tie fixture, which is why that fixture is not optional); the bitonic sort's compare direction flipped on the last stage; the hash probe stepping by a constant that shares a factor with the region size (a row whose keys collide never terminates, caught by the bounded loop's flag); the accumulate performed non-atomically in tier 1; the workgroup barrier moved inside the guard (a compile failure on both runtimes).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/group-by-key.test.ts` then `$GPU_NV`, then `GRAPHTY_GPU_NO_SUBGROUPS=1` with each.
Expected: PASS everywhere; the two tiers bitwise identical on every shared fixture.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): the per-row group-by-key primitive`.

---

### Task P11-T6: Label propagation

> **2026-09-26:** go, provided the changed-count readback is batched: at 8 passes per submit the crossover is 2.3k nodes in Chromium and the speedup 4.4x / 21x / 97x at 10k / 100k / 1M against a typed-array port (3.0x / 6.8x / 24x at the pessimistic group-by rate); at one readback per pass Chromium pays 101 x 2 ms of syncs and the 10k call is 0.86x. The cadence constant is not optional.

**Depends on P11-T5 and P11-T2.**

**Spec:** design 8.6's first paragraph (the weighted mode of neighbour labels, synchronous updates with the alternating direction rule, a changed-count reduce every k); design 9.7 line 3278 (parity is planted-partition recovery, because label propagation is tie-nondeterministic on the CPU too); design 3.3 line 807; design 8.10 "Label propagation" (7 bindings).

**Files:** Create `$PKG/src/wgsl/lpa-step.wgsl.ts`, `$PKG/src/algorithms/label-propagation.ts`, `$PKG/test/algorithms/label-propagation.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: The step.** `lpa-step` is the grouping of P11-T5 with the label-propagation snippet and two additions: it writes `labelsOut[v]` and, when the new label differs from the old, adds one to a `changed` word of the counters block through a workgroup-aggregated atomic -- one atomic per workgroup, not one per vertex, the discipline every counter in this package follows. Synchronous updates mean `labelsIn` and `labelsOut` are two buffers with a host-side flip between two cached bind-group sets, never two ranges of one buffer: `Kernel.bind` compares access modes before it tests ranges and rejects one buffer bound read-only and read-write in one dispatch even for disjoint ranges.
- [ ] **Step 2: The direction rule.** Design 8.6 names cuGraph's swap-avoidance rule: a vertex moves only when the move's direction matches a flag that alternates each iteration, which is what stops two adjacent vertices trading labels forever on a bipartite graph. The flag is a uniform field. A test on a path of even length -- the graph where the oscillation actually happens -- asserts convergence within the iteration cap with the rule on, and a deliberate non-convergence with it forced off, which is the only way to prove the rule does anything.
- [ ] **Step 3: The host loop.** The label array starts as the identity. Iterations run in batches with the changed count read back once per batch; the run stops when the count is zero or `maxIterations` is reached, and the result reports which. Labels are renumbered on readback with graph-format's `renumberPartition` so `groups()` is in first-seen order and matches the CPU package's convention exactly, the same path connected components already takes.
- [ ] **Step 4: The differential suite.** The gate item verbatim: on ten seeds of `plantedPartition`, the adjusted Rand index against the planted labelling is at least 0.9. Plus: on a disjoint union of complete graphs every component is exactly one community; on a single complete graph the result is one community; on the empty graph and on the one-node graph the result is well formed; on `karate` the modularity of the result is above 0.35 (a weak but non-vacuous floor that catches a kernel that returns the identity labelling). Plus the run-twice BITWISE check on the labels (PD-9 -- this is the claim that makes the phase's nondeterministic-looking algorithm testable), the cross-adapter comparison, and the masked-equals-filtered differential.
- [ ] **Step 5: Three sabotage rows** on the step body: the changed count never incremented (the loop stops after one iteration and the labels are the identity's neighbours); the label read from `labelsOut` instead of `labelsIn` (asynchronous updates, which converge to something plausible and different -- caught by the bitwise run-twice check, not by the recovery score); the direction rule dropped (the even path oscillates).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/label-propagation.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; labels bitwise identical between the two adapters.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): label propagation on the GPU`.

---

### Task P11-T7: k-core by peeling

> **2026-09-26:** DEMOTED behind the CPU port. Against an indexed port it is 0.15x / 0.82x / 4.0x at 10k / 100k / 1M in Chromium (46 peel rounds x 0.23 ms is 10.6 ms of a 28 ms call at 100k, and the rounds scale with the graph's degeneracy); the 25x it shows against the shipped code belongs to the missing port. Build the port first; revisit with the port's measured time.

**Depends on P11-T2 and on the traversal phase's `Frontier`, `advance` and `compact`.**

**Spec:** design 8.5's first paragraph (counts start at degree; rounds of "frontier of vertices with count below k", neighbour counts decremented atomically, compaction, k raised when the frontier empties, `O(max core)` host-visible rounds batched 32 per submit); design 8.1 line 2568 (k-core peeling is a member of the frontier family and reuses its machinery unchanged); design 9.7 line 3276 (`coreness` exact); design 3.3 line 805; design 8.10 "k-core peel".

**Files:** Create `$PKG/src/wgsl/kcore-mark.wgsl.ts`, `$PKG/src/wgsl/kcore-peel.wgsl.ts`, `$PKG/src/algorithms/kcore.ts`, `$PKG/test/algorithms/kcore.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`. NOT touched: anything under `src/primitives/` -- this task CALLS the traversal phase's frontier and compaction and adds nothing to them.

- [ ] **Step 1: PD-5 -- two dispatches per round, and the claim that makes the queue exact**

`count[v]` starts at the degree and is `array<atomic<u32>>`. A round at the current k:

- `kcore-mark`, over the frontier: write `coreness[v] = k` and `removed[v] = 1`. Nothing else.
- `kcore-peel`, over the arcs of the frontier through the traversal phase's `advance`: for each neighbour `u` that is not removed, `let old = atomicSub(&count[u], 1u); if (old == k + 1u) { append u to the next frontier; }`.

Both halves matter. The mark must precede the peel because two adjacent frontier vertices would otherwise decrement each other and a removed vertex would re-enter the queue. And `old == k + 1` is the exactly-once claim: a vertex whose count falls from `k + 3` to `k` is decremented three times and only the last decrement observes `k + 1`, so it is appended exactly once. Any other test -- `old <= k + 1`, or a post-read of the new value -- appends it more than once or not at all. This is the same shape as the traversal phase's `atomicMin` claim and for the same reason: a single atomic read-modify-write whose returned value identifies a unique winner needs no compare-exchange and no retry loop.

When the frontier empties, k rises by one and the next frontier is every remaining vertex whose count is at or below the new k, produced by a flags pass and the traversal phase's `compact`. `maxCore` is the last k at which anything was removed.

- [ ] **Step 2: The host loop.** `KCORE_ROUNDS_PER_SUBMIT` rounds per submit with a four-byte readback of the counters block per submit. A round with an empty frontier is a no-op through the device-side dispatch selector, so the loop is correct without knowing the maximum coreness in advance -- the property that selector exists for.
- [ ] **Step 3: The differential suite.** Against `kCoreOracle`, on the whole fixture list: `coreness` compared EXACTLY as typed arrays (these are `u32`, not a tolerance), `maxCore` equal, the run-twice bitwise check, `validate({ checksum: true })` afterwards, and the masked-equals-filtered differential. Plus the analytic cases the reference's own self-test uses, run here on the device: a complete graph of size s has every coreness `s - 1`, a cycle has every coreness 2, a tree has every non-leaf coreness 1, and a graph built as a `d`-core with a sparse fringe has exactly the corenesses it was built with.
- [ ] **Step 4: Six sabotage rows, three on each body, plus two driver checks that are not rows.** `kcore-mark` (3): `coreness[v]` written as `k + 1` instead of `k`; the `removed` flag not set, so a peeled vertex is decremented again in a later round; the frontier entry read as the loop index rather than through `frontierIn`, so the wrong vertices are marked on any round whose frontier is not the identity. `kcore-peel` (3): the claim test widened to `old <= k + 1`, so a vertex enters the queue several times and its coreness is written twice; the `removed` guard dropped; `atomicSub` replaced by a plain read, decrement and write, which is both a lost-update race and the gate's mixed-access compile error. Two things this task gets wrong are DRIVER mutations, not body edits, and a `Mutation` can only be a body edit -- fusing the mark dispatch into the peel (adjacent frontier vertices decrement each other) and raising k before the frontier is empty (corenesses come out one too high on a graph with a long peeling chain). Both are checked as ordinary tests in `test/algorithms/kcore.test.ts`, each with a comment saying which round of which fixture it fails on.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/kcore.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; `coreness` bitwise identical between the two adapters.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): k-core decomposition by peeling`.

---

### Task P11-T8: Triangle counting, the clustering coefficient and transitivity

> **2026-09-26:** go, gated on one measurement: 7.2x / 12.7x / 26x at 10k / 100k / 1M in Chromium if the sorted-merge step costs the assumed 0.30 ns; it stops earning at 100k above 2.7 ns per step. Time the intersection kernel's merge on the card before the differential suite is trusted as evidence that the row earns.

**Depends on P11-T3 (the simple symmetric graph) and on the traversal phase's `compact` (the oriented arc list). Blocks P11-T9.**

**Spec:** design 8.5's middle paragraph (orient arcs low-to-high degree with ties by id as a compaction of arcs, intersect rows by merge because rows are sorted by target under invariant I4, binary-search into the longer list when the degrees differ by more than a factor, `u32` atomic per-node counts, workgroup partial totals rather than one global atomic, a workgroup-per-arc tier for hub pairs); design 8.10 "Triangle intersection" (6 bindings); design 17 line 5067 (the coefficient is this kernel's epilogue); design 3.3 line 806 and DEP-P11-C.

**Files:** Create `$PKG/src/wgsl/orient-flags.wgsl.ts`, `$PKG/src/wgsl/tri-intersect.wgsl.ts`, `$PKG/src/wgsl/tri-coefficient.wgsl.ts`, `$PKG/src/algorithms/triangles.ts`, `$PKG/test/algorithms/triangles.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: The orientation, which is why this task waits for the traversal phase**

`orient-flags` writes, per arc `(u, v)`, a flag that is 1 when `(degree[v], v) > (degree[u], u)` lexicographically and 0 otherwise. The traversal phase's `compact` turns the flags into the oriented arc list. Two facts make this legal and worth stating: the comparison by degree with the id as the tie-break is a strict total order, so exactly one of each undirected pair's two arcs survives and no triangle is counted twice; and filtering a row that is sorted by target yields a row that is still sorted by target, so the oriented rows inherit invariant I4 from the simple symmetric graph without a sort. That second fact is the reason a compaction is enough and a sort is not needed, and it is also why the oriented row offsets are themselves a scan of the per-row surviving counts rather than a new build.

- [ ] **Step 2: The intersection.** One invocation per oriented arc `(u, v)`: walk the oriented rows of `u` and `v` together; every common target `w` is a triangle. Add one to `counts[u]`, `counts[v]` and `counts[w]` with `u32` atomics, and add one to a workgroup partial that a final `reduce` turns into the total -- never a single global atomic, which would serialise the whole kernel on one word. When the two degrees differ by more than `TRIANGLE_BINARY_SEARCH_RATIO`, binary-search each element of the shorter row into the longer instead of merging. A `WORKGROUP_PER_ARC` tier handles a pair whose rows are both enormous, taken from the same degree tiers every other kernel uses.

PD-17 -- the `WITH_SUPPORT` override adds THREE writes per triangle, not one, and needs no map. A triangle sits on three edges, `(u, v)`, `(u, w)` and `(v, w)`, and the support of an edge is the number of triangles it lies in, so all three are incremented -- exactly as the preceding sentence increments `counts[u]`, `counts[v]` and `counts[w]`, and for the same reason. Increment only the anchor and each edge counts just the triangles where it happens to be the anchor, the supports sum to the triangle count instead of three times it, every support sits below `k - 2` from the first round, and P11-T9 peels the graph to empty.

All three indices are already in hand, which is why no map is involved. The support array is indexed by ORIENTED ARC -- the orientation of Step 1 is a strict total order, so the oriented arc list holds exactly one entry per undirected edge of the simple symmetric graph, which makes "oriented arc" and "undirected edge" the same index space. The anchor is the invocation's own oriented arc index; the other two are the positions in `u`'s and `v`'s oriented rows where the merge found `w`, which the merge is holding when it finds it. The support array is therefore `orientedCount` entries long and the kernel binds nothing new for it. Design 8.5's "written through `edgeToArc`" describes the snapshot's permutation and does not apply: this kernel runs on the device graph P11-T3 built, whose arcs are not snapshot arcs. The translation to logical edge indices happens once, at k-truss's readback, through the map P11-T3 Step 4 item 5 emits.
- [ ] **Step 3: DEP-P11-C -- the epilogue.** `tri-coefficient` is one dispatch over the vertices: `coefficient[v] = 2 * counts[v] / (d * (d - 1))` with `d` the SIMPLE symmetric degree and the result zero when `d < 2`, plus a workgroup partial of `d * (d - 1) / 2` that a `reduce` turns into the triple count, from which `transitivity = 3 * total / triples` (zero when there are no triples). The degrees come from the simple symmetric graph built in P11-T3, not from the snapshot's `outDegree()` -- on a graph with parallel edges or self-loops those differ, and using the wrong one gives a coefficient above 1, which is the bug this sentence exists to prevent.
- [ ] **Step 4: The differential suite.** Against `triangleOracle`, on the fixture list plus the new `"triangles"` fixture: `perNode` and `total` compared EXACTLY (`u32`); `coefficient` compared against the f64 reference within the tolerance derived from the noise-floor measurement, never a chosen number; `transitivity` likewise. Analytic anchors: a complete graph of size s has every node at `(s-1)(s-2)/2` triangles, coefficient exactly 1 and transitivity exactly 1; a cycle, a star and a tree have zero everywhere; `karate`'s triangle total is a published number and is asserted against it. Plus: a directed fixture and an undirected one give the same answer (the simple symmetric build is what makes that true); a fixture with parallel edges and self-loops gives the same answer as the same graph with them removed; the run-twice bitwise check on `perNode`; the masked-equals-filtered differential; and the merge tier compared against the binary-search tier on the same fixture through the override matrix, bitwise.
- [ ] **Step 5: Nine sabotage rows, three on each of the three bodies.**

`orient-flags` (3): the tie-break on the id dropped, so two nodes of equal degree keep both arcs and their triangles double; the flag set unconditionally, so both arcs of every pair survive and every triangle is counted twice; the flag written at `arc + 1` rather than at `arc`, so the surviving set is shifted by one and some pairs keep both arcs while others keep neither. Note what is NOT a row here: reversing the comparison to high-to-low degree leaves a strict total order, still keeps exactly one arc per pair, and returns the identical answer more slowly. A mutation must break an assertion by `minFactor`, so a change that only costs time does not belong in this table -- the benchmark is where that would show.

`tri-intersect` (3): the merge advancing both cursors on a mismatch (triangles are missed, and the count is plausibly close, which is exactly why the analytic anchors matter more than the fixture comparisons here); `counts[w]` not incremented (each triangle contributes to two nodes instead of three, so the total is right and `perNode` is wrong -- a mutation that a total-only test would survive); under `WITH_SUPPORT`, only the anchor edge's support incremented instead of all three (PD-17's failure exactly: the supports sum to the triangle count instead of three times it, and k-truss peels to empty, which `test/algorithms/ktruss.test.ts` catches and `test/algorithms/triangles.test.ts` does not -- so this row names the k-truss test).

`tri-coefficient` (3): the denominator using the snapshot degree instead of the simple degree (caught only by the parallel-edge fixture); the factor of 2 dropped from `2 * counts[v]`, which halves every coefficient and is invisible to any assertion that only checks the range `[0, 1]`; the `d < 2` guard removed, so a degree-1 node divides by zero and the coefficient comes back `NaN` or `inf` rather than the defined zero P11-T1 promised in the JSDoc.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/triangles.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; `perNode` bitwise identical between the two adapters.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): triangle counting with the clustering coefficient`.

---

### Task P11-T9: The k-truss decomposition

> **2026-09-26:** DROPPED. With support recomputed every round (PD-11) it is 4.8x at 10 rounds, 1.8x at 30 and 1.1x at 50 at 100k nodes, and the round count is unbounded (RP-6). Reinstate only with incremental support maintenance, at which point it inherits the triangle row; the k-truss signature record of P11-T15 is not written until then.

**Depends on P11-T8 and on the traversal phase's edge mask machinery (design 16.4).**

**Spec:** design 8.5 ("k-truss peels edges with support below `k - 2` over an `EdgeMask` with per-edge support written through `edgeToArc`"); design 16.4 item 3 (the structural family consumes the packed arc mask through a `HAS_MASK` override and one group 3 binding); design 17 line 5068; DEP-P11-B.

**Files:** Create `$PKG/src/wgsl/truss-peel.wgsl.ts`, `$PKG/src/algorithms/ktruss.ts`, `$PKG/test/algorithms/ktruss.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: PD-11 -- recompute, do not maintain, and say what that costs**

A peeling round is: run P11-T8's intersection with `WITH_SUPPORT` over the graph masked by the surviving edges, then `truss-peel` clears the mask bit of every edge whose support is below `k - 2` and adds to a changed counter. Repeat until nothing changes. The support of an edge is recomputed from scratch each round rather than decremented when a neighbouring edge dies.

That is a deliberate simplification with a known ceiling and the driver says so in a comment: each round costs a full intersection, so a graph that peels in many rounds pays the intersection many times. The alternative -- cuGraph's incremental scheme, which on removing an edge finds the triangles it was in and decrements the other two edges of each -- is a second kernel and a second correctness argument, and this phase's gate asks only that the support be exact. The upgrade path is written beside the ceiling: if a benchmark shows the round count dominating, the incremental decrement replaces `truss-peel` and the differential suite is unchanged because it compares supports, not rounds.

- [ ] **Step 2: The mask, which already exists.** The surviving edges are an `EdgeMask`, the packed bitmap graph-format already defines (`graph-format/src/types/columns.ts` line 727), one bit per ORIENTED ARC of the simple symmetric graph rather than per snapshot edge -- the same index space the support array uses (PD-17), so `truss-peel` reads a support and clears a bit at the same index and needs no translation. The traversal phase's mask expansion turns it into the per-arc mask the intersection kernel reads through its `HAS_MASK` override, clearing both arcs of a dead edge, and it does so once per round because the mask changes each round -- which is the one place this phase pays the expansion repeatedly, and the driver's JSDoc names it as the second half of PD-11's ceiling.
- [ ] **Step 3: The result, and the one translation in this family.** `compact` over the final mask gives the surviving ORIENTED ARCS -- one per surviving undirected edge of the simple symmetric graph (PD-17) -- and the final support array, gathered through the same compaction, gives their supports in that same index space. Everything up to here is device arcs.

`GpuKTrussResult.edges` is specified in LOGICAL edge indices (DEP-P11-B), because that is what a consumer can flag through the snapshot's own edge remapping, so the survivors are translated once, on the host, at readback: `sourceStart` and `sourceOf` from P11-T3 Step 4 item 5 expand each surviving device arc to every logical edge that merged into it. On a simple undirected snapshot that expansion is one logical edge per survivor and the arrays line up one to one; on a snapshot with parallel edges one surviving device edge expands to all of them, and `support` is repeated for each, because the support is a property of the merged edge and every parallel edge lies in the same triangles. State that in the JSDoc -- a consumer who counts `edges` on a multigraph and expects `support.length` to be the number of distinct pairs is the surprise this sentence prevents. Neither array is addressable without that map, which is why P11-T3 emits it and why this step is the only place it is read.

`k` is echoed. An empty truss is a valid answer and returns empty arrays, not an error.
- [ ] **Step 4: The differential suite.** Against `kTrussOracle`: supports EXACT on every fixture at k = 3, 4 and 5; a complete graph of size s is its own `(s-1)`-truss and empty above it; a cycle has an empty 3-truss; a graph built as two complete graphs joined by one edge loses exactly that edge at k = 3. Plus the round count compared against the reference's (PD-11's own check), the run-twice bitwise check, and the masked-equals-filtered differential -- which here is a mask over a mask and is worth running for that reason alone.
- [ ] **Step 5: Three sabotage rows on `truss-peel`.** The threshold written as `support < k` instead of `support < k - 2`; the `atomicAdd` on the changed counter removed, so the host sees zero changes after the first peel, the loop stops one round early and the result is a graph that is not yet a truss; the mask cleared at the wrong bit position -- an off-by-one in the `arc / 32` and `arc % 32` arithmetic that the design's own note warns about, and one that kills a neighbouring edge rather than the intended one, so the survivor count is plausible and only the per-edge comparison catches it.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/ktruss.test.ts` then `$GPU_LLVM`.
Expected: PASS on both.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): the k-truss decomposition`.

---

### Task P11-T10: Louvain's move pass

> **2026-09-26:** DEMOTED behind the CPU port and the P11-T5 measurement. Against a typed-array port Louvain is 0.31x / 2.5x / 18x at 10k / 100k / 1M in Chromium on the optimistic model (12 syncs are 24 ms of a 33 ms call at 10k), 0.29x / 1.8x / 10x at the pessimistic group-by rate, and 0.09x / 0.16x / 0.62x on the cuGraph-derived bound; the port alone is 20x over the shipped code. The 6.0 estimated days of this task and P11-T11 wait for both numbers.

**Depends on P11-T5 and P11-T3. Blocks P11-T11. The largest single task in the phase.**

**Spec:** design 8.6's second paragraph (vertex weights by segmented reduce; the synchronous best-move pass with its gain formula; the deterministic tie-break; the move condition on both the gain and the alternating direction; cluster weights RECOMPUTED by reduce-by-key after each pass and never adjusted atomically; modularity by an edge reduce; the host reads the modularity and the move count per pass); design 16.3 (the gain floor); design 9.7 line 3279 (parity is a modularity band, not a partition); design 8.10 "Louvain move" (8 bindings).

**Files:** Create `$PKG/src/wgsl/louvain-move.wgsl.ts`, `$PKG/src/wgsl/louvain-modularity.wgsl.ts`, `$PKG/src/algorithms/louvain-level.ts` (one level only; P11-T11 adds the loop over levels); modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`; create `$PKG/test/algorithms/louvain-level.test.ts`.

- [ ] **Step 1: The gain, spelled from the design without rearrangement**

For a vertex `v` with incident weight `k`, currently in community `old`, considering community `new`:

```
delta_Q = 2 * ((wNew - wOld) / total
               - resolution * (aNew * k - aOld * k + k * k) / (total * total))
```

where `wNew` and `wOld` are the summed weights of `v`'s arcs into each community and `aNew` and `aOld` are those communities' total incident weights. The per-community sums come from the grouping of P11-T5; the community totals come from `clusterWeight`. This kernel is not a snippet on the grouping primitive because it needs two arrays the primitive does not bind (`vertexWeight` and `clusterWeight`) and would push it past eight bindings; it shares the primitive's WGSL grouping fragment through the composer instead, so the two bodies' grouping arithmetic is textually identical and a reader can diff them.

- [ ] **Step 2: PD-13 -- the gain floor.** A vertex moves only when `delta_Q > max(tolerance / n, LOUVAIN_GAIN_FLOOR)`. Design 16.3 gives the rule and the reason: below the floor a "gain" is f32 rounding noise on two nearly equal sums, and a move made on it oscillates -- the run does not converge, it thrashes. `LOUVAIN_GAIN_FLOOR` is the constant P11-T1 added and it is interpolated into the kernel by the prelude, never written as a literal in the body. The sabotage row that drops the floor must make the planted-partition test fail to converge, which is how the floor proves it is doing something.
- [ ] **Step 3: The alternating direction.** A move is taken only when its direction matches a flag that flips every pass -- the rule design 8.6 takes from cuGraph, and the same swap-avoidance idea label propagation uses in P11-T6 Step 2. Ties within a pass go to the LOWEST community id. Both together are what make PD-14 true: the pass has no float atomic, no order-dependent reduction and no unresolved tie, so its output is a function of its input and the result is bitwise reproducible on one device.
- [ ] **Step 4: The cluster weights, recomputed.** After every pass, `clusterWeight` is rebuilt from scratch: `radixSort` the vertices by community, then `segmentedReduce` their vertex weights over the runs. Never an atomic adjustment of the old value -- there is no float atomic, and an integer one would accumulate in an order the device chooses. This is the single most expensive part of a pass and the design is explicit that it is the price of determinism.
- [ ] **Step 5: The modularity.** `louvain-modularity` walks the arcs and emits two partial sums -- the intra-community weight and the sum of squared cluster weights -- that a `reduce` folds; the driver combines them with the resolution. It is compared against the f64 reference's modularity for the SAME partition, which is an exact check of the formula rather than a check of the algorithm, and it is the number the noise floor of P11-T2 Step 4 was measured for.
- [ ] **Step 6: The single-level test suite.** On `karate`, on the planted partition and on a disjoint union of complete graphs: one level's modularity is at least the f64 reference's for the same number of passes minus the derived tolerance; the modularity NEVER decreases from pass to pass (the invariant that catches a wrong gain sign without needing a reference at all); the run stops when the move count is zero; the run-twice bitwise check on the community array (PD-14); the two tiers of the grouping fragment agree; and the same three fixtures with the gain floor forced to zero fail to converge within the pass cap, which is Step 2's proof.
- [ ] **Step 7: Eight sabotage rows -- five on `louvain-move`, three on `louvain-modularity` -- and one driver check that is not a row.**

`louvain-move` (5): the factor of 2 dropped from the gain; the resolution term's sign flipped; the tie-break reversed; the gain floor replaced by zero, which must make the planted-partition test fail to converge and is Step 2's proof; the alternating direction test dropped, so two adjacent vertices swap communities forever on the even path.

`louvain-modularity` (3) -- the kernel the earlier draft of this task gave no rows at all, which would have failed `test/sabotage/coverage.test.ts` on its own. It is also the kernel whose errors are quietest, because it produces the number every other check is graded against: get it wrong and the gate's "within 0.02 of the reference" compares two wrong numbers. The three: the intra-community test `community[u] == community[v]` inverted, so the sum runs over the cut instead of the interior; the squared-cluster-weight partial emitted unsquared, which makes modularity a linear function of the degrees and still lands in `[-1, 1]`; the self-loop arc counted twice in the intra sum, the classic factor-of-two Louvain bug, caught by the complete-graph-union fixture whose modularity is known exactly. All three are measured against `modularityOf` from P11-T2 on a FIXED partition, which is the comparison that tests the formula rather than the algorithm.

One thing this task gets wrong is a DRIVER mutation and cannot be a row: adjusting the cluster weights incrementally instead of recomputing them (Step 4). The result then drifts by an amount that depends on the schedule, so the run-twice check catches it and the modularity band does not -- which is the point of having both, and it is written as an ordinary test in `test/algorithms/louvain-level.test.ts`.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/louvain-level.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; the community array bitwise identical between the two adapters.

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): the Louvain move pass`.

---

### Task P11-T11: Louvain's on-device contraction and the level loop

> **2026-09-26:** DEMOTED with P11-T10 (same numbers). Leiden and ensemble Louvain inherit the class.

**Depends on P11-T10 and P11-T3.**

**Spec:** design 8.6 ("contraction ON THE DEVICE by `radixSort` of arcs by (community src, community dst) + `segmentedReduce` + `cooToCsr`; the format's `contract()` is the CPU alternative the accelerator does not use, so the package never depends on the CPU for a level"); design 6 row 6 (the sort is stable, which is what PD-12 rests on); design 13 row P11's gate items on modularity and on every level's contraction preserving the total weight; design 3.3 line 809; design 9.7 line 3279.

**Files:** Create `$PKG/src/algorithms/louvain.ts`; modify `$PKG/src/algorithms/louvain-level.ts`, `$PKG/src/kernels.ts` (the dense-renumber instantiation of `run-flags`), `$PKG/test/algorithms/louvain-level.test.ts`; create `$PKG/test/algorithms/louvain.test.ts`.

- [ ] **Step 1: PD-12 -- sorting by a pair with a 32-bit sorter**

A contraction groups arcs by the pair `(community[src], community[dst])`, which is 64 bits, and the sort primitive takes 32-bit keys. Two stable passes give the same order as one 64-bit pass: sort by the target community first, then by the source community. Stability is what makes the second pass preserve the first, and the sort primitive's own test asserts stability, so this is a property already proven rather than one assumed here. Get the order backwards and the arcs are grouped by target, the merge sums the wrong things, and the contracted graph is wrong in a way that still validates -- which is why Step 4's total-weight check exists.

- [ ] **Step 2: The contraction, which is P11-T3's chain under the community map.** `coo-emit` with `map = community` and `selfLoops: "separate"` (an intra-community edge becomes the new node's self-weight and must be kept, because it carries weight the next level's modularity needs); the two sort passes; `run-flags` and `segmentedReduce` to merge parallel arcs by summing weights; `prepareCooToCsr`. The communities are first renumbered densely: `radixSort` the community ids, `run-flags` to mark each distinct value, `exclusiveScan` to number them, and a scatter to relabel -- the same `run-flags` body, a second instantiation, which is why P11-T3 wrote it as a general kernel rather than a parallel-arc-specific one.
- [ ] **Step 3: The level loop.** Level 0 runs on the simple symmetric graph of P11-T3. Each level runs passes until the move count is zero or `maxIterations` is reached, then contracts. The loop stops when a level produced no merges, when the modularity gain over the level is below `tolerance`, or at `LOUVAIN_MAX_LEVELS`. The final labels are the composition of the per-level partitions -- each level's map applied to the previous level's labels, done on the host at readback because it is `O(n)` once and a device pass would need a readback anyway -- then `renumberPartition` for first-seen order. `levels` and `modularity` are the reported final values.
- [ ] **Step 4: The contraction's own invariant.** After every level, the total weight of the contracted graph equals the total weight of the graph it came from, within the derived f32 tolerance. That is design 13 row P11's gate item and it is asserted PER LEVEL, not once at the end, because a level that loses weight and a later level that gains it would cancel. Self-loop weight counts once in the total on both sides -- state the convention in the assertion's message, because the off-by-a-factor-of-two here is the classic Louvain bug.
- [ ] **Step 5: The full suite.** The gate items verbatim: modularity within 0.02 of the f64 reference's on `karate` and on the planted partitions, and never below the reference's by more than 0.05 on the random fixtures. Plus: the adjusted Rand index against the planted labelling is at least 0.9 on ten seeds (a stronger statement than the modularity band and one the gate does not ask for, so a failure here is reported and does not by itself block); the run-twice bitwise check on the labels (PD-14); the empty graph, the one-node graph and a graph of isolated vertices each return one community per node with modularity zero; a disjoint union of complete graphs returns exactly those communities; the masked-equals-filtered differential; and `validate({ checksum: true })` on the snapshot afterwards.
- [ ] **Step 6: One sabotage row and one driver check.** The row is on `coo-emit`, this task's only body edit: the self-loop weight dropped at contraction -- the `selfLoops: "separate"` branch discarding the weight rather than diverting it -- which the total-weight invariant of Step 4 catches at the first level, the test that exists for it. It is `coo-emit`'s fourth row and brings that kernel to four.

Swapping the two sort passes (PD-12's failure) is a DRIVER mutation: it changes the order two `radixSort` calls are recorded in, not a line of any kernel body, so it cannot be a `Mutation` and is written as an ordinary test in `test/algorithms/louvain.test.ts` instead, asserting that the contracted graph's total weight is wrong at level 1 with the passes reversed.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/louvain.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; labels bitwise identical between the two adapters; every level's total weight preserved.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): Louvain with on-device contraction`.

---

### Task P11-T12: The accelerator members and the barrel

> **2026-09-26:** go for `minimumSpanningTree`, `triangleCount` and `labelPropagation`; `kCoreDecomposition` and `louvain` land with their demoted tasks. Routing floors for the element: MST 6.0k, triangles 3.0k, label propagation 2.3k nodes in Chromium on the reference card (11k / 4.8k / 4.0k on a Tesla T4).

**Depends on P11-T4, P11-T6, P11-T7, P11-T8, P11-T9 and P11-T11 -- every driver green.**

**Spec:** design 3.3 lines 805-809; design 9.2 (the accelerator seam, whose five optional members this phase fills); `webgpu-graph-algorithms/CLAUDE.md` step 5 of "Adding an Algorithm / a Kernel".

**Files:** Modify `$PKG/src/accelerator.ts`, `$PKG/src/types/accelerator.ts`, `$PKG/src/index.ts`, `$PKG/test/index.test.ts`, `$PKG/test/types/public-api.test-d.ts`, `$PKG/test/accelerator.test.ts`.

- [ ] **Step 1: PD-15 -- six members, no stubs.** `kCoreDecomposition`, `triangleCount`, `kTruss`, `labelPropagation`, `minimumSpanningTree` and `louvain` go on the object `createAccelerator` returns, each calling `ctx.assertReady()` first, exactly as `pageRank` does. The accelerator never carries a member that throws for being unimplemented: a member exists when its algorithm ships, and a consumer's feature detection is `typeof accel.louvain === "function"`.
- [ ] **Step 2: The seam compiles.** Five of the six are declared optional on the real `AlgorithmAccelerator` imported from `@graphty/algorithms` (`algorithms/src/indexed/accelerator.ts` lines 119-123), so `GpuAccelerator` narrows them to non-optional and the existing structural test proves the two agree. `triangleCount` compiles although the two return types differ: the seam declares `Promise<{ perNode, total }>` and this package returns those two plus `coefficient` and `transitivity`, and a wider object is assignable to a narrower one. Nothing here is broken, and nothing here delivers the coefficient to a consumer of the CPU package either -- a dispatcher typed against the seam sees only the two declared fields. Widening the seam is section 0.7 item 2, in the CPU package, and P11-T16 records whether it has happened. `kTruss` is NOT on that interface (DEP-P11-B): it is a member of `GpuAccelerator` only, reachable by calling the GPU package directly, and the type test asserts that `GpuAccelerator` still satisfies `AlgorithmAccelerator` with it present -- an extra member never breaks structural assignability, and asserting it stops a future reader from "fixing" the asymmetry by deleting the method.
- [ ] **Step 3: The barrel and its two tests.** `src/index.ts` exports the six public functions and the types from `src/types/structure.ts` and `src/types/community.ts`. `test/index.test.ts` asserts the exact value list, so the names must move from the never-exported list to the value list in the same commit -- a split commit leaves the suite red.
- [ ] **Step 4: knip must be clean here.** P11-T1's unused type exports become used at this step.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip) && eval $GPU_NV pnpm run test:node`
Expected: all clean; knip reports nothing for this package.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): the structure and community accelerator members`.

---

### Task P11-T13: The `louvain` benchmark group and T-15 on both runner classes

> **2026-09-26:** DEMOTED with P11-T10. T-15's "expected 2-10x" is withdrawn; when the benchmark runs it compares against the CPU port, and it is the only measurement that narrows the 1,000x bracket on Louvain's per-arc cost on WebGPU.

**Depends on P11-T12. Parallel with P11-T14.**

**Spec:** design 10.4 line 3420 (T-15: Louvain at 100k nodes / 1M edges and at 1M / 10M recorded end to end WITH the CPU comparison, expected 2-10x); design 8.6's expectation-management paragraph (2-10x at a million edges, not 100x, because later passes lose parallelism -- the published nu-Louvain result is that GPU Louvain is 1.03x a 64-thread CPU); design 11.7 (the baseline files and `bench:compare`).

**Files:** Create `$PKG/benchmarks/louvain.bench.ts`; modify `$PKG/benchmarks/run.ts` (one line in its group table), `$PKG/benchmarks/results/nvidia-lovelace-driver580.json`, `$PKG/benchmarks/results/gpu-linux-t4.json`, `$PKG/test/benchmarks.test.ts`.

- [ ] **Step 1: The rows.** Louvain on the two tiers T-15 names, reported as wall time around the whole call including upload, with the per-level breakdown beside it -- time in the move passes, time in the cluster-weight rebuild, time in the contraction, and the node count of each level. That breakdown is the deliverable, not decoration: design 8.6 predicts that later levels lose parallelism, and a single wall-time number cannot confirm or refute it. Also: triangle counting and k-core on the same two tiers, and the minimum spanning tree on the 1M / 10M tier.
- [ ] **Step 2: The CPU comparison T-15 requires.** Run `@graphty/algorithms`'s Louvain on the same graphs in the same process and report the ratio. The CPU package is a devDependency of the benchmark only, not of `src/`. If the ratio lands below the expected 2x, that is a finding to record, not a target to quietly relax: design 10.4's rule is that a missed target is either re-fixed by a recorded owner decision in the pull request or carried with the miss written down.
- [ ] **Step 3: Both runner classes before the commit.** Capture on the RTX 4070 SUPER locally and on the T4 lane through a labelled pull request, and land both baseline files in the same commit as the benchmark file. A baseline captured on one class and merged makes `bench:compare` fail on the other for a week.

Run: `cd $PKG && eval $GPU_NV pnpm run bench louvain && pnpm run bench:compare`
Expected: the table prints; `bench:compare` finds no tracked median above 3x its baseline.

- [ ] **Step 4: Commit (owner)** -- `perf(webgpu-graph-algorithms): the Louvain, triangle and k-core benchmarks and the T-15 baselines`.

---

### Task P11-T14: The sabotage suite, the tiers, the browser smoke and the `node-limits` tests

> **2026-09-26:** go for the algorithms that ship (the sabotage floor of 45 mutations was set for six algorithms and is re-derived for three).

**Depends on P11-T12. Parallel with P11-T13.**

**Spec:** design 11.9 items 1, 2 and 4 (sabotage, per-kernel inspection, run twice); design 6 lines 1581-1598 (the twin discipline and the three subgroup sizes); design 11.6 (the browser smoke); design 12.3 (`GRAPHTY_GPU_NO_SUBGROUPS=1`); design 13 row P11's mixed-access gate item.

**Files:** Create `$PKG/test/sabotage/structure.test.ts`, `$PKG/test/sabotage/community.test.ts`, `$PKG/test/limits/louvain-1m.test.ts`; modify `$PKG/test/browser/` (one new traversal-free smoke), `$PKG/test/noise-floor.test.ts`, `$PKG/test/kernel/compile-matrix.test.ts`.

- [ ] **Step 1: Run every mutation, and add `"P11"` to `SABOTAGE_PHASES` last.** The rows were written by the tasks that wrote the kernels, each beside the test it must break; this task runs them all and closes any gap `test/sabotage/coverage.test.ts` reports.

The arithmetic, because getting it wrong is what leaves a kernel bare. Fifteen kernels, not fourteen (the table in P11-T3 Step 2 lists fifteen). `test/sabotage/coverage.test.ts` asserts at least three rows for every non-exempt kernel of a listed phase, and the exempt list is pinned by name to `fill`, `fa2-to-scene` and `wcc-sample`, so the floor is 45 and no P11 kernel can be excused from it. The tasks as written supply 52: four each on `coo-emit` (three in P11-T3, one in P11-T11) and `coo-scatter` and `mst-best`, five each on `group-by-key-row` and `louvain-move`, and three on each of the remaining ten. Check the per-kernel counts before running anything -- adding `"P11"` to `SABOTAGE_PHASES` is what switches the assertion on, so do it as the LAST edit of this step, once every row is in place, or the suite goes red on whichever kernel is short.

Four of this phase's checks are deliberately NOT rows, because a `Mutation` is a textual edit of a kernel body and these are things a driver does: the k-core mark fused into the peel and k raised before the frontier empties (P11-T7 Step 4), Louvain's cluster weights adjusted incrementally (P11-T10 Step 7), and the contraction's two sort passes swapped (P11-T11 Step 6). Each is an ordinary test in its algorithm's suite. They are listed here so a reader counting rows against checks does not find four missing and assume they were forgotten.

A mutation that SURVIVES is a bug in the test suite and blocks the gate exactly as a failing test does -- if one survives, the fix is a better test, never a weaker mutation.
- [ ] **Step 2: The gate's mixed-access item.** The compile matrix already compiles every registry entry on both runtimes. Add the assertion design 13 row P11 asks for: for each P11 entry, the body contains no plain read of a variable it also accesses atomically. The cheap and reliable form is textual -- every name declared `array<atomic<u32>>` in a body must never appear in that body outside an `atomic*` call -- run as a lint over the registry rather than as a WGSL compile, because a compile failure names a line and this names the rule.
- [ ] **Step 3: The `inspect()` stage comparisons.** Behind `GRAPHTY_GPU_INSPECT=1`, expose the oriented arc list, the per-round k-core frontier and counts, each Louvain pass's community array and cluster weights, and each contraction's arc list before and after the merge; compare them stage by stage against the reference's own stages. This is what catches a wrong orientation that a wrong intersection happens to cancel, or a contraction that loses an arc and gains a duplicate. An end-to-end modularity comparison would average both away.
- [ ] **Step 4: The tiers at both settings.** The grouping primitive and the triangle intersection each have two tiers; run each suite with the tier forced both ways in the same process and assert bitwise-identical results, on lavapipe (subgroup size 8), SwiftShader (4) and NVIDIA (32), and with `GRAPHTY_GPU_NO_SUBGROUPS=1` on each.
- [ ] **Step 5: The browser smoke.** Add triangle counting on `karate` against the reference to the browser project -- the cheapest of this phase's algorithms and the one whose answer is a published number.
- [ ] **Step 6: The `node-limits` tests.** Louvain on a 1M-node / 10M-edge graph end to end, which is the case where a contraction's intermediate arc arrays are the largest allocation the package ever makes, and triangle counting on the same graph, where the oriented arc list is half the arcs.
- [ ] **Step 7: The noise-floor rows.** Append to `benchmarks/results/noise-floor.json`: the f32-versus-f64 modularity spread per fixture from P11-T2; the f32-versus-f64 clustering coefficient spread; the f32-versus-f64 minimum-spanning-tree total-weight spread; and the cross-adapter spread of every `u32` result in the phase (expected to be exactly zero -- record the zero, because a later non-zero is then a finding rather than a surprise).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/sabotage && eval $GPU_NV pnpm exec vitest run --project=node-limits && pnpm run test:browser:ci`
Expected: every mutation caught; limits green; browser green (a run that hit the browser-close timeout with every test passed counts as green, design 11.6).

- [ ] **Step 8: Commit (owner)** -- `test(webgpu-graph-algorithms): the structure and community sabotage matrix and the tier agreement tests`.

---

### Task P11-T15: The decision records and the design index

> **2026-09-26:** go for the triangle and `cooToCsr` records; the k-truss signature record waits with P11-T9. The design index already carries `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`.

**May run any time after P11-T3.**

**Files:** Create `$WT/design/decisions/2026-09-23-ktruss-has-a-public-signature.md`, `$WT/design/decisions/2026-09-23-triangles-carry-the-clustering-coefficient.md`, `$WT/design/decisions/2026-09-23-coo-to-csr-is-a-planner.md`; modify `$WT/design/decisions/README.md`.

- [ ] **Step 1.** One file per departure of section 0.5 that changes a design statement (B, C and D; A and E are resolved inside the design's own text and need none). Each states what the design says, what the package does, the evidence, and what would have to change to go back. Follow the shape of the records already in the directory.
- [ ] **Step 2.** Add the three to the README index.

Run: `cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-23-*.md`
Expected: no output.

- [ ] **Step 3: Commit (owner)** -- `docs: record the three structure and community departures`.

---

### Task P11-T16: The G11 gate record and the phase close

> **2026-09-26:** go. The gate record carries the routing floors and the two primitive timings (merge step, group-by) the record asked for, so the demoted tasks can be re-decided with a number.

**Last.**

**Files:** Create `$PKG/docs/decisions/G11.md`; modify `$PKG/CLAUDE.md` (the "Verified Platform Facts" section gains whatever this phase measured that a later phase would otherwise rediscover).

- [ ] **Step 1: The full green check, both adapters plus the browser.**

```
cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip)
eval $GPU_LLVM pnpm run test:node && eval $GPU_LLVM pnpm run coverage
eval $GPU_NV   pnpm run test:node && eval $GPU_NV pnpm exec vitest run --project=node-limits
pnpm run test:browser:ci
eval $GPU_LLVM GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/algorithms
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs
```

Expected: green throughout; coverage at or above 80 / 80 / 75 / 80; no non-ASCII; the default-lane wall time inside T-12's 15 minutes (record it -- this phase adds roughly eighty test cases and T-12 is the budget that says when that stops being free).

- [ ] **Step 2: Write G11.md** against design 13 row P11's gate list, item by item with its evidence, in the shape of the existing G0-G3, G5, G6 and G7 records:

| G11 item (design 13 row P11, line 4218) | Evidence |
| --- | --- |
| `radixSort` on 32-bit keys with values, and the device graph build's output passing `fromCsr(...).validate({ level: "full" })` | `test/primitives/coo-to-csr.test.ts` (P11-T3 Step 6) |
| k-core exact | `test/algorithms/kcore.test.ts` |
| Triangles exact per node and total | `test/algorithms/triangles.test.ts` |
| k-truss support exact | `test/algorithms/ktruss.test.ts` |
| Label propagation recovers planted partitions (adjusted Rand index at least 0.9) on ten seeds | `test/algorithms/label-propagation.test.ts` |
| Boruvka's total weight within the derived tolerance and the edge set identical on distinct weights | `test/algorithms/mst.test.ts` -- and note that the result is additionally bitwise reproducible, which the gate does not ask for |
| Louvain modularity within 0.02 of the reference on karate and the planted partitions, never below it by more than 0.05 on the random fixtures | `test/algorithms/louvain.test.ts` |
| Every level's contraction preserves the total weight | `test/algorithms/louvain.test.ts` (P11-T11 Step 4), asserted per level |
| No mixed atomic and non-atomic access, on both runtimes | `test/kernel/compile-matrix.test.ts` (P11-T14 Step 2) |
| The design 8.10 binding counts asserted | the descriptor test, against the table of P11-T3 Step 2 |
| T-15 recorded | `benchmarks/results/*.json`, the session named in the record |

Also record, as the design's own gate rules require: the sabotage matrix run and its count, the `inspect()` stage comparisons, every tolerance traced to its noise-floor row, the masked-equals-filtered differential per algorithm (design 16.4 item 6), any target that was missed together with the owner's decision about it, and -- per section 0.7 -- the state of the four items outside this package that stand between the clustering coefficient existing and a reader seeing it: `indexed.triangleCount` and `indexed.clusteringCoefficient` in `@graphty/algorithms`; the widening of that package's accelerator seam to declare `coefficient` and `transitivity`, which is an edit to a published interface; the algorithm class in graphty-element; and the panel entry in the graphty app. Record each as landed, in flight or untouched, with whatever issue or branch carries it.

- [ ] **Step 3: Commit (owner)** -- `docs(webgpu-graph-algorithms): the G11 gate record for structure and community`.

---

## 7. Appendices

### 7.1 The owner's command sheet, in order

```
# once, before anything
git worktree add .worktrees/webgpu-structure-community -b feat/webgpu-structure-community master
export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-structure-community
export PKG=$WT/webgpu-graph-algorithms
cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build

# the two environments every Run line uses
export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

# the per-task commit, sixteen times, with the subject the task names
cd $WT && ./tools/commit-changes.sh --dry-run
cd $WT && ./tools/commit-changes.sh
```

Every commit is scoped `webgpu-graph-algorithms` except P11-T15's, which is scoped `docs`.

### 7.2 Verification matrix

| Kernel or driver | Independent reference | Differential fixtures | Run-twice | Sabotage rows | Noise-floor row |
| --- | --- | --- | --- | --- | --- |
| `coo-emit` / `run-flags` / `coo-scatter` | graph-format's `fromEdgeArrays`, plus `fromCsr(...).validate({ level: "full" })` | sizes 0 and 1, a self-loop, an isolated vertex, trailing zero degrees, karate, grid, parallel edges, RMAT | `rowPtr`, `colIdx` and the weights bitwise under `SORTED_INPUT`; `rowPtr` only, rows bitwise after sorting, under the cursor mode | 4 + 3 + 4 = 11 (the fourth `coo-emit` row comes from P11-T11) | none (u32 and exact sums) |
| `mst-best` / `mst-link` | Kruskal in f64 | the full fixture list plus tied weights, negative weights, a forest, parallel edges | edge list bitwise after sorting | 4 + 3 = 7 | total weight, f32 versus f64 |
| `group-by-key-row` | a `Map` per row | rows of 0, 1, 255, 256, 257 and 10,000; all-distinct, all-equal, tied, six-decade weights | bitwise, both tiers | 5 | fixed-point accumulation error on weighted rows |
| `lpa-step` | synchronous label propagation with the lowest-label tie-break | ten planted-partition seeds, complete-graph union, karate, empty, one node, even path | bitwise on the labels | 3 | none |
| `kcore-mark` / `kcore-peel` | bucket-queue peeling | the full fixture list plus complete, cycle, tree, a built d-core | bitwise on `coreness` | 3 + 3 = 6, plus 2 driver checks | none |
| `orient-flags` / `tri-intersect` / `tri-coefficient` | per-row `Set` adjacency test in f64 | the full list plus the complete-graph union, a directed twin, parallel edges and self-loops | bitwise on `perNode` | 3 + 3 + 3 = 9 | coefficient and transitivity, f32 versus f64 |
| `truss-peel` | recomputed support with repeated removal | k = 3, 4, 5 on every fixture; two complete graphs joined by one edge | bitwise on the support array | 3 | none |
| `louvain-move` / `louvain-modularity` | the f64 move pass and the f64 modularity function | karate, ten planted seeds, complete-graph union, random, empty, one node, isolated | bitwise on the community array | 5 + 3 = 8, plus 1 driver check | modularity, f32 versus f64, per fixture |
| the Louvain level loop | the f64 reference's modularity, and the per-level total weight | the same list at every level | bitwise on the final labels | 1 (on `coo-emit`, counted in its row above), plus 1 driver check | shares the modularity row |

The sabotage column sums to 52 across the fifteen kernels, against the floor of 45 that `test/sabotage/coverage.test.ts` enforces once `"P11"` joins `SABOTAGE_PHASES` (P11-T14 Step 1). The four driver checks counted separately are not mutations and never satisfy that floor: a `Mutation` is a textual edit of a kernel body, so a thing the driver does wrong is an ordinary test.

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| RP-1 | Two upstream phases are unmerged and this phase depends on both, but on different tasks. Treating it as blocked on everything delays the half that is not. | Section 0.2 splits the entry criteria by task and section 0.3 draws the fan-out. The minimum spanning tree needs neither branch beyond what is already on master. |
| RP-2 | Louvain's measured gain over the CPU turns out to be near 1x, which the design predicts as a real possibility and which makes the whole of P11-T10 and P11-T11 hard to justify after the fact. | Design 8.6 states the expectation up front and design 15 R-16 carries it as a known risk. P11-T13 Step 2 makes the CPU comparison a required row of the benchmark rather than an afterthought, so the number is known at the gate and recorded either way. The package ships no CPU handoff regardless: the caller chooses. |
| RP-3 | The grouping primitive's tier 0 does not compile because a barrier sits inside a guard. This is the most common WGSL failure in this package and it costs hours when it is diagnosed as a logic bug. | P11-T5 Step 2 names it before the code, with the `select`-based fix written out. |
| RP-4 | The contracted graph is subtly wrong -- an arc lost here, a self-loop double-counted there -- and every end-to-end modularity test still passes because the error is small. | P11-T11 Step 4 asserts the total weight per level, not once, and P11-T14 Step 3 compares the contraction's arc list against the reference's stage by stage. |
| RP-5 | Nine tasks append to `src/kernels.ts`, and reading that as "nine sequential tasks" would idle the two that need no upstream branch. | PD-2 makes the file a lock held for one edit, not an ordering over whole tasks. The parallel opportunities are P11-T1, P11-T2 and P11-T4 at the start (all three against master today), and P11-T13 with P11-T14 at the finish; all are marked, and P11-T4's header says exactly what it does about the registry. |
| RP-6 | The k-truss round count makes a large graph slow enough to be useless, and the recompute-per-round choice is the cause. | PD-11 names the ceiling and the upgrade path in the driver, and P11-T13's benchmark reports the round count so the decision can be revisited with a number. |
| RP-7 | Eighty new test cases push the default lane past T-12's 15 minutes on lavapipe. | P11-T16 Step 1 records the wall time; the large fixtures are sized by `gpuScale()` and the genuinely large ones live in `node-limits`, which the default lane does not run. |
| RP-8 | The clustering coefficient ships here and nothing downstream picks it up, so the product gap it was built for stays open. | Section 0.7 writes the chain down and P11-T16 Step 2 records the state of its three outside steps in the gate record. |

## 8. Self-review

### 8.1 Spec coverage -- every deliverable of design 13 row P11 has a task

| Design 13 row P11 deliverable | Task |
| --- | --- |
| k-core | P11-T7 |
| triangle counting / k-truss | P11-T8, P11-T9 |
| label propagation | P11-T6 |
| Boruvka minimum spanning tree (two-pass minimum) | P11-T4 |
| `cooToCsr` | P11-T3 |
| per-row group-by-key (workgroup sort / global hash) | P11-T5 |
| Louvain (move phase with the alternating direction, reduce-by-key cluster weights, device contraction) | P11-T10, P11-T11 |
| Leiden refinement if time allows | not scheduled (DEP-P11-E), named in section 0.8 |
| references for each | P11-T2 |
| the design 8.10 binding counts asserted | P11-T3 Step 2 (the table) and the descriptor test |
| gate G11 | P11-T16 |

Design 16.4's masked-equals-filtered differential is not in the P11 row but is inherited by it ("Section 13's rows P8 and P11 inherit this deliverable"): PD-16, one step in each algorithm task, one gate line in P11-T16.

### 8.2 Placeholder scan

No task says "TBD", "as appropriate" or "etc.". Every Run line names a real script from `webgpu-graph-algorithms/package.json` (`build:all`, `lint`, `test:node`, `test:browser:ci`, `coverage`, `bench`, `bench:compare`) or a real vitest project (`node`, `node-limits`, `browser`). Every helper named in a task exists today on master, on `feat/gpu-p4`, or is created by a named earlier task of this plan or of the traversal phase's plan, and section 0.1 says which.

### 8.3 Type consistency across the tasks

`GpuCorenessResult`, `GpuTriangleResult`, `GpuKTrussResult`, `GpuMstResult` and `GpuCommunityResult` are declared once, in P11-T1. `GpuLabelResult`, which `GpuCommunityResult` extends, comes from the existing `src/types/algorithms.ts` and is not redeclared. `CooToCsrPlanner` and the group-by-key planner are each declared in exactly one file under `src/primitives/` and imported everywhere else. The simple symmetric graph is built by one function, `prepareSimpleSymmetric`, and Louvain's contraction is the same function under a different map (PD-4), so there is one implementation of "group arcs by a pair and merge them" in the package and not two.
