# Palette tool

An off-hand palette like Tilt Brush's: a prism of five faces -- Analyze, Style, Filter, Selection,
History -- carried by the off hand. Technique id `palette`; presets `palette` and
`baseline-palette`, or any preset with `&on=palette`.

## How to use it

- **Where it is.** With controllers it floats about 11 cm above the off controller. With hand
  tracking it rides the back of the off hand (setting "Off the back of the hand"). Either way the
  front card turns to look straight at the eyes, as Open Brush's panels do.
- **Turning it.** One flick of the off stick left or right turns exactly one face. With hands,
  pinch the orange rim under the faces with the other hand and drag sideways: the prism turns
  like a dial and snaps to the nearest face on release.
- **Pressing.** Point and trigger (or pinch), or poke with a fingertip. Only the front card takes
  presses; the side cards let a ray pass through.
- **Faces.**
    - Analyze: run (reveal) each result.
    - Style: color by and size by each result, or nothing; the current choice is highlighted.
    - Filter: "Take the sieve" puts the physical tools' sieve in the dominant hand; grayed with
      the reason when physical tools is off. Shows and removes the current filter.
    - Selection: what is selected; grow one hop, hide, clear, show hidden.
    - History: "Undo: <step>" and Redo.
- **Tear-off cards.** Grab a card by its orange bar and drag it away: it stays where it is
  dropped, fixed in the world, and keeps working. Drop it back within 10 cm of its slot, facing
  the same way within 70 degrees, and it snaps home.
- **The held copy.** The off hand carries the palette or handling's held copy, never both. The
  framework setting "Off hand carries" (gear panel, Framework tab) chooses.

## What it reuses

| Piece                                     | Covers                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Babylon `SixDofDragBehavior`              | Dragging a torn-off card, by ray, pinch or near grab                                                                                                                      |
| Babylon `PointerDragBehavior`             | The rim's pinch-drag (no movement; we read its deltas)                                                                                                                    |
| Babylon 2D GUI on near-pickable planes    | The cards' buttons, by ray and by poke (`ctx.ui.panel`)                                                                                                                   |
| Open Brush `PanelManager.cs` (Apache-2.0) | Behavior reference only: panes on a ring around the wand, one pane per stick flick, tear-off and snap back within 70 degrees, only the facing pane active. No code ported |
| The framework                             | The off hand's anchor (grip), the arbiter's stick press, the command layer, `ctx.tools` for the sieve, the pose layer's palm-normal formula                               |

## Gaps: what we would fix or replace later

- **No `HolographicSlate` or `TouchHolographicButton`.** The design suggested a slate for a torn
  card; a slate is a different object from the card, which would make snap-back a copy-and-swap.
  The card itself floats instead. Its tear bar could become a slate's title bar (with close and
  follow buttons) later. Buttons are flat 2D GUI; there is no physical press depth yet.
- **No coasting or haptic ticks** on turning (Open Brush coasts a swipe and ticks every 20
  degrees). The stick turn is a 120 ms ease.
- **Quest microgestures are claimed but never arrive**: the framework does not emit `micro`
  presses yet, so on Quest with hands the rim is the only way to turn.
- **The stick's direction is read from the gamepad axis** at the press, because the arbiter's
  stick press only says "x". A `detail` of left or right from the input layer would remove that.
- **Babylon's drag reach boost is off by default.** `SixDofDragBehavior` pushes and pulls an
  object three times as far as the hand moves toward or away from the body (`zDragFactor`), which
  is made for reaching far objects; on cards held close it reeled a card into the controller. The
  setting "Drag reach boost (cards)" turns it back on to compare.
- **A torn card cannot dock into another face**, and turning the prism does not move torn cards.
- **Side cards are not dimmed**: dimming means alpha blending five stacked planes, which risks
  sorting flicker; they are only made non-interactive.
- **Hands placement is computed from the joints**, paired with the previous frame's grip so the
  palette is drawn from the current frame's grip without lag; a hand with no grip space falls back
  to its pointer.
- **The card's roll follows the hand.** The front card always looks at the eyes, but its up
  direction follows the grip or the back of the hand, so a twisted wrist tilts the text. Keeping
  the text level is the other choice to try.
- **The carrying hand cannot poke its own palette**: Babylon's near interaction would otherwise
  take that hand over within 10 cm and switch its far ray off, which made the gear unreachable.
  The palette uses Babylon's own per-controller exclusion (`excludedControllerId`), as `HandMenu`
  does.
- **The rim drag on Galaxy XR is checked only in emulation** (IWER reports Quest's hand profile).

## Checks

`dryrun/checks/palette.mjs` (inside a browser slot, against a running server):

```
<main>/.worktrees/design-studio-tier1/design/ui/studio/tool/with-browser.sh \
  node xr-sandbox/dryrun/checks/palette.mjs --url https://dev.ato.ms:<port>/ \
  --out <main>/tmp/xr-sandbox/dryrun-palette --profiles quest3-controllers,quest3-hands,galaxyxr-hands
```
