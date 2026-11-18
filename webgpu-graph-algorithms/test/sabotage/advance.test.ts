/**
 * Spec 11.9 item 1 for the `advance-expand` kernel (P8-T5): every SABOTAGE row is spliced into the normative body
 * and compiled on a FRESH context, and the SAME check that passes on the real kernel -- advanceReport: the sorted
 * edge queue and the three counters against the nested-loop oracle over the reversed karate vertex set, the grid's
 * levels and the star hub, plus the overflow case with the faked capacity and the star hub over arc windows under a
 * faked binding limit (P8-T12), all bitwise (any mismatch is Infinity) -- fails on the mutant by at least minFactor. The first block is the coverage loop of test/sabotage/coverage.test.ts
 * applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { advanceReport } from "../helpers/advance.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "advance-expand";
const ROWS = SABOTAGE[ID] ?? [];

describe("sabotage: advance-expand (spec 11.9 item 1; P8-T5)", () => {
    it("has six rows naming the advance test", () => {
        expect(ROWS.map((m) => m.name)).toEqual([
            "scan-result-dropped",
            "lower-bound-not-upper",
            "per-lane-reservation",
            "last-entry-skipped",
            "unclamped-not-counted",
            "clip-ignored",
        ]);
        for (const m of ROWS) {
            expect(m.test).toBe("test/primitives/advance.test.ts");
        }
    });

    it("the real kernel passes the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-advance" });
        try {
            const report = await advanceReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const mutation of ROWS) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => advanceReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        });
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
