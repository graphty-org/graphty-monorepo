# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/layout package.

Read [design/layout/agent-reference.md](../design/layout/agent-reference.md) before changing `src/simulation/`: it
holds the full contract of the simulation seam and of the two CPU simulation classes.

## Project Overview

@graphty/layout is a TypeScript graph layout library that ports NetworkX Python algorithms to JavaScript. It provides 15+ layout algorithms supporting both 2D and 3D positioning.

## Package Structure

```
layout/
├── src/
│   ├── indexed/              # The fifteen layouts, one file per layout (or pair), over a GraphSnapshot
│   ├── simulation/           # Steppable ForceAtlas2 and Fruchterman-Reingold simulations, the accelerator seam
│   ├── positions.ts          # LayoutResult and its conversions (PositionMap, the scene column, rescaleInPlace)
│   ├── algorithms/
│   │   └── optimization/     # L-BFGS, line search, Kamada-Kawai solver
│   ├── types/                # Node, Edge, Graph (the duck type toLayoutSnapshot reads), PositionMap
│   └── utils/                # NumPy-like helpers, the seeded generator, the deprecated rescaleLayout (use rescaleInPlace)
├── test/                     # Vitest tests; test/layouts/ per layout family, test/types/ compile-only
└── stories/                  # Storybook stories, one per layout
```

## Essential Commands

```bash
# Development
npm run dev              # Watch mode for TypeScript compilation
npm run build            # Build TypeScript to dist/
npm run build:bundle     # Create bundled ES module
npm run build:all        # Build both TypeScript and bundle

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run coverage         # Run with coverage
npm run coverage:preview # Serve coverage report (start it through servherd with PORT={{port}})

# Linting
npm run lint             # ESLint, tsc, and the nodenext consumer check (needs build:all first)

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

In a git worktree under `.worktrees/`, build `webgpu-graph-algorithms` and `graphty-element` in that worktree
before the root `pnpm run docs:build`. Without their `dist/`, module lookup climbs out of the worktree into the main
checkout's `node_modules`, and TypeDoc fails on two copies of the graph-format types. CI builds everything first.

## Layout Function Interface

```typescript
// Layouts in @graphty/layout take a snapshot and return a flat position array:
type Layout = (snapshot: GraphSnapshot, options?: CommonLayoutOptions) => LayoutResult;
// LayoutResult = { positions: Float32Array; dim: 2 | 3; n: number }, row i = node index i
```

## Graph generators

Layout has no graph generators since 2.0.0: `@graphty/graph-samples/generators` has them, returning a `SampleGraph`
that `fromEdgeArrays` from `@graphty/graph-format` freezes into a snapshot. graph-samples is a dev dependency, used
by the tests only.

## Layouts

`src/indexed/` holds every layout (graph-format design 14.3), exported from the barrel at the top level
(`circular`, `forceAtlas2`, ...) and, until 3.0.0, through the deprecated `indexed` namespace, which is the same
functions. Every public function has the same signature, `(snapshot: GraphSnapshot, options?: XOptions) => LayoutResult`: node
indices in, a flat `dim`-stride `Float32Array` in node-index order out. Options that name nodes take indices, a
`NodeMask` or a node column name, never ids. The fifteen: `arf`, `bfs`, `bipartite`, `circular`, `forceAtlas2`,
`fruchtermanReingold`, `grid`, `kamadaKawai`, `multipartite`, `planar`, `radial`, `random`, `shell`, `spectral`,
`spiral`. `test/types/exports.test-d.ts` pins each signature, the `indexed` namespace's member list and the
absence of every name 2.0.0 removed; a changed parameter list, options type or return type fails the test run
(vitest `typecheck`, with `tsconfig.types.json`).

- `common.ts`: `CommonLayoutOptions` (`dim`, `scale`, `center`, `seed`), `resolve()` (validate and default them),
  `result()` (f64 rows -> the f32 `LayoutResult`).
- `start.ts`: `layoutDim()` and `startColumn()`, the stride-3 start column the force layouts seed with
  `seedPositions` from a caller's `pos`.
- Geometric and structural layouts (`circular`, `grid`, `random`, `shell`, `spiral`, `spectral`, `planar`,
  `radial`, `bfs`, `bipartite`, `multipartite`) split into a `xRows()` / `xLayers()` helper that computes f64 rows
  (or node-index groups) and the public function that resolves options and calls it. A layout that reads edges takes
  a directed snapshot as its undirected derived graph.
- `force.ts`: `forceAtlas2` and `fruchtermanReingold` run the steppable CPU simulations (`src/simulation/`) to the
  end of their budget, then rescale.
- `kamada-kawai.ts`: `kamadaKawai` computes its distance matrix over the CSR (or takes `dist`) and runs the existing
  solver.
- `arf.ts`: `arf` is its own loop, unrescaled, as networkx has it.

### Golden fixtures

Layout 1.x had positional, id-keyed versions of these layouts (`circularLayout(G, scale, center, dim)` and the rest).
Before 2.0.0 removed them, their outputs were recorded into `test/layouts/fixtures/*.golden.json` (rows in node-index
order), and `test/layouts/` checks the layouts against those fixtures (`goldenFile` / `matchesGolden` in
`test/layouts/golden.ts`). A fixture cannot be re-recorded: the code that produced it is gone. A deliberate change of
output replaces the fixture's values and says why in the commit.

## Simulations

`src/simulation/` is the layout seam of the WebGPU design (`design/webgpu/webgpu-acceleration-plan.md` section 9.3;
graph-format design 14.3 `LayoutSimulation`): steppable force layouts that run over a `@graphty/graph-format`
snapshot and a position array the CALLER owns. The barrel (`src/index.ts`) re-exports it. Nothing in it imports the
GPU package: the dependency direction is graph-format <- layout <- graphty-element <- the app, and
graphty-element's `./webgpu` entry point is the only importer of `@graphty/webgpu-graph-algorithms`
(`design/decisions/2026-09-19-graphty-element-owns-webgpu.md`).

### The seam

Full contract: the agent reference above. The rules:

- `LayoutSimulation` (`types.ts`): `load(snapshot, positions)`, `step(iterations?)`, `settled`, `setFixed(mask)`,
  `setPosition(index, x, y, z)`, `dispose()`. `positions` is the owner's stride-3 `Float32Array`, written in place
  by every `step()`. CPU `step()` returns `void`, a GPU one a `Promise`, so a caller that may hold either awaits it.
- `load()` requires an UNDIRECTED snapshot and throws on a directed one.
- `toLayoutSnapshot(G, weightAttr?)` walks a duck-typed graph on EVERY call and never caches by object identity (a
  mutated object would return a stale snapshot).
- `Lcg` (`seed.ts`) is `RandomNumberGenerator` bit for bit, and the GPU package carries an identical copy, so the
  same seed gives the same start on CPU and GPU: change both or neither. Seeding never changes a finite component.

### Units

A simulation runs in LAYOUT units (FA2's `[-1, 1)` seed scale; FR's `[0, 1)`) in f64 scratch; the owner's array
holds SCENE units in f32 (design 7.18). `load()` converts every row as `(v - center[axis]) / scale` (z forced to 0 in
2D); `step()` writes every FREE node back as `layout * scale + center[axis]` (z = `center.z` in 2D). A fixed row is
never written: its scene value is the owner's. Nothing rescales the output per step -- the one-shot
`forceAtlas2`'s unit-ball normalisation is NOT reproduced by the steppable classes -- so a pinned or dragged
node stays where the user put it and `scale` / `center` are the only mapping between the two unit systems.

### The two CPU classes

Full detail: the agent reference above. The rules:

- `ForceAtlas2Simulation` (`forceatlas2.ts`) is a PORT of the GPU package's f64 reference
  `webgpu-graph-algorithms/test/oracle/forceatlas2.ts`, which is its SPEC. Its formulas and fold order are the
  oracle's line for line, and every formula line keeps the oracle's citation so the two files diff by formula.
  `compat: "paper"` (default) is published ForceAtlas2; `compat: "networkx"` reproduces NetworkX 3.4.2 and is checked
  against `test/simulation/fixtures/networkx/`. `barnesHutOptimize` stays off by default so the oracle parity holds.
- `FruchtermanReingoldSimulation` (`fruchterman-reingold.ts`) is layout 1.x's `fruchtermanReingoldLayout` loop made
  index-based, formulas unchanged. `cooling: "adaptive"` uses the constants in `constants.ts`, pinned to the same
  literals in webgpu-graph-algorithms' `fr-adaptive.test.ts`.
- Both settle by the design 7.17 rule, and no iteration ever runs while settled. Adding pins never reheats; an
  unpin or `setPosition` does. Calls before `load()` or after `dispose()` throw.

### The dispatcher

`createSimulation(type, options?, accelerator?)` (`create-simulation.ts`) returns the accelerator's method when it
has one and the CPU class otherwise. It is evaluated BEFORE any GPU work and never after it (design 2.4: the only
branch that chooses the CPU); a thrown accelerator error propagates -- there is no fallback.

| `SimulationType`                    | CPU class                                 | Accelerator method    |
| ----------------------------------- | ----------------------------------------- | --------------------- |
| `"forceatlas2"`                     | `ForceAtlas2Simulation`                   | `forceAtlas2`         |
| `"fruchtermanReingold"`, `"spring"` | `FruchtermanReingoldSimulation`           | `fruchtermanReingold` |
| `"spring-electrical"`               | none in v1: throws without an accelerator | `springElectrical`    |

### Tests

`test/simulation/`, run one file at a time from `layout/` with `pnpm exec vitest run test/simulation/<file>.test.ts`:

- `seed.test.ts`: the LCG constants and 10,000 draws against `RandomNumberGenerator` (the W1 cross-test); the
  seeding rules (index order, the finite-rows box, `scale` / `center`, `"fr"`, validation).
- `snapshot.test.ts`: `toLayoutSnapshot` over a duck graph (walked again after a mutation), a node list, `getEdgeData` weights,
  a directed and an undirected snapshot.
- `inputs.test.ts`: every form of `resolveNodeVector` / `resolveWeights` and the error cases.
- `create-simulation.test.ts`: delegation to the accelerator, the CPU path, `"spring"`, a throwing accelerator, and
  `"spring-electrical"` without one.
- `forceatlas2.test.ts`: determinism and batch independence, the force-law variants, the NetworkX trajectories in
  `networkx` compat (`fixtures/networkx/*.json`, the same fixtures the GPU package pins), weights and mass forms,
  self-loops and parallel arcs, the coincident kick, `scale` / `center`, settlement, pins and drags, option
  validation.
- `fruchterman-reingold.test.ts`: one `step()` equals one iteration of layout 1.x's `fruchtermanReingoldLayout` loop
  on the same start, recorded as a golden fixture (also with a self-loop, a parallel edge and an isolate); `k` / `scale` / `center`; 2D and 3D; the NaN-row
  seeding; the `fixed` forms; settlement by the window and by the budget; reloads.
- `fruchterman-reingold-adaptive.test.ts`: `cooling: "adaptive"` against an independent transcription of the rule on
  a two-node pair, settling before the cap, the difference from `"linear"`, the cap, `reheat()`, validation.

Use `assert`, not `expect`, as everywhere else in the package.

## Testing Guidelines

- Use `assert` instead of `expect` for test assertions
- Tests of the layouts are in `test/layouts/`, by family (geometric, structural, force and Kamada-Kawai)
- Build test graphs with `fromEdgeArrays` or the `@graphty/graph-samples/generators`
- All layouts should work with both 2D (`dim: 2`) and 3D (`dim: 3`)

### Test projects

- Single test project (Node.js)

## Key Design Principles

- **NetworkX compatibility**: Algorithms match NetworkX Python behavior where possible
- **Snapshots in, flat arrays out**: every layout takes a `GraphSnapshot` and returns a `LayoutResult`;
  `toLayoutSnapshot` turns any object providing `nodes()` and `edges()` into a snapshot
- **3D support**: All layouts support 3D when `dim: 3` is specified
- **Deterministic**: Layouts produce consistent results with the same seed
- **Engine-independent**: never call `Math.log`, `Math.exp`, `Math.sin`, `Math.cos`, `Math.acos` or another
  "implementation-approximated" Math function in a layout; use `detLog`, `detExp`, `detSin`, `detCos`, `detAcos`,
  `detHypot` and `detPow` from `@graphty/graph-format` (fdlibm ports, bit-identical in every engine). Engines change those functions' last bit
  between versions, and a force layout amplifies it into a different drawing (issue #2430). `Math.sqrt` and the four
  basic operations are exact by the spec. `test/det-math.test.ts` runs every layout with those Math functions
  throwing and pins seeded positions

## Adding a New Layout

1. Create the implementation in `src/indexed/`, with the `(snapshot, options?) => LayoutResult` signature
2. Export it from `src/indexed/index.ts` and from the explicit list in `src/index.ts`
3. Pin its signature in `test/types/exports.test-d.ts`
4. Add tests in `test/layouts/`
5. Add a story in `stories/`
6. Add a checked example to `README.md` and to its family's guide page in `docs/guide/` (see below)

## Documentation and Its Samples

`docs/` is the layout section of graphty.app (`https://graphty.app/docs/layout/`): `index.md`, the guide pages in
`docs/guide/` and the API overview `docs/api/index.md`. `tools/copy-docs-content.js` copies it into the root `docs/`
site, whose sidebar is in `docs/.vitepress/config.ts`; a new guide page needs an entry there.

`test/docs/doc-samples.test.ts` type-checks and runs every ```typescript block of `README.md` and of every
`docs/guide/*.md`, and fails when a block is not marked `<!-- doc-check -->` just before it. A `console.log(...)`
with a trailing `// comment` must print what the comment starts with. Keep each block self-contained, with its own
imports.

## Distribution

- **Main entry**: `dist/layout.js` (bundled ES module)
- **Types**: `dist/layout.d.ts`
- Every relative import in `src/` carries `.js` (`./types/index.js`, not `./types`). `tsconfig.json` checks under
  `moduleResolution: nodenext`, which enforces it, and `npm run typecheck:consumer` compiles
  `test/consumer/nodenext.ts` against the built `dist/` the way a Node ESM consumer does. Without the extensions
  the published typings fail to resolve under nodenext (issue #958)
- Always run `npm run build:all` before publishing
