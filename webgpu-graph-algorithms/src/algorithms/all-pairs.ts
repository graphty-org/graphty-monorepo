/**
 * All-pairs shortest paths on the device (design 8.7, 3.3 lines 813 and 835, 9.7): blocked Floyd-Warshall over
 * `APSP_TILE x APSP_TILE` tiles of ONE `n x n` f32 matrix. `fill` sets the matrix to `+Infinity`, `apsp-init` writes
 * the arcs (the cheapest of parallel arcs) and the diagonal zero, then `B = ceil(n / APSP_TILE)` rounds each run the
 * three `apsp-fw` phases in order: the pivot block, the pivot row and column, everything else. The whole sweep --
 * `3 B` dispatches -- is recorded into ONE compute pass: WebGPU runs the dispatches of a pass in order and makes each
 * one's writes visible to the next, so nothing is read back until the matrix is done. Above
 * `APSP_MAX_DISPATCHES_PER_SUBMIT` dispatches the sweep is split into further submits and `signal` is checked
 * between them. The result is bitwise reproducible (no atomics, and a cell is only ever written by one lane per
 * dispatch), exact for hop counts, and the minimum of f32 path sums for weights.
 *
 * The ceiling: the matrix is exactly `n * n` (never padded to the tile) and is bound as ONE storage binding, so
 * `n <= floor(sqrt(limit / 4))` with `limit` the smaller of the device's `maxStorageBufferBindingSize` and
 * `maxBufferSize` -- 5,792 nodes at the 128 MiB spec default, 23,170 at Dawn-node's 2 GiB. Above it the call throws
 * `E_TOO_LARGE` naming the node count, the ceiling, the limit it read and `GpuContextOptions.limits` as the way to
 * raise it; the rows are never windowed. Refused before any device work: a negative weight (`E_UNSUPPORTED
 * allPairs.negativeWeights` -- Floyd-Warshall's in-place tile update is race-free only while the diagonal stays 0)
 * and a NaN or infinite one (`allPairs.nonFiniteWeights`). `weighted` defaults to "the snapshot has weights";
 * `weighted: false` on a weighted snapshot computes hop counts. The empty graph returns an empty matrix without a
 * dispatch. `allPairsWithTuning` is what the tests drive; nothing public exposes it.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { APSP_MAX_DISPATCHES_PER_SUBMIT, APSP_TILE, F32_INF_BITS } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, plan2d } from "../kernel/dispatch.js";
import { APSP_PARAMS, FILL_PARAMS, graphBindings, graphOverrides, kernelSpec } from "../kernels.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type ApspOptions, type GpuApspResult } from "../types/all-pairs.js";
import { type GpuRunOptions } from "../types/run.js";
import { algorithmScope } from "./scope.js";
import { aborted, bindingOf, checkDest } from "./sssp.js";

const ALGORITHM = "allPairsShortestPath";

/** The rounds one submit holds by default: three dispatches per round. */
const DEFAULT_ROUNDS_PER_SUBMIT = Math.floor(APSP_MAX_DISPATCHES_PER_SUBMIT / 3);

/**
 * The knobs the tests need and nothing public offers.
 * @internal
 */
export interface AllPairsTuning {
    /** Rounds recorded per submit (default `floor(APSP_MAX_DISPATCHES_PER_SUBMIT / 3)`); 1 submits every round alone. */
    readonly roundsPerSubmit?: number | undefined;
}

/**
 * The largest node count whose `n x n` f32 matrix fits the device (design 8.7): `floor(sqrt(limit / 4))` over the
 * smaller of `maxStorageBufferBindingSize` and `maxBufferSize`, corrected so the float square root can never
 * overshoot by one.
 * @internal
 * @param limits - the device limits
 * @returns the ceiling and the limit that set it
 */
export function allPairsCeiling(limits: Pick<GPUSupportedLimits, "maxStorageBufferBindingSize" | "maxBufferSize">): {
    readonly maxNodes: number;
    readonly limit: number;
    readonly limitName: "maxStorageBufferBindingSize" | "maxBufferSize";
} {
    const binding = limits.maxStorageBufferBindingSize;
    const bufferSize = limits.maxBufferSize;
    const limitName = bufferSize < binding ? "maxBufferSize" : "maxStorageBufferBindingSize";
    const limit = Math.min(binding, bufferSize);
    let maxNodes = Math.floor(Math.sqrt(limit / 4));
    while (4 * maxNodes * maxNodes > limit) {
        maxNodes -= 1;
    }
    while (4 * (maxNodes + 1) * (maxNodes + 1) <= limit) {
        maxNodes += 1;
    }
    return { maxNodes, limit, limitName };
}

/**
 * All-pairs shortest paths with the test knobs; `allPairsShortestPath` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - `weighted`, plus dest (a Float32Array of length n * n) / signal / onProgress (rounds done of `ceil(n / 32)`)
 * @param tuning - the knobs
 * @returns the row-major `n x n` distances and `n`
 */
export async function allPairsWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (ApspOptions & GpuRunOptions) | undefined,
    tuning: AllPairsTuning,
): Promise<GpuApspResult> {
    ctx.assertReady();
    const n = s.nodeCount;
    const roundsPerSubmit = tuning.roundsPerSubmit ?? DEFAULT_ROUNDS_PER_SUBMIT;
    if (!Number.isInteger(roundsPerSubmit) || roundsPerSubmit < 1 || roundsPerSubmit > DEFAULT_ROUNDS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: roundsPerSubmit must be an integer in [1, ${DEFAULT_ROUNDS_PER_SUBMIT}]`,
            {
                argument: "roundsPerSubmit",
                value: roundsPerSubmit,
                expected: `an integer in [1, ${DEFAULT_ROUNDS_PER_SUBMIT}]`,
            },
        );
    }
    const { maxNodes, limit, limitName } = allPairsCeiling(ctx.caps.limits);
    if (n > maxNodes) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: ${n} nodes need a ${4 * n * n}-byte distance matrix in one storage binding; this device's ${limitName} of ${limit} bytes holds at most ${maxNodes} nodes -- raise it through GpuContextOptions.limits`,
            {
                needed: 4 * n * n,
                limit,
                path: "allPairs.matrix",
                algorithm: ALGORITHM,
                nodes: n,
                maxNodes,
                limitName,
                hint: `raise ${limitName} through GpuContextOptions.limits`,
            },
        );
    }
    const dist = checkDest(ALGORITHM, options?.dest, n * n) ?? new Float32Array(n * n);
    const weighted = (options?.weighted ?? s.weights !== null) && s.weights !== null && !s.flags.allWeightsOne;
    if (weighted && !s.flags.nonNegativeWeights) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a negative weight is not supported`, {
            feature: "allPairs.negativeWeights",
            hint: "the blocked Floyd-Warshall sweep needs non-negative weights; pass weighted: false for hop counts",
        });
    }
    if (weighted && !s.flags.finiteWeights) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a NaN or infinite weight has no shortest path`, {
            feature: "allPairs.nonFiniteWeights",
        });
    }
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (n === 0) {
        return { dist, n };
    }
    await assertDeviceComputes(ctx);
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    const blocks = Math.ceil(n / APSP_TILE);
    const scope = algorithmScope(ctx, ALGORITHM, Math.min(roundsPerSubmit, blocks) + 2);
    try {
        const wg = ctx.workgroupSize;
        const bytes = 4 * n * n;
        const matrix = bindingOf(scope.scratch(bytes, "dist"), bytes);
        await ctx.allocator.check();
        const weightsBinding = weighted ? undefined : null;
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const init = await ctx.pipelines.kernel(kernelSpec("apsp-init", graphOverrides(core, null, weightsBinding)));
        const phases = await Promise.all(
            [0, 1, 2].map((phase) => ctx.pipelines.kernel(kernelSpec("apsp-fw", { PHASE: phase }))),
        );
        const graph = graphBindings(core, null, weightsBinding);
        const others = blocks - 1;
        const phasePlans = [plan2d(1, ctx.caps), plan2d(2 * others, ctx.caps), plan2d(others * others, ctx.caps)];

        for (let first = 0; first < blocks; first += roundsPerSubmit) {
            const batch = new CommandBatch(ctx, `${ALGORITHM}/sweep`);
            const pass = batch.pass("apsp");
            if (first === 0) {
                const fillParams = scope.params(FILL_PARAMS, { count: n * n, value: F32_INF_BITS, mode: 0, pad0: 0 });
                fill.dispatch(pass, fill.bind({ dst: matrix, P: fillParams.binding }), plan1d(n * n, wg, ctx.caps), [
                    fillParams.offset,
                ]);
                const initParams = scope.params(APSP_PARAMS, { n, round: 0, blocks, infBits: F32_INF_BITS });
                init.dispatch(
                    pass,
                    init.bind({ ...graph, dist: matrix, P: initParams.binding }),
                    plan1d(n, wg, ctx.caps),
                    [initParams.offset],
                );
            }
            const last = Math.min(first + roundsPerSubmit, blocks);
            for (let round = first; round < last; round++) {
                const params = scope.params(APSP_PARAMS, { n, round, blocks, infBits: F32_INF_BITS });
                for (let phase = 0; phase < 3; phase++) {
                    const kernel = phases[phase];
                    kernel.dispatch(pass, kernel.bind({ dist: matrix, P: params.binding }), phasePlans[phase], [
                        params.offset,
                    ]);
                }
            }
            batch.endPass();
            scope.flush();
            const submitted = batch.submit();
            await submitted.readback;
            ctx.assertReady();
            options?.onProgress?.(last, blocks);
            if (options?.signal?.aborted) {
                throw aborted(ALGORITHM, submitted.id);
            }
        }
        await ctx.readback.read(matrix.buffer, bytes, dist);
        ctx.assertReady();
        return { dist, n };
    } finally {
        scope.dispose();
    }
}

/**
 * All-pairs shortest paths on the device (design 8.7, 3.3 line 813): blocked Floyd-Warshall over 32 x 32 tiles of one
 * `n x n` f32 matrix. `dist[i * n + j]` is the distance from `i` to `j`, `+Infinity` when unreachable, `0` on the
 * diagonal. `E_TOO_LARGE` above `floor(sqrt(maxStorageBufferBindingSize / 4))` nodes (5,792 at the default limits);
 * `E_UNSUPPORTED` for a negative or non-finite weight unless `weighted: false`.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - `weighted` (default: the snapshot has weights), plus dest (a Float32Array of length n * n) / signal / onProgress
 * @returns the row-major `n x n` distances and `n`
 */
export function allPairsShortestPath(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: ApspOptions & GpuRunOptions,
): Promise<GpuApspResult> {
    return allPairsWithTuning(ctx, s, options, {});
}
