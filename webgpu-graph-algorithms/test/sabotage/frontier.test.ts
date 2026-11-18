/**
 * Spec 11.9 item 1 for the `frontier-finalize` kernel (P8-T4): every SABOTAGE row is spliced into the normative body
 * and compiled on a FRESH context, and the SAME check that passes on the real kernel -- frontierReport: the seed
 * rotation, the fused path, the retry after an overflow, the already-done boundary and role 1 after a done
 * boundary, all bitwise over the counters block (any mismatch is Infinity) -- fails on the
 * mutant by at least minFactor. The first block is the coverage loop of test/sabotage/coverage.test.ts applied to
 * these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { frontierReport } from "../helpers/frontier.js";
import { assertCheckPasses, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "frontier-finalize";
const FRONTIER_TEST = "test/primitives/frontier.test.ts";
const ROWS = SABOTAGE[ID] ?? [];
/** The rows frontierReport measures; P8-T7's inverted-threshold row and P8-T8's inverted-growing-test row name the BFS test and are measured by test/sabotage/bfs.test.ts alone (only a traversal's choice counters and direction words see them). */
const MEASURED = ROWS.filter((m) => m.test === FRONTIER_TEST);

describe("sabotage: frontier-finalize (spec 11.9 item 1; P8-T4)", () => {
    it("has three rows naming the frontier test and two (P8-T7's threshold, P8-T8's growing test) naming the BFS test", () => {
        // the `ceil-wraps` and `second-row-floored` rows mutated the indirect-slot arithmetic; they went with the
        // slots (2026-09-25), because no dispatch consumed what they broke
        expect(ROWS.map((m) => m.name)).toEqual([
            "rotation-dropped",
            "done-boundary-keeps-counting",
            "role-1-counts-every-level",
            "fused-threshold-inverted",
            "growing-test-inverted",
        ]);
        expect(MEASURED).toHaveLength(3);
        for (const m of ROWS) {
            expect(m.test).toBe(
                m.name === "fused-threshold-inverted" || m.name === "growing-test-inverted"
                    ? "test/algorithms/bfs.test.ts"
                    : FRONTIER_TEST,
            );
        }
    });

    it("the real kernel passes the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-frontier" });
        try {
            const report = await frontierReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const mutation of MEASURED) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => frontierReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        });
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
