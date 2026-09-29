# Renderer

Guide to choosing whether the graph is drawn with WebGL or WebGPU.

## Overview

graphty-element draws with WebGL unless you ask for something else. It can also draw with
WebGPU. Which one draws is separate from [acceleration](./acceleration), which runs layouts and
algorithms on the GPU: a graph can be laid out on the GPU and drawn with either renderer.

```html
<graphty-element renderer="auto"></graphty-element>
```

| Value    | What it means                                                         |
| -------- | --------------------------------------------------------------------- |
| `webgl`  | The default. Draw with WebGL.                                         |
| `webgpu` | Draw with WebGPU where the browser can open it, and WebGL where not.  |
| `auto`   | Today the same as `webgpu`.                                            |

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

## What differs under WebGPU

| Feature                                            | Under WebGPU                                                |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Nodes, instanced meshes, labels                    | The same                                                    |
| Solid and patterned edges, arrow caps              | The same, once the compiler is loaded (see below)           |
| Animated edges                                     | The same                                                    |
| Node glow and outline                              | The same                                                    |
| Screenshots (`captureScreenshot`)                  | The same                                                    |
| VR and AR                                          | Not available: the buttons report the mode unavailable      |

**VR and AR need WebGL.** WebXR draws into a WebGL layer, and no shipping browser offers it a
WebGPU one. Under WebGPU the element reports both modes unavailable instead of offering a button
that would fail. Keep the default renderer on a page that offers VR or AR.

**The edge and arrow shaders are written in GLSL.** Babylon.js compiles GLSL for WebGPU with two
WebAssembly modules, glslang and twgsl, which it fetches from `https://cdn.babylonjs.com` the first
time a WebGPU graph opens on the page, about 1 MB together. The element fetches them before it
draws, so a page whose Content Security Policy or network blocks that host draws with WebGL and
says so in `rendererStatus.reason`, rather than drawing a graph with no edges.

## Is WebGPU faster?

Not yet, for this element. Measured frame times at 10,000 and 100,000 nodes are in the
[renderer decision record](../decisions/renderer-webgpu). At those sizes a frame is spent on
the CPU -- the element's own update and Babylon.js deciding what to draw -- and the GPU itself is
busy for a small part of it under either renderer. That is why `webgl` stays the default.
