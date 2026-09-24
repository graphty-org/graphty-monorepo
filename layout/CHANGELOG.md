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
