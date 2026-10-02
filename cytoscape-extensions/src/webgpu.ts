/**
 * "@graphty/cytoscape-extensions/webgpu" in a browser: importing it is the whole WebGPU integration.
 *
 * ```ts
 * import "@graphty/cytoscape-extensions/webgpu";
 * const r = await cy.elements().graphtyPageRankAsync();
 * r.backend; // { ran: "gpu", reason: null, device: "nvidia ..." } or { ran: "cpu", reason: "...", device: null }
 * ```
 *
 * Each Cytoscape core acquires one device on first use, reuses it, acquires a new one after a device loss and
 * disposes it on `cy.destroy()`. @graphty/webgpu-graph-algorithms is an optional peer dependency: only this entry
 * imports it, so an application that never imports this entry builds without it.
 */

import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

import { registerPlatform, type WebGpuOptions } from "./webgpu-provider.js";

export { disableWebGpu, type WebGpuOptions } from "./webgpu-provider.js";

/**
 * Turns WebGPU on (importing this module already did, with the defaults); call again to change the options.
 * @param options - see WebGpuOptions
 */
export function enableWebGpu(options: WebGpuOptions = {}): void {
    registerPlatform(
        {
            probe: (rejectSoftware) => probeBrowserWebGpu({ rejectSoftware }),
            open: (probe, rejectSoftware, residentSnapshots) =>
                requestGpuContext({
                    adapter: probe.adapter ?? undefined,
                    rejectSoftware,
                    warnUnreleasedSnapshots: residentSnapshots,
                }),
        },
        options,
    );
}

enableWebGpu();
