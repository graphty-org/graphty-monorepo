# Screenshots & Video

Guide to capturing images and video from your graph visualization.

## Overview

Graphty supports capturing static screenshots and animated video recordings. Use these features for sharing, documentation, or creating presentations.

## Taking Screenshots

Capture the current view as an image:

```typescript
const dataUrl = await graph.captureScreenshot({
    width: 1920,
    height: 1080,
    format: "png",
});

// dataUrl is a base64 data URL
// e.g., "data:image/png;base64,iVBORw0KG..."
```

## Screenshot Options

| Option        | Type              | Default       | Description             |
| ------------- | ----------------- | ------------- | ----------------------- |
| `width`       | `number`          | canvas width  | Output width in pixels  |
| `height`      | `number`          | canvas height | Output height in pixels |
| `format`      | `'png' \| 'jpeg'` | `'png'`       | Image format            |
| `quality`     | `number`          | `0.9`         | JPEG quality (0-1)      |
| `transparent` | `boolean`         | `false`       | Transparent background  |

Before capturing, a screenshot waits for queued operations and for a moving layout to come to
rest. `timing` changes that: `{ waitForOperations: false }` or `{ waitForSettle: false }` skips a
wait, and `{ settleTimeoutMs: 5000 }` sets how long to wait for the layout (default 30,000 ms)
before the capture fails with the `E_NOT_SETTLED` error code.

### Examples

```typescript
// High resolution
const hiRes = await graph.captureScreenshot({
    width: 3840,
    height: 2160,
    format: "png",
});

// Compressed JPEG
const compressed = await graph.captureScreenshot({
    format: "jpeg",
    quality: 0.7,
});

// Transparent background
const transparent = await graph.captureScreenshot({
    transparent: true,
    format: "png",
});
```

## Checking Capabilities

Before capturing, verify support:

```typescript
const check = await graph.canCaptureScreenshot({ width: 7680, height: 4320 });
if (!check.supported) {
    // A code and its values, such as { code: "E_TOO_LARGE", params: { of: "pixels", limit: 33177600, ... } }
    console.log(check.reason?.code, check.reason?.params);
}
for (const warning of check.warnings ?? []) {
    // "W_LARGE_CAPTURE" ({ width, height, megapixels }) or "W_HIGH_MEMORY" ({ memoryMB })
    console.log(warning.code, warning.params);
}
```

The reason and the warnings are codes with their values, never sentences: your application words them.

## Errors

A screenshot, a video or a clipboard copy that fails throws (or, for a copy, reports as
`clipboardError`) a `GraphtyError` like every other failure of the element. Switch on its `code`
and read its `details`:

| Code               | When                                                                                       | `details`                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_TOO_LARGE`      | The image is past the browser's limit on one side or on its pixel count                    | `of` (`"dimension"` or `"pixels"`), `width`, `height`, `limit`, `count`                                                                      |
| `E_OPTION_RANGE`   | A size that is not a positive number, a `strictAspectRatio` mismatch, or an unknown preset | `option` (`"size"`, `"strictAspectRatio"` or `"preset"`) and the values                                                                      |
| `E_BAD_COMMAND`    | `transparentBackground` with a format that cannot hold it (JPEG)                           | `fields`, `format`                                                                                                                           |
| `E_UNSUPPORTED`    | The browser cannot do it                                                                   | `reason`: `"format"` (with `format`), `"preserve-drawing-buffer"`, `"clipboard"`, `"clipboard-insecure-context"` or `"clipboard-permission"` |
| `E_OUT_OF_MEMORY`  | The browser would not give a canvas for the image                                          | `of: "canvas"`                                                                                                                               |
| `E_NOT_SETTLED`    | The layout was still moving when the wait for it ran out                                   | `timeoutMs`                                                                                                                                  |
| `E_CAPTURE_FAILED` | Rendering, encoding, recording or the clipboard write failed                               | `media` (`"image"` or `"video"`), `destination` for a copy; `cause`                                                                          |

## Downloading Screenshots

Convert data URL to downloadable file:

```typescript
async function downloadScreenshot() {
    const dataUrl = await graph.captureScreenshot({
        width: 1920,
        height: 1080,
    });

    // Create download link
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "graph-screenshot.png";
    link.click();
}
```

Or using Blob for better memory handling:

```typescript
async function downloadScreenshotBlob() {
    const dataUrl = await graph.captureScreenshot();

    // Convert to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "graph-screenshot.png";
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
}
```

## Recording Video

Capture animated video of the visualization:

```typescript
const blob = await graph.captureAnimation({
    duration: 5000, // 5 seconds
    fps: 30, // 30 frames per second
    format: "webm", // Video format
});

// blob is a video Blob
```

## Video Options

| Option     | Type              | Default       | Description             |
| ---------- | ----------------- | ------------- | ----------------------- |
| `duration` | `number`          | `5000`        | Recording duration (ms) |
| `fps`      | `number`          | `30`          | Frames per second       |
| `format`   | `'webm' \| 'mp4'` | `'webm'`      | Video format            |
| `width`    | `number`          | canvas width  | Output width            |
| `height`   | `number`          | canvas height | Output height           |

## Animation Capture Controls

Check if recording is in progress:

```typescript
if (graph.isAnimationCapturing()) {
    console.log("Recording in progress...");
}
```

Cancel an ongoing recording:

```typescript
graph.cancelAnimationCapture();
```

## Downloading Video

```typescript
async function recordAndDownload() {
    const blob = await graph.captureAnimation({
        duration: 10000,
        fps: 30,
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "graph-animation.webm";
    link.click();

    URL.revokeObjectURL(url);
}
```

## Creating Tours

Name the views to visit, in order, and the camera flies between them while it records. A view is
a camera view (`session.catalog.cameras()`, such as `"topView"` or `"isometric"`) or a view saved
in `session.views`; the duration is split evenly between them:

```typescript
const result = await graph.captureAnimation({
    duration: 6000,
    cameraMode: "animated",
    tour: ["frontView", "isometric", "topView"],
    download: true,
});
```

A tour needs views with a camera position and target, so a 2D view is refused with
`E_UNSUPPORTED`, and a name nothing answers to with `E_UNKNOWN_CAMERA`.

You can also drive the camera yourself while recording:

```typescript
async function captureTour() {
    // Start at overview
    graph.zoomToFit();

    // Start recording
    const capturePromise = graph.captureAnimation({
        duration: 10000,
    });

    // Animate camera during recording
    await graph.setCameraState(
        { position: { x: 100, y: 100, z: 200 }, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 3000 },
    );

    await graph.setCameraState(
        { position: { x: -100, y: 50, z: 150 }, target: { x: 0, y: 0, z: 0 } },
        { animate: true, duration: 3000 },
    );

    graph.zoomToFit();

    // Wait for recording to complete
    const blob = await capturePromise;

    // Download
    downloadBlob(blob, "tour.webm");
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
```

## Screenshot Button Example

Add a screenshot button to your UI:

```html
<button id="screenshot-btn">Take Screenshot</button>
<graphty-element></graphty-element>

<script type="module">
    import "@graphty/graphty-element";

    document.getElementById("screenshot-btn").onclick = async () => {
        const element = document.querySelector("graphty-element");
        const graph = element.graph;

        const dataUrl = await graph.captureScreenshot({
            width: 1920,
            height: 1080,
        });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `graph-${Date.now()}.png`;
        link.click();
    };
</script>
```

## Recording Controls UI

```html
<button id="record-btn">Record</button>
<button id="stop-btn" disabled>Stop</button>
<graphty-element></graphty-element>

<script type="module">
    import "@graphty/graphty-element";

    const recordBtn = document.getElementById("record-btn");
    const stopBtn = document.getElementById("stop-btn");
    const element = document.querySelector("graphty-element");

    let capturePromise = null;

    recordBtn.onclick = async () => {
        const graph = element.graph;

        recordBtn.disabled = true;
        stopBtn.disabled = false;

        capturePromise = graph.captureAnimation({
            duration: 30000, // Max 30 seconds
            fps: 30,
        });

        try {
            const blob = await capturePromise;
            downloadBlob(blob, "recording.webm");
        } finally {
            recordBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };

    stopBtn.onclick = () => {
        const graph = element.graph;
        graph.cancelAnimationCapture();
    };

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }
</script>
```

## Interactive Examples

- [Screenshots](https://graphty.app/storybook/graphty-element/?path=/story/screenshot--image)
- [Video Capture](https://graphty.app/storybook/graphty-element/?path=/story/screenshot--video)
