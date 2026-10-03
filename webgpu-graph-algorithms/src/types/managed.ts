/**
 * The types of `acquireAccelerator` (the `./acquire` subpath, and the same function on `./browser` and `./node`):
 * one call that finds a device, checks that it computes correctly and hands back an accelerator, or says why it
 * did not. Types only.
 */

import type { AcceleratorOptions, GpuAccelerator } from "./accelerator.js";
import type { AdapterSummary, DeviceCheck } from "./context.js";

/**
 * Options of `acquireAccelerator`.
 * @public
 */
export interface AcquireAcceleratorOptions {
    /**
     * Accept a software adapter (llvmpipe, SwiftShader, WARP). Default false: a software adapter is usually slower
     * than a CPU implementation, so it is declined with `E_SOFTWARE_ONLY`.
     */
    readonly acceptSoftware?: boolean | undefined;
    /** The adapter power preference; default "high-performance". */
    readonly powerPreference?: GPUPowerPreference | undefined;
    /** Passed to `createAccelerator` (layout tuning, betweenness defaults). */
    readonly accelerator?: AcceleratorOptions | undefined;
    /** Warn once when more than this many snapshots stay resident on the device (the context's default when absent). */
    readonly warnUnreleasedSnapshots?: number | undefined;
    /** Node only: a substring of the Dawn adapter name to pick (`"llvmpipe"`, `"4070"`). Ignored in a browser. */
    readonly adapter?: string | undefined;
}

/**
 * A verified accelerator.
 * @public
 */
export interface AcceleratorReady {
    readonly ok: true;
    readonly code: "OK";
    /** The accelerator. Its `ctx.lost` resolves when the device is lost; the handle then acquires a new one. */
    readonly accelerator: GpuAccelerator;
}

/**
 * Why no accelerator was handed over. Every code here is decided before any work runs, so a caller that has a CPU
 * implementation runs it and reports the reason; that is detection, not a fallback.
 * @public
 */
export interface AcceleratorDeclined {
    readonly ok: false;
    /**
     * E_NO_WEBGPU: this runtime has no WebGPU (in Node: the optional `webgpu` package is missing);
     * E_NO_ADAPTER: WebGPU exists but no adapter answered; E_SOFTWARE_ONLY: the adapter is a software renderer and
     * `acceptSoftware` was not set; E_DEVICE_INCORRECT: the device got a known answer wrong in the self-check.
     */
    readonly code: "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY" | "E_DEVICE_INCORRECT";
    /** The reason in words. */
    readonly reason: string;
    /** What the user can change to get the GPU, or null when nothing they can do would help. */
    readonly fix: string | null;
    /** The adapter that was found and declined, when one was. */
    readonly adapter: AdapterSummary | null;
    /** The self-check record of an E_DEVICE_INCORRECT decline (what disagreed); null otherwise. */
    readonly check: DeviceCheck | null;
}

/**
 * What `ManagedAccelerator.current()` resolves to.
 * @public
 */
export type AcquireResult = AcceleratorReady | AcceleratorDeclined;

/**
 * The handle `acquireAccelerator` returns. It owns the device: probing, the device self-check, re-acquiring after
 * device loss, and disposal.
 * @public
 */
export interface ManagedAccelerator {
    /**
     * The accelerator, or why there is none. The first call acquires (probe, context, self-check); later calls
     * return the same answer until the device is lost or the accelerator is disposed, after which the next call
     * acquires a new device. Concurrent calls share one acquisition. A decline is remembered for the life of the
     * handle. Rejects only for a failure that is not a decline (a device request that failed, a check that could not
     * run), and with E_DISPOSED after `dispose()`.
     */
    current(): Promise<AcquireResult>;
    /** Disposes the current accelerator and its device; idempotent. */
    dispose(): void;
}
