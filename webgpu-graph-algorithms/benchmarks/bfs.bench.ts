/**
 * BFS and SSSP benchmarks (spec 10.4 T-10; design 10.3's BFS row; contract 6.3; P8-T14): wall time end to end
 * INCLUDING the upload, as `wcc.bench.ts` does (the snapshot is built once per rung outside the case and `teardown`
 * releases it after every run, so the next run re-uploads the core). Rows:
 *
 *   bfs auto at <rung>          `breadthFirstSearch` (the public member: direction-optimizing, Beamer's test on the
 *                               device) from node 0 of the RMAT rung
 *   bfs top-down at <rung>      `bfsWithTuning({ direction: "top-down" })` on the same rung
 *   bfs grid <s>x<s> levels=<L> `breadthFirstSearch` from corner 0 of the s x s grid (s = GRID_SIDE): about 2 s levels,
 *                               the T-10 latency row; `<L>` is the level count the traversal reported
 *   sssp at <rung>              `sssp` from node 0 of the RMAT rung with random f32 weights in SSSP_WEIGHT_RANGE; absent,
 *                               with a printed reason, on a device whose binding limit cannot hold the near-far queue
 *                               (E_TOO_LARGE; lavapipe's 128 MiB at 1M / 10M)
 *
 * The RMAT rungs are the design-15.3 tiers 100k / 1M and 1M / 10M as R-MAT scales (BFS_RMAT_RUNGS: 2^17 nodes x 8
 * edges per node, 2^20 x 10), undirected; the BFS snapshots carry NO weight column, so the upload the row includes
 * is the adjacency alone, and the SSSP snapshots carry the weights the row needs. Beside every BFS row the group
 * prints the counters block's per-level choices of an untimed run of the same call
 * (`[bfs] <row> levels=<L> switches=<S> fused=<F> twoPhase=<T> bottomUp=<B> overflow=<O> arcsScanned=<A>`, the last
 * the bottom-up sweeps' arc reads, issue #391), and beside the grid row
 * the `mapAsync` count of one traversal (`[bfs] grid<s> levels=<L> mapAsync=<k>`; PD-7 bounds it by
 * ceil(L / 32) + 1, and `test/limits/bfs-large.test.ts` asserts it -- the benchmark only prints it). The count is
 * measured through `LeakCounter` on a SECOND device adopted by `GpuContext.create({ device })`: the counter sees
 * only buffers created after it wraps the device, and the staging ring of the runner's own context predates it.
 * The grid row is timed on that second context (same adapter, the same raised limits) after `verifyDevice` has
 * paid the device self-check, so what is counted is one traversal.
 *
 * No profiler row: the traversal drivers record a whole submit (up to 32 levels) as ONE compute pass and never
 * resolve the profiler's query set, so there is no per-kernel GPU time to report; the row is the wall time.
 *
 * Targets (T-10, a CONTRACT on the reference card `nvidia-lovelace-driver580` and a RECORDED figure on
 * `gpu-linux-t4`, `design/decisions/2026-09-24-performance-targets-belong-to-a-card-class.md`): `bfs auto at 1M/10M`
 * <= 100 ms; the grid row <= 1.5 s.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";

import { bfsWithTuning, breadthFirstSearch } from "../src/algorithms/bfs.js";
import { sssp } from "../src/algorithms/sssp.js";
import { GpuContext } from "../src/context.js";
import { buildRequiredFeatures, buildRequiredLimits, requestDevice } from "../src/device/acquire.js";
import { isWebGpuGraphError } from "../src/errors.js";
import { type UniformValues } from "../src/kernel/struct-block.js";
import { createNodeGpu } from "../src/node/index.js";
import { verifyDevice } from "../src/primitives/verify.js";
import { LeakCounter } from "../test/helpers/leak-counter.js";
import { type EdgeArrays, gridEdges, rmatEdges, snapshotOf } from "./datasets.js";
import { bench, type BenchResult, makeRandom } from "./harness.js";

/** The group name. */
export const BFS_GROUP = "bfs";

/** One RMAT rung: the tier name the row carries and the R-MAT scale / edge factor that produce it. */
export interface BfsRung {
    readonly name: string;
    readonly scale: number;
    readonly edgeFactor: number;
}

/** The RMAT ladder: the 100k / 1M and 1M / 10M tiers as R-MAT scales (2^17 x 8 = 1,048,576 edges; 2^20 x 10). */
export const BFS_RMAT_RUNGS: readonly BfsRung[] = [
    { name: "100k/1M", scale: 17, edgeFactor: 8 },
    { name: "1M/10M", scale: 20, edgeFactor: 10 },
];

/** The side of the grid row: a 1000 x 1000 grid has 1,999 levels from its corner. */
export const GRID_SIDE = 1000;

/** The SSSP rows' weight range (inclusive lower bound, exclusive upper bound). */
export const SSSP_WEIGHT_RANGE: readonly [number, number] = [0.1, 10];

/** The seed of every RMAT rung and of the SSSP weights. */
const SEED = 12345;

/** The source node of every row. */
const SOURCE = 0;

/**
 * The name of the grid row for a level count.
 * @param levels - the level count the traversal reported
 * @returns the row name
 */
export function gridRowName(levels: number): string {
    return `bfs grid ${GRID_SIDE}x${GRID_SIDE} levels=${levels}`;
}

/**
 * An undirected snapshot WITHOUT a weight column (the BFS rows upload the adjacency alone).
 * @param edges - the edge arrays
 * @param label - the snapshot label
 * @returns the snapshot
 */
function unweightedSnapshotOf(edges: EdgeArrays, label: string): GraphSnapshot {
    return fromEdgeArrays({ directed: false, nodeCount: edges.nodeCount, src: edges.src, dst: edges.dst }, { label });
}

/**
 * The RMAT rung's edges with random f32 weights in SSSP_WEIGHT_RANGE in place of the generator's integers.
 * @param edges - the rung's edge arrays
 * @returns the same edges, reweighted
 */
function reweighted(edges: EdgeArrays): EdgeArrays {
    const random = makeRandom(SEED);
    const [lo, hi] = SSSP_WEIGHT_RANGE;
    const weights = new Float32Array(edges.src.length);
    for (let e = 0; e < weights.length; e++) {
        weights[e] = lo + random() * (hi - lo);
    }
    return { nodeCount: edges.nodeCount, src: edges.src, dst: edges.dst, weights };
}

/**
 * One word of the counters block as a number.
 * @param block - the block `onLevel` handed over
 * @param name - the field name
 * @returns the value
 */
function word(block: UniformValues, name: string): number {
    const value = block[name];
    return typeof value === "number" ? value : Number.NaN;
}

/**
 * Runs the traversal once, untimed, with the inspect seam on, and prints the per-level choices its counters block
 * recorded beside the row name; releases the snapshot afterwards so the timed runs start from a released core.
 * @param ctx - the context
 * @param s - the snapshot
 * @param row - the row name the line carries
 * @param direction - the tuning the timed row uses
 */
async function printChoices(
    ctx: GpuContext,
    s: GraphSnapshot,
    row: string,
    direction: "auto" | "top-down",
): Promise<void> {
    let last: UniformValues | null = null;
    const result = await bfsWithTuning(ctx, s, SOURCE, undefined, {
        direction,
        onLevel: (_level, block) => {
            last = block;
        },
    });
    ctx.release(s);
    if (last === null) {
        throw new Error(`${row}: onLevel never fired`);
    }
    const block: UniformValues = last;
    console.log(
        `[bfs] ${row} levels=${result.levels} switches=${result.switches} visited=${result.visitedCount} ` +
            `fused=${word(block, "fusedLevels")} twoPhase=${word(block, "twoPhaseLevels")} ` +
            `bottomUp=${word(block, "bottomUpLevels")} overflow=${word(block, "overflowLevels")} ` +
            `arcsScanned=${word(block, "arcsScanned")}`,
    );
}

/**
 * Times one call end to end from a released core: `setup` hands the snapshot over, `teardown` releases it.
 * @param ctx - the context the call runs on
 * @param name - the row name
 * @param s - the snapshot
 * @param run - the call
 * @returns the result
 */
function timed(
    ctx: GpuContext,
    name: string,
    s: GraphSnapshot,
    run: (input: GraphSnapshot) => Promise<unknown>,
): Promise<BenchResult> {
    return bench(
        BFS_GROUP,
        name,
        {
            setup: () => s,
            run,
            teardown: (input) => {
                ctx.release(input);
            },
        },
        { device: ctx.device, items: s.nodeCount, unit: "nodes" },
    );
}

/**
 * The grid row: a second device wrapped by the leak counter BEFORE a context adopts it, the self-check paid, one
 * traversal counted and printed, then the timed row on that context. The Dawn handle outlives the device's loss
 * (P1-T1: a GPU object collected while its device tears down crashes the process).
 * @param adapterName - the Dawn adapter substring run.ts was given (GRAPHTY_GPU_ADAPTER), if any
 * @returns the row
 */
async function gridRow(adapterName: string | undefined): Promise<BenchResult> {
    const handle = await createNodeGpu({ adapter: adapterName, installGlobals: false });
    const adapter = await handle.gpu.requestAdapter();
    if (adapter === null) {
        handle.dispose();
        throw new Error("bfs: requestAdapter() returned null for the counted device");
    }
    const device = await requestDevice(adapter, {
        label: "bench/bfs-counted",
        requiredLimits: buildRequiredLimits(adapter, "raise"),
        requiredFeatures: buildRequiredFeatures(adapter, [], ["subgroups", "timestamp-query"]),
    });
    const counter = LeakCounter.wrap(device);
    const own = await GpuContext.create({ device, runtime: "node", label: "bench/bfs-counted" });
    try {
        const s = unweightedSnapshotOf(gridEdges(GRID_SIDE, GRID_SIDE), `bfs/grid${GRID_SIDE}`);
        await verifyDevice(own);
        counter.resetMapAsync();
        const result = await breadthFirstSearch(own, s, SOURCE);
        const maps = counter.mapAsyncCalls;
        own.release(s);
        console.log(
            `[bfs] grid${GRID_SIDE} levels=${result.levels} mapAsync=${maps} ` +
                `(PD-7 bound ceil(levels / 32) + 1 = ${Math.ceil(result.levels / 32) + 1}; asserted by test/limits/bfs-large.test.ts)`,
        );
        return await timed(own, gridRowName(result.levels), s, (input) => breadthFirstSearch(own, input, SOURCE));
    } finally {
        counter.restore();
        own.dispose();
        device.destroy();
        await own.lost;
        handle.dispose();
    }
}

/**
 * Run the BFS and SSSP benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runBfsBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const rung of BFS_RMAT_RUNGS) {
        const edges = rmatEdges(rung.scale, rung.edgeFactor, SEED);
        const s = unweightedSnapshotOf(edges, `bfs/${rung.name}`);
        const auto = `bfs auto at ${rung.name}`;
        await printChoices(ctx, s, auto, "auto");
        results.push(await timed(ctx, auto, s, (input) => breadthFirstSearch(ctx, input, SOURCE)));
        const topDown = `bfs top-down at ${rung.name}`;
        await printChoices(ctx, s, topDown, "top-down");
        results.push(
            await timed(ctx, topDown, s, (input) =>
                bfsWithTuning(ctx, input, SOURCE, undefined, { direction: "top-down" }),
            ),
        );
        const weighted = snapshotOf(reweighted(edges), { label: `sssp/${rung.name}` });
        const name = `sssp at ${rung.name}`;
        try {
            const reached = await sssp(ctx, weighted, SOURCE);
            console.log(`[sssp] ${name} reached=${reached.reachedCount}`);
        } catch (error) {
            // the near-far queue binds 8 x roundUp(arcCount, 64) bytes whole (DEP-P8-E: the relax is never windowed):
            // a device whose binding limit is below that (lavapipe's 128 MiB at 1M / 10M) has no row, not a crash
            if (!isWebGpuGraphError(error) || error.code !== "E_TOO_LARGE") {
                throw error;
            }
            ctx.release(weighted);
            console.log(`[sssp] ${name}: no row (${error.message})`);
            continue;
        }
        ctx.release(weighted);
        results.push(await timed(ctx, name, weighted, (input) => sssp(ctx, input, SOURCE)));
    }
    results.push(await gridRow(process.env.GRAPHTY_GPU_ADAPTER));
    return results;
}
