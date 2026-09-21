/**
 * PageRank and personalized PageRank on the device (spec 8.2, 3.3): a pull over the reverse adjacency with the
 * out-weight normaliser folded into `xNorm` by `pr-scale`, the dangling mass and the L1 delta folded by
 * `pr-finalize` into the header at `partials[0]`, and `spmv-pull` writing the next iterate. Iterations run in
 * batches of PR_BATCH per submit, ONE readback per batch (the header and the iterate together), and the device
 * records `firstConverged` the first time the delta falls below `tolerance * n`, so the reported `iterations` is the
 * first converged iteration and not the batch boundary (spec 9.7).
 *
 * PLAN DECISION PD-7: the ping-pong is TWO buffers (`rankA`, `rankB`) alternated through two cached bind groups;
 * one buffer of two aliased halves would bind (each kernel sees the halves in one access mode) but saves nothing.
 * PLAN DECISION PD-8: `outWeightSum` is call scratch from the Lease, one `segmentedReduce` pass per call.
 * PLAN DECISION PD-9: `pr-scale` at iteration i reads x(i-1) and x(i-2), so its delta is the error of iteration
 * i - 1 and `pr-finalize` records `P.iteration - 1`; the ping-pong supplies `rankPrev` for free because it is the
 * buffer this iteration overwrites, and `pr-scale` runs before `spmv-pull` in the same pass.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { groupsOf, plan1d } from "../kernel/dispatch.js";
import { kernelSpec, PR_PARAMS, PR_PARTIAL } from "../kernels.js";
import { type ArrayBinding, type CoreBinding } from "../memory/residency.js";
import { assertWholeCore, coreOfView } from "../primitives/core-shape.js";
import { prepareSegmentedReduce } from "../primitives/segmented-reduce.js";
import { prepareSpmvPull } from "../primitives/spmv.js";
import { type GpuPageRankResult, type PageRankOptions } from "../types/algorithms.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { algorithmScope } from "./scope.js";

/** Iterations per submit (spec 8.2: k = 8). */
const PR_BATCH = 8;
/** Params slots of one batch: per iteration one PrParams (shared by pr-scale and pr-finalize) and one SpmvParams, plus the normaliser's RangeParams; a smaller ring wraps onto a slot the same batch still reads. */
const RING_SLOTS = 2 * PR_BATCH + 1;

/**
 * Validates `options.dest` for a score result of `n` elements.
 * @param dest - the caller's destination array, if any
 * @param n - the node count
 * @param algorithm - the caller's name, for the message
 * @returns the destination as an F32, or null when none was given
 */
function checkDest(dest: Float32Array | Uint32Array | undefined, n: number, algorithm: string): F32 | null {
    if (dest === undefined) {
        return null;
    }
    if (dest instanceof Float32Array && dest.length === n && dest.buffer instanceof ArrayBuffer) {
        return dest as F32;
    }
    throw new WebGpuGraphError(
        "E_INVALID_ARGUMENT",
        `${algorithm}: dest must be a Float32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Float32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * The resident core; a windowed plan is refused with `E_TOO_LARGE { path: "windowed", algorithm }` (spec 3.8, 3.12;
 * DEP-P4-B: only degree and segmentedReduce execute windows).
 * @param ctx - the context
 * @param s - the snapshot
 * @param algorithm - the caller's name
 * @returns the core binding
 */
function coreOf(ctx: GpuContext, s: GraphSnapshot, algorithm: string): CoreBinding {
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, algorithm);
    return core;
}

/**
 * Whole-buffer binding of a scratch buffer over its first `size` bytes.
 * @param buffer - the buffer
 * @param size - the bound byte length
 * @returns the binding
 */
function bindingOf(buffer: GPUBuffer, size: number): Binding {
    return { buffer, offset: 0, size, window: null };
}

/**
 * The E_ABORTED error of a signal.
 * @param algorithm - the caller's name
 * @param batchId - the last submitted batch, when one exists
 * @returns the error
 */
function aborted(algorithm: string, batchId?: number): WebGpuGraphError {
    return new WebGpuGraphError(
        "E_ABORTED",
        `${algorithm}: the signal was aborted`,
        batchId === undefined ? {} : { batchId },
    );
}

/**
 * The shared driver: `personalization` is the normalised vector of personalizedPageRank or null for the uniform
 * 1 / n of pageRank.
 * @param ctx - the context
 * @param s - the snapshot
 * @param personalization - the normalised personalization (sum 1), or null
 * @param options - the PageRank and run options
 * @param algorithm - the public name, for messages and labels
 * @returns the result
 */
async function run(
    ctx: GpuContext,
    s: GraphSnapshot,
    personalization: F32 | null,
    options: (PageRankOptions & GpuRunOptions) | undefined,
    algorithm: string,
): Promise<GpuPageRankResult> {
    ctx.assertReady();
    const n = s.nodeCount;
    const alpha = options?.dampingFactor ?? 0.85;
    const maxIterations = options?.maxIterations ?? 100;
    const tolerance = options?.tolerance ?? 1e-6;
    const useWeights = options?.weighted !== false;
    if (!Number.isInteger(maxIterations) || maxIterations < 1) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${algorithm}: maxIterations must be a positive integer`, {
            argument: "maxIterations",
            value: maxIterations,
            expected: "a positive integer",
        });
    }
    const dest = checkDest(options?.dest, n, algorithm);
    if (options?.signal?.aborted) {
        throw aborted(algorithm);
    }
    if (n === 0) {
        options?.onProgress?.(maxIterations, maxIterations);
        return {
            scores: dest ?? new Float32Array(0),
            iterations: 0,
            converged: true,
            danglingMass: 0,
            precision: "f32",
        };
    }
    const core = coreOf(ctx, s, algorithm);
    if (s.arcCount === 0) {
        // every node is dangling: the whole mass is redistributed by pv each iteration, so pv is the fixed point
        const scores = dest ?? new Float32Array(n);
        if (personalization === null) {
            scores.fill(1 / n);
        } else {
            scores.set(personalization);
        }
        options?.onProgress?.(maxIterations, maxIterations);
        return { scores, iterations: 0, converged: true, danglingMass: 1, precision: "f32" };
    }
    const view = ctx.residency.view(s, "reverse");
    const rev = coreOfView(view, view.scalars.arcCount[0]);
    // weighted: false runs the unweighted algorithm on BOTH sides: the normaliser sums 1 per arc and the pull folds 1
    const weights: Binding | null | undefined = useWeights ? undefined : null;
    const weightedCore: CoreBinding = useWeights ? core : { ...core, weights: null, hasWeights: false };
    const weightedRev: CoreBinding = useWeights ? rev : { ...rev, weights: null, hasWeights: false };
    const scope = algorithmScope(ctx, algorithm, RING_SLOTS);
    let uploaded: ArrayBinding | null = null;
    try {
        const bytes = 4 * n;
        const rankA = scope.scratch(bytes, "rankA");
        const rankB = scope.scratch(bytes, "rankB");
        const xNorm = scope.scratch(bytes, "xNorm");
        const outWeightSum = scope.scratch(bytes, "outWeightSum");
        const scalePlan = plan1d(n, ctx.workgroupSize, ctx.caps);
        const groups = groupsOf(scalePlan);
        const partialsBytes = PR_PARTIAL.byteLength * (1 + groups);
        const partials = scope.scratch(partialsBytes, "partials");
        if (personalization !== null) {
            uploaded = ctx.residency.array(personalization, `${algorithm}/personalization`);
        }
        await ctx.allocator.check();
        const normaliser = await prepareSegmentedReduce(scope, weightedCore, {
            op: "sum",
            valueSnippet: "v = weight;",
            tiers: null,
        });
        const pull = await prepareSpmvPull(scope, weightedRev, {
            personalization: personalization !== null,
            dangling: true,
            weights,
            tiers: null,
        });
        const scale = await ctx.pipelines.kernel(kernelSpec("pr-scale", { NORM_MODE: 0 }));
        const finalize = await ctx.pipelines.kernel(kernelSpec("pr-finalize", { NORM_MODE: 0 }));
        const finalizePlan = plan1d(1, ctx.workgroupSize, ctx.caps);
        const { queue } = ctx.device;
        queue.writeBuffer(rankA, 0, new Float32Array(n).fill(1 / n));
        queue.writeBuffer(rankB, 0, new Float32Array(n));
        const header = new ArrayBuffer(PR_PARTIAL.byteLength);
        PR_PARTIAL.write(new DataView(header), { firstConverged: U32_MAX, iteration: 0 });
        queue.writeBuffer(partials, 0, header);
        const rank = [bindingOf(rankA, bytes), bindingOf(rankB, bytes)];
        const xNormBinding = bindingOf(xNorm, bytes);
        const outWeightSumBinding = bindingOf(outWeightSum, bytes);
        const partialsBinding = bindingOf(partials, partialsBytes);
        const coefficients = { alpha, beta: 1 - alpha, uniformP: 1 / n };
        let cur = 0;
        let iterationsRun = 0;
        for (;;) {
            const k = Math.min(PR_BATCH, maxIterations - iterationsRun);
            const batch = new CommandBatch(ctx, algorithm);
            const pass = batch.pass("iterations");
            if (iterationsRun === 0) {
                normaliser.record(pass, weightedCore, outWeightSumBinding);
            }
            for (let i = 0; i < k; i++) {
                const params = scope.params(PR_PARAMS, {
                    n,
                    groups,
                    iteration: iterationsRun + i + 1,
                    trackConvergence: 1,
                    convergeThreshold: tolerance * n,
                });
                const other = 1 - cur;
                const scaleBound = scale.bind({
                    rankIn: rank[cur],
                    rankPrev: rank[other],
                    outWeightSum: outWeightSumBinding,
                    xNorm: xNormBinding,
                    partials: partialsBinding,
                    P: params.binding,
                });
                scale.dispatch(pass, scaleBound, scalePlan, [params.offset]);
                const finalizeBound = finalize.bind({ partials: partialsBinding, P: params.binding });
                finalize.dispatch(pass, finalizeBound, finalizePlan, [params.offset]);
                pull.record(
                    pass,
                    weightedRev,
                    {
                        xNorm: xNormBinding,
                        rankOut: rank[other],
                        personalization: uploaded?.binding ?? null,
                        partials: partialsBinding,
                    },
                    coefficients,
                );
                cur = other;
            }
            batch.endPass();
            const headerRequest = batch.readback(partials, 0, PR_PARTIAL.byteLength);
            const scoresRequest = batch.readback(rank[cur].buffer, 0, bytes);
            scope.flush();
            const submitted = batch.submit();
            const back = await submitted.readback;
            iterationsRun += k;
            ctx.assertReady();
            if (options?.signal?.aborted) {
                throw aborted(algorithm, submitted.id);
            }
            options?.onProgress?.(iterationsRun, maxIterations);
            const folded = PR_PARTIAL.read(new DataView(back), headerRequest.offset);
            const firstConverged = folded.firstConverged as number;
            const converged = firstConverged !== U32_MAX;
            if (converged || iterationsRun >= maxIterations) {
                const scores = dest ?? new Float32Array(n);
                scores.set(new Float32Array(back, scoresRequest.offset, n));
                if (converged && iterationsRun < maxIterations) {
                    options?.onProgress?.(maxIterations, maxIterations);
                }
                return {
                    scores,
                    iterations: converged ? firstConverged : iterationsRun,
                    converged,
                    danglingMass: folded.danglingMass as number,
                    precision: "f32",
                };
            }
        }
    } finally {
        uploaded?.destroy();
        scope.dispose();
    }
}

/**
 * PageRank on the device (spec 3.3, 8.2): NetworkX semantics, f32 scores, `iterations` the first converged
 * iteration (spec 9.7).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - dampingFactor 0.85 / maxIterations 100 / tolerance 1e-6 / weighted true, plus dest / signal / onProgress
 * @returns the scores, iterations, converged, danglingMass and precision
 */
export function pageRank(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: PageRankOptions & GpuRunOptions,
): Promise<GpuPageRankResult> {
    return run(ctx, s, null, options, "pageRank");
}

/**
 * Personalized PageRank on the device (spec 3.3, 8.2): the personalization vector replaces the uniform 1 / n in
 * the teleport and the dangling redistribution; it is normalised to sum 1 on the host.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param personalization - one finite non-negative mass per node, not all zero
 * @param options - dampingFactor 0.85 / maxIterations 100 / tolerance 1e-6 / weighted true, plus dest / signal / onProgress
 * @returns the scores, iterations, converged, danglingMass and precision
 */
export async function personalizedPageRank(
    ctx: GpuContext,
    s: GraphSnapshot,
    personalization: F32,
    options?: PageRankOptions & GpuRunOptions,
): Promise<GpuPageRankResult> {
    const n = s.nodeCount;
    const invalid = (value: unknown, expected: string): WebGpuGraphError =>
        new WebGpuGraphError("E_INVALID_ARGUMENT", `personalizedPageRank: personalization must be ${expected}`, {
            argument: "personalization",
            value,
            expected,
        });
    if (!(personalization instanceof Float32Array) || personalization.length !== n) {
        throw invalid(
            `${personalization.constructor.name}(${personalization.length})`,
            `a Float32Array of length ${n}`,
        );
    }
    let total = 0;
    for (let v = 0; v < n; v++) {
        const mass = personalization[v];
        if (!Number.isFinite(mass) || mass < 0) {
            throw invalid(mass, "finite and non-negative in every entry");
        }
        total += mass;
    }
    if (n > 0 && !(total > 0)) {
        throw invalid(total, "a vector whose entries sum to a positive number");
    }
    const normalised = new Float32Array(n);
    for (let v = 0; v < n; v++) {
        normalised[v] = personalization[v] / total;
    }
    return run(ctx, s, normalised, options, "personalizedPageRank");
}
