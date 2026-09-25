## 0.6.3 (2026-09-24)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.4
- Updated algorithms to 2.0.2
- Updated layout to 1.9.0

## 0.6.2 (2026-09-24)

### 🩹 Fixes

- **deps:** stop publishing build caches and test configuration ([b7537fef](https://github.com/graphty-org/graphty-monorepo/commit/b7537fef))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.3
- Updated algorithms to 2.0.1
- Updated layout to 1.8.2

### ❤️ Thank You

- Adam Powers @apowers313

## 0.6.1 (2026-09-24)

### 🩹 Fixes

- **webgpu-graph-algorithms:** accept @graphty/algorithms 2.x as a peer ([bdb6ece8](https://github.com/graphty-org/graphty-monorepo/commit/bdb6ece8))
- **webgpu-graph-algorithms:** keep the Dawn handles referenced until the test worker exits ([d362cac4](https://github.com/graphty-org/graphty-monorepo/commit/d362cac4))
- **webgpu-graph-algorithms:** export springSizeFactor again for the grid-law helper ([67624f21](https://github.com/graphty-org/graphty-monorepo/commit/67624f21))

### 🧱 Updated Dependencies

- Updated algorithms to 2.0.0
- Updated layout to 1.8.1

### ❤️ Thank You

- Adam Powers @apowers313

## 0.6.0 (2026-09-23)

### 🚀 Features

- ⚠️  **webgpu-graph-algorithms:** refuse a device that computes the wrong answer ([ff3384f9](https://github.com/graphty-org/graphty-monorepo/commit/ff3384f9))
- **webgpu-graph-algorithms:** record the grid layout baseline on the Tesla T4 ([4c0735b0](https://github.com/graphty-org/graphty-monorepo/commit/4c0735b0))
- **webgpu-graph-algorithms:** add calibrateLayout, layout-grid and the crossover re-check ([f12b9098](https://github.com/graphty-org/graphty-monorepo/commit/f12b9098))
- **webgpu-graph-algorithms:** give the FR and spring-electrical models the grid tier through LAW ([201ba566](https://github.com/graphty-org/graphty-monorepo/commit/201ba566))
- **webgpu-graph-algorithms:** add the grid repulsion tier of ForceAtlas2 ([e5d38678](https://github.com/graphty-org/graphty-monorepo/commit/e5d38678))
- **webgpu-graph-algorithms:** add the grid centroids, the hub-cell path and the pyramid ([e845cbae](https://github.com/graphty-org/graphty-monorepo/commit/e845cbae))
- **webgpu-graph-algorithms:** add the grid spec, the cell keys and the sorted cell ranges ([aff68ce5](https://github.com/graphty-org/graphty-monorepo/commit/aff68ce5))
- **webgpu-graph-algorithms:** execute windowed uploads for degree and segmentedReduce ([25943b4c](https://github.com/graphty-org/graphty-monorepo/commit/25943b4c))
- **webgpu-graph-algorithms:** run the attraction kernel over the degree tiers in every layout model ([cc9df077](https://github.com/graphty-org/graphty-monorepo/commit/cc9df077))
- **webgpu-graph-algorithms:** add the mid and high degree tiers of the row-walking kernels ([d34157f1](https://github.com/graphty-org/graphty-monorepo/commit/d34157f1))
- **webgpu-graph-algorithms:** add the stable LSD radixSort primitive ([c2afbffe](https://github.com/graphty-org/graphty-monorepo/commit/c2afbffe))
- **webgpu-graph-algorithms:** add the histogram and counting-sort primitives ([4d10bbbd](https://github.com/graphty-org/graphty-monorepo/commit/4d10bbbd))
- **webgpu-graph-algorithms:** add the exclusiveScan primitive ([2683fbc5](https://github.com/graphty-org/graphty-monorepo/commit/2683fbc5))
- **webgpu-graph-algorithms:** add planIndirect, the indirect finalize kernel and dispatchIndirect ([af532c25](https://github.com/graphty-org/graphty-monorepo/commit/af532c25))

### 🩹 Fixes

- **webgpu-graph-algorithms:** settle the device check before the loop, not inside it ([032a3157](https://github.com/graphty-org/graphty-monorepo/commit/032a3157))
- **webgpu-graph-algorithms:** give the regression gate a floor it can measure ([fc5f207a](https://github.com/graphty-org/graphty-monorepo/commit/fc5f207a))
- **webgpu-graph-algorithms:** stop the benchmark gate blessing its own regression ([c0e06173](https://github.com/graphty-org/graphty-monorepo/commit/c0e06173))
- **webgpu-graph-algorithms:** give the block total a ride to the lane that stores it ([4f0a22aa](https://github.com/graphty-org/graphty-monorepo/commit/4f0a22aa))
- **webgpu-graph-algorithms:** read the block index where it is used, not before ([3f279ea8](https://github.com/graphty-org/graphty-monorepo/commit/3f279ea8))
- **webgpu-graph-algorithms:** stop the test process tearing the graphics device down ([f2752f57](https://github.com/graphty-org/graphty-monorepo/commit/f2752f57))
- **webgpu-graph-algorithms:** carry the block index through workgroup memory ([9fda60fe](https://github.com/graphty-org/graphty-monorepo/commit/9fda60fe))
- **webgpu-graph-algorithms:** let the pool end each test worker, not the worker itself ([704cb9f2](https://github.com/graphty-org/graphty-monorepo/commit/704cb9f2))
- **webgpu-graph-algorithms:** set the teardown allowance where vitest reads it ([8d6e88b3](https://github.com/graphty-org/graphty-monorepo/commit/8d6e88b3))
- **webgpu-graph-algorithms:** write only the coverage report a runner reads ([b505032e](https://github.com/graphty-org/graphty-monorepo/commit/b505032e))
- **webgpu-graph-algorithms:** run two workers when coverage runs on a small machine ([af7088e2](https://github.com/graphty-org/graphty-monorepo/commit/af7088e2))

### 🔥 Performance

- **webgpu-graph-algorithms:** walk a dense row with a constant stride again ([57873440](https://github.com/graphty-org/graphty-monorepo/commit/57873440))

### ⚠️  Breaking Changes

- **webgpu-graph-algorithms:** refuse a device that computes the wrong answer  ([ff3384f9](https://github.com/graphty-org/graphty-monorepo/commit/ff3384f9))
  E_DEVICE_INCORRECT joins the exported error code union, and a device that
  computes incorrectly now raises it instead of returning numbers.

### ❤️ Thank You

- Adam Powers @apowers313

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