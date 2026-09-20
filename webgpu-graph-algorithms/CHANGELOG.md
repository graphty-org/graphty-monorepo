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