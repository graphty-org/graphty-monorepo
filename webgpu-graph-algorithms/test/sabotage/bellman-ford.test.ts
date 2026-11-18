/**
 * Spec 11.9 item 1 for the `bf-relax` kernel (P8-T10): every SABOTAGE row of the kernel is spliced into the normative
 * body and compiled on a FRESH context, and the SAME check that passes on the real kernel -- bellmanFordReport: the
 * `dist` bit patterns against the f32 Bellman-Ford oracle, `predArc` against the host's PD-27 tight-subgraph rule,
 * `reachedCount` and the flag on the uniform-weight grid from both corners and on the negative DAG, the flag on the
 * planted negative cycle, and the flag and `dist` of the descending fan, all bitwise (any
 * mismatch is Infinity; a driver refusal is the maximal miss) -- fails on the mutant by at least minFactor. No row is
 * caught by a timing: the ignored exchange result is caught by the descending fan's false negative cycle, the inverted
 * improvement test and the dropped reverse direction by `dist`. The first block is the coverage loop of
 * test/sabotage/coverage.test.ts applied to these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { bellmanFordReport } from "../helpers/bellman-ford.js";
import { assertCheckPasses, type Mutation, SABOTAGE, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const BF_TEST = "test/algorithms/bellman-ford.test.ts";
const ID: KernelId = "bf-relax";
const ROWS: readonly Mutation[] = SABOTAGE[ID] ?? [];

describe("sabotage: bf-relax (spec 11.9 item 1; P8-T10)", () => {
    it("has three rows naming the Bellman-Ford test", () => {
        expect(ROWS.map((m) => m.name)).toEqual([
            "exchange-result-ignored",
            "improvement-test-inverted",
            "reverse-direction-dropped",
        ]);
        for (const m of ROWS) {
            expect(m.test).toBe(BF_TEST);
        }
    });

    it("the real kernel passes the check (factor 0)", async (t) => {
        requireGpu(t);
        const ctx = await acquire({ label: "sabotage-bellman-ford" });
        try {
            const report = await bellmanFordReport(ctx);
            expect(report.worst).toBe(0);
            assertCheckPasses(report);
        } finally {
            ctx.dispose();
        }
    });

    for (const mutation of ROWS) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => bellmanFordReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        });
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
