/**
 * The `./node` (and `./acquire`) entry as test/docs-examples.test.ts hands it to the documentation examples: the real
 * functions, with the lane's Dawn adapter selection (GRAPHTY_GPU_ADAPTER, GRAPHTY_DAWN_FEATURES) merged into the
 * options, so an example that calls `createNodeGpuContext()` runs on the adapter the rest of the suite runs on.
 */

import * as entry from "../../src/node/index.js";

/** The lane's Dawn selection, as test/setup/gpu.ts reads it. */
function lane(): { adapter?: string; dawnFeatures?: string[] } {
    const adapter = process.env.GRAPHTY_GPU_ADAPTER;
    const features = process.env.GRAPHTY_DAWN_FEATURES;
    return {
        ...(adapter === undefined || adapter === "" ? {} : { adapter }),
        ...(features === undefined || features === "" ? {} : { dawnFeatures: features.split(",") }),
    };
}

export * from "../../src/node/index.js";

/**
 * createNodeGpuContext on the lane's adapter.
 * @param options - the example's options
 * @returns the context
 */
export function createNodeGpuContext(options?: entry.NodeGpuOptions): ReturnType<typeof entry.createNodeGpuContext> {
    return entry.createNodeGpuContext({ ...lane(), ...options });
}

/**
 * acquireAccelerator on the lane's adapter, accepting a software one so CI's llvmpipe lane runs the example's GPU path.
 * @param options - the example's options
 * @returns the managed accelerator
 */
export function acquireAccelerator(
    options?: Parameters<typeof entry.acquireAccelerator>[0],
): ReturnType<typeof entry.acquireAccelerator> {
    return entry.acquireAccelerator({ ...lane(), acceptSoftware: true, ...options });
}
