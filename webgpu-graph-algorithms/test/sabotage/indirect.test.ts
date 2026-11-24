/**
 * Spec 11.9 item 1 for the indirect finalize kernel (P4-T1): every SABOTAGE row of `indirect-finalize` is spliced
 * into the normative body and compiled on a FRESH context, and the SAME bitwise check that passes on the real kernel
 * (indirectFinalizeReport: ratioOf(|a - b|, 0) per args word against planIndirect's host twin) fails on the mutant
 * by at least minFactor -- any mismatch is Infinity. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P4 is not in SABOTAGE_PHASES until T12, PD-1).
 */

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { indirectFinalizeReport } from "../helpers/indirect.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "indirect-finalize";
const ROWS = SABOTAGE[ID] ?? [];

describe("sabotage: indirect-finalize (spec 11.9 item 1; P4-T1)", () => {
    it("has three rows naming the indirect test", () => {
        expect(ROWS.map((m) => m.name)).toEqual(["ceil-dropped", "split-never-taken", "slot-stride-twelve"]);
        for (const m of ROWS) {
            expect(m.test).toBe("test/kernel/indirect.test.ts");
        }
    });

    it("the real kernel passes the bitwise check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-indirect" });
        const report = await indirectFinalizeReport(ctx);
        expect(report.worst).toBe(0);
        assertCheckPasses(report);
    });

    for (const mutation of ROWS) {
        it(`${ID}/${mutation.name}: fails the bitwise check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => indirectFinalizeReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        });
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
