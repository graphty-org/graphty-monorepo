# @graphty/webgpu-graph-algorithms P5 -- Fruchterman-Reingold and the spring-electrical preset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; all of them run in `/home/apowers/Projects/graphty-monorepo/.worktrees/gpu-scale-layouts`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P5 inside `webgpu-graph-algorithms/`: `createFruchtermanReingold` (the FR pair law and attraction, the per-iteration temperature slots, the temperature-capped integrate, the `fixed` option applied at load, the reheat at 70% of the budget, `FruchtermanReingoldStats` with a `temperature` trace), `createSpringElectrical` (ngraph's Coulomb repulsion, Hooke springs, drag and semi-implicit Euler integrator under ngraph's option names and defaults, `SpringElectricalStats` with a `kineticEnergy` trace), the two f64 oracles with f32 variants, the spring-electrical oracle checked against `ngraph.forcelayout` itself, the accelerator members `fruchtermanReingold` / `springElectrical`, the browser smoke, the `layout-fr` benchmark group with T-14 recorded on both runner classes, the sabotage rows, `inspect()` stage comparisons and noise-floor rows of every kernel branch the phase adds, the decision records of every departure, and the G5 gate record.

**Architecture:** The package's layout layer is ONE state machine plus ONE model: `ForceSimulation` (`webgpu-graph-algorithms/src/layouts/force-simulation.ts`, 2111 lines) owns the buffers, the in-flight batches, the readback, the settle window, the fixed mask, the override list and the batch driver, and consumes a `ForceModel` by composition (`force-simulation.ts:107-126`); `ForceAtlas2Model` (`src/layouts/forceatlas2.ts:460-911`) is the only model. P5 adds two sibling models over the SAME five kernels: the three pair laws become the `LAW` override of K2 / K3, the two integrators the `APPLY` override of K5 and the two extra statistics the `STATS_MODE` override of K1 -- no new kernel id, no new binding, no new buffer name beyond `velocity`, which occupies the `oldForce` slot. The dependency direction is unchanged: `src/` imports `@graphty/graph-format` at runtime and `@graphty/layout` / `@graphty/algorithms` as types only (`src/types/options.ts:10-16`, `src/types/accelerator.ts:8-26`); ngraph enters the TEST tree only.

**Tech Stack:** TypeScript 5.9 (strict), WGSL, WebGPU via `webgpu@0.4.0` (Dawn) in Node 22 and Chromium (Playwright) in the browser, `@graphty/graph-format` snapshots, vitest 3.2 (node / node-limits / browser projects, v8 coverage), fast-check, pnpm 10 workspace, vite 7 library bundle, ESLint 9 flat config, knip, GitHub Actions (ubuntu-latest lavapipe + SwiftShader lane; the `gpu-linux-t4` lane on a labelled PR), `ngraph.forcelayout@3.3.1` + `ngraph.graph@20` as test-only devDependencies.

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- 7.20 lines 2433-2481 (FR row table 2438-2448, the preset 2455-2471), 7.19 lines 2289-2431 (the `ForceModel` hook interface 2316-2326, `onReheat` for FR at 2323), 7.2 lines 1655-1709 (the laws and the override constants), 7.3 lines 1710-1752 (buffers), 7.4 lines 1754-1791 (the per-iteration sequence, table 1770-1776), 7.12 lines 2148-2182 (fixed nodes), 7.17 lines 2245-2273 (settlement; the ngraph model of the rule at 2257-2261), 7.21 lines 2482-2518 (scaling), 3.3 lines 833-875 (the layout signatures: `LayoutStatsBase` 836-841, `FruchtermanReingoldStats` / `SpringElectricalStats` 846-847, `GpuLayoutSimulation` 849-867, `createFruchtermanReingold` 873, `createSpringElectrical` 874, the accelerator members 892-893), 9.3 lines 2991-3066 (`FruchtermanReingoldOptions` / `SpringElectricalOptions` 3015-3016, `LayoutAccelerator` 3018-3025, the type table 3041-3046), 10.4 lines 3388-3420 (T-14 at 3419), 11.4 lines 3502-3600 (layout parity), 11.6 lines 3628-3656 (browser smoke), 11.9 lines 3699-3763 (sabotage, inspection, derived tolerances, run twice), 13 rules lines 4189-4202, row P5 line 4212, the phase order lines 4222-4229 (the arrow at 4224), Q-9 line 4298. The design is normative; every departure is in section 0.5.

**Plan of record for the repository's shape:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (section 6 for the later phases; its Task M5-T6, lines 2908-2916, is the CPU Fruchterman-Reingold simulation this phase's GPU model mirrors, and its types table at 2357-2399 is the seam the GPU package re-exports).

**Gate:** G5 (design 13 row P5, line 4212). The record is `webgpu-graph-algorithms/docs/decisions/G5.md`, written by Task P5-T11 beside G0-G3, G6-algorithms and G7.

**Tasks in this document:** P5-T1 .. P5-T11. T1 has no dependency. T2 depends on T1 (it deletes the helper copies T1 moved). T3 depends on T2 (the FR model compiles against the new override axes). T5 depends on T2 and may run in parallel with T3. T4 depends on T3 AND T5 (it is the parity suite of BOTH models and the one recording run that derives every P5 tolerance; it therefore runs after T5 despite its number). T6 depends on T3 and T5. T7 depends on T4. T8 depends on T3 and T5. T9 depends on T3 and T5. T10 may run any time after T1. T11 is last. Within the phase no two tasks name the same file: every file appears under `Create:` or `Modify:` in exactly one task (the list is in 8.3).

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit".
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -rnP '[^\x00-\x7F]'` over the touched files is a step of Task P5-T11.
- Never run `sudo`; nothing in this plan needs it. Servers only on ports 9000-9099 (the package's coverage preview is 9058).
- Spec rules for every phase (design 13 lines 4189-4202): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (c) every [X] number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (f) every phase that adds a kernel adds its sabotage mutations, its `inspect()` stage comparisons and its noise-floor row (design 11.9), and the gate lists them. P5 adds no kernel id but adds BRANCHES to four kernels; this plan applies rule (f) to every branch as if it were a kernel.
- Project rule (root `CLAUDE.md`): never create fallbacks if WebGPU is not supported -- `src/` contains no CPU path, no WebGL path, no software-adapter acceptance; the package throws.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold (the package's `node` project is 80 lines / 80 functions / 75 branches / 80 statements, `webgpu-graph-algorithms/vitest.config.ts:185`).
- Layer rule (design 3.2, `webgpu-graph-algorithms/CLAUDE.md:78-87`): device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator. `src/wgsl/**` is imported only by `src/kernels.ts`. Enforced by `webgpu-graph-algorithms/eslint.config.js:90-153` and `webgpu-graph-algorithms/test/layers.test.ts`.
- WGSL rules (`webgpu-graph-algorithms/CLAUDE.md:166-201`): a body never contains `@group(` or `override `, has exactly one `@compute` entry point, reaches every barrier and subgroup builtin in UNIFORM control flow, parenthesises every hash expression fully, uses `nbr` rather than the reserved word `target`, and never types a constant the prelude interpolates (`WG`, `MAX_WORKGROUPS_PER_DIM`, `U32_MAX`, `INVALID_INDEX`).
- House style (`webgpu-graph-algorithms/CLAUDE.md:203-218`): JSDoc on every export, explicit return types, `.js` suffixes on relative imports, `?: T | undefined` on interface properties, absent output is `null`, every throwing call leaves state unchanged, tests use the vitest globals, every kernel test runs its kernel twice and asserts bitwise equality first, every tolerance comes from `noiseFloorFor(id)` and never from a literal.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason and, where the departure changes a design statement, a `design/decisions/2026-09-20-<slug>.md` record written by Task P5-T10.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-20)

| Fact | Evidence |
| --- | --- |
| The worktree is on branch `feat/gpu-p5-p4` at `c6f1e85f chore(workspace): keep 0.x packages on 0.x when a commit is marked breaking` (above `ffd6b329` the M8a merge and `a471642d chore(release): publish`); the working tree holds nothing but this plan file. | `git rev-parse --abbrev-ref HEAD`; `git log --oneline -4`; `git status --porcelain` (one `??` line, this file) |
| `@graphty/webgpu-graph-algorithms` is **0.4.1** and `@graphty/layout` is **1.7.0**; the GPU package's peer range on layout is `^1.7.0` and its `webgpu` (Dawn) devDependency is pinned at `0.4.0` (the peer range `>=0.4.0 <1.0.0`). | `node -e "console.log(require('./webgpu-graph-algorithms/package.json').version, require('./layout/package.json').version)"` -> `0.4.1 1.7.0`; `grep -n '"@graphty/layout"\|"webgpu"' webgpu-graph-algorithms/package.json` (`:91-92,117`) |
| The layout seam of design 9.3 is on master: `layout/src/simulation/types.ts` declares `FruchtermanReingoldOptions` (`:40-45`), `SpringElectricalOptions` (`:48-54`), `LayoutAccelerator` with the optional `fruchtermanReingold` / `springElectrical` methods (`:71-78`) and `SimulationType` (`:82`); `create-simulation.ts:31-42` routes `"fruchtermanReingold"` / `"spring"` to the accelerator method or the CPU class and throws for `"spring-electrical"` without an accelerator; `fruchterman-reingold.ts` (620 lines) is the steppable CPU FR simulation. The built declarations exist. | `ls layout/src/simulation/`; `ls layout/dist/src/simulation/index.d.ts` |
| The GPU package already re-exports those records as types: `src/types/options.ts:10-26` (`import type` from `@graphty/layout`, re-exported), `src/index.ts:113-119`; the option type tests already pin `FruchtermanReingoldOptions` / `SpringElectricalOptions` (`test/types/options.test-d.ts:55-62,114-115,147-150`, `test/types/public-api.test-d.ts:288-289`). | `grep -n 'FruchtermanReingold\|SpringElectrical' webgpu-graph-algorithms/src/types/options.ts webgpu-graph-algorithms/test/types/*.test-d.ts` |
| `ForceSimulation` already picks the FR seed range by model kind: `range = this.model.kind === "fruchtermanReingold" ? "fr" : "fa2"` (`src/layouts/force-simulation.ts:975-976`); `seedPositions` takes `"fa2"` ([-1, 1)) or `"fr"` ([0, 1)) (`src/layouts/seed.ts:94-103,164-167`). `ForceModel.kind` already admits the three kinds (`force-simulation.ts:108`). | `sed -n '975,976p' webgpu-graph-algorithms/src/layouts/force-simulation.ts` |
| `reheat()` resets `iterationsDone` and `settledCount` for EVERY model and then calls `model.onReheat(writer)` with no iteration argument (`force-simulation.ts:1200-1208`); the budget is `options.maxIter`, else `options.iterations`, else infinity (`:1626-1636`); `paramsFor` receives the GLOBAL iteration index and the shared fields win (`:1548-1561`). | `sed -n '1200,1208p;1548,1561p;1626,1636p' webgpu-graph-algorithms/src/layouts/force-simulation.ts` |
| `ModelInputs` is `{ mass, weights }` (`force-simulation.ts:84-87`); `load()` calls `model.inputs()` in its check phase (`:924`) and clears the fixed words only on a resize (`:953-958`). Nothing lets a model pin nodes at load. | `sed -n '84,87p;920,933p;953,958p' webgpu-graph-algorithms/src/layouts/force-simulation.ts` |
| `Fa2Params` is 96 bytes with `pad` (vec4f) at byte 80 reserved for P4's GridSpec (`src/kernels.ts:104-124`); `Fa2State` has `reserved0` .. `reserved8` from byte 112 (`:126-157`); `Fa2Trace` has `pad0` at byte 28 (`:159-173`). `UniformBlock.write` zeroes the region and skips ABSENT fields (`src/kernel/struct-block.ts:291-318`), so a model that does not name a field writes 0 there. | `sed -n '104,173p' webgpu-graph-algorithms/src/kernels.ts`; `sed -n '291,318p' webgpu-graph-algorithms/src/kernel/struct-block.ts` |
| The four FA2 kernels declare these overrides: K1 none (`kernels.ts:349`), K2 `LINLOG` / `DISTRIBUTED` / `TIER` (`:366-370`), K3 `SWING_MODE` / `STRONG_GRAVITY` / `GRAVITY_CENTER` (`:391-395`), K5 `SWING_MODE` (`:434`). Their binding tables (K1 `:343-348`, K2 `:361-365`, K3 `:382-390`, K5 `:425-433`) are what P5 keeps. | `sed -n '339,439p' webgpu-graph-algorithms/src/kernels.ts` |
| K3's pair law is `f = f + d * (k / d2)` after `d2 = max(d2, FA2_DIST_FLOOR_SQ)` with the coincident kick above it (`src/wgsl/fa2-repulsion-exact.wgsl.ts:46-55`); K2's is `mag = select(w, w * log(1 + len) / len, LINLOG)` then `f = f + d * mag` (`fa2-attraction.wgsl.ts:28-33`); K5's is `dp = select(f * factor, vec3f(0.0), fixed)` with `store_old` under `SWING_MODE == 0u` (`fa2-integrate.wgsl.ts:32-40`) and the partials A / C reduction after it (`:43-68`); K1 writes the trace record at `fa2-stats-finalize.wgsl.ts:52-55`. | the four files |
| The compile matrix is GENERATED from the registry: every u32 override needs a row in `U32_OVERRIDE_VALUES` or the builder throws (`test/helpers/override-matrix.ts:55-62,115-120`); the per-phase counts are pinned at `:71-76` (P1 37, P2 52, P3 22, P7 37) and the per-kernel P1 / P2 counts at `test/kernel/wgsl-compile.test.ts:52`. | `sed -n '55,76p' webgpu-graph-algorithms/test/helpers/override-matrix.ts` |
| The sabotage table pins the K3 row NAMES (`test/sabotage/coverage.test.ts:58-63`) and checks every `find` of `SABOTAGE` occurs exactly once (`:72-80`); `test/sabotage/fa2.test.ts:45-64` runs every `SABOTAGE` row of the P3 kernels against the FA2 checks. A P5 row placed in `SABOTAGE` would either break the name pin or be run against a check its branch never reaches. The addendum precedent is `SABOTAGE_P3_ADDENDUM` (`test/helpers/sabotage.ts:489`). The existing `find` strings P5 must keep intact: K2 `f = f + d * mag;`, `let mag = select(w, w * log(1.0 + len) / len, LINLOG);`, the row loop and the perm select; K3 `let k = P.scalingRatio * pi.w * o.w;`, `f = f + d * (k / d2);`, `if (o.w > 0.0 && jj != i) {`, `return -P.gravity * pi.w * q / d;`; K5 `dp = select(f * factor, vec3f(0.0), fixed);`, `if (SWING_MODE == 0u) { store_old(i, f); }`, `let f = load_force(i);`; K1 the `settledCount` select, `let c = tSum.xyz / n;`, the `rmsRadius` line. | `grep -n 'find:' webgpu-graph-algorithms/test/helpers/sabotage.ts` |
| `noiseFloorFor(id)` THROWS for an id the committed `benchmarks/results/noise-floor.json` lacks (`test/helpers/noise-floor.ts:218-235`); the G3 recording sequence is: the writer files under `GRAPHTY_NOISE_FLOOR_WRITE=1` on NVIDIA, then on lavapipe, then `test/noise-floor.test.ts` in write mode on both, then `prettier --write` (`docs/decisions/G3.md:166-170`). | `sed -n '218,235p' webgpu-graph-algorithms/test/helpers/noise-floor.ts` |
| `createAccelerator` returns `kind, ctx, options, forceAtlas2, release, dispose` and the seven P7 algorithm members (`src/accelerator.ts:107-214`); its header says `fruchtermanReingold` / `springElectrical` arrive "with P5" (`:11-12`); `GpuAccelerator` (`src/types/accelerator.ts:98-116`) has no FR / SE member; `test/accelerator.test.ts:63-64` asserts both are `undefined`; `test/index.test.ts:93-95` lists `createFruchtermanReingold` / `createSpringElectrical` as NEVER exported. | the four files |
| `benchmarks/run.ts` registers `upload`, `roundtrip`, `layout-exact`, `pagerank`, `wcc` (`:34-40`); the dev-box baseline's last session carries exactly those five groups; `warmClock` (`benchmarks/layout-exact.bench.ts:234-246`) and `reportedRow` (`:200-224`) are module-private and FA2-typed; the append script the gates use is `docs/decisions/G3.md` appendix A (`:533-583`, `REQUIRED_GROUPS` at `:545`), copied to `tmp/` per gate (`docs/decisions/G7.md:106`). | `grep -o '"group": *"[^"]*"' webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json \| sort -u` |
| `ngraph.forcelayout@3.3.1` and `ngraph.graph@20` are devDependencies of graphty-element ONLY (`graphty-element/package.json:171-172`), installed under `graphty-element/node_modules/`; the GPU package has neither. ngraph's defaults: `springLength` 10, `springCoefficient` 0.8, `gravity` -12, `theta` 0.8, `dragCoefficient` 0.9, `timeStep` 0.5 (`lib/createPhysicsSimulator.js:29,34,40,48,54,59`), a seeded RNG (`:103`); mass `1 + links / 3` (`index.js:391-395`); stability `lastMove / bodiesCount <= 0.01` where `lastMove = (sum abs dx)^2 + (sum abs dy)^2 over n` (`index.js:62-63`, `lib/codeGenerators/generateIntegrator.js:43-46`); the integrator is semi-implicit Euler with a unit speed clamp and pinned bodies skipped (`generateIntegrator.js:21,27-41`); drag `force -= dragCoefficient * velocity` (`generateCreateDragForce.js:18`); spring `coefficient = k * (r - length) / r`, `body1.force += coefficient * d`, `body2.force -= coefficient * d` (`generateCreateSpringForce.js:24-42`); Coulomb `v = gravity * m1 * m2 / r^3; f += v * d` (`generateQuadTree.js:131-132`), zero distance jittered by the RNG (`:123-127`); `theta` 0 makes the tree exact (`:148`). | `ls graphty-element/node_modules/ngraph.forcelayout/lib/codeGenerators/`; the cited lines |
| The "Performance/Large Graph" story graph is 150 nodes / 250 edges from a seeded LCG (`graphty-element/stories/PerformanceTest.stories.ts:15-57`: `seed = (seed * 1103515245 + 12345) & 0x7fffffff`, seed 42, every node given one edge first, no self-loops), laid out by `layout: "ngraph"` (`:70`). Its duplicate check keys the ORDERED pair `${src}-${dst}` (`:31,44`), and seed 42 produces exactly ONE reversed pair: 250 ordered keys are 249 unordered pairs. An undirected snapshot built from the 250 would carry a multi-arc on that pair while ngraph's non-multigraph `addLink` keeps one link, so the two sides of the G5 comparison would disagree on one mass and one spring; `storyGraph()` therefore dedupes on the unordered pair (P5-T5 Step 2). | `sed -n '15,57p' graphty-element/stories/PerformanceTest.stories.ts`; a node transcription of those lines counting `a < b ? a-b : b-a` keys prints `edges 250 unordered 249 reversed dups 1` |
| The package's own rule for a new layout model, `webgpu-graph-algorithms/CLAUDE.md:404-457` step 6 (`:445-451`), asks for: force parity per stage, trace parity, distributional parity, the behaviour pins, the fast-check properties (fixed nodes, `setPosition`, settle, reheat, remapped `load`), the force-sum invariant where the law is antisymmetric, the subgroup twins, lifecycle, the frame loop, three sabotage rows per kernel, a noise-floor row per tolerance, a browser smoke. The FA2 precedents: `test/layouts/fa2-properties.test.ts` (`:68-403`, ten `it` cases, `numRuns` 200 at `:38`, `gpuScale()` sizing at `:41-43`), `fa2-force-sum.test.ts` (`:1-7`: `\|sum F_i\| <= tol x sum \|F_i\|` after one iteration with gravity 0, tolerance `fa2-force-sum` traced to the force-parity basis row), `fa2-distributional.test.ts` (`:1-19`: 100 iterations, `layoutMetrics` of the GPU layout vs the f64 oracle's within 10%, cases admitted only where the oracle reproduces its own metrics within a third of the cap under eight one-ulp start perturbations). A caps table's `basis` is a noise ROW id, never prose: `noise-floor.test.ts:454` looks the row up and `:996-998` throws when it is missing (`fa2-parity.ts:589-632`: `"fa2-force-sum": { cap: 1e-4, basis: "fa2-force-parity.oracle-f64" }`). | `sed -n '445,451p' webgpu-graph-algorithms/CLAUDE.md`; `grep -n "^\s*it(" webgpu-graph-algorithms/test/layouts/fa2-properties.test.ts`; `sed -n '1,7p' webgpu-graph-algorithms/test/layouts/fa2-force-sum.test.ts`; `sed -n '454p;996,998p' webgpu-graph-algorithms/test/noise-floor.test.ts` |
| The commit script's scope list carries `webgpu-graph-algorithms` (`tools/commit-changes.sh:433-434`); the CI no-subgroups twin pass already covers `test/layouts` (`.github/workflows/ci.yml:318`); the node project's include already names `test/layouts`, `test/oracle`, `test/sabotage` (`webgpu-graph-algorithms/vitest.config.ts:196-199`). No CI or config edit is needed. | the cited lines |
| `webgpu-graph-algorithms/docs/decisions/` holds G0, G1, G2, G3, G6-algorithms, G7. There is no G5. `design/decisions/README.md` indexes ten records (`:29-40`); `design/README.md:14` says 10, `:21` says 12 webgpu documents. | `ls webgpu-graph-algorithms/docs/decisions/`; `ls design/decisions/` |
| No P4 plan file exists in the tree and no grid kernel exists (`ls webgpu-graph-algorithms/src/wgsl/` lists the ten P1-P3 bodies and the seven of P7; `ForceSimulation.load` throws `E_UNSUPPORTED { feature: "repulsion.grid" }` at `force-simulation.ts:889-898`). | `ls design/webgpu/plans/`; `sed -n '889,898p' webgpu-graph-algorithms/src/layouts/force-simulation.ts` |

### 0.2 Entry criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| The design's P3 gate (the exact-tier FA2, `ForceSimulation`, the `ForceModel` hook) | **MET** | `webgpu-graph-algorithms/docs/decisions/G3.md` (closed on the dev box); `src/layouts/force-simulation.ts` and `forceatlas2.ts` on master |
| Phase M5b (the real `@graphty/layout` option and accelerator types imported by the GPU package) | **MET** | `src/types/options.ts:10-16`, `src/types/accelerator.ts:26,47`; `test/types/conformance.test-d.ts:41-61` compiles |
| Phase M8a (the real `AlgorithmAccelerator`) | **MET** | `src/types/accelerator.ts:8-24`; commit `48a28adc` |
| The design's P4 gate (the grid tier) | **NOT MET** | no grid kernel in the tree (0.1, last row). Design 13 orders `P4 (grid) -> P5` (`:4224`), and 7.20 says the FR law rides "the same exact-tile / grid kernels" (`:2442`). This plan lands P5 on the EXACT tier, which is all P3 provides, and threads the `LAW` override into K3 in the exact shape the grid's near-field kernel will take (0.5 DEP-P5-D). |

P5 can therefore start now. Its ordering against P4 is 0.3.

Design section 16 (`:4932-5054`, the amendments of 2026-09-20) changes nothing this plan touches: 16.1-16.3 amend the P8 / P11 algorithm phases, and 16.4's added mask binding is for the algorithm kernels only -- its item 5 (`:5038-5041`) puts layouts out of the amendment's scope, so no P5 kernel needs room for a mask binding and the K1 / K2 / K3 / K5 binding tables stay exactly as 0.1 lists them.

### 0.3 Execution order

```
P3 (met) -> P5 (this plan) ; P4 (grid) before or after P5, see below
```

P5 and P4 are both planned against the tree of 0.1. They touch some of the same files: `src/kernels.ts` (P4 adds grid entries and takes `Fa2Params.pad`; P5 adds override axes to four entries and seven fields AFTER `pad`), `src/wgsl/fa2-repulsion-exact.wgsl.ts` (P5 adds the `LAW` branches; P4 keeps K3 for the exact tier), `src/layouts/forceatlas2.ts` (P5 deletes eleven module-private helpers it moved to `model-common.ts`; P4 rewrites the grid path), `src/layouts/force-simulation.ts` (P5 adds one optional `ModelInputs.fixed` member and eight lines in `load()`; P4 adds the grid buffers), `test/helpers/sabotage.ts` (P5 adds `SABOTAGE_P5`; P4 adds its rows), `test/helpers/override-matrix.ts` (both add u32 values and change the pins), `benchmarks/run.ts` (both register a group), `src/index.ts` / `test/index.test.ts` (both export). Whichever lands second re-applies its edits to those files on top of the first; every edit of this plan is stated as a complete before / after so the re-application is mechanical. The LAW override reaches P4's grid near-field kernel as ONE more override declaration in the same shape as K3's, listed in 0.7 as the item of whichever phase lands second.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | The three pair laws, the two integrators and the two extra statistics are override AXES on the four existing FA2 kernels (`LAW` on K2 / K3, `APPLY` on K5, `STATS_MODE` on K1), never new kernel ids; the binding tables are unchanged | P5-T2 |
| PD-2 | The spring-electrical velocity lives in the `oldForce` slot of K3 / K5: the model's buffer is named `velocity` and bound there; FR keeps an `oldForce` buffer bound and unread | P5-T2, P5-T5 |
| PD-3 | `Fa2Params` gains seven f32 model fields after `pad` (`frK`, `temperature`, `springLength`, `springCoefficient`, `coulomb`, `dragCoefficient`, `timeStep`) plus `pad1`; `Fa2State.reserved0` becomes `temperature` (f32), `kineticEnergy` (f32), `reserved0` (vec2f); `Fa2Trace.pad0` becomes `modelScalar` (f32). FA2's `paramsFor` is unchanged because `UniformBlock.write` zeroes absent fields | P5-T2 |
| PD-4 | Kinetic energy rides partials B: under `APPLY = 2` K5 overwrites `swingTraction` with `(kineticEnergy, 0)` after K3's epilogue wrote it in the same pass; under `STATS_MODE = 2` K1 folds `.x` into `S.kineticEnergy` and the trace | P5-T2 |
| PD-5 | The FR temperature index is anchored by the model: `onReheat` arms a flag, the next `paramsFor(global)` sets `tempOrigin = global - floor(0.7 * iterations)`; `temperature = max(0, 0.1 - dt * (global - tempOrigin))` | P5-T3 |
| PD-6 | The FR `fixed` option resolves at load through a new optional `ModelInputs.fixed`, applied by `ForceSimulation.load()` after the resize block and before any submit; no reheat is triggered | P5-T1 |
| PD-7 | The twelve option / value helpers of `forceatlas2.ts`, its `Overrides` alias, `U32_MODULUS` and the two buffer constants `FORCE_BYTES_PER_NODE` / `FILL_PARAMS_BUFFER` move to `src/layouts/model-common.ts` (T1 writes the copy, T2 deletes the originals and imports) | P5-T1, P5-T2 |
| PD-8 | P5 sabotage rows live in `SABOTAGE_P5`, a separate table measured only by the P5 suites, so `coverage.test.ts`'s name pins and `fa2.test.ts`'s FA2 checks are untouched | P5-T7 |
| PD-21 | The parity suites of BOTH models, the P5 noise-floor members and the one recording run that derives every P5 tolerance land in ONE task (P5-T4, after P5-T5), so no suite is ever created guarded and unguarded later by another task | P5-T4 |
| PD-9 | Compile-matrix pins: P1 37 -> 53 (K3 9 -> 25), P3 22 -> 61 (K1 1 -> 4, K2 17 -> 49, K5 3 -> 7) | P5-T2 |
| PD-10 | Coincident pairs under `LAW` 1 / 2 take the FA2 antisymmetric kick with the law's magnitude evaluated at `d = FA2_DISTANCE_FLOOR`; the CPU FR gives zero force there and the parity fixtures contain no coincident pair | P5-T2 |
| PD-11 | FR mass is 1 for every node and weights are `none`; spring-electrical mass is `1 + outDegree / 3` and weights are `none` | P5-T3, P5-T5 |
| PD-12 | `SpringElectricalOptions.gravity` (ngraph's Coulomb constant, -12) is written into `Fa2Params.coulomb`; `Fa2Params.gravity` (FA2's centre gravity) is 0 for both new models | P5-T5 |
| PD-13 | `ngraph.forcelayout@^3.3.1` and `ngraph.graph@^20.0.1` become devDependencies of the GPU package, imported by two test files and nothing else | P5-T5 |
| PD-14 | The ngraph cross-check runs ngraph with `theta: 0` (exact) and explicit positions for the one-iteration oracle comparison, and with its defaults for the 1,000-step edge-length comparison | P5-T5 |
| PD-15 | Spring-electrical seeds in [-1, 1) (the `"fa2"` range branch); the FR range branch already exists | P5-T5 |
| PD-16 | `setParams({ fixed })` on the FR simulation is `E_INVALID_ARGUMENT` (the hint names `setFixed`) | P5-T3 |
| PD-17 | The `layout-fr` group carries FR AND spring-electrical rows at 10k and 100k on the exact tier; `warmClock` / `reportedRow` are exported from `layout-exact.bench.ts` in a model-agnostic shape | P5-T8 |
| PD-18 | `test/helpers/frame-loop.ts` is widened to any model by two generic parameters; its body reads no FA2 field | P5-T9 |
| PD-19 | The two accelerator members land in ONE task after both models are green; never a throwing stub | P5-T6 |
| PD-20 | The FR / spring models compile K5 with `SWING_MODE = 1`, so its `store_old` never runs and the `oldForce` slot is free for the velocity (PD-2); K3's epilogue under mode 1 writes harmless partials B that K5 (PD-4) or nobody reads | P5-T3, P5-T5 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-P5-A | Design 13 row P5 (`:4212`) and 7.20 (`:2466`) give the preset "ngraph's settle rule (total kinetic energy below a threshold)"; the preset settles by the shared rule of 7.17 (`meanDisplacement <= settleThreshold * rmsRadius` for `settleWindow` iterations) and REPORTS `kineticEnergy`. | 7.17 (`:2257-2261`) already IS ngraph's rule made scale-relative on purpose ("ngraph's 0.01 per body ... are the models, made scale-relative because layout units are not scene units"); ngraph's own test is `lastMove / n <= 0.01` in absolute units (`index.js:62-63`), and a second, absolute rule inside the one state machine would contradict 7.17 and give the element two settle semantics. The gate's "settles within 1,000 steps" is measured under the shared rule and, separately, against ngraph's own `step()` return. Recorded by Task P5-T10 as `design/decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md`. |
| DEP-P5-B | Design 7.20 (`:2463`) calls the preset's integrator "a `velocityVerlet` integrate variant"; the preset integrates with ngraph's semi-implicit Euler step and unit speed clamp. | The gate compares the preset's layout with ngraph's (`:4212`), and ngraph integrates `v += (dt / m) F; clamp |v| <= 1; p += dt v` (`generateIntegrator.js:27-41`). A Verlet step would not reproduce ngraph's trajectory, and the clamp is what keeps a fresh graph from exploding under `gravity -12`. The design's own sentence names "ngraph's option names and defaults" and "the velocity integrator" in the same breath; the integrator ngraph has is Euler. Recorded by Task P5-T10 as `design/decisions/2026-09-20-spring-electrical-integrates-like-ngraph.md`. |
| DEP-P5-C | Design 7.20 (`:2444`) and 7.19 (`:2323`): `reheat()` "sets the iteration to `floor(0.7 * iterations)`". The GPU model restarts the TEMPERATURE index there (PD-5) but the iteration BUDGET restarts at 0, because `ForceSimulation.reheat()` (`force-simulation.ts:1200-1208`) resets `iterationsDone` for every model and the hook has no iteration argument; the temperature is clamped at 0, so a reheated run cools over 30% of the budget, then stops moving and settles within `settleWindow` more iterations. | Changing the hook signature is a change to the P3 contract every model shares for one model's budget accounting; the observable difference is the `iterationsDone` value at the stop, not the layout. The CPU FR (`layout/src/simulation/fruchterman-reingold.ts:378-386`) stops at the budget instead. Recorded by Task P5-T10 as `design/decisions/2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md`. |
| DEP-P5-D | Design 7.20 (`:2442`) puts `LAW = FR` on "the same exact-tile / grid kernels"; this plan puts it on the exact tile only. | The tree has no grid kernel (0.1). Rule (b) forbids P5 building P4's kernels to host an override; when P4 lands, its near-field kernel takes the same three-valued `LAW` declaration K3 takes here (0.3, 0.7). No decision record: nothing in the design is contradicted, only sequenced. |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| P5 Fruchterman-Reingold + the spring-electrical preset | `webgpu-graph-algorithms/` | P3, M5b, M8a -- all MET (0.2) | `createFruchtermanReingold`, `createSpringElectrical`, the two stats records, the `LAW` / `APPLY` / `STATS_MODE` kernel branches, two f64 oracles (the second checked against ngraph), the accelerator members, browser smoke, the `layout-fr` group with T-14, the P5 sabotage / inspect / noise rows, three decision records, the G5 record | design G5 | design 13 row P5 says 4-5 ed; this plan's eleven tasks sum to 15.5 ed (the table below) |

Critical path: P5-T1 -> P5-T2 -> P5-T3 and P5-T5 in parallel -> P5-T4 -> P5-T7 ; P5-T6, P5-T8, P5-T9 after P5-T3 and P5-T5, in parallel with P5-T4 ; P5-T10 any time after P5-T1 ; P5-T11 last.

**Per-task estimate, and the size this plan actually is.** The design's P5 cell says "4-5 ed", and design 13 rule (e) (`:4198-4199`) defines ed as "engineer-days (ed) for one engineer familiar with the code base; the WGSL phases carry the most uncertainty". The cell is not restated here unexamined:

| Task | What it is | ed |
| --- | --- | --- |
| P5-T1 | the helper move (fourteen names), four constants tables, two resolved records, two stats records, the `fixed` seam and its test | 1.0 |
| P5-T2 | seven block fields, three override axes in four bodies with eleven new branches, the registry, the matrix pins, the compile on three adapters | 2.5 |
| P5-T3 | the FR model and factory, the FR f64 / f32 oracle with stages, the option, behaviour and fast-check property suites | 2.5 |
| P5-T4 | the FR and spring parity helpers, the FR inspect / trace / twins / layout-oracle / lifecycle suites, the spring inspect / trace suites, the force-sum and distributional suites of both models, the 46 noise-floor tolerances, the recording run on two adapters | 3.0 |
| P5-T5 | the devDependency, the spring-electrical oracle, its ngraph cross-check, the model and factory, the option / behaviour / property / settle suites | 2.5 |
| P5-T6 | two accelerator members, the barrel, five pinned lists | 0.5 |
| P5-T7 | 25 sabotage rows, two sabotage suites, the timed check-mode run of the whole P5 set on two adapters | 1.0 |
| P5-T8 | the `layout-fr` group, the run.ts and README rows, two baselines re-captured (one through a labelled PR) | 1.0 |
| P5-T9 | the frame-loop widening, the FR frame-loop case, the browser smoke | 0.5 |
| P5-T10 | three decision records and three index edits | 0.5 |
| P5-T11 | the full green check on two adapters plus the browser, and the G5 record | 0.5 |
| | **total** | **15.5** |

15.5 ed against the design's 4-5. The gap is not padding: the cell predates rule (f), which makes every kernel branch carry three sabotage rows, an `inspect()` stage comparison and a recorded noise floor (that alone is P5-T4 and P5-T7), it predates the package's own step 6 (`CLAUDE.md:445-451`: the property rows, the force-sum invariant and distributional parity per model), and it counted one oracle where the gate needs two plus a third implementation (ngraph) to check the second against. The owner's call, in the PR: accept 15.5, or split -- P5-T1..T3 and T5 (the two models and their oracles, behaviour-tested but with no derived tolerance yet, so no G5 item closed) as one PR, and P5-T4 onward as the PR that closes G5.

### 0.7 What P5 does NOT do

- It does not build or touch a grid kernel (DEP-P5-D). The `LAW` override on the grid near-field kernel is the item of whichever of P4 / P5 lands second; it is one `overrideDecls` entry and one `if (LAW == 1u)` / `if (LAW == 2u)` pair in the same shape as K3's (P5-T2 Step 3).
- It does not touch `algorithms/`, `layout/`, `graphty-element/` or `graphty/`. The element's route from `"spring"` / `"spring-electrical"` to the accelerator methods is design 9.4 and phase M6; `layout/src/simulation/create-simulation.ts:31-42` already dispatches to the methods this phase adds. Whether the element ROUTES its `ngraph` layout to the preset stays Q-9's product decision (`:4298`).
- It does not add ARF or Kamada-Kawai (7.20 `:2473-2480`: "not scheduled").
- It does not port the P4 windowed execution, `calibrateLayout` or the `node-limits` project's layout tests.
- It does not change any P1 / P3 sabotage row, any FA2 test or any FA2 tolerance; the FA2 kernels' `LAW = 0` / `APPLY = 0` / `STATS_MODE = 0` paths are the existing text plus one extra reduction in K5 and one extra accumulator in K1 whose results FA2 never reads (P5-T2 Step 4 asserts the FA2 suite is still bitwise identical to its committed noise fixtures).
- It does not touch `webgpu-graph-algorithms/project.json` or any workflow file.

---

## Phase P5: Fruchterman-Reingold and the spring-electrical preset

**Entry criteria:** P3, M5b and M8a, all MET (0.2). Work in the worktree `.worktrees/gpu-scale-layouts` on branch `feat/gpu-p5-p4` (created by the owner); every commit through `tools/commit-changes.sh` with scope `webgpu-graph-algorithms` except the ONE noted in P5-T10 (type `docs`, no scope); the phase lands as ONE PR carrying the `gpu` label so `gpu.yml` runs on it.

**Step 0 of the phase.** Export the two path variables FIRST -- every Run line in this document begins `cd $WT` or `cd $PKG`, and they are shell variables, not prose placeholders:

    export WT=/home/apowers/Projects/graphty-monorepo/.worktrees/gpu-scale-layouts
    export PKG=$WT/webgpu-graph-algorithms

then, if `$PKG/node_modules` or `$WT/graph-format/dist` or `$WT/layout/dist` is missing, `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,layout` (the package's tsc and vitest resolve `@graphty/graph-format` through `graph-format/dist/` and `@graphty/layout` through `layout/dist/layout.d.ts`, `webgpu-graph-algorithms/CLAUDE.md:151-156`). Re-export both in any new shell.

**The local run environments (`webgpu-graph-algorithms/CLAUDE.md:287-294`), used verbatim in every task's Run lines:**

    # NVIDIA (the hardware lane the parity numbers come from; the RTX 4070 SUPER)
    export GPU_NV='LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu GRAPHTY_GPU_REQUIRE=hardware'
    # lavapipe (what CI's default lane runs)
    export GPU_LLVM='GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp'

---

### Task P5-T1: The option, stats and fixed-mask seams of the two models

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 3.3 lines 846-847 (`FruchtermanReingoldStats`, `SpringElectricalStats`, verbatim), 9.3 lines 3015-3016 (the two option records, already the real `@graphty/layout` declarations), 7.20 lines 2440-2446 (`k`, the temperature schedule, `fixed`), 7.12 lines 2148-2160 (the fixed mask at load), 7.17 lines 2257-2261 (the settle defaults every model shares).

**Files:**
- Create: `webgpu-graph-algorithms/src/layouts/model-common.ts`
- Modify: `webgpu-graph-algorithms/src/constants.ts` (append `FR_DEFAULTS`, `FR_START_TEMPERATURE`, `FR_REHEAT_FRACTION`, `SE_DEFAULTS`), `webgpu-graph-algorithms/src/types/options.ts` (append `ResolvedFruchtermanReingoldOptions`, `ResolvedSpringElectricalOptions`), `webgpu-graph-algorithms/src/types/layout.ts` (append the two trace records and the two stats records), `webgpu-graph-algorithms/src/layouts/force-simulation.ts` (`ModelInputs.fixed` and its application in `load()`), `webgpu-graph-algorithms/test/layouts/force-simulation.test.ts` (one case), `webgpu-graph-algorithms/test/device/constants.test.ts` (the two new tables pinned)
- NOT touched: `src/layouts/forceatlas2.ts` (Task P5-T2 deletes its private helper copies once the kernels compile against the new axes; until then the two copies coexist), `src/index.ts` (Task P5-T6 owns the barrel)

**Interfaces:**
- Consumes: `FA2_DEFAULTS` (`src/constants.ts:58-88`), `LayoutStatsBase` (`src/types/layout.ts:11-21`), `CommonLayoutOptions` / `SimulationOptions` / `FruchtermanReingoldOptions` / `SpringElectricalOptions` (`src/types/options.ts:20-26`, re-exported from `@graphty/layout`), `NodeMask` / `makeMask` / `maskTest` from `@graphty/graph-format` (`graph-format/src/util/mask.ts:27,37`).
- Produces: `FR_DEFAULTS`, `FR_START_TEMPERATURE`, `FR_REHEAT_FRACTION`, `SE_DEFAULTS`; `ResolvedFruchtermanReingoldOptions`, `ResolvedSpringElectricalOptions`; `FruchtermanReingoldTraceRecord`, `FruchtermanReingoldStats`, `SpringElectricalTraceRecord`, `SpringElectricalStats`; `ModelInputs.fixed?: NodeMask | null`; the fourteen exports of `model-common.ts` (the twelve helpers, `Overrides`, `FORCE_BYTES_PER_NODE`, `FILL_PARAMS_BUFFER`).

**PLAN DECISION PD-6 (the `fixed` option resolves through `ModelInputs`).** `ForceSimulation.load()` already calls `model.inputs(snapshot, options)` in its check phase (`force-simulation.ts:924`), before any state is touched, and clears the fixed words only on a resize (`:953-958`). A model that adds an optional `fixed` member to what it returns gives the simulation a mask it can validate there and apply right after the resize block -- with `fixedDirty = true` so the words reach the device before the first submit (`:1335-1338`) and WITHOUT `reheat()`, which `setFixed` would call on an unpin (`:1142-1144`) and which for FR would re-anchor the temperature at 70% on the very load that should start it at 0 (PD-5). A subclass overriding `load()` and calling `setFixed()` was rejected for exactly that reheat, and a new `ForceModel` hook for adding a member to an interface FA2 must then implement.

**PLAN DECISION PD-7 (the helpers move).** `forceatlas2.ts:96-297` holds twelve module-private functions every option resolver needs (`describeValue`, `invalid`, `pickNumber`, `pickBoolean`, `pickDim`, `pickCenter`, `pickSeed`, `isPositiveInteger`, `seedWord`, `scalar`, `vector`, `subset`), and its constants block holds the `Overrides` alias (`:58`), `U32_MODULUS` (`:79`, read by `seedWord` only) and the two buffer constants every model's `buffers()` needs: `FORCE_BYTES_PER_NODE = 12` (`:64`) and `FILL_PARAMS_BUFFER = "fillParams"` (`:67`). Two new models would copy them or import them; a copy is the duplication the house forbids and an import of a sibling model's file makes `fruchterman-reingold.ts` depend on `forceatlas2.ts` for no model reason. They move to `src/layouts/model-common.ts` in the `layouts` zone (`eslint.config.js:149` lets a layout file import a layout file). This task writes the file as a verbatim copy with `export` added (`U32_MODULUS` stays module-private there); Task P5-T2, which edits `forceatlas2.ts` anyway, deletes the originals and imports. What does NOT move: `BufferUsage` (each model imports it from `../device/webgpu-constants.js` as `forceatlas2.ts:27` does), `UNIFORM_SLOT_BYTES` (from `../constants.js`, `:24`) and the three-line `resolvePatch` callback (`forceatlas2.ts:922-924`), which names the model's own option type and is written per model (P5-T3 Step 3, P5-T5 Step 4).

- [ ] **Step 1: The constants**

Append to `$PKG/src/constants.ts` after `FA2_FLAG_FIRST` (`:116`):

```ts
/** The Fruchterman-Reingold loop's starting temperature (spec 7.20; `layout/src/simulation/fruchterman-reingold.ts:30`). */
export const FR_START_TEMPERATURE = 0.1;
/** The reheat point of spec 7.20: the temperature index a reheat restarts at, as a fraction of `iterations`. */
export const FR_REHEAT_FRACTION = 0.7;
/** Fruchterman-Reingold defaults (spec 7.20, 9.3; the CPU simulation's, `layout/src/simulation/fruchterman-reingold.ts:32`): `k` null = `1 / sqrt(n)`. */
export const FR_DEFAULTS: Readonly<{
    k: null;
    iterations: 50;
    fixed: null;
    dim: 2;
    scale: 1;
    settleThreshold: 0.001;
    settleWindow: 10;
    iterationsPerStep: 1;
    maxInFlight: 2;
}> = Object.freeze({
    k: null,
    iterations: 50,
    fixed: null,
    dim: 2,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
/** Spring-electrical defaults: ngraph.forcelayout 3.3.1's (`lib/createPhysicsSimulator.js:29,34,40,54,59`; spec 7.20), plus the shared simulation defaults. `gravity` is ngraph's Coulomb constant: negative repels. */
export const SE_DEFAULTS: Readonly<{
    springLength: 10;
    springCoefficient: 0.8;
    gravity: -12;
    dragCoefficient: 0.9;
    timeStep: 0.5;
    dim: 2;
    scale: 1;
    settleThreshold: 0.001;
    settleWindow: 10;
    iterationsPerStep: 1;
    maxInFlight: 2;
}> = Object.freeze({
    springLength: 10,
    springCoefficient: 0.8,
    gravity: -12,
    dragCoefficient: 0.9,
    timeStep: 0.5,
    dim: 2,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
    maxInFlight: 2,
});
```

In `$PKG/test/device/constants.test.ts`, beside the `FA2_DEFAULTS` pin (`:146-162`), add one `it` that asserts `FR_DEFAULTS` and `SE_DEFAULTS` `toEqual` the literals above, both `Object.isFrozen`, `FR_START_TEMPERATURE === 0.1` and `FR_REHEAT_FRACTION === 0.7` (import the four names at the top of the file beside `FA2_DEFAULTS`, `:13`).

Run: `cd $PKG && pnpm exec vitest run --project=node test/device/constants.test.ts`
Expected: PASS.

- [ ] **Step 2: The resolved option records**

Append to `$PKG/src/types/options.ts`:

```ts
/**
 * The resolved (defaults applied) Fruchterman-Reingold option record (spec 7.20, 9.3): `k` null means `1 / sqrt(n)`
 * at load; `fixed` is applied at load through ModelInputs.fixed (PD-6). Exported for src/layouts/fruchterman-reingold.ts
 * and the option tests.
 * @public
 */
export interface ResolvedFruchtermanReingoldOptions {
    readonly k: number | null;
    readonly iterations: number;
    readonly fixed: NodeMask | string | null;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly seed: number | null;
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly maxInFlight: number;
}

/**
 * The resolved spring-electrical option record (spec 7.20, 9.3; ngraph's names): `gravity` is the Coulomb constant
 * (negative repels), never FA2's centre gravity. Exported for src/layouts/spring-electrical.ts and the option tests.
 * @public
 */
export interface ResolvedSpringElectricalOptions {
    readonly springLength: number;
    readonly springCoefficient: number;
    readonly gravity: number;
    readonly dragCoefficient: number;
    readonly timeStep: number;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly seed: number | null;
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly maxInFlight: number;
}
```

and add `NodeMask` to the `import type { F32, NodeId } from "@graphty/graph-format";` line (`:9`).

- [ ] **Step 3: The stats records (design 3.3 lines 846-847, verbatim shapes)**

Append to `$PKG/src/types/layout.ts` after `ForceAtlas2Stats` (`:38-44`):

```ts
/**
 * One per-iteration trace record of the last completed batch of a Fruchterman-Reingold simulation (spec 3.3
 * FruchtermanReingoldStats.trace element): K1 writes `temperature` from the iteration's uniform slot (spec 7.20).
 * @public
 */
export interface FruchtermanReingoldTraceRecord {
    readonly temperature: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** Spec 3.3 FruchtermanReingoldStats, verbatim: the cooling schedule's value replaces the controller fields. */
export interface FruchtermanReingoldStats extends LayoutStatsBase {
    readonly temperature: number;
    readonly trace: ReadonlyArray<FruchtermanReingoldTraceRecord>;
}

/**
 * One per-iteration trace record of the last completed batch of a spring-electrical simulation (spec 3.3
 * SpringElectricalStats.trace element): `kineticEnergy` is `0.5 * sum m |v|^2` over the free nodes after the
 * PREVIOUS iteration's integrate: K5 writes it into partials B and the NEXT iteration's K1 folds it (PD-4), so the
 * first record after load() carries 0 and record i carries the energy of iteration i - 1.
 * @public
 */
export interface SpringElectricalTraceRecord {
    readonly kineticEnergy: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** Spec 3.3 SpringElectricalStats, verbatim; `kineticEnergy` is the last folded value, one iteration behind the last integrate (PD-4). */
export interface SpringElectricalStats extends LayoutStatsBase {
    readonly kineticEnergy: number;
    readonly trace: ReadonlyArray<SpringElectricalTraceRecord>;
}
```

- [ ] **Step 4: The helper module**

Create `$PKG/src/layouts/model-common.ts` with the header

```ts
/**
 * The option and value helpers every force model's resolver and stats decoder share (PD-7): moved verbatim from
 * src/layouts/forceatlas2.ts (P3-T2) so the Fruchterman-Reingold and spring-electrical models of P5 neither copy
 * them nor import a sibling model. Layout zone; imports errors.ts only.
 */

import { WebGpuGraphError } from "../errors.js";
import { type UniformValues } from "../kernel/struct-block.js";

/** An override record as the kernel layer takes it. */
export type Overrides = Readonly<Record<string, number | boolean>>;

/** Bytes of the stride-3 f32 force arrays per node. */
export const FORCE_BYTES_PER_NODE = 12;

/** The name of the model-owned FillParams buffer (a BufferSpec, reached through ModelResources.buffer). */
export const FILL_PARAMS_BUFFER = "fillParams";

/** 2^32, the modulus of the u32 seed word (computed with `%`, never a bitwise operator). */
const U32_MODULUS = 4294967296;
```

(the alias is `forceatlas2.ts:58`, the two constants `:64` and `:67`, the modulus `:79`, each copied with its JSDoc) followed by the twelve functions copied VERBATIM (JSDoc included) from `forceatlas2.ts` with `export` prepended: `describeValue` (`:96-110`), `invalid` (`:119-125`), `pickNumber` (`:137-149`), `pickBoolean` (`:158-164`), `pickDim` (`:172-178`), `pickCenter` (`:186-216`), `pickSeed` (`:224-233`), `isPositiveInteger` (`:240-242`), `seedWord` (`:249-254`), `scalar` (`:262-268`), `vector` (`:276-282`), `subset` (`:291-297`). Do not edit a body; the file is a move in two halves.

Run: `cd $PKG && pnpm exec eslint src/layouts/model-common.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean (the copies in `forceatlas2.ts` are still private there, so no duplicate-export exists).

- [ ] **Step 5: Write the failing `fixed`-at-load test**

`test/layouts/force-simulation.test.ts` already has what the case needs: `FakeModel` (`:132`) with a `blocks?` constructor record (`:160-162`), an `inputs()` that returns `{ mass, weights }` (`:177-180`), a `calls` counter that counts `reheat` (`:148`, incremented at `:261`), `makeSim(ctx, fake, options, tuning)` (`:295-307`), `graph(n)` (path graphs), `nanPositions(n)`, `errorOf(fn)` and the `ctx.debug.inspect = true` idiom whose `inspect("fixed")` returns the mask words as a `Uint32Array` (`force-simulation.ts:2005-2006`). Two edits and one case:

1. Widen the constructor record to `{ readonly params?: UniformBlock; readonly state?: UniformBlock; readonly fixed?: NodeMask | null }`, store `this.fixed = blocks?.fixed ?? null`, and make `inputs()` return `{ mass, weights, fixed: this.fixed }` (import `type NodeMask`, `makeMask`, `maskSet`, `maskTest` from `@graphty/graph-format` beside the file's existing graph-format imports).
2. Add inside the top-level describe:

```ts
it("inputs().fixed pins nodes at load without a reheat (PD-6): the words reach the device, a same-size reload keeps them, a short mask is E_INVALID_ARGUMENT", async (t) => {
    requireGpu(t);
    const ctx = await ctxOf();
    ctx.debug.inspect = true;
    try {
        const mask = makeMask(8);
        maskSet(mask, 2, true);
        const fake = new FakeModel({ fixed: mask });
        const s = makeSim(ctx, fake);
        s.load(graph(8), nanPositions(8));
        expect(fake.calls.reheat, "load() applied the mask without reheat()").toBe(0);
        expect(s.iterationsDone).toBe(0);
        await s.step(1);
        const words = await s.inspect?.("fixed");
        expect(words).toBeInstanceOf(Uint32Array);
        expect(maskTest(words as Uint32Array, 2)).toBe(true);
        expect(maskTest(words as Uint32Array, 3)).toBe(false);
        // a same-size reload of the same fake keeps the pin (spec 7.12: cleared on a resize only)
        s.load(graph(8), nanPositions(8));
        await s.step(1);
        expect(maskTest((await s.inspect?.("fixed")) as Uint32Array, 2)).toBe(true);
        // a resize to 40 nodes needs 2 words; the fake still returns the 1-word mask: rejected before any state moves
        const err = errorOf(() => s.load(graph(40), nanPositions(40)));
        expect(err.code).toBe("E_INVALID_ARGUMENT");
        expect(err.details.argument).toBe("fixed");
        expect(s.nodeCount, "the failed load changed nothing").toBe(8);
        s.dispose();
    } finally {
        ctx.debug.inspect = false;
    }
});
```

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/force-simulation.test.ts`
Expected: FAIL at `maskTest(words, 2)` (bit 2 is 0: the simulation ignores `inputs().fixed`), and at the short-mask case (no error is thrown).

- [ ] **Step 6: Implement the seam**

In `$PKG/src/layouts/force-simulation.ts`:

1. `ModelInputs` (`:84-87`) gains `readonly fixed?: NodeMask | null | undefined;` with the JSDoc "a mask to apply at load (the FR `fixed` option, PD-6); validated against `ceil(n / 32)` words; absent / null leaves the words as they are (kept on a same-size reload, cleared on a resize, spec 7.12)".
2. In `load()`, in the check phase right after the `inputs.mass.length !== n` check (`:925-933`), add:

```ts
            const fixedWords = Math.ceil(n / 32);
            if (inputs.fixed !== undefined && inputs.fixed !== null && inputs.fixed.length < fixedWords) {
                throw invalidArgument(
                    "fixed",
                    inputs.fixed.length,
                    fixedWords,
                    `the model resolved a fixed mask of ${inputs.fixed.length} words, ${fixedWords} needed for ${n} nodes`,
                );
            }
```

3. In the mutate phase, right after the `if (resized) { ... }` block (`:953-958`) and before the `n === 0` return, add:

```ts
        if (inputs !== null && inputs.fixed !== undefined && inputs.fixed !== null) {
            this.fixedWords.set(inputs.fixed.subarray(0, Math.ceil(n / 32)));
            this.fixedDirty = true;
        }
```

`NodeMask` is already imported at `:11`. Nothing else changes: `recordAndSubmit` uploads dirty words before the first submit (`:1335-1338`) and `reheat()` is never called.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/force-simulation.test.ts test/layouts/fa2-properties.test.ts`
Expected: PASS (the FA2 properties still hold: FA2's `inputs()` returns no `fixed`).

- [ ] **Step 7: Green check**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80. `knip` is checked at P5-T11 (the new helper module is imported by nothing until P5-T2; if the owner commits T1 alone, `cd $WT && pnpm exec knip` reports `model-common.ts` unused -- expected and closed by T2).

- [ ] **Step 8: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the option, stats and fixed-mask seams of the P5 layout models` through `tools/commit-changes.sh`. The body records PD-6 and PD-7.

---

### Task P5-T2: The FR, coulomb and spring laws and the two integrators on the FA2 kernels

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.20 lines 2438-2451 (the FR table: repulsion `k^2 / d` with the `|| 0.1` guard, attraction `d^2 / k`, temperature slots, `FR_APPLY`, no K4) and 2455-2467 (the preset: `forceLaw: "coulomb"`, the velocity integrator, ngraph's names), 7.2 lines 1676-1677 (the floor and the coincident kick, which `LAW = 0` keeps), 7.4 lines 1770-1776 (the binding tables P5 keeps), 3.5 / `CLAUDE.md:166-201` (the WGSL rules), 11.9 item 1 (the sabotage seam: bodies are the target of textual mutations, so every new line is written to be a unique `find` string).

**Files:**
- Modify: `webgpu-graph-algorithms/src/kernels.ts` (`FA2_PARAMS` `:105-124`, `FA2_STATE` `:127-157`, `FA2_TRACE` `:160-173`, the `overrideDecls` of K1 `:349`, K2 `:366-370`, K3 `:391-395`, K5 `:434`, and their JSDoc lines), `webgpu-graph-algorithms/src/wgsl/fa2-stats-finalize.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/fa2-attraction.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/fa2-repulsion-exact.wgsl.ts`, `webgpu-graph-algorithms/src/wgsl/fa2-integrate.wgsl.ts`, `webgpu-graph-algorithms/src/layouts/forceatlas2.ts` (delete the twelve private helpers of `:96-297`, the `Overrides` alias of `:58`, `FORCE_BYTES_PER_NODE` of `:64`, `FILL_PARAMS_BUFFER` of `:67` and `U32_MODULUS` of `:79`; import them from `./model-common.js`), `webgpu-graph-algorithms/test/helpers/override-matrix.ts` (`U32_OVERRIDE_VALUES` `:55-62`, the comment `:64-70`, `EXPECTED_CASES_BY_PHASE` `:71-76`), `webgpu-graph-algorithms/test/kernel/wgsl-compile.test.ts` (the per-kernel pins at `:52`)
- NOT touched: `test/kernel/bind-group-budget.test.ts` (no binding changes: its `STORAGE_COUNTS` `:19-37` stay 3 / 6 / 6 / 6), `test/helpers/sabotage.ts` (Task P5-T7), `src/layouts/repulsion-exact.ts` (its three-override `specs()` at `:95-104` omits `LAW`, which the composer defaults to 0 and `canonicalKey` fills in, `override-matrix.ts:251-253`)

**Interfaces:**
- Consumes: the prelude helpers `kick_dir`, `mask_bit`, `wg_reduce_f32`, `wg_reduce_vec4`, `group_id`, `linear_id` and the constants `FA2_DIST_FLOOR`, `FA2_DIST_FLOOR_SQ`, `FA2_COINCIDENT_SQ`, `F32_MAX` (`src/kernel/prelude.ts:48-52,59-126`); the fourteen exports of `model-common.ts` (P5-T1).
- Produces: `Fa2Params` 128 bytes with `frK` @96, `temperature` @100, `springLength` @104, `springCoefficient` @108, `coulomb` @112, `dragCoefficient` @116, `timeStep` @120, `pad1` @124; `Fa2State.temperature` @112, `.kineticEnergy` @116, `.reserved0` (vec2f) @120; `Fa2Trace.modelScalar` @28; the override axes `LAW: u32` (K2, K3), `APPLY: u32` (K5), `STATS_MODE: u32` (K1), each defaulting to 0 = the FA2 text.

**PLAN DECISION PD-1 (override axes, not kernel ids).** Design 7.20 says the FR law rides "the same exact-tile / grid kernels with `override LAW = FR`" (`:2442`), "kernels K1, K2, K3, K5 of 7.4 with a trivial integrate and no K4" (`:2450`) and, for the preset, "`forceLaw: "fa2" | "fr" | "coulomb"` on the repulsion kernels" and "a `velocityVerlet` integrate variant" (`:2461-2463`). A new kernel id would duplicate the tile loop, the epilogue, the partials fold and every existing sabotage row; an override is one `if` per branch, the pipeline cache keys it (`(id, overrides, needs, snippets)`, `CLAUDE.md:199-201`), the matrix enumerates it from the registry (`override-matrix.ts:106-127`), and the bind-group budget is untouched. The cost is 53 more compile cases (PD-9) and one extra workgroup reduction in K5 and one accumulator in K1 on the FA2 path, whose outputs FA2 never reads.

**PLAN DECISION PD-2 (the velocity in the `oldForce` slot).** K5 binds `oldForce` read_write and K3 binds it read-only (`kernels.ts:386,426`); adding a `velocity` binding would give K5 seven storage buffers (allowed) but force FA2 to bind SOMETHING there that aliases no writable slot (`Kernel.bind` rejects a storage / read-only pair on one buffer, M8b-T5's note), i.e. a dummy buffer FA2 never used. Under `APPLY = 2` K5 reads the slot as the velocity, updates it and stores it back; the model names its 12n `BufferSpec` `velocity` and binds it into the `oldForce` slot of both kernels; K5's FA2 `store_old` never runs because the model compiles `SWING_MODE = 1` (PD-20). The design's "12n velocity buffer" (`:2464`) is exactly this buffer.

**PLAN DECISION PD-3 (the block fields).** `Fa2Params.pad` at byte 80 is reserved for P4's GridSpec (`kernels.ts:104`); P5 appends AFTER it and never touches the first 96 bytes, so P4's field lands where the P3 comment says. `Fa2State` has nine reserved vec4f slots from byte 112; `reserved0` becomes two f32 and a vec2f, every later offset unchanged (`test/kernel/struct-block.test.ts:80-100` defines its OWN copy of the P3 layout and is unaffected; Step 6 runs it to prove so). `Fa2Trace.pad0` at byte 28 becomes the f32 `modelScalar` (temperature for FR, kinetic energy for the preset, 0 for FA2), the record stays 32 bytes (`TRACE_RECORD_BYTES`). FA2's `paramsFor` (`forceatlas2.ts:681-705`) is not edited: `UniformBlock.write` zeroes the slot and skips absent fields (`struct-block.ts:291-318`), and the FA2 kernels never read the seven under `LAW = 0`.

**PLAN DECISION PD-4 (kinetic energy rides partials B).** `Fa2Partial` is exactly 64 bytes (`kernels.ts:175-186`: sum 16, min 16, max 16, swingTraction 8, dispFree 8) with no room. Under the preset K4 never runs, so `swingTraction`, written by K3's epilogue (`fa2-repulsion-exact.wgsl.ts:75-76`), is read by nobody; K5, which runs after K3 in the same pass (`forceatlas2.ts:763-771` order; WebGPU makes each dispatch's storage writes visible to the next dispatch of the pass), overwrites it with `(0.5 * sum m |v|^2 over the workgroup's free rows, 0)` under `APPLY = 2`, and K1 of the NEXT iteration folds `.x` into `S.kineticEnergy` and the trace under `STATS_MODE = 2`. The reduction runs unconditionally (a `wg_reduce_f32` of zeros under other modes); only the write is conditional.

**PLAN DECISION PD-10 (coincident pairs).** 7.20's singularity row says "`|| 0.1` exact-zero guard | replicated; coincident kick as FA2" (`:2448`). The CPU FR (`layout/src/simulation/fruchterman-reingold.ts:421-427`) turns an exact zero into distance 0.1 and a ZERO force vector; the design asks for the kick so coincident nodes separate. Under `LAW` 1 and 2 the kick keeps the FA2 direction (`kick_dir`, antisymmetric by construction, 7.2) and takes the law's magnitude at `d = FA2_DISTANCE_FLOOR`: `frK^2 / 0.01` and `-coulomb m_i m_j / 0.0001`. Every parity fixture is seeded with distinct positions, so the CPU and the GPU never disagree there; `test/layouts/fr-behaviour.test.ts` (P5-T3) checks two coincident nodes separate.

**PLAN DECISION PD-9 (the compile-matrix pins).** `override-matrix.ts:106-127` builds the full product of the declared axes plus the standard pair. With `LAW` {0, 1, 2} on K2: `1 + 2 * 2 * 2 * 2 * 1 * 3 = 49` (was 17); on K3: `1 + 2 * 2 * 2 * 3 = 25` (was 9); `APPLY` {0, 1, 2} on K5: `1 + 2 * 3 = 7` (was 3); `STATS_MODE` {0, 1, 2} on K1: `1 + 3 = 4` (was 1). P1 = 5 + 19 + 1 + 25 + 3 = 53; P3 = 4 + 49 + 7 + 1 = 61. The `LAW != 0` x `LINLOG = true` and `LAW != 0` x `DISTRIBUTED = true` combinations compile and are emitted by no factory (the FR / spring models set both false); the matrix is a superset by design (`override-matrix.ts:14-21`).

- [ ] **Step 1: The three blocks in `src/kernels.ts`**

Replace the `FA2_PARAMS` field list (`:105-124`) so it ends

```ts
    ["levels", "u32"],
    ["pad", "vec4f"],
    ["frK", "f32"],
    ["temperature", "f32"],
    ["springLength", "f32"],
    ["springCoefficient", "f32"],
    ["coulomb", "f32"],
    ["dragCoefficient", "f32"],
    ["timeStep", "f32"],
    ["pad1", "f32"],
]);
```

and extend its JSDoc (`:104`): "... `pad` @80 (reserved for the P4 GridSpec); the P5 model fields (PD-3): `frK` @96 (the FR optimal distance), `temperature` @100 (the FR temperature of this iteration), `springLength` @104, `springCoefficient` @108, `coulomb` @112 (ngraph's `gravity`, negative repels), `dragCoefficient` @116, `timeStep` @120, `pad1` @124; 128 B". In `FA2_STATE` (`:146`) replace `["reserved0", "vec4f"],` with

```ts
        ["temperature", "f32"],
        ["kineticEnergy", "f32"],
        ["reserved0", "vec2f"],
```

and amend its JSDoc: "`temperature` @112 (FR, written by K1 under STATS_MODE 1), `kineticEnergy` @116 (the preset, K1 under STATS_MODE 2), `reserved0` @120 (vec2f), `reserved1` .. `reserved8` @128 .. @240". In `FA2_TRACE` (`:170`) replace `["pad0", "u32"],` with `["modelScalar", "f32"],` and amend the JSDoc: "`modelScalar` @28 (K1: the temperature under STATS_MODE 1, the kinetic energy under 2, 0 under 0)".

Run: `cd $PKG && pnpm exec vitest run --project=node test/kernel/struct-block.test.ts test/layouts/fa2-options.test.ts`
Expected: PASS (`struct-block.test.ts:80-100,425-445` lays out its own copy; `fa2-options.test.ts` decodes the header through `FA2_STATE` by name).

- [ ] **Step 2: K2, `src/wgsl/fa2-attraction.wgsl.ts`**

Replace lines 30-31 of the body

```wgsl
        let d = pos[j].xyz - pi.xyz;                           // toward j
        let len = max(length(d), FA2_DIST_FLOOR);
```

with

```wgsl
        let d = pos[j].xyz - pi.xyz;                           // toward j
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { w = length(d) / P.frK; }              // LAW 1 (FR, 7.20): |F| = d^2 / k along d / d, unfloored; the linear select below applies w as is
        if (LAW == 2u) { w = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring, ngraph generateCreateSpringForce.js:33-36): Hooke k_s (d - L) toward j
```

The two existing lines `let mag = select(w, w * log(1.0 + len) / len, LINLOG);` and `f = f + d * mag;` stay byte for byte (they are P3 sabotage `find` strings, 0.1). Under `LAW` 1 / 2 the models compile `LINLOG = false` (the select passes `w` through) and `HAS_WEIGHTS = false` (the `w = weights[a]` line above is skipped; both laws then overwrite `w`, which is why the CPU's "ignores weights" holds even on a weighted snapshot). `len` is floored for the spring (ngraph jitters `r === 0` with its RNG, `:28-31`; the floor gives a zero spring force at `d = 0`, which the repulsion kick then separates), the FR law uses the raw length (7.20: "an exact 0 becomes 0.1, otherwise unclamped" -- at exactly 0 the product `d * w` is the zero vector either way). Update the file's header comment to name `LAW`.

- [ ] **Step 3: K3, `src/wgsl/fa2-repulsion-exact.wgsl.ts`**

Insert after `fn load_old` (`:20`) the helper

```wgsl
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
```

and replace the pair block (`:48-54`)

```wgsl
                if (d2 < FA2_COINCIDENT_SQ) {                                     // coincident: antisymmetric unit kick of magnitude k m_i m_j / 0.01 (7.2)
                    f = f + kick_dir(i, jj, P.dim) * (P.scalingRatio * pi.w * o.w / FA2_DIST_FLOOR);
                    continue;
                }
                d2 = max(d2, FA2_DIST_FLOOR_SQ);                                  // d >= 0.01
                let k = P.scalingRatio * pi.w * o.w;
                f = f + d * (k / d2);                                             // |F| = k m_i m_j / d along d / d
```

with

```wgsl
                if (d2 < FA2_COINCIDENT_SQ) {                                     // coincident: antisymmetric unit kick of the law's magnitude at d = 0.01 (7.2; PD-10)
                    f = f + kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w);
                    continue;
                }
                if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }               // FA2 alone floors d >= 0.01 (7.2); FR and coulomb are unfloored (7.20)
                let k = P.scalingRatio * pi.w * o.w;
                if (LAW == 0u) { f = f + d * (k / d2); }                          // LAW 0 (FA2): |F| = k m_i m_j / d along d / d
                if (LAW == 1u) { f = f + d * (P.frK * P.frK / d2); }              // LAW 1 (FR, 7.20): |F| = k^2 / d, mass ignored
                if (LAW == 2u) { f = f + d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }   // LAW 2 (coulomb, ngraph generateQuadTree.js:131-132): |F| = -g m_i m_j / d^2
```

The four P3 `find` strings of K3 (0.1) each still occur exactly once: `let k = P.scalingRatio * pi.w * o.w;` unchanged, `f = f + d * (k / d2);` now inside the `LAW == 0u` line, the guard line and the gravity line untouched. Gravity under the new laws is `P.gravity = 0` from the models (PD-12), so `gravity_force` returns zero without a branch. The epilogue (`:59-76`) is unchanged: under `SWING_MODE = 1` (PD-20) it writes partials B from positions and forces, which K5 overwrites under `APPLY = 2` (PD-4) or nobody reads. Update the header comment.

- [ ] **Step 4: K5, `src/wgsl/fa2-integrate.wgsl.ts`**

Replace the guarded block (`:28-42`) with

```wgsl
    var ke = 0.0;
    if (i < P.n) {
        valid = true;
        let f = load_force(i);
        p = pos[i];
        var swing_i = p.w * length(f);                                     // SWING_MODE 1: NetworkX's local swinging m |F| (layout.py line 1497)
        if (SWING_MODE == 0u) { swing_i = p.w * length(f - load_old(i)); }  // paper: m |F(t) - F(t-1)|, recomputed inline (7.2)
        let factor = S.speed / (1.0 + sqrt(S.speed * swing_i));
        let fixed = mask_bit(fixedMask[i >> 5u], i);
        dp = select(f * factor, vec3f(0.0), fixed);                        // APPLY 0 (FA2): no clamp on dp (D25)
        if (APPLY == 1u) {                                                  // APPLY 1 (FR, 7.20): move along F by min(|F|, t); a fixed node stays
            let mag = length(f);
            dp = vec3f(0.0);
            if (mag > 0.0 && !fixed) { dp = f * (min(mag, P.temperature) / mag); }
        }
        if (APPLY == 2u) {                                                  // APPLY 2 (spring-electrical): ngraph's Euler step over the velocity in the oldForce slot (PD-2)
            var v = load_old(i);
            let fd = f - P.dragCoefficient * v;                             // drag (generateCreateDragForce.js:18)
            v = v + (P.timeStep / p.w) * fd;                                 // v += (dt / m) F (generateIntegrator.js:27-29)
            let sp = length(v);
            if (sp > 1.0) { v = v / sp; }                                     // the unit speed clamp (generateIntegrator.js:33-37)
            if (P.dim == 2u) { v.z = 0.0; }
            dp = select(P.timeStep * v, vec3f(0.0), fixed);                  // dp = dt v; a pinned body is skipped (generateIntegrator.js:21, 39-41)
            if (!fixed) { store_old(i, v); }
            ke = select(0.0, 0.5 * p.w * dot(v, v), !fixed);                 // partials B under APPLY 2 (PD-4)
        }
        if (P.dim == 2u) { dp.z = 0.0; }                                   // 2D never integrates z (7.13)
        p = vec4f(p.xyz + dp, p.w);
        pos[i] = p;
        if (SWING_MODE == 0u) { store_old(i, f); }                         // fixed nodes too, so a later unpin sees no stale swing (7.11)
        free = !fixed;
    }
```

(`var ke` is declared BEFORE the `if`, in the uniform part: every lane carries it into the reduction.) The three P3 `find` strings of K5 (0.1) are unchanged and still unique. Then, in the reduction block (`:57-68`), add `let tKe = wg_reduce_f32(ke, lid.x, 0u);` after `let tFr = ...` and, inside `if (lid.x == 0u) { ... }`, after `partials[g].dispFree = vec2f(tDl, f32(tFr));`, add

```wgsl
        if (APPLY == 2u) { partials[g].swingTraction = vec2f(tKe, 0.0); }   // overwrites K3's epilogue: K4 never runs under the preset (PD-4)
```

Under `APPLY = 2` the models compile `SWING_MODE = 1`, so the `store_old(i, f)` line never overwrites the velocity (PD-20). Update the header comment.

- [ ] **Step 5: K1, `src/wgsl/fa2-stats-finalize.wgsl.ts`**

In the fold loop (`:24-33`) add `var ke = 0.0;` beside `var free = 0u;` and `ke = ke + q.swingTraction.x;` inside the loop; after `let tFree = wg_reduce_u32(free, lid.x, 0u);` add `let tKe = wg_reduce_f32(ke, lid.x, 0u);`; and after the three trace writes (`:53-55`), still inside `if (lid.x == 0u) {`, add

```wgsl
        if (STATS_MODE == 1u) {                                    // FR: this iteration's temperature (7.20) into the state and the trace
            S.temperature = P.temperature;
            T[P.iterationIndex].modelScalar = P.temperature;
        }
        if (STATS_MODE == 2u) {                                    // spring-electrical: the kinetic energy K5 folded into partials B (PD-4); 0 on the first iteration after load()
            S.kineticEnergy = tKe;
            T[P.iterationIndex].modelScalar = tKe;
        }
```

The three P3 `find` strings of K1 (0.1) are untouched. Update the header comment.

- [ ] **Step 6: The registry entries and the FA2 model's imports**

In `src/kernels.ts`: K1 (`:349`) `overrideDecls: [{ name: "STATS_MODE", type: "u32", default: 0 }],`; K2 (`:366-370`) append `{ name: "LAW", type: "u32", default: 0 },`; K3 (`:391-395`) append `{ name: "LAW", type: "u32", default: 0 },`; K5 (`:434`) becomes `overrideDecls: [{ name: "SWING_MODE", type: "u32", default: 0 }, { name: "APPLY", type: "u32", default: 0 }],`. Amend each entry's JSDoc line (`:338`, `:356`, `:377`, `:420`) with the axis ("STATS_MODE 0 FA2 / 1 FR temperature / 2 kinetic energy", "LAW 0 FA2 / 1 FR / 2 spring", "LAW 0 FA2 / 1 FR / 2 coulomb", "APPLY 0 FA2 / 1 FR temperature cap / 2 ngraph Euler").

In `src/layouts/forceatlas2.ts`: delete `type Overrides = ...` (`:58`), `FORCE_BYTES_PER_NODE` (`:64`), `FILL_PARAMS_BUFFER` (`:67`), `U32_MODULUS` (`:79`) and the twelve functions of `:96-297`; add

```ts
import {
    describeValue,
    FILL_PARAMS_BUFFER,
    FORCE_BYTES_PER_NODE,
    invalid,
    isPositiveInteger,
    type Overrides,
    pickBoolean,
    pickCenter,
    pickDim,
    pickNumber,
    pickSeed,
    scalar,
    seedWord,
    subset,
    vector,
} from "./model-common.js";
```

beside the other `./` imports (`:44-53`). Nothing else in the file changes (its `paramsFor` lists no P5 field; PD-3).

In `test/helpers/override-matrix.ts` (`:55-62`) add `LAW: [0, 1, 2], APPLY: [0, 1, 2], STATS_MODE: [0, 1, 2],` to `U32_OVERRIDE_VALUES`; set `EXPECTED_CASES_BY_PHASE` to `P1: 53, P3: 61` (P2 and P7 unchanged) and rewrite the comment of `:64-70` with the PD-9 arithmetic. In `test/kernel/wgsl-compile.test.ts:52` ("pins the per-kernel counts of the P1 and P2 entries") change K3's expected count from 9 to 25 (read the assertion; the numbers are literal there).

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/kernel test/layouts/fa2-options.test.ts test/sabotage/coverage.test.ts`
Expected: PASS -- the compile matrix reports 53 + 52 + 61 + 37 = 203 cases on the real device and on `backend=null`, both twins; the bind-group budget is unchanged; `coverage.test.ts` still finds every P1 / P3 `find` string exactly once.

- [ ] **Step 7: FA2 is bitwise unchanged**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts`
Expected: PASS on both. `test/layouts/fa2-inspect.test.ts` and `fa2-twins.test.ts` compare every FA2 stage with the COMMITTED noise fixtures under the committed tolerances, so a change to the `LAW = 0` / `APPLY = 0` / `STATS_MODE = 0` text that moved a bit would surface here (the K5 `ke` reduction and the K1 `ke` accumulator touch no FA2 output). If a fixture comparison fails, the FA2 path was edited, not extended -- fix the body, never re-record.

- [ ] **Step 8: Green check on both adapters and the browser compile matrix**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage && GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js`
Expected: green; coverage at or above 80 / 80 / 75 / 80; the SwiftShader compile-matrix test (`test/browser/compile-matrix.test.ts`) finishes inside the 600 s wrapper (record its wall time in the G5 record; risk R-P5-2).

- [ ] **Step 9: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the FR, coulomb and spring laws and integrators to the kernels` through `tools/commit-changes.sh`. The body records PD-1, PD-2, PD-3, PD-4, PD-9, PD-10.

---

### Task P5-T3: The Fruchterman-Reingold model, its factory and its f64 oracle

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.20 lines 2438-2453 (the FR table and "kernels K1, K2, K3, K5 of 7.4 with a trivial integrate and no K4; `FruchtermanReingoldStats` carry `temperature`"), 7.19 lines 2316-2326 (the hook interface; `onReheat`: "FR: iteration = floor(0.7 * iterations)"), 7.17 lines 2245-2273 (settlement), 7.12 lines 2148-2160 (`fixed`), 3.3 line 873 (`createFruchtermanReingold(ctx, options?: FruchtermanReingoldOptions & GpuLayoutTuning): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>`), 11.4 lines 3551-3555 (the behaviour pins), `CLAUDE.md:404-457` steps 3-6 ("Adding a Layout Model").

**Files:**
- Create: `webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts`, `webgpu-graph-algorithms/test/oracle/fruchterman-reingold.ts`, `webgpu-graph-algorithms/test/layouts/fr-options.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-behaviour.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-properties.test.ts`
- Modify: `webgpu-graph-algorithms/test/oracle/oracles.test.ts` (three hand-computed FR cases, Step 1)
- NOT touched: `src/accelerator.ts`, `src/index.ts`, `test/index.test.ts` (Task P5-T6 owns the surface, PD-19), `test/helpers/fa2-parity.ts` (Task P5-T4)

**Interfaces:**
- Consumes: `ForceSimulation`, `ForceModel`, `BufferSpec`, `ModelInputs`, `ModelResources`, `StateWriter` (`src/layouts/force-simulation.ts:47-126,561`), `FA2_PARAMS` / `FA2_STATE` / `FA2_TRACE` / `FILL_PARAMS` / `graphBindings` / `kernelSpec` (`src/kernels.ts`, as `forceatlas2.ts:34` imports them), `plan1d` (`src/kernel/dispatch.ts`), `resolveLayoutTuning` (`forceatlas2.ts:386-431`, exported), `BufferUsage` (`src/device/webgpu-constants.ts`), `UNIFORM_SLOT_BYTES` (`src/constants.ts`), the fourteen exports of `model-common.ts` (P5-T1), `FR_DEFAULTS` / `FR_START_TEMPERATURE` / `FR_REHEAT_FRACTION` (P5-T1), `kickDir` (`test/oracle/forceatlas2.ts:246`).
- Produces: `resolveFruchtermanReingoldOptions(options, previous?)`, `class FruchtermanReingoldModel implements ForceModel<FruchtermanReingoldOptions, FruchtermanReingoldStats>`, `createFruchtermanReingold(ctx, options?)` exactly as design 3.3 line 873 declares it; `class FruchtermanReingoldOracle` with `step()`, `reheat()`, `positions`, `stages`, `trace`; `fruchtermanReingoldOracle(s, scenePositions, options, iterations)`.

**PLAN DECISION PD-5 (the temperature index).** The simulation hands `paramsFor` the GLOBAL iteration index (`force-simulation.ts:1548-1561`), which `load()` restarts at 0 (`:947`) and `reheat()` does not touch; `onReheat(writer)` has no iteration argument (`:1206`). The model keeps `tempOrigin` (the global index at which the temperature index is 0) and a `pendingReheat` flag: `onLoad` sets `tempOrigin = 0` and clears the flag; `onReheat` sets the flag; the first `paramsFor(global)` after it sets `tempOrigin = global - floor(FR_REHEAT_FRACTION * iterations)` and clears the flag. `paramsFor` is called in submission order (`recordAndSubmit`, `:1341-1344`; `runStages` re-uses the current index without advancing, `:2038-2043`), so the anchor is placed exactly once per reheat, at the first iteration recorded after it -- the same iteration the CPU's `reheat()` (`layout/src/simulation/fruchterman-reingold.ts:378-386`) restarts at. The temperature is `max(0, FR_START_TEMPERATURE - dt * (global - tempOrigin))` with `dt = FR_START_TEMPERATURE / (iterations + 1)`; the clamp is what makes DEP-P5-C harmless: at 0 nothing moves, `meanDisplacement` is 0, and the settle window closes the run.

**PLAN DECISION PD-11 (mass and weights).** FR has no mass and ignores weights (7.20 rows "repulsion" and "attraction"; `layout/src/simulation/fruchterman-reingold.ts:10-12`): `inputs()` returns a `Float32Array(n).fill(1)` and `{ data: null, source: "none", column: null }`, so K2 compiles `HAS_WEIGHTS = false` and K3's `pi.w * o.w` is 1 (unused under `LAW = 1` anyway). `nodeMass` / `weight` are not FR options (`layout/src/simulation/types.ts:40-45`) and a JS caller passing them gets them ignored, as the CPU does.

**PLAN DECISION PD-16 (`setParams({ fixed })`).** `fixed` is resolved at load (PD-6) and `setFixed` is the live API (7.12); a `fixed` patch is `E_INVALID_ARGUMENT { argument: "fixed", hint: "use setFixed(mask); fixed is applied at load()" }`, thrown by the model file's `resolvePatch` callback (Step 3), which `ForceSimulation.setParams` runs before any state moves (`force-simulation.ts:1245`). `k` and `iterations` patches take effect at the next `paramsFor` (a new `dt`, a new `k`) with no recompile (the override set is constant) and the usual `reheat()` the simulation appends (`force-simulation.ts:1259-1260`).

- [ ] **Step 1: The f64 oracle**

Create `$PKG/test/oracle/fruchterman-reingold.ts`: an index-based reference of ONE FR iteration on the exact tier, f64 by default, `precision: "f32"` rounding every operation with `Math.fround` (the `Round` pattern of `test/oracle/forceatlas2.ts:98-99,439`). It is a transcription of the CPU loop `layout/src/simulation/fruchterman-reingold.ts:405-510` (repulsion `k^2 / d` over every unordered pair, attraction `d^2 / k` per CSR arc, the `min(|disp|, t)` cap, the K1 fold) with the two GPU differences stated in the header: the coincident kick of PD-10 (`kickDir(i, j, dim, precision)` from `test/oracle/forceatlas2.ts:246` times `k * k / FA2_DISTANCE_FLOOR`, in place of the CPU's zero force) and the tile summation order of the repulsion (sum over `j` in index order per `i`, as K3's tile loop does, not the CPU's symmetric `u < v` update -- an f64 reference is order-insensitive to 1e-15, and the f32 variant sums in the GPU's order so its noise floor is the GPU's).

```ts
export interface FrOracleOptions {
    readonly precision: "f64" | "f32";
    readonly dim: 2 | 3;
    readonly k: number | null;               // null: 1 / sqrt(n)
    readonly iterations: number;             // the cooling schedule's budget
    readonly settleThreshold: number;
    readonly fixed?: NodeMask | null | undefined;
}
export interface FrOracleStages {
    readonly attraction: Float64Array;       // K2's force (stride 3)
    readonly repulsion: Float64Array;        // K3's addition
    readonly force: Float64Array;            // attraction + repulsion (what K3 leaves in `force`)
    readonly displacement: Float64Array;     // the applied dp (stride 3; 0 on a fixed row)
    readonly partials: { readonly sum: [number, number, number]; readonly sumSq: number; readonly min: [number, number, number]; readonly max: [number, number, number]; readonly maxSq: number; readonly disp: number; readonly free: number };
}
export interface FrOracleTraceRecord extends FruchtermanReingoldTraceRecord {
    readonly rmsRadius: number; readonly layoutRadius: number; readonly centroid: readonly [number, number, number];
}
export class FruchtermanReingoldOracle {
    constructor(s: GraphSnapshot, positions: F32, options: FrOracleOptions);   // layout-unit positions (scale 1, zero centre), rows as given
    readonly positions: Float64Array | Float32Array;
    get stages(): FrOracleStages;
    get trace(): readonly FrOracleTraceRecord[];
    get temperature(): number;               // of the NEXT iteration
    step(): FrOracleTraceRecord;             // K1 fold (of the previous iteration's partials), K2, K3, K5; the record's temperature is this iteration's
    reheat(): void;                          // the temperature index becomes floor(0.7 * iterations), clamped at 0 as the GPU does (PD-5)
    setFixed(mask: NodeMask | null): void;
}
export function fruchtermanReingoldOracle(s: GraphSnapshot, scenePositions: F32, options: FrOracleOptions & { readonly scale?: number; readonly center?: readonly number[] }, iterations: number): { oracle: FruchtermanReingoldOracle; trace: FrOracleTraceRecord[] };
```

The temperature of iteration `it` (0-based since load) is `max(0, 0.1 - it * 0.1 / (iterations + 1))`, the value the GPU's uniform slot carries (PD-5). The K1 fold is the FA2 oracle's (`test/oracle/forceatlas2.ts` `computeFold`): centroid of the new positions, RMS radius and layout radius about the PREVIOUS centroid, mean displacement over free rows, the settle counter against `settleThreshold * rmsRadius`.

Add to `test/oracle/oracles.test.ts` (the pure oracle checks) three hand-computed cases: two nodes at distance 0.5 with `k = 0.5` and no edge repel by `k^2 / d = 0.5` each (with `iterations: 0`, so `t = 0.1` and `dt = 0.1`: the cap is 0.1 and both move 0.1 apart); the same two nodes joined by an edge attract by `d^2 / k = 0.5` net of the repulsion (0.5 - 0.5 = 0: no motion); a fixed row never moves and is excluded from `meanDisplacement`.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/oracles.test.ts`
Expected: PASS (the three cases; no GPU).

- [ ] **Step 2: Write the failing option and behaviour tests**

Create `$PKG/test/layouts/fr-options.test.ts` (mirroring `test/layouts/fa2-options.test.ts`, whose imports at `:13-35` and describe layout the executor copies), each as its own `it`:
1. `resolveFruchtermanReingoldOptions()` with no options equals `{ ...FR_DEFAULTS, center: [0, 0, 0], seed: null }`, frozen;
2. `k: 0` and `k: NaN` resolve to `null` (the CPU's `if (!k)`, `layout/src/simulation/fruchterman-reingold.ts:140-152`); `k: -1` and `k: Infinity` are `E_INVALID_ARGUMENT { argument: "k" }`; `iterations: 0` is accepted (a budget of 0: settled at load); `iterations: 1.5` and `-1` rejected; `fixed: "pinned"` (a string) and a `NodeMask` accepted, `fixed: 7` rejected;
3. a patch over a previous record keeps every unpatched field; `maxInFlight` may not change (the `resolveForceAtlas2Options` rule, `forceatlas2.ts:329-335`);
4. `createFruchtermanReingold(ctx)` returns a simulation in state `"created"` whose `model.kind` is `"fruchtermanReingold"`; its `stats` BEFORE load decodes the writer's header (`force-simulation.ts:793-800`), which the constructor's `reset()` left at zero, so `temperature` reads `0` and `trace` is empty; after `load(karate)` and before any `step()`, `stats.temperature` reads `FR_START_TEMPERATURE` (0.1), because `load()` calls `onLoad(writer)` and uploads `writer.headerBytes()` (`:1871-1872`), the same bytes `stats` decodes while no batch has landed (`:951` cleared the cached value) -- assert through the `ForceSimulation` internals the FA2 options test reaches (`fa2-options.test.ts` imports `ForceSimulation` from its file, `:20`);
5. `setParams({ fixed: mask })` rejects `E_INVALID_ARGUMENT { argument: "fixed" }` (PD-16); `setParams({ k: 0.3 })` and `({ iterations: 10 })` reheat and do not recompile (assert `ctx.pipelines` created no pipeline: compare `ctx.pipelines.size` or the cache's key count before and after, as `fa2-options.test.ts` does for a numeric FA2 tweak);
6. the model's `overrides()` is the constant `{ LINLOG: false, DISTRIBUTED: false, TIER: 0, SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 1, APPLY: 1, STATS_MODE: 1 }` for every option record; its `specs()` names K1, K2, K3, K5, `fa2-to-scene` and `fill` (six specs, no `fa2-speed-finalize`), every one covered by the matrix (`matrixCovers`, `test/helpers/override-matrix.ts:267`);
7. `paramsFor(global)`: with `iterations: 9` (`dt = 0.01`) the temperatures of globals 0, 5, 9, 12 are `0.1`, `0.05`, `0.01`, `0` (clamped) bitwise as f32; after `reheat()` the next `paramsFor(20)` yields the temperature of index `floor(0.7 * 9) = 6`, i.e. `0.04`, and `paramsFor(21)` `0.03`; `frK` is `1 / sqrt(n)` when `k` is null and the option otherwise.

Create `$PKG/test/layouts/fr-behaviour.test.ts` (the 11.4 pins, mirroring `test/layouts/fa2-behaviour.test.ts:36-215`), each its own `it`, every GPU case run twice with `expectBitwiseEqual` on the owner's array first:
1. the empty graph: `load()` and `step()` resolve, settled at once, no GPU work (the `LeakCounter` `mapAsync` count 0), dispose leaves no buffer;
2. a single node never moves (no pair, no arc: every force is zero);
3. two coincident nodes (both seeded at the same position through a finite `positions` array) separate after one iteration (PD-10);
4. `fixed` given as a mask at creation: the pinned row's scene value is bitwise the seeded value after `run({ maxIter: 20 })`, and the OTHER rows are NOT rescaled. This file uses no derived tolerance (P5-T4 records them later) and no literal one (Global Constraints; `CLAUDE.md:450-451`; design 11.9 item 3), so the check is structural, the fact design 13 row P5 names ("output NOT rescaled when `fixed` is given"): run at `scale: 3, center: [10, 20, 0]` from an all-NaN array, so every row is seeded in `[0, 1)` layout units (`src/layouts/seed.ts:164`, the `"fr"` range) and reaches the owner's array as `pos * scale + center` about the origin (`src/wgsl/fa2-to-scene.wgsl.ts`, `let s = pos[i].xyz * P.scale + P.center.xyz`), i.e. x in `[10, 13)` and y in `[20, 23)` at the seed; K5 moves a free row by at most `temperature <= 0.1` layout units per iteration (P5-T2 Step 4: `min(mag, P.temperature)`), so after 20 iterations every free row lies in the box x in `[4, 19]`, y in `[14, 29]`, z `=== 0` -- assert exactly that box on every free row, an analytic bound with no tolerance in it, and that the pinned row is bitwise where the seed put it. A rescale to the `[-1, 1]` box, which the legacy CPU layout applies and 7.18 forbids, leaves every coordinate at or below 1 and misses the bound by more than 3 units on every row. The same fact against the CPU class under the DERIVED tolerance is the scale / center case of `fr-layout-oracle.test.ts` (P5-T4 Step 2). Also `fixed: "pinned"` naming a bool node column with role `"fixed"` (built with `nodes.set(name, mask, { role: "fixed" })` as `layout/src/simulation/fruchterman-reingold.ts:576-606` reads it) pins the same rows; a missing column is `E_INVALID_ARGUMENT`;
5. `iterations` is the budget: `run({ batch: 1 })` stops at exactly `iterations` with `settled` true and `iterationsDone === iterations`; a later `step()` submits nothing;
6. the temperature trace: after `step(5)` the five `stats.trace[i].temperature` are `f32(0.1 - i * dt)` bitwise and `stats.temperature` is the last; after `reheat()` and `step(1)` the record's temperature is `f32(0.1 - floor(0.7 * iterations) * dt)`; after enough further steps the temperature reaches exactly 0 and the run settles within `settleWindow` iterations of it (DEP-P5-C, measured: `iterationsDone` at the stop is at most `ceil(0.3 * iterations) + settleWindow + 1`);
7. two disconnected triangles end up separated by more than 0.03 after 50 iterations; `completeGraph(6)` spreads > 0.3 in width and height (`layout/test`'s pins as `fa2-behaviour.test.ts:102-176` re-expresses them);
8. same seed -> bitwise the same layout on the same device; different seeds -> different;
9. 2D writes `z === center.z` on every readback; a 3D run moves `z`;
10. `stats.repulsionTier` is `"exact"`, `stats.trace` has `k` records after `step(k)`.

Create `$PKG/test/layouts/fr-properties.test.ts` -- the fast-check property rows of `CLAUDE.md:445-451` step 6 for this model, mirroring `test/layouts/fa2-properties.test.ts` (`:68-403`: `numRuns` 200, `CASE_TIMEOUT` 300 s, the `STEPS` / `HALF` sizing by `gpuScale()` at `:41-43`, `bitwiseStableFloat` at `:55-59`; `pinMask`, `startPositions`, `paritySnapshot`, `xyzOf`, `asF32` from `fa2-parity.ts`), on karate with `createFruchtermanReingold(ctx, { seed: 7, iterations: 1_000_000, settleThreshold: 0 })` unless a case says otherwise (a budget of a million keeps the temperature positive through every generated step count; `dt` is then 1e-7 per iteration). No derived tolerance is used anywhere in the file: every assertion is bitwise, an exact count, or an inequality with a stated f32 margin. Each its own `it`, each an `fc.asyncProperty`:
1. fixed nodes never move: a random mask set through `setFixed` between random step counts (`fc.integer({ min: 1, max: STEPS })` before and after) keeps every pinned row bitwise where it was, including the all-fixed mask, which settles within `settleWindow + 1` single-iteration steps; the same property with the mask given as the `fixed` OPTION at creation (PD-6) instead of `setFixed`;
2. `setPosition(i, x, y, z)` with `bitwiseStableFloat` coordinates is visible in the next readback and never clobbered by an older batch (`maxInFlight: 2`, a `step(3)` issued before the write and one after);
3. settled within `maxIter`: for `maxIter` in [1, 30], `run({ maxIter, batch: 1 })` stops at exactly `maxIter` with `stats.iteration === maxIter`; and settled within the FR BUDGET: for `iterations` in [1, 30] (a fresh simulation per draw), `run({ batch: 1 })` stops at exactly `iterations` (behaviour case 5 pins the default; the property draws the budget);
4. reheat on unpin, `setPosition` and `load`, not on pin (D8), and what FR adds to it: after each reheating call the next trace record's temperature is exactly `f32(0.1 - floor(0.7 * iterations) * dt)` (PD-5), after a pin it continues the schedule unbroken; drawn over random rows and random pin / unpin orders;
5. pin A, remove B < A, `load(next)` with the remapped array and a re-issued mask -> A is still fixed (the resize clears the words, spec 7.12; the mask is re-issued through `setFixed` as the FA2 case does);
6. 2D writes `z === center.z` whatever `z` was uploaded, for random `z` and random `center.z`;
7. the FR displacement bound: after one iteration from a random start, every free row's `|dp| <= temperature * (1 + 4 * 2^-24)` (K5 scales `f` by `min(|f|, t) / |f|`, P5-T2 Step 4: the cap is exact up to four f32 roundings) and a row with `|f| < t` moved by exactly `|f|` up to the same margin; the pinned rows moved 0.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/fr-options.test.ts test/layouts/fr-behaviour.test.ts test/layouts/fr-properties.test.ts`
Expected: FAIL (`Cannot find module '../../src/layouts/fruchterman-reingold.js'`).

- [ ] **Step 3: Implement the model and the factory**

Create `$PKG/src/layouts/fruchterman-reingold.ts` following `forceatlas2.ts` member for member (its `BoundModel` record `:436-457`, `bind()` `:612-672`, `recordIteration()` `:720-779`, `dropBound()` `:900-910` are the templates; copy their structure, not their FA2 constants):

```ts
const FR_STAGES = ["K1", "K2", "K3", "K5", "toScene"] as const;
const FR_OVERRIDES: Overrides = Object.freeze({ LINLOG: false, DISTRIBUTED: false, TIER: 0, SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 1, APPLY: 1, STATS_MODE: 1 });

export function resolveFruchtermanReingoldOptions(options: FruchtermanReingoldOptions | undefined, previous?: ResolvedFruchtermanReingoldOptions): ResolvedFruchtermanReingoldOptions;
// k: undefined -> base.k; null / 0 / NaN -> null; else pickNumber("k", ..., (v) => v > 0, "> 0 or null"); iterations: pickNumber(..., (v) => Number.isInteger(v) && v >= 0, "an integer >= 0");
// fixed: undefined -> base.fixed; null | string | a Uint32Array accepted; anything else invalid("fixed", ...); the shared eight fields exactly as resolveForceAtlas2Options resolves them (forceatlas2.ts:356-375), maxInFlight frozen after creation (:329-335)

export class FruchtermanReingoldModel implements ForceModel<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
    readonly kind = "fruchtermanReingold";
    readonly stages = FR_STAGES;
    readonly params = FA2_PARAMS; readonly state = FA2_STATE; readonly trace = FA2_TRACE;
    readonly tuning: ResolvedLayoutTuning;
    private current: ResolvedFruchtermanReingoldOptions;
    private tempOrigin = 0; private pendingReheat = false;       // PD-5
    buffers(n, _dim): the three specs of forceatlas2.ts:521-534 verbatim, with FORCE_BYTES_PER_NODE and FILL_PARAMS_BUFFER imported from ./model-common.js (PD-7), BufferUsage from ../device/webgpu-constants.js and UNIFORM_SLOT_BYTES from ../constants.js:
    //   const bytes = Math.max(1, n) * FORCE_BYTES_PER_NODE;
    //   const usage = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;
    //   return [{ name: "force", byteLength: bytes, usage, zero: true }, { name: "oldForce", byteLength: bytes, usage, zero: true } /* bound, unread: PD-2 */,
    //           { name: FILL_PARAMS_BUFFER, byteLength: UNIFORM_SLOT_BYTES, usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST, zero: false }];
    inputs(s, options): { mass: new Float32Array(n).fill(1), weights: { data: null, source: "none", column: null }, fixed: resolveFixed(s, resolved.fixed) }   // PD-11, PD-6; resolveFixed: a string names a bool node column (E_INVALID_ARGUMENT when absent or not bool), a mask is copied, null takes the role-"fixed" bool column when present else null -- the rule of layout/src/simulation/fruchterman-reingold.ts:576-606 minus its "previous pins" clause, which ForceSimulation.load already implements by keeping the words on a same-size reload
    overrides(_options): FR_OVERRIDES
    specs(overrides, _subgroups): [K1 subset(overrides, { STATS_MODE: 0 }), K2 subset(overrides, { LINLOG, DISTRIBUTED, TIER, USE_PERM, HAS_WEIGHTS, LAW }), K3 subset(overrides, { SWING_MODE, STRONG_GRAVITY, GRAVITY_CENTER, LAW }), K5 subset(overrides, { SWING_MODE, APPLY }), fa2-to-scene, fill]
    bind(resources, overrides): as forceatlas2.ts:612-672 without RepulsionExact -- K3 compiled through pipelines.kernel(kernelSpec("fa2-repulsion-exact", subset(...))) and bound { pos, S: state, force, oldForce, fixedMask: fixed, partials, P: params }; no K4; no oldForce fill (mode 1 never reads it); the force fill when arcCount === 0 as FA2
    paramsFor(global, options): { n, dim, flags: 0, tierStart: 0, tierEnd: n, iterationIndex: global, seed: seedWord(seed), nearMax, scalingRatio: 0, gravity: 0, jitterTolerance: 0, scale, center, settleThreshold, extentFactor, gridMax: 0, levels: 0, pad: [0,0,0,0], frK: k ?? 1 / Math.sqrt(n), temperature: this.temperatureAt(global, resolved) }   // PD-5 anchors here
    recordIteration(batch, slot, tier, upTo?): K1, K2 | fill, K3, K5 in the batch's one pass, toScene in a second (stop indices 0..4 over FR_STAGES); tier "grid" -> E_UNSUPPORTED as forceatlas2.ts:721-726
    onLoad(state): state.set("temperature", FR_START_TEMPERATURE); state.set("kineticEnergy", 0); this.tempOrigin = 0; this.pendingReheat = false;
    onReheat(_state): this.pendingReheat = true;
    onSetParams(patch, _state): this.current = resolveFruchtermanReingoldOptions(patch, this.current)   // the PD-16 fixed check already ran in resolvePatch (below)
    readStats(state, trace): { ...the LayoutStatsBase fields as forceatlas2.ts:850-859, temperature: scalar(header, "temperature"), trace: records of { temperature: modelScalar, meanDisplacement, settledCount } }
}

/** The resolve callback of the simulation's setParams (the shape of forceatlas2.ts:922-924): the patch over the current record, re-validated. */
function resolvePatch(patch: Partial<FruchtermanReingoldOptions>, current: FruchtermanReingoldOptions): FruchtermanReingoldOptions {
    return resolveFruchtermanReingoldOptions(patch, resolveFruchtermanReingoldOptions(current));
}

export function createFruchtermanReingold(ctx: GpuContext, options?: FruchtermanReingoldOptions & GpuLayoutTuning): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
// ctx.assertReady(); resolved = resolveFruchtermanReingoldOptions(options); tuning = resolveLayoutTuning(options); new ForceSimulation(ctx, new FruchtermanReingoldModel(tuning, resolved), resolved, tuning, resolvePatch)   // the five arguments of forceatlas2.ts:937-941
```

`resolvePatch` is module-private, as FA2's is: it names the model's option type. `ForceSimulation.setParams` calls it (`force-simulation.ts:1245`) BEFORE it stores the record, calls `onSetParams` (`:1258`) or reheats (`:1259`), so the PD-16 `fixed` check is its first line -- `if ("fixed" in patch) { throw invalidArgument("fixed", patch.fixed, ...) }` with the hint of PD-16 -- and a rejected patch leaves the simulation unchanged; `resolveFruchtermanReingoldOptions` itself accepts `fixed` (creation needs it).

`temperatureAt(global, resolved)`: if `pendingReheat` then `tempOrigin = global - Math.floor(FR_REHEAT_FRACTION * resolved.iterations)`, clear; `dt = FR_START_TEMPERATURE / (resolved.iterations + 1)`; return `Math.max(0, FR_START_TEMPERATURE - dt * (global - tempOrigin))`. `tierFor` and the `nodeSize` check are FA2's and do not apply (the simulation throws for the grid tier at `force-simulation.ts:889-898` before `inputs()`).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/fr-options.test.ts test/layouts/fr-behaviour.test.ts test/layouts/fr-properties.test.ts`
Expected: PASS, all twenty-four (seven option cases, ten behaviour cases, seven properties). If case 6 of the behaviour file reports the reheated temperature one `dt` off, `pendingReheat` was consumed by a `runStages` or a coalesced call before the batch: the anchor must be set in `paramsFor`, never in `onReheat`.

- [ ] **Step 4: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green on both; coverage still above 80 / 80 / 75 / 80 (`fruchterman-reingold.ts` is reached by the three new suites; its error branches by `fr-options.test.ts`). The property suite's 200-run cases are the long pole on lavapipe (the FA2 file is the precedent); print its wall time for the G5 record's lane-budget row.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the Fruchterman-Reingold model, its factory and its f64 oracle` through `tools/commit-changes.sh`. The body records PD-5, PD-11 and PD-16 and notes that the barrel and the accelerator member land with Task P5-T6.

---

### Task P5-T4: The P5 parity suites and the noise-floor recording

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 13 row P5 gate G5 (`:4212`: "one-iteration displacement parity with the CPU FR oracle (<= 1e-4), fixed nodes immobile"), 11.4 lines 3529-3555 (force parity per stage, trace parity, the behaviour pins), 11.9 items 2-4 (per-kernel inspection; derived tolerances "at most 10x that floor"; run twice), 11.3 (lifecycle: leak 0, `E_RELEASED`, device loss), `CLAUDE.md:445-451` step 6 ("distributional parity (`test/helpers/metrics.ts`)", "the force-sum invariant where the law is antisymmetric", "a noise-floor row and a `tolerances` entry per tolerance (`noiseFloorFor(id)`; never a literal)"), `docs/decisions/G3.md:166-170` (the recording sequence).

**Files:**
- Create: `webgpu-graph-algorithms/test/helpers/fr-parity.ts`, `webgpu-graph-algorithms/test/helpers/se-parity.ts`, `webgpu-graph-algorithms/test/layouts/fr-inspect.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-trace.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-twins.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-layout-oracle.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-lifecycle.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-force-sum.test.ts`, `webgpu-graph-algorithms/test/layouts/fr-distributional.test.ts`, `webgpu-graph-algorithms/test/layouts/se-inspect.test.ts`, `webgpu-graph-algorithms/test/layouts/se-trace.test.ts`, `webgpu-graph-algorithms/test/layouts/se-force-sum.test.ts`, `webgpu-graph-algorithms/test/layouts/se-distributional.test.ts`
- Modify: `webgpu-graph-algorithms/test/helpers/fa2-parity.ts` (three `export` keywords: `readPartials` `:518`, `assertUnitStart` `:878`, `layoutStart` `:893`; nothing else), `webgpu-graph-algorithms/test/noise-floor.test.ts` (the P5 members and the 46 tolerances, Step 3), `webgpu-graph-algorithms/benchmarks/results/noise-floor.json` and `webgpu-graph-algorithms/test/fixtures/noise/*.json` (through the recording run of Step 4, never by hand)
- NOT touched: `test/helpers/sabotage.ts` and `test/sabotage/**` (Task P5-T7), `src/layouts/**` and `test/oracle/**` (P5-T3 / P5-T5: a parity miss here is fixed there, by the task that owns the file, before this task proceeds)

**Interfaces:**
- Consumes: `paritySnapshot`, `startPositions`, `pinIndex`, `pinMask`, `stageError`, `rel`, `maxAbsDiff`, `asF32`, `xyzOf`, `debugStages`, `withSim`-style wrappers (`test/helpers/fa2-parity.ts:158-436`; `withSim` at `:381`, `stageError` at `:848`), `FruchtermanReingoldOracle` / `fruchtermanReingoldOracle` (P5-T3), `SpringElectricalOracle` (P5-T5), `writeNoiseFixture` / `adapterClass` / `noiseFloorFor` / `recordNoiseRow` / `readNoiseFixtures` (`test/helpers/noise-floor.ts:127,243,218,197,150`), `expectBitwiseEqual` (`test/helpers/matchers.ts:65`), `LeakCounter` (`test/helpers/leak-counter.ts:17`), `FruchtermanReingoldSimulation` from `@graphty/layout` (the built barrel, as `test/layouts/fa2-layout-oracle.test.ts:39` imports `ForceAtlas2Simulation`), the `stageRows` / `stageTolerances` helpers of `test/noise-floor.test.ts:158-183`, `distributionalError` / `metricsValues` (`fa2-parity.ts:1602,1554`), `layoutMetrics` (`test/helpers/metrics.ts:296`), `fixture("coincident")` (`test/helpers/graphs.ts:408,492`), `mergeReports` / `ratioOf` / `assertCheckPasses` (`test/helpers/sabotage.ts`).
- Produces: `FR_BASE_OPTIONS`, `createFrSim`, `withFrSim`, `captureFrStages(ctx, s, start, options, mask)`, `FR_STAGE_KEYS`, `FR_STAGE_KERNEL`, `FR_STAGE_TOLERANCE`, `FR_NOISE_FIXTURES`, `frStageReport`, `frTolerance(id)`, `P5_TOLERANCE_CAPS` -- the FR half of what `fa2-parity.ts` is for FA2 -- and their `SE_*` / `se*` twins in `se-parity.ts` with `SE_TOLERANCE_CAPS`; the 46 P5 tolerance ids in `noise-floor.json` and the P5 fixture files.

**PLAN DECISION PD-21 (the suites and the recording are one task).** `noiseFloorFor(id)` throws for an id `noise-floor.json` lacks (`noise-floor.ts:226-230`), and the rows are derived from fixtures the parity suites themselves write. A suite created before its rows exist is therefore either red or guarded, and a guard that a later task deletes is a file two tasks own. So the suites of BOTH models, the noise-floor members and the recording run are one task, in this order: the suites are written asserting (Step 2); they run once in WRITE mode with vitest's `-t` filter selecting only the writer cases (Step 4), so no assertion of a not-yet-derived tolerance runs; `test/noise-floor.test.ts` in write mode derives the rows and tolerances on both adapters; then the suites run in CHECK mode on both adapters and must pass (Step 5). The task depends on P5-T5 because the spring suites need the spring model and its oracle, so it runs after its number; the alternative -- an FR recording in P5-T4 and a spring recording in P5-T5 -- puts `noise-floor.test.ts` and `noise-floor.json` in two tasks.

- [ ] **Step 1: The two parity helpers**

Create `$PKG/test/helpers/fr-parity.ts`:

```ts
export const FR_BASE_OPTIONS: FruchtermanReingoldOptions = Object.freeze({ dim: 2, scale: 1, center: [0, 0, 0], seed: 7, iterations: 50, settleThreshold: 0, settleWindow: 10, iterationsPerStep: 1, maxInFlight: 2 });
export const FR_TUNING: GpuLayoutTuning = Object.freeze({ repulsion: "exact" });
export type FrSim = ForceSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
export type FrStageKey = "attraction" | "force" | "positions" | "displacement" | "partials" | "scene" | "k1";
export const FR_STAGE_KEYS: readonly FrStageKey[];
export const FR_STAGE_KERNEL: Readonly<Record<FrStageKey, KernelId>>;     // attraction K2, force K3, positions / displacement / partials K5, scene fa2-to-scene, k1 fa2-stats-finalize
export const FR_STAGE_TOLERANCE: Readonly<Record<FrStageKey, string>>;    // "fr-inspect.attraction", "fr-force-parity", "fr-inspect.positions", "fr-displacement", "fr-inspect.partials", "fr-inspect.scene", "fr-inspect.k1"
export const FR_NOISE_FIXTURES: Readonly<Record<FrStageKey, { kernel: KernelId; fixture: string }>>;   // fixtures "fr-random1k-K2", "fr-random1k-K3", "fr-random1k-K5", "fr-random1k-K5-disp", "fr-random1k-K5-partials", "fr-random1k-toScene", "fr-random1k-K1"
/**
 * The P5 FR tolerance ids, their spec caps and BASIS ROWS, in the shape of P3_TOLERANCE_CAPS (fa2-parity.ts:589-632):
 * `basis` is the id of a noise ROW of benchmarks/results/noise-floor.json (test/noise-floor.test.ts:454 looks it up,
 * :996-998 throws when it was not recorded), never prose. Caps: design 13 row P5 for the displacement (<= 1e-4); the
 * FA2 caps for the stage kinds it shares (1e-4 per stage, 1e-6 -> here 1e-5 for the twins, 0.1 for the metrics);
 * 1e-3 for the two 10-iteration trajectories (no controller: linear error growth). Every id a noise MEMBER carries
 * (Step 3) also needs the `<id>.cross` cap of its cross-adapter row: stageTolerances(stem, twin) names that
 * tolerance `<stem>.cross` (test/noise-floor.test.ts:163-165) and check() resolves it through limitOf (:544-559),
 * which is capOf in write mode and THROWS for an id the caps table lacks (:441-447) -- the P3 table carries one per
 * member (fa2-parity.ts:592-607,620). The cross caps follow P3: the oracle cap for the stages and the displacement
 * (fa2-force-parity.cross, :592), twice the oracle cap for the trajectories (the triangle-inequality rule of
 * fa2-trace-parity.cross10, :614-616) and 0.2 for the distributional row (fa2-distributional.cross, :620).
 */
export const P5_TOLERANCE_CAPS: Readonly<Record<string, { readonly cap: number; readonly basis: string }>> = Object.freeze({
    "fr-displacement": { cap: 1e-4, basis: "fr-displacement.oracle-f64" },            // G5: one-iteration displacement parity
    "fr-displacement.cross": { cap: 1e-4, basis: "fr-displacement.cross" },
    "fr-force-parity": { cap: 1e-4, basis: "fr-force-parity.oracle-f64" },            // K3's force (design 11.4)
    "fr-force-parity.cross": { cap: 1e-4, basis: "fr-force-parity.cross" },
    "fr-force-sum": { cap: 1e-4, basis: "fr-force-parity.oracle-f64" },               // traced to the force-parity row, as fa2-force-sum is; no member of its own, so no .cross
    "fr-inspect.attraction": { cap: 1e-4, basis: "fr-inspect.attraction.oracle-f64" }, // K2
    "fr-inspect.attraction.cross": { cap: 1e-4, basis: "fr-inspect.attraction.cross" },
    "fr-inspect.positions": { cap: 1e-4, basis: "fr-inspect.positions.oracle-f64" },   // K5 positions
    "fr-inspect.positions.cross": { cap: 1e-4, basis: "fr-inspect.positions.cross" },
    "fr-inspect.partials": { cap: 1e-4, basis: "fr-inspect.partials.oracle-f64" },     // K5 partials
    "fr-inspect.partials.cross": { cap: 1e-4, basis: "fr-inspect.partials.cross" },
    "fr-inspect.scene": { cap: 1e-4, basis: "fr-inspect.scene.oracle-f64" },           // toScene
    "fr-inspect.scene.cross": { cap: 1e-4, basis: "fr-inspect.scene.cross" },
    "fr-inspect.k1": { cap: 1e-4, basis: "fr-inspect.k1.oracle-f64" },                 // the K1 fold and the traced temperature
    "fr-inspect.k1.cross": { cap: 1e-4, basis: "fr-inspect.k1.cross" },
    "fr-trajectory": { cap: 1e-3, basis: "fr-trajectory.oracle-f64" },                 // 10 free-running iterations vs the f64 oracle
    "fr-trajectory.cross": { cap: 2e-3, basis: "fr-trajectory.cross" },               // twice the oracle cap (fa2-trace-parity.cross10's rule)
    "fr-layout-oracle": { cap: 1e-3, basis: "fr-layout-oracle.oracle-f64" },           // 10 iterations vs @graphty/layout's CPU FR (its row's "oracle-f64" class IS the CPU class)
    "fr-layout-oracle.cross": { cap: 2e-3, basis: "fr-layout-oracle.cross" },
    "fr-distributional": { cap: 0.1, basis: "fr-distributional.oracle-f64" },          // layoutMetrics after 100 iterations vs the f64 oracle (design 11.4)
    "fr-distributional.cross": { cap: 0.2, basis: "fr-distributional.cross" },         // as fa2-distributional.cross
    "fr-twins.force": { cap: 1e-5, basis: "fr-twins.force.twin" },                     // design 11.5: the subgroup twin
    "fr-twins.positions": { cap: 1e-5, basis: "fr-twins.positions.twin" },
});
export function createFrSim(ctx, options, tuning): FrSim;
export async function withFrSim<T>(ctx, options, tuning, body: (sim: FrSim) => Promise<T>): Promise<T>;   // dispose in finally
export async function captureFrStages(ctx, s, start: F32, options, mask: NodeMask | null): Promise<FrStageCapture>;
// as captureAllStages (fa2-parity.ts:915-1065) with the FR oracle: run("K2") -> force = attraction; run("K3") -> force; run("K5") -> positions, displacement = positions - start (both xyz), partials; run("toScene") -> scene; one real step(1) then run("K1") -> the state header (k1) whose fields include S.temperature; every read through debugStages(); the expected values from FruchtermanReingoldOracle.stages and its K1 fold, the error through stageError(...) with the 11.4 floored per-node metric for the stride-3 stages and rel() for the scalars
export function frStageReport(capture, key): CheckReport;        // ratioOf(error, frTolerance(FR_STAGE_TOLERANCE[key]).value), the CheckReport shape of sabotage.ts:560
export function frTolerance(id: string): { value: number; basis: string };   // noiseFloorFor(id), then asserts value <= P5_TOLERANCE_CAPS[id].cap (a floor above the cap is a finding, 10.4)
```

`assertUnitStart`, `layoutStart` and `readPartials` come from `fa2-parity.ts` once exported (this task's one edit there): the three are pure and model-agnostic. The `k1` capture reads `S.temperature` through `FA2_STATE.readField(header, "temperature")` and compares it with the oracle's trace record; the `displacement` key is the G5 quantity, computed on both sides as positions after K5 minus the start in layout units, compared with the floored per-node metric (`|dp_gpu - dp_oracle| <= tol * max(|dp_oracle|, 1e-3 * max_j |dp_oracle_j|)`, the 11.4 form).

Create `$PKG/test/helpers/se-parity.ts` as `fr-parity.ts` for the spring model: `SE_BASE_OPTIONS` (`SE_DEFAULTS` plus `seed 7`, `settleThreshold 0`, `iterationsPerStep 1`, `maxInFlight 2`), `SeSim`, `createSeSim`, `withSeSim`, stage keys `attraction` (K2), `force` (K3), `positions` / `velocity` / `displacement` / `partials` (K5; `velocity` is read through `inspect("velocity")`), `scene`, `k1` (with `S.kineticEnergy`), tolerance ids `se-inspect.attraction`, `se-force-parity`, `se-force-sum`, `se-inspect.positions`, `se-inspect.velocity`, `se-displacement`, `se-inspect.partials`, `se-inspect.scene`, `se-inspect.k1`, `se-trajectory`, `se-distributional`, `se-twins.force`, `se-twins.positions` (thirteen) plus the `.cross` id of each of the ten spring members (`se-inspect.attraction.cross`, `se-force-parity.cross`, `se-inspect.positions.cross`, `se-inspect.velocity.cross`, `se-displacement.cross`, `se-inspect.partials.cross`, `se-inspect.scene.cross`, `se-inspect.k1.cross`, `se-trajectory.cross`, `se-distributional.cross`; twenty-three in all), fixtures `se-random1k-K2`, `se-random1k-K3`, `se-random1k-K5`, `se-random1k-K5-velocity`, `se-random1k-K5-disp`, `se-random1k-K5-partials`, `se-random1k-toScene`, `se-random1k-K1`, `se-random1k-traj10`, `se-random1k-metrics100`, `captureSeStages` (as `captureFrStages` with `SpringElectricalOracle.stages`, P5-T5 Step 2), `seStageReport`, and `SE_TOLERANCE_CAPS`, the spring half of the caps in the shape of `P5_TOLERANCE_CAPS` with the same basis-row convention (`<id>.oracle-f64` for the oracle-compared ids, `<id>.twin` for the twins, `se-force-parity.oracle-f64` for `se-force-sum`; 1e-4 for the stages and the displacement, 1e-3 for the trajectory, 0.1 for `se-distributional`, 1e-5 for the twins; the ten `.cross` caps as the FR table's: 1e-4 for the stages, the velocity and the displacement, 2e-3 for the trajectory, 0.2 for the distributional row); `seTolerance(id)` checks `SE_TOLERANCE_CAPS` exactly as `frTolerance(id)` checks `P5_TOLERANCE_CAPS`. The two helpers share nothing but what `fa2-parity.ts` exports; neither imports the other.

Run: `cd $PKG && pnpm exec eslint test/helpers/fr-parity.ts test/helpers/se-parity.ts test/helpers/fa2-parity.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 2: The eleven suites**

`test/layouts/fr-inspect.test.ts` (the `fa2-inspect.test.ts` pattern, `:180-268`): for `karate`, `grid10`, `star200`, `path10`, `random1k` (each at `gpuScale()`), weighted and unweighted (the FR result must be IDENTICAL on both: `HAS_WEIGHTS` never reaches the law), 2D and 3D, `k` null and `k: 0.3`: `captureFrStages` twice, `expectBitwiseEqual` per stage, then `assertCheckPasses(frStageReport(capture, key))` for every key; the pinned case (`pinMask`): the pinned row's force is computed and its displacement is exactly zero, the free count excludes it; the recording case under `GRAPHTY_NOISE_FLOOR_WRITE=1` writes the unscaled `random1k` stages of this adapter and of the f64 oracle as `FR_NOISE_FIXTURES` (through `writeNoiseFixture`, class `adapterClass(ctx.caps)` and `"oracle-f64"`).

`test/layouts/fr-trace.test.ts`: (1) the temperature trace is EXACT: `stats.trace[i].temperature === Math.fround(0.1 - dt * idx)` bitwise over 50 iterations in batches of 1, 5 and 8, before and after a `reheat()` at iteration 20 (idx restarts at `floor(0.7 * iterations)`), and `stats.temperature` equals the last record's; (2) free-running positions after 1, 5 and 10 iterations against the f64 oracle within `frTolerance("fr-trajectory")` (the floored per-node metric), printed at 50 (bitwise run-to-run determinism and finiteness asserted there); (3) `meanDisplacement` / `settledCount` of every trace record equal the oracle's fold within `frTolerance("fr-inspect.k1")`; (4) the recording case writes the 10-iteration positions as fixture `fr-random1k-traj10` (kernel `fa2-integrate`).

`test/layouts/fr-twins.test.ts` (the `fa2-twins.test.ts` pattern, `:1-30`): a second context from `acquire({ subgroups: false })`; the K3 force, the K5 positions and the K1 state of one FR iteration on `random1k` agree with the feature context within `frTolerance("fr-twins.force")` / `("fr-twins.positions")`, bitwise run-to-run on each; the recording case writes the `<class>-no-subgroups` fixtures.

`test/layouts/fr-layout-oracle.test.ts` (the `fa2-layout-oracle.test.ts` pattern, `:1-60`): `@graphty/layout`'s `FruchtermanReingoldSimulation` from the SAME seeded f32 array (`startPositions(..., false)`; layout's `load()` seeds NaN rows itself, so both sides get a finite array), `iterations: 50`, `k` null and `k: 0.3`, on `karate`, `grid10`, `random1k`, `step(1)` at a time: the owner arrays agree within `frTolerance("fr-layout-oracle")` at k = 1, 5, 10 (asserted), printed at 50; the CPU's `temperature` getter equals the GPU trace's temperature bitwise (both are `0.1 - dt * idx` in f64 -> f32; if the CPU's f64 value differs from the f32 uniform by rounding, compare `Math.fround(cpu.temperature)`); with a `fixed` mask on both, the pinned rows are bitwise the seed on both sides at every k; and one scale / center case with the mask, `scale: 3, center: [10, 20, 0]` on karate, where the CPU class writes `layout * scale + center` exactly as the GPU's toScene does (`layout/src/simulation/fruchterman-reingold.ts:15,133-138,512`): the owner arrays agree within `frTolerance("fr-layout-oracle")` at k = 20, the derived-tolerance form of `fr-behaviour.test.ts` case 4's "not rescaled" box. This is the SECOND FR reference (the CPU class is a port of the same loop, `layout/src/simulation/fruchterman-reingold.ts:1-15`): it proves the shell (units, `k` default, `fixed`, the settle fold) agrees, not the formulas' independence, exactly as the FA2 file states of itself (`:6-13`).

`test/layouts/se-inspect.test.ts`, `test/layouts/se-trace.test.ts`: the FR suites above applied to the spring model through `se-parity.ts` (the same five fixtures, both adapters, run twice bitwise, the pinned case where the pinned row's velocity is unchanged and its displacement zero, the writer cases writing the `se-*` fixtures, the free-running trajectory at 1 / 5 / 10 asserted and 50 printed, the kinetic-energy trace against the oracle's within `seTolerance("se-inspect.k1")` ALIGNED BY THE ONE-ITERATION LAG of PD-4: `trace[0].kineticEnergy` after `load()` is exactly 0 (asserted bitwise: the first iteration's K1 folds nothing, `fa2-stats-finalize.wgsl.ts:18,24-33`) and `trace[i].kineticEnergy` for `i >= 1` is compared with the oracle's record `i - 1`; the `k1` stage capture of `se-inspect.test.ts` is the aligned form, because a `step(1)` clears `firstPending` (`force-simulation.ts:1366`) and the following `run("K1")` (`:2041`) folds that step's partials, so the header's `S.kineticEnergy` there IS the oracle's after one `step()`).

`test/layouts/fr-lifecycle.test.ts` (the `fa2-lifecycle.test.ts` pattern, `:29-96`): `dispose()` leaves no live buffer and a `step()` maps at most two staging slots; `release(snapshot)` during a live FR simulation makes the next `step()` reject `E_RELEASED`; device loss mid-run rejects `E_DEVICE_LOST` and disposes; `E_NOT_LOADED` before load; `E_DISPOSED` after dispose; the grid tier is `E_UNSUPPORTED { feature: "repulsion.grid" }` for `repulsion: "grid"`.

`test/layouts/fr-force-sum.test.ts` and `test/layouts/se-force-sum.test.ts` (the `fa2-force-sum.test.ts` pattern, `:1-7,117-160`: `SumCase` rows, `mergeReports`, the worst ratio printed): the force-sum invariant of `CLAUDE.md:445-451` step 6, which applies because all three P5 laws are antisymmetric -- the FR repulsion `k^2 / d` and the coulomb `-g m_i m_j / d^2` are odd in `d` and symmetric in the pair (the mass product commutes), the FR attraction `d^2 / k` and the Hooke spring `k_s (d - L)` act once per arc and the two arcs of an undirected edge are opposite, and the coincident kick is antisymmetric by construction (`kick_dir`, 7.2). For each of `karate`, `grid10`, `star200`, `path10`, `random1k` (at `gpuScale()`) and the coincident fixture (`fixture("coincident")` with its supplied positions, the FA2 file's `positions` column), unpinned, after ONE iteration: the `force` stage (what K3 leaves in `force`: K2's attraction plus K3's repulsion; drag is applied by K5 and is not a pair force, so the stage is antisymmetric for the preset too), `|sum_i F_i| <= tol x sum_i |F_i|` with `tol = frTolerance("fr-force-sum")` / `seTolerance("se-force-sum")`, run twice with `expectBitwiseEqual` first; the pinned variant is NOT a case (a pinned row's force is still computed and still antisymmetric, so it adds nothing). The tolerance is traced to the force-parity basis row exactly as `fa2-force-sum` is (`fa2-parity.ts:593`): no fixture of its own.

`test/layouts/fr-distributional.test.ts` and `test/layouts/se-distributional.test.ts` (the `fa2-distributional.test.ts` pattern, `:1-19,153-270`: the `CASES` table and the two GPU describes): the distributional-parity row of step 6: same seed, 100 iterations, `layoutMetrics` (`test/helpers/metrics.ts:296`) of the GPU layout and of the f64 oracle's layout agree within `frTolerance("fr-distributional")` / `seTolerance("se-distributional")` through `distributionalError` / `metricsValues` (`fa2-parity.ts`, the FA2 file's imports at `:26-41`); coordinates are never compared. FR runs with `iterations: 100` so the cooling schedule spans the run (`dt = 0.1 / 101`; at the default 50 the temperature is 0 from iteration 51 and the last half measures nothing); the preset runs with its defaults. The candidate cases are `karate`, `star200` and `random1k` in 2D and `karate`, `random1k` in 3D, and each is ADMITTED only by the rule `fa2-distributional.test.ts:7-19` records (G3 finding G3-F4): the f64 oracle must reproduce its own metrics within a third of the cap (`0.1 / 3`) under eight one-ulp start perturbations, measured by a case in each file that runs the oracle alone (no GPU; it prints the spread per candidate) and is asserted for the admitted list only. The admitted list is a constant at the top of each file with the measured spreads in its comment, and the G5 record copies them (section 7); a candidate above a third of the cap is left out with its number, never loosened. The `random1k` 2D case of each file is the noise member (fixture `fr-random1k-metrics100` / `se-random1k-metrics100`, kernel `fa2-integrate`, metric `distributional`, written by that file's writer case), so `random1k` in 2D MUST be admitted for the tolerance to exist: if its measured spread exceeds a third of the cap, that is a finding for G5 section 7 and the owner's decision (10.4), and the tolerance is derived from `karate` 2D instead by renaming the member's fixture -- one line in Step 3 -- and saying so in the record.

Every case that writes a fixture is its own `it` whose name ENDS with `(GRAPHTY_NOISE_FLOOR_WRITE=1 only)` -- the `fa2-inspect.test.ts:241` / `fa2-twins.test.ts:277` convention -- so Step 4 can select the writer cases alone with vitest's `-t` filter while no tolerance exists yet. Every assertion of a derived tolerance goes through `frTolerance(id)` / `seTolerance(id)`, never a guard, never a literal: until Step 4 records the rows these suites FAIL in check mode with `no committed tolerance for test id`, which is the expected state between Step 2 and Step 4 of this one task.

Run: `cd $PKG && pnpm exec eslint test/layouts/fr-*.test.ts test/layouts/se-inspect.test.ts test/layouts/se-trace.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: clean (the suites are not run yet).

- [ ] **Step 3: The noise-floor members**

In `test/noise-floor.test.ts`, extend the member table (`:207-305`) with the P5 members, one per fixture Step 2's writer cases write, each built with the file's `stageRows` / `stageTolerances` helpers (`:158-183`): for FR, `fa2-attraction / fr-random1k-K2` -> `fr-inspect.attraction`, `fa2-repulsion-exact / fr-random1k-K3` -> `fr-force-parity` (twin row `fr-twins.force.twin`, tolerance `fr-twins.force`), `fa2-integrate / fr-random1k-K5` -> `fr-inspect.positions` (twin `fr-twins.positions.twin` / `fr-twins.positions`), `fa2-integrate / fr-random1k-K5-disp` -> `fr-displacement`, `fa2-integrate / fr-random1k-K5-partials` -> `fr-inspect.partials`, `fa2-to-scene / fr-random1k-toScene` -> `fr-inspect.scene`, `fa2-stats-finalize / fr-random1k-K1` -> `fr-inspect.k1`, `fa2-integrate / fr-random1k-traj10` -> `fr-trajectory`, `fa2-integrate / fr-karate-layout10` -> `fr-layout-oracle` (the `oracle-f64` class here is layout's CPU class, written by `fr-layout-oracle.test.ts`'s writer case); `fa2-integrate / fr-random1k-metrics100` -> `fr-distributional` (metric `distributional`, the `metrics100` member's shape at `:297-303`: no twin row, an `oracle-f64` row only); for the spring model the `se-*` twins of each (`se-random1k-K2` -> `se-inspect.attraction`, ..., `se-random1k-traj10` -> `se-trajectory`, `se-random1k-metrics100` -> `se-distributional`, `se-twins.force` / `se-twins.positions`) plus `fa2-integrate / se-random1k-K5-velocity` -> `se-inspect.velocity` and minus a layout-oracle row (the design's 9.3 table has no CPU spring simulation, `:3046`). Two ids per model have NO member of their own: `fr-force-sum` and `se-force-sum` are cap entries whose basis is the force-parity row (`fr-force-parity.oracle-f64` / `se-force-parity.oracle-f64`), exactly as `fa2-force-sum` rides `fa2-force-parity.oracle-f64` (`fa2-parity.ts:593`). Every member's cross-adapter tolerance id is `<stem>.cross` (`stageTolerances`, `:163-165`; the `metrics100` shape names it explicitly, `:299-300`), and `check()` resolves it through `limitOf` (`:544-559`) -- `capOf` in write mode, which throws `no cap in TOLERANCE_CAPS` for an id the spread tables lack (`:441-447`), `noiseFloorFor` in check mode -- so each of the twenty members needs the `.cross` cap the Step 1 tables carry. Twenty-three `fr-*` and twenty-three `se-*` tolerance ids, 46 in all (13 + 13 oracle / twin / force-sum ids and 10 + 10 `.cross` ids), over ten FR and ten spring fixtures. Every derived tolerance is `min(10 * floor, cap)` where the cap and the basis row come from `P5_TOLERANCE_CAPS` / `SE_TOLERANCE_CAPS` (Step 1); the file's existing derivation does exactly that with `P3_TOLERANCE_CAPS` spread into `TOLERANCE_CAPS` (`:374-381`) -- spread the two P5 tables in the same way.

Run: `cd $PKG && pnpm exec eslint test/noise-floor.test.ts && pnpm exec vitest run --project=node test/noise-floor.test.ts`
Expected: the read-only validation FAILS on the 20 new members (`the <class> fixture is missing`, `:909`), which Step 4 records. Nothing else in the file changes state.

- [ ] **Step 4: The recording run (the G3 sequence)**

From `$PKG`, logging to `tmp/p5/`. The first two commands run ONLY the writer cases (`-t` is vitest's test-name filter; every writer case's name carries the string), so no tolerance is asserted before it exists:

```bash
mkdir -p tmp/p5
W='GRAPHTY_NOISE_FLOOR_WRITE=1'
SUITES='test/layouts/fr-inspect.test.ts test/layouts/fr-trace.test.ts test/layouts/fr-twins.test.ts test/layouts/fr-layout-oracle.test.ts test/layouts/fr-distributional.test.ts test/layouts/se-inspect.test.ts test/layouts/se-trace.test.ts test/layouts/se-distributional.test.ts'
eval $GPU_NV $W pnpm exec vitest run --project=node -t 'GRAPHTY_NOISE_FLOOR_WRITE=1 only' $SUITES 2>&1 | tee tmp/p5/write-nvidia.log
eval $GPU_LLVM $W pnpm exec vitest run --project=node -t 'GRAPHTY_NOISE_FLOOR_WRITE=1 only' $SUITES 2>&1 | tee tmp/p5/write-lavapipe.log
eval $GPU_NV $W pnpm exec vitest run --project=node test/noise-floor.test.ts 2>&1 | tee tmp/p5/floor-nvidia.log
eval $GPU_LLVM $W pnpm exec vitest run --project=node test/noise-floor.test.ts 2>&1 | tee tmp/p5/floor-lavapipe.log
pnpm exec prettier --write test/fixtures/noise benchmarks/results/noise-floor.json
```

Expected: the two writer runs report only the writer cases (the rest `skipped` by the filter) and all of them passed; `ls test/fixtures/noise | grep -c -- '-fr-\|-se-'` >= 60 (the files are named `<kernel>-<fixture>-<class>.json`, `noise-floor.ts:3`, so the P5 ones carry `-fr-` / `-se-` in the middle: ten FR and ten spring fixtures x three classes -- the two adapters and the oracle -- plus the `-no-subgroups` twin files); `node -e "const d=require('./benchmarks/results/noise-floor.json'); console.log(Object.keys(d.tolerances).filter(k=>/^(fr|se)-/.test(k)).length)"` -> `46` (twenty of them `.cross`); the two distributional writer runs also printed the oracle's own spread per candidate case (Step 2), copied into the G5 record; every value under its cap (the derivation throws otherwise: a floor above a cap is a finding for the G5 record, never a loosened cap -- and, because the fixtures are the GPU's and the oracle's raw outputs, a floor above the cap here means the model or the oracle is wrong (P5-T3 / P5-T5 own them); do not proceed with a loosened tolerance).

- [ ] **Step 5: Check mode on both adapters**

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts/fr-inspect.test.ts test/layouts/fr-trace.test.ts test/layouts/fr-twins.test.ts test/layouts/fr-layout-oracle.test.ts test/layouts/fr-lifecycle.test.ts test/layouts/fr-force-sum.test.ts test/layouts/fr-distributional.test.ts test/layouts/se-inspect.test.ts test/layouts/se-trace.test.ts test/layouts/se-force-sum.test.ts test/layouts/se-distributional.test.ts test/noise-floor.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/fr-*.test.ts test/layouts/se-inspect.test.ts test/layouts/se-trace.test.ts test/layouts/se-force-sum.test.ts test/layouts/se-distributional.test.ts test/noise-floor.test.ts`
Expected: PASS on both adapters, every stage within its derived tolerance, the four force-sum / distributional files printing their worst ratios, with the `[fr-inspect] .../<stage>: error <e>` and `[se-inspect]` lines printed; every printed error on NVIDIA is below `1e-5` for the stride-3 stages and the displacement (the Coulomb law is a single division and a multiply per pair; the velocity update is three fused operations: no cancellation, so the f32 noise is at the 1e-7 level), and lavapipe's `force` and `attraction` errors are bitwise identical to NVIDIA's for `karate` (the FA2 precedent, `CLAUDE.md:333`).

- [ ] **Step 6: Green check**

Run: `cd $PKG && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; coverage at or above 80 / 80 / 75 / 80.

- [ ] **Step 7: Commit (owner)** -- `test(webgpu-graph-algorithms): add the P5 parity suites and record their noise floors` through `tools/commit-changes.sh`. The body records PD-21, the fixture and tolerance counts, and the worst stage error per model on each adapter.

---

### Task P5-T5: The spring-electrical preset and its ngraph-checked oracle

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 7.20 lines 2455-2471 (the preset: Coulomb `1/d^2` repulsion, Hooke springs, drag, a velocity integrator, ngraph's option names and defaults, `SpringElectricalStats.kineticEnergy`; routing is Q-9's), 9.3 line 3016 (`SpringElectricalOptions`), 9.3 table row `"spring-electrical"` (`:3046`: no CPU simulation in v1), 3.3 line 874 (`createSpringElectrical(ctx, options?: SpringElectricalOptions & GpuLayoutTuning)`), 13 row P5 gate G5 (`:4212`: "the preset settles within 1,000 steps on the 150-node / 250-edge 'Performance/Large Graph' story graph to an edge-length distribution within 25% of ngraph's (ngraph run on the CPU in the test, devDependency of the test only)"), 11.4 line 3508-3528 (oracle independence: the oracle is checked against an independent, widely used implementation).

**Files:**
- Modify: `webgpu-graph-algorithms/package.json` (two devDependencies) and `pnpm-lock.yaml` (through `pnpm add`, never by hand)
- Create: `webgpu-graph-algorithms/src/layouts/spring-electrical.ts`, `webgpu-graph-algorithms/test/oracle/spring-electrical.ts`, `webgpu-graph-algorithms/test/oracle/spring-electrical-ngraph.test.ts`, `webgpu-graph-algorithms/test/helpers/story-graph.ts`, `webgpu-graph-algorithms/test/layouts/se-options.test.ts`, `webgpu-graph-algorithms/test/layouts/se-behaviour.test.ts`, `webgpu-graph-algorithms/test/layouts/se-properties.test.ts`, `webgpu-graph-algorithms/test/layouts/se-settle.test.ts`
- NOT touched: `src/accelerator.ts`, `src/index.ts`, `test/index.test.ts` (P5-T6), `test/helpers/fa2-parity.ts`, `test/helpers/se-parity.ts`, `test/layouts/se-inspect.test.ts`, `test/layouts/se-trace.test.ts`, `test/layouts/se-force-sum.test.ts`, `test/layouts/se-distributional.test.ts`, `test/noise-floor.test.ts` (P5-T4: the spring parity, force-sum and distributional suites and every derived spring tolerance land there, after this task), the workspace root's `$WT/knip.config.ts` (the two packages are imported by two test files, which its `test/**/*.test.ts` entry covers, `$WT/knip.config.ts:59`; the package has no knip config of its own)

**Interfaces:**
- Consumes: everything P5-T3 consumes, plus `SE_DEFAULTS` (P5-T1), `s.outDegree()` (graph-format), `createLayout` from `ngraph.forcelayout` and `createGraph` from `ngraph.graph` (test only), `edgeLengthQuantiles` / `layoutMetrics` (`test/helpers/metrics.ts:184,296`).
- Produces: `resolveSpringElectricalOptions(options, previous?)`, `class SpringElectricalModel implements ForceModel<SpringElectricalOptions, SpringElectricalStats>`, `createSpringElectrical(ctx, options?)` exactly as design 3.3 line 874 declares it; `class SpringElectricalOracle` with `stages` (`attraction`, `repulsion`, `force`, `velocity`, `displacement`, `partials`) and `stats`; `storyGraph()` / `storyEdges()` (the 150 / 250 graph).

**PLAN DECISION PD-12 (`gravity` is the Coulomb constant).** `SpringElectricalOptions.gravity` is ngraph's name for the Coulomb coefficient, default -12, negative = repulsive (`layout/src/simulation/types.ts:48-54`; `createPhysicsSimulator.js:40`). `Fa2Params.gravity` is FA2's centre gravity, read by K3's `gravity_force` (`fa2-repulsion-exact.wgsl.ts:21-28`). The model writes the option into `Fa2Params.coulomb` and `0` into `Fa2Params.gravity`, so K3's `LAW = 2` branch reads `-P.coulomb * m_i * m_j / d^3` and the centre pull is zero: ngraph has no centre gravity.

**PLAN DECISION PD-13 (ngraph as a test devDependency).** The gate says "ngraph run on the CPU in the test, devDependency of the test only". `ngraph.forcelayout@^3.3.1` and `ngraph.graph@^20.0.1` -- the ranges graphty-element pins (`graphty-element/package.json:171-172`), so the workspace resolves ONE copy -- go into the GPU package's `devDependencies`; `src/` never imports them (`eslint.config.js:24-28` bans the CPU packages in `src/`; ngraph is not banned by name and is imported by no `src/` file, which `test/layers.test.ts`'s import walk of `src/` proves). Both ship types (`ngraph.forcelayout/index.d.ts`, `ngraph.graph/index.d.ts:203` default-exports `createGraph`); `tsconfig.base.json:8` has `esModuleInterop`, so `import createLayout from "ngraph.forcelayout"` and `import createGraph from "ngraph.graph"` compile.

**PLAN DECISION PD-14 (how ngraph is compared).** Two comparisons, two configurations. (a) The oracle cross-check runs ngraph with `theta: 0` -- `generateQuadTree.js:148` treats an internal node as one body only when `(max - min) / r < theta`, never with 0, so the tree walks to every leaf and the force is the exact all-pairs sum -- and with every body's position set through `layout.setNodePosition(id, x, y)` (`index.js:84`) to the oracle's start, so the two f64 implementations differ only by summation order: the bound is analytic (1e-9 relative), no noise floor. ngraph seeds its RNG once (`createPhysicsSimulator.js:103`) and draws from it only on a zero distance (`generateQuadTree.js:123-127`, `generateCreateSpringForce.js:28-31`), which distinct positions never trigger. (b) The G5 distribution comparison runs ngraph with its DEFAULTS (theta 0.8, its own placement of new bodies at `getBestNewPosition`, `generateBounds.js:27-45`) until `layout.step()` returns true (`index.js:47-67`) or 1,000 steps, and the GPU preset from the FA2 seed range until `settled` or 1,000 iterations; the edge-length quantiles q10 / q50 / q90 (`edgeLengthQuantiles`, `metrics.ts:184`) of the two final layouts agree within 25%, the gate's number.

**PLAN DECISION PD-15 (the seed range).** `ForceSimulation.load()` seeds by kind (`force-simulation.ts:975-976`): the preset gets the `"fa2"` branch, [-1, 1) per axis. ngraph places a body at its neighbours' mean plus a `(random - 0.5) * springLength` offset (`generateBounds.js:41-44`); neither start survives the first steps under `gravity -12` with a unit speed clamp, and the comparison is distributional (PD-14b), so the ranges need not match.

- [ ] **Step 1: The devDependencies**

Run: `cd $PKG && pnpm add -D 'ngraph.forcelayout@^3.3.1' 'ngraph.graph@^20.0.1'`
Expected: `package.json` gains the two lines under `devDependencies` (alphabetical: after `fast-check`), `pnpm-lock.yaml` records them resolved to the SAME versions graphty-element's importer entry holds (`grep -n 'ngraph.forcelayout@' $WT/pnpm-lock.yaml` shows one resolution). `cd $WT && pnpm exec knip` may report both unused until Step 3's test files import them; that is expected inside this task.

- [ ] **Step 2: The oracle and the story graph**

Create `$PKG/test/helpers/story-graph.ts`: `storyEdges(): readonly [number, number][]` -- the 150-node / 250-edge graph of `graphty-element/stories/PerformanceTest.stories.ts:15-57`, transcribed: the LCG `seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff` from 42, one edge per node first (`dst` redrawn while equal to `i`), then random pairs until 250 distinct ORDERED keys `${src}-${dst}` (`:31,44`), self-loops skipped; then, as the LAST step, the 250 ordered pairs are deduplicated on the UNORDERED pair (`a < b ? [a, b] : [b, a]`, first occurrence kept), which for seed 42 drops exactly one reversed duplicate and returns 249 pairs (0.1: `edges 250 unordered 249 reversed dups 1`; a test in `se-settle.test.ts` pins `storyEdges().length === 249`). `storyGraph(): GraphSnapshot` is `snapshotOf(storyEdges(), { nodeCount: 150 })` (undirected: both arcs, 498). Both sides of the G5 comparison consume the SAME 249 pairs: the snapshot carries no multi-arc and ngraph's `addLink` receives each pair once, so `outDegree`-based masses, spring counts and the "each undirected edge once" rule of `edgeLengthQuantiles` (`metrics.ts:184`) mean the same thing on both sides. (`ngraph.graph` keys a link by the ORDERED pair -- `makeLinkId` is `fromId + separator + toId`, `graphty-element/node_modules/ngraph.graph/index.js:589-591` -- so handed the raw 250 it would hold two links on that pair while the snapshot held two arcs per direction; the dedupe removes the question rather than arguing which count is right.) (The story's `& 0x7fffffff` is a bitwise operator on a SEED, not on an index or a byte offset; the house rule does not cover it, and the transcription must be exact to reproduce the graph.)

Create `$PKG/test/oracle/spring-electrical.ts`: `class SpringElectricalOracle` over the snapshot in f64 (an f32 variant as the FR oracle): per iteration, for every free node `i` (a pinned node keeps its force and velocity, `createPhysicsSimulator.js:350-354`, `generateIntegrator.js:21`): `F_i = sum_j coulomb * m_i m_j / r^3 * (p_j - p_i)` over every `j != i` (the coincident kick of PD-10 at `r^2 < FA2_COINCIDENT_SQ`), `F_i -= drag * v_i`, then per CSR arc `(i, j)`: `F_i += springCoefficient * (r - springLength) / r * (p_j - p_i)` (each arc moves its own row: the two arcs of an undirected edge are ngraph's `body1 +=` / `body2 -=` of `generateCreateSpringForce.js:36-40`; `r` floored at `FA2_DISTANCE_FLOOR` as K2 does); integrate `v += (dt / m) F; if |v| > 1: v /= |v|; p += dt v` (`generateIntegrator.js:27-41`); `kineticEnergy = 0.5 * sum_free m |v|^2`; the K1 fold as the FR oracle. Stages: `attraction` (springs only, K2), `repulsion` (coulomb, K3's addition), `force` (their sum, what K3 leaves), `velocity` (after the update), `displacement` (`dt v` or 0), `partials`. Mass `1 + outDegree / 3` (`index.js:391-395`). `step()` returns `{ kineticEnergy, meanDisplacement, settledCount, rmsRadius, layoutRadius, centroid }`, where `kineticEnergy` is THIS iteration's (after its integrate); the GPU's trace record and `S.kineticEnergy` lag it by one iteration (PD-4: the first record after `load()` is 0, record `i` is the oracle's `i - 1`), and every comparison against the GPU states which record it aligns with (P5-T4 Step 2, `se-trace.test.ts`).

Create `$PKG/test/oracle/spring-electrical-ngraph.test.ts` (node project, no GPU): on `karate` and `storyGraph()` with seeded distinct starts, build the ngraph graph (`createGraph()`, `addLink(a, b)` per undirected edge ONCE -- ngraph makes one spring per link and one body per node; `graph.getLinks(id).size` then equals the CSR degree so the masses agree), `createLayout(graph, { dimensions: 2, theta: 0, springLength: 10, springCoefficient: 0.8, gravity: -12, dragCoefficient: 0.9, timeStep: 0.5 })`, `setNodePosition` every body to the start, `layout.step()` once, read `getNodePosition` (`index.js:73`); the oracle from the same start, `step()` once; positions agree within 1e-9 relative (floored at 1e-12 absolute) on every node, and `oracle.stats.kineticEnergy` equals `0.5 * sum m |v|^2` computed from ngraph's `forEachBody` velocities (`index.js:116`) within 1e-9. Five iterations likewise. (ngraph's `step()` also returns the stability flag; assert it is `false` after one step on karate.) A second `it` pins the numbers ngraph itself produces on a three-node path with hand-computed forces, so a silently different ngraph version is caught.

Run: `cd $PKG && pnpm exec vitest run --project=node test/oracle/spring-electrical-ngraph.test.ts`
Expected: PASS (the oracle transcribes ngraph; a mismatch here is a transcription error, found before any WGSL is blamed).

- [ ] **Step 3: Write the failing option, behaviour and settle tests**

`test/layouts/se-options.test.ts` (as `fr-options.test.ts`): the defaults equal `SE_DEFAULTS` plus `center [0,0,0]`, `seed null`; `springLength <= 0`, `springCoefficient <= 0`, `dragCoefficient < 0`, `timeStep <= 0` and a non-finite `gravity` are `E_INVALID_ARGUMENT` with the argument named (a POSITIVE `gravity` is accepted: ngraph's comment "if you make it positive nodes start attract each other", `createPhysicsSimulator.js:38-39`); the override set is the constant `{ LINLOG: false, DISTRIBUTED: false, TIER: 0, SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 2, APPLY: 2, STATS_MODE: 2 }`; `specs()` names the six specs and the matrix covers them; `paramsFor` writes `coulomb: gravity`, `gravity: 0`, the four others, and `frK: 0`; a numeric `setParams` patch recompiles nothing and reheats; `inputs().mass[i] === 1 + degree_i / 3` on karate (node 33 has degree 17: mass `1 + 17 / 3`).

`test/layouts/se-behaviour.test.ts`: the empty graph; a single node never moves; two coincident nodes separate (PD-10); a pinned node (`setFixed`) is immobile across 20 iterations while its neighbours move; `stats.kineticEnergy` is 0 before the first batch AND still 0 after `step(1)` on karate (`trace[0].kineticEnergy === 0`: K1 folds the PREVIOUS iteration's partials B and the first iteration after `load()` folds nothing, PD-4, `fa2-stats-finalize.wgsl.ts:18,24-33`), positive after `step(2)` (`trace[1].kineticEnergy > 0`, the energy of iteration 0's integrate, and `stats.kineticEnergy` equals it), and every `trace[i].kineticEnergy` is finite and non-negative; a `setPosition` during a run is honoured and the velocity of the dragged node is NOT reset (assert through `inspect("velocity")` under `ctx.debug.inspect`: the row is unchanged by `setPosition`); the velocity buffer is named `velocity` (`inspect("velocity")` resolves; `inspect("oldForce")` is `E_INVALID_ARGUMENT` on this model); 2D writes `z === center.z`; same seed -> bitwise the same; the grid tier is `E_UNSUPPORTED`.

`test/layouts/se-properties.test.ts` (the property rows of `CLAUDE.md:445-451` step 6 for the preset, the shape of `fr-properties.test.ts`, P5-T3 Step 2, over `createSpringElectrical(ctx, { seed: 7, settleThreshold: 0 })` on karate; no derived tolerance anywhere in the file), each an `fc.asyncProperty` with `numRuns` 200: (1) fixed nodes never move under random masks set between random step counts, the all-fixed mask settles within `settleWindow + 1` single-iteration steps, and a pinned row's `velocity` (through `inspect("velocity")` under `ctx.debug.inspect`) is bitwise unchanged across the steps; (2) `setPosition` visible in the next readback and never clobbered by an older batch, and the dragged row's velocity is NOT reset by the call (the spring analogue of "speed is not reset", `fa2-properties.test.ts:242-243`); (3) settled within `maxIter` for `maxIter` in [1, 30] with `stats.iteration === maxIter`; (4) reheat on unpin, `setPosition` and `load`, not on pin (the simulation's rule; the model's `onReheat` is empty, so the velocities are bitwise unchanged across a reheat -- asserted through `inspect("velocity")`); (5) pin A, remove B < A, `load(next)` with the remapped array and a re-issued mask -> A still fixed; (6) 2D writes `z === center.z` for random `z` and random `center.z`; (7) the speed clamp: after one iteration from a random start every free row's `|dp| <= timeStep * (1 + 4 * 2^-24)` (K5's `dp = dt v` with `|v| <= 1` after the clamp, P5-T2 Step 4) and every row of `inspect("velocity")` has `|v| <= 1 + 2^-23`.

`test/layouts/se-settle.test.ts` (the G5 item, both adapters at full size -- 150 nodes is under any `gpuScale`): (0) `storyEdges().length === 249` and `storyGraph().nodeCount === 150` (the unordered-pair dedupe of Step 2); (1) `createSpringElectrical(ctx, { seed: 42, maxInFlight: 1 })` on `storyGraph()`: `await sim.run({ maxIter: 1000, batch: 8 })`; assert `sim.settled`, `sim.iterationsDone < 1000` (the shared rule fired before the budget: DEP-P5-A) and `stats.trace` ends with `settledCount >= 10`; (2) ngraph with its defaults on the same graph from its own placement: `layout.step()` until it returns `true` or 1,000 steps; (3) `edgeLengthQuantiles` q10 / q50 / q90 of both final layouts (the GPU's owner array, ngraph's `getNodePosition`) agree within 25% relative (`rel(gpu, ngraph, 1e-3) <= 0.25` per quantile, `fa2-parity.ts:570`); print all six numbers and both stop counts; (4) the same run twice is bitwise identical; (5) `stats.kineticEnergy` at the stop is below its value after the first batch by at least 100x (the system did come to rest). Record the printed numbers in the G5 record (P5-T11 section 3).

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/se-options.test.ts test/layouts/se-behaviour.test.ts test/layouts/se-properties.test.ts test/layouts/se-settle.test.ts`
Expected: FAIL (`Cannot find module '../../src/layouts/spring-electrical.js'`).

- [ ] **Step 4: Implement the model and the factory**

Create `$PKG/src/layouts/spring-electrical.ts` as `fruchterman-reingold.ts` (P5-T3 Step 3) with these differences:

```ts
const SE_STAGES = ["K1", "K2", "K3", "K5", "toScene"] as const;
const SE_OVERRIDES: Overrides = Object.freeze({ LINLOG: false, DISTRIBUTED: false, TIER: 0, SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 2, APPLY: 2, STATS_MODE: 2 });
export function resolveSpringElectricalOptions(options, previous?): ResolvedSpringElectricalOptions;   // springLength > 0, springCoefficient > 0, dragCoefficient >= 0, timeStep > 0, gravity finite; the shared eight as FR
export class SpringElectricalModel implements ForceModel<SpringElectricalOptions, SpringElectricalStats> {
    readonly kind = "springElectrical";
    buffers(n, _dim): [force 12n zero, velocity 12n zero, fillParams]                 // PD-2: "velocity", bound into the oldForce slots
    inputs(s, _options): { mass: massOf(s), weights: none }                           // PD-11: 1 + outDegree / 3; no fixed
    bind(): K3 bound { ..., oldForce: resources.buffer("velocity"), ... }, K5 bound { ..., oldForce: resources.buffer("velocity"), ... }
    paramsFor(global, options): { ...the shared fields, scalingRatio: 0, gravity: 0, jitterTolerance: 0, frK: 0, temperature: 0, springLength, springCoefficient, coulomb: resolved.gravity, dragCoefficient, timeStep }   // PD-12
    onLoad(state): state.set("kineticEnergy", 0); state.set("temperature", 0);
    onReheat(): nothing (the velocities carry on: ngraph has no reheat; a drag lands in the next batch through the override list, 7.12)
    onSetParams(patch): this.current = resolveSpringElectricalOptions(patch, this.current)
    readStats(): { ...base, kineticEnergy: scalar(header, "kineticEnergy"), trace: records of { kineticEnergy: modelScalar, meanDisplacement, settledCount } }
}
export function createSpringElectrical(ctx: GpuContext, options?: SpringElectricalOptions & GpuLayoutTuning): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;
```

`massOf(s)`: `const d = s.outDegree(); out[i] = 1 + d[i] / 3` (undirected snapshot: `outDegree` is the degree; `inputs.ts:58-66` is the same loop for `+ 1`). The `velocity` spec is `zero: true` with `COPY_DST`, so `allocate()` / `clearKept()` (`force-simulation.ts:1665-1751`) start every load at rest.

Run: `cd $PKG && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/se-options.test.ts test/layouts/se-behaviour.test.ts test/layouts/se-properties.test.ts test/layouts/se-settle.test.ts && eval $GPU_NV pnpm exec vitest run --project=node test/layouts/se-settle.test.ts`
Expected: PASS on both. If `se-settle` does not settle within 1,000 iterations, print `stats.meanDisplacement / stats.rmsRadius` per batch first: a preset that oscillates at the clamp (`|v| = 1` every step) has `dragCoefficient` applied AFTER the clamp instead of before it (Step 4 of P5-T2: the drag enters `fd` before the velocity update, as ngraph's does). If the quantiles miss 25%, compare the oracle's 1,000-step layout with ngraph's first (Step 2's file at 1,000 steps): the two f64 implementations must agree distributionally before the GPU is blamed.

**PLAN DECISION PD-20 (`SWING_MODE = 1` frees the `oldForce` slot).** K5 stores the iteration's force into `oldForce` only under `SWING_MODE == 0u` (`fa2-integrate.wgsl.ts:32-40`: `if (SWING_MODE == 0u) { store_old(i, f); }`), and K3 reads the slot only in the same mode (`fa2-repulsion-exact.wgsl.ts:66-73`: `load_old(i)` sits in the `else` of `if (SWING_MODE == 1u)`; the paper swing needs `F(t-1)`); under mode 1 the swing is computed from the position and the new force inline and the slot is never read or written by the FA2 text. Both P5 models therefore compile `SWING_MODE = 1`: the spring model binds its `velocity` buffer into K3's and K5's `oldForce` slot (PD-2) and only the `APPLY == 2u` block touches it, so the velocity survives from one iteration to the next; the FR model binds a zeroed `oldForce` it never reads. K3's epilogue still writes partials B (`swingTraction`) from the mode-1 swing; under the spring model K5 overwrites it with the kinetic energy in the same pass (PD-4), and under FR nobody reads it (K4 never runs). Compiling mode 0 instead would make `store_old(i, f)` clobber the velocity every iteration -- `se-options.test.ts` pins the override set and the `euler-velocity-not-stored` sabotage row (P5-T7) proves the stored value is what the next iteration reads.

- [ ] **Step 5: Green check on both adapters**

Run: `cd $PKG && pnpm run build:all && pnpm run lint && (cd $WT && pnpm exec knip) && eval $GPU_NV pnpm exec vitest run --project=node && eval $GPU_LLVM pnpm exec vitest run --project=node --coverage`
Expected: green; knip clean (the two devDependencies are imported by `test/oracle/spring-electrical-ngraph.test.ts` and `test/layouts/se-settle.test.ts`); coverage at or above 80 / 80 / 75 / 80. The spring model's stage-level parity (inspect, trace, twins) is P5-T4's, which runs next; this task's behaviour and settle suites, the ngraph cross-check and the option pins are what make the model green here.

- [ ] **Step 6: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the spring-electrical preset and its ngraph-checked oracle` through `tools/commit-changes.sh`. The body records PD-12, PD-13, PD-14, PD-15 and PD-20, and names DEP-P5-A / DEP-P5-B as the decisions Task P5-T10 records.

---

### Task P5-T6: The accelerator members and the P5 barrel

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 3.3 lines 880-897 (`GpuAccelerator`; the two members at 892-893: `fruchtermanReingold(o?: FruchtermanReingoldOptions)`, `springElectrical(o?: SpringElectricalOptions)`, "the CPU option types; GPU tuning comes from `options.layout`, never from the caller"), 9.3 lines 3018-3025 (`LayoutAccelerator`'s optional members, the real declaration), 3.3 lines 873-874 (the two factories on the root entry), 2.4 (a method the GPU does not implement must be ABSENT, never a stub).

**Files:**
- Modify: `webgpu-graph-algorithms/src/types/accelerator.ts` (`GpuAccelerator` `:98-116` gains the two members; the import lists at `:40-41`), `webgpu-graph-algorithms/src/accelerator.ts` (the two methods; the header `:11-12`), `webgpu-graph-algorithms/src/index.ts` (values `:48-51`; types `:105-112`), `webgpu-graph-algorithms/test/index.test.ts` (`VALUE_EXPORTS` `:41-46`, `NEVER_EXPORTED` `:93-95`, the identity assertions `:123-125`), `webgpu-graph-algorithms/test/accelerator.test.ts` (`:52-54,63-64,161-199`), `webgpu-graph-algorithms/test/types/public-api.test-d.ts`, `webgpu-graph-algorithms/test/types/accelerator.test-d.ts`, `webgpu-graph-algorithms/test/types/options.test-d.ts`, `webgpu-graph-algorithms/test/types/conformance.test-d.ts`
- NOT touched: `src/layouts/**` (both factories exist since P5-T3 / P5-T5)

**Interfaces:**
- Consumes: `createFruchtermanReingold` (P5-T3), `createSpringElectrical` (P5-T5), the four stats / trace types and the two resolved records (P5-T1).
- Produces: `GpuAccelerator.fruchtermanReingold` / `.springElectrical`; barrel values `createFruchtermanReingold`, `createSpringElectrical`, `FR_DEFAULTS`, `SE_DEFAULTS`; barrel types `FruchtermanReingoldStats`, `FruchtermanReingoldTraceRecord`, `SpringElectricalStats`, `SpringElectricalTraceRecord`.

**PLAN DECISION PD-19 (one task, after both models).** `createSimulation` (`layout/src/simulation/create-simulation.ts:31-42`) tests `accelerator?.fruchtermanReingold !== undefined` and `accelerator?.springElectrical === undefined` to choose the route; a member that exists but throws would send the element to the GPU and fail there (design 2.4 row "method missing"). Both members therefore land together, only once P5-T3 and P5-T5 are green, in the same shape as `forceAtlas2` (`src/accelerator.ts:119-122`): `createFruchtermanReingold(ctx, { ...o, ...frozen.layout })`, the accelerator's tuning winning over anything the CPU-typed record carries.

- [ ] **Step 1: Write the failing pins**

In `test/index.test.ts`: move `"createFruchtermanReingold"` and `"createSpringElectrical"` from `NEVER_EXPORTED` (`:94-95`) into `VALUE_EXPORTS` under a `// P5: the two layout factories and their default tables` comment, add `"FR_DEFAULTS"`, `"SE_DEFAULTS"`, and identity assertions `expect(api.createFruchtermanReingold).toBe(createFruchtermanReingold)` etc. beside `:123-125` (import both factories and both tables at the top). In `test/accelerator.test.ts`: the member list at `:52-54` gains `"fruchtermanReingold"`, `"springElectrical"`; delete the two `toBeUndefined()` lines at `:63-64`; add, beside the `forceAtlas2 inherits options.layout` case (`:161-199`), one case per new member proving (a) it returns a simulation in state `"created"` whose `model.kind` is `"fruchtermanReingold"` / `"springElectrical"`, (b) `options.layout.exactMaxNodes` and `compat` reach `sim.tuning`, (c) a CPU-typed record's fields reach `sim.options`, and (d) a 34-node karate run through the member lays out end to end (`run({ maxIter: 20 })`, every position finite). In the four `.test-d.ts` files: `public-api.test-d.ts` imports the six new names (the import list IS the pinned type list, `:100-101`) and asserts `expectTypeOf(createFruchtermanReingold).returns.toEqualTypeOf<GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>>()` and the spring twin, plus `FruchtermanReingoldStats` / `SpringElectricalStats` `toMatchTypeOf<LayoutStatsBase>()`; `accelerator.test-d.ts` asserts `expectTypeOf<GpuAccelerator["fruchtermanReingold"]>()` and `["springElectrical"]` are functions whose parameter 0 is the `@graphty/layout` option type `| undefined` and whose return matches `LayoutSimulation`; `options.test-d.ts` asserts `createFruchtermanReingold(ctx, { ...fr, repulsion: "exact" })` and `createSpringElectrical(ctx, spring)` type-check and that `setParams` takes `Partial<FruchtermanReingoldOptions>` / `Partial<SpringElectricalOptions>`; `conformance.test-d.ts` adds `expectTypeOf<ReturnType<NonNullable<LayoutAccelerator["fruchtermanReingold"]>>>().toEqualTypeOf<LayoutSimulation>()` and the spring twin, and `expectTypeOf<FruchtermanReingoldOptions | undefined>().toEqualTypeOf<Parameters<NonNullable<LayoutAccelerator["fruchtermanReingold"]>>[0]>()` and the spring twin (the `:59-61` shape).

Run: `cd $PKG && pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts`
Expected: FAIL (`Object.keys(api)` lacks the four values; `acc.fruchtermanReingold` is undefined).

- [ ] **Step 2: Implement**

`src/types/accelerator.ts`: import `FruchtermanReingoldStats`, `SpringElectricalStats` from `./layout.js` (`:40`) and `FruchtermanReingoldOptions`, `SpringElectricalOptions` from `./options.js` (`:41`); add to `GpuAccelerator` after `forceAtlas2` (`:102`):

```ts
    fruchtermanReingold(
        options?: FruchtermanReingoldOptions,
    ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats>;
    springElectrical(options?: SpringElectricalOptions): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats>;
```

`src/accelerator.ts`: import the two factories and the four types; add after the `forceAtlas2` method (`:119-122`):

```ts
        /**
         * The Fruchterman-Reingold simulation with this accelerator's layout tuning (spec 3.3, 7.20; P5).
         * @param o - the CPU option type (spec 9.3 FruchtermanReingoldOptions); GPU tuning keys come from `options.layout`
         * @returns a fresh simulation in state "created"
         */
        fruchtermanReingold(
            o?: FruchtermanReingoldOptions,
        ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
            ctx.assertReady();
            return createFruchtermanReingold(ctx, { ...o, ...frozen.layout });
        },
        /**
         * The spring-electrical preset with this accelerator's layout tuning (spec 3.3, 7.20; P5).
         * @param o - the CPU option type (spec 9.3 SpringElectricalOptions, ngraph's names)
         * @returns a fresh simulation in state "created"
         */
        springElectrical(o?: SpringElectricalOptions): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats> {
            ctx.assertReady();
            return createSpringElectrical(ctx, { ...o, ...frozen.layout });
        },
```

and rewrite the header sentence of `:11-12` ("... `fruchtermanReingold` / `springElectrical` with P5") to state they are present. `src/index.ts`: add `export { createFruchtermanReingold } from "./layouts/fruchterman-reingold.js";`, `export { createSpringElectrical } from "./layouts/spring-electrical.js";`, `FR_DEFAULTS` and `SE_DEFAULTS` to the constants export (`:17-26`), and the four types to the layout type export (`:105-112`); the header comment gains "P5 adds the two factories, the two default tables and the two stats records".

Run: `cd $PKG && pnpm run build:all && pnpm run lint && pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts test/build-output.test.ts`
Expected: PASS (the lint runs both `tsc` legs, which compile the four `.test-d.ts` files against `src/` and against `dist/*.d.ts`).

- [ ] **Step 3: Commit (owner)** -- `feat(webgpu-graph-algorithms): expose fruchtermanReingold and springElectrical on the accelerator` through `tools/commit-changes.sh`. The body records PD-19.

---

### Task P5-T7: The P5 sabotage rows and suites

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.9 item 1 (sabotage: "a kernel lands with at least three mutations", each failing its test "by at least 10x the test's tolerance"), 13 rule (f), `CLAUDE.md:445-451` step 6 ("at least three sabotage rows per kernel"), 10.4 line 3417 (T-12, the lane budget the timed run of Step 3 is measured against).

**Files:**
- Modify: `webgpu-graph-algorithms/test/helpers/sabotage.ts` (append `SABOTAGE_P5` and four test-file constants)
- Create: `webgpu-graph-algorithms/test/sabotage/fr.test.ts`, `webgpu-graph-algorithms/test/sabotage/se.test.ts`
- NOT touched: `test/sabotage/coverage.test.ts` (its P1 name pins stand: PD-8), `test/sabotage/fa2.test.ts`, `test/noise-floor.test.ts`, `benchmarks/results/noise-floor.json`, `test/fixtures/noise/**`, the `fr-*` / `se-*` parity suites and helpers (all P5-T4's: every tolerance this task's ratios divide by is already recorded)

**Interfaces:**
- Consumes: `Mutation`, `withSabotage`, `sabotagedBody`, `mergeReports`, `assertCheckPasses`, `ratioOf` (`test/helpers/sabotage.ts:23-29,522-613`), `captureFrStages` / `frStageReport` and `captureSeStages` / `seStageReport` (P5-T4), the 46 recorded P5 tolerances (P5-T4 Step 4).
- Produces: `SABOTAGE_P5: Readonly<Partial<Record<KernelId, readonly Mutation[]>>>` (25 rows).

**PLAN DECISION PD-8 (a separate table).** `coverage.test.ts:58-63` pins the K3 row names of `SABOTAGE` exactly, and `fa2.test.ts:45-64` runs every `SABOTAGE` row of a P3 kernel against the FA2 stage and trace checks -- a mutation inside `if (LAW == 1u) { ... }` leaves the FA2 output untouched, so that suite would (rightly) report the mutant SURVIVING and fail. The P5 rows therefore live in `SABOTAGE_P5`, keyed by kernel id like `SABOTAGE_P3_ADDENDUM` (`sabotage.ts:489`), measured by `test/sabotage/fr.test.ts` and `se.test.ts` against the FR and spring checks only; `fr.test.ts` carries the find-once / minFactor / unique-name check over the new table (the `:72-80` loop of `coverage.test.ts`, applied to `SABOTAGE_P5`).

- [ ] **Step 1: The 25 rows**

Append to `test/helpers/sabotage.ts` (the `find` strings are the exact lines P5-T2 wrote; `test` names the file whose check measures the row, all four created by P5-T4):

```ts
const FR_INSPECT_TEST = "test/layouts/fr-inspect.test.ts";
const FR_TRACE_TEST = "test/layouts/fr-trace.test.ts";
const SE_INSPECT_TEST = "test/layouts/se-inspect.test.ts";
const SE_TRACE_TEST = "test/layouts/se-trace.test.ts";

/** The P5 rows (PD-8): the FR and spring-electrical BRANCHES of the four FA2 kernels; measured by test/sabotage/fr.test.ts and se.test.ts only, never against the FA2 checks (which never reach these lines). */
export const SABOTAGE_P5: Readonly<Partial<Record<KernelId, readonly Mutation[]>>> = Object.freeze({
    "fa2-attraction": Object.freeze([
        { name: "fr-attraction-k-multiplied", find: "if (LAW == 1u) { w = length(d) / P.frK; }", replace: "if (LAW == 1u) { w = length(d) * P.frK; }", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-attraction-linear", find: "w = length(d) / P.frK;", replace: "w = 1.0 / P.frK;", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-attraction-law-skipped", find: "if (LAW == 1u) { w = length(d) / P.frK; }", replace: "if (LAW == 3u) { w = length(d) / P.frK; }", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "spring-rest-length-dropped", find: "w = P.springCoefficient * (len - P.springLength) / len;", replace: "w = P.springCoefficient;", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "spring-sign-flipped", find: "w = P.springCoefficient * (len - P.springLength) / len;", replace: "w = P.springCoefficient * (P.springLength - len) / len;", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "spring-law-skipped", find: "if (LAW == 2u) { w = P.springCoefficient", replace: "if (LAW == 3u) { w = P.springCoefficient", minFactor: 10, test: SE_INSPECT_TEST },
    ]),
    "fa2-repulsion-exact": Object.freeze([
        { name: "fr-repulsion-inverse-square", find: "f = f + d * (P.frK * P.frK / d2);", replace: "f = f + d * (P.frK * P.frK / (d2 * sqrt(d2)));", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-repulsion-k-linear", find: "(P.frK * P.frK / d2)", replace: "(P.frK / d2)", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-repulsion-law-skipped", find: "if (LAW == 1u) { f = f + d", replace: "if (LAW == 3u) { f = f + d", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "coulomb-sign-flipped", find: "(-P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))", replace: "(P.coulomb * pi.w * o.w / (d2 * sqrt(d2)))", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "coulomb-inverse-linear", find: "pi.w * o.w / (d2 * sqrt(d2))", replace: "pi.w * o.w / d2", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "coulomb-mass-dropped", find: "(-P.coulomb * pi.w * o.w /", replace: "(-P.coulomb /", minFactor: 10, test: SE_INSPECT_TEST },
    ]),
    "fa2-integrate": Object.freeze([
        { name: "fr-temperature-cap-dropped", find: "dp = f * (min(mag, P.temperature) / mag);", replace: "dp = f;", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-fixed-moves", find: "if (mag > 0.0 && !fixed) {", replace: "if (mag > 0.0) {", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-apply-skipped", find: "if (APPLY == 1u) {", replace: "if (APPLY == 3u) {", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "euler-drag-sign", find: "let fd = f - P.dragCoefficient * v;", replace: "let fd = f + P.dragCoefficient * v;", minFactor: 10, test: SE_TRACE_TEST },
        { name: "euler-mass-ignored", find: "v = v + (P.timeStep / p.w) * fd;", replace: "v = v + P.timeStep * fd;", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "euler-clamp-dropped", find: "if (sp > 1.0) { v = v / sp; }", replace: "if (sp > 1.0e30) { v = v / sp; }", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "euler-velocity-not-stored", find: "if (!fixed) { store_old(i, v); }", replace: "if (fixed) { store_old(i, v); }", minFactor: 10, test: SE_TRACE_TEST },
    ]),
    "fa2-stats-finalize": Object.freeze([
        { name: "fr-temperature-not-traced", find: "T[P.iterationIndex].modelScalar = P.temperature;", replace: "T[P.iterationIndex].modelScalar = 0.0;", minFactor: 10, test: FR_TRACE_TEST },
        { name: "fr-temperature-state-stale", find: "S.temperature = P.temperature;", replace: "S.temperature = S.temperature;", minFactor: 10, test: FR_INSPECT_TEST },
        { name: "fr-stats-mode-skipped", find: "if (STATS_MODE == 1u) {", replace: "if (STATS_MODE == 3u) {", minFactor: 10, test: FR_TRACE_TEST },
        { name: "ke-not-folded", find: "ke = ke + q.swingTraction.x;", replace: "ke = ke + 0.0 * q.swingTraction.x;", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "ke-state-not-written", find: "S.kineticEnergy = tKe;", replace: "S.kineticEnergy = 0.0;", minFactor: 10, test: SE_INSPECT_TEST },
        { name: "ke-stats-mode-skipped", find: "if (STATS_MODE == 2u) {", replace: "if (STATS_MODE == 3u) {", minFactor: 10, test: SE_INSPECT_TEST },
    ]),
});
```

Every `find` is a substring that occurs exactly once in its body after P5-T2 (`coulomb-inverse-linear`'s `pi.w * o.w / (d2 * sqrt(d2))` occurs once: the FA2 line uses `k / d2`; `spring-law-skipped`'s prefix occurs once; the two `if (STATS_MODE == <n>u) {` guards are the only mode tests in K1's body, P5-T2 Step 5; check with the coverage loop of Step 2 rather than by eye). The two `*-stats-mode-skipped` rows are the third row of each K1 branch: under the FR one the state keeps `onLoad`'s 0.1 and the trace records 0, which the exact temperature comparison of `fr-trace.test.ts` reports as an infinite ratio; under the spring one `S.kineticEnergy` stays 0 in the `k1` capture (a `step(1)` then `run("K1")`, which folds that step's partials B, P5-T4 Step 2) while the oracle's kinetic energy after the first integrate is positive, a relative error of 1 against a 1e-4 tolerance. Each row is measured by the check its `test` names: the `fr-inspect` rows through `frStageReport` on the mutated kernel's stages (the `stageCheck` shape of `fa2.test.ts:56-64`; the `fr-fixed-moves` row through the PINNED capture, where the pinned row's displacement must be 0), the `fr-trace` rows through the exact temperature comparison (a mutant that writes 0 has an infinite ratio) and the 10-iteration trajectory, the `se-inspect` rows through the spring stage reports (the `k1` key carries the kinetic energy), the `se-trace` rows through the 10-iteration trajectory (drag and the stored velocity show over iterations, not in one).

- [ ] **Step 2: The two suites**

`test/sabotage/fr.test.ts`: (1) the pure coverage check over `SABOTAGE_P5` -- every `find` occurs exactly once in `KERNELS[id].body`, the replacement differs, `minFactor >= 10`, names unique, every `test` file exists, and every kernel that has `LAW` / `APPLY` / `STATS_MODE` rows has >= 3 rows PER BRANCH (`fr-*` and `spring-*` / `coulomb-*` / `euler-*` / `ke-*` counted separately: K2 3 + 3, K3 3 + 3, K5 3 + 4, K1 3 + 3 -- the Global Constraints' reading of rule (f), a branch treated as a kernel, holds for all four); (2) for every FR row (`name` starting `fr-`): `withSabotage(id, mutation, ...)` on a FRESH context (the seam of `kernels.ts:663-670`; the pipeline key does not include the body), unscaled `karate`, the named check's report, `expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor)`; the pinned capture for `fr-fixed-moves`. `test/sabotage/se.test.ts`: the same for every `spring-*` / `coulomb-*` / `euler-*` / `ke-*` row against the spring checks; `euler-drag-sign` and `euler-velocity-not-stored` through the 10-iteration trajectory report of `se-trace.test.ts`'s helper. Both files on every adapter (lavapipe is enough, 11.9 item 1).

- [ ] **Step 3: The whole P5 set in check mode on both adapters, timed**

Run: `TIMEFORMAT='lavapipe P5 set: %R s'; cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts && time eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts test/oracle test/sabotage test/noise-floor.test.ts && GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/layouts`
Expected: PASS everywhere; `test/sabotage/fr.test.ts` and `se.test.ts` print each row's worst ratio (record the smallest in G5.md section 7); the no-subgroups pass agrees with the feature pass within the twin tolerances. The lavapipe leg is timed with bash's `time` keyword and `TIMEFORMAT` (`/usr/bin/time` is not installed on the dev box: `ls /usr/bin/time` -> `No such file or directory`, and `type time` -> `shell keyword`): the FA2 set was 39 s (`CLAUDE.md:370`); the P5 set adds two models' worth -- record the printed wall time for the G5 record's lane budget row (T-12 at `:3417`).

- [ ] **Step 4: Commit (owner)** -- `test(webgpu-graph-algorithms): add the P5 sabotage rows and suites` through `tools/commit-changes.sh`. The body records PD-8 and the smallest sabotage ratio.

---

### Task P5-T8: The layout-fr benchmark group and T-14

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 10.4 line 3419 (T-14: "FR 10k / 100k nodes per-iteration numbers recorded", gate G5), 11.7 (benchmarks and baselines), 13 rule (c), `CLAUDE.md:106-149` (the harness, the clock warm-up burst, the append rule: "the LAST session of a file is the baseline and must carry every group"), `CLAUDE.md:452-455` step 7.

**Files:**
- Create: `webgpu-graph-algorithms/benchmarks/layout-fr.bench.ts`
- Modify: `webgpu-graph-algorithms/benchmarks/layout-exact.bench.ts` (export `warmClock` and `reportedRow`, the latter with a `group` parameter; the two call sites at `:265,283-291`), `webgpu-graph-algorithms/benchmarks/run.ts` (`GROUPS` `:34-40`, the usage comment `:7-14`, the JSDoc `:30-33`), `webgpu-graph-algorithms/test/benchmarks.test.ts` (a describe for the new group beside `:463`), `webgpu-graph-algorithms/README.md` (the group list `:274-277`, one T-14 row in each of the two performance tables `:296-301` and `:343-348`, and the group sentence in the CLAUDE.md-mirrored paragraph), `webgpu-graph-algorithms/benchmarks/results/nvidia-lovelace-driver580.json` and `gpu-linux-t4.json` (one appended session each, through the append script, never by hand)
- NOT touched: `scripts/bench-compare.js` (it compares whatever rows the last session carries, `:177-181`), `webgpu-graph-algorithms/CLAUDE.md` (its groups table `:115-121` gains the `layout-fr` row in Task P5-T11, which owns that file)

**Interfaces:**
- Consumes: `bench`, `BenchResult`, `appendSession` (`benchmarks/harness.ts:26,138,324`), `randomEdges` / `snapshotOf` (`benchmarks/datasets.ts:35,235`), `createFruchtermanReingold`, `createSpringElectrical`, `EXACT_LADDER`'s shape (`layout-exact.bench.ts:49-52`).
- Produces: `LAYOUT_FR_GROUP = "layout-fr"`, `FR_RUNGS`, `runLayoutFrBenchmarks(ctx)`; the exported `warmClock(sim, minMs)` and `reportedRow(group, name, samples, runs, items, unit)`.

**PLAN DECISION PD-17 (the group's rows).** T-14 names 10k and 100k. The design's exact-tier crossover is 32,768 (`src/constants.ts:32`), so 100k runs with `repulsion: "exact"` passed explicitly (the tier the design's 7.21 row "100k ... exact (for comparison)" measures at ~18 ms for FA2, `:2510`); the row name says so. The preset gets the same two rungs in the same group: the design lists one group (`layout-fr`) for the phase, and two models' rows in one group cost one extra `for` loop. Four rows per rung as `layout-exact` has two per rung: `fr step(1) wall n=<n> m=<m> 2D [<label>]`, `fr ms/iteration (<source>) n=<n> [<label>]`, `se step(1) wall ...`, `se ms/iteration ...`. `warmClock` and `reportedRow` are generalised rather than copied: the first needs only `reheat()` / `step()`, the second only the group name.

- [ ] **Step 1: The exports and the group**

In `layout-exact.bench.ts`: `warmClock` (`:234-246`) becomes `export async function warmClock(sim: { reheat(): void; step(k: number): Promise<void> }, minMs: number)`; `reportedRow` (`:200-224`) becomes `export function reportedRow(group: string, name: string, samples: readonly number[], runs: number, items: number, unit: string): BenchResult` with `group` in the returned record; the two call sites pass `LAYOUT_EXACT_GROUP`. Create `benchmarks/layout-fr.bench.ts`:

```ts
export const LAYOUT_FR_GROUP = "layout-fr";
export const FR_RUNGS: readonly LadderRung[] = [{ label: "10k", nodes: 10_000 }, { label: "100k", nodes: 100_000 }];
const FR_OPTIONS: FruchtermanReingoldOptions & GpuLayoutTuning = { dim: 2, seed: 12345, iterations: 1_000_000, iterationsPerStep: 1, maxInFlight: 1, repulsion: "exact" };
const SE_OPTIONS: SpringElectricalOptions & GpuLayoutTuning = { dim: 2, seed: 12345, iterationsPerStep: 1, maxInFlight: 1, repulsion: "exact" };
export async function runLayoutFrBenchmarks(ctx: GpuContext): Promise<BenchResult[]>;
// per rung: snapshotOf(randomEdges(n, 10 n, SEED)), then for each of [["fr", createFruchtermanReingold, FR_OPTIONS], ["se", createSpringElectrical, SE_OPTIONS]]: load, warmClock(sim, 500), bench(LAYOUT_FR_GROUP, `${tag} step(1) wall n=${n} m=${m} 2D [${label}]`, { setup: reheat, run: step(1) and push stats.msPerIteration }, { device, items: n * (n - 1), unit: "pairs" }), then reportedRow(LAYOUT_FR_GROUP, `${tag} ms/iteration (${source}) n=${n} [${label}]`, samples, wall.runs, pairs, "pairs"); dispose and release in finally
```

`iterations: 1_000_000` keeps the FR temperature positive under the per-run `reheat()` (which restarts the temperature index at 700,000 of 1,000,001: `t = 0.03`); the preset has no budget and never settles between reheats (`reheat()` zeroes `settledCount`). Register the group in `run.ts` (`GROUPS` gains `[LAYOUT_FR_GROUP]: runLayoutFrBenchmarks`; the usage comment gains `pnpm exec tsx benchmarks/run.ts layout-fr   # T-14 (P5)`), add the `layout-fr` row to the README group list (`:274-277`) (the matching row of the package CLAUDE.md's groups table is P5-T11's, Step 3), and in `test/benchmarks.test.ts` a describe pinning `LAYOUT_FR_GROUP === "layout-fr"`, the two rungs, the four row-name shapes (a regex per shape) and `reportedRow`'s group argument.

Run: `cd $PKG && pnpm exec vitest run --project=node test/benchmarks.test.ts && pnpm run lint && eval $GPU_LLVM pnpm exec tsx benchmarks/run.ts --allow-software --runs 1 --no-save layout-fr`
Expected: the test passes; the software run prints eight rows (labelled not representative) and exits 0 -- at 100k on lavapipe one FR iteration is seconds, so this smoke may take a few minutes; it proves the group runs, not a number.

- [ ] **Step 2: The dev-box baseline (owner's GPU, quiet card)**

Write `tmp/p5/append-session.mjs`: the script of `docs/decisions/G3.md` appendix A (`:535-583`) verbatim with `const REQUIRED_GROUPS = ["upload", "roundtrip", "layout-exact", "pagerank", "wcc", "layout-fr"];` and the usage line naming `tmp/p5/`. Then, with nothing else on the card (`nvidia-smi --query-gpu=utilization.gpu,memory.used,clocks.sm,pstate --format=csv`):

Run: `cd $PKG && eval $GPU_NV XDG_RUNTIME_DIR=/tmp pnpm run bench && node tmp/p5/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json && node scripts/bench-compare.js`
Expected: `pnpm run bench` prints six groups; the append reports `groups upload,roundtrip,layout-exact,pagerank,wcc,layout-fr` and one more session; `bench:compare` prints every pre-existing row within 3x (a `layout-exact` row above 3x means the card was not at its working clock: re-run) and the eight `layout-fr` rows as `new (no baseline)`. Copy the two FR `ms/iteration` medians (10k, 100k) into the G5 record's T-14 row. The expectation from the FA2 curve (`CLAUDE.md:366`: 0.586 ms at 10k, ~18 ms at 100k exact): FR is the same tile with a cheaper pair body and no K4, so 0.4-0.6 ms at 10k and 12-18 ms at 100k; the preset within 10% of FR.

- [ ] **Step 3: The lane baseline (through the PR)**

After the branch is pushed and the PR carries the `gpu` label, `gpu.yml` runs `pnpm run bench` and `bench-compare` (`.github/workflows/gpu.yml:84-85`) and uploads `benchmarks/out/` in the `gpu-results-<run id>` artifact (`:86-91`). The owner downloads it (`gh run download <run id> -n gpu-results-<run id> -D tmp/p5/t4`) and appends `tmp/p5/t4/benchmarks/out/gpu-linux-t4.json` into `benchmarks/results/gpu-linux-t4.json` with the same script; a second commit on the PR carries it, as G7 did (`docs/decisions/G7.md:149-152`). Until then the G5 record's T4 column carries an `{{OPEN: ...}}` marker naming this step (the G7 convention, `G7.md:18-21`).

- [ ] **Step 4: The README rows**

Add to both README tables a row `| T-14 | Fruchterman-Reingold exact tier, GPU time per iteration (profiler) at 10k; at 100k (`repulsion: "exact"`) | recorded | <10k> ms; <100k> ms |` with the measured medians (the dev-box table from Step 2; the T4 table from Step 3, or the `{{OPEN}}` marker until then). Regenerate nothing else: the README's other rows are the G7 session's.

- [ ] **Step 5: Commit (owner)** -- `feat(webgpu-graph-algorithms): add the layout-fr benchmark group and record T-14 on the dev box` through `tools/commit-changes.sh`; the T4 session lands as a second commit, `feat(webgpu-graph-algorithms): record the layout-fr T4 lane baseline`, once the artifact is in (Step 3).

---

### Task P5-T9: The FR and spring browser smoke and the FR frame loop

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 11.6 item 3 (the 500-node smoke: "load, step(10) five times with maxInFlight = 2, positions written back, setPosition / setFixed honoured, dispose clean, plus the 11.4 frame-loop test"), 11.4 lines 3595-3600 (the frame-loop test), 13 row P5 ("browser smoke"), `CLAUDE.md:449-451`.

**Files:**
- Modify: `webgpu-graph-algorithms/test/helpers/frame-loop.ts` (the two generic parameters at `:31-32,93,139,304`)
- Create: `webgpu-graph-algorithms/test/layouts/fr-frame-loop.test.ts`, `webgpu-graph-algorithms/test/browser/spring-layouts.test.ts`
- NOT touched: `test/browser/forceatlas2.test.ts`, `test/layouts/frame-loop.test.ts`

**Interfaces:**
- Consumes: `runFrameLoop` / `runFrameLoopUntilSettled` (`frame-loop.ts:138,303`), `requireBrowserGpu` / `acquireBrowser` / `browserScale` (`test/setup/browser.ts:97,127,142`), `randomEdges` / `snapshotOf` / `fixture` (`test/helpers/graphs.ts:216,350,438`), `storyGraph()` (P5-T5), both factories.
- Produces: `runFrameLoop<O, S>(sim: GpuLayoutSimulation<O, S>, ...)` for any model.

**PLAN DECISION PD-18 (the helper is widened, not copied).** `frame-loop.ts` names `GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>` in three signatures (`:93,139,304`) and reads no FA2 field of `stats` (its counters are `iterationsDone`, `inFlight`, `coalesced`, `settled`, the simulation's shared surface; `grep -n 'stats\.' test/helpers/frame-loop.ts` is empty). Two generic parameters `<O extends CommonLayoutOptions & SimulationOptions, S extends LayoutStatsBase>` replace the two concrete types; the FA2 callers compile unchanged.

- [ ] **Step 1: Widen the helper**

Edit `test/helpers/frame-loop.ts`: replace the `ForceAtlas2Stats` / `ForceAtlas2Options` imports (`:31-32`) with `LayoutStatsBase`, `CommonLayoutOptions`, `SimulationOptions`; make `countersOf`, `runFrameLoop` and `runFrameLoopUntilSettled` generic as PD-18 states.

Run: `cd $PKG && pnpm run lint && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/frame-loop.test.ts`
Expected: PASS unchanged (every `it` of the file, twelve today: `grep -c '^\s*it(' test/layouts/frame-loop.test.ts`; `CLAUDE.md:371`'s `11 / 11` is the G3-era count).

- [ ] **Step 2: The FR frame loop on node**

Create `test/layouts/fr-frame-loop.test.ts`: the 600-tick run, the `setPosition`-during-flight run and the pause run of `test/layouts/frame-loop.test.ts` (copy its calibration idiom: `calibrateHeavyStep` is module-private there; re-implement the four-line loop over `createFruchtermanReingold(ctx, { seed: 7, iterations: 1_000_000, settleThreshold: 0 })`) with an FR simulation on `random1k` at `gpuScale()`: at most `maxInFlight` in flight, monotone `iterationsDone`, a `setPosition` during flight never overwritten by an older batch, `settled` reported by `runFrameLoopUntilSettled` on karate with the default `iterations: 50` (the budget settles it), and the pause: no submission for 100 ticks, `flush()` resolves, the temperature trace continues from the landed value (no reheat on resume, 7.19).

Run: `cd $PKG && eval $GPU_NV pnpm exec vitest run --project=node test/layouts/fr-frame-loop.test.ts && eval $GPU_LLVM pnpm exec vitest run --project=node test/layouts/fr-frame-loop.test.ts`
Expected: PASS on both.

- [ ] **Step 3: The browser smoke**

Create `test/browser/spring-layouts.test.ts` on the `forceatlas2.test.ts` shape (`:150-260`; its `expectAdapterMatchesFlagSet`, `nextTick`, `measureTickMs` are module-private: copy the three, 30 lines): (1) `createFruchtermanReingold` on 500 nodes / 1,500 edges (`randomEdges(500, 1500, 11)`): `load`, `step(10)` x 5 with `maxInFlight 2` (the third call after the first landed), `iterationsDone 50`, `stats.trace` length 10 with strictly decreasing `temperature`, positions finite and moved, `z === 0`, `setFixed` pins node 7 (immobile over two `step(5)`), `setPosition(3, 5, -4, 0)` honoured and reheated (`iterationsDone 0`), an unpin reheats, `dispose` returns `allocator.liveBuffers` to its value before the simulation existed and `readback.slots` unchanged; (2) `createSpringElectrical` likewise (`stats.trace[i].kineticEnergy` finite and non-negative, `trace[0]` of the first batch exactly 0 and every later record positive -- PD-4's one-iteration lag; `inspect` absent: the browser context has no debug flag); (3) the FR frame loop through the widened helper: 600 ticks on `random1k` at `browserScale()` with the calibrated `iterationsPerStep`, the three assertions of Step 2's first run; (4) the preset settles on `storyGraph()` within 1,000 iterations (`run({ maxIter: 1000, batch: 8 })`, `settled` true, `iterationsDone < 1000`) -- the G5 settle item in Chromium as well, on SwiftShader at full size (150 nodes).

Run: `cd $PKG && GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js && eval $GPU_NV GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_GPU_REQUIRE=nvidia node scripts/run-browser-project.js`
Expected: both runs pass (the wrapper's exit-124 rule applies, `CLAUDE.md:297-299`); the JSON reports every test of the new file passed on both adapters; record the two run lines for G5.md section 1.

- [ ] **Step 4: Commit (owner)** -- `test(webgpu-graph-algorithms): add the FR and spring browser smoke and the FR frame loop` through `tools/commit-changes.sh`. The body records PD-18.

---

### Task P5-T10: The decision records and the design index

**Repository:** `$WT` (exported by the phase's Step 0).

**Spec:** `design/decisions/README.md:1-27` (one decision per file, `YYYY-MM-DD-<slug>.md`, never edited after it lands, carries the argument that was REJECTED, plus a row in the index table).

**Files:**
- Create: `design/decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md`, `design/decisions/2026-09-20-spring-electrical-integrates-like-ngraph.md`, `design/decisions/2026-09-20-fr-reheat-restarts-the-temperature-not-the-budget.md` (THREE records: DEP-P5-A, -B, -C)
- Modify: `design/decisions/README.md` (three index rows after `:40`), `design/README.md:14` (`10` -> `13`) and `:21` (`12` -> `13`), `design/webgpu/README.md` (a row for this plan after `:14`)
- NOT touched: `design/webgpu/webgpu-acceleration-plan.md` (the Review-log practice was retired on 2026-09-19, `design/decisions/README.md:14-21`)

- [ ] **Step 1: Write the three records**

Each follows the skeleton of `design/decisions/2026-09-19-spmv-tier-zero-only.md`: an H1 stating the decision as a sentence with no trailing period; `Date: 2026-09-20`; `Decided by: the owner`; `Changes:` naming the design lines it supersedes and saying they are NOT edited; `## The decision` (3-8 concrete sentences ending with what does NOT move); `## Why`; `## What we are giving up, and why it is acceptable` (which QUOTES the superseded text verbatim and concedes what it gets right); `## What would reverse this` (testable conditions, counted). The three rejected arguments: (A) a second, absolute settle predicate `lastMove / n <= 0.01` inside `ForceSimulation` keyed by model kind, rejected because 7.17 (`:2257-2261`) already made ngraph's rule scale-relative and one state machine carries one rule -- reversed if a consumer measures the preset stopping visibly early or late against ngraph on three real graphs under the shared threshold; (B) a velocity-Verlet step, rejected because the gate compares against ngraph and ngraph's `generateIntegrator.js:27-41` is Euler with a clamp -- reversed if the design's own comparison target changes from ngraph to a Verlet reference; (C) a `ForceModel.onReheat` returning the restart iteration so the simulation could set `iterationsDone` to it, rejected because it changes the P3 hook every model implements to serve one model's budget accounting, while the temperature clamp already makes the run terminate -- reversed if an element feature reads `iterationsDone` after a drag as "iterations left" and the 30% budget matters to it.

- [ ] **Step 2: Index them**

Add three rows to `design/decisions/README.md`'s table, the `Decision` cell being each record's H1 verbatim. Change `design/README.md:14`'s count from `10` to `13` and `:21`'s webgpu count from `12` to `13`. Add a row to `design/webgpu/README.md`'s table for `plans/2026-09-20-webgpu-p5-fruchterman-reingold.md` with the "What it is" cell "Phase P5: Fruchterman-Reingold and the spring-electrical preset on the exact tier (design P5), gate G5" and Status `live plan`.

Run: `cd $WT && ls design/decisions/*.md | wc -l && LC_ALL=C grep -rnP '[^\x00-\x7F]' design/decisions/ design/webgpu/plans/2026-09-20-webgpu-p5-fruchterman-reingold.md | wc -l`
Expected: `14` (the README plus thirteen records: the ten that exist today and the three this task writes) and `0` non-ASCII bytes.

- [ ] **Step 3: Commit (owner)** -- `docs: record the P5 design decisions beside the WebGPU design` through `tools/commit-changes.sh`. TYPE `docs`, no scope (the form M8b-T11 used; `tools/commit-changes.sh` extracts an empty scope and skips the enum check for it).

---

### Task P5-T11: The G5 gate record and the phase close

**Repository:** `$WT` (`$PKG` = `$WT/webgpu-graph-algorithms`; both exported by the phase's Step 0).

**Spec:** design 13 row P5 line 4212 (the G5 checklist, quoted in the template below); design 13 rule (a) (green on the default lane AND the GPU lane); 10.4 lines 3397-3402 (a missed target is re-fixed by a recorded owner decision, never relaxed silently).

**Files:**
- Create: `webgpu-graph-algorithms/docs/decisions/G5.md`
- Modify: `webgpu-graph-algorithms/CLAUDE.md` (`:57` the wgsl inventory line gains "the P5 `LAW` / `APPLY` / `STATS_MODE` branches of K1, K2, K3, K5"; `:60` the layouts line gains `model-common.ts`, `fruchterman-reingold.ts`, `spring-electrical.ts` (P5); the benchmark groups table `:115-121` gains the `layout-fr` row (P5-T8's group, described in its PD-17; this task owns the file); the "Adding a Layout Model" preamble `:406-410` names the two P5 models as landed; the "Settled at G3" table gains a "Settled at G5" table with the measured facts of Step 1)
- NOT touched: `docs/decisions/G0.md` .. `G7.md` (closed records)

- [ ] **Step 1: Run the full green check on both adapters and the browser**

Run:

```bash
cd $PKG
pnpm run build:all && pnpm run lint                                   # eslint + 2 tsc runs (the four .test-d.ts files against src/ and dist/)
(cd .. && pnpm exec knip)                                             # no finding under the package
eval $GPU_NV pnpm exec vitest run --project=node                      # the hardware lane
TIMEFORMAT='lavapipe node project: %R s'                              # bash's time keyword; /usr/bin/time is not installed on the dev box
time eval $GPU_LLVM pnpm exec vitest run --project=node --coverage   # the default lane, thresholds ON, wall time printed
GRAPHTY_GPU_NO_SUBGROUPS=1 eval $GPU_NV pnpm exec vitest run --project=node test/primitives test/layouts test/algorithms
GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js
eval $GPU_NV GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_GPU_REQUIRE=nvidia node scripts/run-browser-project.js
LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs | wc -l    # 0
```

Expected: as commented; coverage at or above 80 / 80 / 75 / 80; the non-ASCII count 0; the lavapipe wall time under the 900 s lane budget (T-12, `:3417`).

- [ ] **Step 2: Write the G5 record**

Create `$PKG/docs/decisions/G5.md` with this content; every `<...>` cell is a number or a string copied from the named command's output, and the owner signs the last section:

````markdown
# G5 -- Fruchterman-Reingold and the spring-electrical preset (spec 13 row P5)

Recorded by: Task P5-T11 of `design/webgpu/plans/2026-09-20-webgpu-p5-fruchterman-reingold.md`, 2026-09-DD (every
measurement below ran on the dev box on 2026-09-DD local time; the benchmark session date is UTC). The owner signs
section 7. Commits: the twelve of the P5 PR (<short hashes once committed>): the eleven task commits plus the lane
follow-up commit that carries the T4 baseline (8.3).
Environment: `@graphty/webgpu-graph-algorithms` <version from package.json; 0.4.1 when this plan was written> over
`@graphty/layout` <version; 1.7.0>, Node <version>, pnpm 10.0.0, vitest 3.2.7, the `webgpu` npm package 0.4.0 (Dawn),
<OS>, NVIDIA driver <version>, Mesa lavapipe <version>, Playwright <version> with Chromium <build>. Every command ran
from `webgpu-graph-algorithms/` in the worktree `.worktrees/gpu-scale-layouts` (branch `feat/gpu-p5-p4`, based on
`c6f1e85f`); the logs are under `tmp/p5/` (gitignored).

The rule of this record (spec 10.4): every number is measured and names the command or the file it came from; a
missed target is never relaxed here -- it is re-fixed by an owner decision in section 7, or the phase stays open.

GATE STATUS: <GREEN / OPEN> on the dev box; the GPU lane rows carry `{{OPEN: ...}}` until the labelled PR has run.

## 0. What the phase built (the deliverable of spec 13 row P5)

`createFruchtermanReingold` and `createSpringElectrical` on the exact tier over the P3 kernels (the `LAW`, `APPLY`
and `STATS_MODE` branches), the two stats records, the two f64 oracles (the second checked against ngraph.forcelayout
3.3.1), the accelerator members, the `layout-fr` group, 25 sabotage rows, 46 derived tolerances, the property, force-sum and distributional suites of both models, the browser smoke.
The three departures from the design are `design/decisions/2026-09-20-spring-electrical-settles-by-the-shared-rule.md`,
`-spring-electrical-integrates-like-ngraph.md` and `-fr-reheat-restarts-the-temperature-not-the-budget.md`.

## 1. Adapters exercised

| Adapter | Runtime | adapter class | runner class | subgroups | how it was run |
| --- | --- | --- | --- | --- | --- |

## 2. The G5 checklist (spec 13 row P5), each item mapped to its evidence

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | one-iteration displacement parity with the CPU FR oracle (<= 1e-4) | `test/layouts/fr-inspect.test.ts` (`displacement` key), tolerance `fr-displacement` = <value> (basis <row>) | <max error over the fixtures> | pass / fail |
| 2 | fixed nodes immobile | `fr-inspect.test.ts` pinned case, `fr-behaviour.test.ts` case 4, `fr-layout-oracle.test.ts` with a mask, `test/browser/spring-layouts.test.ts` | bitwise | pass / fail |
| 3 | output NOT rescaled when `fixed` is given | `fr-behaviour.test.ts` case 4 (`scale: 3, center: [10, 20, 0]`, the analytic box), `fr-layout-oracle.test.ts` scale / center case (tolerance `fr-layout-oracle`) | <the free rows' bounding box; the layout-oracle error at k = 20> | pass / fail |
| 4 | the preset settles within 1,000 steps on the 150 / 250 story graph to an edge-length distribution within 25% of ngraph's | `test/layouts/se-settle.test.ts` (both adapters), `test/browser/spring-layouts.test.ts` case 4 | GPU stop <n> its, ngraph stop <n> steps; q10 / q50 / q90 GPU <..> vs ngraph <..>, worst <pct>% | pass / fail |
| 5 | T-14 recorded | section 3 | <two medians> | pass / fail |
| 6 | rule (f): sabotage rows per kernel branch, each >= 10x | `test/sabotage/fr.test.ts`, `se.test.ts` | 25 rows; smallest ratio <r> | pass / fail |
| 7 | rule (f): `inspect()` stage comparisons of every branch | `fr-inspect.test.ts`, `se-inspect.test.ts` (7 + 8 stage keys) | <worst stage error> | pass / fail |
| 8 | rule (f): a noise-floor row and a derived tolerance per tolerance | section 4; `noise-floor.json` tolerances `fr-*` / `se-*` | 46 tolerances (23 per model, ten of them `.cross`), every one under its cap | pass / fail |
| 9 | the oracle cross-checked against an independent implementation (11.4) | `test/oracle/spring-electrical-ngraph.test.ts` (1e-9 vs ngraph, theta 0); `fr-layout-oracle.test.ts` vs @graphty/layout | <errors> | pass / fail |
| 10 | run twice bitwise; subgroup twins in-process; the no-subgroups pass | every `fr-*` / `se-*` suite; `fr-twins.test.ts`; Step 1's twin pass | <twin errors> | pass / fail |
| 11 | lifecycle: leak 0, `E_RELEASED`, device loss | `fr-lifecycle.test.ts` | 0 live buffers | pass / fail |
| 12 | browser smoke on SwiftShader and NVIDIA-Chromium | `test/browser/spring-layouts.test.ts` | <two run lines> | pass / fail |
| 13 | FA2 unchanged: every committed FA2 noise fixture still matches | `fa2-inspect.test.ts`, `fa2-twins.test.ts` after P5-T2 | bitwise | pass / fail |
| 14 | the lavapipe lane budget (T-12) | Step 1's timed run | <s> of 900 | pass / fail |
| 15 | `CLAUDE.md` step 6: the fast-check property rows of both models | `test/layouts/fr-properties.test.ts`, `se-properties.test.ts` (7 + 7 rows, numRuns 200) | <wall time per file on lavapipe> | pass / fail |
| 16 | `CLAUDE.md` step 6: the force-sum invariant (every P5 law is antisymmetric) | `fr-force-sum.test.ts`, `se-force-sum.test.ts`; tolerances `fr-force-sum` / `se-force-sum` | <worst ratio per model> | pass / fail |
| 17 | `CLAUDE.md` step 6: distributional parity after 100 iterations | `fr-distributional.test.ts`, `se-distributional.test.ts`; tolerances `fr-distributional` / `se-distributional` | admitted cases <list, with the oracle's own spread per candidate>; worst error <e> | pass / fail |

## 3. T-14 (spec 10.4; `benchmarks/results/<class>.json`, session <date>)

| Id | Benchmark (group / name) | Target | Measured median of 5 (ms) | min / max (ms) | Rate | Pass |
| --- | --- | --- | --- | --- | --- | --- |
| T-14 | layout-fr / fr ms/iteration (profiler) n=10000 [10k] | recorded | <median> | <min> / <max> | <rate> | recorded |
| T-14 | layout-fr / fr ms/iteration (profiler) n=100000 [100k] | recorded | <median> | <min> / <max> | <rate> | recorded |
| -- | layout-fr / se ms/iteration (profiler) n=10000 [10k] | recorded | <median> | <min> / <max> | <rate> | recorded |
| -- | layout-fr / se ms/iteration (profiler) n=100000 [100k] | recorded | <median> | <min> / <max> | <rate> | recorded |

The same four rows for `gpu-linux-t4` once the lane has run (`{{OPEN: P5-T8 Step 3}}` until then).

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

A tolerance the recording run derived ABOVE its P5 cap does not close the gate by itself: 10.4 (`:3397-3402`) requires the owner either to re-fix the cap in a recorded decision or to keep the phase open; section 7 is where that decision is written, and the checklist's item 8 says `fail` honestly either way.

- [ ] **Step 3: Update the package CLAUDE.md**

The inventory lines and the `layout-fr` groups-table row of the Files list above (the row's cells: group `layout-fr`; rows "one `createFruchtermanReingold` and one `createSpringElectrical` simulation per rung 10k / 100k (E = 10n, 2D, `repulsion: \"exact\"`), the same warm-up burst and `reheat()` + `step(1)` protocol as `layout-exact`; four rows per rung: `fr` / `se` x `step(1) wall` / `ms/iteration`"; target "T-14 (the two `fr ms/iteration` rows)"), and a "Settled at G5" table (the shape of `CLAUDE.md:360-363`) with: the measured FR / spring stage noise floors on NVIDIA and lavapipe, the T-14 medians, the story-graph settle counts (GPU iterations, ngraph steps) and the three quantiles on both sides, the lavapipe node-project wall time, and the SwiftShader compile-matrix time after PD-9.

- [ ] **Step 4: Commit (owner)** -- `docs(webgpu-graph-algorithms): close the G5 gate record` through `tools/commit-changes.sh`. Then the PR: it carries the `gpu` label so `gpu.yml` runs on it, and `release.yml`'s gate job requires that lane green before any publish.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Phase step 0 | the worktree `.worktrees/gpu-scale-layouts` on `feat/gpu-p5-p4` exists (0.1); `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,layout` if `node_modules` or the two `dist/` are missing |
| P5-T1, P5-T2, P5-T3 | one `tools/commit-changes.sh` run per task, with the subject the task's Commit step names |
| P5-T5 step 1 | `cd $PKG && pnpm add -D 'ngraph.forcelayout@^3.3.1' 'ngraph.graph@^20.0.1'` (an agent may run this: it is not git), then the task's commit |
| P5-T4 (after P5-T5) | one commit; its recording run (Step 4) needs the NVIDIA card and lavapipe in turn, both on the dev box |
| P5-T6, P5-T7 | one commit each |
| P5-T8 step 2 | `cd $PKG && eval $GPU_NV XDG_RUNTIME_DIR=/tmp pnpm run bench && node tmp/p5/append-session.mjs benchmarks/out/nvidia-lovelace-driver580.json benchmarks/results/nvidia-lovelace-driver580.json && node scripts/bench-compare.js` on a quiet card, then the task's commit |
| P5-T8 step 3 | push the branch, open the PR, `gh pr edit <n> --add-label gpu`, then `gh run download <run id> -n gpu-results-<run id> -D $PKG/tmp/p5/t4` and the same append script into `benchmarks/results/gpu-linux-t4.json`; the `record the layout-fr T4 lane baseline` commit |
| P5-T9 | one commit |
| P5-T10 | `tools/commit-changes.sh` with a type `docs` subject and NO scope |
| P5-T11 | fill and sign `webgpu-graph-algorithms/docs/decisions/G5.md`, then the final commit and the PR merge once `ci.yml`, `hosts.yml` and `gpu.yml` are green |

The agent never runs any of these git steps; it prepares the tree and verifies the results. In particular the agent never runs `git worktree`, `git stash`, `git checkout` or `git reset`: in a subagent they block on a prompt nobody answers.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| The `fixed` seam | P5-T1 | `pnpm exec vitest run --project=node test/layouts/force-simulation.test.ts` | a model's mask reaches the device at load with no reheat (G5 item 2's root) |
| The constants | P5-T1 | `pnpm exec vitest run --project=node test/device/constants.test.ts` | `FR_DEFAULTS` / `SE_DEFAULTS` are the CPU's and ngraph's numbers |
| The compile matrix | P5-T2 | `pnpm exec vitest run --project=node test/kernel/wgsl-compile.test.ts` | 203 cases on the real device and `backend=null`, both twins (PD-9) |
| The bind-group budget | P5-T2 | `pnpm exec vitest run --project=node test/kernel/bind-group-budget.test.ts` | every count unchanged (PD-1) |
| FA2 bitwise unchanged | P5-T2 | `pnpm exec vitest run --project=node test/layouts/fa2-inspect.test.ts test/layouts/fa2-twins.test.ts test/sabotage/fa2.test.ts` | the committed FA2 fixtures still match (G5 item 13) |
| The FR oracle's arithmetic | P5-T3 | `pnpm exec vitest run --project=node test/oracle/oracles.test.ts` | the three hand-computed cases |
| FR options and behaviour | P5-T3 | `pnpm exec vitest run --project=node test/layouts/fr-options.test.ts test/layouts/fr-behaviour.test.ts` | the 11.4 pins, the temperature schedule, `fixed` at load, not rescaled (G5 items 2, 3) |
| FR stage parity and displacement | P5-T4 | `pnpm exec vitest run --project=node test/layouts/fr-inspect.test.ts` | every stage within its traced tolerance; displacement <= 1e-4 (G5 item 1) |
| FR trajectory, twins, layout oracle, lifecycle | P5-T4 | `pnpm exec vitest run --project=node test/layouts/fr-trace.test.ts test/layouts/fr-twins.test.ts test/layouts/fr-layout-oracle.test.ts test/layouts/fr-lifecycle.test.ts` | G5 items 9, 10, 11 |
| The property rows (step 6) | P5-T3, P5-T5 | `pnpm exec vitest run --project=node test/layouts/fr-properties.test.ts test/layouts/se-properties.test.ts` | fixed, setPosition, settle, reheat, remapped load, the z rule and the per-node displacement bound hold over 200 random draws per row (G5 item 15) |
| The force-sum invariant (step 6) | P5-T4 | `pnpm exec vitest run --project=node test/layouts/fr-force-sum.test.ts test/layouts/se-force-sum.test.ts` | `\|sum F\| <= tol x sum \|F\|` on every fixture including the coincident one (G5 item 16) |
| Distributional parity (step 6) | P5-T4 | `pnpm exec vitest run --project=node test/layouts/fr-distributional.test.ts test/layouts/se-distributional.test.ts` | the admitted cases' metrics within the traced 10% after 100 iterations (G5 item 17) |
| The spring oracle vs ngraph | P5-T5 | `pnpm exec vitest run --project=node test/oracle/spring-electrical-ngraph.test.ts` | 1e-9 against ngraph at theta 0 (G5 item 9) |
| The preset settles like ngraph | P5-T5 | `pnpm exec vitest run --project=node test/layouts/se-settle.test.ts` | settled under 1,000 iterations; quantiles within 25% (G5 item 4) |
| Spring stage parity | P5-T4 | `pnpm exec vitest run --project=node test/layouts/se-inspect.test.ts test/layouts/se-trace.test.ts` | every stage within its traced tolerance (G5 item 7) |
| The barrel and the accelerator | P5-T6 | `pnpm exec vitest run --project=node test/index.test.ts test/accelerator.test.ts` and `pnpm run lint` | four new values, two members, the five pinned lists |
| Sabotage | P5-T7 | `pnpm exec vitest run --project=node test/sabotage` | every P5 row breaks its check by >= 10x (G5 item 6) |
| The noise floor | P5-T4 | `pnpm exec vitest run --project=node test/noise-floor.test.ts` | 46 P5 tolerances, each under its cap (G5 item 8) |
| The no-subgroups twin | P5-T7 | `GRAPHTY_GPU_NO_SUBGROUPS=1 pnpm exec vitest run --project=node test/layouts` | the FR / spring paths agree without the feature |
| T-14 | P5-T8 | `pnpm run bench` then `node scripts/bench-compare.js` | the two baselines carry `layout-fr`; the medians are in G5.md section 3 |
| Browser smoke and the FR frame loop | P5-T9 | `GRAPHTY_BROWSER_GPU=swiftshader GRAPHTY_GPU_REQUIRE=any node scripts/run-browser-project.js` | G5 item 12 |
| Coverage | P5-T11 | `pnpm exec vitest run --project=node --coverage` on lavapipe | at or above 80 / 80 / 75 / 80, never lowered |
| Plain ASCII | P5-T11 | `LC_ALL=C grep -rnP '[^\x00-\x7F]' src test benchmarks docs \| wc -l` | 0 |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-P5-1 | P4 lands first and rewrites `forceatlas2.ts`, `force-simulation.ts`, `kernels.ts` and the K3 body under this plan's feet. | 0.3 names every shared file; every edit of this plan is a complete before / after; the P5 edits to the four bodies are ADDED lines around unchanged P3 `find` strings, so a three-way merge keeps both. The `LAW` override on the grid near-field kernel is the one item that belongs to whichever lands second (0.7). |
| R-P5-2 | PD-9's 53 extra compile cases push the SwiftShader compile-matrix test (`test/browser/compile-matrix.test.ts`) past the "light browser testing" budget of design 11.6. | P5-T2 Step 8 measures it; the remedy G2 recorded applies: the browser case list is a subset chosen in that test, not in the generator. K2's 49 cases have no twin (`needs: []`), so the matrix grows by 53 cases and 53 pipelines, not 106. |
| R-P5-3 | The FR displacement floor on NVIDIA lands above the 1e-4 cap (a floor above the cap is a finding, 11.9 item 3). | The FR pair body is one division and a multiply, the attraction one multiply per arc, and the cap holds for the FA2 force with the SAME tile order (`fa2-skeleton.force` = 3.4e-6, `CLAUDE.md:333`), so the expected floor is 1e-6 with 100x headroom. If it lands above, `tolerances.mjs`-style derivation shows which stage, and 10.4's owner-decision rule applies in G5.md section 7. |
| R-P5-4 | The preset settles under the shared rule at a point ngraph would call unstable, or vice versa, and the 25% quantile comparison misses. | Both stops are printed and recorded; the quantiles are compared on the FINAL layouts of each rule, and P5-T5 Step 4 first checks the two f64 implementations agree distributionally at 1,000 steps before the GPU is blamed. DEP-P5-A's record states the reversal condition. |
| R-P5-5 | A `LAW != 0` combination with `LINLOG = true` or `DISTRIBUTED = true` compiles to nonsense nobody tests. | No factory emits it (the FR / spring override sets are constants); the matrix compiles it (a superset by design, `override-matrix.ts:14-21`); the bodies apply the FR / spring `w` BEFORE the linlog select, so the combination is well defined even if useless. |
| R-P5-6 | The `velocity`-in-`oldForce` trick (PD-2) breaks when K5's `store_old(i, f)` runs under `SWING_MODE = 0`. | PD-20: both new models compile `SWING_MODE = 1`; `se-options.test.ts` pins the override set and `se-trace.test.ts`'s `euler-velocity-not-stored` sabotage row proves the stored velocity is what the next iteration reads. |
| R-P5-7 | `Fa2Params` growing to 128 bytes collides with P4's GridSpec. | PD-3 appends after `pad` and never touches bytes 0-95; P4's field lands in `pad` as the P3 comment reserves. 128 < 256 (`UNIFORM_SLOT_BYTES`), so the ring slot is unchanged. |
| R-P5-8 | The reheated FR temperature is anchored one batch late when a `reheat()` arrives while a batch is in flight. | PD-5 anchors at the first `paramsFor` AFTER the reheat, which is the first iteration RECORDED after it; the in-flight batch was computed before the reheat and its `settledCount` is already taken as 0 by `force-simulation.ts:1409-1411`. `fr-behaviour.test.ts` case 6 measures the anchor with batches of 1, 5 and 8. |
| R-P5-9 | The 100k FR / spring rungs on the exact tier take long enough on the T4 to push `gpu.yml` past its 20-minute budget (T-12). | Each rung is one warm-up burst (500 ms) plus six timed `step(1)` calls: at ~18 ms per iteration that is under 2 s per row; the T4's 2-3x slower tile is still seconds. If the lane budget is hit, the 100k rungs move behind a `--full` flag by an owner decision recorded in G5.md. |

---

## 8. Writing-plans self-review

### 8.1 Spec coverage -- every deliverable of design 13 row P5 has a task

The row is `design/webgpu/webgpu-acceleration-plan.md:4212`. Item by item:

| Deliverable (verbatim from the row) | Task |
| --- | --- |
| `createFruchtermanReingold` (7.20: `LAW = FR`, temperature slots, `FR_APPLY`, `fixed`, the `\|\| 0.1` guard, `reheat` at 0.7, `FruchtermanReingoldStats`) | P5-T2 Steps 2-4 (`LAW` 1 on K2 / K3, `APPLY` 1 on K5), P5-T3 Step 3 (the temperature slots through `paramsFor`, PD-5; `reheat` at 0.7), P5-T1 Steps 2-3 + P5-T3 (`fixed` through `ModelInputs`, PD-6), P5-T2 Step 3 (the guard: the FR law is unfloored above the coincident threshold, PD-10), P5-T1 Step 3 (the stats record) |
| `createSpringElectrical` (the preset of 7.20 with the velocity integrator, ngraph's option names and settle rule, `SpringElectricalStats`) | P5-T5 Step 4 (the model), P5-T2 Step 4 (`APPLY` 2, the Euler integrator: DEP-P5-B), P5-T1 Step 1 (`SE_DEFAULTS` = ngraph's names and defaults), DEP-P5-A (the settle rule), P5-T1 Step 3 (the stats record) |
| FR oracle | P5-T3 Step 1; the spring oracle P5-T5 Step 2, checked against ngraph |
| browser smoke | P5-T9 Step 3 |
| `layout-fr` benchmarks | P5-T8 Steps 1-4 |
| `GpuAccelerator.fruchtermanReingold` / `springElectrical` | P5-T6 Step 2 |
| G5: one-iteration displacement parity with the CPU FR oracle (<= 1e-4) | P5-T4 Steps 1-2 (`displacement` key, cap 1e-4), P5-T4 Steps 3-4 (the derived tolerance) |
| G5: fixed nodes immobile | P5-T3 Step 2 (behaviour case 4), P5-T4 Step 2 (the pinned capture, the layout-oracle mask case), P5-T9 Step 3 |
| G5: output NOT rescaled when `fixed` is given | P5-T3 Step 2 (behaviour case 4, the analytic box), P5-T4 Step 2 (`fr-layout-oracle.test.ts`, the scale / center case under the derived tolerance) |
| G5: the preset settles within 1,000 steps on the 150 / 250 story graph to an edge-length distribution within 25% of ngraph's (ngraph a devDependency of the test only) | P5-T5 Steps 1-3 (`storyGraph`, `se-settle.test.ts`, PD-13, PD-14) |
| G5: T-14 recorded | P5-T8 Steps 2-4, P5-T11 Step 2 section 3 |
| rule (f): sabotage, `inspect()` comparisons, noise-floor rows for every kernel the phase adds (applied to every branch) | P5-T7 Steps 1-2 (sabotage: three rows per branch of K1, K2, K3, K5), P5-T4 Step 2 (inspect, both models), P5-T4 Steps 3-4 (noise rows) |
| the package's own step 6 for a layout model (`CLAUDE.md:445-451`): the fast-check property rows, the force-sum invariant where the law is antisymmetric, distributional parity, the frame loop, lifecycle | P5-T3 Step 2 (`fr-properties.test.ts`), P5-T5 Step 3 (`se-properties.test.ts`), P5-T4 Step 2 (`fr-force-sum`, `se-force-sum`, `fr-distributional`, `se-distributional`), P5-T9 (frame loop), P5-T4 Step 2 (`fr-lifecycle`) |
| the second and third layouts selectable by type (9.3 table) | P5-T6 (the members `createSimulation` dispatches on, `layout/src/simulation/create-simulation.ts:31-42`); routing `ngraph` to the preset stays Q-9's (0.7) |

Every G5 clause has a row in the verification matrix (7.2) and a numbered row in the G5 record template (P5-T11 Step 2).

### 8.2 Placeholder scan

Searched this document for `TBD`, `TODO`, `FIXME`, `XXX`, `similar to`, `as appropriate`, `and so on`, `etc.`, `write tests for the above`, `add error handling`: no occurrence. The `<...>` cells that remain are inside the G5 record TEMPLATE (P5-T11 Step 2), where they are the house convention for a value the owner copies from a named command's output, each labelled with the command that fills it. The repeated-edit cases are given as complete text rather than prose: the four WGSL edits with their exact before / after lines (P5-T2 Steps 2-5), the three block field lists (P5-T2 Step 1), the 25 sabotage rows with their exact `find` / `replace` strings (P5-T7 Step 1), the two accelerator methods (P5-T6 Step 2), the constants (P5-T1 Step 1), the two resolved records and four stats records (P5-T1 Steps 2-3), and the deliverable-to-task map above. Where a task names a class by its members instead of its full text (the FR and spring models, the two oracles, the parity helpers), the members, their types, their override constants and the file whose corresponding function is the template are all named line by line, so an executor writes code, not design.

### 8.3 Type-consistency check across the tasks

- `ModelInputs.fixed?: NodeMask | null | undefined` is added in P5-T1 Step 6 and produced by `FruchtermanReingoldModel.inputs()` (P5-T3 Step 3); the spring model and `ForceAtlas2Model` omit it, which the optional member allows; `ForceSimulation.load()` reads it in the check phase and applies it in the mutate phase, both in P5-T1 Step 6.
- The override sets: FR `{ LINLOG: false, DISTRIBUTED: false, TIER: 0, SWING_MODE: 1, STRONG_GRAVITY: false, GRAVITY_CENTER: 0, LAW: 1, APPLY: 1, STATS_MODE: 1 }` (P5-T3 Step 3, pinned by `fr-options.test.ts` case 6) and spring `{ ..., LAW: 2, APPLY: 2, STATS_MODE: 2 }` (P5-T5 Step 4, pinned by `se-options.test.ts`) name exactly the axes P5-T2 Step 6 declares (`LAW` on K2 and K3, `APPLY` on K5, `STATS_MODE` on K1) with the values P5-T2 Step 6 adds to `U32_OVERRIDE_VALUES` ({0, 1, 2} each); `subset()` (P5-T1 Step 4, `model-common.ts`) copies only the names each kernel's defaults record lists, so K1 receives `STATS_MODE` alone and K3 never receives `APPLY`.
- The `Fa2Params` fields P5-T2 Step 1 declares (`frK`, `temperature`, `springLength`, `springCoefficient`, `coulomb`, `dragCoefficient`, `timeStep`, `pad1`) are the names the bodies read (`P.frK`, `P.temperature` in K2 / K3 / K5 / K1; `P.springLength`, `P.springCoefficient` in K2; `P.coulomb` in K3; `P.dragCoefficient`, `P.timeStep` in K5) and the names `paramsFor` writes in P5-T3 Step 3 and P5-T5 Step 4; `Fa2State.temperature` / `.kineticEnergy` are what K1 writes (P5-T2 Step 5), what `onLoad` seeds (P5-T3 / P5-T5) and what `readStats` decodes; `Fa2Trace.modelScalar` is what K1 writes and what both `readStats` map to `temperature` / `kineticEnergy`.
- PD-2 / PD-20 chain: the spring model binds its `velocity` buffer into K3's and K5's `oldForce` slot (P5-T5 Step 4); K5 reads / stores it under `APPLY == 2u` (P5-T2 Step 4) and never runs `store_old(i, f)` because the model compiles `SWING_MODE = 1`; `se-behaviour.test.ts` resolves `inspect("velocity")` and rejects `inspect("oldForce")` (P5-T5 Step 3).
- The stats types: `FruchtermanReingoldStats` / `SpringElectricalStats` (P5-T1 Step 3) are the second type argument of the factories' return types (P5-T3 / P5-T5), the accelerator members (P5-T6 Step 2), the barrel's type list and the four `.test-d.ts` assertions (P5-T6 Step 1); both extend `LayoutStatsBase`, which `ForceSimulation`'s `Stats extends LayoutStatsBase` bound requires (`force-simulation.ts:561-564`).
- Tolerance ids appear three times and agree: `FR_STAGE_TOLERANCE` / `P5_TOLERANCE_CAPS` (P5-T4 Step 1: twenty-three `fr-*` ids, ten of them the `.cross` ids of the ten FR members), `SE_TOLERANCE_CAPS` (P5-T4 Step 1: `se-inspect.attraction`, `se-force-parity`, `se-force-sum`, `se-inspect.positions`, `se-inspect.velocity`, `se-displacement`, `se-inspect.partials`, `se-inspect.scene`, `se-inspect.k1`, `se-trajectory`, `se-distributional`, `se-twins.force`, `se-twins.positions` plus the ten `.cross` ids of the ten spring members -- twenty-three `se-*` ids), the noise members' `stageTolerances` ids (P5-T4 Step 3) and the G5 record's items 1 and 8; the recording run derives 46, the count P5-T4 Step 4 expects and the G5 template's item 8 reads. Every cap entry's `basis` is a row id of the form `<id>.oracle-f64`, `<id>.twin` or `<stem>.cross` that a Step 3 member records (`noise-floor.test.ts:454,996-998`), the two `*-force-sum` entries riding their model's `*-force-parity.oracle-f64` row as `fa2-force-sum` does.
- The sabotage `find` strings (P5-T7 Step 1) are substrings of the lines P5-T2 Steps 2-5 write, and none is a substring of a P3 row's line; the P3 `find` strings listed in 0.1 survive P5-T2 unchanged, which `test/sabotage/coverage.test.ts` proves at P5-T2 Step 6.
- File ownership: each file appears under `Create:` or `Modify:` in exactly ONE task, checked by listing every `Create:` / `Modify:` path of the eleven tasks. P5-T1: `model-common.ts`, `constants.ts`, `types/options.ts`, `types/layout.ts`, `force-simulation.ts`, `test/layouts/force-simulation.test.ts`, `test/device/constants.test.ts`. P5-T2: `kernels.ts`, the four WGSL bodies, `forceatlas2.ts`, `test/helpers/override-matrix.ts`, `test/kernel/wgsl-compile.test.ts`. P5-T3: `fruchterman-reingold.ts`, `test/oracle/fruchterman-reingold.ts`, `test/oracle/oracles.test.ts`, `fr-options.test.ts`, `fr-behaviour.test.ts`, `fr-properties.test.ts`. P5-T4: `fr-parity.ts`, `se-parity.ts`, `fa2-parity.ts`, the five `fr-*` parity / lifecycle suites, `fr-force-sum.test.ts`, `fr-distributional.test.ts`, `se-inspect.test.ts`, `se-trace.test.ts`, `se-force-sum.test.ts`, `se-distributional.test.ts`, `test/noise-floor.test.ts`, `noise-floor.json`, the noise fixtures. P5-T5: `package.json`, `pnpm-lock.yaml`, `spring-electrical.ts`, `test/oracle/spring-electrical.ts`, `spring-electrical-ngraph.test.ts`, `story-graph.ts`, `se-options.test.ts`, `se-behaviour.test.ts`, `se-properties.test.ts`, `se-settle.test.ts`. P5-T6: `src/index.ts`, `src/accelerator.ts`, `src/types/accelerator.ts`, `test/index.test.ts`, `test/accelerator.test.ts`, the four `.test-d.ts` files. P5-T7: `test/helpers/sabotage.ts`, `test/sabotage/fr.test.ts`, `test/sabotage/se.test.ts`. P5-T8: `layout-fr.bench.ts`, `layout-exact.bench.ts`, `benchmarks/run.ts`, `test/benchmarks.test.ts`, the package `README.md`, the two baseline JSON files. P5-T9: `test/helpers/frame-loop.ts`, `fr-frame-loop.test.ts`, `test/browser/spring-layouts.test.ts`. P5-T10: the three decision records, `design/decisions/README.md`, `design/README.md`, `design/webgpu/README.md`. P5-T11: `docs/decisions/G5.md`, the package `CLAUDE.md` (its `layout-fr` groups-table row included, so P5-T8 does not touch the file). No path appears twice; the parity suites are created asserting and never edited by a later task (PD-21).
- Commit subjects: twelve commits -- `webgpu-graph-algorithms` x11 (`feat` T1, T2, T3, T5, T6, T8 and T8's lane-baseline follow-up; `test` T4, T7, T9; `docs` T11) and ONE with no scope, typed `docs` (T10). Every subject starts lowercase after the colon, is at most 100 characters (`tools/commit-changes.sh:437` `SUBJECT_MAX=100`; four of them are 97, counted with a script over the twelve strings), and none ends in a full stop.
