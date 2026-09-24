/**
 * The behaviour pins of the ForceAtlas2 grid tier (spec 7.7, 7.8, 7.13, 7.16, 11.4; P4-T10): the grid tier on karate,
 * random1k and rmat14 in 2D and 3D (finite, the grid stats, run twice bitwise); the 7.8 tier rule by `n` alone;
 * `deterministic` selecting the radix or the counting sort; `nearMax` on the one-cell fixtures and the all-coincident
 * start (every node in one cell: `maxCellOccupancy === n`); the software saturation case (`gridMax2D: 32`); the
 * fixed mask, `setPosition` and `reheat()` on the grid tier; the empty graph and the single node; the grid buffers
 * through `inspect()` and the stage stops of `debugRunStages`; `nearMax: 1` rejected; z === center.z in 2D; a batch
 * above the profiler's pass budget (PD-16: three passes per grid iteration) reporting msPerIteration from the wall
 * time. No derived tolerance and no literal one: every check is bitwise, a count, a sign or finiteness (the
 * exact-vs-grid comparison is P4-T11's).
 */

import { type F32, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";

import { PROFILER_QUERY_SLOTS } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { WebGpuGraphError } from "../../src/errors.js";
import { createForceAtlas2, resolveLayoutTuning } from "../../src/layouts/forceatlas2.js";
import { gridSpecFor } from "../../src/primitives/grid.js";
import { type ForceAtlas2Stats, type GpuLayoutTuning } from "../../src/types/layout.js";
import { type ForceAtlas2Options } from "../../src/types/options.js";
import {
    BASE_OPTIONS,
    createSim,
    type Fa2Sim,
    type ParityGraph,
    paritySnapshot,
    startPositions,
} from "../helpers/fa2-parity.js";
import { fixture, pathEdges, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;

/** The grid tuning every case starts from (paper mode, an explicit grid). */
const GRID: GpuLayoutTuning = Object.freeze({ repulsion: "grid", compat: "paper" });

/** One run's positions and stats. */
interface Run {
    readonly positions: F32;
    readonly stats: ForceAtlas2Stats;
}

/**
 * One layout of `iterations` iterations in batches of `batch` from `start` (copied), disposed afterwards.
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the stride-3 start positions (NaN rows are seeded)
 * @param options - the FA2 options
 * @param tuning - the GPU tuning
 * @param iterations - the iteration count
 * @param batch - the batch size
 * @returns the positions and the final stats
 */
async function layout(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    iterations: number,
    batch: number,
): Promise<Run> {
    const sim = createSim(ctx, options, tuning);
    try {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const stats = await sim.run({ maxIter: iterations, batch });
        return { positions, stats };
    } finally {
        sim.dispose();
    }
}

/**
 * The same layout twice; the second run must be bitwise the first (spec 7.16; every kernel test runs twice).
 * @param ctx - the context
 * @param s - the snapshot
 * @param start - the start positions
 * @param options - the FA2 options
 * @param tuning - the GPU tuning
 * @param iterations - the iteration count
 * @param batch - the batch size
 * @returns the first run
 */
async function layoutTwice(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: ForceAtlas2Options,
    tuning: GpuLayoutTuning,
    iterations: number,
    batch: number,
): Promise<Run> {
    const a = await layout(ctx, s, start, options, tuning, iterations, batch);
    const b = await layout(ctx, s, start, options, tuning, iterations, batch);
    expectBitwiseEqual(a.positions, b.positions, `${s.nodeCount} nodes: run twice`);
    return a;
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
 * The grid stats a landed batch on the grid tier reports.
 * @param stats - the stats
 * @param label - the failure label
 */
function expectGridStats(stats: ForceAtlas2Stats, label: string): void {
    expect(stats.repulsionTier, `${label}: tier`).toBe("grid");
    expect(stats.maxCellOccupancy, `${label}: maxCellOccupancy`).toBeGreaterThanOrEqual(1);
    expect(stats.outsideGrid, `${label}: outsideGrid`).toBeGreaterThanOrEqual(0);
}

/**
 * Stride-3 positions with every node at one point (the GRID_EXTENT_FLOOR case: every node in one finest cell).
 * @param n - the node count
 * @returns the positions
 */
function coincidentStart(n: number): F32 {
    const p = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
        p[3 * i] = 0.1;
        p[3 * i + 1] = 0.2;
        p[3 * i + 2] = 0;
    }
    return p;
}

/**
 * A positioned fixture's stride-3 positions (a throw when it supplies none).
 * @param name - the fixture name
 * @param scale - the fixture scale
 * @returns the snapshot and its positions
 */
function positioned(name: string, scale: number): { readonly snapshot: GraphSnapshot; readonly positions: F32 } {
    const f = fixture(name, scale);
    if (f.positions === null) {
        throw new Error(`fixture ${name} supplies no positions`);
    }
    return { snapshot: f.snapshot, positions: f.positions };
}

describe("FA2 grid tier behaviour (spec 7.7, 7.8, 11.4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "grid-behaviour" });
    });

    for (const name of ["karate", "random1k", "rmat14"] as const satisfies readonly ParityGraph[]) {
        for (const dim of [2, 3] as const) {
            it(
                `(1) repulsion: "grid" on ${name} in ${dim}D: 50 iterations finite, the grid stats, run twice bitwise`,
                async (t) => {
                    requireGpu(t);
                    const s = paritySnapshot(name, gpuScale(), false);
                    try {
                        const options = { ...BASE_OPTIONS, dim, seed: 7, maxInFlight: 1 };
                        const { positions, stats } = await layoutTwice(
                            ctx,
                            s,
                            startPositions(s, options, false),
                            options,
                            GRID,
                            50,
                            5,
                        );
                        expectFinite(positions, `${name} ${dim}D`);
                        expectGridStats(stats, `${name} ${dim}D`);
                        expect(stats.trace).toHaveLength(5);
                    } finally {
                        ctx.release(s);
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    it('(2) "auto" selects the tier by n alone: grid above exactMaxNodes, exact at or below it (spec 7.8)', async (t) => {
        requireGpu(t);
        const karate = paritySnapshot("karate", 1, false);
        const path8 = snapshotOf(pathEdges(8), { label: "path8" });
        const random1k = paritySnapshot("random1k", 1, false);
        try {
            const cases: [GraphSnapshot, GpuLayoutTuning, "exact" | "grid"][] = [
                [karate, { repulsion: "auto", exactMaxNodes: 8 }, "grid"],
                [path8, { repulsion: "auto", exactMaxNodes: 8 }, "exact"],
                [random1k, { repulsion: "auto" }, "exact"],
                [random1k, {}, "exact"],
            ];
            for (const [s, tuning, tier] of cases) {
                const sim = createSim(ctx, BASE_OPTIONS, tuning);
                try {
                    sim.load(s, startPositions(s, BASE_OPTIONS, false));
                    expect(sim.tier, `${s.nodeCount} nodes under ${JSON.stringify(tuning)}`).toBe(tier);
                    await sim.step(1);
                    expect(sim.stats.repulsionTier).toBe(tier);
                } finally {
                    sim.dispose();
                }
            }
        } finally {
            ctx.release(karate);
            ctx.release(path8);
            ctx.release(random1k);
        }
    });

    it(
        "(3) deterministic: true is bitwise reproducible through the radix sort; deterministic: false runs the counting sort and is finite",
        async (t) => {
            requireGpu(t);
            const own = await acquire({ label: "grid-behaviour/counting" });
            const s = paritySnapshot("random1k", gpuScale(), false);
            try {
                const start = startPositions(s, BASE_OPTIONS, false);
                await layoutTwice(ctx, s, start, BASE_OPTIONS, { ...GRID, deterministic: true }, 20, 5);
                const { positions, stats } = await layout(
                    own,
                    s,
                    start,
                    BASE_OPTIONS,
                    { ...GRID, deterministic: false },
                    20,
                    5,
                );
                expectFinite(positions, "counting sort");
                expectGridStats(stats, "counting sort");
                const keys = own.pipelines.keys();
                expect(
                    keys.some((k) => k.startsWith("counting-scatter|")),
                    "the counting path compiled",
                ).toBe(true);
                expect(
                    keys.some((k) => k.startsWith("radix-scatter|")),
                    "the radix path never compiled",
                ).toBe(false);
            } finally {
                ctx.release(s);
                own.release(s);
                own.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "(4) nearMax: 4 on onecell1025 and hubcell is finite; an all-coincident start puts every node in one cell (maxCellOccupancy === n)",
        async (t) => {
            requireGpu(t);
            const tuning: GpuLayoutTuning = { ...GRID, nearMax: 4 };
            for (const name of ["onecell1025", "hubcell"]) {
                const { snapshot, positions: start } = positioned(name, gpuScale());
                try {
                    const { positions, stats } = await layoutTwice(ctx, snapshot, start, BASE_OPTIONS, tuning, 10, 5);
                    expectFinite(positions, name);
                    expectGridStats(stats, name);
                } finally {
                    ctx.release(snapshot);
                }
            }
            const karate = paritySnapshot("karate", 1, false);
            try {
                const sim = createSim(ctx, BASE_OPTIONS, tuning);
                try {
                    const positions = coincidentStart(karate.nodeCount);
                    sim.load(karate, positions);
                    // the second K1 reads the first iteration's occupancy max: every node in one finest cell
                    await sim.step(2);
                    expect(sim.stats.maxCellOccupancy).toBe(karate.nodeCount);
                    expect(sim.stats.outsideGrid).toBe(0);
                    expectFinite(positions, "coincident");
                } finally {
                    sim.dispose();
                }
            } finally {
                ctx.release(karate);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        "(5) gridMax2D: 32 on random20k (the software saturation case) is finite with an occupancy max",
        async (t) => {
            requireGpu(t);
            const { snapshot, positions: start } = positioned("random20k", gpuScale());
            try {
                const { positions, stats } = await layoutTwice(
                    ctx,
                    snapshot,
                    start,
                    BASE_OPTIONS,
                    { ...GRID, gridMax2D: 32 },
                    10,
                    5,
                );
                expectFinite(positions, "random20k G = 32");
                expectGridStats(stats, "random20k G = 32");
            } finally {
                ctx.release(snapshot);
            }
        },
        CASE_TIMEOUT,
    );

    it("(6) setFixed pins a node on the grid tier, setPosition is honoured and reheats, reheat() resets the counters", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        try {
            const sim = createSim(ctx, BASE_OPTIONS, GRID);
            try {
                const positions = startPositions(s, BASE_OPTIONS, false);
                const pinned = Float32Array.from(positions.subarray(0, 3));
                const mask = makeMask(s.nodeCount);
                maskSet(mask, 0, true);
                sim.load(s, positions);
                sim.setFixed(mask);
                await sim.run({ maxIter: 20, batch: 5 });
                expectBitwiseEqual(positions.subarray(0, 3), pinned, "the fixed node never moved");
                expectFinite(positions, "fixed");
                sim.setPosition(0, 0.5, 0.25, 0);
                expect(sim.settled, "setPosition reheats").toBe(false);
                await sim.step(1);
                expectBitwiseEqual(
                    positions.subarray(0, 3),
                    Float32Array.from([0.5, 0.25, 0]),
                    "setPosition on a fixed node",
                );
                await sim.run({ maxIter: 200, batch: 10 });
                sim.reheat();
                expect(sim.settled).toBe(false);
                expect(sim.stats.repulsionTier).toBe("grid");
            } finally {
                sim.dispose();
            }
        } finally {
            ctx.release(s);
        }
    });

    it('(7) the empty graph and a single node under repulsion: "grid"', async (t) => {
        requireGpu(t);
        const empty = snapshotOf([], { nodeCount: 0, label: "empty" });
        const one = snapshotOf([], { nodeCount: 1, label: "one" });
        try {
            const sim = createSim(ctx, BASE_OPTIONS, GRID);
            try {
                const none = new Float32Array(0);
                sim.load(empty, none);
                expect(sim.tier).toBe("grid");
                await sim.step();
                expect(sim.iterationsDone).toBe(0);
                expect(sim.settled).toBe(true);
            } finally {
                sim.dispose();
            }
            expect(gridSpecFor(1, 2, resolveLayoutTuning(GRID)).g).toBe(8);
            const start = Float32Array.from([0.8, 0.6, 0]);
            const { positions, stats } = await layoutTwice(
                ctx,
                one,
                start,
                { ...BASE_OPTIONS, maxIter: 10, settleWindow: 200 },
                GRID,
                10,
                5,
            );
            expectBitwiseEqual(positions, start, "paper: one node stays put on the grid tier");
            expect(stats.repulsionTier).toBe("grid");
            expect(stats.maxCellOccupancy).toBe(1);
            expect(stats.outsideGrid).toBe(0);
        } finally {
            ctx.release(empty);
            ctx.release(one);
        }
    });

    it("(8) the grid buffers resolve through inspect() on the grid tier only; debugRunStages stops after G3 and after G7", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("random1k", gpuScale(), false);
        const n = s.nodeCount;
        try {
            const grid: Fa2Sim = createSim(ctx, BASE_OPTIONS, GRID);
            try {
                grid.load(s, startPositions(s, BASE_OPTIONS, false));
                const { inspect, debugRunStages } = grid;
                if (inspect === undefined || debugRunStages === undefined) {
                    throw new Error("ctx.debug.inspect was not honoured");
                }
                await debugRunStages("G3");
                const { cells } = gridSpecFor(n, 2, resolveLayoutTuning(GRID));
                const cellStart = await inspect("cellStart");
                expect(cellStart).toBeInstanceOf(Uint32Array);
                expect(cellStart).toHaveLength(cells + 2);
                expect(cellStart[cells + 1], "the scan closes at n").toBe(n);
                expect(cellStart[0]).toBe(0);
                for (const name of ["cellKey", "sortedIdx", "pyramid", "hubList", "hubCounters"]) {
                    const words = await inspect(name);
                    expect(words.length, name).toBeGreaterThan(0);
                }
                const sortedIdx = await inspect("sortedIdx");
                expect(sortedIdx).toBeInstanceOf(Uint32Array);
                expect(new Set(sortedIdx.subarray(0, n)).size, "sortedIdx is a permutation").toBe(n);
                await debugRunStages("G7");
                const force = await inspect("force");
                expect(force).toBeInstanceOf(Float32Array);
                expectFinite(force as F32, "force after G7");
            } finally {
                grid.dispose();
            }
            const exact: Fa2Sim = createSim(ctx, BASE_OPTIONS, { repulsion: "exact", compat: "paper" });
            try {
                exact.load(s, startPositions(s, BASE_OPTIONS, false));
                let caught: unknown = null;
                try {
                    await exact.inspect?.("cellKey");
                } catch (err) {
                    caught = err;
                }
                expect(caught).toBeInstanceOf(WebGpuGraphError);
                if (caught instanceof WebGpuGraphError) {
                    expect(caught.code).toBe("E_INVALID_ARGUMENT");
                }
                // the union stage list: a grid stage name is valid on the exact tier and stops after K3 (PD-17)
                await exact.debugRunStages?.("G5");
                const force = await exact.inspect?.("force");
                expect(force).toBeInstanceOf(Float32Array);
            } finally {
                exact.dispose();
            }
        } finally {
            ctx.release(s);
        }
    });

    it("(9) resolveLayoutTuning rejects nearMax: 1 (DEP-P4-M) and accepts 2", () => {
        let caught: unknown = null;
        try {
            resolveLayoutTuning({ nearMax: 1 });
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(WebGpuGraphError);
        if (caught instanceof WebGpuGraphError) {
            expect(caught.code).toBe("E_INVALID_ARGUMENT");
            expect(caught.details.argument).toBe("nearMax");
        }
        expect(resolveLayoutTuning({ nearMax: 2 }).nearMax).toBe(2);
    });

    it("(10) 2D writes z === center.z on the grid tier whatever z was uploaded (spec 7.13)", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        try {
            const options: ForceAtlas2Options = { ...BASE_OPTIONS, dim: 2, center: [0.1, 0.2, 0.3] };
            const start = startPositions(s, options, false);
            for (let i = 0; i < s.nodeCount; i++) {
                start[3 * i + 2] = 5 + i;
            }
            const { positions } = await layoutTwice(ctx, s, start, options, GRID, 10, 5);
            for (let i = 0; i < s.nodeCount; i++) {
                expect(positions[3 * i + 2]).toBe(Math.fround(0.3));
            }
        } finally {
            ctx.release(s);
        }
    });

    it("(11) a grid batch above the profiler's pass budget reports msPerIteration from the wall time, not a timed prefix", async (t) => {
        requireGpu(t);
        if (ctx.profiler === null) {
            t.skip("timestamp-query not granted on this adapter");
        }
        // three passes per grid iteration plus fa2-to-scene (PD-16): a batch of 64 records 193 passes against a
        // budget of PROFILER_QUERY_SLOTS / 2, so the profiler times the first 128 and refuses the rest
        const k = 64;
        const budget = PROFILER_QUERY_SLOTS / 2;
        expect(3 * k + 1).toBeGreaterThan(budget);
        const s = paritySnapshot("karate", 1, false);
        const sim = createSim(ctx, { ...BASE_OPTIONS, seed: 7, maxInFlight: 1 }, GRID);
        try {
            sim.load(s, startPositions(s, BASE_OPTIONS, false));
            const stats = await sim.run({ maxIter: k, batch: k });
            expectGridStats(stats, "batch above the budget");
            const timings = sim.lastPassTimings;
            if (timings === null) {
                throw new Error("no pass timings landed with the profiler enabled");
            }
            expect(timings).toHaveLength(budget);
            expect(timings.map((row) => row.label).slice(0, 3)).toEqual(["fa2-k1", "fa2-attraction", "fa2-grid"]);
            let ns = 0;
            for (const row of timings) {
                ns += row.ns;
            }
            const { msPerIteration } = stats;
            if (msPerIteration === null) {
                throw new Error("msPerIteration is null after a landed batch");
            }
            expect(Number.isFinite(msPerIteration) && msPerIteration > 0).toBe(true);
            // the defect: the sum of the 128 timed passes (42 iterations) divided by k, computed exactly as the
            // simulation would; the wall time of the whole batch is never that value
            expect(msPerIteration).not.toBe(ns / 1e6 / k);
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });

    it("createForceAtlas2 with the grid tuning returns a simulation whose stats name the grid tier after one step", async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        const sim = createForceAtlas2(ctx, { ...BASE_OPTIONS, ...GRID });
        try {
            const positions = startPositions(s, BASE_OPTIONS, false);
            sim.load(s, positions);
            await sim.step(1);
            expect(sim.stats.repulsionTier).toBe("grid");
            expect(sim.stats.maxCellOccupancy).toBe(0);
            expectFinite(positions, "one step");
        } finally {
            sim.dispose();
            ctx.release(s);
        }
    });
});
