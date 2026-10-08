/**
 * The device provider both platform builds (browser and Node) return: probe, request a context, check that the
 * device computes correctly, build the accelerator. Everything here happens before any graph work, so a refusal is
 * detection (the CPU runs and the result says why), never a fallback.
 *
 * Only the lazily loaded "#gpu-platform" chunk imports this module, so @graphty/webgpu-graph-algorithms stays out of
 * the main chunk.
 */

import { createAccelerator, type GpuContext, type ProbeResult, verifyDevice } from "@graphty/webgpu-graph-algorithms";

import { type GpuProvider, GpuUnavailableError, type WebGpuOptions } from "./gpu.js";

// The GPU package warns once when more than 2 snapshots are resident (its default); the adapter caches one snapshot
// per directed/weight combination per core and releases each when the cache drops it, so a few are normal.
const RESIDENT_SNAPSHOTS = 8;

/** How one platform probes for a device and opens a context on it. */
export interface Platform {
    probe(rejectSoftware: boolean): Promise<ProbeResult>;
    open(probe: ProbeResult, rejectSoftware: boolean, residentSnapshots: number): Promise<GpuContext>;
    /** What the user can do about a refusal code on this platform; codes it does not name have no fix. */
    readonly fixes: Readonly<Record<string, string>>;
}

/** The fix of a refused software adapter, on every platform. */
const SOFTWARE_FIX = "call configureWebGpu({ acceptSoftware: true }) to accept the software adapter";

/**
 * A provider for a platform.
 * @param platform - the platform's probe, context factory and fixes
 * @param options - the options
 * @returns the provider
 */
export function providerFor(platform: Platform, options: WebGpuOptions): GpuProvider {
    return {
        acquire: async () => {
            const rejectSoftware = options.acceptSoftware !== true;
            const probe = await platform.probe(rejectSoftware);
            if (!probe.ok) {
                const fix = probe.code === "E_SOFTWARE_ONLY" ? SOFTWARE_FIX : (platform.fixes[probe.code] ?? null);
                throw new GpuUnavailableError(probe.code, probe.reason ?? probe.code, fix);
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
}
