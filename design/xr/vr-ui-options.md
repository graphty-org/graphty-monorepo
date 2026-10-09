# VR user interface options for graphty

Date: 2026-10-08. Status: research report, for a decision on which prototypes to build.

This report answers the open research issue "WebXR parity with 3D, as a separate XR app layer
over graphty-element" (https://github.com/graphty-org/graphty-monorepo/issues/39). It also
settles a tension with the open issue "graphty-element: an in-headset menu for WebXR sessions"
(https://github.com/graphty-org/graphty-monorepo/issues/835): that issue has graphty-element draw
a menu, while the repository's rules say graphty-element stays neutral about presentation. The
answer here: graphty-element supplies neutral XR plumbing (input routing for a consumer's own 3D
UI, hover facts, camera commands, a label budget), and a separate XR app layer draws the menus,
words and grouping.

The target device is a Meta Quest 3 class headset with controllers and hand tracking, running the
graphty app in the headset's browser over WebXR, with a system or Bluetooth keyboard where useful.
Apple Vision Pro and Android XR headsets are covered where the platform allows.

Evidence labels used throughout: **lab** (a peer-reviewed study, with N where known),
**shipped** (in a product many people use), **vendor guide** (a platform owner's guidance),
**report** (developer forums, blogs, press), **opinion**.

## 1. Summary

**Recommended direction: do not rebuild the desktop app in 3D. Keep the real graphty app, and
make leaving and re-entering the headset view cheap.** The graphty app already runs in the
headset browser's 2D window. The user prepares data and analysis there, presses Enter VR, and
the same page and the same graphty-element instance go immersive. Selection, runs, styles and
undo carry over with nothing to synchronize. Inside the headset, a small analysis kit covers the
work people actually do with a 3D graph: find a node, read it, look at its neighbors, run a
common algorithm, color, size or label by the result, change layout, and undo. Anything else is
one "Finish this on the page" press away, and the app logs every such trip so the next
in-headset panel is built where the data says it is needed.

The reviewers agreed on this direction. A panel of five simulated expert reviewers (VR
interaction design, ergonomics and accessibility, a working graph analyst, WebXR engineering,
and a coverage auditor) reviewed every option in three adversarial rounds. All five rated the
recommended options viable, and their objections are folded into the designs below.

**Top three prototypes, in order:**

1. **Same-page dip-in with a node context ring** (controllers first). It answers whether an
   analyst can finish the core tasks in the headset with a small kit, and how much each trip
   back to the page costs.
2. **The same thing on a PC over Quest Link.** Most of the work is a one-day device check. If
   it passes, PC users keep their files, keyboard and tables on the desktop while the graph runs
   in the headset, with almost no extra code.
3. **"Go in": stepping from node to node through a neighborhood.** It answers whether stepping
   through ties beats "select neighbors and frame them" for the most graph-specific task, "one
   character and who he is tied to".

All three sit on a shared foundation (section 4.0) of graphty-element plumbing and comfort
rules. Its first slice is a few weeks of work and ships with prototype 1.

## 2. What the VR interface has to cover

### 2.1 The functions, condensed

The full inventory lists about 90 functions of the graphty app (the tier 1 workspace plus the
tier 2 additions). Each was rated by what a person needs inside the headset.

**Core: without these, a person takes the headset off within minutes (27 functions).**

- Session: enter VR or AR (always from the 2D page, because WebXR needs a page gesture), exit,
  status notices with progress and Cancel.
- Navigation: orbit, zoom, pan, fit the whole graph, frame the selection, find a node by name,
  select a node's neighbors, read a node by pointing at it (the hover tooltip).
- Selection: select one node, clear the selection.
- Analysis: choose and run an algorithm (38 in the catalog), watch progress and cancel, read a
  measure (histogram, top 10), read a group result (count, sizes), read one node's values, and
  the run list (show or hide each run's paint, delete a run).
- Styling: a run's suggested style, color by an attribute or result, size by, labels from an
  attribute (and label density), the legend.
- Layout: choose a layout (24 engines, with a Recommended mark), rerun it.
- Undo and redo.

**Important: reachable in the headset, possibly by a slower route or a second prototype.**
Headset settings, the command index (every command by name), opening a sample, the load outcome,
the attribute list, the data table (realistically a "top N" list in VR), saved views, selecting
several nodes, area selection, edge selection, selection summary, select by rule, algorithm
options, rerun after a settings change, whole-graph overview, shortest path, fixed style
properties (color, shape, size), "why does this node look like this", layout options, pause
layout, group layouts, pinning nodes, filters (tier 2), notes (tier 2), saving and exporting a
picture.

**Desktop-only is acceptable.** File pickers and file dialogs, the Data page's column-role form,
adding data from a URL, privacy consent, general settings, help pages, style files, comparing
results, version history, data and video export.

**What the core set asks of input.** Almost everything is pointing at a node, choosing from a
short list, reading a panel, toggling, or confirming. **Only one core function needs text: find
a node by name.** Text otherwise appears in important functions (notes, names, rules, URLs).
No core function needs typed numbers; bounded numbers (filter thresholds, algorithm options)
suit sliders and steppers. Long lists appear in three places: the 38-algorithm catalog, the
24-layout catalog and wide attribute lists.

### 2.2 What graphty-element's XR does today

| Area               | Today                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session            | `enterVR()` / `enterAR()` through Babylon's `WebXRDefaultExperience`, `exitXR()`, support checks, and the session command `view.immersive` (exempt from undo). VR uses `local-floor`; AR asks for `hit-test` but not hand tracking. Teleport is off. |
| Entry buttons      | A DOM overlay with "VR" and "AR" buttons, the element's only XR UI.                                                                                                                                                                                  |
| Navigation         | Thumbsticks move a pivot that transforms the whole graph: left stick yaw and pitch, right stick pan and zoom. Both triggers or both pinches grab, turn and scale the graph.                                                                          |
| Nodes              | Trigger or pinch on a node selects it; held and moved, it drags the node with velocity gain and depth amplification.                                                                                                                                 |
| Drawing            | The full scene: nodes, edges, labels with decluttering, style layers, selection styling.                                                                                                                                                             |
| Voice and language | An AI command layer (find nodes, run algorithm, set layout, find and style, zoom to nodes, and more) with a Web Speech adapter. Not XR-specific, and Web Speech recognition is not available in Quest Browser.                                       |
| Tests              | The `xr` Vitest project runs real VR and AR sessions on an emulated headset (IWER), with thumbstick, hand-tracking and gesture tests.                                                                                                                |

**Missing:** any in-headset panel, menu, inspector, legend, text entry or notice; a way for a
consumer to place its own 3D UI and receive the ray or pinch instead of the graph (the element's
input handler owns every button); hover events in XR; edge picking, multi-select or area
selection in XR; fit, frame and reset in XR; AR placement; and per-label cost control. Each
label is its own dynamic texture today. Inside a headset, a person can navigate, drag a node and
select one node, but cannot read what they selected. In the graphty app, Enter VR exists only in
the current shell's View menu. The tier 1 workspace has no XR yet.

Files: `graphty-element/src/xr/XRSessionManager.ts`, `src/cameras/XRInputHandler.ts`,
`src/ui/XRUIManager.ts`, `src/config/xr-config-schema.ts`, `src/meshes/RichTextLabel.ts`,
`src/ai/commands/builtin.ts`, `test/interactions/xr/`. Earlier XR design work:
`design/xr/xr-control-techniques.md` and the other files in `design/xr/`.

## 3. Platform facts that constrain the design

Checked between 2026-10-06 and 2026-10-08. Browser behavior changes often, and every "verify"
below is an item for the first device day (section 4.0).

**Meta Quest Browser (Quest 3, 3S, Pro, 2)**

- Hands arrive as WebXR input sources with 25 joint poses per hand, an emulated hand ray, and
  pinch as `select`. There is no gesture API: anything beyond pinch has to be recognized by the
  page from the joints. Palm pinch is reserved by the system (right: the Meta button; left: the
  app's `menu` component on the `oculus-hand` profile, Quest Browser 38.1+; verify).
  https://developers.meta.com/horizon/documentation/web/webxr-hands/ (vendor guide)
- Thumb microgestures: sources disagree on whether the browser exposes them (Quest Browser 38.1+
  through `oculus-hand` per release notes and a Babylon.js support thread from October 2025; the
  vendor web docs do not mention them). Not used by any option here.
- Eye gaze is not exposed to WebXR on Quest Pro or Quest 3. Meta's Immersive Web SDK 1.0 offers
  gaze-and-pinch for WebXR developers, but Meta has not said which devices or browser versions
  support it (Mixed News, 2026-09-28,
  https://mixed-news.com/en/meta-immersive-web-sdk-1-0-gaze-and-pinch-webxr/, report).
- Text: `XRSession.isSystemKeyboardSupported` (Quest Browser 26.1+). Focusing a real DOM input
  raises the system keyboard, with swipe typing and a dictation button. While it is up, the
  session is `visible-blurred`. The first key press overwrites the whole field, and there are no
  per-key events. Online dictation works in the US only, with an on-device opt-in elsewhere.
  https://developers.meta.com/horizon/documentation/web/webxr-keyboard/,
  https://www.meta.com/help/quest/463323051789865/ (vendor guide)
- Bluetooth keyboards reportedly deliver ordinary key events during a session, except arrow keys
  on Quest 2 and Pro (developer reports, unconfirmed by Meta; https://github.com/aframevr/aframe/issues/5271; verify).
- `SpeechRecognition` is not available (https://caniuse.com/speech-recognition, forum reports).
  `getUserMedia` works in a session if permission was granted on the page first (Babylon.js team
  on their forum; report).
- No DOM overlay in a headset (DOM overlay is for handheld AR), so the Mantine app cannot float
  in an immersive session. WebXR Layers (quad and cylinder) are supported and give crisper text
  than eye-buffer textures, but cannot take input directly.
  https://developers.meta.com/horizon/documentation/web/webxr-layers/ (vendor guide)
- Files: Quest Browser is Chromium on Android, which has no `showOpenFilePicker` or
  `showSaveFilePicker`
  (https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker). Saving means a
  download into headset storage. Whether a picker or download suspends the session is
  unverified.
- Mixed reality: plane detection with semantic labels, mesh detection, anchors and hit test are
  available in `immersive-ar`.
  https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/ (vendor guide)
- Optional WebXR features (hand tracking, layers, hit test, planes, anchors) are fixed when the
  session is requested and cannot be added later.
- Hand tracking accuracy on Quest 2: mean fingertip error 1.1 cm, 45 ms latency (lab,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC10830632/). Small far nodes need disambiguation help.
- Quest Link and Air Link: desktop Chrome or Edge on Windows can run WebXR through the Meta OpenXR
  runtime. Developers report trouble with controller detection and with setting the runtime
  (https://communityforums.atmeta.com/discussions/dev-quest/webxr-with-a-quest-connected-to-desktop-using-link/833765;
  report).

**Apple Vision Pro (Safari).** WebXR `immersive-vr` has been on by default since visionOS 2
(September 2024). Input is look-and-pinch exposed as a `transient-pointer`: a ray along the gaze
that exists only while the user pinches. There is no hover, and no continuous gaze is given to
pages. The WebKit post and the research found no `immersive-ar` in Safari (verify on the current
visionOS release). So on Vision Pro, a hover label has to appear on
pinch start instead.
https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/ (vendor
guide)

**Android XR (Chrome; Samsung Galaxy XR headsets and wired XR glasses).** Chrome supports
WebXR with the AR module, hit test, anchors, depth sensing, light estimation, gamepads and hand
input, which is the primary input. The documentation page was updated 2026-08-31 and does not
list WebXR Layers. https://developer.android.com/develop/xr/web (vendor guide)

**Babylon.js** (graphty-element pins `@babylonjs/core` ^8.36.1). It ships WebXR hand tracking,
near interaction (poke and near grab), and WebXR Layers. `@babylonjs/gui` adds 2D GUI on a mesh
(`AdvancedDynamicTexture.CreateForMesh`) and 3D controls (NearMenu, HandMenu, HolographicSlate,
VirtualKeyboard). The 2D GUI ships with core and is well maintained; the GUI3D/MRTK controls see
less maintenance and are a risk. `@babylonjs/gui` is not a graphty-element dependency today. At
roughly 25 pixels per degree on Quest 3 (a commonly cited figure, not a vendor-documented one;
verify), desktop 12-14 px text is unreadable unless enlarged two to three times. https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D

**Comfort numbers the vendors agree on** (Microsoft, Meta, Android XR; vendor guides):

| Topic                        | Value                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Where sustained reading sits | 10-20 degrees below the horizon; 35 degrees down as a hard cap; within 45 degrees of yaw |
| Text                         | minimum legible 0.35-0.4 degrees cap height; comfortable 0.6-0.8 degrees                 |
| Targets                      | at least 2.5-3 degrees (about 22 mm at poke distance), 12 mm apart                       |
| Distances                    | poke panels 42-46 cm; ray panels 0.8-3 m; nothing closer than 40 cm                      |
| Hand menus                   | about 3 buttons, quick actions only                                                      |
| Frame rate                   | the device rate (72 or 90 Hz on Quest), never under 60                                   |

Fatigue is the strongest constraint on mid-air input. Consumed Endurance (Hincapie-Ramos et al.,
CHI 2014, lab) and NICER (Li et al., ACM TOG 2024, lab) both show that an extended arm at
shoulder height exhausts people in minutes, while a bent elbow with the hand low costs far less.
Apple made look-and-pinch with the hands in the lap its default for this reason.

## 4. The options, best first

Each option below was revised through three review rounds. Each states its **viability**
(reviewers out of five who rated it viable as is or with changes) and its **usability** (the
mean of five scores on a 1-7 scale, from the final round).

The running example is the Florentine families sample: **find Medici, show their neighbors,
run PageRank, color by it.**

Coverage ratings: **well** (done comfortably in the headset), **awkward** (possible but slow or
tiring), **trip** (one press takes the user to the page and back), **page** (done on the page
only).

### 4.0 The shared foundation (priority 1; a prerequisite, not a UI option)

**What it is.** The plumbing, bindings and comfort rules every option needs, decided once and
shipped in three steps.

- **First slice** ships with the first prototype (weeks of work).
- **Second slice** follows the first 30-minute task test.
- **Later** waits for evidence.

**Device day.** Before any UI work, spend one day on a Quest 3 with pass/fail numbers, in this
order:

1. Frame time of the graph alone at 1k, 5k and 10k nodes, labels off and on, with no UI; then
   with multiview through WebXR Layers. This gates every textured panel in every option.
2. Exit and re-entry time each way, with the target under 3 s and the kill line above 6 s, and
   what survives the trip (pose, selection).
3. The system keyboard and dictation inside a session.
4. Bluetooth key events in a focused session.
5. File pickers and downloads during a session, and whether a cloud drive is reachable.
6. The left palm-pinch `menu` event and any clash with the system gesture.
7. The Link checks (section 4.5).
8. Speech synthesis, and microphone permission carried in from the page.
9. Two slates plus an inspector at 5k nodes (for section 4.3 only).
10. Plane labels and anchors (for section 4.9 only).

**Controller bindings** (right-handed, with a mirrored "swap hands" setting from the start):

| Control     | Meaning                                                                                                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grip        | Grab the world. One grip moves and turns the graph like an object; two grips scale and rotate it. (This follows the Quest convention. Today both triggers do this.)                                                                                 |
| Trigger     | On a node marked as a unique hit: select; hold and move to drag. On empty space or an ambiguous hit: a depth cursor along the ray (RayCursor) with a pick list. A latch setting (click to arm, stick for depth, click to commit) replaces the hold. |
| Right stick | Two persistent meanings. With nothing held, it pans and zooms. Otherwise it acts "along the ray": cursor depth, push and pull a dragged node, or scroll the panel under the ray.                                                                    |
| B           | Context or back. With nothing active, it opens the node ring on the highlighted node, or the command ring on empty space. With anything active, it cancels or steps back.                                                                           |
| A + trigger | Add to or remove from the selection.                                                                                                                                                                                                                |
| Y           | The menu; it always recalls the toolbar to the current view.                                                                                                                                                                                        |
| X           | Undo, everywhere, never anything else. Redo appears as a chip after undo.                                                                                                                                                                           |
| Left stick  | Snap yaw (15-30 degrees) and pitch of the graph.                                                                                                                                                                                                    |

**graphty-element work in the first slice:**

1. Input routing, so a ray or pinch on consumer UI never reaches the graph.
2. Ray hover and point events. A linear ray-against-sphere test over the position array should take
   about 0.1 ms at 10k nodes (an estimate, not yet measured on a Quest), so no spatial index is
   planned unless the device day says otherwise.
3. XR Fit, Frame, Back and Reset. Fit's placement is an option; the app's default is a tabletop
   graph 0.5-1 m across, 0.6-0.9 m away and 10-20 degrees below the horizon, so most navigation
   becomes grip-and-turn.
4. The graph pose survives exit, and the XR helper is kept (today `exitXR()` disposes it).
5. A label budget: at most N labels, chosen by view cone, cursor proximity or the current
   measure. N is a consumer option, and the element reports the affordable N.
6. Hover, highlight and dim drawn as shader uniforms or separate meshes, never as per-node
   material changes.
7. Every optional WebXR feature requested once, at entry.

**XR app-layer work in the first slice** (a private package until its name is published):

- A small command registry.
- One typed field (system keyboard, its dictation, or Bluetooth keys) with a deterministic
  resolver over node ids and names, catalog names, the desktop Find grammar and command names.
  Results are picked after the keyboard closes, and values are replace-only.
- A notice line with progress, Cancel and Reselect, and an optional break reminder.
- Undo and Redo, Fit, Frame, Back, Clear, a legend (pick a row to select that group), label
  density (More, Fewer, Near cursor), Exit, and a hint overlay on the controller models.
- Comfort and access settings at entry: seated or standing, handedness, text scale 1.0-2.0x
  with panels that reflow and page, high contrast, a static floor grid or horizon, snap turn,
  vignette, capped rotation speed, reduced motion, and the latch.
- Permissions requested on the page before Enter VR.

**Second slice.**

- A selection-back stack in graphty-element, separate from undo. Desktop undo already exempts
  selection (`session/commands/doors.ts:307`), and this keeps that contract.
- Hand tracking and hit-test placement in AR.
- A hands profile:
    - Pinch selects, and movement is measured at the pinch point with a tolerance of at least
      1.5 cm or 2 degrees.
    - A pinch on an ambiguous hit opens the pick list.
    - Pinch-and-hold opens the inspector after an adjustable dwell, with an Inspect button as a
      no-hold path.
    - Two-hand pinch grabs the world.
    - The hand ray starts at the shoulder, so a resting hand stays visible to the cameras.
    - The menu opens from an orb at the lower edge of view.
- One-hand and armrest presets. The armrest preset uses clutched relative pointing from a
  resting hand, for near-zero shoulder load and for wheelchair users.
- Remappable bindings, a Vision Pro row, and an automated placement test.
- The typed field falls back to the element's existing AI commands, after an audit that they
  paint only their own results.

**Later.** QR pairing with a desktop, switch scanning, spoken read-out, earcons, saved XR
viewpoints, Erg-O retargeting, docks and tear-off panels. HTML-in-Canvas is tracked
(https://github.com/WICG/html-in-canvas).

**Evaluation.** IWER-scripted versions of the tier 1 tasks run in the `xr` Vitest project from
day one. Each prototype gets a 10-person Quest 3 session that includes people over 45, glasses
wearers, people with tremor or a weak grip, a wheelchair-height seat and left-handed users. The
session logs trips per function, mode errors, frame time, arm fatigue (Consumed Endurance or
NICER), neck pitch, sickness (SSQ) and perceived effort (Borg CR10).

| Group            | Coverage               | How                                                                               |
| ---------------- | ---------------------- | --------------------------------------------------------------------------------- |
| Session          | well                   | Exit, notices with Cancel, hint overlay                                           |
| Navigation       | well                   | tabletop grab, Fit, Frame, Back, Reset, find through the typed field              |
| Selection        | well (one node, clear) | depth cursor, Reselect; select by rule waits for the tier 2 "=" grammar           |
| Styling          | partly                 | legend and label density only                                                     |
| Data, Save       | awkward                | headset storage on standalone; autosave stays in the headset browser              |
| Undo             | well                   | X everywhere                                                                      |
| Left to the page | page                   | edge lists, "why this look", group layouts, filter editing, tables, reading notes |

- **Strengths.** The first slice is weeks, not months. The bindings follow the Quest
  convention. Accessibility and comfort are settled once, as testable rules. Frame time and trip
  time are measured on day one, before any option adds textures. Capabilities stay in
  graphty-element; words and chosen values stay in the app layer.
- **Weaknesses.** It is still real element work. Several facts wait on the device day. Data and
  Save are stranded in headset storage on a standalone headset. Typed input is modal and
  replace-only.
- **Verdict.** Viable 5 of 5; usability 4.8. Remaining objection: the size of the element work
  in the first slice.
- **Sources:** Meta WebXR hands, keyboard and layers docs; Microsoft comfort and typography
  guides; Meta hands UI best practices; Baloup, Pietrzak, Casiez, "RayCursor", CHI 2019 (lab);
  Hincapie-Ramos et al., Consumed Endurance, CHI 2014 (lab). URLs in section 8.

### 4.1 Same-page dip-in with an in-session analysis kit (priority 2; first prototype)

**How it works.** The analyst opens Florentine families in the graphty app in the headset's
browser window, using the controller ray as a mouse. On the page, a "pack for the headset" list
(with a sensible default) chooses which algorithms, attributes and layouts travel into the
session. They press Enter VR. The graph appears as a tabletop model below eye level, with
selection, runs and styles intact.

1. They press Y and pick Find. The system keyboard appears; they say or swipe "Medici". When the
   keyboard closes, the candidate list shows Medici; they pick it and the graph frames it.
2. They tap B with the node highlighted. The node ring opens, they choose Neighbors and then
   "All (6)", and the six families are selected.
3. On the toolbar row they pick the PageRank tile. Progress shows on the notice line. The
   reading panel shows a histogram and the top 10, and each name selects and frames its node.
4. They pick Color by, then PageRank, from an attribute list that puts packed and recent
   attributes first.
5. They pull the trigger on a node to see its values on an inspector card, held on a leader
   line inside the comfort band.
6. They flag Strozzi and dictate a one-line note into the findings inbox.
7. To tune PageRank's damping, they press "Finish this on the page". The session exits, the
   Analyze panel opens with PageRank focused, and the trip is logged. One press re-enters.
8. On exit, the flags arrive on the page as notes and a named selection.

**The kit:**

- A depth-cursor selection with a hover label, and the inspector card.
- The node ring (section 4.2) and Find.
- One toolbar row: six packed Analyze tiles, Color by, Size by and Label by over the full
  attribute list (typed filter, paged), a Recommended layouts row, Rerun layout, and label
  density.
- A Rows strip with eyes and delete with Undo.
- One reading panel that follows the latest run, wherever it ran.
- The findings inbox.

**On the page,** a coarse-pointer mode driven by `(pointer: coarse)` makes targets about
2.5-3 degrees (about 44-48 px at Quest Browser's window distance; verify) and adds a
context-menu button to every row. Transitions dim and cross-fade both ways.

**Inputs.** Controllers or a hand ray in the 2D window; the system or Bluetooth keyboard; the
foundation's bindings in the session.

| Group        | Coverage                                                                                    | How                                                        |
| ------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Session      | well                                                                                        | Enter on the page, Exit, notices, Finish on the page       |
| Data         | trip                                                                                        | load on the page; standalone files live in headset storage |
| Navigation   | well                                                                                        | tabletop, Fit, Frame, Find, neighbors, hover label         |
| Selection    | well (one, neighborhood, clear)                                                             | depth cursor, ring; area and rules: trip                   |
| Analysis     | well (packed tiles, reading, inspector, rows); trip for the rest of the catalog and options | toolbar, reading panel, Rows strip                         |
| Styling      | well (color, size, label by; legend; label density); trip for fixed properties              | toolbar, legend                                            |
| Layout       | well (recommended, rerun); trip for options                                                 | toolbar                                                    |
| Filters      | trip                                                                                        | page                                                       |
| Notes        | awkward (write-once flags and one-liners); trip to edit                                     | findings inbox                                             |
| Undo         | well                                                                                        | X                                                          |
| Save, export | trip                                                                                        | page                                                       |
| AR           | awkward                                                                                     | same kit in passthrough                                    |

- **Strengths.** Parity at the lowest cost: the long tail stays in the real Mantine app, with
  no sync, no second device and no wire format. The read-analyze-recolor loop stays in the
  headset. Trip telemetry turns "which panels to build next" into data. Browser zoom in the 2D
  window gives low-vision users scaling for free.
- **Weaknesses.** The trip cost is unmeasured: a black transition, a reflow, a gesture per
  entry, and a luminance change each time. The coarse-pointer mode is a real app layout change.
  Mantine popovers, menus and sliders rely on hover and fine drags, which are unproven with a
  controller ray (gated at a 95% hit rate). Notes written in the session are write-once.
  Standalone headsets strand files. No cited study tests this pattern; its case rests on
  engineering cost.
- **Verdict.** Viable 5 of 5; usability 5.0 (the highest of the parity options). Remaining
  objections: trip cost, and Mantine under a controller ray.
- **Sources:** Meta WebXR keyboard and Quest Browser docs; Android XR web docs; Tong et al.,
  IEEE TVCG 2025 (lab, N=18, tracked virtual PC plus VR, https://arxiv.org/abs/2502.00853);
  Kellmann et al., Graph2VR, Database 2024 (lab, N=34). The shipped handoff pattern also appears
  in Substance 3D Modeler, Gravity Sketch's web companion and Freebird XR.

### 4.2 Node context ring and command ring (priority 3; ships with the first prototype)

**How it works.** This is a layer over section 4.1 or 4.3, not a standalone UI. The analyst
points at Medici; the highlight shows before any press. Tapping B opens a ring at a
comfort-clamped spot, with a leader line to the node. Items are chosen with the right stick
(a haptic tick per item) or by pointing the ray or hand at them, and committed with the trigger
or by releasing the stick. B cancels.

- **Node ring:** Neighbors, Path from here, Frame, Go in, Pin or Unpin, Info, Select same
  group, Flag.
- **Neighbors** opens a second ring: 10, 25, 50 or All, with counts, ordered by the current
  measure (or by tie weight then degree), and the order is named on the ring.
- **Command ring** (B on empty space): Find, Analyze, Style, Layout, Rows, View, Slice, More.

In the running example, B on Medici, then Neighbors, then All (6): the six families are
selected. Then B on empty space, Analyze, PageRank, and Style, Color by, PageRank.

Left out of the first build:

- Hide, until element filter steps exist.
- History, until the element exposes an undo listing.
- Flick gestures, until a lab comparison exists.

The hands inspector shows the same ring layout, so the positions transfer between hands and
controllers. Menus elsewhere show each command's ring path as a hint.

**Inputs.** Controllers with thumbsticks and haptics, or ray or hand pointing into the ring.

| Group           | Coverage                                                     | How                                 |
| --------------- | ------------------------------------------------------------ | ----------------------------------- |
| Navigation      | well                                                         | View ring, Frame, Go in             |
| Selection       | well for neighborhoods (with limits and counts) and groups   | node ring                           |
| Analysis        | well for running; readings on the kit's panel                | command ring                        |
| Styling         | well for bindings; long attribute lists overflow to the list | command ring                        |
| Filters         | not yet                                                      | Hide waits for element filter steps |
| Everything else | as section 4.1                                               |                                     |

- **Strengths.** The fastest path for experts: eyes stay on the graph and the hand stays low.
  The node ring with neighbor counts and limits is the pattern of the closest published system,
  Graph2VR (lab, N=34). Its designers moved the menu off the node because "a menu with many
  options within a hairball of nodes would not be appropriate". Hover-first targeting and the
  pick list remove ambiguity in dense graphs.
- **Weaknesses.** Novices need the hints. About 8 items fit a ring. Later items need element
  facts: neighbor counts by edge attribute, and an undo listing. Graph2VR shows that a context
  menu is usable, not that a ring is faster.
- **Verdict.** Viable 5 of 5; usability 5.0.
- **Sources:** Kellmann et al., Database 2024 (lab, N=34); Kurtenbach and Buxton, CHI 1994
  (lab, desktop marking menus); Gebhardt et al., IEEE TVCG 2013 (lab); Mundt and Mathew,
  NordiCHI 2020 (lab); Gravity Sketch 6.0 hold-to-open toolbox (shipped).

### 4.3 Toolbar and catalog-driven slates, built where data says (priority 4)

**How it works.** These are conventional spatial windows (the MRTK near menu, visionOS windows,
Android XR panels), grown out of the kit one function at a time. A slate is built only where
trip telemetry from section 4.1 is highest, starting with Analyze, the attribute list, the Rows
strip and a top-N list. Filters and notes stay on the page until data says otherwise.

One generic slate primitive drives every section: a typed-filter list with paging, row actions,
steppers and focus order. Bespoke widgets come last. Because the slates are generated from the
element's catalog and schema, they stay at parity as algorithms and layouts are added.

- **Toolbar** of nine large buttons: Find, Data, Rows, Analyze, Style, Layout, View, Undo,
  More. It is pinned, and Y recalls it.
- **Layout of surfaces.** One active slate plus the inspector, within 30 degrees of yaw, below
  and beside the graph. A slate collapses to its title strip 2 s after the ray leaves.
- **Slate size.** A slate is about 14 degrees wide (20-25 characters, four targets across), so
  long lists page. A stick-only path with type-ahead jumps serves users with low mobility.
- **Inspector states:** one node, several selected (count, top values, group mix), and nothing
  selected (the whole-graph overview).
- **The top-N slate** serves Find results, a selection's edges ranked by weight, and a stand-in
  for the data table.
- **Seated desk preset:** a lectern at 15-20 degrees down with single-key shortcuts, only if
  the device day shows key events arrive.

In the running example: Find slate, then Medici; the inspector's Degree link selects the
neighbors; Analyze slate, PageRank (with steppers for damping); Style slate, Color by, PageRank,
then a color-blind-safe palette.

**Inputs.** The foundation's bindings, a lowered-hand ray, and poke on a panel brought near
(through Babylon's `WebXRNearInteraction`) for input only.

| Group          | Coverage                                                                                     | How              |
| -------------- | -------------------------------------------------------------------------------------------- | ---------------- |
| Session, frame | well                                                                                         | toolbar, More    |
| Data           | well for the sample gallery and load outcome; files as the foundation                        | Data slate       |
| Navigation     | well                                                                                         | Find, View       |
| Selection      | well for one node and neighborhoods; hands add through an Add chip; edges via the top-N list | inspector, top-N |
| Analysis       | well for running and readings; options by stepper; paged                                     | Analyze slate    |
| Styling        | well for bindings; palettes and shapes page                                                  | Style slate      |
| Layout         | well; group layouts on the page                                                              | Layout slate     |
| Filters        | awkward; waits for tier 2 element filter steps (then one histogram step is well)             |                  |
| Notes          | awkward (write-once); well with a real keyboard in the desk preset                           |                  |
| Undo           | well                                                                                         |                  |
| AR             | awkward                                                                                      |                  |

All 27 core functions have a place, checked again after paging.

- **Strengths.** The option a first-time user will not get lost in. It follows platform
  conventions with shipped evidence (HoloLens, visionOS, Android XR). One layout serves hands
  and controllers.
- **Weaknesses.** It is the largest build. Babylon GUI provides little of the slate primitive
  ready-made. Panels occlude the graph, and texture text holds about half the desktop's rows. It
  is a second widget set to keep at parity with Mantine. Slate textures cost frame time at 5k
  nodes, which is unmeasured.
- **Verdict.** Viable 5 of 5; usability 4.8. Remaining objections: build size, and frame time
  per open slate.
- **Sources:** Microsoft near-menu and hand-menu guides; Android XR spatial UI guide; Meta hands
  UI best practices; Bowman and Hodges, I3D 1997 (lab); Speicher et al., CHI 2018 (lab); Streli
  et al., TouchInsight, UIST 2024 (lab, N=12); Wagner Filho et al., VirtualDesk, CGF 2018 (lab);
  Zielasko et al., IEEE VR workshop 2019 (lab, N=33); Unity EditorXR (shipped); VRNetzer, Pirch
  et al., Nature Communications 2021 (shipped research tool, a web UI on a held clipboard).

### 4.4 Go in: neighbor-to-neighbor exploration (priority 5)

**How it works.** This is a transient view mode entered from the node ring.

1. On Medici, the analyst picks Go in. The graph frames Medici's neighborhood and dims
   everything else (one shader uniform, carried by a style layer the app adds and removes).
   A "you are here" marker sits on Medici.
2. The top-ranked neighbors sit within 20 degrees of center. A sort chip switches the order
   between tie weight, degree and the current measure (PageRank, once it has run).
3. Pointing and pulling the trigger on Albizzi hops there. In the explicit ego mode (shown by a
   chip and the cursor shape), the right stick cycles a highlight and the trigger hops.
4. B steps back along the trail, and at its start leaves the mode. An Out chip is always shown.
5. After leaving, the trail stays highlighted, and "Go back in" returns with one press.
6. Breadcrumbs, a value panel (values, ranks, groups, tie weights), "Find path to...", and
   "Keep trail as selection" are available. Positions and undo history are never touched.

A second phase, a proxy cluster of the neighborhood at 0.6-0.8 m, is built only if labels at
the framed scale fail a legibility test.

**Inputs.** Ray or hand; the right stick only inside ego mode; B to step back.

| Group           | Coverage                                                 | How |
| --------------- | -------------------------------------------------------- | --- |
| Navigation      | well for neighborhoods (hop, trail, back, out, back in)  |     |
| Selection       | well for neighborhoods and paths (trail as selection)    |     |
| Analysis        | well for reading one node and paths; running via the kit |     |
| Everything else | as section 4.1                                           |     |

- **Strengths.** It does the "one character and who he is tied to" task by stepping through
  it, inside the comfort zone, with almost no arm effort. Stick stepping suits users with low
  mobility. The first phase needs no second renderer. Sorger et al. 2021 (lab) found a simple
  egocentric view improved search and navigation without more sickness.
- **Weaknesses.** Global context survives only as the dimmed overview. Hubs with hundreds of
  ties still page. The ring's Neighbors plus Frame covers part of the task; the trail and
  stepping are the added value. It needs an element focus capability and neighborhood facts.
- **Verdict.** Viable 5 of 5; usability 4.8. Remaining objection: overlap with Neighbors plus
  Frame.
- **Sources:** Sorger et al., Pacific Graphics / CGF 2021 (lab, https://arxiv.org/abs/2109.09547);
  Kellmann et al. 2024 (lab, N=34); Takahira et al., ACM SUI 2026 (lab, N=24; preprint,
  unverified, no ranking rests on it).

### 4.5 The dip-in on a PC over Quest Link (priority 6; device check on day one)

**How it works.** The analyst works in the full desktop graphty app in Chrome or Edge on
Windows, then presses Enter VR. The headset shows the graph over Link, from the same page and
the same graphty-element instance, so nothing is replicated.

To edit, the user opens the Link dashboard's desktop view. The session drops to "visible", the
graph pauses and XR input stops. They change PageRank's damping in the real Analyze panel with
mouse and keyboard, then return to the live graph. The form is alternating, not a desktop window
pinned in the scene. The typed field echoes inside the session, so the physical keyboard works
for Find while the desktop is hidden, if key events reach a focused session.

The device-day checks are:

- controller detection over Link;
- dashboard focus behavior;
- key events while focused;
- passthrough over Link, to see the keyboard;
- latency and judder on Air Link (a cable is recommended).

The in-session kit is the same as section 4.1.

| Group              | Coverage                                                      | How                                       |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| Data, Save, export | well for PC users                                             | desktop files and pickers, by alternating |
| Notes              | well for touch typists or with passthrough; otherwise awkward | physical keyboard                         |
| Everything else    | as section 4.1                                                |                                           |

- **Strengths.** It is the only path where tables, keyboard and the saved project all stay
  where the analyst keeps them, with no replication, transport or wire format. Desktop text is
  rendered crisply by the PC. It needs almost no element work beyond section 4.1. Tong et al.
  2025 (lab, N=18) found PC plus VR preferred over VR alone.
- **Weaknesses.** It needs a Windows PC with a capable GPU and a cable or good Wi-Fi.
  Alternating is a round trip in all but name. Typing is blind for people who are not touch
  typists, unless passthrough works. Air Link judder is a sickness risk. It does not serve
  standalone or Vision Pro users.
- **Verdict.** Viable 5 of 5; usability 4.2. Remaining objections: platform reliability, and
  blind typing.
- **Sources:** Meta community forum threads on WebXR over Link and on the OpenXR runtime
  setting (report); A-Frame issue 4558 (report); Tong et al., IEEE TVCG 2025 (lab, N=18).

### 4.6 Slice: one area-selection tool (priority 7)

**How it works.** It is built only if the first task test shows analysts trying to select a
region; select by group, by rule and by neighborhood come first. Slice is one explicit mode,
started from the command ring, with two shapes:

- A **slab**: a plane at the end of the ray, moved in depth by the right stick, with its
  thickness adapted to a target count.
- A **cone**: from a low hand with gain, so a small wrist motion covers a large area, limited
  to a depth range. Snap-to-group is on, so one touch takes whole communities.

The tool is docked in the world by default. An Adjust chip (not the grip, which grabs the
world) makes it hand-held only while adjusting. A preview dims everything outside the shape on
the GPU and shows a live count. Commit adds to the selection through the selection-back stack,
and B exits. Example: slice through the dense middle of a large graph, commit 140 nodes, then
color them from the kit.

| Group           | Coverage                                                               | How |
| --------------- | ---------------------------------------------------------------------- | --- |
| Selection       | well for areas and dense regions (evidence only up to about 120 nodes) |     |
| Filters         | via tier 2 filter steps, once they exist                               |     |
| Everything else | as the base option                                                     |     |

- **Strengths.** One area tool to teach instead of two. Joos et al., ACM SUI 2024 (lab, N=18)
  found the filter plane best of six techniques in dense clutter. Docking and the low-hand cone
  avoid "gorilla arm". The GPU preview keeps frame cost flat.
- **Weaknesses.** In a force layout, a spatial region is often not a set an analyst means. The
  evidence stops at about 120 nodes. It needs shader work and element sets.
- **Verdict.** Viable 5 of 5; usability 3.8. Remaining objection: whether analysts want spatial
  regions at all.
- **Sources:** Joos et al., SUI 2024 (lab, N=18); Bauer et al. 2023 (lab, N=20); Drogemuller
  et al., Journal of Computer Languages 2020 (lab); the Open Brush selection tools (shipped).

### 4.7 Solo tours from saved views (priority 8; not a parity path)

**How it works.** An author builds steps in the desktop app. Each step is a saved view plus row
visibility, a caption and the nodes to frame. In the headset, a viewer steps with Previous and
Next. In the example: step 1, "the Medici sit at the center"; step 2, "PageRank confirms it",
with the graph colored. The viewer can point, read one node, flag it and press "Return to
step", which restores the view only, never the edit history.

Captions use the comfort-band panel and the text-scale setting, with optional narration through
speech synthesis. The graph pose is derived at playback from the viewer's comfort zone, never
stored as a raw transform.

Prerequisites: saved views must exist in the desktop workspace. They are not in tier 1, though
the element has a `view.save` operation. Live presenting waits for a future collaboration
project.

| Group                      | Coverage                | How                        |
| -------------------------- | ----------------------- | -------------------------- |
| Navigation, reading, flags | well                    | step strip, ray, inspector |
| Everything else            | authored on the desktop | not parity by design       |

- **Strengths.** The cheapest headset UI, with the lowest arm and cognitive load. It suits
  novices, stakeholders and teaching. Flow Immersive deploys the same pattern (shipped). Cordeil
  et al., IEEE TVCG 2017 (lab) found headsets support collaborative network analysis at least
  as well as a CAVE.
- **Weaknesses.** It is not parity. It needs desktop authoring that tier 1 does not have, and a
  stored tour format is a one-way door.
- **Verdict.** Viable 5 of 5; usability 5.4, the highest score, for a deliberately narrow job.
- **Sources:** Gugenheimer et al., ShareVR, CHI 2017 (lab); Cordeil et al., TVCG 2017 (lab);
  Molina Leon et al., IEEE TVCG 2024 (lab, 10 pairs); DiBenigno et al., Frontiers in Psychology
  2021 (Flow Immersive deployment data).

### 4.8 Voice: dictation now, a speech service only on demand (priority 9)

**How it works.** Voice accelerates a complete pointing UI and is never the only path.

**Phase 1 is already part of the foundation.** The user presses Y, then Find, and says "find
Medici" into the system keyboard's dictation. The deterministic resolver handles names and a
small grammar ("run PageRank", "color by PageRank", "frame this"). Anything it cannot parse
falls back to graphty-element's existing AI commands (run algorithm, set layout, zoom to nodes,
find and style), after an audit that they paint only their own results.

**Phase 2** comes only if dictation latency, or the keyboard covering the scene, measures
badly. It adds an element provider interface with no default provider: graphty.app is a static
site, and many analysts cannot send audio to a third party. It would use:

- a remote speech service on standalone headsets (an on-device model would compete with
  rendering);
- a talk toggle rather than a hold;
- a transcript card with the mic level;
- numbered candidates picked by voice, stick or ray;
- aliases for hard node names;
- confirmation for bulk actions, and one undo step per utterance.

Gate: under 1 s for the grammar path.

| Group                                                                                             | Coverage      | How                         |
| ------------------------------------------------------------------------------------------------- | ------------- | --------------------------- |
| Find, named commands, find-and-style                                                              | faster        | dictation and the resolver  |
| Notes                                                                                             | one-liners    | dictation                   |
| Legend, layer eye, selection apply and clear, neighbors, sets, visibility, notes, pointer context | pointing only | not yet element AI commands |

- **Strengths.** The lowest-effort path for users with limited arm mobility. All 38 algorithms
  and 24 layouts are reachable by name with no extra UI. Phase 1 needs no new service.
- **Weaknesses.** Dictation is modal and US-only online. Phase 2 needs a paid service, with 2-3 s
  latency in published systems (Lee et al. 2026 measured 1.73 s for the model and database, about
  2.7 s with speech recognition). Voice fails on unusual names, speech differences and noisy
  rooms. The evidence is thin (N=10-24, novelty effects).
- **Verdict.** Viable 5 of 5; usability 3.6. Remaining objections: privacy and latency.
- **Sources:** Chen, Grubert, Kristensson, AssistVR, 2024 (lab, N=24); Lee, Chen, Yuniar,
  Bauer, Ma, arXiv 2026 (lab, N=10, Quest 3; preprint, unverified); Oviatt, CHI 1999 (lab);
  Srinivasan and Setlur, Snowy, UIST 2021 (lab); caniuse SpeechRecognition; Meta dictation help.

### 4.9 Room preset: the slates snapped to a real table and wall (priority 10)

**How it works.** This is a late AR layout preset of section 4.3, offered when the user chooses
it at AR entry; plane detection and anchors are requested only then. The Florentine graph floats
over the real table, 20-30 degrees below the horizon, and the table doubles as an arm rest. The
PageRank reading panel sits within 15 degrees of the graph. Side walls hold only occasional
reference panels, such as the legend. Anchors keep the arrangement for the next session. If no
table is found, the user is told and gets the standard layout.

| Group           | Coverage                             | How             |
| --------------- | ------------------------------------ | --------------- |
| AR              | well (placement, scale, persistence) | planes, anchors |
| Everything else | as section 4.3                       |                 |

Not for couch, small-room or most wheelchair users; a seated table variant helps some.

- **Strengths.** Large readings beside the graph, and a workspace that stays where it was left.
  It costs little once the slates exist.
- **Weaknesses.** It depends on the room and needs Space Setup. The reliability of plane labels
  and anchors in Quest Browser is unverified. It is not a parity path.
- **Verdict.** Viable 5 of 5; usability 4.0.
- **Sources:** Meta WebXR mixed reality and layers docs; Lee et al., FIESTA, IEEE TVCG 2021;
  Hubenschmid et al., DataHop, UIST 2020 (qualitative, N=6).

## 5. Comparison

Usability is the mean of five expert scores (1-7) from the final round; viability counts
reviewers who rated an option viable as is or with changes.

| #   | Option                                    | Main input                 | Parity route          | Core functions in headset             | Build size               | Viable | Usability | Best evidence                                  |
| --- | ----------------------------------------- | -------------------------- | --------------------- | ------------------------------------- | ------------------------ | ------ | --------- | ---------------------------------------------- |
| 0   | Shared foundation                         | controllers, then hands    | n/a                   | navigation, find, clear, legend, undo | medium (element)         | 5/5    | 4.8       | vendor guides, RayCursor (lab)                 |
| 1   | Same-page dip-in with kit                 | controllers; page as mouse | trips to the real app | 27 of 27 at kit depth                 | medium                   | 5/5    | 5.0       | shipped handoff pattern; Tong 2025 (lab, N=18) |
| 2   | Node and command rings                    | controllers                | layer over 1 or 3     | adds speed                            | small                    | 5/5    | 5.0       | Graph2VR (lab, N=34)                           |
| 3   | Toolbar and slates                        | controllers, hands         | in-headset panels     | 27 of 27, paged                       | large                    | 5/5    | 4.8       | MRTK, visionOS (shipped)                       |
| 4   | Go in                                     | ray, stick                 | layer                 | neighborhoods                         | small to medium          | 5/5    | 4.8       | Sorger 2021 (lab)                              |
| 5   | Dip-in on a PC over Link                  | controllers plus a PC      | real desktop          | as 1, with files                      | small, if checks pass    | 5/5    | 4.2       | Tong 2025 (lab); forum reports                 |
| 6   | Slice                                     | ray, low hand              | layer                 | area selection                        | medium (shader)          | 5/5    | 3.8       | Joos 2024 (lab, N=18)                          |
| 7   | Solo tours                                | ray, two buttons           | not parity            | viewing only                          | small, needs saved views | 5/5    | 5.4       | Flow Immersive (shipped)                       |
| 8   | Voice                                     | dictation, later a service | accelerator           | find, named commands                  | small, then a service    | 5/5    | 3.6       | small labs (N=10-24)                           |
| 9   | Room preset                               | hands, controllers         | as 3                  | as 3 plus AR                          | small after 3            | 5/5    | 4.0       | vendor docs                                    |
| -   | Laptop in passthrough with sync (dropped) | laptop plus headset        | real desktop          | all                                   | large (sync)             | 3/5    | 2.8       | Tong 2025 (a virtual PC, not passthrough)      |

## 6. Recommendations for prototypes

**Where the work lives.** graphty-element owns capabilities that any consumer would need:

- input routing for consumer UI;
- hover events;
- XR Fit, Frame, Back and Reset;
- the pose kept across exit;
- the label budget;
- shader-side highlight, dim and focus;
- the selection-back stack;
- facts such as the latest results, neighbor ranks and neighbor counts by edge attribute.

An **XR app layer**, a private package in the monorepo consumed by the graphty app, draws the
toolbar, rings, cards, reading panel and notices, and owns every word, grouping and default
value. This resolves issue #835: the element publishes plumbing, not a menu. The graphty app
itself adds Enter VR, the pack list, "Finish this on the page" and the coarse-pointer mode to
the tier 1 workspace.

### Prototype 1: same-page dip-in with the node ring (controllers)

- **Question.** Can an analyst do the tier 1 core tasks (who matters most, circles of
  characters, color and size by a result, names on dots, untangle the layout, one character and
  his ties) mostly in the headset? Which functions force a trip, and how much does a trip cost?
- **Build (smallest version).**
    - The device day.
    - The first slice of the foundation.
    - The kit with three packed algorithms (Degree, PageRank, Louvain), Color by, Size by and
      Label by over the attribute list, Rerun layout and Recommended layouts, and the reading
      panel for both a measure (histogram, top 10) and a group result (count and sizes, for
      Louvain).
    - The Rows strip with eyes (show or hide each run's paint), because the run list is a core
      function; only Rows delete is deferred.
    - The node ring with Neighbors, Frame and Info, and the command ring with View and Analyze.
    - Find through the system keyboard.
    - "Finish this on the page" with trip logging.
    - Coarse-pointer mode on the page.
    - Defer the findings inbox, Rows delete and the hands profile to a second round.
    - Not tested by any prototype here: hand tracking (second round), AR entry and placement,
      and voice beyond dictation into Find.
- **Measure.**
    - Gates: trip time each way (pass under 3 s, kill above 6 s); ray hit rate at least 95% on
      coarse-pointer targets; frame time at 1k and 5k nodes with labels.
    - In the 30-minute task test: completion, trips per function, mode errors, neck pitch,
      Borg CR10 and SSQ, with the recruit mix in section 4.0.
- **Code map.**
    - Input routing and hover: a change to `cameras/XRInputHandler.ts`, which owns every button
      today.
    - Keeping the helper: a change to `exitXR()` in `xr/XRSessionManager.ts`, which disposes it.
    - Label budget: `meshes/RichTextLabel.ts` and `managers/LabelDeclutter.ts`.
    - Recommended layouts: `recommendLayout` in `session/layout.ts`.
    - Tests: extend `test/interactions/xr/` with IWER task scripts.
    - The element's corner buttons (`ui/XRUIManager.ts`) stay off in the app.
- **Next step if it works.** The second slice (hands profile, selection back) and a second
  round with hand-tracking users.

### Prototype 2: the dip-in on a PC over Quest Link

- **Question.** Does a single page on a Windows PC give PC users full parity, with desktop
  files, keyboard and tables, by alternating between the desktop view and the graph?
- **Build.** Nothing new at first: run prototype 1 on desktop Chrome over Link and work through
  the Link checks. If key events arrive while focused, echo the typed field in the session.
- **Measure.** Pass or fail for controller detection, dashboard focus behavior, key events and
  passthrough; motion-to-photon latency and judder on cable and on Air Link; trip time when
  alternating, against prototype 1's exit and re-entry.
- **Code map.** No element change beyond prototype 1. If it passes, the app's documentation
  names it as the PC path for Data and Save.

### Prototype 3: Go in, on the real graph

- **Question.** For "one character and who he is tied to", does stepping neighbor to neighbor
  with a trail beat the ring's Neighbors plus Frame in time, errors and what people remember?
- **Build.** An element focus capability (a dim factor outside a node set as one shader
  uniform, carried by a style layer the app adds and removes), neighbor ranking and paging
  facts, and the ego mode with the trail, B to step back, the Out chip and "Go back in". The
  value panel reuses prototype 1's inspector. No proxy cluster.
- **Measure.** A within-subject comparison against Neighbors plus Frame on Florentine families
  and Les Miserables: completion time, errors, recall of the neighborhood afterward, SSQ, and a
  legibility check of labels at the framed scale (which decides whether a proxy cluster is ever
  needed).
- **Code map.** The style-layer rule in the repository (appearance only through style layers)
  is kept by carrying the dim in a layer. Navigation reuses the pivot controller
  (`cameras/XRPivotCameraController.ts`).

### Prototype 4 (conditional): the first slate, chosen by trip data

- **Question.** Does a generic catalog-driven slate cut trips for the function prototype 1
  logged most (expected: the full Analyze catalog with options), at an affordable frame cost?
- **Build.** One slate primitive (typed-filter list, paging, steppers) on `@babylonjs/gui`'s 2D
  GUI on a mesh, generated from the element's catalog and option schemas, with the toolbar's
  Analyze button.
- **Measure.** Trips before and after, frame time with the slate open at 5k nodes, reading
  errors at text scales 1.0 and 1.5.
- **Code map.** Adds `@babylonjs/gui` to the XR app layer, not to graphty-element's core entry
  points. That keeps the element's Node-safe entry points free of the dependency.

## 7. Ideas considered and rejected, and open questions

### Rejected or deferred

- **Graph workbench (algorithms, layers and attributes as objects you hold), in the ImAxes
  tradition.** All five reviewers rated it not viable (usability 2.8). It cannot scale to 38
  algorithms or reach parity, and its evidence is speculative. Two ideas were kept: the layer
  list shown as a stack, and an attribute axis with brush handles as a future filter control.
  (Cordeil et al., ImAxes, UIST 2017.)
- **Generative UI with sound** (the assistant builds controls on request). All five rated it
  not viable (usability 2.0): unpredictable, untestable, and it inherits every speech problem.
  Earcons, directional pings and spoken read-out were kept for later.
- **Hands-only with a wrist menu and thumb microgestures.** It was merged into the hands
  profile. Microgestures were dropped: browser support is disputed and Meta's trained classifier
  is native-only. Meta's input hierarchy also says every function must work with controllers
  and with hands.
- **Off-hand palette in the Tilt Brush style.** Dropped after round 3. It duplicates the slates
  as a third surface to keep at parity, works only with controllers, and its evidence comes from
  short creative sessions. Snap-to-group became a ring item, and the low-hand cone moved into
  Slice. (Open Brush docs; Hackett and Skillman, GDC 2017,
  https://gdcvault.com/play/1024735/Three-Years-of-Tilt-Brush, talk.)
- **Laptop in passthrough with live session sync.** Dropped (3 of 5 viable, usability 2.8).
  Passthrough text is likely too hard to read, sync is the largest element project in the set,
  and the dip-in and PC options give the same parity without it. Sync is recorded as a future
  collaboration feature.
- **Seated desk workstation with the desk as a touch surface.** Merged into the slates as the
  desk preset. Telling a resting hand from a tap on a desk is unreliable (TouchInsight, UIST
  2024, lab).
- **Map in hand (World in Miniature) and pulled-out probes.** Deferred until frame time is
  measured, because a miniature doubles render cost. Drogemuller et al. (BDVA 2018, lab) found
  the miniature the least physically demanding way to get an overview.
- **Flick marking menus on the wrist.** Deferred to a lab comparison; repeated flicks are a
  strain pattern.
- **In-scene virtual keyboards** (ray QWERTY, drum keys, PizzaText, Babylon's VirtualKeyboard).
  The system keyboard offers swipe typing and dictation for free. Mid-air keyboards run at about
  15-20 words per minute and tire the arm (Text Entry for XR Trove, CHI 2025). Babylon's keyboard
  remains a fallback only.
- **Gaze-and-pinch on Quest.** Not exposed to WebXR. It is supported on Vision Pro only as a
  transient pointer.
- **Teleport locomotion.** Moving the graph replaces walking. Drogemuller et al. 2018 found
  teleport disorienting on graph tasks.
- **"Show all labels" in VR.** Unreadable and over the frame budget at 1k-5k nodes; replaced by
  label density.
- **On-device speech or language models on a standalone headset.** They compete with rendering
  on a mobile GPU.
- **DOM overlay for the app's panels.** It works only for handheld AR.
- **Hardware the browser cannot see, or that needs a relay:** foot pedals (except as a
  keyboard), wrist EMG (Meta Neural Band; not in WebXR), custom tangibles, and a phone as
  controller (needs a relay server). Logitech MX Ink (a 6DoF stylus with WebXR support) is a
  possible later input for the seated preset.
- **Physical metaphors** (magnets as filters, strings as path queries). Appealing, but only
  prototype-level evidence, and they overlap filters that do not exist yet in tier 1.
- **Head-gaze reticle with dwell.** Works on every headset with no hands, but it is slower than a
  ray (about 2.5 bits/s for head pointing against about 4 for controllers) and dwell fires while
  reading. Kept only as a possible accessibility path beside switch scanning. (Hansen, Rajanna,
  MacKenzie, Baekgaard, COGAIN @ ETRA 2018, lab, N=41,
  https://www.yorku.ca/mack/etra2018.html)
- **Bluetooth gamepad.** The Gamepad API is readable in Quest Browser, and a gamepad keeps the
  arms at rest, but it has no pointer, so it duplicates the controllers' stick paths. Not
  pursued; the stick-only path in section 4.3 covers the same users. (Report; Grubert et al.,
  IEEE VR 2018, lab, for the physical keyboard half.)
- **Brush, spray and paint selection and styling** (sweep the controller tip to select, paint a
  color onto nodes). Painted styles would be manual styles, which the repository forbids unless
  stored as a style layer naming node ids, and Slice already covers region selection. The
  structure-aware growth of MeTACAST is a candidate refinement for Slice. (Zhao, Isenberg et al.,
  MeTACAST, IEEE VIS 2023 / TVCG 2024, lab, https://arxiv.org/abs/2308.03616)
- **Graspable lenses and multi-focus probes** (a lens that filters or relabels what is behind
  it; a pulled-out, linked copy of a neighborhood). Deferred with the miniature, for the same
  frame cost; Go in covers the neighborhood case first. (Kluge et al., GI VR/AR workshop 2020,
  design; Zimmermann and Bruckner, IEEE VIS 2025 short paper, design plus usability study,
  https://arxiv.org/abs/2507.01140)
- **Point-and-speak ("put that there").** Not rejected: it is a natural phase 2 of voice, where
  "this" means the node under the ray at the press and "these" the selection. It waits on the
  speech service. (Bolt, SIGGRAPH 1980, demo; Wang et al., arXiv 2025, lab,
  https://arxiv.org/abs/2502.02201; Song et al., arXiv 2025, Wizard of Oz, N=15,
  https://arxiv.org/abs/2510.12156)
- **Spoken hint labels** (short codes over nearby nodes, said to pick one). Deferred with phase 2
  voice; useful for nodes whose names cannot be pronounced. (Vision Pro Voice Control "show
  numbers", shipped.)
- **A desk companion driving the headset** (a second person or tab sends commands into the
  session, as the Open Brush API does). Needs the session sync dropped above; recorded with
  collaboration. (Open Brush API, shipped, https://docs.openbrush.app/user-guide/open-brush-api)
- **UI on the hand itself and look-down menus** (buttons along the fingers, a palm menu, a menu
  pulled up from a dot below the view). Tiny targets for current finger tracking and neck strain
  if used often; the hands profile's orb at the lower edge of view takes the look-down idea in a
  lighter form. (Faleel et al., HPUI, IEEE TVCG 2021, lab; Pfeuffer et al., PalmGazer, 2023,
  https://arxiv.org/abs/2306.12402; Spatial, shipped)
- **Sonification of attribute values.** A survey shows promise (Enge et al. 2024), but there is
  no evidence for analysis tasks of this kind. Earcons are kept for later.

### Open questions

**One-way doors for the owner** (each costly to undo):

1. The published name and API of the XR app layer, if it ever leaves the monorepo as a package.
   It stays private until then.
2. A stored tour format, if solo tours are built.
3. Changing graphty-element's default XR bindings. Today both triggers grab the world; the
   recommended table moves world grab to the grip. Under the "offers choices" rule, the cleaner
   path is a remappable binding layer in the element, with the current mapping kept as the
   default and the app setting its own table. Only changing the element's default would be
   breaking.
4. Adding selection to undo, only if the selection-back stack fails in testing.

**Facts to settle on the device day.** Trip time, frame time with labels, system keyboard
behavior, Bluetooth key events, file and download behavior during a session, the palm-pinch
menu event, the Link checks, and microphone permission carried into the session.

**Design questions the prototypes answer.**

- Whether trips are cheap enough that the slates stay small.
- Whether Go in earns its place beside the ring.
- Whether analysts select spatial regions at all.
- Whether hand tracking can pick small far nodes reliably.
- Whether Mantine's popovers work under a controller ray in coarse-pointer mode.
- Scale: most published studies use graphs of about 120 nodes, so graphty must test its own
  1k-10k range.

## 8. Sources

### Academic

- Baloup, Pietrzak, Casiez. RayCursor. CHI 2019 (lab). https://dl.acm.org/doi/10.1145/3290605.3300331
- Hincapie-Ramos, Guo, Moghadasian, Irani. Consumed Endurance. CHI 2014 (lab). https://dl.acm.org/doi/10.1145/2556288.2557130 ; code https://github.com/hcilab-um/ArmFatigueCE
- Li, Tag, Dai, Crowther, Dwyer, Irani, Ens. NICER. ACM TOG 2024 (lab). https://dl.acm.org/doi/10.1145/3658230
- Montano Murillo, Subramanian, Martinez Plasencia. Erg-O. UIST 2017 (lab). https://www.researchgate.net/publication/320571295
- Kellmann et al. Graph2VR: visualization and exploration of linked data using virtual reality. Database 2024 (lab, N=34). https://pmc.ncbi.nlm.nih.gov/articles/PMC11184448/
- Tong, Li, Xia, Wong, Pong, Qu, Yang. Exploring spatial hybrid user interfaces. IEEE TVCG 2025 (lab, N=18). https://arxiv.org/abs/2502.00853
- Joos, Durdu, Wieland, Reiterer, Keim, Fuchs, Fischer. Evaluating node selection techniques for network visualizations in VR. ACM SUI 2024 (lab, N=18). https://dl.acm.org/doi/10.1145/3677386.3682102
- Bauer et al. 2023 (lab, N=20). https://arxiv.org/html/2112.10272v3
- Drogemuller, Cunningham, Walsh, Thomas, Cordeil, Ross. Evaluating navigation techniques for 3D graph visualizations in VR. BDVA 2018 (lab). https://www.researchgate.net/publication/328978788 ; journal version, J. Computer Languages 2020. https://www.sciencedirect.com/science/article/abs/pii/S2590118419300620
- Sorger et al. Egocentric network exploration. Pacific Graphics / CGF 2021 (lab). https://arxiv.org/abs/2109.09547
- Takahira et al. ACM SUI 2026 (lab, N=24; preprint, unverified). https://arxiv.org/abs/2608.27194
- Kurtenbach and Buxton. User learning and performance with marking menus. CHI 1994 (lab). https://dl.acm.org/doi/10.1145/191666.191759
- Gebhardt et al. Extended pie menus for immersive virtual environments. IEEE TVCG 2013 (lab). https://doi.org/10.1109/tvcg.2013.31
- Mundt and Mathew. NordiCHI 2020 (lab). https://dl.acm.org/doi/abs/10.1145/3419249.3420146
- Bowman and Hodges. I3D 1997 (lab). https://people.cs.vt.edu/~bowman/papers/jvlc.pdf
- Speicher et al. CHI 2018 (lab). https://dl.acm.org/doi/10.1145/3173574.3174221
- Streli et al. TouchInsight. UIST 2024 (lab, N=12). https://arxiv.org/abs/2410.05940
- Wagner Filho et al. VirtualDesk. Computer Graphics Forum 2018 (lab). https://onlinelibrary.wiley.com/doi/abs/10.1111/cgf.13430
- Zielasko et al. IEEE VR workshop 2019 (lab, N=33). https://www.vr.rwth-aachen.de/publication/02179/
- Gugenheimer et al. ShareVR. CHI 2017 (lab). https://www.uni-ulm.de/fileadmin/website_uni_ulm/iui.inst.100/1-hci/hci-paper/2017/2017-shareVr_small.pdf
- Cordeil et al. Immersive collaborative analysis of network connectivity: CAVE-style or head-mounted display? IEEE TVCG 2017 (lab). https://research.monash.edu/en/publications/immersive-collaborative-analysis-of-network-connectivity-cave-sty/
- Cordeil, Cunningham, Dwyer, Thomas, Marriott. ImAxes. UIST 2017 (lab). https://www.semanticscholar.org/paper/d67a50aea692bf3720865d292abb96c1ca408603
- Molina Leon et al. Talk to the Wall. IEEE TVCG 2024 (lab, 10 pairs). https://arxiv.org/abs/2408.03813
- Chen, Grubert, Kristensson. AssistVR. 2024 (lab, N=24). https://arxiv.org/abs/2410.21091
- Lee, Chen, Yuniar, Bauer, Ma. LLM voice interaction for immersive network analysis. arXiv 2026 (lab, N=10; preprint, unverified). https://arxiv.org/abs/2607.26526
- Oviatt. Mutual disambiguation of recognition errors in a multimodal architecture. CHI 1999 (lab). https://research.monash.edu/en/publications/mutual-disambiguation-of-recognition-errors-in-a-multimodal-archi/
- Srinivasan and Setlur. Snowy. UIST 2021 (lab). https://arxiv.org/abs/2110.04323
- Lee et al. FIESTA. IEEE TVCG 2021 (lab). https://arxiv.org/pdf/2009.00050
- Hubenschmid et al. DataHop. UIST 2020 (qualitative, N=6). https://dl.acm.org/doi/10.1145/3379337.3415878
- McGuffin, Servera, Forest. Path tracing in 2D, 3D and physicalized networks. IEEE TVCG 2024 (lab, N=34). https://arxiv.org/html/2207.11586
- Huang, Pfister, Yang. Is embodied interaction beneficial? Information Visualization 2023 (lab, N=20). https://arxiv.org/abs/2301.11516
- Bhatia et al. Text Entry for XR Trove. CHI 2025. https://arxiv.org/abs/2503.11357
- Hand tracking accuracy of Quest 2 (lab). https://pmc.ncbi.nlm.nih.gov/articles/PMC10830632/
- Enge et al. Sonification state-of-the-art report, 2024. https://arxiv.org/abs/2402.16558

### Platform documentation

- Meta WebXR hands: https://developers.meta.com/horizon/documentation/web/webxr-hands/
- Meta WebXR system keyboard: https://developers.meta.com/horizon/documentation/web/webxr-keyboard/
- Meta WebXR layers: https://developers.meta.com/horizon/documentation/web/webxr-layers/
- Meta WebXR mixed reality: https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/
- Meta Quest Browser overview: https://developers.meta.com/horizon/documentation/web/browser-overview/
- Meta hands UI best practices: https://developers.meta.com/horizon/design/hands-ui-best-practices/
- Meta input hierarchy: https://developers.meta.com/vr/design/interactions-input-hierarchy/
- Meta Quest dictation help: https://www.meta.com/help/quest/463323051789865/
- Microsoft comfort: https://learn.microsoft.com/en-us/windows/mixed-reality/design/comfort
- Microsoft typography: https://learn.microsoft.com/en-us/windows/mixed-reality/design/typography
- Microsoft near menu: https://learn.microsoft.com/en-us/windows/mixed-reality/design/near-menu
- Microsoft hand menu: https://learn.microsoft.com/en-us/windows/mixed-reality/design/hand-menu
- Android XR spatial UI: https://developer.android.com/design/ui/xr/guides/spatial-ui
- Android XR WebXR in Chrome: https://developer.android.com/develop/xr/web
- WebKit, natural input for WebXR on Vision Pro: https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/
- Babylon.js GUI3D: https://doc.babylonjs.com/features/featuresDeepDive/gui/gui3D
- W3C WebXR DOM Overlays: https://www.w3.org/TR/webxr-dom-overlays-1/
- WebXR Layers: https://immersive-web.github.io/layers/
- MDN showSaveFilePicker: https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
- caniuse SpeechRecognition: https://caniuse.com/speech-recognition
- WICG HTML-in-Canvas: https://github.com/WICG/html-in-canvas

### Products

- Open Brush tools and panels: https://docs.openbrush.app/user-guide/using-the-open-brush-tools-quick-tools-and-menu-panels
- Gravity Sketch 6.0 release: https://help.gravitysketch.com/hc/en-us/articles/11454341897245-Version-6-0-Release
- Gravity Sketch file management on the web: https://help.gravitysketch.com/hc/en-us/articles/9478091640093-File-Management
- VRNetzer, Pirch et al., Nature Communications 2021: https://www.nature.com/articles/s41467-021-22570-w
- Flow Immersive, DiBenigno et al., Frontiers in Psychology 2021: https://pmc.ncbi.nlm.nih.gov/articles/PMC8159152/
- Unity EditorXR: https://www.timoni.org/work/workwork/editorxr
- Logitech MX Ink WebXR integration: https://logitech.github.io/mxink/WebXR/WebXrIntegration.html
- Substance 3D Modeler desktop and VR, Road to VR 2021-06-24: https://roadtovr.com/adobe-substance-3d-modeler-medium-vr-modeling-pro-workflows/

### Blogs, forums and other

- WebXR over Quest Link, Meta community forum: https://communityforums.atmeta.com/discussions/dev-quest/webxr-with-a-quest-connected-to-desktop-using-link/833765
- Setting Quest Link as the OpenXR runtime, Meta community forum: https://communityforums.atmeta.com/discussions/Questions_Discussions/cannot-set-meta-quest-link-as-active-openxr-runtime-normally/1353305
- A-Frame issue 4558 (Link): https://github.com/aframevr/aframe/issues/4558
- A-Frame issue 5271 (keyboard events in a session): https://github.com/aframevr/aframe/issues/5271
- Babylon.js forum, text entry in immersive VR: https://forum.babylonjs.com/t/entering-text-in-webxr-experience-immersive-vr-mode/16389
- Babylon.js forum, microgestures: https://forum.babylonjs.com/t/hand-tracking-microgestures/60860
- Mixed News, Immersive Web SDK 1.0 gaze-and-pinch (2026-09-28): https://mixed-news.com/en/meta-immersive-web-sdk-1-0-gaze-and-pinch-webxr/
- Tilt Brush interface case study (opinion): https://blog.hamaluik.ca/posts/vr-ux-case-study-tilt-brush/
