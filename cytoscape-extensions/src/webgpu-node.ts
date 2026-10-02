/**
 * "@graphty/cytoscape-extensions/webgpu" under Node (the package's "node" export condition): the same integration as the
 * browser build, on Dawn through the optional `webgpu` package. Without Dawn the probe declines and every run is
 * on the CPU, saying why.
 */

import { createNodeGpuContext, probeNodeWebGpu } from "@graphty/webgpu-graph-algorithms/node";

import { registerPlatform, type WebGpuOptions } from "./webgpu-provider.js";

export { disableWebGpu, type WebGpuOptions } from "./webgpu-provider.js";

/**
 * Turns WebGPU on (importing this module already did, with the defaults); call again to change the options.
 * @param options - see WebGpuOptions
 */
export function enableWebGpu(options: WebGpuOptions = {}): void {
    registerPlatform(
        {
            probe: (rejectSoftware) => probeNodeWebGpu({ adapter: options.adapter, rejectSoftware }),
            open: (_probe, rejectSoftware, residentSnapshots) =>
                createNodeGpuContext({
                    adapter: options.adapter,
                    rejectSoftware,
                    warnUnreleasedSnapshots: residentSnapshots,
                }),
        },
        options,
    );
}

enableWebGpu();
