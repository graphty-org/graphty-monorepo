## 2.0.1 (2026-09-30)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.9
- Updated graph-format to 1.2.1

# 2.0.0 (2026-09-29)

### 🚀 Features

- **layout:** deprecate rescaleLayout and rescaleLayoutDict in favour of rescaleInPlace ([00832515](https://github.com/graphty-org/graphty-monorepo/commit/00832515))
- **layout:** replace the html examples with redirects to the stories ([948b5b8a](https://github.com/graphty-org/graphty-monorepo/commit/948b5b8a))
- ⚠️  **layout:** make the snapshot layouts the only layouts and drop the generators ([45ded070](https://github.com/graphty-org/graphty-monorepo/commit/45ded070))
- **layout:** add indexed bfs, bipartite, multipartite, planar and spectral ([c19a7622](https://github.com/graphty-org/graphty-monorepo/commit/c19a7622))
- **layout:** add indexed kamadaKawai, forceAtlas2, fruchtermanReingold and arf ([e7278397](https://github.com/graphty-org/graphty-monorepo/commit/e7278397))
- **layout:** add the indexed namespace with the geometric layouts ([23f41aad](https://github.com/graphty-org/graphty-monorepo/commit/23f41aad))
- **layout:** add position helpers between layout results, PositionMap and scene columns ([40d27046](https://github.com/graphty-org/graphty-monorepo/commit/40d27046))

### 🩹 Fixes

- ⚠️  **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
- **layout:** let knip see the indexed type test and correct the start-position docs ([67b940ce](https://github.com/graphty-org/graphty-monorepo/commit/67b940ce))
- **visual-review:** capture layout as a canvas project and build layout before its storybook ([1974491a](https://github.com/graphty-org/graphty-monorepo/commit/1974491a))
- **layout:** keep multipartiteLayout's one-layer fallback and count distinct planar edges ([0014a5d7](https://github.com/graphty-org/graphty-monorepo/commit/0014a5d7))
- **layout:** keep kamadaKawaiLayout on its own code and spread nodes missing from pos ([ad8c6b74](https://github.com/graphty-org/graphty-monorepo/commit/ad8c6b74))
- **layout:** keep unplaced 3d shell rows all nan and check radial's centre after the empty test ([9d89f245](https://github.com/graphty-org/graphty-monorepo/commit/9d89f245))
- **layout:** keep the old behaviour for inputs the indexed layouts do not take ([b315cb54](https://github.com/graphty-org/graphty-monorepo/commit/b315cb54))
- **layout:** centre an infinite component in rescaleInPlace when positions coincide ([fe81f3e2](https://github.com/graphty-org/graphty-monorepo/commit/fe81f3e2))
- **layout:** declare every export of the bundle entry in layout.d.ts ([dccc31d7](https://github.com/graphty-org/graphty-monorepo/commit/dccc31d7))
- **layout:** restore radialLayout's centre check and shell key order ([cba78d19](https://github.com/graphty-org/graphty-monorepo/commit/cba78d19))
- **layout:** declare every export of the bundle entry in layout.d.ts ([31696110](https://github.com/graphty-org/graphty-monorepo/commit/31696110))
- **layout:** draw a missing x or y of a given forceatlas2 row from the seed ([af5b122a](https://github.com/graphty-org/graphty-monorepo/commit/af5b122a))
- **layout:** walk a duck-typed graph on every toLayoutSnapshot call ([b2699b5b](https://github.com/graphty-org/graphty-monorepo/commit/b2699b5b))

### ⚠️  Breaking Changes

- **layout:** leave unplaced nodes out of toPositionMap and document the 2.0 result changes  ([d5668514](https://github.com/graphty-org/graphty-monorepo/commit/d5668514))
  toPositionMap leaves out a node whose row is all NaN, and
  the Embedding type is no longer exported.
- **layout:** make the snapshot layouts the only layouts and drop the generators  ([45ded070](https://github.com/graphty-org/graphty-monorepo/commit/45ded070))
  the positional layouts are removed. Replace each with
  the snapshot layout of the same algorithm, and toPositionMap(result,
  s.ids) where id-keyed positions are needed (s = toLayoutSnapshot(graph)
  for a nodes()/edges() object):
  randomLayout(G, center, dim, seed) -> random(s, { center, dim, seed });
  circularLayout(G, scale, center, dim) -> circular(s, { scale, center, dim });
  gridLayout(G, columns, scale, center) -> grid(s, { columns, scale, center });
  shellLayout(G, nlist, ...) -> shell(s, { nlist, ... }), nlist as node indices;
  spiralLayout(G, scale, center, dim, resolution, equidistant) -> spiral(s, { ... });
  spectralLayout(G, scale, center, dim, seed) -> spectral(s, { ... });
  planarLayout(G, scale, center, dim, seed) -> planar(s, { ... });
  radialLayout(G, root, scale, center) -> radial(s, { root, ... }), root as a node index;
  bfsLayout(G, start, align, scale, center) -> bfs(s, { start, ... }), start as a node index;
  bipartiteLayout(G, nodes, align, scale, center, aspectRatio) -> bipartite(s, { top, ... }),
  top a node mask or a bool column;
  multipartiteLayout(G, subsetKey, align, scale, center) -> multipartite(s, { subsets, ... });
  kamadaKawaiLayout(G, dist, pos, weight, scale, center, dim) -> kamadaKawai(s, { ... });
  forceatlas2Layout(G, pos, maxIter, ...) -> forceAtlas2(s, { pos, maxIter, ... });
  fruchtermanReingoldLayout and springLayout(G, k, pos, fixed, iterations, ...) ->
  fruchtermanReingold(s, { ... }), fixed a node mask;
  arfLayout(G, pos, scaling, a, maxIter, seed) -> arf(s, { ... }).
  The generators completeGraph, cycleGraph, starGraph, wheelGraph,
  gridGraph, randomGraph, bipartiteGraph and scaleFreeGraph are removed:
  use @graphty/graph-samples/generators (randomGraph is erdosRenyiGraph,
  bipartiteGraph is randomBipartiteGraph, scaleFreeGraph is
  barabasiAlbertGraph) and freeze the result with fromEdgeArrays.
  Results that differ from 1.x: kamadaKawai reads a zero weight as a zero
  distance, gives an unreachable pair the ideal distance 1e6 instead of
  Infinity, rejects a negative or NaN weight and starts a 2D layout from
  the unit circle about the origin, so its positions differ from
  kamadaKawaiLayout's; every layout takes dim 2 or 3 only, where
  circularLayout, fruchtermanReingoldLayout, springLayout and
  kamadaKawaiLayout accepted other dimensions; fruchtermanReingold rejects
  a negative or infinite k and leaves a pinned single node where pos put
  it instead of moving it to center; bipartite and multipartite centre a
  horizontal layout on center, where 1.x centred it on the swapped centre;
  positions are Float32Array values, not f64 numbers.

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.8
- Updated graph-format to 1.2.0

### ❤️ Thank You

- Adam Powers @apowers313

## 1.10.5 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.7
- Updated graph-format to 1.1.2

## 1.10.4 (2026-09-28)

### 🩹 Fixes

- **tools:** run knip per package and build only projects with a build target ([1292b67a](https://github.com/graphty-org/graphty-monorepo/commit/1292b67a))

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.6
- Updated graph-format to 1.1.1

### ❤️ Thank You

- Adam Powers @apowers313

## 1.10.3 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.5
- Updated graph-format to 1.1.0

## 1.10.2 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.4
- Updated graph-format to 1.0.7

## 1.10.1 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.3
- Updated graph-format to 1.0.6

## 1.10.0 (2026-09-26)

### 🚀 Features

- **layout:** grid and radial layouts, available in graphty-element ([#58](https://github.com/graphty-org/graphty-monorepo/issues/58))

### 🩹 Fixes

- **graphty-element:** seeded ngraph and random layouts are reproducible ([#114](https://github.com/graphty-org/graphty-monorepo/issues/114), [#115](https://github.com/graphty-org/graphty-monorepo/issues/115))
- **layout:** 3d kamada-kawai starts at random and uses the full pairwise cost ([#99](https://github.com/graphty-org/graphty-monorepo/issues/99))

### ❤️ Thank You

- Adam Powers @apowers313

## 1.9.1 (2026-09-26)

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.2
- Updated graph-format to 1.0.5

## 1.9.0 (2026-09-24)

### 🚀 Features

- **layout:** generators become aliases of @graphty/graph-samples ([080fa1f9](https://github.com/graphty-org/graphty-monorepo/commit/080fa1f9))

### 🩹 Fixes

- **graph-samples:** pass the published-dependency check ([81aeadcd](https://github.com/graphty-org/graphty-monorepo/commit/81aeadcd))

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.1
- Updated graph-format to 1.0.4

### ❤️ Thank You

- Adam Powers @apowers313

## 1.8.2 (2026-09-24)

### 🩹 Fixes

- **deps:** stop publishing build caches and test configuration ([b7537fef](https://github.com/graphty-org/graphty-monorepo/commit/b7537fef))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.3

### ❤️ Thank You

- Adam Powers @apowers313

## 1.8.1 (2026-09-24)

### 🩹 Fixes

- **layout:** correct the sign in the L-BFGS two-loop recursion ([19fc929e](https://github.com/graphty-org/graphty-monorepo/commit/19fc929e))
- **layout:** stop the kamada-kawai solver stepping uphill ([0f3bd547](https://github.com/graphty-org/graphty-monorepo/commit/0f3bd547))

### ❤️ Thank You

- Adam Powers @apowers313

## 1.8.0 (2026-09-21)

### 🚀 Features

- **layout:** add the cooling option and the nullable spring constants to the layout option types ([bcb2bbdf](https://github.com/graphty-org/graphty-monorepo/commit/bcb2bbdf))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.2

### ❤️ Thank You

- Adam Powers @apowers313

## 1.7.0 (2026-09-20)

### 🚀 Features

- **layout:** forceatlas2Layout runs on the steppable simulation with the published laws ([19ad32ac](https://github.com/graphty-org/graphty-monorepo/commit/19ad32ac))
- **layout:** the simulation seam of the WebGPU design and the steppable ForceAtlas2 ([97373947](https://github.com/graphty-org/graphty-monorepo/commit/97373947))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.1

### ❤️ Thank You

- Adam Powers @apowers313

## [1.2.9](https://github.com/graphty-org/layout/compare/v1.2.8...v1.2.9) (2025-07-25)

### Bug Fixes

- imports, examples, and flaky test ([f9b0298](https://github.com/graphty-org/layout/commit/f9b02981067373c0645262785738ef6ffe389d18))
- planar layout using wrong rng ([b55c178](https://github.com/graphty-org/layout/commit/b55c178a81b567cf110836bb08c3392451984711))

## [1.2.8](https://github.com/graphty-org/layout/compare/v1.2.7...v1.2.8) (2025-07-18)

### Bug Fixes

- build ([0c43e32](https://github.com/graphty-org/layout/commit/0c43e32d9dadb102c881a8e7448526f6f5cdcd82))

## [1.2.7](https://github.com/graphty-org/layout/compare/v1.2.6...v1.2.7) (2025-07-18)

### Bug Fixes

- build ([431b5b5](https://github.com/graphty-org/layout/commit/431b5b5774c224c6b514ab26250283a0cc66b90a))
- build ([ec6001d](https://github.com/graphty-org/layout/commit/ec6001df23d4fa2ddb5148d3d3febf363bf90b64))

## [1.2.6](https://github.com/graphty-org/layout/compare/v1.2.5...v1.2.6) (2025-07-18)

### Bug Fixes

- build ([2c699cb](https://github.com/graphty-org/layout/commit/2c699cbf0e674d32e17163ec890ab6c75e1264f5))

## [1.2.5](https://github.com/graphty-org/layout/compare/v1.2.4...v1.2.5) (2025-07-18)

### Bug Fixes

- force atlas 2 3d bugs, fix build ([fbeeec2](https://github.com/graphty-org/layout/commit/fbeeec207e97a3c1a5c8d334df33886f24f598e2))

## [1.2.4](https://github.com/graphty-org/layout/compare/v1.2.3...v1.2.4) (2025-07-18)

### Bug Fixes

- build ([e5ae30c](https://github.com/graphty-org/layout/commit/e5ae30cc1607fc30117f0d4d35ae19d7ca07697c))
- import test errors ([bb7c6ff](https://github.com/graphty-org/layout/commit/bb7c6ffd1529d182115cb3a81599d0ef3d74b052))

## [1.2.3](https://github.com/graphty-org/layout/compare/v1.2.2...v1.2.3) (2025-07-17)

### Bug Fixes

- github pages ([da26028](https://github.com/graphty-org/layout/commit/da26028da1f7638322f2a6e199f0bbdf70baec91))

## [1.2.2](https://github.com/graphty-org/layout/compare/v1.2.1...v1.2.2) (2025-07-13)

### Bug Fixes

- numpy linspace error. improve test coverage ([2e820f1](https://github.com/graphty-org/layout/commit/2e820f181bd7242ef251c1833b10533699485209))

## [1.2.1](https://github.com/graphty-org/layout/compare/v1.2.0...v1.2.1) (2025-07-13)

### Bug Fixes

- resolve import errors and browser hang in shell layout example ([d65e436](https://github.com/graphty-org/layout/commit/d65e4360d9c42c885731ec952ea52978da61c7d5))

# [1.2.0](https://github.com/graphty-org/layout/compare/v1.1.1...v1.2.0) (2025-07-12)

### Features

- add 3D examples and enhance development setup ([dbcb911](https://github.com/graphty-org/layout/commit/dbcb9117f77243c0c105c3bcf29252f0cf5d5484))

## [1.1.1](https://github.com/graphty-org/layout/compare/v1.1.0...v1.1.1) (2025-07-12)

### Bug Fixes

- correct main entry point to dist/layout.js ([4e9f95b](https://github.com/graphty-org/layout/commit/4e9f95bfae3d2974808fa4a306b677e95d9706b9))

# 1.0.0 (2025-07-12)

### Bug Fixes

- flakey test ([8de0d14](https://github.com/graphty-org/layout/commit/8de0d147f7267b5715c4529db64014578ee06c97))
- improve performance test reliability for CI ([0a41ee2](https://github.com/graphty-org/layout/commit/0a41ee238bdbaa1f4d68d864998b24bd4c59ff3d))
- increase test timeout for CI environments ([36b20a8](https://github.com/graphty-org/layout/commit/36b20a8ea0811cdac7d97975ab0490f2cf29b6ae))
- make ForceAtlas2 balanced layout test more tolerant ([78fb975](https://github.com/graphty-org/layout/commit/78fb975053dd25d26e351626170fe73d2b68b677))
- remove conflicting .releaserc file ([1fffa82](https://github.com/graphty-org/layout/commit/1fffa821219774efab8203fc2ea7943493ad1825))
- resolve CI pipeline and test coverage issues ([9c60656](https://github.com/graphty-org/layout/commit/9c606562074bafc234499f4f2637a55730195af3))
- update tests to import from TypeScript source instead of dist ([d000b23](https://github.com/graphty-org/layout/commit/d000b23c301fe84807958e54f29ba4ca682818fd))

### Features

- add layout helpers ([d43562c](https://github.com/graphty-org/layout/commit/d43562c02a68720f96905ad4c969e12c0a0e5db4))
