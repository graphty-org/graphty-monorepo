/**
 * @file `@graphty/graphty-element/webgpu`: registers the WebGPU accelerator at a known moment.
 *
 * Optional. The root entry point (`@graphty/graphty-element`) and `./bundle` find
 * `@graphty/webgpu-graph-algorithms` themselves when it is installed, the first time the element
 * probes for acceleration, so most consumers never write this import.
 *
 * ```js
 * import "@graphty/graphty-element";
 * import "@graphty/graphty-element/webgpu";   // optional: registers now
 * ```
 *
 * The peer still loads on first use, not with this entry point (issue #6389): the peer's 1 MB of
 * kernels arrives while the first frame is being set up instead of before it.
 *
 * It stays the right choice for a toolchain where the root entry's optional import of the peer
 * cannot work (webpack before 5.90.2; Vite 8 under Yarn Plug'n'Play while vitejs/vite#21881 is
 * open), for a page that uses only the Node-safe entry points (`./session` and the rest never
 * load the peer on their own), and for anyone who wants registration to happen at a known moment.
 * It replaces the lazy registration the root entry made, without a warning.
 *
 * Everything else -- the probe, the self-check, the software-adapter rule, the ceiling and device
 * loss -- is `createWebGpuFactory` in `src/acceleration/webgpuFactory.ts`, shared with the lazy
 * loader. Nothing here leaks a GPU type into the element's published API.
 */

import { registerAccelerator } from "./src/acceleration";
import type { AcceleratorFactory } from "./src/acceleration/types";
import {
    createWebGpuFactory,
    createWebGpuSharesDevice,
    WEBGPU_ACCELERATOR_NAME,
} from "./src/acceleration/webgpuFactory";

/** The peer's browser module and the factory built over the peer, once, on first use. */
let loaded:
    | Promise<{ factory: AcceleratorFactory; browser: typeof import("@graphty/webgpu-graph-algorithms/browser") }>
    | undefined;

/**
 * Loads the peer's root and browser entry points, once, and builds the factory over them.
 * @returns The factory and the browser module.
 */
function load(): NonNullable<typeof loaded> {
    loaded ??= Promise.all([
        import("@graphty/webgpu-graph-algorithms"),
        import("@graphty/webgpu-graph-algorithms/browser"),
    ]).then(([root, browser]) => ({ factory: createWebGpuFactory(root, browser), browser }));
    return loaded;
}

registerAccelerator({
    name: WEBGPU_ACCELERATOR_NAME,
    backend: "webgpu",
    factory: async (options) => (await load()).factory(options),
    sharesDevice: async (adapter) => createWebGpuSharesDevice((await load()).browser)(adapter),
});
