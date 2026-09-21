# @graphty/webgpu-graph-algorithms P4 -- The scale layer: grid pyramid and degree tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; all of them run in `/home/apowers/Projects/graphty-monorepo/.worktrees/gpu-scale-layouts`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P4 inside `webgpu-graph-algorithms/`, AFTER the P5 plan (`design/webgpu/plans/2026-09-20-webgpu-p5-fruchterman-reingold.md`) has landed on the same branch: the four primitives the grid needs (`exclusiveScan`, `histogram` / `countingSortByKey`, `radixSort`, the indirect `finalize` kernel with `planIndirect` and `Kernel.dispatchIndirect`); the mid / high degree tiers of `segmentedReduce`, `spmvPull` and the attraction kernel K2 over `degreeOrder()`; windowed upload EXECUTION for the row-walking primitives (`ArcWindow`, the rebase uniform, row clamping); the grid kernels G1-G7 with G4a / G4b in 2D and 3D (the robust extent, the outside pseudo-cell, `state.eps`, the sorted-order dispatch), `RepulsionGrid`, the grid path of the ForceAtlas2 model and -- through the `LAW` override the P5 plan handed to this phase -- of the Fruchterman-Reingold and spring-electrical models; `repulsion: "auto"`; `calibrateLayout()`; `stats.maxCellOccupancy` / `outsideGrid`; the exact-vs-grid fixtures and tests; the `node-limits` project's six files; the `layout-grid` benchmarks with T-6 / T-7 recorded and T-5 at 100k in Chromium; the crossover re-check; every kernel's sabotage rows, `inspect()` stage comparisons and noise-floor rows; the decision records of every departure; and the G4 gate record.

**Architecture:** The package is one runtime-agnostic core over the layers `device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator` (`webgpu-graph-algorithms/CLAUDE.md:78-87`). P4 adds thirteen kernel bodies under `src/wgsl/` and their registry entries, four primitive drivers under `src/primitives/` (`scan.ts`, `histogram.ts`, `radix-sort.ts`, `grid.ts`), the `RepulsionGrid` stage under `src/layouts/repulsion-grid.ts` beside `RepulsionExact`, `calibrateLayout` in `src/layouts/calibrate.ts`, and extends `GraphResidency.core()` to execute the windowed plans `planUpload` has produced since P1. The shared state machine `ForceSimulation` (`src/layouts/force-simulation.ts`, 2111 lines before P5) keeps its one model hook; the three models (`forceatlas2.ts`, and P5's `fruchterman-reingold.ts` / `spring-electrical.ts`) reach the grid tier through ONE stage class, exactly as they reach the exact tier through `RepulsionExact`. The dependency direction is unchanged: `src/` imports `@graphty/graph-format` at runtime and `@graphty/layout` / `@graphty/algorithms` as types only.

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu@0.4.0` (Dawn) in Node 22 and Chromium (Playwright) in the browser, `@graphty/graph-format` snapshots (`degreeOrder()` with the 1024 / 32 / 1 tier thresholds, `graph-format/src/snapshot/views.ts:41-45,568-603`), vitest 3.2 (node / node-limits / browser projects, v8 coverage), fast-check, pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; the T4 lane of `gpu.yml` on a labelled PR, which runs `--project=node --project=node-limits`, `.github/workflows/gpu.yml:70`).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 13 rules lines 4189-4202, row P4 line 4211 (the deliverables and gate G4), row P5 line 4212, the phase order lines 4221-4230 (the `P0 -> ... -> P4` line is 4224); 5.2 lines 1395-1427 (dispatch planning), 5.4 lines 1464-1486 (indirect dispatch and the finalize / selector kernel); 4.2 lines 1140-1179 (the windowed plan, the `ArcWindow` row at 1150), 4.6 lines 1285-1295 (which families execute windows); 6 lines 1557-1621 (the primitives table: row 2 `scan` 1569, row 3 `segmentedReduce` tiers 1570, row 4 `compact` 1571, row 5 `histogram` 1572, row 6 `radixSort` 1573, row 12 `grid` 1579; subgroup variants 1581-1598; the determinism policy 1599-1604); 7.3 lines 1710-1752 (the grid-tier buffers 1740-1744), 7.4 lines 1754-1791 (the grid-tier sequence 1782-1791), 7.5 lines 1793-1851 (K2 and its tiers, load balancing 1829-1851), 7.6 lines 1852-1922 (K3, the ORACLE of the grid), 7.7 lines 1923-2030 (the geometry table 1938-1954, the kernel table G1-G7 1955-1978, D25 at 1980, the stats 2001-2012, the cost model 2013-2023, option B 2024-2030), 7.8 lines 2031-2062 (the crossover rule 2044-2055, "the exact kernel is also the ORACLE" 2056-2062), 7.13 lines 2184-2197, 7.16 lines 2234-2244 (determinism), 7.17 lines 2245-2273 (settlement), 7.21 lines 2482-2519 (the scaling table); 2.2 lines 387-400 (`calibrateLayout`, `CalibrateOptions`, `GpuCalibration`); 3.3 lines 776 (`calibrateLayout` on the root entry), 836-841 (`LayoutStatsBase`), 868-871 (`GpuLayoutTuning`); 10.1 lines 3340-3357 (memory), 10.3 lines 3367-3387, 10.4 lines 3388-3421 (T-5 at 3410, T-6 3411, T-7 3412, T-12 3417); 11.1 lines 3433-3452 (the `node-limits` project), 11.4 lines 3502-3601 (exact-vs-grid 3556-3583, the force-sum invariant 3588), 11.6 lines 3628-3657 (item 8: the 100k grid rung of T-5), 11.7 lines 3658-3681 (`layout-grid`), 11.9 lines 3699-3764; 12.1 lines 3782-3820; 14.1 R-5 line 4264 and R-24 line 4283; 14.2 Q-5 line 4294, Q-6 4295, Q-21 4310, Q-32 4321; the decisions D16 line 213, D24 line 221, D25 line 222. The design is normative; every departure is in section 0.5.

**Design section 16 (`:4932` on, the amendments of 2026-09-20) and section 17 (`:5055` on):** both are part of the specification. 16.1 (the visited pre-check), 16.2 (contraction by bitmap) and 16.3 (the Louvain gain floor) name P8 / P11 kernels and touch nothing P4 builds. 16.4 (edge and node masks) is the one amendment with a consequence for P4: it adds ONE `storage-ro` binding (the packed arc mask under `HAS_MASK`) to the STRUCTURAL family only (traversal, components, k-core, triangles, Boruvka) and NONE to the weighted-sum family (`spmv-pull`, the attraction gather, `segmentedReduce`), whose masked weight rides the existing `weights` slot with `HAS_WEIGHTS` forced on; layouts are out of its scope (16.4 item 5). Every P4 tier kernel is in the weighted-sum family and the tiers add no binding (`perm` is already declared on all three: `segmented-reduce` stays at 5, `fa2-attraction` at 6, `spmv-pull` at 8, `test/kernel/bind-group-budget.test.ts:19-37`), so they leave 16.4 the room it needs by construction. The P4 primitives (`scan-*`, `histogram`, `counting-scatter`, `radix-*`, `indirect-finalize`) bind no graph array and are never masked. The one P4 kernel at eight storage buffers, `grid-near-field` (G7, T10), is a layout kernel 16.4 never masks; a later phase that masks the layout follows 16.4 rule 3 (a kernel at eight SPLITS, never a ninth binding) -- so G7's count is not a constraint on 16.4 today and 16.4 is not a constraint on G7. Section 17 schedules nothing for P4.

**Plan of record for the repository's shape:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (section 6, line 3239 on; its line 3276 names P4 as "grid pyramid, `node-limits` on the T4", run in `webgpu-graph-algorithms/` with the monorepo's lanes). The tree this plan is written against is the tree the P5 plan leaves: its new files (`src/layouts/model-common.ts`, `fruchterman-reingold.ts`, `spring-electrical.ts`, the `fr-*` / `se-*` suites, `benchmarks/layout-fr.bench.ts`, `docs/decisions/G5.md`), its registry edits (the `LAW` / `APPLY` / `STATS_MODE` override axes on K1, K2, K3, K5; `Fa2Params` at 128 bytes; `Fa2State.reserved0` as a `vec2f` at byte 120; `Fa2Trace.modelScalar`), its accelerator members `fruchtermanReingold` / `springElectrical`, its `SABOTAGE_P5` table, its compile-matrix pins (P1 53, P3 61) and its 26 noise-floor tolerances. Where P4 changes something P5 added, the task says so in a **P5 interaction** note.

**Gate:** G4 (design 13 row P4, line 4211). The record is `webgpu-graph-algorithms/docs/decisions/G4.md`, written by Task P4-T17 beside G0-G3, G5, G6-algorithms and G7.

**Tasks in this document:** P4-T1 .. P4-T17. T1 has no dependency. T2 depends on T1 (the scan's block-sum levels are recorded through the batch helpers T1 adds). T3 and T4 depend on T2 (both call `exclusiveScan`). T5 has no dependency and may run in parallel with T1-T4. T6 depends on T5 (the K2 tier bodies) and on nothing else: the layout's `perm` binding is host-side and T6 consumes no T1-T4 product, which is why 0.3 runs `T5 -> {T6, T7}` in parallel with T1-T4. T7 depends on T5 (the tier planners it loops over windows). T8 depends on T3 and T4 (the sort and the histogram) and on T1 (the finalize kernel, for G4a in T9). T9 depends on T8. T10 depends on T9, T6 and T7. T11 depends on T10. T12 depends on T11 (the tolerances it measures the G6 / G7 sabotage rows against; the K1 grid-block rows it adds name T11's suite). T13 depends on T12 (it fills the `SABOTAGE_P4_LAW` table T12 declares and T12's suite runs). T14 depends on T12. T15 depends on T12. T16 may run any time after T7. T17 is last. Within the phase every file appears under `Create:` or `Modify:` in exactly one task, except the files the ownership table of 8.3 lists (PD-1): the registry mirrors every kernel task appends to (`src/kernels.ts`, `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts`, `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts`, `test/helpers/sabotage.ts`, `test/oracle/oracles.test.ts`, `src/constants.ts` with its pin file) and the shared primitives and model files that two consecutive tasks extend (`segmented-reduce.ts`, `core-shape.ts`, `force-simulation.ts`, the three model files, `repulsion-grid.ts`, the two field bodies); each such file is edited only in the region the task names, never in another task's region.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -rnP '[^\x00-\x7F]'` over the touched files is a step of Task P4-T17.
- Never run `sudo`; nothing in this plan needs it. Servers only on ports 9000-9099 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them. P4 adds thirteen kernel ids and BRANCHES (`TIER` 1 / 2, `LAW` 1 / 2) to five existing kernels; this plan applies rule (f) to every branch as if it were a kernel, as the P5 plan did.
- Project rule (root `CLAUDE.md`): never create fallbacks if WebGPU is not supported -- `src/` contains no CPU path, no WebGL path, no software-adapter acceptance; the package throws. `repulsion: "auto"` picks the tier by `n` alone, never by `caps.software` (design 7.8).
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the package's `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts:185`).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md:78-87`): `device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator`. `src/wgsl/**` is imported only by `src/kernels.ts`; `src/primitives/**` never imports `src/context.ts` (`webgpu-graph-algorithms/eslint.config.js:147`); `src/layouts/**` may import `src/primitives/**` (`:149` forbids only `wgsl`, `algorithms`, `accelerator`, `entries`, `barrel`). Enforced by the eslint zones and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md:166-201`): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`), and calls a `wg_reduce_*` helper only when its entry lists `needs: ["subgroups"]` (`src/kernel/wgsl.ts:404-405`). A bitwise operator is fine on a CELL KEY, a DIGIT or a LANE index and forbidden on an arc index or a byte offset (house rule, `CLAUDE.md:214-215`).
- House style (`webgpu-graph-algorithms/CLAUDE.md:203-218`): JSDoc on every export, explicit return types, `.js` suffixes on relative imports, `?: T | undefined` on interface properties, absent output is `null`, every throwing call leaves state unchanged, tests use the vitest globals, every kernel test runs its kernel twice and asserts bitwise equality first, every tolerance comes from `noiseFloorFor(id)` and never from a literal.
- Temporary files under `./tmp/` (`$PKG/tmp/p4/`); write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason and, where the departure changes a design statement, a `design/decisions/2026-09-20-<slug>.md` record written by Task P4-T16.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-20, the tree the P5 plan leaves)

| Fact | Evidence |
| --- | --- |
| The worktree is on branch `feat/gpu-p5-p4` at `5ba15bb7 chore(release): publish [skip ci]`; before P5 lands the working tree holds nothing but the two plan files (this one and P5's). This plan is executed once the eleven P5 tasks have landed on that branch. | `git rev-parse --abbrev-ref HEAD`; `git log --oneline -1`; `git status --porcelain` |
| `@graphty/webgpu-graph-algorithms` is **0.5.0** over `@graphty/layout` **1.7.0**; `webgpu` (Dawn) is pinned at `0.4.0` (the peer range `>=0.4.0 <1.0.0`); `fast-check ^4.2.0`, `vitest ^3.2.4`, `tsx ^4.20.3`. | `grep -n '"version"\|"fast-check"\|"vitest"\|"webgpu"\|"tsx"' webgpu-graph-algorithms/package.json` (`:3,92,111,113,116-117`); `grep -n '"version"' layout/package.json` (`:3`) |
| `planIndirect` is a throwing stub: `E_UNSUPPORTED { feature: "planIndirect" }` (`src/kernel/dispatch.ts:155-160`), pinned by `test/kernel/dispatch.test.ts:163-166`; `plan2d(groups, caps)` (`:120-123`) is exported "for the indirect finalize kernel's host twin (P4)" and shares `grid()` (`:72-95`) with `plan1d` (`:104-108`); `planGridStride` (`:138-147`) is real since M8b. `Kernel.dispatch` (`src/kernel/kernel.ts:256-305`) records `dispatchWorkgroups` only; `CommandBatch.dispatches` already counts "dispatchWorkgroups / dispatchWorkgroupsIndirect calls" (`src/kernel/batch.ts:129-133`, the pass wrapper at `:150`); `CommandBatch` has `pass` / `endPass` / `copy` / `readback` / `submit` (`:141,156,169,195,235`) and no `clearBuffer`. | the cited lines |
| Windowed upload is PLANNED, never executed: `planUpload` returns `{ kind: "windowed", arrays, windows, arcsPerWindow }` (`src/memory/upload-plan.ts:66-71,335-349`) through `planArcWindows` (`:178-222`, 256-byte-aligned starts with `%`, rows split across windows) and `placeWindows` (`:232-265`, an array split across buffers at window boundaries), both unit-tested (`test/memory/upload-plan.test.ts:739-829`); `GraphResidency.core()` throws `E_TOO_LARGE { path: "windowed", algorithm: null }` on such a plan (`src/memory/residency.ts:309-320`, pinned by `test/memory/residency.test.ts:732-745` over a `GraphResidency` built with `fakeCaps(ctx.caps, { maxStorageBufferBindingSize: 256 })`) and `CoreBinding.windows` is always `null` (`:353`); `degree` re-throws it with `algorithm: "degree"` (`src/algorithms/degree.ts:65-78`, pinned by `test/algorithms/degree.test.ts:162-200`); `assertNotWindowed` rejects `plan === "windowed" \|\| windows !== null` with `E_UNSUPPORTED { feature: "<primitive>.windowed" }` (`src/primitives/core-shape.ts:48-54`, pinned at `test/primitives/segmented-reduce.test.ts:345-357` and `test/primitives/spmv.test.ts:364-375`). The `degree` and `segmented-reduce` bodies already take the rebase uniform (`colIdx[arc - P.arcBase]`, `min(rowPtr[i + 1u], P.arcEnd)`, `P.accumulate`; `src/wgsl/degree.wgsl.ts:15-22`, `src/wgsl/segmented-reduce.wgsl.ts:22-33`), `RangeParams` carries `arcBase` / `arcEnd` / `accumulate` (`src/kernels.ts:76-86`) and `test/helpers/degree-check.ts:124-` runs the degree kernel over hand-built windows with poison tails ("the P4 windowed pattern executed early"). `ArcWindow` / `Binding.window` are in `src/types/memory.ts:8-23`. | the cited lines |
| The degree tiers are declared and refused: `DegreeTiers { perm, segmentOffsets }` (`src/primitives/segmented-reduce.ts:21-24`); `prepareSegmentedReduce` throws `E_UNSUPPORTED { feature: "segmentedReduce.tiers" }` for non-null tiers (`:226-230`) and compiles `TIER: 0` only (`:234`); `prepareSpmvPull` likewise (`src/primitives/spmv.ts:142-146`); `U32_OVERRIDE_VALUES.TIER` is `[0]` ("TIER is 0 only until P4", `test/helpers/override-matrix.ts:54-58`); the K2 entry declares `TIER` (`src/kernels.ts:369`) and its body walks one row per thread over `[P.tierStart, P.tierEnd)` (`src/wgsl/fa2-attraction.wgsl.ts:20-21`); `ForceSimulation.load()` merges `graphOverrides(core, null, weights)` -- `perm` is always null (`src/layouts/force-simulation.ts:979`) and `ModelResources.perm` (`:68`) is never bound. The `degreeOrder` view uploads `perm` and exposes `scalars.segmentOffsets` (`src/memory/residency.ts:414-422`); `spmv-pull` declares no `TIER` (`src/kernels.ts:470-473`) and is grid-stride over rows (`src/wgsl/spmv-pull.wgsl.ts:20-21`). `design/decisions/2026-09-19-spmv-tier-zero-only.md` hands the `spmv-pull` tiers to "G4 closes, which lands the tiers in `segmented-reduce`; the same change then removes the `spmv-pull` throw". | the cited lines |
| The grid tier is refused in three places: `ForceSimulation.load()` (`force-simulation.ts:888-898`, `E_UNSUPPORTED { feature: "repulsion.grid" }` after `tierFor` `:361-369`), `ForceAtlas2Model.inputs()` (`forceatlas2.ts:548-559`) and `ForceAtlas2Model.recordIteration()` (`:721-726`); pinned by `test/layouts/fa2-options.test.ts:717-736,809` and `test/layouts/force-simulation.test.ts:507-541` (e5 / `auto`). `resolveLayoutTuning` (`forceatlas2.ts:386-431`) validates and stores `nearMax`, `gridMax2D`, `gridMax3D`, `extentFactor`, `deterministic` (`LAYOUT_TUNING_DEFAULTS` 64 / 512 / 128 / 6 / true, `src/constants.ts:89-101`) with no effect; `readStats` reports `repulsionTier: "exact"` and null grid stats (`forceatlas2.ts:856-858`). `n > MAX_1D_ITEMS` is `E_TOO_LARGE { path: "partials" }` "(the third partials level is P4)" (`force-simulation.ts:858-869`); `EXACT_MAX_NODES = 32768` cites the G3 session and says the grid clause "is re-checked at G4" (`src/constants.ts:22-32`; `docs/decisions/G3.md:121-128`). | the cited lines |
| `Fa2State` already reserves the grid fields the design names: `gridMin` (vec4f) @80, `eps` @96, `outsideGrid` @104, `maxCellOccupancy` @108 (`src/kernels.ts:126-157`); after P5-T2 Step 1 `reserved0` is a `vec2f` @120 (`temperature` @112, `kineticEnergy` @116). `Fa2Params` carries `nearMax` @28, `extentFactor` @68, `gridMax` @72, `levels` @76 and `pad` (vec4f) @80 "reserved for the P4 GridSpec" (`:104-124`); after P5-T2 Step 1 the seven P5 f32 fields occupy @96-120 and `pad1` @124, 128 bytes. FA2's `paramsFor` writes `gridMax: 0, levels: 0, pad: [0, 0, 0, 0]` (`forceatlas2.ts:700-703`). K1 binds `partials`, `S`, `T` (3 storage, `:343-348`) and folds nothing on the first iteration after `load()` (`fa2-stats-finalize.wgsl.ts:18,40`); `load()` writes the initial `centroid` / `min` / `max` / `rmsRadius` / `radius` from the CPU and then calls `model.onLoad(writer)` before one whole-header upload (`force-simulation.ts:1862-1873`). | `sed -n '104,157p' webgpu-graph-algorithms/src/kernels.ts`; `sed -n '1862,1873p' webgpu-graph-algorithms/src/layouts/force-simulation.ts` |
| `RepulsionExact` (`src/layouts/repulsion-exact.ts`) is the stage template: `RepulsionExactResources` (`:20-29`), `RepulsionExactOverrides` (`:32-36`), `static create(pipelines, caps, overrides)`, `static specs(overrides)` (`:95-104`), `bind(resources)` (`:112-128`), `recordRepulsion(pass, n, paramsOffset)` / `recordSpeedFinalize(pass, paramsOffset)`; the FA2 model's `BoundModel` (`forceatlas2.ts:436-457`), `buffers` (`:521-534`), `specs` (`:592-603`), `bind` (`:612-672`), `paramsFor` (`:681-705`), `recordIteration` (`:720-779`: one K1-K5 pass reused across the batch's iterations, `toScene` in a second pass) and `readStats` (`:834-866`) are the members P4 extends. `ForceSimulation.allocate` creates every `BufferSpec` a model returns (`force-simulation.ts:1700-1732`; `zero: true` needs `COPY_DST`) and `clearKept` re-zeroes them on a same-size reload (`:1740-1751`); `inspect(name)` reads any shared or `BufferSpec` name (`:1991-2006`); `runStages(upTo)` validates `upTo` against `model.stages` (`:2013-2021`). | the cited lines |
| The prelude offers `linear_id`, `group_id`, `lowbias32`, `pair_hash`, `hash_unit`, `hash_dir`, `kick_dir`, `mask_bit` and the constants `FA2_DIST_FLOOR`, `FA2_DIST_FLOOR_SQ`, `FA2_COINCIDENT_SQ`, `F32_MAX`, `U32_MAX`, `MAX_WORKGROUPS_PER_DIM` (`src/kernel/prelude.ts:45-86`); the reduction helpers `wg_reduce_vec4` / `wg_reduce_u32` / `wg_reduce_f32` with an `op` argument (0 sum, 1 min, 2 max) in a subgroup and a workgroup-memory twin (`:102-126,146-204`), spliced by `composeWgsl` when the entry lists `needs: ["subgroups"]` (`src/kernel/wgsl.ts:428-450`). `UniformBlock` field types are `u32 \| i32 \| f32 \| vec2f \| vec2u \| vec4f \| vec4u` (`src/kernel/struct-block.ts:13`). `Kernel.bind` rejects a writable slot aliasing another slot's range on one buffer and two access modes on one buffer (`src/kernel/kernel.ts:106-120`); `BindingDecl.kind` is `storage \| storage-ro \| uniform` and `array<atomic<u32>>` is an accepted storage type (the WCC entries, `src/kernels.ts:519,537`). | the cited lines |
| The registry-shaped test files every kernel task appends to: `test/kernel/registry.test.ts` (`TABLE: Record<KernelId, ExpectedEntry>` `:71`, so every new id needs a row, and the phase union at `:54`), `test/kernel/bind-group-budget.test.ts` (`STORAGE_COUNTS` `:19-37`), `test/kernel/wgsl-compile.test.ts` (per-kernel pins `:52-60`), `test/helpers/override-matrix.ts` (`U32_OVERRIDE_VALUES` `:55-62`, `EXPECTED_CASES_BY_PHASE` `:71-76`: P1 53, P2 52, P3 61, P7 37 after P5), `test/helpers/sabotage.ts` (`SABOTAGE` `:43`, `SABOTAGE_P3_ADDENDUM` `:489`, `SABOTAGE_PHASES = ["P1", "P2", "P3", "P7"]` `:506`, `SABOTAGE_EXEMPT` `:514`, `sabotagedBody` `:522`, `withSabotage` `:541`, `CheckReport` / `ratioOf` / `mergeReports` / `assertCheckPasses` `:560-613`; after P5-T7 `SABOTAGE_P5` at the end); `test/sabotage/coverage.test.ts` gates by phase (`:33-37`) and checks find-once (`:72-80`). `KernelEntry.phase` is `"P1" \| "P2" \| "P3" \| "P7"` (`src/kernels.ts:71`). | the cited lines |
| `noiseFloorFor(id)` THROWS for an id `benchmarks/results/noise-floor.json` lacks (`test/helpers/noise-floor.ts:218-235`); the file holds 36 tolerances over 60 rows from four adapter classes before P5 (`node -e "const d=require('./benchmarks/results/noise-floor.json'); console.log(Object.keys(d.tolerances).length, d.rows.length)"` -> `36 60`; P5-T4 adds 26). The derivation is `min(cap, 10 * max(floor, MIN_FLOOR))` over `TOLERANCE_CAPS` (`test/noise-floor.test.ts:995-1003`, `:374-382` spreading `P3_TOLERANCE_CAPS` and, after P5, the two P5 tables); a member is one `NoiseMember` per fixture (`:159-189`); the G3 recording sequence is the writer files under `GRAPHTY_NOISE_FLOOR_WRITE=1` on NVIDIA, then lavapipe, then `test/noise-floor.test.ts` in write mode on both, then `prettier --write` (`docs/decisions/G3.md:166-170`). u32 fixtures compare bitwise (the `degree` member, `:307-315`). | the cited lines |
| The fixtures: `FIXTURE_NAMES` (`test/helpers/graphs.ts:397-411`) carry `hub10k` (a scaled 10k-degree star inside a random graph, `:483-491`), `isolated` (a giant component + 1% isolated nodes + 100 triangles, `:504-518`), `coincident` (`:492-503`, positions supplied); `fixture(name, scale)` returns `{ snapshot, positions, name }` (`:438-535`); `randomEdges` (`:216`), `rmatEdges` (`:263`), `starEdges` (`:143`); `snapshotOf(edges, { nodeCount, weighted, arena, label })` (`:350`). `gpuScale()` is 1 on hardware and 1/50 on a software adapter (`test/setup/gpu.ts:116-118`); `fakeCaps(base, limits, flags)` (`test/helpers/caps-tables.ts:137-159`). | the cited lines |
| The FA2 oracle exposes `stages.repulsion`, `stages.gravity`, `stages.force` (`test/oracle/forceatlas2.ts:46-66`) and `kickDir` (`:246`, a JS port of the prelude's `lowbias32` / `pair_hash` / `hash_dir` on hash words); `captureAllStages` (`test/helpers/fa2-parity.ts:915-`), `stageReport` (`:1067`), `stageError` (`:848`), `paritySnapshot` / `startPositions` / `pinMask` / `debugStages` / `asF32` / `xyzOf` (`:158-436`), `P3_TOLERANCE_CAPS` (`:589-626`, every `basis` a noise ROW id), `layoutMetrics` (`test/helpers/metrics.ts:296`), `spread` (`:269`). P5-T4 exports `readPartials`, `assertUnitStart`, `layoutStart` and adds `fr-parity.ts` / `se-parity.ts`. | the cited lines |
| `benchmarks/run.ts` registers `upload`, `roundtrip`, `layout-exact`, `pagerank`, `wcc` (`:34-40`; P5-T8 adds `layout-fr`); `layout-exact.bench.ts` holds `EXACT_LADDER` (`:59-66`), `exactMaxNodesFromLadder` (`:128-149`: "P4 extends this function with [the grid clause]"), `ladderRowsOf` (`:160-177`), and after P5-T8 the exported `warmClock(sim, minMs)` and `reportedRow(group, name, samples, runs, items, unit)`; `benchmarks/layout-run.ts:14-15` says "P4 adds --repulsion"; `benchmarks/datasets.ts` has `TIERS` 10k/100k, 100k/1M, 1M/10M (`:223-227`), `randomEdges` (`:35`), `snapshotOf` (`:235`); the append script the gates use is `docs/decisions/G3.md` appendix A (`:533-582`, `REQUIRED_GROUPS` at `:545`; six groups after P5-T8). The browser T-5 test (`test/browser/bench.test.ts:76-120`) covers 10k only: "The 100k grid-tier half of T-5 is P4" (`:5-6`). `ctx.profiler` resolves per-pass timings by pass label (`src/kernel/batch.ts:145`, `src/kernel/profiler.ts`). | the cited lines |
| `test/limits/` holds `pagerank-1m.test.ts` and a README that lists the six G4 files by name: `binding-2gib`, `windowed-200mb`, `dispatch-2d-100m`, `oom-scope`, `vendor-features`, `layout-1m` (`test/limits/README.md:12-23`); the `node-limits` project has a 600 s test timeout and no coverage thresholds (`vitest.config.ts:205-216`); the GPU lane runs it (`gpu.yml:70`) and the default lane never selects it. The RTX 4070 SUPER (driver 580.173.02) and Mesa's `lvp_icd.x86_64.json` are on the dev box (`nvidia-smi`; `ls /usr/share/vulkan/icd.d/`). | the cited lines |
| The commit script's scope list carries `webgpu-graph-algorithms` (`tools/commit-changes.sh:433-434`) and `SUBJECT_MAX=100` (`:437`); the CI no-subgroups pass covers `test/primitives test/layouts test/algorithms` (`.github/workflows/ci.yml:318`); the node project's include already names `test/primitives`, `test/layouts`, `test/oracle`, `test/sabotage` (`vitest.config.ts:196-199`). No CI or config edit is needed. | the cited lines |
| `webgpu-graph-algorithms/docs/decisions/` holds G0, G1, G2, G3, G6-algorithms, G7 and, after P5-T11, G5. There is no G4. `design/decisions/README.md` indexes ten records (`:29-40`; thirteen after P5-T10); `design/README.md:14` counts them and `:21` counts the webgpu documents (13 and 13 after P5-T10); `design/webgpu/README.md` lists the plans (`:7-18`). | `ls webgpu-graph-algorithms/docs/decisions/ design/decisions/` |

### 0.2 Entry criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| The design's P3 gate (the exact-tier FA2, `ForceSimulation`, the `ForceModel` hook, `RepulsionExact`) | **MET** | `webgpu-graph-algorithms/docs/decisions/G3.md`; `src/layouts/force-simulation.ts`, `forceatlas2.ts`, `repulsion-exact.ts` on master |
| P-ENV (Ubuntu 24.04, `webgpu` 0.6.x) | **NOT MET, not required** | design 13 orders `P-ENV -> P4` (`:4224`) because the grid phase was the first that needed the `node-limits` project on the hosted runner; the T4 lane runs on machine.dev today (`gpu.yml:16-31`) with `webgpu@0.4.0`, and every G4 item this plan lists runs there. P-ENV stays its own one-change phase (0.7). |
| Phase M8b (`planGridStride`, `spmv-pull`, `reverse()` residency, the first `node-limits` file) | **MET** | `src/kernel/dispatch.ts:138-147`; `src/primitives/spmv.ts`; `test/limits/pagerank-1m.test.ts`; `docs/decisions/G7.md` |
| Phase P5 (the three models, `model-common.ts`, the `LAW` axis on K2 / K3) | **MET once its eleven tasks have landed on `feat/gpu-p5-p4`** | `ls webgpu-graph-algorithms/src/layouts/` lists `fruchterman-reingold.ts`, `spring-electrical.ts`, `model-common.ts`; `docs/decisions/G5.md` exists; `grep -n 'LAW' webgpu-graph-algorithms/src/kernels.ts` shows the K2 / K3 declarations. Every line number this plan cites in a file P5 edits is re-read at the task's first step (the tasks say so). |

P4 can start as soon as P5's last commit is on the branch.

### 0.3 Execution order

```
P3 (met) -> P5 (landed first) -> P4 (this plan) -> P8 / P9 / P11 (the frontier and structure phases, unchanged)
```

Inside P4: `T1 -> T2 -> {T3, T4} -> T8 -> T9 -> T10 -> T11 -> T12 -> {T14, T15}`; `T5 -> {T6, T7}` in parallel with T1-T4 (T6 and T7 must land before T10); `T13` after T12; `T16` after T7; `T17` last. Two agents can run `T1-T4` and `T5-T7` side by side because the registry files are appended in disjoint regions (PD-1).

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | The registry-shaped files (`src/kernels.ts` and its five test mirrors, `test/oracle/oracles.test.ts`, `src/constants.ts` and its pin file) and the shared primitive / model files 8.3 tables are the exception to "every file in exactly one task": each task edits its own named region (its entries, pins, rows, or the member it adds); `"P4"` joins `KernelEntry.phase` in T1 and `SABOTAGE_PHASES` only in T12, when the last P4 kernel has its rows | P4-T1, P4-T12 |
| PD-2 | The indirect args live in 16-byte slots `(x, y, 1, count)`: the fourth word is the clamped count the consuming kernel reads as its bound (design 5.4's "STORAGE scalar the next round reads"); `Kernel.dispatchIndirect(pass, bound, args, slot, dynamicOffsets?)` records `dispatchWorkgroupsIndirect(args.buffer, args.offset + 16 * slot)` | P4-T1 |
| PD-3 | `exclusiveScan` is Hillis-Steele in workgroup memory with recursive block sums and an add-back, `needs: []`: u32 addition is exact in any order, so a subgroup variant would give bitwise the same output and its twin would test nothing (design 6 `:1581-1583` lists scan among the subgroup variants; recorded as DEP-P4-E) | P4-T2 |
| PD-4 | `histogram` uses global atomics only; the privatised workgroup-memory histogram belongs to `radixSort`'s own per-workgroup kernel (the only <= 256-bin caller), so `histogram` has one path and no `PRIVATE` override | P4-T3 |
| PD-5 | `radixSort` is LSD, 8 bits per pass, digit-major per-workgroup histograms, one `exclusiveScan` per pass, and a STABLE scatter whose in-workgroup ranking is done serially by lane 0 (256 steps per workgroup, deterministic, no atomics); the caller passes the scratch pair and `record()` returns which pair holds the result (odd pass counts: the scratch pair). The grid always sorts with `bits = 24` (three passes; 2D keys need 18 bits at G = 512, 3D 22 at G = 128) so `sortedIdx` is always the scratch values buffer | P4-T4, P4-T8 |
| PD-6 | The mid tier (rows of degree 32..1023) is 32 lanes per row, `WG / 32` rows per workgroup, reduced by a five-step tree in workgroup memory (no subgroup builtin: bitwise the same on every subgroup size 4 / 8 / 32 / 4-128 the lanes run on); the high tier (degree >= 1024) is one workgroup per row through `wg_reduce_*`, so `segmented-reduce`, `fa2-attraction` and `spmv-pull` gain `needs: ["subgroups"]` and a twin. The tier bodies are functions called under `if (TIER == <n>u)` (an override, uniform) so every barrier is reached in uniform control flow | P4-T5 |
| PD-7 | The three tier dispatches of one iteration read their row range from `Fa2Params`: TIER 0 from `[tierStart, tierEnd)` (= `[midEnd, n)` with a permutation, `[0, n)` without), TIER 1 from `[hiEnd, midEnd)`, TIER 2 from `[0, hiEnd)`; `hiEnd` / `midEnd` / `arcBase` / `arcEnd` / `accumulate` take the bytes of P5's `pad` (vec4f @80) and `pad1` (@124), so no offset moves -- declared by T5 together with the K2 body that reads them, so T5's commit builds on its own; `ForceSimulation` binds `perm` from the `degreeOrder` view whenever `segmentOffsets[2] > 0` (a row of degree >= 32 exists), else keeps the dummy | P4-T5 (the fields), P4-T6 (the rule) |
| PD-8 | Windowed execution lands for `degree` and `segmentedReduce` (the row-walking primitives whose output accumulates): a fill of the identity element, then one dispatch per window with `arcBase = w.start`, `arcEnd = w.end`, `accumulate = 1`, over rows `[w.rowFirst, w.rowLast]` for an untiered dispatch and over the FULL tier range for each tier dispatch (tier ranges are permutation positions, window rows are node indices; a row outside the window folds the identity and is unchanged); `CoreBinding` gains `arcBuffers` and `core-shape.ts` gains `windowBinding(core, name, w)`; `spmvPull` and the layout keep their refusal on a windowed core (DEP-P4-B) | P4-T7 |
| PD-9 | `GridSpec` is computed on the host from `n`, `dim` and the tuning: `G = clamp(nextPow2(2 * n^(1/dim)), 8, floorPow2(gridMax))`, `levels = log2(G / 4) + 1`, `cells = G^dim`, level L holds `(G / 2^L)^dim` cells at `levelOffsets[L]`, level 0 one more (the outside pseudo-cell at index `cells`); a `gridMax` that is not a power of two is rounded DOWN to one (512 / 128 stay; the software saturation case uses 32) | P4-T8 |
| PD-10 | K1 writes `S.invCellSize` beside `cellSize` (stored in `S.gridMin.w`) and G1 keys a node by `floor((p - gridMin) * invCellSize)`: a multiply is correctly rounded on every adapter while a division is not (G3-F6, `CLAUDE.md:372`), so an oracle that reads the GPU's `gridMin` / `invCellSize` reproduces every key bitwise. `Fa2State.reserved0` (vec2f @120 after P5) becomes `invCellSize` (f32 @120) + `reserved0` (f32 @124) | P4-T8, P4-T10 |
| PD-11 | The sort scratch (`sortedKey`, `sortedIdx`), the radix histogram table and the scan block sums are MODEL-OWNED buffers allocated at `load()` (16 B/node + the tables), not pool leases per batch: a per-batch lease would rebuild the G2-G4 bind groups every batch (`Kernel.bind` caches by buffer identity), and 16 MB at 1M nodes is the price (DEP-P4-D) | P4-T8 |
| PD-12 | `cellHist` is zeroed by a `fill` dispatch inside the iteration's pass (after K1 has read the previous iteration's `cellHist[cells]`), never by `clearBuffer`, so the grid tier keeps one compute pass per iteration and `CommandBatch` needs no clear method | P4-T8 |
| PD-13 | Hub cells (`count > 1024`) are appended by G4 to `hubList` with `atomicAdd(&hubCounters[0], 1u)`, finalised into indirect args by the T1 kernel (G4a), and summed by G4b, one workgroup per hub cell through `wg_reduce_vec4`; G4b guards its work by `valid = h < hubCount[0]` (a second, read-only `array<u32>` view of `hubCounters`) instead of returning early, so its reduction is reached in uniform control flow | P4-T9 |
| PD-14 | K1 keeps one body: the grid block runs under `if (P.gridMax > 0u)` (FA2's exact tier writes `gridMax: 0`); on the exact tier the two new K1 slots are bound to dummies (`cellHist` := the `partials` binding, both read-only; `hubCounters` := a 16-byte model-owned buffer every tier allocates) | P4-T10 |
| PD-15 | The near field samples an over-full cell by `h = lowbias32((cell ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed) % count`, takes `nearMax` entries `[h, h + nearMax) mod count`, skips the node itself, and scales by `others / sampled` with the REALISED sample size (`sampled = nearMax - 1` when the node was in its own window, else `nearMax`; `others = count - 1` for the own cell, `count` for the eight / twenty-six neighbours): Horvitz-Thompson with the exclusion the design asks for, but NOT the design's own-cell denominator `nearMax - 1`, which assumes the node always falls inside its own window (DEP-P4-K); the residual bias of the conditional scale is what the gate's 32-seed 5 % item measures | P4-T10 |
| PD-16 | The grid tier's `recordIteration` uses three compute passes before `toScene`, `fa2-k1`, `fa2-attraction`, `fa2-grid` (G1..G7, K4, K5) -- four per iteration with the `fa2-to-scene` pass every tier already records (`forceatlas2.ts:777-779`) -- so the profiler reports the attraction gather on its own row (T-7) at the cost of two pass boundaries; the exact tier keeps its one `fa2` pass before `toScene` | P4-T10 |
| PD-17 | `model.stages` is the UNION list `["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"]` for every model; `upTo` stops after the named stage's position, so on the exact tier `upTo: "G5"` stops after K3 and on the grid tier `upTo: "K3"` stops after K2 -- `ForceSimulation.runStages` validates against the list unchanged (`force-simulation.ts:2015`) | P4-T10 |
| PD-18 | `ForceModel.buffers(n, dim)` decides the tier itself through the exported `tierFor(tuning, n)` (the rule `ForceSimulation.load` applies at `:888`), so the grid buffers exist exactly when the simulation will record the grid sequence; the interface is unchanged | P4-T10 |
| PD-19 | The exact-vs-grid checks compare the grid tier's `force` stage (after G7) with the EXACT GPU tier's `force` stage on the same adapter from the same start (design 7.8: "the exact kernel is also the ORACLE"), never with the f64 oracle; the f64 oracle's stages are the target of the per-stage noise rows only (`cellKey`, `sortedIdx`, `cellStart`, the pyramid levels, the far field, the near field), where the GPU and the oracle differ by f32 rounding alone | P4-T11 |
| PD-20 | The two exact-vs-grid caps of the gate (RMS <= 5 %, p99 <= 25 %) are `TOLERANCE_CAPS` entries whose basis rows are the recorded approximation floors, so the derived tolerances are `min(cap, 10 * floor)`; a floor above its cap is a finding for G4 section 7 (design 10.4), never a loosened cap | P4-T11 |
| PD-21 | The G6 / G7 sabotage rows and the tier / `LAW` branch rows live in two addendum tables (`SABOTAGE_P4_TIERS`, `SABOTAGE_P4_LAW`) measured only by the suites that reach those branches (the P5 `SABOTAGE_P5` precedent, PD-8 there); the rows of the thirteen NEW kernels go into `SABOTAGE` under their own ids | P4-T5, P4-T12, P4-T13 |
| PD-22 | `LAW` reaches G6 (the far field's per-cell law) and G7 (the exact pair law of the near field) as ONE three-valued declaration each, in the shape K3 took in P5-T2; the FR and spring models route `tier === "grid"` through the same `RepulsionGrid` with their own overrides, and their grid tier is checked against their own exact tier (LAW 1 / 2 on K3) with the FA2 bounds | P4-T13 |
| PD-23 | `calibrateLayout` builds its probe graphs from a seeded LCG inside `src/layouts/calibrate.ts` (`Lcg` of `seed.ts`, E = 10 n, `fromEdgeArrays`), times 10 iterations per size on both tiers after `PipelineCache.warm`, and never reads `caps.software` | P4-T14 |
| PD-24 | The grid clause of the 7.8 rule is added to `exactMaxNodesFromLadder` as an optional `gridRows` argument: a rung whose grid time is below its exact time is excluded from the candidates, so the G3 constant is re-fixed by the same one function | P4-T14 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-P4-A | Design 6 row 4 (`:1571`) lists `compact` / `dedupe` as "pulled in by P4 (grid hub cells)" and row P4 (`:4211`) names `compact`; P4 builds neither. | The grid's hub list is an `atomicAdd` append (7.7 G4, `:1973`), not a flag-scan-scatter, so no G4 item exercises `compact`; rule (b) forbids building a primitive the slice does not need, and `dedupe`'s only named consumers are P7's WCC (which needed none, `design/decisions/2026-09-19-afforest-needs-no-dedupe.md`) and P8. Recorded by Task P4-T16 as `design/decisions/2026-09-20-compact-lands-with-the-frontier-phase.md`. |
| DEP-P4-B | Design 4.6 (`:1287-1289`) says the whole per-row gather family (attraction, SpMV, degree, segmented reduce) executes windows in v1; P4 executes them for `degree` and `segmentedReduce` and keeps `E_TOO_LARGE { path: "windowed" }` for the layout (`force-simulation.ts:912-923`) and `E_UNSUPPORTED { feature: "spmvPull.windowed" }` for the pull. | A windowed core needs more than 33,554,432 arcs at the 128 MiB default binding limit (4.2, `:1150`), the 10M / 100M tier, which 7.21 lists as "Node batch only" and no G4 item measures; the layout's uniform ring holds ONE `Fa2Params` per iteration and a window loop needs one per (iteration, window), and the pull's affine epilogue (`rankOut[v] = beta pv + alpha (sum + dangling pv)`, `spmv-pull.wgsl.ts:44`) cannot accumulate across windows without a second finalize dispatch. The K2 body takes the rebase uniform so it is window-READY (T6 proves it at the kernel level with the degree-check pattern). Recorded by Task P4-T16 as `design/decisions/2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md`. |
| DEP-P4-C | Design 11.4 (`:3557-3559`) names "cosmos's two documented failure cases (a 163-node country-graph shape and 1,024 points in one finest cell)"; the repository has no copy of the country outline, so the fixture `polyline163` is a seeded irregular closed polygon of 163 nodes (positions supplied), the `onecell1k` fixture is exact. | The failure mode the shape exercises -- a thin, curved distribution that leaves most finest cells empty and a few full -- is what an irregular closed polyline reproduces; the coordinates themselves are not in any document this repository holds. No decision record: a fixture substitution, named in the G4 record. |
| DEP-P4-D | Design 7.3 (`:1741`) leases the sort scratch from the pool per batch; P4 makes it model-owned (PD-11). | `Kernel.bind` caches bind groups by buffer identity (`kernel.ts:106`); a pool lease may hand a different buffer each batch, so G2-G4 would rebuild their bind groups every batch. The resident cost is 16 B/node (16 MB at 1M nodes) against 7.3's 65 B/node. Recorded by Task P4-T16 as `design/decisions/2026-09-20-sort-scratch-is-model-owned.md`. |
| DEP-P4-E | Design 6 (`:1581-1583`) lists `scan` among the kernels with a subgroup variant (D16 `:213` states the runtime-subgroup-size rule for every such kernel and names none); P4's scan has none (PD-3). | Exact u32 addition makes the twin bitwise identical to the feature variant, so the in-process twin test of 11.3 would prove nothing; the cost is one extra barrier round per level. Recorded by Task P4-T16 as `design/decisions/2026-09-20-scan-has-no-subgroup-variant.md`. |
| DEP-P4-F | Design 13 (`:4224`) orders `P-ENV -> P4`; this plan runs P4 on the current environment (0.2). | P-ENV's purpose was the hosted runner image; the lane moved to machine.dev (`gpu.yml:16-31`) and runs `node-limits` today. No decision record: a sequencing choice, not a contradiction; P-ENV stays scheduled (0.7). |
| DEP-P4-G | Design 7.7 G6 (`:1977`) fixes the far-field loop bounds "compile-time per `override LEVELS`"; G6 reads `P.levels` / `P.gridMax` from the uniform and declares no `LEVELS` override (PD-16). | The loops are `for` over a runtime bound; nothing in them needs a pipeline per level count, and an override would put the level count into the pipeline key so every resize that changes `G` (a `gridMax` change, a 2D / 3D switch) recompiles G6. The cost is one uniform load per loop bound. It changes the kernel's override set and its compile-matrix count (1, then 3 with `LAW`). Recorded by Task P4-T16 as `design/decisions/2026-09-20-far-field-levels-are-a-uniform.md`. |
| DEP-P4-H | Design 7.7 G3 (`:1972`) zeroes `cellHist` with `encoder.clearBuffer(cellHist)` "(no dispatch)"; P4 zeroes it with a `fill` dispatch inside the iteration's pass (PD-12). | K1 reads the previous iteration's `cellHist[cells]` at the top of the pass, so the clear must follow K1 and precede the histogram INSIDE the iteration; `clearBuffer` is an encoder command outside any pass and would split the iteration's pass around it (and `CommandBatch` has no clear method, 0.1). One `fill` dispatch over `cells + 2` words is the price. Recorded by Task P4-T16 as `design/decisions/2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md`. |
| DEP-P4-I | Design 7.7 names G3 `grid-cell-hist` (`:1972`) and G4a `grid-hub-finalize` (`:1974`); P4 registers neither id: G3 is the T3 `histogram` kernel over `cellKey`, G4a is the T1 `indirect-finalize` over `hubCounters[0]`. | Both design kernels are the general primitive applied to a grid buffer, with no grid-specific line; a second id would be a second body to sabotage, pin and record for the same text (rule (b)). The grid's dispatch sequence and its dispatch count are the design's. No decision record: a naming choice with no behaviour behind it, named in the G4 record. |
| DEP-P4-J | Design 6 row 3 (`:1570`) asks for "Kahan compensation in the workgroup-per-row loop" of `segmentedReduce`; the three TIER 2 loops (`segmented-reduce`, `fa2-attraction`, `spmv-pull`, T5) fold plainly. | `docs/decisions/G7.md:121-124`: the pull's Kahan sum, kept alive with a `select`, was folded away by Metal's compiler on the hosts lane while lavapipe and NVIDIA honoured it, so the compensated kernel had two different floors on two adapters; the plain fold has no identity a compiler can simplify, and every tier bound is a derived noise-floor tolerance (11.9) rather than a fixed one, so the lower precision is measured, not assumed. Recorded by Task P4-T16 as `design/decisions/2026-09-20-workgroup-row-tiers-fold-without-kahan.md`. |
| DEP-P4-K | Design 7.7 G7 (`:1978`) scales a node's OWN over-full cell by `(count - 1) / (nearMax - 1)` "with the node itself excluded from both counts"; P4's G7 and its f64 oracle scale every over-full cell by `others / sampled` with the REALISED sample size (PD-15): `sampled` is `nearMax - 1` only when the node's own sorted slot fell inside its window, else `nearMax`. | The window `[h, h + nearMax) mod count` holds the node itself with probability `nearMax / count`, not always; the design's denominator assumes it always does and over-scales the own cell by `nearMax / (nearMax - 1)` whenever it does not. The realised-sample scale is a conditional (ratio) estimator, not exactly unbiased per pair -- the node's inclusion and a nearby neighbour's inclusion in one window are correlated -- so the G4 record's unbiasedness item (the mean over 32 seeded iterations within 5 %) is the check, never an argument. No decision record: a denominator correction inside the estimator the design names, named in the G4 record. |
| DEP-P4-L | Design 7.7 G4b (`:1975`) binds five storage buffers; P4's `grid-centroid-hub` binds six: the design's five plus `hubCount`, a read-only `array<u32>` view of `hubCounters` (PD-13). | G4b's `wg_reduce_vec4` must be reached in uniform control flow (`CLAUDE.md` WGSL rules), so a workgroup past `hubCount` reduces zeros under `valid = h < hubCount[0]` instead of returning early, and the count it reads is a binding of its own; `test/kernel/bind-group-budget.test.ts` pins 6 (T9). No decision record: a binding-table difference with no behaviour behind it, named in the G4 record. |
| DEP-P4-M | `GpuLayoutTuning.nearMax` (design 3.3 `:869-870`, a published option) is accepted as "an integer >= 1" by the tree today (`forceatlas2.ts:405`); P4 tightens `resolveLayoutTuning` to "an integer >= 2" (PD-15, T10) and rejects `nearMax: 1` with `E_INVALID_ARGUMENT`. | The design's own near-field estimator scales a node's own over-full cell by `(count - 1) / (nearMax - 1)` (7.7 G7 `:1978`), which is undefined at `nearMax = 1`, and PD-15's realised-sample form needs `sampled >= 1`; the value 1 was never meaningful (one sampled entry per cell, possibly the node itself). A contract change on a published option: named in the G4 record and in the commit body of T10; no decision record, the design's formula already requires it. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| P4 Scale: grid pyramid + degree tiers | `webgpu-graph-algorithms/` | P3, M8b, P5 -- MET (0.2) | `exclusiveScan`, `histogram` / `countingSortByKey`, `radixSort`, the indirect finalize + `planIndirect` + `Kernel.dispatchIndirect`; the three tiers of `segmentedReduce` / `spmvPull` / K2 over `degreeOrder()`; windowed execution for `degree` / `segmentedReduce`; G1-G7 with G4a / G4b, `RepulsionGrid`, the grid path of all three models, `repulsion: "auto"`, the grid stats and options, `calibrateLayout`; the exact-vs-grid fixtures and suites; the six `node-limits` files; `layout-grid` with T-6 / T-7, T-5 at 100k, the crossover re-check; the P4 sabotage / inspect / noise rows; seven decision records; the G4 record | design G4 | design 13 row P4 says 10-14 ed; this plan's seventeen tasks sum to 21.75 ed (the table below) |

Critical path: P4-T1 -> T2 -> T4 -> T8 -> T9 -> T10 -> T11 -> T12 -> T14 -> T17, with T5 -> T6 / T7 feeding T10 from the side.

**Per-task estimate, and the size this plan actually is.** The design's P4 cell says "10-14 ed"; rule (e) (`:4198-4199`) defines ed for one engineer familiar with the code base, WGSL phases carrying the most uncertainty:

| Task | What it is | ed |
| --- | --- | --- |
| P4-T1 | `planIndirect`, the finalize kernel, `dispatchIndirect`, the P4 phase tag, three sabotage rows, a u32 noise row | 1.0 |
| P4-T2 | `exclusiveScan`: two bodies, the recursive driver, the oracle, the ladder test, six sabotage rows, a u32 noise row | 1.5 |
| P4-T3 | `histogram` and `countingSortByKey`: two bodies, the driver, the hot-bucket oracle tests, six rows, a u32 noise row | 1.0 |
| P4-T4 | `radixSort`: two bodies, the pass driver, the stable-sort test over four widths, six rows, a u32 noise row | 1.5 |
| P4-T5 | the mid / high tiers of `segmented-reduce`, `fa2-attraction` and `spmv-pull`: three body rewrites, the five `Fa2Params` fields the K2 body reads, the planners, the hub-fixture tests, twelve tier rows, the tier writer cases | 1.5 |
| P4-T6 | the K2 tiers inside the layout: `perm` binding, the tier boundaries in `paramsFor`, the three K2 dispatches in every model, the kernel-level window proof, six K2 rows, the parity re-run | 1.0 |
| P4-T7 | windowed execution: the residency, `windowBinding`, the `degree` / `segmentedReduce` window loops, the faked-limit tests, two rows | 1.5 |
| P4-T8 | the grid build 1: `GridSpec`, G1, G3, the sort, `cellStart`, the JS grid oracle, six rows, the keys / starts checks | 1.5 |
| P4-T9 | the grid build 2: G4, G4a, G4b, G5, the pyramid, the hub cell, nine rows, the centroid noise rows | 1.5 |
| P4-T10 | G6, G7, K1's grid block, `RepulsionGrid`, the FA2 model's grid path, `ForceSimulation`'s grid wiring, the stats, options and behaviour suites | 2.0 |
| P4-T11 | the exact-vs-grid parity helper, the field oracles, the stage suites, the exact-vs-grid suite, the noise members and the recording run | 2.0 |
| P4-T12 | the G6 / G7 sabotage rows, the three K1 grid-block rows and the suite, the G4 statistical items (expansion, distributional, unbiasedness, the isolated settle, 3D, saturation, determinism) | 1.0 |
| P4-T13 | `LAW` on G6 / G7, the FR / spring grid tier, twelve `LAW` rows | 1.0 |
| P4-T14 | `calibrateLayout`, `layout-grid`, T-5 at 100k, T-6 / T-7, the crossover re-check, `layout-run --repulsion` | 1.5 |
| P4-T15 | the six `node-limits` files | 1.0 |
| P4-T16 | seven decision records and three index edits | 0.75 |
| P4-T17 | the full green check on two adapters, the browser and the lane, and the G4 record | 0.5 |
| | **total** | **21.75** |

21.75 ed against the design's 10-14. The gap is not padding: the cell predates rule (f) (three sabotage rows, an `inspect()` comparison and a noise row per kernel -- thirteen new kernels and four branch families), it predates the P5 plan's hand-over of the `LAW` axis to this phase (T13), and it counted the six `node-limits` files, `calibrateLayout` and the crossover re-check inside the same cell. The owner's call, in the PR: accept 21.75, or split -- P4-T1..T9 (the primitives, the tiers, the windows and the grid build, each green against its oracle but no G4 layout item closed) as one PR, and P4-T10 onward as the PR that closes G4.

### 0.7 What P4 does NOT do

- It does not build `compact` / `dedupe` (DEP-P4-A), option B (the cluster tree, Q-5: default no, decided in G4.md section 7), a near-field force bound (D25) or an adaptive `nearMax` (R-24: default neither, measured and decided in G4.md section 7), or the position permutation of note 03 8.3 item 5 (default no).
- It does not execute windows for the layout kernels or for `spmvPull` (DEP-P4-B), and it does not add the third partials level for `n > MAX_1D_ITEMS` (16,776,960 nodes; `force-simulation.ts:858-869` stays).
- It does not switch PageRank / HITS / eigenvector / Katz to the in-degree tiers: `prepareSpmvPull` accepts `tiers` after T5, and the algorithms keep passing `null` until a hub-heavy `pagerank` benchmark shows the thread-per-row hub row on the critical path (the reversal condition of `design/decisions/2026-09-19-spmv-tier-zero-only.md`).
- It does not touch `algorithms/`, `layout/`, `graphty-element/` or `graphty/`; the app's `calibrateLayout` wiring is P12 (design 13 row P12, `:4219`).
- It does not change any P1 / P3 / P7 / P5 sabotage row's NAME or any committed FA2 / FR / SE tolerance; the K2 rows of P3 and P5 keep their `find` strings except the one P3 row whose line the windowed rebase rewrites (P4-T5 Step 3 names it).
- It does not run P-ENV (DEP-P4-F) and does not touch `webgpu-graph-algorithms/project.json` or any workflow file.

---

## Phase P4: the scale layer

**Entry criteria:** P3, M8b and P5, all MET (0.2). Work in the worktree `.worktrees/gpu-scale-layouts` on branch `feat/gpu-p5-p4` (created by the owner); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms` except the ONE noted in P4-T16 (type `docs`, no scope); the phase lands as ONE PR (or the two of 0.6) carrying the `gpu` label so `gpu.yml` runs `node` AND `node-limits` on it.

**Step 0 of the phase.** Export the two path variables FIRST -- every Run line in this document begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/gpu-scale-layouts
    export PKG=$WT/webgpu-graph-algorithms

then, if `$PKG/node_modules` or `$WT/graph-format/dist` or `$WT/layout/dist` is missing, `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,layout` (`webgpu-graph-algorithms/CLAUDE.md:151-156`). Re-export both in any new shell. `mkdir -p $PKG/tmp/p4` once.

**The local run environments (`webgpu-graph-algorithms/CLAUDE.md:287-294`), used verbatim in every task's Run lines:**

    # NVIDIA (the hardware lane the parity numbers come from; the RTX 4070 SUPER)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task P4-T1: `planIndirect`, the indirect finalize kernel and `Kernel.dispatchIndirect`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 5.4 lines 1464-1486 (the one-workgroup finalize that turns a device-side count into `(x, y, 1)` "using the same rule as `plan1d`" and "writes the count into a STORAGE scalar the next round reads"; same-pass write-then-indirect-read verified on Dawn 0.4.0), 5.2 lines 1395-1427 (`planIndirect` in the export list, the 16,776,960 rule), 7.7 G4a (`:1974`: "the 5.4 finalize: `hubCount` -> indirect `(x, y, 1)`"), 11.9 items 1 and 4.

**Files:**
- Modify: `webgpu-graph-algorithms/src/kernel/dispatch.ts` (`planIndirect` `:150-160`), `webgpu-graph-algorithms/src/kernel/kernel.ts` (`dispatchIndirect` after `dispatch` `:305`), `webgpu-graph-algorithms/src/wgsl/` -- Create `indirect-finalize.wgsl.ts`; `webgpu-graph-algorithms/src/kernels.ts` (PD-1 region T1: the `"indirect-finalize"` member of `KernelId` `:39-56`, `"P4"` in `KernelEntry.phase` `:71`, the `INDIRECT_PARAMS` block after `WCC_PARAMS` `:235-244`, the `INDIRECT_FINALIZE` entry after `WCC_SAMPLE` `:561-575`, the `REGISTRY` row `:586-604`, the header sentence `:9-10`), `webgpu-graph-algorithms/test/kernel/dispatch.test.ts` (`:163-166` becomes the real test), `webgpu-graph-algorithms/test/kernel/registry.test.ts` (PD-1 region T1: the `"P4"` phase at `:54`, one `TABLE` row), `webgpu-graph-algorithms/test/kernel/bind-group-budget.test.ts` (PD-1 region T1: `"indirect-finalize": 2` in `STORAGE_COUNTS` `:19-37`), `webgpu-graph-algorithms/test/kernel/wgsl-compile.test.ts` (PD-1 region T1: `expect(counts.get("indirect-finalize")).toBe(1)` beside `:52-60`), `webgpu-graph-algorithms/test/helpers/override-matrix.ts` (PD-1 region T1: `P4: 1` in `EXPECTED_CASES_BY_PHASE` `:71-76` and its type, the comment `:64-70`), `webgpu-graph-algorithms/test/helpers/sabotage.ts` (PD-1 region T1: the `"indirect-finalize"` rows in `SABOTAGE` and `INDIRECT_TEST` beside the file constants `:31-40`)
- Create: `webgpu-graph-algorithms/test/kernel/indirect.test.ts`, `webgpu-graph-algorithms/test/sabotage/indirect.test.ts`
- NOT touched: `test/sabotage/coverage.test.ts` (`SABOTAGE_PHASES` gains `"P4"` in T12 only, PD-1), `test/noise-floor.test.ts` (T11 adds every P4 member)

**Interfaces:**
- Consumes: `grid()`, `assertCount`, `assertWorkgroupSize` (`dispatch.ts:37-95`), `BoundKernel` / `Kernel.dispatch`'s offset logic (`kernel.ts:17-21,256-305`), `UniformBlock.define` (`struct-block.ts:177`), the prelude's `MAX_WORKGROUPS_PER_DIM`, `fill` (mode 1 iota, `kernels.ts:96-102,310-320`), `uploadBuffer` / `scratchBuffer` / `bindingOf` / `readU32` (`test/helpers/device.ts:26-49`), `withSabotage` / `ratioOf` / `mergeReports` / `assertCheckPasses`, `writeNoiseFixture` / `adapterClass`.
- Produces: `planIndirect(count, wg, caps): DispatchPlan` (real); `Kernel.dispatchIndirect(pass, bound, args: Binding, slot: number, dynamicOffsets?: readonly number[]): void`; `INDIRECT_PARAMS` (`IndirectParams`: `countIndex` @0, `wg` @4, `slot` @8, `pad0` @12; 16 B); the `indirect-finalize` entry (2 storage bindings: `counters` read-only `array<u32>`, `args` read-write `array<u32>`; `P: IndirectParams`; no overrides; `needs: []`; phase `"P4"`); `INDIRECT_ARGS_STRIDE = 16`, exported from `kernel.ts` beside `dispatchIndirect` (the slot stride is a fact of the args layout the prelude never needs, so it is not a `constants.ts` entry).

**PLAN DECISION PD-1 (the shared files).** `src/kernels.ts` is THE registry (`CLAUDE.md:56`) and its five test mirrors pin it entry by entry; thirteen new entries spread over eight tasks cannot each own the file, and the primitives / models the tiers, the windows and the grid extend in turn cannot either. Each task therefore edits ONLY the regions its Files list names, and every region is disjoint: the union member, the block, the entry, the `REGISTRY` row, the `TABLE` row, the `STORAGE_COUNTS` row, the per-kernel compile pin, the `P4` case-count increment (each task states the running P4 total), the sabotage rows under the new id, the one member added to a shared primitive or model. A task never edits another task's region; 8.3 tables every shared file with its owners. `"P4"` is added to `KernelEntry.phase` here (a union member) and to `SABOTAGE_PHASES` in T12 (the coverage test would otherwise demand rows for kernels that do not exist yet).

**PLAN DECISION PD-2 (the args slot).** `dispatchWorkgroupsIndirect` reads three u32 at a 4-byte-aligned offset; the design's finalize also "writes the count into a STORAGE scalar the next round reads". One 16-byte slot per dispatch, `(x, y, 1, count)`, gives both in one write and keeps every slot 16-byte aligned for a `vec4u` reader. `Kernel.dispatchIndirect` takes the args BINDING and the slot index and computes `args.offset + 16 * slot`; a slot beyond the binding is `E_INVALID_ARGUMENT`. For any u32 `count` and `wg >= 64`, `groups <= 67,108,864` and `y <= 1,025` (`ceil(67,108,864 / 65,535)`), far under the 65,535 limit, so the kernel needs no `y` clamp and the host twin never throws `E_TOO_LARGE` for a u32 count (it rejects a non-u32 count as `E_INVALID_ARGUMENT` before planning).

- [ ] **Step 1: Write the failing tests**

Replace `test/kernel/dispatch.test.ts:163-166` with:

```ts
    it("planIndirect is plan1d's rule on a count: 1D up to 16,776,960 items, then x = 65,535 with y = ceil(groups / 65,535); count 0 -> x 0; a non-u32 count -> E_INVALID_ARGUMENT", () => {
        for (const count of [0, 1, 255, 256, 257, 4097, MAX_1D_ITEMS, MAX_1D_ITEMS + 1, 4_000_000]) {
            expect(planIndirect(count, WG, CAPS_SPEC_DEFAULT)).toEqual(plan1d(count, WG, CAPS_SPEC_DEFAULT));
        }
        expect(planIndirect(0xffffffff, WG, CAPS_SPEC_DEFAULT).y).toBe(257);
        expect(catchError(() => planIndirect(2 ** 32, WG, CAPS_SPEC_DEFAULT)).code).toBe("E_INVALID_ARGUMENT");
        expect(catchError(() => planIndirect(-1, WG, CAPS_SPEC_DEFAULT)).code).toBe("E_INVALID_ARGUMENT");
    });
```

Create `test/kernel/indirect.test.ts` (node project; `requireGpu` / `acquire` from `test/setup/gpu.ts`) with, each its own `it`:
1. the finalize kernel writes, for the nine counts `[0, 1, 255, 256, 257, 16_776_960, 16_776_961, 4_000_000, 0xffffffff]` uploaded as one `counters` array and nine slots of one 144-byte `args` buffer (`INDIRECT | STORAGE | COPY_SRC | COPY_DST`), exactly `(planIndirect(c).x, planIndirect(c).y, 1, c)` per slot, read back as `Uint32Array(36)` (slot 8, the top of the u32 range, is `(65535, 257, 1, 0xffffffff)`: the kernel's ceil must not wrap where `count + wg - 1` would); run twice, `expectBitwiseEqual` first;
2. an indirect dispatch runs exactly `count` items: `fill` with `mode 1` (iota) and `FillParams.count = 4_000_000` over a 4M-word buffer pre-filled with `0xdeadbeef` through `Kernel.dispatchIndirect(pass, fillBound, argsBinding, 7)` (slot 7 is the 4,000,000 count) -> words `[0, 4M)` equal their index, none is the poison; the same with slot 0 (count 0) leaves every poison word;
3. a slot beyond the binding (`slot * 16 + 16 > args.size`) is `E_INVALID_ARGUMENT { argument: "slot" }`; a `BoundKernel` of another kernel is `E_INVALID_ARGUMENT { argument: "bound" }` (the `dispatch` rule);
4. `CommandBatch.dispatches` counts the indirect dispatch (record through a `CommandBatch`: `batch.pass("x")`, one `dispatchIndirect`, `expect(batch.dispatches).toBe(1)`);
5. the writer case, named `... (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("indirect-finalize", "counts9", adapterClass(ctx.caps), args, "u32")`.

Create `test/sabotage/indirect.test.ts`: for each row of `SABOTAGE["indirect-finalize"]`, `withSabotage("indirect-finalize", row, ctx => ...)` runs case 1's comparison on the fresh context and asserts `mergeReports(...).worst >= row.minFactor` through a bitwise `CheckReport` (`ratioOf(|a - b|, 0)` per word: any mismatch is `Infinity`); plus the find-once / unique-name / `test`-file-exists loop of `test/sabotage/coverage.test.ts:72-80` applied to these rows.

Run: `cd $PKG && pnpm exec vitest run --project=node test/kernel/dispatch.test.ts test/kernel/indirect.test.ts`
Expected: FAIL (`planIndirect` throws `E_UNSUPPORTED`; `Cannot find module '../../src/wgsl/indirect-finalize.wgsl.js'` through the registry import).

- [ ] **Step 2: `planIndirect` and `dispatchIndirect`**

Replace `dispatch.ts:149-160` (the stub AND its JSDoc, whose `/**` opens at `:149`) with:

```ts
/**
 * P4 (spec 5.4): the (x, y, 1) args the device-side finalize kernel writes for a count -- plan1d's rule applied to a
 * u32 count through the same grid() as plan1d and plan2d, so the host twin and the kernel cannot drift; the kernel
 * (src/wgsl/indirect-finalize.wgsl.ts) mirrors exactly this arithmetic. `items` of the plan is the count. A count
 * outside [0, 2^32) is E_INVALID_ARGUMENT (the device holds it as a u32); for any u32 count y <= 1,025, so
 * E_TOO_LARGE is unreachable here.
 * @param count - the device-side count (a u32)
 * @param wg - the workgroup size (a power of two)
 * @param caps - the capability table
 * @returns the plan
 */
export function planIndirect(count: number, wg: number, caps: PlanCaps): DispatchPlan {
    assertCount("count", count);
    if (count > 0xffffffff) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `count must fit a u32, got ${count}`, {
            argument: "count",
            value: count,
            expected: "an integer in [0, 2^32)",
        });
    }
    assertWorkgroupSize(wg);
    return grid(Math.ceil(count / wg), count, caps);
}
```

In `kernel.ts` add after `dispatch` (`:305`):

```ts
    /**
     * setPipeline + the bind groups exactly as dispatch(), then dispatchWorkgroupsIndirect(args.buffer, args.offset +
     * INDIRECT_ARGS_STRIDE * slot) (spec 5.4): the (x, y, 1) of the slot were written by the indirect-finalize kernel
     * earlier in the same pass. A slot beyond the binding is E_INVALID_ARGUMENT.
     * @param pass - the open compute pass
     * @param bound - a BoundKernel of THIS kernel
     * @param args - the args buffer range (usage INDIRECT | STORAGE)
     * @param slot - the 16-byte slot index inside the range
     * @param dynamicOffsets - one byte offset per entry of bound.dynamicGroups
     */
    dispatchIndirect(
        pass: GPUComputePassEncoder,
        bound: BoundKernel,
        args: Binding,
        slot: number,
        dynamicOffsets?: readonly number[],
    ): void {
        if (!Number.isInteger(slot) || slot < 0 || (slot + 1) * INDIRECT_ARGS_STRIDE > args.size) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${this.spec.id}: args slot ${slot} is outside the binding`, {
                argument: "slot",
                value: slot,
                expected: `0 <= slot < ${Math.floor(args.size / INDIRECT_ARGS_STRIDE)}`,
            });
        }
        this.setUp(pass, bound, dynamicOffsets);
        pass.dispatchWorkgroupsIndirect(args.buffer, args.offset + INDIRECT_ARGS_STRIDE * slot);
    }
```

and factor the checks and `setPipeline` / `setBindGroup` lines of `dispatch` (`:262-303`, everything before `pass.dispatchWorkgroups`) into `private setUp(pass, bound, dynamicOffsets): void` that both call (the `plan.x === 0` early return stays in `dispatch` before the call). Export `export const INDIRECT_ARGS_STRIDE = 16;` with the JSDoc "Bytes of one indirect args slot: (x, y, 1, count) as four u32 (spec 5.4; P4 PD-2)".

- [ ] **Step 3: The body and the registry entry**

Create `src/wgsl/indirect-finalize.wgsl.ts`:

```ts
/**
 * The `indirect-finalize` kernel body (spec 5.4; P4-T1): one lane turns the device-side count `counters[P.countIndex]`
 * into the `(x, y, 1)` of an indirect dispatch by plan1d's rule (spec 5.2) and writes it with the count into the
 * 16-byte slot `P.slot` of `args` (PD-2). No barrier follows the early return of the other lanes. Body only (spec 3.5,
 * D9); the text is normative: the P4 sabotage rows are textual edits of it.
 */
export const indirectFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn indirect_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                   // one lane; no barrier follows (3.5 rule 1)
    let count = counters[P.countIndex];
    let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);   // ceil(count / wg) without the u32 wrap of (count + wg - 1) above 2^32 - wg: plan1d's rule (5.2) for ANY u32 count
    var x = groups;
    var y = 1u;
    if (groups > MAX_WORKGROUPS_PER_DIM) {                         // the 2D split; y <= 1,025 for any u32 count
        x = MAX_WORKGROUPS_PER_DIM;
        y = (groups + MAX_WORKGROUPS_PER_DIM - 1u) / MAX_WORKGROUPS_PER_DIM;
    }
    let base = 4u * P.slot;                                        // 16-byte slots: (x, y, 1, count) (PD-2)
    args[base] = x;
    args[base + 1u] = y;
    args[base + 2u] = 1u;
    args[base + 3u] = count;
}
`;
```

In `src/kernels.ts`: add `| "indirect-finalize"` to `KernelId`; make `phase` `"P1" | "P2" | "P3" | "P4" | "P7"`; add after `WCC_PARAMS`:

```ts
/** `IndirectParams` (uniform, 16 B; spec 5.4): `countIndex` @0 (the word of `counters` holding the count), `wg` @4 (the consumer's workgroup size), `slot` @8 (the 16-byte args slot to write), `pad0` @12. */
export const INDIRECT_PARAMS: UniformBlock = UniformBlock.define("IndirectParams", [
    ["countIndex", "u32"],
    ["wg", "u32"],
    ["slot", "u32"],
    ["pad0", "u32"],
]);
```

and after `WCC_SAMPLE`:

```ts
/** `indirect-finalize` (spec 5.4; P4-T1): the one-lane count -> (x, y, 1, count) finalize; 2 storage bindings. */
const INDIRECT_FINALIZE: KernelEntry = {
    id: "indirect-finalize",
    body: indirectFinalizeWgsl,
    entryPoint: "indirect_finalize",
    bindings: [
        decl(1, 0, "counters", "storage-ro", "array<u32>"),
        decl(1, 1, "args", "storage", "array<u32>"),
        decl(2, 0, "P", "uniform", "IndirectParams"),
    ],
    overrideDecls: [],
    uniforms: [INDIRECT_PARAMS],
    needs: [],
    snippetSlots: [],
    phase: "P4",
};
```

with `"indirect-finalize": INDIRECT_FINALIZE,` in `REGISTRY` and the import beside the other bodies. Header sentence (`:9-10`): "P4-T1 adds indirect-finalize; the other P4 entries follow, one task each (the P4 plan, PD-1)". Registry-test mirrors: `registry.test.ts` phase union + a `TABLE` row (`entryPoint: "indirect_finalize"`, the two bindings, `uniforms: [INDIRECT_PARAMS]`, `needs: []`, `phase: "P4"`, `storageCount: 2`); `bind-group-budget.test.ts` `"indirect-finalize": 2`; `wgsl-compile.test.ts` `expect(counts.get("indirect-finalize")).toBe(1)`; `override-matrix.ts` `EXPECTED_CASES_BY_PHASE` gains `P4: 1` (type `Record<"P1" | "P2" | "P3" | "P4" | "P7", number>`; the comment lists "P4 = indirect-finalize 1" and every later task appends its term and raises the number).

- [ ] **Step 4: The sabotage rows**

Append to `SABOTAGE` in `test/helpers/sabotage.ts` (with `const INDIRECT_TEST = "test/kernel/indirect.test.ts";` beside the constants at `:31-40`):

```ts
    "indirect-finalize": Object.freeze([
        { name: "ceil-dropped", find: "let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);", replace: "let groups = count / P.wg;", minFactor: 10, test: INDIRECT_TEST },
        { name: "split-never-taken", find: "if (groups > MAX_WORKGROUPS_PER_DIM) {", replace: "if (groups > U32_MAX) {", minFactor: 10, test: INDIRECT_TEST },
        { name: "slot-stride-twelve", find: "let base = 4u * P.slot;", replace: "let base = 3u * P.slot;", minFactor: 10, test: INDIRECT_TEST },
    ]),
```

Every `find` occurs exactly once in the body (the find-once loop of Step 1's sabotage file checks it).

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/kernel test/sabotage/indirect.test.ts test/sabotage/coverage.test.ts`
Expected: PASS; the compile matrix reports one more case (P4 total 1); `coverage.test.ts` untouched by the new phase (not in `SABOTAGE_PHASES`) but its find-once loop over `Object.keys(SABOTAGE)` covers the new rows.

- [ ] **Step 5: Green check on both adapters**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/kernel test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80; case 2 prints nothing (4M words checked in a loop, not printed).

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add planIndirect, the indirect finalize kernel and dispatchIndirect` through `tools/commit-changes.sh`. The body records PD-1 and PD-2.

---

### Task P4-T2: `exclusiveScan`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 2 (`:1569`: `exclusiveScan(batch, src, count, out, totalOut?)` (u32); reduce-then-scan: (a) a workgroup scan of 256 writing block sums, (b) a scan of the block sums, recursive when > 256 blocks, (c) an add-back; no decoupled look-back), 6 determinism policy (`:1599-1604`: scan bitwise reproducible), 11.3 (sizes 0, 1, 255, 256, 257, 4097; 16,776,960 and +1 in `node-limits`), 11.9 items 1 and 4.

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/scan-block.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/scan-add.wgsl.ts`, `webgpu-graph-algorithms/src/primitives/scan.ts`, `webgpu-graph-algorithms/test/oracle/scan.ts`, `webgpu-graph-algorithms/test/primitives/scan.test.ts`, `webgpu-graph-algorithms/test/sabotage/scan.test.ts`
- Modify (PD-1 regions T2): `src/kernels.ts` (`"scan-block" | "scan-add"` in `KernelId`, `SCAN_PARAMS` after `INDIRECT_PARAMS`, two entries after `INDIRECT_FINALIZE`, two `REGISTRY` rows), `test/kernel/registry.test.ts` (two `TABLE` rows), `test/kernel/bind-group-budget.test.ts` (`"scan-block": 3, "scan-add": 2`), `test/kernel/wgsl-compile.test.ts` (two pins of 1), `test/helpers/override-matrix.ts` (`P4: 3`), `test/helpers/sabotage.ts` (six rows under the two ids, `SCAN_TEST`), `webgpu-graph-algorithms/test/oracle/oracles.test.ts` (three hand-computed scan cases)
- NOT touched: `src/primitives/reduce.ts` (the `ReduceScope` shape is reused as is)

**Interfaces:**
- Consumes: `ReduceScope` (`reduce.ts:34-44`: `device`, `caps`, `pipelines`, `pool`, `workgroupSize`, `scratch(bytes, label)`, `params(block, values)`), `plan1d`, `kernelSpec`, `Kernel`, `Binding`; `testReduceScope` (`test/helpers/segmented-reduce.ts:69-104`), `reduceInput`-style seeded inputs (`test/helpers/reduce-input.ts`).
- Produces: `SCAN_PARAMS` (`ScanParams`: `count` @0, `pad0` @4, `pad1` @8, `pad2` @12); the `scan-block` entry (3 storage: `src` ro, `out` rw, `blockSums` rw; `P: ScanParams`) and `scan-add` entry (2 storage: `out` rw, `blockOffsets` ro; `P`); `prepareScan(scope): Promise<ScanPlanner>` with `ScanPlanner.record(pass, src: Binding, count: number, out: Binding): { readonly binding: Binding; readonly index: number }` (the RETURN VALUE is where the total landed, PD-3 and Step 4; there is no `totalOut` parameter, and T3 calls the four-argument form) and `readonly lastDispatches: number`; `scanOracle(values: Uint32Array): { out: Uint32Array; total: number }`.

**PLAN DECISION PD-3 (Hillis-Steele, no subgroup variant).** The design offers "Hillis-Steele in workgroup memory, or `subgroupExclusiveAdd` + cross-subgroup fixup". u32 addition is exact whatever the order, so a subgroup variant would produce bitwise the same words as the workgroup twin and the in-process twin comparison of 11.3 could not distinguish a broken variant from a working one; the scan's cost inside the grid build (over `cells + 2` entries, at most 2,097,154, and over the radix histogram table, `256 x groups`) is dominated by the sort's scatter. `needs: []`, one body per kernel. DEP-P4-E records the departure from D16.

The recursion (host side, all inside one compute pass): level 0 scans `count` items into `out` and `sums0[B0]` (`B0 = ceil(count / WG)`); while the current level has more than one block, the next level scans `sums_L` (count `B_L`) into `offsets_L` (exclusive) and `sums_{L+1}`; when a level has ONE block its `sums` entry is the total. Then, from the top down, `scan-add` adds `offsets_L[g]` to every element of block `g` of level L's output (for level 0 the elements of `out`). The design's optional `totalOut` is served by the RETURN VALUE of `record()`: the location `{ binding, index }` of the top level's one `sums` word inside the planner's own scratch, valid until the next `record()`, which a caller reads in the same pass or copies with `batch.copy` afterwards (a 4-byte binding of the caller's choosing cannot be bound below the 256-byte alignment, and neither `countingSortByKey` nor the grid needs the total anywhere else). `ScanParams` is `count` plus three pads.

- [ ] **Step 1: The oracle and its pure cases**

Create `test/oracle/scan.ts`: `scanOracle(values)` -- a sequential exclusive prefix sum in a `Uint32Array` with `Number` arithmetic modulo 2^32 (`(acc + v) % 4294967296`; the kernel wraps too) and the total. Add three cases to `test/oracle/oracles.test.ts`: `[3, 1, 4, 1, 5]` -> `[0, 3, 4, 8, 9]` total 14; the empty array -> empty, total 0; two values summing past 2^32 wrap.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/oracles.test.ts`
Expected: PASS (no GPU).

- [ ] **Step 2: Write the failing tests**

Create `test/primitives/scan.test.ts` (the shape of `test/primitives/reduce.test.ts`: `testReduceScope(ctx)` for the scope, a pass on a plain encoder, `readU32`), each its own `it`: (1) the row ladder `[0, 1, 255, 256, 257, 4097, 65537, 2 ** 20]` scaled by `gpuScale()` (never below the literal for sizes <= 4097; the scaled sizes keep at least three levels: `65537` and `2^20` scale to `1311` and `20972` on lavapipe, which still needs two levels) of seeded random u32 in `[0, 2^16)` (`reduceInput`) -> `out` equals `scanOracle` bitwise and the returned total location holds the oracle's total; run twice, `expectBitwiseEqual` first; (2) all-equal values (`7` everywhere, 4097 items): `out[i] === 7 i`; (3) `lastDispatches` is `1` for `0 < count <= WG` (one block: one `scan-block`, no add-back), `3` for `WG < count <= WG^2` (level 0 block, level 1 block, one add-back), `5` for `WG^2 < count <= WG^3` (the ladder's 2^20 on hardware); (4) `count 0` records nothing and the total is 0; (5) a short `out` (< 4 count bytes) is `E_INVALID_ARGUMENT { argument: "out" }` before anything is recorded; (6) the writer case `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("scan-block", "random1m", cls, out, "u32")` over `2^20` unscaled random values.

Create `test/sabotage/scan.test.ts`: the find-once loop over the two ids' rows and, per row, `withSabotage` running case 1 at count 4097 (three levels on every adapter: 4097 > WG) and asserting the bitwise report's worst `>= minFactor`.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/scan.test.ts`
Expected: FAIL (`Cannot find module '../../src/primitives/scan.js'`).

- [ ] **Step 3: The two bodies**

Create `src/wgsl/scan-block.wgsl.ts`:

```ts
/**
 * The `scan-block` kernel body (spec 6 row 2; P4-T2): an exclusive prefix sum of one WG-wide block of `src` in
 * workgroup memory (Hillis-Steele, log2(WG) rounds of two barriers each, every lane in uniform control flow) into
 * `out`, and the block's inclusive total into `blockSums[group]`. u32 addition is exact in any order, so the
 * output is bitwise the same on every adapter (PD-3). Body only (spec 3.5, D9); normative text.
 */
export const scanBlockWgsl = /* wgsl */ `
var<workgroup> sh: array<u32, WG>;

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    var v = 0u;
    if (i < P.count) { v = src[i]; }
    sh[lid.x] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {                       // Hillis-Steele inclusive scan; uniform: every lane runs every round
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    if (i < P.count) { out[i] = inclusive - v; }                  // exclusive = inclusive - own value
    if (lid.x == WG - 1u) { blockSums[g] = inclusive; }           // the block total (the last lane's inclusive sum)
}
`;
```

Create `src/wgsl/scan-add.wgsl.ts`:

```ts
/**
 * The `scan-add` kernel body (spec 6 row 2 step (c); P4-T2): adds the exclusive prefix of its block's sum,
 * `blockOffsets[group]`, to every element of the block. Body only; normative text.
 */
export const scanAddWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn scan_add(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i >= P.count) { return; }                                  // no barrier follows
    out[i] = out[i] + blockOffsets[g];
}
`;
```

Registry (PD-1 region T2): `SCAN_PARAMS = UniformBlock.define("ScanParams", [["count", "u32"], ["pad0", "u32"], ["pad1", "u32"], ["pad2", "u32"]])`; entries `SCAN_BLOCK` (`src` ro `array<u32>` at (1,0), `out` rw (1,1), `blockSums` rw (1,2), `P` (2,0) `ScanParams`; `needs: []`; phase `"P4"`) and `SCAN_ADD` (`out` rw (1,0), `blockOffsets` ro (1,1), `P`); the mirrors as in T1 (`storageCount` 3 and 2; compile pins 1 each; `P4: 3`).

- [ ] **Step 4: The driver**

Create `src/primitives/scan.ts`:

```ts
/** A prepared exclusive scan (spec 6 row 2): records the level dispatches of one scan into a pass. */
export interface ScanPlanner {
    /** Records the scan of `count` u32 of `src` into `out` (exclusive); returns where the total landed (a word of the planner's scratch, valid until the next record()); nothing for count 0 (the total word is then 0). */
    record(pass: GPUComputePassEncoder, src: Binding, count: number, out: Binding): { readonly binding: Binding; readonly index: number };
    readonly lastDispatches: number;
}
export async function prepareScan(scope: ReduceScope): Promise<ScanPlanner>;
```

`prepareScan` compiles `kernelSpec("scan-block")` and `kernelSpec("scan-add")` once. `record()`: validates `count` (a non-negative integer <= 2^32 - 1), `src.size >= 4 count`, `out.size >= 4 count` (`E_INVALID_ARGUMENT { argument }`), then builds the level list: `levels[0] = { input: src, output: out, count }`, and while `ceil(levels[L].count / WG) > 1`: `sums = scope.scratch(4 * blocks, "scan/sums<L>")`, `offsets = scope.scratch(4 * blocks, "scan/offsets<L>")`, `levels[L + 1] = { input: sums, output: offsets, count: blocks }`; the TOP level's `sums` is a one-word scratch (`scope.scratch(4, ...)` -- the pool rounds up). Dispatch order: `scan-block` for L = 0 .. top (each with `P.count = levels[L].count`, `blockSums = sums_L`), then `scan-add` for L = top - 1 down to 0 (`out = levels[L].output`, `blockOffsets = levels[L + 1].output`, `P.count = levels[L].count`). Every params record comes from `scope.params(SCAN_PARAMS, { count, pad0: 0, pad1: 0, pad2: 0 })`. `lastDispatches = (top + 1) + top`. For `count === 0`: no dispatch, `lastDispatches = 0`, the returned total word is a fresh zeroed scratch (`fill`-free: the pool's `acquire` does not zero; the planner keeps a one-word buffer it zeroes ONCE at prepare time with `device.queue.writeBuffer` and returns for the empty case).

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/scan.test.ts test/kernel/registry.test.ts test/kernel/bind-group-budget.test.ts test/kernel/wgsl-compile.test.ts`
Expected: PASS (six cases; the dispatch counts of case 3 hold on both twins since nothing depends on subgroups).

- [ ] **Step 5: The sabotage rows**

Append to `SABOTAGE` (`const SCAN_TEST = "test/primitives/scan.test.ts";`):

```ts
    "scan-block": Object.freeze([
        { name: "inclusive-not-exclusive", find: "if (i < P.count) { out[i] = inclusive - v; }", replace: "if (i < P.count) { out[i] = inclusive; }", minFactor: 10, test: SCAN_TEST },
        { name: "block-sum-from-lane-zero", find: "if (lid.x == WG - 1u) { blockSums[g] = inclusive; }", replace: "if (lid.x == 0u) { blockSums[g] = inclusive; }", minFactor: 10, test: SCAN_TEST },
        { name: "round-doubling-dropped", find: "for (var s = 1u; s < WG; s = s * 2u) {", replace: "for (var s = 1u; s < WG; s = s * 4u) {", minFactor: 10, test: SCAN_TEST },
    ]),
    "scan-add": Object.freeze([
        { name: "add-back-skipped", find: "out[i] = out[i] + blockOffsets[g];", replace: "out[i] = out[i];", minFactor: 10, test: SCAN_TEST },
        { name: "offset-of-next-block", find: "blockOffsets[g];", replace: "blockOffsets[g + 1u];", minFactor: 10, test: SCAN_TEST },
        { name: "last-block-skipped", find: "if (i >= P.count) { return; }", replace: "if (i >= P.count - WG) { return; }", minFactor: 10, test: SCAN_TEST },
    ]),
```

(`offset-of-next-block`'s `find` is unique: the only other occurrence of `blockOffsets[g]` in the body is the same line, which contains `blockOffsets[g];` once.)

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/scan.test.ts test/sabotage/coverage.test.ts`
Expected: PASS; every row reports `Infinity` (a bitwise miss).

- [ ] **Step 6: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/kernel test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both; coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the exclusiveScan primitive` through `tools/commit-changes.sh`. The body records PD-3 and names DEP-P4-E as the record P4-T16 writes.

---

### Task P4-T3: `histogram` and `countingSortByKey`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 5 (`:1572`: `histogram(batch, keys, count, bins, out)`; `countingSortByKey(batch, keys, count, bins, outIndex, outStart)`; `atomicAdd(&count[key], 1u)`, privatised only for <= 256 bins, a scan, a scatter with a per-bin `atomicAdd` cursor; "order inside a bin is nondeterministic (documented); used by ... the grid build's `deterministic: false` fast path"), 7.7 G3 (`:1972`: `cellHist` by `atomicAdd` over the keys, `cellStart = exclusiveScan(cellHist)` over `cells + 2` entries), 6 determinism policy (`:1599-1604`: counting sort is set-deterministic), 13 row P4 gate ("`histogram` / counting sort equal their oracles with one hot bucket").

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/histogram.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/counting-scatter.wgsl.ts`, `webgpu-graph-algorithms/src/primitives/histogram.ts`, `webgpu-graph-algorithms/test/oracle/histogram.ts`, `webgpu-graph-algorithms/test/primitives/histogram.test.ts`, `webgpu-graph-algorithms/test/sabotage/histogram.test.ts`
- Modify (PD-1 regions T3): `src/kernels.ts` (`"histogram" | "counting-scatter"`, `HIST_PARAMS`, two entries, two rows), `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts` (`"histogram": 2, "counting-scatter": 4`), `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`P4: 5`), `test/helpers/sabotage.ts` (six rows, `HISTOGRAM_TEST`)
- NOT touched: `src/primitives/scan.ts` (consumed)

**Interfaces:**
- Consumes: `prepareScan` / `ScanPlanner` (T2), `ReduceScope`, `fill` (`kernels.ts:310-320`, `FILL_PARAMS`), `plan1d`, the prelude's `linear_id`.
- Produces: `HIST_PARAMS` (`HistParams`: `count` @0, `bins` @4, `pad0` @8, `pad1` @12); entries `histogram` (2 storage: `keys` ro `array<u32>`, `hist` rw `array<atomic<u32>>`; `P: HistParams`) and `counting-scatter` (4 storage: `keys` ro, `start` ro `array<u32>`, `cursor` rw `array<atomic<u32>>`, `outIndex` rw `array<u32>`; `P: HistParams`); `prepareHistogram(scope): Promise<HistogramPlanner>` with `record(pass, keys, count, bins, hist)` (zeroes `hist` with `fill`, then one dispatch) and `prepareCountingSort(scope): Promise<CountingSortPlanner>` with `record(pass, keys, count, bins, scratch: { hist: Binding; cursor: Binding }, outIndex: Binding, outStart: Binding)` (histogram, scan into `outStart`, zero `cursor`, scatter); `histogramOracle(keys, bins)`, `countingSortOracle(keys, bins)` (stable: `outIndex` in key order then index order -- the STABLE reference the set-level test compares by keys).

**PLAN DECISION PD-4 (global atomics only).** The design's privatised path serves "<= 256 bins (radix digits)"; the only such caller is the radix sort, whose per-workgroup DIGIT-MAJOR histogram (T4) is a different kernel with a different output layout. The grid's `cellHist` has up to 2,097,154 bins. One path, one body, no `PRIVATE` override: `histogram` does `atomicAdd(&hist[key], 1u)` in global memory. The `hist` buffer is zeroed by a `fill` dispatch inside the same pass before the histogram dispatch (PD-12 keeps every grid-tier zeroing inside the pass).

- [ ] **Step 1: The oracle and the failing tests**

Create `test/oracle/histogram.ts` (`histogramOracle`: a bucket loop; `countingSortOracle`: `outStart` = the exclusive scan of the histogram, `outIndex` = the indices sorted by key with ties in index order). Add two pure cases to `test/oracle/oracles.test.ts` (keys `[2, 0, 2, 1]` over 3 bins -> hist `[1, 1, 2]`, start `[0, 1, 2]`, index `[1, 3, 0, 2]`; the empty input).

Create `test/primitives/histogram.test.ts`, each its own `it`: (1) `histogram` on `2^20 * gpuScale()` seeded keys in `[0, 4096)` equals the oracle bitwise, twice; (2) ONE HOT BUCKET: every key equal to `bins - 1` (the "1M-entry hub cell" shape at `2^20 * gpuScale()` keys) -> `hist[bins - 1] === count`, every other bin 0, bitwise, twice; bins `1`, `256`, `4096`, `262146` (the 2D grid's `cells + 2` at G = 512); (3) `countingSortByKey`: `outStart` equals the oracle's bitwise; `outIndex` is a permutation of `[0, count)`; `keys[outIndex[j]]` is non-decreasing and equals the oracle's key sequence bitwise (set-deterministic: the index order inside a bin is NOT asserted, `design 6 row 5`); run twice and compare the KEY sequence bitwise; (4) `count 0` records only the fills (the `fill` of `hist` runs so `hist` is zero) and `outStart` is all zero; (5) a `hist` binding shorter than `4 bins` or an `outIndex` shorter than `4 count` is `E_INVALID_ARGUMENT`; (6) the writer case `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("histogram", "random1m-4096", cls, hist, "u32")` from case 1 and `writeNoiseFixture("counting-scatter", "random1m-4096-keys", cls, keySeq, "u32")` from case 3, where `keySeq[j] = keys[outIndex[j]]` (the sorted key sequence: the scatter's set-deterministic output in its bitwise form -- the scatter's own noise row, rule (f)).

Create `test/sabotage/histogram.test.ts`: the find-once loop, and per row `withSabotage` on case 1 (the `histogram` rows) or case 3's key sequence (the `counting-scatter` rows) with a bitwise report; `cursor-not-advanced` breaks the permutation (duplicate outputs) -- the check for that row is "outIndex is a permutation", reported as Infinity when a duplicate exists.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/oracles.test.ts test/primitives/histogram.test.ts`
Expected: the oracle cases PASS; the GPU file FAILS (`Cannot find module '../../src/primitives/histogram.js'`).

- [ ] **Step 2: The two bodies**

Create `src/wgsl/histogram.wgsl.ts`:

```ts
/**
 * The `histogram` kernel body (spec 6 row 5; P4-T3): one atomicAdd per key into the global `hist` (zeroed by a fill
 * dispatch earlier in the pass, PD-4). Order-independent, hence deterministic. A key >= P.bins is not counted (the
 * caller's contract; the grid's keys are always < cells + 1). Body only; normative text.
 */
export const histogramWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn histogram(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    if (k < P.bins) { atomicAdd(&hist[k], 1u); }                   // order-independent: the count is the same whatever the schedule
}
`;
```

Create `src/wgsl/counting-scatter.wgsl.ts`:

```ts
/**
 * The `counting-scatter` kernel body (spec 6 row 5; P4-T3): the scatter of a counting sort. `start[k]` is the
 * exclusive scan of the histogram, `cursor[k]` a zeroed per-bin atomic; an element takes the slot `start[k] +
 * atomicAdd(&cursor[k], 1u)`. The order inside a bin depends on the schedule (set-deterministic, design 6). Body
 * only; normative text.
 */
export const countingScatterWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn counting_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let k = keys[i];
    let slot = atomicAdd(&cursor[k], 1u);                          // the per-bin cursor (6 row 5)
    outIndex[start[k] + slot] = i;
}
`;
```

Registry (PD-1 region T3): `HIST_PARAMS = UniformBlock.define("HistParams", [["count", "u32"], ["bins", "u32"], ["pad0", "u32"], ["pad1", "u32"]])`; `HISTOGRAM` (`keys` ro (1,0) `array<u32>`, `hist` rw (1,1) `array<atomic<u32>>`, `P` (2,0) `HistParams`; `needs: []`, phase `"P4"`); `COUNTING_SCATTER` (`keys` ro (1,0), `start` ro (1,1) `array<u32>`, `cursor` rw (1,2) `array<atomic<u32>>`, `outIndex` rw (1,3) `array<u32>`, `P` (2,0)); mirrors (`storageCount` 2 and 4; compile pins 1 each; `P4: 5`).

- [ ] **Step 3: The driver**

Create `src/primitives/histogram.ts` with `prepareHistogram(scope)` (compiles `histogram` and `fill`) whose `record(pass, keys, count, bins, hist)` validates (`bins >= 1`, `hist.size >= 4 bins`, `keys.size >= 4 count`), records `fill` over `bins` words of `hist` (`FILL_PARAMS { count: bins, value: 0, mode: 0 }` through `scope.params`, `plan1d(bins)`), then the histogram dispatch (`plan1d(count)`; nothing when `count === 0`); and `prepareCountingSort(scope)` (compiles the above plus `counting-scatter` and calls `prepareScan`) whose `record(pass, keys, count, bins, scratch, outIndex, outStart)` records the histogram into `scratch.hist`, `scan.record(pass, scratch.hist, bins, outStart)`, a `fill` of `scratch.cursor` (`bins` words), then the scatter. Both planners expose `lastDispatches`.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/histogram.test.ts test/kernel/registry.test.ts test/kernel/bind-group-budget.test.ts test/kernel/wgsl-compile.test.ts`
Expected: PASS (six cases).

- [ ] **Step 4: The sabotage rows**

Append to `SABOTAGE` (`const HISTOGRAM_TEST = "test/primitives/histogram.test.ts";`):

```ts
    histogram: Object.freeze([
        { name: "plain-store", find: "if (k < P.bins) { atomicAdd(&hist[k], 1u); }", replace: "if (k < P.bins) { atomicStore(&hist[k], 1u); }", minFactor: 10, test: HISTOGRAM_TEST },
        { name: "last-key-skipped", find: "if (i >= P.count) { return; }                                  // no barrier follows\n    let k = keys[i];\n    if (k < P.bins)", replace: "if (i + 1u >= P.count) { return; }                             // no barrier follows\n    let k = keys[i];\n    if (k < P.bins)", minFactor: 10, test: HISTOGRAM_TEST },
        { name: "bin-off-by-one", find: "atomicAdd(&hist[k], 1u)", replace: "atomicAdd(&hist[k + 1u], 1u)", minFactor: 10, test: HISTOGRAM_TEST },
    ]),
    "counting-scatter": Object.freeze([
        { name: "cursor-not-advanced", find: "let slot = atomicAdd(&cursor[k], 1u);", replace: "let slot = atomicLoad(&cursor[k]);", minFactor: 10, test: HISTOGRAM_TEST },
        { name: "start-ignored", find: "outIndex[start[k] + slot] = i;", replace: "outIndex[slot] = i;", minFactor: 10, test: HISTOGRAM_TEST },
        { name: "index-off-by-one", find: "+ slot] = i;", replace: "+ slot] = i + 1u;", minFactor: 10, test: HISTOGRAM_TEST },
    ]),
```

The `last-key-skipped` row's `find` spans three lines because the two bodies share the line `if (i >= P.count) { return; }                                  // no barrier follows` and a `find` must be unique WITHIN its own body -- it is (the body has one such line); the multi-line form documents the intent and is legal (`sabotagedBody` is a substring replace). `plain-store` is the design's named mutation (11.9 item 1).

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/histogram.test.ts test/sabotage/coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the histogram and counting-sort primitives` through `tools/commit-changes.sh`. The body records PD-4.

---

### Task P4-T4: `radixSort`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 6 (`:1573`: LSD, key-value, stable; 8 bits per pass; the per-workgroup 256-bin histogram stored DIGIT-MAJOR `hist[digit * groups + group]` so the scan of `groups x 256` yields per-digit workgroup offsets; a stable scatter with per-workgroup local ranking; `bits` limits the passes; scratch `2 x (keys + values)`), 13 row P4 gate ("`radixSort` equals a stable `Array.sort` on 8 / 16 / 24 / 32-bit keys with values, sizes 0..2^22 (scaled), all-equal keys"), 7.7 G2 (`:1971`: 3 passes at `bits = 24`, within a cell nodes stay in index order).

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/radix-hist.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/radix-scatter.wgsl.ts`, `webgpu-graph-algorithms/src/primitives/radix-sort.ts`, `webgpu-graph-algorithms/test/oracle/radix-sort.ts`, `webgpu-graph-algorithms/test/primitives/radix-sort.test.ts`, `webgpu-graph-algorithms/test/sabotage/radix-sort.test.ts`
- Modify (PD-1 regions T4): `src/kernels.ts` (`"radix-hist" | "radix-scatter"`, `RADIX_PARAMS`, two entries, two rows), `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts` (`"radix-hist": 2, "radix-scatter": 5`), `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`P4: 7`), `test/helpers/sabotage.ts` (six rows, `RADIX_TEST`)

**Interfaces:**
- Consumes: `prepareScan` (T2), `ReduceScope`, `plan1d`.
- Produces: `RADIX_PARAMS` (`RadixParams`: `count` @0, `shift` @4, `groups` @8, `pad0` @12); entries `radix-hist` (2 storage: `keys` ro, `hist` rw `array<u32>`) and `radix-scatter` (5 storage: `keys` ro, `vals` ro, `offsets` ro, `keysOut` rw, `valsOut` rw; `P: RadixParams`); `prepareRadixSort(scope): Promise<RadixSortPlanner>` with `record(pass, keys: Binding, vals: Binding, count: number, bits: 8 | 16 | 24 | 32, scratch: { keys: Binding; vals: Binding; hist: Binding }): { readonly keys: Binding; readonly vals: Binding }` (where the result lives) and `lastDispatches`; `radixHistBytes(count, wg)` = `4 * 256 * ceil(count / wg)` (the caller sizes `scratch.hist`); `radixSortOracle(keys, vals, bits)` (a stable `Array.sort` on the masked key).

**PLAN DECISION PD-5 (serial ranking, the result pair).** The GraphWaGu / Fuchsia structure the design cites ranks elements within a workgroup with a multi-way split; a workgroup of 256 keys can also be ranked STABLY by ONE lane walking its 256 keys in order with a 256-entry `var<workgroup>` counter table -- 256 dependent steps per workgroup, no atomics, no ordering question, bitwise deterministic. At 1M keys that is 3,907 workgroups each doing 256 serial steps on one lane, a few microseconds of latency per pass hidden behind the other workgroups; `ponytail:` it is the ceiling the T-6 measurement will show if the sort dominates, and the 8-way split ranking is the upgrade path, in this one function. The pass count is `bits / 8`; an odd count leaves the result in the scratch pair, an even one in the input pair, and `record()` RETURNS the pair so no caller guesses. The grid sorts with `bits = 24` always (three passes: 2D keys need 18 bits at G = 512 and 3D 22 at G = 128, and a fixed pass count keeps `sortedIdx` = the scratch values buffer whatever the graph's size).

- [ ] **Step 1: The oracle and the failing tests**

Create `test/oracle/radix-sort.ts`: `radixSortOracle(keys, vals, bits)` sorts index pairs by `key % 2^bits` (`Number` arithmetic) with `Array.prototype.sort` on `(a, b) => ka - kb || ia - ib` (the tie-break makes the reference stable) and returns `{ keys, vals }`. One pure case in `test/oracle/oracles.test.ts` (keys `[3, 1, 3, 0]`, vals `[10, 11, 12, 13]` -> keys `[0, 1, 3, 3]`, vals `[13, 11, 10, 12]`).

Create `test/primitives/radix-sort.test.ts`, each its own `it`: (1) for every `bits` in `[8, 16, 24, 32]` and every size in `[0, 1, 255, 256, 257, 4097, 65537, 2 ** 22]` scaled by `gpuScale()` (never below the literal for sizes <= 4097): seeded random u32 keys, `vals = index` -> the returned pair equals the oracle bitwise (keys AND vals: stability is what makes `vals` deterministic), run twice, `expectBitwiseEqual` first; (2) all-equal keys (`0x00ABCDEF` everywhere at `2^20 * gpuScale()`): `vals` comes back as the identity permutation (stable); (3) keys already sorted and keys reverse-sorted; (4) the result pair is the scratch pair for `bits` 8 / 24 and the input pair for 16 / 32 (`toBe` on the buffers); (5) `lastDispatches` is `passes * (2 + scanDispatches)`; (6) a `scratch.hist` shorter than `radixHistBytes(count, wg)` is `E_INVALID_ARGUMENT`; (7) the writer case `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("radix-scatter", "random1m-24", cls, sortedKeys, "u32")` at `2^20` unscaled keys, `bits` 24, and `writeNoiseFixture("radix-hist", "random1m-24-table", cls, histTable, "u32")` where `histTable` is `scratch.hist` read back after the same sort: the digit-major table of the LAST pass after its in-place scan (`radixHistBytes / 4` words), which only `radix-hist` and the scan write -- the histogram kernel's own noise row (rule (f)).

Create `test/sabotage/radix-sort.test.ts`: the find-once loop; per row `withSabotage` on case 1 at size 4097, `bits` 24, bitwise report.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/radix-sort.test.ts`
Expected: FAIL (`Cannot find module '../../src/primitives/radix-sort.js'`).

- [ ] **Step 2: The two bodies**

Create `src/wgsl/radix-hist.wgsl.ts`:

```ts
/**
 * The `radix-hist` kernel body (spec 6 row 6; P4-T4): the 256-bin digit histogram of one WG-wide block of keys,
 * privatised in workgroup memory (atomics on workgroup memory are order-independent) and written DIGIT-MAJOR,
 * `hist[digit * P.groups + group]`, so one exclusiveScan over the table yields, per digit, the offsets of the
 * workgroups in workgroup order -- what a stable LSD scatter needs. The bitwise operators act on a KEY and a DIGIT,
 * never on an arc index (house rule). Body only; normative text.
 */
export const radixHistWgsl = /* wgsl */ `
var<workgroup> local: array<atomic<u32>, 256>;

@compute @workgroup_size(WG)
fn radix_hist(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < 256u; b = b + WG) { atomicStore(&local[b], 0u); }
    workgroupBarrier();
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i < P.count) {
        let d = (keys[i] >> P.shift) & 255u;                       // the pass's digit
        atomicAdd(&local[d], 1u);
    }
    workgroupBarrier();
    for (var b = lid.x; b < 256u; b = b + WG) { hist[b * P.groups + g] = atomicLoad(&local[b]); }   // digit-major
}
`;
```

Create `src/wgsl/radix-scatter.wgsl.ts`:

```ts
/**
 * The `radix-scatter` kernel body (spec 6 row 6; P4-T4): the stable scatter of one LSD pass. Lane 0 ranks the block's
 * keys serially in index order with a 256-entry counter table (PD-5: deterministic and stable, 256 steps per
 * workgroup; ponytail: the 8-way split ranking of GraphWaGu is the upgrade if T-6 shows the sort on the critical
 * path), then every lane writes its key and value at `offsets[digit * P.groups + group] + rank`. Body only;
 * normative text.
 */
export const radixScatterWgsl = /* wgsl */ `
var<workgroup> rank: array<u32, WG>;
var<workgroup> cnt: array<u32, 256>;

@compute @workgroup_size(WG)
fn radix_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < 256u; b = b + WG) { cnt[b] = 0u; }
    let g = group_id(wid);
    let i = g * WG + lid.x;
    var key = 0u;
    var d = 0u;
    if (i < P.count) {
        key = keys[i];
        d = (key >> P.shift) & 255u;
    }
    workgroupBarrier();
    if (lid.x == 0u) {                                             // serial stable ranking (PD-5)
        let last = min(WG, P.count - g * WG);
        for (var s = 0u; s < last; s = s + 1u) {
            let ds = (keys[g * WG + s] >> P.shift) & 255u;
            rank[s] = cnt[ds];
            cnt[ds] = cnt[ds] + 1u;
        }
    }
    workgroupBarrier();
    if (i < P.count) {
        let dst = offsets[d * P.groups + g] + rank[lid.x];
        keysOut[dst] = key;
        valsOut[dst] = vals[i];
    }
}
`;
```

Registry (PD-1 region T4): `RADIX_PARAMS = UniformBlock.define("RadixParams", [["count", "u32"], ["shift", "u32"], ["groups", "u32"], ["pad0", "u32"]])`; `RADIX_HIST` (`keys` ro (1,0), `hist` rw (1,1) `array<u32>`, `P` (2,0) `RadixParams`; `needs: []`; phase `"P4"`); `RADIX_SCATTER` (`keys` ro (1,0), `vals` ro (1,1), `offsets` ro (1,2), `keysOut` rw (1,3), `valsOut` rw (1,4), `P` (2,0)); mirrors (`storageCount` 2 and 5; compile pins 1 each; `P4: 7`).

- [ ] **Step 3: The driver**

Create `src/primitives/radix-sort.ts`: `prepareRadixSort(scope)` compiles the two kernels and `prepareScan(scope)`. `record()` validates `bits` in `{8, 16, 24, 32}`, `count` (a u32), the four bindings (`>= 4 count`) and `scratch.hist.size >= radixHistBytes(count, scope.workgroupSize)` (`E_INVALID_ARGUMENT` before anything is recorded), then for `pass = 0 .. bits / 8 - 1` with `shift = 8 * pass`: `radix-hist` over `groups = ceil(count / WG)` workgroups (`plan1d(count)`, params `{ count, shift, groups, pad0: 0 }`), `scan.record(pass, hist, 256 * groups, hist)` IN PLACE (the scan reads `src` before it writes `out` in every lane, so `src === out` is legal for `scan-block`; state this in the JSDoc and keep a test for it: case 1 proves it), then `radix-scatter` from the current pair into the other pair; the pairs swap after every pass; `count === 0` records nothing and returns the input pair. `lastDispatches = passes * (2 + scan.lastDispatches)`.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/radix-sort.test.ts test/kernel/registry.test.ts test/kernel/bind-group-budget.test.ts test/kernel/wgsl-compile.test.ts`
Expected: PASS (seven cases). The 2^22 rung at `bits` 32 is the long pole (four passes over 16 MB twice); on NVIDIA under a second, on lavapipe the scaled 83,886 keys in a few seconds.

- [ ] **Step 4: The sabotage rows**

Append to `SABOTAGE` (`const RADIX_TEST = "test/primitives/radix-sort.test.ts";`):

```ts
    "radix-hist": Object.freeze([
        { name: "group-major-table", find: "hist[b * P.groups + g] = atomicLoad(&local[b]);", replace: "hist[g * 256u + b] = atomicLoad(&local[b]);", minFactor: 10, test: RADIX_TEST },
        { name: "shift-ignored", find: "let d = (keys[i] >> P.shift) & 255u;", replace: "let d = keys[i] & 255u;", minFactor: 10, test: RADIX_TEST },
        { name: "last-key-uncounted", find: "if (i < P.count) {\n        let d = (keys[i] >> P.shift) & 255u;", replace: "if (i + 1u < P.count) {\n        let d = (keys[i] >> P.shift) & 255u;", minFactor: 10, test: RADIX_TEST },
    ]),
    "radix-scatter": Object.freeze([
        { name: "rank-not-advanced", find: "cnt[ds] = cnt[ds] + 1u;", replace: "cnt[ds] = cnt[ds];", minFactor: 10, test: RADIX_TEST },
        { name: "values-not-permuted", find: "valsOut[dst] = vals[i];", replace: "valsOut[dst] = vals[dst];", minFactor: 10, test: RADIX_TEST },
        { name: "offset-of-group-zero", find: "let dst = offsets[d * P.groups + g] + rank[lid.x];", replace: "let dst = offsets[d * P.groups] + rank[lid.x];", minFactor: 10, test: RADIX_TEST },
    ]),
```

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/radix-sort.test.ts test/sabotage/coverage.test.ts`
Expected: PASS; every row `Infinity`.

- [ ] **Step 5: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the stable LSD radixSort primitive` through `tools/commit-changes.sh`. The body records PD-5.

---

### Task P4-T5: The mid and high degree tiers of `segmented-reduce`, `fa2-attraction` and `spmv-pull`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 6 row 3 (`:1570`: three pipelines from one module by `override TIER` -- thread-per-row for `[midEnd, n)`, subgroup-per-row for `[hiEnd, midEnd)` "(without the feature the mid tier is a 32-invocations-per-row variant of the workgroup kernel, 8 rows per 256-wide workgroup, so no device ever runs a 1,000-arc row on one thread)", workgroup-per-row for `[0, hiEnd)` "with a 256-wide workgroup reduce whose early exit keys on `workgroup_id`"; rows visited through `degreeOrder(opts).perm` with `override USE_PERM`), 7.5 load balancing (`:1829-1851`: K2 compiles to the same three tiers; "the thread-per-row tier always runs to `n` so isolated nodes get their (zero) attraction written"), 6 row 9 (`:1577`: `spmvPull` tiered by IN-degree through `degreeOrder({ of: "reverse" })`), `design/decisions/2026-09-19-spmv-tier-zero-only.md` ("the same change then removes the `spmv-pull` throw"), 13 row P4 gate ("the upper `segmentedReduce` tiers equal their oracles with the 10k-degree hub, twin in-process").

**P5 interaction.** P5-T2 Step 2 inserted two `LAW` lines into the K2 loop and P5-T7 pinned four K2 `find` strings on them (`if (LAW == 1u) { w = length(d) / P.frK; }`, `w = length(d) / P.frK;`, `w = P.springCoefficient * (len - P.springLength) / len;`, `if (LAW == 2u) { w = P.springCoefficient`); this task moves the whole per-arc loop into a function and keeps those lines byte for byte, so the P5 rows keep their `find` strings. One P3 row changes its `find`: `row-bound-inclusive` pinned `a < rowPtr[i + 1u]`, and the windowed rebase replaces that bound with `a < a1` (Step 3 re-points the row; its NAME is unchanged, so `test/sabotage/coverage.test.ts`'s name pins stand). P5-T2 Step 1 left `pad` (vec4f @80) and `pad1` (f32 @124) in `Fa2Params` and P5-T3 Step 3 / P5-T5 Step 4 wrote `pad: [0, 0, 0, 0]` in the FR and spring `paramsFor` as FA2's does (`forceatlas2.ts:703` today); this task takes those bytes for the five u32 fields the K2 body reads (PD-7), so the body and its fields land in ONE commit that builds, and all three `paramsFor` drop `pad` in the same edit (`UniformBlock.write` throws `E_INVALID_ARGUMENT` on an unknown key and writes a MISSING field as 0, `src/kernel/struct-block.ts:282-283`, so `arcEnd` must be written explicitly or K2 folds no arcs). Re-read `src/wgsl/fa2-attraction.wgsl.ts`, `src/kernels.ts` and `test/helpers/sabotage.ts` at the first step: their line numbers below are the P5 tree's.

**Files:**
- Modify: `webgpu-graph-algorithms/src/wgsl/segmented-reduce.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/fa2-attraction.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/spmv-pull.wgsl.ts` (the three bodies), `webgpu-graph-algorithms/src/primitives/segmented-reduce.ts` (the tiers), `webgpu-graph-algorithms/src/primitives/spmv.ts` (the tiers), `webgpu-graph-algorithms/src/primitives/core-shape.ts` (`degreeTiersOf`), `webgpu-graph-algorithms/test/helpers/segmented-reduce.ts` (`runSegmentedReduce` takes `tiers`), `webgpu-graph-algorithms/test/helpers/spmv.ts` (likewise), `webgpu-graph-algorithms/test/primitives/segmented-reduce.test.ts` (`:318-341` becomes the tier suite entry), `webgpu-graph-algorithms/test/primitives/spmv.test.ts` (`:364-375`), `webgpu-graph-algorithms/test/helpers/graphs.ts` (the `rmat14` fixture -- `rmatEdges(14, 8, 1005)` scaled -- AND the ten positioned fixtures whose definitions P4-T8 Step 1 gives, all added to `FIXTURE_NAMES` and `fixture()` here so the file has one owner; T8 only uses them), `webgpu-graph-algorithms/src/layouts/forceatlas2.ts`, `webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts` and `webgpu-graph-algorithms/src/layouts/spring-electrical.ts` (PD-1 region T5: the ONE `pad: [0, 0, 0, 0],` line of each `paramsFor`, Step 3; nothing else in the three files)
- Modify (PD-1 regions T5): `src/kernels.ts` (`FA2_PARAMS`: `["pad", "vec4f"]` -> `["arcBase", "u32"], ["arcEnd", "u32"], ["accumulate", "u32"], ["hiEnd", "u32"]` and `["pad1", "f32"]` -> `["midEnd", "u32"]` with the JSDoc offsets, Step 3; `TIER` declaration added to `SPMV_PULL` `:470-473`; `needs: ["subgroups"]` on `SEGMENTED_REDUCE` `:333`, `FA2_ATTRACTION` `:372` and `SPMV_PULL` `:475`; `SPMV_PARAMS.pad0` `:197` renamed `start`), `test/kernel/registry.test.ts` (the three rows' `needs` and the `TIER` decl), `test/helpers/override-matrix.ts` (`TIER: [0, 1, 2]`, and the pins: P2 `segmented-reduce` 52 -> 148 (4 snippets x (1 + 3 OP x 3 TIER x 4 pairs)), P3 K2 49 -> 145 (1 + 2 x 2 x 3 x 2 x 2 x 3), P7 `spmv-pull` 17 -> 49 (1 + 2 x 2 x 2 x 2 x 3); `EXPECTED_CASES_BY_PHASE` P2 148, P3 157, P7 69), `test/kernel/wgsl-compile.test.ts` (`segmented-reduce` 52 -> 148 at `:60`), `test/helpers/sabotage.ts` (the `SABOTAGE_P4_TIERS` table, eighteen rows; the re-pointed P3 `find`; `TIERS_TEST`)
- Create: `webgpu-graph-algorithms/test/primitives/tiers.test.ts`, `webgpu-graph-algorithms/test/sabotage/tiers.test.ts`
- NOT touched: `src/layouts/**` beyond the three `pad` lines (T6 wires the K2 tiers into the models), `src/algorithms/**` (the algorithms keep `tiers: null`, 0.7), `test/kernel/struct-block.test.ts` (it lays out its own copy of the P3 blocks, `:80-100`)

**Interfaces:**
- Consumes: `DegreeTiers` (`segmented-reduce.ts:21-24`), the `degreeOrder` / `reverseDegreeOrder` views (`residency.ts:414-430`), `graphBindings(core, perm, weights)` / `graphOverrides` (`kernels.ts:682-712`), `wg_reduce_f32` / `wg_reduce_vec4` (prelude), `relTolerance` / `maxRelError` / `SR_ABS_FLOOR` (`test/helpers/segmented-reduce.ts:51,133,151`), `acquire({ subgroups: false })` (`test/setup/gpu.ts:58-65`), `arcCountOf` (`core-shape.ts`).
- Produces: `degreeTiersOf(view: ViewBinding): DegreeTiers` (`core-shape.ts`); `prepareSegmentedReduce` and `prepareSpmvPull` accepting non-null `tiers` (one to three pipelines, `USE_PERM: true`); the `TIER` 1 / 2 branches of the three bodies; the five `Fa2Params` fields `arcBase` @80, `arcEnd` @84, `accumulate` @88, `hiEnd` @92, `midEnd` @124 (written `0` / `arcCount` / `0` / `0` / `0` by every model until T6); `SABOTAGE_P4_TIERS`.

**PLAN DECISION PD-6 (32 lanes per row, functions per tier).** The design's mid tier is "subgroup-per-row when `subgroups` exists (without the feature the 32-invocations-per-row variant ...)". A subgroup's size is the compiler's choice inside `[subgroupMinSize, subgroupMaxSize]` (D16) -- 4 on SwiftShader, 8 on lavapipe, 32 on NVIDIA, 4-128 on WARP -- so a subgroup-per-row tier walks a different number of lanes per row on every adapter and its f32 sums differ in order between the feature variant and the twin. The 32-invocations-per-row form is bitwise the same everywhere: eight rows per 256-lane workgroup (`WG / 32` rows in general), each lane folding the arcs `a0 + lane, a0 + lane + 32, ...`, then a five-step tree in workgroup memory over each 32-lane group, every lane running every step (uniform control flow, the write guarded by `lane < s`). The high tier is one row per workgroup through `wg_reduce_*`, which has the subgroup variant and the twin already, so the three entries gain `needs: ["subgroups"]` (the composer refuses a helper call without it, `wgsl.ts:404-405`) and the twin axis. Each tier is a FUNCTION called under `if (TIER == 0u) { tier0(...); } else { tiered(...); }`: an override is uniform, so the barriers inside `tiered` are reached in uniform control flow, while `tier0`'s per-row early return stays inside a function that has no barrier (`CLAUDE.md:181-185`). The row ranges: `segmented-reduce` and `spmv-pull` take `[P.start, P.end)` (`[P.start, P.n)` for the pull) from the params record of EACH dispatch (the scope writes one per dispatch); K2's three dispatches share ONE `Fa2Params` per iteration and read their range by tier (PD-7, T6).

- [ ] **Step 1: The fixture, the helper and the failing tests**

In `test/helpers/graphs.ts` add `"rmat14"` to `FIXTURE_NAMES` and to `fixture()` (and, in the same edit, the ten positioned fixtures P4-T8 Step 1 defines): `snapshotOf(rmatEdges(Math.max(6, Math.round(14 + Math.log2(factor))), 8, 1005), { label: name })` -- a scale-14 R-MAT (16,384 nodes, 131,072 edges) on hardware, scale 8 on a software adapter (`log2(1 / 50)` rounds to -6), whose degree distribution populates all three tiers (assert in the test: `segmentOffsets[1] >= 1` and `segmentOffsets[2] - segmentOffsets[1] >= 32`). In `core-shape.ts` add:

```ts
/**
 * The DegreeTiers of a degreeOrder / reverseDegreeOrder view (the perm binding and the five segment offsets
 * [0, hiEnd, midEnd, lowEnd, n] of graph-format's cuGraph thresholds 1024 / 32 / 1).
 * @param view - residency.view(s, "degreeOrder") or view(s, "reverseDegreeOrder")
 * @returns the tiers
 */
export function degreeTiersOf(view: ViewBinding): DegreeTiers;   // E_INVALID_ARGUMENT when the view has no perm binding or its segmentOffsets are not five ascending numbers ending at the row count
```

(`DegreeTiers` moves from `segmented-reduce.ts:21-24` to `core-shape.ts` and is re-exported from `segmented-reduce.ts` so `spmv.ts:25`'s import keeps working.)

Extend `test/helpers/segmented-reduce.ts` `runSegmentedReduce(ctx, s, op, snippet, tiers?: "auto")` -- `"auto"` builds `degreeTiersOf(ctx.residency.view(s, "degreeOrder"))` -- and `test/helpers/spmv.ts` likewise with `"reverseDegreeOrder"`.

Create `test/primitives/tiers.test.ts` (node project), each its own `it`: (1) for `hub10k`, `rmat14`, `star200`, `karate` (each at `gpuScale()`), `segmentedReduce` with `tiers: "auto"` equals the f64 oracle within `relTolerance(s, op)` for `sum` / `min` / `max` x the `weight` / `one` snippets, run twice bitwise first; the pipeline keys created carry `USE_PERM: true` and `TIER` 0, 1 and 2 (assert through `ctx.pipelines.keys()` that all three appear for `rmat14`, exactly `[0, 2]` for `hub10k` when its scaled leaf count is >= 1024 and no other row reaches 32, and `[0]` only for `karate`); (2) the twins in-process: `acquire({ subgroups: false })` gives, for `rmat14` under `sum`, a result within `relTolerance` of the feature context's and bitwise the same TIER 0 / TIER 1 rows (compare the rows of `perm[0 .. midEnd)` within the bound and the rows `perm[midEnd .. n)` and `perm[hiEnd .. midEnd)` bitwise); (3) `spmvPull` with `tiers: "auto"` on the reverse of `hub10k` and `rmat14` (directed R-MAT: `snapshotOf(rmatEdges(...), { directed: true })`) equals the oracle of `test/oracle/spmv.ts` within the file's bound, twice bitwise, all three tiers compiled; (4) `degreeTiersOf` rejects a view without `perm` and offsets that are not ascending (`E_INVALID_ARGUMENT { argument: "view" }`); (5) the writer cases `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("segmented-reduce", "hub10k-tiers", cls, out, "f32")`, `writeNoiseFixture("spmv-pull", "hub10k-tiers", cls, rankOut, "f32")` on the unscaled fixtures with the f64 oracle's values under `"oracle-f64"`.

Replace `test/primitives/segmented-reduce.test.ts:318-341` by a case asserting `USE_PERM` is false in every key WITHOUT tiers and `prepareSegmentedReduce(scope, core, { ..., tiers })` resolves (the throw is gone; the tier results are `tiers.test.ts`'s); the same at `test/primitives/spmv.test.ts:364-375` (keep its windowed and malformed-rowPtr legs).

Create `test/sabotage/tiers.test.ts`: the find-once / unique-name / `test`-exists loop over the WHOLE of `SABOTAGE_P4_TIERS` (the `coverage.test.ts:72-96` shape), then per row of the three row-walking ids `segmented-reduce`, `spmv-pull` and `fa2-attraction` ONLY, `withSabotage(id, row, ctx => ...)` running the check the row's `test` names on `rmat14` at `gpuScale()` (`segmented-reduce` rows: case 1's `sum` / `weight` report with `relTolerance`, or the windowed leg of `segmented-reduce.test.ts` for a row whose `test` is that file (T7); `spmv-pull` rows: case 3's report; `fa2-attraction` rows: the K2 stage report of T6 -- these last six rows are APPENDED by T6, which owns the K2 model wiring; this file runs whatever the table holds under those three ids) and asserting `report.worst >= row.minFactor`. The `fa2-stats-finalize` rows T12 adds to the same table are measured by T12's `test/sabotage/grid.test.ts` (their check is a grid stage), never here.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/tiers.test.ts`
Expected: FAIL (`E_UNSUPPORTED { feature: "segmentedReduce.tiers" }`).

- [ ] **Step 2: The `segmented-reduce` body**

Replace the body of `src/wgsl/segmented-reduce.wgsl.ts` (`:13-35`) with (the `identity` / `comb` lines `:14-15` are unchanged):

```wgsl
fn identity() -> f32 { if (OP == 1u) { return F32_MAX; } if (OP == 2u) { return -F32_MAX; } return 0.0; }
fn comb(a: f32, b: f32) -> f32 { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_fold(i: u32, lane: u32, step: u32) -> f32 {              // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var acc = identity();
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // the neighbour index (\`target\` is a WGSL reserved word)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        var v = 0.0;
        //@@VALUE@@
        acc = comb(acc, v);
    }
    return acc;
}
fn finish(i: u32, acc: f32) { out[i] = select(acc, comb(out[i], acc), P.accumulate == 1u); }
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: one row per thread over [P.start, P.end); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.start;
    if (row >= P.end) { return; }
    let i = row_node(row);
    finish(i, row_fold(i, 0u, 1u));
}

var<workgroup> sh: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row, WG / 32 rows per workgroup; TIER 2: WG lanes per row (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.end;
    var i = 0u;
    var acc = identity();
    if (valid) { i = row_node(row); acc = row_fold(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = identity();
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = comb(sh[lid], t);
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(i, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, OP);                     // the workgroup tree of the prelude (subgroup variant when available)
        if (valid && lid == 0u) { finish(i, t); }
    }
}

@compute @workgroup_size(WG)
fn segmented_reduce(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
```

(`wg_reduce_f32`'s third argument is the op code 0 / 1 / 2, exactly the `OP` override's values, `prelude.ts:102-126`.) Update the file's header comment (the three tiers; `needs: ["subgroups"]`).

- [ ] **Step 3: The `fa2-attraction` body (K2)**

Replace the body of `src/wgsl/fa2-attraction.wgsl.ts` (P5's tree: `:12-39`) with:

```wgsl
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_force(i: u32, lane: u32, step: u32) -> vec3f {           // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd) (4.2)
    let pi = pos[i];                                           // xyz + mass in one load (D23)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var f = vec3f(0.0);
    for (var a = a0 + lane; a < a1; a = a + step) {
        let j = colIdx[a - P.arcBase];
        if (j == i) { continue; }                              // a self-loop exerts no force
        var w = 1.0;
        if (HAS_WEIGHTS) { w = weights[a - P.arcBase]; }
        let d = pos[j].xyz - pi.xyz;                           // toward j
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { w = length(d) / P.frK; }              // LAW 1 (FR, 7.20): |F| = d^2 / k along d / d, unfloored; the linear select below applies w as is
        if (LAW == 2u) { w = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring, ngraph generateCreateSpringForce.js:33-36): Hooke k_s (d - L) toward j
        let mag = select(w, w * log(1.0 + len) / len, LINLOG); // linear: |F| = w len; linlog: |F| = w log(1 + len)
        f = f + d * mag;
    }
    return f;
}
fn finish(i: u32, f0: vec3f) {
    var f = f0;
    if (DISTRIBUTED) { f = f / pos[i].w; }
    if (P.accumulate == 1u) { f = f + load_force(i); }         // the windowed loop of 4.2 (arcBase != 0 dispatches after the first)
    store_force(i, f);                                         // overwrites: attraction is the first writer of force each iteration
}
fn tier0(wid: vec3<u32>, lane: u32) {                          // TIER 0: one row per thread over [tierStart, tierEnd); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.tierStart;
    if (row >= P.tierEnd) { return; }
    let i = row_node(row);
    finish(i, row_force(i, 0u, 1u));
}

var<workgroup> sh: array<vec3f, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                          // TIER 1: 32 lanes per row over [hiEnd, midEnd); TIER 2: WG lanes per row over [0, hiEnd) (PD-6, PD-7)
    let g = group_id(wid);
    var row = g;
    var end = P.hiEnd;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.hiEnd + g * (WG / 32u) + lid / 32u; end = P.midEnd; lane = lid % 32u; step = 32u; }
    let valid = row < end;
    var i = 0u;
    var f = vec3f(0.0);
    if (valid) { i = row_node(row); f = row_force(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = f;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = vec3f(0.0);
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(i, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_vec4(vec4f(f, 0.0), lid, 0u);
        if (valid && lid == 0u) { finish(i, t.xyz); }
    }
}

@compute @workgroup_size(WG)
fn attraction(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
```

The P3 `find` strings `f = f + d * mag;`, `select(w, w * log(1.0 + len) / len, LINLOG)` and `select(row, perm[row], USE_PERM)` and the four P5 K2 strings each occur exactly once (the loop lives in ONE function). The P3 row `row-bound-inclusive` (`test/helpers/sabotage.ts`, the K2 block of `SABOTAGE`) is re-pointed: `find: "a < a1; a = a + step"`, `replace: "a <= a1; a = a + step"`, name unchanged.

**The five `Fa2Params` fields, in the same step (PD-7).** The body reads `P.arcBase`, `P.arcEnd`, `P.accumulate`, `P.hiEnd` and `P.midEnd`, so they are declared HERE and the task's commit builds on its own. In `src/kernels.ts` `FA2_PARAMS` (P5's tree: `pad` at @80, `pad1` at @124) replace `["pad", "vec4f"],` with `["arcBase", "u32"], ["arcEnd", "u32"], ["accumulate", "u32"], ["hiEnd", "u32"],` and `["pad1", "f32"],` with `["midEnd", "u32"],`; amend the JSDoc: "`arcBase` @80 / `arcEnd` @84 (the bound arc window of K2, 0 and arcCount in the layout), `accumulate` @88 (1 combines into `force`: the windowed pattern), `hiEnd` @92 / `midEnd` @124 (the degreeOrder tier boundaries, PD-7; both 0 without a permutation)"; the block stays 128 B and no other offset moves. In the three `paramsFor` (FA2 `forceatlas2.ts:703`, FR and spring: the P5 tree's line) replace `pad: [0, 0, 0, 0],` with `arcBase: 0, arcEnd: arcCountOf(resources.core), accumulate: 0, hiEnd: 0, midEnd: 0,` (`arcCountOf` from `../primitives/core-shape.js`; `tierStart` stays `0` and `tierEnd` `n`: no permutation is bound until T6, which then sources `hiEnd` / `midEnd` from the tiers and sets `tierStart: midEnd`). `UniformBlock.write` throws on an unknown key and zeroes a missing one (`struct-block.ts:282-283`), so `pad` must go from all three and `arcEnd` must be written. The FA2 options pins name no `pad` (`fa2-options.test.ts`), so nothing else moves.

- [ ] **Step 4: The `spmv-pull` body**

Rename `SPMV_PARAMS.pad0` (`kernels.ts:197`) to `start` (the JSDoc: "`start` @28: the first row of the dispatch; TIER 0 strides from it, the tiers index from it") and replace the body of `src/wgsl/spmv-pull.wgsl.ts` (`:15-47`) with:

```wgsl
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_sum(v: u32, lane: u32, step: u32) -> f32 {               // this lane's arcs of row v inside the bound window, the two-level 64-term fold of the header
    let a0 = max(rowPtr[v], P.arcBase);
    let a1 = min(rowPtr[v + 1u], P.arcEnd);
    var acc = 0.0;
    var chunk = 0.0;
    var inChunk = 0u;
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        // two-level sum: 64 terms into chunk, chunk into acc (see the header; no compensation, no select)
        chunk = chunk + (weight * xNorm[nbr]);
        inChunk = inChunk + 1u;
        if (inChunk == 64u) {
            acc = acc + chunk;
            chunk = 0.0;
            inChunk = 0u;
        }
    }
    acc = acc + chunk;
    return acc;
}
fn finish(v: u32, acc: f32) {
    var dangling = 0.0;
    if (USE_DANGLING) { dangling = partials[0].danglingMass; }
    var pv = P.uniformP;
    if (HAS_PERSONALIZATION) { pv = personalization[v]; }
    rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)));
}
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: grid-stride over the rows [P.start, P.n); no barrier
    for (var row = linear_id(wid, lane) + P.start; row < P.n; row = row + P.stride) {
        let v = row_node(row);
        finish(v, row_sum(v, 0u, 1u));
    }
}

var<workgroup> sh: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row; TIER 2: WG lanes per row; rows [P.start, P.n) (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.n;
    var v = 0u;
    var acc = 0.0;
    if (valid) { v = row_node(row); acc = row_sum(v, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = 0.0;
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(v, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, 0u);
        if (valid && lid == 0u) { finish(v, t); }
    }
}

@compute @workgroup_size(WG)
fn spmv_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
```

Every M8b `spmv-pull` sabotage `find` (`test/helpers/sabotage.ts:320-345`, the rows measured by `SPMV_TEST` / `PAGERANK_TEST`) is checked by `coverage.test.ts`'s find-once loop after the edit; a row whose `find` was the old loop header or the old `rankOut[v] = ...` placement is re-pointed to the same expression in its new function (name unchanged; list every re-pointed row in the commit body). Add `{ name: "TIER", type: "u32", default: 0 }` to `SPMV_PULL.overrideDecls` and `needs: ["subgroups"]` to the three entries; the registry-test rows follow. `tier0`'s grid-stride loop keeps `P.stride` from `planGridStride` exactly as today. None of the three TIER 2 loops (Steps 2-4) carries Kahan compensation, which design 6 row 3 (`:1570`) asks for in the workgroup-per-row loop: DEP-P4-J, for the reason `docs/decisions/G7.md:121-124` recorded when the pull's compensation was dropped (Metal's compiler folded the compensated sum away; the plain fold has no identity a compiler can simplify and the tier bound is a derived tolerance either way).

- [ ] **Step 5: The planners**

`src/primitives/segmented-reduce.ts`: delete the throw (`:226-230`); `prepareSegmentedReduce` compiles TIER 0 always (`USE_PERM: tiers !== null`), TIER 1 iff `tiers !== null && so[2] > so[1]`, TIER 2 iff `tiers !== null && so[1] > 0` (`so = tiers.segmentOffsets`), and `ThreadPerRowPlanner` becomes `TieredPlanner` whose `record()` issues, in this order, TIER 2 over rows `[0, so[1])` (`plan1d(so[1], 1, caps)`: one workgroup per row), TIER 1 over `[so[1], so[2])` (`plan1d(so[2] - so[1], WG / 32, caps)`: `WG / 32` rows per workgroup), TIER 0 over `[so[2], n)` (`plan1d(n - so[2])`), each with its own `RANGE_PARAMS` record (`start`, `end`, `arcBase 0`, `arcEnd arcCount`, `accumulate`, `n`) and `graphBindings(core, tiers?.perm ?? null)`; without tiers the single TIER 0 dispatch over `[0, n)` as today. Every dispatch whose range is empty is skipped (`Kernel.dispatch` records nothing for `x === 0` anyway). `lastDispatches` is exposed. `src/primitives/spmv.ts`: the same three-way split with `SPMV_PARAMS` (`n` = the range END per dispatch: TIER 2 `{ start: 0, n: so[1] }`, TIER 1 `{ start: so[1], n: so[2] }`, TIER 0 `{ start: so[2], n }`, `stride` from `planGridStride` for TIER 0 only); `assertNotWindowed` stays (DEP-P4-B).

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/kernel test/primitives test/sabotage/coverage.test.ts test/sabotage/segmented-reduce.test.ts test/sabotage/spmv.test.ts`
Expected: PASS -- the compile matrix reports 148 + 145 + 49 for the three entries on the real device and `backend=null`, both twins (`EXPECTED_CASES_BY_PHASE` P2 148, P3 157, P7 69; P4 7 from T1-T4); `tiers.test.ts` five cases green on both twins; the P2 / P7 sabotage suites still fail every one of THEIR rows by >= 10x (the TIER 0 text is the old text in a function).

- [ ] **Step 6: The tier sabotage rows**

Append to `test/helpers/sabotage.ts` (after `SABOTAGE_P5`):

```ts
const TIERS_TEST = "test/primitives/tiers.test.ts";

/** The P4 tier rows (PD-21): the TIER 1 / 2 branches of the three row-walking kernels; measured by test/sabotage/tiers.test.ts only (the thread-per-row suites never reach these lines). The K2 rows are appended by P4-T6 and measured by the K2 stage check of test/layouts/tiers-inspect.test.ts; the window row by P4-T7; the fa2-stats-finalize rows (K1's grid block) by P4-T12, measured by test/sabotage/grid.test.ts. */
export const SABOTAGE_P4_TIERS: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "segmented-reduce": Object.freeze([
        { name: "tier1-lane-stride-one", find: "for (var arc = a0 + lane; arc < a1; arc = arc + step) {", replace: "for (var arc = a0 + lane; arc < a1; arc = arc + 1u) {", minFactor: 10, test: TIERS_TEST },
        { name: "tier1-tree-step-quartered", find: "for (var s = 16u; s >= 1u; s = s / 2u) {", replace: "for (var s = 16u; s >= 1u; s = s / 4u) {", minFactor: 10, test: TIERS_TEST },
        { name: "tier1-rows-per-group-doubled", find: "row = P.start + g * (WG / 32u) + lid / 32u;", replace: "row = P.start + g * (WG / 16u) + lid / 32u;", minFactor: 10, test: TIERS_TEST },
        { name: "tier2-lane-partial-written", find: "if (valid && lid == 0u) { finish(i, t); }", replace: "if (valid && lid == 0u) { finish(i, acc); }", minFactor: 10, test: TIERS_TEST },
        { name: "tier2-row-end-ignored", find: "let valid = row < P.end;", replace: "let valid = row <= P.end;", minFactor: 10, test: TIERS_TEST },
        { name: "tier2-reduce-op-sum", find: "let t = wg_reduce_f32(acc, lid, OP);", replace: "let t = wg_reduce_f32(acc, lid, 0u);", minFactor: 10, test: TIERS_TEST },
    ]),
    "spmv-pull": Object.freeze([
        { name: "tier1-lane-stride-one", find: "for (var arc = a0 + lane; arc < a1; arc = arc + step) {", replace: "for (var arc = a0 + lane; arc < a1; arc = arc + 1u) {", minFactor: 10, test: TIERS_TEST },
        { name: "tier1-tree-step-quartered", find: "for (var s = 16u; s >= 1u; s = s / 2u) {", replace: "for (var s = 16u; s >= 1u; s = s / 4u) {", minFactor: 10, test: TIERS_TEST },
        { name: "tier1-rows-per-group-doubled", find: "row = P.start + g * (WG / 32u) + lid / 32u;", replace: "row = P.start + g * (WG / 16u) + lid / 32u;", minFactor: 10, test: TIERS_TEST },
        { name: "tier2-lane-partial-written", find: "if (valid && lid == 0u) { finish(v, t); }", replace: "if (valid && lid == 0u) { finish(v, acc); }", minFactor: 10, test: TIERS_TEST },
        { name: "tier2-row-end-ignored", find: "let valid = row < P.n;", replace: "let valid = row <= P.n;", minFactor: 10, test: TIERS_TEST },
        { name: "tier0-start-ignored", find: "for (var row = linear_id(wid, lane) + P.start; row < P.n; row = row + P.stride) {", replace: "for (var row = linear_id(wid, lane); row < P.n; row = row + P.stride) {", minFactor: 10, test: TIERS_TEST },
    ]),
});
```

Every `find` is a line of the bodies of Steps 2 and 4. `tier2-row-end-ignored` reads `perm[P.end]`, one past the last row of the permutation and, for the last tier dispatch, one past the buffer: WGSL clamps the read and the kernel then writes a duplicated row's value into a real row's slot -- the `weight` sum of that row is wrong by a whole row, which the `relTolerance` bound catches by orders of magnitude; the `tier2-reduce-op-sum` row survives under `sum` and breaks `min` / `max`, so the sabotage suite measures every row under all three operators and takes the worst ratio.

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/tiers.test.ts`
Expected: PASS for the twelve rows present (the K2 rows arrive with T6).

- [ ] **Step 7: Green check on both adapters and the twins**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/kernel test/sabotage test/algorithms && GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/algorithms && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both and on the twin pass; coverage at or above 80 / 80 / 75 / 80; the P7 algorithm suites unchanged (they pass `tiers: null`).

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the mid and high degree tiers of the row-walking kernels` through `tools/commit-changes.sh`. The body records PD-6, the five `Fa2Params` fields (PD-7's declaration), names DEP-P4-J as the record P4-T16 writes, and lists every re-pointed `find`.

---

### Task P4-T6: The K2 tiers inside the layout

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.5 (`:1829-1851`: `P.tierStart / tierEnd` from `degreeOrder().segmentOffsets` read on the CPU; the thread-per-row tier always runs to `n`; "the API takes the permutation from day one so no signature changes"), 7.3 (`:1731`, the `perm` row of the buffer table: `perm` bound when `segmentOffsets` reports any row of degree >= 32, else `USE_PERM = false`), 7.4 K2 row (`:1773`: 1-3 dispatches), 10.4 T-7 (`:3412`: the attraction gather at 1M / 10M <= 15 ms, measured in T14).

**P5 interaction.** P5-T1 created `model-common.ts` (PD-7 there) for helpers every model shares; the K2 tier binding and dispatch helpers go there too, so the three models' `bind()` / `recordIteration()` call one function instead of holding three copies. The five `Fa2Params` fields this task fills (`hiEnd`, `midEnd`) were declared by T5 Step 3 with the K2 body, and every `paramsFor` already writes them as `0`.

**Files:**
- Modify: `webgpu-graph-algorithms/src/layouts/force-simulation.ts` (the `perm` binding at `load()` `:979`, `makeResources` `:980`; `ModelResources.tiers`), `webgpu-graph-algorithms/src/layouts/model-common.ts` (`bindAttraction`, `recordAttraction`, `attractionSpecs`), `webgpu-graph-algorithms/src/layouts/forceatlas2.ts` (`buffers` unchanged; `specs` `:592-603`, `bind` `:612-672`, `paramsFor` `:681-705` -- the `hiEnd` / `midEnd` / `tierStart` values, `recordIteration` `:755-759`, `BoundModel.k2Bound` `:444-446`), `webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts` and `webgpu-graph-algorithms/src/layouts/spring-electrical.ts` (the same three members), `webgpu-graph-algorithms/test/helpers/fa2-parity.ts` (`ParityGraph` gains `"hub10k" | "rmat14"`, `paritySnapshot` builds them through `fixture()`)
- Modify (PD-1 region T6): `test/helpers/sabotage.ts` (the six K2 rows of `SABOTAGE_P4_TIERS`, `TIERS_INSPECT_TEST`, `ATTRACTION_WINDOWED_TEST`)
- Create: `webgpu-graph-algorithms/test/layouts/tiers-inspect.test.ts`, `webgpu-graph-algorithms/test/layouts/attraction-windowed.test.ts`
- NOT touched: `src/kernels.ts` (T5 declared the five fields), `test/kernel/struct-block.test.ts` (it lays out its own copy of the P3 blocks, `:80-100`), `src/wgsl/**` (T5)

**Interfaces:**
- Consumes: `degreeTiersOf` (T5), the `degreeOrder` view, `DegreeTiers`, the five `Fa2Params` fields (T5), `kernelSpec("fa2-attraction", ...)`, `subset` (`model-common.ts`), `plan1d`, `captureAllStages` / `stageReport` / `STAGE_KEYS` (`fa2-parity.ts`), `degreeWindowedRun`'s poison-tail idiom (`test/helpers/degree-check.ts:124-`).
- Produces: `ModelResources.tiers: DegreeTiers | null`; `bindAttraction(resources, k2Overrides): Promise<AttractionBound>` (`{ kernels: [Kernel, BoundKernel, DispatchPlan][] }` in dispatch order TIER 2, 1, 0), `recordAttraction(pass, bound, offset)`; `hiEnd` / `midEnd` / `tierStart` written from the tiers.

**PLAN DECISION PD-7 (the ranges in the params, the `perm` rule).** One `Fa2Params` per iteration is what the ring holds (`recordAndSubmit`, `force-simulation.ts:1340-1345`), so the up to three K2 dispatches of an iteration cannot each carry a `RangeParams`; instead the block carries the tier boundaries -- `hiEnd`, `midEnd` -- and each tier body reads its own range (TIER 2 `[0, hiEnd)`, TIER 1 `[hiEnd, midEnd)`, TIER 0 `[tierStart, tierEnd)` = `[midEnd, n)`), while `arcBase` / `arcEnd` / `accumulate` hold `0` / `arcCount` / `0` in every layout dispatch (DEP-P4-B: the layout never windows; the fields make K2 window-READY and the kernel-level test proves it). The five fields were declared in T5 Step 3 beside the body that reads them; this task fills `hiEnd` / `midEnd` / `tierStart` from the tiers. `ForceSimulation.load()` fetches `residency.view(snapshot, "degreeOrder")` and binds `perm` iff `segmentOffsets[2] > 0` (a row of degree >= 32 exists: the 7.3 rule); otherwise `perm` stays the `rowPtr` dummy and `USE_PERM` false, so every existing FA2 / FR / SE fixture below that degree compiles and runs the same pipelines as before and every committed noise fixture still matches bitwise (Step 4 proves it).

- [ ] **Step 1: Write the failing tests**

Create `test/layouts/tiers-inspect.test.ts` (the `fa2-inspect.test.ts` pattern, `:170-204`): for `hub10k` and `rmat14` (at `gpuScale()`), weighted and unweighted, 2D: `captureAllStages` twice, `expectBitwiseEqual` on every stage, then the `attraction` stage against the f64 oracle within the ANALYTIC bound `deg_i * 2^-22` per node (the floored per-node metric of `stageError` with the bound in place of a derived tolerance: `relTolerance`'s form; the derived `tiers-inspect.attraction` tolerance is T11's), and the pipeline keys of `fa2-attraction` created by the run carry `TIER` 0 / 1 / 2 with `USE_PERM: true` (`rmat14`) or `TIER` 0 / 2 (`hub10k` scaled to >= 1024 leaves; on a software adapter the scaled star of 200 leaves is TIER 0 / 1); `karate` creates `TIER: 0, USE_PERM: false` only; the FR and spring simulations on `rmat14` reach the same three keys; the pinned node case of `fa2-inspect.test.ts:206-238` re-run on `hub10k` with the hub pinned (its force is computed; its displacement 0); the writer case `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("fa2-attraction", "hub10k-K2-tiers", cls, capture.attraction.values, "f32")` on the UNSCALED `hub10k` plus the oracle's.

Create `test/layouts/attraction-windowed.test.ts` (the kernel-level window proof, the `degreeWindowedRun` idiom): compile `fa2-attraction` with `TIER 0`, `USE_PERM false`, dispatch it over hand-built windows of 64 arcs of `karate` (each window a COPY of its `colIdx` slice followed by 64 poison words of `INVALID_INDEX`, `arcBase = w.start`, `arcEnd = w.end`, `accumulate = 1` after a zero `fill` of `force`, rows `rowFirst..rowLast` through `tierStart / tierEnd`) and assert `force` equals the one-dispatch result bitwise (sums of identical terms in the same per-row order: the window loop folds the same arcs in the same order, so the result is bitwise equal, not merely within a bound), and that the `rebase-ignored`-style mutation (`colIdx[a - P.arcBase]` -> `colIdx[a]`) breaks it -- that row is `tier0-rebase-ignored` in Step 4.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/tiers-inspect.test.ts test/layouts/attraction-windowed.test.ts`
Expected: FAIL (`rmat14` runs TIER 0 only: no `perm` is bound; the K2 pipeline keys lack `TIER: 1`).

- [ ] **Step 2: The wiring**

`force-simulation.ts` `load()`: after `core = this.ctx.residency.core(snapshot)` (`:911`) and the windowed check, `const view = this.ctx.residency.view(snapshot, "degreeOrder"); const tiers = view.scalars.segmentOffsets[2] > 0 ? degreeTiersOf(view) : null;` (inside `n > 0`); the overrides line `:979` becomes `graphOverrides(core, tiers?.perm ?? null, weights)`; `makeResources` receives `tiers` and `ModelResources` gains `readonly tiers: DegreeTiers | null` and `perm` = `tiers?.perm ?? null`. In the three `paramsFor` (T5 Step 3 wrote `hiEnd: 0, midEnd: 0`): `const so = resources.tiers?.segmentOffsets; const hiEnd = so?.[1] ?? 0; const midEnd = so?.[2] ?? 0;` then `hiEnd, midEnd,` in the record and `tierStart: midEnd` (was `0`; `tierEnd` stays `n`, design 7.5: the thread-per-row tier runs to `n`). `model-common.ts`:

```ts
/** Compiles (TIER 0 always; TIER 1 when [hiEnd, midEnd) is non-empty; TIER 2 when hiEnd > 0, PD-7) and binds the fa2-attraction pipelines against the graph group and { pos, force, P }; the dispatch plans are plan1d(rows, 1) for TIER 2, plan1d(rows, WG / 32) for TIER 1, plan1d(rows) for TIER 0. */
export async function bindAttraction(resources: ModelResources, k2: Overrides, bindings: { pos: Binding; force: Binding; params: Binding }): Promise<AttractionBound>;
/** Records the K2 dispatches in order TIER 2, TIER 1, TIER 0 with the iteration's params offset. */
export function recordAttraction(pass: GPUComputePassEncoder, bound: AttractionBound, paramsOffset: number): void;
```

In the three models: `specs()` keeps listing the ONE `TIER 0` K2 spec (it has no `n`, so it cannot know which tiers a load needs); the `TIER` 1 / 2 pipelines compile at `bind()` through the cache on the first load that needs them (a one-time cost at that load, stated in the JSDoc), and `matrixCovers` covers their keys from the registry's `TIER` axis, so the FA2 specs pin (`fa2-options.test.ts:543-560`) is unchanged; `bind()` calls `bindAttraction` (`k2Bound` becomes `attraction: AttractionBound | null`, null when `arcCount === 0` as today); `recordIteration` calls `recordAttraction` where it dispatched `k2Bound`.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/tiers-inspect.test.ts test/layouts/attraction-windowed.test.ts test/layouts/fa2-options.test.ts test/layouts/fr-options.test.ts test/layouts/se-options.test.ts`
Expected: PASS (the three option suites unchanged: no specs pin moved).

- [ ] **Step 3: Nothing else moved**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts`
Expected: PASS on both: every committed FA2 / FR / SE noise fixture still matches bitwise (no committed fixture graph has a row of degree >= 32 except `star200`, whose 200-leaf hub row is in the MID tier: its committed `fa2-attraction` fixtures were recorded on `random1k`, so nothing re-records; the `star200` parity cases of `fa2-inspect.test.ts` now run the hub through TIER 1 and must still pass their derived tolerance -- a 200-term sum in five tree steps has LESS rounding than the serial 200-term sum, so the floor is not crossed; if a `star200` case fails, the tree is wrong, never the tolerance).

- [ ] **Step 4: The six K2 tier rows**

Append to `SABOTAGE_P4_TIERS["fa2-attraction"]` (`const TIERS_INSPECT_TEST = "test/layouts/tiers-inspect.test.ts";`; `const ATTRACTION_WINDOWED_TEST = "test/layouts/attraction-windowed.test.ts";`): `tier1-lane-stride-one`, `tier1-tree-step-quartered`, `tier1-rows-per-group-doubled` (`row = P.hiEnd + g * (WG / 32u) + lid / 32u;` -> `WG / 16u`), `tier2-lane-partial-written` (`if (valid && lid == 0u) { finish(i, t.xyz); }` -> `finish(i, f)`), `tier2-end-is-midend` (`var end = P.hiEnd;` -> `var end = P.midEnd;`), each measured by `TIERS_INSPECT_TEST`; and `tier0-rebase-ignored` (`let j = colIdx[a - P.arcBase];` -> `let j = colIdx[a];`, measured by `ATTRACTION_WINDOWED_TEST`, whose poison tail turns the mutant's reads into `INVALID_INDEX` neighbours that `pos[j]` reads out of bounds -- WGSL clamps, the force changes by order 1). `test/sabotage/tiers.test.ts` (T5) runs them with the named check.

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/tiers.test.ts test/sabotage/coverage.test.ts`
Expected: PASS, eighteen rows.

- [ ] **Step 5: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): run the attraction kernel over the degree tiers in every layout model` through `tools/commit-changes.sh`. The body records PD-7.

---

### Task P4-T7: Windowed execution for `degree` and `segmentedReduce`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 4.2 (`:1150`: the windowed row -- per-array buffers, an array split across buffers at window boundaries when it exceeds `maxBufferSize`, `ArcWindow { start, end, rowFirst, rowLast, bufferIndex, offset }`, kernels get `start` as a rebase uniform and iterate `[max(rowPtr[u], start), min(rowPtr[u+1], end))`, a row longer than a window accumulates across dispatches), 4.6 (`:1287-1289`: the per-row gather family executes windows, "one dispatch per window, accumulating into the same output"), 13 row P4 gate ("windowed `degree` with a FAKED 1 MiB binding limit (>= 8 windows) and a hub row longer than a window equals `outDegree()`"), 11.9 item 1 ("the rebase uniform ignored in a windowed dispatch").

**Files:**
- Modify: `webgpu-graph-algorithms/src/memory/residency.ts` (`CoreBinding` `:47-56` gains `arcBuffers`; `core()` `:303-357` executes the windowed plan; `ResidencyRecord` `:134-155` gains `windowKeys`), `webgpu-graph-algorithms/src/primitives/core-shape.ts` (`windowBinding`; `assertNotWindowed` kept for the pull), `webgpu-graph-algorithms/src/algorithms/degree.ts` (the window loop; `coreOf` `:65-78` no longer re-throws), `webgpu-graph-algorithms/src/primitives/segmented-reduce.ts` (the window loop in `record()`), `webgpu-graph-algorithms/test/memory/residency.test.ts` (`:732-745`), `webgpu-graph-algorithms/test/algorithms/degree.test.ts` (`:162-200`), `webgpu-graph-algorithms/test/primitives/segmented-reduce.test.ts` (the windowed leg of `:345-357`), `webgpu-graph-algorithms/test/helpers/degree-check.ts` (`degreeFakedLimitRun`)
- Modify (PD-1 region T7): `test/helpers/sabotage.ts` (one `segmented-reduce` row in `SABOTAGE_P4_TIERS`: `accumulate-ignored`, measured by the windowed leg)
- Create: `webgpu-graph-algorithms/test/memory/windowed.test.ts`
- NOT touched: `src/primitives/spmv.ts` (DEP-P4-B), `src/layouts/force-simulation.ts` (`:912-923` stays), `src/memory/upload-plan.ts` (the planner is complete)

**Interfaces:**
- Consumes: `planUpload` / `PlannedArray` / `WindowedPlan` (`upload-plan.ts:30-34,66-71,280-350`), `upload()` (`residency.ts:809-832`, keyed on an object), `fill`, `RANGE_PARAMS`, `fakeCaps`, `GraphResidency`'s constructor (`residency.test.ts:735-736`), the degree test's residency Proxy (`degree.test.ts:168-185`), `outDegreeOracle`, `segmentedReduceOracle`.
- Produces: `CoreBinding.arcBuffers: Readonly<Record<"colIdx" | "weights" | "arcToEdge", readonly GPUBuffer[]>> | null` (non-null iff `plan === "windowed"`; `windows` non-null then), `windowBinding(core, name, w): Binding` (buffer `arcBuffers[name][w.bufferIndex]`, offset `w.offset`, size `4 * (w.end - w.start)`, `window: w`); `degree` and `segmentedReduce` over a windowed core.

**PLAN DECISION PD-8 (the window loop).** A row-walking dispatch over window `w` covers rows `[w.rowFirst, w.rowLast]` with `arcBase = w.start`, `arcEnd = w.end` and reads `colIdx[arc - arcBase]` from the window's binding; a row split across windows is visited by each of them and its partial contributions must ADD, so every windowed dispatch runs with `accumulate = 1` over an output pre-filled with the identity element (`0` for `degree` and `sum`, `F32_MAX` / `-F32_MAX` for `min` / `max`: the `fill` kernel's u32 value pattern of the identity's bits, computed on the host with a `DataView`). With the identity in place, a row that lives in one window accumulates onto the identity and gets its exact value, so no special case distinguishes split rows from whole ones. `colIdx` and `weights` of a windowed core are bound per window; `rowPtr` is whole (it must fit a binding, else `E_TOO_LARGE { path: "rowPtr" }` from the planner). `CoreBinding.colIdx` / `weights` of a windowed core are window 0's bindings so a caller that ignores windows binds something valid -- and `assertNotWindowed` (for the pull) keeps it from running.

- [ ] **Step 1: Write the failing tests**

Create `test/memory/windowed.test.ts` (the `residency.test.ts:732-745` idiom: a `GraphResidency` over `fakeCaps(ctx.caps, { maxStorageBufferBindingSize: LIMIT })` on a real device): (1) `karate` at a 256-byte limit: `core.plan === "windowed"`, `core.windows.length === planUpload(s, caps, ["rowPtr", "colIdx"]).windows.length`, `core.arcBuffers.colIdx.length === 1`, `residency.stats().buffers === 2` (rowPtr + one colIdx buffer), `windowBinding(core, "colIdx", core.windows[1]).offset === core.windows[1].offset`; (2) a graph whose `colIdx` exceeds a faked `maxBufferSize` as well (`fakeCaps(..., { maxStorageBufferBindingSize: 256, maxBufferSize: 512 })` on `karate`'s 624-byte colIdx): `arcBuffers.colIdx.length === 2` with the windows' `bufferIndex` / `offset` re-placed exactly as `placeWindows` reports; (3) `release(s)` destroys every window buffer (`allocator.liveBuffers` back to 0); (4) a second `core()` call returns the memoised bindings (no new buffer).

In `test/helpers/degree-check.ts` add `degreeFakedLimitRun(ctx, s, bindingLimit, label)`: a `GraphResidency` over `fakeCaps(ctx.caps, { maxStorageBufferBindingSize: bindingLimit })`, the residency Proxy of `degree.test.ts:168-185`, `degree(proxied, s)` vs `outDegreeOracle`, returning the run and the window count. Replace `degree.test.ts:162-200` with: the G4 item -- a graph of `2^20 * gpuScale()` nodes and `10 * n` edges plus one star of `ceil(300_000 * gpuScale())` leaves (its hub row is longer than a window), at a faked limit of `Math.max(256, 256 * Math.round((2 ** 20) * gpuScale() / 256))` bytes (1 MiB on hardware, 20,992 B on a software adapter): `windows >= 8`, the hub row spans at least two windows (assert on the plan), the result equals `outDegree()` bitwise, twice; and the error legs kept (`E_RELEASED` passes through). Replace the windowed leg of `segmented-reduce.test.ts:345-357` with a `sum` / `min` / `max` x `weight` run over the same faked-limit residency on `rmat14` (rows split across windows) equal to the oracle within `relTolerance`, twice bitwise -- run TWICE over: once with `tiers: undefined` (TIER 0 alone) and once with `tiers: "auto"` (`rmat14` populates all three tiers, T5 Step 1), asserting for the tiered run that the pipeline keys carry `TIER` 0, 1 and 2 with `USE_PERM: true` and that the result equals the untiered windowed result within `relTolerance` (the tiers change the fold order, not the terms). The tiered windowed run is the only test of the windows-times-tiers path (Step 3), which `spmvPull` never reaches (DEP-P4-B).

Run: `cd $PKG && pnpm exec vitest run --project=node test/memory/windowed.test.ts test/algorithms/degree.test.ts test/primitives/segmented-reduce.test.ts`
Expected: FAIL (`E_TOO_LARGE { path: "windowed" }` from `core()`).

- [ ] **Step 2: The residency**

In `core()` replace the throw (`:309-320`) with the windowed branch: when `plan.kind === "windowed"` and `record.plan === null`, for each `PlannedArray` in `plan.arrays` whose name is arc-indexed (`colIdx`, `weights`, `arcToEdge`) upload each of its `buffers` ranges as its own resident -- `this.upload(record, this.windowKey(record, name, index), new Uint8Array(array.buffer, array.byteOffset + range.byteOffset, range.byteLength), `residency:core:${serial}:${name}:w${index}`)` with `windowKey` a marker object per `(name, index)` kept in `record.windowKeys: Map<string, object>` (the `packKey` pattern, `:600-608`); `rowPtr` (and a present `edgeToArc`) as a whole buffer through `bindCore`; store `record.windows = plan.windows` and `record.arcBuffers`. The returned `CoreBinding` carries `plan: "windowed"`, `windows`, `arcBuffers`, and `colIdx` / `weights` = `windowBinding(core, name, windows[0])`. `release()` already destroys every `record.entries` resident.

- [ ] **Step 3: The two consumers**

`core-shape.ts`: `windowBinding(core, name, w)` (`E_INVALID_ARGUMENT` when `arcBuffers` is null or the name is absent) and `identityFillWord(op)` (the u32 bit pattern of `0`, `F32_MAX`, `-F32_MAX`). `degree.ts`: `coreOf` returns `ctx.residency.core(s)` as is; when `core.windows !== null`: a `fill` of `out` (`count n, value 0, mode 0`) then, per window, the degree dispatch with `RANGE_PARAMS { start: w.rowFirst, end: w.rowLast + 1, arcBase: w.start, arcEnd: w.end, accumulate: 1, n }` and `graphBindings` built from `{ ...core, colIdx: windowBinding(core, "colIdx", w), weights: core.weights === null ? null : windowBinding(core, "weights", w) }` (a params buffer per window from the pool, released in the `finally`). `segmented-reduce.ts` `record()`: the same loop with the identity fill (`fill` compiled at prepare time; `scope.params(FILL_PARAMS, ...)`), `accumulate: 1`, and per window EVERY tier dispatch over its FULL tier range -- never intersected with the window's rows. A tier range `[so[k], so[k+1])` is a range of PERMUTATION positions (the body visits `i = perm[row]`, `segmented-reduce.wgsl.ts:21`, T5's `row_node`), while `w.rowFirst` / `w.rowLast` are NODE indices (`upload-plan.ts:207,216`), so the two ranges are not comparable and an intersection would skip tier rows whose `perm[row]` lies inside the window and dispatch rows outside it. Running the full tier range per window is correct because a row whose arcs lie outside `[w.start, w.end)` folds nothing (`a0 = max(rowPtr[i], P.arcBase) >= a1 = min(rowPtr[i + 1u], P.arcEnd)`), so it computes `identity()` and `finish` writes `comb(out[i], identity())` = `out[i]`; the cost is `windows x (rows of the tier)` idle threads, which the window count bounds (>= 33,554,432 arcs per window at the default limit, 4.2 `:1150`). Without tiers the single TIER 0 dispatch keeps `[w.rowFirst, w.rowLast + 1)` (`USE_PERM` false: row == node, so the window's rows are exactly the rows with arcs in it); without windows the existing single-window path (`arcBase 0`, `arcEnd arcCount`, the caller's `accumulate`). `assertNotWindowed` is deleted from `segmented-reduce.ts` and kept in `spmv.ts` (`feature: "spmvPull.windowed"`).

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/memory test/algorithms/degree.test.ts test/primitives/segmented-reduce.test.ts test/primitives/tiers.test.ts test/layers.test.ts`
Expected: PASS (`layers.test.ts`: `core-shape.ts` still imports only `errors`, `residency` types and `types/memory`).

- [ ] **Step 4: The sabotage row and the green check**

Append to `SABOTAGE_P4_TIERS["segmented-reduce"]`: `{ name: "accumulate-ignored", find: "fn finish(i: u32, acc: f32) { out[i] = select(acc, comb(out[i], acc), P.accumulate == 1u); }", replace: "fn finish(i: u32, acc: f32) { out[i] = acc; }", minFactor: 10, test: SEGMENTED_REDUCE_TEST }` -- measured by the windowed leg of `segmented-reduce.test.ts` (the `tiers.test.ts` runner dispatches on the `test` field: it calls the windowed check for this row). The `degree` kernel's `rebase-ignored` row (`sabotage.ts:63-70`) already covers the rebase through the row-window leg.

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/memory test/algorithms test/primitives test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both; coverage at or above 80 / 80 / 75 / 80 (the windowed branch of `core()` is reached by the faked-limit tests on every adapter).

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): execute windowed uploads for degree and segmentedReduce` through `tools/commit-changes.sh`. The body records PD-8 and names DEP-P4-B as the record P4-T16 writes.

---

### Task P4-T8: The grid build, part 1 -- `GridSpec`, cell keys, the sort, `cellHist` and `cellStart`

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.7 geometry table (`:1938-1954`: `G = clamp(nextPow2(2 sqrt(n)), 8, gridMax2D = 512)` / `clamp(nextPow2(2 cbrt(n)), 8, gridMax3D = 128)`, the cell size floor `max(extent, 1e-6) / G`, the outside pseudo-cell `G^dim` with `cellHist` / `cellStart` of `cells + 2` entries, levels `log2(G / 4) + 1`), G1 (`:1970`: `key[i] = linearise(floor((p - state.gridMin) / state.cellSize))` when every axis is in `[0, G)`, else the pseudo-cell; `val[i] = i`; 19-bit keys in 2D at 512^2, 22-bit in 3D, "still 3 passes at `bits = 24`"), G2 (`:1971`: the stable sort, `countingSortByKey` when `deterministic: false`), G3 (`:1972`: the histogram after a clear, `cellStart = exclusiveScan(cellHist)` over `cells + 2` entries), 6 row 12 (`:1579`: `buildGrid(batch, positions, n, dim, spec: GridSpec) -> GridBinding`; a scan over marks would leave empty cells unreadable), 7.3 (`:1740-1742`), 13 row P4 gate ("`cellStart` correct with empty cells"; "the 11.9 sabotage matrix for G1-G7 (dropped pseudo-cell, ...)").

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/grid-cell-key.wgsl.ts`, `webgpu-graph-algorithms/src/primitives/grid.ts`, `webgpu-graph-algorithms/test/oracle/grid.ts`, `webgpu-graph-algorithms/test/primitives/grid.test.ts`, `webgpu-graph-algorithms/test/sabotage/grid-build.test.ts`
- Modify: `webgpu-graph-algorithms/src/constants.ts` (append `GRID_MIN_SIDE = 8`, `GRID_COARSEST_SIDE = 4`, `GRID_HUB_CELL = 1024`, `GRID_EXTENT_FLOOR = 1e-6`, `GRID_BBOX_MARGIN = 1.01`, `GRID_SORT_BITS = 24`), `webgpu-graph-algorithms/src/kernel/prelude.ts` (`const GRID_HUB_CELL: u32 = ${GRID_HUB_CELL}u;`, `const GRID_EXTENT_FLOOR: f32 = ...;` and `const GRID_BBOX_MARGIN: f32 = ...;` interpolated beside the FA2 floors `:48-51`), `webgpu-graph-algorithms/test/device/constants.test.ts` (the six pinned)
- Modify (PD-1 regions T8): `src/kernels.ts` (`"grid-cell-key"`, the entry, the row; `FA2_STATE`: `["reserved0", "vec2f"]` -> `["invCellSize", "f32"], ["reserved0", "f32"]` with the JSDoc `invCellSize` @120), `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts` (`"grid-cell-key": 4`), `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`P4: 8`), `test/helpers/sabotage.ts` (three `grid-cell-key` rows in `SABOTAGE`, `GRID_TEST`)
- NOT touched: `src/layouts/**` (T10 consumes `prepareGridBuild`), `src/primitives/histogram.ts` / `radix-sort.ts` / `scan.ts` (consumed as they are: G3 IS the `histogram` kernel over `cellKey`, no new id)

**Interfaces:**
- Consumes: `prepareRadixSort` (T4), `prepareCountingSort` / `prepareHistogram` (T3), `prepareScan` (T2), `fill`, `FA2_STATE` / `FA2_PARAMS` (the blocks G1 reads), `ReduceScope`, `plan1d`, `Lcg` (`src/layouts/seed.ts:26`) for the fixtures' positions.
- Produces: `GridSpec`, `gridSpecFor(n, dim, tuning)`, `gridPyramidBytes(spec)`, `GridBuildBindings` (`pos`, `state`, `params`, `cellKey`, `cellVal`, `sortedKey`, `sortedIdx`, `cellHist`, `cellStart`), `prepareGridBuild(scope, spec): Promise<GridBuildPlanner>` with `bind(bindings)` and `record(pass, n, paramsOffset, upTo?: "G1" | "G2" | "G3")` (G1, the sort, the histogram, the scan; `upTo` stops after the named stage) and `readonly lastDispatches`; the `grid-cell-key` entry; the JS oracle `gridOracle(...)` (keys, the stable order, `cellHist`, `cellStart`; T9 extends it with the pyramid); the ten positioned fixtures.

**PLAN DECISION PD-9 (`GridSpec` on the host).** `G = clamp(nextPow2(2 * ceil(n^(1 / dim))), GRID_MIN_SIDE, floorPow2(gridMax))` (`nextPow2` and `floorPow2` by doubling loops, no bit tricks), `levels = log2(G / GRID_COARSEST_SIDE) + 1`, `cells = G^dim`, `levelOffsets[0] = 0`, `levelOffsets[L + 1] = levelOffsets[L] + (G / 2^L)^dim + (L === 0 ? 1 : 0)` (the pseudo-cell sits at index `cells` of level 0), `pyramidCells = levelOffsets[levels - 1] + GRID_COARSEST_SIDE^dim`. At the caps: 349,521 cells = 5.59 MB in 2D, 2,396,737 = 38.3 MB in 3D (the design's numbers plus the pseudo-cell). A `gridMax` that is not a power of two rounds DOWN to one so `G` stays a power of two and every level side is an integer; `resolveLayoutTuning` keeps accepting any positive integer (its P3 contract) and `gridSpecFor` documents the rounding.

**PLAN DECISION PD-10 (`invCellSize`, the keys are bitwise).** `floor((p - gridMin) / cellSize)` puts a division in every key; f32 division is not correctly rounded on the RTX 4070 SUPER (2.5 ulp, G3-F6, `CLAUDE.md:372`) while lavapipe divides exactly, so the same node could land on either side of a cell boundary on two adapters and a JS oracle could not reproduce the GPU's keys. `(p - gridMin) * invCellSize` is a subtraction and a multiply, both correctly rounded on every IEEE device (no `fma` contraction: nothing is added after the multiply), so an oracle that reads the GPU's own `gridMin` / `invCellSize` (from `inspect("state")`, or the values the test wrote) computes every key BITWISE. K1 (T10) writes `invCellSize = 1 / cellSize` once per iteration beside `cellSize` in `gridMin.w`; the clamp `clamp(q, -1, G + 1)` before the `floor` keeps a far-away or NaN coordinate from an out-of-range float-to-int conversion, and anything outside `[0, G)` on any axis is the pseudo-cell.

**PLAN DECISION PD-11 (the scratch is per load).** The named grid buffers (`cellKey`, `cellVal`, `sortedKey`, `sortedIdx`, `cellHist`, `cellStart`, and T9's) are `BufferSpec`s of the model so `inspect(name)` reaches them; the anonymous scratch (the radix histogram table, the scan block sums, the counting-sort cursor, the static params records of every sub-dispatch) comes from ONE `Lease` the stage takes at `bind()` and releases at the next bind or dispose -- per load, never per batch, so the bind groups are built once. The sub-dispatch params (`RadixParams`, `ScanParams`, `HistParams`, `FillParams`, T9's level params) are constant for a load and are written ONCE into a 256-byte-slot uniform arena of that lease, so the grid build's `ReduceScope.params()` hands out arena slots and no per-iteration uniform write is needed beyond the `Fa2Params` the ring already holds.

**PLAN DECISION PD-12 (`fill`, not `clearBuffer`).** K1 reads the PREVIOUS iteration's `cellHist[cells]` (the outside count) at the top of the iteration; the histogram of THIS iteration must start from zero after that read. A `clearBuffer` needs the encoder outside a pass and would split the iteration's pass in three; a `fill` dispatch over `cells + 2` words inside the pass costs one dispatch and keeps the ordering explicit (K1, K2, fill, G1, ...). The `histogram` and `countingSortByKey` planners already fill their targets (T3), so the grid build records no separate fill. Design 7.7 G3 (`:1972`) says `encoder.clearBuffer(cellHist)`: DEP-P4-H. G3 is the T3 `histogram` kernel over `cellKey` and G4a (T9) is the T1 `indirect-finalize`, not the design's `grid-cell-hist` / `grid-hub-finalize` ids: DEP-P4-I.

- [ ] **Step 1: The constants, the fixtures and the oracle**

Append the six constants to `src/constants.ts` after `FA2_FLAG_FIRST` (P5's `FR_*` / `SE_*` tables follow it; append after those) with JSDoc citing 7.7 (`GRID_HUB_CELL = 1024`: "a cell with more than this many entries is summed by a workgroup (G4b)"; `GRID_SORT_BITS = 24`: PD-5), interpolate `GRID_HUB_CELL`, `GRID_EXTENT_FLOOR` and `GRID_BBOX_MARGIN` into the prelude (`prelude.ts:48-51`, the `wgslF32Literal` form for the two f32), and pin the six in `test/device/constants.test.ts` beside `:145`.

The POSITIONED fixtures, which P4-T5 Step 1 added to `FIXTURE_NAMES` and `fixture()` in `test/helpers/graphs.ts` with these definitions (T8 uses them and edits nothing there) (each returns `positions` non-null, in `[-1, 1)` scene units for a scale-1 zero-centre layout, built with `xorshift`): `random20k` (`sized(20_000, 400)` nodes over `randomEdges(n, 5 n)`, every position uniform in `[-1, 1)` per axis from the same `xorshift` stream: the UNIFORM fixture every grid suite and every grid noise row starts from), `clumpy10` / `clumpy100` / `clumpy1000` (`sized(20_000, 400)` nodes over `randomEdges(n, 5 n)`, positions drawn from K Gaussian blobs -- centres uniform in `[-0.8, 0.8)`, sigma `0.02` -- with the Box-Muller pair), `line` (`sized(20_000, 400)` nodes, every position on `y = 0.3 x + 0.1`, `z = 0`), `polyline163` (163 nodes on an irregular closed polygon: angle `2 pi k / 163`, radius `0.5 + 0.3 sin(3 theta) + 0.1 xorshift`, `pathEdges` closed into a cycle; DEP-P4-C), `onecell1k` (`1_024` nodes of `randomEdges(1024, 5120)` at positions inside a `1e-3` box around `(0.1, 0.1)`: exactly `GRID_HUB_CELL` entries in one finest cell -- the G4 boundary), `onecell1025` (`1_025`, one over the threshold: the hub path), `outside5` (`karate` with five positions at `(50, 50, 0)`, `(-50, 20, 0)`, ...: the pseudo-cell). `hubcell` (T9's "1M-entry hub cell") is `random20k`-sized nodes all inside one cell: `sized(20_000, 400)` in the same `1e-3` box.

Create `test/oracle/grid.ts`:

```ts
export interface GridOracleInput { readonly positions: Float32Array /* stride 4: xyz + mass, layout units */; readonly n: number; readonly spec: GridSpec; readonly gridMin: readonly [number, number, number]; readonly invCellSize: number; }
export interface GridOracleBuild { readonly cellKey: Uint32Array; readonly sortedIdx: Uint32Array /* stable: key, then index */; readonly cellHist: Uint32Array /* cells + 2 */; readonly cellStart: Uint32Array /* cells + 2 */; readonly outside: number; readonly maxOccupancy: number; }
export function gridOracleBuild(input: GridOracleInput): GridOracleBuild;   // keys in f32 arithmetic: q = fround(fround(p - gridMin) * invCellSize) per axis, c = floor(clamp(q, -1, G + 1)), inside iff 0 <= c < G on every axis, key = cx + G cy (+ G^2 cz), else cells
```

Add to `test/oracle/oracles.test.ts` two pure cases: four points on a 2 x 2 grid (`G = 8` at `n = 4`: keys by hand, one outside point -> key 64, `cellStart[65] === 4`); the stable order of two coincident points.

Run: `cd $PKG && pnpm exec vitest run --project=node test/device/constants.test.ts test/oracle/oracles.test.ts`
Expected: PASS.

- [ ] **Step 2: Write the failing tests**

Create `test/primitives/grid.test.ts` (node project). The harness: a `testReduceScope(ctx)`, a `Fa2State` buffer written by `FA2_STATE.write` with `gridMin`, `gridMin.w = cellSize`, `invCellSize`, a `Fa2Params` buffer written with `n`, `dim`, `gridMax = spec.g`, `levels`, `nearMax`, the model buffers from `scratchBuffer`, and `prepareGridBuild(scope, spec)`; `gridMin` / `cellSize` chosen by the test from the fixture's bbox exactly as K1 will (`extent = max(bbox side * GRID_BBOX_MARGIN, GRID_EXTENT_FLOOR)`, `gridMin = centroid - extent / 2`, `cellSize = extent / G`, `invCellSize = 1 / cellSize`, all in f32 through `Math.fround`). Each its own `it`: (1) `gridSpecFor` pins: `n = 4` -> `G 8, levels 2, cells 64, levelOffsets [0, 65], pyramidCells 81`; `n = 100_000` 2D -> `G 512, levels 8, cells 262,144, pyramidCells 349,521`; 3D `n = 1_000_000` -> `G 128, levels 6, pyramidCells 2,396,737`, `gridPyramidBytes` 38,347,792 (<= 40 MB, the gate's bound); `gridMax2D: 32` -> `G 32` at `n = 100_000`; `gridMax2D: 100` -> `G 64`; (2) for `random20k`, `clumpy100`, `line`, `outside5`, `onecell1k`, `coincident` (the `cellSize` floor: every node in the same cell, `extent = 1e-6`), in 2D and 3D, with `deterministic: true`: `cellKey`, `sortedIdx`, `cellHist`, `cellStart` equal `gridOracleBuild` BITWISE (`sortedIdx` bitwise because the sort is stable and the oracle's order is key-then-index), `cellStart[cells + 1] === n`, run twice bitwise first; (3) the same with `deterministic: false`: `cellHist` and `cellStart` bitwise, `sortedIdx` a permutation whose keys are sorted (set-level); (4) empty cells: on `clumpy10` at least 90 % of `cellHist[0 .. cells)` are 0 and `cellStart` still increases weakly everywhere; (5) `n = 0` records nothing; (6) the writer cases `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("grid-cell-key", "random20k", cls, cellKey, "u32")`, `writeNoiseFixture("histogram", "random20k-cellHist", cls, cellHist, "u32")` (the histogram's output under its own id) and `writeNoiseFixture("scan-add", "random20k-cellStart", cls, cellStart, "u32")` (the scan of that histogram: every block after the first is placed by the add-back, so this is `scan-add`'s own noise row, rule (f)) on the UNSCALED `random20k` (the oracle's under `"oracle-f64"`; all three are u32, bitwise across adapters by PD-10).

Create `test/sabotage/grid-build.test.ts`: the find-once loop over `SABOTAGE["grid-cell-key"]`, then per row `withSabotage` on case 2's `random20k` + `outside5` comparison (bitwise report).

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/grid.test.ts`
Expected: FAIL (`Cannot find module '../../src/primitives/grid.js'`).

- [ ] **Step 3: The body and the block field**

Create `src/wgsl/grid-cell-key.wgsl.ts`:

```ts
/**
 * G1, the `grid-cell-key` kernel body (spec 7.7; P4-T8): the finest cell of every node from the state's robust extent,
 * `floor((p - gridMin) * invCellSize)` (a multiply, correctly rounded everywhere: PD-10), linearised when every axis
 * is in [0, G) and the outside pseudo-cell `cells` otherwise; `cellVal[i] = i`. The clamp before the floor keeps a
 * far-away or NaN coordinate out of an out-of-range float-to-int conversion. Body only; normative text.
 */
export const gridCellKeyWgsl = /* wgsl */ `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_cell_key(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    let cells = grid_cells();
    let gf = f32(P.gridMax);
    let q = (pos[i].xyz - S.gridMin.xyz) * S.invCellSize;          // PD-10: never a division
    let c = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    let g = i32(P.gridMax);
    var inside = c.x >= 0 && c.x < g && c.y >= 0 && c.y < g;
    if (P.dim == 3u) { inside = inside && c.z >= 0 && c.z < g; }
    var key = cells;                                               // the outside pseudo-cell (7.7)
    if (inside) {
        key = u32(c.x) + P.gridMax * u32(c.y);
        if (P.dim == 3u) { key = key + P.gridMax * P.gridMax * u32(c.z); }
    }
    cellKey[i] = key;
    cellVal[i] = i;
}
`;
```

Registry (PD-1 region T8): `GRID_CELL_KEY` (`pos` ro (1,0) `array<vec4f>`, `S` ro (1,1) `Fa2State`, `cellKey` rw (1,2) `array<u32>`, `cellVal` rw (1,3) `array<u32>`, `P` (2,0) `Fa2Params`; `uniforms: [FA2_PARAMS, FA2_STATE]`; `needs: []`; phase `"P4"`); `FA2_STATE`'s `reserved0` split (the Files list); mirrors (`storageCount` 4; compile pin 1; `P4: 8`).

- [ ] **Step 4: The build planner**

Create `src/primitives/grid.ts`: `GridSpec`, `gridSpecFor`, `gridPyramidBytes`, and

```ts
export interface GridBuildBindings { readonly pos: Binding; readonly state: Binding; readonly params: Binding; readonly cellKey: Binding; readonly cellVal: Binding; readonly sortedKey: Binding; readonly sortedIdx: Binding; readonly cellHist: Binding; readonly cellStart: Binding; }
export interface GridBuildPlanner {
    bind(bindings: GridBuildBindings): void;                       // takes the per-load scratch from the scope (PD-11) and builds every bind group
    record(pass: GPUComputePassEncoder, n: number, paramsOffset: number, upTo?: "G1" | "G2" | "G3"): void;   // G1 (plan1d(n), the Fa2Params slot), then deterministic: radixSort(cellKey, cellVal, n, GRID_SORT_BITS) into (sortedKey, sortedIdx) + histogram(cellKey, n, cells + 2, cellHist) + scan(cellHist, cells + 2, cellStart); else countingSortByKey(cellKey, n, cells + 2, { hist: cellHist, cursor }, sortedIdx, cellStart). `upTo` stops after the named stage (G1 the keys, G2 the sort, G3 the histogram and its scan; the non-deterministic path has no G2 stop and treats "G2" as "G3") -- the stop points RepulsionGrid.recordRepulsion (T10) and debugRunStages (PD-17) consume
    readonly lastDispatches: number;
}
export async function prepareGridBuild(scope: ReduceScope, spec: GridSpec): Promise<GridBuildPlanner>;
```

`record()` throws `E_INVALID_ARGUMENT` for `n === 0` (the caller never records a grid iteration for an empty graph; `ForceSimulation` loads an empty graph with no GPU work). The `histogram` over `cells + 2` bins with keys `<= cells` leaves bin `cells + 1` at 0, so the scan's last entry is `n`.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/primitives/grid.test.ts test/kernel`
Expected: PASS (six cases); the compile matrix at P4 8.

- [ ] **Step 5: The sabotage rows**

Append to `SABOTAGE` (`const GRID_TEST = "test/primitives/grid.test.ts";`):

```ts
    "grid-cell-key": Object.freeze([
        { name: "pseudo-cell-dropped", find: "var key = cells;", replace: "var key = cells - 1u;", minFactor: 10, test: GRID_TEST },
        { name: "axes-swapped", find: "key = u32(c.x) + P.gridMax * u32(c.y);", replace: "key = u32(c.y) + P.gridMax * u32(c.x);", minFactor: 10, test: GRID_TEST },
        { name: "floor-replaced-by-round", find: "let c = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));", replace: "let c = vec3<i32>(round(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));", minFactor: 10, test: GRID_TEST },
    ]),
```

(`pseudo-cell-dropped` is the design's named mutation: an outside node lands in the last real cell.)

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/grid-build.test.ts test/sabotage/coverage.test.ts`
Expected: PASS, three rows `Infinity`.

- [ ] **Step 6: Green check on both adapters**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/kernel test/sabotage && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both (`cellKey` bitwise identical on both adapters for every fixture, PD-10); coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 7: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the grid spec, the cell keys and the sorted cell ranges` through `tools/commit-changes.sh`. The body records PD-9, PD-10, PD-11, PD-12.

---

### Task P4-T9: The grid build, part 2 -- centroids, the hub cells and the pyramid

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.7 G4 (`:1973`: thread per cell, the pseudo-cell included; `count = cellStart[c+1] - cellStart[c]`; `atomicMax(&hubCounters.maxOccupancy, count)`; `count <= 1024`: the mass-weighted sum into `level0[c] = vec4f(sum m x, sum m y, sum m z, sum m)`; `count > 1024`: append `c` to `hubList`), G4a (`:1974`), G4b (`:1975`: a workgroup per hub cell, a 256-wide strided sum with a workgroup reduce), G5 (`:1976`: one dispatch per coarser level, parent = the sum of its 4 / 8 children, the pseudo-cell never downsampled), 6 row 12 (`:1579`: "no atomics, no fixed point" for the centroids), 6 determinism policy (grid centroids bitwise reproducible), 13 row P4 gate ("a 1M-entry hub cell dispatched through G4b"; "wrong level offset"; "pyramid <= 40 MB in 3D").

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/grid-centroid.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/grid-centroid-hub.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/grid-downsample.wgsl.ts`, `webgpu-graph-algorithms/test/primitives/grid-pyramid.test.ts`, `webgpu-graph-algorithms/test/sabotage/grid-pyramid.test.ts`
- Create (continued): `webgpu-graph-algorithms/src/primitives/grid-pyramid.ts` (`GridPyramidBindings`, `preparePyramid`, `GridPyramidPlanner`), `webgpu-graph-algorithms/test/oracle/grid-pyramid.ts` (`gridOraclePyramid`: every level in f64, the hub list)
- Modify (PD-1 regions T9): `src/kernels.ts` (three ids, `GRID_LEVEL_PARAMS`, three entries, three rows), `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts` (`"grid-centroid": 6, "grid-centroid-hub": 6, "grid-downsample": 1`), `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`P4: 11`), `test/helpers/sabotage.ts` (nine rows, `PYRAMID_TEST`)

**Interfaces:**
- Consumes: the T8 build (`sortedIdx`, `cellStart`), the T1 finalize (`INDIRECT_PARAMS`, `Kernel.dispatchIndirect`), `wg_reduce_vec4`, `GRID_HUB_CELL` (prelude), `plan1d`.
- Produces: `GRID_LEVEL_PARAMS` (`GridLevelParams`: `childBase` @0, `parentBase` @4, `parentSide` @8, `parentCells` @12, `depth` @16 (1 in 2D, 2 in 3D), `pad0` @20, `pad1` @24, `pad2` @28); the entries `grid-centroid` (6 storage: `sortedIdx` ro, `cellStart` ro, `pos` ro, `pyramid` rw `array<vec4f>`, `hubList` rw `array<u32>`, `hubCounters` rw `array<atomic<u32>>`; `P: Fa2Params`), `grid-centroid-hub` (6 storage: `sortedIdx` ro, `cellStart` ro, `pos` ro, `pyramid` rw, `hubList` ro, `hubCount` ro `array<u32>` -- the design's five plus the count the guard reads, DEP-P4-L; `P: Fa2Params`; `needs: ["subgroups"]`), `grid-downsample` (1 storage: `pyramid` rw; `P: GridLevelParams`); `GridPyramidBindings` (`pos`, `params`, `sortedIdx`, `cellStart`, `pyramid`, `hubList`, `hubCounters`, `hubArgs`); `preparePyramid(scope, spec): Promise<GridPyramidPlanner>` with `bind(bindings)` and `record(pass, paramsOffset, upTo?: "G4" | "G5")` (G4, G4a, G4b, G5 x (levels - 1); `upTo: "G4"` stops after G4b); `gridOraclePyramid(build, input): { levels: Float64Array[]; hubCells: number[]; maxOccupancy: number }`.

**PLAN DECISION PD-13 (the hub path).** G4 is thread-per-cell over `cells + 1` cells and sums a cell serially; above `GRID_HUB_CELL` entries it appends the cell index to `hubList` with `atomicAdd(&hubCounters[0], 1u)` and writes nothing (results are per cell, so the list's order is irrelevant). G4a is the T1 finalize over `hubCounters[0]` into `hubArgs` slot 0 with `wg = WG`. G4b is dispatched indirectly, one workgroup per hub cell; it GUARDS its work by `valid = h < hubCount[0]` instead of returning early (the guard keeps the `wg_reduce_vec4` in uniform control flow without leaning on the uniformity of a storage load; a workgroup past the count sums an empty range and writes nothing), reads `hubCounters` through a second, read-only `array<u32>` binding named `hubCount`, and sums the cell with a `WG`-strided loop and the prelude's reduction (the subgroup variant and the twin). `atomicMax(&hubCounters[1], count)` runs for EVERY cell so K1 reads the largest finest-cell population next iteration; K1 resets both counters (T10).

- [ ] **Step 1: The oracle and the failing tests**

Create `test/oracle/grid-pyramid.ts` with `gridOraclePyramid(build, input, spec)`: level 0 as `[sum m x, sum m y, sum m z, sum m]` per cell (f64, in `sortedIdx` order -- the same order as G4's serial loop, so the f32 kernel differs from it by rounding alone), the pseudo-cell at index `cells`, each coarser level the sum of its `2^dim` children (the pseudo-cell excluded), `hubCells` (count > `GRID_HUB_CELL`), `maxOccupancy`.

Create `test/primitives/grid-pyramid.test.ts` (the T8 harness plus `preparePyramid`; `hubCounters` zeroed by `writeBuffer` before each build), each its own `it`: (1) for `random20k`, `clumpy100`, `outside5`, `onecell1k`, `onecell1025`, `hubcell`, 2D and 3D: every level of `pyramid` equals the oracle's within the ANALYTIC bound `count_c * 2^-22` relative per component (`maxRelError` with `SR_ABS_FLOOR`; the T11 noise rows derive the real tolerances) -- level 0 of `onecell1k` through G4 (`hubCounters[0] === 0` after the build, read back), of `onecell1025` and `hubcell` through G4b (`hubCounters[0] === 1`, `hubList[0]` the cell), run twice bitwise first; (2) `hubCounters[1]` equals the oracle's `maxOccupancy` after every build; (3) empty cells hold `vec4f(0)` at every level and the pseudo-cell of `outside5` holds the five outside nodes' sums; (4) the twins in-process: `acquire({ subgroups: false })` reproduces `hubcell`'s level 0 within the analytic bound and every other level bitwise (G5 has no reduction); (5) `lastDispatches` is `3 + (levels - 1)`; (6) the writer cases `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)`: `writeNoiseFixture("grid-downsample", "random20k-L1", cls, level1, "f32")` (the downsample's own row: level 1 of `random20k`) and `writeNoiseFixture("grid-centroid-hub", "hubcell-L0", cls, level0, "f32")` (the hub path's own row: level 0 of `hubcell`, which G4b alone writes) on the UNSCALED fixtures with the oracle's values under `"oracle-f64"`; `grid-centroid`'s own row is the whole-pyramid stage fixture T11's `grid-inspect.test.ts` writes (`grid-centroid / random20k-pyramid`), so no level-0 fixture is written here. T11 registers both members (`grid-inspect.downsample`, `grid-inspect.hubCentroid`).

Create `test/sabotage/grid-pyramid.test.ts`: the find-once loop over the three ids' rows; per row `withSabotage` on case 1 with `random20k` + `outside5` (the `grid-centroid` rows), `hubcell` (the `grid-centroid-hub` rows) and `random20k` levels >= 1 (the `grid-downsample` rows), the report's tolerance the analytic bound.

Run: `cd $PKG && pnpm exec vitest run --project=node test/primitives/grid-pyramid.test.ts`
Expected: FAIL (`preparePyramid` is not exported).

- [ ] **Step 2: The three bodies**

Create `src/wgsl/grid-centroid.wgsl.ts`:

```ts
/**
 * G4, the `grid-centroid` kernel body (spec 7.7; P4-T9): thread per finest cell, the pseudo-cell included; the
 * mass-weighted position sum of a cell's sorted range in index order (no atomics: deterministic), the largest
 * occupancy into hubCounters[1], and cells above GRID_HUB_CELL entries appended to hubList for G4b (PD-13). Body
 * only; normative text.
 */
export const gridCentroidWgsl = /* wgsl */ `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_centroid(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let c = linear_id(wid, lid.x);
    if (c > grid_cells()) { return; }                              // cells [0, cells]: the pseudo-cell is index cells; no barrier follows
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    atomicMax(&hubCounters[1], count);                             // maxCellOccupancy, read by K1 next iteration
    if (count > GRID_HUB_CELL) {                                   // a hub cell: G4b sums it (PD-13)
        hubList[atomicAdd(&hubCounters[0], 1u)] = c;
        return;
    }
    var acc = vec4f(0.0);
    for (var k = start; k < start + count; k = k + 1u) {           // sorted order: deterministic
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);                       // (sum m x, sum m y, sum m z, sum m)
    }
    pyramid[c] = acc;
}
`;
```

Create `src/wgsl/grid-centroid-hub.wgsl.ts`:

```ts
/**
 * G4b, the `grid-centroid-hub` kernel body (spec 7.7; P4-T9): one workgroup per hub cell of hubList, dispatched
 * indirectly from hubArgs (the T1 finalize over hubCounters[0]); a WG-strided mass-weighted sum reduced by the
 * prelude's tree. The work is guarded by `valid`, never an early return, so the reduction is uniform (PD-13). Body
 * only; normative text.
 */
export const gridCentroidHubWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn grid_centroid_hub(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let h = group_id(wid);
    let valid = h < hubCount[0];                                   // a workgroup past the count sums nothing
    var c = 0u;
    var start = 0u;
    var count = 0u;
    if (valid) {
        c = hubList[h];
        start = cellStart[c];
        count = cellStart[c + 1u] - start;
    }
    var acc = vec4f(0.0);
    for (var k = start + lid.x; k < start + count; k = k + WG) {   // strided over the cell's sorted range
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);
    }
    let t = wg_reduce_vec4(acc, lid.x, 0u);                        // uniform control flow: 256 -> 1
    if (valid && lid.x == 0u) { pyramid[c] = t; }
}
`;
```

Create `src/wgsl/grid-downsample.wgsl.ts`:

```ts
/**
 * G5, the `grid-downsample` kernel body (spec 7.7; P4-T9): one dispatch per coarser level; every parent cell is the
 * sum of its 4 (2D) or 8 (3D) children at the level below, read at P.childBase and written at P.parentBase (the
 * pseudo-cell, index cells of level 0, is never a child). No atomics. Body only; normative text.
 */
export const gridDownsampleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn grid_downsample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let pc = linear_id(wid, lid.x);                                // the parent cell inside its level
    if (pc >= P.parentCells) { return; }                           // no barrier follows
    let side = P.parentSide;
    let cs = 2u * side;                                            // the child level's side
    let px = pc % side;
    let py = (pc / side) % side;
    let pz = pc / (side * side);
    var acc = vec4f(0.0);
    for (var dz = 0u; dz < P.depth; dz = dz + 1u) {
        for (var dy = 0u; dy < 2u; dy = dy + 1u) {
            for (var dx = 0u; dx < 2u; dx = dx + 1u) {
                let child = (2u * px + dx) + cs * ((2u * py + dy) + cs * (2u * pz + dz));
                acc = acc + pyramid[P.childBase + child];
            }
        }
    }
    pyramid[P.parentBase + pc] = acc;
}
`;
```

Registry (PD-1 region T9): `GRID_LEVEL_PARAMS` (the Interfaces list); `GRID_CENTROID` (`sortedIdx` ro (1,0), `cellStart` ro (1,1), `pos` ro (1,2) `array<vec4f>`, `pyramid` rw (1,3) `array<vec4f>`, `hubList` rw (1,4), `hubCounters` rw (1,5) `array<atomic<u32>>`, `P` (2,0) `Fa2Params`; `needs: []`); `GRID_CENTROID_HUB` (`sortedIdx` ro (1,0), `cellStart` ro (1,1), `pos` ro (1,2), `pyramid` rw (1,3), `hubList` ro (1,4), `hubCount` ro (1,5) `array<u32>`, `P` (2,0) `Fa2Params`; `needs: ["subgroups"]`); `GRID_DOWNSAMPLE` (`pyramid` rw (1,0), `P` (2,0) `GridLevelParams`; `needs: []`); mirrors (`storageCount` 6 / 6 / 1; compile pins 1 each; `P4: 11`).

- [ ] **Step 3: The pyramid planner**

Create `src/primitives/grid-pyramid.ts` with `GridPyramidBindings` and `preparePyramid(scope, spec)` (importing `GridSpec` from `./grid.js`): compiles the three kernels and `indirect-finalize`; `bind()` builds G4's group, the finalize's (`counters := hubCounters` as `array<u32>`, `args := hubArgs`; `IndirectParams { countIndex: 0, wg: scope.workgroupSize, slot: 0 }` from the lease arena), G4b's (`hubCount := hubCounters` read-only) and one G5 group per coarser level with its `GridLevelParams` record (`childBase = levelOffsets[L]`, `parentBase = levelOffsets[L + 1]`, `parentSide = G / 2^(L + 1)`, `parentCells = parentSide^dim`, `depth = dim === 3 ? 2 : 1`) written once into the arena; `record(pass, paramsOffset, upTo?: "G4" | "G5")`: G4 over `plan1d(cells + 1)`, the finalize (one workgroup), G4b through `dispatchIndirect(pass, bound, hubArgs, 0, [paramsOffset])` (`upTo: "G4"` stops here: G4a and G4b are G4's completion, so level 0 is whole), then G5 for `L = 0 .. levels - 2` over `plan1d(parentCells)`. `lastDispatches = 3 + (levels - 1)` for a full record.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/primitives/grid-pyramid.test.ts test/kernel`
Expected: PASS (six cases; the twin case runs both contexts in one process).

- [ ] **Step 4: The nine sabotage rows**

Append to `SABOTAGE` (`const PYRAMID_TEST = "test/primitives/grid-pyramid.test.ts";`):

```ts
    "grid-centroid": Object.freeze([
        { name: "mass-lane-x", find: "acc = acc + vec4f(p.xyz * p.w, p.w);                       // (sum m x, sum m y, sum m z, sum m)", replace: "acc = acc + vec4f(p.xyz * p.x, p.x);                       // (sum m x, sum m y, sum m z, sum m)", minFactor: 10, test: PYRAMID_TEST },
        { name: "pseudo-cell-skipped", find: "if (c > grid_cells()) { return; }", replace: "if (c >= grid_cells()) { return; }", minFactor: 10, test: PYRAMID_TEST },
        { name: "hub-not-appended", find: "hubList[atomicAdd(&hubCounters[0], 1u)] = c;\n        return;", replace: "return;", minFactor: 10, test: PYRAMID_TEST },
    ]),
    "grid-centroid-hub": Object.freeze([
        { name: "hub-stride-off-by-one", find: "k = k + WG) {", replace: "k = k + WG + 1u) {", minFactor: 10, test: PYRAMID_TEST },
        { name: "hub-lane-partial-written", find: "if (valid && lid.x == 0u) { pyramid[c] = t; }", replace: "if (valid && lid.x == 0u) { pyramid[c] = acc; }", minFactor: 10, test: PYRAMID_TEST },
        { name: "hub-range-start-ignored", find: "for (var k = start + lid.x; k < start + count; k = k + WG) {", replace: "for (var k = lid.x; k < start + count; k = k + WG) {", minFactor: 10, test: PYRAMID_TEST },
    ]),
    "grid-downsample": Object.freeze([
        { name: "wrong-level-offset", find: "acc = acc + pyramid[P.childBase + child];", replace: "acc = acc + pyramid[P.childBase + child + 1u];", minFactor: 10, test: PYRAMID_TEST },
        { name: "three-children", find: "for (var dx = 0u; dx < 2u; dx = dx + 1u) {", replace: "for (var dx = 0u; dx < 1u; dx = dx + 1u) {", minFactor: 10, test: PYRAMID_TEST },
        { name: "parent-index-shifted", find: "pyramid[P.parentBase + pc] = acc;", replace: "pyramid[P.parentBase + pc + 1u] = acc;", minFactor: 10, test: PYRAMID_TEST },
    ]),
```

(`mass-lane-x`'s `find` carries the comment so it is unique against G4b's identical sum line -- the two lines live in different bodies, but a `find` is checked within its own body only; the comment keeps the row readable. `wrong-level-offset` is the design's named mutation. `hub-not-appended` makes every hub cell's level-0 entry stale (never written), which the `hubcell` fixture reports as a whole-cell miss.)

Run: `cd $PKG && pnpm exec vitest run --project=node test/sabotage/grid-pyramid.test.ts test/sabotage/coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Green check on both adapters and the twins**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/kernel test/sabotage && GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/primitives && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80; the 3D `hubcell` build allocates the 38.3 MB pyramid on both adapters (the gate's "<= 40 MB in 3D", asserted through `gridPyramidBytes` in T8 case 1 and here by the buffer's size).

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the grid centroids, the hub-cell path and the pyramid` through `tools/commit-changes.sh`. The body records PD-13.

---

### Task P4-T10: The far field, the near field, K1's grid block, `RepulsionGrid` and the grid tier of the ForceAtlas2 model

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.7 G6 (`:1977`: sorted order; the coarsest level minus the 3x3 (3x3x3) neighbourhood, then per finer level the 6x6 (6x6x6) block aligned to the parent's 3x3 minus the level's own 3x3; the outside pseudo-cell's centroid for an inside node; the coarsest level in full and no pseudo-cell for an outside node; `F += d * (k m_i M_cell / (|d|^2 + state.eps^2))` with the mass-weighted centroid; loop bounds compile-time per `override LEVELS` -- see PD-16), G7 (`:1978`: sorted order; the 9 (27) finest cells with the EXACT pair force of 7.6, bounded by `nearMax` per cell with the hashed offset and the Horvitz-Thompson scale; the coincident kick; the fused epilogue exactly as K3's), K1's grid duties (`:1772`: `gridMin, cellSize, eps` from the robust extent, `outsideGrid`, `maxCellOccupancy`, the reset of `hubCounters`), the geometry table (`:1944-1947`: `extent = min(bboxExtent, extentFactor * rmsRadius)` with the 1 % bbox margin, `cellSize = max(extent, 1e-6) / G`, `eps = 0.25 cellSize`), 7.4 (`:1782-1791`: the grid-tier sequence and dispatch count), 7.8 (`repulsion: "auto"` by `n` only), 7.16 (bitwise with `deterministic: true`), 3.3 (`:836-841`: `repulsionTier`, `maxCellOccupancy`, `outsideGrid`), D24, D25 (no clamp anywhere), 11.3 lifecycle.

**P5 interaction.** P5-T3 / P5-T5 wrote the FR and spring `recordIteration` to throw `E_UNSUPPORTED { feature: "repulsion.grid" }` for `tier === "grid"` (as `forceatlas2.ts:721-726` did) and P5-T4's `fr-lifecycle.test.ts` pins that error at `load()` (the P5 plan's `se-behaviour.test.ts` case list has no grid pin). After this task `ForceSimulation.load()` no longer throws for the grid tier, so that pin is DELETED here (between this task and T13 no test pins the FR / spring grid refusal; T13 gives both models the grid tier and `grid-law.test.ts` covers it). Re-read both P5 test files at the first step: if `se-behaviour.test.ts` gained a grid pin when P5 landed, delete it the same way.

**Files:**
- Create: `webgpu-graph-algorithms/src/wgsl/grid-far-field.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/grid-near-field.wgsl.ts`, `webgpu-graph-algorithms/src/layouts/repulsion-grid.ts`, `webgpu-graph-algorithms/test/layouts/grid-behaviour.test.ts`, `webgpu-graph-algorithms/test/layouts/grid-lifecycle.test.ts`
- Modify: `webgpu-graph-algorithms/src/wgsl/fa2-stats-finalize.wgsl.ts` (the grid block), `webgpu-graph-algorithms/src/layouts/force-simulation.ts` (the grid throw `:888-898` deleted; `tierFor` exported; `lastPassTimings`; `ModelResources.pool`), `webgpu-graph-algorithms/src/layouts/forceatlas2.ts` (`buffers`, `inputs` `:548-559` throw deleted, `specs`, `bind`, `paramsFor`, `recordIteration`, `onLoad`, `readStats`, `dropBound`, `stages` = the union list, `resolveLayoutTuning` `nearMax >= 2`), `webgpu-graph-algorithms/test/layouts/fa2-options.test.ts` (`:717-736,809` become the grid-selected pins; `nearMax: 1` rejected at `:459-462`; the specs pin gains the grid specs), `webgpu-graph-algorithms/test/layouts/force-simulation.test.ts` (`:507-541`: `grid.load` succeeds with `tier === "grid"`; the `FakeModel` records nothing for either tier), `webgpu-graph-algorithms/test/layouts/fr-lifecycle.test.ts` and `webgpu-graph-algorithms/test/layouts/se-behaviour.test.ts` (the two grid-refusal pins deleted)
- Modify (PD-1 regions T10): `src/kernels.ts` (two ids, two entries, two rows; `FA2_STATS_FINALIZE` gains `cellHist` ro (1,3) `array<u32>` and `hubCounters` rw (1,4) `array<atomic<u32>>`), `test/kernel/registry.test.ts` (K1's row, two rows), `test/kernel/bind-group-budget.test.ts` (`"fa2-stats-finalize": 5, "grid-far-field": 5, "grid-near-field": 8`), `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`P4: 11 + 1 + 9 = 21`: `grid-far-field` 1 case, `grid-near-field` `1 + 2 x 2 x 2 = 9`)
- NOT touched: `src/wgsl/fa2-repulsion-exact.wgsl.ts` (K3 is the exact tier), `fruchterman-reingold.ts` / `spring-electrical.ts` (T13), `test/helpers/sabotage.ts` (the three K1 grid-block rows are T12's: their `test` file is T11's `grid-inspect.test.ts`, and the `test`-exists loop of T5's `tiers.test.ts` would fail on them here)

**Interfaces:**
- Consumes: `prepareGridBuild` / `preparePyramid` / `GridSpec` / `gridSpecFor` (T8, T9), `RepulsionExact`'s shape, `bindAttraction` (T6), `Lease` / `BufferPool.lease()` (`buffer-pool.ts:185`), `PassTiming` (`profiler.ts:18-20`), `kick_dir` / `lowbias32` / `mask_bit` / `wg_reduce_vec4` (prelude), `INDIRECT_ARGS_STRIDE`.
- Produces: the entries `grid-far-field` (5 storage: `pos` ro, `sortedIdx` ro, `pyramid` ro `array<vec4f>`, `S` ro `Fa2State`, `force` rw; `P: Fa2Params`; no overrides until T13; `needs: []`) and `grid-near-field` (8 storage: `pos` ro, `sortedIdx` ro, `cellStart` ro, `S` rw, `force` rw, `oldForce` ro, `fixedMask` ro, `partials` rw; `P`; `SWING_MODE` / `STRONG_GRAVITY` / `GRAVITY_CENTER` as K3; `needs: ["subgroups"]`); K1's two new slots; `class RepulsionGrid` (`static buffers(n, spec, wg)`, `static specs(overrides, spec)`, `static create(pipelines, caps, pool, overrides, spec)`, `bind(resources)`, `recordRepulsion(pass, n, paramsOffset, upTo?)`, `recordSpeedFinalize`, `dispose()`); `tierFor` exported; `ForceSimulation.lastPassTimings: readonly PassTiming[] | null` (`@internal`); the union `stages`; `ResolvedLayoutTuning.nearMax >= 2`.

**PLAN DECISION PD-14 (K1 keeps one body).** The grid duties of K1 run under `if (P.gridMax > 0u)`: FA2's exact `paramsFor` writes `gridMax: 0` today and keeps doing so, the grid `paramsFor` writes `spec.g`. K1's two new slots are bound on the exact tier to dummies that break no aliasing rule: `cellHist` (read-only) to the `partials` binding (read-only in K1 too), `hubCounters` (read-write) to a 16-byte model-owned `hubCounters` buffer that every tier allocates (a `BufferSpec`, `zero: true`). A second K1 variant (`GRID: bool`) would double K1's compile cases for a branch that costs one uniform compare.

**PLAN DECISION PD-15 (the sample).** Above `nearMax` entries a cell is sampled at `h = lowbias32((c ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed) % count` -- every hash expression fully parenthesised (`CLAUDE.md:186-187`) -- taking `sortedIdx[start + (h + k) % count]` for `k < nearMax`, skipping the node itself, and scaling the cell's sum by `others / sampled` where `sampled` is the number of pairs actually summed (`nearMax - 1` when the node fell inside its own window, `nearMax` otherwise) and `others` is `count - 1` for the node's own cell and `count` for a neighbour cell. `E[sum over the sample] = sampled / others * (true sum)` for a uniformly placed window, so the estimator is unbiased (the gate's 32-seed check measures it); `nearMax >= 2` keeps `sampled >= 1` (with `nearMax = 1` a node's own cell could sample only itself). `deterministic: true` makes the window a function of `(cell, iteration, seed)` only (7.16).

**PLAN DECISION PD-16 (three passes, no `LEVELS` override).** Design 7.7 G6 (`:1977`) says the far-field loop bounds are "compile-time per `override LEVELS`"; the bounds here are `P.levels` and `P.gridMax` from the uniform (the loops are `for` over runtime bounds; nothing about them needs a pipeline per level count, and an override would put the level count into the pipeline key and recompile on every resize that changes G). G6 therefore declares no `LEVELS` override and its compile-matrix count is 1 (3 with `LAW` after T13), not one case per level count: DEP-P4-G. The grid iteration is recorded as three compute passes before `toScene` -- `fa2-k1` (K1), `fa2-attraction` (K2's tiers), `fa2-grid` (G1-G7, K4, K5) -- and then the `fa2-to-scene` pass every tier already records (`forceatlas2.ts:777-779`), four per iteration, so the profiler's per-pass timings give T-7's attraction figure without a second mechanism; the exact tier keeps its one `fa2` pass before `toScene` and every committed FA2 timing shape. The profiler holds 256 query slots, two per pass (`src/constants.ts:36`), so the two added boundaries cost nothing the batch has to budget.

**PLAN DECISION PD-17 (the union stage list).** `stages = ["K1", "K2", "K3", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "K4", "K5", "toScene"]` for every model; `recordIteration(..., upTo)` stops after the LAST stage it records at or before `upTo`'s position, so an `inspect()` after `debugRunStages("G3")` on the grid tier reads `cellStart` after the histogram's scan and on the exact tier the same call stops after K2 (the previous stage recorded). The simulation's `runStages` (`force-simulation.ts:2013-2021`) validates the name against the list and is unchanged.

**PLAN DECISION PD-18 (`buffers()` decides the tier).** `ForceModel.buffers(n, dim)` returns the grid buffers exactly when `tierFor(this.tuning, n) === "grid"` -- the same function `load()` applies at `:888` -- so the interface does not change and a model cannot be asked to record a grid iteration without its buffers.

- [ ] **Step 1: The failing tests and the moved pins**

Create `test/layouts/grid-behaviour.test.ts` (node), each its own `it`, every GPU case twice with `expectBitwiseEqual` first: (1) `createForceAtlas2(ctx, { seed: 7, repulsion: "grid", maxInFlight: 1 })` on `karate`, `random1k`, `rmat14` (scaled) in 2D and 3D: `load`, `run({ maxIter: 50, batch: 5 })`, every position finite, `stats.repulsionTier === "grid"`, `stats.maxCellOccupancy >= 1`, `stats.outsideGrid >= 0`, `stats.trace.length` 5; (2) `"auto"` with `exactMaxNodes: 8` selects `"grid"` on karate (`sim.tier`) and `"exact"` on a path of 8; the default `"auto"` selects `"exact"` on `random1k` (32768 > 1000); (3) `deterministic: true`: two runs bitwise identical; `deterministic: false`: finite, and the pipeline keys created name `counting-scatter` and no `radix-scatter`; (4) `nearMax: 4` on `onecell1025` and `hubcell`: finite, `stats.maxCellOccupancy === n` for `hubcell`; (5) `gridMax2D: 32` on `random20k` (the software saturation case: at `n = 400` on lavapipe `G = 32` saturates, `stats.maxCellOccupancy >= 1`); (6) `setFixed` pins a node for 20 iterations on the grid tier (its scene row bitwise the seed), `setPosition` is honoured and reheats, `reheat()` resets the counters; (7) the empty graph and a single node under `repulsion: "grid"` (a single node: `G = 8`, `maxCellOccupancy 1`, it never moves in paper mode); (8) `inspect("cellKey")`, `("sortedIdx")`, `("cellStart")`, `("pyramid")`, `("hubList")`, `("hubCounters")` resolve on the grid tier and `inspect("cellKey")` is `E_INVALID_ARGUMENT` on the exact tier; `debugRunStages("G3")` then `inspect("cellStart")[cells + 1] === n` and `debugRunStages("G7")` leaves `force` finite; (9) `resolveLayoutTuning({ nearMax: 1 })` is `E_INVALID_ARGUMENT { argument: "nearMax" }`; (10) 2D writes `z === center.z` on the grid tier.

Create `test/layouts/grid-lifecycle.test.ts` (the `fa2-lifecycle.test.ts:29-96` three cases on `repulsion: "grid"` with `rmat14`): `dispose()` leaves no live buffer (the lease's scratch included: `allocator.liveBuffers` back to its value before `createForceAtlas2`), a `step()` maps at most two staging slots; `release(snapshot)` mid-run rejects `E_RELEASED`; device loss rejects `E_DEVICE_LOST`.

Delete the P5 pin (`fr-lifecycle.test.ts`'s "`repulsion: "grid"` is `E_UNSUPPORTED`" case, and the same case in `se-behaviour.test.ts` only if P5 landed one there): the models' `recordIteration` still throws at the first `step()` until T13, and T13's `grid-law.test.ts` is the test of both models' grid tier. Update `fa2-options.test.ts:717-736,809` (the four `inputs()` throws become "returns the inputs; `tierFor` reports `grid`") and `force-simulation.test.ts:507-541` (`grid.load(g, ...)` succeeds, `grid.tier === "grid"`, `auto.tier === "grid"`; the `FakeModel` gains the union `stages` and ignores `tier` in `recordIteration`).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/grid-behaviour.test.ts test/layouts/grid-lifecycle.test.ts`
Expected: FAIL (`E_UNSUPPORTED { feature: "repulsion.grid" }` at `load()`).

- [ ] **Step 2: The two bodies**

Create `src/wgsl/grid-far-field.wgsl.ts`:

```ts
/**
 * G6, the `grid-far-field` kernel body (spec 7.7; P4-T10; D24): per node `i = sortedIdx[t]`, its finest cell
 * recomputed from `positions[i]` and the state (PD-10); for an inside node the coarsest level minus the 3x3 (3x3x3)
 * around its coarsest cell, then at every finer level the 6x6 (6x6x6) block that is the parent's 3x3 minus this
 * level's own 3x3 -- space tiled exactly once, no theta -- plus the outside pseudo-cell's centroid; for an outside
 * node the coarsest level in full and no pseudo-cell. Every cell term is `d * (k m_i M / (|d|^2 + eps^2))` on the
 * mass-weighted centroid (Gephi Region semantics). `force += f` (K2 wrote it). Body only; normative text.
 */
export const gridFarFieldWgsl = /* wgsl */ `
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }
fn grid_side(level: u32) -> u32 { return P.gridMax >> level; }
fn level_base(level: u32) -> u32 {                             // the pyramid index of level L's cell 0 (level 0 carries the pseudo-cell at index cells)
    var base = 0u;
    for (var l = 0u; l < level; l = l + 1u) {
        let s = grid_side(l);
        base = base + s * s * select(1u, s, P.dim == 3u) + select(0u, 1u, l == 0u);
    }
    return base;
}
fn cell_at(level: u32, cx: i32, cy: i32, cz: i32) -> u32 {
    let s = grid_side(level);
    return level_base(level) + u32(cx) + s * (u32(cy) + select(0u, s * u32(cz), P.dim == 3u));
}
fn cell_force(pi: vec4f, q: vec4f) -> vec3f {                  // one far-field term, softened by state.eps (7.7)
    if (q.w <= 0.0) { return vec3f(0.0); }                     // an empty cell
    let d = pi.xyz - q.xyz / q.w;                              // to the mass-weighted centroid
    let d2 = dot(d, d) + S.eps * S.eps;
    return d * (P.scalingRatio * pi.w * q.w / d2);             // LAW 0 (FA2): |F| = k m_i M_cell / d
}

@compute @workgroup_size(WG)
fn grid_far_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    if (t >= P.n) { return; }                                      // no barrier follows
    let i = sortedIdx[t];                                          // sorted order (D24)
    let pi = pos[i];
    let gf = f32(P.gridMax);
    let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;              // PD-10
    var c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    if (P.dim == 2u) { c0.z = 0; }                                 // 2D: K5 never moves z and K1's gridMin.z is centroid.z - extent / 2, so q.z ~= G / 2; collapse to the one z plane the loops below visit, else ct.z / cl.z are never within 1 of cz = 0 and the 3x3 is double-counted at every level
    let g = i32(P.gridMax);
    var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
    if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
    let top = P.levels - 1u;
    let ts = i32(grid_side(top));                                  // the coarsest side (4)
    let zTop = select(0, ts - 1, P.dim == 3u);                     // z ranges: one plane in 2D
    var f = vec3f(0.0);
    if (inside) {
        let ct = c0 / i32(1u << top);                              // the node's coarsest cell
        for (var cz = 0; cz <= zTop; cz = cz + 1) {
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    if (abs(cx - ct.x) <= 1 && abs(cy - ct.y) <= 1 && abs(cz - ct.z) <= 1) { continue; }   // the 3x3(x3) is finer levels' work
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
        for (var l = top; l > 0u; l = l - 1u) {                    // level l - 1: the parent's 3x3 at level l, refined, minus this level's own 3x3
            let level = l - 1u;
            let cl = c0 / i32(1u << level);
            let cp = cl / 2;
            let side = i32(grid_side(level));
            let zLo = select(0, max(0, 2 * (cp.z - 1)), P.dim == 3u);
            let zHi = select(0, min(side - 1, 2 * (cp.z + 1) + 1), P.dim == 3u);
            for (var cz = zLo; cz <= zHi; cz = cz + 1) {
                for (var cy = max(0, 2 * (cp.y - 1)); cy <= min(side - 1, 2 * (cp.y + 1) + 1); cy = cy + 1) {
                    for (var cx = max(0, 2 * (cp.x - 1)); cx <= min(side - 1, 2 * (cp.x + 1) + 1); cx = cx + 1) {
                        if (abs(cx - cl.x) <= 1 && abs(cy - cl.y) <= 1 && abs(cz - cl.z) <= 1) { continue; }
                        f = f + cell_force(pi, pyramid[cell_at(level, cx, cy, cz)]);
                    }
                }
            }
        }
        f = f + cell_force(pi, pyramid[grid_cells()]);             // the outside pseudo-cell as one far-field term
    } else {
        for (var cz = 0; cz <= zTop; cz = cz + 1) {                // an outside node: the coarsest level in full, no pseudo-cell (it would include itself)
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
    }
    store_force(i, load_force(i) + f);
}
`;
```

Create `src/wgsl/grid-near-field.wgsl.ts`: the helpers `load_force`, `store_force`, `load_old`, `gravity_force` and the epilogue copied from K3 (`fa2-repulsion-exact.wgsl.ts:14-28,59-77`, the same text in this body), `grid_cells`, and:

```wgsl
fn pair_force(i: u32, pi: vec4f, jj: u32, o: vec4f) -> vec3f {  // the exact pair law of K3 (7.6): the floor and the coincident kick
    let d = pi.xyz - o.xyz;
    var d2 = dot(d, d);
    if (d2 < FA2_COINCIDENT_SQ) { return kick_dir(i, jj, P.dim) * (P.scalingRatio * pi.w * o.w / FA2_DIST_FLOOR); }
    d2 = max(d2, FA2_DIST_FLOOR_SQ);
    let k = P.scalingRatio * pi.w * o.w;
    return d * (k / d2);
}
fn cell_sum(i: u32, pi: vec4f, c: u32, own: bool) -> vec3f {     // one finest cell: exact below nearMax entries, Horvitz-Thompson above (PD-15)
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    var f = vec3f(0.0);
    if (count <= P.nearMax) {
        for (var k = start; k < start + count; k = k + 1u) {
            let jj = sortedIdx[k];
            if (jj != i) { f = f + pair_force(i, pi, jj, pos[jj]); }
        }
        return f;
    }
    let h = lowbias32((c ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed) % count;   // the per-iteration window (7.16)
    var sampled = 0u;
    for (var k = 0u; k < P.nearMax; k = k + 1u) {
        let jj = sortedIdx[start + (h + k) % count];
        if (jj == i) { continue; }
        f = f + pair_force(i, pi, jj, pos[jj]);
        sampled = sampled + 1u;
    }
    if (sampled == 0u) { return vec3f(0.0); }
    let others = select(count, count - 1u, own);
    return f * (f32(others) / f32(sampled));                     // others / sampled over the realised sample (DEP-P4-K)
}

@compute @workgroup_size(WG)
fn grid_near_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    let valid = t < P.n;
    var i = 0u;
    var pi = vec4f(0.0);
    var f = vec3f(0.0);
    if (valid) {
        i = sortedIdx[t];                                          // sorted order (D24)
        pi = pos[i];
        let gf = f32(P.gridMax);
        let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;
        let c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
        let g = i32(P.gridMax);
        var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
        if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
        if (inside) {
            let zr = select(0, 1, P.dim == 3u);
            for (var dz = -zr; dz <= zr; dz = dz + 1) {
                for (var dy = -1; dy <= 1; dy = dy + 1) {
                    for (var dx = -1; dx <= 1; dx = dx + 1) {
                        let cx = c0.x + dx;
                        let cy = c0.y + dy;
                        let cz = c0.z + dz;
                        if (cx < 0 || cx >= g || cy < 0 || cy >= g || cz < 0 || cz >= g) { continue; }
                        let c = u32(cx) + P.gridMax * (u32(cy) + select(0u, P.gridMax * u32(cz), P.dim == 3u));
                        f = f + cell_sum(i, pi, c, dx == 0 && dy == 0 && dz == 0);
                    }
                }
            }
        } else {
            f = cell_sum(i, pi, grid_cells(), true);               // an outside node: the pseudo-cell alone
        }
    }
    // epilogue (7.9, 7.10): gravity and force += under the guard, the swing / traction reduction outside it (K3's text)
    var sw = 0.0;
    var tr = 0.0;
    if (valid) {
        f = f + gravity_force(pi);
        let fnew = load_force(i) + f;
        store_force(i, fnew);
        if (SWING_MODE == 1u) {
            sw = pi.w * length(pi.xyz - fnew);
            tr = 0.5 * pi.w * length(pi.xyz + fnew);
        } else if (!mask_bit(fixedMask[i >> 5u], i)) {
            let fold = load_old(i);
            sw = pi.w * length(fnew - fold);
            tr = 0.5 * pi.w * length(fnew + fold);
        }
    }
    let tt = wg_reduce_vec4(vec4f(sw, tr, 0.0, 0.0), lid.x, 0u);   // uniform control flow: 256 -> 1
    if (lid.x == 0u) { partials[group_id(wid)].swingTraction = tt.xy; }
}
```

(In 2D `cz = 0` and `g > 0`, so the z test never excludes the plane; the partials are global sums over free nodes, so a workgroup holding sorted nodes rather than index-contiguous ones changes nothing K4 reads.) Registry (PD-1 region T10): the two entries (the Interfaces list), K1's two slots; mirrors (`storageCount` 5 / 5 / 8; compile pins 1 and 9; `P4: 21`).

- [ ] **Step 3: K1's grid block**

In `src/wgsl/fa2-stats-finalize.wgsl.ts`, inside `if (lid.x == 0u) {` after `T[P.iterationIndex].iteration = S.iteration;` (`:55`), add:

```wgsl
        if (P.gridMax > 0u) {                                      // the grid tier (7.7): the robust extent, the cell size, eps, last iteration's counts, the hub counter reset (PD-14)
            let cells = P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u);
            if (fold) {
                let box = (S.max.xyz - S.min.xyz) * GRID_BBOX_MARGIN;
                var bboxExtent = max(box.x, box.y);
                if (P.dim == 3u) { bboxExtent = max(bboxExtent, box.z); }
                let extent = max(min(bboxExtent, P.extentFactor * S.rmsRadius), GRID_EXTENT_FLOOR);   // min(bbox, extentFactor x rms), floored (7.7)
                let cellSize = extent / f32(P.gridMax);
                S.gridMin = vec4f(S.centroid.xyz - vec3f(0.5 * extent), cellSize);   // gridMin.w carries cellSize
                S.invCellSize = 1.0 / cellSize;
                S.eps = 0.25 * cellSize;
            }
            S.outsideGrid = cellHist[cells];                         // the previous iteration's pseudo-cell count (0 after load)
            S.maxCellOccupancy = atomicLoad(&hubCounters[1]);
            atomicStore(&hubCounters[0], 0u);
            atomicStore(&hubCounters[1], 0u);
        }
```

(`GRID_BBOX_MARGIN` and `GRID_EXTENT_FLOOR` are prelude constants since T8; the FA2 sabotage `find` strings of K1 are untouched.) On the first iteration after `load()` (`fold` false) the extent fields come from the host: `ForceAtlas2Model.onLoad` on the grid tier computes the same six values in f32 (`Math.fround` at every step, the same order of operations) from `state.get("min")`, `("max")`, `("centroid")`, `("rmsRadius")` and `state.set`s `gridMin`, `invCellSize`, `eps`, `outsideGrid 0`, `maxCellOccupancy 0`.

- [ ] **Step 4: `RepulsionGrid` and the wiring**

Create `src/layouts/repulsion-grid.ts` in the shape of `repulsion-exact.ts`:

```ts
export interface RepulsionGridResources extends RepulsionExactResources { readonly cellKey, cellVal, sortedKey, sortedIdx, cellHist, cellStart, hubList, hubCounters, hubArgs, pyramid: Binding; }
export class RepulsionGrid {
    static buffers(n: number, spec: GridSpec): readonly BufferSpec[];          // cellKey / cellVal / sortedKey / sortedIdx 4n; cellHist / cellStart 4 (cells + 2) zero; hubList 4 (cells + 1); hubArgs 16 (INDIRECT | STORAGE | COPY_SRC | COPY_DST); pyramid 16 pyramidCells zero -- hubCounters (16, zero, STORAGE | COPY_SRC | COPY_DST) is the MODEL's on every tier (PD-14)
    static specs(overrides: RepulsionExactOverrides, spec: GridSpec): readonly WgslModuleSpec[];   // grid-cell-key, radix-hist, radix-scatter, scan-block, scan-add, histogram, counting-scatter, fill, grid-centroid, indirect-finalize, grid-centroid-hub, grid-downsample, grid-far-field, grid-near-field (SWING_MODE / STRONG_GRAVITY / GRAVITY_CENTER), fa2-speed-finalize (SWING_MODE)
    static async create(pipelines: PipelineCache, caps: PlanCaps, pool: BufferPool, overrides: RepulsionExactOverrides, spec: GridSpec): Promise<RepulsionGrid>;   // compiles through prepareGridBuild / preparePyramid over a ReduceScope whose scratch() and params() draw on a Lease of `pool` (PD-11) and the two field kernels + K4
    bind(resources: RepulsionGridResources): void;                              // builds every bind group; a second bind() releases the previous lease first
    recordRepulsion(pass: GPUComputePassEncoder, n: number, paramsOffset: number, upTo?: "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7"): void;   // G1..G3 through GridBuildPlanner.record(pass, n, paramsOffset, upTo) (T8's stop points), G4..G5 through GridPyramidPlanner.record(pass, paramsOffset, upTo) (T9's), then G6 over plan1d(n), G7 over plan1d(n); an upTo before a planner's stages skips that planner
    recordSpeedFinalize(pass: GPUComputePassEncoder, paramsOffset: number): void;
    dispose(): void;                                                            // the lease
}
```

`ForceSimulation` (`force-simulation.ts`): delete the grid throw (`:888-898`), `export function tierFor` (`:361`), add `pool` to `ModelResources` (`this.ctx.pool`), keep `record.profile`'s timings as `lastPassTimings` after each landed batch (`:1472-1481` is where the sum is made; store the array too; `@internal`). `ForceAtlas2Model`: `buffers(n, dim)` = the three exact specs + `hubCounters` + (`tierFor(this.tuning, n) === "grid"` ? `RepulsionGrid.buffers(n, gridSpecFor(n, dim, this.tuning))` : `[]`) (PD-18); `inputs()` without the throw (`:548-559`); `specs()` = the exact specs + `RepulsionGrid.specs(...)` for a spec at the crossover size (`gridSpecFor(EXACT_MAX_NODES + 1, 2, tuning)`: the pipeline key carries no spec field, so any spec lists the same keys); `bind()`: on `resources.tier === "grid"` create and bind a `RepulsionGrid` (K1 bound with `cellHist`, `hubCounters`; on the exact tier K1 bound with `cellHist: partials`, `hubCounters`); `paramsFor`: `gridMax: spec.g, levels: spec.levels` on the grid tier; `recordIteration`: the union `stages` and the three compute passes before `toScene` (PD-16, PD-17); `onLoad`: the grid extent (Step 3); `readStats`: `repulsionTier` from the bound tier, `maxCellOccupancy` / `outsideGrid` from the header on the grid tier (null on exact); `dropBound` disposes the grid stage. `resolveLayoutTuning`: `nearMax` "an integer >= 2".

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/grid-behaviour.test.ts test/layouts/grid-lifecycle.test.ts test/layouts/fa2-options.test.ts test/layouts/force-simulation.test.ts test/layouts/fr-lifecycle.test.ts test/layouts/se-behaviour.test.ts test/kernel`
Expected: PASS (the ten behaviour cases, three lifecycle cases; the compile matrix at P4 21).

- [ ] **Step 5: Nothing else moved, on both adapters**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both: every committed FA2 / FR / SE noise fixture still matches (K1's grid block is dead under `gridMax = 0`; the exact tier's K1 binds two dummies and records the same dispatches); coverage at or above 80 / 80 / 75 / 80. The K1 grid block's three sabotage rows are T12's (Step 1 there): the suite that measures them is T11's.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the grid repulsion tier of ForceAtlas2` through `tools/commit-changes.sh`. The body records PD-14 to PD-18 and names DEP-P4-G as the record P4-T16 writes.

---

### Task P4-T11: The grid parity helper, the stage suites, the exact-vs-grid suite and the noise-floor recording

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.4 exact-vs-grid (`:3556-3583`: the fixtures -- uniform, clumpy 10 / 100 / 1,000, the 10k-hub scale-free graph, cosmos's two cases, a line, coincident points, the isolated-node fixture taken after 200 exact iterations; sizes 20k and 100k on both lanes scaled by `gpuScale()`; RMS <= 5 % and p99 <= 25 % with the floored denominator `max(|F_exact(i)|, 1e-3 max_j |F_exact(j)|)`; an isolated node's total force equals gravity alone; unbiasedness (mean over 32 seeded iterations within 5 % of exact); expansion parity within 25 % at 50 and 200 iterations; distributional within 15 % at 200 iterations; two runs bitwise with `deterministic: true`; 3D at 27 / 216 loops with the pyramid <= 40 MB), 7.8 (`:2056-2062`: the exact kernel is the oracle), 11.9 items 2-4, 13 rule (f), `docs/decisions/G3.md:166-170` (the recording sequence), 10.4 (`:3397-3402`: a missed number is re-fixed by an owner decision, never loosened).

**Files:**
- Create: `webgpu-graph-algorithms/test/helpers/grid-parity.ts`, `webgpu-graph-algorithms/test/layouts/grid-inspect.test.ts`, `webgpu-graph-algorithms/test/layouts/grid-exact.test.ts`, `webgpu-graph-algorithms/test/layouts/grid-twins.test.ts`
- Create (continued): `webgpu-graph-algorithms/test/oracle/grid-field.ts` (`gridOracleFarField`, `gridOracleNearField`, `gridOracleK1`, `lowbias32` on hash words as `kickDir` does)
- Modify: `webgpu-graph-algorithms/test/noise-floor.test.ts` (the P4 members and `P4_TOLERANCE_CAPS` spread into `TOLERANCE_CAPS`), `webgpu-graph-algorithms/benchmarks/results/noise-floor.json` and `webgpu-graph-algorithms/test/fixtures/noise/*.json` (through the recording run, never by hand)
- NOT touched: `src/**` (a parity miss is fixed by the task that owns the kernel, before this task proceeds), `test/helpers/sabotage.ts` (T12)

**Interfaces:**
- Consumes: `captureAllStages`'s shape and `debugStages` / `stageError` / `stageReport` / `rel` / `xyzOf` / `asF32` / `paritySnapshot` / `startPositions` / `pinMask` / `readState` (`fa2-parity.ts`), `ForceAtlas2Oracle.stages.repulsion` / `.gravity` (`test/oracle/forceatlas2.ts:46-66`), `gridOracleBuild` / `gridOraclePyramid` (T8, T9), `writeNoiseFixture` / `recordNoiseRow` / `readNoiseFixtures` / `noiseFloorFor` / `adapterClass`, the `stageRows` / `stageTolerances` / `p3Member` shapes (`noise-floor.test.ts:159-189`), `layoutMetrics` / `spread` (`metrics.ts`), `fixture()` with the T8 positioned fixtures, `gpuScale()`.
- Produces: `GRID_BASE_OPTIONS`, `GRID_TUNING` (`{ repulsion: "grid", deterministic: true }`), `EXACT_TUNING`, `captureGridStages(ctx, s, start, options, mask)` (`cellKey`, `sortedIdx`, `cellStart`, `pyramid` (every level), `farField` (the `force` delta after G6), `nearField` (the `force` delta after G7), `force` (after G7), `k1` (the state header after one real step + K1: `gridMin`, `eps`, `invCellSize`, `outsideGrid`, `maxCellOccupancy`), `positions`, `scene`), `GRID_STAGE_KEYS`, `GRID_STAGE_KERNEL`, `GRID_STAGE_TOLERANCE`, `GRID_NOISE_FIXTURES`, `gridStageReport`, `gridTolerance(id)`, `exactVsGrid(ctx, s, start, options): { rms, p99, perNode }`, `P4_TOLERANCE_CAPS`.

**PLAN DECISION PD-19 (what is compared with what).** Two different questions, two references. The per-kernel STAGE comparisons (rule (f), 11.9 item 2) ask "does this kernel compute what it says": the f64 oracle exposes `cellKey` / `sortedIdx` / `cellStart` (u32, bitwise by PD-10), the pyramid levels, the far field and the near field per node (reproducing the sampling window from the same hash), and the GPU differs from it by f32 rounding, so those tolerances derive from recorded floors under 1e-4 caps like every P3 stage. The exact-vs-grid comparison asks "how good is the approximation": the reference is the EXACT GPU tier on the same adapter from the same start (7.8; K3's `force` stage through the same `captureAllStages` with `EXACT_TUNING`), never the f64 oracle, so the approximation error is measured alone.

**PLAN DECISION PD-20 (the approximation caps are derived too).** The gate's 5 % / 25 % are `TOLERANCE_CAPS` entries (`grid-exact.rms`, `grid-exact.p99`, and `grid-expansion` 0.25, `grid-distributional` 0.15, `grid-unbiased` 0.05) whose basis rows record the MEASURED approximation floor on `random20k` (RMS) and the worst fixture (p99); the derived value is `min(cap, 10 x floor)`. A floor above its cap does not close the gate: 10.4 requires an owner decision in G4 section 7 (re-fix or stay open), and the checklist item says `fail`.

- [ ] **Step 1: The oracle's fields and the parity helper**

Create `test/oracle/grid-field.ts`: `gridOracleFarField(input, build, pyramid, params)` -- per node the exact loops of G6 in f64 over the oracle's own pyramid (the same cell visiting order, `c0.z` forced to 0 in 2D exactly as G6 does so the 3x3 exclusion fires at every level; `eps` from the input); `gridOracleNearField(input, build, params)` -- per node the 9 / 27 finest cells with the K3 pair law in f64, the coincident kick through `kickDir`, and ABOVE `nearMax` the same window `h = lowbias32((c ^ (iteration * 0x9E3779B9)) ^ seed) % count` (JS `Math.imul` / `>>>` on hash words, the `kickDir` precedent) with the realised-sample scale of PD-15, so the oracle sums exactly the pairs the GPU sums; `gridOracleK1(...)` -- the extent / cell size / eps arithmetic of K1 in f32 (`Math.fround`).

Create `test/helpers/grid-parity.ts` in the shape of `fr-parity.ts` (P5-T4 Step 1): the option / tuning constants, the stage keys and their kernels (`cellKey` G1, `sortedIdx` radix-scatter, `cellStart` histogram, `pyramid` grid-centroid, `farField` grid-far-field, `nearField` grid-near-field, `force` grid-near-field, `k1` fa2-stats-finalize, `positions` fa2-integrate, `scene` fa2-to-scene), `captureGridStages` (as `captureAllStages`: `debugRunStages("G1")` then `inspect("cellKey")`, `("G2")` -> `sortedIdx`, `("G3")` -> `cellStart` (and the state's `gridMin` / `invCellSize` the oracle is SEEDED with), `("G5")` -> `pyramid`, `("G6")` -> `force` minus the K2 attraction (captured after `("K2")`), `("G7")` -> `force`, one real `step(1)` then `("K1")` -> the header), `exactVsGrid` (both tiers' `force` after the repulsion stage from the same start, the floored per-node relative error of 11.4, its RMS and p99 over nodes), `GRID_NOISE_FIXTURES` and:

```ts
export const P4_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> = Object.freeze({
    "grid-inspect.pyramid": { cap: 1e-4, basis: "grid-inspect.pyramid.oracle-f64" },          // grid-centroid / random20k-pyramid (every level, T11's writer)
    "grid-inspect.downsample": { cap: 1e-4, basis: "grid-inspect.downsample.oracle-f64" },    // grid-downsample / random20k-L1 (T9's writer)
    "grid-inspect.hubCentroid": { cap: 1e-4, basis: "grid-inspect.hubCentroid.oracle-f64" },  // grid-centroid-hub / hubcell-L0 (T9's writer)
    "grid-inspect.farField": { cap: 1e-4, basis: "grid-inspect.farField.oracle-f64" },
    "grid-inspect.nearField": { cap: 1e-4, basis: "grid-inspect.nearField.oracle-f64" },
    "grid-inspect.k1": { cap: 1e-4, basis: "grid-inspect.k1.oracle-f64" },
    "grid-inspect.positions": { cap: 1e-4, basis: "grid-inspect.positions.oracle-f64" },
    "grid-twins.force": { cap: 1e-6, basis: "grid-twins.force.twin" },
    "grid-twins.hubCentroid": { cap: 1e-6, basis: "grid-twins.hubCentroid.twin" },          // the -no-subgroups twin of grid-centroid-hub / hubcell-L0: the only pyramid kernel with a reduction
    "tiers-inspect.attraction": { cap: 1e-4, basis: "tiers-inspect.attraction.oracle-f64" },
    "segmented-reduce.tiers": { cap: 1e-4, basis: "segmented-reduce.tiers.oracle-f64" },
    "spmv-pull.tiers": { cap: 1e-5, basis: "spmv-pull.tiers.oracle-f64" },
    "grid-exact.rms": { cap: 0.05, basis: "grid-exact.rms.oracle-f64" },        // the "oracle" row class here is the EXACT GPU tier (PD-19); the id keeps the file's three comparison kinds
    "grid-exact.p99": { cap: 0.25, basis: "grid-exact.p99.oracle-f64" },
    "grid-expansion": { cap: 0.25, basis: "grid-expansion.oracle-f64" },
    "grid-distributional": { cap: 0.15, basis: "grid-distributional.oracle-f64" },
    "grid-unbiased": { cap: 0.05, basis: "grid-unbiased.oracle-f64" },
});
```

(`cellKey`, `sortedIdx`, `cellStart` and every T1-T4 fixture are u32: bitwise, no tolerance entry; their rows carry `maxRelError 0`.)

Run: `cd $PKG && pnpm exec eslint test/helpers/grid-parity.ts test/oracle/grid-field.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 2: The three suites**

`test/layouts/grid-inspect.test.ts` (the `fa2-inspect.test.ts` pattern): for `random20k`, `clumpy100`, `isolated`, `outside5`, `onecell1025`, `hubcell`, `coincident` (at `gpuScale()`; `hubcell` and `onecell1025` at `nearMax: 8` so the sampling path runs), 2D and 3D: `captureGridStages` twice, `expectBitwiseEqual` per stage, the three u32 stages bitwise against the oracle seeded with the GPU's `gridMin` / `invCellSize`, every f32 stage through `gridStageReport` (`assertCheckPasses`), the pinned case (a pinned node's force computed, its displacement 0), and the writer case `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)` writing the UNSCALED `random20k` stages (`grid-centroid / random20k-pyramid`, `grid-far-field / random20k-far`, `grid-near-field / random20k-near`, `fa2-stats-finalize / random20k-K1-grid`, `fa2-integrate / random20k-K5-grid`) plus the tier fixtures the T5 / T6 writer cases wrote (they are members here) and the oracle's values. `test/layouts/grid-twins.test.ts` (the `fa2-twins.test.ts` pattern): a second context from `acquire({ subgroups: false })`; `force` after G7 on `random20k` and level 0 of `hubcell` (the cell G4b sums through `wg_reduce_vec4`: the one pyramid kernel with a reduction, so the one whose twin can differ) agree with the feature context within `gridTolerance("grid-twins.force")` / `("grid-twins.hubCentroid")`; the writer case writes the `-no-subgroups` fixtures of `grid-near-field / random20k-near` and `grid-centroid-hub / hubcell-L0` (the twin rows `grid-twins.force.twin` / `grid-twins.hubCentroid.twin`).

`test/layouts/grid-exact.test.ts`: (1) for `random20k`, `clumpy10`, `clumpy100`, `clumpy1000`, `hub10k`, `polyline163`, `onecell1k`, `line`, `coincident`, `isolated` (the last after 200 EXACT iterations from the seed, so the strays sit at their equilibrium: run the exact simulation for 200 iterations, read the positions, use them as the start of both tiers), at the two sizes `20_000` and `100_000` (the `sized` factor of the fixture; `100_000` on hardware only, `2_000` on lavapipe), 2D and 3D: `exactVsGrid` -> `rms <= gridTolerance("grid-exact.rms")` and `p99 <= gridTolerance("grid-exact.p99")`, printed per fixture; (2) the isolated node's total force equals gravity alone: on `isolated`, for every degree-0 node, `|force_after_G7(i) - gravity_oracle(i)| <= gridTolerance("grid-inspect.nearField") x |gravity_oracle(i)|` (no near-field neighbour, and the far field of a stray at its equilibrium is under the tolerance -- the design's item; if the far field is NOT negligible at the scaled equilibrium, the check compares against `gravity + farField_oracle` and says so in the record); (3) unbiasedness: on `hubcell` and `onecell1025` with `nearMax: 8`, the mean of the near-field stage over 32 iterations of `deterministic: true` with seeds `1..32` (one `load` + one `debugRunStages("G7")` per seed) is within `gridTolerance("grid-unbiased")` of the exact tier's repulsion per node (RMS over nodes); (4) expansion parity: from the same start, `spread()` of the grid tier's positions after 50 and 200 iterations is within `gridTolerance("grid-expansion")` of the exact tier's at 20k and 100k on `random20k` and `clumpy100`; (5) distributional parity: `layoutMetrics` after 200 iterations on both tiers within `gridTolerance("grid-distributional")` at 20k, 100k (and 262k in `node-limits`, T15) on `random20k`; (6) the writer cases: `grid-exact / random20k-rms` and `-p99` (the per-node error vector, class `adapterClass`, and its exact reference under `"oracle-f64"`), `grid-expansion / random20k-spread200`, `grid-distributional / random20k-metrics200`, `grid-unbiased / hubcell-mean32`.

Every derived tolerance goes through `gridTolerance(id)`; until Step 4 the suites fail with `no committed tolerance for test id`, the expected state inside this task.

- [ ] **Step 3: The noise members**

In `test/noise-floor.test.ts` add the P4 set: the u32 members (`indirect-finalize / counts9`, `scan-block / random1m`, `scan-add / random20k-cellStart`, `histogram / random1m-4096`, `histogram / random20k-cellHist`, `counting-scatter / random1m-4096-keys`, `radix-hist / random1m-24-table`, `radix-scatter / random1m-24`, `grid-cell-key / random20k`: `dtype "u32"`, the `degree` member's shape `:307-315`, cross-adapter rows only), the f32 stage members through `stageRows` / `stageTolerances` (`segmented-reduce / hub10k-tiers` -> `segmented-reduce.tiers`, `spmv-pull / hub10k-tiers` -> `spmv-pull.tiers`, `fa2-attraction / hub10k-K2-tiers` -> `tiers-inspect.attraction`, `grid-centroid / random20k-pyramid` -> `grid-inspect.pyramid` (no twin: G4 has no reduction), `grid-downsample / random20k-L1` -> `grid-inspect.downsample` (no twin), `grid-centroid-hub / hubcell-L0` -> `grid-inspect.hubCentroid` (twin `grid-twins.hubCentroid.twin` / `grid-twins.hubCentroid`), `grid-far-field / random20k-far` -> `grid-inspect.farField`, `grid-near-field / random20k-near` -> `grid-inspect.nearField` (twin `grid-twins.force.twin` / `grid-twins.force`), `fa2-stats-finalize / random20k-K1-grid` -> `grid-inspect.k1`, `fa2-integrate / random20k-K5-grid` -> `grid-inspect.positions`), and the approximation members (`grid-exact / random20k-rms` -> `grid-exact.rms` with metric `"elementwise"` over the per-node error vector, `grid-exact / random20k-p99` -> `grid-exact.p99`, `grid-expansion / random20k-spread200` -> `grid-expansion`, `grid-distributional / random20k-metrics200` -> `grid-distributional` (the `metrics100` member's shape `:297-303`), `grid-unbiased / hubcell-mean32` -> `grid-unbiased`), and spread `P4_TOLERANCE_CAPS` into `TOLERANCE_CAPS` (`:374-382`). Rule (f)'s "a noise-floor row per kernel", id by id: `indirect-finalize` (counts8), `scan-block` (random1m), `scan-add` (random20k-cellStart), `histogram` (random1m-4096, random20k-cellHist), `counting-scatter` (random1m-4096-keys), `radix-hist` (random1m-24-table), `radix-scatter` (random1m-24), `grid-cell-key` (random20k), `grid-centroid` (random20k-pyramid), `grid-centroid-hub` (hubcell-L0), `grid-downsample` (random20k-L1), `grid-far-field` (random20k-far), `grid-near-field` (random20k-near) -- thirteen ids, thirteen rows at least; the branch rows are `segmented-reduce` / `spmv-pull` / `fa2-attraction` (hub10k-tiers, hub10k-K2-tiers) and `fa2-stats-finalize` (random20k-K1-grid).

Run: `cd $PKG && pnpm exec eslint test/noise-floor.test.ts && pnpm exec vitest run --project=node test/noise-floor.test.ts`
Expected: the read-only validation FAILS on the new members (`fixture is missing`), which Step 4 records.

- [ ] **Step 4: The recording run (the G3 sequence)**

```bash
cd $PKG && mkdir -p tmp/p4
W='GRAPHTY_NOISE_FLOOR_WRITE=1'
SUITES='test/kernel/indirect.test.ts test/primitives/scan.test.ts test/primitives/histogram.test.ts test/primitives/radix-sort.test.ts test/primitives/tiers.test.ts test/primitives/grid.test.ts test/primitives/grid-pyramid.test.ts test/layouts/tiers-inspect.test.ts test/layouts/grid-inspect.test.ts test/layouts/grid-twins.test.ts test/layouts/grid-exact.test.ts'
eval $GPU_NV $W pnpm exec vitest run --project=node -t 'GRAPHTY_NOISE_FLOOR_WRITE=1 only' $SUITES 2>&1 | tee tmp/p4/write-nvidia.log
eval $GPU_LLVM $W pnpm exec vitest run --project=node -t 'GRAPHTY_NOISE_FLOOR_WRITE=1 only' $SUITES 2>&1 | tee tmp/p4/write-lavapipe.log
eval $GPU_NV $W pnpm exec vitest run --project=node test/noise-floor.test.ts 2>&1 | tee tmp/p4/floor-nvidia.log
eval $GPU_LLVM $W pnpm exec vitest run --project=node test/noise-floor.test.ts 2>&1 | tee tmp/p4/floor-lavapipe.log
pnpm exec prettier --write test/fixtures/noise benchmarks/results/noise-floor.json
```

Expected: every writer case passed; `node -e "const d=require('./benchmarks/results/noise-floor.json'); console.log(Object.keys(d.tolerances).filter(k=>/^(grid-|tiers-|segmented-reduce\.tiers|spmv-pull\.tiers)/.test(k)).length)"` -> `17` (the `P4_TOLERANCE_CAPS` ids of Step 1); every u32 row `maxRelError 0` (the cross-adapter keys bitwise, PD-10; if a `grid-cell-key` row is NOT 0, PD-10 is broken -- an `fma` contraction or a division crept in -- and T8 owns the fix); every f32 stage floor under its cap; the five approximation floors printed with their fixtures (the RMS floor is the number the record's item 1 reads: the design expects a few percent; the p99 floor on `clumpy1000` and `isolated` is the one to watch).

- [ ] **Step 5: Check mode on both adapters**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts/grid-inspect.test.ts test/layouts/grid-twins.test.ts test/layouts/grid-exact.test.ts test/layouts/tiers-inspect.test.ts test/primitives/tiers.test.ts test/noise-floor.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/grid-inspect.test.ts test/layouts/grid-twins.test.ts test/layouts/grid-exact.test.ts test/layouts/tiers-inspect.test.ts test/primitives/tiers.test.ts test/noise-floor.test.ts`
Expected: PASS on both; the `[grid-inspect]` lines print every stage error; `grid-exact` prints RMS / p99 per fixture and size, all under their derived tolerances (a fixture above: a finding for G4 section 7, PD-20 -- record it, never loosen).

- [ ] **Step 6: Green check and commit (owner)** -- `cd $PKG && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage` green, coverage at or above 80 / 80 / 75 / 80; then `test(webgpu-graph-algorithms): add the grid parity suites and record their noise floors` through `tools/commit-changes.sh`. The body records PD-19, PD-20, the fixture and tolerance counts, and the RMS / p99 per fixture.

---

### Task P4-T12: The G6 / G7 sabotage rows, the settle, saturation and determinism items

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.9 item 1 ("the outside pseudo-cell dropped", "the last workgroup's rows skipped"), 13 rule (f) and row P4 gate ("the settle test on the isolated-node fixture"; "bitwise determinism with `deterministic: true`"; "a software-adapter saturation case with `gridMax2D = 32`"; "3D at 27 / 216 loops with the pyramid asserted <= 40 MB"; "lavapipe runs the grid suite at `gpuScale` sizes in <= 4 min"), 7.17 (`:2245-2273`: the RMS-radius normaliser; "the settle test ... asserts the core is still moving when `settled` would have fired under a bbox-radius normaliser"), 7.7 R-24 (`:2001-2012`).

**Files:**
- Create: `webgpu-graph-algorithms/test/sabotage/grid.test.ts`, `webgpu-graph-algorithms/test/layouts/grid-settle.test.ts`
- Modify (PD-1 region T12): `test/helpers/sabotage.ts` (seven rows under `"grid-far-field"` and `"grid-near-field"` in `SABOTAGE`; three `"fa2-stats-finalize"` rows in `SABOTAGE_P4_TIERS`; the EMPTY `SABOTAGE_P4_LAW` table T13 fills; `SABOTAGE_PHASES` gains `"P4"`; `GRID_INSPECT_TEST` / `GRID_EXACT_TEST`, declared once, here), `webgpu-graph-algorithms/test/sabotage/coverage.test.ts` (`:28`: the phase list assertion gains `"P4"`)

**Interfaces:**
- Consumes: `captureGridStages` / `gridStageReport` / `exactVsGrid` / `gridTolerance` (T11), `withSabotage`, `SABOTAGE`, `SABOTAGE_P4_TIERS`, the `isolated` fixture, `spread`.
- Produces: `SABOTAGE["grid-far-field"]` (4), `SABOTAGE["grid-near-field"]` (3); `SABOTAGE_P4_TIERS["fa2-stats-finalize"]` (3); `SABOTAGE_P4_LAW` (empty, typed as `SABOTAGE_P4_TIERS`; T13 fills it -- this suite runs whatever the table holds, so it type-checks and passes before T13); the phase `"P4"` under the coverage rule (every P4 kernel now has >= 3 rows: the thirteen new ids of T1-T4, T8-T10).

**PLAN DECISION PD-21 (where the rows live).** The thirteen new kernels' rows go under their own ids in `SABOTAGE` (`coverage.test.ts` gates by phase and finds them once `"P4"` is listed); the BRANCH rows (`TIER` 1 / 2 on three P2 / P3 / P7 kernels, K1's grid block, T13's `LAW` on G6 / G7) live in `SABOTAGE_P4_TIERS` and `SABOTAGE_P4_LAW`, measured by `tiers.test.ts` and `grid.test.ts` only: their host suites (`segmented-reduce.test.ts`, `fa2.test.ts`, `spmv.test.ts`) never reach those lines and would rightly report the mutants surviving (the P5 `SABOTAGE_P5` precedent).

- [ ] **Step 1: The seven rows and the phase**

Append to `SABOTAGE` (`const GRID_INSPECT_TEST = "test/layouts/grid-inspect.test.ts"; const GRID_EXACT_TEST = "test/layouts/grid-exact.test.ts";`):

```ts
    "grid-far-field": Object.freeze([
        { name: "pseudo-cell-term-dropped", find: "f = f + cell_force(pi, pyramid[grid_cells()]);", replace: "f = f + vec3f(0.0);", minFactor: 10, test: GRID_INSPECT_TEST },
        { name: "softening-dropped", find: "let d2 = dot(d, d) + S.eps * S.eps;", replace: "let d2 = dot(d, d);", minFactor: 10, test: GRID_INSPECT_TEST },
        { name: "own-neighbourhood-double-counted", find: "if (abs(cx - cl.x) <= 1 && abs(cy - cl.y) <= 1 && abs(cz - cl.z) <= 1) { continue; }", replace: "if (false) { continue; }", minFactor: 10, test: GRID_INSPECT_TEST },
        { name: "2d-z-plane-not-collapsed", find: "if (P.dim == 2u) { c0.z = 0; }", replace: "if (false) { c0.z = 0; }", minFactor: 10, test: GRID_INSPECT_TEST },
    ]),
    "grid-near-field": Object.freeze([
        { name: "own-cell-scale-off-by-one", find: "let others = select(count, count - 1u, own);", replace: "let others = count;", minFactor: 10, test: GRID_INSPECT_TEST },
        { name: "window-not-hashed", find: "let h = lowbias32((c ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed) % count;", replace: "let h = 0u;", minFactor: 10, test: GRID_INSPECT_TEST },
        { name: "last-row-skipped", find: "let valid = t < P.n;", replace: "let valid = t + 1u < P.n;", minFactor: 10, test: GRID_INSPECT_TEST },
    ]),
```

`SABOTAGE_PHASES` becomes `["P1", "P2", "P3", "P7", "P4"]` and `coverage.test.ts:28`'s assertion follows. (`2d-z-plane-not-collapsed` is measured on the 2D `random20k` case -- in 3D the mutated line is dead and the row's report is the noise floor, so the merged `worst` comes from 2D; `own-cell-scale-off-by-one` and `window-not-hashed` are measured on `hubcell` at `nearMax: 8`, where the sampling runs; `pseudo-cell-term-dropped` on `outside5`; `last-row-skipped` leaves the sorted-last node's force at K2's value.)

Append the three K1 grid-block rows (the T10 body, Step 3 there) to `SABOTAGE_P4_TIERS` under `"fa2-stats-finalize"`, each with `test: GRID_INSPECT_TEST` and measured through that suite's `k1` stage: `grid-extent-unfloored` (`find: "let extent = max(min(bboxExtent, P.extentFactor * S.rmsRadius), GRID_EXTENT_FLOOR);"`, `replace: "let extent = min(bboxExtent, P.extentFactor * S.rmsRadius);"` -- measured on the `coincident` fixture, where the floor is what keeps `invCellSize` finite), `grid-rms-bound-dropped` (`find: "min(bboxExtent, P.extentFactor * S.rmsRadius)"`, `replace: "bboxExtent"` -- on `isolated`: the extent collapses the core), `grid-eps-zero` (`find: "S.eps = 0.25 * cellSize;"`, `replace: "S.eps = 0.0;"` -- on `random20k`, through the `farField` stage as well as `k1`). Declare the empty table T13 fills, typed as `SABOTAGE_P4_TIERS`:

```ts
/** The P4 LAW rows (PD-21, PD-22): the LAW 1 / 2 branches of grid-far-field and grid-near-field, measured by test/sabotage/grid.test.ts through exactVsGrid on the FR / spring simulations; filled by P4-T13. */
export const SABOTAGE_P4_LAW: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({});
```

- [ ] **Step 2: The sabotage suite and the settle items**

Create `test/sabotage/grid.test.ts`: the find-once loop over `SABOTAGE["grid-far-field"]`, `["grid-near-field"]`, `SABOTAGE_P4_TIERS["fa2-stats-finalize"]` and `SABOTAGE_P4_LAW` (empty until T13); per row `withSabotage` running `captureGridStages` on the row's fixture (`random20k` unless the row's comment names another) and `gridStageReport` for the row's stage (`farField`, `nearField`, `k1`), the T13 `LAW` rows through `exactVsGrid` on the FR / spring simulations; `expect(report.worst).toBeGreaterThanOrEqual(row.minFactor)`.

Create `test/layouts/grid-settle.test.ts`: (1) the settle test on `isolated` (`repulsion: "grid"`, the default `settleThreshold`): run until `settled`; assert that at the iteration `settled` fired, the mean displacement of the GIANT COMPONENT's nodes over the last `settleWindow` iterations is below `settleThreshold x rmsRadius` (the shared rule held for the core, not only for the strays), and that with a bbox-radius normaliser (`settleThreshold x layoutRadius`, computed from the trace) `settled` WOULD have fired at least 20 iterations earlier while the core's mean displacement was still above the RMS-normalised threshold (7.17's claim, measured); (2) `deterministic: true`: two full `run({ maxIter: 100 })` on `rmat14` bitwise identical (positions and `stats.trace`); (3) the software saturation case: `gridMax2D: 32` on `random20k` scaled -> `G === 32` (`inspect("cellStart").length === 32 * 32 + 2`), `stats.maxCellOccupancy >= 2`, finite after 50 iterations; (4) 3D: `random20k` in 3D runs 50 iterations finite, `inspect("pyramid").length / 4 === gridSpecFor(n, 3, tuning).pyramidCells` and the pyramid buffer's byte length <= 40 MB at every size up to `G = 128` (assert `gridPyramidBytes(gridSpecFor(1_000_000, 3, LAYOUT_TUNING_DEFAULTS)) <= 40 * 1024 * 1024`); (5) R-24 measured: on `hubcell` at `nearMax: 8`, `run({ maxIter: 500, batch: 10 })` -- print whether `settled` fired and at which iteration, and `stats.maxCellOccupancy`; the assertion is only that the run is finite and `settled` fires within 500 (if it does not, the finding goes to G4 section 7 with the R-24 mitigation as the owner's decision).

Run: `cd $PKG && TIMEFORMAT='lavapipe grid suite: %R s'; time eval $GPU_LLVM pnpm exec vitest run --project=node test/sabotage/grid.test.ts test/sabotage/tiers.test.ts test/sabotage/coverage.test.ts test/layouts/grid-settle.test.ts test/layouts/grid-inspect.test.ts test/layouts/grid-exact.test.ts test/layouts/grid-behaviour.test.ts test/layouts/grid-twins.test.ts test/layouts/tiers-inspect.test.ts test/primitives/grid.test.ts test/primitives/grid-pyramid.test.ts && eval $GPU_NV pnpm exec vitest run --project=node test/sabotage test/layouts/grid-settle.test.ts`
Expected: PASS on both; every row's worst ratio printed (record the smallest in G4 section 7); the lavapipe grid suite under 240 s (the gate's "<= 4 min"; record the wall time).

- [ ] **Step 3: Commit (owner)** -- `test(webgpu-graph-algorithms): add the grid sabotage suite and the settle and determinism checks` through `tools/commit-changes.sh`. The body records PD-21 and the smallest ratio.

---

### Task P4-T13: `LAW` on the far and near fields, and the grid tier of the Fruchterman-Reingold and spring-electrical models

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.20 (`:2442`: the FR law rides "the same exact-tile / grid kernels with `override LAW = FR`"; `:2461-2463`: `forceLaw: "fa2" | "fr" | "coulomb"` on the repulsion kernels), the P5 plan 0.3 / 0.7 and DEP-P5-D ("the `LAW` override on the grid near-field kernel is the item of whichever of P4 / P5 lands second; it is one `overrideDecls` entry and one `if (LAW == 1u)` / `if (LAW == 2u)` pair in the same shape as K3's"), the P5 plan PD-10 (the coincident kick under `LAW` 1 / 2 takes the law's magnitude at `d = FA2_DISTANCE_FLOOR`).

**P5 interaction.** P5-T2 Step 3 wrote K3's `kick_magnitude(mi, mj)` and the three-way pair block; this task copies that shape into G7's `pair_force` and adds the far-field analogue to G6's `cell_force`. P5-T3 / P5-T5's models throw for `tier === "grid"`; this task routes them through `RepulsionGrid` (T10 deleted the two pins that expected the refusal). Re-read `fa2-repulsion-exact.wgsl.ts` (the P5 text) before Step 1.

**Files:**
- Modify: `webgpu-graph-algorithms/src/wgsl/grid-far-field.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/grid-near-field.wgsl.ts`, `webgpu-graph-algorithms/src/layouts/repulsion-grid.ts` (`RepulsionGridOverrides` with `LAW`), `webgpu-graph-algorithms/src/layouts/forceatlas2.ts` (PD-1 region T13: the ONE grid-overrides object `specs()` / `bind()` hand to `RepulsionGrid` gains `LAW: 0`; nothing else), `webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts` and `webgpu-graph-algorithms/src/layouts/spring-electrical.ts` (`buffers`, `specs`, `bind`, `paramsFor`, `recordIteration`, `onLoad`, `readStats`: the same grid path as FA2's, `LAW` 1 / 2 in the grid overrides), `webgpu-graph-algorithms/test/layouts/fa2-options.test.ts` (PD-1 region T13: the grid entries of the `specs()` pin T10 added, `:552-560` in the P5 tree, gain `LAW: 0` on `grid-far-field` and `grid-near-field`), `webgpu-graph-algorithms/test/layouts/fr-options.test.ts` and `se-options.test.ts` (the `specs()` pins gain the grid specs and their `LAW`)
- Modify (PD-1 regions T13): `src/kernels.ts` (`{ name: "LAW", type: "u32", default: 0 }` on `GRID_FAR_FIELD` and `GRID_NEAR_FIELD`), `test/kernel/registry.test.ts`, `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` (`grid-far-field` 1 -> 3, `grid-near-field` 9 -> 25; `P4: 21 + 2 + 16 = 39`), `test/helpers/sabotage.ts` (`SABOTAGE_P4_LAW`, twelve rows)
- Create: `webgpu-graph-algorithms/test/layouts/grid-law.test.ts`

**Interfaces:**
- Consumes: `RepulsionGrid` (T10), `exactVsGrid` (T11: it takes a factory, so the FR / spring simulations pass through it with their own `EXACT` / `GRID` tunings), `FR_STAGES` / `SE_STAGES` (P5: replaced by the union list), the P5 override constants (`LAW: 1` / `2`).
- Produces: the `LAW` branches of G6 / G7; `RepulsionGridOverrides = RepulsionExactOverrides & { readonly LAW: 0 | 1 | 2 }`; the FR and spring grid tiers; `SABOTAGE_P4_LAW`.

**PLAN DECISION PD-22 (one declaration each, the same checks).** G7's near field is K3's pair law, so it takes K3's `LAW` block verbatim (the kick magnitude, the unfloored FR / coulomb laws); G6's far field takes the per-cell analogue: `LAW 1`: `d * (P.frK * P.frK * q.w / d2)` (FR mass is 1 for every node, so `q.w` is the cell's count), `LAW 2`: `d * (-P.coulomb * pi.w * q.w / (d2 * sqrt(d2)))`, both on the softened `d2`. The FR and spring models route `tier === "grid"` through the same `RepulsionGrid` with `LAW` in their override sets; their grid tier is checked against THEIR OWN exact tier (K3 with `LAW` 1 / 2, the P5 kernels) with the FA2 caps of T11 -- the approximation is the same construction, and no new oracle is needed.

- [ ] **Step 1: The branches**

In `grid-far-field.wgsl.ts` replace `cell_force`'s last line `return d * (P.scalingRatio * pi.w * q.w / d2);             // LAW 0 (FA2): |F| = k m_i M_cell / d` with

```wgsl
    if (LAW == 1u) { return d * (P.frK * P.frK * q.w / d2); }                       // LAW 1 (FR, 7.20): k^2 / d per node, q.w nodes at the centroid
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * q.w / (d2 * sqrt(d2))); }     // LAW 2 (coulomb): -g m_i M_cell / d^2
    return d * (P.scalingRatio * pi.w * q.w / d2);             // LAW 0 (FA2): |F| = k m_i M_cell / d
```

In `grid-near-field.wgsl.ts` replace `pair_force` with K3's shape (P5-T2 Step 3):

```wgsl
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (the P5 plan's PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
fn pair_force(i: u32, pi: vec4f, jj: u32, o: vec4f) -> vec3f {  // the exact pair law of K3 (7.6, 7.20): the floor (FA2 only), the coincident kick
    let d = pi.xyz - o.xyz;
    var d2 = dot(d, d);
    if (d2 < FA2_COINCIDENT_SQ) { return kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w); }
    if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }
    let k = P.scalingRatio * pi.w * o.w;
    if (LAW == 1u) { return d * (P.frK * P.frK / d2); }
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }
    return d * (k / d2);
}
```

Add the `LAW` declaration to both entries; `U32_OVERRIDE_VALUES.LAW` already lists `[0, 1, 2]` (P5-T2); the pins and the P4 count follow (`P4: 39`). `RepulsionGrid.create` / `specs` take `RepulsionGridOverrides` and pass `LAW` to G6 and G7.

- [ ] **Step 2: The two models' grid tier and the tests**

In `fruchterman-reingold.ts` and `spring-electrical.ts`: `stages` = the union list (PD-17); `buffers` = the P5 list + `hubCounters` + the grid buffers by `tierFor` (PD-18); `specs` = the P5 specs + `RepulsionGrid.specs({ ...the K3 subset, LAW }, spec)`; `bind` on the grid tier creates the stage with `LAW` 1 (FR) / 2 (spring) and binds K1 as FA2 does; `paramsFor` writes `gridMax` / `levels` on the grid tier; `recordIteration` the three compute passes before `toScene` (PD-16); `onLoad` the grid extent; `readStats` the tier and the two grid stats. Create `test/layouts/grid-law.test.ts`: (1) `createFruchtermanReingold(ctx, { seed: 7, repulsion: "grid", iterations: 1_000_000 })` and `createSpringElectrical(ctx, { seed: 7, repulsion: "grid" })` on `random20k` (scaled), 2D and 3D: `exactVsGrid` against their own exact tier -> `rms <= gridTolerance("grid-exact.rms")`, `p99 <= gridTolerance("grid-exact.p99")` (the FA2 rows of T11 are the basis: PD-22), twice bitwise first; (2) the FR grid run is finite and cools (the temperature trace decreases), the spring grid run is finite and `kineticEnergy` falls by 100x over 200 iterations on `storyGraph()` (P5-T5's fixture) forced onto the grid with `repulsion: "grid"`; (3) the pipeline keys of the two runs carry `LAW: 1` / `LAW: 2` on `grid-far-field` and `grid-near-field`; (4) `"auto"` with `exactMaxNodes: 8` sends both models to the grid on karate.

- [ ] **Step 3: The twelve `LAW` rows**

Replace the empty `SABOTAGE_P4_LAW` T12 declared in `test/helpers/sabotage.ts` with the twelve rows (`const GRID_LAW_TEST = "test/layouts/grid-law.test.ts";`): on `grid-far-field`: `fr-far-k-linear` (`(P.frK * P.frK * q.w / d2)` -> `(P.frK * q.w / d2)`), `fr-far-law-skipped` (`if (LAW == 1u) { return d * (P.frK` -> `if (LAW == 3u) { return d * (P.frK`), `fr-far-count-dropped` (`P.frK * P.frK * q.w / d2` -> `P.frK * P.frK / d2`), `coulomb-far-sign` (`(-P.coulomb * pi.w * q.w / (d2 * sqrt(d2)))` -> `(P.coulomb * pi.w * q.w / (d2 * sqrt(d2)))`), `coulomb-far-inverse-linear` (`pi.w * q.w / (d2 * sqrt(d2))` -> `pi.w * q.w / d2`), `coulomb-far-law-skipped` (`if (LAW == 2u) { return d * (-P.coulomb` -> `if (LAW == 3u) { return d * (-P.coulomb`); on `grid-near-field`: the six K3 rows of P5-T7 Step 1 transcribed onto `pair_force`'s lines (`fr-near-inverse-square`, `fr-near-k-linear`, `fr-near-law-skipped`, `coulomb-near-sign`, `coulomb-near-inverse-linear`, `coulomb-near-mass-dropped`, the `find` strings being the lines written in Step 1). All measured by `GRID_LAW_TEST` through `exactVsGrid` on the FR / spring simulations (a law mutation moves the RMS by order 1 against a 5 % tolerance). `test/sabotage/grid.test.ts` (T12) runs them.

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/grid-law.test.ts test/sabotage/grid.test.ts test/sabotage/coverage.test.ts test/layouts/fr-options.test.ts test/layouts/se-options.test.ts test/layouts/fr-lifecycle.test.ts test/layouts/se-behaviour.test.ts test/kernel && eval $GPU_NV pnpm exec vitest run --project=node test/layouts/grid-law.test.ts test/sabotage/grid.test.ts`
Expected: PASS on both; the compile matrix at P4 39; every `LAW` row `>= 10`.

- [ ] **Step 4: Commit (owner)** -- `feat(webgpu-graph-algorithms): give the FR and spring-electrical models the grid tier through LAW` through `tools/commit-changes.sh`. The body records PD-22.

---

### Task P4-T14: `calibrateLayout`, the `layout-grid` benchmarks, T-5 at 100k, T-6 / T-7 and the crossover re-check

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 2.2 (`:387-400`: `calibrateLayout(ctx, options?: CalibrateOptions): Promise<GpuCalibration>` -- `sizes` default `[8_192, 16_384, 32_768, 65_536]`; `pairsPerSecond`, `exactMsPerIter`, `gridMsPerIter`, `suggestedExactMaxNodes` = "largest probed n with exactMs(n) <= min(4 ms, gridMs(n)), rounded down to a power of two", `firstCallMs`; "each size runs 10 timed iterations after `PipelineCache.warm` and one warm-up submit"; never `caps.software`), 3.3 (`:776`), D26 (`:223`: a function in `src/layouts/calibrate.ts`), 7.8 (`:2044-2055`: the P4 gate re-checks that the grid is not faster below `exactMaxNodes`), 10.4 T-5 (`:3410`: 100k grid in Chromium <= 12 ms), T-6 (`:3411`: 100k / 1M <= 10 ms 2D; 1M / 10M <= 100 ms 2D; 100k 3D <= 20 ms), T-7 (`:3412`: the attraction gather at 1M / 10M <= 15 ms), 11.6 item 8 (`:3641-3646`), 11.7 (`:3668-3669`: `layout-grid` on the ladder 32k / 65k / 100k / 262k / 1M, 2D / 3D), 13 rule (c), `docs/decisions/G3.md:121-128` (the re-check convention: "G4.md records the re-check with the `layout-grid` rows beside the `layout-exact` rows at 32k and 65k").

**Files:**
- Create: `webgpu-graph-algorithms/src/layouts/calibrate.ts`, `webgpu-graph-algorithms/benchmarks/layout-grid.bench.ts`, `webgpu-graph-algorithms/test/layouts/calibrate.test.ts`
- Modify: `webgpu-graph-algorithms/src/index.ts` (`calibrateLayout` value; `CalibrateOptions` / `GpuCalibration` types), `webgpu-graph-algorithms/src/types/layout.ts` (the two records, verbatim from 2.2), `webgpu-graph-algorithms/test/index.test.ts` (`calibrateLayout` moves from `NEVER_EXPORTED` `:93` to `VALUE_EXPORTS`), `webgpu-graph-algorithms/test/types/public-api.test-d.ts` (the two types), `webgpu-graph-algorithms/benchmarks/layout-exact.bench.ts` (`exactMaxNodesFromLadder(rows, budgetMs, gridRows?)`, PD-24), `webgpu-graph-algorithms/benchmarks/run.ts` (`GROUPS` gains `[LAYOUT_GRID_GROUP]`; the usage comment), `webgpu-graph-algorithms/benchmarks/layout-run.ts` (`--repulsion exact|grid|auto`, `--dim` already there; the final `layoutMetrics` print), `webgpu-graph-algorithms/test/benchmarks.test.ts` (the group's pins and the grid clause), `webgpu-graph-algorithms/test/browser/bench.test.ts` (the 100k grid case), `webgpu-graph-algorithms/README.md` (the group list `:273-281`; the T-5 / T-6 / T-7 rows of both tables), `webgpu-graph-algorithms/src/constants.ts` (`EXACT_MAX_NODES` re-fixed if the re-check moves it, with the new citation), `webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json` and `gpu-linux-t4.json` (one appended session each, through the append script)
- NOT touched: `scripts/bench-compare.js`, `webgpu-graph-algorithms/CLAUDE.md` (T17 owns it)

**Interfaces:**
- Consumes: `createForceAtlas2`, `PipelineCache.warm`, `Lcg` (`seed.ts:26`), `fromEdgeArrays` (graph-format), `bench` / `appendSession` / `BenchResult` (`harness.ts`), `warmClock` / `reportedRow` (P5-T8's exports), `randomEdges` / `snapshotOf` (`datasets.ts`), `ForceSimulation.lastPassTimings` (T10), `EXACT_LADDER` / `ladderRowsOf` / `floorPow2`.
- Produces: `calibrateLayout`, `CalibrateOptions`, `GpuCalibration`; `LAYOUT_GRID_GROUP = "layout-grid"`, `GRID_LADDER` (`32k 32768, 65k 65536, 100k 100000, 262k 262144, 1M 1000000`), `runLayoutGridBenchmarks(ctx)` (per rung and dim: `grid step(1) wall n=<n> m=<m> <2D|3D> [<label>]`, `grid ms/iteration (<source>) n=<n> <2D|3D> [<label>]`, and at 1M 2D `attraction ms/iteration (profiler) n=1000000 [1M]` from the `fa2-attraction` pass timing); `exactMaxNodesFromLadder`'s grid clause; the 100k Chromium row `fa2-grid-100k-step1-readback`.

**PLAN DECISION PD-23 (`calibrateLayout` builds its own graphs).** `src/` cannot import `test/helpers` or `benchmarks/`; the probe graphs are `fromEdgeArrays` snapshots of `10 n` seeded edges from an `Lcg` (`seed.ts`) with a fixed seed, built inside `calibrate.ts` and released after the probe; each size runs both tiers (`repulsion: "exact"` and `"grid"`, `maxInFlight: 1`, `maxIter` unreachable) for one untimed `step(1)` after `PipelineCache.warm` of the model's specs, then ten timed `step(1)` calls whose `stats.msPerIteration` (the profiler's GPU time when granted, else wall) are averaged; `firstCallMs` is the wall time of the whole call. The function reads `caps` for nothing but the device (never `caps.software`, 7.8 / Q-6): on lavapipe it returns honest numbers a test can compare in shape, never in value.

**PLAN DECISION PD-24 (the grid clause).** `exactMaxNodesFromLadder(rows, budgetMs = EXACT_BUDGET_MS, gridRows?: readonly LadderRow[])`: a rung is a candidate iff its exact time is within the budget AND (when `gridRows` holds the same `n`) not above the grid time at that `n`; the result is the largest candidate rounded down to a power of two, the one function the G3 record and `test/benchmarks.test.ts` already pin. The `layout-grid` group runs the two shared rungs (32k, 65k) in 2D so the re-check has its rows.

- [ ] **Step 1: `calibrateLayout` and its test**

Create `src/layouts/calibrate.ts` exporting `calibrateLayout` exactly as 2.2 declares it (`ctx.assertReady()` first; `sizes` validated as positive integers, `E_INVALID_ARGUMENT`), the two records in `src/types/layout.ts` verbatim from the design:

```ts
export interface CalibrateOptions { readonly sizes?: readonly number[] | undefined; }
export interface GpuCalibration {
    readonly pairsPerSecond: number;
    readonly exactMsPerIter: Readonly<Record<number, number>>;
    readonly gridMsPerIter: Readonly<Record<number, number>>;
    readonly suggestedExactMaxNodes: number;
    readonly firstCallMs: number;
}
```

`suggestedExactMaxNodes` through `exactMaxNodesFromLadder`'s rule re-implemented locally in `src/` (the benchmark file is not importable from `src/`: the four-line loop, with the JSDoc naming `benchmarks/layout-exact.bench.ts` as the twin the test compares it with). Create `test/layouts/calibrate.test.ts`: `calibrateLayout(ctx, { sizes: [1024, 2048] })` on any adapter returns finite positive times for both tiers at both sizes, a power-of-two `suggestedExactMaxNodes` in `[1024, 2048]` or the rule's answer over the numbers it reports (recompute it from the returned records with the benchmark file's `exactMaxNodesFromLadder` and assert equality), `firstCallMs > 0`; a second call is faster than the first (`firstCallMs` compiled nothing); `sizes: [0]` and `[1.5]` rejected; `ctx.allocator.liveBuffers` back to its value before the call (every probe released).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/calibrate.test.ts test/index.test.ts`
Expected: PASS after the barrel edit (`index.test.ts` moves the name).

- [ ] **Step 2: The `layout-grid` group, `--repulsion`, the browser rung**

Create `benchmarks/layout-grid.bench.ts` (the `layout-exact.bench.ts` shape through P5-T8's `warmClock` / `reportedRow`): for each rung of `GRID_LADDER` and each `dim` in `[2, 3]` (3D at 1M is ~55-175 ms per iteration by 7.21: included, it is the T-6 3D row's neighbour), `snapshotOf(randomEdges(n, 10 n, SEED))`, `createForceAtlas2(ctx, { dim, seed, maxIter: 1_000_000, iterationsPerStep: 1, maxInFlight: 1, repulsion: "grid", compat: "paper" })`, `warmClock`, `bench(...)` on `step(1)` with `items: n`, `unit: "nodes"`, the `reportedRow` of `stats.msPerIteration`, and at 1M 2D one more `reportedRow` of the `fa2-attraction` pass from `sim.lastPassTimings` (T-7); dispose and release. `layout-run.ts` gains `--repulsion exact|grid|auto` (default `auto`) passed through the tuning, and after its last batch prints the `layoutMetrics` of the final positions (`spread`, the edge-length quantiles, the nearest-neighbour histogram) through a relative import of `test/helpers/metrics.ts:296` (a pure-data module; `tsconfig.json:22-23` compiles `test/` and `benchmarks/` together and no eslint zone separates them) -- T15 Step 2 reads that print for the 1M 200-iteration comparison. `test/browser/bench.test.ts` gains the 100k case (`randomEdges(100_000, 1_000_000, 5)`, `repulsion: "grid"`, the same 5 + 50 frames, row `fa2-grid-100k-step1-readback`, group `layout-browser`). `test/benchmarks.test.ts` pins `LAYOUT_GRID_GROUP`, the five rungs, the row-name shapes and the grid clause of `exactMaxNodesFromLadder` (a table where the grid beats the exact tier at 32k lowers the answer to 16,384).

Run: `cd $PKG && pnpm exec vitest run --project=node test/benchmarks.test.ts && pnpm run lint && eval $GPU_LLVM pnpm exec tsx benchmarks/run.ts --allow-software --runs 1 --no-save layout-grid && eval $GPU_LLVM pnpm exec tsx benchmarks/layout-run.ts --nodes 2000 --edges 20000 --iterations 20 --repulsion grid`
Expected: the test passes; the software run prints the rows labelled not representative (the 1M rungs on lavapipe take minutes: pass `--runs 1`; this proves the group runs, not a number); the driver prints `tier grid`, finite positions, exit 0.

- [ ] **Step 3: The dev-box baseline and the re-check (owner's GPU, quiet card)**

Write `tmp/p4/append-session.mjs` (`docs/decisions/G3.md` appendix A verbatim with `REQUIRED_GROUPS = ["upload", "roundtrip", "layout-exact", "pagerank", "wcc", "layout-fr", "layout-grid"]`) and `tmp/p4/exact-max-nodes.ts` (`G3.md:584-` extended to pass the `layout-grid` 2D rows at 32k / 65k as `gridRows`). With nothing else on the card (`nvidia-smi --query-gpu=utilization.gpu,memory.used,clocks.sm,pstate --format=csv`):

Run: `cd $PKG && eval $GPU_NV XDG_RUNTIME_DIR=/tmp pnpm run bench && node tmp/p4/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json && node scripts/bench-compare.js && pnpm exec tsx tmp/p4/exact-max-nodes.ts benchmarks/results/nvidia-lovelace-driver580.json && eval $GPU_NV GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_GPU_REQUIRE=nvidia node scripts/run-browser-project.js`
Expected: seven groups; the append reports one more session; `bench:compare` prints every pre-existing row within 3x and the `layout-grid` rows `new`; the re-check prints the exact and grid ms per iteration at 32k and 65k and the rule's value -- if it differs from 32768, edit `EXACT_MAX_NODES` and its citation (the constants test pins it) and record the change in G4 section 7; T-6: the `grid ms/iteration` medians at 100k 2D (<= 10), 1M 2D (<= 100), 100k 3D (<= 20); T-7: the attraction row at 1M (<= 15); the browser run's JSON carries `fa2-grid-100k-step1-readback` (T-5 100k <= 12 ms). A missed target is an owner decision in G4 section 7 (10.4), never a relaxed row.

- [ ] **Step 4: The lane baseline (through the PR) and the README rows**

As P5-T8 Step 3: after the PR carries the `gpu` label, download `gpu-results-<run id>` and append `benchmarks/out/gpu-linux-t4.json` into `benchmarks/results/gpu-linux-t4.json` with the same script (a second commit on the PR); until then the G4 record's T4 column carries `{{OPEN: P4-T14 Step 4}}`. Add to both README tables the rows `T-5 (100k)`, `T-6` (three numbers) and `T-7` with the measured medians, and `layout-grid` to the group list (`:273-281`).

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): add calibrateLayout, layout-grid and the crossover re-check` through `tools/commit-changes.sh`; the T4 session lands as `feat(webgpu-graph-algorithms): record the layout-grid T4 lane baseline` once the artifact is in. The body records PD-23, PD-24 and the re-check's numbers.

---

### Task P4-T15: The `node-limits` project's six files

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.1 (`:3438`: bindings > 128 MiB, `maxBufferSize` near 2 GiB, a real 2D dispatch above 16,776,960 items on 100M elements, vendor feature assertions, the OOM scope on a real over-allocation, the 262k and 1M layout fixtures), 13 row P4 gate ("`node-limits`: a real 2 GiB binding request succeeds on the 4070, a 200 MB per-array upload is bound windowed at defaults, a real 2D dispatch on 100M items"; "the one-iteration + unbiasedness checks at 1M in `node-limits`"), 11.4 (`:3577-3581`: at 1M only the one-iteration force-field comparison and the 32-iteration unbiasedness check run in the lane; the 1M 200-iteration comparison runs in the nightly benchmark job -- there is no nightly (`design/decisions/2026-09-19-no-nightly-gpu-lane.md`), so it is recorded by the owner's dev-box run of Step 2 and not by any lane), `test/limits/README.md:12-23` (the six names), 12.1 (`:3787`: the lane runs `node-limits`).

**Files:**
- Create: `webgpu-graph-algorithms/test/limits/binding-2gib.test.ts`, `windowed-200mb.test.ts`, `dispatch-2d-100m.test.ts`, `oom-scope.test.ts`, `vendor-features.test.ts`, `layout-1m.test.ts`
- Modify: `webgpu-graph-algorithms/test/limits/README.md` ("planned" -> "landed" for the six, with the G4 reference)
- NOT touched: `vitest.config.ts` (the project's include already covers `test/limits/**`), `gpu.yml`

**Interfaces:**
- Consumes: `acquire({ limits })` (`gpu.ts:58-65`: `"raise"` / `"default"` / explicit values), `GraphResidency` / `core()` (T7), `degree`, `fill` + `plan1d` over 100M words (the `linear_id` map), `AllocationTracker` (the OOM scope), `exactVsGrid` / `gridTolerance` (T11), `randomEdges` / `snapshotOf`, `fixture("isolated", ...)`, `exclusiveScan` at 16,776,961 items (T2's 11.3 item).
- Produces: the six files.

- [ ] **Step 1: The six files**

Each with `requireGpu(t)` and a fresh `acquire()`, the 600 s project timeout, and the `pagerank-1m.test.ts` shape:
- `binding-2gib.test.ts`: `acquire({ limits: "raise" })` -> `ctx.caps.limits.maxStorageBufferBindingSize >= 2 ** 31` on the 4070 (the T4 reports its own; assert `>= 2 ** 30` there by vendor: the test prints the value and asserts `> 128 MiB`), then a 1.5 GiB `STORAGE` buffer created through the allocator, bound whole to `fill` (mode 1, iota over `2^28` words in 2D dispatch), the first and last 256 words read back equal to their index.
- `windowed-200mb.test.ts`: `acquire({ limits: "default" })` (128 MiB binding) with `randomEdges(2_500_000, 25_000_000)` (50M arcs, 200 MB `colIdx`): `core.plan === "windowed"`, `core.windows.length === 2`, `degree` equals `outDegree()` bitwise, twice; and `exclusiveScan` at exactly `16_776_961` items equals its oracle (11.3's `+1` case).
- `dispatch-2d-100m.test.ts`: `fill` mode 1 over `100_000_000` words (400 MB) through `plan1d` (a 2D grid: `y > 1`), 1,000 evenly spaced words read back equal to their index, `LINEAR_ID_CHECKSUM`-style sum of the sampled words.
- `oom-scope.test.ts`: a deliberately oversized `createBuffer` (`maxBufferSize + 256`, or 8 GiB when the limit allows it) through `ctx.allocator` -> `E_OUT_OF_MEMORY` with `requested` / `resident`; the context still `ready` afterwards and a small buffer works.
- `vendor-features.test.ts`: on `vendor === "nvidia"`: `subgroups` present with `subgroupMinSize === 32 && subgroupMaxSize === 32`, `timestamp-query` granted (`ctx.profiler.enabled`), the raised limits (`maxBufferSize >= 2 ** 31`); on any other vendor the file prints the facts and asserts only the shapes.
- `layout-1m.test.ts`: (1) `exactVsGrid` at `n = 1_000_000` (`randomEdges(n, 10 n)`, `repulsion: "exact"` explicitly for the reference: one exact iteration is ~1.8 s) -> `rms <= gridTolerance("grid-exact.rms")`, `p99 <= gridTolerance("grid-exact.p99")` (the 1M one-iteration check); (2) unbiasedness at 1M on `hubcell` sized `1_000_000` (the "1M-entry hub cell" through G4b): the 32-seed mean of the near field within `gridTolerance("grid-unbiased")`; (3) at 262,144 (the finest-grid saturation size): `exactVsGrid` and the 200-iteration distributional comparison within `gridTolerance("grid-distributional")`; (4) the 1M grid run: `run({ maxIter: 100, batch: 8 })` finite, `stats.msPerIteration` printed (T-6's number is the benchmark's; this prints the lane's).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node-limits`
Expected: PASS (seven files; wall time printed per file; the 1M exact iteration dominates `layout-1m`).

- [ ] **Step 2: The 1M 200-iteration comparison (owner's dev box, once)**

Run: `cd $PKG && eval $GPU_NV pnpm exec tsx benchmarks/layout-run.ts --nodes 1000000 --edges 10000000 --iterations 200 --batch 8 --repulsion exact --seed 1 2>&1 | tee tmp/p4/exact-1m-200.log && eval $GPU_NV pnpm exec tsx benchmarks/layout-run.ts --nodes 1000000 --edges 10000000 --iterations 200 --batch 8 --repulsion grid --seed 1 2>&1 | tee tmp/p4/grid-1m-200.log`
Expected: both finish (the exact run ~6 minutes); `layout-run.ts` prints the final `layoutMetrics` of each (the print T14 Step 2 added: `spread`, the edge-length quantiles, the nearest-neighbour histogram), which the G4 record compares within 15 % by hand (11.4's 1M 200-iteration item; no lane runs it).

- [ ] **Step 3: Commit (owner)** -- `test(webgpu-graph-algorithms): add the six node-limits files of the G4 gate` through `tools/commit-changes.sh`.

---

### Task P4-T16: The decision records and the design index

**Repository:** `$WT` (exported by the phase's Step 0).

**Spec:** `design/decisions/README.md:1-27` (one decision per file, `YYYY-MM-DD-<slug>.md`, never edited after it lands, carries the argument that was REJECTED, plus a row in the index table).

**Files:**
- Create: `design/decisions/2026-09-20-compact-lands-with-the-frontier-phase.md` (DEP-P4-A), `design/decisions/2026-09-20-windowed-execution-covers-degree-and-segmented-reduce.md` (DEP-P4-B), `design/decisions/2026-09-20-sort-scratch-is-model-owned.md` (DEP-P4-D), `design/decisions/2026-09-20-scan-has-no-subgroup-variant.md` (DEP-P4-E), `design/decisions/2026-09-20-far-field-levels-are-a-uniform.md` (DEP-P4-G), `design/decisions/2026-09-20-cell-histogram-is-zeroed-by-a-fill-dispatch.md` (DEP-P4-H), `design/decisions/2026-09-20-workgroup-row-tiers-fold-without-kahan.md` (DEP-P4-J)
- Modify: `design/decisions/README.md` (seven index rows), `design/README.md` (`:14` the decisions count +7; `:21` the webgpu count +1 for this plan), `design/webgpu/README.md` (a row for this plan: "Phase P4: the scale layer -- the grid pyramid, the degree tiers, windowed execution, `calibrateLayout` (design P4), gate G4", Status `live plan`)
- NOT touched: `design/webgpu/webgpu-acceleration-plan.md` (the Review-log practice was retired, `design/decisions/README.md:14-21`)

- [ ] **Step 1: The seven records**

Each follows `design/decisions/2026-09-19-spmv-tier-zero-only.md`: an H1 stating the decision as a sentence without a trailing period; `Date: 2026-09-20`; `Decided by: the owner`; `Changes:` naming the design lines it supersedes and saying they are NOT edited; `## The decision`; `## Why`; `## What we are giving up, and why it is acceptable` (quoting the superseded text verbatim and conceding what it gets right); `## What would reverse this` (testable, counted). The rejected arguments: (A) building `compact` / `dedupe` in P4 because 6 row 4 lists them -- rejected under rule (b), no G4 item exercises them; reversed when P8's frontier or P11's Louvain names them. (B) the window loop inside `ForceSimulation` and `spmvPull` -- rejected because the ring holds one params record per iteration and the pull's epilogue needs a finalize; reversed when a consumer loads a snapshot above 33.5M arcs at the default limits or the 10M / 100M tier enters a gate. (D) leasing the sort scratch per batch -- rejected because `Kernel.bind` caches by buffer identity and the grid's bind groups would be rebuilt every batch; reversed if the 16 B/node makes a 12 GB card miss the 10M / 100M tier. (E) a subgroup scan -- rejected because exact u32 sums make the twin indistinguishable; reversed if T-6's profile shows the scan above 10 % of the grid iteration. (G) an `override LEVELS` on the far field (design 7.7 G6, `:1977`) -- rejected because it puts the level count into the pipeline key and recompiles G6 on every `G` change for loops that run fine over a uniform bound; reversed if T-6's profile shows the far field's loop overhead above 10 % of the grid iteration on a level count the override would fix. (H) `encoder.clearBuffer(cellHist)` (design 7.7 G3, `:1972`) -- rejected because the clear must sit between K1's read of last iteration's count and this iteration's histogram, inside the pass; reversed if `CommandBatch` gains a clear that a profiler row shows cheaper than the `fill` dispatch at 1M. (J) Kahan compensation in the workgroup-per-row loops (design 6 row 3, `:1570`) -- rejected on `docs/decisions/G7.md:121-124`'s evidence that Metal folds it away, giving one kernel two floors; reversed if a tier's recorded `oracle-f64` floor lands above its 1e-4 cap on any adapter.

- [ ] **Step 2: Index them**

Run: `cd $WT && ls design/decisions/*.md | wc -l && LC_ALL=C grep -rnP '[^\x00-\x7F]' design/decisions/ design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md | wc -l`
Expected: `21` (the README plus twenty records: thirteen after P5 and seven here) and `0`.

- [ ] **Step 3: Commit (owner)** -- `docs: record the P4 design decisions beside the WebGPU design` through `tools/commit-changes.sh`. TYPE `docs`, no scope.

---

### Task P4-T17: The G4 gate record and the phase close

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 13 row P4 line 4211 (the G4 checklist, transcribed below); 13 rule (a); 10.4 (`:3397-3402`).

**Files:**
- Create: `webgpu-graph-algorithms/docs/decisions/G4.md`
- Modify: `webgpu-graph-algorithms/CLAUDE.md` (`:57` the wgsl inventory gains the thirteen P4 bodies; `:58` the primitives line gains `scan.ts`, `histogram.ts`, `radix-sort.ts`, `grid.ts`; `:60` the layouts line gains `repulsion-grid.ts`, `calibrate.ts`; `:71` the limits line lists the seven files; the benchmark groups table `:115-121` gains the `layout-grid` row; `:142-145` the `exactMaxNodes` paragraph says the grid clause is re-checked and cites G4; a "Settled at G4" table after "Settled at G3" with the measured facts of Step 1)
- NOT touched: `docs/decisions/G0.md` .. `G7.md` (closed records)

- [ ] **Step 1: The full green check on both adapters, the browser and the limits**

```bash
cd $PKG
pnpm run build:all && pnpm run lint
(cd .. && pnpm exec knip)
eval $GPU_NV pnpm exec vitest run --project=node
eval $GPU_NV pnpm exec vitest run --project=node-limits
TIMEFORMAT='lavapipe node project: %R s'
time eval $GPU_LLVM pnpm exec vitest run --project=node --coverage
GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node
GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js
eval $GPU_NV GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_GPU_REQUIRE=nvidia node scripts/run-browser-project.js
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs | wc -l
```

Expected: as commented; coverage at or above 80 / 80 / 75 / 80; the non-ASCII count 0; the lavapipe wall time under the 900 s lane budget (T-12) and the grid suite of T12 under 240 s.

- [ ] **Step 2: Write the G4 record**

Create `$PKG/docs/decisions/G4.md`; every `<...>` cell is a number or a string copied from the named command's output, and the owner signs the last section:

````markdown
# G4 -- The scale layer: grid pyramid and degree tiers (spec 13 row P4)

Recorded by: Task P4-T17 of `design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md`, 2026-09-DD (every
measurement below ran on the dev box on 2026-09-DD local time; the benchmark session date is UTC). The owner signs
section 7. Commits: the seventeen of the P4 PR (<short hashes once committed>), plus the lane follow-up commit that
carries the T4 baseline.
Environment: `@graphty/webgpu-graph-algorithms` <version> over `@graphty/layout` <version>, Node <version>, pnpm 10.0.0,
vitest 3.2.7, the `webgpu` npm package 0.4.0 (Dawn), <OS>, NVIDIA driver <version>, Mesa lavapipe <version>, Playwright
<version> with Chromium <build>. Every command ran from `webgpu-graph-algorithms/` in the worktree
`.worktrees/gpu-scale-layouts` (branch `feat/gpu-p5-p4`); the logs are under `tmp/p4/` (gitignored).

The rule of this record (spec 10.4): every number is measured and names the command or the file it came from; a
missed target is never relaxed here -- it is re-fixed by an owner decision in section 7, or the phase stays open.

GATE STATUS: <GREEN / OPEN> on the dev box; the GPU lane rows carry `{{OPEN: ...}}` until the labelled PR has run.

## 0. What the phase built (the deliverable of spec 13 row P4)

`exclusiveScan`, `histogram` / `countingSortByKey`, `radixSort`, the indirect finalize with `planIndirect` and
`Kernel.dispatchIndirect`; the mid / high tiers of `segmentedReduce`, `spmvPull` and K2 over `degreeOrder()`; windowed
execution for `degree` and `segmentedReduce`; G1-G7 with G4a / G4b, `RepulsionGrid`, the grid tier of the three models,
`repulsion: "auto"`, `calibrateLayout`, the grid stats and options; the exact-vs-grid suites; the six `node-limits`
files; `layout-grid` with T-6 / T-7, T-5 at 100k; thirteen new kernels with <n> sabotage rows, <n> derived tolerances.
The departures are `design/decisions/2026-09-20-compact-lands-with-the-frontier-phase.md`,
`-windowed-execution-covers-degree-and-segmented-reduce.md`, `-sort-scratch-is-model-owned.md`,
`-scan-has-no-subgroup-variant.md`, `-far-field-levels-are-a-uniform.md`, `-cell-histogram-is-zeroed-by-a-fill-dispatch.md`,
`-workgroup-row-tiers-fold-without-kahan.md`; the fixture substitution DEP-P4-C (`polyline163`), the sequencing DEP-P4-F,
the kernel-id reuse DEP-P4-I (G3 is `histogram`, G4a is `indirect-finalize`), the near-field own-cell scale DEP-P4-K
(`others / sampled` over the realised sample), G4b's sixth binding DEP-P4-L (`hubCount`) and the `nearMax >= 2`
contract tightening DEP-P4-M (a published option; `nearMax: 1` is now `E_INVALID_ARGUMENT`).

## 1. Adapters exercised

| Adapter | Runtime | adapter class | runner class | subgroups | how it was run |
| --- | --- | --- | --- | --- | --- |

## 2. The G4 checklist (spec 13 row P4), each item mapped to its evidence

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | exact-vs-grid at 20k / 100k / 262k: RMS <= 5 %, p99 <= 25 % on uniform, clumpy and isolated-node fixtures with the floored denominator | `test/layouts/grid-exact.test.ts` case 1 (20k, 100k), `test/limits/layout-1m.test.ts` case 3 (262k); tolerances `grid-exact.rms` = <v> (basis <row>), `grid-exact.p99` = <v> | <RMS / p99 per fixture and size> | pass / fail |
| 2 | unbiasedness (the Horvitz-Thompson path, mean over 32 seeded iterations within 5 %) | `grid-exact.test.ts` case 3; `layout-1m.test.ts` case 2; tolerance `grid-unbiased` = <v> | <mean error on hubcell / onecell1025 / 1M> | pass / fail |
| 3 | distributional 15 % over 200 iterations at 20k / 100k / 262k | `grid-exact.test.ts` case 5; `layout-1m.test.ts` case 3; `grid-distributional` = <v> | <worst metric error> | pass / fail |
| 4 | expansion parity within 25 % at 50 and 200 iterations | `grid-exact.test.ts` case 4; `grid-expansion` = <v> | <spread ratios> | pass / fail |
| 5 | an isolated node's force equals gravity | `grid-exact.test.ts` case 2 | <max error> | pass / fail |
| 6 | bitwise determinism with `deterministic: true` | `grid-settle.test.ts` case 2; every grid suite runs twice | bitwise | pass / fail |
| 7 | pyramid <= 40 MB in 3D | `grid.test.ts` case 1 (`gridPyramidBytes` at 1M 3D = 38,347,792); `grid-settle.test.ts` case 4 | 38.3 MB | pass / fail |
| 8 | the one-iteration + unbiasedness checks at 1M in `node-limits` | `test/limits/layout-1m.test.ts` cases 1-2 | <RMS / p99 / mean at 1M> | pass / fail |
| 9 | the settle test on the isolated-node fixture | `grid-settle.test.ts` case 1 | settled at <it>; the bbox normaliser would have fired at <it> | pass / fail |
| 10 | `radixSort` equals a stable `Array.sort` on 8 / 16 / 24 / 32-bit keys with values, sizes 0..2^22 (scaled), all-equal keys | `test/primitives/radix-sort.test.ts` | bitwise | pass / fail |
| 11 | `histogram` / counting sort equal their oracles with one hot bucket | `test/primitives/histogram.test.ts` case 2 | bitwise | pass / fail |
| 12 | `cellStart` correct with empty cells and a 1M-entry hub cell dispatched through G4b | `grid.test.ts` case 4; `grid-pyramid.test.ts` case 1 (`hubcell`); `layout-1m.test.ts` case 2 (1M) | bitwise / <hub level-0 error> | pass / fail |
| 13 | windowed `degree` with a FAKED 1 MiB binding limit (>= 8 windows) and a hub row longer than a window equals `outDegree()` | `test/algorithms/degree.test.ts` (the faked-limit case) | <windows> windows, bitwise | pass / fail |
| 14 | `node-limits`: a real 2 GiB binding request succeeds on the 4070; a 200 MB per-array upload is bound windowed at defaults; a real 2D dispatch on 100M items | `binding-2gib.test.ts`, `windowed-200mb.test.ts`, `dispatch-2d-100m.test.ts` | <limits printed> | pass / fail |
| 15 | the upper `segmentedReduce` tiers equal their oracles with the 10k-degree hub, twin in-process | `test/primitives/tiers.test.ts` cases 1-2 | <worst error> | pass / fail |
| 16 | T-6 and T-7 met | section 3 | <medians> | pass / fail |
| 17 | T-5 at 100k in Chromium | section 3 (`fa2-grid-100k-step1-readback`) | <median> | pass / fail |
| 18 | the crossover re-checked and `exactMaxNodes` adjusted if the grid is faster below it | section 3 (`tmp/p4/exact-max-nodes.ts`) | exact / grid at 32k <..> / <..>, at 65k <..> / <..>; `EXACT_MAX_NODES` = <value> | pass / fail |
| 19 | the decision record on option B, `gridMax2D` / `extentFactor` (Q-32), the near-field bound / adaptive `nearMax` (R-24), the position permutation | section 7 | four decisions | pass / fail |
| 20 | lavapipe runs the grid suite at `gpuScale` sizes in <= 4 min | T12 Step 2's timed run | <s> of 240 | pass / fail |
| 21 | rule (f): the sabotage matrix for G1-G7 (dropped pseudo-cell, plain store for the histogram atomic, off-by-one cell bound, wrong level offset) and every P4 kernel / branch >= 3 rows each >= 10x | `test/sabotage/{indirect,scan,histogram,radix-sort,tiers,grid-build,grid-pyramid,grid}.test.ts` | <rows>; smallest ratio <r> | pass / fail |
| 22 | rule (f): stage-by-stage `inspect()` parity of `cellKey` / `sortedIdx` / `cellStart` / every pyramid level / the far and near fields | `test/layouts/grid-inspect.test.ts` | <worst stage error> | pass / fail |
| 23 | rule (f): a noise-floor row per P4 kernel id (thirteen, T11 Step 3's list) and a derived tolerance per tolerance | section 4 | <n> P4 rows, <n> P4 tolerances, every one under its cap | pass / fail |
| 24 | FA2 / FR / SE unchanged on the exact tier: every committed fixture still matches | T6 Step 3, T10 Step 5 | bitwise | pass / fail |
| 25 | the lavapipe lane budget (T-12) | Step 1's timed run | <s> of 900 | pass / fail |

## 3. T-5 (100k), T-6, T-7 and the crossover (spec 10.4, 7.8; `benchmarks/results/<class>.json`, session <date>)

| Id | Benchmark (group / name) | Target | Measured median of 5 (ms) | min / max (ms) | Pass |
| --- | --- | --- | --- | --- | --- |
| T-6 | layout-grid / grid ms/iteration (profiler) n=100000 2D [100k] | <= 10 | <..> | <..> | |
| T-6 | layout-grid / grid ms/iteration (profiler) n=1000000 2D [1M] | <= 100 | <..> | <..> | |
| T-6 | layout-grid / grid ms/iteration (profiler) n=100000 3D [100k] | <= 20 | <..> | <..> | |
| T-7 | layout-grid / attraction ms/iteration (profiler) n=1000000 [1M] | <= 15 | <..> | <..> | |
| T-5 | layout-browser / fa2-grid-100k-step1-readback (Chromium, NVIDIA) | <= 12 | <..> | <..> | |
| -- | layout-exact vs layout-grid at 32k and 65k (2D) | the 7.8 grid clause | exact <..> / grid <..>; exact <..> / grid <..> | | |

The same rows for `gpu-linux-t4` once the lane has run (`{{OPEN: P4-T14 Step 4}}` until then). The 1M 200-iteration
comparison (11.4) from `tmp/p4/exact-1m-200.log` / `grid-1m-200.log`: <the metrics side by side, the worst ratio>.

## 4. Cross-adapter results (spec 11.5, 11.9; `benchmarks/results/noise-floor.json`)

| Row id | kernel / fixture | comparison | a | b | maxRelError | maxAbsError | samples |
| --- | --- | --- | --- | --- | --- | --- | --- |

## 5. Coverage (spec 11.8; the default-lane run of Step 1)

| lines | functions | branches | statements | threshold | wall time |
| --- | --- | --- | --- | --- | --- |

## 6. Baselines committed

## 7. Findings, owner decisions, re-fixed targets

The four decisions the gate asks for, each with the measurement that decided it: option B (the cluster tree) -- <the
worst clumpy-fixture p99 against the cap>, default no; `gridMax2D` in {512, 1024, 2048} and `extentFactor` in {4, 6, 8}
at 1M (Q-32) -- <the 1M grid ms/iteration and the p99 on `clumpy1000` / `isolated` per setting, from
`tmp/p4/knobs.mjs`>, the defaults stay unless the table says otherwise; a near-field force bound (D25) and an adaptive
`nearMax` (R-24) -- <whether `hubcell` settled and at which iteration>, default neither; the position permutation --
default no.

Signed off: <owner>, 2026-09-DD.
````

The `tmp/p4/knobs.mjs` script of section 7 runs `benchmarks/layout-run.ts`-style grid layouts at 1M with `gridMax2D` in `{512, 1024, 2048}` and `extentFactor` in `{4, 6, 8}` and, on `clumpy1000` and `isolated` at 100k, `exactVsGrid` per setting; write it in this task (under `tmp/p4/`, not committed; its text goes into G4.md's appendix as G3.md's scripts did).

- [ ] **Step 3: Update the package CLAUDE.md**

The inventory lines and the `layout-grid` groups-table row (group `layout-grid`; rows "one `createForceAtlas2` grid simulation per rung of the grid ladder 32k / 65k / 100k / 262k / 1M in 2D and 3D (E = 10n, `repulsion: \"grid\"`), the same warm-up burst and `reheat()` + `step(1)` protocol as `layout-exact`; two rows per rung and dim, plus the 1M attraction-pass row"; target "T-6, T-7"), the `exactMaxNodes` paragraph, and a "Settled at G4" table (the shape of `CLAUDE.md:360-378`): the RMS / p99 per fixture, the T-6 / T-7 / T-5 numbers, the crossover re-check, the 1M 200-iteration metrics, the lavapipe grid-suite and node-project wall times, the four knob decisions.

- [ ] **Step 4: Commit (owner)** -- `docs(webgpu-graph-algorithms): close the G4 gate record` through `tools/commit-changes.sh`. Then the PR: it carries the `gpu` label so `gpu.yml` runs `node` and `node-limits` on it, and `release.yml`'s gate job requires that lane green before any publish.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Phase step 0 | the worktree `.worktrees/gpu-scale-layouts` on `feat/gpu-p5-p4` with P5's eleven commits landed (0.1); `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,layout` if `node_modules` or the two `dist/` are missing |
| P4-T1 .. P4-T4 | one `tools/commit-changes.sh` run per task, with the subject the task's Commit step names |
| P4-T5 and P4-T6 | one commit each, T5 first (T5 declares the five `Fa2Params` fields with the K2 body that reads them, so each commit builds on its own) |
| P4-T7 .. P4-T10 | one commit each |
| P4-T11 | one commit; its recording run (Step 4) needs the NVIDIA card and lavapipe in turn, both on the dev box |
| P4-T12, P4-T13 | one commit each |
| P4-T14 step 3 | `cd $PKG && eval $GPU_NV XDG_RUNTIME_DIR=/tmp pnpm run bench && node tmp/p4/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json && node scripts/bench-compare.js && pnpm exec tsx tmp/p4/exact-max-nodes.ts benchmarks/results/nvidia-lovelace-driver580.json` on a quiet card, the NVIDIA browser run, then the task's commit |
| P4-T14 step 4 | push the branch, open the PR, `gh pr edit <n> --add-label gpu`, then `gh run download <run id> -n gpu-results-<run id> -D $PKG/tmp/p4/t4` and the same append script into `benchmarks/results/gpu-linux-t4.json`; the `record the layout-grid T4 lane baseline` commit |
| P4-T15 | `eval $GPU_NV pnpm exec vitest run --project=node-limits`, the two 1M 200-iteration runs of Step 2, then one commit |
| P4-T16 | `tools/commit-changes.sh` with a type `docs` subject and NO scope |
| P4-T17 | fill and sign `webgpu-graph-algorithms/docs/decisions/G4.md` (with `tmp/p4/knobs.mjs`'s table), then the final commit and the PR merge once `ci.yml`, `hosts.yml` and `gpu.yml` are green |

The agent never runs any of these git steps; it prepares the tree and verifies the results. In particular the agent never runs `git worktree`, `git stash`, `git checkout` or `git reset`: in a subagent they block on a prompt nobody answers.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| `planIndirect`, the finalize, `dispatchIndirect` | P4-T1 | `pnpm exec vitest run --project=node test/kernel/dispatch.test.ts test/kernel/indirect.test.ts` | the args equal the host twin bitwise; an indirect dispatch runs exactly `count` items |
| `exclusiveScan` | P4-T2 | `pnpm exec vitest run --project=node test/primitives/scan.test.ts` | bitwise vs the prefix-sum oracle at every ladder size, three levels at 4097 |
| `histogram` / counting sort | P4-T3 | `pnpm exec vitest run --project=node test/primitives/histogram.test.ts` | bitwise histograms incl. one hot bucket (G4 item 11); a sorted key sequence |
| `radixSort` | P4-T4 | `pnpm exec vitest run --project=node test/primitives/radix-sort.test.ts` | bitwise vs the stable reference on 8 / 16 / 24 / 32 bits (G4 item 10) |
| The tiers | P4-T5 | `pnpm exec vitest run --project=node test/primitives/tiers.test.ts` and `GRAPHTY_GPU_NO_SUBGROUPS=1 ... test/primitives` | the hub fixtures within the analytic bound, all three pipelines compiled, twins agree (G4 item 15) |
| The K2 tiers in the layout | P4-T6 | `pnpm exec vitest run --project=node test/layouts/tiers-inspect.test.ts test/layouts/attraction-windowed.test.ts` | the attraction stage on `hub10k` / `rmat14`; the window loop bitwise |
| Windowed execution | P4-T7 | `pnpm exec vitest run --project=node test/memory/windowed.test.ts test/algorithms/degree.test.ts` | >= 8 windows at the faked 1 MiB limit, the hub row split, `outDegree()` bitwise (G4 item 13) |
| The grid build | P4-T8 | `pnpm exec vitest run --project=node test/primitives/grid.test.ts` | keys / order / starts bitwise vs the oracle on every positioned fixture (G4 item 12) |
| The pyramid | P4-T9 | `pnpm exec vitest run --project=node test/primitives/grid-pyramid.test.ts` | every level within the analytic bound; the hub cell through G4b (G4 items 7, 12) |
| The grid tier runs | P4-T10 | `pnpm exec vitest run --project=node test/layouts/grid-behaviour.test.ts test/layouts/grid-lifecycle.test.ts` | `auto`, `deterministic`, `nearMax`, `gridMax2D`, pins, drags, inspect, leak 0 |
| Stage parity and exact-vs-grid | P4-T11 | `pnpm exec vitest run --project=node test/layouts/grid-inspect.test.ts test/layouts/grid-exact.test.ts test/layouts/grid-twins.test.ts test/noise-floor.test.ts` | every stage within its derived tolerance; RMS / p99 / expansion / distributional / unbiased within theirs (G4 items 1-5, 22, 23) |
| Sabotage | P4-T12, P4-T13 | `pnpm exec vitest run --project=node test/sabotage` | every P4 row and branch row >= 10x (G4 item 21) |
| The settle, saturation, determinism, 3D items | P4-T12 | `pnpm exec vitest run --project=node test/layouts/grid-settle.test.ts` | G4 items 6, 7, 9; R-24 measured |
| The FR / spring grid tier | P4-T13 | `pnpm exec vitest run --project=node test/layouts/grid-law.test.ts` | the two models' grid within the FA2 caps against their own exact tier |
| `calibrateLayout`, the benchmarks | P4-T14 | `pnpm exec vitest run --project=node test/layouts/calibrate.test.ts test/benchmarks.test.ts`; `pnpm run bench` | T-6 / T-7 / T-5 recorded, the crossover re-checked (G4 items 16-18) |
| The limits | P4-T15 | `pnpm exec vitest run --project=node-limits` (NVIDIA) | G4 items 8, 14 |
| Coverage | P4-T17 | `pnpm exec vitest run --project=node --coverage` on lavapipe | at or above 80 / 80 / 75 / 80, never lowered |
| Plain ASCII | P4-T17 | `LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs \| wc -l` | 0 |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-P4-1 | Tint rejects the tier bodies' barriers as non-uniform (a `return` inside `tier0` under the override branch). | PD-6 puts every barrier in a function called under a uniform `if (TIER == 0u) { ... } else { ... }`; the compile matrix (T5 Step 5) compiles all three tiers on Dawn, `backend=null` and both twins before any test runs them; the fallback is the fully guarded form without early return, in the same functions. |
| R-P4-2 | The serial ranking of the radix scatter (PD-5) makes the sort the long pole of T-6 at 1M. | T14 measures per pass through the profiler's `fa2-grid` pass; the 8-way split ranking replaces the one function (its `ponytail:` comment names it) and nothing else changes. |
| R-P4-3 | A cell-key mismatch across adapters despite PD-10 (an `fma` contraction of `(p - gridMin) * inv`, or a driver's `floor`). | T8's cross-adapter u32 rows must be `maxRelError 0` (T11 Step 4 asserts it); if not, the oracle is seeded per adapter and the cross-adapter key row is dropped in favour of the per-adapter `oracle-f64` rows, recorded in G4 section 7. |
| R-P4-4 | The exact-vs-grid p99 on `clumpy1000` or `isolated` lands above 25 %. | PD-20: a finding, not a loosened cap; the record's section 7 carries the owner's decision (option B is the design's named remedy, Q-5). |
| R-P4-5 | R-24: `hubcell` never settles under resampling. | T12 Step 2 case 5 measures it; the adaptive `nearMax` of 7.7 is the recorded mitigation, decided in G4 section 7. |
| R-P4-6 | The lavapipe grid suite exceeds 4 minutes (a 1/50-scaled fixture still sorts and downsamples the full pyramid at G = 8..32). | `gpuScale()` sizes the graphs; the pyramid at scaled sizes is at most `G = 32` (PD-9's `nextPow2(2 sqrt(n))`); T12 Step 2 times the suite; per-file budgets follow R-5's per-file rule if needed. |
| R-P4-7 | `needs: ["subgroups"]` on K2 / `segmented-reduce` / `spmv-pull` doubles their compile work in the browser matrix (SwiftShader's slow JIT). | The case COUNT does not double (a twin is a second compile of the same case); G2's remedy stands: the browser case list is a subset chosen in `test/browser/compile-matrix.test.ts`, not in the generator. |
| R-P4-8 | P5's FR / spring pins on the grid refusal break at T10, and the two models are half-wired (K2 tiers, no grid) until T13. | T10 deletes the two pins and says so; the two models still refuse the grid tier at their own `recordIteration` until T13, which lands in the same PR; T13's `grid-law.test.ts` is their test. |
| R-P4-9 | The 1M exact iteration (~1.8 s) times out the `node-limits` project on the T4 (2-3x slower). | The project's timeout is 600 s; `layout-1m.test.ts` runs ONE exact iteration per comparison and the 32 seeded near-field iterations on the grid tier only; the 200-iteration exact run is the owner's dev-box run (T15 Step 2), never the lane's. |

---

## 8. Writing-plans self-review

### 8.1 Spec coverage -- every deliverable of design 13 row P4 has a task

The row is `design/webgpu/webgpu-acceleration-plan.md:4211`. Item by item:

| Deliverable (from the row) | Task |
| --- | --- |
| `scan` | P4-T2 |
| `compact` | NOT built: DEP-P4-A (P4-T16 records it) |
| `histogram` / counting sort | P4-T3 |
| `radixSort` (digit-major histograms) | P4-T4 |
| the indirect `finalize` kernel and `planIndirect` | P4-T1 |
| windowed upload EXECUTION for row-walking kernels (`ArcWindow`, rebase uniform, row clamping) | P4-T7 (`degree`, `segmentedReduce`); the layout and the pull: DEP-P4-B |
| the `node-limits` project | P4-T15 |
| the grid kernels G1-G7 with G4a / G4b in 2D and 3D, the robust extent, the outside pseudo-cell, `state.eps`, the sorted-order dispatch (D24) | P4-T8 (G1, G2, G3), P4-T9 (G4, G4a, G4b, G5), P4-T10 (G6, G7, K1's extent and `eps`, D24) |
| `repulsion: "auto"` crossover | P4-T10 (`tierFor` unchanged, the throw deleted), P4-T14 (the re-check) |
| `calibrateLayout()` | P4-T14 |
| the mid / high attraction and `segmentedReduce` tiers over `degreeOrder()` (7.5, 6 row 3) | P4-T5 (the kernels), P4-T6 (the layout) |
| `nearMax` / `gridMax` / `extentFactor` options | P4-T8 (`gridSpecFor`), P4-T10 (`nearMax >= 2`, the params), P4-T12 (`gridMax2D: 32`) |
| `stats.maxCellOccupancy` / `outsideGrid` | P4-T10 |
| the exact-vs-approximate fixtures and tests (11.4) | P4-T8 (the fixtures), P4-T11 (the suites), P4-T12 (settle, determinism, 3D), P4-T15 (262k, 1M) |
| `layout-grid` benchmarks on the grid ladder in 2D and 3D | P4-T14 |
| hub-heavy and isolated-node fixtures | P4-T5 (`rmat14`), P4-T8 (`hubcell`, `onecell*`, the existing `hub10k` / `isolated`) |
| G4: every clause | 7.2 and the G4 template (P4-T17 Step 2), 25 items |
| rule (f) for every kernel and branch | P4-T1 .. T4, T8, T9 (the new kernels' rows), T5 / T6 / T7 (the tier and window rows), T12 (K1's grid block, G6 / G7), T13 (`LAW`); the stage comparisons T11; the noise rows: one per kernel id, listed in T11 Step 3 |
| the `LAW` hand-over of the P5 plan (its 0.7) | P4-T13 |

### 8.2 Placeholder scan

Searched this document for `TBD`, `TODO`, `FIXME`, `XXX`, `similar to`, `as appropriate`, `and so on`, `etc.`, `write tests for the above`, `add error handling`: no occurrence. The `<...>` cells that remain are inside the G4 record TEMPLATE (P4-T17 Step 2), the house convention for a value the owner copies from a named command's output. Every WGSL body of a NEW kernel is given in full (T1, T2, T3, T4, T8, T9, T10); every rewritten body is given in full (the three tier bodies of T5, G6 / G7's `LAW` lines of T13, K1's block of T10); every sabotage row is given with its exact `find` / `replace` (T1-T5, T6 Step 4 names the six K2 rows by their exact lines, T7, T8, T9, T12 (the six G6 / G7 rows and the three K1 rows), T13 Step 3 names the twelve rows by their lines in the bodies of Step 1); every host driver is named by its exported signature and the exact dispatch order; where a file mirrors an existing one member for member (`repulsion-grid.ts` after `repulsion-exact.ts`, the FR / spring grid path after FA2's, `grid-parity.ts` after `fr-parity.ts`), the template file and its line range are named so the executor copies structure, not design.

### 8.3 Type-consistency check across the tasks

- `KernelId` gains, in order, `indirect-finalize` (T1), `scan-block` / `scan-add` (T2), `histogram` / `counting-scatter` (T3), `radix-hist` / `radix-scatter` (T4), `grid-cell-key` (T8), `grid-centroid` / `grid-centroid-hub` / `grid-downsample` (T9), `grid-far-field` / `grid-near-field` (T10): thirteen ids, each with a `TABLE` row, a `STORAGE_COUNTS` row and a compile pin in the same task; `EXPECTED_CASES_BY_PHASE.P4` runs 1 (T1), 3 (T2), 5 (T3), 7 (T4), 8 (T8), 11 (T9), 21 (T10), 39 (T13); T5 changes P2 to 148, P3 to 157 (P5's 61 with K2 49 -> 145) and P7 to 69 (P5-T2's `LAW` counts are the base for K2: `1 + 2 x 2 x 3 x 2 x 2 x 3` = 145 with `TIER` {0, 1, 2}).
- The `Fa2Params` fields T5 Step 3 declares (`arcBase` @80, `arcEnd` @84, `accumulate` @88, `hiEnd` @92, `midEnd` @124) are the names the K2 body of the same step reads (`P.arcBase`, `P.arcEnd`, `P.accumulate`, `P.hiEnd`, `P.midEnd`) and the names every model's `paramsFor` writes (T5 Step 3 the constants `0` / `arcCount` / `0` / `0` / `0`, T6 Step 2 the tier boundaries), so every task's commit builds on its own; `P.gridMax` / `P.levels` / `P.nearMax` / `P.extentFactor` / `P.iterationIndex` / `P.seed` are P3 fields the grid bodies read; `Fa2State.invCellSize` @120 (T8) is what K1 writes (T10) and G1 / G6 / G7 read; `gridMin.w` carries `cellSize`.
- The `ReduceScope` every P4 primitive takes is the P1 record (`reduce.ts:34-44`); `RepulsionGrid` builds one over a `Lease` (PD-11); the test scope is `testReduceScope` (`test/helpers/segmented-reduce.ts:69`).
- `DegreeTiers` moves to `core-shape.ts` (T5) and is re-exported from `segmented-reduce.ts`, so `spmv.ts:25`'s import and the P2 test's import keep resolving; `ModelResources.tiers` (T6) is the same type.
- `RepulsionGridOverrides = RepulsionExactOverrides & { LAW: 0 | 1 | 2 }` (T13) is what `RepulsionGrid.create` / `specs` take from T13 on; T10's `RepulsionGrid` takes `RepulsionExactOverrides` and T13 widens it (the FA2 model passes `LAW: 0`).
- The stage keys of `captureGridStages` (T11) name the buffers `inspect()` reaches by their `BufferSpec` names (`cellKey`, `sortedIdx`, `cellStart`, `pyramid`) and the union stage names of PD-17 (`debugRunStages("G1")` .. `("G7")`), which `RepulsionGrid.recordRepulsion`'s `upTo` honours (T10) by passing `"G1" | "G2" | "G3"` to `GridBuildPlanner.record`'s `upTo` (T8) and `"G4" | "G5"` to `GridPyramidPlanner.record`'s (T9) -- the two planners declare the parameter, so T10 never edits `grid.ts` / `grid-pyramid.ts`.
- Tolerance ids appear three times and agree: `P4_TOLERANCE_CAPS` (T11 Step 1: seventeen ids), the noise members' `stageTolerances` (T11 Step 3), and the G4 record's items 1-5, 15, 22-23; every `basis` is a row id a T11 member records (`<id>.oracle-f64` or `<id>.twin`), and every fixture a writer case names (T1-T4, T5, T6, T8, T9, T11) is a member of T11 Step 3 -- no orphan fixture; the u32 fixtures have rows and no tolerance; the one pyramid twin row is `grid-centroid-hub`'s (the only pyramid kernel with a reduction), so `grid-twins.hubCentroid` checks what its basis row measured.
- The sabotage tables: `SABOTAGE` gains the thirteen new ids (40 rows: 3 x 13 plus the fourth `grid-far-field` row that guards the 2D z-plane collapse), `SABOTAGE_P4_TIERS` holds 18 tier rows (T5 twelve, T6 six) + 1 window row (T7) + 3 K1 rows (T12), `SABOTAGE_P4_LAW` is declared empty by T12 and holds 12 rows from T13; every `find` is a line of a body written in this plan; every row's `test` file exists when the row lands (the `test`-exists loop of `coverage.test.ts:92-96`, mirrored by `tiers.test.ts`, runs on every task's green check); `SABOTAGE_PHASES` lists `"P4"` from T12 on, after the last new kernel (T10) has its rows.
- File ownership (PD-1): every file appears under `Create:` or `Modify:` in exactly ONE task except the ones below, each edited only in the region named:

| Shared file | Owners and regions |
| --- | --- |
| `src/kernels.ts`, `test/kernel/registry.test.ts`, `test/kernel/bind-group-budget.test.ts`, `test/kernel/wgsl-compile.test.ts`, `test/helpers/override-matrix.ts` | T1 (`indirect-finalize`, the `"P4"` phase, `P4: 1`), T2 (`scan-*`, 3), T3 (`histogram`, `counting-scatter`, 5), T4 (`radix-*`, 7), T5 (`TIER` on `spmv-pull`, `needs` on three entries, `SPMV_PARAMS.start`, the five `Fa2Params` fields, `TIER: [0, 1, 2]`, P2 148 / P3 157 / P7 69), T8 (`grid-cell-key`, the `Fa2State` split, 8), T9 (three grid ids, `GRID_LEVEL_PARAMS`, 11), T10 (two field ids, K1's slots, 21), T13 (`LAW` on two entries, 39) |
| `test/helpers/sabotage.ts` | T1-T4, T8, T9, T12 (rows under the new ids; T12 also the three K1 rows in `SABOTAGE_P4_TIERS`, the empty `SABOTAGE_P4_LAW` and `SABOTAGE_PHASES`), T5 (`SABOTAGE_P4_TIERS`, twelve rows; the re-pointed P3 row), T6 (six K2 rows), T7 (one window row), T13 (the twelve rows of `SABOTAGE_P4_LAW`) |
| `test/oracle/oracles.test.ts` | T2 (scan), T3 (histogram), T4 (radix), T8 (grid keys): one `describe` each |
| `src/constants.ts`, `test/device/constants.test.ts` | T8 (the six grid constants and their pins), T14 (the conditional `EXACT_MAX_NODES` re-fix and its pin, `src/constants.ts:22-32`, `test/device/constants.test.ts:125`) |
| `src/primitives/segmented-reduce.ts` | T5 (the tiers), T7 (the window loop in `record()`) |
| `src/primitives/core-shape.ts` | T5 (`degreeTiersOf`, `DegreeTiers`), T7 (`windowBinding`, `identityFillWord`) |
| `test/primitives/segmented-reduce.test.ts` | T5 (`:318-341`, the tiers pin), T7 (`:345-357`, the windowed leg) |
| `src/layouts/force-simulation.ts` | T6 (`load()`'s `perm` / `tiers` lines, `ModelResources.tiers`), T10 (the grid throw, `tierFor` exported, `lastPassTimings`, `ModelResources.pool`) |
| `src/layouts/forceatlas2.ts` | T5 (the one `pad` line of `paramsFor`), T6 (`bind` / `recordIteration` / `paramsFor`'s K2 part), T10 (everything grid: `buffers`, `inputs`, `specs`, `bind`, `paramsFor`, `recordIteration`, `onLoad`, `readStats`, `dropBound`, `stages`, `resolveLayoutTuning`), T13 (`LAW: 0` in the one grid-overrides object) |
| `src/layouts/fruchterman-reingold.ts`, `src/layouts/spring-electrical.ts` | T5 (the one `pad` line of `paramsFor`), T6 (the K2 part and the tier boundaries), T13 (the grid path) |
| `src/layouts/repulsion-grid.ts`, `src/wgsl/grid-far-field.wgsl.ts`, `src/wgsl/grid-near-field.wgsl.ts` | T10 (created), T13 (the `LAW` declaration and lines) |
| `test/layouts/fa2-options.test.ts` | T10 (the grid pins, `nearMax`, the specs pin gaining the grid specs), T13 (`LAW: 0` on the two grid entries of that specs pin: `toEqual` compares the whole override object, `:552-560`); T6 leaves it (the specs pin is unchanged, T6 Step 2) |

  Every other file of the phase has one owner; `test/helpers/graphs.ts` is T5's (every fixture the phase names), `test/noise-floor.test.ts` T11's, the three grid oracle files T8's / T9's / T11's, `src/primitives/grid.ts` T8's and `grid-pyramid.ts` T9's.
- Commit subjects: eighteen commits -- `webgpu-graph-algorithms` x17 (`feat` T1-T10, T13, T14 and T14's lane follow-up; `test` T11, T12, T15; `docs` T17) and ONE with no scope, typed `docs` (T16). Every subject starts lowercase after the colon and is at most 100 characters (the longest, T6's, is exactly 100; counted with a script over the eighteen strings), none ends in a full stop.
