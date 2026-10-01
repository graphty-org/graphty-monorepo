/**
 * Triangle counting with the local clustering coefficient and the transitivity (design 8.5, 3.3 line 806, design 17
 * line 5067; the P11 plan's P11-T8). Over the simple symmetric graph of the snapshot (`buildSimpleSymmetric`, so a
 * directed snapshot, parallel edges and self-loops all give the answer of the underlying simple undirected graph):
 *
 * 1. `orient-flags` keeps arc (u, v) when v is above u in the (degree, id) order, one arc per undirected edge;
 * 2. two `compact`s keep the oriented arcs' sources and targets -- in order, so the oriented rows stay sorted -- and
 *    `cooToCsr` in its sorted-input mode builds the oriented rows (there are exactly `arcs / 2` of them, so no count
 *    is read back);
 * 3. `tri-intersect` intersects the two oriented rows of every oriented arc and adds each triangle to the counts of
 *    its three vertices with u32 atomics -- exact, and independent of the schedule.
 *
 * All of it rides in the build's second submit, so a call is two synchronisations whatever the graph.
 *
 * PLAN DECISION (the P11 plan's DEP-P11-C): the coefficient and the transitivity are computed on the host from the
 * per-node counts and the simple graph's `rowPtr`, both read back in the same submit, not by a `tri-coefficient`
 * kernel. f32 division on the device is not correctly rounded (2.5 ULP on the reference card), and the transitivity's
 * denominator -- the sum of `d (d - 1) / 2` -- overflows a u32 at a single node of degree 92,682; in f64 on the host
 * both are exact to the f32 the result stores, and the `rowPtr` read costs the same bytes as the coefficient array a
 * device epilogue would have read back instead.
 */

import { type F32, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { COO_PARAMS, FILL_PARAMS, kernelSpec } from "../kernels.js";
import { prepareCompact } from "../primitives/compact.js";
import { prepareCooToCsr } from "../primitives/coo-to-csr.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuTriangleResult } from "../types/structure.js";
import { algorithmScope } from "./scope.js";
import { assertBuildSorted, buildSimpleSymmetric } from "./simple-symmetric.js";

const ALGORITHM = "triangleCount";
/** Params slots of the largest batch: the build's two sorts and scans plus the orientation's compactions and build. */
const RING_SLOTS = 1024;

/**
 * Validates `options.dest` for the per-node counts.
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
 * The coefficient, the total and the transitivity from the per-node counts and the simple graph's rows, in f64.
 * @param perNode - the triangles of every node
 * @param rowPtr - the simple graph's `n + 1` row offsets
 * @returns the result
 */
function epilogue(perNode: U32, rowPtr: Uint32Array): GpuTriangleResult {
    const n = perNode.length;
    const coefficient: F32 = new Float32Array(n);
    let sum = 0;
    let triples = 0;
    for (let v = 0; v < n; v++) {
        const d = rowPtr[v + 1] - rowPtr[v];
        const t = perNode[v];
        sum += t;
        if (d >= 2) {
            const pairs = (d * (d - 1)) / 2;
            triples += pairs;
            coefficient[v] = t / pairs;
        }
    }
    return { perNode, total: sum / 3, coefficient, transitivity: triples === 0 ? 0 : sum / triples };
}

/**
 * Counts the triangles of the simple undirected graph underlying `s` on the device (see the file header).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (its edge list is uploaded through ctx.residency, or found there)
 * @param options - dest (the per-node counts), signal, onProgress
 * @returns the per-node counts, the total, the clustering coefficients and the transitivity
 */
export async function triangleCount(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: GpuRunOptions,
): Promise<GpuTriangleResult> {
    return await triangleCountWithSearch(ctx, s, 0, options);
}

/**
 * `triangleCount` with the intersection path forced (the tier-agreement tests' seam): 0 chooses per arc, 1 always
 * merges, 2 always binary-searches.
 * @internal
 * @param ctx - the context
 * @param s - the snapshot
 * @param search - the `SEARCH` override of `tri-intersect`
 * @param options - dest, signal, onProgress
 * @returns the result
 */
export async function triangleCountWithSearch(
    ctx: GpuContext,
    s: GraphSnapshot,
    search: 0 | 1 | 2,
    options?: GpuRunOptions,
): Promise<GpuTriangleResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    const n = s.nodeCount;
    const dest = checkDest(options?.dest, n);
    if (options?.signal?.aborted) {
        throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted before any work started`, {});
    }
    if (n === 0) {
        options?.onProgress?.(1, 1);
        return epilogue(dest ?? new Uint32Array(0), new Uint32Array(1));
    }
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const build = await buildSimpleSymmetric(ctx, s, scope, false, ALGORITHM);
        const { graph, batch } = build;
        const wg = ctx.workgroupSize;
        const countsBytes = 4 * n;
        const counts: Binding = {
            buffer: scope.scratch(countsBytes, "counts"),
            offset: 0,
            size: countsBytes,
            window: null,
        };
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const pass = batch.pass("triangles");
        let orientedFlag: Binding | null = null;
        const zero = scope.params(FILL_PARAMS, { count: n, value: 0, mode: 0, pad0: 0 });
        fill.dispatch(pass, fill.bind({ dst: counts, P: zero.binding }), plan1d(n, wg, ctx.caps), [zero.offset]);
        if (graph.arcCount > 0 && graph.colIdx !== null && graph.src !== null) {
            const oriented = graph.arcCount / 2;
            const orient = await ctx.pipelines.kernel(kernelSpec("orient-flags"));
            const intersect = await ctx.pipelines.kernel(kernelSpec("tri-intersect", { SEARCH: search }));
            const compact = await prepareCompact(scope);
            const cooToCsr = await prepareCooToCsr(scope);
            const words = (count: number, label: string): Binding => ({
                buffer: scope.scratch(4 * count, label),
                offset: 0,
                size: 4 * count,
                window: null,
            });
            const flags = words(graph.arcCount, "orient/flags");
            const oSrc = words(graph.arcCount, "orient/src");
            const oDst = words(graph.arcCount, "orient/dst");
            const oRowPtr = words(n + 1, "orient/rowPtr");
            const oColIdx = words(oriented, "orient/colIdx");
            const scratch = words(1, "orient/count");
            const oFlag = words(1, "orient/flag");
            const arcPlan = plan1d(graph.arcCount, wg, ctx.caps);
            const p1 = scope.params(COO_PARAMS, { count: graph.arcCount, pad0: 0, pad1: 0, pad2: 0 });
            orient.dispatch(
                pass,
                orient.bind({ rowPtr: graph.rowPtr, colIdx: graph.colIdx, src: graph.src, flags, P: p1.binding }),
                arcPlan,
                [p1.offset],
            );
            compact.record(pass, {
                queue: graph.src,
                flags,
                count: graph.arcCount,
                out: oSrc,
                outCount: scratch,
                outIndex: 0,
            });
            compact.record(pass, {
                queue: graph.colIdx,
                flags,
                count: graph.arcCount,
                out: oDst,
                outCount: scratch,
                outIndex: 0,
            });
            cooToCsr.record(pass, {
                src: oSrc,
                dst: oDst,
                weights: null,
                count: oriented,
                n,
                sortedInput: true,
                out: { rowPtr: oRowPtr, colIdx: oColIdx, weights: null, flag: oFlag },
            });
            orientedFlag = oFlag;
            const p2 = scope.params(COO_PARAMS, { count: oriented, pad0: 0, pad1: 0, pad2: 0 });
            intersect.dispatch(
                pass,
                intersect.bind({ rowPtr: oRowPtr, colIdx: oColIdx, src: oSrc, counts, P: p2.binding }),
                plan1d(oriented, wg, ctx.caps),
                [p2.offset],
            );
        }
        batch.endPass();
        const countsRequest = batch.readback(counts.buffer, 0, countsBytes);
        const rowsRequest = batch.readback(graph.rowPtr.buffer, 0, 4 * (n + 1));
        const orientedRequest = orientedFlag === null ? null : batch.readback(orientedFlag.buffer, 0, 4);
        scope.flush();
        const submitted = batch.submit();
        const bytes = await submitted.readback;
        ctx.assertReady();
        if (options?.signal?.aborted) {
            throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted`, { batchId: submitted.id });
        }
        assertBuildSorted(bytes, build, ALGORITHM);
        if (orientedRequest !== null && new Uint32Array(bytes, orientedRequest.offset, 1)[0] !== 0) {
            throw new WebGpuGraphError(
                "E_VALIDATION",
                `${ALGORITHM}: the oriented arcs reached cooToCsr out of order`,
                {
                    label: `${ALGORITHM}/oriented`,
                    message: "the sorted-input precondition of cooToCsr failed on the device",
                },
            );
        }
        const perNode = dest ?? new Uint32Array(n);
        perNode.set(new Uint32Array(bytes, countsRequest.offset, n));
        const rowPtr = new Uint32Array(bytes, rowsRequest.offset, n + 1);
        options?.onProgress?.(1, 1);
        return epilogue(perNode, rowPtr);
    } finally {
        scope.dispose();
    }
}
