/**
 * Spec 11.9 item 1 for the `grid-cell-key` kernel (P4-T8): every SABOTAGE row of G1 is spliced into the normative
 * body and compiled on a FRESH context, and the SAME bitwise check that passes on the real kernel (gridReport over
 * random20k, outside5 and nonfinite in 2D and 3D: the keys, the stable order, the histogram and its scan against the oracle)
 * fails on the mutant by at least minFactor -- any mismatch is Infinity. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { gridReport } from "../helpers/grid.js";
import { assertCheckPasses, type CheckReport, mergeReports, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

const ID: KernelId = "grid-cell-key";
const FIXTURES: readonly string[] = ["random20k", "outside5", "nonfinite"];

/**
 * The merged bitwise report over both fixtures in both dimensions.
 * @param ctx - the context
 * @returns the report
 */
async function report(ctx: GpuContext): Promise<CheckReport> {
    const reports: CheckReport[] = [];
    for (const name of FIXTURES) {
        reports.push(await gridReport(ctx, name, gpuScale()));
    }
    return mergeReports(reports);
}

describe("sabotage: grid-cell-key (spec 11.9 item 1; P4-T8)", () => {
    it("has four rows naming the grid test", () => {
        expect((SABOTAGE[ID] ?? []).map((m) => m.name)).toEqual([
            "pseudo-cell-dropped",
            "axes-swapped",
            "floor-replaced-by-round",
            "nan-in-cell-zero",
        ]);
        for (const m of SABOTAGE[ID] ?? []) {
            expect(m.test).toBe("test/primitives/grid.test.ts");
        }
    });

    it("the real kernel passes the bitwise check over random20k, outside5 and nonfinite (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-grid" });
        try {
            const r = await report(ctx);
            expect(r.worst).toBe(0);
            assertCheckPasses(r);
        } finally {
            ctx.dispose();
        }
    });

    for (const mutation of SABOTAGE[ID] ?? []) {
        it(`${ID}/${mutation.name}: fails the bitwise check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const r = await withSabotage(ID, mutation, report);
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${r.worst} at ${r.worstLabel}`);
            expect(r.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(r)).toThrow();
        });
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
