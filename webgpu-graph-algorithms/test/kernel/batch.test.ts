/**
 * CommandBatch (contract 3.9, spec 5.7): the pending-error slot is checked right after submit so a bad bind group
 * rejects THIS batch's readback under Dawn-node (synchronous delivery, uncaptured-order-probe.mjs). It leaves a
 * validation error on purpose, so it runs in `node-device-errors`; the rest of CommandBatch is
 * test/kernel/batch-commands.test.ts in the `node` project.
 *
 * The bad-bind-group test needs a context WITHOUT an onError sink (acquire() installs one that collects into the
 * afterEach list), so it creates its own through GpuContext.create({ gpu }) on the worker's Dawn handle and disposes it.
 */

import { GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { isWebGpuGraphError } from "../../src/errors.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { plan1d } from "../../src/kernel/dispatch.js";
import { UniformRing } from "../../src/kernel/uniform-ring.js";
import { FILL_PARAMS, kernelSpec } from "../../src/kernels.js";
import { bindingOf, scratchBuffer } from "../helpers/device.js";
import { acquireRaw, requireGpu } from "../setup/gpu.js";

/** A context whose uncaptured errors land in the pending slot (no onError): the delivery path of spec 5.7. Disposed by the caller. */
async function slotContext(label: string): Promise<GpuContext> {
    const raw = await acquireRaw();
    return GpuContext.create({ gpu: raw.gpu, runtime: "node", label });
}

describe("CommandBatch pending-error slot (spec 5.7)", () => {
    it("a deliberately bad bind group rejects THE SAME batch's readback with E_VALIDATION { batchId, label } under Dawn-node", async (t) => {
        requireGpu(t);
        const ctx = await slotContext("batch-slot");
        try {
            const kernel = await ctx.pipelines.kernel(kernelSpec("fill"));
            const dst = scratchBuffer(ctx, 64, "test/batch/bad-dst");
            // a STORAGE-only buffer in the UNIFORM slot: createBindGroup rejects the usage, Dawn-node delivers the
            // uncapturederror synchronously inside bind(), the context stores it in the pending slot
            const wrongUsage = ctx.allocator.createBuffer({
                label: "test/batch/wrong-usage",
                size: 16,
                usage: BufferUsage.STORAGE | BufferUsage.COPY_DST,
            });
            try {
                const batch = new CommandBatch(ctx, "bad");
                const bound = kernel.bind({
                    dst: bindingOf(dst),
                    P: { buffer: wrongUsage, offset: 0, size: 16, window: null },
                });
                kernel.dispatch(batch.pass("fill"), bound, plan1d(16, ctx.workgroupSize, ctx.caps), [0]);
                batch.readback(dst, 0, 64);
                const submitted = batch.submit();
                const outcome = await submitted.readback.then(
                    () => null,
                    (error: unknown) => error,
                );
                expect(isWebGpuGraphError(outcome)).toBe(true);
                if (!isWebGpuGraphError(outcome)) {
                    throw new Error("unreachable");
                }
                expect(outcome.code).toBe("E_VALIDATION");
                expect(outcome.details.batchId).toBe(submitted.id);
                expect(outcome.details.batchLabel).toBe("bad");
                // the error carries the bind group's `<id>/<group>` label (contract 3.9 Kernel.bind), in `label` or in the message
                expect(`${String(outcome.details.label)} ${String(outcome.details.message)}`).toContain("fill/2");
                expect(typeof outcome.details.message).toBe("string");
                console.warn(
                    `[batch] bad bind group -> E_VALIDATION batchId=${submitted.id} label=${String(outcome.details.label)} message=${String(outcome.details.message).split("\n")[0]} (Dawn-node synchronous delivery)`,
                );
                // delivered exactly once: the slot is empty, the ring slot is back, the context is still usable
                expect(ctx.takePendingError()).toBeNull();
                expect(() => {
                    ctx.assertReady();
                }).not.toThrow();
                expect(ctx.readback.borrowed).toBe(0);
                expect(ctx.state).toBe("ready");

                // the same context runs a correct batch afterwards
                const ring = new UniformRing(ctx.device, ctx.allocator, 1, "test/batch/ring");
                ring.write(0, FILL_PARAMS, { count: 16, value: 3, mode: 0 });
                ring.flush();
                const good = new CommandBatch(ctx, "good");
                kernel.dispatch(
                    good.pass("fill"),
                    kernel.bind({ dst: bindingOf(dst), P: ring.binding(FILL_PARAMS) }),
                    plan1d(16, ctx.workgroupSize, ctx.caps),
                    [0],
                );
                const request = good.readback(dst, 0, 64);
                const bytes = await good.submit().readback;
                expect(Array.from(new Uint32Array(bytes, request.offset, 16))).toEqual(new Array<number>(16).fill(3));
                ring.destroy();
            } finally {
                ctx.allocator.destroy(wrongUsage);
                dst.destroy();
            }
        } finally {
            ctx.dispose();
        }
    });
});
