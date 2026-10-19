/**
 * The managed accelerator behind `acquireAccelerator` (the `./acquire` subpath, and the same function on `./browser`
 * and `./node`): probe, context, device self-check, accelerator, re-acquisition after device loss, disposal. The
 * runtime-specific half (how to probe and how to open a context) comes from the entry that calls `manageAccelerator`;
 * everything else is here once, so no consumer writes it.
 *
 * Every decline is decided before any work runs: a caller with a CPU implementation runs it and reports the reason.
 * A failure of work that already started on the device is never caught here; it reaches the caller of that work.
 */

import { createAccelerator } from "./accelerator.js";
import type { GpuContext } from "./context.js";
import { isWebGpuGraphError, WebGpuGraphError } from "./errors.js";
import { verifyDevice } from "./primitives/verify.js";
import type { GpuAccelerator } from "./types/accelerator.js";
import type { DeviceCheck, ProbeResult } from "./types/context.js";
import type {
    AcceleratorDeclined,
    AcquireAcceleratorOptions,
    AcquireResult,
    ManagedAccelerator,
} from "./types/managed.js";

/**
 * How one runtime finds a device; supplied by the browser and Node entries.
 * @internal
 */
export interface AcceleratorPlatform {
    /** Probes without creating a device; never throws. */
    probe(options: AcquireAcceleratorOptions, rejectSoftware: boolean): Promise<ProbeResult>;
    /** Opens a context on the probed adapter. */
    open(options: AcquireAcceleratorOptions, probe: ProbeResult, rejectSoftware: boolean): Promise<GpuContext>;
    /** What the user can do about E_NO_WEBGPU on this runtime, or null. */
    noWebGpuFix(): string | null;
    /** Test seam: replaces `verifyDevice`. */
    readonly verify?: ((ctx: GpuContext) => Promise<DeviceCheck>) | undefined;
}

/** The fix of a declined software adapter, on every runtime. */
const SOFTWARE_FIX = "pass acceptSoftware: true to use the software adapter (usually slower than the CPU)";

const DECLINE_CODES: ReadonlySet<string> = new Set(["E_NO_WEBGPU", "E_NO_ADAPTER", "E_SOFTWARE_ONLY"]);

/**
 * A decline record.
 * @param platform - the runtime, for the E_NO_WEBGPU fix
 * @param code - the decline code
 * @param reason - the reason in words
 * @param rest - the adapter and the check, when known
 * @returns the record
 */
function declined(
    platform: AcceleratorPlatform,
    code: AcceleratorDeclined["code"],
    reason: string,
    rest: Partial<Pick<AcceleratorDeclined, "adapter" | "check">> = {},
): AcceleratorDeclined {
    let fix: string | null = null;
    if (code === "E_SOFTWARE_ONLY") {
        fix = SOFTWARE_FIX;
    } else if (code === "E_NO_WEBGPU") {
        fix = platform.noWebGpuFix();
    }
    return { ok: false, code, reason, fix, adapter: rest.adapter ?? null, check: rest.check ?? null };
}

/**
 * One acquisition: probe, open, self-check, accelerator. The context is disposed on every path that does not hand
 * it over.
 * @param platform - the runtime
 * @param options - the caller's options
 * @returns the accelerator, or why there is none
 */
async function acquireOnce(platform: AcceleratorPlatform, options: AcquireAcceleratorOptions): Promise<AcquireResult> {
    const rejectSoftware = options.acceptSoftware !== true;
    const probe = await platform.probe(options, rejectSoftware);
    if (!probe.ok || probe.code !== "OK") {
        const code = probe.code === "OK" ? "E_NO_ADAPTER" : probe.code;
        return declined(platform, code, probe.reason ?? code, { adapter: probe.summary });
    }
    let ctx: GpuContext;
    try {
        ctx = await platform.open(options, probe, rejectSoftware);
    } catch (err) {
        // the adapter can change between the probe and the device request (a GPU process restart)
        if (isWebGpuGraphError(err) && DECLINE_CODES.has(err.code)) {
            return declined(platform, err.code as AcceleratorDeclined["code"], err.message, { adapter: probe.summary });
        }
        throw err;
    }
    let accelerator: GpuAccelerator;
    try {
        const check = await (platform.verify ?? verifyDevice)(ctx);
        if (check.mismatch !== null) {
            ctx.dispose();
            const where = check.mismatch.poison
                ? `${check.mismatch.where} was never written`
                : `${check.mismatch.where} came back as ${String(check.mismatch.actual)} where ${String(check.mismatch.expected)} was required`;
            return declined(
                platform,
                "E_DEVICE_INCORRECT",
                `the ${check.vendor} device computed a known prefix sum incorrectly: ${where}`,
                { adapter: probe.summary, check },
            );
        }
        accelerator = createAccelerator(ctx, options.accelerator);
    } catch (err) {
        ctx.dispose();
        throw err;
    }
    return { ok: true, code: "OK", accelerator };
}

/**
 * The managed accelerator over one runtime.
 * @param platform - how this runtime probes and opens a context
 * @param options - the caller's options
 * @returns the handle
 * @internal
 */
export function manageAccelerator(
    platform: AcceleratorPlatform,
    options: AcquireAcceleratorOptions = {},
): ManagedAccelerator {
    let pending: Promise<AcquireResult> | null = null;
    let ready: GpuAccelerator | null = null;
    let disposed = false;
    const disposedError = (): WebGpuGraphError =>
        new WebGpuGraphError("E_DISPOSED", "the managed accelerator was disposed", { label: "acquireAccelerator" });
    return {
        current(): Promise<AcquireResult> {
            if (disposed) {
                return Promise.reject(disposedError());
            }
            if (ready !== null && ready.ctx.state !== "ready") {
                // lost, or disposed by its holder: the next answer is a new device
                ready = null;
                pending = null;
            }
            if (pending === null) {
                const attempt = acquireOnce(platform, options).then(
                    (result) => {
                        if (!result.ok) {
                            return result;
                        }
                        if (disposed) {
                            result.accelerator.dispose();
                            throw disposedError();
                        }
                        ready = result.accelerator;
                        return result;
                    },
                    (err: unknown) => {
                        // not a decline: the next call tries again rather than remembering a transient failure
                        if (pending === attempt) {
                            pending = null;
                        }
                        throw err;
                    },
                );
                pending = attempt;
            }
            return pending;
        },
        dispose(): void {
            disposed = true;
            ready?.dispose();
            ready = null;
            pending = null;
        },
    };
}
