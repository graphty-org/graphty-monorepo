/**
 * The ReduceScope an algorithm driver hands the primitives (contract 3.11), built over a GpuContext: `scratch` comes
 * from ONE Lease (released by `dispose()` in the algorithm's `finally`, spec 4.4) and `params` from a UniformRing
 * slot, so a batch of k iterations writes k parameter blocks into one buffer and dispatches with dynamic offsets
 * instead of allocating a uniform buffer per dispatch (spec 5.3). The src/ twin of the tests' testReduceScope
 * (test/helpers/segmented-reduce.ts). `slots` sizes the ring for the LARGEST batch the caller records: reserve()
 * wraps, so a ring too small silently reuses a slot another dispatch of the same batch still reads.
 */

import { type GpuContext } from "../context.js";
import { UniformRing } from "../kernel/uniform-ring.js";
import { type ReduceScope } from "../primitives/reduce.js";

/** A ReduceScope over a context plus the two lifecycle calls an algorithm makes: flush() before submit, dispose() in its finally. */
export interface AlgorithmScope extends ReduceScope {
    /** queue.writeBuffer of the params slots written since the last flush (called before the batch is submitted). */
    flush(): void;
    /** Destroys the ring and releases every scratch buffer of the lease; idempotent. */
    dispose(): void;
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
    };
}
