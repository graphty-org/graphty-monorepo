/**
 * The attraction-gather scale ladder: the diagnostic behind finding G4-F16 (docs/decisions/G4.md section 7), which
 * recorded the `fa2-attraction` pass of the grid tier at 18.165 ms per iteration on the Tesla T4 of the GPU lane
 * against a 15 ms target and 1.493 ms for the same row on the dev box's RTX 4070 SUPER -- a factor of 12.2 where every
 * other row of the same pair of sessions sits between 2.8x and 5.7x. One point cannot say whether that is what the T4
 * class of card does or an inefficiency the faster card hides, so this group measures the same pass across a ladder of
 * node counts and leaves the ratio between the two cards to be read rung by rung.
 *
 * The pass is an indirect gather: `row_force_dense` walks a CSR row of `colIdx` (contiguous, streamed) and reads
 * `pos[nbr]` at each arc (scattered). `pos` is a `vec4f` (xyz + mass, D23), so the gather's working set is exactly
 * 16 bytes per node, and the ladder is chosen in those terms: from a working set comfortably inside the smaller
 * card's last-level cache to one outside both. E = 10n at every rung, as the exact and grid ladders use, so the arcs
 * per node -- and with them the degree tiers K2 selects -- stay the same shape from rung to rung and only the gather's
 * working set moves.
 *
 * Three rows per rung, all in 2D on the grid tier, under the clock warm-up burst and the `reheat()` + `step(1)`
 * protocol of layout-exact.bench.ts (G3-F1):
 *
 *   scale step(1) wall n=<n> m=<m> 2D [<label>]               the wall time of one iteration, its toScene and the 12n readback
 *   scale grid ms/iteration (profiler) n=<n> 2D [<label>]     stats.msPerIteration: the whole iteration's GPU time
 *   scale attraction ms/iteration (profiler) n=<n> 2D [<label>]  the `fa2-attraction` pass alone (PD-16 records the K2 tiers as one pass)
 *
 * The whole-iteration row is the control: the two cards' ratio on it at the same rung is what the gather's ratio has
 * to be read against. The group produces nothing without `timestamp-query` -- there is no per-pass figure to report
 * on an adapter that did not grant it -- and the row names are its own, so none of them collides with the T-6 / T-7
 * rows of `layout-grid` in benchmarks/results/<runner-class>.json.
 */

import { type GpuContext } from "../src/context.js";
import { ForceSimulation } from "../src/layouts/force-simulation.js";
import { createForceAtlas2 } from "../src/layouts/forceatlas2.js";
import { type ForceAtlas2Stats, type GpuLayoutSimulation, type GpuLayoutTuning } from "../src/types/layout.js";
import { type ForceAtlas2Options } from "../src/types/options.js";
import { randomEdges, snapshotOf } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";
import { LADDER_EDGE_FACTOR, type LadderRung, reportedRow, warmClock } from "./layout-exact.bench.js";

/** The group name of every row this file produces (the key of benchmarks/run.ts GROUPS). */
export const ATTRACTION_SCALE_GROUP = "attraction-scale";

/** Bytes of `pos` per node: one `vec4f`, xyz + the mass in `w` (D23). This is the gather's working set per node. */
export const POSITION_BYTES_PER_NODE = 16;

/**
 * The ladder, in working-set terms (`POSITION_BYTES_PER_NODE` x n): 0.25 MiB, 1 MiB, 4 MiB, 8 MiB, 16 MiB, 32 MiB,
 * 64 MiB. The Tesla T4 (Turing TU104) carries 4 MiB of L2 and the RTX 4070 SUPER (Ada AD104) tens of MiB, so the
 * first rungs are inside both caches, the middle rungs inside only the larger one, and the last outside both.
 */
export const ATTRACTION_LADDER: readonly LadderRung[] = [
    { label: "16k", nodes: 16_384 },
    { label: "65k", nodes: 65_536 },
    { label: "262k", nodes: 262_144 },
    { label: "524k", nodes: 524_288 },
    { label: "1M", nodes: 1_048_576 },
    { label: "2M", nodes: 2_097_152 },
    { label: "4M", nodes: 4_194_304 },
];

/** The profiler pass label of the K2 tiers on the grid tier (forceatlas2.ts recordIteration, PD-16). */
const ATTRACTION_PASS = "fa2-attraction";

/** The seed of every rung's G(n, m) and of the simulation's LCG (graph-format's benchmark seed). */
const SEED = 12345;

/** The least wall time of the untimed clock warm-up burst before a rung's timed runs (layout-exact.bench.ts, G3-F1). */
const CLOCK_WARM_MS = 500;

/** The simulation options of every rung: the grid tier in 2D, one iteration per step, one batch in flight, paper mode. */
const RUNG_OPTIONS: ForceAtlas2Options & GpuLayoutTuning = {
    dim: 2,
    seed: SEED,
    maxIter: 1_000_000,
    iterationsPerStep: 1,
    maxInFlight: 1,
    repulsion: "grid",
    compat: "paper",
};

/**
 * The `fa2-attraction` pass of the last landed batch, milliseconds (NaN when the profiler timed nothing).
 * @param sim - the simulation after a step(1)
 * @returns milliseconds
 */
function attractionMs(sim: GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats>): number {
    if (!(sim instanceof ForceSimulation)) {
        throw new Error("createForceAtlas2 did not return a ForceSimulation");
    }
    const timings = sim.lastPassTimings;
    const pass = timings === null ? undefined : timings.find((t) => t.label === ATTRACTION_PASS);
    return pass === undefined ? Number.NaN : pass.ns / 1e6;
}

/**
 * Run the attraction-gather scale ladder: three rows per rung. Nothing is produced when the device did not grant
 * `timestamp-query`, since the pass figure is the point of the group.
 *
 * The rungs run LARGEST FIRST, for the reason layout-grid.bench.ts records: NVIDIA's power management drops the SM
 * clock to its idle state under sparse sub-millisecond dispatches, and once dropped the small rungs' own warm-up burst
 * -- a fraction of a millisecond of GPU work per step -- does not lift it back (G3-F1). The 4M rung's tens of
 * milliseconds per iteration do, so every smaller rung follows dense work. Measured on the RTX 4070 SUPER: ascending,
 * the 524k rung read 2.499 ms against the 1M rung's 1.548 ms -- slower at half the size, the governor rather than the
 * kernel. The rows are returned in ladder order all the same, so the printed table and the session file read upward.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones without --allow-software)
 * @returns the results in ladder order, or [] without the profiler
 */
export async function runAttractionScaleBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    if (ctx.profiler === null || !ctx.profiler.enabled) {
        console.log("attraction-scale: the device did not grant timestamp-query; no per-pass figure to report");
        return [];
    }
    const perRung = new Map<number, BenchResult[]>();
    for (const rung of [...ATTRACTION_LADDER].reverse()) {
        const results: BenchResult[] = [];
        perRung.set(rung.nodes, results);
        const m = rung.nodes * LADDER_EDGE_FACTOR;
        const workingSetMiB = (rung.nodes * POSITION_BYTES_PER_NODE) / (1024 * 1024);
        console.log(`attraction-scale: n=${rung.nodes} m=${m} pos working set ${workingSetMiB.toFixed(2)} MiB`);
        const snapshot = snapshotOf(randomEdges(rung.nodes, m, SEED), { label: `attraction-scale/${rung.label}` });
        try {
            const positions = new Float32Array(3 * rung.nodes).fill(Number.NaN);
            const sim = createForceAtlas2(ctx, RUNG_OPTIONS);
            sim.load(snapshot, positions);
            const iteration: number[] = [];
            const attraction: number[] = [];
            try {
                await warmClock(sim, CLOCK_WARM_MS);
                const wall = await bench(
                    ATTRACTION_SCALE_GROUP,
                    `scale step(1) wall n=${rung.nodes} m=${m} 2D [${rung.label}]`,
                    {
                        setup: () => {
                            sim.reheat();
                            return sim;
                        },
                        run: async (input) => {
                            await input.step(1);
                            iteration.push(input.stats.msPerIteration ?? Number.NaN);
                            attraction.push(attractionMs(input));
                            return input.stats;
                        },
                    },
                    { device: ctx.device, items: rung.nodes, unit: "nodes" },
                );
                results.push(wall);
                results.push(
                    reportedRow(
                        ATTRACTION_SCALE_GROUP,
                        `scale grid ms/iteration (profiler) n=${rung.nodes} 2D [${rung.label}]`,
                        iteration,
                        wall.runs,
                        rung.nodes,
                        "nodes",
                    ),
                );
                results.push(
                    reportedRow(
                        ATTRACTION_SCALE_GROUP,
                        `scale attraction ms/iteration (profiler) n=${rung.nodes} 2D [${rung.label}]`,
                        attraction,
                        wall.runs,
                        snapshot.arcCount,
                        "arcs",
                    ),
                );
            } finally {
                sim.dispose();
            }
        } finally {
            ctx.release(snapshot);
        }
    }
    return ATTRACTION_LADDER.flatMap((rung) => perRung.get(rung.nodes) ?? []);
}
