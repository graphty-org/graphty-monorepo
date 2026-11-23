/**
 * src/device/error-scope.ts (contract 3.4; spec 5.7, 5.1): AllocationTracker and formatCompilationInfo on RAW
 * devices on Dawn's null backend (acquireRawNullBackend(): nothing is read back, and the scopes surface the same
 * codes and messages as a real device's, issue #275). The out-of-memory path is driven by a Proxy that substitutes
 * popErrorScope (a real OOM needs the node-limits project of P4); the proxy binds every other member to the
 * underlying device so Dawn's native `this` checks pass.
 */

import { OOM_SCOPE_THRESHOLD_BYTES } from "../../src/constants.js";
import { AllocationTracker, formatCompilationInfo } from "../../src/device/error-scope.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError, type WebGpuGraphError, type WebGpuGraphErrorCode } from "../../src/errors.js";
import { acquireRawNullBackend, requireGpu } from "../setup/gpu.js";

type ScopeOverrides = Partial<{
    pushErrorScope: (filter: GPUErrorFilter) => void;
    popErrorScope: () => Promise<GPUError | null>;
}>;

/** A device whose pushErrorScope / popErrorScope are replaced; everything else is bound to the real device. */
function patched(device: GPUDevice, overrides: ScopeOverrides): GPUDevice {
    return new Proxy(device, {
        get(target, prop) {
            if (prop === "pushErrorScope" && overrides.pushErrorScope !== undefined) {
                return overrides.pushErrorScope;
            }
            if (prop === "popErrorScope" && overrides.popErrorScope !== undefined) {
                return overrides.popErrorScope;
            }
            const value = Reflect.get(target, prop) as unknown;
            return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
        },
    });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error("expected the promise to reject");
}

function expectCode(err: unknown, code: WebGpuGraphErrorCode, details?: Record<string, unknown>): WebGpuGraphError {
    expect(isWebGpuGraphError(err), `expected a WebGpuGraphError, got ${String(err)}`).toBe(true);
    const error = err as WebGpuGraphError;
    expect(error.code).toBe(code);
    if (details !== undefined) {
        expect(error.details).toMatchObject(details);
    }
    return error;
}

describe("AllocationTracker", () => {
    it("wraps only allocations at or above the threshold in an out-of-memory scope; resident / liveBuffers follow create and destroy", async (t) => {
        requireGpu(t);
        const { device } = await acquireRawNullBackend();
        const pushes: GPUErrorFilter[] = [];
        const dev = patched(device, {
            pushErrorScope: (filter) => {
                pushes.push(filter);
                device.pushErrorScope(filter);
            },
        });
        const tracker = new AllocationTracker(dev, 1024);
        expect(tracker.resident).toBe(0);
        expect(tracker.liveBuffers).toBe(0);
        const a = tracker.createBuffer({ label: "a", size: 512, usage: BufferUsage.STORAGE });
        expect(pushes).toEqual([]);
        expect(tracker.resident).toBe(512);
        expect(tracker.liveBuffers).toBe(1);
        const b = tracker.createBuffer({ label: "b", size: 2048, usage: BufferUsage.STORAGE });
        expect(pushes).toEqual(["out-of-memory"]);
        const c = tracker.createBuffer({ label: "c", size: 1024, usage: BufferUsage.STORAGE });
        expect(pushes).toEqual(["out-of-memory", "out-of-memory"]);
        expect(tracker.resident).toBe(3584);
        expect(tracker.liveBuffers).toBe(3);
        await tracker.check();
        await tracker.check();
        tracker.destroy(a);
        expect(tracker.resident).toBe(3072);
        expect(tracker.liveBuffers).toBe(2);
        tracker.destroy(a);
        expect(tracker.resident).toBe(3072);
        expect(tracker.liveBuffers).toBe(2);
        tracker.destroy(b);
        tracker.destroy(c);
        expect(tracker.resident).toBe(0);
        expect(tracker.liveBuffers).toBe(0);
    });

    it("defaults the threshold to OOM_SCOPE_THRESHOLD_BYTES (16 MiB)", async (t) => {
        requireGpu(t);
        const { device } = await acquireRawNullBackend();
        const pushes: GPUErrorFilter[] = [];
        const dev = patched(device, {
            pushErrorScope: (filter) => {
                pushes.push(filter);
                device.pushErrorScope(filter);
            },
        });
        const tracker = new AllocationTracker(dev);
        const below = tracker.createBuffer({
            label: "below",
            size: OOM_SCOPE_THRESHOLD_BYTES - 4,
            usage: BufferUsage.STORAGE,
        });
        expect(pushes).toEqual([]);
        const at = tracker.createBuffer({ label: "at", size: OOM_SCOPE_THRESHOLD_BYTES, usage: BufferUsage.STORAGE });
        expect(pushes).toEqual(["out-of-memory"]);
        await tracker.check();
        expect(tracker.resident).toBe(2 * OOM_SCOPE_THRESHOLD_BYTES - 4);
        tracker.destroy(below);
        tracker.destroy(at);
        expect(tracker.liveBuffers).toBe(0);
    });

    it("check() surfaces a captured out-of-memory error as E_OUT_OF_MEMORY { requested, resident, label }, again until reset()", async (t) => {
        requireGpu(t);
        const { device } = await acquireRawNullBackend();
        const tracker = new AllocationTracker(
            patched(device, {
                popErrorScope: () => Promise.resolve({ message: "simulated out-of-memory" } as GPUError),
            }),
            1024,
        );
        const keep = tracker.createBuffer({ label: "keep", size: 256, usage: BufferUsage.STORAGE });
        const big = tracker.createBuffer({ label: "big", size: 4096, usage: BufferUsage.STORAGE });
        expect(tracker.resident).toBe(4352);
        const first = expectCode(await rejection(tracker.check()), "E_OUT_OF_MEMORY", {
            requested: 4096,
            resident: 256,
            label: "big",
        });
        expect(first.message).toContain("big");
        expect(await rejection(tracker.check())).toBe(first);
        expect(tracker.liveBuffers).toBe(1);
        expect(tracker.resident).toBe(256);
        tracker.reset();
        await tracker.check();
        tracker.destroy(big);
        tracker.destroy(keep);
        expect(tracker.liveBuffers).toBe(0);
        // the real "out-of-memory" scope createBuffer("big") pushed stays on this throwaway device's stack; afterAll destroys it
    });
});

describe("formatCompilationInfo", () => {
    it("subtracts the prelude line count, marks messages inside the prelude and keeps unlocated ones", () => {
        const info = {
            messages: [
                { type: "error", lineNum: 12, linePos: 5, offset: 0, length: 1, message: "unresolved value 'foo'" },
                { type: "warning", lineNum: 3, linePos: 1, offset: 0, length: 1, message: "in the prelude" },
                { type: "info", lineNum: 0, linePos: 0, offset: 0, length: 0, message: "general" },
                { type: "error", lineNum: 11, linePos: 9, offset: 0, length: 1, message: "first body line" },
            ],
        } as unknown as GPUCompilationInfo;
        expect(formatCompilationInfo(info, 10)).toEqual([
            "error 2:5 unresolved value 'foo'",
            "warning prelude:3:1 in the prelude",
            "info general",
            "error 1:9 first body line",
        ]);
        expect(formatCompilationInfo({ messages: [] } as unknown as GPUCompilationInfo, 10)).toEqual([]);
    });
});
