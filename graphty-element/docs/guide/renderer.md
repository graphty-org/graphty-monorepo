# Renderer

Guide to choosing whether the graph is drawn with WebGL or WebGPU.

## Overview

graphty-element draws with WebGL unless you ask for something else. It can also draw with
WebGPU. Which one draws is separate from [acceleration](./acceleration), which runs layouts and
algorithms on the GPU: a graph can be laid out on the GPU and drawn with either renderer.

```html
<graphty-element renderer="auto"></graphty-element>
```

| Value    | What it means                                                        |
| -------- | -------------------------------------------------------------------- |
| `webgl`  | The default. Draw with WebGL.                                        |
| `webgpu` | Draw with WebGPU where the browser can open it, and WebGL where not. |
| `auto`   | Today the same as `webgpu`.                                          |

The renderer is chosen once, when the element is first drawn. Set it in markup, or on the element
before you add it to the page. Changing it afterwards is reported on the console and ignored.

## Which renderer is drawing

`rendererStatus` says what was asked for, what is drawing and, when the two differ, why:

```javascript
const element = document.querySelector("graphty-element");
element.addEventListener("render-initialized", () => {
    const { requested, active, reason } = element.rendererStatus;
    console.log(`${active} is drawing (${requested} asked for)`, reason ?? "");
});
```

WebGL draws instead of WebGPU when:

- the browser has no WebGPU (`navigator.gpu` is undefined),
- it has WebGPU but no adapter, or the adapter gives no device,
- the shader compiler WebGPU needs cannot be fetched (see below).

All three are found before the first frame. The element never switches renderer while it is
drawing.

`rendererStatus.drawing` is false when the browser gave the page no working WebGL context at
all: nothing is drawn, but the data, the session and [autosave](./autosave) still work, so the
reader can still save a file. It is also false once a shader cannot be built for WebGPU, which can
lose every frame the shader is part of: a `graph-error` event carries `E_SHADER_REFUSED`, with the
step that gave up in `error.details.stage` (`"compiler"`, `"translator"` or `"device"`) and what it
said in `error.details.messages`. The translator says nothing the element can read, so its list is
empty; the page's console holds its line. A shader passed to `defineShader` may use a name
WGSL or the Vulkan GLSL compiler reserves, such as `pass`, `target`, `fn` or `image2D`: the element
renames it for you. One thing still differs: a `const` at the top of a shader may not call `acosh`,
`asinh` or `atanh` under WebGPU, so move it into the function that uses it.

If the WebGPU device is lost, by a driver reset or a GPU process crash, the element opens a new one,
rebuilds and draws the same graph, with nothing for you to do. If no new device can be had,
`rendererStatus.drawing` turns false and a `graph-error` event carries `E_DEVICE_LOST`.

## What differs under WebGPU

| Feature                               | Under WebGPU                                           |
| ------------------------------------- | ------------------------------------------------------ |
| Nodes, instanced meshes, labels       | The same                                               |
| Solid and patterned edges, arrow caps | The same, once the compiler is loaded (see below)      |
| Animated edges                        | The same                                               |
| Node glow and outline                 | The same                                               |
| Screenshots (`captureScreenshot`)     | Expected the same; not yet tested under WebGPU         |
| VR and AR                             | Not available: the buttons report the mode unavailable |

**VR and AR need WebGL.** WebXR draws into a WebGL layer, and no shipping browser offers it a
WebGPU one. Under WebGPU the element reports both modes unavailable instead of offering a button
that would fail. Keep the default renderer on a page that offers VR or AR.

**The edge and arrow shaders are written in GLSL.** Babylon.js compiles GLSL for WebGPU with two
WebAssembly modules, glslang and twgsl, which it fetches from `https://cdn.babylonjs.com` the first
time a WebGPU graph opens on the page, about 1 MB together. The element fetches them before it
draws, so a page whose Content Security Policy or network blocks that host draws with WebGL and
says so in `rendererStatus.reason`, rather than drawing a graph with no edges. To serve them yourself,
copy `glslang/glslang.js`, `glslang/glslang.wasm`, `twgsl/twgsl.js` and `twgsl/twgsl.wasm` from
`https://cdn.babylonjs.com/v<babylon version>/` to your own host and point Babylon.js at it before the
graph opens: `Tools.ScriptBaseUrl = "https://example.com/babylon"` (`Tools` from `@babylonjs/core`).

## One device for drawing and layout

With [acceleration](./acceleration) on, the graph draws on WebGPU and the adapter is real hardware, the renderer and the accelerator
run on one device. The element decides this before the renderer opens, and needs nothing from you. On a software adapter they stay on two.
If the device is lost, both stop, the renderer comes back on a new device, and the layout carries on there.

`rendererStatus.layoutDevice` says which it is: `"shared"`, `"separate"` (WebGL, or a software adapter), or `null` when no accelerator
is offered:

```js
const { layoutDevice } = element.rendererStatus ?? {};
```

## Is WebGPU faster?

Not yet, for this element. Measured frame times at 10,000 and 100,000 nodes are in the
[renderer decision record](https://github.com/graphty-org/graphty-monorepo/blob/master/graphty-element/docs/decisions/renderer-webgpu.md).
At those sizes a frame is spent on the CPU -- the element's own update and Babylon.js deciding
what to draw -- and under WebGL the GPU itself is busy for a small part of it (GPU time under
WebGPU is not yet measured). That is why `webgl` stays the default.

## Drawing many nodes at once

By default every node is a mesh of its own. `render-path="batched"` draws every node that shares a
look in one draw call instead, and the picture stays the same:

```html
<graphty-element render-path="batched"></graphty-element>
```

The path can change at any time. A node a batch cannot draw yet (one with a border, a label, a
picture or transparency, say) stays a mesh, and so do the other nodes of its shape and size.
`rowCounts` says how many nodes each path is drawing:

```js
const { batchedNodes, objectNodes } = element.rowCounts;
```

### Loading more than 100,000 nodes

A load past 100,000 nodes or 1,000,000 edges is refused with `E_TOO_LARGE`. On the batched path
you can raise either number with `limits` (experimental):

```html
<graphty-element view-mode="2d" render-path="batched" layout="random"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    graph.limits = { renderCeiling: 1_000_000 };
    const nodes = Array.from({ length: 1_000_000 }, (_, i) => ({ id: `n${i}` }));
    await graph.session.data.addNodes(nodes);
    console.log(graph.session.capabilities.limits.renderCeiling); // 1000000
</script>
```

`session.capabilities.limits` always holds the numbers in force, and `capabilities:changed` fires
when they change. On the default `"objects"` path `limits` is ignored, the element fires
`limits-warning` with the code `W_LIMITS_IGNORED`, and the 100,000 and 1,000,000 stand. Changing
`renderPath` to `"objects"` while the graph holds more than those is refused: the element fires
`error` with `E_TOO_LARGE` and stays on `"batched"`.

A node whose look no batch can draw (a border, a model, a picture) or an edge with an arrow head,
a dash or a label is drawn as an object of its own, which costs far more memory. `limits` also
caps how many of those there are: `objectRows` for nodes and `objectEdges` for edges, by default
100,000 and 1,000,000. Past a cap, later nodes are drawn as plain bodies and later edges as plain
lines, and the element fires `limits-warning` with the code `W_OBJECT_CAP` and
`{ of, wanted, cap }`:

```js
graph.limits = { renderCeiling: 1_000_000, objectRows: 50_000 };
graph.addEventListener("limits-warning", (event) => {
    if (event.detail.code === "W_OBJECT_CAP") {
        console.log(event.detail.params); // { of: "nodes", wanted: 1000000, cap: 50000 }
    }
});
```

### Loading a graph held as arrays

When your graph is already arrays -- edge endpoints as row numbers, say from a generator or a
binary file -- hand them over as they are with `session.data.importColumns`. Nodes are rows `0`
to `nodeCount - 1`, and edge `i` runs from row `sources[i]` to row `targets[i]`. Plain arrays and
typed arrays both work:

```js
const graph = document.querySelector("graphty-element");
await graph.session.data.importColumns({
    sources: new Uint32Array([0, 1, 2]),
    targets: new Uint32Array([1, 2, 0]),
    nodeCount: 3,
    ids: ["a", "b", "c"], // optional; default: the row number
    weights: [1, 2, 0.5], // optional; stored as each edge's `weight`
    attributes: { nodes: { group: ["x", "y", "x"] } }, // optional
});
console.log(graph.session.data.count()); // { nodes: 3, edges: 3 }
```

The graph is the one `addNodes` and `addEdges` would make from the same rows, the same limits
apply, and it is one undo step. Columns that do not line up are refused with `E_BAD_COMMAND`, and
nothing is added.

## Smoothing (antialias)

The canvas is drawn with 4x multisampling, which smooths the edges of lines and nodes. With very
many edges, multisampling is most of each frame's cost; `antialias="false"` turns it off, for
harder edges and faster frames. Nothing else about the picture changes.

```html
<graphty-element render-path="batched" antialias="false"></graphty-element>
```

Set it as an attribute, in any position in the tag, or as a property before using any other
property or method of the element. A later change takes effect only on a new element and raises
the warning `W_ANTIALIAS_LATE`:

```js
element.addEventListener("graphty-warning", (e) => {
    const { code, params } = e.detail; // "W_ANTIALIAS_LATE", { requested, active }
});
```

## Keeping each frame (preserveDrawingBuffer)

The WebGL canvas keeps each drawn frame, so the page can read the canvas between frames with
`canvas.toDataURL()`, `toBlob()` or `drawImage(canvas)`. Keeping it costs a full-frame copy on
every frame drawn. A page that never reads the canvas itself can turn it off;
`captureScreenshot` and `captureAnimation` work either way. It is read when the engine is built,
like `antialias`, and a later change raises `W_PRESERVE_DRAWING_BUFFER_LATE`.

```html
<graphty-element preserve-drawing-buffer="false"></graphty-element>
```

## Drawing only when something changes

Whichever renderer draws, the element draws a new frame on every animation frame by default, even
when the graph is still. Set `render-on-demand` to stop drawing once the picture is final and draw
again as soon as anything changes it:

```html
<graphty-element render-on-demand></graphty-element>
```

See [Drawing only when something changes](./web-component#drawing-only-when-something-changes)
for what counts as a change.
