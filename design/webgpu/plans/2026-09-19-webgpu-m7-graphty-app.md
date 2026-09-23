# graphty app W2 (Phase M7) Implementation Plan

> **Superseded on 2026-09-21 by `2026-09-21-webgpu-m7-graphty-app-v2.md`.** This plan was written against the
> version 1 element API and the old M6 plan. The version 2 element API (branch `feat/element-api-2`) changed what the
> app consumes -- the `acceleration` attribute and policy, `capabilities.acceleration`, the session's events -- and
> moved every piece of detection, construction and recovery into the element, so the app's half was re-planned as
> presentation only. The text below is kept as history and is not the plan of record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; most run in `/home/apowers/Projects/graphty-monorepo`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees. **Before dispatching anything in parallel, read the "File ownership" paragraph below: M7-T5, M7-T6 and M7-T7 all edit `AppShell.tsx` and MUST run sequentially in one tree.**

**Goal:** Give the graphty app the four things that are genuinely presentation, now that graphty-element owns acceleration itself: a Settings > Performance control that writes the element's `acceleration` attribute; a "GPU acceleration: on (vendor arch) / off" chip drawn as a `StatusBarChip` in the frozen `issues` slot, which gains its first producer, from the capability record the element publishes; a device-lost line routed through the app's one toast; and the READER's preference remembered in the app's own storage and written back onto the attribute when the element mounts. Plus `metricCost.ts`'s per-metric accelerator constant, one acceleration story in the app's Storybook, and `graphty/package.json` installing `@graphty/webgpu-graph-algorithms` -- the optional peer graphty-element declares -- so that one side-effect import at the app's entry turns the GPU on (gate G12, W2 subset).

**Architecture:** graphty-element owns acceleration end to end. It probes for an adapter, requests a context, constructs the accelerator, attaches it, applies `acceleration.minNodes`, recovers from device loss, and publishes what happened in one place: `session.capabilities.acceleration`, mirrored to every bound view as the `graphty-capabilities-change` DOM event (`design/element-api/element-api-design.md` 4.12 and 4.10.1). The app installs the optional peer, writes `import "@graphty/graphty-element/webgpu";` once at its entry, and from then on only reads. It never touches `navigator.gpu`, never names a GPU type, never constructs or injects an accelerator, and holds no accelerator object anywhere in its source; the one thing it owns that looks like acceleration is the reader's preference, which the element deliberately does not persist (4.12: "the element persists nothing on a reader's behalf"). Everything the app shows -- the chip, the toast, the cost gate -- reads the ONE capability record, so the surfaces cannot disagree.

**Tech Stack:** TypeScript 5.9 (strict, `moduleResolution: "bundler"`, `skipLibCheck`), React 19.1 with Mantine 8.1 and `@graphty/compact-mantine` 0.8.0, `@graphty/webgpu-graph-algorithms` 0.2.1 installed as graphty-element's optional peer and imported by no file in `graphty/src`, vitest 3.2.7 in REAL headless Chromium through the Playwright 1.57.0 browser provider, Storybook 9.1.20 on `@storybook/react-vite` with Chromatic (`exitZeroOnChanges: false`, TurboSnap off), vite 7.3.6, pnpm 10 workspace, Nx 22, ESLint 9 flat config with eslint-plugin-jsdoc, knip, prettier (tabWidth 4, printWidth 120, trailingComma all), GitHub Actions (`ci.yml`'s `graphty` shard and `chromatic-app` job).

**Spec:** `design/element-api/element-api-design.md` -- 4.1.1 (the `acceleration` attribute, its three values, and the sentence that the element never persists it), 4.10.1 (the `graphty-capabilities-change` mirror and why it exists: an HTML-only consumer draws an acceleration chip without touching the session), 4.12 (the six acceleration states, `acceleration.minNodes`, and one-import activation), 6.1 (the `./webgpu` entry), 6.4 (the shipped `HTMLElementEventMap` augmentation this plan's listener relies on). Plus `design/webgpu/webgpu-acceleration-plan.md` line 4219 (the P12 row and G12) and `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (the Phase M7 block, lines 3256-3261, whose `:3259` deliverable cell section 7.4 verifies against). Where this plan departs from a specification, section 0.5 lists the departure and its reason.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (Phases M0-M5b), `design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md` (Phase M8a), `design/webgpu/plans/2026-09-19-webgpu-m6-graphty-element.md` (Phase M6, which this plan's entry criterion names and which owns everything that probes, constructs, attaches, thresholds or recovers) and `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md` (Phase M8b, independent of this chain).

**Gate:** G12, W2 subset (design 13 row P12, `design/webgpu/webgpu-acceleration-plan.md:4219`; restated for the app at `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260`). G12's middle clause as written -- "nightly GPU lane green for a week" -- is VOID: `design/decisions/2026-09-19-no-nightly-gpu-lane.md` removed the `schedule` trigger, and `.github/workflows/gpu.yml:1-10` says so in its own header. Task M7-T1 records the restatement; Task M7-T9 writes the record at `webgpu-graph-algorithms/docs/decisions/G12.md`.

**Tasks in this document:** M7-T1 .. M7-T9, of which SEVEN are live and two -- M7-T4 and M7-T5 -- are obsolete and hold one line each naming what now owns their work. The live order is M7-T2 (the dependency and the activation import must land before anything reads a capability) -> M7-T3 (the preference store and the Settings control) -> M7-T6 (the chip and the toast) -> M7-T7 (the cost gate's flag, which reads M7-T6's record) -> M7-T8 (the story) -> M7-T9 (the gate). M7-T1 is independent of everything and may run at any point.

**File ownership, and the one place it is shared:** `graphty/src/components/shell/AppShell.tsx` is edited by M7-T6 and then M7-T7. Those two tasks MUST run sequentially in ONE working tree and MUST NOT be dispatched to parallel agents: the file is 5142 lines and both edits land within 1500 lines of each other, so two agents editing it concurrently produce a tree neither checkpoint describes. Every other file in this phase has exactly one owning task.

## 0.0 AMENDMENT (2026-09-19): the element owns acceleration; this phase loses most of its scope

**Read this before any task.** The authority is
`design/decisions/2026-09-19-graphty-element-owns-webgpu.md`, the acceleration sections of
`design/element-api/element-api-design.md` (4.1.1, 4.10.1, 4.12), and above both the root
`CLAUDE.md` "Architectural Principles": the graphty app is only HTML around graphty-element and
MUST NOT contain graph-specific functionality of any kind other than consuming it.

This plan was originally written from a design in which the app was the only importer of
`@graphty/webgpu-graph-algorithms` and therefore the owner of detection, construction and
device-loss recovery. That is now wrong, and it was wrong in a specific way worth stating: every
line of it is code a third-party consumer of graphty-element would have had to rebuild, which is
exactly what the principle forbids.

`@graphty/webgpu-graph-algorithms` is an OPTIONAL PEER of graphty-element, activated by
`import "@graphty/graphty-element/webgpu";`. After that line the element probes, constructs,
attaches, applies `acceleration.minNodes`, recovers from device loss and reports. Phase M6 Tasks
M6-T19 and M6-T20 build it.

### What the element publishes, and what the app is therefore allowed to know

- **`acceleration`, an attribute and a session property** (`auto` / `off` / `required`, default
  `auto`). It is NOT a `ConfigValues` key, so `config.toDocument()` does not carry it and an
  exported settings file cannot demand a GPU the next machine lacks.
- **`session.capabilities.acceleration`**, a record whose `state` is one of six:
  `"probing" | "active" | "idle" | "unavailable" | "error" | "off"`, with `backend`, `vendor`,
  `architecture`, `device`, a readable `reason` and a switchable `code`. `"idle"` means an
  accelerator is attached and usable with nothing currently on it -- a resting working state, not
  a degraded one. A consumer shows nothing definitive while the state is `"probing"`.
- **`graphty-capabilities-change`**, the DOM mirror of the session's `capabilities:changed`,
  carrying `{ capabilities }`. It exists so an HTML-only consumer can draw an acceleration chip
  without touching the session, and it is what this app listens to.
- **`acceleration.minNodes`**, the one threshold that governs acceleration, a `ConfigValues` key
  owned and defaulted by the element. It is a different number from `Limits.largeGraphThreshold`,
  which decides how much visual detail to draw and has nothing to say about where a computation
  runs. The app neither measures it nor sets it.
- **`precision: "f32" | "f64"` on a run's `Caveats`**, next to `exact` and `method`. It is a
  property of a result, not of the graph, because two runs of the same algorithm on the same graph
  can differ in it.

**The element does NOT persist the reader's acceleration preference, and the app does.** Remembering
that this person turned acceleration off, and restoring the choice on the next visit, is storage the
host application owns; a component that writes to its host page's storage unasked is a surprise the
host cannot anticipate, and a preference the element restored would fight the attribute the host
page wrote in its own markup. So the app keeps its own versioned `localStorage` key and writes the
attribute when it mounts the element. This is the one thing the app keeps that looks like
acceleration logic, and it is the app's by design rather than by omission.

### Task deltas

| Task | Delta |
| --- | --- |
| M7-T1 | UNCHANGED in substance. The stale commit-scope check, the Storybook certificate and the G12 restatement are unaffected; only the corpus-index row's wording follows this phase's new scope. |
| M7-T2 | REWORDED and widened. It still installs the dependency, fixes the lint build order, narrows the CI step and deletes the shadowing element type shim. It now also adds the one activation import, wires the `./webgpu` subpath through the app's vite alias and tsconfig paths, and tells knip the dependency is installed rather than imported. |
| M7-T3 | REWORDED. The store and its versioned key SURVIVE unchanged -- the element does not persist this and the app must. What changes is where the control writes: the element's `acceleration` attribute, not an app-side probe. |
| M7-T4 | OBSOLETE. `attachAccelerator`, the host guard and the inert calibrate arm are all element work now. |
| M7-T5 | OBSOLETE. The graph-ready poll and `useGpuAccelerator` existed to know when to inject; the element injects itself and publishes the result as an event. |
| M7-T6 | KEPT, re-sourced. The chip and the toast read the capability record the element publishes and subscribe to `graphty-capabilities-change`. This is the model case of the principle: reading a property the element publishes and rendering it IS consuming the element. |
| M7-T7 | KEPT, re-sourced. The `metricCost` accelerator constant reads the same capability record instead of an app-side flag. |
| M7-T8 | KEPT, simplified. The stories render the chip from fixed capability records, so every state is drawable and Chromatic is deterministic by construction rather than by what its renderer happens to expose. |
| M7-T9 | REDUCED. The `acceleration.minNodes` measurement and the real-GPU settle / drag / pin check are the element's and belong to M6-T20's gate. What remains is the app's half of G12: the chip on a real GPU, the control, the preference surviving a reload, the stories, and the check that the app contains no acceleration logic at all. |

Net: nine tasks become seven live ones, and the two that went were the two that contained all the
graph logic. That is the intended result, not an accident of scoping -- if a task in this document
could not be deleted by a consumer who is not this app, it is in the wrong package.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit". That script's STEPS / SUBJECTS / PATHS block is data tailored to one change set (`tools/commit-changes.sh:30-34`), so the owner re-points it at this phase before running it; `--dry-run` stages nothing.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file. The script validates every message before it stages anything.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes, ` -> ` for an arrow. Each task's Checkpoint names the files it touched and runs `LC_ALL=C grep -nP '[^\x00-\x7F]'` over exactly those; no output is the pass.
- Never run `sudo`. Servers only on ports 9000-9099: the app's dev server is `PORT` from the monorepo root `.env` (9005 today; `graphty/vite.config.ts:41` defaults to 9000), its Storybook is 9035, its coverage preview 9054.
- No `eslint-disable`, `@ts-expect-error` or `@ts-ignore`; never lower a coverage threshold. `graphty/vitest.config.ts` declares NO `thresholds` today, and this plan adds none -- adding one is a separate decision about the whole app, not a side effect of a GPU phase.
- Project rule (root `CLAUDE.md`, WebGPU): never create a fallback if WebGPU is not supported. Nothing in this plan branches on the presence of a GPU: the app renders whatever the element reports, and "no GPU" is a capability record whose `state` is `"unavailable"` with a `reason` the chip's tooltip prints. The element runs the CPU path and says so; the app neither detects that nor compensates for it.
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
| knip's `graphty` workspace ignores exactly one dependency, `jsdom`, so a package that is INSTALLED and imported by no file under `src` is reported as unused. The same situation is already handled by name one workspace up: the GPU package's own block ignores `webgpu`, with the comment "knip 5.77 reports referenced optional peers". | `knip.config.ts:159-162`; `knip.config.ts:50-56` |
| `graphty/src/types/graphty-element.d.ts` is a 73-line ambient `declare module "@graphty/graphty-element"`, and it WINS over `graphty/tsconfig.json:24-31`'s `paths` alias: a probe importing `type { Edge }` (which the real barrel exports at `graphty-element/index.ts:11` and the shim does not) failed with `TS2305: Module '"@graphty/graphty-element"' has no exported member 'Edge'`. | the probe run of 2026-09-19 |
| Deleting that shim leaves exactly TWO type errors, both in `graphty/src/components/Graphty.test.tsx:70-71` (`Property 'style' does not exist on type 'Element'`), and `container.querySelector<HTMLElement>(...)` fixes both. | `mv src/types/graphty-element.d.ts /tmp && npx tsc --noEmit` then the one-word edit, 0 errors (2026-09-19) |
| The app already forwards element DOM events to React props twice, in one shape: an effect that reads `graphtyRef.current`, returns early when the callback is absent, adds the listener and removes it in the cleanup. `selection-changed` is at `Graphty.tsx:471-497` and `style-changed` at `:500-551`; both arrive as members of `CanvasGraphConfig` (`CanvasRegion.tsx:83-101`), are passed to the component at `CanvasRegion.tsx:444-445`, and are filled by `AppShell.tsx:4690-4697`. | the three files |
| The app's tests run in REAL headless Chromium, and `<graphty-element>` is an unknown element there rather than a registered one -- which is still an `HTMLElement` and a working event target, so a test can dispatch a `CustomEvent` on it and assert the forwarder saw it. | `graphty/vitest.config.ts:16-22`; `Graphty.test.tsx:70-71` queries the tag today |
| The `issues` status-bar slot is in the frozen nine-slot contract but has NO producer: `AppShell.tsx`'s slots memo builds `counts`, `layout` and `selection` and nothing else. | `graphty/src/components/shell/types.ts:700-708,734-746`; `AppShell.tsx:4253-4283` |
| The app has ONE toast, `LoadCompleteToast`, and its producer is load-scoped: `loadCompletion` returns `undefined` unless `loadFailure !== null`, even though the component's own doc generalises it to "a load ends, and this is the line that says how it ended". | `AppShell.tsx:4314-4328`; `LoadCompleteToast.tsx:1-26` |
| `@mantine/notifications` is not a dependency anywhere in the app, and `compact-mantine` publishes no toast, notification, alert or banner. | `graphty/package.json:31-65`; `compact-mantine/src/index.ts` |
| Storybook `tags` are unused in the app: the only `tags:` hit in a STORY file is row DATA in a fixture (`data-view/DataView.stories.tsx:72`), and the other twelve hits under `graphty/src` are sample-manifest and panel data, not Storybook metadata. No story anywhere sets `chromatic.disableSnapshot`. | `grep -rn "tags:" graphty/src --include=*.stories.tsx` (one hit); `grep -rn "disableSnapshot" graphty/src` (no output, rc=1) |
| Chromatic in CI already has TurboSnap off and `exitZeroOnChanges: false`, with the Vite `preview-stats.json` reason in a comment. The only TurboSnap left is `graphty/chromatic.config.json`'s `onlyChanged: true`, which the CI action does not read (it runs at repo root with `storybookBuildDir: ./graphty/storybook-static`). | `.github/workflows/ci.yml:625-660`; `graphty/chromatic.config.json` |
| `graphty/project.json`'s `lint` target runs `eslint && tsc --noEmit` with NO `dependsOn`; `build` has `dependsOn: ["^build"]`. `webgpu-graph-algorithms/project.json`'s lint has `dependsOn: ["build"]`, so the house move exists. | `graphty/project.json`; `webgpu-graph-algorithms/project.json` |
| The app resolves graphty-element to SOURCE, not to `dist`, in both tools: `graphty/vite.config.ts:33` aliases the package specifier to `../graphty-element/index.ts` and `graphty/tsconfig.json:24-31` maps it the same way. Neither carries an entry for any subpath. | the two files |
| Nothing in the workspace depends on `@graphty/graph-io`; `webgpu-graph-algorithms` depends on `@graphty/graph-format` only. | `grep -rn "graph-io" */package.json`; `webgpu-graph-algorithms/package.json:84-86` |
| `tools/commit-changes.sh:468-469`'s `VALID_SCOPES` is STALE: it omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, all three of which `commitlint.config.js:4-27` accepts (at `:8-10`). | the two files |
| `graphty/package.json:23`'s `storybook` script is STALE: it passes `--ssl-cert ~/ssl/STAR_ato_ms.crt`, and that file does not exist. `~/ssl/` holds `atoms.crt`, `atoms.key`, `atoms_chain.crt`, `atoms.pem`, `atoms-cert.sh`, `atoms-cert.env` and the year directories. So `npm run storybook` does not start in this package today. | `sed -n 23p graphty/package.json`; `ls -l ~/ssl/` |
| The APP's own dev server already serves HTTPS from paths that DO exist: `graphty/vite.config.ts:79-84` reads `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` from the monorepo root `.env`, which are `/home/apowers/ssl/atoms.key` and `/home/apowers/ssl/atoms.crt`, and `.env` also sets `HOST=dev.ato.ms` and `PORT=9005`. So `npm run dev` gives a secure context at `https://dev.ato.ms:9005`, which is what WebGPU needs before the element can find an adapter at all. | `graphty/vite.config.ts:70-84`; `.env:1-4`; the `ls -l` above |
| Both of graphty's workspace dependencies use `workspace:*`, not the `workspace:^` the integration plan's M7 row prescribes. | `graphty/package.json:36-37` |
| `eslint.config.js:40` IGNORES `**/stories/**`, so `npx eslint src/stories` exits 0 without reading anything. `tsc` DOES check them (`graphty/tsconfig.json` includes `src`), and so does prettier. | the config's ignore list; a measured run on 2026-09-19 printing "File ignored because of a matching ignore pattern" |
| `StatusBarSlots.tsx` is NOT prettier-clean at `HEAD`, so a step that edits it must not add a prettier gate. | `git show HEAD:graphty/src/components/shell/statusbar/StatusBarSlots.tsx > /tmp/f && npx prettier --check /tmp/f` warns |
| The status-bar widening Task M7-T6 needs was applied to master as a check on 2026-09-19: `tsc --noEmit` clean, `eslint src/components/shell/statusbar` clean, and `vitest run src/components/shell/statusbar src/gpu src/components/shell/analysis` gave `243 passed (243)`. | the run of 2026-09-19; the tree was restored afterwards |

### 0.2 Entry criteria: MET or NOT MET

The integration plan's Phase M7 entry is one line (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3258`): `Phase M6 on master.` It is **NOT MET**, and neither is anything M6 itself waits on. This phase cannot start today and this document must not be read as if it could.

What M7 needs from M6 is narrow and is worth naming member by member, because every task below reads one of these and nothing else:

| Criterion | Status | Evidence |
| --- | --- | --- |
| The element publishes `session.capabilities.acceleration` with the six states | **NOT MET** | `grep -rn "interface Capabilities" graphty-element/src/` returns nothing; only the error codes it will carry exist (`graphty-element/src/errors/codes.ts:310-330`) |
| ...mirrored to the DOM as `graphty-capabilities-change` | **NOT MET** | `grep -rn "graphty-capabilities-change" graphty-element/src/` returns nothing |
| The `acceleration` attribute (`auto` / `off` / `required`) is settable and reflects | **NOT MET** | `grep -rn "acceleration" graphty-element/src/graphty-element.ts` returns nothing |
| The `@graphty/graphty-element/webgpu` subpath exists and activates the optional peer | **NOT MET** | `graphty-element/package.json:9-15` exports `"."` alone; there is no `src/webgpu.ts` |
| `acceleration.minNodes` is an element config key with a measured default | **NOT MET** | M6-T20's gate owns the measurement |
| Phase M5 on master (the `layout/src/simulation/` seam M6 builds on) | **NOT MET** | `ls layout/src/` has no `simulation`; the work is on `feat/layout-simulation`, open as **draft PR #12** (`gh pr list --state all`: `{"isDraft":true,"number":12,"state":"OPEN"}`) |
| Phase M5b on master (the GPU package's layout types) | **NOT MET** | branch `feat/webgpu-layout-types` exists locally and on origin; `gh pr list --state all` returns only #11 (merged) and #12 -- it has no PR |
| Phase M8a on master (`algorithms/src/indexed/accelerator.ts` and `accelerated()`) | **NOT MET** | `ls algorithms/src/` has no `indexed` directory |
| A1 on master (the `indexed.*` namespace M8a dispatches to) | **NOT MET** | same; `algorithms/package.json` declares no `@graphty/graph-format` |
| F2 -- `@graphty/graph-format >= 1.0.0` on master | **MET** | `f6520f85 feat(graph-format)!: freeze the invariants and cut 1.0.0` is on master; `graph-format/package.json` version 1.0.0 |
| Phase M3 -- `@graphty/webgpu-graph-algorithms` in the monorepo, building, releasing | **MET** | `webgpu-graph-algorithms/package.json` version 0.2.1; `dist/browser.d.ts`, `dist/webgpu-graph-algorithms.d.ts` present; `ci.yml:282+` carries its two shards |
| The GPU package exports what the element's `webgpu` entry will import -- `probeBrowserWebGpu`, `requestGpuContext`, `createAccelerator` | **MET** | `webgpu-graph-algorithms/src/browser/index.ts:32,46`; `src/index.ts:44` |

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
| M6 Element | `graphty-element/` | M5 on master for E0 (M8a NOT required); M5 and M8a on master for E1 | graph-format 14.4 E0, then the accelerator seam, the capability record, the `acceleration` attribute, the `webgpu` subpath and the measured `acceleration.minNodes` | design G6, element part | own plan |
| **M7 App (W2)** | `graphty/` | **M6 on master (NOT MET)** | the optional peer installed and the one activation import, the Settings control, the reader's preference, the acceleration chip and device-lost line, the `metricCost` constant, the acceleration story | design G12 (W2 subset) | **this document, 5-8.5 ed** |
| M8b GPU SpMV family | `webgpu-graph-algorithms/` | M3 (MET) and the design's P2 gate (MET) | design P7 (the 8.2 / 8.3 kernels) | design G7 | own plan |

Per-task sizes, in engineer-days for one engineer familiar with this code base (design 13's convention, `design/webgpu/webgpu-acceleration-plan.md:4198`):

| Task | Size |
| --- | --- |
| M7-T1 the scope list, the stale Storybook certificate, the G12 restatement, the corpus index | 0.5-1 ed |
| M7-T2 the optional peer, the activation import, the subpath wiring, the lint build order, the CI step, the element type shim | 0.5-1 ed |
| M7-T3 the reader's preference and its Settings > Performance control | 0.5-1 ed |
| M7-T4 | OBSOLETE, 0 ed |
| M7-T5 | OBSOLETE, 0 ed |
| M7-T6 the acceleration chip, the event forwarder and the device-lost report | 1.5-2 ed |
| M7-T7 the `metricCost` accelerator constant | 0.5-1 ed |
| M7-T8 the acceleration story and the Chromatic leftover | 0.5-1 ed |
| M7-T9 the G12 gate: the real-GPU check, the no-logic check, the record | 1-1.5 ed |
| **Total** | **5-8.5 ed** |

The total is the column summed, not a figure carried over from prose: the minima add to 5 and the maxima to 8.5.

The design sizes P12 at 4-6 ed (`:4219`), and this plan is a little larger at the top of its range. Two effects work against each other and do not quite cancel. Downward: the design's estimate assumed the app probed, constructed and recovered, and all of that is gone. Upward: the design does not know that the `issues` status-bar slot has never been produced by this app, so the chip is a slot's first producer with an explicit emptiness check to widen rather than a member added to a working slot (PLAN DECISION 5), and it does not know that the app has no way to hear a DOM event from the element without a forwarder, which is one prop threaded through two components (PLAN DECISION 2).

### 0.4 Decisions (defaults stand unless the owner says otherwise before Task M7-T1 starts)

| Id | Decision | Default and reason | Alternative |
| --- | --- | --- | --- |
| D-M7-1 | Branch and worktree | `feat/gpu-app-accelerator` in `.worktrees/gpu-app` (`git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master`, owner). One PR for the whole phase, whose last commit is the G12 record. The app's Chromatic job runs on the PR and the owner accepts the new stories' baselines there. | Landing T1/T2 as their own PR first. Choose it only if the GPU package's PR loop (see R-M7-4) is already hurting: T2 is what lengthens it, and landing it early spreads the cost over fewer days but leaves master with a dependency nothing imports for a week. |
| D-M7-2 | Dependency protocol | `"@graphty/webgpu-graph-algorithms": "workspace:*"`, matching the app's two existing workspace deps (`graphty/package.json:36-37`), NOT the `workspace:^` the integration plan's wording prescribes. graphty is `"private": true` with `"release": { "publish": false }` (`graphty/project.json`), and `nx.json` sets `preserveLocalDependencyProtocols: true`, so nothing ever rewrites the protocol into a published range and the two spellings are identical at install time. A third spelling in one manifest is a reader trap. Recorded as DEP-A. | `workspace:^`, if the owner wants the manifest to read the same as the integration plan's cell. It would then differ from both of its neighbours. |
| D-M7-3 | Where `tsc --noEmit` gets the GPU package's types | `graphty/project.json`'s `lint` target gains `"dependsOn": ["^build"]`. The app never imports the GPU package, but it does import `@graphty/graphty-element/webgpu`, which the app resolves to element SOURCE -- and that file imports the GPU package, which resolves through `node_modules` to `webgpu-graph-algorithms/dist`. So an unbuilt `dist/` is an unresolved module two hops away and a red lint job whose message says nothing about build order. `webgpu-graph-algorithms/project.json` already carries `"dependsOn": ["build"]` on its own lint, so the move has a precedent in the same repository. | A `paths` alias to the GPU package's SOURCE. Rejected: `graphty/tsconfig.json:16-18` disables `noUnusedLocals` / `noUnusedParameters` precisely "to avoid checking sibling packages' source files via path aliases", and a further alias would pull the GPU package's strict source and its `@webgpu/types` reference into the app's own type-check. |
| D-M7-4 | The element type shim | DELETE `graphty/src/types/graphty-element.d.ts`. It is verified to SHADOW the real package (0.1), so with it in place the app could never name a real element type -- and this phase's chip is built entirely out of one: the acceleration member of the element's own `Capabilities`. Deleting it is verified to cost exactly one word in one test file. | Keep it and widen it by hand. Rejected by the architectural principles outright: re-declaring the element's types in the app is one of the named forms of working around the element, and the shim would have to grow the capability record, the event map and the attribute -- three more things to keep in step. |
| D-M7-5 | Where the reader's preference lives | A versioned `localStorage` key, `graphty.shell.gpu.v1`, with `readPersistedGpuSettings` / `writePersistedGpuSettings` / `resolveGpuSettings`, copying `loadDefaults.ts:63,103,149` field for field, and edited in Settings > Performance beside the label controls. This is not an app workaround: the element states that it persists nothing on a reader's behalf, and says the host application keeps its own key and writes the attribute. | A URL parameter or nothing at all. Rejected: the preference is a property of the reader's MACHINE, not of the dataset or the link, so it must survive a reload and must not travel in a shared URL. |
| D-M7-6 | What the chip is | `StatusBarChip` in the `issues` slot, shaped exactly like `StatusBarPerformanceMode` (`types.ts:690-698`): `label` + `title` + `onClick`, with `onClick` opening Settings > Performance -- the same door the Performance chip uses. | A Mantine `Badge` like `components/ai/AiStatusIndicator.tsx`. Rejected by the project's UI rule: that badge belongs to the AI panel body, not to the shell chrome, and does not follow the chip register. |
| D-M7-7 | The acceleration threshold | The app neither measures nor sets it. `acceleration.minNodes` is an element `ConfigValues` key with an element default, evaluated inside the element; the measurement that sets that default belongs to M6-T20's gate, which can reach a real GPU from the element's own Storybook. The app's Settings > Performance shows the reader's preference and nothing else. | The app writing `acceleration.minNodes` per instance. Rejected: an app-side number is a second answer that silently disagrees with the default every other consumer of the element gets, and the app has no way to measure it that the element does not have more directly. |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-A | `workspace:*` rather than the integration plan's `workspace:^`. | D-M7-2. No design section fixes the protocol; the integration plan's cell is prose, and the app's two existing entries are the local convention. |
| DEP-B | The app resolves `@graphty/graphty-element/webgpu` through its own vite alias and tsconfig path, to element SOURCE, rather than through the package's `exports` map to `dist`. | PLAN DECISION 1. The app already resolves the element's main entry to source in both tools, for a stated reason (tree-shaking, and not bundling all of Babylon). Two resolutions of one package in one build give two module instances and two accelerator registrations. |
| DEP-C | knip's `graphty` workspace gains `@graphty/webgpu-graph-algorithms` under `ignoreDependencies`. | The app INSTALLS the element's optional peer and imports it nowhere, which is exactly what knip reports as an unused dependency. The GPU package's own block already carries the same kind of entry for the same kind of reason (`knip.config.ts:50-56`). |
| DEP-D | The design's device-loss report becomes a `StatusBarCompletion` handed to the shell, which routes it into `LoadCompleteToast`. | PLAN DECISION 6. The app has no toast function to call; it has one toast COMPONENT with a typed model. |
| DEP-E | G12's "nightly GPU lane green for a week" is replaced by "the GPU lane green on the master commits of this phase". | The nightly does not exist: `design/decisions/2026-09-19-no-nightly-gpu-lane.md`. Task M7-T1 writes the record. |
| DEP-F | The `metricCost.ts` accelerator constants are all 1 at M7. | PLAN DECISION 8. No node metric has a GPU path until design P7 / Phase M8b, and a factor above 1 would be the interface claiming a speed the code cannot deliver. |
| DEP-G | The `Build graph-format, graph-io and webgpu-graph-algorithms (PR)` step NARROWS to graph-io AND webgpu-graph-algorithms; it drops only graph-format, and it does not vanish. | Nothing in the workspace depends on `@graphty/graph-io`, so graph-io is outside every closure. `webgpu-graph-algorithms` is inside graphty's closure but NOT inside graph-io's, so a PR touching only `graph-io/` still leaves the GPU package's `dist/` unbuilt against an unconditional Upload step. Only `graph-format` is genuinely covered, because both named projects depend on it. The integration plan's cell says the step "becomes redundant for it" -- for the GPU package -- and that is true only of PRs that make graphty affected; M7-T2 Step 5 carries the counter-example. |

### 0.6 Where each PLAN DECISION is taken

| # | Question | Taken in |
| --- | --- | --- |
| 1 | How the app resolves the element's `webgpu` subpath, in vite and in tsc | M7-T2, before Step 1 |
| 2 | How the app hears that acceleration changed | M7-T6, before Step 1 |
| 3 | What the chip says in each of the six states, and what it says in none of them | M7-T6, before Step 1 |
| 4 | Where the reader's preference is stored and edited | M7-T3, before Step 1 |
| 5 | Which slot produces the chip | M7-T6, before Step 1 |
| 6 | How a lost device surfaces, given one load-scoped toast | M7-T6, before Step 1 |
| 7 | How an acceleration story is deterministic on a runner with no GPU | M7-T8, before Step 1 |
| 8 | What the per-metric accelerator constant is worth today | M7-T7, before Step 1 |
| 9 | What the app's half of G12 can and cannot check | M7-T9, before Step 1 |
| 10 | `workspace:^` versus `workspace:*` | D-M7-2 |
| 11 | `dependsOn` versus a tsconfig alias | D-M7-3 |
| 12 | The element type shim | D-M7-4 |
| 13 | What happens to the `ci.yml` build step | M7-T2, Step 5 |
| 14 | The G12 restatement | M7-T1 Step 2 |

---

## Phase M7: the graphty app (W2) -- the element API's 4.1.1, 4.10.1 and 4.12; design 13 row P12

**Entry criteria:** Phase M6 on master, with its G6 record green -- NOT MET today (section 0.2), and blocked behind M5, M5b, A1 and M8a in that order. Until then this phase may be READ but not started: every live task from M7-T3 onward names something the element does not publish yet -- the `acceleration` attribute, the capability record, the `graphty-capabilities-change` mirror or the `webgpu` subpath. Work on branch `feat/gpu-app-accelerator` in a worktree (`git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master`, owner); every commit through `tools/commit-changes.sh`; the phase lands as ONE PR whose last commit is the G12 record.

**Step 0 of the phase (a fresh worktree has no `node_modules` and no `dist/`, both gitignored):** `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,webgpu-graph-algorithms,algorithms,layout,graphty-element --parallel=3`. `AT` below means that worktree. The GPU package's `dist/` is what the app's type-check reaches through the element's `webgpu` entry (D-M7-3); `graphty-element/` source is what the app's vite alias reads (`graphty/vite.config.ts:33`).

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
real GPU exercised on the dev box under the owner's visual rule, and a measured threshold above
which acceleration is used. Two of those are now answered in graphty-element rather than in the app,
because the element owns acceleration: the threshold is its `acceleration.minNodes` config key, and
the story that settles, drags and pins on a real GPU is its own. They are recorded in the element
phase's gate record, and the app's record cites them. The P0-P3 plan documents still describe the
three-job lane and are deliberately left alone.
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
| `plans/2026-09-19-webgpu-m7-graphty-app.md`                                     | Phase M7: the app's acceleration chip, the Settings control, the reader's preference, the `metricCost` accelerator constant and the one import that turns the GPU on (gate G12's W2 subset)                                                                                                                                       | live plan     |
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

### Task M7-T2: the optional peer, the activation import, the subpath wiring, the lint build order, the CI step, the element type shim

**Repository:** `AT`.

**Files:**
- Modify: `graphty/package.json:31-47` (the dependency)
- Modify: `graphty/src/main.tsx` (the one activation import)
- Modify: `graphty/vite.config.ts:28-38` (the subpath alias, ABOVE the package alias)
- Modify: `graphty/tsconfig.json:24-31` (the subpath path entry)
- Modify: `graphty/project.json` (the `lint` target's `dependsOn`)
- Modify: `knip.config.ts:159-162` (the installed-not-imported peer)
- Modify: `.github/workflows/ci.yml:85-92` (the build step narrows to graph-io and webgpu-graph-algorithms)
- Delete: `graphty/src/types/graphty-element.d.ts` (73 lines, the shadowing shim)
- Modify: `graphty/src/components/Graphty.test.tsx:69` (`querySelector<HTMLElement>`)
- Modify: `pnpm-lock.yaml` (the install writes it)
- NOT touched: `graphty/vite.config.ts`'s `build.rollupOptions.external` (the GPU package is bundled like any other source dependency; only `@mlc-ai/web-llm` is external there), `commitlint.config.js`

**Interfaces:**
- Consumes: `graphty-element/package.json`'s `exports` map and its `peerDependencies` + `peerDependenciesMeta.optional` entry for the GPU package, both added by Task M6-T1; `graphty-element/src/webgpu.ts`, added by Task M6-T20.
- Produces: an app in which the GPU is on -- one import, no configuration -- and in which `@graphty/graphty-element` resolves to the REAL package so the rest of this phase can name the element's own types.

**PLAN DECISION 1 (how the app resolves the element's `webgpu` subpath):** through the app's own alias, to element SOURCE, in both tools, with the subpath entry placed BEFORE the bare package entry in vite. The app already resolves `@graphty/graphty-element` to `../graphty-element/index.ts` in `vite.config.ts:33` and to the same file in `tsconfig.json:24-31`, for a reason recorded in the config: source resolution tree-shakes, and the package's `dist` externalises Babylon. Letting the subpath alone fall through to the package's `exports` map would resolve ONE specifier to `dist` while its sibling resolves to source, and the two are different module instances -- two registries, two accelerator registrations, and a chip that reports on a registry the layout engine is not using. Order matters in vite and does not in tsc: a vite string alias matches the specifier itself and anything beginning with it plus a slash, so the bare entry placed first would rewrite `@graphty/graphty-element/webgpu` to `.../index.ts/webgpu`, which is not a file; TypeScript's `paths` picks the longest matching pattern regardless of order. Both are written adjacent so a reader sees them as a pair.

- [ ] **Step 1: The dependency, and telling knip it is installed rather than imported**

In `graphty/package.json`'s `dependencies`, after `"@graphty/graphty-element": "workspace:*",`, add:

```json
        "@graphty/webgpu-graph-algorithms": "workspace:*",
```

Run: `cd AT && HUSKY=0 pnpm install --frozen-lockfile`
Expected: FAIL -- `ERR_PNPM_OUTDATED_LOCKFILE`, because the manifest now names a dependency the lockfile does not. That is the point of running it first: the failure proves the manifest edit landed. Then run `cd AT && HUSKY=0 pnpm install` and expect the graphty importer to gain `'@graphty/webgpu-graph-algorithms': specifier: workspace:* version: link:../webgpu-graph-algorithms`. No registry package is added: the GPU package's own dependencies (`@graphty/graph-format`, `@webgpu/types`) are already installed for it.

Then `knip.config.ts`'s `graphty` workspace (`:159-162`) becomes:

```ts
            ignoreDependencies: [
                // Testing
                "jsdom",
                // graphty-element's OPTIONAL PEER. The app installs it so that
                // `import "@graphty/graphty-element/webgpu"` has something to activate; no file
                // under src imports it, and none may.
                "@graphty/webgpu-graph-algorithms",
            ],
```

Reason, and the line that makes it more than a silencer: an unused-dependency report here would be CORRECT about the facts and wrong about the conclusion. The app must install this package -- that is how an optional peer reaches the bundle -- and the app must never import it. The comment is what stops the next reader from "fixing" the report by importing it somewhere.

Run: `cd AT && pnpm run lint:knip`
Expected: exit 0, with no `Unused dependencies` section naming graphty.

- [ ] **Step 2: The subpath wiring and the one activation import**

`graphty/vite.config.ts`'s alias block (`:28-38`) gains one entry, ABOVE the bare package entry:

```ts
                // The element's optional-peer activation entry. It MUST sit before the bare
                // package alias below: a string alias matches the specifier itself and anything
                // beginning with it plus a slash, so the bare entry would rewrite this import to
                // `../graphty-element/index.ts/webgpu`, which is not a file.
                "@graphty/graphty-element/webgpu": resolve(__dirname, "../graphty-element/src/webgpu.ts"),
```

`graphty/tsconfig.json`'s `paths` (`:24-31`) gains the matching entry, beside the one it belongs with:

```json
            "@graphty/graphty-element/webgpu": ["../graphty-element/src/webgpu.ts"],
            "@graphty/graphty-element": ["../graphty-element/index.ts"],
```

and `graphty/src/main.tsx` gains the import, immediately after the `import { Graphty } from "@graphty/graphty-element";` block and its tree-shaking guard:

```ts
// Turns the GPU on, and is the whole of this app's GPU integration. Everything after this line
// belongs to the element: probing for an adapter, requesting a context, constructing the
// accelerator, attaching it, applying acceleration.minNodes, and dropping to the CPU when a
// device is lost. Deleting this line is how a build ships without acceleration; there is no
// other switch, and no file in this app imports the GPU package itself.
import "@graphty/graphty-element/webgpu";
```

A side-effect import is not reordered by `simple-import-sort` -- it acts as a barrier and stays where it is written -- so it can sit beside the `Graphty` import without disturbing the block. Run `npx eslint --fix src/main.tsx` and take its output rather than arguing with it.

Run: `cd AT/graphty && npx tsc --noEmit && grep -n "graphty-element/webgpu" src/main.tsx vite.config.ts tsconfig.json`
Expected: `tsc` exits 0 and all three files name the subpath. If `tsc` reports `Cannot find module '@graphty/graphty-element/webgpu'`, either the tsconfig entry is missing or Task M6-T20 has not landed `graphty-element/src/webgpu.ts` -- check which before editing anything, because the second one means this phase is out of entry criteria (section 0.2).

- [ ] **Step 3: The lint build order**

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

Reason, and the case it closes: `graphty:lint` runs `tsc --noEmit`, which now follows `@graphty/graphty-element/webgpu` into element source, and that file imports `@graphty/webgpu-graph-algorithms`, which resolves through `node_modules` to `webgpu-graph-algorithms/dist`. An unbuilt `dist/` is therefore an unresolved module two hops from anything the app wrote, and a red lint job whose message says nothing about build order. Be precise about what this does and does not fix, because the M8a plan's PD-8 takes the opposite decision for `algorithms/` on the same evidence and the two must not read as a disagreement about facts. CI is already safe without it, on both paths: `ci.yml:78` and `:98` both say "Build then lint (build first for type dependencies)", the PR path runs `nx affected -t build` BEFORE `nx affected -t lint`, graphty's own `build` carries `dependsOn: ["^build"]` so its closure is built whenever graphty is affected, and Step 5 keeps `webgpu-graph-algorithms` in the unconditional PR build step (DEP-G) so the package's `dist/` is present on every pull request regardless. What `dependsOn: ["^build"]` buys is the LOCAL case: a bare `pnpm exec nx run graphty:lint` in a fresh worktree, which is exactly the residual the M8a plan accepts for algorithms and names as its R-M8A-2. M7 closes it here rather than accepting it because `webgpu-graph-algorithms/project.json` already carries `"dependsOn": ["build"]` on its own lint, and because the app's lint is the slowest in the repository and is the one a contributor runs by hand.

Run: `cd AT && pnpm exec nx run graphty:lint`
Expected: the GPU package (and graph-format, and the rest of graphty's closure) build first, then `eslint` and `tsc --noEmit` both exit 0.

- [ ] **Step 4: The element type shim**

Delete `graphty/src/types/graphty-element.d.ts` and change `graphty/src/components/Graphty.test.tsx:69` from

```ts
        const graphtyElement = container.querySelector("graphty-element");
```

to

```ts
        const graphtyElement = container.querySelector<HTMLElement>("graphty-element");
```

Reason: the shim is an ambient `declare module "@graphty/graphty-element"`, and TypeScript resolves an ambient module declaration BEFORE it consults `paths`. Verified on 2026-09-19: a probe file importing `type { Edge }` -- which `graphty-element/index.ts:11` exports and the shim does not -- failed with `TS2305: Module '"@graphty/graphty-element"' has no exported member 'Edge'`. So while the shim is in force the app cannot name a single real element type, and Task M7-T6 is built out of one: the acceleration member of the element's own `Capabilities`. Its `HTMLElementTagNameMap` augmentation is what those two test lines were using; the type parameter replaces it, and the element ships its own tag map and event map once M6 is on master. Verified: deleting the file produced exactly two errors, both on those lines, and this edit clears both.

Run: `cd AT/graphty && npx tsc --noEmit`
Expected: exit 0, no output. If any OTHER error appears, it is a real disagreement between the shim's hand-written shape and the element's own types -- fix the app's usage, or fix the element, and never re-add the shim.

- [ ] **Step 5: The CI build step narrows**

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
Expected: nine artifacts, all non-empty, and all 20 test shards green. Close the scratch PR without merging. This is G12 item 9b.

- [ ] **Step 6: The whole gate**

Run: `cd AT && pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1 && pnpm exec nx run graphty:coverage && pnpm run lint:knip`
Expected: build, lint and knip green; the app's vitest suite passes in headless Chromium with no new failures. `Graphty.test.tsx` is the only test file this task touched.

- [ ] **Step 7: Commit (owner)** -- two commits through `tools/commit-changes.sh`: `build(graphty): install the element's optional GPU peer and turn it on with one import` for Steps 1-4 (the body records that the app imports the GPU package nowhere, that the subpath is aliased to element source in both tools and why the order matters in vite, that the ambient element shim was shadowing the real package types, and the one test line that changed), then `ci: drop graph-format from the explicit PR build` for Step 5 (the body names the closure argument, the graph-io-only PR that keeps webgpu-graph-algorithms in the list, and the 20 Download steps the narrowing must not break). The PR's `build` job proves the second one for a graphty-affected PR; the scratch graph-io-only PR of Step 5 proves it for the case the landing PR cannot reach. Every shard's Download step must still find nine artifacts in both.

### Task M7-T3: the reader's acceleration preference and its Settings > Performance control

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/gpu/gpuPrefs.ts` (the versioned store)
- Create: `graphty/src/gpu/__tests__/gpuPrefs.test.ts`
- Modify: `graphty/src/components/Graphty.tsx` (the `acceleration` prop and the effect that writes it onto the element, beside the `layout` and `viewMode` effects at `:446-467`)
- Modify: `graphty/src/components/Graphty.test.tsx` (one case: the attribute reaches the element)
- Modify: `graphty/src/components/shell/canvas/CanvasRegion.tsx:83-101` (the config member) and `:434-446` (pass it down)
- Modify: `graphty/src/components/shell/panel/SettingsOverlay.tsx` (an `AccelerationSettingsPane`, rendered under `performance`, and the props it is handed)
- Modify: `graphty/src/components/shell/AppShell.tsx` (the preference state beside the other shell state, the write to storage, and the two hand-downs: the overlay at `:5019` and the canvas graph config at `:4691-4697`)
- NOT touched: `graphty/src/components/shell/defaults/loadDefaults.ts` (the label settings keep their own key), `graphty/src/components/shell/types.ts`

**Interfaces:**
- Consumes: the persistence shape of `loadDefaults.ts:103-160` (`readPersisted*` / `writePersisted*` / `resolve*`); `SettingsOverlay.tsx:107`'s `SHIPPED_SECTION_IDS`, which already lists `performance`; the element's `acceleration` attribute, whose three values this store must spell the same way.
- Produces: `GpuPreferenceValue`, `GPU_SETTINGS_STORAGE_KEY`, `GPU_PREFERENCE_VALUES`, `PersistedGpuSettings`, `DEFAULT_GPU_SETTINGS`, `readPersistedGpuSettings()`, `writePersistedGpuSettings(s)`, `resolveGpuSettings(partial)`; `GraphtyProps.acceleration`, `CanvasGraphConfig.acceleration`, `SettingsOverlayProps.acceleration`.

**PLAN DECISION 4 (where the reader's preference is stored and edited):** a versioned `localStorage` key `graphty.shell.gpu.v1`, owned by the shell, and a controlled pane in Settings > Performance. This is the app's job and not a workaround: the element is explicit that it persists nothing on a reader's behalf and that the host application keeps its own key and writes the attribute. Settings > Performance is a SHIPPED section (`SettingsOverlay.tsx:74-87` declares it, `:107`'s `SHIPPED_SECTION_IDS` includes it, `:486` renders `LabelSettingsPane` there), so the door exists and nothing has to be un-tagged. The store copies `loadDefaults.ts` field for field rather than inventing a shape: a versioned key so a shape change reads as a MISSING key rather than a corrupt one, a try/catch round the store (private mode and disabled site data both throw), `JSON.parse` in its own try, non-objects and arrays refused, and each field validated on its own. A separate key from `graphty.shell.labels.v1` because a GPU preference is not a label setting and neither record may corrupt the other.

Two things differ from `LabelSettingsPane`, and both follow from the preference having a live destination. The pane is CONTROLLED -- it is handed a value and a callback, exactly as the AI pane is handed its key store, because the shell owns the value: the shell is what writes it onto the element, and a pane that read and wrote storage on its own would be a second answer the running element never hears. And there is no "applies on the next load" line, because there is no such delay: the shell's state feeds the element's `acceleration` attribute on the same render, and what happens next -- re-probing, detaching, an error when `required` cannot be satisfied -- is the element's to decide and to report through its capability record.

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

describe("the acceleration preference store", () => {
    it('defaults to "auto", which is the element\'s own default', () => {
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

Create `graphty/src/gpu/gpuPrefs.ts` with this content exactly (it is prettier-clean at tabWidth 4 / printWidth 120 and passes the repository's `jsdoc/require-*` rules):

```ts
/**
 * The reader's acceleration preference, and where it is remembered.
 *
 * The element does not remember this and must not: a component that writes to its host page's
 * storage unasked is a surprise the host cannot anticipate, and a preference the element
 * restored would fight the attribute a host page wrote in its own markup. So the app keeps the
 * key and writes the element's `acceleration` attribute from it. This module is the whole of
 * that responsibility.
 *
 * Settings > Performance is the pane (`SettingsOverlay.tsx`'s `SHIPPED_SECTION_IDS` already
 * lists `performance`), and the storage shape copies `readPersistedLabelSettings` field for
 * field: a VERSIONED key so a shape change becomes a missing key rather than a corrupt read, a
 * try/catch round the store, `JSON.parse` in its own try, non-objects and arrays refused, and
 * each field validated on its own. A separate key from `graphty.shell.labels.v1` because these
 * are not label settings and neither record may corrupt the other.
 */

/**
 * What the reader asked for, in the element's own vocabulary: `"auto"` uses an accelerator when
 * the element finds one and runs on the processor otherwise, `"off"` means never look, and
 * `"required"` turns a missing accelerator into a loud error instead of a quiet CPU run.
 *
 * The three spellings must match the element's `acceleration` attribute exactly. The element
 * rejects a value it does not know and reports it through the capability record the status bar
 * already draws, so a drifted vocabulary shows up as a chip that says acceleration is off with
 * a reason, rather than as a setting that silently does nothing.
 * @public
 */
export type GpuPreferenceValue = "auto" | "off" | "required";

/** Versioned local-storage key for the reader's acceleration preference. @public */
export const GPU_SETTINGS_STORAGE_KEY = "graphty.shell.gpu.v1";

/** The three values, in the order the control draws them. @public */
export const GPU_PREFERENCE_VALUES: readonly GpuPreferenceValue[] = ["auto", "off", "required"];

/** The acceleration settings Settings > Performance owns, and nothing more. @public */
export interface PersistedGpuSettings {
    /** What the reader asked the element to do about acceleration. */
    readonly gpu: GpuPreferenceValue;
}

/** The element's own default: use an accelerator when there is one, run on the processor when there is not. @public */
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
 * Reads the reader's acceleration preference, surviving an absent key, an unreadable store
 * (private mode, disabled site data), malformed JSON and a value of the wrong shape.
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
 * Writes the reader's acceleration preference. A full or unavailable store is not an error the
 * shell can act on: the choice simply does not survive the session.
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
Expected: 5 tests pass.

- [ ] **Step 3: The preference reaches the element**

`GraphtyProps` (`Graphty.tsx:133-148`) gains one member:

```ts
    /** What the reader asked the element to do about acceleration. */
    acceleration?: GpuPreferenceValue;
```

with `import type { GpuPreferenceValue } from "../gpu/gpuPrefs";` added, `acceleration` destructured in the component's parameter list (`:291`), and an effect beside the `layout` and `viewMode` ones (`:446-467`):

```ts
    // Hand the reader's acceleration preference to the element, which owns everything after it.
    useEffect(() => {
        if (graphtyRef.current && acceleration !== undefined) {
            graphtyRef.current.setAttribute("acceleration", acceleration);
        }
    }, [acceleration]);
```

`CanvasGraphConfig` (`CanvasRegion.tsx:83-101`) gains the matching member and `:434-446` passes it through as `acceleration={graph?.acceleration}`, exactly as it already passes `onSelectionChange` and `onStylesChange` at `:444-445`.

The ATTRIBUTE rather than the property, deliberately and for two reasons. It is the surface the element documents for a host page to write, and it needs no element type -- which matters here, because `Graphty.tsx:21-36` declares a hand-written `GraphtyElementType` mirror of the element, and growing that mirror by one more member is one of the named forms of working around the element. The mirror is a pre-existing defect that the element's own tag map and element type retire; this phase must not feed it.

Then one case in `graphty/src/components/Graphty.test.tsx`, which the app's own environment runs today with no element registered -- an unrecognised tag is still an `HTMLElement` and `setAttribute` on it is ordinary DOM:

```tsx
    it("writes the reader's acceleration preference onto the element", () => {
        const { container } = render(<Graphty layers={[]} acceleration="off" />);

        expect(container.querySelector<HTMLElement>("graphty-element")?.getAttribute("acceleration")).toBe("off");
    });
```

Match the file's existing render call and `describe` placement rather than the sketch above if they differ.

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint src/components/Graphty.tsx src/components/shell/canvas/CanvasRegion.tsx && npx vitest run src/components/Graphty.test.tsx`
Expected: all three exit 0, with one more case in `Graphty.test.tsx` than master has.

- [ ] **Step 4: The pane control**

In `graphty/src/components/shell/panel/SettingsOverlay.tsx`, add `Select` to the Mantine import at `:2`:

```ts
import { ActionIcon, Box, NumberInput, Overlay, Select, Switch } from "@mantine/core";
```

add the store's type import (`simple-import-sort` places `"../../../gpu/gpuPrefs"` first in the relative block; run `npx eslint --fix` and take its output):

```ts
import { GPU_PREFERENCE_VALUES, type GpuPreferenceValue } from "../../../gpu/gpuPrefs";
```

the four strings, beside `LABEL_SWITCH_LABEL` (`:110`):

```ts
/** The control's label: the thing and the verb, in the reader's words. */
const GPU_SELECT_LABEL = "Use the GPU";

/** What the three values mean, in one line, because a reader picking one has to know. */
const GPU_SELECT_DESCRIPTION =
    "Automatic uses a graphics processor when this browser has one and stays on the processor otherwise.";

/** The three rows, in {@link GPU_PREFERENCE_VALUES} order. */
const GPU_OPTIONS = [
    { value: "auto", label: "Automatic" },
    { value: "off", label: "Never" },
    { value: "required", label: "Required (report why not)" },
];

/** Where the answer appears, so a reader who picks one knows where to look. */
const GPU_STATUS_LINE = "The status bar says which one is in use.";
```

the pane's props and the pane, beside `LabelSettingsPane`:

```tsx
/**
 * The reader's acceleration preference and the one callback that changes it.
 * @public
 */
export interface AccelerationSettingsProps {
    /** What the reader has chosen. */
    readonly value: GpuPreferenceValue;
    /** Called with the new choice. The shell remembers it and hands it to the element. */
    readonly onChange: (value: GpuPreferenceValue) => void;
}

/**
 * Settings > Performance: what the reader asked the element to do about acceleration.
 *
 * Controlled, unlike the label pane beside it, and handed its value the way the AI pane is
 * handed its key store: the shell owns this value because the shell is what writes it onto the
 * element. A pane that read and wrote storage on its own would be a second answer that the
 * running element never hears.
 * @param props - the value and its callback.
 * @returns the control and the line that says where the answer appears.
 */
function AccelerationSettingsPane(props: AccelerationSettingsProps): React.JSX.Element {
    const { value, onChange } = props;

    return (
        <Box
            data-testid="settings-gpu"
            style={{ display: "flex", flexDirection: "column", gap: PANEL_GRID.PAD_LEFT, maxWidth: FIELD_WIDTH }}
        >
            <Select
                label={GPU_SELECT_LABEL}
                description={GPU_SELECT_DESCRIPTION}
                data={GPU_OPTIONS}
                value={value}
                allowDeselect={false}
                data-testid="settings-gpu-select"
                onChange={(next) => {
                    const chosen = GPU_PREFERENCE_VALUES.find((entry) => entry === next);

                    if (chosen !== undefined) {
                        onChange(chosen);
                    }
                }}
            />

            <Box component="span" style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}>
                {GPU_STATUS_LINE}
            </Box>
        </Box>
    );
}
```

`SettingsOverlayProps` gains one required member, documented the way `aiProviders` is:

```ts
    /**
     * The reader's acceleration preference, handed down by the shell.
     *
     * Required, not optional, for the reason `aiProviders` is: the shell holds the one value,
     * because the shell is what writes it onto the element and what remembers it between
     * visits. A pane with no route back could only draw a control that quietly did nothing.
     */
    readonly acceleration: AccelerationSettingsProps;
```

destructured at `:471` beside `aiProviders`, and rendered immediately after `{section.id === "performance" && <LabelSettingsPane />}` (`:486`):

```tsx
                        {/* Settings > Performance also owns the acceleration preference: it is a
                            property of the reader's machine, like the label budget, and belongs
                            to neither a dataset nor a link. */}
                        {section.id === "performance" && <AccelerationSettingsPane {...acceleration} />}
```

The `find(...)` with an `undefined` guard rather than a cast: Mantine's `onChange` hands back `string | null`, `Array.prototype.find` returns `undefined` when nothing matches, and a `<Select>` handed `undefined` flips from controlled to uncontrolled. Nothing the control can draw fails the `find`, so the guard never fires in practice and that is the point -- it is there so that a value the control cannot draw changes nothing rather than clearing the preference.

- [ ] **Step 5: The shell owns the value**

In `graphty/src/components/shell/AppShell.tsx`, beside the other shell state:

```ts
    /* The reader's acceleration preference. The shell owns it because the shell is what writes
       it onto the element and what remembers it between visits -- the element deliberately
       persists nothing on a reader's behalf. Seeded from storage in the initialiser rather than
       an effect, so the control never draws the default for a frame before correcting itself. */
    const [gpuPreference, setGpuPreference] = useState<GpuPreferenceValue>(
        () => resolveGpuSettings(readPersistedGpuSettings()).gpu,
    );
    const changeGpuPreference = useCallback((value: GpuPreferenceValue) => {
        setGpuPreference(value);
        writePersistedGpuSettings({ gpu: value });
    }, []);
```

with the imports added from `../../gpu/gpuPrefs`. The value is handed to both of its consumers in this same step, so it is never a state with no reader: the canvas graph config (`:4691-4697`) gains `acceleration: gpuPreference,` and the overlay (`:5019`) gains

```tsx
                            acceleration={{ value: gpuPreference, onChange: changeGpuPreference }}
```

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/gpu src/components/shell`
Expected: all green. An `@typescript-eslint/no-unused-vars` error on `gpuPreference` means one of the two hand-downs was left out.

- [ ] **Step 6: Checkpoint** -- `cd AT/graphty && npx vitest run src/gpu src/components/shell src/components/Graphty.test.tsx` passes; `LC_ALL=C grep -nP '[^\x00-\x7F]' src/gpu/gpuPrefs.ts src/gpu/__tests__/gpuPrefs.test.ts` prints nothing. Nothing is committed by this task.

### Task M7-T4: OBSOLETE -- `attachAccelerator`, the host guard, the inert calibrate arm

**OBSOLETE.** Probing for an adapter, requesting a context, constructing the accelerator, attaching it and releasing it when the device is lost all belong to graphty-element, and are built by Task M6-T19 (the accelerator registry and the activation, including the ceiling the element passes to the factory as `exactMaxNodes`) and Task M6-T20 (the `webgpu` subpath that registers the factory). The app's entire replacement is the one import of Task M7-T2 Step 2. `calibrateLayout` is still absent from the GPU package and still lands with the design's P4; no app-side arm waits for it.

### Task M7-T5: OBSOLETE -- the graph-ready signal and `useGpuAccelerator`

**OBSOLETE.** The poll and the hook existed so the app would know when to inject; the element attaches its own accelerator (Task M6-T19) and publishes the outcome as `session.capabilities.acceleration`, mirrored to every bound view as `graphty-capabilities-change` (the element API's 4.12 and 4.10.1). Subscribing to that mirror, which is all the app needs, is Task M7-T6 Step 3.

### Task M7-T6: the acceleration chip and the device-lost report

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/components/shell/statusbar/accelerationChip.ts` (the six states turned into one chip's words)
- Create: `graphty/src/components/shell/statusbar/__tests__/accelerationChip.test.ts`
- Modify: `graphty/src/components/Graphty.tsx` (the `onCapabilitiesChange` prop and its listener effect, beside the two forwarders at `:471-551`)
- Modify: `graphty/src/components/Graphty.test.tsx` (one case: the forwarder hands the detail on)
- Modify: `graphty/src/components/shell/canvas/CanvasRegion.tsx:83-101` (the config member) and `:434-446` (pass it down)
- Modify: `graphty/src/components/shell/statusbar/statusBarModel.ts` (a type-only widening: `StatusBarAccelerationMode`, `StatusBarIssuesModel`, `StatusBarSlotsModel.issues`)
- Modify: `graphty/src/components/shell/statusbar/StatusBarSlots.tsx:319-347` (the chip, drawn beside the Performance chip)
- Modify: `graphty/src/components/shell/statusbar/StatusBar.tsx:109-121` (`visibleIssues` learns the fourth member)
- Modify: `graphty/src/components/shell/AppShell.tsx` -- the capability state beside the other shell state, the `issues` slot's first producer hoisted ABOVE the slots memo's `dataLoaded` guard (`:4253-4283`), and the completion widened beyond the load (`:4314-4328`)
- Modify: `graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx` (the chip's three cases)
- Modify: `graphty/src/components/shell/__tests__/AppShell.test.tsx` (one case: the bar draws no chip before the element has said anything)
- NOT touched: `graphty/src/components/shell/types.ts` (the frozen nine-slot contract; `statusBarModel.ts` is the documented place to extend it), `graphty/src/components/shell/constants.ts` (`issues` is already in `STATUS_BAR_NEVER_DROP`), `graphty/src/components/shell/statusbar/LoadCompleteToast.tsx`

**Interfaces:**
- Consumes: the element's `Capabilities` type and its `acceleration` member, the `graphty-capabilities-change` DOM event, `StatusBarChip` (`StatusBarChip.tsx:85`), the local `StatusDot` (`StatusBarSlots.tsx:74-80`), `StatusBarCompletion` (`statusBarModel.ts:117-150`).
- Produces: `accelerationChipModel()` and `GPU_LABEL_PREFIX`; `GraphtyProps.onCapabilitiesChange`, `CanvasGraphConfig.onCapabilitiesChange`; `StatusBarAccelerationMode`, `StatusBarIssuesModel`, and a `StatusBarSlotsModel.issues` the app actually fills.

**PLAN DECISION 2 (how the app hears that acceleration changed):** the DOM mirror `graphty-capabilities-change`, forwarded to a React prop by `Graphty.tsx`, exactly as `selection-changed` and `style-changed` already are (`:471-497` and `:500-551`). Not the session: the element API publishes this mirror for precisely this use -- a consumer draws an acceleration chip, says why it is off, and updates through a device loss, without importing the session module or naming a GPU type -- and the shell holds a DOM node, not a session, so a session subscription would mean holding a model handle and its disposal rules for one chip. The forwarder also SEEDS on attach, by handing the callback whatever the element already reports, because a probe that answered before React ran the effect would otherwise leave the chip blank for the life of the page.

**PLAN DECISION 3 (what the chip says in each of the six states, and what it says in none of them):** one pure function, `accelerationChipModel`, in its own module with its own test, because the mapping is user-visible copy and is the part most likely to be got wrong. Three rules it obeys:

- `"probing"` draws NOTHING, and so does "the element has not said anything yet". A chip that reads "off" for 30 ms and then "on" reads as a fault the reader saw, which is exactly why the element publishes a probing state instead of leaving the consumer to guess.
- `"active"` and `"idle"` draw the SAME label. Both mean an accelerator is attached and usable; the difference is whether something is on it this instant, which is a tooltip fact, not a label that should flicker while a reader watches. An idle accelerator is a working accelerator -- a graph below the element's `acceleration.minNodes` sits there -- and rendering it as "off" would be a lie the reader would act on.
- `"unavailable"`, `"error"` and `"off"` are three different sentences: nothing could be attached (with the element's own `reason`), something was attached and stopped, and the reader turned it off. They are not collapsed into one "off", because the second is a fault the reader may be able to fix and the third is a choice the reader made.

The model carries a `tone` rather than a colour, and the drawing maps tone to `PANEL_INK`. A chip that decided its own colour by looking for `": on"` inside its own label would break the first time the copy changed.

**PLAN DECISION 5 (which slot produces the chip):** a `StatusBarChip` in the `issues` slot, declared as `StatusBarAccelerationMode` in `statusBarModel.ts` and shaped like `StatusBarPerformanceMode` (`types.ts:690-698`): `label`, `title`, `onClick`, plus the `tone`. `StatusBarChip.tsx:1-8` says in its own doc that "Every chip in the bar is this atom", and the project's UI rule forbids a bespoke control. Two facts make this more work than "add a member". First, the `issues` slot has NEVER been produced by this app -- `AppShell.tsx:4253-4283` builds `counts`, `layout` and `selection` and nothing else, and it builds none of them until a dataset has loaded, because the memo opens with `if (!dataLoaded) { return {}; }` at `:4254-4256` -- so this is the slot's first producer, it has to sit ABOVE that guard, and `StatusBar.test.tsx` gets the first test that draws it. Second, `StatusBar.tsx:109-121`'s `visibleIssues` has an EXPLICIT three-member emptiness check (`validation`, `notes`, `performance`); an acceleration-only issues model handed to today's code would be dropped on the floor with no error. The widening goes in `statusBarModel.ts` and NOT in `types.ts` because `statusBarModel.ts:1-13` is the documented place for it, and it must stay TYPE-ONLY: `graphty/vitest.config.ts:53-59` exempts that file from coverage on the tested ground that it "declares interfaces and nothing else", and one exported constant would void the exemption.

**PLAN DECISION 6 (how a lost device surfaces):** through the app's one toast, `LoadCompleteToast`, fed a `StatusBarCompletion` with `severity: "error"`, `actionLabel: "Open Settings"` and no `onDismiss` -- and the chip stays on "stopped", so the fact survives the toast. The app has no `showToast` function; it has one toast COMPONENT whose own doc (`LoadCompleteToast.tsx:15-25`) generalises it -- "a load ends, and this is the line that says how it ended" -- while its PRODUCER is load-scoped (`AppShell.tsx:4314`, `undefined` unless `loadFailure !== null`). So the producer widens and the component does not change. `@mantine/notifications` is NOT added: it is not a dependency anywhere in the app, `compact-mantine` publishes no toast, and adding a notification system to report one event would be a second toast register for a reader to learn. `onDismiss` stays absent for the same reason the failed load's does: `AppShell.tsx:4309-4313` says "An error that erases itself six seconds later is the silent failure again in a nicer font". Precedence when both are present: the LOAD failure wins, because the reader just acted and the acceleration fact is still on the chip; a device lost while a load is failing is the rarer of two rare things and losing its toast costs nothing the chip does not carry.

- [ ] **Step 1: Write the failing test**

Create `graphty/src/components/shell/statusbar/__tests__/accelerationChip.test.ts`:

```ts
import type { Capabilities } from "@graphty/graphty-element";
import { describe, expect, it } from "vitest";

import { accelerationChipModel, GPU_LABEL_PREFIX } from "../accelerationChip";

type Acceleration = Capabilities["acceleration"];

const attached: Acceleration = {
    state: "active",
    backend: "webgpu",
    vendor: "nvidia",
    architecture: "lovelace",
    device: "NVIDIA GeForce RTX 4090",
};

describe("the acceleration chip's words", () => {
    it("draws nothing while the element is still probing, and nothing before it has spoken", () => {
        expect(accelerationChipModel({ ...attached, state: "probing" })).toBeUndefined();
        expect(accelerationChipModel(undefined)).toBeUndefined();
    });

    it("names the adapter when one is attached", () => {
        const model = accelerationChipModel(attached);

        expect(model?.label).toBe(`${GPU_LABEL_PREFIX}: on (nvidia lovelace)`);
        expect(model?.tone).toBe("on");
    });

    it("says the same thing while an attached accelerator is idle, and a different thing in the tooltip", () => {
        const active = accelerationChipModel(attached);
        const idle = accelerationChipModel({ ...attached, state: "idle" });

        expect(idle?.label).toBe(active?.label);
        expect(idle?.tone).toBe("on");
        expect(idle?.title).not.toBe(active?.title);
    });

    it("has no empty parentheses when the adapter did not name itself", () => {
        const model = accelerationChipModel({ state: "active" });

        expect(model?.label).toBe(`${GPU_LABEL_PREFIX}: on`);
    });

    it("prints the element's own reason when nothing could be attached", () => {
        const model = accelerationChipModel({
            state: "unavailable",
            reason: "requires a secure context (https or localhost)",
            code: "E_NO_WEBGPU",
        });

        expect(model?.label).toBe(`${GPU_LABEL_PREFIX}: off`);
        expect(model?.title).toContain("requires a secure context (https or localhost)");
        expect(model?.tone).toBe("off");
    });

    it("distinguishes an accelerator that stopped from one that was never there", () => {
        const stopped = accelerationChipModel({ ...attached, state: "error", code: "E_DEVICE_LOST" });
        const absent = accelerationChipModel({ state: "unavailable", code: "E_NO_ADAPTER" });

        expect(stopped?.label).not.toBe(absent?.label);
        expect(stopped?.tone).toBe("stopped");
    });

    it("says who turned it off when the reader did", () => {
        const model = accelerationChipModel({ state: "off" });

        expect(model?.label).toBe(`${GPU_LABEL_PREFIX}: off`);
        expect(model?.title).toContain("Settings");
        expect(model?.tone).toBe("off");
    });
});
```

Run: `cd AT/graphty && npx vitest run src/components/shell/statusbar/__tests__/accelerationChip.test.ts`
Expected: FAIL -- `Failed to resolve import "../accelerationChip"`.

- [ ] **Step 2: The chip's words**

Create `graphty/src/components/shell/statusbar/accelerationChip.ts`:

```ts
/**
 * The six acceleration states the element publishes, turned into one chip's words.
 *
 * A pure function with its own test, rather than a branch inside a memo, because this is
 * user-visible copy and it is the part of the chip most likely to be got wrong: two of the six
 * states draw nothing, two draw the same label, and the three "not accelerating" states are
 * three different sentences rather than one.
 *
 * It carries a TONE rather than a colour. The drawing maps tone to PANEL_INK; a chip that read
 * its own label looking for ": on" to pick a colour would break the first time the copy changed.
 */

import type { Capabilities } from "@graphty/graphty-element";

/** The element's acceleration capability record, named once so the signatures read. */
type Acceleration = Capabilities["acceleration"];

/** The label's fixed first half. The one home for the words, so a test can quote it. @public */
export const GPU_LABEL_PREFIX = "GPU acceleration";

/** What the chip says, and how it is drawn. @public */
export interface AccelerationChipModel {
    /** e.g. `GPU acceleration: on (nvidia lovelace)`. */
    readonly label: string;
    /** The tooltip: which adapter, or why there is none, in the element's own words where it gave any. */
    readonly title: string;
    /** Which of the three status colours the dot takes. */
    readonly tone: "on" | "off" | "stopped";
}

/**
 * How to name the adapter, without empty parentheses when it did not name itself.
 * @param acceleration - the element's record.
 * @returns ` (vendor arch)`, ` (vendor)`, or an empty string.
 */
function adapterSuffix(acceleration: Acceleration): string {
    const parts = [acceleration.vendor, acceleration.architecture].filter((part) => part !== undefined && part !== "");

    return parts.length === 0 ? "" : ` (${parts.join(" ")})`;
}

/**
 * The chip for one acceleration record, or undefined when there is nothing honest to draw.
 *
 * Undefined in two cases and they are the same case: the element is still probing, or it has not
 * said anything yet. A consumer shows nothing definitive while the answer is pending -- not "on",
 * not "off" -- because the only other reading of an unfinished probe is a failure state, which
 * flickers a false "no GPU" onto every page that then gets one.
 * @param acceleration - the element's record, or undefined before the first report.
 * @returns the chip's words and tone, or undefined to draw no chip at all.
 */
export function accelerationChipModel(acceleration: Acceleration | undefined): AccelerationChipModel | undefined {
    if (acceleration === undefined || acceleration.state === "probing") {
        return undefined;
    }

    const adapter = acceleration.device ?? `${acceleration.vendor ?? ""} ${acceleration.architecture ?? ""}`.trim();

    switch (acceleration.state) {
        case "active":
            return {
                label: `${GPU_LABEL_PREFIX}: on${adapterSuffix(acceleration)}`,
                title: adapter === "" ? "Work is running on the graphics processor." : `${adapter}. Working now.`,
                tone: "on",
            };
        case "idle":
            return {
                label: `${GPU_LABEL_PREFIX}: on${adapterSuffix(acceleration)}`,
                title:
                    adapter === ""
                        ? "A graphics processor is ready. Nothing is running on it."
                        : `${adapter}. Ready, with nothing running on it.`,
                tone: "on",
            };
        case "error":
            return {
                label: `${GPU_LABEL_PREFIX}: stopped`,
                title: acceleration.reason ?? "The graphics processor stopped. Work continues on the processor.",
                tone: "stopped",
            };
        case "off":
            return {
                label: `${GPU_LABEL_PREFIX}: off`,
                title: "Turned off in Settings > Performance.",
                tone: "off",
            };
        default:
            return {
                label: `${GPU_LABEL_PREFIX}: off`,
                title: acceleration.reason ?? "No graphics processor is available for this graph.",
                tone: "off",
            };
    }
}
```

The `default` arm is `"unavailable"`, and it is written as `default` rather than as a case so that a seventh state added by the element lands on the honest answer -- no acceleration, with whatever reason the element gave -- instead of falling through to `undefined` and silently removing the chip.

Run: `cd AT/graphty && npx vitest run src/components/shell/statusbar/__tests__/accelerationChip.test.ts && npx eslint src/components/shell/statusbar/accelerationChip.ts && npx prettier --check src/components/shell/statusbar/accelerationChip.ts`
Expected: 7 tests pass; eslint and prettier exit 0.

- [ ] **Step 3: The forwarder**

`GraphtyProps` (`Graphty.tsx:133-148`) gains one member, and the file's own detail interfaces are NOT extended with a hand-written capability shape -- the element's `Capabilities` is imported and used as it is:

```ts
    /** Called when the element reports a change in what this machine can do. */
    onCapabilitiesChange?: (capabilities: Capabilities) => void;
```

with `import type { Capabilities } from "@graphty/graphty-element";` at the top, `onCapabilitiesChange` destructured at `:291`, and an effect beside the other two forwarders:

```ts
    // Forward the element's capability reports, which is how the shell learns whether this
    // machine is accelerating. The element owns the answer; this is the wire it travels on.
    useEffect(() => {
        const element = graphtyRef.current;

        if (!element || !onCapabilitiesChange) {
            return undefined;
        }

        const handleCapabilitiesChanged = (event: Event): void => {
            const customEvent = event as CustomEvent<{ capabilities: Capabilities }>;

            onCapabilitiesChange(customEvent.detail.capabilities);
        };

        element.addEventListener("graphty-capabilities-change", handleCapabilitiesChanged);

        return () => {
            element.removeEventListener("graphty-capabilities-change", handleCapabilitiesChanged);
        };
    }, [onCapabilitiesChange]);
```

The `as CustomEvent<...>` is the same line the two forwarders beside it already write, and it is the one thing in this task that should get shorter later rather than staying: once the element's `GraphtyEventMap` augmentation ships, `addEventListener` types the handler on its own and all three casts go together. Adding it here now, in the shape the file already uses, is not a new workaround -- writing a private `CapabilitiesChangedDetail` interface beside `StylesChangedDetail` would be, because it would be a second declaration of a shape the element owns.

`CanvasGraphConfig` (`CanvasRegion.tsx:83-101`) gains the matching optional member and `:434-446` passes it as `onCapabilitiesChange={graph?.onCapabilitiesChange}`, beside the two it already passes at `:444-445`.

Then one case in `graphty/src/components/Graphty.test.tsx`, which the app's own environment can run today:

```tsx
    it("hands on the element's capability reports", () => {
        const onCapabilitiesChange = vi.fn();
        const { container } = render(<Graphty layers={[]} onCapabilitiesChange={onCapabilitiesChange} />);
        const element = container.querySelector<HTMLElement>("graphty-element");

        element?.dispatchEvent(
            new CustomEvent("graphty-capabilities-change", {
                detail: { capabilities: { acceleration: { state: "off" } } },
            }),
        );

        expect(onCapabilitiesChange).toHaveBeenCalledWith(expect.objectContaining({ acceleration: { state: "off" } }));
    });
```

This works with no element registered: an unrecognised tag is still an `HTMLElement` and a working event target, which is why it is the one part of this task the app can prove on its own. Match the file's existing render call and `describe` placement rather than the sketch above if they differ.

Run: `cd AT/graphty && npx vitest run src/components/Graphty.test.tsx && npx tsc --noEmit`
Expected: the existing cases plus this one pass; `tsc` is clean.

- [ ] **Step 4: The model**

In `graphty/src/components/shell/statusbar/statusBarModel.ts`, add the two interfaces (type-only, as the module's exemption requires) and widen the slots model. The import line at `:15` gains `StatusBarIssues`:

```ts
/**
 * Slot 7d: whether this machine is accelerating, and which adapter.
 *
 * The same three members as {@link StatusBarPerformanceMode} because it is the same KIND of
 * fact -- a machine-level mode the reader can change in Settings > Performance -- plus the tone,
 * which comes from the element's state and decides the dot's colour. The bar has one chip
 * register, not one per subject.
 */
export interface StatusBarAccelerationMode {
    /** e.g. `GPU acceleration: on (nvidia lovelace)` or `GPU acceleration: off`. */
    readonly label: string;
    /** The adapter's own description, or why there is none. */
    readonly title: string;
    /** Which of the three status colours the dot takes. */
    readonly tone: "on" | "off" | "stopped";
    /** Opens Settings > Performance, the same door the Performance mode chip opens. */
    readonly onClick: () => void;
}

/**
 * Slot 7, widened with the acceleration chip. It draws last of the four, so the two chips a
 * DATASET produced (validation, notes) come before the two a MACHINE produced.
 */
export interface StatusBarIssuesModel extends StatusBarIssues {
    /** The acceleration chip. */
    readonly acceleration?: StatusBarAccelerationMode;
}
```

and `StatusBarSlotsModel` gains a third override:

```ts
    /** Slot 7. */
    readonly issues?: StatusBarIssuesModel;
```

Run: `cd AT/graphty && npx tsc --noEmit && grep -nE '^(export )?(function|const|let|class)' src/components/shell/statusbar/statusBarModel.ts; echo "rc=$?"`
Expected: the type-check is clean, and the grep prints nothing with `rc=1` -- which is the condition `vitest.config.ts:53-59` states for the coverage exemption. If the grep prints a line, the exemption is void and the file needs a test.

- [ ] **Step 5: The drawing and the emptiness check**

Add to `graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx`:

```tsx
describe("the acceleration chip", () => {
    const acceleration = {
        label: "GPU acceleration: on (nvidia lovelace)",
        title: "NVIDIA GeForce RTX 4090. Working now.",
        tone: "on" as const,
        onClick: vi.fn(),
    };

    it("draws in the issues slot on its own, with its label and its tooltip", () => {
        const { container } = renderBar({ slots: { counts, issues: { acceleration } } });

        expect(screen.getByText(acceleration.label)).toBeInTheDocument();
        expect(screen.getByTitle(acceleration.title)).toBeInTheDocument();
        expect(slotOrder(getBar(container))).toContain("issues");
    });

    it("opens Settings when clicked", () => {
        renderBar({ slots: { counts, issues: { acceleration } } });
        fireEvent.click(screen.getByText(acceleration.label));

        expect(acceleration.onClick).toHaveBeenCalledTimes(1);
    });

    it("draws nothing when the issues slot is empty", () => {
        const { container } = renderBar({ slots: { counts, issues: {} } });

        expect(slotOrder(getBar(container))).not.toContain("issues");
    });
});
```

All three go through the file's own `renderBar` helper (`StatusBar.test.tsx:43-55`) rather than calling `render` directly, so they inherit the `WIDE_SHELL` (1440 px) host every other case in the file gets. The helper exists because the overflow rule is measured: on a narrow viewport the bar correctly DROPS slots. The acceleration chip happens to survive that anyway -- `issues` is one of the three ids in `STATUS_BAR_NEVER_DROP` (`constants.ts:795`, beside `counts` and `running`) -- but a board that depends on an invariant it never names breaks silently when the invariant moves, so it takes the host like everything else and the invariant is written down here.

Then `StatusBar.tsx`'s `visibleIssues` (`:109-121`) becomes:

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
        issues.acceleration === undefined
    ) {
        return undefined;
    }

    return {
        validation: issues.validation,
        notes,
        performance: issues.performance,
        acceleration: issues.acceleration,
    };
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

Editing only line 31 and leaving line 27 alone gives `TS2305: Module '"../types"' has no exported member 'StatusBarIssuesModel'` if you move the name, or an eslint error if you add the new name and keep the old one: after this edit nothing in `StatusBar.tsx` names `StatusBarIssues`, and `@typescript-eslint/no-unused-vars` is an error (`eslint.config.js:134-140`).

In `graphty/src/components/shell/statusbar/StatusBarSlots.tsx`, `StatusBarIssuesSlot` (`:319`) takes the model and draws the fourth chip last:

```tsx
export function StatusBarIssuesSlot({ issues }: { issues: StatusBarIssuesModel }): React.JSX.Element {
    const { validation, notes, performance, acceleration } = issues;
```

with a tone table beside the module's other colour maps (`:48-50`):

```tsx
/** The acceleration chip's dot: attached, absent, or stopped after being attached. */
const ACCELERATION_DOT: Record<StatusBarAccelerationMode["tone"], string> = {
    off: PANEL_INK.CHROME,
    on: PANEL_INK.SUCCESS,
    stopped: PANEL_INK.WARNING,
};
```

and, after the `performance` chip's block (`:341-345`):

```tsx
            {acceleration === undefined ? null : (
                <StatusBarChip
                    leading={
                        <StatusDot
                            color={ACCELERATION_DOT[acceleration.tone]}
                            size={STATUS_BAR_GEOMETRY.AI_DOT}
                        />
                    }
                    onClick={acceleration.onClick}
                    title={acceleration.title}
                >
                    {acceleration.label}
                </StatusBarChip>
            )}
```

with `StatusBarAccelerationMode` and `StatusBarIssuesModel` added to the `./statusBarModel` type import at `:29` and `StatusBarIssues` REMOVED from the `../types` import at `:17-25` -- not "if nothing else uses it": nothing else does, and leaving it is an eslint error. The dot reuses `StatusDot` (`:74-80`) and `STATUS_BAR_GEOMETRY.AI_DOT` (6 px, `statusBarGeometry.ts:85`) rather than a new glyph: the AI slot already draws a state dot at that size, and a second bolt beside the Performance bolt would read as two warnings.

Run: `cd AT/graphty && npx vitest run src/components/shell/statusbar && npx eslint src/components/shell/statusbar && npx tsc --noEmit`
Expected: `StatusBar.test.tsx` passes with three more cases than master's 46, and eslint and tsc exit 0. Do NOT add a prettier check here: `StatusBarSlots.tsx` is already not prettier-clean on master, and `graphty:lint` is `eslint && tsc --noEmit`, which does not run prettier. If `draws nothing when the issues slot is empty` fails, the emptiness check lost a member.

- [ ] **Step 6: The shell wires it up**

This step both introduces the capability state and consumes it, so the value is never live in a tree with no reader.

First, beside the other shell state:

```ts
    /* What the element says this machine can do. The app holds it, renders it, and decides
       nothing about it: probing, attaching, thresholds and device loss are all the element's,
       and this is the record it publishes when any of them changes. */
    const [acceleration, setAcceleration] = useState<Capabilities["acceleration"] | undefined>(undefined);
    const handleCapabilitiesChange = useCallback((capabilities: Capabilities) => {
        setAcceleration(capabilities.acceleration);
    }, []);
```

with `import type { Capabilities } from "@graphty/graphty-element";`, `accelerationChipModel` from `./statusbar/accelerationChip`, and `StatusBarIssuesModel` added to the existing type import at `:211`. The canvas graph config (`:4691-4697`) gains `onCapabilitiesChange: handleCapabilitiesChange,`.

Then the producer. It goes IMMEDIATELY ABOVE the slots memo (`:4253`), not inside it:

```ts
    /* The issues slot's FIRST producer in this app. Acceleration is a machine-level mode, so it
       belongs beside the Performance mode chip and opens the same door.
       Its own memo, above the slots memo, for one reason: the slots memo opens with
       `if (!dataLoaded) { return {}; }`, and whether this machine is accelerating has nothing to
       do with whether a dataset is drawn. A reader who opens Settings > Performance to change the
       preference is usually in the Welcome state, which is exactly the state that guard hides. */
    const accelerationIssues = useMemo<StatusBarIssuesModel | undefined>(() => {
        const chip = accelerationChipModel(acceleration);

        if (chip === undefined) {
            return undefined;
        }

        return {
            acceleration: {
                label: chip.label,
                title: chip.title,
                tone: chip.tone,
                onClick: () => {
                    setSettingsSection("performance");
                    setSettingsOpen(true);
                },
            },
        };
    }, [acceleration]);
```

`setSettingsSection` and `setSettingsOpen` are `useState` setters (`AppShell.tsx:1172,1179`), so they are stable and are not dependencies. Its own `useMemo` and not an inline object: an object literal built during render is a new reference every render and would invalidate the slots memo on every render.

Then the slots memo (`:4253-4283`) uses it in BOTH of its exits. The early return:

```ts
    const slots = useMemo<StatusBarSlotsModel>(() => {
        if (!dataLoaded) {
            return accelerationIssues === undefined ? {} : { issues: accelerationIssues };
        }
```

and the main return gains, after `layout: { ... },`:

```ts
            issues: accelerationIssues,
```

with `accelerationIssues` added to the memo's dependency array.

What this decides, recorded because the G12 record's findings section asks for it: the acceleration chip appears as soon as the element answers, WITH OR WITHOUT a dataset, and it is then the only slot in the bar in the Welcome state. Every other slot stays dataset-scoped. The alternative -- leaving the member inside the guard, so the chip appears only once a graph is drawn -- was rejected because it makes a machine fact look like a property of the data, and hides it in the one state a reader goes looking for it.

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
           acted, and the acceleration fact is still on the chip, which does not erase itself. No
           `onDismiss`, for the reason the failed load has none. */
        if (acceleration?.state !== "error") {
            return undefined;
        }

        return {
            message: acceleration.reason ?? "The graphics processor stopped. Work continues on the processor.",
            severity: "error",
            actionLabel: OPEN_SETTINGS_ACTION,
            onDetails: () => {
                setSettingsSection("performance");
                setSettingsOpen(true);
            },
        };
    }, [acceleration, loadFailure, openPanelAt]);
```

with one new constant beside `OPEN_DATA_ACTION`:

```ts
/** The device-lost toast's link: it says where it goes, because there is no mapping line to scroll to. */
const OPEN_SETTINGS_ACTION = "Open Settings";
```

Finally, one case in `graphty/src/components/shell/__tests__/AppShell.test.tsx`, which pins the branch the shell's own environment can produce:

```tsx
describe("the acceleration chip", () => {
    it("draws no chip before the element has reported anything, with no dataset loaded", async () => {
        const { container } = await renderMeasuredShell();

        expect(container.querySelector("[data-status-spacer]")).not.toBeNull();
        expect(screen.queryByText(/^GPU acceleration/)).toBeNull();
    });
});
```

What this case can and cannot prove, stated so nobody reads more into it than it holds. It proves the hoisted early return still renders a bar and does NOT draw a chip while the element has said nothing -- it fails if the producer starts emitting a chip from an absent record. It CANNOT prove the positive: `<graphty-element>` is not registered in the app's vitest environment, so nothing ever dispatches `graphty-capabilities-change` and the state stays undefined for the whole test. The positive is covered four ways: `accelerationChipModel`'s seven cases (the words for every state), `StatusBar.test.tsx`'s three (the bar draws the chip when the model carries one), `Graphty.test.tsx`'s one (the event reaches the callback), and M7-T9's pass on the real GPU.

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/components/shell src/components/Graphty.test.tsx`
Expected: all green. If the AppShell test that asserts the status bar's slot order fails, the `issues` slot is now drawn where it never was before -- check the expectation against `STATUS_BAR_SLOT_ORDER` (`constants.ts:772-782`) and fix the EXPECTATION, not the order.

- [ ] **Step 7: Checkpoint** -- the whole app suite (`npx vitest run`) and the whole-package `npx eslint` are green; `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the edited files prints nothing. No commit by this task.

### Task M7-T7: the `metricCost` accelerator constant

**Repository:** `AT`.

**Files:**
- Modify: `graphty/src/components/shell/analysis/metricCost.ts` (the constant, the input flag, the divisor, and the optional speedup-table parameter on both entry points)
- Modify: `graphty/src/components/shell/analysis/__tests__/metricCost.test.ts` (the constant's four pins plus the non-unit-table forwarding case)
- Modify: `graphty/src/components/shell/AppShell.tsx:2750-2753, 2764-2786, 2847-2851` (the three call sites pass the flag)
- NOT touched: `graphty/src/components/shell/insights/insightsRules.ts` (it reads `estimateSeconds[capability]`, which now carries the flag's effect automatically), `graphty/src/components/shell/panel/AnalyzePanel.tsx`

**Interfaces:**
- Consumes: the `acceleration` state M7-T6 Step 6 added to the shell.
- Produces: `ACCELERATED_SPEEDUP_BY_METRIC`; `MetricCostInput.accelerated`; `estimateMetricSeconds(input, speedups?)` and `estimateSecondsByMetric({ nodeCount, edgeCount, accelerated? }, speedups?)`, both with the real table as the default second argument.

**PLAN DECISION 8 (what the per-metric accelerator constant is worth today):** the constant is a per-metric DIVISOR, `ACCELERATED_SPEEDUP_BY_METRIC`, and every entry is 1 at Phase M7. That is not a placeholder; it is the measured state of the code. `createAccelerator` returns an object carrying `forceAtlas2`, `release` and `dispose` and nothing else (`webgpu-graph-algorithms/src/accelerator.ts:87-117`), and its header is explicit that a method the GPU does not implement "must not exist here -- never a throwing stub", because the CPU dispatchers test `acc.pageRank !== undefined`. So no node metric has a GPU path at M7, and a factor above 1 would be this module claiming a speed the code cannot deliver -- the exact failure its own doc forbids at `metricCost.ts:126` ("do not add an exponent to hide it") and the exact failure its "sampled version" paragraph (`:29-44`) exists to prevent. The seam lands now, at value 1, so that Phase M8b changes one number per metric instead of threading a flag through five call sites under time pressure. `degree` will stay 1 whatever P7 ships: the shell reads the degree numbers the import-time pass already wrote and re-runs nothing.

The flag the app supplies is "an accelerator is attached and usable", which is the element's `"active"` OR `"idle"`, and reading it that way is the point of the state being a union rather than a boolean: `"idle"` means attached with nothing running on it this instant, so a cost estimate that treated it as "no accelerator" would quote a CPU price for a run that is about to go to the GPU. The per-metric half stays in the constant, because the element publishes no per-metric answer and inventing one in the app would be exactly the kind of guess this module's doc forbids.

One pointer for whoever arrives later: the element API's own cost surface -- `session.estimate()`, synchronous, plus `catalog.metrics()` carrying `costClass` and `estimateSeconds` -- retires this whole module, `ACCELERATED_SPEEDUP_BY_METRIC` included. See `design/element-api/element-api-design.md` section 7. Until it ships, the app owns the estimate and this task is how the estimate learns about acceleration.

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
    /* The flag `metricCost` takes. "An accelerator is attached and usable" is BOTH of the
       element's working states: `active` means something is on it right now and `idle` means it
       is ready with nothing on it, and a graph below the element's acceleration.minNodes sits in
       the second one. Quoting a processor price there would be quoting for the wrong machine.
       It is not "this metric runs on the GPU": the element publishes no per-metric answer, and
       the per-metric half is ACCELERATED_SPEEDUP_BY_METRIC, which is 1 for every metric until
       the GPU has a path. */
    const accelerated = acceleration?.state === "active" || acceleration?.state === "idle";
```

then `:2751` becomes

```ts
        () => estimateSecondsByMetric({ nodeCount: graphShape.nodeCount, edgeCount: graphShape.edgeCount, accelerated }),
```

`:2770` and `:2847` each gain `accelerated,` in the object handed to `estimateMetricCost`, and `accelerated` joins all three dependency arrays (`:2752`, `:2786`, and the `runNodeMetricCard` callback's).

Run: `cd AT/graphty && npx tsc --noEmit && npx eslint && npx vitest run src/components/shell`
Expected: green. Today the numbers are identical with the flag true or false (every factor is 1), so no existing expectation moves; that is the point of landing the seam at 1.

- [ ] **Step 4: Checkpoint** -- no commit by this task.

### Task M7-T8: the acceleration story and the Chromatic leftover

**Repository:** `AT`.

**Files:**
- Create: `graphty/src/stories/Acceleration.stories.tsx` (`Components/Acceleration`, `tags: ["gpu"]`, one story)
- Modify: `graphty/chromatic.config.json` (`onlyChanged` false)
- NOT touched: `graphty/src/stories/Graphty.stories.tsx` (its inline element mock stays where it is: this story draws no element, so there is no second registrar and nothing to extract), `graphty/.storybook/preview.tsx` (the two colour modes stay; see the cost note), `graphty/.storybook/main.ts`, `.github/workflows/ci.yml` (TurboSnap is already off there and `exitZeroOnChanges` already false -- this plan asks for no CI change here)

**Interfaces:**
- Consumes: `accelerationChipModel` and `GPU_LABEL_PREFIX` from M7-T6; `StatusBarChip`; the element's `Capabilities` type.
- Produces: the story `Components/Acceleration/States`.

**PLAN DECISION 7 (how an acceleration story is deterministic on a runner with no GPU):** by drawing the chip from FIXED capability records rather than from a live element. The chip's entire input is one small serialisable record the element publishes, so a story can hand it every state in turn -- including two no machine produces on demand, a device that was lost and an adapter that was refused -- and get the same pixels everywhere. No `isChromatic()`, no environment sniffing, no second code path, and no story that quietly renders one state on the cloud renderer and another on the dev box. The real element on a real GPU is checked in M7-T9 for the app and in M6-T20's gate for the layout; a picture of a chip is not the place for it.

One story, not two: the six states in one frame ARE the register, and a second story would be a second snapshot of a subset of the same picture. Cost, stated because it is real: `preview.tsx:113-120` captures every story in a light and a dark mode, so this is two snapshots per build. The `gpu` tag stays, because the integration plan's M7 cell asks for one and because it is the handle for "show me the acceleration surfaces"; what it means has changed -- it marks a story ABOUT acceleration, not one that needs a GPU, and no story in this app needs one.

- [ ] **Step 1: The story**

Create `graphty/src/stories/Acceleration.stories.tsx`:

```tsx
import type { Capabilities } from "@graphty/graphty-element";
import type { Meta, StoryObj } from "@storybook/react";

import { accelerationChipModel } from "../components/shell/statusbar/accelerationChip";
import { StatusBarChip } from "../components/shell/statusbar/StatusBarChip";

type Acceleration = Capabilities["acceleration"];

/** One row per state the element can report, in the order a page moves through them. */
const STATES: readonly { readonly caption: string; readonly acceleration: Acceleration }[] = [
    { caption: "probing", acceleration: { state: "probing" } },
    {
        caption: "active",
        acceleration: {
            state: "active",
            backend: "webgpu",
            vendor: "nvidia",
            architecture: "lovelace",
            device: "NVIDIA GeForce RTX 4090",
        },
    },
    {
        caption: "idle",
        acceleration: {
            state: "idle",
            backend: "webgpu",
            vendor: "nvidia",
            architecture: "lovelace",
            device: "NVIDIA GeForce RTX 4090",
        },
    },
    {
        caption: "unavailable",
        acceleration: {
            state: "unavailable",
            reason: "requires a secure context (https or localhost)",
            code: "E_NO_WEBGPU",
        },
    },
    {
        caption: "error",
        acceleration: {
            state: "error",
            code: "E_DEVICE_LOST",
            reason: "The graphics processor stopped. Work continues on the processor.",
        },
    },
    { caption: "off", acceleration: { state: "off" } },
];

function AccelerationStates(): React.JSX.Element {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: 12, alignItems: "center", padding: 16 }}>
            {STATES.map(({ caption, acceleration }) => {
                const chip = accelerationChipModel(acceleration);

                return (
                    <React.Fragment key={caption}>
                        <code style={{ fontSize: 11, opacity: 0.8 }}>{caption}</code>
                        {chip === undefined ? (
                            <span style={{ fontSize: 11, opacity: 0.6 }}>no chip</span>
                        ) : (
                            <StatusBarChip title={chip.title}>{chip.label}</StatusBarChip>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

const meta: Meta<typeof AccelerationStates> = {
    title: "Components/Acceleration",
    component: AccelerationStates,
    tags: ["gpu"],
    parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every state the element can report, drawn from fixed records rather than from a live element.
 * Two of the six draw no chip -- `probing`, and the moment before the element has said anything
 * -- and that is the state this picture exists to pin: a chip that guessed "off" while a probe
 * was still running would show a fault the reader never had.
 */
export const States: Story = {};
```

Add `import React from "react";` if the file's `React.Fragment` and `React.JSX.Element` need it under this repository's JSX transform; `npx tsc --noEmit` says which.

Run: `cd AT/graphty && npx tsc --noEmit && npx prettier --check "src/stories/**" && pnpm exec nx run graphty:build-storybook`
Expected: tsc and prettier clean; the Storybook build succeeds and `graphty/storybook-static/index.json` contains `components-acceleration--states`. Check with `python3 -c "import json;d=json.load(open('storybook-static/index.json'));print([k for k in d['entries'] if k.startswith('components-acceleration')])"`. NOT eslint: `eslint.config.js:40` ignores `**/stories/**`, so a green run there proves nothing; `tsc` does check them, because `graphty/tsconfig.json`'s `include` is `["src", ".storybook"]`.

- [x] **Step 2: The Chromatic leftover** -- ALREADY DONE, and done differently: `graphty/chromatic.config.json` was DELETED rather than edited, so do not recreate it. Every behavioural setting is gone from the per-package Chromatic configs (the app's, algorithms' and layout's files deleted; graphty-element's reduced to its project id), and the app's `chromatic`, `test:visual` and `test:visual:debug` scripts now call `tools/chromatic.sh graphty`, which runs the CLI from the repository root exactly as CI does. With no config file in the directory the CLI runs in, a local run and a CI run cannot disagree -- which is the whole point the paragraph below was making. Skip to Step 3.

The original step, kept for its reasoning: `graphty/chromatic.config.json` becomes:

```json
{
    "onlyChanged": false,
    "zip": true
}
```

Reason, and the limit of the change: CI already has TurboSnap off and `exitZeroOnChanges: false` (`ci.yml:625-660`), with a comment naming the cause -- "TurboSnap (onlyChanged) disabled - Vite doesn't generate preview-stats.json". The CI action does not read this file (it runs at repo root with `storybookBuildDir: ./graphty/storybook-static`), so this flag only affects a LOCAL `npm run test:visual`. Leaving it `true` tells a reader TurboSnap is on when the thing that actually runs has it off, and a local run would skip the acceleration story whenever its own file had not changed. Nothing else about Chromatic changes: this plan asks for NO edit to `ci.yml`'s `chromatic-app` job, because both conditions the integration plan's M7 cell names are already met there.

Run: `cd AT && test ! -e graphty/chromatic.config.json && grep -n chromatic graphty/package.json`
Expected: no config file, and the three Chromatic scripts all reading `../tools/chromatic.sh graphty`.

- [ ] **Step 3: Checkpoint** -- `pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1` and `pnpm exec nx run graphty:build-storybook` both green; `grep -c disableSnapshot src/stories/Acceleration.stories.tsx` returns 0 (this task adds no such parameter); no commit by this task.

### Task M7-T9: the G12 gate -- the app on a real GPU, the no-logic check, the record

**Repository:** `AT`.

**Files:**
- Create: `webgpu-graph-algorithms/docs/decisions/G12.md` (the gate record)
- Create: `tmp/m7-app-auto.png`, `tmp/m7-app-never.png`, `tmp/m7-app-reloaded.png` (the visual evidence; `tmp/` is gitignored, so none of it ships)
- NOT touched: `graphty-element/**` (the `acceleration.minNodes` default and the real-GPU layout checks belong to M6-T20's gate), `design/webgpu/webgpu-acceleration-plan.md` (a plan of record), `graphty/src/**` (this task writes no code)

**Interfaces:**
- Consumes: `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` from M7-T1; M6-T20's gate record, for the measured `acceleration.minNodes` and the layout's real-GPU checks, which this record CITES and does not repeat.
- Produces: `webgpu-graph-algorithms/docs/decisions/G12.md`, the phase's gate record. It lives beside `G0.md`..`G3.md` because the integration plan puts every gate record under `webgpu-graph-algorithms/docs/decisions/`.

**PLAN DECISION 9 (what the app's half of G12 can and cannot check):** the app cannot check that an accelerated layout is correct, or fast, or that it settles, drags and pins -- it has no instrument the element does not have, and M6-T20 has one that reaches a real GPU with no app in the way. Putting those checks here would mean building a second instrument to answer a question the element already answers, which is the definition of app-side graph work. What ONLY the app can check is that its own surfaces tell the truth on a machine that has a GPU: the chip names a real adapter, the control changes what the element does, the reader's choice survives a reload, and the app contains no acceleration logic to be wrong about. Those four, plus the CI and lane clauses, are this record.

- [ ] **Step 1: The app on the real GPU**

This is the half of G12 no test can do, and the artifact is the APP -- not a harness, not a story. The app's own dev server is the only surface in this repository that draws the real element, on a real GPU, with the chip and the Settings control beside it.

WebGPU needs a SECURE CONTEXT, so this runs over HTTPS and never over `http://`: `graphty/vite.config.ts:79-84` reads `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` from the monorepo root `.env` (`/home/apowers/ssl/atoms.key` and `/home/apowers/ssl/atoms.crt`), and `.env` sets `HOST=dev.ato.ms` and `PORT=9005`. Confirm both files exist before starting (`ls -l /home/apowers/ssl/atoms.crt /home/apowers/ssl/atoms.key`); on plain http the element finds no adapter, the chip correctly reads off, and every observation below would be a measurement of the wrong thing.

Run `cd AT/graphty && npm run dev`, then drive a browser on the dev box with the Playwright MCP:

1. Open `https://dev.ato.ms:9005`, load a sample dataset, and wait for the graph to draw. Screenshot as `tmp/m7-app-auto.png`. The preference is `Automatic` on a first visit.
2. Open Settings > Performance, set "Use the GPU" to `Never`, close Settings. Screenshot as `tmp/m7-app-never.png`.
3. Reload the page and load the same sample. Screenshot as `tmp/m7-app-reloaded.png`. Then set the control back to `Automatic`.

Then ask the Nanobanana MCP these questions and record the answers VERBATIM in the record. They are yes/no and objective, and they come in pairs on purpose: the tool agrees with what it is asked, so each state is asked about twice, once in each direction, and a pair that answers yes to both has told you nothing -- read that screenshot yourself and record that you had to.

| # | Image | Question | Expected |
| --- | --- | --- | --- |
| 1 | `m7-app-auto.png` | "Does this image contain the text 'GPU acceleration: on'?" | yes |
| 2 | `m7-app-auto.png` | "Does this image contain the text 'GPU acceleration: off'?" | no |
| 3 | `m7-app-auto.png` | "Are the graph's nodes distributed across the frame rather than clustered in one corner?" | yes |
| 4 | `m7-app-never.png` | "Does this image contain the text 'GPU acceleration: off'?" | yes |
| 5 | `m7-app-never.png` | "Does this image contain the text 'GPU acceleration: on'?" | no |
| 6 | `m7-app-reloaded.png` | "Does this image contain the text 'GPU acceleration: off'?" | yes |

Question 6 is the one the app owns outright: the element remembers nothing across a reload, so a reloaded page that still says off proves the app's own storage and its attribute write both work. If question 1 answers no on a machine whose browser has a hardware adapter, STOP: either the activation import is missing (M7-T2 Step 2), the element found no adapter and is saying so in the chip's tooltip -- read it -- or the page is not on HTTPS.

- [ ] **Step 2: The no-logic check**

The ownership move is the whole point of this phase, and it is checkable in four greps. Run them from `AT`:

```bash
grep -rn "navigator.gpu\|requestAdapter\|GPUDevice\|probeBrowserWebGpu\|requestGpuContext\|createAccelerator\|setAccelerator" graphty/src   # no output
grep -rn "@graphty/webgpu-graph-algorithms" graphty/src                                                                                      # no output
grep -rn "@graphty/webgpu-graph-algorithms" graphty/package.json                                                                             # exactly one line, in dependencies
grep -rn "graphty-element/webgpu" graphty/src                                                                                                # exactly one line, in src/main.tsx
ls graphty/src/gpu                                                                                                                           # gpuPrefs.ts and __tests__, nothing else
```

Expected: as commented. Any hit in the first two is acceleration logic that crept back into the app, and the fix is in the element, not here. More than one hit in the fourth means the activation import was copied somewhere -- a second one is harmless at runtime and is a second place to delete later, so there is one.

- [ ] **Step 3: Write the G12 record**

Create `webgpu-graph-algorithms/docs/decisions/G12.md` with this content; every `<...>` is a number or a string copied from a named command's output, and the owner signs the last section.

````markdown
# G12 -- the app's acceleration surfaces (spec 13 row P12, W2 subset)

Recorded by: Task M7-T9, <date>. Commits: the <n> of this phase's PR (<short hashes once committed>).
Environment: <the dev box's browser and adapter, from the chip's tooltip in tmp/m7-app-auto.png>; the app's
tests ran on Playwright Chromium 1.57.0 through `vitest` 3.2.7. Every command ran from `graphty/` unless it
names another directory.

The gate is `design/webgpu/webgpu-acceleration-plan.md:4219` as restated for the app at
`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3260`, with its middle clause replaced by
`design/decisions/2026-09-19-g12-without-the-nightly-clause.md`: the GPU lane green on the master commits of
this phase, NOT a nightly week. There is no nightly lane.

## 1. The checklist

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | the app's stories green | `pnpm exec nx run graphty:build-storybook`; the `chromatic-app` job of run <id> | <n> stories, <n> snapshots | pass / fail |
| 2 | the acceleration story draws all six states, identically on every machine | the `Components/Acceleration/States` snapshot in build <id> | six rows, two of them "no chip" | pass / fail |
| 3 | on a machine with a hardware adapter, the app's chip names it | `tmp/m7-app-auto.png`; Nanobanana Q1 and Q2 | <answer>, <answer> | pass / fail |
| 4 | the graph draws while accelerated | `tmp/m7-app-auto.png`; Nanobanana Q3 | <answer> | pass / fail |
| 5 | the Settings control turns it off | `tmp/m7-app-never.png`; Nanobanana Q4 and Q5 | <answer>, <answer> | pass / fail |
| 6 | the reader's choice survives a reload, which only the app can do | `tmp/m7-app-reloaded.png`; Nanobanana Q6 | <answer> | pass / fail |
| 7 | the app contains no acceleration logic | the five greps of Task M7-T9 Step 2 | <what each printed> | pass / fail |
| 8 | the app imports the GPU package nowhere, and activates it in one line | `grep -rn "@graphty/webgpu-graph-algorithms" graphty/src` (nothing); `grep -rn "graphty-element/webgpu" graphty/src` (one line) | | pass / fail |
| 9 | the GPU lane green on this phase's master commits | `gh run list --workflow GPU` | run <id>, <conclusion> | pass / fail |
| 10a | the 20 CI shards still find nine build artifacts on a graphty-affected PR | this phase's PR, run <id> | <n>/20 green | pass / fail |
| 10b | ...and on a PR that makes graphty NOT affected, which 10a cannot exercise | the scratch PR of M7-T2 Step 5, touching only `graph-io/README.md`, run <id> | nine non-empty artifacts, <n>/20 green | pass / fail |

## 2. What the app shows for a device it cannot use

Filled in from what was observed, not from what was expected. Every cell is a chip label and, where the
chip has one, the tooltip the element supplied.

| Preference | no adapter on this machine | hardware adapter |
| --- | --- | --- |
| `off` | <label> / <tooltip> | <label> / <tooltip> |
| `auto` | <label> / <tooltip> | <label> / <tooltip> |
| `required` | <label> / <tooltip> | <label> / <tooltip> |

## 3. What this record does NOT claim

Three things that belong to the element and are recorded in M6-T20's gate, cited here so nobody
looks for them in the wrong file:

- the measured `acceleration.minNodes` default;
- that an accelerated layout settles, drags and pins on a real GPU;
- that the accelerated and processor layouts are statistically the same.

The app has no instrument for any of them that the element does not have more directly, and building
one here would be app-side graph work.

## 4. Findings, owner decisions

Decisions this phase took that a reader of the shipped app can see:

- the acceleration chip appears as soon as the element reports, WITH OR WITHOUT a dataset loaded. It is
  therefore the only slot in the status bar in the Welcome state. Every other slot stays dataset-scoped.
  Whether this machine is accelerating is not a property of the data, and the Welcome state is where a
  reader goes to change the preference.
- `"active"` and `"idle"` draw the same chip label and differ only in the tooltip. An idle accelerator is
  a working accelerator with nothing on it this instant, and a chip that flickered between two labels as
  work started and stopped would be unreadable.
- the reader's preference is the APP's storage, not the element's. The element persists nothing on a
  reader's behalf, and an exported settings document that demanded a GPU would break on the next machine.
- `ACCELERATED_SPEEDUP_BY_METRIC` is 1 for every metric. The cost gate therefore prints the same number
  with an accelerator attached and without one, which is correct today: no node metric has a GPU path
  (`webgpu-graph-algorithms/src/accelerator.ts:87-117`).

Signed off: <owner>, <date>.
````

Run: `cd AT && LC_ALL=C grep -nP '[^\x00-\x7F]' webgpu-graph-algorithms/docs/decisions/G12.md; echo "rc=$?"`
Expected: no output, `rc=1`.

- [ ] **Step 4: The whole gate, one run**

Run:

```bash
cd AT
pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1   # green
pnpm exec nx run graphty:coverage                                     # the app's suite in headless Chromium
pnpm exec nx run graphty:build-storybook                              # the Storybook the Chromatic job consumes
pnpm run lint:knip                                                    # green: the installed-not-imported peer is named in knip.config.ts
LC_ALL=C grep -rnP '[^\x00-\x7F]' graphty/src/gpu graphty/src/components/shell/statusbar/accelerationChip.ts graphty/src/stories/Acceleration.stories.tsx webgpu-graph-algorithms/docs/decisions/G12.md design/decisions/2026-09-19-g12-without-the-nightly-clause.md   # no output
HUSKY=0 pnpm install --frozen-lockfile                                # exit 0: the lockfile matches the manifests
./tools/prepush.sh                                                    # exit 0; 15-25 minutes
```

Expected: as commented. If `pnpm install --frozen-lockfile` fails, the lockfile was not committed with `graphty/package.json` -- both belong in M7-T2's commit.

- [ ] **Step 5: Commit (owner)** -- five commits through `tools/commit-changes.sh`, in this order, after the two of M7-T1 and the two of M7-T2: `feat(graphty): remember the reader's acceleration preference and write it to the element` for M7-T3 (the body says the element deliberately persists nothing on a reader's behalf, which is why the key is here); `feat(graphty): report acceleration in the status bar and when the device is lost` for M7-T6 (the body says the `issues` slot gained its first producer, that the one toast's producer widened beyond the load, and that active and idle deliberately share a label); `feat(graphty): let the cost gate know when a metric would be accelerated` for M7-T7 (the body says every factor is 1 today and names `webgpu-graph-algorithms/src/accelerator.ts:87-117` as the reason); `test(graphty): add the acceleration story and stop claiming TurboSnap locally` for M7-T8; and `docs(webgpu-graph-algorithms): record the G12 gate for the app's acceleration surfaces` for M7-T9. No `!` on any of them: nothing here changes a published signature, and graphty is private. The PR's `chromatic-app` job shows one new story in two colour modes; the owner accepts those two snapshots as new baselines, and `all-checks` then passes.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Before M7-T1 | `git fetch origin && git merge --ff-only origin/master && git worktree add .worktrees/gpu-app -b feat/gpu-app-accelerator master` |
| Phase step 0 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,webgpu-graph-algorithms,algorithms,layout,graphty-element --parallel=3` |
| before M7-T1 | confirm `tools/commit-changes.sh:468` already lists `graph-format graph-io webgpu-graph-algorithms` (Task M8b-T1 Step 1 landed it); if not, land that one two-line `fix(tools)` commit first |
| M7-T1 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && ./tools/commit-changes.sh --dry-run` then without the flag, for the two subjects of M7-T1 Step 4 |
| M7-T2 | `... && HUSKY=0 pnpm install` (the lockfile), then `./tools/commit-changes.sh` for the two subjects of M7-T2 Step 7 |
| M7-T2 Step 5 | push a scratch branch whose only change is a line appended to `graph-io/README.md`, open it as a draft PR, read the `build` job's nine artifacts, then close it unmerged (G12 item 10b) |
| M7-T9 Step 1 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app/graphty && npm run dev`, then drive `https://dev.ato.ms:9005` with the Playwright MCP for the three screenshots, and ask the six Nanobanana questions |
| M7-T9 Step 4 | `cd /home/apowers/Projects/graphty-monorepo/.worktrees/gpu-app && ./tools/prepush.sh` |
| M7-T9 Step 5 | `./tools/commit-changes.sh --dry-run` then without the flag, for the five subjects of M7-T9 Step 5; then open the PR and accept the two new Chromatic snapshots |

The agent never runs any of these; it prepares the tree and verifies the results.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| The scope list matches commitlint | M7-T1 | `grep -n 'graph-format' tools/commit-changes.sh` | the script accepts every scope commitlint does |
| The decision record is ASCII | M7-T1 | `LC_ALL=C grep -nP '[^\x00-\x7F]' design/decisions/2026-09-19-g12-without-the-nightly-clause.md` | no output |
| The dependency resolves and the lockfile agrees | M7-T2 | `HUSKY=0 pnpm install --frozen-lockfile` | exit 0 with `link:../webgpu-graph-algorithms` in graphty's importer |
| An installed-but-unimported peer does not fail the dead-code gate | M7-T2 | `pnpm run lint:knip` | exit 0, no unused-dependency line for graphty |
| The activation import resolves in both tools | M7-T2 | `npx tsc --noEmit`, then `npm run dev` and load the app | no `Cannot find module '@graphty/graphty-element/webgpu'`, and the page boots |
| The app type-checks against a built GPU package | M7-T2 | `pnpm exec nx run graphty:lint` | the dependency builds first, then eslint and `tsc --noEmit` exit 0 |
| The element shim is gone without collateral | M7-T2 | `cd graphty && npx tsc --noEmit` | 0 errors; the real package's types are in force |
| The CI file still parses and names the narrowed step | M7-T2 | the `yaml.safe_load` one-liner of M7-T2 Step 5 | `Build graph-io and webgpu-graph-algorithms (PR)` present, the three-project step gone |
| ...and a PR that does NOT make graphty affected still uploads nine artifacts | M7-T2 | the scratch PR touching only `graph-io/README.md` | nine non-empty artifacts, 20/20 shards green |
| The preference survives a bad store, an explicit undefined included | M7-T3 | `npx vitest run src/gpu/__tests__/gpuPrefs.test.ts` | 5 passed |
| The preference reaches the element | M7-T3 | `npx vitest run src/components/Graphty.test.tsx` | the tag carries `acceleration="off"` |
| Every one of the six states has words, and two of them have none | M7-T6 | `npx vitest run src/components/shell/statusbar/__tests__/accelerationChip.test.ts` | 7 passed, including the probing case and the idle-equals-active case |
| The element's report reaches the shell | M7-T6 | `npx vitest run src/components/Graphty.test.tsx` | the dispatched `graphty-capabilities-change` calls the prop |
| The issues slot renders with only the acceleration chip | M7-T6 | `npx vitest run src/components/shell/statusbar/__tests__/StatusBar.test.tsx` | the three new cases pass |
| The chip is not gated on a dataset, and does not draw before the element speaks | M7-T6 | `npx vitest run src/components/shell/__tests__/AppShell.test.tsx` | the bar renders with no dataset and carries no `GPU acceleration` text |
| `statusBarModel.ts` is still type-only | M7-T6 | `grep -nE '^(export )?(function\|const\|let\|class)' src/components/shell/statusbar/statusBarModel.ts` | no output, so the coverage exemption holds |
| The cost gate's two surfaces agree, and BOTH forward the flag | M7-T7 | `npx vitest run src/components/shell/analysis/__tests__/metricCost.test.ts` | the record equals the single estimate for every metric, and the non-unit-table case halves the pagerank estimate through both entry points |
| The story builds and is indexed | M7-T8 | `pnpm exec nx run graphty:build-storybook` then the `index.json` one-liner | `components-acceleration--states` present |
| The app has no acceleration logic | M7-T9 | the five greps of M7-T9 Step 2 | the first two print nothing; the fourth prints one line |
| The app on a real GPU says so | M7-T9 | `https://dev.ato.ms:9005` plus the six Nanobanana questions | the three pairs answer in opposite directions |
| The whole app | M7-T9 | `pnpm exec nx run graphty:coverage` | the suite passes in headless Chromium |
| The pre-push gate | M7-T9 | `./tools/prepush.sh` | exit 0 |
| The GPU lane on this phase's master commits | M7-T9 | `gh run list --workflow GPU` | the run on the merge commit succeeded (G12's restated middle clause) |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M7-1 | The phase is started before Phase M6 is on master, and every live task from M7-T3 on names something the element does not publish. | Section 0.2 states each criterion as MET or NOT MET with its command, member by member. Each of those tasks names the symptom its own gate will show -- an unresolved module, a missing property, a chip that never appears -- and the answer to every one of them is "M6 is not on master", never a cast or a local declaration. |
| R-M7-2 | Acceleration logic creeps back into the app: a probe added "just to know", a capability record recomputed, a threshold applied a second time. | G12 item 7 is five greps that fail on the first hit (M7-T9 Step 2), and they run in the gate rather than in review. The app's only acceleration files are a preference store, a copy function and a chip. |
| R-M7-3 | The subpath alias is added AFTER the bare package alias in `vite.config.ts`, so `@graphty/graphty-element/webgpu` is rewritten to `.../index.ts/webgpu` and the dev server fails to resolve it -- or it is left out and resolves to `dist` instead of source, giving two module instances and two registrations. | PLAN DECISION 1 states the ordering rule and the two-instance failure; M7-T2 Step 2's gate loads the app rather than only type-checking, because a resolution that type-checks through `paths` can still fail in vite. |
| R-M7-4 | After the dependency lands, a PR touching only `webgpu-graph-algorithms/` also rebuilds, re-lints and re-tests graphty, its Storybook and its Chromatic job -- the GPU package's own PR loop gets longer. | Accepted and named: it is the cost of the closure that makes the `ci.yml` step narrow. D-M7-1's alternative (landing M7-T2 early on its own PR) is the lever if it hurts. |
| R-M7-5 | The `ci.yml` step is DELETED, or narrowed to graph-io alone, and a PR that makes graphty NOT affected leaves `webgpu-graph-algorithms/dist/` (or graph-io's) unbuilt against an unconditional Upload step -- the shards then fail at their Download step. | M7-T2 Step 5 replaces the step with a TWO-project one and carries the closure argument in the comment, including the graph-io-only counter-example; the verification matrix checks the step is present by name, and G12 item 10b checks it on a scratch PR that the landing PR structurally cannot stand in for. |
| R-M7-6 | The element answers its probe before React runs the forwarder's effect, no further `graphty-capabilities-change` ever fires, and the chip is blank for the life of the page. | The forwarder seeds on attach as well as subscribing (PLAN DECISION 2), so the subscription only has to carry CHANGES. If the element exposes no way to read the current record, that is an element gap to file: the alternative -- polling for it in the app -- is the probe this phase exists to delete. |
| R-M7-7 | The device-lost toast never appears, because the load-failure branch returns first and the reader has a failed load on screen. | Accepted by PLAN DECISION 6 and stated in the code comment: the chip carries the acceleration fact permanently and does not erase itself, so the toast is the second surface, never the only one. |
| R-M7-8 | The real-GPU check is run over `http://dev.ato.ms:9005`, the element finds no adapter in an insecure context, and the chip correctly reads off -- so the check records a pass for the wrong reason, or a fail nobody can explain. | M7-T9 Step 1 names the secure-context requirement first, checks that both certificate files exist before starting, and pairs every Nanobanana question with its opposite so that "off" has to be confirmed twice to be believed. |
| R-M7-9 | `metricCost`'s accelerator factors are set above 1 to "look finished", and the Run label promises a speed the processor then takes. | PLAN DECISION 8; the test pins every factor at 1 and a change has to change that test, which is where the reason for the new number gets written down. |
| R-M7-10 | Four plan documents of 2026-09-19 each bump `design/README.md`'s directory counts and collide on merge. | M7-T1 Step 3 gives the resolution rule -- re-run `find design/webgpu -name '*.md' \| wc -l` and `ls design/decisions/*.md \| grep -cv README` in the merged tree, never take a side, and never use `ls \| wc -l` (which counts directories in the first cell and the README in the second) -- and the corpus-table rows do not collide because each plan adds its own line. |
| R-M7-11 | Deleting `graphty/src/types/graphty-element.d.ts` is verified against TODAY's element, and Phase M6 changes types the app imports. | M7-T2 Step 4's Expected names this: any error other than the two known ones is a real disagreement with the element's own types, fixed in the app's usage or in the element, and never by re-adding the shim. |
| R-M7-12 | The element does not export the `Capabilities` type from an entry the app can import, so the chip module and the forwarder cannot name what they are handed. | That is an element gap and is filed as one: a consumer who cannot name the record it is told to render cannot render it, and the design ships these types from `.` alongside the tag. The app must not answer it with a local interface -- re-declaring the element's types is one of the named forms of working around the element, and the 73-line shim this phase deletes is what that becomes. |
| R-M7-13 | The `metricCost` seam lands as dead code: the flag is accepted by the type and read by nothing, and every test passes because every factor is 1 so `cpu / 1 === cpu`. Phase M8b then changes one number and nothing happens. | M7-T7 Step 1's fifth case drives both entry points with an injected table whose pagerank entry is 2 and asserts the estimate actually halved, and asserts an absent flag is not divided. That case fails if either forward is dropped; the other four cannot. |

### 7.4 Spec coverage: the integration plan's M7 deliverable cell, item by item

The cell is `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3259`, written when the app owned detection. Every clause of it, and where it went:

| Clause | Where it is now |
| --- | --- |
| `graphty/src/gpu/accelerator.ts` `attachAccelerator(...)` | RE-HOMED to the element: M6-T19 (the registry and the activation) and M6-T20 (the `webgpu` entry). The app's replacement is one import, M7-T2 Step 2 |
| static imports from `@graphty/webgpu-graph-algorithms/browser` and the root | RE-HOMED to `graphty-element/src/webgpu.ts` (M6-T20). No file in `graphty/src` imports the GPU package, and G12 item 8 checks it |
| `ctx.lost.then(...)` plus a toast | RE-HOMED for the recovery (M6-T19); the app keeps the REPORT, which is M7-T6's `"error"` state on the chip and in the one toast |
| the "GPU acceleration: on (vendor arch) / off" indicator | M7-T6, from the element's capability record: `accelerationChipModel` (Step 2) and the chip (Steps 4-6) |
| real-GPU stories under a `gpu` tag in the APP's Storybook | PARTLY RE-HOMED. The real-GPU story is the element's (M6-T20's gate). The app keeps a `gpu`-tagged story that draws all six states from fixed records, M7-T8 Step 1 |
| ...that render a deterministic no-GPU state on Chromatic | M7-T8, deterministic by construction: no story in the app touches an adapter |
| no TurboSnap there; `exitZeroOnChanges: false` | already true in CI (`ci.yml:625-660`); M7-T8 Step 2 clears the local leftover |
| the `metricCost.ts` gate gains a per-metric accelerator constant | M7-T7 Step 2 |
| ...once the element exposes the flag | M7-T7 Step 3: the element exposes the capability record, and the app reads "attached and usable" from it as `active` or `idle` |
| the app is the only importer of the GPU package | SUPERSEDED. graphty-element is, through its `webgpu` entry; the app installs the optional peer and imports it nowhere (G12 item 8) |
| `graphty/package.json` gains the dependency | M7-T2 Step 1 (as `workspace:*`, DEP-A), as the element's optional peer |
| the `ci.yml` build step becomes redundant for it | M7-T2 Step 5 (it narrows to graph-io AND webgpu-graph-algorithms, dropping only graph-format, DEP-G) |
| G12's `gpuMinNodes` default measured (design 7.21) | RE-HOMED. It is the element's `acceleration.minNodes`, measured under M6-T20's gate; G12 section 3 cites that record rather than repeating it |
| G12's "the app's stories green" | M7-T8 Step 1 and G12 item 1 |
| G12's "the story on the real GPU settles, drags and pins" | RE-HOMED to M6-T20's gate. The app's own real-GPU check is that its surfaces tell the truth: G12 items 3-6 |
| G12's "nightly GPU lane green for a week" | VOID; restated by M7-T1 Step 2 and checked as G12 item 9 |
