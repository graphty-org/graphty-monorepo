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

| Option                  | Type                        | Default       | Description                                       |
| ----------------------- | --------------------------- | ------------- | ------------------------------------------------- |
| `width`                 | `number`                    | canvas width  | Output width in pixels                            |
| `height`                | `number`                    | canvas height | Output height in pixels                           |
| `format`                | `'png' \| 'jpeg' \| 'webp'` | `'png'`       | Image format                                      |
| `quality`               | `number`                    | `0.9`         | JPEG quality (0-1)                                |
| `transparentBackground` | `boolean`                   | `false`       | Transparent background (PNG and WebP)             |
| `backgroundColor`       | `string`                    | canvas color  | A solid background in any CSS color, every format |
| `signal`                | `AbortSignal`               | none          | Cancels a capture that is still waiting           |
| `camera`                | `CameraState \| { view }`   | current       | Where to capture from; the camera is put back     |

Before capturing, a screenshot waits for queued operations and for a moving layout to come to
rest. `timing` changes that: `{ waitForOperations: false }` or `{ waitForSettle: false }` skips a
wait, and `{ settleTimeoutMs: 5000 }` sets how long to wait for the layout (default 30,000 ms)
before the capture fails with the `E_NOT_SETTLED` error code.

A capture that is waiting can be cancelled, or told to stop waiting and take the frame on screen:

```typescript
const cancel = new AbortController();
const now = new AbortController();
const shot = graph.captureScreenshot({
    signal: cancel.signal, // cancel.abort() rejects with the signal's reason, an AbortError
    timing: { captureNow: now.signal }, // now.abort() captures the current frame at once
});
```

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
    transparentBackground: true,
    format: "png",
});

// White background, whatever the canvas color
const white = await graph.captureScreenshot({
    backgroundColor: "#ffffff",
    format: "jpeg",
});
```

### A legend in the image

`legend` draws a key into the image, at the capture's resolution, so a colour-encoded picture
still says what its colours mean once it leaves the page. It is drawn from the element's legend
model (`session.styles.legend()`), not copied from the page.

```typescript
// The element's own legend, in the bottom-right corner
await graph.captureScreenshot({ legend: true });

// Only when a layer binds a value (a colour by degree, a size by betweenness)
await graph.captureScreenshot({ legend: "auto" });

// Another corner, and a heading in your own words
await graph.captureScreenshot({ legend: { position: "top-left", title: "Degree" } });
```

| `legend` value          | What the image gets                                                  |
| ----------------------- | -------------------------------------------------------------------- |
| absent or `false`       | No key (the default)                                                 |
| `true`                  | The element's legend, bottom right                                   |
| `"auto"`                | The same, only when a layer binds a value                            |
| `{ position?, title? }` | The same in `top-left`, `top-right`, `bottom-left` or `bottom-right` |
| an array of sections    | Exactly the sections you pass, top left, every word yours            |

The element's legend writes no words of its own: each section is headed by the field's name, and
lists the data's values (or the names readers gave them) beside their colours, or a ramp between
the lowest and highest value. To word the key yourself, build the sections from
`session.styles.legend()` and pass the array:

```typescript
await graph.captureScreenshot({
    legend: [{ title: "Community", rows: [{ label: "Group 1", color: "#4e79a7", value: "17" }] }],
});
```

## Vector Figures (SVG)

`exportFigure()` writes the graph as it is drawn now as an SVG file, for a paper or a slide that
needs to scale without blurring. Every visible node is a filled shape in its color, every visible
edge a line, and every label on screen is text you can edit and search. `legend` takes the same
values as a screenshot's and draws the same key, as text too. The figure is the canvas's size and
lines up with a screenshot taken at the same moment.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

// An SVG file the reader saves: nodes as shapes, labels and the key as text
await element.exportFigure({ legend: true, download: true, downloadFilename: "figure.svg" });

// Or keep the file to upload or embed
const figure = await element.exportFigure({ legend: { position: "top-left" }, transparentBackground: true });
const svg = await figure.blob.text();
console.log(svg.length, figure.width, figure.height);
```

| Option                  | Default       | What it does                                        |
| ----------------------- | ------------- | --------------------------------------------------- |
| `format`                | `"svg"`       | The file format; SVG is the only one today          |
| `legend`                | no key        | The key, as `captureScreenshot`'s `legend` takes it |
| `transparentBackground` | `false`       | Leave the canvas background out                     |
| `download`              | `false`       | Also start a download                               |
| `downloadFilename`      | `"graph.svg"` | The download's name                                 |

The result holds the file (`blob`, type `image/svg+xml`), its `width` and `height` in CSS pixels,
and whether it was `downloaded`. It waits for the finished picture first, as `waitForStableFrame()`
does. A format other than `"svg"` fails with `E_BAD_COMMAND` (`details.field` is `"format"`).

A figure draws each node's flat color, without the canvas's lighting, and draws edges straight,
without arrowheads; curved edges, arrowheads, borders and label backgrounds are not in it yet.

### From a saved view

`camera: { view }` takes the picture from a named view -- a camera view such as `"topView"`, or
a view saved in `session.views` -- and puts the camera back afterwards. A view that does not fit
the drawing mode (a view saved in 3D, captured in 2D) is refused with `E_UNSUPPORTED`; see
[Camera](./camera.md#saved-views-and-tours).

```typescript
const { blob } = await graph.captureScreenshot({ camera: { view: "hub" }, format: "png" });
```

## Checking Capabilities

Before capturing, check that the options can be captured and how large the image will be:

```typescript
const check = await graph.canCaptureScreenshot({ multiplier: 2 });
if (check.supported) {
    console.log(`${check.width} x ${check.height} pixels`);
} else {
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

| Code               | When                                                                                                                                | `details`                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `E_TOO_LARGE`      | The image is past the browser's limit on one side or on its pixel count                                                             | `of` (`"dimension"` or `"pixels"`), `width`, `height`, `limit`, `count`                                         |
| `E_OPTION_RANGE`   | A size that is not a positive number, a `strictAspectRatio` mismatch, an unknown preset, or a `backgroundColor` that is not a color | `option` (`"size"`, `"strictAspectRatio"`, `"preset"` or `"backgroundColor"`) and the values                    |
| `E_BAD_COMMAND`    | `transparentBackground` with a format that cannot hold it (JPEG)                                                                    | `fields`, `format`                                                                                              |
| `E_UNSUPPORTED`    | The browser cannot do it                                                                                                            | `reason`: `"format"` (with `format`), `"clipboard"`, `"clipboard-insecure-context"` or `"clipboard-permission"` |
| `E_OUT_OF_MEMORY`  | The browser would not give a canvas for the image                                                                                   | `of: "canvas"`                                                                                                  |
| `E_NOT_SETTLED`    | The layout was still moving when the wait for it ran out                                                                            | `timeoutMs`                                                                                                     |
| `E_CAPTURE_FAILED` | Rendering, encoding, recording or the clipboard write failed                                                                        | `media` (`"image"` or `"video"`), `destination` for a copy; `cause`; for a video, `reason` (below)              |
| `E_CANCELLED`      | A video recording was cancelled (`signal` or `cancelAnimationCapture()`)                                                            | none                                                                                                            |

A video fails with `E_CAPTURE_FAILED` and a `reason` when the tab is hidden (`"hidden"`: the page
stops drawing frames), the canvas changes size (`"resized"`), or its tour ends early: the reader
moved the camera (`"interrupted"`), something else moved it (`"replaced"`) or the drawing mode
switched (`"mode-changed"`). No file is made then. A screenshot that is cancelled rejects with an
`AbortError` instead, the signal's own reason.

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
const { blob, metadata } = await graph.captureAnimation({
    duration: 5000, // 5 seconds
    cameraMode: "stationary", // the camera stays where it is
    fps: 30, // 30 frames per second
});

// blob is the video; metadata.format says which format the browser recorded
```

`metadata.framesCaptured` counts the frames the graph drew while recording (at most one in each
1/fps interval), and `framesDropped` and `dropRate` the frames expected that it did not draw in
time, so a busy machine shows up as a drop rate above 0.

## Video Options

| Option         | Type                              | Default         | Description                                                                                  |
| -------------- | --------------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `duration`     | `number`                          | the tour's      | The whole video's length (ms); required for a still recording                                |
| `tour`         | a tour's name, a tour, or stops   | none            | The tour to fly while recording; see [Recording a tour](#recording-a-tour)                   |
| `cameraMode`   | `'stationary' \| 'animated'`      | from `tour`     | Optional: a `tour` means `'animated'`, none means `'stationary'`                             |
| `motion`       | `'follow-view' \| 'authored'`     | `'follow-view'` | What a tour recording shows of each flight under reduced motion                              |
| `fps`          | `number`                          | `30`            | Frames per second                                                                            |
| `format`       | `'webm' \| 'mp4' \| 'auto'`       | `'auto'`        | Video format; `'auto'` picks WebM where the browser records it, else MP4                     |
| `videoBitrate` | `number`                          | `5000000`       | Bits per second                                                                              |
| `width`        | `number`                          | canvas width    | Output width; alone, the height follows the canvas's aspect                                  |
| `height`       | `number`                          | canvas height   | Output height; with `width`, the picture is fitted inside both, centered, with black margins |
| `camera`       | `CameraState \| { view: string }` | current camera  | Still recording: where the camera stands while recording; it is put back afterwards          |
| `destination`  | `{ download?, filename? }`        | none            | `download: true` also saves the video as a file                                              |
| `signal`       | `AbortSignal`                     | none            | Cancels the recording: it rejects with `E_CANCELLED` and no file is made                     |

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
    const { blob } = await graph.captureAnimation({
        duration: 10000,
        cameraMode: "stationary",
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

## Recording a tour

Give `tour` and the video follows it: it opens on the first stop, lasts as long as the tour, and
puts the camera back afterwards. Save the tour once (see
[Camera](./camera.md#saved-views-and-tours)) and record it by name, or pass the stops you
previewed with `playTour`, unchanged:

```typescript
// A saved tour, as long as the tour, saved as a file
await graph.captureAnimation({ tour: "intro", destination: { download: true } });

// Stops given inline: 0.5 s at the first, a 1.5 s flight to the second, 2 s there -- 4 s of video
const stops = [
    { view: "fitToGraph", hold: 500 },
    { view: "topView", duration: 1500, hold: 2000 },
];
await graph.playTour(stops); // preview
const { blob, metadata } = await graph.captureAnimation({ tour: stops });
```

**Two meanings of `duration`.** In a stop, `duration` is the flight to that stop. In the
recording's options, it is the whole video's length: leave it out and the video is as long as the
tour; give it and a shorter video cuts the tour off, a longer one holds the last stop.

**`["a", "b"]` is not a list of stops.** An array of view names is an older form that splits
`duration` (then required) evenly between the views. It is deprecated; give stops instead,
`[{ view: "a" }, { view: "b", duration: 1000 }]`.

**Motion.** By default (`motion: "follow-view"`) the video shows what the view shows, so for a
reader with reduced motion on each flight is a cut held for its time. `motion: "authored"` records
every flight as the tour gives it whatever the reduced-motion setting; the canvas on screen moves
with it, so an application that wants the reader's screen still covers the canvas while recording.

A recording fails, and makes no file, when its tour ends before the last stop, the tab is hidden
or the canvas is resized (see [Errors](#errors)). `estimateAnimationCapture({ tour: "intro" })`
says how many frames to expect and whether the machine is likely to drop some.

You can also drive the camera yourself while recording:

```typescript
async function captureTour() {
    // Start at overview
    graph.zoomToFit();

    // Start recording
    const capturePromise = graph.captureAnimation({
        duration: 10000,
        cameraMode: "stationary",
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
    const { blob } = await capturePromise;

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
            cameraMode: "stationary",
            fps: 30,
        });

        try {
            const { blob, metadata } = await capturePromise;
            downloadBlob(blob, `recording.${metadata.format}`);
        } catch (error) {
            // Stop cancels the recording: a cancelled recording keeps no video
            if (error.code !== "E_CANCELLED") {
                throw error;
            }
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
