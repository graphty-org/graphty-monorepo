## 2.4.0 (2026-09-26)

### 🚀 Features

- **layout:** grid and radial layouts, available in graphty-element ([#58](https://github.com/graphty-org/graphty-monorepo/issues/58))
- **graphty-element:** k-core and link prediction, and deprecate unimplemented catalog entries ([#54](https://github.com/graphty-org/graphty-monorepo/issues/54), [#56](https://github.com/graphty-org/graphty-monorepo/issues/56), [#59](https://github.com/graphty-org/graphty-monorepo/issues/59))
- **graphty-element:** export the edge line and arrow types for pickers ([#46](https://github.com/graphty-org/graphty-monorepo/issues/46))

### 🩹 Fixes

- **graphty-element:** keep the batch material when an edge drops its caps ([bcde7d92](https://github.com/graphty-org/graphty-monorepo/commit/bcde7d92))
- **graphty-element:** sort the floor-table imports and narrow its partial reads ([75406966](https://github.com/graphty-org/graphty-monorepo/commit/75406966))
- **graphty-element:** type the per-capability floors against the seam's member names ([0bb5f5fb](https://github.com/graphty-org/graphty-monorepo/commit/0bb5f5fb))
- **graphty-element:** seeded ngraph starts where ngraph itself would ([8e6016e8](https://github.com/graphty-org/graphty-monorepo/commit/8e6016e8))
- **graphty-element:** decline the accelerator for an algorithm below a measured floor ([#386](https://github.com/graphty-org/graphty-monorepo/issues/386))
- **graphty-element:** import the rich text parser without a .ts extension ([df3be69c](https://github.com/graphty-org/graphty-monorepo/commit/df3be69c))
- **graphty-element:** load ids, replace only after a load succeeds, and nodeData replaces ([#49](https://github.com/graphty-org/graphty-monorepo/issues/49), [#50](https://github.com/graphty-org/graphty-monorepo/issues/50), [#110](https://github.com/graphty-org/graphty-monorepo/issues/110), [#198](https://github.com/graphty-org/graphty-monorepo/issues/198))
- **graphty-element:** seeded ngraph and random layouts are reproducible ([#114](https://github.com/graphty-org/graphty-monorepo/issues/114), [#115](https://github.com/graphty-org/graphty-monorepo/issues/115))
- **graphty-element:** size label panels from font metrics ([#128](https://github.com/graphty-org/graphty-monorepo/issues/128))
- **graphty-element:** acceleration policy changes detach, reach status and stop at dispose ([#150](https://github.com/graphty-org/graphty-monorepo/issues/150), [#151](https://github.com/graphty-org/graphty-monorepo/issues/151), [#152](https://github.com/graphty-org/graphty-monorepo/issues/152), [#155](https://github.com/graphty-org/graphty-monorepo/issues/155))
- **graphty-element:** share plugin registries, stop retrying 4xx, cost in work units ([#134](https://github.com/graphty-org/graphty-monorepo/issues/134), [#108](https://github.com/graphty-org/graphty-monorepo/issues/108), [#238](https://github.com/graphty-org/graphty-monorepo/issues/238))
- **graphty-element:** gexf import keeps start, end, spells and timed values ([#109](https://github.com/graphty-org/graphty-monorepo/issues/109))
- **graphty-element:** a paused layout stays paused, and setLayout accepts catalogue ids ([#119](https://github.com/graphty-org/graphty-monorepo/issues/119), [#120](https://github.com/graphty-org/graphty-monorepo/issues/120), [#153](https://github.com/graphty-org/graphty-monorepo/issues/153), [#80](https://github.com/graphty-org/graphty-monorepo/issues/80))
- **algorithms:** pagerank convergence, eigenvector direction, parallel edges, path walks ([#48](https://github.com/graphty-org/graphty-monorepo/issues/48), [#60](https://github.com/graphty-org/graphty-monorepo/issues/60), [#69](https://github.com/graphty-org/graphty-monorepo/issues/69), [#70](https://github.com/graphty-org/graphty-monorepo/issues/70))
- **graphty-element:** release unused style meshes and merge stacked label styles ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#71](https://github.com/graphty-org/graphty-monorepo/issues/71))
- **graphty-element:** dispose the glow layer when no node glows ([#29](https://github.com/graphty-org/graphty-monorepo/issues/29))
- **graphty-element:** batch repaints on load, and await suggested styles and teardown ([#27](https://github.com/graphty-org/graphty-monorepo/issues/27), [#72](https://github.com/graphty-org/graphty-monorepo/issues/72), [#73](https://github.com/graphty-org/graphty-monorepo/issues/73))

### 🔥 Performance

- **graphty-element:** draw arrowheads as instances and keep shader uniforms per scene ([#25](https://github.com/graphty-org/graphty-monorepo/issues/25), [#45](https://github.com/graphty-org/graphty-monorepo/issues/45))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.6
- Updated algorithms to 2.0.4
- Updated layout to 1.10.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.1 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** rasterise label textures on the cpu so every load draws the same pixels ([8c3f6b61](https://github.com/graphty-org/graphty-monorepo/commit/8c3f6b61))
- **graphty-element:** frame the camera after a style pass on its way, not before it ([11bae759](https://github.com/graphty-org/graphty-monorepo/commit/11bae759))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.3.0 (2026-09-26)

### 🚀 Features

- **graphty-element:** a top-n style selector, used by the app with the element's histogram ([#166](https://github.com/graphty-org/graphty-monorepo/issues/166), [#165](https://github.com/graphty-org/graphty-monorepo/issues/165))

### 🩹 Fixes

- **graphty-element:** yield to the host by time, not every 1,024 elements ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389))
- **graphty-element:** honour startingCameraDistance, camera modes, presets and a floor ([#52](https://github.com/graphty-org/graphty-monorepo/issues/52), [#130](https://github.com/graphty-org/graphty-monorepo/issues/130), [#131](https://github.com/graphty-org/graphty-monorepo/issues/131), [#132](https://github.com/graphty-org/graphty-monorepo/issues/132))
- **graphty-element:** ai runAlgorithm takes options and findNodes has a default limit ([#83](https://github.com/graphty-org/graphty-monorepo/issues/83), [#84](https://github.com/graphty-org/graphty-monorepo/issues/84))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.5 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** refuse a load past the ceiling before touching the graph ([24c37792](https://github.com/graphty-org/graphty-monorepo/commit/24c37792))
- **graphty-element:** decline a load past the render ceiling instead of freezing ([#405](https://github.com/graphty-org/graphty-monorepo/issues/405), [#394](https://github.com/graphty-org/graphty-monorepo/issues/394))
- **graphty-element:** hold the frames while an accelerated run is on the device ([#389](https://github.com/graphty-org/graphty-monorepo/issues/389), [#390](https://github.com/graphty-org/graphty-monorepo/issues/390))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.5

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.4 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** keep the framing box type internal ([c815f158](https://github.com/graphty-org/graphty-monorepo/commit/c815f158))
- **graphty-element:** frame labels again on zoom-to-fit, never on a label edit ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** frame nodes by their size without an extra margin ([#76](https://github.com/graphty-org/graphty-monorepo/issues/76))
- **graphty-element:** keep the voice adapter's callback types internal ([82fb9dd5](https://github.com/graphty-org/graphty-monorepo/commit/82fb9dd5))
- **graphty-element:** repaint after node removal, frame nodes only, deliver AI events ([#74](https://github.com/graphty-org/graphty-monorepo/issues/74), [#76](https://github.com/graphty-org/graphty-monorepo/issues/76), [#81](https://github.com/graphty-org/graphty-monorepo/issues/81))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.3 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** load large graphs in linear time instead of quadratic ([#388](https://github.com/graphty-org/graphty-monorepo/issues/388))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.2 (2026-09-26)

### 🩹 Fixes

- **graphty-element:** default to a 2:1 block that honours a height, with no minimum ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127))
- **graphty-element:** a default host size, and a warning for rich props set too early ([#127](https://github.com/graphty-org/graphty-monorepo/issues/127), [#79](https://github.com/graphty-org/graphty-monorepo/issues/79))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.4
- Updated @graphty/remote-logger to 1.3.7
- Updated graph-format to 1.0.5
- Updated algorithms to 2.0.3
- Updated layout to 1.9.1

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.1 (2026-09-25)

### 🩹 Fixes

- **graphty-element:** a label's animation no longer undoes the declutter decision ([cca39906](https://github.com/graphty-org/graphty-monorepo/commit/cca39906))
- **graphty-element:** size the Combined Edge Flow story's arrowheads with edge strength ([e0969765](https://github.com/graphty-org/graphty-monorepo/commit/e0969765))
- **graphty-element:** glow strength per style, and labels no longer overlap ([#129](https://github.com/graphty-org/graphty-monorepo/issues/129), [#5](https://github.com/graphty-org/graphty-monorepo/issues/5))
- **graphty-element:** arrowheads follow the line, diagonals keep width, patterns fill edges ([#122](https://github.com/graphty-org/graphty-monorepo/issues/122), [#124](https://github.com/graphty-org/graphty-monorepo/issues/124), [#126](https://github.com/graphty-org/graphty-monorepo/issues/126))

### 🔥 Performance

- **graphty-element:** label declutter is an option, off by default, and runs only on change ([#5](https://github.com/graphty-org/graphty-monorepo/issues/5))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.2.0 (2026-09-25)

### 🚀 Features

- **graphty-element:** a query engine and text search behind Explore and edge endpoints ([#51](https://github.com/graphty-org/graphty-monorepo/issues/51), [#3](https://github.com/graphty-org/graphty-monorepo/issues/3))

### 🩹 Fixes

- **graphty-element:** csv import detects tab, semicolon and pipe delimiters, and reads .tsv ([#107](https://github.com/graphty-org/graphty-monorepo/issues/107))
- **graphty-element:** undo, redo and select-all accept Cmd on macOS; the canvas stops taking focus ([#77](https://github.com/graphty-org/graphty-monorepo/issues/77), [#78](https://github.com/graphty-org/graphty-monorepo/issues/78))
- **graphty-element:** the default highlight stands out from default nodes and edges ([#33](https://github.com/graphty-org/graphty-monorepo/issues/33), [#0072](https://github.com/graphty-org/graphty-monorepo/issues/0072))
- **graphty-element:** max flow and min cut check their source and sink ([#116](https://github.com/graphty-org/graphty-monorepo/issues/116))
- **graphty-element:** a node of size 0 draws as the smallest node ([#117](https://github.com/graphty-org/graphty-monorepo/issues/117))
- **graphty:** overlays close pop-outs, layer drags move one layer, runs keep their layers ([#184](https://github.com/graphty-org/graphty-monorepo/issues/184), [#164](https://github.com/graphty-org/graphty-monorepo/issues/164), [#163](https://github.com/graphty-org/graphty-monorepo/issues/163), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#4](https://github.com/graphty-org/graphty-monorepo/issues/4))

### ❤️ Thank You

- Adam Powers @apowers313

## 2.1.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** the WebGPU accelerator proves the device before it is attached ([68d932a4](https://github.com/graphty-org/graphty-monorepo/commit/68d932a4))
- **graphty-element:** turn down an accelerator that computes the wrong answer ([f1d44234](https://github.com/graphty-org/graphty-monorepo/commit/f1d44234))
- **graphty-element:** a GPU can be unavailable because it computes wrong answers ([1f1fde12](https://github.com/graphty-org/graphty-monorepo/commit/1f1fde12))

### 🩹 Fixes

- **graphty-element:** stop reheating a simulation the bridge has just loaded ([6d5257ee](https://github.com/graphty-org/graphty-monorepo/commit/6d5257ee))
- **graphty-element:** let the fake accelerator compute the layout it was asked for ([1af02ff0](https://github.com/graphty-org/graphty-monorepo/commit/1af02ff0))
- **graphty-element:** settle the fake-accelerator stories in five frames, not thirty ([9c5c6a23](https://github.com/graphty-org/graphty-monorepo/commit/9c5c6a23))
- **graphty-element:** know every GPU flag value CI sets, so the config loads on macOS and Windows ([e646d599](https://github.com/graphty-org/graphty-monorepo/commit/e646d599))
- **graphty-element:** spend owed pre-steps a chunk at a time on a simulation ([1a32aa98](https://github.com/graphty-org/graphty-monorepo/commit/1a32aa98))
- **graphty-element:** publish only the device facts a backend actually named ([9d63d5dd](https://github.com/graphty-org/graphty-monorepo/commit/9d63d5dd))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.3
- Updated @graphty/remote-logger to 1.3.6
- Updated graph-format to 1.0.4
- Updated algorithms to 2.0.2
- Updated layout to 1.9.0

### ❤️ Thank You

- Adam Powers @apowers313

## 2.0.1 (2026-09-24)

### 🩹 Fixes

- **graphty-element:** install only the dependencies the published build imports ([ddebbcfb](https://github.com/graphty-org/graphty-monorepo/commit/ddebbcfb))

### 🧱 Updated Dependencies

- Updated webgpu-graph-algorithms to 0.6.2
- Updated @graphty/remote-logger to 1.3.5
- Updated graph-format to 1.0.3
- Updated algorithms to 2.0.1
- Updated layout to 1.8.2

### ❤️ Thank You

- Adam Powers @apowers313

# 2.0.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** load-time algorithms can carry run options ([f75d710f](https://github.com/graphty-org/graphty-monorepo/commit/f75d710f))
- **graphty-element:** an eigenvector run that does not converge fails with E_NOT_CONVERGED ([47b116ac](https://github.com/graphty-org/graphty-monorepo/commit/47b116ac))
- **graphty-element:** overflow policy for groups, and size by a run's metric ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050))
- **graphty-element:** research-backed default palettes for measurements and groups ([d1423a36](https://github.com/graphty-org/graphty-monorepo/commit/d1423a36))
- **graphty-element:** publish CHANNEL_DESCRIPTORS so the app stops copying it ([1ee1170d](https://github.com/graphty-org/graphty-monorepo/commit/1ee1170d))
- ⚠️  **graphty-element:** declarative style-channel api and self-sufficient rendering ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
- ⚠️  **graphty-element:** give every limit a name that carries its unit ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
- ⚠️  **graphty-element:** settle the custom element's attributes and events ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
- ⚠️  **graphty-element:** answer from the session what a consumer was computing itself ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
- ⚠️  **graphty-element:** give the layouts edge weights and keep a reader's pins ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
- ⚠️  **graphty-element:** let a file declare its own direction ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
- ⚠️  **graphty-element:** name edge endpoints source and target, and give every edge its own id ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
- ⚠️  **graphty-element:** scope what an algorithm's layer paints, and register palettes ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
- ⚠️  **graphty-element:** make a named camera view something a third party can add ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
- ⚠️  **graphty-element:** move the logger to its own entry point ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
- ⚠️  **graphty-element:** publish the algorithm base classes a plugin needs ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
- ⚠️  **graphty-element:** register palettes, formats, cameras, layouts and log sinks ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
- **graphty-element:** add the error codes the new refusals report ([05631c4f](https://github.com/graphty-org/graphty-monorepo/commit/05631c4f))
- ⚠️  **graphty-element:** delete the old style system ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
- ⚠️  **graphty-element:** derive an algorithm's styling from what its result declares ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
- ⚠️  **graphty-element:** replace evaluated style expressions with declarative layers ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
- ⚠️  **graphty-element:** give selection real sets and add a visibility model ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
- ⚠️  **graphty-element:** make a run an object with an identity, progress and a cost ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
- **graphty-element:** add a headless model that holds the graph ([554f791e](https://github.com/graphty-org/graphty-monorepo/commit/554f791e))
- ⚠️  **graphty-element:** move graph data off the render objects into a store ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
- ⚠️  **graphty-element:** publish a map of entry points, five of them free of a 3D engine ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
- **graphty-element:** own WebGPU detection, attachment and recovery ([6f3842ce](https://github.com/graphty-org/graphty-monorepo/commit/6f3842ce))
- ⚠️  **graphty-element:** publish the catalogue as plain JSON descriptors ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
- **graphty-element:** publish an error model with codes a consumer can switch on ([1416ab30](https://github.com/graphty-org/graphty-monorepo/commit/1416ab30))

### 🩹 Fixes

- **graphty-element:** the picture is not final while a mesh or glow shader is still arriving ([0e1b6304](https://github.com/graphty-org/graphty-monorepo/commit/0e1b6304))
- **graphty-element:** a second registration of the tag warns instead of throwing ([2150334d](https://github.com/graphty-org/graphty-monorepo/commit/2150334d))
- **graphty-element:** forget what a layer painted when the dataset is renumbered ([3f36833d](https://github.com/graphty-org/graphty-monorepo/commit/3f36833d))
- **graphty-element:** each module imports the Babylon augmentations it calls ([c4340504](https://github.com/graphty-org/graphty-monorepo/commit/c4340504))
- **graphty-element:** the picture is not final while a style edit waits to be drawn ([e3769c7f](https://github.com/graphty-org/graphty-monorepo/commit/e3769c7f))
- **graphty-element:** declare the source entry files as side effects ([f895ebda](https://github.com/graphty-org/graphty-monorepo/commit/f895ebda))
- **graphty-element:** only tooltips draw over the graph; labels sort by depth ([095195f8](https://github.com/graphty-org/graphty-monorepo/commit/095195f8))
- **graphty-element:** cost models for louvain and eigenvector, measured on twelve shapes ([41f1d05d](https://github.com/graphty-org/graphty-monorepo/commit/41f1d05d))
- **algorithms:** optimised louvain finds communities on graphs over 50 nodes ([7f66c545](https://github.com/graphty-org/graphty-monorepo/commit/7f66c545))
- **graphty-element:** give closeness its own cost model, and test cost across graph shapes ([4fa6c5b8](https://github.com/graphty-org/graphty-monorepo/commit/4fa6c5b8))
- **graphty-element:** a removed layer takes back everything it painted ([3cf9bdab](https://github.com/graphty-org/graphty-monorepo/commit/3cf9bdab))
- **graphty-element:** hold cost estimates to measured runs, and fix two rates ([dea31006](https://github.com/graphty-org/graphty-monorepo/commit/dea31006))
- **graphty-element:** honour handTracking false, and test real XR sessions ([617ad2aa](https://github.com/graphty-org/graphty-monorepo/commit/617ad2aa))
- **graphty-element:** refuse selectors that ignore the element ([391d1ef3](https://github.com/graphty-org/graphty-monorepo/commit/391d1ef3))
- **graphty-element:** colour the nodes of flow and matching runs, and size encodings ([0d21967b](https://github.com/graphty-org/graphty-monorepo/commit/0d21967b))
- **graphty-element:** build the opening layout in 2D when the graph opens in 2D ([76ca7037](https://github.com/graphty-org/graphty-monorepo/commit/76ca7037))
- **graphty-element:** apply smartOverflow to plain labels ([f8094ed8](https://github.com/graphty-org/graphty-monorepo/commit/f8094ed8))
- **graphty-element:** draw labels and tooltips over edges and nodes ([34bb20f9](https://github.com/graphty-org/graphty-monorepo/commit/34bb20f9))
- **graphty-element:** make the colour helpers total so a repaint cannot abort ([905c390b](https://github.com/graphty-org/graphty-monorepo/commit/905c390b))

### ⚠️  Breaking Changes

- **graphty-element:** declarative style-channel api and self-sufficient rendering  ([9970ab84](https://github.com/graphty-org/graphty-monorepo/commit/9970ab84))
  the 1.x StyleManager, calculatedStyle, the StyleHelpers namespace,
  per-algorithm suggestedStyles, EdgeStyle.tooltip, NodeStyle.enabled, EdgeStyle.enabled,
  LabelStyle.maxWidth, LabelStyle.wrap and NodeStyle.effect.outline.width are removed.
  Node and edge appearance is set through style-layer channels.
- **graphty-element:** give every limit a name that carries its unit  ([bd6c0fe6](https://github.com/graphty-org/graphty-monorepo/commit/bd6c0fe6))
  `Limits.exactComputationCap` is `Limits.approximateAboveNodes` and
  `Limits.memoryBudgetBytes` is `Limits.graphMemoryBudgetBytes`.
  `CostGateLimits.exactComputationCap` is `CostGateLimits.exactComputationSeconds` and
  `CostGateLimits.memoryBudgetBytes` is `CostGateLimits.runColumnBudgetBytes`.
- **graphty-element:** settle the custom element's attributes and events  ([e108753a](https://github.com/graphty-org/graphty-monorepo/commit/e108753a))
  the graphty-element-logging, graphty-element-log-level and
  profiling URL parameters are ignored; call configureLogging instead.
  data-loading-progress.nodesLoaded and .edgesLoaded are renamed to
  nodeRecordsLoaded and edgeRecordsLoaded.
- **graphty-element:** answer from the session what a consumer was computing itself  ([bcfcd131](https://github.com/graphty-org/graphty-monorepo/commit/bcfcd131))
  GraphStatistics gains directednessSource and meanDegree. A
  run's per-edge answers are keyed by the element's edge id. Every run, layout
  and export is scoped to what is visible by default, so a run under an active
  filter measures fewer elements than 1.x measured on the same dataset.
- **graphty-element:** give the layouts edge weights and keep a reader's pins  ([5f444b73](https://github.com/graphty-org/graphty-monorepo/commit/5f444b73))
  every Kamada-Kawai and ForceAtlas2 arrangement of a graph with
  real weights moves. Node.isPinned() answers the element's own field, so code
  that branched on it and never took the pinned path now can.
- **graphty-element:** let a file declare its own direction  ([e52c44f8](https://github.com/graphty-org/graphty-monorepo/commit/e52c44f8))
  an undirected file loads one edge per file edge rather than a
  mirrored pair, so edge counts halve and every degree, density and centrality
  moves with them.
- **graphty-element:** name edge endpoints source and target, and give every edge its own id  ([ecf4461e](https://github.com/graphty-org/graphty-monorepo/commit/ecf4461e))
  edge records carry source and target, not src and dst. Edge
  ids are element-minted strings, so a selection or scope saved by 1.x matches
  nothing, and there is no translation because the old id was ambiguous. Edge
  counts rise on any multigraph and density, degree and every derived figure rise
  with them. Removing a node emits elements-removed naming the edges that went.
- **graphty-element:** scope what an algorithm's layer paints, and register palettes  ([2d9648c2](https://github.com/graphty-org/graphty-monorepo/commit/2d9648c2))
  the 1.x style template is removed; a look is a StyleDocument
  applied through the style layer API. A layer or document naming an unknown
  palette reports E_UNKNOWN_PALETTE.
- **graphty-element:** make a named camera view something a third party can add  ([62364e89](https://github.com/graphty-org/graphty-monorepo/commit/62364e89))
  BUILTIN_PRESETS is no longer exported; camera views are
  catalogue data reached through session.catalog. Three ScreenshotErrorCode
  members are removed -- CAMERA_PRESET_NOT_FOUND, CAMERA_PRESET_NOT_AVAILABLE_IN_2D
  and CANNOT_OVERWRITE_BUILTIN_PRESET -- because camera failures are now
  GraphtyErrors carrying E_UNKNOWN_CAMERA, E_UNSUPPORTED and E_PROTECTED.
- **graphty-element:** move the logger to its own entry point  ([5e00d5d8](https://github.com/graphty-org/graphty-monorepo/commit/5e00d5d8))
  the root barrel no longer exports the 23 logging symbols;
  import them from @graphty/graphty-element/logging. The seven colour-vision
  helpers move to @graphty/graphty-element/schema, beside the palettes whose
  colorblindSafe flag is computed from them.
- **graphty-element:** publish the algorithm base classes a plugin needs  ([a9f73da6](https://github.com/graphty-org/graphty-monorepo/commit/a9f73da6))
  edgeResultId is not published. An endpoint pair is a lookup
  key and not an identity -- it cannot name one of two parallel edges -- so a
  per-edge result row carries the id the element minted for that edge.
- **graphty-element:** register palettes, formats, cameras, layouts and log sinks  ([0247d18e](https://github.com/graphty-org/graphty-monorepo/commit/0247d18e))
  session.catalog tables are composed rather than frozen
  built-in arrays, and the descriptor lookups search registrations as well as
  built-ins. OptionsSchema and resolveOptions are deprecated in favour of
  OptionDescriptor[] and resolveOptionValues.
- **graphty-element:** delete the old style system  ([35c48108](https://github.com/graphty-org/graphty-monorepo/commit/35c48108))
  Styles, StyleManager and the style id types are no longer exported.
- **graphty-element:** derive an algorithm's styling from what its result declares  ([c3561815](https://github.com/graphty-org/graphty-monorepo/commit/c3561815))
  the pictures seven algorithms draw change, and dimming what an algorithm did not
  select no longer ships with the algorithm. What to do with the elements a result says nothing
  about is a reader's decision, not the algorithm's.
- **graphty-element:** replace evaluated style expressions with declarative layers  ([8036cc2d](https://github.com/graphty-org/graphty-monorepo/commit/8036cc2d))
  calculatedStyle and its expression string are removed, not sandboxed. Anything
  beyond the declared grammar is a registered scale, which is code shipped by a plugin: code stays
  code and layers stay data. Layers are addressed by a stable id rather than by array index, which
  forced the one consumer to write an index reconciliation module and delete highest-index-first;
  one off-by-one there once took the element's own base layer with it. A layer write now validates
  and repaints or rejects, where adding a layer used to be a push and a comment reading "TODO:
  recalculate".
- **graphty-element:** give selection real sets and add a visibility model  ([82af6b59](https://github.com/graphty-org/graphty-monorepo/commit/82af6b59))
  the selection surface is two sets rather than a single node, and the element no
  longer writes a selected flag onto algorithm results.
- **graphty-element:** make a run an object with an identity, progress and a cost  ([13125c76](https://github.com/graphty-org/graphty-monorepo/commit/13125c76))
  results move from a path keyed by namespace and type to one keyed by run id.
  The old path carried no parameters, so one algorithm at two settings wrote to the same place and
  a style layer could not say which it was drawing. Betweenness and closeness now publish the
  graph-level minimum and maximum they withheld, and a convergence flag reports null when it was
  never measured rather than asserting something untrue.
- **graphty-element:** move graph data off the render objects into a store  ([a4f8d2c0](https://github.com/graphty-org/graphty-monorepo/commit/a4f8d2c0))
  betweenness centrality returns half what it used to, and the old number was
  wrong. The mesh-to-graph conversion built a directed graph carrying both arcs of every undirected
  edge, so the algorithm never took its undirected branch, where it halves its raw pair counts. On
  a three-node path the middle node scored two where the correct answer is one. Closeness,
  eigenvector and katz are unchanged to the last digit, and the percentage form of betweenness is
  unaffected because a uniform halving leaves a min-max normalisation identical.
- **graphty-element:** publish a map of entry points, five of them free of a 3D engine  ([8584d235](https://github.com/graphty-org/graphty-monorepo/commit/8584d235))
  the exports map replaces the single entry, and the UMD build is gone. A page
  with a script tag and no installer loads ./bundle, one self-contained file. Sibling packages are
  externalised, so a consumer who installs one of them resolves a single copy rather than getting
  this package's private duplicate with types that do not assign to each other. Sourcemaps leave
  the tarball, which was forty-one megabytes unpacked with twenty-six of it maps.
- **graphty-element:** publish the catalogue as plain JSON descriptors  ([16dfd948](https://github.com/graphty-org/graphty-monorepo/commit/16dfd948))
  option schemas cross the package boundary as plain JSON rather than as Zod
  objects. They crossed as Zod before, and the one consumer had to read Zod's private internals in
  two modules to recover a type, a default and a range -- carrying a branch for two Zod versions,
  because the element imported one major while depending on another. Shipping a validation library
  across a boundary made the consumer's version of it part of this package's API.
  Built-in algorithm keys are renamed, and five of twenty-three fold into two: dijkstra,
  bellman-ford and floyd-warshall become shortest-path with a method parameter, and scc becomes
  components with a strength parameter. Each descriptor names the keys it replaces, so a migration
  has one source of truth. Layout names become semantic -- force rather than the name of whichever
  library implements it -- so swapping an implementation stops being a rename a consumer can see.

### 🧱 Updated Dependencies

- Updated algorithms to 2.0.0
- Updated layout to 1.8.1

### ❤️ Thank You

- Adam Powers @apowers313

## 1.10.5 (2026-09-23)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.4

## 1.10.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.3
- Updated algorithms to 1.8.1
- Updated layout to 1.8.0

## 1.10.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated algorithms to 1.8.0

## 1.10.2 (2026-09-20)

### 🧱 Updated Dependencies

- Updated @graphty/remote-logger to 1.3.2
- Updated algorithms to 1.7.3
- Updated layout to 1.7.0

## 1.10.1 (2026-09-20)

### 🩹 Fixes

- **graphty-element:** stop rendering the scene twice on every frame ([a414f9dc](https://github.com/graphty-org/graphty-monorepo/commit/a414f9dc))
- **graphty-element:** publish caret ranges for the workspace siblings ([de93a6d2](https://github.com/graphty-org/graphty-monorepo/commit/de93a6d2))

### ❤️ Thank You

- Adam Powers @apowers313

## [1.4.7](https://github.com/graphty-org/graphty-element/compare/v1.4.6...v1.4.7) (2025-12-26)

### Bug Fixes

- fix xr node selection ([0e217d3](https://github.com/graphty-org/graphty-element/commit/0e217d3128db8913cf9cf1818243277e8e29b176))

## [1.4.6](https://github.com/graphty-org/graphty-element/compare/v1.4.5...v1.4.6) (2025-12-26)

### Bug Fixes

- fix api gaps, update documentation ([abbf39b](https://github.com/graphty-org/graphty-element/commit/abbf39b5c01773f66e9dee85e967ac22a1a2cd90))
- fix JS / Lit API parity, expand documentation ([6dd6599](https://github.com/graphty-org/graphty-element/commit/6dd6599f381a9a5f736999394f4e9ca8e436e9b3))

## [1.4.5](https://github.com/graphty-org/graphty-element/compare/v1.4.4...v1.4.5) (2025-12-25)

### Bug Fixes

- fix webllm dynamic import, change default server / port for dev ([323d568](https://github.com/graphty-org/graphty-element/commit/323d568c7e4a7ed9ec7365ff4717885f0939aafc))

## [1.4.4](https://github.com/graphty-org/graphty-element/compare/v1.4.3...v1.4.4) (2025-12-23)

### Bug Fixes

- better web-llm optional dependency handling ([755c7ee](https://github.com/graphty-org/graphty-element/commit/755c7eeade7783600f28090890b65e9ac733177d))
- correct zoom to fit calculations ([c9dc578](https://github.com/graphty-org/graphty-element/commit/c9dc578f9c9bc66e34e0f7d8032e0d4306632f4b))

## [1.4.3](https://github.com/graphty-org/graphty-element/compare/v1.4.2...v1.4.3) (2025-12-23)

### Bug Fixes

- export ai tools from index ([1400374](https://github.com/graphty-org/graphty-element/commit/1400374ac55b0267903ae49d4ff8bfc462ba2853))

## [1.4.2](https://github.com/graphty-org/graphty-element/compare/v1.4.1...v1.4.2) (2025-12-22)

### Bug Fixes

- ai key persistence api ([be2a808](https://github.com/graphty-org/graphty-element/commit/be2a8083e9479327261a2dc5b86c4493e81bb38d))

## [1.4.1](https://github.com/graphty-org/graphty-element/compare/v1.4.0...v1.4.1) (2025-12-21)

### Bug Fixes

- algorithms options export ([e7a7c05](https://github.com/graphty-org/graphty-element/commit/e7a7c05ec70af75df67ef9efd0b4032f69ce542d))

# [1.4.0](https://github.com/graphty-org/graphty-element/compare/v1.3.0...v1.4.0) (2025-12-20)

### Bug Fixes

- 2d, 3d, xr view mode api ([6e9299f](https://github.com/graphty-org/graphty-element/commit/6e9299f5d9823d0b0d0fa37dfe7fb04fa0fa5c13))
- add algorithm options and schemas ([7277f8a](https://github.com/graphty-org/graphty-element/commit/7277f8adbb9429f8da493b180c5c7cf9f99f36f3))

### Features

- add logging ([af4bc9f](https://github.com/graphty-org/graphty-element/commit/af4bc9f5671e71318dcd976432a46100126c8c09))
- add node selection, interaction testing ([4a50004](https://github.com/graphty-org/graphty-element/commit/4a50004e58935c1ad2e8480dcbedd191ece9ce1a))
- schema detection to support LLM interactions ([941e0c9](https://github.com/graphty-org/graphty-element/commit/941e0c95df02574923f4793670623707ea0c3d2c))
- working AI interface MVP ([9e6d228](https://github.com/graphty-org/graphty-element/commit/9e6d228c94951a1edb068fb035ac74ddc15c2eb2))

# [1.3.0](https://github.com/graphty-org/graphty-element/compare/v1.2.4...v1.3.0) (2025-12-15)

### Bug Fixes

- auto detect data format using url contents ([7ede111](https://github.com/graphty-org/graphty-element/commit/7ede111078184f7aa01265db9d771e0856276ef0))
- merge master, fix VR in stories to prevent chromatic errors ([8ef5062](https://github.com/graphty-org/graphty-element/commit/8ef5062545c1468eede826afe2af1bb973d1944c))

### Features

- working and integrated 3D and XR cameras and controls ([6a111fd](https://github.com/graphty-org/graphty-element/commit/6a111fd32625aae1b5b7e78630cdfca0f8271f01))

## [1.2.4](https://github.com/graphty-org/graphty-element/compare/v1.2.3...v1.2.4) (2025-12-13)

### Bug Fixes

- fix exports to support graphty development ([647e474](https://github.com/graphty-org/graphty-element/commit/647e47480309e09ff30299b8220501d1fb6a6048))

## [1.2.3](https://github.com/graphty-org/graphty-element/compare/v1.2.2...v1.2.3) (2025-12-12)

### Bug Fixes

- build and ship typescript types and export default styles ([0ec479c](https://github.com/graphty-org/graphty-element/commit/0ec479cf8f682a75728bf2d458757c591feb21a7))

## [1.2.2](https://github.com/graphty-org/graphty-element/compare/v1.2.1...v1.2.2) (2025-12-09)

### Bug Fixes

- event forwarding ([586b7af](https://github.com/graphty-org/graphty-element/commit/586b7afc2fe754c081aebdc9deda4253d3cbbb28))

## [1.2.1](https://github.com/graphty-org/graphty-element/compare/v1.2.0...v1.2.1) (2025-12-02)

### Bug Fixes

- prevent over enthusiastic tree shaking ([c1e926a](https://github.com/graphty-org/graphty-element/commit/c1e926ab6419968180c22444d13d7196eff7d2da))

# [1.2.0](https://github.com/graphty-org/graphty-element/compare/v1.1.1...v1.2.0) (2025-11-30)

### Bug Fixes

- deterministic outcomes from setting web component properties ([22f3459](https://github.com/graphty-org/graphty-element/commit/22f34595e9b03d8c154a089afc2111b78c629a60))
- finishing details on arrowheads ([6c257b8](https://github.com/graphty-org/graphty-element/commit/6c257b85453ba5f57b626ba5ef9936013c602678))
- fix deterministic rendering for cameras and algorithms, fix other rendering bugs ([b4a5c54](https://github.com/graphty-org/graphty-element/commit/b4a5c541329192180aadac648e9f680027cc3fb6))
- fix diamond pattern line offset ([ee4005d](https://github.com/graphty-org/graphty-element/commit/ee4005d38388e6070071632da3211dd199aa66ee))
- fix merge errors ([8e7168e](https://github.com/graphty-org/graphty-element/commit/8e7168e9c8edf638ab3dcfb42be64d5ea57c4708))
- fix testing includes for vitest ([ca26089](https://github.com/graphty-org/graphty-element/commit/ca2608986d91631bffad8ecff018b0851cb49fc1))
- implement phase 4 of dependency and batching, fix eslint TODOs, fix batching design ([a3dc4d9](https://github.com/graphty-org/graphty-element/commit/a3dc4d9cd86051e4c967a7c082549134c632fbb8))
- implement phase 5 of dependency and batching ([7343935](https://github.com/graphty-org/graphty-element/commit/7343935e6720cf955ae875358ff536dd62ee18a0))
- line rendering bug when switching stories ([b769690](https://github.com/graphty-org/graphty-element/commit/b76969088d33fb6ac599e1a691c48b3c09901016))
- merge resizing fix ([41f565c](https://github.com/graphty-org/graphty-element/commit/41f565c1e09b0c416cae03c63e046402ef14540c))
- working custom line renderer and custom arrowhead with shaders ([92e0709](https://github.com/graphty-org/graphty-element/commit/92e0709c6d9cb657de18176323c842cd604d8d0e))

### Features

- add dependency ordering and batching when setting web component properties ([fe17935](https://github.com/graphty-org/graphty-element/commit/fe17935b06816957cfa29e39112033c1861b7074))
- add name to style layers to support UI ([4d1ea0e](https://github.com/graphty-org/graphty-element/commit/4d1ea0e8012f09d5985c6e9a0ae83cce43fad79d))
- add performance profiling, edge performance enhancements, arrowheads are wip ([be33939](https://github.com/graphty-org/graphty-element/commit/be3393997dc33cc5dcd99910b2600df8f8b0a7ef))
- add various formats for loading data ([deed260](https://github.com/graphty-org/graphty-element/commit/deed260b7e5c13be86265d9b6c0d3f13dadac106))
- algorithm suggested styles and style helpers ([8f5f758](https://github.com/graphty-org/graphty-element/commit/8f5f7587a132215f6e548f766a8c22c021ddf49e))
- comprehensive set of data loaders ([9d489f5](https://github.com/graphty-org/graphty-element/commit/9d489f58b061a4e457c91d18554aae0a355e2ba1))
- new edge styles and arrowheads ([652d660](https://github.com/graphty-org/graphty-element/commit/652d6603eaed4a8fc4c41a50210b2a2a6889456e))
- patterned line styles ([55af883](https://github.com/graphty-org/graphty-element/commit/55af883367940130e2c67b28fa17b92f3d6cbd5a))
- screen capture and video capture ([1a0d5cf](https://github.com/graphty-org/graphty-element/commit/1a0d5cfca614fa2f8b55ee3e2502ffbd084e74f7))
- working data loaders ([b6dd9e9](https://github.com/graphty-org/graphty-element/commit/b6dd9e95799009dde377aa9bd5907863f9bc9570))
- working new arrowheads ([eac7fbf](https://github.com/graphty-org/graphty-element/commit/eac7fbf25326be7e1153bf4661f00eeae7fb1a3a))

## [1.1.1](https://github.com/graphty-org/graphty-element/compare/v1.1.0...v1.1.1) (2025-10-24)

### Bug Fixes

- implement phase 1 of dependency and batching to prevent race conditions ([443f18a](https://github.com/graphty-org/graphty-element/commit/443f18ae951f8db6fb6c0aaf3e082f614494a005))

# [1.1.0](https://github.com/graphty-org/graphty-element/compare/v1.0.5...v1.1.0) (2025-10-24)

### Features

- add fixed layout ([3208b22](https://github.com/graphty-org/graphty-element/commit/3208b222143513e8411f54a69a4dac03bf4f25cf))

## [1.0.5](https://github.com/graphty-org/graphty-element/compare/v1.0.4...v1.0.5) (2025-07-28)

### Bug Fixes

- 3d layout for circular ([c15a87a](https://github.com/graphty-org/graphty-element/commit/c15a87a57a90d4cb14c08255fd4f2638d636ac27))
- 3d layout for kamada kawai ([2b17c9b](https://github.com/graphty-org/graphty-element/commit/2b17c9b30a3fff8cc878ea0bd4c7653a83e2f34e))
- change shape names in config, fix build ([b3c2253](https://github.com/graphty-org/graphty-element/commit/b3c2253a73536439a85903cb0a208583a57c51ab))
- ensure center agrument to layouts supports 3d ([b14ea88](https://github.com/graphty-org/graphty-element/commit/b14ea88df7284fa5879f62aa2639fa0816ec04fc))
- fix build rollup, fix chromatic testing ([ba6a1db](https://github.com/graphty-org/graphty-element/commit/ba6a1dbbe6aa2141bf5f20f91bf738a5011370ae))
- fix camera zoom when layout settles ([ce7d6fc](https://github.com/graphty-org/graphty-element/commit/ce7d6fc8098f3b7828aa48995a128ef439bc17bd))
- fix orbit camera zoom while layout settles ([4d4d73f](https://github.com/graphty-org/graphty-element/commit/4d4d73f7c26b76bd0f338283326fcb3e4b063d85))

## [1.0.4](https://github.com/graphty-org/graphty-element/compare/v1.0.3...v1.0.4) (2025-07-15)

### Bug Fixes

- fix npm provenance ([922edf5](https://github.com/graphty-org/graphty-element/commit/922edf5a13a1108457adfa9a2b6d2dc225cb95ae))

## [1.0.3](https://github.com/graphty-org/graphty-element/compare/v1.0.2...v1.0.3) (2025-07-15)

### Bug Fixes

- provenance for semantic release ([0785f04](https://github.com/graphty-org/graphty-element/commit/0785f04c660a740682c7a420a658e01df25c0d07))

## [1.0.2](https://github.com/graphty-org/graphty-element/compare/v1.0.1...v1.0.2) (2025-07-15)

### Bug Fixes

- allow side-effects to that the web component automatically gets registered ([b8f1e90](https://github.com/graphty-org/graphty-element/commit/b8f1e9048475aa6dca3d967ce1a86e717a101e91))

## [1.0.1](https://github.com/graphty-org/graphty-element/compare/v1.0.0...v1.0.1) (2025-07-15)

### Bug Fixes

- semantic release (take 3) ([f603c55](https://github.com/graphty-org/graphty-element/commit/f603c55ee25bd5725baea63c0724784cf7187363))

# 1.0.0 (2025-07-15)

### Bug Fixes

- build and optional argument fixes ([26a1ef6](https://github.com/graphty-org/graphty-element/commit/26a1ef6323a8aadb280fe4f0d9c3b66217846dc7))
- **config:** fix default config parsing ([dbaa610](https://github.com/graphty-org/graphty-element/commit/dbaa610a9aab497f081899315bad540c9eaf9ecd))
- **config:** fix label default values ([3b4f3bb](https://github.com/graphty-org/graphty-element/commit/3b4f3bb0f5af6ddad4638dc471ef07a3e1b46b14))
- correct edge-node connection gaps and enable label animation ([1a82a09](https://github.com/graphty-org/graphty-element/commit/1a82a090c045f4353bf78296426abdeb621d79c5)), closes [#35](https://github.com/graphty-org/graphty-element/issues/35) [#27](https://github.com/graphty-org/graphty-element/issues/27)
- **edge:** fix edge styling and caching ([7749c50](https://github.com/graphty-org/graphty-element/commit/7749c506567222427b7fe8973211bd97db956935))
- **edge:** fix typo in color ([e9497f7](https://github.com/graphty-org/graphty-element/commit/e9497f7f66057a47bd17d49eb0fbeec19cba9a0c))
- **element:** fix async firstUpdate ([3d74616](https://github.com/graphty-org/graphty-element/commit/3d7461608e90ebb805164afdbb80938962a08b63)), closes [#24](https://github.com/graphty-org/graphty-element/issues/24) [#15](https://github.com/graphty-org/graphty-element/issues/15)
- fix arrows, fix storybook build, fix chromatic visual tests, fix spiral ([e12e82a](https://github.com/graphty-org/graphty-element/commit/e12e82a6e7fc2f8c7c8d478f89d073e5861bd732))
- fix bugs caused by delinting ([bf9a250](https://github.com/graphty-org/graphty-element/commit/bf9a25069ae1d2b08eb4867fdf796605d10fae22))
- fix calculated values ([b324b7e](https://github.com/graphty-org/graphty-element/commit/b324b7e483b61c1874c94ae4a7a145b052181e2b))
- fix claude code notifications, make them global across all projects ([250899e](https://github.com/graphty-org/graphty-element/commit/250899ed3147400a5258ee907c79cd368507ea98))
- fix flipping when starting two finger gesture ([ad7a525](https://github.com/graphty-org/graphty-element/commit/ad7a5258599c9a9135b7c6cfb797bc4c788c9083))
- fix initial camera zoom for 2D ([9155d6a](https://github.com/graphty-org/graphty-element/commit/9155d6ac58faa30c3cea3a6b53f71b70c17c90d3))
- fix label background gradient ([16a7dad](https://github.com/graphty-org/graphty-element/commit/16a7dadeb2bbd365d60823c34fddc0151196ba1b))
- fix package names for semantic release ([91e0adf](https://github.com/graphty-org/graphty-element/commit/91e0adf55ba42208b2f47a17e0bf7df14829fd4b))
- fix semantic release, refactor edge, node, and richtextlabel to use their config objects ([e6e22a7](https://github.com/graphty-org/graphty-element/commit/e6e22a76b774f24e20a605cfe7b7da9024cfb021))
- fix typescript errors for 'any' ([3b78721](https://github.com/graphty-org/graphty-element/commit/3b78721aa2a40707563a3d36b1deac0fe3f44264))
- **graph:** fix async handling ([f93266c](https://github.com/graphty-org/graphty-element/commit/f93266cb6e18751680e5fd5d4a5aca3d5f8c1489))
- **graphty:** fix hanging promise when handling propperties ([7c799ff](https://github.com/graphty-org/graphty-element/commit/7c799fffd9fb685a607147fd73e1b7e94a1e76fd))
- **layout:** fix 2D layouts and stories to only render in 2D ([d4927af](https://github.com/graphty-org/graphty-element/commit/d4927afc974f5a23cd8c65f0866ef9c28321e726)), closes [#17](https://github.com/graphty-org/graphty-element/issues/17)
- **layout:** fix 3d layouts ([e7a962e](https://github.com/graphty-org/graphty-element/commit/e7a962eeb65ba79c1ea598bf0283d86fcc5b579d))
- **node:** fix node labels and behavior, add storybook stories for labels and wireframes ([bbce06a](https://github.com/graphty-org/graphty-element/commit/bbce06a69d5a74911afc228c39c35ea88e602a48)), closes [#21](https://github.com/graphty-org/graphty-element/issues/21) [#22](https://github.com/graphty-org/graphty-element/issues/22)
- **node:** fix node style updates ([a947def](https://github.com/graphty-org/graphty-element/commit/a947def8b7b72daf23fc3befd46ddff1d9406e7c))
- prevent label crashes with large fontSize values and improve type safety ([b28b5e6](https://github.com/graphty-org/graphty-element/commit/b28b5e60b63dde957222eca2522192f63685356e))
- remove P0 memory leaks ([dacaf8b](https://github.com/graphty-org/graphty-element/commit/dacaf8b18f1d3cb5aea20f0125b8fdcb36a14ec5))
- rename graphty canvas element ([40e4d85](https://github.com/graphty-org/graphty-element/commit/40e4d85524b9e6890221ec8de0049c16ce444126))
- semantic release ([df9ed11](https://github.com/graphty-org/graphty-element/commit/df9ed11af4e55aa29e0f1c9b7723b67052a5020f))
- semantic release ([985a12e](https://github.com/graphty-org/graphty-element/commit/985a12e89a0567629239275f5fec7aa05d5f3464))
- semantic release should only run 'npm run test' for now ([d4e8dec](https://github.com/graphty-org/graphty-element/commit/d4e8dec0e25ac2b9f6310ba46465b0e199506fe2))
- **style:** fix graph skybox rotation. close [#37](https://github.com/graphty-org/graphty-element/issues/37) ([dc3ebbd](https://github.com/graphty-org/graphty-element/commit/dc3ebbdf272879eab00cab83fc54302d7b1252d9))
- **style:** fix style layering ([9a64041](https://github.com/graphty-org/graphty-element/commit/9a6404156ca85c602f41fd277a7be0e8a56b2d6a))

### Features

- add 2d node style ([6eddc59](https://github.com/graphty-org/graphty-element/commit/6eddc59f4bdcddad55fa931c986c56be42f6fb66))
- add calculated styles for nodes ([7acb622](https://github.com/graphty-org/graphty-element/commit/7acb62270d50db3ab41686d57e7e06b99dda8986))
- add calculated values ([a2daa05](https://github.com/graphty-org/graphty-element/commit/a2daa05459fd9c7ea3b44d91bda0e4e407760ae9))
- add layout support from styleTemplate and fix multipartite story rendering ([6704bda](https://github.com/graphty-org/graphty-element/commit/6704bda7ebcd1e0ab443ed044df9f17dba0e619a)), closes [#19](https://github.com/graphty-org/graphty-element/issues/19)
- add rich text label ([97baf9d](https://github.com/graphty-org/graphty-element/commit/97baf9db269b67647d943e2ccb307bf3c8508ca3))
- add rich text labels and associated stories (wip) ([4d374b6](https://github.com/graphty-org/graphty-element/commit/4d374b69f3d67bad658b018107bc312d7b711449))
- add schema parsing and conversion to calculated values ([3e6512c](https://github.com/graphty-org/graphty-element/commit/3e6512c570efb83df7f4f9f0834ff4824a7c11f0))
- add working 2D camera, camera manager ([d599847](https://github.com/graphty-org/graphty-element/commit/d599847440a3e0f11a8f59cceaed5ae0ffc47621))
- **algorithm:** add algorithm api, add node degree algorithm and corresponding test ([01f8b94](https://github.com/graphty-org/graphty-element/commit/01f8b9498ec75a216c3a6d0b37304c4dfc2e1681)), closes [#14](https://github.com/graphty-org/graphty-element/issues/14)
- **edge:** add edge id ([e7b7a30](https://github.com/graphty-org/graphty-element/commit/e7b7a30d822d830ccbeee3d0944400d35c204ede))
- **graph:** add background color, add skybox ([94a52f7](https://github.com/graphty-org/graphty-element/commit/94a52f77ed1e16bad89ec0bfa922459437f5f46d))
- **graph:** add orbit controller with mouse, touch, and keyboard inputs and without gimbal lock ([24f24f4](https://github.com/graphty-org/graphty-element/commit/24f24f4ecd755b7078ec1c663f6a26c9911aa6b0))
- **graph:** add zoom on initial layout ([16f59cd](https://github.com/graphty-org/graphty-element/commit/16f59cd5d30c3ac103a3c8fbea594634bfe3175e))
- **graph:** add zoom-to-fit for initial layouts ([27c7016](https://github.com/graphty-org/graphty-element/commit/27c701651dcfe8dd3172b13d6d5c33cc2d01e46b)), closes [#6](https://github.com/graphty-org/graphty-element/issues/6) [#3](https://github.com/graphty-org/graphty-element/issues/3)
- **graph:** remove initial graph config options ([1bc6c26](https://github.com/graphty-org/graphty-element/commit/1bc6c26ad78a72e9086b0859e95799df27e33318)), closes [#23](https://github.com/graphty-org/graphty-element/issues/23)
- **graph:** silence babylonjs logs ([b53e8be](https://github.com/graphty-org/graphty-element/commit/b53e8beb4cdc5bf7c2f3f3e9116c0620f4e623a0))
- implement flexible layout dimension configuratio ([f6a2bad](https://github.com/graphty-org/graphty-element/commit/f6a2bad3be1f8747d95d5bca4bd8027923c8fe6d))
- **layout:** add arf and spectral layouts ([b573e36](https://github.com/graphty-org/graphty-element/commit/b573e363e6145528bf86c0fa69a432ba6fdac4f2))
- **layout:** add bfs layout, fix layout options ([3b4af6f](https://github.com/graphty-org/graphty-element/commit/3b4af6f3707cfe8a0e783b3ca8518facb96fe2db))
- **layout:** add bipartite and multipartite layouts ([30feb74](https://github.com/graphty-org/graphty-element/commit/30feb74a417830df2032a5fad3291d34b29388cb))
- **layout:** add forceatlas2 layout ([8cd570b](https://github.com/graphty-org/graphty-element/commit/8cd570b2845add320ca9b8d91a699251183a50e4))
- **layout:** add more sensible layout defaults ([6fa6583](https://github.com/graphty-org/graphty-element/commit/6fa65838cc24dbb11141d5451ed6b077abb0bd87))
- **style:** add 2d node style ([9c19704](https://github.com/graphty-org/graphty-element/commit/9c197048802717e6a3404e7249a0d403752b1f77))
- **styles:** add edge inheritance, add styles to web component ([2f600bc](https://github.com/graphty-org/graphty-element/commit/2f600bc04d5da288f1398b8d2e7538400e187072))
- **styles:** add style inheritance, other refactoring ([f4d80e8](https://github.com/graphty-org/graphty-element/commit/f4d80e8b3b17f60680e1d9a19fa045af6ee18051)), closes [#1](https://github.com/graphty-org/graphty-element/issues/1)
- **style:** update default styles ([b44114b](https://github.com/graphty-org/graphty-element/commit/b44114b28c57f71577422074349af46d79a515c3))
