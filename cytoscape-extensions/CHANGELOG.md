## 0.0.15 (2026-10-13)

### 🚀 Features

- **cytoscape-extensions:** show a parse summary and the whole file in the format stories ([#2049](https://github.com/graphty-org/graphty-monorepo/issues/2049))
- **cytoscape-extensions:** fold the Demo stories into the gallery tiles and a Large graphs folder ([769639545](https://github.com/graphty-org/graphty-monorepo/commit/769639545))
- **cytoscape-extensions:** read a real file in every format in the Formats gallery ([fc05bcd99](https://github.com/graphty-org/graphty-monorepo/commit/fc05bcd99))
- **cytoscape-extensions:** cut a hierarchical clustering to a cluster count ([9257fff07](https://github.com/graphty-org/graphty-monorepo/commit/9257fff07))
- **cytoscape-extensions:** one story per gallery tile, gallery first ([1a56b1fbc](https://github.com/graphty-org/graphty-monorepo/commit/1a56b1fbc))
- **cytoscape-extensions:** readable large force layouts and a story per force layout per size ([#1766](https://github.com/graphty-org/graphty-monorepo/issues/1766))
- **cytoscape-extensions:** refit demo graphs to their space and capture size and dataset variations ([9ed8ed503](https://github.com/graphty-org/graphty-monorepo/commit/9ed8ed503))

### 🩹 Fixes

- **cytoscape-extensions:** put the Large graphs stories under Gallery ([#2040](https://github.com/graphty-org/graphty-monorepo/issues/2040))
- **cytoscape-extensions:** keep the Large graphs stories' panel live until the result is drawn ([f46357385](https://github.com/graphty-org/graphty-monorepo/commit/f46357385))
- **cytoscape-extensions:** draw the 50,000-node stories without WebGPU in 5 s instead of 13 ([f9deef686](https://github.com/graphty-org/graphty-monorepo/commit/f9deef686))
- **cytoscape-extensions:** keep catalog names the removed Demo stories used module-private ([b7d9b1136](https://github.com/graphty-org/graphty-monorepo/commit/b7d9b1136))
- **cytoscape-extensions:** link the new gallery story ids instead of pinning the old ones ([9262ae066](https://github.com/graphty-org/graphty-monorepo/commit/9262ae066))
- **cytoscape-extensions:** draw GPU-only stories by group and link per-tile stories ([c31d2086d](https://github.com/graphty-org/graphty-monorepo/commit/c31d2086d))
- **cytoscape-extensions:** keep the old gallery story ids and act on the review ([34e088867](https://github.com/graphty-org/graphty-monorepo/commit/34e088867))
- **layout:** clear the SonarQube findings on the planar and spectral ports ([613462521](https://github.com/graphty-org/graphty-monorepo/commit/613462521))
- **cytoscape-extensions:** paths, hub sizes, stelzl and format captions in the gallery ([4f0bb7fa8](https://github.com/graphty-org/graphty-monorepo/commit/4f0bb7fa8))
- **cytoscape-extensions:** gallery text and labels after combining the tile fixes ([33b708a67](https://github.com/graphty-org/graphty-monorepo/commit/33b708a67))
- **cytoscape-extensions:** layout, generator and dataset tiles show their idea ([be58ffee9](https://github.com/graphty-org/graphty-monorepo/commit/be58ffee9))
- **cytoscape-extensions:** onLoss leaves out what graphtyImport gives back ([d14456eb8](https://github.com/graphty-org/graphty-monorepo/commit/d14456eb8))
- **cytoscape-extensions:** algorithm gallery tiles show what each algorithm does ([96cb13970](https://github.com/graphty-org/graphty-monorepo/commit/96cb13970))
- **cytoscape-extensions:** keep the demo's fit helper private to demo.ts ([fe771dca3](https://github.com/graphty-org/graphty-monorepo/commit/fe771dca3))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.50
- Updated graph-samples to 0.1.30
- Updated graph-format to 1.3.15
- Updated algorithms to 3.4.5
- Updated graph-io to 0.3.38
- Updated layout to 2.4.5

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.14 (2026-10-13)

### 🩹 Fixes

- **tools:** cap each test slot's Node workers at its share of the cores ([9daf98f16](https://github.com/graphty-org/graphty-monorepo/commit/9daf98f16))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.49
- Updated graph-samples to 0.1.29
- Updated graph-format to 1.3.14
- Updated algorithms to 3.4.4
- Updated graph-io to 0.3.37
- Updated layout to 2.4.4

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.13 (2026-10-12)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.48
- Updated layout to 2.4.3

## 0.0.12 (2026-10-12)

### 🩹 Fixes

- **cytoscape-extensions:** refuse async graph methods on a destroyed core ([#2085](https://github.com/graphty-org/graphty-monorepo/issues/2085))
- **cytoscape-extensions:** show frozen story pictures in a canvas, not an img ([#2051](https://github.com/graphty-org/graphty-monorepo/issues/2051))
- **cytoscape-extensions:** stop layouts cleanly on a destroyed Cytoscape core ([#2062](https://github.com/graphty-org/graphty-monorepo/issues/2062))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.47
- Updated layout to 2.4.2

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.11 (2026-10-12)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.46
- Updated graph-samples to 0.1.28
- Updated graph-format to 1.3.13
- Updated algorithms to 3.4.3
- Updated graph-io to 0.3.36
- Updated layout to 2.4.1

## 0.0.10 (2026-10-11)

### 🩹 Fixes

- **cytoscape-extensions:** load the GEXF color parser with the file formats ([b277792a0](https://github.com/graphty-org/graphty-monorepo/commit/b277792a0))
- **cytoscape-extensions:** keep node and edge colors through a GEXF export and import ([#1983](https://github.com/graphty-org/graphty-monorepo/issues/1983))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.9 (2026-10-11)

### 🚀 Features

- **tools:** fail a CI test that uses more than 25% of its time limit ([#1602](https://github.com/graphty-org/graphty-monorepo/issues/1602))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.45
- Updated graph-samples to 0.1.27
- Updated graph-format to 1.3.12
- Updated algorithms to 3.4.2
- Updated graph-io to 0.3.35
- Updated layout to 2.4.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.8 (2026-10-11)

### 🩹 Fixes

- **algorithms:** stop SynC blurring connected communities together ([#1698](https://github.com/graphty-org/graphty-monorepo/issues/1698))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.44
- Updated algorithms to 3.4.1
- Updated graph-io to 0.3.34
- Updated layout to 2.3.1

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.7 (2026-10-10)

### 🚀 Features

- **cytoscape-extensions:** maxNodes for teraHAC, hierarchicalClustering and kamada-kawai ([ed244b6f4](https://github.com/graphty-org/graphty-monorepo/commit/ed244b6f4))
- **algorithms:** list each undirected link-prediction pair once on request ([#723](https://github.com/graphty-org/graphty-monorepo/issues/723))

### 🩹 Fixes

- **cytoscape-extensions:** let the demo's iterations control reach spring-electrical ([#1766](https://github.com/graphty-org/graphty-monorepo/issues/1766))
- **algorithms:** scale each SynC step by the node's degree so unconnected cliques split ([#1600](https://github.com/graphty-org/graphty-monorepo/issues/1600))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.43
- Updated algorithms to 3.4.0
- Updated layout to 2.3.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.6 (2026-10-09)

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.42
- Updated graph-samples to 0.1.26
- Updated graph-format to 1.3.11
- Updated algorithms to 3.3.13
- Updated graph-io to 0.3.33
- Updated layout to 2.2.14

## 0.0.5 (2026-10-09)

### 🩹 Fixes

- **cytoscape-extensions:** give the TeraHAC demo tile a cluster count ([#1448](https://github.com/graphty-org/graphty-monorepo/issues/1448))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.41
- Updated graph-samples to 0.1.25
- Updated graph-format to 1.3.10
- Updated algorithms to 3.3.12
- Updated graph-io to 0.3.32
- Updated layout to 2.2.13

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.4 (2026-10-08)

### 🩹 Fixes

- **algorithms:** start free nodes unlabeled in semi-supervised label propagation ([#959](https://github.com/graphty-org/graphty-monorepo/issues/959))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.40
- Updated graph-samples to 0.1.24
- Updated graph-format to 1.3.9
- Updated algorithms to 3.3.11
- Updated graph-io to 0.3.31
- Updated layout to 2.2.12

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.3 (2026-10-08)

### 🩹 Fixes

- **graph-io:** import positions as f64 so exact values round-trip ([#963](https://github.com/graphty-org/graphty-monorepo/issues/963))
- **algorithms:** keep a grsbm split only when it raises the partition's modularity ([#960](https://github.com/graphty-org/graphty-monorepo/issues/960))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.39
- Updated algorithms to 3.3.10
- Updated graph-io to 0.3.30
- Updated layout to 2.2.11

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.2 (2026-10-08)

### 🩹 Fixes

- **layout:** kamadaKawai rejects a dist matrix with no finite distance ([#965](https://github.com/graphty-org/graphty-monorepo/issues/965))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.38
- Updated algorithms to 3.3.9
- Updated graph-io to 0.3.29
- Updated layout to 2.2.10

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.1 (2026-10-07)

### 🚀 Features

- **cytoscape-extensions:** add a CDN ES module build, trim the bundle, animate demos ([2e3072d56](https://github.com/graphty-org/graphty-monorepo/commit/2e3072d56))
- **cytoscape-extensions:** add a script-tag bundle and typings that compile for strict consumers ([1b65225de](https://github.com/graphty-org/graphty-monorepo/commit/1b65225de))
- **cytoscape-extensions:** generate, load, import and export graphs ([1fe202e34](https://github.com/graphty-org/graphty-monorepo/commit/1fe202e34))
- **cytoscape-extensions:** settle the public names and pin the package's defaults ([1e3aa94d8](https://github.com/graphty-org/graphty-monorepo/commit/1e3aa94d8))
- **cytoscape-extensions:** load WebGPU on demand with no import line ([e1ecb624b](https://github.com/graphty-org/graphty-monorepo/commit/e1ecb624b))
- **cytoscape-extensions:** name the package @graphty/cytoscape-extensions and add a Storybook demo ([78b3006d8](https://github.com/graphty-org/graphty-monorepo/commit/78b3006d8))

### 🩹 Fixes

- **cytoscape-extensions:** pass seed only to the generators that take one in the stories ([90558c080](https://github.com/graphty-org/graphty-monorepo/commit/90558c080))
- **cytoscape-extensions:** load the four new bundled datasets and place the drawn ones ([51eeacb1c](https://github.com/graphty-org/graphty-monorepo/commit/51eeacb1c))
- **cytoscape-extensions:** flip the y of Cytoscape JSON like every other format ([c4701ed02](https://github.com/graphty-org/graphty-monorepo/commit/c4701ed02))
- **cytoscape-extensions:** report dropped edge ids, accept an ArrayBuffer, correct the reference ([7f34533db](https://github.com/graphty-org/graphty-monorepo/commit/7f34533db))
- **cytoscape-extensions:** keep a run's GPU buffers, honor require in layouts, refuse merges ([7cb18d61e](https://github.com/graphty-org/graphty-monorepo/commit/7cb18d61e))
- **cytoscape-extensions:** say why graphty-spring-electrical did not run without a GPU ([ea664e300](https://github.com/graphty-org/graphty-monorepo/commit/ea664e300))
- **cytoscape-extensions:** keep parents, edge ids, labels and partial weights in a round trip ([fa9d7b61f](https://github.com/graphty-org/graphty-monorepo/commit/fa9d7b61f))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.37
- Updated graph-samples to 0.1.23
- Updated graph-format to 1.3.8
- Updated algorithms to 3.3.8
- Updated graph-io to 0.3.28
- Updated layout to 2.2.9

### ❤️ Thank You

- Adam Powers @apowers313