/**
 * The Fruchterman-Reingold and spring-electrical benchmarks (spec 10.4 T-14: "FR 10k / 100k nodes per-iteration numbers
 * recorded", gate G5; 11.7): one `createFruchtermanReingold` and one `createSpringElectrical` simulation per rung
 * (10k and 100k nodes, E = 10n, seeded G(n, m), 2D, `repulsion: "exact"`), each warmed by the clock warm-up burst of
 * layout-exact.bench.ts, then `step(1)` timed `runs` times with an untimed `reheat()` before every run. Two rows per
 * model per rung, in the shape of the `layout-exact` rows with a model tag in front:
 *
 *   <tag> step(1) wall n=<n> m=<m> 2D [<label>]        the wall time of one iteration, its toScene and the 12n readback
 *   <tag> ms/iteration (profiler|wall) n=<n> [<label>]  stats.msPerIteration after that step (the GPU time of the passes
 *                                                        when "timestamp-query" was granted, else the batch wall time)
 *
 * where `<tag>` is `fr` or `se`.
 *
 * PLAN DECISION PD-17 (P5-T8): T-14 names 10k and 100k. Both rungs are above the exact-tier crossover (src/constants.ts
 * EXACT_MAX_NODES, re-fixed at G4), so both run with `repulsion: "exact"` passed explicitly -- the tier the design's 7.21 row
 * "100k ... exact (for comparison)" measures for FA2. The preset gets the same two rungs in the same group: the design
 * lists one group for the phase, and a second model's rows cost one more loop. `warmClock` and `reportedRow` are the
 * exported helpers of layout-exact.bench.ts, not copies.
 *
 * FR runs with `iterations: 1_000_000` so the temperature stays positive under the per-run `reheat()` (which restarts
 * the temperature index at 70% of the budget: t = 0.03 of the 0.1 start); the preset has no budget and never settles
 * between reheats (`reheat()` zeroes the settle count).
 */

import { type GpuContext } from "../src/context.js";
import { createFruchtermanReingold } from "../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../src/layouts/spring-electrical.js";
import { type GpuLayoutSimulation, type GpuLayoutTuning, type LayoutStatsBase } from "../src/types/layout.js";
import { type FruchtermanReingoldOptions, type SpringElectricalOptions } from "../src/types/options.js";
import { randomEdges, snapshotOf } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";
import { LADDER_EDGE_FACTOR, type LadderRung, reportedRow, warmClock } from "./layout-exact.bench.js";

/** The group name of every row this file produces (the key of benchmarks/run.ts GROUPS). */
export const LAYOUT_FR_GROUP = "layout-fr";

/** The two rungs of T-14: 10k (the exact tier's own size) and 100k (the exact tier forced, PD-17). */
export const FR_RUNGS: readonly LadderRung[] = [
    { label: "10k", nodes: 10_000 },
    { label: "100k", nodes: 100_000 },
];

/** The seed of every rung's G(n, m) and of the simulation's LCG (graph-format's benchmark seed). */
const SEED = 12345;

/** The least wall time of the untimed clock warm-up burst before a rung's timed runs (layout-exact.bench.ts, G3-F1). */
const CLOCK_WARM_MS = 500;

/** The FR options of every rung: 2D, one iteration per step, one batch in flight, the exact tier, a budget reheat() keeps positive. */
const FR_OPTIONS: FruchtermanReingoldOptions & GpuLayoutTuning = {
    dim: 2,
    seed: SEED,
    iterations: 1_000_000,
    iterationsPerStep: 1,
    maxInFlight: 1,
    repulsion: "exact",
};

/** The spring-electrical options of every rung: ngraph's defaults, 2D, one iteration per step, one batch in flight, the exact tier. */
const SE_OPTIONS: SpringElectricalOptions & GpuLayoutTuning = {
    dim: 2,
    seed: SEED,
    iterationsPerStep: 1,
    maxInFlight: 1,
    repulsion: "exact",
};

/** One model of the group: its row tag and its factory over the rung's options. */
interface Model {
    readonly tag: string;
    readonly create: (ctx: GpuContext) => GpuLayoutSimulation<object, LayoutStatsBase>;
}

const MODELS: readonly Model[] = [
    { tag: "fr", create: (ctx) => createFruchtermanReingold(ctx, FR_OPTIONS) },
    { tag: "se", create: (ctx) => createSpringElectrical(ctx, SE_OPTIONS) },
];

/**
 * Run the FR / spring-electrical benchmarks: the two rungs, two models each, two rows per model.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones without --allow-software)
 * @returns the results
 */
export async function runLayoutFrBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    const source = ctx.profiler !== null && ctx.profiler.enabled ? "profiler" : "wall";
    for (const rung of FR_RUNGS) {
        const m = rung.nodes * LADDER_EDGE_FACTOR;
        const snapshot = snapshotOf(randomEdges(rung.nodes, m, SEED), { label: `layout-fr/${rung.label}` });
        const pairs = rung.nodes * (rung.nodes - 1);
        try {
            for (const model of MODELS) {
                const positions = new Float32Array(3 * rung.nodes).fill(Number.NaN);
                const sim = model.create(ctx);
                sim.load(snapshot, positions);
                const samples: number[] = [];
                try {
                    await warmClock(sim, CLOCK_WARM_MS);
                    const wall = await bench(
                        LAYOUT_FR_GROUP,
                        `${model.tag} step(1) wall n=${rung.nodes} m=${m} 2D [${rung.label}]`,
                        {
                            setup: () => {
                                sim.reheat();
                                return sim;
                            },
                            run: async (input) => {
                                await input.step(1);
                                samples.push(input.stats.msPerIteration ?? Number.NaN);
                                return input.stats;
                            },
                        },
                        { device: ctx.device, items: pairs, unit: "pairs" },
                    );
                    results.push(wall);
                    results.push(
                        reportedRow(
                            LAYOUT_FR_GROUP,
                            `${model.tag} ms/iteration (${source}) n=${rung.nodes} [${rung.label}]`,
                            samples,
                            wall.runs,
                            pairs,
                            "pairs",
                        ),
                    );
                } finally {
                    sim.dispose();
                }
            }
        } finally {
            ctx.release(snapshot);
        }
    }
    return results;
}
