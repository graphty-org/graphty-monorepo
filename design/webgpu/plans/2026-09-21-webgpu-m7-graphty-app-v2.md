# graphty app Phase M7 (re-planned) -- the app consumes the version 2 element's acceleration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task runs in the checkout of the version 2 element branch AFTER Phase M6 (re-planned) has landed on it; `$WT` is that checkout, `$APP` is `$WT/graphty` and `$EL` is `$WT/graphty-element`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore`, `git switch` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh`; appendix 7.1 is the command sheet. **M7-T4 and M7-T5 both edit `graphty/src/components/shell/AppShell.tsx` and MUST run sequentially in one tree, in that order.**

**Goal:** Make the graphty app a consumer of the acceleration the version 2 element already owns, and nothing more. After Phase M6 the element probes for WebGPU, constructs the accelerator, attaches it, applies the threshold, recovers from device loss and publishes `capabilities.acceleration` as a document, a session event and a bubbling DOM event. What is left for an application is presentation: one side-effect import that switches the peer on, one Settings > Performance control that writes the element's `acceleration` policy and remembers the reader's choice (the element persists nothing on a reader's behalf, by design), one status-bar chip that renders the published status, the device-lost report routed through the app's one toast, deterministic stories for Chromatic, and the manifest and CI edits that make the app a proper installer of the element's optional peer. The app writes no probe, no construction, no injection and no recovery code; the plan's last gate line is a grep that proves it.

**Architecture:** The dependency runs one way and the element is where every graph capability lives (root `CLAUDE.md` "Architectural Principles"). `@graphty/webgpu-graph-algorithms` is an OPTIONAL peer of `@graphty/graphty-element` (`graphty-element/package.json:194-201`), activated by `import "@graphty/graphty-element/webgpu"` (`graphty-element/webgpu.ts:1-34`). The app installs the peer because the element declares it and a consumer installs peers; the app imports the activation entry beside the element import in `graphty/src/main.tsx`. Everything the app then shows -- the chip, the toast -- is derived from ONE value, the last `AccelerationStatus` the element published, so the surfaces cannot disagree. Everything the app decides -- the policy -- is written to the element as the `acceleration` attribute on the tag it renders, so the element's controller and the reader's control cannot disagree either. Where the element's API was too narrow for that (no runtime list of the policy values a control can offer), the fix is one small task in the element, never a copy in the app (M7-T3).

**Tech Stack:** TypeScript 5.9 strict, React 19.1 with Mantine 8.1 and `@graphty/compact-mantine`, the version 2 graphty-element read from SOURCE through `graphty/vite.config.ts` and `graphty/tsconfig.json` aliases, `@graphty/webgpu-graph-algorithms` 0.5.1 as the element's optional peer, vitest 3.2 in real headless Chromium through the Playwright browser provider (`graphty/vitest.config.ts:17-22`), Storybook 9 on `@storybook/react-vite` with Chromatic (`ci.yml` `chromatic-app`, `exitZeroOnChanges: false`), pnpm 10 workspace with `shamefully-hoist=true` (root `.npmrc:1-3`), Nx, ESLint 9 flat config with jsdoc rules, knip, GitHub Actions.

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` section 9.5 (`:3232-3253`) and the P12 row (`:4219`) as SUPERSEDED by `design/decisions/2026-09-19-graphty-element-owns-webgpu.md` (the app owns no detection); 9.4 item 8 (`:3194-3200`, where the real-GPU stories live); 9.8's W2 row (`:3295`); section 13's rules (`:4189-4202`); `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md`'s Phase M7 block (`:3254-3261`), whose deliverable cell this plan decomposes and departs from in section 0.5; the element design `design/element-api/element-api-design.md` 4.12 as master has it (`:2732-2760`: `Capabilities.acceleration` with FIVE states; "the consumer reads state; the consumer never probes" `:2758`; "WebGPU activation is one import" `:2812`; the attribute row `:531`) and as the v2 tree's UNCOMMITTED working copy extends it (`v2 [u]`, see "How this document cites code": the six states with `"probing"` `:2780-2821`; the host-storage rule `:541-545` and `:2882-2888`; activation and `E_NO_ACCELERATOR` `:2899-2919`; 4.10.1's `graphty-capabilities-change` mirror, "what an acceleration status chip listens to", `:2543-2551`); `design/element-api/element-api-migration.md` 2.13 (`v2 [u]` `:298-304`). Master's copy of the design has none of those sentences; the v2 branch's COMMITTED copy at `18e6112b` has all of them (0.2 checks it with `git show`), so the merge of M6-T0 carries them and nothing has to be amended.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md` (Phase M6 re-planned, the element half this plan consumes; its 0.7 says "It does not touch the graphty app. The app's one import line, its Settings control, its chip and its stories are M7's", `:182`), `design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md` and `-m8b-gpu-spmv.md` (the algorithm ports), `2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md` and `-p5-fruchterman-reingold.md` (the GPU package at 0.5.1). This plan REPLACES `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`, which was written against the 1.x element and design 9.5 (the app probes, constructs and injects) and whose 0.0 amendment (`:27-60`, below its superseded banner) already withdrew two of its nine tasks; section 0.8 says what each of the nine becomes. The old plan already carries a superseded banner (its lines 3-8), and `design/webgpu/README.md:18-21` already lists it as `superseded` and this plan as `live plan`: both edits are uncommitted in the write tree beside this plan and land with it (`git status --short design/`), so Task M7-T7 adds no row for either.

**Gate:** G12, W2 subset (design 13 row P12, `:4219`; restated for the app at the integration plan's `:3260`). Its middle clause, "nightly GPU lane green for a week", is VOID: `design/decisions/2026-09-19-no-nightly-gpu-lane.md` removed the cron and `.github/workflows/gpu.yml:1-9` says the lane runs on every master push instead. Four plan documents cite a restatement record `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` that was never written (`grep -rln g12-without-the-nightly-clause design/` lists the old M6, M7, M8a and M8b plans; `ls design/decisions/` has no such file); Task M7-T7 writes it, dated 2026-09-21. Task M7-T7 also writes the gate record.

**Tasks in this document:** M7-T1 .. M7-T7, in that order, with two exceptions: M7-T2 (CI and the Storybook certificate) is independent of everything after M7-T1 and may run any time after M7-T1 (its PD-5 argument needs the GPU package in graphty's closure, which M7-T1 puts there), and M7-T3 (the element's policy list) may run before M7-T1. The chain is M7-T1 (the peer and the import) -> M7-T3 (the element exports the values a control can offer) -> M7-T4 (the preference and the control write the element) -> M7-T5 (the chip and the toast read it) -> M7-T6 (stories, the live check) -> M7-T7 (records, the gate).

**File ownership:** `graphty/src/components/shell/AppShell.tsx` is edited by M7-T4 (the policy state and its two consumers) and M7-T5 (the status state and its two consumers), in that order, in ONE working tree, never in parallel: the file is 5,119 lines and the two edits land within 1,000 lines of each other. `graphty/src/components/shell/__tests__/AppShell.test.tsx` and `graphty/src/test/fakeSession.ts` are edited by the same two tasks in the same order. Every other file has exactly one owning task (8.3 lists them).

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore`, `git switch` or `git worktree`. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit". Subjects are at most 100 characters (`tools/commit-changes.sh:586`, `SUBJECT_MAX=100`) and, when they carry a scope, one from `tools/commit-changes.sh:582-583` (`graphty`, `graphty-element`, `ci`, ...); an unscoped subject is accepted (`:626-629` checks the scope only when one is present, and `@commitlint/config-conventional` has no scope-empty rule), which is what M7-T2's `ci:` and M7-T7's `docs:` subjects rely on.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes. `LC_ALL=C grep -rnP '[^\x00-\x7F]'` over the touched files is a step of Task M7-T7.
- Never run `sudo`. Servers only on ports 9000-9099 (the app's dev server takes `PORT=9005` from the root `.env:4`, its Storybook 9035, its coverage preview 9054). The root `.env` is gitignored (`.gitignore:67`) and exists only in the main checkout: a fresh clone or a new worktree has none, and `npm run dev` there listens on plain `http://` port 9000 until the engineer creates it (the four server keys `vite.config.ts:82-95` reads -- `HOST`, `PORT`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH` -- plus the Chromatic tokens).
- Design 13 rules for every phase (`design/webgpu/webgpu-acceleration-plan.md:4189-4202`): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (b) a phase adds only the primitives its slice needs; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback; (e) sizes are engineer-days (ed) for one engineer familiar with the code base. Rule (f) is the GPU package's and applies to nothing here.
- Root `CLAUDE.md` "Architectural Principles": the app is only HTML around graphty-element; it MUST NOT detect, construct, inject or recover; reading a property the element exposes and rendering it IS consuming the element; if the element's API is hard to use the fix goes in the element, and a workaround in the app is a bug report that was never filed. Root `CLAUDE.md` "WebGPU": detection-then-CPU is required and is the element's; the app never catches a GPU failure.
- Root `CLAUDE.md` "UI Components": use the default Mantine components; never write a bespoke control; if a shared component is wrong, fix it in `compact-mantine`.
- `graphty/CLAUDE.md` house style: Mantine for all UI; tests in `__tests__/` beside the component, vitest in Playwright Chromium; temporary files under `./tmp`. The app's test files use `expect` from vitest throughout (`SettingsOverlay.test.tsx:1`, `StatusBar.test.tsx:1`, `AppShell.test.tsx:1`), so new cases in those files do the same.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner. The root `.gitignore:23` ignores `tmp/` everywhere.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason and, where the departure changes a design statement, a `design/decisions/2026-09-21-<slug>.md` record written by Task M7-T7.

### How this document cites code

Two trees exist today and every `file:line` says which one it read:

- `v2:` -- the READ-ONLY main checkout `/home/apowers/Projects/graphty-monorepo` on `feat/element-api-2` at `18e6112b` (18 commits above `dad72f06`) PLUS its working tree, where another session holds a moving number of uncommitted paths (359 by `git status --short | wc -l` on 2026-09-21). A path marked `[u]` is one of those files: its line numbers are the working tree's on 2026-09-21 and may move before the branch lands; the facts cited will not. In the app the `[u]` files are `graphty/src/components/shell/AppShell.tsx`, `__tests__/AppShell.test.tsx`, `panel/SettingsOverlay.tsx`, `defaults/loadDefaults.ts` and its test, `analysis/metricCost.ts`, `src/test/fakeSession.ts`, `graphty/tsconfig.json` and `graphty/vite.config.ts` (`git status --short graphty/`); `src/components/Graphty.tsx` changed on disk while this plan was being written and is treated as `[u]` too. In the element the `[u]` files this plan cites are `graphty-element/src/graphty-element.ts`, `graphty-element/session.ts`, `graphty-element/index.ts`, `graphty-element/src/session/types.ts`, `graphty-element/package.json` and `src/session/GraphSession.ts`; at the root, `knip.config.ts`; and in `design/`, BOTH element design files, `design/element-api/element-api-design.md` and `element-api-migration.md`. Every edit to a `[u]` file is stated against a NAMED member (a function, a constant, a memo), never a line alone; the executor re-reads the member before editing.
- `master:` -- the write tree `/home/apowers/Projects/graphty-monorepo/.worktrees/plans-m6-m7` on `replan/m6-m7`, which is master at `9f1158e7` (the P5 merge, 77 commits above `dad72f06`). Line numbers into `design/webgpu/**`, `design/decisions/` and the M6 v2 plan are the write tree's and the same in v2. The two ELEMENT design files are not: v2's committed copy of `design/element-api/element-api-design.md` already differs from master's, and v2's working copy is uncommitted and longer (`git -C /home/apowers/Projects/graphty-monorepo status --short design/element-api/` prints ` M` for both files; `wc -l` gives 4,342 lines against master's 4,238; `git diff --stat -- design/element-api/` is +23 and +56/-19). Every citation into those two files therefore says either `master` (resolves in the write tree) or `v2 [u]` (the line number is the v2 WORKING copy's, which is 21 lines longer than the branch's committed copy, 4,342 against 4,321). Every FACT this plan cites as `v2 [u]` from those two files -- the six states with `"probing"`, the host-storage rule, the `graphty-capabilities-change` mirror, the activation paragraph, migration 2.13 -- is already COMMITTED on the v2 branch at `18e6112b` (`git show HEAD:design/element-api/element-api-design.md | grep -c graphty-capabilities-change` prints 4; the M6 v2 plan's DEP-M6-B and DEP-M6-C, `:145-146`, record the same: closed by the merge, nothing to amend). Only the line numbers move; 0.2 carries the `git show` checks.

Once Phase M6's Task M6-T0 has merged master into the v2 branch, `$WT` holds both and every path this plan cites exists in the one tree. Eight files changed on both sides (`git merge-tree dad72f06 9f1158e7 18e6112b`: `.github/workflows/ci.yml`, `knip.config.ts`, `graphty/package.json`, `graphty-element/package.json`, `pnpm-lock.yaml`, `design/decisions/README.md`, `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md`, `design/webgpu/webgpu-acceleration-plan.md`); three of them conflict (four hunks: two in `pnpm-lock.yaml`, one each in `design/decisions/README.md` and the integration plan), and the M6 v2 plan's M6-T0 Step 0 (`:234-247`) is the resolution table -- this plan starts after it. Line numbers this plan cites into `knip.config.ts` and `graphty/package.json` are v2's PRE-MERGE numbers (master's `graphty` knip block sits at `:155-169`; master's `graphty/package.json` is at 0.7.4 and still carries `zod`; `git diff 9f1158e7 18e6112b -- knip.config.ts graphty/package.json`), those into `ci.yml` are master's (v2's are two lines lower in the `chromatic-app` job and identical in content), and every edit to those files names the member (the `graphty` block, the `dependencies` key, the `storybook` script, the two count cells), so the executor finds it by name after the merge.

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-21)

| Fact | Evidence |
| --- | --- |
| The v2 element ships the whole detection half. `@graphty/webgpu-graph-algorithms` is an optional peer (range `^0.2.0` today; Phase M6's PD-2 widens it to `>=0.5.1 <1.0.0`); `./webgpu` is an exported entry whose one side effect is `registerAccelerator({ name: "webgpu-graph-algorithms", backend: "webgpu", factory })`; the file exports nothing (`grep -n '^export' graphty-element/webgpu.ts` prints nothing); `sideEffects` lists `./dist/webgpu.js` but no source path. | v2 `graphty-element/package.json:43-46,58-66,194-201` `[u]`; `graphty-element/webgpu.ts:1-34,36-42,180-184` |
| The v2 element publishes acceleration three ways: the attribute / property `acceleration` (`"auto" \| "off" \| "required"`, reflecting; a bad value is `console.error`ed and ignored, never thrown, because Lit drives the setter from `attributeChangedCallback`; the error message links a docs anchor that does not exist), the session document `session.capabilities.acceleration` (an `AccelerationStatus`: `state`, `backend`, `vendor`, `architecture`, `device`, `reason`, `code`), and the DOM event `graphty-capabilities-change` with detail `{ capabilities: { acceleration: AccelerationStatus } }`, `bubbles: true, composed: true`, mirrored from every controller transition. The element getter `session` returns the Graph's session, and the Graph is built in the element's constructor, so both exist the moment the tag is upgraded. The probe starts in `connectedCallback`. | v2 `graphty-element/src/graphty-element.ts:58,83,236,2604-2655,2666-2682` `[u]`; `src/acceleration/types.ts:42,55,168-183`; `src/session/types.ts:528` (the document's type; `GraphSession.ts`'s `get capabilities()`, `:334` `[u]`, is where a session serves it) |
| The element's own doc says the reader's preference is the HOST's storage: "This is a session setting and the element never persists it. Remembering that a reader switched acceleration off, and restoring the choice on their next visit, is the host application's storage". The element design says the same and adds "the app keeps its own storage key and writes the attribute when it mounts the element". So the old plan's amendment line for M7-T3 ("the element's config persistence already covers it; delete the versioned localStorage key") is WRONG against v2: the app persists. | v2 `graphty-element/src/graphty-element.ts` `[u]` (the `acceleration` accessor's doc comment, "This is a session setting and the element never persists it"); `src/acceleration/types.ts:50-54`; v2 `[u]` `design/element-api/element-api-design.md:541-545,2882-2888` (master's copy has neither sentence: its attribute row `:531` is the whole of what it says about persistence) |
| The six states and what a chip does with them: `probing` (show nothing definitive), `active`, `idle` (a working accelerator at rest, NOT degraded), `unavailable` (`reason` and `code`), `error` (attached then failed, device loss the usual cause; the element continues on the CPU having said so), `off`. Device loss transitions to `error` with code `E_DEVICE_LOST` and reason `"the accelerator's device was lost: <reason>"`, then the controller retries up to three times; a successful recovery transitions back. | v2 `[u]` `design/element-api/element-api-design.md:2806-2821` (master `:2737` lists FIVE states, no `"probing"`; the sixth is what the v2 code implements, `AccelerationController.ts:328,549`, and v2's COMMITTED design already lists it -- the M6 v2 plan's DEP-M6-C, `:146`: closed by the merge); v2 `src/acceleration/AccelerationController.ts:113,689,692-700`; `src/errors/codes.ts:216-240` `[u]` |
| The v2 element exports the TYPES a consumer needs from the Node-safe `./session` entry (`AccelerationPolicy`, `AccelerationState`, `AccelerationStatus`, `AccelerationCapabilities`, `Capabilities`) but NO runtime list of the policy values: `ACCELERATION_MIN_NODES_DEFAULT`, `ACCELERATION_MIN_NODES_KEY`, `CPU_PRECISION` and `DEFAULT_ACCELERATOR_PRECISION` are the only CONSTANTS `src/acceleration/index.ts` exports (its other value exports are the controller and registry classes and functions, `AccelerationController`, `AcceleratorRegistry`, `acceleratorRegistry`, `registerAccelerator`, `:9,11`), and the attribute setter validates with an inline three-way comparison. A Settings control needs the list to offer and validate; copying `["auto", "off", "required"]` into the app is the forbidden "copying the element's enums" (root `CLAUDE.md`). | v2 `graphty-element/session.ts:305-317` `[u]`; `graphty-element/index.ts:258-277` `[u]`; `src/acceleration/index.ts:9-33`; `src/session/types.ts:528` `[u]`; `src/graphty-element.ts` `[u]` (the `acceleration` setter's three-way check) |
| TWO controllers exist on v2 (the element's, attribute-driven, and the session's own), so `session.capabilities` and `acceleration="off"` do not agree today. Phase M6 Task M6-T1 (PD-4, PD-5, PD-6) makes them one and adds the session event `capabilities:changed`. This plan reads `session.capabilities.acceleration` and listens to the DOM mirror; both are correct only after M6-T1, which is why it is an entry criterion. | master `design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md:59` (the two-controller row), `:115-120` (PD-1 .. PD-6), `:349-436` (Task M6-T1) |
| The v2 app has NO acceleration code: `grep -rn -i "acceleration\|webgpu\|navigator.gpu\|registerAccelerator\|acceleratorRegistry" graphty/src` outside tests prints nothing; `graphty/src/gpu/` does not exist; `graphty/package.json` names no GPU package; `main.tsx` imports `{ Graphty }` and guards it against tree-shaking with a `typeof` check because "a bare import like `import "@graphty/graphty-element"` gets tree-shaken away". The app reads the element from SOURCE: `vite.config.ts` aliases `@graphty/graphty-element/<x>` to `../graphty-element/<x>.ts` and `tsconfig.json` does the same for `tsc`, so the app's type-check and bundle will both walk `webgpu.ts`, which imports the GPU package's BUILT `dist/` through its exports map. `graphty/node_modules/@graphty/` holds `compact-mantine` and `graphty-element` only; the GPU package resolves today through the root hoist (`ls node_modules/@graphty/` lists it). | v2 `graphty/src/main.tsx:3-15`; `graphty/package.json:31-46`; `graphty/vite.config.ts:40-46` `[u]`; `graphty/tsconfig.json:36-37` `[u]`; root `.npmrc:3`; `ls graphty/node_modules/@graphty node_modules/@graphty` |
| The app's `lint` target has no `dependsOn`, so a bare `pnpm exec nx run graphty:lint` in a fresh tree type-checks `webgpu.ts` against an unbuilt `webgpu-graph-algorithms/dist/`. The CI comment still says the three format / GPU packages are "not yet in graphty's dependency closure" and builds them explicitly on every PR; every test shard downloads nine build artifacts. | v2 `graphty/project.json:38-44`; master `.github/workflows/ci.yml:85-92,440-499` |
| knip's `graphty` workspace has `ignoreDependencies: ["jsdom"]` only; the element's workspace already lists the peer under "Peer dependencies (provided by consumer)". A dependency the app installs on the element's behalf and never imports itself is what knip reports as unused. | v2 `knip.config.ts:141-145,165-179` `[u]` (master: `:155-169` for the `graphty` block) |
| Settings > Performance is a SHIPPED pane that draws the two label controls and says in its own comment that it draws "NOT the rest of 7.2's Performance branch" because the threshold and layout choice are the element's. The persisted-preference pattern to copy is `loadDefaults.ts`: a versioned key `graphty.shell.labels.v1`, `readPersisted*` (try/catch round the store, `JSON.parse` in its own try, non-objects and arrays refused, each field validated on its own), `writePersisted*`, `resolve*`. The pane is self-contained: it seeds its state from storage in the initialiser and writes on every change; its "Applies the next time a graph loads" sentence exists because the shell has no live route from the pane to the canvas. `SettingsOverlay`'s props are `opened`, `onClose`, `section?`, `aiProviders` (required: "a pane that reached for its own would be a second `ApiKeyManager`"). The shell opens it at `<SettingsOverlay opened={settingsOpen} section={settingsSection} aiProviders={...}>` and the AI panel opens it by name with `setSettingsSection`. | v2 `graphty/src/components/shell/panel/SettingsOverlay.tsx:74-88,98-109,137-143,174-231,239-252,278,488` `[u]`; `defaults/loadDefaults.ts:63,75-94,103-170` `[u]`; `AppShell.tsx:1163,1170,3725,4996-4999` `[u]` |
| How the policy would reach the tag: `CanvasRegion` renders `<Graphty ref layers viewMode dataSource dataSourceConfig replaceExisting layout layoutConfig onSelectionChange onStylesChange>` from its `graph: CanvasGraphConfig` prop, which `AppShell` builds in `canvasProps` (`viewMode`, `layout: layoutType`, `layoutConfig`, the two handlers); `Graphty.tsx` writes every element property in an effect AFTER mount (`layout` / `layoutConfig`, `viewMode`) and renders the tag as `<graphty-element ref style>`. The JSX typing the compiler consults is `graphty/src/types/jsx.d.ts` (committed): `React.JSX.IntrinsicElements["graphty-element"]` as `React.HTMLAttributes<HTMLElement>` plus six typed attributes (`layout`, `layout2d`, `node-data`, `edge-data`, `algorithms`, `style-template`) and no `acceleration`. `Graphty.tsx:206-210` `[u]` carries a SECOND declaration, on a module-level `React.IntrinsicElements`, which @types/react 19 never reads for JSX (the compiler resolves `React.JSX.IntrinsicElements`); the two compile side by side because they are different interfaces, and a prop added only to the second is an excess property on the tag. React 19 assigns a JSX prop on a custom element as a PROPERTY when the element defines it and as an attribute otherwise, and it does so before the element is inserted -- so a policy passed on the tag is in force before `connectedCallback` starts the probe, whereas a policy written in an effect arrives after a probe under `auto` has already begun. | v2 `graphty/src/components/shell/canvas/CanvasRegion.tsx:60,82-104,435-446`; `AppShell.tsx:4640,4668-4674` `[u]`; `src/components/Graphty.tsx:206-210,369-376,384-388,490-497` `[u]`; `graphty/src/types/jsx.d.ts:1-16`; `graphty-element/react.ts:4-7` |
| How the shell listens to the element today: DOM listeners on the shell's frame `div` (`frameRef`) for the bubbling, composed load events `data-loaded`, `data-loading-progress`, `data-added` and `data-loading-error`, attached in effects with `[]` deps; `Graphty.tsx` adds a `selection-changed` listener on the element and polls the session at 50 ms for `style:changed`. The shell reaches the session through `elementSession(graphtyRef.current?.graph)`, a runtime-narrowing helper with eight call sites. | v2 `AppShell.tsx:554,599,602,1054,1152,1673-1697,1846-1885,4820` `[u]`; `Graphty.tsx:391-418,431-477` `[u]`; `shell/analysis/elementBridge.ts:110-112` |
| The status bar's `issues` slot has three members (`validation`, `notes`, `performance`), a drawing function with three chips, an emptiness check that names exactly those three, and NO producer in the app: the slots memo returns `{}` until `dataLoaded` and then builds `counts`, `layout` and `selection` only. `issues` never drops on overflow. `statusBarModel.ts` is the documented, type-only place to widen the frozen contract and is coverage-exempt on the ground that `grep -nE "^(export )?(function\|const\|let\|class)"` over it matches nothing. The one toast, `LoadCompleteToast`, is fed by `loadCompletion` (`undefined` unless `loadFailure !== null`; `severity: "error"`; `actionLabel: OPEN_DATA_ACTION`; no `onDismiss`, by its own doc: "an error that erases itself on a six second timer is the silent failure again in a nicer font"). No `@mantine/notifications` anywhere. | v2 `graphty/src/components/shell/types.ts:690-708`; `statusbar/StatusBarSlots.tsx:74,87,319-347`; `statusbar/StatusBar.tsx:27,31,109-121`; `statusbar/statusBarModel.ts:1-15,84-89,117-150`; `statusbar/LoadCompleteToast.tsx:15-25`; `shell/constants.ts:795`; `AppShell.tsx:294,4232-4265,4293-4306,5033` `[u]`; `graphty/vitest.config.ts:53-60`; `graphty/package.json:31-63` |
| The status bar's tests: `StatusBar.test.tsx` has 46 `it` cases and a `renderBar` helper that mounts the bar in a 1,440 px host; `AppShell.test.tsx` has `renderMeasuredShell`, `installGraph` (defines an own `graph` property on the `<graphty-element>` node holding a fake session), and two event helpers that dispatch bubbling, composed `CustomEvent`s on the node (`reportLoadComplete`, `reportLoadingError`); the shell tests never import the element runtime, so `<graphty-element>` is an unregistered element there and React sets JSX props on it as attributes. `Graphty.test.tsx` registers its own mock element with a `layout` accessor and asserts "property or attribute". `SettingsOverlay.test.tsx` renders the overlay inline 21 times with `aiProviders={emptyKeyStore()}` (`grep -c`) and has a Performance describe whose `openPerformance()` helper clicks the `Performance` tab after rendering, because the overlay opens on its FIRST section (`SettingsOverlay.tsx:277`, `SETTINGS_SECTIONS[0]` is `appearance`) and renders only the active section's pane (`:488`). `fakeSession.ts` builds its session as an object literal cast `as unknown as GraphSession` with `estimate` and `catalog.metrics` but no `capabilities`. | v2 `statusbar/__tests__/StatusBar.test.tsx:11-53`; `shell/__tests__/AppShell.test.tsx:30-52,93-117,180-190,204-225,1292-1325` `[u]`; `src/components/Graphty.test.tsx:6-62`; `panel/__tests__/SettingsOverlay.test.tsx:19-39,206-323`; `src/test/fakeSession.ts:138-161,280,540,603` `[u]`; `grep -rln '"@graphty/graphty-element"' graphty/src` -> `main.tsx` (the named import) and `GraphtyEnhanced.tsx` (a bare `import "@graphty/graphty-element";`, `:1`, so a `from`-anchored grep misses it) only |
| The `metricCost` gate is ALREADY the element's: `metricCost()` calls `session.estimate({ op: "algo.run", algorithm })` and the app-side throughput model is gone. The element's estimate knows an accelerator only as an availability gate (`acceleratorAvailable`). The old M7-T7 (an app-side per-metric speed-up divisor) is therefore obsolete: a GPU rate belongs in `graphty-element/src/session/cost/estimate.ts`, read through the same `session.estimate`, and it has a value only once an algorithm runs on the GPU (M6-T6). | v2 `graphty/src/components/shell/analysis/metricCost.ts:13-39,359-376` `[u]`; `graphty-element/src/session/cost/estimate.ts:250,359-360` `[u]` |
| The app's Storybook: stories glob `../src/**/*.stories.@(js\|jsx\|mjs\|ts\|tsx)`, `reactDocgen: false`, HTTPS from the root `.env`; `Graphty.stories.tsx` registers a MOCK `<graphty-element>` at module scope (a grey box) and `customElements.define` takes a name once per page, so no story in this Storybook can mount the real element; `preview.tsx` snapshots every story in a light and a dark mode; `chromatic.config.json` still says `onlyChanged: true` although CI runs the action with TurboSnap off; the `storybook` script names `~/ssl/STAR_ato_ms.crt`, which does not exist (`ls ~/ssl` has `atoms.crt`, `atoms.key`, `atoms_chain.crt`, `atoms.pem`, ...), while the root `.env` points every other server at `/home/apowers/ssl/atoms.crt` / `atoms.key`. No story renders the status bar. | v2 `graphty/.storybook/main.ts:4,17,31-50`; `graphty/src/stories/Graphty.stories.tsx:5-32`; `graphty/.storybook/preview.tsx:113-120`; `graphty/chromatic.config.json:2`; `graphty/package.json:23`; root `.env:1-4` (gitignored, main checkout only); master `.github/workflows/ci.yml:630-664` (the `Run Chromatic` step `:656-664`, `exitZeroOnChanges: false` at `:661`, the TurboSnap comment `:662-663`); `ls graphty/src/stories` |
| The element's real-GPU story is Phase M6's: `stories/LayoutGpu.stories.ts` with two fake-accelerator stories snapshotted on Chromatic and one real-WebGPU story with `disableSnapshot`, checked on the dev box with the Playwright + Nanobanana routine (M6-T8 Step 2). The `minNodes` measurement (the old M7-T9's protocol) is M6-T9's (PD-23) and lands in `graphty-element/docs/decisions/G6.md`. | master `design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md:136-138` (PD-22 .. PD-24), `:806-834` (Task M6-T8), `:835-966` (Task M6-T9) |
| Decision records and indexes: `design/decisions/` on master holds 13 records (`design/README.md:14` says 13); the v2 tree ADDS `2026-09-19-land-element-graph-store.md`; Phase M6 adds seven more and two index rows. Master's `design/webgpu/README.md:8-17` lists neither old M6 nor old M7 plan and `design/README.md:21` says 13 webgpu documents; the WRITE tree already carries, uncommitted beside this plan, the four rows (`design/webgpu/README.md:18-21`: both old plans `superseded`, both v2 plans `live plan`), `design/README.md:21` at 16, and a six-line superseded banner at the top of each old plan (`git status --short design/` prints ` M` for all four files). `tools/commit-changes.sh:582` already accepts the `graphty`, `ci` and `docs` scopes. | master `ls design/decisions/`; `design/README.md:14,21`; write tree `git diff -- design/README.md design/webgpu/README.md design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`; `tools/commit-changes.sh:582-583` |
| Version drift between the trees: v2 has webgpu-graph-algorithms 0.2.1, layout 1.6.2, algorithms 1.7.2; master has 0.5.1, 1.8.0, 1.8.1. The element's peer range `^0.2.0` does not admit 0.5.1; M6-T0 (PD-2) is what makes a `workspace:*` install of the GPU package satisfy the element's peer. | v2 and master `*/package.json:3`; v2 `graphty-element/package.json:194` `[u]` |

### 0.2 Entry criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Phase M6 (re-planned) Task M6-T0 on the v2 branch: master merged in, the peer range widened to admit 0.5.1 | **NOT MET** (M6 has not started) | M6 v2 plan `:114-115` (PD-1, PD-2); check with `grep -n '"@graphty/webgpu-graph-algorithms"' $EL/package.json` expecting `>=0.5.1 <1.0.0` and `cd $WT && HUSKY=0 pnpm install --frozen-lockfile` printing no "unmet peer" line for graphty-element |
| Phase M6 Task M6-T1: ONE controller; `session.capabilities.acceleration` is the document the DOM event carries; `acceleration="off"` on the tag reaches it | **NOT MET** | M6 v2 plan `:118-120,338-425` (PD-4 .. PD-6, Task M6-T1); check with `cd $EL && grep -rn "new AccelerationController" src/` printing exactly `src/Graph.ts` and `src/session/GraphSession.ts` |
| Phase M6 in full (the element uses the accelerator; the G6 record signed with the `minNodes` measurement) -- required for the live check of M7-T6 and the G12 record of M7-T7, NOT for M7-T1 .. M7-T5 | **NOT MET** | `ls $EL/docs/decisions/G6.md` |
| The element design text this plan cites as `v2 [u]` -- the six states with `"probing"`, the host-storage rule, the `graphty-capabilities-change` mirror "is what an acceleration status chip listens to" -- is COMMITTED on the v2 branch (the M6 v2 plan's DEP-M6-B and DEP-M6-C, `:145-146`: closed by the merge, nothing to amend) | **MET** (committed at `18e6112b`; the working copy's further edits move line numbers only) | `cd $WT && git show HEAD:design/element-api/element-api-design.md > tmp/design-head.md && grep -c '"probing"' tmp/design-head.md && grep -c 'graphty-capabilities-change' tmp/design-head.md && grep -n 'never persists' tmp/design-head.md` prints 2, 4 and line 541 |
| The v2 element's `./webgpu` entry, the `acceleration` attribute, the DOM event, the `./session` type exports | **MET on the v2 branch** | 0.1 rows 1, 2, 5 |
| The app's Settings > Performance pane, the `issues` slot, the one toast, the persisted-preference pattern | **MET** (identical on master and v2 but for one constant) | 0.1 rows 10, 12; `tmp/replan/app-map.md` section 2.2 |
| `tools/commit-changes.sh` accepts the scopes this plan uses | **MET** | `tools/commit-changes.sh:582-583` |

M7-T1 .. M7-T5 can start the moment M6-T1 is in the tree; M7-T6 and M7-T7 wait for the whole of M6.

### 0.3 Execution order

```
v2 (feat/element-api-2) + master merged in (M6-T0) ... M6-T1 ... M6-T9 (G6 signed)
   |
   +-- M7-T3 (element: the policy list)  -- may run any time after M6-T1
   +-- M7-T1 (the peer, the import, the retention proof, the lint order)
   +-- M7-T2 (the CI step, the Storybook certificate)  -- any time after M7-T1
   +-- M7-T4 (the preference, the control, the tag)  -- after M7-T1 and M7-T3
   +-- M7-T5 (the chip, the toast)  -- after M7-T4, same tree
   +-- M7-T6 (stories, Chromatic, the live check on the dev box)  -- after M7-T5 and the whole of M6
   +-- M7-T7 (records, index, G12 record, the full gate)  -- last
```

The other session's uncommitted work on v2 touches `AppShell.tsx`, `SettingsOverlay.tsx`, `loadDefaults.ts`, `fakeSession.ts` and `Graphty.tsx`. Every edit below to those files is described against a NAMED member (`canvasProps`, the `slots` memo, `loadCompletion`, `LabelSettingsPane`, `SettingsOverlayProps`, the `session` literal), so it re-applies after their commit; the executor re-reads the member before editing.

### 0.4 Plan decisions (the index; each block is stated in full in the task that owns it)

| Id | Decision | Task |
| --- | --- | --- |
| PD-1 | M7 executes on the version 2 branch after Phase M6; the plan's file paths are the v2 tree's; the app's tasks need M6-T1, the gate needs all of M6 | 0.2, M7-T1 |
| PD-2 | The app installs the element's optional peer as `"@graphty/webgpu-graph-algorithms": "workspace:*"` in `dependencies`, and knip's `graphty` workspace lists it under `ignoreDependencies` with the reason (installed on the element's behalf, never imported by the app) | M7-T1 |
| PD-3 | Activation is `import "@graphty/graphty-element/webgpu";` in `main.tsx` beside the element import, and nothing else; retention in the production bundle is PROVEN by a grep of `dist/`, and if the bare import is dropped the fix is `./webgpu.ts` in the element's `sideEffects` list, never a bundler override in the app | M7-T1 |
| PD-4 | `graphty:lint` gains `dependsOn: ["^build"]` because the app's `tsc --noEmit` now walks `webgpu.ts` into the GPU package's built declarations | M7-T1 |
| PD-5 | The CI build step narrows to `graph-io,webgpu-graph-algorithms` (graph-format is reached by both through `^build`; the GPU package stays because a graph-io-only PR leaves it unbuilt against an unconditional upload) | M7-T2 |
| PD-6 | The element exports `ACCELERATION_POLICIES`, `ACCELERATION_POLICY_DEFAULT` and `isAccelerationPolicy()` from `src/acceleration/types.ts` through `./session` and `.`; the attribute setter uses the guard and the element's four `"auto"` initialisers read the constant; the app imports them and declares no policy literal of its own | M7-T3 |
| PD-7 | The reader's policy lives in a versioned key `graphty.shell.acceleration.v1` in a new module `shell/defaults/accelerationSettings.ts` that copies `loadDefaults.ts` field for field; the shell owns the state, writes storage on change, and hands the pane a value and a callback | M7-T4 |
| PD-8 | The control is a Mantine `SegmentedControl` inside an `Input.Wrapper` in a new `AccelerationSettingsPane` drawn under `performance` beside `LabelSettingsPane`; it is LIVE ("Applies at once."), unlike the label controls | M7-T4 |
| PD-9 | The policy reaches the element as the `acceleration` prop on the `<graphty-element>` tag `Graphty.tsx` renders (in force before `connectedCallback` starts the probe), threaded through `CanvasGraphConfig.acceleration`; the app's JSX declaration in `graphty/src/types/jsx.d.ts` is widened by that one typed prop (the dead second declaration in `Graphty.tsx` is deleted), and the fact that the element ships no JSX typing is recorded as an element gap; no effect | M7-T4 |
| PD-10 | The status source is a listener for `graphty-capabilities-change` on the shell's frame (the `data-loaded` pattern) PLUS one read of `session.capabilities.acceleration` through the wrapper handle's new `session` member right after the listener is attached; the shell holds the last `AccelerationStatus` or `null`, and `null` and `"probing"` both draw nothing | M7-T5 |
| PD-11 | The chip is `StatusBarAccelerationMode { label, title, active, onClick }` in `statusBarModel.ts` (type-only), drawn last in the `issues` slot by the existing `StatusBarChip` with the existing `StatusDot`, produced by its own memo ABOVE the slots memo's `dataLoaded` guard; the label and title come from a pure `formatAcceleration(status)` in a new `statusbar/formatAcceleration.ts` | M7-T5 |
| PD-12 | A lost device surfaces through the one toast: `loadCompletion` becomes `statusCompletion`, reports `state === "error"` with `severity: "error"`, `actionLabel: "Open Settings"` and no `onDismiss`; a load failure wins when both are present; the toast leaves by itself when the element recovers (the state changes) | M7-T5 |
| PD-13 | The app's stories draw the status bar from a FIXED model (deterministic by construction, snapshotted in both colour modes); there is no real-element story in the app's Storybook; the live check on the real GPU is the RUNNING APP on the dev server, screenshotted through the Playwright MCP and questioned through Nanobanana | M7-T6 |
| PD-14 | The G12 record lives at `graphty/docs/decisions/G12.md` (new directory, no site builds it); the nightly clause's restatement is `design/decisions/2026-09-21-g12-without-the-nightly-clause.md`, the one record four older plans already cite | M7-T7 |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-M7-A | Design 9.5 (`:3232-3253`) and the integration plan's M7 cell (`:3259`) make the app probe, construct and inject (`attachAccelerator`, `ctx.lost.then(...)`, `calibrateLayout` wiring); this plan does none of it. | Already decided by `design/decisions/2026-09-19-graphty-element-owns-webgpu.md` and built on v2 (`webgpu.ts`); the root `CLAUDE.md` principle. No new record; the existing one is cited. |
| DEP-M7-B | Design 9.4 item 8 (`:3194-3200`), 9.8's W2 row (`:3295`) and the P12 row (`:4219`) put "the real-GPU stories under a `gpu` tag in the APP"; this plan puts the real-GPU story in the ELEMENT's Storybook (M6-T8 PD-22) and gives the app two fixed-model chip stories with no tag. | The app's Storybook registers a mock `<graphty-element>` at module scope (`Graphty.stories.tsx:5-32`) and a page can define a tag name once, so a story that mounts the real element cannot share that Storybook; the element's Storybook already carries the real-GPU story since the ownership record moved the GPU integration into the element; and the `gpu` tag existed to skip a story on a software renderer, which a fixed-model story never needs. Recorded by M7-T7 as `design/decisions/2026-09-21-app-stories-draw-the-chip-not-the-gpu.md`. |
| DEP-M7-C | The integration plan's M7 cell says "the `metricCost.ts` gate gains a per-metric accelerator constant once the element exposes the flag"; this plan adds no constant. | The cost model is the element's now (`metricCost.ts:359-376` reads `session.estimate`), and a per-metric GPU rate belongs in `graphty-element/src/session/cost/estimate.ts`; an app-side divisor would be the element's number computed twice. Recorded in the G12 record's findings (M7-T7), not as a decision record: it changes a plan cell, not a design statement. |
| DEP-M7-D | The integration plan's M7 gate cell (`:3260`) asks the APP to measure the `gpuMinNodes` default; this plan cites the element's measurement. | The old M7-T9 protocol moved into the element as M6-T9 PD-23 and its number lands in `graphty-element/docs/decisions/G6.md`; the app sets no threshold (the element's `acceleration-min-nodes` attribute is M6-T1's, and the app leaves it at the element's default). The G12 record cites the G6 record's number. |
| DEP-M7-E | Design 9.5 reports device loss with `showToast(...)`; the app has no such function. | The app has one toast, `LoadCompleteToast`, whose own doc generalises it to "a load ends, and this is the line that says how it ended" and whose producer is load-scoped; the producer widens (PD-12) and no notification system is added. A plan decision, not a design change. |
| DEP-M7-F | G12's middle clause, "nightly GPU lane green for a week". | VOID since `design/decisions/2026-09-19-no-nightly-gpu-lane.md`; restated as "the GPU lane green on this phase's master commits" in the record M7-T7 writes (PD-14). |

### 0.6 Phase map

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| M7 (re-planned) the graphty app on the version 2 element | `graphty/`, one small task in `graphty-element/`, one step in `ci.yml`, `knip.config.ts`, the design index and records | 0.2 | the peer and the one import; the lint build order; the CI step; the Storybook certificate; the element's policy list; the persisted policy, the Settings control and the tag attribute; the chip and the device-lost toast; two stories; the live check; two decision records; the G12 record | G12 W2 subset (design 13 row P12), restated in M7-T7 | design row P12 says 4-6 ed for the app AND the element polish it then contained; this plan's seven tasks sum to 6.5 ed (below) |

Critical path: T1 -> T3 -> T4 -> T5 -> T6 -> T7, with T2 anywhere after T1.

**Per-task estimate.** Design 13 rule (e) (`:4198-4199`): engineer-days for one engineer familiar with the code base.

| Task | What it is | ed |
| --- | --- | --- |
| M7-T1 | the dependency, the knip entry, the lint order, the import, the retention proof, the lockfile | 0.5 |
| M7-T2 | the CI step narrowing with its scratch-PR proof, the Storybook certificate | 0.5 |
| M7-T3 | the element's policy list and guard, the setter on the guard, two tests | 0.5 |
| M7-T4 | the store and its tests, the pane control and its tests, the overlay props, the shell state, the tag prop through `CanvasRegion` and `Graphty`, the shell and wrapper tests | 1.5 |
| M7-T5 | the model, the drawing, the emptiness check, `formatAcceleration` and its tests, the frame listener and the initial read, the two producers, the fake session, the shell and bar tests | 1.5 |
| M7-T6 | two stories, Chromatic, the running-app visual check with the Nanobanana questions, `CLAUDE.md` | 1.0 |
| M7-T7 | two decision records, the index rows and counts, the G12 record, the full gate run | 1.0 |

### 0.7 What M7 does NOT do

- It does not probe, construct, inject, or recover. `grep -rn "navigator.gpu\|webgpu-graph-algorithms\|graphty-element/webgpu\|registerAccelerator\|acceleratorRegistry" graphty/src | grep -v "\.test\."` must print exactly ONE line after this phase: the import in `main.tsx`. The fifth pattern, `graphty-element/webgpu`, is the one that matches that line; the four GPU-package strings alone match nothing in the app before OR after this phase, because the activation import names the element's entry, not the package, and the comment above it names neither (M7-T1 Step 2). The M6 v2 plan's closing check (`:860-872`) runs the four-string form and expects 0 today; its "exactly one import" expectation for after M7 holds only with the fifth pattern added, which this plan's grep carries.
- It does not move the app's JSX typing of `<graphty-element>` into the element. `graphty/src/types/jsx.d.ts` declares `React.JSX.IntrinsicElements["graphty-element"]` with six typed attributes, and PD-9 widens that declaration by one prop (the second declaration at `Graphty.tsx:206-210` `[u]` is dead -- a module-level `React.IntrinsicElements` that React 19's JSX never consults -- and M7-T4 Step 4 deletes it); a React 19 consumer needs the same declaration, so it is element surface the element does not ship (`graphty-element/react.ts:1-21` is the reserved, deliberately empty entry for it). Recorded in the G12 record's findings as an element gap, beside the three others below, not built here: shipping JSX typing is that entry's whole job, not one prop's.
- It does not add a `metricCost` accelerator constant (DEP-M7-C), does not measure `minNodes` (DEP-M7-D), and does not expose the element's `acceleration-min-nodes` knob in Settings: the app leaves the threshold at the element's measured default, and a control for it is a product question the G12 record's findings raise for the owner.
- It does not build a React wrapper: `graphty-element/react.ts:4-7` says a React 19 application needs nothing beyond the tag, and `Graphty.tsx` is that tag.
- It does not touch `Graphty.tsx`'s format sniffing, the 50 ms session poll or `elementBridge.ts`'s duck-typing (`tmp/replan/app-map.md` section 2.6): they are element gaps (no `element.ready`, no `data.inspect()` adoption) outside the acceleration seam, listed in the G12 record's findings for the v2 branch's own clean-up. No task in this plan or in the M6 v2 plan owns that deletion (the element design's section 7 asks for it; the design map's section 4 lists it as residue): the G12 findings entry is the record, and the owner is the v2 branch before it merges, with the wrapper's duck-typed `GraphtyElementType` (M7-T4 Step 4) in the same entry.
- It does not add `@mantine/notifications` (DEP-M7-E).
- It does not change `graphty/vite.config.ts` or `graphty/tsconfig.json`: the source aliases already resolve `@graphty/graphty-element/webgpu` to `../graphty-element/webgpu.ts` (`vite.config.ts:40-46`, `tsconfig.json:37`).
- It does not edit `design/webgpu/webgpu-acceleration-plan.md` or the integration plan (plans of record); departures are records and index rows.

### 0.8 What the old plan's nine tasks become

| Old task (`2026-09-19-webgpu-m7-graphty-app.md`) | Status on v2 | Here |
| --- | --- | --- |
| T1 scope list, Storybook cert, G12 restatement, corpus index | scope list done on master (`commit-changes.sh:582`); cert still stale (`package.json:23`); restatement never written (cited by four plans) | M7-T2 (cert), M7-T7 (restatement, index) |
| T2 dependency, lint build order, CI step, type shim | shim GONE (`d91d0247`); dependency, `dependsOn`, CI step still open | M7-T1, M7-T2 |
| T3 preference + Settings control | element does not persist (0.1 row 3); the old amendment's "delete the key" is wrong | M7-T4, with the element's value list from M7-T3 |
| T4 `attachAccelerator` | OBSOLETE: the element does it (`webgpu.ts`) | the one import line, M7-T1 |
| T5 graph-ready + `useGpuAccelerator` | OBSOLETE: a DOM event exists (`#ensureAcceleration`'s `dispatchEvent`, `graphty-element.ts` `[u]`) | one frame listener and one read, M7-T5 |
| T6 chip + device-lost toast | still open; surfaces unchanged | M7-T5, sourced from the event |
| T7 `metricCost` constant | OBSOLETE (DEP-M7-C) | nothing |
| T8 stories + Chromatic leftover | still open; no story renders the status bar | M7-T6, fixed-model stories (DEP-M7-B) |
| T9 crossover harness, `gpuMinNodes`, visual check, record | measurement moved to M6-T9; the visual check of the layout is M6-T8's | M7-T6 (the app's own live check), M7-T7 (the record cites G6) |

---

## Phase M7: the app consumes the element's acceleration

Every task below runs in `$WT` (the v2 checkout after Phase M6), with `$APP = $WT/graphty` and `$EL = $WT/graphty-element`. "Run" lines are pasted from `$APP` unless they say otherwise. The app reads the element from source but the element's `webgpu.ts` reads the GPU package from `dist/`, so a fresh checkout runs `cd $WT && pnpm exec nx run-many -t build --projects=graph-format,layout,algorithms,webgpu-graph-algorithms,graphty-element` once before any app command that type-checks, tests or builds.

### Task M7-T1: The peer, the one import, the retention proof and the lint build order

**Repository:** `$WT`.

**Spec:** element design 4.12 activation (master `element-api-design.md:2812`, `v2 [u]` `:2899-2907`: "WebGPU activation is one import, and that is the consumer's entire integration"); `design/decisions/2026-09-19-graphty-element-owns-webgpu.md` ("A consumer opts in with one line and writes no integration code"); the old plan's T2 Steps 1-2 (`2026-09-19-webgpu-m7-graphty-app.md:375-405`), whose dependency and lint-order reasoning still holds.

**Files:**
- Modify: `graphty/package.json` (`dependencies`, `:31-46`), `graphty/src/main.tsx` (`:7-15`), `graphty/project.json` (the `lint` target, `:38-44`), `knip.config.ts` `[u]` (the `graphty` block, `:165-179` in v2; `:155-169` on master), `pnpm-lock.yaml` (the install writes it)
- Modify only if Step 3 says so: `graphty-element/package.json` (`sideEffects`, `:58-66`) `[u]` and `graphty-element/test/packaging/exports-map.test.ts` (the assertion that pins the list)
- NOT touched: `graphty/vite.config.ts`, `graphty/tsconfig.json` (0.7), `graphty/src/types/` (the shim the old T2 deleted is already gone: `ls graphty/src/types/graphty-element.d.ts` -> No such file; `jsx.d.ts` there is M7-T4's)

**Interfaces:**
- Consumes: the element's `./webgpu` export (`graphty-element/package.json:43-46`); the alias rules (`graphty/vite.config.ts:40-46`, `graphty/tsconfig.json:37`).
- Produces: an app whose bundle registers the WebGPU accelerator factory on load; a `graphty:lint` that builds its closure first; a manifest that installs the element's optional peer.

**PLAN DECISION PD-1 (where and after what).** M7 executes on the version 2 element branch, in the checkout `$WT`, after Phase M6 (re-planned) has landed there: the plan's file paths are the v2 tree's, its element citations are the v2 element's, and its two design citations styles are 0.1's. The app's five tasks (M7-T1 .. M7-T5) need M6-T1 in the tree (one controller, so the document the chip reads and the attribute the control writes are the same controller's); the live check (M7-T6 Step 3) and the gate (M7-T7) need the whole of M6 (the element actually using the accelerator, and the G6 record's `minNodes` number the G12 record cites). Rejected: executing on master first and forward-porting to v2 -- master's element has no `acceleration` attribute, no `./webgpu` entry and no capabilities event (0.1 row 1), so every task would be written twice; and executing before M6-T1 -- R-M7-1 is the failure that produces.

**PLAN DECISION PD-2 (the dependency and its knip entry).** `"@graphty/webgpu-graph-algorithms": "workspace:*"` goes into `graphty/package.json` `dependencies` after `"@graphty/graphty-element": "workspace:*"` (`:37`), the spelling every workspace dependency of this private app already uses (`:36-37`); the design's `workspace:^` (integration plan `:3259`) would matter only for a published package, and `graphty` is `"private": true` (`:4`). The app installs it because the element DECLARES it as an optional peer and `auto-install-peers` (root `.npmrc:1`) installs missing NON-optional peers only: today the package resolves through the root hoist alone (`ls graphty/node_modules/@graphty/` lists `compact-mantine` and `graphty-element`; `ls node_modules/@graphty/` lists the GPU package), and a consumer that resolves its element's peer through a hoisting accident is not a consumer a third party could copy. knip's `graphty` workspace (`knip.config.ts:165-179` `[u]`) gains the package under `ignoreDependencies` with the comment "installed on graphty-element's behalf: its optional peer, activated by `import "@graphty/graphty-element/webgpu"` in src/main.tsx and imported by nothing in this app", the mirror of the element's own entry at `:141-145`. Rejected: leaving the manifest alone (the hoisting accident) and importing the package from the app to satisfy knip (the app would then be an importer, which is the design 9.1 shape the ownership record retired).

**PLAN DECISION PD-3 (the import, and the proof it survives the bundle).** `main.tsx:7-15` already documents the hazard for the element itself: "a bare import like `import "@graphty/graphty-element"` gets tree-shaken away because nothing uses the exports", and holds the element in the bundle with a `typeof Graphty` guard. `webgpu.ts` exports NOTHING (`grep -n '^export' graphty-element/webgpu.ts` prints nothing), so no such guard can be written for it, and the app resolves it to the SOURCE file `../graphty-element/webgpu.ts` through the alias -- a path the element's `sideEffects` list (`./dist/webgpu.js`, `./dist/chunks/*.js`, three `./src/*/index.ts` entries) does not name. Whether the bundler keeps a bare import of an alias-resolved source file whose package lists it as side-effect-free only under its `dist/` name is a question a build answers, not a plan; Step 3 builds and greps. If the bundle carries the accelerator name, nothing else is needed. If it does not, the fix goes in the ELEMENT: `./webgpu.ts` (and, for symmetry with the three `./src/*/index.ts` entries already there, `./index.ts`) joins `sideEffects`, and the packaging test that pins the list gains the two entries. Rejected: a `treeshake.moduleSideEffects` override or a `/* @vite-ignore */`-style trick in `graphty/vite.config.ts` -- a workaround in the app for a manifest fact of the element, which is exactly the class of edit the root `CLAUDE.md` forbids, and which no other consumer that reads the element from source would get.

**PLAN DECISION PD-4 (the lint build order).** `graphty/project.json`'s `lint` target gains `"dependsOn": ["^build"]`. `graphty:lint` is `eslint && tsc --noEmit`; `tsc` follows the `tsconfig.json:37` alias into `../graphty-element/webgpu.ts`, which imports `@graphty/webgpu-graph-algorithms` and `.../browser`, which resolve through the GPU package's exports map to `webgpu-graph-algorithms/dist/*.d.ts`. An unbuilt `dist/` is an unresolved module and a red lint whose message says nothing about build order. CI is safe without it (both `ci.yml` paths build before they lint, `:81-113`); the case this closes is a bare `pnpm exec nx run graphty:lint` in a fresh tree, the command a contributor runs by hand. Precedent: `webgpu-graph-algorithms/project.json` already carries `dependsOn` on its own lint (the old plan's T2 Step 2 reasoning, still true).

- [ ] **Step 1: The dependency and the knip entry**

In `$APP/package.json` `dependencies`, after the `@graphty/graphty-element` line, add `"@graphty/webgpu-graph-algorithms": "workspace:*",`. In `$WT/knip.config.ts`, the `graphty` block's `ignoreDependencies` gains the package with the PD-2 comment.

Run: `cd $WT && HUSKY=0 pnpm install --frozen-lockfile; echo "rc=$?"`
Expected: FAIL with `ERR_PNPM_OUTDATED_LOCKFILE` -- the manifest names a dependency the lockfile does not; that failure is the proof the manifest edit landed. Then `cd $WT && HUSKY=0 pnpm install` and expect the `graphty` importer in `pnpm-lock.yaml` to gain `'@graphty/webgpu-graph-algorithms': specifier: workspace:* version: link:../webgpu-graph-algorithms`, `ls $APP/node_modules/@graphty/` to list `webgpu-graph-algorithms`, and the install to print no `unmet peer` line naming graphty-element (the range M6-T0 set admits the workspace version; if it prints one, M6-T0 has not landed -- 0.2 -- stop).

Run: `cd $WT && pnpm exec knip --workspace graphty; echo "rc=$?"`
Expected: `rc=0`, no "unused dependency" line for the GPU package.

- [ ] **Step 2: The import**

In `$APP/src/main.tsx`, directly after the `import { Graphty } from "@graphty/graphty-element";` line (`:10`) and BEFORE the `typeof Graphty` guard, add:

```ts
// The element's optional GPU peer, switched on. This is the whole integration: the element
// probes, constructs, attaches, applies its threshold and recovers, and reports through
// `capabilities.acceleration`. Nothing in this application touches WebGPU.
import "@graphty/graphty-element/webgpu";
```

Nothing else: no `typeof` guard (there is nothing to name), no try/catch, no `navigator.gpu` check.

Run: `cd $APP && npx tsc --noEmit; echo "rc=$?"`
Expected: `rc=0`. The alias resolves the subpath to `../graphty-element/webgpu.ts` and its imports resolve to the GPU package's built declarations (a fresh tree needs the build of the phase header first).

- [ ] **Step 3: The retention proof**

Run:

```bash
cd $APP && npm run build
grep -l "webgpu-graph-algorithms" dist/assets/*.js | wc -l
```

Expected: the build exits 0 and the count is at least 1 -- the string is the accelerator's registered name (`webgpu.ts:48`, `WEBGPU_ACCELERATOR_NAME = "webgpu-graph-algorithms"`), which reaches the bundle only if `webgpu.ts`'s body does. Record the count in the G12 record (item 13).

If the count is 0, the bare import was dropped, and PD-3's element fix applies: in `$EL/package.json` `sideEffects` (`:58-66`) add `"./webgpu.ts"` and `"./index.ts"` after `"./dist/chunks/*.js"`, update the assertion in `$EL/test/packaging/exports-map.test.ts` that pins the list (find it with `grep -n sideEffects $EL/test/packaging/exports-map.test.ts`), re-run `cd $EL && pnpm exec vitest run --project=default test/packaging` (PASS), then rebuild the app and re-run the grep (count >= 1). The G12 record's findings say which branch was taken; the element edit is committed under the `graphty-element` scope as a second commit of this task.

- [ ] **Step 4: The lint build order**

In `$APP/project.json`, the `lint` target (`:38-44`) gains `"dependsOn": ["^build"]` after its `options` block, the shape `build` already has at `:15`.

Run: `cd $WT && pnpm exec nx run graphty:lint`
Expected: the closure builds first (Nx prints the dependency targets), then `eslint` and `tsc --noEmit` exit 0.

- [ ] **Step 5: Checkpoint**

Run: `cd $APP && npx vitest run src/components/Graphty.test.tsx && cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty/package.json graphty/project.json graphty/src/main.tsx knip.config.ts; echo "rc=$?"`
Expected: the wrapper's three cases pass unchanged -- not because of the test's `vi.mock("@graphty/graphty-element", ...)` (`Graphty.test.tsx:6-11`; a mock of one specifier does not cover the `/webgpu` subpath) but because no test imports `main.tsx` at all (`grep -rln "main\.tsx\|from ['\"]\.\{1,2\}/main['\"]" graphty/src --include='*.test.*'` prints nothing; a bare `grep -rln 'main'` prints ten files on substring hits such as "domain" and "remain"), so the new import line is never evaluated under vitest; the grep prints nothing, `rc=1`.

**Deliverables:** the dependency and the lockfile; the knip entry; the one import; the retention count; the lint `dependsOn`; possibly the two `sideEffects` entries in the element.

**Commit (owner):** `build(graphty): install the GPU peer and switch on acceleration with one import`; plus, only if Step 3 took the element branch, `build(graphty-element): list the source entry points as side effects for source-aliasing consumers`.

---

### Task M7-T2: The CI build step and the Storybook certificate

**Repository:** `$WT`.

**Spec:** the integration plan's M7 cell (`:3259`: "at that point the `Build graph-format, graph-io and webgpu-graph-algorithms (PR)` step of `ci.yml` becomes redundant for it"); the old plan's T2 Step 4 (`:425-470`), whose closure argument still holds and is restated here; the old plan's T1 Step 1b (`:240-260`). (The old plan's line numbers here and below include its six-line superseded banner.)

**Files:**
- Modify: `.github/workflows/ci.yml` (`:85-92`), `graphty/package.json` (`:23`, the `storybook` script)
- NOT touched: `ci.yml`'s `chromatic-app` job (`:630-664`; the `Run Chromatic` step `:656-664` has TurboSnap off and `exitZeroOnChanges: false` at `:661`), the shard download steps (`:440-499`)

**PLAN DECISION PD-5 (the step narrows to two projects).** After M7-T1 the GPU package is in graphty's dependency closure, so a PR that makes graphty affected builds it through `^build`. The step does not vanish: `graph-io` is in NO package's closure (`grep -rn "graph-io" */package.json` finds no dependant), so a PR touching only `graph-io/` has the affected set `{graph-io}`, `nx affected -t build` builds graph-io and its `^build` (graph-format) and stops, `webgpu-graph-algorithms/dist/` is never written, and the UNCONDITIONAL upload of that artifact (`ci.yml`, the `Upload webgpu-graph-algorithms build` step) produces an empty artifact that every shard's download step then fails on. So the step keeps `graph-io` and `webgpu-graph-algorithms` and drops only `graph-format`, which both of them reach through `^build`.

- [ ] **Step 1: The CI step**

Replace `ci.yml:85-92` (the eight-line comment-plus-step whose name is `Build graph-format, graph-io and webgpu-graph-algorithms (PR)`) with a step named `Build graph-io and webgpu-graph-algorithms (PR)` running `pnpm exec nx run-many -t build --projects=graph-io,webgpu-graph-algorithms --parallel=2`, with a comment carrying PD-5's two facts: graph-io is in no closure; the GPU package is in graphty's closure now (M7-T1) but a graph-io-only PR still leaves it unbuilt against an unconditional upload; graph-format is reached by both.

Run: `cd $WT && python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yml')); print([s['name'] for s in d['jobs']['build']['steps'] if 'name' in s][:12])"`
Expected: the list contains `Build graph-io and webgpu-graph-algorithms (PR)` and not the three-project name; the file parses.

Then the case the landing PR cannot exercise (the M7 PR touches `graphty/`, so it makes graphty affected): the owner pushes a scratch branch whose only change is one line appended to `graph-io/README.md`, opens it as a draft PR, reads the `build` job's upload steps (the nine `build-*` package artifacts of `ci.yml:143-204`, all non-empty; the job also uploads five Storybook builds on a PR, `:206-240`, and every test shard downloads the nine package builds plus the graphty-element Storybook, `:440-499`) and the 20 shards (all green), and closes it unmerged. This is G12 item 12.

- [ ] **Step 2: The Storybook certificate**

`graphty/package.json:23` names `~/ssl/STAR_ato_ms.crt`, which does not exist (`ls ~/ssl` on 2026-09-21: `atoms.crt`, `atoms.key`, `atoms_chain.crt`, `atoms.pem`, ...), so `npm run storybook` does not start in this package. Change `--ssl-cert ~/ssl/STAR_ato_ms.crt` to `--ssl-cert ~/ssl/atoms.crt`; the key half already names `~/ssl/atoms.key`. Those two are the pair the root `.env:1-2` points every other dev server at (`.env` is gitignored and lives in the main checkout only; the paths in it are the dev box's).

Run: `cd $WT && sed -n 23p graphty/package.json && ls -l /home/apowers/ssl/atoms.crt /home/apowers/ssl/atoms.key`
Expected: the script names `~/ssl/atoms.crt`; both files exist.

**Deliverables:** the narrowed step with its comment; the scratch-PR evidence; the certificate path.

**Commit (owner):** `ci: drop graph-format from the explicit PR build now that graphty reaches the GPU package` and `fix(graphty): point the Storybook script at a certificate that exists`.

---

### Task M7-T3: The element exports the acceleration policy list and its guard

**Repository:** `$WT`.

**Spec:** root `CLAUDE.md` "The app MUST NOT work around graphty-element" (copying "constants, enums, palettes, option schemas or types into the app because importing them is impossible" is forbidden; the fix goes in the element); element design's attribute row (master `:531`, v2 `[u]` `:533`: `auto`/`off`/`required`, default `auto`).

**Files:**
- Modify: `graphty-element/src/acceleration/types.ts` (after `AccelerationPolicy`, `:55`), `graphty-element/src/acceleration/index.ts` (the value export block, `:28-33`), `graphty-element/index.ts` `[u]` (the value export line, `:277`), `graphty-element/session.ts` `[u]` (the acceleration type-export block, `:305-317`), `graphty-element/src/graphty-element.ts` `[u]` (the `#accelerationPolicy` field initialiser, `:40`; the `acceleration` setter's three-way check), `graphty-element/src/acceleration/AccelerationController.ts` (the constructor's `options.policy ?? "auto"`, `:226`), `graphty-element/src/session/GraphSession.ts` `[u]` (`resolveAcceleration`'s `?? "auto"` fallback, `:983`), `graphty-element/src/Graph.ts` `[u]` (the `policy: "auto"` M6-T1 Step 1 hands the controller, M6 v2 plan `:362`)
- NOT touched: `graphty-element/docs/guide/acceleration.md` -- it is M6-T8's deliverable (M6 v2 plan `:794`) and does not exist when this task may run; the one guide sentence about these exports is M7-T7 Step 1's, which waits for the whole of M6
- Create: `graphty-element/test/acceleration/policies.test.ts` (new)

**Interfaces:**
- Produces: `export const ACCELERATION_POLICIES: readonly AccelerationPolicy[] = ["auto", "off", "required"];`, `export const ACCELERATION_POLICY_DEFAULT: AccelerationPolicy = "auto";` and `export function isAccelerationPolicy(value: unknown): value is AccelerationPolicy`, all three exported from `.` and `./session`.

**PLAN DECISION PD-6 (one declaration of the three values, and of the default).** The element already validates the attribute with `value !== "auto" && value !== "off" && value !== "required"` (the `acceleration` setter, `graphty-element.ts` `[u]`) and writes its default `"auto"` as a literal in four places once M6-T1 has landed (the element's field `graphty-element.ts:40`; the controller's `AccelerationController.ts:226`; the session's `resolveAcceleration` fallback, `GraphSession.ts:983` `[u]`, which M6-T1 keeps for a headless session; and the `policy: "auto"` M6-T1 Step 1 passes from `Graph.ts`, M6 v2 plan `:362`); a control in any host needs the same list to offer its options, the same guard to validate what storage or a change handler hands back, and the same default to fall back to. Declaring all three once in `src/acceleration/types.ts` (Node-safe by design, `types.ts:16-17`) and exporting them through `./session` (the entry the app already imports `DEFAULT_LIMITS` from, `SettingsOverlay.tsx:2`) gives every consumer the values and the default and gives the setter its guard, so neither the list nor the default can drift from the element's own. Rejected: the app declaring `["auto", "off", "required"] as const satisfies readonly AccelerationPolicy[]` -- a type-checked copy is still a copy, and the type check would not catch a value the element ADDS; and the app's store hard-coding `"auto"` as "the element's default" -- a copied constant that a change of the element's default would silently leave behind.

- [ ] **Step 1: The declaration** -- in `types.ts` after `AccelerationPolicy`: the list (with a JSDoc line: "The three values, in the order a control offers them"), the default (`ACCELERATION_POLICY_DEFAULT`, JSDoc: "What the element does when nothing was asked: `auto`") and the guard (`typeof value === "string" && (ACCELERATION_POLICIES as readonly string[]).includes(value)`). Export all three from `src/acceleration/index.ts`'s value block, from `index.ts:277`'s value export, and from `session.ts` as a NEW value export beside the existing `export type { ... } from "./src/acceleration"` (the entry has only a type export from that module today; `DEFAULT_LIMITS` at `:317` is the shape of a value export there).

- [ ] **Step 2: The setter and the four initialisers** -- `graphty-element.ts`'s `acceleration` setter replaces the inline three-way comparison with `if (!isAccelerationPolicy(value))`; the message and behaviour are unchanged. The four `"auto"` literals PD-6 names -- the field initialiser `#accelerationPolicy: AccelerationPolicy = "auto"` (`:40`), the controller's `this.#policy = options.policy ?? "auto"` (`AccelerationController.ts:226`), `resolveAcceleration`'s `?? "auto"` (`GraphSession.ts:983` `[u]`) and `Graph.ts`'s `policy: "auto"` (M6-T1's) -- all read `ACCELERATION_POLICY_DEFAULT` instead; `cd $EL && grep -rn '"auto"' src/acceleration src/session/GraphSession.ts src/Graph.ts src/graphty-element.ts | grep -v '^\S*:\s*[/*]'` then prints only the error message's text and doc comments, no assignment.

- [ ] **Step 3: The tests** -- `test/acceleration/policies.test.ts` (the `default` project; `assert` from vitest, the house style): "the list carries exactly the three policies in order", "the default is one of them and is auto" (`ACCELERATION_POLICY_DEFAULT === "auto"` and `isAccelerationPolicy(ACCELERATION_POLICY_DEFAULT)`), and "the guard accepts each of them and rejects a near miss, a number and undefined" (`requried`, `1`, `undefined`).

Run: `cd $EL && pnpm exec vitest run --project=default test/acceleration test/packaging && pnpm exec vitest run --project=browser test/browser/acceleration-attribute.test.ts && pnpm run lint`
Expected: PASS; the Node-safe entries test (`test/packaging/node-safe-entries.test.ts`) still green (`types.ts` imports only `../errors` types); the attribute file's case count unchanged from before this task (15 today by `grep -c '^\s*test(' test/browser/acceleration-attribute.test.ts` -- the file uses `test(`, not `it(` -- plus whatever M6-T1 Step 4 added; count before editing, compare after); lint green.

**Deliverables:** the list, the default, the guard, four export lines, the setter on the guard and the four initialisers on the default, three tests.

**Commit (owner):** `feat(graphty-element): export the acceleration policy list and its guard`

---
### Task M7-T4: The reader's policy -- the store, the Settings > Performance control and the tag

**Repository:** `$WT`.

**Spec:** element design v2 `[u]` `:541-545` ("the app keeps its own storage key and writes the attribute when it mounts the element") and `:2882-2888` (master's copy has neither; 0.2's design criterion); `graphty-element.ts:2604-2655` `[u]` (the attribute: applies at once, a bad value logged and kept out); the app spec's Settings > Performance pane (`SettingsOverlay.tsx:98-108` `[u]`); root `CLAUDE.md` "UI Components" (default Mantine components).

**Files:**
- Create: `graphty/src/components/shell/defaults/accelerationSettings.ts` (new), `graphty/src/components/shell/defaults/__tests__/accelerationSettings.test.ts` (new)
- Modify: `graphty/src/components/shell/panel/SettingsOverlay.tsx` `[u]` (`SettingsOverlayProps` `:230`; the `SettingsOverlay` function `:274`; the `performance` branch `:488`; a new `AccelerationSettingsPane` beside `LabelSettingsPane` `:173`), `graphty/src/components/shell/panel/__tests__/SettingsOverlay.test.tsx` (the 21 inline renders and the Performance describe `:206-323`), `graphty/src/components/shell/canvas/CanvasRegion.tsx` (`CanvasGraphConfig` `:82-104`; the `<Graphty>` element `:435-446`), `graphty/src/types/jsx.d.ts` (the `"graphty-element"` entry, `:5-13`), `graphty/src/components/Graphty.tsx` `[u]` (`GraphtyProps` `:69-84`; the local `GraphtyElementType` `:19-33`; `GraphtyHandle` `:188-203`; the dead `IntrinsicElements` declaration `:206-210`, deleted; the function's destructure `:212-215`; the `useImperativeHandle` object `:225-337`; the tag `:490-497`), `graphty/src/components/Graphty.test.tsx` (one case), `graphty/src/components/shell/AppShell.tsx` `[u]` (the state beside `settingsSection` `:1170`; `canvasProps.graph` `:4668-4674`; the `<SettingsOverlay>` element `:4996-4999`), `graphty/src/components/shell/__tests__/AppShell.test.tsx` `[u]` (two cases)
- NOT touched: `graphty/src/components/shell/defaults/loadDefaults.ts` (the label settings keep their own key; a second record in the same module would let one bad write corrupt the other), `graphty/src/components/shell/types.ts`

**Interfaces:**
- Consumes: `AccelerationPolicy`, `ACCELERATION_POLICIES`, `isAccelerationPolicy` from `@graphty/graphty-element/session` (M7-T3); `SegmentedControl` and `Input.Wrapper` from `@mantine/core`; `PANEL_GRID`, `PANEL_INK` from `@graphty/compact-mantine` (as `SettingsOverlay.tsx:1` already does).
- Produces: `ACCELERATION_SETTINGS_STORAGE_KEY = "graphty.shell.acceleration.v1"`, `PersistedAccelerationSettings { readonly policy: AccelerationPolicy }`, `DEFAULT_ACCELERATION_SETTINGS`, `readPersistedAccelerationSettings(): Partial<PersistedAccelerationSettings>`, `writePersistedAccelerationSettings(settings)`, `resolveAccelerationSettings(partial)`; two new `SettingsOverlayProps` members `accelerationPolicy: AccelerationPolicy` and `onAccelerationPolicyChange: (policy: AccelerationPolicy) => void` (both required, for the reason `aiProviders` is: a pane with no value could only draw a control that drops what is clicked); `CanvasGraphConfig.acceleration?: AccelerationPolicy`; `GraphtyProps.acceleration?: AccelerationPolicy`; `GraphtyHandle.session: GraphSession | null` (the element's `session` getter, `graphty-element.ts:82-84` `[u]`, typed from the element's exported `GraphtyElement` type -- `export type GraphtyElement = Graphty;`, the last line of `graphty-element.ts`, committed -- and read through the handle the way `graph` already is, `:334-336`; M7-T5 reads the initial status through it).

**PLAN DECISION PD-7 (the store).** A versioned `localStorage` key `graphty.shell.acceleration.v1` in its own module, copying the READ and the WRITE of `loadDefaults.ts:63-170` `[u]` (the resolve deliberately differs, below): a versioned key so a shape change becomes a missing key rather than a corrupt read, a try/catch round the store (private mode and disabled site data throw), `JSON.parse` in its own try, non-objects and arrays refused, and the one field validated with `isAccelerationPolicy` (a stored `"maybe"` costs the field, not the record). `resolve*` validates rather than spreading blind, unlike `resolveLabelSettings` (`:163`, `{ ...DEFAULT_LABEL_SETTINGS, ...persisted }`): object spread copies a key whose VALUE is `undefined`, so `{ ...DEFAULT, ...{ policy: undefined } }` would be `{ policy: undefined }`; the resolver returns the default for anything the guard rejects. The default is `ACCELERATION_POLICY_DEFAULT`, imported from the element (M7-T3), never the literal `"auto"`: a literal would be a copy of `graphty-element.ts:40`'s initialiser, and a change of the element's default would leave the app's stored default behind. The SHELL owns the state: `SettingsOverlay` is handed a value and a callback, the way it is handed `aiProviders`, and the shell writes storage in the callback -- because the change must reach the canvas LIVE, and the pane's storage-only pattern (`LabelSettingsPane`) has no route to it (its own `NEXT_LOAD_LINE` comment, `:137-143`, says so and asks whoever owns `AppShell` to close that gap; this task closes it for the one control that needs it).

**PLAN DECISION PD-8 (the control).** A Mantine `SegmentedControl` with the three entries of `ACCELERATION_POLICIES` (labels `Automatic`, `Off`, `Required`), wrapped in a Mantine `Input.Wrapper` for its label ("GPU acceleration") and description ("Automatic uses the GPU when this browser has one and the CPU otherwise. Required refuses to run without one."), followed by the sentence `Applies at once.` in the same span style as `NEXT_LOAD_LINE`. A three-value choice whose values are all visible is what a segmented control is for; `Select` hides two of three behind a click and hands back `string | null`. `data-testid="settings-acceleration"` on the pane and `settings-acceleration-policy` on the control, the pane's own convention (`settings-labels` `:185`, `settings-labels-switch` `:197`). The `onChange` maps the control's `string` back through `isAccelerationPolicy` and falls back to the default, so a value the control cannot produce today but a future Mantine could is never written to the element.

**PLAN DECISION PD-9 (the policy rides on the tag).** `Graphty.tsx` gains an `acceleration?: AccelerationPolicy` prop and renders it on the tag: `<graphty-element ref style acceleration={acceleration}>`. React 19 assigns a JSX prop on a custom element as a property when the element defines one (`graphty-element/react.ts:4-7`: "React 19 assigns a JSX prop that matches a custom element property as a property rather than an attribute") and as an attribute otherwise, BEFORE the node is inserted -- so the element's `acceleration` setter runs before `connectedCallback` starts the probe (`graphty-element.ts:236` `[u]`), and a reader whose stored choice is `off` never causes an adapter request. An effect after mount (the pattern `layout` and `viewMode` use, `:369-388` `[u]`) would arrive after a probe under `auto` had already begun. A change of the prop after mount re-assigns the property and the setter applies it at once (`:2641-2655` `[u]`), which is what makes the Settings control live. The JSX declaration TypeScript consults is `graphty/src/types/jsx.d.ts` (`declare module "react" { namespace JSX { interface IntrinsicElements { "graphty-element": ... } } }`, six typed attributes today); its `"graphty-element"` entry gains `acceleration?: AccelerationPolicy;` (a type import from `@graphty/graphty-element/session` at the top of the file, beside the `react` one). The declaration at `Graphty.tsx:206-210` `[u]` is NOT that one: it augments a module-level `React.IntrinsicElements`, an interface @types/react 19 never reads for JSX (the compiler resolves `React.JSX.IntrinsicElements`), so a prop added only there leaves `acceleration` an excess property on the tag and `tsc` red; Step 4 deletes it. That the app declares the typing at all is an element gap: every React 19 consumer of the element needs the same JSX augmentation, so by the root `CLAUDE.md` rule it is element surface, and the element's `./react` entry is reserved for exactly that and empty (`graphty-element/react.ts:11-15`: "Nothing of that exists yet"). This task widens what is there by one prop because that is the smallest edit; the gap is written into the G12 record's findings (M7-T7) with the rest of the wrapper's duck-typing (0.7), for the v2 branch's own clean-up. In the app's tests the element is unregistered (shell tests) or a mock without the accessor (`Graphty.test.tsx`), so React writes the ATTRIBUTE there, and the assertions read `getAttribute("acceleration")` with the "property or attribute" tolerance `Graphty.test.tsx:52-62` already uses for `layout`.

- [ ] **Step 1: The failing store test**

Create `$APP/src/components/shell/defaults/__tests__/accelerationSettings.test.ts` (the shape of `loadDefaults.test.ts:1-40` `[u]`: `expect`, a `beforeEach` that removes the key):

- "defaults to the element's own default" (`DEFAULT_ACCELERATION_SETTINGS.policy === ACCELERATION_POLICY_DEFAULT`);
- "round-trips every policy the element lists" (`for (const policy of ACCELERATION_POLICIES) { write({ policy }); expect(resolve(read()).policy).toBe(policy); }`);
- "reads an absent key as the default";
- "drops malformed JSON, a non-object, an array and a value the element does not accept" (`"{"`, `'"auto"'`, `"[1]"`, `'{"policy":"maybe"}'`, `'{"policy":1}'` each read as `{}`);
- "reads an explicit undefined as the default, not as undefined" (`resolve({ policy: undefined })` equals the default).

Run: `cd $APP && npx vitest run src/components/shell/defaults/__tests__/accelerationSettings.test.ts`
Expected: FAIL -- `Failed to resolve import "../accelerationSettings"`.

- [ ] **Step 2: The store**

Create `$APP/src/components/shell/defaults/accelerationSettings.ts` with the six exports of the Interfaces block, each function the twin of its `loadDefaults.ts` namesake (`readPersistedLabelSettings` `:103`, `writePersistedLabelSettings` `:149`, `resolveLabelSettings` `:163` `[u]`), with the one field validated by `isAccelerationPolicy`, `DEFAULT_ACCELERATION_SETTINGS` built as `{ policy: ACCELERATION_POLICY_DEFAULT }` (imported from `@graphty/graphty-element/session`), and the resolver returning `{ policy: isAccelerationPolicy(persisted.policy) ? persisted.policy : DEFAULT_ACCELERATION_SETTINGS.policy }`. The header JSDoc says why the key is separate from `graphty.shell.labels.v1` and why the element does not persist this (cite `graphty-element.ts`'s `acceleration` remarks).

Run: the Step 1 command. Expected: 5 passed. Then `cd $APP && npx eslint src/components/shell/defaults && npx tsc --noEmit` exit 0 (the jsdoc rules of `eslint.config.js:74-84` want a description on every export and every param).

- [ ] **Step 3: The pane and its props**

In `SettingsOverlay.tsx` `[u]`:
  - `SettingsOverlayProps` gains `accelerationPolicy` and `onAccelerationPolicyChange` (documented: "the reader's acceleration policy, owned by the shell so a change reaches the canvas at once; the shell writes storage").
  - A new `AccelerationSettingsPane({ policy, onChange })` component beside `LabelSettingsPane`, per PD-8; it holds no state (the value is the shell's).
  - The `performance` branch (`:488`) renders `<AccelerationSettingsPane policy={accelerationPolicy} onChange={onAccelerationPolicyChange} />` ABOVE `<LabelSettingsPane />` (the machine-level setting first, the per-load one under it), the two separated by the pane's existing gap.
  - The `SHIPPED_SECTION_IDS` comment (`:98-108`) gains one sentence: "The acceleration policy joined it with this phase: it is the element's `acceleration` attribute, the one setting 7.2's Performance branch names that the element leaves to the host to remember."

In `SettingsOverlay.test.tsx`: every inline `<SettingsOverlay ... aiProviders={emptyKeyStore()} />` (21 of them) gains `accelerationPolicy="auto" onAccelerationPolicyChange={vi.fn()}` (a search-and-replace on the `aiProviders={emptyKeyStore()}` token); the Performance describe's `openPerformance()` helper (`:208-211`, which renders fixed props and then clicks the `Performance` tab) gains an optional `props: Partial<SettingsOverlayProps>` parameter spread after its defaults, because two of the cases below hand it another policy and a captured callback; it is what each new case opens the pane with, and the describe gains:
  - "draws the acceleration control above the label controls" (`getByTestId("settings-acceleration")` present; the three radios `Automatic`, `Off`, `Required` present through `getByRole("radio", { name })`);
  - "shows the policy it is handed" (`openPerformance({ accelerationPolicy: "off" })`; the `Off` radio is checked);
  - "reports a change and writes nothing itself" (`const onChange = vi.fn(); openPerformance({ onAccelerationPolicyChange: onChange });` click `Required`; `onChange` called once with `"required"`; `window.localStorage.getItem(ACCELERATION_SETTINGS_STORAGE_KEY)` is null -- the shell writes, not the pane);
  - "says the change applies at once, because it does" (`getByText("Applies at once.")`).

Run: `cd $APP && npx vitest run src/components/shell/panel/__tests__/SettingsOverlay.test.tsx`
Expected: PASS, the file's previous count plus four.

- [ ] **Step 4: The tag**

In `graphty/src/types/jsx.d.ts`: the `"graphty-element"` entry gains `acceleration?: AccelerationPolicy;` after `"style-template"`, with `import type { AccelerationPolicy } from "@graphty/graphty-element/session";` beside the `react` import (PD-9). In `Graphty.tsx` `[u]`: `GraphtyProps` gains `/** The element's acceleration policy, written on the tag so it is in force before the probe starts. */ acceleration?: AccelerationPolicy;` (import the type from `@graphty/graphty-element/session`, beside `GraphSession`); the destructure adds `acceleration`; the dead `declare module "react" { interface IntrinsicElements ... }` block (`:206-210`) is deleted (PD-9: nothing reads it); the tag gains `acceleration={acceleration}`. And the handle: the local `GraphtyElementType` (`:19-33`) takes the new member from the element's OWN type rather than re-declaring it -- `import type { GraphtyElement } from "@graphty/graphty-element";` (type-only, so it costs the bundle nothing; `main.tsx:10` already imports the class from that entry) and `interface GraphtyElementType extends HTMLElement, Pick<GraphtyElement, "session">` -- with a comment above the interface: the ten members it still declares by hand are a duck-type of the element that the element's exported `GraphtyElement` makes unnecessary (root `CLAUDE.md`, "duck-typing or re-declaring the element's types"), kept only because replacing the interface wholesale touches every effect in this file and is the v2 branch's clean-up, recorded in the G12 findings; no member is added to it by hand again. `GraphtyHandle` gains `/** The element's session, or null before the element upgraded. The element publishes its capabilities here. */ session: GraphSession | null;`, and the `useImperativeHandle` object gains `get session() { return graphtyRef.current?.session ?? null; }` beside `get graph()` (`:334-336`) -- so a shell that wants the session reads the element's own property through the handle, not `elementSession()`'s duck-typing of `graph` (0.7 lists that helper as an element gap; this task adds no ninth call site to it). `CanvasRegion.tsx`: `CanvasGraphConfig` gains `/** The element's acceleration policy. */ readonly acceleration?: AccelerationPolicy;` and the `<Graphty>` element passes `acceleration={graph?.acceleration}`.

In `Graphty.test.tsx`, two cases after the layout case: "writes the acceleration policy on the tag" -- render `<Graphty layers={[]} acceleration="off" />`, then `vi.waitFor` that `element.getAttribute("acceleration") === "off"` or the property reads `"off"` (the mock has no accessor, so the attribute is what lands; the tolerance is the same the layout case uses); and "exposes the element's session through the handle, null until the element has one" -- render with a `ref`, `ref.current?.session` is `null` against the mock (it defines no `session`), then define `session` on the mock's prototype (or the node) as a stub object and read it back through the handle.

Run: `cd $APP && npx vitest run src/components/Graphty.test.tsx && npx tsc --noEmit`
Expected: 5 passed; tsc clean (the widened `jsx.d.ts` entry is what lets the tag take the prop; with the prop added to the deleted `Graphty.tsx` declaration instead, `tsc` reports `Property 'acceleration' does not exist on type ...IntrinsicElements["graphty-element"]`).

- [ ] **Step 5: The shell**

In `AppShell.tsx` `[u]`:
  - Beside `settingsSection` (`:1170`): `const [accelerationPolicy, setAccelerationPolicy] = useState<AccelerationPolicy>(() => resolveAccelerationSettings(readPersistedAccelerationSettings()).policy);` -- an initialiser, not an effect, so the tag carries the stored policy on its FIRST render (PD-9 depends on it). And `const changeAccelerationPolicy = useCallback((policy: AccelerationPolicy): void => { setAccelerationPolicy(policy); writePersistedAccelerationSettings({ policy }); }, []);` with a comment: the shell writes because it owns the state; storage is the reader's memory, the element is the reader's canvas, and both are written from the one place.
  - `canvasProps.graph` (`:4668-4674`) gains `acceleration: accelerationPolicy,`.
  - `<SettingsOverlay>` (`:4996-4999`) gains `accelerationPolicy={accelerationPolicy}` and `onAccelerationPolicyChange={changeAccelerationPolicy}`.
  - Imports: the type and the three store functions.

In `AppShell.test.tsx` `[u]`, a describe "the acceleration policy" with:
  - "mounts the element with the policy the reader stored" (set `localStorage` to `{"policy":"off"}` before `renderMeasuredShell()`; `container.querySelector("graphty-element")?.getAttribute("acceleration")` is `"off"`; clear the key in `afterEach`);
  - "writes a change to the element at once and remembers it" (render; click the rail's `Settings` button as `:1295` does; then `fireEvent.click(screen.getByRole("tab", { name: "Performance" }))`, because the overlay opens on its first section, Appearance, and draws only the active section's pane (`SettingsOverlay.tsx:277,294,488`; the same click `SettingsOverlay.test.tsx:210` makes); then click `getByRole("radio", { name: "Required" })`; the tag's attribute reads `"required"` and storage holds `{"policy":"required"}`).

Run: `cd $APP && npx vitest run src/components/shell/__tests__/AppShell.test.tsx && npx eslint src/components && npx tsc --noEmit`
Expected: PASS with two new cases; eslint and tsc clean.

- [ ] **Step 6: Checkpoint** -- `cd $APP && npx vitest run` green; `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the ten touched files prints nothing. Nothing is committed by this task alone if the owner prefers one commit for T4 and T5; the subject below is for the T4 state.

**Deliverables:** the store and five tests; the pane, two props, four tests; the `jsx.d.ts` prop, the tag prop through `CanvasRegion` and `Graphty`, the handle's `session` from the element's type, the dead declaration deleted, two tests; the shell state, two tests.

**Commit (owner):** `feat(graphty): remember the reader's acceleration policy and write it to the element`

---
### Task M7-T5: The acceleration chip and the device-lost report

**Repository:** `$WT`.

**Spec:** element design 4.10.1 as v2's uncommitted copy has it (`v2 [u]` `:2543-2551`: the mirror "is what an acceleration status chip listens to: a page with a `<graphty-element>` tag and six lines of script can show whether the GPU is in use, say why it is not, and update itself when a device is lost"; master's 4.10.1, `:2476`, lists no such event, and v2's COMMITTED copy already has the mirror row -- the M6 v2 plan's DEP-M6-B, `:145`: "closed by the merge ... nothing to amend"), 4.12 (`v2 [u]` `:2806-2821`, the six states; "A consumer shows nothing definitive while [probing] is the state"; master `:2737` has five states and no probing rule); design 9.5's indicator text ("GPU acceleration: on (NVIDIA lovelace) / off", `:3249`) and P12's "device-loss UX (toast ...)" (`:4219`); the old plan's T6 (`:1457-1762`), whose surfaces and decisions survive with the source of the status changed.

**Files:**
- Create: `graphty/src/components/shell/statusbar/formatAcceleration.ts` (new), `graphty/src/components/shell/statusbar/__tests__/formatAcceleration.test.ts` (new)
- Modify: `graphty/src/components/shell/statusbar/statusBarModel.ts` (type-only widening; the import at `:15`; `StatusBarSlotsModel` `:84-89`), `graphty/src/components/shell/statusbar/StatusBarSlots.tsx` (`StatusBarIssuesSlot` `:319-347`; the type imports `:17-29`), `graphty/src/components/shell/statusbar/StatusBar.tsx` (`visibleIssues` `:109-121`; the imports `:27,31`), `graphty/src/components/shell/statusbar/__tests__/StatusBar.test.tsx` (three cases), `graphty/src/components/shell/AppShell.tsx` `[u]` (a state beside `loadFailure` `:1061`; a frame listener beside the `data-loading-error` one `:1846-1885`; a memo ABOVE the `slots` memo `:4232`; the `slots` memo's two exits; `loadCompletion` `:4293-4306` renamed; its one use `:5033`; one constant beside `OPEN_DATA_ACTION` `:294`), `graphty/src/components/shell/__tests__/AppShell.test.tsx` `[u]` (one helper, six cases), `graphty/src/test/fakeSession.ts` `[u]` (one member on the `session` literal)
- NOT touched: `graphty/src/components/shell/types.ts` (the frozen contract; `statusBarModel.ts:1-13` is the documented place to widen it), `shell/constants.ts` (`issues` is already in `STATUS_BAR_NEVER_DROP`, `:795`), `statusbar/LoadCompleteToast.tsx` (the component does not change; its producer does), `statusbar/StatusBarChip.tsx`, `src/components/Graphty.tsx` (the status arrives on the frame; the wrapper needs no new prop)

**Interfaces:**
- Consumes: `AccelerationStatus` from `@graphty/graphty-element/session`; `GraphtyHandle.session` (M7-T4 Step 4); `StatusBarChip` and the local `StatusDot` (`StatusBarSlots.tsx:74`); `STATUS_BAR_GEOMETRY.AI_DOT` (`statusBarGeometry.ts:85`, 6 px); `PANEL_INK.SUCCESS` / `PANEL_INK.CHROME` (`compact-mantine/src/constants/panel.ts:245`); `StatusBarCompletion` (`statusBarModel.ts:117-150`).
- Produces: `formatAcceleration(status: AccelerationStatus): AccelerationChipText | null` where `AccelerationChipText = { readonly label: string; readonly title: string; readonly active: boolean }`; `ACCELERATION_CHIP_PREFIX = "GPU acceleration"`; `StatusBarAccelerationMode` (`label`, `title`, `active`, `onClick`), `StatusBarIssuesModel extends StatusBarIssues { acceleration?: StatusBarAccelerationMode }`, `StatusBarSlotsModel.issues?: StatusBarIssuesModel`; the shell's `statusCompletion`.

**PLAN DECISION PD-10 (where the status comes from).** A DOM listener for `graphty-capabilities-change` on the shell's frame `div` (`frameRef`, `:1152` `[u]`), attached in an effect with `[]` deps exactly as the four load events are (`:1673-1697`, `:1846-1885` `[u]`): the element dispatches the event with `bubbles: true, composed: true` (`#ensureAcceleration`'s `dispatchEvent`, `graphty-element.ts` `[u]`), so it reaches the frame from inside the canvas region without a prop on `Graphty.tsx` or `CanvasRegion.tsx`. Plus ONE read, in the same effect and right after the listener is attached: `graphtyRef.current?.session?.capabilities.acceleration` (the handle member M7-T4 Step 4 adds, which reads the element's own `session` getter; not `elementSession()`, the duck-typing helper 0.7 lists as an element gap). The read exists for a real race: `connectedCallback` starts the probe during React's commit, and on a host with no WebGPU the factory's rejection is a short microtask chain (`webgpu.ts:158-160`: `createWebGpuAccelerator` awaits `probeBrowserWebGpu()` first and throws the `E_NO_WEBGPU` / `E_NO_ADAPTER` failure straight after that await; without a `navigator.gpu` the probe resolves at once), so the controller's terminal `unavailable` transition can land BEFORE a passive effect runs -- a listener alone would leave such a page reading "probing" forever. The document the element keeps is correct at any time (`#buildStatus()` is re-run on every transition, `AccelerationController.ts:858,880-883`, and `capabilities` returns the current one, `:247-249`), so reading it once after subscribing closes the window with no polling; whether the microtasks beat the effect on a given host does not matter, because both orders end with the same document in the shell's state. The shell holds `const [acceleration, setAcceleration] = useState<AccelerationStatus | null>(null)`; `null` (nothing heard) and `"probing"` both draw nothing, which is the v2 design's rule for an unfinished probe (`v2 [u]` `:2808-2811`). Rejected: a `useLayoutEffect` (would close the race by timing rather than by reading the document, and the reasoning is fragile); an `onCapabilitiesChange` prop on `Graphty.tsx` (three files instead of one, for the same listener).

**PLAN DECISION PD-11 (what the chip is).** A `StatusBarChip` in the `issues` slot, declared as `StatusBarAccelerationMode` in `statusBarModel.ts` and shaped like `StatusBarPerformanceMode` (`types.ts:690-698`: `label`, `title`, `onClick`) plus one boolean `active` for the dot's ink -- because it is the same KIND of fact, a machine-level mode the reader changes in Settings > Performance, and `StatusBarChip.tsx:1-8` says every chip in the bar is that atom. The widening goes in `statusBarModel.ts`, not `types.ts`, and stays TYPE-ONLY: `graphty/vitest.config.ts:53-60` exempts the file from coverage on the tested ground that `grep -nE "^(export )?(function|const|let|class)"` over it matches nothing, and one exported constant would void that. The words come from a pure function in its own module, `formatAcceleration.ts`, the shape `formatCounts.ts` gives the bar's other strings, with its own test file. It is drawn LAST of the four chips (the two a dataset produced, then the two a machine produced) with `StatusDot` at `AI_DOT` size, `PANEL_INK.SUCCESS` when `active` and `PANEL_INK.CHROME` otherwise; a second bolt beside the Performance bolt would read as two warnings. The producer is its OWN memo placed ABOVE the slots memo: the slots memo opens with `if (!dataLoaded) { return {}; }` (`:4233-4235` `[u]`), and whether this machine has a GPU has nothing to do with whether a dataset is drawn -- a reader who opens Settings > Performance to change the policy is usually in the Welcome state, which is exactly the state that guard hides.

The words, fixed here so the stories, the tests and the record quote one source:

| `state` | `label` | `title` | `active` |
| --- | --- | --- | --- |
| `probing` | (no chip: `formatAcceleration` returns `null`) | | |
| `active`, `idle` | `GPU acceleration: on (<vendor> <architecture>)`; the parenthesis is omitted when both are absent | `<device or backend>. Layouts and algorithms with a GPU path run on it.` | true |
| `off` | `GPU acceleration: off` | `Switched off in Settings > Performance.` | false |
| `unavailable` | `GPU acceleration: off` | `<reason>` (fall back to `<code>`, then to `No accelerator is available.`) | false |
| `error` | `GPU acceleration: off` | `<reason>` (same fallbacks) | false |

**PLAN DECISION PD-12 (how a lost device surfaces).** Through the app's one toast, fed a `StatusBarCompletion` with `severity: "error"`, `actionLabel: "Open Settings"` and no `onDismiss`, from the SAME status the chip reads: when `acceleration.state === "error"` the toast shows `acceleration.reason`, and it leaves by itself when the element's recovery (up to three attempts, `AccelerationController.ts:113,692-700`) transitions the state back -- the toast is derived, never a queue. The chip flips to `off` at the same moment and stays there until the state changes, so the fact survives the toast. `loadCompletion` (`:4293-4306` `[u]`) is renamed `statusCompletion` because it no longer reports loads alone; the load failure wins when both are present (the reader just acted, and the GPU fact is still on the chip). `@mantine/notifications` is not added (DEP-M7-E).

- [ ] **Step 1: The words and their tests**

Create `formatAcceleration.ts` per PD-11's table (`ACCELERATION_CHIP_PREFIX`, `AccelerationChipText`, `formatAcceleration`) and `__tests__/formatAcceleration.test.ts` with one case per row of the table plus "omits the parenthesis when the backend reported no vendor and no architecture" and "falls back from reason to code to the fixed sentence". Seven cases.

Run: `cd $APP && npx vitest run src/components/shell/statusbar/__tests__/formatAcceleration.test.ts`
Expected: 7 passed.

- [ ] **Step 2: The failing bar tests**

Add to `StatusBar.test.tsx`, through the file's `renderBar` (`:40-53`, the 1,440 px host every board uses):

```tsx
describe("the acceleration chip", () => {
    const acceleration = {
        label: "GPU acceleration: on (nvidia ampere)",
        title: "NVIDIA ampere. Layouts and algorithms with a GPU path run on it.",
        active: true,
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

Run: `cd $APP && npx vitest run src/components/shell/statusbar/__tests__/StatusBar.test.tsx`
Expected: FAIL -- the first two cases: `issues.acceleration` is not in the type, and `visibleIssues` drops a model with none of `validation`, `notes`, `performance`. The third passes already.

- [ ] **Step 3: The model, the drawing, the emptiness check**

`statusBarModel.ts`: the import at `:15` gains `StatusBarIssues`; add `StatusBarAccelerationMode` (JSDoc: "Slot 7d: whether the element is using a GPU, and which one. The same members as `StatusBarPerformanceMode` plus `active` for the dot, because it is the same kind of fact -- a machine-level mode the reader changes in Settings > Performance") and `StatusBarIssuesModel extends StatusBarIssues` with `readonly acceleration?: StatusBarAccelerationMode;` (JSDoc: "drawn last, so the two chips a dataset produced come before the two a machine produced"); `StatusBarSlotsModel` gains `/** Slot 7. */ readonly issues?: StatusBarIssuesModel;`.

`StatusBar.tsx`: `visibleIssues` takes and returns `StatusBarIssuesModel | undefined`, its emptiness check gains `&& issues.acceleration === undefined`, and its return carries `acceleration: issues.acceleration`. The import at `:27` becomes `import type { StatusBarSlotId } from "../types";` and `:31` becomes `import type { StatusBarIssuesModel, StatusBarRegionProps } from "./statusBarModel";` -- both edits, because after this nothing in the file names `StatusBarIssues` and `@typescript-eslint/no-unused-vars` is an error.

`StatusBarSlots.tsx`: `StatusBarIssuesSlot` takes `{ issues: StatusBarIssuesModel }`, destructures `acceleration`, and after the `performance` block (`:341-345`) draws:

```tsx
            {acceleration === undefined ? null : (
                <StatusBarChip
                    leading={
                        <StatusDot
                            color={acceleration.active ? PANEL_INK.SUCCESS : PANEL_INK.CHROME}
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

with `StatusBarIssuesModel` added to the `./statusBarModel` type import (`:29`) and `StatusBarIssues` removed from the `../types` import (`:17-25`).

Run: `cd $APP && npx vitest run src/components/shell/statusbar && npx eslint src/components/shell/statusbar && npx tsc --noEmit && grep -nE '^(export )?(function|const|let|class)' src/components/shell/statusbar/statusBarModel.ts; echo "rc=$?"`
Expected: 49 in `StatusBar.test.tsx` (46 + 3) and 7 in the new file; eslint and tsc clean; the grep prints nothing with `rc=1` (the coverage exemption holds).

- [ ] **Step 4: The shell -- the listener, the read, the two producers**

In `AppShell.tsx` `[u]`:

  - Beside `OPEN_DATA_ACTION` (`:294`): `const CAPABILITIES_CHANGE_EVENT = "graphty-capabilities-change";` and `/** The device-lost toast's link: it says where it goes, because there is no mapping line to scroll to. */ const OPEN_SETTINGS_ACTION = "Open Settings";`.
  - Beside `loadFailure` (`:1061`): `const [acceleration, setAcceleration] = useState<AccelerationStatus | null>(null);`.
  - After the `data-loading-error` effect (`:1846-1885`), a new effect:

```ts
    /* The element's acceleration status, as it publishes it: a bubbling, composed DOM event on
       every controller transition, read here on the frame the way the load events are. The one
       read after subscribing is not a fallback: on a host with no WebGPU the probe's rejection is
       a short microtask chain that can settle before this passive effect runs, and the document
       the element keeps is correct at any time. Nothing here probes, constructs or recovers. */
    useEffect(() => {
        const frame = frameRef.current;

        const onCapabilitiesChange = (event: Event): void => {
            const { detail } = event as CustomEvent<{ capabilities?: { acceleration?: AccelerationStatus } }>;
            const status = detail.capabilities?.acceleration;

            if (status !== undefined) {
                setAcceleration(status);
            }
        };

        frame?.addEventListener(CAPABILITIES_CHANGE_EVENT, onCapabilitiesChange);

        const current = graphtyRef.current?.session?.capabilities.acceleration;
        if (current !== undefined) {
            setAcceleration(current);
        }

        return () => {
            frame?.removeEventListener(CAPABILITIES_CHANGE_EVENT, onCapabilitiesChange);
        };
    }, []);
```

  - IMMEDIATELY ABOVE the `slots` memo (`:4232`), its own memo:

```ts
    /* The issues slot's FIRST producer in this app, and the only slot that draws with no
       dataset: whether this machine has a GPU is not a property of the data, and the Welcome
       state is where a reader goes to change the policy. Nothing while the element is still
       probing (or has not spoken): a chip that says off for 30 ms and then on reads as a fault. */
    const accelerationIssues = useMemo<StatusBarIssuesModel | undefined>(() => {
        const text = acceleration === null ? null : formatAcceleration(acceleration);

        if (text === null) {
            return undefined;
        }

        return {
            acceleration: {
                ...text,
                onClick: () => {
                    setSettingsSection("performance");
                    setSettingsOpen(true);
                },
            },
        };
    }, [acceleration]);
```

    (`setSettingsSection` and `setSettingsOpen` are `useState` setters, `:1163,1170` `[u]`, so they are stable and not dependencies.)

  - The `slots` memo: the early exit becomes `return accelerationIssues === undefined ? {} : { issues: accelerationIssues };` and the main return gains `issues: accelerationIssues,`; `accelerationIssues` joins the dependency array.
  - `loadCompletion` (`:4293-4306`) becomes `statusCompletion`, keeps its load-failure branch first, and adds the device-lost branch per PD-12 (`if (acceleration === null || acceleration.state !== "error") { return undefined; }` then `{ message: acceleration.reason ?? "The GPU device was lost.", severity: "error", actionLabel: OPEN_SETTINGS_ACTION, onDetails: () => { setSettingsSection("performance"); setSettingsOpen(true); } }`), with `acceleration` in its dependencies; the one use (`completion={loadCompletion}`, `:5033`) follows the rename. The memo's comment gains the precedence sentence.
  - Imports: `AccelerationStatus` (type, from `@graphty/graphty-element/session`), `formatAcceleration` from `./statusbar/formatAcceleration`, `StatusBarIssuesModel` added to the existing type import from `./statusbar/statusBarModel` (`:207`); nothing from `elementBridge.ts`.

In `fakeSession.ts` `[u]`, the `session` literal (the one that carries `estimate`, `:540`) gains `capabilities: { acceleration: { state: "probing" } },` with a one-line comment ("what a host reads before the element has spoken; a board that wants another state dispatches the event") -- the fake mirrors the real session's shape (`src/session/types.ts:528` `[u]`), and a board that defines `session` on the node (the way `installGraph` defines `graph`) never reads `undefined.acceleration`. In the shell tests the `<graphty-element>` node is unregistered and defines no `session`, so the effect's one read yields `undefined` there and every case below feeds the state through the event; the read itself is exercised by the live check (M7-T6 Step 3, question 1).

In `AppShell.test.tsx` `[u]`, a helper beside `reportLoadingError` (`:204`):

```ts
/**
 * Reports an acceleration transition, as graphty-element does on every change of its
 * controller: a bubbling, composed CustomEvent carrying the published document.
 * @param container - the render result's container.
 * @param status - the status the element would publish.
 */
async function reportAcceleration(container: HTMLElement, status: AccelerationStatus): Promise<void> {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    await act(async () => {
        element?.dispatchEvent(
            new CustomEvent("graphty-capabilities-change", {
                bubbles: true,
                composed: true,
                detail: { capabilities: { acceleration: status } },
            }),
        );
        await Promise.resolve();
    });
}
```

and a describe "the acceleration chip and the device-lost report" with six cases:
  - "draws no chip before the element has spoken, with no dataset loaded" (`renderMeasuredShell()`; the bar's spacer is present; `screen.queryByText(/^GPU acceleration/)` is null);
  - "draws the chip as soon as the element reports, with or without a dataset" (`reportAcceleration(container, { state: "idle", backend: "webgpu", vendor: "nvidia", architecture: "ampere" })`; `getByText("GPU acceleration: on (nvidia ampere)")`);
  - "opens Settings > Performance from the chip" (click the chip text; `getByTestId("settings-acceleration")` present);
  - "reports a lost device through the toast and flips the chip, without dismissing itself" (`{ state: "error", code: "E_DEVICE_LOST", reason: "the accelerator's device was lost: reset" }`; `getByRole("alert")` contains the reason; the link reads `Open Settings`; `getByText("GPU acceleration: off")`; after `reportAcceleration(container, { state: "idle", backend: "webgpu" })` the alert is gone -- the recovery cleared it);
  - "lets a failed load win the toast" (`reportLoadingError(container, "bad file")` then the error status; the alert carries the load sentence, not the reason);
  - "shows a reader who required acceleration why there is none" (set `localStorage` to `{"policy":"required"}` before `renderMeasuredShell()`; `reportAcceleration(container, { state: "unavailable", code: "E_NO_WEBGPU", reason: "this browser has no WebGPU" })`; the tag's attribute reads `"required"`; `getByText("GPU acceleration: off")` and `getByTitle("this browser has no WebGPU")` are present; no alert). This is the whole reader-visible consequence of `Required` on a machine without an accelerator that THIS phase can show: the element publishes `unavailable` with the probe's reason whatever the policy (`AccelerationController.ts:549-555`: the `unavailable` transition after `#tryFactories()` does not look at the policy), and the chip's tooltip carries it. A run or a layout that has a GPU path then rejects with `E_NO_ACCELERATOR` (`AccelerationController.ts:397-403` in `ready()`, `:440,461` in `plan()`, `:816-829` the error; the v2 design `v2 [u]` `:2915-2917`), and the app has NO surface for a rejected run today: its two runs (`runCommunityDetection` at `AppShell.tsx:2600`, `runDegreePass` at `:3097` `[u]`) await `session.runs.start` through `analysis/runs.ts` with no `catch`. That is an app gap outside this seam, written into the G12 record's findings; the PD-8 description sentence ("Required refuses to run without one.") is what the reader is told before choosing it.

Run: `cd $APP && npx vitest run src/components/shell && npx eslint src/components src/test && npx tsc --noEmit`
Expected: PASS with six new shell cases; eslint and tsc clean. If the board that pins the status bar's slot order fails, the `issues` slot is now drawn where it never was -- check the expectation against `STATUS_BAR_SLOT_ORDER` (`constants.ts`) and fix the EXPECTATION, not the order.

- [ ] **Step 5: Checkpoint** -- `cd $APP && npx vitest run` green; `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the nine touched files prints nothing.

**Deliverables:** `formatAcceleration` and seven tests; the model, the drawing and the emptiness check with three bar tests; the listener and the read; the two producers; the fake's `capabilities`; the helper and six shell tests.

**Commit (owner):** `feat(graphty): report acceleration in the status bar and when the device is lost`

---
### Task M7-T6: The stories, the Chromatic leftover, the live check on the dev box and CLAUDE.md

**Repository:** `$WT`. Needs the whole of Phase M6 for Step 3 (the live check runs the real element on the real GPU).

**Spec:** design 9.4 item 8 (`:3194-3200`) and the P12 row (`:4219`) as departed from in DEP-M7-B; G12's "stories green" clause; the owner's visual rule (root `CLAUDE.md` "Security Guidelines": screenshots through the Playwright MCP, non-leading yes / no questions to Nanobanana, be skeptical); the integration plan's "no TurboSnap there; `exitZeroOnChanges: false`" (`:3259`), already true in CI (master `ci.yml:656-664`).

**Files:**
- Create: `graphty/src/stories/StatusBarAcceleration.stories.tsx` (new)
- Modify: `graphty/chromatic.config.json` (`:2`), `graphty/CLAUDE.md` (the "graphty-element Integration" section and the Storybook line)
- NOT touched: `graphty/.storybook/main.ts`, `graphty/.storybook/preview.tsx` (the two colour modes stay, `:113-120`; the cost is stated below), `.github/workflows/ci.yml` (the `chromatic-app` job needs no change), `graphty/src/stories/Graphty.stories.tsx` (the mock registrar is not needed: the status bar renders no element)

**PLAN DECISION PD-13 (fixed-model stories; the live check is the running app).** Two stories in one file, `Shell/Status bar/Acceleration`, each rendering the real `StatusBar` (`statusbar/StatusBar.tsx`) inside a 1,440 px `div` (`WIDE_SHELL`, `StatusBar.test.tsx:42`) from a model built with `formatAcceleration()` over a FIXED `AccelerationStatus` -- deterministic by construction, so Chromatic snapshots both, in both colour modes (four snapshots per build; `preview.tsx:113-120`): `On` (`{ state: "idle", backend: "webgpu", vendor: "nvidia", architecture: "ampere" }`, with `counts` beside it) and `DeviceLost` (`{ state: "error", code: "E_DEVICE_LOST", reason: "the accelerator's device was lost: reset" }`, with the toast fed the same `statusCompletion` shape M7-T5 builds: `severity: "error"`, `actionLabel: "Open Settings"`). No `gpu` tag: the tag existed to skip a story on a software renderer, and nothing here touches a renderer. No story mounts the real element: this Storybook's `<graphty-element>` is the grey-box mock `Graphty.stories.tsx:5-32` registers at module scope, and a page can define a tag once; the real-GPU story is the element's (`stories/LayoutGpu.stories.ts`, M6-T8 PD-22). The app's own live check on the real GPU is therefore the RUNNING APP on its dev server -- the only surface where the real element, the real peer and the real chip meet -- screenshotted and questioned per the owner's rule (Step 3).

- [ ] **Step 1: The stories**

Create `graphty/src/stories/StatusBarAcceleration.stories.tsx` per PD-13: a small `Board({ status, counts })` component that calls `formatAcceleration(status)` and renders `<StatusBar slots={{ counts, issues: { acceleration: { ...text, onClick } } }} completion={...} />` inside the wide host; `meta = { title: "Shell/Status bar/Acceleration", component: Board, parameters: { layout: "fullscreen" } }`; exports `On` and `DeviceLost`. Imports: `StatusBar`, `formatAcceleration`, the `AccelerationStatus` type from `@graphty/graphty-element/session`.

Run: `cd $APP && npx tsc --noEmit && npx prettier --check src/stories/StatusBarAcceleration.stories.tsx && pnpm exec nx run graphty:build-storybook && python3 -c "import json; d=json.load(open('storybook-static/index.json')); print([k for k in d['entries'] if k.startswith('shell-status-bar-acceleration')])"`
Expected: tsc and prettier clean (prettier is a root devDependency, root `package.json:153`, with the root `.prettierrc`; the check is scoped to the NEW file so that an existing story's formatting, which this task does not own, cannot block it; NOT eslint: `eslint.config.js` ignores `**/stories/**`, so a green eslint there proves nothing); the build succeeds; the list prints the two ids. `tsc` does check the file because `graphty/tsconfig.json:44` includes `src`.

- [ ] **Step 2: The Chromatic leftover**

`graphty/chromatic.config.json` becomes `{ "onlyChanged": false, "zip": true }`. The CI action does not read this file (it runs with `storybookBuildDir: ./graphty/storybook-static` and its own flags, master `ci.yml:656-664`, TurboSnap off with the reason in its comment), so the flag only affects a LOCAL `npm run test:visual`; leaving it `true` tells a reader TurboSnap is on when the thing that runs has it off, and a local run would skip a story whose own file had not changed.

Run: `cd $WT && python3 -c "import json; print(json.load(open('graphty/chromatic.config.json')))"`
Expected: `{'onlyChanged': False, 'zip': True}`.

- [ ] **Step 3: The live check on the real GPU (the owner's visual rule)**

Start the app: `cd $APP && npm run dev` (HTTPS from the root `.env`, which is gitignored and exists in the main checkout only -- a new worktree needs a copy of it, or the four server keys `HOST`, `PORT`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`, before this step; `vite.config.ts` reads them at `:82-95` over the `server` block at `:60-69`; `https://dev.ato.ms:9005/`). HTTPS matters: `navigator.gpu` is undefined outside a secure context, and the element would then publish `unavailable` / `E_NO_WEBGPU` (the reason sentence names the secure context, `webgpu.ts:87-89`). Through the Playwright MCP:

1. Navigate to `https://dev.ato.ms:9005/`, wait for the status bar, screenshot as `$APP/tmp/m7/chip-auto.png`. Read the chip's tooltip through a snapshot (the `title` attribute).
2. Open Settings from the rail, choose `Off` in Settings > Performance, close Settings, screenshot as `$APP/tmp/m7/chip-off.png`.
3. Reload the page, screenshot as `$APP/tmp/m7/chip-off-reloaded.png` (the stored policy must be on the tag before the probe).
4. Choose `Automatic` again, load a sample from the Welcome state, screenshot as `$APP/tmp/m7/chip-loaded.png`.

Ask Nanobanana, one question per image, and record the answers verbatim in the G12 record:

1. On `chip-auto.png`: "Does this image contain a text line beginning with the words 'GPU acceleration: on'?"
2. On `chip-off.png`: "Does this image contain a text line beginning with the words 'GPU acceleration: off'?"
3. On `chip-off-reloaded.png`: "Does this image contain a text line beginning with the words 'GPU acceleration: off'?"
4. On `chip-loaded.png`: "Are there graph nodes drawn in the main area of this image, and does the bottom bar contain the words 'GPU acceleration'?"

Question 1 is the phase: a `no` there with a hardware adapter present means the element did not attach, and the gate is not claimed. Question 3 is PD-9: a `no` means the policy was written after the probe started.

Then the no-graph-logic grep, which is the phase's whole point:

Run: `cd $WT && grep -rn "navigator.gpu\|webgpu-graph-algorithms\|graphty-element/webgpu\|registerAccelerator\|acceleratorRegistry" graphty/src | grep -v "\.test\." | grep -v "\.stories\."`
Expected: exactly one line, `graphty/src/main.tsx:<n>:import "@graphty/graphty-element/webgpu";`. The line is matched by the fifth pattern, `graphty-element/webgpu`; the other four are the GPU package's name and the element's registry names, which the app must never spell, and the comment above the import (M7-T1 Step 2) contains none of the five. A count of 0 means the import is missing; a count above 1 means the app grew acceleration code.

- [ ] **Step 4: `graphty/CLAUDE.md`**

The "graphty-element Integration" section gains a paragraph: "Acceleration: `main.tsx` imports `@graphty/graphty-element/webgpu` and that is the whole GPU integration. The element probes, attaches and recovers; the app writes the reader's `acceleration` policy on the tag (`Graphty.tsx`), remembers it under `graphty.shell.acceleration.v1` (`shell/defaults/accelerationSettings.ts`), and renders `capabilities.acceleration` as the status bar's acceleration chip from the `graphty-capabilities-change` event (`AppShell.tsx`). Nothing in this app may probe, construct or catch a GPU failure." The Storybook line under Essential Commands keeps "requires SSL cert" (true: the certificate files must exist) and drops nothing.

Run: `cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty/CLAUDE.md graphty/src/stories/StatusBarAcceleration.stories.tsx graphty/chromatic.config.json; echo "rc=$?"`
Expected: no output, `rc=1`.

- [ ] **Step 5: Chromatic** -- `cd $APP && CHROMATIC_PROJECT_TOKEN=<the app's project token> npx chromatic`. The token has to be named on the command: `graphty/chromatic.config.json` carries no project id, and the root `.env` holds Chromatic tokens for algorithms, layout and compact-mantine only (`.env:11-13`), not for the app; CI's is the `CHROMATIC_PROJECT_TOKEN_APP` secret (master `ci.yml:659`), and the owner has the same token from the Chromatic project page. Expected: two new stories, four new snapshots, zero changed among the existing ones. The owner accepts the four as baselines.

**Deliverables:** two stories; the Chromatic flag; four screenshots and four answers under `$APP/tmp/m7/`; the grep's one line; the CLAUDE.md paragraph; the accepted baselines.

**Commit (owner):** `test(graphty): add the acceleration chip stories and stop claiming TurboSnap locally`

---

### Task M7-T7: The decision records, the index, the G12 record and the full gate

**Repository:** `$WT`.

**Spec:** design 13 row P12 gate G12 (`:4219`) restated for the app (integration plan `:3260`); design 10.4's rule that a missed target is re-fixed by a recorded owner decision, never relaxed silently; `design/decisions/README.md:1-27` (one decision per file, with the argument rejected); the old plan's T1 Steps 2-3 (`:261-355`), whose record text and index-count convention are reused.

**Files:**
- Create: `design/decisions/2026-09-21-g12-without-the-nightly-clause.md` (new; the record four older plans cite by its 2026-09-19 name -- see PD-14 for the name), `design/decisions/2026-09-21-app-stories-draw-the-chip-not-the-gpu.md` (new), `graphty/docs/decisions/G12.md` (new; the directory is new)
- Modify: `design/decisions/README.md` (two rows), `design/README.md:14,21` (the counts, re-run; `:21` already reads 16 in the write tree), `graphty-element/docs/guide/acceleration.md` (M6-T8's page; one sentence for M7-T3's exports)
- NOT touched: `design/webgpu/webgpu-acceleration-plan.md`, `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md`, `design/webgpu/README.md` (its rows for the old M7 plan, `superseded`, and this plan, `live plan`, are already in the write tree, `:18-21`, uncommitted beside this plan), `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md` (its superseded banner, `:3-8`, likewise; `git status --short design/`)

**PLAN DECISION PD-14 (the records' homes and names).** The G12 record lives at `graphty/docs/decisions/G12.md`, the app's sibling of `graphty-element/docs/decisions/G6.md` (M6-T9 PD-24) and the GPU package's `webgpu-graph-algorithms/docs/decisions/` (`G0.md`, `G1.md`, `G2.md`, `G3.md`, `G5.md`, `G6-algorithms.md`, `G7.md` on master; there is no G4 record); the app has no docs site, so nothing builds it into a page. The nightly-clause restatement is written under TODAY's date, `2026-09-21-g12-without-the-nightly-clause.md`, with a first line noting that the old M6, M7, M8a and M8b plans cite it under the 2026-09-19 name that was never created (the directory's rule is one file per decision, dated when it lands; a back-dated file would claim a landing that did not happen). Its content is the old plan's T1 Step 2 text (`:266-331`: the decision, why, what is given up, what would reverse it, what still exists) with the "what still exists" section pointing at THIS plan's gate restatement instead of the old W2 cell. The stories record (DEP-M7-B) follows the shape of `2026-09-19-graphty-element-owns-webgpu.md:1-12` (the decision, the date, what it changes -- 9.4 item 8, 9.8's W2 row, the P12 row -- and the argument rejected: a `gpu`-tagged story in the app that mounts the real element, impossible beside the mock registrar and redundant beside the element's own).

**The gate, restated for the app (every clause of P12's G12 mapped):**

| G12 clause (design `:4219`; integration plan `:3260`) | For the app it means | Evidence in the record |
| --- | --- | --- |
| stories green | the app's Storybook builds; `chromatic-app` green with the two new stories accepted | item 1 |
| (the app's) stories render a deterministic no-GPU state on Chromatic | both stories are fixed-model; identical snapshots run to run | item 2 |
| the story on the real GPU settles, drags and pins | the ELEMENT's story (M6-T8 Step 2); the app's live check is the chip on the running app (M7-T6 Step 3) | items 3-6 cite G6 and the four answers |
| `gpuMinNodes` default measured | measured by M6-T9 (PD-23); the app sets no threshold | item 7 cites G6 section 3 |
| nightly GPU lane green for a week | VOID; the GPU lane green on this phase's master commits | item 8 |
| README numbers regenerated from `benchmarks/results/` | the GPU package's README, regenerated at that package's own gates (`webgpu-graph-algorithms/docs/decisions/G5.md`, `G7.md`); not the app's | noted, not an item |
| (P12's) `iterationsPerStep` auto-raise above 250k nodes | the element's: M6-T4 PD-14 (M6 v2 plan `:128`, `:635`) | noted, the element's |
| (P12's) docs, "README with the Node and browser recipes" | the element's guide page `graphty-element/docs/guide/acceleration.md` and its API table, M6-T8 Step 3 (M6 v2 plan `:794`, `:803`); the GPU package's README is its own | noted, the element's |
| (design 9.4's) items 1-7, 9 and 10 | the element's, all of them: the M6 v2 plan's section 8 maps each to its M6 task; only item 8 (the stories) names the app, and DEP-M7-B is its departure | noted, the element's |
| (this plan's) the app carries no acceleration code | the grep of M7-T6 Step 3 prints exactly the one import | item 9 |
| (this plan's) the preference round-trips and reaches the element; the chip and toast react to the event | the test files of M7-T4 and M7-T5 | items 10-11 |
| (this plan's) the CI narrowing holds for a PR that does not touch graphty | the scratch PR of M7-T2 | item 12 |
| (this plan's) the activation import survives the production bundle | the grep of M7-T1 Step 3, and which branch of PD-3 was taken | item 13 |

- [ ] **Step 1: The two records, the index rows and the guide sentence** -- per PD-14 and DEP-M7-B; two rows in `design/decisions/README.md` after the last 2026-09-20 row (or after M6's 2026-09-21 rows when they are there). `design/webgpu/README.md` gets NO row: `grep -n 'm7-graphty-app' design/webgpu/README.md` already prints the old plan's `superseded` row and this plan's `live plan` row (write tree, uncommitted). One sentence in `graphty-element/docs/guide/acceleration.md` (M6-T8's page, present because M7-T7 waits for the whole of M6), under its API table: "`ACCELERATION_POLICIES`, `ACCELERATION_POLICY_DEFAULT` and `isAccelerationPolicy` are exported from `@graphty/graphty-element/session` for a host that draws a control."

- [ ] **Step 2: The counts** -- `design/README.md:14` (the `decisions/` cell) and `:21` (the `webgpu/` cell) take the output of these two commands run in the tree being committed, never a number copied from any plan (four plans of 2026-09-19 and M6's collide on these two cells; the resolution rule at a merge is to re-run the commands, never to take a side):

```bash
cd $WT
ls design/decisions/*.md | grep -cv README     # the decisions/ cell (records, not the index)
find design/webgpu -name '*.md' | wc -l        # the webgpu/ cell (recursive)
```

- [ ] **Step 3: The full green check**

Run:

```bash
cd $WT && pnpm exec nx run-many -t build --projects=graph-format,layout,algorithms,webgpu-graph-algorithms,graphty-element
cd $WT && pnpm exec nx run-many -t lint,build --projects=graphty --parallel=1      # the lint builds its closure first (PD-4)
cd $WT && pnpm exec knip --workspace graphty
cd $APP && npx vitest run --coverage                                                # the app's suite in headless Chromium; thresholds 80/80/75/80
cd $WT && pnpm exec nx run graphty:build-storybook
cd $EL && pnpm exec vitest run --project=default test/acceleration test/packaging   # M7-T3's cases and the Node-safe entries
cd $WT && HUSKY=0 pnpm install --frozen-lockfile                                     # exit 0: the lockfile matches the manifests
cd $WT && LC_ALL=C grep -rnP '[^\x00-\x7F]' graphty/src/components/shell/defaults/accelerationSettings.ts graphty/src/components/shell/statusbar/formatAcceleration.ts graphty/src/stories/StatusBarAcceleration.stories.tsx graphty/docs/decisions/G12.md design/decisions/2026-09-21-g12-without-the-nightly-clause.md design/decisions/2026-09-21-app-stories-draw-the-chip-not-the-gpu.md design/webgpu/plans/2026-09-21-webgpu-m7-graphty-app-v2.md | wc -l
cd $WT && grep -rn "navigator.gpu\|webgpu-graph-algorithms\|graphty-element/webgpu\|registerAccelerator\|acceleratorRegistry" graphty/src | grep -v "\.test\." | grep -v "\.stories\." | wc -l
cd $WT && git status --porcelain | grep '^?? graphty/tmp'; echo "rc=$?"
cd $WT && ./tools/prepush.sh
```

Expected: every line green; the ASCII count 0; the grep count 1 (the five-string grep of M7-T6 Step 3, whose one hit is the `graphty-element/webgpu` import); the `git status` line prints nothing (`rc=1`: `tmp/` is ignored and the screenshots are not staged); `prepush.sh` exits 0 (15-25 minutes).

- [ ] **Step 4: Fill and sign the G12 record**

Create `graphty/docs/decisions/G12.md` from this template; every `<...>` is a number or a string copied from the named command's output, `{{OPEN: ...}}` is the house convention for a cell filled after the PR's runs (items 1, 2 and 8: the record is written and committed before the push, so the PR's `chromatic-app` run ids and the master run cannot be in it until then), and the owner signs the last section:

````markdown
# G12 -- the app on the element's acceleration (design 13 row P12, W2 subset)

Recorded by: Task M7-T7, <date>. Commits: the <n> of this phase (<short hashes once committed>).
Environment: <the dev box's browser and adapter, from the chip's tooltip in M7-T6 Step 3>; the app's
tests ran in Playwright Chromium through vitest <version>. Every command ran from `graphty/` unless it
names another directory.

The gate is `design/webgpu/webgpu-acceleration-plan.md:4219` as restated for the app in
`design/webgpu/plans/2026-09-21-webgpu-m7-graphty-app-v2.md` Task M7-T7, with its middle clause replaced by
`design/decisions/2026-09-21-g12-without-the-nightly-clause.md`: the GPU lane green on the master commits of
this phase, NOT a nightly week. There is no nightly lane.

## 1. The checklist

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | the app's stories green | `pnpm exec nx run graphty:build-storybook`; the local `npx chromatic` of M7-T6 Step 5, build <id>; the PR's `chromatic-app` job {{OPEN: run <id>}} | <n> stories, <n> snapshots, <n> accepted | pass / fail |
| 2 | the two acceleration stories are deterministic on Chromatic | two consecutive builds: the local build of M7-T6 Step 5 <id> and the PR's {{OPEN: build <id>}}: zero changes on `shell-status-bar-acceleration--*` | <n> changed | pass / fail |
| 3 | the real element on the real GPU settles, drags and pins | `graphty-element/docs/decisions/G6.md` items 9-10 | <its result> | pass / fail (the element's) |
| 4 | the running app shows the chip ON with the real GPU | `tmp/m7/chip-auto.png`; Nanobanana Q1 | <answer>; tooltip `<vendor> <architecture>` | pass / fail |
| 5 | ...OFF after the control, and OFF after a reload (the policy is on the tag before the probe) | `tmp/m7/chip-off.png`, `chip-off-reloaded.png`; Q2, Q3 | <answer>, <answer> | pass / fail |
| 6 | ...and the chip survives a loaded dataset | `tmp/m7/chip-loaded.png`; Q4 | <answer> | pass / fail |
| 7 | `minNodes` default measured | `graphty-element/docs/decisions/G6.md` section 3 | <n> (the app leaves the element's default) | pass / fail (the element's) |
| 8 | the GPU lane green on this phase's master commits | `gh run list --workflow=gpu.yml --branch=master` after the merge | {{OPEN: run <id>, <conclusion>}} | pass / fail |
| 9 | the app carries exactly one acceleration line | the five-string grep of M7-T6 Step 3 | `graphty/src/main.tsx:<n>` | pass / fail |
| 10 | the preference round-trips and reaches the element | `npx vitest run src/components/shell/defaults src/components/shell/panel src/components/shell/__tests__ src/components/Graphty.test.tsx` | <n> passed | pass / fail |
| 11 | the chip and the toast react to the element's event; the load failure wins | `npx vitest run src/components/shell/statusbar src/components/shell/__tests__` | <n> passed | pass / fail |
| 12 | the CI narrowing holds for a PR that does not touch graphty | the scratch PR of M7-T2 Step 1, run <id> | the nine `build-*` package artifacts non-empty, <n>/20 green | pass / fail |
| 13 | the bundle retains the activation import | M7-T1 Step 3's grep | <count>; branch taken: <none / the element's sideEffects> | pass / fail |

## 2. What the app shows for each state the element publishes

| `state` | chip | toast |
| --- | --- | --- |
| `probing` (or nothing heard yet) | none | none |
| `active`, `idle` | `GPU acceleration: on (<vendor> <architecture>)` | none |
| `unavailable` | `GPU acceleration: off`, the element's reason in the tooltip | none |
| `error` | `GPU acceleration: off`, the reason in the tooltip | the reason, `Open Settings`, until the state changes |
| `off` | `GPU acceleration: off`, "Switched off in Settings > Performance." | none |

## 3. Coverage

`npx vitest run --coverage` from `graphty/`: lines <n>%, functions <n>%, branches <n>%, statements <n>% (thresholds 80 / 80 / 75 / 80).

## 4. Findings, owner decisions

- The `metricCost` accelerator constant of the integration plan's M7 cell was not built (DEP-M7-C): the cost
  model is the element's (`session.estimate`), and a per-metric GPU rate belongs in
  `graphty-element/src/session/cost/estimate.ts` once an algorithm runs on the GPU.
- The app sets no `acceleration-min-nodes`; a Settings control for the element's threshold is a product
  question for the owner: <decision or "open">.
- Element gaps outside this seam, left for the v2 branch's clean-up: no `element.ready` (the 50 ms session
  poll in `Graphty.tsx`), format sniffing in `Graphty.tsx`, `elementBridge.ts`'s duck-typing, and no JSX
  typing shipped by the element (`graphty/src/types/jsx.d.ts` declares `IntrinsicElements["graphty-element"]`
  itself, now with seven typed props; the element's `./react` entry is reserved for that and empty).
- App debt outside this seam, the v2 branch's own: `Graphty.tsx`'s `GraphtyElementType` re-declares ten
  element members by hand although the element exports `GraphtyElement`; this phase took its one new member
  from the exported type and added none by hand. The element design's section 7 deletions (`elementBridge.ts`,
  `graphShape.ts`, `nodeMetrics.ts`) are the same clean-up; no M6 or M7 task owns them.
- App gap outside this seam: a run that rejects (`session.runs.start` under `acceleration="required"` with
  no accelerator rejects with `E_NO_ACCELERATOR`) has no surface in the app; `runCommunityDetection` and
  `runDegreePass` are awaited with no catch. The chip's tooltip is what a reader sees; the rejection is not.
- M7-T1 Step 3: <the bare import survived the bundle as is / the element's `sideEffects` gained the two
  source entries>.
- Chromatic: <n> baselines accepted; <n> existing stories changed (expected 0).

Signed off: <owner>, <date>.
````

Run: `cd $WT && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty/docs/decisions/G12.md; echo "rc=$?"`
Expected: no output, `rc=1`.

**Deliverables:** two decision records; two index rows and two counts; the guide sentence; the G12 record filled and signed; the full green check.

**Commit (owner):** `docs: record the G12 gate for the app and index the M7 re-plan` (no scope: the change is to the design corpus and the app's record together). Then push, open the PR with the `gpu` label so `gpu.yml` runs on it, fill items 1 and 2 from the PR's `chromatic-app` run, and merge once `ci.yml`, `hosts.yml` (if it ran) and `gpu.yml` are green; fill item 8 from the master run.

---
## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| Before M7-T1 | Phase M6 through M6-T1 in the tree (0.2); `export WT=<the v2 checkout> APP=$WT/graphty EL=$WT/graphty-element`; `cd $WT && pnpm exec nx run-many -t build --projects=graph-format,layout,algorithms,webgpu-graph-algorithms,graphty-element` |
| M7-T1 Step 1 | `cd $WT && HUSKY=0 pnpm install` (the lockfile) |
| M7-T1 | `tools/commit-changes.sh` for `build(graphty): install the GPU peer and switch on acceleration with one import`; plus the `build(graphty-element): ...` subject only if Step 3 took the element branch |
| M7-T2 Step 1 | push a scratch branch whose only change is one line appended to `graph-io/README.md`, open it as a draft PR, read the `build` job's nine `build-*` package artifacts and the 20 shards, close it unmerged (G12 item 12) |
| M7-T2 | two commits: `ci: drop graph-format from the explicit PR build now that graphty reaches the GPU package`, `fix(graphty): point the Storybook script at a certificate that exists` |
| M7-T3 | `feat(graphty-element): export the acceleration policy list and its guard` |
| M7-T4, M7-T5 | one commit each, in order, with the subjects the tasks name (or one combined `feat(graphty): ...` if the owner prefers; the two tasks share one tree either way) |
| M7-T6 Step 3 | `cd $APP && npm run dev`; the Playwright MCP against `https://dev.ato.ms:9005/`; the four Nanobanana questions; screenshots under `$APP/tmp/m7/` |
| M7-T6 Step 5 | `cd $APP && CHROMATIC_PROJECT_TOKEN=<the app's token> npx chromatic`; accept the four baselines; then `test(graphty): add the acceleration chip stories and stop claiming TurboSnap locally` |
| M7-T7 Step 2 | the two count commands in the tree being committed |
| M7-T7 Step 4 | fill and sign `graphty/docs/decisions/G12.md`; `docs: record the G12 gate for the app and index the M7 re-plan`; push; open the PR with the `gpu` label; fill items 1 and 2 from the PR's `chromatic-app` run; merge when `ci.yml`, `hosts.yml` and `gpu.yml` are green; fill item 8 from the master run |

The agent never runs any of these git steps; it prepares the tree and verifies the results.

### 7.2 Verification matrix

| Check | Where | Command (from `$APP` unless noted) | Green means |
| --- | --- | --- | --- |
| The dependency resolves and the lockfile agrees | M7-T1 | `cd $WT && HUSKY=0 pnpm install --frozen-lockfile && ls graphty/node_modules/@graphty/` | exit 0; `webgpu-graph-algorithms` linked under the app |
| knip accepts the peer the app installs for the element | M7-T1 | `cd $WT && pnpm exec knip --workspace graphty` | no unused-dependency line |
| The activation import survives the bundle | M7-T1 | `npm run build && grep -l "webgpu-graph-algorithms" dist/assets/*.js \| wc -l` | at least 1 |
| The app type-checks against a built GPU package, building first | M7-T1 | `cd $WT && pnpm exec nx run graphty:lint` | the closure builds, then eslint and tsc exit 0 |
| The CI file parses and names the narrowed step | M7-T2 | the `yaml.safe_load` one-liner of M7-T2 Step 1 | `Build graph-io and webgpu-graph-algorithms (PR)` present; the three-project name gone |
| ...and a PR that does NOT touch graphty still uploads the nine package builds | M7-T2 | the scratch PR | the nine `build-*` artifacts non-empty, 20/20 shards green |
| The Storybook script names a certificate that exists | M7-T2 | `sed -n 23p package.json && ls -l ~/ssl/atoms.crt` | `atoms.crt` in both |
| The element exports the list, the default and the guard, Node-safe | M7-T3 | `cd $EL && pnpm exec vitest run --project=default test/acceleration test/packaging` | the three new cases pass; the Node-safe entries test unchanged |
| The store survives a bad record and an explicit undefined | M7-T4 | `npx vitest run src/components/shell/defaults/__tests__/accelerationSettings.test.ts` | 5 passed |
| The pane draws the control, shows the value, reports and does not write | M7-T4 | `npx vitest run src/components/shell/panel/__tests__/SettingsOverlay.test.tsx` | the four new cases pass |
| The policy is on the tag, at mount and on change; the handle exposes the session | M7-T4 | `npx vitest run src/components/Graphty.test.tsx src/components/shell/__tests__/AppShell.test.tsx` | the wrapper's two new cases and the shell's two pass |
| The words | M7-T5 | `npx vitest run src/components/shell/statusbar/__tests__/formatAcceleration.test.ts` | 7 passed |
| The issues slot renders with only the acceleration chip | M7-T5 | `npx vitest run src/components/shell/statusbar/__tests__/StatusBar.test.tsx` | 49 in the file |
| `statusBarModel.ts` is still type-only | M7-T5 | `grep -nE '^(export )?(function\|const\|let\|class)' src/components/shell/statusbar/statusBarModel.ts` | no output |
| The chip is not gated on a dataset, draws nothing before the element speaks, the toast follows the state, the load failure wins, and a `required` reader sees the reason | M7-T5 | `npx vitest run src/components/shell/__tests__/AppShell.test.tsx` | the six new cases pass |
| The stories build and are indexed | M7-T6 | `pnpm exec nx run graphty:build-storybook` then the `index.json` one-liner | the two ids present |
| The running app on the real GPU | M7-T6 | the Playwright MCP + Nanobanana routine of Step 3 | four `yes` answers |
| The app carries exactly one acceleration line | M7-T6, M7-T7 | the five-string grep over `graphty/src` minus tests and stories | one line, `main.tsx`, matched by `graphty-element/webgpu` |
| Plain ASCII | M7-T7 | the `LC_ALL=C grep` of M7-T7 Step 3 | 0 |
| The whole app, with coverage | M7-T7 | `npx vitest run --coverage` | at or above 80 / 80 / 75 / 80 |
| The pre-push gate | M7-T7 | `cd $WT && ./tools/prepush.sh` | exit 0 |
| The GPU lane (rule (a)) | M7-T7 | `gh run list --workflow=gpu.yml --branch=master` after the merge | the run on the merge commit succeeded |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M7-1 | The phase starts before M6-T1, and the chip reads the session's SECOND controller while the attribute drives the element's: `acceleration="off"` on the tag and a chip that says `on`. | 0.2 states the criterion with its command (`grep -rn "new AccelerationController" src/` prints two sites); the initial read and the event then agree by construction (M6-T1 PD-4). |
| R-M7-2 | The bare `import "@graphty/graphty-element/webgpu"` is tree-shaken out of the production bundle, as `main.tsx:7-15` says the element import was. | M7-T1 Step 3 builds and greps before anything else depends on the import; PD-3 names the element-side fix and forbids the app-side one. |
| R-M7-3 | The element's terminal transition lands before the shell's passive effect and the chip stays hidden on a host with no WebGPU. | PD-10's one read after subscribing, through the handle's `session`; the shell test "draws no chip before the element has spoken" pins the negative, and the `required` case pins that an `unavailable` document reaches the chip with its reason. |
| R-M7-4 | React 19 writes the `acceleration` prop as an attribute on the real element instead of a property, and a bad-value path or a timing difference appears. | Either route reaches the same setter: the attribute goes through `attributeChangedCallback` (the `acceleration` accessor's doc comment says the setter is written for exactly that: "Lit drives this setter from `attributeChangedCallback`") and the property goes through the accessor; both run before `connectedCallback`. The live check's question 3 (a reload with `off` stored) is the timing proof. |
| R-M7-5 | `SegmentedControl` from `@mantine/core` renders its options as something other than radios and `getByRole("radio", { name })` finds nothing. | The first test of M7-T4 Step 3 is a `getByRole` probe; if it fails, use `getByLabelText` (Mantine renders `<input type="radio">` with a `<label>`), and never a bespoke control. |
| R-M7-6 | The device-lost toast never appears because a failed load is on screen. | Accepted by PD-12: the chip carries the fact permanently; the toast is the second surface, never the only one. |
| R-M7-7 | The `ci.yml` step is deleted or narrowed to graph-io alone, and a graph-io-only PR leaves the GPU package's `dist/` unbuilt against an unconditional upload. | PD-5 keeps both projects and the scratch PR of M7-T2 proves the case the landing PR cannot. |
| R-M7-8 | Four plan documents and M6 bump `design/README.md`'s two counts and collide on merge. | M7-T7 Step 2's rule: re-run the two commands in the merged tree, never take a side. |
| R-M7-9 | The live check runs over plain `http://`, `navigator.gpu` is undefined, and question 1 reads `no` for a reason that is not the app's. | M7-T6 Step 3 names the HTTPS requirement and the reason sentence the element publishes in that case; the tooltip is read before the answer is recorded. |
| R-M7-10 | The other session's uncommitted rewrite of `AppShell.tsx` / `SettingsOverlay.tsx` / `Graphty.tsx` lands with members renamed. | Every edit is stated against a named member (0.3); the executor re-reads the member first. |

---

## 8. Writing-plans self-review

### 8.1 Spec coverage -- every deliverable of the request, of the integration plan's M7 cell and of G12 has a task

| Deliverable | Task |
| --- | --- |
| The one import; the optional peer installed by the app; no probe / construct / inject / recover in the app | M7-T1 (PD-1, PD-2, PD-3); the five-string grep of M7-T6 Step 3 and M7-T7 Step 3 |
| The Settings > Performance control writing the element's policy; the reader's choice remembered by the app (the element never persists it) | M7-T4 (PD-7, PD-8, PD-9), with the element's value list from M7-T3 (PD-6) |
| The "GPU acceleration: on (vendor arch) / off" indicator from the element's published status; the device-lost toast | M7-T5 (PD-10, PD-11, PD-12) |
| Stories deterministic on Chromatic; no TurboSnap; `exitZeroOnChanges: false` | M7-T6 (PD-13); CI already so |
| The story on the real GPU settles, drags and pins | the element's, M6-T8; the app's live check M7-T6 Step 3 (DEP-M7-B) |
| `gpuMinNodes` measured | M6-T9 PD-23, cited (DEP-M7-D) |
| The `metricCost` constant | not built (DEP-M7-C) |
| `graphty/package.json` gains the dependency; the CI step becomes redundant for it | M7-T1 Step 1; M7-T2 Step 1 (PD-5) |
| The lint build order; the Storybook certificate; the G12 restatement; the corpus index; the guide sentence for M7-T3's exports | M7-T1 Step 4 (PD-4); M7-T2 Step 2; M7-T7 (PD-14) |
| Design 9.4 items 1-7, 9 and 10 | the element's: the M6 v2 plan section 8; this plan's M7-T7 gate table says so in one row |
| The version skew (the element's peer range vs the workspace's 0.5.1) | 0.1 last row; 0.2 first criterion; M7-T1 Step 1's `unmet peer` check |
| The M6 v2 plan's expectation that the app's acceleration-line count moves from 0 to exactly one import | 0.7 first bullet; M7-T6 Step 3; 7.2 |
| PD-n in full, departures, phase map with sizes, command sheet, gate record template, verification matrix, self-review | 0.4 + the owning tasks; 0.5; 0.6; 7.1; M7-T7 Step 4; 7.2; this section |

### 8.2 Placeholder scan

Searched this document for `TBD`, `TODO`, `FIXME`, `XXX`, `similar to`, `as appropriate`, `and so on`, `etc.`, `write tests for the above`, `add error handling`: no occurrence. The `<...>` cells that remain are inside the G12 record TEMPLATE (M7-T7 Step 4) and the `main.tsx:<n>` line number the grep prints, each a value copied from a named command's output. `{{OPEN: ...}}` is the house convention for a lane row filled after the merge. Every file path in this plan exists in the v2 tree or the write tree, is marked "new" in its task's Files block, or is a Phase M6 deliverable cited as such (`graphty-element/docs/decisions/G6.md`, `stories/LayoutGpu.stories.ts`, `docs/guide/acceleration.md`); checked with `tmp/replan/check-paths.sh` over this file, whose remaining misses are exactly those three groups.

### 8.3 Type-consistency check across the tasks

- `AccelerationPolicy` is imported from `@graphty/graphty-element/session` in M7-T4's store, pane, `Graphty.tsx`, `CanvasRegion.tsx` and `AppShell.tsx`; `ACCELERATION_POLICIES`, `ACCELERATION_POLICY_DEFAULT` and `isAccelerationPolicy` exist there only after M7-T3 Step 1 adds a VALUE export to `session.ts` beside the type export; the store's `resolve*` and the pane's `onChange` both go through the guard, so no string that the element would `console.error` is ever written to storage or to the tag.
- `SettingsOverlayProps.accelerationPolicy` / `onAccelerationPolicyChange` (M7-T4 Step 3) are what `AppShell` passes (Step 5) from `accelerationPolicy` / `changeAccelerationPolicy`; `CanvasGraphConfig.acceleration` (Step 4) is what `canvasProps.graph.acceleration` fills (Step 5) and what `CanvasRegion` hands to `GraphtyProps.acceleration` (Step 4), which lands on the tag through the widened `jsx.d.ts` declaration (Step 4).
- `GraphtyHandle.session` (M7-T4 Step 4) is a `GraphSession | null` read from the element's own `session` getter, typed through `Pick<GraphtyElement, "session">` from the element's exported type; M7-T5 Step 4's one read goes through it, and `elementSession()` gains no call site.
- `AccelerationStatus` (`@graphty/graphty-element/session`) is the type of the shell's `acceleration` state (M7-T5 Step 4), of `formatAcceleration`'s parameter (Step 1), of the DOM event's `detail.capabilities.acceleration` (`#ensureAcceleration`'s `dispatchEvent`, `graphty-element.ts` `[u]`), of `session.capabilities.acceleration` (`src/session/types.ts:528` via `AccelerationCapabilities`), of the fake's `capabilities.acceleration` (Step 4), of the test helper's parameter (Step 4) and of the stories' fixed values (M7-T6 Step 1).
- `formatAcceleration()` returns `AccelerationChipText | null`; `StatusBarAccelerationMode` is `AccelerationChipText` plus `onClick`, which is what the producer memo spreads (M7-T5 Step 4), what `StatusBarIssuesSlot` draws (Step 3, reading `active` for the dot), and what the bar tests and the stories build by hand with the same four members.
- `visibleIssues`'s parameter and return type, `StatusBarIssuesSlot`'s prop and `StatusBarSlotsModel.issues` are all `StatusBarIssuesModel` (M7-T5 Step 3); `StatusBar.tsx` and `StatusBarSlots.tsx` each drop `StatusBarIssues` from their `../types` import in the same step, so `no-unused-vars` has nothing to report.
- `statusCompletion` is a `StatusBarCompletion` (`statusBarModel.ts:117-150`, unchanged) whose `severity: "error"` and `actionLabel` the toast already renders (`LoadCompleteToast.tsx`); the `completion` prop at the bar's one use follows the rename.
- File ownership: `AppShell.tsx` is edited by M7-T4 (the policy state, `canvasProps.graph`, the overlay props) and M7-T5 (the status state, the listener, the two producers, the rename) in that order; `AppShell.test.tsx` and `fakeSession.ts` by the same two in the same order; `SettingsOverlay.tsx` and its test by M7-T4 only; `Graphty.tsx` (the prop, the handle's `session`, the dead declaration), `graphty/src/types/jsx.d.ts`, `Graphty.test.tsx` and `CanvasRegion.tsx` by M7-T4 only; the three `statusbar/` sources, their two test files and the new `formatAcceleration` pair by M7-T5 only; `main.tsx`, `graphty/package.json` (T1 the dependency; T2 the script line -- two keys, two tasks, in order), `project.json`, `knip.config.ts` by M7-T1; `ci.yml` by M7-T2; the element's four export files, the setter, the four default initialisers and the new test by M7-T3 (and `graphty-element/package.json` plus `exports-map.test.ts` by M7-T1 only on the retention branch); the stories file, `chromatic.config.json` and `graphty/CLAUDE.md` by M7-T6; the records, the indexes and the guide's one sentence by M7-T7.
- Commit subjects: nine at most -- `graphty` x5 (`build` T1, `fix` T2, `feat` T4, `feat` T5, `test` T6), `graphty-element` x1 (`feat` T3) plus one conditional (`build` T1), `ci` x1 (T2), and one with no scope typed `docs` (T7). Every subject starts lowercase after the colon, is at most 100 characters (the longest, the conditional `graphty-element` subject of T1, is 98; the longest unconditional, T2's `ci:` subject, is 89), and none ends in a full stop.
