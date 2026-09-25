/**
 * The ReduceScope an algorithm driver hands the primitives (contract 3.11), built over a GpuContext: `scratch` comes
 * from ONE Lease (released by `dispose()` in the algorithm's `finally`, spec 4.4) and `params` from a UniformRing
 * slot, so a batch of k iterations writes k parameter blocks into one buffer and dispatches with dynamic offsets
 * instead of allocating a uniform buffer per dispatch (spec 5.3). The src/ twin of the tests' testReduceScope
 * (test/helpers/segmented-reduce.ts). `slots` sizes the ring for the LARGEST batch the caller records: reserve()
 * wraps, so a ring too small silently reuses a slot another dispatch of the same batch still reads.
 */

import { type GpuContext } from "../context.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { UniformRing } from "../kernel/uniform-ring.js";
import { type FrontierScope } from "../primitives/frontier.js";

/** A FrontierScope (a ReduceScope plus `indirect()`, P8-T4) over a context plus the two lifecycle calls an algorithm makes: flush() before submit, dispose() in its finally. */
export interface AlgorithmScope extends FrontierScope {
    /** queue.writeBuffer of the params slots written since the last flush (called before the batch is submitted). */
    flush(): void;
    /** Destroys the ring and releases every scratch buffer of the lease; idempotent. */
    dispose(): void;
    /** The ring's `overruns` so far: reservations that wrapped over a record the batch being recorded still reads (0 on a correctly sized ring; P8-T12). */
    ringOverruns(): number;
}

/**
 * The scope of one algorithm call.
 * @param ctx - the context
 * @param label - the label prefix of the ring and every scratch buffer
 * @param slots - the params slots of the ring: at least the parameter blocks of the largest batch recorded
 * @returns the scope
 */
export function algorithmScope(ctx: GpuContext, label: string, slots: number): AlgorithmScope {
    const lease = ctx.pool.lease();
    const ring = new UniformRing(ctx.device, ctx.allocator, slots, `${label}/ring`);
    return {
        device: ctx.device,
        caps: ctx.caps,
        pipelines: ctx.pipelines,
        pool: ctx.pool,
        workgroupSize: ctx.workgroupSize,
        scratch: (byteLength, scratchLabel) => lease.storage(byteLength, `${label}/${scratchLabel}`),
        indirect: (byteLength, indirectLabel) =>
            lease.acquire(
                byteLength,
                BufferUsage.STORAGE | BufferUsage.INDIRECT | BufferUsage.COPY_DST | BufferUsage.COPY_SRC,
                `${label}/${indirectLabel}`,
            ),
        params(block, values) {
            const slot = ring.reserve(1);
            ring.write(slot, block, values);
            return { binding: ring.binding(block), offset: ring.offsetOf(slot) };
        },
        flush: () => {
            ring.flush();
        },
        dispose(): void {
            ring.destroy();
            lease.release();
        },
        ringOverruns: () => ring.overruns,
    };
}
