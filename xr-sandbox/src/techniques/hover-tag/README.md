# Hover name tag

Point a controller or a hand ray at a node and, before any press, a tag under the node reads
`Strozzi degree 4, #2`: the node's name, its value of the result the graph shows and its rank. Once
a result is shown (by color, or revealed with "run"), the result's name is dropped: `Strozzi 0.088,
#3` after PageRank. Each hand has its own tag; when both point at the same node, only the dominant
hand's shows.

## Settings (gear panel)

| Setting                   | Default   | What it does                                                                                                             |
| ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Value shown               | `current` | The shown result (degree when none is shown), or always PageRank, degree or betweenness                                  |
| Letter height (deg)       | 1.2       | Height of the tag's capital letters in degrees from the eye, kept constant at any distance (1.0 is the legibility floor) |
| Dwell before showing (ms) | 0         | How long a new node must be pointed at before its tag appears                                                            |
| Keep after leaving (ms)   | 300       | How long the tag stays after the ray slips off every node, so it does not blink                                          |

The tag needs hover. When every input is a transient pointer (an input that exists only while
pinching, as Galaxy XR's may be), the gear panel shows "needs hover (this input is a transient
pointer)" and the tag stays hidden.

## What it reuses

- **The framework's targeting layer** (`ctx.hover`): which node each hand is on, with hysteresis
  between nodes. The tag adds only a dwell and a linger on top (`tag.ts`, `TagTarget`).
- **The framework's chip** (`ctx.ui.chip`): a billboard plane with its own small `DynamicTexture`,
  drawn in rendering group 1 so it never z-fights the spheres. The text is redrawn only when the
  node or the shown result changes; moving the head only moves and scales the plane.
- **The graph's results and ranks** computed at load from `@graphty/algorithms` (`GraphData.rank`).

## What we would fix or replace later

- **MSDF text is not wired.** The design puts MSDF text (`TextRenderer` from `@babylonjs/addons`)
  behind a framework label toggle; neither the dependency nor the toggle exists yet. Bitmap text on
  a 512 x 64 texture is soft at 20 mm per m; if the owner finds it hard to read, MSDF is the fix,
  as a framework label renderer every technique's labels share.
- **No label pool.** The tag uses two chips, one per hand. Dense picking's hint tags will want a
  real pool; the tag should move onto it then.
- **Placement is fixed below the node.** In a crowded graph the tag can cover a neighbor's name
  label; it does not avoid other labels or the hand's ray.
- **Ties in rank** are broken by node order (Strozzi shares degree 4 with others but reads #2).
- **Categorical results** (community, component) have no rank, so while one colors the graph the
  tag falls back to the latest ranked result shown, or degree.

## Dry run

`node xr-sandbox/dryrun/checks/hover-tag.mjs --url <sandbox URL>` (inside a browser slot) checks,
on `quest3-controllers`, `quest3-hands` and `galaxyxr-hands`: the text before and after PageRank is
shown, the angular size at 0.5 m and 1.5 m, no redraw over 60 held frames, a seeded noisy aim
(`__sandbox.noisyAim`, about 1 degree of tremor) changing the target at most once per second, the
transient-pointer case, and switching off and on.
