/**
 * The grid-tier sabotage rows of P4 (spec 11.9 item 1, 13 rule f; P4-T12; PD-21): the G6 / G7 rows of SABOTAGE
 * (`grid-far-field`, `grid-near-field`), the K1 grid-block rows of SABOTAGE_P4_TIERS (`fa2-stats-finalize`, under
 * `if (P.gridMax > 0u)`, which the exact-tier suites never reach) and the twelve LAW rows of SABOTAGE_P4_LAW
 * (P4-T13), measured by the exact-vs-grid comparison of the FR / spring simulations (test/helpers/grid-law.ts
 * lawCheck: the `fr-*` rows on the FR model, the `coulomb-*` rows on the spring model). Every other row is
 * measured by the check of
 * test/layouts/grid-inspect.test.ts it names: captureGridStages on the row's fixture (MEASURE below; random20k in 2D
 * unless the row's comment names another) and gridStageReport for its stage(s), merged to the worst ratio; the
 * assertion is `worst >= minFactor` against the same traced tolerances grid-inspect.test.ts asserts. Every mutant
 * runs on a FRESH context (the pipeline key does not include the body). The first block checks the LAW table's
 * shape (the coverage loop of coverage.test.ts applied to it); the G6 / G7 rows are covered by coverage.test.ts
 * once "P4" is in SABOTAGE_PHASES, the K1 rows by tiers.test.ts's table check.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type F32, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS } from "../../src/kernels.js";
import { type GpuLayoutTuning } from "../../src/types/layout.js";
import { paritySnapshot, startPositions } from "../helpers/fa2-parity.js";
import { lawCheck, type LawModel } from "../helpers/grid-law.js";
import {
    captureGridStages,
    GRID_BASE_OPTIONS,
    GRID_TUNING,
    gridFixture,
    type GridStageKey,
    gridStageReport,
} from "../helpers/grid-parity.js";
import {
    assertCheckPasses,
    type CheckReport,
    mergeReports,
    type Mutation,
    SABOTAGE,
    SABOTAGE_P4_LAW,
    SABOTAGE_P4_TIERS,
    sabotagedBody,
    withSabotage,
} from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const CASE_TIMEOUT = 600_000;
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The test every LAW row names (the measurement of test/helpers/grid-law.ts, asserted per fixture there). */
const GRID_LAW_TEST = "test/layouts/grid-law.test.ts";
/** The nearMax of the one-cell fixtures (grid-inspect.test.ts: the sampling window of G7 runs). */
const NEAR_MAX_SAMPLING = 8;
/** Where the far-stray start puts the isolated fixture's degree-0 nodes: a ring far outside the core (which the first iteration throws to a radius near 200), so the bounding box (10,000 wide) exceeds extentFactor x rms and the rms bound of the extent is the binding one. */
const STRAY_RADIUS = 5000;

/** What a row is measured on: the fixtures (merged), the stages (merged), the nearMax when the row needs the sampling path, whether every node is fixed on an all-coincident start (the extent-floor row), and whether the isolated fixture's strays start far out (the rms-bound row). */
interface Measure {
    readonly fixtures: readonly string[];
    readonly stages: readonly GridStageKey[];
    readonly nearMax?: number | undefined;
    readonly coincidentFixed?: boolean | undefined;
    readonly strays?: boolean | undefined;
}

/** The rows' fixtures and stages (the comments of test/helpers/sabotage.ts, made executable). */
const MEASURE: Readonly<Record<string, Measure>> = Object.freeze({
    "pseudo-cell-term-dropped": { fixtures: ["outside5"], stages: ["farField"] },
    "softening-dropped": { fixtures: ["random20k"], stages: ["farField"] },
    "own-neighbourhood-double-counted": { fixtures: ["random20k"], stages: ["farField"] },
    "2d-z-plane-not-collapsed": { fixtures: ["random20k"], stages: ["farField"] },
    "own-cell-scale-off-by-one": {
        fixtures: ["hubcell", "onecell1025"],
        stages: ["nearField"],
        nearMax: NEAR_MAX_SAMPLING,
    },
    "window-not-hashed": { fixtures: ["hubcell"], stages: ["nearField"], nearMax: NEAR_MAX_SAMPLING },
    "window-contiguous": { fixtures: ["hubcell"], stages: ["nearField"], nearMax: NEAR_MAX_SAMPLING },
    "last-row-skipped": { fixtures: ["random20k"], stages: ["nearField"] },
    "grid-extent-unfloored": { fixtures: ["karate"], stages: ["k1"], coincidentFixed: true },
    "grid-rms-bound-dropped": { fixtures: ["isolated"], stages: ["k1"], strays: true },
    "grid-eps-zero": { fixtures: ["random20k"], stages: ["farField", "k1"] },
});

/** The tables this suite measures, by kernel: the two G6 / G7 ids of SABOTAGE, the K1 id of SABOTAGE_P4_TIERS. */
const GRID_ROWS: readonly { readonly id: KernelId; readonly rows: readonly Mutation[] }[] = [
    { id: "grid-far-field", rows: SABOTAGE["grid-far-field"] ?? [] },
    { id: "grid-near-field", rows: SABOTAGE["grid-near-field"] ?? [] },
    { id: "fa2-stats-finalize", rows: SABOTAGE_P4_TIERS["fa2-stats-finalize"] ?? [] },
];

function measureOf(row: Mutation): Measure {
    const m = MEASURE[row.name];
    if (m === undefined) {
        throw new Error(`${row.name}: no fixture / stage in MEASURE`);
    }
    return m;
}

/**
 * Every node at one point (the GRID_EXTENT_FLOOR case) and every node fixed, so K5 leaves the positions and the K1
 * fold of iteration 2 sees a zero bounding box and a zero rms radius: the extent is then the floor alone.
 * @param s - the snapshot
 * @returns the start and the mask
 */
function coincidentFixedStart(s: GraphSnapshot): { readonly start: F32; readonly mask: ReturnType<typeof makeMask> } {
    const start = new Float32Array(3 * s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        start[3 * i] = 0.1;
        start[3 * i + 1] = 0.2;
        start[3 * i + 2] = 0;
    }
    const mask = makeMask(s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        maskSet(mask, i, true);
    }
    return { start, mask };
}

/**
 * The isolated fixture's seeded start with every degree-0 node moved onto a ring of radius STRAY_RADIUS (z 0): the
 * geometry 7.7's robust extent is for -- a compact core and a few strays whose bounding box would swallow it.
 * @param s - the isolated snapshot
 * @returns the start
 */
function strayStart(s: GraphSnapshot): F32 {
    const start = startPositions(s, GRID_BASE_OPTIONS, false);
    const strays: number[] = [];
    for (let i = 0; i < s.nodeCount; i++) {
        if (s.rowPtr[i + 1] === s.rowPtr[i]) {
            strays.push(i);
        }
    }
    strays.forEach((i, k) => {
        const theta = (2 * Math.PI * k) / strays.length;
        start[3 * i] = STRAY_RADIUS * Math.cos(theta);
        start[3 * i + 1] = STRAY_RADIUS * Math.sin(theta);
        start[3 * i + 2] = 0;
    });
    return start;
}

/**
 * The stage check of grid-inspect.test.ts on one fixture: the worst of the named stages.
 * @param ctx - the context
 * @param name - the fixture
 * @param m - the row's measure
 * @returns the merged report
 */
async function fixtureCheck(ctx: GpuContext, name: string, m: Measure): Promise<CheckReport> {
    const tuning: GpuLayoutTuning = m.nearMax === undefined ? GRID_TUNING : { ...GRID_TUNING, nearMax: m.nearMax };
    let s: GraphSnapshot;
    let start: F32;
    let mask: ReturnType<typeof makeMask> | null = null;
    if (m.coincidentFixed === true) {
        s = paritySnapshot("karate", 1, false);
        ({ start, mask } = coincidentFixedStart(s));
    } else {
        ({ snapshot: s, start } = gridFixture(name, gpuScale(), GRID_BASE_OPTIONS));
        if (m.strays === true) {
            start = strayStart(s);
        }
    }
    try {
        const capture = await captureGridStages(ctx, s, start, GRID_BASE_OPTIONS, mask, tuning);
        return mergeReports(
            m.stages.map((key) => {
                const r = gridStageReport(capture, key);
                return { ...r, worstLabel: `${name}/${r.worstLabel}` };
            }),
        );
    } finally {
        ctx.release(s);
    }
}

/**
 * The check a row is measured by: its stage report over every fixture it names, merged.
 * @param ctx - the context
 * @param row - the row
 * @returns the merged report
 */
async function checkOf(ctx: GpuContext, row: Mutation): Promise<CheckReport> {
    const m = measureOf(row);
    const reports: CheckReport[] = [];
    for (const name of m.fixtures) {
        reports.push(await fixtureCheck(ctx, name, m));
    }
    return mergeReports(reports);
}

/**
 * The model a LAW row's law belongs to: the `fr-*` rows are LAW 1 (Fruchterman-Reingold), the `coulomb-*` rows LAW 2
 * (spring-electrical).
 * @param row - the row
 * @returns the model
 */
function lawModelOf(row: Mutation): LawModel {
    return row.name.startsWith("fr-") ? "fr" : "se";
}

/**
 * The check a LAW row is measured by: lawCheck on the row's model (the exact-vs-grid comparison of its own
 * simulation); an unknown test is an error, never a pass.
 * @param id - the kernel
 * @param row - the row
 * @returns the check
 */
function lawCheckFor(id: KernelId, row: Mutation): (ctx: GpuContext) => Promise<CheckReport> {
    if (row.test !== GRID_LAW_TEST) {
        return (): Promise<CheckReport> =>
            Promise.reject(new Error(`${id}/${row.name}: no LAW check for test ${row.test}`));
    }
    const model = lawModelOf(row);
    return (ctx: GpuContext): Promise<CheckReport> => lawCheck(ctx, model);
}

describe("sabotage coverage of the P4 LAW table (PD-21, PD-22)", () => {
    it("every find string occurs exactly once in the entry's normative body, the replacement differs, minFactor >= 10, names unique, tests exist", () => {
        for (const id of Object.keys(SABOTAGE_P4_LAW) as KernelId[]) {
            const { body } = KERNELS[id];
            const names = new Set<string>();
            for (const m of SABOTAGE_P4_LAW[id] ?? []) {
                expect(names.has(m.name), `${id}: duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${id}/${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${id}/${m.name}: find string not unique`).toBe(-1);
                expect(m.replace, `${id}/${m.name}: replace equals find`).not.toBe(m.find);
                expect(m.minFactor, `${id}/${m.name}: minFactor`).toBeGreaterThanOrEqual(10);
                expect(sabotagedBody(id, m)).not.toBe(body);
                expect(m.test).toMatch(/^test\/.+\.test\.ts$/);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${id}/${m.name}: ${m.test} does not exist`).toBe(
                    true,
                );
            }
        }
    });

    it("the LAW table holds six far-field and six near-field rows (P4-T13), three FR and three coulomb each, every one measured by the grid-law test", () => {
        expect(Object.keys(SABOTAGE_P4_LAW).sort()).toEqual(["grid-far-field", "grid-near-field"]);
        for (const id of ["grid-far-field", "grid-near-field"] as const) {
            const rows = SABOTAGE_P4_LAW[id] ?? [];
            expect(rows, id).toHaveLength(6);
            expect(
                rows.filter((r) => lawModelOf(r) === "fr"),
                `${id}: fr rows`,
            ).toHaveLength(3);
            expect(
                rows.filter((r) => lawModelOf(r) === "se"),
                `${id}: coulomb rows`,
            ).toHaveLength(3);
            for (const row of rows) {
                expect(row.test, `${id}/${row.name}`).toBe(GRID_LAW_TEST);
            }
        }
    });

    it("the G6 / G7 rows are the seven of P4-T12 plus the G4-F2 fix's window-contiguous row, and the K1 grid block has three, every one measured here", () => {
        expect(GRID_ROWS.map((g) => g.rows.length)).toEqual([4, 4, 3]);
        for (const { id, rows } of GRID_ROWS) {
            for (const row of rows) {
                expect(row.test, `${id}/${row.name}`).toBe("test/layouts/grid-inspect.test.ts");
                expect(MEASURE[row.name], `${id}/${row.name}: a MEASURE entry`).toBeDefined();
            }
        }
    });
});

describe("sabotage: the grid far field, near field and K1 grid block against the grid-inspect checks (spec 11.9 item 1)", () => {
    it(
        "the pristine kernels pass every row's check (the baseline the mutants are measured against)",
        async (t) => {
            requireGpu(t);
            const ctx = await acquire({ label: "sabotage/grid/baseline" });
            try {
                for (const { id, rows } of GRID_ROWS) {
                    for (const row of rows) {
                        const report = await checkOf(ctx, row);
                        console.warn(
                            `[sabotage] grid baseline ${id}/${row.name}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                        );
                        assertCheckPasses(report);
                    }
                }
                for (const model of ["fr", "se"] as const) {
                    const report = await lawCheck(ctx, model);
                    console.warn(
                        `[sabotage] grid LAW baseline ${model}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    assertCheckPasses(report);
                }
            } finally {
                ctx.dispose();
            }
        },
        CASE_TIMEOUT,
    );

    for (const { id, rows } of GRID_ROWS) {
        for (const row of rows) {
            it(
                `${id}/${row.name}: fails its check by >= ${row.minFactor}x the tolerance`,
                async (t) => {
                    requireGpu(t);
                    const report = await withSabotage(id, row, (ctx) => checkOf(ctx, row));
                    console.warn(
                        `[sabotage] ${id}/${row.name}: ratio ${report.worst.toExponential(3)} at ${report.worstLabel}`,
                    );
                    expect(report.worst, `${id}/${row.name}: detection factor`).toBeGreaterThanOrEqual(row.minFactor);
                },
                CASE_TIMEOUT,
            );
        }
    }

    for (const id of Object.keys(SABOTAGE_P4_LAW) as KernelId[]) {
        for (const row of SABOTAGE_P4_LAW[id] ?? []) {
            it(
                `${id}/${row.name} (LAW): fails its check by >= ${row.minFactor}x the tolerance`,
                async (t) => {
                    requireGpu(t);
                    const report = await withSabotage(id, row, lawCheckFor(id, row));
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
