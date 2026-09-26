/**
 * Spec 11.9 item 1 for the `frontier-finalize` kernel (P8-T4): every SABOTAGE row is spliced into the normative body
 * and compiled on a FRESH context, and the SAME check that passes on the real kernel -- frontierReport: the seed
 * rotation, the fused path, the retry after an overflow, the already-done boundary and role 1 after a done
 * boundary, all bitwise over the counters block (any mismatch is Infinity) -- fails on the
 * mutant by at least minFactor. The first block is the coverage loop of test/sabotage/coverage.test.ts applied to
 * these rows (P8 is not in SABOTAGE_PHASES until P8-T15).
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { KERNELS, kernelSpec } from "../../src/kernels.js";
import { frontierReport } from "../helpers/frontier.js";
import { assertCheckPasses, SABOTAGE, sabotagedBody, withSabotage } from "../helpers/sabotage.js";
import { acquire, requireGpu } from "../setup/gpu.js";

const ID = "frontier-finalize";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FRONTIER_TEST = "test/primitives/frontier.test.ts";
const ROWS = SABOTAGE[ID] ?? [];
/** The rows frontierReport measures; P8-T7's inverted-threshold row and P8-T8's inverted-growing-test row name the BFS test and are measured by test/sabotage/bfs.test.ts alone (only a traversal's choice counters and direction words see them). */
const MEASURED = ROWS.filter((m) => m.test === FRONTIER_TEST);

describe("sabotage: frontier-finalize (spec 11.9 item 1; P8-T4)", () => {
    it("has three rows naming the frontier test and two (P8-T7's threshold, P8-T8's growing test) naming the BFS test; every find occurs once in the normative body, the replacement differs, minFactor >= 10, names unique", () => {
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
        const { body } = KERNELS[ID];
        const names = new Set<string>();
        for (const m of ROWS) {
            expect(names.has(m.name), `duplicate mutation name ${m.name}`).toBe(false);
            names.add(m.name);
            const first = body.indexOf(m.find);
            expect(first, `${m.name}: find string absent from the body`).toBeGreaterThanOrEqual(0);
            expect(body.indexOf(m.find, first + m.find.length), `${m.name}: find string not unique`).toBe(-1);
            expect(m.replace).not.toBe(m.find);
            expect(m.minFactor).toBeGreaterThanOrEqual(10);
            expect(m.test).toBe(
                m.name === "fused-threshold-inverted" || m.name === "growing-test-inverted"
                    ? "test/algorithms/bfs.test.ts"
                    : FRONTIER_TEST,
            );
            expect(existsSync(resolve(PACKAGE_ROOT, m.test)), `${m.test} does not exist`).toBe(true);
            const mutated = sabotagedBody(ID, m);
            expect(mutated).not.toBe(body);
            expect(mutated.includes(m.replace)).toBe(true);
            expect(mutated.length).toBe(body.length - m.find.length + m.replace.length);
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
    }, 120_000);

    for (const mutation of MEASURED) {
        it(`${ID}/${mutation.name}: fails the check by >= ${mutation.minFactor}x`, async (t) => {
            requireGpu(t);
            const report = await withSabotage(ID, mutation, (ctx) => frontierReport(ctx));
            console.warn(`[sabotage] ${ID}/${mutation.name}: factor ${report.worst} at ${report.worstLabel}`);
            expect(report.worst).toBeGreaterThanOrEqual(mutation.minFactor);
            expect(() => assertCheckPasses(report)).toThrow();
        }, 120_000);
    }

    it("the normative body is restored after every mutation", () => {
        expect(kernelSpec(ID).body).toBe(KERNELS[ID].body);
    });
});
