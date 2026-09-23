/**
 * The indirect-finalize check (spec 5.4; P4-T1) shared by test/kernel/indirect.test.ts and
 * test/sabotage/indirect.test.ts: the nine counts of INDIRECT_COUNTS uploaded as one `counters` array, one finalize
 * dispatch per slot of a 144-byte args buffer (usage INDIRECT | STORAGE | COPY_SRC | COPY_DST), and the 36 words read
 * back compared bitwise with `planIndirect(count, ctx.workgroupSize, ctx.caps)` -- the host twin of the kernel's
 * arithmetic. The last count is the top of the u32 range: the kernel's ceil must not wrap where `count + wg - 1`
 * would.
 */

import { type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { planIndirect } from "../../src/kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../../src/kernel/kernel.js";
import { UniformRing } from "../../src/kernel/uniform-ring.js";
import { INDIRECT_PARAMS, kernelSpec } from "../../src/kernels.js";
import { type Binding } from "../../src/types/memory.js";
import { bindingOf, readU32, uploadBuffer } from "./device.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";

/** The nine counts: the 1D / 2D boundary of the 16,776,960 rule, the 4M fill count of the indirect-dispatch case, and the largest u32. */
export const INDIRECT_COUNTS: readonly number[] = Object.freeze([
    0,
    1,
    255,
    256,
    257,
    16_776_960,
    16_776_961,
    4_000_000,
    0xffffffff,
]);

/** The 36 words the finalize must write for INDIRECT_COUNTS: (x, y, 1, count) per slot by planIndirect's rule. */
export function expectedIndirectArgs(ctx: GpuContext): U32 {
    const out = new Uint32Array(INDIRECT_COUNTS.length * 4);
    INDIRECT_COUNTS.forEach((count, slot) => {
        const plan = planIndirect(count, ctx.workgroupSize, ctx.caps);
        out.set([plan.x, plan.y, 1, count], 4 * slot);
    });
    return out;
}

/** The buffers of one finalize run: `counters` holding INDIRECT_COUNTS and the zeroed nine-slot `args`. */
interface IndirectBuffers {
    readonly counters: GPUBuffer;
    readonly args: GPUBuffer;
    /** The whole-buffer binding of `args` (what Kernel.dispatchIndirect takes). */
    readonly argsBinding: Binding;
    destroy(): void;
}

/**
 * Creates the two buffers (args with the INDIRECT usage on top of the raw helper's STORAGE | COPY_SRC | COPY_DST).
 * @param ctx - the context
 * @returns the buffers
 */
export function indirectBuffers(ctx: GpuContext): IndirectBuffers {
    const counters = uploadBuffer(ctx, new Uint32Array(INDIRECT_COUNTS), "indirect/counters");
    const args = uploadBuffer(
        ctx,
        new Uint32Array(INDIRECT_COUNTS.length * INDIRECT_ARGS_STRIDE / 4),
        "indirect/args",
        BufferUsage.INDIRECT,
    );
    return {
        counters,
        args,
        argsBinding: bindingOf(args),
        destroy(): void {
            counters.destroy();
            args.destroy();
        },
    };
}

/**
 * Records one finalize dispatch per slot into `pass` (slot k reads `counters[k]` with the context's workgroup size)
 * through a ring the caller flushes before submit.
 * @param ctx - the context
 * @param pass - the open pass
 * @param buffers - the buffers of indirectBuffers()
 * @param ring - a ring with at least INDIRECT_COUNTS.length free slots from `firstSlot`
 * @param firstSlot - the ring slot of the first finalize
 */
export async function recordFinalizes(
    ctx: GpuContext,
    pass: GPUComputePassEncoder,
    buffers: IndirectBuffers,
    ring: UniformRing,
    firstSlot: number,
): Promise<void> {
    const kernel = await ctx.pipelines.kernel(kernelSpec("indirect-finalize"));
    const bound = kernel.bind({
        counters: bindingOf(buffers.counters),
        args: buffers.argsBinding,
        P: ring.binding(INDIRECT_PARAMS),
    });
    for (let slot = 0; slot < INDIRECT_COUNTS.length; slot++) {
        ring.write(firstSlot + slot, INDIRECT_PARAMS, { countIndex: slot, wg: ctx.workgroupSize, slot });
        kernel.dispatch(pass, bound, { x: 1, y: 1, z: 1, items: 1, stride: null }, [ring.offsetOf(firstSlot + slot)]);
    }
}

/**
 * One finalize run over INDIRECT_COUNTS: the 36 args words read back.
 * @param ctx - the context
 * @returns the words
 */
export async function runIndirectFinalize(ctx: GpuContext): Promise<U32> {
    const buffers = indirectBuffers(ctx);
    const ring = new UniformRing(ctx.device, ctx.allocator, INDIRECT_COUNTS.length, "indirect/ring");
    try {
        const batch = new CommandBatch(ctx, "indirect-finalize");
        await recordFinalizes(ctx, batch.pass("finalize"), buffers, ring, 0);
        ring.flush();
        await batch.submit().readback;
        return await readU32(ctx, buffers.args, INDIRECT_COUNTS.length * 4);
    } finally {
        ring.destroy();
        buffers.destroy();
    }
}

/**
 * The bitwise check of one run (spec 11.9 item 1: the sabotage suite asserts the same report fails on a mutant):
 * ratioOf(|a - b|, 0) per word, so any mismatch is Infinity.
 * @param ctx - the context
 * @returns the report
 */
export async function indirectFinalizeReport(ctx: GpuContext): Promise<CheckReport> {
    const got = await runIndirectFinalize(ctx);
    const want = expectedIndirectArgs(ctx);
    const reports: CheckReport[] = [];
    for (let i = 0; i < want.length; i++) {
        reports.push({ worst: ratioOf(Math.abs(got[i] - want[i]), 0), worstLabel: `args[${i}]`, samples: 1 });
    }
    return mergeReports(reports);
}
