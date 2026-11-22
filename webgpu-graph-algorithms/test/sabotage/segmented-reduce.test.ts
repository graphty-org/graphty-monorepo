/**
 * Spec 11.9 item 1 for the segmented-reduce kernel (contract 5.5 P2): every SABOTAGE["segmented-reduce"] mutation
 * is spliced into the normative body, and the SAME check set that passes on the real kernel (worstFactor over
 * sabotageChecks, the primitive test's set) fails on the mutant by at least minFactor (10x the tolerance).
 */

import { SABOTAGE, SABOTAGE_PHASES, withSabotage } from "../helpers/sabotage.js";
import { sabotageChecks, worstFactor } from "../helpers/segmented-reduce.js";
import { requireGpu, sharedContext } from "../setup/gpu.js";

const ROWS = SABOTAGE["segmented-reduce"] ?? [];

describe("sabotage: segmented-reduce", () => {
    const context = sharedContext({ label: "sabotage-segmented-reduce" });

    it("has at least three rows, each naming this task's primitive test, and P2 is a gated phase", () => {
        expect(ROWS.length).toBeGreaterThanOrEqual(3);
        for (const mutation of ROWS) {
            expect(mutation.test).toContain("segmented-reduce.test.ts");
        }
        expect(SABOTAGE_PHASES).toContain("P2");
    });

    it("the real kernel passes the check set (factor < 1)", async (t) => {
        const ctx = await context(t);
        expect(await worstFactor(ctx, sabotageChecks())).toBeLessThan(1);
    });

    for (const mutation of ROWS) {
        it(`${mutation.name}: fails the segmented-reduce check set by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const factor = await withSabotage("segmented-reduce", mutation, (ctx) =>
                worstFactor(ctx, sabotageChecks()),
            );
            console.warn(`[sabotage] segmented-reduce/${mutation.name}: factor ${factor.toExponential(2)}`);
            expect(factor).toBeGreaterThanOrEqual(mutation.minFactor);
        });
    }
});
