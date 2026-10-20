# Shader lab

An experimental Storybook of 90 shaders that draw graph nodes, draw edges, and add effects to
nodes, edges and the whole graph. It is a menu for picking directions, not shipped code: nothing
here changes graphty-element. Start at the **Shader Lab / Overview** story, which shows every
shader as a card with a screenshot, filters for practical or aesthetic, wow rating and standouts,
and a link to the live story.

## What a shader is

A shader is a small program that runs on the graphics card for every corner of a shape (a vertex
shader) or every pixel on screen (a fragment shader), in parallel, every frame. Because it runs per
pixel and can read time, the mouse and data about each node, it can draw shapes, materials,
lighting and motion that would be far too slow to compute any other way.

## How the lab is built

Each story gets its own Babylon.js engine and a sample graph (communities, a large graph, a
directed flow graph or a weighted graph). Nodes are one square per node, drawn in a single call
(thin instances), and the fragment shader decides what to draw inside the square. Edges are flat
ribbons drawn the same way. Whole-graph effects are full-screen passes over the finished image.
Hover highlights a node and click selects it in every story; each story has Storybook controls for
its knobs.

Run it with the shader-lab Storybook (config in `graphty-element/.storybook-shader-lab/`; story
files end in `.story.ts`, so the main Storybook and the visual review ignore them).

## Quality, cost and tablets

Every story has a **quality** box in its corner: low, medium or high, or auto (high on a desktop,
medium on an iPad, low on a phone), remembered in the browser. Quality caps the drawing buffer at
0.75x, 1.25x or 1.5x the CSS pixels (an iPad screen is 2x), runs post-processes at half, three
quarters or full size, uses 3, 4 or 5 noise octaves, and cuts edge segments and the loop counts
of the heaviest shaders. A frame guard watches every story: when frames average over 50 ms for a
second it drops a level and says so, and when frames still average over 200 ms at low it pauses
the animation, with a button to resume.

Every manifest entry has a **cost** (light, medium or heavy: the per-frame GPU cost on a weak
tablet GPU), shown and filterable on the Overview. Heavy stories loop many times per pixel,
ray-march, or run several full-screen passes; each one's `costNote` says why.

Switching stories loses the old WebGL context at once (`loseContextOnDispose`), so the lab never
holds more than one, which matters on Safari, which refuses new contexts after a few.

## The categories

Every shader is tagged with one of five categories:

- **node**: draws the node itself (its shape, surface or material).
- **node-effect**: adds something to a node: a glow, a state, motion or an aura.
- **edge**: draws the edge itself (its shape, pattern or material).
- **edge-effect**: adds something along edges: flow, propagation, highlights.
- **whole-graph**: works on the whole picture: density fields, post-processing, backdrops.

The stories are grouped by the technique they share:

| Group                      | Shaders | What they have in common                                                               |
| -------------------------- | ------- | -------------------------------------------------------------------------------------- |
| SDF node glyphs            | 9       | Crisp 2D shapes, charts and icons drawn from distance functions inside the node square |
| Impostor materials         | 9       | Each square ray-casts a perfect lit sphere, then shades it as glass, gem, bubble, eye  |
| Procedural surfaces        | 9       | Animated noise surfaces: planets, stars, lava, cells, liquid                           |
| Node state effects         | 9       | A node's state shown by an effect: hologram, glitch, burn, flash, heartbeat            |
| Node motion and aura       | 9       | Nodes that move or radiate: ripples by hop, wobble, satellites, heat, embers           |
| Edge ribbon patterns       | 8       | Patterns along a flat edge ribbon: taper, fiber optic, rope, DNA, ink brush            |
| Curved and displaced edges | 7       | Edges bent or displaced in the shader: curves, lightning, arcs, vines, aurora          |
| Edge flow and propagation  | 7       | Motion along edges: marching ants, comets, particles, a breadth-first wave             |
| Density fields             | 9       | The graph drawn as a field: heatmaps, metaballs, contours, edge bundling, wind map     |
| Glow and post-processing   | 7       | Full-screen passes: bloom, outlines, stylized looks, lenses, colorblind preview        |
| Scene spectacle            | 7       | Big moments: black hole, shockwave, nebula, god rays, particle morph                   |

Plus one starting point, Flat Nodes And Straight Edges, to copy for a new story.

## Standouts

All 90 shaders draw without errors and clean up when you switch stories. Reviewers marked 55 as
standouts. The ones most worth a look:

**Wow**

- **Gas planet** (procedural surfaces): every node is a banded, swirling planet.
- **Plasma globe** (procedural surfaces): crackling plasma tendrils reach toward the cursor.
- **Soap bubble** (impostor materials): iridescent thin-film shields around each community.
- **Gemstone** (impostor materials): faceted gems with rainbow fire; the top nodes are diamonds.
- **Aurora** (curved edges): edges become glowing aurora curtains over a night sky.
- **Lightning arcs** (curved edges): hovering a node makes its edges strike like lightning.
- **DNA helix** (edge ribbons): twisted two-color strands with rungs between the endpoints.
- **Gommage disintegration** (node state): a removed node breaks into petals that blow away.
- **Black hole hub** (scene spectacle): the biggest hub bends the graph's light around it.
- **Nebula backdrop** (scene spectacle): glowing gas and stars tinted by the nearby communities.
- **Particle morph** (scene spectacle): nodes burst into particles and reform in a new layout.
- **Force wind map** (density fields): the layout's forces drawn as flowing wind-map strokes.

**Practical**

- **BFS wave** (edge flow): click a node and a wave runs outward along edges, hop by hop.
- **Focus by hop** (node motion): the selected neighborhood stays sharp, farther hops blur.
- **Selective bloom** (post-processing): only hubs glow; a click lights the path to the top hub.
- **Liquid fill** (procedural surfaces): each node is a glass filled to its value, easy to compare.
- **Level-of-detail glyph** (SDF glyphs): dots far away gain border, gauge, icon and badge up close.
- **Rope and chain** (edge ribbons): thread, rope or chain shows edge weight with no legend.
- **Kernel-density edge bundling** (density fields): tangled edges pulled into readable bundles.
- **Metaball hulls** (density fields): each community becomes one soft blob around its nodes.
- **Lens** (post-processing): a fisheye or edge lens follows the mouse through a dense graph.
- **Uncertainty sketch** (node motion): uncertain nodes are drawn grainy and hand-sketched.

## What could become a graphty-element feature

graphty-element today draws nodes as Babylon mesh instances with a standard lit material, and
edges with its own GLSL line shader. Styling goes through style layers. To ship any of these
shaders, the work splits by kind:

- **Node looks (SDF glyphs, impostor materials, procedural surfaces)** need a new node renderer:
  one square per node, drawn in one call, with the look chosen by a fragment shader. A style
  channel such as `node.shader: "gas-planet"` (or a material name) would pick the shader, with its
  knobs as more style properties. Everything a shader reads per node (color, size, a 0..1 value,
  a category, a seed, selection and hover) has to arrive as a per-instance attribute, so the style
  layers must compute those values and the renderer must pack them into instance buffers. This is
  the largest piece and it unlocks the most shaders. Sphere impostors are the natural first step:
  they look like today's spheres, scale to 100,000 nodes, and every material builds on them.
- **Edge looks (ribbon patterns, curved edges)** fit the existing edge line shader, which already
  reads per-instance positions and draws dashes in the fragment shader. Adding a pattern or
  material choice to the edge style, plus per-edge attributes (weight, direction, a 0..1 flow
  value), would bring in taper, gradient, rope, fiber optic and DNA with little new machinery.
  Curved and displaced edges need more vertices per edge.
- **Node and edge effects driven by state** (hover, selection, hop distance, change, failure)
  need the element to expose time and state to shaders: a time uniform, hop distance from the
  selection, and continuous rendering while an effect runs. The element draws on demand today,
  which freezes animation, so an animated effect must keep the render loop running while it plays
  and stop when it ends.
- **Whole-graph effects (post-processing, density fields, backdrops)** do not touch node styling,
  so they are the easiest to add: a list of named passes on the element with their settings. Bloom
  and outlines can reuse the glow layer the element already owns. Density fields need an extra
  off-screen pass that draws node positions as soft splats.

**WebGL versus WebGPU.** Every lab shader is GLSL on WebGL2, which is what graphty-element uses by
default. On WebGPU, GLSL works only after the browser downloads Babylon's shader compilers (about
1 MB), which the element already does for its line shader. Shipping shaders as WGSL as well would
avoid that, at the cost of writing each shader twice. Compute-heavy ideas (edge bundling, the wind
map, fluid ink, particle morph) would gain the most from WebGPU compute; the rest gain little.

**Costs to keep in mind.** Ray-marched shaders (gemstone, glass, fractal, black hole) are the
most expensive per pixel and need a quality knob or a level of detail. Effects that fade a frame
into the next (trails, fluid ink, phosphor) need an off-screen buffer kept between frames.

## Deferred ideas

- **Ray-cast cylinder tube edges**: real 3D tubes for edges. Hard, and the sphere impostors already
  show the technique; revisit if 3D edges need true tubes.
- **Ideas after "Change pulse heat"**: the brainstorm list was cut off at that whole-graph idea, so
  anything planned after it was never received. A second brainstorm pass should pick up there.
- **Phosphor trails for the oscilloscope edges**: the CRT look has no fading trail of earlier
  frames; that needs a kept off-screen buffer.
- **Frame-rate checks on every story**: several groups were reviewed in a software renderer, so
  their smoothness on a real GPU is unmeasured. Those reviewed on the RTX 4070 ran at 60 fps.
