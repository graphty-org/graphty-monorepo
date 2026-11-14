# graphty built-ins registry, version 2

This registry names and defines every code-backed built-in a graphty document may name: node
shapes, arrowheads, line patterns, transitions, the fixed sequences an overflow policy steps
through, label looks, and the closed choices of the style channels. A document that names one of
these depends on its definition here; the specification (README.md, "Versions" rule 5) says what
happens when a definition changes.

Rules:

1. A name is never reused for something else. Changing or removing a definition bumps the major
   version of every section that can name it, and that version's migration rewrites older files so
   they keep their meaning.
2. Each list below is checked against graphty-element's source by `test/spec/schemas.test.ts`: the
   names in a list's table equal the names the cited source accepts, in the same order where the
   list is ordered.
3. Every list is an open vocabulary within a major version (README.md, "Open vocabularies"): a
   later release may add a name, and a reader that does not know a name fails that channel entry or
   layer alone.
4. Data built-ins are not here because a document carries them: palettes, color scales as stops,
   shaders (as source text), value labels and assets.

Coordinates: a node shape is centered on the node's position in the scene frame (left-handed, y
up). A flat outline is given in its own plane, x right and y up, counter-clockwise. An arrowhead is
given in its cap frame: the tip at the origin, the line arriving from -x, x along the line in units
of the cap's length, z across it. A line pattern element is given in units of the line's width W.

Each table's first column is the name a document writes; the rest is its definition.

## Node shapes

Source: `src/config/NodeStyle.ts` (`NodeShapes`), drawn by `src/meshes/NodeMesh.ts` (solids) and
`src/meshes/shapeOutlines.ts` (flat outlines). `S` is the node's size under `shape.sizeMode`
"scale"; `phi` is 1.618. Solids named by a Babylon.js mesh builder use that builder's vertex data
(Babylon.js 8, `MeshBuilder`) with the parameters given and its defaults for every other one.

Aliases: graphty-element also accepts the hyphenated spellings `triangular-prism`,
`pentagonal-prism`, `hexagonal-prism`, `square-pyramid`, `pentagonal-pyramid`,
`triangular-dipyramid`, `pentagonal-dipyramid`, `elongated-square-dipyramid`,
`elongated-pentagonal-dipyramid` and `elongated-pentagonal-cupola` as the same solids. A writer
writes the underscore spelling.

<!-- registry: nodeShapes -->

| Name                             | Definition                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `box`                            | A cube of edge `S`.                                                                                                                                  |
| `sphere`                         | A UV sphere of diameter `S`, 32 segments (`shape.detail` "low": an icosphere of radius `S/2`, 1 subdivision).                                        |
| `cylinder`                       | A cylinder of diameter `S` and height `phi * S`, axis along y.                                                                                       |
| `cone`                           | A cone of base diameter `S` and height `phi * S`, apex up (+y).                                                                                      |
| `capsule`                        | A capsule `S` tall, caps included, of radius `0.25 * S`.                                                                                             |
| `torus`                          | A torus whose center line has diameter `S`, tube thickness `0.5 * S`.                                                                                |
| `torus-knot`                     | A (2, 3) torus knot of radius `0.3 * S` and tube radius `0.2 * S`, 128 radial segments.                                                              |
| `tetrahedron`                    | The regular tetrahedron, Babylon.js polyhedron type 0, size `S`.                                                                                     |
| `octahedron`                     | The regular octahedron, polyhedron type 1, size `S`.                                                                                                 |
| `dodecahedron`                   | The regular dodecahedron, polyhedron type 2, size `S`.                                                                                               |
| `icosahedron`                    | The regular icosahedron, polyhedron type 3, size `S`.                                                                                                |
| `rhombicuboctahedron`            | The rhombicuboctahedron, polyhedron type 4, size `S`.                                                                                                |
| `triangular_prism`               | The uniform triangular prism (Johnson-style, all edges equal), polyhedron type 5, size `S`.                                                          |
| `pentagonal_prism`               | The uniform pentagonal prism, polyhedron type 6, size `S`.                                                                                           |
| `hexagonal_prism`                | The uniform hexagonal prism, polyhedron type 7, size `S`.                                                                                            |
| `square_pyramid`                 | The equilateral square pyramid (Johnson solid J1), polyhedron type 8, size `S`.                                                                      |
| `pentagonal_pyramid`             | The pentagonal pyramid (J2), polyhedron type 9, size `S`.                                                                                            |
| `triangular_dipyramid`           | The triangular bipyramid (J12), polyhedron type 10, size `S`.                                                                                        |
| `pentagonal_dipyramid`           | The pentagonal bipyramid (J13), polyhedron type 11, size `S`.                                                                                        |
| `elongated_square_dipyramid`     | The elongated square bipyramid (J15), polyhedron type 12, size `S`.                                                                                  |
| `elongated_pentagonal_dipyramid` | The elongated pentagonal bipyramid (J16), polyhedron type 13, size `S`.                                                                              |
| `elongated_pentagonal_cupola`    | The elongated pentagonal cupola (J20), polyhedron type 14, size `S`.                                                                                 |
| `goldberg`                       | A Goldberg polyhedron, `MeshBuilder.CreateGoldberg` with size `S` and default m and n.                                                               |
| `icosphere`                      | An icosphere of radius `0.75 * S`, 4 subdivisions (`shape.detail` "low": 1).                                                                         |
| `geodesic`                       | A geodesic polyhedron, `MeshBuilder.CreateGeodesic` with size `S` and default m and n.                                                               |
| `rectangle`                      | Flat. The box `(-1,-1) (1,-1) (1,1) (-1,1)`, stretched to the node's width and height.                                                               |
| `round-rectangle`                | Flat. A rectangle whose four corners are quarter circles of radius `min(r, quarter of the shorter side)`; `r` is `shape.cornerRadius` (unset: none). |
| `top-round-rectangle`            | Flat. As `round-rectangle`, only the top two corners rounded.                                                                                        |
| `bottom-round-rectangle`         | Flat. As `round-rectangle`, only the bottom two corners rounded.                                                                                     |
| `ellipse`                        | Flat. The ellipse filling the box, 32 points.                                                                                                        |
| `diamond`                        | Flat. `(0,-1) (1,0) (0,1) (-1,0)`, stretched to the box.                                                                                             |
| `triangle`                       | Flat. `(-1,-1) (1,-1) (0,1)`, stretched to the box.                                                                                                  |
| `pentagon`                       | Flat. The regular pentagon with a corner straight up, stretched to the box.                                                                          |
| `hexagon`                        | Flat. The regular hexagon with corners at 0 and 180 degrees, stretched to the box.                                                                   |
| `octagon`                        | Flat. The regular octagon with its first corner at 22.5 degrees, stretched to the box.                                                               |
| `parallelogram`                  | Flat. `(-1,-1) (0.5,-1) (1,1) (-0.5,1)`, stretched to the box.                                                                                       |
| `trapezoid`                      | Flat. `(-1,-1) (1,-1) (0.5,1) (-0.5,1)`, stretched to the box.                                                                                       |
| `star`                           | Flat. A five-pointed star, first point straight up, inner radius 0.38 of the outer, stretched to the box.                                            |
| `vee`                            | Flat. `(0,-1) (1,1) (0,0.33) (-1,1)`, stretched to the box.                                                                                          |
| `polygon`                        | Flat. The corners `shape.points` lists, as fractions of the half width and half height; without usable corners, the rectangle.                       |
| `cross`                          | Flat. A plus sign whose arms are a third of the box wide: corners at +-1/3 and +-1.                                                                  |
| `house`                          | Flat. `(-1,-1) (1,-1) (1,0.2) (0,1) (-1,0.2)`, stretched to the box.                                                                                 |
| `man`                            | Flat. Pajek 6.02's man figure (its SVG export path, `PAJEK_MAN` in shapeOutlines.ts), fitted to the box.                                             |
| `woman`                          | Flat. Pajek 6.02's woman figure (`PAJEK_WOMAN`), fitted to the box.                                                                                  |
| `none`                           | No body: the node draws only its label, and its box (the rectangle) still bounds edges and the label.                                                |
| `round-triangle`                 | Flat. `triangle` with each corner rounded by a circular arc of radius `min(tenth of the shorter side, shape.cornerRadius)`.                          |
| `round-diamond`                  | Flat. `diamond`, corners rounded as `round-triangle`.                                                                                                |
| `round-pentagon`                 | Flat. `pentagon`, corners rounded as `round-triangle`.                                                                                               |
| `round-hexagon`                  | Flat. `hexagon`, corners rounded as `round-triangle`.                                                                                                |
| `round-octagon`                  | Flat. `octagon`, corners rounded as `round-triangle`.                                                                                                |
| `round-polygon`                  | Flat. `polygon`, corners rounded as `round-triangle`.                                                                                                |
| `barrel`                         | Flat. A rectangle whose corners are cut by quadratic curves a quarter of the width in and a twentieth of the height down (Cytoscape.js barrel).      |
| `database`                       | Flat. A cylinder seen from the side: straight sides, top and bottom the near halves of ellipses a third of the height tall (vis-network database).   |

Every flat outline is extruded into a thin slab (`shape.depth` sets its thickness) and drawn 1.5
scene units across per unit of size. Rounded arcs use 8 points per quarter turn.

## Arrowheads

Source: `src/config/EdgeStyle.ts` (`EdgeArrowTypes`), drawn by
`src/meshes/FilledArrowRenderer.ts` and placed by `src/meshes/EdgeMesh.ts`. The cap is scaled by
the edge's arrow size; `A` is the arrow aspect, 0.8 (the width across of `normal`, `vee` and
`diamond` as a fraction of their length). "Line stop" is how far back from the tip the edge line
ends, as a fraction of the cap; unless a row says otherwise the line ends at the cap's back.
"Frame" means an outline whose inner edge is each corner moved 22.5% of the way toward the
outline's centroid.

<!-- registry: edgeArrows -->

| Name                | Definition                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `normal`            | Filled triangle `(0,0) (-1,-A/2) (-1,A/2)`.                                                                                       |
| `inverted`          | Filled triangle `(0,0) (1,-A/2) (1,A/2)`, placed so its base (x = 1) is at the node's surface: it points back along the line.     |
| `dot`               | Filled disc of radius 0.5 centered on the cap point, 32 segments.                                                                 |
| `sphere-dot`        | In 3D an unlit sphere of diameter 0.25 of the cap, centered on the cap point; in 2D the `dot` disc.                               |
| `open-dot`          | Ring centered on the cap point, outer radius 0.5, inner radius 0.3875.                                                            |
| `none`              | No cap; the line runs to the node.                                                                                                |
| `tee`               | Filled bar across the line: x from -0.5 to 0, z from -0.75 to 0.75.                                                               |
| `open-normal`       | Frame of the `normal` triangle.                                                                                                   |
| `diamond`           | Filled `(0,0) (-0.5,A/2) (-1,0) (-0.5,-A/2)`.                                                                                     |
| `open-diamond`      | Frame of the `diamond`.                                                                                                           |
| `crow`              | Two filled triangles `(-1,0) (0,-0.4) (-0.6,0)` and `(-1,0) (-0.6,0) (0,0.4)`, and a center prong `(0,0) (-0.6,-0.1) (-0.6,0.1)`. |
| `box`               | Filled square x from -1 to 0, z from -0.5 to 0.5.                                                                                 |
| `half-open`         | Filled triangle `(0,0) (-1,-0.4) (-0.4,0)`. Line stop 0.4.                                                                        |
| `vee`               | Filled concave `(0,0) (-1,-A/2) (-0.5,0) (-1,A/2)`. Line stop at the notch, never less than half the cap, longer for a wide line. |
| `half-circle`       | Filled half disc of radius 1 centered on the tip, from 90 to 270 degrees (flat side at the tip).                                  |
| `open-half-circle`  | The `half-circle` arc as a band from radius 0.75 to 1.                                                                            |
| `curve`             | A band from radius 0.75 to 1 centered at (-1,0), from -90 to 90 degrees (bulging toward the tip).                                 |
| `triangle-tee`      | Filled triangle `(0,0) (-0.6,-0.3) (-0.6,0.3)` and a bar x from -1 to -0.8, z from -0.3 to 0.3.                                   |
| `triangle-cross`    | Filled triangle `(0,0) (-0.75,-0.375) (-0.75,0.375)` and a bar x from -1 to -0.92, z from -0.375 to 0.375.                        |
| `circle-triangle`   | A filled disc of radius 0.25 centered at (-0.25,0) and a triangle `(-0.5,0) (-1,-0.25) (-1,0.25)`.                                |
| `half-open-flipped` | `half-open` reflected across the line: `(0,0) (-0.4,0) (-1,0.4)`. Line stop 0.4.                                                  |
| `open-box`          | The `box` square as a frame 0.1125 thick.                                                                                         |
| `image`             | The arrow's `image` picture on a flat quad standing on the line, tip at the origin. Without a picture, no cap.                    |
| `cross-delta`       | Filled delta `(0,0) (-2/3,-1/6) (-2/3,1/6)` and a bar x from -1 to -11/12, z from -0.25 to 0.25. Line stop 2/3.                   |
| `open-cross-delta`  | The delta as an outline 1/12 thick, and a filled bar x from -1 to -5/6, z from -0.25 to 0.25. Line stop 2/3.                      |
| `open-inverted`     | Triangle `(0,-A/2) (0,A/2) (-1,0)` as an outline 0.1125 thick.                                                                    |
| `half-barb`         | One stroke `(0,0) (-1+B,-0.4) (-1,-0.4) (-B,0)`, B = 0.135/1.135. Line stop 0.2/1.135.                                            |
| `half-barb-flipped` | `half-barb` reflected across the line. Line stop 0.2/1.135.                                                                       |
| `inverted-vee`      | Two filled triangles `(-1,0) (-0.25,0) (0,-A/2)` and `(-1,0) (0,A/2) (-0.25,0)`: point on the line, notch empty.                  |
| `cross`             | Two strokes crossing on the line: `(-1,-0.5) (-0.15,0.5) (0,0.5) (-0.85,-0.5)` and its reflection across the line. Line stop 0.5. |
| `kite`              | Filled `(0,0) (-0.8,-0.3) (-1,0) (-0.8,0.3)`.                                                                                     |
| `deltoid`           | On each side s = +-1: triangles `(0,0) (-0.525,0.244s) (-0.95,0)` and `(-0.525,0.244s) (-1,0.577s) (-0.95,0)`.                    |
| `open-vee`          | `half-barb` and `half-barb-flipped` together. Line stop 0.5.                                                                      |
| `slash`             | One stroke `(-1,-0.5-t) (-1,-0.5+t) (0,0.5+t) (0,0.5-t)`, t = sqrt(2)/16. The line runs on under it to the tip.                   |
| `stem`              | A length of the line itself: x from -1 to 0, as thick as the line.                                                                |

## Line patterns

Source: `src/config/EdgeStyle.ts` (`EdgeLineTypes`), defined in
`src/meshes/PatternedLineRenderer.ts` (`PATTERN_DEFINITIONS`, `GLYPHS`) and laid out by
`src/meshes/PatternedLineMesh.ts`. Discrete elements are spaced by the period `1.5 * e`, where `e`
is one element's length along the line: the first element starts at the line's start, the last
ends at its end, the rest are spread evenly between (`line.patternCount` sets the count instead).
A line too short for two elements with a gap draws one, at its start.

<!-- registry: edgeLines -->

| Name               | Definition                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `solid`            | A continuous line `W` wide.                                                                                                                                                      |
| `dot`              | Discs of diameter `W`, spaced by the period.                                                                                                                                     |
| `star`             | Five-pointed stars `W` across, spaced by the period.                                                                                                                             |
| `box`              | Squares of side `W`, spaced by the period.                                                                                                                                       |
| `dash`             | Dashes `3W` long and `W` wide, spaced by the period (`4.5W`, a gap of `1.5W`).                                                                                                   |
| `diamond`          | Diamonds (squares turned 45 degrees) `W` across, spaced by the period.                                                                                                           |
| `dash-dot`         | Alternating dashes `3W` long and discs `0.6W` across, each spaced by its own length.                                                                                             |
| `sinewave`         | A continuous sine wave of amplitude `W/2` and stroke `0.1W`, one period per segment of 0.75 scene units.                                                                         |
| `zigzag`           | A continuous zigzag of amplitude `W/2` and stroke `0.1W`, its arms at 90 degrees, one period per segment of 0.75 scene units.                                                    |
| `double`           | Two thin bars `0.2W` thick at `+-0.4W` from the line's center, `4W` long; an element counts `2W` long, so at the period of `3W` the bars overlap into two lines.                 |
| `forward-slash`    | Strokes `0.3W` thick from `(-0.5W, W)` to `(0.5W, -W)` across the line; an element counts `W` long, spaced by the period.                                                        |
| `backward-slash`   | Strokes `0.3W` thick from `(-0.5W, -W)` to `(0.5W, W)`, spaced as `forward-slash`.                                                                                               |
| `vertical-slash`   | Strokes `0.3W` thick straight across the line from `-W` to `W`, spaced as `forward-slash`.                                                                                       |
| `separate-arrow`   | Small arrows `2W` long: a shaft `0.3W` thick from `-W` to `0.3W` and a head `(0.3W, 0.5W) (W, 0) (0.3W, -0.5W)`; one centered on the line's start and one every 0.5 scene units. |
| `contiguous-arrow` | A bar `4W` long and `0.5W` thick with a chevron of two strokes `0.25W` thick meeting at `(0.5W, 0)` from `(-0.3W, +-0.8W)`; one centered on the start and one every `3W`.        |

## Transitions

Source: `src/transitions/presets/index.ts` (`TRANSITION_PRESETS`); each preset is one file beside
it. `t` is the transition's progress from 0 to 1 over its duration; every preset lands each node
exactly on its new place at `t = 1`. `ease(u)` is the cubic ease in and out: `4u^3` below one half,
else `1 - (2 - 2u)^3 / 2`. `win(t, s, l)` is `clamp((t - s) / l, 0, 1)`.

<!-- registry: transitions -->

| Name              | Definition                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glide`           | Straight from old to new place, `easing` param: `linear`, `ease-in-out` (default, `ease`) or `spring` (`1 - e^(-6u) cos(4.5 pi u) (1 - u)`).                                                                                        |
| `staggered-glide` | Each node glides as `glide` over a window of length `1 - 0.8 * stagger` (default stagger 0.5), starting at `order * (1 - length)`, where order is the node's distance from the center (`from` "center") or hops from the selection. |
| `arc-move`        | The eased straight path bowed to the left of travel within the x-y plane by `length * height * sin(pi u)`, length the whole move's (default height 0.3).                                                                            |
| `swirl`           | Turns about the z axis through the origin: the angle goes from the old bearing to the new, at least `abs(turns)` whole turns in the sign of `turns` (default 0.5; 0 the shorter way), radius and z blended, all eased.              |
| `fade-through`    | Each node dissolves into a puff of 12 particles with no curl and moves inside it during `win(t, 0.3 + 0.15 seed, 0.25)`, eased.                                                                                                     |
| `collapse-bloom`  | The old layout shrinks toward the origin to 4% of its size, holds for `hold` of the duration (default 0.1) while turning into the new layout at 4%, then blooms out (cubic ease out).                                               |
| `particle-morph`  | Each node bursts into `particles` (default 24) particles that stream through curl noise (`curl`, default 1) while the node glides during `win(t, seed * 0.35, 0.65)`, eased.                                                        |

## Overflow sequences

Source: `src/session/styles/encoding.ts`. When a categorical binding has more groups than its
palette has colors and its `overflow` is `shape` or `pattern`, each further full cycle of the
palette takes the next entry of these ordered lists.

<!-- registry: overflowShapes -->

| Name         | Definition                            |
| ------------ | ------------------------------------- |
| `icosphere`  | First cycle (the default node shape). |
| `box`        | Second cycle.                         |
| `octahedron` | Third cycle.                          |
| `cylinder`   | Fourth cycle.                         |
| `cone`       | Fifth cycle.                          |
| `torus`      | Sixth cycle.                          |

<!-- registry: overflowPatterns -->

| Name       | Definition                         |
| ---------- | ---------------------------------- |
| `solid`    | First cycle (the default pattern). |
| `dash`     | Second cycle.                      |
| `dot`      | Third cycle.                       |
| `dash-dot` | Fourth cycle.                      |
| `sinewave` | Fifth cycle.                       |
| `diamond`  | Sixth cycle.                       |

## Label looks

Source: `src/catalog/label-looks.ts` (`LABEL_LOOKS`). A look is a set of label-style values; the
label's own values override it.

<!-- registry: labelLooks -->

| Name      | Definition                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `default` | No values: the label style's own defaults.                                                                                     |
| `card`    | font Verdana, sans-serif; color #1a1a1a; background #ffffff; padding 6; cornerRadius 6; borderWidth 1; borderColor #8a8a8a.    |
| `dark`    | font Verdana, sans-serif; color #ffffff; background #222222; padding 6; cornerRadius 6.                                        |
| `pill`    | font Verdana, sans-serif; color #ffffff; background #1f5fa8; padding 8; cornerRadius 24; weight bold.                          |
| `callout` | font Verdana, sans-serif; color #1a1a1a; background #fff4c2; padding 6; cornerRadius 6; pointer true; pointerDirection bottom. |

## Closed choices

Choices a style channel accepts from a fixed list. Source: `src/config/NodeStyle.ts` and
`src/config/EdgeStyle.ts`, under the exported name in each heading.

### Node border styles (`NodeBorderStyles`)

<!-- registry: nodeBorderStyles -->

| Name               | Definition                                          |
| ------------------ | --------------------------------------------------- |
| `solid`            | A continuous ring.                                  |
| `dashed`           | The ring in `dash` elements.                        |
| `dotted`           | The ring in `dot` elements.                         |
| `double`           | Two thin rings.                                     |
| `dash-dot`         | The ring in `dash-dot` elements.                    |
| `zigzag`           | A zigzag running round the node.                    |
| `sinewave`         | A sine wave running round the node.                 |
| `forward-slash`    | Short strokes across the ring, leaning forward.     |
| `backward-slash`   | Short strokes across the ring, leaning back.        |
| `vertical-slash`   | Short strokes straight across the ring.             |
| `separate-arrow`   | A ring of small arrows chasing each other round it. |
| `contiguous-arrow` | A bar of arrows joined head to tail.                |

### Node border positions (`NodeBorderPositions`)

<!-- registry: nodeBorderPositions -->

| Name      | Definition                                         |
| --------- | -------------------------------------------------- |
| `outside` | Wholly outside the node's size (the default).      |
| `center`  | Centered on the node's edge, half in and half out. |
| `inside`  | Wholly inside the node's size.                     |

### Node size modes (`NodeSizeModes`)

<!-- registry: nodeSizeModes -->

| Name       | Definition                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `scale`    | `shape.size` multiplies each shape's own geometry (the default).                                        |
| `diameter` | `shape.size` is the drawn shape's largest width, height or depth, 1 scene unit per unit.                |
| `uniform`  | Every shape covers the same extent across the view, 1.5 scene units per unit (the default icosphere's). |

### Node label fits (`NodeLabelFits`)

<!-- registry: nodeLabelFits -->

| Name     | Definition                                             |
| -------- | ------------------------------------------------------ |
| `inside` | The label's padded box fits inside the node's outline. |
| `bounds` | The label's padded box is the node's width and height. |

### Node mesh details (`NodeMeshDetails`)

<!-- registry: nodeMeshDetails -->

| Name   | Definition                                                                               |
| ------ | ---------------------------------------------------------------------------------------- |
| `full` | The shape's own mesh (the default).                                                      |
| `low`  | An icosphere of one subdivision for a sphere; 8 segments around every other round shape. |

### Node model up axes (`NodeModelUpAxes`)

<!-- registry: nodeModelUpAxes -->

| Name       | Definition                         |
| ---------- | ---------------------------------- |
| `detected` | Read from the model file's format. |
| `y`        | +y is up in the file.              |
| `z`        | +z is up.                          |
| `-y`       | -y is up.                          |
| `-z`       | -z is up.                          |
| `x`        | +x is up.                          |
| `-x`       | -x is up.                          |

### Node model fits (`NodeModelFits`)

<!-- registry: nodeModelFits -->

| Name      | Definition                                       |
| --------- | ------------------------------------------------ |
| `contain` | Keeps the model's proportions inside the node.   |
| `stretch` | Stretched to the node's width, height and depth. |

### Node model centers (`NodeModelCenters`)

<!-- registry: nodeModelCenters -->

| Name     | Definition                                    |
| -------- | --------------------------------------------- |
| `bounds` | The model's bounding box center is the pivot. |
| `origin` | The model file's own origin is the pivot.     |

### Edge outline patterns (`EdgeOutlineTypes`)

<!-- registry: edgeOutlines -->

| Name       | Definition                       |
| ---------- | -------------------------------- |
| `solid`    | A continuous outline band.       |
| `dash`     | The band in `dash` elements.     |
| `dot`      | The band in `dot` elements.      |
| `dash-dot` | The band in `dash-dot` elements. |

### Not yet registered

These closed choices are saved by name but have no exported list in graphty-element, so this
registry cannot check them yet; each needs an exported list before version 2 is locked: image
`fit`, `autoSize`, `repeat` and `clip`, stripe `direction`, chart `kind`, label `paddingOf`
(`src/config/NodeStyle.ts`); arrow `side`, gradient `kind`, `bendCurve`, `supportModel`,
`supportScale` and `route` (`src/config/EdgeStyle.ts`); and `runPlacement`
(`src/session/configKeys.ts`).
