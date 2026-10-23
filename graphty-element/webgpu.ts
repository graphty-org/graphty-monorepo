/**
 * @file `@graphty/graphty-element/webgpu`: registers the WebGPU accelerator at a known moment.
 *
 * Optional. The root entry point (`@graphty/graphty-element`) and `./bundle` find
 * `@graphty/webgpu-graph-algorithms` themselves when it is installed, the first time the element
 * probes for acceleration, so most consumers never write this import.
 *
 * ```js
 * import "@graphty/graphty-element";
 * import "@graphty/graphty-element/webgpu";   // optional: registers now, statically
 * ```
 *
 * It stays the right choice for a toolchain where the root entry's dynamic import of the peer
 * cannot work (webpack before 5.90.2; Vite 8 under Yarn Plug'n'Play while vitejs/vite#21881 is
 * open), for a page that uses only the Node-safe entry points (`./session` and the rest never
 * load the peer on their own), and for anyone who wants registration to happen at a known moment.
 * It replaces the lazy registration the root entry made, without a warning.
 *
 * Everything else -- the probe, the self-check, the software-adapter rule, the ceiling and device
 * loss -- is `createWebGpuFactory` in `src/acceleration/webgpuFactory.ts`, shared with the lazy
 * loader. Nothing here leaks a GPU type into the element's published API.
 */

import * as root from "@graphty/webgpu-graph-algorithms";
import * as browser from "@graphty/webgpu-graph-algorithms/browser";

import { registerAccelerator } from "./src/acceleration";
import { createWebGpuFactory, WEBGPU_ACCELERATOR_NAME } from "./src/acceleration/webgpuFactory";

registerAccelerator({
    name: WEBGPU_ACCELERATOR_NAME,
    backend: "webgpu",
    factory: createWebGpuFactory(root, browser),
});
