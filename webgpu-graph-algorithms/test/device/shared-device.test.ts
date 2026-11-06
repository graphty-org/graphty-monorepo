/**
 * A device shared with a renderer: GpuContext.from(device, info, { errorSink: false }). The renderer's validation
 * errors are not the layout's, and with no sink the layout's own come from a scope around each submit, so a bad batch
 * rejects its landing and nothing else does.
 */

import { GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { kernelSpec } from "../../src/kernels.js";
import { bindingOf, scratchBuffer } from "../helpers/device.js";
import { acquireRaw, requireGpu } from "../setup/gpu.js";

/** A device nobody listens to but the renderer would, adopted the way a shared layout adopts it. */
async function sharedContext(): Promise<{ ctx: GpuContext; device: GPUDevice; foreignErrors: GPUError[] }> {
    const raw = await acquireRaw();
    const adapter = await raw.gpu.requestAdapter();
    if (adapter === null) {
        throw new Error("no adapter");
    }
    const device = await adapter.requestDevice();
    const foreignErrors: GPUError[] = [];
    device.addEventListener("uncapturederror", (event) => {
        foreignErrors.push(event.error);
    });
    return { ctx: GpuContext.from(device, { runtime: "node" }, { errorSink: false }), device, foreignErrors };
}

/** A validation error of the renderer's: a buffer with no usage at all. */
function rendererError(device: GPUDevice): void {
    device.createBuffer({ label: "test/shared/renderer-error", size: 16, usage: 0 });
}

/** One fill of `dst`, read back, with a UNIFORM slot bound to `params`. */
async function fillBatch(ctx: GpuContext, dst: GPUBuffer, params: GPUBuffer): ReturnType<typeof runBatch> {
    const kernel = await ctx.pipelines.kernel(kernelSpec("fill"));
    const batch = new CommandBatch(ctx, "shared");
    const bound = kernel.bind({
        dst: bindingOf(dst),
        P: { buffer: params, offset: 0, size: 16, window: null },
    });
    kernel.dispatch(batch.pass("fill"), bound, plan1d(16, ctx.workgroupSize, ctx.caps), [0]);
    return runBatch(batch, dst);
}

/** Submits and settles a batch. */
async function runBatch(batch: CommandBatch, dst: GPUBuffer): Promise<{ id: number; outcome: unknown }> {
    batch.readback(dst, 0, 64);
    const submitted = batch.submit();
    const outcome = await submitted.readback.then(
        () => null,
        (error: unknown) => error,
    );
    return { id: submitted.id, outcome };
}

/** A UNIFORM buffer big enough for the fill's parameters. */
function goodParams(ctx: GpuContext): GPUBuffer {
    return ctx.allocator.createBuffer({
        label: "test/shared/params",
        size: 16,
        usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
}

describe("a context on a shared device", () => {
    it("installs no sink: a renderer's error reaches the renderer and no batch", async (t) => {
        requireGpu(t);
        const { ctx, device, foreignErrors } = await sharedContext();
        try {
            const dst = scratchBuffer(ctx, 64, "test/shared/dst");
            const params = goodParams(ctx);

            rendererError(device);
            const { outcome } = await fillBatch(ctx, dst, params);

            expect(outcome).toBeNull();
            expect(foreignErrors).toHaveLength(1);
            expect(ctx.takePendingError()).toBeNull();
        } finally {
            ctx.dispose();
            device.destroy();
        }
    });

    it("rejects the landing of a bad batch, and of no other, on the error scope", async (t) => {
        requireGpu(t);
        const { ctx, device, foreignErrors } = await sharedContext();
        try {
            const dst = scratchBuffer(ctx, 64, "test/shared/dst");
            const wrongUsage = ctx.allocator.createBuffer({
                label: "test/shared/wrong-usage",
                size: 16,
                usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
            });

            const bad = await fillBatch(ctx, dst, wrongUsage);

            expect(isWebGpuGraphError(bad.outcome)).toBe(true);
            if (!isWebGpuGraphError(bad.outcome)) {
                throw new Error("unreachable");
            }
            expect(bad.outcome.code).toBe("E_VALIDATION");
            expect(bad.outcome.details.batchId).toBe(bad.id);
            expect(ctx.readback.borrowed).toBe(0);

            const good = await fillBatch(ctx, dst, goodParams(ctx));
            expect(good.outcome).toBeNull();
            // the one error outside the scope is the bind group's, raised where it was created
            expect(foreignErrors.length).toBeLessThanOrEqual(1);
        } finally {
            ctx.dispose();
            device.destroy();
        }
    });

    it("rejects a batch with no readback on the error scope", async (t) => {
        requireGpu(t);
        const { ctx, device } = await sharedContext();
        try {
            const dst = scratchBuffer(ctx, 64, "test/shared/dst");
            const wrongUsage = ctx.allocator.createBuffer({
                label: "test/shared/wrong-usage",
                size: 16,
                usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
            });
            const kernel = await ctx.pipelines.kernel(kernelSpec("fill"));
            const batch = new CommandBatch(ctx, "no-readback");
            const bound = kernel.bind({
                dst: bindingOf(dst),
                P: { buffer: wrongUsage, offset: 0, size: 16, window: null },
            });
            kernel.dispatch(batch.pass("fill"), bound, plan1d(16, ctx.workgroupSize, ctx.caps), [0]);

            const outcome = await batch.submit().readback.then(
                () => null,
                (error: unknown) => error,
            );

            expect(isWebGpuGraphError(outcome) && outcome.code).toBe("E_VALIDATION");
        } finally {
            ctx.dispose();
            device.destroy();
        }
    });

    it("leaves the device alone on dispose and leaves the scope stack balanced", async (t) => {
        requireGpu(t);
        const { ctx, device } = await sharedContext();
        const dst = scratchBuffer(ctx, 64, "test/shared/dst");
        await fillBatch(ctx, dst, goodParams(ctx));

        ctx.dispose();

        // an empty stack rejects a pop, so a scope left open by a batch would resolve here instead
        await expect(device.popErrorScope()).rejects.toBeDefined();
        device.destroy();
    });
});

describe("GpuContext.from with no options", () => {
    it("keeps its sink: an error on the device fails the next public call", async (t) => {
        requireGpu(t);
        const raw = await acquireRaw();
        const adapter = await raw.gpu.requestAdapter();
        if (adapter === null) {
            throw new Error("no adapter");
        }
        const device = await adapter.requestDevice();
        const ctx = GpuContext.from(device);
        try {
            rendererError(device);
            await device.queue.onSubmittedWorkDone();

            expect(ctx.takePendingError()?.code).toBe("E_VALIDATION");
        } finally {
            ctx.dispose();
            device.destroy();
        }
    });
});
