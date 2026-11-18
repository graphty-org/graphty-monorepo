# Camera views, tours, and image and video capture

This document covers how a reader of the graphty app saves camera positions, jumps back to them, turns them into a
tour, and exports pictures and videos. It also covers the graphty-element API that makes all of this work for any
consumer, not only the graphty app.

Vocabulary used throughout:

- **Camera view**: a computed camera that ships with graphty-element or is registered by an extension. The
  built-in ids are `fitToGraph`, `topView`, `sideView`, `frontView` and `isometric` (`catalog.cameras()`). It
  recomputes itself for whatever is drawn, and its descriptor lists the drawing modes it works in (`modes`).
- **Saved view**: a fixed camera with a name, saved by the reader in the project. The framework design's "saved
  view" (issue #816: the whole working state, with title and caption) grows out of this one by adding fields to the
  same named entry; neither is renamed or replaced.
- **View name**: any name the element resolves to a camera: a camera view id or a saved view name.
- **Tour**: a named, ordered list of stops saved in the project. Each stop names a view and says how long to fly
  there and how long to hold.
- **Drawing mode**: the element's `getViewMode()`: `2d`, `3d`, `ar` or `vr`. The last two are immersive.
- "Preset" remains in the API as an older alias (`camera: {preset}`, the `*CameraPreset` methods) and for screenshot
  presets (print, web-share, thumbnail, documentation). New spellings use `view`.

---

## 1. What graphty-element can do today, and its gaps

- `captureScreenshot` (formats, size, background, legend, destination, `camera: {preset}`, `AbortSignal` rejecting
  with `AbortError`) and `exportFigure` (SVG).
- `captureAnimation` records WebM or MP4 in real time, still or along `cameraPath` stops; `tour: string[]` splits
  time evenly; `width`/`height` record at a requested size through a fixed-size copy canvas.
  `estimateAnimationCapture` returns a boolean `likelyToDropFrames`.
- Saved views: `session.views` (keyed map of `CameraState`, undoable, in the file) and seven older
  `*CameraPreset` methods. `resolveCameraPreset` asks camera views first and `session.views` only for a name no
  camera view holds, on purpose: a camera view registered later wins, as the built-in five always do.
- `playTour(stops, {easing})` refuses a wrong-mode stop with `E_UNSUPPORTED {stop, view?, mode}`; there is no tour
  object or store. `resolveCameraView`'s `E_UNSUPPORTED` carries an English `reason`.
- A reader's own camera move stops auto zoom-to-fit and marks the camera placed, so a settling layout's owed re-fit
  does not snap it back.

Gaps: a tour video lasts `duration`, not the tour, loses its opening, does not put the camera back, records a
frozen hidden tab, and auto-rotate and follow selection move the camera through holds. A saved view or raw state
from the other mode silently does nothing, and in XR `setCameraState` teleports the headset camera. The app decides
which views work in 2D and handles reduced motion itself. Several failures are uncoded, the legacy AI
`captureVideo` records nothing, and there is no rename or reorder of views, no canvas pixel size and no read of
whether motion is reduced now.

---

## 2. The reader's flows

1. **Save while exploring.** Camera > Save view (or `V`) saves "View N"; undo deletes it.
2. **Jump back.** A Camera menu row flies to the view; `[` and `]` step through saved views.
3. **Organize.** Camera > Views and tours... opens the Views section of the Graph panel: rename, reorder, update or
   delete views.
4. **Build a tour.** New tour, then fly the live canvas and Add stop; set Flight and Hold per stop in seconds.
5. **Preview.** Play flies the tour and marks the current stop. The camera returns only when the tour finishes;
   Stop, Escape, or any press, drag, scroll or camera key leaves it where it is, so a presenter can stop to answer a
   question.
6. **Export a picture.** Main menu > Export image...: a view, a size in pixels, format, background and legend.
7. **Export a video.** Main menu > Export video..., or Record... on a tour: its length comes from the tour.

---

## 3. Where it lives in the app

- the toolbar **Camera menu** for fast save and jump;
- a **Views section in the Graph panel**, for managing views and editing tours next to the live canvas (the
  information architecture's target places saved views in this panel: `design/ui/framework/information-architecture.md`, "Views");
- the existing **Export dialog**, reached from two new main menu rows, for files.

### 3.1 Camera menu (toolbar)

```
+-----------------------------------------+
| Fit                                  0  |
| Frame selection                      F  |
|-----------------------------------------|
| Front                                1  |  <- disabled with the worded viewProblem code when unusable
| Side                                 3  |
| Top                                  7  |
| Isometric                               |
|-----------------------------------------|
| Overview                                |  <- first 10 saved views, project order; click = fly there
| Hub cluster                             |
| Port nodes          Saved in 3D         |  <- disabled in 2D, reason as the row description
| Previous view                        [  |  <- always drawn; disabled "No saved views" when there are none
| Next view                            ]  |
| Save view                            V  |
| Play tour                               |  -> submenu (the component's chevron): one row per tour
| Stop tour                          Esc  |  <- drawn only while a tour plays
| Views and tours...                      |  -> opens the Graph panel's Views section
|-----------------------------------------|
| [x] Auto-rotate                         |
| [ ] Follow selection                    |
+-----------------------------------------+
```

- Fit, Front, Side, Top and Isometric are the app's words for the ids `fitToGraph`, `frontView`, `sideView`,
  `topView` and `isometric`, used wherever the app shows a camera view (never the catalog `plainName`); code always
  passes the id.
- Every view row's enable state comes from the element's `viewProblem` (section 4.1); the app only words the code.
- Saved-view rows are **registry palette rows**, so Quick actions finds them all; the menu shows the first 10.
  Saved-view rows and Play tour are not drawn when there are none; Previous view and Next view always are, since
  their keys always exist.
- **Stopping a tour.** While a tour plays, the menu has a Stop tour row and a **Stop tour** `ActionIcon` (tooltip
  "Stop tour (Esc)") fills a fixed 24 px slot next to the Camera button, reserved so the toolbar does not shift; an
  overflowing toolbar moves it to the overflow menu. Escape stops the tour only after inner things had their turn
  (`isPanelEscape` in `keys/keys.ts`): field typing, an open `Select` list, a menu or a dialog take it first, so
  closing a stop's view list while previewing does not end the preview.
- **Previous view / Next view.** The app keeps the name of the last saved view applied through any app door. `]`
  goes to the next saved view in project order after it, skipping views `viewProblem` refuses; `[` the previous.
  With no position, or a name that no longer exists, `]` goes to the first usable view and `[` to the last. No
  wrap: at the end the row is disabled with "At the last view" (or "At the first view"). The keys step saved views,
  not tour stops.

### 3.2 Views section (Graph panel)

Today `graph-place/GraphPlace.tsx` is a flex column at full height: the title button, the `FindBox`, the
`StyleTree` (`.cm-tree`, `flex: 1 1 auto`, scrolling inside itself) and a footer line. No other sections are drawn
now, and this design adds none besides Views. Views is a compact-mantine `ControlSection` (the Figma section: 40 px
header with chevron, collapsible) placed between the StyleTree and the footer, collapsed by default.

- **Height.** The StyleTree keeps `flex: 1 1 auto` and gains `min-height: 120px`. The Views section is
  `flex: none`; collapsed it is its 40 px header; expanded its body has `max-height: 50%` of the panel and
  `overflow-y: auto`, so it scrolls inside itself and the tree keeps at least half the column. Two scrollers, never
  one long page.
- **Views and tours...** opens the Graph panel, expands the section, and moves focus to its first list; the
  section's own body is the only thing scrolled (the focused row into view).
- The left panel opens at 240 px (`PANEL_MIN`), so every row fits 240 px.

```
+ rail +- Graph -------------------------------+
| Graph|  Graph  Supply chain                  |
| Data |  [Find...                         ]   |
| Notes|  Layers                           [+] |
|      |    Everything ...                     |  <- StyleTree, scrolls itself
|      |    ...                                |
|      |  v Views                  [Save view] |  <- ControlSection; body scrolls itself, max 50%
|      |    Saved views                        |
|      |     Overview                    [...] |
|      |     Hub cluster                 [...] |
|      |     Port nodes                  [...] |  <- disabled: tooltip + aria-description give the reason
|      |    Tours                   [New tour] |
|      |    v Supply risk walk 0:14  [>] [...] |  <- [>] Play / [#] Stop, ActionIcon
|      |       1 [Overview      v]       [...] |
|      |         Flight [0.0 s] Hold [2.0 s]   |  <- side by side, one line
|      |     * 2 [Hub cluster   v]       [...] |  <- * playing now
|      |         Flight [2.0 s] Hold [3.0 s]   |
|      |       [+ Add stop]                    |
|      |    > Exec summary     0:31  [>] [...] |
|      |  Add data to start                    |  <- existing footer, only with no graph
+------+---------------------------------------+

View row menu [...]        Tour row menu [...]        Stop row menu [...]
  Go to                      Record...                  Go to
  Update view                Rename          F2         Move up      Mod+]
  Rename            F2       Duplicate                  Move down    Mod+[
  Move up        Mod+]       Easing                     Replace with current camera
  Move down      Mod+[       ---                        ---
  ---                        Delete       Delete        Delete stop  Delete
  Delete        Delete
```

- Parts are compact-mantine defaults (`ControlSection`, `CardList`, `InlineRename`, `ActionRow`, `ActionIcon`,
  `FieldRow`, `NumberInput` with an "s" right section, `Select`); no pills, no captions. Move up is `Mod+]`, Move
  down `Mod+[`, as in the selection editor.
- A view row's primary action is Go to; a tour row expands in place, one at a time.
- A **disabled row** (a saved view, or a stop's `Select` in the error state: "View not found", "Saved in 3D")
  gives its worded code as a tooltip and an `aria-description`, never a caption line. A saved view whose name a
  camera view took is disabled this way; Rename recovers it. A broken stop disables Play and Record... with the
  reason.
- The stop's `Select` groups options under "Camera views" then "Saved views", the order the element resolves a
  name, and does not offer a saved view whose name a camera view took (picking it would fly to the camera view).
- **Add stop** saves the current camera as "View N" and appends a stop naming it, in one `session.transaction`, so
  one undo step. **Replace with current camera** saves a new "View N" and points the stop at it, so the old view
  and every other tour using it are unchanged.
- **New tour** creates "Tour N". With 1 to 6 saved views it seeds one stop per view (the first flight 0 s, the
  rest 2 s, holds 2 s); otherwise it starts empty.
- **Length** (0:14) is `planTour(name).totalMs`, re-planned on the element's `views-changed` event.
- **Play** runs `playTour(name, {restoreCamera: true})`; `tour-progress` marks the stop. Editing the playing tour
  saves as usual; playback continues on the plan it started with.
- **Record...** opens Export video with this tour chosen.
- **Empty states.** "No saved views" with Save view; "No tours" with New tour.

### 3.3 Main menu (top left)

```
| Save                                 Mod+S  |
| Save as...                     Shift+Mod+S  |
| Save a copy...                              |
| Export image...                             |  <- new: file.export-image, always opens on Image
| Export video...                             |  <- new: file.export-video, always opens on Video
| Export...                            Mod+E  |  <- unchanged: Image, or Nodes/Edges when the table dock is open
```

Both new rows open the existing Export dialog on that output, share `file.export`'s disabled reasons, are in Quick
actions and have no keys. In most states Export... also opens on Image; the duplicate row is kept because the
reader looks for "image" by name. The store's `exportOn` gains `"video"` and an optional tour name.

### 3.4 Export dialog: Image

```
| What to export |  Preset      [To share                  v]                |
|  > Image       |  View        [Current camera            v]                |
|    Video       |  Size        [1x 1280x720 | 2x 2560x1440 | 4x ... ]       |
|    Data ...    |  Format      [PNG | JPEG | WebP]                          |
|                |  Background  [Canvas color | Transparent]                |
|                |  Legend      [x]  Corner [Bottom right v]                |
```

- **View**: current camera, then camera views, then saved views. An unusable one is disabled with its worded
  `viewProblem` code. The choice is passed as `camera: {view}`.
- **Size** labels show pixels from the new `getCanvasSize()`.
- **Legend** becomes an explicit checkbox with a corner. It defaults on when the legend is shown on the canvas.
- **Transparent** is allowed for PNG and WebP, matching the element's rule.

### 3.5 Export dialog: Video

```
| What to export |  Camera      [Tour | Still]                               |
|    Image       |  Tour        [Supply risk walk          v]   (Tour)       |
|  > Video       |  View        [Current camera            v]   (Still)      |
|    Data ...    |  Length      0:14 (Tour, read only) | [3 | 5 | 10 s] (Still)|
|                |  Frame rate  [30 | 60]                                    |
|                |  Frames      420                                          |
|                |  [==============>                    ]  Stop 2 of 4       |
|                |                                       [Stop] [Record]     |
```

- **Tour** picks a saved tour. With none, it is disabled with "No tours yet", Camera starts on Still, and a "Views
  and tours..." `ActionRow` opens the Views section.
- **Length** for a tour is `planTour().totalMs`, read only. **Still** gains a View list and keeps 3 / 5 / 10 s.
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
- **No size control yet**, by scope: the element can record at a requested size, but a tour is composed on the
  live canvas, and a fixed aspect without the safe-frame guide (section 10) adds margins the reader did not compose.

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

// session.views (ReadonlyMap<string, CameraState>, existing; iterates in project order)
save(views: readonly { name: string; camera?: CameraState }[]): Promise<void>;  // camera ADDITIVE-optional
remove(names: readonly string[]): Promise<void>;                                // existing
rename(from: string, to: string): Promise<void>;                                // ADDITIVE, op view.rename
move(name: string, index: number): Promise<void>;                               // ADDITIVE, op view.move

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
- Default naming ("View N") stays in the app: it is presentation.

**Breaking, for the commit message:** `setCameraState`, `setCameraPosition`, `setCameraZoom`, `applyCameraView`,
`view.camera`, `captureScreenshot`'s camera and a still recording's camera reject with `E_UNSUPPORTED` for a saved
view or raw state that does not fit the drawing mode, where they used to resolve and do nothing, and while
immersive, where `setCameraState` used to teleport the headset camera. `views.save` is refused while immersive.
`getCameraState()` now includes `mode` in 2D and 3D, which changes deep comparisons and persisted states.
`E_UNSUPPORTED`'s `details.reason` from `resolveCameraView` is now the code `"mode"` instead of an English sentence.
`saveCameraPreset`'s return type changes from void to a Promise.

### 4.2 Tours

```ts
// ADDITIVE, exported from the main entry
type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";
type TourStop = ViewWaypoint & { view: string };   // derived, not a second interface: a stop names a view
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

### 4.3 Planning, playing and progress

```ts
// ADDITIVE, on the element: checks and times a tour, moves nothing
planTour(tour: string | Tour | readonly (ViewWaypoint | CameraWaypoint)[]): TourPlan;
interface TourPlan {
    readonly totalMs: number;             // sum of authored flights and holds
    readonly playable: boolean;           // true exactly when problem and every stops[i].problem are null
    readonly stops: readonly {
        readonly startMs: number; readonly duration: number; readonly hold: number;
        readonly problem: CodedFact | null;   // as viewProblem, plus {stop}
    }[];
    readonly problem: CodedFact | null;   // no-stops | {missing, available} | xr
}

// ADDITIVE widening; the result was Promise<void>
playTour(
    tour: string | Tour | readonly (ViewWaypoint | CameraWaypoint)[],
    options?: { easing?: EasingName; restoreCamera?: boolean /* default false */; signal?: AbortSignal },
): Promise<{ reason: TourEndReason }>;
type TourEndReason = "finished" | "cancelled" | "interrupted" | "replaced" | "mode-changed";

// events, ADDITIVE, through addListener and the EventManager union in events.ts
"tour-progress": { tour: string | null; stop: number /* 0-based */; stops: number; phase: "flight" | "hold" }
"tour-ended":    { tour: string | null; reason: TourEndReason }
"views-changed": {}   // anything a plan or viewProblem reads may have changed
```

- **The plan is authored.** `totalMs` comes only from authored values, the same for every reader and recording.
- **When to re-plan.** `views-changed` fires on a change to views, view order or tours, the 2D/3D dimension, an XR
  session starting or ending, and `registerCameraView`; an editor re-plans on it alone.
- An unknown tour name is `E_BAD_COMMAND {missing, available}`. `options.easing` wins over `Tour.easing`.
- **Reduced motion.** A flight becomes a cut at its start, held for the flight's time, so a tour lasts `totalMs`
  everywhere. `cameraTransitionDuration` no longer changes tour flights.
- **The tour's own moves** go through an internal path (`#applyTourCamera(state, ms)`), not the public
  `setCameraState`: it takes the flight time as given, skips `cameraTransitionDuration` and `setInstantGlides`, and
  is not a camera API call, so a tour never ends itself. The capture restore and `ScreenshotCapture` use it too.
- While a tour plays or records, `camera.autoRotate` and follow-selection glides are suspended, then resumed.
- **How a tour ends.** `finished`: the last hold ended. `cancelled`: `signal`, `cancelCameraAnimation()`, or Stop.
  `interrupted`: the reader's own move through `CameraManager`'s `onReaderMove` (drag, pinch, wheel, camera key),
  or a press or node drag, read by polling the input handler's `busy` each frame as `autoTurn` does; a click to
  select a node is a press and ends the tour. `replaced`: another `playTour`, a recording, `setCameraState`,
  `applyCameraView`, `view.camera`, or `captureScreenshot` with a `camera` option (one without does not end it).
  `mode-changed`: 2D/3D or immersive switched. A layout still moving does not end a tour.
- **Restore.** `restoreCamera` puts the camera back only on `finished`. On `finished`, `cancelled`, `replaced` and
  `mode-changed`, zoom-to-fit and the camera-placed state return to their pre-tour values. On `interrupted` the
  reader's move stands as outside a tour: the camera is placed and auto zoom-to-fit stays stopped, so a settling
  layout does not snap the camera away. After `mode-changed` the old camera is not reapplied.
- `playTour` resolves on every end; a capture rejects (section 4.4). `tour-progress` fires on each stop or phase
  change, never on a timer, also while recording; a zero-length flight emits no flight phase.

**Breaking, for the commit message:** a tour no longer follows a non-zero `cameraTransitionDuration`. Reader input
on the canvas, including a click, now ends a playing tour, and so does an outside `setCameraState`,
`applyCameraView`, `view.camera` or camera-moving screenshot. Auto-rotate and follow selection pause during a tour.
The tour refusal's `view` field is now `name`, and it gains `reason` and `modes` (section 4.7).

### 4.4 Recording

```ts
interface AnimationOptions {
    cameraMode?: "stationary" | "animated";   // now optional: tour or cameraPath implies "animated"
    duration?: number;                         // optional with tour or cameraPath
    tour?: string | Tour | readonly (ViewWaypoint | CameraWaypoint)[] | readonly string[];  // ADDITIVE widening
    motion?: "follow-view" | "authored";       // ADDITIVE, default "follow-view"
    destination?: { download?: boolean; ... }; // ADDITIVE, as in ScreenshotOptions
    signal?: AbortSignal;                      // ADDITIVE
    // ...existing fields; cameraPath, top-level download and downloadFilename become @deprecated
}
```

- **Inputs.** `tour` takes everything `playTour` takes, so a previewed array records unchanged; `cameraPath` is
  `@deprecated` in its favor. The older `string[]` form keeps its even split, still requires `duration`, and is
  `@deprecated`; the guide says `["a", "b"]` is not shorthand for a list of stops. An empty array is
  `E_BAD_COMMAND {reason: "no-stops"}` in either reading. `tour` and `cameraPath` together, or either with
  `cameraMode: "stationary"`, is `E_BAD_COMMAND {reason: "conflict", options}`. A still recording without
  `duration` is `E_BAD_COMMAND {reason: "missing-option", option: "duration"}`. `destination` wins over the
  top-level `download` and `downloadFilename`.
- **Motion.** `"follow-view"` (default, today's behavior) records what the view shows, so under reduced motion
  flights are held cuts. `"authored"` records each authored flight, and the live canvas moves with it; covering the
  canvas is the consumer's choice.
- **Timing.** A stop 0 with no flight is applied through the internal tour path before `recorder.start()`, so the
  first frames show stop 0. The tour's clock starts on the recorder's first data (an internal `onStart` hook in
  `captureRealtime`). Without `duration`, the recorder stops when the tour finishes; `expectedFrames` and the drop
  rate use `totalMs`, and `metadata.duration` reports the measured file length (startup plus `totalMs`).
  `animation-progress` follows the tour's own frame-delta clock, the one that times holds, so it reaches 100 only
  with the tour. An explicit `duration` keeps today's timer: shorter cuts the tour, longer holds the last stop.
- **Failing.** `MediaRecorderCapture` gains `fail(code, details)`, which sets the cancelled guard before stopping,
  so `onstop` never resolves with a truncated blob; `cancel()` becomes `fail("E_CANCELLED")`. A tour ending early
  fails the recording: `cancelled` with `E_CANCELLED`; `interrupted`, `replaced` and `mode-changed` with
  `E_CAPTURE_FAILED {reason}`. A tab going hidden fails it with `{reason: "hidden"}` (frames stop being drawn). The
  source canvas's pixel size is checked every frame, whether recorded directly or copied into a fixed-size output
  (whose fit is computed once, so a resize would stretch); a change fails it with `{reason: "resized"}`.
- **Immersive.** Refused with `E_UNSUPPORTED {reason: "xr", mode}`; XR does not draw to the recorded canvas.
- **After.** A tour recording puts the camera back, except after `mode-changed`.
- **Cancel** (`signal` or `cancelAnimationCapture()`) rejects with `GraphtyError` `E_CANCELLED`, a new code;
  `AnimationCancelledError` becomes its subclass and keeps its name. `captureScreenshot` keeps `AbortError`.
- A single-stop tour is valid, replacing the plain "2 waypoints" `Error`.
- **Estimate.** `estimateAnimationCapture` takes `tour` and uses `videoBitrate`; the `Graph` wrapper fills in the
  canvas size when `width` and `height` are absent (`video/estimation.ts` has no canvas). `recommendedResolution`
  becomes `{width, height}`, removing a plain `string` result field, as the API report shows.

**Breaking, for the commit message:** a tour recording now puts the camera back afterwards, opens on stop 0, and
fails when the tab is hidden, the canvas is resized, or the tour ends early. Recording is refused while immersive.
`estimateAnimationCapture` defaults to the canvas size instead of 1920x1080 and returns `recommendedResolution` as
an object. A one-stop path no longer throws; the `string[]` tour form is deprecated.

### 4.5 Persistence in the project file

```jsonc
"graphty-session": {
  "views": [{ "name": "Overview", "camera": { "mode": "3d", ... } }],
  "tours": { "version": 1, "list": [{ "name": "Supply risk walk", "easing": "easeInOut",
             "stops": [{ "view": "Overview", "duration": 0, "hold": 2000 }] }] }
}
```

- `views` is already an array, so writing it in `viewOrder` stores the order with no format change; `mode` travels
  inside `camera`.
- `tours` is a versioned sub-object like `conditions` and `declarations`, written only when a tour exists. A reader
  skips a newer `version` with a report entry, as it does for those members. Older readers ignore the member.
- The transaction scope gains `tx.tours`. Opening a project clears tours in `clearInto` (as it clears views) and
  restores them after views through `attempt(opening, "tours", () => tx.tours.save(tours))`, so tours never carry
  from one project into the next.
- The live camera is still not saved (issue #3260).

### 4.6 Undo facts

The new operations (`view.rename`, `view.move`, `tour.save`, `tour.remove`, `tour.rename`, `tour.move`) carry facts
only, for example `{code: "view.rename", params: {from, to, tours}}`; the app writes "Renamed View 3 to Hub
cluster". Their codes join the `HistoryCode` union, and `UndoableDefinition.undo.label` in `Dispatcher.ts` becomes
optional when a `fact` is given. The English `label` sentences on the existing `view.save` and `view.remove` are a
carry-over left as they are. Jumps, plays and recordings stay outside undo.

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
| Bad flight or hold                                                 | `E_OPTION_RANGE {option, stop}`                                                               |
| Recording failed                                                   | `E_CAPTURE_FAILED {reason: "hidden", "resized", "interrupted", "replaced" or "mode-changed"}` |
| Recording cancelled                                                | `E_CANCELLED` (new)                                                                           |

`modes` lists the modes the view works in (a camera view's descriptor, or the one mode a saved state fits); `name`
is absent for a raw state; `stop` is the 0-based stop index.

### 4.8 Deletions, AI tools and docs

- Delete the legacy AI `captureVideo` command and its export (breaking; it never recorded anything).
- Remove `CaptureCapability.pdf` (breaking, type only; nothing writes PDF) and the stale "Phase 5" and "Phase 7"
  notes on public methods.
- AI tools: add `view.rename`, `tour.list`, `tour.save`, `tour.play {name}` and `capture.animation {tour: name}`.
  The `playTour` exclusion's recorded reason ("covered-by view.camera") does not hold for a named tour, so the
  exclusion is replaced by `tour.play`.
- Docs: `graphty-element/docs/guide/camera.md` (saved views, name order, `viewProblem`, the mode table, tours,
  `planTour` and `views-changed` as the advanced path, reduced motion) and `screenshots.md` (`camera: {view}`,
  recording a tour, `motion`, both meanings of `duration`, why `["a", "b"]` is not a list of stops). Two short
  tables: how each call ends (cancelled `playTour` resolves `{reason: "cancelled"}`, `captureAnimation` rejects
  `E_CANCELLED`, `captureScreenshot` rejects `AbortError`; `restoreCamera` defaults false, a tour recording always
  restores), and the catch for each not-found code (`E_UNKNOWN_CAMERA` for a view, `E_BAD_COMMAND {missing}` for a
  tour).
- The section 4.9 example goes in the guide, in a typecheck test, and in a browser test that runs it, so a wrong
  view id fails a test.
- Run `npm run api:report` and commit the reports.

### 4.9 The simple path

```ts
import "@graphty/graphty-element";
const g = document.querySelector("graphty-element")!;
await g.waitForSettled();
await g.session.views.save([{ name: "overview" }]); // the current camera
await g.applyCameraView("topView"); // a built-in camera view id
await g.session.views.save([{ name: "hub" }]);
await g.session.tours.save([
    {
        name: "intro",
        tour: {
            stops: [
                { view: "overview", hold: 2000 }, // no duration: jumps there
                { view: "hub", duration: 1500, hold: 3000 }, // a stop's duration is its flight
            ],
        },
    },
]);
await g.playTour("intro", { restoreCamera: true }); // preview
await g.captureAnimation({ tour: "intro", destination: { download: true } }); // 6.5 s, from the tour
await g.captureScreenshot({ camera: { view: "hub" }, destination: { download: true } });
```

`playTour` and `captureAnimation` reject with the same coded problem `planTour` reports, so the simple path needs no
check. `planTour("intro")` (here `totalMs === 6500`) is the advanced path, for editors that show lengths and
broken stops before playing.

---

## 5. graphty app changes

All paths under `graphty/src/workspace/`.

### Toolbar (`toolbar/`)

- `commands.ts`:
    - Add `view.previous` (`[`) and `view.next` (`]`) over the last-applied name (section 3.1), always drawn,
      disabled with "No saved views", "At the first view" or "At the last view".
    - Give `view.save` the key `V`. Add `view.views-section`, `tour.play` (palette rows per tour) and `tour.stop`
      (Escape while a tour plays, after inner controls, through `isPanelEscape`).
    - Read every camera-view and saved-view disabled reason from `viewProblem` and word the code. Delete the
      `dimension === "2d" ? "Only in 3D"` checks on view rows. Auto-rotate's check stays, and its comment ("The
      element turns only the 3D view") is replaced by one naming the graphty-element issue filed for it.
    - Auto-rotate's "Reduced motion is on" reason reads `isMotionReduced()` instead of `matchMedia`.
- `WorkspaceToolbar.tsx`: saved-view rows through `CommandMenuItem`; the first 10 rows; the Play tour submenu; the
  Stop tour `ActionIcon` slot. `SavedViewRows`' Remove view submenu stays until the Views section lands (section 8).
- Register saved views and tours as `paletteRows`.

### Reduced motion (`frame/ElementHost.tsx`)

- Call `setReducedMotion("auto")` once and delete the app's `useReducedMotion` listener and its
  `cameraTransitionDuration = 0` write. Presentation that depends on it reads `isMotionReduced()` and
  `reduced-motion-changed`. For readers with reduced motion on, the element then also stops auto-rotate, skips the
  layout transition and shows a running layout once it has settled; the commit message says so.

### Views section (`graph-place/`)

- `ViewsSection.tsx` (both lists) and `TourStops.tsx` (the two-line stop rows), a `ControlSection` placed in
  `GraphPlace.tsx` between the StyleTree and the footer, with the height rules of section 3.2 in `graph-place.css`.
  No new rail place.
- All writes go through `session.views` and `session.tours`; Add stop and Replace with current camera are one
  `session.transaction` each. The app keeps no tour state beyond which tour is expanded, the last-applied view name,
  and the playing tour from `tour-progress`.

### Selection editor (`selection/SelectionEditor.tsx`)

- `setCameraState(camera)` (around line 2163) and `applyCameraView("fitToGraph", ...)` (around line 1636) handle the
  new `E_UNSUPPORTED` refusals (mode and xr) instead of dropping the promise, so a 2D/3D switch or an XR session
  while the editor is open is not an unhandled rejection.

### Main menu and export (`frame/menus.tsx`, `commands/registry.ts`, `export/`)

- `export/commands.ts`: add `file.export-image` and `file.export-video` to `FILE_LIST` before `file.export` and to
  `EXPECTED_COMMAND_IDS`; `exportOn` gains `"video"` and an optional tour name.
- `ImageOutput.tsx` and `VideoOutput.tsx` as in sections 3.4 and 3.5; the Export modal's `closeOnEscape` and close
  button act as Stop while recording. Deleted: `VIEW_LABELS`, the comment explaining why pixel sizes could not be
  shown, the duck-typed `E_NOT_SETTLED` check, the `MultiSelect`, `FIRST_TOUR`, the `tourStops` fallback, the "Tour
  needs 3D views" guess, the `error.name` cancel match and `FramesChip`. Codes and `details.reason` are read through
  `isGraphtyError`.
- `choices.ts`: `animationOptions` passes `tour: name` with no `duration` and no `cameraMode`; words for
  `name-taken`, `no-stops`, `mode`, `xr`, `hidden`, `resized`, `interrupted`, `replaced`, `mode-changed` and
  `likelyToDropFrames`; the `stops` field is dropped.

---

## 6. Accessibility and keyboard

| Key               | Command                                                      | Visible button                        |
| ----------------- | ------------------------------------------------------------ | ------------------------------------- |
| `V`               | Save view                                                    | Camera menu row; Views section header |
| `[` / `]`         | Previous view / Next view                                    | Camera menu rows                      |
| `Escape`          | Stop tour (while one plays, after inner controls)            | Stop tour button and menu row         |
| `F2`, `Delete`    | Rename, Delete (list-local)                                  | Row menus                             |
| `Mod+]` / `Mod+[` | Move up / Move down (list-local, as in the selection editor) | Row menus                             |

- `V`, `[` and `]` are free single-character keys that follow the app's switch for single-key shortcuts. Where
  `[` and `]` need AltGr, they arrive with Ctrl+Alt and the dispatcher accepts them; the test sends Ctrl+Alt+`[`,
  since `userEvent` cannot pick a keyboard layout.
- Lists use a roving tabindex. Enter on a view goes there; Enter on a tour expands it. Reordering never depends on
  dragging.
- The playing stop row gets `aria-current="step"`. A polite live region announces each stop change ("Stop 3 of 4,
  Port nodes"), never a timer tick. The recording bar is a `progressbar` with `aria-valuenow`.
- Disabled rows and buttons stay focusable with `aria-disabled` and their reason as tooltip and description.
- Opening the Views section from the Camera menu moves focus to its first list; closing a row menu returns focus
  to its button.

---

## 7. Tests and stories

Every UI test drives real input (clicks, keys, typing through `userEvent` on roles and accessible names), asserts
what a reader would see through the public API, uses `assert`, and waits on conditions with no timeout of its own.

### graphty-element (vitest)

- **Session (Node):** rename keeps order, rewrites stops, and undo restores both; rename onto a taken name or a
  camera view id is refused. Move reports `project:changed {slices: ["views"]}` and undoes; undoing the delete of a
  middle view puts it back in the middle. The four `tour.*` operations undo and report `"tours"`. The file
  round-trips ordered views (with `mode`) and `tours`; an old file loads; a newer `tours.version` is skipped with a
  report entry. Opening project B after A leaves no tour of A. `views.save` with no camera is refused; its redo
  writes the camera resolved at the first save.
- **Real element (browser):**
    - `planTour` totals, start times, `playable` and problems (missing view, wrong mode, empty tour), the same with
      reduced motion on. `viewProblem` for a 3D-only camera view in 2D, a registered view, a saved 3D view in 2D and
      an unknown name; its params equal the thrown `details`.
    - Name order: save "corner", then register a camera view "corner": `applyCameraView("corner")` flies to the
      camera view, `viewProblem("corner", {saved: true})` is `E_PROTECTED`, a stop naming it plans as the camera view,
      and `views-changed` fired.
    - Every door in section 4.1 refuses a state that does not fit the mode; `{target}` alone is refused in 2D,
      `{zoom}` alone in 3D. `linkCameras` across a 2D and a 3D element raises nothing.
    - `playTour(name, {restoreCamera: true})`: on finish the camera is back and a later data load fits. A drag
      mid-tour over a still-settling force layout resolves `interrupted`, and the camera stays where the drag left it
      after the layout settles. A node click resolves `interrupted`. Abort resolves `cancelled` and a later load
      fits. A screenshot with `camera` resolves `replaced`; one without does not end the tour. With auto-rotate on,
      the camera is still through each hold and turns again after.
    - Recording with `motion: "authored"` (the `test/browser/video/tour-stops.test.ts` frame-sampling pattern): stop
      0 from the first frame, both holds present, the camera put back, `metadata.duration` at least `totalMs`, and
      `animation-progress` reaching 100 only after the last hold began. A drag fails it with `interrupted` and no
      file; a resize with `width`/`height` set fails it with `resized`; hiding the page fails it with `hidden`,
      through a recording case added to the two-tab fixture page in `graphty-element/test/lifecycle` (which serves
      the built `./bundle`). Conflicts, a still without `duration`, `tour: []` and cancel reject with their codes.
- **The section 4.9 example** compiles against the built declarations and runs against a real element.

Recording tests run in real time, so each uses a one- or two-stop tour with holds of a few hundred milliseconds.

### graphty app (`*.real-element.test.tsx`)

- **Camera menu:** press `V` twice: two rows appear; press `]` twice: the camera reaches the second view, and Next
  view is disabled with "At the last view". Switch to 2D: Front and the 3D view's row are disabled with the
  element's reason. Play a tour from the menu and press Escape: the tour ends; play again and press the Stop tour
  button: it ends.
- **Views section** (at 240 px, with a long layer tree): expanding Views keeps both the tree and the section
  visible, each scrolling on its own. Rename a view with F2 (the Camera menu row and the tour stop follow); move
  with Mod+] (the view moves up); make a tour, Add stop after orbiting, edit a hold, Play (the stop is marked, the
  camera returns); during Play, open a stop's view list and press Escape (the list closes, the tour keeps playing);
  drag during Play (the tour ends, the camera stays); undo a delete (the view returns to its place).
- **Export:** Export image... opens on Image and a saved view exports a PNG; Export video... records a saved
  one-stop tour with a short hold and the file appears under Recent with the tour's length; Escape during a
  recording cancels it and leaves the dialog open; Record... in the section opens Video with that tour.

### Stories (compared by visual-review)

- Workspace/Toolbar: Camera menu in 3D, and in 2D with disabled rows; with a tour playing.
- Workspace/Graph place with the Views section at 240 px: collapsed; empty; views and an expanded tour beside a
  long layer tree; a tour with a broken stop.
- Export dialog: Video with a tour, Video with no tours, Image with a saved view chosen.

---

## 8. Implementation order

Each step builds, lints and tests on its own and lands as its own pull request.

1. **Element: views** (section 4.1), with the `SelectionEditor` refusal handling, and in the app
   `setReducedMotion("auto")` replacing the `cameraTransitionDuration = 0` write, so reduced motion reaches the
   element before tours stop following `cameraTransitionDuration`. The commit message says what changes for readers
   with reduced motion on (no auto-rotate, no layout transition, a running layout shown once settled).
2. **Element: tours** (sections 4.2, 4.3, 4.5, 4.6).
3. **Element: recording, deletions, AI tools, docs and the example tests** (sections 4.4, 4.8), then the API
   report.
4. **App: doors.** The main menu rows, the Image output, and the Camera menu. The Video output keeps its
   `MultiSelect`, "Views and tours..." is not drawn, and `SavedViewRows`' Remove view submenu stays, so views can
   still be deleted.
5. **App: Views section and video tours.** The Graph panel section and tour editor, the Video Tour select replacing
   the `MultiSelect`, and the deletion of the Remove view submenu, in the same pull request.

---

## 9. Decisions and reasons

| Decision                                                                                                                                                                                                | Reason                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Views section in the Graph panel, not a new rail place or a modal                                                                                                                                       | Tour editing needs the live canvas beside it (a modal covers it, a popover closes on the first drag); #816's fuller views grow there.                           |
| One `ControlSection` under the StyleTree, own scroller, at most half the column                                                                                                                         | The panel has no section framework today; a height cap keeps the tree and a long tour usable at 240 px.                                                         |
| Camera views win a name over saved views                                                                                                                                                                | The element already resolves this way on purpose, so a registered view is never silently shadowed; every door, the planner and the stop `Select` follow it.     |
| Management leaves the Camera menu                                                                                                                                                                       | A menu closes on every click; the Remove submenu destroyed with nothing to look at.                                                                             |
| Names stay the identity of views and tours                                                                                                                                                              | Ids would break `session.views`, the file and every caller; rename rewriting stops covers the cost.                                                             |
| `viewOrder` slice; tours one ordered value                                                                                                                                                              | A keyed map's undo appends a restored key at the end; a whole value restores exactly.                                                                           |
| One mode predicate; `{target}` is 3D only                                                                                                                                                               | 2D never reads `target`, so applying it there is the silent no-op being removed.                                                                                |
| Delete does not cascade; Replace saves a new view                                                                                                                                                       | No silent change to a tour or a view another tour uses.                                                                                                         |
| `viewProblem` and `views-changed` on the element                                                                                                                                                        | The app re-deriving modes or plan inputs breaks third-party views and editors.                                                                                  |
| Reader input ends a tour; an interrupt keeps the reader's placement                                                                                                                                     | The tour never fights the reader, and a settling layout cannot yank the camera back. A kiosk option (pause, ignore) can be added later without breaking.        |
| No `view` alias on `setCameraState`                                                                                                                                                                     | `applyCameraView` is the jump door; `camera: {view}` exists only in option objects.                                                                             |
| A tour ending early fails its recording                                                                                                                                                                 | A truncated file reported as normal is a silent failure.                                                                                                        |
| `tours` is `{version, list}`                                                                                                                                                                            | Every added session member is versioned; a file format is a one-way door.                                                                                       |
| Deviation (step 1): the drawing mode is judged by the `layout` slice's dimension, not the camera type                                                                                                   | The slice is the one home of 2D versus 3D; a camera switch lags it by a frame.                                                                                  |
| Deviation (step 1): reset, zoom step, overview pan and tour stops place the camera on an internal path, unchecked                                                                                       | They build states for the mode they are in; checking them would only refuse them while immersive, which no listed door covers.                                  |
| Deviation (step 1): `view.rename`'s fact is `{from, to}` until tours exist; its and `view.move`'s step label is the op code                                                                             | `tours` and the optional label belong to the tours step (sections 4.2, 4.6).                                                                                    |
| Deviation (step 1): no assistant `view.rename` action yet; recorded as a dated defect in `src/ai/tools/exclusions.ts`; `view.move` excluded by design (`panel-state`)                                   | Adding it puts the always-loaded tools 34 tokens over the 5,000 budget; the AI step (4.8) must make room.                                                       |
| Deviation (step 1): a tour stop's refusal already has the 4.7 shape (`name`, `stop`, `reason`, `modes`)                                                                                                 | `playTour` judges stops with the shared predicate, which builds that shape.                                                                                     |
| Deviation (step 1): `importCameraPresets` also skips an empty name (`E_BAD_COMMAND`), and returns `skipped` synchronously                                                                               | It used to report that refusal asynchronously as `graph-error`; the return value now says it.                                                                   |
| Deviation (step 2): a press on the canvas is read from the canvas's own `pointerdown`, not by polling the input handler's `busy` each frame                                                             | A click shorter than a frame never shows as busy, so polling missed node clicks; drags, pinches, wheel and camera keys still end a tour through `onReaderMove`. |
| Deviation (step 2): a tour's framing and placement are put back at the moment it ends, synchronously                                                                                                    | So the move that replaced it, or the mode switch that ended it, lands after the restore and is never undone by it.                                              |
| Deviation (step 2): `tour.save` also refuses a stop whose `view` is not a string and an unknown easing, as `E_OPTION_RANGE {option: "view", stop}` and `{option: "easing"}`                             | A saved tour is read back from a file and by every consumer; a malformed stop would fail only when played.                                                      |
| Deviation (step 2): `tour.move`, `tour.remove` and `tour.rename` are excluded from the assistant by design (`panel-state`); `tour.save` is a dated defect until the AI step adds it                     | Section 4.8 adds `tour.save`, `tour.list` and `tour.play` only; arranging the list is the editor's.                                                             |
| Deviation (step 2): a screenshot's camera ends the tour first, then is placed through `setCameraState`; only its restore takes the internal path                                                        | Ending the tour before saving what to put back restores the pre-tour framing and placement; `setCameraState` keeps the capture's mode check.                    |
| Deviation (step 3): a tour recording puts the camera back after `finished`, `cancelled` and its own failures (hidden, resized), but not after `interrupted` or `replaced`, as well as `mode-changed`    | Putting it back after a reader's drag or an outside camera move would undo that move, the same reason section 4.3 leaves it after `interrupted`.                |
| Deviation (step 3): `cameraMode: "animated"` with neither `tour` nor `cameraPath` is `E_BAD_COMMAND {reason: "missing-option", option: "tour"}`                                                         | Section 4.4 names no code for it; it replaces the plain "2 waypoints" `Error`.                                                                                  |
| Deviation (step 3): `destination` for a video is `{download, filename}`                                                                                                                                 | A video has no clipboard; the file name had to move with `download` for `destination` to win over both top-level options.                                       |
| Deviation (step 3): a tab already hidden when recording starts is refused at once with `{reason: "hidden"}`                                                                                             | No frame would be drawn, so the recorder would otherwise wait for data that never comes.                                                                        |
| Deviation (step 3): the app's one recording call site and the element's Screenshot story move to `destination` and `tour` in the element step                                                           | Deprecating `download`, `downloadFilename` and `cameraPath` fails lint on their callers, and each step must lint on its own.                                    |
| Deviation (step 3): with a longer `duration`, a press or camera move in the trailing hold ends the tour but not the recording                                                                           | The whole tour is already in the video; only a tour ending before its last stop fails it.                                                                       |
| Deviation (step 3): the assistant's `tour.list`, `tour.save` and `tour.play` are a new on-demand `tour` tool; `view.rename` joins the always-loaded `view` tool, whose action summaries were cut to fit | The always-loaded tools are capped at 5,000 tokens; an on-demand tool costs nothing until the model asks for it.                                                |
| Deviation (step 3): both short tables (how each call ends, the not-found codes) are in `camera.md`; `screenshots.md` links to them                                                                      | One copy to keep true; the tour calls they compare are explained in `camera.md`.                                                                                |

---

## 10. Out of scope

- A Video Size control (the element already records at a requested size), until the safe-frame guide exists.
- A "safe frame" guide showing the output aspect while composing a tour.
- Legend, transparent background or background color in video; WebM duration and seek cues.
- Pausing a recording while the tab is hidden; pause, resume and seek in general.
- An option for reader input to pause or be ignored during a tour (kiosks).
- View thumbnails (they need an offscreen render that does not move the live camera).
- A "Current camera" choice in the stop picker, which would avoid the "View N" views Add stop and Replace create.
- Views that also keep filters, layers, hidden elements and the legend (issue #816).
- Saving the live camera in the project file (issue #3260).
- An element fact for whether auto-rotate is available; the app's existing 2D check for it is filed as an element
  defect.
- SVG export from a saved view, editable file names, slide and custom image sizes.
- Per-stop easing; stepping a tour's stops with `[` and `]`; telling two inline tours apart in events.
- Title cards, burned-in captions and audio.
- Moving `captureScreenshot`'s abort to `E_CANCELLED`.
