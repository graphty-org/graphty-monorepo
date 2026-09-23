/**
 * The grid tier of the Fruchterman-Reingold and spring-electrical models through `LAW` (spec 7.20, 7.8; P4-T13;
 * PD-22): (1) on random20k (scaled) and on the one-cell karate placement of test/helpers/grid-law.ts (33 nodes in
 * one finest cell: the repulsion is the near field), 2D and 3D, each model's grid-tier repulsion against its OWN
 * exact tier's (K3 with LAW 1 / 2, the P5 kernels) from the same start on the same adapter -- the whole repulsion
 * (the force after the repulsion stage minus the force after K2: the floored per-node error's RMS and p99) and, on
 * random20k, the far field alone (G6 against an f64 pair sum over the pairs outside the 3x3 on a node sample: the
 * whole-field relative error under the rms cap) -- under the FA2 caps of T11 (grid-exact.rms, grid-exact.p99; the
 * approximation is the same construction, so no new noise row), twice bitwise first; (2) the FR grid run on the story graph is finite and cools (the temperature
 * trace decreases); the spring grid run on the story graph settles by the shared 7.17 rule within 1,000 iterations
 * with its kinetic energy fallen 100x (the exact tier's G5 gate item, test/layouts/se-settle.test.ts, on the grid
 * tier); (3) the pipeline keys of the two runs carry LAW 1 / 2 on grid-far-field and grid-near-field; (4) "auto"
 * with exactMaxNodes 8 sends both models to the grid on karate. Every tolerance goes through gridTolerance(id).
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutTuning, type LayoutStatsBase } from "../../src/types/layout.js";
import { paritySnapshot } from "../helpers/fa2-parity.js";
import { FR_BASE_OPTIONS } from "../helpers/fr-parity.js";
import {
    LAW_FIXTURES,
    LAW_GRID_TUNING,
    LAW_OF,
    lawExactVsGrid,
    lawFixture,
    type LawModel,
} from "../helpers/grid-law.js";
import { gridTolerance } from "../helpers/grid-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { SE_BASE_OPTIONS } from "../helpers/se-parity.js";
import { storyGraph } from "../helpers/story-graph.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 600_000;
const MODELS: readonly LawModel[] = ["fr", "se"];
/** The FR story-graph run: 200 iterations in batches of 10. */
const STORY_ITERATIONS = 200;
const STORY_BATCH = 10;
/** The spring story-graph run: batches of 8 until settled or MAX_STEPS (the se-settle protocol). */
const SE_BATCH = 8;
const MAX_STEPS = 1000;
/** The kinetic-energy fall the spring run must show between its first batch and its stop. */
const ENERGY_FALL = 100;

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
function expectGridStats(stats: LayoutStatsBase, label: string): void {
    expect(stats.repulsionTier, `${label}: tier`).toBe("grid");
    expect(stats.maxCellOccupancy, `${label}: maxCellOccupancy`).toBeGreaterThanOrEqual(1);
    expect(stats.outsideGrid, `${label}: outsideGrid`).toBeGreaterThanOrEqual(0);
}

/** One FR grid run on the story graph: the positions and every batch's temperature records in order. */
interface FrRun {
    readonly positions: F32;
    readonly temperatures: number[];
}

/**
 * The FR grid run: STORY_ITERATIONS iterations in batches of STORY_BATCH from the seeded start, the temperature of
 * every record collected across the batches.
 * @param ctx - the context
 * @param s - the story graph
 * @param tuning - the grid tuning
 * @returns the run
 */
async function frStoryRun(ctx: GpuContext, s: GraphSnapshot, tuning: GpuLayoutTuning): Promise<FrRun> {
    const sim = createFruchtermanReingold(ctx, { ...FR_BASE_OPTIONS, iterations: STORY_ITERATIONS, ...tuning });
    try {
        const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        sim.load(s, positions);
        const temperatures: number[] = [];
        for (let done = 0; done < STORY_ITERATIONS; done += STORY_BATCH) {
            await sim.step(STORY_BATCH);
            for (const record of sim.stats.trace) {
                temperatures.push(record.temperature);
            }
            expectGridStats(sim.stats, `fr/story after ${sim.iterationsDone}`);
        }
        return { positions, temperatures };
    } finally {
        sim.dispose();
    }
}

/** One spring grid run on the story graph: the positions, the first batch's energy, the last folded one, the stop. */
interface SeRun {
    readonly positions: F32;
    readonly firstBatchEnergy: number;
    readonly lastEnergy: number;
    readonly iterationsDone: number;
    readonly settled: boolean;
}

/**
 * The spring grid run: ngraph's defaults (seed 42, the shared settle rule) on the story graph until settled or
 * MAX_STEPS, as test/layouts/se-settle.test.ts runs the exact tier.
 * @param ctx - the context
 * @param s - the story graph
 * @param tuning - the grid tuning
 * @returns the run
 */
async function seStoryRun(ctx: GpuContext, s: GraphSnapshot, tuning: GpuLayoutTuning): Promise<SeRun> {
    const sim = createSpringElectrical(ctx, { seed: 42, maxInFlight: 1, ...tuning });
    try {
        const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        sim.load(s, positions);
        await sim.step(SE_BATCH);
        const firstBatchEnergy = sim.stats.kineticEnergy;
        const stats = await sim.run({ maxIter: MAX_STEPS, batch: SE_BATCH });
        expectGridStats(stats, "se/story");
        return {
            positions,
            firstBatchEnergy,
            lastEnergy: stats.kineticEnergy,
            iterationsDone: sim.iterationsDone,
            settled: sim.settled,
        };
    } finally {
        sim.dispose();
    }
}

describe("the FR and spring-electrical grid tier through LAW (spec 7.20, 7.8; PD-22)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "grid-law" });
    });

    for (const model of MODELS) {
        for (const name of LAW_FIXTURES) {
            for (const dim of [2, 3] as const) {
                it(
                    `(1) ${model}/${name}/${dim}d: the grid tier's repulsion, whole and far field alone, against its own exact tier's (LAW ${LAW_OF[model]}) under grid-exact.rms / grid-exact.p99, twice bitwise`,
                    async (t) => {
                        requireGpu(t);
                        const rmsTolerance = gridTolerance("grid-exact.rms").value;
                        const p99Tolerance = gridTolerance("grid-exact.p99").value;
                        const { snapshot: s, start } = lawFixture(name);
                        try {
                            const label = `${model}/${name}/${dim}d/n=${s.nodeCount}`;
                            const a = await lawExactVsGrid(ctx, model, name, s, start, dim);
                            const b = await lawExactVsGrid(ctx, model, name, s, start, dim);
                            expectBitwiseEqual(a.total.grid, b.total.grid, `${label}: run 1 vs run 2`);
                            expectBitwiseEqual(a.total.exact, b.total.exact, `${label}: exact run 1 vs run 2`);
                            const far =
                                a.far === null
                                    ? ""
                                    : `; far field alone ${a.far.error.toExponential(3)} over ${Math.floor(a.far.reference.length / 3)} nodes`;
                            console.warn(
                                `[grid-law] ${label}: rms ${a.total.rms.toExponential(3)} (tolerance ${rmsTolerance.toExponential(3)}), p99 ${a.total.p99.toExponential(3)} (tolerance ${p99Tolerance.toExponential(3)}), max ${a.total.max.toExponential(3)}${far}`,
                            );
                            assertCheckPasses({
                                worst: ratioOf(a.total.rms, rmsTolerance),
                                worstLabel: `${label}/rms`,
                                samples: s.nodeCount,
                            });
                            assertCheckPasses({
                                worst: ratioOf(a.total.p99, p99Tolerance),
                                worstLabel: `${label}/p99`,
                                samples: s.nodeCount,
                            });
                            if (a.far !== null && b.far !== null) {
                                expectBitwiseEqual(a.far.grid, b.far.grid, `${label}: far run 1 vs run 2`);
                                assertCheckPasses({
                                    worst: ratioOf(a.far.error, rmsTolerance),
                                    worstLabel: `${label}/far`,
                                    samples: Math.floor(a.far.reference.length / 3),
                                });
                            }
                        } finally {
                            ctx.release(s);
                        }
                    },
                    CASE_TIMEOUT,
                );
            }
        }
    }

    it(
        "(2, 3) the FR grid run on the story graph is finite and cools (the temperature trace decreases), twice bitwise; its pipeline keys carry LAW 1 on grid-far-field and grid-near-field",
        async (t) => {
            requireGpu(t);
            const s = storyGraph();
            try {
                const a = await frStoryRun(ctx, s, LAW_GRID_TUNING);
                const b = await frStoryRun(ctx, s, LAW_GRID_TUNING);
                expectBitwiseEqual(a.positions, b.positions, "fr/story: run 1 vs run 2");
                expectFinite(a.positions, "fr/story");
                expect(a.temperatures).toHaveLength(STORY_ITERATIONS);
                for (let i = 1; i < a.temperatures.length; i++) {
                    expect(a.temperatures[i], `record ${i}`).toBeLessThanOrEqual(a.temperatures[i - 1]);
                }
                expect(a.temperatures[a.temperatures.length - 1]).toBeLessThan(a.temperatures[0]);
                const keys = ctx.pipelines.keys();
                for (const id of ["grid-far-field", "grid-near-field"]) {
                    expect(
                        keys.some((k) => k.startsWith(`${id}|`) && k.includes('"LAW":1')),
                        `${id} compiled with LAW 1`,
                    ).toBe(true);
                }
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        `(2, 3) the spring grid run on the story graph settles within ${MAX_STEPS} iterations with its kinetic energy fallen ${ENERGY_FALL}x, finite, twice bitwise; its pipeline keys carry LAW 2 on grid-far-field and grid-near-field`,
        async (t) => {
            requireGpu(t);
            const s = storyGraph();
            try {
                const a = await seStoryRun(ctx, s, LAW_GRID_TUNING);
                const b = await seStoryRun(ctx, s, LAW_GRID_TUNING);
                expectBitwiseEqual(a.positions, b.positions, "se/story: run 1 vs run 2");
                expectFinite(a.positions, "se/story");
                console.warn(
                    `[grid-law] se/story: settled ${a.settled} at ${a.iterationsDone} iterations; kineticEnergy first batch ${a.firstBatchEnergy.toExponential(3)}, stop ${a.lastEnergy.toExponential(3)}`,
                );
                expect(a.settled, "settled by the shared rule").toBe(true);
                expect(a.iterationsDone).toBeLessThan(MAX_STEPS);
                expect(a.firstBatchEnergy).toBeGreaterThan(0);
                expect(Number.isFinite(a.lastEnergy)).toBe(true);
                expect(a.lastEnergy * ENERGY_FALL, "the system came to rest").toBeLessThanOrEqual(a.firstBatchEnergy);
                const keys = ctx.pipelines.keys();
                for (const id of ["grid-far-field", "grid-near-field"]) {
                    expect(
                        keys.some((k) => k.startsWith(`${id}|`) && k.includes('"LAW":2')),
                        `${id} compiled with LAW 2`,
                    ).toBe(true);
                }
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it('(4) "auto" with exactMaxNodes 8 sends both models to the grid on karate (spec 7.8: by n alone)', async (t) => {
        requireGpu(t);
        const s = paritySnapshot("karate", 1, false);
        const tuning: GpuLayoutTuning = { repulsion: "auto", exactMaxNodes: 8 };
        try {
            const fr = createFruchtermanReingold(ctx, { ...FR_BASE_OPTIONS, ...tuning });
            try {
                const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
                fr.load(s, positions);
                await fr.step(2);
                expectGridStats(fr.stats, "fr/auto");
                expectFinite(positions, "fr/auto");
            } finally {
                fr.dispose();
            }
            const se = createSpringElectrical(ctx, { ...SE_BASE_OPTIONS, ...tuning });
            try {
                const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
                se.load(s, positions);
                await se.step(2);
                expectGridStats(se.stats, "se/auto");
                expectFinite(positions, "se/auto");
            } finally {
                se.dispose();
            }
        } finally {
            ctx.release(s);
        }
    });
});
