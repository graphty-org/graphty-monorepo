# Camera extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `camera.d.ts`, `descriptors.schema.json#/$defs/CameraDescriptor`, and this
document.

## 1. What a camera extension is

A camera extension is a **named view**: a way of deciding where the viewer stands and what they
look at, computed from the box being framed. Examples: a corner view for a floor plan, a map-like
top-down view for a geographic layout, a view that frames a hierarchy's root tier, a
"presentation" framing with extra margin.

The extension point is the VIEW, not the camera CONTROLLER. A controller (a Babylon.js camera plus
an input model -- orbit, fly, 2D pan and zoom) cannot be published without Babylon.js types in its
signature, which would tie every plugin to the renderer's internals and break it whenever the
renderer changes. Controllers stay internal (`design/graphty-element/extension-points.md`,
"Decision 5", kept). A view is a pure function of a bounding box, and the element's animation,
easing, queueing, cancellation, state-change event and screenshot framing are already built around
naming one.

Grounding: owner's list of official points (2026-09-21); owner's file-handling statement
(2026-09-19): "maybe camera views?"; the design studio's overview-to-detail and saved-view needs
(`design/designloom/workflows/W02.yaml`).

## 2. Data model

| Type | Kind |
| --- | --- |
| `CameraDescriptor`, `CameraViewRegistration`, the `compute` function, the returned `CameraState` | implemented by extensions |
| `CameraViewInput`, `GraphBounds`, `Vec3` | called by extensions |

`CameraDescriptor` rules:

| Member | Rule |
| --- | --- |
| `id` | Non-empty; not in `KNOWN_CAMERA_IDS`; permanent |
| `plainName` | Non-empty |
| `description` | A sentence a menu may show; MAY be empty |
| `modes` | Non-empty array of `"2d"` and/or `"3d"`, no duplicates |
| `options` | An array (MAY be empty); README section 7 |

## 3. The compute function

`compute(input: CameraViewInput): CameraState`

1. `compute` MUST be synchronous and MUST return a `CameraState`.
2. `compute` MUST be pure: its result MUST depend only on `input`, and it MUST NOT read the DOM,
   the scene, the network, a clock or random numbers, and MUST NOT mutate `input`. Purity is what
   lets the element call it for a screenshot, a preview, an animation target and a saved-view check
   and get one answer.
3. `input.mode` is always one of the descriptor's `modes`; the element refuses the others before
   calling (section 5).
4. `input.options` is already validated and defaulted; `compute` MUST NOT re-validate it.
5. A 3D result SHOULD set `position` and `target`, and MAY set `fov`. A 2D result SHOULD set `zoom`
   and `pan`, and MAY set `rotation`. Members it leaves out keep the camera's current values.
6. Every number returned MUST be finite. A non-finite value MUST be refused by the element with
   `E_INTERNAL`, `source: "view"`, and the camera MUST NOT move **(not yet met: verify)**.
7. `compute` SHOULD return in under a millisecond; it may be called once per animation request.

## 4. What the built-in views do, and parity

"Pinned by" names the test in `graphty-element/test/browser/extensions/camera-extension.test.ts`.

| Capability | Route | Pinned by |
| --- | --- | --- |
| Listed beside the built-ins | `session.catalog.cameras()` | "is listed in the element's catalogue..." |
| Listed by the preset lookup | `graph.getCameraPresets()` | "is one of the names loadCameraPreset will answer to..." |
| Found by the name a consumer types | `graph.resolveCameraPreset(id)` | "is found by the name a consumer types..." |
| Offered only in its declared modes | descriptor `modes` | "is offered only in the drawing modes it declares..." |
| Applied by name | `graph.applyCameraView(id, { params })` | "moves the camera to the state it computed..." |
| Reached by every route a built-in is | `loadCameraPreset(id)`, `setCameraState({ preset: id })`, `captureScreenshot({ camera: { preset: id } })`, the `setCameraPosition` command | "is reached by every route a built-in view is..." |
| Emits the camera state-change event | camera event | "tells anyone listening what state the camera moved to" |
| One registration, different result per mode | `input.mode` | "computes a different view in two dimensions than in three..." |
| Frames a subset | `applyCameraView(id, { scope })`; the box covers only the scope | "frames a named subset..." |
| Options defaulted, validated, and refused when unknown or out of range | `params` | "being configured" block |
| Animated, and settles when cancelled | `CameraAnimationOptions` | "being animated to" block |
| Frames a screenshot and restores the camera afterwards | `captureScreenshot` | "can be the view a screenshot is framed from..." |
| Its name cannot be taken by a saved camera snapshot | `saveCameraPreset` | "cannot have its name taken..." |

### 4.1 Parity statements

1. A registered view MUST be reachable by every route in the table with the same arguments a
   built-in takes.
2. Progress is vacuous (a view is synchronous). Cancellation applies to the ANIMATION, which the
   element owns, and a registered view gets it exactly as a built-in does: a cancelled animation
   settles rather than rejecting.
3. **(not yet met)** A screenshot cannot pass options to a view: `captureScreenshot` resolves
   `options.camera.preset` with no options and no scope. No built-in declares options, so no
   built-in is affected, but a plugin view that declares options cannot be configured on that
   route. The fix is to accept `camera: { preset, params, scope }`.
4. **Saved documents: parity is vacuous.** A camera view is recorded in no saved document the
   element reads back, for built-ins and plugins alike (section 6).

### 4.2 Resolution order of a name

A name passed to `loadCameraPreset`, `setCameraState({ preset })` or `resolveCameraPreset` is
resolved against registered views (built-in and plugin) BEFORE the graph's saved camera snapshots.
`saveCameraPreset` MUST refuse a name a view holds, and a view registered after a snapshot of the
same name was saved takes the name back. A view name is therefore stable regardless of what a
reader has saved.

### 4.3 Subsets

When the caller passes a scope, the element measures the box over the scope's nodes and hands that
box to `compute`. A view MUST NOT assume `bounds` covers the whole graph.

### 4.4 Empty and degenerate boxes

When `bounds.measured` is 0 (an empty graph or an empty scope) the element MUST NOT call `compute`
and MUST leave the camera where it is **(not yet met: verify)**. A view MUST handle a box of zero
size in one or more dimensions (a single node, a flat 2D layout in 3D) without dividing by zero;
it SHOULD treat a zero extent as a small positive one.

## 5. Errors

| Code | When | `details` |
| --- | --- | --- |
| `E_BAD_COMMAND` | malformed registration | `kind: "camera"`, `name`, `field` (`descriptor`, `id`, `modes`, `options`, `compute`) |
| `E_DUPLICATE_PLUGIN` | built-in id; different `compute` under a taken id with `strict` | `kind`, `name`, `builtIn` |
| `E_UNKNOWN_CAMERA` | a route names a view nothing registered | `available`: registered view ids |
| `E_UNSUPPORTED` | the view does not declare the current drawing mode; raised before `compute` is called | the mode, the declared modes |
| `E_UNKNOWN_OPTION`, `E_OPTION_RANGE` | `params` fail validation | option name, nearest name, range |

A throw from `compute` MUST reject the call that asked for the view with a `GraphtyError`
(`E_INTERNAL`, `source: "view"`, the original as `cause`, when it is not already one) and MUST NOT
move the camera.

## 6. Persistence (proposed)

Today a view is a transient framing: nothing records which view was applied, and a saved document
does not restore it. The design studio wants the opposite -- saved views that capture the camera,
carried into a report's page order, and a video path through saved views
(`design/designloom/workflows/W02.yaml`; the design framework's output-homes and conceptual-model
documents in the main checkout).

This is README open decision 8, to be taken together with the view and recipe file formats. The
recommended record is `CameraViewReference` in `camera.d.ts`: the view id, its options, the
extension's version, and the resolved `CameraState` at the time of saving. Recording the resolved
state means a reader who lacks the plugin still gets the exact camera back, and a reader who has it
can tell that the plugin now computes something different.

## 7. Versioning and compatibility

- `CameraDescriptor`, `CameraViewRegistration` and `CameraState` (as a return value) are
  implemented by extensions; `CameraViewInput` and `GraphBounds` are called by extensions and MAY
  gain members in a minor release (`viewport` was added this way).
- `DrawingMode` is closed for writers. If a new mode is added (for example an XR mode) a view that
  does not declare it is refused in that mode, so existing views stay safe.
- `CameraState` members are part of the contract; a view returning a member a later element no
  longer reads loses only that member's effect.

## 8. Security

`compute` runs with the page's privileges, but the contract requires it to be pure (section 3), and
the conformance kit checks that it neither reads the DOM nor touches the network while computing.
A view receives only geometry, never node ids, attributes or labels, so a view cannot leak graph
content through its input.

## 9. Conformance checks

Run by `checkCameraView(registration)` in the proposed kit. All run in Node except the last two.

| Check | Passes when |
| --- | --- |
| registers | `registerCameraView` accepts it and the catalogue lists the descriptor |
| descriptor is valid | validates against `#/$defs/CameraDescriptor` |
| id is not reserved | not in `KNOWN_CAMERA_IDS` |
| computes in every declared mode | for each mode, on the kit's standard boxes (unit cube, flat slab, single point, far-off-origin box), `compute` returns a state with only finite numbers |
| is pure | two calls with deep-equal input return deep-equal output, `input` is unchanged, and no DOM, timer or fetch access occurs (the kit runs `compute` with those globals trapped) |
| frames what it is given | for a 3D view, `target` lies within the box expanded by its largest dimension; for a 2D view, `pan` lies within the box (a warning, not a failure: a view may frame off-centre on purpose) |
| options default and validate | declared defaults reach `input.options`; an undeclared or out-of-range option is refused before `compute` is called |
| is applied by every route | `applyCameraView`, `loadCameraPreset`, `setCameraState({ preset })` and `captureScreenshot({ camera: { preset } })` each move the camera to the computed state (browser) |
| is refused in an undeclared mode | in a mode not in `modes`, the route rejects with `E_UNSUPPORTED` and `compute` is not called (browser) |

## 10. Worked example

A top-down "map" view for a geographic layout, 2D and 3D, with a margin option:

```ts
import { registerCameraView, type CameraViewInput, type CameraState } from "@graphty/graphty-element/extend";

function mapView(input: CameraViewInput): CameraState {
    const margin = input.options.margin as number;                 // validated and defaulted
    const { center, size } = input.bounds;
    const width = Math.max(size.x, 1e-6) * (1 + margin);
    const height = Math.max(size.y, 1e-6) * (1 + margin);
    if (input.mode === "2d") {
        const zoom = Math.min(input.viewport.width / width, input.viewport.height / height);
        return { zoom, pan: { x: center.x, y: center.y }, rotation: 0 };
    }
    const fov = input.fov ?? Math.PI / 4;
    const distance = Math.max(height, width / input.aspect) / 2 / Math.tan(fov / 2);
    return { position: { x: center.x, y: center.y, z: center.z + distance }, target: { ...center } };
}

registerCameraView({
    descriptor: {
        id: "acmegeo-map",
        plainName: "Map (north up)",
        description: "Looks straight down with north at the top, like a map.",
        modes: ["2d", "3d"],
        options: [{ name: "margin", plainName: "Margin", type: "number", default: 0.1, min: 0, max: 1, step: 0.05 }],
    },
    compute: mapView,
});

await graph.applyCameraView("acmegeo-map", { scope: { set: "port-cities" }, params: { margin: 0.2 } });
```

## 11. Known gaps

- A screenshot cannot pass options or a scope to a view (section 4.1).
- A view is recorded in no saved document (section 6).
- Controllers (orbit, fly, 2D) are not extensible; see `candidates.md`.
- Non-finite results and empty boxes are not pinned by the parity suite (sections 3 and 4.4).

## 12. Who this serves

| Need | Source |
| --- | --- |
| Overview to detail, bookmarks, saved views | `design/designloom/workflows/W02.yaml` |
| Geographic overlays and tiered views for supply chains | `design/designloom/workflows/W11.yaml`, `design/designloom/personas/supply-chain-analyst.yaml` |
| Reproducible figures from a saved session | `design/designloom/workflows/W25.yaml` |
