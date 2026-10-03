/**
 * Boruvka's minimum spanning forest (design 8.5, 3.3 line 808; the P11 plan's P11-T4) over the snapshot's edge list,
 * each logical edge once, so a directed snapshot is spanned as its underlying undirected multigraph -- what
 * `@graphty/algorithms`' `kruskalMST` does. Every vertex starts as its own component (`comp[v] = v`); each round:
 *
 * 1. `fill` resets every component's `bestKey` and `bestEdge` to `U32_MAX`;
 * 2. `mst-best` twice (PD-7): the per-component minimum of the TOTAL edge order -- the order-preserving key of the
 *    weight first (PD-6: negative weights order below positive ones, -0 equals +0), the edge index among ties -- over
 *    the edges whose endpoints lie in different components, so self-loops and edges inside a component never compete;
 * 3. `mst-link`: each root with a best edge hooks onto the component at its other end and records the edge, the lower
 *    root of a two-cycle keeping its label so the edge is recorded once;
 * 4. `wcc-compress` (PD-7: the Afforest kernel, unchanged) until every vertex points at its root: a walk of at most
 *    COMPRESS_STEPS per dispatch divides every depth by COMPRESS_STEPS, so `compressPasses(n)` dispatches suffice.
 *
 * Because the order is total the forest is unique: it is the one Kruskal accepts when its sort breaks ties by edge
 * index, which `kruskalMST` does. So the edge SET equals the CPU's on every graph, tied weights included; only the
 * order of `edges` differs.
 *
 * BORUVKA_ROUNDS_PER_SUBMIT rounds are recorded per submit with one readback of their recorded-edge counts; a round
 * that records nothing ends the run (rounds after it inside the same submit change nothing). The round count is at
 * most ceil(log2 n) + 1, because every round at least halves the components that still have an outgoing edge;
 * MAX_ROUNDS is the bound a device bug cannot pass, never a fallback. The forest is read back once at the end.
 *
 * PLAN DECISION (P11-T4 Step 3 appends each edge through an `atomicAdd` on the counters block): a root records its
 * edge in its own word of `treeEdge`, because a root hooks at most once in a run. The result is then deterministic
 * (the edges in root order, round by round) with no host sort, where an atomic append is ordered by the schedule.
 *
 * `totalWeight` is summed on the host in f64 over the snapshot's own edge weights, so it differs from
 * `kruskalMST`'s only by the order of the summation.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import { BORUVKA_ROUNDS_PER_SUBMIT, U32_MAX } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch } from "../kernel/batch.js";
import { plan1d, planGridStride } from "../kernel/dispatch.js";
import { FILL_PARAMS, kernelSpec, MST_PARAMS, WCC_PARAMS } from "../kernels.js";
import { assertDeviceComputes } from "../primitives/verify.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { type GpuMstResult } from "../types/structure.js";
import { algorithmScope } from "./scope.js";

const ALGORITHM = "minimumSpanningTree";
/** The bound of one compress walk (the `maxSteps` of `wcc-compress`), as connected components uses. */
const COMPRESS_STEPS = 1024;
/** A round count no correct run reaches: at most ceil(log2 n) + 1 <= 33 rounds for any u32 node count. */
const MAX_ROUNDS = 64;
/** Params slots of the largest batch: the first one's two initial fills, the reset fill, the shared best-pass and compress blocks, and one link block per round. */
const RING_SLOTS = 5 + BORUVKA_ROUNDS_PER_SUBMIT;

/**
 * The `wcc-compress` dispatches that flatten any forest of `n` vertices: each one divides every depth by
 * COMPRESS_STEPS (a vertex lands at least COMPRESS_STEPS ancestors up, or on its root).
 * @param n - the vertex count
 * @returns the dispatch count, at least 1
 */
export function compressPasses(n: number): number {
    let passes = 1;
    for (let reach = COMPRESS_STEPS; reach < n; reach *= COMPRESS_STEPS) {
        passes++;
    }
    return passes;
}

/**
 * The forest from the per-root `treeEdge` words, with the host-side f64 total.
 * @param s - the snapshot
 * @param treeEdge - one word per vertex, the edge its component recorded or INVALID_INDEX
 * @param expected - the edge count the rounds reported
 * @returns the result
 */
function resultOf(s: GraphSnapshot, treeEdge: Uint32Array, expected: number): GpuMstResult {
    const edges: U32 = new Uint32Array(expected);
    const { weights } = s.edgeList();
    let taken = 0;
    let totalWeight = 0;
    for (const e of treeEdge) {
        if (e === INVALID_INDEX) {
            continue;
        }
        if (e >= s.edgeCount || taken === expected) {
            throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: the device recorded an edge it did not count`, {
                label: `${ALGORITHM}/treeEdge`,
                message: `edge ${e} at forest position ${taken} of ${expected}`,
            });
        }
        edges[taken++] = e;
        totalWeight += weights === null ? 1 : weights[e];
    }
    if (taken !== expected) {
        throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: ${taken} recorded edges, ${expected} counted`, {
            label: `${ALGORITHM}/treeEdge`,
            message: "the per-round counts disagree with the recorded forest",
        });
    }
    return { edges, totalWeight };
}

/**
 * Boruvka's minimum spanning forest on the device (see the file header).
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (its edge list is uploaded through ctx.residency, or found there)
 * @param options - signal, onProgress (`dest` is refused: the forest's length is not known before the run)
 * @returns the forest's logical edge indices and its total weight
 */
export async function minimumSpanningTree(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: GpuRunOptions,
): Promise<GpuMstResult> {
    ctx.assertReady();
    await assertDeviceComputes(ctx);
    if (options?.dest !== undefined) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${ALGORITHM}: dest is not supported`, {
            option: "dest",
            hint: "the forest's edge count is known only after the run",
        });
    }
    if (options?.signal?.aborted) {
        throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted before any work started`, {});
    }
    const n = s.nodeCount;
    const m = s.edgeCount;
    if (n === 0 || m === 0) {
        options?.onProgress?.(1, 1);
        return { edges: new Uint32Array(0), totalWeight: 0 };
    }
    // core() is what records (or re-records, after a release) the snapshot in the residency; only the edge list is read
    ctx.residency.core(s, ["rowPtr"]);
    const edges = ctx.residency.view(s, "edgeList");
    const edgeWeight = edges.bindings.weights ?? null;
    const scope = algorithmScope(ctx, ALGORITHM, RING_SLOTS);
    try {
        const wg = ctx.workgroupSize;
        const words = (count: number, label: string): Binding => {
            const size = 4 * Math.max(1, count);
            return { buffer: scope.scratch(size, label), offset: 0, size, window: null };
        };
        const comp = words(n, "comp");
        const bestKey = words(n, "bestKey");
        const bestEdge = words(n, "bestEdge");
        const treeEdge = words(n, "treeEdge");
        const counters = words(BORUVKA_ROUNDS_PER_SUBMIT, "counters");
        await ctx.allocator.check();
        const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
        const weighted = edgeWeight !== null;
        const minKey = await ctx.pipelines.kernel(kernelSpec("mst-best", { PASS: 0, WEIGHTED: weighted }));
        const minEdge = await ctx.pipelines.kernel(kernelSpec("mst-best", { PASS: 1, WEIGHTED: weighted }));
        const link = await ctx.pipelines.kernel(kernelSpec("mst-link"));
        const compress = await ctx.pipelines.kernel(kernelSpec("wcc-compress"));
        const nodePlan = plan1d(n, wg, ctx.caps);
        const edgePlan = plan1d(m, wg, ctx.caps);
        const compressPlan = planGridStride(n, wg, ctx.caps);
        const passes = compressPasses(n);
        const { queue } = ctx.device;

        let batch = new CommandBatch(ctx, `${ALGORITHM}/rounds`);
        let first = true;
        let rounds = 0;
        let recorded = 0;
        for (;;) {
            queue.writeBuffer(counters.buffer, 0, new Uint32Array(BORUVKA_ROUNDS_PER_SUBMIT));
            const pass = batch.pass("rounds");
            const fillFor = (value: number, mode: number): { binding: Binding; offset: number } =>
                scope.params(FILL_PARAMS, { count: n, value, mode, pad0: 0 });
            if (first) {
                const iota = fillFor(0, 1);
                fill.dispatch(pass, fill.bind({ dst: comp, P: iota.binding }), nodePlan, [iota.offset]);
                const none = fillFor(INVALID_INDEX, 0);
                fill.dispatch(pass, fill.bind({ dst: treeEdge, P: none.binding }), nodePlan, [none.offset]);
            }
            const reset = fillFor(U32_MAX, 0);
            const edgeParams = scope.params(MST_PARAMS, { count: m, counterIndex: 0, pad0: 0, pad1: 0 });
            const compressParams = scope.params(WCC_PARAMS, {
                n,
                items: n,
                stride: compressPlan.stride ?? n,
                r: 0,
                flagIndex: 0,
                giant: U32_MAX,
                maxSteps: COMPRESS_STEPS,
                pad0: 0,
            });
            const graph = {
                edgeSrc: edges.bindings.src,
                edgeDst: edges.bindings.dst,
                edgeWeight: edgeWeight ?? edges.bindings.src,
            };
            for (let i = 0; i < BORUVKA_ROUNDS_PER_SUBMIT; i++) {
                for (const dst of [bestKey, bestEdge]) {
                    fill.dispatch(pass, fill.bind({ dst, P: reset.binding }), nodePlan, [reset.offset]);
                }
                for (const kernel of [minKey, minEdge]) {
                    kernel.dispatch(
                        pass,
                        kernel.bind({ ...graph, comp, bestKey, bestEdge, P: edgeParams.binding }),
                        edgePlan,
                        [edgeParams.offset],
                    );
                }
                const linkParams = scope.params(MST_PARAMS, { count: n, counterIndex: i, pad0: 0, pad1: 0 });
                link.dispatch(
                    pass,
                    link.bind({
                        edgeSrc: graph.edgeSrc,
                        edgeDst: graph.edgeDst,
                        bestEdge,
                        comp,
                        treeEdge,
                        counters,
                        P: linkParams.binding,
                    }),
                    nodePlan,
                    [linkParams.offset],
                );
                for (let j = 0; j < passes; j++) {
                    compress.dispatch(pass, compress.bind({ comp, P: compressParams.binding }), compressPlan, [
                        compressParams.offset,
                    ]);
                }
            }
            batch.endPass();
            const countsRequest = batch.readback(counters.buffer, 0, 4 * BORUVKA_ROUNDS_PER_SUBMIT);
            scope.flush();
            const submitted = batch.submit();
            const bytes = await submitted.readback;
            ctx.assertReady();
            first = false;
            if (options?.signal?.aborted) {
                throw new WebGpuGraphError("E_ABORTED", `${ALGORITHM}: the signal was aborted`, {
                    batchId: submitted.id,
                });
            }
            const counts = new Uint32Array(bytes, countsRequest.offset, BORUVKA_ROUNDS_PER_SUBMIT);
            let settled = false;
            for (const count of counts) {
                recorded += count;
                settled ||= count === 0;
            }
            rounds += BORUVKA_ROUNDS_PER_SUBMIT;
            if (recorded > n - 1) {
                throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: ${recorded} forest edges on ${n} nodes`, {
                    label: `${ALGORITHM}/counters`,
                    message: "a spanning forest has at most n - 1 edges",
                });
            }
            if (settled) {
                break;
            }
            if (rounds >= MAX_ROUNDS) {
                throw new WebGpuGraphError("E_VALIDATION", `${ALGORITHM}: still merging after ${rounds} rounds`, {
                    label: `${ALGORITHM}/rounds`,
                    message: "Boruvka halves the components every round; the device did not",
                });
            }
            batch = new CommandBatch(ctx, `${ALGORITHM}/rounds`);
        }
        const raw = new Uint32Array(n);
        await ctx.readback.read(treeEdge.buffer, 4 * n, raw);
        ctx.assertReady();
        options?.onProgress?.(1, 1);
        return resultOf(s, raw, recorded);
    } finally {
        scope.dispose();
    }
}
