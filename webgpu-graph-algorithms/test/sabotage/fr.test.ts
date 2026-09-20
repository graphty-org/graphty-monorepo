/**
 * The P5 sabotage table and its Fruchterman-Reingold half (spec 11.9 item 1; spec 13 rule f applied to every BRANCH
 * P5 adds to the four FA2 kernels; P5-T7 PLAN DECISION PD-8): SABOTAGE_P5 lives beside SABOTAGE because a mutation
 * inside `if (LAW == 1u) { ... }` leaves the FA2 output untouched, so test/sabotage/fa2.test.ts would report it
 * SURVIVING against the FA2 checks; the P5 rows are measured here (the `fr-*` rows) and in se.test.ts (the rest)
 * against the checks their `test` field names, with the same traced tolerances those suites assert. The first block
 * is the coverage check of the whole table (the coverage.test.ts loop applied to SABOTAGE_P5, plus >= 3 rows per
 * branch per kernel). Every mutant runs on a FRESH context (the pipeline key does not include the body) on the
 * unscaled karate; sabotage is about the test, not the hardware (lavapipe is enough).
 *
 * The checks: the `fr-inspect` rows through frStageReport on the mutated kernel's stages (captureFrStages on
 * karate; the `fr-fixed-moves` row through the PINNED capture, where the pinned row's displacement must be exactly
 * 0); the `fr-trace` rows through fr-trace.test.ts's karate case -- the temperature of every record bitwise (a
 * mutant that writes 0 has an infinite ratio), the positions at karate's admitted horizons (1 and 5) and the K1 fold
 * through record 5 within fr-trajectory, over 10 free-running iterations.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import type { GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS } from "../../src/kernels.js";
import type { FruchtermanReingoldTraceRecord } from "../../src/types/layout.js";
import { layoutStart, paritySnapshot, pinIndex, pinMask, stageError, startPositions } from "../helpers/fa2-parity.js";
import {
    captureFrStages,
    FR_BASE_OPTIONS,
    FR_STAGE_KERNEL,
    FR_STAGE_KEYS,
    FR_TUNING,
    frOracleOptions,
    frStageReport,
    frTolerance,
    withFrSim,
} from "../helpers/fr-parity.js";
import {
    assertCheckPasses,
    type CheckReport,
    mergeReports,
    type Mutation,
    ratioOf,
    SABOTAGE,
    SABOTAGE_P3_ADDENDUM,
    SABOTAGE_P5,
    sabotagedBody,
    withSabotage,
} from "../helpers/sabotage.js";
import { type FrOracleTraceRecord, FruchtermanReingoldOracle } from "../oracle/fruchterman-reingold.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 300_000;
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The four kernels P5 adds branches to, each with its two branch prefixes (FR, then the spring preset's). */
const BRANCHES: readonly { readonly id: KernelId; readonly fr: number; readonly spring: number }[] = [
    { id: "fa2-attraction", fr: 3, spring: 3 },
    { id: "fa2-repulsion-exact", fr: 3, spring: 3 },
    { id: "fa2-integrate", fr: 3, spring: 4 },
    { id: "fa2-stats-finalize", fr: 3, spring: 3 },
];
/** The free-running horizon of the trace check and karate's admitted horizons (fr-trace.test.ts). */
const TRACE_ITERATIONS = 10;
const ADMITTED: readonly number[] = [1, 5];

const s = paritySnapshot("karate", 1, false);
const start = startPositions(s, FR_BASE_OPTIONS, false);

function rowsOf(id: KernelId): readonly Mutation[] {
    return SABOTAGE_P5[id] ?? [];
}

function isFr(row: Mutation): boolean {
    return row.name.startsWith("fr-");
}

/** The stage check of fr-inspect.test.ts restricted to the stages of one kernel (the worst over them). */
async function stageCheck(ctx: GpuContext, id: KernelId): Promise<CheckReport> {
    const capture = await captureFrStages(ctx, s, start, FR_BASE_OPTIONS, null);
    const keys = FR_STAGE_KEYS.filter((key) => FR_STAGE_KERNEL[key] === id);
    if (keys.length === 0) {
        throw new Error(`${id}: no FR inspect stage`);
    }
    return mergeReports(keys.map((key) => frStageReport(capture, key)));
}

/** The pinned case of fr-inspect.test.ts: K5's stages within tolerance and the pinned row's displacement exactly 0. */
async function pinnedCheck(ctx: GpuContext): Promise<CheckReport> {
    const pinned = pinIndex(s.nodeCount);
    const capture = await captureFrStages(ctx, s, start, FR_BASE_OPTIONS, pinMask(s.nodeCount, pinned));
    const keys = FR_STAGE_KEYS.filter((key) => FR_STAGE_KERNEL[key] === "fa2-integrate");
    const d = capture.displacement.values;
    const moved = Math.hypot(d[3 * pinned], d[3 * pinned + 1], d[3 * pinned + 2]);
    return mergeReports([
        ...keys.map((key) => frStageReport(capture, key)),
        { worst: ratioOf(moved, 0), worstLabel: `pinned node ${pinned} displacement ${moved}`, samples: 1 },
    ]);
}

async function gpuTrajectory(
    ctx: GpuContext,
    checkpoints: readonly number[],
): Promise<{ readonly positions: Map<number, F32>; readonly trace: FruchtermanReingoldTraceRecord[] }> {
    return await withFrSim(ctx, FR_BASE_OPTIONS, FR_TUNING, async (sim) => {
        const positions = Float32Array.from(start);
        sim.load(s, positions);
        const out = new Map<number, F32>();
        const trace: FruchtermanReingoldTraceRecord[] = [];
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
): { readonly positions: Map<number, Float64Array>; readonly trace: readonly FrOracleTraceRecord[] } {
    const oracle = new FruchtermanReingoldOracle(
        snapshot,
        layoutStart(start, snapshot.nodeCount, FR_BASE_OPTIONS.dim ?? 2),
        frOracleOptions(FR_BASE_OPTIONS, null, "f64"),
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
 * The karate case of fr-trace.test.ts as one report: every record's temperature bitwise (tolerance 0), the positions
 * at the admitted horizons and the K1 fold through the largest of them within fr-trajectory.
 */
async function traceCheck(ctx: GpuContext): Promise<CheckReport> {
    const gpu = await gpuTrajectory(ctx, ADMITTED);
    const oracle = oracleTrajectory(s, ADMITTED);
    const tolerance = frTolerance("fr-trajectory").value;
    const horizon = Math.max(...ADMITTED);
    const reports: CheckReport[] = [];
    for (let k = 0; k < TRACE_ITERATIONS; k++) {
        const g = gpu.trace[k];
        const o = oracle.trace[k];
        reports.push({
            worst: ratioOf(Math.abs(g.temperature - Math.fround(o.temperature)), 0),
            worstLabel: `record ${k} temperature ${g.temperature} vs ${Math.fround(o.temperature)}`,
            samples: 1,
        });
        if (k <= horizon) {
            const fold = stageError(false, [g.meanDisplacement, g.settledCount], [o.meanDisplacement, o.settledCount]);
            reports.push({
                worst: ratioOf(fold.rel, tolerance),
                worstLabel: `record ${k} fold (meanDisplacement ${g.meanDisplacement} vs ${o.meanDisplacement})`,
                samples: 2,
            });
        }
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

/** The check a row is measured with, by its `test` field (the pinned capture for the fixed-node row). */
function checkFor(id: KernelId, row: Mutation): (ctx: GpuContext) => Promise<CheckReport> {
    if (row.name === "fr-fixed-moves") {
        return pinnedCheck;
    }
    if (row.test.endsWith("fr-trace.test.ts")) {
        return traceCheck;
    }
    if (row.test.endsWith("fr-inspect.test.ts")) {
        return (ctx: GpuContext): Promise<CheckReport> => stageCheck(ctx, id);
    }
    throw new Error(`${id}/${row.name}: no FR check for test ${row.test}`);
}

describe("sabotage coverage of the P5 table (spec 11.9 item 1, 13 rule f; PD-8)", () => {
    it("names exactly the four kernels P5 adds branches to, with >= 3 rows per branch (fr-* and the spring rows counted separately)", () => {
        expect(Object.keys(SABOTAGE_P5).sort()).toEqual(BRANCHES.map((b) => b.id).sort());
        for (const b of BRANCHES) {
            const rows = rowsOf(b.id);
            const fr = rows.filter(isFr);
            const spring = rows.filter((row) => !isFr(row));
            expect(fr.length, `${b.id}: fr rows`).toBe(b.fr);
            expect(spring.length, `${b.id}: spring rows`).toBe(b.spring);
            expect(fr.length).toBeGreaterThanOrEqual(3);
            expect(spring.length).toBeGreaterThanOrEqual(3);
            for (const row of spring) {
                expect(row.name, `${b.id}/${row.name}: a spring / coulomb / euler / ke row`).toMatch(
                    /^(spring|coulomb|euler|ke)-/,
                );
            }
            for (const row of fr) {
                expect(row.test.startsWith("test/layouts/fr-"), `${b.id}/${row.name}: names an FR test`).toBe(true);
            }
            for (const row of spring) {
                expect(row.test.startsWith("test/layouts/se-"), `${b.id}/${row.name}: names a spring test`).toBe(true);
            }
        }
        expect(BRANCHES.reduce((n, b) => n + rowsOf(b.id).length, 0)).toBe(25);
    });

    it("every find string occurs exactly once in the entry's normative body, the replacement differs, minFactor >= 10, names unique and unused by the other tables", () => {
        for (const b of BRANCHES) {
            const { body } = KERNELS[b.id];
            const taken = new Set(
                [...(SABOTAGE[b.id] ?? []), ...(SABOTAGE_P3_ADDENDUM[b.id] ?? [])].map((row) => row.name),
            );
            for (const m of rowsOf(b.id)) {
                expect(taken.has(m.name), `${b.id}: duplicate mutation name ${m.name}`).toBe(false);
                taken.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${b.id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${b.id}/${m.name}: find string not unique`).toBe(
                    -1,
                );
                expect(m.replace, `${b.id}/${m.name}: replace equals find`).not.toBe(m.find);
                expect(m.minFactor, `${b.id}/${m.name}: minFactor`).toBeGreaterThanOrEqual(10);
                const mutated = sabotagedBody(b.id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        }
    });

    it("every test names an existing test file under test/", () => {
        for (const b of BRANCHES) {
            for (const m of rowsOf(b.id)) {
                expect(m.test).toMatch(/^test\/layouts\/(fr|se)-.+\.test\.ts$/);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${b.id}/${m.name}: ${m.test} does not exist`).toBe(
                    true,
                );
            }
        }
    });
});

describe("sabotage: the Fruchterman-Reingold branches against the P5 FR checks (spec 11.9 item 1)", () => {
    it(
        "the pristine kernels pass every check (the baseline the mutants are measured against)",
        async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: "sabotage/fr/baseline" });
            try {
                for (const b of BRANCHES) {
                    const report = await stageCheck(ctx, b.id);
                    console.warn(
                        `[sabotage] fr baseline ${b.id}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    assertCheckPasses(report);
                }
                const pinned = await pinnedCheck(ctx);
                const trace = await traceCheck(ctx);
                console.warn(
                    `[sabotage] fr baseline pinned ratio ${pinned.worst.toExponential(3)}, trace ratio ${trace.worst.toExponential(3)}`,
                );
                assertCheckPasses(pinned);
                assertCheckPasses(trace);
            } finally {
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    for (const b of BRANCHES) {
        for (const row of rowsOf(b.id).filter(isFr)) {
            it(
                `${b.id}/${row.name}: fails its check by >= ${row.minFactor}x the tolerance`,
                async (t) => {
                    requireGpu(t);
                    const report = await withSabotage(b.id, row, checkFor(b.id, row));
                    console.warn(
                        `[sabotage] ${b.id}/${row.name}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    expect(report.worst, `${b.id}/${row.name}: detection factor`).toBeGreaterThanOrEqual(row.minFactor);
                },
                CASE_TIMEOUT,
            );
        }
    }
});
