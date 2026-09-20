/**
 * The SECOND Fruchterman-Reingold REFERENCE (P5-T4 Step 2, the fa2-layout-oracle.test.ts pattern): @graphty/layout's
 * FruchtermanReingoldSimulation, reached through the published barrel, run from the SAME seeded f32 array, step(1)
 * at a time, against the GPU simulation's owner array. The CPU class is a port of the same loop
 * (layout/src/simulation/fruchterman-reingold.ts:1-15), so this file gives NO formula independence -- the f64
 * oracle of test/oracle/fruchterman-reingold.ts is the reference the parity rests on -- but it proves the SHELL
 * agrees: units, the `k` default, the `fixed` option, the temperature schedule across the iterations and the settle
 * fold. Asserted: the owner arrays within fr-layout-oracle at the ADMITTED horizons of 1, 5 and 10 (the others and
 * 50 printed, where determinism and finiteness are still asserted); the CPU's temperature BEFORE step k equals the
 * GPU's k-th trace record bitwise after Math.fround (the CPU cools by repeated f64 subtraction, the GPU's slot
 * carries the f32 of the model's `0.1 - dt * idx`); with a `fixed` mask the pinned rows are bitwise the seed on both
 * sides at every k; and a scale 3 / center (10, 20, 0) case with the mask, where the CPU class writes
 * `layout * scale + center` exactly as the GPU's toScene does, agrees within the same tolerance at the fixed case's
 * largest admitted horizon, 10, with the plan's k = 20 printed (the derived-tolerance form of the fr-behaviour "not
 * rescaled" box; in layout units its dynamics are the fixed case's, which is NOT admitted at 20: the f32 oracle is
 * 5.9e-4 from the f64 there). The start MUST be the seeded array: layout's load() seeds NaN rows itself.
 *
 * The admission rule is fr-trace.test.ts's (G3-F3 / G3-F4): a horizon of a case is asserted only where the f64
 * oracle's eight-perturbation spread and the f32 oracle's distance both sit under a third of the cap, measured by
 * the oracle-only case below on the unscaled graphs (the CPU class is an f64 implementation like the oracle, so the
 * same sensitivity governs it). Measured 2026-09-20 (spread / f32, a third of the cap 3.333e-4; the oracles are
 * pure JS, so the numbers are the same on every adapter): karate/k=auto k=5 4.460e-7 / 1.179e-6, k=10 5.846e-5 /
 * 3.728e-4 (left out at 10); karate/k=0.3 k=10 1.479e-4 / 6.660e-5 (left out at 10); grid10/k=auto k=10 1.125e-4 /
 * 1.817e-4; grid10/k=0.3 k=10 1.951e-5 / 2.796e-5; random1k/k=auto k=10 2.965e-4 / 8.824e-3 (left out at 10);
 * random1k/k=0.3 k=5 2.973e-5 / 5.608e-4 (left out from 5); karate/fixed k=10 4.007e-6 / 1.813e-5 admitted, k=20
 * 2.861e-4 / 5.865e-4 left out (one pinned node removes the rigid drift that makes the free karate chaotic past 10,
 * but not past 20). The numbers are printed on every run.
 *
 * The layout10 noise member (fixture fr-karate-layout10) is therefore karate WITH the fixed mask after 10
 * iterations, not the free karate: the free karate is not admitted at 10 (the f32 oracle 3.728e-4 above a third of
 * the cap), so a row recorded there would measure the f32 rounding of a non-admitted horizon rather than the
 * implementation's noise -- the same rule that moved the traj10 member of fr-trace.test.ts to grid10. The admission
 * case asserts the member's configuration is admitted at its horizon (G5 section 7).
 */

import type { F32, GraphSnapshot, NodeMask } from "@graphty/graph-format";
import { FruchtermanReingoldSimulation } from "@graphty/layout";

import type { GpuContext } from "../../src/context.js";
import type { FruchtermanReingoldOptions } from "../../src/types/options.js";
import {
    assertUnitStart,
    ORACLE_F64_CLASS,
    type ParityGraph,
    paritySnapshot,
    pinIndex,
    pinMask,
    stageError,
    startPositions,
} from "../helpers/fa2-parity.js";
import {
    FR_BASE_OPTIONS,
    FR_NOISE_FIXTURES,
    FR_TUNING,
    frTolerance,
    frTrajectorySensitivity,
    P5_TOLERANCE_CAPS,
    withFrSim,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { adapterClass, writeNoiseFixture } from "../helpers/noise-floor.js";
import { assertCheckPasses, ratioOf } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The three graphs of the plan: karate (34), grid10 (100) and random1k (1,000) at gpuScale(). */
const GRAPHS: readonly ParityGraph[] = ["karate", "grid10", "random1k"];
const K_VALUES: readonly (number | null)[] = [null, 0.3];
/** The horizons the admission rule measures and a free case may assert. */
const HORIZONS: readonly number[] = [1, 5, 10];
/** The horizon whose accuracy is measured and PRINTED; determinism and finiteness still are asserted. */
const PRINTED = 50;
/** The horizon of the scale / center case the plan named (20), printed; its asserted horizon is the fixed case's largest admitted one. */
const SCALED_PRINTED = 20;
const CASE_TIMEOUT = 300_000;
/** The label of a free case. */
function caseLabel(graph: ParityGraph, k: number | null): string {
    return `${graph}/k=${k ?? "auto"}`;
}
const FIXED_LABEL = "karate/fixed";
/** The admitted horizons per case (file header). */
const ADMITTED: Readonly<Record<string, readonly number[]>> = {
    "karate/k=auto": [1, 5],
    "karate/k=0.3": [1, 5],
    "grid10/k=auto": [1, 5, 10],
    "grid10/k=0.3": [1, 5, 10],
    "random1k/k=auto": [1, 5],
    "random1k/k=0.3": [1],
    [FIXED_LABEL]: [1, 5, 10],
};
/** The graph and horizon of the layout10 noise member (the plan's name: karate after 10 iterations), recorded WITH the fixed mask (file header). */
const LAYOUT10_GRAPH: ParityGraph = "karate";
const LAYOUT10_LABEL = FIXED_LABEL;
const LAYOUT10_HORIZON = 10;

interface Trajectory {
    /** The owner's array after each checkpoint (scene units). */
    readonly positions: Map<number, F32>;
    /** The temperature the k-th iteration ran at, k = 1 .. last (the GPU's k-th trace record; the CPU's getter before step k). */
    readonly temperature: number[];
}

function at(trajectory: Trajectory, k: number): F32 {
    const positions = trajectory.positions.get(k);
    if (positions === undefined) {
        throw new Error(`no positions recorded after ${k} iterations`);
    }
    return positions;
}

/** The GPU's owner array copied after each of `checkpoints` iterations of step(1), and the per-iteration temperature. */
async function gpuTrajectory(
    ctx: GpuContext,
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    checkpoints: readonly number[],
): Promise<Trajectory> {
    const last = Math.max(...checkpoints);
    return await withFrSim(ctx, options, FR_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const temperature: number[] = [];
        for (let t = 1; t <= last; t++) {
            await sim.step(1);
            expect(sim.stats.trace).toHaveLength(1);
            temperature.push(sim.stats.trace[0].temperature);
            if (checkpoints.includes(t)) {
                out.set(t, Float32Array.from(positions));
            }
        }
        return { positions: out, temperature };
    });
}

/**
 * The same trajectory on @graphty/layout's CPU simulation from the same f32 start array. Its step() is SYNCHRONOUS
 * and writes every free row back into the array it was loaded with; the temperature getter is read BEFORE each step
 * (the value that step runs at).
 */
function layoutTrajectory(
    s: GraphSnapshot,
    start: F32,
    options: FruchtermanReingoldOptions,
    checkpoints: readonly number[],
    label: string,
): Trajectory {
    const last = Math.max(...checkpoints);
    const sim = new FruchtermanReingoldSimulation(options);
    try {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const temperature: number[] = [];
        for (let t = 1; t <= last; t++) {
            temperature.push(sim.temperature);
            sim.step(1);
            if (checkpoints.includes(t)) {
                out.set(t, Float32Array.from(positions));
            }
        }
        // step() is a no-op once settled: a stalled CPU array would be reported as a GPU divergence
        expect(sim.iterationsDone, `${label}: the layout simulation ran every iteration`).toBe(last);
        return { positions: out, temperature };
    } finally {
        sim.dispose();
    }
}

/**
 * Runs both trajectories (the GPU's twice, bitwise) and compares: the owner arrays at the asserted horizons within
 * fr-layout-oracle (the other checkpoints printed), the temperatures bitwise, finiteness everywhere, the pinned
 * rows bitwise the seed on both sides.
 */
async function compare(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: FruchtermanReingoldOptions,
    mask: NodeMask | null,
    asserted: readonly number[],
    printed: readonly number[],
    label: string,
): Promise<void> {
    const start = startPositions(s, options, false);
    const checkpoints = [...asserted, ...printed].sort((x, y) => x - y);
    const withMask: FruchtermanReingoldOptions = mask === null ? options : { ...options, fixed: mask };
    const a = await gpuTrajectory(ctx, s, start, withMask, checkpoints);
    const b = await gpuTrajectory(ctx, s, start, withMask, checkpoints);
    for (const k of checkpoints) {
        expectBitwiseEqual(at(a, k), at(b, k), `${label}: iteration ${k}, run 1 vs run 2`);
    }
    const cpu = layoutTrajectory(s, start, withMask, checkpoints, label);
    const tolerance = frTolerance("fr-layout-oracle").value;
    const measured = checkpoints.map((k) => {
        const err = stageError(true, at(a, k), at(cpu, k));
        return { k, rel: err.rel, abs: err.abs };
    });
    console.warn(
        `[fr-layout-oracle] ${label} (tolerance ${tolerance.toExponential(3)}): ${measured
            .map(
                (m) =>
                    `k=${m.k} rel ${m.rel.toExponential(3)} (ratio ${ratioOf(m.rel, tolerance).toExponential(3)}, max abs ${m.abs.toExponential(3)})${asserted.includes(m.k) ? "" : " informational"}`,
            )
            .join("; ")}`,
    );
    for (const k of asserted) {
        const err = stageError(true, at(a, k), at(cpu, k));
        assertCheckPasses({
            worst: ratioOf(err.rel, tolerance),
            worstLabel: `${label}: positions after ${k} iterations vs @graphty/layout`,
            samples: s.nodeCount,
        });
    }
    for (const k of checkpoints) {
        expect(
            Array.from(at(a, k)).every((v) => Number.isFinite(v)),
            `${label}: GPU finite after ${k}`,
        ).toBe(true);
        expect(
            Array.from(at(cpu, k)).every((v) => Number.isFinite(v)),
            `${label}: CPU finite after ${k}`,
        ).toBe(true);
    }
    // the temperature of every iteration: the GPU's f32 slot against the CPU's f64 schedule rounded to f32
    expect(a.temperature).toHaveLength(cpu.temperature.length);
    for (let k = 0; k < a.temperature.length; k++) {
        expect(a.temperature[k], `${label}: temperature of iteration ${k + 1}`).toBe(Math.fround(cpu.temperature[k]));
    }
    if (mask !== null) {
        const pinned = pinIndex(s.nodeCount);
        for (const k of checkpoints) {
            for (let c = 0; c < 3; c++) {
                expect(at(a, k)[3 * pinned + c], `${label}: GPU pinned row component ${c} after ${k}`).toBe(
                    start[3 * pinned + c],
                );
                expect(at(cpu, k)[3 * pinned + c], `${label}: CPU pinned row component ${c} after ${k}`).toBe(
                    start[3 * pinned + c],
                );
            }
        }
    }
}

describe("FR vs @graphty/layout: the admission rule (the f64 and f32 oracles alone, no GPU)", () => {
    it(
        "every case's trajectory sensitivity is printed; the admitted horizons are under a third of the cap on both counts; the layout10 member's configuration (karate with the mask) is admitted at its horizon",
        () => {
            const third = P5_TOLERANCE_CAPS["fr-layout-oracle"].cap / 3;
            const failures: string[] = [];
            const check = (
                label: string,
                s: GraphSnapshot,
                options: FruchtermanReingoldOptions,
                mask: NodeMask | null,
                horizons: readonly number[],
            ): void => {
                const sensitivity = frTrajectorySensitivity(
                    s,
                    startPositions(s, options, false),
                    options,
                    mask,
                    horizons,
                );
                const admitted = ADMITTED[label];
                console.warn(
                    `[fr-layout-oracle] admission ${label} (a third of the cap ${third.toExponential(3)}): ${horizons
                        .map((k) => {
                            const v = sensitivity.get(k);
                            if (v === undefined) {
                                throw new Error(`no sensitivity at ${k}`);
                            }
                            return `k=${k} spread ${v.spread.toExponential(3)} f32 ${v.f32.toExponential(3)} ${admitted.includes(k) ? "admitted" : "left out"}`;
                        })
                        .join("; ")}`,
                );
                for (const k of admitted) {
                    const v = sensitivity.get(k);
                    if (v === undefined) {
                        throw new Error(`no sensitivity at ${k}`);
                    }
                    if (!(v.spread <= third)) {
                        failures.push(`${label} k=${k}: the oracle's own spread ${v.spread.toExponential(3)}`);
                    }
                    if (!(v.f32 <= third)) {
                        failures.push(`${label} k=${k}: the f32 oracle ${v.f32.toExponential(3)}`);
                    }
                }
            };
            for (const graph of GRAPHS) {
                for (const k of K_VALUES) {
                    check(
                        caseLabel(graph, k),
                        paritySnapshot(graph, 1, false),
                        { ...FR_BASE_OPTIONS, k },
                        null,
                        HORIZONS,
                    );
                }
            }
            const karate = paritySnapshot("karate", 1, false);
            check(FIXED_LABEL, karate, FR_BASE_OPTIONS, pinMask(karate.nodeCount, pinIndex(karate.nodeCount)), [
                ...HORIZONS,
                SCALED_PRINTED,
            ]);
            expect(failures, "every admitted horizon under a third of the cap on both counts").toEqual([]);
            expect(
                ADMITTED[LAYOUT10_LABEL],
                "the layout10 member's configuration is admitted at its horizon",
            ).toContain(LAYOUT10_HORIZON);
            expect(FR_NOISE_FIXTURES.layout10.fixture).toBe(`fr-${LAYOUT10_GRAPH}-layout${LAYOUT10_HORIZON}`);
        },
        CASE_TIMEOUT,
    );
});

describe("FR vs @graphty/layout's FruchtermanReingoldSimulation: the second reference (P5-T4)", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "fr-layout-oracle" });
    });

    for (const graph of GRAPHS) {
        for (const k of K_VALUES) {
            const label = caseLabel(graph, k);
            const asserted = ADMITTED[label];
            const printed = [...HORIZONS.filter((h) => !asserted.includes(h)), PRINTED];
            it(
                `${label}: twice bitwise; within fr-layout-oracle after ${asserted.join(", ")} iterations, ${printed.join(", ")} printed; the temperature schedule bitwise`,
                async (t) => {
                    requireGpu(t);
                    const s = paritySnapshot(graph, gpuScale(), false);
                    try {
                        const options: FruchtermanReingoldOptions = { ...FR_BASE_OPTIONS, k };
                        assertUnitStart(options);
                        await compare(ctx, s, options, null, asserted, printed, label);
                    } finally {
                        ctx.release(s);
                    }
                },
                CASE_TIMEOUT,
            );
        }
    }

    it(
        `karate with a fixed mask on both sides: the pinned row is bitwise the seed at every horizon, the rest within fr-layout-oracle after ${ADMITTED[FIXED_LABEL].join(", ")} iterations`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                assertUnitStart(FR_BASE_OPTIONS);
                const asserted = ADMITTED[FIXED_LABEL];
                await compare(
                    ctx,
                    s,
                    FR_BASE_OPTIONS,
                    pinMask(s.nodeCount, pinIndex(s.nodeCount)),
                    asserted,
                    [...HORIZONS.filter((h) => !asserted.includes(h)), PRINTED],
                    FIXED_LABEL,
                );
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        `karate at scale 3, center (10, 20, 0) with the mask: the owner arrays agree within fr-layout-oracle at k = ${Math.max(...ADMITTED[FIXED_LABEL])}, k = ${SCALED_PRINTED} printed (both write layout * scale + center, never a rescale)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot("karate", 1, false);
            try {
                const options: FruchtermanReingoldOptions = { ...FR_BASE_OPTIONS, scale: 3, center: [10, 20, 0] };
                await compare(
                    ctx,
                    s,
                    options,
                    pinMask(s.nodeCount, pinIndex(s.nodeCount)),
                    [Math.max(...ADMITTED[FIXED_LABEL])],
                    [SCALED_PRINTED],
                    "karate/scale3-center",
                );
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );

    it(
        `writes the GPU's and the CPU class's ${LAYOUT10_LABEL} positions after ${LAYOUT10_HORIZON} iterations as the layout10 noise fixtures (GRAPHTY_NOISE_FLOOR_WRITE=1 only)`,
        async (t) => {
            requireGpu(t);
            const s = paritySnapshot(LAYOUT10_GRAPH, 1, false);
            try {
                const options: FruchtermanReingoldOptions = {
                    ...FR_BASE_OPTIONS,
                    fixed: pinMask(s.nodeCount, pinIndex(s.nodeCount)),
                };
                const start = startPositions(s, options, false);
                const gpu = await gpuTrajectory(ctx, s, start, options, [LAYOUT10_HORIZON]);
                const cpu = layoutTrajectory(s, start, options, [LAYOUT10_HORIZON], `noise/${LAYOUT10_LABEL}`);
                const { kernel, fixture } = FR_NOISE_FIXTURES.layout10;
                writeNoiseFixture(kernel, fixture, adapterClass(ctx.caps), at(gpu, LAYOUT10_HORIZON), "f32");
                writeNoiseFixture(kernel, fixture, ORACLE_F64_CLASS, at(cpu, LAYOUT10_HORIZON), "f32");
                const err = stageError(true, at(gpu, LAYOUT10_HORIZON), at(cpu, LAYOUT10_HORIZON));
                console.warn(`[fr-layout-oracle] noise/${LAYOUT10_LABEL}/layout10: error ${err.rel.toExponential(3)}`);
                assertCheckPasses({
                    worst: ratioOf(err.rel, frTolerance("fr-layout-oracle").value),
                    worstLabel: `noise/${LAYOUT10_LABEL}/layout10`,
                    samples: s.nodeCount,
                });
            } finally {
                ctx.release(s);
            }
        },
        CASE_TIMEOUT,
    );
});
