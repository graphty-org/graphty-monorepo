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
    setMeasureExactMaxNodes,
    WEBGPU_ACCELERATOR_NAME,
} from "./src/acceleration/webgpuFactory";
import { GraphtyError } from "./src/errors";

/** What {@link configureWebGpu} accepts. */
export interface WebGpuOptions {
    /**
     * The node count up to which GPU layouts compute every pair of nodes exactly, above which they
     * approximate (faster on large graphs, slightly less accurate):
     *
     * - `"default"` (the default) -- the shipped ceiling of 32,768 nodes, the same on every device.
     * - `"measured"` -- the element times this device once its first accelerated work has finished
     *   and uses the crossover it finds, usually far lower on a fast card, so large layouts get
     *   faster and approximate sooner. The first frame and the first layout never wait for it, and
     *   the answer is kept for every element on the page that uses the same device. A software
     *   adapter is never measured and keeps the default.
     *
     * `capabilities.acceleration.exactMaxNodes` and `exactMaxNodesBasis` report the ceiling in use.
     */
    readonly exactMaxNodes?: "default" | "measured";
}

/**
 * Configures the WebGPU integration for the whole page. Optional: every option has a neutral
 * default. Applies to accelerators built after the call, however the peer was loaded, so call it
 * next to the import, before an element attaches one.
 * @example Measuring the exact-tier ceiling on the reader's own GPU
 * ```js
 * import "@graphty/graphty-element";
 * import { configureWebGpu } from "@graphty/graphty-element/webgpu";
 *
 * configureWebGpu({ exactMaxNodes: "measured" });
 * ```
 * @param options - The options; a member left out keeps its current value.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` for a value the option does not take.
 */
export function configureWebGpu(options: WebGpuOptions): void {
    const { exactMaxNodes } = options;
    if (exactMaxNodes === undefined) {
        return;
    }

    if (exactMaxNodes !== "default" && exactMaxNodes !== "measured") {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `exactMaxNodes must be "default" or "measured", not ${String(exactMaxNodes)}`,
            source: "acceleration",
            details: { option: "exactMaxNodes", value: exactMaxNodes, expected: ["default", "measured"] },
        });
    }

    setMeasureExactMaxNodes(exactMaxNodes === "measured");
}

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
