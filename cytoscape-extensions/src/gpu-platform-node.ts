/**
 * What "#gpu-platform" loads under Node (the package's `imports` field): the provider on Dawn. The GPU package loads
 * the optional `webgpu` package at run time; without it the probe declines and every run is on the CPU, saying why.
 */

import { createNodeGpuContext, probeNodeWebGpu } from "@graphty/webgpu-graph-algorithms/node";

import type { GpuProvider, WebGpuOptions } from "./gpu.js";
import { type Platform, providerFor } from "./webgpu-provider.js";

/** What a Node user can do about a refusal. */
export const NODE_FIXES: Platform["fixes"] = {
    E_NO_WEBGPU: "install the optional webgpu package (npm install webgpu), which brings Dawn to Node",
};

/**
 * The Node provider.
 * @param options - the options; `adapter` picks the Dawn adapter by name
 * @returns the provider
 */
export function gpuProvider(options: WebGpuOptions): GpuProvider {
    return providerFor(
        {
            probe: (rejectSoftware) => probeNodeWebGpu({ adapter: options.adapter, rejectSoftware }),
            open: (_probe, rejectSoftware, residentSnapshots) =>
                createNodeGpuContext({
                    adapter: options.adapter,
                    rejectSoftware,
                    warnUnreleasedSnapshots: residentSnapshots,
                }),
            fixes: NODE_FIXES,
        },
        options,
    );
}
