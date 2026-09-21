## 0.5.1 (2026-09-21)

### 🚀 Features

- **webgpu-graph-algorithms:** record the layout-fr T4 lane baseline ([769c4792](https://github.com/graphty-org/graphty-monorepo/commit/769c4792))
- **webgpu-graph-algorithms:** add the P5 models and four SNAP networks to the browser demo ([b6fbe123](https://github.com/graphty-org/graphty-monorepo/commit/b6fbe123))
- **layout:** add the cooling option and the nullable spring constants to the layout option types ([bcb2bbdf](https://github.com/graphty-org/graphty-monorepo/commit/bcb2bbdf))
- **webgpu-graph-algorithms:** add the layout-fr benchmark group and record T-14 on the dev box ([a05e23ec](https://github.com/graphty-org/graphty-monorepo/commit/a05e23ec))
- **webgpu-graph-algorithms:** expose fruchtermanReingold and springElectrical on the accelerator ([e9bd808a](https://github.com/graphty-org/graphty-monorepo/commit/e9bd808a))
- **webgpu-graph-algorithms:** add the spring-electrical preset and its ngraph-checked oracle ([b99ada38](https://github.com/graphty-org/graphty-monorepo/commit/b99ada38))
- **webgpu-graph-algorithms:** add the Fruchterman-Reingold model, its factory and its f64 oracle ([0635266f](https://github.com/graphty-org/graphty-monorepo/commit/0635266f))
- **webgpu-graph-algorithms:** add the FR, coulomb and spring laws and integrators to the kernels ([0fffdf1c](https://github.com/graphty-org/graphty-monorepo/commit/0fffdf1c))
- **webgpu-graph-algorithms:** add the option, stats and fixed-mask seams of the P5 layout models ([ca955def](https://github.com/graphty-org/graphty-monorepo/commit/ca955def))

### 🩹 Fixes

- **webgpu-graph-algorithms:** leave one core to vitest's main process in the node projects ([542b095d](https://github.com/graphty-org/graphty-monorepo/commit/542b095d))
- **webgpu-graph-algorithms:** declare the adaptive-cooling constants in the WGSL prelude ([da33fa61](https://github.com/graphty-org/graphty-monorepo/commit/da33fa61))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.2
- Updated algorithms to 1.8.1
- Updated layout to 1.8.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.5.0 (2026-09-20)

### 🚀 Features

- ⚠️  **webgpu-graph-algorithms:** import the real AlgorithmAccelerator and retire CpuAlgorithmOptions ([48a28adc](https://github.com/graphty-org/graphty-monorepo/commit/48a28adc))

### ⚠️  Breaking Changes

- **webgpu-graph-algorithms:** import the real AlgorithmAccelerator and retire CpuAlgorithmOptions  ([48a28adc](https://github.com/graphty-org/graphty-monorepo/commit/48a28adc))
  CpuAlgorithmOptions is no longer exported. The accelerator
  methods' option parameters are now the CPU package's own types
  (IndexedPageRankOptions, HitsOptionsLike, BetweennessAcceleratorOptions).
  test/types/conformance.test-d.ts gains the reverse compile design G10 names:
  createAccelerator(ctx) satisfies the REAL AlgorithmAccelerator, the re-exports
  are the algorithms declarations by identity, and the CPU dispatcher accepts this
  package's accelerator. public-api.test-d.ts pins the two new re-exports.
  @graphty/algorithms becomes a workspace:^ devDependency (the optional peer stays
  as it is), both tsconfigs map it to algorithms/dist/algorithms.d.ts, and the
  last implicitDependencies negation goes from project.json: nx now sees the
  algorithms edge, and nx release will patch-bump this package on every
  algorithms release.

### 🧱 Updated Dependencies

- Updated algorithms to 1.8.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.4.1 (2026-09-20)

### 🩹 Fixes

- **webgpu-graph-algorithms:** require the layout release that ships the simulation seam ([e6ceb3d5](https://github.com/graphty-org/graphty-monorepo/commit/e6ceb3d5))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.4.0 (2026-09-20)

### 🚀 Features

- **webgpu-graph-algorithms:** adopt the real @graphty/layout simulation types ([7bc9ed5f](https://github.com/graphty-org/graphty-monorepo/commit/7bc9ed5f))

### 🩹 Fixes

- **webgpu-graph-algorithms:** widen the layout peer range until 1.7.0 is published ([442bc98b](https://github.com/graphty-org/graphty-monorepo/commit/442bc98b))
- **webgpu-graph-algorithms:** require the layout release that ships the simulation seam ([b3ef69e7](https://github.com/graphty-org/graphty-monorepo/commit/b3ef69e7))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.1
- Updated layout to 1.7.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.0 (2026-09-20)

### 🚀 Features

- **webgpu-graph-algorithms:** the accelerator algorithm members and the P7 barrel ([eab24748](https://github.com/graphty-org/graphty-monorepo/commit/eab24748))
- **webgpu-graph-algorithms:** label weakly connected components with Afforest ([f7193363](https://github.com/graphty-org/graphty-monorepo/commit/f7193363))
- **webgpu-graph-algorithms:** run HITS, eigenvector and Katz on the same pull kernel ([8506fcc8](https://github.com/graphty-org/graphty-monorepo/commit/8506fcc8))
- **webgpu-graph-algorithms:** run PageRank and personalized PageRank on the device ([2b2da4c2](https://github.com/graphty-org/graphty-monorepo/commit/2b2da4c2))
- **webgpu-graph-algorithms:** the spmvPull primitive over pre-scaled xNorm ([fb4ca4ae](https://github.com/graphty-org/graphty-monorepo/commit/fb4ca4ae))
- **webgpu-graph-algorithms:** the P7 kernel registry, seven bodies and their budgets ([2626e598](https://github.com/graphty-org/graphty-monorepo/commit/2626e598))
- **webgpu-graph-algorithms:** upload the reverse and edge-list views, with packViews ([0f98beb6](https://github.com/graphty-org/graphty-monorepo/commit/0f98beb6))
- **webgpu-graph-algorithms:** grid-stride dispatch and the P7 result types ([109b27ce](https://github.com/graphty-org/graphty-monorepo/commit/109b27ce))

### 🩹 Fixes

- **webgpu-graph-algorithms:** sum each pull row in chunks that no shader compiler can fold away ([e417b0ce](https://github.com/graphty-org/graphty-monorepo/commit/e417b0ce))

### 🔥 Performance

- **webgpu-graph-algorithms:** baseline gpu-linux-t4 with the P7 groups from the first lane run ([#13](https://github.com/graphty-org/graphty-monorepo/issues/13))
- **webgpu-graph-algorithms:** re-baseline both runner classes with the P7 groups ([e95a5ddc](https://github.com/graphty-org/graphty-monorepo/commit/e95a5ddc))
- **webgpu-graph-algorithms:** the pagerank and wcc benchmark groups ([55ea2c61](https://github.com/graphty-org/graphty-monorepo/commit/55ea2c61))

### ❤️ Thank You

- Adam Powers @apowers313