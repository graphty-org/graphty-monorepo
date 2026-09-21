/**
 * The spring-electrical trace (spec 11.4 trace parity; P5-T4 Step 2, fr-trace.test.ts applied to the preset):
 * (1) the kinetic-energy trace against the oracle's ALIGNED BY THE ONE-ITERATION LAG of PD-4 -- `trace[0].kineticEnergy`
 * after load() is exactly 0 (the first iteration's K1 folds nothing) and `trace[i].kineticEnergy` for i >= 1 is the
 * oracle's record i - 1 -- together with the K1 fold (meanDisplacement, settledCount) of the same records, through
 * the largest admitted horizon within se-trajectory (a function of the trajectory; the one-iteration form is held
 * to se-inspect.k1 by se-inspect.test.ts), printed through 50; (2) the free-running positions after 1, 5 and 10
 * iterations against the f64 oracle within se-trajectory at the ADMITTED horizons, printed elsewhere and at 50,
 * bitwise run to run and finite everywhere; (3) a recording run writes the 10-iteration positions of karate as the
 * traj10 member.
 *
 * The admission rule (G3-F3 / G3-F4; fr-trace.test.ts states it): from the unit-square start ngraph's defaults
 * (rest length 10, Coulomb -12 over pairs 0.01 .. 2 apart, the unit speed clamp) are chaotic on the larger graphs
 * within a few iterations, and the f64 oracle misses the 1e-3 cap against ITSELF there. A horizon of a graph is
 * asserted only where the oracle's eight-perturbation spread and the f32 oracle's distance both sit under a third
 * of the cap, measured on the UNSCALED graph by the oracle-only case (printed on every run, asserted for the table).
 * Measured 2026-09-20 (spread / f32, a third of the cap 3.333e-4; the oracles are pure JS, so the numbers are the
 * same on every adapter): path10 k=10 6.145e-8 / 1.169e-7; karate k=5 1.619e-4 / 2.155e-4, k=10 3.311e-4 / 5.279e-5
 * (admitted at 10 by a 0.7% margin: the spread is 99.3% of a third of the cap); grid10 k=1 8.034e-7 / 6.724e-7,
 * k=5 1.853e-4 / 5.223e-4 (left out from 5), k=10 4.798e-2 / 7.194e-2; random1k k=1 1.860e-5 / 2.632e-5, k=5 1.015
 * / 1.833 (left out from 5), k=10 8.978 / 9.305. The traj10 member is therefore karate, the worst-conditioned graph
 * admitted at 10, not the random1k the plan named (G5 section 7).
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import type { SpringElectricalTraceRecord } from "../../src/types/layout.js";
import type { SpringElectricalOptions } from "../../src/types/options.js";
import {
    layoutStart,
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    stageError,
    startPositions,
} from "../helpers/fa2-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, mergeReports, ratioOf } from "../helpers/sabotage.js";
import {
    SE_BASE_OPTIONS,
    SE_NOISE_FIXTURES,
    SE_TOLERANCE_CAPS,
    SE_TUNING,
    seOracleOptions,
    seTolerance,
    seTrajectorySensitivity,
    withSeSim,
} from "../helpers/se-parity.js";
import { type SeOracleTraceRecord, SpringElectricalOracle } from "../oracle/spring-electrical.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const GRAPHS: readonly ParityGraph[] = ["path10", "karate", "grid10", "random1k"];
const HORIZONS: readonly number[] = [1, 5, 10];
const PRINTED = 50;
/** The admitted horizons per graph (file header). */
const ADMITTED: Readonly<Record<string, readonly number[]>> = {
    path10: [1, 5, 10],
    karate: [1, 5, 10],
    grid10: [1],
    random1k: [1],
};
const TRAJ10_GRAPH: ParityGraph = "karate";
const TRAJ10_HORIZON = 10;

async function gpuTrajectory(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: SpringElectricalOptions,
    checkpoints: readonly number[],
): Promise<{ readonly positions: Map<number, F32>; readonly trace: SpringElectricalTraceRecord[] }> {
    const last = Math.max(...checkpoints);
    return await withSeSim(ctx, options, SE_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const trace: SpringElectricalTraceRecord[] = [];
        for (let t = 1; t <= last; t++) {
            await sim.step(1);
            trace.push(...sim.stats.trace);
            if (checkpoints.includes(t)) {
                out.set(t, Float32Array.from(positions));
            }
        }
        return { positions: out, trace };
    });
}

function oracleTrajectory(
    s: GraphSnapshot,
    start: F32,
    options: SpringElectricalOptions,
    checkpoints: readonly number[],
): { readonly positions: Map<number, Float64Array>; readonly trace: readonly SeOracleTraceRecord[] } {
    const last = Math.max(...checkpoints);
    const oracle = new SpringElectricalOracle(
        s,
        layoutStart(start, s.nodeCount, options.dim ?? 2),
        seOracleOptions(options, null, "f64"),
    );
    const out = new Map<number, Float64Array>();
    for (let t = 1; t <= last; t++) {
        oracle.step();
        if (checkpoints.includes(t)) {
            out.set(t, Float64Array.from(oracle.positions));
        }
    }
    return { positions: out, trace: oracle.trace };
}

function at<T>(map: ReadonlyMap<number, T>, k: number): T {
    const v = map.get(k);
    if (v === undefined) {
        throw new Error(`no value recorded at ${k}`);
    }
    return v;
}

describe("spring-electrical trace: the admission rule (the f64 and f32 oracles alone, no GPU)", () => {
    it(
        "every graph's trajectory sensitivity at 1, 5 and 10 is printed; the admitted horizons are under a third of the cap on both counts; the traj10 graph is admitted at 10",
        async () => {
            const third = SE_TOLERANCE_CAPS["se-trajectory"].cap / 3;
            // the ensemble runs at gpuScale() and its numbers are printed only on a software adapter (the P3 precedent of fa2-distributional.test.ts: a 4-core CI runner under coverage cannot finish the full-size random1k ensemble inside the case timeout, ci.yml run 35548431040)
            const scale = gpuScale();
            const full = scale === 1;
            for (const graph of GRAPHS) {
                const s = paritySnapshot(graph, scale, false);
                const sensitivity = await seTrajectorySensitivity(
                    s,
                    startPositions(s, SE_BASE_OPTIONS, false),
                    SE_BASE_OPTIONS,
                    null,
                    HORIZONS,
                );
                const admitted = ADMITTED[graph];
                console.warn(
                    `[se-trace] admission ${graph}${full ? "" : ` (scaled x${scale}, printed only)`} (a third of the cap ${third.toExponential(3)}): ${HORIZONS.map(
                        (k) =>
                            `k=${k} spread ${at(sensitivity, k).spread.toExponential(3)} f32 ${at(sensitivity, k).f32.toExponential(3)} ${admitted.includes(k) ? "admitted" : "left out"}`,
                    ).join("; ")}`,
                );
                for (const k of full ? admitted : []) {
                    expect(at(sensitivity, k).spread, `${graph} k=${k}: the oracle's own spread`).toBeLessThanOrEqual(
                        third,
                    );
                    expect(at(sensitivity, k).f32, `${graph} k=${k}: the f32 oracle`).toBeLessThanOrEqual(third);
                }
            }
            expect(ADMITTED[TRAJ10_GRAPH], "the traj10 member's graph is admitted at its horizon").toContain(
                TRAJ10_HORIZON,
            );
            expect(SE_NOISE_FIXTURES.traj10.fixture).toBe(`se-${TRAJ10_GRAPH}-traj${TRAJ10_HORIZON}`);
        },
        CASE_TIMEOUT,
    );
});

describe("spring-electrical trace: the kinetic energy, the free-running trajectory and the K1 fold (spec 11.4, 7.20)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "se-trace" });
    });

    for (const graph of GRAPHS) {
        const asserted = ADMITTED[graph];
        const printed = [...HORIZONS.filter((k) => !asserted.includes(k)), PRINTED];
        it(
            `${graph}: twice bitwise; positions after ${asserted.join(", ")} iterations within se-trajectory (${printed.join(", ")} printed); the lagged kinetic energy and the fold through record ${Math.max(...asserted)} within it`,
            async (t) => {
                requireGpu(t);
                const s = paritySnapshot(graph, gpuScale(), false);
                try {
                    const start = startPositions(s, SE_BASE_OPTIONS, false);
                    const checkpoints = [...HORIZONS, PRINTED];
                    const a = await gpuTrajectory(ctx, s, start, SE_BASE_OPTIONS, checkpoints);
                    const b = await gpuTrajectory(ctx, s, start, SE_BASE_OPTIONS, checkpoints);
                    for (const k of checkpoints) {
                        expectBitwiseEqual(
                            at(a.positions, k),
                            at(b.positions, k),
                            `${graph}: iteration ${k}, run 1 vs run 2`,
                        );
                    }
                    expectBitwiseEqual(
                        Float32Array.from(a.trace.map((r) => r.kineticEnergy)),
                        Float32Array.from(b.trace.map((r) => r.kineticEnergy)),
                        `${graph}: kinetic energy run 1 vs run 2`,
                    );
                    const oracle = oracleTrajectory(s, start, SE_BASE_OPTIONS, checkpoints);
                    const tolerance = seTolerance("se-trajectory").value;
                    const measured = checkpoints.map((k) => {
                        const err = stageError(true, at(a.positions, k), at(oracle.positions, k));
                        return { k, rel: err.rel, abs: err.abs };
                    });
                    console.warn(
                        `[se-trace] ${graph} (se-trajectory ${tolerance.toExponential(3)}): ${measured
                            .map(
                                (m) =>
                                    `k=${m.k} rel ${m.rel.toExponential(3)} (ratio ${ratioOf(m.rel, tolerance).toExponential(3)}, max abs ${m.abs.toExponential(3)})${asserted.includes(m.k) ? "" : " informational"}`,
                            )
                            .join("; ")}`,
                    );
                    for (const k of asserted) {
                        const err = stageError(true, at(a.positions, k), at(oracle.positions, k));
                        assertCheckPasses({
                            worst: ratioOf(err.rel, tolerance),
                            worstLabel: `${graph}: positions after ${k} iterations vs the f64 oracle`,
                            samples: s.nodeCount,
                        });
                    }
                    for (const k of checkpoints) {
                        expect(
                            Array.from(at(a.positions, k)).every((v) => Number.isFinite(v)),
                            `${graph}: finite after ${k} iterations`,
                        ).toBe(true);
                    }
                    // (1) the kinetic energy, lagged by one iteration (PD-4), and the K1 fold, index-aligned
                    expect(a.trace).toHaveLength(PRINTED);
                    expect(oracle.trace).toHaveLength(PRINTED);
                    expect(a.trace[0].kineticEnergy, `${graph}: the first record folds nothing`).toBe(0);
                    const folds: CheckReport[] = a.trace.map((g, k) => {
                        const o = oracle.trace[k];
                        const fold = stageError(
                            false,
                            [g.meanDisplacement, g.settledCount],
                            [o.meanDisplacement, o.settledCount],
                        );
                        const lagged = k === 0 ? 0 : oracle.trace[k - 1].kineticEnergy;
                        const energy = k === 0 ? 0 : stageError(false, [g.kineticEnergy], [lagged]).rel;
                        return {
                            worst: ratioOf(Math.max(fold.rel, energy), tolerance),
                            worstLabel: `${graph}: record ${k} (meanDisplacement ${g.meanDisplacement} vs ${o.meanDisplacement}; kineticEnergy ${g.kineticEnergy} vs ${lagged})`,
                            samples: 3,
                        };
                    });
                    const horizon = Math.max(...asserted);
                    const worstAsserted = mergeReports(folds.slice(0, horizon + 1));
                    const worstAll = mergeReports(folds);
                    console.warn(
                        `[se-trace] ${graph}: lagged kinetic energy and K1 fold through record ${horizon}: worst ratio ${worstAsserted.worst.toExponential(3)} at ${worstAsserted.worstLabel}; through ${PRINTED} (informational): ${worstAll.worst.toExponential(3)} at ${worstAll.worstLabel}`,
                    );
                    assertCheckPasses(worstAsserted);
                    expect(a.trace[0].meanDisplacement).toBe(0);
                    expect(
                        a.trace.slice(1).every((r) => r.meanDisplacement > 0),
                        `${graph}: moving`,
                    ).toBe(true);
                    expect(
                        a.trace.slice(1).every((r) => r.kineticEnergy > 0),
                        `${graph}: kinetic`,
                    ).toBe(true);
                    expect(
                        a.trace.every((r) => r.settledCount === 0),
                        `${graph}: never settles`,
                    ).toBe(true);
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    it(
        `writes the ${TRAJ10_HORIZON}-iteration positions of ${TRAJ10_GRAPH} and the f64 reference's as the traj10 noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot(TRAJ10_GRAPH, 1, false);
            try {
                const start = startPositions(s, SE_BASE_OPTIONS, false);
                const gpu = await gpuTrajectory(ctx, s, start, SE_BASE_OPTIONS, [TRAJ10_HORIZON]);
                const oracle = oracleTrajectory(s, start, SE_BASE_OPTIONS, [TRAJ10_HORIZON]);
                const { kernel, fixture } = SE_NOISE_FIXTURES.traj10;
                writeNoiseFixture(kernel, fixture, adapterClass(ctx.caps), at(gpu.positions, TRAJ10_HORIZON), "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, at(oracle.positions, TRAJ10_HORIZON), "f32");
                const err = stageError(true, at(gpu.positions, TRAJ10_HORIZON), at(oracle.positions, TRAJ10_HORIZON));
                console.warn(`[se-trace] noise/${TRAJ10_GRAPH}/traj10: error ${err.rel.toExponential(3)}`);
                assertCheckPasses({
                    worst: ratioOf(err.rel, seTolerance("se-trajectory").value),
                    worstLabel: `noise/${TRAJ10_GRAPH}/traj10`,
                    samples: s.nodeCount,
                });
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
