/**
 * What "#gpu-platform" loads in a browser (the package's `imports` field): the provider on `navigator.gpu`.
 */

import { probeBrowserWebGpu, requestGpuContext } from "@graphty/webgpu-graph-algorithms/browser";

import type { GpuProvider, WebGpuOptions } from "./gpu.js";
import { providerFor } from "./webgpu-provider.js";

/**
 * The browser's provider.
 * @param options - the options
 * @returns the provider
 */
export function gpuProvider(options: WebGpuOptions): GpuProvider {
    return providerFor(
        {
            probe: (rejectSoftware) => probeBrowserWebGpu({ rejectSoftware }),
            open: (probe, rejectSoftware, residentSnapshots) =>
                requestGpuContext({
                    adapter: probe.adapter ?? undefined,
                    rejectSoftware,
                    warnUnreleasedSnapshots: residentSnapshots,
                }),
            fixes: {},
        },
        options,
    );
}
