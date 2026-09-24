/**
 * Spec 11.9 item 1 for the `grid-centroid`, `grid-centroid-hub` and `grid-downsample` kernels (P4-T9): every SABOTAGE
 * row of the three ids is spliced into its normative body and compiled on a FRESH context, and the SAME analytic
 * check that passes on the real kernel (pyramidReport: every level against gridOraclePyramid within the oracle's
 * bound, in 2D and 3D) fails on the mutant by at least minFactor. The `grid-centroid` rows are measured on
 * random20k + outside5 (the pseudo-cell) + hubcell (whose hub cell goes stale when G4 fails to append it), the `grid-centroid-hub` rows on hubcell-shifted (a hub cell whose sorted
 * range starts above 0) + hubcell-two (two hub cells: the pristine check fails when G4a plans fewer G4b workgroups
 * than hub cells) and the `grid-downsample` rows on random20k's levels >= 1. The first block is the coverage
 * loop of test/sabotage/coverage.test.ts applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { pyramidReport } from "../helpers/grid-pyramid.js";
import { assertCheckPasses, type CheckReport, mergeReports, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PYRAMID_TEST = "test/primitives/grid-pyramid.test.ts";
const CASE_TIMEOUT = 300_000;

/** The fixtures and the first compared level of each id's check. */
const CHECKS: readonly { readonly id: KernelId; readonly names: readonly string[]; readonly minLevel: number; readonly rows: readonly string[] }[] = [
    { id: "grid-centroid", names: ["random20k", "outside5", "hubcell"], minLevel: 0, rows: ["mass-lane-x", "pseudo-cell-skipped", "hub-not-appended"] },
    { id: "grid-centroid-hub", names: ["hubcell-shifted", "hubcell-two"], minLevel: 0, rows: ["hub-stride-off-by-one", "hub-lane-partial-written", "hub-range-start-ignored"] },
    { id: "grid-downsample", names: ["random20k"], minLevel: 1, rows: ["wrong-level-offset", "three-children", "parent-index-shifted"] },
];

/**
 * The merged report of one id's check.
 * @param check - the id's fixtures and level
 * @param ctx - the context
 * @returns the report
 */
async function report(check: (typeof CHECKS)[number], ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const name of check.names) {
        reports.push(await pyramidReport(ctx, name, gpuScale(), check.minLevel));
    }
    return mergeReports(reports);
}

for (const check of CHECKS) {
    const { id } = check;
    describe(`sabotage: ${id} (spec 11.9 item 1; P4-T9)`, () => {
        it("has three rows naming the pyramid test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
            expect((SABOTAGE[id] ?? []).map((m) => m.name)).toEqual(check.rows);
            const { body } = KERNELS[id];
            const names = new Set<string>();
            for (const m of SABOTAGE[id] ?? []) {
                expect(names.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
                names.add(m.name);
                const first = body.indexOf(m.find);
                expect(first, `${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
                expect(body.indexOf(m.find, first + m.find.length), `${m.name}: find string not unique`).toBe(-1);
                expect(m.replace).not.toBe(m.find);
                expect(m.minFactor).toBeGreaterThanOrEqual(10);
                expect(m.test).toBe(PYRAMID_TEST);
                expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
                const mutated = sabotagedBody(id, m);
                expect(mutated).not.toBe(body);
                expect(mutated.includes(m.replace)).toBe(true);
                expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
            }
        });

        it(
            "the real kernel passes the analytic check",
            async (t) => {
                requireGpu(t);
                const ctx = await acquire({ label: `sabotage-${id}` });
                try {
                    assertCheckPasses(await report(check, ctx));
                } finally {
                    ctx.dispose();
                }
            },
            CASE_TIMEOUT,
        );

        for (const mutation of SABOTAGE[id] ?? []) {
            it(
                `${id}/${mutation.name}: fails the analytic check by >= ${mutation.minFactor}x`,
                async (t) => {
                    requireGpu(t);
                    const r = await withSabotage(id, mutation, (ctx) => report(check, ctx));
                    console.warn(`[sabotage] ${id}/${mutation.name}: factor ${r.worst} at ${r.worstLabel}`);
                    expect(r.worst).toBeGreaterThanOrEqual(mutation.minFactor);
                    expect(() => assertCheckPasses(r)).toThrow();
                },
                CASE_TIMEOUT,
            );
        }

        it("the normative body is restored after every mutation", () => {
            expect(kernelSpec(id).body).toBe(KERNELS[id].body);
        });
    });
}
