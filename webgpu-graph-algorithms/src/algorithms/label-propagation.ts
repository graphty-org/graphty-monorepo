/**
 * Label propagation (design 8.6, 3.3 line 807; the P11 plan's P11-T6) over the simple symmetric graph of the
 * snapshot (`buildSimpleSymmetric`), with the rules of `@graphty/algorithms`' `labelPropagationSynchronous`. Vertex
 * `i` starts with the label `fmix32(i)`, the murmur3 32-bit finalizer of its index: a one-to-one scramble, so comparing
 * two labels compares the priorities the CPU port gives them. Each pass, `group-by-key-row` finds every vertex's
 * weighted mode of its neighbours' labels -- its own label when that ties for the lead, else the lowest on a tie --
 * and `lpa-step` adopts it synchronously, but only in the pass's direction: up to a higher label on even passes (the
 * first is pass 0), down to a lower one on odd passes (cuGraph's swap-avoidance rule), which is what stops two
 * neighbours trading labels forever. A pass that moves nothing in either direction after one that moved nothing in
 * the other is a fixed point, and the run stops there or at `maxIterations` passes.
 *
 * Ranking labels by node index instead ties the outcome to the numbering: on a path numbered in order every interior
 * vertex is tied between its two neighbours, the lowest index wins every tie, and it creeps one vertex per two passes
 * (issue #694). Under the scramble the winners are spread along the chain and a 1,000-node path settles in about ten
 * passes. One difference from the CPU port remains: a run whose labels cycle with period two runs to `maxIterations`
 * here, where the port stops at the first repeat.
 *
 * Passes are recorded LABEL_PROP_PASSES_PER_SUBMIT to a submit with one readback of their move counts, because a
 * readback per pass costs more than the passes on a small graph; the passes after the fixed point inside the last
 * submit change nothing, so the labels are those of the fixed point. The first submit is the graph build's second.
 * The labels are renumbered in first-seen order on the host (`renumberPartition`), as connected components' are.
 *
 * The result is bitwise reproducible on one device and between devices: the grouping is order-independent and every
 * sum is an integer.
 */

import { type GraphSnapshot, renumberPartition, type U32 } from "@graphty/graph-format";

import { LABEL_PROP_PASSES_PER_SUBMIT } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d } from "../kernel/dispatch.js";
import { kernelSpec, LPA_PARAMS } from "../kernels.js";
import { planGroupRows, prepareGroupByKeyRow } from "../primitives/group-by-key.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type GpuLabelResult } from "../types/algorithms.js";
import { type LabelPropagationOptions } from "../types/community.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { labelResult } from "./components.js";
import { algorithmScope } from "./scope.js";
import { assertBindable, assertBuildSorted, buildSimpleSymmetric } from "./simple-symmetric.js";

const ALGORITHM = "labelPropagation";
/** The default pass cap, as in `@graphty/algorithms`' labelPropagation. */
const DEFAULT_MAX_ITERATIONS = 100;
/** Params slots of the largest batch: the graph build's second submit plus one batch of passes. */
const RING_SLOTS = 1024;
/** The one node index whose scrambled label would be INVALID_INDEX, the group-by's empty key. */
const SCRAMBLE_LIMIT = 857_579_651;

/**
 * The murmur3 32-bit finalizer: a one-to-one scramble of a u32, the CPU port's label priority.
 * @param x - a node index
 * @returns its initial label
 */
function fmix32(x: number): number {
    x ^= x >>> 16;
    x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return x >>> 0;
}

/**
 * The inverse of fmix32.
 * @param x - a label
 * @returns the node index it scrambles
 */
function unfmix32(x: number): number {
    x ^= x >>> 16;
    x = Math.imul(x, 0x7ed1b41d);
    x ^= (x >>> 13) ^ (x >>> 26);
    x = Math.imul(x, 0xa5cb9243);
    x ^= x >>> 16;
    return x >>> 0;
}

/**
 * Validates `options.dest` for a label result of `n` elements.
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
        `${ALGORITHM}: dest must be a Uint32Array of length ${n} over an ArrayBuffer`,
        {
            argument: "dest",
            value: `${dest.constructor.name}(${dest.length})`,
            expected: `Uint32Array(${n}) over an ArrayBuffer`,
        },
    );
}

/**
 * The pass cap.
 * @param value - options.maxIterations
 * @returns the cap
 */
function maxIterationsOf(value: number | undefined): number {
    if (value === undefined) {
        return DEFAULT_MAX_ITERATIONS;
    }
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${ALGORITHM}: maxIterations must be a non-negative integer`, {
            argument: "maxIterations",
            value,
            expected: "a non-negative integer",
        });
    }
    return value;
}

/**
 * An upper bound of every vertex's number of distinct neighbours in the simple symmetric graph: its arcs in both
 * directions, which the merge of parallel edges and the drop of self-loops can only shrink.
 * @param s - the snapshot
 * @returns one bound per vertex
 */
function neighbourBound(s: GraphSnapshot): Uint32Array {
    const out = s.outDegree();
    if (!s.directed) {
        return out;
    }
    const inDegree = s.inDegree();
    const bound = new Uint32Array(s.nodeCount);
    for (let v = 0; v < bound.length; v++) {
        bound[v] = out[v] + inDegree[v];
    }
    return bound;
}

/**
 * The labels as a result: every label must be the scramble of a node index (a device bug otherwise), then
 * renumbered first-seen.
 * @param raw - the labels the device produced (overwritten with the node indices they scramble)
 * @param dest - the caller's destination, if any
 * @returns the result
 */
function resultOf(raw: U32, dest: U32 | null): GpuLabelResult {
    const n = raw.length;
    for (let v = 0; v < n; v++) {
        const index = unfmix32(raw[v]);
        if (index >= n) {
            throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: labels[${v}] = ${raw[v]} is not a node's label`, {
                label: `${ALGORITHM}/labels`,
                message: `the device produced a label that scrambles no index in [0, ${n})`,
            });
        }
        raw[v] = index;
    }
    const { labels, count } = renumberPartition(raw, dest ?? undefined);
    return labelResult(labels, count);
}

/**
 * The identity labelling: every vertex its own community.
 * @param n - the node count
 * @param dest - the caller's destination, if any
 * @returns the result
 */
function identityResult(n: number, dest: U32 | null): GpuLabelResult {
    const labels = dest ?? new Uint32Array(n);
    for (let v = 0; v < n; v++) {
        labels[v] = v;
    }
    return labelResult(labels, n);
}

/**
 * Label propagation on the device (see the file header).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (its edge list is uploaded through ctx.residency, or found there)
 * @param options - maxIterations (default 100), weighted (default true), plus dest / signal / onProgress
 * @returns the labels, dense in first-seen order, the community count and groups()
 */
export async function labelPropagation(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: LabelPropagationOptions & GpuRunOptions,
): Promise<GpuLabelResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    const dest = checkDest(options?.dest, n);
    const maxIterations = maxIterationsOf(options?.maxIterations);
    const weighted = options?.weighted !== false;
    if (options?.signal?.aborted) {
        throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted before any work started`, {});
    }
    if (n === 0 || s.edgeCount === 0 || maxIterations === 0) {
        options?.onProgress?.(1, 1);
        return identityResult(n, dest);
    }
    if (n > SCRAMBLE_LIMIT) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${ALGORITHM}: ${n} nodes, above the ${SCRAMBLE_LIMIT} the labels allow`,
            {
                needed: n,
                limit: SCRAMBLE_LIMIT,
                path: "the scrambled labels",
                algorithm: ALGORITHM,
            },
        );
    }
    // the hash region of the workgroup tier is bound whole: refuse a graph it outgrows before any device work
    const plan = planGroupRows(neighbourBound(s));
    assertBindable(ctx, 4 * plan.regionWords, "the group-by hash region", ALGORITHM);
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const build = await buildSimpleSymmetric(ctx, s, scope, weighted, ALGORITHM);
        const { graph } = build;
        if (graph.colIdx === null) {
            // only self-loops: no vertex has a neighbour, so nothing ever moves
            scope.flush();
            const bytes = await build.batch.submit().readback;
            ctx.assertReady();
            assertBuildSorted(bytes, build, ALGORITHM);
            options?.onProgress?.(1, 1);
            return identityResult(n, dest);
        }
        const wg = ctx.workgroupSize;
        const words = (count: number, label: string): Binding => {
            const size = 4 * Math.max(1, count);
            return { buffer: scope.scratch(size, label), offset: 0, size, window: null };
        };
        const rows = words(plan.words.length, "rows");
        const region = words(plan.regionWords, "hashRegion");
        const labelsA = words(n, "labelsA");
        const labelsB = words(n, "labelsB");
        const bestKey = words(n, "bestKey");
        const bestScore = words(n, "bestScore");
        const counters = words(LABEL_PROP_PASSES_PER_SUBMIT, "counters");
        await ctx.allocator.check();
        const { queue } = ctx.device;
        queue.writeBuffer(rows.buffer, 0, plan.words);
        queue.writeBuffer(region.buffer, 0, new Uint32Array(1));
        const groupBy = await prepareGroupByKeyRow(scope);
        const step = await ctx.pipelines.kernel(kernelSpec("lpa-step"));
        const nodePlan = plan1d(n, wg, ctx.caps);
        const initial = new Uint32Array(n);
        for (let v = 0; v < n; v++) {
            initial[v] = fmix32(v);
        }
        queue.writeBuffer(labelsA.buffer, 0, initial);

        let { batch } = build;
        let first = true;
        let cur = labelsA;
        let next = labelsB;
        let done = 0;
        let previousLast = -1;
        for (;;) {
            const k = Math.min(LABEL_PROP_PASSES_PER_SUBMIT, maxIterations - done);
            queue.writeBuffer(counters.buffer, 0, new Uint32Array(k));
            const pass = batch.pass("passes");
            for (let i = 0; i < k; i++) {
                groupBy.record(pass, {
                    rowPtr: graph.rowPtr,
                    colIdx: graph.colIdx,
                    weights: weighted ? graph.weights : null,
                    keyIn: cur,
                    plan,
                    rows,
                    hashRegion: region,
                    bestKey,
                    bestScore,
                });
                const params = scope.params(LPA_PARAMS, {
                    n,
                    direction: (done + i + 1) % 2, // pass 0 moves up, as the CPU port's does
                    counterIndex: i,
                    pad0: 0,
                });
                step.dispatch(
                    pass,
                    step.bind({ labelsIn: cur, bestKey, labelsOut: next, counters, P: params.binding }),
                    nodePlan,
                    [params.offset],
                );
                [cur, next] = [next, cur];
            }
            batch.endPass();
            const movesRequest = batch.readback(counters.buffer, 0, 4 * k);
            const exhaustedRequest = batch.readback(region.buffer, 0, 4);
            scope.flush();
            const submitted = batch.submit();
            const bytes = await submitted.readback;
            ctx.assertReady();
            if (first) {
                assertBuildSorted(bytes, build, ALGORITHM);
                first = false;
            }
            if (new Uint32Array(bytes, exhaustedRequest.offset, 1)[0] !== 0) {
                throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: a hash probe exhausted its bound`, {
                    label: `${ALGORITHM}/group-by-key`,
                    message: "a compare-exchange loop of the workgroup tier ran out of steps",
                });
            }
            const moves = new Uint32Array(bytes, movesRequest.offset, k);
            done += k;
            const lastTwo = k >= 2 ? moves[k - 2] + moves[k - 1] : previousLast + moves[0];
            previousLast = moves[k - 1];
            if (options?.signal?.aborted) {
                throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted`, {
                    batchId: submitted.id,
                });
            }
            options?.onProgress?.(done, maxIterations);
            if (lastTwo === 0 || done >= maxIterations) {
                break;
            }
            batch = new CommandBatch(ctx, `${ALGORITHM}/passes`);
        }
        const raw = new Uint32Array(n);
        await ctx.readback.read(cur.buffer, 4 * n, raw);
        ctx.assertReady();
        return resultOf(raw, dest);
    } finally {
        scope.dispose();
    }
}
