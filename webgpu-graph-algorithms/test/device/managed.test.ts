/**
 * acquireAccelerator (src/managed.ts behind the ./node and ./browser entries): the one call that finds a device,
 * checks that it computes correctly, hands back an accelerator, acquires a new device after a loss, and disposes.
 *
 * This file runs the Node entry on the real adapter: an accelerator that computes, the same one for every call, a
 * new one after `device.destroy()`, and E_DISPOSED after `dispose()`. It destroys a device on purpose, so it runs in
 * the `node-device-errors` project. The decision logic on a stub platform is test/device/managed-decisions.test.ts.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { isWebGpuGraphError } from "../../src/errors.js";
import { acquireAccelerator } from "../../src/node/index.js";
import { adapterSummary, isSoftware, requireGpu } from "../setup/gpu.js";

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
