/**
 * The Fruchterman-Reingold trace (spec 11.4 trace parity; P5-T4 Step 2): (1) the temperature trace is EXACT --
 * `stats.trace[i].temperature === Math.fround(max(0, 0.1 - dt * idx))` bitwise over 50 GPU iterations in batches of
 * 1, 5 and 8, before and after a reheat() at iteration 20 (idx restarts at floor(0.7 * iterations), PD-5), and
 * `stats.temperature` equals the last record's; (2) the free-running positions after 1, 5 and 10 iterations against
 * the f64 oracle within fr-trajectory (the floored per-node metric) at the ADMITTED horizons, printed elsewhere and
 * at 50, bitwise run to run and finite everywhere; (3) meanDisplacement / settledCount of the trace records through
 * the largest admitted horizon within fr-trajectory (the fold is a function of the trajectory, so it carries the
 * trajectory's tolerance and horizon; the same fold of ONE iteration is held to fr-inspect.k1 by fr-inspect.test.ts),
 * printed through 50; (4) a recording run writes the 10-iteration positions of the UNSCALED grid10 as the traj10
 * member.
 *
 * The admission rule (docs/decisions/G3.md findings G3-F3 / G3-F4, the rule fa2-distributional.test.ts records): FR
 * has no controller but its trajectory is still chaotic on these seeds -- the temperature cap min(|F|, t) moves
 * every node by exactly t along F / |F|, so a direction error near a close pair is not damped -- and the plan's
 * "linear error growth" cap of 1e-3 at 10 iterations is NOT meetable on every graph by any f32 implementation. A
 * horizon of a graph is asserted only where the f64 oracle reproduces its own positions within a third of the cap
 * under eight one-ulp start perturbations AND the f32 oracle (the model of the GPU's rounding) sits within a third
 * of the cap of the f64 one, measured on the UNSCALED graph by the oracle-only case below (printed on every run,
 * asserted for the table). Measured 2026-09-20 (eight-perturbation spread / f32 oracle, a third of the cap
 * 3.333e-4; the oracles are pure JS, so the numbers are the same on every adapter): path10 k=10 3.882e-7 /
 * 1.379e-6; karate k=5 4.460e-7 / 1.179e-6, k=10 5.846e-5 / 3.728e-4 (left out at 10: the f32 arithmetic); grid10
 * k=10 1.125e-4 / 1.817e-4; random1k k=5 6.215e-6 / 2.598e-5, k=10 2.965e-4 / 8.824e-3 (left out at 10: the f32
 * arithmetic accumulates over 3,000 coordinates; the GPU measured 3.9e-3 on NVIDIA, 8.8e-3 on lavapipe). The
 * traj10 member is therefore grid10, the worst-conditioned graph admitted at 10 (its row makes the recorded factor
 * honest), not the random1k the plan named (G5 section 7).
 *
 * The temperature case runs under a budget of 100 so that every one of its 50 iterations, the 30 after the reheat
 * included (indices 70 .. 99), carries a positive temperature: under the default 50 the reheated run reaches
 * temperature 0 at index 51 and the settle window would close it before the batches were done (DEP-P5-C).
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import { FR_REHEAT_FRACTION, FR_START_TEMPERATURE } from "../../src/constants.js";
import type { GpuContext } from "../../src/context.js";
import type { FruchtermanReingoldTraceRecord } from "../../src/types/layout.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import {
    layoutStart,
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    stageError,
    startPositions,
} from "../helpers/fa2-parity.js";
import {
    FR_BASE_OPTIONS,
    FR_NOISE_FIXTURES,
    FR_TUNING,
    frOracleOptions,
    frTolerance,
    frTrajectorySensitivity,
    P5_TOLERANCE_CAPS,
    withFrSim,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, type CheckReport, mergeReports, ratioOf } from "../helpers/sabotage.js";
import { type FrOracleTraceRecord, FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
/** 10 .. 1,000 nodes (spec 11.4): the path of 10, karate, the grid and random1k (scaled on software adapters). */
const GRAPHS: readonly ParityGraph[] = ["path10", "karate", "grid10", "random1k"];
/** The horizons the admission rule measures and a case may assert. */
const HORIZONS: readonly number[] = [1, 5, 10];
/** The horizon whose accuracy is printed only (linear or chaotic error growth beyond the traced horizon). */
const PRINTED = 50;
/** The admitted horizons per graph (file header). */
const ADMITTED: Readonly<Record<string, readonly number[]>> = {
    path10: [1, 5, 10],
    karate: [1, 5],
    grid10: [1, 5, 10],
    random1k: [1, 5],
};
/** The graph of the traj10 noise member: the worst-conditioned graph admitted at the member's horizon. */
const TRAJ10_GRAPH: ParityGraph = "grid10";
const TRAJ10_HORIZON = 10;
/** The temperature case: 50 GPU iterations, a reheat after 20, in three batch sizes. */
const TEMPERATURE_ITERATIONS = 50;
const REHEAT_AFTER = 20;
const BATCH_SIZES: readonly number[] = [1, 5, 8];
/** The budget of the temperature case (file header). */
const TEMPERATURE_BUDGET = 100;

/**
 * `total` iterations in batches of `batch` (the last one shorter), collecting every trace record in order.
 * @param sim - a loaded simulation
 * @param total - iterations to run
 * @param batch - the batch size
 * @returns one record per iteration
 */
async function runBatches(
    sim: {
        step(k: number): Promise<void>;
        readonly stats: { readonly trace: readonly FruchtermanReingoldTraceRecord[] };
    },
    total: number,
    batch: number,
): Promise<FruchtermanReingoldTraceRecord[]> {
    const out: FruchtermanReingoldTraceRecord[] = [];
    let done = 0;
    while (done < total) {
        const k = Math.min(batch, total - done);
        await sim.step(k);
        expect(sim.stats.trace, `step(${k}) left ${sim.stats.trace.length} records`).toHaveLength(k);
        out.push(...sim.stats.trace);
        done += k;
    }
    return out;
}

/** The temperature the uniform slot carries for a temperature index (the model's f64 arithmetic, then f32). */
function temperatureOf(index: number, budget: number): number {
    const dt = FR_START_TEMPERATURE / (budget + 1);
    return Math.fround(Math.max(0, FR_START_TEMPERATURE - dt * index));
}

/** The GPU's owner array copied after each of `checkpoints` iterations of step(1), and every trace record. */
async function gpuTrajectory(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    checkpoints: readonly number[],
): Promise<{ readonly positions: Map<number, F32>; readonly trace: FruchtermanReingoldTraceRecord[] }> {
    const last = Math.max(...checkpoints);
    return await withFrSim(ctx, options, FR_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const trace: FruchtermanReingoldTraceRecord[] = [];
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

/** The f64 oracle's layout-unit positions after each checkpoint and its trace. */
function oracleTrajectory(
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    checkpoints: readonly number[],
): { readonly positions: Map<number, Float64Array>; readonly trace: readonly FrOracleTraceRecord[] } {
    const last = Math.max(...checkpoints);
    const oracle = new FruchtermanReingoldOracle(
        s,
        layoutStart(start, s.nodeCount, options.dim ?? 2),
        frOracleOptions(options, null, "f64"),
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

describe("FR trace: the admission rule (the f64 and f32 oracles alone, no GPU)", () => {
    it(
        "every graph's trajectory sensitivity at 1, 5 and 10 is printed; the admitted horizons are under a third of the cap on both counts; the traj10 graph is admitted at 10",
        () => {
            const third = P5_TOLERANCE_CAPS["fr-trajectory"].cap / 3;
            for (const graph of GRAPHS) {
                const s = paritySnapshot(graph, 1, false);
                const sensitivity = frTrajectorySensitivity(
                    s,
                    startPositions(s, FR_BASE_OPTIONS, false),
                    FR_BASE_OPTIONS,
                    null,
                    HORIZONS,
                );
                const admitted = ADMITTED[graph];
                console.warn(
                    `[fr-trace] admission ${graph} (a third of the cap ${third.toExponential(3)}): ${HORIZONS.map(
                        (k) =>
                            `k=${k} spread ${at(sensitivity, k).spread.toExponential(3)} f32 ${at(sensitivity, k).f32.toExponential(3)} ${admitted.includes(k) ? "admitted" : "left out"}`,
                    ).join("; ")}`,
                );
                for (const k of admitted) {
                    expect(at(sensitivity, k).spread, `${graph} k=${k}: the oracle's own spread`).toBeLessThanOrEqual(
                        third,
                    );
                    expect(at(sensitivity, k).f32, `${graph} k=${k}: the f32 oracle`).toBeLessThanOrEqual(third);
                }
            }
            expect(ADMITTED[TRAJ10_GRAPH], "the traj10 member's graph is admitted at its horizon").toContain(
                TRAJ10_HORIZON,
            );
            expect(FR_NOISE_FIXTURES.traj10.fixture).toBe(`fr-${TRAJ10_GRAPH}-traj${TRAJ10_HORIZON}`);
        },
        CASE_TIMEOUT,
    );
});

describe("FR trace: the temperature schedule, the free-running trajectory and the K1 fold (spec 11.4, 7.20)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-trace" });
    });

    for (const batch of BATCH_SIZES) {
        it(
            `the temperature trace is exact in batches of ${batch}: f32(0.1 - dt idx) per record, the reheat at ${REHEAT_AFTER} restarts idx at floor(0.7 iterations), stats.temperature is the last record's`,
            async (t) => {
                requireGpu(t);
                const s = paritySnapshot("karate", 1, false);
                try {
                    const options: FruchtermanReingoldOptions = { ...FR_BASE_OPTIONS, iterations: TEMPERATURE_BUDGET };
                    const reheatIndex = Math.floor(FR_REHEAT_FRACTION * TEMPERATURE_BUDGET);
                    const expected: number[] = [];
                    for (let i = 0; i < REHEAT_AFTER; i++) {
                        expected.push(temperatureOf(i, TEMPERATURE_BUDGET));
                    }
                    for (let i = 0; i < TEMPERATURE_ITERATIONS - REHEAT_AFTER; i++) {
                        expected.push(temperatureOf(reheatIndex + i, TEMPERATURE_BUDGET));
                    }
                    expect(
                        expected.every((v) => v > 0),
                        "every temperature of the case is positive",
                    ).toBe(true);
                    const run = (): Promise<number[]> =>
                        withFrSim(ctx, options, FR_TUNING, async (sim) => {
                            sim.load(s, startPositions(s, options, false));
                            const before = await runBatches(sim, REHEAT_AFTER, batch);
                            expect(sim.iterationsDone).toBe(REHEAT_AFTER);
                            sim.reheat();
                            expect(sim.iterationsDone, "reheat restarts the budget (DEP-P5-C)").toBe(0);
                            const after = await runBatches(sim, TEMPERATURE_ITERATIONS - REHEAT_AFTER, batch);
                            expect(sim.iterationsDone).toBe(TEMPERATURE_ITERATIONS - REHEAT_AFTER);
                            const records = [...before, ...after];
                            expect(sim.stats.temperature, "stats.temperature is the last record's").toBe(
                                records[records.length - 1].temperature,
                            );
                            expect(sim.settled, "never settles under the budget at settleThreshold 0").toBe(false);
                            return records.map((r) => r.temperature);
                        });
                    const a = await run();
                    const b = await run();
                    expectBitwiseEqual(Float32Array.from(a), Float32Array.from(b), `batch ${batch}: run 1 vs run 2`);
                    expect(a).toHaveLength(TEMPERATURE_ITERATIONS);
                    for (let i = 0; i < TEMPERATURE_ITERATIONS; i++) {
                        expect(a[i], `record ${i} (batch ${batch})`).toBe(expected[i]);
                    }
                } finally {
                    ctx.release(s);
                }
            },
            CASE_TIMEOUT,
        );
    }

    for (const graph of GRAPHS) {
        const asserted = ADMITTED[graph];
        const printed = [...HORIZONS.filter((k) => !asserted.includes(k)), PRINTED];
        it(
            `${graph}: twice bitwise; positions after ${asserted.join(", ")} iterations within fr-trajectory (${printed.join(", ")} printed); the fold of records through ${Math.max(...asserted)} within it`,
            async (t) => {
                requireGpu(t);
                const s = paritySnapshot(graph, gpuScale(), false);
                try {
                    const start = startPositions(s, FR_BASE_OPTIONS, false);
                    const checkpoints = [...HORIZONS, PRINTED];
                    const a = await gpuTrajectory(ctx, s, start, FR_BASE_OPTIONS, checkpoints);
                    const b = await gpuTrajectory(ctx, s, start, FR_BASE_OPTIONS, checkpoints);
                    for (const k of checkpoints) {
                        expectBitwiseEqual(
                            at(a.positions, k),
                            at(b.positions, k),
                            `${graph}: iteration ${k}, run 1 vs run 2`,
                        );
                    }
                    expectBitwiseEqual(
                        Float32Array.from(a.trace.map((r) => r.meanDisplacement)),
                        Float32Array.from(b.trace.map((r) => r.meanDisplacement)),
                        `${graph}: trace run 1 vs run 2`,
                    );
                    const oracle = oracleTrajectory(s, start, FR_BASE_OPTIONS, checkpoints);
                    const tolerance = frTolerance("fr-trajectory").value;
                    const measured = checkpoints.map((k) => {
                        const err = stageError(true, at(a.positions, k), at(oracle.positions, k));
                        return { k, rel: err.rel, abs: err.abs };
                    });
                    console.warn(
                        `[fr-trace] ${graph} (fr-trajectory ${tolerance.toExponential(3)}): ${measured
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
                    // (3) the K1 fold, index-aligned (record k is the fold of integrate k - 1 on both sides), through
                    // the largest admitted horizon under the trajectory tolerance; the temperature bitwise everywhere
                    expect(a.trace).toHaveLength(PRINTED);
                    expect(oracle.trace).toHaveLength(PRINTED);
                    const folds: CheckReport[] = a.trace.map((g, k) => {
                        const o = oracle.trace[k];
                        expect(g.temperature, `${graph}: record ${k} temperature`).toBe(Math.fround(o.temperature));
                        const err = stageError(
                            false,
                            [g.meanDisplacement, g.settledCount],
                            [o.meanDisplacement, o.settledCount],
                        );
                        return {
                            worst: ratioOf(err.rel, tolerance),
                            worstLabel: `${graph}: record ${k} (meanDisplacement ${g.meanDisplacement} vs ${o.meanDisplacement})`,
                            samples: 2,
                        };
                    });
                    const horizon = Math.max(...asserted);
                    const worstAsserted = mergeReports(folds.slice(0, horizon + 1));
                    const worstAll = mergeReports(folds);
                    console.warn(
                        `[fr-trace] ${graph}: K1 fold through record ${horizon}: worst ratio ${worstAsserted.worst.toExponential(3)} at ${worstAsserted.worstLabel}; through ${PRINTED} (informational): ${worstAll.worst.toExponential(3)} at ${worstAll.worstLabel}`,
                    );
                    assertCheckPasses(worstAsserted);
                    // iteration 1 carries FA2_FLAG_FIRST: K1 folds nothing and reports the host-written 0; every later record moves
                    expect(a.trace[0].meanDisplacement).toBe(0);
                    expect(
                        a.trace.slice(1).every((r) => r.meanDisplacement > 0),
                        `${graph}: moving`,
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
        `writes the ${TRAJ10_HORIZON}-iteration positions of the UNSCALED ${TRAJ10_GRAPH} and the f64 reference's as the traj10 noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot(TRAJ10_GRAPH, 1, false);
            try {
                const start = startPositions(s, FR_BASE_OPTIONS, false);
                const gpu = await gpuTrajectory(ctx, s, start, FR_BASE_OPTIONS, [TRAJ10_HORIZON]);
                const oracle = oracleTrajectory(s, start, FR_BASE_OPTIONS, [TRAJ10_HORIZON]);
                const { kernel, fixture } = FR_NOISE_FIXTURES.traj10;
                writeNoiseFixture(kernel, fixture, adapterClass(ctx.caps), at(gpu.positions, TRAJ10_HORIZON), "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, at(oracle.positions, TRAJ10_HORIZON), "f32");
                const err = stageError(true, at(gpu.positions, TRAJ10_HORIZON), at(oracle.positions, TRAJ10_HORIZON));
                console.warn(`[fr-trace] noise/${TRAJ10_GRAPH}/traj10: error ${err.rel.toExponential(3)}`);
                assertCheckPasses({
                    worst: ratioOf(err.rel, frTolerance("fr-trajectory").value),
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
