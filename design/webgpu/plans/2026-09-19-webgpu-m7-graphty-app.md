# graphty app W2 (Phase M7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; most run in `/home/apowers/Projects/graphty-monorepo`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees. **Before dispatching anything in parallel, read the "File ownership" paragraph below: M7-T5, M7-T6 and M7-T7 all edit `AppShell.tsx` and MUST run sequentially in one tree.**

**Goal:** Give the graphty app the two things that are genuinely presentation once graphty-element owns WebGPU itself: a Settings > Performance control that writes the element's `gpu` policy into its config, and a "GPU acceleration: on (vendor arch) / off" indicator drawn as a `StatusBarChip` in the frozen `issues` slot, which gains its first producer, with the device-lost report routed through the app's one toast. The app activates the element's optional peer with a single side-effect import, `import "@graphty/graphty-element/webgpu"`, and writes no probe, construct, inject or recovery code at all. Plus `metricCost.ts`'s per-metric accelerator constant, two `gpu`-tagged stories that render a deterministic no-GPU state on Chromatic, and `graphty/package.json` taking `@graphty/webgpu-graph-algorithms` as the optional peer graphty-element declares (gate G12, W2 subset).

**Architecture:** The dependency runs one way and the app is at its end (design 9.1, `design/webgpu/webgpu-acceleration-plan.md:2870-2899`): the GPU package imports only `@graphty/graph-format`; `graphty-element` owns the `accelerator` property and imports nothing from the GPU package, not even as a devDependency; the app imports the GPU package, probes, constructs and INJECTS. Nothing is returned up that chain. Inside the app the injection point is the element's `Graph`, not the DOM node and not the React component: design 9.4 item 1 (`:3075-3095`) puts `setAccelerator` on `Graph`, the DOM node never leaves `Graphty.tsx:564-571`, and the only public surface is `GraphtyHandle` (`Graphty.tsx:266-282`) whose `graph` getter (`:409-411`) is the door. The app therefore narrows that value with a runtime guard in the established seam (`components/shell/analysis/elementBridge.ts`) exactly as it narrows the graph for algorithm runs, and never casts. Everything the app then shows -- the chip, the toast, the cost gate -- reads ONE `GpuStatus` record so the surfaces cannot disagree.

**Tech Stack:** TypeScript 5.9 (strict, `moduleResolution: "bundler"`, `skipLibCheck`), React 19.1 with Mantine 8.1 and `@graphty/compact-mantine` 0.8.0, `@graphty/webgpu-graph-algorithms` 0.2.1 (its `.` and `./browser` entries) over `@graphty/graph-format` 1.0.0, vitest 3.2.7 in REAL headless Chromium through the Playwright 1.57.0 browser provider, Storybook 9.1.20 on `@storybook/react-vite` with Chromatic (`exitZeroOnChanges: false`, TurboSnap off), vite 7.3.6, pnpm 10 workspace, Nx 22, ESLint 9 flat config with eslint-plugin-jsdoc, knip, prettier (tabWidth 4, printWidth 120, trailingComma all), GitHub Actions (`ci.yml`'s `graphty` shard and `chromatic-app` job).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` (section 9.5 lines 3232-3253 -- the `attachAccelerator` sketch, normative for the ORDER of probe / create / inject; 9.1 lines 2870-2899 -- the dependency direction; 9.4 items 1 and 7 lines 3068-3230 -- what the element exposes and what `gpuMinNodes` means; 7.21 lines 2482-2518 -- the scaling table the `gpuMinNodes` measurement is based on; line 4219 -- the P12 row and G12; line 435 -- who probes) and `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (the Phase M7 block, lines 3256-3261, which this plan decomposes; its `:3259` deliverable cell is the checklist section 7.4 verifies against). Where the design's sketch and the code that exists disagree, this plan takes a PLAN DECISION and section 0.6 indexes them.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (Phases M0-M5b), `design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md` (Phase M8a), `design/webgpu/plans/2026-09-19-webgpu-m6-graphty-element.md` (Phase M6, which this plan's entry criterion names) and `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` (Phase M8b, independent of this chain).

**Gate:** G12, W2 subset (design 13 row P12, `design/webgpu/webgpu-acceleration-plan.md:4219`; restated for the app at `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260`). G12's middle clause as written -- "nightly GPU lane green for a week" -- is VOID: `design/decisions/2026-09-19-no-nightly-gpu-lane.md` removed the `schedule` trigger, and `.github/workflows/gpu.yml:1-10` says so in its own header. Task M7-T1 records the restatement; Task M7-T9 writes the record at `webgpu-graph-algorithms/docs/decisions/G12.md`.

**Tasks in this document:** M7-T1 .. M7-T9, strictly in that order with two exceptions: M7-T1 is independent of everything and may run at any point, and M7-T8 needs only M7-T5. The chain is M7-T2 (the dependency must be declared before a file imports it) -> M7-T3 (`gpuPrefs.ts` owns the three-value preference union and imports nothing) -> M7-T4 (`accelerator.ts` imports that union) -> M7-T5 (the hook imports both) -> M7-T6 and M7-T7 (both read the hook's `GpuStatus`) -> M7-T9.

**File ownership, and the one place it is shared:** `graphty/src/components/shell/AppShell.tsx` is edited by M7-T5, M7-T6 and M7-T7, in that order. Those three tasks MUST run sequentially in ONE working tree and MUST NOT be dispatched to parallel agents: the file is 5142 lines, the three edits land within 2000 lines of each other, and three agents editing it concurrently produce a tree none of the three checkpoints describes. Every other file in this phase has exactly one owning task. M7-T5's and M7-T6's edits also form a single commit (M7-T9 Step 5), which is what makes M7-T5's intermediate eslint state harmless -- see M7-T5 Step 4.

## 0.0 AMENDMENT (2026-09-19): the element owns WebGPU; this phase loses most of its scope

**Read this before any task.** The authority is
`design/decisions/2026-09-19-graphty-element-owns-webgpu.md`, and above it the root `CLAUDE.md`
"Architectural Principles": the graphty app is only HTML around graphty-element and MUST NOT
contain graph-specific functionality of any kind other than consuming it.

This plan was written from design 9.5, which made the app the only importer of the GPU package and
therefore the owner of detection, construction and device-loss recovery. That is now wrong, and it
was wrong in a specific way worth stating: every line of it is code a third-party consumer of
graphty-element would have had to rebuild, which is exactly what the principle forbids.

`@graphty/webgpu-graph-algorithms` is now an OPTIONAL PEER of graphty-element, activated by
`import "@graphty/graphty-element/webgpu"`. The element probes, constructs, attaches, applies
`gpuMinNodes` and recovers from device loss. Phase M6 Tasks M6-T19 and M6-T20 build it.

### Task deltas

| Task | Delta |
| --- | --- |
| M7-T1 | UNCHANGED. The stale commit-scope list, the Storybook certificate and the G12 restatement are unaffected. |
| M7-T2 | REDUCED. Still adds the dependency and fixes the lint build order and the CI step, but the element type shim now needs `gpuStatus` and `setAccelerator` rather than an app-side accelerator type. |
| M7-T3 | REDUCED to a Settings control. The `"auto" \| "off" \| "required"` union is no longer the app's to define or persist: it is `behavior.gpu` in ELEMENT config (Task M6-T19), and the control writes it like any other element setting. Delete the versioned localStorage key and `gpuPrefs.ts`; the element's config persistence already covers it. |
| M7-T4 | DELETED. `attachAccelerator`, the host guard and the inert calibrate arm all move into the element. The app's replacement is one line: `import "@graphty/graphty-element/webgpu";` at the app entry. `calibrateLayout` is still absent and still a P4 deliverable -- the element's factory simply does not call it yet. |
| M7-T5 | DELETED. The graph-ready polling and `useGpuAccelerator` existed to know when to inject; the element injects itself. What survives is a much smaller hook that SUBSCRIBES to the element's `gpu-status-changed` event and re-renders -- fold it into M7-T6. |
| M7-T6 | KEPT, re-sourced. The chip and the toast now read `graph.gpuStatus` and listen for `gpu-status-changed` instead of owning a `GpuStatus` the app computed. This is the model case of the principle: reading a property the element publishes and rendering it IS consuming the element. |
| M7-T7 | KEPT. The `metricCost` accelerator constant reads the element's status rather than an app-side flag. |
| M7-T8 | KEPT. The `gpu`-tagged stories now exercise the real path by importing the `webgpu` subpath in the story file. |
| M7-T9 | REDUCED. The `gpuMinNodes` MEASUREMENT moves to M6-T20, which can now reach a real GPU from the element's own Storybook. The app's G12 record keeps the app-side clauses and cites M6-T20's number. |

Net: nine tasks become seven, and the two deleted ones are the two that contained all the graph
logic. That is the intended result, not an accident of scoping -- if a task in this document could
not be deleted by a consumer who is not this app, it is in the wrong package.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit". That script's STEPS / SUBJECTS / PATHS block is data tailored to one change set (`tools/commit-changes.sh:30-34`), so the owner re-points it at this phase before running it; `--dry-run` stages nothing.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file. The script validates every message before it stages anything.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes, ` -> ` for an arrow. Each task's Checkpoint names the files it touched and runs `LC_ALL=C grep -nP '[^\x00-\x7F]'` over exactly those; no output is the pass.
- Never run `sudo`. Servers only on ports 9000-9099: the app's dev server is `PORT` from the monorepo root `.env` (9005 today; `graphty/vite.config.ts:41` defaults to 9000), its Storybook is 9035, its coverage preview 9054.
- No `eslint-disable`, `@ts-expect-error` or `@ts-ignore`; never lower a coverage threshold. `graphty/vitest.config.ts` declares NO `thresholds` today, and this plan adds none -- adding one is a separate decision about the whole app, not a side effect of a GPU phase.
- Project rule (root `CLAUDE.md`, WebGPU): never create a fallback if WebGPU is not supported. The app's "no GPU" path is the ABSENCE of a `setAccelerator` call, not a branch that reimplements anything; the element already runs the CPU simulation when `graph.accelerator` is null.
- Project rule (root `CLAUDE.md`, UI Components): use the default components; never write a bespoke control to work around one. The indicator is `StatusBarChip` (`graphty/src/components/shell/statusbar/StatusBarChip.tsx:85`), the report is `LoadCompleteToast` (`.../LoadCompleteToast.tsx:61`), the preference control is the same raw Mantine family Settings > Performance already draws (`SettingsOverlay.tsx:171-222` uses `Switch` and `NumberInput`). Nothing new is drawn.
- Project rule (root `CLAUDE.md`, Graph Styling): node and edge appearance is applied only through a style layer. Nothing in this plan writes a colour, a size or a texture to a node or an edge; the accelerator changes WHERE a layout runs, not what anything looks like.
- Project rule (root `CLAUDE.md`, visual work): a rendered result is checked with the Playwright MCP plus objective yes/no Nanobanana questions. Task M7-T9 is the one task that does this, on the real GPU.
- Temporary files under `./tmp/`; write a script there rather than repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason, and a departure that changes something the design FIXED also gets a record under `design/decisions/` per `design/decisions/README.md`. The Review log of a design document is NOT appended to: that practice was retired on 2026-09-19 after three branches collided on the file's shared end.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-19)

| Fact | Evidence |
| --- | --- |
| Master is `07fba28b test(webgpu-graph-algorithms): let the minimum confirm the median in bench:compare`, ONE commit ahead of `origin/master` (`cde458a2`) and unpushed; the only thing in the working tree is the four untracked plan files of 2026-09-19 (M6, M7, M8a, M8b), this document among them. | `git log --oneline -1`; `git status --porcelain` (four `??` lines, all `design/webgpu/plans/2026-09-19-webgpu-m*.md`) |
| `graphty` is version 0.7.0 and `"private": true`; the root `CLAUDE.md` package table still says 0.1.0. | `graphty/package.json:2-4`; root `CLAUDE.md` package directory |
| The app knows nothing about the GPU: no `graphty/src/gpu/` directory, and `grep -rn "webgpu\|navigator.gpu"` over `graphty/src` returns no non-test hit. | `ls graphty/src` (no `gpu`); the grep |
| `@graphty/webgpu-graph-algorithms` is ABSENT from graphty's dependencies and devDependencies. | `graphty/package.json:31-47,48-65` |
| ...but it ALREADY resolves from graphty, because `.npmrc` sets `shamefully-hoist=true` and the root `node_modules/@graphty/webgpu-graph-algorithms` is a symlink to the workspace directory. A probe file importing both entries type-checked clean with the package undeclared. | `.npmrc`; `ls -la node_modules/@graphty/webgpu-graph-algorithms`; `cd graphty && npx tsc --noEmit` on the probe, 0 errors (2026-09-19) |
| `graphty/src/types/graphty-element.d.ts` is a 73-line ambient `declare module "@graphty/graphty-element"`, and it WINS over `graphty/tsconfig.json:24-31`'s `paths` alias: a probe importing `type { Edge }` (which the real barrel exports at `graphty-element/index.ts:11` and the shim does not) failed with `TS2305: Module '"@graphty/graphty-element"' has no exported member 'Edge'`. | the probe run of 2026-09-19 |
| Deleting that shim leaves exactly TWO type errors, both in `graphty/src/components/Graphty.test.tsx:70-71` (`Property 'style' does not exist on type 'Element'`), and `container.querySelector<HTMLElement>(...)` fixes both. | `mv src/types/graphty-element.d.ts /tmp && npx tsc --noEmit` then the one-word edit, 0 errors (2026-09-19) |
| The app's tests run in REAL headless Chromium, and `navigator.gpu` is PRESENT there: a probe test printed `navigator.gpu present: object`. | `graphty/vitest.config.ts:16-22`; the probe run of 2026-09-19 |
| The `issues` status-bar slot is in the frozen nine-slot contract but has NO producer: `AppShell.tsx`'s slots memo builds `counts`, `layout` and `selection` and nothing else. | `graphty/src/components/shell/types.ts:700-708,734-746`; `AppShell.tsx:4253-4283` |
| The app has ONE toast, `LoadCompleteToast`, and its producer is load-scoped: `loadCompletion` returns `undefined` unless `loadFailure !== null`, even though the component's own doc generalises it to "a load ends, and this is the line that says how it ended". | `AppShell.tsx:4314-4328`; `LoadCompleteToast.tsx:1-26` |
| `@mantine/notifications` is not a dependency anywhere in the app, and `compact-mantine` publishes no toast, notification, alert or banner. | `graphty/package.json:31-65`; `compact-mantine/src/index.ts` |
| Storybook `tags` are unused in the app: the only `tags:` hit in a STORY file is row DATA in a fixture (`data-view/DataView.stories.tsx:72`), and the other twelve hits under `graphty/src` are sample-manifest and panel data, not Storybook metadata. No story anywhere sets `chromatic.disableSnapshot`. | `grep -rn "tags:" graphty/src --include=*.stories.tsx` (one hit); `grep -rn "disableSnapshot" graphty/src` (no output, rc=1) |
| Chromatic in CI already has TurboSnap off and `exitZeroOnChanges: false`, with the Vite `preview-stats.json` reason in a comment. The only TurboSnap left is `graphty/chromatic.config.json`'s `onlyChanged: true`, which the CI action does not read (it runs at repo root with `storybookBuildDir: ./graphty/storybook-static`). | `.github/workflows/ci.yml:625-660`; `graphty/chromatic.config.json` |
| `graphty/project.json`'s `lint` target runs `eslint && tsc --noEmit` with NO `dependsOn`; `build` has `dependsOn: ["^build"]`. `webgpu-graph-algorithms/project.json`'s lint has `dependsOn: ["build"]`, so the house move exists. | `graphty/project.json`; `webgpu-graph-algorithms/project.json` |
| Nothing in the workspace depends on `@graphty/graph-io`; `webgpu-graph-algorithms` depends on `@graphty/graph-format` only. | `grep -rn "graph-io" */package.json`; `webgpu-graph-algorithms/package.json:84-86` |
| `tools/commit-changes.sh:468-469`'s `VALID_SCOPES` is STALE: it omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, all three of which `commitlint.config.js:4-27` accepts (at `:8-10`). | the two files |
| `graphty/package.json:23`'s `storybook` script is STALE: it passes `--ssl-cert ~/ssl/STAR_ato_ms.crt`, and that file does not exist. `~/ssl/` holds `atoms.crt`, `atoms.key`, `atoms_chain.crt`, `atoms.pem`, `atoms-cert.sh`, `atoms-cert.env` and the year directories. So `npm run storybook` does not start in this package today. | `sed -n 23p graphty/package.json`; `ls -l ~/ssl/` |
| The APP's own dev server already serves HTTPS from paths that DO exist: `graphty/vite.config.ts:79-84` reads `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` from the monorepo root `.env`, which are `/home/apowers/ssl/atoms.key` and `/home/apowers/ssl/atoms.crt`, and `.env` also sets `HOST=dev.ato.ms` and `PORT=9005`. So `npm run dev` gives a secure context at `https://dev.ato.ms:9005`, which is what `navigator.gpu` needs. | `graphty/vite.config.ts:70-84`; `.env:1-4`; the `ls -l` above |
| `**/tmp/**` is ignored by eslint (`eslint.config.js:23`), `tmp/` is in the root `.gitignore:23`, and `graphty/tsconfig.json`'s `include` is `["src", ".storybook"]`. So a file under `graphty/tmp/` is not linted, not type-checked, not covered and never committed -- but IS served by the app's vite dev server, whose root is `graphty/`. | the three files |
| Both of graphty's workspace dependencies use `workspace:*`, not the `workspace:^` the integration plan's M7 row prescribes. | `graphty/package.json:36-37` |
| `eslint.config.js:40` IGNORES `**/stories/**`, so `npx eslint src/stories` exits 0 without reading anything. `tsc` DOES check them (`graphty/tsconfig.json` includes `src`), and so does prettier. | the config's ignore list; a measured run on 2026-09-19 printing "File ignored because of a matching ignore pattern" |
| `StatusBarSlots.tsx` is NOT prettier-clean at `HEAD`, so a step that edits it must not add a prettier gate. | `git show HEAD:graphty/src/components/shell/statusbar/StatusBarSlots.tsx > /tmp/f && npx prettier --check /tmp/f` warns |
| The status-bar widening of Task M7-T6 Steps 2-3 was applied to master as a check on 2026-09-19: `tsc --noEmit` clean, `eslint src/components/shell/statusbar` clean, and `vitest run src/components/shell/statusbar src/gpu src/components/shell/analysis` gave `243 passed (243)`. | the run of 2026-09-19; the tree was restored afterwards |

### 0.2 Entry criteria: MET or NOT MET

The integration plan's Phase M7 entry is one line (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3258`): `Phase M6 on master.` It is **NOT MET**, and neither is anything M6 itself waits on. This phase cannot start today and this document must not be read as if it could.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Phase M6 on master (`Graph.setAccelerator`, `accelerator-changed`, the `SimulationLayoutEngine`, `behavior.layout.gpuMinNodes`) | **NOT MET** | `grep -rn "setAccelerator\|accelerator" graphty-element/src/` returns nothing at all |
| Phase M5 on master (the `layout/src/simulation/` seam M6 builds on) | **NOT MET** | `ls layout/src/` has no `simulation`; the work is on `feat/layout-simulation`, open as **draft PR #12** (`gh pr list --state all`: `{"isDraft":true,"number":12,"state":"OPEN"}`) |
| Phase M5b on master (the GPU package's layout types) | **NOT MET** | branch `feat/webgpu-layout-types` exists locally and on origin; `gh pr list --state all` returns only #11 (merged) and #12 -- it has no PR |
| Phase M8a on master (`algorithms/src/indexed/accelerator.ts` and `accelerated()`, which M6 item 3 routes adapters through) | **NOT MET** | `ls algorithms/src/` has no `indexed` directory |
| A1 on master (the `indexed.*` namespace M8a dispatches to) | **NOT MET** | same; `algorithms/package.json` declares no `@graphty/graph-format` |
| F2 -- `@graphty/graph-format >= 1.0.0` on master | **MET** | `f6520f85 feat(graph-format)!: freeze the invariants and cut 1.0.0` is on master; `graph-format/package.json` version 1.0.0 |
| Phase M3 -- `@graphty/webgpu-graph-algorithms` in the monorepo, building, releasing | **MET** | `webgpu-graph-algorithms/package.json` version 0.2.1; `dist/browser.d.ts`, `dist/webgpu-graph-algorithms.d.ts` present; `ci.yml:282+` carries its two shards |
| The GPU package exports what 9.5 imports -- `probeBrowserWebGpu`, `requestGpuContext`, `createAccelerator` | **MET** | `webgpu-graph-algorithms/src/browser/index.ts:32,46`; `src/index.ts:44` |
| `calibrateLayout` exists | **NOT MET, and pinned as absent** | `test/index.test.ts:83` lists it under `NEVER_EXPORTED` and `:92` asserts `Object.keys(api).sort()` equals the P3 list exactly. See PLAN DECISION 3 |

So: M7 sits at the END of the chain, and the chain's first link is a draft PR. Nothing in this document may be started before the M6 plan's own gate record is green on master.

### 0.3 Phase map and execution order

The order below is decision D3, stated identically in all four M6 / M7 / M8a / M8b plan documents of 2026-09-19. M8b is the only phase whose entry criteria are met today.

```
merge PR #12 (M5) -> merge M5b -> M8a (A1 + the six ports + the accelerator seam) -> M6 (E0 then E1) -> M7
M8b is independent of that whole chain and may run in parallel with any of it.
```

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| M5 Layout seam | `layout/` | F2 (MET) | `layout/src/simulation/` per design 9.3 | layout tests green; `chromatic-layout` re-baselined | draft PR #12 |
| M5b GPU layout types | `webgpu-graph-algorithms/` | M5 on master | the real `@graphty/layout` types replace the D27 mirrors | both software shards green | branch, no PR |
| M8a Algorithms | `algorithms/` | F2 (MET); A1 is NOT met and is ABSORBED into the phase (M8a DEP-8A-B); M5b on master for its Task M8a-T13 only | A1's `toSnapshot` + the differential harness + six `indexed.*` ports, then `indexed/accelerator.ts` + `accelerated()`, then the GPU package's W1b algorithms half | the G6 algorithms clause + the G10 algorithms clause + the 14.6 A1 gate string | own plan |
| M6 Element | `graphty-element/` | M5 on master for E0 (M8a NOT required); M5 and M8a on master for E1 | graph-format 14.4 E0, then design 9.4 items 1-10 | design G6, element part | own plan |
| **M7 App (W2)** | `graphty/` | **M6 on master (NOT MET)** | design 9.5 `attachAccelerator`, the indicator, the `gpu`-tagged stories, the `metricCost` constant, the GPU dependency | design G12 (W2 subset) | **this document, 6.5-11.5 ed** |
| M8b GPU SpMV family | `webgpu-graph-algorithms/` | M3 (MET) and the design's P2 gate (MET) | design P7 (the 8.2 / 8.3 kernels) | design G7 | own plan |

Per-task sizes, in engineer-days for one engineer familiar with this code base (design 13's convention, `design/webgpu/webgpu-acceleration-plan.md:4198`):

| Task | Size |
| --- | --- |
| M7-T1 the scope list, the stale Storybook certificate, the G12 restatement, the corpus index | 0.5-1 ed |
| M7-T2 the dependency, the lint build order, the CI step, the element type shim | 0.5-1 ed |
| M7-T3 the GPU preference and its Settings > Performance control | 0.5-1 ed |
| M7-T4 `attachAccelerator`, the host guard, the inert calibrate arm | 1-1.5 ed |
| M7-T5 the graph-ready signal and `useGpuAccelerator` | 0.5-1 ed |
| M7-T6 the indicator chip and the device-lost report | 1-1.5 ed |
| M7-T7 the `metricCost` accelerator constant | 0.5-1 ed |
| M7-T8 the `gpu`-tagged stories and the Chromatic leftover | 0.5-1 ed |
| M7-T9 the G12 gate: the crossover harness, the `gpuMinNodes` measurement, the visual check, the record | 1.5-2.5 ed |
| **Total** | **6.5-11.5 ed** |

The total is the column summed, not a figure carried over from prose: the minima add to 6.5 and the maxima to 11.5. M7-T9 carries a floor of 1.5 rather than 1 because it BUILDS the measurement harness (Step 1) before it measures anything; the harness is not a story and is not part of M7-T8.

The design sizes P12 at 4-6 ed (`:4219`). This plan is larger and says why rather than trimming to match: the design's estimate assumes `calibrateLayout` exists (it does not, PLAN DECISION 3), assumes the element exposes an "accelerated" flag for `metricCost` (9.4's ten items specify none, PLAN DECISION 8), does not know that the `issues` status-bar slot has never been produced by this app, so the indicator is a slot's first producer rather than a member added to a working slot (PLAN DECISION 5), and does not know that the crossover measurement has no harness to run in until this phase writes one (PLAN DECISION 9).

### 0.4 Decisions (defaults stand unless the owner says otherwise before Task M7-T1 starts)

| Id | Decision | Default and reason | Alternative |
| --- | --- | --- | --- |
| D-M7-1 | Branch and worktree | `feat/gpu-app-accelerator` in `.worktrees/gpu-app` (`git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master`, owner). One PR for the whole phase, whose last commit is the G12 record. The app's Chromatic job runs on the PR and the owner accepts the two new stories' baselines there. | Landing T1/T2 as their own PR first. Choose it only if the GPU package's PR loop (see R-M7-4) is already hurting: T2 is what lengthens it, and landing it early spreads the cost over fewer days but leaves master with a dependency nothing imports for a week. |
| D-M7-2 | Dependency protocol | `"@graphty/webgpu-graph-algorithms": "workspace:*"`, matching the app's two existing workspace deps (`graphty/package.json:36-37`), NOT the `workspace:^` the integration plan's wording prescribes. graphty is `"private": true` with `"release": { "publish": false }` (`graphty/project.json`), and `nx.json` sets `preserveLocalDependencyProtocols: true`, so nothing ever rewrites the protocol into a published range and the two spellings are identical at install time. A third spelling in one manifest is a reader trap. Recorded as DEP-A. | `workspace:^`, if the owner wants the manifest to read the same as the integration plan's cell. It would then differ from both of its neighbours. |
| D-M7-3 | Where `tsc --noEmit` gets the GPU package's types | `graphty/project.json`'s `lint` target gains `"dependsOn": ["^build"]`. The package resolves through `node_modules` to `webgpu-graph-algorithms/dist`, so an unbuilt `dist/` is an unresolved module. `webgpu-graph-algorithms/project.json` already does this (`"dependsOn": ["build"]`), so the move has a precedent in the same repository. | A `paths` alias to the GPU package's SOURCE. Rejected: `graphty/tsconfig.json:16-18` disables `noUnusedLocals` / `noUnusedParameters` precisely "to avoid checking sibling packages' source files via path aliases", and a fourth alias would pull the GPU package's strict source and its `@webgpu/types` reference into the app's own type-check. |
| D-M7-4 | The element type shim | DELETE `graphty/src/types/graphty-element.d.ts`. It is verified to SHADOW the real package (0.1), so with it in place the app could never name a real element type; and deleting it is verified to cost exactly one word in one test file. | Keep it and widen it by hand. Rejected: a hand-written mirror of a package in the same repository is the drift this monorepo has already paid for once (D27's structural mirrors), and the shim would have to gain `graph`, `setAccelerator` and `GraphAccelerator` -- three more things to keep in step. |
| D-M7-5 | Where the preference lives | A versioned `localStorage` key, `graphty.shell.gpu.v1`, with `readPersistedGpuSettings` / `writePersistedGpuSettings` / `resolveGpuSettings`, copying `loadDefaults.ts:63,103,149` field for field, and edited in Settings > Performance beside the label controls. | A URL parameter or an element attribute. Rejected: the preference is a property of the reader's MACHINE, not of the dataset or the link, so it must survive a reload and must not travel in a shared URL. |
| D-M7-6 | What the chip is | `StatusBarChip` in the `issues` slot, shaped exactly like `StatusBarPerformanceMode` (`types.ts:690-698`): `label` + `title` + `onClick`, with `onClick` opening Settings > Performance -- the same door the Performance chip uses. | A Mantine `Badge` like `components/ai/AiStatusIndicator.tsx`. Rejected by the project's UI rule: that badge belongs to the AI panel body, not to the shell chrome, and does not follow the chip register. |
| D-M7-7 | The `gpuMinNodes` number's home | Measured by Task M7-T9 through the crossover harness it writes (`graphty/tmp/crossover/`, driven by the app's own dev server), recorded in `webgpu-graph-algorithms/docs/decisions/G12.md` section 3, and applied as the DEFAULT of `behavior.layout.gpuMinNodes` in `graphty-element/src/config/GraphBehavior.ts` (which M6 adds) in a `feat(graphty-element)` commit of this phase's PR. The app sets no `behavior` today and this plan does not start. | The app passing `behavior.layout.gpuMinNodes` per instance. Rejected: design 9.4 item 7 and `:435` both make it an ELEMENT setting evaluated by `LayoutManager`; an app-side copy would be a second answer that silently disagrees with the element's default for every other consumer. |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-A | `workspace:*` rather than the integration plan's `workspace:^`. | D-M7-2. No design section fixes the protocol; the integration plan's cell is prose, and the app's two existing entries are the local convention. |
| DEP-B | `attachAccelerator` takes an `AcceleratorHost` (`{ setAccelerator }`), not the `GraphtyElement` the 9.5 sketch names. | PLAN DECISION 1. Design 9.4 item 1 puts `setAccelerator` on `Graph`, and in this app `Graph` and the custom element are different objects. |
| DEP-C | The `calibrate` option is accepted and IGNORED; `calibrateLayout` is never imported. | PLAN DECISION 3. The export does not exist and a test pins its absence; the integration plan's own cell already says it "lands with the design's P4". |
| DEP-D | The design's `showToast(...)` becomes a `GpuStatus` handed to the caller, which the shell routes into `LoadCompleteToast`. | PLAN DECISION 6. The app has no toast function to call; it has one toast COMPONENT with a typed model. |
| DEP-E | G12's "nightly GPU lane green for a week" is replaced by "the GPU lane green on the master commits of this phase". | The nightly does not exist: `design/decisions/2026-09-19-no-nightly-gpu-lane.md`. Task M7-T1 writes the record. |
| DEP-F | The `metricCost.ts` accelerator constants are all 1 at M7. | PLAN DECISION 8. No node metric has a GPU path until design P7 / Phase M8b, and a factor above 1 would be the interface claiming a speed the code cannot deliver. |
| DEP-G | The `Build graph-format, graph-io and webgpu-graph-algorithms (PR)` step NARROWS to graph-io AND webgpu-graph-algorithms; it drops only graph-format, and it does not vanish. | Nothing in the workspace depends on `@graphty/graph-io`, so graph-io is outside every closure. `webgpu-graph-algorithms` is inside graphty's closure but NOT inside graph-io's, so a PR touching only `graph-io/` still leaves the GPU package's `dist/` unbuilt against an unconditional Upload step. Only `graph-format` is genuinely covered, because both named projects depend on it. The integration plan's cell says the step "becomes redundant for it" -- for the GPU package -- and that is true only of PRs that make graphty affected; M7-T2 Step 4 carries the counter-example. |

### 0.6 Where each PLAN DECISION is taken

| # | Question | Taken in |
| --- | --- | --- |
| 1 | What `attachAccelerator` takes, and whether `ElementGraph` gains `setAccelerator` | M7-T4, before Step 1 |
| 2 | How the app learns the element's `Graph` is ready | M7-T5, before Step 1 |
| 3 | What "the calibrate arm is inert" means | M7-T4, before Step 1 |
| 4 | Where the `"auto" \| "off" \| "required"` preference is stored and edited | M7-T3, before Step 1 |
| 5 | What the indicator is, and which slot produces it | M7-T6, before Step 1 |
| 6 | How a lost device surfaces, given one load-scoped toast | M7-T6, before Step 1 |
| 7 | How a test asserts the off state in a Chromium that HAS `navigator.gpu` | M7-T4, Step 3 |
| 8 | What the per-metric accelerator constant is worth today | M7-T7, before Step 1 |
| 9 | How a `gpu`-tagged story is deterministic on Chromatic, and why the crossover harness is NOT a story | M7-T8, before Step 1 |
| 10 | `workspace:^` versus `workspace:*` | D-M7-2 |
| 11 | `dependsOn` versus a tsconfig alias | D-M7-3 |
| 12 | The element type shim | D-M7-4 |
| 13 | What happens to the `ci.yml` build step | M7-T2, Step 4 |
| 14 | The G12 restatement and the `gpuMinNodes` measurement | M7-T1 Step 2 and M7-T9 |

---

## Phase M7: the graphty app (W2) -- design 9.5, 12 (P12)

**Entry criteria:** Phase M6 on master, with its G6 record green -- NOT MET today (section 0.2), and blocked behind M5, M5b, A1 and M8a in that order. Until then this phase may be READ but not started: every task from M7-T4 onward calls `setAccelerator`, which does not exist in `graphty-element/src`. Work on branch `feat/gpu-app-accelerator` in a worktree (`git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master`, owner); every commit through `tools/commit-changes.sh`; the phase lands as ONE PR whose last commit is the G12 record.

**Step 0 of the phase (a fresh worktree has no `node_modules` and no `dist/`, both gitignored):** `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,webgpu-graph-algorithms,algorithms,layout,graphty-element --parallel=3`. `AT` below means that worktree. Every later command reads `webgpu-graph-algorithms/dist/` (the app's `tsc` resolves the package through its `exports` map) and `graphty-element/` source (aliased by `graphty/vite.config.ts:33`).

### Task M7-T1: the stale commit-scope list, the stale Storybook certificate, the G12 restatement, the corpus index

**Repository:** `/home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app` (`AT` below).

**Files:**
- Modify: `graphty/package.json:23` (the `storybook` script's certificate path)
- Create: `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` (the restatement)
- Modify: `design/decisions/README.md` (the index row)
- Modify: `design/webgpu/README.md` (this plan's row in the corpus table)
- Modify: `design/README.md` (the `webgpu/` and `decisions/` file counts)
- NOT touched: `tools/commit-changes.sh` (Task M8b-T1 Step 1 of the M8b plan owns that edit; Step 1 below only checks for it), `design/webgpu/webgpu-acceleration-plan.md` (a plan of record; the restatement supersedes line 4219 without editing it), `commitlint.config.js` (already correct)

**Interfaces:**
- Consumes: `commitlint.config.js:4-27` (the authoritative scope enum); `tools/commit-changes.sh`'s `VALID_SCOPES` as Task M8b-T1 Step 1 leaves it; `design/decisions/README.md` (the record format and the index).
- Produces: the ONE G12 restatement record of the programme, `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`, which the M6 plan (DEP-M6-I), the M8a plan (DEP-8A-F) and the M8b plan (its section 0.7) all cite instead of writing their own; a citable record for DEP-E.

- [ ] **Step 1: The scope list (a CHECK; the edit belongs to Phase M8b)**

**This step makes NO edit.** `tools/commit-changes.sh:468-469`'s `VALID_SCOPES` omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, all three of which `commitlint.config.js:4-27` accepts, and Task M7-T9 Step 5 needs the third of them for the record it writes under `webgpu-graph-algorithms/docs/`. Three of the four plan documents of 2026-09-19 found the same defect; the fix is OWNED by **Task M8b-T1 Step 1** of `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`, and Task M8a-T1 of the M8a plan is the other consumer. M7 sits at the END of the execution order (section 0.3), so by the time this phase runs the fix is almost certainly already on master; this step confirms it rather than re-applying it.

Run: `cd AT && grep -n 'VALID_SCOPES' tools/commit-changes.sh | head -3`
Expected: line 468 begins `VALID_SCOPES="graph-format graph-io webgpu-graph-algorithms algorithms layout graphty-element`. `git log --oneline -5 -- tools/commit-changes.sh` then shows Task M8b-T1's `fix(tools): let commit-changes.sh accept the three format and GPU scopes`.

If line 468 still begins `VALID_SCOPES="algorithms layout graphty-element ...`, M8b has not landed its fix. **STOP and tell the owner to land Task M8b-T1 Step 1 first** -- a two-line edit in one file, committed under a `tools` scope the OLD list already permits. Do not apply it here: two plans landing the same two-line change is a merge conflict on a shared line for no gain. Then go to Step 1b.

- [ ] **Step 1b: The Storybook certificate path**

`graphty/package.json:23` reads:

```json
        "storybook": "storybook dev -p 9035 --no-open --https --ssl-cert ~/ssl/STAR_ato_ms.crt --ssl-key ~/ssl/atoms.key",
```

Replace it with:

```json
        "storybook": "storybook dev -p 9035 --no-open --https --ssl-cert ~/ssl/atoms.crt --ssl-key ~/ssl/atoms.key",
```

Reason: `~/ssl/STAR_ato_ms.crt` does not exist on this machine, so `npm run storybook` fails to start in this package -- the key half of the pair (`~/ssl/atoms.key`) is there and the certificate half is not. `~/ssl/atoms.crt` is the certificate the monorepo root `.env` already points every other dev server at (`HTTPS_CERT_PATH=/home/apowers/ssl/atoms.crt`), and `graphty/vite.config.ts:79-84` serves the app over HTTPS with exactly that pair today. One path, one file, no new mechanism.

This plan does NOT depend on `npm run storybook`: M7-T8 builds Storybook with `build-storybook` and its real check is the PR's `chromatic-app` job, and M7-T9's measurement runs on the app's dev server, not on Storybook. The fix is here because the staleness was found while checking M7-T9's secure-context requirement and leaving it costs the next reader an afternoon.

Run: `cd AT && sed -n 23p graphty/package.json && ls -l /home/apowers/ssl/atoms.crt /home/apowers/ssl/atoms.key`
Expected: the script line names `~/ssl/atoms.crt`, and both files listed by `ls` exist. `ls -l /home/apowers/ssl/STAR_ato_ms.crt` still reports "No such file or directory" -- that is the fact this step exists for.

- [ ] **Step 2: The G12 restatement**

Create `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`:

````markdown
# G12 is gated on the GPU lane green on master, not on a nightly week

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` line 4219, the P12 / W2 row, whose gate cell
reads "G12: stories green; nightly GPU lane green for a week; README numbers regenerated from
`benchmarks/results/`". That row is a plan of record and is NOT edited; this record supersedes its
middle clause.

## The decision

G12's middle clause is now: the GPU lane green on the master commits of the phase that claims G12.
Concretely, `gpu.yml` runs on every push to master, on `workflow_dispatch` and on a same-repo pull
request labelled `gpu`, and `release.yml`'s `gate` job waits for its run on the released commit and
refuses to publish unless it succeeded. A phase claiming G12 records the run id of the lane on its
own merge commit, the way the G0-G3 records name their runs.

Nothing else moves: "stories green" and "README numbers regenerated from `benchmarks/results/`" are
unchanged, the baseline file is still `benchmarks/results/gpu-linux-t4.json`, and `bench:compare`
still needs BOTH the median and the minimum above threshold
(`2026-09-19-bench-compare-min-confirms-median.md`).

## Why

There is no nightly GPU lane. `2026-09-19-no-nightly-gpu-lane.md` removed the `schedule` trigger,
the `changed` job and `gpu-nightly-report`; `.github/workflows/gpu.yml` says so in its own header
("there is NO nightly cron") and the root `CLAUDE.md` workflow table reads "Push to master,
dispatch, labelled same-repo PRs (no nightly)". A gate clause that names a workflow which does not
exist cannot be satisfied, cannot be falsified, and would be quietly dropped by whoever tried -- the
worst of the three outcomes, because the drop leaves no record.

## What we are giving up, and why it is acceptable

The nightly clause was asking for a WEEK of evidence, not one run, and that is a real difference: a
week of green nights is evidence that the lane is stable under environment drift, and one green run
on one commit is not. The replacement buys less.

It is acceptable because the phase G12 gates is an APP phase. Its risk is not driver drift on a
rented T4; it is whether the app's stories render and whether a real GPU settles, drags and pins on
the dev box, both of which are checked directly. The drift question belongs to the lane itself, and
`2026-09-19-no-nightly-gpu-lane.md` already weighed it and named what would reverse it.

## What would reverse this

- the GPU lane starts failing on master for reasons that are not the commit under test. One
  occurrence is not evidence; a second is; or
- a nightly (or weekly) lane is re-added, in which case this clause should read whatever the new
  schedule actually provides.

## What still exists

Every other clause of G12, and the whole of the W2 restatement at
`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260`: the app's stories green, the
story on the real GPU on the dev box settling, dragging and pinning under the owner's visual rule,
and a measured `gpuMinNodes` default. The P0-P3 plan documents still describe the three-job lane and
are deliberately left alone.
````

Then add the index row to `design/decisions/README.md`, after the `bench-compare` row:

```markdown
| [2026-09-19-g12-without-the-nightly-clause.md](2026-09-19-g12-without-the-nightly-clause.md) | G12 is gated on the GPU lane green on master, not on a nightly week |
```

Run: `cd AT && LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-19-g12-without-the-nightly-clause.md design/decisions/README.md; echo "rc=$?"`
Expected: no output and `rc=1` (grep found nothing). Any hit is a Unicode character that must be respelled in ASCII before the commit.

- [ ] **Step 3: The corpus index and the directory counts**

Add one row to the table in `design/webgpu/README.md`, after the integration plan's row:

```markdown
| `plans/2026-09-19-webgpu-m7-graphty-app.md`                                     | Phase M7: the app's `attachAccelerator`, the GPU indicator, the `gpu`-tagged stories and the `metricCost` accelerator constant (design 9.5, gate G12's W2 subset)                                                                                                                                                                                 | live plan     |
```

Then bump the two counts in `design/README.md`'s Directory Structure table (`:14` is the `decisions/` row, `:21` is the `webgpu/` row): `webgpu/` from 8 to the real count, `decisions/` from 2 to the real count.

**The convention those two cells follow, stated here so the next plan does not re-derive it and get it wrong.** They are NOT `ls | wc -l`. The `webgpu/` cell counts `.md` files RECURSIVELY -- `webgpu/` holds only `README.md`, `webgpu-acceleration-plan.md` and a `plans/` directory, so `ls design/webgpu | wc -l` prints 3 against a cell that reads 8, and writing 3 would record a DECREASE for a directory that just gained a document. The `decisions/` cell counts RECORDS, which means `.md` files excluding the `README.md` index -- `ls design/decisions | wc -l` prints 3 against a cell that reads 2, and writing 3 would count the index as a record. The commands that match the convention are:

```bash
cd AT
find design/webgpu -name '*.md' | wc -l       # the number design/README.md's webgpu/ cell must carry
ls design/decisions/*.md | grep -cv README    # the number its decisions/ cell must carry
grep -n 'webgpu/\|decisions/' design/README.md  # the two cells, to compare
```

Expected, measured on 2026-09-19 before this task runs: `find` prints 12 (the 8 the cell records plus the four plan documents of 2026-09-19, which are untracked today) and `grep -cv` prints 2. After Step 2 has created its record, `grep -cv` prints 3. So the `webgpu/` cell takes whatever `find` prints at the moment the commit is made -- 9 if this is the only 2026-09-19 plan on master, 12 if all four are -- and the `decisions/` cell takes 3. Do not copy either number from this paragraph: run the two commands in the tree being committed and copy THEIR output.

Reason and the merge hazard, stated because four plan documents of 2026-09-19 land in the same two directories weeks apart: the count cell is a single number on a shared line, so two phases bumping it conflict. The resolution rule is NOT "take one side" -- it is "re-run the two commands above in the merged tree and take their output". The corpus table rows do not collide because each plan adds its own line.

- [ ] **Step 4: Commit (owner)** -- TWO commits through `tools/commit-changes.sh` (Step 1 is a check and commits nothing): `fix(graphty): point the Storybook script at a certificate that exists` for Step 1b (the body names the missing `~/ssl/STAR_ato_ms.crt` and the `~/ssl/atoms.crt` the root `.env` already uses), then `docs: restate G12 without the nightly clause and index the M7 plan` for Steps 2 and 3. No `!` on any of them: none changes a published interface. The `docs` scope rather than `webgpu-graph-algorithms` on the third because the change is to the design corpus, not to the package.

### Task M7-T2: the dependency, the lint build order, the CI step, the element type shim

**Repository:** `AT`.

**Files:**
- Modify: `graphty/package.json:31-47` (the dependency)
- Modify: `graphty/project.json` (the `lint` target's `dependsOn`)
- Modify: `.github/workflows/ci.yml:85-92` (the build step narrows to graph-io and webgpu-graph-algorithms)
- Delete: `graphty/src/types/graphty-element.d.ts` (73 lines, the shadowing shim)
- Modify: `graphty/src/components/Graphty.test.tsx:69` (`querySelector<HTMLElement>`)
- Modify: `pnpm-lock.yaml` (the install writes it)
- NOT touched: `graphty/tsconfig.json` (no fourth `paths` alias -- D-M7-3), `graphty/vite.config.ts` (the package is consumed as built `dist`, which its `exports` map already resolves), `knip.config.ts` (the dependency is imported by `src/gpu/accelerator.ts` from M7-T4 on, so knip sees it used)

**Interfaces:**
- Consumes: `webgpu-graph-algorithms/package.json:9-24` (the `.` and `./browser` subpath exports).
- Produces: `@graphty/webgpu-graph-algorithms` resolvable from `graphty/src` with types, under `nx affected`; `graphty:lint` that builds its dependencies first; a `graphty/src` in which `@graphty/graphty-element` resolves to the REAL package.

- [ ] **Step 1: The dependency**

In `graphty/package.json`'s `dependencies`, after `"@graphty/graphty-element": "workspace:*",`, add:

```json
        "@graphty/webgpu-graph-algorithms": "workspace:*",
```

Run: `cd AT && HUSKY=0 pnpm install --frozen-lockfile`
Expected: FAIL -- `ERR_PNPM_OUTDATED_LOCKFILE`, because the manifest now names a dependency the lockfile does not. That is the point of running it first: the failure proves the manifest edit landed. Then run `cd AT && HUSKY=0 pnpm install` and expect the graphty importer to gain `'@graphty/webgpu-graph-algorithms': specifier: workspace:* version: link:../webgpu-graph-algorithms`. No registry package is added: the GPU package's own dependencies (`@graphty/graph-format`, `@webgpu/types`) are already installed for it.

- [ ] **Step 2: The lint build order**

In `graphty/project.json`, the `lint` target becomes:

```json
        "lint": {
            "executor": "nx:run-commands",
            "options": {
                "command": "eslint && tsc --noEmit",
                "cwd": "graphty"
            },
            "dependsOn": ["^build"]
        },
```

Reason, and the case it closes: `graphty:lint` runs `tsc --noEmit`, which resolves `@graphty/webgpu-graph-algorithms` through `node_modules` to `webgpu-graph-algorithms/dist/browser.d.ts`, so an unbuilt `dist/` is an unresolved module and a red lint job whose message says nothing about build order. Be precise about what this does and does not fix, because the M8a plan's PD-8 takes the opposite decision for `algorithms/` on the same evidence and the two must not read as a disagreement about facts. CI is already safe without it, on both paths: `ci.yml:78` and `:98` both say "Build then lint (build first for type dependencies)", the PR path runs `nx affected -t build` BEFORE `nx affected -t lint`, graphty's own `build` carries `dependsOn: ["^build"]` so its closure is built whenever graphty is affected, and M7-T2 Step 4 keeps `webgpu-graph-algorithms` in the unconditional PR build step (DEP-G) so the package's `dist/` is present on every pull request regardless. What `dependsOn: ["^build"]` buys is the LOCAL case: a bare `pnpm exec nx run graphty:lint` in a fresh worktree, which is exactly the residual the M8a plan accepts for algorithms and names as its R-M8A-2. M7 closes it here rather than accepting it because `webgpu-graph-algorithms/project.json` already carries `"dependsOn": ["build"]` on its own lint, so the move has a precedent in this very package's neighbour, and because the app's lint is the slowest in the repository and is the one a contributor runs by hand. Neither choice is load-bearing for the other package.

Run: `cd AT && pnpm exec nx run graphty:lint`
Expected: the GPU package (and graph-format, and the rest of graphty's closure) build first, then `eslint` and `tsc --noEmit` both exit 0.

- [ ] **Step 3: The element type shim**

Delete `graphty/src/types/graphty-element.d.ts` and change `graphty/src/components/Graphty.test.tsx:69` from

```ts
        const graphtyElement = container.querySelector("graphty-element");
```

to

```ts
        const graphtyElement = container.querySelector<HTMLElement>("graphty-element");
```

Reason: the shim is an ambient `declare module "@graphty/graphty-element"`, and TypeScript resolves an ambient module declaration BEFORE it consults `paths`. Verified on 2026-09-19: a probe file importing `type { Edge }` -- which `graphty-element/index.ts:11` exports and the shim does not -- failed with `TS2305: Module '"@graphty/graphty-element"' has no exported member 'Edge'`. So while the shim is in force the app cannot name a single real element type, which is exactly what M7 would need if it ever wanted `GraphAccelerator`. Its `HTMLElementTagNameMap` augmentation is what those two test lines were using; the type parameter replaces it. Verified: deleting the file produced exactly two errors, both on those lines, and this edit clears both.

Run: `cd AT/graphty && npx tsc --noEmit`
Expected: exit 0, no output. If any OTHER error appears, it is a real disagreement between the shim's hand-written shape and the element's own types after M6 -- fix the app's usage, never re-add the shim.

- [ ] **Step 4: The CI build step narrows**

In `.github/workflows/ci.yml`, replace lines 85-92:

```yaml
            # graph-format, graph-io and webgpu-graph-algorithms are not yet in graphty's dependency closure (the consumer
            # migration of design/graph-format section 14 is pending), so a PR that touches only the
            # older packages leaves their dist/ unbuilt; the Upload steps below would then produce no
            # artifact and every test shard's Download step would fail with "Artifact not found".
            # Build them explicitly; the Nx cache makes this a no-op when the affected build already did.
            - name: Build graph-format, graph-io and webgpu-graph-algorithms (PR)
              if: github.event_name == 'pull_request'
              run: pnpm exec nx run-many -t build --projects=graph-format,graph-io,webgpu-graph-algorithms --parallel=3
```

with:

```yaml
            # Neither graph-io nor webgpu-graph-algorithms is reached by every PR's affected set, and BOTH have an
            # unconditional Upload step below, so a PR that leaves either one unbuilt produces an empty artifact and
            # the shards that download it fail with "Artifact not found". Build both explicitly; the Nx cache makes
            # this a no-op when the affected build already did.
            #   - graph-io is in NO package's dependency closure (nothing in the workspace depends on it), so it is
            #     affected only by a PR that touches it.
            #   - webgpu-graph-algorithms is in graphty's closure, so a PR touching graphty reaches it -- but a PR
            #     touching ONLY graph-io does not, because nothing depends on graph-io and the affected set is then
            #     just {graph-io}. That case is exactly why it stays named here.
            # graph-format is safe to drop: it is a dependency of BOTH projects named below, so `^build` reaches it
            # from either one. Uploads: graph-io at :150, webgpu-graph-algorithms at :157, both unconditional.
            - name: Build graph-io and webgpu-graph-algorithms (PR)
              if: github.event_name == 'pull_request'
              run: pnpm exec nx run-many -t build --projects=graph-io,webgpu-graph-algorithms --parallel=2
```

Reason the step narrows rather than vanishing, and why it narrows to TWO projects rather than one: `webgpu-graph-algorithms/package.json:84-86` depends on `@graphty/graph-format` and nothing else of the workspace, and `grep -rn "graph-io" */package.json` finds no dependant at all. So graph-io is outside every closure and `nx affected` reaches it only when the PR touches it. The tempting further narrowing -- "graphty depends on webgpu-graph-algorithms now, so drop it too" -- holds ONLY for a PR that makes `graphty` affected. A PR that touches only `graph-io/` makes `graph-io` the entire affected set, `nx affected -t build` builds graph-io and its `^build` (graph-format) and stops, `webgpu-graph-algorithms/dist/` is never written, `ci.yml:157-162`'s Upload step runs anyway and produces an empty artifact, and the `webgpu-graph-algorithms-node` and `-browser` shards fail at their Download step. Today that case is covered because the step being replaced builds the GPU package explicitly; the replacement must keep covering it. graph-format IS safe to drop, because it is a dependency of both projects named in the new step.

`ci.yml:150-155` uploads graph-io's `dist/` unconditionally and `:157-162` uploads the GPU package's the same way; every one of the 20 shards downloads what it needs at `ci.yml:437-453`. Deleting the step outright would break all 20 shards on the first PR that touches neither graph-io nor graphty.

Run: `cd AT && python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print([s['name'] for s in d['jobs']['build']['steps'] if 'name' in s][:12])"`
Expected: the list contains `Build graph-io and webgpu-graph-algorithms (PR)` and no longer contains `Build graph-format, graph-io and webgpu-graph-algorithms (PR)`; the file still parses as YAML. If it does not parse, the indentation of the replacement is wrong -- the block sits at 12 spaces inside `jobs.build.steps`.

Then prove the narrowing against the case the landing PR cannot exercise. The M7 PR touches `graphty/`, so it makes graphty affected and therefore exercises only the case the narrowing was always safe for. The case that can break is a PR whose affected set does NOT contain graphty:

Run (owner, once, on a scratch branch off this phase's branch): push a branch whose only change is one line appended to `graph-io/README.md`, open it as a draft PR, and read the `build` job's Upload steps.
Expected: nine artifacts, all non-empty, and all 20 test shards green. Close the scratch PR without merging. This is G12 item 9's second row.

- [ ] **Step 5: The whole gate**

Run: `cd AT && pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1 && pnpm exec nx run graphty:coverage`
Expected: build and lint green; the app's vitest suite passes in headless Chromium with no new failures. `Graphty.test.tsx` is the only test file this task touched.

- [ ] **Step 6: Commit (owner)** -- two commits through `tools/commit-changes.sh`: `build(graphty): take the WebGPU package and build it before the app's type-check` for Steps 1-3 (the body records that graphty is now the only importer of the GPU package, that the ambient element shim was shadowing the real package types, and the one test line that changed), then `ci: drop graph-format from the explicit PR build` for Step 4 (the body names the closure argument, the graph-io-only PR that keeps webgpu-graph-algorithms in the list, and the 20 Download steps the narrowing must not break). The PR's `build` job proves the second one for a graphty-affected PR; the scratch graph-io-only PR of Step 4 proves it for the case the landing PR cannot reach. Every shard's Download step must still find nine artifacts in both.

### Task M7-T3: the GPU preference and its Settings > Performance control

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/gpu/gpuPrefs.ts` (the versioned store)
- Create: `graphty/src/gpu/__tests__/gpuPrefs.test.ts`
- Modify: `graphty/src/components/shell/panel/SettingsOverlay.tsx` (a `GpuSettingsPane`, rendered under `performance`)
- NOT touched: `graphty/src/components/shell/defaults/loadDefaults.ts` (the label settings keep their own key), `graphty/src/components/shell/types.ts`

**Interfaces:**
- Consumes: the persistence shape of `loadDefaults.ts:103-160` (`readPersisted*` / `writePersisted*` / `resolve*`); `SettingsOverlay.tsx:107`'s `SHIPPED_SECTION_IDS`, which already lists `performance`.
- Produces: `GpuPreferenceValue` (the canonical three-value union; `accelerator.ts` imports it in M7-T4), `GPU_SETTINGS_STORAGE_KEY`, `GPU_PREFERENCE_VALUES`, `PersistedGpuSettings`, `DEFAULT_GPU_SETTINGS`, `readPersistedGpuSettings()`, `writePersistedGpuSettings(s)`, `resolveGpuSettings(partial)` -- consumed by M7-T4, M7-T5 and M7-T6.

**PLAN DECISION 4 (where the preference is stored and edited):** a versioned `localStorage` key `graphty.shell.gpu.v1` and a pane control in Settings > Performance. Settings > Performance is a SHIPPED section (`SettingsOverlay.tsx:74-87` declares it, `:107`'s `SHIPPED_SECTION_IDS` includes it, `:486` renders `LabelSettingsPane` there), so the door exists and nothing has to be un-tagged. The store copies `loadDefaults.ts` field for field rather than inventing a shape: a versioned key so a shape change reads as a MISSING key rather than a corrupt one, a try/catch round the store (private mode and disabled site data both throw), `JSON.parse` in its own try, non-objects and arrays refused, and each field validated on its own. A separate key from `graphty.shell.labels.v1` because a GPU preference is not a label setting and neither record may corrupt the other.

- [ ] **Step 1: Write the failing test**

Create `graphty/src/gpu/__tests__/gpuPrefs.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";

import {
    DEFAULT_GPU_SETTINGS,
    GPU_PREFERENCE_VALUES,
    GPU_SETTINGS_STORAGE_KEY,
    readPersistedGpuSettings,
    resolveGpuSettings,
    writePersistedGpuSettings,
} from "../gpuPrefs";

afterEach(() => {
    window.localStorage.removeItem(GPU_SETTINGS_STORAGE_KEY);
});

describe("the GPU preference store", () => {
    it('defaults to "auto", which rejects a software adapter', () => {
        expect(DEFAULT_GPU_SETTINGS.gpu).toBe("auto");
        expect(GPU_PREFERENCE_VALUES).toEqual(["auto", "off", "required"]);
    });

    it("round-trips every value the control can produce", () => {
        for (const gpu of GPU_PREFERENCE_VALUES) {
            writePersistedGpuSettings({ gpu });
            expect(resolveGpuSettings(readPersistedGpuSettings()).gpu).toBe(gpu);
        }
    });

    it("reads an absent key as the default", () => {
        expect(readPersistedGpuSettings()).toEqual({});
        expect(resolveGpuSettings({})).toEqual(DEFAULT_GPU_SETTINGS);
    });

    it("drops malformed JSON, a non-object, an array and an unknown preference", () => {
        for (const raw of ["{", '"auto"', "[1]", '{"gpu":"maybe"}', '{"gpu":1}']) {
            window.localStorage.setItem(GPU_SETTINGS_STORAGE_KEY, raw);
            expect(readPersistedGpuSettings()).toEqual({});
        }
    });

    it("reads an explicit undefined as the default, not as undefined", () => {
        /* Object spread copies a key whose VALUE is undefined, so `{ ...DEFAULT, ...{ gpu: undefined } }`
           is `{ gpu: undefined }` and not the default. The Settings pane's onChange can produce exactly
           that shape (Mantine hands back `string | null` and `Array.find` returns undefined), and a
           `<Select value={undefined}>` silently flips from controlled to uncontrolled. So the resolver
           validates rather than spreading blind, and this case is what holds it to that. */
        expect(resolveGpuSettings({ gpu: undefined })).toEqual(DEFAULT_GPU_SETTINGS);
    });
});
```

Run: `cd AT/graphty && npx vitest run src/gpu/__tests__/gpuPrefs.test.ts`
Expected: FAIL -- `Failed to resolve import "../gpuPrefs"`. If it passes, the file already exists and this task has been started twice.

- [ ] **Step 2: The store**

Create `graphty/src/gpu/gpuPrefs.ts` with this content exactly (it is prettier-clean at tabWidth 4 / printWidth 120 and passes the repository's `jsdoc/require-*` rules, both verified on 2026-09-19):

```ts
/**
 * The reader's GPU preference, and where it is remembered.
 *
 * Settings > Performance is the pane (`SettingsOverlay.tsx`'s `SHIPPED_SECTION_IDS` already
 * lists `performance`), and the storage shape copies `readPersistedLabelSettings` field for
 * field: a VERSIONED key so a shape change becomes a missing key rather than a corrupt read, a
 * try/catch round the store, `JSON.parse` in its own try, non-objects and arrays refused, and
 * each field validated on its own. A separate key from `graphty.shell.labels.v1` because these
 * are not label settings and neither record may corrupt the other.
 *
 * Why a preference at all rather than "use the GPU when it is there": `"auto"` REJECTS a
 * software adapter (lavapipe, SwiftShader), which is the right default because a software
 * WebGPU device is slower than the CPU simulation it would replace; `"required"` is for a
 * reader diagnosing why acceleration is off and wants the reason thrown rather than swallowed;
 * `"off"` is the escape hatch for a driver that crashes the tab.
 */

/**
 * What the reader asked for. This module is the ONE home for the three-value set: `accelerator.ts`
 * imports it rather than declaring its own union, because two copies drift and a drifted copy
 * would be a stored preference the attach code does not understand. It is also the right
 * direction: this module imports nothing, so a Settings pane that reads the preference pulls no
 * GPU code into its chunk.
 * @public
 */
export type GpuPreferenceValue = "auto" | "off" | "required";

/** Versioned local-storage key for the reader's GPU preference. @public */
export const GPU_SETTINGS_STORAGE_KEY = "graphty.shell.gpu.v1";

/** The three values, in the order the segmented control draws them. @public */
export const GPU_PREFERENCE_VALUES: readonly GpuPreferenceValue[] = ["auto", "off", "required"];

/** The GPU settings Settings > Performance owns, and nothing more. @public */
export interface PersistedGpuSettings {
    /** Whether the app probes for WebGPU at all, and how strict it is about what it finds. */
    readonly gpu: GpuPreferenceValue;
}

/** Probe, reject a software adapter, stay on the CPU when there is nothing. @public */
export const DEFAULT_GPU_SETTINGS: PersistedGpuSettings = { gpu: "auto" };

/**
 * Whether a stored value is one of the three. A string that is not is dropped rather than
 * coerced: an unknown preference read as `"auto"` would silently turn acceleration back on for
 * a reader who had turned it off in a later build.
 * @param value - whatever came out of storage.
 * @returns whether it is a preference this build understands.
 */
function isGpuPreference(value: unknown): value is GpuPreferenceValue {
    return value === "auto" || value === "off" || value === "required";
}

/**
 * Reads the reader's GPU preference, surviving an absent key, an unreadable store (private
 * mode, disabled site data), malformed JSON and a value of the wrong shape.
 * @returns whatever of the stored settings could be trusted.
 */
export function readPersistedGpuSettings(): Partial<PersistedGpuSettings> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(GPU_SETTINGS_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;

    return isGpuPreference(record.gpu) ? { gpu: record.gpu } : {};
}

/**
 * Writes the reader's GPU preference. A full or unavailable store is not an error the shell can
 * act on: the choice simply does not survive the session.
 * @param settings - the settings to remember.
 */
export function writePersistedGpuSettings(settings: PersistedGpuSettings): void {
    try {
        window.localStorage.setItem(GPU_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Deliberately ignored: see the JSDoc above.
    }
}

/**
 * The settings to work from: the defaults, overwritten by whatever of the stored record could
 * be trusted.
 *
 * It VALIDATES rather than spreading the argument, and the difference is not cosmetic. Object
 * spread copies own enumerable keys INCLUDING ones whose value is `undefined`, so
 * `{ ...DEFAULT_GPU_SETTINGS, ...{ gpu: undefined } }` evaluates to `{ gpu: undefined }` and not
 * to the default -- and `{ gpu: undefined }` is exactly what the Settings pane produces when
 * Mantine hands back a value the control could not have drawn. The result would be a
 * `PersistedGpuSettings` whose non-optional field is undefined, a `<Select>` that flips from
 * controlled to uncontrolled, and `{}` written to storage.
 * @param persisted - the result of {@link readPersistedGpuSettings}, or any partial record.
 * @returns a complete settings record, every field a value this build understands.
 */
export function resolveGpuSettings(persisted: Partial<PersistedGpuSettings>): PersistedGpuSettings {
    return { ...DEFAULT_GPU_SETTINGS, ...(isGpuPreference(persisted.gpu) ? { gpu: persisted.gpu } : {}) };
}
```

Run: `cd AT/graphty && npx vitest run src/gpu/__tests__/gpuPrefs.test.ts`
Expected: 5 tests pass. The first four were measured on 2026-09-19 against the earlier draft of this file (`4 passed (4)` in the `chromium` project); the fifth is the one that fails against the plain-spread resolver.

- [ ] **Step 3: The pane control**

In `graphty/src/components/shell/panel/SettingsOverlay.tsx`, make three edits to the import block, add the pane beside `LabelSettingsPane` (which runs `:171-222`), and render it.

Line 2 becomes (only `Select` is new):

```ts
import { ActionIcon, Box, NumberInput, Overlay, Select, Switch } from "@mantine/core";
```

and the store's import is this line, verbatim:

```ts
import { DEFAULT_GPU_SETTINGS, GPU_PREFERENCE_VALUES, type PersistedGpuSettings, readPersistedGpuSettings, resolveGpuSettings, writePersistedGpuSettings } from "../../../gpu/gpuPrefs";
```

Three levels up, because the pane lives in `src/components/shell/panel/` and the store in `src/gpu/`. Put it in the relative-import block (lines 5-19) and let `simple-import-sort` place it with `npx eslint --fix src/components/shell/panel/SettingsOverlay.tsx`: `"../../../gpu/gpuPrefs"` sorts before `"../../ai/AiProviderSettings"`, so it lands first in that block, at line 5. Prettier will also wrap it across lines at printWidth 120; run `npx prettier --write` on the file and take its output rather than hand-wrapping.

The four strings, as named constants beside `LABEL_SWITCH_LABEL` (`:110`):

```ts
/** The control's label: the thing and the verb, in the reader's words. */
const GPU_SELECT_LABEL = "Use the GPU for layouts";

/** What the three values mean, in one line, because a reader picking one has to know. */
const GPU_SELECT_DESCRIPTION =
    "Automatic uses a hardware GPU when the browser has one and stays on the processor otherwise.";

/** The three rows, in {@link GPU_PREFERENCE_VALUES} order. */
const GPU_OPTIONS = [
    { value: "auto", label: "Automatic" },
    { value: "off", label: "Never" },
    { value: "required", label: "Required (report why not)" },
];

/** Where a change takes effect, which is not now. */
const GPU_RELOAD_LINE = "Takes effect when the page is reloaded.";
```

and the pane, which copies `LabelSettingsPane`'s shape exactly -- state seeded from storage in the INITIALISER, not in an effect, so the control never draws the default for a frame before correcting itself, and a write on every change because the overlay header already promises "Changes save automatically":

```tsx
/**
 * Settings > Performance: whether the app uses a GPU for layouts.
 *
 * A reload line rather than a live re-attach: `attachAccelerator` runs once when the element's
 * Graph appears, and re-running it would have to dispose a context the running layout is reading
 * from. Saying so is honest and costs the reader one keystroke; re-attaching live is design P12
 * work nobody has asked for.
 * @returns the control and the sentence that says when it takes effect.
 */
function GpuSettingsPane(): React.JSX.Element {
    const [settings, setSettings] = useState<PersistedGpuSettings>(() => resolveGpuSettings(readPersistedGpuSettings()));

    return (
        <Box
            data-testid="settings-gpu"
            style={{ display: "flex", flexDirection: "column", gap: PANEL_GRID.PAD_LEFT, maxWidth: FIELD_WIDTH }}
        >
            <Select
                label={GPU_SELECT_LABEL}
                description={GPU_SELECT_DESCRIPTION}
                data={GPU_OPTIONS}
                value={settings.gpu}
                allowDeselect={false}
                data-testid="settings-gpu-select"
                onChange={(value) => {
                    const gpu = GPU_PREFERENCE_VALUES.find((entry) => entry === value) ?? DEFAULT_GPU_SETTINGS.gpu;
                    const next: PersistedGpuSettings = { gpu };

                    setSettings(next);
                    writePersistedGpuSettings(next);
                }}
            />

            <Box component="span" style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}>
                {GPU_RELOAD_LINE}
            </Box>
        </Box>
    );
}
```

and, immediately after `{section.id === "performance" && <LabelSettingsPane />}` (`:486`):

```tsx
                        {/* Settings > Performance also owns the GPU preference: it is a property of
                            the reader's machine, like the label budget, and neither belongs to a
                            dataset or a link (WebGPU design 9.5). */}
                        {section.id === "performance" && <GpuSettingsPane />}
```

`GPU_PREFERENCE_VALUES.find(...) ?? DEFAULT_GPU_SETTINGS.gpu` rather than a cast, and rather than handing the `find` result to `resolveGpuSettings`: Mantine's `onChange` hands back `string | null`, `Array.prototype.find` returns `undefined` when nothing matches, and `undefined` is NOT an absent field -- object spread copies a key whose value is `undefined`, so `resolveGpuSettings({ gpu: undefined })` would have produced `{ gpu: undefined }` and written `{}` to storage while flipping the `<Select>` from controlled to uncontrolled. The `??` settles it at the call site, and the resolver's own validation (Step 2) settles it again for every other caller; the belt and the braces are deliberate, because these two are the only places a preference enters the app.

Run: `cd AT/graphty && npx eslint src/gpu src/components/shell/panel/SettingsOverlay.tsx && npx prettier --check "src/gpu/**" src/components/shell/panel/SettingsOverlay.tsx && npx tsc --noEmit`
Expected: all three exit 0.

- [ ] **Step 4: Checkpoint** -- `cd AT/graphty && npx vitest run src/gpu src/components/shell/__tests__` passes; nothing is committed by this task. Leave the working tree with `src/gpu/gpuPrefs.ts`, `src/gpu/__tests__/gpuPrefs.test.ts` and the `SettingsOverlay.tsx` edit and nothing else new.

### Task M7-T4: `attachAccelerator`, the host guard, the inert calibrate arm

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/gpu/accelerator.ts` (the whole of design 9.5)
- Create: `graphty/src/gpu/__tests__/accelerator.test.ts`
- Modify: `graphty/src/components/shell/analysis/elementBridge.ts` (add `ElementAcceleratorHost` and `asAcceleratorHost`; `REQUIRED_GRAPH_METHODS` at `:81` is NOT touched)
- Modify: `graphty/src/components/shell/analysis/__tests__/elementBridge.test.ts` (the guard's two cases)
- NOT touched: `graphty/src/components/Graphty.tsx` (M7-T5's edit), `graphty/src/components/shell/AppShell.tsx` (M7-T5 and M7-T6)

**Interfaces:**
- Consumes: `probeBrowserWebGpu(options?: BrowserGpuOptions): Promise<ProbeResult>` and `requestGpuContext(options?: BrowserGpuOptions): Promise<GpuContext>` (`webgpu-graph-algorithms/src/browser/index.ts:32,46`); `createAccelerator(ctx: GpuContext, options?: AcceleratorOptions): GpuAccelerator` (`src/index.ts:44` re-exports it from `src/accelerator.ts:87`); `ctx.caps: GpuCaps` and `ctx.lost: Promise<GPUDeviceLostInfo>` (`src/context.ts:72,74` -- the PUBLIC `GpuContext` members; `:42` and `:44` are fields of the private `ContextInit` interface and are not what the app sees); `ctx.dispose()` (`:357`).
- Consumes, from M7-T3: `GpuPreferenceValue` (the three-value union lives in `gpuPrefs.ts`, which imports nothing; `accelerator.ts` imports it, not the other way round, so the Settings pane pulls no GPU code into its chunk).
- Produces: `GpuState`, `GPU_LABEL_PREFIX`, `GpuStatus`, `AcceleratorHost`, `AttachAcceleratorOptions`, `GpuAttachment`, `gpuOnLabel(vendor, architecture)`, `attachAccelerator(host, options)`; and from the bridge, `ElementAcceleratorHost` and `asAcceleratorHost(candidate)`.

**PLAN DECISION 1 (what `attachAccelerator` takes, and whether `ElementGraph` gains `setAccelerator`):** it takes an `AcceleratorHost`, a structural `{ setAccelerator }`, and the app narrows the element's `Graph` to it with a SEPARATE guard `asAcceleratorHost` in `elementBridge.ts`. Not the element: design 9.5's sketch writes `element.setAccelerator(...)`, but design 9.4 item 1 (`:3075-3095`) puts `setAccelerator` on `Graph`, and in this app those are different objects -- the DOM node never leaves `Graphty.tsx:564-571` and the only public surface is `GraphtyHandle` (`:266-282`), whose `graph` getter (`:409-411`) is the door. Not `GraphtyHandle` either: widening it would put a GPU concern in the component that renders the canvas. And NOT a new member of `REQUIRED_GRAPH_METHODS` (`elementBridge.ts:81`): that list is the guard for `asElementGraph`, and adding `setAccelerator` to it would make all six existing call sites (`AppShell.tsx:1960, 2358, 2634, 2838, 3086, 3900`) return `null` against an element built before M6 -- which would silently turn off every algorithm run in the Analyze panel in order to gain a chip. And `accelerator.ts` declares its OWN structural `AcceleratorHost` rather than importing `ElementAcceleratorHost`, because the dependency would run the wrong way: `src/gpu/` is the app's GPU layer and must not import from `components/shell/`. The two are structurally identical, so `asAcceleratorHost`'s return value is assignable to `attachAccelerator`'s parameter with no cast and no adapter (verified by `tsc --noEmit` on 2026-09-19); the duplication is one method signature, and the alternative -- a third module holding the interface -- would be a file with one line in it.

**PLAN DECISION 3 (what "the calibrate arm is inert" means):** `calibrate?: boolean` stays in the options type and is ACCEPTED, `calibrateLayout` is NEVER imported, and the returned `GpuAttachment` carries `calibrated: false` so a caller that asked for calibration can SEE that it did not happen. Inert means exactly those three things, and not a fourth: no throw (the caller asked for a better `exactMaxNodes`, not for a failure), no `console.warn` (a warning nobody can act on is noise), no dynamic `import()` (it would throw at runtime, later and further from the cause). The reason it cannot be called is verified, not assumed: `webgpu-graph-algorithms/test/index.test.ts:83` lists `calibrateLayout` under `NEVER_EXPORTED` and `:92` asserts `Object.keys(api).sort()` equals the P3 `VALUE_EXPORTS` list exactly, so a static import would not compile. When design P4 lands `calibrateLayout`, the one branch that changes is the `exactMaxNodes` assignment and `calibrated` becomes true on that path.

- [ ] **Step 1: The host guard**

In `graphty/src/components/shell/analysis/elementBridge.ts`, add this interface immediately ABOVE the `/** The four methods a candidate must carry ... */` comment at `:80`:

```ts
/**
 * The one graph method the GPU attachment calls (WebGPU design 9.4 item 1).
 *
 * A SEPARATE interface with a separate guard rather than a member of {@link ElementGraph}:
 * adding `setAccelerator` to {@link REQUIRED_GRAPH_METHODS} would make all six existing
 * `asElementGraph` call sites return null against an element built before the design's E1,
 * which would silently turn off every algorithm run in the Analyze panel to gain a chip.
 * @public
 */
export interface ElementAcceleratorHost {
    /** Injects the accelerator, or removes it with null. */
    setAccelerator: (accelerator: unknown) => void;
}
```

and this function at the END of the file:

```ts
/**
 * Narrows the app's graph handle to {@link ElementAcceleratorHost}, or null when the element
 * predates the accelerator property. A null here is not an error: it is an element without
 * `setAccelerator`, and the app's answer to that is to stay on the CPU and say so.
 * @param candidate - the value behind `graphtyRef.current?.graph`, whatever it is.
 * @returns the host, or null when the method is absent.
 */
export function asAcceleratorHost(candidate: unknown): ElementAcceleratorHost | null {
    const record = asRecord(candidate);

    if (record === null || typeof record.setAccelerator !== "function") {
        return null;
    }

    return record as unknown as ElementAcceleratorHost;
}
```

Add to `graphty/src/components/shell/analysis/__tests__/elementBridge.test.ts`:

```ts
describe("asAcceleratorHost", () => {
    it("narrows a graph that has setAccelerator", () => {
        const setAccelerator = vi.fn();

        expect(asAcceleratorHost({ setAccelerator })).not.toBeNull();
    });

    it("returns null for null, a non-object, and a graph without the method", () => {
        expect(asAcceleratorHost(null)).toBeNull();
        expect(asAcceleratorHost("graph")).toBeNull();
        expect(asAcceleratorHost({ runAlgorithm: vi.fn() })).toBeNull();
    });

    it("does not disturb asElementGraph, which still needs its own four methods", () => {
        expect(asElementGraph({ setAccelerator: vi.fn() })).toBeNull();
    });
});
```

with `asAcceleratorHost` added to the file's existing import list from `../elementBridge`.

Run: `cd AT/graphty && npx vitest run src/components/shell/analysis/__tests__/elementBridge.test.ts`
Expected: the existing tests plus the three new ones pass. The third is the one that matters: it pins that the accelerator guard did NOT widen the algorithm guard.

- [ ] **Step 2: `attachAccelerator`**

Create `graphty/src/gpu/accelerator.ts` with this content exactly. It was compiled, linted and prettier-checked against this repository on 2026-09-19 (`npx tsc --noEmit`, `npx eslint`, `npx prettier --check`, all clean):

```ts
/**
 * WebGPU detection and injection for the app (WebGPU design 9.5).
 *
 * The app is the ONLY importer of `@graphty/webgpu-graph-algorithms` (design 9.1): the
 * element owns the `accelerator` property and never acquires a device itself, and the CPU
 * packages own the interfaces the injected object satisfies. Both imports below are STATIC
 * because the app owns its bundle and a code-split `import()` would have to complete before
 * `probeBrowserWebGpu` is called, which is a race with no upside here.
 *
 * What this module deliberately does NOT do:
 *
 * - it never falls back to a CPU path of its own. The element's `LayoutManager` already runs
 *   the CPU simulation when `graph.accelerator` is null, so "no GPU" is the ABSENCE of a call
 *   here, not a branch (root CLAUDE.md: never create fallbacks if WebGPU is not supported);
 * - it never calls `calibrateLayout`. That export does not exist -- the GPU package's barrel
 *   test lists it under `NEVER_EXPORTED` (`webgpu-graph-algorithms/test/index.test.ts:83`) and
 *   asserts the barrel equals the P3 list exactly (`:92`), so a static import of it would not
 *   compile and a dynamic one would throw. `calibrate` is accepted and IGNORED, and the
 *   attachment reports `calibrated: false` so a caller that asked can see that it did not
 *   happen. When the design's P4 lands, this is the one branch that changes.
 */

import { createAccelerator, type GpuContext } from "@graphty/webgpu-graph-algorithms";
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

import type { GpuPreferenceValue } from "./gpuPrefs";

/** The chip's four states. `"probing"` is the one the bar does NOT draw: see {@link GPU_STATUS_PENDING}. @public */
export type GpuState = "lost" | "off" | "on" | "probing";

/** The label's fixed first half. The one home for the words, so a test can quote it. @public */
export const GPU_LABEL_PREFIX = "GPU acceleration";

/** What the indicator says and what its tooltip says, for one moment in time. @public */
export interface GpuStatus {
    /** Which of the three states the app is in. */
    readonly state: GpuState;
    /** The chip's label, e.g. `GPU acceleration: on (nvidia lovelace)`. */
    readonly label: string;
    /** The chip's tooltip: the whole reason, in one sentence. */
    readonly title: string;
}

/**
 * The one graph method this module calls. Structural rather than imported: the element's real
 * `Graph` type is unreachable from the app (see `elementBridge.ts`).
 * @public
 */
export interface AcceleratorHost {
    /** Injects the accelerator, or removes it with null (design 9.4 item 1). */
    setAccelerator: (accelerator: unknown) => void;
}

/** What `attachAccelerator` is asked to do. @public */
export interface AttachAcceleratorOptions {
    /** The reader's preference. `"off"` returns before probing; `"required"` throws instead of returning off. */
    readonly gpu: GpuPreferenceValue;
    /**
     * RESERVED SEAM, no caller at M7. The exact-tier node ceiling for this device, forwarded to every
     * simulation the accelerator creates. Nothing in this phase supplies it -- `useGpuAccelerator` does
     * not, the stories do not, and no test covers a defined value, because reaching the forwarding line
     * needs a real device and every test here is an off-state test. Design P4's `calibrateLayout` is
     * what will supply it (PLAN DECISION 3). Left undefined it forwards `undefined`, which leaves the
     * GPU package's own default in force (`EXACT_MAX_NODES` = 32768,
     * `webgpu-graph-algorithms/src/constants.ts:32`, applied at `:101`).
     */
    readonly exactMaxNodes?: number;
    /** Accepted and IGNORED until the design's P4 ships `calibrateLayout`; see the module doc. */
    readonly calibrate?: boolean;
    /** Called once when the device is lost, after the accelerator has been removed. */
    readonly onStatusChange?: (status: GpuStatus) => void;
}

/** The result of one attach attempt. @public */
export interface GpuAttachment {
    /** The status as of the moment the attach finished. */
    readonly status: GpuStatus;
    /** Whether `calibrateLayout` ran. Always false today; see the module doc. */
    readonly calibrated: boolean;
    /** Removes the accelerator and disposes the context. Idempotent; safe when nothing was attached. */
    readonly detach: () => void;
}

/**
 * The status when nothing was attached.
 * @param reason - why there is no accelerator, as the tooltip will say it.
 * @returns the off status.
 */
function offStatus(reason: string): GpuStatus {
    return { state: "off", label: `${GPU_LABEL_PREFIX}: off`, title: reason };
}

/**
 * The on label, which names the adapter when the adapter named itself.
 *
 * `vendor` and `architecture` are plain strings on `GpuCaps` and either may be empty -- Dawn
 * fills both, some browsers redact them for fingerprinting -- so an empty pair collapses to the
 * bare label rather than printing `on ( )`.
 * @param vendor - `ctx.caps.vendor`.
 * @param architecture - `ctx.caps.architecture`.
 * @returns the chip's label.
 */
export function gpuOnLabel(vendor: string, architecture: string): string {
    const adapter = [vendor, architecture].filter((part) => part.length > 0).join(" ");

    return adapter.length === 0 ? `${GPU_LABEL_PREFIX}: on` : `${GPU_LABEL_PREFIX}: on (${adapter})`;
}

/**
 * Probes for WebGPU and, when it is there, injects an accelerator into the element's Graph.
 *
 * The order is the design's (9.5): the preference first, then ONE probe, then a context built
 * from the PROBED adapter -- never a second `requestAdapter()`, which could hand back a
 * different device from the one the probe judged.
 * @param host - the element's Graph, narrowed by `asAcceleratorHost`.
 * @param options - the reader's preference and the device tuning.
 * @returns what happened, and how to undo it.
 * @throws when `gpu` is `"required"` and the probe failed: the caller asked to be told.
 */
export async function attachAccelerator(
    host: AcceleratorHost,
    options: AttachAcceleratorOptions,
): Promise<GpuAttachment> {
    const noop = (): void => {
        /* nothing was attached. */
    };

    if (options.gpu === "off") {
        return { status: offStatus("Turned off in Settings > Performance."), calibrated: false, detach: noop };
    }

    const probe = await probeBrowserWebGpu({ rejectSoftware: options.gpu === "auto" });

    if (!probe.ok) {
        const reason = probe.reason ?? probe.code;

        if (options.gpu === "required") {
            throw new Error(reason);
        }

        return { status: offStatus(reason), calibrated: false, detach: noop };
    }

    const ctx: GpuContext = await requestGpuContext({ adapter: probe.adapter ?? undefined, limits: "raise" });

    host.setAccelerator(createAccelerator(ctx, { layout: { exactMaxNodes: options.exactMaxNodes } }));

    const status: GpuStatus = {
        state: "on",
        label: gpuOnLabel(ctx.caps.vendor, ctx.caps.architecture),
        title: ctx.caps.software
            ? `${ctx.caps.description} (software renderer). Layouts run on the GPU.`
            : `${ctx.caps.description}. Layouts run on the GPU.`,
    };

    void ctx.lost.then((info) => {
        host.setAccelerator(null);
        options.onStatusChange?.({
            state: "lost",
            label: `${GPU_LABEL_PREFIX}: off`,
            title: `The GPU device was lost: ${info.message} Layouts continue on the CPU. Reload the page to try again.`,
        });
    });

    return {
        status,
        calibrated: false,
        detach: () => {
            host.setAccelerator(null);
            ctx.dispose();
        },
    };
}
```

Three things in that body are load-bearing and would be silently wrong if changed. `rejectSoftware: options.gpu === "auto"` is what makes `"auto"` decline lavapipe and SwiftShader and makes `"required"` accept them -- and it is also what makes the `gpu`-tagged stories deterministic on Chromatic (M7-T8). `{ adapter: probe.adapter ?? undefined }` reuses the PROBED, unused adapter, so there is no second `requestAdapter()` that could return a different device from the one the probe judged; `?? undefined` narrows the probe's `GPUAdapter | null` to the option's `GPUAdapter | undefined` because `ok` is a plain boolean and not a discriminant. And `void ctx.lost.then(...)` is attached AFTER `setAccelerator`, so the removal can never run before the injection it undoes.

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint src/gpu && npx prettier --check "src/gpu/**"`
Expected: all three exit 0.

- [ ] **Step 3: The tests, which must override `navigator.gpu`**

**PLAN DECISION 7 (how a test asserts the off state):** by OVERRIDING `navigator.gpu`, never by assuming its absence. The app's tests run in real headless Chromium (`graphty/vitest.config.ts:16-22`), and a probe test run on this dev box on 2026-09-19 printed `navigator.gpu present: object` -- so a test that asserted "off" by doing nothing would pass on a runner without WebGPU and fail on one with it, which is the worst kind of flake because it is machine-shaped. The shape is the one `App.test.tsx:39-52` already uses for `window.innerWidth`: capture the real descriptor, `Object.defineProperty` an override, and delete the instance property afterwards so the prototype getter shows through again.

Create `graphty/src/gpu/__tests__/accelerator.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { attachAccelerator, GPU_LABEL_PREFIX, gpuOnLabel } from "../accelerator";

/**
 * The app's tests run in REAL headless Chromium (`vitest.config.ts` browser provider
 * playwright), so `navigator.gpu` may actually be PRESENT -- on this dev box it is, and on a
 * CI runner it depends on the Chromium build and its flags. A test that asserts the off state
 * must therefore OVERRIDE `navigator.gpu`, never assume its absence.
 */
const realGpu = Object.getOwnPropertyDescriptor(Navigator.prototype, "gpu");

function withoutWebGpu(): void {
    Object.defineProperty(navigator, "gpu", { configurable: true, value: undefined });
}

afterEach(() => {
    Reflect.deleteProperty(navigator, "gpu");
});

describe("gpuOnLabel", () => {
    it("names the adapter when the adapter named itself", () => {
        expect(gpuOnLabel("nvidia", "lovelace")).toBe(`${GPU_LABEL_PREFIX}: on (nvidia lovelace)`);
    });

    it("collapses to the bare label when both strings are redacted", () => {
        expect(gpuOnLabel("", "")).toBe(`${GPU_LABEL_PREFIX}: on`);
    });

    it("prints the one half it has", () => {
        expect(gpuOnLabel("apple", "")).toBe(`${GPU_LABEL_PREFIX}: on (apple)`);
    });
});

describe("attachAccelerator", () => {
    it('never probes when the reader chose "off"', async () => {
        const setAccelerator = vi.fn();
        const probed = vi.fn();
        Object.defineProperty(navigator, "gpu", {
            configurable: true,
            get: () => {
                probed();

                return undefined;
            },
        });

        const attachment = await attachAccelerator({ setAccelerator }, { gpu: "off" });

        expect(attachment.status.state).toBe("off");
        expect(attachment.calibrated).toBe(false);
        expect(setAccelerator).not.toHaveBeenCalled();
        expect(probed).not.toHaveBeenCalled();
    });

    it('stays on the CPU and injects nothing when "auto" finds no WebGPU', async () => {
        withoutWebGpu();
        const setAccelerator = vi.fn();

        const attachment = await attachAccelerator({ setAccelerator }, { gpu: "auto" });

        expect(attachment.status.state).toBe("off");
        expect(attachment.status.label).toBe(`${GPU_LABEL_PREFIX}: off`);
        expect(attachment.status.title.length).toBeGreaterThan(0);
        expect(setAccelerator).not.toHaveBeenCalled();
    });

    it('throws instead of returning off when the reader chose "required"', async () => {
        withoutWebGpu();

        await expect(attachAccelerator({ setAccelerator: vi.fn() }, { gpu: "required" })).rejects.toThrow();
    });

    it("reports calibrated: false even when the caller asked to calibrate", async () => {
        withoutWebGpu();

        const attachment = await attachAccelerator({ setAccelerator: vi.fn() }, { gpu: "auto", calibrate: true });

        expect(attachment.calibrated).toBe(false);
    });

    it("restores navigator.gpu after an override, leaving the prototype descriptor untouched", () => {
        withoutWebGpu();
        expect(Object.getOwnPropertyDescriptor(navigator, "gpu")).toBeDefined();

        Reflect.deleteProperty(navigator, "gpu");

        expect(Object.getOwnPropertyDescriptor(navigator, "gpu")).toBeUndefined();
        expect(Object.getOwnPropertyDescriptor(Navigator.prototype, "gpu")).toEqual(realGpu);
    });
});
```

The last case is the cleanup's own board, and it is written so that it CAN fail. The obvious form -- `expect(realGpu === undefined || typeof realGpu.get === "function").toBe(true)` -- is a tautology: `realGpu` is captured once at module load, before any test runs, and no test in this file can change a descriptor on `Navigator.prototype`, so the expression is true in every state this suite produces. The form above fails if `withoutWebGpu` ever starts writing to the prototype instead of the instance (the first assertion goes undefined), if the instance property outlives the delete (the second), or if anything in the file mutates the prototype descriptor (the third) -- which is the leak the case is named for.

Run: `cd AT/graphty && npx vitest run src/gpu/__tests__`
Expected: `Test Files 2 passed (2)`, `Tests 13 passed (13)` -- the 5 of `gpuPrefs.test.ts` and the 8 of this file. The first seven of this file's eight were measured on 2026-09-19 against the earlier draft (12 passed in 716 ms with the four-case `gpuPrefs.test.ts`). If `never probes when the reader chose "off"` fails, the early return moved below the probe and the `"off"` preference has stopped meaning off.

- [ ] **Step 4: Checkpoint** -- `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/gpu src/components/shell/analysis` all green; `LC_ALL=C grep -nP '[^\x00-\x7F]' src/gpu/*.ts src/gpu/__tests__/*.ts src/components/shell/analysis/elementBridge.ts` prints nothing. No commit by this task.

### Task M7-T5: the graph-ready signal and `useGpuAccelerator`

**Repository:** `AT`.

**Files:**
- Modify: `graphty/src/components/Graphty.tsx:133-148` (the `onGraphReady` prop) and `:500-551` (the existing poll reports it)
- Modify: `graphty/src/components/shell/canvas/CanvasRegion.tsx:83-102` (the config member) and `:434-446` (pass it down)
- Create: `graphty/src/hooks/useGpuAccelerator.ts`
- Create: `graphty/src/hooks/__tests__/useGpuAccelerator.test.tsx`
- Modify: `graphty/src/components/shell/AppShell.tsx` (the `elementGraph` state beside `graphtyRef` at `:1096`, and `onGraphReady` in the canvas graph config at `:4691-4697`). The HOOK CALL is NOT here: it lands in M7-T6 Step 4, in the same edit as its consumer -- see Step 4 below.
- NOT touched: `graphty/src/components/GraphtyEnhanced.tsx` (a standalone wrapper the shell does not use), `graphty/src/hooks/useAiManager.ts`

**Interfaces:**
- Consumes: `asAcceleratorHost` and `attachAccelerator` from M7-T4; `GpuPreferenceValue`, `readPersistedGpuSettings`, `resolveGpuSettings` from M7-T3.
- Produces: `useGpuAccelerator({ graph, preference }): GpuStatus` and `GPU_STATUS_PENDING`, CALLED by M7-T6 Step 4 and read by M7-T6 and M7-T7; `GraphtyProps.onGraphReady`, `CanvasGraphConfig.onGraphReady`, and the shell's `elementGraph` state, which M7-T6 Step 4 hands to the hook.

**PLAN DECISION 2 (how the app learns the Graph is ready):** the app reuses the poll that already exists. `graphtyRef.current?.graph` is `null` for the first frames (`Graphty.tsx:409-411` returns `graphtyRef.current?.graph ?? null`, and the custom element boots asynchronously), there is NO `graph-ready` event on the element, and `AppShell.tsx:1415-1419` reads the ref DURING RENDER, which works only because a later re-render re-reads it. `Graphty.tsx:520-543` already polls at 50 ms for exactly this question, with the comment "Poll until graph is ready (graphty-element initializes asynchronously)" at `:521`. So: that poll gains a second consumer through a new `onGraphReady` prop, the shell stores the value in STATE, and the hook keys its effect on that state. Rejected alternatives, both named because they look easier: a second `setInterval` in the hook would be two answers to one question that can disagree for one tick; and adding a `graph-ready` event to `graphty-element` is element work that Phase M6 did not scope, so it would arrive as a surprise dependency on a phase already on master.

The one subtlety the edit must not lose: that effect currently returns early when `onStylesChange` is absent (`Graphty.tsx:503-505`), so the poll would never start for a caller that only wants readiness. The guard widens to "neither callback", and the style listener keeps its own guard.

- [ ] **Step 1: Write the failing test**

Create `graphty/src/hooks/__tests__/useGpuAccelerator.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor } from "../../test/test-utils";
import { GPU_LABEL_PREFIX } from "../../gpu/accelerator";
import { GPU_STATUS_PENDING, useGpuAccelerator } from "../useGpuAccelerator";

function Probe({ graph }: { graph: unknown }): React.JSX.Element {
    const status = useGpuAccelerator({ graph, preference: "off" });

    return <span data-testid="gpu-state">{`${status.state}|${status.label}`}</span>;
}

afterEach(() => {
    Reflect.deleteProperty(navigator, "gpu");
});

describe("useGpuAccelerator", () => {
    it("reports the pending status while there is no graph, and injects nothing", () => {
        render(<Probe graph={null} />);

        expect(screen.getByTestId("gpu-state").textContent).toBe(
            `${GPU_STATUS_PENDING.state}|${GPU_STATUS_PENDING.label}`,
        );
    });

    it("says so when the element has no setAccelerator", async () => {
        render(<Probe graph={{ runAlgorithm: vi.fn() }} />);

        await waitFor(() => {
            expect(screen.getByTestId("gpu-state").textContent).toBe(`off|${GPU_LABEL_PREFIX}: off`);
        });
    });

    it('attaches nothing and reports off when the preference is "off"', async () => {
        const setAccelerator = vi.fn();

        render(<Probe graph={{ setAccelerator }} />);

        await waitFor(() => {
            expect(screen.getByTestId("gpu-state").textContent).toBe(`off|${GPU_LABEL_PREFIX}: off`);
        });
        expect(setAccelerator).not.toHaveBeenCalled();
    });
});
```

Run: `cd AT/graphty && npx vitest run src/hooks/__tests__/useGpuAccelerator.test.tsx`
Expected: FAIL -- `Failed to resolve import "../useGpuAccelerator"`.

- [ ] **Step 2: The hook**

Create `graphty/src/hooks/useGpuAccelerator.ts` with this content exactly (compiled, linted and prettier-checked against this repository on 2026-09-19):

```ts
/**
 * The shell's one GPU attachment: probe once, inject once, and report what happened.
 *
 * It copies `useAiManager`'s shape -- an effect guarded on the graph being there, a `cancelled`
 * flag for the async init, and a cleanup that undoes what the init did -- because the element's
 * `graph` is null for the first frames and an attach that lands after the component unmounted
 * would inject into a disposed Graph.
 *
 * It does NOT poll. `Graphty.tsx` already polls at 50 ms for exactly this ("Poll until graph is
 * ready (graphty-element initializes asynchronously)") and now reports the result through
 * `onGraphReady`; a second interval would be a second answer to one question.
 */

import { useEffect, useState } from "react";

import { asAcceleratorHost } from "../components/shell/analysis/elementBridge";
import { attachAccelerator, GPU_LABEL_PREFIX, type GpuStatus } from "../gpu/accelerator";
import type { GpuPreferenceValue } from "../gpu/gpuPrefs";

/** What the hook is asked. @public */
export interface UseGpuAcceleratorOptions {
    /** The element's Graph, or null until the element has booted. */
    readonly graph: unknown;
    /** The reader's preference, from Settings > Performance. */
    readonly preference: GpuPreferenceValue;
}

/**
 * The status before the probe has answered. Its own state so the bar can draw NOTHING while the
 * probe runs: a chip that says `off` for 30 ms and then `on` reads as a fault the reader saw.
 * @public
 */
export const GPU_STATUS_PENDING: GpuStatus = {
    state: "probing",
    label: `${GPU_LABEL_PREFIX}: off`,
    title: "Looking for a GPU.",
};

/**
 * Probes for WebGPU once the element's Graph exists, injects the accelerator, and follows the
 * device to its loss.
 * @param options - the graph and the reader's preference.
 * @returns the current status, which the status bar draws.
 */
export function useGpuAccelerator(options: UseGpuAcceleratorOptions): GpuStatus {
    const { graph, preference } = options;
    const [status, setStatus] = useState<GpuStatus>(GPU_STATUS_PENDING);

    useEffect(() => {
        const host = asAcceleratorHost(graph);

        if (host === null) {
            setStatus(
                graph === null || graph === undefined
                    ? GPU_STATUS_PENDING
                    : {
                          state: "off",
                          label: `${GPU_LABEL_PREFIX}: off`,
                          title: "This build of graphty-element has no accelerator property.",
                      },
            );

            return undefined;
        }

        let cancelled = false;
        let detach = (): void => {
            /* nothing was attached. */
        };

        attachAccelerator(host, {
            gpu: preference,
            onStatusChange: (next) => {
                if (!cancelled) {
                    setStatus(next);
                }
            },
        })
            .then((attachment) => {
                if (cancelled) {
                    attachment.detach();

                    return;
                }

                ({ detach } = attachment);
                setStatus(attachment.status);
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setStatus({
                        state: "off",
                        label: `${GPU_LABEL_PREFIX}: off`,
                        title: error instanceof Error ? error.message : String(error),
                    });
                }
            });

        return () => {
            cancelled = true;
            detach();
        };
    }, [graph, preference]);

    return status;
}
```

`({ detach } = attachment);` rather than `detach = attachment.detach;` is not a style choice: the repository's `prefer-destructuring` rule is an error and rejects the second form.

Run: `cd AT/graphty && npx vitest run src/hooks/__tests__/useGpuAccelerator.test.tsx && npx eslint src/hooks/useGpuAccelerator.ts && npx prettier --check src/hooks/useGpuAccelerator.ts`
Expected: 3 tests pass; eslint and prettier exit 0.

- [ ] **Step 3: The readiness signal**

In `graphty/src/components/Graphty.tsx`, add to `GraphtyProps` (after `onStylesChange` at `:147`):

```ts
    /**
     * Called once, with the element's `Graph`, as soon as the element has finished booting.
     *
     * It rides the poll the style effect already runs rather than starting a second one: the
     * element initialises asynchronously and publishes no readiness event, so there is exactly
     * one place in this file that knows the answer and this is it.
     */
    onGraphReady?: (graph: unknown) => void;
```

add `onGraphReady` to the destructured props at `:291`, and change the style effect (`:500-551`) in three places:

```ts
        if (!element || !onStylesChange) {
```

becomes

```ts
        if (!element || (!onStylesChange && !onGraphReady)) {
```

the style handler gains the same guard it now needs on its own,

```ts
            const { graph } = element;
            if (!graph || typeof graph.getLayers !== "function") {
```

becomes

```ts
            const { graph } = element;
            if (!graph || typeof graph.getLayers !== "function" || !onStylesChange) {
```

and the poll's success branch reports to both consumers:

```ts
                handleStyleChanged();
```

becomes

```ts
                handleStyleChanged();
                onGraphReady?.(element.graph);
```

with the dependency array at `:551` becoming `[onGraphReady, onStylesChange]`.

Then in `graphty/src/components/shell/canvas/CanvasRegion.tsx`, add to `CanvasGraphConfig` after `onStylesChange` (`:101`):

```ts
    /** The element's Graph has finished booting. */
    readonly onGraphReady?: (graph: unknown) => void;
```

and pass it at `:445`, after `onStylesChange={graph?.onStylesChange}`:

```tsx
                    onGraphReady={graph?.onGraphReady}
```

Reason the early-return guard has to widen: today the poll runs only because the shell always supplies `onStylesChange` (`AppShell.tsx:4696`). A caller that wanted readiness alone would get no poll at all, and the GPU chip would sit at `probing` forever with nothing in the log to say why.

Run: `cd AT/graphty && npx vitest run src/components/Graphty.test.tsx && npx tsc --noEmit`
Expected: the existing Graphty tests pass unchanged (they do not pass `onGraphReady`, so the effect's behaviour for them is byte-identical), and the type-check is clean.

- [ ] **Step 4: The shell wires it up**

In `graphty/src/components/shell/AppShell.tsx`, beside `const graphtyRef = useRef<GraphtyHandle>(null);` (`:1096`):

```ts
    /* The element's Graph as STATE, not as a ref read during render.
       `graphtyRef.current?.graph` is null for the first frames and a ref does not re-render when
       it fills in; the GPU attachment needs an effect that runs exactly once, when it fills in.
       `Graphty.tsx`'s existing 50 ms poll is what sets this (`onGraphReady` below). */
    const [elementGraph, setElementGraph] = useState<unknown>(null);
```

and in the canvas `graph` config (`:4691-4697`), after `onStylesChange: handleStylesChange,`:

```ts
            onGraphReady: setElementGraph,
```

No new import in this step. The hook call and the preference read belong to M7-T6 Step 4, which is the step that also adds their consumer.

`setElementGraph` is a stable setter, so the canvas config memo's dependency list does not change. It is also safe to hand `onGraphReady` directly: a `useState` setter given a FUNCTION treats it as an updater rather than a value, and that would store `undefined` instead of the graph -- but the element's `Graph` is a class instance, never a function, so the direct form is correct. If a future element ever hands back a callable, wrap it: `onGraphReady: (graph) => setElementGraph(() => graph)`.

**Why the hook call is not in this step, and why this step does not run eslint.** `eslint.config.js:134-140` sets `"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]`. Neither `gpuStatus` nor `elementGraph` matches `^_`, and an unused `const` -- including an unused element of an array destructuring -- is exactly what that rule reports, at error level; `graphty/tsconfig.json:16`'s `noUnusedLocals: false` silences `tsc`, not eslint. So `gpuStatus` cannot be introduced in one task and consumed in the next without a red lint run in between, and adding a disable is forbidden by this plan's own constraints.

The resolution is ordering, not suppression. `elementGraph` is still unread at the end of THIS step (the config memo uses `setElementGraph`, not `elementGraph`), so `npx eslint` would fail here too. That is harmless because M7-T5 and M7-T6 land in ONE commit (M7-T9 Step 5, `feat(graphty): report GPU acceleration in the status bar and when the device is lost`) and the tree is never committed in the intermediate state. This step therefore checks types and tests and defers eslint to M7-T6 Step 5, which is the first checkpoint at which every symbol this pair introduces has a reader.

Run: `cd AT/graphty && npx tsc --noEmit && npx vitest run src/components/shell/__tests__/AppShell.test.tsx`
Expected: both green. Do NOT add `npx eslint` here: it will report `'elementGraph' is assigned a value but never used` and that is the expected intermediate state, not a defect. If you want a lint signal now, run `npx eslint src/components/Graphty.tsx src/components/shell/canvas/CanvasRegion.tsx src/hooks` -- those three are complete at this step and must be clean.

- [ ] **Step 5: Checkpoint** -- `npx vitest run src/hooks src/components/Graphty.test.tsx src/components/shell/__tests__` green; `npx eslint src/components/Graphty.tsx src/components/shell/canvas/CanvasRegion.tsx src/hooks` clean; `LC_ALL=C grep -nP '[^\x00-\x7F]' src/hooks/useGpuAccelerator.ts src/hooks/__tests__/useGpuAccelerator.test.tsx` prints nothing. The whole-package `npx eslint` is M7-T6 Step 5's checkpoint, for the reason Step 4 gives. No commit by this task.

### Task M7-T6: the indicator chip and the device-lost report

**Repository:** `AT`.

**Files:**
- Modify: `graphty/src/components/shell/statusbar/statusBarModel.ts` (a type-only widening: `StatusBarGpuMode`, `StatusBarIssuesModel`, `StatusBarSlotsModel.issues`)
- Modify: `graphty/src/components/shell/statusbar/StatusBarSlots.tsx:319-347` (the chip, drawn beside the Performance chip)
- Modify: `graphty/src/components/shell/statusbar/StatusBar.tsx:109-121` (`visibleIssues` learns the fourth member)
- Modify: `graphty/src/components/shell/AppShell.tsx` -- the hook call and the preference read beside `useAiManager` (`:1415`), the `issues` slot's first producer, hoisted ABOVE the slots memo's `dataLoaded` guard (`:4253-4283`), and the completion widened beyond the load (`:4314-4328`)
- Modify: `graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx` (the chip's three cases)
- Modify: `graphty/src/components/shell/__tests__/AppShell.test.tsx` (one case: the bar draws no GPU chip while the probe has not answered)
- NOT touched: `graphty/src/components/shell/types.ts` (the frozen nine-slot contract; `statusBarModel.ts` is the documented place to extend it), `graphty/src/components/shell/constants.ts` (`issues` is already in `STATUS_BAR_NEVER_DROP`), `graphty/src/components/shell/statusbar/LoadCompleteToast.tsx`

**Interfaces:**
- Consumes: `GpuStatus` and `useGpuAccelerator` from M7-T4 and M7-T5, plus the `elementGraph` state M7-T5 added; `StatusBarChip` (`StatusBarChip.tsx:85`); the local `StatusDot` (`StatusBarSlots.tsx:74-80`); `StatusBarCompletion` (`statusBarModel.ts:117-150`).
- Produces: `StatusBarGpuMode`, `StatusBarIssuesModel`, and a `StatusBarSlotsModel.issues` that the app actually fills.

**PLAN DECISION 5 (what the indicator is, and which slot produces it):** a `StatusBarChip` in the `issues` slot, declared as `StatusBarGpuMode` in `statusBarModel.ts` and shaped EXACTLY like `StatusBarPerformanceMode` (`types.ts:690-698`): `label`, `title`, `onClick`. `StatusBarChip.tsx:1-8` says in its own doc that "Every chip in the bar is this atom", and the project's UI rule forbids a bespoke control, so a Mantine `Badge` like `components/ai/AiStatusIndicator.tsx` is out: that badge belongs to the AI panel body, not to the shell chrome. Two facts make this more work than "add a member". First, the `issues` slot has NEVER been produced by this app -- `AppShell.tsx:4253-4283` builds `counts`, `layout` and `selection` and nothing else, and it builds none of them until a dataset has loaded, because the memo opens with `if (!dataLoaded) { return {}; }` at `:4254-4256` -- so this is the slot's first producer, it has to sit ABOVE that guard (Step 4), and `StatusBar.test.tsx` gets the first test that draws it. Second, `StatusBar.tsx:109-121`'s `visibleIssues` has an EXPLICIT three-member emptiness check (`validation`, `notes`, `performance`); a gpu-only issues model handed to today's code would be dropped on the floor with no error. The widening goes in `statusBarModel.ts` and NOT in `types.ts` because `statusBarModel.ts:1-13` is the documented place for it, and it must stay TYPE-ONLY: `graphty/vitest.config.ts:53-59` exempts that file from coverage on the tested ground that it "declares interfaces and nothing else", and one exported constant would void the exemption.

**PLAN DECISION 6 (how a lost device surfaces):** through the app's one toast, `LoadCompleteToast`, fed a `StatusBarCompletion` with `severity: "error"`, `actionLabel: "Open Settings"` and no `onDismiss` -- and the chip flips to the lost label and STAYS there, so the fact survives the toast. The design sketch calls `showToast(...)`; the app has no such function. What it has is one toast component whose own doc (`LoadCompleteToast.tsx:15-25`) generalises it -- "a load ends, and this is the line that says how it ended" -- while its PRODUCER is load-scoped (`AppShell.tsx:4314`, `undefined` unless `loadFailure !== null`). So the producer widens and the component does not change. `@mantine/notifications` is NOT added: it is not a dependency anywhere in the app, `compact-mantine` publishes no toast, and adding a notification system to report one event would be a second toast register for a reader to learn. `onDismiss` stays absent for the same reason the failed load's does: `AppShell.tsx:4309-4313` says "An error that erases itself six seconds later is the silent failure again in a nicer font". Precedence when both are present: the LOAD failure wins, because the reader just acted and the GPU fact is still on the chip; a device lost while a load is failing is the rarer of two rare things and losing its toast costs nothing the chip does not carry.

- [ ] **Step 1: Write the failing test**

Add to `graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx`:

```tsx
describe("the GPU chip", () => {
    const gpu = {
        label: "GPU acceleration: on (nvidia lovelace)",
        title: "NVIDIA lovelace. Layouts run on the GPU.",
        onClick: vi.fn(),
    };

    it("draws in the issues slot on its own, with its label and its tooltip", () => {
        const { container } = renderBar({ slots: { counts, issues: { gpu } } });

        expect(screen.getByText(gpu.label)).toBeInTheDocument();
        expect(screen.getByTitle(gpu.title)).toBeInTheDocument();
        expect(slotOrder(getBar(container))).toContain("issues");
    });

    it("opens Settings when clicked", () => {
        renderBar({ slots: { counts, issues: { gpu } } });
        fireEvent.click(screen.getByText(gpu.label));

        expect(gpu.onClick).toHaveBeenCalledTimes(1);
    });

    it("draws nothing when the issues slot is empty", () => {
        const { container } = renderBar({ slots: { counts, issues: {} } });

        expect(slotOrder(getBar(container))).not.toContain("issues");
    });
});
```

Three cases, not four. The first already asserts that `gpu` alone makes the slot render -- a fourth case asserting `slotOrder(...)` contains `"issues"` against the same input adds no coverage, it just runs the first case's second assertion again.

All three go through the file's own `renderBar` helper (`StatusBar.test.tsx:43-55`) rather than calling `render` directly, so they inherit the `WIDE_SHELL` (1440 px) host every other case in the file gets. The helper exists because section 4.3's overflow rule is measured: on a narrow viewport the bar correctly DROPS slots. The GPU chip happens to survive that anyway -- `issues` is one of the three ids in `STATUS_BAR_NEVER_DROP` (`constants.ts:795`, beside `counts` and `running`) -- but a board that depends on an invariant it never names is a board that breaks silently when the invariant moves, so it takes the host like everything else and the invariant is written down here.

Run: `cd AT/graphty && npx vitest run src/components/shell/statusbar/__tests__/StatusBar.test.tsx`
Expected: FAIL -- the first two cases fail, for one reason each that is really the same reason: `issues.gpu` is not in the type, and `visibleIssues` drops a model with no `validation`, `notes` or `performance`, so the slot never renders. The third passes already.

- [ ] **Step 2: The model**

In `graphty/src/components/shell/statusbar/statusBarModel.ts`, add the two interfaces (type-only, as the module's exemption requires) and widen the slots model. The import line at `:15` gains `StatusBarIssues`:

```ts
/**
 * Slot 7d: whether the app is using a GPU for layouts, and which one.
 *
 * The same three members as {@link StatusBarPerformanceMode} because it is the same KIND of
 * fact -- a machine-level mode the reader can change in Settings > Performance -- and the bar
 * has one chip register, not one per subject (WebGPU design 9.5's "GPU acceleration: on (vendor
 * arch) / off" indicator).
 */
export interface StatusBarGpuMode {
    /** e.g. `GPU acceleration: on (nvidia lovelace)` or `GPU acceleration: off`. */
    readonly label: string;
    /** The adapter's own description, or why there is no accelerator. */
    readonly title: string;
    /** Opens Settings > Performance, the same door the Performance mode chip opens. */
    readonly onClick: () => void;
}

/**
 * Slot 7, widened with the GPU chip. It draws last of the four, so the two chips a DATASET
 * produced (validation, notes) come before the two a MACHINE produced.
 */
export interface StatusBarIssuesModel extends StatusBarIssues {
    /** The GPU acceleration chip. */
    readonly gpu?: StatusBarGpuMode;
}
```

and `StatusBarSlotsModel` gains a third override:

```ts
    /** Slot 7. */
    readonly issues?: StatusBarIssuesModel;
```

Run: `cd AT/graphty && npx tsc --noEmit && grep -nE '^(export )?(function|const|let|class)' src/components/shell/statusbar/statusBarModel.ts; echo "rc=$?"`
Expected: the type-check is clean, and the grep prints nothing with `rc=1` -- which is the condition `vitest.config.ts:53-59` states for the coverage exemption. If the grep prints a line, the exemption is void and the file needs a test.

- [ ] **Step 3: The drawing and the emptiness check**

In `graphty/src/components/shell/statusbar/StatusBar.tsx`, `visibleIssues` (`:109-121`) becomes:

```ts
function visibleIssues(
    issues: StatusBarIssuesModel | undefined,
    exploreNotesExpanded: boolean,
): StatusBarIssuesModel | undefined {
    if (issues === undefined) {
        return undefined;
    }

    const notes = exploreNotesExpanded ? undefined : issues.notes;

    if (
        issues.validation === undefined &&
        notes === undefined &&
        issues.performance === undefined &&
        issues.gpu === undefined
    ) {
        return undefined;
    }

    return { validation: issues.validation, notes, performance: issues.performance, gpu: issues.gpu };
}
```

The two names live in DIFFERENT modules, so this is two import edits and not one swap. `StatusBar.tsx:27` is `import type { StatusBarIssues, StatusBarSlotId } from "../types";` and `:31` is `import type { StatusBarRegionProps } from "./statusBarModel";`. They become:

```ts
import type { StatusBarSlotId } from "../types";
```

and

```ts
import type { StatusBarIssuesModel, StatusBarRegionProps } from "./statusBarModel";
```

Editing only line 31 and leaving line 27 alone gives `TS2305: Module '"../types"' has no exported member 'StatusBarIssuesModel'` if you move the name, or an eslint error if you add the new name and keep the old one: after this edit nothing in `StatusBar.tsx` names `StatusBarIssues`, and `@typescript-eslint/no-unused-vars` is an error (`eslint.config.js:134-140`), which the step's own `npx eslint` gate would catch.

In `graphty/src/components/shell/statusbar/StatusBarSlots.tsx`, `StatusBarIssuesSlot` (`:319`) takes the model and draws the fourth chip last:

```tsx
export function StatusBarIssuesSlot({ issues }: { issues: StatusBarIssuesModel }): React.JSX.Element {
    const { validation, notes, performance, gpu } = issues;
```

and, after the `performance` chip's block (`:341-345`):

```tsx
            {gpu === undefined ? null : (
                <StatusBarChip
                    leading={
                        <StatusDot
                            color={gpu.label.includes(": on") ? PANEL_INK.SUCCESS : PANEL_INK.CHROME}
                            size={STATUS_BAR_GEOMETRY.AI_DOT}
                        />
                    }
                    onClick={gpu.onClick}
                    title={gpu.title}
                >
                    {gpu.label}
                </StatusBarChip>
            )}
```

with `StatusBarIssuesModel` added to the `./statusBarModel` type import at `:29` and `StatusBarIssues` REMOVED from the `../types` import at `:17-25` -- not "if nothing else uses it": nothing else does, and leaving it is an eslint error (`@typescript-eslint/no-unused-vars`, measured on 2026-09-19). The dot reuses `StatusDot` (`:74-80`; `:67-73` is its JSDoc) and `STATUS_BAR_GEOMETRY.AI_DOT` (6 px, `statusBarGeometry.ts:85`) rather than a new glyph: the AI slot already draws a state dot at that size, and a second bolt beside the Performance bolt would read as two warnings.

Run: `cd AT/graphty && npx vitest run src/components/shell/statusbar && npx eslint src/components/shell/statusbar && npx tsc --noEmit`
Expected: 49 tests pass in `StatusBar.test.tsx` -- the 46 that pass on master today plus this task's three -- and eslint and tsc exit 0. The three edits of this step were applied to master on 2026-09-19 as a check and gave exactly that, with the whole statusbar / gpu / analysis set at 243 passed. Do NOT add a prettier check here: `StatusBarSlots.tsx` is already not prettier-clean on master (`npx prettier --check` warns on it at `HEAD`), and `graphty:lint` is `eslint && tsc --noEmit`, which does not run prettier. If `draws nothing when the issues slot is empty` fails, the emptiness check lost a member.

- [ ] **Step 4: The hook call and the producer**

This is the step that both introduces `gpuStatus` and consumes it, so the value is never live in a tree with no reader (M7-T5 Step 4 says why that matters).

First, beside the `useAiManager` call (`:1415`), add:

```ts
    /* The reader's GPU preference is read ONCE, at mount: `attachAccelerator` runs once when the
       Graph appears, and Settings > Performance says in its own words that a change takes effect
       on reload. Reading it in the initialiser rather than an effect keeps the chip from drawing
       one state and then correcting itself. */
    const [gpuPreference] = useState(() => resolveGpuSettings(readPersistedGpuSettings()).gpu);
    const gpuStatus = useGpuAccelerator({ graph: elementGraph, preference: gpuPreference });
```

with the imports added: `useGpuAccelerator` from `../../hooks/useGpuAccelerator`, `readPersistedGpuSettings` / `resolveGpuSettings` from `../../gpu/gpuPrefs`, and `StatusBarIssuesModel` added to the existing type import at `:211` (`import type { LayoutQuickPick, StatusBarCompletion, StatusBarSlotsModel } from "./statusbar/statusBarModel";`).

Then the producer. It goes IMMEDIATELY ABOVE the slots memo (`:4253`), not inside it:

```ts
    /* The issues slot's FIRST producer in this app. The GPU chip is a machine-level mode, so it
       belongs beside the Performance mode chip and opens the same door.
       Its own memo, above the slots memo, for one reason: the slots memo opens with
       `if (!dataLoaded) { return {}; }`, and whether this machine has a GPU has nothing to do
       with whether a dataset is drawn. A reader who opens Settings > Performance to change the
       preference is usually in the Welcome state, which is exactly the state that guard hides.
       Omitted while the probe is still running: a chip that says "off" for 30 ms and then "on"
       reads as a fault the reader saw. */
    const gpuIssues = useMemo<StatusBarIssuesModel | undefined>(() => {
        if (gpuStatus.state === "probing") {
            return undefined;
        }

        return {
            gpu: {
                label: gpuStatus.label,
                title: gpuStatus.title,
                onClick: () => {
                    setSettingsSection("performance");
                    setSettingsOpen(true);
                },
            },
        };
    }, [gpuStatus.label, gpuStatus.state, gpuStatus.title]);
```

`setSettingsSection` and `setSettingsOpen` are `useState` setters (`AppShell.tsx:1172,1179`), so they are stable and are not dependencies. Its own `useMemo` and not an inline object: an object literal built during render is a new reference every render and would invalidate the slots memo on every render.

Then the slots memo (`:4253-4283`) uses it in BOTH of its exits. The early return:

```ts
    const slots = useMemo<StatusBarSlotsModel>(() => {
        if (!dataLoaded) {
            return gpuIssues === undefined ? {} : { issues: gpuIssues };
        }
```

and the main return gains, after `layout: { ... },`:

```ts
            issues: gpuIssues,
```

with `gpuIssues` added to the memo's dependency array.

What this decides, recorded because the G12 record's section 4 asks for it: the GPU chip appears as soon as the probe answers, WITH OR WITHOUT a dataset, and it is then the only slot in the bar in the Welcome state. Every other slot stays dataset-scoped. The alternative -- leaving the member inside the guard, so the chip appears only once a graph is drawn -- was rejected because it makes a machine fact look like a property of the data, and hides it in the one state a reader goes looking for it.

Then widen the completion memo (`:4314-4328`). Its name stays `loadCompletion` only if it still reports loads alone; it does not, so rename it to `statusCompletion` and update the one use at `:5056`:

```ts
    const statusCompletion = useMemo<StatusBarCompletion | undefined>(() => {
        if (loadFailure !== null) {
            return {
                message: loadFailureSentence(loadFailure),
                severity: "error",
                actionLabel: OPEN_DATA_ACTION,
                onDetails: () => {
                    openPanelAt("data");
                },
            };
        }

        /* The device-lost report. The load failure wins when both are true: the reader just
           acted, and the GPU fact is still on the chip, which does not erase itself. No
           `onDismiss`, for the reason the failed load has none. */
        if (gpuStatus.state !== "lost") {
            return undefined;
        }

        return {
            message: gpuStatus.title,
            severity: "error",
            actionLabel: OPEN_SETTINGS_ACTION,
            onDetails: () => {
                setSettingsSection("performance");
                setSettingsOpen(true);
            },
        };
    }, [gpuStatus.state, gpuStatus.title, loadFailure, openPanelAt]);
```

with one new constant beside `OPEN_DATA_ACTION`:

```ts
/** The device-lost toast's link: it says where it goes, because there is no mapping line to scroll to. */
const OPEN_SETTINGS_ACTION = "Open Settings";
```

Finally, one case in `graphty/src/components/shell/__tests__/AppShell.test.tsx`, which pins the branch the shell's own environment can produce:

```tsx
describe("the GPU chip", () => {
    it("draws no chip while the probe has not answered, with no dataset loaded", async () => {
        const { container } = await renderMeasuredShell();

        expect(container.querySelector("[data-status-spacer]")).not.toBeNull();
        expect(screen.queryByText(/^GPU acceleration/)).toBeNull();
    });
});
```

What this case can and cannot prove, stated so nobody reads more into it than it holds. It proves the hoisted early return still renders a bar and does NOT draw a chip while `gpuStatus.state` is `"probing"` -- it fails if the producer starts emitting a chip before the probe answers. It CANNOT prove the positive: `<graphty-element>` is not registered in the app's vitest environment, so `graphtyRef.current?.graph` is undefined, `onGraphReady` never fires, `elementGraph` stays null and the hook sits at `GPU_STATUS_PENDING` for the whole test. The positive is covered by `StatusBar.test.tsx`'s three cases (the bar draws the chip when the model carries one) and by M7-T9 Step 2's visual pass on the real GPU, and G12 item 3 records it.

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/components/shell`
Expected: all green, including `AppShell.test.tsx`. This is the FIRST whole-package `npx eslint` since M7-T5 Step 4 deferred it; `elementGraph` and `gpuStatus` now both have readers, so `@typescript-eslint/no-unused-vars` has nothing to report. If the AppShell test that asserts the status bar's slot order fails, the `issues` slot is now drawn where it never was before -- check the expectation against `STATUS_BAR_SLOT_ORDER` (`constants.ts:772-782`) and fix the EXPECTATION, not the order.

- [ ] **Step 5: Checkpoint** -- the whole app suite (`npx vitest run`) and the whole-package `npx eslint` are green; `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the six edited files prints nothing. This checkpoint is also M7-T5's: the two tasks share one working tree and one commit. No commit by this task.

### Task M7-T7: the `metricCost` accelerator constant

**Repository:** `AT`.

**Files:**
- Modify: `graphty/src/components/shell/analysis/metricCost.ts` (the constant, the input flag, the divisor, and the optional speedup-table parameter on both entry points)
- Modify: `graphty/src/components/shell/analysis/__tests__/metricCost.test.ts` (the constant's four pins plus the non-unit-table forwarding case)
- Modify: `graphty/src/components/shell/AppShell.tsx:2750-2753, 2764-2786, 2847-2851` (the three call sites pass the flag)
- NOT touched: `graphty/src/components/shell/insights/insightsRules.ts` (it reads `estimateSeconds[capability]`, which now carries the flag's effect automatically), `graphty/src/components/shell/panel/AnalyzePanel.tsx`

**Interfaces:**
- Consumes: `gpuStatus` from M7-T5.
- Produces: `ACCELERATED_SPEEDUP_BY_METRIC`; `MetricCostInput.accelerated`; `estimateMetricSeconds(input, speedups?)` and `estimateSecondsByMetric({ nodeCount, edgeCount, accelerated? }, speedups?)`, both with the real table as the default second argument.

**PLAN DECISION 8 (what the per-metric accelerator constant is worth today):** the constant is a per-metric DIVISOR, `ACCELERATED_SPEEDUP_BY_METRIC`, and every entry is 1 at Phase M7. That is not a placeholder; it is the measured state of the code. `createAccelerator` returns an object carrying `forceAtlas2`, `release` and `dispose` and nothing else (`webgpu-graph-algorithms/src/accelerator.ts:87-117`), and its header is explicit that a method the GPU does not implement "must not exist here -- never a throwing stub", because the CPU dispatchers test `acc.pageRank !== undefined`. So no node metric has a GPU path at M7, and a factor above 1 would be this module claiming a speed the code cannot deliver -- the exact failure its own doc forbids at `metricCost.ts:126` ("do not add an exponent to hide it") and the exact failure its "sampled version" paragraph (`:29-44`) exists to prevent. The integration plan's cell says the gate gains the constant "once the element exposes the flag", and design 9.4's ten items specify NO such flag, so the app supplies it from what it knows: an accelerator is attached (`gpuStatus.state === "on"`). The seam lands now, at value 1, so that Phase M8b changes one number per metric instead of threading a flag through five call sites under time pressure. `degree` will stay 1 whatever P7 ships: the shell reads the degree numbers the import-time pass already wrote and re-runs nothing.

- [ ] **Step 1: Write the failing test**

Add to `graphty/src/components/shell/analysis/__tests__/metricCost.test.ts`, with `ACCELERATED_SPEEDUP_BY_METRIC` added to the import list:

```ts
describe("the accelerator constant", () => {
    it("has one entry per metric", () => {
        expect(Object.keys(ACCELERATED_SPEEDUP_BY_METRIC).sort()).toEqual([...ALL_METRICS].sort());
    });

    it("is 1 everywhere at M7, because no node metric has a GPU path yet", () => {
        for (const metric of ALL_METRICS) {
            expect(ACCELERATED_SPEEDUP_BY_METRIC[metric]).toBe(1);
        }
    });

    it("divides the estimate, so an accelerated run is never dearer than a CPU one", () => {
        for (const metric of ALL_METRICS) {
            const cpu = estimateMetricSeconds({ metric, ...ASK_SIZE });
            const gpu = estimateMetricSeconds({ metric, ...ASK_SIZE, accelerated: true });

            expect(gpu).toBeLessThanOrEqual(cpu);
            expect(gpu).toBe(cpu / ACCELERATED_SPEEDUP_BY_METRIC[metric]);
        }
    });

    it("keeps both surfaces in step: the record agrees with the single estimate", () => {
        const record = estimateSecondsByMetric({ ...ASK_SIZE, accelerated: true });

        for (const metric of ALL_METRICS) {
            expect(record[metric]).toBe(estimateMetricSeconds({ metric, ...ASK_SIZE, accelerated: true }));
        }
    });

    it("forwards the flag through BOTH entry points, measured against a non-unit table", () => {
        /* Every real factor is 1 today, so `cpu / 1 === cpu` and the three cases above pass
           word for word against an implementation in which the flag is read by nobody. This
           case is the one that can tell the difference: it hands both entry points a table
           whose pagerank entry is 2 and checks that the number actually halved. If someone
           drops `input.accelerated` inside `estimateMetricSeconds`, or stops forwarding it
           from `estimateSecondsByMetric`, exactly one of these four assertions fails. */
        const doubled: Readonly<Record<NodeMetricId, number>> = { betweenness: 1, degree: 1, pagerank: 2 };
        const cpu = estimateMetricSeconds({ metric: "pagerank", ...ASK_SIZE });

        expect(estimateMetricSeconds({ metric: "pagerank", ...ASK_SIZE, accelerated: true }, doubled)).toBe(cpu / 2);
        expect(estimateSecondsByMetric({ ...ASK_SIZE, accelerated: true }, doubled).pagerank).toBe(cpu / 2);

        // ...and an absent flag is never divided, whatever the table says.
        expect(estimateMetricSeconds({ metric: "pagerank", ...ASK_SIZE }, doubled)).toBe(cpu);
        expect(estimateSecondsByMetric({ ...ASK_SIZE }, doubled).pagerank).toBe(cpu);
    });
});
```

Run: `cd AT/graphty && npx vitest run src/components/shell/analysis/__tests__/metricCost.test.ts`
Expected: FAIL -- `ACCELERATED_SPEEDUP_BY_METRIC` is not exported, `accelerated` is not in `MetricCostInput`, and neither entry point takes a second parameter.

- [ ] **Step 2: The constant and the divisor**

In `graphty/src/components/shell/analysis/metricCost.ts`, after `BETWEENNESS_PAIRS_PER_SECOND` (`:184`):

```ts
/**
 * The per-metric accelerator constant: how many times faster an accelerated run of this metric is
 * than the CPU estimate above. A DIVISOR on the estimate, one entry per metric, so a metric that
 * gains a GPU path changes one number and nothing else.
 *
 * Every entry is 1 at Phase M7, and that is not a placeholder -- it is the measured state of the
 * code. `createAccelerator` returns an object carrying `forceAtlas2`, `release` and `dispose` and
 * NOTHING else (`webgpu-graph-algorithms/src/accelerator.ts:87-117`), and its header is explicit
 * that a method the GPU does not implement "must not exist here -- never a throwing stub". No node
 * metric has a GPU path, so a factor above 1 would be this module claiming a speed the code cannot
 * deliver, which is what the module doc forbids above ("do not add an exponent to hide it").
 *
 * `degree` stays 1 whatever the GPU ships: the shell reads the degree numbers the import-time pass
 * already wrote and re-runs nothing. `pagerank` and `betweenness` are the two GPU targets of the
 * WebGPU design's phase P7; their factors are measured from that package's
 * `benchmarks/results/gpu-linux-t4.json` and changed here, in its PR, with the numbers in the body.
 * @public
 */
export const ACCELERATED_SPEEDUP_BY_METRIC: Readonly<Record<NodeMetricId, number>> = Object.freeze({
    betweenness: 1,
    degree: 1,
    pagerank: 1,
});
```

`MetricCostInput` (`:217-224`) gains a fourth member:

```ts
    /**
     * Whether an accelerator is attached AND this metric has a GPU path on it. Absent is false: a
     * caller that does not know is a caller running on the CPU.
     */
    readonly accelerated?: boolean;
```

a helper beside `safeCount` (`:266`):

```ts
/**
 * The divisor for one estimate.
 * @param metric - which metric is being estimated.
 * @param accelerated - whether the run would be accelerated.
 * @param speedups - the table to read the factor from. Defaults to the real one; the parameter
 * exists so a board can hand in a table whose entries are not all 1, which is the only way to
 * tell a forwarded flag from a dropped one while every real factor is 1.
 * @returns the speedup factor, never zero.
 */
function speedup(
    metric: NodeMetricId,
    accelerated: boolean | undefined,
    speedups: Readonly<Record<NodeMetricId, number>>,
): number {
    return accelerated === true ? speedups[metric] : 1;
}
```

`estimateMetricSeconds` (`:297-307`) takes the table and divides:

```ts
export function estimateMetricSeconds(
    input: MetricCostInput,
    speedups: Readonly<Record<NodeMetricId, number>> = ACCELERATED_SPEEDUP_BY_METRIC,
): number {
    const nodeCount = safeCount(input.nodeCount);
    const edgeCount = safeCount(input.edgeCount);
    const seconds =
        SECONDS_BY_METRIC[input.metric](nodeCount, edgeCount) / speedup(input.metric, input.accelerated, speedups);
```

(the rest of the body is unchanged), and `estimateSecondsByMetric` (`:324-339`) takes and forwards both:

```ts
export function estimateSecondsByMetric(
    input: {
        readonly nodeCount: number;
        readonly edgeCount: number;
        readonly accelerated?: boolean;
    },
    speedups: Readonly<Record<NodeMetricId, number>> = ACCELERATED_SPEEDUP_BY_METRIC,
): Readonly<Record<NodeMetricId, number>> {
    const seconds = {} as Record<NodeMetricId, number>;

    for (const metric of Object.keys(SECONDS_BY_METRIC) as NodeMetricId[]) {
        seconds[metric] = estimateMetricSeconds(
            {
                metric,
                nodeCount: input.nodeCount,
                edgeCount: input.edgeCount,
                accelerated: input.accelerated,
            },
            speedups,
        );
    }

    return Object.freeze(seconds);
}
```

Both new parameters are OPTIONAL with the real table as the default, so every existing call site -- `estimateMetricCost` (`:410`), the Insights strip, the three AppShell sites of Step 3 -- is unchanged and none of them ever passes a table. Their JSDoc says what they are for in one sentence, because a parameter that exists only so a board can falsify something is a parameter whose reason has to be written down or it gets "simplified" away. This is the honest alternative to the two bad options: pinning the divisor with a frozen all-ones table (a test that passes against an implementation which reads the flag nowhere) and stubbing a frozen module constant (which `Object.freeze` forbids).

Both public entry points funnel through `estimateMetricSeconds`, which is why the flag lands in one place: `estimateMetricCost` (`:410`) calls it, and so does `estimateSecondsByMetric`. If the flag had been added to only one of them, the Insights strip's 60 s ceiling and the Run label would read different numbers for the same metric on the same graph -- the disagreement the module doc at `:236-238` says must never happen, and the fourth new case is what would catch it.

Run: `cd AT/graphty && npx vitest run src/components/shell/analysis/__tests__/metricCost.test.ts`
Expected: every pre-existing case still passes (all of them run with `accelerated` absent and no table, so every number is unchanged) plus the five new ones.

- [ ] **Step 3: The three call sites**

In `graphty/src/components/shell/AppShell.tsx`, beside the memos, add:

```ts
    /* The flag `metricCost` takes. It is "an accelerator is attached", not "this metric runs on the
       GPU", because the element exposes no per-metric flag; the per-metric part is
       ACCELERATED_SPEEDUP_BY_METRIC, which is 1 for every metric until the GPU has a path. */
    const gpuAccelerated = gpuStatus.state === "on";
```

then `:2751` becomes

```ts
        () => estimateSecondsByMetric({ nodeCount: graphShape.nodeCount, edgeCount: graphShape.edgeCount, accelerated: gpuAccelerated }),
```

`:2770` and `:2847` each gain `accelerated: gpuAccelerated,` in the object handed to `estimateMetricCost`, and `gpuAccelerated` joins all three dependency arrays (`:2752`, `:2786`, and the `runNodeMetricCard` callback's).

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/components/shell`
Expected: green. Today the numbers are identical with the flag true or false (every factor is 1), so no existing expectation moves; that is the point of landing the seam at 1.

- [ ] **Step 4: Checkpoint** -- no commit by this task.

### Task M7-T8: the `gpu`-tagged stories and the Chromatic leftover

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/stories/mockGraphtyElement.ts` (the mock, lifted out of `Graphty.stories.tsx`)
- Create: `graphty/src/stories/Gpu.stories.tsx` (`Components/GPU`, `tags: ["gpu"]`, two stories)
- Modify: `graphty/src/stories/Graphty.stories.tsx:5-32` (call the extracted registrar)
- Modify: `graphty/chromatic.config.json` (`onlyChanged` false)
- NOT touched: `graphty/.storybook/preview.tsx` (the two colour modes stay; see the cost note), `graphty/.storybook/main.ts`, `.github/workflows/ci.yml` (TurboSnap is already off there and `exitZeroOnChanges` already false -- this plan asks for no CI change here), `graphty/src/components/Graphty.test.tsx`'s own mock (a different shape: it carries a `layout` property the stories' placeholder does not)

**Interfaces:**
- Consumes: `useGpuAccelerator` and `GPU_STATUS_PENDING` from M7-T5; `StatusBarChip` from the statusbar module.
- Produces: `registerMockGraphtyElement()`; the stories `Components/GPU/Off` and `Components/GPU/Auto`. It produces NO measurement harness: M7-T9 Step 1 builds that itself, outside Storybook, and PLAN DECISION 9 says why.

**PLAN DECISION 9 (how a `gpu`-tagged story is deterministic on Chromatic):** by the preference, not by detecting Chromatic. `attachAccelerator` passes `rejectSoftware: options.gpu === "auto"`, so on a machine whose only WebGPU adapter is a software one -- which is what Chromatic's cloud browser has, if it has WebGPU at all -- the `Auto` story's probe returns `E_SOFTWARE_ONLY` and the story renders `GPU acceleration: off` with the reason in its tooltip. On the dev box, where the adapter is an NVIDIA one, the SAME story renders `on`. No `isChromatic()` call, no environment sniffing, no second code path: the one deterministic thing about Chromatic's renderer is that it is software, and the design's own `"auto"` semantics already turn that into a decision. The `Off` story is deterministic everywhere by construction (the preference returns before probing). Cost, stated because it is real: `preview.tsx:113-120` captures every story in a light and a dark mode, so the two stories cost FOUR snapshots per build. The existing `MockGraphtyElement` (`Graphty.stories.tsx:5-32`) is reused rather than replaced, which is what keeps these stories off Babylon entirely; it is EXTRACTED first, because a second copy of a custom-element registrar in the same Storybook is a `NotSupportedError` waiting for whichever file loads second.

**And the crossover measurement harness is NOT a story, in this Storybook or any other.** Two reasons, both structural rather than aesthetic. First, this Storybook's `<graphty-element>` IS the grey-box mock: `Gpu.stories.tsx` and `Graphty.stories.tsx` both call `registerMockGraphtyElement()` at module scope, and `customElements.define` takes a name once per page -- so whichever file evaluates first owns the tag and the other's real import would throw `NotSupportedError`. A harness that has to render the REAL element cannot share a page with a registrar for the mock. Second, `graphty-element` registers itself through lit's `@customElement` decorator as a side effect of `import "@graphty/graphty-element"` (`graphty-element/index.ts:7`), so "import the real one only in this file" is not something a story file can arrange -- the import is a page-level fact, not a story-level one. So the harness lives on the app's own dev server, where the only element registered is the real one, and M7-T9 Step 1 builds it. Nothing in this task carries `chromatic.disableSnapshot`: there is nothing left here that is not a picture.

- [ ] **Step 1: Extract the mock**

Create `graphty/src/stories/mockGraphtyElement.ts` holding exactly the class and the registration guard now inline at `Graphty.stories.tsx:6-32`, wrapped in a function:

```ts
/**
 * The stories' stand-in for `<graphty-element>`.
 *
 * Storybook stories must not boot Babylon: a WebGL context in a Chromatic worker is the
 * difference between a deterministic snapshot and a flaky one. This registrar was inline in
 * `Graphty.stories.tsx`; it moved here when a second story file needed it, because
 * `customElements.define` throws `NotSupportedError` on the second call for one name and the
 * guard has to be in one place for that check to mean anything.
 * @returns nothing; it registers the element the first time it is called and is a no-op after.
 */
export function registerMockGraphtyElement(): void {
    if (typeof window === "undefined" || window.customElements.get("graphty-element") !== undefined) {
        return;
    }

    class MockGraphtyElement extends HTMLElement {
        connectedCallback(): void {
            this.innerHTML = `<div style="
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f0f0f0;
                border: 2px dashed #ccc;
                color: #666;
                font-family: system-ui;
            ">
                <div style="text-align: center;">
                    <h3 style="margin: 0 0 1rem 0;">Graphty Element Mock</h3>
                    <p style="margin: 0;">Layout: ${this.getAttribute("layout") ?? "default"}</p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; opacity: 0.7;">
                        (graphty-element will be loaded from @graphty/graphty-element)
                    </p>
                </div>
            </div>`;
        }
    }

    window.customElements.define("graphty-element", MockGraphtyElement);
}
```

and replace `Graphty.stories.tsx:5-32` with:

```tsx
import { registerMockGraphtyElement } from "./mockGraphtyElement";

registerMockGraphtyElement();
```

Run: `cd AT/graphty && npx tsc --noEmit && npx prettier --check "src/stories/**"`
Expected: exit 0 on both. NOT eslint: `eslint.config.js:40` ignores `**/stories/**`, so `npx eslint src/stories` prints "File ignored because of a matching ignore pattern" and exits 0 whatever the file contains -- a green run there proves nothing. `tsc` DOES check them, because `graphty/tsconfig.json`'s `include` is `["src", ".storybook"]` (the ignore comment's "excluded from tsconfig" is stale for this package). The extraction must be byte-identical in the `innerHTML` string: `chromatic-app` compares pixels, and one changed space is a changed snapshot for the three existing `Components/Graphty` stories.

- [ ] **Step 2: The stories**

Create `graphty/src/stories/Gpu.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { StatusBarChip } from "../components/shell/statusbar/StatusBarChip";
import type { GpuPreferenceValue } from "../gpu/gpuPrefs";
import { useGpuAccelerator } from "../hooks/useGpuAccelerator";
import { registerMockGraphtyElement } from "./mockGraphtyElement";

registerMockGraphtyElement();

/** A Graph-shaped stand-in: the one method `attachAccelerator` calls, and a record of the calls. */
function makeHost(): { setAccelerator: (accelerator: unknown) => void; calls: unknown[] } {
    const calls: unknown[] = [];

    return { setAccelerator: (accelerator) => calls.push(accelerator), calls };
}

function GpuIndicator({ preference }: { preference: GpuPreferenceValue }): React.JSX.Element {
    const [host] = useState(makeHost);
    const status = useGpuAccelerator({ graph: host, preference });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, minWidth: 420 }}>
            <StatusBarChip title={status.title}>{status.label}</StatusBarChip>
            <code style={{ fontSize: 11, opacity: 0.8 }}>{`state=${status.state} preference=${preference}`}</code>
            <span style={{ fontSize: 11, opacity: 0.8 }}>{status.title}</span>
        </div>
    );
}

const meta: Meta<typeof GpuIndicator> = {
    title: "Components/GPU",
    component: GpuIndicator,
    tags: ["gpu"],
    parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Deterministic everywhere: the "off" preference returns before the probe runs. */
export const Off: Story = { args: { preference: "off" } };

/**
 * On the dev box with a hardware adapter this shows `on (vendor arch)`. On Chromatic, whose
 * renderer is software, `rejectSoftware` turns the probe into E_SOFTWARE_ONLY and the same story
 * shows `off` with the reason -- one code path, two honest answers, no isChromatic() anywhere.
 */
export const Auto: Story = { args: { preference: "auto" } };
```

Run: `cd AT/graphty && npx tsc --noEmit && npx prettier --check "src/stories/**" && pnpm exec nx run graphty:build-storybook`
Expected: tsc and prettier clean (both measured clean against this exact file on 2026-09-19); the Storybook build succeeds and `graphty/storybook-static/index.json` contains `components-gpu--off` and `components-gpu--auto`. Check with `python3 -c "import json;d=json.load(open('storybook-static/index.json'));print([k for k in d['entries'] if k.startswith('components-gpu')])"`.

- [ ] **Step 3: The Chromatic leftover**

`graphty/chromatic.config.json` becomes:

```json
{
    "onlyChanged": false,
    "zip": true
}
```

Reason, and the limit of the change: CI already has TurboSnap off and `exitZeroOnChanges: false` (`ci.yml:625-660`), with a comment naming the cause -- "TurboSnap (onlyChanged) disabled - Vite doesn't generate preview-stats.json". The CI action does not read this file (it runs at repo root with `storybookBuildDir: ./graphty/storybook-static`), so this flag only affects a LOCAL `npm run test:visual`. Leaving it `true` tells a reader TurboSnap is on when the thing that actually runs has it off, and a local run would skip a GPU story whose own file had not changed. Nothing else about Chromatic changes: this plan asks for NO edit to `ci.yml`'s `chromatic-app` job, because both conditions the integration plan's M7 cell names are already met there.

Run: `cd AT && python3 -c "import json;print(json.load(open('graphty/chromatic.config.json')))"`
Expected: `{'onlyChanged': False, 'zip': True}`.

- [ ] **Step 4: Checkpoint** -- `pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1` and `pnpm exec nx run graphty:build-storybook` both green; `grep -c disableSnapshot src/stories/Gpu.stories.tsx` returns 0 (this task adds no such parameter); no commit by this task.

### Task M7-T9: the G12 gate -- the `gpuMinNodes` measurement, the visual check, the record

**Repository:** `AT`.

**Files:**
- Create: `graphty/tmp/crossover/index.html` and `graphty/tmp/crossover/main.ts` (the measurement harness; `tmp/` is gitignored and eslint-ignored, so it never ships and no gate reads it)
- Modify: `graphty-element/src/config/GraphBehavior.ts` (the `gpuMinNodes` default M6 added gets the measured number)
- Create: `webgpu-graph-algorithms/docs/decisions/G12.md` (the gate record)
- Create: `tmp/m7-crossover.md` (the raw measurement table, not committed)
- NOT touched: `design/webgpu/webgpu-acceleration-plan.md` (a plan of record), `graphty/src/**` (nothing in the app sets `behavior`, and the harness is not app source)

**Interfaces:**
- Consumes: `attachAccelerator` and `GPU_LABEL_PREFIX` from M7-T4; `asAcceleratorHost` from M7-T4 Step 1; `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` from M7-T1. It does NOT consume anything from M7-T8: the stories are pictures, the harness is an instrument, and PLAN DECISION 9 says why they cannot share a page.
- Produces: `graphty/tmp/crossover/` (the harness, reusable by Phase M8b to re-measure); `webgpu-graph-algorithms/docs/decisions/G12.md`, the phase's gate record; a measured `behavior.layout.gpuMinNodes` default.

- [ ] **Step 1: Build the crossover harness**

The number G12 asks for is the node count above which the GPU layout beats the CPU one. The design gives no number: 9.4 item 7 fixes the DEFAULT at 0 ("whenever an accelerator is injected"), 9.8's W2 row and the P12 row say it is "measured from 7.21", and 7.21 (`design/webgpu/webgpu-acceleration-plan.md:2482-2518`) is a GPU-side table with exactly one CPU datum in it ("the CPU ngraph engine settles a 150-node story graph today"). So the measurement has to run both arms through the ELEMENT's own frame loop, which is what `gpuMinNodes` actually gates -- and nothing in this repository can do that today, so this step writes the instrument before Step 2 reads it.

**Where it lives, and why not Storybook.** The app's own vite dev server: `graphty/vite.config.ts:33` aliases `@graphty/graphty-element` to the package SOURCE, `:79-84` turns on HTTPS from `HTTPS_CERT_PATH` / `HTTPS_KEY_PATH` (`/home/apowers/ssl/atoms.crt` and `/home/apowers/ssl/atoms.key`, both verified present on 2026-09-19), `.env` sets `HOST=dev.ato.ms` and `PORT=9005`, and `server.fs.allow` already covers the monorepo root. Vite's dev server serves any `.html` under its root (`graphty/`), and `build.rollupOptions.input` is unset so its default input is `index.html` alone -- meaning a second HTML file is a dev-only page that never enters `dist/`. `graphty/tmp/` is in the root `.gitignore:23`, eslint's `**/tmp/**` ignore (`eslint.config.js:23`) and outside `graphty/tsconfig.json`'s `include`, so the harness is never committed, never linted, never type-checked and never counted in coverage; its source lives HERE, in the plan, which is what makes it reproducible. Storybook is the wrong host for the opposite reason: that page's `<graphty-element>` is the grey-box mock (PLAN DECISION 9).

Create `graphty/tmp/crossover/index.html`:

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>M7 crossover harness</title>
        <style>
            body { margin: 0; font: 13px system-ui, sans-serif; display: flex; flex-direction: column; height: 100vh; }
            #controls { display: flex; gap: 12px; align-items: center; padding: 8px 12px; border-bottom: 1px solid #ccc; flex: 0 0 auto; }
            #readout { font-variant-numeric: tabular-nums; white-space: pre; }
            #stage { flex: 1 1 auto; position: relative; }
            graphty-element { display: block; width: 100%; height: 100%; }
        </style>
    </head>
    <body>
        <div id="controls">
            <label>nodes <input id="nodes" type="number" value="1000" min="10" max="64000" step="10" /></label>
            <label>avg degree <input id="degree" type="number" value="10" min="1" max="50" step="1" /></label>
            <label>preference
                <select id="preference">
                    <option value="off">off (CPU)</option>
                    <option value="auto" selected>auto (GPU)</option>
                    <option value="required">required</option>
                </select>
            </label>
            <button id="run" type="button">Run 300 frames</button>
            <span id="readout">idle</span>
        </div>
        <div id="stage"></div>
        <script type="module" src="./main.ts"></script>
    </body>
</html>
```

Create `graphty/tmp/crossover/main.ts`:

```ts
/**
 * The M7 crossover harness: one real <graphty-element>, one generated graph, one arm at a time.
 *
 * Not a story and not app source. It exists to answer ONE question -- above what node count is
 * the GPU layout worth attaching -- by running both arms through the element's own frame loop,
 * which is the loop `behavior.layout.gpuMinNodes` actually gates. See the M7 plan, task M7-T9.
 *
 * It imports the REAL element (this page registers no mock), the app's own `attachAccelerator`,
 * and nothing else. Open it at https://dev.ato.ms:9005/tmp/crossover/ -- HTTPS, because
 * `navigator.gpu` is undefined outside a secure context and both arms would then measure the CPU.
 *
 * It lives under `tmp/`, which is gitignored, eslint-ignored and outside `graphty/tsconfig.json`'s
 * include, so it is never committed and never type-checked; vite's esbuild transform strips its
 * types without checking them. The one type assertion below (on the created element) is there for
 * that reason and would not be acceptable in `src/`.
 */

import "@graphty/graphty-element";

import { asAcceleratorHost } from "../../src/components/shell/analysis/elementBridge";
import { attachAccelerator, type GpuAttachment } from "../../src/gpu/accelerator";
import type { GpuPreferenceValue } from "../../src/gpu/gpuPrefs";

/** How many frames one arm is measured over. 300 at 60 Hz is five seconds, long enough to outlast the load. */
const FRAMES = 300;

/** How long to let the element settle after the data lands, before the first frame is timed, in ms. */
const SETTLE_MS = 1000;

/**
 * A graph of `nodes` nodes and `nodes * degree` edges, in the shape the element's JsonDataSource
 * reads: `{ nodes: [{ id }], edges: [{ src, dst }] }`. Design 7.21's own basis is "Edges = 10n".
 *
 * The edge set is deterministic rather than random: node i is joined to i+1 (a spanning path, so
 * the graph is connected and the layout has one component to settle) and then to `degree - 1`
 * further nodes at fixed strides. A fixed shape matters because the two arms must lay out the
 * SAME graph; a random one would put a different graph in each arm and the comparison would be
 * measuring the generator.
 * @param nodes - how many nodes.
 * @param degree - the average degree; the edge count is nodes * degree less any self-loop skipped.
 * @returns the JSON string to hand the element, and the edge count for the record's Edges column.
 */
function makeGraph(nodes: number, degree: number): { data: string; edgeCount: number } {
    const nodeRows: { id: string }[] = [];
    const edgeRows: { src: string; dst: string }[] = [];

    for (let i = 0; i < nodes; i++) {
        nodeRows.push({ id: `n${String(i)}` });
    }

    for (let i = 0; i < nodes; i++) {
        for (let k = 0; k < degree; k++) {
            const stride = k === 0 ? 1 : 1 + k * 7919;
            const j = (i + stride) % nodes;

            if (j !== i) {
                edgeRows.push({ src: `n${String(i)}`, dst: `n${String(j)}` });
            }
        }
    }

    return { data: JSON.stringify({ nodes: nodeRows, edges: edgeRows }), edgeCount: edgeRows.length };
}

/**
 * The median of a list of numbers.
 * @param values - the samples; not mutated.
 * @returns the median, or NaN for an empty list.
 */
function median(values: readonly number[]): number {
    if (values.length === 0) {
        return Number.NaN;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Times `FRAMES` consecutive animation frames and reports their deltas.
 * @returns the per-frame deltas in milliseconds, oldest first.
 */
async function sampleFrames(): Promise<number[]> {
    const deltas: number[] = [];

    await new Promise<void>((resolve) => {
        let last = performance.now();

        const tick = (): void => {
            const now = performance.now();

            deltas.push(now - last);
            last = now;

            if (deltas.length >= FRAMES) {
                resolve();

                return;
            }

            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });

    return deltas;
}

const stage = document.querySelector("#stage");
const readout = document.querySelector("#readout");
const runButton = document.querySelector("#run");
const nodesInput = document.querySelector("#nodes");
const degreeInput = document.querySelector("#degree");
const preferenceInput = document.querySelector("#preference");

if (
    !(stage instanceof HTMLElement) ||
    !(readout instanceof HTMLElement) ||
    !(runButton instanceof HTMLButtonElement) ||
    !(nodesInput instanceof HTMLInputElement) ||
    !(degreeInput instanceof HTMLInputElement) ||
    !(preferenceInput instanceof HTMLSelectElement)
) {
    throw new Error("the harness page is missing a control");
}

let attachment: GpuAttachment | null = null;

/** Runs one arm end to end and writes the result into the readout. */
async function runArm(): Promise<void> {
    runButton.disabled = true;

    try {
        const nodes = Number(nodesInput.value);
        const degree = Number(degreeInput.value);
        const chosen = preferenceInput.value;
        const preference: GpuPreferenceValue = chosen === "off" || chosen === "required" ? chosen : "auto";

        /* Detach BEFORE the element leaves the DOM: detach calls setAccelerator(null) on the Graph
           it was given, and disposes the context. Reversing these two loses the device. */
        attachment?.detach();
        attachment = null;
        stage.replaceChildren();

        readout.textContent = "generating...";

        const { data, edgeCount } = makeGraph(nodes, degree);
        const element = document.createElement("graphty-element") as HTMLElement & {
            graph?: unknown;
            dataSource?: string;
            dataSourceConfig?: Record<string, unknown>;
        };

        stage.append(element);

        readout.textContent = "booting element...";

        /* The element builds its Graph in its CONSTRUCTOR (`graphty-element/src/graphty-element.ts:34`,
           `get graph()` at `:1069`), so this poll resolves on its first tick. It is a poll anyway
           because the accelerator MUST go in before the load -- design 9.4 item 7 has LayoutManager
           evaluate gpuMinNodes at engine creation -- and a silent undefined here would attach
           nothing and still measure. */
        const host = await new Promise<ReturnType<typeof asAcceleratorHost>>((resolve) => {
            const started = performance.now();
            const poll = (): void => {
                const candidate = asAcceleratorHost(element.graph);

                if (candidate !== null || performance.now() - started > 10000) {
                    resolve(candidate);

                    return;
                }

                setTimeout(poll, 50);
            };

            poll();
        });

        if (host === null) {
            readout.textContent =
                element.graph === undefined || element.graph === null
                    ? "FAILED: the element never produced a Graph in 10 s. Not a GPU problem; check the console."
                    : "FAILED: this build of graphty-element has no setAccelerator. Phase M6 is not on master; the measurement cannot run.";

            return;
        }

        const attached = await attachAccelerator(host, { gpu: preference });

        attachment = attached;
        readout.textContent = `${attached.status.label} -- loading ${String(nodes)} nodes...`;

        element.dataSource = "json";
        element.dataSourceConfig = { data };

        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

        readout.textContent = `${attached.status.label} -- timing ${String(FRAMES)} frames...`;

        const deltas = await sampleFrames();
        const med = median(deltas);
        const sorted = [...deltas].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)];

        readout.textContent = [
            `n=${String(nodes)} edges=${String(edgeCount)} deg=${String(degree)} pref=${preference}`,
            `state=${attached.status.state}`,
            `median=${med.toFixed(2)}ms p95=${p95.toFixed(2)}ms`,
            attached.status.label,
        ].join("  |  ");
    } catch (error: unknown) {
        readout.textContent = `FAILED: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        runButton.disabled = false;
    }
}

runButton.addEventListener("click", () => {
    void runArm();
});
```

Then start the app's dev server and open the page:

```bash
cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app/graphty
npm run dev      # HOST=dev.ato.ms PORT=9005 HTTPS from .env, all three read by vite.config.ts:70-84
```

Run: `ls -l /home/apowers/ssl/atoms.crt /home/apowers/ssl/atoms.key`
Expected: both files exist. (`/home/apowers/ssl/STAR_ato_ms.crt` does NOT -- that is the stale path M7-T1 Step 1b fixes in the Storybook script, which this plan does not otherwise use.) If either file is missing, vite's `readFileSync` throws at startup and the server does not come up; regenerate with `~/ssl/atoms-cert.sh` before going further.

Run: open `https://dev.ato.ms:9005/tmp/crossover/` -- never `http://`.
Expected: the controls row, an empty stage, and `idle`. `requestGpuContext` rejects with `E_NO_WEBGPU` and the hint "WebGPU needs a supporting browser and a secure context (https or localhost)" whenever `navigator.gpu` is undefined, and `HOST=dev.ato.ms` means the page is not on localhost, so an `http://` page silently measures the CPU in BOTH arms (risk R-M7-8).

**The first measurement is a check, not a datum.** Set nodes to 1000, preference to `auto`, and press Run. The readout must end with `GPU acceleration: on (...)` and `state=on`. If it reads `off`, STOP and fix the cause before recording a single number -- an `off` auto arm makes every row of the table a CPU-versus-CPU comparison, and the table would look complete and mean nothing. If it reads `FAILED: this build of graphty-element has no setAccelerator`, Phase M6 is not on master and this whole phase is out of entry criteria (section 0.2).

- [ ] **Step 1b: Measure the crossover**

For each `n` in 250, 500, 1000, 2000, 4000, 8000, 16000, at average degree 10 (7.21's own basis: "Edges = 10n"), press Run TWICE -- once with `preference` `off` (the CPU simulation) and once with `auto` (the GPU) -- and copy the median from the readout. That is fourteen numbers. Reload the page between arms so each arm starts from a fresh element and a fresh context. Write them into `tmp/m7-crossover.md`.

Before the fourteen, record a BASELINE row: press Run at n=10, preference `off`. That median is this display's frame interval with nothing to do (about 16.7 ms at 60 Hz), and it is what "at budget" means for every row below it. It matters because `requestAnimationFrame` is vsync-capped: an arm that finishes its work inside the frame interval reports the interval, not its own cost, so two arms both at the baseline are NOT tied -- they are both under budget and the crossover is not there yet.

**How to read the table, stated so the number is not a judgement call.** The crossover is the smallest `n` at which the CPU arm's median is above the baseline by more than 2 ms AND the GPU arm's median is at least 2 ms below the CPU arm's. Rows where both arms sit at the baseline read "both within budget" in the "GPU faster" column and are not candidates. The default is that `n` rounded UP to the next power of two -- up, not to the nearest, because the cost of being wrong is asymmetric: below the crossover the GPU is slower AND holds device memory, above it the CPU is slower and holds none.

If NO `n` in the sweep satisfies the rule -- either because the CPU arm never leaves the baseline, or because the GPU arm never gets ahead -- do not invent a number. Extend the sweep upward (32000, 64000) and record what happened; if it still does not cross, record that, set `gpuMinNodes` to the design's own default of 0 with the reason, and say so in G12 section 3. A default of 0 means "attach whenever there is an accelerator", which is design 9.4 item 7's own wording and a defensible answer to "the GPU was never slower".

- [ ] **Step 2: Apply the number and check it visually**

Set the measured value as the default of `behavior.layout.gpuMinNodes` in `graphty-element/src/config/GraphBehavior.ts`'s `GraphLayoutOpts` -- the field Phase M6 adds to that object, which today (`:12-18`) holds `type`, `preSteps`, `stepMultiplier`, `minDelta` and `zoomStepInterval`. The app sets no `behavior` and does not start: design 9.4 item 7 and `design/webgpu/webgpu-acceleration-plan.md:435` both make this an ELEMENT setting evaluated by `LayoutManager` at engine creation and on every `load` / `reload`, so an app-side copy would be a second answer that disagrees with the default every other consumer gets (D-M7-7).

Then run the owner's visual rule on the real GPU, which is the half of G12 no test can do. The artifact is the SAME harness page Step 1 built -- `https://dev.ato.ms:9005/tmp/crossover/` -- because it is the only surface in this repository that draws a real `<graphty-element>`, on a real GPU, at a node count of the reader's choosing, with the `GpuStatus` label rendered as text beside it. The `Components/GPU/*` stories cannot serve here: they draw a chip and two lines of text against a stand-in host, contain no canvas, and have nothing to drag.

The procedure, driven with the Playwright MCP against a browser on the dev box:

1. Open the page, set nodes to the measured `gpuMinNodes` (or 2000, whichever is larger, so there is visibly a graph), degree 10, preference `auto`, press Run and wait for the readout to end. Screenshot as `tmp/m7-visual-settled.png`.
2. Drag one node a clear distance with `browser_drag`. Screenshot as `tmp/m7-visual-dragged.png`.
3. Wait three seconds without touching anything -- the element's `behavior.node.pinOnDrag` defaults to `true` (`graphty-element/src/config/GraphBehavior.ts:8`), so a dragged node is a pinned node and must NOT drift back. Screenshot as `tmp/m7-visual-pinned.png`.

Then ask the Nanobanana MCP these questions and record the answers verbatim in the gate record. They are written to be objective and not leading -- the tool agrees with whatever it is asked, so a question containing its own answer is worthless -- and each one names the file it is asked about:

1. On `m7-visual-settled.png`: "Are the graph's nodes distributed across the frame rather than clustered in one corner?"
2. On `m7-visual-settled.png`: "Does this image contain a text line beginning with the words 'GPU acceleration: on'?"
3. On `m7-visual-settled.png` and `m7-visual-dragged.png` together: "Comparing these two images, has exactly one node changed position?"
4. On `m7-visual-dragged.png` and `m7-visual-pinned.png` together: "Comparing these two images, is the layout identical?"

Question 4 is the pin. A `no` there means the dragged node drifted back, which means `pinOnDrag` did not take -- record it as a fail and do not claim the gate.

Run: `cd AT && ls tmp/m7-crossover.md tmp/m7-visual-settled.png tmp/m7-visual-dragged.png tmp/m7-visual-pinned.png`
Expected: all four exist, and `tmp/m7-crossover.md` carries the baseline row, the fourteen measured pairs and the four Nanobanana answers. A missing arm means the gate cannot be recorded.

- [ ] **Step 3: Write the G12 record**

Create `webgpu-graph-algorithms/docs/decisions/G12.md` with this content; every `<...>` is a number or a string copied from a named command's output, and the owner signs the last section. The file lives beside `G0.md`..`G3.md` because the integration plan puts every gate record under `webgpu-graph-algorithms/docs/decisions/`.

````markdown
# G12 -- the app's GPU detection and indicator (spec 13 row P12, W2 subset)

Recorded by: Task M7-T9, <date>. Commits: the <n> of this phase's PR (<short hashes once committed>).
Environment: <the dev box's browser and adapter, from the Auto story's tooltip>; the app's tests ran on
Playwright Chromium 1.57.0 through `vitest` 3.2.7. Every command ran from `graphty/` unless it names another
directory.

The gate is `design/webgpu/webgpu-acceleration-plan.md:4219` as restated for the app at
`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260`, with its middle clause replaced by
`design/decisions/2026-09-19-g12-without-the-nightly-clause.md`: the GPU lane green on the master commits of
this phase, NOT a nightly week. There is no nightly lane.

## 1. The checklist

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | the app's stories green | `pnpm exec nx run graphty:build-storybook`; the `chromatic-app` job of run <id> | <n> stories, <n> snapshots | pass / fail |
| 2 | the `gpu`-tagged stories render a deterministic no-GPU state on Chromatic | the `Auto` story's snapshot in build <id> | reads `GPU acceleration: off`, reason `<code>` | pass / fail |
| 3 | the real element on the real GPU settles | `tmp/m7-visual-settled.png`; Nanobanana Q1 and Q2 | <answer>, <answer> | pass / fail |
| 4 | ...drags | `tmp/m7-visual-settled.png` + `tmp/m7-visual-dragged.png`; Nanobanana Q3 | <answer> | pass / fail |
| 5 | ...and pins | `tmp/m7-visual-dragged.png` + `tmp/m7-visual-pinned.png`; Nanobanana Q4 | <answer> | pass / fail |
| 6 | `gpuMinNodes` default measured | section 3, through `graphty/tmp/crossover/` on `https://dev.ato.ms:9005` | <n> | pass / fail |
| 7 | the GPU lane green on this phase's master commits | `gh run list --workflow GPU` | run <id>, <conclusion> | pass / fail |
| 8 | the app is the only importer of the GPU package | `grep -rln "@graphty/webgpu-graph-algorithms" --include=package.json .` | `graphty/package.json` only | pass / fail |
| 9a | the 20 CI shards still find nine build artifacts on a graphty-affected PR | this phase's PR, run <id> | <n>/20 green | pass / fail |
| 9b | ...and on a PR that makes graphty NOT affected, which 9a cannot exercise | the scratch PR of M7-T2 Step 4, touching only `graph-io/README.md`, run <id> | nine non-empty artifacts, <n>/20 green | pass / fail |

## 2. What the app does with a device it cannot use

| Preference | navigator.gpu absent | software adapter only | hardware adapter |
| --- | --- | --- | --- |
| `off` | no probe, chip off | no probe, chip off | no probe, chip off |
| `auto` | chip off, reason `E_NO_WEBGPU` | chip off, reason `E_SOFTWARE_ONLY` | chip on, accelerator injected |
| `required` | throws, chip off with the message | accepts it, chip on | chip on |

## 3. The gpuMinNodes measurement (design 7.21)

Average degree 10, median `requestAnimationFrame` delta over 300 frames, the element's own frame
loop, through `graphty/tmp/crossover/` on the app's dev server over HTTPS. The baseline row is the
same measurement at n=10 with the CPU arm: it is this display's frame interval with nothing to do,
and it is what "within budget" means for every row below it -- `requestAnimationFrame` is
vsync-capped, so an arm that reads the baseline is under budget rather than tied.

| Nodes | Edges | CPU ms/frame | GPU ms/frame | GPU faster |
| --- | --- | --- | --- | --- |
| 10 (baseline) | 100 | <ms> | n/a | n/a |
| 250 | 2500 | <ms> | <ms> | no / yes / both within budget |
| 500 | 5000 | <ms> | <ms> | no / yes |
| 1000 | 10000 | <ms> | <ms> | no / yes |
| 2000 | 20000 | <ms> | <ms> | no / yes |
| 4000 | 40000 | <ms> | <ms> | no / yes |
| 8000 | 80000 | <ms> | <ms> | no / yes |
| 16000 | 160000 | <ms> | <ms> | no / yes |

Crossover: <n> -- the smallest n at which the CPU arm is more than 2 ms above the baseline AND the
GPU arm is at least 2 ms below the CPU arm. Default set to <n rounded up to the next power of two>
in `graphty-element/src/config/GraphBehavior.ts`. Rounded UP because the cost is asymmetric: below
the crossover the GPU is both slower and holding device memory.

If no n in the sweep met the rule, say so here instead of naming one, record how far the sweep was
extended, and set the default to design 9.4 item 7's own 0 ("whenever an accelerator is injected")
with that reason.

## 4. Findings, owner decisions

Decisions this phase took that a reader of the shipped app can see:

- the GPU chip appears as soon as the probe answers, WITH OR WITHOUT a dataset loaded. It is
  therefore the only slot in the status bar in the Welcome state. Every other slot stays
  dataset-scoped. The reason is in `AppShell.tsx`'s own comment: whether this machine has a GPU is
  not a property of the data, and the Welcome state is where a reader goes to change the preference.
- the preference takes effect on RELOAD, not live. The Settings pane says so in its own words.
- `ACCELERATED_SPEEDUP_BY_METRIC` is 1 for every metric. The cost gate therefore prints the same
  number with the GPU attached and without it, which is correct today: no node metric has a GPU
  path (`webgpu-graph-algorithms/src/accelerator.ts:87-117`).

Signed off: <owner>, <date>.
````

Run: `cd AT && LC_ALL=C grep -nP '[^\x00-\x7F]' webgpu-graph-algorithms/docs/decisions/G12.md; echo "rc=$?"`
Expected: no output, `rc=1`.

- [ ] **Step 4: The whole gate, one run**

Run:

```bash
cd AT
pnpm exec nx run-many -t lint,build --projects=graphty,graphty-element --parallel=1   # both green
pnpm exec nx run graphty:coverage                                                     # the app's suite in headless Chromium
pnpm exec nx run graphty:build-storybook                                              # the Storybook the Chromatic job consumes
LC_ALL=C grep -rnP '[^\x00-\x7F]' graphty/src/gpu graphty/src/hooks/useGpuAccelerator.ts graphty/src/stories/Gpu.stories.tsx graphty/src/stories/mockGraphtyElement.ts webgpu-graph-algorithms/docs/decisions/G12.md design/decisions/2026-09-19-g12-without-the-nightly-clause.md   # no output
git status --porcelain | grep '^?? graphty/tmp'                                       # no output: tmp/ is gitignored, the harness is not staged
HUSKY=0 pnpm install --frozen-lockfile                                                # exit 0: the lockfile matches the manifests
./tools/prepush.sh                                                                    # exit 0; 15-25 minutes
```

Expected: as commented. If `pnpm install --frozen-lockfile` fails, the lockfile was not committed with `graphty/package.json` -- both belong in M7-T2's commit. If the `git status` line prints anything, `tmp/` has been un-ignored somewhere and the harness would land in the PR; it must not.

- [ ] **Step 5: Commit (owner)** -- five commits through `tools/commit-changes.sh`, in this order, after the two of M7-T1 and the two of M7-T2: `feat(graphty): probe for WebGPU and hand the element an accelerator` for M7-T3 and M7-T4 (the body names the `attachAccelerator` order -- preference, one probe, the probed adapter -- and says the calibrate arm is inert because `calibrateLayout` is pinned absent); `feat(graphty): report GPU acceleration in the status bar and when the device is lost` for M7-T5 and M7-T6 (the body says the `issues` slot gained its first producer and that the one toast's producer widened beyond the load); `feat(graphty): let the cost gate know when a metric would be accelerated` for M7-T7 (the body says every factor is 1 today and names `webgpu-graph-algorithms/src/accelerator.ts:87-117` as the reason); `test(graphty): add the gpu-tagged stories and stop claiming TurboSnap locally` for M7-T8; and `feat(graphty-element): set the measured gpuMinNodes default` plus `docs(webgpu-graph-algorithms): record the G12 gate for the app's GPU detection` for M7-T9. No `!` on any of them: nothing here changes a published signature, and graphty is private. The PR's `chromatic-app` job shows two new stories in two colour modes; the owner accepts those four snapshots as new baselines, and `all-checks` then passes.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Before M7-T1 | `git fetch origin && git merge --ff-only origin/master && git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master` |
| Phase step 0 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,webgpu-graph-algorithms,algorithms,layout,graphty-element --parallel=3` |
| before M7-T1 | confirm `tools/commit-changes.sh:468` already lists `graph-format graph-io webgpu-graph-algorithms` (Task M8b-T1 Step 1 landed it); if not, land that one two-line `fix(tools)` commit first |
| M7-T1 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && ./tools/commit-changes.sh --dry-run` then without the flag, for the two subjects of M7-T1 Step 4 |
| M7-T2 | `... && HUSKY=0 pnpm install` (the lockfile), then `./tools/commit-changes.sh` for the two subjects of M7-T2 Step 6 |
| M7-T2 Step 4 | push a scratch branch whose only change is a line appended to `graph-io/README.md`, open it as a draft PR, read the `build` job's nine artifacts, then close it unmerged (G12 item 9b) |
| M7-T9 Step 1 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app/graphty && npm run dev`, then open `https://dev.ato.ms:9005/tmp/crossover/` and run each arm at each node count |
| M7-T9 Step 2 | the Playwright MCP screenshots of the same harness page (settled, dragged, pinned) and the four Nanobanana yes/no questions |
| M7-T9 Step 4 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && ./tools/prepush.sh` |
| M7-T9 Step 5 | `./tools/commit-changes.sh --dry-run` then without the flag, for the five subjects of M7-T9 Step 5; then open the PR and accept the four new Chromatic snapshots |

The agent never runs any of these; it prepares the tree and verifies the results.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| The scope list matches commitlint | M7-T1 | `grep -n 'graph-format' tools/commit-changes.sh` | the script accepts every scope commitlint does |
| The decision record is ASCII | M7-T1 | `LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-19-g12-without-the-nightly-clause.md` | no output |
| The dependency resolves and the lockfile agrees | M7-T2 | `HUSKY=0 pnpm install --frozen-lockfile` | exit 0 with `link:../webgpu-graph-algorithms` in graphty's importer |
| The app type-checks against a built GPU package | M7-T2 | `pnpm exec nx run graphty:lint` | the dependency builds first, then eslint and `tsc --noEmit` exit 0 |
| The element shim is gone without collateral | M7-T2 | `cd graphty && npx tsc --noEmit` | 0 errors; the real package's types are in force |
| The CI file still parses and names the narrowed step | M7-T2 | the `yaml.safe_load` one-liner of M7-T2 Step 4 | `Build graph-io and webgpu-graph-algorithms (PR)` present, the three-project step gone |
| ...and a PR that does NOT make graphty affected still uploads nine artifacts | M7-T2 | the scratch PR touching only `graph-io/README.md` | nine non-empty artifacts, 20/20 shards green |
| The preference survives a bad store, an explicit undefined included | M7-T3 | `npx vitest run src/gpu/__tests__/gpuPrefs.test.ts` | 5 passed |
| `"off"` never probes; `"required"` throws | M7-T4 | `npx vitest run src/gpu/__tests__` | 13 passed (5 + 8) |
| The accelerator guard did not widen the algorithm guard | M7-T4 | `npx vitest run src/components/shell/analysis/__tests__/elementBridge.test.ts` | `asElementGraph({ setAccelerator })` is still null |
| The readiness signal costs the existing stories nothing | M7-T5 | `npx vitest run src/components/Graphty.test.tsx` | unchanged pass count |
| The issues slot renders with only the GPU chip | M7-T6 | `npx vitest run src/components/shell/statusbar/__tests__/StatusBar.test.tsx` | the three GPU cases pass, 49 in the file |
| The chip is not gated on a dataset, and does not draw while probing | M7-T6 | `npx vitest run src/components/shell/__tests__/AppShell.test.tsx` | the bar renders with no dataset and carries no `GPU acceleration` text |
| `statusBarModel.ts` is still type-only | M7-T6 | `grep -nE '^(export )?(function\|const\|let\|class)' src/components/shell/statusbar/statusBarModel.ts` | no output, so the coverage exemption holds |
| The cost gate's two surfaces agree, and BOTH forward the flag | M7-T7 | `npx vitest run src/components/shell/analysis/__tests__/metricCost.test.ts` | the record equals the single estimate for every metric, and the non-unit-table case halves the pagerank estimate through both entry points |
| The stories build and are indexed | M7-T8 | `pnpm exec nx run graphty:build-storybook` then the `index.json` one-liner | `components-gpu--off` and `--auto` present |
| The crossover harness reaches a real GPU | M7-T9 | open `https://dev.ato.ms:9005/tmp/crossover/`, run one arm at `auto` | the readout ends `state=on` and `GPU acceleration: on (...)` |
| The whole app | M7-T9 | `pnpm exec nx run graphty:coverage` | the suite passes in headless Chromium |
| The pre-push gate | M7-T9 | `./tools/prepush.sh` | exit 0 |
| The GPU lane on this phase's master commits | M7-T9 | `gh run list --workflow GPU` | the run on the merge commit succeeded (G12's restated middle clause) |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M7-1 | The phase is started before Phase M6 is on master, and every task from M7-T4 on writes code against a `setAccelerator` that does not exist. | Section 0.2 states each criterion as MET or NOT MET with its command; `asAcceleratorHost` returns null against a pre-M6 element, so the failure is a chip reading `off` with the tooltip "This build of graphty-element has no accelerator property" rather than a crash. |
| R-M7-2 | `setAccelerator` is added to `REQUIRED_GRAPH_METHODS`, and all six `asElementGraph` call sites return null against any element that lacks it -- every algorithm run in the Analyze panel silently stops. | M7-T4 Step 1's third test asserts `asElementGraph({ setAccelerator })` is still null, so the two guards cannot be merged by accident. |
| R-M7-3 | A test asserts the "off" state by assuming `navigator.gpu` is absent, and passes on a runner without WebGPU while failing on one with it. | PLAN DECISION 7 and M7-T4 Step 3: every off-state test OVERRIDES the descriptor. Verified on 2026-09-19 that this Chromium reports `navigator.gpu present: object`. |
| R-M7-4 | After the dependency lands, a PR touching only `webgpu-graph-algorithms/` also rebuilds, re-lints and re-tests graphty, its Storybook and its Chromatic job -- the GPU package's own PR loop gets longer. | Accepted and named: it is the cost of the closure that makes the `ci.yml` step narrow. D-M7-1's alternative (landing M7-T2 early on its own PR) is the lever if it hurts. |
| R-M7-5 | The `ci.yml` step is DELETED, or narrowed to graph-io alone, and a PR that makes graphty NOT affected leaves `webgpu-graph-algorithms/dist/` (or graph-io's) unbuilt against an unconditional Upload step -- the shards then fail at their Download step. | M7-T2 Step 4 replaces the step with a TWO-project one and carries the closure argument in the comment, including the graph-io-only counter-example; the verification matrix checks the step is present by name, and G12 item 9b checks it on a scratch PR that the landing PR structurally cannot stand in for. |
| R-M7-6 | The `Auto` story turns out NOT to be deterministic on Chromatic, because its renderer exposes a hardware adapter after all. | The first `chromatic-app` run on the PR shows the snapshot. If it reads `on`, pin the story to `args: { preference: "off" }` -- it then duplicates `Off`, which is honest: the point of the pair is that one arm is the preference and one is the probe, and on a renderer with a hardware adapter the probe has nothing deterministic to say. The `auto` demonstration then lives only on the dev box, in M7-T9's harness. |
| R-M7-7 | The device-lost toast never appears, because the load-failure branch returns first and the reader has a failed load on screen. | Accepted by PLAN DECISION 6 and stated in the code comment: the chip carries the GPU fact permanently and does not erase itself, so the toast is the second surface, never the only one. |
| R-M7-8 | The `gpuMinNodes` measurement is taken over `http://dev.ato.ms:9005`, `navigator.gpu` is undefined in the insecure context, and both arms measure the CPU. | M7-T9 Step 1 names the secure-context requirement, checks `ls -l /home/apowers/ssl/atoms.crt /home/apowers/ssl/atoms.key` (both verified present) before starting, and makes the FIRST run a check rather than a datum: the readout must end `state=on` and `GPU acceleration: on (...)` before a single number is recorded. A harness whose auto arm reads `off` is a harness measuring the CPU twice. |
| R-M7-9 | `metricCost`'s accelerator factors are set above 1 to "look finished", and the Run label promises a speed the CPU then takes. | PLAN DECISION 8; the test pins every factor at 1 and a change has to change that test, which is where the reason for the new number gets written down. |
| R-M7-10 | Four plan documents of 2026-09-19 each bump `design/README.md`'s directory counts and collide on merge. | M7-T1 Step 3 gives the resolution rule -- re-run `find design/webgpu -name '*.md' \| wc -l` and `ls design/decisions/*.md \| grep -cv README` in the merged tree, never take a side, and never use `ls \| wc -l` (which counts directories in the first cell and the README in the second) -- and the corpus-table rows do not collide because each plan adds its own line. |
| R-M7-11 | Deleting `graphty/src/types/graphty-element.d.ts` is verified against TODAY's element, and Phase M6 changes `Algorithm.ts`, which `RunAlgorithmModal.tsx:1` imports. | M7-T2 Step 3's Expected names this: any error other than the two known ones is a real disagreement with the element's own types, fixed in the app's usage and never by re-adding the shim. |
| R-M7-12 | The measurement is run against a harness that renders a MOCK element -- a grey box with no canvas and no layout -- and both arms report the display's frame interval, so the table looks complete and measures nothing. | The harness is on the app's dev server, where the only registered `graphty-element` is the real one, and it imports `@graphty/graphty-element` itself; PLAN DECISION 9 records why it cannot be a Storybook story. M7-T9 Step 1's first measurement is a CHECK -- the readout must end `state=on` -- and the harness reports a hard failure when the element has no `setAccelerator`. |
| R-M7-13 | The `metricCost` seam lands as dead code: the flag is accepted by the type and read by nothing, and every test passes because every factor is 1 so `cpu / 1 === cpu`. Phase M8b then changes one number and nothing happens. | M7-T7 Step 1's fifth case drives both entry points with an injected table whose pagerank entry is 2 and asserts the estimate actually halved, and asserts an absent flag is not divided. That case fails if either forward is dropped; the other four cannot. |

### 7.4 Spec coverage: the integration plan's M7 deliverable cell, item by item

The cell is `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3259`. Every clause of it, and the task that carries it:

| Clause | Task |
| --- | --- |
| `graphty/src/gpu/accelerator.ts` `attachAccelerator(...)` | M7-T4 Step 2 |
| static imports from `@graphty/webgpu-graph-algorithms/browser` (`probeBrowserWebGpu`, `requestGpuContext`) | M7-T4 Step 2, the import block |
| ...and the root (`createAccelerator`, `calibrateLayout` -- the latter lands with P4) | M7-T4 Step 2 for `createAccelerator`; PLAN DECISION 3 for the inert `calibrate` arm |
| `ctx.lost.then(() => element.setAccelerator(null) + toast)` | M7-T4 Step 2 (the removal) and M7-T6 Step 4 (the toast) |
| the "GPU acceleration: on (vendor arch) / off" indicator from `ctx.caps` | `gpuOnLabel` in M7-T4 Step 2; the chip in M7-T6 Steps 2-4 |
| real-GPU stories under a `gpu` tag in the APP's Storybook | M7-T8 Step 2 |
| ...that render a deterministic no-GPU state on Chromatic | PLAN DECISION 9; M7-T8 Step 2's `Auto` story |
| no TurboSnap there; `exitZeroOnChanges: false` | already true in CI (`ci.yml:625-660`); M7-T8 Step 3 clears the local leftover |
| the `metricCost.ts` gate gains a per-metric accelerator constant | M7-T7 Step 2 |
| ...once the element exposes the flag | PLAN DECISION 8: no such flag is specified, so the app supplies "an accelerator is attached" and the per-metric part is the constant |
| the app is the only importer of the GPU package | M7-T2 Step 1; checked by G12 item 8 |
| `graphty/package.json` gains the dependency | M7-T2 Step 1 (as `workspace:*`, DEP-A) |
| the `ci.yml` build step becomes redundant for it | M7-T2 Step 4 (it narrows to graph-io AND webgpu-graph-algorithms, dropping only graph-format, DEP-G) |
| G12's `gpuMinNodes` default measured (design 7.21) | M7-T9 Step 1 builds the harness, Step 1b measures, Step 2 applies it |
| G12's "the app's stories green" | M7-T8 Step 2 and G12 item 1 |
| G12's "the story on the real GPU settles, drags and pins" | M7-T9 Step 2, against `graphty/tmp/crossover/` -- the only surface in the repository that draws a real element on a real GPU at a chosen node count (PLAN DECISION 9) |
| G12's "nightly GPU lane green for a week" | VOID; restated by M7-T1 Step 2 and checked as G12 item 7 |
