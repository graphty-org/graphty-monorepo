# Web Component API Reference

Complete API reference for the `<graphty-element>` Web Component.

## Overview

The `Graphty` class is a Lit-based Web Component that provides declarative graph visualization through HTML attributes and element properties.

::: tip
For usage patterns and examples, see the [Web Component Guide](/guide/web-component).
:::

## Properties

The Web Component exposes these properties for declarative configuration:

### Data Properties

| Property        | Attribute          | Type            | Description                                        |
| --------------- | ------------------ | --------------- | -------------------------------------------------- |
| `nodeData`      | `node-data`        | `Array<object>` | Array of node objects                              |
| `edgeData`      | `edge-data`        | `Array<object>` | Array of edge objects                              |
| `nodeIdPath`    | `node-id-path`     | `string`        | JMESPath to node ID (default: `"id"`)              |
| `edgeSrcIdPath` | `edge-src-id-path` | `string`        | JMESPath to the edge source ID. Unset by default, which means the element looks for `source`, then `src`, then `from` |
| `edgeDstIdPath` | `edge-dst-id-path` | `string`        | JMESPath to the edge target ID. Unset by default; see above |
| `edgeIdPath`    | `edge-id-path`     | `string`        | JMESPath to an edge's own identifier, for data that carries one. Unset by default, which means a repeat is decided by its ordered endpoint pair alone. It does not name the edge -- `Edge.id` is always the element's counter |
| `repeatedEdges` | `repeated-edges`   | `DuplicatePolicy` | What a second edge record naming a pair the graph already holds does: `keep` (default, a second edge), `first`, `last`, `sum`, `min`, `max`, or `error` |

### Layout Properties

| Property       | Attribute       | Type     | Description              |
| -------------- | --------------- | -------- | ------------------------ |
| `layout`       | `layout`        | `string` | Layout algorithm name    |
| `layoutConfig` | `layout-config` | `object` | Layout algorithm options |

### Display Properties

| Property                 | Attribute                  | Type                           | Description                      |
| ------------------------ | -------------------------- | ------------------------------ | -------------------------------- |
| `viewMode`               | `view-mode`                | `'2d' \| '3d' \| 'vr' \| 'ar'` | Rendering mode                   |
| `background`             | `background`               | `GraphBackgroundConfig`        | A flat colour, or a skybox image |
| `startingCameraDistance` | `starting-camera-distance` | `number`                       | How far the camera starts out    |

What nodes and edges look like is not a property: it is the layer stack on `element.session.styles`.
See the [styling guide](/guide/styling).

### Acceleration Properties

| Property               | Attribute                | Type                            | Description                                                                    |
| ---------------------- | ------------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| `acceleration`         | `acceleration`           | `'auto' \| 'off' \| 'required'` | Whether to use a hardware accelerator; `required` refuses the CPU path          |
| `accelerationMinNodes` | `acceleration-min-nodes` | `number`                        | Node count at or above which accelerated work uses the accelerator (default 0) |

Where the work actually ran is `element.session.capabilities.acceleration`, and every transition
of it is mirrored as a `graphty-capabilities-change` DOM event. See the
[acceleration guide](/guide/acceleration).

### Data Source Properties

| Property           | Attribute            | Type     | Description               |
| ------------------ | -------------------- | -------- | ------------------------- |
| `dataSource`       | `data-source`        | `string` | Data source type          |
| `dataSourceConfig` | `data-source-config` | `object` | Data source configuration |

### XR Properties

| Property | Attribute | Type       | Description         |
| -------- | --------- | ---------- | ------------------- |
| `xr`     | -         | `XRConfig` | VR/AR configuration |

### Debug Properties

| Property                  | Attribute                   | Type      | Description                        |
| ------------------------- | --------------------------- | --------- | ---------------------------------- |
| `enableDetailedProfiling` | `enable-detailed-profiling` | `boolean` | Enable performance profiling       |
| `runAlgorithmsOnLoad`     | `run-algorithms-on-load`    | `boolean` | Auto-run style template algorithms |

## Methods

The Web Component provides these methods for imperative control:

### View Mode

| Method              | Parameters       | Returns            | Description           |
| ------------------- | ---------------- | ------------------ | --------------------- |
| `getViewMode()`     | -                | `ViewMode`         | Get current view mode |
| `setViewMode(mode)` | `mode: ViewMode` | `Promise<void>`    | Set view mode         |
| `isVRSupported()`   | -                | `Promise<boolean>` | Check VR availability |
| `isARSupported()`   | -                | `Promise<boolean>` | Check AR availability |

### Screenshot & Video

| Method                              | Parameters          | Returns                     | Description              |
| ----------------------------------- | ------------------- | --------------------------- | ------------------------ |
| `captureScreenshot(options?)`       | `ScreenshotOptions` | `Promise<ScreenshotResult>` | Capture screenshot       |
| `canCaptureScreenshot(options?)`    | `ScreenshotOptions` | `Promise<CapabilityCheck>`  | Check screenshot support |
| `captureAnimation(options)`         | `AnimationOptions`  | `Promise<AnimationResult>`  | Capture video            |
| `cancelAnimationCapture()`          | -                   | `boolean`                   | Cancel ongoing capture   |
| `isAnimationCapturing()`            | -                   | `boolean`                   | Check if capturing       |
| `estimateAnimationCapture(options)` | `AnimationOptions`  | `Promise<CaptureEstimate>`  | Estimate capture         |

### Camera Control

| Method                              | Parameters                              | Returns         | Description              |
| ----------------------------------- | --------------------------------------- | --------------- | ------------------------ |
| `getCameraState()`                  | -                                       | `CameraState`   | Get camera state         |
| `setCameraState(state, options?)`   | `CameraState`, `CameraAnimationOptions` | `Promise<void>` | Set camera state         |
| `setCameraPosition(pos, options?)`  | `{x, y, z}`, `CameraAnimationOptions`   | `Promise<void>` | Set camera position (3D) |
| `setCameraTarget(target, options?)` | `{x, y, z}`, `CameraAnimationOptions`   | `Promise<void>` | Set camera target (3D)   |
| `setCameraZoom(zoom, options?)`     | `number`, `CameraAnimationOptions`      | `Promise<void>` | Set zoom (2D)            |
| `setCameraPan(pan, options?)`       | `{x, y}`, `CameraAnimationOptions`      | `Promise<void>` | Set pan (2D)             |
| `resetCamera(options?)`             | `CameraAnimationOptions`                | `Promise<void>` | Reset to default         |

### Camera Presets

| Method                             | Parameters                         | Returns                       | Description                  |
| ---------------------------------- | ---------------------------------- | ----------------------------- | ---------------------------- |
| `saveCameraPreset(name)`           | `string`                           | `void`                        | Save current state as preset |
| `loadCameraPreset(name, options?)` | `string`, `CameraAnimationOptions` | `Promise<void>`               | Load preset                  |
| `getCameraPresets()`               | -                                  | `Record<string, CameraState>` | Get all presets              |
| `exportCameraPresets()`            | -                                  | `Record<string, CameraState>` | Export user presets as JSON  |
| `importCameraPresets(presets)`     | `Record<string, CameraState>`      | `void`                        | Import presets from JSON     |

### Graph Access

| Property | Type    | Description                          |
| -------- | ------- | ------------------------------------ |
| `graph`  | `Graph` | Access the underlying Graph instance |

## Events

The Web Component emits standard DOM events:

```typescript
element.addEventListener("graph-settled", (e) => {
    console.log("Layout complete");
});

element.addEventListener("node-click", (e) => {
    console.log("Clicked:", e.detail.node.id);
});
```

See the [Events Guide](/guide/events) for the complete event reference.

## Generated Reference

For complete type definitions and detailed API documentation:

- [Graphty Class](/api/generated/index/classes/Graphty.md) - Full TypeDoc reference. `Graphty` is
  the class of the `<graphty-element>` element, and what `document.querySelector` returns.

## Related

- [Web Component Guide](/guide/web-component) - Usage patterns and examples
- [JavaScript API Reference](/api/javascript) - Programmatic Graph API
