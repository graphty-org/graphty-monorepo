/**
 * The G4 binding-size item (spec 11.1, 13 row P4; P4-T15): under `limits: "raise"` the device's
 * maxStorageBufferBindingSize is above the 128 MiB default (the RTX 4070 SUPER reports 2,147,483,644, Dawn's clamp of
 * the 2 GiB request: four bytes UNDER 2^31, which is why the assertion is "above 128 MiB and at least the binding this
 * test creates" and not `>= 2^31`), a 1.5 GiB STORAGE buffer created through the allocator is bound WHOLE to `fill`
 * (mode 1: an iota over 2^28 words, a 2D dispatch), and the first and last 256 words read back equal their index,
 * twice bitwise. The value is printed for the G4 record. A software adapter cannot raise the binding limit (lavapipe
 * stays at 128 MiB under "raise"), so there the file asserts only that the raise did not lower it and binds the
 * largest buffer the limit allows, whole: the item itself is the hardware lane's.
 */

import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { FILL_PARAMS, kernelSpec } from "../../src/kernels.js";
import { bindingOf, readU32 } from "../helpers/device.js";
import { runKernel } from "../helpers/kernel.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const MIB = 2 ** 20;
/** The default maxStorageBufferBindingSize every adapter can raise above. */
const DEFAULT_BINDING = 128 * MIB;
/** The binding this test creates and binds whole on hardware. */
const HARDWARE_BUFFER_BYTES = 1.5 * 2 ** 30;
/** The words read back at each end. */
const SAMPLE = 256;

describe("a binding above 128 MiB under limits: raise (node-limits, spec 11.1)", () => {
    it("maxStorageBufferBindingSize is raised above the default; a 1.5 GiB buffer is bound whole to fill and reads back its iota, twice bitwise", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/binding-2gib", limits: "raise" });
        try {
            const { maxStorageBufferBindingSize, maxBufferSize } = ctx.caps.limits;
            console.warn(
                `[binding-2gib] ${ctx.caps.vendor}/${ctx.caps.architecture}: maxStorageBufferBindingSize=${maxStorageBufferBindingSize} maxBufferSize=${maxBufferSize}`,
            );
            if (ctx.caps.software) {
                expect(maxStorageBufferBindingSize).toBeGreaterThanOrEqual(DEFAULT_BINDING);
            } else {
                expect(maxStorageBufferBindingSize).toBeGreaterThan(DEFAULT_BINDING);
                expect(maxStorageBufferBindingSize).toBeGreaterThanOrEqual(HARDWARE_BUFFER_BYTES);
            }
            const BUFFER_BYTES = Math.min(HARDWARE_BUFFER_BYTES, maxStorageBufferBindingSize);
            expect(maxBufferSize).toBeGreaterThanOrEqual(BUFFER_BYTES);
            // 1 GiB of iota on hardware (1,048,576 workgroups of 256: a 2D dispatch); the whole binding on a software adapter
            const FILL_WORDS = Math.min(2 ** 28, BUFFER_BYTES / 4);

            const dst = ctx.allocator.createBuffer({
                label: "binding-2gib/dst",
                size: BUFFER_BYTES,
                usage: BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST,
            });
            try {
                await ctx.allocator.check();
                expect(ctx.allocator.resident).toBe(BUFFER_BYTES);
                const plan = plan1d(FILL_WORDS, ctx.workgroupSize, ctx.caps);
                expect(plan.y).toBeGreaterThan(1);
                const params = { block: FILL_PARAMS, values: { count: FILL_WORDS, value: 0, mode: 1 } };
                const binding = bindingOf(dst);
                expect(binding.size).toBe(BUFFER_BYTES);
                const lastOffset = 4 * (FILL_WORDS - SAMPLE);
                const t0 = performance.now();
                await runKernel(ctx, kernelSpec("fill"), { dst: binding }, plan, params);
                const head = await readU32(ctx, dst, SAMPLE);
                const tail = await readU32(ctx, dst, SAMPLE, lastOffset);
                console.warn(`[binding-2gib] fill + readback ${(performance.now() - t0).toFixed(0)} ms`);
                for (let i = 0; i < SAMPLE; i++) {
                    expect(head[i], `word ${i}`).toBe(i);
                    expect(tail[i], `word ${FILL_WORDS - SAMPLE + i}`).toBe(FILL_WORDS - SAMPLE + i);
                }
                await runKernel(ctx, kernelSpec("fill"), { dst: binding }, plan, params);
                expectBitwiseEqual(await readU32(ctx, dst, SAMPLE), head, "second run: head");
                expectBitwiseEqual(await readU32(ctx, dst, SAMPLE, lastOffset), tail, "second run: tail");
            } finally {
                ctx.allocator.destroy(dst);
            }
            expect(ctx.allocator.resident).toBe(0);
        } finally {
            ctx.dispose();
        }
    });
});
