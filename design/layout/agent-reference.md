# layout agent reference

Reference material for agents working in `layout/`, moved out of `layout/CLAUDE.md` to keep that file short. The
rules stay in [layout/CLAUDE.md](../../layout/CLAUDE.md); this file holds the detail of the steppable simulations in
`layout/src/simulation/`. Paths are relative to `layout/` unless they say otherwise.

## Simulations

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

### The two CPU classes

- `ForceAtlas2Simulation` (`forceatlas2.ts`): a PORT of the GPU package's f64 reference,
  `webgpu-graph-algorithms/test/oracle/forceatlas2.ts` (the SPEC of this class; the oracle stays in the GPU package,
  integration plan D-16 / DEP-E). The formulas are the published ForceAtlas2 of design 7.2 (Jacomy 2014 / Gephi):
  `1/d` repulsion, force-based swing / traction, the K1-K5 stage order, `estimateFactor`, `kickDir` and the 256-lane
  fold order are the oracle's line for line, and every formula line keeps the oracle's citation so the two files
  diff by formula. `compat: "paper"` (the default) is the published algorithm (centroid gravity, fresh global sums
  each iteration); `compat: "networkx"` reproduces NetworkX 3.4.2 `forceatlas2_layout` and is checked against the
  NetworkX fixtures under `test/simulation/fixtures/networkx/`. `compat` is the `ForceAtlas2Simulation` constructor's
  own option (the exported `ForceAtlas2SimulationOptions`, `ForceAtlas2Options & { compat? }`), absent from the exported `ForceAtlas2Options` and
  therefore not reachable through `createSimulation`'s typed options: `new ForceAtlas2Simulation({ compat: "networkx" })`. Mass is `nodeMass`, else the role-`mass` column,
  else `outDegree + 1`; `weight: true` uses the snapshot's arc weights, a string names an edge column. `nodeSize`,
  `dissuadeHubs` and `maxInFlight` are accepted and unused; `barnesHutOptimize` (off by default, so the oracle parity
  holds) replaces K3's every-pair repulsion with the Barnes-Hut tree of `barnes-hut.ts` (`barnesHutTheta`, default 1.2,
  Gephi's), O(n log n) per iteration; `load()` seeds the NaN rows of the array with
  `seedPositions` from the `seed` option, as the GPU simulation does. `iterationsDone` and `reheat()` are public beyond the interface. The one-shot `forceAtlas2` layout runs this
  class (`settleThreshold: 0`, every one of `maxIter` iterations) and then rescales.
- `FruchtermanReingoldSimulation` (`fruchterman-reingold.ts`): the loop body of layout 1.x's
  `fruchtermanReingoldLayout` made index-based over the CSR arcs, formulas unchanged
  (`k = 1 / sqrt(n)` unless given; `t` starts at 0.1 and cools by `0.1 / (iterations + 1)`; repulsion `k * k / d`
  over every pair, attraction `d * d / k` per arc, displacement capped at `t`). `load()` seeds the NaN rows itself in
  `[0, 1)` from the `seed` option; `fixed` takes a `NodeMask`, the name of a bool node column, or (when null) the
  role-`fixed` column. The iteration counter IS the temperature index, so `reheat()` restarts at
  `floor(0.7 * iterations)` (a drag or an unpin gets a small temperature and the remaining 30% of the budget).
  `iterationsDone`, `settledCount`, `meanDisplacement`, `rmsRadius`, `temperature` and `reheat()` are public.
  `cooling: "adaptive"` replaces the schedule with the GPU simulation's Yifan Hu step control (constants in
  `constants.ts`, pinned to the same literals in webgpu-graph-algorithms' `fr-adaptive.test.ts`): the free force
  energy `sum |F|^2` of each iteration is compared at the start of the next one (x 1 / 0.9 after five strict falls,
  x 0.9 otherwise), `iterations` is only a cap (default 10,000), and `reheat()` restarts the controller at 0.1 and
  the budget at 0.

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
