# @graphty/webgpu-graph-algorithms M8b -- the GPU SpMV family and Afforest WCC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; most run in `/home/apowers/Projects/graphty-monorepo`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P7 inside `webgpu-graph-algorithms/`: grid-stride dispatch, the `reverse()` / `edgeList()` residency with `packViews`, the `spmvPull` pull kernel over pre-scaled `xNorm`, the device out-weight normaliser, PageRank and personalized PageRank with `pr-scale` / `pr-finalize` and a device-recorded `firstConvergedIteration`, HITS, eigenvector and Katz on the same pull kernel, Afforest weakly connected components with `renumberPartition` on readback, the `GpuAccelerator` algorithm members, the f64 oracles, and the `pagerank` / `wcc` benchmark groups with T-8 and T-9 recorded on both runner classes (gate G7).

**Architecture:** The package's device, memory, kernel and batch layers are COMPLETE and its algorithm layer is EMPTY: `webgpu-graph-algorithms/src/algorithms/` holds exactly one file, `degree.ts` (142 lines). M8b fills that layer. Every new kernel is a body in `src/wgsl/<id>.wgsl.ts` registered in `src/kernels.ts`, every new driver is a file under `src/algorithms/` that may import `src/context.ts`, `src/memory/**`, `src/kernel/**`, `src/kernels.ts` and `src/primitives/**` and NOTHING above it (`webgpu-graph-algorithms/eslint.config.js:146`, `webgpu-graph-algorithms/test/layers.test.ts:77`). The accelerator surface grows one member per shipped algorithm and never carries a throwing stub (`webgpu-graph-algorithms/src/accelerator.ts:5-7`). The dependency direction is unchanged: the GPU package imports `@graphty/graph-format` only, and the CPU packages import nothing from it (design 9.1).

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu@0.4.0` (Dawn) in Node 22 and Chromium 139 (Playwright) in the browser, `@graphty/graph-format` snapshots, vitest 3.2 (node / node-limits / browser projects, v8 coverage), fast-check, pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; `gpu-linux-t4` lane).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 5.2 lines 1395-1425 (the grid-stride rule), 4.3 lines 1180-1190 (`packViews` and the undirected `reverse()` aliasing), 6 row 9 line 1576 (`spmvPull`), 8.1 lines 2564-2569, 8.2 lines 2572-2606 (PageRank), 8.3 lines 2611-2625 (Afforest), 8.8 lines 2789-2791, 8.10 lines 2830-2841 (the binding budgets), 3.3 lines 784-828 (the public signatures and the `Gpu*Result` types), 9.7 lines 3262-3284 (result-shape parity), 10.4 lines 3413-3414 (T-8, T-9), 11.6 line 3636 (browser smoke item 4), 13 row P7 line 4214 (the deliverables and gate G7). The design is normative; every departure is in section 0.5.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (Phases M0-M5b, and section 6's M8b block at line 3269-3270, which this plan decomposes).

**Gate:** G7 (design 13 row P7, line 4214). The record is `webgpu-graph-algorithms/docs/decisions/G7.md`, written by Task M8b-T12 beside the existing G0-G3.

**Tasks in this document:** M8b-T1 .. M8b-T12. T1 and T2 are independent of each other and of everything else and may run in parallel. T3 depends on T1 (the result types) and is the single owner of `src/kernels.ts` and of every new `src/wgsl/*.wgsl.ts`. T4 depends on T2 and T3. T5 depends on T4. T6 and T7 depend on T5 and T3 and may run in parallel with each other. T8 depends on T5, T6 and T7. T9 depends on T8. T10 depends on T8. T11 may run any time after T3. T12 is last. Within the phase no two tasks name the same file.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the touched files is a step of Task M8b-T12.
- Never run `sudo`; nothing in this plan needs it. Servers only on ports 9000-9099 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them.
- Project rule (root `CLAUDE.md`): never create fallbacks if WebGPU is not supported -- `src/` contains no CPU path, no WebGL path, no software-adapter acceptance; the package throws.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the package's `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts:185`).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md:78-87`): device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator. `src/wgsl/**` is imported only by `src/kernels.ts`. Enforced by `webgpu-graph-algorithms/eslint.config.js:88-166` and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md:161-196`): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, and never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`).
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason and, where the departure changes a design statement, a `design/decisions/2026-09-19-<slug>.md` record written by Task M8b-T11.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-19)

| Fact | Evidence |
| --- | --- |
| Master is `07fba28b test(webgpu-graph-algorithms): let the minimum confirm the median in bench:compare`, ONE commit ahead of `origin/master` (`cde458a2`) and unpushed; the only thing in the working tree is the four untracked M6 / M7 / M8a / M8b plan files this document belongs to. | `git log --oneline -3`; `git status --porcelain` (four `??` lines, all `design/webgpu/plans/2026-09-19-webgpu-m*.md`) |
| `@graphty/webgpu-graph-algorithms` is 0.2.1 and `@graphty/graph-format` is 1.0.0. | `node -e "console.log(require('./webgpu-graph-algorithms/package.json').version, require('./graph-format/package.json').version)"` -> `0.2.1 1.0.0` |
| `src/algorithms/` holds ONE file, `degree.ts`. There is no other algorithm to copy from. | `ls webgpu-graph-algorithms/src/algorithms/` -> `degree.ts` |
| `src/primitives/` holds TWO files, `reduce.ts` and `segmented-reduce.ts`. There is no `compact`, `scan`, `histogram` or `dedupe`. | `ls webgpu-graph-algorithms/src/primitives/` |
| `src/wgsl/` holds ten bodies, none of which uses an atomic. | `ls webgpu-graph-algorithms/src/wgsl/`; `grep -rn 'atomic<\|atomicLoad\|atomicStore\|atomicCompareExchangeWeak' webgpu-graph-algorithms/src/wgsl/` (no match; a plain `grep -rn atomic` DOES match the prose of `fa2-attraction.wgsl.ts:3`) |
| `planGridStride` and `planIndirect` are throwing stubs with their final signatures. | `webgpu-graph-algorithms/src/kernel/dispatch.ts:135-140`, `:148-153` |
| `residency.view()` rejects `reverse`, `coo`, `edgeList` and `mate` by name, and rejects `packViews: true`. `outDegree`, `inDegree`, `degreeOrder` and `reverseDegreeOrder` work. | `webgpu-graph-algorithms/src/memory/residency.ts:404-411`, `:364-369`, `:374-403` |
| `segmentedReduce` hard-throws for any non-null `tiers`. | `webgpu-graph-algorithms/src/primitives/segmented-reduce.ts:258-262` |
| The VALUE snippet vocabulary is `row, arc, nbr, weight, v` plus a 31-word WGSL allowlist, enforced textually before compose. | `webgpu-graph-algorithms/src/primitives/segmented-reduce.ts:40`, `:48-80`, `:120-142` |
| `createAccelerator` returns exactly `kind, ctx, options, forceAtlas2, release, dispose`. There are ZERO algorithm members. | `webgpu-graph-algorithms/src/accelerator.ts:87-117` |
| `pageRank` and `connectedComponents` are listed as NEVER exported by the barrel test. | `webgpu-graph-algorithms/test/index.test.ts:86-87` |
| `renumberPartition` exists in graph-format and is referenced NOWHERE in the GPU package. | `graph-format/src/snapshot/derived.ts:1155`; `grep -rn renumberPartition webgpu-graph-algorithms/` (no match) |
| `E_PARTITION` is a graph-format code and is NOT in `PASSTHROUGH_FORMAT_CODES`. | `graph-format/src/errors.ts:75`; `webgpu-graph-algorithms/src/errors.ts:39-44` |
| `test/limits/` contains only `README.md`: the `node-limits` project the GPU workflow runs has ZERO tests today. | `ls webgpu-graph-algorithms/test/limits/` -> `README.md` |
| `benchmarks/run.ts` registers exactly three groups: `upload`, `roundtrip`, `layout-exact`. | `webgpu-graph-algorithms/benchmarks/run.ts:29-33` |
| The checked-in baselines are `gpu-linux-t4.json`, `nvidia-lovelace-driver580.json` and `noise-floor.json`. | `ls webgpu-graph-algorithms/benchmarks/results/` |
| `tools/commit-changes.sh` carries a STALE `VALID_SCOPES` that omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, so it refuses a commit commitlint accepts. | `tools/commit-changes.sh:468-469` vs `commitlint.config.js:4-27` |
| The CI no-subgroups twin pass covers only `test/primitives test/layouts`. | `.github/workflows/ci.yml:315` |
| The `node` project's include glob names its directories literally. | `webgpu-graph-algorithms/vitest.config.ts:196-199` |
| `webgpu-graph-algorithms/docs/decisions/` holds G0, G1, G2, G3. There is no G7. | `ls webgpu-graph-algorithms/docs/decisions/` |

### 0.2 Entry criteria -- M8b is the ONE phase whose criteria are MET today

| Criterion | Status | Evidence |
| --- | --- | --- |
| Phase M3: the package is in the monorepo and releasing | **MET** | `webgpu-graph-algorithms/package.json` version `0.2.1`; the package is a workspace project with its own `project.json`; PR #11 merged |
| The design's P2 gate | **MET** | `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3269` states it verbatim: "Phase M3 (the package in the monorepo) and the design's P2 gate (met)"; the record is `webgpu-graph-algorithms/docs/decisions/G2.md` |
| The design's phase order admits P7 after P2 | **MET** | `design/webgpu/webgpu-acceleration-plan.md:4223-4224`: `P0 -> P1 -> P2 -> P3 ... \-> P7 (SpMV + WCC)`; the P7 Size cell at `:4214` reads "may start after P2 in parallel with P3-P5" |
| `graph-format >= 1.0.0` on master (for `renumberPartition` and the views) | **MET** | `graph-format/package.json` version `1.0.0`; commit `f6520f85 feat(graph-format)!: freeze the invariants and cut 1.0.0` |

For contrast, and so no reader schedules the wrong thing: Phase M5 is **NOT MET** (the layout simulation seam is on branch `feat/layout-simulation`, draft PR #12, `git log --oneline master..feat/layout-simulation` has five commits), Phase M5b is **NOT MET** (branch `feat/webgpu-layout-types`, no PR), and A1 -- M8a's precondition -- **does not exist in any branch** (`algorithms/src/` has no `indexed/` directory). M8b depends on none of them.

### 0.3 Execution order (decision D3, stated identically in all four M6 / M7 / M8a / M8b plans)

```
merge PR #12 (M5) -> merge M5b -> M8a (A1 + the six ports + the accelerator seam) -> M6 (E0 then E1) -> M7
M8b is independent of that whole chain.
```

M8b is the ONLY phase whose entry criteria are met today. It can be scheduled now, in parallel with every step of it.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | `spmvPull` is its own registry entry, NOT a `segmentedReduce` VALUE snippet | M8b-T3 |
| PD-2 | Tier 0 only: `spmvPull` ships the thread-per-row tier; the in-degree tiers stay a P4 deliverable | M8b-T3 |
| PD-3 | The seven P7 kernel ids, their binding counts and the four closed unions they widen | M8b-T3 |
| PD-4 | The WCC `changed` flag lives inside the `comp` array, so the link kernel binds three buffers, matching design 8.10 | M8b-T3 |
| PD-5 | Atomics enter the package with `array<atomic<u32>>`, `atomicLoad` / `atomicStore` / `atomicCompareExchangeWeak` and a bounded link loop | M8b-T3 |
| PD-6 | `wcc-sample` is `SABOTAGE_EXEMPT`; the other six P7 kernels carry three mutations each, landed with the tests they cite | M8b-T10 |
| PD-7 | PageRank ping-pongs TWO buffers through two cached bind groups, never one buffer with two ranges | M8b-T5 |
| PD-8 | `outWeightSum` is per-call `Lease` scratch, not a residency entry | M8b-T5 |
| PD-9 | `firstConvergedIteration` is recorded one iteration late and reported as `P.iteration - 1` | M8b-T5 |
| PD-10 | HITS / eigenvector / Katz normalise on the DEVICE through a `reduce` into `partials[0].norm`; they stay batchable | M8b-T6 |
| PD-11 | `E_PARTITION` is NOT added to `PASSTHROUGH_FORMAT_CODES`; an `INVALID_INDEX` label is `E_VALIDATION` | M8b-T7 |
| PD-12 | The giant-component mode is computed on the host over the 1,024-word sample readback | M8b-T7 |
| PD-13 | `packViews` pays off only on DIRECTED snapshots; on an undirected one `view(s, "reverse")` is the forward buffers with zero upload | M8b-T2 |
| PD-14 | The accelerator members land in ONE task, after all three algorithm tasks are green; never a throwing stub | M8b-T8 |
| PD-15 | Every new test file goes in a directory the `node` include glob already names | M8b-T4 |
| PD-16 | The barrel export and the `NEVER_EXPORTED` edit are ONE commit | M8b-T8 |
| PD-17 | The `pagerank` / `wcc` baselines are captured with `minMs` on BOTH runner classes before the benchmark commit lands | M8b-T9 |
| PD-18 | The CI no-subgroups twin pass is extended to `test/algorithms` | M8b-T10 |
| PD-19 | M8b may land before M8a; `AlgorithmAccelerator` is a structural mirror on master and M8a's `import type` swap is source-compatible | M8b-T8 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-M8B-A | Design 6 row 9 (`:1576`) calls `spmvPull` "`segmentedReduce` specialised"; M8b gives it its own registry entry and WGSL body. | The VALUE snippet vocabulary admits only `row, arc, nbr, weight, v` (`src/primitives/segmented-reduce.ts:40`, allowlist `:48-80`, enforced textually `:120-142`), so a snippet can never read `xNorm[nbr]`. The design's own 8.10 table (`:2839`) already gives `spmvPull` an eight-binding descriptor row of its own, which a snippet variant of `segmented-reduce` (five storage bindings, `test/kernel/bind-group-budget.test.ts:22`) cannot have. The two design statements are in tension; the 8.10 table wins because G7 tests it. Recorded by Task M8b-T11 as `design/decisions/2026-09-19-spmv-pull-is-its-own-kernel.md`. |
| DEP-M8B-B | Design 8.8 row 1 (`:2789`) says `spmvPull` is "tiered by in-degree"; M8b ships the thread-per-row tier only. | `prepareSegmentedReduce` throws `E_UNSUPPORTED { feature: "segmentedReduce.tiers" }` for any non-null `tiers` (`src/primitives/segmented-reduce.ts:258-262`), and design 6 row 3 (`:1570`) assigns the two upper tiers to P4, gated at G4. Rule (b) of design 13 ("a phase adds only the primitives its slice needs") forbids M8b absorbing P4's tier work. The `perm` slot is still bound (design 8.2: "the slot exists whether or not the permutation is the identity"), `USE_PERM` is false, and `reverseDegreeOrder` residency already works (`src/memory/residency.ts:394-400`) so P4 has nothing left to build on the host side. Recorded by Task M8b-T11 as `design/decisions/2026-09-19-spmv-tier-zero-only.md`. |
| DEP-M8B-C | Design 13 row P7 (`:4214`) lists "the two-dispatch atomic dedupe" among the Afforest deliverables; M8b does not build it. | Design 8.3 (`:2611-2625`), which is the normative description of the algorithm, describes Afforest with CAS link, pointer-jumping compress, a histogram sample and an each-edge-once link round, and does NOT use `dedupe`. Afforest's link is idempotent, so nothing needs deduplicating. `compact` / `dedupe` are design 6 row 4 and are assigned to P4 / P7 / P8; M8b builds the P7 slice, which is the WCC of 8.3. Recorded by Task M8b-T11 as `design/decisions/2026-09-19-afforest-needs-no-dedupe.md`. |
| DEP-M8B-D | Design 8.2 (`:2608-2609`) says "The `outWeightSum` buffer is registered against the snapshot in the residency so a second PageRank call on the same snapshot reuses it"; M8b keeps it as per-call scratch. | `GraphResidency.array(key, label, owner)` keys on a CPU typed array object (`src/memory/residency.ts:483`, the `residents` WeakMap at `:244`), and a device-computed out-weight sum has no such key. Registering it would mean a new residency API, which is not a P7 deliverable. The cost is one `segmentedReduce` pass per call, O(A) once against O(A) per iteration. Recorded by Task M8b-T11 as `design/decisions/2026-09-19-outweightsum-is-call-scratch.md`. |
| DEP-M8B-E | Design 8.10's Afforest row (`:2841`) names four buffers (`edgeSrc, edgeDst, comp (atomic), changed`) and counts three. M8b binds three: `edgeSrc`, `edgeDst`, `comp`, with the changed flag as the word at `comp[P.flagIndex]`. | G7 tests the COUNT ("every 8.10 kernel matches its count (descriptor test)"), and the same paragraph's rule is "counters and flags share one small `u32` block". The `comp` array is the kernel's only atomic buffer, so the flag shares it. Three bindings, exactly the design's number, with no separate flag buffer to bind or reset. |
| DEP-M8B-F | The design does not fix where the giant-component mode is computed; M8b computes it on the host over the 1,024-word sample. | Design 8.3 says "a 1,024-entry histogram readback to find the giant component". A device histogram over component ids needs either 1,024 hash buckets (which yield a bucket, not a component id) or n bins (which is the whole label array). GAP's `SampleFrequentElement` also counts on the host. The readback is 4 KB once per call. |
| DEP-M8B-G | Design 8.10 (`:2833`) states "Ping-pong pairs are one buffer with two bind groups"; M8b's PageRank and power-iteration ping-pong is TWO buffers with two cached bind groups. | `Kernel.bind` rejects one buffer bound through a `storage` and a `storage-ro` slot whenever either is `storage`, and it does so even for DISJOINT ranges: it compares the access modes first and throws `E_INVALID_ARGUMENT { argument: "aliasing", reason: "usage" }` before it ever tests the ranges (`src/kernel/kernel.ts:177-192`). `rankIn` is `storage-ro` and `rankOut` is `storage` on `spmv-pull`, so two 256-aligned halves of one buffer are unbindable, and the failure is a synchronous throw at the first `bind()`, not a validation warning. Two buffers cost 4n more bytes from the pool and nothing else: `bind()` caches by `bufferId:offset:size` (`src/kernel/kernel.ts:207-209`), so alternating the two resource sets is one Map lookup per iteration and allocates nothing after the first two. Stated in full as PD-7 (Task M8b-T5) and recorded by Task M8b-T11 as `design/decisions/2026-09-19-pagerank-ping-pong-is-two-buffers.md`. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| M8b GPU SpMV family + WCC (design P7) | `webgpu-graph-algorithms/` | Phase M3 and the design's P2 gate -- both MET (section 0.2) | grid-stride dispatch, `packViews`, `spmvPull`, PageRank (+ personalized) with `firstConvergedIteration`, HITS, eigenvector, Katz, Afforest WCC, `renumberPartition` on readback, `reverse()` residency, the `GpuAccelerator` algorithm members, oracles, `pagerank` / `wcc` benchmarks; parity per design 9.7 | design G7 | design 13 row P7 says 8-10 ed; this plan's twelve tasks sum to 15.5 ed (the table below) |

Critical path: M8b-T1 and M8b-T2 in parallel -> M8b-T3 -> M8b-T4 -> M8b-T5 -> M8b-T6 and M8b-T7 in parallel -> M8b-T8 -> M8b-T9 and M8b-T10 in parallel -> M8b-T12 ; M8b-T11 any time after M8b-T3.

**Per-task estimate, and the size this plan actually is.** The design's P7 cell says "8-10 ed", and design 13 rule (e) (`:4198-4199`) defines ed as "engineer-days (ed) for one engineer familiar with the code base; the WGSL phases carry the most uncertainty". The cell is not restated here unexamined: the twelve tasks below add up to more than it, and the owner should know that before scheduling, not after.

| Task | What it is | ed |
| --- | --- | --- |
| M8b-T1 | the scope fix, one planner rule, one types file | 0.5 |
| M8b-T2 | two residency builders, `packViews`, eight test cases | 1.5 |
| M8b-T3 | seven WGSL bodies (the package's first atomics), four blocks, four closed unions, 37 compile cases | 2.5 |
| M8b-T4 | `core-shape.ts`, `coreOfView`, `prepareSpmvPull`, the f64 oracle and the differential suite with the twin | 1.5 |
| M8b-T5 | PageRank + personalized: the driver, the NetworkX-semantics f64 oracle, ten test cases | 2.0 |
| M8b-T6 | the power-iteration driver, three entry points, three oracles, nine test cases | 2.0 |
| M8b-T7 | Afforest: the host loop, the union-find oracle, eleven test cases | 1.5 |
| M8b-T8 | seven accelerator members, the barrel, three test files | 0.5 |
| M8b-T9 | two benchmark files, two baselines re-captured (one of them through a PR, a label and an artifact download) | 1.0 |
| M8b-T10 | eighteen mutations, two check-set helpers, two sabotage suites, the browser smoke, the first node-limits test, the CI twin | 1.5 |
| M8b-T11 | five decision records and three index edits | 0.5 |
| M8b-T12 | the full green check on two adapters plus the browser, and the G7 record | 0.5 |
| | **total** | **15.5** |

15.5 ed against the design's 8-10. The gap is not padding: the design's cell was written before this plan enumerated seven WGSL bodies, six public algorithms plus a shared driver, four f64 oracles, roughly fifty new test cases across five suites, eighteen sabotage mutations with two new check-set helpers, the package's first `node-limits` test, and two benchmark groups re-baselined on two runner classes. Nine of the twelve tasks are sequential (the critical path above), and every one of them ends in a green check on BOTH adapters, which design 13 rule (a) requires and which alone is 20-60 minutes of wall time per task once the compile matrix grows by 37 cases (M8b-T3 Step 6). The owner's call, in the PR: accept 15.5 and let the design cell stand as the estimate it was, or split the phase (M8b-T1..T5 as one PR closing nothing, M8b-T6..T12 as the PR that closes G7). Nothing in the plan depends on which; the tasks and their order are the same either way.

### 0.7 What M8b does NOT do

- It does not invoke gate G12. G12's void clause ("nightly GPU lane green for a week", removed by `design/decisions/2026-09-19-no-nightly-gpu-lane.md`) is restated and recorded ONCE, by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`, as `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` -- M7 is the document whose gate G12 is. The M6 and M8a plans cite that same file rather than writing a second record. M8b's gate is G7.
- It does not touch `algorithms/`, `layout/`, `graphty-element/` or `graphty/`. The `AlgorithmAccelerator` mirror it extends is the GPU package's own (`webgpu-graph-algorithms/src/types/accelerator.ts:177-204`).
- It does not implement the P4 tiers, `compact`, `scan`, `histogram`, `radixSort`, `planIndirect` or windowed execution (design 13 rule (b)).
- It does not touch `webgpu-graph-algorithms/project.json`. The `"implicitDependencies": ["!algorithms", "!layout"]` negation is removed in two halves by two OTHER phases and neither half is M8b's: Phase M5b drops `"!layout"` (the integration plan's Task M5b-T1) and Task M8a-T13 deletes the whole key (M8a's PD-11). M8b adds no workspace dependency, so it has no reason to edit the file and must not, or the two phases collide on line 7.

---

## Phase M8b: the GPU SpMV family and Afforest WCC

**Entry criteria:** Phase M3 and the design's P2 gate, both MET (section 0.2). Work on branch `feat/webgpu-spmv-wcc` in a worktree (`git worktree add .worktrees/webgpu-spmv-wcc -b feat/webgpu-spmv-wcc master`, run by the owner -- a subagent must never run `git worktree`); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms` except the THREE noted in section 7.1 (one scoped `tools`, and two that carry no scope at all); the phase lands as ONE PR carrying the `gpu` label so `gpu.yml` runs on it.

**Step 0 of the phase (a fresh worktree has no `node_modules` and no `dist/`, both gitignored).** Export the two path variables FIRST -- every Run line in this document begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-spmv-wcc
    export PKG=$WT/webgpu-graph-algorithms

then `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run graph-format:build`. Every later command reads `graph-format/dist/` (the GPU package's `tsc` and vitest both resolve `@graphty/graph-format` through it). Re-export both in any new shell: a Run line pasted without them fails on its first token.

**The local run environments (`webgpu-graph-algorithms/CLAUDE.md:284-289`), used verbatim in every task's Run lines:**

    # NVIDIA (the hardware lane the parity numbers come from)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task M8b-T1: The commit-script scope fix, grid-stride dispatch, and the P7 result and option types

**Repository:** `$WT` = `/home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-spmv-wcc`; `$PKG` = `$WT/webgpu-graph-algorithms` (both exported by the phase's Step 0).

**Spec:** design 5.2 lines 1395-1425 (the grid-stride rule and the `(16,776,960, 16,777,216]` boundary the planner test pins); design 3.3 lines 815-828 (`GpuScoresResult`, `GpuPageRankResult`, `GpuHitsResult`, `GpuLabelResult`); design 3.3 lines 792-797 (the six public signatures).

**Files:**
- Modify: `tools/commit-changes.sh:468-469` (add the three missing scopes to `VALID_SCOPES`)
- Modify: `webgpu-graph-algorithms/src/kernel/dispatch.ts:135-140` (replace the `planGridStride` throw with the rule)
- Create: `webgpu-graph-algorithms/src/types/algorithms.ts` (the `Gpu*Result` types and the GPU-side option records, spelled member for member against M8a's CPU seam types)
- Modify: `webgpu-graph-algorithms/test/kernel/dispatch.test.ts` (the new grid-stride cases; DELETE the `planGridStride throws E_UNSUPPORTED` stub case at `:162-170`; update the file header at `:3`)
- NOT touched: `src/index.ts` and `test/index.test.ts` (Task M8b-T8 owns the barrel), `src/kernels.ts` (Task M8b-T3)

**Interfaces:**
- Consumes: `PlanCaps` (`src/types/context.ts`), `MAX_WORKGROUPS_PER_DIM` (`src/constants.ts:11`), `CAPS_SPEC_DEFAULT` (`test/helpers/caps-tables.ts:50`) and `fakeCaps(base, overrides, flags?)` (`test/helpers/caps-tables.ts:137-141`), both already imported by `test/kernel/dispatch.test.ts:17`.
- Produces: `planGridStride(items: number, wg: number, caps: PlanCaps, maxGroups?: number): DispatchPlan` with `stride` non-null; `GpuScoresResult`, `GpuPageRankResult`, `GpuHitsResult`, `GpuLabelResult`, `PageRankOptions`, `HitsOptions`, `EigenvectorOptions`, `KatzOptions`, `ComponentsOptions` from `src/types/algorithms.js`.

- [ ] **Step 1: Fix the stale scope list in the commit script (this plan OWNS this edit)**

**Cross-plan ownership, so the edit is made once.** Three of the four plan documents of 2026-09-19 need a `webgpu-graph-algorithms`-scoped or `graph-format`-scoped commit, and all three found the same stale list. THIS task owns the edit, because M8b is the only phase whose entry criteria are met today (section 0.2) and because every commit of this phase is scoped `webgpu-graph-algorithms`, so it is refused at the very first one. The other two consume it as a precondition and make NO edit of their own: Task M8a-T1 of `2026-09-19-webgpu-m8a-algorithms-seam.md` and Task M7-T1 Step 1 of `2026-09-19-webgpu-m7-graphty-app.md` are both CHECKS that stop and name this step if the fix is not on master. Do not "also" apply it there.

In `tools/commit-changes.sh` replace

```bash
VALID_SCOPES="algorithms layout graphty-element compact-mantine remote-logger graphty
              gpu-3d-force-layout deps release ci docs tools workspace"
```

with

```bash
VALID_SCOPES="graph-format graph-io webgpu-graph-algorithms algorithms layout graphty-element
              compact-mantine remote-logger graphty gpu-3d-force-layout deps release ci docs tools workspace"
```

Reason: the script's own validation runs before a single file is staged (`tools/commit-changes.sh:460-462`), and its list has drifted from `commitlint.config.js:4-27`, which DOES carry the three. Every commit of this plan is scoped `webgpu-graph-algorithms`, so without this fix the very first one is refused by the script even though the commit-msg hook would accept it. The list is a comment-documented mirror ("Kept in step with commitlint.config.js's scope-enum", `:466-467`), so the fix is the mirror catching up, not a policy change.

Run: `cd $WT && grep -c 'webgpu-graph-algorithms' tools/commit-changes.sh`
Expected: at least 1 (0 before the edit). If `./tools/commit-changes.sh --dry-run` still prints `REFUSING: unknown scope`, the heredoc indentation broke the continuation line -- keep both lines inside the one double-quoted string.

- [ ] **Step 2: Write the failing planner test**

Append to `$PKG/test/kernel/dispatch.test.ts`, inside the existing top-level `describe`:

```ts
describe("planGridStride (spec 5.2 lines 1418-1424)", () => {
    it("caps the groups at 4096 on hardware and 64 on software, and reports the stride", () => {
        const hw = planGridStride(100_000_000, 256, CAPS_SPEC_DEFAULT);
        expect(hw).toEqual({ x: 4096, y: 1, z: 1, items: 100_000_000, stride: 4096 * 256 });
        const sw = planGridStride(100_000_000, 256, { ...CAPS_SPEC_DEFAULT, software: true });
        expect(sw).toEqual({ x: 64, y: 1, z: 1, items: 100_000_000, stride: 64 * 256 });
    });

    it("never plans more groups than the items need", () => {
        const plan = planGridStride(1000, 256, CAPS_SPEC_DEFAULT);
        expect(plan).toEqual({ x: 4, y: 1, z: 1, items: 1000, stride: 4 * 256 });
    });

    it("honours an explicit maxGroups and the per-dimension limit", () => {
        expect(planGridStride(100_000_000, 256, CAPS_SPEC_DEFAULT, 7).x).toBe(7);
        // Every checked-in caps table reports maxComputeWorkgroupsPerDimension 65,535 -- the same value as
        // MAX_WORKGROUPS_PER_DIM -- so a real table cannot distinguish perDimension(caps) from the constant.
        // fakeCaps lowers it (caps-tables.ts:137-141 copies the ten PlanLimits keys and overrides the named one).
        const lowLimit = fakeCaps(CAPS_SPEC_DEFAULT, { maxComputeWorkgroupsPerDimension: 1024 });
        expect(planGridStride(100_000_000, 256, lowLimit, 200_000).x).toBe(1024);
    });

    it("items 0 plans nothing and records a null stride", () => {
        expect(planGridStride(0, 256, CAPS_SPEC_DEFAULT)).toEqual({ x: 0, y: 1, z: 1, items: 0, stride: null });
    });

    it("rejects a negative item count and a non-power-of-two workgroup size", () => {
        expect(() => planGridStride(-1, 256, CAPS_SPEC_DEFAULT)).toThrow(/non-negative integer/);
        expect(() => planGridStride(1000, 96, CAPS_SPEC_DEFAULT)).toThrow(/power of two/);
    });
});
```

No import edit is needed: `planGridStride` is already imported at `test/kernel/dispatch.test.ts:14` and `CAPS_SPEC_DEFAULT` / `fakeCaps` at `:17`. (`CAPS_INTEL_XE` is deliberately NOT used: `test/helpers/caps-tables.ts:97-98` declares it with `limits: CAPS_SPEC_DEFAULT.limits`, the identical object, so its per-dimension limit is the spec default's 65,535 and an assertion against it would reduce to `65535 === 65535`.)

Run: `cd $PKG && pnpm exec vitest run --project=node test/kernel/dispatch.test.ts`
Expected: FAIL, five times. Four of the five report `E_UNSUPPORTED: planGridStride lands with the grid-stride kernels of P7 (spec 5.2)` (the stub at `src/kernel/dispatch.ts:136-139`). The fifth, "rejects a negative item count and a non-power-of-two workgroup size", fails DIFFERENTLY -- on the unmatched-message assertion `expected ... to throw error matching /non-negative integer/`, because the stub throws before either argument is validated. Seeing two different failure shapes here is correct; seeing only one means a case was not pasted.

- [ ] **Step 3: Delete the stub's test, then implement the rule**

First delete the now-wrong stub case. `test/kernel/dispatch.test.ts:161-178` is a `describe("the P1-P3 stubs", ...)` holding TWO `it`s; delete the FIRST one only -- `it("planGridStride throws E_UNSUPPORTED { feature: 'planGridStride' } (lead f)", ...)` at `:162-170`, which asserts that both the 3-argument and the 4-argument form throw. Leave the `planIndirect` case at `:172-177` and the `describe` itself intact, and change the file header at `:3` from "the P1-P3 E_UNSUPPORTED stubs" to "the `planIndirect` E_UNSUPPORTED stub (the only one left after P7)". Without this deletion Step 3's Run cannot report PASS: implementing the rule makes that case fail, and an executor reading the Expected line below would conclude the implementation is wrong.

Then, in `$PKG/src/kernel/dispatch.ts`, replace the whole `planGridStride` body (`:135-140`) with:

```ts
export function planGridStride(items: number, wg: number, caps: PlanCaps, maxGroups?: number): DispatchPlan {
    assertCount("items", items);
    assertWorkgroupSize(wg);
    if (items === 0) {
        return { x: 0, y: 1, z: 1, items, stride: null };
    }
    const cap = Math.min(maxGroups ?? (caps.software ? 64 : 4096), perDimension(caps));
    const groups = Math.min(Math.ceil(items / wg), cap);
    return { x: groups, y: 1, z: 1, items, stride: groups * wg };
}
```

Keep the JSDoc block above it, delete its "P1-P3: throws" sentence and its `PLAN DECISION` note about `maxGroups?: number` (the note stays true and stays, only the throw clause goes). Reason: the cap is the ONE performance default in `src/` that may read `caps.software` (design 2.4, 5.2 line 1420); the result never depends on it because a grid-stride map is order-independent, which is why the same body serves both adapters and why the twin tests of T4 compare the two shapes bitwise.

Run: `cd $PKG && pnpm exec vitest run --project=node test/kernel/dispatch.test.ts`
Expected: PASS -- the five new cases, the surviving `planIndirect` stub case, and the pre-existing `plan1d` / `plan2d` cases (the boundary case `items = 16,776,960` is 1D and `16,776,961` is 2D). If the run still reports `planGridStride throws E_UNSUPPORTED`, the stub case above was not deleted.

- [ ] **Step 4: The P7 result and option types**

Create `$PKG/src/types/algorithms.ts`:

```ts
/**
 * The result and option records of the P7 algorithms (spec 3.3 lines 815-828, 9.7). The `Gpu*Result` shapes are the
 * design's verbatim; the option records are this package's own, spelled MEMBER FOR MEMBER as the CPU seam spells
 * them so one object literal satisfies both sides (the same D27 mirror rule src/types/options.ts follows for the
 * layout options). Types only: this file imports nothing at runtime.
 *
 * The CPU counterparts, when phase M8a lands them (plan 2026-09-19-webgpu-m8a-algorithms-seam, Task M8a-T8):
 * `PageRankOptions` here is `IndexedPageRankOptions` there (`{ dampingFactor?, maxIterations?, tolerance?,
 * weighted? }`); `HitsOptions`, `EigenvectorOptions` and `KatzOptions` here all correspond to the ONE
 * `HitsOptionsLike` there (`{ maxIterations?, tolerance?, weighted? }`), which is why every one of them carries
 * those three members and `KatzOptions` adds `alpha` / `beta` on top; `ComponentsOptions` has no CPU counterpart at
 * all, because `AlgorithmAccelerator.connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>` declares no
 * options parameter. `weighted`, never `weight`: that is the member name graph-format design 14.2 fixes at
 * `design/graph-format/graph-format-design.md:3892` and the one M8a ports.
 */

import type { F32, U32 } from "@graphty/graph-format";

/** Spec 3.3 line 815: every score result carries `precision` so a consumer can label GPU scores (Q-24). */
export interface GpuScoresResult {
    readonly scores: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Spec 3.3 line 816: `iterations` is the first iteration whose L1 delta fell below the tolerance (8.2), not the batch boundary. */
export interface GpuPageRankResult extends GpuScoresResult {
    readonly danglingMass: number;
}

/** Spec 3.3 line 817. */
export interface GpuHitsResult {
    readonly hubs: F32;
    readonly authorities: F32;
    readonly iterations: number;
    readonly converged: boolean;
    readonly precision: "f32";
}

/** Spec 3.3 line 818: labels dense 0..count-1 in first-seen order (renumberPartition); groups() is index-aligned. */
export interface GpuLabelResult {
    readonly labels: U32;
    readonly count: number;
    groups(): U32[];
}

/** The CPU seam's IndexedPageRankOptions, member for member (M8a Task M8a-T8; graph-format design 14.2 :3892). */
export interface PageRankOptions {
    readonly dampingFactor?: number | undefined;
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike, member for member (M8a Task M8a-T8). */
export interface HitsOptions {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** The CPU seam's HitsOptionsLike again: `eigenvectorCentrality` takes that same shape on the CPU side. */
export interface EigenvectorOptions {
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** HitsOptionsLike plus Katz's own two: `alpha` is the attenuation and `beta` the constant term. */
export interface KatzOptions {
    readonly alpha?: number | undefined;
    readonly beta?: number | undefined;
    readonly maxIterations?: number | undefined;
    readonly tolerance?: number | undefined;
    readonly weighted?: boolean | undefined;
}

/** GPU-only (spec 3.3 line 797: `renumber: true` by default, Q-12); the CPU seam's connectedComponents takes none. */
export interface ComponentsOptions {
    readonly renumber?: boolean | undefined;
}
```

Reason for a new file rather than an addition to `src/types/accelerator.ts`: that file is the D27 mirror surface and is the ONE file M8a rewrites (`webgpu-graph-algorithms/src/types/accelerator.ts:40-41` names the work); keeping the GPU-owned result types out of it means M8a's `import type` swap touches nothing M8b wrote. `src/types/**` is types-only and the eslint zone at `eslint.config.js:154-160` forbids a value import there, which this file honours.

Run: `cd $PKG && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean. If `F32` / `U32` are reported unused, the `import type` line is wrong -- these are used in the interfaces above.

- [ ] **Step 5: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd .. && pnpm exec knip)`
Expected: build, eslint and both `tsc` runs clean; knip reports the nine exports of `src/types/algorithms.ts` as unused. That is EXPECTED, not a failure of this task: no knip entry reaches the file until Task M8b-T8 exports it through `src/index.ts`. Do NOT edit `knip.config.ts` to silence it -- the config carries no `ignoreExportsUsedInFile` key for any workspace and deliberately so (`knip.config.ts:185-195`: knip accepts the key only at the root, "so switching it on applies it to every package at once"), and the `webgpu-graph-algorithms` block at `:54-68` carries only entry / project / ignore / ignoreDependencies. Note the nine names in the task hand-off; Task M8b-T8 Step 3 re-runs knip and it MUST be clean there.

- [ ] **Step 6: Commit (owner)** -- two commits through `tools/commit-changes.sh`: `fix(tools): let commit-changes.sh accept the three format and GPU scopes` for Step 1, then `feat(webgpu-graph-algorithms): grid-stride dispatch and the P7 result types` for Steps 3-4. The `tools` commit MUST land first: every later commit of this plan is scoped `webgpu-graph-algorithms`, which the script refuses until it does.

---

### Task M8b-T2: reverse() and edgeList() residency, and packViews

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 4.3 lines 1180-1190 (views upload `perArray`, never in the arena; the undirected `reverse()` identity; `packViews` concatenates the reverse arrays of a DIRECTED snapshot); design 13 row P7 line 4214 ("`reverse()` residency (identity when undirected; `fwdArc` never touched)").

**Files:**
- Modify: `webgpu-graph-algorithms/src/memory/residency.ts:357-423` (the `view()` switch; the `reverse` / `edgeList` cases and the `packViews` path), `:132-144` (the `ResidencyRecord` gains a `views` map)
- Modify: `webgpu-graph-algorithms/test/memory/residency.test.ts` (the new view cases)
- NOT touched: `src/memory/upload-plan.ts` (windowed planning is P4), `src/kernels.ts` (Task M8b-T3)

**Interfaces:**
- Consumes: `GraphSnapshot.reverse(): ReverseView` (`graph-format/src/types/snapshot.ts:568`), `ReverseView extends AdjacencyView { readonly fwdArc: U32 }` (`:279-282`), `GraphSnapshot.edgeList(): EdgeListView` (`:578`), `EdgeListView { src, dst, arc, weights }` (`:300-311`), `GraphResidency.core(s, need?)` (`src/memory/residency.ts:292`).
- Produces: `residency.view(s, "reverse")` -> `ViewBinding { view: "reverse", bindings: { rowPtr, colIdx, weights? }, scalars: { arcCount, directed } }`; `residency.view(s, "edgeList")` -> `{ bindings: { src, dst, weights? }, scalars: { edgeCount } }`; `residency.view(s, "reverse", { packViews: true })` -> the same binding names over ONE buffer at 256-aligned offsets.

**PLAN DECISION PD-13 (packViews pays off only on DIRECTED snapshots).** Design 4.3 lines 1182-1186 says `reverse()` on an undirected snapshot returns the FORWARD array objects (graph-format invariant I7), "so `residency.view(s, "reverse")` resolves to the SAME buffers as `core()` with no upload -- the WeakMap key is the array object". That last clause is true only on the `perArray` plan: on the `arena` plan the residency registers ONE resident keyed on `s.rowPtr` whose byteLength is the WHOLE arena (`src/memory/residency.ts:316-325`), so an `upload(record, rev.rowPtr, ...)` would find that resident and hand back a binding covering the entire arena instead of the rowPtr segment. M8b therefore implements the undirected case by delegating to `this.core(s, ["rowPtr", "colIdx", "weights"])` and re-labelling its bindings, which is correct and zero-upload on BOTH plans. The consequence for the deliverable line: `packViews` is a no-op on an undirected snapshot (there is nothing to pack -- the arrays are the forward ones, already packed when the core is an arena), and the packed path only ever runs on a directed snapshot. This is narrower than "packViews" sounds and the code says so in a comment.

- [ ] **Step 1: Write the failing residency tests**

Append to `$PKG/test/memory/residency.test.ts`, in a new top-level `describe`:

```ts
describe("the P7 views (spec 4.3 lines 1180-1190)", () => {
    it("the reverse view of an UNDIRECTED snapshot is the core buffers, with no new upload", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const { snapshot } = fixture("karate");
            const core = ctx.residency.core(snapshot);
            const before = ctx.residency.stats().buffers;
            const view = ctx.residency.view(snapshot, "reverse");
            expect(ctx.residency.stats().buffers).toBe(before);
            expect(view.bindings.rowPtr.buffer).toBe(core.rowPtr.buffer);
            expect(view.bindings.rowPtr.offset).toBe(core.rowPtr.offset);
            expect(view.bindings.rowPtr.size).toBe(core.rowPtr.size);
            expect(view.scalars.directed).toEqual([0]);
            ctx.release(snapshot);
        });
    });

    it("the reverse view of a DIRECTED snapshot uploads rowPtr, colIdx and weights and never touches fwdArc", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const s = directedWeighted();
            ctx.residency.core(s);
            const before = ctx.residency.stats().buffers;
            const view = ctx.residency.view(s, "reverse");
            expect(ctx.residency.stats().buffers).toBe(before + 3);
            expect(Object.keys(view.bindings).sort()).toEqual(["colIdx", "rowPtr", "weights"]);
            expect(view.scalars.arcCount).toEqual([s.arcCount]);
            expect(view.scalars.directed).toEqual([1]);
            ctx.release(s);
        });
    });

    it("packViews packs the directed reverse arrays into ONE buffer at 256-aligned offsets", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const s = directedWeighted();
            const packed = ctx.residency.view(s, "reverse", { packViews: true });
            const buffers = new Set(Object.values(packed.bindings).map((b) => b.buffer));
            expect(buffers.size).toBe(1);
            for (const binding of Object.values(packed.bindings)) {
                expect(binding.offset % STORAGE_ALIGN).toBe(0);
                expect(binding.size).toBeGreaterThan(0);
                expect(binding.offset + binding.size).toBeLessThanOrEqual(binding.buffer.size);
            }
            expect(packed.bindings.rowPtr.size).toBe(4 * (s.nodeCount + 1));
            ctx.release(s);
        });
    });

    it("the packed and the unpacked reverse view of ONE snapshot do not share a resident", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const s = directedWeighted();
            const plain = ctx.residency.view(s, "reverse");
            const packed = ctx.residency.view(s, "reverse", { packViews: true });
            // Both builders upload through this.upload(), which memoises on the KEY object and does NOT compare
            // byte lengths (src/memory/residency.ts:624-638). s.reverse() is cached (graph-format
            // graph-snapshot.ts:600-601), so both builders see the SAME rev.rowPtr object: keying the packed
            // buffer on it would hand one of the two views the other's buffer.
            expect(packed.bindings.rowPtr.buffer).not.toBe(plain.bindings.rowPtr.buffer);
            expect(plain.bindings.rowPtr.size).toBe(4 * (s.nodeCount + 1));
            expect(plain.bindings.rowPtr.offset).toBe(0);
            expect(plain.bindings.rowPtr.size).toBe(plain.bindings.rowPtr.buffer.size);
            const w = packed.bindings.weights;
            expect(w.offset + w.size).toBeLessThanOrEqual(w.buffer.size);
            ctx.release(s);
        });
    });

    it("packViews on an UNDIRECTED snapshot returns the core buffers unchanged (nothing to pack)", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const { snapshot } = fixture("karate");
            const core = ctx.residency.core(snapshot);
            const packed = ctx.residency.view(snapshot, "reverse", { packViews: true });
            expect(packed.bindings.rowPtr.buffer).toBe(core.rowPtr.buffer);
            ctx.release(snapshot);
        });
    });

    it("the edgeList view uploads src and dst once and is memoised", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const { snapshot } = fixture("karate");
            const first = ctx.residency.view(snapshot, "edgeList");
            const second = ctx.residency.view(snapshot, "edgeList");
            expect(second.bindings.src.buffer).toBe(first.bindings.src.buffer);
            expect(first.scalars.edgeCount).toEqual([snapshot.edgeCount]);
            ctx.release(snapshot);
        });
    });

    it("coo and mate are still E_UNSUPPORTED (P11)", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const { snapshot } = fixture("karate");
            for (const name of ["coo", "mate"] as const) {
                expect(() => ctx.residency.view(snapshot, name)).toThrow(/not uploaded/);
            }
            ctx.release(snapshot);
        });
    });

    it("release(s) destroys the packed buffer too", async (t) => {
        requireGpu(t);
        await withContext(undefined, async (ctx) => {
            const s = directedWeighted();
            ctx.residency.view(s, "reverse", { packViews: true });
            expect(ctx.residency.stats().buffers).toBeGreaterThan(0);
            ctx.release(s);
            expect(ctx.residency.stats().perSnapshot.some((r) => r.serial === s.serial)).toBe(false);
        });
    });
});
```

Every case follows the file's ONLY established shape -- `requireGpu(t)` then `await withContext(undefined, async (ctx) => { ... })`, as at `test/memory/residency.test.ts:811-813`. There is no `context(t)` helper in this package; `withContext` (`test/helpers/device.ts:83-92`) is the one that exists and it takes a CALLBACK, disposing the context in its `finally`.

Add a local helper above the describe (the fixture set has no directed weighted graph):

```ts
/** A directed weighted snapshot whose reverse arrays differ from the forward ones (graph-format invariant I7 does not apply). */
function directedWeighted(): GraphSnapshot {
    return snapshotOf(
        [
            [0, 1, 2],
            [1, 2, 3],
            [2, 0, 4],
            [0, 3, 5],
            [3, 1, 6],
        ],
        { directed: true, label: "directed-weighted" },
    );
}
```

The file already imports `GraphSnapshot` (`:24`), `snapshotOf` (`:36`), `withContext` (`:35`) and `requireGpu` (`:38`). Two names must be ADDED: `fixture` to the existing `../helpers/graphs.js` import at `:36`, and `STORAGE_ALIGN` from `../../src/constants.js` (a new import line).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/memory/residency.test.ts`
Expected: FAIL, seven of the eight new cases, with the two messages `view()` throws today:
- the three cases that pass `{ packViews: true }` ("packViews packs ...", "the packed and the unpacked ...", "packViews on an UNDIRECTED snapshot ...", and the "release(s) destroys the packed buffer too" case) fail with `E_UNSUPPORTED: packViews is not supported before the P7 view uploads`, thrown at `src/memory/residency.ts:364-369` BEFORE the switch;
- the other three -- the two `"reverse"` cases and the `"edgeList"` case -- fail with `E_UNSUPPORTED: the reverse view is not uploaded before P7` / `the edgeList view is not uploaded before P7`, thrown by the shared `case` arm at `src/memory/residency.ts:404-411`.
The `coo` / `mate` case is the eighth and already PASSES (the same arm, message matched by `/not uploaded/`); it must keep passing after the edit, which is why Step 3 narrows that message rather than deleting the arm.

- [ ] **Step 2: Add the per-record view memo**

In `$PKG/src/memory/residency.ts` add a field to `ResidencyRecord` (`:132-144`):

```ts
    /** Memo of the P7 views by `name` or `name + ":packed"`, so a second view() call uploads nothing (spec 4.3). */
    views: Map<string, ViewBinding>;
    /**
     * One fresh marker object per PACKED view, keyed the same way as `views`. It is the `key` argument of
     * upload(): a packed view must never be keyed on one of the snapshot's own arrays, because upload()
     * memoises on the key object and does NOT compare byte lengths (`:624-638`), and `s.reverse()` is cached
     * (graph-format `graph-snapshot.ts:600-601`) so the packed and the unpacked builder see the same
     * `rev.rowPtr` object.
     */
    packKeys: Map<string, object>;
```

and initialise both to `new Map()` wherever a record is constructed (`ensureRecord`). `forget(record)` must clear both along with `entries`.

- [ ] **Step 3: Implement the reverse, edgeList and packViews cases**

Replace the `packViews` rejection at `:364-369` and the `reverse` / `coo` / `edgeList` / `mate` rejection at `:404-411` so that:

```ts
        const packed = options?.packViews === true;
        if (name === "reverse" || name === "edgeList") {
            this.assertNotReleased(s);
            this.assertNonEmpty(s);
            const memoKey = packed ? `${name}:packed` : name;
            const record = this.ensureRecord(s);
            const memo = record.views.get(memoKey);
            if (memo !== undefined) {
                return memo;
            }
            const built = name === "reverse" ? this.buildReverse(s, record, packed) : this.buildEdgeList(s, record, packed);
            record.views.set(memoKey, built);
            return built;
        }
        if (packed) {
            throw new WebGpuGraphError("E_UNSUPPORTED", "packViews applies to the reverse and edgeList views only", {
                option: "packViews",
                hint: `the ${name} view uploads one array`,
            });
        }
```

and keep `coo` / `mate` in the rejecting branch with the message narrowed to `the ${name} view is not uploaded before P11`.

Add the two private builders below `view()`:

```ts
    /**
     * The reverse adjacency's bindings. On an UNDIRECTED snapshot graph-format invariant I7 makes reverse() return
     * the FORWARD arrays, so the core bindings ARE the reverse bindings and nothing is uploaded -- delegating to
     * core() rather than re-uploading the arrays is what makes that true on the arena plan as well, where the
     * per-array WeakMap key resolves to the whole-arena resident (spec 4.3 lines 1182-1186). `fwdArc` is never
     * uploaded (spec 13 row P7). `packed` is ignored when undirected: there is nothing to pack.
     * @param s - the snapshot
     * @param record - its residency record
     * @param packed - concatenate the arrays into one buffer (directed only)
     * @returns the view binding
     */
    private buildReverse(s: GraphSnapshot, record: ResidencyRecord, packed: boolean): ViewBinding {
        const rev = s.reverse();
        if (!s.directed) {
            const core = this.core(s, ["rowPtr", "colIdx", "weights"]);
            const bindings: Record<string, Binding> = { rowPtr: core.rowPtr };
            if (core.colIdx !== null) {
                bindings.colIdx = core.colIdx;
            }
            if (core.weights !== null) {
                bindings.weights = core.weights;
            }
            return Object.freeze({
                view: "reverse",
                bindings: Object.freeze(bindings),
                scalars: Object.freeze({ arcCount: [rev.arcCount], directed: [0] }),
            });
        }
        const arrays: [string, TypedArrayData][] = [
            ["rowPtr", rev.rowPtr],
            ["colIdx", rev.colIdx],
        ];
        if (rev.weights !== null) {
            arrays.push(["weights", rev.weights]);
        }
        const bindings = packed
            ? this.packArrays(record, arrays, this.packKey(record, "reverse:packed"), `residency:view:${record.serial}:reverse:packed`)
            : this.separateArrays(record, arrays, `residency:view:${record.serial}:reverse`);
        return Object.freeze({
            view: "reverse",
            bindings,
            scalars: Object.freeze({ arcCount: [rev.arcCount], directed: [1] }),
        });
    }

    /**
     * The each-edge-once binding an edge-parallel kernel uses on directed and undirected snapshots alike (spec 8.1
     * row 2); `arc` is not uploaded (no kernel of P7 reads it).
     * @param s - the snapshot
     * @param record - its residency record
     * @param packed - concatenate into one buffer
     * @returns the view binding
     */
    private buildEdgeList(s: GraphSnapshot, record: ResidencyRecord, packed: boolean): ViewBinding {
        const list = s.edgeList();
        const arrays: [string, TypedArrayData][] = [
            ["src", list.src],
            ["dst", list.dst],
        ];
        if (list.weights !== null) {
            arrays.push(["weights", list.weights]);
        }
        const bindings = packed
            ? this.packArrays(record, arrays, this.packKey(record, "edgeList:packed"), `residency:view:${record.serial}:edgeList:packed`)
            : this.separateArrays(record, arrays, `residency:view:${record.serial}:edgeList`);
        return Object.freeze({
            view: "edgeList",
            bindings,
            scalars: Object.freeze({ edgeCount: [s.edgeCount] }),
        });
    }
```

and the two shared helpers:

```ts
    /**
     * One resident per array (spec 4.3: views upload in perArray mode, never into the arena).
     * @param record - the owning record
     * @param arrays - the named arrays
     * @param label - the buffer label prefix
     * @returns the bindings by name
     */
    private separateArrays(
        record: ResidencyRecord,
        arrays: readonly (readonly [string, TypedArrayData])[],
        label: string,
    ): Readonly<Record<string, Binding>> {
        const bindings: Record<string, Binding> = {};
        for (const [name, array] of arrays) {
            const resident = this.upload(record, array, array, `${label}:${name}`);
            bindings[name] = { buffer: resident.buffer, offset: 0, size: resident.byteLength, window: null };
        }
        return Object.freeze(bindings);
    }

    /**
     * The arrays concatenated into ONE buffer at STORAGE_ALIGN-aligned offsets (spec 4.3 packViews): one
     * createBuffer and one writeBuffer instead of three of each, which is what the option buys. The resident is
     * keyed on `key`, a marker object owned by the record (packKey), NOT on one of the snapshot's arrays: upload()
     * returns an existing resident whenever the key matches and the serial matches, without comparing byte
     * lengths (`:624-638`), so keying the packed buffer on `rev.rowPtr` would make the packed and the unpacked
     * view of one snapshot collide -- whichever was built second would get the other's buffer. The record still
     * owns the resident, so release(s) destroys it with the rest.
     * @param record - the owning record
     * @param arrays - the named arrays, in buffer order
     * @param key - the marker object the resident is keyed on
     * @param label - the buffer label
     * @returns the bindings by name, all into the one buffer
     */
    private packArrays(
        record: ResidencyRecord,
        arrays: readonly (readonly [string, TypedArrayData])[],
        key: object,
        label: string,
    ): Readonly<Record<string, Binding>> {
        const offsets: number[] = [];
        let total = 0;
        for (const [, array] of arrays) {
            offsets.push(total);
            total += Math.ceil(array.byteLength / STORAGE_ALIGN) * STORAGE_ALIGN;
        }
        const staging = new Uint8Array(total);
        arrays.forEach(([, array], i) => {
            staging.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offsets[i]);
        });
        const resident = this.upload(record, key, staging, label);
        const bindings: Record<string, Binding> = {};
        arrays.forEach(([name, array], i) => {
            bindings[name] = { buffer: resident.buffer, offset: offsets[i], size: array.byteLength, window: null };
        });
        return Object.freeze(bindings);
    }

    /**
     * The upload key of a packed view: a marker object allocated once per record and memo name, never one of the
     * snapshot's arrays.
     * @param record - the owning record
     * @param memoKey - the `views` memo key of this packed view
     * @returns the stable marker object
     */
    private packKey(record: ResidencyRecord, memoKey: string): object {
        const existing = record.packKeys.get(memoKey);
        if (existing !== undefined) {
            return existing;
        }
        const created = {};
        record.packKeys.set(memoKey, created);
        return created;
    }
```

Reason for the 256-byte alignment rather than 4: `Kernel.bind` rejects any binding whose `offset % STORAGE_ALIGN !== 0` (`src/kernel/kernel.ts:157-166`), so a packed buffer whose segments are only 4-aligned is unbindable and the failure is a synchronous `E_INVALID_ARGUMENT { argument: "offset" }` at the first `bind()`, not at upload time.

Import `STORAGE_ALIGN` from `../constants.js` if it is not already imported.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/memory/residency.test.ts`
Expected: PASS, all eight new cases and every pre-existing one. If `the reverse view of an UNDIRECTED snapshot` reports one extra buffer, `buildReverse` took the directed branch: check `s.directed`, not `rev.directed`. If `the packed and the unpacked reverse view of ONE snapshot do not share a resident` fails, `packArrays` was still keyed on `arrays[0][1]` instead of on `packKey(record, ...)`.

- [ ] **Step 4: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node test/memory`
Expected: build, eslint, both `tsc` runs and the whole `test/memory` suite green on lavapipe as well as NVIDIA.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): upload the reverse and edge-list views, with packViews` through `tools/commit-changes.sh`. The body records PD-13 (the undirected identity is implemented by delegating to `core()` because the arena plan's WeakMap key is the whole arena) and the `packKeys` marker (a packed view is keyed on a record-owned object, never on `rev.rowPtr`, because `upload()` memoises on the key without comparing byte lengths).

---

### Task M8b-T3: The P7 kernel registry -- seven bodies, three blocks, and the closed unions they widen

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 9 line 1576 (`spmvPull`); design 8.2 lines 2572-2606 (the three PageRank dispatches and the `partials` header); design 8.3 lines 2611-2625 (Afforest); design 8.10 lines 2830-2841 (the binding counts G7 tests); design 5.3 (uniform layout rules); `webgpu-graph-algorithms/CLAUDE.md:161-196` (the WGSL conventions).

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/spmv-pull.wgsl.ts`, `pr-scale.wgsl.ts`, `pr-finalize.wgsl.ts`, `wcc-link-sample.wgsl.ts`, `wcc-link-edges.wgsl.ts`, `wcc-compress.wgsl.ts`, `wcc-sample.wgsl.ts`
- Modify: `webgpu-graph-algorithms/src/kernels.ts:30-40` (`KernelId`), `:55` (`KernelEntry.phase`), `:60-170` (the FOUR new blocks: `SPMV_PARAMS`, `PR_PARAMS`, `PR_PARTIAL`, `WCC_PARAMS`), `:200-390` (the seven entries), `:392-403` (`REGISTRY`)
- Modify: `webgpu-graph-algorithms/test/kernel/registry.test.ts:50` (the local `phase` union) and `:67-231` (seven `TABLE` rows)
- Modify: `webgpu-graph-algorithms/test/kernel/bind-group-budget.test.ts:19-30` (seven `STORAGE_COUNTS` rows)
- Modify: `webgpu-graph-algorithms/test/helpers/override-matrix.ts:56-61` (`U32_OVERRIDE_VALUES` gains `NORM_MODE`), `:68` (`EXPECTED_CASES_BY_PHASE` gains `P7`)
- NOT touched: `test/helpers/sabotage.ts` and `test/sabotage/**` (Task M8b-T10 owns them: `test/sabotage/coverage.test.ts:91-99` requires every mutation's `test` to name an EXISTING file, and the P7 test files do not exist until T4-T7), `src/primitives/**` (Task M8b-T4), `src/algorithms/**` (Tasks M8b-T4..T7)

**Interfaces:**
- Consumes: `BindingDecl` / `OverrideDecl` / `WgslModuleSpec` (`src/kernel/wgsl.ts:29-52`), `UniformBlock.define` (`src/kernel/struct-block.ts:177`), `GRAPH_SLOTS` (`src/kernels.ts:194-199`), the prelude helpers `linear_id`, `group_id`, `lowbias32`, `wg_reduce_vec4` and the constants `WG`, `U32_MAX` (`src/kernel/prelude.ts:59-61`, `:90-127`, `:207`).
- Produces: the `KernelId` members `"spmv-pull" | "pr-scale" | "pr-finalize" | "wcc-link-sample" | "wcc-link-edges" | "wcc-compress" | "wcc-sample"`; the exported blocks `SPMV_PARAMS`, `PR_PARAMS`, `PR_PARTIAL`, `WCC_PARAMS`; `KernelEntry.phase` widened to `"P1" | "P2" | "P3" | "P7"`.

**PLAN DECISION PD-1 (`spmvPull` is its own registry entry, not a `segmentedReduce` snippet).** Design 6 row 9 (`:1576`) calls `spmvPull` "`segmentedReduce` specialised". It cannot be: the VALUE snippet vocabulary is exactly `row, arc, nbr, weight, v` (`src/primitives/segmented-reduce.ts:40`) plus a 31-word WGSL allowlist (`:48-80`), and `validateValueSnippet` (`:120-142`) rejects every other identifier textually, before any shader is created, with `E_SHADER_COMPILE { stage: "compose", slot: "VALUE", identifier }`. A pull kernel must read `xNorm[nbr]` -- a BINDING -- inside the fold, and a binding name is precisely what the allowlist's comment says is "NOT in it and is rejected as an identifier". The two design statements are in tension, and the design's own 8.10 table (`:2839`) resolves it: it gives `spmvPull` an eight-storage-binding descriptor row, which no variant of `segmented-reduce` (five storage bindings, pinned at `test/kernel/bind-group-budget.test.ts:22`) can have. G7 tests the descriptor row, so the table wins. The alternative that was REJECTED: widening `VALUE_SNIPPET_VOCABULARY` to admit `xNorm`. It would turn the snippet check from "a closed vocabulary" into "a vocabulary plus whatever the current caller binds", which is exactly the property that makes the check catch a typo'd binding name before a device sees it. Recorded as DEP-M8B-A and as a decision file by Task M8b-T11.

**PLAN DECISION PD-2 (tier 0 only).** `prepareSegmentedReduce` throws `E_UNSUPPORTED { feature: "segmentedReduce.tiers" }` for any non-null `tiers` (`src/primitives/segmented-reduce.ts:258-262`), and design 6 row 3 (`:1570`) assigns the subgroup-per-row and workgroup-per-row tiers to P4, gated at G4. `spmvPull` therefore ships ONE tier: thread-per-row with a grid-stride outer loop. The `perm` slot is still declared and still bound (design 8.2: "the slot exists whether or not the permutation is the identity, 3.5"), `USE_PERM` is false, and `residency.view(s, "reverseDegreeOrder")` already uploads the in-degree permutation and its `segmentOffsets` (`src/memory/residency.ts:394-400`), so P4 adds a `TIER` override and two dispatch ranges and nothing else. The REJECTED alternative was implementing the tiers here: it is P4's deliverable, design 13 rule (b) forbids a phase absorbing a later phase's primitives, and a hub row of 10k in-arcs on one thread is a performance problem, not a correctness one -- T-8 is measured with the tier-0 kernel and either meets the target or is recorded as missed under the design 10.4 rule (`:3397-3402`: "a target that is missed does not close its phase; the owner either re-fixes the target ... or the phase continues"). Recorded as DEP-M8B-B.

**PLAN DECISION PD-3 (four closed unions -- five files -- not a registry append).** Adding a P7 kernel is a TYPE change, not an append:
1. `src/kernels.ts:30-40` `KernelId` is a closed union of ten ids.
2. `src/kernels.ts:55` `KernelEntry.phase` is `"P1" | "P2" | "P3"`.
3. `test/kernel/registry.test.ts:50` declares its OWN `phase: "P1" | "P2" | "P3"` and `:67` types `TABLE` as `Readonly<Record<KernelId, ExpectedEntry>>` -- a total record, so a new `KernelId` member is a compile error until its row exists.
4. `test/helpers/override-matrix.ts:68` `EXPECTED_CASES_BY_PHASE` is `Readonly<Record<"P1" | "P2" | "P3", number>>`, read by `test/kernel/wgsl-compile.test.ts:42-46` as `EXPECTED_CASES_BY_PHASE[phase]` for every phase present in `KERNELS`.
5. `test/helpers/sabotage.ts:338` `SABOTAGE_PHASES` is `readonly ("P1" | "P2" | "P3")[]` (Task M8b-T10 widens it, with the rows).
All five must change together or the package does not compile. `test/kernel/bind-group-budget.test.ts:19-30` is typed `Record<string, number | undefined>` and so does NOT break the build -- but its `STORAGE_COUNTS` is what G7's descriptor clause is tested through, so the seven rows are part of this task.

**PLAN DECISION PD-4 (the WCC changed flag lives inside `comp`).** Design 8.10's Afforest row (`:2841`) names four buffers and counts THREE, and the paragraph above it (`:2833-2835`) fixes the rule: "counters and flags share one small `u32` block". `comp` is `array<atomic<u32>>` of `n + 1` words; the word at `P.flagIndex` (= `n`) is the changed flag. Three storage bindings, exactly the design's number, no separate flag buffer to bind, and no second atomic array. Resetting the flag between batches is `device.queue.writeBuffer(comp, 4 * n, ZERO)` on the host, which needs 4-byte alignment only. The REJECTED alternative was a separate 4-byte `changed` buffer: it is a fourth binding, it contradicts the count G7 tests, and its 256-aligned binding offset would waste a whole pool class for one word.

**PLAN DECISION PD-5 (atomics enter the package here).** No WGSL body in `src/wgsl/` uses an atomic today (`grep -rn 'atomic<\|atomicLoad\|atomicStore\|atomicCompareExchangeWeak' src/wgsl/` returns nothing; a bare `grep -rn atomic src/wgsl/` is NOT the command to run -- it matches the prose of `src/wgsl/fa2-attraction.wgsl.ts:3`, "no atomics"). The three WCC bodies introduce `array<atomic<u32>>` with `atomicLoad`, `atomicStore` and `atomicCompareExchangeWeak`. The rules they follow, each with its reason:
- The whole array is atomic. WGSL forbids mixing atomic and plain access to one element, which design 8.3 (`:2617-2618`) states explicitly; a plain read of `comp[v]` beside an atomic write is a shader-creation error on Tint, not a race at runtime.
- `atomicCompareExchangeWeak` may fail SPURIOUSLY. Every call is inside a retry loop, as GAP's `Link` is; a spurious failure costs one more iteration and never a wrong answer.
- Every atomic loop is BOUNDED by `P.maxSteps` (a uniform). An unbounded `loop` in WGSL is legal and GAP's terminates, but a device that hangs is a TDR, not a test failure. On exhaustion the link kernel sets the changed flag, so the host runs another round and the result is still correct; the host's own round cap (Task M8b-T7) turns a pathological input into `E_VALIDATION`, never into a CPU fallback.
- No bitwise operator touches an index (`webgpu-graph-algorithms/CLAUDE.md` house style). The sampler uses `%`, and `lowbias32` -- whose own shifts are the prelude's, already parenthesised (`src/kernel/prelude.ts:61-68`) -- supplies the hash.

- [ ] **Step 1: The four storage / uniform blocks**

In `$PKG/src/kernels.ts`, after `FA2_PARTIAL` (`:160`), add:

```ts
/** `SpmvParams` (uniform, 32 B; spec 8.2): `n` @0 rows of the pull, the bound arc window `[arcBase, arcEnd)` @4 / @8 (0 and arcCount when not windowed), the grid-stride step `stride` @12, `alpha` @16, `beta` @20 (the `1 - alpha` term), `uniformP` @24 (the uniform personalization mass `1 / n`, 0 for a pure SpMV), `pad0` @28. */
export const SPMV_PARAMS: UniformBlock = UniformBlock.define("SpmvParams", [
    ["n", "u32"],
    ["arcBase", "u32"],
    ["arcEnd", "u32"],
    ["stride", "u32"],
    ["alpha", "f32"],
    ["beta", "f32"],
    ["uniformP", "f32"],
    ["pad0", "u32"],
]);

/** `PrParams` (uniform, 32 B; spec 8.2): `n` @0, `groups` @4 (the per-workgroup partial count the finalize folds), `iteration` @8 (1-based), `trackConvergence` @12 (1 records firstConverged), `convergeThreshold` @16 (`tolerance * n`, the design's `delta < tol * n`), `pad0` @20, `pad1` @24, `pad2` @28. */
export const PR_PARAMS: UniformBlock = UniformBlock.define("PrParams", [
    ["n", "u32"],
    ["groups", "u32"],
    ["iteration", "u32"],
    ["trackConvergence", "u32"],
    ["convergeThreshold", "f32"],
    ["pad0", "u32"],
    ["pad1", "u32"],
    ["pad2", "u32"],
]);

/**
 * `PrPartial` (storage record, 32 B; spec 8.2). Element 0 is the HEADER, whose first 16 bytes are exactly the four
 * fields the design names -- `danglingMass` @0, `delta` @4, `firstConvergedIteration` @8, `iteration` @12 -- plus
 * `norm` @16, which M8b adds so HITS / eigenvector / Katz keep their normaliser on the device (PD-10). Element
 * `1 + g` is workgroup g's partial: it uses `danglingMass`, `delta` and `norm` as three sums and leaves the two u32
 * fields zero.
 */
export const PR_PARTIAL: UniformBlock = UniformBlock.define(
    "PrPartial",
    [
        ["danglingMass", "f32"],
        ["delta", "f32"],
        ["firstConverged", "u32"],
        ["iteration", "u32"],
        ["norm", "f32"],
        ["pad0", "f32"],
        ["pad1", "f32"],
        ["pad2", "f32"],
    ],
    { layout: "storage" },
);

/** `WccParams` (uniform, 32 B; spec 8.3): `n` @0, `items` @4 (rows for a sample round, edges for an edge round, 1024 for the sampler), `stride` @8, `r` @12 (the neighbour index of the sampled round, and the sampler's seed), `flagIndex` @16 (the changed word inside `comp`, PD-4), `giant` @20 (`U32_MAX` before the sample), `maxSteps` @24, `pad0` @28. */
export const WCC_PARAMS: UniformBlock = UniformBlock.define("WccParams", [
    ["n", "u32"],
    ["items", "u32"],
    ["stride", "u32"],
    ["r", "u32"],
    ["flagIndex", "u32"],
    ["giant", "u32"],
    ["maxSteps", "u32"],
    ["pad0", "u32"],
]);
```

Reason for 32 bytes everywhere: design 5.3 requires scalars grouped into 16-byte-aligned members and forbids `vec3` and scalar arrays in uniforms because Chromium 139 lacks `uniform_buffer_standard_layout`; eight `u32` / `f32` fields is the simplest shape that satisfies it, and `UniformBlock` emits the struct text and the `write()` offsets from the one declaration so they cannot disagree (D20).

- [ ] **Step 2: The `spmv-pull` body**

Create `$PKG/src/wgsl/spmv-pull.wgsl.ts`:

```ts
/**
 * The `spmv-pull` kernel body (spec 6 row 9, 8.2; PD-1 of the M8b plan): one invocation per row of the REVERSE
 * adjacency, grid-stride over `[0, P.n)`, folding `weight * xNorm[nbr]` over the row's in-arcs with Kahan
 * compensation and writing `rankOut[v] = beta * pv + alpha * (sum + danglingMass * pv)`, where `pv` is
 * `personalization[v]` when HAS_PERSONALIZATION and the uniform `P.uniformP` otherwise. PageRank sets alpha to the
 * damping factor, beta to `1 - alpha` and USE_DANGLING; HITS and eigenvector set alpha 1, beta 0, uniformP 0; Katz
 * sets alpha to the attenuation, beta to its constant and uniformP 1. The body is normative: a sabotage mutation
 * (test/helpers/sabotage.ts) is a textual edit of it, so it is not restyled.
 */

/** Entry point `spmv_pull`; overrides HAS_PERSONALIZATION and USE_DANGLING plus the standard USE_PERM / HAS_WEIGHTS. */
export const spmvPullWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn spmv_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    var dangling = 0.0;
    if (USE_DANGLING) { dangling = partials[0].danglingMass; }
    let first = linear_id(wid, lid.x);
    for (var row = first; row < P.n; row = row + P.stride) {
        let v = select(row, perm[row], USE_PERM);
        let a0 = max(rowPtr[v], P.arcBase);
        let a1 = min(rowPtr[v + 1u], P.arcEnd);
        var acc = 0.0;
        var resid = 0.0;
        for (var arc = a0; arc < a1; arc = arc + 1u) {
            let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2)
            var weight = 1.0;
            if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
            let term = (weight * xNorm[nbr]) - resid;
            let nextAcc = acc + term;
            resid = (nextAcc - acc) - term;
            acc = nextAcc;
        }
        var pv = P.uniformP;
        if (HAS_PERSONALIZATION) { pv = personalization[v]; }
        rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)));
    }
}
`;
```

Note the grid-stride loop rather than a `row >= P.n` early return: the map is order-independent, so the plan may cover the rows with fewer workgroups than `ceil(n / WG)` (design 5.2 line 1420), and a row written twice by two invocations would receive the same value anyway.

- [ ] **Step 3: The `pr-scale` and `pr-finalize` bodies**

Create `$PKG/src/wgsl/pr-scale.wgsl.ts`:

```ts
/**
 * The `pr-scale` kernel body (spec 8.2 dispatch (a)): one invocation per node writes `xNorm[u]` and contributes a
 * per-workgroup partial of the dangling mass, the L1 delta `|rankIn - rankPrev|` and, for the spectral modes, the
 * norm term. NORM_MODE selects the divisor: 0 PageRank (`rankIn[u] / outWeightSum[u]`, 0 and a dangling
 * contribution when the sum is not positive); 1 and 2 are NORM PASSES that write no xNorm and only accumulate
 * `abs(x)` (L1) or `x * x` (L2); 3 divides by the scalar `partials[0].norm` the previous dispatch folded; 4 is the
 * identity (Katz). The body is normative: a sabotage mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `pr_scale`; override NORM_MODE (0 PageRank, 1 L1 norm pass, 2 L2 norm pass, 3 scale by partials[0].norm, 4 identity). */
export const prScaleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn pr_scale(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let u = linear_id(wid, lid.x);
    let inRange = u < P.n;
    var x = 0.0;
    var prev = 0.0;
    if (inRange) { x = rankIn[u]; prev = rankPrev[u]; }
    var dangling = 0.0;
    var delta = 0.0;
    var normTerm = 0.0;
    if (inRange) {
        delta = abs(x - prev);
        if (NORM_MODE == 0u) {
            let divisor = outWeightSum[u];
            if (divisor <= 0.0) { dangling = x; xNorm[u] = 0.0; } else { xNorm[u] = x / divisor; }
        }
        if (NORM_MODE == 1u) { normTerm = abs(x); }
        if (NORM_MODE == 2u) { normTerm = x * x; }
        if (NORM_MODE == 3u) {
            var scale = partials[0].norm;
            if (scale <= 0.0) { scale = 1.0; }
            xNorm[u] = x / scale;
        }
        if (NORM_MODE == 4u) { xNorm[u] = x; }
    }
    let folded = wg_reduce_vec4(vec4f(dangling, delta, normTerm, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        let slot = 1u + group_id(wid);
        partials[slot].danglingMass = folded.x;
        partials[slot].delta = folded.y;
        partials[slot].norm = folded.z;
    }
}
`;
```

The shape obeys design 3.5 rule 1 exactly as `webgpu-graph-algorithms/CLAUDE.md:176-180` states it: every per-invocation read and write is inside the `inRange` guard, the reduction runs unconditionally after it, and the only early exit is the `lid.x == 0u` store, which touches no barrier.

The guard is named `inRange` and NOT `active`: `active` is the fourth entry of `WGSL_RESERVED_WORDS` (`src/kernel/prelude.ts:216`, the list beginning `NULL Self abstract active alignas ...`), and `validateBody` rejects ANY identifier token of the stripped body that is in that set with `E_SHADER_COMPILE { slot: "reserved:active" }` before a device is ever touched (`src/kernel/wgsl.ts:395-403`). Check every new body the same way before composing it -- `node tmp/m8b/reserved-scan.mjs`, a five-line script that tokenises the body and tests each identifier against `WGSL_RESERVED_WORDS` -- rather than by eye; the seven bodies of this task were checked that way and `active` was the only hit.

Create `$PKG/src/wgsl/pr-finalize.wgsl.ts`:

```ts
/**
 * The `pr-finalize` kernel body (spec 8.2 dispatch (b)): ONE workgroup folds the `P.groups` per-workgroup partials
 * into the header at `partials[0]` -- a STORAGE region, never a uniform, read by the next dispatch of the same
 * pass -- and records `firstConverged` the first time the delta falls below `P.convergeThreshold`. NORM_MODE 2
 * stores the square root of the folded norm (the L2 case). The recorded iteration is `P.iteration - 1u` because
 * the delta a scale pass produces at iteration i is `|x(i-1) - x(i-2)|`, the error of iteration i - 1 (PD-9).
 * The body is normative: a sabotage mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `pr_finalize`; override NORM_MODE (2 takes the square root of the folded norm, every other value stores it as folded). */
export const prFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn pr_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    var d = 0.0;
    var e = 0.0;
    var m = 0.0;
    for (var g = lid.x; g < P.groups; g = g + WG) {
        d = d + partials[1u + g].danglingMass;
        e = e + partials[1u + g].delta;
        m = m + partials[1u + g].norm;
    }
    let folded = wg_reduce_vec4(vec4f(d, e, m, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        partials[0].danglingMass = folded.x;
        partials[0].delta = folded.y;
        var norm = folded.z;
        if (NORM_MODE == 2u) { norm = sqrt(max(0.0, folded.z)); }
        partials[0].norm = norm;
        partials[0].iteration = P.iteration;
        let unset = partials[0].firstConverged == U32_MAX;
        if (P.trackConvergence == 1u && P.iteration >= 2u && folded.y < P.convergeThreshold && unset) {
            partials[0].firstConverged = P.iteration - 1u;
        }
    }
}
`;
```

- [ ] **Step 4: The four WCC bodies**

Create `$PKG/src/wgsl/wcc-link-sample.wgsl.ts`:

```ts
/**
 * The `wcc-link-sample` kernel body (spec 8.3): one of Afforest's sampled link rounds -- every vertex links its
 * r-th neighbour, `colIdx[rowPtr[v] + P.r]`, when it has one. `link_pair` is GAP's `Link` (gapbs/cc.cc lines
 * 40-150) transcribed for WGSL: all-u32 CAS on `comp`, which is `array<atomic<u32>>` because WGSL forbids mixing
 * atomic and plain access to one element, with a bounded retry loop (PD-5). The changed flag is the word at
 * `P.flagIndex` inside the same array (PD-4). The body is normative: a sabotage mutation is a textual edit of it,
 * so it is not restyled.
 */

/** Entry point `wcc_link_sample`; standard USE_PERM / HAS_WEIGHTS only (the body reads neither weights nor a permutation beyond the row select). */
export const wccLinkSampleWgsl = /* wgsl */ `
fn link_pair(a: u32, b: u32) {
    var p1 = atomicLoad(&comp[a]);
    var p2 = atomicLoad(&comp[b]);
    var steps = 0u;
    loop {
        if (p1 == p2) { break; }
        if (steps >= P.maxSteps) { atomicStore(&comp[P.flagIndex], 1u); break; }
        steps = steps + 1u;
        let hi = max(p1, p2);
        let lo = min(p1, p2);
        let pHigh = atomicLoad(&comp[hi]);
        if (pHigh == lo) { break; }
        if (pHigh == hi) {
            let swapped = atomicCompareExchangeWeak(&comp[hi], hi, lo);
            if (swapped.exchanged) { atomicStore(&comp[P.flagIndex], 1u); break; }
        }
        p1 = atomicLoad(&comp[atomicLoad(&comp[hi])]);
        p2 = atomicLoad(&comp[lo]);
    }
}

@compute @workgroup_size(WG)
fn wcc_link_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var row = first; row < P.items; row = row + P.stride) {
        let v = select(row, perm[row], USE_PERM);
        let a0 = rowPtr[v];
        let a1 = rowPtr[v + 1u];
        if (a0 + P.r < a1) {
            link_pair(v, colIdx[a0 + P.r]);
        }
    }
}
`;
```

Create `$PKG/src/wgsl/wcc-link-edges.wgsl.ts` with the same `link_pair` function (each module is composed alone, so the helper is copied, not shared) and the entry point:

```ts
@compute @workgroup_size(WG)
fn wcc_link_edges(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var e = first; e < P.items; e = e + P.stride) {
        let u = edgeSrc[e];
        let v = edgeDst[e];
        if (u == v) { continue; }
        if (atomicLoad(&comp[u]) == P.giant && atomicLoad(&comp[v]) == P.giant) { continue; }
        link_pair(u, v);
    }
}
```

Its header comment says: the each-edge-once round of spec 8.3, correct for directed and undirected input alike because `edgeList()` yields every logical edge once in declared orientation (design 10.1); the `P.giant` guard is GAP's "skip the vertices already in the giant component" and is a pure optimisation -- linking two vertices already in one component is a no-op.

Create `$PKG/src/wgsl/wcc-compress.wgsl.ts`:

```ts
/**
 * The `wcc-compress` kernel body (spec 8.3): pointer jumping to the root, reading through `atomicLoad` on the same
 * `array<atomic<u32>>` because WGSL forbids mixing atomic and plain access to one element. The walk is bounded by
 * `P.maxSteps`; a walk that runs out leaves a shorter path, which the next round finishes. The body is normative:
 * a sabotage mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `wcc_compress`; no overrides. */
export const wccCompressWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn wcc_compress(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var v = first; v < P.items; v = v + P.stride) {
        var root = atomicLoad(&comp[v]);
        var steps = 0u;
        loop {
            let parent = atomicLoad(&comp[root]);
            if (parent == root) { break; }
            if (steps >= P.maxSteps) { break; }
            steps = steps + 1u;
            root = parent;
        }
        atomicStore(&comp[v], root);
    }
}
`;
```

Create `$PKG/src/wgsl/wcc-sample.wgsl.ts`:

```ts
/**
 * The `wcc-sample` kernel body (spec 8.3 "a 1,024-entry histogram readback to find the giant component"): writes
 * the component label of `P.items` pseudo-randomly chosen vertices into `hist`, which the host reads back and takes
 * the mode of (PD-12: GAP's SampleFrequentElement counts on the host too, and a device histogram over component
 * ids would return a bucket, not an id). The sampler uses the prelude's `lowbias32` and `%`, never a bitwise
 * operator on an index.
 */

/** Entry point `wcc_sample`; no overrides. */
export const wccSampleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn wcc_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.items) { return; }
    let v = lowbias32(i + P.r) % P.n;
    hist[i] = atomicLoad(&comp[v]);
}
`;
```

- [ ] **Step 5: Widen the unions and register the seven entries**

In `$PKG/src/kernels.ts`:

1. Extend `KernelId` (`:30-40`) with the seven new members, appended after `"fa2-to-scene"` (the header at `:29` says "P4+ ids are appended, never renamed"):
   `| "spmv-pull" | "pr-scale" | "pr-finalize" | "wcc-link-sample" | "wcc-link-edges" | "wcc-compress" | "wcc-sample"`.
2. Widen `KernelEntry.phase` (`:55`) to `"P1" | "P2" | "P3" | "P7"`.
3. Import the seven bodies beside the existing `src/wgsl/*` imports.
4. Add the seven entries, each in the shape of `DEGREE` / `SEGMENTED_REDUCE`, with these exact fields:

| id | entryPoint | bindings (after GRAPH_SLOTS where noted) | overrideDecls | uniforms | needs | storage count |
| --- | --- | --- | --- | --- | --- | --- |
| `spmv-pull` | `spmv_pull` | GRAPH_SLOTS + `(1,0,"xNorm","storage-ro","array<f32>")`, `(1,1,"rankOut","storage","array<f32>")`, `(1,2,"personalization","storage-ro","array<f32>")`, `(1,3,"partials","storage-ro","array<PrPartial>")`, `(2,0,"P","uniform","SpmvParams")` | `HAS_PERSONALIZATION` bool false, `USE_DANGLING` bool false | `[SPMV_PARAMS, PR_PARTIAL]` | `[]` | 8 |
| `pr-scale` | `pr_scale` | `(1,0,"rankIn","storage-ro","array<f32>")`, `(1,1,"rankPrev","storage-ro","array<f32>")`, `(1,2,"outWeightSum","storage-ro","array<f32>")`, `(1,3,"xNorm","storage","array<f32>")`, `(1,4,"partials","storage","array<PrPartial>")`, `(2,0,"P","uniform","PrParams")` | `NORM_MODE` u32 0 | `[PR_PARAMS, PR_PARTIAL]` | `["subgroups"]` | 5 |
| `pr-finalize` | `pr_finalize` | `(1,0,"partials","storage","array<PrPartial>")`, `(2,0,"P","uniform","PrParams")` | `NORM_MODE` u32 0 | `[PR_PARAMS, PR_PARTIAL]` | `["subgroups"]` | 1 |
| `wcc-link-sample` | `wcc_link_sample` | GRAPH_SLOTS + `(1,0,"comp","storage","array<atomic<u32>>")`, `(2,0,"P","uniform","WccParams")` | none | `[WCC_PARAMS]` | `[]` | 5 |
| `wcc-link-edges` | `wcc_link_edges` | `(1,0,"edgeSrc","storage-ro","array<u32>")`, `(1,1,"edgeDst","storage-ro","array<u32>")`, `(1,2,"comp","storage","array<atomic<u32>>")`, `(2,0,"P","uniform","WccParams")` | none | `[WCC_PARAMS]` | `[]` | 3 |
| `wcc-compress` | `wcc_compress` | `(1,0,"comp","storage","array<atomic<u32>>")`, `(2,0,"P","uniform","WccParams")` | none | `[WCC_PARAMS]` | `[]` | 1 |
| `wcc-sample` | `wcc_sample` | `(1,0,"comp","storage","array<atomic<u32>>")`, `(1,1,"hist","storage","array<u32>")`, `(2,0,"P","uniform","WccParams")` | none | `[WCC_PARAMS]` | `[]` | 2 |

Every entry carries `snippetSlots: []` and `phase: "P7"`. The first three counts are exactly design 8.10's rows (`:2839-2840`): `spmvPull` at 8, `pr-scale` / `pr-finalize` at 5 / 1, Afforest link / compress at 3 / 1 and the histogram sample at 2. `wcc-link-sample` is not in the 8.10 table (it walks the CSR rather than the edge list) and takes the four graph slots every row-walking kernel declares (design 3.5), which is 5.

5. Add the seven keys to `REGISTRY` (`:392-403`), in the order of the table above, after `"fa2-to-scene"`.

Run: `cd $PKG && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: FAIL with exactly two errors, and NOT at the sites a first reading suggests:
1. `Property 'spmv-pull' is missing in type ...` at `test/kernel/registry.test.ts:67`, the total `const TABLE: Readonly<Record<KernelId, ExpectedEntry>>`, naming all seven new ids.
2. An index error on `EXPECTED_CASES_BY_PHASE[phase]` at its CONSUMER, `test/kernel/wgsl-compile.test.ts:46` (`expected += EXPECTED_CASES_BY_PHASE[phase];`), because `phase` now ranges over `"P1" | "P2" | "P3" | "P7"` while the record is keyed `"P1" | "P2" | "P3"`. `test/helpers/override-matrix.ts:68` is the DECLARATION and reports nothing by itself.
There is NO error at `test/kernel/registry.test.ts:347`: that line is `expect(entry.phase).toBe(expected.phase);`, a runtime expectation whose `expected.phase` is assignable to the widened `entry.phase` either way. The `phase: "P7"` assignability errors appear only once Step 6 item 2 adds the seven `TABLE` rows while `:50` still declares the narrow union -- which is why Step 6 changes `:50` first. That is PD-3 showing itself; Step 6 fixes all of it.

- [ ] **Step 6: The four test-side type edits**

1. `test/kernel/registry.test.ts:50`: `readonly phase: "P1" | "P2" | "P3" | "P7";`
2. `test/kernel/registry.test.ts:67-231`: seven `TABLE` rows transcribing the table of Step 5 into `BindingRow` / `OverrideRow` tuples, each with its `storageCount` and `phase: "P7"`. Use `withGraph([...])` for `spmv-pull` and `wcc-link-sample`.
3. `test/kernel/bind-group-budget.test.ts:19-30`: `"spmv-pull": 8, "pr-scale": 5, "pr-finalize": 1, "wcc-link-sample": 5, "wcc-link-edges": 3, "wcc-compress": 1, "wcc-sample": 2`.
4. `test/helpers/override-matrix.ts:56-61`: `U32_OVERRIDE_VALUES` gains `NORM_MODE: [0, 1, 2, 3, 4]` (the builder throws `no value set for the u32 override NORM_MODE` without it). `:68`: `EXPECTED_CASES_BY_PHASE` becomes `Readonly<Record<"P1" | "P2" | "P3" | "P7", number>>` with `P7: 37`, and its JSDoc gains the derivation: `P7 = spmv-pull 17 (defaults + USE_PERM x HAS_WEIGHTS x HAS_PERSONALIZATION x USE_DANGLING) + pr-scale 6 + pr-finalize 6 (defaults + 5 NORM_MODE values each) + wcc-link-sample 5 + wcc-link-edges 1 + wcc-compress 1 + wcc-sample 1`.

Run: `cd $PKG && pnpm exec tsc --noEmit -p tsconfig.json && eval $GPU_NV pnpm exec vitest run --project=node test/kernel`
Expected: PASS. `wgsl-compile.test.ts` compiles 37 more variants; the run is 20-60 s longer on lavapipe. If `bind-group-budget` reports 9 for `spmv-pull`, a uniform decl was counted -- the helper counts `storage` and `storage-ro` only, so a wrong `kind` is the cause.

- [ ] **Step 7: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node`
Expected: green on both adapters. The compile matrix is the long pole; `test/setup/global.ts`'s teardown must report no uncovered pipeline key (it will, because `OVERRIDE_MATRIX` is generated from `KERNELS`).

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): the P7 kernel registry, seven bodies and their budgets` through `tools/commit-changes.sh`. The body lists the seven ids, the four closed unions the commit widens (PD-3), and the binding counts against design 8.10.

---

### Task M8b-T4: The spmvPull primitive, the algorithm scope, and the f64 oracle

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 9 line 1576; design 8.2 lines 2589-2600 (the eight bindings and what each carries); design 11.5 / 11.9 (the twin and the noise-floor row).

**Files:**
- Create: `webgpu-graph-algorithms/src/primitives/core-shape.ts` (`rowCountOf`, `arcCountOf`, `assertNotWindowed`, `coreOfView` -- the shared shape helpers, see Step 1)
- Create: `webgpu-graph-algorithms/src/primitives/spmv.ts` (`prepareSpmvPull`), `webgpu-graph-algorithms/src/algorithms/scope.ts` (the `ReduceScope` over a context plus a `Lease` and a `UniformRing`)
- Create: `webgpu-graph-algorithms/test/oracle/spmv.ts` (the f64 reference), `webgpu-graph-algorithms/test/helpers/spmv.ts` (the run helper), `webgpu-graph-algorithms/test/primitives/spmv.test.ts`
- Modify: `webgpu-graph-algorithms/src/primitives/segmented-reduce.ts:144-174` ONLY -- delete the module-private `rowCountOf` / `assertNotWindowed` and import them from `./core-shape.js` instead, passing `"segmentedReduce"` as the primitive name so every existing error detail is byte-identical. Nothing else in that file moves; PD-1 leaves its snippet machinery alone.
- NOT touched: `src/kernels.ts` (Task M8b-T3 owns it), `src/memory/residency.ts` (Task M8b-T2 owns it)

**Interfaces:**
- Consumes: `ReduceScope` (`src/primitives/reduce.ts:34-44`), `CoreBinding` (`src/memory/residency.ts:46-56`), `ViewBinding` (`src/memory/residency.ts:63-68`), `Binding` (`src/types/memory.ts:18-23`), `kernelSpec` / `graphBindings` / `graphOverrides` / `SPMV_PARAMS` / `PR_PARTIAL` (`src/kernels.ts:437`, `:481-494`, `:504-511`), `planGridStride` (Task M8b-T1), `Lease` (`src/memory/lease.ts:14`), `UniformRing` (`src/kernel/uniform-ring.ts:18`).
- Produces:

```ts
// src/primitives/core-shape.ts
export function rowCountOf(core: CoreBinding, primitive: string): number;
export function arcCountOf(core: CoreBinding): number;
export function assertNotWindowed(core: CoreBinding, primitive: string): void;
export function coreOfView(v: ViewBinding, arcCount: number): CoreBinding;

// src/primitives/spmv.ts
export interface SpmvResources { readonly xNorm: Binding; readonly rankOut: Binding; readonly personalization: Binding | null; readonly partials: Binding; }
export interface SpmvCoefficients { readonly alpha: number; readonly beta: number; readonly uniformP: number; }
export interface SpmvPullOptions {
    readonly personalization: boolean;
    readonly dangling: boolean;
    /** The weights binding to fold with: `undefined` takes the core's, `null` runs UNWEIGHTED on a weighted core. */
    readonly weights?: Binding | null | undefined;
    readonly tiers: DegreeTiers | null;
}
export interface SpmvPullPlanner { record(pass: GPUComputePassEncoder, rev: CoreBinding, resources: SpmvResources, coefficients: SpmvCoefficients): void; readonly lastDispatches: number; }
export async function prepareSpmvPull(scope: ReduceScope, rev: CoreBinding, options: SpmvPullOptions): Promise<SpmvPullPlanner>;

// src/algorithms/scope.ts
export interface AlgorithmScope extends ReduceScope { flush(): void; dispose(): void; }
export function algorithmScope(ctx: GpuContext, label: string, slots: number): AlgorithmScope;
```

**THE SEAM (read before writing a line of this task).** `prepareSpmvPull` and `record()` take a `CoreBinding` -- the type design 6 row 9 (`:1576`) names: `spmvPull(batch, rev: CoreBinding, ...)`. But `ctx.residency.view(s, "reverse")`, which Task M8b-T2 builds and Tasks M8b-T5 / M8b-T6 call, returns a `ViewBinding`, and the two are structurally INCOMPATIBLE exported interfaces of the same file: `CoreBinding` (`src/memory/residency.ts:46-56`) is `{ serial, plan, rowPtr, colIdx, weights, arcToEdge, edgeToArc, windows, hasWeights }` with the arrays as TOP-LEVEL fields, while `ViewBinding` (`:63-68`) is `{ view, bindings: Readonly<Record<string, Binding>>, scalars }`. `graphBindings` / `graphOverrides` read `core.colIdx`, `core.weights`, `core.rowPtr` (`src/kernels.ts:486-492`, `:509-510`), so a `ViewBinding` handed to either is a compile error. `coreOfView` in Step 1 is the ONE adapter; every caller in T5 and T6 goes through it, and nowhere else in the phase is a view coerced to a core.

**PLAN DECISION PD-15 (test placement).** The `node` project's include glob names its directories LITERALLY: `test/*.test.ts` and `test/{device,node,memory,kernel,primitives,algorithms,layouts,oracle,sabotage,types}/**/*.test.ts` (`webgpu-graph-algorithms/vitest.config.ts:196-199`). A new `test/spmv/` directory would be collected by NOTHING and the suite would pass while testing nothing -- a silent failure. Every M8b test file therefore goes in `test/primitives/`, `test/algorithms/`, `test/memory/`, `test/kernel/`, `test/oracle/`, `test/sabotage/`, `test/limits/` or `test/browser/`, and the glob is NOT edited.

- [ ] **Step 1: The shared core-shape helpers and the view adapter**

Create `$PKG/src/primitives/core-shape.ts`. It holds the four functions every core-walking primitive needs and NONE of them exists in an importable form today: `rowCountOf` (`src/primitives/segmented-reduce.ts:148`) and `assertNotWindowed` (`:168`) are module-PRIVATE `function` declarations with no `export`, and `arcCountOf` does not exist anywhere in the package (`grep -rn 'arcCountOf' webgpu-graph-algorithms/src webgpu-graph-algorithms/test` returns nothing). They move here verbatim, gaining one `primitive` parameter so the error details stay exactly what `test/primitives/segmented-reduce.test.ts:345-380` asserts (`details.feature === "segmentedReduce.windowed"`, `details.argument === "core.rowPtr"`, `details.value === 6`).

```ts
/**
 * The shape helpers every core-walking primitive shares (spec 4.1): the row count and the arc count a CoreBinding
 * implies, the windowed rejection of P4, and the ViewBinding -> CoreBinding adapter the P7 pull kernels need.
 * Moved out of segmented-reduce.ts by M8b-T4 so spmv.ts can use them without duplicating them; the `primitive`
 * argument keeps each caller's error details byte-identical to what they were when the helpers were private.
 */

import { WebGpuGraphError } from "../errors.js";
import { type CoreBinding, type ViewBinding } from "../memory/residency.js";
import { type Binding } from "../types/memory.js";

/**
 * The row count of a core from its rowPtr binding (4(n + 1) bytes).
 * @param core - the core
 * @param primitive - the caller's name, used in the message and the detail
 * @returns n
 */
export function rowCountOf(core: CoreBinding, primitive: string): number {
    const bytes = core.rowPtr.size;
    if (bytes < 4 || bytes % 4 !== 0) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${primitive}: a rowPtr binding of ${bytes} bytes is not 4(n + 1)`, {
            argument: "core.rowPtr",
            value: bytes,
            expected: "a positive multiple of 4",
        });
    }
    return bytes / 4 - 1;
}

/**
 * The arc count a core implies: the colIdx binding is 4 bytes per arc, and a null colIdx is an arc-less snapshot.
 * @param core - the core
 * @returns the arc count
 */
export function arcCountOf(core: CoreBinding): number {
    return core.colIdx === null ? 0 : core.colIdx.size / 4;
}

/**
 * Rejects a windowed core (executed at P4).
 * @param core - the core
 * @param primitive - the caller's name, used in the message and the feature detail
 */
export function assertNotWindowed(core: CoreBinding, primitive: string): void {
    if (core.plan === "windowed" || core.windows !== null) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${primitive}: windowed cores are executed at P4`, {
            feature: `${primitive}.windowed`,
        });
    }
}

/**
 * The CoreBinding shape of a residency VIEW (spec 4.3). residency.view() returns a ViewBinding -- a name -> Binding
 * record -- while graphBindings / graphOverrides and every core-walking primitive read rowPtr / colIdx / weights as
 * top-level fields (src/kernels.ts:486-492, :509-510). This is the only adapter between the two in the package.
 * `plan` is "perArray" because views always upload per array (spec 4.3 lines 1182-1186) and `windows` is null
 * because a view is never windowed, which is what makes assertNotWindowed pass for a view. `serial` is -1: a view
 * is not a core and no caller of this function reads serial (grep: nothing in src/primitives or src/algorithms
 * reads CoreBinding.serial).
 * @param v - the view binding, from residency.view(s, "reverse") or view(s, "edgeList")
 * @param arcCount - the arc count of the view, from v.scalars.arcCount[0]
 * @returns the equivalent CoreBinding
 */
export function coreOfView(v: ViewBinding, arcCount: number): CoreBinding {
    const rowPtr: Binding | undefined = v.bindings.rowPtr;
    if (rowPtr === undefined) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `the ${v.view} view has no rowPtr binding`, {
            argument: "view",
            value: v.view,
            expected: "a view with a rowPtr binding (reverse)",
        });
    }
    const colIdx = v.bindings.colIdx ?? null;
    const weights = v.bindings.weights ?? null;
    return Object.freeze({
        serial: -1,
        plan: "perArray" as const,
        rowPtr,
        colIdx,
        weights,
        arcToEdge: null,
        edgeToArc: null,
        windows: null,
        hasWeights: weights !== null,
    });
}
```

Note `arcCount` is a parameter rather than derived: on the UNDIRECTED path `buildReverse` delegates to `core()` and the colIdx binding may be an ARENA segment whose size is the segment's, not the whole array's, so the caller passes `v.scalars.arcCount[0]`, which Task M8b-T2 sets from `rev.arcCount` on both branches.

Then edit `$PKG/src/primitives/segmented-reduce.ts`: delete the two private helpers at `:144-174`, add `import { assertNotWindowed, rowCountOf } from "./core-shape.js";` beside its existing imports, and change its three call sites -- `:205` and `:263` become `assertNotWindowed(core, "segmentedReduce")`, `:217` becomes `rowCountOf(core, "segmentedReduce")`. No other line of that file changes.

Run: `cd $PKG && pnpm exec tsc --noEmit -p tsconfig.json && eval $GPU_NV pnpm exec vitest run --project=node test/primitives/segmented-reduce.test.ts`
Expected: clean, and the whole segmented-reduce suite still green -- in particular `a windowed core -> E_UNSUPPORTED; ...` (`test/primitives/segmented-reduce.test.ts:345`), which asserts `details.feature === "segmentedReduce.windowed"` at `:356` and `details.argument === "core.rowPtr"` at `:374`. If either detail changed, the `primitive` argument was not threaded.

- [ ] **Step 2: The algorithm scope**

Create `$PKG/src/algorithms/scope.ts`. It is the `src/` twin of `test/helpers/segmented-reduce.ts:69`'s `testReduceScope`: `scratch` comes from a `Lease` (one `release()` in the algorithm's `finally`, `src/memory/lease.ts:1-7`) and `params` from a `UniformRing` slot, so a batch of k iterations writes k parameter blocks into one buffer and dispatches with dynamic offsets instead of allocating a uniform buffer per dispatch.

```ts
export function algorithmScope(ctx: GpuContext, label: string, slots: number): AlgorithmScope {
    const lease = ctx.pool.lease();
    const ring = new UniformRing(ctx.device, ctx.allocator, slots, `${label}/ring`);
    return {
        device: ctx.device,
        caps: ctx.caps,
        pipelines: ctx.pipelines,
        pool: ctx.pool,
        workgroupSize: ctx.workgroupSize,
        scratch: (byteLength, scratchLabel) => lease.storage(byteLength, `${label}/${scratchLabel}`),
        params(block, values) {
            const slot = ring.reserve(1);
            ring.write(slot, block, values);
            return { binding: ring.binding(block), offset: ring.offsetOf(slot) };
        },
        flush: () => { ring.flush(); },
        dispose(): void { ring.destroy(); lease.release(); },
    };
}
```

Reason for `slots`: `UniformRing.reserve` is a ring, so the caller sizes it for the largest batch it records (PageRank records five parameter blocks per iteration times k = 8, so 40 plus a margin). A ring too small silently reuses a slot another dispatch of the same batch still reads.

Run: `cd $PKG && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean. If eslint reports an import of `src/context.ts` from `src/algorithms/`, re-read `eslint.config.js:146` -- `context` is NOT in that zone's forbidden list, and `test/layers.test.ts:77` allows it.

- [ ] **Step 3: Write the failing oracle and differential test**

Create `$PKG/test/oracle/spmv.ts`:

```ts
/** The f64 reference of the pull kernel (spec 8.2): y[v] = beta * pv + alpha * (sum_{u in in(v)} w * xNorm[u] + dangling * pv). */
export function spmvPullOracle(
    s: GraphSnapshot,
    xNorm: Float64Array,
    coefficients: { alpha: number; beta: number; uniformP: number; dangling: number },
    personalization?: Float64Array,
): Float64Array {
    const rev = s.reverse();
    const out = new Float64Array(s.nodeCount);
    for (let v = 0; v < s.nodeCount; v++) {
        let acc = 0;
        for (let arc = rev.rowPtr[v]; arc < rev.rowPtr[v + 1]; arc++) {
            acc += (rev.weights === null ? 1 : rev.weights[arc]) * xNorm[rev.colIdx[arc]];
        }
        const pv = personalization === undefined ? coefficients.uniformP : personalization[v];
        out[v] = coefficients.beta * pv + coefficients.alpha * (acc + coefficients.dangling * pv);
    }
    return out;
}
```

Create `$PKG/test/primitives/spmv.test.ts` with the differential shape of `test/primitives/segmented-reduce.test.ts:155-198`, covering: every named fixture of `FIXTURE_NAMES` (`test/helpers/graphs.ts:397-411`) run twice and compared BITWISE, then against `spmvPullOracle` within `relTolerance(s, "sum")`; `n = 0`; a directed weighted snapshot; a weighted snapshot with zero-weight arcs (`fixture("parallel")`); the personalization leg (one-hot and uniform); the dangling leg (`USE_DANGLING` with a non-zero `partials[0].danglingMass`); the row-count ladder `0, 1, 255, 256, 257, 4097, 65537` (the grid-stride cap makes 65537 rows run on 4096 workgroups, which is the case `plan1d` never produces); and the in-process no-subgroups twin through `withContext` (`test/helpers/device.ts:83`) asserting the two results are BITWISE identical, which is G7's "SpMV twin identical in-process". Add the cross-adapter noise row exactly as `test/primitives/segmented-reduce.test.ts:466-510` does, with `writeNoiseFixture("spmv-pull", "random1k", ...)` and `noiseFloorFor("spmv-pull.cross")`.

Two further cases pin the two seams this task introduces, and they are the reason T5 and T6 compile at all:
1. the view adapter round-trips: on the directed weighted snapshot, `const v = ctx.residency.view(s, "reverse"); const rev = coreOfView(v, v.scalars.arcCount[0]);` then `prepareSpmvPull(scope, rev, { personalization: false, dangling: false, weights: undefined, tiers: null })` and one `record()` complete without throwing, and `rev.rowPtr` / `rev.colIdx` / `rev.weights` are the view's three bindings by identity, `rev.plan` is `"perArray"`, `rev.windows` is `null` and `rev.hasWeights` is `true`. Repeat on `fixture("karate")` (undirected), where `rev.weights` is `null` and `hasWeights` is `false`;
2. `weights: null` on a WEIGHTED core runs the unweighted algorithm: on `fixture("parallel")`, the result of `prepareSpmvPull(scope, core, { ..., weights: null })` equals `spmvPullOracle` run with every weight replaced by 1, and DIFFERS from the default (`weights` omitted) run. Without this case the `weight: false` option of T5 and T6 is declared, defaulted and dead.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives/spmv.test.ts`
Expected: FAIL -- `prepareSpmvPull` is not exported yet (`Cannot find module '../../src/primitives/spmv.js'`).

- [ ] **Step 4: Implement `prepareSpmvPull`**

Create `$PKG/src/primitives/spmv.ts` in the shape of `src/primitives/segmented-reduce.ts:253-270`. It imports its three shape helpers from `./core-shape.js` (Step 1) -- `rowCountOf`, `arcCountOf`, `assertNotWindowed` -- and NOT from `segmented-reduce.ts`, where the first and third were private. `prepareSpmvPull` calls `assertNotWindowed(rev, "spmvPull")`, rejects `options.tiers !== null` with `E_UNSUPPORTED { feature: "spmvPull.tiers" }` and the hint `the in-degree tiers land at P4; pass tiers: null` (PD-2, the same shape as `segmented-reduce.ts:258-262` so the two rejections read alike), and compiles ONE pipeline from

```ts
kernelSpec("spmv-pull", {
    ...graphOverrides(rev, null, options.weights),
    HAS_PERSONALIZATION: options.personalization,
    USE_DANGLING: options.dangling,
})
```

The third argument of `graphOverrides` is what makes `weight: false` mean anything: `graphOverrides(core, perm)` with two arguments derives `HAS_WEIGHTS` from `core.weights !== null` alone (`src/kernels.ts:509-510`), so a caller that wants the UNWEIGHTED algorithm on a weighted snapshot must pass `weights: null` and get `HAS_WEIGHTS: false`. Both `graphOverrides` and `graphBindings` already take the argument (`src/kernels.ts:484`, `:507`): `undefined` takes the core's weights, `null` binds the colIdx dummy and sets `HAS_WEIGHTS` false. The planner stores `options.weights` so `record()` binds the same way it compiled -- a mismatch between the two is the one way to get a pipeline whose `HAS_WEIGHTS` disagrees with its bindings.

`record` is synchronous:

```ts
    record(pass, rev, resources, coefficients): void {
        const n = rowCountOf(rev, "spmvPull");
        const plan = planGridStride(n, this.scope.workgroupSize, this.scope.caps);
        if (plan.x === 0) { this.dispatches = 0; return; }
        const params = this.scope.params(SPMV_PARAMS, {
            n, arcBase: 0, arcEnd: arcCountOf(rev), stride: plan.stride ?? n,
            alpha: coefficients.alpha, beta: coefficients.beta, uniformP: coefficients.uniformP, pad0: 0,
        });
        const bound = this.kernel.bind({
            ...graphBindings(rev, null, this.weights),
            xNorm: resources.xNorm,
            rankOut: resources.rankOut,
            personalization: resources.personalization ?? resources.xNorm,
            partials: resources.partials,
            P: params.binding,
        });
        this.kernel.dispatch(pass, bound, plan, [params.offset]);
        this.dispatches = 1;
    }
```

(`this.weights` is the `options.weights` the constructor kept; `assertNotWindowed` runs once in `prepareSpmvPull`, not per record, exactly as `prepareSegmentedReduce` does it at `:263`.)

The `personalization ?? xNorm` dummy follows the group-0 dummy rule of design 3.5 and `graphBindings` (`src/kernels.ts:481-494`): both slots are `storage-ro`, so `Kernel.bind`'s aliasing check does not fire (it only fires when one of the pair is `storage`, `src/kernel/kernel.ts:177-180`), and `HAS_PERSONALIZATION` is false so the slot is never read.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives/spmv.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/primitives/spmv.test.ts`
Expected: PASS on both adapters, the twin leg included. If the twin differs bitwise, the kernel is reading a reduction helper it must not (`spmv-pull` declares `needs: []`); grep the body for `wg_reduce`.

- [ ] **Step 5: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node`
Expected: whole node suite green.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): the spmvPull primitive over pre-scaled xNorm` through `tools/commit-changes.sh`. The body states PD-1 (why it is not a `segmentedReduce` snippet, with the `:40` / `:120-142` evidence), PD-2 (tier 0 only, tiers still `E_UNSUPPORTED`) and the `core-shape.ts` extraction (two private helpers of `segmented-reduce.ts` made shared and a third, `arcCountOf`, written, plus `coreOfView`, the one ViewBinding -> CoreBinding adapter of the phase).

---

### Task M8b-T5: PageRank and personalized PageRank

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 8.2 lines 2572-2606 (the whole algorithm); design 9.7 line 3266 (the parity row); design 10.4 line 3413 (T-8); design 3.3 lines 792-793 (the signatures).

**Files:**
- Create: `webgpu-graph-algorithms/src/algorithms/pagerank.ts`
- Create: `webgpu-graph-algorithms/test/oracle/pagerank.ts`, `webgpu-graph-algorithms/test/algorithms/pagerank.test.ts`
- NOT touched: `src/accelerator.ts` and `src/index.ts` (Task M8b-T8 owns them -- PD-14)

**Interfaces:**
- Consumes: `prepareSpmvPull` / `algorithmScope` (Task M8b-T4), `prepareSegmentedReduce` (`src/primitives/segmented-reduce.ts:253`), `CommandBatch` (`src/kernel/batch.ts:100`), `residency.view(s, "reverse")` (Task M8b-T2), `GpuPageRankResult` / `PageRankOptions` (Task M8b-T1).
- Produces: `export async function pageRank(ctx: GpuContext, s: GraphSnapshot, options?: PageRankOptions & GpuRunOptions): Promise<GpuPageRankResult>` and `export async function personalizedPageRank(ctx: GpuContext, s: GraphSnapshot, personalization: F32, options?: PageRankOptions & GpuRunOptions): Promise<GpuPageRankResult>`, both exactly as design 3.3 lines 792-793 declare them.

**PLAN DECISION PD-7 (the ping-pong is two buffers and two cached bind groups; recorded as DEP-M8B-G).** `Kernel.bind` REJECTS one buffer bound through two slots with different access modes whenever either is `storage`, and it does so even for DISJOINT ranges: `{ argument: "aliasing", reason: "usage" }` at `src/kernel/kernel.ts:181-191`. So `rankIn` and `rankOut` can never be two 256-aligned halves of one buffer. They are TWO buffers, A and B, and the ping-pong is two calls to `kernel.bind()` with the two resource sets; `bind()` caches by `bufferId:offset:size` joined by `|` (`src/kernel/kernel.ts:206-209`), so alternating them costs one Map lookup per iteration and allocates nothing after the first two. Every binding offset is 0 and every scratch buffer comes from the `Lease`, so the 256-byte rule (`src/kernel/kernel.ts:157-166`, `STORAGE_ALIGN`) is satisfied trivially -- with ONE exception to watch: the `partials` binding covers the whole partials buffer from offset 0, and the header lives at element 0 INSIDE it, not at a separate binding, precisely so no sub-256 offset is ever needed.

**PLAN DECISION PD-8 (`outWeightSum` is call scratch).** Design 8.2 lines 2608-2609 say the buffer "is registered against the snapshot in the residency so a second PageRank call on the same snapshot reuses it". `GraphResidency.array(key, label, owner)` keys on a CPU typed-array object (`src/memory/residency.ts:483`, the `residents` WeakMap at `:244`), and a device-computed sum has no such key; registering it would mean new residency API, which is not a P7 deliverable. `outWeightSum` is therefore a `Lease` buffer freed in the `finally`. Cost: one `segmentedReduce` pass, O(A), per call, against O(A) per iteration for the pull -- under 2% of a 60-iteration run. Recorded as DEP-M8B-D.

**PLAN DECISION PD-9 (`firstConvergedIteration` is one iteration late, and is reported as such).** `pr-scale` at iteration i reads `rankIn = x(i-1)` and `rankPrev = x(i-2)`, so the delta it produces is `|x(i-1) - x(i-2)|` -- the error of iteration i - 1, which is exactly cuGraph's pre-scaled form (design 8.2 line 2582). `pr-finalize` therefore records `P.iteration - 1u`, and only from `P.iteration >= 2u` (at iteration 1 `rankPrev` is the zero-filled B buffer and its delta is meaningless). This is what makes design 9.7's "`iterations` within +-1 (the device records `firstConvergedIteration`, 8.2, so the batch size of 8 does not enter the count)" true: the reported count is the CPU's first converged iteration, not the batch boundary. The ping-pong supplies `rankPrev` for free -- at every iteration it is the buffer this iteration will overwrite, and `pr-scale` runs before `spmv-pull` in the same pass, where WebGPU orders dispatches and makes each one's storage writes visible to the next.

- [ ] **Step 1: The f64 oracle**

Create `$PKG/test/oracle/pagerank.ts`: `pageRankOracle(s, { alpha, tolerance, maxIterations, weighted })` implementing NetworkX's semantics in f64 over the snapshot indices -- `x0[v] = 1/n`; per iteration the out-weight sum per node (1 per out-arc when unweighted), `dangling = sum x[u] where outWeightSum[u] <= 0`, `x'[v] = (1-alpha) * pv + alpha * (sum_{u in in(v)} w * x[u] / outWeightSum[u] + dangling * pv)`, `err = sum |x' - x|`, converged when `err < n * tolerance`. It returns `{ scores: Float64Array, iterations, converged, danglingMass }` where `iterations` is the 1-based index of the first converged iteration, and it accepts an optional personalization vector used for `pv`. Also export `pageRankOracleTo(s, opts, k)`, which runs exactly k iterations and returns the iterate, so the parity test can compare "after equal iterations" as design 9.7 requires.

- [ ] **Step 2: Write the failing parity test**

Create `$PKG/test/algorithms/pagerank.test.ts` covering, each as its own `it`:
1. every fixture of `FIXTURE_NAMES` at `gpuScale()`, PINNED to `maxIterations: 8`: `pageRank(ctx, s, { maxIterations: 8 })` matches `pageRankOracleTo(s, opts, 8)` -- the oracle's iterate after exactly 8 iterations -- within `1e-5` RELATIVE per node (design 9.7), with `expectAllClose` and `maxRelError` from `test/helpers/matchers.ts`. The pin is load-bearing and NOT a convenience: `result.iterations` is `header.firstConverged` (Step 3 item 8), the first iteration whose delta fell below the tolerance, NOT the number of iterations the device ran; Step 5 runs batches of k = 8 and Step 6 tests convergence only BETWEEN batches, so an unpinned run returns the iterate after up to 7 iterations MORE than `result.iterations`. Comparing that against `pageRankOracleTo(s, opts, result.iterations)` is not the "after equal iterations" comparison design 9.7 asks for: it passes because the residual is already below tolerance, for a reason unrelated to the kernel being right, and it goes flaky on any fixture that converges slowly. With `maxIterations: 8` the batch boundary and the run length coincide (Step 5's clamp makes the batch exactly 8), so the two sides run the same number of iterations by construction;
2. `converged` identical to the oracle's and `iterations` within +-1 on every fixture;
3. the top-k rank order (k = 10) identical on `karate`, `random1k` and `hub10k`;
4. weighted with zero-weight arcs and dangling nodes: `fixture("parallel")` plus a directed snapshot with a sink; and on `fixture("parallel")` (weighted) `pageRank(ctx, s, { weight: false, maxIterations: 8 })` equals `pageRankOracleTo(s, { ...opts, weighted: false }, 8)` -- the oracle run with every weight replaced by 1 -- and DIFFERS from the default weighted run by more than `1e-5` on at least one node. Without this case the `weight` option is declared, defaulted and dead (see Step 3 item 3);
5. directed AND undirected forms of the same edge set;
6. personalization one-hot (`e_0`) and uniform (`1/n`), the uniform case equal to plain `pageRank` within `1e-6`;
7. `n = 0` returns an empty `Float32Array` with `iterations` 0, `converged` true and no GPU work; `arcCount === 0` returns `1/n` everywhere;
8. two runs BITWISE identical (`expectBitwiseEqual`);
9. `dest` of the wrong length is `E_INVALID_ARGUMENT { argument: "dest" }`, an already-aborted `signal` is `E_ABORTED`, and `onProgress` is called with a monotone `done`;
10. G7's leak clause: with a `LeakCounter` installed (`test/helpers/leak-counter.ts`) around a 100-node run pinned to `maxIterations: 8`, the `mapAsync` count is exactly 1 -- ONE readback for the batch of 8 iterations, no host readback inside it.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/pagerank.test.ts`
Expected: FAIL (`Cannot find module '../../src/algorithms/pagerank.js'`).

- [ ] **Step 3: Implement `pageRank`**

Create `$PKG/src/algorithms/pagerank.ts`. The contract, in order, following `src/algorithms/degree.ts:90-141` for the preamble and `src/layouts/force-simulation.ts:1331-1367` for the batch:

1. `ctx.assertReady()`; resolve options (`dampingFactor` 0.85, `maxIterations` 100, `tolerance` 1e-6, `weight` true); validate `dest` as a `Float32Array` of length n; `E_ABORTED` for an already-aborted signal; `n === 0` returns early with no GPU work.
2. `const core = ctx.residency.core(s)`, re-thrown as `E_TOO_LARGE { algorithm: "pageRank" }` the way `coreOf` does it at `degree.ts:65-79` -- transcribed, not imported: `src/algorithms/degree.ts` exports only `degree` (`:90`), so `coreOf` is module-private there. Then the reverse adjacency THROUGH THE ADAPTER -- `residency.view()` returns a `ViewBinding` and every primitive takes a `CoreBinding` (T4's SEAM note):

```ts
const view = ctx.residency.view(s, "reverse");
const rev = coreOfView(view, view.scalars.arcCount[0]);
```

On an undirected snapshot `view` is the core buffers themselves with no upload (PD-13), so `rev` is a `CoreBinding` over exactly the same three bindings `core` holds.
3. `outWeightSum`: one `prepareSegmentedReduce(scope, weightedCore, { op: "sum", valueSnippet: "v = weight;", tiers: null })` pass over the FORWARD core into a `Lease` buffer. On an unweighted snapshot `HAS_WEIGHTS` is false, `weight` is 1.0 and the sum is the out-degree, which is what the design's normaliser reduces to.

   `weightedCore` is what makes `weight: false` real on BOTH sides of the algorithm. The resolved `weight` option decides one binding, used twice:

   ```ts
   const useWeights = options?.weight !== false;
   const weights: Binding | null | undefined = useWeights ? undefined : null;
   const weightedCore = useWeights ? core : { ...core, weights: null, hasWeights: false };
   const weightedRev = useWeights ? rev : { ...rev, weights: null, hasWeights: false };
   ```

   `weightedCore` goes to `prepareSegmentedReduce` (whose `graphOverrides(core, null)` at `src/primitives/segmented-reduce.ts:266` reads `core.weights` and has no third argument to give it), and `weights` goes to `prepareSpmvPull(scope, weightedRev, { ..., weights })` (T4 Step 4). Pass BOTH or neither: a normaliser that sums weights while the pull folds 1.0 is silently wrong, not a type error.
4. Buffers from the `Lease`: `rankA`, `rankB`, `xNorm` (4n each), `partials` (`PR_PARTIAL.byteLength * (1 + groups)` where `groups = groupsOf(plan1d(n, ctx.workgroupSize, ctx.caps))`). `rankA` is filled with `1/n` by `queue.writeBuffer`; `rankB` is zero-filled; the partials header is written with `firstConverged = U32_MAX`, `iteration = 0`.
5. The loop: batches of `k = min(8, maxIterations - iterationsRun)` iterations -- the batch is CLAMPED to what is left, so a run never exceeds `maxIterations` and `maxIterations: 8` runs exactly one batch of exactly 8 (which is what T5 Step 2 case 1 and T6 Step 2 rely on). Each iteration records, into ONE `CommandBatch` pass: `pr-scale` (`NORM_MODE 0`, `plan1d(n)`), `pr-finalize` (`NORM_MODE 0`, one workgroup, `trackConvergence: 1`, `convergeThreshold: tolerance * n`), `spmv-pull` (`USE_DANGLING: true`, `HAS_PERSONALIZATION` per call). After the k iterations, ONE `batch.readback(partialsBuffer, 0, PR_PARTIAL.byteLength)` for the header, then `batch.submit()` and `await handle.readback`. That is the single `mapAsync` of the batch (G7).
6. Between batches: `ctx.assertReady()`, the abort check, `options.onProgress?.(done, maxIterations)`, and the stop test -- `header.firstConverged !== U32_MAX` or `iterationsRun >= maxIterations`.
7. Readback of the final iterate: the batch ends on an even/odd boundary the loop tracks, so the result buffer is known; `await ctx.readback.read(resultBuffer, 4 * n, dest ?? undefined)`.
8. Return `{ scores, iterations: converged ? header.firstConverged : iterationsRun, converged, danglingMass: header.danglingMass, precision: "f32" }`.
9. `finally`: `scope.dispose()` (one `Lease.release()`, idempotent).

`personalizedPageRank(ctx, s, personalization, options)` validates `personalization.length === n` and that its entries are finite and non-negative (`E_INVALID_ARGUMENT { argument: "personalization" }`), normalises it to sum 1 on the host, uploads it through `ctx.residency.array(personalization, "pagerank/personalization")` and calls the same driver with `HAS_PERSONALIZATION: true` and `uniformP` unused.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/pagerank.test.ts`
Expected: PASS, all ten. If the leak case reports 2 `mapAsync` calls, something reads the partials inside the batch -- the header is read ONCE, after `submit()`.

- [ ] **Step 4: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both; coverage still above 80 / 80 / 75 / 80.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): PageRank and personalized PageRank on the device` through `tools/commit-changes.sh`. The body records PD-7, PD-8 and PD-9 and notes that the accelerator member lands with Task M8b-T8, never as a stub.

---

### Task M8b-T6: HITS, eigenvector centrality and Katz centrality

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 8.2 lines 2603-2605 ("HITS alternates two pulls (forward and reverse) with sum normalisation; eigenvector adds an L2 normalise and converges on `delta < n * eps`; Katz is `alpha * SpMV + beta`"); design 8.8 row 2 line 2790; design 9.7 line 3267.

**Files:**
- Create: `webgpu-graph-algorithms/src/algorithms/power-iteration.ts` (the shared driver), `webgpu-graph-algorithms/src/algorithms/spectral.ts` (`hits`, `eigenvectorCentrality`, `katzCentrality`)
- Create: `webgpu-graph-algorithms/test/oracle/spectral.ts`, `webgpu-graph-algorithms/test/algorithms/spectral.test.ts`
- NOT touched: `src/algorithms/pagerank.ts` (Task M8b-T5 owns it), `src/kernels.ts`

**Interfaces:**
- Consumes: `prepareSpmvPull` / `coreOfView` (Task M8b-T4), `algorithmScope` (Task M8b-T4), `CommandBatch` (`src/kernel/batch.ts:100`), `kernelSpec` / `PR_PARAMS` / `PR_PARTIAL` / `SPMV_PARAMS` (Task M8b-T3), the `NORM_MODE` override of `pr-scale` / `pr-finalize`. NOT `prepareReduce`: see PD-10.
- Produces: `hits(ctx, s, options?): Promise<GpuHitsResult>`, `eigenvectorCentrality(ctx, s, options?): Promise<GpuScoresResult>`, `katzCentrality(ctx, s, options?): Promise<GpuScoresResult>` -- design 3.3 lines 794-796 verbatim.

**PLAN DECISION PD-10 (the normaliser stays on the device, so these three batch like PageRank).** PageRank's divisor is per-node (`outWeightSum[u]`) and is known before the loop. HITS, eigenvector and Katz need a SCALAR divisor computed from the current iterate, which the host cannot supply inside a batch of 8 without a readback -- and a readback inside the batch is exactly what G7 forbids. The sequence per iteration is FOUR dispatches, all on the device, and it uses NO `reduce` call:

    pr-scale(NORM_MODE = 1 | 2)  ->  accumulates abs(x) (L1) or x*x (L2) into partials[1 + g].norm; writes NO xNorm
    pr-finalize(NORM_MODE)       ->  folds partials[1 + g].norm into partials[0].norm (sqrt for L2), folds delta,
                                     records firstConverged
    pr-scale(NORM_MODE = 3)      ->  xNorm[u] = rankIn[u] / partials[0].norm
    spmv-pull                    ->  rankOut

The `reduce` dispatch an earlier draft of this decision put between the first two is BOTH impossible and redundant, and the kernel bodies of Task M8b-T3 Step 3 are why. Impossible: `prepareReduce(...).record(pass, src, count, out, outOffset)` sums a CONTIGUOUS `array<f32>` (`src/primitives/reduce.ts:51`), and `pr-scale` at NORM_MODE 1 / 2 writes its term to `partials[1 + g].norm` -- a field at byte 16 of a 32-byte `PrPartial` record -- not to any contiguous f32 array. Redundant: `pr-finalize` already folds `partials[1 + g].norm` across `g` into `partials[0].norm` and takes the square root for L2, which is exactly the fold `reduce` would have done. Four dispatches, one pipeline pair, no new primitive. `prepareReduce` is therefore NOT among this task's Interfaces.

Katz needs no normaliser and uses ONE `pr-scale` at `NORM_MODE = 4` (the identity) plus `pr-finalize` and `spmv-pull` -- three dispatches -- with `alpha` the attenuation and `beta` its constant term. The REJECTED alternative was normalising on the host with one submit per iteration: it is simpler, but it puts a `mapAsync` in the per-iteration path, which would make these three the only algorithms in the package that cannot be batched, and it would break the leak-counter clause of G7. Step 2 case 8 is what ENFORCES that rejection -- without it, a driver that reads the norm back every iteration passes every other test in this task. The cost of the chosen route is one extra dispatch per iteration and the `norm` field the `PrPartial` record carries beyond design 8.2's 16-byte header -- stated in that field's JSDoc.

- [ ] **Step 1: The oracles**

Create `$PKG/test/oracle/spectral.ts` with `hitsOracle`, `eigenvectorOracle` and `katzOracle` in f64, each implementing the SAME recurrence the GPU runs (`x(i) = A * (x(i-1) / ||x(i-1)||)` for the two normalised ones, `x(i) = alpha * A * x(i-1) + beta` for Katz), returning `{ scores | hubs + authorities, iterations, converged }` with the final vector normalised once at the end (sum for HITS, L2 for eigenvector, L2 for Katz). Add a second, independent check in the test rather than in the oracle: on `karate`, the eigenvector result correlates above 0.999 (Spearman) with the dominant eigenvector obtained by 500 plain f64 power iterations, which pins the recurrence against a reference that shares none of its code.

- [ ] **Step 2: Write the failing tests**

Create `$PKG/test/algorithms/spectral.test.ts`, each numbered item its own `it`:
1. for each of the three, every fixture of `FIXTURE_NAMES` at `gpuScale()` PINNED to `maxIterations: 8`, within `1e-5` relative against the oracle run for exactly 8 iterations -- the same pin, for the same reason, as Task M8b-T5 Step 2 case 1: `iterations` is the device-recorded `firstConverged`, not the run length, so only a pinned run compares equal iterate to equal iterate;
2. `converged` identical and `iterations` within +-1 on an unpinned run;
3. top-10 order identical on `karate` and `random1k`;
4. the directed and undirected forms of one edge set;
5. `n = 0` and `arcCount === 0`;
6. two runs bitwise identical;
7. HITS asserts hubs and authorities are the two pulls of the same graph (hubs of `s` equal authorities of the reverse orientation); Katz asserts that `beta = 0` yields the eigenvector direction;
8. PD-10's leak clause, which is the ONLY thing that enforces the decision: with a `LeakCounter` installed (`test/helpers/leak-counter.ts`) around `eigenvectorCentrality(ctx, s, { maxIterations: 8 })` on a 100-node graph, the `mapAsync` count is EXACTLY 1 -- one header readback for the whole batch of 8. Repeat for `katzCentrality` (also 1). For `hits` the expected count is 2 and the reason is structural, not incidental: `hits` runs the driver TWICE per call (Step 3), once over the reverse adjacency for the authorities and once over the forward core for the hubs, and each driver call ends its batch with one header readback. A count of 8 or 16 means the driver reads the norm back per iteration -- exactly the host-side normalisation PD-10 rejects -- and the case must fail;
9. `weight: false` on `fixture("parallel")` (weighted) equals the oracle run with all weights 1 and differs from the default run by more than `1e-5` on at least one node, for `eigenvectorCentrality` and `katzCentrality` (the two whose option records declare `weight`). Same reason as Task M8b-T5 Step 2 case 4: an unconsumed option silently runs the wrong algorithm.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/spectral.test.ts`
Expected: FAIL (`Cannot find module '../../src/algorithms/spectral.js'`).

- [ ] **Step 3: Implement the shared driver and the three entry points**

`src/algorithms/power-iteration.ts` holds the driver. Its configuration record and its signature:

```ts
/** What one power iteration run needs. `adjacency` is the CoreBinding the pull walks -- the forward core for hubs
 * and eigenvector, coreOfView(view(s, "reverse")) for authorities and Katz (spec 8.2 lines 2603-2606). */
export interface PowerIterationConfig {
    /** 1 = L1 (sum) normalise, 2 = L2 normalise, 4 = identity (Katz: no normaliser). Never 0 or 3 here: 0 is
     *  PageRank's per-node divisor and 3 is the internal scale pass this driver issues itself. */
    readonly normMode: 1 | 2 | 4;
    readonly adjacency: CoreBinding;
    readonly alpha: number;
    readonly beta: number;
    readonly uniformP: number;
    readonly maxIterations: number;
    readonly tolerance: number;
    /** undefined takes the adjacency's weights, null runs UNWEIGHTED on a weighted snapshot (T4 Step 4). */
    readonly weights: Binding | null | undefined;
    readonly label: string;
    readonly signal: AbortSignal | undefined;
    readonly onProgress: ((done: number, total: number) => void) | undefined;
}

/** The iterate, the device-recorded first converged iteration, and the number of iterations actually run. */
export interface PowerIterationRun {
    readonly scores: Float32Array;
    readonly iterations: number;
    readonly converged: boolean;
    readonly iterationsRun: number;
}

export async function runPowerIteration(
    ctx: GpuContext,
    n: number,
    config: PowerIterationConfig,
): Promise<PowerIterationRun>;
```

The buffers it takes from `algorithmScope(ctx, config.label, 4 * 8 + 8)` -- four parameter blocks per iteration times k = 8, plus a margin (T4 Step 2's `slots` rule):

| Buffer | Bytes | Initial contents | Role |
| --- | --- | --- | --- |
| `rankA` | `4n` | `1 / n` everywhere (`queue.writeBuffer`) | the ping-pong pair; `rankIn` on even iterations |
| `rankB` | `4n` | zero | the ping-pong pair; `rankOut` on even iterations. TWO buffers, never two ranges of one -- PD-7 and DEP-M8B-G |
| `xNorm` | `4n` | zero | the pre-scaled vector the pull folds (design 6 row 9: the pull binds no normaliser) |
| `partials` | `PR_PARTIAL.byteLength * (1 + groups)` | header `firstConverged = U32_MAX`, `iteration = 0`; the rest zero | element 0 is the header, `1 + g` is workgroup g's partial |

with `groups = groupsOf(plan1d(n, ctx.workgroupSize, ctx.caps))`. There is NO third `rankPrev` buffer and no copy: PD-9's ping-pong supplies it for free. At iteration i the output buffer still holds x(i-2) -- it was the input two iterations ago -- and `pr-scale` runs before `spmv-pull` in the same pass, so `rankPrev` IS `outBuf`, read before the pull overwrites it. (A copy could not be used anyway: `CommandBatch.copy` is only legal after `endPass()`, `src/kernel/batch.ts:163-169`.)

The three pipelines are prepared ONCE, before the loop, because `pr-scale` needs two `NORM_MODE` variants and compiling inside the loop would compile per iteration:

```ts
const scaleNorm = await ctx.pipelines.kernel(kernelSpec("pr-scale", { NORM_MODE: config.normMode }));
const scaleApply = await ctx.pipelines.kernel(kernelSpec("pr-scale", { NORM_MODE: 3 }));
const finalize = await ctx.pipelines.kernel(kernelSpec("pr-finalize", { NORM_MODE: config.normMode }));
const pull = await prepareSpmvPull(scope, config.adjacency, {
    personalization: false,
    dangling: false,
    weights: config.weights,
    tiers: null,
});
```

(`config.normMode === 4` compiles `scaleNorm` at NORM_MODE 4, the identity, and the driver then SKIPS the `scaleApply` dispatch: at mode 4 `pr-scale` has already written `xNorm[u] = x[u]` and there is no norm to divide by. That is Katz's three-dispatch iteration.)

The batch loop, with `k = Math.min(8, config.maxIterations - iterationsRun)` -- the same clamp as Task M8b-T5 Step 3 item 5, so `maxIterations: 8` is exactly one batch of exactly 8 and Step 2 case 1's pin is exact:

```ts
let iterationsRun = 0;
let header: PrHeader = { danglingMass: 0, delta: 0, firstConverged: U32_MAX, iteration: 0, norm: 0 };
// PrHeader is the local record of the five fields PR_PARTIAL.read returns (UniformBlock.read is
// `read(view: DataView, byteOffset?): UniformValues`, src/kernel/struct-block.ts:361); the cast below is a
// narrowing of UniformValues, not an `as any` -- no eslint-disable, no @ts-expect-error.
while (iterationsRun < config.maxIterations) {
    const k = Math.min(8, config.maxIterations - iterationsRun);
    const batch = new CommandBatch(ctx, `${config.label}/batch`);
    const pass = batch.pass(`${config.label}/iterations`);
    for (let j = 0; j < k; j++) {
        const iteration = iterationsRun + j + 1;
        const even = (iterationsRun + j) % 2 === 0;
        const inBuf = even ? rankA : rankB;
        const outBuf = even ? rankB : rankA;
        // outBuf still holds x(i - 2) until the pull below overwrites it: that is rankPrev (PD-9).
        recordScale(pass, scaleNorm, inBuf, outBuf, iteration);      // NORM_MODE 1 | 2 | 4
        recordFinalize(pass, finalize, iteration);                   // folds norm + delta, records firstConverged
        if (config.normMode !== 4) {
            recordScale(pass, scaleApply, inBuf, outBuf, iteration); // NORM_MODE 3: xNorm[u] = rankIn[u] / norm
        }
        pull.record(pass, config.adjacency, { xNorm, rankOut: outBuf, personalization: null, partials }, {
            alpha: config.alpha, beta: config.beta, uniformP: config.uniformP,
        });
    }
    batch.endPass();
    const request = batch.readback(partials, 0, PR_PARTIAL.byteLength);
    const handle = batch.submit();
    const bytes = await handle.readback;   // the ONE mapAsync of the batch (G7 item 5, Step 2 case 8)
    header = PR_PARTIAL.read(new DataView(bytes), request.offset) as unknown as PrHeader;
    iterationsRun += k;
    ctx.assertReady();
    if (config.signal?.aborted === true) {
        throw new WebGpuGraphError("E_ABORTED", `${config.label}: the signal was aborted between batches`, {});
    }
    config.onProgress?.(iterationsRun, config.maxIterations);
    if (header.firstConverged !== U32_MAX) { break; }
}
return {
    scores: new Float32Array(await ctx.readback.read(iterationsRun % 2 === 0 ? rankA : rankB, 4 * n)),
    iterations: header.firstConverged === U32_MAX ? iterationsRun : header.firstConverged,
    converged: header.firstConverged !== U32_MAX,
    iterationsRun,
};
```

`recordScale(pass, kernel, inBuf, prevBuf, iteration)` binds `{ rankIn: whole(inBuf), rankPrev: whole(prevBuf), outWeightSum: whole(inBuf), xNorm, partials, P }`, where `whole(b)` is the local one-liner `({ buffer: b, offset: 0, size: b.size, window: null })` -- every binding of this driver is a whole pool buffer at offset 0, which is why the 256-byte offset rule (`src/kernel/kernel.ts:157-167`) is satisfied trivially. `outWeightSum` takes `inBuf` as its group-1 dummy: the slot is `storage-ro`, `pr-scale` reads it only under `NORM_MODE == 0u`, and this driver never compiles mode 0. Binding one buffer through two `storage-ro` slots is legal -- `Kernel.bind`'s aliasing check skips a pair unless ONE of them is `storage` (`src/kernel/kernel.ts:177-180`). Do NOT use `xNorm` as that dummy: `xNorm` is the kernel's `storage` slot, so the same buffer in a `storage` and a `storage-ro` slot fires `E_INVALID_ARGUMENT { argument: "aliasing", reason: "usage" }` at `src/kernel/kernel.ts:181-192` even though the ranges are identical.

`recordFinalize(pass, kernel, iteration)` binds `{ partials, P }` with `PR_PARAMS` carrying `n`, `groups`, `iteration`, `trackConvergence: 1`, `convergeThreshold: config.tolerance * n`, and dispatches ONE workgroup.

The final iterate is the buffer the last `spmv-pull` wrote: after `iterationsRun` iterations that is `rankA` when `iterationsRun` is even and `rankB` when it is odd. `finally`: `scope.dispose()` -- one `Lease.release()`, idempotent.

`src/algorithms/pagerank.ts` is NOT refactored onto this driver in this task (it is Task M8b-T5's file, and a shared driver that two tasks edit would break the one-owner rule); the duplication is the batch loop above and is removed by the owner in a later cleanup if wanted -- record that in the commit body rather than silently leaving it.

`src/algorithms/spectral.ts`, each entry point resolving its options, validating `dest` / `signal` / `n === 0` as `degree.ts:90-105` does, and computing `weights` from its `weight` option exactly as Task M8b-T5 Step 3 item 3 does. Each obtains the forward core itself with the `E_TOO_LARGE { path: "windowed" }` re-throw of `degree.ts:65-79` -- `coreOf` there is module-PRIVATE (`src/algorithms/degree.ts` exports only `degree`, `:90`), so `spectral.ts` writes the same six lines with `algorithm: "hits"` / `"eigenvectorCentrality"` / `"katzCentrality"` rather than importing it. The entry points:
- `eigenvectorCentrality(ctx, s, options?)`: ONE `runPowerIteration` over the FORWARD core with `normMode: 2` (L2), `alpha: 1, beta: 0, uniformP: 0`, defaults `maxIterations` 100 and `tolerance` 1e-6. Returns `{ scores, iterations, converged, precision: "f32" }`.
- `katzCentrality(ctx, s, options?)`: ONE run over `coreOfView(ctx.residency.view(s, "reverse"), arcCount)` with `normMode: 4` (identity), `alpha` the attenuation (default 0.1), `beta` the constant (default 1), `uniformP: 1`, then L2-normalises the readback on the host (the oracle does the same, once, at the end).
- `hits(ctx, s, options?)`: TWO runs per CALL, not per iteration -- one over `coreOfView(view(s, "reverse"), arcCount)` giving the authorities and one over the forward core giving the hubs, both with `normMode: 1` (sum) and `alpha: 1, beta: 0, uniformP: 0`. `iterations` and `converged` of the result are the maximum and the conjunction of the two runs. Two runs means two batches means two `mapAsync` calls, which is the 2 Step 2 case 8 expects.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/spectral.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/algorithms/spectral.test.ts`
Expected: PASS on both adapters.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): HITS, eigenvector and Katz on the same pull kernel` through `tools/commit-changes.sh`. The body records PD-10 and names the one duplicated loop between `pagerank.ts` and `power-iteration.ts`.

---

### Task M8b-T7: Afforest weakly connected components

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 8.3 lines 2611-2625 (the algorithm, verbatim); design 9.7 line 3268 (partition equality, IDENTICAL labels after first-seen renumbering); design 10.4 line 3414 (T-9); design 3.3 line 797 (`connectedComponents`, WCC semantics on directed input, `renumber: true` by default).

**Files:**
- Create: `webgpu-graph-algorithms/src/algorithms/components.ts`
- Create: `webgpu-graph-algorithms/test/oracle/components.ts`, `webgpu-graph-algorithms/test/algorithms/components.test.ts`
- NOT touched: `src/errors.ts` (PD-11 leaves `PASSTHROUGH_FORMAT_CODES` alone), `src/primitives/**` (DEP-M8B-C builds no new primitive)

**Interfaces:**
- Consumes: `residency.view(s, "edgeList")` (Task M8b-T2), the four WCC kernels and `WCC_PARAMS` (Task M8b-T3), `kernelSpec("fill", ...)` / `FILL_PARAMS` (`src/kernels.ts:81`), `renumberPartition(labels, out?)` (`graph-format/src/snapshot/derived.ts:1155`, exported at `graph-format/src/index.ts:25`).
- Produces: `export async function connectedComponents(ctx: GpuContext, s: GraphSnapshot, options?: ComponentsOptions & GpuRunOptions): Promise<GpuLabelResult>`.

**PLAN DECISION PD-11 (`E_PARTITION` does not become a pass-through).** `renumberPartition` throws graph-format's `E_PARTITION` when a label is `INVALID_INDEX` (`graph-format/src/snapshot/derived.ts:1166-1169`), and `E_PARTITION` is NOT among `PASSTHROUGH_FORMAT_CODES`, which today is exactly `["E_GPU_INELIGIBLE", "E_UNKNOWN_NODE", "E_UNKNOWN_COLUMN", "E_COLUMN_LENGTH"]` (`src/errors.ts:39-44`). It must NOT be added, for the reason the constant's own JSDoc gives: those are "the graph-format error codes a public call lets propagate unchanged ... raised by accessors the package calls ON THE CALLER'S BEHALF". `renumberPartition` is not an accessor on the caller's behalf; it post-processes an array this package's kernels produced. An `E_PARTITION` escaping it would mean a GPU bug, and a caller who saw `E_PARTITION` would have no action to take. M8b instead guarantees the label array cannot contain `INVALID_INDEX` -- `comp` is initialised by `fill` mode 1 to `comp[v] = v` for `v < n <= INVALID_INDEX - 1`, and `link_pair` and `wcc_compress` only ever store a value already read out of `comp` -- AND verifies it in the same O(n) host pass that builds `groups()`, raising `E_VALIDATION { label: "connectedComponents/labels", message }` if it ever fires. The REJECTED alternative (add the code to the pass-through list) makes the public error surface wider for a condition no caller can cause or fix.

**PLAN DECISION PD-12 (the giant-component mode is a host reduction over 1,024 words).** Design 8.3 asks for "a 1,024-entry histogram readback to find the giant component". A device histogram keyed on a component id needs either 1,024 hash buckets -- which identify a bucket, not a component -- or n bins, which is the label array itself. GAP's `SampleFrequentElement` (gapbs/cc.cc) also counts its sample on the host. `wcc-sample` therefore writes 1,024 sampled labels and the host takes the mode over them, which is 4 KB of readback and a 1,024-entry `Map` once per call. Recorded as DEP-M8B-F.

- [ ] **Step 1: The union-find oracle**

Create `$PKG/test/oracle/components.ts`: `componentsOracle(s)` -- weighted-union-by-size with full path compression over `edgeList()` (every logical edge once, which is what makes the CPU and GPU agree on directed input treated weakly), then first-seen renumbering in index order, returning `{ labels: Uint32Array, count }`. Also export `partitionEquals(a, b)`, which compares two label arrays as PARTITIONS (equal blocks, regardless of names), so a test can distinguish "wrong partition" from "right partition, wrong names".

- [ ] **Step 2: Write the failing test**

Create `$PKG/test/algorithms/components.test.ts` covering G7's WCC clause item by item:
1. every fixture of `FIXTURE_NAMES` at `gpuScale()`: labels IDENTICAL to `componentsOracle(s).labels` (not merely partition-equal -- both renumber first-seen);
2. directed input treated weakly: the directed and undirected forms of one edge set give identical labels;
3. singletons: `fixture("isolated")`, whose 1% isolated nodes each get their own block;
4. a giant component plus dust: a 10k random graph unioned with 500 two-node components;
5. `arcCount === 0`: every node its own block, `count === n`;
6. `n = 0`: empty labels, `count 0`, no GPU work;
7. `self-loop` and `parallel` fixtures;
8. `renumber: false` returns the raw roots and `partitionEquals` still holds against the oracle;
9. `groups()` returns `count` index-aligned `Uint32Array`s whose concatenation is a permutation of `[0, n)`;
10. two runs give identical labels (Afforest's CAS order is nondeterministic, so this asserts the RESULT is deterministic, not the intermediate state);
11. `dest`, `signal` and `onProgress` behave as `degree` does.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/components.test.ts`
Expected: FAIL (`Cannot find module '../../src/algorithms/components.js'`).

- [ ] **Step 3: Implement `connectedComponents`**

Create `$PKG/src/algorithms/components.ts`. The host loop is design 8.3 step for step:

1. Preamble as `degree.ts:90-105` (assertReady, dest validation as a `Uint32Array(n)`, abort, `n === 0`), then `const core = ctx.residency.core(s)` with the `E_TOO_LARGE { path: "windowed" }` re-throw of `degree.ts:65-79` transcribed with `algorithm: "connectedComponents"` (`coreOf` is module-private there: `src/algorithms/degree.ts` exports only `degree`, `:90`), and `const edges = ctx.residency.view(s, "edgeList")` for the each-edge-once round of item 5.
2. `comp` = `lease.storage(4 * (n + 1), "wcc/comp")`. That is the right acquisition and no extra usage argument is needed: `Lease.storage(byteLength, label)` is `pool.acquire(byteLength, STORAGE | COPY_SRC | COPY_DST, label)` (`src/memory/lease.ts:33-35`), and all three bits are required here -- STORAGE for the four kernels, COPY_DST for the `fill` dispatch and the two `queue.writeBuffer` flag resets, COPY_SRC for `batch.readback(comp, 4 * n, 4)` in item 5 and `ctx.readback.read(comp, 4 * n)` in item 6 (`Readback.read` rejects a buffer without COPY_SRC at `src/memory/readback.ts:143`). `fill` mode 1 value 0 over `count = n` writes `comp[v] = v`; `queue.writeBuffer(comp, 4 * n, new Uint32Array([0]))` clears the changed flag (PD-4). `flagIndex = n`, `maxSteps = 1024`. The `hist` buffer of item 4 is `lease.storage(4 * 1024, "wcc/hist")`, which carries COPY_SRC for the same reason.
3. Batch 1: `wcc-link-sample` with `r = 0`, then `r = 1` (design 8.3: "2 sampled link rounds over the r-th neighbour"), then `wcc-compress`. Submitted with no readback.

   `wcc-link-sample` takes the four GRAPH_SLOTS from `graphBindings(core, null)` -- the FORWARD core of item 1 -- never the reverse view. On a directed snapshot that means the sampled rounds see each vertex's OUT-arcs only, which is deliberate and is the same choice GAP makes: the sampled rounds are a heuristic whose only job is to grow the giant component cheaply, and item 5's each-edge-once round over `edgeList()` -- which yields every logical edge once in declared orientation regardless of direction -- is what makes the final partition the WEAK one design 3.3 line 797 specifies. Using the reverse view here would change which edges the two rounds see and nothing else; using `edgeList()` here is impossible, because the sampler needs the r-th neighbour of a ROW, which only the CSR has.
4. Batch 2: `wcc-sample` with `items = min(1024, n)` and `r` the call's seed, plus `batch.readback(hist, 0, 4 * items)`. The host takes the mode -> `giant`.
5. Rounds: batches of FOUR (`wcc-link-edges` with `P.giant` + `wcc-compress`) x 4, then one `batch.readback(comp, 4 * n, 4)` for the changed flag. Stop when the flag reads 0; `queue.writeBuffer` it back to 0 between batches. A round cap of `MAX_WCC_ROUNDS = 64` raises `E_VALIDATION { label: "connectedComponents", message: "the changed flag never settled in 64 rounds" }` -- a hard error, never a CPU fallback.
6. One final `wcc-compress`, then `await ctx.readback.read(comp, 4 * n, raw)`.
7. Host post-pass: verify no label is `INVALID_INDEX` (PD-11); when `options?.renumber !== false`, `renumberPartition(raw, dest ?? undefined)` gives `{ labels, count }`; otherwise count the distinct roots. `groups()` is a lazily built, memoised array of `Uint32Array`s.
8. `finally`: `scope.dispose()`.

Reason for reading the changed flag every four rounds rather than every round: design 8.3 says so, and each readback is a `mapAsync` round trip (T-3 measures it at about 0.1 ms under Dawn) against four O(m) rounds that cost far less at small n -- checking every round would dominate the 6-round typical case.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/algorithms/components.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/algorithms/components.test.ts`
Expected: PASS on both. If case 10 is flaky, a compress dispatch is missing before the readback: the labels are deterministic only after the final compress reaches the fixed point.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): Afforest weakly connected components` through `tools/commit-changes.sh`. The body records PD-11 (why `E_PARTITION` is not a pass-through), PD-12 and DEP-M8B-C (no `dedupe` is built, and why Afforest does not need one).

---

### Task M8b-T8: The accelerator algorithm members and the P7 barrel

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 3.3 lines 784-828 (the public surface); design 9.2 lines 2924-2947 (`AlgorithmAccelerator`, every member optional); design 9.7 (the `*ResultLike` shapes the members must satisfy).

**Files:**
- Modify: `webgpu-graph-algorithms/src/accelerator.ts:87-117` (six new members on the returned literal)
- Modify: `webgpu-graph-algorithms/src/types/accelerator.ts:229-236` (`GpuAccelerator` declares them non-optional)
- Modify: `webgpu-graph-algorithms/src/index.ts:39-41` (the value exports), `:47-69` (the type exports)
- Modify: `webgpu-graph-algorithms/test/index.test.ts:22-88` (the `VALUE_EXPORTS` and `NEVER_EXPORTED` lists), `webgpu-graph-algorithms/test/types/public-api.test-d.ts` (the type list), `webgpu-graph-algorithms/test/accelerator.test.ts` (the member tests)
- NOT touched: every `src/algorithms/*.ts` (their owning tasks), `src/types/algorithms.ts` (Task M8b-T1)

**Interfaces:**
- Consumes: `pageRank` / `personalizedPageRank` (T5), `hits` / `eigenvectorCentrality` / `katzCentrality` (T6), `connectedComponents` (T7).
- Produces: `GpuAccelerator` gains `pageRank`, `personalizedPageRank`, `hits`, `eigenvectorCentrality`, `katzCentrality`, `connectedComponents` and `weaklyConnectedComponents`; the barrel exports the six functions and the four `Gpu*Result` types plus the five option types.

**PLAN DECISION PD-14 (the members land together, after the algorithms, and never as stubs).** `src/accelerator.ts:5-7` states the rule and its failure mode: "the CPU-side dispatchers (`accelerated()`, `createSimulation()`) test `acc.pageRank !== undefined` and route to the CPU when the member is absent ..., so a method the GPU does not implement must not exist here -- never a throwing stub". A stub would make `accelerated()` route to a method that throws instead of to the CPU, turning a missing feature into a broken call at the consumer. The members therefore appear in ONE task, after T5, T6 and T7 are green. `weaklyConnectedComponents` is the same function as `connectedComponents` (design 3.3 line 797: `connectedComponents` has WCC semantics on directed input), declared under both names because `AlgorithmAccelerator` declares both (`src/types/accelerator.ts:188-189`) and a consumer may call either.

**PLAN DECISION PD-16 (the barrel export and the `NEVER_EXPORTED` edit are one commit).** `test/index.test.ts:82-88` lists `pageRank` and `connectedComponents` under a `// P4+ / P5 / P7+` comment as names the barrel NEVER exports, and `:90-92` asserts `Object.keys(api).sort()` equals `VALUE_EXPORTS` exactly. The moment `src/index.ts` exports either name the barrel test fails -- on the export-list equality, and again on the never-exported assertion. Both edits are the same commit; splitting them leaves master red.

**PLAN DECISION PD-19 (M8b may land before M8a).** M8b's members sit on `AlgorithmAccelerator`, which on master is a STRUCTURAL mirror (`src/types/accelerator.ts:177-204`, header at `:40-41`: "the option types named there do not exist before A2, so they are mirrored as empty-extensible records"). Task M8a-T13 of `design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md` replaces that declaration with `import type { AlgorithmAccelerator } from "@graphty/algorithms"` and DELETES `CpuAlgorithmOptions` outright (that plan's PD-7). The swap is source-compatible with everything this task writes, for three reasons, each of which has to hold for the post-M8a spelling and not just for today's mirror:

1. Every member of `AlgorithmAccelerator` is OPTIONAL on both sides, so declaring more of them on `GpuAccelerator` can only narrow.
2. Before M8a the option parameter is `CpuAlgorithmOptions = Readonly<Record<string, unknown>>`, which this file's option records are assignable to. After M8a the parameters are the real CPU types -- `pageRank?(s, options?: IndexedPageRankOptions)`, `hits?` / `eigenvectorCentrality?` / `katzCentrality?` `(s, options?: HitsOptionsLike)` (M8a Task M8a-T8's type block) -- and Task M8b-T1 Step 4 spells this package's own records member for member against those, `weighted` included, so the two shapes stay interchangeable. Method parameters are bivariant in TypeScript, so a member declared with the GPU record still satisfies the interface either way; the member-name match is what keeps a caller's literal from silently losing a field.
3. `AlgorithmAccelerator.connectedComponents?(s: GraphSnapshot): Promise<LabelResultLike>` declares NO options parameter while `GpuAccelerator.connectedComponents` takes `o?: ComponentsOptions`. That is legal: an extra parameter is accepted when it is OPTIONAL, and a required one would not be. Do not make it required.

If M8b lands first, M8a's task is unchanged. If M8a lands first, this task's edit to `src/types/accelerator.ts` is a three-line addition to whatever `GpuAccelerator` then says, and M8a-T13's "NOT touched: `src/accelerator.ts`" note (which assumes P7 has not landed) simply does not apply. Either order works, and the plan does not depend on which happens.

- [ ] **Step 1: Write the failing barrel and accelerator tests**

In `$PKG/test/index.test.ts`, move `"pageRank"` and `"connectedComponents"` from `NEVER_EXPORTED` (`:86-87`) into `VALUE_EXPORTS`, and add `"personalizedPageRank"`, `"hits"`, `"eigenvectorCentrality"`, `"katzCentrality"`. In `$PKG/test/types/public-api.test-d.ts` add the six functions and the types `GpuScoresResult`, `GpuPageRankResult`, `GpuHitsResult`, `GpuLabelResult`, `PageRankOptions`, `HitsOptions`, `EigenvectorOptions`, `KatzOptions`, `ComponentsOptions`. In `$PKG/test/accelerator.test.ts` add: each of the seven members is a function on the object `createAccelerator(ctx)` returns; `acc.pageRank(s)` equals `pageRank(ctx, s)` element by element; `acc.weaklyConnectedComponents` and `acc.connectedComponents` return identical labels; and the structural check that `createAccelerator(ctx)` is assignable to `AlgorithmAccelerator`.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts`
Expected: FAIL -- the export-list equality reports six missing names and `acc.pageRank is not a function`.

- [ ] **Step 2: Export and implement**

In `$PKG/src/index.ts` add, under a new `// ==================== algorithms (P7: the SpMV family and WCC, spec 8.2, 8.3)` banner beside the existing `degree` export:

```ts
export { connectedComponents } from "./algorithms/components.js";
export { pageRank, personalizedPageRank } from "./algorithms/pagerank.js";
export { eigenvectorCentrality, hits, katzCentrality } from "./algorithms/spectral.js";
```

and the type block:

```ts
export type {
    ComponentsOptions,
    EigenvectorOptions,
    GpuHitsResult,
    GpuLabelResult,
    GpuPageRankResult,
    GpuScoresResult,
    HitsOptions,
    KatzOptions,
    PageRankOptions,
} from "./types/algorithms.js";
```

In `$PKG/src/types/accelerator.ts:229-236` add the seven members to `GpuAccelerator` as non-optional, returning the `Gpu*Result` types (which are assignable to the `*ResultLike` mirrors because `precision` is an extra field and `F32` satisfies `NumericVector`; `GpuLabelResult` carries `labels`, `count` and a callable `groups(): U32[]`, which is exactly `LabelResultLike`, and `GpuPageRankResult.danglingMass: number` satisfies `PageRankResultLike.danglingMass?: number | undefined`). `connectedComponents` and `weaklyConnectedComponents` keep their `o?: ComponentsOptions` parameter OPTIONAL -- PD-19 clause 3: the CPU interface declares those two with no options parameter at all, and an extra REQUIRED parameter would make the member stop satisfying it. In `$PKG/src/accelerator.ts` add them to the returned literal, each a one-line delegation with its own JSDoc, e.g.

```ts
        /**
         * PageRank on the device (spec 8.2; contract 3.14). The accelerator's algorithm defaults are not consulted:
         * only `betweenness` has any, and it belongs to P9.
         * @param o - the CPU option record (spec 9.2 PageRankOptions)
         * @returns the f32 scores with `precision: "f32"` (spec 9.7)
         */
        async pageRank(gs: GraphSnapshot, o?: PageRankOptions): Promise<GpuPageRankResult> {
            ctx.assertReady();
            return await pageRank(ctx, gs, o);
        },
```

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts && pnpm run lint`
Expected: PASS; `tsc -p tsconfig.strict-consumer.json` (inside `lint`) also passes, which is what proves the new types survive declaration emit.

- [ ] **Step 3: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd .. && pnpm exec knip) && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: all green; knip now sees `src/types/algorithms.ts`'s exports reached through the barrel, closing the finding Task M8b-T1 Step 5 may have raised.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): the accelerator algorithm members and the P7 barrel` through `tools/commit-changes.sh`. The `test/index.test.ts` edit rides in this commit and must (PD-16): the barrel test fails on master otherwise. The body records PD-14 and PD-19.

---

### Task M8b-T9: The pagerank and wcc benchmarks, and the two baselines

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 10.4 lines 3413-3414 (T-8, T-9); design 11.7 (benchmark inputs); `design/decisions/2026-09-19-bench-compare-min-confirms-median.md` (the two-of-two rule).

**Files:**
- Create: `webgpu-graph-algorithms/benchmarks/pagerank.bench.ts`, `webgpu-graph-algorithms/benchmarks/wcc.bench.ts`
- Modify: `webgpu-graph-algorithms/benchmarks/run.ts:29-33` (the `GROUPS` record)
- Modify: `webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json`, `webgpu-graph-algorithms/benchmarks/results/gpu-linux-t4.json` (one appended session each)
- Modify: `webgpu-graph-algorithms/README.md` (the Performance table's new rows)
- NOT touched: `scripts/bench-compare.js` (its rule is unchanged), `benchmarks/harness.ts`

**Interfaces:**
- Consumes: `bench` / `BenchResult` / `appendSession` / `gpuSessionInfo` (`benchmarks/harness.ts:138`, `:324`, `:296`), `TIERS` / `randomEdges` / `snapshotOf` (`benchmarks/datasets.ts:223`, `:35`, `:235`), `pageRank` / `connectedComponents` (Tasks M8b-T5, M8b-T7).
- Produces: the benchmark groups `pagerank` and `wcc`, and one session per runner class carrying EVERY group.

**PLAN DECISION PD-17 (the baselines must carry `minMs`, and adding a group invalidates the existing last session).** `scripts/bench-compare.js` reads ONLY the last session of `benchmarks/results/<class>.json` and matches rows by `group/name` (`:177-198`). Two consequences the plan must handle, not discover:
1. A row whose baseline lacks `minMs` on either side FALLS BACK to the median alone, silently. `benchmarks/harness.ts:34` has recorded `minMs` since P1, so a session captured by `pnpm run bench` today carries it -- but only if the session is captured with the CURRENT harness, which is why the baselines are re-captured rather than hand-edited.
2. Appending a session that carries only the two new groups would leave `upload`, `roundtrip` and `layout-exact` unmatched in every later comparison, printing "new (no baseline)" for rows that have baselines. `tmp/g3/append-session.mjs` (quoted verbatim in `webgpu-graph-algorithms/docs/decisions/G3.md` appendix A, section "tmp/g3/append-session.mjs") already REFUSES a session that lacks one of its required groups, and its `REQUIRED_GROUPS` list must gain `pagerank` and `wcc` before it is used here. The full five-group run is therefore captured on BOTH classes: the dev box (`nvidia-lovelace-driver580`, the owner's RTX 4070 SUPER) and the GPU lane (`gpu-linux-t4`, the machine.dev T4 that `gpu.yml` sets `GRAPHTY_RUNNER_CLASS=gpu-linux-t4` for).

- [ ] **Step 1: The two benchmark files**

Create `$PKG/benchmarks/pagerank.bench.ts` in the shape of `benchmarks/roundtrip.bench.ts:17-40`: the `10k/100k`, `100k/1M` and `1M/10M` entries of `TIERS`, each a case of the shape

```ts
{
    setup: () => snapshot,                                  // the snapshot object, built ONCE outside the case
    run: (input) => pageRank(ctx, input, { maxIterations: 100, tolerance: 1e-6 }),
    teardown: (input) => { ctx.release(input); },           // drops residency: the NEXT run re-uploads
}
```

with `{ device: ctx.device, items: tier.nodes, unit: "nodes" }`.

The `teardown` is what makes the number T-8, and it is not optional. `bench()` calls `setup()` before EVERY iteration -- the warm-up and each of the `runs` measured ones (`benchmarks/harness.ts:148-159`) -- but `setup` here hands back the SAME snapshot object, and `ctx.residency.core(s)` memoises per snapshot serial. Without a teardown only the discarded warm-up pays the upload and every measured run reads buffers that are already resident, so the recorded median would NOT be what design 10.4 `:3413` defines T-8 to be ("wall end to end including upload") and G7 section 3 would record a number against the wrong definition -- the gate would pass while proving something weaker. `bench()` awaits `teardown(input)` at `:157-159`, after the timer stops, so the release is outside the measurement. Expect the measured medians to be MATERIALLY larger than a resident-core run: the 1M / 10M tier uploads roughly 44 MB of rowPtr + colIdx before the first dispatch.

Names: `pagerank 100 iterations at 10k/100k`, `... at 100k/1M`, `... at 1M/10M`.

Create `$PKG/benchmarks/wcc.bench.ts` the same way -- same `setup` / `run` / `teardown` shape and the same reason -- with `connectedComponents(ctx, input)` at `100k/1M` and `1M/10M`, names `wcc at 100k/1M` and `wcc at 1M/10M`.

In `$PKG/benchmarks/run.ts` add both to `GROUPS` and extend the JSDoc at `:28` to name the targets: "`pagerank` T-8, `wcc` T-9".

Run: `cd $PKG && eval $GPU_NV pnpm run bench -- pagerank wcc --no-save --runs 3`
Expected: a printed table with five rows, each with a median, a min and a max in ms and a rate in nodes/s. The `1M/10M` PageRank row is the T-8 number; note whether it is at or under 1.5 s and whether `100k/1M` is at or under 150 ms.

- [ ] **Step 2: Capture the dev-box baseline (owner)**

Tell the owner: `! cd /home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-spmv-wcc/webgpu-graph-algorithms && LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp pnpm run bench`
Expected output: a table with all FIVE groups (`upload`, `roundtrip`, `layout-exact`, `pagerank`, `wcc`) and a closing line naming `benchmarks/out/nvidia-lovelace-driver580.json`. The card must be quiet: `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv` before the run should show utilisation under 10% and no other process.

Then the agent copies `docs/decisions/G3.md` appendix A's `append-session.mjs` to `tmp/m8b/append-session.mjs`, adds `"pagerank"` and `"wcc"` to its `REQUIRED_GROUPS`, and tells the owner: `! cd $PKG && node tmp/m8b/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json`
Expected output: `appended the session of <date> (nvidia-lovelace-driver580, software=false, <n> results, groups upload,roundtrip,layout-exact,pagerank,wcc) to benchmarks/results/nvidia-lovelace-driver580.json; <k> sessions now`. A `refusing:` line naming a missing group means the run was partial -- re-run `pnpm run bench` with no group arguments.

- [ ] **Step 3: Capture the T4 baseline (owner)**

The `gpu-linux-t4` session cannot be produced on the dev box: `runnerClass` is computed from the adapter (`scripts/runner-class.js`) and `gpu.yml:47-49` sets `GRAPHTY_RUNNER_CLASS=gpu-linux-t4` on the lane. The owner pushes the branch with the `gpu` label on its PR, the lane's `pnpm run bench` step produces the session, and `bench-compare` reports every `pagerank` / `wcc` row as `new (no baseline)` -- which is a PASS (`scripts/bench-compare.js` rule 3). The owner then downloads the `gpu-results-*` artifact of that run and the agent appends its session with the same script into `benchmarks/results/gpu-linux-t4.json`.

Tell the owner: `! gh run download <run id> -n gpu-results-node -D /home/apowers/Projects/graphty-monorepo/tmp/m8b/t4`
Expected output: the artifact's files, including `benchmarks/out/gpu-linux-t4.json`. If the lane's `bench-compare` step FAILED rather than reporting new rows, read its output before appending: a regression in `upload` / `roundtrip` / `layout-exact` is a real finding about this branch, not a baseline problem.

- [ ] **Step 4: Regenerate the README performance rows**

Run: `cd $PKG && node tmp/m8b/readme-table.mjs benchmarks/results/nvidia-lovelace-driver580.json` (the script is `docs/decisions/G3.md` appendix A's `readme-table.mjs`, copied and pointed at the monorepo path)
Expected: the Performance rows printed, now including `pagerank` and `wcc`. Paste them into `README.md` with the citation line the script prints (`citation: benchmarks/results/<class>.json, session <date>`).

- [ ] **Step 5: Commit (owner)** -- two commits through `tools/commit-changes.sh`: `perf(webgpu-graph-algorithms): the pagerank and wcc benchmark groups` for Step 1, then `perf(webgpu-graph-algorithms): re-baseline both runner classes with the P7 groups` for Steps 2-4 (the README rows ride in the second). The second body carries the measured T-8 and T-9 numbers and states whether each target was met, because design 10.4 (`:3397-3402`) forbids relaxing a target silently: "a target that is missed does not close its phase; the owner either re-fixes the target in this table (a recorded decision in the PR) or the phase continues".

---

### Task M8b-T10: The P7 sabotage set, the no-subgroups twin, the browser smoke and the first node-limits test

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.9 item 1 (sabotage); design 11.6 item 4 line 3636 ("one PageRank, one BFS and one CC on karate vs the oracle" -- the BFS third is P8's and is not in scope); design 11.1 (`node-limits`); design 13 rule (f).

**Files:**
- Modify: `webgpu-graph-algorithms/test/helpers/sabotage.ts:37-341` (eighteen mutations, `SABOTAGE_PHASES`, `SABOTAGE_EXEMPT`)
- Modify: `webgpu-graph-algorithms/test/sabotage/coverage.test.ts:27-30` (the exempt-set assertion)
- Create: `webgpu-graph-algorithms/test/sabotage/spmv.test.ts`, `webgpu-graph-algorithms/test/sabotage/wcc.test.ts`
- Create: `webgpu-graph-algorithms/test/browser/algorithms.test.ts`, `webgpu-graph-algorithms/test/limits/pagerank-1m.test.ts`
- Modify: `webgpu-graph-algorithms/test/limits/README.md` (the file list), `.github/workflows/ci.yml:315` (the twin pass)
- NOT touched: `webgpu-graph-algorithms/vitest.config.ts` (PD-15: every file above is already collected)

**PLAN DECISION PD-6 (the sabotage rows land HERE, not with the kernels).** `test/sabotage/coverage.test.ts:91-99` asserts that every mutation's `test` field names a file that EXISTS. The P7 test files are created by Tasks M8b-T4 through M8b-T7, so a sabotage table written in Task M8b-T3 would fail its own coverage test for three commits. `test/helpers/sabotage.ts` is therefore owned by this task, which runs after all of them. `wcc-sample` is added to `SABOTAGE_EXEMPT` for the same reason `fill` is: its output selects WHICH component is called the giant, and Afforest is correct for any choice -- a mutated sampler makes the last rounds slower and changes no label, so no mutation of it can break a tolerance, which is what `minFactor >= 10` demands. That edit also changes the literal assertion at `test/sabotage/coverage.test.ts:28`.

**PLAN DECISION PD-18 (the CI twin pass is extended).** `.github/workflows/ci.yml:315` runs the second, no-subgroups pass over `test/primitives test/layouts` only. `pr-scale` and `pr-finalize` declare `needs: ["subgroups"]` (they call `wg_reduce_vec4`), and their tests live in `test/algorithms/`, so on the shard as it stands the subgroup-free twin of the PageRank path would NEVER run in CI -- a silent hole, because the pass would still be green. The shard command gains `test/algorithms`.

- [ ] **Step 1: The eighteen mutations**

Add to `SABOTAGE` in `$PKG/test/helpers/sabotage.ts` three rows for each of the six non-exempt P7 kernels, with `minFactor: 10` throughout and these `find` / `replace` pairs (each `find` occurs EXACTLY once in its body, which `test/sabotage/coverage.test.ts:71-88` enforces):

| kernel | name | find | replace | test |
| --- | --- | --- | --- | --- |
| `spmv-pull` | `alpha-beta-swapped` | `(P.beta * pv) + (P.alpha * (acc + (dangling * pv)))` | `(P.alpha * pv) + (P.beta * (acc + (dangling * pv)))` | `test/algorithms/pagerank.test.ts` |
| `spmv-pull` | `row-end-off-by-one` | `let a1 = min(rowPtr[v + 1u], P.arcEnd);` | `let a1 = min(rowPtr[v], P.arcEnd);` | `test/primitives/spmv.test.ts` |
| `spmv-pull` | `dangling-dropped` | `(dangling * pv)` | `(0.0 * pv)` | `test/algorithms/pagerank.test.ts` |
| `pr-scale` | `dangling-not-accumulated` | `if (divisor <= 0.0) { dangling = x; xNorm[u] = 0.0; }` | `if (divisor <= 0.0) { dangling = 0.0; xNorm[u] = 0.0; }` | `test/algorithms/pagerank.test.ts` |
| `pr-scale` | `delta-ignores-previous` | `delta = abs(x - prev);` | `delta = abs(x);` | `test/algorithms/pagerank.test.ts` |
| `pr-scale` | `partial-slot-off-by-one` | `let slot = 1u + group_id(wid);` | `let slot = group_id(wid);` | `test/algorithms/pagerank.test.ts` |
| `pr-finalize` | `converged-recorded-at-one` | `P.iteration >= 2u` | `P.iteration >= 0u` | `test/algorithms/pagerank.test.ts` |
| `pr-finalize` | `dangling-takes-the-delta` | `partials[0].danglingMass = folded.x;` | `partials[0].danglingMass = folded.y;` | `test/algorithms/pagerank.test.ts` |
| `pr-finalize` | `l2-sqrt-dropped` | `norm = sqrt(max(0.0, folded.z));` | `norm = max(0.0, folded.z);` | `test/algorithms/spectral.test.ts` |
| `wcc-link-sample` | `degree-guard-inclusive` | `if (a0 + P.r < a1) {` | `if (a0 + P.r <= a1) {` | `test/algorithms/components.test.ts` |
| `wcc-link-sample` | `high-low-swapped` | `let hi = max(p1, p2);` | `let hi = min(p1, p2);` | `test/algorithms/components.test.ts` |
| `wcc-link-sample` | `changed-flag-never-set` | `if (swapped.exchanged) { atomicStore(&comp[P.flagIndex], 1u); break; }` | `if (swapped.exchanged) { break; }` | `test/algorithms/components.test.ts` |
| `wcc-link-edges` | `giant-guard-widened` | `if (atomicLoad(&comp[u]) == P.giant && atomicLoad(&comp[v]) == P.giant) { continue; }` | `if (atomicLoad(&comp[u]) == P.giant \|\| atomicLoad(&comp[v]) == P.giant) { continue; }` | `test/algorithms/components.test.ts` |
| `wcc-link-edges` | `self-edge-skip-widened` | `if (u == v) { continue; }` | `if (u <= v) { continue; }` | `test/algorithms/components.test.ts` |
| `wcc-link-edges` | `low-high-swapped` | `let lo = min(p1, p2);` | `let lo = max(p1, p2);` | `test/algorithms/components.test.ts` |
| `wcc-compress` | `root-not-stored` | `atomicStore(&comp[v], root);` | `atomicStore(&comp[v], v);` | `test/algorithms/components.test.ts` |
| `wcc-compress` | `fixed-point-inverted` | `if (parent == root) { break; }` | `if (parent != root) { break; }` | `test/algorithms/components.test.ts` |
| `wcc-compress` | `starts-at-self` | `var root = atomicLoad(&comp[v]);` | `var root = v;` | `test/algorithms/components.test.ts` |

Then widen `SABOTAGE_PHASES` (`:338`) to `["P1", "P2", "P3", "P7"]`, add `"wcc-sample"` to `SABOTAGE_EXEMPT` (`:341`) with the reason in its JSDoc, and update the literal at `test/sabotage/coverage.test.ts:28` to `["fa2-to-scene", "fill", "wcc-sample"]`.

- [ ] **Step 2: The two check sets and the two sabotage suites**

`worstFactor` is NOT reusable here. Its only definition is `worstFactor(ctx: GpuContext, checks: readonly SrCheck[]): Promise<number>` (`test/helpers/segmented-reduce.ts:303-314`); it runs `runSegmentedReduce` against `segmentedReduceOracle` over the segmented-reduce-specific `SrCheck` (`:263-268`, built by `sabotageChecks()` at `:276-295`) and cannot be pointed at a pull kernel or at WCC. `test/helpers/sabotage.ts` exports `withSabotage` (`:368`) and nothing of the kind. This task therefore WRITES the two equivalents, modelled on `test/helpers/segmented-reduce.ts:258-314` rather than importing from it.

Add to `$PKG/test/helpers/spmv.ts` (the run helper this task's T4 sibling already created):

```ts
/** One check of the spmv sabotage set: a snapshot, the coefficients, and the xNorm vector to fold. */
export interface SpmvCheck {
    readonly name: string;
    readonly snapshot: GraphSnapshot;
    readonly xNorm: Float64Array;
    readonly coefficients: { alpha: number; beta: number; uniformP: number; dangling: number };
}

/**
 * The check set both the primitive test and the sabotage test run, built with weightedRandom from
 * test/helpers/segmented-reduce.ts: a weighted random1k (weights are not 1, so a dropped weight read is a ~50%
 * error), the same graph with a non-zero dangling mass (so USE_DANGLING is exercised), and a 300-row graph whose
 * last 100 rows have no arcs (a skipped empty row keeps the sentinel).
 * @returns the checks
 */
export function spmvChecks(): readonly SpmvCheck[] {
    const random1k = weightedRandom(1000, 5000, 7);            // test/helpers/segmented-reduce.ts:244-256
    const holes = weightedRandom(200, 600, 5, 300);            // 300 rows, the last 100 with no arcs at all
    const uniform = (n: number): Float64Array => Float64Array.from({ length: n }, (_, i) => 1 / (1 + (i % 7)));
    return [
        {
            name: "random1k weighted pull, alpha 0.85",
            snapshot: random1k,
            xNorm: uniform(random1k.nodeCount),
            coefficients: { alpha: 0.85, beta: 0.15, uniformP: 1 / random1k.nodeCount, dangling: 0 },
        },
        {
            name: "random1k weighted pull with a dangling mass",
            snapshot: random1k,
            xNorm: uniform(random1k.nodeCount),
            coefficients: { alpha: 0.85, beta: 0.15, uniformP: 1 / random1k.nodeCount, dangling: 0.25 },
        },
        {
            name: "300 rows / 100 with no in-arcs, alpha 1 beta 0",
            snapshot: holes,
            xNorm: uniform(holes.nodeCount),
            coefficients: { alpha: 1, beta: 0, uniformP: 0, dangling: 0 },
        },
    ];
}

/**
 * The worst error factor over the checks: max relative error against the f64 oracle, divided by the tolerance the
 * package documents for a sum at that arc count. A factor of 1 is "exactly at tolerance"; minFactor 10 therefore
 * means "ten times the tolerance" -- the same meaning it has in segmented-reduce's set.
 * @param ctx - the context (a fresh one per mutation under withSabotage)
 * @param checks - the checks
 * @returns max over checks of maxRelError(actual, expected) / relTolerance(snapshot, "sum")
 */
export async function spmvWorstFactor(ctx: GpuContext, checks: readonly SpmvCheck[]): Promise<number> {
    let worst = 0;
    for (const check of checks) {
        const actual = await runSpmvPull(ctx, check.snapshot, check.xNorm, check.coefficients);
        const expected = spmvPullOracle(check.snapshot, check.xNorm, check.coefficients);
        // maxRelError(actual, expected, absFloor) -- test/helpers/matchers.ts:143; relTolerance(s, "sum") is
        // 2 * dmax * 2^-24 -- test/helpers/segmented-reduce.ts:133-143. The 1e-12 floor is the SR_FACTOR_FLOOR
        // analogue: a tolerance of 0 would make every factor Infinity.
        const err = maxRelError(actual, expected, 1e-6);
        const tolerance = Math.max(relTolerance(check.snapshot, "sum"), 1e-12);
        worst = Math.max(worst, Number.isNaN(err) ? Number.POSITIVE_INFINITY : err / tolerance);
    }
    for (const check of checks) {
        ctx.release(check.snapshot);
    }
    return worst;
}
```

Create `$PKG/test/helpers/components.ts` for the WCC side. A label array is integer: it is either the oracle's partition or it is not, and no relative-error factor is definable over it. The factor is therefore defined explicitly, and the definition is what makes `minFactor: 10` mean something:

```ts
/** The noise floor of a label comparison: a partition is exact, so anything above zero is signal. 1e-3 makes
 *  minFactor 10 mean "at least 1% of the nodes are mislabelled" on the 1,000-node checks below. */
export const WCC_NOISE_FLOOR = 1e-3;

/** One check of the WCC sabotage set. */
export interface WccCheck {
    readonly name: string;
    readonly snapshot: GraphSnapshot;
}

/**
 * The check set: a 1,000-node random graph with ~40 components, a giant component plus 200 two-node components
 * (the case the `P.giant` guard and the sampler touch), and a directed graph whose weak components differ from its
 * strong ones (the case an each-edge-once round is needed for).
 * @returns the checks
 */
export function wccChecks(): readonly WccCheck[] {
    // ~40 components: 1,000 nodes over 25 disjoint random blocks of 40.
    const blocks: EdgeSpec[] = [];
    for (let b = 0; b < 25; b++) {
        for (const [u, v] of randomEdges(40, 120, 11 + b)) {
            blocks.push([u + 40 * b, v + 40 * b]);
        }
    }
    // a giant component of 600 plus 200 two-node components.
    const dust: EdgeSpec[] = [...randomEdges(600, 3000, 3)];
    for (let i = 0; i < 200; i++) {
        dust.push([600 + 2 * i, 601 + 2 * i]);
    }
    // directed: the weak components are ONE, the strong ones are 1,000 (a directed path).
    const path: EdgeSpec[] = Array.from({ length: 999 }, (_, i): EdgeSpec => [i, i + 1]);
    return [
        { name: "1000 nodes / 25 blocks", snapshot: snapshotOf(blocks, { nodeCount: 1000, label: "wcc-blocks" }) },
        { name: "giant 600 + 200 pairs", snapshot: snapshotOf(dust, { nodeCount: 1000, label: "wcc-dust" }) },
        {
            name: "directed path, weakly one component",
            snapshot: snapshotOf(path, { directed: true, nodeCount: 1000, label: "wcc-path" }),
        },
    ];
}

/**
 * The worst error factor over the checks: the share of nodes whose label differs from the oracle's AFTER both
 * label arrays are normalised to first-seen order (so a correct partition under different names scores 0),
 * divided by WCC_NOISE_FLOOR.
 * @param ctx - the context (a fresh one per mutation under withSabotage)
 * @param checks - the checks
 * @returns max over checks of mismatchFraction / WCC_NOISE_FLOOR
 */
export async function wccWorstFactor(ctx: GpuContext, checks: readonly WccCheck[]): Promise<number> {
    let worst = 0;
    for (const check of checks) {
        const actual = await connectedComponents(ctx, check.snapshot);
        const expected = componentsOracle(check.snapshot);
        let mismatched = 0;
        for (let v = 0; v < check.snapshot.nodeCount; v++) {
            if (actual.labels[v] !== expected.labels[v]) {
                mismatched++;
            }
        }
        worst = Math.max(worst, mismatched / check.snapshot.nodeCount / WCC_NOISE_FLOOR);
    }
    for (const check of checks) {
        ctx.release(check.snapshot);
    }
    return worst;
}
```

Both `connectedComponents` (default `renumber: true`) and `componentsOracle` (Task M8b-T7 Step 1) renumber first-seen, so the comparison above is already name-invariant; a mutation that produces the RIGHT partition with different names scores 0 and its row must be replaced, not weakened.

Then create `$PKG/test/sabotage/spmv.test.ts` and `$PKG/test/sabotage/wcc.test.ts` in the shape of `test/sabotage/segmented-reduce.test.ts`: for every mutation of the kernel, `withSabotage(id, mutation, async (ctx) => spmvWorstFactor(ctx, spmvChecks()))` (respectively `wccWorstFactor(ctx, wccChecks())`) runs on a FRESH context -- `withSabotage` acquires one, `test/helpers/sabotage.ts:368-384` -- and the test asserts the returned factor is `>= mutation.minFactor`.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/sabotage`
Expected: PASS -- every mutation breaks its check by at least 10x (for WCC: mislabels at least 1% of the nodes), and `coverage.test.ts` accepts the table. A mutation that does NOT break its check is a finding about the TEST, not the mutation: strengthen the check set or replace the row, and say which in the commit body.

- [ ] **Step 3: The browser smoke (design 11.6 item 4)**

Create `$PKG/test/browser/algorithms.test.ts`: on `karate`, `pageRank(ctx, s)` within `1e-5` of `pageRankOracleTo` and `connectedComponents(ctx, s)` identical to `componentsOracle(s).labels`. Two `it`s, no fixtures beyond karate -- item 4's third case (BFS) is P8's and is deliberately absent.

Run: `cd $PKG && GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js`
Expected: every test passes (a `browser.close()` timeout with every test passed counts as green, design 13 rule (a) and 11.6).

- [ ] **Step 4: The first node-limits test**

Create `$PKG/test/limits/pagerank-1m.test.ts`: a 1M-node / 10M-arc `snapshotOf(randomEdges(...))`, `pageRank(ctx, s, { maxIterations: 100 })` completes, returns 1M finite scores summing to 1 within `1e-3`, and `converged` is a boolean. This is the first test the `node-limits` project has ever had (`ls test/limits/` was `README.md` alone), and the GPU workflow already runs `--project=node-limits` (`.github/workflows/gpu.yml:69-71`), so it starts executing on the T4 with no workflow change. Add the file to the planned-files list in `test/limits/README.md` and change that list's "No test file exists before P4" sentence to name this one as the first, landed at G7.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node-limits`
Expected: one file, one or two tests, green within the project's 600 s test timeout. On lavapipe this test is expected to be slow or to exhaust memory -- that is why it is in `node-limits`, which the default lane never selects (`vitest.config.ts:205-217`).

- [ ] **Step 5: Extend the CI twin pass**

In `.github/workflows/ci.yml:315` change the `webgpu-graph-algorithms-node` shard's `test-command` from

```yaml
      test-command: cd webgpu-graph-algorithms && pnpm exec vitest run --project=node --coverage && GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/layouts --passWithNoTests
```

to

```yaml
      test-command: cd webgpu-graph-algorithms && pnpm exec vitest run --project=node --coverage && GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/layouts test/algorithms --passWithNoTests
```

and extend the comment above it to say why: `pr-scale` and `pr-finalize` declare `needs: ["subgroups"]` and their tests live in `test/algorithms`, so without the third path the twin never exercises the PageRank reduction on a device without the feature.

Run: `cd $PKG && GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/layouts test/algorithms`
Expected: green. If a PageRank case differs from the subgroup run beyond `1e-5`, the two reduction helper variants disagree -- that is a real finding about `REDUCE_HELPERS_SUBGROUP_WGSL`, not about this plan.

- [ ] **Step 6: Commit (owner)** -- two commits through `tools/commit-changes.sh`: `test(webgpu-graph-algorithms): the P7 sabotage set, browser smoke and first node-limits test` for Steps 1-4, then `ci: run the no-subgroups twin over the algorithms tests too` for Step 5. That subject has TYPE `ci` and NO scope: `tools/commit-changes.sh` extracts a scope with `sed -n 's/^[a-z]*(\([^)]*\)).*/\1/p'` (`:513`), which yields nothing here, so the enum check at `:514-518` is skipped entirely and the commit is accepted. Do not add `(ci)` -- `ci` is in `commitlint.config.js`'s scope-enum as well, so `ci(ci):` would also pass, and it would be nonsense.

---

### Task M8b-T11: The decision records and the design index

**Repository:** `$WT` (exported by the phase's Step 0).

**Spec:** `design/decisions/README.md` (one decision per file, `YYYY-MM-DD-<slug>.md`, never edited after it lands, carries the argument that was REJECTED, plus a row in the index table).

**Files:**
- Create: `design/decisions/2026-09-19-spmv-pull-is-its-own-kernel.md`, `design/decisions/2026-09-19-spmv-tier-zero-only.md`, `design/decisions/2026-09-19-afforest-needs-no-dedupe.md`, `design/decisions/2026-09-19-outweightsum-is-call-scratch.md`, `design/decisions/2026-09-19-pagerank-ping-pong-is-two-buffers.md` (FIVE records: DEP-M8B-A, -B, -C, -D and -G)
- Modify: `design/decisions/README.md` (five index rows), `design/README.md:14,21` (the two file counts), `design/webgpu/README.md` (a row for this plan)
- NOT touched: `design/webgpu/webgpu-acceleration-plan.md` -- the Review-log practice was RETIRED on 2026-09-19 (`design/decisions/README.md`: "two branches append at once ... every merge needed a hand-resolved concatenation. One file per decision has no shared end to collide over")

- [ ] **Step 1: Write the five records**

Each of the five follows the skeleton both existing records use: an H1 stating the decision as a sentence with no trailing period; `Date: 2026-09-19`; `Decided by: the owner`; `Changes:` naming the design section it supersedes and saying that section is NOT edited; `## The decision` (3-8 concrete sentences ending with what does NOT move); `## Why`; `## What we are giving up, and why it is acceptable` (which QUOTES the superseded text verbatim and concedes what it gets right); `## What would reverse this` (testable conditions, counted). The five arguments to record as REJECTED are the ones named in DEP-M8B-A, -B, -C, -D and -G: widening `VALUE_SNIPPET_VOCABULARY`; implementing the P4 tiers inside P7; building `compact` / `dedupe` for a WCC that does not use them; adding a residency API for a device-computed array; and, for the ping-pong record, binding two disjoint 256-aligned ranges of ONE buffer as `rankIn` / `rankOut` (which `Kernel.bind` rejects on access mode before it looks at the ranges, `src/kernel/kernel.ts:177-192`).

- [ ] **Step 2: Index them**

Add five rows to `design/decisions/README.md`'s table, the `Decision` cell being each record's H1 verbatim. Change `design/README.md:14`'s decisions count from `2` to `7` (two records exist today -- `ls design/decisions/` is `2026-09-19-bench-compare-min-confirms-median.md`, `2026-09-19-no-nightly-gpu-lane.md`, `README.md` -- plus the five this task writes) and `:21`'s webgpu count from `8` to `9`. Add a row to `design/webgpu/README.md`'s table for `plans/2026-09-19-webgpu-m8b-gpu-spmv.md` with the "What it is" cell "Phase M8b: the GPU SpMV family, PageRank and its relatives, and Afforest WCC (design P7), gate G7" and Status `live plan`.

Run: `cd $WT && ls design/decisions/*.md | wc -l && LC_ALL=C grep -rnP '[^\x00-\x7F]' design/decisions/ design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md | wc -l`
Expected: `8` (the README plus seven records: the two that exist today and the five this task writes) and `0` non-ASCII bytes.

- [ ] **Step 3: Commit (owner)** -- `docs: record the M8b design decisions beside the WebGPU design` through `tools/commit-changes.sh`. TYPE `docs`, no scope (the same scope-less form as Task M8b-T10's `ci:` commit; `tools/commit-changes.sh:513` extracts nothing and skips the enum check).

---

### Task M8b-T12: The G7 gate record and the phase close

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 13 row P7 line 4214 (the G7 checklist, quoted in full below); design 13 rule (a) (green on the default lane AND the GPU lane).

**Files:**
- Create: `webgpu-graph-algorithms/docs/decisions/G7.md`
- Modify: `webgpu-graph-algorithms/CLAUDE.md` (the kernel list and the "what exists" section gain the seven P7 kernels and the six algorithms)
- NOT touched: `docs/decisions/G0.md` .. `G3.md` (closed records)

- [ ] **Step 1: Run the full green check on both adapters and the browser**

Run:

```bash
cd $PKG
pnpm run build:all && pnpm run lint                                   # eslint + 2 tsc runs
(cd .. && pnpm exec knip)                                             # no finding under the package
eval $GPU_NV pnpm exec vitest run --project=node                      # the hardware lane
eval $GPU_LLVM pnpm exec vitest run --project=node --coverage         # the default lane, thresholds ON
GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/layouts test/algorithms
eval $GPU_NV pnpm exec vitest run --project=node-limits               # the T-8 fixture
GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs | wc -l    # 0
```

Expected: as commented; coverage at or above 80 / 80 / 75 / 80 and the non-ASCII count 0. If coverage dropped below a threshold, the missing lines are in the new algorithm error branches -- add the cases rather than lowering the threshold (Global Constraints).

- [ ] **Step 2: Write the G7 record**

Create `$PKG/docs/decisions/G7.md` with this content; every `<...>` cell is a number or a string copied from the named command's output, and the owner signs the last section:

````markdown
# G7 -- the SpMV family and WCC gate (spec 13 row P7)

Recorded by: <owner name>, 2026-09-DD. Commits: the fifteen of the M8b PR (<short hashes once committed>).
Environment: Node <version>, pnpm 10, vitest 3.2.7, webgpu 0.4.0, <OS>, driver <version>, Playwright chromium-<build>.
Every command ran from `webgpu-graph-algorithms/`.

## 1. Adapters exercised

| Adapter | Runtime | adapter class | runner class | subgroups | how it was run |
| --- | --- | --- | --- | --- | --- |

## 2. The G7 checklist (spec 13 row P7), each item mapped to its evidence

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | 9.7 parity on all fixtures: <= 1e-5 relative, top-k, `iterations` +-1, `converged` identical | `test/algorithms/pagerank.test.ts`, `spectral.test.ts` | <max rel error> | pass / fail |
| 2 | weighted with zero-weight arcs and dangling nodes; directed and undirected | the `parallel` and directed cases of the same files | <numbers> | pass / fail |
| 3 | personalization one-hot and uniform | `pagerank.test.ts` cases 6 | <numbers> | pass / fail |
| 4 | the pull kernel binds exactly the 8 of 8.2; every 8.10 kernel matches its count | `test/kernel/bind-group-budget.test.ts` | 8 / 5 / 1 / 3 / 1 / 2 | pass / fail |
| 5 | no host readback inside a batch of 8 iterations (`mapAsync` count) | `pagerank.test.ts` case 10 and `spectral.test.ts` case 8, `test/helpers/leak-counter.ts` | pageRank <count>, eigenvector <count>, katz <count>, hits <count> | pass / fail |
| 6 | SpMV twin identical in-process | `test/primitives/spmv.test.ts` twin case | bitwise | pass / fail |
| 7 | WCC partition equality after renumbering, incl. directed treated weakly, singletons, giant + dust, `arcCount === 0` | `test/algorithms/components.test.ts` | <cases> | pass / fail |
| 8 | browser smoke (4) green | `test/browser/algorithms.test.ts` on SwiftShader and NVIDIA | <runs> | pass / fail |
| 9 | sabotage: every P7 kernel's mutations break their check by >= 10x | `test/sabotage/spmv.test.ts`, `wcc.test.ts` | <worst factors> | pass / fail |

## 3. T-8 / T-9 (spec 10.4; `benchmarks/results/<class>.json`, session <date>)

| Id | Benchmark (group / name) | Target | Measured median of 5 (ms) | min / max (ms) | Rate | Pass |
| --- | --- | --- | --- | --- | --- | --- |
| T-8 | pagerank / 100 iterations at 100k/1M | <= 150 ms | <median> | <min> / <max> | <rate> | yes / no |
| T-8 | pagerank / 100 iterations at 1M/10M | <= 1.5 s | <median> | <min> / <max> | <rate> | yes / no |
| T-9 | wcc / at 1M/10M | <= 100 ms | <median> | <min> / <max> | <rate> | yes / no |

## 4. Cross-adapter results (spec 11.5, 11.9; `benchmarks/results/noise-floor.json`)

| Row id | kernel / fixture | comparison | a | b | maxRelError | maxAbsError | samples |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 5. Coverage (spec 11.8; the default-lane run of Step 1)

| lines | functions | branches | statements | threshold | wall time |
| --- | --- | --- | --- | --- | --- |

## 6. Baselines committed

## 7. Findings, owner decisions, re-fixed targets

Signed off: <owner>, 2026-09-DD.
````

A missed T-8 or T-9 row does NOT close the gate by itself: design 10.4 (`:3397-3402`) requires the owner either to re-fix the target in a recorded decision in the PR or to let the phase continue; section 7 of the record is where that decision is written, and the "Pass" column says `no` honestly either way.

- [ ] **Step 3: Update the package CLAUDE.md**

Add the seven P7 kernel ids and the six algorithm entry points to the package's own inventory sections, and note that `src/algorithms/` is no longer a single file.

- [ ] **Step 4: Commit (owner)** -- `docs(webgpu-graph-algorithms): close the G7 gate record` through `tools/commit-changes.sh`. Then the PR: it carries the `gpu` label so `gpu.yml` runs on it (`.github/workflows/gpu.yml` triggers on a labelled same-repo PR), and `release.yml`'s gate job requires that lane green before any publish, so a red T4 run blocks the release of every package, not just this one.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Phase step 0 | `git fetch origin && git merge --ff-only origin/master && git worktree add .worktrees/webgpu-spmv-wcc -b feat/webgpu-spmv-wcc master` |
| M8b-T1 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/webgpu-spmv-wcc && ./tools/commit-changes.sh --dry-run` then the two commits of Step 6 (`fix(tools)` FIRST) |
| M8b-T2 .. M8b-T8 | one `tools/commit-changes.sh` run per task, with the subject the task's Commit step names |
| M8b-T9 step 2 | `... && LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp pnpm run bench` then `node tmp/m8b/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json` |
| M8b-T9 step 3 | push the branch, open the PR, `gh pr edit <n> --add-label gpu`, then `gh run download <run id> -n gpu-results-node -D .../tmp/m8b/t4` and the same append script into `benchmarks/results/gpu-linux-t4.json` |
| M8b-T10 | the two commits of Step 6 (the second is type `ci` with NO scope) |
| M8b-T11 | `tools/commit-changes.sh` with a type `docs` subject and NO scope |
| M8b-T12 | fill and sign `webgpu-graph-algorithms/docs/decisions/G7.md`, then the final commit and the PR merge once `ci.yml`, `hosts.yml` and `gpu.yml` are green |

The agent never runs any of these; it prepares the tree and verifies the results. In particular the agent never runs `git worktree`, `git stash`, `git checkout` or `git reset`: in a subagent they block on a prompt nobody answers.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| The commit script accepts the scope | M8b-T1 | `grep -c 'webgpu-graph-algorithms' tools/commit-changes.sh` | the fifteen commits of this plan can be made at all |
| Grid-stride planning | M8b-T1 | `pnpm exec vitest run --project=node test/kernel/dispatch.test.ts` | the cap, the stride and the zero case are the design's |
| Reverse residency is free when undirected | M8b-T2 | `pnpm exec vitest run --project=node test/memory/residency.test.ts` | `stats().buffers` is unchanged and the buffers are the core's |
| The eight bindings of the pull kernel | M8b-T3 | `pnpm exec vitest run --project=node test/kernel/bind-group-budget.test.ts` | every 8.10 count matches (G7 item 4) |
| The compile matrix is bounded and covered | M8b-T3 | `pnpm exec vitest run --project=node test/kernel/wgsl-compile.test.ts` | 37 P7 cases, no uncovered pipeline key at teardown |
| SpMV against the f64 oracle, and the twin | M8b-T4 | `pnpm exec vitest run --project=node test/primitives/spmv.test.ts` | <= `relTolerance` and bitwise-identical twin (G7 item 6) |
| PageRank parity and the batch's single mapAsync | M8b-T5 | `pnpm exec vitest run --project=node test/algorithms/pagerank.test.ts` | 1e-5 relative, `iterations` +-1, `mapAsync` count 1 (G7 items 1, 5) |
| HITS / eigenvector / Katz parity | M8b-T6 | `pnpm exec vitest run --project=node test/algorithms/spectral.test.ts` | 1e-5 relative and identical top-k |
| The spectral batch's mapAsync count (PD-10) | M8b-T6 | `pnpm exec vitest run --project=node test/algorithms/spectral.test.ts` | `eigenvectorCentrality` and `katzCentrality` 1, `hits` 2 over a batch of 8 -- the normaliser stayed on the device |
| WCC partition equality | M8b-T7 | `pnpm exec vitest run --project=node test/algorithms/components.test.ts` | labels identical to the union-find oracle (G7 item 7) |
| The barrel and the accelerator | M8b-T8 | `pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts` | six new value exports, seven accelerator members, no stub |
| Sabotage | M8b-T10 | `pnpm exec vitest run --project=node test/sabotage` | every P7 mutation breaks its check by >= 10x (G7 item 9) |
| The no-subgroups twin | M8b-T10 | `GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/primitives test/layouts test/algorithms` | the reduction helpers agree without the feature |
| Browser smoke | M8b-T10 | `GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js` | design 11.6 item 4 green (G7 item 8) |
| node-limits | M8b-T10 | `pnpm exec vitest run --project=node-limits` | the lane the GPU workflow has always run finally has a test |
| T-8 and T-9 | M8b-T9 | `pnpm run bench` then `node scripts/bench-compare.js` | both baselines carry `minMs`; the numbers are recorded in G7.md section 3 |
| Coverage | M8b-T12 | `pnpm exec vitest run --project=node --coverage` on lavapipe | at or above 80 / 80 / 75 / 80, never lowered |
| Plain ASCII | M8b-T12 | `LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs \| wc -l` | 0 |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M8B-1 | The tier-0 pull kernel misses T-8 on a graph with a 10k in-degree hub, because one thread walks that row. | The `hub10k` fixture is in the parity set from Task M8b-T4, so the correctness is proven at the hub; the timing is a recorded number, and design 10.4 (`:3397-3402`) fixes what happens to a missed target -- a recorded owner decision in the PR, never a silently loosened target. The tiers are P4's deliverable (DEP-M8B-B) and land on this kernel with a `TIER` override and two dispatch ranges. |
| R-M8B-2 | `atomicCompareExchangeWeak` behaves differently on lavapipe, SwiftShader, Dawn-on-NVIDIA and WARP, and the package has no prior art to compare against. | Task M8b-T7's parity cases run on the default lane and the hardware lane; `hosts.yml` adds Metal + WebKit and D3D12 WARP + Chromium on any push touching `webgpu-graph-algorithms/`, and `release.yml` requires it green. The bounded retry loop (PD-5) makes a spurious failure cost an iteration, never a wrong answer, and the changed flag forces another round when a bound is hit. |
| R-M8B-3 | The 1M / 10M node-limits test or the new benchmark groups push the `webgpu-graph-algorithms-node` CI shard past ten minutes. | The limits test runs only in the `node-limits` project, which `ci.yml` never selects; the benchmarks run only on the GPU lane. If the default shard still slows, design 12.6's remedy is `--shard=1/2` into two matrix entries. |
| R-M8B-4 | A benchmark session appended with only the two new groups makes every pre-existing row report "new (no baseline)" for ever after. | Task M8b-T9's append script refuses a session missing any required group, and `REQUIRED_GROUPS` gains `pagerank` and `wcc` before it is used (PD-17). `scripts/bench-compare.js` reads only the last session (`:177-198`), so the refusal is the only thing standing between a partial run and a silently disabled comparison. |
| R-M8B-5 | The seven new kernels add 37 compile cases, and SwiftShader's JIT makes `test/browser/compile-matrix.test.ts` exceed the "light browser testing" budget of design 11.6. | The matrix is a bounded product by construction (`test/helpers/override-matrix.ts:1-22`), and `EXPECTED_CASES_BY_PHASE.P7 = 37` pins it. If the browser matrix does slow past the budget, the remedy G2 already recorded applies: the browser case list is a subset, chosen in that test, not in the generator. |
| R-M8B-6 | M8a lands first and rewrites `src/types/accelerator.ts`, colliding with Task M8b-T8's edit to `GpuAccelerator`. | PD-19: the two edits touch different declarations of one file (`AlgorithmAccelerator` for M8a at `:177-204`, `GpuAccelerator` for M8b at `:229-236`) and the mirror's members are all optional, so whichever lands second is a small manual merge, not a redesign. The plan states the outcome for both orders. |
| R-M8B-7 | The WCC round loop never settles on a pathological input and the call hangs. | Two bounds: the in-kernel `P.maxSteps` on every atomic loop (PD-5) and the host's `MAX_WCC_ROUNDS = 64`, which raises `E_VALIDATION` rather than looping. Neither is a CPU fallback, which the project rule forbids. |
| R-M8B-8 | The `pr-scale` / `pr-finalize` subgroup twin diverges and no lane notices, because the CI twin pass covered only `test/primitives test/layouts`. | PD-18 extends the shard command to `test/algorithms` in the SAME PR that adds the kernels, and Task M8b-T10 Step 5 runs the twin locally first. |

---

## 8. Writing-plans self-review

### 8.1 Spec coverage -- every deliverable of the integration plan's M8b row has a task

The row is `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3270`. Item by item:

| Deliverable (verbatim from the row) | Task |
| --- | --- |
| grid-stride dispatch | M8b-T1 Steps 2-3 |
| `packViews` | M8b-T2 Step 3 (`packArrays`), PD-13 |
| `spmvPull` | M8b-T3 Step 2 (the body), M8b-T4 Step 4 (the driver), M8b-T4 Step 1 (`coreOfView`, the seam it is called across) |
| PageRank (+ personalized) with `firstConvergedIteration` | M8b-T5 Steps 3 (both entry points), PD-9 (the recording rule), M8b-T3 Step 3 (`pr-finalize`) |
| HITS, eigenvector, Katz | M8b-T6 Step 3 |
| Afforest WCC | M8b-T7 Step 3, kernels in M8b-T3 Step 4 |
| `renumberPartition` on readback | M8b-T7 Step 3 item 7, PD-11 |
| `reverse()` residency | M8b-T2 Step 3 (`buildReverse`) |
| the `GpuAccelerator` algorithm members | M8b-T8 Step 2, PD-14 |
| oracles | M8b-T4 Step 3 (spmv), T5 Step 1 (pagerank), T6 Step 1 (spectral), T7 Step 1 (union-find) |
| `pagerank` / `wcc` benchmarks | M8b-T9 Steps 1-3 |
| result parity per design 9.7 (1e-5 relative; labels renumbered first-seen; `precision: "f32"`) | M8b-T5 Step 2 cases 1-3, M8b-T7 Step 2 case 1, M8b-T1 Step 4 (`precision: "f32"` on the result types) |

And the extra P7-row items the design's own line 4214 names that the integration row compresses: the device out-weight normaliser (M8b-T5 Step 3 item 3), `pr-scale` / `pr-finalize` (M8b-T3 Step 3), `degreeOrder({ of: "reverse" })` tiers (DEP-M8B-B, deferred to P4 with the reason and a decision file), the two-dispatch atomic dedupe (DEP-M8B-C, not built, with the reason and a decision file). Every G7 clause has a row in the verification matrix (7.2) and a numbered row in the G7 record template (M8b-T12 Step 2).

### 8.2 Placeholder scan

Searched this document for `TBD`, `TODO`, `FIXME`, `XXX`, `similar to`, `as appropriate`, `and so on`, `etc.`, `write tests for the above`, `add error handling`: no occurrence. The `<...>` cells that remain are inside the G7 record TEMPLATE (M8b-T12 Step 2), where they are the house convention for a value the owner copies from a named command's output -- the same convention `webgpu-graph-algorithms/docs/decisions/G1.md` uses -- and each is labelled with the command that fills it. The repeated-edit cases are given as complete tables rather than prose: the seven registry entries (M8b-T3 Step 5), the eighteen sabotage mutations with their exact `find` / `replace` strings (M8b-T10 Step 1), and the deliverable-to-task map above. Every step that used to name a symbol without writing it now writes it: `coreOfView` / `rowCountOf` / `arcCountOf` / `assertNotWindowed` in M8b-T4 Step 1, `runPowerIteration`'s config record, buffer table and batch loop in M8b-T6 Step 3, and `spmvChecks` / `spmvWorstFactor` / `wccChecks` / `wccWorstFactor` -- with `WCC_NOISE_FLOOR` making `minFactor: 10` mean "at least 1% of the nodes mislabelled" -- in M8b-T10 Step 2.

### 8.3 Type-consistency check across the tasks

- THE SEAM, `ViewBinding` -> `CoreBinding`: `residency.view()` (M8b-T2) returns a `ViewBinding` (`src/memory/residency.ts:63-68`, a `{ view, bindings: Record<string, Binding>, scalars }` record) while `prepareSpmvPull` / `record()` (M8b-T4), `prepareSegmentedReduce` and `graphBindings` / `graphOverrides` take a `CoreBinding` (`:46-56`, arrays as top-level fields). They are two different exported interfaces of one file and neither is assignable to the other. `coreOfView(v, arcCount)` -- written in FULL in M8b-T4 Step 1, owned by `src/primitives/core-shape.ts` -- is the ONE adapter; M8b-T5 Step 3 item 2 and M8b-T6 Step 3 both call it and nothing else in the phase coerces a view to a core. M8b-T4 Step 3 tests the round trip on a directed and an undirected snapshot.
- `rowCountOf`, `arcCountOf` and `assertNotWindowed`: `rowCountOf` and `assertNotWindowed` are module-PRIVATE in `segmented-reduce.ts` today (`:148`, `:168` -- no `export`) and `arcCountOf` does not exist at all. M8b-T4 Step 1 moves the first two into `src/primitives/core-shape.ts`, writes the third, and rewires `segmented-reduce.ts`'s three call sites with a `primitive` argument so its error details are unchanged. `src/primitives/spmv.ts` imports all three from there, never from `segmented-reduce.ts`.
- `planGridStride` is produced by M8b-T1 with `stride: number` non-null on a non-empty plan and `null` at `items === 0`; M8b-T4's `record` consumes it as `plan.stride ?? n`, so an empty plan never reaches a dispatch (it returns before).
- `SPMV_PARAMS`, `PR_PARAMS`, `PR_PARTIAL` and `WCC_PARAMS` are declared once, in M8b-T3 Step 1, and every later task references those names; their field lists in Step 1 match the field names used in the bodies of Steps 2-4 (`P.n`, `P.stride`, `P.alpha`, `P.beta`, `P.uniformP`, `P.arcBase`, `P.arcEnd`; `P.groups`, `P.iteration`, `P.trackConvergence`, `P.convergeThreshold`; `partials[i].danglingMass`, `.delta`, `.firstConverged`, `.iteration`, `.norm`; `P.items`, `P.r`, `P.flagIndex`, `P.giant`, `P.maxSteps`) and in the drivers of M8b-T4 through M8b-T7.
- `NORM_MODE` takes five values (0 PageRank, 1 L1 norm pass, 2 L2 norm pass, 3 scale by `partials[0].norm`, 4 identity) in M8b-T3's `pr-scale` body, in M8b-T6's PD-10 sequence and driver code, and in M8b-T3 Step 6's `U32_OVERRIDE_VALUES: [0, 1, 2, 3, 4]`. M8b-T5's PageRank compiles mode 0 only; M8b-T6's driver compiles `config.normMode` (1, 2 or 4) plus mode 3, never 0 -- which is what makes its `outWeightSum` dummy binding sound. The case count `P7: 37` is the sum those five values produce: 17 + 6 + 6 + 5 + 1 + 1 + 1.
- The storage counts appear three times and agree: M8b-T3 Step 5's table, M8b-T3 Step 6 item 3's `STORAGE_COUNTS`, and G7 record item 4 (`8 / 5 / 1 / 3 / 1 / 2`).
- `GpuPageRankResult`, `GpuScoresResult`, `GpuHitsResult` and `GpuLabelResult` are created in M8b-T1 Step 4, returned by the functions of M8b-T5 / T6 / T7, declared on `GpuAccelerator` in M8b-T8 Step 2, and exported by the barrel in the same step. `GpuPageRankResult` has `danglingMass: number` (non-optional) while the mirror `PageRankResultLike` has `danglingMass?: number | undefined` (`src/types/accelerator.ts:67-69`) -- the GPU type is assignable to the mirror, which is the direction `GpuAccelerator extends AlgorithmAccelerator` needs.
- The `ReduceScope` that M8b-T4 Step 1 creates (`algorithmScope`) satisfies `src/primitives/reduce.ts:34-44` field for field (`device`, `caps`, `pipelines`, `pool`, `workgroupSize`, `scratch`, `params`), so `prepareReduce`, `prepareSegmentedReduce` and `prepareSpmvPull` all take it -- which is what lets M8b-T5 use `segmentedReduce` for `outWeightSum` and M8b-T6 use `reduce` for the norm without a second scope type.
- File ownership: each file appears under `Create:` or `Modify:` in exactly ONE task. `test/helpers/sabotage.ts` and `test/sabotage/**` belong to M8b-T10 (not M8b-T3, whose `NOT touched:` line says so and gives the reason); `src/kernels.ts` and every `src/wgsl/*.wgsl.ts` belong to M8b-T3; `src/primitives/**` (the new `core-shape.ts` and `spmv.ts`, and the one rewiring edit to `segmented-reduce.ts`) belongs to M8b-T4; `src/index.ts`, `src/accelerator.ts` and `src/types/accelerator.ts` belong to M8b-T8; `src/types/algorithms.ts` to M8b-T1.
- Commit subjects: fifteen commits -- `tools` x1 (T1), `webgpu-graph-algorithms` x12 (T1's second, T2, T3, T4, T5, T6, T7, T8, T9's two, T10's first, and T12's `docs(webgpu-graph-algorithms): close the G7 gate record`), and TWO that carry no scope at all, typed `ci` (T10 Step 6) and `docs` (T11 Step 3). Both scopes used are in `commitlint.config.js`'s scope-enum (`:8-25`); the two scope-less subjects pass because `tools/commit-changes.sh:513` extracts an empty scope and `:514` skips the enum check. Every subject is at most 100 characters, none ends in a full stop, and the `fix(tools)` one is FIRST because `tools/commit-changes.sh:468-469` would refuse the rest until it lands.
