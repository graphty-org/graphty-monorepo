## 2.0.4 (2026-09-26)

### 🚀 Features

- **graphty-element:** k-core and link prediction, and deprecate unimplemented catalog entries ([#54](https://github.com/graphty-org/graphty-monorepo/issues/54), [#56](https://github.com/graphty-org/graphty-monorepo/issues/56), [#59](https://github.com/graphty-org/graphty-monorepo/issues/59))

### 🩹 Fixes

- **algorithms:** pagerank convergence, eigenvector direction, parallel edges, path walks ([#48](https://github.com/graphty-org/graphty-monorepo/issues/48), [#60](https://github.com/graphty-org/graphty-monorepo/issues/60), [#69](https://github.com/graphty-org/graphty-monorepo/issues/69), [#70](https://github.com/graphty-org/graphty-monorepo/issues/70))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.0.3 (2026-09-26)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.5

## 2.0.2 (2026-09-24)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.4

## 2.0.1 (2026-09-24)

### 🩹 Fixes

- **deps:** stop publishing build caches and test configuration ([b7537fef](https://github.com/graphty-org/graphty-monorepo/commit/b7537fef))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.3

### ❤️ Thank You

- Adam Powers @apowers313

# 2.0.0 (2026-09-24)

### 🚀 Features

- ⚠️  **algorithms:** eigenvectorCentrality throws ConvergenceError when it does not converge ([aa247241](https://github.com/graphty-org/graphty-monorepo/commit/aa247241))

### 🩹 Fixes

- **algorithms:** eigenvector centrality converges on bipartite graphs ([61516e15](https://github.com/graphty-org/graphty-monorepo/commit/61516e15))
- **algorithms:** optimised louvain finds communities on graphs over 50 nodes ([7f66c545](https://github.com/graphty-org/graphty-monorepo/commit/7f66c545))
- **algorithms:** let leiden revisit the original nodes before it stops ([66eea3ca](https://github.com/graphty-org/graphty-monorepo/commit/66eea3ca))
- **algorithms:** correct girvan-newman modularity and settle leiden ([21f4cbd7](https://github.com/graphty-org/graphty-monorepo/commit/21f4cbd7))
- **algorithms:** restore the doc comment orphaned from bellmanFord ([71a5b0ac](https://github.com/graphty-org/graphty-monorepo/commit/71a5b0ac))
- **algorithms:** relax an undirected edge in both directions in Bellman-Ford ([08f83553](https://github.com/graphty-org/graphty-monorepo/commit/08f83553))

### ⚠️  Breaking Changes

- **algorithms:** eigenvectorCentrality throws ConvergenceError when it does not converge  ([aa247241](https://github.com/graphty-org/graphty-monorepo/commit/aa247241))
  callers that relied on eigenvectorCentrality returning
  unconverged scores at maxIterations now get a ConvergenceError. Long paths and
  large grids need more than the default 100 passes (networkx fails on the same
  graphs); catch ConvergenceError, or pass a higher maxIterations or a looser
  tolerance.

### ❤️ Thank You

- Adam Powers @apowers313

## 1.8.1 (2026-09-21)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.2

## 1.8.0 (2026-09-20)

### 🚀 Features

- **algorithms:** add the accelerator seam and the accelerated() dispatcher ([ae609731](https://github.com/graphty-org/graphty-monorepo/commit/ae609731))
- **algorithms:** express sampled betweenness on the shared option type ([1ff44991](https://github.com/graphty-org/graphty-monorepo/commit/1ff44991))
- **algorithms:** port six algorithms to graph-format snapshots under the indexed namespace ([629ab26b](https://github.com/graphty-org/graphty-monorepo/commit/629ab26b))
- **algorithms:** convert a legacy Graph to a graph-format snapshot with a mutation counter ([a7b909c1](https://github.com/graphty-org/graphty-monorepo/commit/a7b909c1))

### ❤️ Thank You

- Adam Powers @apowers313

## 1.7.3 (2026-09-20)

This was a version bump only for algorithms to align it with other projects, there were no code changes.

## [1.3.1](https://github.com/graphty-org/algorithms/compare/v1.3.0...v1.3.1) (2025-12-16)

### Bug Fixes

- code review and bug fixes ([6db77af](https://github.com/graphty-org/algorithms/commit/6db77af799463fb31ec35287d7fcc056cd049cb1))

# [1.3.0](https://github.com/graphty-org/algorithms/compare/v1.2.0...v1.3.0) (2025-12-15)

### Bug Fixes

- algorithm exports ([27b6f2c](https://github.com/graphty-org/algorithms/commit/27b6f2cec4b1347988f2817f06756cae7619d27a))
- continued performance optimizations and benchmarking ([0f896a4](https://github.com/graphty-org/algorithms/commit/0f896a4dcf20c3a47bfaa70c9bf8f9cf2845ebdb))
- implement next round of performance optimizations ([3687913](https://github.com/graphty-org/algorithms/commit/36879131e98bc266a366b138a8edc362ab885fb4))

### Features

- implement delta pagerank and dijkstra optimizations ([9fa8803](https://github.com/graphty-org/algorithms/commit/9fa880359949dabc10a86996996fbf8baf004750))
- optimized bfs, start refactoring common code ([e9a0012](https://github.com/graphty-org/algorithms/commit/e9a0012da948ecc1d3331a7674bf7bb3c59c0ee2))

# [1.2.0](https://github.com/graphty-org/algorithms/compare/v1.1.0...v1.2.0) (2025-07-24)

### Features

- add priority 4 algorithms (modern research) ([8f36071](https://github.com/graphty-org/algorithms/commit/8f360716c0f233639026d37b8a0a8755d47df6db))

# [1.1.0](https://github.com/graphty-org/algorithms/compare/v1.0.1...v1.1.0) (2025-07-22)

### Features

- add new priority 1 algorithms, expand test coverage ([3b3742c](https://github.com/graphty-org/algorithms/commit/3b3742cbe927610f999101bf629bdd135aa0a7d0))
- add priority 3 algorithms and tests ([3e6c0ec](https://github.com/graphty-org/algorithms/commit/3e6c0ec0bc3e16823567a53d83bf6869b9c3cd25))
- finish priority 1 algorithms ([55a1203](https://github.com/graphty-org/algorithms/commit/55a1203ed42e8ef7a58e834725de035fe729f52b))
- implement all priority 2 algorithms ([0af213b](https://github.com/graphty-org/algorithms/commit/0af213b0c294c556acf89db1fb288d18d0c9662a))

## [1.0.1](https://github.com/graphty-org/algorithms/compare/v1.0.0...v1.0.1) (2025-07-20)

### Bug Fixes

- semantic release ([f878ee1](https://github.com/graphty-org/algorithms/commit/f878ee1d90d514c7e3654fcb31a56a8734e5a347))
