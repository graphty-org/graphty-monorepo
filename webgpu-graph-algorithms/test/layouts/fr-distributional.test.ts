/**
 * Distributional parity of the Fruchterman-Reingold model (spec 11.4; CLAUDE.md step 6; P5-T4 Step 2, the
 * fa2-distributional.test.ts pattern): same seed, 100 iterations, the layout-quality metrics of the GPU layout and of
 * the f64 oracle's layout agree within the traced fr-distributional (cap 10%); coordinates are never compared. FR
 * runs with `iterations: 100` so the cooling schedule spans the run (dt = 0.1 / 101; at the default 50 the
 * temperature is 0 from iteration 51 and the last half measures nothing).
 *
 * The cases are ADMITTED by the rule fa2-distributional.test.ts records (G3 finding G3-F4): after 100 iterations two
 * runs from starts one f32 ulp apart may land in different basins, so a case is admitted only where the f64 oracle
 * reproduces its own metrics within a third of the cap under eight one-ulp start perturbations, measured on the
 * UNSCALED graph by the oracle-only case below (it prints the spread per candidate on every run and is asserted for
 * the admitted list). A candidate above a third of the cap is left out with its number, never loosened. The
 * measured spreads (the f64 oracle alone, 2026-09-20; copied into the G5 record; a third of the cap is 3.3e-2):
 * karate/2d 8.8e-2, star200/2d 5.0e-2, random1k/2d 8.0e-2 -- every 2D candidate left out: from the [-1, 1) start the
 * 2D FR layout of 100 iterations lands in a different basin under a one-ulp nudge -- karate/3d 3.7e-3 and
 * random1k/3d 1.6e-2 admitted. The plan named random1k 2D as the noise member and karate 2D as the fallback; neither
 * is admitted, so the member is the worst-conditioned ADMITTED case, random1k 3D (fixture fr-random1k-3d-metrics100),
 * by the plan's own rule (G5 section 7).
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import {
    distributionalError,
    layoutStart,
    metricsValues,
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    startPositions,
    yieldToEventLoop,
} from "../helpers/fa2-parity.js";
import {
    FR_BASE_OPTIONS,
    FR_NOISE_FIXTURES,
    FR_TUNING,
    frOracleOptions,
    frTolerance,
    P5_TOLERANCE_CAPS,
    PERTURBATIONS,
    perturbedStart,
    withFrSim,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { componentSeparation, layoutMetrics } from "../helpers/metrics.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const ITERATIONS = 100;
const CASE_TIMEOUT = 600_000;

interface DistributionalCase {
    readonly graph: ParityGraph;
    readonly dim: 2 | 3;
}

/** The candidates of the plan: karate, star200 and random1k in 2D; karate and random1k in 3D. */
const CANDIDATES: readonly DistributionalCase[] = [
    { graph: "karate", dim: 2 },
    { graph: "star200", dim: 2 },
    { graph: "random1k", dim: 2 },
    { graph: "karate", dim: 3 },
    { graph: "random1k", dim: 3 },
];

/** The admitted cases (file header): every candidate whose measured oracle spread is under a third of the cap. */
const ADMITTED: readonly DistributionalCase[] = [
    { graph: "karate", dim: 3 },
    { graph: "random1k", dim: 3 },
];
/** The noise member: the worst-conditioned admitted case (file header). */
const MEMBER: DistributionalCase = { graph: "random1k", dim: 3 };

function labelOf(c: DistributionalCase): string {
    return `${c.graph}/${c.dim}d`;
}

function optionsOf(dim: 2 | 3): FruchtermanReingoldOptions {
    return { ...FR_BASE_OPTIONS, dim, iterations: ITERATIONS };
}

/** The f64 oracle's layout-unit positions after ITERATIONS from a scene start at scale 1 / zero centre. */
function oracleLayout(s: GraphSnapshot, start: F32, options: FruchtermanReingoldOptions): Float64Array {
    const oracle = new FruchtermanReingoldOracle(
        s,
        layoutStart(start, s.nodeCount, options.dim ?? 2),
        frOracleOptions(options, null, "f64"),
    );
    for (let k = 0; k < ITERATIONS; k++) {
        oracle.step();
    }
    return Float64Array.from(oracle.positions);
}

/**
 * run() to exactly ITERATIONS iterations (the FR budget, settleThreshold 0) on a fresh simulation; returns the
 * owner's array (scene units, scale 1) after the last batch.
 */
async function runLayout(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
): Promise<F32> {
    return await withFrSim(ctx, options, FR_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const stats = await sim.run({ batch: 10 });
        expect(sim.iterationsDone, "iterationsDone").toBe(ITERATIONS);
        expect(stats.iteration, "stats.iteration").toBe(ITERATIONS);
        expect(sim.settled, "settled at the budget").toBe(true);
        expect(sim.inFlight, "nothing in flight after run()").toBe(0);
        return positions;
    });
}

describe("FR distributional parity: the admission rule (the f64 oracle alone, no GPU)", () => {
    it(
        `every candidate's oracle spread under ${PERTURBATIONS} one-ulp start perturbations is printed; the admitted ones are under a third of the cap`,
        async () => {
            const third = P5_TOLERANCE_CAPS["fr-distributional"].cap / 3;
            // the ensemble runs at gpuScale() and its numbers are printed only on a software adapter (the P3 precedent of fa2-distributional.test.ts: a 4-core CI runner under coverage cannot finish the full-size random1k ensemble inside the case timeout, ci.yml run 35548431040)
            const scale = gpuScale();
            const full = scale === 1;
            const spreads = [];
            for (const c of CANDIDATES) {
                const s = paritySnapshot(c.graph, scale, false);
                const options = optionsOf(c.dim);
                const start = startPositions(s, options, false);
                await yieldToEventLoop(); // every oracle layout is seconds of synchronous f64 work
                const base = layoutMetrics(s, oracleLayout(s, start, options), c.dim);
                let spread = 0;
                for (let k = 0; k < PERTURBATIONS; k++) {
                    await yieldToEventLoop();
                    const other = layoutMetrics(
                        s,
                        oracleLayout(s, perturbedStart(start, s.nodeCount, c.dim, k), options),
                        c.dim,
                    );
                    spread = Math.max(spread, distributionalError(other, base));
                }
                const admitted = ADMITTED.some((a) => a.graph === c.graph && a.dim === c.dim);
                console.warn(
                    `[fr-distributional] admission ${labelOf(c)}${full ? "" : ` (scaled x${scale}, printed only)`}: oracle spread ${spread.toExponential(3)} (a third of the cap ${third.toExponential(3)}): ${admitted ? "admitted" : "left out"}`,
                );
                spreads.push({ c, spread, admitted });
            }
            for (const { c, spread, admitted } of spreads) {
                if (admitted && full) {
                    expect(spread, `${labelOf(c)}: admitted under a third of the cap`).toBeLessThanOrEqual(third);
                }
            }
            expect(ADMITTED, "the noise member is an admitted case").toContainEqual(MEMBER);
            expect(FR_NOISE_FIXTURES.metrics100.fixture).toBe(`fr-${MEMBER.graph}-${MEMBER.dim}d-metrics100`);
        },
        CASE_TIMEOUT,
    );
});

describe("FR distributional parity: 100 iterations, metrics within the traced 10% (spec 11.4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-distributional" });
    });

    for (const c of ADMITTED) {
        const label = labelOf(c);
        it(
            `${label}: layoutMetrics of the GPU layout vs the f64 oracle's, coordinates never compared, twice bitwise`,
            async (t) => {
                requireGpu(t);
                const s = paritySnapshot(c.graph, gpuScale(), false);
                try {
                    const options = optionsOf(c.dim);
                    const start = startPositions(s, options, false);
                    const a = await runLayout(ctx, s, start, options);
                    const b = await runLayout(ctx, s, start, options);
                    expectBitwiseEqual(a, b, `${label}: run 1 vs run 2`);
                    const gpuMetrics = layoutMetrics(s, a, c.dim);
                    const oracleMetrics = layoutMetrics(s, oracleLayout(s, start, options), c.dim);
                    expect(Object.keys(gpuMetrics).sort()).toEqual(Object.keys(oracleMetrics).sort());
                    expect("separation" in gpuMetrics, `${label}: separation present`).toBe(
                        Number.isFinite(componentSeparation(s, start, c.dim)),
                    );
                    const err = distributionalError(gpuMetrics, oracleMetrics);
                    console.warn(
                        `[fr-distributional] ${label}: worst metric difference ${err.toExponential(3)} (spread gpu ${gpuMetrics.spread.toFixed(4)} oracle ${oracleMetrics.spread.toFixed(4)})`,
                    );
                    assertCheckPasses({
                        worst: ratioOf(err, frTolerance("fr-distributional").value),
                        worstLabel: label,
                        samples: Object.keys(oracleMetrics).length,
                    });
                    expect(a.every((v) => Number.isFinite(v))).toBe(true);
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    it(
        `writes the UNSCALED ${labelOf(MEMBER)} metrics after 100 iterations and the f64 reference's as noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot(MEMBER.graph, 1, false);
            try {
                const options = optionsOf(MEMBER.dim);
                const start = startPositions(s, options, false);
                const gpu = metricsValues(layoutMetrics(s, await runLayout(ctx, s, start, options), MEMBER.dim));
                const oracle = metricsValues(layoutMetrics(s, oracleLayout(s, start, options), MEMBER.dim));
                expect(gpu.keys).toEqual(oracle.keys);
                const { kernel, fixture } = FR_NOISE_FIXTURES.metrics100;
                writeNoiseFixture(kernel, fixture, adapterClass(ctx.caps), gpu.values, "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, oracle.values, "f32");
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
