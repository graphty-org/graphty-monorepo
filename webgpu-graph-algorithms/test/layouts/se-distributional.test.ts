/**
 * Distributional parity of the spring-electrical preset (spec 11.4; CLAUDE.md step 6; P5-T4 Step 2,
 * fr-distributional.test.ts applied to the preset): same seed, 100 iterations under ngraph's defaults, the
 * layout-quality metrics of the GPU layout and of the f64 oracle's layout agree within the traced se-distributional
 * (cap 10%); coordinates are never compared. The cases are ADMITTED by the rule of fa2-distributional.test.ts
 * (G3-F4): the f64 oracle must reproduce its own metrics within a third of the cap under eight one-ulp start
 * perturbations, measured on the UNSCALED graph by the oracle-only case below; a candidate above that is left out
 * with its number, never loosened. The measured spreads (the f64 oracle alone, 2026-09-20; copied into the G5
 * record; a third of the cap is 3.3e-2): karate/2d 2.9e-2 admitted, star200/2d 4.3e-2 left out, random1k/2d 3.2e-1
 * left out (the chaotic trajectory of se-trace.test.ts lands in a different basin under a one-ulp nudge), karate/3d
 * 2.3e-6 and random1k/3d 1.2e-5 admitted. The plan named random1k 2D as the noise member; it is not admitted, so
 * the member is the plan's fallback and the worst-conditioned admitted case, karate 2D (fixture
 * se-karate-metrics100; G5 section 7).
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import type { SpringElectricalOptions } from "../../src/types/options.js";
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
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { componentSeparation, layoutMetrics } from "../helpers/metrics.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import {
    PERTURBATIONS,
    perturbedStart,
    SE_BASE_OPTIONS,
    SE_NOISE_FIXTURES,
    SE_TOLERANCE_CAPS,
    SE_TUNING,
    seOracleOptions,
    seTolerance,
    withSeSim,
} from "../helpers/se-parity.js";
import { SpringElectricalOracle } from "../oracle/spring-electrical.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const ITERATIONS = 100;
const CASE_TIMEOUT = 600_000;

interface DistributionalCase {
    readonly graph: ParityGraph;
    readonly dim: 2 | 3;
}

const CANDIDATES: readonly DistributionalCase[] = [
    { graph: "karate", dim: 2 },
    { graph: "star200", dim: 2 },
    { graph: "random1k", dim: 2 },
    { graph: "karate", dim: 3 },
    { graph: "random1k", dim: 3 },
];

/** The admitted cases (file header): every candidate whose measured oracle spread is under a third of the cap. */
const ADMITTED: readonly DistributionalCase[] = [
    { graph: "karate", dim: 2 },
    { graph: "karate", dim: 3 },
    { graph: "random1k", dim: 3 },
];
/** The noise member: the worst-conditioned admitted case (file header). */
const MEMBER: DistributionalCase = { graph: "karate", dim: 2 };
/**
 * Admitted cases whose metric difference is PRINTED, not asserted against the tolerance: karate/2d's own oracle
 * spread (2.941e-2) is above the tolerance its noise floor derives (1.267e-2, 10x the NVIDIA floor), so an adapter
 * that rounds differently lands anywhere inside that spread -- Dawn on Metal measured 1.902e-2 (hosts.yml run
 * 35548431083, finding G5-F10). It stays the noise member (the floor row is measured on it) and the run-twice,
 * finiteness and expansion checks still hold for it.
 */
const INFORMATIONAL: readonly DistributionalCase[] = [{ graph: "karate", dim: 2 }];

function labelOf(c: DistributionalCase): string {
    return `${c.graph}/${c.dim}d`;
}

function optionsOf(dim: 2 | 3): SpringElectricalOptions {
    return { ...SE_BASE_OPTIONS, dim };
}

function oracleLayout(s: GraphSnapshot, start: F32, options: SpringElectricalOptions): Float64Array {
    const oracle = new SpringElectricalOracle(
        s,
        layoutStart(start, s.nodeCount, options.dim ?? 2),
        seOracleOptions(options, null, "f64"),
    );
    for (let k = 0; k < ITERATIONS; k++) {
        oracle.step();
    }
    return Float64Array.from(oracle.positions);
}

/** run() to exactly ITERATIONS iterations (its maxIter argument, settleThreshold 0) on a fresh simulation; the owner's array after. */
async function runLayout(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: SpringElectricalOptions,
): Promise<F32> {
    return await withSeSim(ctx, options, SE_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const stats = await sim.run({ maxIter: ITERATIONS, batch: 10 });
        expect(sim.iterationsDone, "iterationsDone").toBe(ITERATIONS);
        expect(stats.iteration, "stats.iteration").toBe(ITERATIONS);
        // the preset has no budget option: run() stops at its maxIter argument without settling (settleThreshold 0)
        expect(sim.settled, "not settled: maxIter is run()'s stop, not a budget").toBe(false);
        expect(sim.inFlight, "nothing in flight after run()").toBe(0);
        return positions;
    });
}

describe("spring-electrical distributional parity: the admission rule (the f64 oracle alone, no GPU)", () => {
    it(
        `every candidate's oracle spread under ${PERTURBATIONS} one-ulp start perturbations is printed; the admitted ones are under a third of the cap`,
        async () => {
            const third = SE_TOLERANCE_CAPS["se-distributional"].cap / 3;
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
                    `[se-distributional] admission ${labelOf(c)}${full ? "" : ` (scaled x${scale}, printed only)`}: oracle spread ${spread.toExponential(3)} (a third of the cap ${third.toExponential(3)}): ${admitted ? "admitted" : "left out"}`,
                );
                spreads.push({ c, spread, admitted });
            }
            for (const { c, spread, admitted } of spreads) {
                if (admitted && full) {
                    expect(spread, `${labelOf(c)}: admitted under a third of the cap`).toBeLessThanOrEqual(third);
                }
            }
            expect(ADMITTED, "the noise member is an admitted case").toContainEqual(MEMBER);
            expect(SE_NOISE_FIXTURES.metrics100.fixture).toBe(`se-${MEMBER.graph}-metrics100`);
        },
        CASE_TIMEOUT,
    );
});

describe("spring-electrical distributional parity: 100 iterations, metrics within the traced 10% (spec 11.4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-distributional" });
    });

    for (const c of ADMITTED) {
        const label = labelOf(c);
        const informational = INFORMATIONAL.some((a) => a.graph === c.graph && a.dim === c.dim);
        it(
            `${label}: layoutMetrics of the GPU layout vs the f64 oracle's, coordinates never compared, twice bitwise${informational ? " (the difference printed, not asserted)" : ""}`,
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
                        `[se-distributional] ${label}: worst metric difference ${err.toExponential(3)} (spread gpu ${gpuMetrics.spread.toFixed(4)} oracle ${oracleMetrics.spread.toFixed(4)})${informational ? " informational" : ""}`,
                    );
                    expect(Number.isFinite(err), `${label}: a finite difference`).toBe(true);
                    if (!informational) {
                        assertCheckPasses({
                            worst: ratioOf(err, seTolerance("se-distributional").value),
                            worstLabel: label,
                            samples: Object.keys(oracleMetrics).length,
                        });
                    }
                    // the layout expanded from the unit square toward the rest length 10 (spec 7.18: no normalisation)
                    expect(gpuMetrics.spread).toBeGreaterThan(2);
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    it(
        `writes the ${labelOf(MEMBER)} metrics after 100 iterations and the f64 reference's as noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot(MEMBER.graph, 1, false);
            try {
                const options = optionsOf(MEMBER.dim);
                const start = startPositions(s, options, false);
                const gpu = metricsValues(layoutMetrics(s, await runLayout(ctx, s, start, options), MEMBER.dim));
                const oracle = metricsValues(layoutMetrics(s, oracleLayout(s, start, options), MEMBER.dim));
                expect(gpu.keys).toEqual(oracle.keys);
                const { kernel, fixture } = SE_NOISE_FIXTURES.metrics100;
                writeNoiseFixture(kernel, fixture, adapterClass(ctx.caps), gpu.values, "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, oracle.values, "f32");
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
