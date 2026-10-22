# Edge bundling in graphty-element

Status: research complete, not implemented, decisions open (section 11). The research covered the
literature, existing implementations, graphty-element's edge renderer and the cost of running
bundling on the GPU, and was then revised after performance, architecture, reader and
implementability reviews; this document records the result. No code exists yet.
Packages: graphty-element (the option, scheduling, caching, drawing), layout (the CPU
computation), webgpu-graph-algorithms (an optional GPU computation, later).

A dense graph drawn with straight edges becomes a hairball. Edge bundling bends edges that run
roughly the same way so they share a path, like wires gathered into a cable, and the reader sees
the main flows between regions instead of thousands of separate lines. The price is that one edge
can no longer be followed exactly: two edges that share a trunk look connected even when they are
not. This design says which bundling methods graphty-element should offer, in what order, what it
costs, what the renderer must change, and what the public API looks like.

The long tables (every timing, every paper, every implementation, every platform limit) and the
list of repository code this design cites are in [edge-bundling-sources.md](edge-bundling-sources.md).

How claims are marked:

- **Measured**: stated in a cited paper, or measured or read in this repository at origin/golden
  `d00cdb54c7` (2026-10-20).
- **Estimate**: arithmetic from measured figures, not a measurement. Every estimate here is
  unverified until someone runs it.
- Everything else is a judgment, and reads as one.

Contents:

1. What edge bundling is
2. When it helps readers and when it misleads them
3. The algorithm families
4. Papers and implementations to learn from
5. Cost, and whether to use WebGPU
6. How graphty-element draws edges today, and what bundling must change
7. The options
8. Recommendation
9. The proposed API
10. Work the estimates do not count
11. Open questions for the owner
12. How to resume

---

## 1. What edge bundling is

Every bundling method does two things:

1. Choose a route for each edge, as a list of control points.
2. Draw a smooth curve through those points.

The methods differ only in how they choose the route. The output of every one of them is the same
shape: a polyline (or spline control polygon) per edge. That is why the renderer work in section 6
is shared by every method, and why it comes first.

Two properties of the output matter for graphty-element:

- **It is computed once per stable picture**, not per frame. Every method in this design runs after
  the layout settles, after the edge set changes, or after a node drag ends (debounced). Never on a
  camera move: graphty-element bundles in world space, so orbiting, panning or an XR head move
  never changes the bundles.
- **Strength is a blend.** Every method can be relaxed after the fact by interpolating each point
  between its bundled position and the straight line (Holten's beta, d3's `curveBundle.beta`). A
  strength of 0 is straight, 1 is fully bundled. The blend is cheap, but it is not free in this
  renderer (section 6.4).

## 2. When it helps readers and when it misleads them

### 2.1 What the studies say

- **Task fit (Wallinger and Kobourov, "A Task Taxonomy for Edge and Trail Bundling", 2026, from
  102 papers).** Bundling helps overview tasks at the bundle and whole-graph scale -- which regions
  talk to which, the main flows -- and hurts element-level tasks that need precision about one edge:
  following it, comparing two edges.
- **Preference against accuracy (Wallinger et al., "How Do People Perceive Bundling? An
  Experiment", CHI 2025).** Participants preferred bundled views, and still followed false
  connections inside tight bundles while calling those drawings more ambiguous. The bundle routing
  changed which nodes they saw as clusters, and on unfamiliar data they invented meanings. (Sample
  size not verified; abstract only.)
- **Path tracing (McGee and Dingliana, AVI 2012, read second-hand through a 2018 poster).**
  Bundling lowered path-tracing performance in the earliest controlled study.
- **Connectivity-based beats proximity-based (Bach et al., TVCG 2017).** People read connectivity
  correctly more often in confluent drawings (merges that follow the graph's structure) than in
  power graphs, metro-style bundles or common geometric bundling.
- **Density methods invent structure (Lhuillier, Hurter and Telea survey, CGF 2017, Fig. 19).**
  Kernel density bundling on a uniformly random graph draws bundles that are not in the data.
- **No accepted quality measure (same survey, 7.2.1).** The proxies in use are ink ratio against
  distortion, ambiguity and faithfulness (Nguyen, Eades and Hong, 2013).
- **Direction (Holten and van Wijk, CHI 2009; Holten et al., PacificVis 2011).** A tapered edge
  reads direction better than an arrowhead. These studies were on unbundled drawings. When opposite
  directions share a bundle, color mixes and direction is lost unless the method separates the
  directions into lanes.
- **Remedies with support.** Relaxation (a strength control back toward straight); animating from
  straight to bundled (helps readers match the two); direction lanes; and above all unbundling on
  demand -- drawing the true edge on hover or selection (Luo et al., TVCG 2011).

The conclusion that drives this design: bundling is an overview tool that readers like and misread.
Every method is only as good as its way back to the true edge, so the way back (focus unbundling,
section 7.2) ships with the first method, not later.

### 2.2 Who gains, who loses

Using the personas in `design/designloom/personas/`:

| Persona                                            | Typical task                           | Effect of bundling                                   | Best fit                                                     |
| -------------------------------------------------- | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| fraud-analyst, cybersecurity-analyst               | trace multi-hop directed paths         | hurts the core task                                  | off by default; overview only, then unbundle on focus        |
| intelligence-analyst                               | trace flows, plus overview             | mixed                                                | edge-path for overview, focus unbundling for tracing         |
| supply-chain-analyst                               | flow overview on geographic positions  | helps                                                | density bundling with direction lanes                        |
| bioinformatics-researcher, genomics-cytoscape-user | module-to-module views                 | helps when bundles follow the modules                | hierarchical over the cluster tree                           |
| knowledge-engineer                                 | ontologies: the hierarchy is the data  | helps                                                | hierarchical over the class hierarchy                        |
| marketing-analyst                                  | presentation slides                    | liked, but a slide may show a flow that is not there | any                                                          |
| ml-engineer-recsys                                 | millions of edges, then explain a path | mixed                                                | density overview, then straight edges for the explained path |
| explorer-elena                                     | new user, everything                   | most exposed to false connections                    | off by default; never switched on automatically              |
| analyst-alex, expert-emma                          | choose methods                         | need a way to judge a bundling                       | result facts: distortion, ink ratio, what ran                |
| plugin-author-\*                                   | register or call a bundler             | API size                                             | a registration point (section 9.5)                           |

Three of the most domain-specific personas (fraud, cybersecurity, intelligence) work at the element
level on directed data, the exact case the studies say bundling hurts. Bundling is not a general win
for graphty's readers; it is a win for module-level biology views, ontologies and geographic flow
overviews.

## 3. The algorithm families

| Family                                                         | How it chooses routes                                                                                                     | Cost                                                                   | 3D                                                               | Main weakness                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Hierarchical (Holten 2006)                                     | A spline along the tree path: source, its ancestors, the common ancestor, the target's ancestors, target                  | One pass, O(edges x tree depth); effectively free                      | Yes                                                              | Needs a hierarchy; 3 edges between two clusters look like 300       |
| Edge-path (Wallinger et al. 2022; spanner speedup 2023)        | Longest edges first; an edge follows an existing path between its ends if that path is at most k times its length (k = 2) | One shortest-path search per edge; fine on a CPU with a greedy spanner | Yes, unchanged                                                   | No bundling on trees or sparse graphs; routes pass over other nodes |
| Force-directed (Holten and van Wijk 2009)                      | Edges are chains of springs; points of similar edges attract                                                              | Compares every pair of edges; the slowest family                       | Yes, by adding z                                                 | Slow; ignores direction; many false connections                     |
| Density, image-based (KDEEB 2012, CUBu 2016, FFTEB 2017)       | Sample edges into a density grid, blur it, move points toward denser cells, repeat                                        | Linear in sample points plus a grid term; suits the GPU                | Yes, on a coarse voxel grid (Zielasko 2019), a different variant | Most false connections; invents bundles on random graphs            |
| Ordered bundles, metro style (Bereg et al. 2011)               | Shared routes that avoid nodes, each edge in its own lane                                                                 | Seconds at 1k edges                                                    | No                                                               | 2D only, slow, a large dependency                                   |
| Others (MINGLE, GBEB, SBEB, Winding Roads, divided, confluent) | Ink-saving merges, control meshes, skeletons, grid routing, direction lanes, biclique merges                              | Mixed                                                                  | Mostly no                                                        | 2D only, fiddly to tune, or they need to own the layout             |

More detail per method, with every timing, is in the sources file. Three points are easy to get
wrong:

- **Edge-path bundling's guarantee is narrower than "no false connections".** It never bundles
  edges from different connected components together, and in the directed case it bundles along a
  directed path. But bundles that cross at flat angles stay ambiguous, an edge routed along u-a-b-v
  passes over a and b (a reader can see it as ending there), and no user study shows it fixes what
  the CHI 2025 study found.
- **The edge-path speedup comes from a greedy spanner built from the graph's own edges** (CGF 2023,
  Algorithm 1), which works in any dimension and on directed input. The theta-graph spanner of the
  2025 WebGPU thesis is a different thing: it adds edges that are not in the data, giving up the
  guarantee, and its cones are defined in the plane.
- **3D density bundling is a published, separate method.** Zielasko et al. 2019 size a voxel grid
  from the average edge length (8K to 72K voxels, not 64^3 to 128^3), run on the CPU, and use under
  200 MB. It is not the 2D method with a z axis, so it must be reported as its own variant.

## 4. Papers and implementations to learn from

### 4.1 Papers

- Holten, "Hierarchical Edge Bundles", IEEE TVCG 12(5), 2006.
- Holten and van Wijk, "Force-Directed Edge Bundling for Graph Visualization", CGF 28(3), 2009:
  https://diglib.eg.org/handle/10.1111/v28i3pp0983-0990
- Hurter, Ersoy and Telea, "Graph Bundling by Kernel Density Estimation" (KDEEB), CGF 31(3), 2012:
  https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf
- van der Zwan, Codreanu and Telea, "CUBu: Universal Real-Time Bundling for Large Graphs", IEEE TVCG
  22(12), 2016 -- the GPU design to copy:
  https://webspace.science.uu.nl/~telea001/uploads/PAPERS/TVCG15/paper.pdf
- Wallinger et al., "Edge-Path Bundling: A Less Ambiguous Edge Bundling Approach", IEEE TVCG 28(1),
  2022: https://arxiv.org/abs/2108.05467
- Wallinger et al., "Faster Edge-Path Bundling Through Graph Spanners", CGF 42(6), 2023:
  https://diglib.eg.org/handle/10.1111/cgf14789
- Zielasko et al., "Voxel-based edge bundling through direction-aware kernel smoothing", Computers
  and Graphics 2019 -- the published 3D density method:
  https://vr.rwth-aachen.de/media/papers/181/Zielasko2019_redSize.pdf
- Lhuillier, Hurter and Telea, "State of the Art in Edge and Trail Bundling Techniques", CGF 36(3),
  2017 -- the survey: https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis17/star.pdf
- Wallinger et al., "How Do People Perceive Bundling? An Experiment", CHI 2025, doi
  10.1145/3706598.3713444.
- Wallinger and Kobourov, "A Task Taxonomy for Edge and Trail Bundling", 2026:
  https://arxiv.org/abs/2607.20089

### 4.2 Implementations

GPL code, and code with no stated license, is for reading only; nothing from it may be copied into
this repository.

| Implementation                   | License      | What to take from it                                                                         |
| -------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| d3-shape `curveBundle`           | ISC          | Hierarchical bundling in about 60 lines; the beta straightening formula                      |
| mwallinger-tu/edge-path-bundling | MIT          | The reference edge-path code (it allocates two n x n matrices: do not copy that part)        |
| datashader `hammer_bundle`       | BSD-3-Clause | A readable density bundler; every distance a fraction of the extent; decaying bandwidth      |
| schochastics/edgebundle          | MIT          | Five methods side by side in compact C++ (force, KDEEB, MINGLE, edge-path, divided)          |
| CUBu (authors' download)         | none stated  | Read only: count-then-gather density, separable blur, normal-only advection, lazy resampling |
| microsoft/msagljs                | MIT          | Ordered bundles, in TypeScript                                                               |
| antvis/G6 edge-bundling plugin   | MIT          | Clear force-directed formulas; it re-bundles on every render, which is the design to avoid   |
| d3.ForceBundle, GPUEdgeBundling  | GPL-2.0      | Read only                                                                                    |

Links are in the sources file. As far as the research found, none of sigma.js, cosmos.gl, deck.gl,
Graphistry, KeyLines/ReGraph, Gephi or Cytoscape.js ships geometric bundling; Cytoscape desktop and
yFiles do. Cytoscape desktop's bundler is force-directed with 3 handles per edge, written as edge
bends -- the genomics-cytoscape-user persona will expect something like it.

## 5. Cost, and whether to use WebGPU

### 5.1 Published timings (measured)

On one machine (Ryzen 5 5600X with an RTX 3070), from the spanner paper's Table 3:

| Method                                 | 2.1K edges | 9.7K edges | 16.5K edges |
| -------------------------------------- | ---------: | ---------: | ----------: |
| Density, CUBu (GPU)                    |     0.01 s |     0.01 s |      0.01 s |
| Density, KDEEB                         |     0.01 s |     0.03 s |      0.05 s |
| Edge-path with spanner (C++, one core) |     0.01 s |     0.11 s |      0.19 s |
| Plain edge-path (C++)                  |     0.03 s |     0.60 s |      2.67 s |
| Force-directed (JavaScript)            |     2.34 s |    17.97 s |      32.5 s |

Larger graphs: edge-path with spanner, 11 s at 270K edges on one core; CUBu, 152 ms at 900K edges on
a 2012 GTX 690. 3D density (Zielasko 2019, CPU): 674 ms at 8K edges, 10 s at 95K. Hierarchical
bundling has no published timing because it is a single pass.

### 5.2 The answer: not for the first step

- **Hierarchical bundling** is effectively free on the CPU (estimate: under 1 ms at 1k edges, about
  50 ms at 100k in JavaScript, once the hierarchy exists).
- **Edge-path bundling** runs well on the CPU and does not parallelize: each edge's search depends
  on the paths locked before it. The only WebGPU port (Ellhotka, TU Wien thesis 2025) took 287 ms on
  a graph where one C++ core took 190 ms. Estimate for JavaScript, assuming 2-4x slower than C++
  (plan on 3-5x on an iPad): about 10-40 ms at 1k edges, 0.2-0.5 s at 10k, a few seconds at 100k.
  Those come from airline graphs, which are dense and spatially coherent. On a scale-free graph from
  a force layout nobody has measured it, and a cutoff search from a hub may explore much of the
  graph; measure it first (section 12).
- **Density bundling** is the only family proven at 100K to 1M edges at interactive rates, and the
  only one where WebGPU pays. Its steps map onto WebGPU and onto primitives webgpu-graph-algorithms
  already has (`src/primitives/grid.ts`, `src/primitives/histogram.ts`, `scan.ts`,
  `radix-sort.ts`): count samples into a grid with u32 atomics, blur the grid, move points toward
  denser cells, smooth the edges. Use WebGPU for it above roughly 10-20k edges on a desktop and 5-10k
  on an iPad.

Estimated time for a full density bundle, 15 iterations on a 512 x 512 grid (estimate):

| Edges | WebGPU, desktop | WebGPU, iPad (M1 or newer) | CPU (JavaScript) |
| ----: | --------------: | -------------------------: | ---------------: |
|    1k |         2-10 ms |                   15-40 ms |        30-150 ms |
|   10k |         5-20 ms |                   25-80 ms |          0.2-1 s |
|  100k |        20-80 ms |                  80-300 ms |          1.5-5 s |

An older A12-A14 iPad is slower, about 150-600 ms at 100k. Below 10k edges the blur sets the time,
not the edge count: about 400M kernel taps per bundle at 512 x 512, so the GPU's advantage there is
smaller than the table suggests. A cascade of box filters (cost independent of the radius) is the
largest CPU lever; an FFT is not worth building (FFTEB was only 1.5-2x faster than CUBu, even on
cuFFT).

### 5.3 A CPU version is required in any case

- Visual review removes `navigator.gpu` from the capture browser, so every screenshot exercises the
  CPU path. A GPU-only method would have no screenshot coverage at all.
- The project rule forbids finishing a failed GPU run quietly on the CPU. Detecting that WebGPU is
  absent and running the CPU path is correct; switching after a GPU error is not.

## 6. How graphty-element draws edges today, and what bundling must change

graphty-element already draws bent edges, so what bundling needs is a place to keep a route, not a
new renderer. File and line references are at origin/golden `d00cdb54c7`; the full list is in the
sources file.

### 6.1 What exists (measured, read in the code)

- `Edge.placeBent` and `Edge.placeRun` (`graphty-element/src/Edge.ts:1356-1418`) take interior
  points and already: clip both ends at the node surface (`leaveNode`, `surfaceReach`, round or box
  nodes); place the arrowhead along the last segment and the tail along the first; round the corners
  when `line.bezier` is also set (`roundCorners`); carry dash and dot patterns along the run; and put
  the label at the middle of the curve (`curveMiddle`, Edge.ts:444, used at :717).
- Each straight piece is one slot of an `EdgeLineBatch`: 14 floats, 56 bytes
  (`JOIN_FLOATS_PER_PIECE`, `graphty-element/src/meshes/edgeJoinShader.ts:34`). Pieces are joined in
  the vertex shader (miter-clip, no pixel drawn twice at a corner, dashes measured along the whole
  edge). One batch is one mesh and one draw call. Slots start at 32 and double; free slots are
  never compacted.
- Measured cost (`design/edges/sharp-corners.md`, RTX 4070 SUPER): 50k edges, about 150K pieces,
  cost 4.8-4.9 ms of JavaScript per full update and 0.6-0.9 ms per still frame. On SwiftShader the
  instanced line costs a fixed amount per instance: 47.8 ms a frame at 7,500 pieces, 220.8 ms at
  30,000 (2D); a plain mesh of the same rectangles was 28.6 ms at 30,000.

### 6.2 Route storage: absolute 3D points per edge row

`line.bends` stores along/across pairs relative to the two ends, with `across` in the x-y plane only
(`bendPoints`, `graphty-element/src/meshes/edgeRoute.ts:63`). It cannot describe a 3D route, and a
style string parsed on paint is the wrong carrier for computed data (100k strings of 32 points).
Bundling needs absolute 3D points per edge row, held by an element-side owner keyed by edge row: a
route manager holding offsets (`Uint32Array(edges + 1)`) and points (`Float32Array(3 x total)`), the
same CSR shape graph-format uses. `Edge.update` asks it for a route the way it asks
`layoutEngine.getEdgePosition` for the ends. The points feed the existing `placeBent` path (a new
entry that takes points instead of parsing `bends`), so arrows, clipping, labels, dashes, 2D, 3D and
XR work on day one.

The route store is invalidated by: a layout change, a node move beyond a tolerance, the edge-set
version, the visibility mask (hidden edges do not attract others), the bundling option, the 2D/3D
switch, and the same dataset-boundary events the snapshot uses -- or stale routes survive a dataset
swap.

### 6.3 The route-changed mark

`Edge.update` (Edge.ts:662) returns early unless an endpoint moved more than 0.001 (lines 690-691).
A route that arrives while the graph is still would never be drawn. The route store must mark the
edges whose route changed, and `Edge.update` must honor that mark.

### 6.4 Following a drag

Absolute points do not follow a dragged node; `bends` did, because it is relative. Until the
debounced re-bundle, each route is moved with the similarity transform that maps its old ends to the
new ones (works in 3D). The re-bundle then replaces it.

### 6.5 Strength blending happens on the CPU

A blend between straight and bundled done only in the shader would detach the arrowhead, the
node-surface clip, the label and the along-edge distance (dashes, gradients) from the line, because
those are computed on the CPU from the route. Blending on the CPU costs about 1 ms plus about 10 ms
to re-place the edges at 10k edges (estimate), so a strength slider re-places on release or
throttled, not on every pointer move.

### 6.6 Precedence

| Case                            | Rule                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Edge has its own `line.bends`   | `line.bends` wins over bundling for that edge                                                |
| `line.bezier`                   | Bundling replaces bezier's automatic control points; bezier still rounds the route's corners |
| Self-loop                       | Not bundled; drawn as today                                                                  |
| Parallel edges                  | Bundled together (they are drawn coincident today anyway)                                    |
| Hidden edge                     | Takes no part in the bundling; re-bundle on mask change                                      |
| Straight-only pattern (see 6.8) | Drawn straight, and the result reports a code for it                                         |

### 6.7 Labels and arrowheads on shared trunks

The middle of a bundled route is inside the shared trunk, so every label lands in the same place and
is attributed to the wrong edge. Labels on bundled edges sit near an end (the target), or are hidden
while the edge is bundled. Arrowheads at a target with many incoming bundled edges converge on one
tangent and stack. Direction reads better as a taper or a luminance gradient along the edge's own arc
length than as an arrowhead or a hue change, and a luminance cue survives color-vision deficiency.
The taper needs a per-point width the batch does not have yet.

### 6.8 Patterns

Dash and dot follow a polyline. Star, box, diamond, dash-dot, sinewave and zigzag are
`PatternedLineMesh`, placed along a straight line only (`EdgeMesh.drawsAsPattern`,
`graphty-element/src/meshes/EdgeMesh.ts:275`); the animated line is straight-only too. A bundled edge
with one of those patterns reports a code; it never draws straight without saying so.

### 6.9 Picking

No edge can be picked today, straight or bent: the batch mesh is `isPickable = false`
(`EdgeLineBatch.ts:161`), the comment at Edge.ts:942 explains why, and `events.ts:709` says there is
deliberately no edge-click event. That is a gap separate from bundling. When it is filled, a CPU grid
of segments that returns "the edges near this point" suits bundles, where a single pick is
ambiguous by design; build it lazily on first hover, coarser than the drawn route (8 points an edge
is enough to pick). A GPU ID buffer returns only the top-most edge where there are hundreds.

Focus unbundling (section 7.2) does not need edge picking: nodes are pickable, so selecting a node
and straightening its edges works today.

### 6.10 Reading GPU results back

The WebGPU accelerator holds its own device, and Babylon draws with WebGL by default
(`#rendererRequest = "webgl"`, `graphty-element/src/Graph.ts:548`). A GPU bundle must be read back
(about 10 MB at 100k edges, estimate) and uploaded again. That is fine once per settle and too slow
every frame, so no API may promise per-frame re-bundling or animation by iteration. Zero-copy needs
Babylon's WebGPU engine and the accelerator to share one device; that is a lifecycle redesign,
deferred.

### 6.11 Per-edge color

Color, width and opacity fold into the batch key today, so every distinct color is another batch and
another draw call (`edge.color` is declared role `"instance"` in
`graphty-element/src/session/styles/intern.ts:148`, but no per-instance edge color exists). Most
bundling pictures want per-edge color or a gradient. Making color per edge changes every edge batch
and every screenshot in every Storybook, so it is its own change, for every edge, not part of
bundling.

### 6.12 Blending

Ordinary alpha blending of mixed-color translucent lines depends on draw order, and Babylon sorts
meshes, not instances. An additive density mode commutes, but it saturates (a bundle of 40 and one of
400 both read as white) and sums per-edge colors into meaningless mixes, so it needs a declared
transfer (log or tone-mapped), must report that it is a density view, and is off by default. On iOS
it must use RGBA16F targets: Safari on iOS cannot blend into 32-bit float targets (no
`EXT_float_blend`), and half floats count exactly only to 2048.

### 6.13 Scale ceiling and the two risks nobody has measured

Scaling the measured renderer cost linearly (estimate):

| Bundled edges x 32 points | Pieces | Still frame | Full update (each re-bundle)            |
| ------------------------: | -----: | ----------: | --------------------------------------- |
|                       10k |   310K |  about 2 ms | about 10 ms                             |
|                      100k |   3.1M | about 18 ms | about 95 ms, plus about 170 MB of slots |

So the existing renderer is enough up to about 20-30k bundled edges. A dedicated route mesh only pays
off beyond that: each point stored once at 12-16 bytes, read in the vertex shader from a float
texture (the default renderer is WebGL2, which has no storage buffers; RGBA32F, 2D-wrapped, since
`MAX_TEXTURE_SIZE` is commonly 16384 and 8192 on some devices), as one plain mesh with per-vertex
route indices rather than one instance per piece -- the instance count is what SwiftShader charges
for.

- **SwiftShader, the CI software renderer.** About 7.4 ms per 1,000 instanced pieces. Estimate: 1k
  bundled edges at 32 points is about 230 ms a frame, 10k about 2.3 s. Stories and browser tests use
  a few hundred to a few thousand edges and 8-16 points per edge. Bundled routes are smooth, and 8-16
  well-placed points often look like 32.
- **Overdraw on an iPad.** Bundling's purpose is to stack many translucent lines on the same pixels.
  A tile-based GPU removes only opaque overdraw. A trunk of 500 alpha-blended lines at device pixel
  ratio 2 with 4x MSAA has not been measured. Keep total route memory per graph under about 100 MB
  on an iPad: Safari kills the page under memory pressure with no event the page can catch.

## 7. The options

Effort is in engineer-weeks, an estimate. Every option needs the foundation.

### 7.1 Foundation: route storage on the existing bent-edge path (about 1-2 weeks)

The route store (6.2), the route-changed mark (6.3), drag-following (6.4), CPU strength blending
(6.5), the precedence rules (6.6), the pattern code (6.8). The points feed `placeBent`.

- Strengths: every method needs it; reuses tested code; no new shader; arrows, clipping, labels,
  dashes, 3D and XR work at once.
- Weaknesses: tops out around 20-30k bundled edges; SwiftShader's cost limits story size.
- Deferred until a real case needs each: the dedicated route mesh, per-edge color, the additive
  density mode, a Web Worker, edge picking. None of them is needed by every method; the dedicated
  mesh earns its 2-3 weeks only above 20-30k bundled edges.

### 7.2 Focus unbundling (in the first phase, a few days)

A per-edge, draw-time strength value (0..1) that a style layer can set, multiplying the graph-wide
strength. "Select a node and its edges go straight" is then one style layer, driven by node
selection. It changes only that edge's drawing and never re-bundles, so selection does not move
other edges under the reader's cursor, and it needs no edge picking.

- Strengths: the best-supported remedy in the literature; works with every method; cheap.
- Weaknesses: straight-on-hover of one edge waits for edge picking.

### 7.3 Edge-path bundling with a greedy spanner, on the CPU (1-2 weeks after the foundation)

- Strengths: an edge only bundles along a real path in the graph, the strongest answer to false
  connections of any general method; works unchanged in 3D and XR, with no grid; deterministic with a
  stable tie-break (in Dijkstra and in the longest-first sort; equal lengths are common on generated
  graphs); works on directed graphs as is; reuses `algorithms/src/indexed/dijkstra.ts`, which already
  takes a distance cutoff and per-edge weights (`SsspOptions`, lines 42-44, 136-151) over an
  `AdjacencyView` with O(n) scratch.
- Weaknesses: the speedup must come from the greedy spanner, not a theta-graph (section 3); no
  bundling on trees or very sparse graphs (a feature -- no structure, no bundle -- but the result must
  report the fraction bundled so it does not look like a failure); can produce loops; routes pass over
  intermediate nodes (keep the curve off the node discs: use node positions as control points of a
  smooth curve, not as points on it); an edge may be drawn up to k = 2 times its true length (report
  mean and max distortion); bundles depend on positions, so the unseeded default layout gives
  different bundles on each load and stories must pass a seed; seconds above about 100k edges.
- It is a CPU algorithm. Do not promise a GPU variant: it is sequential by design, and per-query
  dispatch overhead times thousands of queries is seconds.
- "Keep the chosen paths across a drag" is a cache: it must give the same output as a fresh run on
  the final positions, or be an explicit option that is off by default.

### 7.4 Hierarchical bundling, d3 style (3-5 days for the attribute path; plus 3-5 days for a tree from an algorithm)

- Strengths: effectively free at any size; deterministic routing; 2D, 3D and XR; when the hierarchy
  is real data (an ontology, an org chart, software modules) the bundles mean something.
- Weaknesses:
    - It needs a hierarchy, and the element has none to give. `HierarchicalClusteringAlgorithm` builds
      the whole merge tree, keeps only the flat cut (`tree.cutAt`,
      `graphty-element/src/algorithms/HierarchicalClusteringAlgorithm.ts:102`) and throws the tree
      away; Louvain and Leiden publish flat labels. Keeping the tree is a new, additive result shape.
    - The dendrogram is too costly above about 2k nodes: O(n^3) time and 28 x n^2 bytes
      (`algorithms/src/indexed/hierarchical.ts:152-156`), 700 MB at 5k nodes. Realistic hierarchies are
      a consumer attribute, or community labels as a two-level tree.
    - Inner tree nodes need positions. A force layout gives them none, so each is the centroid of its
      leaves, and a centroid can sit on top of unrelated nodes. HEB was designed for radial and tree
      layouts, where ancestors sit between their children; graphty's default layouts agree with a
      clustering only roughly.
    - It invents dense links: two communities joined by 3 edges look the same as two joined by 300.
      The result should report how many edges ran through each ancestor, and name the hierarchy source
      (a tree from a seeded algorithm inherits that seed).
    - If the consumer names an algorithm whose result does not exist yet, the element returns a code;
      it never runs the algorithm behind the consumer's back.

### 7.5 Density bundling, CUBu style, CPU first and then WebGPU (8-12 weeks)

- Strengths: the only family proven at 100K-1M edges at interactive rates, with linear cost; fits the
  existing grid and histogram kernels; one engine for 2D (image grid) and 3D (coarse voxel grid of
  8K-72K cells sized from the average edge length); direction lanes are cheap to add (FFTEB's
  directional mode costs the same as undirected).
- Weaknesses:
    - The most false connections. On a force layout, node positions are an artifact, so density
      bundling sharpens wherever the layout happened to put edges into apparent structure; on a random
      graph it invents bundles. Nearly all its evidence is on geographic data, where positions are
      facts. Frame it to consumers as a density overview.
    - Two engines (CPU and GPU) tuned together forever. Output is chaotic in the inputs (a sample on
      either side of a ridge joins a different bundle), so they can only agree on aggregate measures
      (ink ratio, mean and max displacement as a fraction of the extent), never point by point. Define
      that tolerance before writing kernels.
    - Repeatable on one device, not across devices (float gather, gradient and advection differ in the
      low bits); CUBu's jittered sampling needs a seed (unseeded by default, per the owner's seed
      rule).
    - Visual review only ever sees the CPU version; GPU tests assert aggregate facts on the NVIDIA and
      lavapipe lanes.
    - Atomic contention rises as bundles converge: by late iterations thousands of samples hit a few
      hundred cells. Plan per-workgroup counting (or counting by sort; the radix-sort primitive exists)
      and measure it on an iPad.
    - An iPad holding Babylon's WebGL2 context and the accelerator's WebGPU device is the configuration
      most likely to be killed for memory; release the bundling buffers right after readback. Fit each
      kernel into at most 8 storage buffers (the iOS per-stage limit). New kernels must go through
      `composeWgsl` / `PipelineCache`, which works around Safari 26 failing `createComputePipeline` when
      pipeline constants name an override the entry point does not read (webgpu-graph-algorithms
      `CLAUDE.md`).
    - 3D is a different algorithm (Zielasko 2019), CPU-only in its paper, with unknown quality on our
      data: a 40^3 grid on a 3D layout may give very wide bundles. In 3D, rotation and depth already
      separate many crossings, so bundling removes less clutter at the same cost to the reader.
    - Buffers: 100k edges is 8-16 MB of samples, inside the 128 MiB binding default; about 1M edges
      needs chunking.
- Order inside it: the CPU version in 2D first (what screenshots test), WebGPU second, 3D last. The
  whole iteration loop in one submit with one readback, no indirect dispatch (Dawn's indirect
  dispatch costs about 0.4 ms each).

### 7.6 Force-directed bundling (3-5 weeks): not recommended

About three orders of magnitude slower than density bundling; it only scales with a nearest-neighbor
shortcut whose quality is unpublished (research, not engineering), and building that neighbor list
over edges is itself the expensive part; about 250 iterations against density's 10-15; it ignores
direction; step size and edge order change the result, which works against stable screenshots. Its
one advantage, 3D, is shared by edge-path and hierarchical bundling at a fraction of the cost.
Familiarity (Cytoscape desktop's bundler) is the only reader argument for it, and hierarchical
bundling over the reader's clusters serves that persona better.

### 7.7 Ordered bundles through msagljs (1-2 weeks plus a large dependency): not in the core

Every edge keeps its own lane and nothing is drawn through a node, which keeps edges traceable. But
it is 2D only, 3.3 s at 1.3K edges and 26-36 s at 6.5K (measured, desktop quad core), so it is a
compute-on-request feature with its own lifecycle; it couples to node outlines as obstacles; and its
size would land in the self-contained `./bundle` build. At most a third-party extension, which the
registration point (section 9.5) makes possible.

### 7.8 End state

The foundation plus edge-path, hierarchical and density bundling, focus unbundling, and a
registration point so others can add methods: about 12-18 weeks in all, shipped in pieces. The
largest cost is the test matrix: methods x 2D/3D x CPU/GPU x patterns, arrows and labels, plus the
lane matrix for each GPU kernel. The plan says which cells are refused with a code instead of tested
(ordered bundles in 3D, edge-path on a graph with no alternative paths).

## 8. Recommendation

Build bundling, off by default, in this order. Stop after any phase if no use case asks for more.

### 8.1 Measure first (before any design is frozen)

1. Edge-path bundling in JavaScript on graph-samples datasets: openflights (3,214 nodes, 36,906
   edges, geographic, the same family as the papers' air-traffic benchmarks), political-blogs (1,490
   nodes, 19,022 edges) and knuth-miles (128 nodes, 8,128 edges, a complete graph); and on a
   10k-edge scale-free graph from the preferential-attachment generator, desktop and iPad.
2. The existing renderer at 1k, 10k and 30k bundled edges x 32 points: on the RTX, on SwiftShader,
   and on an iPad in Safari 26 at device pixel ratio 2, with and without MSAA, with lines stacked into
   trunks (overdraw, not just vertex count).
3. Before any density kernel: a WebGPU counting-pass microbenchmark with all samples packed into 1%
   of the cells, global atomics against per-workgroup histograms, on an iPad; and the fixed tolerance
   the CPU and GPU versions must agree within.

### 8.2 Phase 1 (about 3-4 weeks): the foundation, focus unbundling and edge-path bundling

- The foundation on the existing `placeBent` path (7.1).
- Edge-path bundling with the greedy spanner on the CPU: a loop on the main thread split into
  chunks, with an abort signal (the pattern the algorithms already use, `forEachChunked`); cancelled
  when the layout restarts; never run while a GPU layout is still stepping.
- Focus unbundling (7.2).
- The result reports neutral facts: the method and variant that ran, how many edges were bundled,
  distortion (mean, max), ink ratio, time, and each edge that could not be bundled as a code.
- Stories with a seeded layout at strength 0, 0.5 and 1, on small graphs; unit tests for routes
  following their ends and for the stable tie-break; a real-input test that changing strength
  re-renders without re-bundling.

Why edge-path first: its bundles follow real paths, so it does the least harm to analysts who trace
single edges; it needs no hierarchy and no GPU; it works in 3D, graphty-element's default, and in
XR, which `design/xr/vr-interaction-option-catalog.md` section 14.22 asks for (a global bundling
render mode with a strength dial, citing Kwon et al., TVCG 2016).

### 8.3 Phase 2 (about 1 week): hierarchical bundling

The tree comes from a node attribute holding a parent id or a path, or from community labels used as
a two-level tree. Each inner tree node is placed at the centroid of its leaves. A named algorithm
whose result does not exist gives a code.

### 8.4 Phase 3 (when a real graph above about 20-30k bundled edges needs it): rendering at scale

A dedicated route mesh that reads points from a float texture (6.13); then an optional additive
density mode on RGBA16F (6.12). Edge picking and per-edge color land as their own changes, for every
edge, not as part of bundling.

### 8.5 Phase 4 (only for a named large or geographic use case): density bundling

The CPU version in 2D; WebGPU kernels in webgpu-graph-algorithms; then the 3D voxel variant,
reported as its own variant (7.5).

## 9. The proposed API

Every part of it is additive: a new option whose default (`"none"`) keeps today's behavior, new
result types, a new registration function. Under the repository's rule that non-breaking API changes
need no owner approval, the shape is the implementing session's call; this is the recommended shape.

### 9.1 One option, one shape per method

```ts
edgeBundling:
    | { method: "none" }                                       // the default
    | { method: "edge-path"; strength?: number;                // 0..1, default 1
        maxDistortion?: number; weightExponent?: number;       // defaults 2 and 2, as in the paper
        include?: string }                                     // a selector; see 9.3
    | { method: "hierarchical"; strength?: number; include?: string;
        hierarchy: { attribute: string } | { algorithm: string };
        beta?: number }                                        // default 0.85, as in d3
    | { method: "density"; strength?: number; include?: string;
        radius?: number; iterations?: number;                  // radius a fraction of the extent
        gridSize?: number; directional?: boolean; seed?: number };
```

A discriminated union, because the methods take different inputs: invalid combinations do not
type-check, and the simple case stays `edgeBundling: { method: "edge-path" }`. Every distance is a
fraction of the layout's extent (as datashader and CUBu do), so the defaults work at any scale with
no tuning. The density method's `directional` stays a choice with a neutral default; its docs say
that undirected density bundling on directed flows mixes the flows. The exact home of the option
(`behavior.edges`, or beside `rendering` and `layout` in `graphty-element/src/config/GraphBehavior.ts`)
is decided when it is built.

### 9.2 Where it runs: reuse the acceleration policy

Bundling obeys the existing `acceleration.policy` (`"auto" | "off" | "required"`,
`graphty-element/src/acceleration/types.ts:57`), with an edge-count (or sample-count) floor added to
the existing per-capability floor table in the same file, instead of a second `backend` setting. A
second spelling ("gpu" against "required", "cpu" against "off") is the unsettled-spellings problem
the project rules forbid. The threshold today is `acceleration.minNodes`, a node count, while
bundling cost scales with edges times sample points, so the floor must be in edges.

This needs `AccelerationController` to report its reason as a code. Today it is an English string
(`reason: "acceleration is switched off"`, `AccelerationController.ts:555`; the comment at line 202
says some failures have "a sentence but no code"), and the public API check rejects a plain `string`
on a `...Result` type. The bundling result carries a code union with parameters.

### 9.3 Which edges take part: a selector on the option, not a style channel

Leaving one edge out re-routes others, while every style channel today affects only the element it
is written to, and a style change (selection highlights happen constantly) must never trigger a
re-bundle. So participation is `include`, a selector the element evaluates when it bundles. The
draw-time per-edge strength of focus unbundling (7.2) is a style channel, because it changes only
that edge's drawing. An algorithm's suggested styles never touch bundling. This also matches
`design/ui/object-first-ux/feature-fit/5-styling.md` A13 (bundling is an arrangement, not a style
channel).

### 9.4 Precedence

A per-edge `line.bends` value wins over bundling for that edge (6.6).

### 9.5 A registration point in `@graphty/graphty-element/extend`

As layouts have: a simple path, a function from the snapshot and positions to points per edge
(offsets plus points), whose first example fits in about 15 lines; and an advanced path, steppable,
with an accelerator. The built-in methods register through it, so parity holds and ordered bundles or
force-directed bundling can live outside the core.

### 9.6 Where the code lives

- The CPU computation goes in `@graphty/layout`: pure kernels over `(snapshot, positions) ->
{ offsets, points }`. A bundler takes topology plus positions and returns geometry, which is a
  layout-family post-process -- not an Algorithm (those return per-node or per-edge values) and not
  drawing. cytoscape-extensions and third parties then get the same bundler.
- The GPU computation goes in webgpu-graph-algorithms, as a new optional member of
  `LayoutAccelerator` (`layout/src/simulation/types.ts:102`), like `forceAtlas2`.
- graphty-element owns the option, scheduling, caching, detection and drawing.
- Edge-path's Dijkstra makes layout take a new dependency on algorithms (layout depends only on
  graph-format today, `layout/package.json`), or layout carries its own copy. Decide which.

The existing design records disagree on who owns bundling: `design/ui/unified-style-layers.md` (row
near line 427) says layout; `design/extensions/candidates.md` section 20 leaves edge geometry
undecided and recommends the element; `5-styling.md` A13 says it is an arrangement, not a style
channel. The split above -- computation in layout, everything else in the element -- fits all
three. `design/extensions/layout.md` section 11 lists that a layout cannot supply edge geometry
(`EdgePosition` holds only `{ src, dst }`, `graphty-element/src/layout/LayoutEngine.ts:48`), which
the element-owned route store answers.

## 10. Work the estimates do not count

- Reason codes in `AccelerationController` (9.2).
- The `/extend` registration point, its docs and the public API report change (9.5).
- The route-changed mark and the drag transform (6.3, 6.4).
- A Web Worker, if the chunked main-thread loop is not enough. The only worker in graphty-element is
  the Graphviz host (`graphty-element/src/layout/graphviz/host.ts:34`); every layout engine runs on
  the main thread. A worker in an ESM-only package with a `./bundle` single-file build needs URL
  resolution that works in every consumer's bundler, a content-security-policy story, transfer of the
  snapshot and positions, cancellation, and a main-thread path for Node. About 1-2 weeks. A consumer
  whose bundler cannot load the worker must still get a working feature, reported as a fact.
- Edge picking (6.9), in Phase 3, for every edge.
- Per-edge color, with screenshot churn across every Storybook (6.11).
- The hierarchy plumbing for hierarchical bundling: a dendrogram result shape, centroid positions
  recomputed on settle, and the lifecycle edge between an algorithm result and bundling (what happens
  when the result is cleared or re-run).
- For density bundling: the CPU/GPU tolerance harness, the contention mitigation, the lane matrix,
  device loss mid-run, and iPad measurement.

## 11. Open questions for the owner

1. **Who is bundling for first?** The studies say it hurts the fraud, cybersecurity and intelligence
   personas, who trace single directed edges, and helps the biology, knowledge-engineering and
   supply-chain personas. The recommendation starts with the method least likely to mislead. If the
   first audience is geographic flows (supply chains, airlines), density bundling should come
   earlier.
2. **Should the graphty app ever switch bundling on by itself?**
   `design/designloom/capabilities/visual-encoding-edges.yaml:23` says to apply it at strength 0.5
   when more than 50 edges cross one region; `large-graph-rendering.yaml:27` says bundling or hiding
   above 100,000 edges. graphty-element's default stays off either way (consumers make choices).
   Counting edges that cross a region is computing over the graph, which the app may not do, so if
   the rule stays, the element exposes the fact (a crossing or density measure) and the app only
   compares it to its own number. No source was found for the 50-edge threshold, and new readers are
   the most misled by false connections. The suggestion is to drop the automatic rule and leave
   bundling as the reader's choice.
3. **How far should this go?** Phases 1-2 take about 4-5 weeks and need no GPU. Phase 4 is another
   8-12 weeks. The recommendation is that Phase 4 wait for a named large-graph use case.
4. **Is there an iPad for measurements?** Phases 1 and 4 both need timings on a real iPad in Safari
   26: overdraw, WebGPU limits and memory.

The implementing session decides, without asking: the option's exact home and names, the result
facts' shape, the edge-path tie-break, whether layout depends on algorithms or copies Dijkstra, and
when to add a worker.

## 12. How to resume

Read first, in this order:

1. This document, then the sources file's timing tables and the code list.
2. `graphty-element/src/Edge.ts` around `update` (line 662), `placeBent` (1356), `leaveNode`
   (1381) and `placeRun` (1399); `graphty-element/src/meshes/edgeRoute.ts`;
   `graphty-element/src/meshes/EdgeLineBatch.ts`.
3. `design/edges/sharp-corners.md`, "Results" and "The SwiftShader finding": the renderer costs
   every estimate here scales from.
4. The spanner paper (Wallinger et al., CGF 2023), Algorithm 1 and Table 3, and the reference
   edge-path code (MIT).
5. `algorithms/src/indexed/dijkstra.ts` (`cutoff`, `weights`) and `layout/src/simulation/types.ts`
   (`LayoutSimulation`, `LayoutAccelerator`).

Measure first: the three items in section 8.1, in that order. The first one decides whether
edge-path bundling is fast enough in JavaScript on the main thread; the second decides story sizes
and when the dedicated route mesh is needed.

Datasets, all in graph-samples: openflights (geographic; it has latitude and longitude, so it can be
drawn on real positions as in the papers), political-blogs, knuth-miles (complete, the worst case for
search), the small classics (karate, les-miserables, dolphins) for stories at SwiftShader-friendly
sizes, and the preferential-attachment generator for a seeded scale-free graph. Every story passes a
layout seed.

Line references in this document are at origin/golden `d00cdb54c7` and will move; search for the
named function instead.
