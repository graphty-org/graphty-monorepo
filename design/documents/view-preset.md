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
   holds only the notes a view shows (`notes`); each of the other captures can be added as an
   optional member later without a new major version. Canvas callouts, which report pages need
   (`W15.yaml`), are open decision 14.

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
  notes?: string[];              // ids of the notes this view (report page) shows, in order
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

## Applying

1. Views are added to the session's list in document order. Applying a view document does not by
   itself move the camera, unless `initial` names a view; then that view is applied.
2. Applying a view sets the drawing mode when `mode` is present, then places the camera.
3. When both `camera` and `framing` are present, the applier uses `camera` unless the document's
   fingerprint (or, in an envelope, the envelope's, when the view member has none) `differs` from
   the current graph's, and `framing` when it differs. `unknown` (no fingerprint, or a scheme the
   reader does not compute) uses the stored camera and is reported, so retiring a fingerprint scheme
   never replaces a submitted figure's camera. This is the one use of a fingerprint README allows.
   When only `camera` is present, it is applied as stored and the binding report says whether the
   graph matches; a stored camera on a different graph is legal and may point at empty space, which
   is why a writer SHOULD write a framing beside it.
4. A `mode` of `vr` or `ar` on a page that cannot enter that mode is reported with `E_UNSUPPORTED`
   and the camera is applied in the current mode. Entering an immersive mode requires a user
   gesture in browsers; an applier MUST NOT try to enter it without one, and reports the view as
   waiting for the reader instead.
5. A framing whose `cameraView` is not registered is reported with `E_UNKNOWN_CAMERA`, naming the
   id; the view is kept in the list, unapplied. A camera view that does not support the requested
   mode (its descriptor's `modes`) is reported with `E_UNSUPPORTED`. A `fit` naming a set the
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

## Writing

1. A writer MUST write every coordinate in scene units and every angle in degrees, whatever its
   renderer uses internally.
2. A writer SHOULD write a `framing` beside a stored camera, so the view still works on new data.
3. Saved filters are not part of version 1. A writer that saves views while a filter is active
   MUST report it (`W_GRAPHTY_FILTER`), so a person knows the recipient will see the whole graph.
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
| a view with both, no fingerprint anywhere | the stored camera is used; `unknown` reported |
| views saved while a filter hides half the graph | saved; `W_GRAPHTY_FILTER` reported |
| a framing naming `cameraView: "orbitFromNorth"` that nothing registered | view kept, reported `E_UNKNOWN_CAMERA` |
| a view with both, on a graph whose fingerprint differs | the framing is used |
| `initial` naming an id not in `views` | reported; no view applied |
| `mode: "vr"` on a desktop browser without WebXR | camera applied in the current mode; `E_UNSUPPORTED` reported |

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
      "notes": ["note_01", "note_02"]
    }
  ]
}
```

### A publication figure in 3D

`W25.yaml`: the exact camera of the submitted figure, with an isometric framing as the fallback
for anyone who opens the style on their own data.

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
      "framing": { "cameraView": "isometric", "fit": "graph" }
    }
  ]
}
```
