# Node and Browser Setup

The package has four entry points. The core works everywhere; the other three find a GPU for you.

| Import                                     | Runs in           | What it gives you                                                                            |
| ------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `@graphty/webgpu-graph-algorithms`         | Node and browsers | the algorithms, the layouts, `createAccelerator`, `GpuContext`, the errors and the constants |
| `@graphty/webgpu-graph-algorithms/node`    | Node              | `createNodeGpuContext`, `probeNodeWebGpu`, `createNodeGpu`, `acquireAccelerator`             |
| `@graphty/webgpu-graph-algorithms/browser` | browsers          | `requestGpuContext`, `probeBrowserWebGpu`, `acquireAccelerator`                              |
| `@graphty/webgpu-graph-algorithms/acquire` | Node and browsers | `acquireAccelerator`, resolved to the Node or browser build by your bundler or runtime       |

## One call: acquireAccelerator

Most applications want "a working GPU, or the reason there is none". `acquireAccelerator` is that call, the same in
Node and in a browser:

<<< ../examples/acquire.ts

The first `current()` probes for an adapter, opens a context, checks that the device computes correctly and builds
the accelerator. Later calls return the same accelerator. After the device is lost, the next `current()` acquires a
new one.

When `result.ok` is false, `result.code` says why, before any work ran:

| Code                 | Meaning                                                             | `result.fix`                                           |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `E_NO_WEBGPU`        | no WebGPU in this runtime; in Node, the `webgpu` package is missing | Node: the install command; a browser: serve over https |
| `E_NO_ADAPTER`       | WebGPU exists but no adapter answered                               | null                                                   |
| `E_SOFTWARE_ONLY`    | the adapter is a software renderer (llvmpipe, SwiftShader, WARP)    | pass `acceptSoftware: true`                            |
| `E_DEVICE_INCORRECT` | the device got a known computation wrong; `result.check` says where | null                                                   |

A software adapter is declined by default because it is usually slower than a CPU implementation. Options:
`acceptSoftware`, `powerPreference` (default `"high-performance"`), `accelerator` (layout tuning and algorithm
defaults, passed to `createAccelerator`), and in Node `adapter`, a substring of the adapter name such as `"4070"`.

A browser application that already draws with WebGPU can pass its own device, `acquireAccelerator({ device })`.
The device stays yours: disposing the accelerator does not destroy it.

## Node

In Node the GPU comes from Dawn, through the optional `webgpu` package:

```bash
npm install webgpu@0.6.1   # Ubuntu 24.04 or newer
npm install webgpu@0.4.0   # Ubuntu 22.04
```

`createNodeGpuContext()` loads Dawn and opens a context on the best adapter:

```ts
import { createNodeGpuContext, probeNodeWebGpu } from "@graphty/webgpu-graph-algorithms/node";

const probe = await probeNodeWebGpu(); // never throws: { ok, code, reason, summary }
console.log(probe.ok, probe.summary?.description);

const ctx = await createNodeGpuContext({ rejectSoftware: true });
console.log(ctx.caps.vendor, ctx.caps.software);
ctx.dispose();
```

Its options: `adapter` (a substring of the Dawn adapter name: `"llvmpipe"` for Mesa's software renderer, `"4070"` for
a particular card), `software` (shorthand for `adapter: "llvmpipe"`), `backend`, `powerPreference`, `rejectSoftware`,
`limits` and `optionalFeatures`.

On a Linux machine where the NVIDIA driver cannot load `libEGL.so.1` (a container without `libegl1`), Dawn lists
only the software adapter. Install `libegl1` to see the card.

## Browser

```ts
import { createAccelerator, pageRank } from "@graphty/webgpu-graph-algorithms";
import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

const probe = await probeBrowserWebGpu(); // never throws
if (probe.ok) {
    const ctx = await requestGpuContext({ adapter: probe.adapter ?? undefined });
    const ranks = await pageRank(ctx, snapshot);
    ctx.release(snapshot);
    ctx.dispose();
}
```

WebGPU needs a secure context: serve the page over https or from localhost. The package is tested in Chromium.
Nothing in the core or the browser entry imports the Node entry, so a bundler never pulls Dawn into a page.

## Contexts and accelerators

A `GpuContext` owns one device. Every algorithm function takes it first: `pageRank(ctx, snapshot)`. A context
uploads a snapshot the first time an algorithm needs it and keeps it until `ctx.release(snapshot)`.

`createAccelerator(ctx)` wraps a context in an object with one method per algorithm and layout
(`acc.pageRank(snapshot)`, `acc.forceAtlas2(options)`). That object is what
[`@graphty/algorithms`](../../algorithms/) and [`@graphty/layout`](../../layout/) accept as an accelerator, so the
same call runs on the GPU when you pass one and on the CPU when you do not.

## The device self-check

Some drivers return wrong answers instead of failing. The first algorithm or layout you run on a context first asks
the device for an answer the package already knows, and refuses a device that gets it wrong with
`E_DEVICE_INCORRECT`. It runs once per device (14-20 ms the first time, nearly all of it shader compilation that later calls reuse). To ask
before committing work to a device, call `verifyDevice(ctx)` yourself.
