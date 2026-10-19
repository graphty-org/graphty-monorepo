/**
 * acquireAccelerator (src/managed.ts behind the ./node and ./browser entries): the one call that finds a device,
 * checks that it computes correctly, hands back an accelerator, acquires a new device after a loss, and disposes.
 *
 * The first block drives the decision logic through `manageAccelerator` with a stub platform, so every decline is
 * reached without a GPU. The second runs the Node entry on the real adapter: an accelerator that computes, the same
 * one for every call, a new one after `device.destroy()`, and E_DISPOSED after `dispose()`. It destroys a device on
 * purpose, so it runs in the `node-device-errors` project.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it, vi } from "vitest";

import type { GpuContext } from "../../src/context.js";
import { isWebGpuGraphError, WebGpuGraphError } from "../../src/errors.js";
import { type AcceleratorPlatform, manageAccelerator } from "../../src/managed.js";
import { acquireAccelerator } from "../../src/node/index.js";
import type { DeviceCheck, ProbeResult } from "../../src/types/context.js";
import { adapterSummary, isSoftware, requireGpu } from "../setup/gpu.js";

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

describe("acquireAccelerator on Dawn", () => {
    const graph = (): ReturnType<typeof fromEdgeArrays> =>
        fromEdgeArrays({
            directed: false,
            nodeCount: 5,
            src: new Uint32Array([0, 1, 2, 0, 0]),
            dst: new Uint32Array([1, 2, 3, 2, 3]),
        });

    it("hands over a verified accelerator, the same one each call, a new one after a loss, none after dispose", async (t) => {
        requireGpu(t);
        const gpu = acquireAccelerator({ acceptSoftware: isSoftware(), adapter: process.env.GRAPHTY_GPU_ADAPTER });

        const first = await gpu.current();
        expect(first.ok, first.ok ? "" : `${first.code}: ${first.reason}`).toBe(true);
        if (!first.ok) {
            return;
        }
        expect(first.accelerator.ctx.caps.vendor).toBe(adapterSummary()?.vendor);
        const ranks = await first.accelerator.pageRank(graph());
        expect(ranks.scores.length).toBe(5);
        expect(await gpu.current()).toBe(first);

        first.accelerator.ctx.device.destroy();
        await first.accelerator.ctx.lost;
        const second = await gpu.current();
        expect(second.ok).toBe(true);
        if (!second.ok) {
            return;
        }
        expect(second.accelerator).not.toBe(first.accelerator);
        expect((await second.accelerator.pageRank(graph())).scores.length).toBe(5);

        gpu.dispose();
        expect(second.accelerator.ctx.state).toBe("disposed");
        const after = await gpu.current().catch((error: unknown) => error);
        expect(isWebGpuGraphError(after) && after.code === "E_DISPOSED").toBe(true);
    });

    it("refuses a software adapter unless told to accept it", async (t) => {
        requireGpu(t);
        const result = await acquireAccelerator({ adapter: "llvmpipe" }).current();

        // a host without Mesa has no llvmpipe adapter to refuse
        expect(["E_SOFTWARE_ONLY", "E_NO_ADAPTER"]).toContain(result.ok ? "OK" : result.code);
        if (!result.ok && result.code === "E_SOFTWARE_ONLY") {
            expect(result.fix).toMatch(/acceptSoftware: true/);
            expect(result.adapter?.software).toBe(true);
        }
    });
});
