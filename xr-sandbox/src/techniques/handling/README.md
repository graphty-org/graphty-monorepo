# Handling the graph

Grab and turn the graph with one hand, scale and turn it with two, and hold a small copy of it in
the off hand. Technique id `handling`; design section 9.10, plan section 3.4.

## How to use it

| Action           | Controllers                                    | Hands                                                            |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| Grab and turn    | Hold grip anywhere, move and turn the hand     | Make a fist anywhere; or pinch empty graph space and move 1.5 cm |
| Scale and turn   | Grip with both hands, move them apart or round | Fists (or pinches) with both hands                               |
| Held copy        | Shown above the off controller                 | Shown above the off hand while its palm faces up                 |
| Pick on the copy | Dominant ray on a copy node, trigger           | Dominant ray on a copy node, pinch                               |

Settings (gear panel, Handling tab): Two hands (`ours` or `stock`), One-hand follow per frame,
Two-hand smoothing (min cutoff, speed), Held copy, Held copy size. URL form:
`s.handling.twoHand=stock`, `s.handling.copy=true`.

Moving the graph is not a step in the history. Each hold is logged as `handling.grab` (moved cm,
turned degrees, scale); `handling.twoHand` names the two-hand mode; `handling.copy` logs the copy
showing and hiding.

## What it reuses

| Piece                                                                       | Covers                                                                                    | Not covered, or fix later                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Babylon `SixDofDragBehavior` (`grab.ts`)                                    | One-hand grab: its near-drag mode follows the grip rigidly, eased by `dragDeltaRatio`     | It is fed by the arbiter's presses through a proxy in a private virtual scene, because it only listens to scene pointer events. The easing is per frame, so it is frame-rate dependent, and a release stops it where it is (no settle).                                                                                                                            |
| Its two-pointer mode, as "stock" two hands                                  | Babylon's own two-hand scale and turn                                                     | Babylon refuses a second XR pointer (`allowMultiPointer` only works for touch pointers), so both hands are fed as touch pointers. It turns about the vertical only, does not clamp scale and is not smoothed. Kept only to compare against ours.                                                                                                                   |
| `WebXRNearInteraction` / `isNearGrabbable`                                  | The near-drag mode used above is the one near interaction feeds for near-grabbable meshes | Not switched on for graph meshes: a near grab would reach the behavior without the arbiter. A grip or fist works anywhere, which covers grabbing up close.                                                                                                                                                                                                         |
| graphty-element `twoHandGestureDelta` (copied, `two-hand-gesture-delta.ts`) | The turn of the line between the hands, full 3D                                           | Copied because graphty-element does not export it: issue #1946. Its zoom half is a per-frame camera zoom, so `two-hand.ts` computes scale itself. No twist about the hands' line.                                                                                                                                                                                  |
| `1eurofilter` (npm, BSD-3)                                                  | Filters both hands' positions before the two-hand math                                    | Filters position only, per axis; the one-hand grab relies on the behavior's easing instead.                                                                                                                                                                                                                                                                        |
| `HandConstraintBehavior`                                                    | Not used                                                                                  | It places a node beside the hand (zones above the fingertips, thumb side, little-finger side, below the wrist), not in the palm, by copying the hand pose with a lerp in an observer, which lags the hand (design section 10.2, rule 6), and it follows tracked hands only. The copy is parented to the grip anchor instead and uses the framework's palm-up pose. |

## Known gaps

- The held copy reads the graph view's instance buffers through Babylon's private storage fields;
  the graph view should expose them.
- The copy is placed 8 cm above the hand along world up when it appears and then rides with the
  hand; there is no box showing what is in front of the viewer, and no `BoundingBoxGizmo` handles.
- The copy is the dominant hand's target provider (design section 5.2 says the off hand's: the
  off hand holds it, so only the other hand can point at it). A ray that misses the copy falls
  through to the plain ray.
- The palette and the copy share the off hand; nothing hides one when the other shows yet.
- A pinch-drag on empty graph space starts 1.5 cm late (the arena decides first); the graph does not
  jump, but those 1.5 cm are not applied.
- Cancelling either hand of a two-hand hold (session blur, input removed, switched off) puts the
  graph back where the first hand took it.
- Scale limits are fixed at 0.2x to 5x.
