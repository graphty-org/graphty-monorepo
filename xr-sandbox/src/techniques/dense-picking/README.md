# Dense picking

Two aids for picking one node in a crowded graph. Each is its own setting (`hints`, `slab`), so
the `dense`, `dense-hints` and `dense-slab` presets compare them alone and together.

## How to use it

**Hint tags.** Point the dominant ray at the graph and hold it still for a moment (`dwellMs`,
250 ms). Two-letter tags appear over every node within the cone around the ray (`coneDeg`, 3
degrees half angle), and a mini keyboard appears above the graph showing only the letters that
can come next. Point at a key and pinch or pull the trigger (or poke it). When a whole tag is typed,
that node is selected. Back removes a letter; Clear drops the tags. Once latched, tags stay put
while the ray goes to the keyboard; pointing at a new region and holding latches a new set.

**The slab.** While the technique is on, a translucent plate floats 30 cm in front of the off hand
(`reachCm`, `sizeCm`), facing along that hand's ray. Push it into the graph: nodes within half its
thickness (`thicknessCm`, 3 cm) and inside its square are drawn as dots flat on the plate, and the
rest of the graph dims. Point the dominant ray at the plate: the dot nearest the ray is hovered
(highlighted on the plate and in the graph), and a tap selects that node in the full graph. With
the ray on the plate, hint tags label the dots within the same cone instead.

- Off-hand grip (controllers) or fist (hands) pins the plate where it is, freeing that hand.
- The button under the plate pins it, or takes it back into the off hand.
- Other techniques can hand it to a hand as the `slab` tool (`ctx.tools.take("slab", hand)`).

## What it reuses

| Piece                                 | Source                                                                                                      | What we changed                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tag strings, none a prefix of another | Vimium `hintStrings` (MIT, `content_scripts/link_hints.js`), copied with its license into `hint-strings.ts` | A minimum length of two letters; leaves sorted before the cut so up to 20 tags differ in their first letter                                                         |
| Voice-safe alphabet                   | Research note: letter names b, d, e, p, t, v sound alike                                                    | The default alphabet is a to z without them (20 letters); Vimium's home row is a setting                                                                            |
| Tag rendering                         | Babylon `SpriteManager` with one atlas texture of all 676 letter pairs, drawn once                          | Sized each frame so their letters keep a constant angular height (`tagDeg`), drawn over the graph                                                                   |
| The slab                              | Slicing-Volume (Montano-Murillo et al., IEEE VR 2020), technique only, no code                              | Our own: a plate on the off hand's ray, slice by distance to its plane, dots flat on the plate, a bubble cursor on the plate as the dominant hand's target provider |
| Mini keyboard                         | Framework panels (`ctx.ui.panel`, Babylon 2D GUI buttons)                                                   | Shows only the letters in use                                                                                                                                       |

## Known gaps, and what we would fix or replace later

- **Deferred techniques.** RayCursor (MIT, CHI 2019, Unity C#; port its `ClosestSelectable` and
  depth transfer functions, about 200 lines, as a third target provider), the slab's LassoGrid
  layout (a grid instead of a projection, so overlapping dots separate), SQUAD (quad-menu
  refinement), Flower Ray (fan out the nodes along the ray) and VoiceRay ordinals ("second") are not
  built.
- **Saying a tag** needs the voice technique; the alphabet is ready for it, the wiring is not.
- **Tags latch once.** They do not follow the ray after latching; a new region needs a new dwell.
  Under real hand tremor the anchor node may flicker and delay the latch: tune `dwellMs` and
  `coneDeg` on the headset, or latch on the set's center instead of its nearest node.
- **The plate is not smoothed.** It follows the off hand's ray as tracked; tremor moves the slice.
  A One Euro filter (`1eurofilter` is already a dependency) on the plate pose is the fix.
- **Dots are one color.** They do not carry the node's color-by color; the graph view does not
  expose per-node colors.
- **Re-dimming rebuilds the graph's buffers** (at most every 100 ms while the slice changes). At
  2,000 nodes that is the largest per-frame cost of the slab; a color-only update in the graph view
  would remove it.
- **One target provider per hand.** The framework's `ctx.target.provide` keeps the last provider
  set; with handling's held copy on the same hand, whichever was set last wins.
- **No beacons.** The sandbox has no beacon markers yet; the dry run uses the node with the highest
  PageRank as the beacon.
- **Only emulated.** Checked on IWER (Quest 3 controllers and hands); poke typing on the keys and
  the fist pin are not exercised by the dry run.

## Dry run

`dryrun/checks/dense-picking.mjs` (run it inside a browser slot; the header has the command):
tags are exactly the cone, two letters, prefix-free; typing the beacon's tag selects it; the slab's
slice is exactly the nodes within half its thickness and the rest dim; the ray on a dot hovers it
and a tap selects it; switched off, everything goes; with the module off a plain tap selects; at
2,000 nodes, no frame's JavaScript over 50 ms while tags are latched and the slab sweeps the graph.
