# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/layout package.

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
│   └── utils/                # NumPy-like helpers, the seeded generator, rescaleLayout
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
npm run lint             # TypeScript type checking

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

In a git worktree under `.worktrees/`, build `webgpu-graph-algorithms` and `graphty-element` in that worktree
before the root `pnpm run docs:build`. Without their `dist/`, module lookup climbs out of the worktree into the main
checkout's `node_modules`, and TypeDoc fails on two copies of the graph-format types. CI builds everything first.

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

- `LayoutSimulation` (`types.ts`): `load(snapshot, positions)`, `step(iterations?)`, `settled`, `setFixed(mask)`,
  `setPosition(index, x, y, z)`, `dispose()`. `positions` is the owner's stride-3 `Float32Array` of length
  `3 * nodeCount`, read at `load()` and written in place by every `step()`. The CPU classes return `void` from
  `step()`; a GPU implementation returns a `Promise` (the readback), so a caller that may hold either awaits it.
  `load()` requires an UNDIRECTED snapshot (both arcs of every edge present) and throws on a directed one.
- `LayoutAccelerator`: what an injected GPU implements. Every method (`forceAtlas2`, `fruchtermanReingold`,
  `springElectrical`, `release`, `dispose`) is optional; only the implemented ones exist.
- Options: `CommonLayoutOptions` (`dim`, `scale`, `center`, `seed`; graph-format design 14.3), `SimulationOptions`
  (`settleThreshold`, `settleWindow`, `iterationsPerStep`, and `maxInFlight`, which only a GPU simulation reads), and
  per type `ForceAtlas2Options`, `FruchtermanReingoldOptions`, `SpringElectricalOptions`. `SimulationType` is
  `"forceatlas2" | "fruchtermanReingold" | "spring" | "spring-electrical"`; `"spring"` is graphty-element's name for
  Fruchterman-Reingold.
- `toLayoutSnapshot(G, weightAttr?)` (`snapshot.ts`): the undirected snapshot of any layout input. A duck-typed
  `nodes()` / `edges()` graph is walked through a `GraphBuilder` on EVERY call (weights read through `getEdgeData`
  when `weightAttr` is given); it is never cached by object identity, because a mutated object would return a stale
  snapshot. A node list becomes an edgeless snapshot; an undirected snapshot is returned as is; a directed one yields
  ONE cached `toUndirected()` copy.
- `src/positions.ts`: `LayoutResult` (`{ positions, dim, n }`, a flat `dim`-stride `Float32Array` in node-index
  order, layout units) and its conversions: `toPositionMap` / `fromPositionMap` (the id-keyed map; `fill`
  writes the row of a node the map does not give), `toPositionColumn` / `fromPositionColumn` (the stride-3
  scene-unit column: `v * scale + center`, a 2D row's z is the centre's z) and `rescaleInPlace` (`rescaleLayout` over
  a flat array, f64 scratch, within 1e-6 of it).
- `resolveNodeVector(spec, s, fallback)` / `resolveWeights(spec, s)` (`inputs.ts`): the per-node and per-arc inputs
  resolve by graph-format ROLE. A node vector is `null` -> the role-`mass` column when present, else `fallback(i)`; a
  `Float32Array(n)` as given; a numeric node column by name; or the legacy id-keyed record (CPU only: the GPU
  package rejects that form and graphty-element converts it into a role column). Weights are `true` -> the
  snapshot's arc weights (`null` when unweighted); a numeric edge column by name, expanded to arcs; `false` / `null` ->
  unweighted.
- `seedPositions(s, positions, seed, dim, scale, center, range)` and `Lcg` (`seed.ts`): the canonical seeding of the
  NaN rows of the owner's array in index order, one LCG draw per missing component, uniform in `[-1, 1)` layout
  units per axis (`range: "fa2"`; `"fr"` is `[0, 1)`) or inside the box of the finite components when some rows are
  already placed, written as `v * scale + center[axis]`; finite components are never changed. `Lcg` is the package's
  own `RandomNumberGenerator` (`utils/random.ts`) bit for bit, and the GPU package carries an identical copy, so the
  same seed gives the same start on the CPU and the GPU.

### Units

A simulation runs in LAYOUT units (FA2's `[-1, 1)` seed scale; FR's `[0, 1)`) in f64 scratch; the owner's array
holds SCENE units in f32 (design 7.18). `load()` converts every row as `(v - center[axis]) / scale` (z forced to 0 in
2D); `step()` writes every FREE node back as `layout * scale + center[axis]` (z = `center.z` in 2D). A fixed row is
never written: its scene value is the owner's. Nothing rescales the output per step -- the one-shot
`forceAtlas2`'s unit-ball normalisation is NOT reproduced by the steppable classes -- so a pinned or dragged
node stays where the user put it and `scale` / `center` are the only mapping between the two unit systems.

### The two CPU classes

- `ForceAtlas2Simulation` (`forceatlas2.ts`): a PORT of the GPU package's f64 reference,
  `webgpu-graph-algorithms/test/oracle/forceatlas2.ts` (the SPEC of this class; the oracle stays in the GPU package,
  integration plan D-16 / DEP-E). The formulas are the published ForceAtlas2 of design 7.2 (Jacomy 2014 / Gephi):
  `1/d` repulsion, force-based swing / traction, the K1-K5 stage order, `estimateFactor`, `kickDir` and the 256-lane
  fold order are the oracle's line for line, and every formula line keeps the oracle's citation so the two files
  diff by formula. `compat: "paper"` (the default) is the published algorithm (centroid gravity, fresh global sums
  each iteration); `compat: "networkx"` reproduces NetworkX 3.4.2 `forceatlas2_layout` and is checked against the
  NetworkX fixtures under `test/simulation/fixtures/networkx/`. `compat` is the `ForceAtlas2Simulation` constructor's
  own option (a module-private `ForceAtlas2Options & { compat? }`), absent from the exported `ForceAtlas2Options` and
  therefore not reachable through `createSimulation`'s typed options: `new ForceAtlas2Simulation({ compat: "networkx" })`. Mass is `nodeMass`, else the role-`mass` column,
  else `outDegree + 1`; `weight: true` uses the snapshot's arc weights, a string names an edge column. `nodeSize`,
  `dissuadeHubs`, `seed` and `maxInFlight` are accepted and unused: the CALLER seeds the array with
  `seedPositions` before `load()`. `iterationsDone` and `reheat()` are public beyond the interface. The one-shot `forceAtlas2` layout runs this
  class (`settleThreshold: 0`, every one of `maxIter` iterations) and then rescales.
- `FruchtermanReingoldSimulation` (`fruchterman-reingold.ts`): the loop body of layout 1.x's
  `fruchtermanReingoldLayout` made index-based over the CSR arcs, formulas unchanged
  (`k = 1 / sqrt(n)` unless given; `t` starts at 0.1 and cools by `0.1 / (iterations + 1)`; repulsion `k * k / d`
  over every pair, attraction `d * d / k` per arc, displacement capped at `t`). `load()` seeds the NaN rows itself in
  `[0, 1)` from the `seed` option; `fixed` takes a `NodeMask`, the name of a bool node column, or (when null) the
  role-`fixed` column. The iteration counter IS the temperature index, so `reheat()` restarts at
  `floor(0.7 * iterations)` (a drag or an unpin gets a small temperature and the remaining 30% of the budget).
  `iterationsDone`, `settledCount`, `meanDisplacement`, `rmsRadius`, `temperature` and `reheat()` are public.

Both settle by the design 7.17 rule: `settled` is `iterationsDone >= maxIter` (FR: `iterations`) OR
`settledCount >= settleWindow`, where `settledCount` counts consecutive iterations whose mean FREE-node displacement
is `<= settleThreshold * rmsRadius` (the RMS radius about the centroid, in layout units; defaults `1e-3` and 10). An
empty graph is settled at once and an all-fixed layout (mean displacement 0) after `settleWindow` iterations (FR) or
`settleWindow + 1` (FA2, whose K1 fold processes the previous integrate's partials);
`step(k)` returns immediately when settled and stops mid-batch at the budget or the window, so no iteration ever
runs while settled. Pins and drags (design 7.12, D8):
`setFixed` copies `ceil(n / 32)` mask words and reheats only when a bit went 1 -> 0 (an unpin; adding pins never
reheats); `setPosition` writes the three scene floats into the owner's array at once, converts them into the layout
position and reheats; `reheat()` resets the iteration budget and the settle window and nothing else (FA2's speed and
speedEfficiency keep their state -- in `compat: "networkx"` the accumulated swing / traction sums restart at 1, as the
oracle has it; `load()` is the one call that resets the whole controller). A reload with another node count clears the
pins; the same node count keeps them. `step()`, `setFixed()` and `setPosition()` throw before `load()`; `load()`,
`step()`, `setFixed()`, `setPosition()` and `reheat()` throw after `dispose()`, which is idempotent.

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

Use `assert`, not `expect`, as everywhere else in the package.

## Testing Guidelines

- Use `assert` instead of `expect` for test assertions
- Tests of the layouts are in `test/layouts/`, by family (geometric, structural, force and Kamada-Kawai)
- Build test graphs with `fromEdgeArrays` or the `@graphty/graph-samples/generators`
- All layouts should work with both 2D (`dim: 2`) and 3D (`dim: 3`)

## Key Design Principles

- **NetworkX compatibility**: Algorithms match NetworkX Python behavior where possible
- **Snapshots in, flat arrays out**: every layout takes a `GraphSnapshot` and returns a `LayoutResult`;
  `toLayoutSnapshot` turns any object providing `nodes()` and `edges()` into a snapshot
- **3D support**: All layouts support 3D when `dim: 3` is specified
- **Deterministic**: Layouts produce consistent results with the same seed

## Adding a New Layout

1. Create the implementation in `src/indexed/`, with the `(snapshot, options?) => LayoutResult` signature
2. Export it from `src/indexed/index.ts` and from the explicit list in `src/index.ts`
3. Pin its signature in `test/types/exports.test-d.ts`
4. Add tests in `test/layouts/`
5. Add a story in `stories/`
6. Update the README

## Distribution

- **Main entry**: `dist/layout.js` (bundled ES module)
- **Types**: `dist/layout.d.ts`
- Always run `npm run build:all` before publishing
