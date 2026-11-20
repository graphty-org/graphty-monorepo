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
- **A gap in the toolbar.** An empty 24 px slot that this branch added for a Stop tour button (master has neither)
  sits between the Camera tool and the Mode tool, so those two are 40 px apart where every other pair is 8 px.
- **Fit turns the camera and Fit selection underfills** (owner's feedback, 2026-11-18): Fit snaps to the fixed
  diagonal, and Fit selection keeps the angle but leaves the selection at about two thirds of the canvas (section
  4.10).

---

## 2. The reader's flows

A presenter jumps to angles with one key while talking (the Camera menu lists every camera with its key); saves
and names angles in Views > Cameras (or `V`); organizes them (rename, reorder, re-key, inspect, update, delete; the
starting five are cameras like any other); builds a tour in Views > Video tours from cameras and pauses; previews
it with Play (Stop, Escape or any canvas input leaves the camera where it is; a finished tour puts it back); and
exports a picture from a camera's Export image... or a video from a tour's Export video....

---

## 3. Where it lives in the app

- the toolbar **Camera menu**, for jumping: every camera, Fit, Fit selection and the camera behavior switches;
- a new rail place, **Views**, for managing cameras and editing video tours next to the live canvas;
- the existing **Export dialog**, opened on Image from a camera's row menu and on Video from a tour's row menu.

### 3.0 Behind the "camera-views" experiment

Everything in sections 3.1 to 3.8 is behind one experiment, `camera-views`, switched on the way the app's other
experiments are (`cosmograph`, `file-styles`, `node-models`).

- **graphty-element** declares it: `"camera-views"` joins the `FeatureId` union in `src/features/registry.ts`, with a
  `FEATURES` entry `{ id: "camera-views", plainName: "Camera views", issue: 8814, since: "2026-11-18" }` (issue
  #8814, "Saved camera views, video tours, and image and video export in the graphty app", tracks it until it
  graduates; `FeatureDescriptor` requires `issue`) whose comment says what
  it gates: only the graphty app's Views place, Camera menu and export entry points. One line joins
  `docs/guide/experiments.md`; `npm run api:report` updates the reports that list `FeatureId`.
- **Not gated:** graphty-element's camera, view and tour code (section 4), the Fit and Fit selection fixes (section
  4.10) and the project file format. They work for every consumer whatever the flag says.
- **A reader turns it on** with `?features=camera-views` in the address, or a site file's `features` list.
  `graphty/sites/canary.json` lists it; nightly and production do not. On the dev server:
  `https://dev.ato.ms:9967/?features=camera-views`.
- **The baseline is origin/master, merged in.** Master has moved since this branch forked (merge-base
  `77b5c12757`): it added Export image (`view.export-image`, Shift+I) and Record video / Stop recording
  (`view.record-video`, Shift+R) to the Camera menu, gave Auto-rotate the key 9, split VR and AR into two Mode rows
  and added Report to the Export dialog. Before the flag work starts, origin/master is merged into this branch (an
  ordinary `git merge`, never a rebase), and "master" in this document means origin/master as of that merge. Every
  `git show <master>:<path>` below reads that commit.
- **The app reads it** through `cameraViewsOn(session)` in `workspace/features.ts`, written like `nodeModelsOn`.
  New commands carry `experiment: true, feature: "camera-views", shown: (ctx) => cameraViewsOn(ctx.session)`.
- **Master's commands that the flag hides lose their keys too.** The key loop (`keys/useCommandKeys.ts`) and the
  Keyboard shortcuts dialog skip a command only when `switchedOff(command)` (`commands/registry.ts`) is true, and
  that needs `experiment === true && shown(ctx) === false`; a plain `shown: false` still answers its keys. So each
  master command hidden with the flag on carries `experiment: true, shown: (ctx) => !cameraViewsOn(ctx.session)` and
  **no `feature`** (a `feature` would drop it from the shortcuts list whenever camera-views is off, which is
  master's state). Flag off: `shown` is true, so the command, its menu row, its keys and its shortcuts-list row are
  exactly master's. Flag on: `switchedOff` is true, so it has no door, no shortcuts-list row and its keys pass to the
  next command (`camera.key-N`) or the browser. Neither `switchedOff` nor the key loop changes. The commands:
  `view.front` (1), `view.side` (3), `view.top` (7), `view.isometric`, `view.save`, `view.export-image` (Shift+I)
  and `view.record-video` (Shift+R). `view.auto-rotate` keeps 9 in both states (section 3.4).
- Commands this branch added that the flag-on design no longer uses (`view.previous`, `view.next`,
  `view.views-section`, `file.export-image`, `file.export-video`) are deleted, never gated: gating them would add
  them to the flag-off app, which master never had. The rail button, `PLACES.views` and the `setStartingCameras` call
  in `Workspace.tsx` run only when on.
- **With the flag off**, every gated surface looks and works as on master; section 8 lists what a reader checks.

### 3.1 The Views place

The rail reads Graph, Data, **Views**, Assistant (when on), Notes, with Settings at the foot. Views uses the same
glyph as the toolbar Camera tool (`GLYPHS.camera`), so the two read as one family. Like Graph and Data it has no
key; its command `place.views` ("Views") is in Quick actions with the keywords camera, tour, video, hotkey.

The place has **no heading**: no `h2` with the graph's name. It starts with two compact-mantine `ControlSection`s,
**Cameras** then **Video tours**. Both start open. Each remembers whether it is collapsed in the workspace store,
kept across place switches and a tab reload (section 5). The place scrolls as one column, like Data; the lists
inside never scroll on their own. The left panel opens at 240 px (`PANEL_MIN`), so every row fits 240 px.

```
+ rail -+- Views ------------------------------+
| Graph | v Cameras                       [+] | <- Save camera, tooltip "Save camera (V)"
| Data | :: > Top             7   [->] [..] | <- grip, fold, name, key, Go, row menu
|*Views*| :: > Bottom              [->] [..] | <- no key; in 2D: Go disabled, tooltip "3D only"
| | :: > Front           1   [->] [..] |
| | :: v Hub cluster     2   [->] [..] | <- unfolded: inspect
| | Kind        Fixed |
| | Mode        3D |
| | Position    12.4, 3.0, -8.1 |
| | Target      0.2, 0.1, 0.0 |
| | Distance    15.2 |
| | Field of view  46 deg |
| | Key         [2            v] |
| | Update to current camera |
| | v Video tours                   [+] | <- New tour
| | v Supply walk  0:14   [>]  [..] | <- no grip: tours are not reordered
| | :: v Stop 1               x |
| | Camera [Top          v] |
| | Fly in [0.0      ] s |
| | Stay   [2.0      ] s |
| | :: v Stop 2               x | <- playing now: active-row fill
| | Camera [Isometric    v] |
| | Fly in [2.0      ] s |
| | Stay   [2.0      ] s |
| | :: > Stop 3  Pause 2 s    x | <- folded: summary
| | [+ Add camera v] [+ Add pause]|
| | Easing [Ease in and out v]
| | > Exec summary 0:31   [>]  [..] |
+-------+--------------------------------------+
```

Parts are compact-mantine and Mantine defaults: `ControlSection`, `CardList` (grip drag, fold, rename, menu, x),
`ActionRow`, `ActionIcon`, `FieldRow`, `DataRow`, `PanelField` number fields with an "s" unit, `Select` and `Menu`.
No pills and no captions. A disabled row, button or field gives its worded code as a tooltip and an
`aria-description`. Empty states are words only, "No cameras" and "No tours": the section's `[+]` is the one way to
add.

**One control per action.** Every action on a camera, tour or stop has exactly one control on its card. The row
menus hold only what has no other control. Global doors that are not per-card controls stay: the camera keys, `V`,
the Camera menu rows and Quick actions. There are no card-header keys: F2, Delete, Mod+] and Mod+[ do nothing on a
card, so F2 reaches the global project rename again.

**Going to a camera is its own button**, never a click on the title: a Go `ActionIcon` in the card's `header` slot,
tooltip "Go to Top (7)" (the key, when the camera has one, so the button also shows it), `aria-label` "Go to Top",
drawn with an existing glyph. The title's tooltip is "Rename", as in every other CardList.

**Drag and drop, with keyboard access from the component.** Cameras and tour stops reorder only by CardList's grip.
compact-mantine's CardList gains two optional props, both off by default, so with them unset it looks and behaves
exactly as today (the Figma lock holds):

- `keyboardReorder?: boolean`: the focused grip takes Alt+ArrowUp and Alt+ArrowDown (the Tree's convention), calls
  `onReorder(id, index -/+ 1)`, keeps focus on the moved card's grip and announces "Moved to position N of M". Its
  tooltip reads "Drag to reorder (Alt+Up, Alt+Down)", so the keys have a visible button.
- `onReorderEnd?(id, toIndex: number | null)`: fired once when the drag ends: on pointerup with the final index, on
  pointercancel with `null` (CardList listens for both on `window` and never captures the pointer). With it set, the app treats the live `onReorder` calls as a
  preview (it holds a local order while the pointer is down) and commits one `views.move` or one `tours.save` in
  `onReorderEnd`, so a drag is one undo step. `null` drops the preview and commits nothing. A key move commits at
  once.
- **Card ids stay the same through a drag.** CardList keys cards, the grip's `grab()` closure and the keyboard
  focus by id, so an id must not change while the preview order changes. Camera cards use the camera's name. Stop
  cards use the stop's index in the saved tour _when the drag started_: the preview order is a list of those
  original indices, so each card keeps its id and React key while it moves, and the ids are recomputed from the
  saved order only after `onReorderEnd` commits (or drops) it. A key move commits at once, so the moved stop's new
  index is its id on the next render, and the focus rule targets that index.

Tours are **not reordered**: the tours CardList gets no `onReorder`, so it draws no grip.

#### Cameras

One `CardList` card per camera, in project order. The five starting cameras are not set apart: no heading, group or
style separates them from cameras the reader saved. Neither the camera nor the tour CardList passes `onRemove`, so
no camera or tour card draws an x (the stop list does, below).

- **Card header:** grip, fold, name (the title), the camera's key in the menu-key style in `aside` (or nothing), the
  Go `ActionIcon` (`GLYPHS.go`) in `header`, and the row menu. Go runs `applyCameraView(name, {animate: true})`. The camera applied
  last gets `aria-current="true"` on its Go button.
- **Rename:** a click on the title, the only way. Rename keeps the key. CardList
  closes its field before `onRename` runs and `InlineRename` has no error look, so a refused rename cannot stay open
  in an error state: the card keeps its old name, the app reports the worded code ("Name in use" for `name-taken`,
  "Reserved name" for `E_PROTECTED`, a camera view id such as `isometric`) through the workspace refusal notice
  (the `orRefusal` path `ViewsSection` uses today), and focus returns to the title button. Tours follow the same
  rule.
- **Disabled** when `viewProblem(name, {saved: true})` is not null: "3D only" (a following camera whose view lacks
  the mode), "Saved in 3D" or "Saved in 2D" (a fixed camera), "Not in VR or AR", "Camera view gone" (its followed
  view was unregistered). The Go button and the menu's Export image... are disabled with that reason; the card is marked `off`
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
    - **Key:** a `Select` (section 3.4), the only way to assign a key.
    - **Update to current camera** (`ActionRow`), the only way to update: saves the live camera into it, in the
      current mode, as one undo step. A following camera becomes fixed: this is how a reader nudges Top a little
      and keeps it.
- **Reorder:** the grip, by drag or Alt+ArrowUp / Alt+ArrowDown on the focused grip (section 3.1).
- **Row menu**, the whole of it:

```
Export image...                <- opens Export on Image with this camera chosen (section 3.7)
Duplicate                      <- "Top 2": same camera or follows, no key
---
Delete
```

- **Save camera** (the section's `[+]`, or `V` anywhere): saves the live camera as "Camera N" (the first free
  number, so "Camera 1" in a new project: the starting five are not named "Camera") at the end of the list, one undo
  step, then unfolds the new card and opens its rename. `nextName` accepts the word "Camera". Pressed with the Views
  place closed, `V` saves and shows the existing notice with Undo; nothing opens.
- **Delete** has no confirmation; Undo restores the camera, its place and its key. A tour stop naming a deleted
  camera stays and shows "Camera not found".
- **Empty state:** the words "No cameras".

#### Video tours

One `CardList` card per tour, in project order, one unfolded at a time. Tours are not reordered: no grip, no move
items, no move keys; the order changes only by New tour, Duplicate and Delete.

- **Card header:** fold, name (a click renames, the only way), length in `aside` (`0:14`, from
  `planTour(name).totalMs`, re-planned on `views-changed`, so editing a time shows its effect at once), a Play
  `ActionIcon` in `header` (tooltip "Play tour") that becomes Stop (tooltip "Stop tour (Esc)") while this tour plays,
  one button toggled, and the row menu. A tour that cannot play disables Play and Export video..., with the first
  problem worded ("Stop 2: Camera not found"; an empty tour's `no-stops` reads "No stops").
- **Row menu**, the whole of it:

```
Export video...                <- opens Export on Video with this tour chosen (section 3.8)
Duplicate
---
Delete
```

- **Stops** (the card unfolded) are a nested `CardList` with `onReorder`, `onReorderEnd`, `keyboardReorder`,
  `onRemove` and `autoFold={false}`, so appending a stop folds nothing. Each card's id is the stop's index, held
  through a drag as section 3.1's drag rule says; a reorder splices that one stop and saves the tour once. Stops
  start unfolded. A stop card has no rename, no color and no row menu.
    - **Header:** grip, fold, the title "Stop N" (plain text), and CardList's own x, the only way to delete a stop.
      CardList always draws the fold; folded, the summary reads "Top, fly 2 s, stay 2 s" for a camera stop and
      "Pause 2 s" for a pause, so each number says which time it is. The playing stop gets the active-row fill and
      `aria-current="step"`.
    - **Camera stop body:** a `Select` labeled "Camera" (not searchable) of the saved cameras in project order,
      the only way to change the stop's camera. A stop naming a camera view id directly (written through the API)
      shows that view's app word as an extra option. A missing or unusable camera puts the `Select` in its error
      state with the worded code ("Camera not found", "3D only", "Saved in 3D"). Under it, two rows: **Fly in**
      `[2.0] s`, then **Stay** `[2.0] s`, each a `PanelField` number field, step 0.5, one decimal, minimum 0.
      One time per row, so every label sits in the same label column and each field has room for "10.5".
    - **Pause body:** one row, **Wait** `[2.0] s`.
    - **What the times mean.** Each label has a tooltip and the same `aria-description`:

| Label  | Was    | Meaning                                                                                                                                              | New stop        |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Fly in | Flight | "Seconds to fly here from the previous stop". On stop 1: "Seconds to fly here from where the camera is when Play is pressed (0 cuts straight there)" | 2.0 (stop 1: 0) |
| Stay   | Hold   | "Seconds to stay here before moving on"                                                                                                              | 2.0             |
| Wait   | Pause  | "Seconds the camera stays still"                                                                                                                     | 2.0             |

- **Reordering changes no times.** A stop keeps its Fly in, Stay or Wait wherever it moves. Whichever stop is first
  flies from where the camera is when Play is pressed, for its own Fly in, so stop 1's tooltip (shown on whichever
  stop is first) is the whole rule; a moved stop with 2.0 s flies there in 2.0 s.

- **Removed from stops:** Go to (use the camera's Go), Move up and Move down, Replace with current camera (add the
  current camera, then delete the old stop), Delete stop and every stop key.
- **Under the stops:**
    - **Add camera** is a `Menu` button listing every saved camera in project order, and nothing else. There is
      no "Current camera" item: saving a camera has one door (the Cameras `[+]`, or `V`), and a tour stop names a
      saved camera. To put the live camera in a tour, save it, then pick it here. A new camera stop flies in 2.0 s
      and stays 2.0 s; the first stop flies in 0 (it cuts there). With no saved cameras the button is disabled with
      "No cameras".
    - **Add pause** appends a 2.0 s pause.
    - **Easing**, a `FieldRow` with a `Select` (Linear, Ease in, Ease out, Ease in and out) under the add row: the
      only way to set easing.
    - A tour with no stops unfolds to the add row and Easing alone: no caption; "No stops" is only the disabled
      Play's tooltip.
- **New tour** (the section's `[+]`): appends "Tour N", empty, unfolded, with its rename open. It no longer fills
  in one stop per camera: every project now starts with five cameras, so that would always build the same tour.
- **Play** runs `playTour(name, {restoreCamera: true})`. `tour-progress` marks the playing stop with the active-row
  style and `aria-current="step"`. Editing the playing tour saves as usual; playback keeps the plan it started with.
- **Empty state:** the words "No tours".

#### Spacing

On the 4 px grid, set in `views-place.css` only; CardList keeps its own spacing.

| Gap                                                       | Value                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Place top to the Cameras header (no heading)              | 8 px                                                                            |
| Last card to the next section header                      | 8 px                                                                            |
| Between cards, and between stop cards                     | 4 px (CardList default)                                                         |
| Data rows in a camera body                                | 2 px                                                                            |
| Last data row to Key, and Key to Update to current camera | 4 px each                                                                       |
| Stop rows: Camera to Fly in, Fly in to Stay               | 4 px each                                                                       |
| Stop field labels (Camera, Fly in, Stay, Wait)            | one 48 px label column: every label in it, every field starting at its edge     |
| Time fields (Fly in, Stay, Wait)                          | one width, the body width less the label column and the "s" unit (about 130 px) |
| Last stop to the add row; Add camera to Add pause         | 4 px; 8 px                                                                      |
| Add row to Easing                                         | 4 px                                                                            |

The stop list sits flush with the tour body's edges. A stop body measures about 196 px, so it fits the 240 px panel
unclipped. `.vp-title`, `.vp-stop-line` and `.vp-stop-number` are deleted.

### 3.2 The Camera toolbar menu

```
+-----------------------------------+
| Top                            7 | <- every camera, project order, first 12; click = fly there
| Bottom |
| Front                          1 |
| Side                           3 |
| Isometric |
| Hub cluster                    2 |
| Port nodes | <- in 2D: disabled, reason "Saved in 3D" as the row description
|---|
| Fit                            0 |
| Frame selection                F | <- master's label, id and key; the owner calls it "Fit selection"
| Zoom in                        + | <- 2D only, as today
| Zoom out                       - |
|---|
| [x] Auto-rotate                9 | <- master's row and key, unchanged
| [ ] Follow selection | <- master's label (this branch had renamed it "Focus selected")
+-----------------------------------+                no Export image, no Record video (hidden, see below)
```

- Camera rows are **registry palette rows**, so Quick actions finds every camera, not only the first 12. With no
  cameras, that group and its divider are not drawn. There is no "All cameras..." row: the rail's Views item is the
  door to the rest.
- **Fit** (`0`) and **Fit selection** (`F`, labeled "Frame selection") only zoom and pan; they never turn the
  camera (section 4.10).
- Every row's enable state comes from `viewProblem`; the app only words the code.
- **Removed** from the menu, and where each went:
    - The Front, Side, Top and Isometric command rows, the app's `STANDARD_VIEWS` table and their keys: they are
      now starting cameras (section 3.3), and keys 1, 3 and 7 travel with them as camera data.
    - Save view (master's, no key): hidden with the flag on; **Save camera** (the Cameras section's `[+]`, Quick
      actions and `V`) replaces it. `V` is only `camera.save`'s and exists only with the flag on.
    - The Play tour submenu (this branch's): tours play from their card, and Quick actions keeps "Play tour:
      <name>" rows.
    - This branch's Previous view and Next view (`[`, `]`) are deleted with their keys. Master never had them, so
      nothing returns with the flag off and no owner veto is pending.
    - Stop tour and the Stop slot beside the Camera tool: while a tour plays, the Camera tool itself is Stop
      (section 3.5).
    - Views and tours...: the rail's Views item is the door.
    - Master's **Export image** (Shift+I) and **Record video / Stop recording** (Shift+R): hidden with the flag on,
      keys included (section 3.0's `experiment` gate), and back exactly as master's with the flag off. With the flag
      on, an image is exported from a camera's Export image... and a video from a tour's Export video... (owner's
      points "one way of doing it" and "export opens from a camera or a tour").
- **Auto-rotate keeps 9** in both states, its row showing it as on master. No starting camera takes 9 (section 3.3).
- **Beyond the owner's list (open to his veto, and said so in the report to him):** Follow selection stays, and Zoom
  in and Zoom out stay in 2D. They are camera behaviors, not camera management, none has another visible button,
  and Zoom in and Zoom out are the visible buttons for `+` and `-`. Removing them is one edit each.

### 3.3 Top, Bottom, Front, Side and Isometric are starting cameras

They are ordinary saved views, written once as data when a project starts, the way the default style layers are,
and renamed, reordered, re-keyed and deleted like any camera. No code branches on their names or the ids they
follow. Each **follows** its camera view, so Top still frames the whole graph after the data changes; Update to
current camera makes it fixed. With the experiment on, `Workspace.tsx`'s `onElementReady` hands the list to every
new element before its first load; the element writes it once into a project that never had it, with no undo step
(section 4.1):

```ts
await session.views.setStartingCameras([
    { name: "Top", follows: "topView", key: "7" },
    { name: "Bottom", follows: "bottomView" },
    { name: "Front", follows: "frontView", key: "1" },
    { name: "Side", follows: "sideView", key: "3" },
    { name: "Isometric", follows: "isometric" },
]);
```

- **Keys:** Front, Side and Top keep master's keys; Bottom and Isometric have none (9 is master's Auto-rotate key,
  so Bottom does not take it; a reader can give Bottom any free digit). `bottomView` is a new camera view (section 4.1).
- **Old projects** gain the five once, after the reader's own cameras (a taken name skipped, a held key dropped).
  The project records that they were written, so a deleted or renamed one never returns.
- **2D and 3D.** All five are written whatever the dimension. Top works in both (in 2D it frames the whole graph,
  upright); the other four are 3D only, disabled with "3D only" in 2D.

### 3.4 Camera keys

- **Which keys.** The Key `Select` offers None, then the digits `1 2 3 4 6 7 8`. `0` is Fit, `5` the 2D/3D switch
  and `9` Auto-rotate (master's keys), so they are never offered. The element stores keys as opaque strings, so widening the set later is an
  app edit.
- **Conflicts.** A digit another camera holds is listed with its holder ("7 -- Top"). Picking it moves the key:
  `session.views.setKey` takes it from the other camera in the same undo step, and the app announces "Moved key 7
  from Top to Hub cluster".
- **Binding.** Seven app commands, `camera.key-1` ... `camera.key-8` (no `camera.key-5`, no `camera.key-9`), each
  hold one digit. Each carries `inPalette: false` (the registry field that keeps a command out of Quick actions while
  its keys work), so with the flag on Quick actions lists the cameras themselves, not seven digit rows. A press applies the saved view holding that digit, animated; a digit no camera holds does nothing. It never
  fires while typing, and is suspended while immersive.
- **Visible buttons.** Each camera's key is printed on its Camera menu row, its Views card and its Quick actions row.
- A key outside the eight digits (written through the API by another consumer) is shown but not bound; the Key
  `Select` shows it in its error state, "Not a camera key".

### 3.5 The toolbar while a tour plays, and the gap

- The **Stop slot is deleted** (`StopTourSlot`, `.ws-stop-tour-slot`): an empty 24 px span between Camera and Mode
  that put them 40 px apart. Now every neighbor pair is 8 px apart.
- While a tour plays outside a recording, the **Camera tool is Stop**: a stop glyph, tooltip "Stop tour (Esc)",
  `aria-label` "Stop tour"; a click runs `tour.stop`. It keeps its 32 px, and Escape has a visible button exactly
  while it applies. During a recording the Export dialog's own Stop serves.
- Escape stops the tour only after inner things had their turn (`isPanelEscape` in `keys/keys.ts`): field typing, an
  open `Select` list, a menu or a dialog take it first.

### 3.6 Main menu (top left)

```
| Save                                 Mod+S |
| Save as...                     Shift+Mod+S |
| Save a copy... |
| Export...                            Mod+E | <- data, styles, recipe, project (no image, no video)
```

- There is no Export image... and no Export video...: the commands `file.export-image` and `file.export-video` are
  deleted, so Quick actions finds neither.
- **Export...** opens the generic Export dialog, whose "What to export" list is Data, (Report, from master), Styles,
  Recipe and Project: Image and Video are gone from it, and so are recent image and video entries. It opens on Nodes,
  or on the open table's kind when the table dock is open (`exportTarget` no longer defaults to Image).
- **Image and video are exported from their item:** a camera's Export image... runs `store.set({ dialog: "export",
exportOn: "image", exportSource: null, exportView: name })`, and a tour's Export video... runs `store.set({
dialog: "export", exportOn: "video", exportSource: null, exportTour: name })`. `exportView` is a new store field
  (`WorkspaceState`, `INITIAL` null, `ON_RELOAD` "fresh: set when the Export dialog opens"), like `exportTour`. The
  dialog's open effect sets the Image output's camera to `exportView`, or the Video output to Motion Tour with that
  tour.
- **Opened on Image or Video, the dialog shows that output alone:** titled "Export image" or "Export video", with no
  "What to export" list. The other fields are unchanged; the preset camera or tour may still be changed.

### 3.7 Export dialog: Image

```
| Export image |
| Preset      [To share                  v] |
| Camera      [Hub cluster               v]  <- the camera whose Export image... opened it
| Size        [1x 1280x720 | 2x 2560x1440 | 4x ... ] |
| Format      [PNG | JPEG | WebP] |
| Background  [Canvas color | Transparent] |
| Legend      [x]  Corner [Bottom right v] |
```

- **Camera**: Current camera, then the saved cameras in project order. An unusable one is disabled with its worded
  `viewProblem` code. The choice is passed as `camera: {view}`.
- **Size** labels show pixels from the new `getCanvasSize()`.
- **Legend** becomes an explicit checkbox with a corner. It defaults on when the legend is shown on the canvas.
- **Transparent** is allowed for PNG and WebP, matching the element's rule.

### 3.8 Export dialog: Video

```
| Export video |
| Motion      [Tour | Still] |
| Tour        [Supply risk walk          v]   (Tour) |
| Camera      [Current camera            v]   (Still) |
| Length      0:14 (Tour, read only) | [3 | 5 | 10 s] (Still) |
| Frame rate  [30 | 60] |
| Frames      420 |
| [==============>                    ]  Stop 2 of 4 |
| [Stop] [Record] |
```

- **Motion**: a tour, or a still camera for a set length.
- **Tour** picks a saved tour; it opens set to the tour whose Export video... opened it, so a tour always exists
  when the dialog opens. There is no no-tours state and no "Video tours..." `ActionRow` with the flag on (with the
  flag off, master's Video output is unchanged).
- **Length** for a tour is `planTour().totalMs`, read only. **Still** has a Camera list and keeps 3 / 5 / 10 s.
- **Frames** is a plain value row from `estimateAnimationCapture`. When `likelyToDropFrames` is true the app words
  that fact: warning color, focusable, words through `aria-describedby` and a tooltip, so not color alone.
- **Progress** is a `Progress` bar from `animation-progress`; the stop label reads `tour-progress`.
- **While recording** the app passes `motion: "authored"`, and when `isMotionReduced()` covers the canvas with an
  opaque layer so the reader's screen does not move.
- **Escape and closing.** While recording, Escape and the close button act as Stop: the first Escape cancels
  (`E_CANCELED`) and the dialog stays open; a second closes it. Any other close cancels first, so nothing records
  unseen.
- A tour renamed or deleted while the dialog is open shows the Tour select in error, "Tour not found".
- **Not in the flag-on output** (`TourVideoOutput.tsx`): the views `MultiSelect`, its "2 or more" rule, the even
  split, the app's default tour, and the `FramesChip` pill. Master's `VideoOutput.tsx` keeps all of them and is
  what the flag-off dialog shows (section 5, Export).

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
- **Starting cameras.** `setStartingCameras(list)` is a session option, never saved; the project carries only the
  fact `startingCamerasWritten`. One internal write, **seed**, appends the list after the project's views (each
  following its view; a taken name skipped, a held key dropped) and sets the fact, writing `views`, `viewOrder` and
  `config` together. It runs when the option holds a list and the fact is false, at two points:
    1. **At the call**, on the session's current project. While history is empty and nothing is pending (a fresh
       element's blank project), it goes through `Dispatcher.seed()` into the baseline: no undo step, project not
       changed, no `project:changed`, only `views-changed`. Called late, it is one ordinary undoable step with fact
       `{code: "view.starting", params: {names}}` (added to `HistoryCode`), and undo removes the five and restores
       the fact to false.
    2. **At the end of `project.open`**, inside the opening transaction, after the file's views, order, tours and
       settings are restored, so it is part of the baseline. `readSettings` writes the fact from the file, `false`
       when absent, so an old file is seeded once after its own views. Autosave recovery is an open too.
       Both points read the project's own fact, so call order does not matter. An unknown `follows` in the list is
       refused (`E_UNKNOWN_CAMERA {name}`); one unregistered by seed time is skipped alone. `null` (the default) writes
       nothing. The fact gets a `CONFIG_KEYS` entry (`z.boolean().default(false)`), is written explicitly by the saver
       beside the settings (as `timelineHiddenAdded` is), a round-trip fixture, and a reachability entry naming it
       internal.
- **Older fixed states** with no `mode` get it filled in when read from a file, from the mode predicate (only 3D
  members: `"3d"`; only 2D members: `"2d"`; neither: left out, fits both).
- **Following views wherever a view is read as a pose.** `resolveCameraPreset(name)` resolves a following saved view
  to the pose its camera view gives now (today it returns `session.views.get(name)` as a `CameraState`, which is
  the wrong type once values are `SavedView`). `viewProblem`'s saved-state check and the AI `view.restore` path
  through `view.camera` read `SavedView` the same way.

**Breaking, for the commit message:** camera doors (`setCameraState`, `setCameraPosition`, `setCameraZoom`,
`applyCameraView`, `view.camera`, capture's camera) reject with `E_UNSUPPORTED` a state that does not fit the drawing
mode, and while immersive; `views.save` is refused while immersive; `getCameraState()` includes `mode`;
`resolveCameraView`'s `details.reason` is the code `"mode"`; `saveCameraPreset` returns a Promise; `session.views`
values are `SavedView` (read `.camera` or `follows`); `resolveCameraPreset` resolves a following view to a pose;
`view.save` and `view.remove` history entries carry facts; `bottomView` becomes a protected name.

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
  `animateOrbitCamera` animated the Euler `rotation` from that stale (0, 0, 0), so the first frame snapped to the
  front view before sweeping to the target, swung yaw the long way, and left `rotationQuaternion` null.
- **The fix.** The start is `pivot.rotationQuaternion ?? Quaternion.FromEulerVector(pivot.rotation)`, the end the
  target orientation as a quaternion; each eased frame sets `Quaternion.Slerp(start, end, t)` on the same clock as
  `animateCameraDistance`. Finalize writes the end quaternion only after the position, distance and slerp motions
  have all ended, and the observer is removed at the end and on abort.
- **One pose-to-orientation conversion.** `orientationFromPose(position, target)` in `camera/` replaces three copies
  in `Graph.ts` and serves cuts and flights alike. Pole rule: when the horizontal length of `position - target` is
  under 1e-9 of the distance, yaw is exactly pi, pitch +/-90 degrees, roll 0. A state carrying `pivotRotation` uses
  it as is. A hold's pose is that orientation for the stop's resolved state.
- **Guard.** `PivotController.rotateAroundAxis` falls back to `Quaternion.FromEulerVector(this.pivot.rotation)`,
  never `Identity()`.
- 2D flights turn too. The 2D camera has no pivot orientation, but it has a turn (`rotation`), and a flight
  to a camera with a different turn used to set the whole turn on the first frame and glide only the pan and
  zoom. The turn now glides on the same eased clock as the pan and zoom, the short way round.

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

- `views` is written in `viewOrder`, each entry `{name, camera?, follows?, key?}`; an older file has `camera` only
  and loads unchanged. `startingCamerasWritten` travels with the settings; the list itself is never saved.
- **Older readers:** beside `follows` the writer also writes the pose it resolves at save time as `camera`, so a
  released reader loads a usable fixed camera and `views` needs no version. An entry with neither is skipped with a
  report entry.
- `tours` is a versioned sub-object (version 1, pauses included), written only when a tour exists; a newer version
  is skipped with a report entry. Opening a project clears tours in `clearInto` and restores them after views
  (`tx.tours`), so tours never carry from one project into the next.
- The live camera is still not saved (issue #3260).

### 4.6 Undo facts

The new operations (`view.rename`, `view.move`, `view.key`, `tour.save`, `tour.remove`, `tour.rename`, `tour.move`) carry facts
only, for example `{code: "view.rename", params: {from, to, tours}}`; the app writes "Renamed View 3 to Hub
cluster". Their codes join the `HistoryCode` union, and `UndoableDefinition.undo.label` in `Dispatcher.ts` becomes
optional when a `fact` is given. `view.save` and `view.remove` move to facts in the same change (`{names}`), so
the app words every camera history entry. Seeding stays outside undo except a late call (`view.starting`, section
4.1); jumps, plays and recordings stay outside undo.
In the app, `frame/historyWords.ts` words the facts instead of the old `view.*` labels.

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
| Recording canceled                                                 | `E_CANCELED` (new)                                                                            |

`modes` lists the modes the view works in (a camera view's descriptor, or the one mode a saved state fits); `name`
is absent for a raw state; `stop` is the 0-based stop index.

### 4.8 Deletions, AI tools and docs

- Delete the legacy AI `captureVideo` command (it never recorded), `CaptureCapability.pdf` and the stale "Phase 5"
  and "Phase 7" notes (breaking).
- AI tools (`ai/tools/families/view.ts`): `view.save` gains `follows` and `key`; `list_saved` reports them;
  `tour.list` is new; `capture.animation` takes `{tour: name}`; `tour.move`, `tour.remove` and `tour.rename` stay
  excluded as panel state. The `camera` tool's `preset` takes camera view ids only; a saved camera, the starting
  five included, is applied with `view.restore`, and both descriptions say so.
- `doors.ts` lists `views.setKey` and `views.setStartingCameras`; `view.key` gets a round-trip fixture and `view.save`'s
  gains `follows` and `key`; the cost coverage classifies both doors. `SavedView.follows` and `SavedView.key` join
  `tools/api-report.mjs`' `PLAIN_STRING_ALLOWLIST` (they are identifiers).
- Docs: `camera.md` gains saved views (fixed and following), keys, `setStartingCameras`, `resolveCameraPreset`,
  `viewProblem(name, {saved: true})` and shadowing, `bottomView`, the mode table, pauses and Fit's kept angle;
  `screenshots.md` gains `camera: {view}` and both meanings of `duration`. The section 4.9 example goes in the
  guide, a typecheck test and a browser test.
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

### 4.10 Fit and Fit selection keep the angle and fill the canvas

The fill is graphty-element behavior, so every consumer gets it; whether to keep the angle is a choice the element
already offers (`fitToGraph`'s `keepAngle`). The app's Fit (`view.fit`, key `0`) and Fit selection
(`view.frame-selection`, key `F`) both call `applyCameraView("fitToGraph", {animate: true, params: {keepAngle:
true}})`, the latter with `scope: "selection"`, as Fit selection already does on master. Not gated by the
experiment.

- **Fit** zooms and pans so the whole graph fills the canvas on its limiting axis with about 5% margin. In 3D it
  keeps the current direction, pivot turn and roll: it never rotates. In 2D it keeps the turn, as today.
- **Fit selection** does the same for the selected nodes and both ends of selected edges: they fill the canvas on
  the limiting axis, centered on screen, at the same angle.
- **Cause today.** `fitToGraph`'s `keepAngle` is off by default, so Fit looks from the fixed diagonal with no
  `pivotRotation` and the turn and roll are replaced (measured: direction `[0.543,-0.412,-0.732]` became
  `[0.577,0.577,0.577]`). With `keepAngle`, `fromDirection` always has a turn (`getCameraState` always sets
  `pivotRotation` in 3D), so it skips the per-axis fit and holds every point to `min(tanX, tanY)`, pads 10%, and
  centers on the 3D box instead of the screen box (measured: 4 selected nodes filled 0.65 x 0.35, off center).
- **The change** (`camera/builtins.ts`, `catalog/cameras.ts`):
    - `keepAngle` keeps its default, off, so a saved view or tour stop that follows `fitToGraph` still gives the
      same picture whatever the camera did before (the catalog comment's reason). No default changes, so nothing
      breaks for callers. `docs/guide/camera.md` gains one line: pass `keepAngle: true` for a Fit that never
      turns the camera.
    - In `fromDirection` with a kept turn, the screen right and up axes come from the kept pivot quaternion, roll
      included (`Quaternion.RotationYawPitchRoll(turn.y, turn.x, turn.z)` applied to (1,0,0) and (0,1,0)), and each
      point is tested per axis (`|right|/tanX`, `|up|/tanY` at its depth) instead of radially.
    - The target is offset along right and up so the projected screen box is centered.
    - Padding is 5% on the kept-angle path only (`keepAngle: true` with a turn to keep), in 2D and 3D; 2D already
      pads 5% (`FLAT_PADDING`). The default path (`keepAngle` off) keeps `PERSPECTIVE_PADDING`'s 10% and its
      diagonal, so a consumer's default Fit picture does not move.
    - **One deliberate exception to "Fit never rotates":** the seen-from-behind guard for one-sided drawings (maps
      and globes), already on master, stays. When the reader has orbited under a map, so the camera looks at the
      map's blank back, Fit turns to the front instead of zooming on the blank side. Keeping the angle there would
      fill the canvas with nothing a reader can use. Graphs that are not maps never hit it. The report to the owner
      names this exception; removing it is one condition in `builtins.ts`.
- **Follow selection** (the element's `pivotOnSelection`) does not re-target the pivot after an explicit
  `applyCameraView`: the placement wins. Without this, Fit selection with Follow selection on is re-centered on
  the pivot after the fit and the selection no longer fills the canvas (owner's point 4).

---

## 5. graphty app changes

All paths under `graphty/src/workspace/`. Every surface below is gated by `cameraViewsOn` (section 3.0); with the
flag off the code paths are master's.

### Views place (`views-place/`, new)

- `ViewsPlace.tsx` (the place and the two sections, no title), `CamerasSection.tsx`, `ToursSection.tsx`,
  `TourStops.tsx` (camera stops and pauses), `commands.ts` (`place.views`, `camera.save`, `camera.key-1` ... `camera.key-8`) and
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
- One unfolded card per list is the app holding CardList's controlled `folded` set (`autoFold` acts only on append).
- `TourStops.tsx` renders the nested stop `CardList` (section 3.1); its `<ol>`, its "..." menu and its Mod+]/Mod+[
  and Delete handlers are deleted. `useHeaderKeys` in `commands.ts`, the "..." items that duplicate a card control
  (`CardMenu.tsx`'s Key submenu, Go to, Update, Rename, Move up and down, Easing) and `moveItems` for tours go.
- compact-mantine's CardList gains `keyboardReorder` and `onReorderEnd` (both off by default) with their tests and
  a story; nothing else in compact-mantine changes. Three parts of that are new code, not existing behavior:
    - the doc comment on `onReorder` ("The grip takes no keys ...") is rewritten to say the grip takes Alt+Up and
      Alt+Down when `keyboardReorder` is set;
    - focus after a key move lands on the moved card's grip by id (`[data-card-grip=id]`); today `focusNext` only
      focuses a card section by index (`{ at }`), so it gains a `{ grip: id }` form. The lookup is scoped to that
      CardList's own root element, never `document`: a stop list is nested inside a tour card, and stop ids (`"0"`,
      `"1"`, ...) can equal ids in another list, so a document-wide query could focus the wrong grip;
    - the new words are `useLabels` entries in `compact-mantine/src/i18n/labels.ts`: the grip tooltip with keys
      ("Drag to reorder (Alt+Up, Alt+Down)", used only when `keyboardReorder` is set, so `reorderCard` is
      unchanged) and the announcement ("Moved to position {n} of {m}").
- `commands/registry.ts`' per-owner manifest gains a views-place owner (`place.views`, `camera.save`,
  `camera.key-1` ... `camera.key-8`) and loses the deleted `view.*` ids from the toolbar owner.
- `design/ui/framework/information-architecture.md`'s Views row moves from "Graph panel, last section" to "the
  Views place".
- All writes go through `session.views` and `session.tours`. The app keeps no camera or tour state beyond which cards are unfolded, the last
  camera applied, and the playing tour from `tour-progress`.

### Toolbar (`toolbar/`)

- `commands.ts`: master's `STANDARD_VIEWS` and its `view.front`, `view.side`, `view.top`, `view.isometric` and
  `view.save` commands **stay, and are not deleted**: each carries `experiment: true, shown: (ctx) =>
!cameraViewsOn(ctx.session)` and no `feature` (section 3.0), so with the flag off they run as on master (Front 1,
  Side 3, Top 7; Save view has no key, as on master) and with it on `switchedOff` drops their doors and their keys.
  `view.auto-rotate` is not touched: it keeps 9 in both states. This branch's `view.previous`, `view.next`
  (with their `[` and `]` keys) and `view.views-section` are deleted outright: master never had them. The new `camera.save` ("Save camera", `V`) is flag-on only; `nextName` accepts "Camera". Camera
  palette rows show each camera's key. The seven `camera.key-N` commands of section 3.4 live in
  `views-place/commands.ts`.
- **One rule for labels this branch renamed: they go back to master's, flag on and off.** `view.frame-selection`
  reads "Frame selection" and `view.follow-selection` reads "Follow selection" everywhere they show (the Camera
  menu, the canvas context menu and `inspector/kindMenus.ts` read each command's one static `label`). The owner did
  not ask for either rename, and a flag-dependent label would need a new registry field. This document's "Fit
  selection" is `view.frame-selection`.
- `commands.ts`, `view.fit`: its `run` gains `params: { keepAngle: true }` (one line, section 4.10). Not gated:
  this changes Fit for the flag-off app too, as the owner's point 3 asks.
- `WorkspaceToolbar.tsx`: the Camera menu of section 3.2 (no "All cameras..." row); delete `StopTourSlot` and
  `SavedViewRows`' Remove view submenu; the Camera tool renders as Stop while a tour plays. `toolbar.css` loses
  `.ws-stop-tour-slot`. With the flag off, master's `CameraMenuRows` returns whole: its labels ("Follow
  selection"), its `view.*` rows, Auto-rotate with 9, and Export image and Record video / Stop recording with
  Shift+I and Shift+R. With the flag on, those two rows draw nothing because `useCommand` returns null for a
  command whose `shown` is false.
- `viewWords.ts` keeps the words for camera view ids (the Fit row, the Kind row, a stop naming an id) and gains
  "Bottom"; its standard-row labels go.
- `frame/historyWords.ts` words the new facts: "Saved camera Hub cluster", "Renamed camera Top to Overhead",
  "Moved key 7 from Top to Hub cluster", "Added a pause to Supply walk".

### Starting cameras (`Workspace.tsx`)

- `onElementReady` awaits `session.views.setStartingCameras` with the list of section 3.3 when
  `cameraViewsOn(session)` is true, unconditionally within that case, before that element's first load: before the effect's early return when `opening === null` and
  before the `defaults` config patch (which a reload skips), so every element with the flag on gets it. With the
  flag off it is not called, so the project gains no views and `startingCamerasWritten` stays false. This is the
  only place the
  five names and keys appear in the app.
- `style/coverage.ts` lists `startingCamerasWritten` as `no("a project record, not a style")`, beside
  `startingRows`.

### Export (`export/`)

- **With the flag off the dialog renders master's Image and Video outputs, as master's code.** This branch
  rewrote both outputs (Legend checkbox and Corner, size labels from `getCanvasSize`, the transparency rule and the
  `ViewSelect` camera list in Image; Motion Tour from `session.tours`, no views `MultiSelect`, no even split, no
  default tour, no `FramesChip` in Video). Gating each of those inside one file would leave flag-off depending on
  many small branches, so the two are split:
    - `ImageOutput.tsx` and `VideoOutput.tsx` go back to master's files (`git show <master>:<path>`, master as merged in, section 3.0), with the
      parts of `choices.ts` they use (master's `VideoChoices` with `stops`, `tourStops` and their helpers) kept
      beside the new ones. A diff of the two files against that master commit is empty. If one no longer compiles because
      an element API changed, that is an element break to fix in the element, not a reason to edit the file.
    - The flag-on outputs move to new files `CameraImageOutput.tsx` and `TourVideoOutput.tsx` (with
      `ViewSelect.tsx` and `viewChoice.ts`): the "Camera" field listing Current camera then the saved cameras,
      and section 3.8's tour video. They have no no-tours state.
    - `ExportDialog.tsx` picks the pair by `cameraViewsOn`. Retiring the flag later deletes master's two files.
- `commands.ts`: master's `view.export-image` (Shift+I) and `view.record-video` (Shift+R) stay as master's code
  and gain `experiment: true, shown: (ctx) => !cameraViewsOn(ctx.session)`, no `feature` (section 3.0). Nothing
  else in them changes, so the flag-off Camera menu exports and records exactly as master.
- `commands.ts` deletes this branch's `file.export-image` and `file.export-video` (and their `FILE_LIST` and
  `EXPECTED_COMMAND_IDS` entries); master never had them. `exportTarget` defaults to Nodes when the flag is on and
  to Image, as on master, when it is off.
- `ExportDialog.tsx`: with the flag on, OUTPUTS drops Image and Video and the Recent list drops their entries;
  opened on Image or Video it renders that output alone with its own title (section 3.6). The open effect reads
  `exportView` and `exportTour`. `state/store.ts` gains `exportView`.

---

## 6. Accessibility and keyboard

| Key                   | Command                                                                                 | Visible button                                                               |
| --------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `V`                   | Save camera                                                                             | Cameras section `[+]` (key in its tooltip); the Quick actions row prints `V` |
| `1`-`4`, `6`-`8`      | Go to the camera holding that key                                                       | That camera's Camera menu row and Go button                                  |
| `0`, `F`, `9`         | Fit, Frame selection, Auto-rotate (master's, unchanged)                                 | Camera menu rows                                                             |
| `Shift+I`, `Shift+R`  | Master's Export image and Record video: flag off only; with the flag on they do nothing | Their Camera menu rows (flag off)                                            |
| `Escape`              | Stop tour (while one plays, after inner controls)                                       | The Camera tool, which is Stop while a tour plays                            |
| `Alt+Up` / `Alt+Down` | Move a camera or a tour stop (on its focused grip)                                      | The grip, whose tooltip names the keys                                       |

- `V` and the digits follow the app's switch for single-key shortcuts and never fire while typing.
- No card-header keys: F2, Delete, Mod+] and Mod+[ do nothing on a card.
- No roving tabindex: Tab walks each card's header buttons in order (grip, fold, title, Go, menu, x). Enter on Go
  goes to the camera; Enter on the title renames; Enter on the fold folds. Reordering never depends on dragging: the
  grip takes Alt+Up and Alt+Down.
- The playing stop row gets `aria-current="step"`. The workspace's polite status line announces each stop change
  ("Stop 3 of 4, Port nodes"), never a timer tick. The recording bar is a `progressbar` with `aria-valuenow`.
- Disabled rows and buttons stay focusable with `aria-disabled` and their reason as tooltip and description.
- Opening the Views place from Quick actions (through `viewsFocus`) moves focus to the asked-for section; closing a row
  menu returns focus to its button.

---

## 7. Tests and stories

Every UI test drives real input (clicks, keys, typing through `userEvent` on roles and accessible names), asserts
what a reader would see through the public API, uses `assert`, and waits on conditions with no timeout of its own.

### graphty-element (vitest)

- **Session (Node):** rename keeps order and key and rewrites stops; move, `setKey` (moving a held key), remove and
  their undo; `save` with both `camera` and `follows`, or an unknown `follows`, is refused. `setStartingCameras`
  writes once in order, skips a taken name, drops a held key, writes nothing by default. Seeding a fresh element
  leaves `canUndo` false, the project clean and no autosave entry, and survives `loadDataset`; a late call is one
  undo step with `view.starting`. The open path keeps a deleted, renamed or reordered Top, writes nothing on
  recovery, seeds an old file once after its own views (in either call order), and skips an unregistered `follows`.
  `orientationFromPose` gives yaw pi at both poles for +0 and -0. Pauses plan as holds; a bad pause is
  `E_OPTION_RANGE`. The file round-trips views, keys, pauses and the fact; the `tour.*` operations undo; opening
  project B after A leaves no tour of A.
- **Real element (browser):** `test/browser/tour-continuity.test.ts` records `getCameraState()` and `tour-progress`
  every frame while tours play (Top, Isometric, Side; pole to pole; fixed and following; an arbitrary start; a
  pause; 2D tours with turns across the half turn). For each flight it checks that progress follows
  `ease(elapsed / duration)` within 0.05, that the first frame does not snap, that the angle never decreases, and
  that the last frame and every hold equal their pose within 1e-3. It writes the per-frame table for the Top,
  Isometric, Side tour to `tmp/views-navbar/` on every run. After a flight, a 5 px drag turns less than 5 degrees.
  `bottomView` looks straight up and is protected; a following view frames nodes added later.
- **The section 4.9 example** compiles against the built declarations and runs against a real element.

Recording tests run in real time, so each uses a one- or two-stop tour with holds of a few hundred milliseconds.

### graphty app (`*.real-element.test.tsx`)

All app tests of this work call `withFeatures(["camera-views"])` (`graphty/src/test/features.ts`), except the
flag-off tests, which call `withFeatures([])`.

- **The "features-on" test projects** run every graphty test with every experiment on
  (`src/test/setup-features-on.ts`, `{ features: ["all"] }`), so camera-views is on there. Existing tests that
  assert master's Camera menu, main menu, Export dialog (Image and Video choices, opening on Image) or keys 1, 3
  and 7 call `withoutFeatures(["camera-views"])`, so they keep testing
  master's surfaces in both configurations. The implementer finds them by running the touched toolbar, export,
  frame, canvas-menu and inspector tests in the features-on project.

- **Views place:** the rail shows Graph, Data, Views, Notes; clicking Views shows Cameras and Video tours (no
  heading), and each collapses. A new project lists Top 7, Bottom, Front 1, Side 3 and Isometric as ordinary
  cards. Click Side's Go button (the camera flies to Side); click Top's title and type a name (rename; the Camera
  menu row follows); move Top by a real grip drag (one undo step) and by Alt+Down on its grip; give Isometric key 7
  in its Key select (Top loses it; undo restores both); press 7 (the camera flies to Isometric); delete Front and
  undo (it returns to its place with key 1). Press `V`: "Camera 1" appears with its name open. Unfold it: Kind, Mode
  and the 3D values show. Update Top to the current camera: Kind reads Fixed. Rename Hub cluster onto "Top": the card
  keeps its name and the notice reads "Name in use". Switch to 2D: Bottom, Front, Side and Isometric are disabled
  with "3D only", Top works.
- **One control per action:** each camera, tour and stop card's controls, enumerated by accessible name, hold each
  action once; the row menus hold exactly the items of section 3.1; F2 on a card opens the project rename.
- **Video tours:** New tour, Add camera > Top, Add camera > Isometric, Add pause, Add camera > Side; edit a Stay; the
  length updates; drag stop 3's grip above stop 1 (the tour's stops reorder, each keeps its times; one Undo restores
  them, and the Fly in label of the stop now first carries stop 1's tooltip and `aria-description`, "Seconds to
  fly here from where the camera is when Play is pressed (0 cuts straight there)", while the old stop 1, now
  second, carries "Seconds to fly here from the previous stop"); start a drag and cancel it with a pointercancel (nothing changes, no undo step); Alt+Up on a stop's grip
  (it moves and its grip keeps focus); Play (the stop
  is marked, the Camera tool is Stop, the camera returns); play again and click the Camera tool (the tour ends);
  during Play open a stop's camera list and press Escape (the list closes, the tour keeps playing); drag on the
  canvas during Play (the tour ends, the camera stays). Tour cards have no grip.
- **The owner's tour, through the UI:** New tour, Add camera > Top, Isometric, Side, Play. A
  scene after-render listener records the same per-frame table as the element test, writes it to
  `tmp/views-navbar/app-tour-top-iso-side.json` on every run, and asserts the same no-snap and progress checks.
- **Toolbar:** with no tour and with a tour playing, the gap between the Camera tool and the Mode tool equals the
  row's flex gap, measured with `getBoundingClientRect`. The Camera menu holds exactly the rows of section 3.2.
- **Keys (flag on):** with `withFeatures(["camera-views"])`, every registered command other than `camera.key-1` ...
  `camera.key-8` that holds one of `1`-`4` or `6`-`8` is `switchedOff`; `9` still toggles Auto-rotate; `Shift+I` and
  `Shift+R` export and record nothing; pressing `7` with Isometric holding 7 flies to Isometric, not to master's
  Top (proving `view.top` gave up the key); digits typed in a
  camera's name field do not fly; a digit no camera holds changes nothing.
- **Fit (real element):** orbit by a real drag, press `0`, then `F` with four nodes selected: direction and
  `pivotRotation` are unchanged within 1e-3, and the node box (from `nodeScreenPosition`) reaches 0.9 of the canvas
  on its limiting axis, centered within 5%; in 2D with a turn the rotation is unchanged.
- **Flag off:** with no features, the rail, Camera menu, main menu and Export dialog hold master's rows. The
  Export dialog opens on Image; choosing Video shows master's fields (a "Camera" Still/Tour switch, Length 3/5/10 s,
  and with Tour a "Views" `MultiSelect` that asks for "2 or more"; Frame rate; the frames chip), not the flag-on
  Motion and Tour selects. The Camera menu shows Auto-rotate with 9, and Export image (Shift+I) and Record video
  (Shift+R); `9` toggles Auto-rotate, and `Shift+I` exports an image as on master. Pressing `V`, `[`, `]`, `2`,
  `4`, `6` and `8` changes neither the camera nor `session.views`. A new
  project with no features has an empty `session.views` and `startingCamerasWritten` false, and opening it, saving
  it and reopening it with the flag still off keeps both.
- **New project:** New project, then nothing: Undo is disabled, the five are listed, and closing asks nothing.
- **No special names:** a grep test finds the camera view ids (`topView` ... `isometric`) in `graphty/src` only in
  `Workspace.tsx`'s starting list and `viewWords`, and the quoted names "Top" ... "Isometric" nowhere in
  `toolbar/`, `views-place/` or `export/` (tests excluded).
- **Opening a saved file, not only a sample:** open a project file whose Top was deleted and another whose Top was
  renamed: the list is exactly what was saved. Open an old file with two `{name, camera}` views: they come first,
  then the five. Reload the tab: the list is unchanged.
- **Export:** a camera's Export image... opens "Export image" with that camera and exports a PNG; a tour's Export
  video... opens "Export video" with that tour and records it; Escape during a recording cancels it and leaves the
  dialog open. Mod+E opens on Nodes with no Image or Video.

### Existing tests and stories that change

- The canvas menu, `inspector/kindMenus` and focus tests go back to master's "Frame selection" and "Follow
  selection".
- The `historyWords` tests, the command registry manifest test (the views-place owner's ids may be hidden), the
  toolbar `MenuSections`, `tasks` and `CameraViews` tests, the Views place tests, the Toolbar camera stories and the
  Export dialog tests are rewritten for the behavior above; each replaced story is replaced, never just deleted.
- Element tests that list camera ids gain `bottomView`; element Fit tests with `keepAngle: true` now expect the
  per-axis fill and screen centering, and those without it still expect the diagonal.

### Stories (compared by visual-review)

- Workspace/Toolbar: Camera menu in 3D, and in 2D with disabled rows; the toolbar with a tour playing (Camera tool
  as Stop).
- Workspace/Views place at 240 px: a new project; a 2D project; a camera unfolded; a tour unfolded with a pause and
  a broken stop; a tour playing. These replace the Graph place's Views stories.
- Export dialog: "Export image" from a camera, "Export video" from a tour, and the generic dialog without Image and
  Video.
- compact-mantine CardList: one story with `keyboardReorder` on; the existing stories are unchanged.
- Stories with the experiment on use `siteFeatures(["camera-views"])` (`graphty/src/test/siteFeatures.ts`, the
  stories' helper); one Toolbar story pins master's Camera menu with the flag off.

---

## 8. Acceptance criteria

The tests of section 7 pass. Beyond them, a reader can check each of the owner's feedback points (2026-11-18) with
the experiment on (`?features=camera-views`), then the flag-off list.

**1. Behind a feature flag**

1. `?features=camera-views` shows the Views place, the Camera menu of section 3.2, the main menu and Export dialog of
   section 3.6. `FEATURES` lists `camera-views` with `issue: 8814`; the API reports and `experiments.md` list it; canary's site file
   lists it, nightly and production do not.
   1a. With the flag on, the Camera menu has no Front, Side, Top, Isometric or Save view rows and no Export image or
   Record video rows; `Shift+I` and `Shift+R` do nothing; the Keyboard shortcuts dialog lists none of those seven
   commands; Auto-rotate shows and answers `9`.

**2. Design polish: tour inputs, tour menus, spacing, minimal menus**

2. The tour row menu holds exactly Export video..., Duplicate, Delete; the camera row menu exactly Export image...,
   Duplicate, Delete; stops have no menu.
3. The Camera menu has no "All cameras..." row and no Export image or Record video row; empty sections show only "No cameras" or "No tours".
4. The gaps of section 3.1's spacing table measure within 1 px (one bounding-box check), and nothing in the Views
   place clips at 240 px.

**3. Fit only zooms**

5. After a real orbit drag in 3D, `0` leaves `getCameraState()`'s direction and `pivotRotation` unchanged within
   1e-3, and the graph's screen box reaches at least 0.9 of the canvas on its limiting axis.
6. In 2D with a turn, `0` leaves the rotation unchanged and fills at least 0.9 on the limiting axis.

**4. Fit selection fills the canvas with the selection**

7. With four nodes selected after an orbit drag, `F` keeps direction and `pivotRotation`, the selected nodes' box
   reaches at least 0.9 of the canvas on its limiting axis, and its center is within 5% of the canvas center, with
   Follow selection on and off.

**5. No graph name at the top of the Views place**

8. The Views place has no heading and no text equal to the project's name; its first element is the Cameras section
   header.

**6. One way to do each thing**

9. On each camera card, Go, Rename, Assign key, Update to current camera, Reorder, Duplicate, Export image and Delete
   each have exactly one control; on each tour card, Play/Stop, Rename, Easing, Duplicate, Export video and Delete;
   on each stop, Camera, Fly in, Stay (or Wait), Reorder and Delete.
10. F2, Delete, Mod+] and Mod+[ on a card do nothing card-specific; F2 opens the project rename.

**7. Clear tour time inputs in a good layout**

11. Camera stops show "Fly in" and "Stay", pauses "Wait", each with an "s" unit and the tooltip and
    `aria-description` of section 3.1. Fly in and Stay are two rows under the Camera select. The labels Camera,
    Fly in, Stay and Wait share one 48 px label column (their left edges and their fields' left edges each equal
    within 1 px), the time fields are one width, and "10.5" typed in each is not clipped at a 240 px panel.
12. Setting Fly in 3 and Stay 1 on a stop changes the tour's length in its header by the matching seconds.

**8. Tour stops reorder by drag and drop**

13. A real pointer drag of stop 3's grip above stop 1 reorders `session.tours.get(name).stops`, and one Undo
    restores the old order.
14. Alt+ArrowUp on a focused stop grip moves it up one place and keeps focus on its grip; the grip tooltip names the
    keys. No Move up or Move down item exists anywhere.
15. CardList with `keyboardReorder` and `onReorderEnd` unset behaves as before: its existing tests and stories are
    unchanged, and `reorderCard` and every existing `labels.ts` entry are byte-identical (a hard check, since
    compact-mantine's Figma lock covers behavior).

**9. Tour cards are not reordered**

16. Tour cards draw no grip and have no move items or keys; `session.tours` order changes only by New tour,
    Duplicate or Delete.

**10. Export from a camera or a tour**

17. A camera's Export image... opens a dialog titled "Export image" with no output list and its Camera set to that
    camera; exporting passes `camera: {view: name}`.
18. A tour's Export video... opens "Export video" with no output list, Motion Tour and that tour chosen. Both items
    are disabled with the worded reason when the camera or tour cannot be used.

**11. Image and video gone from the main menu and the Export dialog**

19. The main menu has no Export image... or Export video..., and Quick actions finds neither.
20. Export... (Mod+E) lists no Image or Video and no recent image or video entries, and opens on Nodes (or the open
    table's kind).

**Only these points changed**

21. This work's own diff (from the commit that merges origin/master into the branch, section 3.0, to the head; the
    merge itself brings master's changes and is not counted) touches only these files, and their tests and stories:
    - graphty-element: `src/features/registry.ts`, the API reports under `api/`, `docs/guide/experiments.md`,
      `src/camera/builtins.ts`, `src/catalog/cameras.ts`, `docs/guide/camera.md` (the `keepAngle` line), and the
      `pivotOnSelection` re-target (below);
    - compact-mantine: `CardList` (its two props) and `src/i18n/labels.ts` (their entries);
    - graphty: `sites/canary.json`; under `src/workspace/`: `features.ts`, `views-place/` (every file),
      `toolbar/commands.ts` (the gates, `view.fit`'s `keepAngle` line, the label revert), `toolbar/WorkspaceToolbar.tsx`,
      `toolbar/toolbar.css`, `toolbar/viewWords.ts`, `commands/registry.ts` (the views-place owner),
      `export/commands.ts`, `export/ExportDialog.tsx`, `export/ImageOutput.tsx`, `export/VideoOutput.tsx`,
      `export/CameraImageOutput.tsx`, `export/TourVideoOutput.tsx`, `export/ViewSelect.tsx`, `export/viewChoice.ts`,
      `export/choices.ts`, `state/store.ts` and the `state/` reload table, `frame/menus.tsx`, `frame/Rail.tsx` and
      place registration, `frame/historyWords.ts`, `Workspace.tsx`, `style/coverage.ts`, the canvas context menu and
      `inspector/kindMenus.ts` (label revert only);
    - this design document and `design/ui/framework/information-architecture.md` (the Views row).
      `keys/keys.ts` and `keys/useCommandKeys.ts` are not expected to change: the hidden-command gate uses the
      existing `switchedOff`. A change to either must be traced to a point. Three of the files above, each traced:
    - the `pivotOnSelection` re-target (point 4: with Follow selection on, Fit selection must still fill the
      canvas);
    - `style/coverage.ts`'s `startingCamerasWritten` row (point 1: the flag decides whether that project field is
      written, and the coverage table must list every project field);
    - the label revert to master's "Frame selection" and "Follow selection" (point 1: with the flag off these
      surfaces equal master, and the labels are static), touching the toolbar commands, the canvas context menu,
      `inspector/kindMenus.ts` and their tests.
      The new `CameraImageOutput.tsx` and `TourVideoOutput.tsx` and master's restored `ImageOutput.tsx` and
      `VideoOutput.tsx` (point 1) are part of the export files above.

**With the flag off**

- [ ] The rail reads Graph, Data, (Assistant), Notes; Quick actions has no Views, camera or tour rows.
- [ ] The Camera menu is master's: Fit, Frame selection | Front 1, Side 3, Top 7, Isometric | saved views and the
      Remove view submenu | Save view | Zoom in and out (2D) | Auto-rotate 9, Follow selection | Export image
      Shift+I, Record video Shift+R (Stop recording while it records).
- [ ] The main menu is Save, Save as..., Save a copy..., Export...; the Export dialog lists Image, Video, Data,
      Report, Styles, Recipe and Project with master's Image and Video outputs, opening on Image.
- [ ] The Video output is master's (`VideoOutput.tsx` identical to master's): Still/Tour, Length, the Views
      `MultiSelect`, Frame rate and the frames chip.
- [ ] A new project's `session.views` is empty and `startingCamerasWritten` is false; `1`, `3` and `7` run Front,
      Side and Top; `9` toggles Auto-rotate; `Shift+I` exports an image and `Shift+R` starts and stops a recording;
      `V`, `[`, `]`, `2`, `4`, `6` and `8` do nothing. Save view is a menu row with no key. The Mode menu is
      master's (VR and AR as two rows); this work does not touch it.
- [ ] There is no Stop tool and Escape stops nothing tour-related.
- [ ] Fit and Fit selection still keep the angle and fill the canvas (not gated).

---

## 9. Implementation order

Each step builds, lints and tests on its own.

0. **Merge origin/master into the branch** (`git merge`, never a rebase), resolving conflicts toward master's code
   in every gated file, so "flag off = master" is measured against current master (section 3.0).
1. **Element: Fit and Fit selection** (section 4.10) with the browser fill test, and the `camera-views` experiment
   declaration (`{ id: "camera-views", plainName: "Camera views", issue: 8814, since: "2026-11-18" }`), its guide
   line and the API report.
2. **compact-mantine: CardList's `keyboardReorder` and `onReorderEnd`**, default off, with tests and a story.
3. **App: the flag**, gating every surface of section 3.0 so flag-off equals master.
4. **App: the Views place polish**: no heading, the trimmed row menus, the nested stop list, the time fields, the
   spacing, no tour reordering, no header keys, no "All cameras...".
5. **App: export**: the item Export entries, `exportView`, the single-output dialog, and the removed main menu rows
   and dialog choices.

---

## 10. Decisions and reasons

- **The app says "camera"; the element keeps "saved view".** Renaming `session.views` would collide with `catalog.cameras()` and buys a consumer nothing.
- **Starting cameras follow their camera view**, so Top still frames the graph after the data changes.
- **`SavedView` holds `camera` or `follows`, and `key`.** They are facts about the saved entry, not a pose; `setCameraState` stays pose-only.
- **Starting cameras are a session option plus a saved per-project fact**, seeded after everything is restored, so open order does not matter (issue #7843).
- **The blank project is seeded into the baseline; a late call is one undo step**, since a silent write after history exists would corrupt undo.
- **A refused rename uses the workspace notice**: `InlineRename` has no error look (Figma-locked).
- **Following views also write their resolved pose as `camera` in the file**, so the released reader loads a usable camera instead of an empty one.
- **Digits `1 2 3 4 6 7 8` only (0, 5 and 9 are master's Fit, 2D/3D and Auto-rotate); the element stores keys and the app binds them, for now** (element binding is filed as its own issue). Seven `camera.key-N` commands because the registry's `run` gets no key.
- **Go is a button; a title click renames**, as CardList (Figma-locked) does everywhere.
- **All five starting cameras in 2D too, four disabled.** Writing by mode would make the list depend on the mode a project started in.
- **A pause is a stop kind; Stay stays on camera stops.** Two pauses stay two.
- **Orientation flies as a quaternion slerp; the test checks progress against time**, never a mean step, which would be load-sensitive.
- **One pose-to-orientation conversion with a fixed pole rule**, used by cuts and flights alike.
- **The rail's Views item shares the camera glyph** with the Camera tool, a family on purpose.
- **Names stay the identity of views and tours**; rename rewrites stops.
- **`viewOrder` and tours are whole values**, so undo restores order exactly.
- **One mode predicate; `{target}` is 3D only.**
- **Reader input ends a tour and keeps the reader's placement.**
- **This branch's Previous and Next view are deleted, not gated.** Master never had them (nor `[`, `]`, or a key on
  Save view), so gating them would add them to the flag-off app. Camera keys replace stepping with the flag on.
- **Commands this branch added and no longer uses are deleted; master's commands are gated.** Only that keeps
  flag-off equal to master.
- **With the flag off, the Export dialog runs master's `ImageOutput.tsx` and `VideoOutput.tsx` unchanged; the
  flag-on outputs are new files.** Gating each branch change inside one file would make "flag off = master" a
  claim checked line by line; two untouched files make it a one-line diff check, and retiring the flag deletes them.
- **The Camera menu's camera rows and Quick actions' "Play tour: <name>" rows stay beside the cards' Go and Play
  buttons.** They are global doors, not per-card controls: the Camera menu rows are the visible buttons for the
  camera keys (every hotkey needs one) and let a presenter jump without opening the Views place, and Quick actions
  finds every command by design. The owner's "don't duplicate in menus if not necessary" is met because each is
  necessary for one of those reasons; removing either is one edit.
- **One experiment gates the app only.** The element's camera fixes help every consumer and the file format must not depend on a reader's flag; the starting-camera call is gated because it writes data into projects.
- **Keyboard reordering is the grip's own (`keyboardReorder`), not a menu.** A Move up/down item would be a second way to move; Alt+Up/Down matches the Tree. The prop is additive and off by default, so CardList's Figma-locked look is unchanged.
- **A drag is one undo step through `onReorderEnd`** (default off), not a session transaction held open across pointer events.
- **Stops are a nested CardList with a "Stop N" title and a labeled Camera select in the body**, since CardList's title is plain text. No per-stop Go: the camera's Go does it.
- **"Fly in", "Stay", "Wait".** They say what the camera does and avoid "Move", which reads as reordering. Stop 1's Fly in stays editable, because a first stop does fly from the camera's place when Play is pressed.
- **Replace with current camera is dropped**, not moved into the Select: a Select option that creates a camera would be a surprise. To swap in the live camera, save it (`[+]` or `V`), pick it in the stop's Camera select.
- **Add camera has no "Current camera" item.** It would be a second way to save a camera, and it filled the Cameras list as a side effect. A stop names a saved camera, so the reader saves first, then picks; holding a bare pose in a stop would be an element format change for one shortcut. This and dropping Replace with current camera turn "put this view in the tour" from one step into two (save with `V`, then pick it). That is a workflow cost the owner did not ask for; the report to him states it so he can veto it, and restoring the item is one menu entry.
- **Stop card ids are the indices from the start of a drag**, recomputed only after the drop, because CardList keys its cards, its grab closure and its focus by id; ids renumbered mid-drag would remount the dragged card and commit the wrong splice. A canceled drag (`onReorderEnd(id, null)`) commits nothing.
- **The stop fold stays, with a summary that names each time** ("Top, fly 2 s, stay 2 s"): CardList always draws a fold, and hiding it would be a CardList change for one list. Stops never auto-fold.
- **"Add camera" and "Add pause"** read as actions; **both row menus lead with Export**, so they match.
- **The generic Export dialog drops recent image and video entries**: those outputs are reached from their item.
- **Labels this branch renamed go back to master's, flag on and off: "Frame selection" and "Follow selection".** Neither rename ("Fit selection", "Focus selected") was in the owner's list; a registry label is static, so a flag-dependent label would add machinery; and one rule for both keeps the menu consistent. The owner says "Fit selection" for the command; the behavior fix is what his point asks for, and the report to him names the label.
- **Fit's `keepAngle` default stays off in the element; the app's Fit passes `keepAngle: true`**, as its Fit selection already does. Keeping the angle is a choice the element offers, and its neutral default keeps a saved view or tour stop that follows `fitToGraph` giving the same picture every time. The per-axis fill, screen centering and 5% padding are capabilities of the kept-angle path, fixed in the element for every consumer that asks for it; the default path keeps its diagonal and 10% padding. No default changes, so the commit has no "Changed for callers" note for Fit.
- **Image and video export are reached only from their item, with the flag on** (owner's point 10, and the request to remove them from the main menu and the generic dialog). Consequences the report to the owner states: a project with every camera deleted cannot export an image, not even of the current view, until a camera is saved (`V`); a project with no tours cannot export a still video until a tour exists. Each is one save away, and both stay reachable with the flag off.
- **camera-views is listed in canary's site file**, as the other experiments are, so it is visible on canary.graphty.app; the report to the owner says so.
- **The Camera menu keeps its first-12 limit** without "All cameras...": the rail's Views item is the door.
- **Master's hidden commands use `experiment: true` with an inverted `shown` and no `feature`.** `switchedOff` already
  drops a command's doors, keys and shortcuts-list row when `experiment` is set and `shown` is false, so this needs
  no registry or key-loop change. A plain `shown: false` would hide the rows but leave 1, 3 and 7 on master's views,
  breaking re-keyed cameras. Changing `switchedOff` for every command with `shown` would change other surfaces
  (Timeline and others), which is out of scope. The cost is that `experiment` here means "switched by an
  experiment", not "an experiment's door"; retiring the flag deletes these commands.
- **Bottom has no key; 9 stays Auto-rotate's, flag on and off.** Master gave Auto-rotate 9 after this branch
  forked. Taking 9 for Bottom only while the flag is on would make Auto-rotate's key depend on the flag and drop its
  visible key; leaving Bottom unkeyed changes nothing of master's, and a reader can give Bottom any free digit. The
  Key `Select` offers `1 2 3 4 6 7 8`.
- **Master's Camera menu Export image and Record video (Shift+I, Shift+R) are hidden with the flag on, keys
  included, and return with it off.** With the flag on they would be a second route to image and video export,
  against the owner's "one way of doing it" and "export opens from a camera or a tour". With the flag off they are
  master's, unchanged.
- **"Flag off = master" is measured against origin/master merged into the branch**, not the fork point: master
  has changed the same surfaces since (the Camera menu's export rows and Auto-rotate key, the Export dialog's
  Report), and an app matching a stale master would not match what readers see on master.
- **The stop times are stacked, one per row, on a 48 px label column.** On one line at a 196 px body each number
  field would be about 45 px and only the first label would sit on the column; stacked, every label (Camera, Fly in,
  Stay, Wait) lines up and each field is about 130 px. It costs one row per unfolded camera stop; the folded summary
  keeps a long tour short.
- **Fit keeps the seen-from-behind guard for maps and globes** (section 4.10): the one case where Fit turns the
  camera. It exists on master, applies only to one-sided drawings seen from their back, and keeping the angle
  there would zoom onto a blank side. It is an exception to the owner's "only zoom in / out", stated in the report
  to him.

**What the report to the owner names** (each a choice he may veto with one edit):

- the label stays "Frame selection" (master's), the command his point 4 calls "Fit selection";
- Fit's map-and-globe exception above;
- "put this view in a tour" is two steps (save with `V`, then pick it in Add camera);
- a still (Motion Still) video is reachable only through a tour's Export video..., and with no tours, no video
  export exists until a tour is made; with every camera deleted, no image export exists until one is saved;
- Follow selection and Zoom in / Zoom out stay in the Camera menu (section 3.2);
- Bottom has no key, because 9 is Auto-rotate's;
- camera-views is on for canary.graphty.app.

---

## 11. Out of scope

- Editing a camera's numbers by hand; which tours use a camera; camera thumbnails.
- Binding camera keys inside graphty-element (`attachKeymap`); its issue is filed in this work's pull request.
- Camera keys other than the digits `1`-`4` and `6`-`8`.
- An in-field rename error look (Figma-locked).
- A version guard on `tour.save` against another writer between read and write.
- A Video Size control and a "safe frame" guide; legend or background in video; WebM duration and seek cues.
- Pause, resume and seek in a recording; an option for reader input to be ignored during a tour.
- Views that also keep filters, layers and the legend (issue #816); saving the live camera (issue #3260).
- An element fact for whether auto-rotate is available (the app's 2D check is filed as an element defect).
- SVG export from a saved camera, editable file names, custom image sizes; per-stop easing; title cards, captions
  and audio; moving `captureScreenshot`'s abort to `E_CANCELED`.
- Changing what the canvas right-click Fit items and the inspector's Fit selection items do beyond the shared
  command: they run `view.fit` and `view.frame-selection`, so they get the kept angle and the label rule of section
  5 through the command and need no edit of their own.
