/**
 * The G4 out-of-memory item (spec 5.7, 11.1; P4-T15): a REAL over-allocation through the context's allocator -- a
 * buffer of exactly maxBufferSize, which is inside the validation limit but beyond what any adapter here can back
 * (1 TiB on the RTX 4070 SUPER under `limits: "raise"`, 4 GiB - 1 on lavapipe: both measured to fail inside the
 * "out-of-memory" scope, `tmp/p4/t15/probe.ts`) -- surfaces from `allocator.check()` as E_OUT_OF_MEMORY with
 * `requested` / `resident` / `label`, the context is still `ready` afterwards, the failure is forgotten by `reset()`,
 * and a small buffer created next works (a fill over it reads back). The plan's `maxBufferSize + 256` is a
 * VALIDATION error (the limit check runs before any allocation) and its 8 GiB request succeeds on the 4070 (Vulkan
 * backs it lazily), so neither is an out-of-memory case on this tree; the exact limit is.
 */

import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { FILL_PARAMS, kernelSpec } from "../../src/kernels.js";
import { bindingOf, readU32 } from "../helpers/device.js";
import { runKernel } from "../helpers/kernel.js";
import { acquire, requireGpu } from "../setup/gpu.js";

/** The words of the small buffer created after the failure. */
const SMALL_WORDS = 1024;

describe("the out-of-memory scope on a real over-allocation (node-limits, spec 5.7)", () => {
    it("a maxBufferSize buffer is E_OUT_OF_MEMORY { requested, resident, label } from check(); the context stays ready and a small buffer works", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "limits/oom-scope", limits: "raise" });
        try {
            const requested = ctx.caps.limits.maxBufferSize;
            const big = ctx.allocator.createBuffer({
                label: "oom-scope/big",
                size: requested,
                usage: BufferUsage.STORAGE,
            });
            let caught: unknown = null;
            try {
                await ctx.allocator.check();
            } catch (err) {
                caught = err;
            }
            ctx.allocator.destroy(big);
            if (!isWebGpuGraphError(caught)) {
                throw new Error(
                    `a ${requested}-byte buffer did not fail inside the out-of-memory scope: ${String(caught)}`,
                );
            }
            console.warn(`[oom-scope] ${ctx.caps.vendor}: ${caught.code} ${caught.message}`);
            expect(caught.code).toBe("E_OUT_OF_MEMORY");
            expect(caught.details).toMatchObject({ requested, resident: 0, label: "oom-scope/big" });
            expect(ctx.allocator.resident).toBe(0);
            expect(ctx.allocator.liveBuffers).toBe(0);
            expect(ctx.state).toBe("ready");
            // check() repeats the failure until reset() forgets it
            await expect(ctx.allocator.check()).rejects.toBe(caught);
            ctx.allocator.reset();
            await ctx.allocator.check();

            const small = ctx.allocator.createBuffer({
                label: "oom-scope/small",
                size: 4 * SMALL_WORDS,
                usage: BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST,
            });
            try {
                await ctx.allocator.check();
                const plan = plan1d(SMALL_WORDS, ctx.workgroupSize, ctx.caps);
                const params = { block: FILL_PARAMS, values: { count: SMALL_WORDS, value: 7, mode: 1 } };
                await runKernel(ctx, kernelSpec("fill"), { dst: bindingOf(small) }, plan, params);
                const words = await readU32(ctx, small, SMALL_WORDS);
                for (let i = 0; i < SMALL_WORDS; i++) {
                    expect(words[i], `word ${i}`).toBe(i + 7);
                }
            } finally {
                ctx.allocator.destroy(small);
            }
            expect(ctx.state).toBe("ready");
        } finally {
            ctx.dispose();
        }
    });
});
