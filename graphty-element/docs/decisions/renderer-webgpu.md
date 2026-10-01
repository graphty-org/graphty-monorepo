# Drawing with WebGPU, and why WebGL stays the default

What this records: how graphty-element chooses between the WebGL and WebGPU renderers, what was
found wrong under WebGPU and fixed, what still differs, and the frame times that decided the
default.

Code: `openWebGPUEngine` and `RendererStatus` in `src/managers/RenderManager.ts`;
`Graph.setRenderer`, `Graph.rendererStatus` and `Graph.openRenderer` in `src/Graph.ts`; the
`renderer` attribute and `rendererStatus` property in `src/graphty-element.ts`;
`test/browser/webgpu-renderer.test.ts`. Guide: `docs/guide/renderer.md`.

## How the renderer is chosen

Before this change the element always drew with WebGL. `RenderManager` could build a Babylon.js
`WebGPUEngine` behind a `useWebGPU` flag, but nothing set it, and the flag could not have worked:
a scene cannot be built on a WebGPU engine until the engine's asynchronous initialisation has
finished, and the element builds its scene synchronously in its constructor.

So the element still builds its scene on WebGL when it is constructed, and chooses the renderer
once, at the start of `init()` -- after every attribute has been read and before any manager has
initialised, so nothing has drawn or attached yet. When WebGPU is asked for and opens, the scene,
the cameras, the input manager and the update manager's frame watcher are rebuilt on a fresh
canvas (a canvas that has had a WebGL context cannot hand out a WebGPU one). When it does not
open, WebGL draws and `rendererStatus.reason` says why. The renderer never changes after that.

## What was wrong under WebGPU, and is fixed

Each of these was found by drawing the same styled scene with both renderers and comparing.

- **Animated edges threw on the first frame.** Their texture was a three-channel RGB
  `RawTexture`; WebGPU has no three-channel format and Babylon refuses one there. The texture is
  now RGBA.
- **Animated edges failed to bind on a page with two engines.** Babylon's greased line binds one
  empty colours texture shared by every engine on the page, created on whichever engine asked
  first and disposed with whichever engine is disposed first. WebGL tolerated the stale binding;
  WebGPU refused the draw. The element now gives each animated line its own, created on that
  line's scene and disposed with it.
- **Lines and arrow caps were missing for the first second, or for ever.** The element's line,
  patterned-line and arrow-cap shaders are GLSL. Babylon compiles GLSL for WebGPU with glslang and
  twgsl, which it fetches from `cdn.babylonjs.com` on the first compile, and it skips every mesh
  whose shader is not ready. Until the fetch finished -- 0.9 s on the workstation -- those meshes
  were not drawn, and on a page that cannot reach the host they would never have been, with no
  error. The element now fetches both before the scene exists and draws with WebGL, with the
  reason, when the fetch fails. Babylon's own fetch has no failure path (a script that does not
  arrive leaves its promise unsettled), which is why the element loads them itself.
- **A WebGPU canvas was sized 300 by 150.** The engine is opened on a canvas not yet in the page;
  it is resized once the canvas replaces the WebGL one.

## What still differs

- **VR and AR.** WebXR draws into a WebGL layer and has no WebGPU binding in any shipping browser.
  Under WebGPU both modes are reported unavailable.
- **The compiler fetch.** WebGPU needs about 1 MB of WebAssembly from Babylon's CDN. A port of the
  GLSL shaders to WGSL would remove it; until then a page with a strict Content Security Policy
  draws with WebGL.
- **Loading is much slower under WebGPU**, measured below and not yet explained.
- **GPU frame time is not measured under WebGPU**: Babylon reads it from a timestamp query the
  element does not ask the device for, so the counter reads zero.

Everything else the tests check draws the same: nodes, labels, solid and dashed lines, filled and
sphere arrow caps, a node glow, animated edges, the 2D view, and a screenshot through Babylon's
`CreateScreenshotAsync`. Per-pixel, the WebGPU frame differs from the WebGL frame on 0.25% of the
canvas, against 3.4% of the canvas that is drawn on at all; hiding the solid lines alone moves
1.3%.

## Frame times

Headless Chromium on an RTX 4070 SUPER (Vulkan through ANGLE for WebGL, Dawn on Vulkan for
WebGPU), `acceleration="off"`, a random layout, 1200 by 800, the median of 40 frames after the
graph had settled. One run per row; the machine was shared with other work, and its one-minute
load average is in the last column. The benchmark is the one the render-performance work used,
with a renderer column added.

| Graph                | Condition | Renderer | Frame median | Frame p95 | `scene.render` | Active-mesh evaluation | GPU time | Load    | Load avg |
| -------------------- | --------- | -------- | ------------ | --------- | -------------- | ---------------------- | -------- | ------- | -------- |
| 10k nodes, 20k edges | still     | WebGL    | 99.6 ms      | 125 ms    | 82.9 ms        | 71.1 ms                | 8.6 ms   | 2.0 s   | 14.0     |
| 10k nodes, 20k edges | still     | WebGPU   | 132.6 ms     | 212.7 ms  | 108.9 ms       | 93.0 ms                | n/a      | 27.9 s  | 14.3     |
| 10k nodes, 20k edges | orbiting  | WebGL    | 104.9 ms     | 122.2 ms  | 86.8 ms        | 73.8 ms                | 11.2 ms  | 3.5 s   | 15.6     |
| 10k nodes, 20k edges | orbiting  | WebGPU   | 116.6 ms     | 138.2 ms  | 95.2 ms        | 80.7 ms                | n/a      | 15.3 s  | 14.3     |
| 100k nodes           | still     | WebGL    | 58.6 ms      | 78.5 ms   | 58.4 ms        | 43.5 ms                | 20.5 ms  | 3.8 s   | 9.4      |
| 100k nodes           | still     | WebGPU   | 78.2 ms      | 91.5 ms   | 77.9 ms        | 52.7 ms                | n/a      | 143.5 s | 8.9      |
| 100k nodes           | orbiting  | WebGL    | 105.1 ms     | 227.3 ms  | 103.6 ms       | 91.6 ms                | 12.7 ms  | 4.3 s   | 13.7     |
| 100k nodes           | orbiting  | WebGPU   | 71.5 ms      | 81.9 ms   | 71.2 ms        | 49.0 ms                | n/a      | 165.9 s | 13.9     |

The 100k rows have no edges: with 200,000 edges the WebGL load had not finished after 40 minutes
on this branch's base, a load-path cost that is not the renderer's.

What they say:

- **The frame is spent on the CPU, at least under WebGL.** Babylon deciding which meshes are
  active is 70 to 87 percent of every WebGL frame and 67 to 70 percent of every WebGPU frame; the
  GPU is busy for 9 to 21 ms of a 60 to 105 ms WebGL frame. GPU time under WebGPU was not
  measured, so that half is inferred from the active-mesh share, not shown. WebGPU removes
  draw-call overhead, and at three draw calls there is none to remove.
- **Neither renderer is shown to be faster.** WebGPU was slower in three rows and faster in one --
  100k nodes orbiting, by 32% at the median and 2.8 times at p95 -- and one run per row on a
  shared machine does not separate those margins from noise.
- **WebGPU loads 7 to 40 times slower.** That is a real cost a reader would feel, and the reason
  it happens is not yet known.

So WebGL stays the default, WebGPU is there for a consumer who asks for it, and the frame-time
work belongs to the CPU side -- the active-mesh evaluation above -- not to the renderer.
