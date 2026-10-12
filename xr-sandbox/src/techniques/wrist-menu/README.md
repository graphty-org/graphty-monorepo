# Wrist menu

Global actions on the off hand: **Undo** (its label names the step, "Undo: Color by PageRank"),
**Redo**, **Save**, **Settings** (opens the gear panel), **Steps**, **Recenter** and **Flag**.

## How to use it

- **Hands:** turn the off hand so the palm faces sideways across your body (thumb up) and look at
  it. The menu appears beside the hand. Palm up, palm toward your face, or looking away hides it.
  Palm toward the face is Quest's own system-menu gesture, so the menu never uses it.
- **Controllers:** turn the off controller so the inside of that wrist faces you, as when reading a
  watch worn on the inside of the wrist. Holding the controller normally, pointing ahead, hides it.
- Press an item with the **other** hand: a fingertip poke or a ray (pinch or trigger). A press made
  by the menu hand itself is ignored and logged as `wrist-menu.ignored`.

Settings (gear panel, Techniques tab): which side of the hand it sits on (`ulnar`, `radial`,
`below-wrist`, `above-fingertips`), its distance from the hand, whether hands also need you to look
at it, the gaze radius, and follow smoothing (0 ms: locked to the hand; Babylon's own default is
100 ms, which floats behind a moving hand by about 14 mm in the dry run).

Log entries: `wrist-menu.shown` / `hidden` (with the palm readings), `wrist-menu.item`,
`wrist-menu.ignored`, `wrist-menu.mode`; the actions log their own entries (`command` with code
`undo`, `flag`, `recenter`, `save`).

## What it reuses

- **Babylon.js `HandConstraintBehavior`** (`@babylonjs/core`), the placement half of Babylon GUI's
  `HandMenu` (playground `#24DLJ4#7`): it keeps the panel at a zone beside the off hand, rotates the
  zone with the palm, excludes the menu hand from near-touch, and supplies the gaze test (it uses
  eye tracking when that feature is enabled, the head's forward ray otherwise).
- **The framework's panel** (`ctx.ui.panel`, 2D GUI on a plane), the same kind the gear panel uses,
  so ray and poke both reach it through the framework's pointer setup.
- **The framework's pose layer** (`ctx.poses`) for palm up and palm toward the face, and its palm
  normal formula (`scene/poses.ts`) for "sideways".

## What we would fix or replace later

- **`HandMenu` itself is not used**, only its behavior. `HandMenu` is a GUI 3D control: it lives in
  a utility-layer scene that the framework's near interaction does not search (it is created
  without `useUtilityLayer`) and its meshes lack the framework's `ui` pick tag, so its buttons
  could be neither poked nor reached by the framework's ray. Using it needs a framework change
  (`nearInteractionOptions.useUtilityLayer` and a ray predicate for utility-layer meshes); then the
  MRTK-style `TouchHolographicButton`s could replace the flat panel.
- **Placement beside the hand only.** `HandConstraintBehavior` offers four zones in the plane of
  the hand; the design's "inner wrist" and "back of the wrist" options need an offset along the
  palm normal, which it does not have. A small custom follower would add them.
- **The behavior trails the hand by one frame** on its own: it reads joints' cached
  `absolutePosition`, filled earlier in the frame by the framework's pose layer before Babylon's
  hand tracking moved them. The module recomputes the three joints just before the behavior runs.
  The same ordering likely means the framework's pose layer and hover read the previous frame's
  joints (about 11 to 14 ms of latency); that is a framework fix, not this module's.
- **The palm-sideways thresholds** (palm normal within about 37 degrees of pointing across the
  body, and level within 30 degrees) and the controller's facing threshold are first guesses to
  tune in the headset.
- **The controller variant's palm side** is taken as the grip's +x (left) or -x (right) axis, per
  WebXR's grip space. Checked on IWER's Quest 3 profile only; Galaxy XR's real grip space is
  unverified.
- **No hold or fade**: the menu appears and disappears on the frame the pose changes (with
  hysteresis). If it flickers at the edge of the pose in the headset, add a short hold.
- Galaxy XR hands are emulated with Quest's hand profile, so the hand variant is unverified there.
