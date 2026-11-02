# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/webgpu-graph-algorithms package.

Read `design/webgpu/package-reference.md` before benchmarking, changing a kernel's tuning or a test lane, adding a
layout model, or when a platform fact below needs its evidence.

## Project Overview

@graphty/webgpu-graph-algorithms runs graph algorithms and force-directed layouts on the GPU through WebGPU, over the
frozen CSR snapshot of @graphty/graph-format, from Node (Dawn via the `webgpu` npm package) and from browsers
(Chromium). One runtime-agnostic core, two thin acquisition entries (`./browser`, `./node`). There is NO fallback of
any kind: no CPU path, no WebGL path, no silent acceptance of a software adapter in `src/`; when no adapter or device
exists the package throws `WebGpuGraphError` (root CLAUDE.md; plan section 2.4).

The normative documents, in order of authority (paths from the monorepo root):

- `design/webgpu/plans/2026-09-14-webgpu-p0-p3-interfaces.md` (the "contract"): every file, signature, WGSL body and
  test of P0-P3; copy declarations from it, never re-derive them.
- `design/webgpu/webgpu-acceleration-plan.md` (the "spec"): runtime (2), architecture (3), memory (4), kernels (5),
  primitives (6), layouts (7), algorithms (8), integration (9), targets (10), testing (11), CI (12), gates (13).
- `docs/decisions/G<n>.md`: what each gate measured and signed off; re-fixed constants cite them.
- `docs/research/`; `docs/HEADLESS_GPU_REPORT.md` is the verified recipe for the real GPU under headless Chromium.

Where the contract is silent, choose the simplest option consistent with the spec and record it as a `PLAN DECISION`
in the phase plan; where it is wrong, change the contract first.

## Layers

`device < context < memory < kernel < kernels.ts < primitives < algorithms / layouts < accelerator < managed.ts <
entries` (spec 3.2), enforced by the eslint zones and `test/layers.test.ts`. A lower layer never imports a higher
one; `context.ts` alone constructs memory and kernel; `src/kernel/**` may `import type` from `src/memory/**` but no
value; `src/wgsl/**` is imported only by `src/kernels.ts` (THE registry of every `WgslModuleSpec`); `src/types/**`
holds types only; `src/browser` (the ONLY place that may reference `navigator`) and `src/node` (the ONLY file naming
the `webgpu` module, inside a dynamic `import()`) are imported by nothing else; `src/errors.ts` and
`src/constants.ts` import nothing. The core never references `navigator`, `window`, `document`, `process` or
`webgpu`; numeric WebGPU constants live in `src/device/webgpu-constants.ts` (Dawn installs `GPUBufferUsage` only
after `Object.assign(globalThis, dawn.globals)`). `src/index.ts` is the only public barrel. The adapter policy has
ONE copy, `scripts/gpu-policy.js`; the runner-class rule ONE copy, `scripts/runner-class.js`.

## Essential Commands

```bash
pnpm run build:all          # tsc -p tsconfig.build.json, then the multi-entry vite bundle and the d.ts shims
pnpm run lint               # eslint + tsc --noEmit + tsc -p tsconfig.strict-consumer.json (build first)
pnpm run test:node          # the whole node suite, one file at a time; the default adapter
pnpm run coverage           # the node suite with the 80/80/75/80 thresholds
pnpm run test:browser:ci    # node scripts/run-browser-project.js (SwiftShader unless GRAPHTY_BROWSER_GPU=nvidia)
pnpm run test:limits        # vitest run --project=node-limits (GPU lane only)
pnpm run bench              # tsx benchmarks/run.ts -> benchmarks/out/<runner-class>.json
pnpm run bench:compare      # regression check against the pinned best of benchmarks/results/<runner-class>.json
pnpm run bench:ab --base <rev>   # paired ABBA check of a change on one card; fails when the lower bound > 1.08
pnpm run gpu:report         # node scripts/gpu-report.js (after build:all): adapter report, policy exit code
pnpm run ready:commit       # build:all, lint, test:node
cd .. && pnpm exec knip     # unused files / exports / dependencies, every workspace
```

Build @graphty/graph-format AND @graphty/layout first (`pnpm exec nx run-many -t build
--projects=graph-format,layout` from the root): tests and tsconfigs resolve their BUILT output.

Benchmarks in short (full rules in the reference file): never time or commit a software-adapter session, nor one
measured while anything else used the card; the baseline is the pinned best across sessions; `bench:compare` fails
only when both median and minimum exceed 1.35x AND rose by >= 2.5 ms, and skips when nvidia-smi shows the card busy;
watch the SM clock (`nvidia-smi --query-gpu=clocks.sm,pstate`), since an idle-parked card reads 4-15x slow.
`EXACT_MAX_NODES` stays 32768 by owner decision G4-D1 although the 7.8 rule now computes 1024: `"auto"` is every
consumer's default and the exact tier is the accurate one, so the switch waits for the accuracy work of G4-F1.

## WGSL Conventions

- WGSL is TypeScript (D9): `src/wgsl/<name>.wgsl.ts` exports ONE constant, the kernel BODY (`` /* wgsl */ `...` ``):
  no `@group(` or `override ` lines, exactly one `@compute` entry point.
- `composeWgsl(spec, caps)` (`src/kernel/wgsl.ts`) emits the bindings and override lines from ONE `WgslModuleSpec`;
  `Kernel` derives the bind group layout from the same list. Unknown override keys, unmatched `//@@NAME@@` markers or
  snippets, and reserved words are `E_SHADER_COMPILE { stage: "compose" }`.
- The prelude and every numeric constant are interpolated from `src/constants.ts`; a test greps bodies for literal
  `65535u`, `256u`, `0xFFFFFFFFu`.
- Uniformity: barriers and subgroup builtins only in UNIFORM control flow (guarded work into locals, reductions after
  the guard; an early `return` keys on `workgroup_id` and uniforms only).
- Fully parenthesize hash expressions (WGSL refuses `*` mixed with `^` / `&` / `|`).
- Subgroups (D16): read `subgroup_size` at runtime, no `@builtin(subgroup_id)`, scratch sized by `SUBGROUP_MIN`;
  every subgroup kernel has a twin without subgroups, tested in-process.
- Bind groups: 0 graph (`rowPtr`, `colIdx`, `weights` | dummy, `perm` | dummy), 1 state, 2 params uniform (dynamic
  offset into `UniformRing`), 3 cold. Never more than 8 storage buffers per stage: SPLIT the kernel instead.
- Uniform and storage structs are GENERATED by `UniformBlock` (D20), strict 16-byte layout; never hand-written.
- Pipeline identity is `(id, overrides, needs present on device, snippets)`; `src/kernels.ts` lists every spec.

## House Style

As graph-format and graph-io (spec 3.6): JSDoc on every export; explicit return types; inline `type` import
qualifiers; `.js` suffixes; no default exports; `curly`; `default-case`; no `console.log` in `src/` (`console.warn`
only for the residency warning); interface options `?: T | undefined`, optional parameters `?: T`; absent output is
`null`; every throwing call leaves state unchanged; no `eslint-disable`, no `@ts-expect-error` outside negative type
tests; plain ASCII everywhere (non-ASCII test data via `String.fromCharCode`); prettier 4 / 120; knip clean. Results
are `U32` / `F32` arrays; `INVALID_INDEX` is the only sentinel; never a bitwise operator on an arc index or byte
offset, never a write into a view, never a zero-length binding (bind a dummy), never a CPU fallback. Tests use vitest
globals and fast-check. `@internal` stands alone on its JSDoc line. A JSDoc line never starts with `@<number>`.

## Testing

| Project       | Contents                                                                      | Default lane | GPU lane |
| ------------- | ----------------------------------------------------------------------------- | ------------ | -------- |
| `node`        | every unit / kernel / primitive / algorithm / layout test; 80/80/75/80        | lavapipe     | NVIDIA   |
| `node-limits` | tests needing real device limits or time (`test/limits/**`)                   | no           | yes      |
| `browser`     | `test/browser/**`, Playwright Chromium, flags chosen by `GRAPHTY_BROWSER_GPU` | SwiftShader  | NVIDIA   |

Rules of every test (spec 11.2, 11.9): a wrong result is never a skip; every kernel result is compared to an oracle or
an invariant; every kernel test runs twice and asserts bitwise equality (or a `run-twice exempt:` header says why);
every `uncapturederror` fails the test; fixture sizes scale with `gpuScale()` (1/50 on software). A test counting
pipelines or `mapAsync` calls must `await verifyDevice(ctx)` first. No test sets a time limit (`local/no-test-timing`;
the monorepo's one hang guard); a slow adapter gets LESS WORK via `gpuScale()`, never a bigger number. Recording runs
(`GRAPHTY_NOISE_FLOOR_WRITE=1`) are `bench-<name>` projects started by hand. Never assert on a moment derived from a
rate measured once (a tick rate, a clock): reach the state by construction, or derive the window from what was
observed at the assertion.

`GRAPHTY_GPU_REQUIRE` (D19, the ONE policy variable): unset = skip with the printed `E_NO_ADAPTER` reason (local
only); `any` = an adapter must exist (default lane); `hardware` = also not software; `nvidia` (any vendor string) =
also that vendor and, in the browser, `isFallbackAdapter === false` (GPU lane). A missing required adapter fails once
in `globalSetup`. Only `test/setup/gpu.ts`, `vitest.config.ts` and `scripts/` read environment variables; `src/`
never does. The other variables' per-lane values and the Chromium flag sets are in the reference file. Run `scripts/probe-browser-flags.mjs` before guessing a Chromium flag.

```bash
GRAPHTY_GPU_REQUIRE=hardware pnpm exec vitest run --project=node --project=node-gpu-alone   # NVIDIA
GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json XDG_RUNTIME_DIR=/tmp pnpm exec vitest run --project=node --project=node-gpu-alone --coverage
GRAPHTY_BROWSER_GPU=nvidia GRAPHTY_GPU_REQUIRE=nvidia node scripts/run-browser-project.js
```

The dev box (Ubuntu 24.04, `libegl1`) reaches the NVIDIA GPU directly; a machine without `libEGL.so.1` needs the
extracted tree of `docs/HEADLESS_GPU_REPORT.md` appendix D, or Dawn sees only llvmpipe and Chromium only SwiftShader
(red under `hardware` / `nvidia`, never a silent pass). `hosts.yml` (Metal on macOS, D3D12 WARP on Windows) and the
GPU lane gate the release, not CI.

## Verified Platform Facts

Each line is the rule to obey; the measurement and evidence are in the reference file, "Verified Platform Facts".

- Plan against `device.limits`, never `adapter.limits` (a default Dawn device has spec-default limits); never assert
  `=== 256`.
- An adapter is consumed by one `requestDevice`: a FRESH adapter per device everywhere.
- `uncapturederror` is SYNCHRONOUS under Dawn-node, asynchronous in browsers: the batch checks the pending-error slot
  after submit; the browser setup drains after `onSubmittedWorkDone`.
- `backend=null` gives a compile-only adapter (the compile matrix uses it).
- `isSoftwareAdapter` keys on `architecture` first (`software`, `swiftshader`, `warp` are software), then the boolean
  `adapter.info.isFallbackAdapter`.
- A non-matching `adapter=<substring>` makes `requestAdapter()` throw; the Node setup maps it to `E_NO_ADAPTER`.
- `webgpu@0.6.x` loads only on Ubuntu 24.04+ (glibc 2.38); 0.4.0 loads on 22.04.
- Dawn 0.6.1 quantizes timestamps to 65,536 ns by default; `test/setup/gpu.ts` disables `timestamp_quantization`
  for every node project. Chromium quantizes to 100 us regardless.
- Headless Chromium reaches the NVIDIA card only with `libEGL.so.1` and the four `nvidia` flags; otherwise it runs
  SwiftShader or hangs at `newPage()`.
- Every source entry starts with `/// <reference types="@webgpu/types" preserve="true" />` (tsc drops it otherwise).
- Vitest 3 browser config: `instances: [{ browser: "chromium", launch: { args, env } }]`,
  `browser.fileParallelism: false`; env reaches the browser through both `define` and `test.env`.
- Use `pool: "forks"` with the Dawn addon.
- lavapipe caps one invocation at 65,535 loop iterations across all loops and then silently breaks: split any kernel
  whose loop count can exceed it (K3 sums at most `EXACT_TILES_PER_PASS` tiles per dispatch).
- NVIDIA parks the card at 210 MHz under sparse sub-millisecond dispatches: warm the clock before timing.
- f32 division is not correctly rounded on NVIDIA: write ratio predicates multiplied (`swing > 2.0 * traction`).
- The paper-mode FA2 trajectory is chaotic: compare per iteration, re-synchronized to the oracle.
- Both Dawn and Chromium accept a misaligned uniform struct: always generate structs with `UniformBlock`.
- WebKit fails `createComputePipeline` when `constants` names an unread override: pass only the referenced subset
  (`ComposedModule.constants`).
- Never unmap or destroy a staging buffer whose `mapAsync` is pending (RB-1; Metal crashes): every map goes through
  the readback ring.
- Vitest freezes a test's timeout at collection: give slow adapters less work, never a bigger timeout (G5-F13).
- Edit `test/browser/state-roundtrip.test.ts` together with the node one when `Fa2State` changes.
- An indirect dispatch costs ~0.4 ms of Dawn validation each (Node and Chromium), a direct one ~1-10 us: dispatch
  directly (grid-stride to a count word); nothing in the traversals dispatches indirectly.
- A traversal's uniform ring must hold the RESULT batch, which grows with n (`bfsRingSlots`).
- P4 arc windows overlap by up to 63 arcs: frontier kernels take ranges from `coreWindows(core)`.
- A directed snapshot whose reverse adjacency exceeds one binding is refused (`E_TOO_LARGE { path: "windowed" }`).
- The SSSP counters block is schedule-dependent (assert `dist`, `predArc`, `reachedCount` bitwise, not the counts);
  the BFS block is bitwise.
- Bellman-Ford's bounded compare-exchange can exhaust under descending candidates in one subgroup; `dist` stays exact.
- A zero-size view binding maps to null in `coreOfView`; `Kernel.bind` refuses a zero-length range and one buffer in a
  read-only and a read-write slot of the same kernel.
- The buffer pool does not zero reused buffers: poison before asserting an unwritten span.
- Three resident snapshots trip the residency warning: release each before the next in a loop.
- Test an f32 infinity as its BIT PATTERN (`bits == F32_INF_BITS`), never `bitcast<f32>` of it.
- `workgroupUniformLoad` works on scalars and array elements; call `wg_scan_u32` in uniform control flow, never
  interleaved with an in-flight `wg_reduce_*`.
- One `mapAsync` per submit plus one for the result batch (PD-7); settle the self-check's maps before counting.

## Adding an Algorithm / a Kernel

1. Types in `src/types/` (types only; layout types are re-exported from `@graphty/layout`).
2. Body `src/wgsl/<name>.wgsl.ts` exporting `<name>Wgsl`, to the WGSL rules above.
3. One `WgslModuleSpec` in `src/kernels.ts` (bindings, `overrideDecls`, override axes, `needs`, `uniforms`,
   `snippets`); the compile matrix and `PipelineCache.warm()` pick it up.
4. Driver: an async function in `src/primitives/` or `src/algorithms/` (`(ctx, snapshot, ...args, options?) =>
Promise<Result>`, index-aligned arrays); scratch through a `Lease`, dispatches through `CommandBatch`; empty
   ranges bind a dummy and skip.
5. Accelerator method in `src/accelerator.ts`, barrel export in `src/index.ts` (update `test/index.test.ts`,
   `test/types/public-api.test-d.ts`).
6. Oracle `test/oracle/<name>.ts`: an independent index-based f64 reference.
7. Tests: differential against the oracle on the standard fixture list, run-twice bitwise, the subgroup twin, >= 3
   sabotage mutations each failing by >= 10x the tolerance, an `inspect()` stage comparison, a noise-floor row, and a
   browser smoke test where the runtime differs.
8. Integration: the dispatcher in @graphty/algorithms (spec 9.2) or the adapter in @graphty/layout (spec 9.4).

## Adding a Layout Model

A layout is a `ForceModel<Options, Stats>` consumed by `ForceSimulation` (`src/layouts/force-simulation.ts`);
`ForceAtlas2Model` is the reference, and models over the FA2 kernels extend `ForceModelBase` and add override branches
(`LAW`, `APPLY`, `STATS_MODE`) rather than new bodies. Option types and the `LayoutAccelerator` method are added in
@graphty/layout FIRST (`layout/src/simulation/types.ts`) and re-exported here. The full eight steps (kernels, model
class, factory, f64 + f32 oracle, the spec 11.4 tests, a bench group, a `docs/decisions/G<n>.md` gate record) are in
the reference file.

## Distribution

- Root `dist/webgpu-graph-algorithms.js` plus `./browser` and `./node` subpaths, one vite build so shared code lives
  once under `dist/chunks/` (one `WebGpuGraphError` class); `@graphty/graph-format`, `webgpu`,
  `@graphty/algorithms` and `@graphty/layout` are external.
- `webgpu` is imported only by `src/node/index.ts`, inside `await import("webgpu")`; tests assert it in source and
  bundle. No `"browser"` field, no `"node"` export condition.
- `stripInternal: true`; the strict-consumer compile proves the published surface.
- `webgpu@0.6.1` is the devDependency pin and the `E_NO_WEBGPU` install hint (they move together); the peer range
  stays `>=0.4.0 <1.0.0` on purpose, because a consumer below Ubuntu 24.04 can only load 0.4.0.

## Rules that never bend

- `./node` is imported only by Node entry points and tests (spec 2.5 item 5): no browser-side file may import
  it, because Safari fails on a dynamic import of a missing module even before the import runs.
- Never create fallbacks if WebGPU isn't supported (root CLAUDE.md): no CPU path, no WebGL path, no silent
  software-adapter acceptance in `src/`; the TEST layer may skip with a printed `E_NO_ADAPTER` reason only
  under the unset policy, and a wrong result is never a skip.
- Changes ship through the pull request flow in the root CLAUDE.md ("Shipping a change"): commit in your own
  worktree and open the pull request with `tools/pr-open.sh`; never push to master and never commit scratch
  output (`tmp/`, `benchmarks/out/`). Never `sudo`; plain ASCII everywhere; no `eslint-disable`, no
  `@ts-expect-error` outside negative type tests.
