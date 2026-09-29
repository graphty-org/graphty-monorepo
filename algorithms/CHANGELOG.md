## 2.2.0 (2026-09-29)

### 🚀 Features

- **algorithms:** add primMST and maximumBipartiteMatching to the accelerated dispatcher ([8691cf16](https://github.com/graphty-org/graphty-monorepo/commit/8691cf16))
- **algorithms:** export the all-pairs node bound from the indexed namespace ([fa4f5d9f](https://github.com/graphty-org/graphty-monorepo/commit/fa4f5d9f))
- **algorithms:** route k-core and girvan-newman through their ports ([29fa0e85](https://github.com/graphty-org/graphty-monorepo/commit/29fa0e85))
- **algorithms:** add cpu dispatcher methods for dfs, scc, community, flow, cut and link ports ([41c3383d](https://github.com/graphty-org/graphty-monorepo/commit/41c3383d))
- **algorithms:** route traversal, component, path and tree functions through their ports ([3597bb87](https://github.com/graphty-org/graphty-monorepo/commit/3597bb87))
- **algorithms:** let facades snapshot a graph that holds a nan edge weight ([aba82016](https://github.com/graphty-org/graphty-monorepo/commit/aba82016))
- **algorithms:** route hierarchical, markov, sync and grsbm clustering through their ports ([6998e862](https://github.com/graphty-org/graphty-monorepo/commit/6998e862))
- **algorithms:** route the common-neighbour link prediction functions through their ports ([d9e5c672](https://github.com/graphty-org/graphty-monorepo/commit/d9e5c672))
- **algorithms:** export leiden, girvan-newman and the label propagation variants ([5a8bd936](https://github.com/graphty-org/graphty-monorepo/commit/5a8bd936))
- **algorithms:** add index-based girvan-newman ([4b7915a8](https://github.com/graphty-org/graphty-monorepo/commit/4b7915a8))
- **algorithms:** add index-based leiden ([58ab42d3](https://github.com/graphty-org/graphty-monorepo/commit/58ab42d3))
- **algorithms:** add semi-supervised and synchronous label propagation over snapshots ([17eb96e7](https://github.com/graphty-org/graphty-monorepo/commit/17eb96e7))
- **algorithms:** add a plain-object score record converter for facades ([29a1a15b](https://github.com/graphty-org/graphty-monorepo/commit/29a1a15b))
- **algorithms:** add index-based graph isomorphism ([b4c7b717](https://github.com/graphty-org/graphty-monorepo/commit/b4c7b717))
- **algorithms:** add index-based bipartite matching ([295ce7ab](https://github.com/graphty-org/graphty-monorepo/commit/295ce7ab))
- **algorithms:** throw on nan or -infinity weights in the floyd-warshall functions ([6bf50741](https://github.com/graphty-org/graphty-monorepo/commit/6bf50741))
- **algorithms:** let traversals follow a caller's neighbour order ([846a70f9](https://github.com/graphty-org/graphty-monorepo/commit/846a70f9))
- **algorithms:** add indexed max flow, minimum cuts and the bipartite flow network ([d72b3e6d](https://github.com/graphty-org/graphty-monorepo/commit/d72b3e6d))
- **algorithms:** pop equal keys lowest index first in the indexed max-heap ([53a1c2be](https://github.com/graphty-org/graphty-monorepo/commit/53a1c2be))
- **algorithms:** export the indexed clustering ports ([d924c81e](https://github.com/graphty-org/graphty-monorepo/commit/d924c81e))
- **algorithms:** add indexed spectral clustering over snapshots ([5d15e0bd](https://github.com/graphty-org/graphty-monorepo/commit/5d15e0bd))
- **algorithms:** add indexed markov clustering and modularity over snapshots ([081815da](https://github.com/graphty-org/graphty-monorepo/commit/081815da))
- **algorithms:** dispatch eigenvector centrality and personalized pagerank ([f37e5b72](https://github.com/graphty-org/graphty-monorepo/commit/f37e5b72))
- **algorithms:** add personalized pagerank and undirected input to indexed pagerank ([0fa57f06](https://github.com/graphty-org/graphty-monorepo/commit/0fa57f06))
- **algorithms:** add indexed eigenvector centrality over snapshots ([ca0cb436](https://github.com/graphty-org/graphty-monorepo/commit/ca0cb436))
- **algorithms:** add indexed hierarchical clustering over snapshots ([e778b9ad](https://github.com/graphty-org/graphty-monorepo/commit/e778b9ad))
- **algorithms:** dispatch betweenness, edge betweenness and closeness ([84411159](https://github.com/graphty-org/graphty-monorepo/commit/84411159))
- **algorithms:** export the research clustering ports from the indexed namespace ([d80425bb](https://github.com/graphty-org/graphty-monorepo/commit/d80425bb))
- **algorithms:** add an index-based grsbm over graph snapshots ([0c816c66](https://github.com/graphty-org/graphty-monorepo/commit/0c816c66))
- **algorithms:** add an index-based sync clustering over graph snapshots ([51d5df4f](https://github.com/graphty-org/graphty-monorepo/commit/51d5df4f))
- **algorithms:** add an index-based teraHAC over graph snapshots ([8a089acb](https://github.com/graphty-org/graphty-monorepo/commit/8a089acb))
- **algorithms:** add indexed degree, closeness, betweenness and edge betweenness ([e3098a4c](https://github.com/graphty-org/graphty-monorepo/commit/e3098a4c))
- **algorithms:** route labelPropagation through the port and keep seeded calls on the cpu ([cdd622bf](https://github.com/graphty-org/graphty-monorepo/commit/cdd622bf))
- **algorithms:** route floydWarshall and the legacy all-pairs functions through the port ([a88161cb](https://github.com/graphty-org/graphty-monorepo/commit/a88161cb))
- **algorithms:** add indexed.primMST with a spanning-forest option ([d0f7070b](https://github.com/graphty-org/graphty-monorepo/commit/d0f7070b))
- **algorithms:** add indexed.bidirectionalDijkstra and indexed.astar ([4514ef41](https://github.com/graphty-org/graphty-monorepo/commit/4514ef41))
- **algorithms:** add indexed.bellmanFord and a bellmanFord dispatcher method ([3edc665a](https://github.com/graphty-org/graphty-monorepo/commit/3edc665a))
- **algorithms:** port the delta pagerank engines to snapshots ([16fadd76](https://github.com/graphty-org/graphty-monorepo/commit/16fadd76))
- **algorithms:** port the traversal family to indexed snapshots ([b1473f81](https://github.com/graphty-org/graphty-monorepo/commit/b1473f81))
- **algorithms:** port the link prediction functions to snapshots ([cab8f667](https://github.com/graphty-org/graphty-monorepo/commit/cab8f667))
- **algorithms:** add the internal facade converters and a legacy parity helper ([04739c9d](https://github.com/graphty-org/graphty-monorepo/commit/04739c9d))
- **algorithms:** add ring queue, bit set and indexed max heap scratch structures ([7cd48e20](https://github.com/graphty-org/graphty-monorepo/commit/7cd48e20))
- **algorithms:** expose all-pairs shortest paths in the indexed namespace and dispatcher ([9e8ac371](https://github.com/graphty-org/graphty-monorepo/commit/9e8ac371))
- **algorithms:** route labelPropagation through the accelerated() dispatcher ([c5416093](https://github.com/graphty-org/graphty-monorepo/commit/c5416093))
- **algorithms:** export indexed.labelPropagation and its Indexed* types ([2a6e81fe](https://github.com/graphty-org/graphty-monorepo/commit/2a6e81fe))
- **algorithms:** record predecessor arcs and walk all-pairs shortest paths ([31768197](https://github.com/graphty-org/graphty-monorepo/commit/31768197))
- **algorithms:** directed snapshots in indexed label propagation ([78ff0b77](https://github.com/graphty-org/graphty-monorepo/commit/78ff0b77))
- **algorithms:** self-loops, parallel edges and unweighted mode in indexed label propagation ([7c574a55](https://github.com/graphty-org/graphty-monorepo/commit/7c574a55))
- **algorithms:** route all-pairs to BFS or Dijkstra rows on sparse and unweighted graphs ([eb1e8e3f](https://github.com/graphty-org/graphty-monorepo/commit/eb1e8e3f))
- **algorithms:** FLPA kernel for indexed label propagation on undirected snapshots ([3fd013d0](https://github.com/graphty-org/graphty-monorepo/commit/3fd013d0))
- **algorithms:** stop the all-pairs sweep at the first negative cycle ([125f8a75](https://github.com/graphty-org/graphty-monorepo/commit/125f8a75))
- **algorithms:** sweep all-pairs shortest paths with a typed-array Floyd-Warshall ([c263163c](https://github.com/graphty-org/graphty-monorepo/commit/c263163c))
- **algorithms:** add the all-pairs shortest-path entry point with its size and weight checks ([612e7136](https://github.com/graphty-org/graphty-monorepo/commit/612e7136))
- **algorithms:** indexed label propagation options, validation and identity results ([cfaa7b23](https://github.com/graphty-org/graphty-monorepo/commit/cfaa7b23))

### 🩹 Fixes

- **algorithms:** give accelerated hits and katz the cpu port's scale and weighting ([062aafb2](https://github.com/graphty-org/graphty-monorepo/commit/062aafb2))
- **algorithms:** forward the arc order through the strongly connected components dispatcher ([aaee9bcd](https://github.com/graphty-org/graphty-monorepo/commit/aaee9bcd))
- **algorithms:** stop bfsDistancesOnly using directionoptimizedbfs on large graphs ([a5cee3a9](https://github.com/graphty-org/graphty-monorepo/commit/a5cee3a9))
- **algorithms:** keep centrality results on graphs a snapshot cannot hold ([ab60f966](https://github.com/graphty-org/graphty-monorepo/commit/ab60f966))
- **algorithms:** keep markov clustering on current weights after an in-place change ([8ed77b99](https://github.com/graphty-org/graphty-monorepo/commit/8ed77b99))
- **algorithms:** stop synchronous label propagation on a two-pass cycle ([72dc752d](https://github.com/graphty-org/graphty-monorepo/commit/72dc752d))
- **algorithms:** offer self-loops to the isomorphism edge predicate ([0c725080](https://github.com/graphty-org/graphty-monorepo/commit/0c725080))
- **algorithms:** match legacy pagerank exactly and route only equal answers to the gpu ([bcfd381f](https://github.com/graphty-org/graphty-monorepo/commit/bcfd381f))
- **algorithms:** report spectral convergence and pin the clustering ports' edge cases ([a641e0e7](https://github.com/graphty-org/graphty-monorepo/commit/a641e0e7))
- **algorithms:** end weighted closeness on negative weights and fix betweenness sources ([050df780](https://github.com/graphty-org/graphty-monorepo/commit/050df780))
- **algorithms:** check traversal targets and arc orders, follow out-arcs for bipartiteness ([6eac1795](https://github.com/graphty-org/graphty-monorepo/commit/6eac1795))
- **algorithms:** check the delta pagerank weights length and document f32 weights ([b68f9c7d](https://github.com/graphty-org/graphty-monorepo/commit/b68f9c7d))
- **algorithms:** match legacy minSTCut values and keep parallel flows within capacity ([deaae517](https://github.com/graphty-org/graphty-monorepo/commit/deaae517))
- **algorithms:** check indices and negative weights in the path and tree ports ([4c3c4568](https://github.com/graphty-org/graphty-monorepo/commit/4c3c4568))
- **algorithms:** refuse a fractional cluster count in indexed sync clustering ([d3505cdb](https://github.com/graphty-org/graphty-monorepo/commit/d3505cdb))
- **algorithms:** keep the legacy adamic-adar score on its own weights ([cbc949fd](https://github.com/graphty-org/graphty-monorepo/commit/cbc949fd))
- **algorithms:** keep legacy all-pairs and label propagation results outside the approved changes ([f28150b1](https://github.com/graphty-org/graphty-monorepo/commit/f28150b1))
- **algorithms:** stop a weighted closeness search at the cutoff as legacy does ([723f122b](https://github.com/graphty-org/graphty-monorepo/commit/723f122b))
- **algorithms:** seed indexed sync clustering with legacy's self-loop degree ([7638fa56](https://github.com/graphty-org/graphty-monorepo/commit/7638fa56))
- **algorithms:** score self-loops and directed weights correctly in indexed grsbm ([015c330c](https://github.com/graphty-org/graphty-monorepo/commit/015c330c))
- **algorithms:** make adamic-adar scores order-independent and pair-local ([c2afc811](https://github.com/graphty-org/graphty-monorepo/commit/c2afc811))
- **algorithms:** give legacy and facade the same dijkstra source and document converter limits ([0e69daa3](https://github.com/graphty-org/graphty-monorepo/commit/0e69daa3))
- **algorithms:** keep deltaPageRank internal and skip unknown indices in update ([a09e5491](https://github.com/graphty-org/graphty-monorepo/commit/a09e5491))
- **algorithms:** match legacy result shapes in the facade converters and parity check ([f5860b0e](https://github.com/graphty-org/graphty-monorepo/commit/f5860b0e))
- **algorithms:** stop the betweenness sampling error pointing at a missing method ([14787aac](https://github.com/graphty-org/graphty-monorepo/commit/14787aac))
- **algorithms:** vote on exact weights in indexed label propagation ([d50d5f1d](https://github.com/graphty-org/graphty-monorepo/commit/d50d5f1d))
- **algorithms:** harden all-pairs inputs, speed up the sweep, retune the auto rule ([251c11fe](https://github.com/graphty-org/graphty-monorepo/commit/251c11fe))

### 🔥 Performance

- **algorithms:** benchmark the all-pairs port against the shipped Floyd-Warshall ([f362cd24](https://github.com/graphty-org/graphty-monorepo/commit/f362cd24))
- **algorithms:** benchmark indexed label propagation against the shipped function ([7dc45a19](https://github.com/graphty-org/graphty-monorepo/commit/7dc45a19))

### 🧱 Updated Dependencies

- Updated graph-samples to 0.1.8
- Updated graph-format to 1.2.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.1.2 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.2

## 2.1.1 (2026-09-28)

### 🩹 Fixes

- **tools:** run knip per package and build only projects with a build target ([1292b67a](https://github.com/graphty-org/graphty-monorepo/commit/1292b67a))

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.1.0 (2026-09-28)

### 🚀 Features

- **algorithms:** index-based k-core, Katz, HITS and Louvain ([#423](https://github.com/graphty-org/graphty-monorepo/issues/423))

### 🩹 Fixes

- **algorithms:** treat node id 0 as a node, not as "no node" ([#492](https://github.com/graphty-org/graphty-monorepo/issues/492))

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.0.6 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.7

## 2.0.5 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.6

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
