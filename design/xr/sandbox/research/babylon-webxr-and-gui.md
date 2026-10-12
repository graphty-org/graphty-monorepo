# Research 1: what Babylon.js ships for WebXR input and 3D UI

Scope: the parts of Babylon.js the XR technique sandbox can build on -- hand tracking, near
interaction (poke, pinch, grab), pointer selection, the GUI 3D controls (NearMenu, HandMenu,
HolographicSlate, HolographicButton, TouchHolographicButton, the MRTK-style controls, Slider3D,
3D panels), the 2D GUI on a mesh (VirtualKeyboard, InputText, ColorPicker), the mesh behaviors
that go with them, and how all of this behaves on Meta Quest 3 (Quest Browser) and Samsung
Galaxy XR (Chrome on Android XR). Everything below was read from the shipped code
(`@babylonjs/core` 8.56.2 in the sandbox worktree, `@babylonjs/gui` 8.43.0 and 8.56.2 unpacked
from npm), the Babylon documentation source (github.com/BabylonJS/Documentation), the playground
snippet server, the Babylon forum and GitHub.

## Versions and what to install

- The worktree resolves `@babylonjs/core` 8.56.2 (pnpm lockfile). The latest on npm is 9.30.0
  (Babylon 9 shipped in 2026). Stay on 8.56.2 so the sandbox can use graphty-element and the
  repository's own packages without a second Babylon in the bundle.
- `@babylonjs/gui` is not a dependency anywhere in the repository yet. Add `@babylonjs/gui@8.56.2`
  to the sandbox, pinned to the same version as core (its peer range is `^8.0.0`, but GUI and
  core share internal classes and must match exactly). License Apache-2.0 for both.
- The GUI 3D code is effectively frozen: between 8.43.0 and 8.56.2 the only changes in `3D/`
  were three template-string typo fixes (control and panel names). The 3D controls date from
  Babylon 5 (2022, the MRTK port for HoloLens 2). Expect no upstream feature work; we fix or
  subclass what we need.
- Fixes that matter and are already in 8.56.2: hand joint meshes and default hand meshes are
  created in the XR session's scene, not `EngineStore.LastCreatedScene` (PRs #17828, #17847,
  8.50.x); joint meshes no longer appear before tracking starts (#17905, 8.53.1); observer
  leaks in the XR code (#17974, 8.53.1); microgestures (#17255). The main checkout's
  `node_modules` still holds 8.43.0, which has the wrong-scene bug: a HandMenu or any
  HandConstraintBehavior stops following the hand when the page creates a second real `Scene`
  after the main one. Build and test only from the worktree.

## Network dependencies (matters on a LAN dev server)

Babylon's XR and GUI 3D code downloads assets at run time. graphty-element already removes the
XR ones (`graphty-element/src/xr/XRSessionManager.ts`, `OFFLINE_XR_OPTIONS`); copy that block.

| What                                                          | Fetched from                                       | How to avoid it                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controller profile list and models                            | immersive-web.github.io, controllers.babylonjs.com | `inputOptions: { disableOnlineControllerRepository: true, doNotLoadControllerMeshes: true }`. The built-in classes cover `oculus-touch` and `oculus-hand`                                                                                                                                                                                                     |
| Rigged hand meshes and their shader                           | assets.babylonjs.com/core/HandMeshes               | `handSupportOptions.handMeshes.disableDefaultMeshes: true` (joint spheres instead), or ship the glTF and the shader JSON and set `customMeshes`                                                                                                                                                                                                               |
| Near-interaction orb material                                 | snippet.babylonjs.com                              | `nearInteractionOptions.motionControllerTouchMaterialSnippetUrl` pointing at graphty-element's `assets/touch-orb-material.json`                                                                                                                                                                                                                               |
| TouchHolographicButton, HolographicBackplate, Slider3D models | assets.babylonjs.com/core/MRTK/*.glb               | Static fields: `TouchHolographicButton.MODEL_BASE_URL`, `HolographicBackplate.MODEL_BASE_URL`, `Slider3D.MODEL_BASE_URL` (MRTK3 button: `FRONTPLATE_/BACKPLATE_/BACKGLOW_/INNERQUAD_MODEL_FILENAME`). Mirror the five glb files and point the fields at them. They also need the glTF loader (`@babylonjs/loaders/glTF`), which graphty-element does not ship |
| Fluent/MRDL textures, slate and menu icons                    | assets.babylonjs.com/core/MRTK/*.png               | `HolographicSlate.ASSETS_BASE_URL`, `NearMenu._ASSETS_BASE_URL` (private static; set it anyway or subclass)                                                                                                                                                                                                                                                   |

The headsets will normally have internet, so this is not a blocker for a playground; mirroring
the assets avoids a blank button when a CDN request fails and keeps the dry run reproducible
offline.

## Core WebXR features (in `@babylonjs/core`)

### Hand tracking (`WebXRHandTracking`, `WebXRFeatureName.HAND_TRACKING`)

- Enabled by default by `WebXRDefaultExperience` when the system offers `hand-tracking`
  (`disableHandTracking: true` to opt out). Gives each hand 25 joint meshes
  (`hand.trackedMeshes`, ordered as the WebXR hand-input joints), `onHandAddedObservable`,
  `getHandByHandedness("left")`, `getHandByControllerId(...)`.
- Options: joint meshes (invisible, custom source mesh, per-joint callback, physics, scale),
  hand meshes (default rigged meshes, custom rigged meshes plus rig mapping, colors,
  dispose-on-session-end, `disableHandShader`).
- What it does NOT do: any pose or gesture recognition. "Pinch" is the system `select`
  (Quest: index and thumb together); anything else (fist, point, palm up, thumbs up, pull
  distance) we compute from joints. graphty-element already has pinch distance with hysteresis
  in `graphty-element/src/cameras/InputUtils.ts` (`isPinching`, `pinchStrength`) -- reuse it.
- Mixing hands and controllers in one session works since 6.42 (one hand, one controller).
- Docs: https://doc.babylonjs.com/features/featuresDeepDive/webXR/WebXRHandTracking

### Microgestures (Quest only)

- Quest Browser 38.1+ exposes Meta's `XR_META_hand_tracking_microgestures` as extra buttons on
  the `oculus-hand` input profile: `menu` (left only), `swipe-left`, `swipe-right`,
  `swipe-forward`, `swipe-backward`, `tap-thumb`. Babylon reads them through
  `WebXROculusHandController` (import `@babylonjs/core/XR/motionController/webXROculusHandController`
  when tree-shaking); subscribe with `motionController.getComponent("swipe-left")`.
- Works with the offline controller options (the class is built in).
- Not on Android XR. For the gestures technique this is a free, OS-quality D-pad on Quest:
  thumb swipes for "next/previous result", tap for confirm.
- Playground: https://playground.babylonjs.com/#F41V6N#2427 (all six events) and #F41V6N#2275.
  Forum: https://forum.babylonjs.com/t/hand-tracking-microgestures/60860

### Near interaction (`WebXRNearInteraction`)

- Enabled by default by the default experience. Per hand (or controller) it sphere-picks near
  meshes: hover radius 0.1 m, touch radius 0.02 m with hands, 0.03 m with controllers (with a
  visible orb on controllers). Hard-coded private fields; scale with
  `sessionManager.worldScalingFactor`.
- Opt-in per mesh: `mesh.isNearPickable = true` (poke: touching presses) or
  `mesh.isNearGrabbable = true` (grab: touch plus select/squeeze). Set at most one. The flag
  only routes pointer events; something (a behavior or our code) must act on them.
- When a near target is in range it disables the far ray for that hand
  (`farInteractionFeature`), so poke and ray do not fight.
- Since Feb 2024 (PR #14787) a fingertip can poke 2D GUI on a mesh texture
  (`AdvancedDynamicTexture.CreateForMesh` + `plane.isNearPickable = true`). Playground:
  https://playground.babylonjs.com/#9K3MRA#1513 (color picker poked by a finger).
- Gaps: a single touch radius for every target (no per-target size), no "press depth" except
  in `TouchButton3D`, and it emits plain pointer events, so a poke and a pinch on the same mesh
  look alike unless we read `isActiveNearInteraction` or the pointer id.

### Pointer selection (`WebXRControllerPointerSelection`)

- The far ray for controllers and hands. On Quest and Android XR the system supplies the hand
  ray (target ray space); Babylon draws a laser and a selection torus and emits
  `scene.onPointerObservable` down/move/up with a pointer id per input.
- Useful options: `enablePointerSelectionOnAllControllers` (both hands at once -- needed for
  two-hand work), `preferredHandedness`, `disableSwitchOnClick`, `maxPointerDistance`,
  `customSelectionMeshGenerator`, `customLasterPointerMeshGenerator` (sic), `forceGripIfAvailable`,
  `disableScenePointerVectorUpdate` (set true in VR; saves work), gaze mode with `timeToSelect`.
- `xr.pointerSelection.getXRControllerByPointerId(id)` maps an event back to the hand.
- What it lacks for us: hover dwell and a "hover before act" event separate from GUI hover; we
  get pointer-move with a pick, which is enough for a hover name tag.

### Mesh behaviors (in core, used by the GUI 3D controls)

| Behavior                    | What it does                                                                              | Notes for us                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SixDofDragBehavior`        | Grab and move a mesh with a ray or a near grab; rotates with the controller               | `dragDeltaRatio` (0.2 default smoothing, set 1 for none), `zDragFactor` (3, pulls far objects faster), `rotateWithMotionController`, `rotateAroundYOnly`, `allowMultiPointer`, `faceCameraOnDragStart`, `onDragStart/onDrag/onDragEnd`. Marks children near-grabbable since 2024. Playgrounds #5G9MC5, #AZML8U#230                       |
| `MultiPointerScaleBehavior` | Two pointers scale a mesh by their distance                                               | Scale only, no two-hand rotate; uniform; no clamping. Good enough for "two-hand scale" v1                                                                                                                                                                                                                                                |
| `FollowBehavior`            | Keeps a node a set distance in front of the camera, lazily                                | `defaultDistance`, `minimumDistance`, `maximumDistance`, `verticalMaxDistance`; used by NearMenu                                                                                                                                                                                                                                         |
| `HandConstraintBehavior`    | Pins a node to a side of a hand; shows it only when the palm faces you and you look at it | `targetZone`, `zoneOrientationMode`, `nodeOrientationMode`, `handedness`, `handConstraintVisibility` (PALM_UP, PALM_AND_GAZE, GAZE_FOCUS, ...), `palmUpStrictness`, `gazeProximityRadius`, `lerpTime`. Uses the device's head direction (WebXR has no eye gaze on these headsets). Needs hand tracking: with controllers it does nothing |
| `SurfaceMagnetismBehavior`  | Snaps a node onto picked surfaces                                                         | Possible for the "slab/plate" placement                                                                                                                                                                                                                                                                                                  |
| `AttachToBoxBehavior`       | App bar that sticks to a bounding box                                                     | Could carry a per-node toolbar                                                                                                                                                                                                                                                                                                           |
| `BoundingBoxGizmo`          | MRTK "bounds control": handles to scale, rotate                                           | Heavy for a graph; maybe for the slab                                                                                                                                                                                                                                                                                                    |

Docs: https://doc.babylonjs.com/features/featuresDeepDive/behaviors/meshBehaviors

### WebXR layers (`WebXRLayers`)

- Quad layers are composited by the headset, not drawn into the eye buffer, so text on them
  is sharper and does not shimmer. `addFullscreenAdvancedDynamicTexture(adt, { distanceFromHeadset })`
  (experimental) shows a 2D GUI as a HUD quad; it is not interactive and returns null without
  runtime support. Playground https://playground.babylonjs.com/#JA1ND3#941.
- Use: an always-readable status strip (undo label, voice chip sentence read-out). Not for
  anything you poke.

## GUI 3D controls (in `@babylonjs/gui`, `3D/`)

Everything hangs off one `GUI3DManager(scene)`, which renders controls in a virtual utility
layer scene (its own picking; it does not replace `LastCreatedScene`). Set
`manager.useRealisticScaling = true` so control sizes are metric (MRTK scale); the official demo
does this. One manager per scene.

| Control                                                                      | What it is                                                                                                                        | Hands / controllers                 | What we would add or fix                                                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button3D`, `HolographicButton`                                              | Ray-pressed 3D button with 2D content or text+icon                                                                                | Far only                            | Little; superseded by the touch variants                                                                                                                  |
| `TouchButton3D`, `TouchMeshButton3D`                                         | Any mesh as a pokeable button with press depth (`getPressDepth`), `collidableFrontDirection`, toggle mode (`onToggleObservable`)  | Near poke and far ray               | Good base for palette faces and chips                                                                                                                     |
| `TouchHolographicButton` (MRTK2 look)                                        | HoloLens 2 style pressable button: text, icon, tooltip, backplate                                                                 | Near poke and far ray               | Loads a glb from the CDN; text is a 2D texture (set enough resolution)                                                                                    |
| `MRTK3.TouchHolographicButton`                                               | MRTK3 look (rounded, glow), same behavior; `radius`, `plateMaterialColor`                                                         | Same                                | Four glb files from the CDN                                                                                                                               |
| `Slider3D`                                                                   | 3D slider (min, max, step, value, `onValueChangedObservable`)                                                                     | Near grab of the thumb and ray drag | Single thumb only (no range slider for a sieve)                                                                                                           |
| `StackPanel3D`, `PlanePanel`, `CylinderPanel`, `SpherePanel`, `ScatterPanel` | Layout containers with rows/columns, margin, orientation modes                                                                    | n/a                                 | A cylinder panel is a ready "radial-ish" arc menu                                                                                                         |
| `TouchHolographicMenu`                                                       | Backplate plus grid of TouchHolographicButtons (`addButton` only)                                                                 | Both                                | Only buttons; no sub-menus, no sliders inside                                                                                                             |
| `NearMenu`                                                                   | TouchHolographicMenu + FollowBehavior + pin button + SixDofDrag on the backplate                                                  | Both                                | Follows the head lazily; pin to freeze. Was undraggable in immersive mode until 2024 (#11875 closed) and miscomputed cell size until 2024 (#15550 closed) |
| `HandMenu`                                                                   | TouchHolographicMenu + HandConstraintBehavior; appears on the outside of the left hand when the palm faces you and you look at it | Hands only                          | See the system-gesture conflict below. No controller mode: needs our own "parent to the left controller grip" variant                                     |
| `HolographicSlate`                                                           | Title bar (follow, close), content pane hosting a 2D GUI control, drag, two-hand scale and rotate by handles (SlateGizmo)         | Both                                | Good for the inspector and layer list; content is a single 2D control tree; minimum size enforced                                                         |
| `Control3D` subclass                                                         | Custom controls                                                                                                                   | --                                  | Documented extension point                                                                                                                                |

Docs: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D and
https://doc.babylonjs.com/features/featuresDeepDive/gui/mrtk

### 2D GUI on a mesh (the most flexible path)

- `AdvancedDynamicTexture.CreateForMesh(plane, w, h)` puts the whole 2D GUI (StackPanel, Grid,
  TextBlock, Button, Slider, Checkbox, RadioButton, ColorPicker, ScrollViewer, InputText,
  InputTextArea, Ellipse with `arc`, Image) on any plane. Rays click it; with
  `plane.isNearPickable = true` fingers poke it (since 2024).
- `CreateFullscreenUI` does not render in immersive sessions; never use it for XR UI.
- Text sharpness depends on texture resolution versus the plane's angular size; budget about
  1024 px per 30 cm panel, and use mipmaps off, `adt.renderScale` up if text is small.
- `VirtualKeyboard` is a 2D control (a StackPanel of key rows). `CreateDefaultLayout()` gives
  a QWERTY with shift; `addKeysRow(keys, propertySets)` builds custom layouts; it types into a
  connected `InputText`/`InputTextArea` (`keyboard.connect(input)`) and raises
  `onKeyPressObservable`. Put it on a mesh texture for XR. A 2022 bug (keys dead in XR when
  built in the GUI Editor) was fixed in PR (Apr 2022); building it in code always worked.
  Playground: https://playground.babylonjs.com/#S7L7FE (fullscreen, move to a mesh for XR).
  Gaps: no key-press feedback sound, no haptic per key, no word suggestions, no dictation key,
  and the default keys are small for fingertips (resize through the property sets).
- Radial menus: no built-in control. Babylon's `Ellipse` has an `arc` (0..1) for drawing pie
  wedges, and `CylinderPanel` lays buttons on an arc; a radial menu is ours to write. No forum
  or playground radial menu for XR was found.

## Device behavior

### Meta Quest 3 (Quest Browser)

- Hands: 25 joints per hand; system `select` = index-thumb pinch; system hand ray. Palm toward
  you plus pinch opens the Meta system menu -- any technique that pinches with the palm facing
  the face (HandMenu's own hand) risks the OS menu.
- Controllers: profile `oculus-touch-v2`/`oculus-touch`; built-in Babylon class.
- Microgestures from Quest Browser 38.1 (above). No eye tracking on the web.
- System keyboard: `session.isSystemKeyboardSupported` (Quest Browser 26.1+); focus a DOM
  `<input>` to show it. While it is up the session is `visible-blurred`, so the page gets no
  hand or controller input and Babylon pointers freeze; every new keyboard session overwrites
  the field's whole value; no per-key events. Not integrated in Babylon. Docs:
  https://developers.meta.com/horizon/documentation/web/webxr-keyboard/ ; forum:
  https://forum.babylonjs.com/t/how-to-let-user-use-system-keyboard-in-vr-mode/37708
- Speech recognition: Quest Browser has not exposed `SpeechRecognition` (reported for Quest 2;
  must be re-checked on the device). The voice technique likely needs a server or on-device
  model on Quest.
- Rendering: Babylon uses the `OCULUS_multiview` extension with MSAA. Known bug (open, Babylon
  8.5+): any GUI element makes the whole scene flicker on Quest 3 with multiview. Workaround
  `engine.getCaps().oculusMultiview = null` before creating the scene (falls back to
  `OVR_multiview2`, loses MSAA) -- or do not enable multiview. Forum:
  https://forum.babylonjs.com/t/gui-elements-cause-flickering-on-meta-quest-3-with-webxr-multiview-layers/58169
  (repro #9K3MRA#1942, fixed #9K3MRA#1980). The dry run must check this first; it is exactly the
  "jittery image" failure the owner warned about.
- Edge shimmer on Quest with head motion is inherent; keep antialias on, avoid thin lines and
  tiny text, prefer layers for text.

### Samsung Galaxy XR (Chrome on Android XR)

- Chrome on Android XR supports the Device API, AR module, gamepads, hit test, hand input
  (the default input), anchors, depth sensing, light estimation.
  https://developer.android.com/develop/xr/web
- Hands: profile `generic-hand-select` (Babylon maps it to its generic trigger class); select =
  pinch. The OS reserves palm-toward-you pinch (and pinch-and-drag left/right) for Launcher,
  Back and Recents -- the same HandMenu conflict as Quest, worse because more gestures are
  reserved. https://support.google.com/android-xr/answer/16639048
- Controllers (optional accessory): report profiles `["samsung-galaxyxr", "oculus-touch", ...]`
  with an xr-standard gamepad of 6 buttons and 4 axes while the samsung profile describes 7.
  This crashed Meta's IWSDK every frame (https://github.com/facebook/immersive-web-sdk/issues/54).
  Babylon is safe: `WebXRControllerComponent.update` skips a missing button index, and with the
  online repository off the controller falls back to the built-in `oculus-touch` class. Users
  report the controllers feel sluggish in some apps; measure latency in the dry run.
- Eye tracking exists on the device but we have no evidence Chrome exposes gaze (or a
  `transient-pointer` source) to WebXR; HandConstraintBehavior's "look at your hand" uses head
  direction either way.
- `hand-tracking` must be an optional feature, not required (Google's XR Blocks hit
  NotSupportedError on phones when it was required: https://github.com/google/xrblocks/pull/636).
  Babylon's default experience already requests it optionally.
- Speech: Chrome has `webkitSpeechRecognition`; whether it runs inside an immersive session on
  Android XR is unverified.

### Emulation for the dry run

- The worktree has IWER 2.5.0 (graphty-element's `xr` test project). It ships only Meta headset
  presets, hand poses `relaxed`, `point`, `pinch` (`XRHandInput.poseId`, `pinchValue`) and a gaze
  input. A Galaxy XR controller can be emulated with a custom `XRDeviceConfig` whose controller
  reports the two profiles and only 6 buttons, which reproduces the IWSDK crash case.

## Known bugs and traps (collected)

| Problem                                                                                    | Status                    | Source                 | What to do                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Scene flickers on Quest 3 when any GUI is present with `oculus_multiview`                  | Open since 8.5            | forum 58169            | `engine.getCaps().oculusMultiview = null`, or no multiview; test first in the dry run   |
| HandConstraintBehavior / HandMenu does not follow the hand when two real scenes exist      | Fixed 8.50.2 (#17847)     | forum 62370            | Worktree is on 8.56.2; still keep one real scene (the held copy goes in the same scene) |
| Hands invisible but working on Quest after reading `worldScalingFactor` before entering XR | Fixed (#14756)            | forum 47615            | Do not touch `worldScalingFactor` before the session starts                             |
| Joint meshes visible before tracking starts                                                | Fixed 8.53.1 (#17905)     | whats-new              | --                                                                                      |
| NearMenu backplate could not be dragged in immersive mode                                  | Fixed 2024 (#11875)       | GitHub                 | --                                                                                      |
| NearMenu cell size computed wrong                                                          | Fixed 2024 (#15550)       | GitHub                 | --                                                                                      |
| SixDofDrag did not near-grab child meshes of a glTF; scale drift with near and far picking | Fixed 2024                | forum 48963            | Use bounding-box proxies for pick anyway (performance)                                  |
| VirtualKeyboard keys dead in XR when the GUI came from the GUI Editor                      | Fixed Apr 2022            | forum 27826            | Build the keyboard in code                                                              |
| System keyboard blurs the session; hands and controllers freeze                            | Platform behavior         | Meta docs, forum 37708 | Prefer the in-scene keyboard; system keyboard as an experiment only                     |
| Galaxy XR controller reports fewer buttons than its profile                                | Platform behavior         | IWSDK #54              | Babylon already guards; keep the guard in our own gamepad reads                         |
| Quest 3 body tracking: right palm orientation wrong at startup                             | Open (body tracking only) | forum 63541            | We do not use body tracking                                                             |
| `CreateFullscreenUI` invisible in XR                                                       | By design                 | forum 27774            | Use `CreateForMesh` or a quad layer                                                     |
| Babylon depth sensing updates slower than three.js                                         | Reported 2025             | forum 54642            | Not needed                                                                              |

## Playground and code index

| Id                                                            | What                                                                                                                              | Use for                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [#24DLJ4#7](https://playground.babylonjs.com/#24DLJ4#7)       | TouchHolographicButton, TouchMeshButton3D with press depth, NearMenu (pinned), HandMenu with three buttons, `useRealisticScaling` | Wrist/palm menu, palette face buttons |
| [#43YQHC#2](https://playground.babylonjs.com/#43YQHC#2)       | HolographicSlate with label, scrolling image, a Grid "bio"                                                                        | Inspector, layer list                 |
| [#SYD2M2#10](https://playground.babylonjs.com/#SYD2M2#10)     | HolographicSlate basics                                                                                                           | Inspector                             |
| [#2PKNJB#7](https://playground.babylonjs.com/#2PKNJB#7)       | Slider3D changing colors                                                                                                          | Sieve threshold                       |
| [#9K3MRA#1513](https://playground.babylonjs.com/#9K3MRA#1513) | 2D GUI ColorPicker on a mesh, poked by a fingertip                                                                                | Any poke panel, keyboard on a mesh    |
| [#S7L7FE](https://playground.babylonjs.com/#S7L7FE)           | VirtualKeyboard connected to an InputText                                                                                         | Text entry                            |
| [#F41V6N#2427](https://playground.babylonjs.com/#F41V6N#2427) | All Quest microgestures                                                                                                           | Gestures                              |
| [#5G9MC5](https://playground.babylonjs.com/#5G9MC5)           | SixDofDragBehavior, single or multi-pointer                                                                                       | Grab and turn                         |
| [#AZML8U#230](https://playground.babylonjs.com/#AZML8U#230)   | Near-grab glTF models with SixDofDrag in VR                                                                                       | Grab, held copy                       |
| [#9M1I08#166](https://playground.babylonjs.com/#9M1I08#166)   | Hand-tracking grab using pointer down as grab                                                                                     | Pinch to grab a node                  |
| [#X7Y4H8#73](https://playground.babylonjs.com/#X7Y4H8#73)     | Hand joints with physics                                                                                                          | Push/poke physics experiments         |
| [#HB4C01#8](https://playground.babylonjs.com/#HB4C01#8)       | CylinderPanel                                                                                                                     | Arc menu around a node                |
| [#F41V6N#139](https://playground.babylonjs.com/#F41V6N#139)   | Cylinder parented to a controller                                                                                                 | Palette on the off-hand controller    |
| [#JA1ND3#941](https://playground.babylonjs.com/#JA1ND3#941)   | 2D GUI on a WebXR quad layer                                                                                                      | Sharp HUD text                        |
| [#9K3MRA#1980](https://playground.babylonjs.com/#9K3MRA#1980) | Quest 3 multiview GUI flicker workaround                                                                                          | Dry-run check                         |

Snippet code is readable without a browser: `https://snippet.babylonjs.com/<ID>/<rev>` returns
JSON whose `jsonPayload.code` is the source.

No Babylon-specific XR UI library exists on npm (searches for Babylon XR menus, radial menus and
gesture libraries return only Babylon's own packages). The Babylon ecosystem for XR UI is the GUI
package itself plus playground code.

## Coverage of the owner's techniques by Babylon alone

| #   | Technique                     | Babylon gives                                                                                       | We add                                                                                           |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Gestures                      | Joint poses; Quest microgestures; system pinch                                                      | Pose and motion recognition (see handy.js below and research 2)                                  |
| 2   | Palette tool                  | TouchButton3D / TouchHolographicButton, panels, 2D GUI on a mesh, parenting to grip or a hand joint | Faces you turn, tear-off cards (SixDofDrag on a cloned card), off-hand anchoring for controllers |
| 3   | Node menus                    | CylinderPanel/PlanePanel of touch buttons, `onPointerObservable` picks                              | Spawn at the picked node, empty-space menu, dismissal rules                                      |
| 4   | Figma-like menus              | HolographicSlate (inspector, layer list), NearMenu (floating toolbar), 2D GUI widgets               | Popover placement, a layer list with drag reorder (ScrollViewer + our drag)                      |
| 5   | Hover name tag                | Pointer-move picks; 2D GUI TextBlock on a billboard plane or a quad layer                           | Dwell timing, placement, text from graph data                                                    |
| 6   | Pull to grow                  | Pinch events, joint positions, SixDofDrag drag deltas                                               | Distance-to-hops mapping, live readout, commit on release                                        |
| 7   | Physical tools (sieve, probe) | Slider3D, SixDofDrag, near grab                                                                     | The tools themselves; a range slider                                                             |
| 8   | Voice chip sentence           | 2D GUI buttons as chips                                                                             | Speech capture (browser or server), parsing, chip editing                                        |
| 9   | Dense picking                 | Ray picking, near picking                                                                           | Hint tags, the slab and its flat slice                                                           |
| 10  | Handling the graph            | SixDofDrag (grab, turn), MultiPointerScale (two-hand scale)                                         | Two-hand rotate, the held copy (instances of the graph's meshes in the same scene)               |
| 11  | Text entry                    | VirtualKeyboard, InputText; Quest system keyboard via DOM                                           | Bigger keys, haptics, dictation key                                                              |
| 12  | Wrist / palm menu             | HandMenu + HandConstraintBehavior                                                                   | Controller variant; a gesture that does not collide with the OS menu                             |
| 13  | Visible undo                  | 2D GUI text                                                                                         | The history itself                                                                               |

## Candidates

| Candidate                                                                                 | What it does                                                                                                                                                        | License    | Maintenance                               | Covers                                                              | Add or fix                                                             | Link                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Babylon WebXR default experience + hand tracking + near interaction + pointer selection   | Session, hands, controllers, poke, grab flags, rays                                                                                                                 | Apache-2.0 | Active (core 9.30.0, 2026-10-08)          | Input base for every technique                                      | Offline options from graphty-element; our pose recognition             | https://doc.babylonjs.com/features/featuresDeepDive/webXR/WebXRHandTracking |
| Babylon microgestures (`oculus-hand`)                                                     | Thumb swipes and tap as buttons, Quest only                                                                                                                         | Apache-2.0 | Added 2025, active                        | Part of gestures (1)                                                | Android XR has none                                                    | https://playground.babylonjs.com/#F41V6N#2427                               |
| `@babylonjs/gui` GUI3DManager + TouchHolographicButton / MRTK3 button / TouchMeshButton3D | Pokeable, ray-pressable 3D buttons                                                                                                                                  | Apache-2.0 | Frozen since about 2022 (typo fixes only) | Palette faces, node menus, wrist menu buttons, chips (2, 3, 8, 12)  | Mirror glb assets; glTF loader; our layouts                            | https://doc.babylonjs.com/features/featuresDeepDive/gui/mrtk                |
| NearMenu                                                                                  | Floating, head-following, pinnable button menu                                                                                                                      | Apache-2.0 | Frozen                                    | Floating toolbar (4), empty-space menu (3)                          | Only buttons; no submenus                                              | https://playground.babylonjs.com/#24DLJ4#7                                  |
| HandMenu + HandConstraintBehavior                                                         | Menu on the palm side of a hand                                                                                                                                     | Apache-2.0 | Frozen; scene bug fixed 8.50.2            | Wrist/palm menu (12)                                                | Controller variant; OS palm-pinch conflict                             | https://playground.babylonjs.com/#24DLJ4#7                                  |
| HolographicSlate                                                                          | Movable, scalable panel hosting 2D GUI                                                                                                                              | Apache-2.0 | Frozen                                    | Inspector, layer list (4), undo history (13)                        | Layer drag-reorder                                                     | https://playground.babylonjs.com/#43YQHC#2                                  |
| Slider3D                                                                                  | Single-thumb 3D slider                                                                                                                                              | Apache-2.0 | Frozen                                    | Sieve threshold (7)                                                 | Range (two thumbs)                                                     | https://playground.babylonjs.com/#2PKNJB#7                                  |
| 3D panels (Cylinder, Plane, Sphere, Stack, Scatter)                                       | Layout of 3D controls                                                                                                                                               | Apache-2.0 | Frozen                                    | Node menus, palette faces (2, 3)                                    | Radial layout                                                          | https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D               |
| 2D GUI on a mesh (`CreateForMesh`) with near poke                                         | Full widget set on any plane                                                                                                                                        | Apache-2.0 | Active                                    | Name tag, chips, inspector content, keyboard host (4, 5, 8, 11, 13) | Texture resolution tuning                                              | https://playground.babylonjs.com/#9K3MRA#1513                               |
| VirtualKeyboard                                                                           | QWERTY with shift, custom rows, types into InputText                                                                                                                | Apache-2.0 | Stable                                    | In-scene keyboard (11)                                              | Key size, feedback, dictation key                                      | https://playground.babylonjs.com/#S7L7FE                                    |
| SixDofDragBehavior                                                                        | Grab, move, rotate with ray or near grab, smoothing                                                                                                                 | Apache-2.0 | Active (fixes 2024)                       | Grab and turn, tear-off cards, tools (2, 7, 10)                     | Two-hand rotate                                                        | https://playground.babylonjs.com/#5G9MC5                                    |
| MultiPointerScaleBehavior                                                                 | Two-pointer scale                                                                                                                                                   | Apache-2.0 | Stable                                    | Two-hand scale (10)                                                 | Clamp, pivot between hands                                             | https://doc.babylonjs.com/features/featuresDeepDive/behaviors/meshBehaviors |
| WebXR quad layer GUI                                                                      | Sharp, non-interactive HUD text                                                                                                                                     | Apache-2.0 | Experimental                              | Undo label, voice read-out (8, 13)                                  | Interaction is not possible                                            | https://playground.babylonjs.com/#JA1ND3#941                                |
| Quest system keyboard (`isSystemKeyboardSupported`)                                       | OS keyboard over a DOM input                                                                                                                                        | Platform   | Quest Browser 26.1+                       | Text entry (11)                                                     | Session blurs, input freezes; Quest only                               | https://developers.meta.com/horizon/documentation/web/webxr-keyboard/       |
| graphty-element `XRSessionManager` / `XRInputHandler` / `InputUtils`                      | Offline XR options, pinch with hysteresis, two-hand gesture deltas, thumbstick mapping                                                                              | Repo       | This repository                           | Setup, pinch, two-hand handling (1, 6, 10)                          | Not exported for reuse; copy or import from src                        | graphty-element/src/xr, graphty-element/src/cameras                         |
| handy.js (Stewart Smith)                                                                  | Hand pose recognition, 100+ poses incl. ASL, by comparing joint distances                                                                                           | MIT        | Unmaintained since 2021                   | Gestures (1)                                                        | three.js `Object3D` wrapper; port the matcher to Babylon joints        | https://github.com/stewdio/handy.js                                         |
| XR Blocks (Google)                                                                        | three.js WebXR + AI SDK for Android XR; heuristic gesture recognizer (pinch, point, spread, thumbs up ...) with confidence and start/update/end events; voice demos | Apache-2.0 | Active (pushed 2026-10-10)                | Gestures and voice ideas (1, 8)                                     | three.js; take the recognizer design and thresholds, not the code base | https://github.com/google/xrblocks                                          |

## Recommendations for the sandbox

1. Pin `@babylonjs/gui@8.56.2` beside core 8.56.2; add `@babylonjs/loaders` only if we keep the
   MRTK glb buttons, and mirror their assets locally.
2. Start from graphty-element's offline XR options; enable pointer selection on both hands
   (`enablePointerSelectionOnAllControllers: true`) so two-hand techniques work.
3. Before anything else in the dry run, check the Quest 3 multiview flicker with a GUI on
   screen, and decide multiview off or `oculusMultiview = null`.
4. Build menus and panels mostly from 2D GUI on near-pickable planes (one widget set, poke and
   ray both work); use TouchHolographicButton where a physical press matters (palette faces).
5. Keep one real `Scene`. GUI3DManager's utility layer is a virtual scene and is fine.
6. Avoid palm-toward-face pinches in our own gestures and wrist menu (OS menu on both devices);
   offer a controller-grip-parented variant of every hand-anchored UI.
7. Treat voice as unavailable on Quest until checked on the device; keep every voice path
   duplicated by chips and the keyboard.
