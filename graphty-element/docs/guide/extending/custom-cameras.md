# Custom camera views

A camera view is a named way of deciding where the viewer stands and what they are looking at. It
is handed the box around whatever is being framed, the drawing mode, the viewport and where the
camera is now, and it answers with a camera state. That is exactly what the element's own five are
-- `fitToGraph`, `topView`, `sideView`, `frontView`, `isometric` -- and a registered view is named
wherever one of those is.

## The whole of it

```ts
import {
    type CameraState,
    type CameraViewInput,
    type CameraViewRegistration,
    registerCameraView,
} from "@graphty/graphty-element/extend";

const CORNER_VIEW: CameraViewRegistration = {
    descriptor: {
        id: "acme-corner",
        plainName: "From the corner",
        description: "Stands off one corner of the graph and looks at the middle of it.",
        // The drawing modes this view can be computed in. The element refuses the others
        // BEFORE calling, and a picker never offers a view it cannot use.
        modes: ["3d"],
        options: [
            {
                name: "padding",
                plainName: "Distance",
                type: "number",
                default: 2,
                min: 1,
                max: 10,
                description: "How far out to stand, as a multiple of the longest side.",
            },
        ],
    },
    compute(input: CameraViewInput): CameraState {
        // Options arrive resolved against the defaults the descriptor declared, so there is
        // never a missing parameter to test for.
        const padding = input.options.padding as number;
        const offset = input.bounds.maxDimension * padding;
        const { center } = input.bounds;

        return {
            type: "arcRotate",
            position: { x: center.x + offset, y: center.y + offset, z: center.z + offset },
            target: { x: center.x, y: center.y, z: center.z },
        };
    },
};

registerCameraView(CORNER_VIEW);
```

`compute` is pure: it measures nothing, touches no scene and imports no Babylon type. The element
measures the box, reads the field of view and the render size, and hands you numbers.

## What the view is told

```ts
interface CameraViewInput {
    /** The box around what is being framed, in world units. */
    bounds: {
        min: Vec3;
        max: Vec3;
        center: Vec3;
        size: Vec3;
        /** The largest of the three sides. */
        maxDimension: number;
        /** How many elements the box was measured over. Zero means the element's default box. */
        measured: number;
    };
    /** "2d" or "3d". */
    mode: DrawingMode;
    /** The viewport's width divided by its height. */
    aspect: number;
    /** How big the drawing surface is, in device pixels. */
    viewport: { width: number; height: number };
    /** The vertical field of view in radians. Absent in 2D, which has no perspective. */
    fov?: number;
    /** Where the camera is right now, so a view can be relative to it. */
    current: CameraState;
    /** Your own options, resolved against the defaults your descriptor declares. */
    options: Readonly<Record<string, unknown>>;
}
```

## One registration, two drawing modes

A view that declares both modes answers differently in each -- an orthographic zoom and pan in 2D,
a position and target in 3D -- from a single registration, exactly as `fitToGraph` does:

```ts
registerCameraView({
    descriptor: {
        id: "acme-flat",
        plainName: "Acme straight on",
        description: "Looks straight at the graph, flat or in three dimensions.",
        modes: ["2d", "3d"],
        options: [],
    },
    compute(input) {
        const { center, maxDimension } = input.bounds;

        if (input.mode === "2d") {
            return { type: "orthographic", zoom: 100 / maxDimension, pan: { x: center.x, y: center.y } };
        }

        return {
            type: "arcRotate",
            position: { x: center.x, y: center.y, z: center.z + maxDimension },
            target: { x: center.x, y: center.y, z: center.z },
        };
    },
});
```

## Using it

```ts
// The direct route, and the only one that can frame a SUBSET
await graph.applyCameraView("acme-corner", { params: { padding: 4 } });
await graph.applyCameraView("acme-corner", { scope: "selection" });

// Wherever a built-in preset name is accepted
await graph.loadCameraPreset("acme-corner");
await graph.setCameraState({ preset: "acme-corner" });
await graph.captureScreenshot({ camera: { preset: "acme-corner" } });

// Without moving anything: what would this view decide?
const state = graph.resolveCameraPreset("acme-corner");
```

Animation, easing, queueing, cancellation and the `camera-state-changed` event all come with the
name: a registered view is animated to and cancelled part way exactly as a built-in is.

## Framing a subset

`bounds` is an input rather than something the view measures, which is what lets the same view
frame a selection instead of the whole graph. Pass a scope and the element measures the box over
just those elements:

```ts
await graph.applyCameraView("acme-corner", { scope: { nodes: ["n1", "n2", "n3"] } });
```

No built-in view frames a subset today, so this is new capability rather than parity -- and it is
the most likely reason to write a camera view at all.

## Finding it again

```ts
import { cameraDescriptor, camerasForMode } from "@graphty/graphty-element/catalog";

cameraDescriptor("acme-corner")?.plainName;   // "From the corner"
camerasForMode("2d");                          // only the views that work flat
session.catalog.cameras();                     // every view a menu may offer
```

## How it is refused

| What is wrong | Code |
| --- | --- |
| No descriptor, an empty `modes`, no `options` list, or a `compute` that is not a function | `E_BAD_COMMAND`, `details.field` naming it |
| A view id the element itself ships | `E_DUPLICATE_PLUGIN` |
| A name nothing answers to | `E_UNKNOWN_CAMERA`, with `details.available` |
| A view asked for in a drawing mode it does not declare | `E_UNSUPPORTED`, with `details.modes` |
| An option the descriptor does not declare | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range | `E_OPTION_RANGE` |
| `saveCameraPreset` given a name a registered view holds | `E_PROTECTED` |

## Deliberate limits

**A camera CONTROLLER is not an extension point.** The word "camera" also covers a Babylon camera
plus the input model that turns a drag into a rotation. Its members are Babylon types, so it could
never be published from an entry point that has to resolve in Node, and the element decides what
to do with one by duck-typing its property names -- so publishing that seam would be publishing a
trap. A new projection or a new interaction model is not available to a third party today.

**A view computes synchronously**, so there is nothing to report progress about. Cancellation
belongs to the animated apply, which a registered view inherits unchanged.

**Views are not recorded in a saved document.** Nothing camera-shaped round-trips through the
element's saved configuration yet, for a built-in view or a registered one alike.

**Auto-framing during a live layout is the element's own.** The re-zoom policy `UpdateManager`
applies while a simulation settles does not name a view, built-in or registered.
