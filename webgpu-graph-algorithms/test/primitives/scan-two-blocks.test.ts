/**
 * The smallest multi-block exclusive scan, printed stage by stage (spec 6 row 2; P4-T2).
 *
 * Why it exists: on Dawn's D3D12 backend over the Microsoft Basic Render Driver -- the Windows leg of the host
 * matrix -- every scan of more than one block is wrong, and so is everything built on it (the histogram, the radix
 * sort, the grid build and the whole grid tier), while every single-block scan and every P1-P3 primitive is right.
 * The ladder case reports the first size that fails; this case reports WHY, from an input whose every answer is a
 * counting number: `count = workgroupSize + 1` ones, so the exclusive output is 0, 1, 2, ... and the total is the
 * count. The printed line names the device's workgroup size, the dispatch count, the last word of block 0, the
 * first word of block 1 (the poison 0xdeadbeef when nothing wrote it) and the total, so a red lane says which
 * stage lost the data rather than only that it did.
 */

import { runScan } from "../helpers/scan.js";
import { acquire, requireGpu } from "../setup/gpu.js";

describe("the two-block scan, stage by stage (spec 6 row 2; P4-T2)", () => {
    it("one block of ones scans to 0..wg-1, and the block after it continues the count", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "scan-two-blocks" });
        try {
            const { workgroupSize: wg, caps } = ctx;
            const one = await runScan(ctx, new Uint32Array(wg).fill(1));
            const two = await runScan(ctx, new Uint32Array(wg + 1).fill(1));
            const { limits } = caps;
            console.log(
                `[scan-2block] wg=${String(wg)} maxComputeInvocationsPerWorkgroup=${String(limits.maxComputeInvocationsPerWorkgroup)} ` +
                    `maxComputeWorkgroupSizeX=${String(limits.maxComputeWorkgroupSizeX)} ` +
                    `subgroups=${String(caps.subgroupMinSize)}-${String(caps.subgroupMaxSize)} | ` +
                    `one block: dispatches=${String(one.dispatches)} out[0]=${String(one.out[0])} out[wg-1]=${String(one.out[wg - 1])} total=${String(one.total)} | ` +
                    `two blocks: dispatches=${String(two.dispatches)} out[wg-1]=${String(two.out[wg - 1])} out[wg]=${String(two.out[wg])} total=${String(two.total)}`,
            );
            expect(one.total, "one block: total").toBe(wg);
            expect(one.out[wg - 1], "one block: the last word").toBe(wg - 1);
            expect(two.out[wg - 1], "two blocks: the last word of block 0").toBe(wg - 1);
            expect(two.out[wg], "two blocks: the first word of block 1").toBe(wg);
            expect(two.total, "two blocks: total").toBe(wg + 1);
        } finally {
            ctx.dispose();
        }
    });
});
