/**
 * The spring-electrical half of the P5 sabotage table (spec 11.9 item 1; spec 13 rule f applied to every BRANCH P5
 * adds to the four FA2 kernels; P5-T7 PLAN DECISION PD-8; the table's coverage check is in fr.test.ts): every
 * `spring-*` / `coulomb-*` / `euler-*` / `ke-*` row of SABOTAGE_P5 is spliced into its kernel body through
 * setKernelBodyOverride on a FRESH context and the SAME check its `test` field names must fail by at least minFactor
 * (10) x the traced tolerance: the `se-inspect` rows through seStageReport on the mutated kernel's stages
 * (captureSeStages on the unscaled karate; the `k1` key carries the kinetic energy K1 folded from step(1)'s
 * partials B), the `se-trace` rows through se-trace.test.ts's karate case -- the positions at karate's admitted
 * horizons (1, 5 and 10), the lagged kinetic energy and the K1 fold through record 10 within se-trajectory -- because
 * drag and the stored velocity show over iterations, not in one. Lavapipe is enough: sabotage is about the test.
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import type { KernelId } from "../../src/kernels.js";
import type { SpringElectricalTraceRecord } from "../../src/types/layout.js";
import { layoutStart, paritySnapshot, stageError, startPositions } from "../helpers/fa2-parity.js";
import {
    assertCheckPasses,
    type CheckReport,
    mergeReports,
    type Mutation,
    ratioOf,
    SABOTAGE_P5,
    withSabotage,
} from "../helpers/sabotage.js";
import {
    captureSeStages,
    SE_BASE_OPTIONS,
    SE_STAGE_KERNEL,
    SE_STAGE_KEYS,
    SE_TUNING,
    seOracleOptions,
    seStageReport,
    seTolerance,
    withSeSim,
} from "../helpers/se-parity.js";
import { type SeOracleTraceRecord, SpringElectricalOracle } from "../oracle/spring-electrical.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const P5_KERNELS: readonly KernelId[] = [
    "fa2-attraction",
    "fa2-repulsion-exact",
    "fa2-integrate",
    "fa2-stats-finalize",
];
/** The free-running horizon of the trace check and karate's admitted horizons (se-trace.test.ts). */
const TRACE_ITERATIONS = 10;
const ADMITTED: readonly number[] = [1, 5, 10];

const s = paritySnapshot("karate", 1, false);
const start = startPositions(s, SE_BASE_OPTIONS, false);

/** The spring rows of a kernel: every SABOTAGE_P5 row that is not an FR one. */
function rowsOf(id: KernelId): readonly Mutation[] {
    return (SABOTAGE_P5[id] ?? []).filter((row) => !row.name.startsWith("fr-"));
}

/** The stage check of se-inspect.test.ts restricted to the stages of one kernel (the worst over them). */
async function stageCheck(ctx: GpuContext, id: KernelId): Promise<CheckReport> {
    const capture = await captureSeStages(ctx, s, start, SE_BASE_OPTIONS, null);
    const keys = SE_STAGE_KEYS.filter((key) => SE_STAGE_KERNEL[key] === id);
    if (keys.length === 0) {
        throw new Error(`${id}: no spring inspect stage`);
    }
    return mergeReports(keys.map((key) => seStageReport(capture, key)));
}

async function gpuTrajectory(
    ctx: GpuContext,
    checkpoints: readonly number[],
): Promise<{ readonly positions: Map<number, F32>; readonly trace: SpringElectricalTraceRecord[] }> {
    return await withSeSim(ctx, SE_BASE_OPTIONS, SE_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const trace: SpringElectricalTraceRecord[] = [];
        for (let t = 1; t <= TRACE_ITERATIONS; t++) {
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
    snapshot: GraphSnapshot,
    checkpoints: readonly number[],
): { readonly positions: Map<number, Float64Array>; readonly trace: readonly SeOracleTraceRecord[] } {
    const oracle = new SpringElectricalOracle(
        snapshot,
        layoutStart(start, snapshot.nodeCount, SE_BASE_OPTIONS.dim ?? 2),
        seOracleOptions(SE_BASE_OPTIONS, null, "f64"),
    );
    const out = new Map<number, Float64Array>();
    for (let t = 1; t <= TRACE_ITERATIONS; t++) {
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

/**
 * The karate case of se-trace.test.ts as one report: the positions at the admitted horizons, the kinetic energy
 * lagged by one iteration (PD-4) and the K1 fold through the largest horizon, every one within se-trajectory.
 */
async function traceCheck(ctx: GpuContext): Promise<CheckReport> {
    const gpu = await gpuTrajectory(ctx, ADMITTED);
    const oracle = oracleTrajectory(s, ADMITTED);
    const tolerance = seTolerance("se-trajectory").value;
    const horizon = Math.max(...ADMITTED);
    const reports: CheckReport[] = [];
    for (let k = 0; k <= horizon && k < TRACE_ITERATIONS; k++) {
        const g = gpu.trace[k];
        const o = oracle.trace[k];
        const fold = stageError(false, [g.meanDisplacement, g.settledCount], [o.meanDisplacement, o.settledCount]);
        const lagged = k === 0 ? 0 : oracle.trace[k - 1].kineticEnergy;
        const energy = k === 0 ? 0 : stageError(false, [g.kineticEnergy], [lagged]).rel;
        reports.push({
            worst: ratioOf(Math.max(fold.rel, energy), tolerance),
            worstLabel: `record ${k} (meanDisplacement ${g.meanDisplacement} vs ${o.meanDisplacement}; kineticEnergy ${g.kineticEnergy} vs ${lagged})`,
            samples: 3,
        });
    }
    for (const k of ADMITTED) {
        const err = stageError(true, at(gpu.positions, k), at(oracle.positions, k));
        reports.push({
            worst: ratioOf(err.rel, tolerance),
            worstLabel: `positions after ${k} iterations vs the f64 oracle`,
            samples: s.nodeCount,
        });
    }
    return mergeReports(reports);
}

/** The check a row is measured with, by its `test` field. */
function checkFor(id: KernelId, row: Mutation): (ctx: GpuContext) => Promise<CheckReport> {
    if (row.test.endsWith("se-trace.test.ts")) {
        return traceCheck;
    }
    if (row.test.endsWith("se-inspect.test.ts")) {
        return (ctx: GpuContext): Promise<CheckReport> => stageCheck(ctx, id);
    }
    throw new Error(`${id}/${row.name}: no spring check for test ${row.test}`);
}

describe("sabotage: the spring-electrical branches against the P5 spring checks (spec 11.9 item 1)", () => {
    it("every P5 kernel carries at least three spring rows, each naming a spring test", () => {
        for (const id of P5_KERNELS) {
            const rows = rowsOf(id);
            expect(rows.length, `${id}: spring rows`).toBeGreaterThanOrEqual(3);
            for (const row of rows) {
                expect(row.test.startsWith("test/layouts/se-"), `${id}/${row.name}: names a spring test`).toBe(true);
            }
        }
    });

    it(
        "the pristine kernels pass every check (the baseline the mutants are measured against)",
        async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: "sabotage/se/baseline" });
            try {
                for (const id of P5_KERNELS) {
                    const report = await stageCheck(ctx, id);
                    console.warn(
                        `[sabotage] se baseline ${id}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    assertCheckPasses(report);
                }
                const trace = await traceCheck(ctx);
                console.warn(
                    `[sabotage] se baseline trace ratio ${trace.worst.toExponential(3)} at ${trace.worstLabel}`,
                );
                assertCheckPasses(trace);
            } finally {
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    for (const id of P5_KERNELS) {
        for (const row of rowsOf(id)) {
            it(
                `${id}/${row.name}: fails its check by >= ${row.minFactor}x the tolerance`,
                async (t) => {
                    requireGpu(t);
                    const report = await withSabotage(id, row, checkFor(id, row));
                    console.warn(
                        `[sabotage] ${id}/${row.name}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    expect(report.worst, `${id}/${row.name}: detection factor`).toBeGreaterThanOrEqual(row.minFactor);
                },
                CASE_TIMEOUT,
            );
        }
    }
});
