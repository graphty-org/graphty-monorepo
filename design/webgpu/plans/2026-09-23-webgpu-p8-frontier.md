# @graphty/webgpu-graph-algorithms P8 -- the frontier family (BFS, SSSP, Bellman-Ford, closeness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P8 inside `webgpu-graph-algorithms/`: the `Frontier` queue with its sized and chunked edge queue and device-side argument finalisation, the `compact` / `dedupe` primitive, the `advance` primitive in its block-mapped and workgroup-per-row tiers with a subgroup twin, breadth-first search in its two-phase, fused and bottom-up forms with the per-level choice made on the device, weighted single-source shortest paths over a near-far queue, Bellman-Ford with negative-cycle detection, closeness / harmonic / eccentricity over a bit-parallel multi-source search, window-aware advance, the four independent CPU oracles, and the `bfs` benchmark group with T-10 recorded on both runner classes (gate G8).

**Architecture:** Everything in this phase is a queue of vertices that grows and shrinks, and the host is not allowed to watch it. A traversal's per-level decisions -- how many workgroups to run, whether to expand into an edge queue or fuse the expansion into the contraction, whether to sweep forward from the frontier or backward from the unvisited set -- are made by a one-workgroup kernel that reads device counters and writes indirect dispatch arguments, because a road-network graph has thousands of levels and a per-level `mapAsync` would be slower than running the whole thing on the CPU. The host records 32 levels into one command buffer, submits, and reads four bytes. Every kernel is a body in `src/wgsl/<id>.wgsl.ts` registered in `src/kernels.ts`; every driver is a file under `src/algorithms/` that may import `src/context.ts`, `src/memory/**`, `src/kernel/**`, `src/kernels.ts` and `src/primitives/**` and nothing above it (`webgpu-graph-algorithms/eslint.config.js`, `webgpu-graph-algorithms/test/layers.test.ts`). The dependency direction is unchanged: the GPU package imports `@graphty/graph-format` only.

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu` (Dawn) in Node 22 and Chromium (Playwright) in the browser, `@graphty/graph-format` snapshots, vitest 3.2 (node / node-limits / browser projects, v8 coverage), fast-check, pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; `gpu-linux-t4` lane).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 4.6 line 1292 (the frontier row of the chunking table, whose `E_TOO_LARGE` this phase lifts), 5.4 lines 1464-1487 (indirect dispatch and the finalize kernel as the device-side selector), 6 row 2 line 1569 (`scan`), 6 row 4 line 1571 (`compact` / `dedupe`), 6 row 7 line 1574 (`Frontier` and the overflow rule), 6 row 8 line 1575 (`advance`), 6 lines 1581-1598 (subgroup variants) and lines 1599-1604 (the determinism policy), 8.1 line 2568 (the frontier family row), 8.4 lines 2627-2723 (BFS, SSSP, Bellman-Ford, closeness), 8.8 lines 2792-2794 (priority order 4, 5, 6), 8.10 lines 2842-2848 (the binding budgets), 3.3 lines 798-801 (the public signatures) and lines 821-823 (`GpuBfsResult`, `GpuSsspResult`, `GpuBellmanFordResult`), 9.7 lines 3269-3273 (result-shape parity), 10.1 (the BFS scratch column), 10.3 (the BFS row), 10.4 line 3415 (T-10) and line 3417 (T-12), 11.3 lines 3484-3501 (test kinds), 11.6 item 4 (the browser smoke), 11.9 lines 3699-3764 (the four sensitivity mechanisms), 13 row P8 line 4215 (the deliverables and gate G8). The design is normative; every departure is in section 0.5.

**Plans of record for the earlier phases:** `design/webgpu/plans/2026-09-15-webgpu-p0.md` through `-p3.md`, `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md`, and `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` (design phase P7, whose residency and scope work this phase consumes).

**Gate:** G8 (design 13 row P8, line 4215). The record is `webgpu-graph-algorithms/docs/decisions/G8.md`, written by the last task beside the existing G0-G3.

**Tasks in this document:** P8-T1 .. P8-T17. **P8-T1, P8-T2 and P8-T3 are independent of each other and of everything else and may run first, in parallel.** P8-T2 needs no GPU at all. After them the chain is P8-T4 -> P8-T5 -> P8-T6 (the first working traversal) -> P8-T7 -> P8-T8 -> P8-T9 -> P8-T11; P8-T10 and P8-T12 hang off the chain where noted; P8-T13 gathers, P8-T14 and P8-T15 run in parallel after it, P8-T16 any time after P8-T4, P8-T17 last. Within the phase no two tasks own the same file, with one exception stated as PD-2: `src/kernels.ts` is appended to by nine tasks (P8-T3 through P8-T11), which is why that whole run is sequential.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the touched files is a step of P8-T17.
- Never run `sudo`; nothing here needs it. Servers only on ports 9000-9999 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them.
- Project rule (root `CLAUDE.md`): never create a fallback when WebGPU is absent. `src/` contains no CPU path and no software-adapter acceptance; the package throws.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts`).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md`): device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator. `src/wgsl/**` is imported only by `src/kernels.ts`. Enforced by `webgpu-graph-algorithms/eslint.config.js` and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md` "WGSL Conventions"): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and every subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, and never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`).
- Bind-group rule: group 0 = the graph (`rowPtr`, `colIdx`, `weights` or a dummy, `perm` or a dummy), group 1 = algorithm state, group 2 = the params uniform through the `UniformRing`, group 3 = cold arrays; never more than 8 storage buffers per stage. A kernel that needs a ninth is SPLIT, never given a raised limit as a requirement.
- Test placement: the `node` project's include glob names its directories literally (`test/{device,node,memory,kernel,primitives,algorithms,layouts,oracle,sabotage,types}/**/*.test.ts`). A new directory is invisible to the runner. Every test file this plan creates goes in one of those directories or in `test/limits/` (the `node-limits` project) or `test/browser/`.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is in section 0.5 with its reason and, where it changes a design statement, a `design/decisions/2026-09-23-<slug>.md` record written by P8-T16.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-22)

| Fact | Evidence |
| --- | --- |
| Master carries design phases P0-P3: the device layer, the context, the memory and kernel layers, `reduce`, thread-per-row `segmentedReduce`, and ForceAtlas2 on the exact all-pairs tier. | `git log --oneline -- webgpu-graph-algorithms/`; `ls webgpu-graph-algorithms/src/` |
| `src/primitives/` on master holds TWO files, `reduce.ts` and `segmented-reduce.ts`. There is no `scan`, `histogram`, `radix-sort`, `compact`, `frontier` or `advance`. | `ls webgpu-graph-algorithms/src/primitives/` |
| `src/algorithms/` on master holds ONE file, `degree.ts`. | `ls webgpu-graph-algorithms/src/algorithms/` |
| `planGridStride` and `planIndirect` are throwing stubs with their final signatures. | `webgpu-graph-algorithms/src/kernel/dispatch.ts`, the two `E_UNSUPPORTED` bodies at the end of the file |
| `KernelId` is a closed union of ten ids and `KERNELS` is frozen; the registry is append-only and every entry carries `phase: "P1" \| "P2" \| "P3"`. | `webgpu-graph-algorithms/src/kernels.ts`, the `KernelId` declaration and the `REGISTRY` object |
| No `.wgsl.ts` body on master uses an atomic. The package's first atomics arrive with design phase P7. | `grep -rn 'atomic<\|atomicLoad\|atomicStore\|atomicAdd\|atomicMin\|atomicCompareExchangeWeak' webgpu-graph-algorithms/src/wgsl/` (the only hits are prose in `fa2-attraction.wgsl.ts`) |
| `GraphResidency.view()` accepts `outDegree`, `inDegree`, `degreeOrder` and `reverseDegreeOrder` and rejects `reverse`, `coo`, `edgeList` and `mate` by name. | `webgpu-graph-algorithms/src/memory/residency.ts`, the `view()` switch |
| The scan, histogram, counting sort, stable radix sort, `planIndirect` and the `indirect-finalize` kernel exist, complete and tested, on branch `feat/gpu-p4` (design phase P4). They are NOT on master. | `git ls-tree -r --name-only feat/gpu-p4 -- webgpu-graph-algorithms/src/primitives webgpu-graph-algorithms/src/wgsl` |
| The `reverse()` / `edgeList()` residency, `packViews`, grid-stride dispatch, the `core-shape.ts` helpers and `algorithmScope()` exist on branch `feat/webgpu-spmv-wcc` (design phase P7). They are NOT on master. | `git ls-tree -r --name-only feat/webgpu-spmv-wcc -- webgpu-graph-algorithms/src` |
| The three vitest projects are `node`, `node-limits` and `browser`; `test/limits/` contains only `README.md`, so `node-limits` has no test until P4 or P7 lands one. | `webgpu-graph-algorithms/vitest.config.ts`; `ls webgpu-graph-algorithms/test/limits/` |
| `benchmarks/run.ts` registers three groups: `upload`, `roundtrip`, `layout-exact`. The checked-in baselines are `gpu-linux-t4.json`, `nvidia-lovelace-driver580.json` and `noise-floor.json`. | `webgpu-graph-algorithms/benchmarks/run.ts`; `ls webgpu-graph-algorithms/benchmarks/results/` |
| `test/helpers/graphs.ts` already provides every fixture generator this phase needs, including `rmatEdges(scale, edgeFactor, seed)`, `gridEdges(w, h)`, `pathEdges(n)`, `starEdges(leaves)` and `snapshotOf`. | `grep -n '^export ' webgpu-graph-algorithms/test/helpers/graphs.ts` |
| `test/helpers/sabotage.ts` holds the `Mutation` record, the `SABOTAGE` registry keyed by `KernelId`, and `test/sabotage/coverage.test.ts` asserts every `find` string occurs exactly once in the live body. | `webgpu-graph-algorithms/test/helpers/sabotage.ts`; `webgpu-graph-algorithms/test/sabotage/coverage.test.ts` |
| `webgpu-graph-algorithms/docs/decisions/` holds G0, G1, G2 and G3. There is no G7 and no G8. | `ls webgpu-graph-algorithms/docs/decisions/` |

### 0.2 Entry criteria -- NOT met today, and exactly two things are missing

P8 is the only unbuilt phase whose primitives are all already written; none of them are on master.

| Criterion | Status | What it is, and where it is |
| --- | --- | --- |
| Design phase P4 merged (`exclusiveScan`, `histogram` / `countingSortByKey`, `radixSort`, `planIndirect`, the `indirect-finalize` kernel, the `degreeOrder()` tiers of `segmentedReduce`, windowed upload execution and the `node-limits` project) | **NOT MET** | branch `feat/gpu-p4`, worktree `.worktrees/gpu-p4`. P8 uses `exclusiveScan` for `compact`, `planIndirect` and the finalize kernel for every level's dispatch arguments, and the degree tiers for `advance`'s workgroup-per-row tier. |
| Design phase P7 merged (`reverse()` and `edgeList()` residency with `packViews`, grid-stride dispatch, `src/primitives/core-shape.ts`, `src/algorithms/scope.ts`) | **NOT MET** | branch `feat/webgpu-spmv-wcc`, worktree `.worktrees/webgpu-spmv-wcc`; the plan is `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`. P8 uses `reverse()` for the bottom-up sweep, `edgeList()` for Bellman-Ford, `algorithmScope()` for every driver, and `core-shape.ts` for the windowed core. |
| Design phase M3 (the package in the monorepo, releasing) | **MET** | `webgpu-graph-algorithms/package.json` is a workspace project with its own `project.json`. |
| Design's phase order admits P8 after P7 | **MET** | design 13 line 4224: `P7 (SpMV + WCC) -> P8 (frontier) -> P9 (BC + APSP)`. |

**Do not start P8-T4 or later before both branches are on master.** P8-T1, P8-T2 and P8-T3 can be written and reviewed against master today: P8-T1 adds types only, P8-T2 adds CPU code and needs no device, and P8-T3's only dependency is `exclusiveScan`, so it can be written against the branch and its test run in the P4 worktree before P4 merges. Every other task compiles against helpers that do not exist on master and will fail at `tsc` if scheduled early.

### 0.3 Execution order

```
merge feat/gpu-p4 (P4)  and  merge feat/webgpu-spmv-wcc (P7)   [in either order]
        -> P8 (this plan)  -> P9 (betweenness + all-pairs)  -> P11 (structure + community)
P8-T1, P8-T2, P8-T3 may be written against the branches before either merge.
```

P9 and P11 both consume this phase's `Frontier` and `advance`: betweenness is a tagged multi-source form of the same forward sweep, and k-core peeling is the same queue with a different claim. Nothing in the remaining half of the design's algorithm work starts before P8 lands.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | The primitives ship as `prepareFrontier` / `prepareAdvance` / `prepareCompact` planners over a `ReduceScope`, the shape every existing primitive uses, not as the design's free functions | P8-T3, P8-T4, P8-T5 |
| PD-2 | Nine tasks append to `src/kernels.ts` (P8-T3 through P8-T11); they are therefore sequential, and each adds its ids to `KernelId` and a `phase: "P8"` member to the entry union | P8-T4 |
| PD-3 | `frontier-finalize` is a NEW kernel beside `indirect-finalize`, because the selector reads several counters and writes several slots | P8-T4 |
| PD-4 | Fourteen P8 kernel ids, their binding counts at or below design 8.10's with every difference named in its row, and the four closed unions they widen | P8-T4 |
| PD-5 | The BFS contract phase ships NO workgroup hash culling, so it needs no `dedupe`; the atomic claim already dedupes exactly. `dedupe` ships for the near-far queue | P8-T6 |
| PD-6 | `depth` is `array<atomic<u32>>`; the claim is `atomicMin(&depth[v], level)` and the invocation that observes `INVALID_INDEX` is the winner. No compare-exchange, no retry loop | P8-T6 |
| PD-7 | 32 levels per submit, one four-byte readback per submit; `MAX_LEVELS_PER_SUBMIT = 32` lands in `src/constants.ts` | P8-T6 |
| PD-8 | `switches`, `levels`, `visitedCount` and the frontier degree sums are words of ONE counters block, read back with the result in one copy | P8-T4, P8-T8 |
| PD-9 | `dist` is `array<atomic<u32>>` holding f32 bit patterns under `atomicMin`, and the result is bitwise reproducible -- which is what makes the f32 oracle an exact check rather than a tolerance | P8-T9 |
| PD-10 | The Dijkstra oracle ships in TWO precisions; `dist` is compared BITWISE against the f32 oracle and with a derived tolerance against the f64 one | P8-T2, P8-T9 |
| PD-11 | `predArc` is a second pass over the settled frontier, never packed into the distance atomic | P8-T9 |
| PD-12 | Bellman-Ford's signed relax uses a BOUNDED compare-exchange retry with a device "retry exhausted" flag, never an unbounded loop | P8-T10 |
| PD-13 | Closeness, harmonic closeness and eccentricity are one driver over one bit-parallel multi-source sweep, 32 sources per `u32` word; the weighted case is repeated near-far | P8-T11 |
| PD-14 | `order` and `parent` are set-deterministic, not bitwise; the run-twice check applies to `depth`, `dist` and every counter, and to `order` as a per-level set | P8-T6, P8-T17 |
| PD-15 | Every new test file goes in a directory the `node` include glob already names | P8-T2 |
| PD-16 | The accelerator members and the barrel export land in ONE task, after every driver is green; never a throwing stub | P8-T13 |
| PD-17 | The `bfs` baselines are captured on BOTH runner classes before the benchmark commit lands | P8-T14 |
| PD-18 | The unvisited vertex list and the unvisited counters that Beamer's test is against are rebuilt exactly once per submit by a flags kernel plus `compact`, and maintained between rebuilds by subtraction inside `frontier-finalize` | P8-T8 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-P8-A | Design 6 rows 4, 7 and 8 (lines 1571, 1574, 1575) spell the primitives as free functions taking a `CommandBatch` (`compact(batch, flags, count, out, outCount)`, `advance(batch, graph, frontier, functor, tiers?)`). This phase ships them as `prepareCompact` / `prepareAdvance` planners returning an object with a synchronous `record(pass, ...)`, the shape `prepareScan`, `prepareHistogram`, `prepareCountingSort` and `prepareRadixSort` already use. | Pipeline creation is asynchronous and compilation must happen once, not per level. Every primitive that landed after the design was written resolved this the same way, and `src/primitives/**` never imports `src/context.ts`, so a planner over a `ReduceScope` is the only shape that compiles. The `Frontier` class of design 6 row 7 keeps its class spelling; only the free functions change. Recorded by P8-T16 as `design/decisions/2026-09-23-frontier-primitives-are-planners.md`. |
| DEP-P8-B | Design 8.4 line 2640 names "Davidson's ownership dedupe as the exact safety net behind any workgroup hash culling" among the BFS deliverables. This phase ships no hash culling in BFS and therefore no dedupe in the BFS contract. `dedupe` still ships, and the near-far queue of P8-T9 is its caller. | The atomic claim of PD-6 is already an exact filter: for one level, exactly one invocation observes `INVALID_INDEX` at `depth[v]` and exactly that one appends `v`, so the next vertex frontier carries no duplicate and nothing is left for a safety net to catch. Hash culling is a bandwidth optimisation on the EDGE queue that this phase does not attempt; if a later phase adds it, the dedupe it needs is already built and tested. The consequence for the binding budget, so the kernel table of P8-T4 and design 8.10 cannot be read as contradicting each other: `bfs-contract` declares NO `owner` binding, and its two counters are words of the one counters block, so the kernel is five storage buffers where design 8.10's row is seven. Five is inside the budget, and the descriptor test expects five. Recorded by P8-T16 as `design/decisions/2026-09-23-bfs-claims-instead-of-culling.md`. |
| DEP-P8-C | Design 5.4 describes ONE finalize kernel that is also the selector. This phase keeps P4's `indirect-finalize` for the single-count case and adds a second kernel, `frontier-finalize`, for the multi-candidate case. | P4's body reads one count from `counters[P.countIndex]` and writes one 16-byte slot. The frontier selector reads the frontier count, the frontier degree sum, the unvisited count and the previous level's two values, evaluates two thresholds, and writes three or more slots per level, most of them `(0, 0, 1)`. Widening P4's body would make every grid dispatch pay for BFS's uniform block and would put P4's sabotage rows at risk. Two bodies, one rule: P8-T4 asserts the two kernels agree on the `(x, y, 1)` arithmetic for the same count, so they cannot drift. |
| DEP-P8-D | Design 8.1's frontier-family row (line 2568) lists "k-core peeling" among the family's algorithms. This phase does not build it. | Design 8.8 (line 2799) and design 13 (row P11) both assign k-core to P11, and design 13 rule (b) forbids a phase absorbing a later phase's work. The 8.1 row describes which primitives k-core will use, not when it lands. No decision record: the design already says P11 twice and 8.1 says nothing that contradicts it. |
| DEP-P8-E | Design 4.6 line 1292 says the frontier family is not windowed in v1 and raises `E_TOO_LARGE`; design 13 row P8 lists "window-aware advance (lifting the `E_TOO_LARGE`)" as a P8 deliverable. This phase lifts it, so line 1292's "(v1: `E_TOO_LARGE`)" is stale from P8 onward. | The two design statements are in tension and design 13 is the later and more specific one. P8-T12 lifts it for `advance` only; `dedupe` and the near-far queue keep the refusal, because a windowed pass cannot see the whole `colIdx` and the near-far split needs it. Recorded by P8-T16 as `design/decisions/2026-09-23-advance-is-window-aware.md`. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| P8 frontier family | `webgpu-graph-algorithms/` | design phases P4 and P7 merged (section 0.2) -- NEITHER met today | `Frontier`, `compact` / `dedupe`, `advance`, BFS in three forms with the device-side per-level choice, near-far SSSP, Bellman-Ford, closeness / harmonic / eccentricity, window-aware advance, four oracles, the accelerator members, the `bfs` benchmarks | design G8 | design 13 row P8 says 10-14 ed; this plan's seventeen tasks sum to 21.5 ed |

Critical path: P8-T4 -> P8-T5 -> P8-T6 -> P8-T7 -> P8-T8 -> P8-T9 -> P8-T11 -> P8-T13 -> P8-T17.

**Something works early.** P8-T6 is the first task that ends with a correct, usable, benchmarkable traversal: after it, `breadthFirstSearch` returns exact depths on every fixture on both adapters. Everything after it either makes that traversal faster (P8-T7 fused, P8-T8 direction-optimizing), adds a weight to it (P8-T9, P8-T10), or runs it many times at once (P8-T11). If the phase has to be cut in half, P8-T1..T6 plus P8-T13..T17 is a shippable PR and P8-T7..T12 is the second one.

**The three that can be done first, independently, and in parallel:** P8-T1 (types and constants), P8-T2 (the four CPU oracles and the traversal check helpers -- no GPU, no device, no branch dependency), P8-T3 (`compact` / `dedupe`, whose only dependency is P4's `exclusiveScan`).

| Task | What it is | ed |
| --- | --- | --- |
| P8-T1 | the P8 result and option types, six constants | 0.5 |
| P8-T2 | four f64 oracles, the f32 Dijkstra twin, the traversal check helpers, the oracle self-tests | 1.5 |
| P8-T3 | `compact` and `dedupe`: two bodies, one planner file, the differential suite | 1.5 |
| P8-T4 | `Frontier`, the counters block, the multi-candidate args buffer, `frontier-finalize`, the registry opening | 2.0 |
| P8-T5 | `advance`: the block-mapped body, the workgroup-per-row tier, the subgroup twin, the chunked edge queue and its overflow rule | 3.0 |
| P8-T6 | two-phase BFS: expand, contract, the host loop, the differential suite -- **first working traversal** | 2.0 |
| P8-T7 | the fused expand-contract kernel and the device-side per-level selection | 1.0 |
| P8-T8 | direction-optimizing: the unvisited list and its counters, the bitset, the bottom-up sweep over `reverse()`, Beamer's test, `switches` | 2.5 |
| P8-T9 | near-far SSSP: the f32-bit-pattern atomic distance, the delta piles, the predecessor pass, the two routings | 2.5 |
| P8-T10 | Bellman-Ford over `edgeList()` with the bounded compare-exchange and the negative-cycle round | 1.0 |
| P8-T11 | closeness, harmonic closeness and eccentricity over the bit-parallel multi-source sweep | 1.5 |
| P8-T12 | window-aware advance, lifting the frontier family's `E_TOO_LARGE` | 1.0 |
| P8-T13 | six accelerator members, the barrel, three test files | 0.5 |
| P8-T14 | the `bfs` benchmark group and two baselines, T-10 on both runner classes | 1.0 |
| P8-T15 | the sabotage matrix (at least 42 mutations), the twins, the browser smoke, the `node-limits` tests | 1.5 |
| P8-T16 | three decision records and the design index | 0.5 |
| P8-T17 | the full green check on two adapters plus the browser, and the G8 record | 0.5 |
| | **total** | **21.5** |

21.5 ed against the design's 10-14. The gap is the same kind the P7 plan found and is worth knowing before scheduling, not after: the design cell was written before anyone enumerated fourteen WGSL bodies of which seven carry atomics and three carry a workgroup scan, four independent CPU references, roughly seventy test cases across six suites, forty-two sabotage mutations, and a benchmark group re-baselined on two runner classes. Nine of the seventeen tasks are on one sequential chain and each ends in a green check on both adapters, which design 13 rule (a) requires. The owner's call, in the pull request: accept 21.5 and let the design cell stand as the estimate it was, or split the phase at P8-T6 as section 0.6 describes. The tasks and their order are the same either way.

### 0.7 What P8 does NOT do

- No betweenness centrality, no edge betweenness, no all-pairs shortest paths. Those are design phase P9 and they consume this phase's `Frontier` and `advance` unchanged.
- No k-core, no triangle counting, no label propagation, no Louvain (DEP-P8-D).
- No new primitive beyond `compact` / `dedupe`, `Frontier` and `advance` (design 13 rule (b)). In particular it does not build `cooToCsr`, which is P11's.
- It does not touch `algorithms/`, `layout/`, `graphty-element/` or `graphty/`. The `AlgorithmAccelerator` it extends is the GPU package's own structural mirror in `src/types/accelerator.ts`.
- It does not change the layout slice. `src/layouts/**` is untouched.

---

## Phase P8: the frontier family

**Entry criteria:** design phases P4 and P7 merged to master (section 0.2). Work on branch `feat/webgpu-frontier` in a worktree (`git worktree add .worktrees/webgpu-frontier -b feat/webgpu-frontier master`, run by the owner -- a subagent must never run `git worktree`); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms`; the phase lands with the `gpu` label so `gpu.yml` runs on it.

**Step 0 of the phase** (a fresh worktree has no `node_modules` and no `dist/`, both gitignored). Export the two path variables FIRST -- every Run line below begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-frontier
    export PKG=$WT/webgpu-graph-algorithms

then `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build`. Every later command reads `graph-format/dist/`.

**The local run environments** (`webgpu-graph-algorithms/CLAUDE.md`, used verbatim in every Run line):

    # NVIDIA (the hardware lane the parity and timing numbers come from)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task P8-T1: The P8 result and option types, and the six constants

**Independent. May run first, in parallel with P8-T2 and P8-T3, against master.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 3.3 lines 798-801 (the four public signatures) and lines 821-823 (`GpuBfsResult`, `GpuSsspResult`, `GpuBellmanFordResult`); design 8.4 lines 2627-2723 (which option each algorithm carries); design 9.7 lines 3268-3270 (what the result must let a caller check).

**Files:**
- Create: `$PKG/src/types/traversal.ts` (the `Gpu*Result` shapes verbatim from design 3.3 and the GPU-side option records)
- Modify: `$PKG/src/constants.ts` (append the six P8 constants; never reorder the file)
- Modify: `$PKG/test/device/constants.test.ts` (pin the six new values)
- NOT touched: `src/index.ts` and `test/index.test.ts` (P8-T13 owns the barrel), `src/kernels.ts` (P8-T4)

**Interfaces produced:** `GpuBfsResult`, `GpuSsspResult`, `GpuBellmanFordResult`, `GpuClosenessResult`, `BfsOptions`, `SsspOptions`, `BellmanFordOptions`, `ClosenessOptions` from `src/types/traversal.js`.

- [ ] **Step 1: The result types, spelled from design 3.3 lines 821-823 without change**

The three result interfaces are the design's text verbatim. `depth`, `parent` and `order` are `U32` with `INVALID_INDEX` for unreached and for the root's parent; `dist` is `F32` with `+Infinity` for unreached; `switches` is the device counter of design 8.4, so a test can assert a direction change happened. `GpuClosenessResult` has no design line of its own, because design 3.3 routes `closenessCentrality` through `GpuScoresResult`: use `GpuScoresResult` and add nothing, so a later harmonic or eccentricity caller reads the same shape. Write the JSDoc of each field to say what the sentinel means -- a consumer who reads `parent[root] === 4294967295` and guesses is the failure this prevents.

- [ ] **Step 2: The option records**

`BfsOptions` carries `direction?: "top-down" | "auto"` (default `"auto"`: the device chooses per level; `"top-down"` disables the bottom-up candidate entirely and exists so a test can compare the two paths), `maxLevels?: number` and `weighted?: boolean` is ABSENT -- BFS is unweighted by definition and a caller who wants weights calls `sssp`. `SsspOptions` carries `delta?: number` (default: the device computes `32 * avgWeight / avgDegree`, design 8.4) and `weighted?: boolean`. `BellmanFordOptions` carries `maxRounds?: number`. `ClosenessOptions` carries `harmonic?: boolean`, `wassermanFaust?: boolean` and `sources?: readonly number[]`. Every member is `readonly` and spelled `?: T | undefined`, because `tsconfig.strict-consumer.json` compiles with `exactOptionalPropertyTypes`.

- [ ] **Step 3: The six constants**

Append to `$PKG/src/constants.ts`, each with a JSDoc naming its design line:

| Constant | Value | Why |
| --- | --- | --- |
| `MAX_LEVELS_PER_SUBMIT` | 32 | design 8.4: 32 levels per submit, one four-byte readback per submit (PD-7) |
| `FUSED_FRONTIER_MAX` | 4096 | design 8.4 and 6 row 8: the fused expand-contract variant's threshold, Merrill's "fleeting iterations" |
| `BEAMER_ALPHA` | 14 | design 8.4 gives `alpha = m / n` as the rule and Beamer's 14 / 24 as the published pair; the default is the computed ratio and this is the fallback for a graph with no nodes, where `m / n` is undefined. 14 is that pair's alpha, as 24 in the row below is its beta |
| `BEAMER_BETA` | 24 | design 8.4: switch back when `next * 24 < unvisited` |
| `SSSP_DELTA_FACTOR` | 32 | design 8.4: `delta = 32 * avgWeight / avgDegree` |
| `NEAR_SUBPARTITIONS` | 16 | design 8.4: "a two-level near queue with 16 subpartitions" |

Do not add a constant for `+Infinity`'s bit pattern: `0x7F800000` belongs in the prelude beside `INVALID_INDEX`, and P8-T9 puts it there.

Run: `cd $PKG && pnpm exec vitest run --project=node test/device/constants.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS and clean. knip reports the eight exports of `src/types/traversal.ts` as unused; that is expected until P8-T13 exports them through the barrel, and `knip.config.ts` must NOT be edited to silence it.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the frontier family's result types and constants`.

---

### Task P8-T2: The four CPU oracles and the traversal check helpers

**Independent. Needs NO GPU and no device. May run first, in parallel with P8-T1 and P8-T3, against master.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 11.3 row "Algorithm differential" lines 3489-3490 (the oracle rule: independent, index-based, never derived from the kernel, and kept even after `indexed.*` exists as a second oracle, because a GPU tested only against the CPU package shares its design and its bugs); design 11.9 item 3 (tolerances are derived, not chosen); design 13 row P8 (the three named oracles: FIFO BFS, binary-heap Dijkstra, Bellman-Ford).

**Files:**
- Create: `$PKG/test/oracle/traversal.ts` (FIFO BFS, binary-heap Dijkstra in f64 AND f32, Bellman-Ford, and the closeness / harmonic / eccentricity reduction over the BFS rows)
- Create: `$PKG/test/helpers/traversal-check.ts` (the invariant checkers every differential test calls)
- Create: `$PKG/test/oracle/traversal.test.ts` (the oracles check THEMSELVES against analytic answers)
- NOT touched: anything under `src/`

**Interfaces produced:** `bfsOracle(csr, source)`, `dijkstraOracle(csr, source, precision: "f64" | "f32")`, `bellmanFordOracle(csr, source)`, `closenessOracle(csr, options)`, and from the check helper `expectLevelConsistent(result, csr, source)`, `expectOrderGroupedByLevel(result)`, `expectTriangleInequality(dist, csr)`, `expectPredArcAttains(result, csr)`.

- [ ] **Step 1: The oracles, written from the algorithm, never from a kernel**

Each takes the CSR arrays as plain typed arrays (`rowPtr`, `colIdx`, `weights`) and a source index, and returns plain arrays. Tens of lines each; do not import anything from `src/`.

- FIFO BFS: a `Uint32Array` queue, `depth` filled with the invalid sentinel, one pass per pop. It returns `depth`, `parent` (the FIRST discoverer, so the oracle's parent is a valid one and the test compares by the level rule, not by equality) and `order`.
- Binary-heap Dijkstra: a standard array-backed heap. **PD-10: it takes a `precision` argument.** With `"f64"` it accumulates in JavaScript numbers. With `"f32"` it rounds every partial sum through `Math.fround` at each relaxation, which is exactly what one f32 add in the kernel does. The f32 run is the one the GPU must match bitwise (see P8-T9 PD-9); the f64 run is the one that says how far f32 has drifted, which is the noise-floor measurement design 11.9 item 3 requires.
- Bellman-Ford: `n - 1` full relaxation rounds over every arc plus one more round that sets the negative-cycle flag if anything still improves.
- Closeness: run the FIFO BFS from each source in the list, then reduce the rows -- `sum d` for closeness, `sum 1/d` for harmonic, `max d` for eccentricity -- with unreached vertices excluded from the sum and counted for the Wasserman-Faust scaling.

- [ ] **Step 2: The check helpers, which are what makes a nondeterministic result testable**

Design 6 line 1599 fixes the determinism policy: `depth` and `dist` are exact and reproducible, `parent` and `order` are set-deterministic only. So the differential tests never compare `parent` or `order` to the oracle's; they check properties:

- `expectLevelConsistent`: for every reached `v` that is not the source, `depth[parent[v]] === depth[v] - 1` AND an arc from `parent[v]` to `v` exists in the CSR. For the source, `parent === INVALID_INDEX`. For every unreached `v`, both are the sentinel.
- `expectOrderGroupedByLevel`: `depth[order[i]]` is non-decreasing in `i`, `order` is a permutation of the reached set, and its length is `visitedCount`.
- `expectTriangleInequality`: over every arc `(u, v, w)`, `dist[v] <= dist[u] + w` within one unit in the last place of `dist[v]`. This is the invariant design 11.3 names and it catches a relaxation the kernel dropped without needing an oracle at all.
- `expectPredArcAttains`: `predArc[v]` names an arc `(u, v, w)` with `Math.fround(dist[u] + w) === dist[v]`.

- [ ] **Step 3: The oracles check themselves**

`test/oracle/traversal.test.ts` runs each oracle against answers computable by hand, so a bug in the oracle is caught before it is trusted to judge a kernel: on `pathEdges(n)` the depths are `0..n-1` and closeness is the known harmonic sum; on `starEdges(k)` every leaf is at depth 2 from another leaf and eccentricity is 2; on `gridEdges(w, h)` the depth of `(x, y)` from the corner is `x + y`; on `completeEdges(n)` every non-source depth is 1; on a planted negative cycle Bellman-Ford's flag is true and on the same graph with the cycle's weight raised it is false. Also assert what PD-10 exists for: on a path of 2,000 unit-ish random weights the f32 and f64 Dijkstra results differ, and record the relative spread -- that number is the noise floor P8-T9 derives its tolerance from and P8-T17 records.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/traversal.test.ts`
Expected: PASS, with no device acquired (the file imports nothing from `test/setup/gpu.ts`). If the run prints the `[gpu] adapter` line, something imported a device helper and the task's independence is gone.

- [ ] **Step 4: Commit (owner)** -- `test(webgpu-graph-algorithms): the traversal oracles and the level-consistency checks`.

---

### Task P8-T3: The `compact` and `dedupe` primitive

**Independent of P8-T1 and P8-T2. Its only dependency is P4's `exclusiveScan`, so it can be written and run in the P4 worktree before P4 merges.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 6 row 4 line 1571 (both signatures and the race-free two-dispatch ownership rule); design 11.3 row "Primitive differential" (the adversarial sizes).

**Files:**
- Create: `$PKG/src/wgsl/compact-scatter.wgsl.ts`, `$PKG/src/wgsl/dedupe-claim.wgsl.ts`, `$PKG/src/wgsl/dedupe-filter.wgsl.ts` (three bodies, not four -- Step 1 says why there is no separate flagging kernel)
- Create: `$PKG/src/primitives/compact.ts`
- Modify: `$PKG/src/kernels.ts` (four entries; the first of the six appends -- see PD-2 in P8-T4, and if P8-T4 has already landed, append after its ids)
- Create: `$PKG/test/oracle/compact.ts`, `$PKG/test/primitives/compact.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts` (the new override axes)

**Interfaces produced:** `prepareCompact(scope: ReduceScope): Promise<CompactPlanner>` with `record(pass, { flags, count, out, outCount })` and `recordDedupe(pass, { queue, count, owner, out, outCount })`.

- [ ] **Step 1: The compaction, which is a scan with two dispatches around it**

`compact` is flag, scan, scatter, and only the last two need a kernel of their own. The flags binding is one `u32` per input element, 0 or 1, and both callers in this phase (the near pile and the far pile of P8-T9) write their flags in the kernel that produced the queue, so nothing here needs a predicate-evaluating pass. The planner records `exclusiveScan(flags) -> offsets` with its total, then `compact-scatter`: `if (flags[i] != 0u) { out[offsets[i]] = queue[i]; }` and one lane writes the total into `outCount`. There is deliberately no separate flagging kernel: the design's signature takes `flags` already materialised, and a body nothing calls is dead code knip will flag.

- [ ] **Step 2: The dedupe, and why it is two dispatches**

Design 6 row 4 is explicit and the reason matters more than the code: a plain store read back in the SAME dispatch is a data race and a dynamic error under WGSL 6.5.7. So `dedupe-claim` does `atomicStore(&owner[queue[i]], i)` for every entry and ends; `dedupe-filter`, a separate dispatch, does `if (atomicLoad(&owner[queue[i]]) == i) { append queue[i]; }`. Between two dispatches the relaxed atomics make last-writer-wins well defined, and exactly one index per distinct vertex survives. `owner` is `array<atomic<u32>>` sized `n` and must be reset between calls -- reuse the existing `fill` kernel for that rather than adding a zeroing body, and note in the JSDoc that the reset is the caller's, recorded into the same pass.

- [ ] **Step 3: The oracle and the differential suite**

`test/oracle/compact.ts` is `Array.prototype.filter` for compact and a `Set` walk keeping first occurrences for dedupe. The suite runs both at sizes 0, 1, 255, 256, 257, 4097 and `4 * gpuScale()`, with: all flags 0, all flags 1, alternating, a single 1 at the last index; for dedupe, all-distinct, all-identical, and a queue where the same vertex appears 1,000 times. Compact's output is order-preserving and therefore bitwise reproducible -- assert the run-twice bitwise check on it. Dedupe's SURVIVING SET is fixed but WHICH index survives is last-writer-wins, so assert set equality against the oracle and assert the run-twice check on the output's sorted form, not its raw form. Getting that distinction wrong here is the most likely way this task ships a flaky test.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/compact.test.ts` then the same with `$GPU_NV`.
Expected: PASS on both. `u32` outputs bitwise identical between the two adapters (design 11.5).

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the compact and dedupe primitive`.

---

### Task P8-T4: The `Frontier`, the counters block, the indirect args and `frontier-finalize`

**Depends on P8-T1. Blocks everything from P8-T5 on.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 6 row 7 line 1574 (the class, the two vertex queues, the counters, the args buffer and the overflow rule); design 5.4 lines 1464-1487 (the finalize kernel, the selector role, `k x candidates` slots, and the measured fact that a same-pass write-then-indirect-read works on Dawn); design 8.10 line 2846 (`BFS finalizeArgs` binds two storage buffers: the counters block and the args).

**Files:**
- Create: `$PKG/src/primitives/frontier.ts` (the `Frontier` class and `prepareFrontier`)
- Create: `$PKG/src/wgsl/frontier-finalize.wgsl.ts`
- Modify: `$PKG/src/kernels.ts` (**PD-2 and PD-3 and PD-4 live here**)
- Modify: `$PKG/src/constants.ts` is NOT touched (P8-T1 did it)
- Create: `$PKG/test/primitives/frontier.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts`

- [ ] **Step 1: PD-2 -- how nine tasks share one registry file**

`src/kernels.ts` declares `KernelId` as a closed union and freezes `REGISTRY`. Nine tasks of this phase append to it -- P8-T3, P8-T4, P8-T5, P8-T6, P8-T7, P8-T8, P8-T9, P8-T10 and P8-T11 -- and that is why that run is sequential and why no two of them may execute at once. The rule for each: add the new ids to the END of the `KernelId` union, add the entries to the END of `REGISTRY`, add `"P8"` to the `phase` union of `KernelEntry` ONCE (this task does it), and never renumber or rename an existing id. `test/kernel/bind-group-budget.test.ts` and the compile matrix pick the entries up from the registry with no further edit.

- [ ] **Step 2: PD-4 -- the fourteen P8 kernel ids and their binding counts**

State the whole table here so every later task has one place to check its count against design 8.10, and so the descriptor test of design 11.3 has a per-kernel expectation rather than a promise.

| Id | Task | Storage bindings | Design 8.10 row |
| --- | --- | --- | --- |
| `compact-scatter` | P8-T3 | queue, flags, offsets, out, outCount (5) | -- (a primitive) |
| `dedupe-claim` | P8-T3 | queue, owner (2) | -- |
| `dedupe-filter` | P8-T3 | queue, owner, out, outCount (3) | -- |
| `frontier-finalize` | P8-T4 | counters, args (2) | "BFS `finalizeArgs`", 2 |
| `advance-expand` | P8-T5 | rowPtr, colIdx, frontierIn, counters, edgeQueue (5) | "BFS expand", 7 -- the frontier count, both edge counts and the chunk cursor are words of `counters` |
| `bfs-contract` | P8-T6 | edgeQueue, counters, depth, parent, frontierOut (5) | "BFS contract", 7 -- no `owner` (DEP-P8-B), and the two counts are words of `counters` |
| `bfs-fused` | P8-T7 | rowPtr, colIdx, frontierIn, counters, depth, parent, frontierOut (7) | "BFS fused expand-contract", 8 -- it reads `frontierCount` and appends into `nextFrontierCount`, both words of the one block |
| `bfs-bottom-up` | P8-T8 | revRowPtr, revColIdx, unvisitedList, counters, frontierBits, depth, parent, frontierOut (8) | "BFS bottom-up", 8 -- `unvisitedCount` is a word of `counters`; the sweep emits a vertex list instead of design 8.10's `nextBits`, which is what keeps it at 8 (P8-T8 Step 2) |
| `bfs-bitset-build` | P8-T8 | frontierIn, counters, frontierBits (3) | -- (the vertex list to bitset hand-off) |
| `bfs-unvisited-flags` | P8-T8 | rowPtr, revRowPtr, depth, flags, counters (5) | -- (the unvisited list's producer, P8-T8 Step 1) |
| `sssp-relax` | P8-T9 | rowPtr, colIdx, weights, dist, pred, nearIn, nearOut, farQueue (8) | "SSSP near-far relax", 8 |
| `sssp-pred` | P8-T9 | rowPtr, colIdx, weights, dist, pred, frontier (6) | "SSSP predecessor pass", 6 |
| `bf-relax` | P8-T10 | edgeSrc, edgeDst, edgeWeight, dist, pred, flags (6) | -- (design 8.4's edge-parallel relax) |
| `closeness-reduce` | P8-T11 | depthK, counts, out (3) | -- |

The SSSP relax row is at exactly 8 and stays there only because the queue counters and `delta` share the first 16 bytes of the `nearOut` buffer as an offset binding, which design 8.10 states and P8-T9 must honour.

Two rules make this table an expectation the descriptor test can assert rather than a copy of design 8.10. First, EVERY frontier counter -- the frontier count, the next frontier's count, the degree sums, the edge counts, the chunk cursor, the level, the unvisited numbers -- is a word of the one `FrontierCounters` block of Step 3, so a kernel that touches any of them binds `counters` once and a row that design 8.10 spells with two or three separate counters is one or two bindings SHORTER here. Storage counters cannot be split into per-word bindings even if that were wanted: `Kernel.bind` rejects a binding whose offset is not a multiple of 256 bytes (`src/kernel/kernel.ts`, `STORAGE_ALIGN`), and a four-byte word is not 256-aligned. Second, `bfs-contract` has no `owner` binding at all (DEP-P8-B). A count BELOW the design's is inside the budget and is not a departure needing a record; the last column names the design's number so every difference is visible in one place. The descriptor test asserts the count in this table's third column.

- [ ] **Step 3: The counters block, and the kernel that writes each word (PD-8)**

One `UniformBlock.define("FrontierCounters", [...], { layout: "storage" })`, the same storage-mode block pattern `FA2_PARTIAL` uses. Sixteen `u32` words, in byte order: `frontierCount`, `nextFrontierCount`, `frontierDegreeSum`, `prevFrontierCount`, `prevDegreeSum`, `unvisitedCount`, `unvisitedDegreeSum`, `unvisitedListLen`, `edgeCount`, `edgeCountUnclamped`, `chunkStart`, `level`, `visitedCount`, `switches`, `direction`, `done`.

The block is what the HOST decodes the readback with -- field names and byte offsets, one copy. A kernel that updates a word updates it atomically, so it declares its binding as `array<atomic<u32>>` and indexes by the field's byte offset divided by four: a struct of plain `u32` cannot be the target of an `atomicAdd`, and that is a compile error worth expecting rather than discovering. Nothing here is a uniform, because a uniform cannot be written on the device and the whole point of design 5.4 is that the host never sees these values inside a submit. `switches` and `visitedCount` are read back WITH the result in one copy, which is why they live in this block and not in separate buffers.

Every word and the kernel that writes it:

| Word | Written by | Read by |
| --- | --- | --- |
| `frontierCount` | `frontier-finalize` in its level-boundary role, rotated from `nextFrontierCount`; `Frontier.reset` seeds it to 1 | `frontier-finalize` (the dispatch size and both direction tests), `advance-expand`, `bfs-fused`, `bfs-bitset-build` (the loop bound) |
| `nextFrontierCount` | `bfs-contract`, `bfs-fused` and `bfs-bottom-up`, the workgroup-aggregated `atomicAdd` that reserves each block's append span | `frontier-finalize` |
| `frontierDegreeSum` | `advance-expand` and `bfs-fused`, one `atomicAdd` per workgroup for the block's aggregate (P8-T5 Step 1) | `frontier-finalize` (Beamer's `m_f`) |
| `prevFrontierCount`, `prevDegreeSum` | `frontier-finalize`, rotated at the level boundary | `frontier-finalize` (growing / shrinking, and the unvisited subtraction of P8-T8 Step 1) |
| `unvisitedCount`, `unvisitedDegreeSum`, `unvisitedListLen` | `bfs-unvisited-flags` exactly, once per submit; `frontier-finalize` by subtraction at every level boundary in between (P8-T8 Step 1) | `frontier-finalize` (Beamer's `m_u`, the switch-back test, the bottom-up dispatch size), `bfs-bottom-up` (the loop bound) |
| `edgeCount`, `edgeCountUnclamped` | `advance-expand`, workgroup-granular (Step 5) | `frontier-finalize` (the contract's dispatch size and the overflow test), `bfs-contract` (the loop bound) |
| `chunkStart` | `frontier-finalize`, when the unclamped total exceeded the capacity (Step 5) | `advance-expand` |
| `level` | `frontier-finalize`, incremented at the level boundary | every claim kernel -- it is the value written into `depth` |
| `visitedCount` | `frontier-finalize`, `+= frontierCount` at the level boundary | the host, with the result |
| `switches` | `frontier-finalize`, on a direction change (P8-T8 Step 4) | the host, with the result; the differential test asserts it |
| `direction` | `frontier-finalize` | `frontier-finalize` at the next level |
| `done` | `frontier-finalize`, set when the rotated `frontierCount` is zero | the HOST: these are the four bytes read back once per submit |

Three words have no writer until P8-T8 adds `bfs-unvisited-flags`, and `switches` none until P8-T8 adds the switch. They are declared here anyway, because the block's byte layout is what the single result copy decodes and growing it later would re-cut every readback offset; each reads as zero until then, and P8-T8 Step 4 is the only reader that cares.

- [ ] **Step 4: The `Frontier` class**

```ts
export class Frontier {
    readonly vertices: readonly [Binding, Binding];   // two n-slot u32 queues
    readonly counters: Binding;                       // the FrontierCounters block -- every count in the phase is a word of it
    readonly args: Binding;                           // INDIRECT | STORAGE | COPY_DST, levels x candidates slots
    readonly edgeQueue: Binding;                      // capacity entries, see Step 5
    readonly edgeCapacity: number;
    swap(): void;
    reset(pass: GPUComputePassEncoder, source: number): void;
}
```

There is deliberately no pair of standalone count buffers: `frontier-finalize` binds two things (the block and the args, design 8.10), so a count it cannot reach is a count the device-side selector cannot act on. `swap()` therefore flips only the two vertex queues; the counts rotate inside the block, which Step 3 describes. Every buffer comes from ONE `Lease` so `dispose()` releases them together (design 4.4). `reset` records `fill` dispatches, never an encoder clear, so a reset is inside the caller's pass and costs no extra submit. `swap()` is a host-side index flip between two cached bind-group sets -- and it must be two BUFFERS, not two ranges of one buffer, for the reason the P7 plan recorded: `Kernel.bind` compares access modes before it tests ranges and rejects one buffer bound `storage-ro` and `storage` in one dispatch even for disjoint ranges.

- [ ] **Step 5: The edge queue and the overflow rule**

`edgeCapacity = min(arcCount, floor(caps.limits.maxStorageBufferBindingSize / 4))`. At the 1M node / 10M edge tier that is 20M entries = 80 MB, under every device's binding limit, so no overflow is possible there and the chunk path is dead code on real hardware -- which is exactly why design 13's gate tests it with a FAKED 4,096-entry capacity. The rule: `advance-expand` appends with a workgroup-granular `atomicAdd` on `edgeCount`, clamps its writes to the capacity, and also adds into `edgeCountUnclamped`; `frontier-finalize` compares the two and, when the unclamped total is larger, writes `chunkStart` and records another expand dispatch for the remaining source range. At most `ceil(arcCount / capacity)` chunks per level, all recorded in the same batch. Silent truncation is never possible, and the `edgeCountUnclamped` word is what makes that statement checkable rather than a promise.

- [ ] **Step 6: `frontier-finalize`, the selector**

One workgroup, one lane, no barrier after the early return (rule 1 of the WGSL conventions: the early return keys on `workgroup_id` and uniforms only). It is recorded TWICE per level in two roles chosen by a uniform field, because a level's dispatch sizes become known at two different moments. In the LEVEL-BOUNDARY role it rotates the counts (`prevFrontierCount`, `prevDegreeSum` take the values just finished, `frontierCount` takes `nextFrontierCount`, and `nextFrontierCount` and `frontierDegreeSum` are zeroed), increments `level`, adds the finished frontier into `visitedCount`, subtracts it from the unvisited words, sets `done` when the new count is zero, and writes the args of the candidates that expand a vertex frontier. In the EDGE-QUEUE role it only turns `edgeCount` into the contract's args. In both roles it reads the counters block, evaluates the candidate rule for the level, and writes `(x, y, 1, count)` into the chosen 16-byte slot and `(0, 0, 1, 0)` into every other slot of that level. The `(x, y)` arithmetic is P4's `indirect-finalize` arithmetic verbatim: `groups = ceil(count / wg)` computed as `count / wg + select(0u, 1u, count % wg != 0u)` -- never `(count + wg - 1) / wg`, which wraps for a count above `2^32 - wg` -- then the 2D split at `MAX_WORKGROUPS_PER_DIM`. **DEP-P8-C's anti-drift check:** the test asserts that for 2,000 counts spanning 0 to `2^32 - 1`, `frontier-finalize` and P4's `indirect-finalize` write identical `(x, y)` pairs, and that both agree with the host's `planIndirect`.

In this task the candidate rule is the trivial one: candidate 0 always, `(0, 0, 1)` into the rest. P8-T7 adds the fused threshold, P8-T8 adds Beamer's test. Landing the selector empty first is deliberate: it means P8-T6 can ship a correct BFS before any of the selection logic exists, and every later task changes one branch of one kernel with the whole differential suite already standing behind it.

- [ ] **Step 7: The tests, which need no traversal**

`test/primitives/frontier.test.ts` drives the machinery with a synthetic counters buffer and no graph at all: seed a frontier and read the queue back; `swap()` twice returns to the start; `reset` zeroes every word of the counters block and seeds `frontierCount` to 1; write a count into the counters block, record `frontier-finalize`, read the args back and compare with `planIndirect`; the 2,000-count agreement check of Step 6; a count of 17,000,000 produces `x = 65535, y = 260` and dispatches (design 13's gate item "the indirect finalize clamps above 65,535 workgroups (a synthetic 17M frontier on lavapipe)"), which this task can run because it needs no real frontier -- only a counters word and an empty kernel to dispatch. Run it on lavapipe specifically, because that is the adapter the gate names.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/frontier.test.ts` then the same with `$GPU_NV`.
Expected: PASS on both; the 17M case green on lavapipe.

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): the frontier queue and the device-side dispatch selector`.

---

### Task P8-T5: The `advance` primitive -- block-mapped expansion, the workgroup tier, the subgroup twin

**Depends on P8-T3 and P8-T4. The largest single task in the phase.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 6 row 8 line 1575 (the block-mapped structure, the workgroup-per-row tier, the subgroup tier, the workgroup-granular append, the degree-sum counter); design 6 lines 1581-1598 (the subgroup rule and the twin discipline); design 8.10 "BFS expand" (7 bindings).

**Files:**
- Create: `$PKG/src/wgsl/advance-expand.wgsl.ts`
- Create: `$PKG/src/primitives/advance.ts`
- Modify: `$PKG/src/kernels.ts`
- Create: `$PKG/test/oracle/advance.ts`, `$PKG/test/primitives/advance.test.ts`
- Modify: `$PKG/test/helpers/override-matrix.ts`, `$PKG/test/helpers/sabotage.ts`

- [ ] **Step 1: The block-mapped body, and the uniformity trap it walks into**

Each workgroup loads up to `WG` frontier vertices, reads their degrees, runs a workgroup-memory exclusive scan of those degrees, and then every invocation strips the range `[local, aggregate)` by binary search (`upper_bound`) over the scanned degrees to find which source vertex its arc belongs to. The trap: the guarded loads (`if (i < count)`) must write into locals and the workgroup scan must run UNCONDITIONALLY after the guard, because `workgroupBarrier` inside the guard is rejected by Tint with "must only be called from uniform control flow". This is rule 1 of the package's WGSL conventions and it is the single most likely reason this body will not compile on the first try. Write the guarded load as `let deg = select(0u, rowPtr[v + 1u] - rowPtr[v], i < count);` and scan `deg` for every lane.

The append is workgroup-granular: one `atomicAdd` on `edgeCount` per workgroup for the whole block's aggregate, then every lane writes at its own offset within the reserved span. One atomic per 256 arcs, not one per arc. The same block's aggregate is added into `frontierDegreeSum` in the counters block, which is the number `frontier-finalize` needs for Beamer's test in P8-T8 -- produce it now even though nothing reads it yet, because retrofitting a counter into a tiered kernel later means re-proving three tiers.

- [ ] **Step 2: The tiers, and the one override axis**

`TIER` override: 0 = block-mapped (the default, every frontier), 1 = workgroup-per-row for rows above 1,024 arcs. The row set for tier 1 comes from `degreeTiersOf(residency.view(s, "degreeOrder"))` (P4's helper in `src/primitives/core-shape.ts`), whose `segmentOffsets` is `[0, hiEnd, midEnd, lowEnd, n]`. When the frontier is small, a per-frontier degree check is cheaper than consulting the tiers -- design 6 row 8 allows either; this phase uses the tier view when the frontier exceeds `FUSED_FRONTIER_MAX` and the per-frontier check below it, and states so in the JSDoc. The subgroup variant is `needs: ["subgroups"]` on the same entry with the workgroup scan replaced by `subgroupExclusiveAdd` plus a cross-subgroup fixup; the subgroup index comes from an elected-lane `atomicAdd` and `subgroupBroadcast`, never from `@builtin(subgroup_id)`, which Chromium lacks.

- [ ] **Step 3: The chunked expansion**

Implement the overflow rule P8-T4 Step 5 specified: clamp the writes, always add into `edgeCountUnclamped`, and read `chunkStart` from the counters block as the first frontier index this dispatch is responsible for. Record `ceil(arcCount / edgeCapacity)` expand slots per level in the args buffer; on real hardware all but the first get `(0, 0, 1)` every time.

- [ ] **Step 4: The oracle and the differential suite**

`test/oracle/advance.ts` is a nested loop: for each vertex in the frontier, for each arc, emit the arc. The kernel's edge queue is a MULTISET in an order the schedule chooses, so the test sorts both sides before comparing -- and asserts the run-twice check on the SORTED form plus on `edgeCount` and `frontierDegreeSum` raw, which are order-independent sums. Fixtures: the empty frontier (records nothing and leaves both counters 0), a single-vertex frontier, the whole vertex set of `karate`, a `starEdges(10000)` hub as the only frontier entry (tier 1), `gridEdges(100, 100)` at every level, and `rmatEdges(16, 10, 1)`. Each at `TIER` 0 and 1 and with the subgroup twin in-process, asserting the three agree bitwise on the sorted queue.

Then the gate's overflow case: construct a `Frontier` with `edgeCapacity` FAKED to 4,096 and expand a level whose degree sum is 50,000. Assert the chunked path produces the same multiset as the unchunked one, `edgeCountUnclamped === 50000`, and the number of chunks is `ceil(50000 / 4096)`.

- [ ] **Step 5: The sabotage rows (at least three, design 13 rule (f))**

Add to `test/helpers/sabotage.ts`: the workgroup scan replaced by an inclusive one (every lane reads the wrong source); the binary search's `upper_bound` turned into a `lower_bound` (off by one at every block boundary); the per-workgroup `atomicAdd` replaced by a per-lane one (the aggregate reserved once per lane, so the queue interleaves); the last block's rows skipped (`count - 1` instead of `count`); `edgeCountUnclamped` not incremented (the overflow test stops detecting overflow). Each must fail `test/primitives/advance.test.ts` by at least 10x, and `test/sabotage/coverage.test.ts` will assert each `find` string occurs exactly once in the live body.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/advance.test.ts` then `$GPU_NV`, then `GRAPHTY_GPU_NO_SUBGROUPS=1` with each.
Expected: PASS everywhere; the sorted queues bitwise identical across all four runs.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): the block-mapped advance primitive and its chunked edge queue`.

---

### Task P8-T6: Breadth-first search, two-phase top-down -- the first working traversal

**Depends on P8-T2, P8-T4 and P8-T5. This is the task that makes the phase deliver something.**

**Repository:** `$WT`; `$PKG` = `$WT/webgpu-graph-algorithms`.

**Spec:** design 8.4 lines 2629-2670 (the two-phase workhorse, the atomic claim and why it is not a compare-exchange, the 32-levels-per-submit host loop and why a per-level readback is disqualifying); design 8.10 "BFS contract" (7 bindings); design 9.7 line 3269 (the parity rule); design 3.3 line 798 (the signature).

**Files:**
- Create: `$PKG/src/wgsl/bfs-contract.wgsl.ts`
- Create: `$PKG/src/algorithms/bfs.ts`
- Modify: `$PKG/src/kernels.ts`
- Create: `$PKG/test/algorithms/bfs.test.ts`
- Modify: `$PKG/test/helpers/sabotage.ts`, `$PKG/src/kernel/prelude.ts` (the `F32_INF_BITS` constant is P8-T9's; this task adds nothing to the prelude)

- [ ] **Step 1: PD-6 -- the claim, and why there is no retry loop**

`depth` is `array<atomic<u32>>` initialised to `INVALID_INDEX` by a `fill` dispatch, with `depth[source] = 0`. The contract phase, over the edge queue, does:

```
let old = atomicMin(&depth[v], level);
if (old == INVALID_INDEX) {
    parent[v] = u;
    append v to frontierOut;
}
```

The invocation that observes `INVALID_INDEX` is the unique winner, because `atomicMin` is a single atomic read-modify-write and only the first one at this level can see the sentinel. Design 8.4 is explicit about why this is not `atomicCompareExchangeWeak`: WGSL 17.8.5 says it "may spuriously fail on some implementations", so a compare-exchange claim needs a retry loop, and a vertex could go unclaimed for its level if the loop is bounded. `atomicMin` has no such failure mode. `parent[v]` is a plain (non-atomic) store from the winner only, so it never races.

- [ ] **Step 2: PD-5 -- why no dedupe here**

The edge queue contains duplicates: a vertex with three frontier neighbours appears three times. All three run the claim; exactly one wins; exactly one appends. The output vertex frontier is duplicate-free by construction, so design 8.4's ownership dedupe has nothing to remove (DEP-P8-B). Say this in the driver's JSDoc, because the next reader will otherwise wonder where the dedupe went.

- [ ] **Step 3: The host loop (PD-7)**

```
for each submit:
    batch = new CommandBatch(...)
    pass = batch.pass("bfs")
    for level in 0 .. MAX_LEVELS_PER_SUBMIT - 1:
        record frontier-finalize (the level-boundary role: rotates the counts, writes this level's expansion args)
        record advance-expand   (indirect, this level's expand slot)
        record frontier-finalize (the edge-queue role: turns edgeCount into the contract's args)
        record bfs-contract     (indirect, this level's contract slot)
        frontier.swap()
    batch.endPass()
    readback 4 bytes: counters.done
    batch.submit()
```

An empty frontier makes every following level's args `(0, 0, 1)`, so the extra recorded levels are no-ops and the loop is correct without knowing the diameter -- that is the property design 5.4 exists for. The `signal` is checked between submits, never inside one. `onProgress(level, maxLevels)` fires per submit. At the end, one copy brings back `depth`, `parent`, `order` and the counters block.

`order` is produced by the contract phase's append order and is therefore grouped by level but arbitrary within a level (PD-14). `visitedCount` and `levels` come from the counters block.

- [ ] **Step 4: The differential suite**

Against `bfsOracle` from P8-T2, on the fixture list design 11.3 names: the empty graph, one node, one self-loop, `KARATE_EDGES`, `gridEdges(30, 30)`, `pathEdges(500)`, `starEdges(10000)`, `completeEdges(64)`, `randomEdges` and `randomEdgesLoose` with self-loops and parallels, `rmatEdges(14, 10, 7)`, directed and undirected, from several sources including an isolated vertex. For each: `depth` EXACT (`toEqual` on the typed array, not a tolerance -- these are `u32`); `expectLevelConsistent`; `expectOrderGroupedByLevel`; `visitedCount` equals the oracle's reached count; the run-twice bitwise check on `depth` and on the counters; `validate({ checksum: true })` on the snapshot afterwards, which proves no kernel wrote into a view.

Then the gate's two named fixtures: `gridEdges(1000, 1000)` -- a million nodes and roughly 2,000 levels, which is what the `mapAsync` bound is about -- asserting through `test/helpers/leak-counter.ts` that the `mapAsync` count is at most `levels / 32 + 1`; and the 10,000-degree star, which puts a single row through the workgroup tier.

- [ ] **Step 5: The sabotage rows**

`atomicMin` replaced by a plain `min` and store (the claim stops being exclusive, several vertices append); `old == INVALID_INDEX` replaced by `old > level` (correct-looking, but a vertex re-appends at every later level and `order` explodes); `parent[v] = u` moved outside the winner branch (a loser overwrites the winner's parent, breaking level consistency); the level counter not incremented (every depth becomes 0 or invalid). Each fails `test/algorithms/bfs.test.ts` by at least 10x.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/bfs.test.ts` then `$GPU_LLVM`.
Expected: PASS on both, `depth` bitwise identical between the two adapters.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): breadth-first search on the GPU frontier`.

---

### Task P8-T7: The fused expand-contract kernel and the device-side per-level choice

**Depends on P8-T6.**

**Spec:** design 8.4 lines 2634-2636 (the fused variant for frontiers below 4,096 entries, Merrill's fleeting iterations); design 6 row 8 (both variants recorded for every level, the threshold as a uniform, the unselected slot gets `(0, 0, 1)`, never a host choice); design 8.10 "BFS fused expand-contract" (8 bindings).

**Files:** Create `$PKG/src/wgsl/bfs-fused.wgsl.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/wgsl/frontier-finalize.wgsl.ts`, `$PKG/src/algorithms/bfs.ts`, `$PKG/test/algorithms/bfs.test.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: The fused body.** The block-mapped expansion of P8-T5 with the claim of P8-T6 applied inline instead of appending to an edge queue -- one dispatch, no edge queue traffic, which is the whole win for a tiny frontier. It reuses the same workgroup scan and the same `upper_bound` strip; keep the two bodies' shared arithmetic textually identical so a reader can diff them.
- [ ] **Step 2: The selector branch.** In `frontier-finalize`, add: `if (frontierCount < FUSED_MAX) { write args into the fused slot; zero the expand and contract slots } else { the reverse }`. `FUSED_MAX` is a uniform field, not a compile-time constant, so a test can set it to 0 or to `U32_MAX` and force either path without recompiling.
- [ ] **Step 3: Both paths agree.** Run the whole P8-T6 suite three times: threshold 0 (never fused), threshold `U32_MAX` (always fused), and the real default. All three produce identical `depth` and equal `order` as a per-level set. Then, on `rmatEdges(14, 10, 7)` at the real default, read the counters back per submit and assert BOTH paths were chosen at least once -- design 13's gate item "the device-side selection picks each at least once on an RMAT fixture". Record which levels chose which in the gate record.
- [ ] **Step 4: Three sabotage rows** on the fused body (the claim moved outside the guard; the scan made inclusive; the frontier count read from the wrong slot) and one on the selector (the comparison inverted, so the fused path runs on a 10M-entry frontier and overruns its workgroup budget).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/bfs.test.ts` then `$GPU_LLVM`.
Expected: PASS; the "each path chosen at least once" assertion green on the RMAT fixture.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): the fused BFS level and the device-side per-level choice`.

---

### Task P8-T8: Direction-optimizing BFS -- the unvisited set, the bitset, the bottom-up sweep, Beamer's test

**Depends on P8-T7, and on P8-T3's `compact`. Needs P7's `reverse()` residency.**

**Spec:** design 8.4 lines 2641-2652 (Beamer's constants, the switch conditions, the bitset frontier, the non-zero-degree unvisited list the sweep iterates, the bulk non-atomic path above 40% of `n`, and the rule that the switch is evaluated on the device from counters the advance already produces); design 8.10 "BFS bottom-up" (8 bindings).

**Files:** Create `$PKG/src/wgsl/bfs-bottom-up.wgsl.ts`, `$PKG/src/wgsl/bfs-bitset-build.wgsl.ts`, `$PKG/src/wgsl/bfs-unvisited-flags.wgsl.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/wgsl/frontier-finalize.wgsl.ts`, `$PKG/src/algorithms/bfs.ts`, `$PKG/test/algorithms/bfs.test.ts`, `$PKG/test/helpers/sabotage.ts`. NOT touched: `$PKG/src/primitives/compact.ts` -- this task CALLS `prepareCompact` from P8-T3 and adds nothing to it.

- [ ] **Step 1: The unvisited set, which is the thing Beamer's test is against (PD-18)**

A bottom-up level sweeps the vertices that have NOT been reached, so this task must first produce four things that nothing earlier in the phase produces: `unvisitedList` (the unvisited vertices with a non-zero in-degree -- what the sweep iterates), `unvisitedListLen` (what sizes the sweep's dispatch), `unvisitedDegreeSum` (the out-degree sum of the unvisited vertices, Beamer's `m_u`) and `unvisitedCount`. They are produced two ways and both are needed.

*Exactly, once per submit.* A new kernel, `bfs-unvisited-flags`, grid-strides over the vertices. For each `v` it writes `flags[v] = 1` when `depth[v] == INVALID_INDEX` and `revRowPtr[v + 1] - revRowPtr[v] != 0`, else 0, and adds into three counter words: `v`'s OUT-degree into `unvisitedDegreeSum` and one into `unvisitedCount` for every unvisited vertex, one into `unvisitedListLen` for every flagged one. All three adds are workgroup-aggregated, one atomic per workgroup and not one per vertex, the same discipline as `advance-expand`. Then `prepareCompact` from P8-T3 turns `flags` into `unvisitedList`. The three words are zeroed by a `fill` dispatch recorded immediately before, in the same pass. `flags` and `unvisitedList` are two more `n`-word allocations and `compact`'s own `outCount` is a four-byte one; all three are taken by the BFS driver from the lease the `Frontier` already holds, so they are released with it, and the `Frontier` class of P8-T4 does not change. Step 5 asserts `compact`'s count equals `unvisitedListLen`, which costs nothing and cross-checks the compaction.

The host records this rebuild ONCE at the top of every submit, before the 32 levels, unconditionally -- never per level, never gated on the direction, so it needs no candidate slot and costs one pass over `n` per 32 levels. On the 1000 x 1000 grid that is about 60 rebuilds across a 2,000-level traversal; on an RMAT graph of diameter 10 it is one.

*By subtraction, at every level in between.* Inside a submit the unvisited set only shrinks, and `frontier-finalize` already holds the numbers that say by how much: in its level-boundary role it does `unvisitedCount -= prevFrontierCount` and `unvisitedDegreeSum -= prevDegreeSum`. `prevDegreeSum` is the degree sum of the frontier the previous level expanded, which `advance-expand` measured while expanding it (P8-T5 Step 1), so while every level is top-down the subtraction is exact. Two things make it the "unvisited degree estimate" the design calls it rather than an exact count: both numbers are one level stale, because a frontier's degree sum is only known once it has been expanded; and a bottom-up level expands nothing, so `unvisitedDegreeSum` stops falling while bottom-up runs and overstates the set afterwards. The bias is one-directional -- an overstated `m_u` makes the switch INTO bottom-up harder, never easier -- and the next submit's rebuild makes both exact again. Say that in the kernel's JSDoc, with this paragraph's reason.

Because the list is up to 32 levels stale it holds vertices that have since been claimed. The sweep skips them on the `depth[v] == INVALID_INDEX` test it has to make anyway, so staleness costs a few wasted reads and can never produce a wrong depth.

- [ ] **Step 2: The bitset and the hand-off.** ONE `n/32`-word bitset, rebuilt per level rather than ping-ponged. `bfs-bitset-build` turns the vertex-list frontier into `frontierBits` with `atomicOr`, and takes the bulk non-atomic path when `frontierCount >= 0.4 * n` (the plain store is safe there because the kernel is writing whole words it owns). The bottom-up sweep appends the vertices it claims to `frontierOut` as a plain vertex list, exactly as the contract phase does, and writes NO second bitset: the next level's bits come from `bfs-bitset-build` running over that list, which is a recorded candidate of every level anyway. That leaves one representation of a frontier in the whole phase -- a vertex list plus a count -- makes the bottom-up-to-top-down hand-off free, and is what keeps the sweep inside the eight storage buffers design 8.10 gives it: with design 8.10's `nextBits` gone there is room for `frontierOut` and for the counters block (P8-T4 Step 2).
- [ ] **Step 3: The bottom-up sweep.** Over `reverse()` (the forward arrays when the snapshot is undirected, which P7's residency already aliases at zero upload cost), one invocation per entry of `unvisitedList[0 .. unvisitedListLen)`. An entry whose `depth` is no longer `INVALID_INDEX` returns at once (Step 1's staleness). The rest scan their in-neighbours and stop at the FIRST one in `frontierBits`: that is the early exit that makes bottom-up cheap and it must be a real `break`, not a full scan with a flag. The winner writes `depth[v]` (an `atomicStore`, because `depth` is `array<atomic<u32>>` for the top-down kernels -- but no claim race is possible here, since the list holds each vertex exactly once and the sweep is vertex-parallel), writes `parent[v] = u` and appends `v` to `frontierOut` through the workgroup-aggregated `atomicAdd` on `nextFrontierCount`.
- [ ] **Step 4: The switch, on the device.** In `frontier-finalize`'s level-boundary role: switch to bottom-up when `frontierDegreeSum > unvisitedDegreeSum / alpha` AND the frontier is growing (`frontierCount > prevFrontierCount`); switch back when `frontierCount * BEAMER_BETA < unvisitedCount` AND it is shrinking. `alpha = arcCount / nodeCount` is computed on the host and passed as a uniform; `BEAMER_ALPHA` (14, Beamer's published value) is the fallback for a graph with no nodes, where that ratio is undefined. Increment `switches` on every change and write `direction` for the next level. Every counter the test reads is a word of the block, and P8-T4 Step 3's table names the kernel that writes each: the two frontier numbers come from `advance-expand` and the contract, the two unvisited numbers from Step 1 above.
- [ ] **Step 5: Proof.** `direction: "top-down"` disables the bottom-up candidate; run the whole suite in both modes and assert identical `depth`. On `rmatEdges(16, 10, 3)` assert `switches > 0` at the default and `switches === 0` under `"top-down"` -- design 13's gate item. Add the RMAT fixture to the run-twice check: `switches` is a device counter over a deterministic rule, so it is reproducible and must be asserted as such. Assert the unvisited bookkeeping directly too, because a switch decided from wrong counters is a switch that fires at the wrong level and no depth comparison would notice: after the first submit's rebuild on `gridEdges(30, 30)`, `unvisitedCount === n - 1` and `unvisitedDegreeSum === arcCount - outDegree(source)`; on a fixture with isolated vertices `unvisitedListLen` excludes them while `unvisitedCount` counts them; `unvisitedListLen` equals `compact`'s scratch `outCount` on every rebuild; and on the 1000 x 1000 grid the rebuild count is `ceil(levels / 32)`, which the leak counter's dispatch record shows.
- [ ] **Step 6: Six sabotage rows, three on the sweep and three on the unvisited kernel** (design 13 rule (f) asks three per kernel). On the sweep and the selector: the early `break` removed, so bottom-up costs the same as top-down but still gives the right answer -- that one must be caught by a TIMING or dispatch-count assertion rather than by a wrong depth, so say in the row that its check is the benchmark's, not the differential's; `atomicOr` replaced by a plain store in the bitset build; the growing / shrinking comparison inverted, so the two directions thrash and `switches` exceeds `levels`. On `bfs-unvisited-flags`: every vertex flagged instead of only the unvisited ones, so the list never shrinks and `unvisitedDegreeSum` never falls and the switch fires at the wrong level; the in-degree test inverted, so isolated vertices fill the list and the sweep scans rows that cannot be claimed; the degree sum accumulating the IN-degree instead of the out-degree, which is Beamer's ratio measured against the wrong quantity and is invisible on any undirected fixture -- so that row's check runs on a directed one. All three are caught by Step 5's counter assertions, which is why those are assertions and not prose.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/bfs.test.ts` then `$GPU_LLVM`.
Expected: PASS; `switches > 0` on RMAT; identical depths in all three modes.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): direction-optimizing BFS with a device-side switch`.

---

### Task P8-T9: Weighted single-source shortest paths over the near-far queue

**Depends on P8-T5 and P8-T6 (the frontier and the host-loop shape) and on P8-T3 (`compact`).**

**Spec:** design 8.4 lines 2671-2681 (Davidson's near-far, the f32 bit pattern under `atomicMin`, the delta rule, the 16 near subpartitions, the two routings, the predecessor pass, the near-empty device flag); design 8.10 "SSSP near-far relax" (8 bindings, with the counters and `delta` inside the `nearOut` header) and "SSSP predecessor pass" (6).

**Files:** Create `$PKG/src/wgsl/sssp-relax.wgsl.ts`, `$PKG/src/wgsl/sssp-pred.wgsl.ts`, `$PKG/src/algorithms/sssp.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/kernel/prelude.ts` (add `F32_INF_BITS = 0x7F800000u` beside `INVALID_INDEX`), `$PKG/test/helpers/sabotage.ts`; create `$PKG/test/algorithms/sssp.test.ts`.

- [ ] **Step 1: PD-9 -- distances as bit patterns, and why the result is bitwise reproducible**

`dist` is `array<atomic<u32>>` holding the IEEE-754 bit patterns of the f32 distances, `0x7F800000` (+Inf) for unreached. `atomicMin` on the bit patterns is exactly `min` on the values, because for non-negative IEEE-754 floats the unsigned bit-pattern order is the value order. That is the whole trick and it needs no float atomic, which WGSL does not have.

The consequence is worth stating because it changes how this task is TESTED: every candidate value is one f32 add, `dist[u] + w`; the near-far loop keeps relaxing until both piles are empty, so every path is eventually offered; and the settled value is the minimum of a fixed set of f32 numbers. A minimum is order-independent. So `dist` is bitwise reproducible run to run, bitwise identical across adapters, and -- PD-10 -- bitwise equal to the f32 Dijkstra oracle of P8-T2. The differential test compares `dist` with `toEqual` on a `Uint32Array` view of both, not with a tolerance. The f64 oracle is compared with a tolerance, and that tolerance is DERIVED: it is whatever spread P8-T2 Step 3 measured between f32 and f64 on the same fixture, times ten, recorded in `benchmarks/results/noise-floor.json`. On a 2,000-hop path the f32 drift is around `1e-4` relative, which is looser than design 9.7's `1e-5`; if the measurement confirms that, the tolerance is re-fixed by a recorded owner decision in the pull request and never quietly loosened in the test file (design 10.4's rule, restated in 11.9 item 3).

- [ ] **Step 2: The two routings, checked before any device work**

`flags.allWeightsOne` (graph-format's snapshot flag, `graph-format/src/snapshot/validate.ts`) routes to `breadthFirstSearch` and converts the `u32` depths to `f32` distances -- not a fallback, a better algorithm for the input. `flags.nonNegativeWeights === false` throws `E_UNSUPPORTED { feature: "sssp.negativeWeights", hint: "use bellmanFord" }`. Both are host-side checks before the first dispatch, and both are tested.

- [ ] **Step 3: The near-far structure**

`delta = SSSP_DELTA_FACTOR * avgWeight / avgDegree` computed on the host from the snapshot's totals unless `options.delta` overrides it, and passed in the header block. A relaxation whose new distance is below `nearThreshold` appends to the near pile, otherwise to the far pile. The near pile is two-level with `NEAR_SUBPARTITIONS` (16) subpartitions. When the near pile empties, the threshold advances by `delta` and the far pile is split by `compact` into the new near pile and the remaining far pile. The near-empty test is a device flag turned into a zero indirect dispatch, so a batch's extra recorded rounds are no-ops -- the same property the BFS loop relies on. Duplicates ARE possible here (a vertex can be relaxed several times before it settles), which is where `dedupe` from P8-T3 earns its place.

- [ ] **Step 4: PD-11 -- the predecessor pass**

After the queues empty, one pass over every settled vertex: for each in-arc `(u, v, w)`, if `fround(dist[u] + w) == dist[v]` then `atomicMin(&pred[v], arc)`. Ties differ from the CPU oracle's choice, so the test asserts `expectPredArcAttains` from P8-T2 rather than equality. Packing the arc index into the distance atomic is impossible: WGSL has no 64-bit atomic, and a two-word "atomic" is not atomic (the design records the same finding for the minimum spanning tree in section 8.5).

- [ ] **Step 5: The differential suite.** The P8-T6 fixture list with weights: uniform random in `[0.1, 10]`, integer weights, a graph containing zero-weight arcs (the gate names it), a graph whose weights span six orders of magnitude, directed and undirected, unreachable components. For each: `dist` bitwise equal to the f32 oracle; within the derived tolerance of the f64 oracle; `expectTriangleInequality`; `expectPredArcAttains`; `reachedCount` correct; the run-twice bitwise check; the `allWeightsOne` route asserted to produce exactly what `breadthFirstSearch` produces on the same graph; `E_UNSUPPORTED` on a negative weight.
- [ ] **Step 6: Three sabotage rows** (the comparison in the near / far split inverted, so everything lands in one pile and the answer is right but the round count explodes -- again a dispatch-count check, state it; `atomicMin` replaced by a plain store; `dist[u] + w` replaced by `dist[u]`, which turns the answer into hop counts and fails the f32-exactness check immediately; the predecessor pass's equality replaced by `<=`, so `predArc` names an arc that does not attain).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/sssp.test.ts` then `$GPU_LLVM`.
Expected: PASS on both; `dist` bitwise identical across the two adapters AND equal to the f32 oracle.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): near-far single-source shortest paths`.

---

### Task P8-T10: Bellman-Ford with negative-cycle detection

**Depends on P8-T9 (the result type and the oracle) and on P7's `edgeList()` residency. Needs no frontier at all, so it may be written in parallel with P8-T7 and P8-T8 provided its `src/kernels.ts` append is applied after theirs.**

**Spec:** design 8.4 lines 2681-2685 (edge-parallel relax over `edgeList()` both directions on undirected, `n - 1` rounds with a changed flag every 8, one more round for the negative-cycle flag, and the note that signed floats need a compare-exchange loop on the bit pattern); design 3.3 line 823.

**Files:** Create `$PKG/src/wgsl/bf-relax.wgsl.ts`, `$PKG/src/algorithms/bellman-ford.ts`, `$PKG/test/algorithms/bellman-ford.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: PD-12 -- why the compare-exchange must be bounded.** `atomicMin` on bit patterns works only for non-negative floats; with a negative distance the bit-pattern order reverses. So the relax is a compare-exchange loop on the bit pattern: read, compute, compare as floats, try to exchange. WGSL 17.8.5 allows `atomicCompareExchangeWeak` to fail spuriously, so an unbounded loop can in principle spin; bound it (16 attempts is generous -- contention is per-vertex, not global) and set a `retryExhausted` word in the flags block if the bound is ever hit. The driver then runs one extra round rather than returning a wrong answer, and the test asserts the word stays 0 on every fixture so the bound is known to be adequate rather than assumed. This is the same discipline the connected-components link loop of design phase P7 uses.
- [ ] **Step 2: The rounds.** `n - 1` rounds over `edgeList()` (each edge once, correct for directed and undirected alike), a device `changed` flag checked every 8 rounds so the loop can stop early, then one more round that sets `hasNegativeCycle` if anything still improves. The flag words share one small block, as the binding budget requires.
- [ ] **Step 3: Proof.** Against `bellmanFordOracle`: the P8-T9 fixture list plus graphs with negative but acyclic weights, a planted negative cycle (the gate's item), a negative cycle unreachable from the source (the flag must be FALSE -- this is the case a naive implementation gets wrong), and a zero-weight cycle (also false). `dist` compared to the f64 oracle within the derived tolerance and cross-checked against `sssp` on the same graph when all weights are non-negative. Run-twice bitwise on `dist` and on the flags.
- [ ] **Step 4: Three sabotage rows** (the extra detection round deleted; the compare-exchange result ignored, so a lost update goes unnoticed; the `n - 1` bound made `n - 2`, which fails only on a path fixture -- so the path fixture must be in the list, and that is the point of naming it).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/bellman-ford.test.ts` then `$GPU_LLVM`.
Expected: PASS on both.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): Bellman-Ford with negative-cycle detection`.

---

### Task P8-T11: Closeness, harmonic closeness and eccentricity

**Depends on P8-T6 (and benefits from P8-T8 but does not require it).**

**Spec:** design 8.4 lines 2686-2690 (32 sources per `u32` word as a bit-parallel frontier for unweighted graphs, repeated near-far for weighted, per-source rows reduced on the device without materialising `n x n`, batch size from `maxBufferSize`); design 3.3 line 801; design 9.7 (`1e-5`, integer distances before division).

**Files:** Create `$PKG/src/wgsl/closeness-reduce.wgsl.ts`, `$PKG/src/algorithms/closeness.ts`, `$PKG/test/algorithms/closeness.test.ts`; modify `$PKG/src/kernels.ts`, `$PKG/src/algorithms/bfs.ts` (export the internal level driver so the multi-source form reuses it rather than copying it), `$PKG/test/helpers/sabotage.ts`.

- [ ] **Step 1: PD-13 -- one driver, three outputs.** The three measures are three reductions of the same distance rows: `n_reached / sum d` for closeness, `sum 1/d` for harmonic, `max d` for eccentricity. Build one driver returning all three and let the three public entry points select; the alternative -- three drivers each running its own sweep -- costs three times the traversal for the same rows.
- [ ] **Step 2: The bit-parallel sweep.** 32 sources per `u32` word: `frontierBits[v]` has bit `s` set when `v` is in source `s`'s frontier this level. One advance visits every arc once for all 32 sources at once, which is where the win is. The claim becomes `atomicOr` on a per-source visited word plus a per-source depth write, and the per-source row is reduced into the running accumulators as soon as its level completes, so nothing `n x k` is ever materialised beyond the 32-source batch. Batch count is `ceil(sources / 32)` and the batch size is capped by `maxBufferSize` exactly as design 8.4 says.
- [ ] **Step 3: The weighted case** is repeated near-far: call the P8-T9 driver once per source and reduce on the host between calls. Slow and correct; it is the design's own answer and this phase does not improve on it.
- [ ] **Step 4: Proof.** Against `closenessOracle`: `pathEdges(n)` and `starEdges(k)` have closed-form answers and both are asserted analytically, not just differentially; `KARATE_EDGES` against the oracle; a disconnected graph, where the Wasserman-Faust scaling and the "unreached excluded" rule are the only thing separating a right answer from a plausible one; `sources` given explicitly and compared against the same sources on the CPU. Tolerance `1e-5` relative, which is generous because the distances are integers and only the division is floating point. Run-twice bitwise on the integer sums before the division -- expose them through `inspect()` so the check is on an exact quantity.
- [ ] **Step 5: Three sabotage rows** (an unreached vertex counted as distance 0; the harmonic reciprocal taken before the unreached filter, producing an infinity; the bit-parallel word indexed by source instead of by `source / 32`).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/closeness.test.ts` then `$GPU_LLVM`.
Expected: PASS on both.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): closeness, harmonic closeness and eccentricity`.

---

### Task P8-T12: Window-aware advance

**Depends on P8-T5. May run in parallel with P8-T9, P8-T10 and P8-T11 -- it touches no kernel registry entry, only the advance driver and the core-shape helpers.**

**Spec:** design 4.6 line 1292 (the row this task rewrites) and design 13 row P8 ("window-aware advance (lifting the `E_TOO_LARGE`)"); P4's `windowBinding(core, name, w)` and `assertNotWindowed(core, primitive)` in `src/primitives/core-shape.ts`.

**Files:** Modify `$PKG/src/primitives/advance.ts`, `$PKG/src/wgsl/advance-expand.wgsl.ts` (the rebase term), `$PKG/design`-side nothing; create `$PKG/test/limits/advance-windowed.test.ts`; modify `$PKG/test/primitives/advance.test.ts`.

- [ ] **Step 1: What "windowed" means here.** When `colIdx` exceeds `maxStorageBufferBindingSize`, P4's residency binds it as a series of arc windows and a kernel reads `colIdx[arc - P.arcBase]`. For a row-walking kernel that is one dispatch per window. For `advance` it is the same, with one extra rule: a frontier vertex's row may straddle two windows, so the expansion for a window emits only the arcs inside it and the per-window dispatches accumulate into the same edge queue. The degree sum counter must be accumulated across windows, not overwritten, or the selector reads a fraction of the real value.
- [ ] **Step 2: Replace the refusal.** `advance.ts` currently calls `assertNotWindowed(core, "advance")`; delete the call and implement the window loop. `dedupe` and the near-far relax KEEP their refusal (DEP-P8-E): the near-far split needs the whole arc array bound.
- [ ] **Step 3: Proof.** The cheap, decisive test is a FAKED limit: `test/primitives/advance.test.ts` binds a core with `maxStorageBufferBindingSize` faked to 1 MiB on a 100k-node graph, producing at least 8 windows, and asserts the sorted edge queue equals the unwindowed run's -- the same technique P4 used for windowed `degree`. Include a hub row longer than one window, because that is the case the rebase term exists for. Then one real test in `test/limits/advance-windowed.test.ts`: a graph whose `colIdx` genuinely exceeds the device's binding limit, run on the NVIDIA lane.
- [ ] **Step 4: One sabotage row** -- the rebase term ignored (`colIdx[arc]` instead of `colIdx[arc - P.arcBase]`), which is invisible on the first window and wrong on every later one. P4's `degree` row already has this mutation; add the advance twin beside it.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives/advance.test.ts && eval $GPU_NV pnpm exec vitest run --project=node-limits test/limits/advance-windowed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): window-aware advance`.

---

### Task P8-T13: The accelerator members and the barrel

**Depends on P8-T6, P8-T9, P8-T10, P8-T11 and P8-T12 -- every driver green.**

**Spec:** design 3.3 lines 798-801; design 9.2 (the `AlgorithmAccelerator` mirror); `webgpu-graph-algorithms/CLAUDE.md` step 5 of "Adding an Algorithm / a Kernel".

**Files:** Modify `$PKG/src/accelerator.ts`, `$PKG/src/types/accelerator.ts`, `$PKG/src/index.ts`, `$PKG/test/index.test.ts` (move `breadthFirstSearch`, `sssp`, `bellmanFord`, `closenessCentrality` out of the never-exported list and into the value list), `$PKG/test/types/public-api.test-d.ts`, `$PKG/test/accelerator.test.ts`.

- [ ] **Step 1: PD-16 -- six members, no stubs.** `breadthFirstSearch`, `sssp`, `bellmanFord`, `closenessCentrality`, and the two aliases the closeness driver already computes (`harmonicCentrality`, `eccentricity`) go on the object `createAccelerator` returns, each calling `ctx.assertReady()` first, exactly as `forceAtlas2` does. The accelerator never carries a member that throws `E_UNSUPPORTED`: a member exists when its algorithm ships, and a consumer's feature detection is `typeof accel.sssp === "function"`.
- [ ] **Step 2: The barrel and its two tests.** `src/index.ts` exports the four public functions and the types from `src/types/traversal.ts`. `test/index.test.ts` asserts the exact value list, so the four names must move from `NEVER_EXPORTED` to `VALUE_EXPORTS` in the same commit -- a split commit leaves the suite red.
- [ ] **Step 3: knip must be clean here.** P8-T1's eight unused type exports become used at this step.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip) && eval $GPU_NV pnpm run test:node`
Expected: all clean; knip reports nothing for this package.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the traversal accelerator members and the barrel`.

---

### Task P8-T14: The `bfs` benchmark group and T-10 on both runner classes

**Depends on P8-T13. Parallel with P8-T15.**

**Spec:** design 10.4 line 3415 (T-10: BFS on a 1M-node / 10M-edge RMAT of diameter about 10 in 100 ms or less; a 1000 x 1000 grid of roughly 2,000 levels in 1.5 s or less with `mapAsync` calls at most `levels / 32 + 1`); design 10.3's BFS row (2-5 ms at 100k / 1M, 10-30 ms at 1M / 10M, both marked [X] and therefore replaced by a measurement here, design 13 rule (c)); design 11.7 (the baseline files and `bench:compare`).

**Files:** Create `$PKG/benchmarks/bfs.bench.ts`; modify `$PKG/benchmarks/run.ts` (one line in `GROUPS`), `$PKG/benchmarks/results/nvidia-lovelace-driver580.json`, `$PKG/benchmarks/results/gpu-linux-t4.json`, `$PKG/test/benchmarks.test.ts`.

- [ ] **Step 1: The rows.** BFS on the RMAT ladder (100k / 1M and 1M / 10M) top-down and direction-optimizing, BFS on the 1000 x 1000 grid with the `mapAsync` count reported beside the wall time, SSSP on the same two RMAT tiers, and the fused-versus-two-phase level counts. Report wall time around the whole call including upload, as design 10.4 requires, and the profiler time per pass when `timestamp-query` was granted.
- [ ] **Step 2: PD-17 -- both runner classes before the commit.** Capture on the RTX 4070 SUPER locally and on the T4 lane through a labelled pull request, and land both baseline files in the same commit as the benchmark file. A baseline captured on one class and merged makes `bench:compare` fail on the other for a week.
- [ ] **Step 3: Replace the [X] numbers.** Design 10.3's BFS column and design 10.1's "BFS scratch" column are extrapolations. Record what was measured, and if a measurement misses T-10, do NOT relax the target: design 10.4's rule is that the owner either re-fixes it in a recorded decision in the pull request or the phase continues with the miss recorded. Write the number either way.

Run: `cd $PKG && eval $GPU_NV pnpm run bench bfs && pnpm run bench:compare`
Expected: the table prints; `bench:compare` finds no tracked median above 3x its baseline.

- [ ] **Step 4: Commit (owner)** -- `perf(webgpu-graph-algorithms): the BFS and SSSP benchmarks and the T-10 baselines`.

---

### Task P8-T15: The sabotage suite, the twins, the browser smoke and the `node-limits` tests

**Depends on P8-T13. Parallel with P8-T14.**

**Spec:** design 11.9 items 1, 2 and 4 (sabotage, per-kernel inspection, run twice); design 6 lines 1581-1598 (the twin discipline and the three subgroup sizes); design 11.6 item 4 (the browser smoke runs one PageRank, one BFS and one connected-components on karate against the oracle); design 12.3 (`GRAPHTY_GPU_NO_SUBGROUPS=1`).

**Files:** Create `$PKG/test/sabotage/frontier.test.ts`, `$PKG/test/sabotage/traversal.test.ts`, `$PKG/test/limits/bfs-large.test.ts`; modify `$PKG/test/browser/skeleton.test.ts` or add `$PKG/test/browser/traversal.test.ts`, `$PKG/test/noise-floor.test.ts`, `$WT/.github/workflows/ci.yml` (extend the no-subgroups twin pass, which today names only `test/primitives test/layouts`, to `test/algorithms`).

- [ ] **Step 1: Run every mutation.** The rows were written by the tasks that wrote the kernels, each beside the test it must break; this task runs them all and closes the gaps `test/sabotage/coverage.test.ts` reports. At least three per kernel across fourteen kernels is 42 mutations. A mutation that SURVIVES is a bug in the test suite and blocks the gate exactly as a failing test does -- if one survives, the fix is a better test, never a weaker mutation.
- [ ] **Step 2: The `inspect()` stage comparisons.** Expose, behind `GRAPHTY_GPU_INSPECT=1`, the per-level frontier contents, the edge queue, the counters block and the per-level `depth` snapshot, and compare them level by level against the oracle's own per-level state. This is what catches a wrong expansion that a wrong contraction happens to cancel; end-to-end depth equality would average it away.
- [ ] **Step 3: The twins at three subgroup sizes.** `advance` is the only P8 kernel with a subgroup variant. Run its suite against both variants in the same process (a second context from `acquire({ subgroups: false })`) on lavapipe (size 8), SwiftShader (size 4) and NVIDIA (size 32), asserting bitwise-identical sorted queues -- these are `u32`, so "within a tolerance" does not arise.
- [ ] **Step 4: The browser smoke.** Add BFS on karate against the oracle to the browser project, which is design 11.6 item 4's BFS half.
- [ ] **Step 5: The `node-limits` tests.** The 1M / 10M RMAT BFS (a real 80 MB edge queue) and the 17M-entry synthetic frontier from P8-T4 Step 7 re-run at full size.
- [ ] **Step 6: The noise-floor rows.** Append to `benchmarks/results/noise-floor.json`: the f32-versus-f64 Dijkstra spread from P8-T2, per fixture; the cross-adapter spread of `dist` (expected to be exactly zero -- record the zero, because a later non-zero is then a finding rather than a surprise).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/sabotage && eval $GPU_NV pnpm exec vitest run --project=node-limits && pnpm run test:browser:ci`
Expected: every mutation caught; limits green; browser green (exit 124 with `numFailedTests === 0` counts as green, design 11.6).

- [ ] **Step 7: Commit (owner)** -- `test(webgpu-graph-algorithms): the frontier sabotage matrix, the twins and the browser traversal smoke`.

---

### Task P8-T16: The decision records and the design index

**May run any time after P8-T4.**

**Files:** Create `$WT/design/decisions/2026-09-23-frontier-primitives-are-planners.md`, `$WT/design/decisions/2026-09-23-bfs-claims-instead-of-culling.md`, `$WT/design/decisions/2026-09-23-advance-is-window-aware.md`; modify `$WT/design/decisions/README.md`.

- [ ] **Step 1.** One file per departure of section 0.5 that changes a design statement (A, B and E; C and D are resolved inside the design's own text and need none). Each states what the design says, what the package does, the evidence, and what would have to change to go back. Follow the shape of the three records already in the directory.
- [ ] **Step 2.** Add the three to the README index.

Run: `cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-23-*.md`
Expected: no output.

- [ ] **Step 3: Commit (owner)** -- `docs: record the three frontier-phase departures`.

---

### Task P8-T17: The G8 gate record and the phase close

**Last.**

**Files:** Create `$PKG/docs/decisions/G8.md`; modify `$PKG/CLAUDE.md` (the "Verified Platform Facts" section gains whatever this phase measured that a later phase would otherwise rediscover).

- [ ] **Step 1: The full green check, both adapters plus the browser.**

```
cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip)
eval $GPU_LLVM pnpm run test:node && eval $GPU_LLVM pnpm run coverage
eval $GPU_NV   pnpm run test:node && eval $GPU_NV pnpm exec vitest run --project=node-limits
pnpm run test:browser:ci
eval $GPU_LLVM GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/algorithms
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs
```

Expected: green throughout; coverage at or above 80 / 80 / 75 / 80; no non-ASCII; the default-lane wall time inside T-12's 15 minutes (record it -- this phase adds roughly seventy test cases and T-12 is the budget that says when that stops being free).

- [ ] **Step 2: Write G8.md** against design 13 row P8's gate list, item by item with its evidence, in the shape of the existing G0-G3 records:

| G8 item (design 13 row P8, line 4215) | Evidence |
| --- | --- |
| BFS `depth` exact and parent / order level-consistent on all fixtures including the 1000 x 1000 grid and a 10k-degree star | `test/algorithms/bfs.test.ts` |
| The fused and two-phase kernels agree and the device-side selection picks each at least once on an RMAT fixture | `test/algorithms/bfs.test.ts` (P8-T7 Step 3) |
| The direction-optimizing path agrees with top-down and `switches > 0` on an RMAT fixture | `test/algorithms/bfs.test.ts` (P8-T8 Step 5) |
| A level whose degree sum exceeds a FAKED 4,096-entry edge-frontier capacity gives exact depths | `test/primitives/advance.test.ts` (P8-T5 Step 4) |
| SSSP `dist` within tolerance including zero weights, `predArc` attains `dist`, `E_UNSUPPORTED` on negative weights, `flags.allWeightsOne` routes to BFS | `test/algorithms/sssp.test.ts` -- and note that `dist` is compared BITWISE against the f32 oracle, which is stronger than the gate asks |
| Bellman-Ford detects a planted negative cycle | `test/algorithms/bellman-ford.test.ts` |
| `mapAsync` count at most `levels / 32 + 1` on the grid fixture | `test/algorithms/bfs.test.ts` through `test/helpers/leak-counter.ts` |
| The indirect finalize clamps above 65,535 workgroups (a synthetic 17M frontier on lavapipe) | `test/primitives/frontier.test.ts` and `test/limits/bfs-large.test.ts` |
| The subgroup tier identical on and off at sizes 4 / 8 / 32 | P8-T15 Step 3 |
| T-10 recorded | `benchmarks/results/*.json`, the session named in the record |

Also record, as the design's own gate rules require: the sabotage matrix run and its count, the `inspect()` stage comparisons, every tolerance traced to its noise-floor row, and any target that was missed together with the owner's decision about it.

- [ ] **Step 3: Commit (owner)** -- `docs(webgpu-graph-algorithms): the G8 gate record for the frontier family`.

---

## 7. Appendices

### 7.1 The owner's command sheet, in order

```
# once, before anything
git worktree add .worktrees/webgpu-frontier -b feat/webgpu-frontier master
export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-frontier
export PKG=$WT/webgpu-graph-algorithms
cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build

# the two environments every Run line uses
export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

# the per-task commit, seventeen times, with the subject the task names
cd $WT && ./tools/commit-changes.sh --dry-run
cd $WT && ./tools/commit-changes.sh
```

Every commit is scoped `webgpu-graph-algorithms` except P8-T16's, which is scoped `docs`.

### 7.2 Verification matrix

| Kernel or driver | Independent reference | Differential fixtures | Run-twice | Sabotage rows | Noise-floor row |
| --- | --- | --- | --- | --- | --- |
| `compact` | `Array.filter` | sizes 0..4097, all-0, all-1, alternating | bitwise | 3 | none (u32, exact) |
| `dedupe` | `Set` walk | all-distinct, all-identical, 1000x repeat | bitwise on the sorted form | 3 | none |
| `frontier-finalize` | `planIndirect` and P4's `indirect-finalize` | 2,000 counts to `2^32 - 1`; 17M | bitwise | 2 | none |
| `advance-expand` | nested edge loop | empty, single, karate, 10k star, 100x100 grid, RMAT; tiers 0 and 1; subgroup twin | bitwise on the sorted queue | 5 | none |
| `bfs-contract` | FIFO BFS | the full design 11.3 fixture list | `depth` bitwise, `order` as a per-level set | 4 | none |
| `bfs-fused` | the two-phase path | the same list at three thresholds | bitwise | 4 | none |
| `bfs-bottom-up` | the top-down path | RMAT, grid, star, directed | bitwise incl. `switches` | 3 | none |
| `bfs-unvisited-flags` | the oracle's reached set, complemented | RMAT, grid, a fixture with isolated vertices, a directed one; `unvisitedListLen` against `compact`'s own count | bitwise on all three counters | 3 | none |
| `sssp-relax` / `sssp-pred` | heap Dijkstra in f32 AND f64 | weighted list incl. zero weights and a six-decade weight range | bitwise | 4 | f32-vs-f64 spread per fixture |
| `bf-relax` | Bellman-Ford | negative acyclic, planted cycle, unreachable cycle, zero cycle | bitwise | 3 | shares the SSSP row |
| `closeness-reduce` | per-source BFS reduction | path and star analytically, karate, disconnected | bitwise on the integer sums | 3 | none |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| RP-1 | Neither entry criterion is met: this phase cannot start until two other branches merge, and both are large. | Section 0.2 states it as the first thing anyone reads, and the three independent starter tasks are the ones that can proceed meanwhile. |
| RP-2 | The block-mapped expansion does not compile because a barrier sits inside a guard. This is the most common WGSL failure in this package and it costs hours when it is diagnosed as a logic bug. | P8-T5 Step 1 names it before the code, with the `select`-based fix written out. |
| RP-3 | `dist` turns out NOT to be bitwise reproducible, which would invalidate PD-9 and PD-10 and the exactness of the SSSP test. | The argument is written out in P8-T9 Step 1 and it rests on one claim -- that every candidate value is eventually offered -- which the near-far loop guarantees by running until both piles empty. If a measurement contradicts it, the f32 comparison drops to the derived tolerance and the finding goes in G8; nothing else in the phase changes. |
| RP-4 | Design 9.7's `1e-5` for `dist` is tighter than f32 accumulation allows on a high-diameter fixture. | P8-T2 Step 3 measures the spread before any kernel exists, so the number is known at the start of the phase rather than discovered by a red test at the end. Re-fixing is an owner decision in the pull request, never a quiet edit to a test file. |
| RP-5 | Nine tasks append to `src/kernels.ts`, so nothing in the middle of the phase can run in parallel. | PD-2 states the rule; the parallel opportunities are at the two ends (P8-T1 / T2 / T3 at the start, P8-T14 / T15 at the finish) and are marked. |
| RP-6 | The bottom-up early exit can be deleted without any test noticing, because the answer stays right. | P8-T8 Step 6 says so explicitly and routes that mutation's check to the benchmark and the dispatch count rather than to the differential test. The same applies to the near / far split mutation in P8-T9. |
| RP-7 | Seventy new test cases push the default lane past T-12's 15 minutes on lavapipe. | P8-T17 Step 1 records the wall time; the large fixtures are sized by `gpuScale()` and the genuinely large ones live in `node-limits`, which the default lane does not run. |

## 8. Self-review

### 8.1 Spec coverage -- every deliverable of design 13 row P8 has a task

| Design 13 row P8 deliverable | Task |
| --- | --- |
| `Frontier` with the sized / chunked edge queue | P8-T4 (the class and the capacity rule), P8-T5 (the chunked expansion) |
| `advance` (block_mapped + workgroup tier + subgroup variant) | P8-T5 |
| `dedupe` | P8-T3 |
| bitset | P8-T8 |
| the multi-candidate indirect args and the device-side `finalizeArgs` selector | P8-T4, extended by P8-T7 and P8-T8 |
| BFS (+ direction-optimizing, `switches` as a device counter, `atomicMin` claims) | P8-T6, P8-T7, P8-T8 |
| closeness / harmonic / eccentricity | P8-T11 |
| SSSP near-far with the two-pass predecessor | P8-T9 |
| Bellman-Ford | P8-T10 |
| window-aware advance (lifting the `E_TOO_LARGE`) | P8-T12 |
| oracles (FIFO BFS, binary-heap Dijkstra, Bellman-Ford) | P8-T2 |
| `bfs` benchmarks | P8-T14 |
| gate G8 | P8-T17 |

Design 6 row 4's `compact` is not in the P8 row but is in row 4's "pulled in by" list and is required by P8-T9's far-pile split: P8-T3.

### 8.2 Placeholder scan

No task says "TBD", "as appropriate" or "etc.". Every Run line names a real script from `webgpu-graph-algorithms/package.json` (`build:all`, `lint`, `test:node`, `test:browser:ci`, `bench`, `bench:compare`) or a real vitest project (`node`, `node-limits`, `browser`). Every helper named in a task exists today on master, on `feat/gpu-p4` or on `feat/webgpu-spmv-wcc`, and section 0.2 says which.

### 8.3 Type consistency across the tasks

`GpuBfsResult`, `GpuSsspResult` and `GpuBellmanFordResult` are declared once, in P8-T1, spelled from design 3.3 lines 821-823. P8-T6, P8-T9, P8-T10 and P8-T13 consume them and none redeclares. `GpuScoresResult` for closeness comes from P7's `src/types/algorithms.ts` and is not redeclared here (P8-T1 Step 1). `Frontier`, `CompactPlanner` and `AdvancePlanner` are each declared in exactly one file under `src/primitives/` and imported everywhere else. The counters block is defined once, in `src/kernels.ts` by P8-T4, and every kernel that reads a counter reads that block.
