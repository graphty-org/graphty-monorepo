# Camera views, tours, and image and video capture

This document covers how a reader of the graphty app saves cameras, jumps back to them with a key, turns them into
a video tour, and exports pictures and videos. It also covers the graphty-element API that makes all of this work
for any consumer, not only the graphty app.

Vocabulary used throughout:

- **Camera view**: a computed camera that ships with graphty-element or is registered by an extension. The
  built-in ids are `fitToGraph`, `topView`, `bottomView`, `sideView`, `frontView` and `isometric`
  (`catalog.cameras()`). It recomputes itself for whatever is drawn, and its descriptor lists the drawing modes it
  works in (`modes`).
- **Saved view**: the element's name for a named camera saved in the project (`session.views`). It is either
  **fixed** (it holds a camera state) or **following** (it holds the id of a camera view and is recomputed from it
  each time it is applied). It may carry a key. Issue #816's fuller saved view grows from it by adding fields.
- **Camera**: the graphty app's word for a saved view, everywhere a reader sees it. The element API keeps its
  spelling; it has no reader-facing words, so these are not two spellings of one thing.
- **View name**: any name the element resolves to a camera: a camera view id or a saved view name.
- **Tour**: a named, ordered list of stops saved in the project. A stop either names a view (with how long to fly
  there and how long to hold) or is a pause (how long to wait where the camera is). The app calls the list
  "Video tours".
- **Drawing mode**: the element's `getViewMode()`: `2d`, `3d`, `ar` or `vr`. The last two are immersive.
- "Preset" remains in the API as an older alias (`camera: {preset}`, the `*CameraPreset` methods) and for screenshot
  presets (print, web-share, thumbnail, documentation). New spellings use `view`.

---

## 1. Gaps this design closes

The element already has screenshots, `captureAnimation` (real-time WebM or MP4, still or along a tour), saved
views, `viewProblem`, tours, `planTour`, `playTour` and their events.

- **A flight starts from the wrong orientation.** Every 3D flight that leaves a camera placed without animation (a
  tour's first stop, a stop with no flight) first snaps to the front view and then sweeps to its target. A tour of
  Top, Isometric and Side shows Top, jumps sideways, then flies to Isometric (section 4.3).
- **The standard cameras are not data.** Front, Side, Top and Isometric are hard-coded command rows in the app with
  hard-coded keys. A reader cannot rename, delete, reorder or re-key them, and there is no Bottom.
- **Keys belong only to app commands.** A reader cannot give a saved camera a key.
- **A tour cannot wait** except by lengthening a stop's hold.
- **Camera management sits in two half places**: the Camera menu (save, step, play) and a section squeezed under the
  layer tree in the Graph panel.
- **A gap in the toolbar.** An empty 24 px slot, kept for the Stop tour button, sits between the Camera tool and
  the Mode tool, so those two are 40 px apart where every other pair is 8 px.

---

## 2. The reader's flows

A presenter jumps to angles with one key while talking (the Camera menu lists every camera with its key); saves
and names angles in Views > Cameras (or `V`); organizes them (rename, reorder, re-key, inspect, update, delete; the
starting five are cameras like any other); builds a tour in Views > Video tours from cameras and pauses; previews
it with Play (Stop, Escape or any canvas input leaves the camera where it is; a finished tour puts it back); and
exports a picture or a video from the main menu.

---

## 3. Where it lives in the app

- the toolbar **Camera menu**, for jumping: every camera, Fit, Fit selection and the camera behavior switches;
- a new rail place, **Views**, for managing cameras and editing video tours next to the live canvas;
- the existing **Export dialog**, reached from two main menu rows, for files.

### 3.1 The Views place

The rail reads Graph, Data, **Views**, Assistant (when on), Notes, with Settings at the foot. Views uses the same
glyph as the toolbar Camera tool (`GLYPHS.camera`), so the two read as one family. Like Graph and Data it has no
key; its command `place.views` ("Views") is in Quick actions with the keywords camera, tour, video, hotkey.

The place follows the Data place's pattern: a section with an `h2` holding the graph's name, then two compact-mantine
`ControlSection`s, **Cameras** then **Video tours**. Both start open. Each remembers whether it is collapsed in the
workspace store, kept across place switches and a tab reload (section 5). The place scrolls as one column, like Data; the
lists inside never scroll on their own. The left panel opens at 240 px (`PANEL_MIN`), so every row fits 240 px.

```
+ rail -+- Views ------------------------------+
| Graph |  Supply chain                        |
| Data  |  v Cameras                       [+] |  <- Save camera, tooltip "Save camera (V)"
|*Views*|  > :: Top             7   [->] [..] |  <- grip, fold, name, key, Go, row menu
|       |  > :: Bottom          9   [->] [..] |  <- in 2D: Go disabled, tooltip "3D only"
|       |  > :: Front           1   [->] [..] |
|       |  > :: Side            3   [->] [..] |
|       |  > :: Isometric           [->] [..] |
|       |  v :: Hub cluster     2   [->] [..] |  <- unfolded: inspect
|       |       Kind        Fixed             |
|       |       Mode        3D                |
|       |       Position    12.4, 3.0, -8.1   |
|       |       Target      0.2, 0.1, 0.0     |
|       |       Distance    15.2              |
|       |       Field of view  46 deg         |
|       |       Key         [2            v]  |
|       |       Update to current camera      |
|       |  v Video tours                   [+] |  <- New tour
|       |  v :: Supply walk   0:14  [>]  [..] |  <- [>] Play, [#] Stop while it plays
|       |       1 [Top          v]       [..] |
|       |         Flight [0.0 s] Hold [2.0 s] |
|       |     * 2 [Isometric    v]       [..] |  <- * playing now
|       |         Flight [2.0 s] Hold [2.0 s] |
|       |       3 Pause   [1.5 s]        [..] |
|       |       4 [Side         v]       [..] |
|       |         Flight [2.0 s] Hold [3.0 s] |
|       |       [+ Camera v]  [+ Pause]       |
|       |  > :: Exec summary  0:31  [>]  [..] |
+-------+--------------------------------------+
```

Parts are compact-mantine and Mantine defaults: `ControlSection`, `CardList` (grip drag through `onReorder`, fold,
rename, menu), `ActionRow`, `ActionIcon`, `FieldRow`, `DataRow`, `PanelField` number fields with an "s" unit,
`Select` and `Menu`. No pills and no captions. A disabled row, button or field gives its worded code as a tooltip and
an `aria-description`. Move up is `Mod+]` and Move down `Mod+[`, as in the selection editor.

**CardList is used as it is; nothing in compact-mantine changes.** Its header holds grip, fold, title (a click
renames), `aside`, folded `summary`, `header` and menu, and takes no keys. So:

- **Going to a camera is its own button**, never a click on the title: a Go `ActionIcon` in the card's `header`
  slot, tooltip "Go to Top (7)" (the key, when the camera has one, so the button also shows it) and the title's
  tooltip "Rename", so a novice who expects the name to fly learns why it did not; `aria-label` "Go to Top", drawn with an existing arrow or target glyph (no new icon art). Click or Enter/Space on it
  goes there.
- **Clicking the title renames**, as on the tour cards and in every other CardList.
- **List-local keys** (F2, Delete, Mod+], Mod+[) are read by one `keydown` listener on the section's wrapper as they
  bubble from a card's header controls, as `ViewsSection`'s tour cards do today; keys from a card's body or any
  input are ignored. Each handled key calls `preventDefault` (Mod+[ and Mod+] are Back and Forward on macOS) and is
  shown on its row-menu item.

#### Cameras

One `CardList` card per camera, in project order. The five starting cameras are not set apart: no heading, group or
style separates them from cameras the reader saved. Neither CardList passes `onRemove`, so no card draws an x.

- **Card header:** grip, fold, name (the title), the camera's key in the menu-key style in `aside` (or nothing), the
  Go `ActionIcon` (`GLYPHS.go`) in `header`, and the row menu. Go runs `applyCameraView(name, {animate: true})`. The camera applied
  last gets `aria-current="true"` on its Go button.
- **Rename:** a click on the title, F2 on a header control, or Rename in the row menu. Rename keeps the key. CardList
  closes its field before `onRename` runs and `InlineRename` has no error look, so a refused rename cannot stay open
  in an error state: the card keeps its old name, the app reports the worded code ("Name in use" for `name-taken`,
  "Reserved name" for `E_PROTECTED`, a camera view id such as `isometric`) through the workspace refusal notice
  (the `orRefusal` path `ViewsSection` uses today), and focus returns to the title button. Tours follow the same
  rule. The F2 listener calls `preventDefault`, so the global `project.rename` (also F2) does not fire.
- **Disabled** when `viewProblem(name, {saved: true})` is not null: "3D only" (a following camera whose view lacks
  the mode), "Saved in 3D" or "Saved in 2D" (a fixed camera), "Not in VR or AR", "Camera view gone" (its followed
  view was unregistered). The Go button and the menu's Go to are disabled with that reason; the card is marked `off`
  (CardList's dimmed state), keeps its menu, and can still be renamed, re-keyed or deleted.
- **Inspect** (the card unfolded; one at a time, through CardList's controlled `folded` prop). Read-only `DataRow`s, values from `session.views.get(name)` and
  the catalog, worded by the app, one decimal at most:
    - **Kind:** "Fixed", or "Recomputed from the top view" (`viewWords`' phrase for the followed camera view id,
      so renaming the camera Top to Overhead does not make it read like the camera's own name).
    - **Mode:** the modes it works in: a fixed camera's `camera.mode` (the element fills `mode` in on load for an
      older state, from the mode predicate; a state that fits both, such as `{}`, has none and reads "2D and 3D");
      a following camera's descriptor `modes`. The app guesses nothing.
    - **3D values:** Position, Target, Distance, Field of view. **2D values:** Zoom, Pan, Turn. A following camera
      shows its values as resolved now (`element.resolveCameraPreset(name)`, the documented door that resolves any
      view name, a following saved view included, to a pose; section 4.1), so they move with the graph.
    - **Key:** a `Select` (section 3.4).
    - **Update to current camera** (`ActionRow`): saves the live camera into it, in the current mode, as one undo
      step. A following camera becomes fixed: this is how a reader nudges Top a little and keeps it.
- **Row menu:**

```
Go to
Update to current camera
Rename                 F2
Key                  >        <- None, 1-4, 6-9, as the Key Select (section 3.4)
Duplicate                      <- "Top 2": same camera or follows, no key
Move up             Mod+]
Move down           Mod+[
---
Delete             Delete
```

- **Save camera** (the section's `[+]`, or `V` anywhere): saves the live camera as "Camera N" (the first free
  number, so "Camera 1" in a new project: the starting five are not named "Camera") at the end of the list, one undo
  step, then unfolds the new card and opens its rename. `nextName` accepts the word "Camera". Pressed with the Views
  place closed, `V` saves and shows the existing notice with Undo; nothing opens.
- **Delete** has no confirmation; Undo restores the camera, its place and its key. A tour stop naming a deleted
  camera stays and shows "Camera not found".
- **Empty state:** "No cameras" with a Save camera button.

#### Video tours

One `CardList` card per tour, in project order, one unfolded at a time.

- **Card header:** grip, fold, name, length in `aside` (`0:14`, from `planTour(name).totalMs`, re-planned on
  `views-changed`), a Play `ActionIcon` in `header` (tooltip "Play tour") that becomes Stop (tooltip "Stop tour
  (Esc)") while this tour plays, and the row menu. A tour that cannot play disables Play and Export video..., with
  the first problem worded ("Stop 2: Camera not found"; an empty tour's `no-stops` reads "No stops").
- **Row menu:**

```
Export video...                <- opens Export on Video with this tour chosen
Rename                 F2
Duplicate
Easing               >        <- Linear, Ease in, Ease out, Ease in and out
Move up             Mod+]
Move down           Mod+[
---
Delete             Delete
```

- **Stops** (the card unfolded):
    - A **camera stop**: its number, a `Select` (not searchable, so Delete never edits text in it) of the saved
      cameras in project order, and under it Flight and Hold
      in seconds on one line. A stop naming a camera view id directly (written through the API) shows that view's
      app word as an extra option. A stop naming a missing or unusable camera puts the `Select` in its error state
      with the worded code ("Camera not found", "3D only", "Saved in 3D").
    - A **pause**: its number, the word "Pause" and one number field, its length in seconds. The camera stays
      still for that long.
    - Stop row menu: Go to (camera stops), Move up `Mod+]`, Move down `Mod+[`, Replace with current camera (camera
      stops: saves a new "Camera N" and points the stop at it, so the old camera and other tours using it are
      unchanged), ---, Delete stop `Delete`. A stop's keys work from its "..." button and its `Select` only (never
      from a number field, where Delete deletes text); stops are not part of the card-header key listener.
- **Under the stops:**
    - **+ Camera** is a `Menu`: "Current camera" first, then a divider, then every saved camera. "Current camera"
      saves "Camera N" and appends a stop naming it in one `session.transaction`, so one undo step. A new camera stop
      flies 2.0 s and holds 2.0 s; the first stop's flight is 0 (it cuts there).
    - A camera saved by "Current camera" or Replace with current camera also appears, folded, at the end of the
      Cameras list; the status line says "Saved Camera 3" so the reader knows why the list grew.
    - **+ Pause** appends a 2.0 s pause.
    - A tour with no stops unfolds to the `+ Camera` and `+ Pause` row alone: no caption; "No stops" is only the
      disabled Play's tooltip.
- **New tour** (the section's `[+]`): appends "Tour N", empty, unfolded, with its rename open. It no longer fills
  in one stop per camera: every project now starts with five cameras, so that would always build the same tour.
- **Play** runs `playTour(name, {restoreCamera: true})`. `tour-progress` marks the playing stop with the active-row
  style and `aria-current="step"`. Editing the playing tour saves as usual; playback keeps the plan it started with.
- **Empty state:** "No tours" with a New tour button.

### 3.2 The Camera toolbar menu

```
+-----------------------------------+
| Top                            7  |  <- every camera, project order, first 12; click = fly there
| Bottom                         9  |
| Front                          1  |
| Side                           3  |
| Isometric                         |
| Hub cluster                    2  |
| Port nodes                        |  <- in 2D: disabled, reason "Saved in 3D" as the row description
|-----------------------------------|
| Fit                            0  |
| Fit selection                  F  |  <- was "Frame selection"; same command id and key
| Zoom in                        +  |  <- 2D only, as today
| Zoom out                       -  |
|-----------------------------------|
| [x] Auto-rotate                   |
| [ ] Focus selected                |
+-----------------------------------+
```

- Camera rows are **registry palette rows**, so Quick actions finds every camera, not only the first 12. With no
  cameras, that group and its divider are not drawn. With more than 12, a last row "All cameras..." runs
  `place.views`: a door to the rest, not camera management.
- Every row's enable state comes from `viewProblem`; the app only words the code.
- **Removed** from the menu, and where each went:
    - The Front, Side, Top and Isometric command rows, the app's `STANDARD_VIEWS` table and their keys: they are
      now starting cameras (section 3.3), and keys 1, 3 and 7 travel with them as camera data.
    - Save view (`V`): now **Save camera**, the Cameras section's `[+]` and Quick actions, still on `V`.
    - Previous view and Next view (`[`, `]`): deleted with their keys, not moved. Camera keys replace stepping;
      past eight keyed cameras there is no keyboard walk. The report to the owner says so (section 10).
    - The Play tour submenu: tours play from their card, and Quick actions keeps "Play tour: <name>" rows.
    - Stop tour and the Stop slot beside the Camera tool: while a tour plays, the Camera tool itself is Stop
      (section 3.5).
    - Views and tours...: the rail's Views item is the door.
- **Beyond the owner's list (open to his veto, and said so in the report to him):** Focus selected stays, and Zoom
  in and Zoom out stay in 2D. They are camera behaviors, not camera management, none has another visible button,
  and Zoom in and Zoom out are the visible buttons for `+` and `-`. Removing them is one edit each.

### 3.3 Top, Bottom, Front, Side and Isometric are starting cameras

They are ordinary saved views, written once as data when a project starts, the way the default style layers are.
They can be renamed, reordered, re-keyed and deleted like any camera. No code in the app or the element branches
on their names or on the ids they follow.

- Each **follows** its camera view (`topView` and so on) instead of holding a fixed pose, so Top still frames the
  whole graph after the data changes. Update to current camera makes it fixed.
- The app hands the list to **every new element** with `session.views.setStartingCameras(list)` (section 4.1), in
  `Workspace.tsx`'s `onElementReady`, before its first load (every project gets its own element: `<ElementHost
key={projectId}>`). The element writes the list once into a project that never had it, with no undo step
  (section 4.1), and records that it did. The app has no condition of its own:

```ts
await session.views.setStartingCameras([
    { name: "Top", follows: "topView", key: "7" },
    { name: "Bottom", follows: "bottomView", key: "9" },
    { name: "Front", follows: "frontView", key: "1" },
    { name: "Side", follows: "sideView", key: "3" },
    { name: "Isometric", follows: "isometric" },
]);
```

- **Keys:** Front, Side and Top keep the keys they have today; Bottom takes 9, the number pad's opposite-view key;
  Isometric has none, leaving more digits for the reader's own cameras.
- **Front** stays although the owner named four: it exists today with key 1, and deleting it is one key press. The
  report to the owner says so.
- **Bottom** is new: graphty-element gains the `bottomView` camera view (section 4.1).
- **Old projects** have no record of it, so the first open after this change writes the five once, after the
  reader's own cameras. A name already taken is skipped, and a key already held is dropped. Deleting, renaming or
  reordering one, saving and reopening (or reloading the tab) keeps what the reader did: the project records that
  its starting cameras were written, so they are never written again.
- **2D and 3D.** All five are written whatever the dimension. Top works in 2D and 3D; Bottom, Front, Side and
  Isometric are 3D only, so in a 2D drawing they are disabled with "3D only" and work again in 3D. Switching modes
  never rewrites or hides a camera. The cost: a reader who only works in 2D sees four of five starting cameras
  greyed out until deleting them (section 10).

### 3.4 Camera keys

- **Which keys.** The Key `Select` offers None, then the digits `1 2 3 4 6 7 8 9`. `0` is Fit and `5` the 2D/3D
  switch, so they are never offered, and a test asserts that no app command other than the eight camera-key
  commands takes one of those digits. Letters and modifier chords are out of scope (section 11); the element stores
  keys as opaque strings, so widening the set later is an app edit.
- **Conflicts.** A digit another camera holds is listed with its holder ("7 -- Top"). Picking it moves the key:
  `session.views.setKey` takes it from the other camera in the same undo step, and the app announces "Moved key 7
  from Top to Hub cluster".
- **Binding.** Eight app commands, `camera.key-1` ... `camera.key-9` (generated from the digit list, hidden from
  Quick actions, which lists the cameras themselves), each hold one digit: the command registry passes no key to
  `run`, so one command cannot tell digits apart. A press finds the saved view whose `key` is that digit and applies
  it, animated, like a menu row. A digit no camera holds does nothing and says nothing. It never fires while typing
  in a field, and is suspended while immersive.
- **Visible buttons.** Each camera's key is printed on its Camera menu row, its Views card and its Quick actions row.
- A key outside the eight digits (written through the API by another consumer) is shown but not bound; the Key
  `Select` shows it in its error state, "Not a camera key".

### 3.5 The toolbar while a tour plays, and the gap

- The **Stop slot is deleted** (`StopTourSlot` in `WorkspaceToolbar.tsx` and `.ws-stop-tour-slot` in
  `toolbar.css`). It was an empty 24 px span reserved between Camera and Mode so the toolbar would not shift; with
  the row's 8 px gap it put 40 px between them. Now every neighbor pair is 8 px apart.
- While a tour plays outside a recording (`tourProgress !== null` and no recording running), the **Camera tool is
  Stop**: a stop glyph, tooltip "Stop tour (Esc)",
  `aria-label` "Stop tour", and a click runs `tour.stop` instead of opening the menu. The tool keeps its 32 px, so
  nothing shifts, and the Escape key has a visible button exactly while it applies. While a recording runs, the
  Export dialog's modal overlay covers the toolbar, its own Stop button stops the recording, and the Camera tool
  stays the Camera tool. So the Camera menu cannot be opened mid-tour; that is not a loss, since a camera key or any
  canvas input already ends the tour.
- Escape stops the tour only after inner things had their turn (`isPanelEscape` in `keys/keys.ts`): field typing, an
  open `Select` list, a menu or a dialog take it first, so closing a stop's camera list while previewing does not
  end the preview.

### 3.6 Main menu (top left)

```
| Save                                 Mod+S  |
| Save as...                     Shift+Mod+S  |
| Save a copy...                              |
| Export image...                             |  <- new: file.export-image, always opens on Image
| Export video...                             |  <- new: file.export-video, always opens on Video
| Export...                            Mod+E  |  <- unchanged: Image, or Nodes/Edges when the table dock is open
```

Both new rows open the Export dialog on that output, share `file.export`'s disabled reasons, are in Quick actions
and have no keys; the Image row is kept beside Export... because readers look for "image" by name. The store's `exportOn` (with `"video"`) and `exportTour` already exist.

### 3.7 Export dialog: Image

```
| What to export |  Preset      [To share                  v]                |
|  > Image       |  Camera      [Current camera            v]                |
|    Video       |  Size        [1x 1280x720 | 2x 2560x1440 | 4x ... ]       |
|    Data ...    |  Format      [PNG | JPEG | WebP]                          |
|                |  Background  [Canvas color | Transparent]                |
|                |  Legend      [x]  Corner [Bottom right v]                |
```

- **Camera**: Current camera, then the saved cameras in project order. An unusable one is disabled with its worded
  `viewProblem` code. The choice is passed as `camera: {view}`.
- **Size** labels show pixels from the new `getCanvasSize()`.
- **Legend** becomes an explicit checkbox with a corner. It defaults on when the legend is shown on the canvas.
- **Transparent** is allowed for PNG and WebP, matching the element's rule.

### 3.8 Export dialog: Video

```
| What to export |  Motion      [Tour | Still]                               |
|    Image       |  Tour        [Supply risk walk          v]   (Tour)       |
|  > Video       |  Camera      [Current camera            v]   (Still)      |
|    Data ...    |  Length      0:14 (Tour, read only) | [3 | 5 | 10 s] (Still)|
|                |  Frame rate  [30 | 60]                                    |
|                |  Frames      420                                          |
|                |  [==============>                    ]  Stop 2 of 4       |
|                |                                       [Stop] [Record]     |
```

- **Motion**: a tour, or a still camera for a set length.
- **Tour** picks a saved tour. With none, it is disabled with "No tours yet", Motion starts on Still, and a "Video
  tours..." `ActionRow` closes the dialog and opens the Views place on Video tours with focus on New tour.
- **Length** for a tour is `planTour().totalMs`, read only. **Still** has a Camera list and keeps 3 / 5 / 10 s.
- **Frames** is a plain value row from `estimateAnimationCapture`. When `likelyToDropFrames` is true the app words
  that fact: warning color, focusable, words through `aria-describedby` and a tooltip, so not color alone.
- **Progress** is a `Progress` bar from `animation-progress`; the stop label reads `tour-progress`.
- **While recording** the app passes `motion: "authored"`, and when `isMotionReduced()` covers the canvas with an
  opaque layer so the reader's screen does not move.
- **Escape and closing.** While recording, Escape and the close button act as Stop: the first Escape cancels
  (`E_CANCELLED`) and the dialog stays open; a second closes it. Any other close cancels first, so nothing records
  unseen.
- **Recent**: a video entry whose tour was renamed or deleted shows the Tour select in error, "Tour not found".
- **Deleted:** the views `MultiSelect`, its "2 or more" rule, the even split, the app's default tour, and the
  `FramesChip` pill.

---

## 4. graphty-element API changes

Additive changes need no approval. Breaking changes land as ordinary `feat`/`fix` commits while nothing outside
consumes the packages, and each commit message lists, under "Changed for callers", the items marked **breaking**.

### 4.1 Views and the drawing mode

```ts
// src/camera/types.ts -- ADDITIVE
interface CameraState {
    /** Drawing mode this state belongs to. getCameraState() writes it in 2d and 3d. */
    mode?: "2d" | "3d";
    // ...existing fields
}

// Element -- ADDITIVE
viewProblem(name: string, options?: { saved?: boolean }): CodedFact | null;   // null = can be applied now
getCanvasSize(): { width: number; height: number; devicePixelRatio: number };
isMotionReduced(): boolean;                    // the live answer; event "reduced-motion-changed" {reduced}

// applyCameraView(name, {animate, duration, easing, scope}) -- already takes saved view names; the one
// documented jump door.

// session.views -- BREAKING value type (was ReadonlyMap<string, CameraState>); iterates in project order
interface SavedView {
    /** A fixed camera. Exactly one of camera and follows is present. */
    readonly camera?: CameraState;
    /** A camera view id (catalog.cameras()) this view is recomputed from each time it is applied. */
    readonly follows?: string;
    /** An opaque key chord the consumer binds; unique among saved views. */
    readonly key?: string;
}
interface SessionViews extends ReadonlyMap<string, SavedView> {
    save(views: readonly {
        name: string; camera?: CameraState; follows?: string; key?: string | null;
    }[]): Promise<void>;
    remove(names: readonly string[]): Promise<void>;
    rename(from: string, to: string): Promise<void>;                // op view.rename
    move(name: string, index: number): Promise<void>;               // op view.move
    setKey(name: string, key: string | null): Promise<void>;        // ADDITIVE, op view.key
    /** ADDITIVE. The saved views to write once into every project that never had them; null = none. */
    setStartingCameras(list: readonly StartingCamera[] | null): Promise<void>;
}
interface StartingCamera { readonly name: string; readonly follows: string; readonly key?: string }

// ProjectConfig -- ADDITIVE, false by default, saved with the project. The element sets it when it seeds;
// a consumer may also set it (true stops seeding this project; false lets the next seeding point seed again).
readonly startingCamerasWritten: boolean;

// Camera views -- ADDITIVE: "bottomView", plainName "From below", modes ["3d"]; the mirror of topView,
// looking straight up at the graph from below. It joins KNOWN_CAMERA_IDS in catalog/types.ts (so
// BUILTIN_PRESETS and the E_PROTECTED check include it), the catalog entry in catalog/cameras.ts,
// builtins.ts, and the id list in the AI CameraCommands description.

// `camera: {view: name}` -- ADDITIVE spelling in ScreenshotOptions and AnimationOptions;
// `preset` stays as an alias there and in setCameraState.
```

**Members each mode reads.** One predicate, used by `setCameraState`, `viewProblem`, `planTour`, `playTour` and
every door below:

| Mode | Members it reads                                                                          |
| ---- | ----------------------------------------------------------------------------------------- |
| 2D   | `zoom`, `pan`, `rotation`                                                                 |
| 3D   | `position`, `target`, `alpha`, `beta`, `radius`, `pivotRotation`, `cameraDistance`, `fov` |

A state fits the drawing mode when its `mode` equals it, or, with no `mode`, when it holds at least one member that
mode reads; members the mode does not read are ignored. `{}` fits both and changes nothing, as today. So `{target}`
alone is 3D only, and in 2D it is refused. `preset` resolves first, and the resolved state is judged.
`playTour`'s current rule (both `position` and `target` in 3D) is loosened to this predicate.

- **One name, one answer: camera views first.** A name resolves to a camera view (built-in or registered) when one
  holds it, and to a saved view only otherwise, as `resolveCameraPreset` does today on purpose: a camera view
  registered later gets the built-in five's protection. `viewProblem(name)`, `planTour`, `playTour`,
  `applyCameraView` and capture all judge and fly to that same view.
- **A shadowed saved view** (a camera view registered later took its name) can no longer be reached by name.
  `viewProblem(name, {saved: true})` judges the saved view itself: `E_PROTECTED {name}` when a camera view holds the
  name, `E_UNKNOWN_CAMERA` when no saved view has it, else the mode checks. Lists of saved views use it; renaming
  the saved view recovers it.
- `viewProblem` returns `null` or one coded fact (section 4.7). For a camera view it reads the descriptor's
  `modes`; for a saved view it applies the predicate. `scope`, `params` and `extent` apply only to camera views.
- **`camera` optional in `save`.** The door resolves the current camera into the dispatched command, so redo and
  replay never re-read the live camera. With no camera it is refused as `view.camera` refuses; while immersive with
  `E_UNSUPPORTED {reason: "xr", mode}`, since the headset camera is not a 2D or 3D state.
- **Order.** `viewOrder: readonly string[]` is its own whole-value `ValueSlice` (key `""`, like `styles`), added to
  `ProjectState`, the `ValueSlice` union and the undo keys; `session.views` iterates in it. Save appends, remove
  takes out, `view.move` rewrites, `view.rename` replaces in place, and each undo restores it. An order-only change
  reports `project:changed` slice `"views"`. A file without order loads in file order.
- **Rename** keeps the place, rewrites every tour stop naming the view, and is one undo step.
- **Mode refusal** comes from `setCameraState`, `setCameraPosition`, `setCameraZoom`, `loadCameraPreset`,
  `applyCameraView`, `view.camera` and capture's camera; while immersive each refuses with `{reason: "xr"}`.
  Internal callers (`resetCamera`, zoom, pan shift) build states the mode reads. The element's own restore on
  leaving XR uses the internal path after `getViewMode()` has left `ar`/`vr`, so it never refuses itself.
- **linkCameras** skips a peer the predicate refuses for that frame, raising nothing.
- **Delete does not cascade.** Stops naming a deleted view stay; `planTour` reports them.
- **Reduced motion.** `isMotionReduced()` answers now (`"auto"` resolved against the system), and
  `reduced-motion-changed` fires when the answer changes; the app reads these instead of `matchMedia`.
- **Older wrappers** become `@deprecated`, naming their replacements; `resolveCameraPreset` stays.
  `saveCameraPreset` returns `Promise<void>`; `importCameraPresets` returns `{skipped: {name, code}[]}`.
- Default naming ("Camera N") stays in the app: it is presentation.
- **Fixed or following.** `save` with `follows` stores no camera. With neither `camera` nor `follows` it saves the
  live camera, as before. With both it is `E_BAD_COMMAND {reason: "conflict", options: ["camera", "follows"]}`; an
  unknown `follows` is `E_UNKNOWN_CAMERA {name}`. `save` onto an existing name replaces `camera` or `follows` and
  keeps its place and key unless `key` is given.
- **Following views resolve at apply time.** `applyCameraView(name)`, a tour stop, `captureScreenshot({camera:
{view: name}})` and a still recording resolve the followed camera view with its default scope for whatever is
  drawn then. `viewProblem(name, {saved: true})` judges the followed view's `modes`
  (`E_UNSUPPORTED {reason: "mode", name, modes, mode}`), and a followed id no longer registered is
  `E_UNKNOWN_CAMERA {name}`. `getCameraState()` never returns `follows`: a live camera is always a pose.
- **Keys** are stored, never bound: the element does not listen for them. `setKey` and `save` with a `key` take the
  key from any other saved view in the same undo step; the fact is `{code: "view.key", params: {name, key,
from?}}`. `key: null` clears it; an empty string is `E_BAD_COMMAND {reason: "empty-key"}`. Rename keeps the key,
  remove drops it, and undo restores both.
- **Starting cameras.** `setStartingCameras(list)` is a session option, not a project setting: it lasts for the
  session's life, survives opening other projects and is never saved. The project carries only the fact
  `startingCamerasWritten`. One internal write, **seed**, appends the list in order after the project's views (each
  following its view; a taken name skipped, a held key dropped) and sets `startingCamerasWritten: true`, writing
  `views`, `viewOrder` and `config` together. It runs when the option holds a list and the project's
  `startingCamerasWritten` is false, at exactly two points, each through a path that exists today:
    1. **At the call.** `setStartingCameras(list)` seeds the session's current project. A fresh element's session
       holds a blank project from birth, and that blank project is the "new project": the element has no other
       new-project moment. While history is empty and nothing is pending, the seed goes through
       `Dispatcher.seed()` into the baseline: no undo step, project not changed, no `project:changed` (so the
       Autosaver neither starts an entry nor saves), only `views-changed`. A data load does not clear views, so the
       five survive one. **Called late** (history not empty, or work pending), the seed is one ordinary undoable
       step instead, fact `{code: "view.starting", params: {names}}` on the immediate lane: it marks the project
       changed and undo removes the five and restores `startingCamerasWritten: false` as one whole step, because
       `views`, `viewOrder` and `config` are all keys of that step. A silent write is impossible there:
       `Dispatcher.seed()` refuses once history exists, and a write outside history would let a later undo
       restore a `viewOrder` without the five while their entries stayed in `views`. The app always calls first.
    2. **At the end of `project.open`**, inside the opening transaction (`starts: true`), after `clearInto` and
       after the file's views, view order, tours and settings are restored, and before that transaction becomes
       the history baseline. So "no undo step, project unchanged" follows from the existing open path, with no
       new mechanism. `readSettings` always writes `startingCamerasWritten` from the file, `false` when
       the member is absent (the `timelineHiddenAdded` precedent in `projectFile.ts`), so an old file opened in an
       already-seeded session is seeded again after its own views. The autosave recovery is a `project.open` too.
       Nothing else seeds: `config.set` of the fact only records it. Because both points read the project's own fact,
       the order of the call and an open does not matter: an open that runs before the call is seeded by the call if
       its file lacked the fact, and never if it had it. The saver writes the fact explicitly beside the settings
       (`configOf` lists keys by hand, so a `CONFIG_KEYS` entry alone would not save it), as `timelineHiddenAdded` is.
       `setStartingCameras` refuses a list with an unknown `follows` (`E_UNKNOWN_CAMERA {name}`, a consumer error found at
       once); at seed time an entry whose `follows` has since been unregistered is skipped alone. `null` (the default)
       writes nothing, so the element writes no saved views unless a consumer asks. The guide says plainly: it is "write
       once per project", and changing the list later affects only projects not yet seeded.
       `startingCamerasWritten` gets a `CONFIG_KEYS` entry (group `startingCameras`, `z.boolean().default(false)`), a
       round-trip fixture group, and a reachability entry naming it internal (a record, not a reader setting: no
       Settings control draws it); if the reachability test demands a control, it is listed as exempt with that reason.
       The late-call step adds the `view.starting` code to `HistoryCode`.
- **Older fixed states** with no `mode` get it filled in when read from a file, from the mode predicate (only 3D
  members: `"3d"`; only 2D members: `"2d"`; neither: left out, fits both).
- **Following views wherever a view is read as a pose.** `resolveCameraPreset(name)` resolves a following saved view
  to the pose its camera view gives now (today it returns `session.views.get(name)` as a `CameraState`, which is
  the wrong type once values are `SavedView`). `viewProblem`'s saved-state check and the AI `view.restore` path
  through `view.camera` read `SavedView` the same way.

**Breaking, for the commit message:** `setCameraState`, `setCameraPosition`, `setCameraZoom`, `applyCameraView`,
`view.camera`, `captureScreenshot`'s camera and a still recording's camera reject with `E_UNSUPPORTED` for a saved
view or raw state that does not fit the drawing mode, where they used to resolve and do nothing, and while
immersive, where `setCameraState` used to teleport the headset camera. `views.save` is refused while immersive.
`getCameraState()` now includes `mode` in 2D and 3D, which changes deep comparisons and persisted states.
`E_UNSUPPORTED`'s `details.reason` from `resolveCameraView` is now the code `"mode"` instead of an English sentence.
`saveCameraPreset`'s return type changes from void to a Promise. `session.views` values are now `SavedView`, not
`CameraState`: read `.camera`, and expect `follows` instead for a following view. `resolveCameraPreset` resolves a
following saved view to a pose. `view.save` and `view.remove` history entries carry facts instead of English labels.
`bottomView` becomes a protected name: a saved view already named exactly `bottomView` is shadowed (rename it).

### 4.2 Tours

```ts
// ADDITIVE, exported from the main entry
type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";
type TourStop = (ViewWaypoint & { view: string }) | TourPause;  // a stop names a view, or waits
interface TourPause { readonly pause: number }                   // ms; the camera stays where it is
interface Tour { stops: readonly TourStop[]; easing?: EasingName }

interface SessionTours extends ReadonlyMap<string, Tour> {        // session.tours, project order
    save(tours: readonly { name: string; tour: Tour }[]): Promise<void>;  // op tour.save, replaces by name
    remove(names: readonly string[]): Promise<void>;                      // op tour.remove
    rename(from: string, to: string): Promise<void>;                      // op tour.rename
    move(name: string, index: number): Promise<void>;                     // op tour.move
}
type ProjectSlice = ... | "tours";                                        // project:changed includes it
```

- `EasingName` replaces the inline union in `CameraAnimationOptions`, `AnimationOptions` and `playTour`'s options.
- **Storage.** `tours` is one whole-value slice, `readonly {name, tour}[]` in project order, written by key `""`
  as `styles` is. Tours are few and small, so every operation writes the whole list and its undo restores it
  exactly.
- The operations are undoable on the immediate lane. The editor saves the whole tour on each committed edit, so
  each edit is one undo step. A `tour.save` from another writer (an AI tool) between the app's read and its write is
  overwritten; this is a known limit.
- An unset `duration` (flight) and an unset `hold` are 0, as `ViewWaypoint` already documents. In a stop,
  `duration` is the flight to that stop; in `AnimationOptions` it is the whole recording's length. The guide says so
  next to the example.
- An empty name is `E_BAD_COMMAND {reason: "empty-name"}`; a negative or non-finite flight or hold is
  `E_OPTION_RANGE {option, stop}`. An empty tour and a stop naming an unknown view are allowed on save, so drafts
  exist and renames never fail.
- **Pauses.** A pause must be finite and at least 0, else `E_OPTION_RANGE {option: "pause", stop}`. It plans as a
  stop with `duration` 0, `hold` equal to the pause and no problem, counts toward `totalMs`, emits one
  `tour-progress` with `phase: "pause"`, and holds the camera where it is. A pause first holds the starting camera;
  a tour of pauses alone is playable. Holds stay on view stops, so a stop may hold and then a pause wait.

**Breaking, for the commit message:** a tour stop may be `{pause}`: code that reads `stop.view` must narrow first.
`tour-progress.phase` may be `"pause"`.

### 4.3 Planning, playing and progress

Planning, playing, progress events and endings are shipped and documented in `docs/guide/camera.md` ("Tours").
This change adds only the pause phase (section 4.2) and the flight fix below.

**Flight continuity.** A 3D flight turns the camera from where it really is, along the shortest arc:

- **Cause of the jump.** A cut sets `pivot.rotationQuaternion`, and Babylon then zeroes the Euler `rotation`.
  `animateOrbitCamera` in `Graph.ts` animated the Euler `rotation` from that stale (0, 0, 0), so the first animated
  frame snapped to the front view (90 degrees from Top) before sweeping to the target. It also swung yaw the long
  way and left `rotationQuaternion` null, so `PivotController.rotateAroundAxis`'s `Quaternion.Identity()` fallback
  could make a drag after a flight jump too.
- **The fix.** The start is `pivot.rotationQuaternion ?? Quaternion.FromEulerVector(pivot.rotation)`; the end is
  the target orientation as a quaternion. Each eased frame sets
  `pivot.rotationQuaternion = Quaternion.Slerp(start, end, t)`, driven by the same per-frame clock as
  `animateCameraDistance`. The Euler `rotation` is never animated, and the flight's finalize step sets
  `rotationQuaternion` to the end value (today it writes `pivot.rotation.set(...)`, which would null the
  quaternion again), so the pivot always stays in quaternion form. The per-frame slerp observer is removed at the
  end and on abort (the flight's `signal`), and finalize writes the end quaternion only after all three motions have
  ended: the pivot-position animation, the distance animation and the slerp, which run on two clocks. Measured on
  this branch: at the cut frame the quaternion is set and the Euler rotation is (0, 0, 0); on the next frame the
  quaternion is null, the camera snaps 90 degrees to the front view, and yaw then sweeps the long way.
- **One pose-to-orientation conversion, one pole rule.** The built-in camera views return `position` and `target`
  (isometric via alpha, beta and radius), never `pivotRotation`, so Top and Bottom always need a conversion. Today
  `Graph.ts` repeats it three times (`yaw = atan2(dx, dz) + pi`, `pitch = asin(dy / d)`, roll 0), and at a pole
  `atan2` of two zeros gives 0 or pi depending on the sign of the zero. One internal function,
  `orientationFromPose(position, target)` in `camera/`, replaces all three and is used by the cut path
  (`applyCameraStateImmediate`) and the flight's end alike. Pole rule: when the horizontal length of
  `position - target` is under 1e-9 of the distance, yaw is exactly pi (what the cut path gives today for +0), pitch
  +/-90 degrees, roll 0. It never reads the current camera, so the same state gives the same pose by cut or by
  flight. A state that carries `pivotRotation` (one saved by `getCameraState()`) uses it as is.
- **The pose a hold is compared against** is that orientation for the stop's resolved state, with its target and
  distance: `getCameraState()` read once right after a cut to the same state gives it, and a hold after a flight
  must equal it.
- **Guard.** `PivotController.rotateAroundAxis` falls back to `Quaternion.FromEulerVector(this.pivot.rotation)`,
  never `Identity()`.
- 2D flights are unchanged: the 2D camera has no pivot orientation, and they did not jump.

**Breaking, for the commit message:** a tour no longer follows a non-zero `cameraTransitionDuration`. Reader input
on the canvas, including a click, now ends a playing tour, and so does an outside `setCameraState`,
`applyCameraView`, `view.camera` or camera-moving screenshot. Auto-rotate and follow selection pause during a tour.
The tour refusal's `view` field is now `name`, and it gains `reason` and `modes` (section 4.7). A position and
target looking straight up or down now always gets yaw pi (it could get yaw 0 when a coordinate was -0).

### 4.4 Recording

Shipped and documented in `docs/guide/screenshots.md`. This change adds only pause stops, which record as holds,
and following saved views, which resolve when recorded.

### 4.5 Persistence in the project file

```jsonc
"graphty-session": {
  "views": [{ "name": "Top", "follows": "topView", "key": "7" },
            { "name": "Overview", "camera": { "mode": "3d", ... }, "key": "2" }],
  "tours": { "version": 1, "list": [{ "name": "Supply risk walk", "easing": "easeInOut",
             "stops": [{ "view": "Top", "duration": 0, "hold": 2000 }, { "pause": 1500 },
                       { "view": "Overview", "duration": 2000, "hold": 2000 }] }] }
}
```

- `views` is already an array, so writing it in `viewOrder` stores the order with no format change; `mode` travels
  inside `camera`. Each entry is `{name, camera?, follows?, key?}`; an older file has `camera` only and loads
  unchanged. `startingCamerasWritten` travels with the project settings; the list itself is never saved.
- **Older readers and following views.** The released reader's `view.save` stores an entry with no `camera` without
  refusing, so a following entry would load there as an empty camera, and resaving would drop `follows`. So the
  writer also writes, beside `follows`, the pose it resolves at save time as `camera` (left out when the followed
  view cannot resolve in the current mode); a reader that knows `follows` ignores that `camera`. Older readers get
  a usable fixed camera, and `views` needs no version. An entry with neither member is skipped with a report entry.
- Pauses are part of `tours` version 1: no released reader has seen a tour, so the version stays.
- `tours` is a versioned sub-object like `conditions` and `declarations`, written only when a tour exists. A reader
  skips a newer `version` with a report entry, as it does for those members. Older readers ignore the member.
- The transaction scope gains `tx.tours`. Opening a project clears tours in `clearInto` (as it clears views) and
  restores them after views through `attempt(opening, "tours", () => tx.tours.save(tours))`, so tours never carry
  from one project into the next.
- The live camera is still not saved (issue #3260).

### 4.6 Undo facts

The new operations (`view.rename`, `view.move`, `view.key`, `tour.save`, `tour.remove`, `tour.rename`, `tour.move`) carry facts
only, for example `{code: "view.rename", params: {from, to, tours}}`; the app writes "Renamed View 3 to Hub
cluster". Their codes join the `HistoryCode` union, and `UndoableDefinition.undo.label` in `Dispatcher.ts` becomes
optional when a `fact` is given. `view.save` and `view.remove` move to facts in the same change (`{names}`), so
the app words every camera history entry. Seeding stays outside undo except a late call (`view.starting`, section
4.1); jumps, plays and recordings stay outside undo.
In the app, `frame/historyWords.ts` drops its `"view.save": "saving a view"` label entry and the other `view.*`
label keys and words the facts instead; the history tests that read those labels change with it.

### 4.7 Refusal codes

One params shape per code, used alike by `viewProblem`, `planTour` and the thrown `GraphtyError`'s `details`.
`resolveCameraView` is rewritten to these shapes, and the doc comments in `errors/codes.ts` are updated to match.

| Situation                                                          | Code and params                                                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Empty view or tour name                                            | `E_BAD_COMMAND {reason: "empty-name"}`                                                        |
| View name is a camera view's id (saving, or a shadowed saved view) | `E_PROTECTED {name}` (existing)                                                               |
| Rename onto a name in use                                          | `E_BAD_COMMAND {reason: "name-taken", name}`                                                  |
| Unknown view or tour name in rename, move, remove, play            | `E_BAD_COMMAND {missing, available}` (existing shape)                                         |
| A stop or jump names a missing view                                | `E_UNKNOWN_CAMERA {name, available, stop?}` (existing, `stop` added)                          |
| Does not fit the drawing mode                                      | `E_UNSUPPORTED {reason: "mode", name?, stop?, modes, mode}`                                   |
| Immersive                                                          | `E_UNSUPPORTED {reason: "xr", mode}`                                                          |
| No camera to save or apply                                         | `E_UNSUPPORTED` as `view.camera` raises it today                                              |
| Tour with no stops                                                 | `E_BAD_COMMAND {reason: "no-stops"}`                                                          |
| Conflicting or missing recording options                           | `E_BAD_COMMAND {reason: "conflict" or "missing-option", ...}`                                 |
| Bad flight, hold or pause                                          | `E_OPTION_RANGE {option, stop}`                                                               |
| Saving both `camera` and `follows`                                 | `E_BAD_COMMAND {reason: "conflict", options: ["camera", "follows"]}`                          |
| Empty key                                                          | `E_BAD_COMMAND {reason: "empty-key"}`                                                         |
| `follows` names no camera view                                     | `E_UNKNOWN_CAMERA {name}`                                                                     |
| Recording failed                                                   | `E_CAPTURE_FAILED {reason: "hidden", "resized", "interrupted", "replaced" or "mode-changed"}` |
| Recording cancelled                                                | `E_CANCELLED` (new)                                                                           |

`modes` lists the modes the view works in (a camera view's descriptor, or the one mode a saved state fits); `name`
is absent for a raw state; `stop` is the 0-based stop index.

### 4.8 Deletions, AI tools and docs

- Delete the legacy AI `captureVideo` command and its export (breaking; it never recorded anything).
- Remove `CaptureCapability.pdf` (breaking, type only; nothing writes PDF) and the stale "Phase 5" and "Phase 7"
  notes on public methods.
- AI tools, the actual delta (`view.rename`, `tour.save` and the play action already exist in
  `ai/tools/families/view.ts`; `tour.move`, `tour.remove` and `tour.rename` stay excluded as panel state in
  `exclusions.ts`): `view.save` gains `follows` and `key`; `list_saved` reports each view's `follows` and `key`;
  `tour.list` is new; `capture.animation` takes `{tour: name}`.
- `doors.ts` lists `views.setKey` and `views.setStartingCameras`; the new op `view.key` gets a round-trip fixture,
  `view.save`'s fixture gains `follows` and `key`, and the cost coverage classifies both doors.
- `SavedView.follows` (a camera view id) and `SavedView.key` (an opaque key id) are identifiers: add them to
  `tools/api-report.mjs`' `PLAIN_STRING_ALLOWLIST` so the no-plain-string check passes.
- AI tools: the `camera` tool's `preset` takes camera view ids only, so "camera preset Top" is refused while
  "restore Top" works. Both tool descriptions say so: a saved camera, the starting five included, is applied with
  `view.restore`; `camera` is for camera view ids.
- Docs: `camera.md` gains saved views (fixed and following), keys (stored, not bound), `setStartingCameras` (write
  once per project; `startingCamerasWritten`), `resolveCameraPreset` as the door from a name to a pose, listing with
  `viewProblem(name, {saved: true})` and why (shadowing), `bottomView`, the mode table and pauses;
  `screenshots.md` gains `camera: {view}`, both meanings of `duration`, and the table of how each call ends.
- The section 4.9 example goes in the guide, in a typecheck test, and in a browser test that runs it, so a wrong
  view id fails a test.
- Run `npm run api:report` and commit the reports.

### 4.9 The simple path

```ts
import "@graphty/graphty-element";
const g = document.querySelector("graphty-element")!;
await g.waitForSettled();
await g.session.views.save([{ name: "overview" }]); // the current camera
await g.applyCameraView("topView", { animate: false }); // a built-in camera view id
await g.session.views.save([{ name: "hub" }]);
await g.session.views.save([{ name: "above", follows: "topView", key: "7" }]); // recomputed each time; key is yours to bind
await g.session.tours.save([
    {
        name: "intro",
        tour: {
            stops: [
                { view: "overview", hold: 2000 }, // no duration: jumps there
                { pause: 1000 }, // wait where the camera is
                { view: "hub", duration: 1500, hold: 3000 }, // a stop's duration is its flight
            ],
        },
    },
]);
await g.playTour("intro", { restoreCamera: true }); // preview
await g.captureAnimation({ tour: "intro", destination: { download: true } }); // 7.5 s, from the tour
await g.captureScreenshot({ camera: { view: "hub" }, destination: { download: true } });
```

`key: "7"` only stores the key: the element does not listen for it. The guide says so beside the example and shows
the short `keydown` listener that skips keys typed in a field (`input`, `textarea`, `select`, content-editable)
and otherwise finds the view with that key and calls `applyCameraView`; the issue for binding inside the element
is filed in the same pull request (section 10). `playTour` and `captureAnimation` reject with the same
coded problem `planTour` reports, so the simple path needs no check. `planTour("intro")` (here `totalMs === 7500`) is the advanced path, for editors that show lengths and
broken stops before playing.

---

## 5. graphty app changes

All paths under `graphty/src/workspace/`.

### Views place (`views-place/`, new)

- `ViewsPlace.tsx` (the place, its title and the two sections), `CamerasSection.tsx`, `ToursSection.tsx`,
  `TourStops.tsx` (camera stops and pauses), `commands.ts` (`place.views`, `camera.save`, `camera.key-1` ... `camera.key-9`) and
  `views-place.css`. `graph-place/ViewsSection.tsx` and `graph-place/TourStops.tsx` move here and are rewritten;
  the saved-view `PageList` becomes a `CardList`, because a camera card folds open to inspect.
- `GraphPlace.tsx` loses `<ViewsSection>`: the Graph place is again title, Find box, StyleTree and footer. The
  StyleTree's `min-height: 120px` and the section's height rules in `graph-place.css` are deleted.
- `frame/Rail.tsx` draws Views between Data and Assistant; its comment "Views is not drawn until it is built" goes.
- The store's `place` gains `"views"`, accepted by `stashedPlace` and reopen like the other places. `viewsOpen`
  and `viewsFocusNext` are deleted; new keys `viewsCamerasOpen` and `viewsToursOpen` start `true` and are "kept" in
  `ON_RELOAD`, so a reload keeps them. A stored `viewsOpen` is dropped, never copied, so a reader whose old section
  was collapsed still sees both new sections open. A one-shot `viewsFocus: "cameras" | "tours" | null` the place
  consumes is a `"fresh: ..."` entry in `ON_RELOAD` (that file's vocabulary), so a reload starts it at null.
- One unfolded card per list is the app holding CardList's controlled `folded` set (`autoFold` acts only on append);
  no compact-mantine change.
- `commands/registry.ts`' per-owner manifest gains a views-place owner (`place.views`, `camera.save`,
  `camera.key-1` ... `camera.key-9`) and loses the deleted `view.*` ids from the toolbar owner.
- `design/ui/framework/information-architecture.md`'s Views row moves from "Graph panel, last section" to "the
  Views place".
- All writes go through `session.views` and `session.tours`; "Current camera" and Replace with current camera are
  one `session.transaction` each. The app keeps no camera or tour state beyond which cards are unfolded, the last
  camera applied, and the playing tour from `tour-progress`.

### Toolbar (`toolbar/`)

- `commands.ts`: delete `STANDARD_VIEWS` and the `view.front`, `view.side`, `view.top`, `view.isometric`,
  `view.previous`, `view.next` and `view.views-section` commands. `view.save` becomes `camera.save` ("Save camera",
  `V`); `nextName` accepts "Camera". `view.frame-selection`'s label becomes "Fit selection" everywhere it shows,
  the canvas context menu and `inspector/kindMenus.ts` included. Camera palette rows show each camera's key. The eight `camera.key-N` commands
  of section 3.4 live in `views-place/commands.ts`.
- `WorkspaceToolbar.tsx`: the Camera menu of section 3.2; delete `StopTourSlot` and `SavedViewRows`' Remove view
  submenu; the Camera tool renders as Stop while a tour plays. `toolbar.css` loses `.ws-stop-tour-slot`.
- `viewWords.ts` keeps the words for camera view ids (the Fit row, the Kind row, a stop naming an id) and gains
  "Bottom"; its standard-row labels go.
- `frame/historyWords.ts` words the new facts: "Saved camera Hub cluster", "Renamed camera Top to Overhead",
  "Moved key 7 from Top to Hub cluster", "Added a pause to Supply walk".

### Starting cameras (`Workspace.tsx`)

- `onElementReady` awaits `session.views.setStartingCameras` with the list of section 3.3 for every new element,
  unconditionally, before that element's first load: before the effect's early return when `opening === null` and
  before the `defaults` config patch (which a reload skips), so every element gets it. This is the only place the
  five names and keys appear in the app.
- `style/coverage.ts` lists `startingCamerasWritten` as `no("a project record, not a style")`, beside
  `startingRows`.

### Export (`export/`)

- `ImageOutput.tsx` and `VideoOutput.tsx`: the "View" field becomes "Camera" and lists Current camera then the saved
  cameras; the no-tours `ActionRow` becomes "Video tours..." and opens the Views place on Video tours with focus on
  New tour. The tour card's Export video... writes `exportTour`, which the Video output's Tour select reads.

---

## 6. Accessibility and keyboard

| Key               | Command                                                     | Visible button                                                               |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `V`               | Save camera                                                 | Cameras section `[+]` (key in its tooltip); the Quick actions row prints `V` |
| `1`-`4`, `6`-`9`  | Go to the camera holding that key                           | That camera's Camera menu row and Go button                                  |
| `0`, `F`          | Fit, Fit selection                                          | Camera menu rows                                                             |
| `Escape`          | Stop tour (while one plays, after inner controls)           | The Camera tool, which is Stop while a tour plays                            |
| `F2`, `Delete`    | Rename, Delete (on a camera or tour card's header controls) | Row menus                                                                    |
| `Mod+]` / `Mod+[` | Move up / Move down (card headers; a stop's "..." button)   | Row menus                                                                    |

- `V` and the digits follow the app's switch for single-key shortcuts and never fire while typing.
- No roving tabindex: Tab walks each card's header buttons in order (grip, fold, title, Go, menu). Enter on Go goes
  to the camera; Enter on the title renames; Enter on the fold folds. Reordering never depends on dragging: every
  drag has Move up and Move down.
- The playing stop row gets `aria-current="step"`. The workspace's polite status line announces each stop change
  ("Stop 3 of 4, Port nodes"), never a timer tick. The recording bar is a `progressbar` with `aria-valuenow`.
- Disabled rows and buttons stay focusable with `aria-disabled` and their reason as tooltip and description.
- Opening the Views place from Quick actions or the Export dialog moves focus to the asked-for section; closing a row
  menu returns focus to its button.

---

## 7. Tests and stories

Every UI test drives real input (clicks, keys, typing through `userEvent` on roles and accessible names), asserts
what a reader would see through the public API, uses `assert`, and waits on conditions with no timeout of its own.

### graphty-element (vitest)

- **Session (Node):** rename keeps order, key and rewrites stops, and undo restores all three; rename onto a taken
  name or a camera view id is refused. Move reports `project:changed {slices: ["views"]}` and undoes. `setKey`
  onto a held key moves it in one undo step, and undo restores both; rename keeps the key, remove drops it, undo
  restores it. `save` with both `camera` and `follows` is refused; an unknown `follows` is `E_UNKNOWN_CAMERA`.
  `setStartingCameras` writes once in order, skips a taken name, drops a held key; calling it again writes nothing;
  the default writes nothing; an unknown `follows` is refused. **Seeding is creation, in the app's order** (option
  set on a fresh element first): with no open and no load, `canUndo` is false, `project.dirty` is false, no
  `project:changed` fires and an Autosaver writes no entry; after `loadDataset` with `history: "start"` the five
  are still there. **Late call** (after an edit): one undo step with fact `view.starting`, the project is changed,
  and undo removes the five, empties their order entries and restores `startingCamerasWritten: false`; redo
  returns them in place. **Open path** (option set first, then `project.open`): reopen after deleting Top (Top stays
  gone); after renaming Top to Overhead (no second Top); after reordering (order kept, nothing appended); recovery
  from the autosave (nothing written); an old `{name, camera}` file opened in an already-seeded session (gains the
  five after its own views, no undo step, project unchanged); the reverse order, an old file opened before the call
  (the call seeds it); a file whose `follows` id is unregistered at open (that entry skipped, the other four
  written). The saved file carries `startingCamerasWritten`. `orientationFromPose` gives yaw pi at both poles for
  +0 and -0 coordinates. A pause plans with `hold = pause` and a bad pause is `E_OPTION_RANGE`. The file
  round-trips fixed and following views, keys, pauses and `startingCamerasWritten`; an older file loads unchanged,
  with `mode` filled into its states. The four
  `tour.*` operations undo and report `"tours"`. Opening project B after A leaves no tour of A.
- **Real element (browser):**
    - **Flight continuity** (`test/browser/tour-continuity.test.ts`). While `playTour` runs, a listener on the
      scene's after-render observable records `getCameraState()` and the latest `tour-progress` every frame; the
      view direction is `normalize(target - position)` and the up vector comes from `pivotRotation`. On failure the
      message names the first bad frame and its neighbors. Tours played:
        1. Top (cut), Isometric (1 s), Side (1 s): the reported tour.
        2. Side, Top, Bottom: pole to pole.
        3. A fixed camera, then a following one, then a fixed one.
        4. A tour whose first stop flies from an arbitrary current camera.
        5. Top, a 500 ms pause, Isometric.
        6. A 2D tour: Top, Fit, Top.
    - The checks are what a slerp guarantees, judged against time, never against a mean step (the default
      easeInOut peaks at 3x its mean speed, and one slow frame on a loaded machine makes a large but correct
      step). For each flight from pose A to pose B, with q the pivot orientation per frame, `total` the quaternion
      angle from A to B, `ease` the tour's easing, t0 the timestamp of the frame where `tour-progress` reported the
      stop's flight, and each frame's timestamp the scene clock the flight is driven by:
        - **progress follows time:** `angle(A, q) / total` is within 0.05 of `ease((ts - t0) / duration)`;
        - **no snap:** the first flight frame's angle from the hold pose is at most `ease(dt / duration) * total`
          plus 0.05 of `total` (the measured 90 degree jump to the front view fails this);
        - **monotonic:** `angle(A, q)` never decreases;
        - **end:** the last frame equals B.
          Each hold and pause equals its pose (section 4.3) within 1e-3, and every hold on Top is the same pose whether
          Top was reached by a cut or a flight. No great-arc bound on the direction is asserted: a slerp between
          zero-roll poses leaves it by up to about 6 degrees. The test awaits `playTour` and counts frames.
    - **Logging, every run:** the test always writes the per-frame table (stop, phase, timestamp, direction, up,
      angle from A, expected eased progress) for tour 1 (Top, Isometric, Side) to
      `tmp/views-navbar/tour-continuity-<tour>.json`, and prints the first bad frame and its neighbors on a failure.
    - After tour 1 ends, a real 5 px pointer drag changes the direction by less than 5 degrees (no identity
      fallback in `PivotController`).
    - The flight's last frame leaves `pivot.rotationQuaternion` set (finalize writes the quaternion).
    - `bottomView` looks straight up at the graph and is refused as a saved-view name (`E_PROTECTED`). A following saved view applied after adding far-away nodes
      frames them. `viewProblem(name, {saved: true})` for a following 3D-only view in 2D is `E_UNSUPPORTED` with
      `modes`.
    - `planTour`, `viewProblem`, mode refusals, `playTour` endings and recording, as before this change.
- **The section 4.9 example** compiles against the built declarations and runs against a real element.

Recording tests run in real time, so each uses a one- or two-stop tour with holds of a few hundred milliseconds.

### graphty app (`*.real-element.test.tsx`)

- **Views place:** the rail shows Graph, Data, Views, Notes; clicking Views shows Cameras and Video tours, and each
  collapses. A new project lists Top 7, Bottom 9, Front 1, Side 3 and Isometric as ordinary cards. Click Side's Go
  button (the camera flies to Side); click Top's title and type a name (rename; the Camera menu row follows); F2 on
  a card's Go button opens rename; move Top with Mod+[; give Isometric key 7 (Top loses it; undo restores both);
  press 7 (the camera flies to Isometric); delete Front and undo (it returns to its place with key 1). Press `V`:
  "Camera 1" appears with its name open. Unfold it: Kind, Mode and the 3D values show. Update Top to the current
  camera: Kind reads Fixed. Click a card's title, then Escape: the name is unchanged. Rename Hub cluster onto
  "Top": the card keeps its name and the notice reads "Name in use". Set a key from the row menu's Key submenu.
  Switch to 2D: Bottom, Front, Side and Isometric are disabled with "3D only", Top works.
- **Video tours:** New tour, + Camera > Top, + Camera > Isometric, + Pause, + Camera > Side; edit a hold; the
  length updates; Play (the stop is marked, the Camera tool is Stop, the camera returns); play again and click the
  Camera tool (the tour ends); during Play open a stop's camera list and press Escape (the list closes, the tour
  keeps playing); drag during Play (the tour ends, the camera stays). Export video... opens Video with the tour.
- **The owner's tour, through the UI:** New tour, + Camera > Top, + Camera > Isometric, + Camera > Side, Play. A
  scene after-render listener records the same per-frame table as the element test, writes it to
  `tmp/views-navbar/app-tour-top-iso-side.json` on every run, and asserts the same no-snap and progress checks.
- **Toolbar:** with no tour and with a tour playing, the gap between the Camera tool and the Mode tool equals the
  row's flex gap, measured with `getBoundingClientRect`. The Camera menu holds exactly the rows of section 3.2.
- **Keys:** no app command other than `camera.key-1` ... `camera.key-9` holds `1`-`4` or `6`-`9`; digits typed in a
  camera's name field do not fly; a digit no camera holds changes nothing. Mod+[ on a card's Go button moves it and
  the page does not navigate; F2 on it opens rename, not the project's rename.
- **New project:** New project, then nothing: Undo is disabled, the five are listed, and closing asks nothing.
- **No special names:** a grep test over `graphty/src/workspace/toolbar/`, `views-place/` and `export/` (tests
  excluded) finds the camera view ids (`topView`, `bottomView`, `sideView`, `frontView`, `isometric`) only in
  `viewWords`, and the quoted names "Top", "Bottom", "Front", "Side" and "Isometric" nowhere; across all of
  `graphty/src` the ids `topView` ... `isometric` appear only in `Workspace.tsx`'s starting list and `viewWords`.
  The plain words top, side and so on stay legal elsewhere (label positions, `runPlacement`, style words).
- **Opening a saved file, not only a sample:** open a project file whose Top was deleted and another whose Top was
  renamed: the list is exactly what was saved. Open an old file with two `{name, camera}` views: they come first,
  then the five. Reload the tab: the list is unchanged.
- **Export:** Export image... with a saved camera exports a PNG; Export video... records a one-stop tour; Escape
  during a recording cancels it and leaves the dialog open.

### Existing tests and stories that change

- "Frame selection" becomes "Fit selection": `CanvasMenu.test.tsx`, the `inspector/kindMenus` tests,
  `FocusAndTabOrder.real-element.test.tsx`, `OpensCentered.real-element.test.tsx` (and its comments).
- The `historyWords` tests for the removed `view.*` labels, and the command registry manifest test.
- Replaced or rewritten: the toolbar `MenuSections`, `tasks` and `CameraViews` real-element tests;
  `graph-place/ViewsSection.real-element.test.tsx` (moves to the Views place); the Toolbar stories
  `CameraMenuSavedViews`, `CameraMenuSavedViews2D` and the tour-holding story (it finds the Stop tour button beside
  Camera and the menu's Stop tour row); the GraphPlace stories with Views; `VideoOutput`'s
  `useCommand("view.views-section")` door.
- Element tests that list camera ids gain `bottomView`: `test/ai/commands/CameraCommands.test.ts`,
  `test/browser/camera/camera-presets-3d.test.ts`, `test/packaging/extension-points.test.ts`,
  `test/browser/ai/commands-e2e.test.ts` and `test/ai/llm-regression/matchers.ts`.
- A story is a test: each replaced story (Toolbar `CameraMenuSavedViews`, the GraphPlace Views stories) is replaced
  by one pinning the new behavior, never just deleted, and the package's story roster records the change.
- Every app story and real-element test that mounts `Workspace` now has five saved views, which changes Quick
  actions, the Export camera lists and AI `list_saved` output; their assertions are updated, not the seeding.

### Stories (compared by visual-review)

- Workspace/Toolbar: Camera menu in 3D, and in 2D with disabled rows; the toolbar with a tour playing (Camera tool
  as Stop).
- Workspace/Views place at 240 px: a new project; a 2D project; a camera unfolded; a tour unfolded with a pause and
  a broken stop; a tour playing. These replace the Graph place's Views stories.
- Export dialog: Video with a tour, Video with no tours, Image with a saved camera chosen.

---

## 8. Acceptance criteria

The tests of section 7 pass; beyond them, a reader can check:

- [ ] The rail reads Graph, Data, Views, (Assistant), Notes; Views shows the graph's name, then Cameras, then Video
      tours, each collapsible and remembered. The Graph place has no Views section.
- [ ] A new project lists Top 7, Bottom 9, Front 1, Side 3 and Isometric as ordinary cards, each renamed,
      moved, re-keyed (Key select or the row menu's Key submenu), duplicated and deleted in one undo step; an
      untouched New project has no undo step and is not unsaved. A refused rename keeps the old name and shows
      "Name in use" or "Reserved name" in the workspace notice.
- [ ] Deleting or renaming Top survives save, reopen and reload; an old project gains the five once, after its own.
- [ ] Go or a camera's key flies there; a title click renames. The key shows on the card, the Camera menu row and
      Quick actions. Unfolding shows Kind, Mode and the 3D or 2D values. In 2D, the 3D-only cameras are disabled
      with a reason everywhere they are listed.
- [ ] Tours: New tour, + Camera (Current camera or any camera), + Pause, Flight, Hold, Move up/down, Delete,
      Rename, Duplicate, Easing, each one undo step; a broken stop disables Play with "Stop N: Camera not found".
      Play marks the playing stop; Stop, Escape, the Camera tool or a canvas drag ends it.
- [ ] The Camera menu holds exactly the cameras (first 12), Fit, Fit selection, Zoom in and Zoom out (2D),
      Auto-rotate and Focus selected. Camera and Mode are 8 px apart; while a tour plays the Camera tool is Stop.
- [ ] Top, Isometric, Side shows Top, then flies to Isometric with no front view between, then to Side; the
      per-frame tables for that tour are written on every run. A drag after a flight starts from the arrived pose.
- [ ] The element changes are in the API report and `camera.md`; the section 4.9 example compiles and runs; the
      commit message lists the breaking items; lint, typecheck, build and the touched tests pass.

---

## 9. Implementation order

Each step builds, lints and tests on its own.

1. **Element: flight continuity.** The quaternion flight and the `PivotController` fallback (section 4.3), with the
   continuity test.
2. **Element: cameras and pauses.** `SavedView` with `follows` and `key`, `setKey`, `setStartingCameras`,
   `bottomView`, pause stops, persistence, undo facts, AI tool shapes, docs, then the API report. The commit
   message lists the breaking items under "Changed for callers".
3. **App: Views place.** The rail item, the two sections, the starting cameras, camera keys, the slimmed Camera
   menu, the Camera tool as Stop, the deleted slot, and the moved Graph place, in one commit so no state ships with
   views in two places.

---

## 10. Decisions and reasons

- **The app says "camera"; the element keeps "saved view".** Renaming `session.views` would collide with `catalog.cameras()` and buys a consumer nothing.
- **Starting cameras follow their camera view**, so Top still frames the graph after the data changes.
- **`SavedView` holds `camera` or `follows`, and `key`.** They are facts about the saved entry, not a pose; `setCameraState` stays pose-only.
- **A session option plus a saved per-project fact.** A project setting holding the list seeded before the file's views were restored (issue #7843); seeding after everything is restored makes the open order not matter. The default seeds nothing.
- **The blank project is seeded into the baseline; a late call is one undo step, not a refusal.** The element has no other new-project moment, so the baseline keeps an untouched New project clean and out of the autosave. Once history exists a silent write would corrupt undo (a restored `viewOrder` without the five), and a refusal would make call order matter for consumers.
- **A refused rename uses the workspace notice, not an in-field error.** CardList closes its field before the element answers and `InlineRename` has no error look; adding one is a Figma-locked change outside this work.
- **Following views also write their resolved pose as `camera` in the file**, so the released reader loads a usable camera instead of an empty one.
- **Digits `1 2 3 4 6 7 8 9` only; the element stores keys and the app binds them, for now.** A `byKey` lookup is a one-line find and not worth API surface; element binding (`attachKeymap`) is a real gap, so its issue is filed in the same pull request and the guide's listener includes the typing guard. Eight `camera.key-N` commands because the registry's `run` gets no key.
- **Go is a button; a title click renames.** CardList (Figma-locked) renames on a title click; an `onActivate` prop would change its behavior. The title's "Rename" tooltip and Go's "Go to Top (7)" tooltip tell the two apart.
- **All five starting cameras in 2D too, four disabled.** Writing by mode would make the list depend on the mode a project started in.
- **A pause is a stop kind; Hold stays on camera stops.** Two pauses stay two.
- **Orientation flies as a quaternion slerp; the test checks progress against time.** A mean-step bound fails on easeInOut (peak 3x mean) and on a slow frame, so it would be load-sensitive; progress against `ease(elapsed / duration)` is neither. Keeping the direction on the great arc was rejected as more code for about 6 degrees a viewer does not see.
- **One pose-to-orientation conversion with a fixed pole rule**, used by cuts and flights alike.
- **The rail's Views item shares the camera glyph** with the Camera tool, a family on purpose.
- **"All cameras..." only past 12**: a door to the 13th, not management.
- **Names stay the identity of views and tours**; rename rewrites stops.
- **`viewOrder` and tours are whole values**, so undo restores order exactly.
- **One mode predicate; `{target}` is 3D only.**
- **Reader input ends a tour and keeps the reader's placement.**
- **Previous and Next view are deleted, not moved** (owner's veto open): camera keys replace them, and a Quick actions-only command would need a visible button the trimmed Camera menu no longer has.

**For the report to the owner, leading with what differs from his list, each open to his veto and one edit to
undo:** (1) the Camera menu also keeps Zoom in and Zoom out in 2D (the visible buttons for `+` and `-`) and Focus
selected (no key; it could move to Settings); (2) Front is a fifth starting camera; (3) Previous and Next view (`[`
and `]`) are deleted, not moved, so stepping through more than eight keyed cameras has no key; (4) the starting
cameras hold four of the eight camera digits, and the Key select shows a held digit as "7 -- Top". Then: the toolbar
gap was an empty 24 px slot kept for the Stop tour button between Camera and Mode; and the per-frame tables for his
Top, Isometric, Side tour, quoted from `tmp/views-navbar/`.

---

## 11. Out of scope

- Editing a camera's numbers by hand; which tours use a camera; camera thumbnails.
- Binding camera keys inside graphty-element (`attachKeymap`); its issue is filed in this work's pull request.
- Camera keys other than the digits `1`-`4` and `6`-`9`.
- Dragging tour stops (the stop list is not a CardList); an in-field rename error look (Figma-locked).
- A version guard on `tour.save` against another writer between read and write.
- A Video Size control and a "safe frame" guide; legend or background in video; WebM duration and seek cues.
- Pause, resume and seek in a recording; an option for reader input to be ignored during a tour.
- Views that also keep filters, layers and the legend (issue #816); saving the live camera (issue #3260).
- An element fact for whether auto-rotate is available (the app's 2D check is filed as an element defect).
- SVG export from a saved camera, editable file names, custom image sizes; per-stop easing; title cards, captions
  and audio; moving `captureScreenshot`'s abort to `E_CANCELLED`.
