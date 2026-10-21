# cosmos.gl and Cosmograph: how they reach a million points, and what graphty can borrow

This note explains how cosmos.gl, an open-source WebGL graph renderer and force simulation, draws
and lays out graphs of a million points in a browser; what it gives up to do that; how it compares
with graphty-element and @graphty/webgpu-graph-algorithms; and which of its techniques graphty
should adopt, in priority order.

Sources:

- **cosmos.gl**: the repository https://github.com/cosmosgl/graph at commit
  [`68f18038d5`](https://github.com/cosmosgl/graph/tree/68f18038d5367e2682b5726b62976f26e6d65586)
  (2026-10-14), released as `@cosmos.gl/graph` 3.5.1 under the MIT license. Every cosmos.gl path
  below (`src/...`, `docs/...`, `history/...`) is relative to that commit. Its `history/` folder
  is the authors' own engineering log, and most of cosmos.gl's measured numbers come from it.
- **graphty**: this repository's `golden` branch on 2026-10-20. graphty paths are relative to the
  repository root.

Every claim is marked as one of three kinds, and the three are never mixed in one sentence:

- **Fact**: read from code or from a document, with the file or URL named.
- **Vendor claim**: something Cosmograph's marketing says with no measurement behind it.
- **Judgment**: this note's conclusion from the facts.

Measured numbers are facts and name their hardware. The two sides were measured on different
machines: cosmos.gl's numbers come from an Apple M3, an integrated GPU with roughly one tenth of the
peak throughput of the NVIDIA RTX 4070 SUPER that graphty's numbers come from. Where graphty is
slower on the stronger card, the real gap is larger than the tables show. Section 8 measures both
on the same machine.

---

## 1. Summary

**Judgment: cosmos.gl's scale comes from one rule -- positions never leave the GPU.** Positions
live in a float texture. Each force is a full-screen fragment pass. All points are one draw call
and all links are one draw call, and both read positions from the texture in the vertex shader.
There is no JavaScript object per element and no CPU loop over elements per frame.

**Fact: the rendering gap is about 10x in graph size and about 50x in load time.**

- cosmos.gl, on an Apple M3, draws 1M points in 15-29 ms a frame, loads 1M points and 1M links in
  about 0.5 s, and loads 1M points and 5M links in about 1.5 s.
- graphty-element, on an RTX 4070 SUPER, refuses graphs above 100,000 nodes or 1,000,000 edges. At
  that ceiling it loads in 27.5 s and draws a still frame in about 51 ms.
- The cause in graphty-element: one Babylon.js mesh instance and one JavaScript `Node` object per
  node, one JavaScript `Edge` object per edge, a CPU loop that copies every position into the
  meshes, and CPU ray-cast picking.

**Judgment: graphty's GPU layout is not behind cosmos.gl's; it is probably ahead.**
webgpu-graph-algorithms' ForceAtlas2 grid tier already reimplements cosmos.gl's current many-body
approximation as WebGPU compute kernels, with sorted cells and with 3D. On an RTX 4070 SUPER one
iteration takes 0.55 ms of kernel time (1.8 ms wall) at 100,000 nodes and 1,000,000 edges, and
5.3 ms of kernel time at 1M nodes and 10M edges. cosmos.gl publishes no per-iteration numbers at
those sizes. What graphty lacks is the path from the layout to the screen: positions are read back
to the CPU and every node is then visited in JavaScript.

**Fact: on one machine and one browser (section 8), the gap holds.** At 100,000 nodes and
1,000,000 edges graphty-element took 28-30 s to a first frame and 86-111 ms per still frame;
cosmos.gl took 0.7 s and 28 ms, and drew 1,000,000 nodes in 29 ms a frame. A hover takes
graphty-element 53-153 ms at 100,000 nodes on current golden, against cosmos.gl's 17 ms; the
benchmark's own graphty-element build was older and much slower to hover (section 8.4).

**Judgment: what to borrow, in order:** drawing nodes and edges straight from a GPU position
texture, with layout positions handed to the renderer without a CPU loop; typed-array columns
instead of per-element objects; GPU picking through an ID buffer; edge trimming and curves in the
vertex shader; GPU sampling of which labels to show. Little is left to take on the layout side.

**Judgment: what graphty does that cosmos.gl cannot** -- real 3D meshes and XR, in-scene text
labels, stacked per-element style layers, 15+ layouts and 60+ algorithms, and a node and edge
attribute model. None of these requires a scene object per node, so none of them blocks the
techniques above.

---

## 2. What cosmos.gl and Cosmograph are

**cosmos.gl** (`@cosmos.gl/graph`) is a library: a WebGL 2 renderer for points and links plus a
force simulation that runs on the GPU. A host page hands it flat typed arrays of positions, colors,
sizes and link endpoints, and it draws them and runs the layout.

**Cosmograph** is the commercial product built on it. It adds DuckDB-WASM, Apache Arrow and Mosaic
for loading, filtering and cross-linked charts, and a React wrapper.

Facts about the product line:

- Cosmograph shipped 3D in August 2026: `spaceDimensions: 3`, drawn as sprites with sphere shading
  and depth fade (https://cosmograph.app/docs-lib/features/3d/). The open-source library's released
  code (`main`) is 2D only.
- Rendering uses WebGL 2 through luma.gl 9.3, a peer dependency; version 3.0 moved off regl.
  There is no WebGPU path: "WebGL 2 fragment shaders over ping-pong FBOs throughout"
  (`docs/host-embedding/README.md`, lines 338 and 429-430). It requires float textures and the
  `EXT_float_blend` extension.

Vendor claims, none with fps, timings or hardware attached:

- https://cosmograph.app/library and its comparison page set Cosmograph against Sigma.js and
  react-force-graph-3d: "Force Simulation for more than 50K points" (Cosmograph only), "Rendering
  more than 1M points and links" (Cosmograph and Sigma.js), and "WebGL rendering, zero-copy data
  flow, multi-million node graphs."
- The concept page (https://cosmograph.app/docs-general/concept/) says CPU force layouts "hit
  performance walls around 50,000 nodes".

Facts about the public evidence:

- The live benchmark (https://cosmograph.app/library/benchmark/) measures only time-to-ready, on
  the visitor's own machine, at 5K, 10K and 50K points, and publishes no results.
- Nikita Rokotyan's article "How to visualize a graph with a million nodes" (Nightingale,
  2022-08-23, https://nightingaledvs.com/how-to-visualize-a-graph-with-a-million-nodes/) uses
  sample graphs up to 475k nodes and 1.01M edges, says the simulation runs on "a square grid", and
  gives no fps.

The measured numbers in this note therefore come from the repository's engineering log, not from
the marketing pages.

---

## 3. How cosmos.gl reaches a million points

### 3.1 Positions on the GPU

Facts:

- Point positions are an `rgba32float` texture whose side is `ceil(sqrt(n))`, with two
  framebuffers that the simulation alternates between, reading one and writing the other
  ("ping-pong") (`src/simulation.ts`, lines 706 and 913-917). In 3D, on a branch, z is stored in
  the alpha channel.
- Links are a texture of side `ceil(sqrt(2 * links))` holding a per-point compressed sparse row:
  each point's first-link texel and count, then the neighbor texels
  (`src/modules/ForceLink/index.ts`, lines 41-108). On the CPU this is three `Uint32Array`s,
  rebuilt only when the links change (`history/2026/2026-09-24-links-by-point.md`).
- Every texture read is by integer texel (`texelFetch`). Reads by float coordinate misread a
  neighbor's texel on 2,284 of 4,095 texture sizes on an M3
  (`history/2026/2026-07-30-data-texture-addressing.md`).
- Limits: a texture side up to the device's `maxTextureDimension2D`; indices stored as floats are
  exact only up to 2^24 (16.7M); depth order stays distinct to about 8.4M points; the finest
  simulation grid is at most 512 x 512; the simulation space (`spaceSize`, default 4096) is clamped
  to the texture limit (`src/modules/Store/index.ts`, lines 236-260).

### 3.2 One draw call for points

Facts:

- All points are a single point-list draw with one vertex per point, drawn as `gl_PointSize`
  sprites (`src/modules/Points/index.ts`, lines 846-878). The vertex shader fetches each position
  from the texture by point index (`src/modules/Points/draw-points.vert`). This is "vertex
  pulling": the shader pulls its own data by index instead of receiving it per vertex.
- Shapes are signed distance fields; images come from an atlas; anti-aliasing is a ramp one device
  pixel wide at the edge.
- Overlapping opaque points are drawn in two passes: an opaque front-to-back pass that writes depth
  and does not blend, so the GPU can skip hidden fragments early, then a blended pass for the
  anti-aliased fringe. Each point gets depth `z = 1 - 2(i + 0.5) / N`. 1M points at 8 px took
  28.8 ms a frame with this culling and 39.4 ms without, on an M3
  (`history/2026/2026-09-10-edge-ramps.md`, lines 157-164).

### 3.3 One draw call for links

Facts:

- All links are one instanced triangle-strip draw. Each instance carries the two endpoint texel
  indices, colors, widths, an arrow flag, an index and a style; the vertex shader fetches both
  endpoints from the position texture (`src/modules/Lines/index.ts`, lines 1135-1170;
  `src/modules/Lines/draw-curve-line.vert`).
- Curves are conic sections evaluated in the shader over a fixed strip of 19 segments
  (`src/variables.ts`, lines 52-55; `src/modules/Lines/conic-curve-module.ts`). Curvature is one
  global switch, not per link.
- Arrows, dashes and dots, gradients and zoom-scaled width are all computed in the shader.
- One level-of-detail rule, `linkVisibilityDistanceRange` (default 50-150 px), fades links toward
  0.25 opacity as their length on screen grows (`src/config.ts`, lines 360-377).
  `linkBlending: false` turns blending off for dense graphs.
- 50k points and 500k links draw in 10.1-25.9 ms a frame on an M3
  (`history/2026/2026-09-10-edge-ramps.md`, lines 165-169).

### 3.4 The force simulation as fragment passes

Facts:

- Each simulation tick is a sequence of full-screen fragment passes with one texel per point
  (`src/simulation.ts`, lines 897-960), in this order: gravity, center, many-body, link (incoming),
  link (outgoing), clusters, collision. Each force writes a velocity texture; a final pass
  integrates velocity with friction and a clamp (`src/modules/Points/update-position.frag`).
- This one force model is cosmos.gl's only layout.

**Many-body repulsion** (`docs/many-body-force/README.md`; `src/modules/ForceManyBody/`) has two
paths. Facts:

- **Exact, up to 4,096 points**: all pairs (`ALL_PAIRS_MAX_POINTS`,
  `src/modules/ForceManyBody/index.ts`, line 75). It takes 1.8 ms a step at 2k points.
- **Approximate, above 4,096 points**: a particle-particle particle-mesh (P3M) style scheme.
  1. Points are drawn as one-pixel points into a pyramid of grids, from 4 x 4 up to a finest side
     of about `2 * sqrt(n)`, capped at 512. Additive blending makes each cell hold the sum of x,
     the sum of y and the count.
  2. Far field: the coarsest level covers every cell outside a point's own 3 x 3 neighborhood;
     each finer level covers its 6 x 6 block of children minus its own 3 x 3. Space is tiled
     exactly once, so there is no accuracy parameter like Barnes-Hut's theta.
  3. Near field (the finest 3 x 3): every point gets a hash (`lowbias32`), and K depth-peeling
     passes pick each cell's K smallest-hash points -- 32 up to 16k points, 16 up to 65k, 8 above.
     The sampled pairs' exact forces are scaled by (others / sampled), the Horvitz-Thompson
     estimator, which keeps the estimate unbiased.
  4. Points at identical positions get a random kick, and a point's movement per tick is clamped to
     two cells.
- The authors measured this at 1.2-4x faster per step than the Barnes-Hut quadtree it replaced.
  No absolute numbers at large sizes are published.

**3D.** Facts: the released code is 2D only. Branch `feat/3d` is exact O(n^2), "practical up to
roughly 10-20k points". Branch `feat/3d-merged` (2026-07-13) has a 3D grid pyramid (64^3, tiled
into a 512 x 512 texture), brute force at or below 4,096 points, and 8 near-field samples.

**Link springs.** Fact: each point gathers over its own row of the link texture
(`src/modules/ForceLink/force-spring.ts`; `src/modules/ForceLink/index.ts`, line 199). The loop
bound is a compile-time constant equal to the graph's largest degree, guarded by
`if (i < linkAmount)`. Judgment: the cost is about n x (largest degree), so one hub makes every
point pay for it.

**Other forces.** Facts: gravity, center, clusters (centroids computed on the GPU), repulsion from
the mouse, and collision (a spatial hash with a 3 x 3 search, allocated only when switched on;
`history/2026/2026-06-13-collision-force.md`).

### 3.5 Picking from an ID buffer

Facts (`docs/picking/README.md`; `history/2026/2026-07-09-picking.md`):

- Points: a half-resolution ID buffer (capped at 1536 px, `rgba32float`) holds each pixel's point
  index and position. A hover reads the 9 x 9 window under the cursor.
- Links: a full-resolution index buffer, read at the cursor's pixel.
- Both buffers are redrawn only when stale and read back asynchronously (a pixel buffer object and
  a fence), so a hover never stalls the GPU. A click reads synchronously.
- Rectangle and lasso selection are GPU passes (`src/modules/Points/find-points-in-rect.frag`,
  `src/modules/Points/find-points-in-polygon.frag`).

### 3.6 Label sampling

Facts:

- cosmos.gl draws no text.
- A GPU pass divides the screen into cells of `pointSamplingDistance` (default 100 px) and keeps
  one point per cell (`src/modules/Points/fill-sampled-points.vert`).
  `getSampledPointPositionsMap` reads the result back (`src/modules/Points/index.ts`, line 2601),
  and the host page draws DOM labels for those points only. `getSampledLinks` does the same for
  links.
- Positions the host asks to track are read without blocking, one frame behind
  (`history/2026/2026-09-28-nonblocking-position-reads.md`).

### 3.7 On-demand rendering

Fact: when nothing moves, cosmos.gl draws no frames at all; a still scene costs nothing
(`history/2026/2026-07-07-on-demand-rendering.md`).

### 3.8 The load path

Facts: the input API is flat typed arrays, uploaded as textures. Measured with 1M points in
headless Chrome on an M3 (`history/2026/2026-09-24-links-by-point.md`, lines 44-53):

| Links | Whole load (`Graph.render()`) | Link texture build, per direction |
| ----- | ----------------------------- | --------------------------------- |
| 1M    | 521-566 ms                    | 100-108 ms                        |
| 5M    | 1,464-1,581 ms                | 442-501 ms                        |

---

## 4. What cosmos.gl gives up

Facts:

- Points are sprites only: no meshes, and no 3D in the released library.
- Styling is a fixed set of channels (color, size, shape, width) with no layers or selectors.
- Curvature is one global switch.
- No text rendering and no attribute model: the host owns the data.
- One layout and no graph algorithms.
- WebGL 2 only.

Judgments:

- Near-field sampling shimmers in dense hubs above 4k points while the simulation is still hot; the
  authors describe this as mitigated, not removed.
- The link force costs n x (largest degree), which punishes graphs with hubs.

---

## 5. graphty today

### 5.1 graphty-element rendering

Facts:

- **Nodes**: one Babylon.js `InstancedMesh` per node (`graphty-element/src/meshes/MeshCache.ts`,
  lines 37-59), so 10,000 nodes make 10,003 scene meshes, plus a JavaScript `Node` object each
  (`graphty-element/src/Node.ts`).
- **Edges**: batched as thin instances (`graphty-element/src/meshes/EdgeLineBatch.ts`), 14 floats
  per piece computed on the CPU. A curved edge is up to 64 pieces built on the CPU. Arrows are
  thin instances (`graphty-element/src/meshes/ArrowCapBatch.ts`). Patterned and animated lines get
  a mesh each. Every edge has a JavaScript `Edge` object (`graphty-element/src/Edge.ts`).
- **Labels**: a plane, a material and a `DynamicTexture` each
  (`graphty-element/src/meshes/RichTextLabel.ts`).
- **Picking**: Babylon's CPU `scene.pick`, against nodes only; edges cannot be picked
  (`graphty-element/src/NodeBehavior.ts`, lines 38-45; `graphty-element/src/Graph.ts`).
- **Per frame** (`graphty-element/src/managers/UpdateManager.ts`, lines 1296-1540; `Node.ts`,
  lines 620-660; `Edge.ts`, lines 662-721 and 1624-1700): the layout steps; a JavaScript loop over
  every node sets mesh positions; if anything moved, a loop over every edge recomputes where the
  edge stops at its nodes' surfaces ("trimming") -- closed-form for round nodes, two ray casts
  otherwise.
- Still frames freeze Babylon's active-mesh list and may skip drawing
  (`graphty-element/src/managers/RenderManager.ts`, lines 573-617).
- **Ceiling**: the default limits are 100,000 nodes and 1,000,000 edges; a larger graph is refused
  with `E_TOO_LARGE` (`graphty-element/src/session/limits.ts`, lines 96-119;
  `graphty-element/src/session/project/ingest.ts`). There is no level of detail.
- **GPU layout**: opt-in through the `@graphty/graphty-element/webgpu` entry, on its own GPU
  device. Positions are read back to the CPU per batch of iterations, then a loop publishes every
  node's position (`graphty-element/src/layout/SimulationLayoutEngine.ts`, lines 1036-1070). The
  default layout is ngraph on the main thread; it switches to the GPU spring-electrical layout at
  2,000 nodes or more when the GPU package is installed
  (`graphty-element/src/managers/LayoutManager.ts`, lines 926-949).

### 5.2 webgpu-graph-algorithms

Facts:

- ForceAtlas2, Fruchterman-Reingold and spring-electrical, in 2D and 3D.
- An exact tier up to 32,768 nodes. That threshold is an accuracy choice; the speed crossover is at
  2k-4k nodes.
- A grid tier that is cosmos.gl's P3M scheme re-expressed as compute kernels: cells sorted by radix
  sort, a centroid pyramid built without atomics, the same tile-once far field, and a near field
  over 9 cells (27 in 3D) that is exact up to 64 points per cell and otherwise takes 64 `lowbias32`
  samples weighted by Horvitz-Thompson
  (`webgpu-graph-algorithms/src/wgsl/grid-near-field.wgsl.ts`).
- Attraction is a gather over the compressed sparse rows in three degree tiers, so a hub does not
  slow down every other node.
- Positions stay on the GPU within a batch of iterations.

---

## 6. Comparison

Hardware: cosmos.gl's numbers are from an Apple M3; graphty's are from an RTX 4070 SUPER unless a
row says T4 (an NVIDIA T4 in CI). The M3 has roughly a tenth of the 4070 SUPER's peak throughput.

### 6.1 Rendering and load

All numbers are measured facts unless marked.

| Measure                       | cosmos.gl (M3)                                 | graphty-element (4070 SUPER)                                                                        |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Largest graph                 | no ceiling; 1M points with 5M links measured   | 100k nodes / 1M edges; larger is refused                                                            |
| Load, 1M points + 1M links    | 0.52-0.57 s                                    | not accepted                                                                                        |
| Load, 100k nodes + 1M edges   | not published                                  | 27.5 s (`graphty-element/src/session/limits.ts`, lines 31-37)                                       |
| Load, 10k nodes + 100k edges  | not published                                  | 3.3 s                                                                                               |
| Still frame, 1M points        | 15-29 ms                                       | not accepted                                                                                        |
| Still frame, 100k + 1M        | not published                                  | 1,120 ms in the `limits.ts` table; about 51 ms with later rendering-performance changes             |
| 100k nodes, no edges          | not published                                  | 58.6 ms still, 105 ms while orbiting                                                                |
| Frame, 50k + 500k             | 10-26 ms                                       | 488 ms (the `limits.ts` table)                                                                      |
| 60 fps holds up to            | judgment: about 1M small points                | about 40k edges; 30 fps to about 80k (`limits.ts`, lines 53-56)                                     |
| Memory, 100k + 1M             | fact: a few textures of n texels               | 2.0 GB JavaScript heap, 3.3 GB renderer process                                                     |

Facts about where graphty-element's frame time goes:

- Babylon's active-mesh selection is 70-87% of a WebGL frame
  (`graphty-element/docs/decisions/renderer-webgpu.md`).
- At a million edges, the per-edge walk of a still frame took 207 ms against 41 ms of drawing
  (`graphty-element/src/managers/UpdateManager.ts`, lines 1503-1506).
- At 2,000 nodes, ray-cast edge trimming took 137 of 151 ms (`graphty-element/src/Edge.ts`, lines
  1628-1634).

### 6.2 Layout

| Measure                       | cosmos.gl                                                   | webgpu-graph-algorithms                                                                                       |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Backend                       | WebGL fragment passes                                       | WebGPU compute                                                                                                |
| Near field                    | depth peeling, K = 8-32 samples                             | sorted cells; exact to 64 per cell, else 64 samples                                                           |
| 3D                            | on a branch only (64^3 grid)                                | released (128^3 grid)                                                                                         |
| Iteration, 100k + 1M edges    | not published (see below)                                   | 4070 SUPER: 0.55 ms kernel, 1.77 ms wall in Node, 3.7 ms with readback in Chromium; T4: 1.5 ms / 4.5 ms        |
| Iteration, 1M + 10M edges     | not published                                               | 4070 SUPER: 5.3 ms kernel / 9.2 ms wall; T4: 28 ms / 40 ms                                                    |
| Link force cost               | n x (largest degree)                                        | gather in three degree tiers                                                                                  |
| Path to the renderer          | none needed: the renderer reads the simulation's texture    | readback to the CPU, then a JavaScript loop per node                                                          |

Fact: graphty's WebGPU plan quotes 6.6 ms at 100k and 13.8 ms at 200k for cosmos.gl
(`design/webgpu/webgpu-acceleration-plan.md`, section 7.21) but names no source or hardware, so
this note does not use those figures.

Judgments:

- On kernel speed graphty is at least competitive and likely faster. The same-machine measurement
  in section 8 ran different layout algorithms on the two sides, so it does not settle this; it
  does show that graphty-element's time goes to publishing positions, not to the kernel.
- Inside graphty-element, publishing positions and drawing dominate the frame, not the layout. That
  matches the earlier finding in `graphty-element/docs/decisions/G6.md`.

### 6.3 Features

Facts:

| Feature                     | cosmos.gl                                            | graphty-element                                              |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| 3D                          | product only, as sprites                             | the default, with meshes and lighting                        |
| XR (VR and AR)              | no                                                   | yes                                                          |
| Node shapes                 | signed-distance sprites and images                   | 3D meshes                                                    |
| Styling                     | fixed channels                                       | stacked style layers with selectors                          |
| Labels                      | none; GPU sampling for the host's DOM labels         | in-scene rich text                                           |
| Edges                       | straight or one global curve; arrows, dashes, gradient | per-edge curves and bends, joins, arrows, patterns, animation |
| Edge picking                | yes                                                  | no                                                           |
| Lasso and rectangle select  | yes, on the GPU                                      | no                                                           |
| Algorithms                  | none                                                 | 60+                                                          |
| Layouts                     | 1                                                    | 15+                                                          |
| No frames when still        | yes                                                  | partly                                                       |

---

## 7. Recommended improvements, in priority order

Each item names where it goes in graphty, the expected gain (a judgment unless a number is cited),
the cost, and what it conflicts with. The order follows the same-machine measurement in section 8:
the per-element CPU work of drawing and of publishing layout positions comes first, picking is a
scaling item, and layout work stays low because the GPU kernel was not the slow part.

### 7.1 Draw nodes from a GPU position texture (vertex pulling)

- **What**: replace one `InstancedMesh` per node with one thin-instance batch per shape and
  material. The shader reads each node's position and size by instance index from a float texture
  or storage buffer; the other channels (color, opacity, outline) sit in per-instance buffers that
  the style layers write.
- **Where**: `graphty-element/src/meshes/MeshCache.ts`, `graphty-element/src/Node.ts`, the node
  update in `graphty-element/src/managers/UpdateManager.ts`, and a Babylon `ShaderMaterial` or
  `NodeMaterial`.
- **Gain**: removes Babylon's active-mesh selection (70-87% of a frame) and the per-node position
  loop. Confirmed by section 8: at 10,000 nodes graphty-element's still frame is 30-33 ms against
  cosmos.gl's 4 ms, and at 100,000 nodes 86-111 ms against 28 ms. A still frame at 100k nodes
  should fall to a few milliseconds of CPU work, and a ceiling well above 100k nodes becomes
  realistic.
- **Cost**: large, weeks. Highlight and outline, per-node visibility, XR and anything that reads a
  node's mesh need rework; `Node` becomes a handle into the batch.
- **Conflicts**: style layers are compatible (their values go into instance buffers instead of
  materials). Node shapes become one batch per shape, the pattern edges already use. Picking must
  move to the ID buffer (7.4), because there are no per-node meshes left to ray-cast.

### 7.2 Hand layout positions to the renderer without a CPU loop

- **What**: on WebGL, upload each batch's readback as one texture instead of looping over nodes;
  this needs only 7.1. On WebGPU, share one GPU device between Babylon.js and
  webgpu-graph-algorithms so the renderer reads the layout's buffer directly -- a risk the WebGPU
  plan deferred.
- **Where**: `graphty-element/src/layout/SimulationLayoutEngine.ts` and the WebGPU entry.
- **Gain**: removes the per-node publish loop, which section 8 measured at about 370 ms of a
  394 ms layout step at 100k nodes and 1M edges; it is why a frame takes 1.6-2.3 s while the
  layout runs there, against cosmos.gl's 19 ms. The shared device also removes up to 3.7 ms of
  readback per iteration.
- **Conflicts**: code that reads node positions on the CPU needs cosmos.gl's pattern of
  non-blocking reads that are one frame behind.

### 7.3 Typed-array columns instead of `Node` and `Edge` objects

- **What**: element state lives in typed-array columns, with `Node` and `Edge` as lazy facades
  created on demand. This matches the column layout of `@graphty/graph-format` snapshots.
- **Where**: `graphty-element/src/Graph.ts`, the data manager, `Node.ts`, `Edge.ts`.
- **Gain**: load time and memory. Confirmed by section 8: at 100k nodes and 1M edges
  graphty-element took 28-30 s to a first frame against cosmos.gl's 0.7 s, and 2.5-3.0 GB of heap
  against 160 MB.
- **Cost**: large, and it may touch public API that hands out `Node` and `Edge` objects.
- **Conflicts**: style selectors are evaluated per element today; they need an evaluator that runs
  over columns.

### 7.4 GPU ID-buffer picking, with edge picking and lasso

- **Why here**: facts from section 8.4: on current golden a hover takes 53-153 ms at 100,000
  nodes, and with the fix for #3244 30-53 ms, against cosmos.gl's 17 ms. Each pick still visits
  every mesh, so the cost grows linearly with the graph. Judgment: a scaling item, not a defect;
  an ID buffer makes a hover cost the same at any size. It must land no later than 7.1, which
  removes the per-node meshes the CPU pick tests.
- **What**: draw node and edge indices into an offscreen target only when something changed; a
  hover reads a small window around the cursor asynchronously, a click reads synchronously.
  Rectangle and lasso selection become GPU passes over the same data.
- **Where**: `graphty-element/src/NodeBehavior.ts` and the element-at-point lookup in
  `graphty-element/src/Graph.ts`.
- **Gain**: hover cost no longer depends on the number of elements (cosmos.gl answered a hover in
  17-24 ms at 100,000 and 1,000,000 points); edges become pickable; lasso and rectangle selection
  become possible at any size.
- **Cost**: medium.
- **Conflicts**: XR picks along a controller ray, not at a screen pixel; there, keep a CPU ray test
  against an array of node bounding spheres. Required by 7.1.

### 7.5 Edge trimming and curves in the vertex shader

- **What**: an edge instance carries only its two endpoint indices and its style. The shader
  fetches positions and node sizes, trims the edge at the node surface (closed-form for round
  nodes, a per-shape table of boundary radius by angle for the others, which needs no ray cast),
  and draws curves over a fixed strip of segments, as cosmos.gl does.
- **Where**: the shaders of `graphty-element/src/meshes/EdgeLineBatch.ts` and
  `graphty-element/src/meshes/ArrowCapBatch.ts`; the update in `graphty-element/src/Edge.ts`.
- **Gain**: removes the per-edge CPU walk (207 ms per still frame at a million edges) and CPU
  curve building, which once took more than 10 s for 359 curved edges.
- **Cost**: medium to large. Joins on bent edges need neighboring positions in the shader.
- **Conflicts**: patterned and animated lines would move to distance fields in the shader, which
  also removes their per-edge meshes. Per-edge curves stay per-edge: unlike cosmos.gl, the curve
  parameters are per-instance data, not a global switch.

### 7.6 GPU screen-grid label sampling, with an instanced glyph-atlas text batch

Labels were not part of the section 8 measurement, so this item rests on section 3.6 alone.

- **What**: choose one node per screen cell on the GPU and label only those, drawing the text from
  one instanced batch over a glyph atlas instead of a texture per label.
- **Where**: `graphty-element/src/meshes/LabelBatch.ts` and
  `graphty-element/src/meshes/RichTextLabel.ts`.
- **Gain**: label cost is bounded by the screen area, not by the node count.
- **Cost**: medium for the sampling; large for the atlas text renderer.
- **Conflicts**: rich-text styling is harder in an atlas renderer. Which labels a reader sees is a
  presentation choice, so the sampling must be an option with its distance as a setting, off by
  default.

### 7.7 Smaller items

- An option to draw at the screen's device pixel ratio. The build measured in section 8 always
  drew one pixel per CSS pixel, a quarter of cosmos.gl's pixels on a ratio 2 screen. Fact:
  graphty-element 3.29.0 added it as the `pixelRatio` property (`pixel-ratio="device"`), default 1;
  what remains is to rerun the ratio 2 measurement with it.
- Fade long edges, as an option off by default (the `EdgeLineBatch.ts` shader).
- An option to turn edge blending off for dense graphs.
- Two guards cosmos.gl added after bugs: check that graphty's kernels kick nodes at identical
  positions apart and clamp per-tick movement. graphty already uses `lowbias32` hashing and
  integer-indexed storage buffers, which avoid cosmos.gl's texture-addressing bug.
- A collision force for the force-simulation layouts, like d3's `forceCollide`. ForceAtlas2
  already prevents overlap.
- A cluster force with centroids computed on the GPU, pulling together the communities an
  algorithm found.

### 7.8 What not to borrow

- Depth peeling for the near-field sample: a WebGL workaround; graphty's sorted compute is better.
- The link-force loop bounded by the largest degree.
- WebGL-only compute.

---

## 8. Measured comparison (2026-10-21)

Every comparison in sections 1 to 7 sets numbers from two different machines side by side. This
section measures cosmos.gl and graphty-element in the same browser on the same machine, on the
same graphs. Everything in 8.1 to 8.3 is a measured fact unless marked as a judgment.

### 8.1 Setup

- **Machine**: Intel Core i9-14900, about 90 GB of RAM, Linux (kernel 5.15), NVIDIA GeForce RTX
  4070 SUPER with driver 580.178.04.
- **Browser**: Playwright's headless Chromium 143.0.7499.4, one fresh browser profile per
  measured configuration. WebGL 2 ran on ANGLE over Vulkan 1.4.312 on the NVIDIA card, and WebGPU
  reported the same card. Vsync and the frame-rate limit were switched off. The drawing area was
  1200 x 900 CSS pixels.
- **cosmos.gl**: `@cosmos.gl/graph` 3.5.1 with luma.gl 9.3. The simulation was paused for the
  rendering measurements, and the test page drew one frame per animation frame through
  `renderOneFrame()`.
- **graphty-element**: built from this repository's source on 2026-10-17, between the 3.28.5 and
  3.29.0 releases, with the `@graphty/graphty-element/webgpu` entry loaded so the layout could run
  on WebGPU. Layout `fixed` for the rendering measurements. Two configurations:
  - **2D lean**: `viewMode` `2d`, every node a box, no arrowheads (both set through style layers);
  - **3D default**: `viewMode` `3d` with the default style.
- **CPU layout runs**: both configurations were also run with `acceleration` `off`. Only their
  layout numbers appear below.
- **Graphs**: random graphs from graph-samples' `erdosRenyiGnmGraph` (seed 42) at 10,000 nodes and
  100,000 edges, 100,000 nodes and 1,000,000 edges, and 1,000,000 nodes and 1,000,000 edges. Every
  node got a random position in a square, and both libraries received the same positions.
- **Device pixel ratio**: every configuration ran at ratio 1, and most also at ratio 2. The tables
  show ratio 1; 8.3 covers ratio 2.

### 8.2 Method

- **Load**: from handing over the data to the first frame that shows every node and edge. For
  graphty-element, "ready" is when it also reports a stable frame; for cosmos.gl the two are the
  same moment. cosmos.gl got typed arrays, graphty-element got `nodeData` and `edgeData` arrays of
  objects: each library's own input API.
- **Still frame**: 200 frames of an unchanging view. Each frame is followed by a blocking read of
  one pixel, so the interval between frames is the whole CPU and GPU cost of one frame. The read
  itself costs 0.3-0.4 ms.
- **Moving frame**: 200 frames while the camera moves: a pan in 2D (cosmos.gl and 2D lean), an
  orbit in 3D.
- **Hover**: a real pointer move, made by Playwright, onto a node's position on screen. The time
  runs from the browser's `pointermove` event to the library's hover callback (cosmos.gl's
  `onPointMouseOver`, graphty-element's `graphty-node-hover` event). Ten nodes for cosmos.gl, three
  for graphty-element.
- **Memory**: the JavaScript heap after a forced garbage collection; the resident memory of the
  renderer and GPU processes; and the growth of the card's used memory as `nvidia-smi` reports it.
- **Layout**: cosmos.gl's own force simulation against graphty-element's default force layout
  (ngraph, running on WebGPU). Three numbers: the frame interval while the layout runs (up to 200
  frames or 30 s); one step plus reading positions back; and the time per step in a batch of steps
  (50 for cosmos.gl, 16 for graphty-element) with one read at the end.
- **Hover profile**: a Chrome CPU profile of one graphty-element hover at 10,000 nodes and 100,000
  edges in the 3D default configuration.
- **Hover re-measured**: after the main runs, graphty-element's hover was measured again with the
  same test page on a build of current golden, and on a build of the fix for #3244 (8.4).

### 8.3 Results

Where cosmos.gl was run twice, a cell gives the range of the two runs. Times are medians, with the
95th percentile after the slash.

**10,000 nodes, 100,000 edges**

| Measure                             | cosmos.gl            | graphty-element 2D lean | graphty-element 3D default |
| ----------------------------------- | -------------------- | ----------------------- | -------------------------- |
| First frame                         | 0.17-0.24 s          | 1.36 s                  | 3.08 s                     |
| Ready                               | 0.17-0.24 s          | 3.30 s                  | 6.76 s                     |
| Still frame                         | 3.8-4.1 / 5.9-7.0 ms | 33.4 / 37.3 ms          | 30.0 / 36.8 ms             |
| Moving frame                        | 3.7-4.0 / 4.0-4.3 ms | 40.6 / 60.1 ms          | 47.8 / 68.8 ms             |
| Hover                               | 7.4 ms (ratio 2)     | 30.7 s (26.1-36.6 s)    | 51.3 s (35.0-61.1 s)       |
| Hover, graphty-element on golden    | -                    | 7.6-17.7 ms             | 7.6-17.7 ms                |
| Hover, graphty-element, #3244 fix   | -                    | 2.9-15.7 ms             | 2.9-15.7 ms                |
| JavaScript heap                     | 22 MB                | 345 MB                  | 289 MB                     |
| Renderer and GPU processes          | 429-431 MB           | 791 MB                  | 733 MB                     |
| Frame while the layout runs         | 6.9-7.2 / 8.5-9.3 ms | 117.6 / 187.3 ms        | 215.4 / 326.7 ms           |
| One layout step plus readback       | 6.1-8.4 ms           | 27.3 ms                 | 2.9 ms                     |
| Layout step in a batch              | 3.9-5.7 ms           | 2.7 ms                  | 2.3 ms                     |

**100,000 nodes, 1,000,000 edges**

| Measure                             | cosmos.gl              | graphty-element 2D lean    | graphty-element 3D default |
| ----------------------------------- | ---------------------- | -------------------------- | -------------------------- |
| First frame                         | 0.67-0.72 s            | 28.3 s                     | 30.3 s                     |
| Ready                               | 0.67-0.72 s            | 52.7 s                     | 49.8 s                     |
| Still frame                         | 28.4-28.5 / 28.7-28.8 ms | 86.1 / 120.1 ms          | 110.9 / 145.9 ms           |
| Moving frame                        | 28.7 / 29.2-29.5 ms    | 126.2 / 236.5 ms           | 211.3 / 404.5 ms           |
| Hover                               | 16.5-16.9 ms           | no answer (see below)      | no answer (see below)      |
| Hover, graphty-element on golden    | -                      | 53-153 ms                  | 53-153 ms                  |
| Hover, graphty-element, #3244 fix   | -                      | 30-53 ms                   | 30-53 ms                   |
| JavaScript heap                     | 160 MB                 | 3,045 MB                   | 2,466 MB                   |
| Renderer and GPU processes          | 610-622 MB             | 3,762 MB                   | 3,215 MB                   |
| Frame while the layout runs         | 18.9-19.1 / 22.7-25.4 ms | 1,575 / 2,751 ms         | 2,276 / 3,547 ms           |
| One layout step plus readback       | 9.0-9.2 ms             | 394 ms                     | 489 ms                     |
| Layout step in a batch              | 3.8-3.9 ms             | 23.4 ms                    | 30.5 ms                    |

**1,000,000 nodes, 1,000,000 edges**

| Measure                       | cosmos.gl                |
| ----------------------------- | ------------------------ |
| First frame and ready         | 1.57-1.91 s              |
| Still frame                   | 29.1-29.3 / 29.5-29.6 ms |
| Moving frame                  | 29.3-29.5 / 29.9-30.1 ms |
| Hover                         | 23.2-23.5 ms             |
| JavaScript heap               | 270 MB                   |
| Renderer and GPU processes    | 795-805 MB               |
| Frame while the layout runs   | 27.3-38.1 / 68.3-69.0 ms |
| One layout step plus readback | 41.9-45.9 ms             |
| Layout step in a batch        | 30.9-31.0 ms             |

graphty-element refused this graph: it stops at 100,000 nodes (`E_TOO_LARGE`).

Notes on the tables:

- **Hover**: graphty-element's "Hover" row comes from the 2026-10-17 build every other
  graphty-element number in these tables used (8.5). At 100,000 nodes that build never answered
  the first pointer move: in all five runs at that size the page was still busy when the run's
  30-minute limit closed it. The "on golden" and "#3244 fix" rows were measured later with the
  same test page, and give one range across both configurations.
- **The card's memory**: `nvidia-smi` reports the whole card, so its growth is noisy and was
  sometimes negative for graphty-element. For cosmos.gl it grew by 88 MB at 10,000 nodes, 350-366
  MB at 100,000 and 571-581 MB at 1,000,000; for graphty-element by under 100 MB at every size.
- **The CPU layout**: with `acceleration` `off`, a frame while the layout runs took 525-572 ms at
  10,000 nodes and 8,062 ms at 100,000 nodes; one CPU step took 30.5-49.8 ms and 795 ms.
- **Device pixel ratio 2**: cosmos.gl drew a 2400 x 1800 buffer and roughly doubled its frame
  times: still frames of 7.0-7.3 ms at 10,000 nodes and 60.3-61.0 ms at 100,000 and 1,000,000
  nodes, and hovers of 61-121 ms at 100,000 nodes. graphty-element's buffer stayed 1200 x 900 at
  ratio 2, so its ratio 2 runs drew the same pixels as its ratio 1 runs and are left out.

### 8.4 Why graphty-element is slower

**Picking.** Facts:

- **The 2026-10-17 build was quadratic.** In it every node had its own hover observer, and each
  one picked the whole scene with Babylon.js's CPU `scene.pick`. The hover profile shows the cost:
  one pointer move at 10,000 nodes kept the main thread busy for 60.5 s, about 31.6 s of it
  building picking rays (matrix multiplies and inversions) and about 11.4 s in intersection tests.
  That is where the 26-61 s hovers and the unanswered hovers at 100,000 nodes come from. The fix
  for #2941 landed after that build and gave the nodes one shared observer.
- **Current golden is linear.** Measured with the same test page, a hover takes 7.6-17.7 ms at
  10,000 nodes and 53-153 ms at 100,000 nodes, and the page stays responsive at 100,000.
- **The fix for #3244 trims the rays.** It adds a bounding-sphere test before Babylon.js builds a
  picking ray, cutting the rays per pointer move from 20,003 to 7 at 10,000 nodes and from 200,003
  to 7 at 100,000. A hover then takes 2.9-15.7 ms at 10,000 nodes and 30-53 ms at 100,000.
- **It stays linear.** Each pick still visits every mesh to run the pick filter, about 15-20 ms
  per pick at 100,000 nodes, with three picks per pointer move.

Judgment: picking is no longer a defect that freezes the page but a scaling cost: about twice
cosmos.gl's 17 ms at 100,000 nodes with the fix, and growing with the graph. An ID buffer, as
cosmos.gl uses, would make it constant; a spatial index over node bounds would make it grow far
more slowly (7.4).

**Publishing layout positions.** Fact: at 100,000 nodes, one layout step with its readback took
394-489 ms, while a step inside a batch of 16 took 23-31 ms, and that batch still includes one
readback at its end. A run with nothing drawn between steps gave the same picture (341 ms against
20 ms). Judgment: almost all of that time is the JavaScript loop that copies every read-back
position into its `Node` object and mesh (`graphty-element/src/layout/SimulationLayoutEngine.ts`,
lines 1036-1070), not the GPU kernel, which the earlier Node measurement puts at 1.77 ms wall
(section 6.2). That loop is why a frame takes 1.6-2.3 s while the layout runs at 100,000 nodes,
against cosmos.gl's 19 ms, where the renderer reads the simulation's texture directly.

**Per-element JavaScript walks every frame.** Fact: a still frame at 10,000 nodes costs
graphty-element 30-33 ms against cosmos.gl's 4 ms, and a moving frame 41-48 ms against 4 ms.
Judgment: this matches the costs measured earlier (section 6.1): Babylon's active-mesh selection
over one mesh per node, and the loops over every node and edge in
`graphty-element/src/managers/UpdateManager.ts`. cosmos.gl's frame time hardly depends on how much
moved; graphty-element's grows when the camera moves, because more per-element work runs.

**Device pixel ratio.** Fact: the measured graphty-element build always drew one pixel per CSS
pixel, so on a high-resolution screen it draws a quarter of the pixels cosmos.gl draws, and looks
softer. graphty-element 3.29.0, released after this build, added the `pixelRatio` property
(`pixel-ratio="device"`), with 1 as the default. Judgment: at ratio 2 the comparison flatters
graphty-element, and a fair high-resolution comparison needs a rerun with `pixel-ratio="device"`.

**Load and memory.** Judgment: the 40-fold load gap at 100,000 nodes (28-30 s against 0.7 s) and
the 15- to 19-fold heap gap (2.5-3.0 GB against 160 MB) follow from one JavaScript object, one mesh
instance and their bookkeeping per node and edge, against cosmos.gl's flat typed arrays uploaded
as textures.

### 8.5 Biases in this measurement

- **Different work per frame.** cosmos.gl draws flat sprites; graphty-element's 3D default draws
  lit meshes with arrowheads. The 2D lean configuration narrows the gap but does not close it.
  Neither drew labels, so labels were not measured.
- **Different layouts.** cosmos.gl's force model and graphty-element's ngraph engine are different
  algorithms; equal step times would not mean equal progress toward a finished drawing.
- **Easy graphs for cosmos.gl.** Random graphs have no hubs, and cosmos.gl's link force costs n x
  (largest degree) (section 3.4). A graph with hubs would slow its layout; it would not slow its
  rendering.
- **Different camera motion.** The moving frame is a pan for cosmos.gl and 2D lean and an orbit for
  3D default.
- **Who drives the frames.** The test page drove cosmos.gl's frames; graphty-element drove its own
  and was timed from its after-render event. The blocking one-pixel read puts both on the same
  footing for the still and moving numbers.
- **An old graphty-element build.** The test page imported a graphty-element build made on
  2026-10-17 at 09:19, before 3.29.0 and before the fix for #2941, and every graphty-element
  number in 8.3 comes from it except the two re-measured hover rows. Its
  hover numbers were wrong by three orders of magnitude for the reason in 8.4. Load, frame times,
  memory and the layout numbers were not re-measured on golden, and any change landed since then
  (rendering, data loading, the layout's publish path) could move them; only hover is known to
  have changed. The device pixel ratio option of 3.29.0 was not measured either.
- **Few samples.** One run per graphty-element configuration and two per cosmos.gl configuration;
  three hover samples for graphty-element. At 10,000 nodes and ratio 1, cosmos.gl's hover test
  found no target on screen (a defect of the test page), so its hover number at that size is from
  ratio 2.
- **The card's memory** is read for the whole card and is only a rough figure.
- **One machine.** A desktop GPU hides costs that an integrated GPU would show, for both libraries.

### 8.6 What the measurement changes

Judgments:

- **Vertex pulling and handing layout positions to the renderer without a CPU loop are
  confirmed.** The publish loop costs about 370 ms of a 394 ms layout step at 100,000 nodes, and
  the per-element frame work costs 26-44 ms at 10,000 nodes that cosmos.gl does not pay (7.1 and
  7.2).
- **Typed-array columns are confirmed.** Load is about 40 times slower and the heap 15-19 times
  larger at 100,000 nodes (7.3).
- **Picking is a scaling item.** The page-freezing hovers came from an old build. On golden, and
  with the fix for #3244, a hover costs 30-153 ms at 100,000 nodes and grows linearly; an ID buffer
  would make it constant (7.4).
- **An option to render at the device pixel ratio** is added as a small item, and 3.29.0 already
  ships it (7.7).
- **Labels were not measured**, so label sampling keeps its place on the evidence of section 3.6
  alone (7.6).
- **Layout borrowing stays low priority.** The GPU kernel was not the slow part anywhere in this
  measurement; the path from the kernel to the screen was.

---

## 9. Open questions and stale statements in graphty

Facts:

- `graphty-element/docs/decisions/G6.md`, lines 134-140, records no moving-frame number at 100k
  nodes and 1M edges with the GPU layout attached, and the share of time spent on readback as not
  measured. Section 8 now measures both: a frame takes 1.6-2.3 s while the layout runs, and the
  readback and publish take about 370 ms of each 394 ms step.
- `graphty-element/src/acceleration/types.ts`, lines 442-444, still cites a 50k / 100k ceiling.
- The documentation of `largeGraphThreshold` (`graphty-element/src/session/limits.ts`, line 98)
  promises "less visual detail" above 10k nodes, but no code does that.
