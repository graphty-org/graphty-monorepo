# graphty-element layout story changes from the snapshot layout engines

Commit `d055587d` moved graphty-element's static layout engines (arf, bfs, bipartite, circular,
grid, kamada-kawai, multipartite, planar, radial, random, shell, spectral, spiral, and the fixed
layout) off the legacy positional functions of `@graphty/layout` and onto the snapshot layouts
(`arf(snapshot, options)`, `kamadaKawai(...)`, `random(...)`, ...). This page records every
graphty-element story whose picture changed, why, and what the owner is asked to accept.
The owner has not reviewed any of it yet.

| Story                                                                          | What you see                                              | Recommended verdict |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------- |
| Layout/2D / Arf (`layout-2d--arf`)                                             | a different drawing of the same graph                     | accept              |
| Layout/3D / Kamada Kawai Weighted (`layout-3d--kamada-kawai-weighted`)         | a different drawing of the same graph                     | accept              |
| Layout/3D / Kamada Kawai (`layout-3d--kamada-kawai`)                           | a few nodes shifted by about a pixel                      | accept              |
| Layout/3D / Random (`layout-3d--random`)                                       | 8 anti-aliased pixels                                     | accept              |
| Styles/Layered / Label Enabled Layers (`styles-layered--label-enabled-layers`) | sometimes, nodes scattered away from their data positions | reject: a defect    |

Every other static layout story is unchanged, and so is every Styles, Data and Sets story except
the one fixed-layout story in the table, which is a defect (see "A fixed-layout story sometimes
ignores its data positions"). The force-directed stories (ForceAtlas2, Spring,
D3, NGraph, the GPU stories) use engines this commit did not touch; they differ between two
renders of the same build as well, so a difference there says nothing about this change (see
"Stories that differ from run to run").

**visual-review cannot show these changes today.** Its capture of graphty-element crops each
story to the page's visible content, and it looks for that content only in the light DOM. The
element draws into a canvas inside its shadow root, so for 168 of the 174 element stories it
captures, every layout story among them, the capture is a 2400x168 strip of the top of the frame
with no graph in it (see "Every other graphty-element story"). Until that is fixed, the captures on
this page are the review; the owner accepts or rejects each change here.

## What was compared

- The integration branch `feat/graph-format-migration` at `77c84820`, the parent of `d055587d`
  (the "before"), against the integration branch at `48ff1b3a` (the "after"), which holds
  `d055587d` and every layout and element commit after it.
- All 27 stories under Layout/2D, Layout/3D and Layout/GPU with `tools/diff-stories.mjs`
  (1000x800, SwiftShader WebGL, node and camera positions read from the element), then each
  differing pair through `tools/pixel-diff.mjs` (threshold 12).
- The three GPU stories (`layout-gpu--*`) time out on the screenshot under SwiftShader on both
  builds, so `diff-stories.mjs` has no pair for them. They run ForceAtlas2 and Spring, which
  `d055587d` did not change.
- Every Styles, Data and Sets story (107) with `diff-stories.mjs`, because most of them use the
  fixed layout.
- Every graphty-element story, before and after, with visual-review's own capture (`capture
--project graphty-element`, the before capture used as the baseline). See "Every other
  graphty-element story".

## Why the four stories changed: the start and the result are now float32

The snapshot layouts keep positions in a `Float32Array`; the legacy functions kept `number`
(float64). The start positions are drawn from the same seed as before, then rounded to float32,
which moves each coordinate by at most 3e-8. That was checked by running the story's own graph
(the Les Miserables data, 77 nodes and 254 edges, `graphty-element/test/helpers/data3.json`) and
options through three calls: the legacy function as the old engine called it, the legacy function
started from the float32-rounded start, and the snapshot layout as the new engine calls it.

| Story                    | Largest node move, before to after | Legacy from the float32 start vs after        | Drawing width |
| ------------------------ | ---------------------------------- | --------------------------------------------- | ------------- |
| Arf (2D)                 | 0.961 units (96 scene units)       | 4e-8                                          | 1.20          |
| Kamada-Kawai 3D weighted | 0.632 units (32 scene units)       | 5e-8                                          | 1.70          |
| Kamada-Kawai 3D          | 1.6e-4 units (0.008 scene units)   | 5e-8                                          | 1.72          |
| Random 3D                | 4e-8 units                         | 0 (the float32 rounding of the old positions) | --            |

The scene-unit moves are what `diff-stories.mjs` read from the rendered element on each side
(96.1, 31.6, 0.0075 and under 0.001), the layout-unit moves times the engines' scaling factor
(100 for arf, 50 for Kamada-Kawai). So the algorithms did not change and the engine hands them
the same graph and options: in every case the old code, given the float32 start, reproduces the
new picture to the float32 rounding of the result.

- **Arf** never converges at the story's 1000 iterations and is chaotic on this graph: a start
  that differs by less than a pixel ends in a different drawing. It is still a valid ARF result
  for the graph. The layout package's own ARF story changed for the same reason
  ([layout story record](../layout-stories/README.md)).
- **Kamada-Kawai 3D weighted** settles in a different local minimum from the float32 start,
  0.63 units away in a drawing 1.7 wide.
- **Kamada-Kawai 3D** unweighted settles in the same minimum, a few thousandths of a scene unit
  away.
- **Random 3D** draws the same positions, rounded to float32; the rim shading of a few spheres
  changes.

The weighted Kamada-Kawai distances are the same numbers on both sides. The old engine summed the
weights of the edges between each pair of nodes and handed Floyd-Warshall `1 / sum`; the new one
builds the same `1 / sum` as an f64 edge column of the snapshot. The 2D Kamada-Kawai stories start
on the unit circle, not from a random start, and did not change.

### Arf (`layout-2d--arf`)

Before and after: the same 77-node graph, drawn differently.

![Arf before](arf-2d-before.png)
![Arf after](arf-2d-after.png)

### Kamada-Kawai 3D weighted (`layout-3d--kamada-kawai-weighted`)

Before and after: the same graph, in a different local minimum.

![Kamada-Kawai 3D weighted before](kamada-kawai-3d-weighted-before.png)
![Kamada-Kawai 3D weighted after](kamada-kawai-3d-weighted-after.png)

### Kamada-Kawai 3D (`layout-3d--kamada-kawai`)

Before, after, and the pixel diff (changed pixels in red), around the graph: 357 pixels, on node
rims and on edges whose ends moved by a fraction of a pixel.

![Kamada-Kawai 3D, before, after and diff](kamada-kawai-3d-crop.png)

### Random 3D (`layout-3d--random`)

Before, after, and the pixel diff, 3x around the eight changed pixels.

![Random 3D, before, after and diff, 3x crop](random-3d-crop-3x.png)

## A fixed-layout story sometimes ignores its data positions

Styles/Layered / Label Enabled Layers uses the fixed layout with five nodes at data positions
(A at 0,2,0, B at -2,0,0, ...). On the after build, some renders draw the nodes scattered several
units from those positions, with the fixed layout active; the others draw the intended diamond.
On the before build every render is the diamond.

- `diff-stories.mjs` over the Styles, Data and Sets stories rendered it scattered, and the same
  story rendered twice from the after build came out scattered again.
- Rendering it one at a time: 1 of 8 renders of the after build scattered (A at -3.0,-3.2,4.3
  instead of 0,2,0, the largest move 7.3 units), 0 of 8 of the before build.

![Label Enabled Layers, a scattered render of the after build](label-enabled-layers-scattered.png)
![Label Enabled Layers, the intended picture](label-enabled-layers-placed.png)

The mechanism is not proven. What the code shows: the element's default layout is `ngraph`, and
since `d055587d` the fixed layout keeps whatever coordinates the element's position array holds,
"its data.position ... or wherever a drag or an earlier layout put it", where it used to place
every node at `data.position`. The scattered coordinates look like an ngraph start. So a render in
which ngraph runs before the story's `layout: "fixed"` takes effect would keep ngraph's
coordinates. The other Styles/Layered stories, with the same data and layout, render the same
bytes on both builds, and this one is right in most renders, so this is a race, and
visual-review's capture would show it as a flaky or changed story once its capture sees the
canvas. This needs an element fix (or a decision that a
switch to the fixed layout returns every node with a `data.position` to it), not an accept.

## Stories that did not change

Identical bytes before and after: Layout/2D Bfs, Bipartite, Circular, Kamada Kawai, Kamada Kawai
Weighted, Multipartite, Planar, Random, Shell, Spiral; Layout/3D Circular, Fixed, Spring,
Force Atlas 2 Weighted. Layout/3D Circular's nodes move by under 0.001 scene units (float32
rounding) and render the same bytes.

The fixed layout reads the element's position array instead of moving meshes itself. Layout/3D
Fixed and every Styles, Data and Sets story (107 stories, most on the fixed layout) render the
same bytes before and after with `diff-stories.mjs`, apart from Label Enabled Layers above and
Data / Json, which runs ngraph and differs between two renders of either build.

## Stories that differ from run to run

Layout/2D Force Atlas 2, Force Atlas 2 Weighted and Spring, and Layout/3D D3, Force Atlas 2 and
NGraph differ between the before and after builds, but they also differ when one build is
rendered twice: the physics engines are still moving nodes when the screenshot is taken. Two
renders of the before build give different pictures for Force Atlas 2 Weighted (2D), Spring (2D),
D3, Force Atlas 2 (3D) and NGraph; two renders of the after build for Force Atlas 2 (2D), Force
Atlas 2 Weighted (2D), Spring (2D) and NGraph. None of these engines is a static engine, and
`d055587d` did not change them.

## Every other graphty-element story

visual-review's own capture of all 178 graphty-element stories, the before build as the baseline:
173 `unchanged`, 1 `changed` (Layout/2D Arf), 2 `failed` (Layout/GPU Force Atlas 2 Fake and
Spring Fake time out on the screenshot on both builds) and 2 `excluded` by their stories'
`disableSnapshot`.

That count cannot be read as "nothing else changed". 168 of the 174 captures are the same
2400x168 strip: `contentClip` in `visual-review/capture/capture.mjs` walks
`document.body.children` and never enters a shadow root, so the canvas graphty-element renders
into its shadow root is invisible to it and the crop keeps only the top 84 CSS pixels of the
frame. 116 of those strips are byte-identical to each other. Arf shows as `changed` only because
some of its edges cross that strip; the Kamada-Kawai 3D and Random 3D changes above fall outside
it and show as `unchanged`. The six full-height captures are the stories whose light DOM holds
content of its own.

The fixed layout's move onto the position array is covered by the `diff-stories.mjs` captures
above (Layout/3D Fixed is identical, and its node positions agree), not by visual-review.

## Reproducing

Build graphty-element and its Storybook on both commits (`pnpm exec nx run graphty-element:build`,
then `npx storybook build -o storybook-static` in `graphty-element/`), then:

```bash
node tools/diff-stories.mjs <before>/graphty-element/storybook-static \
    <after>/graphty-element/storybook-static layout-2d--arf layout-3d--kamada-kawai ... --out <dir>
node tools/pixel-diff.mjs <dir>/layout-2d-arf.baseline.png <dir>/layout-2d-arf.head.png
node visual-review/trusted/cli.mjs capture --project graphty-element \
    --storybook <before>/graphty-element/storybook-static --baselines <empty dir> --out <b>
node visual-review/trusted/cli.mjs capture --project graphty-element \
    --storybook <after>/graphty-element/storybook-static --baselines <b> --out <a>
```

Running `diff-stories.mjs` with the same Storybook on both sides shows which stories differ from
run to run. The position figures come from a `tsx` script that imports the legacy
`kamadaKawaiLayout`, `arfLayout` and `randomLayout` from `layout/src` at `77c84820` and
`kamadaKawai`, `arf` and `random` from `layout/src` at the after commit, and compares their
results on `data3.json` with the story's options.
