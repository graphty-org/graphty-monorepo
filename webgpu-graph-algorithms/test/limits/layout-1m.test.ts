/**
 * The G4 layout items at scale (spec 11.4 `:3577-3581`, 13 row P4; P4-T15): (1) the one-iteration force-field
 * comparison at 1M nodes / 20M arcs -- exactVsGrid against the EXACT GPU tier from the same start (PD-19), RMS and
 * p99 under the derived grid-exact tolerances (PD-20), the grid force bitwise across two runs; (2) unbiasedness at 1M
 * on the hubcell fixture (every node in ONE finest cell: the "1M-entry hub cell" through G4b): the UNBIASED_1M_SEEDS
 * mean of the force after G7 at nearMax 8 within grid-unbiased of the exact tier's over the whole force field, the
 * ladder from 32 seeds printed at every rung (grid-exact.test.ts case 3's item at scale; G4-F2); (3) at 262,144 nodes (the finest-grid
 * saturation size, spec 7.7): exactVsGrid, and the 200-iteration distributional comparison within
 * grid-distributional over the O(m) and sampled metrics -- the edge-length quantiles, the spread and the
 * nearest-neighbour histogram of every 32nd node (test/helpers/metrics.ts's layoutMetrics runs a BFS from every node
 * for the stress and an all-pairs nearest-neighbour search, hours at this size; the sampled histogram is the same
 * statistic on both tiers); (4) the 1M grid run of 100 iterations in batches of 8 is finite, twice bitwise, with
 * `stats.msPerIteration` printed for the record (T-6's number is the benchmark's; this is the lane's). The 1M
 * 200-iteration comparison of 11.4 is the owner's dev-box run of P4-T15 Step 2 (`benchmarks/layout-run.ts`), never a
 * lane's.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { distributionalError, startPositions, withSim } from "../helpers/fa2-parity.js";
import { randomEdges, snapshotOf } from "../helpers/graphs.js";
import {
    EXACT_TUNING,
    exactVsGrid,
    GRID_BASE_OPTIONS,
    GRID_TUNING,
    gridFixture,
    gridTolerance,
    NEAR_MAX_SAMPLING,
    UNBIASED_LADDER_FIRST,
    unbiasedLadder,
} from "../helpers/grid-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { edgeLengthQuantiles, nearestNeighbourHistogram, spread } from "../helpers/metrics.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const MILLION = 1_000_000;
/** The finest-grid saturation size: 512^2 cells at one node per cell (spec 7.7). */
const SATURATION = 262_144;
/** Edges per node of the random graphs (10 n edges: 20 n arcs). */
const EDGE_FACTOR = 10;
/** The hubcell fixture's scale factors: 20,000 x {1, 5, 12.5, 50} = 20k, 100k, 250k and the asserted 1M. */
const HUBCELL_LADDER: readonly number[] = [1, 5, 12.5, 50];
/**
 * The seeds of the 1M unbiasedness item: a quarter of grid-exact's UNBIASED_SEEDS, because a 1M grid iteration with
 * its readback and f64 fold costs ~0.2 s (1,024 seeds: ~3.5 min of the case's 600 s) and the 1M hub cell's
 * whole-field ratio is already 7.1e-2 at 128 seeds and falls as 1 / sqrt(seeds) (`tmp/p4/close/f2close/ladder-hubcell-1m-nvidia.log`, the G4 record's item 8).
 */
const UNBIASED_1M_SEEDS = 1024;
const DISTRIBUTIONAL_ITERATIONS = 200;
/** Every NN_STRIDE-th node enters the nearest-neighbour histogram (8,192 of 262,144). */
const NN_STRIDE = 32;
const NN_BINS = 8;
const RUN_ITERATIONS = 100;
const RUN_BATCH = 8;

/**
 * A seeded random snapshot of n nodes and EDGE_FACTOR n edges with its seeded scene start.
 * @param n - the node count
 * @param label - the snapshot label
 * @returns the snapshot and the start
 */
function randomGraph(n: number, label: string): { readonly snapshot: GraphSnapshot; readonly start: F32 } {
    const t0 = performance.now();
    const snapshot = snapshotOf(randomEdges(n, EDGE_FACTOR * n, 41), { nodeCount: n, label });
    const start = startPositions(snapshot, GRID_BASE_OPTIONS, false);
    console.warn(
        `[layout-1m] ${label}: ${n} nodes / ${snapshot.arcCount} arcs built in ${(performance.now() - t0).toFixed(0)} ms`,
    );
    return { snapshot, start };
}

/**
 * The positions of one tier after DISTRIBUTIONAL_ITERATIONS iterations from `start`, and the run's stats.
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the scene start
 * @param tuning - the tier
 * @param iterations - the iteration count
 * @param batch - the batch size
 * @returns the positions and the final msPerIteration
 */
async function positionsAfter(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    tuning: GpuLayoutTuning,
    iterations: number,
    batch: number,
): Promise<{ readonly positions: F32; readonly msPerIteration: number | null }> {
    return await withSim(ctx, GRID_BASE_OPTIONS, tuning, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const stats = await sim.run({ maxIter: iterations, batch });
        return { positions, msPerIteration: stats.msPerIteration };
    });
}

/**
 * The scale-feasible metrics of a layout: the edge-length quantiles (O(m)), the spread (O(n)) and the self-normalised
 * nearest-neighbour histogram of every NN_STRIDE-th node (O((n / NN_STRIDE)^2)), as one record distributionalError
 * compares.
 * @param s - the snapshot
 * @param positions - the stride-3 positions
 * @returns the record
 */
function sampledMetrics(s: GraphSnapshot, positions: F32): Record<string, number> {
    const n = s.nodeCount;
    const record: Record<string, number> = {};
    const [edgeQ10, edgeQ50, edgeQ90] = edgeLengthQuantiles(s, positions, 2, [0.1, 0.5, 0.9]);
    record.edgeQ10 = edgeQ10;
    record.edgeQ50 = edgeQ50;
    record.edgeQ90 = edgeQ90;
    record.spread = spread(positions, n, 2);
    const count = Math.ceil(n / NN_STRIDE);
    const sample = new Float32Array(3 * count);
    for (let k = 0; k < count; k++) {
        sample.set(positions.subarray(3 * k * NN_STRIDE, 3 * k * NN_STRIDE + 3), 3 * k);
    }
    nearestNeighbourHistogram(sample, count, 2, NN_BINS).forEach((fraction, bin) => {
        record[`nnBin${bin}`] = fraction;
    });
    return record;
}

/**
 * Asserts every entry finite.
 * @param positions - the array
 * @param label - the failure label
 */
function expectFinite(positions: F32, label: string): void {
    for (let i = 0; i < positions.length; i++) {
        if (!Number.isFinite(positions[i])) {
            throw new Error(`${label}: positions[${i}] = ${positions[i]}`);
        }
    }
}

/**
 * exactVsGrid twice (the grid force bitwise across the runs), asserted under the derived tolerances and printed.
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the scene start
 * @param label - the case label
 */
async function checkExactVsGrid(ctx: GpuContext, s: GraphSnapshot, start: F32, label: string): Promise<void> {
    const rmsTolerance = gridTolerance("grid-exact.rms").value;
    const p99Tolerance = gridTolerance("grid-exact.p99").value;
    const t0 = performance.now();
    const a = await exactVsGrid(ctx, s, start, GRID_BASE_OPTIONS);
    const t1 = performance.now();
    const b = await exactVsGrid(ctx, s, start, GRID_BASE_OPTIONS);
    expectBitwiseEqual(a.grid, b.grid, `${label}: run 1 vs run 2`);
    console.warn(
        `[layout-1m] exact-vs-grid/${label}: rms ${a.rms.toExponential(3)} (tolerance ${rmsTolerance.toExponential(3)}), p99 ${a.p99.toExponential(3)} (tolerance ${p99Tolerance.toExponential(3)}), max ${a.max.toExponential(3)}; one grid + one exact iteration ${(t1 - t0).toFixed(0)} ms`,
    );
    assertCheckPasses({ worst: ratioOf(a.rms, rmsTolerance), worstLabel: `${label}/rms`, samples: s.nodeCount });
    assertCheckPasses({ worst: ratioOf(a.p99, p99Tolerance), worstLabel: `${label}/p99`, samples: s.nodeCount });
}

describe("the 262k and 1M ForceAtlas2 fixtures (node-limits, spec 11.4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "limits/layout-1m" });
    });

    it("(1) 1M nodes / 20M arcs: one grid iteration against one exact iteration under grid-exact.rms / grid-exact.p99, twice bitwise", async (t) => {
        requireGpu(t);
        const { snapshot: s, start } = randomGraph(MILLION, "limits/random-1m");
        try {
            await checkExactVsGrid(ctx, s, start, `random/n=${s.nodeCount}`);
        } finally {
            ctx.release(s);
        }
    });

    it(`(2) hubcell at 1M (the 1M-entry hub cell) at nearMax ${NEAR_MAX_SAMPLING}: the ${UNBIASED_1M_SEEDS}-seed mean of the force after G7 within grid-unbiased of the exact tier's over the whole force field (the 20k / 100k / 250k rungs and the ladder from ${UNBIASED_LADDER_FIRST} seeds printed)`, async (t) => {
        requireGpu(t);
        const tolerance = gridTolerance("grid-unbiased").value;
        for (const scale of HUBCELL_LADDER) {
            const { snapshot: s, start } = gridFixture("hubcell", scale, GRID_BASE_OPTIONS);
            try {
                const t0 = performance.now();
                const u = await unbiasedLadder(ctx, s, start, GRID_BASE_OPTIONS, UNBIASED_1M_SEEDS);
                const top = u.rungs[u.rungs.length - 1];
                console.warn(
                    `[layout-1m] unbiased/hubcell/n=${s.nodeCount}: |mean - exact| / |exact| over the whole force field at ${top.seeds} seeds ${top.field.toExponential(3)} (tolerance ${tolerance.toExponential(3)}); rms of the floored per-node error of the same mean ${top.rms.toExponential(3)}, of one seed ${u.rmsOneSeed.toExponential(3)}; the exact iteration and ${UNBIASED_1M_SEEDS} grid iterations ${(performance.now() - t0).toFixed(0)} ms`,
                );
                console.warn(
                    `[layout-1m] unbiased/hubcell/n=${s.nodeCount} ladder (seeds: whole-field ratio / per-node rms): ${u.rungs.map((r) => `${r.seeds}: ${r.field.toExponential(3)} / ${r.rms.toExponential(3)}`).join("; ")}`,
                );
                if (s.nodeCount === MILLION) {
                    assertCheckPasses({
                        worst: ratioOf(top.field, tolerance),
                        worstLabel: "unbiased/hubcell-1m",
                        samples: s.nodeCount,
                    });
                }
            } finally {
                ctx.release(s);
            }
        }
    });

    it(`(3) ${SATURATION} nodes (the finest-grid saturation size): exactVsGrid, and the ${DISTRIBUTIONAL_ITERATIONS}-iteration distributional comparison within grid-distributional`, async (t) => {
        requireGpu(t);
        const { snapshot: s, start } = randomGraph(SATURATION, "limits/random-262k");
        try {
            await checkExactVsGrid(ctx, s, start, `random/n=${s.nodeCount}`);
            const tolerance = gridTolerance("grid-distributional").value;
            const t0 = performance.now();
            const g = await positionsAfter(ctx, s, start, GRID_TUNING, DISTRIBUTIONAL_ITERATIONS, 10);
            const t1 = performance.now();
            const e = await positionsAfter(ctx, s, start, EXACT_TUNING, DISTRIBUTIONAL_ITERATIONS, 10);
            const t2 = performance.now();
            expectFinite(g.positions, "grid 262k");
            expectFinite(e.positions, "exact 262k");
            const gm = sampledMetrics(s, g.positions);
            const em = sampledMetrics(s, e.positions);
            const err = distributionalError(gm, em);
            console.warn(
                `[layout-1m] distributional/n=${s.nodeCount}: worst metric difference ${err.toExponential(3)} (tolerance ${tolerance.toExponential(3)}); edgeQ50 grid ${gm.edgeQ50.toFixed(4)} exact ${em.edgeQ50.toFixed(4)}, spread grid ${gm.spread.toFixed(4)} exact ${em.spread.toFixed(4)}; ${DISTRIBUTIONAL_ITERATIONS} iterations grid ${(t1 - t0).toFixed(0)} ms, exact ${(t2 - t1).toFixed(0)} ms`,
            );
            assertCheckPasses({
                worst: ratioOf(err, tolerance),
                worstLabel: `distributional/n=${s.nodeCount}`,
                samples: Object.keys(em).length,
            });
        } finally {
            ctx.release(s);
        }
    });

    it(`(4) the 1M grid run: ${RUN_ITERATIONS} iterations in batches of ${RUN_BATCH} finite, twice bitwise, msPerIteration printed`, async (t) => {
        requireGpu(t);
        const { snapshot: s, start } = randomGraph(MILLION, "limits/random-1m-run");
        try {
            const t0 = performance.now();
            const a = await positionsAfter(ctx, s, start, GRID_TUNING, RUN_ITERATIONS, RUN_BATCH);
            const wall = (performance.now() - t0) / RUN_ITERATIONS;
            expectFinite(a.positions, "grid 1M");
            console.warn(
                `[layout-1m] grid/n=${s.nodeCount}: stats.msPerIteration ${a.msPerIteration === null ? "null" : a.msPerIteration.toFixed(2)} ms (wall ${wall.toFixed(2)} ms per iteration over ${RUN_ITERATIONS})`,
            );
            const b = await positionsAfter(ctx, s, start, GRID_TUNING, RUN_ITERATIONS, RUN_BATCH);
            expectBitwiseEqual(a.positions, b.positions, "1M grid run twice");
        } finally {
            ctx.release(s);
        }
    });
});
