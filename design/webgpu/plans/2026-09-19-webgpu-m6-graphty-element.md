# graphty-element E0 + E1 (Phase M6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in; most run in `/home/apowers/Projects/graphty-monorepo`. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees; appendix 7.1 is that command sheet.

**Goal:** Give `graphty-element` the graph-format 14.4 data model and the WebGPU design's 9.4 accelerator seam in one phase, in two halves: E0 makes `DataManager` own ONE `GraphBuilder` for the graph's life, an element-owned `positions` Float32Array attached by reference as the `position` column after every freeze, `getSnapshot()` on a sound invalidation key, `dm.undirected(s)`, a typed `snapshot-replaced` event, `Node.index` and `Node.pinned`, and retires `toAlgorithmGraph` (43 occurrences) and `EdgeMap`; E1 then adds `Graph.accelerator` / `setAccelerator()` / `accelerator-changed`, the `snapshot-replaced` release list, the adapters routed through `accelerated()` with ONE result-writing loop, the `SimulationLayoutEngine` bridge with `forceatlas2` and `spring` re-registered on it, the three `behavior.layout` knobs, `setRunning`/`reheat`, the D28 `graphty.mass` role column and the fake-accelerator stories (gate G6, element part).

**Architecture:** The seam is an injected interface. `graphty-element` types `Graph.accelerator` against `AlgorithmAccelerator` (from `@graphty/algorithms`, Phase M8a) and `LayoutAccelerator` (from `@graphty/layout`, Phase M5), so the CORE entry imports nothing from `@graphty/webgpu-graph-algorithms`. Per section 0.0, the GPU package is an OPTIONAL PEER and the element itself activates it through the `@graphty/graphty-element/webgpu` subpath, which is the only file allowed to import it; design 9.1's "the app injects the object" is superseded. Underneath that seam, the element stops deriving a graph structure per consumer and starts owning one: a long-lived `GraphBuilder` whose `freezeWithReport()` output is the single `GraphSnapshot` every adapter, every layout engine and (in E1) every accelerator call reads. Positions are the one thing the snapshot does NOT own -- the element owns the `Float32Array` and lends it to each snapshot as a `role: "position"` column by reference, so a freeze never loses a coordinate. graph-format design 14.4 (`design/graph-format/graph-format-design.md:4048-4211`) fixes the data half; WebGPU design 9.4 (`design/webgpu/webgpu-acceleration-plan.md:3068-3230`) fixes the accelerator half.

**Tech Stack:** TypeScript 5.9 (strict), `@graphty/graph-format` 1.0.0, `@graphty/algorithms` 1.7.2+, `@graphty/layout` 1.6.2+, Lit 3 and Babylon.js 8 (peer), zod 3 (`zod/v4` import path), vitest 3.2.7 (`default` / `browser` / `interactions` / `storybook` / `llm-regression` projects; Playwright Chromium 1.57.0), Storybook 9 with Chromatic (`exitZeroOnChanges: false`), pnpm 10 workspace, Nx 22, ESLint 9 flat config, knip, GitHub Actions (`ci.yml` 20-shard matrix; `graphty-element-default`, `graphty-element-browser-1..5`, `graphty-element-storybook-1..4`).

**Spec:** `design/graph-format/graph-format-design.md` (section 14.4 lines 4048-4211 for E0; 13.5 rule 3 lines 3658-3665 for the dependency shape; 17.7 lines 4934-4962 for what F2 actually deviated from) and `design/webgpu/webgpu-acceleration-plan.md` (section 9.1 lines 2870-2899, section 9.4 lines 3068-3230 items 1-10, section 7.19 lines 2289-2431 for the frame loop, section 11.4 lines 3502-3600 for the distributional metrics, section 13 line 4213 for G6, decisions D27 / D28 at lines 224-225). 14.4 is normative for the data model; 9.4 is normative for the accelerator surface. Where they disagree with the code that exists, this plan takes a PLAN DECISION and says so.

**Plan of record for the earlier phases:** `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md` (Phases M0-M5b, and the Phase M6 block at lines 3243-3253, which this plan decomposes).

**Gate:** G6, element part (design 13 row P6, `design/webgpu/webgpu-acceleration-plan.md:4213`; restated for the element at `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3250`). The record is written by Task M6-T18.

**Tasks in this document:** M6-T1 .. M6-T18. M6-T1..M6-T10 are E0 and run strictly in order except that M6-T4 is independent of M6-T2/T3 and M6-T5 is independent of everything before it; M6-T11..M6-T18 are E1 and require all of E0.

**Tasks within a phase run STRICTLY IN ORDER, one at a time, and MUST NOT be dispatched as parallel agents.** File ownership is NOT disjoint: in E0, `src/Node.ts` is edited by M6-T5 (the fields, `pin` / `unpin`, `isPinned`) and again by M6-T10 (`Node.update()`), and `src/Graph.ts` is edited by M6-T6 (the two count getters) and again by M6-T7 (the freeze point) and M6-T11 (the accelerator field). In E1, `src/managers/LayoutManager.ts` is edited by M6-T12 (the bridge construction and the `accelerator-changed` reaction), M6-T13 (`simulationOptions` and the pre-step loop) and M6-T15 (`writeNodeVector`); `src/data/GraphStore.ts` is created by M6-T3 and edited by M6-T15; `src/events.ts` and `src/managers/EventManager.ts` are edited by M6-T4 and again by M6-T11. Three agents editing `LayoutManager.ts` at once is a merge conflict, not a speed-up, so the `superpowers:dispatching-parallel-agents` skill does NOT apply to this plan.

## 0.0 AMENDMENT (2026-09-19): the element owns WebGPU, and the GPU package is an optional peer

**Read this before any task. It changes E1 and it overrules the design section this plan was
written from.** The authority is `design/decisions/2026-09-19-graphty-element-owns-webgpu.md`, and
above it the root `CLAUDE.md` "Architectural Principles": graphty-element must be self-sufficient
and directly consumable by third parties, and the graphty app is only HTML around it.

Design 9.1 made the app the ONLY importer of `@graphty/webgpu-graph-algorithms`, so this plan was
written with "graphty-element gains NO dependency on the GPU package, not even dev" as a hard
constraint. That is now wrong. Every sentence in this document asserting it is superseded by this
section -- including the **Architecture** line above, Task M6-T12's file docblock, and the G6
discussion in Task M6-T17 Step 5 and Task M6-T18.

### What changes

`@graphty/webgpu-graph-algorithms` becomes an OPTIONAL peer dependency of graphty-element, and the
element gains a second published entry point that activates it:

```js
import "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";   // the consumer's entire GPU integration
```

The second import is a SIDE-EFFECT module. It statically imports the GPU package and registers an
accelerator factory with a registry inside the element. Everything after it is the element's job:
probing for an adapter, requesting a context, constructing the accelerator, attaching it, handling
`ctx.lost`, applying `gpuMinNodes`, and running the CPU path when there is no adapter. A consumer
who does not install the optional peer omits the line; their build succeeds with no bundler
configuration.

Why a subpath and not a dynamic `import()` from the element's core: module resolution in a bundled
browser app happens at BUILD time, so a core-level import of the optional package fails the build
of every consumer who did not install it, and the fix is bundler configuration in a file the
consumer may not control. The rejected alternative is recorded in full in the decision file.

`Graph.setAccelerator()` STAYS public and unchanged. It is how Task M6-T11's fake accelerator is
injected, it is what gate G6 is defined in terms of, and it is how a third party supplies a
different implementation. The registry is a second, higher-level path to the same property.

### Task deltas

| Task | Delta |
| --- | --- |
| M6-T1 | ALSO add `"@graphty/webgpu-graph-algorithms"` to `peerDependencies` with `"peerDependenciesMeta": { "@graphty/webgpu-graph-algorithms": { "optional": true } }`, and a `"./webgpu"` condition to the `exports` map. Do NOT add it to `dependencies` or `devDependencies`. |
| M6-T11 | Unchanged in substance. `Graph.accelerator`, `setAccelerator()` and `accelerator-changed` are still exactly as written, and the fake accelerator is still the test vehicle. |
| M6-T19 | NEW, after M6-T11 and before M6-T12. The accelerator REGISTRY and auto-activation, entirely inside the element core with no GPU import. See below. |
| M6-T20 | NEW, last task of E1. The `@graphty/graphty-element/webgpu` subpath entry, the second vite lib entry, and the external/peer wiring. See below. |
| M6-T17 Step 5 | The knip/dependency check INVERTS. It no longer asserts the GPU package is absent from `package.json`; it asserts the package appears ONLY under `peerDependencies` + `peerDependenciesMeta.optional`, and that no file reachable from the CORE entry (`graphty-element/index.ts`) imports it -- only the `webgpu` entry may. |
| M6-T18 | The G6 record no longer hands "the story on the real GPU locally settles, drags and pins" and the 11.4 distributional comparison to M7. Both are now the ELEMENT's, because the element can now reach a real GPU. They move to M6-T20's gate. |

### M6-T19: the accelerator registry and auto-activation

**Files:** Create `graphty-element/src/accelerator/registry.ts`; Modify `src/Graph.ts`,
`src/config/GraphBehavior.ts`; Test `test/accelerator/registry.test.ts`. NOT touched: anything
importing `@graphty/webgpu-graph-algorithms`.

The registry holds at most one factory and imports nothing from the GPU package:

```ts
/** Builds an accelerator for one Graph, or returns null when this machine cannot. */
export type AcceleratorFactory = (opts: { exactMaxNodes?: number }) => Promise<{
    accelerator: GraphAccelerator;
    /** Resolves when the device is lost; the element then drops to the CPU. */
    lost: Promise<unknown>;
    /** For the status surface: vendor and architecture, as the GPU package reports them. */
    describe(): { vendor: string; architecture: string; description: string };
} | null>;

export function registerAccelerator(factory: AcceleratorFactory): void;
export function registeredAccelerator(): AcceleratorFactory | null;
```

`behavior.gpu` is a new `z.enum(["auto", "off", "required"]).default("auto")` on the element's
behavior config -- this is ELEMENT config, not app config, and the app's Settings control writes
it. `"auto"` uses the GPU when a factory is registered and an adapter exists; `"off"` never does;
`"required"` surfaces an error rather than silently running the CPU.

Activation runs once per Graph, on the first load that crosses `gpuMinNodes`: if a factory is
registered and `behavior.gpu !== "off"`, await it, `setAccelerator(result.accelerator)`, and
attach `result.lost.then(() => { setAccelerator(null); emit a status change; })`. The status the
element publishes is `graph.gpuStatus: { state: "on" | "off" | "unavailable" | "error"; vendor?;
architecture?; reason? }` plus a `gpu-status-changed` event through `EventManager` -- the same four
coordinated edits Task M6-T4 lists, for the same reason.

Tested with a FAKE factory, so this task still needs no GPU dependency: a factory returning an
accelerator, one returning null, one whose `lost` resolves mid-run, and `behavior.gpu: "off"`
suppressing all of it.

### M6-T20: the `webgpu` subpath entry

**Files:** Create `graphty-element/src/webgpu.ts`; Modify `graphty-element/package.json` (the
`exports` map from M6-T1), `graphty-element/vite.config.ts` (a second lib entry, and the GPU
package added to `rollupOptions.external` exactly as `@graphty/graph-format` was in Task M6-T1
Step 4b). Test `test/webgpu/subpath.test.ts`.

`src/webgpu.ts` is the ONLY file in the package that may import the GPU package:

```ts
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";
import { createAccelerator } from "@graphty/webgpu-graph-algorithms";
import { registerAccelerator } from "./accelerator/registry.js";

registerAccelerator(async ({ exactMaxNodes }) => {
    const probe = await probeBrowserWebGpu();
    if (!probe.supported) { return null; }          // no adapter, or not a secure context
    const ctx = await requestGpuContext(exactMaxNodes === undefined ? {} : { exactMaxNodes });
    return {
        accelerator: createAccelerator(ctx),
        lost: ctx.lost,
        describe: () => ({ vendor: ctx.caps.vendor, architecture: ctx.caps.architecture,
                           description: ctx.caps.description }),
    };
});
```

Note `probe.supported === false` covers the case a consumer will hit first and report as "it does
not work": WebGPU requires a SECURE CONTEXT, so a page served over plain http reports no adapter
with no other diagnostic. The status `reason` must say so in words.

**Gate for M6-T20**, absorbing the two clauses this amendment takes back from M7: a Storybook
story on the real GPU on the dev box settles, drags and pins (the Playwright + nanobanana routine
of the owner's visual rule), and the CPU and GPU stories are statistically the same under the 11.4
distributional metrics. Both are now reachable from this package.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block on an unanswered prompt as surely as the first three). Every commit in this plan is made by the owner running `tools/commit-changes.sh`; a task's "Commit" step means "leave the working tree in the described state and tell the owner which subject to commit". `tools/commit-changes.sh`'s STEPS / SUBJECTS / PATHS block is data tailored to one change set (`tools/commit-changes.sh:31-34`), so the owner re-points it at this phase's change set before running it; `--dry-run` stages nothing.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file. `tools/commit-changes.sh` validates every message before it stages anything.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes, ` -> ` for an arrow. Check a task's output with `LC_ALL=C grep -nP '[^\x00-\x7F]' <files>` before the Checkpoint.
- Never run `sudo`; nothing here needs it. Servers only on ports 9000-9099 (graphty-element dev 9020, its coverage preview 9053, the static Storybook CI serves for the `storybook` vitest project 9026). The element's Storybook dev server does NOT default to 9025: its script is `storybook dev -p ${PORT:-6006}` after sourcing `.env` (`graphty-element/package.json:105`), and `graphty-element/.env.example` sets `PORT=5173`. The 9025 in the root `CLAUDE.md` is the convention, not a default, so every command in this plan that starts it passes `PORT=9025` explicitly.
- No `eslint-disable`, `@ts-expect-error` (outside negative type tests) or `@ts-ignore`; never lower a coverage threshold. `graphty-element` has no thresholds configured today, so none may be added below the repository standard of 80 lines / 80 functions / 75 branches / 80 statements if one is added at all.
- Project rule (root `CLAUDE.md`, "Graph Styling"): node and edge appearance is applied ONLY through a style layer handed to the StyleManager, never by mutating a mesh, a material, or a node or edge object. This plan moves POSITIONS, which are not style; nothing here writes a colour, a size or a texture.
- Project rule (root `CLAUDE.md`, "Algorithm Styles"): an algorithm's `suggestedStyles` write ONLY to the elements carrying that algorithm's own result. No task in this plan changes a `suggestedStyles` block; M6-T16's rule is that the accelerated branch must write the SAME result keys to the SAME element set as the CPU branch, because a `!= \`null\`` selector's match set is the paint.
- Project rule (root `CLAUDE.md`, WebGPU): never create a fallback if WebGPU is not supported. The element never probes for a GPU and never constructs an accelerator; it uses the one it is handed and runs the CPU path when handed `null`.
- Temporary files under `./tmp/`; write a script there rather than repeating an inline one-liner.
- The design is the specification. Where this plan departs from it, the departure is listed in section 0.5 with its reason, and any departure that changes a decision the design fixed also gets a record under `design/decisions/` (section 0.5 names which).

---

## 0. Read this first

### 0.1 Where the repository stands (2026-09-19)

| Fact | Evidence |
| --- | --- |
| Master tip is `07fba28b test(webgpu-graph-algorithms): let the minimum confirm the median in bench:compare`, ONE commit ahead of `origin/master` (`cde458a2`) and unpushed. The main worktree is clean apart from the four untracked plan files of 2026-09-19 (M6, M7, M8a, M8b), this document among them. | `git log --oneline -1`; `git log --oneline origin/master..master`; `git status --porcelain --untracked-files=all` (empty) |
| `@graphty/graph-format` is `1.0.0` on master and on npm; invariants I1-I18 are frozen. F2 is DONE. | `graph-format/package.json:3`; commit `f6520f85 feat(graph-format)!: freeze the invariants and cut 1.0.0`; `design/graph-format/graph-format-design.md:4960` (the `D-F2-GATE` row of 17.7, which begins at `:4934`; the file is 4962 lines long) |
| `graphty-element` is 1.10.0 and declares exactly three workspace dependencies: `@graphty/algorithms`, `@graphty/layout`, `@graphty/remote-logger`. It declares NO `@graphty/graph-format` and NO `@graphty/webgpu-graph-algorithms`. | `graphty-element/package.json` dependencies block |
| There is no accelerator surface anywhere in the element. | `grep -ri "accelerator" graphty-element/src` returns nothing |
| `DataManager` is 695 lines and holds NO graph structure: `nodes`, `nodeCache` (a duplicate of `nodes`), `edges` and `edgeCache: EdgeMap`, all of render objects. | `graphty-element/src/managers/DataManager.ts:31-36`; `wc -l` = 695 |
| `toAlgorithmGraph` occurs 43 times across 22 files in `graphty-element/src` (21 adapters, each with one import and one call site, plus `graphConverter.ts`'s definition); `EdgeMap` occurs 9 times across 3 files, of which 6 are the UNRELATED `newEdgeMap` field of `D3GraphLayoutEngine`. The two real sites are `DataManager.ts:5` and `:36`; the class is `Edge.ts:1201`. | `grep -rn "toAlgorithmGraph" graphty-element/src \| wc -l` = 43; `grep -rln "toAlgorithmGraph" graphty-element/src \| wc -l` = 22; `grep -rn "EdgeMap" graphty-element/src` |
| `Node` has no `index` and no `pinned`; `Node.isPinned()` hard-returns `false`. | `graphty-element/src/Node.ts:26-56`, `:613-616` |
| `SimpleLayoutEngine` (the class opens at `LayoutEngine.ts:194`; `SimpleLayoutConfig` is at `:185`) has `setNodePosition`, `.step`, `.pin`, `.unpin` all no-ops and `isSettled` a `readonly true`; `forceatlas2` and `spring` are its subclasses. | `graphty-element/src/layout/LayoutEngine.ts:194`, `:275`, `:302`, `:311`, `:320`, `:341`; `ForceAtlas2LayoutEngine.ts:122`, `SpringLayoutEngine.ts:75` |
| `LayoutEngine.get(type, opts)` constructs `new SourceClass(opts)` with no third argument; the registry stores CLASSES, and `graphty-element/src/layout/index.ts:19-34` registers 16 of them. | `graphty-element/src/layout/LayoutEngine.ts:18-19`, `:111-118` |
| `EventManager.addListener`'s `default` branch throws `TypeError("Unknown event type: " + type)`; `"layout-changed"` and `"layout-updated"` are emitted through the untyped `emitGraphEvent` and are therefore NOT subscribable today. | `graphty-element/src/managers/EventManager.ts:449-450`, `:192-195`; `LayoutManager.ts:184-187`, `:470-473` |
| `graph-settled` is emitted from exactly ONE place and every layout story's `play()` waits on it. | `graphty-element/src/Graph.ts:547-549`; `graphty-element/stories/helpers.ts:47` |
| `test/managers/DataManager.test.ts` runs ONLY in the `browser` vitest project (it is excluded from `default`), so an E0 change to `DataManager` cannot be verified by a fast node run. | `graphty-element/vitest.config.ts:19` (exclude) and `:63` (include) |
| `test/helpers/mockGraph.ts` is imported by 27 test files and implements ONLY `getDataManager()` returning `{ nodes, edges, graphResults }`. | `grep -rln "createMockGraph" graphty-element/test \| wc -l` = 27; `test/helpers/mockGraph.ts:105-160` |
| Chromatic for the element runs with `exitZeroOnChanges: false`, so any pixel change RED-LIGHTS CI until a human accepts the baseline. | `.github/workflows/ci.yml:619` |
| `commitlint.config.js`'s scope-enum contains `graph-format`, `graph-io` and `webgpu-graph-algorithms`; `tools/commit-changes.sh:468-469`'s hardcoded `VALID_SCOPES` does NOT. It DOES contain `graphty-element`, `deps`, `docs`, `tools` and `workspace`. | `commitlint.config.js:8-25`; `tools/commit-changes.sh:468-469` |

### 0.2 Entry criteria: MET or NOT MET

The integration plan states three (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3247`): "Phase M5 on master; the first A2 commit (Phase M8a) on master; graph-format `>= 1.0.0`."

| Criterion | Status | Evidence |
| --- | --- | --- |
| graph-format `>= 1.0.0` on master | **MET** | `graph-format/package.json:3` is `"version": "1.0.0"`; `npm view @graphty/graph-format version` -> `1.0.0`; commit `f6520f85` |
| Phase M5 (the `@graphty/layout` simulation seam) on master | **NOT MET** | `ls layout/src/` on master -> `algorithms generators index.ts layouts types utils` (no `simulation/`). The work is on branch `feat/layout-simulation`, open as **draft PR #12** (`gh pr view 12`: `state OPEN`, `isDraft true`, `mergeStateStatus UNSTABLE`; `Test (d3d12 on windows-latest)` RED on run 35408894651). `git log --oneline master..feat/layout-simulation` = 5 commits. |
| Phase M5b (`webgpu-graph-algorithms` adopts the real layout types) on master | **NOT MET**, and has never been proposed | `gh pr list --state all --limit 30` returns exactly two rows, #12 (draft) and #11 (merged). `feat/webgpu-layout-types` has no PR. Its worktree is `.worktrees/layout-simulation` -- the directory name does NOT match the branch. |
| The first A2 commit (Phase M8a) on master | **NOT MET** | `ls algorithms/src/` -> `algorithms benchmark-all-algorithms.ts clustering core data-structures flow index.ts link-prediction optimized pathfinding research types utils`; there is no `indexed/`. `grep -rn "accelerated\|AlgorithmAccelerator" algorithms/src/` returns nothing. |
| M8a's OWN entry criterion, "the A1 branch merged" | **NOT MET, and A1 does not exist in any branch** | `algorithms/package.json` declares no `@graphty/graph-format`; `grep -rn "toSnapshot" algorithms/src/` returns nothing; `design/graph-format/graph-format-design.md:4960` (row `D-F2-GATE`) records that 1.0.0 was cut with this gate DEVIATED FROM because "A1 has not started". |

**So M6 cannot start today.** The minimal unblocking path is decision D3 of the owner's scope decisions, stated identically in all four M6 / M7 / M8a / M8b plan documents of 2026-09-19:

```
merge PR #12 (M5) -> merge M5b -> M8a (A1 + the six ports + the accelerator seam) -> M6 (E0 then E1) -> M7
M8b is independent of that whole chain.
```

M8b (design phase P7, the GPU SpMV family) may run in parallel with every step of it, and is the ONLY phase whose entry criteria are met today.

Two things about that path are load-bearing for this document and are NOT re-opened here:

1. **M8a absorbs graph-format design 14.6's A1 and a minimal set of `indexed.*` ports.** `algorithms/src/indexed/` does not exist on master or on any of the 17 refs, so M8a as literally scoped -- "design 9.2 `indexed/accelerator.ts` + `accelerated()`" -- would ship a dispatcher with ZERO methods (the design says so itself: "the 'first A2 commit' dispatcher carries only the methods whose `indexed.*` function has landed"). The port set M8a delivers is the six with complete reference implementations in `design/graph-format/graph-format-design.md`: `breadthFirstSearch` (:3823), `dijkstra` (:3856), `pageRank` (:3889), `connectedComponents` (:3924), `kruskalMST` (:3930), `commonNeighborsScore` (:3940).
2. **Five of those six have an element adapter** (`commonNeighborsScore` has none). Together with `DegreeAlgorithm`, which needs no accelerator method at all because a snapshot answers degrees directly, that is the SIX adapters this plan moves off the legacy CPU surface. The other 17 stay on a legacy `@graphty/algorithms` `Graph` that E0 builds FROM THE SNAPSHOT instead of from render objects (Task M6-T8). That is what makes "retire `toAlgorithmGraph`" a complete statement at M6 rather than a promise about M8a's later port PRs.

### 0.3 Phase map and execution order

| Phase | Where | Entry criteria | Deliverable | Gate | Size |
| --- | --- | --- | --- | --- | --- |
| M5 Layout seam (L1-sim) | `layout/` | F2 (MET) | `layout/src/simulation/` per design 9.3 | layout tests green; `chromatic-layout` re-baselined | PR #12, open |
| M5b Layout types in the GPU package | `webgpu-graph-algorithms/` | M5 on master | the D27 mirrors for `LayoutSimulation` / `LayoutAccelerator` replaced by `import type` | both software shards green | branch, no PR |
| M8a A1 + six ports + the accelerator seam | `algorithms/` | F2 (MET); A1 is NOT met and is ABSORBED into the phase (M8a DEP-8A-B); M5b on master for its Task M8a-T13 only | `toSnapshot`, the differential harness, six `indexed.*`, `indexed/accelerator.ts`, `accelerated()`, then the GPU package's W1b algorithms half | the G6 algorithms clause + the G10 algorithms clause + the 14.6 A1 gate string | own plan |
| **M6a E0 -- the DataManager refactor** | `graphty-element/` | M5 on master; M8a NOT required | graph-format 14.4: one builder, element-owned positions, `getSnapshot()`, `dm.undirected(s)`, `snapshot-replaced`, `Node.index`, `toAlgorithmGraph` and `EdgeMap` retired | element tests green with NO behaviour change visible in a story; Chromatic unchanged | 15-21 ed |
| **M6b E1 -- the accelerator seam** | `graphty-element/` | M6a; M5 and M8a on master | design 9.4 items 1-10 | design G6, element part | 12-18 ed |
| M7 App (W2) | `graphty/` | M6 on master | design 9.5 `attachAccelerator`, the indicator, the `gpu`-tagged stories | design G12 (W2 subset), as restated by `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` | own plan |
| M8b GPU SpMV family (P7) | `webgpu-graph-algorithms/` | M3 (MET) and the design's P2 gate (MET) | design P7 (the 8.2 / 8.3 kernels) | design G7 | own plan |

Critical path: M5 (PR #12) -> M5b -> M8a -> M6a -> M6b -> M7 ; M8b in parallel with all of it, and M8b is the ONLY phase whose entry criteria are met today. E0 (M6a) is the ONLY part of M6 that can start as soon as M5 merges: it needs `@graphty/graph-format` and nothing from `@graphty/algorithms` beyond what the element already depends on. This plan therefore splits the phase's commits so that E0 lands as its own PR and E1 waits for M8a.

Sizes are engineer-days for one engineer familiar with the code base, the unit the design uses (`design/webgpu/webgpu-acceleration-plan.md:4198`). The design sizes the WHOLE of design 9.4 at "8-10 ed (across three packages)" and does not size E0 at all, calling it "the larger half of the phase" (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3248`). This plan sizes E0 at 15-21 ed and the element's share of E1 at 12-18 ed, total 27-39 ed plus owner time for the Chromatic re-baseline. The per-task sizes are in the task headers and in appendix 7.4.

### 0.4 Decisions (defaults stand unless the owner says otherwise before Task M6-T1 starts)

| Id | Decision | Default and reason | Alternative |
| --- | --- | --- | --- |
| D-M6-1 | E0 and E1 are two PRs | E0 touches no `@graphty/algorithms` symbol that does not exist today, so it can merge the day M5 merges; E1 cannot compile until M8a is on master. One PR would hold 15-21 ed of finished work hostage to an unstarted phase, and would put an E0 regression and an E1 regression in the same Chromatic re-baseline where neither can be attributed. Both PRs land on `master` through `feat/element-graph-store` and `feat/element-accelerator`. | One PR. Choose it only if the owner wants a single Chromatic re-baseline and accepts the schedule coupling. |
| D-M6-2 | The E0 PR ships with ZERO intended visual change | Every E0 behaviour change is either invisible (the data structure) or pinned by a unit test. If a Chromatic story moves during E0, that is a BUG, not a re-baseline. The re-baseline is E1's, where `scalingFactor` genuinely changes meaning. | -- |
| D-M6-3 | `graphty-element` declares `@graphty/graph-format` in BOTH `dependencies` (`workspace:^`) and `peerDependencies` (`^1.0.0`) | graph-format design 13.5 rule 3 (`design/graph-format/graph-format-design.md:3658-3665`), as corrected in place at F2: "`workspace:*` publishes an EXACT pin", so `workspace:^` is the only form that keeps one copy in an app that installs several consumers. `graph-io/package.json` is the worked precedent. | -- |
| D-M6-4 | The element resolves `@graphty/graph-format` through its BUILT `dist`, not through a `paths` map into `../graph-format/src` | `graphty-element/tsconfig.json` has no `paths`, no `composite` and no `references`, and neither does `tsconfig.base.json` -- the repository has NO cross-package project references at all, despite what the root `CLAUDE.md` says. Build order comes from nx. Adding a `paths` map (graph-io's shape) would make the element compile against sources that its own bundle does not ship. Consequence: `pnpm exec nx run graph-format:build` must precede any element test run in a fresh worktree; the phase's Step 0 does it and nx's `dependsOn: ["^build"]` does it in CI. | graph-io's `paths` + cross-package `include`. Choose it only if a debugger needs to step into graph-format sources. |
| D-M6-5 | E0's new logic lives in two NEW modules under `graphty-element/src/data/`, not inside `DataManager.ts` | `test/managers/DataManager.test.ts` is excluded from the `default` vitest project and runs only in `browser` (`graphty-element/vitest.config.ts:19`, `:63`), which is sharded 1..5 in CI and needs Playwright. Position arithmetic and freeze/remap bookkeeping are the two places an off-by-one is silent and expensive, and putting them in `src/data/positions.ts` and `src/data/GraphStore.ts` makes them testable by `pnpm exec vitest run --project=default`, which is seconds. `DataManager` keeps its public shape and becomes the caller. | Everything in `DataManager.ts`. Choose it only if the owner objects to two new files. |
| D-M6-6 | Parallel edges stay DROPPED in E0; duplicate node ids become a MERGE | The two halves of design 14.4's "duplicates" story have very different blast radii. A node merge inverts ONE test (`test/managers/DataManager.test.ts:77`) and fixes a real bug (a second chunk carrying richer attributes for a known id is silently discarded today, `DataManager.ts:232-234`). Keeping parallel edges changes `Edge.id`'s uniqueness -- `Edge.id` is `` `${srcNodeId}:${dstNodeId}` `` (`Edge.ts:111`) and is the KEY of `DataManager.edges`, the string `DijkstraAlgorithm` rebuilds by hand to match path edges (`DijkstraAlgorithm.ts:188-190`), and the key shape `Algorithm.get results()` publishes. Deferred with a decision record. | Keep parallel edges now. Choose it only if a dataset in hand needs them; budget a further 2-3 ed for edge identity. |
| D-M6-7 | The `snapshot-replaced` notification is a typed `GraphEvent`, not a private listener array | The design sketch (`graph-format-design.md:4139`) uses `private readonly listeners: ((previous, next, report) => void)[]`. The element already has one notification mechanism -- the typed `GraphEvent` union plus `EventManager` -- and `"layout-changed"` / `"layout-updated"` are the standing evidence of what a second, untyped mechanism costs: both are emitted (`LayoutManager.ts:184`, `:470`) and NEITHER can be subscribed to, because `EventManager.addListener`'s switch does not list them and its `default` throws (`EventManager.ts:449-450`). E1's `LayoutManager` consumer and the app's future listeners need a subscribable event. Cost: four coordinated edits (Task M6-T4). | The private array. Choose it only if a profile shows the Observable notify is hot; it fires once per freeze, not per frame. |
| D-M6-8 | `Edge.id` keeps its `"src:dst"` string form; the element-assigned counter is a SEPARATE `Edge.index` | design 14.4 rule 3 makes the counter the identity and says "its string form is what events expose", i.e. `String(counter)`. That silently breaks `DijkstraAlgorithm.getPathEdges` (`DijkstraAlgorithm.ts:200-208`), the `edge.<srcId>:<dstId>` keys of `Algorithm.get results()` (`Algorithm.ts:194-217`), and any app or story that parses an edge id. With D-M6-6 the string stays unique, so it stays the identity. The counter still exists, in the `graphty.edgeId` u32 role-`id` edge column, and `Edge.index` carries it; `snapshot.edgeIndexOf(id)` works off that column. Departure DEP-M6-B. | The design's spelling. Choose it only together with D-M6-6's alternative. |
| D-M6-9 | `data.knownFields.edgeWeightPath` defaults to `"weight"` and probes `"value"` second, once per load with a debug log | design 14.4 rule 10 makes the default `"weight"` and calls the change documented (open question 5). But `toAlgorithmGraph` has hard-coded `weightAttribute = "value"` since it was written (`graphConverter.ts:35`) and `edgeWeightPath` has never been read by anything, so EVERY weighted dataset and story in the repository today carries `value`. Changing the path and dropping the old probe in one commit re-weights every weighted algorithm in every story invisibly. The second probe is E0-only and is removed by a later phase. Departure DEP-M6-C. | Hard cutover to `"weight"`. Choose it only after grepping the story fixtures for `value`. |
| D-M6-10 | `getSnapshot()` is the ONLY freeze site and it is LAZY | design 14.4 rule 6 asks for freezes "COALESCED per operation-queue drain". The element has three paths that bypass the queue: `addDataFromSource` entirely (`Graph.ts:332-334` documents it), `skipQueue` on `Graph.addNodes` / `addEdges` (`Graph.ts:1004-1007`, `:1079-1082`), and the queue's own `data-add` trigger (`Graph.ts:215-226`). A lazy cached `getSnapshot()` coalesces ALL of them by construction: however many mutations a burst contains, the first reader after the burst pays for one freeze and every later reader in the same revision gets the cached object. No queue change is needed and no bypass has to be closed. | An eager freeze on drain. Rejected: it freezes when nobody is reading, and it still misses the two bypasses. |
| D-M6-11 | The element NEVER hands a snapshot's `transferables()` to `postMessage` | `snapshot.transferables()` lists the element's LIVE positions buffer as exclusively transferable (verified: after attaching a caller-owned `Float32Array`, `t.includes(pos.buffer)` is `true`), because `AttributeTable.set` claims one holder of the buffer (`graph-format/src/util/shared-buffers.ts:29`). graph-format exports no `noteShared`, so the element cannot tell the format otherwise. A `postMessage(msg, snapshot.transferables())` would DETACH the element's own position array mid-frame, and every subsequent read would throw. There is no worker path in the element today; Task M6-T3 adds a guard test that pins the absence. Departure DEP-M6-D. | Copy the position buffer before transferring. Choose it when a worker path is actually built (M7 or later). |
| D-M6-12 | `SimulationLayoutEngine` is constructed by `LayoutManager`, not by the registry | `LayoutEngine.get(type, opts)` is `new SourceClass(opts)` with no third argument (`LayoutEngine.ts:111-118`) and the registry stores classes (`:18-19`). A factory form would touch all 16 registrations in `src/layout/index.ts:19-34` and every engine constructor. Design 9.4 item 4 asks for exactly the special case: `new SimulationLayoutEngine(type, opts, createSimulation(type, opts, graph.accelerator))` inside `_setLayoutInternal`. | A factory registry. Choose it only if a second engine family also needs construction-time context. |
| D-M6-13 | The fake accelerator lives in `graphty-element/src/testing/fakeAccelerator.ts` and is imported by BOTH the tests and the two GPU stories | design 9.4 item 8 asks for stories with "a FAKE accelerator for Chromatic (a `LayoutSimulation` that moves nodes deterministically)" and G6 asks for "element tests + stories green with a fake accelerator". One implementation keeps the story and the test honest about the same object. A story importing from `test/helpers/` would pull the vitest helper graph into the Storybook build, so the file sits under `src/testing/`, exported from no barrel. It is reachable from NEITHER of the element's two entry points -- the library bundle's entry is `graphty-element/index.ts` (`graphty-element/vite.config.ts:27`, `build.lib.entry: "./index.ts"`; there is no `src/index.ts`) and knip's entry for the workspace is `src/graphty-element.ts` (root `knip.config.ts:115-123`) -- so the bundle does not carry it. knip does not report it unused either, because that same workspace block lists `test/**/*.ts` and `stories/**/*.stories.ts` as entries and both import it; Task M6-T17 Step 5 checks. **It is created by Task M6-T11, the FIRST task of E1**, because four later tasks test against it. | Two copies. Rejected: the story would drift from the gate. |
| D-M6-14 | `graph-settled` does NOT gate on an in-flight GPU batch | `Graph.ts:547-549` fires `graph-settled` and sets `running = false` on the first frame where `isSettled && running`. Under design 7.19 `settled` describes the LAST COMPLETED batch, so it lags by at most one batch (at most `maxInFlight` batches are in flight, default 2). Gating the event on `inFlight === 0` would require the bridge to expose in-flight state that `LayoutSimulation` does not have (`layout/src/simulation/types.ts:57-70` has `settled`, not `inFlight`), and it would delay every Chromatic screenshot by one readback for no pixel difference: a settled simulation's last batch moves nodes by less than the settle threshold by definition. Departure DEP-M6-E; the residual risk is R-M6-7. | Add `flush()` to the bridge and await it. Choose it if a screenshot ever shows a visibly unsettled frame. |

### 0.5 Departures from the design (all of them)

| Id | Departure | Reason |
| --- | --- | --- |
| DEP-M6-A | 14.4's memoisation key `snapshotMutation !== builder.mutationCount` is replaced by an element-owned `revision` counter. | `builder.mutationCount` does not bump on a merge, an attribute write or `freeze()` (`graph-format/src/types/builder.ts:345`: "Increments on every topology or weight mutation; column writes and freeze() do not count"), and 14.4's own mutation table routes `addNodes` of an existing id through `addNodeRecord` last-write-wins, which is exactly a merge. A burst of merges would return a STALE snapshot and fire no `snapshot-replaced`. Task M6-T3 PLAN DECISION 1. No decision record: this corrects a sketch, it does not reverse a decision. |
| DEP-M6-B | Edge identity stays the `"src:dst"` string (D-M6-8); the 14.4 counter becomes `Edge.index` and the `graphty.edgeId` column. | See D-M6-8. Record: `design/decisions/2026-09-19-element-edge-identity-stays-the-pair-string.md`, written by Task M6-T6 Step 5. |
| DEP-M6-C | `edgeWeightPath` defaults to `"weight"` but probes `"value"` second for one release (D-M6-9). | See D-M6-9. Record: the same file as DEP-M6-B is a different decision, so a second record, `design/decisions/2026-09-19-element-edge-weight-probes-value-second.md`, written by Task M6-T6 Step 5. |
| DEP-M6-D | The element never calls `snapshot.transferables()` or `toWire({ transfer: true })` (D-M6-11). | The format would hand out the element's live position buffer. No record: nothing in the design asks the element to transfer a snapshot; this closes a hazard the design does not mention. |
| DEP-M6-E | `graph-settled` does not gate on in-flight batches (D-M6-14). | See D-M6-14. No record: design 7.19 already says "Positions the renderer draws lag the simulation by one batch, invisible for a settling layout"; this plan is agreeing with it, against a reading of 9.4 item 9 that could be taken the other way. |
| DEP-M6-F | 14.4 rule 7's `getEdgePositionsInto(e, outSrc, outDst)` is not added; the bridge implements today's `getEdgePosition(e): EdgePosition` instead. | `Edge.update()` returns early when `getEdgePosition` yields nothing (`graphty-element/src/Edge.ts:301-305`), so a bridge without it silently stops every edge tracking its endpoints -- and design 9.4 item 4's `SimulationLayoutEngine` sketch omits the method entirely. Allocating two vectors per edge per frame is the cost 14.4 rule 7 wants to remove, so the bridge returns a REUSED pair of objects and documents that the caller must not retain them. Task M6-T12 PLAN DECISION 4. |
| DEP-M6-G | Only SIX adapters become snapshot-native at M6; 17 run on a legacy `@graphty/algorithms` `Graph` rebuilt FROM the snapshot. | 14.4's retirement paragraph (`graph-format-design.md:4189`) says every adapter becomes `indexed.x(s)`. `indexed` is A2 work and M8a ships six ports (section 0.2). Rebuilding the legacy `Graph` from the snapshot still retires `toAlgorithmGraph`, `graphConverter.ts` and `graphUtils.ts`, still gives every adapter one snapshot per run, and leaves a one-line-per-adapter edit for each later port PR. Task M6-T8. |
| DEP-M6-H | design 13 row P6 says "`graphty-element`: 9.4 items 1-9"; this plan implements items 1-10. | The integration plan's M6 row is the later document and says "design 9.4 items 1-10" (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:86`, `:3249`). Item 10 is the D28 role columns, and D28 itself (`webgpu-acceleration-plan.md:225`) names "graphty-element at engine creation" as the writer, so omitting it would leave the GPU simulation unable to find a `nodeMass` the element accepted. Task M6-T15. |
| DEP-M6-I | G12's clause "nightly GPU lane green for a week" is VOID and is not invoked anywhere in this plan. | `design/decisions/2026-09-19-no-nightly-gpu-lane.md` removed the schedule trigger; `.github/workflows/gpu.yml`'s trigger block now reads "The lane runs on every master push, and on a pull request of this repository labelled `gpu`; there is NO nightly cron". The honest restatement is: the GPU lane runs on every master push and `release.yml`'s `gate` job refuses to publish unless it succeeded. G12 is M7's gate, not M6's, so this plan neither invokes G12 nor writes a record for it. The ONE record of the restatement is `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`, written by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`; this row CITES it. The M8a plan's DEP-8A-F cites the same file and the M8b plan defers to it in its section 0.7, so the programme has one record under one filename. |
| DEP-M6-J | `data.knownFields.idCoercion` ships with ONE unconditional `"canonical"` default, and NO task in M6 reads it. | 14.4's retirement paragraph (`graph-format-design.md:4204`) specifies a SOURCE-DEPENDENT default -- `"canonical"` for text sources, `"keep"` for JSON (section 4.1). No `DataSource` in the element exposes its text/JSON kind to the config layer, so the per-source default cannot be computed at `DataConfig.parse` time. The field is shipped now because it is part of 14.4's config surface and `DataConfig` is a `z.strictObject`, so adding it later is the breaking direction; it is INERT at M6 -- `ingestNode` passes ids through unchanged and M6-T8 Step 4 deliberately keeps `MaxFlow` / `MinCut`'s `String(...)` coercion. The phase that gives it meaning is IO1 (the importer id-semantics phase), which is also the phase that can supply the source kind. M6-T1 Step 1's test pins the default so the later change is visible. No record: this defers a field, it does not reverse a decision. |
| DEP-M6-K | `getEdgeBetween(src, dst)` stays the `"src:dst"` string lookup; 14.4's `builder.findEdges(u, v)[0]` while dirty (`graph-format-design.md:4176`) is not adopted. | M6-T6 PLAN DECISION 7. The string key is O(1), already exists, already keys `DataManager.edges`, and works while the builder is dirty; `findEdges` costs two id-to-index lookups and is O(degree). This is only sound BECAUSE parallel edges stay dropped (D-M6-6); it reverses with that decision. No record: DEP-M6-B's record already carries the parallel-edge reasoning this rests on. |
| DEP-M6-L | `getStats()` reports `this.nodes.size` / `this.edges.size`, not 14.4's "`builder.nodeCount`, `builder.edgeCount` minus mirror halves" (`graph-format-design.md:4185`). | M6-T6 PLAN DECISION 8. Under M6-T6 PLAN DECISION 5 the builder and the render maps diverge transiently -- an edge whose endpoints have not arrived is in the builder and not in `edges` -- and `getStats` feeds the on-screen counter, which should count what is DRAWN. No `getSnapshotStats()` is added because nothing asks for one. No record: this picks which of two true numbers a UI counter shows. |
| DEP-M6-M | 14.4's `addEdges` row says "Duplicate `(src, dst)` pairs are now kept -- `EdgeMap` and the 'duplicate Edge' throw are deleted" (`graph-format-design.md:4176`); this plan deletes `EdgeMap` and the throw but KEEPS dropping duplicate pairs. | D-M6-6 and M6-T6 PLAN DECISION 3. Keeping parallel edges changes `Edge.id`'s uniqueness, and `Edge.id` is the key of `DataManager.edges`, the string `DijkstraAlgorithm` rebuilds by hand (`DijkstraAlgorithm.ts:200-208`) and the key shape `Algorithm.get results()` publishes. Record: the same file as DEP-M6-B, `design/decisions/2026-09-19-element-edge-identity-stays-the-pair-string.md`, whose "What we are giving up" section states the multigraph cost and whose reversal condition is a dataset in hand. |

### 0.6 Where each open question is answered

Every item the dossiers flagged as unanswered by the designs is resolved by a numbered PLAN DECISION inside the task that implements it. This index is the map; the decision text is at the task.

| Open question | Resolved by |
| --- | --- |
| `getSnapshot()` invalidation key, given `mutationCount` ignores merges | M6-T3 PLAN DECISION 1 |
| positions grow by allocate-and-copy, never `ArrayBuffer.resize` | M6-T2 PLAN DECISION 1 |
| `replaceRole: true` deletes the importer seed column | M6-T3 PLAN DECISION 3 |
| `transferables()` lists the live positions buffer | M6-T3 PLAN DECISION 5 |
| `snapshot-replaced`: typed event vs private array; the four edits | D-M6-7, M6-T4 PLAN DECISION 1 |
| `snapshot-replaced` payload shape (object vs positional) | M6-T4 PLAN DECISION 2 |
| `Node.index` AND `Node.pinned` are both NEW; the pin/drag gates are new behaviour | M6-T5 PLAN DECISION 1 and 2 |
| `nodes` vs `nodeCache` duplication | M6-T6 PLAN DECISION 1 |
| duplicate node ids, parallel edges, `removeNode` cascade | M6-T6 PLAN DECISIONS 2, 3, 4 |
| the `bufferedEdges` retry loop under a builder that creates endpoints | M6-T6 PLAN DECISION 5 |
| weights: which path, and the `"value"` fallback | M6-T6 PLAN DECISION 6 |
| where the coalesced freeze actually runs | M6-T7 PLAN DECISION 1 |
| `runAlgorithmsOnLoad` per chunk vs on load-complete | M6-T7 PLAN DECISION 2 |
| which adapters are snapshot-native on day one | M6-T8 PLAN DECISION 1 |
| the triplicated algorithm registration | M6-T8 PLAN DECISION 4 |
| `mockGraph.ts`, imported by 27 files, implements only `getDataManager()` | M6-T9, the whole task |
| `LayoutEngine.get` cannot pass `graph.accelerator` | D-M6-12, M6-T12 PLAN DECISION 1 |
| the bridge must implement `addNode` / `addEdge` / `nodes` / `edges` / `type`, which are abstract | M6-T12 PLAN DECISION 7 |
| the pre-step loop needs an AWAITABLE step, which `abstract step(): void` cannot be | M6-T12 PLAN DECISION 3 (`stepAsync`) |
| `GraphAccelerator.release` must stay optional | M6-T11 PLAN DECISION 3 |
| a snapshot node with no render object makes `addNodeResult` throw | M6-T8 PLAN DECISION 6 |
| the D28 mass column must be TOTAL, because `resolveNodeVector` short-circuits on it | M6-T15 PLAN DECISION 2 |
| where the fake accelerator lives, and which task creates it | D-M6-13, M6-T11 Step 1 |
| the bridge needs `getEdgePosition` | DEP-M6-F, M6-T12 PLAN DECISION 4 |
| `iterationsPerStep` default = `stepMultiplier`, which zod cannot express | M6-T13 PLAN DECISION 3 |
| `preSteps` under an async step, and the 256-iteration bound | M6-T13 PLAN DECISION 4, tested by M6-T13 Step 1's last two cases |
| `graph-settled` vs an in-flight GPU batch | D-M6-14, M6-T13 PLAN DECISION 5 |
| `scalingFactor` vs `scale`, where Spring already has both | M6-T13 PLAN DECISION 1 |
| `gravity: positive()` vs the Storybook slider's `min: 0` | M6-T13 PLAN DECISION 2 |
| Chromatic re-baseline is CI-blocking | M6-T18 Step 2 |
| G12's void nightly clause | DEP-M6-I, which CITES the M7 plan's record; M6 writes none |

---

## Phase M6a: E0 -- the graph-format 14.4 DataManager refactor

**Entry criteria:** Phase M5 on master (`@graphty/layout` exports `layout/src/simulation/`) and `@graphty/graph-format >= 1.0.0` on master (MET). M8a is NOT required for E0 -- see section 0.2 and DEP-M6-G. Work on branch `feat/element-graph-store` in a worktree (`git worktree add .worktrees/element-graph-store -b feat/element-graph-store master`, owner); every commit through `tools/commit-changes.sh` with scope `graphty-element` (in that script's `VALID_SCOPES` already, `tools/commit-changes.sh:468-469`, so E0 needs no fix to the script); the half lands as ONE PR whose Chromatic jobs must come back with NO changes (D-M6-2).

**Step 0 of the phase (a fresh worktree has no `node_modules` and no `dist/`, both gitignored):** `cd EG && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,algorithms,layout,remote-logger,compact-mantine --parallel=3`. Every later command resolves `@graphty/graph-format` through `graph-format/dist/graph-format.d.ts` and `graph-format/dist/graph-format.js` (D-M6-4); the element's `tsconfig.json` has no `paths` map, so an unbuilt graph-format is a `Cannot find module` on the first `tsc`.

**Build `remote-logger` or the baseline is a FALSE GREEN (measured 2026-09-19).** This step originally named only `graph-format,algorithms,layout`. `graphty-element` also depends on `@graphty/remote-logger` (`graphty-element/package.json` dependencies), and `src/logging/sinks/RemoteSink.ts:17` imports it at module scope. With it unbuilt, vite cannot resolve the entry and **30 of 162 test files fail to COLLECT** -- and vitest reports the run as `Test Files 30 failed | 132 passed` with `Tests 2679 passed`, i.e. every test it managed to collect passes. Read casually that looks like a pre-existing flake; it is a fifth of the suite never running. The verified numbers on `07fba28b` with the five packages built are **162 files / 3105 tests passed / 6 skipped**, and that is the only baseline against which "did I regress anything" means anything. `compact-mantine` is in the list for the same reason, one layer out.

### Task M6-T1: The graph-format dependency, and the four config fields E0 needs

**Repository:** `/home/apowers/Projects/graphty-monorepo/.worktrees/element-graph-store` (`EG` below). Size: 0.5-1 ed.

**Spec:** graph-format design 13.5 rule 3 (`design/graph-format/graph-format-design.md:3658-3665`, the dependency shape); 14.4's per-mutation-path table lines 4174-4188, whose `addNodes` row names `data.knownFields.positionScale` at `:4175`; 14.4's retirement paragraph at `:4204` for `data.knownFields.idCoercion` (which the table does NOT name); 14.4 rule 1 lines 4052-4066 (`data.directed: boolean | "auto"`, default `"auto"`); 14.4 rule 10 lines 4116-4120 (`edgeWeightPath`).

**Files:**
- Modify: `graphty-element/package.json` (dependencies, peerDependencies)
- Modify: `graphty-element/src/config/DataConfig.ts` (four fields)
- Modify: `graphty-element/vite.config.ts` (`rollupOptions.external` and `output.globals`; see Step 4b)
- Modify: `pnpm-lock.yaml` (the 3-line `graphty-element` importer hunk)
- Modify: **24 test and helper files** carrying a `data.knownFields` literal -- the full list is in Step 4, and they ride in the SAME commit or `tsc --noEmit` is red
- Test: `graphty-element/test/config/data-config.test.ts` (new)
- NOT touched: `graphty-element/tsconfig.json` (D-M6-4: no `paths`, no `references`), `pnpm-workspace.yaml`, `nx.json`

**Interfaces:**
- Consumes: `@graphty/graph-format@1.0.0`'s barrel (`graph-format/src/index.ts`, 126 names; `graph-format/test/audit/conformance-exports.test.ts` pins the list).
- Produces: `config.data.directed: boolean | "auto"`, `config.data.knownFields.positionScale: number`, `config.data.knownFields.idCoercion: "canonical" | "keep"`, and `config.data.knownFields.edgeWeightPath` defaulting to `"weight"` instead of `null`.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/config/data-config.test.ts`:

```ts
import { assert, describe, it } from "vitest";

import { DataConfig } from "../../src/config/DataConfig";

describe("DataConfig", () => {
    it("defaults data.directed to auto", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.directed, "auto");
    });

    it("defaults edgeWeightPath to weight", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.knownFields.edgeWeightPath, "weight");
    });

    it("defaults positionScale to 1 and idCoercion to canonical", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.knownFields.positionScale, 1);
        assert.strictEqual(parsed.knownFields.idCoercion, "canonical");
    });

    it("rejects an unknown top-level key because DataConfig is a strictObject", () => {
        assert.throws(() => DataConfig.parse({ directedness: true }));
    });
});
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/config/data-config.test.ts`
Expected: FAIL, four times (`parsed.directed` is `undefined`; `edgeWeightPath` is `null`; `positionScale` and `idCoercion` are `undefined`). The fourth passes already -- `DataConfig` is `z.strictObject` (`graphty-element/src/config/DataConfig.ts:13`) -- and is there to pin that it stays one.

- [ ] **Step 2: The dependency**

In `EG/graphty-element/package.json` add to `dependencies`, keeping the block alphabetical (it currently runs `@graphty/algorithms`, `@graphty/layout`, `@graphty/remote-logger`):

```json
        "@graphty/graph-format": "workspace:^",
```

and add a `peerDependencies` entry beside the three that are there (`@babylonjs/core`, `@mlc-ai/web-llm`, `lit`):

```json
        "@graphty/graph-format": "^1.0.0",
```

Reason: graph-format design 13.5 rule 3 requires BOTH, and requires `workspace:^` rather than `workspace:*`, because pnpm publishes `workspace:*` as an EXACT pin and the rule's own one-copy promise fails with an exact pin. The element's existing `@graphty/algorithms: workspace:^` is the shape to copy. `isGraphSnapshot()` is a `Symbol.for` brand check plus `formatVersion` (graph-format 13.5 rule 3), so even a duplicated copy within one major interoperates -- but the peer range is what stops two majors meeting.

Run: `cd EG && HUSKY=0 pnpm install --frozen-lockfile`
Expected: FAIL -- `ERR_PNPM_OUTDATED_LOCKFILE`, because `graphty-element`'s specifiers changed. Then `cd EG && HUSKY=0 pnpm install` (no `--frozen-lockfile`), which updates `pnpm-lock.yaml`; re-run with `--frozen-lockfile` and expect exit 0. The lockfile change rides in this task's commit.

- [ ] **Step 3: The config fields**

Replace `EG/graphty-element/src/config/DataConfig.ts` in full:

```ts
import { z } from "zod/v4";

const GraphKnownFields = z.object({
    nodeIdPath: z.string().default("id"),
    nodeWeightPath: z.string().or(z.null()).default(null),
    nodeTimePath: z.string().or(z.null()).default(null),
    edgeSrcIdPath: z.string().default("src"),
    edgeDstIdPath: z.string().default("dst"),
    // graph-format design 14.4 rule 10: the element default becomes "weight" (the io importers'
    // default). DEP-M6-C: DataManager probes the literal "value" key second for one release,
    // because graphConverter.ts's hard-coded weightAttribute = "value" is what every weighted
    // dataset in this repository carries today.
    edgeWeightPath: z.string().or(z.null()).default("weight"),
    edgeTimePath: z.string().or(z.null()).default(null),
    // graph-format design 14.4's addNodes row: a record's data.position is written into the
    // importer-seed column SCALED to scene units by this factor.
    positionScale: z.number().default(1),
    // graph-format design 14.4's retirement paragraph (:4204): "canonical" makes a numeric id and
    // the string form of the same number ONE node; "keep" leaves them distinct, which is what a
    // JSON numeric-id node list plus a CSV string-id edge list needs to stay honest.
    // DEP-M6-J: the design's default is source-dependent ("canonical" for text sources, "keep" for
    // JSON) and no DataSource exposes its kind to the config layer, so ONE unconditional default
    // ships. Nothing in M6 READS this field; IO1 gives it meaning. It is declared now because
    // DataConfig is a strictObject, so adding a key later is the breaking direction.
    idCoercion: z.enum(["canonical", "keep"]).default("canonical"),
});

export const DataConfig = z.strictObject({
    algorithms: z.array(z.string()).optional(),
    knownFields: GraphKnownFields.prefault({}),
    // graph-format design 14.4 rule 1: under "auto" the builder starts directed and unlocked so a
    // file header can set the direction while the builder is still empty; an explicit boolean
    // calls lockDirected(). Record-pushed data never changes the direction.
    directed: z.union([z.boolean(), z.literal("auto")]).default("auto"),
});
```

Reason for `z.union([z.boolean(), z.literal("auto")])` rather than `z.enum` plus a boolean: zod v4's `z.enum` takes only string members, and `GraphBuilder.setDirected(directed: boolean, options?)` takes a boolean, so the `"auto"` sentinel has to survive as a distinct literal all the way to `GraphStore`'s constructor (Task M6-T3).

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/config/data-config.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 4: Fix the 24 fixtures the new REQUIRED fields break at TYPECHECK**

This step used to read "check the rest of the config still parses", and predicted that a fixture carrying an unexpected `data` key would make `z.strictObject` throw at runtime and name it. **That is the wrong failure mode and it was measured on 2026-09-19: no fixture ever throws.** `StyleSchemaV1` is `z.infer` of the schema, so a field with a `.default()` is OPTIONAL in the schema's INPUT type but REQUIRED in its OUTPUT type. Every fixture that builds a full `data.knownFields` literal annotated `StyleSchemaV1` (or `satisfies StyleSchemaV1`) therefore fails `tsc --noEmit`, not `parse`. The gate is `nx run graphty-element:lint`, which is `eslint && tsc --noEmit`, so this is a RED GATE, not a test failure -- `vitest` stays green throughout and tells you nothing.

Measured blast radius: **15 `TS2739` / `TS2345` errors across 13 files, and 24 files / 26 config literals that need the fields.** Verify with the restore-one-file probe: `git -C EG checkout-index -f graphty-element/test/helpers/testSetup.ts` is NOT available to an agent (no `git checkout`), so instead read the error list straight from `cd EG && pnpm exec tsc --noEmit -p graphty-element/tsconfig.json`.

Add `positionScale: 1` and `idCoercion: "canonical"` inside every `knownFields` literal and `directed: "auto"` on the enclosing `data` object. **Fix all 24, not only the 13 that error.** The other 11 differ only by casting through `as unknown as StyleSchema`, which suppresses the type error and leaves `config.data.directed` `undefined` at runtime -- a half-updated fixture set hands Tasks M6-T3 and M6-T6 a config whose new fields are missing exactly where they are first read.

The 24 files: `test/helpers/testSetup.ts`, `test/helpers/e2e-graph-setup.ts`, `test/interactions/helpers/interaction-helpers.ts`, `test/browser/2d-camera-controls.test.ts`, `test/browser/3d-camera-controls.test.ts`, `test/browser/camera/camera-animation-2d.test.ts`, `test/browser/camera/camera-presets-2d.test.ts`, `test/browser/camera/camera-presets-3d.test.ts`, `test/browser/graph-batch-integration.test.ts`, `test/browser/graph-queue-integration.test.ts`, `test/browser/scene-teardown.test.ts`, `test/browser/video/video-capture-2d.test.ts`, `test/integration/Edge.integration.test.ts`, `test/integration/auto-layout.test.ts`, `test/interactions/edge-cases/input-sequences.test.ts`, `test/interactions/edge-cases/node-drag-drop.test.ts`, `test/interactions/edge-cases/pin-on-drag.test.ts`, `test/interactions/edge-cases/view-mode-transitions.test.ts`, `test/interactions/edge-cases/xr-input-switching.test.ts`, `test/interactions/edge-cases/xr-local-space.test.ts`, `test/interactions/integration/keyboard-controls.test.ts`, `test/interactions/integration/mouse-controls.test.ts`, `test/interactions/integration/touch-controls.test.ts`, `test/managers/SelectionManager.test.ts`.

Run: `cd EG && pnpm exec nx run graphty-element:lint --skip-nx-cache`
Expected: exit 0. (Pass `--skip-nx-cache`: a cached green from before the schema change is the failure mode this step exists to catch.)

Two of those files carry PRE-EXISTING non-ASCII bytes on lines this task never touches -- `test/browser/camera/camera-presets-3d.test.ts:162,164` and `test/integration/Edge.integration.test.ts:456,475,494`. A blanket `grep -nP '[^\x00-\x7F]'` over "files you touched" therefore reports hits that are not yours. Check the ADDED lines instead: `git -C EG diff | grep '^+' | LC_ALL=C grep -nP '[^\x00-\x7F]'`.

- [ ] **Step 5: Lint and ASCII**

Run: `cd EG && pnpm exec nx run graphty-element:lint && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty-element/src/config/DataConfig.ts graphty-element/test/config/data-config.test.ts graphty-element/package.json`
Expected: lint exit 0; the grep prints nothing and exits 1.

- [ ] **Step 4b: Externalise `@graphty/graph-format` in the bundle**

Step 2 declares graph-format a `peerDependency` so that an application installing several consumers gets ONE copy (graph-format design 13.5 rule 3). A peer range alone does not achieve that: `graphty-element/vite.config.ts`'s `build.lib` emits `es` and `umd` bundles, and anything absent from `rollupOptions.external` is INLINED. Leaving it out ships a private copy of graph-format inside `dist/graphty.js`, so an app would load the element's copy and its own -- two `GraphSnapshot` classes, and the `Symbol.for` brand check that is supposed to rescue that case only holds within one major. The declaration and the bundle have to agree.

In `EG/graphty-element/vite.config.ts` add `"@graphty/graph-format"` to `rollupOptions.external` (alphabetically, before `"@mlc-ai/web-llm"`) and a matching entry to `output.globals`:

```js
                    "@graphty/graph-format": "GraphtyGraphFormat",
```

The globals name matters only for the UMD build, where it is the property read off `window`. `GraphtyGraphFormat` is chosen to match graph-format's own UMD name; check it with `grep -n "name:" graph-format/vite.config.ts` and use whatever that says, since a mismatch is a silent `undefined` at runtime in a UMD consumer, not a build error.

Note what is NOT externalised and why: `@graphty/algorithms` and `@graphty/layout` are plain `dependencies`, not peers, and stay inlined. Only graph-format carries the one-copy rule, because only graph-format hands typed arrays and branded snapshot objects ACROSS a package boundary.

Run: `cd EG/graphty-element && pnpm exec vite build && grep -c "GraphSnapshot" dist/graphty.js`
Expected: the build succeeds and the grep count drops to the handful of type-only references, not the hundreds an inlined copy produces. `grep -n "@graphty/graph-format" dist/graphty.js` should show it as an import, not a definition.

- [ ] **Step 6: Checkpoint** -- no commit by this task; Task M6-T10 Steps 7-13 list the E0 commit subjects for the owner. Leave the tree with `graphty-element/package.json`, `pnpm-lock.yaml`, `graphty-element/src/config/DataConfig.ts`, `graphty-element/vite.config.ts` and the **24 fixture files of Step 4** modified, and `graphty-element/test/config/data-config.test.ts` untracked. The fixture files are not optional and not a separate commit: without them the lint target is red at this commit, and a red commit in the middle of a branch is what makes a later `git bisect` useless.

### Task M6-T2: `ElementPositions` -- the element-owned position array

**Repository:** `EG`. Size: 1-1.5 ed.

**Spec:** graph-format design 14.4 rule 4 lines 4073-4084 (positions are ELEMENT-OWNED, grown prefix-stable, remapped with `remapArray`, attached by reference with `replaceRole: true`); `graph-format/src/columns/column.ts:2532-2539` (the refusal this task is built around); `graph-format/src/columns/remap.ts:82` (`remapArray` allocates).

**Files:**
- Create: `graphty-element/src/data/positions.ts` (the whole module)
- Test: `graphty-element/test/data/positions.test.ts`
- NOT touched: `graphty-element/src/managers/DataManager.ts` (Task M6-T6 owns it), `graphty-element/src/layout/**` (Task M6-T10)

**Interfaces:**
- Consumes: `@graphty/graph-format`: `type F32`, `type U32`, `INVALID_INDEX`, `remapArray(data, remap, newLength, fill, components)` (`graph-format/src/columns/remap.ts:82`).
- Produces: `class ElementPositions` with `readonly components = 3`, `get capacity(): number`, `get count(): number`, `view(nodeCount: number): F32`, `grow(nodeCount: number): void`, `remap(nodeRemap: U32, nodeCount: number): void`, `read(index: number, out: { x: number; y: number; z: number }): void`, `write(index: number, x: number, y: number, z: number): void`, `isPlaced(index: number): boolean`, `fillUnplaced(index: number, x: number, y: number, z: number): boolean`.

PLAN DECISIONS made by this part (each fills a gap 14.4 leaves; none changes a design declaration):

1. PLAN DECISION: the array GROWS by allocate-and-copy and NEVER by `ArrayBuffer.resize`. `columnFromTypedArray` throws `E_UNSUPPORTED` with the message `column "position": a view over a resizable ArrayBuffer cannot be adopted` for any view whose buffer is not plain (`graph-format/src/columns/column.ts:2532-2539`, decision D-SAB, invariant I17). 14.4 rule 4 says "grown by doubling", which reads like a resize; it is not one. The growth rule here is `capacity = max(capacity * 2, nodeCount)`, so a load that jumps from 0 to 500k nodes allocates once rather than nineteen times.
2. PLAN DECISION: "unplaced" is encoded as `NaN` in the x component, and only x is tested. 14.4 rule 4 says new rows are "filled from the importer-seed column or `NaN` for 'unplaced'", and `layout/src/simulation/seed.ts`'s `seedPositions` writes "the LCG in index order for NaN rows". Testing one component rather than three is 3x cheaper in the per-freeze scan and cannot disagree with itself, because every writer here writes all three or none.
3. PLAN DECISION: `remap()` accepts that `remapArray` ALLOCATES (`graph-format/src/columns/remap.ts:90` calls `allocLike(data, newLength * components)`), so after a compaction the capacity equals the node count exactly and the next `grow()` reallocates. The alternative -- remapping in place with a scratch array -- saves one allocation on a path that only runs after REMOVALS, which the element does rarely and never per frame. Every holder of the old array object is stale after this call; that is what the `snapshot-replaced` event exists to tell them (Task M6-T4), and it is why `GraphStore` re-attaches the column on every freeze rather than once.
4. PLAN DECISION: `view(nodeCount)` returns `array.subarray(0, 3 * nodeCount)` and is the ONLY thing handed to `AttributeTable.set`. `columnFromTypedArray` checks `data.length !== rowCount * components` and throws `E_COLUMN_LENGTH` (`graph-format/src/columns/column.ts:2507`, `:2521`), so passing the whole capacity-sized array would throw on every freeze where capacity exceeds the node count -- which is most of them. The `.subarray` in 14.4's sketch is mandatory, not stylistic.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/data/positions.test.ts`:

```ts
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { ElementPositions } from "../../src/data/positions";

describe("ElementPositions", () => {
    it("starts unplaced and reports NaN rows", () => {
        const p = new ElementPositions(4);
        p.grow(3);
        assert.strictEqual(p.count, 3);
        assert.strictEqual(p.isPlaced(0), false);
        assert.strictEqual(p.isPlaced(2), false);
    });

    it("keeps the prefix when it grows, and never uses a resizable buffer", () => {
        const p = new ElementPositions(2);
        p.grow(2);
        p.write(0, 1, 2, 3);
        p.write(1, 4, 5, 6);
        p.grow(5);
        assert.strictEqual(p.capacity >= 5, true);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 4, y: 5, z: 6 });
        assert.strictEqual(p.isPlaced(4), false);
        assert.strictEqual(p.view(5).buffer instanceof ArrayBuffer, true);
        assert.strictEqual((p.view(5).buffer as ArrayBuffer).resizable, false);
    });

    it("leaves SPARE capacity unplaced across a reallocation", () => {
        // The regression this pins: a constructor that allocates without filling, or a growth branch
        // that fills NaN only from `this.array.length`, leaves rows in [rows, capacity) at ZERO.
        // isPlaced() then reports them PLACED at the origin, GraphStore.seedUnplaced skips them and
        // every importer coordinate for those nodes is silently lost.
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 1, 2, 3);
        assert.strictEqual(p.isPlaced(1), false);
        p.grow(5);
        assert.strictEqual(p.isPlaced(2), false, "row 2 lived in the spare capacity of the first array");
        assert.strictEqual(p.isPlaced(3), false, "so did row 3");
        assert.strictEqual(p.isPlaced(4), false);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 2, z: 3 });
    });

    it("view(n) is exactly 3n long", () => {
        const p = new ElementPositions(8);
        p.grow(3);
        assert.strictEqual(p.view(3).length, 9);
    });

    it("remap moves rows, drops INVALID_INDEX rows and leaves new rows unplaced", () => {
        const p = new ElementPositions(4);
        p.grow(3);
        p.write(0, 7, 8, 9);
        p.write(1, 1, 1, 1);
        p.write(2, 2, 2, 2);
        // node 0 removed; old 1 -> new 0; old 2 -> new 1
        const remap = new Uint32Array([INVALID_INDEX, 0, 1]);
        p.remap(remap, 2);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 1, y: 1, z: 1 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 });
        assert.strictEqual(p.count, 2);
    });

    it("fillUnplaced writes only a NaN row and reports whether it did", () => {
        const p = new ElementPositions(4);
        p.grow(2);
        p.write(0, 5, 5, 5);
        assert.strictEqual(p.fillUnplaced(0, 9, 9, 9), false);
        assert.strictEqual(p.fillUnplaced(1, 9, 9, 9), true);
        const out = { x: 0, y: 0, z: 0 };
        p.read(0, out);
        assert.deepStrictEqual(out, { x: 5, y: 5, z: 5 });
        p.read(1, out);
        assert.deepStrictEqual(out, { x: 9, y: 9, z: 9 });
    });
});
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/positions.test.ts`
Expected: FAIL with `Cannot find module '../../src/data/positions'` (6 cases, all erroring on the import).

- [ ] **Step 2: Write the module**

Create `EG/graphty-element/src/data/positions.ts`:

```ts
import { type F32, INVALID_INDEX, remapArray, type U32 } from "@graphty/graph-format";

/** Floats per node: x, y, z, in SCENE units. */
export const POSITION_COMPONENTS = 3;

/** Rows the array holds before its first growth. */
export const DEFAULT_CAPACITY = 1024;

/**
 * The element-owned node position array (graph-format design 14.4 rule 4).
 *
 * The element -- not the snapshot -- owns node coordinates. After every freeze, GraphStore lends
 * `view(nodeCount)` to the new snapshot as its `role: "position"` column BY REFERENCE, so layout
 * engines, drag and (from E1) a GPU simulation all write into this one array and nothing a user
 * laid out is lost to a re-freeze.
 *
 * Two rules the format imposes and this class exists to keep:
 *
 * - The buffer must be a plain, NON-RESIZABLE ArrayBuffer. `columnFromTypedArray` refuses a view
 *   over a resizable ArrayBuffer or a SharedArrayBuffer with E_UNSUPPORTED
 *   (graph-format/src/columns/column.ts:2532-2539, decision D-SAB, invariant I17). So growth here
 *   is allocate-and-copy; `ArrayBuffer.resize` is never called and `{ maxByteLength }` is never
 *   passed to the constructor.
 * - The attached view must be EXACTLY `3 * nodeCount` long or the attach throws E_COLUMN_LENGTH
 *   (graph-format/src/columns/column.ts:2507, :2521). That is what `view(n)` is for.
 *
 * "Unplaced" is NaN in the x component (14.4 rule 4; @graphty/layout's `seedPositions` seeds NaN
 * rows). Every writer here writes all three components or none, so testing x alone is sound.
 */
export class ElementPositions {
    private array: F32;
    private rows = 0;

    constructor(capacity: number = DEFAULT_CAPACITY) {
        this.array = new Float32Array(POSITION_COMPONENTS * Math.max(1, capacity));
        // A Float32Array is ZERO-filled, and zero is a perfectly good coordinate: without this the
        // spare capacity reads back as "placed at the origin" the moment grow() reaches it.
        this.array.fill(Number.NaN);
    }

    /** Rows the backing array can hold without reallocating. */
    get capacity(): number {
        return this.array.length / POSITION_COMPONENTS;
    }

    /** Rows currently in use. Equals the last snapshot's nodeCount. */
    get count(): number {
        return this.rows;
    }

    /**
     * The exact view to hand to `snapshot.nodes.set("position", ...)`.
     * @param nodeCount - the snapshot's node count
     * @returns a subarray of length `3 * nodeCount` over the same buffer
     */
    view(nodeCount: number): F32 {
        return this.array.subarray(0, POSITION_COMPONENTS * nodeCount);
    }

    /**
     * Prefix-stable growth: existing rows keep their coordinates, EVERY row at or above the current
     * count is unplaced -- including the spare capacity, which a later grow() will hand out.
     * @param nodeCount - the new row count; may be smaller than the current one (append-only
     *     builders never shrink, but a caller that does gets a truncation, not a throw)
     */
    grow(nodeCount: number): void {
        if (nodeCount > this.capacity) {
            const capacity = Math.max(this.capacity * 2, nodeCount);
            const next = new Float32Array(POSITION_COMPONENTS * capacity);
            next.set(this.array);
            // From the live ROW COUNT, not from this.array.length: the old array's spare capacity
            // was copied forward by set(), and anything above `rows` is by definition unplaced.
            next.fill(Number.NaN, POSITION_COMPONENTS * this.rows);
            this.array = next;
        } else if (nodeCount > this.rows) {
            this.array.fill(Number.NaN, POSITION_COMPONENTS * this.rows, POSITION_COMPONENTS * nodeCount);
        }

        this.rows = nodeCount;
    }

    /**
     * Apply a freeze report's `nodeRemap` (previous index space -> new index or INVALID_INDEX).
     *
     * `remapArray` ALLOCATES (graph-format/src/columns/remap.ts:90), so this replaces the array
     * object. Every holder of the old object is stale afterwards, which is why GraphStore re-attaches
     * the column on every freeze and emits `snapshot-replaced`.
     * @param nodeRemap - the report's nodeRemap
     * @param nodeCount - the new snapshot's node count
     */
    remap(nodeRemap: U32, nodeCount: number): void {
        this.array = remapArray(this.array, nodeRemap, nodeCount, Number.NaN, POSITION_COMPONENTS);
        this.rows = nodeCount;
    }

    /**
     * @param index - node index
     * @returns true when the row carries real coordinates
     */
    isPlaced(index: number): boolean {
        return !Number.isNaN(this.array[POSITION_COMPONENTS * index]);
    }

    /**
     * Read one row into a caller-supplied object (14.4 rule 7: never return a shared vector).
     * @param index - node index
     * @param out - the object to fill
     */
    read(index: number, out: { x: number; y: number; z: number }): void {
        const base = POSITION_COMPONENTS * index;
        out.x = this.array[base] ?? 0;
        out.y = this.array[base + 1] ?? 0;
        out.z = this.array[base + 2] ?? 0;
    }

    /**
     * Write one row.
     * @param index - node index
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     */
    write(index: number, x: number, y: number, z: number): void {
        const base = POSITION_COMPONENTS * index;
        this.array[base] = x;
        this.array[base + 1] = y;
        this.array[base + 2] = z;
    }

    /**
     * Write a row ONLY when it is unplaced. This is how importer-seeded coordinates reach a new
     * node without overwriting anything a layout or a drag already produced.
     * @param index - node index
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @returns true when the row was written
     */
    fillUnplaced(index: number, x: number, y: number, z: number): boolean {
        if (index >= this.rows || index === INVALID_INDEX || this.isPlaced(index)) {
            return false;
        }

        this.write(index, x, y, z);
        return true;
    }
}
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/positions.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 3: Prove the by-reference attach against the real format**

Append to `EG/graphty-element/test/data/positions.test.ts`:

```ts
describe("ElementPositions against graph-format 1.0.0", () => {
    it("attaches by reference, so a write through the class is visible on the column", () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "positions-test" });
        const p = new ElementPositions(4);
        p.grow(snapshot.nodeCount);
        p.write(0, 1.5, 2.5, 3.5);
        const column = snapshot.nodes.set(
            "position",
            p.view(snapshot.nodeCount),
            { dtype: "f32", components: 3, role: "position", mutable: true },
            { replaceRole: true },
        );
        assert.strictEqual((column.data as F32).buffer, p.view(snapshot.nodeCount).buffer);
        p.write(0, 9, 9, 9);
        assert.strictEqual((column.data as F32)[0], 9);
    });

    it("refuses to be built over a resizable buffer (the E_UNSUPPORTED guard)", () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const snapshot = builder.freeze({ label: "positions-test" });
        const resizable = new Float32Array(new ArrayBuffer(24, { maxByteLength: 48 }));
        assert.throws(
            () =>
                snapshot.nodes.set(
                    "position",
                    resizable,
                    { dtype: "f32", components: 3, role: "position", mutable: true },
                    { replaceRole: true },
                ),
            /E_UNSUPPORTED|resizable/,
        );
    });
});
```

with `import { type F32, GraphBuilder, INVALID_INDEX, remapArray, type U32 } from "@graphty/graph-format";` at the top of the file (replace the existing import line).

Reason for the second test: it is the guard, not the feature. If a later change makes the array resizable "to avoid the copy", this test fails at the attach rather than at a user's first freeze. `graph-format/src/columns/column.ts:2532-2539` is the throw.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/positions.test.ts`
Expected: PASS, 8 tests. If the second test does not throw, the Node version in use predates resizable ArrayBuffers -- check `node --version` (the repository runs 22.22.1, which has them) before weakening the assertion.

- [ ] **Step 4: Lint and ASCII**

Run: `cd EG && pnpm exec nx run graphty-element:lint && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty-element/src/data/positions.ts graphty-element/test/data/positions.test.ts`
Expected: lint exit 0; the grep prints nothing.

- [ ] **Step 5: Checkpoint** -- no commit. `src/data/positions.ts` and `test/data/positions.test.ts` are untracked; nothing else changed.

### Task M6-T3: `GraphStore` -- the builder, `getSnapshot()`, `undirected()`

**Repository:** `EG`. Size: 1.5-2 ed.

**Spec:** graph-format design 14.4 rules 1-4 and 8 (lines 4052-4106), the `DataManager` sketch (the fenced block at lines 4128-4165), rule 11 (lines 4121-4126, the `snapshot-replaced` lifecycle). Format facts: `GraphBuilder.freezeWithReport` (`graph-format/src/types/builder.ts:470`), `FreezeReport` (`:96-118`), `FreezeOptions` (`:73-88`), `GraphSnapshot.toUndirected` (`graph-format/src/snapshot/graph-snapshot.ts:838`), `DerivedGraph` (`graph-format/src/types/snapshot.ts:334-358`), `AttributeTable.set` (`graph-format/src/columns/table.ts:267`), `SetOptions.replaceRole` (`graph-format/src/types/columns.ts:316-321`), `Column.isSet(row)` (`graph-format/src/types/columns.ts:366`, implemented at `graph-format/src/columns/column.ts:580`) and `AttributeTable.isSet(name, row)` (`types/columns.ts:625`, `columns/table.ts:248-249`, which is the one-liner `this.require(name).isSet(row)`).

**Files:**
- Create: `graphty-element/src/data/GraphStore.ts`
- Test: `graphty-element/test/data/graph-store.test.ts`
- NOT touched: `graphty-element/src/managers/DataManager.ts` (M6-T6), `graphty-element/src/events.ts` (M6-T4)

**Interfaces:**
- Consumes: `@graphty/graph-format`: `GraphBuilder`, `type ColumnHandle`, `type DerivedGraph`, `type FreezeReport`, `type GraphSnapshot`, `type U32`, `INVALID_INDEX`; `./positions`: `ElementPositions`, `POSITION_COMPONENTS`.
- Produces: `interface SnapshotReplacement { readonly previous: GraphSnapshot | null; readonly next: GraphSnapshot; readonly report: FreezeReport }`; `interface GraphStoreOptions { readonly directed: boolean | "auto"; readonly positionScale: number; readonly onReplaced: (r: SnapshotReplacement) => void; readonly onNodeRemap: (remap: U32) => void; readonly onEdgeRemap: (remap: U32) => void }`; `class GraphStore` with `readonly builder`, `readonly positions`, `readonly seedColumn`, `readonly edgeIdColumn`, `touch()`, `get stale(): boolean`, `getSnapshot(): GraphSnapshot`, `undirected(s: GraphSnapshot): DerivedGraph`, `nextEdgeId(): number`, `dispose(): void`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: the memoisation key is an element-owned `revision` counter bumped by `touch()`, NOT `builder.mutationCount`. `mutationCount`'s own contract is "Increments on every topology or weight mutation; column writes and freeze() do not count" (`graph-format/src/types/builder.ts:345`), and measurement confirms it does not bump for `addNode` of an existing id, for `addNodeRecord` of an existing id (the last-write-wins merge that 14.4's own `addNodes` row prescribes), for `setNodeValue`, or for `freeze()`. The 14.4 sketch's key `snapshotMutation !== builder.mutationCount` therefore returns a STALE snapshot for a burst of merges or attribute writes -- silently, with no `snapshot-replaced` -- which is the element's ordinary second-chunk case. `DataManager` calls `touch()` from every mutating path including a merge, and Step 1's test pins it. This is DEP-M6-A.
2. PLAN DECISION: the builder is constructed `new GraphBuilder({ directed: true, addMissingNodes: true })` and, when `options.directed` is a boolean, `setDirected(value)` then `lockDirected()` is called IMMEDIATELY, while the builder is still empty. `setDirected` is free while `liveEdgeCount === 0` and throws `E_DIRECTED` for directed -> undirected once edges exist (`graph-format/src/builder/graph-builder.ts:360-394`), so the only safe moment is construction. Under `"auto"` nothing is locked and the builder stays directed until an importer says otherwise -- which no `DataSource` does yet, so `"auto"` behaves as `directed: true` at M6 and the seam exists for IO1.
3. PLAN DECISION: `growPositions` reads the importer seed column BEFORE the `set(..., { replaceRole: true })` call, and the code enforces the ordering by doing the seeding inside `getSnapshot()` above the attach. `AttributeTable.set` passes the flag straight to `checkRole` (`graph-format/src/columns/table.ts:298`), and `checkRole` (`:434-451`) does `this.columns.delete(otherName)` for the column that held the role -- so `replaceRole: true` REMOVES the previous role holder from the table entirely, it does not merely demote it. Verified: after the attach, `snapshot.nodes.get("graphty.importPosition")` is `null`. Reordering those two statements loses every file coordinate silently -- the position column would simply be NaN and the layout would place the node itself. Step 1's case 4 pins the order by asserting a seeded coordinate reached `positions` AND that the seed column is gone afterwards.
4. PLAN DECISION: the seeding pass runs in BOTH freeze branches, not only the non-remap one, and writes only rows that are unplaced. 14.4's sketch seeds only in the `else` branch (`growPositions(snapshot)`), but a burst that both removes and adds takes the remap branch and leaves its NEW rows NaN and unseeded. `fillUnplaced` makes the pass idempotent, so running it in both branches costs one scan of the NaN rows and cannot overwrite a laid-out coordinate.
5. PLAN DECISION: `GraphStore` never calls `snapshot.transferables()`, `snapshot.toWire()` or `snapshot.toBytes()`, and a test asserts the element's `src/` contains no call to any of them. `transferables()` lists the element's live positions buffer (verified: it is in the returned list, because `AttributeTable.set` claims one holder of the buffer, `graph-format/src/util/shared-buffers.ts:29`), and graph-format exports no `noteShared` for a consumer to say otherwise. Handing that list to `postMessage` DETACHES the element's own array. This is DEP-M6-D; the guard is cheap and the failure it prevents is a blank canvas with no error.
6. PLAN DECISION: `undirected(s)` is cached in a `WeakMap<GraphSnapshot, DerivedGraph>` and, when `s.directed` is already false, returns an identity `DerivedGraph` (`{ snapshot: s, nodeOrigin: null, edgeOrigin: null, nodeRemap: null, edgeRemap: null, blockSizes: null, report: { droppedEdges: 0, mergedEdges: 0 } }`) rather than calling `toUndirected()`. 14.4 rule 8 asks for the whole `DerivedGraph` (not just its snapshot) because edge-result adapters need `edgeRemap`; the identity object gives them a `null` remap, which their `edgeRemap === null ? e : edgeRemap[e]` branch already handles. `toUndirected()` shares the node `AttributeTable` INSTANCE with its source (graph-format contradiction C8; verified: `u.snapshot.nodes === s.nodes`), so the position column is visible on the undirected view for free -- no second attach.
7. PLAN DECISION: `freezeWithReport` is called with `{ label: "graphty-element" }` and NOTHING else. `release: true` empties the builder's staging and would destroy the long-lived builder (`graph-format/src/types/builder.ts:73-88`); a `duplicateEdges` policy REWRITES the builder (graph-format design 6.5); `prepare` would materialise views the element may not use; `arena` defaults to true, which is what the GPU path wants. Any future option goes in with its own test.

- [ ] **Step 1: Write the failing tests**

Create `EG/graphty-element/test/data/graph-store.test.ts`:

```ts
import { type FreezeReport, type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore, type SnapshotReplacement } from "../../src/data/GraphStore";

function makeStore(directed: boolean | "auto" = "auto"): {
    store: GraphStore;
    events: SnapshotReplacement[];
    remaps: number[][];
} {
    const events: SnapshotReplacement[] = [];
    const remaps: number[][] = [];
    const store = new GraphStore({
        directed,
        positionScale: 1,
        onReplaced: (r) => events.push(r),
        onNodeRemap: (remap) => remaps.push([...remap]),
        onEdgeRemap: () => undefined,
    });
    return { store, events, remaps };
}

describe("GraphStore", () => {
    it("freezes once per revision and caches", () => {
        const { store, events } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const first = store.getSnapshot();
        const second = store.getSnapshot();
        assert.strictEqual(first, second);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0]?.previous, null);
    });

    it("invalidates on a MERGE, which builder.mutationCount does not see", () => {
        const { store } = makeStore();
        store.builder.addNode("a");
        store.touch();
        const first = store.getSnapshot();
        const mutationCountBefore = store.builder.mutationCount;
        store.builder.addNodeRecord("a", { label: "second write" });
        store.touch();
        const second = store.getSnapshot();
        assert.strictEqual(store.builder.mutationCount, mutationCountBefore, "the format did not count the merge");
        assert.notStrictEqual(second, first, "but the store did");
    });

    it("attaches the element positions as the role-position column, by reference", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const snapshot = store.getSnapshot();
        const column = snapshot.nodes.byRole("position");
        assert.notStrictEqual(column, null);
        assert.strictEqual((column?.data as Float32Array).buffer, store.positions.view(snapshot.nodeCount).buffer);
        store.positions.write(0, 4, 5, 6);
        assert.strictEqual((column?.data as Float32Array)[0], 4);
    });

    it("keeps a seeded coordinate across the replaceRole attach", () => {
        const { store } = makeStore();
        const index = store.builder.addNode("a");
        store.builder.setNodeValue(store.seedColumn, index, [11, 12, 13]);
        store.touch();
        const snapshot = store.getSnapshot();
        assert.strictEqual(snapshot.nodes.get("graphty.importPosition"), null, "replaceRole removed the seed column");
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 11, y: 12, z: 13 });
    });

    it("remaps positions and reports the remap on a compacting freeze", () => {
        const { store, remaps } = makeStore();
        store.builder.addEdge("a", "b");
        store.builder.addEdge("b", "c");
        store.touch();
        store.getSnapshot();
        store.positions.write(0, 1, 1, 1);
        store.positions.write(1, 2, 2, 2);
        store.positions.write(2, 3, 3, 3);
        store.builder.removeNode("a");
        store.touch();
        const next = store.getSnapshot();
        assert.strictEqual(next.nodeCount, 2);
        assert.strictEqual(remaps.length, 1);
        assert.strictEqual(remaps[0]?.[0], INVALID_INDEX);
        const out = { x: 0, y: 0, z: 0 };
        store.positions.read(remaps[0]?.[1] ?? 0, out);
        assert.deepStrictEqual(out, { x: 2, y: 2, z: 2 });
    });

    it("undirected(s) is cached and shares the node table with its source", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const s = store.getSnapshot();
        const u = store.undirected(s);
        assert.strictEqual(store.undirected(s), u);
        assert.strictEqual(u.snapshot.nodes, s.nodes);
        assert.notStrictEqual(u.snapshot.nodes.byRole("position"), null);
    });

    it("emits previous on the second freeze so a listener can release it", () => {
        const { store, events } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const first = store.getSnapshot();
        store.builder.addEdge("b", "c");
        store.touch();
        const second = store.getSnapshot();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[1]?.previous, first);
        assert.strictEqual(events[1]?.next, second);
        const report: FreezeReport | undefined = events[1]?.report;
        assert.strictEqual(report?.nodeRemap, null);
    });
});
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/graph-store.test.ts`
Expected: FAIL with `Cannot find module '../../src/data/GraphStore'`.

- [ ] **Step 2: Write the module**

Create `EG/graphty-element/src/data/GraphStore.ts`:

```ts
import {
    type ColumnHandle,
    type DerivedGraph,
    type FreezeReport,
    GraphBuilder,
    type GraphSnapshot,
    type U32,
} from "@graphty/graph-format";

import { ElementPositions, POSITION_COMPONENTS } from "./positions";

/** The payload of `snapshot-replaced` (graph-format design 14.4 rule 11). */
export interface SnapshotReplacement {
    /** The snapshot this one supersedes; null on the first freeze. */
    readonly previous: GraphSnapshot | null;
    /** The snapshot every consumer must switch to. */
    readonly next: GraphSnapshot;
    /** freezeWithReport's report, relative to the PREVIOUS freeze of this builder. */
    readonly report: FreezeReport;
}

export interface GraphStoreOptions {
    /** config.data.directed. "auto" leaves the builder unlocked (14.4 rule 1). */
    readonly directed: boolean | "auto";
    /** config.data.knownFields.positionScale: record units -> scene units. */
    readonly positionScale: number;
    /** Called INSIDE getSnapshot, after the position column is attached. */
    readonly onReplaced: (replacement: SnapshotReplacement) => void;
    /** Called before onReplaced when the freeze renumbered nodes, so Node.index can be walked. */
    readonly onNodeRemap: (remap: U32) => void;
    /** Called before onReplaced when the freeze renumbered edges, so edgesByIndex can be re-keyed. */
    readonly onEdgeRemap: (remap: U32) => void;
}

const SEED_COLUMN = "graphty.importPosition";
const EDGE_ID_COLUMN = "graphty.edgeId";

/**
 * The element's ONE graph-format builder and the snapshot it freezes to (graph-format design 14.4).
 *
 * DataManager owns one of these for the life of the Graph. Nothing else freezes: `getSnapshot()` is
 * the only freeze site and it is LAZY, so however many mutations a burst contains -- through the
 * operation queue, through `skipQueue`, or through `addDataFromSource`, which bypasses the queue
 * entirely (Graph.ts:332-334) -- the first reader after the burst pays for exactly one freeze and
 * every later reader in the same revision gets the cached object.
 */
export class GraphStore {
    readonly builder: GraphBuilder;
    readonly positions = new ElementPositions();
    readonly seedColumn: ColumnHandle;
    readonly edgeIdColumn: ColumnHandle;

    private readonly options: GraphStoreOptions;
    private readonly undirectedCache = new WeakMap<GraphSnapshot, DerivedGraph>();
    private cache: GraphSnapshot | null = null;
    private cachedRevision = -1;
    private revision = 0;
    private edgeIdCounter = 0;
    private disposed = false;

    constructor(options: GraphStoreOptions) {
        this.options = options;
        this.builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        if (typeof options.directed === "boolean") {
            // Free only while the builder is empty (graph-format/src/builder/graph-builder.ts:360-394);
            // once edges exist, directed -> undirected throws E_DIRECTED.
            this.builder.setDirected(options.directed);
            this.builder.lockDirected();
        }

        this.seedColumn = this.builder.declareNodeColumn({
            name: SEED_COLUMN,
            dtype: "f32",
            components: POSITION_COMPONENTS,
            role: "position",
            mutable: false,
        });
        this.edgeIdColumn = this.builder.declareEdgeColumn({
            name: EDGE_ID_COLUMN,
            dtype: "u32",
            role: "id",
            unique: true,
        });
    }

    /**
     * Mark the graph mutated. DataManager calls this from EVERY mutating path, including a merge of
     * an existing id and an attribute write, because `builder.mutationCount` counts neither
     * (graph-format/src/types/builder.ts:345) and the 14.4 sketch's key is unsound against the
     * element's own mutation surface. See PLAN DECISION 1 of Task M6-T3.
     */
    touch(): void {
        this.revision++;
    }

    /** True when the next getSnapshot() will freeze. */
    get stale(): boolean {
        return this.cache === null || this.cachedRevision !== this.revision;
    }

    /** The next element-assigned edge id, written into the graphty.edgeId column at addEdge time. */
    nextEdgeId(): number {
        return this.edgeIdCounter++;
    }

    /**
     * The current snapshot, freezing first when the graph has changed since the last one.
     * @returns the snapshot; the same object until the next `touch()`
     */
    getSnapshot(): GraphSnapshot {
        if (this.cache !== null && this.cachedRevision === this.revision) {
            return this.cache;
        }

        const previous = this.cache;
        const { snapshot, report } = this.builder.freezeWithReport({ label: "graphty-element" });

        if (report.nodeRemap !== null) {
            this.positions.remap(report.nodeRemap, snapshot.nodeCount);
            this.options.onNodeRemap(report.nodeRemap);
        } else {
            this.positions.grow(snapshot.nodeCount);
        }

        if (report.edgeRemap !== null) {
            this.options.onEdgeRemap(report.edgeRemap);
        }

        // BEFORE the attach: replaceRole DELETES the seed column from this snapshot's table
        // (AttributeTable.set -> checkRole, graph-format/src/columns/table.ts:298 and :434-451).
        // PLAN DECISION 3.
        this.seedUnplaced(snapshot);

        snapshot.nodes.set(
            "position",
            this.positions.view(snapshot.nodeCount),
            { dtype: "f32", components: POSITION_COMPONENTS, role: "position", mutable: true },
            { replaceRole: true },
        );

        this.cache = snapshot;
        this.cachedRevision = this.revision;
        this.options.onReplaced({ previous, next: snapshot, report });
        return this.cache;
    }

    /**
     * The undirected view of a snapshot, cached per snapshot (14.4 rule 8).
     *
     * Returns the whole DerivedGraph, not just its snapshot, because edge-result adapters need
     * `edgeRemap` to write both halves of a collapsed reciprocal pair. `toUndirected()` shares the
     * node AttributeTable INSTANCE with its source (graph-format C8), so the position column is
     * already on the view.
     * @param s - a snapshot this store produced
     * @returns the cached DerivedGraph
     */
    undirected(s: GraphSnapshot): DerivedGraph {
        let derived = this.undirectedCache.get(s);
        if (derived === undefined) {
            derived = s.directed
                ? s.toUndirected()
                : {
                      snapshot: s,
                      nodeOrigin: null,
                      edgeOrigin: null,
                      nodeRemap: null,
                      edgeRemap: null,
                      blockSizes: null,
                      report: { droppedEdges: 0, mergedEdges: 0 },
                  };
            this.undirectedCache.set(s, derived);
        }

        return derived;
    }

    /** Drop the cached snapshot and its derived views. The builder itself is not reset. */
    dispose(): void {
        this.cache?.dropCaches();
        this.cache = null;
        this.cachedRevision = -1;
        this.disposed = true;
    }

    /** True once dispose() ran. */
    get isDisposed(): boolean {
        return this.disposed;
    }

    /**
     * Copy importer-seeded coordinates into the element array for rows that are still unplaced.
     * Idempotent, so it is safe in both freeze branches, and it never overwrites a coordinate a
     * layout or a drag produced.
     * @param snapshot - the freshly frozen snapshot, BEFORE the position column is attached
     */
    private seedUnplaced(snapshot: GraphSnapshot): void {
        const seed = snapshot.nodes.get(SEED_COLUMN);
        if (seed === null) {
            return;
        }

        const data = seed.data as Float32Array;
        const scale = this.options.positionScale;
        for (let i = 0; i < snapshot.nodeCount; i++) {
            // The TABLE form, not `seed.isSet(i)`: `seed` is typed `Column | null` above, so the
            // narrowed handle would have to be threaded through, and `snapshot.nodes.isSet(name, row)`
            // (graph-format/src/columns/table.ts:248) is the same call through `require(name)` with no
            // second handle to keep in sync. NEVER write `seed.isSet?.(i)`: under an optional call the
            // expression is `undefined` for a missing method, `!undefined` is true, and every row with
            // any x would be seeded -- the exact inverse of this guard, silently.
            if (this.positions.isPlaced(i) || !snapshot.nodes.isSet(SEED_COLUMN, i)) {
                continue;
            }

            const base = POSITION_COMPONENTS * i;
            const x = data[base] ?? Number.NaN;
            if (Number.isNaN(x)) {
                continue;
            }

            this.positions.fillUnplaced(i, x * scale, (data[base + 1] ?? 0) * scale, (data[base + 2] ?? 0) * scale);
        }
    }
}
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/graph-store.test.ts`
Expected: PASS, 7 tests. The `mutationCount` assertion in test 2 is the one to watch: if it FAILS because `mutationCount` DID move, graph-format changed its counting rule -- re-read `graph-format/src/types/builder.ts:345` before touching this plan's key.

- [ ] **Step 3: The transferables guard**

Append to `EG/graphty-element/test/data/graph-store.test.ts`:

```ts
describe("GraphStore hazards", () => {
    it("the format believes it owns the element's position buffer, so the element must never transfer", () => {
        const { store } = makeStore();
        store.builder.addEdge("a", "b");
        store.touch();
        const snapshot = store.getSnapshot();
        const transferables = snapshot.transferables();
        const positionsBuffer = store.positions.view(snapshot.nodeCount).buffer;
        assert.strictEqual(
            transferables.includes(positionsBuffer as ArrayBuffer),
            true,
            "if this ever goes false, graph-format learned about shared holders and DEP-M6-D can be revisited",
        );
    });
});
```

and create `EG/graphty-element/test/data/no-transfer.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

describe("the element never transfers a snapshot", () => {
    it("src/ contains no transferables(), toWire() or toBytes() call", () => {
        const root = join(import.meta.dirname, "..", "..", "src");
        const offenders: string[] = [];
        // readdirSync's recursive option, not a glob package: `tinyglobby` is NOT a dependency or a
        // devDependency of @graphty/graphty-element and is not under graphty-element/node_modules --
        // it resolves only by hoisting from the workspace root (a transitive dep of vite), which is
        // precisely what knip's unlisted-dependency rule flags. Node 22.22.1 has recursive readdir.
        for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
            if (!entry.endsWith(".ts")) {
                continue;
            }

            const text = readFileSync(join(root, entry), "utf8");
            if (/\.transferables\(|\.toWire\(|\.toBytes\(|\.toByteChunks\(/.test(text)) {
                offenders.push(entry);
            }
        }

        assert.deepStrictEqual(offenders, [], "DEP-M6-D: transferring a snapshot detaches the element's positions");
    });
});
```

Reason: `snapshot.transferables()` lists the element's live positions buffer because `AttributeTable.set` claims one holder of it (`graph-format/src/util/shared-buffers.ts:29`) and graph-format exports no `noteShared` for a consumer to say "I still hold this". Handing that list to `postMessage` detaches the array the render loop reads every frame; the symptom is a canvas of nodes at the origin with no error in the console.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data`
Expected: PASS. The test file imports only `node:fs`, `node:path` and `vitest`, so it introduces no specifier knip could report as an unlisted dependency.

- [ ] **Step 4: Lint, knip and ASCII**

Run: `cd EG && pnpm exec nx run graphty-element:lint && pnpm exec knip && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty-element/src/data/GraphStore.ts graphty-element/test/data/*.ts`
Expected: lint exit 0; knip reports no finding under `graphty-element/src/data/` (the module has a test importer, which knip counts); the grep prints nothing.

- [ ] **Step 5: Checkpoint** -- no commit. `src/data/GraphStore.ts`, `test/data/graph-store.test.ts` and `test/data/no-transfer.test.ts` are untracked.

### Task M6-T4: The typed `snapshot-replaced` event -- all four edits

**Repository:** `EG`. Size: 0.5 ed.

**Spec:** graph-format design 14.4 rule 11 lines 4121-4126; WebGPU design 9.4 item 2 (the release list E1 hangs off this event).

**Files:**
- Modify: `graphty-element/src/events.ts` (a new interface, and the `GraphEvent` union at `:17-29`). NOTE: `src/events.ts` is edited AGAIN by Task M6-T11 (`accelerator-changed`); the two tasks must not run concurrently.
- Modify: `graphty-element/src/managers/EventManager.ts` (a typed emitter beside `emitDataAdded` at `:156-170`; the `addListener` graph case list at `:379-403`). Also edited again by M6-T11.
- Test: `graphty-element/test/managers/event-manager-snapshot.test.ts`
- NOT touched: `graphty-element/src/graphty-element.ts` (its `onGraphEvent.add` forwarder at `:96-104` re-dispatches EVERY graph event as a DOM `CustomEvent` with no per-event wiring, so the DOM surface is free)

**Interfaces:**
- Consumes: `@graphty/graph-format`: `type FreezeReport`, `type GraphSnapshot`.
- Produces: `interface GraphSnapshotReplacedEvent { type: "snapshot-replaced"; graph: Graph; previous: GraphSnapshot | null; next: GraphSnapshot; report: FreezeReport }` in the `GraphEvent` union; `EventManager.emitSnapshotReplaced(graph, previous, next, report): void`; `addListener("snapshot-replaced", cb)` resolving instead of throwing.

PLAN DECISIONS made by this part:

1. PLAN DECISION: this is a TYPED member of the `GraphEvent` union, not a new literal in `GraphGenericEvent` (`events.ts:79-99`) and not the design sketch's private listener array. All four edits are mandatory together: without the union member the interface does not exist, without the emitter nothing fires it, and without the `addListener` case the call throws `TypeError("Unknown event type: snapshot-replaced")` at `EventManager.ts:449-450`. The standing evidence that skipping the fourth edit is a real failure mode is `"layout-changed"` and `"layout-updated"`: both are emitted (`LayoutManager.ts:184`, `:470`) and NEITHER is subscribable, because both go through the untyped `emitGraphEvent(type: string, ...)` and neither is in the switch. See D-M6-7.
2. PLAN DECISION: the payload is the OBJECT form `{ previous, next, report }` with `previous: GraphSnapshot | null`, matching 14.4's prose (line 4122) rather than the sketch's positional listener signature (line 4139). Every other event in `events.ts` is an object with a `type` discriminant; a positional callback cannot ride the `Observable<GraphEvent>` the element already has.
3. PLAN DECISION: the event carries a `graph` field, like `GraphSettledEvent` and `GraphDataLoadedEvent` (`events.ts:31-34`, `:44-51`), so a DOM listener reached through the `graphty-element.ts:96-104` forwarder can identify which element fired it when two are on the page. It is NOT true that every `GraphEvent` has one: `GraphDataAddedEvent` (`:53-59`), `GraphLayoutInitializedEvent` (`:61-65`) and `CameraStateChangedEvent` (`:67-76`) omit it, which is exactly why a DOM listener cannot today tell two elements apart for those three, and `GraphErrorEvent` types it `Graph | null` (`:36-42`). The field is typed `Graph | GraphContext` on the EMITTER (Step 3), copying `emitGraphError`'s signature (`EventManager.ts:115-123`), because `DataManager` holds a `GraphContext` and not a `Graph`; the single cast lives inside `EventManager`, where the existing one does, rather than at the call site. Step 1's test therefore passes `null as unknown as Graph` only because it constructs a bare `EventManager` with no graph at all.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/managers/event-manager-snapshot.test.ts`:

```ts
import { GraphBuilder } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { EventManager } from "../../src/managers/EventManager";

describe("EventManager snapshot-replaced", () => {
    it("is subscribable, which layout-changed is not", () => {
        const em = new EventManager();
        assert.throws(() => em.addListener("layout-changed" as never, () => undefined), /Unknown event type/);
        assert.doesNotThrow(() => em.addListener("snapshot-replaced", () => undefined));
    });

    it("delivers previous, next and report", () => {
        const em = new EventManager();
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const { snapshot, report } = builder.freezeWithReport({ label: "t" });
        let seen = 0;
        em.addListener("snapshot-replaced", (evt) => {
            if (evt.type !== "snapshot-replaced") {
                return;
            }

            seen++;
            assert.strictEqual(evt.previous, null);
            assert.strictEqual(evt.next, snapshot);
            assert.strictEqual(evt.report, report);
        });
        em.emitSnapshotReplaced(null as unknown as Graph, null, snapshot, report);
        assert.strictEqual(seen, 1);
    });
});
```

Note: `test/managers/event-manager-snapshot.test.ts` is NOT in the `default` project's exclude list (`graphty-element/vitest.config.ts:19-23` names five `test/managers/*.test.ts` files by path and this is not one of them), so it runs in the fast node project.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/managers/event-manager-snapshot.test.ts`
Expected: FAIL -- `addListener("snapshot-replaced", ...)` throws `TypeError: Unknown event type: snapshot-replaced`, and `emitSnapshotReplaced` does not exist.

- [ ] **Step 2: Edit 1 and 2 -- the interface and the union**

In `EG/graphty-element/src/events.ts`, add to the imports at the top:

```ts
import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";
```

add `| GraphSnapshotReplacedEvent` to the `GraphEvent` union (`events.ts:17-29`, after `GraphDataAddedEvent`), and add the interface next to `GraphDataAddedEvent` (`events.ts:53`):

```ts
/**
 * Emitted by DataManager after every freeze, once the element's position column is attached to the
 * new snapshot (graph-format design 14.4 rule 11).
 *
 * Listeners release per-snapshot resources: at E1 `Graph` releases the accelerator's GPU buffers for
 * `previous` and its derived views, and caches drop their entries. Nothing a WeakMap can do for
 * them -- GPU memory is not garbage collected.
 */
export interface GraphSnapshotReplacedEvent {
    type: "snapshot-replaced";
    /** The graph whose data changed. */
    graph: Graph;
    /** The superseded snapshot; null on the first freeze. */
    previous: GraphSnapshot | null;
    /** The snapshot every consumer must switch to. */
    next: GraphSnapshot;
    /** freezeWithReport's report, relative to the PREVIOUS freeze of the same builder. */
    report: FreezeReport;
}
```

- [ ] **Step 3: Edit 3 -- the emitter**

In `EG/graphty-element/src/managers/EventManager.ts`, after `emitDataAdded` (`:156-170`), add:

```ts
    /**
     * Emit `snapshot-replaced` (graph-format design 14.4 rule 11).
     * @param graph - the graph whose data changed; DataManager holds a GraphContext, so this takes
     *     the same union emitGraphError takes (EventManager.ts:115-123) and casts once, here
     * @param previous - the superseded snapshot, or null on the first freeze
     * @param next - the new snapshot, with the element position column already attached
     * @param report - freezeWithReport's report
     */
    emitSnapshotReplaced(
        graph: Graph | GraphContext,
        previous: GraphSnapshot | null,
        next: GraphSnapshot,
        report: FreezeReport,
    ): void {
        const event: GraphSnapshotReplacedEvent = {
            type: "snapshot-replaced",
            graph: graph as Graph,
            previous,
            next,
            report,
        };
        this.graphObservable.notifyObservers(event);
    }
```

with `import type { FreezeReport, GraphSnapshot } from "@graphty/graph-format";` and `GraphSnapshotReplacedEvent` added to the existing `import type { ... } from "../events"` line. `GraphContext` is already imported by this file for `emitGraphError`.

- [ ] **Step 4: Edit 4 -- the addListener case**

In `EG/graphty-element/src/managers/EventManager.ts`, add `"snapshot-replaced"` to the graph-event case list of `addListener` (`:379-403`), beside `"data-added"`. The switch's `default` throws (`:449-450`), so a missing case is a runtime `TypeError` for every subscriber, including E1's own `LayoutManager`.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/managers/event-manager-snapshot.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Confirm the DOM forwarder needs no edit**

Run: `cd EG/graphty-element && sed -n '96,104p' src/graphty-element.ts`
Expected: the `this.#graph.eventManager.onGraphEvent.add((event) => { this.dispatchEvent(new CustomEvent(event.type, { detail: event, bubbles: true, composed: true })); });` block, unchanged. Every graph event becomes a same-named DOM `CustomEvent` with no per-event wiring, so `snapshot-replaced` reaches the app for free. Note in passing that its `detail` carries live `GraphSnapshot` objects: that is safe in-realm and is exactly why DEP-M6-D forbids ever putting such a detail through `postMessage`.

- [ ] **Step 6: Lint and ASCII**

Run: `cd EG && pnpm exec nx run graphty-element:lint && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty-element/src/events.ts graphty-element/src/managers/EventManager.ts graphty-element/test/managers/event-manager-snapshot.test.ts`
Expected: lint exit 0; the grep prints nothing.

- [ ] **Step 7: Checkpoint** -- no commit. `src/events.ts` and `src/managers/EventManager.ts` modified; one new test file untracked.

### Task M6-T5: `Node.index`, `Node.pinned`, `Edge.index`

**Repository:** `EG`. Size: 0.5-1 ed.

**Spec:** graph-format design 14.4 rule 5 lines 4085-4089 (`node.index = builder.addNode(id)` at add time; walk `report.nodeRemap` on a renumbering freeze); WebGPU design 9.4 item 4 (`applyPins()` is `maskFromNodes(dm.nodes, (n) => n.pinned)`).

**Files:**
- Modify: `graphty-element/src/Node.ts:26-56` (two fields), `:438-447` (`pin` / `unpin`), `:613-616` (`isPinned`). NOTE: `src/Node.ts` is edited AGAIN by Task M6-T10 Step 5 (`Node.update()`); the two tasks must not run concurrently.
- Modify: `graphty-element/src/Edge.ts:38-75` (one field)
- Test: `graphty-element/test/unit/node-index-pinned.test.ts`
- NOT touched: `graphty-element/src/NodeBehavior.ts` (Task M6-T14 adds `beginDrag` / `endDrag`), `graphty-element/src/layout/**`

**Interfaces:**
- Consumes: `@graphty/graph-format`: `INVALID_INDEX`.
- Produces: `Node.index: number` (default `INVALID_INDEX`), `Node.pinned: boolean` (default `false`), `Edge.index: number` (default `INVALID_INDEX`), and `Node.isPinned()` returning `this.pinned`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `Node.index` AND `Node.pinned` are both NEW, and so is every behaviour that reads them. `Node.isPinned()` hard-returns `false` today with the comment "For now, nodes are not pinned unless drag behavior is disabled" (`graphty-element/src/Node.ts:613-616`), and `SimpleLayoutEngine.setNodePosition`, `.step`, `.pin` and `.unpin` are ALL no-ops (`graphty-element/src/layout/LayoutEngine.ts:275`, `:302`, `:311`, `:320`) with `isSettled` a `readonly true` (`:341`). `forceatlas2` and `spring` are `SimpleLayoutEngine` subclasses, so under those two layouts a drag today moves the mesh and writes nothing back, and the next frame where `node.dragging` is false snaps it to `posToCoords(this.positions[n.id])`. **Therefore E1's drag and pin gates are NEW BEHAVIOUR, not a regression surface**: there is no existing drag-under-forceatlas2 semantics to preserve, and a test that asserts one today would be asserting the snap-back. `test/interactions/edge-cases/pin-on-drag.test.ts` exercises the default `ngraph` engine, which DOES implement `pin` (`NGraphLayoutEngine.ts:291`), and is unaffected by this task.
2. PLAN DECISION: `pin()` and `unpin()` set `this.pinned` BEFORE forwarding to the engine, and `isPinned()` returns the field. The field is the element's source of truth; the engine's is a projection. Reason: pin state lives only inside an engine today (ngraph's `pinNode`, d3's `fx/fy/fz`), so it is LOST on every `setLayout`, which constructs a new engine (`LayoutManager.ts:131`). With the field on `Node`, E1's `applyPins()` can rebuild the mask after a `load` or a `reload` from `dm.nodes`, which is exactly what G6's "pin survival across a remap" asks for.
3. PLAN DECISION: `Edge.index` is additive and does NOT replace `Edge.id`. See D-M6-8 and DEP-M6-B: `Edge.id` stays `` `${srcNodeId}:${dstNodeId}` `` (`Edge.ts:111`), which `DataManager.edges` is keyed by, `DijkstraAlgorithm.ts:200-208` rebuilds by hand, and `Algorithm.get results()` publishes as `edge.<srcId>:<dstId>`.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/unit/node-index-pinned.test.ts`:

```ts
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { Node } from "../../src/Node";

describe("Node.index and Node.pinned", () => {
    it("declares index defaulting to INVALID_INDEX and pinned defaulting to false", () => {
        const proto = Node.prototype as unknown as Record<string, unknown>;
        assert.strictEqual(typeof proto.isPinned, "function");
        const fake = Object.create(Node.prototype) as Node;
        // The constructor creates a Babylon mesh, so assert on a bare instance instead.
        Object.assign(fake, { index: INVALID_INDEX, pinned: false });
        assert.strictEqual(fake.isPinned(), false);
        fake.pinned = true;
        assert.strictEqual(fake.isPinned(), true);
    });
});
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/unit/node-index-pinned.test.ts`
Expected: FAIL -- `fake.isPinned()` returns `false` after `fake.pinned = true`, because `isPinned` is a hard-coded `return false` (`src/Node.ts:613-616`).

**What this test does NOT cover, and where that coverage lives.** `Object.create(Node.prototype)` cannot see field initialisers by construction, and the test assigns `index` and `pinned` itself -- so it pins ONLY that `isPinned()` returns `this.pinned`. It would pass against an implementation that never declared `Node.index` at all, and `Node.index` is the field `DataManager.walkNodeRemap` (M6-T6), `Graph.updateNodes` (M6-T7) and `SimulationLayoutEngine.applyPins` (M6-T12) all depend on. The field is proved where it is actually ASSIGNED, by two cases this plan adds to `test/managers/DataManager.test.ts` in Task M6-T9 Step 4: every node's `index` matches the builder's index for its id after two `addNodes` chunks and is never `INVALID_INDEX`, and the survivors' `index` values match `report.nodeRemap` after a `removeNode` plus a freeze. Do not try to strengthen the case here: a real `Node` needs a Babylon `GraphContext`, which is why this file is in the fast `default` project and that one is in `browser`.

- [ ] **Step 2: The `Node` fields**

In `EG/graphty-element/src/Node.ts`, in the field block (`:26-56`), after `id: NodeIdType;` (`:29`), add:

```ts
    /**
     * This node's index in the element's current GraphSnapshot, assigned at add time as
     * `builder.addNode(id)` and walked through `report.nodeRemap` on a renumbering freeze
     * (graph-format design 14.4 rule 5). INVALID_INDEX until the node reaches the builder.
     */
    index: number = INVALID_INDEX;

    /**
     * Whether the user pinned this node. The element owns this, not the layout engine: an engine is
     * constructed fresh on every setLayout (LayoutManager.ts:131), so engine-held pin state is lost
     * at every layout change, and a simulation's fixed mask is rebuilt from this field after a load
     * or a reload (WebGPU design 9.4 item 4).
     */
    pinned = false;
```

with `import { INVALID_INDEX } from "@graphty/graph-format";` added to the imports.

Replace `isPinned` (`:613-616`) with:

```ts
    isPinned(): boolean {
        return this.pinned;
    }
```

and set the field in `pin` / `unpin` (`:438-447`):

```ts
    pin(): void {
        this.pinned = true;
        this.context.getLayoutManager().layoutEngine?.pin(this);
    }

    unpin(): void {
        this.pinned = false;
        this.context.getLayoutManager().layoutEngine?.unpin(this);
    }
```

- [ ] **Step 3: The `Edge` field**

In `EG/graphty-element/src/Edge.ts`, in the field block (`:38-75`), after `id: string;`, add:

```ts
    /**
     * This edge's LOGICAL edge index in the element's current GraphSnapshot, assigned at add time and
     * re-keyed through `report.edgeRemap` on a compacting freeze. INVALID_INDEX until the edge reaches
     * the builder. `id` is unchanged and remains the `"src:dst"` pair string (DEP-M6-B).
     */
    index: number = INVALID_INDEX;
```

with `import { INVALID_INDEX } from "@graphty/graph-format";` added to the imports.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/unit/node-index-pinned.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 4: Prove nothing else read `isPinned`**

Run: `cd EG/graphty-element && grep -rn "isPinned" src stories test`
Expected: the definition in `src/Node.ts` and nothing else in `src/`. If a story or a test asserts `isPinned() === false` unconditionally, it was asserting the stub; update it to pin first.

- [ ] **Step 5: Lint, typecheck and ASCII**

Run: `cd EG && pnpm exec nx run graphty-element:lint && LC_ALL=C grep -nP '[^\x00-\x7F]' graphty-element/src/Node.ts graphty-element/src/Edge.ts`
Expected: lint exit 0 (the element's `lint` target runs eslint and `tsc --noEmit`); the grep prints nothing.

- [ ] **Step 6: Checkpoint** -- no commit. `src/Node.ts` and `src/Edge.ts` modified; one new test file untracked.

### Task M6-T6: `DataManager` on the store -- ingestion, removal, `EdgeMap` deleted

**Repository:** `EG`. Size: 3-4 ed. This is the largest task in E0.

**Spec:** graph-format design 14.4's per-mutation-path table, lines 4174-4188 (`addNodes`, `addEdges`, `removeNode`, `removeEdge`, `updateNodes`, `getStats`); rules 2, 3 and 9.

**Files:**
- Modify: `graphty-element/src/managers/DataManager.ts` (the whole class: `:5` the `EdgeMap` import, `:31-57` the fields, `:222-271` `addNodes`, `:341-382` `getNode` / `removeNode`, `:402-504` `addEdges` / `getEdge` / `getEdgeBetween` / `removeEdge`, `:649-668` `clear`, `:684-694` `getStats`)
- Modify: `graphty-element/src/Edge.ts` (delete `class EdgeMap`, `:1201-1295`)
- Modify: `graphty-element/src/Graph.ts:1501`, `:1509` (`getNodeCount` / `getEdgeCount` read the store, not `.size`). NOTE: `src/Graph.ts` is edited AGAIN by M6-T7 and M6-T11; these tasks must not run concurrently.
- Modify: `graphty-element/src/managers/UpdateManager.ts:393` (it reports `nodeCache.size` / `edgeCache.size` to `StatsManager` every frame; `EdgeMap.size` is O(E), `Edge.ts:1258-1265`)
- Create: `design/decisions/2026-09-19-element-edge-identity-stays-the-pair-string.md`, `design/decisions/2026-09-19-element-edge-weight-probes-value-second.md`
- Modify: `design/decisions/README.md` (two index rows)
- Test: `graphty-element/test/data/ingestion.test.ts` (new, node project), and `graphty-element/test/managers/DataManager.test.ts` is rewritten by Task M6-T9
- NOT touched: `graphty-element/src/layout/**` (M6-T10), `graphty-element/src/algorithms/**` (M6-T8)

**Interfaces:**
- Consumes: `GraphStore` (M6-T3): `builder`, `positions`, `seedColumn`, `edgeIdColumn`, `touch()`, `getSnapshot()`, `undirected(s)`, `nextEdgeId()`; `EventManager.emitSnapshotReplaced` (M6-T4); `Node.index`, `Node.pinned`, `Edge.index` (M6-T5).
- Produces: `DataManager.getSnapshot(): GraphSnapshot`, `DataManager.undirected(s): DerivedGraph`, `DataManager.positions: ElementPositions` (a read-only getter over the private store; consumed by M6-T7 Step 3, M6-T9 Step 2, M6-T10 PLAN DECISION 3 and M6-T12 Step 3, none of which can reach `store` because it is private), `DataManager.edgesByIndex: (Edge | undefined)[]`, and the unchanged public surface `nodes`, `edges`, `getNode`, `getEdge`, `getEdgeBetween`, `addNode(s)`, `addEdge(s)`, `removeNode`, `removeEdge`, `addDataFromSource`, `clear`, `dispose`, `getStats`, `applyStylesToExisting*`, `updateStyles`, `setGraphContext`, `setLayoutEngine`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `nodeCache` is DELETED and `nodes` is the one id-keyed map. They are the same keys and the same values today -- every write sets both (`DataManager.ts:244-245`), `clear` clears both (`:656-658`), `dispose` clears both (`:194-196`). `nodeCache` has exactly three readers outside `DataManager`: `Edge.ts:123`, `Edge.ts:130` and `UpdateManager.ts:393`; all three become `nodes`. Keeping two maps that must agree with a third structure (the builder) is three ways to disagree.
2. PLAN DECISION: a duplicate node id is a MERGE, last-write-wins on `node.data`, not a silent drop. Today `addNodes` does `if (this.nodeCache.get(nodeId)) { continue; }` (`DataManager.ts:232-234`), so a second chunk carrying richer attributes for a known id is discarded -- a real bug, and 14.4's `addNodes` row prescribes the merge. The merge is `Object.assign(node.data, record)` followed by the existing restyle path, plus `store.touch()`. It inverts `test/managers/DataManager.test.ts:77` ("should not update existing node (current behavior)"), which M6-T9 rewrites.
3. PLAN DECISION: parallel edges stay DROPPED, and the duplicate test is `this.edges.has(edgeId)` rather than `EdgeMap`. See D-M6-6 and DEP-M6-M: 14.4's `addEdges` row (`graph-format-design.md:4176`) says duplicate `(src, dst)` pairs "are now kept"; this plan deletes `EdgeMap` and the throw but keeps the drop. `EdgeMap` was always redundant with the `edges` map: both are keyed by the same pair, `edges` by the string `` `${src}:${dst}` `` (`Edge.ts:111`, `DataManager.ts:436`) and `edgeCache` by the nested pair. Deleting `EdgeMap` therefore removes the O(E) `size` getter (`Edge.ts:1258-1265`) that `UpdateManager` calls EVERY FRAME (`UpdateManager.ts:393`), and changes no behaviour at all. The "Attempting to create duplicate Edge" throw (`Edge.ts:1232-1234`) is unreachable from `addEdges` today and goes with the class.
4. PLAN DECISION: `removeNode(id)` now removes the incident edges, closing the standing TODO at `DataManager.ts:369-380`. `builder.removeNode(id)` RETURNS the removed edge indices as a `U32` (`graph-format/src/builder/graph-builder.ts:516`), so the element disposes exactly `edgesByIndex[e]` for each, deletes them from `edges`, and notifies the layout engine through the existing `hasRemoveEdge` guard (`DataManager.ts:23-25`). Today an `Edge` can outlive an endpoint, and `Edge.update()` then reads a disposed `Node`'s mesh -- which is why `Edge` carries a `disposed` guard (`Edge.ts:75`). This inverts `test/managers/DataManager.test.ts:238`.
5. PLAN DECISION: the BUILDER takes an edge immediately even when an endpoint has no render object, but the RENDER object is still deferred. `GraphBuilder` is constructed with `addMissingNodes: true`, so `builder.addEdge(srcId, dstId, w)` creates missing endpoints and the snapshot is complete mid-load. The `Edge` CONSTRUCTOR, however, reads both `Node` objects out of the id map (`Edge.ts:123`, `:130`), so it cannot run before they exist. 14.4's "the `bufferedEdges` retry loop deleted" is therefore only half right: the loop stays, renamed `pendingEdges`, keyed by the builder's edge index, and drained on the next `addNodes` exactly as today (`DataManager.ts:266`) plus once more at `data-loading-complete`. Consequence to state plainly: between an edge record and its endpoints arriving, `getSnapshot()` sees the edge and `dm.edges` does not; every algorithm reads the snapshot, so the algorithms are the MORE correct of the two.
6. PLAN DECISION: the edge weight is `record[config.data.knownFields.edgeWeightPath]` when that is a finite number, else `record.value` when THAT is a finite number, else `1`; the second probe logs once per `addEdges` burst at debug level with the message `"edge weight read from the legacy 'value' key; set data.knownFields.edgeWeightPath"`. See D-M6-9 and DEP-M6-C. `toAlgorithmGraph` reads `edge.data["value"]` and falls back to `edge["value"]` then `1` (`graphConverter.ts:56-64`); the `edge["value"]` probe is dropped -- it reads a property off the Edge OBJECT, which no data source has ever written.
7. PLAN DECISION: `getEdgeBetween(src, dst)` does NOT consult the snapshot. It is `this.edges.get(\`${src}:${dst}\`)`, which is what `edgeCache.get(src, dst)` was, at the same cost, and works while the builder is dirty. 14.4's `addEdges` row asks for "`builder.findEdges(u, v)[0]` while `dirty`" (`graph-format-design.md:4176`); that needs two id-to-index lookups and is O(degree), where the string key is O(1) and already exists. This is a departure from a line the design fixed, so it is recorded as DEP-M6-K in section 0.5.
8. PLAN DECISION: `getStats()` reports `nodeCount: this.nodes.size` and `edgeCount: this.edges.size` unchanged, NOT the builder's counts. 14.4's `getStats` row asks for "`builder.nodeCount`, `builder.edgeCount` minus mirror halves" (`graph-format-design.md:4185`). With D-M6-6 and PLAN DECISION 5 the two can differ transiently (a buffered edge is in the builder, not in `edges`), and `getStats` feeds the on-screen counter, which should count what is DRAWN. A separate `getSnapshotStats()` is not added; nothing asks for it. Departure DEP-M6-L.

- [ ] **Step 1: Write the failing ingestion test**

The six cases are driven through a real `GraphStore` plus the pure ingestion functions, NOT through a real `DataManager` (which needs a Babylon `GraphContext` and would force this file into the slow `browser` project). Each case asserts against `store.getSnapshot()`, not against a render map.

Create `EG/graphty-element/test/data/ingestion.test.ts`:

```ts
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode, resolveEdgeWeight } from "../../src/data/ingest";

const KNOWN = { positionScale: 1 };

function makeStore(): GraphStore {
    return new GraphStore({
        directed: "auto",
        positionScale: 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
}

/** The render-side map DataManager keeps; a plain object stands in for a Node here. */
interface StubNode {
    id: string;
    index: number;
    data: Record<string, unknown>;
}

describe("ingestion into the one builder", () => {
    it("merges a duplicate node id into ONE builder node, last-write-wins on data", () => {
        const store = makeStore();
        const nodes = new Map<string, StubNode>();

        for (const chunk of [
            { id: "A", label: "one", size: 4 },
            { id: "B", label: "b" },
            { id: "A", label: "two" },
        ]) {
            const existing = nodes.get(chunk.id);
            const ingest = ingestNode(store, chunk.id, chunk, KNOWN);
            if (existing === undefined) {
                nodes.set(chunk.id, { id: chunk.id, index: ingest.index, data: { ...chunk } });
            } else {
                assert.strictEqual(ingest.merged, true, "the second A was a merge");
                Object.assign(existing.data, chunk);
            }
        }

        const s = store.getSnapshot();
        assert.strictEqual(s.nodeCount, 2);
        assert.strictEqual(nodes.size, 2);
        assert.strictEqual(nodes.get("A")?.data.label, "two", "last write wins");
        assert.strictEqual(nodes.get("A")?.data.size, 4, "and the earlier keys survive");
    });

    it("takes an edge whose endpoints have not arrived, and the snapshot carries them", () => {
        const store = makeStore();
        const index = ingestEdge(store, "X", "Y", 1);
        assert.notStrictEqual(index, INVALID_INDEX);
        const s = store.getSnapshot();
        assert.strictEqual(s.edgeCount, 1, "addMissingNodes: true means the builder took it");
        assert.strictEqual(s.nodeCount, 2, "and materialised both endpoints");
    });

    it("drops a second edge for the same ordered pair (D-M6-6)", () => {
        const store = makeStore();
        const edges = new Map<string, number>();
        for (const [src, dst] of [
            ["a", "b"],
            ["a", "b"],
        ] as const) {
            const key = `${src}:${dst}`;
            if (edges.has(key)) {
                continue;
            }

            edges.set(key, ingestEdge(store, src, dst, 1));
        }

        assert.strictEqual(edges.size, 1);
        assert.strictEqual(store.getSnapshot().edgeCount, 1);
    });

    it("removeNode returns the incident edge indices and the snapshot loses them", () => {
        const store = makeStore();
        const ab = ingestEdge(store, "a", "b", 1);
        const bc = ingestEdge(store, "b", "c", 1);
        assert.strictEqual(store.getSnapshot().edgeCount, 2);
        const removed = [...store.builder.removeNode("b")];
        store.touch();
        assert.strictEqual(removed.length, 2, "both incident edges came back");
        assert.deepStrictEqual([...removed].sort((x, y) => x - y), [ab, bc].sort((x, y) => x - y));
        const s = store.getSnapshot();
        assert.strictEqual(s.nodeCount, 2);
        assert.strictEqual(s.edgeCount, 0);
    });

    it("resolves the weight by edgeWeightPath, then the legacy value key, then 1 (DEP-M6-C)", () => {
        assert.deepStrictEqual(resolveEdgeWeight({ weight: 2.5, value: 9 }, "weight"), {
            weight: 2.5,
            source: "path",
        });
        assert.deepStrictEqual(resolveEdgeWeight({ value: 9 }, "weight"), { weight: 9, source: "legacy" });
        assert.deepStrictEqual(resolveEdgeWeight({}, "weight"), { weight: 1, source: "default" });
        assert.deepStrictEqual(resolveEdgeWeight({ weight: "heavy", value: 9 }, "weight"), {
            weight: 9,
            source: "legacy",
        }, "a non-finite path value falls through rather than poisoning the weight");
        assert.deepStrictEqual(resolveEdgeWeight({ value: 9 }, null), { weight: 9, source: "legacy" });
    });

    it("the string key answers getEdgeBetween while the store is stale (PLAN DECISION 7)", () => {
        const store = makeStore();
        const edges = new Map<string, number>();
        edges.set("a:b", ingestEdge(store, "a", "b", 1));
        assert.strictEqual(store.stale, true, "touch() happened and nobody has frozen yet");
        assert.strictEqual(edges.get("a:b") !== undefined, true);
        assert.strictEqual(edges.get("b:a"), undefined, "directed: the mirror is a different key");
    });
});
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/ingestion.test.ts`
Expected: FAIL, all six, with `Cannot find module '../../src/data/ingest'`.

- [ ] **Step 2: Extract the ingestion functions**

Create `EG/graphty-element/src/data/ingest.ts` holding the three pure functions `DataManager` will call, so they are testable in the `default` project (D-M6-5):

```ts
import type { GraphStore } from "./GraphStore";

/** Result of pushing one node record into the builder. */
export interface NodeIngest {
    readonly index: number;
    /** True when the id was already present and this record merged into it. */
    readonly merged: boolean;
}

/**
 * Push one node record into the builder and seed its import position.
 *
 * The seed column keeps FILE units: `positionScale` is applied by `GraphStore.seedUnplaced`, so a
 * later change to the scale re-seeds correctly from the same column. `known` is taken as a parameter
 * rather than read off the store so this function stays pure and testable.
 * @param store - the element's store
 * @param id - the node id, already extracted with jmespath
 * @param record - the raw record
 * @param known - `config.data.knownFields` (only `positionScale` is read today)
 * @returns the assigned index and whether this was a merge
 */
export function ingestNode(
    store: GraphStore,
    id: string | number,
    record: Record<string, unknown>,
    known: { positionScale: number },
): NodeIngest {
    void known;
    const before = store.builder.nodeCount;
    const index = store.builder.addNode(id);
    const merged = store.builder.nodeCount === before;

    const { position } = record;
    if (Array.isArray(position) && (position.length === 2 || position.length === 3)) {
        const x = position[0];
        const y = position[1];
        const z = position.length === 3 ? position[2] : 0;
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            store.builder.setNodeValue(store.seedColumn, index, [x as number, y as number, z as number]);
        }
    }

    store.touch();
    return { index, merged };
}

/**
 * Resolve an edge weight: the configured path, then the legacy "value" key, then 1.
 * DEP-M6-C -- the second probe is removed by a later phase.
 * @param record - the raw edge record
 * @param path - `config.data.knownFields.edgeWeightPath`
 * @returns the weight and which probe produced it
 */
export function resolveEdgeWeight(
    record: Record<string, unknown>,
    path: string | null,
): { weight: number; source: "path" | "legacy" | "default" } {
    const fromPath = path === null ? undefined : record[path];
    if (typeof fromPath === "number" && Number.isFinite(fromPath)) {
        return { weight: fromPath, source: "path" };
    }

    // DEP-M6-C: graphConverter.ts:35 hard-coded weightAttribute = "value", so every weighted fixture
    // and story in this repository carries it. The probe is removed by a later phase; its reversal
    // condition is in design/decisions/2026-09-19-element-edge-weight-probes-value-second.md.
    const legacy = record.value;
    if (typeof legacy === "number" && Number.isFinite(legacy)) {
        return { weight: legacy, source: "legacy" };
    }

    return { weight: 1, source: "default" };
}

/**
 * Push one edge into the builder and stamp its element-assigned id column.
 * @param store - the element's store
 * @param srcId - source node id
 * @param dstId - destination node id
 * @param weight - the resolved weight
 * @returns the logical edge index
 */
export function ingestEdge(store: GraphStore, srcId: string | number, dstId: string | number, weight: number): number {
    const index = store.builder.addEdge(srcId, dstId, weight);
    store.builder.setEdgeValue(store.edgeIdColumn, index, store.nextEdgeId());
    store.touch();
    return index;
}
```

Note on `setEdgeValue`'s argument ORDER, which the branded `ColumnHandle` type exists to protect: it is `setEdgeValue(column, edge, value)` (`graph-format/src/types/builder.ts:275`), NOT `(edge, column, value)`. A JS caller that swaps them gets `E_UNKNOWN_COLUMN: no edge column with handle <n>` at runtime; TypeScript catches it because `ColumnHandle` is `number & { readonly __brand: "ColumnHandle" }` (`graph-format/src/types/builder.ts:125`).

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/data/ingestion.test.ts`
Expected: PASS, 6 cases.

- [ ] **Step 3: Rewrite `DataManager`**

Apply, in `EG/graphty-element/src/managers/DataManager.ts`:

| Where | Change |
| --- | --- |
| `:5` | `import { Edge, EdgeMap } from "../Edge";` -> `import { Edge } from "../Edge";` |
| `:31-36` | delete `nodeCache` and `edgeCache`; add `readonly edgesByIndex: (Edge \| undefined)[] = []` and `private store: GraphStore` |
| `:49-50` | delete `shouldStartLayout` and `shouldZoomToFit` -- written at `:262-263` and `:454`, read NOWHERE (the live signal is `emitDataAdded`'s payload) |
| `:53-57` | rename `bufferedEdges` to `pendingEdges` and add `edgeIndex: number` to its element type |
| `:64-69` | the constructor builds the store: `new GraphStore({ directed: styles.config.data.directed, positionScale: styles.config.data.knownFields.positionScale, onReplaced: (r) => { if (this.graphContext) { this.eventManager.emitSnapshotReplaced(this.graphContext, r.previous, r.next, r.report); } }, onNodeRemap: (m) => this.walkNodeRemap(m), onEdgeRemap: (m) => this.walkEdgeRemap(m) })`. No `as unknown as Graph`: M6-T4 Step 3 types the emitter `graph: Graph \| GraphContext` and casts once inside `EventManager`, the way `emitGraphError` already does (`EventManager.ts:115-123`) |
| new | `getSnapshot(): GraphSnapshot { return this.store.getSnapshot(); }` and `undirected(s: GraphSnapshot): DerivedGraph { return this.store.undirected(s); }` |
| new | `get positions(): ElementPositions { return this.store.positions; }` -- the store is `private`, and four later tasks read the array through the manager: `Graph.updateNodes` (M6-T7 Step 3), the grown `createMockGraph` (M6-T9 Step 2), `engine.load` / `engine.reload` (M6-T10 PLAN DECISION 3) and the bridge construction (M6-T12 Step 3). Without this getter every one of them is `Property 'positions' does not exist on type 'DataManager'` under `tsc --noEmit`, which the element's `lint` target runs |
| new | `private walkNodeRemap(remap: U32): void` -- `for (const n of this.nodes.values()) { n.index = remap[n.index] ?? INVALID_INDEX; }`; `private walkEdgeRemap(remap: U32): void` -- rebuild `edgesByIndex` in one pass and set each `Edge.index` |
| `:232-234` | the duplicate-id `continue` becomes the merge of PLAN DECISION 2 |
| `:241-245` | after `new Node(...)`: `n.index = ingestNode(this.store, nodeId, node, known).index;` and one `this.nodes.set(nodeId, n)` |
| `:414-416` | `if (this.edgeCache.get(src, dst))` -> `if (this.edges.has(\`${src}:${dst}\`))` |
| `:419-426` | the endpoint check no longer gates the BUILDER: call `ingestEdge` first, push `{ record, srcIdPath, dstIdPath, edgeIndex }` onto `pendingEdges` only for the render object |
| `:434-436` | after `new Edge(...)`: `e.index = edgeIndex; this.edgesByIndex[edgeIndex] = e; this.edges.set(e.id, e);` |
| `:350-382` | `removeNode` calls `const removed = this.store.builder.removeNode(nodeId); this.store.touch();` then disposes `edgesByIndex[e]` for each removed index (PLAN DECISION 4) |
| `:484-504` | `removeEdge(edgeId)` looks the `Edge` up in `edges`, calls `this.store.builder.removeEdge(edge.index)`, `this.store.touch()`, clears `edgesByIndex[edge.index]` |
| `:475-477` | `getEdgeBetween` becomes the string lookup of PLAN DECISION 7 (DEP-M6-K) |
| `:649-668` | `clear()` also calls `this.store.dispose()`, empties `edgesByIndex` and `pendingEdges`, and REPLACES the store with a fresh one. Not because the builder cannot be reset -- `GraphBuilder.clear()` exists and empties nodes, edges, columns and meta while keeping the builder's options (`graph-format/src/types/builder.ts:472`) -- but because it drops the DECLARED columns with everything else, so `seedColumn` and `edgeIdColumn` (and, from M6-T15, `graphty.mass` and `graphty.size`) would all have to be re-declared and the four `ColumnHandle` fields re-assigned at the call site. A fresh `GraphStore` re-runs those four `declare*Column` calls in ONE place, the constructor, which is also where their options live. The cost is one discarded `ElementPositions`, which is correct: a cleared dataset has no coordinates to keep |
| `:684-694` | `getStats` unchanged except `cachedMeshes` (PLAN DECISION 8, DEP-M6-L) |

- [ ] **Step 4: Delete `EdgeMap` and fix its three foreign readers**

Delete `EG/graphty-element/src/Edge.ts:1201-1295` (`export class EdgeMap` through its closing brace). Then:

Run: `cd EG/graphty-element && grep -rn "nodeCache\|edgeCache\|EdgeMap" src stories test`
Expected: only `src/layout/D3GraphLayoutEngine.ts`'s `newEdgeMap` field (six lines: `:129`, `:137`, `:209`, `:214`, `:223`, `:264`), which is a plain `Map<Edge, D3InputEdge>` and UNRELATED. Every other hit is a site to change: `src/Edge.ts:123` and `:130` (`nodeCache` -> `nodes`), `src/managers/UpdateManager.ts:393` (`nodeCache.size` -> `nodes.size`, `edgeCache.size` -> `edges.size`).

- [ ] **Step 5: The two decision records**

Create `EG/design/decisions/2026-09-19-element-edge-identity-stays-the-pair-string.md` with the house skeleton: H1 `The element's edge identity stays the "src:dst" pair string`; `Date: 2026-09-19`; `Decided by: the owner`; `Changes: graph-format design 14.4 rule 3 and the edge-identity paragraph at lines 4167-4171. Those lines are NOT edited; this record supersedes them for graphty-element.`; `## The decision` (the counter still exists, in the `graphty.edgeId` u32 role-`id` column and on `Edge.index`; `Edge.id` and the `DataManager.edges` key stay the pair string; parallel edges stay dropped, which is what keeps the string unique; nothing else moves); `## Why` ; `## What we are giving up, and why it is acceptable` -- quote 14.4's "its string form is what events expose", concede that a counter is the right identity for a graph that keeps parallel edges, and state the cost plainly: until this is reversed the element cannot represent a multigraph; `## What would reverse this` -- "a dataset in hand with parallel edges that a user must see as separate edges; or an importer (IO1) that emits them. One request is not evidence; a second is."

Create `EG/design/decisions/2026-09-19-element-edge-weight-probes-value-second.md` the same way, superseding 14.4 rule 10's "today's converter default `value` is never read", which is true of `edgeWeightPath` and false of the converter -- `graphConverter.ts:35` hard-codes `weightAttribute = "value"` and every weighted fixture in the repository carries it. Reversal condition: the probe is removed when `grep -rl '"value"' graphty-element/stories graphty-element/test/fixtures` is empty.

Add two rows to `EG/design/decisions/README.md`'s index table, each cell the record's H1 verbatim.

- [ ] **Step 6: Run the element**

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default && pnpm exec vitest run --project=browser --shard=1/5`
Expected: `default` PASS. `browser` shard 1 shows the FAILURES this task creates in `test/managers/DataManager.test.ts` -- at minimum `:77` (merge), `:189` / `:204` (deferred edge creation now only defers the render object), `:238` (incident edges removed), `:271` (edge cache). Task M6-T9 rewrites that file; do not patch it here.

- [ ] **Step 7: Checkpoint** -- no commit; `LC_ALL=C grep -nP '[^\x00-\x7F]'` clean over every file this task touched.

### Task M6-T7: The freeze point, and `runAlgorithmsOnLoad` on load-complete

**Repository:** `EG`. Size: 1-1.5 ed.

**Spec:** graph-format design 14.4 rule 6 lines 4090-4094 (coalescing) and the `runAlgorithmsOnLoad` row of the mutation table (Q16).

**Files:**
- Modify: `graphty-element/src/Graph.ts:215-226` (the `data-add` trigger), `:337-367` (the `data-added` listener that runs algorithms), `:1382-1421` (`updateNodes` handling a `position` key). NOTE: `src/Graph.ts` is also edited by M6-T6 and M6-T11; these tasks must not run concurrently.
- Test: `graphty-element/test/browser/run-algorithms-on-load.test.ts` (new)
- NOT touched: `graphty-element/src/managers/OperationQueueManager.ts` -- no queue change is needed (PLAN DECISION 1)

**Interfaces:**
- Consumes: `DataManager.getSnapshot()` (M6-T6).
- Produces: no new symbol; the behaviour that one data-source load produces ONE freeze and ONE algorithm run per configured algorithm.

PLAN DECISIONS made by this part:

1. PLAN DECISION: nothing freezes eagerly, and the operation queue is NOT modified. 14.4 rule 6 asks for freezes "COALESCED per operation-queue drain", but the element has three paths that never reach the queue: `addDataFromSource` bypasses it entirely (`Graph.ts:332-334` says so in a comment), `Graph.addNodes` / `addEdges` bypass it under `options.skipQueue` (`Graph.ts:1004-1007`, `:1079-1082`), and only the queued path fires the `data-add` trigger (`Graph.ts:215-226`). A lazy cached `getSnapshot()` coalesces all three by construction: the first reader after a burst pays one freeze, every later reader in the same revision gets the cached object, and a burst with no reader pays nothing. See D-M6-10. Neither of the queue's two tables is touched: `OBSOLESCENCE_RULES`, which is imported from `src/constants/obsolescence-rules.ts` (`OperationQueueManager.ts:4`) and read at `:298`, nor `POST_EXECUTION_TRIGGERS` (`OperationQueueManager.ts:129-134`, the `"data-add" -> ["layout-update"]` table), which is the one that would otherwise be the tempting place to hang a freeze.
2. PLAN DECISION: `runAlgorithmsOnLoad` moves from the per-chunk `data-added` listener (`Graph.ts:352-365`) to `data-loading-complete` (`DataManager.ts:581-589`). Today, with `DataSource.DEFAULT_CHUNK_SIZE = 1000` (`graphty-element/src/data/DataSource.ts:29`), a 50k-node load fires every configured algorithm FIFTY times, each on a partial graph, each now also forcing a freeze. `data-loading-complete` fires once per load. The `data-added` listener keeps its OTHER job -- setting `layoutManager.running` and starting the stats session (`Graph.ts:340-346`) -- unchanged. Records pushed through `Graph.addNodes` never emit `data-loading-complete`, so for that path `runAlgorithmsOnLoad` no longer fires at all; that is the honest consequence, and the caller runs `runAlgorithm` itself.
3. PLAN DECISION: `Graph.updateNodes` gains a `position` branch that writes `dm.positions` directly and does NOT touch the builder or bump the revision. 14.4's `updateNodes` row says exactly this ("no builder involvement, no re-freeze"); today the method does `Object.assign(node.data, update)` and restyles (`Graph.ts:1390-1393`, `:1409-1412`) with no position handling at all, so a `{ position: [...] }` update silently does nothing visible.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/browser/run-algorithms-on-load.test.ts`. It runs in the `browser` project because it constructs a real `Graph`; `test/browser/**/*.test.ts` is the `browser` project's first include glob and is excluded from `default` (`graphty-element/vitest.config.ts:61` and `:29`), so no config change is needed.

```ts
import { assert, beforeEach, describe, it, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { createTestGraph } from "../helpers/testSetup";

/** 2500 records is three chunks at DataSource.DEFAULT_CHUNK_SIZE = 1000 (src/data/DataSource.ts:29). */
function makeRecords(count: number): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${i}` }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({ src: `n${i}`, dst: `n${i + 1}` }));
    return { nodes, edges };
}

describe("runAlgorithmsOnLoad fires once per LOAD, not once per chunk", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        graph.styles.config.data.algorithms = ["graphty:degree"];
        graph.runAlgorithmsOnLoad = true;
    });

    it("runs each configured algorithm exactly once for a 2500-record load", async () => {
        const spy = vi.spyOn(graph, "runAlgorithm").mockResolvedValue(undefined);
        const { nodes, edges } = makeRecords(2500);
        await graph.addDataFromSource({ type: "adhoc", data: { nodes, edges } });
        await vi.waitFor(() => {
            assert.isAtLeast(spy.mock.calls.length, 1);
        });
        assert.strictEqual(spy.mock.calls.length, 1, "one call per load, not one per 1000-record chunk");
        assert.deepStrictEqual(spy.mock.calls[0], ["graphty", "degree"]);
        spy.mockRestore();
    });

    it("freezes once for the same load, not once per chunk", async () => {
        const dm = graph.getDataManager();
        const { nodes, edges } = makeRecords(2500);
        await graph.addDataFromSource({ type: "adhoc", data: { nodes, edges } });
        const first = dm.getSnapshot();
        const second = dm.getSnapshot();
        assert.strictEqual(first, second, "the lazy cache coalesces the whole burst (D-M6-10)");
        assert.strictEqual(first.nodeCount, 2500);
    });
});
```

If `createTestGraph`'s signature or the ad-hoc data-source shape differs from the above, copy them verbatim from an existing `test/browser/*.test.ts` that loads data -- what this test asserts is the CALL COUNT, and the construction is whatever the neighbouring browser tests already do.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=browser test/browser/run-algorithms-on-load.test.ts`
Expected: FAIL on the first case -- the spy records 3 calls (one per 1000-record chunk), the assertion wants 1. The second case passes already: `getSnapshot()` is lazy from Task M6-T3 and is what makes this task's change safe.

- [ ] **Step 2: Move the listener.** Cut the `if (this.runAlgorithmsOnLoad && algorithms && algorithms.length > 0) { ... }` block from the `data-added` listener (`Graph.ts:351-366`) and paste it into a new `addListener("data-loading-complete", ...)` registered beside it. Keep the `void ... .catch(...)` shape EXACTLY as it is: the existing catch logs through `console.error(\`[Graph] Error running algorithm ${trimmedName}:\`, error)` (`Graph.ts:361-363`) and routes nowhere else. Do NOT give the moved listener error routing it never had -- adding an `emitGraphError` here would make a rejection user-visible for the first time in the same commit that moves it, and the two changes could not be attributed apart.

Run: same as Step 1.
Expected: PASS, 2 cases; the spy records 1 call.

- [ ] **Step 3: The `position` branch of `updateNodes`.** In `Graph.ts`'s `updateNodes` loop, before `Object.assign(node.data, update)`, add: when `update.position` is an array of two or three finite numbers and `node.index !== INVALID_INDEX`, call `this.dataManager.positions.write(node.index, x, y, z ?? 0)` and delete `position` from the object that is assigned onto `node.data`.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=browser --shard=1/5`
Expected: the same failures as Task M6-T6 Step 6 and no new ones.

- [ ] **Step 4: Checkpoint** -- no commit; ASCII clean.

### Task M6-T8: `fromSnapshot`, and the 21 adapters off `toAlgorithmGraph`

**Repository:** `EG`. Size: 2-3 ed.

**Spec:** graph-format design 14.4's retirement paragraph, lines 4189-4211 (`toAlgorithmGraph` replaced by "a two-line selector per adapter"; `graphUtils.buildAdjacencyList`, `buildWeightedAdjacencyList`, `graphConverter.ts` and `EdgeMap` deleted).

**Files:**
- Create: `graphty-element/src/algorithms/utils/snapshotGraph.ts`
- Delete: `graphty-element/src/algorithms/utils/graphConverter.ts`, `graphty-element/src/algorithms/utils/graphUtils.ts`, `graphty-element/test/algorithms/utils/graph-utils.test.ts`
- Modify: `graphty-element/src/algorithms/utils/index.ts` (the barrel; `:7` re-exports `graphUtils`), `graphty-element/src/algorithms/utils/communityUtils.ts:5` (it imports `type { GraphLike }` from `graphUtils`)
- Modify: the 21 adapter files listed in the table below, two lines each
- Modify: `graphty-element/src/algorithms/MaxFlowAlgorithm.ts:160-198`, `graphty-element/src/algorithms/MinCutAlgorithm.ts:192-234` (they build an `AlgorithmGraph` by hand from `dm.edges` / `dm.nodes`)
- Modify: `graphty-element/src/algorithms/DegreeAlgorithm.ts` (snapshot-native, PLAN DECISION 2)
- Modify: `graphty-element/src/algorithms/Algorithm.ts:236-246` (`addNodeResult` skips an id with no render node instead of throwing, PLAN DECISION 6)
- Test: `graphty-element/test/algorithms/utils/snapshot-graph.test.ts` (new)

**Interfaces:**
- Consumes: `@graphty/graph-format`: `type GraphSnapshot`; `@graphty/algorithms`: `Graph as AlgorithmGraph`; `DataManager.getSnapshot()` / `.undirected(s)`.
- Produces: `fromSnapshot(s: GraphSnapshot, options?: { directed?: boolean; allowParallelEdges?: boolean; addReverseEdges?: boolean }): AlgorithmGraph`. `GraphConverterOptions` has FOUR keys (`graphConverter.ts:12-26`); `SnapshotGraphOptions` has THREE. The three every call site actually passes -- `directed`, `allowParallelEdges`, `addReverseEdges` -- keep the same names, defaults and semantics, so every adapter's edit is a one-for-one substitution with its option object copied verbatim. The fourth, `weightAttribute` (default `"value"`, `graphConverter.ts:15-16` and `:35`), is deliberately DROPPED: `grep -rn "weightAttribute" graphty-element/src` finds it only inside `graphConverter.ts` itself, no adapter passes it, and the weight now comes from `s.weights` through `s.edgeToArc` -- resolved once at ingestion by `resolveEdgeWeight` (M6-T6 PLAN DECISION 6), which is where DEP-M6-C's `weight`-then-`value` probe order now lives.
- Also modifies: `Algorithm.addNodeResult` (`graphty-element/src/algorithms/Algorithm.ts:236-246`), see PLAN DECISION 6.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `fromSnapshot` keeps `toAlgorithmGraph`'s exact option semantics, INCLUDING `useDirectedInternally = directed || addReverseEdges` (`graphConverter.ts:43`) and the hand-mirroring of edges when `!directed && addReverseEdges` (`:70-72`). This is what makes the 21-file edit mechanical and provably behaviour-preserving: the only thing that changes is WHERE the nodes and edges come from (the snapshot, not the render maps). Weights come from `s.weights === null ? 1 : s.weights[s.edgeToArc[e]]` -- `weights` is per-ARC and `arcCount` long (graph-format invariant I8), so the per-edge value is indexed through `edgeToArc` (`graph-format/src/snapshot/graph-snapshot.ts:463`).
2. PLAN DECISION: `DegreeAlgorithm` becomes snapshot-native in E0 and needs no `indexed.*` and no accelerator. `snapshot.inDegree()`, `.outDegree()` and `.degree()` return `U32` arrays directly (`graph-format/src/snapshot/graph-snapshot.ts:625`, `:634`, `:645`), so the adapter drops its `AlgorithmGraph` entirely and writes its six node results plus three graph results from those three arrays and `s.ids.idOf(i)`. It is the cheapest proof that the snapshot seam works end to end, and design 9.2's `AlgorithmAccelerator` has no degree method precisely because a snapshot answers it.
3. PLAN DECISION: the OTHER five adapters whose `indexed.*` port M8a ships -- BFS, Dijkstra, PageRank, ConnectedComponents, Kruskal -- stay on `fromSnapshot` in E0 and move to `accelerated()` in Task M6-T16. Splitting the edit in two keeps the E0 PR free of any `@graphty/algorithms` symbol that does not exist today, which is what lets E0 merge before M8a (D-M6-1).
4. PLAN DECISION: no adapter is renamed, added or removed, so the TRIPLICATED registration is not touched. Every adapter registers itself at its own file bottom (e.g. `PageRankAlgorithm.ts:240`), `src/algorithms/index.ts:36-72` registers all 23 again, and `src/algorithms/index.ts:112-136` hard-codes the same 23 a third time in `knownAlgorithms` for `getAllAlgorithmInfo()`. `Map.set` makes the first two idempotent; the third is a separate list that silently omits anything not added to it. The rule for any future task in this plan: adding or renaming an adapter is a THREE-place edit, and `test/algorithms/options/algorithm-info.test.ts` (16 tests) is what catches the third.
5. PLAN DECISION: `graphUtils.ts` is deleted together with its test, and `GraphLike` moves into `communityUtils.ts`. `grep -rn "buildAdjacencyList\|buildWeightedAdjacencyList" graphty-element/src` returns only the definitions and their JSDoc examples -- the functions have NO caller in `src/`; the only callers are the 17 references in `test/algorithms/utils/graph-utils.test.ts` (`grep -c` on that file = 17). The file is dead production code kept alive by its own test. `communityUtils.ts:5` imports `type { GraphLike }` from it, so the type moves before the file goes.
6. PLAN DECISION: `Algorithm.addNodeResult` SKIPS an id with no render node and logs at debug, instead of throwing. Today it throws `couldn't find nodeId '<id>' while trying to run algorithm '<type>'` when `dataManager.nodes.get(nodeId)` misses (`Algorithm.ts:238-241`), and that was safe only because `toAlgorithmGraph` walked `dm.nodes`, so every result id had a render object by construction. From this task on, adapters walk the SNAPSHOT, and M6-T6 PLAN DECISION 5 deliberately creates snapshot nodes with no render object: the builder is `addMissingNodes: true`, so an edge that arrives before its endpoints materialises both in the snapshot while `dm.nodes` stays empty for them until the `pendingEdges` drain. Moving `runAlgorithmsOnLoad` to `data-loading-complete` (M6-T7) narrows the window but does not close it -- `Graph.runAlgorithm` is public and a story or the app can call it mid-load. The choice is between guarding ONE method and adding a `const n = dm.nodes.get(s.ids.idOf(i)); if (n === undefined) { continue; }` to every result loop in 23 adapters; one guard, at the one place that already does the lookup, is the smaller and the safer edit. The new body:

```ts
    addNodeResult(nodeId: number | string, resultName: string, result: unknown): void {
        const p = this.#createPath(resultName);
        const n = this.graph.getDataManager().nodes.get(nodeId);
        if (!n) {
            // A snapshot node with no render object: addMissingNodes created it for an edge whose
            // endpoints have not arrived (DataManager PLAN DECISION 5 of M6-T6). It gets a render
            // object and its results on the next run; it is not an error.
            this.logger.debug("skipping algorithm result for a node with no render object", {
                nodeId,
                algorithm: this.type,
                result: resultName,
            });
            return;
        }

        deepSet(n, p, result);
    }
```

Use whatever logger handle `Algorithm` already has; if it has none, `console.debug` with the same message is acceptable and is what the rest of `src/algorithms/` does. `addEdgeResult` needs NO change: it takes an `Edge` OBJECT, not an id (`Algorithm.ts:248+`), so a caller cannot hand it an edge that has no render object.

- [ ] **Step 1: Write the failing test**

Create `EG/graphty-element/test/algorithms/utils/snapshot-graph.test.ts`. The four option objects are exactly the four combinations the 21 adapters pass (Step 3's table).

```ts
import { GraphBuilder } from "@graphty/graph-format";
import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { fromSnapshot, type SnapshotGraphOptions } from "../../../src/algorithms/utils/snapshotGraph";

/** a -> b (2), b -> c (3), c -> d (5); one isolated pair so directedness is observable. */
function makeSnapshot(): GraphSnapshot {
    const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
    builder.addEdge("a", "b", 2);
    builder.addEdge("b", "c", 3);
    builder.addEdge("c", "d", 5);
    return builder.freeze({ label: "snapshot-graph-test" });
}

const CASES: { name: string; options: SnapshotGraphOptions; edges: number }[] = [
    { name: "directed, no mirrors", options: { directed: true, addReverseEdges: false }, edges: 3 },
    { name: "undirected, no mirrors", options: { addReverseEdges: false }, edges: 3 },
    { name: "directed: false, mirrors on by default", options: { directed: false }, edges: 6 },
    { name: "all defaults", options: {}, edges: 6 },
];

describe("fromSnapshot", () => {
    for (const c of CASES) {
        it(`carries every node and the right edge count: ${c.name}`, () => {
            const s = makeSnapshot();
            const g = fromSnapshot(s, c.options);
            assert.deepStrictEqual([...g.nodes()].map((n) => n.id).sort(), ["a", "b", "c", "d"]);
            assert.strictEqual([...g.edges()].length, c.edges);
        });
    }

    it("reads each edge weight through edgeToArc, not as a constant 1", () => {
        const s = makeSnapshot();
        const g = fromSnapshot(s, { directed: true, addReverseEdges: false });
        const byPair = new Map([...g.edges()].map((e) => [`${String(e.source)}:${String(e.target)}`, e.weight]));
        assert.strictEqual(byPair.get("a:b"), 2);
        assert.strictEqual(byPair.get("b:c"), 3);
        assert.strictEqual(byPair.get("c:d"), 5);
    });

    it("mirrors an edge with the SAME weight when !directed && addReverseEdges", () => {
        const s = makeSnapshot();
        const g = fromSnapshot(s, { directed: false, addReverseEdges: true });
        const byPair = new Map([...g.edges()].map((e) => [`${String(e.source)}:${String(e.target)}`, e.weight]));
        assert.strictEqual(byPair.get("a:b"), 2);
        assert.strictEqual(byPair.get("b:a"), 2);
    });

    it("carries endpoints the builder created for an edge whose nodes never arrived", () => {
        // This is the case Algorithm.addNodeResult's guard exists for (PLAN DECISION 6): the snapshot
        // has 2 nodes, and a DataManager mid-load would have 0 render objects for them.
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("orphan-src", "orphan-dst", 1);
        const s = builder.freeze({ label: "orphans" });
        const g = fromSnapshot(s, { directed: true, addReverseEdges: false });
        assert.deepStrictEqual([...g.nodes()].map((n) => n.id).sort(), ["orphan-dst", "orphan-src"]);
    });

    it("an unweighted snapshot reports weight 1 rather than undefined", () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        builder.addEdge("a", "b");
        const s = builder.freeze({ label: "unweighted" });
        const g = fromSnapshot(s, { directed: true, addReverseEdges: false });
        assert.strictEqual([...g.edges()][0]?.weight, 1);
    });
});
```

If `AlgorithmGraph`'s iteration accessors are named differently from `nodes()` / `edges()` or an edge exposes its endpoints under other keys, read them off `@graphty/algorithms`'s `Graph` and adjust the three readers; the ASSERTIONS -- node set, edge count, per-edge weight -- are the contract and do not move.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/algorithms/utils/snapshot-graph.test.ts`
Expected: FAIL, 8 cases, `Cannot find module '../../../src/algorithms/utils/snapshotGraph'`.

- [ ] **Step 2: Write `fromSnapshot`**

```ts
import { Graph as AlgorithmGraph } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";

export interface SnapshotGraphOptions {
    /** Treat the graph as directed. Default false, matching the retired toAlgorithmGraph. */
    directed?: boolean;
    /** Keep parallel edges in the AlgorithmGraph. Default true. */
    allowParallelEdges?: boolean;
    /** Add the mirror of every edge when !directed. Default true. */
    addReverseEdges?: boolean;
}

/**
 * Build the legacy @graphty/algorithms Graph from the element's GraphSnapshot.
 *
 * This REPLACES `toAlgorithmGraph` (graph-format design 14.4 lines 4189-4197). The option names,
 * defaults and semantics are identical, so an adapter's edit is a one-for-one substitution; what
 * changes is the SOURCE -- one frozen snapshot rather than a walk of the render maps.
 *
 * Adapters whose `indexed.*` port exists call that instead (DEP-M6-G); this is the bridge for the
 * 17 whose port does not exist yet, and each later port PR deletes one call.
 * @param s - the snapshot, or `dm.undirected(s).snapshot` for an adapter that wants the undirected view
 * @param options - the same options the retired converter took
 * @returns the legacy Graph
 */
export function fromSnapshot(s: GraphSnapshot, options: SnapshotGraphOptions = {}): AlgorithmGraph {
    const { directed = false, allowParallelEdges = true, addReverseEdges = true } = options;
    const useDirectedInternally = directed || addReverseEdges;
    const graph = new AlgorithmGraph({ directed: useDirectedInternally, allowParallelEdges });

    for (let i = 0; i < s.nodeCount; i++) {
        graph.addNode(s.ids.idOf(i));
    }

    const { weights } = s;
    const edgeToArc = weights === null ? null : s.edgeToArc;
    for (let e = 0; e < s.edgeCount; e++) {
        const source = s.ids.idOf(s.edgeSource(e));
        const target = s.ids.idOf(s.edgeTarget(e));
        const weight = weights === null || edgeToArc === null ? 1 : (weights[edgeToArc[e] ?? 0] ?? 1);
        graph.addEdge(source, target, weight);
        if (!directed && addReverseEdges) {
            graph.addEdge(target, source, weight);
        }
    }

    return graph;
}
```

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/algorithms/utils/snapshot-graph.test.ts`
Expected: PASS, 8 cases.

- [ ] **Step 3: The 21 adapter edits**

Each adapter's `run()` loses `import { toAlgorithmGraph } from "./utils/graphConverter";` and gains `import { fromSnapshot } from "./utils/snapshotGraph";`, and its single converter call becomes the line in the last column. `dm` is `this.graph.getDataManager()`. Where the column says `undirected`, the line is `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot, OPTS)` -- the adapters that hand-mirrored edges semantically want the undirected view (14.4 line 4193) and the mirroring in `fromSnapshot` reproduces today's structure exactly on top of it.

| Adapter file | Line | Today | Becomes |
| --- | --- | --- | --- |
| `DegreeAlgorithm.ts` | 50 | `{ directed: true, addReverseEdges: false }` | snapshot-native, no graph at all (Step 5) |
| `PageRankAlgorithm.ts` | 205 | `{ directed: true, addReverseEdges: false }` | `fromSnapshot(dm.getSnapshot(), { directed: true, addReverseEdges: false })` |
| `HITSAlgorithm.ts` | 198 | `{ directed: true }` | `fromSnapshot(dm.getSnapshot(), { directed: true })` |
| `StronglyConnectedComponentsAlgorithm.ts` | 52 | `{ directed: true, addReverseEdges: false }` | `fromSnapshot(dm.getSnapshot(), { directed: true, addReverseEdges: false })` |
| `ConnectedComponentsAlgorithm.ts` | 53 | `{ addReverseEdges: false }` | `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot, { addReverseEdges: false })` |
| `LouvainAlgorithm.ts` | 156 | `{ addReverseEdges: false }` | `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot, { addReverseEdges: false })` |
| `LeidenAlgorithm.ts` | 151 | `{ addReverseEdges: false }` | same shape as Louvain |
| `LabelPropagationAlgorithm.ts` | 111 | `{ addReverseEdges: false }` | same shape as Louvain |
| `GirvanNewmanAlgorithm.ts` | 130 | `{ addReverseEdges: false }` | same shape as Louvain |
| `KruskalAlgorithm.ts` | 59 | `{ directed: false, addReverseEdges: false }` | `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot, { directed: false, addReverseEdges: false })` |
| `PrimAlgorithm.ts` | 121 | `{ directed: false, addReverseEdges: false }` | same shape as Kruskal |
| `BipartiteMatchingAlgorithm.ts` | 77 | `{ directed: false, addReverseEdges: false }` | same shape as Kruskal |
| `BellmanFordAlgorithm.ts` | 144 | `{ directed: false }` | `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot, { directed: false })` |
| `FloydWarshallAlgorithm.ts` | 53 | `{ directed: false }` | same shape as BellmanFord |
| `BFSAlgorithm.ts` | 135 | `{ directed: false }` | same shape as BellmanFord |
| `DijkstraAlgorithm.ts` | 164 | `{}` | `fromSnapshot(dm.undirected(dm.getSnapshot()).snapshot)` |
| `DFSAlgorithm.ts` | 171 | `{}` | same shape as Dijkstra |
| `BetweennessCentralityAlgorithm.ts` | 60 | `{}` | same shape as Dijkstra |
| `ClosenessCentralityAlgorithm.ts` | 60 | `{}` | same shape as Dijkstra |
| `EigenvectorCentralityAlgorithm.ts` | 181 | `{}` | same shape as Dijkstra |
| `KatzCentralityAlgorithm.ts` | 216 | `{}` | same shape as Dijkstra |

- [ ] **Step 4: MaxFlow and MinCut**

Neither uses the converter; both build an `AlgorithmGraph` by hand (`MaxFlowAlgorithm.ts:174`, `MinCutAlgorithm.ts:202`) after `Array.from(dm.edges.values())` and `Array.from(dm.nodes.values())`, and both coerce ids with `String(node.id)` (`MaxFlowAlgorithm.ts:178`, `MinCutAlgorithm.ts:207`). Change the two `Array.from` sources to walk `s = dm.getSnapshot()` (`s.ids.idOf(i)` for nodes; `s.edgeSource(e)` / `s.edgeTarget(e)` for edges), keep the capacity / weight reads from `dm.edgesByIndex[e]?.data` exactly as they are, and keep the `String(...)` coercion -- changing it is an id-semantics change, and `data.knownFields.idCoercion` is inert at M6 (DEP-M6-J) precisely so that change lands in one deliberate phase rather than here. Default source / sink stay `Array.from(dm.nodes.keys())[0]` / `.pop()` (`MinCutAlgorithm.ts:264-266`).

- [ ] **Step 5: `DegreeAlgorithm` snapshot-native**

`run()` becomes: `const s = this.graph.getDataManager().getSnapshot(); const inDeg = s.inDegree(); const outDeg = s.outDegree(); const deg = s.degree();` then one pass computing the three maxima, then one pass writing `inDegree`, `outDegree`, `degree`, `inDegreePct`, `outDegreePct`, `degreePct` per node through `this.addNodeResult(s.ids.idOf(i), name, value)`, then the three `addGraphResult` calls. The `*Pct` convention is value/maximum (`DegreeAlgorithm.ts:91`) and must stay that, because the app reads `degreePct` and documents that the `*Pct` conventions differ per algorithm (`graphty/src/components/shell/analysis/nodeMetrics.ts:31-39`).

- [ ] **Step 6: Delete the dead modules**

Move `export interface GraphLike` from `graphUtils.ts:19-24` into `communityUtils.ts` and drop the import at `communityUtils.ts:5`. Delete `src/algorithms/utils/graphConverter.ts`, `src/algorithms/utils/graphUtils.ts` and `test/algorithms/utils/graph-utils.test.ts`. Remove their re-exports from `src/algorithms/utils/index.ts`.

Run, as TWO commands -- chaining them with `&&` cannot work, because a clean grep exits 1 and short-circuits the lint away:

```bash
cd EG/graphty-element
grep -rn "toAlgorithmGraph\|graphConverter\|graphUtils" src test stories; echo "grep exit $?"
cd .. && pnpm exec nx run graphty-element:lint; echo "lint exit $?"
```

Expected: the grep prints NOTHING and reports `grep exit 1` -- all 43 `toAlgorithmGraph` occurrences across 22 files are gone. Then `lint exit 0` (the element's `lint` target is eslint plus `tsc --noEmit`).

- [ ] **Step 7: Run the adapter suite**

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/algorithms`
Expected: FAIL in every file that drives an adapter through `createMockGraph`, because the mock has no `getSnapshot()` -- `test/algorithms/algorithm.test.ts`, `algorithm-infrastructure.test.ts`, `centrality/pagerank-algorithm.test.ts`, `community/louvain-algorithm.test.ts` and the five `options/*` files that construct a graph. Task M6-T9 fixes the mock; the registry-only tests (e.g. `pathfinding/dijkstra-algorithm.test.ts:6-90`) stay green because they never build a graph.

- [ ] **Step 8: Checkpoint** -- no commit; ASCII clean.

### Task M6-T9: The test-helper migration -- `mockGraph` and `DataManager.test.ts`

**Repository:** `EG`. Size: 2-3 ed. This is the single biggest breakage surface in E0.

**Files:**
- Modify: `graphty-element/test/helpers/mockGraph.ts:105-160` (the factory), `:172-230` (the accessors)
- Modify: `graphty-element/test/helpers/mock-graph-context.ts`, `graphty-element/test/helpers/testSetup.ts`, `graphty-element/test/helpers/mock-graph-custom-data.ts`, `graphty-element/test/helpers/schema-test-graph.ts`, `graphty-element/test/helpers/test-graph.ts`
- Modify: `graphty-element/test/managers/DataManager.test.ts` (five inversions, one rewrite)
- NOT touched: the 27 files that IMPORT `createMockGraph` -- the whole point of this task is that they need no edit

**Interfaces:**
- Consumes: `GraphStore` (M6-T3), `ingestNode` / `ingestEdge` (M6-T6).
- Produces: a `createMockGraph` whose returned object satisfies `getDataManager()` with `nodes`, `edges`, `edgesByIndex`, `graphResults`, `getSnapshot()`, `undirected(s)` and `positions` -- the surface every adapter now reads.

- [ ] **Step 1: See the breakage**

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/algorithms test/ai 2>&1 | tail -40`
Expected: a list of failures whose common message is `dm.getSnapshot is not a function`. Count the failing FILES; the count should be at most 16 of the 27 importers (the AI and registry-only tests never build a graph).

- [ ] **Step 2: Grow the mock**

In `createMockGraph` (`test/helpers/mockGraph.ts:105-160`), after the two population loops, build a real store from the same data and return it from the same closure:

```ts
    const store = new GraphStore({
        directed: "auto",
        positionScale: 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    const edgesByIndex: (MockEdge | undefined)[] = [];
    for (const n of nodes.values()) {
        n.index = store.builder.addNode(n.id);
    }

    for (const e of edges.values()) {
        const weight = typeof e.data?.weight === "number" ? e.data.weight : typeof e.data?.value === "number" ? e.data.value : 1;
        e.index = ingestEdge(store, e.srcId, e.dstId, weight);
        edgesByIndex[e.index] = e;
    }

    store.touch();
```

and extend the object the factory returns:

```ts
        getDataManager() {
            return {
                nodes,
                edges,
                edgesByIndex,
                positions: store.positions,
                getSnapshot: () => store.getSnapshot(),
                undirected: (s: GraphSnapshot) => store.undirected(s),
                get graphResults() { return graphResults; },
                set graphResults(val: GraphResults | undefined) { graphResults = val; },
            };
        },
```

Reason: the file's own header says "Algorithms expect a Graph type but only use getDataManager()" (`mockGraph.ts:1-10`), and that stopped being true the moment an adapter read a snapshot. Building a REAL `GraphStore` rather than a stub snapshot means the 27 importers exercise the same freeze path production does, which is what makes the mock worth keeping at all.

Add `index` to the `MockNode` and `MockEdge` types at the top of the file (both default `INVALID_INDEX`), so `addNodeResult`'s lookup and `edgesByIndex` agree.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default test/algorithms test/ai`
Expected: PASS. Any residual failure names a mock accessor (`getNodeResult`, `getEdgeResult`, `getGraphResult` at `mockGraph.ts:172-230`) whose edge key is `` `${srcId}:${dstId}` `` -- that key is unchanged by DEP-M6-B, so a failure there is a real regression, not a helper gap.

- [ ] **Step 3: The other five helpers.** `mock-graph-context.ts` fakes a `GraphContext`; give its `getDataManager()` the same seven members by delegating to a `createMockGraph`. `testSetup.ts`, `mock-graph-custom-data.ts`, `schema-test-graph.ts` and `test-graph.ts` all build on `createMockGraph` and need no change beyond a type widen where they annotate the return.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=default`
Expected: PASS, the whole node project.

- [ ] **Step 4: `DataManager.test.ts`, eight deliberate changes**

The file holds 23 `it(` cases today (`grep -c "^\s*it(" test/managers/DataManager.test.ts` = 23, at lines 22, 27, 36, 49, 64, 77, 99, 109, 114, 130, 146, 161, 174, 189, 204, 219, 233, 238, 257, 271, 290, 301, 319). Five rows below rewrite existing cases in place and three rows ADD one, so the file ends at 26.

| Line | Title today | What it becomes |
| --- | --- | --- |
| 77 | "should not update existing node (current behavior)" | "should MERGE an existing node last-write-wins": add `{ id: "A", label: "one" }` then `{ id: "A", label: "two" }`; assert `nodes.size === 1` and `data.label === "two"` (PLAN DECISION 2 of M6-T6) |
| 161 | "should auto-generate edge id if not provided" | unchanged in intent; assert the id is still `` `${src}:${dst}` `` AND that `edge.index` is a number (DEP-M6-B) |
| 189, 204 | "should defer edge creation if source/target node doesn't exist" | split: the RENDER object is still deferred (`dm.edges.size === 0`), and the BUILDER already has the edge (`dm.getSnapshot().edgeCount === 1`) -- PLAN DECISION 5 of M6-T6 |
| 238 | "should not remove edges when node is removed (current behavior)" | inverted: "should remove incident edges when a node is removed"; assert `dm.edges.size` drops and the snapshot loses them |
| 271 | "should use edge cache for existing edges" | rewritten against `getEdgeBetween` and the duplicate drop; `EdgeMap` no longer exists |
| new | -- | "a burst of merges still produces a new snapshot": add, freeze, merge the same id, freeze, assert the two snapshots differ (the DEP-M6-A regression) |
| new | -- | "every added node carries its builder index": add two chunks of nodes (`["a","b"]` then `["c","a"]`), then for every `n` of `dm.nodes.values()` assert `n.index !== INVALID_INDEX` and `dm.getSnapshot().ids.idOf(n.index) === n.id`. This is the case that actually proves `Node.index` exists and is assigned at add time -- M6-T5's unit test assigns the field itself and cannot |
| new | -- | "surviving nodes are re-indexed by the freeze report": add `a`, `b`, `c`; freeze; `removeNode("a")`; freeze; assert `dm.nodes.get("b")?.index` and `.get("c")?.index` both equal `dm.getSnapshot().ids.indexOf` of their own ids, and that neither is `INVALID_INDEX`. This is `walkNodeRemap` (M6-T6) under test, and it is the E0 half of G6's "pin survival across a remap" |

Run: `cd EG/graphty-element && pnpm exec vitest run --project=browser test/managers/DataManager.test.ts`
Expected: PASS, 26 tests (23 today plus the three new ones).

- [ ] **Step 5: Checkpoint** -- no commit; ASCII clean.

### Task M6-T10: The engine contract -- `load`, `reload`, `getNodePositionInto`; E0 commits

**Repository:** `EG`. Size: 2-3 ed.

**Spec:** graph-format design 14.4 rules 7 and the "layout set" / "topology change with an active layout" rows of the mutation table (lines 4182-4184).

**Files:**
- Modify: `graphty-element/src/layout/LayoutEngine.ts:36-183` (four optional members on the abstract class), `:194-344` (`SimpleLayoutEngine`, which opens at `:194`; `:185` is `SimpleLayoutConfig`, a different thing)
- Modify: `graphty-element/src/managers/LayoutManager.ts:12-21` (two more feature guards), `:108-225` (`_setLayoutInternal` calls `load`), new (`snapshot-replaced` subscription calling `reload`). NOTE: `LayoutManager.ts` is edited again by M6-T12, M6-T13 and M6-T15; none of these may run concurrently.
- Modify: `graphty-element/src/Node.ts:204-212` (`update()` reads the element array when the engine offers `getNodePositionInto`). NOTE: `src/Node.ts` was also edited by M6-T5.
- Test: `graphty-element/test/managers/LayoutManager.test.ts` (two new cases, browser project)
- NOT touched: the 14 `SimpleLayoutEngine` subclasses -- their `doLayout()` bodies do not change (PLAN DECISION 2)

**Interfaces:**
- Produces, on `abstract class LayoutEngine`, four OPTIONAL members: `load?(snapshot: GraphSnapshot, positions: ElementPositions): void`, `reload?(snapshot: GraphSnapshot, report: FreezeReport, positions: ElementPositions): void`, `getNodePositionInto?(index: number, out: { x: number; y: number; z: number }): void`, `dispose?(): void`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: the four new members are OPTIONAL on the abstract class and reached through feature guards, not abstract methods. `LayoutManager` already uses exactly this idiom -- `hasDispose` is `"dispose" in engine` (`LayoutManager.ts:12-17`), `hasGetEdgePath` is `"getEdgePath" in engine` (`:19-21`), and `DataManager` feature-tests `removeNode` / `removeEdge` the same way (`DataManager.ts:16-25`). Making them abstract would force 16 engine classes to grow four stubs each. Note in passing that `hasDispose`'s branch is DEAD today: no engine in `src/layout/*.ts` declares `dispose`, so `LayoutManager.dispose()` (`:92-100`) and the dispose-previous branch (`:179-181`) have never fired. E1's `SimulationLayoutEngine` is the first engine for which they do.
2. PLAN DECISION: `SimpleLayoutEngine` publishes into the shared array in the BASE class; no subclass changes. `getNodePosition(n)` today is `if (stale) doLayout(); return posToCoords(this.positions[n.id], this.scalingFactor)` (`LayoutEngine.ts:261-267`) over an id-keyed `Record`. It becomes: if stale, `doLayout()` then ONE pass copying the Record into `scene` (`scene.write(n.index, x * scalingFactor, y * scalingFactor, z * scalingFactor)` for every node with an entry, skipping nodes with no entry so their row stays unplaced); then read back through `scene.read(n.index, out)`. A node with no entry keeps today's `{x:0,y:0,z:0}` (`posToCoords` at `:352-365` returns that for `undefined`), so no picture moves. All 14 subclasses keep their `doLayout()` untouched, and every static layout now writes the element array -- which is what makes a freeze non-destructive for them too.
3. PLAN DECISION: `LayoutManager` subscribes to `snapshot-replaced` in `setGraphContext` and calls `engine.reload(dm.undirected(next).snapshot, report, dm.positions)` when the engine has it, else falls back to today's behaviour of leaving the engine alone. E0 ships the subscription and the call; E1's `SimulationLayoutEngine` is the first engine that implements `reload`. `_setLayoutInternal` calls `engine.load(dm.undirected(dm.getSnapshot()).snapshot, dm.positions)` right after `engine.addNodes` / `addEdges` (`LayoutManager.ts:145-148`) and BEFORE `await engine.init()` (`:151`), so an engine that wants the snapshot has it before it initialises.
4. PLAN DECISION: `Node.update()` prefers `getNodePositionInto` when the engine offers it and falls back to `getNodePosition` otherwise, reusing ONE module-level scratch object rather than allocating per node per frame. 14.4 rule 7's reason for `...Into` is that a shared `{x,y,z}` would alias source and destination in the EDGE case; for a node there is no aliasing, only the allocation. The `if (this.dragging) { return; }` guard at `Node.ts:199-202` stays exactly where it is: a dragged node is not pulled back, on either path.

- [ ] **Step 1: Write the failing tests**

Append to `EG/graphty-element/test/managers/LayoutManager.test.ts` (already in the `browser` project's include list, `vitest.config.ts:64`). The `LayoutEngine.get` monkey-patch copies the file's existing style at `:85-117`.

```ts
describe("the engine contract (graph-format design 14.4 rule 7)", () => {
    interface Spied {
        load: ReturnType<typeof vi.fn>;
        reload: ReturnType<typeof vi.fn>;
        restore: () => void;
    }

    function installSpyEngine(): Spied {
        const load = vi.fn();
        const reload = vi.fn();
        const original = LayoutEngine.get;
        class SpyEngine extends LayoutEngine {
            static type = "spy";
            async init(): Promise<void> {
                /* nothing */
            }
            addNode(): void {
                /* the snapshot is the node source */
            }
            addEdge(): void {
                /* the snapshot is the edge source */
            }
            getNodePosition(): { x: number; y: number; z: number } {
                return { x: 0, y: 0, z: 0 };
            }
            setNodePosition(): void {
                /* nothing */
            }
            getEdgePosition(): { src: { x: number; y: number; z: number }; dst: { x: number; y: number; z: number } } {
                return { src: { x: 0, y: 0, z: 0 }, dst: { x: 0, y: 0, z: 0 } };
            }
            step(): void {
                /* nothing */
            }
            pin(): void {
                /* nothing */
            }
            unpin(): void {
                /* nothing */
            }
            get nodes(): Iterable<never> {
                return [];
            }
            get edges(): Iterable<never> {
                return [];
            }
            get isSettled(): boolean {
                return true;
            }
            load = load;
            reload = reload;
        }

        LayoutEngine.get = () => new SpyEngine({});
        return { load, reload, restore: () => { LayoutEngine.get = original; } };
    }

    it("calls load with the UNDIRECTED snapshot and the element's ElementPositions", async () => {
        const spy = installSpyEngine();
        try {
            await graph.addNodes([{ id: "a" }, { id: "b" }]);
            await graph.setLayout("spy");
            assert.strictEqual(spy.load.mock.calls.length, 1);
            const [snapshot, positions] = spy.load.mock.calls[0] as [{ directed: boolean }, { count: number }];
            assert.strictEqual(snapshot.directed, false, "dm.undirected(...).snapshot, not the directed one");
            assert.strictEqual(positions, graph.getDataManager().positions, "the element's array, by reference");
            assert.strictEqual(positions.count, 2);
        } finally {
            spy.restore();
        }
    });

    it("calls reload once on snapshot-replaced, with the freeze report", async () => {
        const spy = installSpyEngine();
        try {
            await graph.addNodes([{ id: "a" }, { id: "b" }]);
            await graph.setLayout("spy");
            spy.reload.mockClear();
            await graph.addNodes([{ id: "c" }]);
            graph.getDataManager().getSnapshot(); // the lazy freeze is what fires the event
            assert.strictEqual(spy.reload.mock.calls.length, 1);
            const [, report] = spy.reload.mock.calls[0] as [unknown, { nodeRemap: unknown }];
            assert.strictEqual("nodeRemap" in (report as object), true);
        } finally {
            spy.restore();
        }
    });
});
```

`graph` is the suite's existing fixture; reuse whatever `beforeEach` the neighbouring describes in this file already use rather than building a second one.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=browser test/managers/LayoutManager.test.ts`
Expected: FAIL, 2 new cases -- neither spy fires, because nothing calls `load` or subscribes to `snapshot-replaced` yet. Every existing case in the file stays GREEN, including "should run pre-steps when setting layout" (`:51`), "should run configured number of pre-steps when setting layout" (`:66`) and "should handle zero pre-steps configuration" (`:124`).

- [ ] **Step 2: The abstract-class members and the two guards.** Add the four optional members to `LayoutEngine` with JSDoc naming 14.4 rule 7; add `hasLoad` / `hasReload` beside `hasDispose` (`LayoutManager.ts:12-21`).

- [ ] **Step 3: `SimpleLayoutEngine` publishes.** Add `protected scene: ElementPositions | null = null;` and `load(snapshot, positions) { this.snapshot = snapshot; this.scene = positions; this.stale = true; }`; rewrite `getNodePosition` per PLAN DECISION 2; implement `getNodePositionInto(index, out)` as `this.scene?.read(index, out)`.

- [ ] **Step 4: `LayoutManager` calls them.** The `load` call in `_setLayoutInternal`; the `snapshot-replaced` subscription and its `reload` call.

- [ ] **Step 5: `Node.update()`.** The `getNodePositionInto` branch.

Run: `cd EG/graphty-element && pnpm exec vitest run --project=browser test/managers/LayoutManager.test.ts && pnpm exec vitest run --project=default`
Expected: PASS both.

- [ ] **Step 6: The full E0 green check**

Run:

```bash
cd EG
pnpm exec nx run-many -t lint,build --projects=graphty-element --parallel=1   # eslint + tsc + the vite library build

# The storybook vitest project drives a SERVED Storybook through
# storybookTest({ storybookUrl: process.env.STORYBOOK_URL ?? "https://localhost:6006" })
# (graphty-element/vitest.config.ts:136-140). Nothing in CI or this repo sets STORYBOOK_URL, so a
# fresh worktree with neither the build nor the server fails all four shards on connection. These
# are the two commands CI runs (.github/workflows/ci.yml:116 and :517); 9026 is inside 9000-9099.
pnpm exec nx run graphty-element:build-storybook
pnpm exec http-server graphty-element/storybook-static -p 9026 &
sleep 3

cd graphty-element
pnpm exec vitest run --project=default                                        # the fast node project
for n in 1 2 3 4 5; do pnpm exec vitest run --project=browser --project=interactions --shard=$n/5 || break; done
for n in 1 2 3 4; do STORYBOOK_URL=http://localhost:9026 pnpm exec vitest run --project=storybook --shard=$n/4 || break; done
cd .. && pnpm exec knip
LC_ALL=C grep -rnP '[^\x00-\x7F]' graphty-element/src graphty-element/test design/decisions | head
kill %1   # the http-server
```

Expected: every command exit 0; the final grep prints nothing. The storybook project is where a silent E0 regression shows up as a thrown render rather than a pixel diff, so it is not optional.

- [ ] **Step 7: Commit (owner)** -- `build(graphty-element): depend on graph-format and carry the four E0 config fields`.
- [ ] **Step 8: Commit (owner)** -- `feat(graphty-element): the element-owned position array and the one graph-format builder`.
- [ ] **Step 9: Commit (owner)** -- `feat(graphty-element): a typed snapshot-replaced event, Node.index and Node.pinned`.
- [ ] **Step 10: Commit (owner)** -- `refactor(graphty-element): DataManager owns the builder and EdgeMap is retired`.
- [ ] **Step 11: Commit (owner)** -- `refactor(graphty-element): adapters read the snapshot and toAlgorithmGraph is retired`.
- [ ] **Step 12: Commit (owner)** -- `feat(graphty-element): layout engines load and reload from the element snapshot`.
- [ ] **Step 13: Commit (owner)** -- `docs: record the element's edge identity and edge-weight decisions`.

The agent's job for Steps 7-13 is to leave the working tree in the state the Checkpoints describe and to tell the owner these seven subjects, in this order. The agent runs NO git command. The mapping from subject to task is: Step 7 = M6-T1 (with `pnpm-lock.yaml` riding along); Step 8 = M6-T2 and M6-T3; Step 9 = M6-T4 and M6-T5; Step 10 = M6-T6 and M6-T7; Step 11 = M6-T8 and M6-T9; Step 12 = M6-T10; Step 13 = the two files under `design/decisions/` and their two README rows. No `!` on any subject: every public signature is unchanged, and the behaviour changes (node merge, incident-edge removal, the weight path) are documented in the bodies, each body line under 100 characters (`tools/commit-changes.sh:470-471`). Scopes `graphty-element` and `docs` are both in the script's `VALID_SCOPES` (`tools/commit-changes.sh:468-469`), so E0 needs no fix to that script. Appendix 7.1 carries the owner-only commands that go with these steps, including re-pointing the script's STEPS / SUBJECTS / PATHS block. After the commits the owner opens the PR; `Chromatic (graphty-element)` must report NO changes (D-M6-2) -- a changed snapshot in the E0 PR is a bug to fix, not a baseline to accept.

---

## Phase M6b: E1 -- design 9.4 items 1-10, the accelerator seam

**Entry criteria:** Phase M6a (E0) on master; Phase M5 on master (`@graphty/layout` exports `createSimulation`, `LayoutSimulation`, `LayoutAccelerator`, `SimulationType` and the option types from `layout/src/simulation/`); the first A2 commit (Phase M8a) on master (`@graphty/algorithms` exports `accelerated`, `AlgorithmAccelerator`, `AcceleratedAlgorithms` and the twelve `*ResultLike` shapes FLAT from the root barrel, out of `algorithms/src/indexed/accelerator.ts`, with `AcceleratedAlgorithms` carrying its first six methods -- `pageRank`, `sssp`, `breadthFirstSearch`, `connectedComponents`, `weaklyConnectedComponents`, `minimumSpanningTree`; the `indexed.*` ports themselves are reached through the `indexed` NAMESPACE, `export * as indexed`, not flat, M8a PD-9). Work on branch `feat/element-accelerator` in a worktree (`git worktree add .worktrees/element-accelerator -b feat/element-accelerator master`, owner; `EA` below); every commit through `tools/commit-changes.sh` with scope `graphty-element`; the half lands as ONE PR whose LAST commit is the Chromatic re-baseline.

**Step 0 of the phase:** `cd EA && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,algorithms,layout --parallel=3`.

### Task M6-T11: The fake accelerator; `Graph.accelerator`, `setAccelerator()`, `accelerator-changed`, the release list

**Repository:** `EA`. Size: 1.5-2 ed. Design 9.4 items 1, 2 and 8 (the fake half).

**This task is FIRST in E1 because four later tasks test against the fake accelerator it creates.** M6-T12, M6-T14, M6-T16 and M6-T17 all write tests whose only accelerator is `createFakeAccelerator()`; if the file landed last, each of those tasks would state an unreachable "Expected: PASS" for a test that cannot even import. See D-M6-13.

**Files:**
- Create: `graphty-element/src/testing/fakeAccelerator.ts` (the fake, used by the tests of M6-T12/T14/T16 and by the two stories of M6-T17)
- Create: `graphty-element/src/types/accelerator.ts` (the `GraphAccelerator` alias)
- Modify: `graphty-element/src/Graph.ts:100-110` (the field, beside `xrHelper` / `needRays`), `:2044-2055` (`setAccelerator` beside `setRunning`), `:1583-1610` (a `getAccelerator()` beside `getStyleManager`), `:4134` (`dispose`)
- Modify: `graphty-element/src/events.ts` (a `GraphAcceleratorChangedEvent` in the `GraphEvent` union), `graphty-element/src/managers/EventManager.ts` (the emitter and the `addListener` case). NOTE: both files were already edited by M6-T4; these tasks must not run concurrently.
- Test: `graphty-element/test/browser/accelerator-surface.test.ts`

**Why `test/browser/` and not `test/unit/`:** the test constructs a real `Graph`, so it needs a DOM and Babylon. The `browser` vitest project's `include` is an explicit path list, not a glob over the whole tree -- `test/browser/**/*.test.ts` plus five named `test/managers/*.test.ts` files and a handful of others (`graphty-element/vitest.config.ts:61-75`) -- so a file under `test/unit/` would match ZERO files there, while ALSO matching the `default` project's `test/**/*.test.ts` include (`:16`) and running in Node, where `new Graph(...)` has no canvas. Putting it under `test/browser/` routes it correctly with no config change: that glob is the browser project's first include and is excluded from `default` at `:29`.

**Interfaces:**
- Consumes: `@graphty/algorithms`: `type AlgorithmAccelerator`; `@graphty/layout`: `type LayoutAccelerator`, `type LayoutSimulation`, `type ForceAtlas2Options`, `type FruchtermanReingoldOptions`; `@graphty/graph-format`: `type GraphSnapshot`, `type NodeMask`, `type F32`, `maskGet`.
- Produces: `export type GraphAccelerator = AlgorithmAccelerator & LayoutAccelerator & { release?(s: GraphSnapshot): void; dispose?(): void };`, `Graph.accelerator: GraphAccelerator | null` (default `null`), `Graph.setAccelerator(acc: GraphAccelerator | null): void`, `Graph.getAccelerator(): GraphAccelerator | null`, the `accelerator-changed` graph event carrying `{ graph, previous, next }`, and `createFakeAccelerator(options?: FakeAcceleratorOptions): FakeAccelerator`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `accelerator` is a plain public FIELD with `setAccelerator()` as a method, matching the file. `Graph` has exactly ONE getter in 4147 lines (`get input(): InputManager`, `Graph.ts:2128`); everything else is a `getX()` method, and public state is a field with an initialiser (`runAlgorithmsOnLoad = false`, `needRays = true`). A setter pair would be the only one in the class. The element never constructs an accelerator and never probes for one (root `CLAUDE.md`: no fallbacks); the app injects it (design 9.5).
2. PLAN DECISION: `accelerator-changed` gets the same FOUR edits as `snapshot-replaced` (M6-T4 PLAN DECISION 1). E1's own `LayoutManager` is a subscriber, so the `addListener` case is mandatory or the subscription throws at `EventManager.ts:449-450`.
3. PLAN DECISION: `release` is OPTIONAL on `GraphAccelerator` and is reached through a feature test. `LayoutAccelerator.release?(s: GraphSnapshot): void` is optional in `@graphty/layout` (`layout/src/simulation/types.ts:77`, under the interface's own header "every method optional (only implemented ones exist)"), so an intersection that made it REQUIRED would reject a real `createAccelerator(...)` result from `webgpu-graph-algorithms` that does not declare it -- breaking M7's `attachAccelerator` at the type level -- and, because the app injects a plain object at run time, would throw `TypeError: accelerator.release is not a function` on the SECOND freeze, inside the release path, killing the frame loop. The call site is `if (typeof acc.release === "function") { acc.release(previous); ... }`, the same idiom `LayoutManager` already uses for optional engine members (`hasDispose` / `hasGetEdgePath`, `LayoutManager.ts:12-22`).
4. PLAN DECISION: the release list runs in `Graph`, not in `DataManager`. `DataManager` has no accelerator reference and design 9.1 keeps it that way. `Graph` subscribes to `snapshot-replaced` and, when `previous !== null`, calls `accelerator.release(previous)` (behind PLAN DECISION 3's guard), then `release(dm.undirected(previous).snapshot)` when that is a DISTINCT object, then `previous.dropCaches()`. Per graph-format design 17.8 D-RESIDENCY the accelerator's `release` is keyed on `snapshot.serial` and `withColumns()` siblings share the serial, so releasing the same serial twice must be harmless -- the element does not deduplicate, and M8a's dispatcher contract says it need not.
5. PLAN DECISION: `Graph.dispose()` releases the CURRENT snapshot's list and does NOT call `accelerator.dispose()`. Design 9.4 item 2: the app owns the accelerator's lifetime and two elements may share one.
6. PLAN DECISION: the fake's simulation is deterministic and frame-count-independent: `load()` records the node count and the array, `step(k)` advances a counter by `k` and writes `positions[3i] += moveBy * k` for every index whose mask bit is CLEAR, and `settled` is `iterations >= settleAfter`. It returns `undefined` (synchronous) by default and a resolved promise when constructed with `{ async: true }`, so ONE fake exercises both the sync-CPU and the async-GPU branch of `SimulationLayoutEngine.step()`. It also exposes `reheat()`, because M6-T12 PLAN DECISION 6 feature-tests for it and M6-T14's test asserts it fired.

- [ ] **Step 1: Write the fake accelerator**

Create `EA/graphty-element/src/testing/fakeAccelerator.ts`:

```ts
import { type F32, type GraphSnapshot, maskGet, type NodeMask } from "@graphty/graph-format";
import type {
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    LayoutSimulation,
} from "@graphty/layout";

import type { GraphAccelerator } from "../types/accelerator";

/**
 * A deterministic stand-in for an injected accelerator (WebGPU design 9.4 item 8).
 *
 * It ships inside `src/` ON PURPOSE (D-M6-13): ONE implementation serves both the G6 gate tests and
 * the two Chromatic stories, so the story cannot drift from the gate. It is reachable from NEITHER
 * of the element's entry points -- the bundle's `graphty-element/index.ts` (vite.config.ts:27) nor
 * knip's `src/graphty-element.ts` -- so the published library does not carry it.
 *
 * It is NOT a physics model. Nodes move by a fixed delta per iteration, which is what makes a
 * Chromatic screenshot byte-stable; the 11.4 distributional metrics are measured against a REAL
 * accelerator in phase M7, and the G6 record says so in its section 2.
 */
export interface FakeAcceleratorOptions {
    /** Reported as `accelerator.kind`. */
    readonly kind?: string;
    /** Scene units added to each unfixed node's x per iteration. */
    readonly moveBy?: number;
    /** Iterations after which `settled` flips true. */
    readonly settleAfter?: number;
    /** When true, `step()` returns a resolved promise, exercising the async branch of the bridge. */
    readonly async?: boolean;
}

/** The spies the tests read. */
export interface FakeSimulation extends LayoutSimulation {
    readonly calls: {
        load: number;
        step: number[];
        setFixed: number;
        setPosition: [number, number, number, number][];
        reheat: number;
        dispose: number;
    };
    reheat(): void;
}

export interface FakeAccelerator extends GraphAccelerator {
    readonly kind: string;
    /** Every simulation this accelerator handed out, newest last. */
    readonly simulations: FakeSimulation[];
    readonly released: GraphSnapshot[];
    readonly disposed: { count: number };
}

class Simulation implements FakeSimulation {
    readonly calls = {
        load: 0,
        step: [] as number[],
        setFixed: 0,
        setPosition: [] as [number, number, number, number][],
        reheat: 0,
        dispose: 0,
    };

    private positions: F32 | null = null;
    private nodeCount = 0;
    private mask: NodeMask | null = null;
    private iterations = 0;

    constructor(private readonly options: Required<FakeAcceleratorOptions>) {}

    load(snapshot: GraphSnapshot, positions: F32): void {
        this.calls.load++;
        this.positions = positions;
        this.nodeCount = snapshot.nodeCount;
        this.iterations = 0;
    }

    step(iterations = 1): void | Promise<void> {
        this.calls.step.push(iterations);
        this.iterations += iterations;
        const p = this.positions;
        if (p !== null) {
            for (let i = 0; i < this.nodeCount; i++) {
                if (this.mask !== null && maskGet(this.mask, i)) {
                    continue;
                }

                p[3 * i] = (p[3 * i] ?? 0) + this.options.moveBy * iterations;
            }
        }

        return this.options.async ? Promise.resolve() : undefined;
    }

    get settled(): boolean {
        return this.iterations >= this.options.settleAfter;
    }

    setFixed(mask: NodeMask): void {
        this.calls.setFixed++;
        this.mask = mask;
    }

    setPosition(index: number, x: number, y: number, z: number): void {
        this.calls.setPosition.push([index, x, y, z]);
        const p = this.positions;
        if (p !== null) {
            p[3 * index] = x;
            p[3 * index + 1] = y;
            p[3 * index + 2] = z;
        }
    }

    reheat(): void {
        this.calls.reheat++;
        this.iterations = 0;
    }

    dispose(): void {
        this.calls.dispose++;
        this.positions = null;
    }
}

/**
 * Build a deterministic fake accelerator.
 * @param options - kind, per-iteration delta, settle point and sync/async step
 * @returns the fake, satisfying GraphAccelerator, with spies on every call
 */
export function createFakeAccelerator(options: FakeAcceleratorOptions = {}): FakeAccelerator {
    const resolved: Required<FakeAcceleratorOptions> = {
        kind: options.kind ?? "fake",
        moveBy: options.moveBy ?? 1,
        settleAfter: options.settleAfter ?? 100,
        async: options.async ?? false,
    };
    const simulations: FakeSimulation[] = [];
    const released: GraphSnapshot[] = [];
    const disposed = { count: 0 };

    const make = (): LayoutSimulation => {
        const sim = new Simulation(resolved);
        simulations.push(sim);
        return sim;
    };

    return {
        kind: resolved.kind,
        simulations,
        released,
        disposed,
        forceAtlas2: (_options?: ForceAtlas2Options) => make(),
        fruchtermanReingold: (_options?: FruchtermanReingoldOptions) => make(),
        release: (s: GraphSnapshot) => {
            released.push(s);
        },
        dispose: () => {
            disposed.count++;
        },
    } as FakeAccelerator;
}
```

The `AlgorithmAccelerator` half carries NO methods by default -- design 9.2's dispatcher contract is that only implemented methods exist, and `accelerated(acc)` falls back to the CPU per method when one is absent. M6-T16's dispatch test adds the one method it is testing on a per-case basis, by spreading: `{ ...createFakeAccelerator(), pageRank: () => fixture }`.

If `maskGet` is not the name graph-format exports for reading one bit of a `NodeMask`, use whatever the mask module exports beside `makeMask` / `maskSet` (`grep -n "export function mask" graph-format/src/**/*.ts`); the semantics needed here are "is bit i set".

- [ ] **Step 2: The type alias**

Create `EA/graphty-element/src/types/accelerator.ts`:

```ts
import type { AlgorithmAccelerator } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import type { LayoutAccelerator } from "@graphty/layout";

/**
 * What the element accepts through `Graph.setAccelerator` (WebGPU design 9.4 item 1).
 *
 * NEITHER constituent comes from `@graphty/webgpu-graph-algorithms`. No file reachable from the
 * CORE entry may import that package; per section 0.0 it is an OPTIONAL PEER and only
 * `src/webgpu.ts` (Task M6-T20) imports it, registering a factory the element itself calls. The
 * check is Task M6-T17 Step 5. Design 9.5's "the app constructs the object and injects it" is
 * superseded by `design/decisions/2026-09-19-graphty-element-owns-webgpu.md`.
 *
 * `release` is OPTIONAL, matching `LayoutAccelerator.release?` in @graphty/layout
 * (layout/src/simulation/types.ts:77): design 9.3 makes every accelerator method optional, so an
 * intersection that required it would reject a conforming implementation. Every call site feature-
 * tests it (M6-T11 PLAN DECISION 3).
 */
export type GraphAccelerator = AlgorithmAccelerator &
    LayoutAccelerator & {
        release?(s: GraphSnapshot): void;
        dispose?(): void;
    };
```

The third member of the intersection is deliberately REDUNDANT, and saying so here stops a reader treating it as a disagreement with M8a. `AlgorithmAccelerator` already ends with `release?(s: GraphSnapshot): void;` and `dispose?(): void;` (M8a Task M8a-T8's type block), and `LayoutAccelerator.release?` is optional too (`layout/src/simulation/types.ts:77`). The literal is kept because it is the element's own statement of the two lifetime methods it calls -- both feature-tested (PLAN DECISION 3) -- and because it must stay OPTIONAL in the intersection even if one constituent ever made it required. It adds no member that either package does not already declare, so it cannot narrow what a conforming accelerator has to provide.

One member the intersection DOES make required: `AlgorithmAccelerator.kind: string` is not optional (M8a Task M8a-T8), so every `GraphAccelerator` carries a `kind`. `createFakeAccelerator` sets it from `options.kind ?? "fake"`, and `webgpu-graph-algorithms`' `createAccelerator` sets it too (`src/accelerator.ts:87-117`), so both call sites satisfy it without an adapter.

- [ ] **Step 3: Write the failing test**

Create `EA/graphty-element/test/browser/accelerator-surface.test.ts`:

```ts
import { assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createTestGraph } from "../helpers/testSetup";

describe("Graph.accelerator (design 9.4 items 1 and 2)", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
    });

    it("defaults to null and is never constructed by the element", () => {
        assert.strictEqual(graph.accelerator, null);
        assert.strictEqual(graph.getAccelerator(), null);
    });

    it("emits accelerator-changed with previous and next, and is subscribable", () => {
        const seen: { previous: unknown; next: unknown }[] = [];
        assert.doesNotThrow(() => {
            graph.eventManager.addListener("accelerator-changed", (evt) => {
                if (evt.type === "accelerator-changed") {
                    seen.push({ previous: evt.previous, next: evt.next });
                }
            });
        });
        const fake = createFakeAccelerator();
        graph.setAccelerator(fake);
        assert.strictEqual(seen.length, 1);
        assert.strictEqual(seen[0]?.previous, null);
        assert.strictEqual(seen[0]?.next, fake);
        graph.setAccelerator(null);
        assert.strictEqual(seen.length, 2);
        assert.strictEqual(seen[1]?.previous, fake);
        assert.strictEqual(seen[1]?.next, null);
    });

    it("releases the superseded snapshot exactly once per freeze", async () => {
        const fake = createFakeAccelerator();
        graph.setAccelerator(fake);
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        const dm = graph.getDataManager();
        const first = dm.getSnapshot();
        assert.strictEqual(fake.released.length, 0, "there was no previous snapshot to release");
        await graph.addNodes([{ id: "c" }]);
        dm.getSnapshot();
        assert.strictEqual(fake.released.includes(first), true, "the superseded snapshot was released");
    });

    it("does not throw for an accelerator that omits the optional release", async () => {
        // design 9.3: every accelerator method is optional. layout/src/simulation/types.ts:77 types
        // release as `release?`, so a real GPU accelerator may legitimately not have one.
        const { release: _release, ...withoutRelease } = createFakeAccelerator();
        graph.setAccelerator(withoutRelease as typeof _release extends never ? never : never extends never
            ? Parameters<typeof graph.setAccelerator>[0]
            : never);
        await graph.addNodes([{ id: "a" }]);
        graph.getDataManager().getSnapshot();
        await graph.addNodes([{ id: "b" }]);
        assert.doesNotThrow(() => graph.getDataManager().getSnapshot());
    });

    it("dispose() releases but never disposes the accelerator (the app owns its lifetime)", async () => {
        const fake = createFakeAccelerator();
        graph.setAccelerator(fake);
        await graph.addNodes([{ id: "a" }]);
        graph.getDataManager().getSnapshot();
        graph.dispose();
        assert.strictEqual(fake.disposed.count, 0, "design 9.4 item 2: two elements may share one accelerator");
    });
});
```

The fourth case's cast is awkward on purpose; if it reads badly, replace it with a hand-written object literal that omits `release`:
`const withoutRelease = { kind: "no-release", forceAtlas2: () => createFakeAccelerator().forceAtlas2!() };`
What matters is that `setAccelerator` accepts a value with no `release` AND that a second freeze does not throw.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/accelerator-surface.test.ts`
Expected: FAIL, 5 cases -- `accelerator` is not a property of `Graph` and `addListener("accelerator-changed", ...)` throws `TypeError: Unknown event type` at `EventManager.ts:449-450`. Vitest reports `1 file`, not "No test files found": if it reports the latter, the file is in the wrong directory (see the "Why `test/browser/`" note above).

- [ ] **Step 4: The field, the setter, the event, the release list.** `setAccelerator` stores the value, emits, and does nothing else -- `LayoutManager` reacts to the event (M6-T12), and algorithm runs read `graph.accelerator` per call, so no re-run is triggered. The `snapshot-replaced` subscription is registered in the same place `Graph` registers its other listeners, and its body is:

```ts
        const acc = this.accelerator;
        if (acc !== null && event.previous !== null) {
            if (typeof acc.release === "function") {
                acc.release(event.previous);
                const undirected = this.dataManager.undirected(event.previous).snapshot;
                if (undirected !== event.previous) {
                    acc.release(undirected);
                }
            }

            event.previous.dropCaches();
        }
```

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/accelerator-surface.test.ts`
Expected: PASS, 5 cases.

- [ ] **Step 5: Checkpoint** -- no commit; ASCII clean. `src/testing/fakeAccelerator.ts` and `src/types/accelerator.ts` are untracked, `src/Graph.ts`, `src/events.ts` and `src/managers/EventManager.ts` are modified, and one new test file is untracked.

### Task M6-T12: The `SimulationLayoutEngine` bridge

**Repository:** `EA`. Size: 2-3 ed. Design 9.4 item 4; design 7.19 for the frame-loop contract.

**Files:**
- Create: `graphty-element/src/layout/SimulationLayoutEngine.ts`
- Modify: `graphty-element/src/managers/LayoutManager.ts:108-225` (construct the bridge for a `SimulationType`), new (react to `accelerator-changed`). NOTE: `LayoutManager.ts` is edited again by M6-T13 and M6-T15, and was edited by M6-T10; none of these may run concurrently.
- Modify: `graphty-element/src/managers/UpdateManager.ts:203-214` (call `step()` ONCE for a simulation)
- Test: `graphty-element/test/browser/simulation-layout-engine.test.ts`

**Why `test/browser/` and not `test/managers/`:** the `browser` vitest project's `include` names its `test/managers/*.test.ts` files INDIVIDUALLY by path (`graphty-element/vitest.config.ts:63-67`), so a new file under `test/managers/` would match zero files there and would instead be picked up by the `default` project's `test/**/*.test.ts` include and run in Node without a DOM. `test/browser/**/*.test.ts` is the browser project's first include (`:61`) and is excluded from `default` (`:29`), so this path routes correctly with no config change.

**Interfaces:**
- Consumes: `@graphty/layout`: `createSimulation`, `type LayoutSimulation`, `type SimulationType`, `type ForceAtlas2Options`, `type FruchtermanReingoldOptions`; `@graphty/graph-format`: `makeMask`, `maskSet`, `type Column`, `type NodeMask`, `type FreezeReport`, `type GraphSnapshot`; `createFakeAccelerator` (M6-T11) for the tests; `simulationOptions(layoutOpts, behaviorLayout)` (M6-T13 -- see Step 3's note on the ordering).
- Produces: `class SimulationLayoutEngine extends LayoutEngine` with `init`, `addNode`, `addEdge`, `get nodes`, `get edges`, `get type`, `load`, `reload`, `step`, `stepAsync(iterations: number): Promise<void>`, `reheat(): void`, `pin`, `unpin`, `setNodePosition`, `beginDrag`, `endDrag`, `getNodePosition`, `getNodePositionInto`, `getEdgePosition`, `get isSettled`, `dispose`, and `static isSimulationType(type: string): type is SimulationType`; plus the `SimulationHost` interface.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `LayoutManager._setLayoutInternal` SPECIAL-CASES simulation types and constructs the bridge itself; the registry is not changed. `LayoutEngine.get(type, opts)` is `new SourceClass(opts)` with no third argument and the registry stores classes (`LayoutEngine.ts:18-19`, `:111-118`), so a bridge that needs `graph.accelerator` at construction cannot come through it. A factory form would touch all 16 registrations (`src/layout/index.ts:19-34`) and every engine constructor for one caller's benefit. Design 9.4 item 4 asks for the special case by name. See D-M6-12. `ForceAtlas2Layout` and `SpringLayout` REMAIN registered (M6-T13 keeps their zod schemas as the validation surface); the branch is `if (SimulationLayoutEngine.isSimulationType(type) && this.useSimulation(type))`.
2. PLAN DECISION: `step()` is fire-and-forget with the `.catch` attached ONCE per DISTINCT promise, exactly as design 9.4 item 4's sketch has it. A GPU `step()` returns the OLDEST pending promise when saturated (design 7.19 item 3), so a per-frame `.catch` would fire `onError` once per frame for one failure. The bridge remembers the last promise it saw and compares by identity.
3. PLAN DECISION: the bridge ALSO exposes `stepAsync(iterations): Promise<void>`, which is the AWAITABLE form the pre-step loop needs (M6-T13 PLAN DECISION 4). It exists because the abstract base declares `abstract step(): void` (`LayoutEngine.ts:56`) -- no iteration count, no return value -- so the pre-step loop cannot get a promise or a batch size out of `step()` no matter how the bridge implements it. `stepAsync` is NOT on the abstract class; `LayoutManager` reaches it through the feature test `"stepAsync" in engine`, which keeps the 15 non-simulation engines on the existing synchronous loop. Its body is `await this.sim.step(iterations)`, wrapped so a synchronous `void` return becomes a resolved promise:

```ts
    /**
     * Run `iterations` iterations and RESOLVE when they are done, for the pre-step loop.
     *
     * `step()` cannot serve this: the abstract base declares it `step(): void` (LayoutEngine.ts:56),
     * so it takes no count and returns nothing awaitable. Callers reach this through the feature test
     * `"stepAsync" in engine`; every other engine keeps the synchronous loop.
     * @param iterations - iterations for this batch; the caller chunks at MAX_ITERATIONS_PER_STEP
     * @returns a promise that resolves when the batch has run
     */
    async stepAsync(iterations: number): Promise<void> {
        await this.sim.step(iterations);
        this.positionColumn?.markDirty();
    }
```

4. PLAN DECISION: the bridge implements `getEdgePosition(e): EdgePosition` and returns a REUSED pair of objects, documented as "valid until the next call". Design 9.4 item 4's sketch omits the method entirely, and `Edge.update()` returns early when it yields nothing (`Edge.ts:301-305`) -- so a bridge without it silently stops every edge tracking its endpoints, with no error. 14.4 rule 7's `getEdgePositionsInto(e, outSrc, outDst)` is not added (DEP-M6-F): the reuse gets the same zero-allocation result without a second entry point, and the two objects are distinct, so source and destination cannot alias.
5. PLAN DECISION: `applyPins()` rebuilds the mask from `dm.nodes` by `n.pinned` AFTER any remap, never from a stale index-keyed mask. `makeMask(nodeCount)` then `maskSet(mask, n.index, true)` for every pinned node, then `sim.setFixed(mask)`. This is what makes G6's "pin A, remove B < A, freeze, reload -> A still fixed" pass: `Node.index` has already been walked through `report.nodeRemap` by `DataManager.walkNodeRemap` (M6-T6) before `reload` runs.
6. PLAN DECISION: `reheat()` on the bridge reaches the simulation through a feature test, `if ("reheat" in this.sim && typeof this.sim.reheat === "function")`, and is a no-op otherwise. `reheat()` is PUBLIC on `ForceAtlas2Simulation` (`layout/src/simulation/forceatlas2.ts:681`) but is NOT a member of the `LayoutSimulation` interface (`layout/src/simulation/types.ts:57-70`), and a GPU simulation may or may not expose it. A hard call would not compile; an unchecked cast would throw on an accelerator that omits it. The bridge method itself is unconditional -- M6-T14's `Graph.setRunning(true)` calls `engine.reheat()` behind its own `"reheat" in engine` guard, and the guard inside the bridge is about the SIMULATION, not about the engine.
7. PLAN DECISION: `addNode`, `addEdge`, `get nodes` and `get edges` are implemented as deliberate no-ops / delegations, NOT omitted. All four are `abstract` on the base class (`LayoutEngine.ts:51-52`, `:60-61`), so a class without them does not compile. `LayoutManager._setLayoutInternal` also calls `engine.addNodes(nodeArray); engine.addEdges(edgeArray);` (`LayoutManager.ts:147-148`) BEFORE this task's new `load()` call, and the base `addNodes` / `addEdges` loop over `addNode` / `addEdge` -- so the bridge WILL receive them and must ignore them on purpose: the snapshot is the node and edge source (14.4 rule 7), and a bridge that also kept a list would have two sources of truth to keep in sync across a remap. `get type()` is overridden for the same class of reason: the inherited one reads `(this.constructor as typeof LayoutEngine).type` (`LayoutEngine.ts:89-90`), which is `undefined` for a class the registry never registered.

- [ ] **Step 1: Write the failing tests**

Create `EA/graphty-element/test/browser/simulation-layout-engine.test.ts`. The five G6 cases plus the bridge's own three unit cases. `createFakeAccelerator` already exists (M6-T11), so every assertion below is reachable at the step where it is written; what is still missing at THIS step is the bridge and its `LayoutManager` wiring.

```ts
import { assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createTestGraph } from "../helpers/testSetup";

function engineOf(graph: Graph): SimulationLayoutEngine {
    const engine = graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    return engine as SimulationLayoutEngine;
}

describe("SimulationLayoutEngine (design 9.4 item 4)", () => {
    let graph: Graph;
    let fake: FakeAccelerator;

    beforeEach(async () => {
        graph = await createTestGraph();
        fake = createFakeAccelerator({ settleAfter: 10 });
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await graph.addEdges([{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
    });

    it("G6 case 1: late injection engages a layout that is already running", async () => {
        await graph.setLayout("forceatlas2");
        assert.strictEqual(fake.simulations.length, 0, "no accelerator yet: the CPU engine is in place");
        graph.setAccelerator(fake);
        assert.strictEqual(fake.simulations.length, 1, "accelerator-changed rebuilt the engine");
        assert.strictEqual(fake.simulations[0]?.calls.load, 1);
        assert.strictEqual(graph.isRunning(), true, "running survived the swap");
    });

    it("G6 case 2: removing the accelerator mid-run keeps positions and pins", async () => {
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        const dm = graph.getDataManager();
        dm.positions.write(0, 11, 12, 13);
        dm.nodes.get("a")!.pin();
        graph.setAccelerator(null);
        const out = { x: 0, y: 0, z: 0 };
        dm.positions.read(0, out);
        assert.deepStrictEqual(out, { x: 11, y: 12, z: 13 }, "the array is element-owned, so nothing moved");
        assert.strictEqual(dm.nodes.get("a")?.isPinned(), true, "pin state is on Node, not in the engine");
    });

    it("G6 case 3: a pin survives a compacting remap", async () => {
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        const dm = graph.getDataManager();
        dm.nodes.get("c")!.pin();
        const indexBefore = dm.nodes.get("c")!.index;
        await graph.removeNode("a");
        dm.getSnapshot(); // the lazy freeze; renumbers and fires snapshot-replaced -> reload
        const indexAfter = dm.nodes.get("c")!.index;
        assert.notStrictEqual(indexAfter, indexBefore, "the freeze renumbered c");
        const sim = fake.simulations[fake.simulations.length - 1]!;
        assert.isAtLeast(sim.calls.setFixed, 1, "applyPins re-ran after the reload");
        assert.strictEqual(dm.nodes.get("c")?.isPinned(), true);
    });

    it("G6 case 4: gpuMinNodes above the node count keeps the CPU engine until a reload crosses it", async () => {
        graph.styles.config.behavior.layout.gpuMinNodes = 10;
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        assert.strictEqual(fake.simulations.length, 0, "3 nodes is under gpuMinNodes");
        await graph.addNodes(Array.from({ length: 12 }, (_, i) => ({ id: `extra-${i}` })));
        graph.getDataManager().getSnapshot();
        assert.strictEqual(fake.simulations.length, 1, "the reload crossed the threshold");
    });

    it("G6 case 5: setRunning(false) stops submitting; setRunning(true) reheats", async () => {
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        const sim = fake.simulations[0]!;
        const engine = engineOf(graph);
        engine.step();
        const stepsAfterOne = sim.calls.step.length;
        graph.setRunning(false);
        for (let i = 0; i < 100; i++) {
            graph.getUpdateManager().updateLayout();
        }

        assert.strictEqual(sim.calls.step.length, stepsAfterOne, "paused means the caller stops calling step()");
        graph.setRunning(true);
        assert.strictEqual(sim.calls.reheat, 1, "play visibly restarts a settled simulation (9.4 item 9)");
    });

    it("getEdgePosition returns TWO distinct reused objects", async () => {
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        const engine = engineOf(graph);
        const edge = [...graph.getDataManager().edges.values()][0]!;
        const p = engine.getEdgePosition(edge);
        assert.notStrictEqual(p.src, p.dst, "src and dst must not alias (DEP-M6-F)");
        const again = engine.getEdgePosition(edge);
        assert.strictEqual(again.src, p.src, "the pair is reused, not reallocated per frame");
    });

    it("attaches one .catch per DISTINCT promise, not per frame", async () => {
        const asyncFake = createFakeAccelerator({ async: true });
        graph.setAccelerator(asyncFake);
        await graph.setLayout("forceatlas2");
        const engine = engineOf(graph);
        let errors = 0;
        graph.eventManager.addListener("error", (evt) => {
            if (evt.type === "error" && evt.context === "layout") {
                errors++;
            }
        });
        const sim = asyncFake.simulations[0]!;
        const rejection = Promise.reject(new Error("device lost"));
        sim.step = () => rejection;
        engine.step();
        engine.step();
        engine.step();
        await new Promise((resolve) => setTimeout(resolve, 10));
        assert.strictEqual(errors, 1, "three frames, one failure, one error event");
    });

    it("reload re-applies the pin mask", async () => {
        graph.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        const sim = fake.simulations[0]!;
        const before = sim.calls.setFixed;
        graph.getDataManager().nodes.get("b")!.pin();
        await graph.addNodes([{ id: "d" }]);
        graph.getDataManager().getSnapshot();
        const latest = fake.simulations[fake.simulations.length - 1]!;
        assert.isAtLeast(latest === sim ? latest.calls.setFixed - before : latest.calls.setFixed, 1);
    });
});
```

`graph.getUpdateManager()` / `graph.getLayoutManager()` are the accessor names to confirm against `Graph.ts` before writing; if the manager is reached differently in this code base, use whatever the neighbouring `test/managers/UpdateManager.test.ts` uses. The ASSERTIONS are the contract.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts`
Expected: FAIL, 8 cases, `Cannot find module '../../src/layout/SimulationLayoutEngine'`. Vitest reports `1 file`; "No test files found" means the file is in the wrong directory.

- [ ] **Step 2: Write the bridge**

```ts
export class SimulationLayoutEngine extends LayoutEngine {
    private pending: Promise<void> | null = null;
    private mask: NodeMask | null = null;
    private positions: ElementPositions | null = null;
    private positionColumn: Column | null = null;
    private readonly srcScratch = { x: 0, y: 0, z: 0 };
    private readonly dstScratch = { x: 0, y: 0, z: 0 };

    constructor(
        private readonly layoutType: string,
        private readonly opts: Record<string, unknown>,
        private readonly sim: LayoutSimulation,
        private readonly host: SimulationHost,
    ) {
        super();
    }

    /**
     * The inherited getter reads `(this.constructor as typeof LayoutEngine).type`
     * (LayoutEngine.ts:89-90), which is `undefined` for a class the registry never registered.
     * @returns the layout type this bridge was constructed for
     */
    get type(): string {
        return this.layoutType;
    }

    async init(): Promise<void> {
        // nothing: load() happens in _setLayoutInternal, after getSnapshot()
    }

    /**
     * Required by the abstract base (LayoutEngine.ts:51) and deliberately ignored: the SNAPSHOT is
     * the node source (14.4 rule 7). LayoutManager still calls addNodes() before load()
     * (LayoutManager.ts:147), so this IS reached; keeping a second node list here would give the
     * bridge two things to remap instead of one.
     * @param _n - ignored
     */
    addNode(_n: Node): void {
        // intentionally empty
    }

    /**
     * Required by the abstract base (LayoutEngine.ts:52) and deliberately ignored, for the reason on
     * addNode: the snapshot's CSR is the edge source.
     * @param _e - ignored
     */
    addEdge(_e: Edge): void {
        // intentionally empty
    }

    /** @returns the host's live node collection; the bridge holds no list of its own. */
    get nodes(): Iterable<Node> {
        return this.host.nodes();
    }

    /** @returns the host's live edge collection; the bridge holds no list of its own. */
    get edges(): Iterable<Edge> {
        return this.host.edges();
    }

    load(snapshot: GraphSnapshot, positions: ElementPositions): void {
        this.positions = positions;
        this.positionColumn = snapshot.nodes.byRole("position");
        this.sim.load(snapshot, positions.view(snapshot.nodeCount));
        this.applyPins(snapshot.nodeCount);
    }

    reload(snapshot: GraphSnapshot, _report: FreezeReport, positions: ElementPositions): void {
        // load(next) is the topology-change path (design 7.19): the simulation bumps its generation
        // so in-flight readbacks are discarded rather than copied into a remapped array.
        this.load(snapshot, positions);
    }

    step(): void {
        const r = this.sim.step(this.host.iterationsPerStep()) as void | Promise<void>;
        if (r !== undefined && r !== this.pending) {
            this.pending = r;
            void r.catch((err: unknown) => this.host.onError(err));
        }

        this.positionColumn?.markDirty();
    }

    /**
     * Run `iterations` iterations and RESOLVE when they are done, for the pre-step loop.
     *
     * `step()` cannot serve this: the abstract base declares it `step(): void` (LayoutEngine.ts:56),
     * so it takes no count and returns nothing awaitable. Callers reach this through the feature test
     * `"stepAsync" in engine`; every other engine keeps the synchronous loop.
     * @param iterations - iterations for this batch; the caller chunks at MAX_ITERATIONS_PER_STEP
     * @returns a promise that resolves when the batch has run
     */
    async stepAsync(iterations: number): Promise<void> {
        await this.sim.step(iterations);
        this.positionColumn?.markDirty();
    }

    /**
     * Restart a settled simulation (design 9.4 item 9). `reheat` is public on ForceAtlas2Simulation
     * (layout/src/simulation/forceatlas2.ts:681) but is NOT on the LayoutSimulation interface
     * (layout/src/simulation/types.ts:57-70), so a GPU simulation may not have it.
     */
    reheat(): void {
        const sim = this.sim as LayoutSimulation & { reheat?: () => void };
        if (typeof sim.reheat === "function") {
            sim.reheat();
        }
    }

    get isSettled(): boolean {
        return this.sim.settled;
    }
}
```

with `pin` / `unpin` setting the mask bit and calling `setFixed`, `setNodePosition(n, p)` calling `sim.setPosition(n.index, p.x, p.y, p.z ?? 0)`, `beginDrag(n)` / `endDrag(n, pin)` setting and clearing the same bit, `getNodePositionInto(index, out)` reading `this.positions`, `getNodePosition(n)` filling and returning `srcScratch`, `getEdgePosition(e)` filling both scratches and returning `{ src: this.srcScratch, dst: this.dstScratch }`, `dispose()` calling `sim.dispose()`, and `applyPins(nodeCount)` doing `makeMask(nodeCount)` plus one `maskSet(mask, n.index, true)` per `host.pinnedNodes()` before `sim.setFixed(mask)`.

`SimulationHost` is the small interface `LayoutManager` implements for the bridge: `{ nodes(): Iterable<Node>; edges(): Iterable<Edge>; pinnedNodes(): Iterable<Node>; iterationsPerStep(): number; onError(err: unknown): void }`. It exists so the bridge never imports `LayoutManager` or `Graph` and stays unit-testable.

- [ ] **Step 3: `LayoutManager` constructs it and reacts to `accelerator-changed`.** In `_setLayoutInternal`, when `SimulationLayoutEngine.isSimulationType(type)` and `gpuMinNodes` allows it, build

```ts
const sim = createSimulation(type, simulationOptions(layoutOpts, this.styles.config.behavior.layout), this.graph.accelerator);
const engine = new SimulationLayoutEngine(type, layoutOpts, sim, this.simulationHost());
```

and wrap it. NOTE ON ORDER: `simulationOptions(layoutOpts, behaviorLayout)` is written by Task M6-T13 Step 2 and takes TWO arguments -- the element's layout option bag and `behavior.layout`, because `iterationsPerStep` and `maxInFlight` live in the latter. Until M6-T13 lands, write this call against that two-argument signature and stub the helper in `LayoutManager` as `const simulationOptions = (o: Record<string, unknown>, b: { iterationsPerStep?: number; stepMultiplier?: number; maxInFlight?: number }) => ({ ...o, iterationsPerStep: b.iterationsPerStep ?? b.stepMultiplier, maxInFlight: b.maxInFlight }) as ForceAtlas2Options;` -- M6-T13 Step 2 replaces the stub with the real mapping table and deletes this note.

On `accelerator-changed`, when the ACTIVE engine is a `SimulationLayoutEngine` (or when the node count now crosses `gpuMinNodes`): dispose it, re-create through `createSimulation(type, simulationOptions(...), next)`, `load(dm.undirected(dm.getSnapshot()).snapshot, dm.positions)`, re-apply pins, and keep `running` as it was. Coordinates survive because the array is element-owned.

- [ ] **Step 4: `UpdateManager.updateLayout()` branches.** Today it loops `stepMultiplier` times (`UpdateManager.ts:207-211`). Add: when the active engine is a `SimulationLayoutEngine`, call `this.layoutManager.step()` ONCE. Reason (design 9.4 item 4): a GPU `step()` coalesces above `maxInFlight`, so `stepMultiplier` calls would return the same promise `stepMultiplier - 1` times; a CPU simulation runs `iterationsPerStep` iterations synchronously inside one call. The `stepMultiplier` value is not lost -- it becomes `iterationsPerStep` (M6-T13).

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts`
Expected: 6 of the 8 cases PASS -- G6 cases 1, 2 and 3 and all three bridge unit cases (`getEdgePosition`, the one-`.catch`-per-promise case, `reload` re-applies pins). Two stay RED and are expected to:

| Case | Red until | Why |
| --- | --- | --- |
| G6 case 4, `gpuMinNodes` | M6-T13 Step 2 | `behavior.layout.gpuMinNodes` does not exist on `GraphLayoutOpts` yet, so the assignment throws under `z.strictObject` |
| G6 case 5, `setRunning` / `reheat` | M6-T14 Step 2 | `Graph.setRunning(true)` does not call `engine.reheat()` yet |

M6-T17 Step 2 is where all 8 are green together.

- [ ] **Step 5: Checkpoint** -- no commit; ASCII clean.

### Task M6-T13: `forceatlas2` and `spring` on the bridge; the three `behavior.layout` knobs

**Repository:** `EA`. Size: 2-3 ed. Design 9.4 items 6 and 7.

**Files:**
- Modify: `graphty-element/src/layout/ForceAtlas2LayoutEngine.ts:99-115` (the validation schema), `graphty-element/src/layout/SpringLayoutEngine.ts:58-68`
- Modify: `graphty-element/src/config/GraphBehavior.ts:12-18` (three fields)
- Modify: `graphty-element/src/managers/LayoutManager.ts:157-165` (`preSteps` under an async step) and the `simulationOptions` stub M6-T12 Step 3 left there. NOTE: `LayoutManager.ts` is edited again by M6-T15 and was edited by M6-T10 and M6-T12; none of these may run concurrently.
- Modify: `graphty-element/stories/Layout.stories.ts:103-107` (the `fa2Gravity` control's `min` stays 0; a comment records that the schema now accepts it)
- Test: `graphty-element/test/layout/simulation-options.test.ts` (new, node project -- `test/layout/` is not excluded from `default`, and nothing in this file needs a DOM)

**Interfaces:**
- Consumes: `@graphty/layout`: `type ForceAtlas2Options`, `type FruchtermanReingoldOptions`, `type SimulationOptions`, `type CommonLayoutOptions`; `@graphty/graph-format`: `makeMask`, `maskSet`, `type NodeMask`; `SimulationLayoutEngine.stepAsync` (M6-T12 PLAN DECISION 3).
- Produces: `behavior.layout.iterationsPerStep?: number`, `behavior.layout.maxInFlight: number` (default 2), `behavior.layout.gpuMinNodes: number` (default 0); `ForceAtlas2LayoutConfig.gravity: z.number().nonnegative()`; and `simulationOptions(layoutOpts, behaviorLayout): ForceAtlas2Options | FruchtermanReingoldOptions`, the one place the element's option names are mapped onto the layout package's.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `scalingFactor` becomes the simulation's `scale`, and where a layout already has BOTH -- Spring has `scalingFactor` from `SimpleLayoutConfig.shape` (default 100) AND its own `scale: z.number().positive().default(1)` (`SpringLayoutEngine.ts:64`) -- `scale` WINS and `scalingFactor` is passed through as a post-multiplier of 1. Reason: `scale` is already a layout PARAMETER handed to `springLayout` (`SpringLayoutEngine.ts:103-119`), which is exactly what `CommonLayoutOptions.scale` is; `scalingFactor` is a render-time multiplier applied after the layout ran (`LayoutEngine.ts:266`, `:352-365`). Collapsing them the other way would silently multiply every Spring story by 100. For ForceAtlas2, which has only `scalingFactor` (there is no `scale` in `ForceAtlas2LayoutConfig`), `scalingFactor` IS the `scale`. This is a semantic change, not a rename: identical option values do not reproduce identical pictures, so the FA2 and Spring stories in BOTH `Layout.stories.ts` and `Layout2D.stories.ts` move and are re-baselined by Task M6-T18.
2. PLAN DECISION: `gravity` loosens from `z.number().positive()` to `z.number().nonnegative()` in `ForceAtlas2LayoutConfig` (`ForceAtlas2LayoutEngine.ts:105`). This fixes a LIVE bug, not just a GPU constraint: the Storybook control is `{ type: "range", min: 0, max: 10, step: 0.1 }` (`stories/Layout.stories.ts:103-107`), so a user who drags the slider to its own minimum gets a zod throw TODAY, which `_setLayoutInternal` catches and rewraps as `Failed to initialize layout 'forceatlas2': ...` (`LayoutManager.ts:188-213`). Design 9.4 item 6 asks for the loosening and cites those exact story lines. `NGraphEngine`'s UI schema already defaults `gravity` to `-1.2` (`NGraphLayoutEngine.ts:39`), so negative gravity is a real concept elsewhere; `nonnegative` rather than unconstrained is the minimum change that unbreaks the slider without inventing FA2 repulsion-gravity semantics.
3. PLAN DECISION: `iterationsPerStep` is `z.number().int().positive().optional()` on `GraphLayoutOpts` and is resolved as `opts.iterationsPerStep ?? opts.stepMultiplier` AT THE READ SITE. Design 9.4 item 7 says "default = `stepMultiplier`", which zod cannot express as a field default on a flat `z.strictObject` -- `GraphLayoutOpts` (`GraphBehavior.ts:12-18`) has no access to a sibling's parsed value inside a `.default()`. The alternatives are a `.transform()` on the whole object (which changes `GraphBehaviorOpts`'s inferred type for every existing reader) or a `.superRefine()` (which cannot write). The read site is `LayoutManager`'s `SimulationHost.iterationsPerStep()`, one place. `maxInFlight: z.number().int().positive().default(2)` and `gpuMinNodes: z.number().int().nonnegative().default(0)` are plain defaults. `z.strictObject` means no other file changes for validation, and it also means a template that misspells one of the three throws rather than silently ignoring it.
4. PLAN DECISION: `preSteps` becomes ONE awaited `engine.stepAsync(k)` per chunk of at most 256 iterations, for a SIMULATION engine only. The reason is the bound, not the stories: a GPU simulation rejects `k` outside `[1, MAX_ITERATIONS_PER_STEP]` with `E_INVALID_ARGUMENT`, and `MAX_ITERATIONS_PER_STEP` is 256 (`webgpu-graph-algorithms/src/constants.ts:50`, enforced at `src/layouts/force-simulation.ts:1026-1032`), so `sim.step(preSteps)` is simply invalid for any `preSteps > 256`; and one awaited round trip per ITERATION would be `preSteps` round trips where 256 iterations cost one. The loop:

```ts
        const { preSteps } = this.styles.config.behavior.layout;
        const engine = this.layoutEngine;
        if (engine !== null && "stepAsync" in engine) {
            const simulation = engine as LayoutEngine & { stepAsync(k: number): Promise<void> };
            for (let done = 0; done < preSteps && !simulation.isSettled; done += MAX_PRE_STEP_CHUNK) {
                await simulation.stepAsync(Math.min(MAX_PRE_STEP_CHUNK, preSteps - done));
            }
        } else {
            for (let i = 0; i < preSteps; i++) {
                if (engine?.isSettled) {
                    break;
                }

                engine?.step();
            }
        }
```

with `const MAX_PRE_STEP_CHUNK = 256;` beside it, carrying the `webgpu-graph-algorithms/src/constants.ts:50` citation in a comment. The `else` branch is today's loop, byte for byte, so the 15 non-simulation engines are untouched -- which matters because every layout story in the repository today takes it: the stories that set a large `preSteps` are `ngraph` and `d3` stories (`stories/NodeStyles.stories.ts:42`, `:73`, `:88`, `:101`, `:115` set `preSteps: 8000` for ngraph physics; `stories/Layout.stories.ts:257` sets `preSteps: isChromatic() ? 15000 : 200` for the D3 story), and neither `ngraph` nor `d3` is a `SimulationType`. The FA2 and Spring stories set no `preSteps` at all and take the `helpers.ts:303` default of `isChromatic() ? 2000 : 0`. **The new branch is therefore exercised by NO story, which is why Step 1 tests it directly** -- that test is R-M6-8's only evidence.
5. PLAN DECISION: `graph-settled` is NOT gated on an in-flight batch. See D-M6-14 and DEP-M6-E. `Graph.ts:547-549` keeps its exact shape. The residual risk -- a screenshot one readback stale -- is R-M6-7, and design 7.19 already accepts it ("Positions the renderer draws lag the simulation by one batch, invisible for a settling layout").

- [ ] **Step 1: Write the failing tests**

Create `EA/graphty-element/test/layout/simulation-options.test.ts`:

```ts
import { assert, describe, it } from "vitest";

import { GraphBehavior } from "../../src/config/GraphBehavior";
import { ForceAtlas2LayoutConfig } from "../../src/layout/ForceAtlas2LayoutEngine";
import { simulationOptions } from "../../src/managers/LayoutManager";
import { SpringLayoutConfig } from "../../src/layout/SpringLayoutEngine";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";

describe("the three behavior.layout knobs (design 9.4 item 7)", () => {
    it("iterationsPerStep is undefined by default and resolves to stepMultiplier at the read site", () => {
        const parsed = GraphBehavior.parse({});
        assert.strictEqual(parsed.layout.iterationsPerStep, undefined);
        const resolved = parsed.layout.iterationsPerStep ?? parsed.layout.stepMultiplier;
        assert.strictEqual(resolved, parsed.layout.stepMultiplier);
    });

    it("maxInFlight defaults to 2 and gpuMinNodes to 0", () => {
        const parsed = GraphBehavior.parse({});
        assert.strictEqual(parsed.layout.maxInFlight, 2);
        assert.strictEqual(parsed.layout.gpuMinNodes, 0);
    });

    it("an unknown behavior.layout key throws, because it is a strictObject", () => {
        assert.throws(() => GraphBehavior.parse({ layout: { iterationsPerSetp: 4 } }));
    });
});

describe("the option mapping (design 9.4 item 6)", () => {
    it("gravity: 0 parses, which is the Storybook slider's own minimum", () => {
        assert.doesNotThrow(() => ForceAtlas2LayoutConfig.parse({ gravity: 0 }));
    });

    it("for ForceAtlas2, scalingFactor IS the simulation's scale", () => {
        const opts = ForceAtlas2LayoutConfig.parse({ scalingFactor: 7 });
        const mapped = simulationOptions(opts, GraphBehavior.parse({}).layout);
        assert.strictEqual(mapped.scale, 7);
    });

    it("for Spring, an explicit scale WINS over scalingFactor", () => {
        const opts = SpringLayoutConfig.parse({ scale: 3, scalingFactor: 100 });
        const mapped = simulationOptions(opts, GraphBehavior.parse({}).layout);
        assert.strictEqual(mapped.scale, 3, "scale is the layout parameter; scalingFactor is a render multiplier");
    });

    it("carries iterationsPerStep and maxInFlight from behavior.layout, not from layoutOptions", () => {
        const behavior = GraphBehavior.parse({ layout: { stepMultiplier: 5, maxInFlight: 4 } }).layout;
        const mapped = simulationOptions(ForceAtlas2LayoutConfig.parse({}), behavior);
        assert.strictEqual(mapped.iterationsPerStep, 5, "the stepMultiplier fallback of PLAN DECISION 3");
        assert.strictEqual(mapped.maxInFlight, 4);
    });

    it("drops pos, which has no counterpart in the simulation options", () => {
        const mapped = simulationOptions(
            ForceAtlas2LayoutConfig.parse({ pos: { a: [1, 2, 3] } }),
            GraphBehavior.parse({}).layout,
        );
        assert.strictEqual("pos" in mapped, false);
    });
});

describe("the pre-step loop under an async step (PLAN DECISION 4, risk R-M6-8)", () => {
    it("chunks preSteps at 256 and stops early when the simulation settles", async () => {
        const fake = createFakeAccelerator({ settleAfter: 1_000_000 });
        const sim = fake.forceAtlas2!({});
        const engine = new SimulationLayoutEngine("forceatlas2", {}, sim, {
            nodes: () => [],
            edges: () => [],
            pinnedNodes: () => [],
            iterationsPerStep: () => 1,
            onError: () => undefined,
        });
        const MAX_PRE_STEP_CHUNK = 256;
        const preSteps = 700;
        for (let done = 0; done < preSteps && !engine.isSettled; done += MAX_PRE_STEP_CHUNK) {
            await engine.stepAsync(Math.min(MAX_PRE_STEP_CHUNK, preSteps - done));
        }

        assert.deepStrictEqual(fake.simulations[0]?.calls.step, [256, 256, 188], "three batches, never one of 700");
    });

    it("breaks as soon as isSettled flips", async () => {
        const fake = createFakeAccelerator({ settleAfter: 256 });
        const sim = fake.forceAtlas2!({});
        const engine = new SimulationLayoutEngine("forceatlas2", {}, sim, {
            nodes: () => [],
            edges: () => [],
            pinnedNodes: () => [],
            iterationsPerStep: () => 1,
            onError: () => undefined,
        });
        const MAX_PRE_STEP_CHUNK = 256;
        const preSteps = 15000;
        for (let done = 0; done < preSteps && !engine.isSettled; done += MAX_PRE_STEP_CHUNK) {
            await engine.stepAsync(Math.min(MAX_PRE_STEP_CHUNK, preSteps - done));
        }

        assert.deepStrictEqual(fake.simulations[0]?.calls.step, [256], "one batch, then settled");
    });
});
```

If `ForceAtlas2LayoutConfig` / `SpringLayoutConfig` are not exported by name today, export them -- they are zod schemas and the element already exports `SimpleLayoutConfig` from the same layer.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=default test/layout/simulation-options.test.ts`
Expected: FAIL on the first eight -- the three `behavior.layout` fields do not exist, `gravity: 0` throws, and `simulationOptions` is not exported. The last two (the chunking cases) PASS already, because `stepAsync` and the fake both landed in M6-T12 and M6-T11; they are here as the regression guard for the loop Step 3 writes.

- [ ] **Step 2: The schema edits and the option mapping.** `gravity` -> `nonnegative()`; the three `GraphLayoutOpts` fields with the JSDoc naming design 9.4 item 7; then replace the `simulationOptions` stub M6-T12 Step 3 left in `LayoutManager` with the real, exported helper. Its mapping is exactly this table, one row per element option -- an option with no row is DROPPED, and dropping is a decision, not an oversight:

| Element option | Where it lives | Maps to | Note |
| --- | --- | --- | --- |
| `scalingFactor` | `SimpleLayoutConfig` (default 100) | `scale` | only when the layout has no `scale` of its own (FA2); PLAN DECISION 1 |
| `scale` | `SpringLayoutConfig` (`SpringLayoutEngine.ts:64`) | `scale` | WINS over `scalingFactor` where both exist |
| `weightPath` | the layout option bag | `weight` | design 9.4 item 6's "`weightPath` live" |
| `fixed: (string \| number)[]` | the layout option bag | `NodeMask` | built with `makeMask(s.nodeCount)` plus `maskSet(mask, s.ids.requireIndex(id), true)` per id; a `number[]` of INDICES would be ambiguous with ids, so ids are the input and the mask is the output |
| `nodeMass` | `ForceAtlas2LayoutConfig` (`:108`) | `null` | the value goes into the role-`mass` column instead (M6-T15) |
| `nodeSize` | `ForceAtlas2LayoutConfig` (`:109`) | DROPPED | `@graphty/layout` defers `adjustSizes` -- `forceatlas2.ts:25` lists `nodeSize` among the options "accepted and unused" -- so nothing would read it; M6-T15 PLAN DECISION 3 |
| `dim`, `seed`, `center` | `SimpleLayoutConfig` / the bag | same name | `CommonLayoutOptions` uses the same spellings (`layout/src/simulation/types.ts:58-63`) |
| `gravity`, `scalingRatio`, `strongGravity`, `distributedAction`, `linlog`, `jitterTolerance`, `maxIter` | `ForceAtlas2LayoutConfig` | same name | `ForceAtlas2Options` uses the same spellings |
| `behavior.layout.iterationsPerStep` (else `behavior.layout.stepMultiplier`) | `GraphLayoutOpts` | `iterationsPerStep` | PLAN DECISION 3's read site |
| `behavior.layout.maxInFlight` | `GraphLayoutOpts` | `maxInFlight` | GPU only; the CPU simulations ignore it (`layout/src/simulation/types.ts:72`) |
| `pos: Record<id, [x,y,z]>` | `ForceAtlas2LayoutEngine.ts:101`, `SpringLayoutEngine.ts:61` | DROPPED | there is no counterpart in `ForceAtlas2Options` or `FruchtermanReingoldOptions`. It is not lost: a caller-supplied start position belongs in the element's own array, so `_setLayoutInternal` writes it through `dm.positions.fillUnplaced(node.index, x, y, z)` for each entry BEFORE `load()`, which is exactly where an importer seed would have landed. Record this in the checkpoint: a story that sets `pos` keeps its start positions, through a different mechanism |

- [ ] **Step 3: The pre-step loop.** Replace `LayoutManager.ts:157-165` with the branch of PLAN DECISION 4, keeping the `isSettled` break in both halves.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=default test/layout && pnpm exec vitest run --project=browser test/managers/LayoutManager.test.ts`
Expected: PASS both -- 10 cases in `test/layout/simulation-options.test.ts`, and `test/managers/LayoutManager.test.ts` unchanged in count. The three pre-step cases in that file drive `ngraph`, which is not a `SimulationType` and takes the untouched synchronous `else` branch, so all three must still pass: "should run pre-steps when setting layout" (`:51`), "should run configured number of pre-steps when setting layout" (`:66`, which asserts `stepCount === 10`) and "should handle zero pre-steps configuration" (`:124`, which asserts `stepCount === 0`). A change in any of those three means the `else` branch is not byte-identical to today's loop.

Then re-run M6-T12's file: `pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts`. G6 case 4 (`gpuMinNodes`) now PASSES, taking that file to 7 of 8; case 5 stays red until M6-T14.

- [ ] **Step 4: Checkpoint** -- no commit; ASCII clean. Note in the checkpoint that `stories/Layout.stories.ts` and `stories/Layout2D.stories.ts` snapshots WILL move (PLAN DECISION 1) and that M6-T18 owns the re-baseline.

### Task M6-T14: `setRunning` with reheat, and drag through `beginDrag` / `endDrag`

**Repository:** `EA`. Size: 1-1.5 ed. Design 9.4 items 5 and 9.

**Files:**
- Modify: `graphty-element/src/graphty-element.ts` (surface `setRunning(running: boolean)` beside the existing `isRunning()` at `:1741`)
- Modify: `graphty-element/src/Graph.ts:2052` (`setRunning` reheats a settled simulation on the way up)
- Modify: `graphty-element/src/NodeBehavior.ts:86-125` (`onDragStart` calls `beginDrag`), `:176-220` (`onDragEnd` calls `endDrag(node, pinOnDrag)`), `:229-243` (the XR twin), `:408-437` (`handleClick`, the SECOND pin site)
- Modify: `graphty-element/test/browser/graphty-element-api-parity.test.ts:102-107` (the `Lifecycle Methods` block)
- Test: `graphty-element/test/interactions/edge-cases/simulation-drag-pin.test.ts` (new, interactions project -- `test/interactions/**/*.test.ts` is that project's whole include, `vitest.config.ts:107`)

**Interfaces:**
- Consumes: `SimulationLayoutEngine.beginDrag(n)` / `.endDrag(n, pin)` / `.reheat()` (all three in M6-T12's Produces list); `Node.pinned` (M6-T5); `createFakeAccelerator` (M6-T11).
- Produces: `Graphty.setRunning(running: boolean): void` on the custom element (it has only `isRunning()` today, `graphty-element.ts:1741`), forwarding to `Graph.setRunning` (`Graph.ts:2052`), which now reheats a settled simulation on the way up.

PLAN DECISIONS made by this part:

1. PLAN DECISION: `Graph.setRunning(true)` calls the bridge's `reheat()` when the active engine has one, behind `"reheat" in engine`; `setRunning(false)` only stops the per-frame `step()` calls. Design 7.19's "Pause = the caller stops calling `step()`" and 9.4 item 9's "`setRunning(true)` on a settled simulation also calls `reheat()` so 'play' visibly restarts". In-flight batches land, nothing is submitted, no GPU memory is released, rendering continues. `isRunning()` (`Graph.ts:2044`) is unchanged.
2. PLAN DECISION: `handleClick`'s pin (`NodeBehavior.ts:418-419`) gets the same treatment as drag's. There are TWO pin sites, both gated on `pinOnDrag` (default `true`, `NodeBehavior.ts:523`): drag end pins, and a plain CLICK pins "to prevent layout drift during selection styling". Any change to pin semantics that covers only the drag site leaves clicking a node behaving differently, and the mismatch is invisible in a test that only drags.
3. PLAN DECISION: `context.setRunning(true)` on drag start and drag end (`NodeBehavior.ts:114`, `:188`) stays exactly as it is. Design 9.4 item 5 says so, and with PLAN DECISION 1 it now also reheats -- which is the behaviour a user expects when they drag a node in a settled graph.

- [ ] **Step 1: Write the failing test**

Create `EA/graphty-element/test/interactions/edge-cases/simulation-drag-pin.test.ts`:

```ts
import { assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../../src/testing/fakeAccelerator";
import { createTestGraph } from "../../helpers/testSetup";

describe("drag and pause reach the simulation (design 9.4 items 5 and 9)", () => {
    let graph: Graph;
    let fake: FakeAccelerator;

    beforeEach(async () => {
        graph = await createTestGraph();
        fake = createFakeAccelerator({ settleAfter: 4 });
        graph.setAccelerator(fake);
        await graph.addNodes([{ id: "a" }, { id: "b" }]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("forceatlas2");
    });

    it("a drag calls beginDrag, setPosition per move and endDrag once, and leaves the node pinned", () => {
        const node = graph.getDataManager().nodes.get("a")!;
        const behavior = graph.getNodeBehavior();
        const sim = fake.simulations[0]!;
        const fixedBefore = sim.calls.setFixed;

        behavior.onDragStart(node);
        behavior.onDrag(node, { x: 1, y: 0, z: 0 });
        behavior.onDrag(node, { x: 2, y: 0, z: 0 });
        behavior.onDragEnd(node);

        assert.strictEqual(sim.calls.setPosition.length, 2, "one setPosition per pointer move");
        assert.deepStrictEqual(sim.calls.setPosition[0], [node.index, 1, 0, 0]);
        assert.isAbove(sim.calls.setFixed, fixedBefore, "beginDrag and endDrag both rebuilt the mask");
        assert.strictEqual(node.isPinned(), true, "pinOnDrag defaults to true (NodeBehavior.ts:523)");
        assert.strictEqual(graph.isRunning(), true);
    });

    it("setRunning(false) stops submitting and setRunning(true) reheats", () => {
        const sim = fake.simulations[0]!;
        graph.getUpdateManager().updateLayout();
        const submitted = sim.calls.step.length;
        graph.setRunning(false);
        for (let i = 0; i < 100; i++) {
            graph.getUpdateManager().updateLayout();
        }

        assert.strictEqual(sim.calls.step.length, submitted, "paused: no further step() for 100 frames");
        assert.strictEqual(sim.calls.reheat, 0);
        graph.setRunning(true);
        assert.strictEqual(sim.calls.reheat, 1, "play visibly restarts a settled simulation");
    });

    it("a plain click pins through the same path as a drag end", () => {
        const node = graph.getDataManager().nodes.get("b")!;
        graph.getNodeBehavior().handleClick(node);
        assert.strictEqual(node.isPinned(), true, "NodeBehavior.ts:418-419 is the SECOND pin site");
    });
});
```

`graph.getNodeBehavior()` and the `onDragStart` / `onDrag` / `onDragEnd` / `handleClick` call shapes must be copied from the existing `test/interactions/edge-cases/pin-on-drag.test.ts`, which already drives these handlers; the ASSERTIONS -- call counts on the fake, the pin state, the reheat count -- are what this task owns.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=interactions test/interactions/edge-cases/simulation-drag-pin.test.ts`
Expected: FAIL, all three -- `beginDrag` is never called, `setRunning(true)` does not reheat, and the click path does not reach the simulation.

- [ ] **Step 2: The three edits.** The `setRunning` surface on `graphty-element.ts`; the reheat in `Graph.setRunning`, behind `"reheat" in engine`; the four `NodeBehavior` call sites, each behind a feature test (`"beginDrag" in engine`) so the 15 non-simulation engines are unaffected.

Run: as Step 1, plus `pnpm exec vitest run --project=interactions test/interactions/edge-cases/pin-on-drag.test.ts`
Expected: PASS both -- 3 cases in the new file, and the existing `pin-on-drag` file unchanged in count. That file drives the default `ngraph` engine, which implements `pin` (`NGraphLayoutEngine.ts:291`) and has no `beginDrag`, so the guards keep it on today's path.

Then re-run M6-T12's file: `pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts`. G6 case 5 now PASSES, taking that file to 8 of 8 -- which is the state M6-T17 Step 2 records.

- [ ] **Step 3: The API-parity assertion.** Add `assert.isFunction(Graphty.prototype.setRunning);` to the `Lifecycle Methods` describe block of `test/browser/graphty-element-api-parity.test.ts` (`:102-107`), beside the existing `assert.isFunction(Graphty.prototype.isRunning);` at `:105`. NOT the `Algorithm Methods` block at `:37-43` -- that one asserts `runAlgorithm`, `applySuggestedStyles` and `getSuggestedStyles`, and `setRunning` is a lifecycle method, the sibling of `isRunning`.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/graphty-element-api-parity.test.ts`
Expected: PASS, with the `Lifecycle Methods` case now asserting three functions.

- [ ] **Step 4: Checkpoint** -- no commit; ASCII clean.

### Task M6-T15: The D28 `graphty.mass` role column

**Repository:** `EA`. Size: 1-1.5 ed. Design 9.4 item 10, decision D28 (`design/webgpu/webgpu-acceleration-plan.md:225`), Q-30 (`:4319`).

**Files:**
- Modify: `graphty-element/src/managers/LayoutManager.ts` (resolve once at engine creation). NOTE: `LayoutManager.ts` was also edited by M6-T10, M6-T12 and M6-T13; none of these may run concurrently.
- Modify: `graphty-element/src/data/GraphStore.ts` (ONE declared node column, `graphty.mass`). NOTE: `GraphStore.ts` was created by M6-T3.
- Test: `graphty-element/test/data/role-columns.test.ts` (new, node project)

**Interfaces:**
- Consumes: `@graphty/layout`: `resolveNodeVector(spec, s, fallback): F32` (`layout/src/simulation/inputs.ts:41-75`); `GraphStore.builder.declareNodeColumn` / `setNodeValue`; `snapshot.ids.indexOf(id)`; `snapshot.outDegree()`.
- Produces: one declared node column, `graphty.mass` (`dtype: "f32"`, `role: "mass"`), and `writeNodeVector(store, handle, spec, snapshot): void` on `LayoutManager`.

PLAN DECISIONS made by this part:

1. PLAN DECISION: the element resolves the LEGACY `Record<number, number>` form of `nodeMass` -- which is what `ForceAtlas2LayoutConfig` accepts today (`ForceAtlas2LayoutEngine.ts:108`) -- into a role-`mass` node column ONCE at engine creation, and passes the simulation `nodeMass: null`. D28 is explicit that a simulation REJECTS the `Record` form with `E_UNSUPPORTED` and that "graphty-element at engine creation" is the converter. Without this task an existing template that sets `nodeMass: { 3: 2.5 }` throws the moment `forceatlas2` runs on a simulation.
2. PLAN DECISION: **`writeNodeVector` writes ALL n rows, not only the ids the `Record` names.** The absent rows get `snapshot.outDegree()[i] + 1`, the D28 default, written explicitly. This is not a style choice; a partial column is WRONG. `resolveNodeVector(null, s, fallback)` short-circuits on the column: its first branch is `const byRole = s.nodes.byRole("mass"); if (byRole !== null) { return numericValues(...); }` and only reaches the `fallback(i)` loop when NO mass column exists (`layout/src/simulation/inputs.ts:46-55` on `feat/layout-simulation`). So the moment the element declares and partially fills `graphty.mass`, every id the `Record` did not name gets the COLUMN's fill -- 0 -- and never the fallback. A mass of 0 is not a cosmetic difference in ForceAtlas2: swing / traction divide by mass. Writing the fallback ourselves makes the column TOTAL, which is what `byRole("mass")` winning is safe under.
3. PLAN DECISION: **`nodeSize` gets NO column.** `ForceAtlas2LayoutConfig` accepts it (`ForceAtlas2LayoutEngine.ts:109`), but nothing would ever read it: `@graphty/layout`'s ForceAtlas2 simulation defers `adjustSizes` and says so in its own header -- "`nodeSize` (adjustSizes, deferred: design 7.14, Q-25) ... are accepted and unused" (`layout/src/simulation/forceatlas2.ts:25`) -- and the only `resolveNodeVector` call in that file is for mass (`:541`). Worse, `resolveNodeVector`'s null branch consults `byRole("mass")` regardless of which vector it is resolving, so a role-`size` column has no path to a reader at all. `simulationOptions` therefore DROPS `nodeSize` (the row is in M6-T13 Step 2's table). The reversal condition is one line: when `@graphty/layout` implements `adjustSizes` and `resolveNodeVector` grows a role argument, add the second column here the same way.
4. PLAN DECISION: the column is declared on the BUILDER, not written onto a frozen snapshot, so it survives re-freezes. `builder.declareNodeColumn({ name: "graphty.mass", dtype: "f32", role: "mass" })` at `GraphStore` construction, written with `setNodeValue` at engine creation, and `replaceRole: true` is NOT needed because nothing else claims that role.
5. PLAN DECISION: design 13 row P6 says "9.4 items 1-9" and omits item 10; the integration plan's M6 row says "items 1-10". This plan implements item 10 (DEP-M6-H) because D28 names the element as the only converter, and a GPU simulation given a `Record` throws.

- [ ] **Step 1: Write the failing test**

Create `EA/graphty-element/test/data/role-columns.test.ts`:

```ts
import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";
import { writeNodeVector } from "../../src/managers/LayoutManager";

function storeWithPath(): GraphStore {
    const store = new GraphStore({
        directed: "auto",
        positionScale: 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    // a -> b -> c: outDegree is [1, 1, 0], so the D28 default is [2, 2, 1]
    store.builder.addEdge("a", "b", 1);
    store.builder.addEdge("b", "c", 1);
    store.touch();
    return store;
}

describe("the D28 mass column (design 9.4 item 10)", () => {
    it("writes the Record's values into the role-mass column", () => {
        const store = storeWithPath();
        const s = store.getSnapshot();
        writeNodeVector(store, store.massColumn, { a: 2.5, c: 4 }, s);
        store.touch();
        const next = store.getSnapshot();
        const column = next.nodes.byRole("mass");
        assert.notStrictEqual(column, null);
        const data = column!.data as Float32Array;
        assert.strictEqual(data[next.ids.indexOf("a")], 2.5);
        assert.strictEqual(data[next.ids.indexOf("c")], 4);
    });

    it("writes the D28 default, outDegree + 1, for an id the Record OMITS", () => {
        // The regression this pins: resolveNodeVector(null, s, fallback) short-circuits on
        // byRole("mass") (layout/src/simulation/inputs.ts:46-55), so a partially written column
        // gives every absent id the column fill of 0 and NEVER reaches the fallback. In ForceAtlas2
        // a mass of 0 is a division, not a cosmetic difference.
        const store = storeWithPath();
        const s = store.getSnapshot();
        writeNodeVector(store, store.massColumn, { a: 2.5 }, s);
        store.touch();
        const next = store.getSnapshot();
        const data = next.nodes.byRole("mass")!.data as Float32Array;
        const outDeg = next.outDegree();
        for (let i = 0; i < next.nodeCount; i++) {
            if (next.ids.idOf(i) === "a") {
                continue;
            }

            assert.strictEqual(data[i], (outDeg[i] ?? 0) + 1, `row ${i} carries the D28 default, not 0`);
        }
    });

    it("passes a Float32Array through untouched", () => {
        const store = storeWithPath();
        const s = store.getSnapshot();
        const spec = new Float32Array([9, 8, 7]);
        writeNodeVector(store, store.massColumn, spec, s);
        store.touch();
        const data = store.getSnapshot().nodes.byRole("mass")!.data as Float32Array;
        assert.deepStrictEqual([...data], [9, 8, 7]);
    });

    it("resolves a column NAME to that column's values", () => {
        const store = storeWithPath();
        const handle = store.builder.declareNodeColumn({ name: "custom.mass", dtype: "f32" });
        store.builder.setNodeValue(handle, store.builder.indexOf("a"), 5);
        store.touch();
        const s = store.getSnapshot();
        writeNodeVector(store, store.massColumn, "custom.mass", s);
        store.touch();
        const data = store.getSnapshot().nodes.byRole("mass")!.data as Float32Array;
        assert.strictEqual(data[s.ids.indexOf("a")], 5);
    });

    it("ignores an id the snapshot does not hold rather than writing at INVALID_INDEX", () => {
        const store = storeWithPath();
        const s = store.getSnapshot();
        assert.doesNotThrow(() => writeNodeVector(store, store.massColumn, { "not-a-node": 3 }, s));
    });
});
```

`store.massColumn` is the `ColumnHandle` Step 2 adds beside `seedColumn` and `edgeIdColumn`. `builder.indexOf(id)` is the builder's id lookup; if it is spelled differently, use whatever `GraphBuilder` exports for "index of this id".

Run: `cd EA/graphty-element && pnpm exec vitest run --project=default test/data/role-columns.test.ts`
Expected: FAIL, 5 cases -- `store.massColumn` does not exist and `writeNodeVector` is not exported.

- [ ] **Step 2: Declare and write it.** One `declareNodeColumn` call in `GraphStore`'s constructor, stored as `readonly massColumn: ColumnHandle`; then in `LayoutManager`:

```ts
/**
 * Resolve a legacy nodeMass spec into the role-mass column (D28), TOTALLY.
 *
 * Every row is written -- the spec's value where it has one, `outDegree()[i] + 1` (the D28 default)
 * everywhere else -- because @graphty/layout's resolveNodeVector short-circuits on
 * `s.nodes.byRole("mass")` and never reaches its own fallback once this column exists
 * (layout/src/simulation/inputs.ts:46-55). A partial column would silently give every unnamed node
 * a mass of 0.
 * @param store - the element's store
 * @param handle - the declared graphty.mass column
 * @param spec - the legacy Record, a Float32Array, a column name, or null
 * @param snapshot - the current snapshot, for the id map and the degrees
 */
export function writeNodeVector(
    store: GraphStore,
    handle: ColumnHandle,
    spec: F32 | string | Readonly<Record<string | number, number>> | null | undefined,
    snapshot: GraphSnapshot,
): void {
    if (spec === null || spec === undefined) {
        return;
    }

    const outDegree = snapshot.outDegree();
    const fallback = (i: number): number => (outDegree[i] ?? 0) + 1;
    const values = new Float32Array(snapshot.nodeCount);
    for (let i = 0; i < snapshot.nodeCount; i++) {
        values[i] = fallback(i);
    }

    if (spec instanceof Float32Array) {
        values.set(spec.subarray(0, snapshot.nodeCount));
    } else if (typeof spec === "string") {
        const column = snapshot.nodes.get(spec);
        if (column !== null) {
            const data = column.data as ArrayLike<number>;
            for (let i = 0; i < snapshot.nodeCount; i++) {
                if (snapshot.nodes.isSet(spec, i)) {
                    values[i] = data[i] ?? fallback(i);
                }
            }
        }
    } else {
        for (const [id, value] of Object.entries(spec)) {
            const index = snapshot.ids.indexOf(id);
            if (index !== INVALID_INDEX) {
                values[index] = value;
            }
        }
    }

    for (let i = 0; i < snapshot.nodeCount; i++) {
        store.builder.setNodeValue(handle, i, values[i] ?? 1);
    }

    store.touch();
}
```

The `Object.entries` branch coerces the key to a string; `snapshot.ids.indexOf` takes a `NodeId`, so if a numeric-id graph misses here, look the id up as `Number(id)` when `store.builder` reports a numeric id space. That is the one place `data.knownFields.idCoercion` will matter when IO1 gives it meaning (DEP-M6-J).

Run: as Step 1.
Expected: PASS, 5 cases.

- [ ] **Step 3: Checkpoint** -- no commit; ASCII clean.

### Task M6-T16: The five adapters through `accelerated()`

**Repository:** `EA`. Size: 1.5-2 ed. Design 9.4 item 3, design 9.2's dispatcher contract.

**Files:**
- Modify: `graphty-element/src/algorithms/PageRankAlgorithm.ts:190-236`, `BFSAlgorithm.ts`, `DijkstraAlgorithm.ts:148-193`, `ConnectedComponentsAlgorithm.ts`, `KruskalAlgorithm.ts`
- Modify: `graphty-element/src/algorithms/DegreeAlgorithm.ts` -- NO change; it is already snapshot-native from M6-T8 and design 9.2's interface has no degree method
- Test: `graphty-element/test/algorithms/accelerated-dispatch.test.ts` (new, node project)

**Interfaces:**
- Consumes: `@graphty/algorithms`: `accelerated(acc: AlgorithmAccelerator | null | undefined): AcceleratedAlgorithms` and the `*ResultLike` shapes (`algorithms/src/indexed/accelerator.ts`, M8a); `graph-format`: `NodeIdMap.idOf(i)` / `.requireIndex(id)`; `DataManager.getSnapshot()` / `.undirected(s)`; `Graph.accelerator` (M6-T11); `createFakeAccelerator` (M6-T11) for the test.
- Produces: no new exported symbol. Each of the five adapters keeps its class name, its `static namespace` / `static type`, its zod options schema and its `suggestedStyles` block unchanged, so the registry, the hard-coded `knownAlgorithms` array (`src/algorithms/index.ts:112-136`) and every existing test that asserts on them are untouched.

PLAN DECISIONS made by this part:

1. PLAN DECISION: FIVE adapters move to `accelerated()` at M6, not 17 and not 23. The scope is fixed from three directions and stating it plainly is the point: (a) six adapters are PERMANENT CPU per design 1.2's non-goals -- DFS, Prim, Girvan-Newman, MaxFlow, MinCut, BipartiteMatching -- and call `indexed.x(s)` directly, never `accelerated()`; (b) `StronglyConnectedComponents` and `Leiden` have NO method in design 9.2's `AlgorithmAccelerator` (it has `connectedComponents` and `weaklyConnectedComponents` but no SCC, and `louvain` but no Leiden), so they are accelerable in principle and not in v1; (c) `Degree` needs no method because a snapshot answers degrees; and (d) the dispatcher's method list GROWS with the A2 ports, and M8a's `AcceleratedAlgorithms` ships six methods -- `pageRank`, `sssp`, `breadthFirstSearch`, `connectedComponents`, `weaklyConnectedComponents`, `minimumSpanningTree` (M8a DEP-8A-E). Five of those six have an element adapter; `weaklyConnectedComponents` has none of its own, because `ConnectedComponentsAlgorithm` is the element's one components adapter. Do not confuse that six with the OTHER six of section 0.2, which is the `indexed.*` PORT set -- those two sets overlap but are not equal: `indexed.commonNeighborsScore` is a port with no dispatcher method (design 9.2 declares no link-prediction method at all) and `weaklyConnectedComponents` is a dispatcher method served by the `connectedComponents` port. Every later port PR moves one more adapter off `fromSnapshot`, one line each.
2. PLAN DECISION: the result-writing loop is written ONCE per adapter and is identical on both paths, per design 9.4 item 3. `const s = dm.getSnapshot(); const r = await accelerated(this.graph.accelerator).pageRank(s, opts); for (let i = 0; i < s.nodeCount; i++) { this.addNodeResult(s.ids.idOf(i), "rank", r.scores[i]); }`. The `*Pct` normalisation stays a CPU pass over the readback and keeps its per-algorithm convention: value/maximum for PageRank (`PageRankAlgorithm.ts:228`) and Degree (`DegreeAlgorithm.ts:91`), (score-min)/(max-min) for Betweenness (`BetweennessCentralityAlgorithm.ts:77`). The app depends on the difference and documents it (`graphty/src/components/shell/analysis/nodeMetrics.ts:31-39`).
3. PLAN DECISION: the accelerated branch must write the SAME result keys to the SAME element set as the CPU branch. This is the root `CLAUDE.md` algorithm-style rule reaching into the adapter: `DijkstraAlgorithm` writes `isInPath` to EVERY node (`DijkstraAlgorithm.ts:175-183`) and relies on its `== \`true\`` selector (`:97`, `:112`) to scope the paint; an accelerated branch that wrote `isInPath` only to path members would change the MATCH SET of every `!= \`null\`` selector and therefore the picture, with no test failing. The dispatch test asserts key-set and element-set equality between the two branches, not just value equality.
4. PLAN DECISION: node-id options become indices through `s.ids.indexOf(id)`, and an id not in the snapshot is an `Error` naming the id, not a silent `INVALID_INDEX` passed to the accelerator. `DijkstraAlgorithm` defaults source and target to `nodes[0]` and `nodes[n-1]` (`DijkstraAlgorithm.ts:159-160`) and `AlgorithmAccelerator.sssp(s, source: number, ...)` takes an INDEX. `NodeIdMap.indexOf` returns `INVALID_INDEX` for a miss (`graph-format/src/ids/node-id-map.ts:479`); `requireIndex` throws (`:526`) and is what these adapters call.
5. PLAN DECISION: a GPU result is labelled with `this.addGraphResult("precision", "f32")` and the CPU path with `"f64"`. Design 9.4 item 3 says "A GPU result carries `precision: 'f32'` (3.3); the adapter labels it" and names no key and no consumer. `addGraphResult` writes to `dataManager.graphResults.<namespace>.<type>.precision` (`Algorithm.ts:264-270`), which is where every other graph-level result goes and which the app can already read. The branch is `this.graph.accelerator === null ? "f64" : "f32"`.

- [ ] **Step 1: Write the failing test**

Create `EA/graphty-element/test/algorithms/accelerated-dispatch.test.ts`. The accelerator is `createFakeAccelerator()` (M6-T11) SPREAD with the one dispatcher method the case is testing -- the fake ships no `AlgorithmAccelerator` methods by default, which is exactly design 9.2's "only implemented methods exist".

```ts
import { assert, describe, it } from "vitest";

import { BFSAlgorithm } from "../../src/algorithms/BFSAlgorithm";
import { ConnectedComponentsAlgorithm } from "../../src/algorithms/ConnectedComponentsAlgorithm";
import { DijkstraAlgorithm } from "../../src/algorithms/DijkstraAlgorithm";
import { KruskalAlgorithm } from "../../src/algorithms/KruskalAlgorithm";
import { PageRankAlgorithm } from "../../src/algorithms/PageRankAlgorithm";
import type { Graph } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { createMockGraph } from "../helpers/mockGraph";

const DATA = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    edges: [
        { srcId: "a", dstId: "b", value: 1 },
        { srcId: "b", dstId: "c", value: 2 },
        { srcId: "c", dstId: "d", value: 3 },
    ],
};

/** The results tree an adapter wrote, with `precision` stripped so both branches are comparable. */
function resultsOf(graph: Graph): { nodes: Record<string, unknown>; graph: unknown } {
    const dm = graph.getDataManager();
    const nodes: Record<string, unknown> = {};
    for (const [id, n] of dm.nodes) {
        nodes[String(id)] = JSON.parse(
            JSON.stringify((n as unknown as { algorithmResults?: unknown }).algorithmResults ?? null),
        ) as unknown;
    }

    const graphResults = JSON.parse(JSON.stringify(dm.graphResults ?? null)) as Record<
        string,
        Record<string, Record<string, unknown>>
    >;
    for (const ns of Object.values(graphResults ?? {})) {
        for (const alg of Object.values(ns)) {
            delete alg.precision;
        }
    }

    return { nodes, graph: graphResults };
}

/**
 * Each case names its adapter, the dispatcher method it routes through, and a fixture that is the
 * SAME answer the CPU produces for DATA -- so any difference the assertions find is a difference in
 * how the adapter WRITES, not in what the algorithm computed.
 */
const CASES = [
    { name: "pageRank", Adapter: PageRankAlgorithm, method: "pageRank" },
    { name: "breadthFirstSearch", Adapter: BFSAlgorithm, method: "breadthFirstSearch" },
    { name: "sssp", Adapter: DijkstraAlgorithm, method: "sssp" },
    { name: "connectedComponents", Adapter: ConnectedComponentsAlgorithm, method: "connectedComponents" },
    { name: "minimumSpanningTree", Adapter: KruskalAlgorithm, method: "minimumSpanningTree" },
] as const;

describe("accelerated() dispatch writes the same results as the CPU branch", () => {
    for (const c of CASES) {
        it(`${c.name}: same result keys on the same element set, on both branches`, async () => {
            const cpuGraph = await createMockGraph(DATA);
            await new c.Adapter(cpuGraph).run();
            const cpu = resultsOf(cpuGraph);

            // The fixture is captured from the CPU run through the SAME snapshot, so the fake is a
            // stand-in for the dispatcher's transport, not for the algorithm.
            const gpuGraph = await createMockGraph(DATA);
            const s = gpuGraph.getDataManager().getSnapshot();
            const fixture = captureFixture(c.method, s, cpu);
            gpuGraph.accelerator = { ...createFakeAccelerator(), [c.method]: () => fixture };
            await new c.Adapter(gpuGraph).run();
            const gpu = resultsOf(gpuGraph);

            assert.deepStrictEqual(Object.keys(gpu.nodes).sort(), Object.keys(cpu.nodes).sort(), "same element set");
            assert.deepStrictEqual(gpu, cpu, "same keys, same values, once precision is stripped");
        });

        it(`${c.name}: labels precision f32 on the accelerated branch and f64 on the CPU one`, async () => {
            const cpuGraph = await createMockGraph(DATA);
            await new c.Adapter(cpuGraph).run();
            assert.strictEqual(precisionOf(cpuGraph, c.name), "f64");

            const gpuGraph = await createMockGraph(DATA);
            const s = gpuGraph.getDataManager().getSnapshot();
            gpuGraph.accelerator = {
                ...createFakeAccelerator(),
                [c.method]: () => captureFixture(c.method, s, resultsOf(cpuGraph)),
            };
            await new c.Adapter(gpuGraph).run();
            assert.strictEqual(precisionOf(gpuGraph, c.name), "f32");
        });

        it(`${c.name}: a throwing dispatcher method propagates, with NO CPU fallback`, async () => {
            const graph = await createMockGraph(DATA);
            graph.accelerator = {
                ...createFakeAccelerator(),
                [c.method]: () => {
                    throw new Error("E_DEVICE_LOST");
                },
            };
            await assert.rejects(() => new c.Adapter(graph).run(), /E_DEVICE_LOST/);
        });
    }
});
```

`captureFixture(method, snapshot, cpuResults)` and `precisionOf(graph, algorithmType)` are two small local helpers written in this same file: the first turns the CPU results tree into the `*ResultLike` shape M8a's `AlgorithmAccelerator` declares for that method, indexed by `snapshot` order; the second reads `graph.getDataManager().graphResults?.graphty?.[type]?.precision`.

**The five shapes, spelled exactly as `algorithms/src/indexed/accelerator.ts` declares them (M8a Task M8a-T8; the shapes are M8a's and this table is the copy, so if the two ever differ M8a wins).** Every score vector is `NumericVector`, so an `F32` fixture is what an accelerator would really return; every index vector is `U32` (`Uint32Array`).

| Dispatcher method | The accelerator's return type | Members `captureFixture` has to fill |
| --- | --- | --- |
| `pageRank` | `Promise<PageRankResultLike>` | `scores: NumericVector` (a `Float32Array(s.nodeCount)` here), `iterations: number`, `converged: boolean`, optionally `danglingMass?: number` |
| `breadthFirstSearch` | `Promise<BfsResultLike>` | `depth: U32`, `parent: U32`, `order: U32`, `visitedCount: number` -- all four, all `Uint32Array` except the count |
| `sssp` | `Promise<SsspResultLike>` | `dist: NumericVector`, `predArc: U32`, and NOTHING else. `pathTo` and `pathEdges` are NOT in the fixture: `accelerated()` attaches them itself through `decorateSssp`, which is exactly why `AcceleratedAlgorithms.sssp` returns the richer `SsspResult` while the accelerator returns the bare `SsspResultLike` |
| `connectedComponents` | `Promise<LabelResultLike>` | `labels: U32`, `count: number`, and a CALLABLE `groups(): U32[]`. Not `component`, and not a bare array: `groups` is a method on the object |
| `minimumSpanningTree` | `Promise<MstResultLike>` | `edges: U32` (logical edge indices), `totalWeight: number` |

Write them against `algorithms/src/indexed/accelerator.ts` as it exists when this task runs; R-M6-11 already says an adapter whose port is missing simply stays on `fromSnapshot`. If a fixture is missing a member the interface requires, the failure is a `tsc` error in this test file, which is the intended place to find it.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=default test/algorithms/accelerated-dispatch.test.ts`
Expected: FAIL, 15 cases -- the adapters still call `fromSnapshot` and never look at `graph.accelerator`, so the `precision` and throw cases fail outright and the equality cases pass for the wrong reason.

- [ ] **Step 2: The five edits**, each replacing the `fromSnapshot(...)` line and the CPU call with the `await accelerated(this.graph.accelerator).x(s, opts)` form, and each keeping its existing result loop and `suggestedStyles` block untouched.

| Adapter | Snapshot it passes | Dispatcher method |
| --- | --- | --- |
| `PageRankAlgorithm` | `dm.getSnapshot()` | `pageRank(s, { dampingFactor, maxIterations, tolerance, weighted })` -- `weighted`, not `weight`: that is the member name `IndexedPageRankOptions` carries (M8a Task M8a-T8, after graph-format design 14.2 `:3892`), and the legacy `weight` of `algorithms/src/algorithms/centrality/pagerank.ts:15` is a different type on a different function |
| `BFSAlgorithm` | `dm.undirected(dm.getSnapshot()).snapshot` | `breadthFirstSearch(s, s.ids.requireIndex(startId))` |
| `DijkstraAlgorithm` | `dm.undirected(dm.getSnapshot()).snapshot` | `sssp(s, s.ids.requireIndex(source))`, then `r.pathTo(target)` and `r.pathEdges(target)`, which the dispatcher attaches on BOTH paths (design 9.2), retiring `getPathEdges`'s string-key reconstruction (`DijkstraAlgorithm.ts:200-208`) |
| `ConnectedComponentsAlgorithm` | `dm.undirected(dm.getSnapshot()).snapshot` | `connectedComponents(s)` |
| `KruskalAlgorithm` | `dm.undirected(dm.getSnapshot()).snapshot` | `minimumSpanningTree(s)`, writing `inMST` through the derived graph's `edgeRemap` (14.4 rule 9) so both halves of a collapsed reciprocal pair are flagged |

Run: `cd EA/graphty-element && pnpm exec vitest run --project=default test/algorithms`
Expected: PASS, including all 15 cases of `accelerated-dispatch.test.ts` (five adapters times equality, precision and propagation).

- [ ] **Step 3: Checkpoint** -- no commit; ASCII clean.

### Task M6-T17: The two GPU stories and the eight G6 cases green

**Repository:** `EA`. Size: 1.5-2.5 ed. Design 9.4 item 8; the G6 gate list.

**The fake accelerator is NOT created here.** `src/testing/fakeAccelerator.ts` landed in Task M6-T11 Step 1, because M6-T12, M6-T14 and M6-T16 all test against it and a fake that landed last would make every one of their "Expected: PASS" lines unreachable. This task consumes it, writes the two stories around it, and is where the eight cases of `test/browser/simulation-layout-engine.test.ts` are green together for the first time.

**Files:**
- Create: `graphty-element/stories/LayoutGpu.stories.ts`
- Verify (no edit expected): `graphty-element/test/browser/simulation-layout-engine.test.ts` -- the eight cases were written in M6-T12 Step 1 and went green in M6-T12, M6-T13 and M6-T14
- NOT modified: the root `knip.config.ts`. There is no `graphty-element/knip.config.ts` -- the repository has ONE knip config, at the root, and its `"graphty-element"` workspace block (`knip.config.ts:114-125`) already lists `test/**/*.ts` and `stories/**/*.stories.ts` among its `entry` globs, so `src/testing/fakeAccelerator.ts` is reachable from an entry and is not reported unused. Step 4 runs knip to confirm; if it DOES report the file, the cause is that nothing imports it yet, which means a test or a story is missing, not that the config needs a line.

**Interfaces:**
- Consumes: `createFakeAccelerator(options?: FakeAcceleratorOptions): FakeAccelerator` (M6-T11 Step 1); `Graph.setAccelerator` (M6-T11); `SimulationLayoutEngine` (M6-T12).
- Produces: `stories/LayoutGpu.stories.ts` with `Layout/ForceAtlas2 (GPU)` and `Layout/Spring (GPU)`. No source symbol.

PLAN DECISIONS made by this part:

1. PLAN DECISION: the two stories are `Layout/ForceAtlas2 (GPU)` and `Layout/Spring (GPU)` in a NEW `stories/LayoutGpu.stories.ts`, picked up with no config change (`.storybook/main.ts:4` globs `../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)`). Each injects the fake in a decorator BEFORE `setLayout` runs. Chromatic gets a stable picture because the fake is deterministic; that is the whole reason design 9.4 item 8 asks for a fake rather than a real GPU here.
2. PLAN DECISION: each story's `play()` waits on `waitForGraphSettled` exactly like every other layout story. `stories/helpers.ts:35-69` is `setupEventListenersForElement`, which pre-registers ONE-SHOT listeners with `element.addEventListener(eventName, ..., { once: true })` over `const events = ["graph-settled", "data-loaded"]` (`:47`), so an event that fires before `play()` runs is still captured. The `MutationObserver` is a separate mechanism at `stories/helpers.ts:79`, inside `eventWaitingDecorator`: it is what FINDS a late-mounted `graphty-element` so the listeners can be attached to it. Both are needed and neither substitutes for the other, which is why the decorator is on the meta.
3. PLAN DECISION: the fake is constructed with an explicit `settleAfter` so `graph-settled` fires within the story's timeout. `createFakeAccelerator({ moveBy: 0.25, settleAfter: 400 })` settles after 400 iterations, which at the default `stepMultiplier` is a few hundred frames -- well inside Chromatic's window and still enough motion to produce a picture that is not the seed layout.

- [ ] **Step 1: Turn the eight cases green together**

Nothing to write: `test/browser/simulation-layout-engine.test.ts` was authored in M6-T12 Step 1 against `createFakeAccelerator`, which existed from M6-T11. Six cases went green in M6-T12 Step 4, G6 case 4 in M6-T13 Step 3 and G6 case 5 in M6-T14 Step 2. This step is the confirmation that they are green TOGETHER, which no earlier task could claim.

Run: `cd EA/graphty-element && pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts`
Expected: PASS, 8 cases, 1 file -- the five G6 cases (late injection; mid-run removal preserving positions and pins; `pin A, remove B < A, freeze, reload -> A still fixed`; `gpuMinNodes` above the node count keeping the CPU engine until a reload crosses it; `setRunning(false)` landing only the in-flight batches and `setRunning(true)` reheating) plus the bridge's three own cases.

- [ ] **Step 2: Write the two stories**

Create `EA/graphty-element/stories/LayoutGpu.stories.ts`, copying `stories/Layout.stories.ts`'s meta shape (`render: renderFn`, `decorators: [eventWaitingDecorator]`, the `chromatic: { diffIncludeAntiAliasing: true, diffThreshold: 0.3 }` parameters at `:176-183`) and adding a decorator that injects the fake before the layout is set:

```ts
import type { Meta, StoryObj } from "@storybook/web-components";

import { createFakeAccelerator } from "../src/testing/fakeAccelerator";
import { eventWaitingDecorator, renderFn, templateCreator, waitForGraphSettled } from "./helpers";

/**
 * Injects the deterministic fake accelerator on the element as soon as it exists, BEFORE setLayout
 * runs, so the simulation branch is the one under test (design 9.4 item 8).
 */
const fakeAcceleratorDecorator = (story: () => unknown): unknown => {
    const result = story();
    queueMicrotask(() => {
        for (const el of document.querySelectorAll("graphty-element")) {
            const graph = (el as unknown as { graph?: { setAccelerator(a: unknown): void } }).graph;
            graph?.setAccelerator(createFakeAccelerator({ moveBy: 0.25, settleAfter: 400 }));
        }
    });
    return result;
};

const meta: Meta = {
    title: "Layout",
    render: renderFn,
    decorators: [fakeAcceleratorDecorator, eventWaitingDecorator],
    parameters: {
        chromatic: { diffIncludeAntiAliasing: true, diffThreshold: 0.3 },
    },
};

export default meta;

export const ForceAtlas2Gpu: StoryObj = {
    name: "ForceAtlas2 (GPU)",
    args: {
        styleTemplate: templateCreator({
            graph: { twoD: false, layout: "forceatlas2" },
        }),
    },
    play: waitForGraphSettled,
};

export const SpringGpu: StoryObj = {
    name: "Spring (GPU)",
    args: {
        styleTemplate: templateCreator({
            graph: { twoD: false, layout: "spring" },
        }),
    },
    play: waitForGraphSettled,
};
```

Copy `renderFn`, `templateCreator`, `waitForGraphSettled` and the args shape from `stories/Layout.stories.ts` verbatim; if the decorator signature in this Storybook version differs, use the one `eventWaitingDecorator` itself uses (`stories/helpers.ts:77`). If the element does not expose `graph` as a property, reach it however `stories/Layout.stories.ts` or an existing test reaches the `Graph` from the custom element.

- [ ] **Step 3: Open them on the dev box (owner-facing)**

Run: `cd EA && PORT=9025 pnpm run storybook:graphty-element`, then open `Layout/ForceAtlas2 (GPU)` and `Layout/Spring (GPU)`.
Expected: both settle and render. `PORT=9025` is explicit because the script is `storybook dev -p ${PORT:-6006}` after sourcing `.env` (`graphty-element/package.json:105`) and `graphty-element/.env.example` sets `PORT=5173` -- nothing in the repository serves this Storybook on 9025 by default; 9025 is the root `CLAUDE.md`'s convention and is inside the allowed 9000-9099 band. This is the owner-facing half of G6's "a Storybook story the owner can open on the dev box"; the REAL-GPU version of it is Task M6-T20's, per section 0.0 (design 9.1's no-GPU-dependency rule is superseded).

- [ ] **Step 4: The distributional check.** G6 asks that "the same story on the CPU simulation looks statistically the same (the 11.4 distributional metrics)". At M6 the comparison is CPU-simulation versus FAKE, which is not a physics comparison and would be meaningless. State that plainly in the gate record (M6-T18): the four metrics -- stress, edge-length distribution quantiles, per-node nearest-neighbour distance histogram, inter-component separation, within 10% -- are measured in the GPU package's own parity suite and re-measured against a REAL accelerator in M7. M6's element-side obligation is the fake-accelerator list, which it meets.

- [ ] **Step 5: Prove the element still has no GPU dependency**

Run:

```bash
cd EA
grep -rn "webgpu-graph-algorithms" graphty-element/package.json graphty-element/src graphty-element/stories graphty-element/test   # expect nothing
node -e "const p=require('./graphty-element/package.json');console.log(Object.keys({...p.dependencies,...p.devDependencies,...p.peerDependencies}).filter(k=>k.includes('webgpu')))"   # expect []
pnpm exec knip
```

Expected: the grep prints nothing and exits 1; the node line prints `[]`; knip reports no finding, in particular none for `src/testing/fakeAccelerator.ts`, which is reachable from the `test/**/*.ts` and `stories/**/*.stories.ts` entries of the root `knip.config.ts:114-125`. Per section 0.0 this check INVERTS: the GPU package must appear ONLY under `peerDependencies` plus `peerDependenciesMeta.optional`, never under `dependencies` or `devDependencies`, and no file reachable from the core entry `graphty-element/index.ts` may import it -- only `src/webgpu.ts` may.

- [ ] **Step 6: Checkpoint** -- no commit; ASCII clean.

### Task M6-T18: The Chromatic re-baseline, the G6 record, and the E1 commits

**Repository:** `EA`. Size: 1-2 ed plus owner time.

**Files:**
- Create: `graphty-element/docs/decisions/G6.md` (the gate record)
- Modify: `graphty-element/docs/.vitepress/config.ts` (one `srcExclude` line, see below)
- Modify: `design/webgpu/README.md` (one row for this plan file), `design/README.md` (the `webgpu/` and `decisions/` file counts)
- NOT created: any G12 record, and NO row is added to `design/decisions/README.md`. `design/decisions/2026-09-19-g12-without-the-nightly-clause.md` and its index row are owned by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`; DEP-M6-I cites that file. One record, one filename.

**Why the `srcExclude` line is not optional.** The gate-record precedent is the PACKAGE's `docs/decisions/` -- `webgpu-graph-algorithms/docs/decisions/G0.md`..`G3.md` -- and this record follows it. But `graphty-element/docs/` is different from that package's: it is a published VitePress site (`graphty-element/docs/.vitepress/config.ts`, `base: "/graphty-element/"`, built by `npm run docs:build` and deployed by `deploy-pages.yml`), and VitePress builds EVERY `.md` under its root into a page whether or not the sidebar links it. Without an exclusion, an internal gate record becomes a public page at `https://graphty.app/graphty-element/decisions/G6`. The config has no `srcExclude` today, so add one:

```ts
    srcExclude: ["decisions/**"],
```

with a comment saying gate records live there and are internal. `webgpu-graph-algorithms/docs/` has no VitePress config at all, which is why G0-G3 needed nothing equivalent.

**Interfaces:**
- Consumes: every task's Checkpoint state; the Chromatic project id `Project:686eda676c08de218a75ecbf` (`graphty-element/chromatic.config.json`).
- Produces: `graphty-element/docs/decisions/G6.md` (the gate record, the sibling of `webgpu-graph-algorithms/docs/decisions/G0.md`..`G3.md`); no source symbol and no `design/decisions/` record.

- [ ] **Step 1: The full green check**

Run:

```bash
cd EA
pnpm exec nx run-many -t lint,build --projects=graphty-element --parallel=1

# The storybook vitest project drives a SERVED Storybook (vitest.config.ts:136-140 defaults its URL
# to https://localhost:6006 and nothing in CI or this repo sets STORYBOOK_URL), so build it and
# serve it first -- the two commands CI runs at .github/workflows/ci.yml:116 and :517.
pnpm exec nx run graphty-element:build-storybook
pnpm exec http-server graphty-element/storybook-static -p 9026 &
sleep 3

cd graphty-element
pnpm exec vitest run --project=default
for n in 1 2 3 4 5; do pnpm exec vitest run --project=browser --project=interactions --shard=$n/5 || break; done
for n in 1 2 3 4; do STORYBOOK_URL=http://localhost:9026 pnpm exec vitest run --project=storybook --shard=$n/4 || break; done
cd .. && pnpm exec knip && ./tools/prepush.sh
kill %1   # the http-server
```

Expected: every command exit 0. `tools/prepush.sh` takes 15-25 minutes and is what `.husky/pre-push` runs anyway, so running it here is cheaper than discovering it at push time.

- [ ] **Step 2: The Chromatic re-baseline (owner, SCHEDULED, CI-BLOCKING)**

The `chromatic-element` job runs with `exitZeroOnChanges: false` (`.github/workflows/ci.yml:619`) and a later job requires all five Chromatic jobs green (`ci.yml:828`), so every changed snapshot RED-LIGHTS the PR until a human accepts it in the Chromatic UI. This is a scheduled owner step with a NAMED accepter, not a courtesy.

The stories expected to change, and why -- the accepter checks each against this list and rejects anything not on it:

| Story | Why it moves |
| --- | --- |
| `Layout/3D ForceAtlas2`, `Layout/2D ForceAtlas2` | `scalingFactor` becomes the simulation's `scale` (M6-T13 PLAN DECISION 1): a layout parameter instead of a post-layout multiplier, so the same value does not reproduce the same picture |
| `Layout/3D Spring`, `Layout/2D Spring` | the same, plus `scale` now wins over `scalingFactor` where both are set (`SpringLayoutEngine.ts:64`) |
| `Layout/ForceAtlas2 (GPU)`, `Layout/Spring (GPU)` | NEW stories (M6-T17), so they are accepted as first baselines |

Tell the owner: `! open https://www.chromatic.com/builds?appId=686eda676c08de218a75ecbf` (the project id is `graphty-element/chromatic.config.json`).
Expected output: exactly six changed or new stories. Any OTHER changed story is an unintended regression: do not accept it; find it. `Layout/3D ngraph`, `Layout/3D D3` and every `Layout2D` story other than the two named must be byte-identical, because `ngraph` and `d3` never take the simulation branch.

- [ ] **Step 3: Write the G6 record**

Create `EA/graphty-element/docs/decisions/G6.md` with this content; every `<...>` is a number or a string copied from the named command's output, and the owner signs the last section:

```markdown
# G6 -- the integration gate, element part (design 13 row P6; WebGPU design 9.4)

Recorded by: <owner name>, 2026-09-DD. Commits: the <n> of the E0 PR and the <m> of the E1 PR (<short hashes>).
Environment: Node <version>, pnpm 10, vitest 3.2.7, Playwright chromium <version>, @graphty/graph-format <version>,
@graphty/algorithms <version>, @graphty/layout <version>. Every command ran from `graphty-element/`.

## 1. The G6 checklist (design 13 row P6, element part), each item mapped to its evidence

| # | Item | Evidence | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | element tests green with a fake accelerator | `vitest run --project=browser test/browser/simulation-layout-engine.test.ts` | <n> passed | pass / fail |
| 2 | late injection engages a running layout | the same file, case 1 | <n> | pass / fail |
| 3 | mid-run removal keeps positions and pins | case 2 | <n> | pass / fail |
| 4 | pin survival across a remap (pin A, remove B < A, freeze, reload) | case 3 | <n> | pass / fail |
| 5 | gpuMinNodes above the node count keeps the CPU engine until a reload crosses it | case 4 | <n> | pass / fail |
| 6 | setRunning(false) lands only in-flight batches; setRunning(true) reheats | case 5 | <n> | pass / fail |
| 7 | stories green | the four storybook shards | <n> tests | pass / fail |
| 8 | Chromatic re-baselined | build <id>; six stories accepted, listed in M6-T18 Step 2 | <n> changed | pass / fail |
| 9 | the element gained no GPU dependency | M6-T17 Step 5's three commands | `[]` | pass / fail |

## 2. What this record does NOT claim

The 11.4 distributional metrics (stress, edge-length quantiles, nearest-neighbour histogram,
inter-component separation, within 10%) are NOT measured here. At M6 the only accelerator the element
has is the deterministic fake of `src/testing/fakeAccelerator.ts`, which is not a physics model, so a
CPU-versus-fake comparison would measure nothing. The metrics are measured in the GPU package's own
parity suite and are re-measured against a REAL accelerator in phase M7, whose gate G12 carries them.

The real-GPU half of G6 -- "the story on the real GPU locally settles, drags and pins (screenshot
checked with the Playwright + nanobanana routine)" -- is now Task M6-T20's, per section 0.0; design 9.1 forbade the element a
dependency on the GPU package, so the real-GPU story lives in the app.

## 3. Findings, owner decisions, re-fixed numbers

Signed off: <owner>, 2026-09-DD.
```

- [ ] **Step 4: The G12 restatement is CITED, not recorded here**

Write nothing. The restatement DEP-M6-I relies on lives in `design/decisions/2026-09-19-g12-without-the-nightly-clause.md`, written by Task M7-T1 Step 2 of `design/webgpu/plans/2026-09-19-webgpu-m7-graphty-app.md`. M7 owns it because G12 is M7's gate; M6's gate is the element part of G6, which says nothing about a nightly. The M8a plan cites the same file (its DEP-8A-F) and the M8b plan defers to it (its section 0.7), so the programme has ONE record under ONE filename instead of three under three.

Nothing in this phase waits on it: M6 does not invoke G12, so the record may land before or after this PR.

Run: `cd EA && grep -rn "nightly" design/webgpu/plans/2026-09-19-webgpu-m6-graphty-element.md`
Expected: every hit is inside DEP-M6-I or this step, and each points at `2026-09-19-no-nightly-gpu-lane.md` or `2026-09-19-g12-without-the-nightly-clause.md`. A hit asserting a nightly soak as a live gate clause is a document that was not reconciled.

- [ ] **Step 5: Index this plan**

Add a row to `design/webgpu/README.md`'s table: `` `plans/2026-09-19-webgpu-m6-graphty-element.md` `` | "Phase M6: the graph-format 14.4 `DataManager` refactor (E0) and the design 9.4 accelerator seam (E1) in graphty-element" | `live plan`. Then update `design/README.md`'s Directory Structure file counts for `webgpu/` and `decisions/`.

**Both cells are shared lines that four plans of 2026-09-19 bump, so neither number may be guessed.** The resolution rule, the same one Task M7-T1 Step 3 states, is NOT "take one side": re-run the two commands below in the tree being committed and copy THEIR output. They are not `ls | wc -l` -- the `webgpu/` cell counts `.md` files RECURSIVELY (so `plans/` is included and the directory itself is not counted), and the `decisions/` cell counts RECORDS, excluding its own `README.md`.

```bash
cd EA
find design/webgpu -name '*.md' | wc -l       # the number design/README.md's webgpu/ cell must carry
ls design/decisions/*.md | grep -cv README    # the number its decisions/ cell must carry
```

The `decisions/` count moves only if a sibling plan's record has already landed -- M6 adds two records of its own (DEP-M6-B and DEP-M6-C, written by M6-T6 Step 5) and none for G12. The corpus-table rows never collide, because each plan adds its own line.

- [ ] **Step 6: Commit (owner)** -- `feat(graphty-element): the fake accelerator, Graph.accelerator and the release list`.
- [ ] **Step 7: Commit (owner)** -- `feat(graphty-element): the SimulationLayoutEngine bridge over a LayoutSimulation`.
- [ ] **Step 8: Commit (owner)** -- `feat(graphty-element): forceatlas2 and spring run on the simulation bridge`.
- [ ] **Step 9: Commit (owner)** -- `feat(graphty-element): setRunning reheats and drag reaches the simulation`.
- [ ] **Step 10: Commit (owner)** -- `feat(graphty-element): resolve nodeMass into a graph-format role column`.
- [ ] **Step 11: Commit (owner)** -- `feat(graphty-element): five adapters dispatch through accelerated()`.
- [ ] **Step 12: Commit (owner)** -- `test(graphty-element): the two fake-accelerator GPU stories`.
- [ ] **Step 13: Commit (owner)** -- `docs(graphty-element): record G6 and re-baseline the layout stories`.

The agent's job for Steps 6-13 is to leave the working tree in the state the Checkpoints describe and to tell the owner these eight subjects, in this order. The agent runs NO git command; appendix 7.1 carries the owner-only commands, including re-pointing `tools/commit-changes.sh`'s STEPS / SUBJECTS / PATHS block. The mapping is: Step 6 = M6-T11 (the fake accelerator ships with the surface it was built for); Step 7 = M6-T12; Step 8 = M6-T13; Step 9 = M6-T14; Step 10 = M6-T15; Step 11 = M6-T16; Step 12 = M6-T17; Step 13 = M6-T18's G6 record, the `srcExclude` line, the two design README edits and the story re-baseline. There is no G12 commit: Task M7-T1 Step 2 carries that record. No `!` on any subject: `scalingFactor`'s meaning change is a behaviour change inside a `looseObject` option bag (`GraphStyle.ts:38`), not a signature change, and a major bump would cascade into the app; the change is documented in Step 8's commit body, as graph-format design 14.3 prescribes for a re-baseline commit ("one commit per package re-baselines stories whose output changes for the documented reasons; the commit message lists the reasons"). Step 13's commit body lists the six stories of Step 2. The `Chromatic (graphty-element)` job of the PR shows them; the owner accepts them; `all-checks` then passes.

---

## 7. Appendices

### 7.1 The owner's command sheet (in order)

| When | Command (paste as an `!` command in this session, or run in a shell) |
| --- | --- |
| before M6a | merge PR #12 (M5): `gh pr ready 12 && gh pr merge 12 --squash` after the `Test (d3d12 on windows-latest)` failure of run 35408894651 is re-run green or triaged as the known WARP `E_DEVICE_LOST` timeout |
| before M6a | open and merge the M5b PR for `feat/webgpu-layout-types`, which has none today (`gh pr list --state all` returns only #12 and #11) |
| before M6b | M8a on master (its own plan): A1, the six `indexed.*` ports, `algorithms/src/indexed/accelerator.ts` |
| M6a Step 0 | `git fetch origin && git merge --ff-only origin/master && git worktree add .worktrees/element-graph-store -b feat/element-graph-store master` |
| M6a Step 0 | `cd .worktrees/element-graph-store && HUSKY=0 pnpm install --frozen-lockfile && pnpm exec nx run-many -t build --projects=graph-format,algorithms,layout --parallel=3` |
| M6-T1 Step 2 | `cd .worktrees/element-graph-store && HUSKY=0 pnpm install` (the lockfile update; then re-run with `--frozen-lockfile` to confirm) |
| M6-T10 Steps 7-13 | re-point `tools/commit-changes.sh`'s STEPS / SUBJECTS / PATHS block (`tools/commit-changes.sh:31-34`) at the E0 change set and its seven subjects, then `./tools/commit-changes.sh --dry-run` (it stages nothing), then `./tools/commit-changes.sh` |
| M6a end | `gh pr create --draft --base master --head feat/element-graph-store`; require `Chromatic (graphty-element)` to report NO changes |
| M6b Step 0 | `cd /home/apowers/Projects/graphty-monorepo && git worktree add .worktrees/element-accelerator -b feat/element-accelerator master` and the same install / build line |
| M6-T17 Step 3 | `cd .worktrees/element-accelerator && PORT=9025 pnpm run storybook:graphty-element` -- the PORT is explicit because the script is `storybook dev -p ${PORT:-6006}` after sourcing `.env` (`graphty-element/package.json:105`) and `.env.example` sets `PORT=5173`; then open `Layout/ForceAtlas2 (GPU)` and `Layout/Spring (GPU)` |
| M6-T18 Step 2 | `open https://www.chromatic.com/builds?appId=686eda676c08de218a75ecbf` and accept EXACTLY the six stories listed there |
| M6-T18 Steps 6-13 | re-point `tools/commit-changes.sh`'s STEPS / SUBJECTS / PATHS block at the E1 change set and its eight subjects, then `./tools/commit-changes.sh --dry-run`, then `./tools/commit-changes.sh` |

**The agent never runs any of these**, including every `git worktree`, `git merge` and `tools/commit-changes.sh` line above; it prepares the tree, verifies the results, and tells the owner which subject to commit. The commit steps in M6-T10 (Steps 7-13) and M6-T18 (Steps 6-14) are one line each and name only a subject, for exactly that reason.

### 7.2 Verification matrix

| Check | Where | Command | Green means |
| --- | --- | --- | --- |
| The position column attaches by reference | M6-T2 | `pnpm exec vitest run --project=default test/data/positions.test.ts` | 8 cases: a write through `ElementPositions` is visible on `column.data`, a resizable buffer is refused, and the spare capacity stays unplaced across a reallocation |
| The invalidation key sees a merge | M6-T3 | `pnpm exec vitest run --project=default test/data/graph-store.test.ts` | `builder.mutationCount` is unchanged across the merge and the store still froze |
| The seed column survives `replaceRole` | M6-T3 | the same file, case 4 | a file coordinate reached `positions` before the attach deleted the seed column |
| The element never transfers a snapshot | M6-T3 | `pnpm exec vitest run --project=default test/data/no-transfer.test.ts` | no `transferables()` / `toWire()` / `toBytes()` call anywhere in `src/` |
| `snapshot-replaced` is subscribable | M6-T4 | `pnpm exec vitest run --project=default test/managers/event-manager-snapshot.test.ts` | `addListener` resolves where `"layout-changed"` throws |
| `toAlgorithmGraph` is gone | M6-T8 | `grep -rn "toAlgorithmGraph\|graphConverter\|graphUtils" graphty-element/src graphty-element/test graphty-element/stories` | prints nothing, exits 1 |
| The 27 mock importers still pass | M6-T9 | `pnpm exec vitest run --project=default` | the whole node project green with the grown `createMockGraph` |
| The chunked pre-step loop | M6-T13 | `pnpm exec vitest run --project=default test/layout/simulation-options.test.ts` | `step` called with `256, 256, 188` for `preSteps: 700`, and one batch then a break when `isSettled` flips -- R-M6-8's only evidence, since no story takes the simulation branch |
| The D28 mass column is TOTAL | M6-T15 | `pnpm exec vitest run --project=default test/data/role-columns.test.ts` | an id the `Record` omits carries `outDegree + 1`, not the column fill of 0 |
| The five DataManager inversions and the three new cases | M6-T9 | `pnpm exec vitest run --project=browser test/managers/DataManager.test.ts` | 26 tests (23 today plus three new), the merge and incident-edge cases asserting the NEW behaviour and `Node.index` proved where it is assigned |
| E0 ships no pixel change | M6-T10 | the PR's `Chromatic (graphty-element)` job | zero changed snapshots |
| The engine contract | M6-T10 | `pnpm exec vitest run --project=browser test/managers/LayoutManager.test.ts` | `load` gets the undirected snapshot; `reload` fires on `snapshot-replaced` |
| The accelerator surface and the release list | M6-T11 | `pnpm exec vitest run --project=browser test/browser/accelerator-surface.test.ts` | 5 cases: `release(previous)` once per freeze, an accelerator with NO `release` does not throw, `dispose()` never called on the accelerator |
| The five G6 fake-accelerator cases plus the bridge's own three | M6-T17 | `pnpm exec vitest run --project=browser test/browser/simulation-layout-engine.test.ts` | 8 cases, 1 file: late injection, mid-run removal, pin survival, `gpuMinNodes`, `setRunning`, and `getEdgePosition` / one-`.catch`-per-promise / `reload` re-applies pins |
| Accelerated equals CPU | M6-T16 | `pnpm exec vitest run --project=default test/algorithms/accelerated-dispatch.test.ts` | 15 cases: same result keys on the same element set on both paths, `precision` f32 vs f64, a throwing method propagates with no fallback |
| No GPU dependency | M6-T17 | the three commands of M6-T17 Step 5 | grep empty, dependency filter `[]`, knip clean |
| The whole element | M6-T18 | `nx run-many -t lint,build --projects=graphty-element`, then `build-storybook` and `http-server graphty-element/storybook-static -p 9026 &`, then the 1+5+4 vitest shards with `STORYBOOK_URL=http://localhost:9026` on the storybook four, then `knip`, then `./tools/prepush.sh` | every command exit 0 |
| Chromatic re-baseline | M6-T18 | the Chromatic build | exactly six changed or new stories, all on Step 2's list |

### 7.3 Risk register for this plan

| Id | Risk | Mitigation |
| --- | --- | --- |
| R-M6-1 | A burst of node merges or attribute writes returns a stale snapshot and fires no `snapshot-replaced`, so a story paints last chunk's data. | DEP-M6-A: the key is the element's own `revision`, not `builder.mutationCount`. M6-T3 Step 1 case 2 asserts `mutationCount` did NOT move while the store DID freeze, so a future "simplification" back to the format's counter fails the test. |
| R-M6-2 | The positions array is made resizable to avoid the copy, and every freeze throws `E_UNSUPPORTED` at the attach. | M6-T2 Step 3's second test asserts the throw for a resizable buffer, at the attach rather than at a user's first freeze. `graph-format/src/columns/column.ts:2532-2539` is the refusal. |
| R-M6-3 | `growPositions` is reordered after the `replaceRole: true` attach and every file coordinate is silently lost -- the layout just places the node itself, with no error. | M6-T3 PLAN DECISION 3 puts the seeding inside `getSnapshot()` above the attach, and Step 1 case 4 asserts a seeded coordinate reached `positions` AND that the seed column is gone afterwards. |
| R-M6-4 | Something adds a worker or `structuredClone` path and hands `snapshot.transferables()` to `postMessage`, detaching the live positions buffer mid-frame. | DEP-M6-D plus `test/data/no-transfer.test.ts`, which scans all of `src/`. graph-format exports no `noteShared`, so there is no in-format defence. |
| R-M6-5 | `accelerator-changed` or `snapshot-replaced` is added to `events.ts` but not to `EventManager.addListener`'s switch, so every subscriber throws `TypeError: Unknown event type` at `EventManager.ts:449-450`. | M6-T4 and M6-T11 each make the four edits one task, and each task's first test asserts `addListener` does not throw. `"layout-changed"` / `"layout-updated"` are kept as the standing counter-example. |
| R-M6-6 | `test/helpers/mockGraph.ts` grows a hand-rolled fake snapshot instead of a real `GraphStore`, and the 27 importers pass against a data model production does not have. | M6-T9 Step 2 builds a REAL `GraphStore` inside the mock, so the mock exercises the production freeze path. |
| R-M6-7 | `graph-settled` fires while a GPU batch is in flight, so a Chromatic screenshot is one readback stale. | Accepted (D-M6-14, DEP-M6-E). `settled` lags by at most one batch and a settled batch moves nodes by less than the settle threshold. If a screenshot ever shows a visibly unsettled frame, the fix is a `flush()` on the bridge awaited before `emitGraphSettled`, which is a contained change to `Graph.ts:547-549`. |
| R-M6-8 | The pre-step loop calls `sim.step(k)` with `k > 256` and a GPU simulation rejects it with `E_INVALID_ARGUMENT`. | M6-T13 PLAN DECISION 4 chunks at `MAX_ITERATIONS_PER_STEP = 256` (`webgpu-graph-algorithms/src/constants.ts:50`, enforced at `src/layouts/force-simulation.ts:1026-1032`): 15000 becomes 59 awaited batches, not 15000 and not one. No STORY exercises this -- the stories with a large `preSteps` are `ngraph` (`stories/NodeStyles.stories.ts:42`) and `d3` (`stories/Layout.stories.ts:257`), neither of which is a `SimulationType`, and the FA2 / Spring stories take the `stories/helpers.ts:303` default -- so the evidence is M6-T13 Step 1's last two cases, which assert the batch sizes `256, 256, 188` for `preSteps: 700` and a single batch before an early `isSettled` break. |
| R-M6-9 | A Chromatic story moves that is NOT on M6-T18 Step 2's list, and the accepter accepts it because the job is red and the PR is blocked. | Step 2 names the six and says explicitly to reject anything else. `ngraph` and `d3` never take the simulation branch, so their stories are the control. |
| R-M6-10 | An accelerated adapter writes a result to a DIFFERENT element set than the CPU branch (e.g. only path members get `isInPath`), and every `!= \`null\`` selector's match set changes with no test failing. | M6-T16 PLAN DECISION 3 and its dispatch test assert key-set AND element-set equality between the two branches, not just value equality. The root `CLAUDE.md` algorithm-style rule is what this protects. |
| R-M6-11 | M8a ships fewer than six `indexed.*` ports, or ships them with different names, and M6-T16 has nothing to call. | M6-T16 touches five adapters, each a two-line edit, and each is independent: an adapter whose port is missing simply stays on `fromSnapshot` from M6-T8 and moves in a later PR. E0 is unaffected either way, which is why D-M6-1 splits the PRs. |
| R-M6-12 | A commit in this phase needs a scope `tools/commit-changes.sh` rejects. | M6's scopes are `graphty-element` and `docs`, both in that script's `VALID_SCOPES` (`tools/commit-changes.sh:468-469`). The script's list is STALE -- it omits `graph-format`, `graph-io` and `webgpu-graph-algorithms`, which `commitlint.config.js:8-25` accepts -- so a phase that needs one of those three must fix the script first (scope `tools`). That edit is owned by **Task M8b-T1 Step 1** of `design/webgpu/plans/2026-09-19-webgpu-m8b-gpu-spmv.md`; the M8a and M7 plans consume it as a precondition and this plan does not need it at all. If M6 is executed before that fix lands and a `graph-format`-scoped commit somehow becomes necessary, STOP and ask the owner to land Task M8b-T1 Step 1 -- do not apply a second copy of the same two-line edit here. |

### 7.4 Size roll-up

| Task | What | Size |
| --- | --- | --- |
| M6-T1 | dependency, peer range, four config fields | 0.5-1 ed |
| M6-T2 | `ElementPositions` | 1-1.5 ed |
| M6-T3 | `GraphStore` | 1.5-2 ed |
| M6-T4 | the `snapshot-replaced` event, four edits | 0.5 ed |
| M6-T5 | `Node.index`, `Node.pinned`, `Edge.index` | 0.5-1 ed |
| M6-T6 | `DataManager` on the store; `EdgeMap` deleted | 3-4 ed |
| M6-T7 | the freeze point; `runAlgorithmsOnLoad` | 1-1.5 ed |
| M6-T8 | `fromSnapshot`; 21 adapters; two dead modules deleted | 2-3 ed |
| M6-T9 | the test-helper migration | 2-3 ed |
| M6-T10 | the engine contract; the E0 green check | 2-3 ed |
| **E0 total** | | **14.5-20.5 ed, quoted as 15-21 ed** |
| M6-T11 | the fake accelerator; `Graph.accelerator` and the release list | 1.5-2 ed |
| M6-T12 | `SimulationLayoutEngine` | 2-3 ed |
| M6-T13 | re-registration, schemas, the three knobs | 2-3 ed |
| M6-T14 | `setRunning`, drag and pin | 1-1.5 ed |
| M6-T15 | the D28 mass role column | 1-1.5 ed |
| M6-T16 | five adapters through `accelerated()` | 1.5-2 ed |
| M6-T17 | the two GPU stories, the eight G6 cases green together | 1.5-2.5 ed |
| M6-T18 | re-baseline, the G6 record, the commits | 1-2 ed + owner |
| **E1 total** | | **11.5-17.5 ed, quoted as 12-18 ed including the owner time of M6-T18** (the fake accelerator moved from M6-T17 to M6-T11 with its 0.5 ed; the total is unchanged) |
| **M6 total** | | **27-39 ed** |

The design quotes "8-10 ed for E1 across the three packages, on top of E0, which the design does not size" (`design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3252`). The element's share of that 8-10 is what this plan sizes at 12-18; the layout and algorithms shares are M5's and M8a's. E0's 15-21 is this plan's own number, and it is the first one anybody has put on it.

---

## 8. Self-review

Run by the plan author before handing this document over, per the writing-plans discipline.

### 8.1 Spec coverage -- every deliverable in the integration plan's M6 row has a task

The row is `design/webgpu/plans/2026-09-16-graphty-monorepo-integration.md:3248-3249`. Each clause, and the task that owns it:

| Clause of the M6 row | Task |
| --- | --- |
| E0: `DataManager` owns one `GraphBuilder` for the graph's life | M6-T3, M6-T6 |
| E0: an element-owned `positions: Float32Array(3 * capacity)` attached by reference as the `position` column after every freeze | M6-T2, M6-T3 |
| E0: `getSnapshot()` | M6-T3 (the key is DEP-M6-A) |
| E0: `dm.undirected(s)` | M6-T3; consumers in M6-T8 and M6-T10 |
| E0: `snapshot-replaced { previous, next, report }` | M6-T4 (typed event, D-M6-7) |
| E0: `Node.index` | M6-T5; walked on remap in M6-T6 |
| E0: `LayoutManager` calls `engine.load(dm.undirected(getSnapshot()).snapshot, positions)` / `engine.reload(...)` | M6-T10 |
| E0: `toAlgorithmGraph` and `EdgeMap` retired | M6-T8 (43 occurrences), M6-T6 (`EdgeMap`) |
| E1 item 1: `Graph.accelerator`, `setAccelerator()`, `accelerator-changed` and its `LayoutManager` consumer | M6-T11 (surface), M6-T12 Step 3 (consumer) |
| E1 item 2: the `snapshot-replaced` release list | M6-T11 PLAN DECISION 3 |
| E1 item 3: adapters through `accelerated(...)` with ONE result-writing loop | M6-T16 |
| E1 item 4: the `SimulationLayoutEngine` bridge, `step()` once per frame, `.catch` once per distinct promise | M6-T12 |
| E1 item 5: `NodeBehavior` `beginDrag` / `endDrag` | M6-T14 |
| E1 item 6: `forceatlas2` / `spring` re-registered, `gravity` nonnegative, `weightPath` live, `scalingFactor` -> `scale` | M6-T13 |
| E1 item 7: `iterationsPerStep`, `maxInFlight`, `gpuMinNodes` | M6-T13 (the first two), M6-T12 Step 3 (`gpuMinNodes` evaluation) |
| E1 item 8: the fake accelerator itself; the stories `Layout/ForceAtlas2 (GPU)` and `Layout/Spring (GPU)`; no GPU dependency | M6-T11 Step 1 (the fake), M6-T17 (the stories and the dependency check) |
| E1 item 9: `setRunning(running)` with `reheat()` on resume | M6-T14 |
| E1 item 10: `nodeMass` resolved into a role column (D28) | M6-T15 (DEP-M6-H). `nodeSize` gets no column: `@graphty/layout` defers `adjustSizes` (`layout/src/simulation/forceatlas2.ts:25`), so nothing would read it -- M6-T15 PLAN DECISION 3 states the reversal condition |
| Gate G6, element part: the five fake-accelerator cases, the distributional metrics, the Chromatic re-baseline | M6-T12 Step 1 writes all five (plus the bridge's own three); M6-T12, M6-T13 and M6-T14 turn them green in that order; M6-T17 Step 1 records all eight green TOGETHER; M6-T18 writes the record, which states plainly what M6 does NOT measure, and owns the re-baseline |

Three clauses of the design's own G6 string are NOT satisfied by this phase and the G6 record says so in its section 2, rather than claiming them: "the story on the real GPU locally settles, drags and pins" and "the same story on the CPU simulation looks statistically the same (the 11.4 distributional metrics)" are Task M6-T20's per section 0.0 (design 9.1 forbade the element a dependency on the GPU package; that is superseded); and "the GPU package's structural mirrors match the real interfaces (type test run manually)" is M5b's and M8a's, because the mirrors are in `webgpu-graph-algorithms/src/types/accelerator.ts`, which this phase does not touch.

### 8.2 Placeholder scan

Run over the finished document: no `TBD`, no `TODO`, no `XXX`, no "add appropriate error handling", no "similar to Task N", no "write tests for the above". The two constructs that look like placeholders and are not:

- `<...>` inside the G6 record template of M6-T18 Step 3. That is the house convention for a gate record (`design/webgpu/plans/2026-09-15-webgpu-p1.md:23712-23796` uses exactly it), and the step says "every `<...>` cell is a number or a string copied from the named command's output".
- `2026-09-DD` in the same template, which the committing step fills with the commit date -- the convention the integration plan uses at `:2162`.

Four places state a scope deliberately rather than deferring work, and each names the task or phase that owns the remainder: DEP-M6-G (17 adapters on the bridge, one line each for a later port PR), D-M6-6 with DEP-M6-M (parallel edges, with a decision record and a reversal condition), DEP-M6-J (`idCoercion` ships inert; IO1 owns it), and M6-T17 Step 4 (the distributional metrics, owned by M7). None of them is a placeholder: each is a boundary with a named owner.

Two sections specify work by TABLE rather than by listing every file's code, and both are complete specifications rather than "similar to the above":

- M6-T8 Step 3 -- 21 adapters, one two-line edit each. The full code is written once in Step 2 (`fromSnapshot`) and the table gives the exact option object and exact snapshot expression per file, with today's line number.
- M6-T13 Step 2's option-mapping table -- one row per element option, naming the target field or stating explicitly that the option is DROPPED and why (`nodeSize` because `@graphty/layout` defers `adjustSizes`; `pos` because it has no counterpart and is instead seeded through `dm.positions.fillUnplaced`).

Every "write the failing test" step in this document carries the test's actual source, not a description of it. The two function bodies in M6-T6 Step 2 (`ingestNode`, `resolveEdgeWeight`) are written out in full in the same block that declares them -- an earlier draft deferred them to a "fill the bodies" step, which was a placeholder and is gone. Four steps carry a short "if this symbol is spelled differently in the code base, copy the spelling from <named neighbouring file>" note: those are about an accessor NAME this plan could not verify without running the code (`graph.getNodeBehavior()`, `createTestGraph`, `AlgorithmGraph`'s iterators, the Storybook decorator signature), never about what the test asserts, and each names the file to copy from.

### 8.3 Type consistency across this plan's own tasks

Checked pairwise between producing and consuming tasks:

- `ElementPositions` (M6-T2) is produced as a CLASS and consumed as a class by `GraphStore` (M6-T3 `readonly positions`), by the engine contract (M6-T10: `load?(snapshot, positions: ElementPositions)`), and by the bridge (M6-T12: `load(snapshot, positions: ElementPositions)`). It is NOT an `F32` anywhere -- the raw array is reached only through `positions.view(n)`, and only in two places: the attach in `GraphStore.getSnapshot()` and the `sim.load(snapshot, positions.view(n))` call in the bridge. That is deliberate: `remapArray` replaces the array object (M6-T2 PLAN DECISION 3), so nothing may hold a raw `F32` across a freeze. Design 9.4 item 4's sketch types the parameter `F32`; this plan's `ElementPositions` is the stable handle the sketch lacks, and the bridge unwraps it at the one call that needs an array.
- `SnapshotReplacement` (M6-T3) has fields `previous: GraphSnapshot | null`, `next: GraphSnapshot`, `report: FreezeReport`. The event interface (M6-T4) carries the same three plus `graph`, and `emitSnapshotReplaced(graph, previous, next, report)` takes them positionally in that order. `Graph`'s release list (M6-T11) and `LayoutManager`'s reload (M6-T10) both read the event, not the store callback, so there is one consumer shape.
- `GraphStoreOptions.onNodeRemap(remap: U32)` (M6-T3) is consumed by `DataManager.walkNodeRemap(remap: U32)` (M6-T6), which writes `Node.index: number` (M6-T5). `remap[n.index]` can be `undefined` under `noUncheckedIndexedAccess`, so the walk is `n.index = remap[n.index] ?? INVALID_INDEX`, which is what M6-T6's table specifies.
- `fromSnapshot(s, options)` (M6-T8) returns `AlgorithmGraph`, the same type `toAlgorithmGraph` returned. `GraphConverterOptions` has FOUR keys (`graphConverter.ts:12-26`) and `SnapshotGraphOptions` has THREE: the three any call site actually passes -- `directed`, `allowParallelEdges`, `addReverseEdges` -- keep the same names, defaults and semantics, so every one of the 21 call sites in M6-T8 Step 3 type-checks with its option object copied verbatim. The fourth, `weightAttribute` (default `"value"`, `graphConverter.ts:15-16`, `:35`), is dropped on purpose: no adapter passes it (verified across all 21), and the weight is now resolved once at ingestion by `resolveEdgeWeight` (M6-T6 PLAN DECISION 6) and read back through `s.weights[s.edgeToArc[e]]`. That is the one genuinely behaviour-changing part of the substitution, and it is DEP-M6-C's probe order that now decides every weight where the `value` key decided it before.
- `SimulationHost` (M6-T12) is the only thing the bridge imports from the manager side, and `iterationsPerStep(): number` is where M6-T13 PLAN DECISION 3's `opts.iterationsPerStep ?? opts.stepMultiplier` resolution lands. The bridge never reads the config itself.
- `GraphAccelerator` (M6-T11) is `AlgorithmAccelerator & LayoutAccelerator & { release?(s): void; dispose?(): void }`. `release` is OPTIONAL because `LayoutAccelerator.release?` is optional in `@graphty/layout` (`layout/src/simulation/types.ts:77`) and design 9.3 makes every accelerator method optional; requiring it in the intersection would reject a conforming GPU accelerator at M7's `attachAccelerator` and would throw at run time in the release path. `createSimulation(type, options, accelerator)` (M5) takes `LayoutAccelerator | null | undefined`, and `accelerated(acc)` (M8a) takes `AlgorithmAccelerator | null | undefined`; an intersection is assignable to both, so `graph.accelerator` passes to each without a cast. `createFakeAccelerator()` (M6-T11 Step 1) returns a `GraphAccelerator`, so the same object satisfies both call sites in the tests and in the stories -- which is D-M6-13's whole point.
- CROSS-PLAN: every symbol this plan takes from `@graphty/algorithms` is spelled as `design/webgpu/plans/2026-09-19-webgpu-m8a-algorithms-seam.md` Task M8a-T8 declares it, and M8a is the authority where the two ever differ. `accelerated(acc: AlgorithmAccelerator | null | undefined): AcceleratedAlgorithms` (M6-T16 Interfaces); `AcceleratedAlgorithms`' six methods `pageRank(s, options?: PageRankOptions)`, `sssp(s, source, options?: SsspOptions)`, `breadthFirstSearch(s, source, options?: BfsOptions)`, `connectedComponents(s)`, `weaklyConnectedComponents(s)`, `minimumSpanningTree(s, options?: MstOptions)`; and the five accelerator result shapes M6-T16 Step 1's fixture table spells out -- `PageRankResultLike`, `BfsResultLike`, `SsspResultLike`, `LabelResultLike`, `MstResultLike`. `AlgorithmAccelerator.kind: string` is the one non-optional member; every method is optional, which is what lets M6-T16's test spread a single method onto the fake.
- `SimulationLayoutEngine` (M6-T12) implements every `abstract` member of `LayoutEngine` (`LayoutEngine.ts:50-63`): `init`, `addNode`, `addEdge`, `getNodePosition`, `setNodePosition`, `getEdgePosition`, `step`, `pin`, `unpin`, `get nodes`, `get edges`, `get isSettled`. `addNode` / `addEdge` are deliberate no-ops and ARE reached, because `_setLayoutInternal` calls `engine.addNodes(nodeArray); engine.addEdges(edgeArray);` (`LayoutManager.ts:147-148`) before this plan's `load()`. It also overrides `get type()`, because the inherited one reads `(this.constructor as typeof LayoutEngine).type` (`:89-90`), which is `undefined` for a class the registry never registered.
- `stepAsync(iterations: number): Promise<void>` is produced by M6-T12 and consumed ONLY by M6-T13's pre-step loop, through the feature test `"stepAsync" in engine`. It is not on the abstract class: the base declares `abstract step(): void` (`LayoutEngine.ts:56`), which takes no count and returns nothing awaitable, so the pre-step loop could not be written against `step` at all. `reheat(): void` is produced by M6-T12 and consumed by M6-T14's `Graph.setRunning(true)` behind `"reheat" in engine`.
- `simulationOptions(layoutOpts, behaviorLayout)` is produced by M6-T13 Step 2 with TWO parameters and consumed by M6-T12 Step 3, which runs FIRST. M6-T12 Step 3 therefore writes the call against the two-argument signature and carries a named local stub until M6-T13 replaces it; the arity is the same in both tasks. The second parameter exists because `iterationsPerStep` and `maxInFlight` live in `behavior.layout` (`layout/src/simulation/types.ts:11-19` is the target shape), not in `graph.layoutOptions`.
- `DataManager.positions` is produced by M6-T6 (a getter over the private `store`) and consumed by M6-T7 Step 3, M6-T9 Step 2, M6-T10 PLAN DECISION 3 and M6-T12 Step 3. It is an `ElementPositions`, not an `F32`, for the reason in the first bullet.
- `Node.index` and `Edge.index` (M6-T5) are both `number` defaulting to `INVALID_INDEX`, which is `4294967295` -- a u32 sentinel, not `-1`. Every comparison in this plan is `=== INVALID_INDEX` or `!== INVALID_INDEX`, never `< 0`.

Three defects were found and fixed IN THE CODE BLOCKS themselves, not described underneath them:

1. M6-T2 Step 3's attach test originally compared `column.data` against a boolean expression. The block now carries `assert.strictEqual((column.data as F32).buffer, p.view(snapshot.nodeCount).buffer)`.
2. M6-T3's `seedUnplaced` originally called `seed.isSet?.(i)`. Both forms exist -- `Column.isSet(row)` (`graph-format/src/types/columns.ts:366`, implemented at `columns/column.ts:580`) and `AttributeTable.isSet(name, row)` (`types/columns.ts:625`, `columns/table.ts:248`) -- so the original was not a missing method; the defect was the OPTIONAL CALL. `seed` is typed `Column | null`, and under `?.` a missing method yields `undefined`, `!undefined` is `true`, and every row with any x would be seeded: the exact inverse of the guard, silently. The block now carries `!snapshot.nodes.isSet(SEED_COLUMN, i)`, which also avoids threading a narrowed second handle, and the code comment says why the optional call must never come back.
3. `ElementPositions.grow` left the SPARE CAPACITY zero-filled. A `Float32Array` is zero-filled on allocation, and the growth branch filled NaN only from `this.array.length`, so rows between the live count and the old capacity read back as PLACED at the origin the moment `grow()` reached them -- `GraphStore.seedUnplaced` would then skip them and every importer coordinate for those nodes would be lost, with no error. The constructor now does `this.array.fill(Number.NaN)` and the growth branch fills from `POSITION_COMPONENTS * this.rows`, and M6-T2 Step 1 carries a case (`new ElementPositions(4); grow(2); write(0,...); grow(5)`) that fails against the old code.
