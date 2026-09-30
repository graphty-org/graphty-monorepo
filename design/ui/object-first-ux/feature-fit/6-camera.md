# Feature fit 6: camera, view modes, 3D / XR / VR, minimap, presentation and sharing

Where every current and proposed capability in this area lands in the object-first paradigm
described in `design/ui/object-first-ux/object-model.md`. The capabilities come from
`design/ui/object-first-ux/inventory/element-capabilities.md` (sections 7, 8, 10.3 and 11) and
`design/ui/object-first-ux/inventory/app-today-and-personas.md` (the canvas toolbar, the Views
menu, the status bar, the Present panel, the top bar's Compare and Share controls). Issue
numbers are open issues in graphty-org/graphty-monorepo. Nothing here changes code.

The short version: almost nothing in this area is an object. A camera, a view mode, a headset
session and an exported picture are all ways of LOOKING at the objects, so they live in the
places Figma keeps its view controls: the mode switch at the toolbar's right end, the zoom menu
in the right panel header, the Views list above the tree, the Share button, the status bar and
the Dataset's Canvas section. That is the whole point of Figma's layout: the panels are for
what you made, and how you look at it stays off the panels. The paradigm fits this area well
because it asks so little of it. The rough edges are where a "view" wants to carry more than a
camera (bookmarks, compare, XR), and where a 2D convention (a zoom percentage, a minimap
rectangle) has no 3D meaning.

## 0. Terms

Terms from the object model that this file relies on, restated so the file stands alone:

- **Object**: a row in the left-hand tree (Dataset, Set, Group, Measure, Grouping). The only
  things the inspector edits. Nodes and edges are material, not objects.
- **Tree**: the left panel's ordered, nested list of objects. Its order is the paint order: the
  visible object nearest the top wins each visual channel it writes.
- **Fill**: an object's appearance, stored as a style layer. **Eye**: the toggle that stops an
  object painting. **Precedence**: which Fill wins where objects overlap.
- **Mask** (what is **showing**): the one visibility filter the element holds
  (`session.visibility`). Elements outside it are not drawn. **Focus**: the verb that sets the
  mask to one object's members.
- **State**: whether an object's members are up to date (current, computing, waiting, stale,
  failed, frozen).
- **View**: a row in the Views list (the slot Figma uses for Pages): a saved camera, a view mode
  and the mask in force. Not a tree row; it has no members and paints nothing.
- **Mode switch**: the four-segment control [2D | 3D | VR | AR] at the toolbar's right end, in
  the slot where Figma switches Draw / Design / Motion / Dev Mode (a 122 x 32 segmented control
  with a sliding white thumb; `design/ui/figma/bottom-toolbar/README.md` section 7).
- **Zoom menu**: the "100%" pill with a chevron in the right panel header. In Figma it holds
  zoom in / out / fit / to selection and the view toggles. Here it also holds the camera
  framings (Top, Front, Side, Isometric) and Save view.
- **Share**: the one filled blue button on the screen, in the right panel header. Its menu is
  every whole-picture export.
- **Overlay**: a surface floating over the canvas that takes no space from it (the toolbar,
  the legend, the minimap). **Dock**: a surface that takes space (the data table).
- **Palette**: the Ctrl+K command list. Every command below is also a palette row.
- **Camera state**: position, target, up vector (and orthographic bounds in 2D), the element's
  `CameraState`. **Framing** (or **camera view**): a rule for computing a camera state from the
  graph's bounding box, the element's `CameraDescriptor` (`graphty-element/src/catalog/cameras.ts`).
- **Minimize UI**: Figma's Shift+\ state where both panels unmount into two floating pills
  (`design/ui/figma/header-and-modes/README.md` section 2).

Fit words used in the table:

- **natural**: it has one obvious home in the paradigm and needs no new concept.
- **awkward**: it fits, but only after a decision or with a visible seam; section 2 says which.
- **does not fit**: the paradigm has no honest place for it; section 3 says why.

## 1. The table

Columns: what the capability is; whether it ships (from the inventory); its home in the
object-first screen; the fit; the element API it uses today or would need (gaps named); and
whether using it changes the tree, the precedence or any object's state.

### 1.1 View modes and the 2D / 3D camera

| Capability | Status | Home | Fit | Element API used or needed | Tree / precedence / state |
|---|---|---|---|---|---|
| View mode 2D / 3D | shipped | the mode switch's first two segments; key 5 toggles; the palette | natural | `el.viewMode`, `el.setViewMode()`; the layout dimension follows it (`LayoutManager.updateLayoutDimension`) | none. The tree paints the same objects in both. Section 2.1: the Dataset's Arrangement section must not offer a second Dimensions control |
| 3D orbit (left-drag orbits, pinch zooms, keys zoom) | shipped | the canvas, with the Select tool on empty space or the Hand tool (H) or Space held | natural | `OrbitInputController` | none |
| 2D pan and wheel zoom | shipped; zoom is about the centre, not the cursor (#290) | the canvas; Hand (H) or Space | natural | `TwoDInputController`; gap: cursor-anchored zoom, 3D wheel zoom, right-drag pan (#290) | none |
| Hand tool versus marquee | new in the model | Hand (H) pans or orbits; Select (V) drags a marquee on empty canvas | awkward, section 2.2 | gap (small): a pointer mode the app can set so Select-drag selects and Hand-drag pans; today drag on empty space always pans or orbits | none |
| Zoom in / out (= and -) | shipped in the app | the zoom menu; keys; the palette | natural | `el.setCameraZoom()` | none |
| Zoom to fit (0) | shipped | the zoom menu | natural | `el.zoomToFit()`, framing `fitToGraph` | none |
| Zoom to selection (F) | shipped for one node in the app | the zoom menu; also "Locate" on a node inspector and "Locate" in every Set's and Group's overflow (the model, section 4.8 and 4.2) | natural | gap (small): fit the camera to a scope or a list of ids (`fit(scope)`, `zoomToNodes(ids)` in `design/element-api/element-api-design.md` 4.8); today the app reads a mesh position and sets the target | none; for a Set row it uses the object's members as the scope |
| Camera framings: From above, From the front, From the side, Isometric, Fit | shipped in the element; Isometric is "Coming" in the app (#183) | the zoom menu, below the zoom rows; keys 7, 1, 3; the palette. Not rows in the Views list (model decision 23) | natural | `session.catalog.cameras()` filtered by `camerasForMode(mode)` so a framing that is 3D-only (front, side, isometric) is not offered in 2D; `el.applyCameraView(id)` | none |
| Custom framing plugin | shipped | appears in the zoom menu from the catalogue, no app change | natural | `docs/guide/extending/custom-cameras.md`, `cameraRegistry` | none |
| Reset camera (Shift+0) | shipped | the palette only; the zoom menu's Fit and the "Overview" view cover the everyday need | natural | `el.resetCamera()` | none |
| Camera state read / write with animation | shipped | not on the screen; the machinery under Views, Locate, video paths and the assistant's `setCameraPosition` tool | natural | `el.getCameraState()`, `el.setCameraState(state, {animate, duration, easing})` | none |
| Camera change event and the zoom readout | shipped event; the app draws no readout because it has no zoom percentage | the status bar's right end and the zoom menu's face ("100%") | awkward, section 2.3 | `camera-state-changed`; gap: a readable zoom percentage (`zoomPercent`, design 4.8) with a definition of 100% | none |
| Starting camera distance | shipped | not on the everyday screen (an element default; Settings > Defaults at most) | natural | `el.startingCameraDistance` | none |
| Animated camera and layout transitions (250 ms zoom, 300 to 1000 ms layout moves, fades on mask changes) | shipped for layout transitions; a mask change does not fade | not on the screen: element defaults. The one rule the model adds: Focus and Exit focus animate the mask change so the reader sees what left | natural | `RunOptions.transitionMs`; gap (small): a fade on `visibility.set` | none |
| World-to-screen and back | shipped | not on the screen; used by the note markers and a consumer-drawn minimap | natural | `el.worldToScreen()`, `el.screenToWorld()` | none |
| Input enable | shipped | not on the screen; the app turns pointer input off under a popover or during a pick | natural | `el.setInputEnabled(false)` | none |
| Background colour or skybox | shipped | Dataset > Canvas > Background chit (the model, section 4.1) | natural | `el.background` | none |
| Canvas theme (light / dark canvas follows the page) | proposed #291, #331 | the file menu > Settings > Appearance for the page; the Dataset > Canvas > Background row offers "Follow theme" as its first choice | natural | gap: `session.catalog.themes()` (#331) | none |
| Fullscreen | not in either inventory | the palette ("Enter fullscreen", F11 is the browser's) | natural | none needed (the browser's Fullscreen API on the app's root) | none |

### 1.2 Saved views, following and comparing

| Capability | Status | Home | Fit | Element API used or needed | Tree / precedence / state |
|---|---|---|---|---|---|
| Saved views (camera presets): save, load, list, rename, delete | shipped in the element as camera-only presets; "Save as view" is Coming in the app (#183) | the Views list above the tree: "+" saves the current camera, mode and mask; click applies; double-click renames; a View's inspector has "Update to current" (the model, section 4.7). The zoom menu's last row is "Save view" | natural | `el.saveCameraPreset`, `loadCameraPreset`, `getCameraPresets`; gap (medium): a preset that carries the view mode and the mask, bound to the dataset (`bookmark()` / `apply(preset)` returning a `ViewPreset`, design 4.8; `session.fingerprint()` says whether it applies) | changes the mask when applied (so it can put the reader in Focus on a Set); never the tree or precedence. Section 2.4 on the automatic "Overview" row and on drift |
| Export and import views as JSON | shipped | the Views section header overflow: "Export views...", "Import views..." | natural, with a seam (section 2.4) | `el.exportCameraPresets()`, `importCameraPresets()` | none |
| View bookmarks that also store filters, selection and encodings (designloom `view-bookmarks`) | proposed (designloom) | a View stores camera, mode and mask only. The tree is one and shared by every View | does not fit as specified, section 3.2 | none | none |
| Follow a node (camera tracks a moving node) | proposed (#183 app, design 4.8 `followNode`) | the node inspector's overflow "Follow"; while on, a status bar chip "Following node 12 [Stop]"; panning or orbiting by hand ends it, as ending a Figma follow does (`design/ui/figma/flows.md`) | natural | gap (small): `followNode(id or null)` | none |
| Follow selection (the app's Coming row) | proposed | folded into Follow a node; for a multi-node selection or a Set, "Locate" (frame once) is offered instead, because following a centroid is unreadable while a layout settles | natural | as above | none |
| Compare two views side by side (#186, designloom `comparison-view`) | proposed | a View's inspector: "Compare with [View v]" opens a second canvas beside the first on the same tree and the same selection, each with its own camera, mode and mask; a "Link cameras" switch in the status bar while both are open | awkward, section 2.5 | gaps (large): a second renderer bound to one session (`session/types.ts` header says a session cannot yet be attached to a second element); `linkTo(other, {pan, zoom, rotate})` (design 4.8) | none for the tree. The two canvases show the same tree with different masks |
| Compare two datasets (Condition Comparison, `design/designloom/workflows/W24.yaml` phases 1 and 2) | proposed | none in this model: the tree has one root | does not fit, section 3.1 | a second root or a network collection | would need a second Dataset row |

### 1.3 Minimap and overlays

| Capability | Status | Home | Fit | Element API used or needed | Tree / precedence / state |
|---|---|---|---|---|---|
| Minimap: whole graph at reduced scale, viewport indicator, click to centre | proposed #293; the app draws an empty box | a canvas overlay at the bottom left, toggled by M, by Dataset > Canvas > Minimap and by the palette; off by default (the model shows nothing on the canvas unasked) | natural in 2D, awkward in 3D, section 2.6 | gap (medium): an element-owned minimap or an overview API (projected points or density grid plus the viewport rectangle, with change events) (#293) | none |
| Legend overlay (L) | shipped in the app, drawn from the element's model; the element draws none (#292) | a canvas overlay at the bottom right; Dataset > Canvas > Legend; one block per visible Measure or Grouping in precedence order | natural (covered in the styling area's file; listed here because it is an overlay and goes into captures) | `session.styles.legend()`; gap: element-drawn legend (#292) | reads precedence; never changes it |
| Canvas toolbar show / hide (today's Views menu checkbox) | shipped in the app | dropped. The toolbar is always shown except in Present mode (1.5) | natural | none | none |
| Label budget (top N labels by a Measure) | shipped in the app as a load-time setting | Dataset > Canvas > Labels [Top 6 by Connections v] (the model, section 4.1); the Measure named there must be in the tree | natural | `node.label` channel through a layer whose selector is a top-N of a run; gap (small): the result-field filter "top" as a selector (#192) | the label layer is the Dataset's, below every object; a Set's own Label channel still wins on its members |
| What is drawn versus what is showing (render ceiling, performance mode) | partial: limits published, not enforced (#302) | a status bar chip "Drawing 200,000 of 350,000" only when the two differ, with the reason in its tooltip; a Dataset Summary line | natural | `DEFAULT_LIMITS`; gap: enforcement and a report of what was dropped (#302; design 4.8 `view.rendered.performanceMode.reasons`) | none |

### 1.4 XR (VR and AR)

The paradigm's rule, from the model's section 9: VR and AR are the last two segments of the mode
switch, present only when the browser reports support; entering hides the panels (Figma's
Minimize UI); the element's in-headset UI takes over. A headset is a way of looking at the
objects, not a second application. The app design's XR contract
(`design/ui/app-shell-progressive-disclosure-design.md` section 5.9) already says the same
thing for the rail-and-panels shell and most of it transfers unchanged.

| Capability | Status | Home | Fit | Element API used or needed | Tree / precedence / state |
|---|---|---|---|---|---|
| Enter VR / AR | shipped in the element; the app's rows are no-ops | the VR and AR segments of the mode switch; the palette | natural | `el.setViewMode("vr" or "ar")`, `el.exitXR()` | none. Entry carries the picture as painted: the tree, the mask, the selection |
| Support check | shipped | decides whether the VR and AR segments are drawn at all (drawn only when supported, never drawn disabled) | natural | `el.isVRSupported()`, `el.isARSupported()` | none |
| Entry readiness (headset, controllers, visible node count against the entry ceiling) | proposed (app design 5.9) | the segment itself: over the ceiling, the segment is disabled with the reason in its tooltip ("12,400 nodes showing; VR takes up to 10,000. Focus on a smaller set first"). No entry sheet, section 2.7 | awkward, section 2.7 | `session.status.counts.visibleNodes`; the ceilings from `session/limits.ts` | none; the reader reduces the mask (Focus) to get under the ceiling, which is the paradigm's own verb |
| Exit XR from the desk | shipped | the status bar's mode chip "VR [Exit]" while a session runs; the desktop shell stays as a mirror; Escape never leaves XR | natural | `el.exitXR()` | none |
| The element's own corner XR button and "not available" warning | shipped | off (`xr.ui.enabled: false`): the mode switch owns entry. A third-party consumer without a mode switch keeps it | natural | `xr.ui` config | none |
| Reference space, optional features, hand tracking, controllers, near interaction, z-axis amplification, teleportation | shipped | the file menu > Settings > XR (comfort and input); not on the everyday screen | natural | `xr.vr`, `xr.ar`, `xr.input`, `xr.teleportation` config | none |
| Grab and drag a node in a headset | shipped | in-headset; the element's interaction | natural | `XRInputHandler`; drag-to-pin adds the node to the "Pinned" system Set as on the desk | the Pinned system Set gains a member |
| Thumbstick and pivot camera in a headset | shipped | in-headset | natural | `XRPivotCameraController` | none |
| Selection in a headset | shipped | in-headset; the same element selection the tree rows highlight. On the desk the mirror inspector shows the node | natural | `session.selection` | none |
| The object tree in a headset (eyes, Focus, re-run, Fill) | not in any inventory | none: the tree is desk-only. The headset shows the painted picture and the element's own readings | does not fit today, section 3.3 | would need the objects API of the model's section 11 to be the element's, so the element's in-headset panel could list objects | none |
| Voice and the assistant in a headset | partial (voice input shipped) | in-headset, the element's; objects the assistant creates by voice appear in the tree with Made by "Assistant, by voice, in VR" | natural | `el.getVoiceAdapter()`, `el.aiCommand()` | adds rows |
| World-space panels, forearm anchoring, grab-and-scale the graph, ray / pinch / gaze selection, snap turn, AR passthrough framing | proposed (design 9.3, deferred to 2.1) | in-headset, the element's; nothing on the desk screen | natural | element work | none |
| Return from a session: "Back from VR" summary, an automatic XR viewpoint bookmark, a history group | proposed (app design 5.9) | the summary becomes the ordinary state of the tree (new rows, new pins, new notes are simply there); no automatic View row, section 2.8 | awkward, section 2.8 | none new; the journal (#145) for the history group | rows created in-headset carry their origin in Made by |

### 1.5 Presentation, capture and sharing

| Capability | Status | Home | Fit | Element API used or needed | Tree / precedence / state |
|---|---|---|---|---|---|
| Screenshot: PNG / JPEG / WebP, scale or exact size, transparent, quality presets, a chosen framing, wait for settle | shipped in the element; the app's Present panel calls nothing | Share > "Export image..." (a 240 px popover: Format, Scale, Framing [Current v], Transparent, Legend, Notes, then Export); the same rows in Dataset > Export; per-object "Image framed on members" in each Set's and Group's Export section | natural | `el.captureScreenshot(options)`; per-object framing needs `fit(scope)` (1.1) | the picture is the tree as painted: hidden objects (eye off) are absent, precedence decides every pixel |
| Copy image to clipboard | shipped | Share > "Copy image" (Ctrl+Shift+C, Figma's copy-as-PNG chord) | natural | `ScreenshotOptions.destination: "clipboard"` with its status codes for the failure toast | none |
| Legend in the capture | proposed #292 | the Legend checkbox in the export popover, on by default | natural | gap: `legend: true` in the capture (#292) | the legend is the visible Fills in precedence order |
| Note markers in the capture | proposed (#295 markers, #145 notes) | the Notes checkbox in the export popover | natural | gap: markers channel (#295) | none |
| SVG and PDF capture | proposed (design 4.9; `CaptureCapability.svg/pdf` declared) | the Format select, listing only formats the element can write (`capabilities.capture`); no "Coming" rows | natural | gap: vector capture | none |
| Capture plan (pixel size, nodes in frame, bytes before rendering) | proposed (design 4.9 `view.capture` plan) | the export popover's secondary line under the Export button: "2400 x 1600, 34 nodes in frame, about 1.2 MB" | natural | gap: `session.plan({op: "view.capture"})` | none |
| Video: WebM / MP4, a held camera, an orbit, or a path of waypoints with easing | shipped in the element; no app surface | Share > "Export video...": Camera [Hold, Orbit, Along views v]; "Along views" uses the Views list in its order as the waypoints, so the Views list is the storyboard; Duration; Format; Export | natural, and a good fit: Views double as the path | `el.captureAnimation(options)` with a `CameraState[]` path built from the Views; `estimateAnimationCapture` for the secondary line | none |
| Video of a layout settling or of time playback | partial (#300 for playback) | two more rows in the video popover: "While the layout settles", "While the time window plays" | natural | the layout transport (#144) and playback (#300) | none |
| Report: HTML / Markdown / PDF with statistics, rankings, groups, image, legend, methods, notes (#187, design 4.9) | proposed | Share > "Export report...": a popover with a checkbox per object in tree order plus Statistics, Image, Legend, Methods, Notes; Export. Objects come out in tree order, top first; a hidden object is unchecked by default | natural: tree order is the report order | gap: `report()` (design 4.9), built on `run.record`, `RunResult.reading()`, `session.styles.legend()` | reads the tree; changes nothing |
| Evidence bundle (ZIP of CSVs, image, journal, recipe) | proposed (design 4.9) | Share > "Export bundle..." | natural | gap: `evidenceBundle()` and the journal (#145) | none |
| Methods text and recipe | proposed | Share > "Copy methods text" (every object's Made by, tree order) and "Export recipe"; covered in the runs area's file | natural | `run.record`; the journal (#145) | none |
| Export a result (ranked list, membership CSV) | proposed (#178) | each Measure's and Grouping's Export section; covered in the runs area's file | natural | `RunResult.ranking()`; gap: exporters | none |
| Export the graph as a file (GraphML, GEXF, CSV, JSON, CX2) | proposed (every format is `canExport: false`) | Share > "Export data..." and Dataset > Export; covered in the data area's file | natural | gap: exporters (graph-io has them) | none |
| Export styles as a document | shipped | not in Share: it is the styling area's "Save look" on the Dataset; listed here only to say it is not a Share item | natural | `session.styles.toDocument()` | none |
| Project file: save and reopen the session (#301) | proposed; a one-way door on the file format | the file menu (the left panel header's chevron): "Save project", "Open"; also Ctrl+S. Not under Share, because it is the reader's own work, not a picture for someone else | natural | gap: #301, which must serialise the element-owned tree (the model, section 11) | it IS the tree, saved |
| Share as a link, collaboration, spotlight, follow a collaborator (Figma's Share) | not in any inventory; no server exists | none. Share's menu is exports only | does not fit, section 3.4 | none | none |
| Present mode (chrome-free canvas; step through Views with arrow keys) | new here; the analogue of Figma's Present and Minimize UI, and the persona need behind `design/designloom/workflows/W15.yaml` | the file menu "Present" and Shift+\ (Figma's Minimize UI key): both panels and the status bar unmount; a 48 px floating pill at the top left holds the file name and "Exit"; Left and Right arrows apply the previous and next View with the 500 ms animation; the legend stays; the toolbar's mode switch stays as a pill | natural: the Views list is the slide list, as Figma's pages are | `el.setCameraState(state, {animate})`; nothing new | none; the tree still paints, it is just not shown |
| Render settings, WebGPU rendering (#36), profiling | shipped loosely typed; #36 proposed | the file menu > Settings > Performance; a status bar chip "WebGL" or "WebGPU" only when the reader asked to see it; never on the everyday screen | natural | `el.setRenderSettings()`, `el.getStatsManager()` | none |
| Screen too small (below 1280 px) | shipped | the frame (not this area); noted because Present mode and Minimize UI are the obvious way to make a 1024 px window usable, which the app's sheet forbids today (#327) | natural | none | none |

## 2. Notes on the awkward ones

### 2.1 Two controls for one property: the mode switch and Arrangement > Dimensions

The model gives the Dataset's Arrangement section a "Dimensions [2D | 3D]" row and the toolbar
a [2D | 3D | VR | AR] switch. In the element they are one property: `viewMode` decides the
camera, and the layout's dimension follows it (`LayoutManager.updateLayoutDimension`). Two
controls for one value is the duplicate-home problem the comparison document counted against
the current app. Decision: the mode switch is the one home. The Arrangement section may show a
read-only line "Positions in 3D (follows the view)" so a reader looking at the layout knows why
the z axis exists, but it is not a control. If a layout that can only produce two dimensions
(`maxDims: 2`, such as Tree or Two Columns) is chosen in 3D, the element flattens it and the
Arrangement section says so, as it does today.

### 2.2 Hand versus Select on empty canvas

Today a drag on empty canvas pans (2D) or orbits (3D). The model's Select tool drags a marquee
on empty canvas (section 8), which is what a Figma reader expects, so panning needs its own
verb: the Hand tool (H) or Space held. That is Figma's exact split and it reads well, but it
costs 3D readers one habit: an orbit is now Hand-drag or Space-drag, not plain drag. Two ways
to soften it, both element work: (1) the element accepts a pointer mode (select or pan) so the
app never intercepts pointer events; (2) in 3D, a plain drag on empty canvas orbits and a
Shift-drag draws the marquee, since a 3D marquee (a frustum slab) is the rarer gesture. The
second keeps 3D navigation as it is today. Pick (2) unless testing shows readers reaching for
a marquee in 3D first. Either way, wheel zoom toward the cursor and a right-drag pan in 3D
(#290) are needed before the Hand tool is more than a curiosity in 3D.

### 2.3 The zoom readout in 3D

Figma's "100%" means one design pixel per screen pixel. A 2D graph can define it the same way
relative to the fit ("100% = the whole graph fills the canvas", zoom in from there), and the
zoom menu's face and the status bar can show it. In 3D an orbit camera has a distance, not a
magnification; a percentage would be a number nobody can act on. Decision: in 2D the readout
is a percentage relative to fit; in 3D the face reads the framing in force ("Isometric",
"Fit", or "3D" once the reader has orbited away from any framing) and no percentage is shown.
The element must supply both: a zoom percentage in 2D (design 4.8 `zoomPercent`) and "which
framing, if any, the camera is still at" in 3D (a small addition to `camera-state-changed`).

### 2.4 Views: the automatic "Overview" row, drift, and imported views

Three seams in one place.

- **An automatic row.** Model decision 23 says the Views list holds only what the reader
  saved, so that it does not open with five framings the reader did not make. The mocks
  (`design/ui/object-first-ux/mocks/screens.md`, screen 2) create one row, "Overview", at the
  first fit. Figma's precedent settles it: a new file has "Page 1" automatically, and one row
  is not a list of presets. Keep exactly one automatic View, "Overview", written at the first
  fit after a load, updatable like any other. Framings stay in the zoom menu.
- **Drift.** A View is a bookmark, not a container, so "current" cannot mean what it means for
  a Figma page. When the reader orbits away from the last applied View, its row keeps the
  current style but gains a small dot after its name, the same drift mark the tree uses for a
  stale object, and its inspector's "Update to current" becomes the obvious next click. The
  element's `camera-state-changed` event is enough to compute drift (compare with the saved
  state within a tolerance).
- **A View that names a Set as its mask.** Applying it is Focus on that Set. If the Set is
  deleted, the View's mask falls back to Everything and its inspector says "Showed 'Degree >
  10', which was deleted"; the same frozen treatment objects get. Importing views from JSON
  onto a different graph (`importCameraPresets`) has the same problem for the camera: a
  camera saved on one graph may frame empty space on another. The import should carry
  `session.fingerprint()` and the list should say "saved on another dataset" on a mismatch.

### 2.5 Compare

Comparison is two things that the app's Compare toggle and the designloom capability
(`design/designloom/capabilities/comparison-view.yaml`) run together:

- **Two views of one tree.** The same objects, two cameras, two masks (for instance Focus on
  Group 1 beside Focus on Group 2; or 2D beside 3D; or the whole graph beside a Set). This is
  exactly what a View's "Compare with [View v]" opens, it shares the selection so a click in
  one halos in both, and linked cameras are a switch. It needs the element to bind a second
  renderer to one session and to link two cameras, both named in `session/types.ts` and
  design 4.8 but not built. This half fits.
- **A / B / Delta statistics and "biggest differences".** Those are not views; they are a
  Measure (the per-node delta of a metric between two runs) and Findings (the graph-level
  deltas). They belong to the runs area: a "Difference" operation between two Measures that
  creates a linked Measure, whose top-N cut is the biggest-differences Set. Placing them in a
  compare screen would be a second inspector.

The seam is that Compare is opened from a View's inspector, which a reader who has never
saved a View will not think to visit. A palette command "Compare with..." and a row in the
zoom menu are the shortcuts.

### 2.6 A minimap in 3D

In 2D a minimap is a solved thing: the whole graph small, a rectangle for the viewport, click
to centre. In 3D the "viewport" is a frustum and the graph must be projected along the current
view direction, which only the element can do (that is why the app's minimap is an empty box,
#293). Decision: the minimap is drawn by the element (an opt-in overlay, as #293 proposes for
the legend too), because both the projection and the viewport shape are the element's; in 3D
it draws the projection along the view direction with a viewport outline, or nothing above a
node threshold where a density map replaces points. The app's part is the M key and the
switch. Until the element has it, the model shows no minimap at all rather than a placeholder.

### 2.7 XR entry without a sheet

The app design (section 5.9) puts a flat entry sheet before every session: a readiness line,
"In VR you can", "Do these at the desk", a comfort row, Cancel and Enter. The model's rule is
that no everyday action opens a modal, and Figma's mode switch simply switches. Decision: the
VR segment switches at once when the session can start. When it cannot (no headset, over the
entry ceiling of 10,000 showing nodes), the segment is disabled and its tooltip carries the
reason and the fix, which in this paradigm is a verb the reader already knows: Focus on a
smaller Set. The "In VR you can" list becomes the first-time tooltip on the segment and a row
in the Keyboard shortcuts dock. The comfort row moves to Settings > XR. What is lost is the
per-session reminder; what is gained is that entering a headset is one click like every other
mode.

### 2.8 Coming back from a headset

The app design returns from a session with a "Back from VR" toast, an automatic XR viewpoint
bookmark and a collapsible history group. In the object model the session's work is already
visible: any Set the reader promoted by voice, any pin, any note is a row or a section entry,
with Made by saying "by voice, in VR". So the summary toast says nothing the tree does not, and
the automatic bookmark breaks decision 23 (Views hold what the reader saved). Decision: on exit
the flat camera is restored, no View is written, and no toast appears; the history group is the
journal's (#145) once it exists. The one thing worth keeping is a single line in the status bar
for a few seconds, "Back from VR: 2 objects added", because a headset session is the one time
the reader could not watch the tree change.

### 2.9 "Share" that does not share

Figma's Share opens permissions and a link. Here the button's menu is exports: image, video,
data, report, bundle, methods text, recipe. The word is still right for the personas (Elena's
goal is "share a screenshot", the analyst's is "share the numbers") and it keeps the one filled
button that the comparison document asked for. But it must not grow a "Copy link" row until
there is a server behind it; a link to nothing is the "Coming" tag by another name. Two-way
door: rename to "Export" if link sharing is ruled out for good.

## 3. What does not fit

These are the capabilities the paradigm has no honest place for. Each says why, and what the
nearest thing is.

### 3.1 Two datasets side by side (Condition Comparison, phases 1 and 2)

The tree has one root, and every object is computed within it. Two networks (tumour beside
normal) are two roots, and "merge (union, intersection, difference)" across them is a data
operation, not a Set operation. Compare mode (2.5) covers one pair of views of ONE dataset,
which serves comparing two algorithms, two masks or two moments in time, but not two files.
The model's section 10 already lists a second root as next-phase. Nearest thing today: load
the two files as one graph with a source attribute, Group by source, and Compare two Views
each focused on one group. That is a workaround a reader must invent, so it stays on the
does-not-fit list.

### 3.2 View bookmarks that snapshot filters, selection and encodings

`design/designloom/capabilities/view-bookmarks.yaml` asks a bookmark to store the camera, the
active filters, the selection and the visual encodings, and to restore all of them. In this
paradigm the encodings ARE the tree, and the tree is one: restoring "colour by community" from
a bookmark would mean toggling eyes and reordering rows behind the reader's back, which is
exactly what the model forbids (nothing changes the tree silently). A View stores camera, mode
and mask, which covers the "where I stood and what I was looking at" need; the selection is
transient by decision (section 8) and a saved selection is a Set. The encoding half of the
requirement is not lost, it just lives elsewhere: two pictures of the same objects are two
Views with different masks, and two different LOOKS are the styling area's "Save look" (a style
template). What the paradigm cannot do is switch looks by clicking a View row. Nearest thing:
a View could optionally record which objects' eyes were on and offer "Also restore what was
painting" as an explicit row, applied only on click. Recommend not building it until a persona
asks for it by name.

### 3.3 The object tree inside a headset

A headset has no 240 px panel, so nothing in a session can toggle an eye, Focus on a Set, move
a row or edit a Fill. The picture the reader sees is the tree's painting, frozen at entry
except for what voice commands add. This is the app design's own contract (Style read-only,
Explore read-only) restated, and it is acceptable for a viewing mode. It stops being a limit
only when the objects API of the model's section 11 is the element's, because then the
element's in-headset panel can list objects with eyes and a Focus verb without the app
teaching it anything. Until then: does not fit, by design.

### 3.4 Link sharing and collaboration

Avatars, following a collaborator, spotlight, comment pins with authors, a link with
permissions: Figma's whole right-header row 1. There is no server, no identity and no
multi-user session in either inventory. Nothing to place. The Share button keeps its name for
the reasons in 2.9 and holds exports only.

### 3.5 A separate Report Builder screen

The designloom view V03 is a second layout with a right sidebar for composing a report. The
paradigm replaces it with Share > "Export report...", a popover whose sections are the tree's
objects in tree order. A second screen would be a mode that changes what the panels mean,
which the comparison document criticised. Does not fit as a screen; fits as a popover.

## 4. Element work this area needs, in one list

Sized as the model's section 11 sizes things. Everything else in the table ships today.

| Gap | Needed by | Size | Issue |
|---|---|---|---|
| Fit the camera to a scope or ids | Zoom to selection on a Set; Locate; per-object image export | small | design 4.8 |
| Zoom percentage in 2D; "at which framing" in 3D | the zoom readout and the zoom menu's face | small | new |
| Cursor-anchored wheel zoom; 3D wheel zoom and right-drag pan | everyday navigation; the Hand tool in 3D | medium | #290 |
| A pointer mode (select or pan) or Shift-marquee in 3D | Select versus Hand | small | new (with the marquee gap in the model) |
| A view preset carrying mode and mask, bound to the dataset | Views | medium | new; design 4.8 `bookmark()` |
| Follow a node | Follow | small | design 4.8 `followNode` |
| Second renderer on one session; linked cameras | Compare | large | #186; `session/types.ts` header |
| Element-drawn minimap or an overview API | the minimap | medium | #293 |
| Element-drawn legend in captures | the Legend checkbox | medium | #292 |
| Capture plan | the size line in the export popover | small | design 4.9 |
| SVG and PDF capture | the Format select | large | design 4.9 |
| Report, evidence bundle | Share rows | large | #187; design 4.9; #145 |
| Enforced render ceiling with a report of what was dropped | the "Drawing N of M" chip; the XR entry ceiling | medium | #302 |
| Fade on a mask change | Focus animates | small | new |
| Objects API on the session | the tree in a headset (3.3); everything else in the model | medium to large | model section 11 |
