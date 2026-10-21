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
slower on the stronger card, the real gap is larger than the tables show.

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

**Judgment: what to borrow, in order:** drawing nodes and edges straight from a GPU position
texture; GPU picking through an ID buffer; edge trimming and curves in the vertex shader;
typed-array columns instead of per-element objects; GPU sampling of which labels to show. Little is
left to take on the layout side.

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

- On kernel speed graphty is at least competitive and likely faster. Only running both on the same
  machine settles it.
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
the cost, and what it conflicts with.

### 7.1 Draw nodes from a GPU position texture (vertex pulling)

- **What**: replace one `InstancedMesh` per node with one thin-instance batch per shape and
  material. The shader reads each node's position and size by instance index from a float texture
  or storage buffer; the other channels (color, opacity, outline) sit in per-instance buffers that
  the style layers write.
- **Where**: `graphty-element/src/meshes/MeshCache.ts`, `graphty-element/src/Node.ts`, the node
  update in `graphty-element/src/managers/UpdateManager.ts`, and a Babylon `ShaderMaterial` or
  `NodeMaterial`.
- **Gain**: removes Babylon's active-mesh selection (70-87% of a frame) and the per-node position
  loop. A still frame at 100k nodes should fall from about 50 ms to a few milliseconds, and a
  ceiling well above 100k nodes becomes realistic.
- **Cost**: large, weeks. Highlight and outline, per-node visibility, XR and anything that reads a
  node's mesh need rework; `Node` becomes a handle into the batch.
- **Conflicts**: style layers are compatible (their values go into instance buffers instead of
  materials). Node shapes become one batch per shape, the pattern edges already use. Picking must
  move to the ID buffer (7.2), because there are no per-node meshes left to ray-cast.

### 7.2 GPU ID-buffer picking, with edge picking and lasso

- **What**: draw node and edge indices into an offscreen target only when something changed; a
  hover reads a small window around the cursor asynchronously, a click reads synchronously.
  Rectangle and lasso selection become GPU passes over the same data.
- **Where**: `graphty-element/src/NodeBehavior.ts` and the element-at-point lookup in
  `graphty-element/src/Graph.ts`.
- **Gain**: hover cost no longer depends on the number of elements; edges become pickable; lasso
  and rectangle selection become possible at any size.
- **Cost**: medium.
- **Conflicts**: XR picks along a controller ray, not at a screen pixel; there, keep a CPU ray test
  against an array of node bounding spheres. Required by 7.1.

### 7.3 Edge trimming and curves in the vertex shader

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

### 7.4 Typed-array columns instead of `Node` and `Edge` objects

- **What**: element state lives in typed-array columns, with `Node` and `Edge` as lazy facades
  created on demand. This matches the column layout of `@graphty/graph-format` snapshots.
- **Where**: `graphty-element/src/Graph.ts`, the data manager, `Node.ts`, `Edge.ts`.
- **Gain**: load time (27.5 s at 100k nodes against cosmos.gl's 0.5 s at ten times the size) and
  memory (2.0 GB of heap at 100k nodes and 1M edges).
- **Cost**: large, and it may touch public API that hands out `Node` and `Edge` objects.
- **Conflicts**: style selectors are evaluated per element today; they need an evaluator that runs
  over columns.

### 7.5 GPU screen-grid label sampling, with an instanced glyph-atlas text batch

- **What**: choose one node per screen cell on the GPU and label only those, drawing the text from
  one instanced batch over a glyph atlas instead of a texture per label.
- **Where**: `graphty-element/src/meshes/LabelBatch.ts` and
  `graphty-element/src/meshes/RichTextLabel.ts`.
- **Gain**: label cost is bounded by the screen area, not by the node count.
- **Cost**: medium for the sampling; large for the atlas text renderer.
- **Conflicts**: rich-text styling is harder in an atlas renderer. Which labels a reader sees is a
  presentation choice, so the sampling must be an option with its distance as a setting, off by
  default.

### 7.6 Hand layout positions to the renderer without a CPU loop

- **What**: on WebGL, upload each batch's readback as one texture instead of looping over nodes;
  this needs only 7.1. On WebGPU, share one GPU device between Babylon.js and
  webgpu-graph-algorithms so the renderer reads the layout's buffer directly -- a risk the WebGPU
  plan deferred.
- **Where**: `graphty-element/src/layout/SimulationLayoutEngine.ts` and the WebGPU entry.
- **Gain**: removes the per-node publish loop; the shared device also removes up to 3.7 ms of
  readback per iteration at 100k nodes and 1M edges.
- **Conflicts**: code that reads node positions on the CPU needs cosmos.gl's pattern of
  non-blocking reads that are one frame behind.

### 7.7 Smaller items

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

## 8. Side-by-side measurement

Every comparison above sets numbers from two different machines side by side. A measurement of
cosmos.gl and graphty on the same machine (the RTX 4070 SUPER) is in progress: cosmos.gl's own
repulsion benchmark story (`src/stories/performance/repulsion-benchmark.ts`, 2k to 200k points), a
1M-point render, and graphty-element and webgpu-graph-algorithms at the same sizes. Its results
will be added here when it finishes.

---

## 9. Open questions and stale statements in graphty

Facts:

- graphty has no measured moving-frame number at 100k nodes and 1M edges with the GPU layout
  attached; the share of time spent on readback is recorded as not measured
  (`graphty-element/docs/decisions/G6.md`, lines 134-140).
- `graphty-element/src/acceleration/types.ts`, lines 442-444, still cites a 50k / 100k ceiling.
- The documentation of `largeGraphThreshold` (`graphty-element/src/session/limits.ts`, line 98)
  promises "less visual detail" above 10k nodes, but no code does that.
