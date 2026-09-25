/**
 * Closeness centrality on the device (design 8.4, 3.3 line 810, 9.7; P8-T11, the P8 plan's PD-13 / PD-19 / PD-25 /
 * DEP-P8-E / DEP-P8-F): `score[s] = 1 / sumDist_s`, with `sumDist_s` the exact sum of the finite distances from `s`
 * to every OTHER node -- an unreached node adds nothing -- and `0` when nothing is reached. No reached factor and no
 * Wasserman-Faust scaling: this is EXACTLY the legacy default (`normalized: false`) of `closenessCentrality` in
 * `@graphty/algorithms`, the number graphty-element's closeness panel shows today, so a future `indexed` port has one
 * number to match (the NetworkX form is 33x it on karate and could never have been substituted silently).
 *
 * The unweighted route is ONE bit-parallel multi-source search per batch of 32 sources (`ceil(n / 32)` batches):
 * the batch's state is one `bits` buffer of four regions of `bitsBase = roundUp(n, 64)` words (`visited`, two
 * frontier regions that swap by the level's parity, `flags`), bit `s` of word `v` meaning "source `s` has reached /
 * is at / is next at `v`"; a level is, all host-recorded, `closeness-reduce` role 0 (the boundary: `done` from the
 * previous level's compacted count, the level's claims folded into the exact 64-bit per-source sums at `level + 1`),
 * `compact` of the flags into the frontier list, `indirect-finalize` sizing the sweep from the list's count, two
 * `fill`s zeroing the level's next region and the flags (AFTER the compaction that consumed them), and the indirect
 * `closeness-sweep` (the block-mapped expansion with the claim inline). `MAX_LEVELS_PER_SUBMIT` levels per submit and
 * one readback per submit (the `done` word and the 512-byte `perSource` block together, so the finished batch needs
 * no extra map); the host folds `sumHi x 2^32 + sumLo` into `1 / sum` in f64 and stores f32. The weighted route
 * (`weighted` true on a snapshot whose column is not all ones) is one `sssp` per source with the sums reduced on the
 * host between calls: design 8.4's own answer, slow and correct. `weighted` defaults to the snapshot's `flags.weighted`;
 * `weighted: false` on a weighted snapshot ignores the column by request and sweeps; `weighted: true` over unit
 * weights or no column sweeps too (every `sssp` would route to a BFS anyway). `maxIterations` and `tolerance` are the
 * seam's placeholder keys and an exact traversal has neither, so a defined value is REFUSED before any device work
 * (`E_UNSUPPORTED { option }`, the package's rule for an option it does not implement, PD-25); `undefined` is legal.
 * `iterations` reports the source batches run (the sources, on the weighted route), `converged` is always true.
 *
 * Cost, stated so nobody is surprised: closeness is O(n x m) on any device -- at 1M nodes it is 31,250 batches of a
 * full multi-source traversal, minutes on the card, and no target in design 10.4 asks for less. `compact.record`
 * leases its offsets and the scan's block sums afresh on every call, once per LEVEL here, so the planner is given a
 * scope whose `scratch` hands the same buffer back for the same label and size: the dispatches of one pass run in
 * order, a level's scan overwrites the previous level's, and the run holds one set instead of `levels x batches`.
 * The sweep keeps DEP-P8-E's refusal of a windowed core (`assertWholeCore`): the bit-parallel claim needs the whole
 * arc array bound. The tuning entry `closenessWithTuning` (PD-26's shape) is what the tests drive; nothing public
 * exposes it.
 */

import { type F32, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { MAX_LEVELS_PER_SUBMIT } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d } from "../kernel/dispatch.js";
import { INDIRECT_ARGS_STRIDE } from "../kernel/kernel.js";
import {
    FILL_PARAMS,
    FRONTIER_COUNTERS,
    FRONTIER_PARAMS,
    graphBindings,
    graphOverrides,
    INDIRECT_PARAMS,
    kernelSpec,
} from "../kernels.js";
import { prepareCompact } from "../primitives/compact.js";
import { assertWholeCore } from "../primitives/core-shape.js";
import { W } from "../primitives/frontier.js";
import { type ReduceScope } from "../primitives/reduce.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type HitsOptionsLike } from "../types/accelerator.js";
import { type GpuScoresResult } from "../types/algorithms.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { algorithmScope } from "./scope.js";
import { aborted, bindingOf, checkDest, sssp } from "./sssp.js";

const ALGORITHM = "closenessCentrality";

/**
 * Design 8.4: 32 sources per `u32` word, one batch per word.
 * @internal
 */
export const SOURCES_PER_BATCH = 32;

/**
 * The `perSource` block of a batch: `newCount[32]` @0, `reached[32]` @32, `sumLo[32]` @64, `sumHi[32]` @96.
 * @internal
 */
export const PER_SOURCE_WORDS = 4 * SOURCES_PER_BATCH;

/**
 * Params slots of the ring, COUNTED (`UniformRing.reserve` wraps silently): per level `compact`'s records (its scan
 * is at most four levels for any n below 2^32, so at most 8 records) while the boundary, the finalize, the fill and
 * the two sweep records (one per parity) are written once per submit, plus the seed's two records on a batch's first
 * submit (the iota fill flushes in its own submit).
 */
const RING_SLOTS = 8 * MAX_LEVELS_PER_SUBMIT + 16;

/**
 * The knobs the tests need and nothing public offers (PD-26's shape): the submit cadence and the inspect seam.
 * @internal
 */
export interface ClosenessTuning {
    /** Levels recorded per submit on the bit-parallel route (default `MAX_LEVELS_PER_SUBMIT`). */
    readonly levelsPerSubmit?: number | undefined;
    /** The inspect seam: after every BATCH of the bit-parallel route, its first source and a fresh copy of the 128-word `perSource` block as the last submit left it. */
    readonly onBatch?: ((batchStart: number, perSource: U32) => void) | undefined;
}

/**
 * A scope whose `scratch` hands the SAME buffer back for the same label and size (see the file comment).
 * @param scope - the algorithm's scope
 * @returns the reusing scope
 */
function reusingScratch(scope: ReduceScope): ReduceScope {
    const held = new Map<string, GPUBuffer>();
    return {
        ...scope,
        scratch: (byteLength, label) => {
            const key = `${label}/${byteLength}`;
            let buffer = held.get(key);
            if (buffer === undefined) {
                buffer = scope.scratch(byteLength, label);
                held.set(key, buffer);
            }
            return buffer;
        },
    };
}

/**
 * The weighted route: one `sssp` per source, the sums reduced on the host.
 * @param ctx - the context
 * @param s - the snapshot
 * @param scores - the destination
 * @param options - the run options
 * @returns the result
 */
async function weightedRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    scores: F32,
    options: GpuRunOptions | undefined,
): Promise<GpuScoresResult> {
    const n = s.nodeCount;
    for (let source = 0; source < n; source++) {
        if (options?.signal?.aborted) {
            throw aborted(ALGORITHM);
        }
        const { dist } = await sssp(ctx, s, source, { signal: options?.signal });
        let sum = 0;
        for (let v = 0; v < n; v++) {
            const d = dist[v];
            if (v !== source && d !== Infinity) {
                sum += d;
            }
        }
        scores[source] = sum === 0 ? 0 : 1 / sum;
        options?.onProgress?.(source + 1, n);
    }
    return { scores, iterations: n, converged: true, precision: "f32" };
}

/**
 * The bit-parallel route (see the file comment).
 * @param ctx - the context
 * @param s - the snapshot
 * @param scores - the destination
 * @param levelsPerSubmit - the submit cadence
 * @param options - the run options
 * @param tuning - the knobs
 * @returns the result
 */
async function sweepRoute(
    ctx: GpuContext,
    s: GraphSnapshot,
    scores: F32,
    levelsPerSubmit: number,
    options: GpuRunOptions | undefined,
    tuning: ClosenessTuning,
): Promise<GpuScoresResult> {
    const n = s.nodeCount;
    if (n === 0) {
        return { scores, iterations: 0, converged: true, precision: "f32" };
    }
    const core = ctx.residency.core(s);
    assertWholeCore(core, s.arcCount, ctx.caps.limits.maxStorageBufferBindingSize, ALGORITHM);
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const wg = ctx.workgroupSize;
        const bytes = 4 * n;
        // the four regions of the bits buffer, each bitsBase words so its byte offset is 256-aligned and fill and
        // compact can bind one alone: visited 0, the frontier pair 1 and 2, flags 3
        const bitsBase = Math.ceil(n / 64) * 64;
        const regionBytes = 4 * bitsBase;
        const bits = bindingOf(scope.scratch(4 * regionBytes, "bits"), 4 * regionBytes);
        const region = (index: number): Binding => ({
            buffer: bits.buffer,
            offset: index * regionBytes,
            size: regionBytes,
            window: null,
        });
        const flags = region(3);
        const frontierList = bindingOf(scope.scratch(bytes, "frontier-list"), bytes);
        const iota = bindingOf(scope.scratch(bytes, "iota"), bytes);
        const counters = bindingOf(
            scope.scratch(FRONTIER_COUNTERS.byteLength, "counters"),
            FRONTIER_COUNTERS.byteLength,
        );
        const perSourceBytes = 4 * PER_SOURCE_WORDS;
        const perSource = bindingOf(scope.scratch(perSourceBytes, "per-source"), perSourceBytes);
        const args = bindingOf(scope.indirect(INDIRECT_ARGS_STRIDE, "args"), INDIRECT_ARGS_STRIDE);
        await ctx.allocator.check();
        const compact = await prepareCompact(reusingScratch(scope));
        const sweep = await ctx.pipelines.kernel(kernelSpec("closeness-sweep", graphOverrides(core, null)));
        const reduce = await ctx.pipelines.kernel(kernelSpec("closeness-reduce"));
        const finalize = await ctx.pipelines.kernel(kernelSpec("indirect-finalize"));
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const graph = graphBindings(core, null);
        const onePlan = plan1d(1, wg, ctx.caps);
        const regionPlan = plan1d(bitsBase, wg, ctx.caps);
        const recordFill = (pass: GPUComputePassEncoder, dst: Binding, count: number, mode: 0 | 1): void => {
            const params = scope.params(FILL_PARAMS, { count, value: 0, mode, pad0: 0 });
            fill.dispatch(pass, fill.bind({ dst, P: params.binding }), plan1d(count, wg, ctx.caps), [params.offset]);
        };
        const submit = (batch: CommandBatch): ReturnType<CommandBatch["submit"]> => {
            scope.flush();
            return batch.submit();
        };

        // setup: the iota queue compact reads, once per run
        const setup = new CommandBatch(ctx, `${ALGORITHM}/setup`);
        recordFill(setup.pass("fill"), iota, n, 1);
        setup.endPass();
        await submit(setup).readback;
        ctx.assertReady();

        let batches = 0;
        for (let batchStart = 0; batchStart < n; batchStart += SOURCES_PER_BATCH) {
            let level = 0;
            for (let first = true; ; first = false) {
                const batch = new CommandBatch(ctx, `${ALGORITHM}/levels`);
                const pass = batch.pass("closeness");
                if (first) {
                    // the batch's seed: the four regions and the block zeroed, then role 1 (the sources' bits, their
                    // flags, counters[0] = k, level = U32_MAX)
                    recordFill(pass, bits, 4 * bitsBase, 0);
                    recordFill(pass, perSource, PER_SOURCE_WORDS, 0);
                    const seed = scope.params(FRONTIER_PARAMS, { role: 1, n, bitsBase, source: batchStart });
                    reduce.dispatch(pass, reduce.bind({ counters, perSource, bits, P: seed.binding }), onePlan, [
                        seed.offset,
                    ]);
                }
                // the records every level of the submit shares (the ring wraps, so they are written per submit)
                const boundary = scope.params(FRONTIER_PARAMS, { role: 0, n, bitsBase });
                const boundBoundary = reduce.bind({ counters, perSource, bits, P: boundary.binding });
                const indirect = scope.params(INDIRECT_PARAMS, { countIndex: W.frontierCount, wg, slot: 0, pad0: 0 });
                const boundFinalize = finalize.bind({ counters, args, P: indirect.binding });
                const clear = scope.params(FILL_PARAMS, { count: bitsBase, value: 0, mode: 0, pad0: 0 });
                // parity 0 sweeps region 1 into region 2, parity 1 region 2 into region 1: the next region is cleared
                const boundClearNext = [region(2), region(1)].map((dst) => fill.bind({ dst, P: clear.binding }));
                const boundClearFlags = fill.bind({ dst: flags, P: clear.binding });
                const boundSweep = [0, 1].map((mode) => {
                    const params = scope.params(FRONTIER_PARAMS, {
                        wg,
                        n,
                        bitsBase,
                        arcBase: 0,
                        arcEnd: s.arcCount,
                        mode,
                    });
                    return {
                        bound: sweep.bind({ ...graph, frontierList, counters, bits, perSource, P: params.binding }),
                        offset: params.offset,
                    };
                });
                for (let k = 0; k < levelsPerSubmit; k++, level++) {
                    const parity = level % 2;
                    reduce.dispatch(pass, boundBoundary, onePlan, [boundary.offset]);
                    compact.record(pass, {
                        queue: iota,
                        flags,
                        count: n,
                        out: frontierList,
                        outCount: counters,
                        outIndex: W.frontierCount,
                    });
                    finalize.dispatch(pass, boundFinalize, onePlan, [indirect.offset]);
                    fill.dispatch(pass, boundClearNext[parity], regionPlan, [clear.offset]);
                    fill.dispatch(pass, boundClearFlags, regionPlan, [clear.offset]);
                    sweep.dispatchIndirect(pass, boundSweep[parity].bound, args, 0, [boundSweep[parity].offset]);
                }
                batch.endPass();
                const doneRequest = batch.readback(counters.buffer, counters.offset + 4 * W.done, 4);
                const blockRequest = batch.readback(perSource.buffer, perSource.offset, perSourceBytes);
                const submitted = submit(batch);
                const back = await submitted.readback;
                ctx.assertReady();
                if (options?.signal?.aborted) {
                    throw aborted(ALGORITHM, submitted.id);
                }
                if (new Uint32Array(back, doneRequest.offset, 1)[0] !== 0) {
                    const block = new Uint32Array(back, blockRequest.offset, PER_SOURCE_WORDS);
                    const count = Math.min(SOURCES_PER_BATCH, n - batchStart);
                    for (let i = 0; i < count; i++) {
                        const sum = block[3 * SOURCES_PER_BATCH + i] * 2 ** 32 + block[2 * SOURCES_PER_BATCH + i];
                        scores[batchStart + i] = sum === 0 ? 0 : 1 / sum;
                    }
                    tuning.onBatch?.(batchStart, block.slice());
                    break;
                }
                if (level > n + 3) {
                    // a batch claims at most n - 1 levels deep, then one level claims nothing and one is empty
                    throw new WebGpuGraphError(
                        "E_VALIDATION",
                        `${ALGORITHM}: the done flag never rose in ${level} levels of the batch at ${batchStart}`,
                        { label: ALGORITHM, message: `the done flag never rose in ${level} levels` },
                    );
                }
            }
            batches += 1;
            options?.onProgress?.(Math.min(batchStart + SOURCES_PER_BATCH, n), n);
        }
        return { scores, iterations: batches, converged: true, precision: "f32" };
    } finally {
        scope.dispose();
    }
}

/**
 * Closeness with the test knobs of PD-26's shape; `closenessCentrality` is this with an empty tuning.
 * @internal
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - the seam's `HitsOptionsLike` (`weighted` honoured, the other two refused when defined), plus dest / signal / onProgress
 * @param tuning - the knobs
 * @returns the scores, the batches run, `converged: true` and `precision: "f32"`
 */
export async function closenessWithTuning(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (HitsOptionsLike & GpuRunOptions) | undefined,
    tuning: ClosenessTuning,
): Promise<GpuScoresResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    for (const key of ["maxIterations", "tolerance"] as const) {
        if (options?.[key] !== undefined) {
            throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: ${key} has no meaning for an exact traversal`, {
                option: key,
                hint: "closeness is an exact traversal; the option has no meaning here",
            });
        }
    }
    const n = s.nodeCount;
    const levelsPerSubmit = tuning.levelsPerSubmit ?? MAX_LEVELS_PER_SUBMIT;
    if (!Number.isInteger(levelsPerSubmit) || levelsPerSubmit < 1 || levelsPerSubmit > MAX_LEVELS_PER_SUBMIT) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${ALGORITHM}: levelsPerSubmit must be an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            {
                argument: "levelsPerSubmit",
                value: levelsPerSubmit,
                expected: `an integer in [1, ${MAX_LEVELS_PER_SUBMIT}]`,
            },
        );
    }
    const scores = checkDest(ALGORITHM, options?.dest, n) ?? new Float32Array(n);
    const weighted = options?.weighted ?? s.flags.weighted;
    if (options?.signal?.aborted) {
        throw aborted(ALGORITHM);
    }
    if (weighted && s.weights !== null && !s.flags.allWeightsOne) {
        if (!s.flags.nonNegativeWeights) {
            throw new WebGpuGraphError(
                "E_UNSUPPORTED",
                `${ALGORITHM}: a negative weight has no shortest-path distance to sum`,
                {
                    feature: "closenessCentrality.negativeWeights",
                    hint: "pass weighted: false to ignore the column",
                },
            );
        }
        if (!s.flags.finiteWeights) {
            throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: a NaN or infinite weight has no shortest path`, {
                feature: "closenessCentrality.nonFiniteWeights",
            });
        }
        return weightedRoute(ctx, s, scores, options);
    }
    return sweepRoute(ctx, s, scores, levelsPerSubmit, options, tuning);
}

/**
 * Closeness centrality on the device (spec 3.3 line 810, design 8.4, 9.7): `scores[s] = 1 / sumDist_s` over the finite
 * distances from `s` to every other node, `0` when nothing is reached -- the legacy default of `@graphty/algorithms`'
 * `closenessCentrality`, unweighted by one bit-parallel multi-source search per 32 sources, weighted by one `sssp`
 * per source; `weighted` defaults to the snapshot's flag, `maxIterations` / `tolerance` are refused when defined
 * (PD-25). `iterations` is the source batches run and `converged` is always true.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - the seam's `HitsOptionsLike`, plus dest (a Float32Array of length n for `scores`) / signal / onProgress
 * @returns the scores, the batches run, `converged: true` and `precision: "f32"`
 */
export function closenessCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: HitsOptionsLike & GpuRunOptions,
): Promise<GpuScoresResult> {
    return closenessWithTuning(ctx, s, options, {});
}
