/**
 * The runs and checks the P11 suites share (test/primitives/coo-to-csr.test.ts, test/primitives/group-by-key.test.ts,
 * test/algorithms/triangles.test.ts, test/algorithms/label-propagation.test.ts and the two sabotage suites): one
 * recorded `cooToCsr`, one simple symmetric build read back whole, one group-by-key over host arrays, and the reports
 * the sabotage suites measure. Every report is bitwise (ratioOf(|a - b|, 0)): the outputs are integers or are
 * computed by integer rules, so any mismatch is Infinity, and a run that throws is Infinity too.
 */

import { type F32, type GraphSnapshot, type U32 } from "@graphty/graph-format";

import { labelPropagation } from "../../src/algorithms/label-propagation.js";
import { algorithmScope } from "../../src/algorithms/scope.js";
import { assertBuildSorted, buildSimpleSymmetric } from "../../src/algorithms/simple-symmetric.js";
import { triangleCountWithSearch } from "../../src/algorithms/triangles.js";
import { type GpuContext } from "../../src/context.js";
import { prepareCooToCsr } from "../../src/primitives/coo-to-csr.js";
import { planGroupRows, prepareGroupByKeyRow } from "../../src/primitives/group-by-key.js";
import { type PlanCaps } from "../../src/types/context.js";
import { type Binding } from "../../src/types/memory.js";
import { labelPropagationOracle } from "../oracle/community.js";
import { csrOfArcs, type HostCsr, simpleSymmetricOracle } from "../oracle/coo.js";
import { groupByKeyOracle } from "../oracle/group-by-key.js";
import { triangleOracle } from "../oracle/structure.js";
import { fakeCaps } from "./caps-tables.js";
import { bindingOf, readF32, readU32, uploadBuffer } from "./device.js";
import { completeEdges, type EdgeSpec, KARATE_EDGES, pathEdges, randomEdgesLoose, snapshotOf } from "./graphs.js";
import { type CheckReport, mergeReports, ratioOf } from "./sabotage.js";
import { testReduceScope } from "./segmented-reduce.js";

/**
 * The context with a faked maxStorageBufferBindingSize, so a refusal for size can be reached with a small graph.
 * @param ctx - the real context
 * @param bindingLimit - the faked limit in bytes
 * @returns a view of the context whose caps carry the limit
 */
export function withBindingLimit(ctx: GpuContext, bindingLimit: number): GpuContext {
    const caps: PlanCaps = fakeCaps(ctx.caps, { maxStorageBufferBindingSize: bindingLimit });
    return new Proxy(ctx, {
        get(target, key, receiver): unknown {
            if (key === "caps") {
                return caps;
            }
            const value: unknown = Reflect.get(target, key, receiver);
            return typeof value === "function" ? value.bind(target) : value;
        },
    });
}

/** A buffer of words that is never zero-length. */
function upload(ctx: GpuContext, words: ArrayLike<number>, label: string, float?: boolean): GPUBuffer {
    const data = float === true ? Float32Array.from(words) : Uint32Array.from(words);
    return uploadBuffer(ctx, data.length > 0 ? data : new Uint32Array(1), label);
}

/**
 * One cooToCsr run read back: the graph and the precondition flag.
 * @public
 */
export interface CooRun extends HostCsr {
    readonly flag: number;
}

/**
 * Uploads `count` arcs, runs `cooToCsr` once, reads the graph back.
 * @param ctx - the context
 * @param n - the node count
 * @param src - the sources
 * @param dst - the targets
 * @param weights - the weights, or null
 * @param sortedInput - the scatter mode
 * @returns the graph and the flag word
 */
export async function runCooToCsr(
    ctx: GpuContext,
    n: number,
    src: ArrayLike<number>,
    dst: ArrayLike<number>,
    weights: ArrayLike<number> | null,
    sortedInput: boolean,
): Promise<CooRun> {
    const count = src.length;
    const buffers = [
        upload(ctx, src, "coo/src"),
        upload(ctx, dst, "coo/dst"),
        upload(ctx, weights ?? [0], "coo/weights", true),
        uploadBuffer(ctx, new Uint32Array(n + 1), "coo/rowPtr"),
        uploadBuffer(ctx, new Uint32Array(Math.max(1, count)), "coo/colIdx"),
        uploadBuffer(ctx, new Float32Array(Math.max(1, count)), "coo/outWeights"),
        uploadBuffer(ctx, Uint32Array.of(7), "coo/flag"),
    ];
    const [srcB, dstB, wB, rowPtrB, colB, owB, flagB] = buffers;
    const scope = testReduceScope(ctx);
    try {
        const planner = await prepareCooToCsr(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "coo/test" });
        const pass = encoder.beginComputePass({ label: "coo/test" });
        planner.record(pass, {
            src: bindingOf(srcB),
            dst: bindingOf(dstB),
            weights: weights === null ? null : bindingOf(wB),
            count,
            n,
            sortedInput,
            out: {
                rowPtr: bindingOf(rowPtrB),
                colIdx: bindingOf(colB),
                weights: weights === null ? null : bindingOf(owB),
                flag: bindingOf(flagB),
            },
        });
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        const rowPtr = await readU32(ctx, rowPtrB, n + 1);
        const colIdx = count > 0 ? await readU32(ctx, colB, count) : new Uint32Array(0);
        let w: F32 | null = null;
        if (weights !== null) {
            w = count > 0 ? await readF32(ctx, owB, count) : new Float32Array(0);
        }
        const flag = (await readU32(ctx, flagB, 1))[0];
        return { n, rowPtr, colIdx, weights: w, flag };
    } finally {
        scope.dispose();
        for (const b of buffers) {
            b.destroy();
        }
    }
}

/**
 * Builds the simple symmetric graph of `s` on the device and reads it back whole.
 * @param ctx - the context
 * @param s - the snapshot
 * @param withWeights - merge the weights too
 * @returns the graph (weights null without them) and the per-arc sources
 */
export async function runSimpleSymmetric(
    ctx: GpuContext,
    s: GraphSnapshot,
    withWeights: boolean,
): Promise<HostCsr & { readonly src: U32 }> {
    const scope = algorithmScope(ctx, "simple/test", 1024);
    try {
        const build = await buildSimpleSymmetric(ctx, s, scope, withWeights, "simple/test");
        const { graph, batch } = build;
        const n = s.nodeCount;
        const u = graph.arcCount;
        const rows = batch.readback(graph.rowPtr.buffer, 0, 4 * (n + 1));
        const read = (b: Binding | null): { offset: number } | null =>
            b === null || u === 0 ? null : batch.readback(b.buffer, 0, 4 * u);
        const cols = read(graph.colIdx);
        const ws = read(graph.weights);
        const srcs = read(graph.src);
        scope.flush();
        const bytes = await batch.submit().readback;
        ctx.assertReady();
        assertBuildSorted(bytes, build, "simple/test");
        return {
            n,
            rowPtr: new Uint32Array(bytes.slice(rows.offset, rows.offset + 4 * (n + 1))),
            colIdx: cols === null ? new Uint32Array(0) : new Uint32Array(bytes.slice(cols.offset, cols.offset + 4 * u)),
            weights: ws === null ? null : new Float32Array(bytes.slice(ws.offset, ws.offset + 4 * u)),
            src: srcs === null ? new Uint32Array(0) : new Uint32Array(bytes.slice(srcs.offset, srcs.offset + 4 * u)),
        };
    } finally {
        scope.dispose();
    }
}

/**
 * One group-by-key run read back.
 * @public
 */
export interface GroupRun {
    readonly bestKey: U32;
    readonly bestScore: F32;
    /** Word 0 of the hash region: 1 when a probe loop ran out of steps. */
    readonly exhausted: number;
}

/**
 * Runs the group-by-key primitive once over host arrays, with the rows split by their exact lengths.
 * @param ctx - the context
 * @param rowPtr - the row offsets
 * @param colIdx - the targets
 * @param weights - the weights, or null
 * @param keyIn - one key per node
 * @param threadMax - the longest row the thread tier takes (0: every row to the workgroup tier)
 * @returns the outputs
 */
export async function runGroupBy(
    ctx: GpuContext,
    rowPtr: ArrayLike<number>,
    colIdx: ArrayLike<number>,
    weights: ArrayLike<number> | null,
    keyIn: ArrayLike<number>,
    threadMax?: number,
): Promise<GroupRun> {
    const n = rowPtr.length - 1;
    const lengths = Array.from({ length: n }, (_, v) => rowPtr[v + 1] - rowPtr[v]);
    const plan = planGroupRows(lengths, threadMax);
    const buffers = [
        upload(ctx, rowPtr, "group/rowPtr"),
        upload(ctx, colIdx, "group/colIdx"),
        upload(ctx, weights ?? [0], "group/weights", true),
        upload(ctx, keyIn, "group/keyIn"),
        upload(ctx, plan.words, "group/rows"),
        uploadBuffer(ctx, new Uint32Array(plan.regionWords), "group/region"),
        uploadBuffer(ctx, new Uint32Array(Math.max(1, n)).fill(0xdeadbeef), "group/bestKey"),
        uploadBuffer(ctx, new Float32Array(Math.max(1, n)).fill(-1), "group/bestScore"),
    ];
    const [rowB, colB, wB, keyB, rowsB, regionB, bkB, bsB] = buffers;
    const scope = testReduceScope(ctx);
    try {
        const planner = await prepareGroupByKeyRow(scope);
        const encoder = ctx.device.createCommandEncoder({ label: "group/test" });
        const pass = encoder.beginComputePass({ label: "group/test" });
        planner.record(pass, {
            rowPtr: bindingOf(rowB),
            colIdx: bindingOf(colB),
            weights: weights === null ? null : bindingOf(wB),
            keyIn: bindingOf(keyB),
            plan,
            rows: bindingOf(rowsB),
            hashRegion: bindingOf(regionB),
            bestKey: bindingOf(bkB),
            bestScore: bindingOf(bsB),
        });
        pass.end();
        ctx.device.queue.submit([encoder.finish()]);
        return {
            bestKey: await readU32(ctx, bkB, n),
            bestScore: await readF32(ctx, bsB, n),
            exhausted: (await readU32(ctx, regionB, 1))[0],
        };
    } finally {
        scope.dispose();
        for (const b of buffers) {
            b.destroy();
        }
    }
}

/**
 * The bitwise report of two word arrays.
 * @param label - the report label
 * @param got - the device's words
 * @param want - the reference's words
 * @returns the report
 */
function wordsReport(label: string, got: ArrayLike<number>, want: ArrayLike<number>): CheckReport {
    if (got.length !== want.length) {
        return { worst: Infinity, worstLabel: `${label}.length`, samples: 1 };
    }
    for (let i = 0; i < want.length; i++) {
        if (!Object.is(got[i], want[i])) {
            return {
                worst: ratioOf(Math.abs(got[i] - want[i]), 0),
                worstLabel: `${label}[${i}]`,
                samples: want.length,
            };
        }
    }
    return { worst: 0, worstLabel: label, samples: want.length };
}

/**
 * A report that is Infinity when `run` throws.
 * @param label - the report label
 * @param run - the measured check
 * @returns the report
 */
async function guarded(label: string, run: () => Promise<CheckReport>): Promise<CheckReport> {
    try {
        return await run();
    } catch {
        return { worst: Infinity, worstLabel: `${label} threw`, samples: 1 };
    }
}

/** A directed, weighted multigraph with self-loops and parallel edges both ways: the build's hardest small input. */
export function messyEdges(): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    for (const [u, v] of randomEdgesLoose(60, 240, 11)) {
        edges.push([u, v, 0.5 + ((u * 7 + v * 3) % 5)]);
    }
    edges.push([3, 3, 2], [5, 9, 1.25], [9, 5, 0.75], [5, 9, 4]);
    return edges;
}

/**
 * The sabotage check of the graph build (`coo-emit`, `run-flags`, `coo-scatter`): the simple symmetric build of karate
 * and of the messy multigraph against the reference, the cursor-mode `cooToCsr` of a shuffled arc list (rowPtr
 * bitwise, each row as a sorted set), and the sorted-input flag raised by out-of-order arcs.
 * @param ctx - the context
 * @returns the merged report
 */
export async function buildReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const [label, s] of [
        ["karate", snapshotOf(KARATE_EDGES)],
        ["messy", snapshotOf(messyEdges(), { directed: true, nodeCount: 60 })],
    ] as const) {
        reports.push(
            await guarded(label, async () => {
                const got = await runSimpleSymmetric(ctx, s, true);
                const want = simpleSymmetricOracle(s);
                return mergeReports([
                    wordsReport(`${label}.rowPtr`, got.rowPtr, want.rowPtr),
                    wordsReport(`${label}.colIdx`, got.colIdx, want.colIdx),
                    wordsReport(`${label}.weights`, got.weights ?? [], want.weights ?? []),
                ]);
            }),
        );
        ctx.release(s);
    }
    reports.push(
        await guarded("cursor", async () => {
            const n = 50;
            const arcs = randomEdgesLoose(n, 400, 5);
            const src = arcs.map((e) => e[0]);
            const dst = arcs.map((e) => e[1]);
            const got = await runCooToCsr(ctx, n, src, dst, null, false);
            const order = src.map((_, i) => i).sort((a, b) => src[a] - src[b] || dst[a] - dst[b]);
            const want = csrOfArcs(
                n,
                order.map((i) => src[i]),
                order.map((i) => dst[i]),
                null,
            );
            const rows: number[] = [];
            for (let v = 0; v < n; v++) {
                rows.push(...Array.from(got.colIdx.subarray(got.rowPtr[v], got.rowPtr[v + 1])).sort((a, b) => a - b));
            }
            return mergeReports([
                wordsReport("cursor.rowPtr", got.rowPtr, want.rowPtr),
                wordsReport("cursor.rows", rows, want.colIdx),
            ]);
        }),
    );
    reports.push(
        await guarded("unsorted", async () => {
            const got = await runCooToCsr(ctx, 4, [2, 0, 1], [0, 1, 2], null, true);
            return wordsReport("unsorted.flag", [got.flag], [1]);
        }),
    );
    return mergeReports(reports);
}

/**
 * The sabotage check of triangle counting (`orient-flags`, `tri-intersect`): per-node counts on karate, a complete
 * graph and a random graph against the reference, with the intersection chosen per arc, forced to merge and forced to
 * binary-search.
 * @param ctx - the context
 * @returns the merged report
 */
export async function triangleReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const [label, edges] of [
        ["karate", KARATE_EDGES],
        ["complete7", completeEdges(7)],
        ["random", randomEdgesLoose(120, 900, 3)],
    ] as const) {
        const s = snapshotOf(edges);
        const want = triangleOracle(simpleSymmetricOracle(s));
        for (const search of [0, 1, 2] as const) {
            reports.push(
                await guarded(`${label}/${search}`, async () => {
                    const got = await triangleCountWithSearch(ctx, s, search);
                    return wordsReport(`${label}/${search}.perNode`, got.perNode, want.perNode);
                }),
            );
        }
        ctx.release(s);
    }
    return mergeReports(reports);
}

/**
 * The rows the group-by suites use: lengths 0, 1, 31, 32, 33, 128, 129, 300 and 2,000 with keys drawn from a small
 * set (so keys repeat and tie), weights spanning six decades, and a row whose keys are all distinct.
 * @returns rowPtr, colIdx, weights and keyIn over one node set
 */
export function groupRows(): { rowPtr: number[]; colIdx: number[]; weights: number[]; keyIn: number[] } {
    const lengths = [0, 1, 31, 32, 33, 128, 129, 300, 2000, 200];
    const n = 4096;
    const keyIn = Array.from({ length: n }, (_, v) => (v * 2654435761) % 13);
    const rowPtr = [0];
    const colIdx: number[] = [];
    const weights: number[] = [];
    let seed = 7;
    for (let r = 0; r < lengths.length; r++) {
        for (let i = 0; i < lengths[r]; i++) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            // the last row: every target a distinct key (keys 13 upward are unused by the others)
            colIdx.push(r === lengths.length - 1 ? 3000 + i : seed % n);
            weights.push(10 ** ((seed % 7) - 3));
        }
        rowPtr.push(colIdx.length);
    }
    for (let i = 0; i < 200; i++) {
        keyIn[3000 + i] = 100 + i;
    }
    // pad rowPtr so every node is a row: nodes beyond the listed rows have no arcs
    while (rowPtr.length < n + 1) {
        rowPtr.push(colIdx.length);
    }
    return { rowPtr, colIdx, weights, keyIn };
}

/**
 * The sabotage check of the group-by (`group-by-key-row`): the rows of `groupRows`, weighted and not, with the tiers
 * split at the default, all in the thread tier (up to its limit) and all in the workgroup tier, against the reference;
 * a raised exhausted flag is a failure too.
 * @param ctx - the context
 * @returns the merged report
 */
export async function groupReport(ctx: GpuContext): Promise<CheckReport> {
    const rows = groupRows();
    const reports: CheckReport[] = [];
    for (const weighted of [false, true]) {
        const w = weighted ? rows.weights : null;
        const want = groupByKeyOracle(rows.rowPtr, rows.colIdx, w, rows.keyIn);
        for (const threadMax of [undefined, 0, 128]) {
            reports.push(
                await guarded(`group/${weighted}/${threadMax}`, async () => {
                    const got = await runGroupBy(ctx, rows.rowPtr, rows.colIdx, w, rows.keyIn, threadMax);
                    return mergeReports([
                        wordsReport("bestKey", got.bestKey, want.bestKey),
                        wordsReport("bestScore", got.bestScore, want.bestScore),
                        wordsReport("exhausted", [got.exhausted], [0]),
                    ]);
                }),
            );
        }
    }
    return mergeReports(reports);
}

/**
 * The sabotage check of label propagation (`lpa-step`): labels against the reference on karate, a 300-node path
 * (which needs more passes than one submit holds) and the two-node path the direction rule exists for.
 * @param ctx - the context
 * @returns the merged report
 */
export async function labelPropagationReport(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const [label, edges] of [
        ["karate", KARATE_EDGES],
        ["path300", pathEdges(300)],
        ["pair", [[0, 1]] as EdgeSpec[]],
    ] as const) {
        const s = snapshotOf(edges);
        const want = labelPropagationOracle(simpleSymmetricOracle(s), { maxIterations: 100, weighted: true });
        reports.push(
            await guarded(label, async () => {
                const got = await labelPropagation(ctx, s);
                return wordsReport(`${label}.labels`, got.labels, want.labels);
            }),
        );
        ctx.release(s);
    }
    return mergeReports(reports);
}
