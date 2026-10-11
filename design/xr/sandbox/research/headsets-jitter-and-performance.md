# Research 5: the headsets, jitter, frame rate, and how the repository already does WebXR

Date: 2026-10-10. Scope: what Meta Quest 3 (Quest Browser) and Samsung Galaxy XR (Chrome on
Android XR) expose to WebXR; what makes a Babylon.js WebXR scene look jittery and how to prevent
it; how to hold 72 to 120 Hz with 1,000 to 10,000 nodes; what graphty-element's existing XR code
and IWER tests give the sandbox; the reusable engineering pieces, with license, maintenance,
coverage and what we would have to add.

Babylon.js version: this worktree installs `@babylonjs/core` 8.56.2 (graphty-element's peer range
is `^8.0.0`). The newest on npm is 9.30.0. Every Babylon claim below was checked in the 8.56.2
source under `node_modules/.pnpm/@babylonjs+core@8.56.2`. `@babylonjs/gui` and `@babylonjs/addons`
both publish a matching 8.56.2, and GUI must match core exactly.

## 1. Bottom line

1. **"Jittery images" in a headset are almost always missed frames, not bad math.** When the
   page misses the compositor's deadline, the runtime reprojects the previous frame for the head,
   so the room looks steady but anything that moves with a hand (a ray, a held palette, a
   dragged node) stutters or doubles. Measure frame time first, on the device, before suspecting
   transforms. The sandbox must log frame pacing to the remote logger from the first build.
2. **Second most likely cause: reading a transform that is one frame old.** Babylon updates
   the controller, hand and camera poses in place at the start of each XR frame. Code that moves
   the camera's parent (graphty-element's "pivot") after reading a hand's world position in the
   same frame sees a stale matrix. This was confirmed on 8.56.2 with a NullEngine script (section 4,
   cause 2). The cure is to move the graph, not the camera: keep the camera's parent fixed,
   transform a graph root node, and do input math in reference-space (local) coordinates.
3. **At 10,000 nodes the danger is CPU, not GPU.** Babylon's controller pointer selection
   ray-picks every pickable mesh on every frame for every controller, and near interaction
   sphere-picks every near-pickable mesh. graphty-element draws one `InstancedMesh` per node.
   10,000 pickable instance meshes times 2 hands times 72 to 120 Hz is the budget gone. The
   sandbox should draw nodes as thin instances (one mesh, one draw call), mark the graph
   unpickable, and pick nodes itself with a ray-versus-sphere loop over a `Float32Array` (about
   0.1 ms per ray at 10,000 nodes).
4. **The two headsets differ in ways that matter to the techniques.**
    - Quest Browser has WebXR Layers, multiview, fixed foveation, the frame-rate API, Space Warp,
      the system keyboard, and thumb microgestures (from Browser 38.1). It has no Web Speech
      recognition.
    - Chrome on Android XR documents hands (its primary input), the gamepads module, hit test,
      anchors, depth and light estimation. It says nothing about Layers, foveation, the
      frame-rate API or the system keyboard, so treat them as absent until a probe shows them.
    - Both reserve a palm pinch for the operating system: on Quest, palm toward the face; on
      Galaxy XR, palm forward. A wrist or palm menu must never ask for a pinch with the menu hand
      in either pose.
5. **Reuse most of the plumbing; write little.**
    - IWER (MIT, Meta, current) already emulates a Quest 3 in this repository's tests. It is the
      dry-run engine.
    - Babylon 8.56.2 already has hands, microgestures, near interaction, GUI 3D (NearMenu,
      HandMenu, HolographicSlate), HandConstraintBehavior, SixDofDragBehavior, MSDF text, thin
      instances, Layers with multiview, foveation and frame-rate control.
    - `1eurofilter` (BSD-3-Clause) filters ray jitter.
    - `@graphty/remote-logger` gets logs out of the headset.

## 2. What each headset exposes to WebXR

Status key: **doc** = the vendor documents it; **iwer** = IWER 2.5.0's Quest 3 profile models it
(useful for tests, but it is not proof of the device); **probe** = unknown, the sandbox must
detect it at session start and log the answer.

| Capability                                                       | Meta Quest 3, Quest Browser                                                                                                                                                                                                                      | Samsung Galaxy XR, Chrome on Android XR                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SoC, display                                                     | Snapdragon XR2 Gen 2; 2064 x 2208 per eye LCD                                                                                                                                                                                                    | Snapdragon XR2+ Gen 2; 3552 x 3840 per eye micro-OLED (about 2.9x Quest 3's pixels, so fill rate is the risk)                                                                                                                                                                                                                            |
| Refresh rates                                                    | 72, 80, 90, 120 Hz (iwer `supportedFrameRates`, Meta forum). Meta's frame-rate page says WebXR defaults to 72 Hz on Quest headsets other than Quest 2 (90); IWER models a nominal 90. **probe** the real default                                 | 60, 72 (default), 90 Hz (Samsung). WebXR frame-rate API: **probe**                                                                                                                                                                                                                                                                       |
| `session.supportedFrameRates` / `updateTargetFrameRate`          | doc (Browser 16.4+). Babylon: `sessionManager.supportedFrameRates`, `currentFrameRate`, `updateTargetFrameRate(rate)`                                                                                                                            | not documented; **probe**                                                                                                                                                                                                                                                                                                                |
| Hands (`hand-tracking`, 25 joints)                               | doc. Pinch gives `select`. A hand's `targetRaySpace` is the system's emulated pointing ray, the one Horizon Home uses                                                                                                                            | doc: "Hand input is the primary interaction mechanism"; the Hand Input API is the default input                                                                                                                                                                                                                                          |
| Controllers                                                      | Touch Plus. Hands and controllers together (multimodal) since Browser 31.4                                                                                                                                                                       | Galaxy XR controllers report profiles `["samsung-galaxyxr", "oculus-touch", ...]` with 6 buttons and 4 axes, fewer than their own profile lists. That crashed Meta's IWSDK (issue #54). Babylon's component update guards a missing button, and with the offline controller classes Babylon builds an `oculus-touch` controller for them |
| Thumb microgestures (swipe left, right, forward, backward; tap)  | doc, Browser 38.1+, through the `oculus-hand` profile. Babylon 8.56.2 ships `WebXROculusHandController` with these components                                                                                                                    | none documented                                                                                                                                                                                                                                                                                                                          |
| OS-reserved hand gestures                                        | Palm toward the face at eye level, then pinch. Left = menu, which **leaves the WebXR session**; right = Meta button. Cannot be disabled                                                                                                          | Palm forward until the nav icons appear, then pinch Back, Home or Recents                                                                                                                                                                                                                                                                |
| WebXR Layers (projection, quad, cylinder; media layers)          | doc (default since Browser 16.1)                                                                                                                                                                                                                 | Not in Android's list. Chrome ships XRWebGLBinding; projection layers were behind a flag as of Chrome 138. **probe**                                                                                                                                                                                                                     |
| Multiview                                                        | Through Layers (`OCULUS_multiview`, which gives MSAA). Babylon: `enableFeature(WebXRFeatureName.LAYERS, "latest", { preferMultiviewOnInit: true })`                                                                                              | **probe**                                                                                                                                                                                                                                                                                                                                |
| Fixed foveation                                                  | doc. `XRWebGLLayer.fixedFoveation` takes 0 to 1, continuous since Browser 36. Requesting `low-` / `medium-` / `high-fixed-foveation-level` at session start also works. Babylon: `sessionManager.fixedFoveation` and `isFixedFoveationSupported` | not documented; **probe** `isFixedFoveationSupported`                                                                                                                                                                                                                                                                                    |
| Application Space Warp                                           | doc (Browser 26.2+). Babylon `WebXRSpaceWarp`                                                                                                                                                                                                    | **probe**                                                                                                                                                                                                                                                                                                                                |
| Depth sensing, hit test, anchors, planes, meshes, AR passthrough | yes (iwer: depth-sensing, plane-detection, mesh-detection, hit-test, anchors)                                                                                                                                                                    | doc: AR module, hit test, anchors, depth (stereo depth maps), light estimation                                                                                                                                                                                                                                                           |
| Eye tracking or gaze in WebXR                                    | no (Quest 3 has no eye tracker)                                                                                                                                                                                                                  | not exposed per Android's list; **probe** profiles for `transient-pointer`                                                                                                                                                                                                                                                               |
| System keyboard in an immersive session                          | doc: `session.isSystemKeyboardSupported`. Focusing a DOM `<input>` shows it. Each showing starts a new edit (the first key press overwrites the whole value), and the page gets no key events                                                    | **probe**                                                                                                                                                                                                                                                                                                                                |
| Web Speech recognition                                           | Not supported (no `SpeechRecognition` in Quest Browser)                                                                                                                                                                                          | Chrome on Android has `webkitSpeechRecognition` (cloud). Inside an immersive session on Android XR: **probe**                                                                                                                                                                                                                            |
| Microphone                                                       | `getUserMedia` works in-session **only if permission was granted before entering XR** (the prompt cannot show in immersive mode)                                                                                                                 | same rule assumed; **probe**                                                                                                                                                                                                                                                                                                             |
| DOM overlay                                                      | AR-on-phone only, so not available in a VR headset session; all UI must be in the scene                                                                                                                                                          | same                                                                                                                                                                                                                                                                                                                                     |

### The capability probe

At session start the sandbox should log one record to the remote logger:

- user agent and Babylon version
- `session.enabledFeatures` and the granted reference space type
- `supportedFrameRates` and `frameRate`
- `isFixedFoveationSupported` and `fixedFoveation`
- `isSystemKeyboardSupported`
- whether `XRWebGLBinding` / layers are present and multiview is in use (`engine.getCaps().multiview`, `oculusMultiview`)
- every input source's `profiles`, `handedness`, `targetRayMode`, and gamepad button and axis counts
- `navigator.gpu` present
- `SpeechRecognition` / `webkitSpeechRecognition` present, and microphone permission state

That one record answers every **probe** cell above the first time the owner opens the page on each
headset.

## 3. Picking a reference space

- graphty-element asks for `local-floor`, then falls back to `local`, never silently to `viewer`.
  A `viewer` space would head-lock the whole scene, which is the worst possible "jitter". Copy its
  fallback logic (`referenceSpaceFallbacks`, `XRSessionManager.enterSession`).
- The playground is meant for long seated use, so offer `local` (seated, origin at the head at
  start) as a toggle next to `local-floor`.
- Babylon does not listen for `XRReferenceSpace` `reset` (the user re-centers by holding the Meta
  or Home button). The sandbox should listen, re-place world-locked panels, and log it.
- Ask only for the features you use. Requesting plane, mesh or anchor detection on Quest can
  raise a spatial-data permission prompt (unverified; it costs nothing to avoid).

## 4. What causes jittery images in Babylon WebXR, and how to avoid each

Each cause below gives the mechanism, the fix, and how the dry run (section 7) detects it.

1. **Missed frames (the main one).**
    - Mechanism: a frame that takes longer than its budget (13.9 ms at 72 Hz, 11.1 ms at 90 Hz,
      8.3 ms at 120 Hz) is not shown. The compositor reprojects the old frame for the head pose, so
      anything moving relative to the head (hand-held objects, rays, animating layout) judders or
      doubles. Asking for 120 Hz without the headroom for it makes this worse.
    - Fix:
        - Start at 72 Hz.
        - Raise the rate with `updateTargetFrameRate` only while the measured frame time leaves
          about 30% headroom, and lower it again on sustained misses. This is Meta's advice.
        - Keep per-frame JavaScript small: no layout iterations, no algorithms and no allocation on
          the main thread during XR. Layout and algorithms run before entering XR or in a worker.
    - Detect: log the XR frame deltas (the `time` argument of the session's
      `requestAnimationFrame`) as p50, p95 and max, plus a count of deltas above 1.5x the nominal
      period, every 2 s to the remote logger. On Quest, OVR Metrics Tool's "stale frames" counter
      is the ground truth.
2. **Stale world matrices when the camera's parent moves.**
    - Mechanism: in 8.56.2, `WebXRCamera`, `WebXRInputSource.updateFromXRFrame` and
      `WebXRHandTracking` parent the rig cameras, pointers, grips and joint meshes to
      `xrCamera.parent` every frame. Babylon caches a node's world matrix for the render id, and a
      parent moving does not mark the child dirty. A NullEngine check
      (`scripts/stale-matrix-check.mjs`) moved a parent after reading a child
      in the same frame: `getAbsolutePosition()` returned 2 where 12 was correct.
    - Fix:
        - Do not drive the camera's parent from input. Grab, turn and scale a graph root
          `TransformNode` instead.
        - Do hand math in reference-space coordinates: the local `.position` and
          `.rotationQuaternion` of grips, pointers and joint meshes, which Babylon sets each frame.
        - When a world position is needed after moving anything, call `computeWorldMatrix(true)`.
    - Detect: an IWER test holds the controllers still, runs grab-and-turn and two-hand scale, and
      asserts that the graph root's transform does not change frame to frame.
3. **Feedback loops in two-hand scale.**
    - Mechanism: if the scale is computed from hand positions measured in a space the scale itself
      changes (hands parented under a scaled pivot, read as world positions), the scale feeds back
      and oscillates.
    - Fix: measure the distance between the hands in reference space. Apply the ratio to the
      graph root about the midpoint between the hands.
    - Detect: the same still-hands test.
4. **One-frame-late attachment.**
    - Mechanism: Babylon updates input in `onXRFrameObservable`, then calls `scene.render()`, which
      fires `onBeforeRenderObservable`. Code reading poses in either is current-frame, unless it
      reads a node whose matrix was cached earlier in the frame (cause 2) or reads poses from DOM
      events (`selectstart` handlers fire outside the frame loop).
    - Fix: place held objects by parenting them to the grip or pointer node, or set them in
      `onBeforeRender` from local poses. Never take a pose from an event.
5. **Hand-ray and joint noise.**
    - Mechanism: hand-tracking rays wobble a fraction of a degree at rest. At 2 m that is a few
      centimeters, larger than a node, so the hover target flickers.
    - Fix:
        - Filter the ray with a One Euro filter: steady at rest, little lag when moving. It is better
          than SixDofDragBehavior's fixed `dragDeltaRatio = 0.2` exponential lag.
        - Add hysteresis to the hover target (keep the current target until another one is clearly
          better).
        - graphty-element already uses an 8 cm drag threshold and PRISM-style velocity gain
          (`XRInputHandler`). Reuse those ideas, not the class.
    - Detect: an IWER test feeds a seeded noisy pose and counts hover-target changes per second.
6. **Shimmer, crawling edges and text.**
    - Mechanism: thin lines and small text alias. Foveation lowers resolution in the periphery,
      which is most visible on high-contrast text and lines. Post-processes, glow layers and
      highlight layers render to intermediate targets, which lose MSAA and foveation.
      HighlightLayer was reported not to render with WebXRLayers on Quest 3.
    - Fix:
        - Keep Babylon's XR default `antialias: true` on the XR layer
          (`WebXRManagedOutputCanvasOptions.GetDefaults`).
        - No post-process, GlowLayer or HighlightLayer in XR. Show hover and selection by color or
          scale on the thin instance.
        - Foveation at 0 to 0.3 by default, as a toggle.
        - Text as MSDF (`@babylonjs/addons` `TextRenderer`) or GUI textures with mipmaps.
7. **Multiview and GUI flicker on Quest 3.**
    - Mechanism: with WebXRLayers multiview on Quest 3, Babylon GUI elements make the whole scene
      flicker. The cause is switching render targets mid-session under the `oculus_multiview`
      extension. It was still open on 2026-02-23. The only workaround,
      `engine.getCaps().oculusMultiview = null`, loses MSAA.
    - Fix: multiview **off** by default, as a toggle to measure. A graph drawn with thin instances
      has few draw calls, so multiview gains little anyway; staff and users on the forum saw no FPS
      change in simple scenes.
8. **Clip planes and depth precision.**
    - Mechanism: the XR camera defaults to `minZ = 0.1` and `maxZ` 10,000. A wrist menu or a held
      copy closer than 10 cm gets clipped, and the 1:100,000 depth ratio z-fights far edges.
    - Fix: set `minZ` to 0.05 and `maxZ` to 100 (Babylon re-sends `depthNear` / `depthFar` when
      they change).
9. **Garbage collection pauses.**
    - Mechanism: per-frame `clone()` and `new Vector3` calls trigger minor GCs that cost
      milliseconds on Quest's CPU. graphty-element's `XRInputHandler` clones several vectors every
      frame.
    - Fix: preallocate, and use `TmpVectors`.
    - Detect: count frames above budget during a scripted 30 s IWER run with hands moving.
10. **Shader compiles mid-session.**
    - Mechanism: the first use of a material inside XR compiles a shader and drops frames.
    - Fix: build every material, and the GUI, before entering XR (`forceCompilationAsync`).
      Never create materials per node.
11. **Physics or collision on the camera** jitters children of the XR camera (Babylon forum).
    Do not enable either on the camera.
12. **Large coordinates.** Float32 precision is fine for layout coordinates in the hundreds. If a
    layout produces coordinates of 10^4 or more, normalize them into the graph root's scale
    rather than turning on Babylon's `useLargeWorldRendering`.

## 5. Holding 72 to 120 Hz with 1,000 to 10,000 nodes

Budget: Meta's native targets for Quest 3 are 200 to 300 draw calls for a busy app, 700 to 1,000
for a light one. Browser-side forum experience is about 150 draw calls and a few hundred thousand
triangles. Galaxy XR has about 2.9 times the pixels, so it is fill-rate bound: keep fragment
shaders cheap and test the framebuffer scale there.

| Part                     | Recommendation                                                                                                                                                                                                                                                                                                       | Cost at 10,000 nodes and about 30,000 edges |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Layout                   | Compute once before entering XR with `@graphty/layout` (or `@graphty/graph-samples`' seeded generators plus a layout). No live layout in XR; if one is ever needed, run it in a worker                                                                                                                               | 0 per frame                                 |
| Nodes                    | One low-poly mesh (an icosahedron, 20 triangles) with thin instances. Set the matrix buffer once with `thinInstanceSetBuffer("matrix", ...)`. Color by a per-instance color buffer. Call `thinInstanceBufferUpdated` only when something changes (graphty-element's own notes: `thinInstanceSetMatrixAt` re-uploads) | 1 draw call per eye, 200k triangles         |
| Edges                    | One thin-instanced unit quad or cylinder per edge (graphty-element's `EdgeLineBatch` does exactly this), or one `LineSystem` (1 px lines, which alias). Avoid `GreasedLine` instance mode for tens of thousands of lines: building it is O(n^2) per the forum                                                        | 1 to 2 draw calls                           |
| Labels                   | Never 10,000. Show the hover tag, the selection and the K nearest only, with MSDF `TextRenderer` (instanced, one draw) or a small pool of GUI planes. Verify that `TextRenderer` draws in both XR eyes before relying on it                                                                                          | about 1 to 3 draw calls                     |
| Picking                  | `isPickable = false` on the graph meshes, so Babylon's pointer selection and near interaction skip them. A ray-versus-sphere loop over the position `Float32Array`, filtered by One Euro, once per hand per frame. The forum reports thin-instance picking walking every face of every instance, so do not use it    | about 0.1 ms per ray                        |
| Scene                    | `scene.freezeActiveMeshes()` after the graph is built (unfreeze on structural change); `material.freeze()`; `scene.skipPointerMovePicking = true`; no shadows, no post-processes, no glow or highlight layers; `alwaysSelectAsActiveMesh` on the batch meshes                                                        | n/a                                         |
| Babylon XR features      | Keep pointer selection for GUI 3D only, with a `raySelectionPredicate` that accepts UI meshes alone. Near interaction stays on for GUI 3D; its predicate already requires `isNearPickable` / `isNearGrabbable`                                                                                                       | n/a                                         |
| Foveation and resolution | Foveation 0.3 default (toggle 0 to 1). `framebufferScaleFactor` 1.0 on Quest; measure 0.8 on Galaxy XR                                                                                                                                                                                                               | n/a                                         |
| Frame rate               | Start at 72 Hz. Offer 90 and 120 Hz as toggles; adapt automatically on sustained misses                                                                                                                                                                                                                              | n/a                                         |

graphty-element as the renderer: it draws one `InstancedMesh` per node. At 10,000 nodes that makes
Babylon's per-frame pointer and near picking scan 10,000 meshes per controller, and its live
layout runs on the main thread. Its 10,000-node load took 10 s after PR #404, measured on a desktop.
If the sandbox embeds graphty-element, set its graph meshes unpickable, stop its layout before
entering XR, and turn its own XR input off (`xr.input` config). Otherwise draw the sandbox's graph
directly with thin instances as above. That is the design's call. This research only marks the
risk.

## 6. How the repository already does WebXR

| File                                                                                                              | What it does                                                                                                                                                                                                                                                                                                       | Use in the sandbox                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graphty-element/src/xr/XRSessionManager.ts` (412 lines)                                                          | Creates `WebXRDefaultExperience` with `OFFLINE_XR_OPTIONS`: no controller-profile download, no controller models, joint spheres instead of glTF hands, and the near-interaction orb material bundled as JSON. Tries reference spaces in order and records which one was granted. Handles a session the device ends | **Copy the offline options and the reference-space fallback.** The sandbox needs the same offline behavior: the LAN dev server may not reach the CDN, and a headset must not stall on a download. Rigged hand meshes need `@babylonjs/loaders` and bundled glTF files; joint spheres are enough to start (note to fix later: rigged hands for gesture feedback) |
| `graphty-element/src/cameras/XRPivotCameraController.ts`                                                          | Parents the XR camera to a pivot `TransformNode` and moves the world by moving the pivot. Also re-parents meshes whose name contains "hand"                                                                                                                                                                        | **Do not copy the camera-parent model** (section 4, causes 2 and 3). Babylon 8.56.2 already parents hands to `camera.parent` itself (PR #16969), so the name-matching re-parent is redundant and can catch unrelated meshes                                                                                                                                     |
| `graphty-element/src/cameras/XRInputHandler.ts` (1,013 lines)                                                     | Thumbsticks (yaw, pitch, pan, zoom), two-hand pinch zoom and rotate, node drag with an 8 cm threshold, PRISM velocity gain (5x to 20x), and EMA smoothing of 0.7. Reads poses as local `.position`, which is correct                                                                                               | Reuse the numbers and ideas (the drag threshold and the PRISM thresholds); not the class, which is bound to the pivot and allocates per frame                                                                                                                                                                                                                   |
| `graphty-element/src/cameras/InputUtils.ts`                                                                       | `isPinching`, `pinchStrength`, `thumbstickDeltas`, `twoHandGestureDelta`, `applyDeadzone`: pure functions                                                                                                                                                                                                          | Import or copy as-is                                                                                                                                                                                                                                                                                                                                            |
| `graphty-element/src/ui/XRUIManager.ts`                                                                           | DOM VR and AR enter buttons                                                                                                                                                                                                                                                                                        | The sandbox needs its own enter page anyway, since the microphone permission must be asked before entering XR                                                                                                                                                                                                                                                   |
| `graphty-element/test/interactions/helpers/iwer-setup.ts`, `test/browser/xr-session.test.ts`, vitest project `xr` | `installIWER` forces IWER's `metaQuest3` over Chromium's native `navigator.xr` and records sessions and frames. The tests block every foreign request and assert that sessions render more than 10 XR frames, with hands tracked and drawn                                                                         | **The dry-run base.** Same install, but as a URL switch (`?emulate=quest3`) on the sandbox page, driven by a Playwright script                                                                                                                                                                                                                                  |
| `graphty-element/src/logging/sinks/RemoteSink.ts`, `.storybook/preview.ts`                                        | The element's logger sends to `@graphty/remote-logger`; Storybook adds `initConsoleCaptureUI`                                                                                                                                                                                                                      | Reuse `RemoteLogClient` and the console capture (section 8)                                                                                                                                                                                                                                                                                                     |
| `design/xr/*.md`                                                                                                  | 15 earlier XR design documents and 46 prototype write-ups (`xr-prototype-studio.md`). Their open risks are "jitter of the palm plane with hands alone" and "whole-graph lens previews threaten frame rate"                                                                                                         | The sandbox is where those risks get measured                                                                                                                                                                                                                                                                                                                   |

## 7. Dry run with IWER (what it can and cannot catch)

IWER 2.5.0 (MIT, Meta, published 2026-09-24) gives the sandbox everything a dry run needs to drive:

- headset profiles with frame-rate lists (`metaQuest3`: 72, 80, 90, 120)
- controllers (Touch Plus) and hands with poses `relaxed`, `pinch` and `point`; custom poses can
  be added, so handy-work `.handpose` files or captured poses can be fed in to test gesture
  recognition
- `primaryInputMode` to switch between hands and controllers
- `RemoteControlInterface` for scripted actions, and `ActionRecorder` / `ActionPlayer` for
  replaying an input sequence
- `@iwer/devui`: an on-page panel to drive the headset by mouse, so the owner can try a preset on a
  desktop
- `@iwer/sem`: synthetic rooms for AR

What a headless dry run catches:

- exceptions
- a session that renders nothing
- NaN poses
- dead input mappings (each technique's toggle reachable by hand and by controller)
- one-frame lag (set a controller pose, then assert that the attached object's world matrix
  matches on the next XR frame)
- feedback oscillation (the still-hands test)
- runaway allocation
- per-frame CPU time of the technique code (time the observers themselves)

What it cannot catch:

- real frame pacing, because IWER paces frames from `window.requestAnimationFrame` and reports
  whatever rate it is told
- Layers, multiview and foveation (IWER has no `fixedFoveation` and no layers)
- the OS-reserved gestures
- real tracking noise (feed seeded noise instead)
- Galaxy XR specifics

Those need the on-device remote-logger metrics from section 4, cause 1.

## 8. Remote logging from the headsets

- **Client:** `RemoteLogClient` from `@graphty/remote-logger` (batches every 100 ms, retries, and
  has per-pattern throttling for per-frame messages), plus `initConsoleCaptureUI` from
  `@graphty/remote-logger/ui`. The `remoteLoggerPlugin()` from `@graphty/remote-logger/vite`
  stamps the worktree name on every entry.
- **Transport:**
    - The page is HTTPS on the LAN, so the log server must be HTTPS too, and the headset must trust
      its certificate.
    - Simplest: proxy the log server through the sandbox's own Vite server (`server.proxy` on a path
      such as `/log`). That makes logging same-origin: one certificate, no CORS, no second port.
    - If the headset does not trust servherd's certificate, `adb reverse tcp:<port> tcp:<port>` over
      USB makes `http://localhost:<port>` a secure context on both Quest and Android XR.
- **What to log:**
    - the capability probe at session start
    - frame pacing every 2 s
    - every technique toggle
    - every input-source change, with profiles
    - reference-space resets
    - session end and its cause
    - uncaught errors and rejected promises
- **This session:** the remote-logger MCP server failed to connect. Logs still reach the server and
  its JSONL files; only the MCP query tools are unavailable until it reconnects.

## 9. Candidates

| Candidate                                                                                                                                                          | What it does                                                                                                          | License      | Maintenance                                                         | Covers                                                                    | We would add or fix                                                                                                                                                                | Link                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| IWER (`iwer`)                                                                                                                                                      | WebXR runtime emulator: Quest 1/2/3/Pro profiles, controllers, hands with poses, recording and replay, remote control | MIT          | Meta; 2.5.0 on 2026-09-24; already a graphty-element dev dependency | The whole dry run; emulated Quest 3                                       | No Galaxy XR profile (write one from the Galaxy XR controller facts: 6 buttons, 4 axes, `samsung-galaxyxr` then `oculus-touch`); no layers or foveation; frame pacing is not real  | https://github.com/meta-quest/immersive-web-emulation-runtime                                                 |
| `@iwer/devui`                                                                                                                                                      | On-page panel to drive IWER by mouse and keyboard                                                                     | MIT          | Meta, same release train                                            | Desktop try-out of each preset                                            | Nothing to start                                                                                                                                                                   | https://www.npmjs.com/package/@iwer/devui                                                                     |
| Immersive Web Emulator (browser extension)                                                                                                                         | IWER packaged as a Chrome extension                                                                                   | MIT          | Meta                                                                | Owner tries pages on a desktop without code changes                       | n/a                                                                                                                                                                                | https://github.com/meta-quest/immersive-web-emulator                                                          |
| Babylon `WebXRSessionManager` frame rate and foveation                                                                                                             | `supportedFrameRates`, `currentFrameRate`, `updateTargetFrameRate`, `isFixedFoveationSupported`, `fixedFoveation`     | Apache-2.0   | Babylon 8.56.2 installed (9.30.0 latest)                            | Frame-rate and foveation toggles; adaptive rate                           | A small controller that adapts the rate from measured frame time                                                                                                                   | https://doc.babylonjs.com/features/featuresDeepDive/webXR/webXRSessionManagers                                |
| Babylon `WebXRLayers` (`preferMultiviewOnInit`)                                                                                                                    | Projection layer, optional multiview, quad layers                                                                     | Apache-2.0   | Babylon core; Quest 3 GUI flicker bug open (2026-02)                | Multiview toggle; crisp quad-layer panels later                           | Keep it off by default; measure                                                                                                                                                    | https://forum.babylonjs.com/t/gui-elements-cause-flickering-on-meta-quest-3-with-webxr-multiview-layers/58169 |
| Babylon `WebXRSpaceWarp`                                                                                                                                           | Application Space Warp (half-rate render plus motion vectors)                                                         | Apache-2.0   | Babylon core; Quest Browser 26.2+                                   | An experimental toggle                                                    | Likely smearing on thin lines and text; Quest only; last on the list                                                                                                               | https://github.com/BabylonJS/Babylon.js/pull/13955                                                            |
| Babylon `WebXRHandTracking` and `WebXROculusHandController`                                                                                                        | 25-joint hands; `oculus-hand` microgestures (swipes and thumb tap, left `menu`)                                       | Apache-2.0   | Babylon core 8.56.2 includes both                                   | Hands; the microgesture technique on Quest                                | Rigged hand meshes need `@babylonjs/loaders` and bundled glTF (graphty-element ships joint spheres); no gesture library                                                            | https://forum.babylonjs.com/t/hand-tracking-microgestures/60860                                               |
| Babylon `WebXRNearInteraction`, `WebXRControllerPointerSelection`                                                                                                  | Poke, grab and ray select of meshes and GUI 3D                                                                        | Apache-2.0   | Babylon core                                                        | All GUI 3D interaction                                                    | Restrict to UI meshes with predicates; the per-frame pick cost otherwise scales with the scene                                                                                     | https://doc.babylonjs.com/features/featuresDeepDive/webXR/WebXRSelectedFeatures                               |
| Babylon behaviors: `SixDofDragBehavior` (`allowMultiPointer`), `MultiPointerScaleBehavior`, `HandConstraintBehavior`, `FollowBehavior`, `SurfaceMagnetismBehavior` | Grab and move, two-pointer scale, hand-anchored panels, lazy-follow panels                                            | Apache-2.0   | Babylon core                                                        | Grab-and-turn of panels; wrist and palm menus; follow toolbars            | `dragDeltaRatio` lag is not a jitter filter (use One Euro); HandConstraint's palm-up visibility collides with the OS palm pinch (show the menu but take input from the other hand) | https://doc.babylonjs.com/features/featuresDeepDive/behaviors/meshBehaviors                                   |
| Babylon thin instances, `freezeActiveMeshes`, `ScenePerformancePriority`                                                                                           | One-draw-call nodes and edges; frozen selection                                                                       | Apache-2.0   | Babylon core                                                        | 10,000-node rendering                                                     | Our own ray-versus-sphere picking (thin-instance picking is slow)                                                                                                                  | https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances                                 |
| `@babylonjs/addons` `TextRenderer` (MSDF)                                                                                                                          | Instanced, GPU text; billboards                                                                                       | Apache-2.0   | Babylon; 8.56.2 published                                           | Hover tags, hint tags, readouts                                           | Verify drawing in both XR eyes (it renders with a view and projection we pass); an MSDF font asset to bundle                                                                       | https://doc.babylonjs.com/addons/msdfText/                                                                    |
| `@babylonjs/gui` 3D (NearMenu, HandMenu, HolographicSlate, TouchHolographicButton, Slider3D) and 2D `VirtualKeyboard` on a mesh texture                            | MRTK-style 3D controls; an on-screen keyboard                                                                         | Apache-2.0   | Babylon; 8.56.2 matches core                                        | Menus, palette faces, inspector, in-scene keyboard                        | No layer list or popover components; `AdvancedDynamicTexture` panels redraw a canvas and upload on change, so keep them small and change-driven                                    | https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D                                                 |
| Quest system keyboard (`isSystemKeyboardSupported`)                                                                                                                | OS keyboard over an immersive session, by focusing a DOM input                                                        | Platform     | Quest Browser                                                       | The text-entry technique on Quest with no keyboard code                   | Each showing overwrites the field; no key events; Galaxy XR unknown                                                                                                                | https://developers.meta.com/horizon/documentation/web/webxr-keyboard/                                         |
| Web Speech API (`webkitSpeechRecognition`)                                                                                                                         | Cloud speech-to-text in Chrome                                                                                        | Platform     | Chrome on Android only                                              | Voice on Galaxy XR, if it works in-session                                | Absent on Quest: there, record with `MediaRecorder` and send the audio to a speech-to-text endpoint on the dev server (a local Whisper). Ask for the microphone before entering XR | https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API                                               |
| `1eurofilter`                                                                                                                                                      | One Euro filter (Casiez, Roussel, Vogel, CHI 2012)                                                                    | BSD-3-Clause | 1.3.0, 2026-02, the author's own repository                         | Ray and hover stabilization; jittery hand dragging                        | Apply it to the ray origin and direction (or yaw and pitch), not to a quaternion directly                                                                                          | https://github.com/casiez/OneEuroFilter                                                                       |
| `handy-work`                                                                                                                                                       | Framework-agnostic hand-pose matching in a Web Worker from raw `XRFrame` and `XRInputSource`                          | MIT          | 3.1.13, 2025-12                                                     | Static hand poses (fist, point, custom poses recorded with `dumpHands()`) | Motions (swipes, pulls) are not covered; poses must be recorded per user                                                                                                           | https://github.com/AdaRoseCannon/handy-work                                                                   |
| `handy.js`                                                                                                                                                         | Hand-pose library with 100+ poses, including the ASL alphabet                                                         | MIT          | Unmaintained per its author; three.js-based                         | Pose vocabulary and data                                                  | Port off three.js; prefer handy-work                                                                                                                                               | https://github.com/stewdio/handy.js/                                                                          |
| `@graphty/remote-logger`                                                                                                                                           | Browser logs to a server, a JSONL file and MCP                                                                        | in-repo      | in-repo                                                             | Debugging on the headsets                                                 | A same-origin proxy route in the sandbox's Vite config                                                                                                                             | `remote-logger/README.md`                                                                                     |
| OVR Metrics Tool                                                                                                                                                   | In-headset HUD: FPS, stale frames, CPU and GPU levels                                                                 | Meta, free   | Meta                                                                | Ground-truth frame pacing on Quest                                        | n/a                                                                                                                                                                                | https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/                                    |
| Meta IWSDK (`@iwsdk/core`)                                                                                                                                         | A full WebXR SDK (ECS, grab, locomotion, UI)                                                                          | MIT          | Meta, 1.0.1 (2026-10-01)                                            | Ideas only                                                                | three.js-based; does not fit Babylon. Its Galaxy XR controller crash (issue #54) is a useful warning                                                                               | https://github.com/facebook/immersive-web-sdk                                                                 |

## 10. To verify on the devices (the probe answers most of these)

1. The real default frame rate on Quest 3 (72 or 90), and whether 120 needs the headset's
   120 Hz setting.
2. Galaxy XR's `supportedFrameRates`, `isFixedFoveationSupported`, layers, multiview, system
   keyboard, `webkitSpeechRecognition` inside an immersive session, and the hand
   `targetRayMode` and profiles.
3. Whether Galaxy XR controllers map through Babylon's `oculus-touch` class with the right
   buttons (thumbstick and trigger at least), given their 6 buttons.
4. Frame pacing of the 10,000-node preset at 72 and 90 Hz on each headset, with and without
   multiview and foveation.
5. Whether the headsets trust servherd's certificate on the LAN hostname (otherwise use
   `adb reverse`).

## Sources

- Meta, WebXR frame rate control: https://developers.meta.com/horizon/documentation/web/webxr-frames/
- Meta, WebXR performance workflow: https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/
- Meta, WebXR fixed foveated rendering: https://developers.meta.com/vr/documentation/web/webxr-ffr/
- Meta, WebXR Layers: https://developers.meta.com/vr/documentation/web/webxr-layers/
- Meta, WebXR hands (palm pinch, hand target ray): https://developers.meta.com/vr/documentation/web/webxr-hands/
- Meta, system keyboard in WebXR: https://developers.meta.com/horizon/documentation/web/webxr-keyboard/
- Meta, native performance targets (draw calls): https://developers.meta.com/vr/documentation/unity/unity-perf/
- Meta Quest Browser release history: https://en.wikipedia.org/wiki/Meta_Quest_Browser
- Android XR, develop for the web: https://developer.android.com/develop/xr/web
- Samsung, Galaxy XR navigation (reserved gestures): https://www.samsung.com/us/support/answer/ANS10007517/
- Galaxy XR controller profile and button counts: https://github.com/facebook/immersive-web-sdk/issues/54
- Chrome XRWebGLBinding intent to ship: https://groups.google.com/a/chromium.org/g/blink-dev/c/6J0yfRuMmSU/m/hivfjghUAQAJ
- Babylon forum, child of XR camera shakes: https://forum.babylonjs.com/t/child-object-of-xr-camera-shake-in-some-cases/42043
- Babylon forum, hands ignore camera parent (fixed in PR 16969): https://forum.babylonjs.com/t/webxr-hand-tracking-hands-arent-positioned-correctly-when-xrcamera-is-parented-to-a-mesh-transformnode/59881
- Babylon forum, multiview GUI flicker on Quest 3: https://forum.babylonjs.com/t/gui-elements-cause-flickering-on-meta-quest-3-with-webxr-multiview-layers/58169
- Babylon forum, multiview on Quest 3 in 2024: https://forum.babylonjs.com/t/multiview-in-webxr-using-quest-3-in-2024/48191
- Babylon forum, WebXR optimization: https://forum.babylonjs.com/t/webxr-optimization/29315
- Babylon forum, WebXR VR performance tips (pointer and near picking cost): https://forum.babylonjs.com/t/need-tips-on-performance-improvements-in-webxr-vr/63271
- Babylon forum, thin-instance picking performance: https://forum.babylonjs.com/t/thininstances-picking-performance-on-spheres/30752
- Babylon forum, GreasedLine performance: https://forum.babylonjs.com/t/greasedlines-rendering-performances/59495
- Babylon forum, microgestures: https://forum.babylonjs.com/t/hand-tracking-microgestures/60860
- Babylon Space Warp PR: https://github.com/BabylonJS/Babylon.js/pull/13955
- Babylon MSDF text: https://doc.babylonjs.com/addons/msdfText/
- Babylon forum, Quest microphone in WebXR: https://forum.babylonjs.com/t/using-meta-quest-2-microphone-inside-of-webxr-game/38321
- One Euro filter: https://gery.casiez.net/1euro/ and https://github.com/casiez/OneEuroFilter
- handy-work: https://github.com/AdaRoseCannon/handy-work ; handy.js: https://github.com/stewdio/handy.js/
- IWER: https://github.com/meta-quest/immersive-web-emulation-runtime
- Local evidence: Babylon 8.56.2 source (`XR/webXRCamera.js`, `XR/webXRInputSource.js`,
  `XR/features/WebXRHandTracking.js`, `XR/features/WebXRNearInteraction.js`,
  `XR/webXRManagedOutputCanvas.js`, `Meshes/transformNode.js`); IWER 2.5.0
  `lib/device/configs/headset/meta.js`; `scripts/stale-matrix-check.mjs`.
