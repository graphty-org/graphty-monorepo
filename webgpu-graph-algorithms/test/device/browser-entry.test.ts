/**
 * The ./browser entry (src/browser/index.ts) run under Node: Node 22 has a `navigator` without `gpu`, which is the
 * "browser without WebGPU" case, and stubbing `navigator.gpu` with Dawn's GPU object is a browser that has it. Every
 * path of the entry is reached: the E_NO_WEBGPU probe and request, the managed accelerator's decline and its
 * secure-context fix, a context on navigator.gpu tagged "browser", and a caller's own device adopted without being
 * destroyed.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { afterEach, describe, expect, it, vi } from "vitest";

import { acquireAccelerator, probeBrowserWebGpu, requestGpuContext } from "../../src/browser/index.js";
import { BufferUsage, MapMode } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { acquireRaw, requireGpu } from "../setup/gpu.js";

async function rejectionOf(p: Promise<unknown>): Promise<unknown> {
    return p.then(
        () => null,
        (error: unknown) => error,
    );
}

const graph = (): ReturnType<typeof fromEdgeArrays> =>
    fromEdgeArrays({ directed: false, nodeCount: 4, src: new Uint32Array([0, 1, 2]), dst: new Uint32Array([1, 2, 3]) });

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("./browser entry without navigator.gpu", () => {
    it("probeBrowserWebGpu answers E_NO_WEBGPU and requestGpuContext rejects with it", async () => {
        expect((navigator as { gpu?: unknown }).gpu).toBeUndefined();
        const probe = await probeBrowserWebGpu();
        expect(probe.ok).toBe(false);
        expect(probe.code).toBe("E_NO_WEBGPU");
        const err = await rejectionOf(requestGpuContext());
        expect(isWebGpuGraphError(err) && err.code === "E_NO_WEBGPU").toBe(true);
        if (isWebGpuGraphError(err)) {
            expect(String(err.details.hint)).toContain("secure context");
        }
    });

    it("acquireAccelerator declines E_NO_WEBGPU; the fix names https only on an insecure page", async () => {
        const plain = await acquireAccelerator().current();
        expect(plain.ok).toBe(false);
        if (plain.ok) {
            throw new Error("unreachable");
        }
        expect(plain.code).toBe("E_NO_WEBGPU");
        expect(plain.fix).toBeNull();

        vi.stubGlobal("isSecureContext", false);
        const insecure = await acquireAccelerator().current();
        expect(insecure.ok).toBe(false);
        if (insecure.ok) {
            throw new Error("unreachable");
        }
        expect(insecure.code).toBe("E_NO_WEBGPU");
        expect(insecure.fix).toContain("https");
    });
});

describe("./browser entry on Dawn", () => {
    it("with navigator.gpu: the probe, a context and a managed accelerator are all runtime 'browser'", async (t) => {
        requireGpu(t);
        const raw = await acquireRaw();
        // only the GPU object is borrowed: the entry requests (and on dispose destroys) devices of its own
        vi.stubGlobal("navigator", { gpu: raw.gpu });

        const probe = await probeBrowserWebGpu();
        expect(probe.code === "OK" || probe.code === "E_SOFTWARE_ONLY").toBe(true);

        const ctx = await requestGpuContext({ adapter: probe.adapter ?? undefined });
        try {
            expect(ctx.caps.runtime).toBe("browser");
            expect(ctx.state).toBe("ready");
        } finally {
            ctx.dispose();
        }

        const gpu = acquireAccelerator({ acceptSoftware: true });
        const result = await gpu.current();
        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error("unreachable");
        }
        expect(result.accelerator.ctx.caps.runtime).toBe("browser");
        expect(await gpu.current()).toBe(result);
        gpu.dispose();
        expect(result.accelerator.ctx.state).toBe("disposed");
    });

    it("adopts a caller's device: computes on it, and dispose() leaves the device to its owner", async (t) => {
        requireGpu(t);
        const raw = await acquireRaw();
        const gpu = acquireAccelerator({ device: raw.device, acceptSoftware: true });
        const result = await gpu.current();
        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error("unreachable");
        }
        const { accelerator } = result;
        expect(accelerator.ctx.device).toBe(raw.device);
        expect(accelerator.ctx.caps.runtime).toBe("browser");
        const { scores } = await accelerator.pageRank(graph());
        // the path 0-1-2-3: the ends rank alike, the middles alike and higher, and the ranks sum to 1
        expect(scores[0]).toBeCloseTo(scores[3], 5);
        expect(scores[1]).toBeCloseTo(scores[2], 5);
        expect(scores[1]).toBeGreaterThan(scores[0]);
        expect(scores.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
        gpu.dispose();
        expect(accelerator.ctx.state).toBe("disposed");
        // the device is still the owner's and still works: a map on a destroyed device would reject
        const buffer = raw.device.createBuffer({ size: 16, usage: BufferUsage.MAP_READ | BufferUsage.COPY_DST });
        await buffer.mapAsync(MapMode.READ);
        expect(buffer.getMappedRange().byteLength).toBe(16);
        buffer.unmap();
        buffer.destroy();
    });
});
