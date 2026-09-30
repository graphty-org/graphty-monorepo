/**
 * The simple symmetric graph (the P11 plan's PD-4): triangle counting and label propagation are defined over an
 * undirected graph with no parallel edges and no self-loops, and a snapshot may be directed, may carry parallel
 * edges and may carry self-loops. This builds that graph on the device from the snapshot's edge list:
 *
 * 1. `coo-emit` writes two arcs per logical edge -- the edge as declared and its reverse -- and drops a self-loop
 *    by writing both of its arcs as `INVALID_INDEX`, which sorts last.
 * 2. Two stable radix sorts order the arcs by (source, target): by target first, then by source, the second sort's
 *    stability keeping the first's order among equal sources. Between and after them `coo-emit` re-reads the edge
 *    list through the sorted permutation (INDEXED), so no gather kernel is needed.
 * 3. `run-flags` marks the first arc of every run of equal pairs; the scan of the flags counts the runs, which is
 *    the number of distinct arcs `U` -- read back once, because every later size depends on it.
 * 4. Three `compact`s keep the first arc of every run (its source, its target and its position), and a segmented
 *    sum over the runs merges the weights of parallel arcs in input order (so the merged weight is bitwise
 *    reproducible).
 * 5. `cooToCsr` in its sorted-input mode builds the rows, which come out sorted by target.
 *
 * The first submit ends at step 3; steps 4 and 5 are recorded into a batch that is RETURNED OPEN, so the caller
 * records its own first work into the same submit and saves a synchronisation. The caller must check the
 * precondition flag of `cooToCsr` with `assertBuildSorted` after that submit.
 *
 * Every intermediate array is `2 x edgeCount` words and is bound whole, so a snapshot whose arcs exceed one storage
 * binding is refused with `E_TOO_LARGE` before any upload. A weighted build refuses, with `E_UNSUPPORTED`, a pair
 * joined by more than PARALLEL_MERGE_LIMIT parallel edges (see the constant).
 *
 * ponytail: about nine of the arrays are alive at the peak (72 bytes per logical edge); reuse buffers across the
 * steps if a 1M-node / 10M-edge build needs the room.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { PARALLEL_MERGE_LIMIT } from "../constants.js";
import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import { CommandBatch, type ReadbackRequest } from "../kernel/batch.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { COO_PARAMS, FILL_PARAMS, kernelSpec } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { prepareCompact } from "../primitives/compact.js";
import { prepareCooToCsr } from "../primitives/coo-to-csr.js";
import { prepareRadixSort, type RadixBits, radixHistBytes } from "../primitives/radix-sort.js";
import { prepareScan } from "../primitives/scan.js";
import { prepareSegmentedReduce } from "../primitives/segmented-reduce.js";
import { type Binding } from "../types/memory.js";
import { type AlgorithmScope } from "./scope.js";

/**
 * The simple symmetric graph on the device.
 * @public
 */
export interface SimpleGraph {
    readonly n: number;
    /** Arcs: twice the undirected edges of the simple graph. */
    readonly arcCount: number;
    /** `n + 1` words. */
    readonly rowPtr: Binding;
    /** `arcCount` words, each row sorted ascending; null when there are no arcs. */
    readonly colIdx: Binding | null;
    /** `arcCount` f32, the summed weight of the parallel edges each arc merges (1 per edge on an unweighted snapshot); null when there are no arcs or weights were not asked for. */
    readonly weights: Binding | null;
    /** The source of every arc (`arcCount` words, non-decreasing); null when there are no arcs. */
    readonly src: Binding | null;
}

/**
 * The open second batch of a build: record more work into it, submit it, then call `assertBuildSorted`.
 * @public
 */
export interface SimpleGraphBuild {
    readonly graph: SimpleGraph;
    readonly batch: CommandBatch;
    /** The readback of the sorted-input flag of `cooToCsr`, already scheduled on `batch`. */
    readonly flag: ReadbackRequest;
}

/**
 * The key width that orders node indices below `n` with `INVALID_INDEX` after all of them: the low `bits` of
 * `INVALID_INDEX` are all ones, so every node index must stay below `2^bits - 1`.
 * @param n - the node count
 * @returns 8, 16, 24 or 32
 */
function sortBitsFor(n: number): RadixBits {
    for (const bits of [8, 16, 24] as const) {
        if (n < 2 ** bits) {
            return bits;
        }
    }
    return 32;
}

/**
 * A whole-binding view of a scratch buffer of `words` u32 (at least one word, so a binding is never zero-length).
 * @param scope - the scope the buffer comes from
 * @param words - the words
 * @param label - the scratch label
 * @returns the binding
 */
function scratchWords(scope: AlgorithmScope, words: number, label: string): Binding {
    const size = 4 * Math.max(1, words);
    return { buffer: scope.scratch(size, label), offset: 0, size, window: null };
}

/**
 * Throws `E_TOO_LARGE` when a buffer the caller binds whole is larger than one storage binding of the device.
 * @param ctx - the context whose limit applies
 * @param needed - the bytes of the largest whole binding
 * @param path - what does not fit
 * @param algorithm - the algorithm, for the error
 */
export function assertBindable(ctx: GpuContext, needed: number, path: string, algorithm: string): void {
    const limit = ctx.caps.limits.maxStorageBufferBindingSize;
    if (needed > limit) {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${algorithm}: ${path} needs ${needed} bytes in one binding, above the device limit of ${limit}`,
            { needed, limit, path, algorithm },
        );
    }
}

/**
 * Throws `E_UNSUPPORTED` when a weighted build would merge more than PARALLEL_MERGE_LIMIT parallel arcs into one: the
 * edges joining one pair, in either direction. Only a pair of two vertices that each touch more than the limit can,
 * so the exact count runs over those pairs alone and costs nothing on an ordinary graph.
 * @param n - the node count
 * @param src - the edge sources
 * @param dst - the edge targets
 * @param algorithm - the algorithm, for the error
 */
function assertMergeable(n: number, src: ArrayLike<number>, dst: ArrayLike<number>, algorithm: string): void {
    const incident = new Uint32Array(n);
    for (let e = 0; e < src.length; e++) {
        if (src[e] !== dst[e]) {
            incident[src[e]]++;
            incident[dst[e]]++;
        }
    }
    const heavy = new Map<number, number>();
    for (let v = 0; v < n; v++) {
        if (incident[v] > PARALLEL_MERGE_LIMIT) {
            heavy.set(v, heavy.size);
        }
    }
    if (heavy.size < 2) {
        return;
    }
    const pairs = new Uint32Array(heavy.size * heavy.size);
    for (let e = 0; e < src.length; e++) {
        const a = heavy.get(src[e]);
        const b = heavy.get(dst[e]);
        if (a === undefined || b === undefined || a === b) {
            continue;
        }
        const key = Math.min(a, b) * heavy.size + Math.max(a, b);
        if (++pairs[key] > PARALLEL_MERGE_LIMIT) {
            throw new WebGpuGraphError(
                "E_UNSUPPORTED",
                `${algorithm}: nodes ${src[e]} and ${dst[e]} are joined by more than ${PARALLEL_MERGE_LIMIT} parallel edges, more than one weighted merge sums`,
                { feature: `${algorithm}.parallelEdges`, hint: "run it unweighted, or merge the parallel edges first" },
            );
        }
    }
}

/**
 * Throws `E_VALIDATION` when the device found the build's arcs out of source order, which would mean a bug in the
 * sorts: the rows would be scrambled and every intersection over them wrong.
 * @param bytes - the batch's readback bytes
 * @param build - the build whose flag was read
 * @param label - the algorithm, for the error
 */
export function assertBuildSorted(bytes: ArrayBuffer, build: SimpleGraphBuild, label: string): void {
    if (new Uint32Array(bytes, build.flag.offset, 1)[0] !== 0) {
        throw new WebGpuGraphError("E_VALIDATION", `${label}: the simple graph's arcs reached cooToCsr out of order`, {
            label: `${label}/simple-graph`,
            message: "the sorted-input precondition of cooToCsr failed on the device",
        });
    }
}

/**
 * Builds the simple symmetric graph of `s` (see the file header): submits the first batch and waits for its
 * four-byte readback, then records the rest into a batch it returns open.
 * @param ctx - the context
 * @param s - the snapshot (its edge list is uploaded through the residency, or found there)
 * @param scope - the caller's scope: every buffer of the graph is its scratch
 * @param withWeights - merge and keep the weights (label propagation) or not (triangle counting)
 * @param label - the batch label prefix
 * @returns the graph and the open batch
 */
export async function buildSimpleSymmetric(
    ctx: GpuContext,
    s: GraphSnapshot,
    scope: AlgorithmScope,
    withWeights: boolean,
    label: string,
): Promise<SimpleGraphBuild> {
    const n = s.nodeCount;
    const wg = ctx.workgroupSize;
    const cooToCsr = await prepareCooToCsr(scope);
    const flag = scratchWords(scope, 1, "simple/flag");
    const rowPtr = scratchWords(scope, n + 1, "simple/rowPtr");
    const { edgeCount } = s;
    const list = s.edgeList();
    let selfLoops = 0;
    for (let e = 0; e < edgeCount; e++) {
        if (list.src[e] === list.dst[e]) {
            selfLoops++;
        }
    }
    const valid = 2 * (edgeCount - selfLoops);
    const empty = (): SimpleGraphBuild => {
        const batch = new CommandBatch(ctx, `${label}/simple-graph`);
        cooToCsr.record(batch.pass("simple-graph"), {
            src: flag,
            dst: flag,
            weights: null,
            count: 0,
            n,
            sortedInput: true,
            out: { rowPtr, colIdx: flag, weights: null, flag },
        });
        batch.endPass();
        const graph: SimpleGraph = { n, arcCount: 0, rowPtr, colIdx: null, weights: null, src: null };
        return { graph, batch, flag: batch.readback(flag.buffer, 0, 4) };
    };
    if (valid === 0) {
        return empty();
    }
    const arcs = 2 * edgeCount;
    const tableBytes = Math.max(4, radixHistBytes(arcs, wg));
    assertBindable(ctx, Math.max(4 * (arcs + 1), tableBytes), "the simple graph's arc arrays", label);
    if (withWeights) {
        assertMergeable(n, list.src, list.dst, label);
    }
    // core() is what records (or re-records, after a release) the snapshot in the residency; the build reads only
    // the edge list, so it asks for rowPtr alone
    ctx.residency.core(s, ["rowPtr"]);
    const edges = ctx.residency.view(s, "edgeList");
    const edgeWeights = edges.bindings.weights ?? null;
    const emitPlan = plan1d(arcs, wg, ctx.caps);
    const emit = new Map<boolean, Kernel>();
    for (const indexed of [false, true]) {
        const spec = kernelSpec("coo-emit", { INDEXED: indexed, WEIGHTED: edgeWeights !== null });
        emit.set(indexed, await ctx.pipelines.kernel(spec));
    }
    const fill = await ctx.pipelines.kernel(kernelSpec("fill"));
    const runFlags = await ctx.pipelines.kernel(kernelSpec("run-flags"));
    const sort = await prepareRadixSort(scope);
    const scan = await prepareScan(scope);
    const compact = await prepareCompact(scope);

    const aSrc = scratchWords(scope, arcs, "simple/aSrc");
    const aDst = scratchWords(scope, arcs, "simple/aDst");
    const aW = scratchWords(scope, arcs, "simple/aW");
    const vals = scratchWords(scope, arcs, "simple/vals");
    const sKeys = scratchWords(scope, arcs, "simple/sortKeys");
    const sVals = scratchWords(scope, arcs, "simple/sortVals");
    const hist: Binding = {
        buffer: scope.scratch(tableBytes, "simple/hist"),
        offset: 0,
        size: tableBytes,
        window: null,
    };
    const offsets: Binding = {
        buffer: scope.scratch(tableBytes, "simple/offsets"),
        offset: 0,
        size: tableBytes,
        window: null,
    };
    const sortedSrc = scratchWords(scope, arcs, "simple/sortedSrc");
    const sortedDst = scratchWords(scope, arcs, "simple/sortedDst");
    const sortedW = scratchWords(scope, arcs, "simple/sortedW");
    const flags = scratchWords(scope, arcs, "simple/flags");
    const runIndex = scratchWords(scope, arcs, "simple/runIndex");
    const dummy = scratchWords(scope, 1, "simple/dummy");
    await ctx.allocator.check();

    const recordEmit = (pass: GPUComputePassEncoder, order: Binding | null, out: readonly Binding[]): void => {
        const kernel = emit.get(order !== null);
        if (kernel === undefined) {
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", "buildSimpleSymmetric: no coo-emit variant", {
                argument: "order",
                value: order === null ? "null" : "present",
            });
        }
        const params = scope.params(COO_PARAMS, { count: arcs, pad0: 0, pad1: 0, pad2: 0 });
        const bound = kernel.bind({
            edgeSrc: edges.bindings.src,
            edgeDst: edges.bindings.dst,
            edgeWeight: edgeWeights ?? edges.bindings.src,
            order: order ?? dummy,
            outSrc: out[0],
            outDst: out[1],
            outWeight: out[2],
            P: params.binding,
        });
        kernel.dispatch(pass, bound, emitPlan, [params.offset]);
    };
    const recordIota = (pass: GPUComputePassEncoder, dst: Binding, words: number): void => {
        const params = scope.params(FILL_PARAMS, { count: words, value: 0, mode: 1, pad0: 0 });
        fill.dispatch(pass, fill.bind({ dst, P: params.binding }), plan1d(words, wg, ctx.caps), [params.offset]);
    };

    // batch 1: emit, sort by target, re-emit in that order, sort by source, re-emit sorted, flag the runs, count them
    const bits = sortBitsFor(n);
    const first = new CommandBatch(ctx, `${label}/simple-sort`);
    const pass = first.pass("simple-sort");
    recordEmit(pass, null, [aSrc, aDst, aW]);
    recordIota(pass, vals, arcs);
    const byTarget = sort.record(pass, aDst, vals, arcs, bits, { keys: sKeys, vals: sVals, hist, offsets });
    recordEmit(pass, byTarget.vals, [aSrc, aDst, aW]);
    const free = byTarget.vals.buffer === vals.buffer ? sVals : vals;
    const bySource = sort.record(pass, aSrc, byTarget.vals, arcs, bits, {
        keys: byTarget.keys.buffer === aDst.buffer ? sKeys : aDst,
        vals: free,
        hist,
        offsets,
    });
    recordEmit(pass, bySource.vals, [sortedSrc, sortedDst, sortedW]);
    const params = scope.params(COO_PARAMS, { count: arcs, pad0: 0, pad1: 0, pad2: 0 });
    runFlags.dispatch(pass, runFlags.bind({ keysA: sortedSrc, keysB: sortedDst, flags, P: params.binding }), emitPlan, [
        params.offset,
    ]);
    const total = scan.record(pass, flags, arcs, runIndex);
    first.endPass();
    const totalRequest = first.readback(total.binding.buffer, total.binding.offset + 4 * total.index, 4);
    scope.flush();
    const back = await first.submit().readback;
    ctx.assertReady();
    const unique = new Uint32Array(back, totalRequest.offset, 1)[0];
    if (unique === 0 || unique > valid) {
        throw new WebGpuGraphError("E_VALIDATION", `${label}: ${unique} distinct arcs from ${valid} valid ones`, {
            label: `${label}/simple-graph`,
            message: "the run count of the simple graph build is outside [1, valid arcs]",
        });
    }

    // batch 2 (returned open): keep the first arc of every run, merge the weights, build the rows
    const uSrc = scratchWords(scope, arcs, "simple/src");
    const uDst = scratchWords(scope, arcs, "simple/dst");
    const runStart = scratchWords(scope, arcs + 1, "simple/runStart");
    const counts = scratchWords(scope, 1, "simple/count");
    const colIdx = scratchWords(scope, unique, "simple/colIdx");
    const weights = withWeights ? scratchWords(scope, unique, "simple/weights") : null;
    const merged = withWeights ? scratchWords(scope, unique, "simple/merged") : null;
    // the terminator of the last run: every valid arc precedes the dropped ones, so the runs end at `valid`
    ctx.device.queue.writeBuffer(runStart.buffer, 4 * unique, Uint32Array.of(valid));
    const reduce =
        merged === null
            ? null
            : await prepareSegmentedReduce(scope, runCore(runStart, unique, sortedDst, sortedW, valid), {
                  op: "sum",
                  valueSnippet: "v = weight;",
                  tiers: null,
              });
    const second = new CommandBatch(ctx, `${label}/simple-graph`);
    const pass2 = second.pass("simple-graph");
    const positions = vals;
    recordIota(pass2, positions, arcs);
    for (const [queue, out] of [
        [sortedSrc, uSrc],
        [sortedDst, uDst],
        [positions, runStart],
    ] as const) {
        compact.record(pass2, { queue, flags, count: arcs, out, outCount: counts, outIndex: 0 });
    }
    if (reduce !== null && merged !== null) {
        reduce.record(pass2, runCore(runStart, unique, sortedDst, sortedW, valid), merged);
    }
    cooToCsr.record(pass2, {
        src: uSrc,
        dst: uDst,
        weights: merged,
        count: unique,
        n,
        sortedInput: true,
        out: { rowPtr, colIdx, weights, flag },
    });
    second.endPass();
    const graph: SimpleGraph = { n, arcCount: unique, rowPtr, colIdx, weights, src: uSrc };
    return { graph, batch: second, flag: second.readback(flag.buffer, 0, 4) };
}

/**
 * The runs as a CSR the segmented sum walks: row r is run r, its arcs the sorted positions `[runStart[r],
 * runStart[r + 1])`, its weights the sorted weights, so a row's sum is the merged weight in input order.
 * @param runStart - the run starts plus the terminator
 * @param runs - the run count
 * @param sortedDst - the sorted targets (the fold reads a neighbour it ignores)
 * @param sortedW - the sorted weights
 * @param valid - the arcs the runs cover
 * @returns the core binding
 */
function runCore(runStart: Binding, runs: number, sortedDst: Binding, sortedW: Binding, valid: number): CoreBinding {
    return {
        serial: -1,
        plan: "perArray",
        rowPtr: { ...runStart, size: 4 * (runs + 1) },
        colIdx: { ...sortedDst, size: 4 * valid },
        weights: { ...sortedW, size: 4 * valid },
        arcToEdge: null,
        edgeToArc: null,
        windows: null,
        arcBuffers: null,
        hasWeights: true,
    };
}
