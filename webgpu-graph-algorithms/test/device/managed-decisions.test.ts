/**
 * manageAccelerator (src/managed.ts behind the ./node and ./browser entries): the decision logic, driven through a
 * stub platform, so every decline is reached without a GPU and without breaking a device. It runs in the `node`
 * project; the Dawn half, which destroys a device on purpose, is test/device/managed.test.ts in
 * `node-device-errors`.
 */

import { describe, expect, it, vi } from "vitest";

import type { GpuContext } from "../../src/context.js";
import { WebGpuGraphError } from "../../src/errors.js";
import { type AcceleratorPlatform, manageAccelerator } from "../../src/managed.js";
import type { DeviceCheck, ProbeResult } from "../../src/types/context.js";

const SOFTWARE_SUMMARY = {
    vendor: "mesa",
    architecture: "llvmpipe",
    device: "",
    description: "llvmpipe",
    software: true,
    subgroupMinSize: 4,
    subgroupMaxSize: 64,
    features: [],
    limits: {},
};

/** A platform whose probe answers `probe` and whose open() is a spy that must be called only when told. */
function stubPlatform(probe: ProbeResult, open?: AcceleratorPlatform["open"]): AcceleratorPlatform {
    return {
        probe: vi.fn(() => Promise.resolve(probe)),
        open: vi.fn(open ?? (() => Promise.reject(new Error("open() must not run after a declined probe")))),
        noWebGpuFix: () => "install the thing",
    };
}

describe("manageAccelerator: the decisions, on a stub platform", () => {
    it("declines E_NO_WEBGPU with the runtime's fix, and decides once", async () => {
        const platform = stubPlatform({
            ok: false,
            code: "E_NO_WEBGPU",
            reason: "no navigator.gpu",
            adapter: null,
            summary: null,
        });
        const gpu = manageAccelerator(platform);

        const first = await gpu.current();
        const second = await gpu.current();

        expect(first).toEqual({
            ok: false,
            code: "E_NO_WEBGPU",
            reason: "no navigator.gpu",
            fix: "install the thing",
            adapter: null,
            check: null,
        });
        expect(second).toBe(first);
        expect(platform.probe).toHaveBeenCalledTimes(1);
        expect(platform.open).not.toHaveBeenCalled();
    });

    it("refuses a software adapter by default and names acceptSoftware as the fix", async () => {
        const platform = stubPlatform({
            ok: false,
            code: "E_SOFTWARE_ONLY",
            reason: "software adapter rejected: mesa/llvmpipe",
            adapter: null,
            summary: SOFTWARE_SUMMARY,
        });

        const result = await manageAccelerator(platform).current();

        expect(platform.probe).toHaveBeenCalledWith({}, true);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("E_SOFTWARE_ONLY");
            expect(result.fix).toMatch(/acceptSoftware: true/);
            expect(result.adapter).toEqual(SOFTWARE_SUMMARY);
        }
    });

    it("asks for a software adapter to be accepted when acceptSoftware is set", async () => {
        const platform = stubPlatform({
            ok: false,
            code: "E_NO_ADAPTER",
            reason: "none",
            adapter: null,
            summary: null,
        });

        const result = await manageAccelerator(platform, { acceptSoftware: true }).current();

        expect(platform.probe).toHaveBeenCalledWith({ acceptSoftware: true }, false);
        expect(result).toMatchObject({ ok: false, code: "E_NO_ADAPTER", fix: null });
    });

    it("turns a decline thrown by the device request into a decline, not an error", async () => {
        const platform = stubPlatform(
            { ok: true, code: "OK", reason: null, adapter: null, summary: SOFTWARE_SUMMARY },
            () =>
                Promise.reject(new WebGpuGraphError("E_SOFTWARE_ONLY", "software adapter rejected by rejectSoftware")),
        );

        const result = await manageAccelerator(platform).current();

        expect(result).toMatchObject({ ok: false, code: "E_SOFTWARE_ONLY" });
    });

    it("rejects any other failure and tries again on the next call instead of remembering it", async () => {
        let opens = 0;
        const platform = stubPlatform({ ok: true, code: "OK", reason: null, adapter: null, summary: null }, () => {
            opens += 1;
            return Promise.reject(new WebGpuGraphError("E_DEVICE_LOST", `request ${String(opens)} failed`));
        });
        const gpu = manageAccelerator(platform);

        await expect(gpu.current()).rejects.toThrow("request 1 failed");
        await expect(gpu.current()).rejects.toThrow("request 2 failed");
        expect(platform.probe).toHaveBeenCalledTimes(2);
    });

    it("declines E_DEVICE_INCORRECT when the self-check gets a known answer wrong, and releases the device", async () => {
        const ctx = { dispose: vi.fn() } as unknown as GpuContext;
        const check: DeviceCheck = {
            check: "exclusive-scan",
            ok: false,
            workgroupSize: 256,
            count: 8193,
            blocks: 32,
            ms: 17,
            vendor: "microsoft",
            architecture: "warp",
            description: "Microsoft Basic Render Driver",
            mismatch: { where: "out[256]", expected: 32_896, actual: 1, poison: false },
        };
        const platform: AcceleratorPlatform = {
            ...stubPlatform({ ok: true, code: "OK", reason: null, adapter: null, summary: null }, () =>
                Promise.resolve(ctx),
            ),
            verify: () => Promise.resolve(check),
        };

        const result = await manageAccelerator(platform).current();

        expect(result).toMatchObject({ ok: false, code: "E_DEVICE_INCORRECT", check, fix: null });
        if (!result.ok) {
            expect(result.reason).toMatch(/out\[256\] came back as 1 where 32896 was required/);
        }
        expect(ctx.dispose).toHaveBeenCalledTimes(1);
    });
});

describe("manageAccelerator: the handle's lifecycle, on a stub platform", () => {
    const READY_PROBE: ProbeResult = { ok: true, code: "OK", reason: null, adapter: null, summary: null };
    const PASSED: DeviceCheck = {
        check: "exclusive-scan",
        ok: true,
        workgroupSize: 256,
        count: 8193,
        blocks: 32,
        ms: 1,
        vendor: "stub",
        architecture: "stub",
        description: "stub",
        mismatch: null,
    };

    /** A context stub with the members createAccelerator and the handle read: its state, assertReady and dispose. */
    function stubContext(): { ctx: GpuContext; state: { value: string }; dispose: ReturnType<typeof vi.fn> } {
        const state = { value: "ready" };
        const dispose = vi.fn(() => {
            state.value = "disposed";
        });
        const ctx = {
            get state(): string {
                return state.value;
            },
            assertReady: (): void => undefined,
            dispose,
        } as unknown as GpuContext;
        return { ctx, state, dispose };
    }

    function platformOver(open: AcceleratorPlatform["open"]): AcceleratorPlatform {
        return { ...stubPlatform(READY_PROBE, open), verify: () => Promise.resolve(PASSED) };
    }

    it("a probe that is not ok yet says OK declines E_NO_ADAPTER, with the code as the reason when none is given", async () => {
        const platform = stubPlatform({ ok: false, code: "OK", reason: null, adapter: null, summary: null });

        const result = await manageAccelerator(platform).current();

        expect(result).toMatchObject({ ok: false, code: "E_NO_ADAPTER", reason: "E_NO_ADAPTER", fix: null });
        expect(platform.open).not.toHaveBeenCalled();
    });

    it("names a self-check slot the device never wrote", async () => {
        const { ctx, dispose } = stubContext();
        const platform: AcceleratorPlatform = {
            ...stubPlatform(READY_PROBE, () => Promise.resolve(ctx)),
            verify: () =>
                Promise.resolve({
                    ...PASSED,
                    ok: false,
                    mismatch: { where: "out[7]", expected: 21, actual: 0xffffffff, poison: true },
                }),
        };

        const result = await manageAccelerator(platform).current();

        expect(result).toMatchObject({ ok: false, code: "E_DEVICE_INCORRECT" });
        if (!result.ok) {
            expect(result.reason).toMatch(/out\[7\] was never written/);
        }
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("hands over the same accelerator until its context leaves 'ready', then acquires a new one", async () => {
        const contexts: ReturnType<typeof stubContext>[] = [];
        const platform = platformOver(() => {
            const made = stubContext();
            contexts.push(made);
            return Promise.resolve(made.ctx);
        });
        const gpu = manageAccelerator(platform);

        const first = await gpu.current();
        expect(first.ok).toBe(true);
        expect(await gpu.current()).toBe(first);
        expect(platform.open).toHaveBeenCalledTimes(1);

        contexts[0].state.value = "lost";
        const second = await gpu.current();
        expect(second.ok).toBe(true);
        expect(second).not.toBe(first);
        expect(platform.open).toHaveBeenCalledTimes(2);
        if (second.ok) {
            expect(second.accelerator.ctx).toBe(contexts[1].ctx);
        }

        gpu.dispose();
        expect(contexts[1].dispose).toHaveBeenCalledTimes(1);
        await expect(gpu.current()).rejects.toThrow("disposed");
    });

    it("dispose() during an acquisition releases the accelerator it was about to hand over and rejects E_DISPOSED", async () => {
        const made = stubContext();
        let openContext = (_ctx: GpuContext): void => undefined;
        const platform = platformOver(
            () =>
                new Promise<GpuContext>((resolve) => {
                    openContext = resolve;
                }),
        );
        const gpu = manageAccelerator(platform);

        const pending = gpu.current();
        await vi.waitFor(() => {
            expect(platform.open).toHaveBeenCalledTimes(1);
        });
        gpu.dispose();
        openContext(made.ctx);

        const error: unknown = await pending.then(
            () => null,
            (err: unknown) => err,
        );
        expect(error).toBeInstanceOf(WebGpuGraphError);
        expect((error as WebGpuGraphError).code).toBe("E_DISPOSED");
        expect(made.dispose).toHaveBeenCalledTimes(1);
    });

    it("a failure that lands after dispose() still reaches the caller that started it", async () => {
        let failOpen = (_err: Error): void => undefined;
        const platform = platformOver(
            () =>
                new Promise<GpuContext>((_resolve, reject) => {
                    failOpen = reject;
                }),
        );
        const gpu = manageAccelerator(platform);

        const pending = gpu.current();
        await vi.waitFor(() => {
            expect(platform.open).toHaveBeenCalledTimes(1);
        });
        gpu.dispose();
        failOpen(new WebGpuGraphError("E_DEVICE_LOST", "the request failed late"));

        await expect(pending).rejects.toThrow("the request failed late");
        await expect(gpu.current()).rejects.toThrow("disposed");
    });
});
