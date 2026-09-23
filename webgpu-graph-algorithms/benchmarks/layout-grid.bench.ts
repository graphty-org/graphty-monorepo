/**
 * The grid-tier ForceAtlas2 benchmarks (spec 10.4 T-6 and T-7, 7.8, 11.7; gate G4; P4-T14): one `createForceAtlas2`
 * simulation per rung of the grid ladder 32k / 65k / 100k / 262k / 1M (E = 10n, seeded G(n, m) with self-loops and
 * parallels, `compat: "paper"`, `repulsion: "grid"`) in 2D AND in 3D, each warmed by the clock warm-up burst of
 * layout-exact.bench.ts, then `step(1)` timed `runs` times with an untimed `reheat()` before every run. Two rows per
 * rung and dimension, in the shape of the `layout-exact` rows with a `grid` tag and the dimension in front:
 *
 *   grid step(1) wall n=<n> m=<m> <2D|3D> [<label>]        the wall time of one iteration, its toScene and the 12n readback
 *   grid ms/iteration (profiler|wall) n=<n> <2D|3D> [<label>]  stats.msPerIteration after that step (the GPU time of the
 *                                                            iteration's passes when "timestamp-query" was granted, else
 *                                                            the batch wall time; the row name says which)
 *
 * and at 1M in 2D one more row, T-7's attraction gather, from the profiler's per-pass timings (the grid tier records
 * the K2 tiers as their own `fa2-attraction` pass, PD-16, so the profiler reports them on their own row):
 *
 *   attraction ms/iteration (profiler) n=1000000 [1M]       the `fa2-attraction` pass of that iteration (absent without the profiler)
 *
 * PLAN DECISION PD-24 (P4-T14): the two rungs the exact ladder shares (32k, 65k) run here in 2D so the spec 7.8
 * re-check has its rows: `exactMaxNodesFromLadder(ladderRowsOf(results), EXACT_BUDGET_MS, gridLadderRowsOf(results, 2))`
 * evaluates both clauses of the rule over one session (docs/decisions/G4.md records the run). DEVIATION (the review of
 * P4-T14): the grid tier beats the exact tier on the RTX 4070 SUPER far below 32k (the calibrateLayout probe of the
 * review: grid 0.19-0.25 ms at 1k-16k against exact 0.10 / 0.26 / 0.48 / 1.06 ms at 1k / 4k / 8k / 16k), so the two
 * shared rungs cannot answer spec 7.8's "the P4 gate re-checks that the grid is not faster below it". The group
 * therefore also runs the RECHECK_RUNGS -- the exact ladder's rungs the grid ladder lacks (1k / 4k / 8k / 16k) -- in 2D
 * only, with the exact ladder's labels, so every exact rung has a grid row and the rule's answer is measured, not
 * inferred. The 1M 3D rung is
 * included although spec 7.21 puts it at 55-175 ms per iteration: it is the neighbour of the T-6 3D row (100k 3D
 * <= 20 ms) and the only 3D figure at the top of the ladder. `warmClock` and `reportedRow` are the exported helpers of
 * layout-exact.bench.ts, not copies.
 */

import { type GpuContext } from "../src/context.js";
import { ForceSimulation } from "../src/layouts/force-simulation.js";
import { createForceAtlas2 } from "../src/layouts/forceatlas2.js";
import { type ForceAtlas2Stats, type GpuLayoutSimulation, type GpuLayoutTuning } from "../src/types/layout.js";
import { type ForceAtlas2Options } from "../src/types/options.js";
import { randomEdges, snapshotOf } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";
import {
    EXACT_LADDER,
    LADDER_EDGE_FACTOR,
    type LadderRow,
    type LadderRung,
    reportedRow,
    warmClock,
} from "./layout-exact.bench.js";

/** The group name of every row this file produces (the key of benchmarks/run.ts GROUPS). */
export const LAYOUT_GRID_GROUP = "layout-grid";

/** The grid ladder of spec 7.8 / 10.4 / 11.7: 32k / 65k / 100k / 262k / 1M (the first two shared with the exact ladder). */
export const GRID_LADDER: readonly LadderRung[] = [
    { label: "32k", nodes: 32768 },
    { label: "65k", nodes: 65536 },
    { label: "100k", nodes: 100_000 },
    { label: "262k", nodes: 262_144 },
    { label: "1M", nodes: 1_000_000 },
];

/**
 * The re-check rungs of spec 7.8: the exact ladder's rungs the grid ladder lacks (1k / 4k / 8k / 16k), run in 2D only so
 * the grid clause of `exactMaxNodesFromLadder` has a grid row at EVERY exact rung (the header's deviation note).
 */
export const RECHECK_RUNGS: readonly LadderRung[] = EXACT_LADDER.filter(
    (rung) => !GRID_LADDER.some((g) => g.nodes === rung.nodes),
);

/** The dimensions every grid-ladder rung runs in (the re-check rungs run in 2D only). */
export const GRID_DIMS: readonly (2 | 3)[] = [2, 3];

/** The rung that carries T-7's attraction row (1M in 2D). */
export const ATTRACTION_RUNG: LadderRung = GRID_LADDER[4];

/** The profiler pass label of the K2 tiers on the grid tier (forceatlas2.ts recordIteration, PD-16). */
const ATTRACTION_PASS = "fa2-attraction";

/** The seed of every rung's G(n, m) and of the simulation's LCG (graph-format's benchmark seed). */
const SEED = 12345;

/** The least wall time of the untimed clock warm-up burst before a rung's timed runs (layout-exact.bench.ts, G3-F1). */
const CLOCK_WARM_MS = 500;

/**
 * The simulation options of every rung: the grid tier at any n, one iteration per step, one batch in flight, paper
 * mode, a maxIter reheat() keeps out of reach; `dim` is added per run.
 */
const RUNG_OPTIONS: Omit<ForceAtlas2Options, "dim"> & GpuLayoutTuning = {
    seed: SEED,
    maxIter: 1_000_000,
    iterationsPerStep: 1,
    maxInFlight: 1,
    repulsion: "grid",
    compat: "paper",
};

/** The row-name prefix of the per-iteration rows and the pattern that extracts their n and dimension. */
const PER_ITERATION_ROW = /^grid ms\/iteration \((?:profiler|wall)\) n=(\d+) (2|3)D /;

/**
 * The per-iteration rows of the grid ladder and of the re-check rungs in one dimension of a session's results (every
 * other group and row is ignored), as the spec 7.8 grid clause reads them, sorted by n.
 * @param results - a session's results (any group)
 * @param dim - the dimension whose rows are wanted
 * @returns the ladder rows
 */
export function gridLadderRowsOf(results: readonly BenchResult[], dim: 2 | 3): LadderRow[] {
    const rows: LadderRow[] = [];
    for (const r of results) {
        if (r.group !== LAYOUT_GRID_GROUP) {
            continue;
        }
        const match = PER_ITERATION_ROW.exec(r.name);
        if (match === null || Number(match[2]) !== dim) {
            continue;
        }
        const n = Number(match[1]);
        if (GRID_LADDER.some((rung) => rung.nodes === n) || RECHECK_RUNGS.some((rung) => rung.nodes === n)) {
            rows.push({ n, msPerIteration: r.medianMs });
        }
    }
    rows.sort((a, b) => a.n - b.n);
    return rows;
}

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
 * Run the grid-tier layout benchmarks: the five ladder rungs in 2D and 3D, two rows each, plus the attraction row, then
 * the four re-check rungs in 2D, largest first. The order matters on NVIDIA (G3-F1): the re-check rungs' sub-millisecond
 * dispatches let the clock governor drop, and once dropped the CLOCK_WARM_MS burst of a 32k / 65k grid rung (0.3-0.5 ms
 * of GPU work per step) does not lift it back -- measured 2026-09-21 on the RTX 4070 SUPER: with the re-check rungs
 * first, the 32k / 65k 2D rows read 0.51 / 0.69 ms in three consecutive sessions against 0.30 / 0.41 ms with the ladder
 * first (and 0.31 / 0.42 ms from calibrateLayout, whose exact-then-grid probes keep the card busy).
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones without --allow-software)
 * @returns the results
 */
export async function runLayoutGridBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    const profiled = ctx.profiler !== null && ctx.profiler.enabled;
    const source = profiled ? "profiler" : "wall";
    const runs: readonly { readonly rung: LadderRung; readonly dims: readonly (2 | 3)[] }[] = [
        ...GRID_LADDER.map((rung) => ({ rung, dims: GRID_DIMS })),
        ...[...RECHECK_RUNGS].reverse().map((rung) => ({ rung, dims: [2 as const] })),
    ];
    for (const { rung, dims } of runs) {
        const m = rung.nodes * LADDER_EDGE_FACTOR;
        const snapshot = snapshotOf(randomEdges(rung.nodes, m, SEED), { label: `layout-grid/${rung.label}` });
        try {
            for (const dim of dims) {
                const positions = new Float32Array(3 * rung.nodes).fill(Number.NaN);
                const sim = createForceAtlas2(ctx, { ...RUNG_OPTIONS, dim });
                sim.load(snapshot, positions);
                const wantAttraction = profiled && dim === 2 && rung.nodes === ATTRACTION_RUNG.nodes;
                const samples: number[] = [];
                const attraction: number[] = [];
                try {
                    await warmClock(sim, CLOCK_WARM_MS);
                    const wall = await bench(
                        LAYOUT_GRID_GROUP,
                        `grid step(1) wall n=${rung.nodes} m=${m} ${dim}D [${rung.label}]`,
                        {
                            setup: () => {
                                sim.reheat();
                                return sim;
                            },
                            run: async (input) => {
                                await input.step(1);
                                samples.push(input.stats.msPerIteration ?? Number.NaN);
                                if (wantAttraction) {
                                    attraction.push(attractionMs(input));
                                }
                                return input.stats;
                            },
                        },
                        { device: ctx.device, items: rung.nodes, unit: "nodes" },
                    );
                    results.push(wall);
                    results.push(
                        reportedRow(
                            LAYOUT_GRID_GROUP,
                            `grid ms/iteration (${source}) n=${rung.nodes} ${dim}D [${rung.label}]`,
                            samples,
                            wall.runs,
                            rung.nodes,
                            "nodes",
                        ),
                    );
                    if (wantAttraction) {
                        results.push(
                            reportedRow(
                                LAYOUT_GRID_GROUP,
                                `attraction ms/iteration (profiler) n=${rung.nodes} [${rung.label}]`,
                                attraction,
                                wall.runs,
                                snapshot.arcCount,
                                "arcs",
                            ),
                        );
                    }
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
