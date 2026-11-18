# Camera

Guide to camera control and animation.

## Overview

The camera determines what part of the 3D scene is visible. Control it programmatically, save views of it by name, and fly it through tours.

## Camera State

The camera state includes position, target, and up vector:

```typescript
const state = graph.getCameraState();
// Returns:
// {
//   position: { x: 0, y: 0, z: 100 },
//   target: { x: 0, y: 0, z: 0 },
//   up: { x: 0, y: 1, z: 0 }
// }
```

- **position**: Where the camera is located
- **target**: What the camera is looking at
- **up**: Which direction is "up" for the camera

## Setting Camera Position

### Direct Position Setting

```typescript
// Set camera position
graph.setCameraPosition({ x: 0, y: 0, z: 100 });

// Set what the camera looks at
graph.setCameraTarget({ x: 0, y: 0, z: 0 });
```

### Zoom to Fit

Automatically frame all nodes:

```typescript
graph.zoomToFit();
```

With padding:

```typescript
graph.zoomToFit({ padding: 1.2 }); // 20% extra space
```

### Framing after a load

The element frames the graph on its own after every data load and layout change. To leave the
camera where the reader put it, switch that off:

```typescript
element.autoFrame = false; // a load or layout change no longer moves the camera
element.autoFrame = true; // back to framing each load (the default)
```

```html
<graphty-element auto-frame="false"></graphty-element>
```

`zoomToFit()` still frames the graph while it is off. The switch is a preference of the view: it
records no undo step and is not saved in a project file. It is independent of
`startingCameraDistance`, which also stops automatic framing but places the camera at a distance.

### How the graph is framed

By default zoom-to-fit frames every node whole, with its labels, inside a small margin. The
project setting `framing` changes that: `extent: "centers"` fits the node centers alone, so a big
node at the edge may run past the canvas, and `padding` keeps that many CSS pixels clear at each
end of the canvas's shorter side (the longer side keeps the same share), as sigma.js frames a graph.

```typescript
await element.session.config.set({ framing: { extent: "centers", padding: 30 } });
await element.session.config.set({ framing: undefined }); // back to framing every node whole
```

A file load can set it to how the file's own program frames it, with the file style option
`framing: "file"`: a sigma.js (graphology) file is then framed as sigma.js draws it.

```typescript
await element.session.data.import(source, { styles: "file", styleOptions: { framing: "file" } });
```

The setting is saved in a project file and undone like any other project setting. A load with
`styles: "file"` needs the `file-styles` experiment; see [Styles from Files](./file-styles).

### Zoom In and Out

Move the camera one step nearer or further, the way a zoom button does. The same call works on
the 2D and the 3D camera:

```typescript
await graph.zoomStep("in");
await graph.zoomStep("out");
```

### Zoom toward the pointer

By default the mouse wheel zooms toward the center of the view. Turn on `zoomToPointer` and it
zooms toward the point under the pointer instead, so the node under the pointer stays under it:

```typescript
element.zoomToPointer = true;
```

```html
<graphty-element zoom-to-pointer></graphty-element>
```

Like `autoFrame`, it is a preference of the view: it records no undo step and is not saved in a
project file.

### Keys on the canvas

While the canvas has focus, keys move the camera. A key held repeats; a key tapped acts once.
`CANVAS_KEY_DESCRIPTORS` from `@graphty/graphty-element/catalog` lists every key, what it does and
in which view, so a shortcuts page can list them without keeping its own copy:

| View | Keys                          | Action   |
| ---- | ----------------------------- | -------- |
| 3D   | W, =, +                       | Zoom in  |
| 3D   | S, -, \_                      | Zoom out |
| 3D   | Arrow keys                    | Turn     |
| 3D   | A, D                          | Roll     |
| 2D   | =, +                          | Zoom in  |
| 2D   | -, \_                         | Zoom out |
| 2D   | W, A, S, D and the arrow keys | Pan      |
| 2D   | Q, E                          | Roll     |

### Zoom to Nodes

Frame one node or several, in 2D or 3D. Ids that name no node are skipped, and when none of them
names a node the camera stays where it is:

```typescript
await graph.zoomToNodes(["alice", "bob"], { animate: true });
```

By default each node counts as its centre, so a big node at the edge of the frame can be cut off,
and one node is framed in a fixed-size box around its centre. Pass `extent: "drawn"` to measure each
node by the box it is drawn in instead, so every framed node is whole on screen:

```typescript
await graph.zoomToNodes("hub", { extent: "drawn" });
await graph.applyCameraView("isometric", { scope: "selection", extent: "drawn" });
const state = graph.resolveCameraPreset("topView", { extent: "drawn" });
```

`extent` works the same for a camera view a third party registered: the box handed to its
`compute` is measured either way.

`zoomToSelection()` turns the camera to look at the middle of the selection, keeping where it
stands. A selected edge counts by its two ends, so selecting only an edge frames that edge. With
nothing selected the camera does not move.

None of these is an undoable step: the camera is view state, not part of a project.

### Set Complete State

```typescript
graph.setCameraState({
    position: { x: 50, y: 50, z: 100 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
});
```

## Camera Animation

Animate camera movements for smooth transitions:

```typescript
const newState = {
    position: { x: 100, y: 100, z: 200 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
};

graph.setCameraState(newState, {
    animate: true,
    duration: 1000, // milliseconds
    easing: "easeInOut", // "linear", "easeIn", "easeOut" or "easeInOut"
});
```

## Saved views and tours

A **saved view** is a camera position kept under a name in the project. A **tour** is a named list
of stops, each naming a view, that the camera flies through and holds at. Both are saved in the
project file and every change to them is one undo step; jumping to a view or playing a tour is
not a change.

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

In a stop, `duration` is the flight to that stop and `hold` the time spent there, both in
milliseconds; an unset one is 0. In `captureAnimation`'s options `duration` means something else:
the whole video's length. A tour recording needs none, since its length is the tour's.

`playTour` and `captureAnimation` check the whole tour before anything moves and reject with a
coded problem when it cannot be played, so this path needs no checks of its own.

### Saved views

`session.views` reads as a map from name to camera state, in project order.

| Call                                           | What it does                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `views.save([{ name, camera? }])`              | Keeps a view, at the end of the order; no `camera` keeps the current one  |
| `views.rename(from, to)`                       | Renames a view in its place, and every tour stop naming it follows        |
| `views.move(name, index)`                      | Puts a view at a 0-based place in the order                               |
| `views.remove([name])`                         | Forgets views; tour stops naming them stay, and `planTour` reports them   |
| `applyCameraView(name, { animate, duration })` | Jumps or flies to a camera view or a saved view                           |
| `viewProblem(name)`                            | `null` when the view can be applied now, else a coded fact saying why not |

**One name, one view.** A name is a **camera view** first -- one the element ships (`fitToGraph`,
`topView`, `sideView`, `frontView`, `isometric`, listed by `session.catalog.cameras()`) or one an
extension registered -- and a saved view only when no camera view has it. Saving a view under a
camera view's name is refused with `E_PROTECTED`. If a camera view registered later takes a saved
view's name, the saved view can no longer be reached by that name until it is renamed;
`viewProblem(name, { saved: true })` judges the saved view itself and answers `E_PROTECTED`.

**The drawing mode.** A camera view lists the drawing modes it works in. A saved state fits the
mode it was saved in (`getCameraState()` writes `mode`); a state with no `mode` fits a mode when it
holds at least one member that mode reads:

| Mode | Members it reads                                                                          |
| ---- | ----------------------------------------------------------------------------------------- |
| 2D   | `zoom`, `pan`, `rotation`                                                                 |
| 3D   | `position`, `target`, `alpha`, `beta`, `radius`, `pivotRotation`, `cameraDistance`, `fov` |

A view or state that does not fit is refused with `E_UNSUPPORTED` `{ reason: "mode", name, modes,
mode }` by `setCameraState`, `applyCameraView`, a screenshot's or recording's `camera`, and tours.
While immersive (VR or AR) they refuse with `{ reason: "xr", mode }`, since the headset owns the
camera. To disable a menu row before the reader picks it, ask `viewProblem`:

```typescript
const problem = element.viewProblem("Port nodes");
row.disabled = problem !== null; // problem.code and problem.params, worded by your application
```

### Tours

`session.tours` reads as a map from name to tour, in project order, with `save`, `rename`, `move`
and `remove` like the views. A tour is `{ stops, easing? }`; `easing` is `"linear"`, `"easeIn"`,
`"easeOut"` or `"easeInOut"` (the default). An empty tour, and a stop naming a view nothing is
saved under, can be saved, so a draft can exist and a rename never fails.

`playTour(tour, options)` takes a saved tour's name, a tour, or stops given inline. It resolves,
however the tour ended, with `{ reason }`:

| `reason`         | What ended the tour                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `"finished"`     | The last hold ended                                                                                   |
| `"cancelled"`    | `options.signal` aborted, or `cancelCameraAnimation()`                                                |
| `"interrupted"`  | The reader dragged, pinched, scrolled, pressed a camera key or clicked the canvas                     |
| `"replaced"`     | Another tour, a recording, `setCameraState`, `applyCameraView` or a screenshot with a `camera` option |
| `"mode-changed"` | The drawing mode switched between 2D, 3D and immersive                                                |

`restoreCamera: true` puts the camera back where it was, only when the tour finishes. After an
interruption the camera stays where the reader left it. Auto-rotate and following the selection
wait while a tour plays. `tour-progress` (`{ tour, stop, stops, phase }`) fires on each stop and
phase, and `tour-ended` (`{ tour, reason }`) once at the end.

**The advanced path.** An editor that shows a tour's length and its broken stops before playing
asks `planTour`, which checks and times a tour without moving anything, and plans again on
`views-changed`, which fires whenever anything a plan reads may have changed (views, their order,
tours, the 2D/3D switch, an XR session, a registered camera view):

```typescript
const show = (): void => {
    const plan = element.planTour("intro");
    length.textContent = `${plan.totalMs / 1000} s`; // 6.5 s for the example above
    play.disabled = !plan.playable;
    plan.stops.forEach((stop, index) => markBroken(index, stop.problem)); // null, or a coded fact
};
element.addEventListener("views-changed", show);
```

**Reduced motion.** When motion is reduced (`reducedMotion`, see
[Reduced Motion](./reduced-motion.md)), each flight becomes a cut at its start, held for the
flight's time, so a tour lasts as long for every reader. `isMotionReduced()` answers whether it is
reduced now, and `reduced-motion-changed` fires when that changes.

### How each call ends

| Call                                | When cancelled                                    | The camera afterwards                                                                                |
| ----------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `playTour`                          | Resolves `{ reason: "cancelled" }`                | Stays where the tour left it; with `restoreCamera: true` (default false) put back when it finishes   |
| `captureAnimation` with a `tour`    | Rejects with a `GraphtyError`, code `E_CANCELLED` | Always put back, except after the reader's own move, an outside camera move or a drawing mode switch |
| `captureScreenshot` with a `camera` | Rejects with the signal's reason, an `AbortError` | Always put back                                                                                      |

### When a name is not found

| What is missing | Code               | `details`                                       |
| --------------- | ------------------ | ----------------------------------------------- |
| A view          | `E_UNKNOWN_CAMERA` | `name`, `available`, and `stop` (a tour's stop) |
| A tour          | `E_BAD_COMMAND`    | `missing`, `available`                          |

```typescript
import { isGraphtyError } from "@graphty/graphty-element";

try {
    await element.playTour("intro");
} catch (error) {
    if (isGraphtyError(error) && error.code === "E_UNKNOWN_CAMERA") {
        console.log("stop", error.details.stop, "names a view that is gone:", error.details.name);
    } else if (isGraphtyError(error) && error.code === "E_BAD_COMMAND" && "missing" in error.details) {
        console.log("no tour is saved as", error.details.missing);
    } else {
        throw error;
    }
}
```

### Older calls

`saveCameraPreset`, `loadCameraPreset`, `removeCameraPreset`, `getCameraPresets`,
`exportCameraPresets` and `importCameraPresets` still work and are deprecated: use
`session.views` and `applyCameraView`. In option objects, `camera: { preset }` is the older
spelling of `camera: { view }`.

## 2D vs 3D Camera

### 3D Mode (Default)

Full 3D navigation with orbit controls:

- Mouse drag: Orbit around target
- Scroll: Zoom in/out
- Right-drag: Pan

### 2D Mode

Simplified camera for 2D layouts:

```html
<graphty-element view-mode="2d"></graphty-element>
```

```typescript
// 2D camera only has x, y position
graph.setCameraPosition({ x: 0, y: 0, z: 100 });
```

In 2D mode:

- Mouse drag: Pan
- Scroll: Zoom
- No orbit (camera always looks down at the plane)

## Coordinate Transforms

Convert between world and screen coordinates:

### World to Screen

```typescript
// Convert 3D world position to 2D screen position
const worldPos = { x: 0, y: 0, z: 0 };
const screenPos = graph.worldToScreen(worldPos);
// Returns: { x: 400, y: 300 } (pixels from top-left)
```

Use case: Position HTML overlays on nodes:

```typescript
const node = graph.getNode("node1");
const screenPos = graph.worldToScreen(node.position);

overlay.style.left = `${screenPos.x}px`;
overlay.style.top = `${screenPos.y}px`;
```

To place something over a node by its id, and to know whether the node is on screen, use
[`nodeScreenPosition`](./screen-position.md).

### Screen to World

```typescript
// Convert screen position to world position
const screenPos = { x: 400, y: 300 };
const worldPos = graph.screenToWorld(screenPos);
// Returns: { x: 0, y: 0, z: 0 }
```

## Camera Events

Listen to camera changes:

```typescript
graph.on("camera-state-changed", ({ state }) => {
    console.log("Camera moved:", state);
});
```

## Minimap

Turn on the `minimap` attribute and the element draws a minimap in its bottom-right corner: every
node seen from where the camera looks, and a rectangle for what the view shows. Click it to centre
the view there, drag across it to scrub, or focus it and press the arrow keys to step the view.
None of this is an undo step. Above 5,000 nodes it draws a density heatmap instead of points.

```html
<graphty-element minimap minimap-label="Overview"></graphty-element>
<style>
    graphty-element::part(minimap) {
        left: 12px;
        right: auto;
        width: 200px;
        height: 120px;
        color: #0a6; /* the points and the view rectangle */
        background: #fff;
    }
</style>
```

The minimap is a canvas exposed as `::part(minimap)`: its size, place, border and background are
yours to set, and its `color` is what it draws with. `minimap-label` (property `minimapLabel`) is
the name a screen reader announces, `"minimap"` unless you set one.

### Drawing your own minimap

To draw a minimap yourself, read the data the built-in one draws from. `element.getOverview()`
returns every node seen along the current view, laid flat in a square frame where x and y run from
0 to 1 (y down), and `viewport`, the rectangle of that frame the camera shows. Redraw on
`overview-changed`, which fires at most once per frame when the camera or a node moves.
`element.centerOnOverview({ x, y })` moves the camera, keeping its zoom and direction, so the view
is centred on a frame point: call it on click to centre, and on each pointer move to scrub.

```ts
const element = document.querySelector("graphty-element")!;
const canvas = document.querySelector<HTMLCanvasElement>("#minimap")!; // 150 x 150
const ctx = canvas.getContext("2d")!;

element.addEventListener("overview-changed", () => {
    const { points, viewport } = element.getOverview();
    ctx.clearRect(0, 0, 150, 150);
    for (let i = 0; i < points.length; i += 2) ctx.fillRect(points[i] * 150, points[i + 1] * 150, 2, 2);
    ctx.strokeRect(viewport.x * 150, viewport.y * 150, viewport.width * 150, viewport.height * 150);
});
canvas.addEventListener("pointerdown", (e) => {
    void element.centerOnOverview({ x: e.offsetX / 150, y: e.offsetY / 150 });
});
```

Above 5,000 nodes `kind` is `"density"`: `points` is empty and `density.counts` holds how many
nodes fall in each cell of a `density.size` by `density.size` grid (64 by default), row by row from
the top, so the result stays small however big the graph is. Choose the limit and the grid with
`getOverview({ maxPoints, gridSize })`. In 3D the frame turns with the camera, since it shows the
graph as seen from where the camera looks. The viewport can reach past 0 to 1 when the view shows
more than the graph. Reading the overview costs one pass over the nodes after a node or the view
direction moved, and nothing more while only the viewport moved.

## Focus on Node

Animate the camera to frame a single node:

```typescript
await graph.zoomToNodes(nodeId, { animate: true, duration: 500 });
```

## Orbit Animation

Create a rotating view:

```typescript
function startOrbit() {
    let angle = 0;
    const radius = 100;
    const center = { x: 0, y: 0, z: 0 };

    const intervalId = setInterval(() => {
        angle += 0.01;

        graph.setCameraPosition({
            x: center.x + radius * Math.cos(angle),
            y: 20,
            z: center.z + radius * Math.sin(angle),
        });
        graph.setCameraTarget(center);
    }, 16); // ~60fps

    return () => clearInterval(intervalId);
}

const stopOrbit = startOrbit();
// Later: stopOrbit();
```

## Interactive Examples

- [Camera Controls](https://graphty.app/storybook/graphty-element/?path=/story/camera-controls--three-d)
