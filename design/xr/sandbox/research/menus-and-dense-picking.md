# Research 3: menus and selection in VR -- what to reuse

Version note added when this survey was filed: the sandbox worktree installs `@babylonjs/core`
8.56.2, not 8.43.0 as written below. Pin `@babylonjs/gui` and `@babylonjs/addons` to 8.56.2.

Scope: marking and pie menus for XR, the Tilt Brush / Open Brush palette, node context menus,
hint tags at constant angular size, slab / slicing-plane selection, and dense 3D picking with
published code. For every candidate: what it does, license, maintenance, how much of our
technique it covers, what we would add or fix, and a link.

Code that was actually read (shallow clones under `tmp/xr-sandbox/research-3-src/`):
Open Brush `Assets/Scripts/GUI/PanelManager.cs` and `PinCushion.cs`; Kando
`src/menu-renderer/input-methods/gesture-detector.ts`; the `marking-menu` npm package's
`dist/marking-menu.d.ts` and README; pangmenu `README.md` and `ring-menu.js`; RayCursor
`Assets/RayCursor/Scripts/RayCursor.cs`; vr_selection `FlowerCone/ConeVolumeHighlighter.cs` and
`Circular_MiniMap_Selection/ClutterHandler_circumferenceDisplay.cs`; MeTACAST's file list;
`@babylonjs/gui@8.43.0` declarations (`3D/controls/*`, `3D/gizmos/*`,
`2D/controls/virtualKeyboard.d.ts`); `@babylonjs/core@8.43.0` (`handConstraintBehavior.js`,
`webXROculusHandController.js`, `Materials/material.d.ts`); `@babylonjs/addons@8.43.0`
`msdfText/textRenderer.d.ts`; Vimium's `link_hints.js` (`hintStrings`).

Version note: the repository pins `@babylonjs/core` 8.43.0. `@babylonjs/gui` and
`@babylonjs/addons` must be installed at exactly 8.43.0 (both exist on npm). The latest on npm
is 9.30.0, a major ahead, and mixing majors breaks the GUI.

## Summary table

| #   | Candidate                                                                                                                                                                                        | Technique(s) it serves                                                                                    | License                               | Maintained                 | Coverage                                              | Verdict                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| 1   | Open Brush `PanelManager.cs` (palette faces, tear-off, snap back)                                                                                                                                | Palette tool (2)                                                                                          | Apache-2.0                            | Active (commit 2026-10-10) | ~70% of the behavior; 0% of the code runs (Unity C#)  | Port the math (~200 lines TS)                          |
| 2   | Open Brush `PinCushion.cs` (hold-a-button radial tool picker)                                                                                                                                    | Marking menu for node/empty-space menus (3), palette (2)                                                  | Apache-2.0                            | Active                     | ~80% of a one-level controller marking menu           | Port (~120 lines TS)                                   |
| 3   | `@babylonjs/gui` 8.43 GUI3D: NearMenu, HandMenu, TouchHolographicMenu, HolographicSlate + SlateGizmo, Slider3D, panels, VirtualKeyboard                                                          | Figma-like menus (4), wrist/palm menu (12), tear-off cards (2), rectangular node menus (3), keyboard (11) | Apache-2.0                            | Active                     | High for rectangular panels; no radial menu           | Use directly                                           |
| 4   | `@babylonjs/core` 8.43 XR features: near interaction, hand tracking, pointer selection, Quest microgestures (`WebXROculusHandController`), per-material clip planes, drag/follow/scale behaviors | Hands path for menus, slab (9), handling (10)                                                             | Apache-2.0                            | Active                     | Building blocks                                       | Use directly                                           |
| 5   | Kando `gesture-detector.ts`                                                                                                                                                                      | Expert-mode marking (draw without waiting) (3)                                                            | MIT                                   | Very active (2026-10-10)   | ~90% of stroke/corner recognition; pure TS            | Copy the file, retune thresholds for meters            |
| 6   | `marking-menu` npm 1.0.1 (Quentin Roy)                                                                                                                                                           | Marking menu (3)                                                                                          | MIT                                   | Active (1.0 on 2026-09-24) | Full Kurtenbach behavior, but renders to the DOM      | Reference and desktop tests only; cannot draw in WebXR |
| 7   | pangmenu "Ring HUD"                                                                                                                                                                              | Radial menu for a thumbstick (3)                                                                          | No license file (all rights reserved) | Single author, 2026-09     | Design notes only                                     | Read for ideas; do not copy code                       |
| 8   | Wentzel et al., "A Comparison of VR Menu Archetypes" (TVCG 2025)                                                                                                                                 | Choosing menu styles (3, 4)                                                                               | Paper, no code                        | --                         | Evidence                                              | Offer ray, direct and marking menus as toggles         |
| 9   | Vimium `hintStrings` + Babylon MSDF `TextRenderer` (`isBillboardScreenProjected`)                                                                                                                | Hint tags at constant angular size (9)                                                                    | MIT / Apache-2.0                      | Active / active            | ~85% (labels + crisp constant-size text)              | Use; XR per-eye render call must be wired and tested   |
| 10  | RayCursor (LokiResearch, CHI 2019)                                                                                                                                                               | Dense picking: cursor on the ray, nearest target (9)                                                      | MIT                                   | Dormant (2023)             | ~70% of the technique; Unity C#                       | Port (~200 lines TS)                                   |
| 11  | `1eurofilter` npm (Casiez)                                                                                                                                                                       | Anti-jitter for hand rays, cursors, readouts (all)                                                        | BSD-3-Clause                          | Maintained by its author   | 100% of filtering                                     | Use directly                                           |
| 12  | vr_selection (Maslych et al., IEEE VR 2023): Expand, RayKebab, GravityZone, flower cone, disocclusion mini-map                                                                                   | Dense picking (9), node menu on clusters (3)                                                              | MIT                                   | Dormant (2024)             | Ideas + small algorithms; research-grade Unity code   | Lift ideas, rewrite                                    |
| 13  | Slicing-Volume (Montano-Murillo et al., IEEE VR 2020), Slice WIM, LassoGrid                                                                                                                      | Slab / plate (9)                                                                                          | Papers, no code found                 | --                         | Technique definition                                  | Build ourselves (~150 lines) on Babylon clip planes    |
| 14  | SQUAD, Flower Ray, Expand, IntenSelect, AlphaCursor                                                                                                                                              | Dense picking (9)                                                                                         | Papers, no code                       | --                         | Algorithms                                            | Implement the one or two we want (~100 lines each)     |
| 15  | VoiceRay (CHI 2026)                                                                                                                                                                              | Voice + ray disambiguation (8, 9)                                                                         | Paper, no code                        | --                         | Technique                                             | Cheap add-on once voice exists                         |
| 16  | MeTACAST (Zhao et al., VIS 2023)                                                                                                                                                                 | Region selection in dense data (7 sieve, 9)                                                               | MIT                                   | Active (2026-06)           | Context-aware brush; heavy (GPU density)              | Reference only                                         |
| 17  | VRNetzer (menchelab) / 3d-force-graph-vr                                                                                                                                                         | Graph-specific VR menus (3, 4)                                                                            | MIT / MIT                             | Historic / active          | Panel layout ideas; no reusable menu code for Babylon | Reference only                                         |
| 18  | Meta Immersive Web SDK (UIKitML panels)                                                                                                                                                          | Spatial panels (4)                                                                                        | MIT                                   | Active                     | three.js only                                         | Not usable with Babylon; reference                     |

## 1. Open Brush palette (`PanelManager.cs`)

- What it does. The off-hand controller ("wand") carries panels on a ring around its main axis.
  `SetPanelXfFromWand` places each panel at `wand.up * radius`, rotated by
  `originAngle + panel.m_WandAttachAngle` about `wand.forward`, then tilted 90 degrees so the
  panel faces the user. Swiping the touchpad (`UpdateSwipeRotate`) adds to the origin angle,
  keeps a short history of deltas and coasts with velocity and decay after release; on
  thumbstick controllers `UpdateSnapRotate` turns one pane per flick. `UpdateWandPanelsOriginAngle`
  fires a 0.05 haptic tick every 20 degrees. `AttachHeldPanelToWand` is the tear-off and snap back:
  a panel dragged away floats ("fixed panel"); dropped near the wand, it attaches to the nearest
  pane that faces the gaze within `m_WandPaneAttachMaxFacingAngle = 70` degrees, inside a pane's
  half width and height band, with a "sticky" enlargement once it was attached (hysteresis).
- License: Apache-2.0. Maintenance: active (last commit 2026-10-10).
- Coverage of our palette tool: faces, rotation, tear-off cards and snap back all exist as
  behavior; about 70% of the design. None of the code runs in a browser.
- We would add or fix: a TypeScript port of the three functions above against a Babylon
  `TransformNode` parented to the left grip. A hands path: Quest 3 hands can use the
  `swipe-left` / `swipe-right` microgestures (section 4) to turn the faces; Galaxy XR has no
  microgestures, so hands there need a pinch-drag on the palette rim. Panel contents come from
  Babylon GUI (section 3); the "card" a user tears off can be a `HolographicSlate`.
- Link: https://github.com/icosa-foundation/open-brush (Assets/Scripts/GUI/PanelManager.cs).

## 2. Open Brush quick-tool radial menu (`PinCushion.cs`)

- What it does. Hold a button: a ring of items appears at the brush hand, oriented to the
  controller. The selection point is the controller's attach point plus an offset rotated by how
  much the controller has turned since the ring opened (`rotDiff * m_SelectionOffset`), projected
  onto the ring's plane. Inside a center sphere collider means "default item"; otherwise the
  angle from the ring's right vector (made signed with a cross product) picks the item whose
  `[MinAngle, MaxAngle]` contains it. Release commits; animation and a show delay make a quick
  tap not open the ring. So a user steers by tilting the wrist, not by moving the arm.
- License: Apache-2.0. Maintenance: active.
- Coverage: a one-level controller marking menu, about 80%. No hierarchy, no expert-mode
  gesture recognition, no hands path.
- We would add: hierarchy (child ring on a bounded arc at the parent's angle, from pangmenu's
  notes), expert-mode stroke recognition (Kando, section 5), a hands path (pinch to open, then
  the pinch point projected onto the ring plane; or Quest microgesture swipes as four directions).
  This is the best starting point for the node menu and the empty-space menu.
- Link: https://github.com/icosa-foundation/open-brush/blob/main/Assets/Scripts/GUI/PinCushion.cs

## 3. Babylon GUI 3D (`@babylonjs/gui` 8.43.0)

- What it does (verified in the 8.43.0 declarations): `NearMenu` (button grid that follows the
  user with `FollowBehavior`, pin button, drag to pin), `HandMenu` (a `TouchHolographicMenu`
  held by `HandConstraintBehavior`), `TouchHolographicMenu`, `HolographicSlate` with
  `SlateGizmo` (title bar, drag, resize, follow button: a floating card or inspector),
  `Slider3D`, `TouchHolographicButton`, `TouchMeshButton3D`, `CylinderPanel`, `SpherePanel`,
  `PlanePanel`, `ScatterPanel`, `StackPanel3D`. 2D GUI on a mesh via
  `AdvancedDynamicTexture.CreateForMesh`, including `VirtualKeyboard.CreateDefaultLayout()`
  with `connect(inputText)`.
- License: Apache-2.0. Maintenance: active.
- Coverage: high for the Figma-like set (toolbar = NearMenu or a pinned StackPanel3D, layer list
  and inspector = HolographicSlate with 2D GUI content, context popovers = small slates),
  the wrist menu (HandMenu), rectangular node menus, and the in-scene keyboard.
- Gaps and known issues:
    - No radial or marking menu anywhere in the package (searched the forum and npm as well).
    - `HandConstraintBehavior._getHandPose()` reads the wrist and metacarpal joints of a tracked
      hand and returns null otherwise, so `HandMenu` does not follow a controller. For the
      controller path, parent the same menu to the left grip ourselves.
    - `CreateFullscreenUI` does not render in an immersive session (Babylon forum, RaananW); every
      label and panel must be on a mesh. `linkWithMesh` labels do not work in XR.
    - SlateGizmo dragging broke twice on Quest (2022, and again in 2025 on Quest 3, hands and
      controllers); fixed by PR #16195 in 7.50.0. 8.43 includes the fix, but this is the first
      thing to check in the dry run.
- Links: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D ;
  https://forum.babylonjs.com/t/holographicslate-slate-gizmo-seems-to-be-broken-in-oculus-quest-2/34060 ;
  https://forum.babylonjs.com/t/full-screen-ui-in-imersive-vr/40705

## 4. Babylon core XR building blocks (`@babylonjs/core` 8.43.0)

- `WebXRNearInteraction` (poke and grab with fingers or controller tips; works with the GUI3D
  touch buttons), `WebXRHandTracking`, `WebXRControllerPointerSelection`.
- `WebXROculusHandController` maps the Quest `oculus-hand` input profile: components
  `swipe-left`, `swipe-right`, `swipe-forward`, `swipe-backward`, `tap-thumb`, `menu`. These
  are the Quest hand-tracking microgestures (thumb sliding along the index finger), available
  since Quest Browser 38.1; the profile is in the official WebXR input-profiles repository since
  May 2026. This gives hands a four-way D-pad: palette face rotation, marking-menu directions,
  undo (swipe-backward). Quest only; Galaxy XR does not expose it.
- Per-material `clipPlane`, `clipPlane2` ... (`Material` in 8.43) for the slab: two opposite
  planes on the graph's materials hide everything outside the slab.
- Behaviors: `SixDofDragBehavior` (grab and turn), `MultiPointerScaleBehavior` (two-hand
  scale), `FollowBehavior` (lazy-follow menus), `SurfaceMagnetismBehavior`.
- License: Apache-2.0. Coverage: building blocks only. Link:
  https://forum.babylonjs.com/t/hand-tracking-microgestures/60860

Also in this repository: `graphty-element/src/cameras/InputUtils.ts` exports `isPinching`
(with hysteresis), `pinchStrength`, `applyDeadzone`, `thumbstickDeltas` and
`twoHandGestureDelta`; `XRInputHandler.ts` smooths hand drag deltas with an exponential moving
average. Reuse these before writing pinch or two-hand code.

## 5. Kando `gesture-detector.ts`

- What it does: the expert ("marking") mode of a pie menu. Fed with motion points while the
  button is held, it emits `selection` when the stroke turns a corner sharper than
  `minStrokeAngle = 20` degrees after at least `minStrokeLength = 150` px, or when the pointer
  pauses for `pauseTimeout = 100` ms, ignoring moves under `jitterThreshold = 10` px; an optional
  `fixedStrokeLength` mode selects as soon as the stroke passes a distance. 184 lines, depends
  only on Node's `events` EventEmitter and `setTimeout`. Kando's `gamepad.ts` maps a stick to
  angle and magnitude.
- License: MIT (Kando is MIT; REUSE-annotated). Maintenance: very active (2026-10-10).
- Coverage: about 90% of compound-stroke recognition for hierarchical marking menus.
- We would add or fix: feed it 2D points in meters on the menu plane (the PinCushion projection
  from section 2), so retune the thresholds (for example 150 px -> about 6 cm, 10 px -> about
  4 mm). Replace `EventEmitter` with a callback. Hand-tracking jitter is larger than mouse
  jitter: filter the input with the One Euro filter (section 11) before it reaches the detector.
- Link: https://github.com/kando-menu/kando/blob/main/src/menu-renderer/input-methods/gesture-detector.ts

## 6. `marking-menu` npm (Quentin Roy)

- What it does: a faithful Kurtenbach marking menu: press and pause shows the menu (novice),
  draw without waiting (expert), sub-menus by dwelling, a dead zone, gesture feedback traces,
  typed menu models, events `start`, `open`, `move`, `change`, `select`, `cancel`.
- License: MIT. Maintenance: active (1.0.0 and 1.0.1 on 2026-09-24). Its README warns that
  several patents concern marking menus (the original Autodesk ones are old; not a concern for
  a private playground).
- Coverage: complete behavior, but `createMarkingMenu({ parent: HTMLElement, ... })` listens to
  DOM pointer events and renders HTML/SVG. The DOM does not render inside a WebXR session, and
  the recognizer is not exported on its own.
- Verdict: use as the behavioral reference (its defaults: dead zone, novice dwell time, submenu
  delay) and for a desktop comparison page. Do not try to drive it with synthetic pointer
  events from XR.
- Link: https://github.com/QuentinRoy/Marking-Menu ; https://www.npmjs.com/package/marking-menu

## 7. pangmenu "Ring HUD"

- What it does: a dependency-free radial menu proof of concept for a future VR settings menu,
  driven by angle and radius from a center (the same numbers a thumbstick gives). Child rings
  fan over a bounded arc centered on the parent's angle; hovering previews children; 8 items
  per ring, depth about 2; long flat lists break out into a windowed list instead of wedges.
  Its README cites Kurtenbach 1993, Kurtenbach and Buxton 1993, Zhao and Balakrishnan 2004,
  Callahan et al. 1988.
- License: no LICENSE file, so all rights reserved by default. Maintenance: one author,
  2026-09.
- Verdict: ideas only (the bounded child arc and the "lists are not pies" rule are worth
  copying as design); write our own code.
- Link: https://github.com/phfr/pangmenu

## 8. Wentzel et al., "A Comparison of Virtual Reality Menu Archetypes" (TVCG 2025)

- Surveyed 108 menus in 84 consumer VR apps, then compared ray-cast, direct-input and marking
  menus. Single-level menus: direct input fastest, unaffected by item count; marking fast at
  8 items but slow at 24. Two-level menus: marking fastest regardless of item count. Ray-cast
  menus, the most common in products, were among the slowest but rated most consistently usable.
- No code released. Implication for the sandbox: make the node menu's style a toggle
  (ray-cast list, direct-touch panel, marking ring) so the owner can feel the difference.
- Link: https://johannwentzel.ca/projects/vrmm/index.html ; https://pubmed.ncbi.nlm.nih.gov/38941205

## 9. Hint tags: Vimium labels + constant angular size

- Label generation: Vimium's `hintStrings(count)` expands a queue of strings breadth first,
  keeps only the unexpanded leaves (so no hint is a prefix of another), sorts and reverses them.
  Ten lines, MIT. Its keyboard alphabet (home row) is wrong for us:
    - read-and-type with an in-scene mini keyboard: show only the letters in use;
    - read-and-say with voice: letter names are acoustically confusable (b/d/e/p/t/v, m/n, f/s),
      so use a voice-safe alphabet or short words, and test recognition on both headsets.
- Constant angular size, two ways:
    - `@babylonjs/addons` 8.43.0 MSDF `TextRenderer` has `isBillboard`,
      `isBillboardScreenProjected` (the shader divides the view position by its z, which keeps a
      constant angular size) and `ignoreDepthBuffer` (tags drawn over occluders). Thousands of
      paragraphs in one renderer. Caveat: it is drawn by an explicit
      `render(viewMatrix, projectionMatrix)` call; in XR it must be called once per eye camera
      (`scene.onAfterCameraRenderObservable`), and with multiview it is unverified. Test early.
    - fallback: one billboard plane per tag scaled every frame by `2 * d * tan(theta / 2)`
      (`d` = distance from the head). Simple, but one draw per tag unless thin-instanced.
- Size: Dingler et al. 2018 found a comfortable VR reading size of 14.6 dmm (mm per meter of
  distance, about 0.84 degrees) and a minimum of 4.85 dmm. Two-letter tags read at a glance
  want about 20 dmm (about 1.15 degrees) and a backing chip for contrast; make it a slider.
- Also relevant: a label-guidance technique (TVCG 2020, doi 10.1109/TVCG.2020.3023606 per the
  search index) lays all labels out on one plane, then flies the chosen label to its object.
- Links: https://github.com/philc/vimium (content_scripts/link_hints.js) ;
  https://doc.babylonjs.com/addons/msdfText/ ; https://kaikunze.de/papers/pdf/dingler2018vr.pdf

## 10. RayCursor (Baloup, Pietrzak, Casiez, CHI 2019)

- What it does: a cursor slides along the controller ray, its depth moved with the touchpad
  (`ComputeDistance` transfer functions `Lerp` / `LerpDistance`); the target closest to the
  cursor in 3D (`ClosestSelectable`) is highlighted, a bubble cursor along the ray. "SemiAuto"
  mode starts the cursor at the target nearest the ray. Ships a C# One Euro filter for the ray.
- License: MIT. Maintenance: dormant (2023). Unity C#, 1,600 lines including utilities;
  the core is about 200.
- Coverage of dense picking: about 70% (the technique is complete; the input mapping is Vive
  touchpad). We would add the Quest/Galaxy thumbstick Y as depth, and a hands path (cursor depth
  from the hand's distance to the body, or from the pinch drag). In the VoiceRay study it was
  one of the baselines, so it is a good comparison point.
- Link: https://github.com/LokiResearch/RayCursor

## 11. One Euro filter (`1eurofilter` npm)

- Casiez's reference implementation (JavaScript), version 1.3.0, BSD-3-Clause. Adaptive
  low-pass filter: smooth when still, responsive when moving. Use on hand-ray directions, cursor
  positions, the hover name tag anchor and any live readout so the owner does not see jitter.
- Related failure the dry run must check: the "Heisenberg effect", the ray moving at the moment
  of a pinch or trigger press (arXiv 2602.01061 compares direct and score-based selection). Fix:
  freeze the ray direction at pinch onset, or pick from the hovered target of the last stable
  frames, not the frame of the click.
- Links: https://github.com/casiez/OneEuroFilter ; https://www.npmjs.com/package/1eurofilter

## 12. vr_selection (Maslych et al., IEEE VR 2023)

- What it does: one Unity scene that switches between CylinderPIM (3D mini-map), DiskPIM
  (flat mini-map, with and without disambiguation), Expand, RayKebab (objects strung along the
  ray, grabbable), GravityZone (thumbstick pulls objects nearer) and a flower cone. The cone is a
  trigger collider that collects every object inside it (`ConeVolumeHighlighter`, 41 lines);
  `ClutterHandler_circumferenceDisplay` places up to 8 candidate copies on slots around a circle
  on the off-hand mini-map, freezes them with a trigger, and the right grip grabs one.
- License: MIT. Maintenance: dormant (2024). Research-grade code (singletons, magic numbers,
  hard-coded slots).
- Coverage: ideas for dense picking and for "a menu on a cluster": cone-collect, then lay the
  candidates out in a ring at the off hand, then grab. Rewrite in TS (~150 lines); do not port.
- Link: https://github.com/maslychm/vr_selection

## 13. Slab / slicing plane

- Slicing-Volume (Montano-Murillo, Nguyen, Kazi, Subramanian, DiVerdi, Martinez-Plasencia,
  IEEE VR 2020): a volume placed in mid-air encloses targets; its contents are projected onto a
  tablet held in the off hand, and the user picks on the tablet (pen and tablet). More accurate
  than mid-air selection alone. This is exactly our "slab pushed through the graph that shows a
  thin slice flat". No code found.
- Slice WIM (Coffey et al. 2011): overview plus detail with a slice of a volume on a surface.
- LassoGrid (Yu et al., TVCG 2020, seven techniques for fully occluded targets): draw a lasso,
  everything inside is laid out in a grid, then ray-pick in the grid; fastest and lowest error
  for fully occluded targets in their study. AlphaCursor: thumbstick pushes a cursor deeper and
  objects in front turn transparent.
- Build it ourselves (~150 lines): the slab is a box held in the hand with normal `n`, center
  `c`, thickness `t`; a node is in the slice when `abs(dot(p - c, n)) < t / 2` (CPU, positions
  are known); inside nodes are drawn on the plate at their plate-local XY (z dropped), with
  hint tags; Babylon's per-material clip planes dim or hide the rest of the graph. A LassoGrid
  variant (grid instead of projection) is a toggle on the same plate.
- Links: https://discovery.ucl.ac.uk/id/eprint/10106533/ ;
  https://ivlab.cs.umn.edu/Coffey-2011-SliceWIM.html

## 14. Dense picking algorithms with no published code

- SQUAD (Kopper et al.): sphere-cast to gather candidates, then a four-way quad menu splits them
  recursively; log4(n) steps, no precise pointing needed. Fits our marking menu (four
  directions) and hint tags.
- Flower Ray (Grossman and Balakrishnan 2006): everything the ray passes through fans out into a
  marking menu. Our marking-menu code plus a ray-intersection list gives it almost for free.
- Expand (Cashion et al. 2012), IntenSelect (de Haan et al. 2005, a time-scored cone),
  AlphaCursor (above).
- Each is about 100 lines on top of our ray, menu and filter code. Pick one or two to compare
  with RayCursor and hint tags. Reference:
  http://cs.ucf.edu/courses/cap6121/spr11/readings/Selection.pdf (Kopper, progressive refinement)

## 15. VoiceRay (CHI 2026)

- The user says the ordinal of the target along the ray ("second"). Compared with AlphaCursor,
  LassoGrid, RayCursor, BubbleRay and plain ray casting in a 24-person study: faster, lower
  cognitive load, higher usability. No code.
- Cheap to add once voice exists: number the hits along the ray with small tags and accept
  "first", "second", .... Also see LLM-assisted speech and pointing for multi-object selection,
  arXiv 2410.21091.
- Link: https://dl.acm.org/doi/10.1145/3772318.3790399

## 16. MeTACAST (Zhao, Isenberg, Xie, Liang, Yu, VIS 2023)

- Point and stroke techniques (MeTAPoint, MeTABrush, MeTAPaint) that select clusters in
  particle data using a density field, so a rough stroke selects the intended structure.
- MIT, active (2026-06), Unity with GPU density estimation. Too heavy to port; the idea
  (snap a rough selection to a structure) maps to "select the community this stroke touched",
  which graphty's algorithms can compute. Reference for the sieve.
- Link: https://github.com/LixiangZhao98/MeTACAST

## 17. Graph-specific VR tools

- VRNetzer (menchelab, Nature Communications 2021): Unreal Engine; nodes selected by pointing,
  network dragged, rotated and scaled with triggers; a control panel and an inspection panel.
  MIT; the repository is kept for history (successor: DataDiVR). Panel split is a reference for
  our toolbar and inspector.
- 3d-force-graph-vr (vasturiano, A-Frame): graph in VR with hover and click callbacks, no
  menus. MIT.
- Links: https://github.com/menchelab/VRNetzer ; https://github.com/vasturiano/3d-force-graph-vr

## 18. Meta Immersive Web SDK

- Full WebXR framework (MIT) with spatial UI panels written in UIKitML (pmndrs uikit) and
  pointer interaction. Built on three.js, so not usable inside a Babylon scene. Reference for how
  Meta styles panels and rays on Quest (its default ray shows only on intersection).
- Link: https://github.com/facebook/immersive-web-sdk

## Recommendations for the sandbox

- Node menu and empty-space menu: port PinCushion's projection and angle code, add hierarchy
  with pangmenu's bounded child arc, add Kando's detector for expert strokes, filter input with
  the One Euro filter. Toggles: ring (marking), ray-cast list (GUI3D panel), direct-touch panel.
- Palette: port Open Brush's ring placement, swipe/snap rotation with coasting and 20-degree
  haptic ticks, and the tear-off / snap-back test with hysteresis. Cards are `HolographicSlate`s.
  Quest hands turn faces with microgesture swipes; Galaxy XR hands with a rim pinch-drag.
- Figma-like menus and wrist menu: Babylon GUI3D as is; parent menus to the grip when a
  controller is in use, since `HandMenu` follows only tracked hands.
- Hint tags: Vimium's generator, MSDF text with `isBillboardScreenProjected`, about 20 dmm,
  tested per eye in the dry run; fallback is scaled billboard planes.
- Dense picking: RayCursor first (closest to plain ray casting), then hint tags, then the slab
  (Slicing-Volume style) with a LassoGrid toggle; Flower Ray or SQUAD as a fourth option on top
  of the marking menu; VoiceRay ordinals once voice works.
- Dry-run checks specific to this research: SlateGizmo drag with hands and controllers on both
  headsets; MSDF text per-eye rendering; ray stability at pinch (Heisenberg effect); that the
  marking ring is reachable with hands on Galaxy XR (no microgestures there).
