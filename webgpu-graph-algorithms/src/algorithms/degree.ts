/**
 * `degree(ctx, s)` -- the walking-skeleton algorithm, kept public as a diagnostic (spec 3.3, 11.5): the out-degree of
 * every node computed on the device by the row-walking `degree` kernel (4.5) over the resident core of the snapshot,
 * with the group-0 dummy-binding pattern of spec 3.5 (`colIdx` in the `weights` slot when the snapshot is unweighted,
 * `rowPtr` in the `perm` slot because P1-P3 pass no row permutation, so `USE_PERM` is false). The result equals
 * `snapshot.outDegree()`; the point of the kernel is to prove the upload, bind, dispatch and readback path end to end
 * on every adapter (bitwise identical across adapters, spec 11.5), not to be faster than the CPU (the README says
 * so).
 *
 * Contract (3.12): `ctx.assertReady()` first; `nodeCount === 0` returns an empty `Uint32Array` (or `dest`) with no
 * GPU work (spec 5.6: there is no work, which is not a fallback); an already-aborted `signal` is `E_ABORTED` before
 * any work; `dest` must be a `Uint32Array` of length n over an `ArrayBuffer`; `arcCount === 0` skips the dispatch
 * (only `rowPtr` is resident) and the result is zeros; otherwise ONE dispatch over rows [0, n) with `accumulate = 0`
 * (every row is written, so no fill precedes it) -- or, on a windowed core (spec 4.2, PD-8), a `fill` of zeros and
 * one dispatch per window over its rows with `arcBase = w.start`, `arcEnd = w.end`, `accumulate = 1`, so a row split
 * across windows adds its partial counts -- a readback into the result, `onProgress(1, 1)`, and the scratch returned
 * in a finally. Two runs are bitwise identical (spec 11.9 item 4).
 */

import { type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../context.js";
import { BufferUsage } from "../device/webgpu-constants.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type UniformBlock, type UniformValues } from "../kernel/struct-block.js";
import { FILL_PARAMS, graphBindings, graphOverrides, kernelSpec, RANGE_PARAMS } from "../kernels.js";
import { windowBinding } from "../primitives/core-shape.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";

/**
 * Validates `options.dest` for a result of `n` elements.
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @returns the destination as a U32, or null when none was given
 */
function checkDest(dest: Float32Array | Uint32Array | undefined, n: number): U32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Uint32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as U32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `degree: dest must be a Uint32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Uint32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * One pool-acquired uniform buffer holding one params record (a params buffer per dispatch; the caller releases
 * `pooled` in its finally).
 * @param ctx - the context whose pool and queue are used
 * @param pooled - the list the buffer is appended to for release
 * @param block - the uniform block
 * @param values - the record's values
 * @returns the whole-buffer binding
 */
function paramsBinding(ctx: GpuContext, pooled: GPUBuffer[], block: UniformBlock, values: UniformValues): Binding {
    const buffer = ctx.pool.acquire(block.byteLength, BufferUsage.UNIFORM | BufferUsage.COPY_DST, "degree/params");
    pooled.push(buffer);
    const bytes = new ArrayBuffer(block.byteLength);
    block.write(new DataView(bytes), values);
    ctx.device.queue.writeBuffer(buffer, 0, bytes);
    return { buffer, offset: 0, size: block.byteLength, window: null };
}

/**
 * The walking-skeleton kernel, kept public as a diagnostic (spec 3.3): out-degree per node through the row-walking
 * gather with the USE_PERM dummy pattern; equals snapshot.outDegree().
 * @param ctx - the context whose device runs the kernel
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - dest / signal / onProgress (spec 3.3). PLAN DECISION: spelled `?: GpuRunOptions` rather than the
 *   contract's `?: GpuRunOptions | undefined` because the root ESLint rule no-duplicate-type-constituents rejects the
 *   explicit undefined on an optional parameter (the call signature is identical; P1-T3 made the same choice).
 * @returns the out-degree of every node, index-aligned (`dest` itself when given)
 */
export async function degree(ctx: GpuContext, s: GraphSnapshot, options?: GpuRunOptions): Promise<U32> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    const dest = checkDest(options?.dest, n);
    if (options?.signal?.aborted) {
        throw new WebGpuGraphError("E_ABORTED", "degree: the signal was aborted before any work started", {});
    }
    if (n === 0) {
        options?.onProgress?.(1, 1);
        return dest ?? new Uint32Array(0);
    }
    const core = ctx.residency.core(s);
    if (s.arcCount === 0) {
        const zeros = dest ?? new Uint32Array(n);
        zeros.fill(0);
        options?.onProgress?.(1, 1);
        return zeros;
    }
    const byteLength = n * 4;
    const out = ctx.pool.acquire(
        byteLength,
        BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST,
        "degree/out",
    );
    const pooled: GPUBuffer[] = [];
    const params = (block: UniformBlock, values: UniformValues): Binding => paramsBinding(ctx, pooled, block, values);
    try {
        await ctx.allocator.check();
        const kernel = await ctx.pipelines.kernel(kernelSpec("degree", graphOverrides(core, null)));
        const outBinding: Binding = { buffer: out, offset: 0, size: byteLength, window: null };
        const encoder = ctx.device.createCommandEncoder({ label: "degree" });
        const pass = encoder.beginComputePass({ label: "degree" });
        if (core.windows === null) {
            const P = params(RANGE_PARAMS, { start: 0, end: n, arcBase: 0, arcEnd: s.arcCount, accumulate: 0, n });
            const bound = kernel.bind({ ...graphBindings(core, null), out: outBinding, P });
            kernel.dispatch(pass, bound, plan1d(n, ctx.workgroupSize, ctx.caps), [0]);
        } else {
            const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
            const zero = fill.bind({ dst: outBinding, P: params(FILL_PARAMS, { count: n, value: 0, mode: 0 }) });
            fill.dispatch(pass, zero, plan1d(n, ctx.workgroupSize, ctx.caps), [0]);
            for (const w of core.windows) {
                const windowed = {
                    ...core,
                    colIdx: windowBinding(core, "colIdx", w),
                    weights: core.weights === null ? null : windowBinding(core, "weights", w),
                };
                const P = params(RANGE_PARAMS, {
                    start: w.rowFirst,
                    end: w.rowLast + 1,
                    arcBase: w.start,
                    arcEnd: w.end,
                    accumulate: 1,
                    n,
                });
                const bound = kernel.bind({ ...graphBindings(windowed, null), out: outBinding, P });
                kernel.dispatch(pass, bound, plan1d(w.rowLast - w.rowFirst + 1, ctx.workgroupSize, ctx.caps), [0]);
            }
        }
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        ctx.assertReady();
        const result = await ctx.readback.read(out, byteLength, dest ?? undefined);
        ctx.assertReady();
        options?.onProgress?.(1, 1);
        return dest ?? new Uint32Array(result);
    } finally {
        for (const buffer of pooled) {
            ctx.pool.release(buffer);
        }
        ctx.pool.release(out);
    }
}
