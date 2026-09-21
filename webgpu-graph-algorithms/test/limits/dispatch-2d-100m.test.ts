/**
 * The G4 2D-dispatch item (spec 5.2, 11.1; P4-T15): `fill` in mode 1 over 100,000,000 words (400 MB; 390,625
 * workgroups of 256, well above the 65,535 one dimension holds, so plan1d folds the grid into a 2D dispatch and the
 * prelude's `linear_id` maps it back). 1,000 evenly spaced words equal their index, the checksum of those samples and
 * of the WHOLE array equal their closed forms (the sum mod 2^32 of linear-id.ts, re-derived in BigInt), twice bitwise.
 * The buffer is created directly on the device (raised limits) and read back through the readback ring in chunks.
 * A software adapter's binding limit stays at 128 MiB under "raise" (lavapipe), so there the count is the largest
 * the binding holds, 33,554,432 words: still above 16,776,960 and still a real 2D dispatch; 100M is the hardware
 * lane's number.
 */

import { MAX_1D_ITEMS } from "../../src/constants.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { FILL_PARAMS, kernelSpec } from "../../src/kernels.js";
import { bindingOf, readU32, scratchBuffer } from "../helpers/device.js";
import { runKernel } from "../helpers/kernel.js";
import { linearIdChecksum } from "../helpers/linear-id.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const HARDWARE_ITEMS = 100_000_000;
const SAMPLES = 1_000;
const TWO_POW_32 = 4_294_967_296n;

/**
 * sum_{k < count} (first + k x step) mod 2^32 in BigInt: the checksum of an iota's arithmetic subsequence.
 * @param first - the first term
 * @param step - the step
 * @param count - the term count
 * @returns the sum modulo 2^32
 */
function iotaChecksum(first: number, step: number, count: number): number {
    const c = BigInt(count);
    const total = c * BigInt(first) + (BigInt(step) * c * (c - 1n)) / 2n;
    return Number(total % TWO_POW_32);
}

describe("a real 2D dispatch on 100M items (node-limits, spec 5.2)", () => {
    it("fill mode 1 over 100,000,000 words: 1,000 sampled words equal their index, the sampled and the whole checksums match their closed forms, twice bitwise", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/dispatch-2d-100m", limits: "raise" });
        try {
            const ITEMS = ctx.caps.software
                ? Math.min(HARDWARE_ITEMS, Math.floor(ctx.caps.limits.maxStorageBufferBindingSize / 4))
                : HARDWARE_ITEMS;
            const STRIDE = Math.floor(ITEMS / SAMPLES);
            expect(ITEMS).toBeGreaterThan(MAX_1D_ITEMS);
            const byteLength = 4 * ITEMS;
            expect(byteLength).toBeLessThanOrEqual(ctx.caps.limits.maxStorageBufferBindingSize);
            const plan = plan1d(ITEMS, ctx.workgroupSize, ctx.caps);
            expect(plan.items).toBe(ITEMS);
            expect(plan.y).toBeGreaterThan(1);
            expect(plan.x * plan.y * ctx.workgroupSize).toBeGreaterThanOrEqual(ITEMS);
            const dst = scratchBuffer(ctx, byteLength, "dispatch-2d-100m/dst");
            try {
                const params = { block: FILL_PARAMS, values: { count: ITEMS, value: 0, mode: 1 } };
                const t0 = performance.now();
                await runKernel(ctx, kernelSpec("fill"), { dst: bindingOf(dst) }, plan, params);
                const words = await readU32(ctx, dst, ITEMS);
                console.warn(
                    `[dispatch-2d-100m] ${ITEMS} items in ${plan.x} x ${plan.y} workgroups; fill + ${(byteLength / 1e6).toFixed(0)} MB readback ${(performance.now() - t0).toFixed(0)} ms`,
                );
                expect(words.length).toBe(ITEMS);
                const sampled = new Uint32Array(SAMPLES);
                for (let k = 0; k < SAMPLES; k++) {
                    const i = k * STRIDE;
                    expect(words[i], `word ${i}`).toBe(i);
                    sampled[k] = words[i];
                }
                expect(words[ITEMS - 1]).toBe(ITEMS - 1);
                expect(linearIdChecksum(sampled)).toBe(iotaChecksum(0, STRIDE, SAMPLES));
                expect(linearIdChecksum(words)).toBe(iotaChecksum(0, 1, ITEMS));

                await runKernel(ctx, kernelSpec("fill"), { dst: bindingOf(dst) }, plan, params);
                const again = await readU32(ctx, dst, ITEMS);
                expectBitwiseEqual(words, again, "second run of the 100M-item fill");
            } finally {
                dst.destroy();
            }
        } finally {
            ctx.dispose();
        }
    });
});
