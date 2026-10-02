/**
 * The device provider both "@graphty/cytoscape/webgpu" builds (browser and Node) register: probe, request a
 * context, check that the device computes correctly, build the accelerator. Everything here happens before any
 * graph work, so a refusal is detection (the CPU runs and the result says why), never a fallback.
 */

import { createAccelerator, type GpuContext, type ProbeResult, verifyDevice } from "@graphty/webgpu-graph-algorithms";

import { type GpuProvider, GpuUnavailableError, registerGpuProvider } from "./gpu.js";

/** Options of `enableWebGpu`. */
export interface WebGpuOptions {
    /**
     * Accept a software adapter (llvmpipe, SwiftShader, WARP). Default false: a software adapter is usually slower
     * than the CPU implementation, so the CPU runs and the result says why.
     */
    readonly acceptSoftware?: boolean;
    /** Node only: a substring of the Dawn adapter name to pick ("llvmpipe", "4070"). Ignored in a browser. */
    readonly adapter?: string;
}

// The GPU package warns once when more than 2 snapshots are resident (its default); the adapter caches one snapshot
// per directed/weight combination per core and releases each when the cache drops it, so a few are normal.
const RESIDENT_SNAPSHOTS = 8;

/**
 * How one platform probes for a device and opens a context on it.
 * @public
 */
export interface Platform {
    probe(rejectSoftware: boolean): Promise<ProbeResult>;
    open(probe: ProbeResult, rejectSoftware: boolean, residentSnapshots: number): Promise<GpuContext>;
}

/**
 * Registers a provider for a platform; every core decides again on its next call.
 * @param platform - the platform's probe and context factory
 * @param options - the options
 */
export function registerPlatform(platform: Platform, options: WebGpuOptions = {}): void {
    const provider: GpuProvider = {
        acquire: async () => {
            const rejectSoftware = options.acceptSoftware !== true;
            const probe = await platform.probe(rejectSoftware);
            if (!probe.ok) {
                throw new GpuUnavailableError(probe.code, probe.reason ?? probe.code);
            }
            const ctx = await platform.open(probe, rejectSoftware, RESIDENT_SNAPSHOTS);
            try {
                // The GPU package's compute entry points refuse a device that fails this check, mid-run. Checking
                // here decides up front, so such a device means the CPU, not an error from the first call.
                const check = await verifyDevice(ctx);
                if (check.mismatch !== null) {
                    throw new GpuUnavailableError(
                        "E_DEVICE_INCORRECT",
                        `the ${check.vendor} device computes a known prefix sum incorrectly (${check.mismatch.where})`,
                    );
                }
                const { caps } = ctx;
                return {
                    accelerator: createAccelerator(ctx),
                    device: `${caps.vendor} ${caps.device === "" ? caps.description : caps.device}`,
                    lost: ctx.lost.then((info) => (info.message === "" ? info.reason : info.message)),
                };
            } catch (error) {
                ctx.dispose();
                throw error;
            }
        },
    };
    registerGpuProvider(provider);
}

/** Turns WebGPU off again: every core disposes its device on its next call and runs on the CPU. */
export function disableWebGpu(): void {
    registerGpuProvider(null);
}
