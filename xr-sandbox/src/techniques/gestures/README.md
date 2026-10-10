# Gestures

Static hand poses and Quest thumb microgestures, each bound to a command. Switch it on in the
gear panel or with `on=gestures` (it is in the `hands-first` and `everything` presets).

## Using it

- **Poses.** Hold a pose still for about 150 ms and its command runs once; holding it longer
  does not repeat it. A chip above the hand names the pose and what it did ("Thumbs up: Color by
  PageRank"). Nothing fires while the hand pinches.
- **Default bindings.** Thumbs up: color by the next result. Shaka (thumb and pinky out): undo.
  Horns, Vulcan salute and Point: nothing. Change any of them in the gear panel (Gestures
  settings) to next color, previous color, undo, redo or clear selection.
- **Microgestures (Quest only).** On the dominant hand: swipe left and right step the coloring,
  swipe forward and back redo and undo, a thumb tap clears the selection. Galaxy XR has no
  microgestures; there the settings say "unavailable here". A swipe while pointing at a panel
  goes to the panel, not to a binding.
- **Tuning.** "Match within" is how close a hand must be to a template (radians, default 0.3; an
  active pose ends past 1.5 times that). "Hold before firing" is the minimum hold.
- **Recording your own hand.** Pick a pose in "Record into", press "Record pose", and hold the
  pose with both hands for 3 s. The recording replaces that template for this session, and the
  log entry `gestures.recorded` holds it as base64 (a handy-work `.handpose` file). To keep it,
  copy that string into `poses/handy-work.json` under the pose's name.
- **Extra bindings from the URL.** `s.gestures.extra=<gesture>[@palm-up|@palm-face]:<command>;...`,
  for example `s.gestures.extra=shaka@palm-up:redo`. A binding that needs a pinch with the palm
  toward the face or forward is refused when the page loads, and the reason is logged as
  `gestures.refused`: those are Quest's system gesture (on the left hand it leaves the session)
  and Galaxy XR's navigation gesture.

## What it reuses

- **handy-work** (MIT, Ada Rose Cannon, https://github.com/AdaRoseCannon/handy-work, last
  released 3.1.13): its seven shipped pose templates (fist, flat, point, shaka, relax, horns,
  vulcan) are in `poses/handy-work.json` with its license in `poses/LICENSE-handy-work.txt`, and
  its matcher (joint rotations relative to the wrist, compared as a mean angle) and its
  `.handpose` layout are forked in `recognizer.ts`. The package itself is not a dependency: it
  runs the matcher in a Web Worker through comlink, bundles three.js for the matrix math, fetches
  poses by URL, returns results a frame late, and its recorder downloads a file, which a headset
  cannot hand back. The fork is about 60 lines of plain matrix math, run synchronously each frame
  (the dry run measured every technique hook together at 0.4 ms p95).
- **Babylon's `WebXROculusHandController`** names the microgestures and their gamepad buttons
  (5 swipe left, 6 swipe right, 7 swipe forward, 8 swipe backward, 9 thumb tap). The framework's
  input layer reads those buttons on a hand's gamepad and sends them through the arbiter on the
  `micro` channel, so the palette's off-hand swipes and this technique's dominant-hand swipes
  share one path.
- **The framework's pose layer** supplies pinch, palm up and palm toward the face.

## Known gaps (fix or replace later)

- **The templates are someone else's hands.** handy-work's poses were recorded on Ada Rose
  Cannon's hands, and handy-work ships no thumbs up: ours is its fist with its flat hand's thumb.
  The recorder exists so the owner's own hand replaces them after the first try.
- **Thumbs up and the fist are close.** They differ only in the thumb (0.2 radians apart).
  The fist template competes, so a fist never fires thumbs up, but a half-open thumb can land
  either way. Weighting the thumb joints in the thumbs-up template would sharpen it.
- **The framework's fist counts a thumbs up as a fist.** The pose layer's fist looks only at the
  four curled fingers, so a thumbs up also starts a squeeze press (handling's grab, in
  `hands-first`). That is why this technique does not suppress poses on the fist. The fix is in
  `src/scene/poses.ts`: also require the thumb tip within about 4.5 cm of the middle finger's
  middle joint (handy-work's fist measures 2.7 cm, a thumbs up 6.2 cm). It was left out because
  the emulated fist pose in `src/framework/emulate.ts` keeps its thumb out (9.9 cm) and would stop
  counting as a fist.
- **No suppression while holding.** A technique cannot see who owns a press, so "holding
  something" is only the pinch (select); a pose made while a fist grab is held still fires.
- **Poses do not go through the arbiter.** This technique is the only claimant of `pose`, so it
  runs bindings directly. If another technique claims `pose`, the framework needs a way for a
  technique to push a pose edge.
- **No motions.** Drawn motions (the $Q recognizer, `qdollar.js`, BSD) and "open palm pushed
  forward = cancel" are not built; the design adds them only if the owner binds motions.
  `@clickon/xr-extension` (poses and sequences for Babylon) targets Babylon 6 and owns the XR
  experience, so it was not used.
- **Commit or cancel another technique's preview** (the design's "thumbs up = commit the
  preview") needs a framework seam; the context only reaches a technique's own previews.
- **Palm forward and palm down** are not detected, so bindings that need them are refused.
- **Microgestures are emulated only by injection.** IWER does not emulate them; the dry run adds
  buttons 5 to 9 to the emulated hand's gamepad. Only a Quest shows whether Quest Browser
  reports them on those buttons.
