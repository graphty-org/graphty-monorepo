/**
 * The indirect finalize kernel and Kernel.dispatchIndirect (spec 5.4; P4-T1, PD-2): the finalize writes exactly
 * (planIndirect(c).x, planIndirect(c).y, 1, c) into the 16-byte slot of every count, including the largest u32 (the
 * kernel's ceil must not wrap where `count + wg - 1` would); an indirect dispatch of `fill` over a slot runs exactly
 * that slot's count of items (4M, then 0) in the same pass that wrote the args; a slot beyond the binding and a
 * BoundKernel of another kernel are E_INVALID_ARGUMENT; CommandBatch.dispatches counts the indirect dispatch; and
 * the writer case records the 36 words as the `indirect-finalize` / `counts9` u32 noise fixture.
 */

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { isWebGpuGraphError, type WebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../../src/kernel/kernel.js";
import { UniformRing } from "../../src/kernel/uniform-ring.js";
import { FILL_PARAMS, kernelSpec } from "../../src/kernels.js";
import { bindingOf, readU32, uploadBuffer } from "../helpers/device.js";
import {
    expectedIndirectArgs,
    INDIRECT_COUNTS,
    indirectBuffers,
    recordFinalizes,
    runIndirectFinalize,
} from "../helpers/indirect.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const POISON = 0xdeadbeef;
const FILL_COUNT = 4_000_000;
const FILL_SLOT = INDIRECT_COUNTS.indexOf(FILL_COUNT);
const EMPTY_SLOT = INDIRECT_COUNTS.indexOf(0);

function catchError(fn: () => unknown): WebGpuGraphError {
    try {
        fn();
    } catch (err) {
        if (isWebGpuGraphError(err)) {
            return err;
        }
        throw err;
    }
    throw new Error("expected a WebGpuGraphError");
}

/**
 * The finalizes of every slot, then `fill` mode 1 over a poisoned 4M-word buffer through dispatchIndirect(slot),
 * in ONE pass (spec 5.4: the same-pass write-then-indirect-read); returns the 4M words.
 */
async function fillIndirect(ctx: GpuContext, slot: number): Promise<{ words: Uint32Array; dispatches: number }> {
    const buffers = indirectBuffers(ctx);
    const dst = uploadBuffer(ctx, new Uint32Array(FILL_COUNT).fill(POISON), "indirect/fill-dst");
    const ring = new UniformRing(ctx.device, ctx.allocator, INDIRECT_COUNTS.length + 1, "indirect/fill-ring");
    try {
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const fillBound = fill.bind({ dst: bindingOf(dst), P: ring.binding(FILL_PARAMS) });
        const fillSlot = INDIRECT_COUNTS.length;
        ring.write(fillSlot, FILL_PARAMS, { count: FILL_COUNT, value: 0, mode: 1 });
        const batch = new CommandBatch(ctx, "indirect-fill");
        const pass = batch.pass("finalize-then-fill");
        await recordFinalizes(ctx, pass, buffers, ring, 0);
        fill.dispatchIndirect(pass, fillBound, buffers.argsBinding, slot, [ring.offsetOf(fillSlot)]);
        ring.flush();
        const { dispatches } = batch;
        await batch.submit().readback;
        return { words: await readU32(ctx, dst, FILL_COUNT), dispatches };
    } finally {
        ring.destroy();
        dst.destroy();
        buffers.destroy();
    }
}

describe("indirect-finalize and Kernel.dispatchIndirect (spec 5.4; P4-T1)", () => {
    let shared: GpuContext | null = null;

    async function context(t: TestContext): Promise<GpuContext> {
        requireGpu(t);
        const ctx = shared ?? (await acquire({ label: "indirect" }));
        shared = ctx;
        return ctx;
    }

    it("writes (planIndirect.x, planIndirect.y, 1, count) into the slot of each of the nine counts, the largest u32 included; two runs bitwise equal", async (t) => {
        const ctx = await context(t);
        expect(INDIRECT_COUNTS).toHaveLength(9);
        expect(INDIRECT_COUNTS[8]).toBe(0xffffffff);
        const first = await runIndirectFinalize(ctx);
        const second = await runIndirectFinalize(ctx);
        expectBitwiseEqual(first, second, "second finalize run");
        expect(first).toHaveLength(36);
        const expected = expectedIndirectArgs(ctx);
        expectBitwiseEqual(first, expected, "finalize vs planIndirect");
        expect(Array.from(first.subarray(0, 4))).toEqual([0, 1, 1, 0]);
        if (ctx.workgroupSize === 256) {
            expect(Array.from(first.subarray(24, 28))).toEqual([65_535, 2, 1, 16_776_961]);
            expect(Array.from(first.subarray(32, 36))).toEqual([65_535, 257, 1, 0xffffffff]);
        }
    });

    it("an indirect dispatch runs exactly count items: fill (iota) over 4M poisoned words through slot 7 writes every index and no poison survives; slot 0 (count 0) leaves every poison word", async (t) => {
        const ctx = await context(t);
        expect(FILL_SLOT).toBe(7);
        expect(EMPTY_SLOT).toBe(0);
        const { words } = await fillIndirect(ctx, FILL_SLOT);
        expect(words).toHaveLength(FILL_COUNT);
        let wrong = -1;
        for (let i = 0; i < FILL_COUNT; i++) {
            if (words[i] !== i) {
                wrong = i;
                break;
            }
        }
        expect(wrong, `first wrong word (${wrong >= 0 ? words[wrong] : "-"})`).toBe(-1);

        const empty = await fillIndirect(ctx, EMPTY_SLOT);
        let touched = -1;
        for (let i = 0; i < FILL_COUNT; i++) {
            if (empty.words[i] !== POISON) {
                touched = i;
                break;
            }
        }
        expect(touched, "first word an empty indirect dispatch touched").toBe(-1);
    }, 120_000);

    it("a slot beyond the binding is E_INVALID_ARGUMENT { argument: 'slot' }; a BoundKernel of another kernel is E_INVALID_ARGUMENT { argument: 'bound' }", async (t) => {
        const ctx = await context(t);
        const buffers = indirectBuffers(ctx);
        const ring = new UniformRing(ctx.device, ctx.allocator, 1, "indirect/errors-ring");
        try {
            const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
            const finalize = await ctx.pipelines.kernel(kernelSpec("indirect-finalize"));
            const fillBound = fill.bind({ dst: bindingOf(buffers.counters), P: ring.binding(FILL_PARAMS) });
            const encoder = ctx.device.createCommandEncoder({ label: "indirect/errors" });
            const pass = encoder.beginComputePass({ label: "indirect/errors" });
            const slots = buffers.argsBinding.size / INDIRECT_ARGS_STRIDE;
            expect(slots).toBe(9);
            for (const slot of [slots, -1, 1.5]) {
                const err = catchError(() => fill.dispatchIndirect(pass, fillBound, buffers.argsBinding, slot));
                expect(err.code).toBe("E_INVALID_ARGUMENT");
                expect(err.details.argument).toBe("slot");
            }
            const foreign = catchError(() => finalize.dispatchIndirect(pass, fillBound, buffers.argsBinding, 0));
            expect(foreign.code).toBe("E_INVALID_ARGUMENT");
            expect(foreign.details.argument).toBe("bound");
            const offsets = catchError(() => fill.dispatchIndirect(pass, fillBound, buffers.argsBinding, 0, [0, 0]));
            expect(offsets.details.argument).toBe("dynamicOffsets");
            pass.end();
        } finally {
            ring.destroy();
            buffers.destroy();
        }
    });

    it("CommandBatch.dispatches counts the indirect dispatch", async (t) => {
        const ctx = await context(t);
        const buffers = indirectBuffers(ctx);
        const ring = new UniformRing(ctx.device, ctx.allocator, 1, "indirect/count-ring");
        try {
            const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
            const fillBound = fill.bind({ dst: bindingOf(buffers.counters), P: ring.binding(FILL_PARAMS) });
            ring.write(0, FILL_PARAMS, { count: 0, value: 0, mode: 0 });
            ring.flush();
            const batch = new CommandBatch(ctx, "indirect-count");
            const pass = batch.pass("x");
            expect(batch.dispatches).toBe(0);
            fill.dispatchIndirect(pass, fillBound, buffers.argsBinding, 0, [ring.offsetOf(0)]);
            expect(batch.dispatches).toBe(1);
            // the plain dispatch of an empty plan still records nothing
            fill.dispatch(pass, fillBound, plan1d(0, ctx.workgroupSize, ctx.caps), [ring.offsetOf(0)]);
            expect(batch.dispatches).toBe(1);
            await batch.submit().readback;
        } finally {
            ring.destroy();
            buffers.destroy();
        }
    });

    it("records the counts9 u32 fixture of this adapter (GRAPHTY_NOISE_FLOOR_WRITE=1 only)", async (t) => {
        const ctx = await context(t);
        const args = await runIndirectFinalize(ctx);
        expectBitwiseEqual(args, expectedIndirectArgs(ctx), "finalize vs planIndirect");
        writeNoiseFixture("indirect-finalize", "counts9", adapterClass(ctx.caps), args, "u32");
    });
});
