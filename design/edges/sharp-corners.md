# Sharp corners on bent edges

How graphty-element draws the corner where two straight pieces of one edge meet: an edge drawn
through bends (`edge.bends`, the routes yEd and Cytoscape files carry), and a curve, which is a run
of short straight pieces. This records the problem, every option measured, the one adopted, and
what is left.

Decision (owner, 2026-10-16): build option D, the miter join computed in the vertex shader, with
its three defects fixed. It ships as `graphty-element/src/meshes/edgeJoinShader.ts`.

## The problem

An edge line is a run of straight pieces. Each piece is one slot in an `EdgeLineBatch`
(`graphty-element/src/meshes/EdgeLineBatch.ts`), a batch of instances that draws every line of
one appearance in one draw call. `Edge.placeBent` and `Edge.placeCurve` turn an edge into points,
and `Edge.placeRun` hands the points to the batch, one piece per slot.

Before this change each slot knew only its own two ends:

- In 3D, `CustomLineRenderer`'s vertex shader widened each piece in screen space from its own two
  ends. In 2D, `Simple2DLineRenderer` drew each piece as a flat rectangle placed by a 4x4 matrix
  (`segmentMatrixToRef`). Nothing joined two pieces.
- Outside a bend the two rectangles leave a wedge-shaped notch. It shows on every bend from 170 to
  45 degrees once the line is 3 px wide.
- Inside a bend the two rectangles overlap. On a translucent line the overlap is drawn twice and
  shows as a darker wedge.
- Dashed lines did not bend at all. `PatternedLineMesh` places pattern elements (each dash a small
  box) along a straight line from the edge's start to its end, so a dashed edge with bends was
  drawn straight, and a dashed curve was drawn as a solid curve.

## How the options were compared

One test scene, drawn by every option with Babylon.js 8.56.2 (the version graphty-element uses):
bends with interior angles of 179, 170, 135, 90, 45, 20 and 5 degrees, an exact U-turn, and a U
whose middle piece is 16 px long. Each bend at widths 1, 3, 8 and 24 px, opaque and 50%
translucent, solid and dashed, in 2D (orthographic, one world unit a pixel) and 3D (perspective,
tilted 50 degrees). Captured headless on an RTX 4070 SUPER (ANGLE over Vulkan, 4x MSAA).

The 2D scene is also drawn by the browser's own 2D canvas with `lineJoin = "miter"`,
`miterLimit = 4` and butt caps, the stroke SVG and Canvas define. Each bend is scored against it:
a **hole** is a pixel the canvas fills and the option leaves empty (a notch is a hole), a
**spill** a pixel the option fills and the canvas does not, and an **overlap** a translucent pixel
darker than the line's own tint, that is, drawn twice.

The stress scene is 10,000 or 50,000 edges of 3 pieces each, 2 px wide, on a 1280 x 900 canvas.
Every moving frame rewrites every point (a settling layout) and renders. "Update" is the
JavaScript that rewrites the instance data, "render" one frame with a GPU sync, "still" a frame
with nothing moving. Medians of three runs.

## The options

### A. Separate rectangles (what shipped before)

Each piece is its own rectangle, as described above. No extra cost, and every defect above:
notches from 170 to 45 degrees, a darker overlap on every translucent bend, dashes that restart
on every piece. 1 instance of 4 vertices per piece, 16 floats per instance (a matrix).

### B. Join triangles

A, plus a second thin-instance batch of triangles: two per bend for a miter, one for a bevel past
miter limit 4, each placed by an ordinary matrix, so no shader change. It fills the notch with the
correct miter or bevel shape, but keeps A's overlap and adds its own: a translucent 135 degree bend
shows a dark triangle at the corner. A dashed corner is all dash or all gap. One more draw call
per batch, and 2 triangle instances per bend: the 50,000-edge update took 13.3 ms against A's 7.8.

### C. Round discs

A, plus a 16-segment disc of the line's diameter at every bend. It fills the notch, but the
corner is round rather than sharp, the disc sticks out past sharp corners, and on a translucent
line the whole disc is darker -- the worst blending of any option. 17 more vertices and 48 more
indices per bend, 11.4 ms update at 50,000 edges.

### D. Miter joins in the vertex shader (adopted)

One instance per piece that reads four points: the corner before it, its own start and end, and
the corner after it. The vertex shader moves the piece's end vertices onto the miter points it
shares with its neighbour, and past the miter limit draws its half of a bevel. Neighbours compute
the shared vertices from the same points with the same arithmetic, so they meet exactly. It works
in screen pixels, so one shader serves 2D and 3D. One draw call, no extra instances, 14 floats per
piece instead of a 16-float matrix, and no trigonometry on the CPU: the 50,000-edge update fell
from 7.8 ms to 4.6 ms.

The prototype was clean from 179 to 45 degrees at every width, opaque and translucent, in 2D and
3D. It had three defects, fixed before shipping (below).

### E. Babylon.js GreasedLine

Babylon's own line mesh (`CreateGreasedLine`), with its built-in dashes. No notch, but every bend
sharper than 90 degrees pinches: at 45 and 20 degrees a 3 px line draws one arm about 1 px wide,
at 20 degrees and below the strip twists into crossing triangles, and dashes come out slanted and
broken at the corner. Its points are rebuilt on the CPU on every move: 36 to 38 ms per frame to
move 50,000 edges, which rules it out for a moving layout.

### F. Lengthened rectangles

A, but each piece lengthened past an interior corner by `(w/2) tan(turn/2)` so the two rectangles'
outer edges meet at the miter tip, with a bevel triangle past the limit. No shader change. The
miter shape is right at 135 and 170 degrees, but the overlap is larger than A's, and between 90
and about 29 degrees the lengthened pieces cross and poke out past each other: geometry, not a
bug. 17.3 ms update at 50,000 edges.

### Also considered

- **A stencil or depth trick** to keep the overlap from blending twice. It needs a second pass or
  per-edge depth bookkeeping, and does nothing for the notch or for dashes.
- **Joining on the CPU into one triangle strip per edge** (the classic polyline triangulation).
  It is what E does, and E's update cost is what a per-move CPU rebuild costs.

### Results

| Option                 | Notch outside   | Translucent overlap     | Dashes at a bend            | Draw calls | Update ms, 50k edges (2D / 3D) | Still frame ms, 50k (2D / 3D) |
| ---------------------- | --------------- | ----------------------- | --------------------------- | ---------: | -----------------------------: | ----------------------------: |
| A today                | yes             | yes                     | restart per piece           |          1 |                      7.8 / 7.4 |                   0.88 / 0.35 |
| B join triangles       | filled          | yes, plus the triangles | solid or gap as a block     |          2 |                       13.3 / - |                      1.16 / - |
| C round discs          | filled, round   | the whole disc          | a round blob                |          2 |                    11.4 / 10.9 |                   1.24 / 0.71 |
| D prototype            | filled          | none from 179 to 45 deg | a sliver inside sharp bends |          1 |                      4.6 / 4.6 |                   0.87 / 0.38 |
| E GreasedLine          | filled, pinched | mostly none             | slanted, broken             |          1 |                    37.7 / 36.2 |                   0.89 / 0.38 |
| F lengthened           | filled          | larger than A           | like B                      |          2 |                       17.3 / - |                      0.99 / - |
| **Shipped (D, fixed)** | filled          | none (see limits)       | continuous                  |          1 |                  **4.6 / 4.4** |               **0.87 / 0.52** |

Render times under about 1 ms move by up to 2x between runs; the update column is stable to about
10%. Against the canvas reference, over every bend of the 2D scene: the prototype D had 5,189
overlap pixels and 242 hole pixels solid, and 720 hole pixels dashed (the sliver); the shipped
shader has 407 overlap pixels (all but one in the short-middle U, see limits) and no hole or spill,
solid or dashed, apart from 8 dashed pixels in the short-middle U.

![Translucent 24 px bends: today, the prototype, shipped](images/corners-translucent-24px.png)

![Dashed 8 px bends: today, the prototype, shipped](images/corners-dashed-8px.png)

## Why D

It is the only option that fixes the notch and the translucent overlap together. It keeps one
draw call per appearance, adds no instances, and is cheaper than what it replaces on the CPU,
because a piece is fourteen floats copied rather than a matrix composed with trigonometry. It is
the approach the established GPU line renderers take: deck.gl's path layer, regl-gpu-lines, pygfx
and Mapbox and MapLibre's line layers all give each segment its neighbours and build the join on
the GPU or in the vertex data.

## The three fixes

The prototype D decided per corner whether to miter, and when the inner miter point would reach
further back than half of either piece it fell back to plain square ends. That fallback caused all
three defects.

1. **Bends too sharp to miter (5 degrees, the U-turn, 20 degrees at 24 px).** The square-ended
   fallback overlapped, so translucent lines went dark again. Now every piece always draws its full
   rectangle with square ends, plus the outer half of the join -- the miter up to the limit, the
   bevel past it -- and the overlap on the inside is resolved per fragment. The line through the
   corner along the bisector splits the overlap: each piece keeps the fragments on its own side,
   and gives up a fragment on its neighbour's side only when the neighbour's rectangle covers it.
   Both pieces compute that line from the same three points with the same arithmetic, so the two
   tests are exact complements: every pixel of the union is drawn exactly once, at any angle,
   including a U-turn.
2. **Pieces shorter than the line is wide (the short-middle U drew a five-sided blob).** With no
   inner miter point there is nothing to reach past a short piece, so the U draws its true mitered
   outline. The outer miter is also limited: a corner bevels when its miter tip would reach further
   than the shorter of its two pieces.
3. **Dashes at a bend (a white sliver inside sharp bends).** Each piece measured dash distance
   along itself, so on each side of the corner's bisector the inside of the bend got a different
   distance. Now a fragment in the overlap is drawn when either piece's dash covers it, measured
   along that piece -- the same pixels as dashing the centre line and then stroking every dash,
   which is what SVG and Canvas draw. The outer join takes the distance at the corner.

The browser test `graphty-element/test/browser/edge-corner-joins.test.ts` draws the scene above and
checks every bend against the canvas reference, for all three.

## Widths in 2D and 3D

The shader takes the width two ways (`WORLD_WIDTH`):

- **3D solid lines** keep their screen-space width exactly as before: `width * 0.25 / w` pixels
  either side of the line, which tapers with distance.
- **2D lines take their width in world units**, so a 2D line still zooms with the graph the way
  the nodes do, as the flat rectangles did. The shader converts it to pixels at each vertex from
  the projection.

A constant on-screen width for 2D lines (pixels whatever the zoom) is a consumer's choice, not the
element's. If it is wanted it comes as a new option whose default keeps today's world-space
width; nothing about the default changes.

Both keep the sub-pixel rule the renderers had: a line thinner than one pixel is drawn one pixel
wide with its opacity scaled by its width, as a canvas draws a hairline.

## Dashed and patterned lines

- **Dash and dot, on a bent edge or a curve**, are drawn by the same joined line, the pattern in
  its fragment shader, measured along the whole edge: dash and dot lengths, widths and the
  even spacing (first element at the start, last at the end, `line.patternCount` honoured) are the
  pattern elements' own, so a bent dashed edge matches a straight one beside it. A dot is round.
  A dashed curve used to be drawn solid; it is dashed now.
- **Dash and dot on a straight edge** are still drawn by `PatternedLineMesh`, unchanged. Moving
  them onto the shader would change how every straight dashed edge looks, and the decision was
  that edges without bends do not change. Moving them later is one routing condition in
  `EdgeMesh.drawsAsPattern`.
- **Star, box, diamond, dash-dot, sinewave and zigzag** are pattern elements placed along a
  straight line, so on a bent edge they are still drawn straight from end to end. Placing them by
  distance along the bent path is follow-up work (tracked as an issue).

## The SwiftShader finding

On SwiftShader (Chromium's software renderer, which CI's browser tests use), the instanced
variants ran 5 to 13 times slower per frame than one mesh holding the same triangles. Measured with
an eighth variant, H: A's rectangles expanded on the CPU into one plain, non-instanced mesh.

| 2D, still frame on SwiftShader        | 2,500 edges (7,500 pieces) | 10,000 edges (30,000 pieces) |
| ------------------------------------- | -------------------------: | ---------------------------: |
| A instanced rectangles                |                    46.5 ms |                     173.9 ms |
| Shipped joined line (instanced)       |                    47.8 ms |                     220.8 ms |
| H the same rectangles, one plain mesh |                     8.9 ms |                      28.6 ms |
| E GreasedLine, one plain mesh         |                    11.1 ms |                      35.6 ms |

The cost follows the instance count, not the triangles: about 6 us per instance for A and 7 us for
the joined line, the same at both sizes, while H draws the same triangles six times faster. So
SwiftShader pays a fixed cost per instance of an instanced draw; the vertex shader's length barely
matters. A real GPU shows nothing of the kind (0.87 ms for 150,000 instanced pieces). It matters
only for software rendering -- CI, and a reader with no GPU -- and is the same for the batch before
and after this change. It is left as an issue rather than worked around: the remedy, expanding
pieces into a plain mesh, would move the per-move work back onto the CPU on every machine.

## Known limits

- **Non-adjacent pieces can overlap.** A piece knows only its two neighbours, so when a piece is
  shorter than the line is wide, the pieces either side of it can overlap each other, and a
  translucent line shows that overlap darker (the short-middle U at 24 px). Fixing it means giving
  each piece the corner two pieces away as well.
- **In 3D the overlap test is approximate.** The neighbour's rectangle is tested with the line's
  width at the shared corner; under strong perspective a sliver at the far end of a very sharp bend
  can be drawn twice.

## Prior art

- Matt DesLauriers, "Drawing Lines is Hard": https://mattdesl.svbtle.com/drawing-lines-is-hard
- Rye Terrell, "Instanced Line Rendering", parts 1 and 2:
  https://wwwtyro.net/2019/11/18/instanced-lines.html and
  https://wwwtyro.net/2021/10/01/instanced-lines-part-2.html
- regl-gpu-lines (Ricky Reusser), instanced lines with joins, caps and per-vertex attributes:
  https://github.com/rreusser/regl-gpu-lines
- three.js fat lines (`Line2`, `LineMaterial`), instanced screen-space segments without joins:
  https://threejs.org/examples/#webgl_lines_fat
- Mapbox, "Drawing Antialiased Lines with OpenGL":
  https://blog.mapbox.com/drawing-antialiased-lines-with-opengl-8766f34192dc, and MapLibre's line
  tessellation: https://github.com/maplibre/maplibre-gl-js/blob/main/src/data/bucket/line_bucket.ts
- deck.gl `PathLayer` (miter limit, rounded joints): https://deck.gl/docs/api-reference/layers/path-layer
- Babylon.js GreasedLine: https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/param/greased_line
- pygfx line rendering, including the broken join and dash continuity through a join (Almar
  Klein): https://almarklein.org/line_rendering.html
- Nicolas P. Rougier, "Shader-Based Antialiased, Dashed, Stroked Polylines", Journal of Computer
  Graphics Techniques 2(2), 2013: https://jcgt.org/published/0002/02/08/
- SVG 2, `stroke-linejoin` and `stroke-miterlimit`:
  https://www.w3.org/TR/SVG2/painting.html#LineJoin

## Regenerating the measurements

The prototype and its scripts are in `prototype/`: `proto.js` draws the test or stress scene with
any option (`proto.html?variant=A|B|C|D|E|F|G|H&mode=2d|3d&dash=0|1&stress=0|10000|50000`; G is
the shipped shader, read from graphty-element's source, and `ref=1` adds the canvas reference).
Serve the folder with Vite through servherd (`vite.config.js` reads `PORT` and `HOST`), then:

- `node check.mjs <url> <variant> 2d|3d 0|1` captures one scene into `shots/` with its reference,
  and `python3 metrics.py <variant>-2d-solid` (or `-dash`) scores every bend.
- `node perf.mjs <url> gpu|swiftshader <edges> <variant>-<mode> ...` measures the stress scene.

They need Playwright's Chromium with a GPU it can reach through ANGLE on Vulkan; `EGL_LIB_DIR`
names the driver's libEGL directory when Chromium does not find it.
