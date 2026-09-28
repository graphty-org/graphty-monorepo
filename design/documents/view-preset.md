# View document

`kind: "graphty-view"`, version 1. Schema: [view-preset.schema.json](view-preset.schema.json)
(normative for structure). Shared conventions are in [README.md](README.md).

## Purpose

A view document holds named ways of looking at a graph: the drawing mode and where the camera is.
The owner listed it tentatively ("maybe camera views?", 2026-09-19). It serves the analyst who
returns to the same vantage points across sessions (`design/designloom/workflows/W03.yaml`,
Iterative Analysis Cycle), the report whose pages are views in a chosen order (`W15.yaml`, Findings
Communication), and the publication figure that must be reproduced exactly (`W25.yaml`,
Reproducible Session and Network Publication).

### Three things called a view

The word names three different things in this repository; this document is only the second.

1. **A camera view** is an extension point: a registered, named function from the graph's bounds
   to a camera position ("From above", "Isometric"; `graphty-element/src/catalog/cameras.ts`). It
   stores nothing. A view document refers to one by id.
2. **A view preset** is a named, stored way of looking: a drawing mode plus either a stored camera
   or a framing by camera view. This document.
3. **A saved view** in the design studio's sense (`design/ui/framework/conceptual-model.md` 5.3)
   also captures filter steps, the style layers switched on, collapsed sets, stored positions,
   display toggles and an export setting. It belongs to a project and needs its data. Version 1
   holds the filter (`filter`), the layers switched on (`layers`) and the notes a view shows
   (`notes`), so four report pages can show four different subsets and emphases; each of the other
   captures can be added as an optional member later without a new major version. Canvas callouts
   and the image export of a page, which report pages need (`W15.yaml`), are open decisions 14 and
   33.

### Changes from the element API design

The element API design's `ViewPreset` (`design/element-api/element-api-design.md` section 12) is a
single preset `{ version, mode, camera: { position, target, zoomPercent }, name?, fingerprint? }`.
This document changes it in three ways:

- **A list of named views**, not one, because every consumer of views (bookmarks, report pages,
  `Graph.exportCameraPresets()`, which already writes a named map) holds several, and array order
  is the page order of a report (the design studio's door 38).
- **A renderer-neutral camera.** graphty-element's own camera state (`CameraState`,
  `graphty-element/src/camera/types.ts`) is Babylon.js-shaped: `arcRotate`, `alpha`, `beta`,
  `radius`, orthographic frustum edges. Writing those names into files would publish the renderer
  forever. The design's `{ position, target, zoomPercent }` cannot describe a 2D pan or an up
  vector. The camera here is the smallest shape that describes both projections without
  renderer terms; the element converts to and from its own state.
- **A framing** that computes the camera from the current graph, which is the only camera that
  still means something on new data.

## Data model

```ts
interface ViewDocument {
  kind: "graphty-view";
  version: 1;
  name?: string;
  fingerprint?: string;          // the graph the stored cameras were taken on
  generator?: { name: string; version: string };
  initial?: string;              // id of the view to apply on open
  views: View[];                 // in order; the order is meaningful (report page order)
  extensions?: Record<string, unknown>;
}

interface View {
  id: string;                    // unique in the document
  name: string;
  caption?: string;
  mode?: "2d" | "3d" | "vr" | "ar";   // default: leave the current mode
  camera?: StoredCamera;         // at least one of camera and framing
  framing?: Framing;
  prefer?: "camera" | "framing"; // with both, which to use when the graph's identity is unknown; default "framing"
  filter?: Filter;               // what this page shows (envelope.md, "The active filter"); default: no filter
  layers?: string[];             // ids (else names) of the style layers switched on; default: leave them as they are
  notes?: string[];              // ids of the notes this view (report page) shows, in order
  export?: FigureSettings;       // how this view is exported as a figure; see "Figures"
  features?: string[];
  extensions?: Record<string, unknown>;
}

type StoredCamera =
  | { projection: "perspective";
      position: [x: number, y: number, z: number];   // scene units
      target: [x: number, y: number, z: number];     // scene units
      up?: [x: number, y: number, z: number];        // default [0, 1, 0]
      fovDeg?: number }                              // vertical field of view; default: the element's
  | { projection: "orthographic";
      center: [x: number, y: number];                // scene units, the point at the viewport centre
      height: number;                                // scene units visible from top to bottom edge
      rotationDeg?: number };                        // counter-clockwise; default 0

interface FigureSettings {
  width?: number; height?: number;   // pixels of the exported image
  pixelRatio?: number;               // device pixels per CSS pixel
  dpi?: number;                      // written into the image's metadata
  legend?: { include?: boolean;      // default true
             placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "outside-right" | "outside-bottom" };
  notes?: boolean;                   // append the view's notes as a numbered caption list; default true when it has notes
}

interface Framing {
  cameraView: string;            // a camera view id from the element's catalogue
  params?: Record<string, unknown>;   // that camera view's options, as applyCameraView takes them
  fit?: Scope;                   // what to frame; default: the whole graph
}
```

`fit` is graphty-element's own `Scope`, the type `applyCameraView(id, { scope, params })` already
takes (`graphty-element/src/Graph.ts`), restricted by the rule a recipe uses: no `{ nodes }` and no
`define` holding a fixed set. Absent, the whole graph is framed, as `applyCameraView` does today. A
set scope (`{ set: id }`) is legal in a view, because a view belongs to a presentation of particular
data. Padding is not a member: `applyCameraView` has no padding input, and adding one is an element
change to make first.

Units: scene units are the coordinates node positions are stored in, the same space a layout
writes. Angles are degrees. The y axis is up in 3D; in 2D, x is right and y is up.

### Figures

A stored camera fixes where the camera is, and an orthographic `height` fixes only the vertical
extent: the horizontal crop, and where the legend falls, depend on the window. A view saved as a
figure therefore carries `export`: the image's width and height (so its aspect ratio), its pixel
ratio or DPI, and whether and where the legend goes. A figure export of that view reads it, so the
figure re-exported on another screen six months later has the same crop and legend as the
submitted one. `export` is additive in view version 1.

## Applying

1. Views are added to the session's list in document order. Applying a view document does not by
   itself move the camera, unless `initial` names a view; then that view is applied.
2. Applying a view sets the drawing mode when `mode` is present, applies its `filter` and `layers`
   when present, then places the camera. A `layers` entry is matched by the layer's authored id,
   else by its name; an entry that matches no layer is reported and ignored, and one whose name
   matches two layers is reported as ambiguous and switches neither. Layers not listed are
   switched off -- except, for a view from a document this installation did not write, layers that
   did not come from that same document, which stay as they are unless the caller agrees (the
   effect is reported under rule 9). Suggested layers have deterministic ids (recipe.md, "Steps"
   rule 4), so a page that lists one survives a `replace`.
3. When both `camera` and `framing` are present, the applier uses `camera` when the document's
   fingerprint (or, in an envelope, the envelope's, when the view member has none) matches the
   current graph's, and `framing` when it differs. When it is `unknown` (no fingerprint, or a
   scheme the reader does not compute) -- which is every view written until open decision 5 approves
   a scheme -- the view's `prefer` decides: `framing` by default, so a view document applied to next
   month's network frames it instead of pointing at old coordinates, and `camera` for a view that
   must reproduce an exact figure (the writer of a submitted figure's view sets it). The caller's
   `reproduce` option forces the stored camera. The choice is reported. This is the one use of a
   fingerprint README allows. When only `camera` is present, it is applied as stored and the binding
   report says whether the graph matches; a stored camera on a different graph is legal and may
   point at empty space, which is why a writer SHOULD write a framing beside it.
4. A `mode` of `vr` or `ar` on a page that cannot enter that mode is reported with `E_UNSUPPORTED`
   and the camera is applied in the current mode. Entering an immersive mode requires a user
   gesture in browsers; an applier MUST NOT try to enter it without one, and reports the view as
   waiting for the reader instead.
5. A framing resolves **only against registered camera views**, never against a user's saved
   camera snapshot of the same name: today `applyCameraView` falls back to a snapshot when no
   camera view holds the name (`resolveCameraPreset`, `graphty-element/src/Graph.ts`), and a view
   applied through it would silently move to a stored position. The framing path checks the id
   with `isCameraViewName` first (`graphty-element/src/camera/resolve.ts`), which is an element
   change to that path. A framing whose `cameraView` is not registered is reported with
   `E_UNKNOWN_CAMERA`, naming the id; the view is kept in the list, unapplied. A camera view that
   does not support the requested mode (its descriptor's `modes`, which are `2d` and `3d`; `vr`
   and `ar` are checked as `3d`) is reported with `E_UNSUPPORTED`. A `fit` naming a set the
   session does not hold is reported with `E_UNKNOWN_SET` and the whole graph is framed.
6. An `orthographic` camera applied in 3D, or a `perspective` camera applied in 2D, is converted
   by the element: the orthographic camera becomes a top-down perspective camera that shows the
   same `height` at the target plane, and the reverse. The conversion is reported.
7. `camera` and `framing` are validated separately. A view whose `camera` fails (a projection this
   reader does not know, a malformed vector) keeps its framing and applies it, reporting the camera;
   a view whose framing fails keeps its camera. A view with neither usable is kept verbatim,
   unapplied, reported with `E_BAD_COMMAND`, and written back on save; the other views apply.
8. `notes` lists the notes shown when this view is applied as a report page, in reading order. A
   note id that is not held is reported and ignored.
9. **Effects are reported.** Applying a view from a document this installation did not write --
   including one an envelope applies on open through `initial` -- reports what it changed, as a
   style's hiding layers are (style.md, "Reading and applying" rule 8): the number of elements its
   `filter` hides, and each layer it switched off, by name. An application SHOULD show that report
   before the reader relies on the view.

## Writing

1. A writer MUST write every coordinate in scene units and every angle in degrees, whatever its
   renderer uses internally.
2. A writer SHOULD write a `framing` beside a stored camera, so the view still works on new data,
   and MUST write `prefer: "camera"` on a view saved as a figure that must be reproduced exactly.
3. A view saved as a report page SHOULD carry the filter and the layers switched on when it was
   captured. A filter the element cannot express as predicates is reported (`W_GRAPHTY_FILTER`), so
   a person knows the recipient will see more than they did.
4. A writer MUST NOT write `fingerprint` until a scheme is approved (README).
5. The element's existing `exportCameraPresets()` map (`Graph.ts`) is not a view document. An
   applier that accepts it MUST convert it into a view document, one view per map key, and report
   every Babylon-only field it could not carry.

## Security

A view document names no resources and causes no fetch. It can switch the drawing mode; entering
VR or AR remains behind the browser's own permission and gesture rules.

## Conformance

| Input | Required result |
|---|---|
| `{ "kind": "graphty-view", "version": 1, "views": [] }` | accepted; nothing changes |
| a view with neither `camera` nor `framing` | that view kept unapplied, reported with `E_BAD_COMMAND` |
| a view with `camera: { "projection": "fisheye", ... }` and a valid framing | framing applied; camera reported |
| a view framed on `{ "set": "set_ring_a" }` that the session does not hold | `E_UNKNOWN_SET`; whole graph framed |
| a view with both, no fingerprint anywhere | the framing is used; `unknown` reported |
| the same with `prefer: "camera"`, or applied with `reproduce` | the stored camera is used; `unknown` reported |
| a view with `filter: { "nodes": "data.community == `3`" }` | only community 3 shown while the view is applied |
| a view with `layers` naming a layer id the stack lacks | reported; the other listed layers on, the rest off |
| views saved while a hand-picked hide is active | saved; `W_GRAPHTY_FILTER` reported |
| a framing naming `cameraView: "orbitFromNorth"` that nothing registered | view kept, reported `E_UNKNOWN_CAMERA` |
| a view with both, on a graph whose fingerprint differs | the framing is used |
| `initial` naming an id not in `views` | reported; no view applied |
| `mode: "vr"` on a desktop browser without WebXR | camera applied in the current mode; `E_UNSUPPORTED` reported |
| a framing naming `orbitFromNorth`, which only a saved camera snapshot of the session holds | `E_UNKNOWN_CAMERA`; the snapshot is not applied |
| a view with `export: { width: 2400, height: 1600, legend: { placement: "outside-right" } }`, exported on two screens | the same crop and legend placement both times |
| a view whose `layers` name `"Hubs"`, held by two layers | reported ambiguous; neither switched |
| an envelope from another installation whose `initial` view filters out one node and lists only `base` | applied; the report names the hidden count and every layer switched off; the reader's own layers left on |

## Worked examples

### Report pages for a findings briefing

`W15.yaml` (Findings Communication): an overview from above, then a close view of one cluster.

```json
{
  "kind": "graphty-view",
  "version": 1,
  "name": "Briefing pages",
  "initial": "overview",
  "views": [
    {
      "id": "overview",
      "name": "Whole network",
      "mode": "2d",
      "framing": { "cameraView": "topView", "fit": "graph" }
    },
    {
      "id": "ring-a",
      "name": "Ring A, close",
      "caption": "Twelve accounts sharing three devices",
      "mode": "2d",
      "camera": { "projection": "orthographic", "center": [142.5, -38.0], "height": 60 },
      "framing": { "cameraView": "fitToGraph", "fit": { "set": "set_ring_a" } },
      "filter": { "nodes": "data.ring == 'A'" },
      "layers": ["base", "ring-a-highlight"],
      "notes": ["note_01K5KZ7Y2S0M3N4P5Q6R7S8T9V", "note_01K5KZ8A4B5C6D7E8F9G0H1J2K"],
      "export": { "width": 1920, "height": 1080, "legend": { "placement": "outside-right" } }
    }
  ]
}
```

### A publication figure in 3D

`W25.yaml`: the exact camera of the submitted figure, preferred even when the graph's identity
cannot be checked, with an isometric framing for anyone who opens the view on data it does not
match. The figure's positions travel in the project (envelope.md, "Positions"), so the camera frames
the same layout.

```json
{
  "kind": "graphty-view",
  "version": 1,
  "views": [
    {
      "id": "figure-2",
      "name": "Figure 2",
      "mode": "3d",
      "camera": { "projection": "perspective", "position": [220, 180, 260], "target": [0, 0, 0], "fovDeg": 45 },
      "framing": { "cameraView": "isometric", "fit": "graph" },
      "prefer": "camera",
      "export": { "width": 2400, "height": 1800, "dpi": 300, "legend": { "include": true, "placement": "outside-right" } }
    }
  ]
}
```
